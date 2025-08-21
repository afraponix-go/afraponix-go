// Nutrients API Module
// Handles all nutrient management and monitoring API calls

/**
 * Fetch latest nutrient readings for a system
 */
export async function fetchLatestNutrients(systemId) {
    const response = await fetch(`/api/data/nutrients/latest/${systemId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
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
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch nutrients data');
    return response.json();
}

/**
 * Add nutrient entry
 */
export async function addNutrientEntry(systemId, nutrientData) {
    const response = await fetch(`/api/data/nutrients/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutrientData)
    });
    if (!response.ok) throw new Error('Failed to add nutrient entry');
    return response.json();
}