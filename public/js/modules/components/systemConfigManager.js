// System Configuration Manager Component
// Handles system settings, grow bed configuration, and system setup

/**
 * System Configuration Manager Component Class
 * Manages system configuration, grow bed setup, and system settings
 */
export class SystemConfigManagerComponent {
    constructor(app) {
        this.app = app;
        this.currentSystemConfig = null;
        this.configurationData = {};
        
        console.log('⚙️ System Configuration Manager Component initialized');
    }

    /**
     * Load system configuration interface
     * Complexity: 15, Lines: 30+
     */
    async loadSystemConfiguration() {
        try {
            if (!this.app.activeSystemId) {
                this.displayNoSystemMessage();
                return;
            }

            // Load current system configuration
            await this.loadCurrentSystemConfig();

            // Generate configuration interface
            this.generateSystemConfigInterface();

            // Populate static HTML fields in "Overall System" tab
            this.populateOverallSystemTab();

            // Load grow bed configuration
            await this.loadGrowBedConfiguration();

        } catch (error) {
            console.error('Error loading system configuration:', error);
            this.app.showNotification('Failed to load system configuration', 'error');
        }
    }

    /**
     * Display no system selected message
     * Complexity: 5, Lines: 10
     */
    displayNoSystemMessage() {
        const container = document.getElementById('system-config-content');
        if (container) {
            container.innerHTML = `
                <div class="no-system-message">
                    <h3>No System Selected</h3>
                    <p>Please select or create a system to configure settings.</p>
                    <button class="btn-success" onclick="app.showSystemCreationWizard()">Create New System</button>
                </div>
            `;
        }
    }

    /**
     * Load current system configuration data
     * Complexity: 10, Lines: 20
     */
    async loadCurrentSystemConfig() {
        try {
            const response = await this.app.makeApiCall(`/systems/${this.app.activeSystemId}`);
            this.currentSystemConfig = response.system || {};

            // Calculate totals from individual configurations if available
            let calculatedFishVolume = this.currentSystemConfig.total_fish_volume || 0;
            let calculatedGrowBedVolume = this.currentSystemConfig.total_grow_bed_volume || 0;

            // Try to get individual tank configurations
            try {
                const tanksResponse = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
                console.log('🐟 Tank API Response:', tanksResponse);
                if (tanksResponse.tanks && tanksResponse.tanks.length > 0) {
                    calculatedFishVolume = tanksResponse.tanks.reduce((sum, tank) => {
                        const volume = parseFloat(tank.volume_liters) || 0;
                        console.log(`  Tank ${tank.tank_number}: ${volume}L`);
                        return sum + volume;
                    }, 0);
                    console.log(`✅ Calculated total fish volume: ${calculatedFishVolume}L from ${tanksResponse.tanks.length} tanks`);
                }
            } catch (error) {
                console.warn('⚠️ Could not load individual tank configurations:', error);
            }

            // Try to get individual grow bed configurations
            try {
                const bedsResponse = await this.app.makeApiCall(`/systems/${this.app.activeSystemId}/grow-beds`);
                console.log('🌱 Grow Bed API Response:', bedsResponse);
                if (bedsResponse.beds && bedsResponse.beds.length > 0) {
                    calculatedGrowBedVolume = bedsResponse.beds.reduce((sum, bed) => {
                        const volume = parseFloat(bed.volume_liters) ||
                                      (parseFloat(bed.length_m) * parseFloat(bed.width_m) * parseFloat(bed.depth_m) * 1000) || 0;
                        console.log(`  Bed ${bed.bed_number}: ${volume}L`);
                        return sum + volume;
                    }, 0);
                    console.log(`✅ Calculated total grow bed volume: ${calculatedGrowBedVolume}L from ${bedsResponse.beds.length} beds`);
                }
            } catch (error) {
                console.warn('⚠️ Could not load individual grow bed configurations:', error);
            }

            // Store configuration data for easy access
            this.configurationData = {
                name: this.currentSystemConfig.name || '',
                type: this.currentSystemConfig.type || 'dwc',
                fish_tank_count: this.currentSystemConfig.fish_tank_count || 1,
                grow_bed_count: this.currentSystemConfig.grow_bed_count || 1,
                total_fish_volume: calculatedFishVolume || 1000,
                total_grow_bed_volume: calculatedGrowBedVolume || 500,
                total_grow_area: this.currentSystemConfig.total_grow_area || 0,
                notes: this.currentSystemConfig.notes || ''
            };

        } catch (error) {
            console.error('Error loading current system config:', error);
            this.configurationData = {};
        }
    }

