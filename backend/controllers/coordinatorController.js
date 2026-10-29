import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as coordinatorService from '../services/coordinatorService.js';
import * as authorizedCoordinatorService from '../services/authorizedCoordinatorService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{1,59}$/;
const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_LENGTH = 72; // bcrypt only uses the first 72 bytes
const DESIGNATIONS = ['Faculty', 'Student Council Member'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const normalized = (value) => text(value).replace(/\s+/g, ' ').toLowerCase();

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const SCHEMA_ERROR_CODES = new Set([
  'ER_BAD_FIELD_ERROR',
  'ER_NO_SUCH_TABLE',
  'ER_BAD_TABLE_ERROR'
]);

const serverError = (res, message, err) => {
  console.error(`${message}:`, err);
  return res.status(500).json({ message });
};

const publicCoordinator = (coordinator) => {
  const { authorization_active, password_hash, ...rest } = coordinator;
  return rest;
};

/**
 * Validate a coordinator registration.
 * Returns { error } for the first invalid field, or { value } when valid.
 */
const validateRegistration = (body) => {
  if (!isPlainObject(body)) {
    return { error: 'Please send the registration details as a JSON object.' };
  }

  const full_name = text(body.full_name);
  const email = text(body.email).toLowerCase();
  const designation = text(body.designation);
  const department = text(body.department);
  const employee_id = text(body.employee_id);
  const student_council_id = text(body.student_council_id);
  const password = typeof body.password === 'string' ? body.password : '';
  const confirm_password =
    typeof body.confirm_password === 'string' ? body.confirm_password : '';

  if (full_name.length < 2) return { error: 'Please enter your full name.' };
  if (full_name.length > 120) return { error: 'Full name must be 120 characters or fewer.' };

  if (!EMAIL_PATTERN.test(email)) return { error: 'Please enter a valid college email address.' };
  if (email.length > 160) return { error: 'College email must be 160 characters or fewer.' };

  if (!DESIGNATIONS.includes(designation)) {
    return { error: 'Designation must be either Faculty or Student Council Member.' };
  }

  if (department.length < 2) return { error: 'Please enter your department.' };
  if (department.length > 120) return { error: 'Department must be 120 characters or fewer.' };

  if (designation === 'Faculty') {
    if (!employee_id) return { error: 'Employee ID is required for Faculty members.' };
    if (!ID_PATTERN.test(employee_id)) {
      return { error: 'Employee ID may contain letters, numbers, spaces, dots, slashes, hyphens, and underscores.' };
    }
    if (student_council_id) {
      return { error: 'Student Council ID must not be provided for a Faculty registration.' };
    }
  } else {
    if (!student_council_id) {
      return { error: 'Student Council ID is required for Student Council Members.' };
    }
    if (!ID_PATTERN.test(student_council_id)) {
      return { error: 'Student Council ID may contain letters, numbers, spaces, dots, slashes, hyphens, and underscores.' };
    }
    if (employee_id) {
      return { error: 'Employee ID must not be provided for a Student Council Member registration.' };
    }
  }

  if (password.length < 8) return { error: 'Password must be at least 8 characters long.' };
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }
  if (password !== confirm_password) return { error: 'Password and Confirm Password do not match.' };

  return {
    value: {
      full_name,
      email,
      designation,
      department,
      employee_id: designation === 'Faculty' ? employee_id : null,
      student_council_id: designation === 'Student Council Member' ? student_council_id : null,
      password
    }
  };
};

/**
 * The submitted identity must match the pre-stored authorization record.
 * Name and department are compared case-insensitively with whitespace
 * normalized; IDs are also case-insensitive.
 */
const matchesAuthorization = (submitted, authorization) => {
  if (submitted.designation !== authorization.designation) return false;

  if (normalized(submitted.full_name) !== normalized(authorization.full_name)) return false;
  if (normalized(submitted.department) !== normalized(authorization.department)) return false;

  if (submitted.designation === 'Faculty') {
    return normalized(submitted.employee_id) === normalized(authorization.employee_id);
  }

  return (
    normalized(submitted.student_council_id) ===
    normalized(authorization.student_council_id)
  );
};

