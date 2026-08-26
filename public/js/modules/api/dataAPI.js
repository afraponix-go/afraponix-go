// Data API Module
// Handles general data operations, entries, and system data management with comprehensive CRUD operations

import { apiClient } from './baseApiClient.js';

/**
 * Data API operations using the BaseApiClient for standardized patterns
 */
export class DataAPI {
    constructor(client = apiClient) {
        this.client = client;
    }

    // ================== LATEST DATA OPERATIONS ==================

    /**
     * Get latest data for preloading forms across all data types
     * @param {string} systemId - System ID
     * @returns {Promise<Object>} Latest data for water quality, plant growth, and fish health
     */
    async getLatestData(systemId) {
        try {
            return await this.client.get(`/data/latest/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch latest data:', error);
            throw new Error(`Failed to get latest data: ${error.message}`);
        }
    }

    // ================== NUTRIENT READINGS OPERATIONS ==================

    /**
     * Get all nutrient readings for a system
     * @param {string} systemId - System ID
     * @param {Object} options - Query options (nutrient_type, limit)
     * @returns {Promise<Array>} Array of nutrient readings
     */
    async getNutrientReadings(systemId, options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.nutrient_type) params.append('nutrient_type', options.nutrient_type);
            if (options.limit) params.append('limit', options.limit);
            
            const query = params.toString() ? `?${params.toString()}` : '';
            return await this.client.get(`/data/nutrients/${systemId}${query}`);
        } catch (error) {
            console.error('❌ Failed to fetch nutrient readings:', error);
            throw new Error(`Failed to get nutrient readings: ${error.message}`);
        }
    }

    /**
     * Save single or multiple nutrient readings
     * @param {string} systemId - System ID
     * @param {Array} nutrients - Array of nutrient readings {type, value, unit, reading_date, source, notes}
     * @returns {Promise<Object>} Save result with IDs
     */
    async saveNutrientReadings(systemId, nutrients) {
        try {
            if (!Array.isArray(nutrients)) {
                throw new Error('Nutrients must be an array');
            }
            
            return await this.client.post(`/data/nutrients/${systemId}`, { nutrients });
        } catch (error) {
            console.error('❌ Failed to save nutrient readings:', error);
            throw new Error(`Failed to save nutrient readings: ${error.message}`);
        }
    }

    /**
     * Get latest nutrient values for dashboard (aggregated by type)
     * @param {string} systemId - System ID
     * @returns {Promise<Object>} Latest nutrients by type
     */
    async getLatestNutrients(systemId) {
        try {
            return await this.client.get(`/data/nutrients/latest/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch latest nutrients:', error);
            throw new Error(`Failed to get latest nutrients: ${error.message}`);
        }
    }

    // ================== FISH HEALTH OPERATIONS ==================

    /**
     * Get fish health data for a system
     * @param {string} systemId - System ID
     * @returns {Promise<Array>} Array of fish health records
     */
    async getFishHealthData(systemId) {
        try {
            return await this.client.get(`/data/fish-health/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch fish health data:', error);
            throw new Error(`Failed to get fish health data: ${error.message}`);
        }
    }

    /**
     * Save fish health data entry
     * @param {string} systemId - System ID
     * @param {Object} fishHealthData - Fish health data object
     * @returns {Promise<Object>} Save result with ID
     */
    async saveFishHealthData(systemId, fishHealthData) {
        try {
            return await this.client.post(`/data/fish-health/${systemId}`, fishHealthData);
        } catch (error) {
            console.error('❌ Failed to save fish health data:', error);
            throw new Error(`Failed to save fish health data: ${error.message}`);
        }
    }

    /**
     * Get fish health entries with query parameters (alternative format)
     * @param {string} systemId - System ID
     * @param {number} limit - Optional limit
     * @returns {Promise<Array>} Array of fish health entries
     */
    async getFishHealthEntries(systemId, limit = null) {
        try {
            const params = new URLSearchParams({ system_id: systemId });
            if (limit) params.append('limit', limit.toString());
            
            return await this.client.get(`/data/entries/fish-health?${params.toString()}`);
        } catch (error) {
            console.error('❌ Failed to fetch fish health entries:', error);
            throw new Error(`Failed to get fish health entries: ${error.message}`);
        }
    }

    /**
     * Save fish health entry with system_id in body (alternative format)
     * @param {Object} fishHealthData - Fish health data including system_id
     * @returns {Promise<Object>} Save result with ID
     */
    async saveFishHealthEntry(fishHealthData) {
        try {
            return await this.client.post('/data/entries/fish-health', fishHealthData);
        } catch (error) {
            console.error('❌ Failed to save fish health entry:', error);
            throw new Error(`Failed to save fish health entry: ${error.message}`);
        }
    }

    /**
     * Update fish health entry
     * @param {string} entryId - Entry ID
     * @param {Object} updateData - Updated fish health data
     * @returns {Promise<Object>} Update result
     */
    async updateFishHealthEntry(entryId, updateData) {
        try {
            return await this.client.put(`/data/fish-health/entry/${entryId}`, updateData);
        } catch (error) {
            console.error('❌ Failed to update fish health entry:', error);
            throw new Error(`Failed to update fish health entry: ${error.message}`);
        }
    }

    /**
     * Delete fish health entry
     * @param {string} entryId - Entry ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteFishHealthEntry(entryId) {
        try {
            return await this.client.delete(`/data/fish-health/entry/${entryId}`);
        } catch (error) {
            console.error('❌ Failed to delete fish health entry:', error);
            throw new Error(`Failed to delete fish health entry: ${error.message}`);
        }
    }

    // ================== PLANT GROWTH OPERATIONS ==================

    /**
     * Get plant growth data for a system
     * @param {string} systemId - System ID
     * @returns {Promise<Array>} Array of plant growth records
     */
    async getPlantGrowthData(systemId) {
        try {
            return await this.client.get(`/data/plant-growth/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch plant growth data:', error);
            throw new Error(`Failed to get plant growth data: ${error.message}`);
        }
    }

    /**
     * Save plant growth data entry
     * @param {string} systemId - System ID
     * @param {Object} plantGrowthData - Plant growth data object
     * @returns {Promise<Object>} Save result with ID
     */
    async savePlantGrowthData(systemId, plantGrowthData) {
        try {
            return await this.client.post(`/data/plant-growth/${systemId}`, plantGrowthData);
        } catch (error) {
            console.error('❌ Failed to save plant growth data:', error);
            throw new Error(`Failed to save plant growth data: ${error.message}`);
        }
    }

    /**
     * Update plant growth record
     * @param {string} entryId - Entry ID
     * @param {Object} updateData - Updated plant growth data
     * @returns {Promise<Object>} Update result
     */
    async updatePlantGrowthEntry(entryId, updateData) {
        try {
            return await this.client.put(`/data/plant-growth/${entryId}`, updateData);
        } catch (error) {
            console.error('❌ Failed to update plant growth entry:', error);
            throw new Error(`Failed to update plant growth entry: ${error.message}`);
        }
    }

    /**
     * Delete plant growth record
     * @param {string} systemId - System ID
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} Delete result
     */
    async deletePlantGrowthRecord(systemId, recordId) {
        try {
            return await this.client.delete(`/data/plant-growth/${systemId}/${recordId}`);
        } catch (error) {
            console.error('❌ Failed to delete plant growth record:', error);
            throw new Error(`Failed to delete plant growth record: ${error.message}`);
        }
    }

    // ================== OPERATIONS DATA ==================

    /**
     * Get operations data for a system
     * @param {string} systemId - System ID
     * @returns {Promise<Array>} Array of operations records
     */
    async getOperationsData(systemId) {
        try {
            return await this.client.get(`/data/operations/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch operations data:', error);
            throw new Error(`Failed to get operations data: ${error.message}`);
        }
    }

    /**
     * Save operations data entry
     * @param {string} systemId - System ID
     * @param {Object} operationsData - Operations data object
     * @returns {Promise<Object>} Save result with ID
     */
    async saveOperationsData(systemId, operationsData) {
        try {
            return await this.client.post(`/data/operations/${systemId}`, operationsData);
        } catch (error) {
            console.error('❌ Failed to save operations data:', error);
            throw new Error(`Failed to save operations data: ${error.message}`);
        }
    }

    // ================== BATCH OPERATIONS ==================

    /**
     * Update grow bed for all records in a batch
     * @param {string} systemId - System ID
     * @param {string} batchId - Batch ID
     * @param {string} newGrowBedId - New grow bed ID
     * @returns {Promise<Object>} Update result
     */
    async updateBatchGrowBed(systemId, batchId, newGrowBedId) {
        try {
            return await this.client.put(`/data/batch/${systemId}/${batchId}/grow-bed`, {
                newGrowBedId
            });
        } catch (error) {
            console.error('❌ Failed to update batch grow bed:', error);
            throw new Error(`Failed to update batch grow bed: ${error.message}`);
        }
    }

    // ================== SENSOR DATA OPERATIONS ==================

    /**
     * Get latest sensor data for a system
     * @param {string} systemId - System ID
     * @returns {Promise<Object>} Latest sensor data
     */
    async getLatestSensorData(systemId) {
        try {
            return await this.client.get(`/data/sensors/latest/${systemId}`);
        } catch (error) {
            console.error('❌ Failed to fetch latest sensor data:', error);
            throw new Error(`Failed to get latest sensor data: ${error.message}`);
        }
    }

    // ================== BULK DATA OPERATIONS ==================

    /**
     * Save multiple data entries across different types in a single operation
     * @param {string} systemId - System ID
     * @param {Object} bulkData - Object containing different data types
     * @returns {Promise<Object>} Bulk save results
     */
    async saveBulkData(systemId, bulkData) {
        try {
            const results = {};
            
            // Process nutrients if provided
            if (bulkData.nutrients && Array.isArray(bulkData.nutrients)) {
                results.nutrients = await this.saveNutrientReadings(systemId, bulkData.nutrients);
            }
            
            // Process fish health if provided
            if (bulkData.fishHealth) {
                results.fishHealth = await this.saveFishHealthData(systemId, bulkData.fishHealth);
            }
            
            // Process plant growth if provided
            if (bulkData.plantGrowth) {
                results.plantGrowth = await this.savePlantGrowthData(systemId, bulkData.plantGrowth);
            }
            
            // Process operations if provided
            if (bulkData.operations) {
                results.operations = await this.saveOperationsData(systemId, bulkData.operations);
            }
            
            return results;
        } catch (error) {
            console.error('❌ Failed to save bulk data:', error);
            throw new Error(`Failed to save bulk data: ${error.message}`);
        }
    }

    // ================== UTILITY METHODS ==================

    /**
     * Validate nutrient reading data
     * @param {Object} nutrientData - Nutrient data to validate
     * @returns {boolean} True if valid
     */
    validateNutrientReading(nutrientData) {
        return !!(
            nutrientData.type && 
            nutrientData.value !== null && 
            nutrientData.value !== undefined && 
            nutrientData.value !== '' && 
            !isNaN(nutrientData.value)
        );
    }

    /**
     * Filter valid nutrient readings from array
     * @param {Array} nutrients - Array of nutrient readings
     * @returns {Array} Filtered valid nutrient readings
     */
    filterValidNutrients(nutrients) {
        return nutrients.filter(nutrient => this.validateNutrientReading(nutrient));
    }

    /**
     * Format date for API consumption
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForAPI(date) {
        if (!date) return new Date().toISOString().replace('T', ' ').slice(0, 19);
        
        if (typeof date === 'string') {
            return new Date(date).toISOString().replace('T', ' ').slice(0, 19);
        }
        
        return date.toISOString().replace('T', ' ').slice(0, 19);
    }
}

// Create default instance
const dataAPI = new DataAPI();

// Export both class and default instance
export { dataAPI };
export default dataAPI;

// Legacy function exports for backward compatibility
export const getLatestData = (systemId) => dataAPI.getLatestData(systemId);
export const getNutrientReadings = (systemId, options) => dataAPI.getNutrientReadings(systemId, options);
export const saveNutrientReadings = (systemId, nutrients) => dataAPI.saveNutrientReadings(systemId, nutrients);
export const getLatestNutrients = (systemId) => dataAPI.getLatestNutrients(systemId);
export const getFishHealthData = (systemId) => dataAPI.getFishHealthData(systemId);
export const saveFishHealthData = (systemId, data) => dataAPI.saveFishHealthData(systemId, data);
export const getFishHealthEntries = (systemId, limit) => dataAPI.getFishHealthEntries(systemId, limit);
export const saveFishHealthEntry = (data) => dataAPI.saveFishHealthEntry(data);
export const updateFishHealthEntry = (entryId, data) => dataAPI.updateFishHealthEntry(entryId, data);
export const deleteFishHealthEntry = (entryId) => dataAPI.deleteFishHealthEntry(entryId);
export const getPlantGrowthData = (systemId) => dataAPI.getPlantGrowthData(systemId);
export const savePlantGrowthData = (systemId, data) => dataAPI.savePlantGrowthData(systemId, data);
export const updatePlantGrowthEntry = (entryId, data) => dataAPI.updatePlantGrowthEntry(entryId, data);
export const deletePlantGrowthRecord = (systemId, recordId) => dataAPI.deletePlantGrowthRecord(systemId, recordId);
export const getOperationsData = (systemId) => dataAPI.getOperationsData(systemId);
export const saveOperationsData = (systemId, data) => dataAPI.saveOperationsData(systemId, data);
export const updateBatchGrowBed = (systemId, batchId, newGrowBedId) => dataAPI.updateBatchGrowBed(systemId, batchId, newGrowBedId);
export const getLatestSensorData = (systemId) => dataAPI.getLatestSensorData(systemId);
export const saveBulkData = (systemId, data) => dataAPI.saveBulkData(systemId, data);