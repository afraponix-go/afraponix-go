-- Farm sharing: share a whole farm with another user, granting them access to
-- every system in that farm (present and future) at a chosen permission level.
-- Mirrors system_shares; like system sharing, an invite is granted immediately
-- (status 'accepted') — there is no separate accept step. Owner-only actions
-- (delete/rename the farm, manage sharing) stay with farms.owner_id.
CREATE TABLE IF NOT EXISTS farm_shares (
  id INT NOT NULL AUTO_INCREMENT,
  farm_id VARCHAR(255) NOT NULL,
  owner_id INT NOT NULL,
  shared_with_id INT NOT NULL,
  permission_level VARCHAR(50) NOT NULL DEFAULT 'view',
  status VARCHAR(50) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_farm_share (farm_id, shared_with_id),
  INDEX idx_farm_shares_farm (farm_id),
  INDEX idx_farm_shares_user (shared_with_id),
  CONSTRAINT fk_farm_shares_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_farm_shares_user FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
