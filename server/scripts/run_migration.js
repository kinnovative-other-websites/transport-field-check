const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Reading migration script...');
    const sql = fs.readFileSync(path.join(__dirname, '../normalize_schema.sql'), 'utf8');

    console.log('Executing migration...');
    await client.query(sql);
    
    console.log('Migration completed successfully!');
    
    // Check results
    const branches = await client.query('SELECT COUNT(*) FROM branches');
    const routes = await client.query('SELECT COUNT(*) FROM routes');
    console.log(`Created ${branches.rows[0].count} branches and ${routes.rows[0].count} routes.`);
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
