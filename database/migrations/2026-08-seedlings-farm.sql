-- Seedlings become farm-level: a farm has one seedling bay (nursery), and a
-- batch is transplanted into any system in that farm. Add farm_id, backfill it
-- from each batch's system's farm, and relax system_id (now only set on
-- transplant, to record the destination system).
ALTER TABLE seedling_batches ADD COLUMN IF NOT EXISTS farm_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE seedling_batches ADD INDEX IF NOT EXISTS idx_seedlings_farm (farm_id);
ALTER TABLE seedling_batches MODIFY system_id VARCHAR(255) NULL;
UPDATE seedling_batches sb
   JOIN systems s ON s.id = sb.system_id
    SET sb.farm_id = s.farm_id
  WHERE sb.farm_id IS NULL AND s.farm_id IS NOT NULL;
