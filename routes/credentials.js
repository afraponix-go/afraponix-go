const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { CredentialEncryption } = require('../utils/encryption');

const router = express.Router();
router.use(authenticateToken);

// Get credentials for a system
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

        // Get system credentials (without decrypting for security)
        const [credentialRows] = await pool.execute(
            'SELECT id, service_name, api_url FROM system_credentials WHERE system_id = ?', 
            [systemId]
        );        res.json({ credentials: credentialRows || [] });

    } catch (error) {
        console.error('Error fetching credentials:', error);
        res.status(500).json({ error: 'Failed to fetch credentials' });
    }
});

// Save/Update credentials for a service
router.post('/', async (req, res) => {
    const { system_id, service_name, api_url, username, password } = req.body;
    
    if (!system_id || !service_name || !username || !password) {
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

        // Encrypt credentials
        const encryptedUsername = CredentialEncryption.encrypt(username);
        const encryptedPassword = CredentialEncryption.encrypt(password);

        // Check if credentials already exist for this system/service
        const [existingRows] = await pool.execute(
            'SELECT id FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [system_id, service_name]
        );

        if (existingRows.length > 0) {
            // Update existing credentials
            await pool.execute(
                `UPDATE system_credentials SET 
                    api_url = ?, username_encrypted = ?, password_encrypted = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE system_id = ? AND service_name = ?`, 
                [api_url, encryptedUsername, encryptedPassword, system_id, service_name]
            );
        } else {
            // Insert new credentials
            await pool.execute(
                `INSERT INTO system_credentials 
                    (system_id, service_name, api_url, username_encrypted, password_encrypted) 
                    VALUES (?, ?, ?, ?, ?)`, 
                [system_id, service_name, api_url, encryptedUsername, encryptedPassword]
            );
        }        res.status(201).json({ 
            message: 'Credentials saved successfully',
            service: service_name
        });

    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

// Get decrypted credentials for internal use (used by sensor collector)
router.get('/internal/:systemId/:serviceName', async (req, res) => {
    const { systemId, serviceName } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Get encrypted credentials
        const [credentialRows] = await pool.execute(
            'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [systemId, serviceName]
        );

        if (credentialRows.length === 0) {            return res.status(404).json({ error: 'Credentials not found' });
        }

        const credentials = credentialRows[0];

        // Decrypt credentials
        const decryptedUsername = CredentialEncryption.decrypt(credentials.username_encrypted);
        const decryptedPassword = CredentialEncryption.decrypt(credentials.password_encrypted);        res.json({ 
            api_url: credentials.api_url,
            username: decryptedUsername,
            password: decryptedPassword
        });

    } catch (error) {
        console.error('Error fetching decrypted credentials:', error);
        res.status(500).json({ error: 'Failed to fetch credentials' });
    }
});

// Test ThingsBoard credentials status
router.get('/thingsboard/status/:systemId', async (req, res) => {
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

        // Get ThingsBoard credentials
        const [credentialRows] = await pool.execute(
            'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [systemId, 'thingsboard']
        );

        if (credentialRows.length === 0 || !credentialRows[0].username_encrypted || !credentialRows[0].password_encrypted) {            return res.json({ 
                configured: false, 
                connected: false, 
                message: 'ThingsBoard credentials not configured'
            });
        }

        const credentials = credentialRows[0];

        // Test connection by attempting to authenticate
        try {
            const axios = require('axios');
            const decryptedUsername = CredentialEncryption.decrypt(credentials.username_encrypted);
            const decryptedPassword = CredentialEncryption.decrypt(credentials.password_encrypted);
            const apiUrl = credentials.api_url || 'https://tb.datascapeindustrial.com';

            // First test basic connectivity to the server
            const response = await axios.post(`${apiUrl}/api/auth/login`, {
                username: decryptedUsername,
                password: decryptedPassword
            }, { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Afraponix-Go/1.0'
                }
            });            return res.json({
                configured: true,
                connected: true,
                message: 'ThingsBoard connection successful',
                api_url: apiUrl
            });

        } catch (authError) {            let errorMessage = 'Unknown connection error';
            
            if (authError.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused - server may be down or blocking connections';
            } else if (authError.code === 'ETIMEDOUT' || authError.message?.includes('timeout')) {
                errorMessage = 'Connection timeout - server unreachable or network issue';
            } else if (authError.code === 'ENOTFOUND') {
                errorMessage = 'Server not found - check API URL';
            } else if (authError.code === 'ECONNRESET') {
                errorMessage = 'Connection reset - server may be overloaded';
            } else if (authError.response?.status === 401) {
                errorMessage = 'Invalid username or password';
            } else if (authError.response?.status === 404) {
                errorMessage = 'API endpoint not found - check API URL';
            } else if (authError.response?.data?.message) {
                errorMessage = authError.response.data.message;
            } else {
                errorMessage = authError.message;
            }
            
            return res.json({
                configured: true,
                connected: false,
                message: `Connection failed: ${errorMessage}`,
                api_url: credentials.api_url
            });
        }

    } catch (error) {
        console.error('Error checking ThingsBoard status:', error);
        res.status(500).json({ error: 'Failed to check ThingsBoard status' });
    }
});

