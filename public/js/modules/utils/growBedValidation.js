// Grow Bed Validation Utilities
// Handles validation logic for grow bed configurations

/**
 * Grow Bed Validation Utilities
 * Provides comprehensive validation for grow bed configurations
 */
export default class GrowBedValidation {
    constructor() {
        this.validationRules = this.initializeValidationRules();
    }

    /**
     * Initialize validation rules for each bed type
     */
    initializeValidationRules() {
        return {
            'dwc': {
                requiredFields: ['length', 'width', 'height'],
                fieldNames: {
                    'length': 'Length',
                    'width': 'Width', 
                    'height': 'Height'
                },
                minValues: {
                    'length': 0.1,
                    'width': 0.1,
                    'height': 0.1
                },
                maxValues: {
                    'length': 50,
                    'width': 50,
                    'height': 5
                }
            },
            'flood-drain': {
                requiredFields: ['length', 'width', 'height'],
                fieldNames: {
                    'length': 'Length',
                    'width': 'Width',
                    'height': 'Height'
                },
                minValues: {
                    'length': 0.1,
                    'width': 0.1,
                    'height': 0.1
                },
                maxValues: {
                    'length': 50,
                    'width': 50,
                    'height': 5
                }
            },
            'media-flow': {
                requiredFields: ['length', 'width', 'height'],
                fieldNames: {
                    'length': 'Length',
                    'width': 'Width',
                    'height': 'Height'
                },
                minValues: {
                    'length': 0.1,
                    'width': 0.1,
                    'height': 0.1
                },
                maxValues: {
                    'length': 50,
                    'width': 50,
                    'height': 5
                }
            },
            'vertical': {
                requiredFields: ['baseLength', 'baseWidth', 'baseHeight', 'verticalCount', 'plantsPerVertical'],
                fieldNames: {
                    'baseLength': 'Base Length',
                    'baseWidth': 'Base Width',
                    'baseHeight': 'Base Height',
                    'verticalCount': 'Number of Verticals',
                    'plantsPerVertical': 'Plants per Vertical'
                },
                minValues: {
                    'baseLength': 0.1,
                    'baseWidth': 0.1,
                    'baseHeight': 0.1,
                    'verticalCount': 1,
                    'plantsPerVertical': 1
                },
                maxValues: {
                    'baseLength': 10,
                    'baseWidth': 10,
                    'baseHeight': 3,
                    'verticalCount': 100,
                    'plantsPerVertical': 50
                }
            },
            'nft': {
                requiredFields: ['troughLength', 'troughCount', 'plantSpacing', 'reservoirVolume'],
                fieldNames: {
                    'troughLength': 'Trough Length',
                    'troughCount': 'Number of Troughs',
                    'plantSpacing': 'Plant Spacing',
                    'reservoirVolume': 'Reservoir Volume'
                },
                minValues: {
                    'troughLength': 0.5,
                    'troughCount': 1,
                    'plantSpacing': 5,
                    'reservoirVolume': 10
                },
                maxValues: {
                    'troughLength': 20,
                    'troughCount': 50,
                    'plantSpacing': 100,
                    'reservoirVolume': 10000
                }
            }
        };
    }

    /**
     * Validate bed configuration
     */
    validateBedConfiguration(bedType, inputs) {
        const result = {
            isValid: true,
            missingFields: [],
            invalidFields: [],
            warnings: [],
            errors: []
        };

        const rules = this.validationRules[bedType];
        if (!rules) {
            result.isValid = false;
            result.errors.push(`Unknown bed type: ${bedType}`);
            return result;
        }

        // Check required fields
        rules.requiredFields.forEach(field => {
            const value = inputs[field];
            const fieldName = rules.fieldNames[field] || field;

            if (value === null || value === undefined || value === '' || isNaN(value)) {
                result.isValid = false;
                result.missingFields.push(fieldName);
                result.errors.push(`${fieldName} is required`);
                return;
            }

            const numValue = parseFloat(value);

            // Check minimum values
            if (rules.minValues[field] && numValue < rules.minValues[field]) {
                result.isValid = false;
                result.invalidFields.push(fieldName);
                result.errors.push(`${fieldName} must be at least ${rules.minValues[field]}`);
            }

            // Check maximum values
            if (rules.maxValues[field] && numValue > rules.maxValues[field]) {
                result.isValid = false;
                result.invalidFields.push(fieldName);
                result.errors.push(`${fieldName} cannot exceed ${rules.maxValues[field]}`);
            }
        });

        // Add bed-specific validations
        this.addSpecificValidations(bedType, inputs, result);

        return result;
    }

