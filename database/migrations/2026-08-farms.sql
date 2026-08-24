-- Farm layer (Phase 1): a Farm owns aquaponics systems. A user can own several
-- farms; each system belongs to one farm. Sharing stays per-system for now
-- (system_shares unchanged) — a farm owner reaches all their systems because
-- they own the farm. See FARM_LAYER_PLAN.md.
CREATE TABLE IF NOT EXISTS farms (
  id VARCHAR(255) NOT NULL,
  owner_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_farms_owner (owner_id),
  CONSTRAINT fk_farms_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link systems to their farm. Nullable through the backfill; the app then keeps
-- it populated (backfill migration + system creation). No FK constraint — this
-- matches the codebase's loose-reference style (e.g. grow_bed_id) and keeps the
-- migration trivially idempotent; the app guarantees the reference.
ALTER TABLE systems ADD COLUMN IF NOT EXISTS farm_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE systems ADD INDEX IF NOT EXISTS idx_systems_farm (farm_id);
