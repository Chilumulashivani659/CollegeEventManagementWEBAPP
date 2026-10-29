/**
 * Integration test for the pre-authorized coordinator flow.
 *
 * Requirements:
 *   1. MySQL is running and database.sql has been applied.
 *   2. The backend is running (default: http://localhost:5055).
 *
 * Start the backend on the test port from the backend folder:
 *   $env:PORT=5055; npm.cmd start
 *
 * Then run:
 *   npm.cmd run test:flow
 */
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pool from '../config/db.js';
import {
  createAuthorizedCoordinator,
  reactivateByEmail,
  revokeByEmail
} from '../services/authorizedCoordinatorService.js';

dotenv.config();

const API = (process.env.TEST_API_URL || 'http://localhost:5055/api').replace(/\/$/, '');
const stamp = Date.now();

const facultyEmail = `test.faculty.${stamp}@demo.college.test`;
const councilEmail = `test.council.${stamp}@demo.college.test`;
const mismatchEmail = `test.mismatch.${stamp}@demo.college.test`;
const unknownEmail = `test.unknown.${stamp}@demo.college.test`;

const faculty = {
  full_name: `Test Faculty Coordinator ${stamp}`,
  email: facultyEmail,
  designation: 'Faculty',
  department: 'Computer Science',
  employee_id: `TEST-EMP-${stamp}`
};

const council = {
  full_name: `Test Student Council Coordinator ${stamp}`,
  email: councilEmail,
  designation: 'Student Council Member',
  department: 'Student Affairs',
  student_council_id: `TEST-SC-${stamp}`
};

const mismatch = {
  full_name: `Test Mismatch Person ${stamp}`,
  email: mismatchEmail,
  designation: 'Faculty',
  department: 'Mechanical Engineering',
  employee_id: `TEST-EMP-M-${stamp}`
};

const password = 'TestPass123!';
const eventName = `[TEST] Preauthorized Flow ${stamp}`;
let createdEventId = null;
let facultyToken = null;

let passed = 0;
let failed = 0;

