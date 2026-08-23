-- Structured application/dose rate on products: amount + unit (ml/g/L/kg) per a
-- volume in litres — e.g. 100 ml per 10 L — instead of free text. The existing
-- default_rate stays as a derived display string so the record modal / calendar
-- (which read it as a hint) keep working unchanged.
ALTER TABLE spray_products
  ADD COLUMN IF NOT EXISTS rate_amount     DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS rate_unit       VARCHAR(8) NULL,
  ADD COLUMN IF NOT EXISTS rate_per_volume DECIMAL(10,3) NULL;
