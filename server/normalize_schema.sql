-- Transaction start
BEGIN;

-- 1. Create Reference Tables
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, route_name)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(255),
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate Branches from existing students
INSERT INTO branches (name)
SELECT DISTINCT branch_name FROM students WHERE branch_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 3. Populate Routes from existing students
INSERT INTO routes (branch_id, route_name)
SELECT DISTINCT b.id, s.route_name
FROM students s
JOIN branches b ON s.branch_name = b.name
WHERE s.route_name IS NOT NULL
ON CONFLICT (branch_id, route_name) DO NOTHING;

-- 4. Add ID columns to students if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'branch_id') THEN
        ALTER TABLE students ADD COLUMN branch_id INTEGER REFERENCES branches(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'route_id') THEN
        ALTER TABLE students ADD COLUMN route_id INTEGER REFERENCES routes(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'vehicle_id') THEN
        ALTER TABLE students ADD COLUMN vehicle_id INTEGER REFERENCES vehicles(id);
    END IF;
END $$;

-- 5. Populate IDs in students
UPDATE students s
SET branch_id = b.id
FROM branches b
WHERE s.branch_name = b.name AND s.branch_id IS NULL;

UPDATE students s
SET route_id = r.id
FROM routes r
WHERE s.route_id IS NULL 
  AND s.branch_id = r.branch_id 
  AND s.route_name = r.route_name;

-- 6. Verify data before dropping columns (Manual check recommended, skipping DROP in this script for safety first)
-- We will drop columns in a separate step after code update verification.

COMMIT;