    /**
     * Populate static HTML fields in "Overall System" tab
     * Complexity: 5, Lines: 20
     */
    populateOverallSystemTab() {
        // Populate system name
        const systemNameField = document.getElementById('system-name');
        if (systemNameField) {
            systemNameField.value = this.configurationData.name || '';
        }

        // Populate system type dropdown
        const systemTypeField = document.getElementById('system-type-config');
        if (systemTypeField) {
            systemTypeField.value = this.configurationData.type || 'dwc';
        }

        // Populate fish tank count
        const fishTankCountField = document.getElementById('fish-tank-count');
        if (fishTankCountField) {
            fishTankCountField.value = this.configurationData.fish_tank_count || 1;
        }

        // Populate total fish volume (readonly field)
        const totalFishVolumeField = document.getElementById('total-fish-volume');
        if (totalFishVolumeField) {
            totalFishVolumeField.value = this.configurationData.total_fish_volume || 0;
        }

        // Populate grow bed count
        const growBedCountField = document.getElementById('grow-bed-count');
        if (growBedCountField) {
            growBedCountField.value = this.configurationData.grow_bed_count || 1;
        }

        // Populate total grow area (readonly field)
        const totalGrowAreaField = document.getElementById('total-grow-area');
        if (totalGrowAreaField) {
            totalGrowAreaField.value = this.configurationData.total_grow_area || 0;
        }

        // Populate total grow bed volume (readonly display div)
        const totalGrowVolumeDisplay = document.getElementById('total-grow-volume-display');
        if (totalGrowVolumeDisplay) {
            const volume = this.configurationData.total_grow_bed_volume || 0;
            totalGrowVolumeDisplay.textContent = `Auto-calculated: ${volume} L`;
        }

        console.log('✅ Populated Overall System tab with:', this.configurationData);
    }

