-- Phase 0 of the Operator Access plan (see the "Operator Access" proposal):
-- schema plumbing for a restricted, per-system 'operator' share level scoped to
-- logging + scanning. Nothing here is user-visible yet — 'operator' isn't
-- offered anywhere in the sharing UI until Phase 1.
--
-- Attribution: who recorded this entry. batch_photos already has recorded_by;
-- fish_events already has user_id on every write. These three write paths had
-- neither — without this, "an operator logged it" can never mean "who".
ALTER TABLE nutrient_readings ADD COLUMN IF NOT EXISTS recorded_by INT DEFAULT NULL;
ALTER TABLE fish_health ADD COLUMN IF NOT EXISTS recorded_by INT DEFAULT NULL;
ALTER TABLE plant_growth ADD COLUMN IF NOT EXISTS recorded_by INT DEFAULT NULL;
