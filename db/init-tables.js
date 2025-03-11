import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const initDatabase = async () => {
  console.log('Starting database initialization...');
  
  // Create a new pool for database initialization
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // First check if gen_random_uuid() is available
    try {
      await pool.query('SELECT gen_random_uuid()');
      console.log('gen_random_uuid() function is available');
    } catch (error) {
      console.log('gen_random_uuid() function is not available, enabling pgcrypto extension...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
      console.log('pgcrypto extension enabled');
    }

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created or verified');

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_count INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        collaborators INTEGER DEFAULT 1,
        color VARCHAR(50) DEFAULT '#4F46E5',
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        phases JSONB DEFAULT '[]'::JSONB,
        recurring_sessions JSONB DEFAULT '[]'::JSONB,
        mvg JSONB DEFAULT '{"description": "Define your minimum viable goal", "completed": false, "streak": 0, "completionHistory": []}'::JSONB,
        next_action TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Projects table created or verified');

    // Create habits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        identity TEXT,
        streak INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completion_history JSONB DEFAULT '[]'::JSONB,
        clear_framework TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Habits table created or verified');

    // Check if tables were created correctly
    const checkTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'projects', 'habits')
    `);
    
    console.log('Tables found in database:', checkTables.rows.map(row => row.table_name));
    console.log('All tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error; // Re-throw to be caught by the caller
  } finally {
    // Release the client back to the pool
    await pool.end();
  }
};

// Run the initialization
console.log('Running database initialization...');
initDatabase()
  .then(() => console.log('Database initialization completed successfully'))
  .catch(err => {
    console.error('Failed to initialize database:', err);
    // Don't exit the process, as this might be imported by another module
  });

// Export the function for use in other modules
export default initDatabase; 