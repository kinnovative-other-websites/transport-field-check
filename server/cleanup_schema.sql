-- Transaction start
BEGIN;

-- 1. Create Indexes for new Foreign Keys (Performance)
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_vehicle_id ON students(vehicle_id);

-- 2. Drop old text columns
-- We use IF EXISTS to avoid errors if they are already gone or were never there
ALTER TABLE students DROP COLUMN IF EXISTS branch_name;
ALTER TABLE students DROP COLUMN IF EXISTS route_name;
ALTER TABLE students DROP COLUMN IF EXISTS vehicle_name;

-- 3. Update existing indexes that might depend on old columns
-- (Optional: checking if any old indexes need to be dropped/replaced)
DROP INDEX IF EXISTS idx_students_branch;
DROP INDEX IF EXISTS idx_students_branch_route;
DROP INDEX IF EXISTS idx_students_branch_pending;

-- Re-create performance indexes using IDs
CREATE INDEX IF NOT EXISTS idx_students_branch_pending ON students (branch_id) WHERE latitude IS NULL;

COMMIT;
