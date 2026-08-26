// Utilities Component
// Handles common utility functions for data formatting and parsing

/**
 * Utilities Component Class
 * Manages common utility functions used throughout the application
 */
export class UtilitiesComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🔧 Utilities Component initialized');
    }

    /**
     * Format date in DD/MM/YYYY format
     * Complexity: 5, Lines: 7
     */
    formatDateDDMMYYYY(date) {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Parse numeric values with null handling
     * Complexity: 8, Lines: 15
     */
    parseNumericValue(value) {
        // If the input is empty or whitespace-only, return null
        if (value === '' || value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return null;
        }
        
        // Parse the value and check if it's a valid number
        const parsed = parseFloat(value);
        
        // Return null if parsing resulted in NaN, otherwise return the number (including 0)
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Format timestamp for display
     * Complexity: 3, Lines: 5
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return this.formatDateDDMMYYYY(date) + ' ' + date.toLocaleTimeString();
    }

    /**
     * Parse SQL datetime string
     * Complexity: 3, Lines: 5
     */
    parseDateTime(dateTimeString) {
        if (!dateTimeString) return null;
        return new Date(dateTimeString);
    }

    /**
     * Format number with decimal places
     * Complexity: 4, Lines: 6
     */
    formatNumber(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '';
        return Number(value).toFixed(decimals);
    }

    /**
     * Clean custom crop names for display
     * Complexity: 10, Lines: 15
     */
    cleanCustomCropName(cropName) {
        if (!cropName) return cropName;
        
        // Remove common patterns like usernames, admin suffixes, test identifiers
        return cropName
            .replace(/_[a-z]+$/i, '') // Remove trailing username (e.g., "_justin")
            .replace(/_admin$/i, '') // Remove admin suffix
            .replace(/_test$/i, '') // Remove test suffix
            .replace(/_\d+$/i, '') // Remove trailing numbers
            .replace(/_/g, ' ') // Convert underscores to spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
    }

    /**
     * Format weight values for display
     * Complexity: 6, Lines: 8
     */
    formatWeight(grams) {
        if (!grams || grams === 0) return '0g';
        
        if (grams >= 1000) {
            return (grams / 1000).toFixed(1) + 'kg';
        }
        return Math.round(grams) + 'g';
    }

    /**
     * Validate email format
     * Complexity: 2, Lines: 3
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Generate unique ID
     * Complexity: 2, Lines: 3
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Debounce function calls
     * Complexity: 5, Lines: 10
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            utilitiesAvailable: [
                'formatDateDDMMYYYY',
                'parseNumericValue',
                'formatTimestamp',
                'parseDateTime',
                'formatNumber',
                'cleanCustomCropName',
                'formatWeight',
                'isValidEmail',
                'generateUniqueId',
                'debounce'
            ]
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Utilities component');
    }
}

// Export both class and create a factory function
export default UtilitiesComponent;

/**
 * Factory function to create utilities component
 */
export function createUtilitiesComponent(app) {
    return new UtilitiesComponent(app);
}