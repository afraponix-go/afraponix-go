/**
 * Calculation Utils Module
 * Mathematical operations and aquaponics-specific calculations
 */

/**
 * CalculationUtils Class
 * Handles mathematical calculations for aquaponics systems
 */
export class CalculationUtils {
    constructor() {
        // Temperature adjustment factors
        this.temperatureFactors = {
            feeding: {
                5: 0.5,   // Very cold - slow metabolism
                10: 0.7,  // Cold
                15: 0.85, // Cool
                20: 1.0,  // Optimal base
                25: 1.15, // Warm
                30: 1.25, // Hot
                35: 0.9   // Too hot - stress reduces feeding
            }
        };
        
        console.log('🧮 CalculationUtils module initialized');
    }

    /**
     * Calculate total space for grow beds
     * 
     * @param {Array} growBeds - Array of grow bed objects
     * @returns {number} Total space in square meters
     */
    calculateTotalSpace(growBeds) {
        if (!growBeds || !Array.isArray(growBeds) || growBeds.length === 0) {
            return 0;
        }
        
        return growBeds.reduce((sum, bed) => {
            let area = 0;
            
            // Use equivalent_m2 if available (calculated planting area)
            if (bed.equivalent_m2 && !isNaN(bed.equivalent_m2)) {
                area = parseFloat(bed.equivalent_m2);
            } else if (bed.length && bed.width) {
                // Calculate from dimensions
                area = parseFloat(bed.length) * parseFloat(bed.width);
            } else if (bed.area) {
                // Use direct area value
                area = parseFloat(bed.area);
            }
            
            return sum + (isNaN(area) ? 0 : area);
        }, 0);
    }

    /**
     * Calculate occupied space from plant data
     * 
     * @param {Array} plantData - Array of plant records
     * @param {number} avgSpacingM2 - Average plant spacing in square meters (default 0.04)
     * @returns {number} Occupied space in square meters
     */
    calculateOccupiedSpace(plantData, avgSpacingM2 = 0.04) {
        if (!plantData || !Array.isArray(plantData)) {
            return 0;
        }
        
        // Count total active plants (not harvested)
        const totalActivePlants = plantData.filter(plant => 
            !plant.plants_harvested || plant.plants_harvested === 0
        ).length;
        
        return totalActivePlants * avgSpacingM2;
    }

    /**
     * Calculate grow bed capacity metrics
     * 
     * @param {Array} growBeds - Array of grow bed objects
     * @param {Array} plantData - Array of plant records
     * @returns {Object} Capacity metrics
     */
    calculateBedCapacityMetrics(growBeds, plantData) {
        if (!growBeds || growBeds.length === 0) {
            return {
                totalBeds: 0,
                totalSpace: 0,
                occupiedSpace: 0,
                availableSpace: 0,
                utilizationPercent: 0,
                utilizationColor: '#999'
            };
        }
        
        const totalSpace = this.calculateTotalSpace(growBeds);
        const occupiedSpace = this.calculateOccupiedSpace(plantData);
        const availableSpace = Math.max(0, totalSpace - occupiedSpace);
        const utilizationPercent = totalSpace > 0 ? Math.round((occupiedSpace / totalSpace) * 100) : 0;
        
        // Color coding for utilization
        let utilizationColor;
        if (utilizationPercent >= 70) {
            utilizationColor = '#e74c3c'; // Red - high utilization
        } else if (utilizationPercent >= 40) {
            utilizationColor = '#f39c12'; // Orange - medium utilization
        } else {
            utilizationColor = '#27ae60'; // Green - low utilization
        }
        
        // Ensure all values are numbers before formatting
        const safeTotal = isNaN(totalSpace) ? 0 : totalSpace;
        const safeOccupied = isNaN(occupiedSpace) ? 0 : occupiedSpace;
        const safeAvailable = isNaN(availableSpace) ? 0 : availableSpace;
        const safeUtilization = isNaN(utilizationPercent) ? 0 : utilizationPercent;

        return {
            totalBeds: growBeds.length,
            totalSpace: safeTotal.toFixed(1),
            occupiedSpace: safeOccupied.toFixed(1),
            availableSpace: safeAvailable.toFixed(1),
            utilizationPercent: safeUtilization,
            utilizationColor
        };
    }

