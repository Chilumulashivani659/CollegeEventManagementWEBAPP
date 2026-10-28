import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_events',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATE columns as 'YYYY-MM-DD' strings so the React date input works correctly.
  dateStrings: true
});

export default pool;
