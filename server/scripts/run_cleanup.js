const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function runCleanup() {
  const client = await pool.connect();
  try {
    console.log('Reading cleanup script...');
    const sql = fs.readFileSync(path.join(__dirname, '../cleanup_schema.sql'), 'utf8');

    console.log('Executing cleanup...');
    await client.query(sql);
    
    console.log('Cleanup completed successfully!');
    console.log('- Created indexes on branch_id, route_id, vehicle_id');
    console.log('- Dropped old text columns (branch_name, route_name)');
    
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runCleanup();
