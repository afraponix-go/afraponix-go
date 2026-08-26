// API Constants
// All API endpoints and related configuration

export const API_ENDPOINTS = {
  CONFIG_SEND_EMAIL: '/api/config/send-email',
  CROP_KNOWLEDGE_ADMIN_CROPS: '/api/crop-knowledge/admin/crops',
  CROP_KNOWLEDGE_ADMIN_ENVIRONMENTAL_ADJUSTMENTS: '/api/crop-knowledge/admin/environmental-adjustments',
  CROP_KNOWLEDGE_ADMIN_RATIO_RULES: '/api/crop-knowledge/admin/ratio-rules',
  CROP_KNOWLEDGE_CROPS: '/api/crop-knowledge/crops',
  CROP_KNOWLEDGE_NUTRIENTS: '/api/crop-knowledge/nutrients',
  CROP_KNOWLEDGE_STAGES: '/api/crop-knowledge/stages',
  SEED_VARIETIES: '/api/seed-varieties',
};

export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};
