-- Soft-delete for farms: "deleting" a farm archives it (hidden from the app,
-- its systems hidden too) so it can be restored. A separate "delete permanently"
-- action does the real cascade. archived_at NULL = live.
ALTER TABLE farms ADD COLUMN IF NOT EXISTS archived_at DATETIME DEFAULT NULL;
