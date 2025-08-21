// Sensors API Module
// Handles all sensor management and data collection API calls

/**
 * Fetch sensors for a system
 */
export async function fetchSensors(systemId) {
    const response = await fetch(`/api/sensors/system/${systemId}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
    });
    if (!response.ok) throw new Error('Failed to test sensor');
    return response.json();
}

/**
 * Fetch sensor data
 */
export async function fetchSensorData(sensorId) {
    const response = await fetch(`/api/sensors/data/${sensorId}`);
    if (!response.ok) throw new Error('Failed to fetch sensor data');
    return response.json();
}

/**
 * Toggle sensor active status
 */
export async function toggleSensorStatus(sensorId, isActive) {
    const response = await fetch(`/api/sensors/${sensorId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete sensor');
    return response.json();
}