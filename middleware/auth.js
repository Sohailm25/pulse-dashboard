import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  // Get the token from the cookie
  const token = req.cookies.token;

  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // For debugging - log token presence but not the actual token
  console.log('Token received in request:', !!token);

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add the user info to the request
    req.user = decoded;
    
    // For debugging - log successful authentication
    console.log('User authenticated:', decoded.email);
    
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    // Handle different JWT errors with appropriate responses
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default authenticateToken; 