const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Get all pending students for a branch
app.get('/api/students/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const query = `
      SELECT * FROM student 
      WHERE branch_name = $1 
      AND (latitude IS NULL OR longitude IS NULL)
    `;
    const result = await pool.query(query, [branch]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct routes for a branch
app.get('/api/routes/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const query = `
      SELECT DISTINCT route_name FROM student 
      WHERE branch_name = $1
      ORDER BY route_name ASC
    `;
    const result = await pool.query(query, [branch]);
    res.json(result.rows.map(row => row.route_name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending students for a branch and route
app.get('/api/students/:branch/:route', async (req, res) => {
  const { branch, route } = req.params;
  // Decode parameters if they are URL encoded (Express does this automatically for params usually, but good to be safe if double encoded)
  // Actually params are decoded.
  
  try {
    const query = `
      SELECT * FROM student 
      WHERE branch_name = $1 
      AND route_name = $2 
      AND (latitude IS NULL OR longitude IS NULL)
    `;
    const result = await pool.query(query, [branch, route]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log location for students
app.post('/api/log-location', async (req, res) => {
  const { student_codes, latitude, longitude, branch_name } = req.body;
  // student_codes should be an array of strings
  
  if (!student_codes || !Array.isArray(student_codes) || student_codes.length === 0) {
      return res.status(400).json({ error: 'Invalid student codes' });
  }

  try {
    const query = `
      UPDATE student 
      SET latitude = $1, longitude = $2 
      WHERE student_code = ANY($3) AND branch_name = $4
    `;
    await pool.query(query, [latitude, longitude, student_codes, branch_name]);
    res.json({ message: 'Location logged successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all data
app.get('/api/all-data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM student');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
