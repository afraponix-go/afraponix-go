// Storage Utils Module
// Utilities for localStorage and sessionStorage management

/**
 * Storage Utilities
 * Provides safe localStorage/sessionStorage operations with error handling
 */
export default class StorageUtils {
    /**
     * Get item from localStorage
     */
    static getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('Failed to get localStorage item:', key, error);
            return null;
        }
    }

    /**
     * Set item in localStorage
     */
    static setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn('Failed to set localStorage item:', key, error);
            return false;
        }
    }

    /**
     * Remove item from localStorage
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove localStorage item:', key, error);
            return false;
        }
    }

    /**
     * Get JSON item from localStorage
     */
    static getJSON(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn('Failed to get/parse JSON from localStorage:', key, error);
            return null;
        }
    }

    /**
     * Set JSON item in localStorage
     */
    static setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Failed to stringify/set JSON in localStorage:', key, error);
            return false;
        }
    }

    /**
     * Clear all localStorage
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }

    /**
     * Check if localStorage is available
     */
    static isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get storage quota info (if available)
     */
    static async getQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                return await navigator.storage.estimate();
            } catch (error) {
                console.warn('Failed to get storage quota:', error);
            }
        }
        return null;
    }
}