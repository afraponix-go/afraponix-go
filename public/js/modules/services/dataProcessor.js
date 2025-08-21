// Data Processor Service
// Handles data loading, processing, caching, and business logic calculations

/**
 * Data Processor Service
 * Centralized data management, processing, and caching
 */
export default class DataProcessor {
    constructor(app) {
        this.app = app;
        this.cache = new Map();
        this.loading = new Set();
        this.lastUpdate = new Map();
    }

    /**
     * Initialize the data processor
     */
    initialize() {
        console.log('📊 Data Processor initialized');
    }

    /**
     * Load all data for a system
     */
    async loadAllData(systemId) {
        if (!systemId) {
            console.warn('⚠️ No system ID provided for data loading');
            return;
        }

        if (this.loading.has(`all-${systemId}`)) {
            console.log('⏳ Data already loading for system:', systemId);
            return;
        }

        console.log('📊 Loading all data for system:', systemId);
        this.loading.add(`all-${systemId}`);

        try {
            const startTime = performance.now();

            // Load all data types in parallel
            const [
                waterQualityData,
                fishInventoryData,
                fishHealthData,
                plantGrowthData,
                operationsData,
                nutrientsData
            ] = await Promise.all([
                this.loadWaterQualityData(systemId),
                this.loadFishInventoryData(systemId),
                this.loadFishHealthData(systemId),
                this.loadPlantGrowthData(systemId),
                this.loadOperationsData(systemId),
                this.loadNutrientsData(systemId)
            ]);

            // Store in app dataRecords
            this.app.dataRecords = {
                waterQuality: waterQualityData,
                fishInventory: fishInventoryData,
                fishEvents: fishHealthData,
                plantGrowth: plantGrowthData,
                operations: operationsData,
                nutrients: nutrientsData
            };

            // Update cache timestamps
            this.lastUpdate.set(`all-${systemId}`, Date.now());

            const loadTime = performance.now() - startTime;
            console.log(`✅ All data loaded for system ${systemId} in ${Math.round(loadTime)}ms`);

            // Emit data loaded event
            if (this.app.eventManager) {
                this.app.eventManager.emit('data-loaded', {
                    systemId,
                    dataRecords: this.app.dataRecords,
                    loadTime
                });
            }

        } catch (error) {
            console.error(`❌ Failed to load data for system ${systemId}:`, error);
            throw error;
        } finally {
            this.loading.delete(`all-${systemId}`);
        }
    }

