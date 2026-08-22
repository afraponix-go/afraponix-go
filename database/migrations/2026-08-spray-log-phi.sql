-- Snapshot the pre-harvest interval (days) on each application so a "safe to
-- harvest from" date can be computed even if the product's PHI later changes.
ALTER TABLE spray_log ADD COLUMN IF NOT EXISTS phi_days INT NULL;
