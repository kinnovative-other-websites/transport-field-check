const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,                      // up from default 10 — supports 200-300 concurrent users
  idleTimeoutMillis: 30000,     // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if can't connect in 5s
});

// Log pool errors (don't crash the server)
pool.on('error', (err) => {
  console.error('Unexpected idle client error:', err.message);
});

module.exports = pool;
