// Systems List Component
// Handles system selection, creation, and management UI

/**
 * Systems List Component  
 * Manages the systems dropdown, creation, and selection interface
 */
export default class SystemsList {
    constructor(app) {
        this.app = app;
        this.systems = {};
        this.loadingState = false;
    }

    /**
     * Initialize the systems list component
     */
    async initialize() {
        this.setupSystemsDropdown();
        // Don't load systems here - wait for authentication
        // Systems will be loaded when systemManager calls updateSystemsDropdown()
        console.log('🏗️ Systems list component initialized (waiting for auth)');
    }

    /**
     * Setup systems dropdown and related UI elements
     */
    setupSystemsDropdown() {
        // Setup dropdown toggle
        const systemsDropdown = document.querySelector('#systems-dropdown-toggle');
        if (systemsDropdown) {
            systemsDropdown.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSystemsDropdown();
            });
        }

        // Setup click outside to close
        document.addEventListener('click', (e) => {
            const dropdown = document.querySelector('#systems-dropdown');
            const toggle = document.querySelector('#systems-dropdown-toggle');
            
            if (dropdown && toggle && 
                !dropdown.contains(e.target) && 
                !toggle.contains(e.target)) {
                this.closeSystemsDropdown();
            }
        });
    }

    /**
     * Load and display systems
     */
    async loadSystems() {
        if (this.loadingState) return;
        
        this.loadingState = true;
        console.log('🔄 SystemsList: Loading systems...');

        try {
            const response = await this.app.makeApiCall('/systems');
            this.systems = {};
            
            if (response && Array.isArray(response)) {
                response.forEach(system => {
                    this.systems[system.id] = system;
                });
                
                console.log(`✅ SystemsList: Loaded ${response.length} systems:`, Object.keys(this.systems));
                console.log('🔍 SystemsList: System details:', response);
                this.updateSystemsDropdown();
                
                // Auto-select first system if none selected
                if (!this.app.activeSystemId && response.length > 0) {
                    await this.selectSystem(response[0].id);
                }
            } else {
                console.warn('⚠️ No systems found or invalid response');
                this.updateSystemsDropdown();
            }
        } catch (error) {
            console.error('❌ Failed to load systems:', error);
            this.app.showNotification('Failed to load systems', 'error');
            this.updateSystemsDropdown();
        } finally {
            this.loadingState = false;
        }
    }

    /**
     * Update the systems dropdown UI
     */
    updateSystemsDropdown() {
        console.log('🔄 SystemsList.updateSystemsDropdown() called');
        
        // Support both new dropdown and legacy select element
        const dropdown = document.querySelector('#systems-dropdown .dropdown-menu');
        const toggle = document.querySelector('#systems-dropdown-toggle');
        const legacySelect = document.getElementById('active-system');
        
        console.log('🔍 Element search results:', {
            dropdown: !!dropdown,
            toggle: !!toggle,
            legacySelect: !!legacySelect,
            systemsCount: Object.keys(this.systems).length
        });
        
        // Handle legacy select element (current HTML)
        if (legacySelect) {
            console.log('📝 Updating legacy select element');
            this.updateLegacySystemSelect(legacySelect);
        }
        
        // Handle new dropdown component (if present)
        if (dropdown) {
            console.log('📝 Updating modern dropdown');
            this.updateModernSystemDropdown(dropdown, toggle);
        }
        
        if (!dropdown && !legacySelect) {
            console.warn('⚠️ No systems dropdown found in DOM (neither #active-system nor #systems-dropdown)');
        }
    }

    /**
     * Update legacy select element
     */
    updateLegacySystemSelect(selectElement) {
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
            console.log('✅ SystemsList: Select element made visible with', systemIds.length, 'systems');
            
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
            
            // Add change event listener if not already added
            if (!selectElement.hasAttribute('data-listener-added')) {
                selectElement.addEventListener('change', (e) => {
                    if (e.target.value) {
                        this.selectSystem(e.target.value);
                    }
                });
                selectElement.setAttribute('data-listener-added', 'true');
            }
        }
    }

    /**
     * Update modern dropdown component
     */
    updateModernSystemDropdown(dropdown, toggle) {
        // Clear existing items
        dropdown.innerHTML = '';

        // Add systems to dropdown
        const systemIds = Object.keys(this.systems);
        
        if (systemIds.length === 0) {
            dropdown.innerHTML = `
                <div class="dropdown-item disabled">
                    <span class="text-muted">No systems available</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" onclick="app.systemsList.showCreateSystemModal()">
                    <span style="color: var(--color-deep-blue);">+ Create New System</span>
                </div>
            `;
        } else {
            // Add system options
            systemIds.forEach(systemId => {
                const system = this.systems[systemId];
                const isActive = systemId == this.app.activeSystemId;
                
                const item = document.createElement('div');
                item.className = `dropdown-item ${isActive ? 'active' : ''}`;
                item.style.cursor = 'pointer';
                item.onclick = () => this.selectSystem(systemId);
                
                item.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: ${isActive ? '600' : '400'};">
                                ${system.system_name || `System ${systemId}`}
                            </div>
                            ${system.location ? `<small class="text-muted">${system.location}</small>` : ''}
                        </div>
                        ${isActive ? '<span style="color: var(--color-bio-green);">✓</span>' : ''}
                    </div>
                `;
                
                dropdown.appendChild(item);
            });

            // Add divider and create new option
            dropdown.innerHTML += `
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" onclick="app.systemsList.showCreateSystemModal()" style="cursor: pointer;">
                    <span style="color: var(--color-deep-blue);">+ Create New System</span>
                </div>
            `;
        }

        // Update toggle button text
        if (toggle) {
            const activeSystem = this.systems[this.app.activeSystemId];
            const displayText = activeSystem ? 
                (activeSystem.system_name || `System ${this.app.activeSystemId}`) : 
                'Select System';
            
            const toggleText = toggle.querySelector('.system-name') || toggle;
            toggleText.textContent = displayText;
        }
    }

    /**
     * Select a system
     */
    async selectSystem(systemId) {
        if (systemId === this.app.activeSystemId) {
            this.closeSystemsDropdown();
            return;
        }

        console.log('🔄 Switching to system:', systemId);
        
        try {
            this.app.activeSystemId = systemId;
            localStorage.setItem('activeSystemId', systemId);
            
            this.closeSystemsDropdown();
            this.updateSystemsDropdown();
            
            // Trigger system switch in main app
            if (this.app.switchToSystem) {
                await this.app.switchToSystem(systemId);
            }
            
            const system = this.systems[systemId];
            const systemName = system?.system_name || `System ${systemId}`;
            this.app.showNotification(`Switched to ${systemName}`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to switch system:', error);
            this.app.showNotification('Failed to switch system', 'error');
        }
    }

    /**
     * Toggle systems dropdown
     */
    toggleSystemsDropdown() {
        const dropdown = document.querySelector('#systems-dropdown .dropdown-menu');
        if (!dropdown) return;

        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            this.closeSystemsDropdown();
        } else {
            this.openSystemsDropdown();
        }
    }

    /**
     * Open systems dropdown
     */
    openSystemsDropdown() {
        const dropdown = document.querySelector('#systems-dropdown .dropdown-menu');
        if (dropdown) {
            dropdown.style.display = 'block';
            
            // Load systems if not already loaded
            if (Object.keys(this.systems).length === 0) {
                this.loadSystems();
            }
        }
    }

    /**
     * Close systems dropdown
     */
    closeSystemsDropdown() {
        const dropdown = document.querySelector('#systems-dropdown .dropdown-menu');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    /**
     * Show create system modal
     */
    showCreateSystemModal() {
        this.closeSystemsDropdown();
        
        // Trigger the existing modal (assuming it exists in the main app)
        const createBtn = document.querySelector('[onclick*="createSystem"], .create-system-btn');
        if (createBtn) {
            createBtn.click();
        } else {
            // Fallback to manual modal creation
            this.createSystemModal();
        }
    }

    /**
     * Create system modal (fallback)
     */
    createSystemModal() {
        const modalHTML = `
            <div id="create-system-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <h3 style="margin: 0 0 20px 0; color: #333;">Create New System</h3>
                    
                    <form id="create-system-form">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500;">System Name</label>
                            <input type="text" id="system-name" name="system_name" required 
                                style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;" 
                                placeholder="Enter system name">
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Location (Optional)</label>
                            <input type="text" id="system-location" name="location"
                                style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;" 
                                placeholder="Enter location">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Description (Optional)</label>
                            <textarea id="system-description" name="description" rows="3"
                                style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;" 
                                placeholder="Brief description of your system"></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button type="button" onclick="this.closest('#create-system-modal').remove()" 
                                style="background: #f5f5f5; color: #666; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                Cancel
                            </button>
                            <button type="submit" 
                                style="background: var(--color-deep-blue); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                Create System
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Handle form submission
        const form = document.getElementById('create-system-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateSystem(form);
        });

        // Focus on name input
        document.getElementById('system-name').focus();
    }

    /**
     * Handle create system form submission
     */
    async handleCreateSystem(form) {
        const formData = new FormData(form);
        const systemData = {
            system_name: formData.get('system_name'),
            location: formData.get('location') || null,
            description: formData.get('description') || null
        };

        try {
            const response = await this.app.makeApiCall('/systems', {
                method: 'POST',
                body: JSON.stringify(systemData)
            });

            if (response && response.id) {
                this.systems[response.id] = response;
                await this.selectSystem(response.id);
                
                const modal = document.getElementById('create-system-modal');
                if (modal) modal.remove();
                
                this.app.showNotification(`System "${systemData.system_name}" created successfully!`, 'success');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Failed to create system:', error);
            this.app.showNotification('Failed to create system. Please try again.', 'error');
        }
    }

    /**
     * Get current system info
     */
    getCurrentSystem() {
        return this.systems[this.app.activeSystemId] || null;
    }

    /**
     * Get all systems
     */
    getAllSystems() {
        return this.systems;
    }

    /**
     * Refresh systems list
     */
    async refresh() {
        await this.loadSystems();
    }
}