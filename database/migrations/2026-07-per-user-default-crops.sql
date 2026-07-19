-- Migration: give every user their own editable copy of the default crops.
-- Date: 2026-07-19
--
-- The global `crops` table remains the shared default template (and the
-- nutrient-calculator reference). Each user gets a per-user copy of those
-- crops in `custom_crops`, which they can edit/delete without affecting other
-- users. custom_crops is extended to hold the full crop data.

-- 1. Extend custom_crops to carry the full crop fields.
ALTER TABLE custom_crops
  ADD COLUMN IF NOT EXISTS crop_code VARCHAR(50) AFTER crop_name,
  ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(150) AFTER crop_code,
  ADD COLUMN IF NOT EXISTS ec_min DECIMAL(5,2) AFTER target_ec,
  ADD COLUMN IF NOT EXISTS ec_max DECIMAL(5,2) AFTER ec_min;

CREATE INDEX IF NOT EXISTS idx_custom_crops_user_code ON custom_crops(user_id, crop_code);

-- 2. Seed every user with a copy of each active default crop they don't have.
--    Idempotent: skips crops the user already has (by crop_code).
INSERT INTO custom_crops
  (user_id, crop_code, crop_name, scientific_name, category, plant_spacing, growth_days, target_ec, ec_min, ec_max)
SELECT u.id, c.code, c.name, c.scientific_name, cat.code, c.plant_spacing_cm, c.days_to_harvest,
       ROUND((c.default_ec_min + c.default_ec_max) / 2, 2), c.default_ec_min, c.default_ec_max
FROM users u
CROSS JOIN crops c
LEFT JOIN crop_categories cat ON c.category_id = cat.id
WHERE c.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM custom_crops x WHERE x.user_id = u.id AND x.crop_code = c.code
  );
