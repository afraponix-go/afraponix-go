// Forms Component
// Handles form rendering, dynamic field generation, and form UI interactions

import { CSS_CLASSES, MAGIC_NUMBERS } from '../constants/index.js';

/**
 * Forms Component Class
 * Handles dynamic form generation and form UI interactions
 */
export class FormsComponent {
    constructor() {
        this.forms = new Map();
        this.fieldTemplates = new Map();
        
        // Initialize field templates
        this.initializeFieldTemplates();
        
        console.log('📝 Forms Component initialized');
    }

    /**
     * Initialize field templates for dynamic form generation
     */
    initializeFieldTemplates() {
        // Bed type field templates
        this.fieldTemplates.set('dwc', {
            dimensions: ['length', 'width', 'depth'],
            labels: {
                length: 'Length (m)',
                width: 'Width (m)', 
                depth: 'Depth (cm)'
            },
            defaults: {
                length: '2.0',
                width: '1.0',
                depth: '20'
            },
            validation: {
                length: { min: 0.1, step: 0.1 },
                width: { min: 0.1, step: 0.1 },
                depth: { min: 5, step: 1 }
            }
        });

        this.fieldTemplates.set('nft', {
            dimensions: ['length', 'width', 'channels'],
            labels: {
                length: 'Length (m)',
                width: 'Width (m)',
                channels: 'Number of Channels'
            },
            defaults: {
                length: '3.0',
                width: '0.6',
                channels: '6'
            },
            validation: {
                length: { min: 0.1, step: 0.1 },
                width: { min: 0.1, step: 0.1 },
                channels: { min: 1, step: 1 }
            }
        });

        this.fieldTemplates.set('media', {
            dimensions: ['length', 'width', 'depth'],
            labels: {
                length: 'Length (m)',
                width: 'Width (m)',
                depth: 'Depth (cm)'
            },
            defaults: {
                length: '1.2',
                width: '1.2',
                depth: '30'
            },
            validation: {
                length: { min: 0.1, step: 0.1 },
                width: { min: 0.1, step: 0.1 },
                depth: { min: 10, step: 1 }
            }
        });
    }

    /**
     * Update bed type fields dynamically
     */
    updateBedTypeFields(bedIndex, bedType, existingData = {}, isDemo = false, demoData = null) {
        const fieldsContainer = document.getElementById(`bed-type-fields-${bedIndex}`);
        if (!fieldsContainer) return;

        if (!bedType) {
            fieldsContainer.innerHTML = '';
            return;
        }

        // Get bed data from demo or existing data
        const bedData = this.getBedData(bedIndex, existingData, isDemo, demoData);
        
        // Generate HTML for the bed type
        const html = this.generateBedTypeHTML(bedIndex, bedType, bedData);
        
        fieldsContainer.innerHTML = html;
        
        // Add event listeners for metric calculations
        this.attachBedMetricListeners(bedIndex);
    }

    /**
     * Get bed data from various sources
     */
    getBedData(bedIndex, existingData, isDemo, demoData) {
        if (isDemo && demoData?.grow_beds[bedIndex - 1]) {
            const demoBed = demoData.grow_beds[bedIndex - 1];
            return {
                area: demoBed.area_m2,
                depth: demoBed.depth,
                length: Math.sqrt(demoBed.area_m2),
                width: Math.sqrt(demoBed.area_m2)
            };
        }
        
        return {
            area: existingData?.area || '',
            depth: existingData?.depth || '',
            length: existingData?.length || '',
            width: existingData?.width || ''
        };
    }

    /**
     * Generate HTML for bed type fields
     */
    generateBedTypeHTML(bedIndex, bedType, bedData) {
        const template = this.fieldTemplates.get(bedType);
        if (!template) return '';

        let html = `
            <div class="bed-dimensions" style="margin-top: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">
                    Bed Dimensions
                </h4>
                <div class="dimension-row" style="display: grid; grid-template-columns: repeat(${template.dimensions.length}, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        `;

        // Generate dimension fields
        template.dimensions.forEach(dimension => {
            const label = template.labels[dimension];
            const defaultValue = template.defaults[dimension];
            const validation = template.validation[dimension];
            const value = bedData[dimension] || defaultValue;

            html += `
                <div class="form-field">
                    <label class="form-label">
                        <span class="label-text">${label}</span>
                    </label>
                    <input type="number" 
                           class="form-input bed-${dimension}" 
                           id="bed-${dimension}-${bedIndex}"
                           min="${validation.min}" 
                           step="${validation.step}" 
                           placeholder="${defaultValue}" 
                           value="${value}"
                           onchange="app.calculateBedMetrics(${bedIndex})" 
                           required>
                </div>
            `;
        });

        html += '</div>';

        // Add calculated metrics section
        html += this.generateMetricsSection(bedIndex, bedType);

        // Add type-specific sections
        html += this.generateTypeSpecificSections(bedIndex, bedType, bedData);

        html += '</div>';

        return html;
    }

