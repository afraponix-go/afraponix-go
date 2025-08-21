// Systems API Module
// Handles all system-related API calls

/**
 * Fetch all systems for the current user
 */
export async function fetchSystems() {
    const response = await fetch('/api/systems');
    if (!response.ok) throw new Error('Failed to fetch systems');
    return response.json();
}

/**
 * Create a new demo system
 */
export async function createDemoSystem(systemData) {
    const response = await fetch('/api/systems/create-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemData)
    });
    if (!response.ok) throw new Error('Failed to create demo system');
    return response.json();
}

/**
 * Update system configuration
 */
export async function updateSystem(systemId, systemData) {
    const response = await fetch(`/api/systems/${systemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemData)
    });
    if (!response.ok) throw new Error('Failed to update system');
    return response.json();
}

/**
 * Delete a system
 */
export async function deleteSystem(systemId) {
    const response = await fetch(`/api/systems/${systemId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete system');
    return response.json();
}

/**
 * Get latest data for all system components
 */
export async function fetchLatestSystemData(systemId) {
    const response = await fetch(`/api/data/latest/${systemId}`);
    if (!response.ok) throw new Error('Failed to fetch latest system data');
    return response.json();
}