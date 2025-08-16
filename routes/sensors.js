const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
router.use(authenticateToken);

// Get sensor configurations for a system
router.get('/system/:systemId', async (req, res) => {
    const { systemId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify system ownership
        const [systemRows] = await pool.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [systemId, req.user.userId]
        );

        if (systemRows.length === 0) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Get sensor configurations
        const [sensorRows] = await pool.execute(
            'SELECT * FROM sensor_configs WHERE system_id = ?', 
            [systemId]
        );        res.json({ sensors: sensorRows || [] });

    } catch (error) {
        console.error('Error fetching sensor configs:', error);
        res.status(500).json({ error: 'Failed to fetch sensor configurations' });
    }
});

// Save sensor configuration
router.post('/', async (req, res) => {
    const { system_id, sensor_name, sensor_type, device_id, telemetry_key, api_url, update_interval, mapped_table, mapped_field, data_transform } = req.body;
    
    if (!system_id || !sensor_name || !sensor_type || !device_id) {
        return res.status(400).json({ error: 'Required fields missing' });
    }

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify system ownership
        const [systemRows] = await pool.execute(
            'SELECT * FROM systems WHERE id = ? AND user_id = ?', 
            [system_id, req.user.userId]
        );

        if (systemRows.length === 0) {            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Check for duplicate sensors in the same system
        const [existingSensors] = await pool.execute(
            'SELECT * FROM sensor_configs WHERE system_id = ? AND sensor_type = ? AND device_id = ?',
            [system_id, sensor_type, device_id]
        );

        if (existingSensors.length > 0) {            return res.status(409).json({ 
                error: `A ${sensor_type} sensor with this device ID already exists for this system. Each sensor type can only be added once per system.` 
            });
        }

        // Insert sensor configuration
        const [result] = await pool.execute(
            `INSERT INTO sensor_configs 
                (system_id, sensor_name, sensor_type, device_id, telemetry_key, api_url, update_interval, active, mapped_table, mapped_field, data_transform) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`, 
            [system_id, sensor_name, sensor_type, device_id, telemetry_key, api_url || null, update_interval || 300, mapped_table || null, mapped_field || null, data_transform || null]
        );        
        // Schedule the new sensor for data collection if collector is running
        if (global.sensorCollector) {
            try {
                await global.sensorCollector.scheduleSensorById(result.insertId);
            } catch (collectorError) {
                console.error('Failed to schedule new sensor for collection:', collectorError);
            }
        }
        
        res.status(201).json({ 
            message: 'Sensor configuration saved successfully',
            sensor_id: result.insertId 
        });

    } catch (error) {
        console.error('Error saving sensor config:', error);
        res.status(500).json({ error: 'Failed to save sensor configuration' });
    }
});

// Get ThingsBoard JWT token from database credentials
async function getThingsBoardToken(systemId) {
    // Using connection pool - no manual connection management
    
    try {
        const pool = getDatabase();
        
        // Get ThingsBoard credentials from database
        const [credentialRows] = await pool.execute(
            'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [systemId, 'thingsboard']
        );

        if (credentialRows.length === 0 || !credentialRows[0].username_encrypted || !credentialRows[0].password_encrypted) {            throw new Error(`ThingsBoard credentials not configured for system ${systemId}`);
        }

        const credentials = credentialRows[0];

        // Decrypt credentials
        const { CredentialEncryption } = require('../utils/encryption');
        const username = CredentialEncryption.decrypt(credentials.username_encrypted);
        const password = CredentialEncryption.decrypt(credentials.password_encrypted);
        const apiUrl = credentials.api_url || 'https://tb.datascapeindustrial.com';
        // Authenticate with ThingsBoard
        const response = await axios.post(`${apiUrl}/api/auth/login`, {
            username,
            password
        });
        
        return { token: response.data.token, apiUrl };
    } catch (error) {
        console.error('Failed to authenticate with ThingsBoard:', error.message);
        throw new Error('Failed to authenticate with ThingsBoard API');
    }
}

// Test sensor connection
router.post('/test', async (req, res) => {
    const { api_url, device_id, system_id } = req.body;
    
    if (!system_id) {
        return res.status(400).json({ error: 'System ID required for authentication' });
    }
    
    try {
        // Get authentication token from database credentials
        const { token, apiUrl } = await getThingsBoardToken(system_id);
        const testApiUrl = api_url || apiUrl;
        
        // Test connection to ThingsBoard API
        const response = await axios.get(
            `${testApiUrl}/api/plugins/telemetry/DEVICE/${device_id}/values/timeseries`,
            {
                headers: {
                    'X-Authorization': `Bearer ${token}`
                }
            }
        );

        res.json({ 
            success: true, 
            message: 'Connection successful',
            data: response.data 
        });

    } catch (error) {
        console.error('Sensor connection test failed:', error.response?.data || error.message);
        res.status(400).json({ 
            success: false, 
            error: error.response?.data?.message || error.message || 'Connection failed' 
        });
    }
});