    /**
     * Generate system configuration interface
     * Complexity: 20, Lines: 80+
     */
    generateSystemConfigInterface() {
        const container = document.getElementById('system-config-content');
        if (!container) return;

        container.innerHTML = `
            <div class="system-config-container">
                <div class="config-header">
                    <h3>
                        <img src="icons/new-icons/Afraponix Go Icons_ecosystem.svg" alt="System Config" style="width: 18px; height: 18px; vertical-align: text-bottom; margin-right: 6px;">
                        System Configuration
                    </h3>
                </div>

                <form id="system-config-form" class="config-form">
                    <div class="config-section">
                        <h4>Basic Information</h4>
                        <div class="form-row">
                            <div class="form-field">
                                <label for="system-name">System Name:</label>
                                <input type="text" id="system-name" name="name" 
                                       value="${this.configurationData.name}"
                                       placeholder="My Aquaponics System">
                            </div>
                            <div class="form-field">
                                <label for="system-type">System Type:</label>
                                <select id="system-type" name="type">
                                    <option value="aquaponics" ${this.configurationData.type === 'aquaponics' ? 'selected' : ''}>Aquaponics</option>
                                    <option value="dwc" ${this.configurationData.type === 'dwc' ? 'selected' : ''}>Deep Water Culture (DWC)</option>
                                    <option value="media_bed" ${this.configurationData.type === 'media_bed' ? 'selected' : ''}>Media Bed</option>
                                    <option value="nft" ${this.configurationData.type === 'nft' ? 'selected' : ''}>Nutrient Film Technique (NFT)</option>
                                    <option value="hybrid" ${this.configurationData.type === 'hybrid' ? 'selected' : ''}>Hybrid System</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="config-section">
                        <h4>System Components</h4>
                        <div class="form-row">
                            <div class="form-field">
                                <label for="fish-tank-count">Number of Fish Tanks:</label>
                                <input type="number" id="fish-tank-count" name="fish_tank_count" 
                                       value="${this.configurationData.fish_tank_count}"
                                       min="1" max="20">
                            </div>
                            <div class="form-field">
                                <label for="grow-bed-count">Number of Grow Beds:</label>
                                <input type="number" id="grow-bed-count" name="grow_bed_count" 
                                       value="${this.configurationData.grow_bed_count}"
                                       min="1" max="50"
                                       onchange="app.systemConfigManager.updateGrowBedConfiguration()">
                            </div>
                        </div>
                    </div>

                    <div class="config-section">
                        <h4>System Volumes</h4>
                        <div class="form-row">
                            <div class="form-field">
                                <label for="total-fish-volume">Total Fish Tank Volume (L):</label>
                                <input type="number" id="total-fish-volume" name="total_fish_volume" 
                                       value="${this.configurationData.total_fish_volume}"
                                       min="100" step="50">
                            </div>
                            <div class="form-field">
                                <label for="total-grow-bed-volume">Total Grow Bed Volume (L):</label>
                                <input type="number" id="total-grow-bed-volume" name="total_grow_bed_volume" 
                                       value="${this.configurationData.total_grow_bed_volume}"
                                       min="50" step="25">
                            </div>
                        </div>
                    </div>

                    <div class="config-section">
                        <h4>Additional Notes</h4>
                        <div class="form-field">
                            <label for="system-notes">System Notes:</label>
                            <textarea id="system-notes" name="notes" rows="3" 
                                      placeholder="Any additional information about your system...">${this.configurationData.notes}</textarea>
                        </div>
                    </div>

                    <div class="config-actions">
                        <button type="button" class="btn-success" onclick="app.systemConfigManager.saveSystemConfig()">
                            Save Configuration
                        </button>
                        <button type="button" class="btn-secondary" onclick="app.systemConfigManager.resetConfiguration()">
                            Reset to Defaults
                        </button>
                    </div>
                </form>

                <div class="grow-beds-config-section">
                    <h4>
                        <img src="icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Grow Beds" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 6px;">
                        Grow Bed Configuration
                    </h4>
                    <div id="grow-beds-config-container">
                        <!-- Grow bed configuration will be generated here -->
                    </div>
                </div>
            </div>
        `;

        // Generate grow bed configuration forms
        this.generateGrowBedConfiguration(this.configurationData.grow_bed_count);
        
        // Load existing bed data after forms are generated
        setTimeout(async () => {
            await this.loadGrowBedConfiguration();
        }, 500); // Increased delay to ensure forms are ready
    }

