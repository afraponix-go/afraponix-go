-- Allow sharing a FARM with someone who has no account yet — the same
-- no-account invite flow system_shares got in 2026-09-share-invite-by-email.sql,
-- ported to farm_shares (this file was missed at the time; farm-sharing kept
-- requiring an existing account until now).
ALTER TABLE farm_shares MODIFY COLUMN shared_with_id INT NULL;
ALTER TABLE farm_shares ADD COLUMN IF NOT EXISTS shared_with_email VARCHAR(255) DEFAULT NULL;
