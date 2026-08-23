-- Operations Phase 1b — add the spray-specific convenience columns to the
-- unified log so the spray routes are a faithful port (product-id matching for
-- the calendar, single-bed summary for the log view) rather than a behavioural
-- rewrite. These are spray-only; dosing/operating rows leave them NULL.
--
-- Backfill from spray_log for any rows already folded in 1a (ids were preserved,
-- so pl.id = sl.id). Idempotent: IF NOT EXISTS columns + an UPDATE that only
-- fills spray rows.

ALTER TABLE programme_log
  ADD COLUMN IF NOT EXISTS spray_product_id INT NULL,
  ADD COLUMN IF NOT EXISTS grow_bed_id       INT NULL,
  ADD COLUMN IF NOT EXISTS bed_name          VARCHAR(255) NULL;

UPDATE programme_log pl
  JOIN spray_log sl ON sl.id = pl.id
   SET pl.spray_product_id = sl.product_id,
       pl.grow_bed_id      = sl.grow_bed_id,
       pl.bed_name         = sl.bed_name
 WHERE pl.type = 'spray';
