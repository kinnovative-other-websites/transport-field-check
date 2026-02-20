const axios = require('axios');
const pool = require('../db');
require('dotenv').config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

class RouteService {
  /**
   * Optimizes a route for a given vehicle.
   * Fetches students assigned to the vehicle, and the branch location.
   * Calls Google Directions API with optimize:true.
   * Stores the result in vehicle_route_results.
   */
  async optimizeRoute(vehicleId, branchId) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    // 1. Fetch Vehicle and Branch details
    const vehicleQuery = 'SELECT * FROM vehicles WHERE id = $1';
    const branchQuery = 'SELECT * FROM branches WHERE id = $1';
    
    const [vehicleRes, branchRes] = await Promise.all([
      pool.query(vehicleQuery, [vehicleId]),
      pool.query(branchQuery, [branchId])
    ]);

    if (vehicleRes.rows.length === 0) throw new Error('Vehicle not found');
    if (branchRes.rows.length === 0) throw new Error('Branch not found');

    const branch = branchRes.rows[0];
    if (!branch.latitude || !branch.longitude) {
      throw new Error('Branch coordinates not set. Please set branch location first.');
    }

    const startLocation = `${branch.latitude},${branch.longitude}`;

    // 2. Fetch Students for this Vehicle (and Branch)
    // We only want students who have lat/lng
    const studentsQuery = `
      SELECT * FROM students 
      WHERE vehicle_id = $1 
      AND branch_id = $2
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
    `;
    const studentsRes = await pool.query(studentsQuery, [vehicleId, branchId]);
    const students = studentsRes.rows;

    if (students.length === 0) {
      throw new Error('No students with locations found for this vehicle');
    }

    if (students.length > 25) {
      // Google Directions API has a limit of 25 waypoints (plus origin/dest)
      // For > 25, we'd need multiple requests or a different solution.
      // For now, we'll throw an error or slice. 
      // Let's slice and warn, or just error.
      // Slicing might be misleading. Let's error for now.
      throw new Error('Too many stops (>25) for a single request. Optimization limit reached.');
    }

    // 3. Prepare Waypoints
    const waypoints = students.map(s => `${s.latitude},${s.longitude}`).join('|');

    // 4. Call Google Directions API
    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const response = await axios.get(url, {
      params: {
        origin: startLocation,
        destination: startLocation, // Round trip
        waypoints: `optimize:true|${waypoints}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google API Error: ${response.data.status} - ${response.data.error_message || ''}`);
    }

    const route = response.data.routes[0];
    const polyline = route.overview_polyline.points;
    const waypointOrder = route.waypoint_order; // Array of indices mapping to waypoints input
    
    // Calculate totals
    let totalDistance = 0;
    let totalDuration = 0;
    route.legs.forEach(leg => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });

    // 5. Map optimized order back to students
    // waypointOrder contains indices of the supplied waypoints array.
    // e.g. [2, 0, 1] means the 3rd student in our list is first stop.
    const optimizedStops = waypointOrder.map(index => {
      const student = students[index];
      return {
        student_id: student.student_id,
        student_code: student.student_code,
        student_name: student.student_name,
        lat: student.latitude,
        lng: student.longitude
      };
    });

    // 6. Store Result
    const insertQuery = `
      INSERT INTO vehicle_route_results 
      (vehicle_id, route_id, polyline, stop_order, total_distance, total_duration)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    // Assuming passing a route_id is optional but good for context. 
    // We can get route_id from the first student if consistent, 
    // or just pass NULL if not strictly strictly required by schema (it is nullable).
    const routeId = students[0].route_id || null;

    const savedResult = await pool.query(insertQuery, [
      vehicleId, 
      routeId, 
      polyline, 
      JSON.stringify(optimizedStops), 
      totalDistance, 
      totalDuration
    ]);

    return savedResult.rows[0];
  }

  /**
   * Get existing optimized route for vehicle
   */
  async getOptimizedRoute(vehicleId) {
    const query = `
      SELECT * FROM vehicle_route_results 
      WHERE vehicle_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [vehicleId]);
    return result.rows[0] || null;
  }
}

module.exports = new RouteService();
