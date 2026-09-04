-- Seedling batches get a human batch number in the growers' "WW/YY · Label"
-- convention (same as plant batches). Bed plantings transplanted from a batch
-- inherit it with a "-1", "-2"… split suffix, so a planting is always traceable
-- back to the nursery batch it came from.
ALTER TABLE seedling_batches ADD COLUMN IF NOT EXISTS batch_number VARCHAR(120) DEFAULT NULL;
-- Room for the new 'partially_transplanted' status (old column was VARCHAR(20)).
ALTER TABLE seedling_batches MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'sown';
