import pool from '../config/db.js';

const PUBLIC_COLUMNS = `id, full_name, email, designation, department,
  employee_id, student_council_id, is_active, registered_at, created_at, updated_at`;

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM authorized_coordinators
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM authorized_coordinators
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
};

export const createAuthorizedCoordinator = async (record) => {
  const {
    full_name,
    email,
    designation,
    department,
    employee_id,
    student_council_id
  } = record;

  const [result] = await pool.query(
    `INSERT INTO authorized_coordinators
       (full_name, email, designation, department, employee_id, student_council_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      full_name.trim(),
      email.trim().toLowerCase(),
      designation,
      department.trim(),
      employee_id ? employee_id.trim() : null,
      student_council_id ? student_council_id.trim() : null
    ]
  );

  return findById(result.insertId);
};

export const listAuthorizedCoordinators = async () => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM authorized_coordinators
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

/**
 * Enable or disable an authorization. Disabling also disables the matching
 * coordinator account (if one has been registered) so an existing JWT stops
 * working on the next protected request.
 */
export const setActiveByEmail = async (email, isActive) => {
  const connection = await pool.getConnection();
  let changed = false;

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT ${PUBLIC_COLUMNS}
       FROM authorized_coordinators
       WHERE email = ?
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    const record = rows[0];
    if (!record) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      `UPDATE authorized_coordinators
       SET is_active = ?
       WHERE id = ?`,
      [isActive ? 1 : 0, record.id]
    );

    await connection.query(
      `UPDATE coordinators
       SET status = ?
       WHERE authorized_coordinator_id = ?`,
      [isActive ? 'active' : 'disabled', record.id]
    );

    await connection.commit();
    changed = true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return changed ? findByEmail(email) : null;
};

export const revokeByEmail = (email) => setActiveByEmail(email, false);

export const reactivateByEmail = (email) => setActiveByEmail(email, true);

/**
 * Remove an authorization only when nobody has registered with it yet.
 * Registered authorizations must be revoked instead, so the coordinator
 * account can never be left without its authorization record.
 */
export const removeByEmail = async (email) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT ${PUBLIC_COLUMNS}
       FROM authorized_coordinators
       WHERE email = ?
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    const record = rows[0];
    if (!record) {
      await connection.rollback();
      return { removed: false, reason: 'not_found' };
    }

    if (record.registered_at) {
      await connection.rollback();
      return { removed: false, reason: 'registered', record };
    }

    const [accounts] = await connection.query(
      'SELECT id FROM coordinators WHERE authorized_coordinator_id = ? LIMIT 1',
      [record.id]
    );

    if (accounts.length > 0) {
      await connection.rollback();
      return { removed: false, reason: 'registered', record };
    }

    await connection.query('DELETE FROM authorized_coordinators WHERE id = ?', [record.id]);
    await connection.commit();
    return { removed: true, record };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