    /**
     * Generate metrics section HTML
     */
    generateMetricsSection(bedIndex, bedType) {
        return `
            <div class="calculated-metrics" style="margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">
                    Calculated Metrics
                </h4>
                <div class="metrics-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="metric-card" style="background: #f8f9fa; padding: 0.75rem; border-radius: 6px; border-left: 3px solid var(--color-bio-green);">
                        <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem;">Total Area</div>
                        <div id="bed-area-${bedIndex}" style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            Calculate area
                        </div>
                    </div>
                    <div class="metric-card" style="background: #f8f9fa; padding: 0.75rem; border-radius: 6px; border-left: 3px solid var(--color-blue-fish);">
                        <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem;">Volume</div>
                        <div id="bed-volume-${bedIndex}" style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            Calculate volume
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate type-specific sections (planting capacity, etc.)
     */
    generateTypeSpecificSections(bedIndex, bedType, bedData) {
        let html = '';

        if (bedType === 'dwc') {
            html += this.generateDWCSpecificHTML(bedIndex, bedData);
        } else if (bedType === 'nft') {
            html += this.generateNFTSpecificHTML(bedIndex, bedData);
        } else if (bedType === 'media') {
            html += this.generateMediaSpecificHTML(bedIndex, bedData);
        }

        return html;
    }

    /**
     * Generate DWC specific HTML sections
     */
    generateDWCSpecificHTML(bedIndex, bedData) {
        return `
            <div class="dwc-specific" style="margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">
                    DWC Configuration
                </h4>
                <div class="form-field">
                    <label class="form-label">
                        <span class="label-text">Plant Spacing (cm)</span>
                    </label>
                    <select class="form-input" id="plant-spacing-${bedIndex}">
                        <option value="15">15 cm (Dense - Lettuce)</option>
                        <option value="20" selected>20 cm (Standard - Mixed leafy)</option>
                        <option value="25">25 cm (Loose - Large leafy)</option>
                        <option value="30">30 cm (Wide - Herbs)</option>
                    </select>
                </div>
                <div class="capacity-info" style="background: #e8f5e8; padding: 0.75rem; border-radius: 6px; margin-top: 1rem;">
                    <div style="font-size: 0.8rem; color: #2d5a3d; margin-bottom: 0.25rem;">Estimated Plant Capacity</div>
                    <div id="plant-capacity-${bedIndex}" style="font-size: 1.1rem; font-weight: 600; color: #2d5a3d;">
                        Calculate capacity
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate NFT specific HTML sections
     */
    generateNFTSpecificHTML(bedIndex, bedData) {
        return `
            <div class="nft-specific" style="margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">
                    NFT Configuration
                </h4>
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-field">
                        <label class="form-label">
                            <span class="label-text">Channel Spacing (cm)</span>
                        </label>
                        <input type="number" class="form-input" id="channel-spacing-${bedIndex}" 
                               min="10" step="1" value="15" placeholder="15">
                    </div>
                    <div class="form-field">
                        <label class="form-label">
                            <span class="label-text">Plant Holes per Meter</span>
                        </label>
                        <input type="number" class="form-input" id="holes-per-meter-${bedIndex}" 
                               min="5" step="1" value="8" placeholder="8">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate Media Bed specific HTML sections
     */
    generateMediaSpecificHTML(bedIndex, bedData) {
        return `
            <div class="media-specific" style="margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">
                    Media Bed Configuration
                </h4>
                <div class="form-field">
                    <label class="form-label">
                        <span class="label-text">Growing Medium</span>
                    </label>
                    <select class="form-input" id="growing-medium-${bedIndex}">
                        <option value="expanded-clay">Expanded Clay Pebbles</option>
                        <option value="gravel">Gravel</option>
                        <option value="volcanic-rock" selected>Volcanic Rock</option>
                        <option value="perlite">Perlite</option>
                    </select>
                </div>
                <div class="form-field">
                    <label class="form-label">
                        <span class="label-text">Plant Density (plants/m²)</span>
                    </label>
                    <input type="number" class="form-input" id="plant-density-${bedIndex}" 
                           min="1" step="1" value="16" placeholder="16">
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for bed metric calculations
     */
    attachBedMetricListeners(bedIndex) {
        // This would be called by the main application
        setTimeout(() => {
            const event = new CustomEvent('bedFieldsUpdated', { 
                detail: { bedIndex } 
            });
            document.dispatchEvent(event);
        }, 10);
    }

    /**
     * Calculate bed metrics (area, volume, capacity)
     */
    calculateBedMetrics(bedIndex, bedType) {
        const length = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value || 0);
        const width = parseFloat(document.getElementById(`bed-width-${bedIndex}`)?.value || 0);
        const depth = parseFloat(document.getElementById(`bed-depth-${bedIndex}`)?.value || 0);
        
        // Calculate area
        const area = length * width;
        const areaElement = document.getElementById(`bed-area-${bedIndex}`);
        if (areaElement) {
            areaElement.textContent = area > 0 ? `${area.toFixed(2)} m²` : 'Calculate area';
        }
        
        // Calculate volume
        const volume = area * (depth / 100); // Convert cm to m
        const volumeElement = document.getElementById(`bed-volume-${bedIndex}`);
        if (volumeElement) {
            volumeElement.textContent = volume > 0 ? `${volume.toFixed(2)} m³` : 'Calculate volume';
        }
        
        // Calculate plant capacity based on type
        this.calculatePlantCapacity(bedIndex, bedType, area);
    }

    /**
     * Calculate plant capacity based on bed type and spacing
     */
    calculatePlantCapacity(bedIndex, bedType, area) {
        const capacityElement = document.getElementById(`plant-capacity-${bedIndex}`);
        if (!capacityElement || area <= 0) return;

        let capacity = 0;

        if (bedType === 'dwc') {
            const spacing = parseFloat(document.getElementById(`plant-spacing-${bedIndex}`)?.value || 20);
            const spacingM = spacing / 100; // Convert to meters
            capacity = Math.floor(area / (spacingM * spacingM));
        } else if (bedType === 'nft') {
            const channels = parseFloat(document.getElementById(`bed-channels-${bedIndex}`)?.value || 6);
            const holesPerMeter = parseFloat(document.getElementById(`holes-per-meter-${bedIndex}`)?.value || 8);
            const length = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value || 0);
            capacity = Math.floor(channels * length * holesPerMeter);
        } else if (bedType === 'media') {
            const density = parseFloat(document.getElementById(`plant-density-${bedIndex}`)?.value || 16);
            capacity = Math.floor(area * density);
        }

        capacityElement.textContent = capacity > 0 ? `${capacity} plants` : 'Calculate capacity';
    }

