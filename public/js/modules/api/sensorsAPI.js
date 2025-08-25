// Sensors API Module
// Handles all sensor management and data collection API calls

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
 * Fetch sensors for a system
 */
export async function fetchSensors(systemId) {
    const response = await fetch(`/api/sensors/system/${systemId}`, {
        method: 'GET',
        headers: getAuthHeaders(false)
    });
    if (!response.ok) throw new Error('Failed to fetch sensors');
    return response.json();
}

/**
 * Add or update sensor
 */
export async function saveSensor(sensorId, sensorData) {
    const url = sensorId ? `/api/sensors/${sensorId}` : '/api/sensors';
    const method = sensorId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(sensorData)
    });
    if (!response.ok) throw new Error('Failed to save sensor');
    return response.json();
}

/**
 * Test sensor connection
 */
export async function testSensorConnection(testData) {
    const response = await fetch('/api/sensors/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(testData)
    });
    if (!response.ok) throw new Error('Failed to test sensor');
    return response.json();
}

/**
 * Fetch sensor data
 */
export async function fetchSensorData(sensorId) {
    const response = await fetch(`/api/sensors/data/${sensorId}`, {
        method: 'GET',
        headers: getAuthHeaders(false)
    });
    if (!response.ok) throw new Error('Failed to fetch sensor data');
    return response.json();
}

/**
 * Toggle sensor active status
 */
export async function toggleSensorStatus(sensorId, isActive) {
    const response = await fetch(`/api/sensors/${sensorId}/toggle`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive })
    });
    if (!response.ok) throw new Error('Failed to toggle sensor status');
    return response.json();
}

/**
 * Delete sensor
 */
export async function deleteSensor(sensorId) {
    const response = await fetch(`/api/sensors/${sensorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false)
    });
    if (!response.ok) throw new Error('Failed to delete sensor');
    return response.json();
}