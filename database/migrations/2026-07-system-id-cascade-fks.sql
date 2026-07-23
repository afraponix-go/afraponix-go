-- Migration: let the database clean up after a deleted system.
-- Date: 2026-07-23
--
-- Most tables that reference a system already have an ON DELETE CASCADE foreign
-- key, so they empty themselves when the system row goes. Six tables carried a
-- system_id with no foreign key at all, so every system deletion leaked orphaned
-- rows (found 643 of them, from test systems deleted back in 2025). Add the
-- missing constraints so this is enforced by the schema rather than by the
-- delete endpoint remembering to do it.
--
-- Safe to run on a database that still has orphans: step 1 clears them first,
-- otherwise the constraints in step 3 would be rejected.

-- 1. Remove rows pointing at a system that no longer exists.
--    Only rows with a non-NULL system_id are orphans; a NULL system_id means
--    "not tied to a system" (nutrient_deficiency_images uses this for its global
--    reference library) and must be kept.
DELETE t FROM fish_events t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

DELETE t FROM fish_harvest t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

DELETE t FROM fish_inventory t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

DELETE t FROM nutrient_readings t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

DELETE t FROM nutrient_deficiency_images t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

DELETE t FROM import_history t
  LEFT JOIN systems s ON t.system_id = s.id
  WHERE t.system_id IS NOT NULL AND s.id IS NULL;

-- 2. systems.id is VARCHAR(255); widen the one column that disagreed so the
--    foreign key matches exactly. Longest id in use is 20 chars, so this is
--    lossless. The column stays NULL-able — its NULL rows are the global
--    deficiency-image library, which a foreign key permits.
ALTER TABLE nutrient_deficiency_images
  MODIFY COLUMN system_id VARCHAR(255) NULL;

-- 3. Add the cascading foreign keys.
ALTER TABLE fish_events
  ADD CONSTRAINT fk_fish_events_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE fish_harvest
  ADD CONSTRAINT fk_fish_harvest_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE fish_inventory
  ADD CONSTRAINT fk_fish_inventory_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE nutrient_readings
  ADD CONSTRAINT fk_nutrient_readings_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE nutrient_deficiency_images
  ADD CONSTRAINT fk_deficiency_images_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE import_history
  ADD CONSTRAINT fk_import_history_system
  FOREIGN KEY IF NOT EXISTS (system_id) REFERENCES systems(id) ON DELETE CASCADE;
