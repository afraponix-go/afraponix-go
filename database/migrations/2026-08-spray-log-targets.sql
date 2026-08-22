-- A spray application can cover multiple grow beds (or the whole system). Each
-- bed sprayed — and the plant batches growing in it at the time — is recorded in
-- spray_log_targets, snapshotting bed name / batch / crop so the traceability
-- survives later bed or planting changes. scope on spray_log records whether the
-- application was the whole system or specific beds.
ALTER TABLE spray_log ADD COLUMN IF NOT EXISTS scope VARCHAR(12) NULL;

CREATE TABLE IF NOT EXISTS spray_log_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id INT NOT NULL,
  grow_bed_id INT NULL,
  bed_name VARCHAR(255) NULL,
  batch_id VARCHAR(100) NULL,
  crop_type VARCHAR(100) NULL,
  INDEX idx_log (log_id),
  CONSTRAINT fk_slt_log FOREIGN KEY (log_id) REFERENCES spray_log(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
