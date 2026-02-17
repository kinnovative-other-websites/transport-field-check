-- ══ Performance indexes for transport-field-check ══
-- Run this on your production DB:
--   psql -d transport_field -f migrate.sql

-- Index on student_code (used in UPDATE WHERE, log-location, clear-selected)
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students (student_code);

-- Index on branch_name (used in all student list queries)
CREATE INDEX IF NOT EXISTS idx_students_branch ON students (branch_name);

-- Composite index for branch + route (used in /api/students/:branch/:route)
CREATE INDEX IF NOT EXISTS idx_students_branch_route ON students (branch_name, route_name);

-- Composite index for branch + pending filter (latitude IS NULL queries)
CREATE INDEX IF NOT EXISTS idx_students_branch_pending ON students (branch_name) WHERE latitude IS NULL;

-- Verify indexes
\di students*
