// Grow Bed Form Component
// Handles grow bed configuration forms and input fields

/**
 * Grow Bed Form Component
 * Manages individual grow bed configuration forms with dynamic fields
 */
export default class GrowBedForm {
    constructor(growBedService, validation) {
        this.growBedService = growBedService;
        this.validation = validation;
    }

    /**
     * Generate a complete grow bed form item
     */
    generateGrowBedItem(bedNumber) {
        return `
            <div class="grow-bed-item" data-bed="${bedNumber}" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h5 style="margin: 0; color: #2c3e50;">Grow Bed ${bedNumber}</h5>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="form-btn secondary" onclick="window.growBedForm.saveBedConfiguration(${bedNumber})" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Save Bed Config</button>
                        <button type="button" class="form-btn" onclick="window.growBedForm.deleteBedConfiguration(${bedNumber})" style="font-size: 0.8rem; padding: 0.3rem 0.6rem; background: #dc3545; border-color: #dc3545;">Delete Bed</button>
                    </div>
                </div>
                
                <div class="form-field">
                    <label>Bed Type:</label>
                    <select class="bed-type" onchange="window.growBedForm.updateBedFields(${bedNumber})">
                        <option value="">Select Type</option>
                        <option value="dwc">Deep Water Culture (DWC)</option>
                        <option value="flood-drain">Flood & Drain (F&D)</option>
                        <option value="media-flow">Media Flow Through (MFT)</option>
                        <option value="nft">NFT (Nutrient Film Technique)</option>
                        <option value="vertical">Vertical Growing</option>
                    </select>
                </div>

                <div id="bed-fields-${bedNumber}" class="bed-fields" style="display: none;">
                    <!-- Dynamic fields will be inserted here -->
                </div>

                <div class="calculation-results" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <strong>Reservoir Volume (m³):</strong>
                            <span class="calculated-volume">0.0</span>
                        </div>
                        <div>
                            <strong>Equivalent Grow Area (m²):</strong>
                            <span class="calculated-area">0.0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update bed fields based on selected type
     */
    updateBedFields(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const typeSelect = bedItem.querySelector('.bed-type');
        const fieldsContainer = bedItem.querySelector(`#bed-fields-${bedNumber}`);
        const resultsContainer = bedItem.querySelector('.calculation-results');
        
        const bedType = typeSelect.value;
        
        if (!bedType) {
            fieldsContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            return;
        }

        const html = this.generateFieldsForType(bedType, bedNumber);
        fieldsContainer.innerHTML = html;
        fieldsContainer.style.display = 'block';
        resultsContainer.style.display = 'block';
        
        this.calculateBed(bedNumber);
    }

    /**
     * Generate dynamic fields based on bed type
     */
    generateFieldsForType(bedType, bedNumber) {
        switch (bedType) {
            case 'dwc':
                return this.generateDWCFields(bedNumber);
            case 'flood-drain':
                return this.generateFloodDrainFields(bedNumber);
            case 'media-flow':
                return this.generateMediaFlowFields(bedNumber);
            case 'vertical':
                return this.generateVerticalFields(bedNumber);
            case 'nft':
                return this.generateNFTFields(bedNumber);
            default:
                return '';
        }
    }

    /**
     * Generate DWC fields
     */
    generateDWCFields(bedNumber) {
        return `
            <div class="form-grid">
                <div class="form-field">
                    <label>Length (m):</label>
                    <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Width (m):</label>
                    <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Height/Depth (m):</label>
                    <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
            </div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                DWC: Volume = L×W×H, Area = L×W
            </p>
        `;
    }

    /**
     * Generate Flood & Drain fields
     */
    generateFloodDrainFields(bedNumber) {
        return `
            <div class="form-grid">
                <div class="form-field">
                    <label>Length (m):</label>
                    <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Width (m):</label>
                    <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Height/Depth (m):</label>
                    <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
            </div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                F&D: Volume = (L×W×H)/4 (media takes 75% space), Area = L×W
            </p>
        `;
    }

    /**
     * Generate Media Flow fields
     */
    generateMediaFlowFields(bedNumber) {
        return `
            <div class="form-grid">
                <div class="form-field">
                    <label>Length (m):</label>
                    <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Width (m):</label>
                    <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Height/Depth (m):</label>
                    <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
            </div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                MFT: Volume = L×W×H, Area = L×W
            </p>
        `;
    }

    /**
     * Generate Vertical Growing fields
     */
    generateVerticalFields(bedNumber) {
        return `
            <div class="form-grid">
                <div class="form-field">
                    <label>Base Length (m):</label>
                    <input type="number" class="base-length" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Base Width (m):</label>
                    <input type="number" class="base-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Base Height (m):</label>
                    <input type="number" class="base-height" min="0.1" step="0.1" placeholder="0.5" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Number of Verticals:</label>
                    <input type="number" class="vertical-count" min="1" step="1" placeholder="4" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Plants per Vertical:</label>
                    <input type="number" class="plants-per-vertical" min="1" step="1" placeholder="12" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
            </div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                Vertical: Volume = base L×W×H, Area = (verticals × plants per vertical) ÷ 25
            </p>
        `;
    }

    /**
     * Generate NFT fields
     */
    generateNFTFields(bedNumber) {
        return `
            <div class="form-grid">
                <div class="form-field">
                    <label>Trough Length (m):</label>
                    <input type="number" class="trough-length" min="0.1" step="0.1" placeholder="3.0" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Number of Troughs:</label>
                    <input type="number" class="trough-count" min="1" step="1" placeholder="4" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Plant Spacing (cm):</label>
                    <input type="number" class="plant-spacing" min="1" step="1" placeholder="15" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
                <div class="form-field">
                    <label>Reservoir Volume (L):</label>
                    <input type="number" class="reservoir-volume" min="1" step="1" placeholder="100" onchange="window.growBedForm.calculateBed(${bedNumber})">
                </div>
            </div>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                NFT: Volume = manual reservoir volume, Area = (total plants) ÷ 25<br>
                Total plants = (trough length ÷ plant spacing) × number of troughs
            </p>
        `;
    }

