// Operations API Module
// Handles operational data like maintenance, tasks, and general operations

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
 * Fetch operations data for a system
 */
export async function fetchOperationsData(systemId) {
    const response = await fetch(`/api/data/operations/${systemId}`, {
        method: 'GET',
        headers: getAuthHeaders(false)
    });
    if (!response.ok) throw new Error('Failed to fetch operations data');
    return response.json();
}

/**
 * Add operations entry
 */
export async function addOperationsEntry(systemId, operationData) {
    const response = await fetch(`/api/data/operations/${systemId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(operationData)
    });
    if (!response.ok) throw new Error('Failed to add operations entry');
    return response.json();
}