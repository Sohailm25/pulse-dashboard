import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

console.log('Initializing database connection');
console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set the DATABASE_URL environment variable');
}

// Create a new pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    console.error('Connection string format (without credentials):', 
      process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//[username]:[password]@') : 
      'Not available');
  } else {
    console.log('Connected to the database successfully');
    // Test query to verify connection
    client.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('Error executing test query:', err);
      } else {
        console.log('Database test query successful, current time:', result.rows[0].now);
      }
      done();
    });
  }
});

// Export a query function with error handling
export const query = async (text, params) => {
  try {
    console.log('Executing query:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    const result = await pool.query(text, params);
    console.log('Query successful, rows returned:', result.rowCount);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query text:', text);
    console.error('Query params:', params);
    throw error;
  }
};

export default pool; 