// Fetch latest sensor data
router.get('/data/:sensorId', async (req, res) => {
    const { sensorId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Get sensor configuration
        const [sensorRows] = await pool.execute(
            `SELECT sc.*, s.user_id 
                FROM sensor_configs sc 
                JOIN systems s ON sc.system_id = s.id 
                WHERE sc.id = ? AND s.user_id = ?`, 
            [sensorId, req.user.userId]
        );

        if (sensorRows.length === 0) {            return res.status(404).json({ error: 'Sensor not found or access denied' });
        }

        const sensor = sensorRows[0];

        // Get API credentials and authenticate
        const { token, apiUrl } = await getThingsBoardToken(sensor.system_id);

        // Fetch data from ThingsBoard
        const response = await axios.get(
            `${apiUrl}/api/plugins/telemetry/DEVICE/${sensor.device_id}/values/timeseries`,
            {
                headers: {
                    'X-Authorization': `Bearer ${token}`
                },
                params: {
                    keys: sensor.telemetry_key
                }
            }
        );        res.json({ 
            sensor_name: sensor.sensor_name,
            sensor_type: sensor.sensor_type,
            data: response.data 
        });

    } catch (error) {
        console.error('Error fetching sensor data:', error);
        res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
});

// Update sensor configuration
router.put('/:sensorId', async (req, res) => {
    const { sensorId } = req.params;
    const { sensor_name, sensor_type, device_id, telemetry_key, api_url, update_interval, mapped_table, mapped_field, data_transform } = req.body;
    
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify sensor ownership through system ownership
        const [sensorRows] = await pool.execute(
            `SELECT sc.*, s.user_id 
                FROM sensor_configs sc 
                JOIN systems s ON sc.system_id = s.id 
                WHERE sc.id = ? AND s.user_id = ?`, 
            [sensorId, req.user.userId]
        );

        if (sensorRows.length === 0) {            return res.status(404).json({ error: 'Sensor not found or access denied' });
        }

        const sensor = sensorRows[0];

        // Update sensor configuration
        await pool.execute(
            `UPDATE sensor_configs SET 
                sensor_name = ?, sensor_type = ?, device_id = ?, telemetry_key = ?, api_url = ?, 
                update_interval = ?, mapped_table = ?, mapped_field = ?, data_transform = ?
                WHERE id = ?`, 
            [sensor_name || sensor.sensor_name, sensor_type || sensor.sensor_type, 
             device_id || sensor.device_id, telemetry_key || sensor.telemetry_key,
             api_url !== undefined ? api_url : sensor.api_url,
             update_interval || sensor.update_interval, mapped_table || null, 
             mapped_field || null, data_transform || null, sensorId]
        );

        // Reschedule sensor if collector is available
        if (global.sensorCollector) {
            await global.sensorCollector.scheduleSensorById(sensorId);
        }        res.json({ message: 'Sensor configuration updated successfully' });

    } catch (error) {
        console.error('Error updating sensor config:', error);
        res.status(500).json({ error: 'Failed to update sensor configuration' });
    }
});

// Toggle sensor active status
router.patch('/:sensorId/toggle', async (req, res) => {
    const { sensorId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify sensor ownership through system ownership
        const [sensorRows] = await pool.execute(
            `SELECT sc.*, s.user_id 
                FROM sensor_configs sc 
                JOIN systems s ON sc.system_id = s.id 
                WHERE sc.id = ? AND s.user_id = ?`, 
            [sensorId, req.user.userId]
        );

        if (sensorRows.length === 0) {            return res.status(404).json({ error: 'Sensor not found or access denied' });
        }

        const sensor = sensorRows[0];
        const newActiveStatus = !sensor.active;

        // Update sensor active status
        await pool.execute(
            'UPDATE sensor_configs SET active = ? WHERE id = ?', 
            [newActiveStatus, sensorId]
        );

        // Handle sensor collector scheduling
        if (global.sensorCollector) {
            try {
                if (newActiveStatus) {
                    // Schedule sensor for data collection
                    await global.sensorCollector.scheduleSensorById(sensorId);
                } else {
                    // Unschedule sensor from data collection
                    global.sensorCollector.unscheduleSensor(sensorId);
                }
            } catch (collectorError) {
                console.error('Failed to update sensor collector schedule:', collectorError);
            }
        }        res.json({ 
            message: `Sensor ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
            active: newActiveStatus 
        });

    } catch (error) {
        console.error('Error toggling sensor status:', error);
        res.status(500).json({ error: 'Failed to toggle sensor status' });
    }
});

// Delete sensor configuration
router.delete('/:sensorId', async (req, res) => {
    const { sensorId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify sensor ownership through system ownership
        const [sensorRows] = await pool.execute(
            `SELECT sc.*, s.user_id 
                FROM sensor_configs sc 
                JOIN systems s ON sc.system_id = s.id 
                WHERE sc.id = ? AND s.user_id = ?`, 
            [sensorId, req.user.userId]
        );

        if (sensorRows.length === 0) {            return res.status(404).json({ error: 'Sensor not found or access denied' });
        }

        // Remove sensor from collector schedule if running
        if (global.sensorCollector) {
            try {
                global.sensorCollector.unscheduleSensor(sensorId);
            } catch (collectorError) {
                console.error('Failed to unschedule deleted sensor:', collectorError);
            }
        }
        
        // Delete sensor configuration
        await pool.execute(
            'DELETE FROM sensor_configs WHERE id = ?', 
            [sensorId]
        );        res.json({ message: 'Sensor configuration deleted successfully' });

    } catch (error) {
        console.error('Error deleting sensor config:', error);
        res.status(500).json({ error: 'Failed to delete sensor configuration' });
    }
});

module.exports = router;