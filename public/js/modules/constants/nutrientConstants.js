// Nutrient Constants
// Contains all nutrient-related constants and configuration

/**
 * Environmental parameters for nutrient calculations
 */
export const ENVIRONMENTAL_PARAMETERS = [
    { code: 'ec', name: 'Electrical Conductivity', unit: 'mS/cm' },
    { code: 'ph', name: 'pH', unit: '' },
    { code: 'temperature', name: 'Temperature', unit: '°C' },
    { code: 'humidity', name: 'Relative Humidity', unit: '%' },
    { code: 'ppfd', name: 'Light Intensity', unit: 'μmol/m²/s' }
];

/**
 * API endpoints for nutrient management
 */
export const API_ENDPOINTS = {
    RATIO_RULES: '/api/crop-knowledge/admin/ratio-rules',
    ENVIRONMENTAL_ADJUSTMENTS: '/api/crop-knowledge/admin/environmental-adjustments',
    NUTRIENTS: '/api/crop-knowledge/nutrients',
    GROWTH_STAGES: '/api/crop-knowledge/stages',
    DEFICIENCY_IMAGES: '/api/crop-knowledge/deficiency-images'
};

/**
 * Default values for nutrient calculations
 */
export const DEFAULTS = {
    RATIO_VALUES: {
        MIN_RATIO: 0.1,
        MAX_RATIO: 10.0,
        DEFAULT_RATIO: 1.0
    },
    ENVIRONMENTAL: {
        MIN_EC: 0.1,
        MAX_EC: 5.0,
        MIN_PH: 4.0,
        MAX_PH: 9.0,
        MIN_TEMPERATURE: 5,
        MAX_TEMPERATURE: 40,
        MIN_HUMIDITY: 20,
        MAX_HUMIDITY: 95,
        MIN_PPFD: 50,
        MAX_PPFD: 2000
    }
};

/**
 * UI element selectors for nutrient management
 */
export const SELECTORS = {
    // Tabs and content
    RATIO_TABS: '.ratio-tab',
    RATIO_CONTENT: '.ratio-content',
    
    // Buttons
    ADD_RATIO_RULE: '#add-ratio-rule-btn',
    ADD_ENV_ADJUSTMENT: '#add-env-adjustment-btn',
    
    // Filters
    RATIO_NUTRIENT_FILTER: '#ratio-nutrient-filter',
    RATIO_STAGE_FILTER: '#ratio-stage-filter',
    
    // Modals
    RATIO_RULE_MODAL: '#ratio-rule-modal',
    ENV_ADJUSTMENT_MODAL: '#env-adjustment-modal',
    COMPREHENSIVE_NUTRIENT_MODAL: '#comprehensive-nutrient-modal',
    
    // Forms
    RATIO_RULE_FORM: '#ratio-rule-form',
    ENV_ADJUSTMENT_FORM: '#env-adjustment-form',
    
    // Dropdown elements
    RULE_NUTRIENT: '#rule-nutrient',
    RULE_GROWTH_STAGE: '#rule-growth-stage',
    DEFICIENCY_NUTRIENT_SELECT: '#deficiency-nutrient-select',
    
    // Display containers
    RATIO_RULES_CONTAINER: '#ratio-rules-container',
    ENV_ADJUSTMENTS_CONTAINER: '#env-adjustments-container',
    DEFICIENCY_IMAGES_CONTAINER: '#deficiency-images-container'
};

/**
 * CSS classes for styling
 */
export const CSS_CLASSES = {
    ACTIVE: 'active',
    BTN_EDIT: 'btn-edit',
    BTN_DELETE: 'btn-delete',
    BTN_EDIT_SMALL: 'btn-edit-small',
    BTN_DELETE_SMALL: 'btn-delete-small',
    BTN_ADD_STAGE: 'btn-add-stage'
};

/**
 * Message types for notifications
 */
export const MESSAGE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * Nutrient calculation formulas and factors
 */
export const CALCULATION_FACTORS = {
    EC_TO_PPM: 640, // Conversion factor from EC (mS/cm) to PPM
    PPM_TO_EC: 0.00156, // Conversion factor from PPM to EC (mS/cm)
    
    // Growth stage multipliers
    GROWTH_STAGE_MULTIPLIERS: {
        'seedling': 0.5,
        'vegetative': 1.0,
        'flowering': 1.2,
        'fruiting': 1.3,
        'mature': 0.8
    },
    
    // Environmental adjustment factors
    TEMPERATURE_FACTOR: {
        LOW_TEMP: 0.8,   // < 18°C
        OPTIMAL_TEMP: 1.0, // 18-25°C
        HIGH_TEMP: 1.2    // > 25°C
    },
    
    PH_FACTOR: {
        LOW_PH: 0.9,      // < 5.5
        OPTIMAL_PH: 1.0,  // 5.5-6.5
        HIGH_PH: 0.85     // > 6.5
    }
};

/**
 * Validation rules for nutrient inputs
 */
export const VALIDATION_RULES = {
    RATIO: {
        REQUIRED: true,
        MIN: 0.1,
        MAX: 10.0,
        STEP: 0.1
    },
    
    MULTIPLIER: {
        REQUIRED: true,
        MIN: 0.1,
        MAX: 3.0,
        STEP: 0.1
    },
    
    CONCENTRATION: {
        REQUIRED: true,
        MIN: 1,
        MAX: 5000,
        STEP: 1,
        UNIT: 'ppm'
    },
    
    EC_VALUE: {
        REQUIRED: true,
        MIN: 0.1,
        MAX: 5.0,
        STEP: 0.1,
        UNIT: 'mS/cm'
    },
    
    PH_VALUE: {
        REQUIRED: true,
        MIN: 4.0,
        MAX: 9.0,
        STEP: 0.1
    },
    
    TEMPERATURE: {
        REQUIRED: true,
        MIN: 5,
        MAX: 40,
        STEP: 1,
        UNIT: '°C'
    }
};