const request = async (method, path, { body, token } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

const registrationBody = (person) => ({
  full_name: person.full_name,
  email: person.email,
  designation: person.designation,
  department: person.department,
  ...(person.employee_id ? { employee_id: person.employee_id } : {}),
  ...(person.student_council_id ? { student_council_id: person.student_council_id } : {}),
  password,
  confirm_password: password
});

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${err.message}`);
  }
};

const cleanup = async () => {
  try {
    if (createdEventId) {
      await pool.query('DELETE FROM events WHERE id = ?', [createdEventId]);
    }
    await pool.query('DELETE FROM events WHERE event_name = ?', [eventName]);
    await pool.query('DELETE FROM coordinators WHERE email IN (?, ?, ?)', [
      facultyEmail,
      councilEmail,
      mismatchEmail
    ]);
    await pool.query('DELETE FROM authorized_coordinators WHERE email IN (?, ?, ?)', [
      facultyEmail,
      councilEmail,
      mismatchEmail
    ]);
  } catch (err) {
    console.error(`Cleanup warning: ${err.message}`);
  }
};

const main = async () => {
  try {
    await fetch(`${API}/health`);
  } catch {
    console.error(`Cannot reach ${API}/health.`);
    console.error('Start the backend first: $env:PORT=5055; npm.cmd start');
    process.exitCode = 1;
    return;
  }

  await createAuthorizedCoordinator(faculty);
  await createAuthorizedCoordinator(council);
  await createAuthorizedCoordinator(mismatch);

  console.log(`Testing against ${API}\n`);

  await test('health endpoint is available', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
  });

  await test('students can read events without an account', async () => {
    const res = await request('GET', '/events');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  await test('student cannot create an event without a token', async () => {
    const res = await request('POST', '/events', {
      body: {
        event_name: `${eventName} blocked create`,
        event_date: '2030-06-15',
        venue: 'Test Hall',
        organizer: 'Test Organizer'
      }
    });
    assert.equal(res.status, 401);
  });

  await test('student cannot update an event without a token', async () => {
    const res = await request('PUT', '/events/1', {
      body: {
        event_name: 'Blocked update',
        event_date: '2030-06-15',
        venue: 'Test Hall',
        organizer: 'Test Organizer'
      }
    });
    assert.equal(res.status, 401);
  });

  await test('student cannot delete an event without a token', async () => {
    const res = await request('DELETE', '/events/1');
    assert.equal(res.status, 401);
  });

  await test('an invalid token cannot create an event', async () => {
    const res = await request('POST', '/events', {
      token: 'not-a-real-token',
      body: {
        event_name: `${eventName} invalid token`,
        event_date: '2030-06-15',
        venue: 'Test Hall',
        organizer: 'Test Organizer'
      }
    });
    assert.equal(res.status, 401);
  });

  await test('there is no public endpoint for adding authorized coordinators', async () => {
    const res = await request('POST', '/coordinators/authorize', { body: {} });
    assert.equal(res.status, 404);
  });

  await test('registration is rejected for an email not on the authorized list', async () => {
    const res = await request('POST', '/coordinators/register', {
      body: registrationBody({
        full_name: 'Not Authorized Person',
        email: unknownEmail,
        designation: 'Faculty',
        department: 'Computer Science',
        employee_id: 'FAKE-ID-1'
      })
    });
    assert.equal(res.status, 403);
    assert.equal(res.data.code, 'NOT_AUTHORIZED');
  });

  await test('registration is rejected when submitted details do not match', async () => {
    const body = registrationBody(mismatch);
    body.full_name = 'Different Person Name';
    const res = await request('POST', '/coordinators/register', { body });
    assert.equal(res.status, 403);
    assert.equal(res.data.code, 'DETAILS_MISMATCH');

    const [rows] = await pool.query('SELECT id FROM coordinators WHERE email = ?', [
      mismatchEmail
    ]);
    assert.equal(rows.length, 0);
  });

  await test('authorized Faculty registration creates an active account', async () => {
    const res = await request('POST', '/coordinators/register', {
      body: registrationBody(faculty)
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.coordinator.email, facultyEmail);
    assert.equal(res.data.coordinator.status, 'active');
    assert.equal(res.data.coordinator.designation, 'Faculty');
    assert.equal(res.data.coordinator.password_hash, undefined);

    const [rows] = await pool.query(
      'SELECT password_hash FROM coordinators WHERE email = ?',
      [facultyEmail]
    );
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].password_hash, password);
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);

    const [authRows] = await pool.query(
      'SELECT registered_at FROM authorized_coordinators WHERE email = ?',
      [facultyEmail]
    );
    assert.ok(authRows[0].registered_at);
  });

  await test('duplicate registration is rejected', async () => {
    const res = await request('POST', '/coordinators/register', {
      body: registrationBody(faculty)
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.code, 'ALREADY_REGISTERED');
  });

  await test('authorized Student Council Member registration creates an active account', async () => {
    const res = await request('POST', '/coordinators/register', {
      body: registrationBody(council)
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.coordinator.status, 'active');
    assert.equal(res.data.coordinator.designation, 'Student Council Member');
  });

  await test('login rejects a wrong password', async () => {
    const res = await request('POST', '/coordinators/login', {
      body: { email: facultyEmail, password: 'wrong-password' }
    });
    assert.equal(res.status, 401);
  });

  await test('login rejects an unregistered email', async () => {
    const res = await request('POST', '/coordinators/login', {
      body: { email: unknownEmail, password }
    });
    assert.equal(res.status, 401);
  });

  await test('registered coordinator can log in and read their account', async () => {
    const res = await request('POST', '/coordinators/login', {
      body: { email: facultyEmail, password }
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.token);
    assert.equal(res.data.coordinator.status, 'active');
    assert.equal(res.data.coordinator.password_hash, undefined);
    facultyToken = res.data.token;

    const me = await request('GET', '/coordinators/me', { token: facultyToken });
    assert.equal(me.status, 200);
    assert.equal(me.data.coordinator.email, facultyEmail);
  });

  await test('active coordinator can add, update, and delete an event', async () => {
    const created = await request('POST', '/events', {
      token: facultyToken,
      body: {
        event_name: eventName,
        event_date: '2030-06-15',
        venue: 'Test Hall',
        organizer: 'Integration Test'
      }
    });
    assert.equal(created.status, 201);
    createdEventId = created.data.id;

    const updated = await request('PUT', `/events/${createdEventId}`, {
      token: facultyToken,
      body: {
        event_name: eventName,
        event_date: '2030-06-16',
        venue: 'Updated Test Hall',
        organizer: 'Integration Test'
      }
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.venue, 'Updated Test Hall');

    const removed = await request('DELETE', `/events/${createdEventId}`, {
      token: facultyToken
    });
    assert.equal(removed.status, 200);

    const missing = await request('GET', `/events/${createdEventId}`);
    assert.equal(missing.status, 404);
    createdEventId = null;
  });

  await test('revoking authorization blocks the existing token immediately', async () => {
    const revoked = await revokeByEmail(facultyEmail);
    assert.equal(revoked.is_active, 0);

    const me = await request('GET', '/coordinators/me', { token: facultyToken });
    assert.equal(me.status, 403);

    const create = await request('POST', '/events', {
      token: facultyToken,
      body: {
        event_name: `${eventName} revoked`,
        event_date: '2030-06-15',
        venue: 'Test Hall',
        organizer: 'Integration Test'
      }
    });
    assert.equal(create.status, 403);

    const login = await request('POST', '/coordinators/login', {
      body: { email: facultyEmail, password }
    });
    assert.equal(login.status, 403);
    assert.equal(login.data.code, 'COORDINATOR_INACTIVE');
  });

  await test('reactivating authorization restores coordinator access', async () => {
    const restored = await reactivateByEmail(facultyEmail);
    assert.equal(restored.is_active, 1);

    const login = await request('POST', '/coordinators/login', {
      body: { email: facultyEmail, password }
    });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
  });

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
};

try {
  await main();
} finally {
  await cleanup();
  await pool.end();
}
