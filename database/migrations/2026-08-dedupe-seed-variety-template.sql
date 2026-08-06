-- One-time cleanup: collapse duplicate template seed varieties.
--
-- The "Seed variety data" bootstrap step re-seeded the template rows
-- (user_id IS NULL) on every deploy. Once the unique key became per-user
-- (user_id, crop_type, variety_name), those NULL-user rows were no longer
-- deduped by the DB (SQL treats NULL as distinct), so they accumulated one copy
-- per deploy. Bootstrap now tracks applied steps so this can't recur; this
-- collapses the existing duplicates to a single row per (crop_type, variety_name).
--
-- Idempotent: a no-op once the template holds one row per variety. Only touches
-- template rows (user_id IS NULL) — per-user lists are untouched.
DELETE t1 FROM seed_varieties t1
INNER JOIN seed_varieties t2
  ON t1.user_id IS NULL
 AND t2.user_id IS NULL
 AND t1.crop_type = t2.crop_type
 AND t1.variety_name = t2.variety_name
 AND t1.id > t2.id;
