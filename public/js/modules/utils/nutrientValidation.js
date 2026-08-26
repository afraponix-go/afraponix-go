// Nutrient Validation Utility
// Handles validation for all nutrient-related forms and data

import { VALIDATION_RULES, DEFAULTS } from '../constants/nutrientConstants.js';

/**
 * Nutrient Validation Class
 * Provides comprehensive validation for nutrient management forms and data
 */
export default class NutrientValidation {
    constructor() {
        this.validationStats = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0
        };
    }

    /**
     * Validate ratio rule form data
     */
    validateRatioRule(formData) {
        const errors = [];
        const warnings = [];

        // Increment validation counter
        this.validationStats.totalValidations++;

        try {
            // Required field validation
            if (!formData.nutrient) {
                errors.push('Nutrient selection is required');
            }

            if (!formData.ratio || formData.ratio === '') {
                errors.push('Ratio value is required');
            }

            // Ratio value validation
            if (formData.ratio) {
                const ratioValue = parseFloat(formData.ratio);
                
                if (isNaN(ratioValue)) {
                    errors.push('Ratio must be a valid number');
                } else {
                    if (ratioValue < VALIDATION_RULES.RATIO.MIN) {
                        errors.push(`Ratio must be at least ${VALIDATION_RULES.RATIO.MIN}`);
                    }
                    if (ratioValue > VALIDATION_RULES.RATIO.MAX) {
                        errors.push(`Ratio cannot exceed ${VALIDATION_RULES.RATIO.MAX}`);
                    }
                    
                    // Add warnings for unusual values
                    if (ratioValue < 0.5 || ratioValue > 5.0) {
                        warnings.push('Ratio value is outside typical range (0.5-5.0)');
                    }
                }
            }

            // Growth stage validation (optional field)
            if (formData.growthStage && !this.isValidGrowthStage(formData.growthStage)) {
                errors.push('Invalid growth stage selected');
            }

            // Multiplier validation (if provided)
            if (formData.multiplier) {
                const multiplierValue = parseFloat(formData.multiplier);
                
                if (isNaN(multiplierValue)) {
                    errors.push('Multiplier must be a valid number');
                } else {
                    if (multiplierValue < VALIDATION_RULES.MULTIPLIER.MIN) {
                        errors.push(`Multiplier must be at least ${VALIDATION_RULES.MULTIPLIER.MIN}`);
                    }
                    if (multiplierValue > VALIDATION_RULES.MULTIPLIER.MAX) {
                        errors.push(`Multiplier cannot exceed ${VALIDATION_RULES.MULTIPLIER.MAX}`);
                    }
                }
            }

            // Update success/failure stats
            if (errors.length === 0) {
                this.validationStats.successfulValidations++;
            } else {
                this.validationStats.failedValidations++;
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                sanitizedData: this.sanitizeRatioRuleData(formData)
            };

        } catch (error) {
            console.error('Validation error:', error);
            this.validationStats.failedValidations++;
            
            return {
                isValid: false,
                errors: ['Validation failed due to system error'],
                warnings: [],
                sanitizedData: null
            };
        }
    }

    /**
     * Validate environmental adjustment form data
     */
    validateEnvironmentalAdjustment(formData) {
        const errors = [];
        const warnings = [];

        this.validationStats.totalValidations++;

        try {
            // Required field validation
            if (!formData.parameter) {
                errors.push('Environmental parameter is required');
            }

            if (!formData.condition) {
                errors.push('Condition is required');
            }

            if (!formData.adjustment || formData.adjustment === '') {
                errors.push('Adjustment value is required');
            }

            // Parameter-specific validation
            if (formData.parameter && formData.condition) {
                const parameterValidation = this.validateParameterValue(
                    formData.parameter,
                    formData.condition
                );
                
                if (!parameterValidation.isValid) {
                    errors.push(...parameterValidation.errors);
                }
                
                warnings.push(...parameterValidation.warnings);
            }

            // Adjustment multiplier validation
            if (formData.adjustment) {
                const adjustmentValue = parseFloat(formData.adjustment);
                
                if (isNaN(adjustmentValue)) {
                    errors.push('Adjustment must be a valid number');
                } else {
                    if (adjustmentValue < 0.1) {
                        errors.push('Adjustment multiplier must be at least 0.1');
                    }
                    if (adjustmentValue > 3.0) {
                        errors.push('Adjustment multiplier cannot exceed 3.0');
                    }
                    
                    // Warnings for extreme adjustments
                    if (adjustmentValue < 0.5 || adjustmentValue > 2.0) {
                        warnings.push('Adjustment multiplier is quite extreme');
                    }
                }
            }

            // Update stats
            if (errors.length === 0) {
                this.validationStats.successfulValidations++;
            } else {
                this.validationStats.failedValidations++;
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                sanitizedData: this.sanitizeEnvironmentalData(formData)
            };

        } catch (error) {
            console.error('Environmental validation error:', error);
            this.validationStats.failedValidations++;
            
            return {
                isValid: false,
                errors: ['Environmental validation failed due to system error'],
                warnings: [],
                sanitizedData: null
            };
        }
    }

    /**
     * Validate parameter-specific values
     */
    validateParameterValue(parameter, value) {
        const errors = [];
        const warnings = [];
        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
            return {
                isValid: false,
                errors: [`${parameter} value must be a valid number`],
                warnings: []
            };
        }

        switch (parameter) {
            case 'ec':
                if (numValue < DEFAULTS.ENVIRONMENTAL.MIN_EC) {
                    errors.push(`EC must be at least ${DEFAULTS.ENVIRONMENTAL.MIN_EC} mS/cm`);
                }
                if (numValue > DEFAULTS.ENVIRONMENTAL.MAX_EC) {
                    errors.push(`EC cannot exceed ${DEFAULTS.ENVIRONMENTAL.MAX_EC} mS/cm`);
                }
                if (numValue < 0.8 || numValue > 3.0) {
                    warnings.push('EC value is outside typical hydroponic range (0.8-3.0 mS/cm)');
                }
                break;

            case 'ph':
                if (numValue < DEFAULTS.ENVIRONMENTAL.MIN_PH) {
                    errors.push(`pH must be at least ${DEFAULTS.ENVIRONMENTAL.MIN_PH}`);
                }
                if (numValue > DEFAULTS.ENVIRONMENTAL.MAX_PH) {
                    errors.push(`pH cannot exceed ${DEFAULTS.ENVIRONMENTAL.MAX_PH}`);
                }
                if (numValue < 5.5 || numValue > 6.8) {
                    warnings.push('pH value is outside optimal range for hydroponics (5.5-6.8)');
                }
                break;

            case 'temperature':
                if (numValue < DEFAULTS.ENVIRONMENTAL.MIN_TEMPERATURE) {
                    errors.push(`Temperature must be at least ${DEFAULTS.ENVIRONMENTAL.MIN_TEMPERATURE}°C`);
                }
                if (numValue > DEFAULTS.ENVIRONMENTAL.MAX_TEMPERATURE) {
                    errors.push(`Temperature cannot exceed ${DEFAULTS.ENVIRONMENTAL.MAX_TEMPERATURE}°C`);
                }
                if (numValue < 18 || numValue > 25) {
                    warnings.push('Temperature is outside optimal range for most crops (18-25°C)');
                }
                break;

            case 'humidity':
                if (numValue < DEFAULTS.ENVIRONMENTAL.MIN_HUMIDITY) {
                    errors.push(`Humidity must be at least ${DEFAULTS.ENVIRONMENTAL.MIN_HUMIDITY}%`);
                }
                if (numValue > DEFAULTS.ENVIRONMENTAL.MAX_HUMIDITY) {
                    errors.push(`Humidity cannot exceed ${DEFAULTS.ENVIRONMENTAL.MAX_HUMIDITY}%`);
                }
                if (numValue < 50 || numValue > 70) {
                    warnings.push('Humidity is outside optimal range (50-70%)');
                }
                break;

            case 'ppfd':
                if (numValue < DEFAULTS.ENVIRONMENTAL.MIN_PPFD) {
                    errors.push(`Light intensity must be at least ${DEFAULTS.ENVIRONMENTAL.MIN_PPFD} μmol/m²/s`);
                }
                if (numValue > DEFAULTS.ENVIRONMENTAL.MAX_PPFD) {
                    errors.push(`Light intensity cannot exceed ${DEFAULTS.ENVIRONMENTAL.MAX_PPFD} μmol/m²/s`);
                }
                if (numValue < 200 || numValue > 800) {
                    warnings.push('Light intensity is outside typical range for leafy greens (200-800 μmol/m²/s)');
                }
                break;

            default:
                errors.push(`Unknown parameter: ${parameter}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Sanitize ratio rule data
     */
    sanitizeRatioRuleData(formData) {
        const sanitized = {};
        
        // Clean and validate each field
        sanitized.nutrient = this.sanitizeString(formData.nutrient);
        sanitized.ratio = this.sanitizeNumber(formData.ratio, VALIDATION_RULES.RATIO);
        sanitized.growthStage = this.sanitizeString(formData.growthStage);
        sanitized.multiplier = formData.multiplier ? 
            this.sanitizeNumber(formData.multiplier, VALIDATION_RULES.MULTIPLIER) : null;
        sanitized.notes = this.sanitizeString(formData.notes);
        
        return sanitized;
    }

    /**
     * Sanitize environmental adjustment data
     */
    sanitizeEnvironmentalData(formData) {
        const sanitized = {};
        
        sanitized.parameter = this.sanitizeString(formData.parameter);
        sanitized.condition = this.sanitizeNumber(formData.condition);
        sanitized.adjustment = this.sanitizeNumber(formData.adjustment);
        sanitized.description = this.sanitizeString(formData.description);
        
        return sanitized;
    }

    /**
     * Sanitize string input
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input.trim().substring(0, 255); // Limit length and trim whitespace
    }

    /**
     * Sanitize numeric input with constraints
     */
    sanitizeNumber(input, constraints = {}) {
        const num = parseFloat(input);
        
        if (isNaN(num)) return null;
        
        // Apply min/max constraints if provided
        let sanitized = num;
        if (constraints.MIN !== undefined) {
            sanitized = Math.max(sanitized, constraints.MIN);
        }
        if (constraints.MAX !== undefined) {
            sanitized = Math.min(sanitized, constraints.MAX);
        }
        
        // Round to appropriate decimal places based on step
        if (constraints.STEP !== undefined) {
            const decimals = this.getDecimalPlaces(constraints.STEP);
            sanitized = parseFloat(sanitized.toFixed(decimals));
        }
        
        return sanitized;
    }

    /**
     * Get number of decimal places from step value
     */
    getDecimalPlaces(step) {
        const stepStr = step.toString();
        if (stepStr.indexOf('.') === -1) return 0;
        return stepStr.split('.')[1].length;
    }

    /**
     * Validate growth stage code
     */
    isValidGrowthStage(stageCode) {
        // This would typically check against a list of valid growth stages
        const validStages = ['seedling', 'vegetative', 'flowering', 'fruiting', 'mature'];
        return !stageCode || validStages.includes(stageCode.toLowerCase());
    }

    /**
     * Validate complete nutrient system configuration
     */
    validateSystemNutrients(systemData) {
        const errors = [];
        const warnings = [];

        if (!systemData.ratioRules || systemData.ratioRules.length === 0) {
            warnings.push('No ratio rules defined for this system');
        }

        if (!systemData.environmentalAdjustments || systemData.environmentalAdjustments.length === 0) {
            warnings.push('No environmental adjustments configured');
        }

        // Check for conflicting rules
        const conflicts = this.detectRuleConflicts(systemData.ratioRules || []);
        if (conflicts.length > 0) {
            errors.push(...conflicts);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Detect conflicting ratio rules
     */
    detectRuleConflicts(rules) {
        const conflicts = [];
        const ruleMap = new Map();

        rules.forEach(rule => {
            const key = `${rule.nutrient}-${rule.growthStage || 'general'}`;
            
            if (ruleMap.has(key)) {
                conflicts.push(`Duplicate rule found for ${rule.nutrient} in ${rule.growthStage || 'general'} stage`);
            } else {
                ruleMap.set(key, rule);
            }
        });

        return conflicts;
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        const successRate = this.validationStats.totalValidations > 0 ?
            (this.validationStats.successfulValidations / this.validationStats.totalValidations * 100).toFixed(1) :
            0;

        return {
            ...this.validationStats,
            successRate: `${successRate}%`
        };
    }

    /**
     * Reset validation statistics
     */
    resetStats() {
        this.validationStats = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0
        };
    }
}