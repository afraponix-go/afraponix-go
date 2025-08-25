// API Client Usage Examples
// Demonstrates how to use BaseApiClient for standardized API patterns

import { apiClient, BaseApiClient } from './baseApiClient.js';

/**
 * Example of how existing API modules can be refactored to use BaseApiClient
 */

// Example 1: Simple GET request
export async function fetchCropsWithClient() {
    try {
        return await apiClient.get('crop-knowledge/crops');
    } catch (error) {
        throw new Error(`Failed to fetch crops: ${error.message}`);
    }
}

// Example 2: POST request with data
export async function saveAdminCropWithClient(cropData, isEdit = false, cropCode = null) {
    try {
        const endpoint = isEdit 
            ? `crop-knowledge/admin/crops/${cropCode}`
            : 'crop-knowledge/admin/crops';
        
        const method = isEdit ? 'put' : 'post';
        return await apiClient[method](endpoint, cropData);
    } catch (error) {
        throw new Error(`Failed to save admin crop: ${error.message}`);
    }
}

// Example 3: DELETE request
export async function deleteAdminCropWithClient(cropCode) {
    try {
        return await apiClient.delete(`crop-knowledge/admin/crops/${cropCode}`);
    } catch (error) {
        throw new Error(`Failed to delete admin crop: ${error.message}`);
    }
}

// Example 4: File upload with FormData
export async function uploadDeficiencyImageWithClient(nutrientCode, formData) {
    try {
        return await apiClient.post(
            `crop-knowledge/admin/nutrients/${nutrientCode}/deficiency-images/upload`,
            formData  // BaseApiClient automatically handles FormData
        );
    } catch (error) {
        throw new Error(`Failed to upload deficiency image: ${error.message}`);
    }
}

// Example 5: Custom API client instance with specific configuration
export class AquaponicsApiClient extends BaseApiClient {
    constructor() {
        super('/api', {
            timeout: 45000, // 45 seconds for long operations
            retries: 3,
            retryDelay: 2000,
            headers: {
                'X-Client-Version': '1.0.0',
                'X-App-Name': 'Afraponix-Go'
            }
        });
        
        // Add request logging interceptor
        this.addRequestInterceptor(this.logRequest.bind(this));
        
        // Add response timing interceptor
        this.addResponseInterceptor(this.measureResponseTime.bind(this));
    }
    
    logRequest(url, options) {
        console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
        return options;
    }
    
    async measureResponseTime(response, url, options) {
        const endTime = Date.now();
        const startTime = options.startTime || endTime;
        const duration = endTime - startTime;
        console.log(`✅ API Response: ${response.status} ${url} (${duration}ms)`);
        return response;
    }
    
    // Override request to add start time
    async request(endpoint, options = {}) {
        options.startTime = Date.now();
        return super.request(endpoint, options);
    }
}

// Example 6: Specialized client for crop knowledge operations
export class CropKnowledgeClient extends BaseApiClient {
    constructor() {
        super('/api/crop-knowledge');
    }
    
    // Specialized methods for crop knowledge operations
    async fetchAllCrops() {
        return this.get('crops');
    }
    
    async createCrop(cropData) {
        return this.post('admin/crops', cropData);
    }
    
    async updateCrop(cropCode, cropData) {
        return this.put(`admin/crops/${cropCode}`, cropData);
    }
    
    async deleteCrop(cropCode) {
        return this.delete(`admin/crops/${cropCode}`);
    }
    
    async fetchNutrients() {
        return this.get('nutrients');
    }
    
    async fetchNutrientDetails(nutrientCode, systemId) {
        const params = systemId ? `?systemId=${systemId}` : '';
        return this.get(`nutrients/${nutrientCode}/detailed${params}`);
    }
    
    async fetchRatioRules() {
        return this.get('admin/ratio-rules');
    }
    
    async saveRatioRule(ruleData, ruleId = null) {
        return ruleId 
            ? this.put(`admin/ratio-rules/${ruleId}`, ruleData)
            : this.post('admin/ratio-rules', ruleData);
    }
}

// Create specialized client instances
export const aquaponicsApi = new AquaponicsApiClient();
export const cropKnowledgeApi = new CropKnowledgeClient();

/**
 * Migration helper function to demonstrate converting from old pattern to new pattern
 */
export function migrateApiFunction() {
    // OLD PATTERN (what we're replacing):
    /*
    async function oldFetchCrops() {
        const response = await fetch('/api/crop-knowledge/crops', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch crops');
        return response.json();
    }
    */
    
    // NEW PATTERN (using BaseApiClient):
    const newFetchCrops = async () => {
        return apiClient.get('crop-knowledge/crops');
    };
    
    return newFetchCrops;
}

/**
 * Pattern examples for different API scenarios
 */
export const ApiPatterns = {
    // Simple GET with query parameters
    async simpleGetWithParams(cropType, stage = 'general') {
        return apiClient.get(`crop-knowledge/crops/${cropType.toLowerCase()}/nutrient-ranges?stage=${stage}`);
    },
    
    // POST with retry configuration
    async postWithCustomRetry(data) {
        return apiClient.post('systems', data, {
            retries: 5,
            timeout: 60000 // 1 minute
        });
    },
    
    // File download
    async downloadFile(fileId) {
        const response = await apiClient.request(`files/${fileId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/octet-stream' }
        });
        return response.blob();
    },
    
    // Multiple files upload
    async uploadMultipleFiles(files) {
        const formData = new FormData();
        files.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });
        return apiClient.post('uploads/multiple', formData);
    }
};