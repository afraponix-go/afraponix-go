// System Manager Service
// Handles system switching, configuration, and system-related business logic

import { SystemsAPI } from '../api/index.js';
import { StorageUtils } from '../utils/index.js';

/**
 * System Manager Service
 * Manages system selection, configuration, and coordinates system switching
 */
export default class SystemManager {
    constructor(app) {
        this.app = app;
        this.currentSystem = null;
        this.systems = {};
    }

    /**
     * Initialize the system manager
     */
    async initialize() {
        console.log('🏗️ Initializing System Manager');
        
        // Check if user is authenticated before loading systems
        if (!this.app.currentUser) {
            console.warn('⚠️ System Manager: Waiting for authentication before loading systems');
            return false;
        }
        
        // Load systems and restore last active system
        await this.loadSystems();
        await this.restoreActiveSystem();
        
        console.log('✅ System Manager initialized');
        return true;
    }

    /**
     * Load all available systems
     */
    async loadSystems() {
        try {
            console.log('🔄 Loading available systems...');
            const systemsArray = await SystemsAPI.fetchSystems();
            
            // Convert array to object keyed by ID
            this.systems = {};
            if (Array.isArray(systemsArray)) {
                systemsArray.forEach(system => {
                    this.systems[system.id] = system;
                });
            }
            
            console.log(`✅ Loaded ${Object.keys(this.systems).length} systems`);
            return this.systems;
            
        } catch (error) {
            console.error('❌ Failed to load systems:', error);
            this.app.showNotification('Failed to load systems', 'error');
            throw error;
        }
    }

    /**
     * Restore the previously active system from storage
     */
    async restoreActiveSystem() {
        const savedSystemId = StorageUtils.getItem('activeSystemId');
        
        if (savedSystemId && this.systems[savedSystemId]) {
            console.log('🔄 Restoring active system:', savedSystemId);
            await this.switchToSystem(savedSystemId);
        } else if (Object.keys(this.systems).length > 0) {
            // Auto-select first available system
            const firstSystemId = Object.keys(this.systems)[0];
            console.log('🔄 Auto-selecting first system:', firstSystemId);
            await this.switchToSystem(firstSystemId);
        } else {
            console.log('⚠️ No systems available');
            this.app.showNotification('No systems configured. Please create a system first.', 'warning');
        }
    }

