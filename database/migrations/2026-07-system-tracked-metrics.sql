-- Migration: let each system choose which water/nutrient metrics it tracks.
-- Date: 2026-07-26
--
-- tracked_metrics holds a JSON array of metric keys (e.g. ["ph","temperature"]).
-- NULL means "track everything" — the default, so existing systems are
-- unaffected and keep showing all metrics on the dashboard and capture form.

ALTER TABLE systems
  ADD COLUMN IF NOT EXISTS tracked_metrics TEXT DEFAULT NULL;