    /**
     * Calculate bed volume and area
     */
    calculateBed(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const typeSelect = bedItem.querySelector('.bed-type');
        const volumeSpan = bedItem.querySelector('.calculated-volume');
        const areaSpan = bedItem.querySelector('.calculated-area');
        
        const bedType = typeSelect.value;
        if (!bedType) return;

        const calculations = this.growBedService.calculateBedDimensions(bedType, this.getBedInputs(bedItem, bedType));
        
        volumeSpan.textContent = `${calculations.volume.toFixed(2)} m³`;
        areaSpan.textContent = `${calculations.area.toFixed(2)} m²`;
        
        // Update total equivalent area
        this.updateTotalEquivalentArea();
    }

    /**
     * Get bed inputs based on type
     */
    getBedInputs(bedItem, bedType) {
        const inputs = {};

        switch (bedType) {
            case 'dwc':
            case 'media-flow':
            case 'flood-drain':
                inputs.length = parseFloat(bedItem.querySelector('.bed-length')?.value) || 0;
                inputs.width = parseFloat(bedItem.querySelector('.bed-width')?.value) || 0;
                inputs.height = parseFloat(bedItem.querySelector('.bed-height')?.value) || 0;
                break;

            case 'vertical':
                inputs.baseLength = parseFloat(bedItem.querySelector('.base-length')?.value) || 0;
                inputs.baseWidth = parseFloat(bedItem.querySelector('.base-width')?.value) || 0;
                inputs.baseHeight = parseFloat(bedItem.querySelector('.base-height')?.value) || 0;
                inputs.verticalCount = parseFloat(bedItem.querySelector('.vertical-count')?.value) || 0;
                inputs.plantsPerVertical = parseFloat(bedItem.querySelector('.plants-per-vertical')?.value) || 0;
                break;

            case 'nft':
                inputs.troughLength = parseFloat(bedItem.querySelector('.trough-length')?.value) || 0;
                inputs.troughCount = parseFloat(bedItem.querySelector('.trough-count')?.value) || 0;
                inputs.plantSpacing = parseFloat(bedItem.querySelector('.plant-spacing')?.value) || 0;
                inputs.reservoirVolume = parseFloat(bedItem.querySelector('.reservoir-volume')?.value) || 0;
                break;
        }

        return inputs;
    }

    /**
     * Update total equivalent area display
     */
    updateTotalEquivalentArea() {
        const areaSpans = document.querySelectorAll('.calculated-area');
        let total = 0;

        areaSpans.forEach(span => {
            const value = parseFloat(span.textContent.replace(' m²', '')) || 0;
            total += value;
        });

        const totalInput = document.getElementById('total-grow-area');
        if (totalInput) {
            totalInput.value = total.toFixed(1);
        }
    }

    /**
     * Save bed configuration
     */
    async saveBedConfiguration(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const bedType = bedItem.querySelector('.bed-type').value;
        if (!bedType) {
            window.app.showNotification('❌ Please select a bed type first', 'error');
            return;
        }

        // Get current values
        const inputs = this.getBedInputs(bedItem, bedType);
        const volume = parseFloat(bedItem.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
        const area = parseFloat(bedItem.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;

        // Validate inputs
        const validationResult = this.validation.validateBedConfiguration(bedType, inputs);
        if (!validationResult.isValid) {
            window.app.showNotification(`❌ Please fill in: ${validationResult.missingFields.join(', ')}`, 'error');
            return;
        }

        // Build configuration
        const config = this.growBedService.buildBedConfiguration(bedNumber, bedType, inputs, volume, area);

        try {
            await this.growBedService.saveBedConfiguration(bedNumber, config);
            window.app.showNotification(`✅ Bed ${bedNumber} configuration saved`, 'success');
            
            // Refresh app data
            if (window.app.updateDashboardFromData) {
                await window.app.updateDashboardFromData();
            }
        } catch (error) {
            console.error('Failed to save bed configuration:', error);
            window.app.showNotification('❌ Failed to save bed configuration', 'error');
        }
    }

    /**
     * Delete bed configuration
     */
    async deleteBedConfiguration(bedNumber) {
        if (!confirm(`Are you sure you want to delete Grow Bed ${bedNumber} configuration? This action cannot be undone.`)) {
            return;
        }

        try {
            await this.growBedService.deleteBedConfiguration(bedNumber);
            
            // Reload grow bed configuration
            if (window.app.loadGrowBedConfiguration) {
                await window.app.loadGrowBedConfiguration();
            }
            
            window.app.showNotification(`✅ Bed ${bedNumber} configuration deleted`, 'success');
        } catch (error) {
            console.error('Failed to delete bed configuration:', error);
            window.app.showNotification('❌ Failed to delete bed configuration', 'error');
        }
    }

    /**
     * Get all bed configurations from form
     */
    getGrowBedConfiguration() {
        const bedItems = document.querySelectorAll('.grow-bed-item');
        const configuration = [];

        bedItems.forEach((item, index) => {
            const bedNumber = index + 1;
            const bedType = item.querySelector('.bed-type').value;

            if (!bedType) return;

            const inputs = this.getBedInputs(item, bedType);
            const volume = parseFloat(item.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
            const area = parseFloat(item.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;

            const config = this.growBedService.buildBedConfiguration(bedNumber, bedType, inputs, volume, area);
            configuration.push(config);
        });

        return configuration;
    }
}