    /**
     * Switch to a different system
     */
    async switchToSystem(systemId) {
        if (!systemId || systemId === this.app.activeSystemId) {
            return; // No change needed
        }

        // Ensure systems are loaded before switching
        if (!this.systems || Object.keys(this.systems).length === 0) {
            console.log('🔄 Systems not loaded, loading now...');
            try {
                await this.loadSystems();
            } catch (error) {
                console.error('❌ Failed to load systems during switch:', error);
                throw error;
            }
        }

        const system = this.systems[systemId];
        if (!system) {
            console.warn(`⚠️ System ${systemId} not found in available systems:`, Object.keys(this.systems));
            console.warn('🔍 Available systems:', this.systems);
            
            // Try to reload systems once more
            console.log('🔄 Attempting to reload systems...');
            try {
                await this.loadSystems();
                const retrySystem = this.systems[systemId];
                if (!retrySystem) {
                    // Clear the invalid system ID from localStorage
                    StorageUtils.removeItem('activeSystemId');
                    throw new Error(`System ${systemId} not found after reload`);
                }
                // Continue with retry system
                console.log('✅ System found after reload');
            } catch (error) {
                // Clear the invalid system ID from localStorage
                StorageUtils.removeItem('activeSystemId');
                throw new Error(`System ${systemId} not found`);
            }
        }

        console.log('🔄 Switching to system:', systemId, system.system_name);

        try {
            // Update active system
            const previousSystemId = this.app.activeSystemId;
            this.app.activeSystemId = systemId;
            this.currentSystem = system;
            
            // Persist to storage
            StorageUtils.setItem('activeSystemId', systemId);
            
            // Notify data processor to clear cached data
            if (this.app.dataProcessor) {
                this.app.dataProcessor.clearCache();
            }

            // Initialize charts for the new system
            if (this.app.dashboard && this.app.currentView === 'dashboard') {
                // Reinitialize dashboard charts
                this.app.dashboard.initializeCharts();
                await this.app.dashboard.refreshData();
            }

            // Load system data
            await this.loadSystemData(systemId);

            // Also trigger monolithic app data refresh if methods exist
            if (typeof this.app.loadDataRecords === 'function') {
                console.log('📊 Refreshing monolithic app data records...');
                await this.app.loadDataRecords();
            }
            
            if (typeof this.app.updateDashboardFromData === 'function') {
                console.log('📊 Refreshing monolithic app dashboard...');
                await this.app.updateDashboardFromData();
            }

            // Update UI components
            this.updateSystemDisplays();

            console.log(`✅ Successfully switched to system: ${system.system_name || systemId}`);
            
            // Emit system change event
            if (this.app.eventManager) {
                this.app.eventManager.emit('system-changed', {
                    previousSystemId,
                    newSystemId: systemId,
                    system
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to switch system:', error);
            
            // Rollback on failure
            this.app.activeSystemId = previousSystemId;
            this.currentSystem = this.systems[previousSystemId] || null;
            
            this.app.showNotification('Failed to switch system', 'error');
            throw error;
        }
    }

    /**
     * Load all data for a specific system
     */
    async loadSystemData(systemId) {
        if (!systemId) return;

        console.log('📊 Loading data for system:', systemId);

        try {
            // Use the centralized data loading from dataProcessor if available
            if (this.app.dataProcessor) {
                await this.app.dataProcessor.loadAllData(systemId);
            } else {
                // Fallback: load data directly
                await this.loadSystemDataDirect(systemId);
            }

        } catch (error) {
            console.error('❌ Failed to load system data:', error);
            this.app.showNotification('Failed to load system data', 'error');
        }
    }

    /**
     * Direct system data loading (fallback)
     */
    async loadSystemDataDirect(systemId) {
        const dataPromises = [
            this.app.makeApiCall(`/data/water-quality/${systemId}`).catch(() => []),
            this.app.makeApiCall(`/fish-inventory/system/${systemId}`).catch(() => ({ tanks: [] })),
            this.app.makeApiCall(`/data/fish-health/${systemId}`).catch(() => []),
            this.app.makeApiCall(`/data/plant-growth/${systemId}`).catch(() => []),
            this.app.makeApiCall(`/data/operations/${systemId}`).catch(() => []),
            this.app.makeApiCall(`/data/nutrients/${systemId}`).catch(() => [])
        ];

        const [waterQuality, fishInventory, fishEvents, plantGrowth, operations, nutrients] = 
            await Promise.all(dataPromises);

        // Store in app dataRecords
        this.app.dataRecords = {
            waterQuality: waterQuality || [],
            fishInventory: fishInventory || { tanks: [] },
            fishEvents: fishEvents || [],
            plantGrowth: plantGrowth || [],
            operations: operations || [],
            nutrients: nutrients || []
        };

        console.log('✅ System data loaded directly');
    }

    /**
     * Update system-related UI displays
     */
    updateSystemDisplays() {
        // Update systems list component
        if (this.app.systemsList) {
            console.log('📋 Updating systems dropdown via SystemsList component');
            this.app.systemsList.updateSystemsDropdown();
        } else {
            console.log('📋 SystemsList component not available, updating legacy dropdown directly');
            this.updateLegacySystemsDropdown();
        }

        // Update any system name displays
        const systemNameElements = document.querySelectorAll('[data-system-name]');
        systemNameElements.forEach(element => {
            element.textContent = this.currentSystem?.system_name || `System ${this.app.activeSystemId}`;
        });

        // Update system info in headers/titles
        this.updateSystemHeaders();
    }

    /**
     * Update legacy systems dropdown when SystemsList component is not available
     */
    updateLegacySystemsDropdown() {
        const selectElement = document.getElementById('active-system');
        if (!selectElement) {
            console.warn('⚠️ Legacy dropdown (#active-system) not found in DOM');
            return;
        }

        console.log(`🔄 Updating legacy dropdown with ${Object.keys(this.systems).length} systems`);
        
        // Clear existing options
        selectElement.innerHTML = '';

        // Add systems to select
        const systemIds = Object.keys(this.systems);
        
        if (systemIds.length === 0) {
            selectElement.innerHTML = '<option value="">No systems available</option>';
            selectElement.style.display = 'none';
        } else {
            // Show the select element
            selectElement.style.display = 'block';
            console.log('✅ Legacy dropdown made visible with', systemIds.length, 'systems');
            
            // Add default option
            selectElement.innerHTML = '<option value="">Select a system...</option>';
            
            // Add system options
            systemIds.forEach(systemId => {
                const system = this.systems[systemId];
                const option = document.createElement('option');
                option.value = systemId;
                option.textContent = system.system_name || `System ${systemId}`;
                
                // Mark as selected if this is the active system
                if (systemId == this.app.activeSystemId) {
                    option.selected = true;
                }
                
                selectElement.appendChild(option);
            });
            
            console.log(`✅ Added ${systemIds.length} system options to legacy dropdown`);
        }
    }

    /**
     * Update system headers and titles
     */
    updateSystemHeaders() {
        const system = this.getCurrentSystem();
        if (!system) return;

        // Update main header if it exists
        const headerTitle = document.querySelector('.system-title, .header-system-name');
        if (headerTitle) {
            headerTitle.textContent = system.system_name || `System ${system.id}`;
        }

        // Update page title
        document.title = `${system.system_name || 'Afraponix Go'} - Aquaponics Management`;
    }

    /**
     * Create a new system
     */
    async createSystem(systemData) {
        try {
            console.log('🏗️ Creating new system:', systemData.system_name);
            
            const newSystem = await SystemsAPI.createDemoSystem(systemData);
            
            if (newSystem && newSystem.id) {
                // Add to local systems
                this.systems[newSystem.id] = newSystem;
                
                // Switch to new system
                await this.switchToSystem(newSystem.id);
                
                this.app.showNotification(`System "${systemData.system_name}" created successfully!`, 'success');
                
                console.log('✅ System created:', newSystem.id);
                return newSystem;
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error) {
            console.error('❌ Failed to create system:', error);
            this.app.showNotification('Failed to create system. Please try again.', 'error');
            throw error;
        }
    }

    /**
     * Update system configuration
     */
    async updateSystem(systemId, updateData) {
        try {
            console.log('🔄 Updating system:', systemId);
            
            const updatedSystem = await SystemsAPI.updateSystem(systemId, updateData);
            
            // Update local copy
            this.systems[systemId] = { ...this.systems[systemId], ...updatedSystem };
            
            if (systemId === this.app.activeSystemId) {
                this.currentSystem = this.systems[systemId];
                this.updateSystemDisplays();
            }
            
            this.app.showNotification('System updated successfully', 'success');
            
            console.log('✅ System updated:', systemId);
            return updatedSystem;
            
        } catch (error) {
            console.error('❌ Failed to update system:', error);
            this.app.showNotification('Failed to update system', 'error');
            throw error;
        }
    }

    /**
     * Delete a system
     */
    async deleteSystem(systemId) {
        if (!systemId) return;

        try {
            console.log('🗑️ Deleting system:', systemId);
            
            // Confirm deletion
            const confirmed = await this.app.showCustomConfirm(
                'Delete System',
                'Are you sure you want to delete this system? This action cannot be undone.',
                ['All data associated with this system will be permanently removed.']
            );

            if (!confirmed) {
                return false;
            }

            await SystemsAPI.deleteSystem(systemId);
            
            // Remove from local systems
            delete this.systems[systemId];
            
            // Switch to different system if this was active
            if (systemId === this.app.activeSystemId) {
                const remainingSystems = Object.keys(this.systems);
                if (remainingSystems.length > 0) {
                    await this.switchToSystem(remainingSystems[0]);
                } else {
                    this.app.activeSystemId = null;
                    this.currentSystem = null;
                    StorageUtils.removeItem('activeSystemId');
                }
            }
            
            this.app.showNotification('System deleted successfully', 'success');
            
            console.log('✅ System deleted:', systemId);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to delete system:', error);
            this.app.showNotification('Failed to delete system', 'error');
            throw error;
        }
    }

    /**
     * Get current system information
     */
    getCurrentSystem() {
        return this.currentSystem;
    }

    /**
     * Get all systems
     */
    getAllSystems() {
        return this.systems;
    }

    /**
     * Get system by ID
     */
    getSystem(systemId) {
        return this.systems[systemId] || null;
    }

    /**
     * Check if system exists
     */
    hasSystem(systemId) {
        return !!this.systems[systemId];
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        const totalSystems = Object.keys(this.systems).length;
        const activeSystem = this.getCurrentSystem();
        
        return {
            totalSystems,
            activeSystemId: this.app.activeSystemId,
            activeSystemName: activeSystem?.system_name || null,
            systemsLoaded: totalSystems > 0
        };
    }

    /**
     * Refresh systems list
     */
    async refresh() {
        await this.loadSystems();
        this.updateSystemDisplays();
    }
}