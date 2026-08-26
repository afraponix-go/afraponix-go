// Base Manager Component Class
// Specialized base class for Manager components that handle data and business logic

import BaseComponent from './baseComponent.js';

/**
 * Base Manager Component Class
 * Extends BaseComponent with manager-specific functionality for data handling and business logic
 */
export class BaseManagerComponent extends BaseComponent {
    constructor(app, managerName = 'Manager') {
        super(app, managerName);
        
        // Manager-specific properties
        this.data = new Map();
        this.cache = new Map();
        this.cacheTTL = new Map();
        this.defaultCacheDuration = 5 * 60 * 1000; // 5 minutes
        this.loadingStates = new Set();
        
        this.log(`📋 ${this.managerName} Manager initialized with data management capabilities`);
    }

    /**
     * Set loading state for a specific operation
     */
    setLoading(operationKey, isLoading = true) {
        if (isLoading) {
            this.loadingStates.add(operationKey);
        } else {
            this.loadingStates.delete(operationKey);
        }
        
        // Emit loading state change
        this.emit('loadingStateChange', {
            operation: operationKey,
            isLoading,
            totalLoading: this.loadingStates.size
        });
    }

    /**
     * Check if any operations are currently loading
     */
    isLoading(operationKey = null) {
        if (operationKey) {
            return this.loadingStates.has(operationKey);
        }
        return this.loadingStates.size > 0;
    }

    /**
     * Clear all loading states
     */
    clearAllLoadingStates() {
        this.loadingStates.clear();
        this.emit('loadingStateChange', {
            operation: 'all',
            isLoading: false,
            totalLoading: 0
        });
    }

    /**
     * Set data with optional caching
     */
    setData(key, value, cacheDuration = this.defaultCacheDuration) {
        this.data.set(key, value);
        
        if (cacheDuration > 0) {
            this.cache.set(key, value);
            this.cacheTTL.set(key, Date.now() + cacheDuration);
        }
        
        this.emit('dataUpdate', { key, value, cached: cacheDuration > 0 });
    }

    /**
     * Get data with cache checking
     */
    getData(key, useCache = true) {
        // Check cache first if enabled
        if (useCache && this.cache.has(key)) {
            const cacheTime = this.cacheTTL.get(key);
            if (cacheTime && Date.now() < cacheTime) {
                this.log(`📋 Cache hit for: ${key}`);
                return this.cache.get(key);
            } else {
                // Cache expired
                this.cache.delete(key);
                this.cacheTTL.delete(key);
            }
        }
        
        // Return from main data store
        return this.data.get(key);
    }

    /**
     * Check if data exists
     */
    hasData(key) {
        return this.data.has(key) || this.cache.has(key);
    }

    /**
     * Remove data and clear from cache
     */
    removeData(key) {
        const hadData = this.data.has(key);
        this.data.delete(key);
        this.cache.delete(key);
        this.cacheTTL.delete(key);
        
        if (hadData) {
            this.emit('dataRemoved', { key });
        }
        
        return hadData;
    }

    /**
     * Clear all data and cache
     */
    clearAllData() {
        const dataKeys = Array.from(this.data.keys());
        
        this.data.clear();
        this.cache.clear();
        this.cacheTTL.clear();
        
        this.emit('dataCleared', { clearedKeys: dataKeys });
        this.log(`📋 Cleared all data (${dataKeys.length} keys)`);
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validCacheEntries = 0;
        let expiredCacheEntries = 0;
        
        this.cacheTTL.forEach((expiry, key) => {
            if (now < expiry) {
                validCacheEntries++;
            } else {
                expiredCacheEntries++;
            }
        });
        
        return {
            totalDataEntries: this.data.size,
            totalCacheEntries: this.cache.size,
            validCacheEntries,
            expiredCacheEntries,
            cacheHitRatio: this.getCacheHitRatio()
        };
    }

    /**
     * Calculate cache hit ratio (would need hit/miss tracking to be accurate)
     */
    getCacheHitRatio() {
        // Placeholder - real implementation would track hits/misses
        return this.cache.size > 0 ? 0.85 : 0;
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        
        this.cacheTTL.forEach((expiry, key) => {
            if (now >= expiry) {
                this.cache.delete(key);
                this.cacheTTL.delete(key);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            this.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
        
        return cleaned;
    }

    /**
     * Load data with loading state management and caching
     */
    async loadData(key, loadFunction, cacheDuration = this.defaultCacheDuration) {
        const operationKey = `load_${key}`;
        
        try {
            this.setLoading(operationKey, true);
            this.log(`📡 Loading data: ${key}`);
            
            const data = await loadFunction();
            this.setData(key, data, cacheDuration);
            
            this.log(`✅ Data loaded successfully: ${key}`);
            return data;
            
        } catch (error) {
            this.logError(`Failed to load data: ${key}`, error);
            throw error;
        } finally {
            this.setLoading(operationKey, false);
        }
    }

    /**
     * Refresh specific data (bypass cache)
     */
    async refreshData(key, loadFunction, cacheDuration = this.defaultCacheDuration) {
        // Remove existing data/cache
        this.removeData(key);
        
        // Load fresh data
        return await this.loadData(key, loadFunction, cacheDuration);
    }

    /**
     * Refresh all data
     */
    async refreshAllData() {
        const operationKey = 'refresh_all';
        
        try {
            this.setLoading(operationKey, true);
            this.log('🔄 Refreshing all data...');
            
            // Call subclass refresh method if it exists
            if (typeof this.onRefreshAllData === 'function') {
                await this.onRefreshAllData();
            } else {
                this.clearAllData();
            }
            
            this.log('✅ All data refreshed successfully');
            
        } catch (error) {
            this.logError('Failed to refresh all data', error);
            throw error;
        } finally {
            this.setLoading(operationKey, false);
        }
    }

    /**
     * Get manager-specific statistics
     */
    getComponentStats() {
        return {
            ...this.getCacheStats(),
            loadingOperations: this.loadingStates.size,
            activeLoadingOps: Array.from(this.loadingStates),
            dataKeys: Array.from(this.data.keys()),
            hasActiveSystem: !!(this.app && this.app.activeSystemId)
        };
    }

    /**
     * Manager-specific health checks
     */
    getHealthIssues() {
        const issues = [];
        
        // Check for excessive loading operations
        if (this.loadingStates.size > 10) {
            issues.push(`Too many concurrent loading operations: ${this.loadingStates.size}`);
        }
        
        // Check for cache bloat
        if (this.cache.size > 100) {
            issues.push(`Cache size is large: ${this.cache.size} entries`);
        }
        
        // Check for data bloat
        if (this.data.size > 500) {
            issues.push(`Data store is large: ${this.data.size} entries`);
        }
        
        return issues;
    }

    /**
     * Manager cleanup
     */
    onDestroy() {
        // Clear all data and cache
        this.clearAllData();
        this.clearAllLoadingStates();
        
        // Cleanup cache cleanup interval if we had one
        this.log('📋 Manager data and cache cleared');
    }
}

// Export the base manager class
export default BaseManagerComponent;

/**
 * Factory function to create manager components
 */
export function createBaseManagerComponent(app, managerName) {
    return new BaseManagerComponent(app, managerName);
}