    /**
     * Generate grow bed configuration forms
     * Complexity: 25, Lines: 100+
     */
    generateGrowBedConfiguration(bedCount) {
        const container = document.getElementById('grow-beds-config-container');
        if (!container) return;

        // If no bedCount provided, try to get it from current system data
        if (!bedCount || bedCount < 1) {
            // Try to get from configuration data
            if (this.configurationData && this.configurationData.grow_bed_count > 0) {
                bedCount = this.configurationData.grow_bed_count;
            }
            // Try to get from systems data
            else if (this.app.systems && this.app.systems[this.app.activeSystemId]) {
                bedCount = this.app.systems[this.app.activeSystemId].grow_bed_count;
            }
            // Still no valid bedCount
            if (!bedCount || bedCount < 1) {
                container.innerHTML = '<p class="no-data">Please specify the number of grow beds in system configuration.</p>';
                return;
            }
        }

        // Use the modular grow bed form component instead of static HTML
        if (window.growBedManager && window.growBedManager.generateGrowBedConfiguration) {
            // Delegate to the modular grow bed system which has dynamic field switching
            try {
                window.growBedManager.generateGrowBedConfiguration(bedCount);
                return; // Exit early as the modular system handles everything
            } catch (error) {
                console.error('Error with modular grow bed system:', error);
                // Fall back to basic form below if modular system fails
            }
        }

        // Fallback: Basic form without dynamic field switching
        let html = '<div class="grow-beds-grid">';
        
        for (let i = 1; i <= bedCount; i++) {
            html += `
                <div class="grow-bed-config-card" data-bed-number="${i}">
                    <div class="bed-config-header">
                        <h5>Grow Bed ${i}</h5>
                    </div>
                    <div class="bed-config-form">
                        <div class="form-row">
                            <div class="form-field">
                                <label for="bed-${i}-name">Bed Name:</label>
                                <input type="text" id="bed-${i}-name" name="bed_${i}_name" 
                                       placeholder="Bed ${i}" value="Bed ${i}">
                            </div>
                            <div class="form-field">
                                <label for="bed-${i}-type">Bed Type:</label>
                                <select id="bed-${i}-type" name="bed_${i}_type" onchange="this.updateBedTypeFields?.(${i})">
                                    <option value="dwc">Deep Water Culture</option>
                                    <option value="media_bed">Media Bed</option>
                                    <option value="nft">NFT Channel</option>
                                    <option value="raft">Raft System</option>
                                    <option value="vertical">Vertical Tower</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label for="bed-${i}-length">Length (cm):</label>
                                <input type="number" id="bed-${i}-length" name="bed_${i}_length" 
                                       min="10" step="10" placeholder="120">
                            </div>
                            <div class="form-field">
                                <label for="bed-${i}-width">Width (cm):</label>
                                <input type="number" id="bed-${i}-width" name="bed_${i}_width" 
                                       min="10" step="10" placeholder="60">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label for="bed-${i}-depth">Depth (cm):</label>
                                <input type="number" id="bed-${i}-depth" name="bed_${i}_depth" 
                                       min="5" step="5" placeholder="20">
                            </div>
                            <div class="form-field">
                                <label for="bed-${i}-volume">Volume (L):</label>
                                <input type="number" id="bed-${i}-volume" name="bed_${i}_volume" 
                                       min="10" step="10" placeholder="144" readonly>
                            </div>
                        </div>

                        <div class="form-field">
                            <label for="bed-${i}-media">Growing Media:</label>
                            <select id="bed-${i}-media" name="bed_${i}_media">
                                <option value="none">None (DWC/NFT)</option>
                                <option value="expanded_clay">Expanded Clay Pebbles</option>
                                <option value="gravel">Gravel</option>
                                <option value="perlite">Perlite</option>
                                <option value="vermiculite">Vermiculite</option>
                                <option value="rockwool">Rockwool</option>
                                <option value="coco_coir">Coco Coir</option>
                                <option value="mixed">Mixed Media</option>
                            </select>
                        </div>

                        <div class="form-field">
                            <label for="bed-${i}-notes">Notes:</label>
                            <textarea id="bed-${i}-notes" name="bed_${i}_notes" rows="2" 
                                      placeholder="Additional bed-specific notes..."></textarea>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        html += `
            <div class="grow-beds-actions">
                <button type="button" class="btn-success" onclick="app.systemConfigManager.saveGrowBedConfiguration()">
                    Save Grow Bed Configuration
                </button>
                <button type="button" class="btn-secondary" onclick="app.systemConfigManager.calculateTotalVolumes()">
                    Calculate Total Volumes
                </button>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for automatic volume calculation
        this.setupVolumeCalculation(bedCount);
    }

    /**
     * Setup automatic volume calculation for grow beds
     * Complexity: 12, Lines: 20
     */
    setupVolumeCalculation(bedCount) {
        for (let i = 1; i <= bedCount; i++) {
            const lengthInput = document.getElementById(`bed-${i}-length`);
            const widthInput = document.getElementById(`bed-${i}-width`);
            const depthInput = document.getElementById(`bed-${i}-depth`);
            const volumeInput = document.getElementById(`bed-${i}-volume`);

            const calculateVolume = () => {
                const length = parseFloat(lengthInput?.value) || 0;
                const width = parseFloat(widthInput?.value) || 0;
                const depth = parseFloat(depthInput?.value) || 0;
                
                // Volume in liters = (length * width * depth) / 1000
                const volume = Math.round((length * width * depth) / 1000);
                if (volumeInput) {
                    volumeInput.value = volume;
                }
            };

            [lengthInput, widthInput, depthInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', calculateVolume);
                }
            });
        }
    }

    /**
     * Update grow bed configuration when bed count changes
     * Complexity: 8, Lines: 12
     */
    updateGrowBedConfiguration() {
        const bedCountInput = document.getElementById('grow-bed-count');
        if (!bedCountInput) return;

        const bedCount = parseInt(bedCountInput.value) || 1;
        this.generateGrowBedConfiguration(bedCount);
    }

    /**
     * Load existing grow bed configuration
     * Complexity: 15, Lines: 40+
     */
    async loadGrowBedConfiguration() {
        try {
            const response = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
            const growBeds = response || [];

            // Store grow beds in app for use by other components
            this.app.allGrowBeds = growBeds;

            // Use the grow bed manager's loadExistingConfiguration method if available
            if (window.growBedManager) {
                if (window.growBedManager.list && window.growBedManager.list.loadExistingConfiguration) {
                    await window.growBedManager.list.loadExistingConfiguration(this.app.activeSystemId);
                    return;
                } else if (window.growBedManager.loadExistingConfiguration) {
                    await window.growBedManager.loadExistingConfiguration(this.app.activeSystemId);
                    return;
                }
            }

            // Fallback: Basic field population
            growBeds.forEach(bed => {
                const bedNumber = bed.bed_number || bed.id;
                const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);

                if (bedItem) {
                    const typeSelect = bedItem.querySelector('.bed-type');
                    if (typeSelect && bed.bed_type) {
                        typeSelect.value = bed.bed_type;
                        if (window.growBedForm && window.growBedForm.updateBedFields) {
                            window.growBedForm.updateBedFields(bedNumber);
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading grow bed configuration:', error);
        }
    }

    /**
     * Set form field value safely
     * Complexity: 5, Lines: 8
     */
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value !== null && value !== undefined) {
            field.value = value;
        }
    }

    /**
     * Save system configuration
     * Complexity: 20, Lines: 40+
     */
    async saveSystemConfig() {
        try {
            if (!this.app.activeSystemId) {
                this.app.showNotification('Please select or create a system first.', 'warning');
                return;
            }

            const form = document.getElementById('system-config-form');
            if (!form) return;

            const formData = new FormData(form);
            const configData = {
                name: formData.get('name'),
                type: formData.get('type'),
                fish_tank_count: parseInt(formData.get('fish_tank_count')) || 1,
                grow_bed_count: parseInt(formData.get('grow_bed_count')) || 1,
                total_fish_volume: parseFloat(formData.get('total_fish_volume')) || 1000,
                total_grow_bed_volume: parseFloat(formData.get('total_grow_bed_volume')) || 500,
                notes: formData.get('notes') || ''
            };

            // Validate required fields
            if (!configData.name) {
                this.app.showNotification('Please provide a system name', 'error');
                return;
            }

            const response = await this.app.makeApiCall(`/systems/${this.app.activeSystemId}`, {
                method: 'PUT',
                body: JSON.stringify(configData)
            });

            if (response.success !== false) {
                this.app.showNotification('System configuration saved successfully', 'success');
                
                // Update local configuration
                this.configurationData = configData;
                this.currentSystemConfig = { ...this.currentSystemConfig, ...configData };
                
                // Refresh system data in app
                if (this.app.loadUserData) {
                    await this.app.loadUserData('config-update');
                }
            }

        } catch (error) {
            console.error('Error saving system configuration:', error);
            this.app.showNotification('Failed to save system configuration', 'error');
        }
    }

    /**
     * Save grow bed configuration
     * Complexity: 20, Lines: 60+
     */
    async saveGrowBedConfiguration() {
        try {
            if (!this.app.activeSystemId) {
                this.app.showNotification('Please select a system first', 'warning');
                return;
            }

            const bedCount = parseInt(document.getElementById('grow-bed-count')?.value) || 1;
            const growBeds = [];

            for (let i = 1; i <= bedCount; i++) {
                const bedData = {
                    system_id: this.app.activeSystemId,
                    bed_number: i,
                    name: document.getElementById(`bed-${i}-name`)?.value || `Bed ${i}`,
                    type: document.getElementById(`bed-${i}-type`)?.value || 'dwc',
                    length: parseFloat(document.getElementById(`bed-${i}-length`)?.value) || null,
                    width: parseFloat(document.getElementById(`bed-${i}-width`)?.value) || null,
                    depth: parseFloat(document.getElementById(`bed-${i}-depth`)?.value) || null,
                    volume: parseFloat(document.getElementById(`bed-${i}-volume`)?.value) || null,
                    growing_media: document.getElementById(`bed-${i}-media`)?.value || 'none',
                    notes: document.getElementById(`bed-${i}-notes`)?.value || null
                };

                growBeds.push(bedData);
            }

            // Save all grow beds
            const response = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify({ growBeds: growBeds })
            });

            if (response.success !== false) {
                this.app.showNotification('Grow bed configuration saved successfully', 'success');
                
                // Refresh grow beds in the app
                if (this.app.updateGrowBeds) {
                    this.app.updateGrowBeds();
                }
            }

        } catch (error) {
            console.error('Error saving grow bed configuration:', error);
            this.app.showNotification('Failed to save grow bed configuration', 'error');
        }
    }

    /**
     * Calculate total volumes from grow bed configuration
     * Complexity: 15, Lines: 30+
     */
    calculateTotalVolumes() {
        const bedCount = parseInt(document.getElementById('grow-bed-count')?.value) || 1;
        let totalGrowBedVolume = 0;

        for (let i = 1; i <= bedCount; i++) {
            const volume = parseFloat(document.getElementById(`bed-${i}-volume`)?.value) || 0;
            totalGrowBedVolume += volume;
        }

        // Update total volume field
        const totalVolumeField = document.getElementById('total-grow-bed-volume');
        if (totalVolumeField) {
            totalVolumeField.value = totalGrowBedVolume;
        }

        // Show calculated volume
        this.app.showNotification(`Total grow bed volume calculated: ${totalGrowBedVolume}L`, 'success');
    }

    /**
     * Reset configuration to defaults
     * Complexity: 10, Lines: 20
     */
    resetConfiguration() {
        const confirmed = confirm('Are you sure you want to reset all configuration to defaults? This will clear all current settings.');
        
        if (confirmed) {
            this.configurationData = {
                name: '',
                type: 'dwc',
                fish_tank_count: 1,
                grow_bed_count: 1,
                total_fish_volume: 1000,
                total_grow_bed_volume: 500,
                notes: ''
            };
            
            this.generateSystemConfigInterface();
            this.app.showNotification('Configuration reset to defaults', 'info');
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            hasCurrentConfig: !!this.currentSystemConfig,
            configuredBedCount: this.configurationData.grow_bed_count || 0,
            configuredTankCount: this.configurationData.fish_tank_count || 0
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying System Configuration Manager component');
        this.currentSystemConfig = null;
        this.configurationData = {};
    }
}

// Export both class and create a factory function
export default SystemConfigManagerComponent;

/**
 * Factory function to create system configuration manager component
 */
export function createSystemConfigManagerComponent(app) {
    return new SystemConfigManagerComponent(app);
}