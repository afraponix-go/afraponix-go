// Storage Constants
// localStorage keys and storage configuration

export const STORAGE_KEYS = {
  ACTIVESYSTEMID: 'activeSystemId',
  AQUAPONICSSETTINGS: 'aquaponicsSettings',
  AUTH_TOKEN: 'auth_token',
  CUSTOM_NUTRIENTS: 'custom_nutrients',
  DASHBOARDMETRICPREFERENCES: 'dashboardMetricPreferences',
  HASSEENSYSTEMMODAL: 'hasSeenSystemModal',
  JUSTVERIFIEDEMAIL: 'justVerifiedEmail',
  SPRAY_PROGRAMMES: 'spray_programmes',
  TOKEN: 'token',
};

export const STORAGE_CONFIG = {
  VERSION: '1.0',
  PREFIX: 'afraponix_',
  EXPIRY_DAYS: 30,
  MAX_SIZE: 5 * 1024 * 1024 // 5MB
};

export const CACHE_KEYS = {
  SYSTEM_DATA: 'system_data',
  USER_PREFERENCES: 'user_preferences',
  CHART_DATA: 'chart_data',
  FORM_DATA: 'form_data'
};
