// Import/Export API Module
// Handles data import/export operations with support for Excel and CSV files

import { apiClient } from './baseApiClient.js';

/**
 * Import/Export API operations using the BaseApiClient for standardized patterns
 */
export class ImportExportAPI {
    constructor(client = apiClient) {
        this.client = client;
    }

    // ================== SAMPLE FILE GENERATION ==================

    /**
     * Download sample data file for import template
     * @param {string} type - Sample type ('nutrients', 'water_quality', 'fish_health')
     * @param {string} systemId - System ID
     * @param {string} format - File format ('xlsx' or 'csv')
     * @returns {Promise<Blob>} File blob for download
     */
    async downloadSampleFile(type, systemId, format = 'xlsx') {
        try {
            const params = new URLSearchParams({ systemId, format });
            const response = await this.client.request(`/data-import/sample/${type}?${params.toString()}`, {
                method: 'GET'
            });

            // Return the response for blob handling
            return response.blob();
        } catch (error) {
            console.error('❌ Failed to download sample file:', error);
            throw new Error(`Failed to download sample file: ${error.message}`);
        }
    }

    /**
     * Get sample file URL for direct download link
     * @param {string} type - Sample type ('nutrients', 'water_quality', 'fish_health')
     * @param {string} systemId - System ID
     * @param {string} format - File format ('xlsx' or 'csv')
     * @returns {string} Download URL
     */
    getSampleFileUrl(type, systemId, format = 'xlsx') {
        const params = new URLSearchParams({ systemId, format });
        return `/api/data-import/sample/${type}?${params.toString()}`;
    }

    // ================== FILE IMPORT OPERATIONS ==================

    /**
     * Import data from uploaded file
     * @param {string} type - Import type ('nutrients', 'water_quality', 'fish_health')
     * @param {File} file - File to import
     * @param {string} systemId - System ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Import result
     */
    async importDataFile(type, file, systemId, options = {}) {
        try {
            const formData = new FormData();
            formData.append('dataFile', file);
            formData.append('systemId', systemId);
            
            // Add any additional options
            Object.keys(options).forEach(key => {
                formData.append(key, options[key]);
            });

            return await this.client.post(`/data-import/import/${type}`, formData, {
                headers: {} // Don't set Content-Type, let browser set it for FormData
            });
        } catch (error) {
            console.error('❌ Failed to import data file:', error);
            throw new Error(`Failed to import data file: ${error.message}`);
        }
    }

    /**
     * Import nutrients data from file
     * @param {File} file - File to import
     * @param {string} systemId - System ID
     * @param {Object} options - Additional import options
     * @returns {Promise<Object>} Import result
     */
    async importNutrientsFile(file, systemId, options = {}) {
        return this.importDataFile('nutrients', file, systemId, options);
    }

    /**
     * Import water quality data from file
     * @param {File} file - File to import
     * @param {string} systemId - System ID
     * @param {Object} options - Additional import options
     * @returns {Promise<Object>} Import result
     */
    async importWaterQualityFile(file, systemId, options = {}) {
        return this.importDataFile('water_quality', file, systemId, options);
    }

    /**
     * Import fish health data from file
     * @param {File} file - File to import
     * @param {string} systemId - System ID
     * @param {Object} options - Additional import options
     * @returns {Promise<Object>} Import result
     */
    async importFishHealthFile(file, systemId, options = {}) {
        return this.importDataFile('fish_health', file, systemId, options);
    }

    // ================== IMPORT HISTORY OPERATIONS ==================

    /**
     * Get import history for a system
     * @param {string} systemId - System ID
     * @param {number} limit - Number of records to retrieve
     * @returns {Promise<Object>} Import history data
     */
    async getImportHistory(systemId, limit = 10) {
        try {
            const params = limit !== 10 ? `?limit=${limit}` : '';
            return await this.client.get(`/data-import/history/${systemId}${params}`);
        } catch (error) {
            console.error('❌ Failed to fetch import history:', error);
            throw new Error(`Failed to get import history: ${error.message}`);
        }
    }

    /**
     * Undo/delete an import operation
     * @param {string} historyId - Import history ID
     * @returns {Promise<Object>} Undo result
     */
    async undoImport(historyId) {
        try {
            return await this.client.delete(`/data-import/undo/${historyId}`);
        } catch (error) {
            console.error('❌ Failed to undo import:', error);
            throw new Error(`Failed to undo import: ${error.message}`);
        }
    }

    // ================== DATA EXPORT OPERATIONS ==================

