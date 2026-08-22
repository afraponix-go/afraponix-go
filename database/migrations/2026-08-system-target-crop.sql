-- Optional per-system "primary reference crop" for dashboard nutrient scoring.
-- When a row exists, the dashboard scores readings against just this crop+stage;
-- when absent, it falls back to the auto "most-demanding across planted crops"
-- mode. One row per system. system_id is VARCHAR to match systems.id.
CREATE TABLE IF NOT EXISTS system_target_crop (
  system_id VARCHAR(255) NOT NULL PRIMARY KEY,
  crop_code VARCHAR(50) NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'vegetative',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_system_target_crop_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
