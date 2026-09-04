-- Crop photos attached to a batch (by system + batch_id). Used for a visual
-- timeline and, later, deficiency / growth analysis. Files live on disk under
-- images/batch-photos/<systemId>/ and are served statically; this table is the
-- index. analysis holds a JSON string of any future vision results.
CREATE TABLE IF NOT EXISTS batch_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(255) NOT NULL,
  batch_id VARCHAR(120) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  crop_type VARCHAR(100) NULL,
  taken_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by INT NULL,
  notes TEXT NULL,
  analysis LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch (system_id, batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