    /**
     * Add bed-type specific validations
     */
    addSpecificValidations(bedType, inputs, result) {
        switch (bedType) {
            case 'dwc':
                this.validateDWC(inputs, result);
                break;
            case 'flood-drain':
                this.validateFloodDrain(inputs, result);
                break;
            case 'media-flow':
                this.validateMediaFlow(inputs, result);
                break;
            case 'vertical':
                this.validateVertical(inputs, result);
                break;
            case 'nft':
                this.validateNFT(inputs, result);
                break;
        }
    }

    /**
     * Validate DWC configuration
     */
    validateDWC(inputs, result) {
        const { length, width, height } = inputs;

        // Check if dimensions are realistic
        if (length && width && height) {
            const volume = length * width * height;
            
            if (volume > 50) {
                result.warnings.push('Very large bed volume - consider splitting into multiple beds');
            }
            
            if (height > 1.0) {
                result.warnings.push('Deep bed height may require additional aeration');
            }

            // Check aspect ratio
            const aspectRatio = Math.max(length, width) / Math.min(length, width);
            if (aspectRatio > 5) {
                result.warnings.push('Unusual aspect ratio - very long/narrow beds may have poor water circulation');
            }
        }
    }

    /**
     * Validate Flood & Drain configuration
     */
    validateFloodDrain(inputs, result) {
        const { length, width, height } = inputs;

        if (length && width && height) {
            if (height < 0.15) {
                result.warnings.push('Shallow bed depth may not provide adequate root space for media');
            }
            
            if (height > 0.6) {
                result.warnings.push('Deep bed may require longer drain cycles');
            }

            const volume = (length * width * height) / 4; // Effective water volume
            if (volume < 0.05) {
                result.warnings.push('Very small water volume may cause rapid nutrient fluctuations');
            }
        }
    }

    /**
     * Validate Media Flow configuration
     */
    validateMediaFlow(inputs, result) {
        const { length, width, height } = inputs;

        if (length && width && height) {
            if (height < 0.2) {
                result.warnings.push('Shallow bed may not provide adequate media depth for root development');
            }

            const volume = length * width * height;
            if (volume > 20) {
                result.warnings.push('Large media flow bed - ensure adequate pump capacity for flow rate');
            }
        }
    }

    /**
     * Validate Vertical configuration
     */
    validateVertical(inputs, result) {
        const { baseLength, baseWidth, baseHeight, verticalCount, plantsPerVertical } = inputs;

        if (verticalCount && plantsPerVertical) {
            const totalPlants = verticalCount * plantsPerVertical;
            
            if (totalPlants > 200) {
                result.warnings.push('High plant count - ensure adequate nutrient flow to all levels');
            }

            if (verticalCount > 10) {
                result.warnings.push('Many vertical towers - consider spacing for light access');
            }

            if (plantsPerVertical > 20) {
                result.warnings.push('High plants per vertical - ensure adequate spacing between levels');
            }
        }

        if (baseLength && baseWidth && baseHeight) {
            const baseVolume = baseLength * baseWidth * baseHeight;
            const plantsPerLiter = (verticalCount * plantsPerVertical) / (baseVolume * 1000);
            
            if (plantsPerLiter > 2) {
                result.warnings.push('High plant density per reservoir volume - monitor nutrient depletion closely');
            }
        }
    }

    /**
     * Validate NFT configuration
     */
    validateNFT(inputs, result) {
        const { troughLength, troughCount, plantSpacing, reservoirVolume } = inputs;

        if (plantSpacing) {
            if (plantSpacing < 10) {
                result.warnings.push('Very tight plant spacing - may cause overcrowding at maturity');
            }
            
            if (plantSpacing > 30) {
                result.warnings.push('Wide plant spacing - may not utilize growing area efficiently');
            }
        }

        if (troughLength && troughLength > 10) {
            result.warnings.push('Long troughs may have uneven nutrient distribution - consider flow monitoring');
        }

        if (troughLength && troughCount && plantSpacing && reservoirVolume) {
            const plantsPerTrough = Math.floor((troughLength * 100) / plantSpacing);
            const totalPlants = plantsPerTrough * troughCount;
            const litersPerPlant = reservoirVolume / totalPlants;

            if (litersPerPlant < 2) {
                result.warnings.push('Low reservoir volume per plant - may require frequent nutrient changes');
            }

            if (litersPerPlant > 10) {
                result.warnings.push('High reservoir volume per plant - consider reducing reservoir size for efficiency');
            }
        }
    }

