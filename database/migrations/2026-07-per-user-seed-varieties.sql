-- Migration: make seed varieties per-user (isolated like crops).
-- Date: 2026-07-19
--
-- seed_varieties was a single global list shared by all users. Add user_id so
-- each user has their own editable variety list. Existing rows (user_id NULL)
-- become the default template; every user is seeded with a copy.

-- 1. Add owner column.
ALTER TABLE seed_varieties ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id;
CREATE INDEX IF NOT EXISTS idx_seed_varieties_user_crop ON seed_varieties(user_id, crop_type);

-- 2. Swap the unique constraint to be per-user.
ALTER TABLE seed_varieties DROP INDEX IF EXISTS unique_crop_variety;
ALTER TABLE seed_varieties ADD UNIQUE KEY IF NOT EXISTS unique_user_crop_variety (user_id, crop_type, variety_name);

-- 3. Seed every user with a copy of the template (user_id IS NULL) varieties.
--    Idempotent: skips varieties the user already has.
INSERT INTO seed_varieties (user_id, crop_type, variety_name)
SELECT u.id, sv.crop_type, sv.variety_name
FROM users u CROSS JOIN seed_varieties sv
WHERE sv.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM seed_varieties x
    WHERE x.user_id = u.id AND x.crop_type = sv.crop_type AND x.variety_name = sv.variety_name
  );
