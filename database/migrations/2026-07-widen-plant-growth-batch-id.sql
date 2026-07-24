-- Migration: widen plant_growth.batch_id from VARCHAR(50) to VARCHAR(100).
-- Date: 2026-07-24
--
-- The demo importer stores a composite batch id, `<system_id>_<source_batch_id>`.
-- Once system ids became random UUIDs (`system_<uuid>`, ~43 chars) instead of
-- `system_<timestamp>` (~20 chars), that composite overflowed the 50-char column
-- and demo creation failed with ER_DATA_TOO_LONG. The sibling batch_id columns
-- on fish_inventory and fish_events are already VARCHAR(100); this aligns
-- plant_growth with them. Widening never truncates existing data.

ALTER TABLE plant_growth
  MODIFY COLUMN batch_id VARCHAR(100);
