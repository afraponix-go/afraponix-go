-- Reconcile columns the app reads/writes that were added to older databases via
-- ad-hoc ALTERs but never made it into init-mariadb's CREATE TABLEs. A freshly
-- bootstrapped database (e.g. production) therefore lacked them and threw
-- "Unknown column …" as each feature was exercised (fish overview, fish health,
-- nutrient import). Found by diffing the working dev schema against production.
-- Idempotent: ADD COLUMN IF NOT EXISTS is a no-op where the column already exists.
--
-- (Deliberately NOT recreating water_quality_archived — a one-off 2025 archive
-- table the current app never queries; it only appears in a delete-path comment.)
ALTER TABLE fish_tanks        ADD COLUMN IF NOT EXISTS max_stocking_density DECIMAL(8,2) NULL AFTER current_fish_count;
ALTER TABLE fish_health       ADD COLUMN IF NOT EXISTS feed_type VARCHAR(50) NULL;
ALTER TABLE nutrient_readings ADD COLUMN IF NOT EXISTS import_session_id VARCHAR(255) NULL;
ALTER TABLE users             ADD COLUMN IF NOT EXISTS role VARCHAR(50) NULL DEFAULT 'user';
