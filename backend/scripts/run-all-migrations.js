import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the order of critical scripts first
const initialScripts = [
  'migrate.js', 
  'ensure-tables.js',
  'migrate-family-sharing.js' // must run before migrate-family-roles.js
];

// Get all other migrate-*.js scripts
const allFiles = fs.readdirSync(__dirname);
const migrationScripts = allFiles.filter(file => 
  file.startsWith('migrate-') && 
  file.endsWith('.js') &&
  !initialScripts.includes(file) // don't run initial scripts again
);

const scriptsToRun = [...initialScripts, ...migrationScripts];

console.log('🔄 Starting full database migration process...');

for (const script of scriptsToRun) {
  console.log(`\n▶️  Running ${script}...`);
  let success = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
      success = true;
      execSync('sleep 1'); // small delay between successful runs
      break;
    } catch (error) {
      console.error(`⚠️ Attempt ${attempt} failed for ${script}.`);
      if (attempt < 3) {
        console.log('Retrying in 3 seconds...');
        execSync('sleep 3');
      }
    }
  }
  
  if (!success) {
    console.error(`❌ Error running ${script} after 3 attempts. Halting migrations.`);
    process.exit(1);
  }
}

console.log('\n✅ All migrations completed successfully!');