    /**
     * Calculate fish tank density
     * 
     * @param {number} fishCount - Number of fish
     * @param {number} avgWeight - Average weight per fish (grams)
     * @param {number} volumeLiters - Tank volume in liters
     * @returns {number} Density in kg/m³
     */
    calculateFishDensity(fishCount, avgWeight, volumeLiters) {
        if (!fishCount || !avgWeight || !volumeLiters || volumeLiters <= 0) {
            return 0;
        }
        
        const totalWeightKg = (fishCount * avgWeight) / 1000; // Convert grams to kg
        const volumeM3 = volumeLiters / 1000; // Convert liters to cubic meters
        
        return totalWeightKg / volumeM3;
    }

    /**
     * Calculate temperature-adjusted feeding rate
     * 
     * @param {number} temperature - Water temperature in Celsius
     * @param {string} fishType - Type of fish (optional)
     * @param {number} baseRate - Base feeding rate (default 0.025 = 2.5%)
     * @returns {number} Adjusted feeding rate
     */
    calculateTemperatureAdjustedFeedingRate(temperature, fishType = null, baseRate = 0.025) {
        if (!temperature || isNaN(temperature)) {
            return baseRate;
        }
        
        // Find closest temperature factor
        const temps = Object.keys(this.temperatureFactors.feeding).map(t => parseInt(t)).sort((a, b) => a - b);
        let closestTemp = temps[0];
        
        for (const temp of temps) {
            if (Math.abs(temp - temperature) < Math.abs(closestTemp - temperature)) {
                closestTemp = temp;
            }
        }
        
        const factor = this.temperatureFactors.feeding[closestTemp] || 1.0;
        return baseRate * factor;
    }

    /**
     * Calculate daily feeding amount
     * 
     * @param {number} fishCount - Number of fish
     * @param {number} avgWeight - Average weight per fish (grams)
     * @param {number} temperature - Water temperature
     * @param {string} fishType - Type of fish
     * @returns {Object} Feeding calculations
     */
    calculateDailyFeedingAmount(fishCount, avgWeight, temperature, fishType = null) {
        const totalFishWeight = fishCount * avgWeight;
        const adjustedRate = this.calculateTemperatureAdjustedFeedingRate(temperature, fishType);
        const dailyAmount = totalFishWeight * adjustedRate;
        
        return {
            totalFishWeight: totalFishWeight,
            feedingRate: adjustedRate,
            dailyAmount: Math.round(dailyAmount),
            perFeeding: Math.round(dailyAmount / 2.5), // Assuming 2.5 feedings per day
            perFeedingRange: {
                min: Math.round(dailyAmount / 3),
                max: Math.round(dailyAmount / 2)
            }
        };
    }

    /**
     * Calculate tank volume from dimensions
     * 
     * @param {number} length - Length in meters
     * @param {number} width - Width in meters  
     * @param {number} height - Height in meters
     * @param {string} shape - Tank shape ('rectangular', 'circular')
     * @returns {number} Volume in liters
     */
    calculateTankVolume(length, width, height, shape = 'rectangular') {
        if (!length || !height || isNaN(length) || isNaN(height)) {
            return 0;
        }
        
        let volumeM3 = 0;
        
        if (shape === 'circular') {
            // For circular tanks, length is diameter
            const radius = length / 2;
            volumeM3 = Math.PI * Math.pow(radius, 2) * height;
        } else {
            // Rectangular tank
            if (!width || isNaN(width)) {
                return 0;
            }
            volumeM3 = length * width * height;
        }
        
        return volumeM3 * 1000; // Convert to liters
    }

    /**
     * Calculate grow bed volume based on type
     * 
     * @param {Object} bed - Grow bed configuration
     * @returns {number} Volume in liters
     */
    calculateGrowBedVolume(bed) {
        if (!bed || !bed.type) {
            return 0;
        }
        
        const { type, length, width, height, troughLength, channels, reservoirVolume } = bed;
        
        switch (type.toLowerCase()) {
            case 'dwc':
            case 'deep_water_culture':
                return this.calculateTankVolume(length, width, height);
                
            case 'ebb_flow':
            case 'flood_drain':
                // Assume 25% volume for flood and drain (rest is media)
                return this.calculateTankVolume(length, width, height) * 0.25;
                
            case 'nft':
                // Use reservoir volume if provided
                return reservoirVolume || (troughLength * channels * 0.1); // Estimate 0.1L per channel per meter
                
            case 'vertical':
                // Base volume only (verticals don't add water volume)
                return this.calculateTankVolume(length, width, height);
                
            default:
                return 0;
        }
    }

