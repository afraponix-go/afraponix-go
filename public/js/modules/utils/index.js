// Utilities Module Exports
// Helper functions and utility classes for repeated patterns

// Pattern extraction utilities (from script.js repeated patterns)
export { default as ErrorHandler } from './errorHandler.js';
export { default as LoadingManager } from './loadingManager.js';  
export { default as NotificationManager } from './notificationManager.js';
export { default as FormUtils } from './formUtils.js';
export { default as DOMUtils } from './domUtils.js';

// Domain-specific validation utilities
export { default as StorageUtils } from './storageUtils.js';
export { default as GrowBedValidation } from './growBedValidation.js';
export { default as NutrientValidation } from './nutrientValidation.js';

// General-purpose utilities
export { default as UtilityHelpers } from './utilityHelpers.js';
export { default as CalculationUtils } from './calculationUtils.js';

// Convenience exports for direct function access
export { 
    handleApiError, 
    handleValidationError, 
    handleGeneralError,
    wrapAsync,
    executeSafely 
} from './errorHandler.js';

export { 
    startLoading, 
    stopLoading, 
    withLoading, 
    withButtonLoading, 
    withFormLoading 
} from './loadingManager.js';

export { 
    showNotification, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo 
} from './notificationManager.js';

export { 
    registerForm, 
    validateForm, 
    validateField, 
    getFormData, 
    setFormData, 
    resetForm 
} from './formUtils.js';

export { 
    $, 
    $$, 
    createElement, 
    waitForElement, 
    toggleElement, 
    createModal, 
    copyToClipboard 
} from './domUtils.js';

export { 
    formatNumber, 
    formatWeight, 
    formatVolume, 
    formatDensity, 
    capitalize, 
    generateId, 
    debounce, 
    throttle, 
    deepClone, 
    isEmpty, 
    safeGet, 
    slugify, 
    formatBytes, 
    formatDate, 
    calculatePercentage 
} from './utilityHelpers.js';

export { 
    calculateTotalSpace, 
    calculateOccupiedSpace, 
    calculateBedCapacityMetrics, 
    calculateFishDensity, 
    calculateTemperatureAdjustedFeedingRate, 
    calculateDailyFeedingAmount, 
    calculateTankVolume, 
    calculateGrowBedVolume, 
    calculateGrowBedArea, 
    calculateWaterQualityScore, 
    convertUnits 
} from './calculationUtils.js';