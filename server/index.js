const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const Papa = require('papaparse');
const pool = require('./db');
const pool = require('./db');
const RouteService = require('./services/RouteService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3055;
const upload = multer({ storage: multer.memoryStorage() });

// Auth config
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const VIEW_USER = process.env.VIEW_USER || 'viewer';
const VIEW_PASS = process.env.VIEW_PASS || 'view123';
const JWT_SECRET = process.env.JWT_SECRET || 'transport-field-check-secret-key-2026';

app.use(cors());
app.use(express.json());

// ── Login endpoint ──
app.get('/api/version', (req, res) => res.json({ version: '1.3.0', timestamp: new Date().toISOString() }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ user: username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: 'admin', message: 'Login successful' });
  } else if (username === VIEW_USER && password === VIEW_PASS) {
    const token = jwt.sign({ user: username, role: 'viewer' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: 'viewer', message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ── Verify token endpoint ──
app.get('/api/verify-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please login again.' });
  }
};

// Get global stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalQuery = 'SELECT COUNT(*) FROM students';
    const loggedQuery = 'SELECT COUNT(*) FROM students WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    
    const [totalRes, loggedRes] = await Promise.all([
      pool.query(totalQuery),
      pool.query(loggedQuery)
    ]);
    
    const total = parseInt(totalRes.rows[0].count);
    const logged = parseInt(loggedRes.rows[0].count);
    
    res.json({
      total,
      logged,
      pending: total - logged
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all pending students for a branch
app.get('/api/students/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const query = `
      SELECT s.*, b.name as branch_name, r.route_name, v.vehicle_number as vehicle_name
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      WHERE UPPER(b.name) = UPPER($1) 
      AND (s.latitude IS NULL OR s.longitude IS NULL)
    `;
    const result = await pool.query(query, [branch]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct branches (from branches table)
app.get('/api/branches', async (req, res) => {
  try {
    const query = 'SELECT name as branch_name FROM branches ORDER BY name ASC';
    const result = await pool.query(query);
    res.json(result.rows.map(row => row.branch_name).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct routes for a branch (from routes table joined with branches)
app.get('/api/routes/:branch', async (req, res) => {
  const { branch } = req.params;
  try {
    const query = `
      SELECT r.route_name 
      FROM routes r
      JOIN branches b ON r.branch_id = b.id
      WHERE UPPER(b.name) = UPPER($1)
      ORDER BY r.route_name ASC
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
      SELECT s.*, b.name as branch_name, r.route_name, v.vehicle_number as vehicle_name
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      WHERE UPPER(b.name) = UPPER($1) 
      AND r.route_name = $2 
      AND (s.latitude IS NULL OR s.longitude IS NULL)
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
    // We need to update students. We check branch name matches via join or subquery.
    const query = `
      UPDATE students s
      SET latitude = $1, longitude = $2
      FROM branches b
      WHERE s.branch_id = b.id
      AND s.student_code = ANY($3) 
      AND UPPER(b.name) = UPPER($4)
    `;
    await pool.query(query, [latitude, longitude, student_codes, branch_name]);
    res.json({ message: 'Location logged successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all data (dashboard only) - LEGACY (Updated to join)
app.get('/api/all-data', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT s.*, b.name as branch_name, r.route_name, v.vehicle_number as vehicle_name
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      ORDER BY s.student_name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Paginated Students Endpoint (Optimized for Dashboard) ──
app.get('/api/students-paginated', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', branch, route, status } = req.query;
    
    const offset = (page - 1) * limit;
    const params = [];
    let whereClauses = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      whereClauses.push(`(
        s.student_name ILIKE $${paramIndex} OR 
        s.student_code ILIKE $${paramIndex} OR 
        s.student_id ILIKE $${paramIndex} OR 
        b.name ILIKE $${paramIndex} OR 
        r.route_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Branch filter
    if (branch) {
      whereClauses.push(`b.name = $${paramIndex}`);
      params.push(branch);
      paramIndex++;
    }

    // Route filter
    if (route) {
      whereClauses.push(`r.route_name = $${paramIndex}`);
      params.push(route);
      paramIndex++;
    }

    // Status filter
    if (status === 'logged') {
      whereClauses.push(`(s.latitude IS NOT NULL AND s.longitude IS NOT NULL)`);
    } else if (status === 'pending') {
      whereClauses.push(`(s.latitude IS NULL OR s.longitude IS NULL)`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total (for pagination)
    // Need to join for filtering
    const countQuery = `
      SELECT COUNT(*) FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      ${whereSQL}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Fetch Data
    const dataQuery = `
      SELECT s.*, b.name as branch_name, r.route_name, v.vehicle_number as vehicle_name
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      ${whereSQL}
      ORDER BY s.student_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Add limit & offset to params
    const queryParams = [...params, limit, offset];
    
    const result = await pool.query(dataQuery, queryParams);

    res.json({
      data: result.rows,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Pagination Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get All Student Locations (for Map View) ──
app.get('/api/locations', authMiddleware, async (req, res) => {
  try {
    const { branch, route } = req.query;
    const params = [];
    let whereClauses = ['s.latitude IS NOT NULL', 's.longitude IS NOT NULL'];
    let paramIndex = 1;

    if (branch) {
      whereClauses.push(`b.name = $${paramIndex}`);
      params.push(branch);
      paramIndex++;
    }

    if (route) {
      whereClauses.push(`r.route_name = $${paramIndex}`);
      params.push(route);
      paramIndex++;
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    const query = `
      SELECT s.student_id, s.student_code, s.student_name, b.name as branch_name, r.route_name, s.latitude, s.longitude
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN routes r ON s.route_id = r.id
      ${whereSQL}
      ORDER BY r.route_name ASC, s.student_code ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('Map Data Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to restrict access to Admins only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// ── Clear ALL locations ──
app.post('/api/clear-all-locations', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('UPDATE students SET latitude = NULL, longitude = NULL');
    res.json({ message: 'All locations cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Clear SELECTED locations ──
app.post('/api/clear-selected-locations', authMiddleware, adminOnly, async (req, res) => {
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

// ── Erase ALL student data (permanent delete) ──
app.post('/api/erase-all-data', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM students');
    res.json({ message: 'All student data erased permanently', deleted: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Delete SELECTED students (permanent) ──
app.post('/api/delete-selected-students', authMiddleware, adminOnly, async (req, res) => {
  const { student_codes } = req.body;
  if (!student_codes || !Array.isArray(student_codes) || student_codes.length === 0) {
    return res.status(400).json({ error: 'Invalid student codes' });
  }
  try {
    const result = await pool.query('DELETE FROM students WHERE student_code = ANY($1)', [student_codes]);
    res.json({ message: `Deleted ${result.rowCount} student(s) permanently`, deleted: result.rowCount });
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
app.post('/api/bulk-upload', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
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

    const client = await pool.connect();
    let inserted = 0;
    let updated = 0;

    try {
      await client.query('BEGIN');

      for (const row of rows) {
        if (!row.student_id || !row.student_code || !row.student_name) continue; 
        
        const branchName = row.branch_name.trim();
        const routeName = row.route_name.trim();

        // 1. Upsert Branch
        let branchId;
        const branchRes = await client.query(
          'INSERT INTO branches (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [branchName]
        );
        branchId = branchRes.rows[0].id;

        // 2. Upsert Route
        let routeId;
        const routeRes = await client.query(
          'INSERT INTO routes (branch_id, route_name) VALUES ($1, $2) ON CONFLICT (branch_id, route_name) DO UPDATE SET route_name = EXCLUDED.route_name RETURNING id',
          [branchId, routeName]
        );
        routeId = routeRes.rows[0].id;

        // 3. Upsert Student
        const result = await client.query(
          `INSERT INTO students (student_id, student_code, student_name, section_name, branch_id, route_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (student_id) DO UPDATE SET
             student_code = EXCLUDED.student_code,
             student_name = EXCLUDED.student_name,
             section_name = EXCLUDED.section_name,
             branch_id = EXCLUDED.branch_id,
             route_id = EXCLUDED.route_id
           RETURNING (xmax = 0) AS is_insert`,
          [
            row.student_id.trim(),
            row.student_code.trim(),
            row.student_name.trim(),
            (row.section_name || '').trim(),
            branchId,
            routeId
          ]
        );
        if (result.rows[0].is_insert) inserted++;
        else updated++;
      }

      await client.query('COMMIT');
      res.json({ message: 'Upload successful', inserted, updated, total: rows.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── Route Optimization Endpoints ──

// Trigger Optimization
app.post('/api/optimize-route', authMiddleware, adminOnly, async (req, res) => {
  const { vehicle_id, branch_id } = req.body;
  if (!vehicle_id || !branch_id) {
    return res.status(400).json({ error: 'vehicle_id and branch_id are required' });
  }
  try {
    const result = await RouteService.optimizeRoute(vehicle_id, branch_id);
    res.json(result);
  } catch (err) {
    console.error('Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Optimized Route
app.get('/api/vehicle-route/:vehicleId', authMiddleware, async (req, res) => {
  const { vehicleId } = req.params;
  try {
    const result = await RouteService.getOptimizedRoute(vehicleId);
    if (!result) {
      return res.status(404).json({ message: 'No optimized route found' });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Helper to retrieve IDs from names
async function getIdsFromNames(branchName, routeName) {
  const branchRes = await pool.query('SELECT id, latitude, longitude FROM branches WHERE name = $1', [branchName]);
  if (branchRes.rows.length === 0) throw new Error('Branch not found');
  const branchId = branchRes.rows[0].id;
  
  // Find vehicle associated with this route (via students)
  // We assume one vehicle per route for simplicity in this context
  const vehicleRes = await pool.query(`
    SELECT DISTINCT s.vehicle_id 
    FROM students s
    JOIN routes r ON s.route_id = r.id
    WHERE s.branch_id = $1 AND r.route_name = $2 AND s.vehicle_id IS NOT NULL
    LIMIT 1
  `, [branchId, routeName]);

  if (vehicleRes.rows.length === 0) throw new Error('No vehicle found for this route');
  const vehicleId = vehicleRes.rows[0].vehicle_id;

  return { branchId, vehicleId };
}

// Trigger Optimization by Name (for Dashboard)
app.post('/api/optimize-route-by-name', authMiddleware, adminOnly, async (req, res) => {
  const { branch_name, route_name } = req.body;
  if (!branch_name || !route_name) {
    return res.status(400).json({ error: 'branch_name and route_name are required' });
  }
  try {
    const { branchId, vehicleId } = await getIdsFromNames(branch_name, route_name);
    const result = await RouteService.optimizeRoute(vehicleId, branchId);
    res.json(result);
  } catch (err) {
    console.error('Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Optimized Route by Name (for MapView)
app.get('/api/optimized-route', authMiddleware, async (req, res) => {
  const { branch, route } = req.query;
  if (!branch || !route) return res.json(null); // Return null if filters not set

  try {
    const { vehicleId } = await getIdsFromNames(branch, route);
    const result = await RouteService.getOptimizedRoute(vehicleId);
    if (!result) return res.json(null);
    res.json(result);
  } catch (err) {
    // If specific error like "Vehicle not found", just return null so map doesn't break
    console.error('Fetch Route Error:', err.message);
    res.json(null); 
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
