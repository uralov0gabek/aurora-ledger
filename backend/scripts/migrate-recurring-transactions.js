import pool from '../config/database.js';

const createRecurringTransactions = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating recurring_transactions table...');
    
    await client.query('BEGIN');

    // Create recurring_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        description TEXT,
        frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        start_date DATE NOT NULL,
        end_date DATE,
        next_occurrence DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created recurring_transactions table');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_user_id 
      ON recurring_transactions(user_id);
    `);
    console.log('✅ Created index on user_id');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_next_occurrence 
      ON recurring_transactions(next_occurrence) 
      WHERE is_active = true;
    `);
    console.log('✅ Created index on next_occurrence');

    await client.query('COMMIT');
    console.log('🎉 Recurring transactions migration completed!');
    console.log('📅 Users can now create recurring/scheduled transactions!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createRecurringTransactions().catch(err => { console.error(err); process.exit(1); });

