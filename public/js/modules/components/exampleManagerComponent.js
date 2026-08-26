// Example Manager Component
// Demonstrates how to extend BaseManagerComponent for data management functionality

import BaseManagerComponent from './baseManager.js';

/**
 * Example Manager Component
 * Shows best practices for extending BaseManagerComponent
 */
export class ExampleManagerComponent extends BaseManagerComponent {
    constructor(app) {
        super(app, 'ExampleManager');
    }

    /**
     * Component-specific initialization
     */
    async onInitialize() {
        this.log('Setting up example manager...');
        
        // Initialize component-specific data structures
        this.setupDataStructures();
        
        // Load initial data
        await this.loadInitialData();
    }

    /**
     * Setup component-specific data structures
     */
    setupDataStructures() {
        // Example of using the base class data management
        this.setData('userPreferences', {
            theme: 'light',
            language: 'en',
            notifications: true
        });
        
        this.setData('systemStats', {
            uptime: Date.now(),
            requests: 0,
            errors: 0
        });
    }

    /**
     * Load initial data using base class data loading
     */
    async loadInitialData() {
        try {
            // Example of using loadData with caching
            await this.loadData('userSettings', async () => {
                // Simulate API call
                return await this.makeApiCall('/user/settings');
            }, 10 * 60 * 1000); // Cache for 10 minutes

            // Example of loading system data
            await this.loadData('systemInfo', async () => {
                return await this.makeApiCall('/system/info');
            });

        } catch (error) {
            this.logError('Failed to load initial data', error);
            // Handle error gracefully
        }
    }

    /**
     * Example business logic method
     */
    async updateUserPreference(key, value) {
        const operationKey = `update_preference_${key}`;
        
        try {
            this.setLoading(operationKey, true);
            
            // Get current preferences
            const preferences = this.getData('userPreferences');
            preferences[key] = value;
            
            // Update locally
            this.setData('userPreferences', preferences);
            
            // Sync with server
            await this.makeApiCall('/user/preferences', {
                method: 'PUT',
                body: JSON.stringify({ [key]: value })
            });
            
            this.showNotification(`Preference ${key} updated successfully`, 'success');
            
        } catch (error) {
            this.logError(`Failed to update preference ${key}`, error);
            this.showNotification(`Failed to update ${key}`, 'error');
            throw error;
        } finally {
            this.setLoading(operationKey, false);
        }
    }

    /**
     * Example of refreshing all data (implements base class hook)
     */
    async onRefreshAllData() {
        // Clear existing data
        this.clearAllData();
        
        // Reload all data fresh
        await this.loadInitialData();
        
        this.emit('dataRefreshed', { 
            timestamp: new Date(),
            dataKeys: Array.from(this.data.keys())
        });
    }

    /**
     * Get component-specific statistics
     */
    getComponentStats() {
        const baseStats = super.getComponentStats();
        
        return {
            ...baseStats,
            exampleSpecificMetric: this.data.size * 2,
            hasUserPreferences: this.hasData('userPreferences'),
            lastRefresh: this.getData('lastRefresh') || null
        };
    }

    /**
     * Component-specific health checks
     */
    getHealthIssues() {
        const baseIssues = super.getHealthIssues();
        const issues = [...baseIssues];
        
        // Add component-specific health checks
        if (!this.hasData('userPreferences')) {
            issues.push('User preferences not loaded');
        }
        
        const systemStats = this.getData('systemStats');
        if (systemStats && systemStats.errors > 10) {
            issues.push(`High error count: ${systemStats.errors}`);
        }
        
        return issues;
    }

    /**
     * Component-specific cleanup
     */
    onDestroy() {
        // Perform any additional cleanup beyond base class
        this.log('Performing example manager cleanup');
        
        // Example: Save current state before destruction
        const preferences = this.getData('userPreferences');
        if (preferences) {
            try {
                localStorage.setItem('exampleManagerPreferences', JSON.stringify(preferences));
            } catch (error) {
                this.logError('Failed to save preferences to localStorage', error);
            }
        }
    }
}

// Export both class and factory function
export default ExampleManagerComponent;

/**
 * Factory function to create example manager component
 */
export function createExampleManagerComponent(app) {
    return new ExampleManagerComponent(app);
}