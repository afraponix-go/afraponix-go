// Operations API Module
// Handles operational data like maintenance, tasks, and general operations

/**
 * Fetch operations data for a system
 */
export async function fetchOperationsData(systemId) {
    const response = await fetch(`/api/data/operations/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch operations data');
    return response.json();
}

/**
 * Add operations entry
 */
export async function addOperationsEntry(systemId, operationData) {
    const response = await fetch(`/api/data/operations/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operationData)
    });
    if (!response.ok) throw new Error('Failed to add operations entry');
    return response.json();
}