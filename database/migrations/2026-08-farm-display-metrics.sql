-- Farm reporting: which per-system metric columns the farm overview shows. A
-- JSON array of water/nutrient reading keys (e.g. ["ph","ec","nitrate"]); NULL
-- means the default set. Per-farm so different farms can track different things.
ALTER TABLE farms ADD COLUMN IF NOT EXISTS display_metrics TEXT DEFAULT NULL;
