const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Papa = require('papaparse');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3055;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Get all pending students for a branch
app.get('/api/students/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const query = `
      SELECT * FROM students 
      WHERE UPPER(branch_name) = UPPER($1) 
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
      SELECT DISTINCT route_name FROM students 
      WHERE UPPER(branch_name) = UPPER($1)
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
  try {
    const query = `
      SELECT * FROM students 
      WHERE UPPER(branch_name) = UPPER($1) 
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
  if (!student_codes || !Array.isArray(student_codes) || student_codes.length === 0) {
      return res.status(400).json({ error: 'Invalid student codes' });
  }
  try {
    const query = `
      UPDATE students 
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
    const result = await pool.query('SELECT * FROM students ORDER BY student_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Clear ALL locations (latitude & longitude only) ──
app.post('/api/clear-all-locations', async (req, res) => {
  try {
    await pool.query('UPDATE students SET latitude = NULL, longitude = NULL');
    res.json({ message: 'All locations cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Clear SELECTED locations ──
app.post('/api/clear-selected-locations', async (req, res) => {
  const { student_codes } = req.body;
  if (!student_codes || !Array.isArray(student_codes) || student_codes.length === 0) {
    return res.status(400).json({ error: 'Invalid student codes' });
  }
  try {
    await pool.query(
      'UPDATE students SET latitude = NULL, longitude = NULL WHERE student_code = ANY($1)',
      [student_codes]
    );
    res.json({ message: `Cleared locations for ${student_codes.length} student(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Download CSV template for bulk upload ──
app.get('/api/bulk-upload-template', (req, res) => {
  const headers = 'student_id,student_code,student_name,section_name,branch_name,route_name\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.csv');
  res.send(headers);
});

// ── Bulk upload students via CSV ──
app.post('/api/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return res.status(400).json({ error: 'CSV parsing error', details: parsed.errors });
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Validate required columns
    const requiredCols = ['student_id', 'student_code', 'student_name', 'branch_name', 'route_name'];
    const missingCols = requiredCols.filter(col => !Object.keys(rows[0]).includes(col));
    if (missingCols.length > 0) {
      return res.status(400).json({ error: `Missing columns: ${missingCols.join(', ')}` });
    }

    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      if (!row.student_id || !row.student_code || !row.student_name) continue; // skip invalid rows
      const result = await pool.query(
        `INSERT INTO students (student_id, student_code, student_name, section_name, branch_name, route_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id) DO UPDATE SET
           student_code = EXCLUDED.student_code,
           student_name = EXCLUDED.student_name,
           section_name = EXCLUDED.section_name,
           branch_name = EXCLUDED.branch_name,
           route_name = EXCLUDED.route_name
         RETURNING (xmax = 0) AS is_insert`,
        [
          row.student_id.trim(),
          row.student_code.trim(),
          row.student_name.trim(),
          (row.section_name || '').trim(),
          row.branch_name.trim(),
          row.route_name.trim()
        ]
      );
      if (result.rows[0].is_insert) inserted++;
      else updated++;
    }

    res.json({ message: 'Upload successful', inserted, updated, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});