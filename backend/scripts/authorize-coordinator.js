import { parseArgs } from 'node:util';
import dotenv from 'dotenv';
import pool from '../config/db.js';
import {
  createAuthorizedCoordinator,
  findByEmail,
  listAuthorizedCoordinators,
  reactivateByEmail,
  removeByEmail,
  revokeByEmail
} from '../services/authorizedCoordinatorService.js';

dotenv.config();

const DESIGNATIONS = ['Faculty', 'Student Council Member'];
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{1,59}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const usage = () => {
  console.log(`
Authorized coordinator administration (local CLI only)

Usage:
  npm.cmd run authorize -- add --name "Full Name" --email "person@college.edu" --designation "Faculty" --department "Computer Science" --employee-id "EMP-CS-101"

  npm.cmd run authorize -- add --name "Full Name" --email "person@college.edu" --designation "Student Council Member" --department "Student Affairs" --council-id "SC-2026-07"

  npm.cmd run authorize -- list
  npm.cmd run authorize -- revoke --email "person@college.edu"
  npm.cmd run authorize -- reactivate --email "person@college.edu"
  npm.cmd run authorize -- remove --email "person@college.edu"

Notes:
  - Only this local command (run with backend/.env) can add or change the
    authorized list. There is no public HTTP endpoint for it.
  - "remove" is allowed only before the person has registered.
  - "revoke" keeps the record for audit purposes and disables both the
    authorization and any coordinator account created from it.
`);
};

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
};

const requireValue = (value, label) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  return text;
};

const validateIdentity = (values) => {
  const full_name = requireValue(values.name, '--name');
  const email = requireValue(values.email, '--email').toLowerCase();
  const designation = requireValue(values.designation, '--designation');
  const department = requireValue(values.department, '--department');
  const employee_id = values['employee-id'] ? values['employee-id'].trim() : '';
  const student_council_id = values['council-id'] ? values['council-id'].trim() : '';

  if (full_name.length < 2 || full_name.length > 120) {
    throw new Error('Full name must be between 2 and 120 characters.');
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 160) {
    throw new Error('Enter a valid college email address (160 characters or fewer).');
  }
  if (!DESIGNATIONS.includes(designation)) {
    throw new Error('--designation must be "Faculty" or "Student Council Member".');
  }
  if (department.length < 2 || department.length > 120) {
    throw new Error('Department must be between 2 and 120 characters.');
  }

  if (designation === 'Faculty') {
    if (!employee_id) throw new Error('--employee-id is required for Faculty.');
    if (student_council_id) throw new Error('Do not provide --council-id for Faculty.');
    if (!ID_PATTERN.test(employee_id)) throw new Error('Invalid --employee-id format.');
  } else {
    if (!student_council_id) {
      throw new Error('--council-id is required for Student Council Member.');
    }
    if (employee_id) throw new Error('Do not provide --employee-id for Student Council Member.');
    if (!ID_PATTERN.test(student_council_id)) throw new Error('Invalid --council-id format.');
  }

  return {
    full_name,
    email,
    designation,
    department,
    employee_id: designation === 'Faculty' ? employee_id : null,
    student_council_id: designation === 'Student Council Member' ? student_council_id : null
  };
};

const printRecords = (records) => {
  if (records.length === 0) {
    console.log('No authorized coordinator records found.');
    return;
  }

  console.log(
    'ID | Full Name | College Email | Designation | Department | Identifier | Status | Registered'
  );
  console.log('-'.repeat(120));
  for (const record of records) {
    const identifier = record.employee_id || record.student_council_id || '';
    const status = record.is_active ? 'active' : 'inactive';
    const registered = record.registered_at ? 'yes' : 'no';
    console.log(
      `${record.id} | ${record.full_name} | ${record.email} | ${record.designation} | ${record.department} | ${identifier} | ${status} | ${registered}`
    );
  }
};

const main = async () => {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        name: { type: 'string' },
        email: { type: 'string' },
        designation: { type: 'string' },
        department: { type: 'string' },
        'employee-id': { type: 'string' },
        'council-id': { type: 'string' },
        help: { type: 'boolean' }
      }
    });
  } catch (err) {
    usage();
    fail(err.message);
    return;
  }

  const command = parsed.positionals[0];
  const values = parsed.values;

  if (values.help || !command) {
    usage();
    if (!command) process.exitCode = 1;
    return;
  }

  if (command === 'list') {
    printRecords(await listAuthorizedCoordinators());
    return;
  }

  if (command === 'add') {
    const identity = validateIdentity(values);
    const existing = await findByEmail(identity.email);
    if (existing) {
      fail(`An authorized record already exists for ${identity.email}.`);
      return;
    }

    const created = await createAuthorizedCoordinator(identity);
    console.log(
      `Authorized ${created.full_name} <${created.email}> as ${created.designation}.`
    );
    console.log('They can now register once using exactly these details:');
    console.log(`  Full Name:    ${created.full_name}`);
    console.log(`  Email:        ${created.email}`);
    console.log(`  Designation:  ${created.designation}`);
    console.log(`  Department:   ${created.department}`);
    console.log(
      `  ${created.employee_id ? 'Employee ID' : 'Student Council ID'}: ${
        created.employee_id || created.student_council_id
      }`
    );
    return;
  }

  if (command === 'revoke' || command === 'reactivate') {
    const email = requireValue(values.email, '--email').toLowerCase();
    const isActive = command === 'reactivate';
    const updated = isActive
      ? await reactivateByEmail(email)
      : await revokeByEmail(email);

    if (!updated) {
      fail(`No authorized record found for ${email}.`);
      return;
    }

    console.log(
      `${isActive ? 'Reactivated' : 'Revoked'} authorization for ${updated.full_name} <${updated.email}>.`
    );
    console.log(
      isActive
        ? 'The authorization and any existing coordinator account are active again.'
        : 'The authorization and any existing coordinator account are inactive. Existing tokens are blocked on the next request.'
    );
    return;
  }

  if (command === 'remove') {
    const email = requireValue(values.email, '--email').toLowerCase();
    const result = await removeByEmail(email);

    if (result.removed) {
      console.log(`Removed authorization for ${result.record.full_name} <${result.record.email}>.`);
      return;
    }

    if (result.reason === 'registered') {
      fail(
        `${email} has already registered. Use "revoke" instead so the account stays linked to its authorization.`
      );
      return;
    }

    fail(`No authorized record found for ${email}.`);
    return;
  }

  usage();
  fail(`Unknown command "${command}".`);
};

try {
  await main();
} catch (err) {
  if (err.code === 'ER_DUP_ENTRY') {
    fail('An authorized record already exists for this college email.');
  } else {
    fail(err.message);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
