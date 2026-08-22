-- Seedling (nursery) tracking: batches raised in trays before transplanting into
-- a grow bed. Predicted germination/transplant days prefill from the crop.
ALTER TABLE custom_crops ADD COLUMN IF NOT EXISTS germination_days INT NULL;
ALTER TABLE custom_crops ADD COLUMN IF NOT EXISTS days_to_transplant INT NULL;

CREATE TABLE IF NOT EXISTS seedling_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(255) NOT NULL,
  crop_code VARCHAR(50) NULL,
  crop_name VARCHAR(120) NULL,
  seed_variety VARCHAR(120) NULL,
  sow_date DATE NOT NULL,
  trays INT NOT NULL DEFAULT 1,
  cells_per_tray INT NOT NULL DEFAULT 128,
  predicted_germ_days INT NULL,
  predicted_transplant_days INT NULL,
  germination_date DATE NULL,
  germinated_count INT NULL,
  transplant_date DATE NULL,
  transplanted_count INT NULL,
  grow_bed_id INT NULL,
  plant_batch_id VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sown',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system (system_id),
  CONSTRAINT fk_seedling_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
