import pool from '../config/db.js';

/**
 * Fetch all events, or search by event name (case-insensitive partial match).
 * All user input is passed as a parameterized query value.
 */
export const getAllEvents = async (search = '') => {
  const term = search.toString().trim();

  if (term) {
    const wildcard = `%${term.toLowerCase()}%`;
    const [rows] = await pool.query(
      `SELECT id, event_name, event_date, venue, organizer
       FROM events
       WHERE LOWER(event_name) LIKE ?
       ORDER BY event_date ASC, id ASC`,
      [wildcard]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT id, event_name, event_date, venue, organizer
     FROM events
     ORDER BY event_date ASC, id ASC`
  );
  return rows;
};

export const getEventById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, event_name, event_date, venue, organizer
     FROM events
     WHERE id = ?`,
    [id]
  );
  return rows[0];
};

export const createEvent = async (event) => {
  const { event_name, event_date, venue, organizer } = event;
  const [result] = await pool.query(
    `INSERT INTO events (event_name, event_date, venue, organizer)
     VALUES (?, ?, ?, ?)`,
    [event_name.trim(), event_date, venue.trim(), organizer.trim()]
  );
  return getEventById(result.insertId);
};

export const updateEvent = async (id, event) => {
  const { event_name, event_date, venue, organizer } = event;

  // Check existence first so a "no change" update is not reported as 404.
  const existing = await getEventById(id);
  if (!existing) return null;

  await pool.query(
    `UPDATE events
     SET event_name = ?, event_date = ?, venue = ?, organizer = ?
     WHERE id = ?`,
    [event_name.trim(), event_date, venue.trim(), organizer.trim(), id]
  );

  return getEventById(id);
};

export const deleteEvent = async (id) => {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
