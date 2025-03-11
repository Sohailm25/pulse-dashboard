import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import habitRoutes from './routes/habits.js';
import pool from './db/index.js';

// Load environment variables
dotenv.config();
console.log('Environment loaded');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Database connection available:', !!process.env.DATABASE_URL);

// Verify database tables exist
const verifyDatabaseTables = async () => {
  try {
    console.log('Verifying database tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'projects', 'habits')
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Found database tables:', tables);
    
    if (tables.length < 3) {
      console.log('Some required tables are missing. Running database initialization...');
      // Import and run the initialization script
      const initDatabase = (await import('./db/init-tables.js')).default;
      await initDatabase();
    } else {
      console.log('All required tables exist in the database');
    }
  } catch (error) {
    console.error('Error verifying database tables:', error);
    console.log('Running database initialization due to error...');
    // Import and run the initialization script
    const initDatabase = (await import('./db/init-tables.js')).default;
    await initDatabase();
  }
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
console.log('Server will listen on port:', PORT);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Server directory:', __dirname);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow any origin for debugging
    console.log('CORS request from origin:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());
console.log('Middleware configured with permissive CORS for debugging');

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: !!process.env.DATABASE_URL,
    port: PORT
  });
});

// Debug endpoint to check static files
app.get('/debug/static', (req, res) => {
  const distPath = path.join(__dirname, 'dist');
  console.log('Checking static files in:', distPath);
  
  try {
    const files = fs.existsSync(distPath) ? fs.readdirSync(distPath) : [];
    const indexPath = path.join(distPath, 'index.html');
    const indexExists = fs.existsSync(indexPath);
    
    // Check for public directory and fallback.html
    const publicPath = path.join(__dirname, 'public');
    const publicExists = fs.existsSync(publicPath);
    const publicFiles = publicExists ? fs.readdirSync(publicPath) : [];
    const fallbackPath = path.join(publicPath, 'fallback.html');
    const fallbackExists = fs.existsSync(fallbackPath);
    
    res.json({
      serverDirectory: __dirname,
      distPathExists: fs.existsSync(distPath),
      distFiles: files,
      indexHtmlExists: indexExists,
      indexHtmlSize: indexExists ? fs.statSync(indexPath).size : null,
      publicPathExists: publicExists,
      publicFiles,
      fallbackHtmlExists: fallbackExists,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
        DATABASE_URL_FORMAT: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not available'
      }
    });
  } catch (error) {
    console.error('Error checking static files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Database info endpoint for debugging
app.get('/debug/database', async (req, res) => {
  try {
    // Check connection
    const connectionTest = await pool.query('SELECT NOW()');
    
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Count records in each table
    const tableStats = [];
    for (const table of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
        tableStats.push({
          table: table.table_name,
          count: parseInt(countResult.rows[0].count)
        });
      } catch (err) {
        tableStats.push({
          table: table.table_name,
          error: err.message
        });
      }
    }
    
    res.json({
      connection: {
        success: true,
        timestamp: connectionTest.rows[0].now
      },
      tables: tablesResult.rows.map(row => row.table_name),
      tableStats,
      databaseUrl: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not available'
    });
  } catch (error) {
    console.error('Error checking database:', error);
    res.status(500).json({ 
      error: error.message,
      connection: { success: false },
      databaseUrl: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not available'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/habits', habitRoutes);
console.log('Routes configured');

// Serve static files from the React app
const distPath = path.join(__dirname, 'dist');
console.log('Static files path:', distPath);
console.log('Checking if dist directory exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('index.html found in dist directory');
    try {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      console.log('index.html size:', indexContent.length, 'bytes');
      if (indexContent.length < 100) {
        console.error('Warning: index.html appears to be too small, might be corrupted');
      }
    } catch (error) {
      console.error('Error reading index.html:', error);
    }
  } else {
    console.error('index.html NOT found in dist directory');
  }
  
  try {
    const files = fs.readdirSync(distPath);
    console.log('Files in dist directory:', files);
  } catch (error) {
    console.error('Error reading dist directory:', error);
  }
}

// Serve public directory for fallback files
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  console.log('Public directory exists, serving static files from:', publicPath);
  app.use(express.static(publicPath));
} else {
  console.log('Public directory does not exist, creating it');
  try {
    fs.mkdirSync(publicPath, { recursive: true });
    console.log('Public directory created');
    
    // Create a fallback.html file if it doesn't exist
    const fallbackPath = path.join(publicPath, 'fallback.html');
    if (!fs.existsSync(fallbackPath)) {
      const fallbackContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse Dashboard - Maintenance</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #f5f5f5;
      color: #333;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h1 {
      color: #6366f1;
      margin-top: 0;
    }
    p {
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background-color: #6366f1;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #4f46e5;
    }
    .status {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pulse Dashboard</h1>
    <p>We're currently experiencing some technical difficulties. Our team is working to resolve the issue as quickly as possible.</p>
    <p>Please try again in a few minutes, or check the health status of our application.</p>
    <a href="/health" class="button">Check Health Status</a>
    <a href="/debug/static" class="button" style="margin-left: 10px;">Debug Info</a>
    <a href="/debug/database" class="button" style="margin-left: 10px;">Database Info</a>
    <div class="status">
      <p>If you continue to experience issues, please contact support.</p>
    </div>
  </div>
</body>
</html>
      `;
      fs.writeFileSync(fallbackPath, fallbackContent);
      console.log('Fallback HTML file created');
    }
  } catch (error) {
    console.error('Error creating public directory:', error);
  }
}

// Serve static files from the dist directory
app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  console.log('Catchall route hit for path:', req.path);
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  const fallbackPath = path.join(__dirname, 'public', 'fallback.html');
  
  if (fs.existsSync(indexPath)) {
    console.log('Serving index.html');
    res.sendFile(indexPath);
  } else if (fs.existsSync(fallbackPath)) {
    console.log('index.html not found, serving fallback.html');
    res.sendFile(fallbackPath);
  } else {
    console.error('Neither index.html nor fallback.html found');
    res.status(503).send('Application is currently unavailable. Please try again later.');
  }
});

// Start the server - wrapped to ensure database tables are created first
const startServer = async () => {
  try {
    // Verify database tables exist
    await verifyDatabaseTables();
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Server URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer(); 