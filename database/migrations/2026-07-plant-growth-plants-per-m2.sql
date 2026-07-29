-- Capture the planting density (plants per m²) on each planting event, so the
-- area a batch consumes is exact per crop rather than a flat 20×20 cm guess.
-- Defaulted from the crop's spacing in the UI, but user-editable per planting.
ALTER TABLE plant_growth
  ADD COLUMN IF NOT EXISTS plants_per_m2 DECIMAL(8,2) NULL AFTER count;
