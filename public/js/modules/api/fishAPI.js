// Fish API Module
// Handles all fish inventory and health API calls

/**
 * Fetch fish inventory data for a system
 */
export async function fetchFishInventory(systemId) {
    const response = await fetch(`/api/fish-inventory/system/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch fish inventory');
    return response.json();
}

/**
 * Fetch fish tanks for a system
 */
export async function fetchFishTanks(systemId) {
    const response = await fetch(`/api/fish-tanks/system/${systemId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch fish tanks');
    return response.json();
}

/**
 * Fetch fish health data
 */
export async function fetchFishHealthData(systemId) {
    const response = await fetch(`/api/data/fish-health/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch fish health data');
    return response.json();
}

/**
 * Fetch fish health entries with query parameters
 */
export async function fetchFishHealthEntries(systemId, limit = 50) {
    const response = await fetch(`/api/data/entries/fish-health?system_id=${systemId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch fish health entries');
    return response.json();
}

/**
 * Add fish health entry
 */
export async function addFishHealthEntry(healthData) {
    const response = await fetch('/api/data/entries/fish-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(healthData)
    });
    if (!response.ok) throw new Error('Failed to add fish health entry');
    return response.json();
}

/**
 * Update fish health entry
 */
export async function updateFishHealthEntry(entryId, healthData) {
    const response = await fetch(`/api/data/fish-health/entry/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(healthData)
    });
    if (!response.ok) throw new Error('Failed to update fish health entry');
    return response.json();
}

/**
 * Delete fish health entry
 */
export async function deleteFishHealthEntry(entryId) {
    const response = await fetch(`/api/data/fish-health/entry/${entryId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete fish health entry');
    return response.json();
}

/**
 * Add fish to inventory
 */
export async function addFishToInventory(fishData) {
    const response = await fetch('/api/fish-inventory/add-fish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fishData)
    });
    if (!response.ok) throw new Error('Failed to add fish to inventory');
    return response.json();
}

/**
 * Record fish mortality
 */
export async function recordFishMortality(mortalityData) {
    const response = await fetch('/api/fish-inventory/mortality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mortalityData)
    });
    if (!response.ok) throw new Error('Failed to record fish mortality');
    return response.json();
}

/**
 * Update fish weight
 */
export async function updateFishWeight(weightData) {
    const response = await fetch('/api/fish-inventory/update-weight', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weightData)
    });
    if (!response.ok) throw new Error('Failed to update fish weight');
    return response.json();
}