// Systems API Module
// Handles all system-related API calls with comprehensive CRUD operations and data management

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

/**
 * Fetch all systems for the current user
 */
export async function fetchSystems() {
    try {
        const response = await fetch('/api/systems', {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to fetch systems:', error);
        throw error;
    }
}

/**
 * Get system by ID
 */
export async function getSystem(systemId) {
    try {
        const response = await fetch(`/api/systems/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Create a new demo system
 */
export async function createDemoSystem(systemData) {
    try {
        const response = await fetch('/api/systems/create-demo', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(systemData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to create demo system:', error);
        throw error;
    }
}

/**
 * Create a new custom system
 */
export async function createSystem(systemData) {
    try {
        const response = await fetch('/api/systems', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(systemData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('❌ Failed to create system:', error);
        throw error;
    }
}

/**
 * Update system configuration
 */
export async function updateSystem(systemId, systemData) {
    try {
        const response = await fetch(`/api/systems/${systemId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(systemData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Delete a system
 */
export async function deleteSystem(systemId) {
    try {
        const response = await fetch(`/api/systems/${systemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to delete system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get latest data for all system components
 */
export async function fetchLatestSystemData(systemId) {
    try {
        const response = await fetch(`/api/data/latest/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch latest system data for ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get grow beds for a specific system
 */
export async function fetchSystemGrowBeds(systemId) {
    try {
        const response = await fetch(`/api/grow-beds/system/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch grow beds for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Save grow beds configuration for a system
 */
export async function saveSystemGrowBeds(systemId, growBedsData) {
    try {
        const response = await fetch(`/api/grow-beds/system/${systemId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(growBedsData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to save grow beds for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get fish tanks for a specific system
 */
export async function fetchSystemFishTanks(systemId) {
    try {
        const response = await fetch(`/api/fish-tanks/system/${systemId}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch fish tanks for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Save fish tanks configuration for a system
 */
export async function saveSystemFishTanks(systemId, fishTanksData) {
    try {
        const response = await fetch(`/api/fish-tanks/system/${systemId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(fishTanksData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to save fish tanks for system ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get system configuration summary
 */
export async function getSystemConfigSummary(systemId) {
    try {
        const response = await fetch(`/api/systems/${systemId}/config`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch system config for ${systemId}:`, error);
        throw error;
    }
}

/**
 * Update system sharing settings
 */
export async function updateSystemSharing(systemId, sharingData) {
    try {
        const response = await fetch(`/api/systems/${systemId}/sharing`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(sharingData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to update system sharing for ${systemId}:`, error);
        throw error;
    }
}

/**
 * Get system analytics and statistics
 */
export async function getSystemAnalytics(systemId, period = '30d') {
    try {
        const response = await fetch(`/api/systems/${systemId}/analytics?period=${period}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to fetch system analytics for ${systemId}:`, error);
        throw error;
    }
}

/**
 * Export system data
 */
export async function exportSystemData(systemId, format = 'json') {
    try {
        const response = await fetch(`/api/systems/${systemId}/export?format=${format}`, {
            headers: getAuthHeaders(false)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to export system data for ${systemId}:`, error);
        throw error;
    }
}

/**
 * Clone/duplicate an existing system
 */
export async function cloneSystem(systemId, newSystemData) {
    try {
        const response = await fetch(`/api/systems/${systemId}/clone`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newSystemData)
        });
        return await handleResponse(response);
    } catch (error) {
        console.error(`❌ Failed to clone system ${systemId}:`, error);
        throw error;
    }
}