    /**
     * Validate form fields
     */
    validateBedFields(bedIndex, bedType) {
        const template = this.fieldTemplates.get(bedType);
        if (!template) return false;

        let isValid = true;
        const errors = [];

        template.dimensions.forEach(dimension => {
            const input = document.getElementById(`bed-${dimension}-${bedIndex}`);
            if (input) {
                const value = parseFloat(input.value);
                const validation = template.validation[dimension];
                
                if (isNaN(value) || value < validation.min) {
                    isValid = false;
                    errors.push(`${template.labels[dimension]} must be at least ${validation.min}`);
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            }
        });

        return { isValid, errors };
    }

    /**
     * Get form data for a bed
     */
    getBedFormData(bedIndex, bedType) {
        const template = this.fieldTemplates.get(bedType);
        if (!template) return null;

        const data = { type: bedType };

        template.dimensions.forEach(dimension => {
            const input = document.getElementById(`bed-${dimension}-${bedIndex}`);
            if (input) {
                data[dimension] = parseFloat(input.value) || 0;
            }
        });

        // Add calculated values
        data.area = data.length * data.width;
        data.volume = data.area * (data.depth / 100);

        return data;
    }

    /**
     * Reset form fields
     */
    resetBedFields(bedIndex) {
        const fieldsContainer = document.getElementById(`bed-type-fields-${bedIndex}`);
        if (fieldsContainer) {
            fieldsContainer.innerHTML = '';
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            registeredForms: this.forms.size,
            fieldTemplates: this.fieldTemplates.size,
            availableBedTypes: Array.from(this.fieldTemplates.keys())
        };
    }
}

// Create global instance
const formsComponent = new FormsComponent();

// Export both class and instance
export { formsComponent };
export default formsComponent;