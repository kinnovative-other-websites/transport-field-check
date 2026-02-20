const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 20000, // 20s timeout
  idleTimeoutMillis: 30000,
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected successfully!');
    client.release();

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
