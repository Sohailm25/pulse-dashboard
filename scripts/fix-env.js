import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config();

console.log('Checking environment variables...');

// Check DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL is set');
  
  // Check if it's a variable reference
  if (process.env.DATABASE_URL.includes('${{')) {
    console.error('ERROR: DATABASE_URL appears to be a variable reference, not an actual connection string');
    console.error('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Try to extract the actual value from Railway's environment
    const match = process.env.DATABASE_URL.match(/\$\{\{([^}]+)\}\}/);
    if (match && match[1]) {
      const variableId = match[1];
      console.log('Extracted variable ID:', variableId);
      
      // Check if there's an environment variable with this ID
      const possibleEnvVars = Object.keys(process.env).filter(key => 
        key.includes(variableId) || process.env[key].includes(variableId)
      );
      
      if (possibleEnvVars.length > 0) {
        console.log('Possible matching environment variables:', possibleEnvVars);
        
        // Try to find a PostgreSQL connection string
        const postgresVars = possibleEnvVars.filter(key => 
          process.env[key].startsWith('postgres://') || 
          process.env[key].startsWith('postgresql://')
        );
        
        if (postgresVars.length > 0) {
          console.log('Found PostgreSQL connection string in:', postgresVars[0]);
          console.log('Value:', process.env[postgresVars[0]].substring(0, 20) + '...');
          
          // Update the DATABASE_URL
          process.env.DATABASE_URL = process.env[postgresVars[0]];
          console.log('Updated DATABASE_URL to use the actual connection string');
          
          // Create a temporary .env file with the correct value
          const envPath = path.join(rootDir, '.env.temp');
          fs.writeFileSync(envPath, `DATABASE_URL=${process.env.DATABASE_URL}\n`);
          console.log('Created temporary .env file with the correct DATABASE_URL');
        } else {
          console.log('No PostgreSQL connection string found in environment variables');
        }
      } else {
        console.log('No matching environment variables found');
      }
    }
  } else if (process.env.DATABASE_URL.startsWith('postgres://') || 
             process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.log('DATABASE_URL appears to be a valid PostgreSQL connection string');
  } else {
    console.warn('DATABASE_URL does not appear to be a standard PostgreSQL connection string');
    console.warn('Value:', process.env.DATABASE_URL.substring(0, 20) + '...');
  }
} else {
  console.error('DATABASE_URL is not set');
}

// Check JWT_SECRET
if (process.env.JWT_SECRET) {
  console.log('JWT_SECRET is set');
} else {
  console.error('JWT_SECRET is not set');
  
  // Generate a random JWT_SECRET
  const crypto = await import('crypto');
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  process.env.JWT_SECRET = jwtSecret;
  console.log('Generated a random JWT_SECRET');
  
  // Create a temporary .env file with the generated JWT_SECRET
  const envPath = path.join(rootDir, '.env.temp');
  const envContent = fs.existsSync(envPath) 
    ? fs.readFileSync(envPath, 'utf8') + `\nJWT_SECRET=${jwtSecret}\n`
    : `JWT_SECRET=${jwtSecret}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('Added JWT_SECRET to temporary .env file');
}

// Check PORT
if (process.env.PORT) {
  console.log('PORT is set to:', process.env.PORT);
} else {
  console.warn('PORT is not set, will default to 3000');
}

// Check NODE_ENV
if (process.env.NODE_ENV) {
  console.log('NODE_ENV is set to:', process.env.NODE_ENV);
} else {
  console.warn('NODE_ENV is not set, will default to development');
}

console.log('Environment check complete');

// Initialize database tables
console.log('Initializing database tables...');
try {
  // Instead of importing and running the init.js file directly (which would close the pool),
  // we'll execute the database initialization script from here
  const dbInitPath = path.join(rootDir, 'db', 'init-tables.js');
  
  // Run init-tables.js if it exists, otherwise create it
  if (fs.existsSync(dbInitPath)) {
    console.log('Found database initialization script, executing...');
    // Import will execute the file
    await import(dbInitPath);
  } else {
    console.log('Creating database initialization script...');
    
    // Create the script
    const initScript = `
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
    // Create users table
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    console.log('Users table created or verified');

    // Create projects table
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_count INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        collaborators INTEGER DEFAULT 1,
        color VARCHAR(50) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        phases JSONB DEFAULT '[]'::JSONB,
        recurring_sessions JSONB DEFAULT '[]'::JSONB,
        mvg JSONB DEFAULT '{"description": "Define your minimum viable goal", "completed": false, "streak": 0, "completionHistory": []}'::JSONB,
        next_action TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    console.log('Projects table created or verified');

    // Create habits table
    await pool.query(\`
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
    \`);
    console.log('Habits table created or verified');

    console.log('All tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  } finally {
    // Release the client back to the pool
    await pool.end();
  }
};

// Run the function
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});
`;
    fs.writeFileSync(dbInitPath, initScript);
    console.log('Database initialization script created');
    
    // Execute the script
    await import(dbInitPath);
  }
  
  console.log('Database tables initialization complete');
} catch (error) {
  console.error('Error during database initialization:', error);
} 