    /**
     * Load water quality data
     */
    async loadWaterQualityData(systemId) {
        const cacheKey = `water-quality-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🌊 Loading water quality data...');
            const data = await this.app.makeApiCall(`/data/water-quality/${systemId}`);
            
            this.cache.set(cacheKey, data || []);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return data || [];
        } catch (error) {
            console.error('❌ Failed to load water quality data:', error);
            return [];
        }
    }

    /**
     * Load fish inventory data
     */
    async loadFishInventoryData(systemId) {
        const cacheKey = `fish-inventory-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🐟 Loading fish inventory data...');
            const data = await this.app.makeApiCall(`/fish-inventory/system/${systemId}`);
            
            const processedData = data || { tanks: [] };
            this.cache.set(cacheKey, processedData);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return processedData;
        } catch (error) {
            console.error('❌ Failed to load fish inventory data:', error);
            return { tanks: [] };
        }
    }

    /**
     * Load fish health data
     */
    async loadFishHealthData(systemId) {
        const cacheKey = `fish-health-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🩺 Loading fish health data...');
            const data = await this.app.makeApiCall(`/data/fish-health/${systemId}`);
            
            this.cache.set(cacheKey, data || []);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return data || [];
        } catch (error) {
            console.error('❌ Failed to load fish health data:', error);
            return [];
        }
    }

    /**
     * Load plant growth data
     */
    async loadPlantGrowthData(systemId) {
        const cacheKey = `plant-growth-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🌱 Loading plant growth data...');
            const data = await this.app.makeApiCall(`/data/plant-growth/${systemId}`);
            
            // Process plant data for better usability
            const processedData = this.processPlantGrowthData(data || []);
            
            this.cache.set(cacheKey, processedData);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return processedData;
        } catch (error) {
            console.error('❌ Failed to load plant growth data:', error);
            return [];
        }
    }

    /**
     * Load operations data
     */
    async loadOperationsData(systemId) {
        const cacheKey = `operations-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('⚙️ Loading operations data...');
            const data = await this.app.makeApiCall(`/data/operations/${systemId}`);
            
            this.cache.set(cacheKey, data || []);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return data || [];
        } catch (error) {
            console.error('❌ Failed to load operations data:', error);
            return [];
        }
    }

    /**
     * Load nutrients data
     */
    async loadNutrientsData(systemId) {
        const cacheKey = `nutrients-${systemId}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🧪 Loading nutrients data...');
            const data = await this.app.makeApiCall(`/data/nutrients/${systemId}`);
            
            this.cache.set(cacheKey, data || []);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return data || [];
        } catch (error) {
            console.error('❌ Failed to load nutrients data:', error);
            return [];
        }
    }

    /**
     * Process plant growth data for better usability
     */
    processPlantGrowthData(rawData) {
        if (!Array.isArray(rawData)) return [];

        return rawData.map(entry => {
            // Add computed fields
            const processed = { ...entry };
            
            // Calculate days since planting
            if (entry.date_planted) {
                const plantedDate = new Date(entry.date_planted);
                const now = new Date();
                processed.daysSincePlanting = Math.floor((now - plantedDate) / (1000 * 60 * 60 * 24));
            }
            
            // Add growth stage based on days
            if (processed.daysSincePlanting !== undefined) {
                if (processed.daysSincePlanting < 7) {
                    processed.growthStage = 'seedling';
                } else if (processed.daysSincePlanting < 21) {
                    processed.growthStage = 'vegetative';
                } else if (processed.daysSincePlanting < 42) {
                    processed.growthStage = 'mature';
                } else {
                    processed.growthStage = 'harvest-ready';
                }
            }
            
            // Clean crop names
            if (entry.crop_name) {
                processed.cleanCropName = this.cleanCustomCropName(entry.crop_name);
            }
            
            return processed;
        });
    }

    /**
     * Clean custom crop names for display
     */
    cleanCustomCropName(cropName) {
        if (!cropName) return cropName;
        
        return cropName
            .replace(/_(justin|admin|test|user)$/i, '')
            .replace(/_+$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get processed analytics data
     */
    getAnalytics(systemId) {
        const data = this.app.dataRecords;
        if (!data) return {};

        return {
            water: this.getWaterQualityAnalytics(data.waterQuality),
            fish: this.getFishAnalytics(data.fishInventory, data.fishEvents),
            plants: this.getPlantAnalytics(data.plantGrowth),
            nutrients: this.getNutrientAnalytics(data.nutrients)
        };
    }

    /**
     * Get water quality analytics
     */
    getWaterQualityAnalytics(waterData) {
        if (!Array.isArray(waterData) || waterData.length === 0) {
            return { status: 'no-data' };
        }

        const recent = waterData.slice(-10);
        const latest = recent[recent.length - 1];

        // Calculate averages
        const averages = {};
        ['water_temperature', 'ph', 'dissolved_oxygen', 'ammonia'].forEach(param => {
            const values = recent.filter(d => d[param] != null).map(d => d[param]);
            if (values.length > 0) {
                averages[param] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        });

        // Determine overall health status
        let healthScore = 0;
        let factors = 0;

        if (latest.ph >= 6.5 && latest.ph <= 7.5) healthScore += 25; factors++;
        if (latest.water_temperature >= 20 && latest.water_temperature <= 30) healthScore += 25; factors++;
        if (latest.dissolved_oxygen >= 5) healthScore += 25; factors++;
        if (latest.ammonia <= 0.25) healthScore += 25; factors++;

        const overallHealth = factors > 0 ? Math.round(healthScore) : 0;

        return {
            latest,
            averages,
            overallHealth,
            status: overallHealth >= 75 ? 'excellent' : overallHealth >= 50 ? 'good' : 'needs-attention',
            dataPoints: waterData.length
        };
    }

    /**
     * Get fish analytics
     */
    getFishAnalytics(fishInventory, fishHealth) {
        const totalFish = fishInventory.tanks?.reduce((sum, tank) => sum + (tank.fish_count || 0), 0) || 0;
        const totalBiomass = fishInventory.tanks?.reduce((sum, tank) => 
            sum + ((tank.fish_count || 0) * (tank.average_weight_kg || 0)), 0) || 0;

        // Calculate density if system volume is available
        let density = 0;
        const systemVolume = fishInventory.systemVolume || 0;
        if (systemVolume > 0 && totalBiomass > 0) {
            density = totalBiomass / systemVolume;
        }

        // Recent feeding data
        const recentFeeding = Array.isArray(fishHealth) ? 
            fishHealth.filter(event => event.feeding_amount > 0).slice(-7) : [];

        return {
            totalFish,
            totalBiomass: Math.round(totalBiomass * 100) / 100,
            density: Math.round(density * 100) / 100,
            activeTanks: fishInventory.tanks?.filter(tank => tank.fish_count > 0).length || 0,
            recentFeedings: recentFeeding.length,
            averageFeedingAmount: recentFeeding.length > 0 ? 
                recentFeeding.reduce((sum, f) => sum + f.feeding_amount, 0) / recentFeeding.length : 0
        };
    }

    /**
     * Get plant analytics
     */
    getPlantAnalytics(plantData) {
        if (!Array.isArray(plantData)) return { status: 'no-data' };

        const activePlants = plantData.filter(p => !p.plants_harvested || p.plants_harvested === 0);
        const harvestedPlants = plantData.filter(p => p.plants_harvested > 0);
        
        const totalHarvested = harvestedPlants.reduce((sum, p) => sum + (p.plants_harvested || 0), 0);
        const totalHarvestWeight = harvestedPlants.reduce((sum, p) => sum + (p.harvest_weight || 0), 0);

        // Group by growth stage
        const stageGroups = activePlants.reduce((groups, plant) => {
            const stage = plant.growthStage || 'unknown';
            groups[stage] = (groups[stage] || 0) + 1;
            return groups;
        }, {});

        // Get crop diversity
        const cropTypes = [...new Set(plantData.map(p => p.cleanCropName || p.crop_name).filter(Boolean))];

        return {
            activePlants: activePlants.length,
            totalHarvested,
            totalHarvestWeight: Math.round(totalHarvestWeight * 100) / 100,
            stageDistribution: stageGroups,
            cropDiversity: cropTypes.length,
            cropTypes,
            averageHarvestWeight: totalHarvested > 0 ? 
                Math.round((totalHarvestWeight / totalHarvested) * 100) / 100 : 0
        };
    }

    /**
     * Get nutrient analytics
     */
    getNutrientAnalytics(nutrientData) {
        if (!Array.isArray(nutrientData) || nutrientData.length === 0) {
            return { status: 'no-data' };
        }

        // Group by nutrient type and get latest values
        const latestNutrients = {};
        nutrientData.forEach(entry => {
            if (!latestNutrients[entry.nutrient_type] || 
                new Date(entry.date) > new Date(latestNutrients[entry.nutrient_type].date)) {
                latestNutrients[entry.nutrient_type] = entry;
            }
        });

        // Calculate nutrient balance score
        const requiredNutrients = ['nitrogen', 'phosphorus', 'potassium'];
        const availableNutrients = Object.keys(latestNutrients);
        const completeness = availableNutrients.length / requiredNutrients.length;

        return {
            latestReadings: latestNutrients,
            availableNutrients: availableNutrients.length,
            completeness: Math.round(completeness * 100),
            lastUpdate: nutrientData.length > 0 ? 
                Math.max(...nutrientData.map(n => new Date(n.date).getTime())) : null,
            totalReadings: nutrientData.length
        };
    }

    /**
     * Check if cache is valid (5 minutes default)
     */
    isCacheValid(key, maxAge = 5 * 60 * 1000) {
        if (!this.cache.has(key) || !this.lastUpdate.has(key)) {
            return false;
        }
        
        const age = Date.now() - this.lastUpdate.get(key);
        return age < maxAge;
    }

    /**
     * Clear cache for specific system or all data
     */
    clearCache(systemId = null) {
        if (systemId) {
            // Clear cache for specific system
            const keysToDelete = [];
            for (const key of this.cache.keys()) {
                if (key.includes(systemId)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => {
                this.cache.delete(key);
                this.lastUpdate.delete(key);
            });
            console.log(`🧹 Cleared cache for system ${systemId}`);
        } else {
            // Clear all cache
            this.cache.clear();
            this.lastUpdate.clear();
            console.log('🧹 Cleared all cache');
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const cacheEntries = Array.from(this.cache.entries()).map(([key, value]) => ({
            key,
            size: JSON.stringify(value).length,
            lastUpdate: this.lastUpdate.get(key),
            age: Date.now() - (this.lastUpdate.get(key) || 0)
        }));

        return {
            totalEntries: this.cache.size,
            totalSize: cacheEntries.reduce((sum, entry) => sum + entry.size, 0),
            entries: cacheEntries,
            loadingOperations: Array.from(this.loading)
        };
    }
}