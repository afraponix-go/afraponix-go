-- Terms & conditions acceptance, tracked per user. terms_version is the accepted
-- version string; NULL (or an older version than the app's current) means the
-- user must accept before using the app.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT NULL AFTER verification_code;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME DEFAULT NULL AFTER terms_version;
