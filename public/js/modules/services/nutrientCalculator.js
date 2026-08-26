// Nutrient Calculator Service
// Handles all nutrient calculations and business logic

import { 
    API_ENDPOINTS, 
    CALCULATION_FACTORS, 
    ENVIRONMENTAL_PARAMETERS,
    MESSAGE_TYPES 
} from '../constants/nutrientConstants.js';

/**
 * Nutrient Calculator Service
 * Provides nutrient calculation algorithms and data management
 */
export default class NutrientCalculator {
    constructor(app) {
        this.app = app;
        
        // Data storage
        this.ratioRules = [];
        this.environmentalAdjustments = [];
        this.nutrients = [];
        this.growthStages = [];
        this.environmentalParameters = [...ENVIRONMENTAL_PARAMETERS];
        
        // Service statistics
        this.serviceStats = {
            calculationsPerformed: 0,
            rulesLoaded: 0,
            adjustmentsApplied: 0,
            apiCalls: 0
        };
        
        console.log('🧮 Nutrient Calculator Service initialized');
    }

    /**
     * Initialize the service by loading all required data
     */
    async initialize() {
        console.log('🔄 Initializing Nutrient Calculator Service...');
        
        try {
            await Promise.all([
                this.loadNutrients(),
                this.loadGrowthStages(),
                this.loadRatioRules(),
                this.loadEnvironmentalAdjustments()
            ]);
            
            console.log('✅ Nutrient Calculator Service initialized successfully');
            console.log(`📊 Loaded ${this.ratioRules.length} ratio rules, ${this.nutrients.length} nutrients`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Nutrient Calculator Service:', error);
            throw error;
        }
    }

    // =====================================================
    // DATA LOADING METHODS
    // =====================================================

    /**
     * Load ratio rules from API
     */
    async loadRatioRules() {
        try {
            this.serviceStats.apiCalls++;
            const response = await fetch(API_ENDPOINTS.RATIO_RULES);
            const data = await response.json();
            
            if (data.success) {
                this.ratioRules = data.data || [];
                this.serviceStats.rulesLoaded = this.ratioRules.length;
                console.log(`📊 Loaded ${this.ratioRules.length} ratio rules`);
                return this.ratioRules;
            } else {
                throw new Error(data.error || 'Failed to load ratio rules');
            }
        } catch (error) {
            console.error('Error loading ratio rules:', error);
            this.ratioRules = [];
            throw error;
        }
    }

    /**
     * Load environmental adjustments from API
     */
    async loadEnvironmentalAdjustments() {
        try {
            this.serviceStats.apiCalls++;
            const response = await fetch(API_ENDPOINTS.ENVIRONMENTAL_ADJUSTMENTS);
            const data = await response.json();
            
            if (data.success) {
                this.environmentalAdjustments = data.data || [];
                console.log(`🌡️ Loaded ${this.environmentalAdjustments.length} environmental adjustments`);
                return this.environmentalAdjustments;
            } else {
                throw new Error(data.error || 'Failed to load environmental adjustments');
            }
        } catch (error) {
            console.error('Error loading environmental adjustments:', error);
            this.environmentalAdjustments = [];
            throw error;
        }
    }

    /**
     * Load nutrients from API
     */
    async loadNutrients() {
        try {
            this.serviceStats.apiCalls++;
            const response = await fetch(API_ENDPOINTS.NUTRIENTS);
            const data = await response.json();
            
            if (data.success) {
                this.nutrients = data.data || [];
                console.log(`🧪 Loaded ${this.nutrients.length} nutrients`);
                return this.nutrients;
            } else {
                throw new Error(data.error || 'Failed to load nutrients');
            }
        } catch (error) {
            console.error('Error loading nutrients:', error);
            this.nutrients = [];
            throw error;
        }
    }

    /**
     * Load growth stages from API
     */
    async loadGrowthStages() {
        try {
            this.serviceStats.apiCalls++;
            const response = await fetch(API_ENDPOINTS.GROWTH_STAGES);
            const data = await response.json();
            
            if (data.success) {
                this.growthStages = data.data || [];
                console.log(`🌱 Loaded ${this.growthStages.length} growth stages`);
                return this.growthStages;
            } else {
                throw new Error(data.error || 'Failed to load growth stages');
            }
        } catch (error) {
            console.error('Error loading growth stages:', error);
            this.growthStages = [];
            throw error;
        }
    }

    // =====================================================
    // CALCULATION METHODS
    // =====================================================

    /**
     * Calculate nutrient requirements for a specific crop and conditions
     */
    calculateNutrientRequirements(cropData, environmentalData = {}) {
        this.serviceStats.calculationsPerformed++;
        
        try {
            const requirements = {};
            const baseRules = this.getRatioRulesForCrop(cropData.cropType, cropData.growthStage);
            
            baseRules.forEach(rule => {
                const baseRatio = parseFloat(rule.ratio) || 1.0;
                const environmentalMultiplier = this.calculateEnvironmentalMultiplier(
                    rule.nutrient, 
                    environmentalData
                );
                const growthStageMultiplier = this.getGrowthStageMultiplier(cropData.growthStage);
                
                requirements[rule.nutrient] = {
                    baseRatio,
                    environmentalMultiplier,
                    growthStageMultiplier,
                    finalRatio: baseRatio * environmentalMultiplier * growthStageMultiplier,
                    unit: this.getNutrientUnit(rule.nutrient),
                    ruleId: rule.id
                };
            });
            
            console.log(`🧮 Calculated requirements for ${Object.keys(requirements).length} nutrients`);
            return requirements;
            
        } catch (error) {
            console.error('Error calculating nutrient requirements:', error);
            return {};
        }
    }

    /**
     * Calculate environmental adjustment multiplier
     */
    calculateEnvironmentalMultiplier(nutrientCode, environmentalData) {
        let multiplier = 1.0;
        this.serviceStats.adjustmentsApplied++;
        
        try {
            // Temperature adjustments
            if (environmentalData.temperature) {
                const temp = parseFloat(environmentalData.temperature);
                if (temp < 18) {
                    multiplier *= CALCULATION_FACTORS.TEMPERATURE_FACTOR.LOW_TEMP;
                } else if (temp > 25) {
                    multiplier *= CALCULATION_FACTORS.TEMPERATURE_FACTOR.HIGH_TEMP;
                }
            }
            
            // pH adjustments
            if (environmentalData.ph) {
                const ph = parseFloat(environmentalData.ph);
                if (ph < 5.5) {
                    multiplier *= CALCULATION_FACTORS.PH_FACTOR.LOW_PH;
                } else if (ph > 6.5) {
                    multiplier *= CALCULATION_FACTORS.PH_FACTOR.HIGH_PH;
                }
            }
            
            // Apply specific environmental adjustments from database
            const specificAdjustments = this.environmentalAdjustments.filter(adj => 
                adj.nutrient === nutrientCode || adj.nutrient === 'all'
            );
            
            specificAdjustments.forEach(adjustment => {
                if (this.matchesEnvironmentalCondition(adjustment, environmentalData)) {
                    multiplier *= parseFloat(adjustment.multiplier) || 1.0;
                }
            });
            
        } catch (error) {
            console.error('Error calculating environmental multiplier:', error);
        }
        
        return Math.max(0.1, Math.min(3.0, multiplier)); // Clamp between 0.1 and 3.0
    }

    /**
     * Get growth stage multiplier
     */
    getGrowthStageMultiplier(growthStage) {
        if (!growthStage) return 1.0;
        
        return CALCULATION_FACTORS.GROWTH_STAGE_MULTIPLIERS[growthStage.toLowerCase()] || 1.0;
    }

    /**
     * Convert EC to PPM
     */
    convertEcToPpm(ecValue) {
        return parseFloat(ecValue) * CALCULATION_FACTORS.EC_TO_PPM;
    }

    /**
     * Convert PPM to EC
     */
    convertPpmToEc(ppmValue) {
        return parseFloat(ppmValue) * CALCULATION_FACTORS.PPM_TO_EC;
    }

    /**
     * Calculate total EC for nutrient solution
     */
    calculateTotalEc(nutrientConcentrations) {
        let totalPpm = 0;
        
        Object.values(nutrientConcentrations).forEach(nutrient => {
            if (nutrient.concentration) {
                totalPpm += parseFloat(nutrient.concentration);
            }
        });
        
        return this.convertPpmToEc(totalPpm);
    }

    // =====================================================
    // DATA RETRIEVAL METHODS
    // =====================================================

    /**
     * Get ratio rules for specific crop and growth stage
     */
    getRatioRulesForCrop(cropType, growthStage = null) {
        return this.ratioRules.filter(rule => {
            const matchesCrop = !rule.cropType || rule.cropType === cropType || rule.cropType === 'all';
            const matchesStage = !growthStage || !rule.growthStage || rule.growthStage === growthStage;
            
            return matchesCrop && matchesStage;
        });
    }

    /**
     * Get nutrient by code
     */
    getNutrientByCode(nutrientCode) {
        return this.nutrients.find(nutrient => nutrient.code === nutrientCode);
    }

    /**
     * Get nutrient unit
     */
    getNutrientUnit(nutrientCode) {
        const nutrient = this.getNutrientByCode(nutrientCode);
        return nutrient ? nutrient.unit : 'ppm';
    }

    /**
     * Get growth stage by code
     */
    getGrowthStageByCode(stageCode) {
        return this.growthStages.find(stage => stage.code === stageCode);
    }

    /**
     * Check if environmental data matches adjustment condition
     */
    matchesEnvironmentalCondition(adjustment, environmentalData) {
        const parameter = adjustment.parameter;
        const condition = adjustment.condition;
        const operator = adjustment.operator || 'equals';
        
        if (!environmentalData[parameter]) return false;
        
        const actualValue = parseFloat(environmentalData[parameter]);
        const conditionValue = parseFloat(condition);
        
        switch (operator) {
            case 'greater_than':
                return actualValue > conditionValue;
            case 'less_than':
                return actualValue < conditionValue;
            case 'greater_equal':
                return actualValue >= conditionValue;
            case 'less_equal':
                return actualValue <= conditionValue;
            case 'equals':
            default:
                return Math.abs(actualValue - conditionValue) < 0.1;
        }
    }

    // =====================================================
    // DATA MODIFICATION METHODS
    // =====================================================

    /**
     * Save ratio rule
     */
    async saveRatioRule(ruleData) {
        try {
            this.serviceStats.apiCalls++;
            const method = ruleData.id ? 'PUT' : 'POST';
            const endpoint = ruleData.id ? 
                `${API_ENDPOINTS.RATIO_RULES}/${ruleData.id}` : 
                API_ENDPOINTS.RATIO_RULES;

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(ruleData)
            });

            const result = await response.json();
            
            if (result.success) {
                // Reload rules to get updated data
                await this.loadRatioRules();
                console.log('✅ Ratio rule saved successfully');
                return result;
            } else {
                throw new Error(result.error || 'Failed to save ratio rule');
            }
        } catch (error) {
            console.error('Error saving ratio rule:', error);
            throw error;
        }
    }

    /**
     * Delete ratio rule
     */
    async deleteRatioRule(ruleId) {
        try {
            this.serviceStats.apiCalls++;
            const response = await fetch(`${API_ENDPOINTS.RATIO_RULES}/${ruleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Reload rules to get updated data
                await this.loadRatioRules();
                console.log('✅ Ratio rule deleted successfully');
                return result;
            } else {
                throw new Error(result.error || 'Failed to delete ratio rule');
            }
        } catch (error) {
            console.error('Error deleting ratio rule:', error);
            throw error;
        }
    }

    /**
     * Save environmental adjustment
     */
    async saveEnvironmentalAdjustment(adjustmentData) {
        try {
            this.serviceStats.apiCalls++;
            const method = adjustmentData.id ? 'PUT' : 'POST';
            const endpoint = adjustmentData.id ? 
                `${API_ENDPOINTS.ENVIRONMENTAL_ADJUSTMENTS}/${adjustmentData.id}` : 
                API_ENDPOINTS.ENVIRONMENTAL_ADJUSTMENTS;

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(adjustmentData)
            });

            const result = await response.json();
            
            if (result.success) {
                await this.loadEnvironmentalAdjustments();
                console.log('✅ Environmental adjustment saved successfully');
                return result;
            } else {
                throw new Error(result.error || 'Failed to save environmental adjustment');
            }
        } catch (error) {
            console.error('Error saving environmental adjustment:', error);
            throw error;
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Generate nutrient recommendation report
     */
    generateNutrientReport(cropData, environmentalData) {
        const requirements = this.calculateNutrientRequirements(cropData, environmentalData);
        const totalEc = this.calculateTotalEc(requirements);
        
        return {
            cropType: cropData.cropType,
            growthStage: cropData.growthStage,
            environmentalConditions: environmentalData,
            nutrientRequirements: requirements,
            totalEc,
            totalPpm: this.convertEcToPpm(totalEc),
            generatedAt: new Date().toISOString(),
            rulesApplied: this.ratioRules.length,
            adjustmentsApplied: this.environmentalAdjustments.length
        };
    }

    /**
     * Get service statistics
     */
    getServiceStats() {
        return {
            ...this.serviceStats,
            dataLoaded: {
                nutrients: this.nutrients.length,
                growthStages: this.growthStages.length,
                ratioRules: this.ratioRules.length,
                environmentalAdjustments: this.environmentalAdjustments.length
            }
        };
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        console.log('🔄 Refreshing nutrient calculator data...');
        return await this.initialize();
    }

    /**
     * Clean up resources
     */
    destroy() {
        console.log('🧹 Destroying Nutrient Calculator Service');
        
        // Clear data
        this.ratioRules = [];
        this.environmentalAdjustments = [];
        this.nutrients = [];
        this.growthStages = [];
        
        // Reset stats
        this.serviceStats = {
            calculationsPerformed: 0,
            rulesLoaded: 0,
            adjustmentsApplied: 0,
            apiCalls: 0
        };
        
        console.log('✅ Nutrient Calculator Service destroyed');
    }
}