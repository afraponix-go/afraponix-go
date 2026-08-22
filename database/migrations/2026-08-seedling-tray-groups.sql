-- A sowing can mix tray sizes (e.g. 2×200 + 2×128 + 1×40). Store the groups as
-- JSON; trays/cells_per_tray remain a summary (total tray count; single cell
-- size or NULL when mixed).
ALTER TABLE seedling_batches ADD COLUMN IF NOT EXISTS tray_groups TEXT NULL;
ALTER TABLE seedling_batches MODIFY COLUMN cells_per_tray INT NULL;
