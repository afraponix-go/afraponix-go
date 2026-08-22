-- Per-system crop nutrient target overrides. A system can override the global
-- default targets (crop_nutrient_targets) for any crop + growth stage; the
-- calculator and crops UI resolve override -> default -> none. Stores the six
-- elemental ppm targets directly (an operator may tune any nutrient for their
-- own system). system_id is VARCHAR to match systems.id.
CREATE TABLE IF NOT EXISTS system_crop_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(255) NOT NULL,
  crop_code VARCHAR(50) NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'vegetative',
  target_n DECIMAL(10,3) NULL,
  target_p DECIMAL(10,3) NULL,
  target_k DECIMAL(10,3) NULL,
  target_ca DECIMAL(10,3) NULL,
  target_mg DECIMAL(10,3) NULL,
  target_fe DECIMAL(10,3) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_system_crop_stage (system_id, crop_code, stage),
  INDEX idx_system (system_id),
  CONSTRAINT fk_system_crop_targets_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
