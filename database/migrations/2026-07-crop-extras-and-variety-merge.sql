-- Migration: add Celery, Leeks and Spring Onion as reference crops, and merge
-- the legacy lettuce-cultivar seed-variety groups back under 'lettuce'.
-- Date: 2026-07-19
--
-- The old app let users store seed varieties under free-text crop_type strings,
-- which produced orphan "crops" on the Crops tab (celery, leeks, spring onion)
-- and split lettuce varieties across lettuce_batavian/butter/cos/icty groups.

-- 1. Add the three missing reference crops (idempotent on the unique code).
INSERT IGNORE INTO crops
  (code, name, scientific_name, category_id, default_ec_min, default_ec_max, default_ph_min, default_ph_max, days_to_harvest, plant_spacing_cm, light_requirements, is_active, research_source)
VALUES
  ('celery',       'Celery',       'Apium graveolens',    1, 1.80, 2.40, 6.0, 6.8, 100, 20, 'high', 1, 'FAO aquaponics + hydroponic horticulture standards'),
  ('leeks',        'Leeks',        'Allium ampeloprasum', 1, 1.40, 1.80, 6.0, 7.0, 120, 15, 'high', 1, 'FAO aquaponics + hydroponic horticulture standards'),
  ('spring_onion', 'Spring Onion', 'Allium fistulosum',   1, 1.00, 1.80, 6.0, 7.0,  60,  5, 'high', 1, 'FAO aquaponics + hydroponic horticulture standards');

-- 2. Merge lettuce cultivar variety groups under 'lettuce'.
--    a. drop an obvious junk entry
DELETE FROM seed_varieties WHERE crop_type LIKE 'lettuce\_%' AND variety_name = 'test';
--    b. delete cultivar varieties whose name already exists under 'lettuce'
--       (avoids the (crop_type, variety_name) unique-key collision on re-parent)
DELETE sv FROM seed_varieties sv
  JOIN seed_varieties l ON l.crop_type = 'lettuce' AND l.variety_name = sv.variety_name
  WHERE sv.crop_type IN ('lettuce_batavian', 'lettuce_butter', 'lettuce_cos', 'lettuce_icty');
--    c. re-parent the remaining cultivar varieties to 'lettuce'
UPDATE seed_varieties SET crop_type = 'lettuce'
  WHERE crop_type IN ('lettuce_batavian', 'lettuce_butter', 'lettuce_cos', 'lettuce_icty');
