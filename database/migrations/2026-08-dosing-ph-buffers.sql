-- pH buffers/acids in the fertiliser catalogue. A buffer has a direction (up /
-- down) and a strength (amount per 1000 L to shift pH by 1 unit, in its rate_unit);
-- its nutrient columns (n/p/k/ca…) hold the nutrient it also adds (e.g. nitric
-- acid → N, KOH → K), so the dosing calc can credit it. ph_direction NULL = a
-- normal fertiliser.
ALTER TABLE dosing_products
  ADD COLUMN IF NOT EXISTS ph_direction VARCHAR(4) NULL,
  ADD COLUMN IF NOT EXISTS ph_strength  DECIMAL(10,3) NULL;
