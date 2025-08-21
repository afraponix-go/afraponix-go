// Water Quality API Module
// Handles all water quality monitoring API calls

/**
 * Fetch water quality data for a system
 */
export async function fetchWaterQualityData(systemId) {
    const response = await fetch(`/api/data/water-quality/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch water quality data');
    return response.json();
}

/**
 * Fetch water quality entries with query parameters
 */
export async function fetchWaterQualityEntries(systemId, limit = 50) {
    const response = await fetch(`/api/data/entries/water-quality?system_id=${systemId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch water quality entries');
    return response.json();
}

/**
 * Add water quality entry
 */
export async function addWaterQualityEntry(systemId, qualityData) {
    const response = await fetch(`/api/data/water-quality/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualityData)
    });
    if (!response.ok) throw new Error('Failed to add water quality entry');
    return response.json();
}

/**
 * Update water quality entry
 */
export async function updateWaterQualityEntry(entryId, qualityData) {
    const response = await fetch(`/api/data/water-quality/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qualityData)
    });
    if (!response.ok) throw new Error('Failed to update water quality entry');
    return response.json();
}