    /**
     * Calculate grow bed planting area
     * 
     * @param {Object} bed - Grow bed configuration
     * @returns {number} Planting area in square meters
     */
    calculateGrowBedArea(bed) {
        if (!bed || !bed.type) {
            return 0;
        }
        
        const { type, length, width, verticals, plantsPerVertical, troughLength, channels, plantSpacing } = bed;
        
        switch (type.toLowerCase()) {
            case 'dwc':
            case 'deep_water_culture':
            case 'ebb_flow':
            case 'flood_drain':
                return (length || 0) * (width || 0);
                
            case 'vertical':
                // Calculate based on number of plants
                const totalPlants = (verticals || 0) * (plantsPerVertical || 0);
                return totalPlants / 25; // Assume 25 plants per square meter
                
            case 'nft':
                // Calculate based on trough length and plant spacing
                if (troughLength && plantSpacing && channels) {
                    const plantsPerChannel = Math.floor(troughLength / (plantSpacing / 100)); // Convert cm to m
                    const totalPlants = plantsPerChannel * channels;
                    return totalPlants / 25; // Assume 25 plants per square meter
                }
                return 0;
                
            default:
                return 0;
        }
    }

    /**
     * Calculate water quality score
     * 
     * @param {Object} parameters - Water quality parameters
     * @returns {Object} Water quality assessment
     */
    calculateWaterQualityScore(parameters) {
        if (!parameters) {
            return { score: 0, grade: 'Unknown', status: 'No data' };
        }
        
        const { ph, temperature, dissolved_oxygen, ammonia, nitrate } = parameters;
        let score = 100;
        let issues = [];
        
        // pH scoring (optimal 6.5-7.5)
        if (ph) {
            if (ph < 5.5 || ph > 8.5) {
                score -= 30;
                issues.push('pH critical');
            } else if (ph < 6.0 || ph > 8.0) {
                score -= 15;
                issues.push('pH suboptimal');
            } else if (ph < 6.5 || ph > 7.5) {
                score -= 5;
            }
        }
        
        // Temperature scoring (optimal 20-25°C for most systems)
        if (temperature) {
            if (temperature < 10 || temperature > 35) {
                score -= 25;
                issues.push('Temperature extreme');
            } else if (temperature < 15 || temperature > 30) {
                score -= 10;
                issues.push('Temperature suboptimal');
            }
        }
        
        // Dissolved oxygen scoring (optimal >5mg/L)
        if (dissolved_oxygen !== undefined) {
            if (dissolved_oxygen < 3) {
                score -= 30;
                issues.push('Low oxygen');
            } else if (dissolved_oxygen < 5) {
                score -= 10;
            }
        }
        
        // Ammonia scoring (optimal <0.5mg/L)
        if (ammonia !== undefined) {
            if (ammonia > 2) {
                score -= 35;
                issues.push('High ammonia');
            } else if (ammonia > 1) {
                score -= 20;
                issues.push('Elevated ammonia');
            } else if (ammonia > 0.5) {
                score -= 5;
            }
        }
        
        // Nitrate scoring (optimal <40mg/L)
        if (nitrate !== undefined) {
            if (nitrate > 100) {
                score -= 20;
                issues.push('High nitrate');
            } else if (nitrate > 60) {
                score -= 10;
            }
        }
        
        score = Math.max(0, score);
        
        let grade, status;
        if (score >= 90) {
            grade = 'A';
            status = 'Excellent';
        } else if (score >= 80) {
            grade = 'B';
            status = 'Good';
        } else if (score >= 70) {
            grade = 'C';
            status = 'Fair';
        } else if (score >= 60) {
            grade = 'D';
            status = 'Poor';
        } else {
            grade = 'F';
            status = 'Critical';
        }
        
        return {
            score: Math.round(score),
            grade,
            status,
            issues
        };
    }

