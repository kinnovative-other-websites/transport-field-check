-- Add latitude and longitude to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create vehicle_route_results table
CREATE TABLE IF NOT EXISTS vehicle_route_results (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(id) ON DELETE SET NULL, -- Optional link to route
    polyline TEXT,
    stop_order JSONB, -- Stores the optimized order of student IDs or Codes
    total_distance INTEGER, -- In meters
    total_duration INTEGER, -- In seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by vehicle
CREATE INDEX IF NOT EXISTS idx_vehicle_route_results_vehicle_id ON vehicle_route_results(vehicle_id);
