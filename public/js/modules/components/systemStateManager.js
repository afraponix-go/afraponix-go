// System State Manager Component
// Handles system switching, state persistence, and system-wide state management

/**
 * System State Manager Component Class
 * Manages application state, system switching, and data persistence
 */
export class SystemStateManagerComponent {
    constructor(app) {
        this.app = app;
        this.loadingStates = new Set();
        
        console.log('⚙️ System State Manager Component initialized');
    }

    /**
     * Load user data and initialize application state
     * Complexity: 25, Lines: 50+
     */
    async loadUserData() {
        try {
            this.app.isLoading = true;
            
            // Get user systems
            const systemsResponse = await this.app.makeApiCall('/systems');
            this.app.userSystems = systemsResponse.systems || [];

            if (this.app.userSystems.length === 0) {
                // No systems - show system creation
                this.app.showNotification('Welcome! Let\'s set up your first aquaponics system.', 'info');
                this.app.showSystemCreationWizard();
                return;
            }

            // Get the active system (from localStorage or default to first)
            let activeSystemId = localStorage.getItem('activeSystemId');
            
            // Validate that the stored system still exists and user has access
            const activeSystem = this.app.userSystems.find(s => s.id === activeSystemId);
            if (!activeSystem) {
                // Stored system doesn't exist or user lost access, default to first system
                activeSystemId = this.app.userSystems[0].id;
                localStorage.setItem('activeSystemId', activeSystemId);
            }

            this.app.activeSystemId = activeSystemId;
            this.app.currentSystem = this.app.userSystems.find(s => s.id === activeSystemId);

            // Load data for the active system
            await this.app.switchToSystem(activeSystemId, false); // false = don't show loading notification
            
            this.app.isLoading = false;
            
            // Show success notification
            setTimeout(() => {
                this.app.showNotification('✅ Afraponix Go loaded successfully', 'success', 3000);
            }, 500);
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.app.isLoading = false;
            this.app.showNotification('Failed to load user data. Please refresh the page.', 'error');
        }
    }

    /**
     * Switch to a different system
     * Complexity: 20, Lines: 40+
     */
    async switchToSystem(systemId, showNotification = true) {
        try {
            if (showNotification) {
                this.app.showNotification('Switching systems...', 'info', 2000);
            }
            
            // Update active system
            this.app.activeSystemId = systemId;
            this.app.currentSystem = this.app.userSystems.find(s => s.id === systemId);
            
            // Persist the selection
            localStorage.setItem('activeSystemId', systemId);
            
            // Update UI to show selected system
            this.updateSystemSelector(systemId);
            
            // Load data for new system via system management component
            if (this.app.systemManagement) {
                await this.app.systemManagement.switchToSystem(systemId);
            } else {
                // Fallback if systemManagement not available
                console.warn('SystemManagement component not available, using fallback');
                await this.loadSystemData(systemId);
            }
            
            if (showNotification) {
                const systemName = this.app.currentSystem?.name || 'System';
                this.app.showNotification(`Switched to ${systemName}`, 'success');
            }
            
        } catch (error) {
            console.error('Error switching to system:', error);
            this.app.showNotification('Failed to switch systems', 'error');
        }
    }

    /**
     * Update system selector UI
     * Complexity: 10, Lines: 20
     */
    updateSystemSelector(systemId) {
        const systemSelector = document.getElementById('system-selector');
        const systemNameElement = document.getElementById('current-system-name');
        
        if (systemSelector) {
            systemSelector.value = systemId;
        }
        
        if (systemNameElement && this.app.currentSystem) {
            systemNameElement.textContent = this.app.currentSystem.name;
        }
        
        // Update system dropdown options to show current selection
        const options = document.querySelectorAll('#system-selector option');
        options.forEach(option => {
            option.selected = option.value === systemId;
        });
        
        // Update any other system-related UI elements
        this.updateSystemDependentUI();
    }

    /**
     * Update UI elements that depend on current system
     * Complexity: 8, Lines: 15
     */
    updateSystemDependentUI() {
        // Update page title
        if (this.app.currentSystem) {
            document.title = `${this.app.currentSystem.name} - Afraponix Go`;
        }
        
        // Update system info displays
        const systemInfoElements = document.querySelectorAll('[data-system-info]');
        systemInfoElements.forEach(element => {
            const infoType = element.dataset.systemInfo;
            if (infoType === 'name' && this.app.currentSystem) {
                element.textContent = this.app.currentSystem.name;
            }
        });
    }

    /**
     * Fallback system data loading
     * Complexity: 15, Lines: 25
     */
    async loadSystemData(systemId) {
        try {
            // Load basic system data
            if (this.app.dashboardManager) {
                await this.app.dashboardManager.updateDashboardFromData();
            }
            
            // Load fish data if component available
            if (this.app.fishManagement) {
                await this.app.fishManagement.loadFishOverview();
            }
            
            // Load plant data if component available  
            if (this.app.plantManagement) {
                await this.app.plantManagement.updatePlantOverview();
            }
            
        } catch (error) {
            console.error('Error in fallback system data loading:', error);
        }
    }

    /**
     * Set loading state for a component/area
     * Complexity: 5, Lines: 8
     */
    setLoadingState(identifier, isLoading) {
        if (isLoading) {
            this.loadingStates.add(identifier);
        } else {
            this.loadingStates.delete(identifier);
        }
        
        // Update global loading state
        this.app.isLoading = this.loadingStates.size > 0;
    }

    /**
     * Check if any area is loading
     * Complexity: 2, Lines: 3
     */
    isAnyLoading() {
        return this.loadingStates.size > 0;
    }

    /**
     * Clear all loading states
     * Complexity: 3, Lines: 5
     */
    clearAllLoadingStates() {
        this.loadingStates.clear();
        this.app.isLoading = false;
    }

    /**
     * Get current system configuration
     * Complexity: 5, Lines: 8
     */
    getCurrentSystemConfig() {
        if (!this.app.currentSystem) return null;
        
        return {
            id: this.app.currentSystem.id,
            name: this.app.currentSystem.name,
            type: this.app.currentSystem.type,
            ...this.app.currentSystem
        };
    }

    /**
     * Update system configuration
     * Complexity: 10, Lines: 15
     */
    updateSystemConfig(updates) {
        if (!this.app.currentSystem) return false;
        
        // Update local system object
        Object.assign(this.app.currentSystem, updates);
        
        // Update in systems list
        const systemIndex = this.app.userSystems.findIndex(s => s.id === this.app.currentSystem.id);
        if (systemIndex !== -1) {
            Object.assign(this.app.userSystems[systemIndex], updates);
        }
        
        // Update UI
        this.updateSystemDependentUI();
        
        return true;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            currentSystem: this.app.currentSystem?.name,
            userSystemsCount: this.app.userSystems?.length || 0,
            loadingStatesCount: this.loadingStates.size,
            isLoading: this.app.isLoading
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying System State Manager component');
        this.clearAllLoadingStates();
    }
}

// Export both class and create a factory function
export default SystemStateManagerComponent;

/**
 * Factory function to create system state manager component
 */
export function createSystemStateManagerComponent(app) {
    return new SystemStateManagerComponent(app);
}