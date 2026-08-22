-- Spray programmes v2 (React rebuild). A product catalog (global BCF reference +
-- user-added), named per-system programmes bundling scheduled products, and an
-- application logbook. Nullable phi_days/reentry_hours/resistance_group and
-- operator are compliance-ready placeholders for a later phase. system_id is
-- VARCHAR to match systems.id. Legacy spray_programmes/spray_applications tables
-- are left untouched.

CREATE TABLE IF NOT EXISTS spray_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  user_id INT NULL,
  category VARCHAR(40) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  active_ingredient TEXT,
  target TEXT,
  default_rate VARCHAR(255),
  interval_days INT,
  fish_safety ENUM('safe','caution','toxic') NOT NULL DEFAULT 'caution',
  fish_note VARCHAR(255),
  compatibility_notes TEXT,
  phi_days INT NULL,
  reentry_hours INT NULL,
  resistance_group VARCHAR(40) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spray_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system (system_id),
  CONSTRAINT fk_spray_plans_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spray_plan_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  product_id INT NOT NULL,
  rate VARCHAR(255) NULL,
  days VARCHAR(40) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_plan_product (plan_id, product_id),
  INDEX idx_plan (plan_id),
  CONSTRAINT fk_spp_plan FOREIGN KEY (plan_id) REFERENCES spray_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_spp_product FOREIGN KEY (product_id) REFERENCES spray_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spray_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(255) NOT NULL,
  plan_id INT NULL,
  product_id INT NULL,
  product_name VARCHAR(255) NULL,
  application_date DATE NOT NULL,
  rate VARCHAR(255) NULL,
  amount VARCHAR(120) NULL,
  area VARCHAR(120) NULL,
  dilution VARCHAR(255) NULL,
  weather VARCHAR(120) NULL,
  effectiveness INT NULL,
  operator VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_system (system_id),
  INDEX idx_plan (plan_id),
  CONSTRAINT fk_spray_log_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
