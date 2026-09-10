import express from 'express';
import { 
  getAllRates, 
  convertCurrency, 
  formatCurrency,
  POPULAR_CURRENCIES 
} from '../utils/currency.js';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Get list of popular currencies
router.get('/list', (req, res) => {
  res.json(POPULAR_CURRENCIES);
});

// Get exchange rate between two currencies
router.get('/rate/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    const rate = await getExchangeRate(from.toUpperCase(), to.toUpperCase());
    
    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      formatted: formatCurrency(1, from.toUpperCase()) + ' = ' + formatCurrency(rate, to.toUpperCase())
    });
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

// Get all rates for a base currency
router.get('/rates/:base', async (req, res) => {
  try {
    const { base } = req.params;
    const rates = await getAllRates(base.toUpperCase());
    
    res.json({
      base: base.toUpperCase(),
      rates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting all rates:', error);
    res.status(500).json({ error: 'Failed to fetch rates', details: error.message });
  }
});

// Convert amount from one currency to another
router.post('/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const convertedAmount = await convertCurrency(
      parseFloat(amount),
      from.toUpperCase(),
      to.toUpperCase()
    );
    
    res.json({
      original: {
        amount: parseFloat(amount),
        currency: from.toUpperCase(),
        formatted: formatCurrency(parseFloat(amount), from.toUpperCase())
      },
      converted: {
        amount: convertedAmount,
        currency: to.toUpperCase(),
        formatted: formatCurrency(convertedAmount, to.toUpperCase())
      },
      rate
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// Get user's preferred currency
router.get('/user/preference', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      currency: result.rows[0].currency || 'USD'
    });
  } catch (error) {
    console.error('Error getting user currency:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user's preferred currency
router.put('/user/preference', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({ error: 'Currency is required' });
    }

    // Validate currency code
    const validCurrency = POPULAR_CURRENCIES.find(c => c.code === currency.toUpperCase());
    if (!validCurrency) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    await pool.query(
      'UPDATE users SET currency = $1 WHERE id = $2',
      [currency.toUpperCase(), req.user.id]
    );

    res.json({
      message: 'Currency preference updated',
      currency: currency.toUpperCase()
    });
  } catch (error) {
    console.error('Error updating user currency:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

