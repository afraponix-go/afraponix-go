// Grow Beds API Module  
// Handles all grow bed related API calls

/**
 * Fetch grow beds for a system
 */
export async function fetchGrowBeds(systemId) {
    const response = await fetch(`/api/grow-beds/system/${systemId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(growBedData)
    });
    if (!response.ok) throw new Error('Failed to update batch grow bed');
    return response.json();
}