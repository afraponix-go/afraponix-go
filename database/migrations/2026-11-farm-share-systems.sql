-- A farm share can be limited to chosen systems. Default (all_systems = 1) keeps
-- today's behaviour: access to every system in the farm, including ones added
-- later. all_systems = 0 means ONLY the systems listed in farm_share_systems
-- (possibly none — farm-level data like the nursery still follows the share).
-- Existing shares stay "all systems".
ALTER TABLE farm_shares ADD COLUMN IF NOT EXISTS all_systems TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS farm_share_systems (
  share_id INT NOT NULL,
  system_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (share_id, system_id),
  INDEX idx_fss_system (system_id),
  CONSTRAINT fk_fss_share FOREIGN KEY (share_id) REFERENCES farm_shares(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