// POST /api/coordinators/register
export const registerCoordinator = async (req, res) => {
  try {
    const { error, value } = validateRegistration(req.body);
    if (error) return res.status(400).json({ message: error });

    const authorization = await authorizedCoordinatorService.findByEmail(value.email);

    if (!authorization) {
      return res.status(403).json({
        code: 'NOT_AUTHORIZED',
        message:
          'This college email is not on the authorized coordinator list. Ask the college administrator to add you before registering.'
      });
    }

    if (!authorization.is_active) {
      return res.status(403).json({
        code: 'AUTHORIZATION_INACTIVE',
        message: 'This coordinator authorization is inactive. Contact the college administrator.'
      });
    }

    if (authorization.registered_at) {
      return res.status(409).json({
        code: 'ALREADY_REGISTERED',
        message: 'A coordinator account is already registered for this college email.'
      });
    }

    if (!matchesAuthorization(value, authorization)) {
      return res.status(403).json({
        code: 'DETAILS_MISMATCH',
        message:
          'Your details do not match the authorized coordinator record. Check your full name, designation, department, and employee/Student Council ID.'
      });
    }

    const existingAccount = await coordinatorService.findByEmail(value.email);
    if (existingAccount) {
      return res.status(409).json({
        code: 'ALREADY_REGISTERED',
        message: 'A coordinator account is already registered for this college email.'
      });
    }

    const password_hash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);
    const created = await coordinatorService.createFromAuthorization({
      authorizationId: authorization.id,
      password_hash
    });

    return res.status(201).json({
      message:
        'Registration successful. Your event coordinator account is active, and you can now log in.',
      coordinator: publicCoordinator(created)
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.code === 'ALREADY_REGISTERED') {
      return res.status(409).json({
        code: 'ALREADY_REGISTERED',
        message: 'A coordinator account is already registered for this college email.'
      });
    }

    if (err.code === 'AUTHORIZATION_NOT_FOUND' || err.code === 'AUTHORIZATION_INACTIVE') {
      return res.status(403).json({
        code: 'NOT_AUTHORIZED',
        message: 'This coordinator authorization is not active. Contact the college administrator.'
      });
    }

    if (SCHEMA_ERROR_CODES.has(err.code)) {
      console.error('Coordinator registration schema mismatch:', err.message);
      return res.status(503).json({
        code: 'SCHEMA_OUT_OF_DATE',
        message:
          'Coordinator registration is temporarily unavailable because the database schema is out of date. Apply database.sql, restart the backend, and try again.'
      });
    }

    return serverError(res, 'Failed to register coordinator', err);
  }
};

// POST /api/coordinators/login
export const loginCoordinator = async (req, res) => {
  try {
    const body = isPlainObject(req.body) ? req.body : {};
    const email = text(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your college email and password.' });
    }

    const account = await coordinatorService.findByEmailWithPassword(email);
    const passwordMatches = account
      ? await bcrypt.compare(password, account.password_hash)
      : false;

    if (!account || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (account.status !== 'active' || !account.authorization_active) {
      return res.status(403).json({
        code: 'COORDINATOR_INACTIVE',
        message:
          'This coordinator account is not active. Contact the college administrator for access.'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured.');
      return res.status(500).json({ message: 'Server authentication is not configured.' });
    }

    const token = jwt.sign(
      { sub: account.id, role: 'coordinator' },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h', algorithm: 'HS256' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      coordinator: publicCoordinator(account)
    });
  } catch (err) {
    return serverError(res, 'Failed to log in', err);
  }
};

// GET /api/coordinators/me - requires an active coordinator token
export const getCurrentCoordinator = (req, res) => {
  res.json({ coordinator: req.coordinator });
};
