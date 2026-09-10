import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting family sharing migration...');
    
    await client.query('BEGIN');

    // 1. Create families table
    console.log('Creating families table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create family_members table with roles
    console.log('Creating family_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        invited_by INTEGER REFERENCES users(id),
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        joined_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
        UNIQUE(family_id, user_id)
      )
    `);

    // 3. Create family_budgets table (shared budgets)
    console.log('Creating family_budgets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_budgets (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
        start_date DATE NOT NULL,
        end_date DATE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create family_goals table (shared saving goals)
    console.log('Creating family_goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_goals (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        target_date DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create family_goal_contributions table
    console.log('Creating family_goal_contributions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_goal_contributions (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES family_goals(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        contributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        note TEXT
      )
    `);

    // 6. Create expense_splits table (for splitting expenses)
    console.log('Creating expense_splits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        split_type VARCHAR(20) NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'custom', 'shares')),
        total_amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Create expense_split_members table (individual splits)
    console.log('Creating expense_split_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_split_members (
        id SERIAL PRIMARY KEY,
        split_id INTEGER NOT NULL REFERENCES expense_splits(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL,
        percentage DECIMAL(5, 2),
        shares INTEGER,
        paid BOOLEAN DEFAULT FALSE,
        paid_at TIMESTAMP,
        UNIQUE(split_id, user_id)
      )
    `);

    // 8. Create family_transactions table (link transactions to families)
    console.log('Creating family_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_transactions (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        added_by INTEGER NOT NULL REFERENCES users(id),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, transaction_id)
      )
    `);

    // 9. Create indexes for performance
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_budgets_family ON family_budgets(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_goals_family ON family_goals(family_id);
      CREATE INDEX IF NOT EXISTS idx_expense_splits_transaction ON expense_splits(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_expense_splits_family ON expense_splits(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_transactions_family ON family_transactions(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_transactions_transaction ON family_transactions(transaction_id);
    `);

    // 10. Create update timestamp trigger function if not exists
    console.log('Creating trigger functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // 11. Create triggers for updated_at
    console.log('Creating triggers...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_families_updated_at ON families;
      CREATE TRIGGER update_families_updated_at
        BEFORE UPDATE ON families
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_family_budgets_updated_at ON family_budgets;
      CREATE TRIGGER update_family_budgets_updated_at
        BEFORE UPDATE ON family_budgets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_family_goals_updated_at ON family_goals;
      CREATE TRIGGER update_family_goals_updated_at
        BEFORE UPDATE ON family_goals
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ Family sharing migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
