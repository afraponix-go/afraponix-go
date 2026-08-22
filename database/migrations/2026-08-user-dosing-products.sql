-- Per-user fertiliser (dosing) product list. Stored as a JSON array of
-- {name,n,p,k,ca,mg,fe}. NULL/absent row = the user hasn't customised, so the
-- app shows the defaults.
CREATE TABLE IF NOT EXISTS user_dosing_products (
  user_id INT NOT NULL PRIMARY KEY,
  products TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
