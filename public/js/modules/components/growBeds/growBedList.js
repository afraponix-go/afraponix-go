// Grow Bed List Component
// Handles the display and management of grow bed lists

/**
 * Grow Bed List Component
 * Manages the display of grow bed configurations and lists
 */
export default class GrowBedList {
    constructor(growBedService, growBedForm) {
        this.growBedService = growBedService;
        this.growBedForm = growBedForm;
    }

    /**
     * Initialize the grow bed list component
     */
    initialize() {
    }

    /**
     * Generate complete grow bed configuration interface
     */
    generateGrowBedConfiguration(bedCount) {
        const container = document.getElementById('grow-beds-config-container');
        if (!container) {
            console.warn('⚠️ Grow beds config container not found');
            return;
        }


        let html = this.generateInstructionsHeader();
        
        // Generate individual bed forms
        for (let i = 1; i <= bedCount; i++) {
            html += this.growBedForm.generateGrowBedItem(i);
        }

        container.innerHTML = html;
    }

    /**
     * Generate instructions header
     */
    generateInstructionsHeader() {
        return `
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; color: #666; font-size: 0.9rem;">
                    <strong>⚠️ Important:</strong> Configure and save each grow bed before saving system configuration.
                    <br><strong>Volume (m³):</strong> Reservoir volume for nutrient solution
                    <br><strong>Area (m²):</strong> Equivalent growing area for plant calculations
                </p>
            </div>
        `;
    }

    /**
     * Display grow bed summary for overview
     */
    displayGrowBedSummary(systemId) {
        const container = document.getElementById('grow-bed-summary');
        if (!container) return;

        // This will be called from the dashboard or overview
        this.renderGrowBedSummary(systemId, container);
    }

    /**
     * Render grow bed summary
     */
    async renderGrowBedSummary(systemId, container) {
        try {
            const beds = await this.growBedService.getGrowBedsForSystem(systemId);
            
            if (!beds || beds.length === 0) {
                container.innerHTML = this.generateEmptyBedsMessage();
                return;
            }

            const summaryHtml = this.generateBedsSummaryHtml(beds);
            container.innerHTML = summaryHtml;

        } catch (error) {
            console.error('❌ Failed to render grow bed summary:', error);
            container.innerHTML = this.generateErrorMessage();
        }
    }

