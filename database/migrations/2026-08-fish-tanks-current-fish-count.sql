-- fish_tanks.current_fish_count was added to the app long ago (fish-inventory
-- reads and writes it for stocking, mortality and moving fish, and both demo
-- creators insert it) but was never added to init-mariadb's CREATE TABLE. So a
-- freshly bootstrapped database lacked the column, breaking fish operations and
-- demo-system creation ("Unknown column 'current_fish_count'"). Add it for
-- existing databases; new ones get it from the updated schema.
ALTER TABLE fish_tanks
  ADD COLUMN IF NOT EXISTS current_fish_count INT NOT NULL DEFAULT 0 AFTER fish_type;
