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