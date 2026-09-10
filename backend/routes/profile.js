import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, currency, oauth_provider, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile (name and email)
router.put('/',
  authenticateToken,
  [
    body('email').isEmail().normalizeEmail(),
    body('full_name').trim().notEmpty().isLength({ min: 2, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, full_name } = req.body;

      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      // Update profile
      const result = await pool.query(
        'UPDATE users SET email = $1, full_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, full_name, role, currency, oauth_provider, created_at',
        [email, full_name, req.user.userId]
      );

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Change password
router.put('/change-password',
  authenticateToken,
  [
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current user
      const userResult = await pool.query(
        'SELECT password, oauth_provider FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // If user has oauth_provider (Google login), allow setting password without current password
      const isOAuthUser = user.oauth_provider && user.oauth_provider !== 'local';
      const hasNoPassword = !user.password || user.password === '';

      // Only require current password if user is not OAuth user and has a password
      if (!isOAuthUser && !hasNoPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
          return res.status(400).json({ error: 'New password must be different from current password' });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and set oauth_provider to 'local' if it was OAuth
      await pool.query(
        'UPDATE users SET password = $1, oauth_provider = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [hashedPassword, 'local', req.user.userId]
      );

      res.json({ 
        message: 'Password changed successfully',
        note: isOAuthUser ? 'You can now login with email and password' : null
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Delete user account
router.delete('/', authenticateToken, async (req, res) => {
  try {
    // Delete user (cascade will handle related records like transactions, budgets, etc.)
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