// Get available ThingsBoard devices
router.get('/thingsboard/devices/:systemId', async (req, res) => {
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

        // Get ThingsBoard credentials and authenticate
        const [credentialRows] = await pool.execute(
            'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [systemId, 'thingsboard']
        );

        if (credentialRows.length === 0) {            return res.status(400).json({ error: 'ThingsBoard credentials not configured' });
        }

        const credentials = credentialRows[0];

        const axios = require('axios');
        const decryptedUsername = CredentialEncryption.decrypt(credentials.username_encrypted);
        const decryptedPassword = CredentialEncryption.decrypt(credentials.password_encrypted);
        const apiUrl = credentials.api_url || 'https://tb.datascapeindustrial.com';

        // Authenticate and get token
        const authResponse = await axios.post(`${apiUrl}/api/auth/login`, {
            username: decryptedUsername,
            password: decryptedPassword
        });

        const token = authResponse.data.token;

        // Decode JWT to get customer ID for customer users
        const jwt = require('jsonwebtoken');
        const decodedToken = jwt.decode(token);
        const customerId = decodedToken.customerId;
        
        // Fetch devices using customer-specific endpoint
        const devicesResponse = await axios.get(`${apiUrl}/api/customer/${customerId}/devices`, {
            headers: {
                'X-Authorization': `Bearer ${token}`
            },
            params: {
                pageSize: 1000,
                page: 0
            }
        });

        const devices = devicesResponse.data.data.map(device => ({
            id: device.id.id,
            name: device.name,
            type: device.type,
            label: device.label
        }));        res.json({ devices });

    } catch (error) {
        console.error('Error fetching ThingsBoard devices:', error);
        
        let errorMessage = 'Failed to fetch devices from ThingsBoard';
        if (error.response?.status === 400) {
            errorMessage = `Bad request: ${error.response?.data?.message || 'Invalid API call format'}`;
        } else if (error.response?.status === 403) {
            errorMessage = 'Insufficient permissions - may need tenant admin access';
        } else if (error.response?.status === 401) {
            errorMessage = 'Authentication failed - credentials may be expired';
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

// Get telemetry keys for a specific device
router.get('/thingsboard/devices/:systemId/:deviceId/telemetry-keys', async (req, res) => {
    const { systemId, deviceId } = req.params;
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

        // Get ThingsBoard credentials and authenticate
        const [credentialRows] = await pool.execute(
            'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
            [systemId, 'thingsboard']
        );

        if (credentialRows.length === 0) {            return res.status(400).json({ error: 'ThingsBoard credentials not configured' });
        }

        const credentials = credentialRows[0];

        const axios = require('axios');
        const decryptedUsername = CredentialEncryption.decrypt(credentials.username_encrypted);
        const decryptedPassword = CredentialEncryption.decrypt(credentials.password_encrypted);
        const apiUrl = credentials.api_url || 'https://tb.datascapeindustrial.com';

        // Authenticate and get token
        const authResponse = await axios.post(`${apiUrl}/api/auth/login`, {
            username: decryptedUsername,
            password: decryptedPassword
        });

        const token = authResponse.data.token;

        // Fetch telemetry keys for the device
        const keysResponse = await axios.get(`${apiUrl}/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`, {
            headers: {
                'X-Authorization': `Bearer ${token}`
            }
        });        res.json({ telemetryKeys: keysResponse.data });

    } catch (error) {
        console.error('Error fetching telemetry keys:', error);
        
        let errorMessage = 'Failed to fetch telemetry keys from ThingsBoard';
        if (error.response?.status === 403) {
            errorMessage = 'Insufficient permissions to access device telemetry';
        } else if (error.response?.status === 401) {
            errorMessage = 'Authentication failed - credentials may be expired';
        } else if (error.response?.status === 404) {
            errorMessage = 'Device not found or no telemetry keys available';
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

// Delete credentials
router.delete('/:credentialId', async (req, res) => {
    const { credentialId } = req.params;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Verify credential ownership through system ownership
        const [credentialRows] = await pool.execute(
            `SELECT sc.*, s.user_id 
                FROM system_credentials sc 
                JOIN systems s ON sc.system_id = s.id 
                WHERE sc.id = ? AND s.user_id = ?`, 
            [credentialId, req.user.userId]
        );

        if (credentialRows.length === 0) {            return res.status(404).json({ error: 'Credential not found or access denied' });
        }

        // Delete credential
        await pool.execute(
            'DELETE FROM system_credentials WHERE id = ?', 
            [credentialId]
        );        res.json({ message: 'Credentials deleted successfully' });

    } catch (error) {
        console.error('Error deleting credentials:', error);
        res.status(500).json({ error: 'Failed to delete credentials' });
    }
});

module.exports = router;