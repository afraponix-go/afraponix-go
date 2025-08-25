// Plants API Module
// Handles all plant growth, management, allocations, and custom crops API calls with comprehensive CRUD operations

/**
 * Get authentication token from window.app or localStorage
 */
function getAuthToken() {
    return window.app?.token || localStorage.getItem('auth_token') || '';
}

/**
 * Create authenticated headers
 */
function getAuthHeaders(includeContentType = true) {
    const headers = {};
    const token = getAuthToken();
    
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Handle API response with proper error handling
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            errorData = { error: errorText };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Plant Growth Data Management

/**
 * Fetch plant growth data for a system
 */
export async function fetchPlantGrowthData(systemId) {
    try {
        const response = await fetch(`/api/data/plant-growth/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch plant growth data for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Add new plant entry
 */
export async function addPlantEntry(systemId, plantData) {
    try {
        const response = await fetch(`/api/data/plant-growth/${systemId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(plantData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to add plant entry for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Update plant entry
 */
export async function updatePlantEntry(entryId, plantData) {
    try {
        const response = await fetch(`/api/data/plant-growth/${entryId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(plantData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update plant entry ${entryId}:`, error);
        throw error;
    }
}

/**
 * Delete plant entry
 */
export async function deletePlantEntry(systemId, entryId) {
    try {
        const response = await fetch(`/api/data/plant-growth/${systemId}/${entryId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to delete plant entry ${entryId}:`, error);
        throw error;
    }
}

/**
 * Record harvest
 */
export async function recordHarvest(systemId, harvestData) {
    try {
        const response = await fetch(`/api/data/plant-growth/${systemId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(harvestData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to record harvest for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get plant entry by ID
 */
export async function getPlantEntry(entryId) {
    try {
        const response = await fetch(`/api/data/plant-growth/entry/${entryId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch plant entry ${entryId}:`, error);
        throw error;
    }
}

/**
 * Update plant batch information
 */
export async function updatePlantBatch(systemId, batchId, batchData) {
    try {
        const response = await fetch(`/api/data/batch/${systemId}/${batchId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(batchData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update plant batch ${batchId}:`, error);
        throw error;
    }
}

/**
 * Move plant batch to different grow bed
 */
export async function movePlantBatch(systemId, batchId, growBedData) {
    try {
        const response = await fetch(`/api/data/batch/${systemId}/${batchId}/grow-bed`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(growBedData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to move plant batch ${batchId}:`, error);
        throw error;
    }
}

// Plant Allocations Management

/**
 * Fetch plant allocations for a system
 */
export async function fetchPlantAllocations(systemId) {
    try {
        const response = await fetch(`/api/plants/allocations/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch plant allocations for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Create new plant allocation
 */
export async function createPlantAllocation(allocationData) {
    try {
        const response = await fetch('/api/plants/allocations', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(allocationData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to create plant allocation:', error);
        throw error;
    }
}

/**
 * Update plant allocation
 */
export async function updatePlantAllocation(allocationId, allocationData) {
    try {
        const response = await fetch(`/api/plants/allocations/${allocationId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(allocationData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update plant allocation ${allocationId}:`, error);
        throw error;
    }
}

/**
 * Delete plant allocation
 */
export async function deletePlantAllocation(allocationId) {
    try {
        const response = await fetch(`/api/plants/allocations/${allocationId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to delete plant allocation ${allocationId}:`, error);
        throw error;
    }
}

/**
 * Get allocation by ID
 */
export async function getPlantAllocation(allocationId) {
    try {
        const response = await fetch(`/api/plants/allocations/${allocationId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch plant allocation ${allocationId}:`, error);
        throw error;
    }
}

// Custom Crops Management

/**
 * Fetch all custom crops
 */
export async function fetchCustomCrops() {
    try {
        const response = await fetch('/api/plants/custom-crops', {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to fetch custom crops:', error);
        throw error;
    }
}

/**
 * Create new custom crop
 */
export async function createCustomCrop(cropData) {
    try {
        const response = await fetch('/api/plants/custom-crops', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(cropData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to create custom crop:', error);
        throw error;
    }
}

/**
 * Update custom crop
 */
export async function updateCustomCrop(cropId, cropData) {
    try {
        const response = await fetch(`/api/plants/custom-crops/${cropId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(cropData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update custom crop ${cropId}:`, error);
        throw error;
    }
}

/**
 * Delete custom crop
 */
export async function deleteCustomCrop(cropId) {
    try {
        const response = await fetch(`/api/plants/custom-crops/${cropId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to delete custom crop ${cropId}:`, error);
        throw error;
    }
}

/**
 * Get custom crop by ID
 */
export async function getCustomCrop(cropId) {
    try {
        const response = await fetch(`/api/plants/custom-crops/${cropId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch custom crop ${cropId}:`, error);
        throw error;
    }
}

/**
 * Submit custom crop to global database
 */
export async function submitCustomCropGlobal(cropId, submitData) {
    try {
        const response = await fetch(`/api/plants/custom-crops/${cropId}/submit-global`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(submitData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to submit custom crop ${cropId} to global database:`, error);
        throw error;
    }
}

// Crop Management Analytics and Utilities

/**
 * Get crop statistics for a system
 */
export async function getCropStatistics(systemId, period = '30d') {
    try {
        const response = await fetch(`/api/plants/statistics/${systemId}?period=${period}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch crop statistics for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get harvest summary for a system
 */
export async function getHarvestSummary(systemId, startDate = null, endDate = null) {
    try {
        let url = `/api/plants/harvest-summary/${systemId}`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch harvest summary for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get planting schedule for a system
 */
export async function getPlantingSchedule(systemId, days = 30) {
    try {
        const response = await fetch(`/api/plants/schedule/${systemId}?days=${days}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch planting schedule for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Export plant data for a system
 */
export async function exportPlantData(systemId, format = 'csv', options = {}) {
    try {
        const params = new URLSearchParams({ format, ...options });
        const response = await fetch(`/api/plants/export/${systemId}?${params.toString()}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to export plant data for system ${systemId}:`, error);
        throw error;
    }
}