    /**
     * Export system data (extends systems API export functionality)
     * @param {string} systemId - System ID
     * @param {string} format - Export format ('json', 'csv', 'xlsx')
     * @param {Object} options - Export options (dateRange, dataTypes, etc.)
     * @returns {Promise<Blob>} Export file blob
     */
    async exportSystemData(systemId, format = 'json', options = {}) {
        try {
            const params = new URLSearchParams({ format });
            
            // Add export options as query parameters
            Object.keys(options).forEach(key => {
                if (options[key] !== undefined && options[key] !== null) {
                    params.append(key, options[key]);
                }
            });

            const response = await this.client.request(`/api/systems/${systemId}/export?${params.toString()}`, {
                method: 'GET'
            });

            return response.blob();
        } catch (error) {
            console.error('❌ Failed to export system data:', error);
            throw new Error(`Failed to export system data: ${error.message}`);
        }
    }

    /**
     * Export specific data type from system
     * @param {string} systemId - System ID
     * @param {string} dataType - Data type ('nutrients', 'water_quality', 'fish_health', 'plant_growth')
     * @param {string} format - Export format ('json', 'csv', 'xlsx')
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Export file blob
     */
    async exportDataType(systemId, dataType, format = 'json', options = {}) {
        try {
            const exportOptions = {
                dataType,
                ...options
            };
            
            return await this.exportSystemData(systemId, format, exportOptions);
        } catch (error) {
            console.error('❌ Failed to export data type:', error);
            throw new Error(`Failed to export ${dataType} data: ${error.message}`);
        }
    }

    /**
     * Export nutrients data
     * @param {string} systemId - System ID
     * @param {string} format - Export format
     * @param {Object} options - Export options (dateRange, nutrientTypes)
     * @returns {Promise<Blob>} Export file blob
     */
    async exportNutrients(systemId, format = 'csv', options = {}) {
        return this.exportDataType(systemId, 'nutrients', format, options);
    }

    /**
     * Export water quality data
     * @param {string} systemId - System ID
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Export file blob
     */
    async exportWaterQuality(systemId, format = 'csv', options = {}) {
        return this.exportDataType(systemId, 'water_quality', format, options);
    }

    /**
     * Export fish health data
     * @param {string} systemId - System ID
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Export file blob
     */
    async exportFishHealth(systemId, format = 'csv', options = {}) {
        return this.exportDataType(systemId, 'fish_health', format, options);
    }

    /**
     * Export plant growth data
     * @param {string} systemId - System ID
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Export file blob
     */
    async exportPlantGrowth(systemId, format = 'csv', options = {}) {
        return this.exportDataType(systemId, 'plant_growth', format, options);
    }

    // ================== BULK OPERATIONS ==================

    /**
     * Import multiple files in sequence
     * @param {Array} fileImports - Array of {type, file, systemId, options}
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array>} Array of import results
     */
    async importMultipleFiles(fileImports, progressCallback = null) {
        try {
            const results = [];
            
            for (let i = 0; i < fileImports.length; i++) {
                const { type, file, systemId, options = {} } = fileImports[i];
                
                if (progressCallback) {
                    progressCallback(i, fileImports.length, `Importing ${file.name}...`);
                }
                
                try {
                    const result = await this.importDataFile(type, file, systemId, options);
                    results.push({ 
                        success: true, 
                        file: file.name, 
                        type, 
                        result 
                    });
                } catch (error) {
                    results.push({ 
                        success: false, 
                        file: file.name, 
                        type, 
                        error: error.message 
                    });
                }
            }
            
            if (progressCallback) {
                progressCallback(fileImports.length, fileImports.length, 'Import completed');
            }
            
            return results;
        } catch (error) {
            console.error('❌ Failed to import multiple files:', error);
            throw new Error(`Failed to import multiple files: ${error.message}`);
        }
    }

    /**
     * Generate and download multiple sample files
     * @param {Array} sampleTypes - Array of {type, systemId, format}
     * @returns {Promise<Array>} Array of download URLs
     */
    async generateMultipleSamples(sampleTypes) {
        try {
            const downloadUrls = [];
            
            for (const { type, systemId, format = 'xlsx' } of sampleTypes) {
                const url = this.getSampleFileUrl(type, systemId, format);
                downloadUrls.push({
                    type,
                    format,
                    url,
                    filename: `${type}_sample.${format}`
                });
            }
            
            return downloadUrls;
        } catch (error) {
            console.error('❌ Failed to generate multiple samples:', error);
            throw new Error(`Failed to generate multiple samples: ${error.message}`);
        }
    }

    // ================== VALIDATION UTILITIES ==================

