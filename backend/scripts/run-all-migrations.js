import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the order of critical scripts first
const initialScripts = ['migrate.js', 'ensure-tables.js'];

// Get all other migrate-*.js scripts
const allFiles = fs.readdirSync(__dirname);
const migrationScripts = allFiles.filter(file => 
  file.startsWith('migrate-') && 
  file.endsWith('.js') &&
  file !== 'migrate.js' // already in initialScripts
);

const scriptsToRun = [...initialScripts, ...migrationScripts];

console.log('🔄 Starting full database migration process...');

for (const script of scriptsToRun) {
  console.log(`\n▶️  Running ${script}...`);
  try {
    execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Error running ${script}. Halting migrations.`);
    process.exit(1);
  }
}

console.log('\n✅ All migrations completed successfully!');
