/**
 * Utility Helpers Module
 * General-purpose utility functions for common operations
 */

/**
 * UtilityHelpers Class
 * Collection of utility functions for data transformation, formatting, and common operations
 */
export class UtilityHelpers {
    constructor() {
        console.log('🛠️ UtilityHelpers module initialized');
    }

    /**
     * Format a number to specified decimal places
     * 
     * @param {number} value - Value to format
     * @param {number} decimals - Number of decimal places (default 1)
     * @returns {string} Formatted number string
     */
    formatNumber(value, decimals = 1) {
        if (isNaN(value) || !isFinite(value)) {
            return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
        }
        return parseFloat(value).toFixed(decimals);
    }

    /**
     * Format weight value with appropriate units
     * 
     * @param {number} weightInGrams - Weight in grams
     * @returns {string} Formatted weight string
     */
    formatWeight(weightInGrams) {
        if (isNaN(weightInGrams) || weightInGrams === 0) {
            return 'Not recorded';
        }
        
        if (weightInGrams >= 1000) {
            return this.formatNumber(weightInGrams / 1000, 1) + 'kg';
        }
        
        return this.formatNumber(weightInGrams, 1) + 'g';
    }

    /**
     * Format volume with appropriate units
     * 
     * @param {number} volumeInLiters - Volume in liters
     * @returns {string} Formatted volume string
     */
    formatVolume(volumeInLiters) {
        if (isNaN(volumeInLiters) || volumeInLiters === 0) {
            return '0L';
        }
        
        if (volumeInLiters >= 1000) {
            return this.formatNumber(volumeInLiters / 1000, 1) + 'm³';
        }
        
        return this.formatNumber(volumeInLiters, 0) + 'L';
    }

    /**
     * Format density value
     * 
     * @param {number} density - Density value
     * @returns {string} Formatted density string
     */
    formatDensity(density) {
        return this.formatNumber(density, 1) + ' kg/m³';
    }