    /**
     * Generate beds summary HTML
     */
    generateBedsSummaryHtml(beds) {
        const totalBeds = beds.length;
        const totalVolume = beds.reduce((sum, bed) => sum + (bed.volume_liters || 0), 0) / 1000; // Convert to m³
        const totalArea = beds.reduce((sum, bed) => sum + (bed.area_m2 || 0), 0);

        let html = `
            <div class="grow-beds-overview">
                <div class="beds-stats">
                    <div class="stat-item">
                        <div class="stat-value">${totalBeds}</div>
                        <div class="stat-label">Active Beds</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${totalVolume.toFixed(1)} m³</div>
                        <div class="stat-label">Total Volume</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${totalArea.toFixed(1)} m²</div>
                        <div class="stat-label">Growing Area</div>
                    </div>
                </div>
                <div class="beds-list">
        `;

        // Add individual bed summaries
        beds.forEach(bed => {
            html += this.generateBedSummaryItem(bed);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate individual bed summary item
     */
    generateBedSummaryItem(bed) {
        const bedTypeDisplay = this.getBedTypeDisplay(bed.bed_type);
        const volumeLiters = bed.volume_liters || 0;
        const area = bed.area_m2 || 0;

        return `
            <div class="bed-summary-item" data-bed-id="${bed.id}">
                <div class="bed-header">
                    <h4 class="bed-name">${bed.bed_name || `Bed ${bed.bed_number}`}</h4>
                    <span class="bed-type-badge">${bedTypeDisplay}</span>
                </div>
                <div class="bed-metrics">
                    <div class="metric">
                        <span class="metric-value">${(volumeLiters / 1000).toFixed(1)} m³</span>
                        <span class="metric-label">Volume</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${area.toFixed(1)} m²</span>
                        <span class="metric-label">Area</span>
                    </div>
                    ${bed.plant_capacity ? `
                    <div class="metric">
                        <span class="metric-value">${bed.plant_capacity}</span>
                        <span class="metric-label">Plant Capacity</span>
                    </div>
                    ` : ''}
                </div>
                <div class="bed-dimensions">
                    ${this.generateDimensionsDisplay(bed)}
                </div>
            </div>
        `;
    }

    /**
     * Get bed type display name
     */
    getBedTypeDisplay(bedType) {
        const typeMap = {
            'dwc': 'DWC',
            'flood-drain': 'F&D',
            'media-flow': 'MFT',
            'nft': 'NFT',
            'vertical': 'Vertical'
        };
        return typeMap[bedType] || bedType.toUpperCase();
    }

    /**
     * Generate dimensions display based on bed type
     */
    generateDimensionsDisplay(bed) {
        const type = bed.bed_type;
        
        if (type === 'vertical') {
            return `
                <small class="dimensions-text">
                    ${bed.length_meters}×${bed.width_meters}×${bed.height_meters}m base, 
                    ${bed.vertical_count || 0} verticals × ${bed.plants_per_vertical || 0} plants
                </small>
            `;
        } else if (type === 'nft') {
            return `
                <small class="dimensions-text">
                    ${bed.trough_count || 0} troughs × ${bed.trough_length || 0}m, 
                    ${bed.plant_spacing || 0}cm spacing
                </small>
            `;
        } else if (bed.length_meters && bed.width_meters && bed.height_meters) {
            return `
                <small class="dimensions-text">
                    ${bed.length_meters}×${bed.width_meters}×${bed.height_meters}m
                </small>
            `;
        }
        return '';
    }

    /**
     * Generate empty beds message
     */
    generateEmptyBedsMessage() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🏗️</div>
                <h3>No Grow Beds Configured</h3>
                <p>Configure your grow beds in Settings → System Configuration to get started.</p>
                <button class="btn btn-primary" onclick="window.app.setCurrentView('settings')">
                    Configure Grow Beds
                </button>
            </div>
        `;
    }

    /**
     * Generate error message
     */
    generateErrorMessage() {
        return `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>Failed to Load Grow Beds</h3>
                <p>There was an error loading grow bed information.</p>
                <button class="btn btn-secondary" onclick="location.reload()">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Refresh grow bed displays
     */
    async refresh(systemId) {
        
        // Refresh summary if visible
        const summaryContainer = document.getElementById('grow-bed-summary');
        if (summaryContainer) {
            await this.renderGrowBedSummary(systemId, summaryContainer);
        }

        // Refresh configuration if visible
        const configContainer = document.getElementById('grow-beds-config-container');
        if (configContainer && configContainer.children.length > 0) {
            // Reload configuration data
            await this.loadExistingConfiguration(systemId);
        }
    }

    /**
     * Load existing configuration into form
     */
    async loadExistingConfiguration(systemId) {
        try {
            const beds = await this.growBedService.getGrowBedsForSystem(systemId);
            
            beds.forEach(bed => {
                this.populateBedForm(bed);
            });

        } catch (error) {
            console.error('❌ Failed to load existing bed configuration:', error);
        }
    }

    /**
     * Populate bed form with existing data
     */
    populateBedForm(bed) {
        const bedItem = document.querySelector(`[data-bed="${bed.bed_number}"]`);
        if (!bedItem) {
            return;
        }

        // Set bed type
        const typeSelect = bedItem.querySelector('.bed-type');
        if (typeSelect) {
            typeSelect.value = bed.bed_type;
            this.growBedForm.updateBedFields(bed.bed_number);
        }

        // Populate fields based on type
        setTimeout(() => {
            this.populateFieldsBasedOnType(bedItem, bed);
        }, 100); // Wait for fields to be generated
    }

    /**
     * Populate fields based on bed type
     */
    populateFieldsBasedOnType(bedItem, bed) {
        const type = bed.bed_type;

        if (type === 'dwc' || type === 'media-flow' || type === 'flood-drain') {
            this.setInputValue(bedItem, '.bed-length', bed.length_meters);
            this.setInputValue(bedItem, '.bed-width', bed.width_meters);
            this.setInputValue(bedItem, '.bed-height', bed.height_meters);
        } else if (type === 'vertical') {
            this.setInputValue(bedItem, '.base-length', bed.length_meters);
            this.setInputValue(bedItem, '.base-width', bed.width_meters);
            this.setInputValue(bedItem, '.base-height', bed.height_meters);
            this.setInputValue(bedItem, '.vertical-count', bed.vertical_count);
            this.setInputValue(bedItem, '.plants-per-vertical', bed.plants_per_vertical);
        } else if (type === 'nft') {
            this.setInputValue(bedItem, '.trough-length', bed.trough_length);
            this.setInputValue(bedItem, '.trough-count', bed.trough_count);
            this.setInputValue(bedItem, '.plant-spacing', bed.plant_spacing);
            this.setInputValue(bedItem, '.reservoir-volume', bed.reservoir_volume_liters);
        }

        // Trigger calculation
        this.growBedForm.calculateBed(bed.bed_number);
    }

    /**
     * Helper to set input value
     */
    setInputValue(container, selector, value) {
        const input = container.querySelector(selector);
        if (input && value !== null && value !== undefined) {
            input.value = value;
        }
    }

    /**
     * Get bed statistics
     */
    getBedStatistics() {
        const bedItems = document.querySelectorAll('.grow-bed-item');
        const stats = {
            totalBeds: bedItems.length,
            configuredBeds: 0,
            totalVolume: 0,
            totalArea: 0,
            bedTypes: {}
        };

        bedItems.forEach(item => {
            const bedType = item.querySelector('.bed-type')?.value;
            if (bedType) {
                stats.configuredBeds++;
                
                // Count bed types
                stats.bedTypes[bedType] = (stats.bedTypes[bedType] || 0) + 1;
                
                // Sum volumes and areas
                const volume = parseFloat(item.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
                const area = parseFloat(item.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;
                
                stats.totalVolume += volume;
                stats.totalArea += area;
            }
        });

        return stats;
    }
}