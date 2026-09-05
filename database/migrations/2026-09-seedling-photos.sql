-- Let batch_photos also hold nursery (seedling) photos, which are farm-level and
-- have no system yet. A photo is keyed either by (system_id, batch_id) for a bed
-- batch, or by seedling_batch_id (+ farm_id) for a nursery batch.
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS seedling_batch_id INT DEFAULT NULL;
ALTER TABLE batch_photos ADD COLUMN IF NOT EXISTS farm_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE batch_photos MODIFY COLUMN system_id VARCHAR(255) NULL;
ALTER TABLE batch_photos ADD INDEX IF NOT EXISTS idx_seedling (seedling_batch_id);
