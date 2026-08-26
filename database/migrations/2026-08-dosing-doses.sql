-- Finite dosing: a dosing target can carry `doses` = the number of weekly doses
-- to safely reach target (from the calculator's weeks-to-target). The calendar
-- schedules that many occurrences then stops. NULL = perpetual (repeats weekly).
ALTER TABLE programme_items ADD COLUMN IF NOT EXISTS doses INT DEFAULT NULL;
