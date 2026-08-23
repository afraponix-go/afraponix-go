-- Normalise the per-user fertiliser catalogue (previously a JSON blob in
-- user_dosing_products) into real rows, so dosing programmes can reference
-- fertilisers and each carries a structured dose (amount + unit per volume) plus
-- its nutrient content (N/P/K/Ca/Mg/Fe, % or ppm-contribution as the calculator
-- uses them). The old user_dosing_products table is kept (frozen) for rollback.
CREATE TABLE IF NOT EXISTS dosing_products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  name            VARCHAR(120) NOT NULL,
  n  DECIMAL(8,3) NULL, p  DECIMAL(8,3) NULL, k  DECIMAL(8,3) NULL,
  ca DECIMAL(8,3) NULL, mg DECIMAL(8,3) NULL, fe DECIMAL(8,3) NULL,
  rate_amount     DECIMAL(10,3) NULL,
  rate_unit       VARCHAR(8) NULL,
  rate_per_volume DECIMAL(10,3) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_name (user_id, name),
  INDEX idx_user (user_id),
  CONSTRAINT fk_dp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
