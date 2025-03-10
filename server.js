import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import habitRoutes from './routes/habits.js';

// Load environment variables
dotenv.config();
console.log('Environment loaded');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Database connection available:', !!process.env.DATABASE_URL);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Server directory:', __dirname);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
console.log('Middleware configured');

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: !!process.env.DATABASE_URL
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/habits', habitRoutes);
console.log('Routes configured');

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));
console.log('Static files path:', path.join(__dirname, 'dist'));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  console.log('Catchall route hit, serving index.html');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
}); 