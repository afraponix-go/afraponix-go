// Configuration Constants
// Application settings and magic numbers

export const MAGIC_NUMBERS = {
  MEDIUM_24: 24, // Used 226 times
  MEDIUM_16: 16, // Used 199 times
  MEDIUM_10: 10, // Used 182 times
  MEDIUM_14: 14, // Used 156 times
  MEDIUM_15: 15, // Used 140 times
  VERY_LARGE_1K: 1000, // Used 136 times
  MEDIUM_12: 12, // Used 132 times
  MEDIUM_60: 60, // Used 124 times
  MEDIUM_30: 30, // Used 107 times
  MEDIUM_20: 20, // Used 85 times
  MEDIUM_13: 13, // Used 80 times
  MEDIUM_18: 18, // Used 79 times
  MEDIUM_25: 25, // Used 73 times
  MEDIUM_17: 17, // Used 68 times
  MEDIUM_40: 40, // Used 61 times
  VERY_LARGE_2K: 2000, // Used 60 times
  MEDIUM_50: 50, // Used 59 times
  LARGE_666: 666, // Used 57 times
  MEDIUM_21: 21, // Used 56 times
  MEDIUM_11: 11, // Used 51 times
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please log in again.',
  PERMISSION_DENIED: 'Permission denied. Contact administrator.',
  DATA_NOT_FOUND: 'Requested data not found.',
  VALIDATION_ERROR: 'Validation error. Please check your input.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  SAVE_FAILED: 'Failed to save data. Please try again.',
  DELETE_FAILED: 'Failed to delete item. Please try again.',
  UPDATE_FAILED: 'Failed to update data. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred.'
};

export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Data saved successfully!',
  UPDATE_SUCCESS: 'Updated successfully!',
  DELETE_SUCCESS: 'Deleted successfully!',
  CREATE_SUCCESS: 'Created successfully!'
};

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_INPUT_LENGTH: 255,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^[\+]?[1-9][\d]{0,15}$/
};

export const DEFAULT_CONFIG = {
  ITEMS_PER_PAGE: 10,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  AUTO_SAVE_INTERVAL: 30 * 1000 // 30 seconds
};
