import pool from '../config/db.js';

const PUBLIC_COLUMNS = `id, full_name, email, designation, department,
  employee_id, student_council_id, status, created_at, approved_at`;

export const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash
     FROM coordinators
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
};

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM coordinators
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0];
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM coordinators
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
};

export const createCoordinator = async (coordinator) => {
  const {
    full_name,
    email,
    designation,
    department,
    employee_id,
    student_council_id,
    password_hash
  } = coordinator;

  const [result] = await pool.query(
    `INSERT INTO coordinators
       (full_name, email, designation, department, employee_id, student_council_id, password_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      full_name.trim(),
      email,
      designation,
      department.trim(),
      employee_id,
      student_council_id,
      password_hash
    ]
  );

  return findById(result.insertId);
};

export const approveByEmail = async (email) => {
  const existing = await findByEmail(email);
  if (!existing) return null;

  if (existing.status !== 'approved') {
    await pool.query(
      `UPDATE coordinators
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [existing.id]
    );
  }

  return findByEmail(email);
};

export const listCoordinators = async (status = null) => {
  if (status) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_COLUMNS}
       FROM coordinators
       WHERE status = ?
       ORDER BY created_at ASC, id ASC`,
      [status]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM coordinators
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};
