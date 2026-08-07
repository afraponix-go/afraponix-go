-- Columns the CSV importer writes but the schema lacked, so imports failed with
-- "Unknown column 'source'" and undo could only clean nutrient_readings:
--   water_quality.source            — source attribution (manual/import/sensor)
--   water_quality.import_session_id — lets undo remove imported water rows
--   fish_health.import_session_id   — lets undo remove imported fish-health rows
-- Idempotent (ADD COLUMN IF NOT EXISTS).
ALTER TABLE water_quality ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' AFTER notes;
ALTER TABLE water_quality ADD COLUMN IF NOT EXISTS import_session_id VARCHAR(255) DEFAULT NULL AFTER source;
ALTER TABLE fish_health   ADD COLUMN IF NOT EXISTS import_session_id VARCHAR(255) DEFAULT NULL AFTER notes;
