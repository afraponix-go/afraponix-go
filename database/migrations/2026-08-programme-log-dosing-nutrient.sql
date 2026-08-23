-- Dosing log needs to record which nutrient a dose targeted (its before/after
-- readings are that nutrient's ppm). Spray/operating rows leave it NULL.
ALTER TABLE programme_log
  ADD COLUMN IF NOT EXISTS target_nutrient VARCHAR(16) NULL;
