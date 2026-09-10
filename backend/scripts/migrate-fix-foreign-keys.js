import pool from '../config/database.js';

const fixForeignKeys = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Fixing missing ON DELETE CASCADE constraints...');

    const tablesToFix = [
      { table: 'family_members', column: 'invited_by' },
      { table: 'family_budgets', column: 'created_by' },
      { table: 'family_goals', column: 'created_by' },
      { table: 'expense_splits', column: 'created_by' },
      { table: 'family_transactions', column: 'added_by' }
    ];

    for (const { table, column } of tablesToFix) {
      // Find the foreign key constraint name dynamically just in case it's not the default
      const result = await client.query(`
        SELECT
            tc.constraint_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
            AND kcu.column_name = $2;
      `, [table, column]);

      for (const row of result.rows) {
        const constraintName = row.constraint_name;
        console.log(`Dropping constraint ${constraintName} on ${table}...`);
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT ${constraintName}`);
        
        console.log(`Re-adding constraint ${constraintName} with ON DELETE CASCADE...`);
        await client.query(`
          ALTER TABLE ${table} 
          ADD CONSTRAINT ${constraintName} 
          FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE CASCADE
        `);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Foreign keys updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

fixForeignKeys().catch(console.error);
