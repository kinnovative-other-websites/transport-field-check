const fs = require('fs');
const path = require('path');
// Load dotenv explicitly before requiring db
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = require('./db');

async function runMigration() {
  try {
    console.log('Current directory:', process.cwd());
    console.log('DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 'undefined');
    
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set!');
        process.exit(1);
    }

    const sqlPath = path.join(__dirname, 'migrate_optimization.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
