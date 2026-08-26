// Grow Bed Data Processor Service
// Handles transformation and processing of grow bed data for API consumption

export class GrowBedDataProcessor {
    constructor(app) {
        this.app = app;
    }

    /**
     * Transform grow beds data from form format to API format
     * @param {Array} growBeds - Array of grow bed objects from form
     * @returns {Array} Transformed grow bed data ready for API
     */
    transformGrowBedsForAPI(growBeds) {
        if (!growBeds || !Array.isArray(growBeds)) {
            return [];
        }

        return growBeds.map((bed, index) => {
            // Calculate volume if not already set
            let volume = bed.volume || 0;
            if (bed.type && !volume) {
                const metrics = this.calculateBedMetricsForSaving(bed.type, bed);
                volume = metrics.volume;
            }
            
            const transformedBed = {
                bed_number: index + 1,
                bed_type: bed.type,
                bed_name: bed.name || `Bed ${index + 1}`,
                volume_liters: Math.round(volume),
                area_m2: bed.area || 0,
                length_meters: bed.length || null,
                width_meters: bed.width || null,
                height_meters: bed.height || null,
                plant_capacity: bed.plantCapacity || null,
                vertical_count: bed.verticals || null,
                plants_per_vertical: bed.plantsPerVertical || null,
                equivalent_m2: bed.area || 0, // Use area as equivalent_m2
                reservoir_volume: bed.reservoirVolume || null,
                trough_length: bed.troughLength || null,
                trough_count: bed.channels || null, // Fix field name
                plant_spacing: bed.plantSpacing || null,
                reservoir_volume_liters: bed.reservoirVolume || null
            };

            return transformedBed;
        });
    }

    /**
     * Calculate bed metrics for saving (delegates to app's method)
     * @param {string} bedType - Type of grow bed
     * @param {Object} bed - Bed configuration object
     * @returns {Object} Calculated metrics (volume, area, etc.)
     */
    calculateBedMetricsForSaving(bedType, bed) {
        // Delegate to app's existing method if available
        if (this.app && typeof this.app.calculateBedMetricsForSaving === 'function') {
            return this.app.calculateBedMetricsForSaving(bedType, bed);
        }
        
        // Fallback calculation logic
        return this.fallbackBedMetricsCalculation(bedType, bed);
    }

    /**
     * Fallback bed metrics calculation when app method is not available
     * @param {string} bedType - Type of grow bed
     * @param {Object} bed - Bed configuration object
     * @returns {Object} Calculated metrics
     */
    fallbackBedMetricsCalculation(bedType, bed) {
        let volume = 0;
        let area = 0;

        const length = parseFloat(bed.length) || 0;
        const width = parseFloat(bed.width) || 0;
        const height = parseFloat(bed.height) || 0;

        switch (bedType) {
            case 'dwc':
            case 'media':
                volume = length * width * height;
                area = length * width;
                break;
            case 'flood_drain':
                volume = (length * width * height) / 4; // Media space accounting
                area = length * width;
                break;
            case 'vertical':
                const verticals = parseInt(bed.verticals) || 1;
                const plantsPerVertical = parseInt(bed.plantsPerVertical) || 25;
                volume = length * width * height; // Base dimensions
                area = (verticals * plantsPerVertical) / 25; // Equivalent area calculation
                break;
            case 'nft':
                const channels = parseInt(bed.channels) || 1;
                const troughLength = parseFloat(bed.troughLength) || length;
                const reservoirVolume = parseFloat(bed.reservoirVolume) || 0;
                volume = reservoirVolume;
                area = (channels * troughLength * 0.1); // NFT area approximation
                break;
            default:
                volume = length * width * height;
                area = length * width;
        }

        return {
            volume: Math.max(0, volume),
            area: Math.max(0, area)
        };
    }

    /**
     * Process grow bed creation IDs for allocation mapping
     * @param {Array} growBeds - Array of grow beds
     * @param {string} systemId - System ID
     * @returns {Promise<Array>} Array of bed IDs with bed numbers
     */
    async processCreatedBedIds(growBeds, systemId) {
        if (!growBeds || growBeds.length === 0) {
            return [];
        }

        try {
            const growBedsResponse = await this.app.makeApiCall(`/grow-beds/system/${systemId}`);
            return growBedsResponse.map(bed => ({ 
                bedNumber: bed.bed_number, 
                id: bed.id 
            }));
        } catch (error) {
            console.error('Failed to fetch created grow beds:', error);
            return [];
        }
    }

    /**
     * Save grow beds data to API
     * @param {Array} growBeds - Array of grow bed objects
     * @param {string} systemId - System ID
     * @returns {Promise<Object>} API response
     */
    async saveGrowBedsData(growBeds, systemId) {
        if (!growBeds || growBeds.length === 0) {
            throw new Error('No grow beds data to save');
        }

        const transformedData = this.transformGrowBedsForAPI(growBeds);
        
        return await this.app.makeApiCall(`/grow-beds/system/${systemId}`, {
            method: 'POST',
            body: JSON.stringify({
                growBeds: transformedData
            })
        });
    }

    /**
     * Validate grow bed data before processing
     * @param {Array} growBeds - Array of grow bed objects
     * @returns {Object} Validation result with errors if any
     */
    validateGrowBedsData(growBeds) {
        const errors = [];
        
        if (!growBeds || !Array.isArray(growBeds)) {
            errors.push('Grow beds data must be an array');
            return { valid: false, errors };
        }

        growBeds.forEach((bed, index) => {
            if (!bed.type) {
                errors.push(`Bed ${index + 1}: Missing bed type`);
            }
            
            if (!bed.name && !bed.length && !bed.width) {
                errors.push(`Bed ${index + 1}: Missing required dimensions or name`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Export as default for easy importing
export default GrowBedDataProcessor;