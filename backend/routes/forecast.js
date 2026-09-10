import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';

const router = express.Router();
router.use(authMiddleware);

// Get spending forecast for next month
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, currency: displayCurrency } = req.query;
    
    // Get user's default currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [userId]
    );
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';
    
    // Get last 3 months of expenses with currency
    const query = `
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        EXTRACT(YEAR FROM transaction_date) as year,
        currency,
        SUM(amount) as total_spent
      FROM transactions
      WHERE user_id = $1 
        AND type = 'expense'
        ${category_id ? 'AND category_id = $2' : ''}
        AND transaction_date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), currency
      ORDER BY year DESC, month DESC
    `;
    
    const params = category_id ? [userId, category_id] : [userId];
    const result = await pool.query(query, params);
    
    if (result.rows.length < 2) {
      return res.json({
        forecast: null,
        message: 'Not enough historical data for forecast (need at least 2 months)',
        currency: targetCurrency
      });
    }
    
    // Group by month and convert all to target currency
    const monthlyData = {};
    for (const row of result.rows) {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: row.month, year: row.year, total: 0 };
      }
      
      const convertedAmount = await convertCurrency(
        parseFloat(row.total_spent),
        row.currency,
        targetCurrency
      );
      monthlyData[key].total += convertedAmount;
    }
    
    // Convert to array and sort
    const data = Object.values(monthlyData)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    
    if (data.length < 2) {
      return res.json({
        forecast: null,
        message: 'Not enough historical data for forecast (need at least 2 months)',
        currency: targetCurrency
      });
    }
    
    // Simple linear regression: y = mx + b
    // x = month index (0, 1, 2), y = spending
    const n = data.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((row, index) => {
      const x = index;
      const y = row.total;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict next month (index = n)
    const forecast = slope * n + intercept;
    
    // Calculate average and trend
    const average = sumY / n;
    const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
    const changePercent = ((forecast - average) / average * 100).toFixed(1);
    
    res.json({
      forecast: Math.max(0, forecast), // Don't predict negative
      average,
      trend,
      changePercent,
      confidence: n >= 3 ? 'high' : 'medium',
      currency: targetCurrency,
      historicalData: data.map((row, index) => ({
        month: `${row.year}-${String(row.month).padStart(2, '0')}`,
        amount: row.total
      }))
    });
    
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get category-wise forecast
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency: displayCurrency } = req.query;

    // Get user's default currency
    const userResult = await pool.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';
    
    // Get top spending categories from last month
    const categoriesQuery = `
      SELECT DISTINCT category_id, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND t.transaction_date >= CURRENT_DATE - INTERVAL '1 month'
        AND t.category_id IS NOT NULL
      GROUP BY category_id, c.name, c.color
      ORDER BY SUM(amount) DESC
      LIMIT 5
    `;
    
    const categoriesResult = await pool.query(categoriesQuery, [userId]);
    
    const forecasts = await Promise.all(
      categoriesResult.rows.map(async (cat) => {
        // Get forecast for this category - group by currency
        const forecastQuery = `
          SELECT 
            EXTRACT(MONTH FROM transaction_date) as month,
            EXTRACT(YEAR FROM transaction_date) as year,
            currency,
            SUM(amount) as total_spent
          FROM transactions
          WHERE user_id = $1 
            AND type = 'expense'
            AND category_id = $2
            AND transaction_date >= CURRENT_DATE - INTERVAL '3 months'
          GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), currency
          ORDER BY year DESC, month DESC
        `;
        
        const forecastResult = await pool.query(forecastQuery, [userId, cat.category_id]);
        
        // Convert and group by month/year
        const monthlyData = {};
        
        for (const row of forecastResult.rows) {
          const key = `${row.year}-${row.month}`;
          
          if (!monthlyData[key]) {
            monthlyData[key] = { year: row.year, month: row.month, total: 0 };
          }
          
          // Convert each currency amount to target currency
          const convertedAmount = await convertCurrency(
            parseFloat(row.total_spent),
            row.currency,
            targetCurrency
          );
          
          monthlyData[key].total += convertedAmount;
        }
        
        // Convert to array and sort
        const data = Object.values(monthlyData)
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });
        
        if (data.length < 2) {
          return null;
        }
        
        const n = data.length;
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        data.forEach((row, index) => {
          const x = index;
          const y = row.total;
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const forecast = Math.max(0, slope * n + intercept);
        const average = sumY / n;
        const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
        
        return {
          category_id: cat.category_id,
          category_name: cat.category_name,
          category_color: cat.category_color,
          forecast,
          average,
          trend,
          lastMonth: data[data.length - 1].total,
          currency: targetCurrency
        };
      })
    );
    
    res.json({
      forecasts: forecasts.filter(f => f !== null)
    });
    
  } catch (error) {
    console.error('Category forecast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
