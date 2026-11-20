-- "Request access" from a scanned QR label that belongs to a farm the user can't
-- see. The request is stored with a random token; the farm's owner and admins are
-- emailed a link to a review page where an authenticated admin approves (granting
-- a farm or system share) or declines. The token alone grants nothing — approving
-- requires being signed in as someone who can manage that farm's sharing.
CREATE TABLE IF NOT EXISTS access_requests (
  id INT NOT NULL AUTO_INCREMENT,
  token CHAR(64) NOT NULL,
  requester_id INT NOT NULL,
  farm_id VARCHAR(255) NOT NULL,
  system_id VARCHAR(255) DEFAULT NULL,
  message VARCHAR(300) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  decided_by INT DEFAULT NULL,
  decided_at TIMESTAMP NULL DEFAULT NULL,
  granted_level VARCHAR(50) DEFAULT NULL,
  granted_scope VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_access_request_token (token),
  INDEX idx_access_requests_requester (requester_id, created_at),
  INDEX idx_access_requests_farm (farm_id, status),
  CONSTRAINT fk_access_requests_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
