-- Dosing programme targets carry the amount to dose (auto-calculated from the
-- calculator, confirmed by the user). Stored per target on programme_items.
ALTER TABLE programme_items
  ADD COLUMN IF NOT EXISTS dose_amount DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS dose_unit   VARCHAR(8) NULL;
