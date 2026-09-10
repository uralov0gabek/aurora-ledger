import pool from '../config/database.js';

const addCurrencyColumn = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding currency column to transactions table...');
    
    await client.query('BEGIN');

    // Add currency column to transactions
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
    `);
    console.log('✅ Added currency column to transactions');

    // Add index for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_currency 
      ON transactions(currency);
    `);
    console.log('✅ Created index on currency column');

    await client.query('COMMIT');
    console.log('🎉 Currency column migration completed!');
    console.log('📊 Transactions now support multi-currency!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

addCurrencyColumn().catch(err => { console.error(err); process.exit(1); });

