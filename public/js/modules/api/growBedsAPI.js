// Grow Beds API Module  
// Handles all grow bed related API calls

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
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
 * Fetch grow beds for a system
 */
export async function fetchGrowBeds(systemId) {
    const response = await fetch(`/api/grow-beds/system/${systemId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch grow beds');
    return response.json();
}

/**
 * Update grow bed configuration
 */
export async function updateGrowBeds(systemId, growBedsData) {
    const response = await fetch(`/api/grow-beds/system/${systemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(growBedsData)
    });
    if (!response.ok) throw new Error('Failed to update grow beds');
    return response.json();
}

/**
 * Update batch grow bed assignment
 */
export async function updateBatchGrowBed(systemId, batchId, growBedData) {
    const response = await fetch(`/api/data/batch/${systemId}/${batchId}/grow-bed`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(growBedData)
    });
    if (!response.ok) throw new Error('Failed to update batch grow bed');
    return response.json();
}