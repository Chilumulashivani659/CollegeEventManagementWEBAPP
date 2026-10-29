import pool from '../config/db.js';

const PUBLIC_COLUMNS = `c.id, c.full_name, c.email, c.designation, c.department,
  c.employee_id, c.student_council_id, c.status, c.created_at`;

const serviceError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

export const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, c.password_hash, a.is_active AS authorization_active
     FROM coordinators c
     INNER JOIN authorized_coordinators a
       ON a.id = c.authorized_coordinator_id
     WHERE c.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
};

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM coordinators c
     WHERE c.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, a.is_active AS authorization_active
     FROM coordinators c
     INNER JOIN authorized_coordinators a
       ON a.id = c.authorized_coordinator_id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
};

/**
 * Create an active coordinator account from a pre-authorized record.
 *
 * The authorization row is locked and re-checked inside the transaction so
 * two simultaneous registrations cannot both claim the same authorization.
 */
export const createFromAuthorization = async ({ authorizationId, password_hash }) => {
  const connection = await pool.getConnection();
  let newId = null;

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, full_name, email, designation, department,
              employee_id, student_council_id, is_active, registered_at
       FROM authorized_coordinators
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [authorizationId]
    );

    const authorization = rows[0];

    if (!authorization) {
      throw serviceError(
        'AUTHORIZATION_NOT_FOUND',
        'This coordinator authorization no longer exists.'
      );
    }

    if (!authorization.is_active) {
      throw serviceError(
        'AUTHORIZATION_INACTIVE',
        'This coordinator authorization is inactive.'
      );
    }

    if (authorization.registered_at) {
      throw serviceError(
        'ALREADY_REGISTERED',
        'A coordinator account is already registered for this college email.'
      );
    }

    const [existing] = await connection.query(
      'SELECT id FROM coordinators WHERE email = ? LIMIT 1',
      [authorization.email]
    );

    if (existing.length > 0) {
      throw serviceError(
        'ALREADY_REGISTERED',
        'A coordinator account is already registered for this college email.'
      );
    }

    const [result] = await connection.query(
      `INSERT INTO coordinators
         (authorized_coordinator_id, full_name, email, designation, department,
          employee_id, student_council_id, password_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        authorization.id,
        authorization.full_name,
        authorization.email,
        authorization.designation,
        authorization.department,
        authorization.employee_id,
        authorization.student_council_id,
        password_hash
      ]
    );

    const [marked] = await connection.query(
      `UPDATE authorized_coordinators
       SET registered_at = CURRENT_TIMESTAMP
       WHERE id = ? AND registered_at IS NULL`,
      [authorization.id]
    );

    if (marked.affectedRows !== 1) {
      throw serviceError(
        'ALREADY_REGISTERED',
        'A coordinator account is already registered for this college email.'
      );
    }

    await connection.commit();
    newId = result.insertId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return findById(newId);
};
