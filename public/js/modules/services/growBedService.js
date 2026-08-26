// Grow Bed Service
// Handles grow bed business logic, calculations, and data management

import { GrowBedsAPI } from '../api/index.js';

/**
 * Grow Bed Service
 * Manages grow bed business logic, calculations, and API coordination
 */
export default class GrowBedService {
    constructor(app) {
        this.app = app;
        this.growBedTypes = {
            'dwc': {
                name: 'Deep Water Culture',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'flood-drain': {
                name: 'Flood & Drain',
                fields: ['length', 'width', 'height'],
                calculation: 'media'
            },
            'media-flow': {
                name: 'Media Flow Through',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'vertical': {
                name: 'Vertical Growing',
                fields: ['base_length', 'base_width', 'base_height', 'vertical_count', 'plants_per_vertical'],
                calculation: 'vertical'
            },
            'nft': {
                name: 'NFT (Nutrient Film Technique)',
                fields: ['trough_length', 'trough_count', 'plant_spacing', 'reservoir_volume'],
                calculation: 'nft'
            }
        };
    }

    /**
     * Initialize the grow bed service
     */
    initialize() {
    }

    /**
     * Get grow bed types configuration
     */
    getGrowBedTypes() {
        return this.growBedTypes;
    }

    /**
     * Get grow bed type by key
     */
    getGrowBedType(typeKey) {
        return this.growBedTypes[typeKey] || null;
    }

    /**
     * Calculate bed dimensions based on type and inputs
     */
    calculateBedDimensions(bedType, inputs) {
        let volume = 0;
        let area = 0;

        switch (bedType) {
            case 'dwc':
            case 'media-flow':
                volume = this.calculateDWCVolume(inputs);
                area = this.calculateDWCArea(inputs);
                break;

            case 'flood-drain':
                volume = this.calculateFloodDrainVolume(inputs);
                area = this.calculateFloodDrainArea(inputs);
                break;

            case 'vertical':
                volume = this.calculateVerticalVolume(inputs);
                area = this.calculateVerticalArea(inputs);
                break;

            case 'nft':
                volume = this.calculateNFTVolume(inputs);
                area = this.calculateNFTArea(inputs);
                break;

            default:
                console.warn('Unknown bed type:', bedType);
        }

        return {
            volume: Math.max(0, volume),
            area: Math.max(0, area)
        };
    }

    /**
     * Calculate DWC volume
     */
    calculateDWCVolume(inputs) {
        const { length = 0, width = 0, height = 0 } = inputs;
        if (length <= 0 || width <= 0 || height <= 0) return 0;
        return length * width * height;
    }

    /**
     * Calculate DWC area
     */
    calculateDWCArea(inputs) {
        const { length = 0, width = 0 } = inputs;
        if (length <= 0 || width <= 0) return 0;
        return length * width;
    }

    /**
     * Calculate Flood & Drain volume
     */
    calculateFloodDrainVolume(inputs) {
        const { length = 0, width = 0, height = 0 } = inputs;
        if (length <= 0 || width <= 0 || height <= 0) return 0;
        // 25% volume for water, 75% for media
        return (length * width * height) / 4;
    }

    /**
     * Calculate Flood & Drain area
     */
    calculateFloodDrainArea(inputs) {
        const { length = 0, width = 0 } = inputs;
        if (length <= 0 || width <= 0) return 0;
        return length * width;
    }

    /**
     * Calculate Vertical growing volume
     */
    calculateVerticalVolume(inputs) {
        const { baseLength = 0, baseWidth = 0, baseHeight = 0 } = inputs;
        if (baseLength <= 0 || baseWidth <= 0 || baseHeight <= 0) return 0;
        return baseLength * baseWidth * baseHeight;
    }

    /**
     * Calculate Vertical growing area
     */
    calculateVerticalArea(inputs) {
        const { verticalCount = 0, plantsPerVertical = 0 } = inputs;
        if (verticalCount <= 0 || plantsPerVertical <= 0) return 0;
        const totalPlants = verticalCount * plantsPerVertical;
        return totalPlants / 25; // 25 plants per m²
    }

    /**
     * Calculate NFT volume
     */
    calculateNFTVolume(inputs) {
        const { reservoirVolume = 0 } = inputs;
        if (reservoirVolume <= 0) return 0;
        return reservoirVolume / 1000; // Convert liters to m³
    }

    /**
     * Calculate NFT area
     */
    calculateNFTArea(inputs) {
        const { troughLength = 0, troughCount = 0, plantSpacing = 0 } = inputs;
        if (troughLength <= 0 || troughCount <= 0 || plantSpacing <= 0) return 0;
        
        const plantsPerTrough = Math.floor((troughLength * 100) / plantSpacing); // Convert meters to cm for spacing
        const totalPlants = plantsPerTrough * troughCount;
        return totalPlants / 25; // 25 plants per m²
    }

    /**
     * Build bed configuration object
     */
    buildBedConfiguration(bedNumber, bedType, inputs, volume, area) {
        const config = {
            bed_number: bedNumber,
            bed_type: bedType,
            bed_name: `Bed ${bedNumber}`,
            volume_liters: volume * 1000, // Convert m³ to liters
            area_m2: area,
            equivalent_m2: area,
            reservoir_volume: volume * 1000
        };

        // Add type-specific dimensions
        this.addTypeSpecificDimensions(config, bedType, inputs);

        return config;
    }

    /**
     * Add type-specific dimensions to configuration
     */
    addTypeSpecificDimensions(config, bedType, inputs) {
        switch (bedType) {
            case 'dwc':
            case 'media-flow':
            case 'flood-drain':
                config.length_meters = inputs.length || 0;
                config.width_meters = inputs.width || 0;
                config.height_meters = inputs.height || 0;
                break;

            case 'vertical':
                config.length_meters = inputs.baseLength || 0;
                config.width_meters = inputs.baseWidth || 0;
                config.height_meters = inputs.baseHeight || 0;
                config.vertical_count = inputs.verticalCount || 0;
                config.plants_per_vertical = inputs.plantsPerVertical || 0;
                config.plant_capacity = (inputs.verticalCount || 0) * (inputs.plantsPerVertical || 0);
                break;

            case 'nft':
                config.trough_length = inputs.troughLength || 0;
                config.trough_count = inputs.troughCount || 0;
                config.plant_spacing = inputs.plantSpacing || 0;
                config.reservoir_volume_liters = inputs.reservoirVolume || 0;
                
                // Calculate total plant capacity for NFT
                if (inputs.troughLength > 0 && inputs.troughCount > 0 && inputs.plantSpacing > 0) {
                    const plantsPerTrough = Math.floor((inputs.troughLength * 100) / inputs.plantSpacing);
                    config.plant_capacity = plantsPerTrough * inputs.troughCount;
                }
                break;
        }
    }

    /**
     * Save bed configuration
     */
    async saveBedConfiguration(bedNumber, config) {
        if (!this.app.activeSystemId) {
            throw new Error('No active system selected');
        }

        try {
            // Get all current bed configurations to preserve them
            const allBedConfigs = await this.getAllBedConfigurations();
            
            // Update or add the current bed configuration
            const existingIndex = allBedConfigs.findIndex(bed => bed.bed_number === bedNumber);
            if (existingIndex >= 0) {
                allBedConfigs[existingIndex] = config;
            } else {
                allBedConfigs.push(config);
            }
            
            // Save all beds together using the API module
            const response = await GrowBedsAPI.updateGrowBeds(this.app.activeSystemId, { growBeds: allBedConfigs });
            
            return response;

        } catch (error) {
            console.error('Failed to save bed configuration:', error);
            throw error;
        }
    }

    /**
     * Delete bed configuration
     */
    async deleteBedConfiguration(bedNumber) {
        if (!this.app.activeSystemId) {
            throw new Error('No active system selected');
        }

        try {
            // Get current grow beds from the database
            const growBeds = await GrowBedsAPI.fetchGrowBeds(this.app.activeSystemId);
            
            // Find the bed to delete by bed_number
            const bedToDelete = growBeds.find(bed => bed.bed_number === bedNumber);
            
            if (!bedToDelete) {
                throw new Error('Bed configuration not found in database');
            }

            // Delete the specific bed from database
            await this.app.makeApiCall(`/grow-beds/${bedToDelete.id}`, {
                method: 'DELETE'
            });

            return true;

        } catch (error) {
            console.error('Failed to delete bed configuration:', error);
            throw error;
        }
    }

    /**
     * Get all bed configurations from form
     */
    getAllBedConfigurations() {
        const bedItems = document.querySelectorAll('.grow-bed-item');
        const configuration = [];

        bedItems.forEach((item, index) => {
            const bedNumber = index + 1;
            const bedType = item.querySelector('.bed-type')?.value;

            if (!bedType) return;

            const volume = parseFloat(item.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
            const area = parseFloat(item.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;

            // Get inputs based on bed type
            const inputs = this.getInputsFromForm(item, bedType);
            const config = this.buildBedConfiguration(bedNumber, bedType, inputs, volume, area);
            
            configuration.push(config);
        });

        return configuration;
    }

    /**
     * Get inputs from form based on bed type
     */
    getInputsFromForm(item, bedType) {
        const inputs = {};

        switch (bedType) {
            case 'dwc':
            case 'media-flow':
            case 'flood-drain':
                inputs.length = parseFloat(item.querySelector('.bed-length')?.value) || 0;
                inputs.width = parseFloat(item.querySelector('.bed-width')?.value) || 0;
                inputs.height = parseFloat(item.querySelector('.bed-height')?.value) || 0;
                break;

            case 'vertical':
                inputs.baseLength = parseFloat(item.querySelector('.base-length')?.value) || 0;
                inputs.baseWidth = parseFloat(item.querySelector('.base-width')?.value) || 0;
                inputs.baseHeight = parseFloat(item.querySelector('.base-height')?.value) || 0;
                inputs.verticalCount = parseFloat(item.querySelector('.vertical-count')?.value) || 0;
                inputs.plantsPerVertical = parseFloat(item.querySelector('.plants-per-vertical')?.value) || 0;
                break;

            case 'nft':
                inputs.troughLength = parseFloat(item.querySelector('.trough-length')?.value) || 0;
                inputs.troughCount = parseFloat(item.querySelector('.trough-count')?.value) || 0;
                inputs.plantSpacing = parseFloat(item.querySelector('.plant-spacing')?.value) || 0;
                inputs.reservoirVolume = parseFloat(item.querySelector('.reservoir-volume')?.value) || 0;
                break;
        }

        return inputs;
    }

    /**
     * Get grow beds for system from API
     */
    async getGrowBedsForSystem(systemId) {
        try {
            return await GrowBedsAPI.fetchGrowBeds(systemId);
        } catch (error) {
            console.error('Failed to fetch grow beds for system:', error);
            return [];
        }
    }

    /**
     * Calculate total system metrics from beds
     */
    calculateSystemMetrics(beds) {
        if (!beds || beds.length === 0) {
            return {
                totalBeds: 0,
                totalVolume: 0,
                totalArea: 0,
                totalPlantCapacity: 0,
                bedTypeDistribution: {}
            };
        }

        const metrics = {
            totalBeds: beds.length,
            totalVolume: 0, // in m³
            totalArea: 0, // in m²
            totalPlantCapacity: 0,
            bedTypeDistribution: {}
        };

        beds.forEach(bed => {
            // Add to totals
            metrics.totalVolume += (bed.volume_liters || 0) / 1000; // Convert to m³
            metrics.totalArea += bed.area_m2 || 0;
            metrics.totalPlantCapacity += bed.plant_capacity || 0;

            // Count bed types
            const type = bed.bed_type || 'unknown';
            metrics.bedTypeDistribution[type] = (metrics.bedTypeDistribution[type] || 0) + 1;
        });

        return metrics;
    }

    /**
     * Get bed efficiency metrics
     */
    calculateBedEfficiency(bed) {
        const volume = (bed.volume_liters || 0) / 1000; // m³
        const area = bed.area_m2 || 0;
        const plantCapacity = bed.plant_capacity || 0;

        return {
            volumePerArea: area > 0 ? volume / area : 0, // m³ per m²
            plantsPerArea: area > 0 ? plantCapacity / area : 0, // plants per m²
            volumePerPlant: plantCapacity > 0 ? volume / plantCapacity : 0, // m³ per plant
            efficiency: this.calculateEfficiencyScore(bed)
        };
    }

    /**
     * Calculate efficiency score for a bed
     */
    calculateEfficiencyScore(bed) {
        // This is a simplified efficiency calculation
        // Could be expanded with more sophisticated metrics
        const volume = (bed.volume_liters || 0) / 1000;
        const area = bed.area_m2 || 0;
        const plantCapacity = bed.plant_capacity || 0;

        if (area === 0) return 0;

        // Higher plant density and lower volume per plant = higher efficiency
        const plantDensity = plantCapacity / area; // plants per m²
        const volumeRatio = area > 0 ? volume / area : 0; // m³ per m²

        // Normalize and combine metrics (this is a simple example)
        const densityScore = Math.min(plantDensity / 25, 1) * 50; // Normalize to 25 plants/m² = 50 points
        const volumeScore = Math.max(0, 50 - (volumeRatio * 100)); // Lower volume per area = higher score

        return Math.round(densityScore + volumeScore);
    }

    /**
     * Validate bed configuration completeness
     */
    validateBedCompleteness(beds) {
        const validation = {
            isComplete: true,
            issues: [],
            warnings: [],
            statistics: this.calculateSystemMetrics(beds)
        };

        if (!beds || beds.length === 0) {
            validation.isComplete = false;
            validation.issues.push('No grow beds configured');
            return validation;
        }

        beds.forEach((bed, index) => {
            const bedName = bed.bed_name || `Bed ${index + 1}`;

            // Check for missing essential data
            if (!bed.bed_type) {
                validation.issues.push(`${bedName}: Missing bed type`);
                validation.isComplete = false;
            }

            if ((bed.volume_liters || 0) <= 0) {
                validation.issues.push(`${bedName}: Invalid volume`);
                validation.isComplete = false;
            }

            if ((bed.area_m2 || 0) <= 0) {
                validation.issues.push(`${bedName}: Invalid growing area`);
                validation.isComplete = false;
            }

            // Check for warnings
            if (bed.bed_type === 'vertical' && (!bed.plant_capacity || bed.plant_capacity <= 0)) {
                validation.warnings.push(`${bedName}: Vertical bed without plant capacity data`);
            }

            if (bed.bed_type === 'nft' && (!bed.plant_spacing || bed.plant_spacing <= 0)) {
                validation.warnings.push(`${bedName}: NFT bed without proper plant spacing`);
            }
        });

        return validation;
    }

    /**
     * Get service statistics
     */
    getServiceStats() {
        return {
            availableBedTypes: Object.keys(this.growBedTypes).length,
            bedTypes: this.growBedTypes,
            activeSystemId: this.app.activeSystemId
        };
    }
}