// System Management Component
// Handles system selection, switching, and lifecycle management

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * System Management Component Class
 * Manages system switching, selector updates, and system lifecycle
 */
export class SystemManagementComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🔧 System Management Component initialized');
    }

    /**
     * Update the system selector dropdown
     * Complexity: 15, Lines: 14
     */
    updateSystemSelector() {
        const systemSelect = document.getElementById('active-system');
        if (!systemSelect) {
            console.debug('System selector element not found');
            return;
        }

        systemSelect.innerHTML = '<option value="">No system selected</option>';

        Object.keys(this.app.systems).forEach(systemId => {
            const system = this.app.systems[systemId];
            const option = document.createElement('option');
            option.value = systemId;
            option.textContent = system.system_name;
            if (systemId === this.app.activeSystemId) {
                option.selected = true;
            }
            systemSelect.appendChild(option);
        });
    }

    /**
     * Switch to a different system with full data refresh
     * Complexity: 45, Lines: 88
     */
    async switchToSystem(systemId) {
        try {
            // Clear nutrient range cache when switching systems
            this.app.nutrientRangeCache = {};
            
            if (systemId === '' || systemId === undefined || systemId === 'undefined') {
                await this.handleNoSystemSelected();
                return;
            }

            // Set new active system
            this.app.activeSystemId = systemId;
            localStorage.setItem('activeSystemId', systemId);
            
            // Update the system selector dropdown to reflect the change
            this.updateSystemSelector();
            
            // Clear all cached data to force fresh loads
            this.clearCachedData();
            
            // Destroy existing charts before clearing the object
            this.app.destroyAllCharts();
            
            // Load fresh data for the new system
            await this.loadSystemData();
            
            // Initialize charts first
            // this.app.initializeCharts(); // Disabled - using MetricsChartManager only
            
            // Update all tabs with new system data
            await this.updateAllTabsForNewSystem();
            
            // Show success notification
            this.showSystemSwitchNotification(systemId);
            
        } catch (error) {
            console.error('Error switching to system:', error);
            this.app.showNotification('Error switching systems. Please try again.', 'error');
        }
    }

    /**
     * Handle case when no system is selected
     */
    async handleNoSystemSelected() {
        this.app.activeSystemId = null;
        localStorage.removeItem('activeSystemId');
        
        // Update the system selector dropdown to reflect the change
        this.updateSystemSelector();
        
        // Clear all cached data  
        this.clearCachedData();
        
        // Destroy existing charts
        this.app.destroyAllCharts();
        
        // Update displays to show no system selected
        await this.app.updateDashboardFromData();
        this.app.updateCurrentSystemDisplay();
    }

    /**
     * Clear all cached system data
     */
    clearCachedData() {
        this.app.plantData = null;
        this.app.growBeds = null;
    }

    /**
     * Load data records for the current system
     */
    async loadSystemData() {
        await this.app.loadDataRecords(); // Reload data for new system
    }

    /**
     * Update all tabs with new system data
     */
    async updateAllTabsForNewSystem() {
        // Update Dashboard tab
        await this.app.updateDashboardFromData();
        
        // Check if updateFishTankSummary method exists and call it
        if (typeof this.app.updateFishTankSummary === 'function') {
            await this.app.updateFishTankSummary();
        }
        
        // Initialize Metrics Charts for the new system
        if (window.metricsChartManager) {
            await window.metricsChartManager.initialize(this.app.activeSystemId);
            console.log('📊 MetricsChartManager initialized for system:', this.app.activeSystemId);
        }
        
        // Update Plant Management tab
        await this.updatePlantManagementTab();
        
        // Update Fish Management tab
        await this.updateFishManagementTab();
        
        // Update Settings and other tabs
        await this.updateSettingsAndOtherTabs();
        
        // Update any active modals or forms
        this.app.clearAllForms();
        
        // Ensure all tab-specific content is refreshed if that tab is active
        await this.refreshActiveTab();
    }

    /**
     * Update Plant Management tab for new system
     */
    async updatePlantManagementTab() {
        if (typeof this.app.updatePlantOverview === 'function') {
            await this.app.updatePlantOverview();
        }
        
        if (typeof this.app.updateGrowBeds === 'function') {
            this.app.updateGrowBeds();
        }
        
        if (typeof this.app.updatePlantGrowthHistoryDisplay === 'function') {
            this.app.updatePlantGrowthHistoryDisplay();
        }
        
        if (typeof this.app.updatePlantRecommendations === 'function') {
            this.app.updatePlantRecommendations();
        }
        
        if (typeof this.app.updateRecentPlantEntries === 'function') {
            this.app.updateRecentPlantEntries();
        }
        
        if (typeof this.app.updateRemainingPlantsDisplay === 'function') {
            this.app.updateRemainingPlantsDisplay();
        }
    }

    /**
     * Update Fish Management tab for new system
     */
    async updateFishManagementTab() {
        if (typeof this.app.loadTankInformation === 'function') {
            this.app.loadTankInformation();
        }
    }

    /**
     * Update Settings and other tabs for new system
     */
    async updateSettingsAndOtherTabs() {
        // Update system name on all tabs
        if (typeof this.app.updateCurrentSystemDisplay === 'function') {
            this.app.updateCurrentSystemDisplay();
        }
        
        if (typeof this.app.initializeNutrientCalculator === 'function') {
            this.app.initializeNutrientCalculator();
        }
        
        // Refresh fish calculator with new system data
        if (typeof this.app.initializeFishCalculator === 'function') {
            this.app.initializeFishCalculator();
        }
        
        // Refresh data entry forms including fish health
        if (typeof this.app.initializeDataEntryForms === 'function') {
            this.app.initializeDataEntryForms();
        }
        
        if (typeof this.app.loadSystemManagement === 'function') {
            await this.app.loadSystemManagement();
        }
    }

    /**
     * Refresh content for the currently active tab
     */
    async refreshActiveTab() {
        const activeTab = document.querySelector('.dashboard-tab.active');
        if (!activeTab) return;
        
        const tabName = activeTab.textContent.trim();
        
        switch (tabName) {
            case 'Plant Management':
                // Plant tab specific refresh (already done above)
                break;
            case 'Fish Management':
                // Fish tab specific refresh (already done above)
                break;
            case 'Data Entry':
                if (typeof this.app.initializeDataEntryForms === 'function') {
                    this.app.initializeDataEntryForms();
                }
                break;
            default:
                // No specific refresh needed for other tabs
                break;
        }
    }

    /**
     * Show notification for successful system switch
     */
    showSystemSwitchNotification(systemId) {
        const system = this.app.systems[systemId];
        if (system) {
            this.app.showNotification(`Switched to system: ${system.system_name}`, 'success');
        }
    }

    /**
     * Get current active system information
     */
    getCurrentSystem() {
        if (!this.app.activeSystemId || !this.app.systems[this.app.activeSystemId]) {
            return null;
        }
        
        return {
            id: this.app.activeSystemId,
            ...this.app.systems[this.app.activeSystemId]
        };
    }

    /**
     * Get all available systems
     */
    getAllSystems() {
        return Object.keys(this.app.systems).map(systemId => ({
            id: systemId,
            ...this.app.systems[systemId]
        }));
    }

    /**
     * Check if a system is currently selected
     */
    hasActiveSystem() {
        return !!(this.app.activeSystemId && this.app.systems[this.app.activeSystemId]);
    }

    /**
     * Validate system ID
     */
    isValidSystem(systemId) {
        return systemId && this.app.systems && this.app.systems[systemId];
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            activeSystemId: this.app.activeSystemId,
            totalSystems: Object.keys(this.app.systems || {}).length,
            hasActiveSystem: this.hasActiveSystem(),
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying System Management component');
    }
}

// Export both class and create a factory function
export default SystemManagementComponent;

/**
 * Factory function to create system management component
 */
export function createSystemManagementComponent(app) {
    return new SystemManagementComponent(app);
}