// Nutrients API Module
// Handles all nutrient management and monitoring API calls

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
 * Fetch latest nutrient readings for a system
 */
export async function fetchLatestNutrients(systemId) {
    const response = await fetch(`/api/data/nutrients/latest/${systemId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch latest nutrients');
    return response.json();
}

/**
 * Fetch nutrient data for a system with optional filtering
 */
export async function fetchNutrientsData(systemId, options = {}) {
    let url = `/api/data/nutrients/${systemId}`;
    const params = new URLSearchParams();
    
    if (options.nutrientType) params.append('nutrient_type', options.nutrientType);
    if (options.limit) params.append('limit', options.limit);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch nutrients data');
    return response.json();
}

/**
 * Add nutrient entry
 */
export async function addNutrientEntry(systemId, nutrientData) {
    const response = await fetch(`/api/data/nutrients/${systemId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(nutrientData)
    });
    if (!response.ok) throw new Error('Failed to add nutrient entry');
    return response.json();
}