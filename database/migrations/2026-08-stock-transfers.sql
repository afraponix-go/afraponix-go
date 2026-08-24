-- Farm layer (Phase 3): an audit log of stock moved between systems (and farms).
-- Fish moves and plant-batch transfers each write a row here; the actual stock
-- changes are still event-sourced in fish_events / plant_growth. See
-- FARM_LAYER_PLAN.md.
CREATE TABLE IF NOT EXISTS stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(10) NOT NULL,               -- 'fish' | 'plant'
  from_system_id VARCHAR(255) NOT NULL,
  to_system_id VARCHAR(255) NOT NULL,
  from_ref VARCHAR(120) NULL,              -- source tank id / source batch_id
  to_ref VARCHAR(120) NULL,                -- dest tank id / new batch_id
  from_bed_id INT NULL,
  to_bed_id INT NULL,
  label VARCHAR(120) NULL,                 -- species or crop, for readability
  count INT NULL,
  notes TEXT NULL,
  moved_by INT NULL,
  moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transfers_from (from_system_id),
  INDEX idx_transfers_to (to_system_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