    /**
     * Validate file before import
     * @param {File} file - File to validate
     * @param {string} type - Expected data type
     * @returns {Object} Validation result
     */
    validateImportFile(file, type) {
        const validationResult = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check file type
        const allowedExtensions = ['xlsx', 'xls', 'csv'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            validationResult.valid = false;
            validationResult.errors.push(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            validationResult.valid = false;
            validationResult.errors.push(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
        }

        // Check if file is empty
        if (file.size === 0) {
            validationResult.valid = false;
            validationResult.errors.push('File is empty');
        }

        // Type-specific validations
        if (type === 'nutrients' && fileExtension === 'csv' && file.size < 100) {
            validationResult.warnings.push('File seems very small for nutrient data');
        }

        return validationResult;
    }

    /**
     * Get supported import types and their requirements
     * @returns {Object} Import types configuration
     */
    getImportTypes() {
        return {
            nutrients: {
                name: 'Nutrients',
                description: 'Water quality nutrients and parameters',
                requiredColumns: ['Date', 'System', 'PH', 'Nitrate'],
                optionalColumns: ['Salinity', 'Potassium', 'Calcium', 'Dissolved_Oxygen', 'Temperature'],
                dateFormat: 'dd/mm/yy (European format)',
                sampleAvailable: true
            },
            water_quality: {
                name: 'Water Quality',
                description: 'Basic water quality parameters',
                requiredColumns: ['Date', 'System', 'PH', 'Temperature'],
                optionalColumns: ['Dissolved_Oxygen', 'Ammonia', 'Nitrite', 'Nitrate', 'Salinity'],
                dateFormat: 'dd/mm/yy (European format)',
                sampleAvailable: true
            },
            fish_health: {
                name: 'Fish Health',
                description: 'Fish health and feeding data',
                requiredColumns: ['Date', 'System', 'Tank_ID', 'Species'],
                optionalColumns: ['Quantity', 'Weight_kg', 'Feed_Amount', 'Mortality', 'Notes'],
                dateFormat: 'dd/mm/yy (European format)',
                sampleAvailable: true
            }
        };
    }

    /**
     * Format date for European format (dd/mm/yy)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForImport(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    // ================== ERROR HANDLING UTILITIES ==================

    /**
     * Parse import error details
     * @param {Object} importResult - Import result with possible errors
     * @returns {Object} Parsed error information
     */
    parseImportErrors(importResult) {
        if (!importResult.errorDetails) {
            return { hasErrors: false, errors: [] };
        }

        const parsedErrors = importResult.errorDetails.map(errorMsg => {
            const match = errorMsg.match(/Row (\d+): (.+)/);
            if (match) {
                return {
                    row: parseInt(match[1]),
                    message: match[2],
                    type: 'row_error'
                };
            }
            return {
                row: null,
                message: errorMsg,
                type: 'general_error'
            };
        });

        return {
            hasErrors: true,
            errors: parsedErrors,
            totalErrors: importResult.errors || 0,
            totalImported: importResult.imported || 0,
            totalDuplicates: importResult.duplicates || 0
        };
    }
}

// Create default instance
const importExportAPI = new ImportExportAPI();

// Export both class and default instance
export { importExportAPI };
export default importExportAPI;

// Legacy function exports for backward compatibility
export const downloadSampleFile = (type, systemId, format) => importExportAPI.downloadSampleFile(type, systemId, format);
export const getSampleFileUrl = (type, systemId, format) => importExportAPI.getSampleFileUrl(type, systemId, format);
export const importDataFile = (type, file, systemId, options) => importExportAPI.importDataFile(type, file, systemId, options);
export const importNutrientsFile = (file, systemId, options) => importExportAPI.importNutrientsFile(file, systemId, options);
export const importWaterQualityFile = (file, systemId, options) => importExportAPI.importWaterQualityFile(file, systemId, options);
export const importFishHealthFile = (file, systemId, options) => importExportAPI.importFishHealthFile(file, systemId, options);
export const getImportHistory = (systemId, limit) => importExportAPI.getImportHistory(systemId, limit);
export const undoImport = (historyId) => importExportAPI.undoImport(historyId);
export const exportSystemData = (systemId, format, options) => importExportAPI.exportSystemData(systemId, format, options);
export const exportDataType = (systemId, dataType, format, options) => importExportAPI.exportDataType(systemId, dataType, format, options);
export const exportNutrients = (systemId, format, options) => importExportAPI.exportNutrients(systemId, format, options);
export const exportWaterQuality = (systemId, format, options) => importExportAPI.exportWaterQuality(systemId, format, options);
export const exportFishHealth = (systemId, format, options) => importExportAPI.exportFishHealth(systemId, format, options);
export const exportPlantGrowth = (systemId, format, options) => importExportAPI.exportPlantGrowth(systemId, format, options);
export const importMultipleFiles = (fileImports, progressCallback) => importExportAPI.importMultipleFiles(fileImports, progressCallback);
export const generateMultipleSamples = (sampleTypes) => importExportAPI.generateMultipleSamples(sampleTypes);
export const validateImportFile = (file, type) => importExportAPI.validateImportFile(file, type);
export const getImportTypes = () => importExportAPI.getImportTypes();
export const formatDateForImport = (date) => importExportAPI.formatDateForImport(date);
export const parseImportErrors = (importResult) => importExportAPI.parseImportErrors(importResult);