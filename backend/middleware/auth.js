import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_please_change_in_production';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Export alias for consistency
export const authenticateToken = authMiddleware;

// Middleware to check if user is admin
export const isAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Middleware to check if user is mod or admin (moderator level)
export const isMod = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0 || !['mod', 'admin'].includes(result.rows[0].role)) {
      return res.status(403).json({ error: 'Access denied. Moderator or Admin only.' });
    }

    next();
  } catch (error) {
    console.error('Mod check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
