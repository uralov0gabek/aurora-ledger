import pool from '../config/database.js';

const migrateSavingGoals = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Saving Goals migration...');
    
    await client.query('BEGIN');

    // Create saving_goals table
    console.log('📝 Creating saving_goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
        current_amount DECIMAL(15, 2) DEFAULT 0 CHECK (current_amount >= 0),
        currency VARCHAR(3) DEFAULT 'USD',
        deadline DATE,
        category VARCHAR(100),
        icon VARCHAR(50) DEFAULT '🎯',
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON saving_goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_saving_goals_is_completed ON saving_goals(is_completed);
    `);

    // Create saving_goals_contributions table
    console.log('📝 Creating saving_goals_contributions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_goals_contributions (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES saving_goals(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        contribution_date DATE DEFAULT CURRENT_DATE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contributions_goal_id ON saving_goals_contributions(goal_id);
      CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON saving_goals_contributions(user_id);
      CREATE INDEX IF NOT EXISTS idx_contributions_date ON saving_goals_contributions(contribution_date);
    `);

    await client.query('COMMIT');
    console.log('✅ Saving Goals migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateSavingGoals().catch(err => { console.error(err); process.exit(1); });
