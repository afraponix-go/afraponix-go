-- Sign in with Google. google_id holds the Google account's stable subject id
-- ("sub"); it's set when a user links or is created via Google. password_hash
-- becomes nullable so Google-only accounts (no password) are valid.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL AFTER password_hash;
ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS idx_users_google_id (google_id);
ALTER TABLE users MODIFY COLUMN password_hash TEXT NULL;
