// Plants API Module
// Handles all plant growth and management API calls

/**
 * Fetch plant growth data for a system
 */
export async function fetchPlantGrowthData(systemId) {
    const response = await fetch(`/api/data/plant-growth/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch plant growth data');
    return response.json();
}

/**
 * Add new plant entry
 */
export async function addPlantEntry(systemId, plantData) {
    const response = await fetch(`/api/data/plant-growth/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData)
    });
    if (!response.ok) throw new Error('Failed to add plant entry');
    return response.json();
}

/**
 * Update plant entry
 */
export async function updatePlantEntry(entryId, plantData) {
    const response = await fetch(`/api/data/plant-growth/${entryId}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData)
    });
    if (!response.ok) throw new Error('Failed to update plant entry');
    return response.json();
}

/**
 * Delete plant entry
 */
export async function deletePlantEntry(systemId, entryId) {
    const response = await fetch(`/api/data/plant-growth/${systemId}/${entryId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete plant entry');
    return response.json();
}

/**
 * Record harvest
 */
export async function recordHarvest(systemId, harvestData) {
    const response = await fetch(`/api/data/plant-growth/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(harvestData)
    });
    if (!response.ok) throw new Error('Failed to record harvest');
    return response.json();
}