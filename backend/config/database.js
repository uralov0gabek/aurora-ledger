import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL ERROR: DATABASE_URL environment variable is missing.');
  console.error('Please configure DATABASE_URL in your Render environment settings.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on idle client:', err);
  // Do NOT process.exit(-1) here, as serverless DBs like Neon will routinely close idle connections.
});

export default pool;

