-- Record sprays against a scope (whole system or a specific grow bed) and store
-- quantity and dilution as proper numbers (value + unit), not free text. The old
-- text amount/area/dilution columns are left in place but no longer written.
ALTER TABLE spray_log
  ADD COLUMN IF NOT EXISTS grow_bed_id INT NULL,
  ADD COLUMN IF NOT EXISTS bed_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS dilution_value DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS dilution_unit VARCHAR(12) NULL;
