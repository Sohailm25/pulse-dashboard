import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import authenticateToken from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Ensure we have the required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Log the registration attempt for debugging
    console.log('Registration attempt for:', email);

    // Check if user already exists (case-insensitive email check)
    const existingUser = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) {
      console.log('User already exists with email:', existingUser.rows[0].email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert the new user (store email in lowercase for consistency)
    const lowerEmail = email.toLowerCase();
    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [lowerEmail, passwordHash, name]
    );

    const user = result.rows[0];

    // Create and sign a JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set the token as an HTTP-only cookie with enhanced security options
    const isProduction = process.env.NODE_ENV === 'production';
    const hostname = req.hostname;
    const domain = isProduction ? hostname : undefined;
    
    console.log('Setting cookie for hostname:', hostname);
    
    // Get the origin from the request
    const origin = req.headers.origin || '';
    console.log('Request origin:', origin);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // Must be true for SameSite=None
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: domain
    });

    console.log('User registered successfully:', user.email);
    
    // Return the user info (without password)
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login a user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Ensure we have the required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Log the login attempt for debugging
    console.log('Login attempt for:', email);

    // Find the user with case-insensitive email matching
    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    
    if (result.rows.length === 0) {
      console.log('User not found with email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('User found with email:', user.email);

    // Check the password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('Password mismatch for user:', user.email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and sign a JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set the token as an HTTP-only cookie with enhanced security options
    const isProduction = process.env.NODE_ENV === 'production';
    const hostname = req.hostname;
    const domain = isProduction ? hostname : undefined;
    
    console.log('Setting cookie for hostname:', hostname);
    
    // Get the origin from the request
    const origin = req.headers.origin || '';
    console.log('Request origin:', origin);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // Must be true for SameSite=None
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: domain
    });

    console.log('User logged in successfully:', user.email);
    
    // Return the user info (without password)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout a user
router.post('/logout', (req, res) => {
  // Clear the token cookie with the same settings as when setting it
  const isProduction = process.env.NODE_ENV === 'production';
  const hostname = req.hostname;
  const domain = isProduction ? hostname : undefined;
  
  console.log('Clearing cookie for hostname:', hostname);
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    domain: domain
  });
  
  console.log('User logged out successfully');
  res.json({ message: 'Logged out successfully' });
});

// Get the current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Get the user from the database
    const result = await query('SELECT id, email, name FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Return the user info
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to check cookies and auth status
router.get('/debug', (req, res) => {
  // Get all cookies from the request (but don't log sensitive values)
  const cookieNames = Object.keys(req.cookies || {});
  
  // Check if token exists in cookies
  const hasToken = cookieNames.includes('token');
  
  // Return debug info
  res.json({
    cookieCount: cookieNames.length,
    cookieNames,
    hasAuthToken: hasToken,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'content-type': req.headers['content-type'],
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Add a test endpoint for debugging connectivity
router.get('/test-connection', (req, res) => {
  // This simple endpoint allows testing if the frontend can reach the backend
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  console.log('Test connection request received from:', clientIp);
  console.log('User-Agent:', userAgent);
  
  // Return basic information
  res.json({
    success: true,
    message: 'Connection to server successful',
    timestamp: new Date().toISOString(),
    requestHeaders: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': userAgent,
      cookie: req.headers.cookie ? 'Cookie header present' : 'No cookie header'
    },
    environment: process.env.NODE_ENV
  });
});

export default router; 