    /**
     * Validate complete system bed configuration
     */
    validateSystemBeds(beds) {
        const systemValidation = {
            isValid: true,
            bedValidations: {},
            systemIssues: [],
            systemWarnings: [],
            statistics: {
                totalBeds: beds.length,
                validBeds: 0,
                bedTypes: {},
                totalVolume: 0,
                totalArea: 0
            }
        };

        if (!beds || beds.length === 0) {
            systemValidation.isValid = false;
            systemValidation.systemIssues.push('No grow beds configured');
            return systemValidation;
        }

        // Validate individual beds
        beds.forEach((bed, index) => {
            const bedKey = `bed_${bed.bed_number || index + 1}`;
            const inputs = this.extractInputsFromBed(bed);
            
            const validation = this.validateBedConfiguration(bed.bed_type, inputs);
            systemValidation.bedValidations[bedKey] = validation;

            if (!validation.isValid) {
                systemValidation.isValid = false;
            } else {
                systemValidation.statistics.validBeds++;
            }

            // Update statistics
            const bedType = bed.bed_type || 'unknown';
            systemValidation.statistics.bedTypes[bedType] = 
                (systemValidation.statistics.bedTypes[bedType] || 0) + 1;
            
            systemValidation.statistics.totalVolume += (bed.volume_liters || 0) / 1000;
            systemValidation.statistics.totalArea += bed.area_m2 || 0;
        });

        // Add system-level validations
        this.addSystemLevelValidations(beds, systemValidation);

        return systemValidation;
    }

    /**
     * Extract inputs from bed configuration for validation
     */
    extractInputsFromBed(bed) {
        const inputs = {};

        // Map bed properties to input format
        if (bed.length_meters) inputs.length = bed.length_meters;
        if (bed.width_meters) inputs.width = bed.width_meters;
        if (bed.height_meters) inputs.height = bed.height_meters;
        
        if (bed.length_meters) inputs.baseLength = bed.length_meters;
        if (bed.width_meters) inputs.baseWidth = bed.width_meters;
        if (bed.height_meters) inputs.baseHeight = bed.height_meters;
        if (bed.vertical_count) inputs.verticalCount = bed.vertical_count;
        if (bed.plants_per_vertical) inputs.plantsPerVertical = bed.plants_per_vertical;
        
        if (bed.trough_length) inputs.troughLength = bed.trough_length;
        if (bed.trough_count) inputs.troughCount = bed.trough_count;
        if (bed.plant_spacing) inputs.plantSpacing = bed.plant_spacing;
        if (bed.reservoir_volume_liters) inputs.reservoirVolume = bed.reservoir_volume_liters;

        return inputs;
    }

    /**
     * Add system-level validations
     */
    addSystemLevelValidations(beds, systemValidation) {
        const stats = systemValidation.statistics;

        // Check for balanced system
        if (stats.totalVolume < 0.5) {
            systemValidation.systemWarnings.push('Small total system volume may limit plant variety');
        }

        if (stats.totalArea < 2.0) {
            systemValidation.systemWarnings.push('Small total growing area may limit production capacity');
        }

        // Check bed type diversity
        const bedTypeCount = Object.keys(stats.bedTypes).length;
        if (bedTypeCount === 1 && stats.totalBeds > 3) {
            systemValidation.systemWarnings.push('Consider diversifying bed types for different plant requirements');
        }

        // Check for duplicate bed numbers
        const bedNumbers = beds.map(bed => bed.bed_number).filter(num => num);
        const duplicates = bedNumbers.filter((num, index) => bedNumbers.indexOf(num) !== index);
        if (duplicates.length > 0) {
            systemValidation.isValid = false;
            systemValidation.systemIssues.push(`Duplicate bed numbers: ${[...new Set(duplicates)].join(', ')}`);
        }
    }

    /**
     * Get validation rules for a specific bed type
     */
    getValidationRulesForType(bedType) {
        return this.validationRules[bedType] || null;
    }

    /**
     * Check if a value is within valid range
     */
    isValueInRange(value, bedType, fieldName) {
        const rules = this.validationRules[bedType];
        if (!rules) return true;

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;

        const min = rules.minValues[fieldName];
        const max = rules.maxValues[fieldName];

        return (!min || numValue >= min) && (!max || numValue <= max);
    }

    /**
     * Get field display name
     */
    getFieldDisplayName(bedType, fieldName) {
        const rules = this.validationRules[bedType];
        return rules?.fieldNames?.[fieldName] || fieldName;
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            supportedBedTypes: Object.keys(this.validationRules),
            totalValidationRules: Object.values(this.validationRules).reduce((sum, rules) => 
                sum + rules.requiredFields.length, 0),
            validationRules: this.validationRules
        };
    }
}