    /**
     * Capitalize first letter of string
     * 
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Generate unique ID with optional prefix
     * 
     * @param {string} prefix - Optional prefix for ID
     * @returns {string} Unique identifier
     */
    generateId(prefix = 'id') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Debounce function execution
     * 
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function execution
     * 
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, delay = 300) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * Deep clone an object
     * 
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Check if value is empty (null, undefined, empty string, empty array, empty object)
     * 
     * @param {any} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Safe array access with default value
     * 
     * @param {Array} array - Array to access
     * @param {number} index - Index to access
     * @param {any} defaultValue - Default value if index doesn't exist
     * @returns {any} Array value or default
     */
    safeArrayAccess(array, index, defaultValue = null) {
        if (!Array.isArray(array) || index < 0 || index >= array.length) {
            return defaultValue;
        }
        return array[index];
    }

    /**
     * Safe object property access with default value
     * 
     * @param {Object} obj - Object to access
     * @param {string} path - Property path (e.g., 'user.profile.name')
     * @param {any} defaultValue - Default value if property doesn't exist
     * @returns {any} Property value or default
     */
    safeGet(obj, path, defaultValue = null) {
        try {
            const keys = path.split('.');
            let current = obj;
            
            for (const key of keys) {
                if (current === null || current === undefined || !(key in current)) {
                    return defaultValue;
                }
                current = current[key];
            }
            
            return current;
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * Convert string to slug format (URL-friendly)
     * 
     * @param {string} str - String to convert
     * @returns {string} Slug string
     */
    slugify(str) {
        if (!str || typeof str !== 'string') return '';
        
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }

    /**
     * Convert bytes to human readable format
     * 
     * @param {number} bytes - Bytes value
     * @param {number} decimals - Decimal places (default 2)
     * @returns {string} Human readable size
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format date to readable string
     * 
     * @param {Date|string|number} date - Date to format
     * @param {string} format - Format type ('short', 'long', 'time', 'datetime')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'short') {
        try {
            const dateObj = date instanceof Date ? date : new Date(date);
            
            if (isNaN(dateObj.getTime())) {
                return 'Invalid Date';
            }
            
            const options = {
                short: { year: 'numeric', month: 'short', day: 'numeric' },
                long: { year: 'numeric', month: 'long', day: 'numeric' },
                time: { hour: '2-digit', minute: '2-digit' },
                datetime: { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }
            };
            
            // For short format, use consistent dd/mm/yy format from app
            if (format === 'short' || !format) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = String(dateObj.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            }
            return dateObj.toLocaleDateString('en-US', options[format]);
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Calculate percentage with optional rounding
     * 
     * @param {number} value - Current value
     * @param {number} total - Total value
     * @param {number} decimals - Decimal places (default 1)
     * @returns {string} Percentage string
     */
    calculatePercentage(value, total, decimals = 1) {
        if (total === 0 || isNaN(value) || isNaN(total)) {
            return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '') + '%';
        }
        
        const percentage = (value / total) * 100;
        return this.formatNumber(percentage, decimals) + '%';
    }

    /**
     * Clamp number between min and max values
     * 
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Generate random number between min and max
     * 
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {boolean} integer - Return integer (default false)
     * @returns {number} Random number
     */
    randomBetween(min, max, integer = false) {
        const random = Math.random() * (max - min) + min;
        return integer ? Math.floor(random) : random;
    }

    /**
     * Round number to nearest step
     * 
     * @param {number} value - Value to round
     * @param {number} step - Step size
     * @returns {number} Rounded value
     */
    roundToStep(value, step) {
        return Math.round(value / step) * step;
    }

    /**
     * Check if value is numeric
     * 
     * @param {any} value - Value to check
     * @returns {boolean} True if numeric
     */
    isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Convert string to number with fallback
     * 
     * @param {any} value - Value to convert
     * @param {number} fallback - Fallback value (default 0)
     * @returns {number} Converted number
     */
    toNumber(value, fallback = 0) {
        const num = parseFloat(value);
        return isNaN(num) ? fallback : num;
    }

    /**
     * Sort array of objects by property
     * 
     * @param {Array} array - Array to sort
     * @param {string} property - Property to sort by
     * @param {boolean} ascending - Sort ascending (default true)
     * @returns {Array} Sorted array
     */
    sortByProperty(array, property, ascending = true) {
        if (!Array.isArray(array)) return [];
        
        return [...array].sort((a, b) => {
            const aVal = this.safeGet(a, property, '');
            const bVal = this.safeGet(b, property, '');
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }

    /**
     * Filter array by search term
     * 
     * @param {Array} array - Array to filter
     * @param {string} searchTerm - Search term
     * @param {Array|string} properties - Properties to search in
     * @returns {Array} Filtered array
     */
    filterBySearch(array, searchTerm, properties) {
        if (!Array.isArray(array) || !searchTerm) return array;
        
        const searchLower = searchTerm.toLowerCase();
        const searchProps = Array.isArray(properties) ? properties : [properties];
        
        return array.filter(item => {
            return searchProps.some(prop => {
                const value = this.safeGet(item, prop, '');
                return String(value).toLowerCase().includes(searchLower);
            });
        });
    }
}

// Create utility instance
const utilityHelpers = new UtilityHelpers();

// Export individual utility functions for convenience
export const formatNumber = (value, decimals) => utilityHelpers.formatNumber(value, decimals);
export const formatWeight = (weight) => utilityHelpers.formatWeight(weight);
export const formatVolume = (volume) => utilityHelpers.formatVolume(volume);
export const formatDensity = (density) => utilityHelpers.formatDensity(density);
export const capitalize = (str) => utilityHelpers.capitalize(str);
export const generateId = (prefix) => utilityHelpers.generateId(prefix);
export const debounce = (func, delay) => utilityHelpers.debounce(func, delay);
export const throttle = (func, delay) => utilityHelpers.throttle(func, delay);
export const deepClone = (obj) => utilityHelpers.deepClone(obj);
export const isEmpty = (value) => utilityHelpers.isEmpty(value);
export const safeGet = (obj, path, defaultValue) => utilityHelpers.safeGet(obj, path, defaultValue);
export const slugify = (str) => utilityHelpers.slugify(str);
export const formatBytes = (bytes, decimals) => utilityHelpers.formatBytes(bytes, decimals);
export const formatDate = (date, format) => utilityHelpers.formatDate(date, format);
export const calculatePercentage = (value, total, decimals) => utilityHelpers.calculatePercentage(value, total, decimals);
export const clamp = (value, min, max) => utilityHelpers.clamp(value, min, max);
export const randomBetween = (min, max, integer) => utilityHelpers.randomBetween(min, max, integer);
export const isNumeric = (value) => utilityHelpers.isNumeric(value);
export const toNumber = (value, fallback) => utilityHelpers.toNumber(value, fallback);
export const sortByProperty = (array, property, ascending) => utilityHelpers.sortByProperty(array, property, ascending);
export const filterBySearch = (array, searchTerm, properties) => utilityHelpers.filterBySearch(array, searchTerm, properties);

// Export default instance
export default utilityHelpers;