    /**
     * Calculate nutrient solution concentration
     * 
     * @param {Object} nutrients - Nutrient values
     * @param {number} volume - Solution volume in liters
     * @returns {Object} Nutrient calculations
     */
    calculateNutrientConcentration(nutrients, volume) {
        if (!nutrients || !volume || volume <= 0) {
            return {};
        }
        
        const calculations = {};
        
        Object.entries(nutrients).forEach(([nutrient, concentration]) => {
            if (concentration && !isNaN(concentration)) {
                const totalAmount = parseFloat(concentration) * volume;
                calculations[nutrient] = {
                    concentration: parseFloat(concentration),
                    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
                    unit: this.getNutrientUnit(nutrient)
                };
            }
        });
        
        return calculations;
    }

    /**
     * Get standard unit for nutrient
     * 
     * @param {string} nutrient - Nutrient name
     * @returns {string} Unit abbreviation
     */
    getNutrientUnit(nutrient) {
        const units = {
            nitrogen: 'mg/L',
            phosphorus: 'mg/L',
            potassium: 'mg/L',
            calcium: 'mg/L',
            magnesium: 'mg/L',
            sulfur: 'mg/L',
            iron: 'mg/L',
            ph: '',
            ec: 'mS/cm',
            tds: 'ppm'
        };
        
        return units[nutrient.toLowerCase()] || 'mg/L';
    }

    /**
     * Convert units (basic conversions)
     * 
     * @param {number} value - Value to convert
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {number} Converted value
     */
    convertUnits(value, fromUnit, toUnit) {
        if (!value || isNaN(value) || fromUnit === toUnit) {
            return value;
        }
        
        const conversions = {
            // Temperature
            'celsius_fahrenheit': (c) => (c * 9/5) + 32,
            'fahrenheit_celsius': (f) => (f - 32) * 5/9,
            
            // Volume
            'liters_gallons': (l) => l * 0.264172,
            'gallons_liters': (g) => g * 3.78541,
            'liters_m3': (l) => l / 1000,
            'm3_liters': (m3) => m3 * 1000,
            
            // Weight
            'grams_kg': (g) => g / 1000,
            'kg_grams': (kg) => kg * 1000,
            'kg_pounds': (kg) => kg * 2.20462,
            'pounds_kg': (lb) => lb * 0.453592,
            
            // Area
            'm2_ft2': (m2) => m2 * 10.7639,
            'ft2_m2': (ft2) => ft2 * 0.092903,
            
            // Length
            'meters_feet': (m) => m * 3.28084,
            'feet_meters': (ft) => ft * 0.3048,
            'cm_inches': (cm) => cm * 0.393701,
            'inches_cm': (inch) => inch * 2.54
        };
        
        const conversionKey = `${fromUnit}_${toUnit}`;
        const conversionFunction = conversions[conversionKey];
        
        if (conversionFunction) {
            return conversionFunction(value);
        }
        
        return value; // No conversion available
    }
}

// Create calculation instance
const calculationUtils = new CalculationUtils();

// Export individual calculation functions for convenience
export const calculateTotalSpace = (growBeds) => calculationUtils.calculateTotalSpace(growBeds);
export const calculateOccupiedSpace = (plantData, avgSpacing) => calculationUtils.calculateOccupiedSpace(plantData, avgSpacing);
export const calculateBedCapacityMetrics = (growBeds, plantData) => calculationUtils.calculateBedCapacityMetrics(growBeds, plantData);
export const calculateFishDensity = (fishCount, avgWeight, volumeLiters) => calculationUtils.calculateFishDensity(fishCount, avgWeight, volumeLiters);
export const calculateTemperatureAdjustedFeedingRate = (temp, fishType, baseRate) => calculationUtils.calculateTemperatureAdjustedFeedingRate(temp, fishType, baseRate);
export const calculateDailyFeedingAmount = (fishCount, avgWeight, temp, fishType) => calculationUtils.calculateDailyFeedingAmount(fishCount, avgWeight, temp, fishType);
export const calculateTankVolume = (length, width, height, shape) => calculationUtils.calculateTankVolume(length, width, height, shape);
export const calculateGrowBedVolume = (bed) => calculationUtils.calculateGrowBedVolume(bed);
export const calculateGrowBedArea = (bed) => calculationUtils.calculateGrowBedArea(bed);
export const calculateWaterQualityScore = (parameters) => calculationUtils.calculateWaterQualityScore(parameters);
export const calculateNutrientConcentration = (nutrients, volume) => calculationUtils.calculateNutrientConcentration(nutrients, volume);
export const convertUnits = (value, fromUnit, toUnit) => calculationUtils.convertUnits(value, fromUnit, toUnit);

// Export default instance
export default calculationUtils;