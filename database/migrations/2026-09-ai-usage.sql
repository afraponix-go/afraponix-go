-- Per-user AI usage ledger — one row per successful analysis call. Used to
-- enforce a rolling weekly cap (default 10 / 7 days per user) so API cost stays
-- bounded.
CREATE TABLE IF NOT EXISTS ai_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_kind_time (user_id, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
