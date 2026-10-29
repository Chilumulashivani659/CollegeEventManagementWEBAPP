import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventRoutes from './routes/eventRoutes.js';
import coordinatorRoutes from './routes/coordinatorRoutes.js';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));
app.use(express.json());

// Health check - also verifies the MySQL connection
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Database connected' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.use('/api/events', eventRoutes);
app.use('/api/coordinators', coordinatorRoutes);

// Unknown route handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

// Columns the coordinator registration flow depends on. Checking them at
// startup turns a silent "Unknown column" 500 into a clear log message.
const REQUIRED_SCHEMA = {
  authorized_coordinators: [
    'id',
    'full_name',
    'email',
    'designation',
    'department',
    'employee_id',
    'student_council_id',
    'is_active',
    'registered_at'
  ],
  coordinators: [
    'id',
    'authorized_coordinator_id',
    'full_name',
    'email',
    'designation',
    'department',
    'employee_id',
    'student_council_id',
    'password_hash',
    'status'
  ]
};

const verifyDatabaseSchema = async () => {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('authorized_coordinators', 'coordinators')`
  );

  const found = new Map();
  for (const row of rows) {
    if (!found.has(row.TABLE_NAME)) found.set(row.TABLE_NAME, new Set());
    found.get(row.TABLE_NAME).add(row.COLUMN_NAME);
  }

  const problems = [];
  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    if (!found.has(table)) {
      problems.push(`missing table "${table}"`);
      continue;
    }
    const missing = columns.filter((column) => !found.get(table).has(column));
    if (missing.length > 0) {
      problems.push(`"${table}" is missing column(s): ${missing.join(', ')}`);
    }
  }

  if (problems.length > 0) {
    console.error('Database schema is out of date:');
    for (const problem of problems) console.error(` - ${problem}`);
    console.error(
      'Apply database.sql, then restart the backend. Registration will return a schema error until this is fixed.'
    );
    return;
  }

  console.log('Database schema check passed.');
};

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  verifyDatabaseSchema().catch((err) => {
    console.error('Database schema check failed:', err.message);
  });
});

// Close the database pool cleanly on shutdown
const shutdown = async () => {
  console.log('\nShutting down server...');
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
