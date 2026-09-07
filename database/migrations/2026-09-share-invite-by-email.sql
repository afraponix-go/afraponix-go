-- Allow sharing a system with someone who has no account yet: a pending invite
-- is stored by email (shared_with_id NULL) and linked to the user when they sign
-- up with that email.
ALTER TABLE system_shares MODIFY COLUMN shared_with_id INT NULL;
ALTER TABLE system_shares ADD COLUMN IF NOT EXISTS shared_with_email VARCHAR(255) DEFAULT NULL;
