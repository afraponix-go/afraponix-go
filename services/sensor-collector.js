const axios = require('axios');
const { getDatabase } = require('../database/init-mariadb');

class SensorCollector {
    constructor() {
        this.isRunning = false;
        this.intervals = new Map();
        this.errorSuppressionMap = new Map(); // Track errors to reduce spam
        this.suppressionDuration = 5 * 60 * 1000; // 5 minutes
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        await this.scheduleAllSensors();
    }

    async stop() {
        this.isRunning = false;
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();
    }

    /**
     * Log errors with suppression to prevent spam
     * @param {string} errorKey - Unique key to identify error type
     * @param {string} message - Error message to log
     */
    logSuppressedError(errorKey, message) {
        const now = Date.now();
        const lastLogged = this.errorSuppressionMap.get(errorKey);
        
        // Log if never logged before or suppression period has passed
        if (!lastLogged || (now - lastLogged) > this.suppressionDuration) {
            if (lastLogged) {
                console.error(`${message} (suppressed similar errors for ${Math.round((now - lastLogged) / 60000)} minutes)`);
            } else {
                console.error(`${message} (will suppress similar errors for 5 minutes)`);
            }
            this.errorSuppressionMap.set(errorKey, now);
        }
    }

    async scheduleAllSensors() {
        try {
            const connection = getDatabase();
            const [sensors] = await connection.execute('SELECT * FROM sensor_configs WHERE active = 1');
            // No need to end connection - pool handles lifecycle automatically

            for (const sensor of sensors) {
                this.scheduleSensor(sensor);
            }

        } catch (error) {
            console.error('Error scheduling sensors:', error);
        }
    }

    scheduleSensor(sensor) {
        // Clear existing interval if it exists
        if (this.intervals.has(sensor.id)) {
            clearInterval(this.intervals.get(sensor.id));
        }

        // Schedule new interval
        const interval = setInterval(async () => {
            await this.collectSensorData(sensor.id);
        }, sensor.update_interval * 1000);

        this.intervals.set(sensor.id, interval);

    }

    async scheduleSensorById(sensorId) {
        try {
            const connection = getDatabase();
            const [sensors] = await connection.execute('SELECT * FROM sensor_configs WHERE id = ? AND active = 1', [sensorId]);
            // No need to end connection - pool handles lifecycle automatically
            
            if (sensors.length > 0) {
                this.scheduleSensor(sensors[0]);
            }
        } catch (error) {
            console.error('Error scheduling sensor by ID:', error);
        }
    }

    unscheduleSensor(sensorId) {
        if (this.intervals.has(sensorId)) {
            clearInterval(this.intervals.get(sensorId));
            this.intervals.delete(sensorId);
        }
    }

    async collectSensorData(sensorId) {
        try {
            const connection = getDatabase();

            // Get sensor configuration
            const [sensorRows] = await connection.execute('SELECT * FROM sensor_configs WHERE id = ? AND active = 1', [sensorId]);
            
            if (sensorRows.length === 0) {
                return;
            }

            const sensor = sensorRows[0];

            // Get system credentials for ThingsBoard access directly from database
            let credentials;
            try {
                const [credentialRows] = await connection.execute(
                    'SELECT * FROM system_credentials WHERE system_id = ? AND service_name = ?', 
                    [sensor.system_id, 'thingsboard']
                );

                if (credentialRows.length === 0) {
                    this.logSuppressedError(`CREDENTIALS_MISSING_${sensor.system_id}`, 
                        `❌ No ThingsBoard credentials found for sensor ${sensor.sensor_name} (system: ${sensor.system_id})`
                    );
                    return;
                }

                const credRecord = credentialRows[0];
                
                // We need to decrypt the credentials - let's import the encryption utility
                const { CredentialEncryption } = require('../utils/encryption');
                
                credentials = {
                    api_url: credRecord.api_url,
                    username: CredentialEncryption.decrypt(credRecord.username_encrypted),
                    password: CredentialEncryption.decrypt(credRecord.password_encrypted)
                };
            } catch (credError) {
                this.logSuppressedError(`CREDENTIALS_ERROR_${sensor.system_id}`, 
                    `❌ Failed to get credentials for sensor ${sensor.sensor_name}: ${credError.message}`
                );
                return;
            }

            // First authenticate to get JWT token
            let authToken;
            try {
                const authResponse = await axios.post(`${credentials.api_url}/api/auth/login`, {
                    username: credentials.username,
                    password: credentials.password
                }, {
                    timeout: 10000
                });
                authToken = authResponse.data.token;
            } catch (authError) {
                this.logSuppressedError(`AUTH_ERROR_${sensor.system_id}`, 
                    `❌ Authentication failed for sensor ${sensor.sensor_name}: ${authError.message}`
                );
                return;
            }

            // Construct ThingsBoard API URL for latest telemetry
            const telemetryUrl = `${credentials.api_url}/api/plugins/telemetry/DEVICE/${sensor.device_id}/values/timeseries?keys=${sensor.telemetry_key}`;

            try {
                const response = await axios.get(telemetryUrl, {
                    headers: {
                        'X-Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });

                if (response.data && response.data[sensor.telemetry_key] && response.data[sensor.telemetry_key].length > 0) {
                    const latestReading = response.data[sensor.telemetry_key][0];
                    
                    // Skip if reading has null or invalid value
                    if (latestReading.value === null || latestReading.value === undefined || latestReading.value === '') {
                        console.log(`⚠️  Skipping null/empty value for sensor ${sensor.sensor_name}`);
                        return;
                    }
                    
                    // Check if this is a new reading
                    const [lastReadingRows] = await connection.execute(
                        'SELECT * FROM sensor_readings WHERE sensor_id = ? ORDER BY reading_time DESC LIMIT 1', 
                        [sensorId]
                    );

                    const shouldSaveReading = lastReadingRows.length === 0 || 
                                            latestReading.ts > lastReadingRows[0].reading_time;

                    if (shouldSaveReading) {
                        // Save to sensor_readings table
                        await connection.execute(
                            'INSERT INTO sensor_readings (sensor_id, value, reading_time) VALUES (?, ?, FROM_UNIXTIME(?))',
                            [sensorId, latestReading.value, latestReading.ts / 1000]
                        );

                        // Map to appropriate database table based on sensor configuration
                        if (sensor.mapped_table && sensor.mapped_field) {
                            await this.mapSensorData(connection, sensor, latestReading);
                        }

                        // Update last reading timestamp only if we saved new data
                        await connection.execute('UPDATE sensor_configs SET last_reading = FROM_UNIXTIME(?) WHERE id = ?', 
                            [latestReading.ts / 1000, sensorId]);
                    }
                }

            } catch (apiError) {
                // Reduced logging: console.error(`❌ API Error for sensor ${sensor.sensor_name}:`, apiError.message);
            }
            // No need to end connection - pool handles lifecycle automatically

        } catch (error) {
            console.error(`Error collecting data for sensor ${sensorId}:`, error);
        }
    }

    safeTransform(value, transform) {
        // Only allow simple mathematical operations with strict validation
        const cleanTransform = transform.trim();
        
        // Validate format: operator followed by number (e.g., "* 100", "/ 1000", "+ 5", "- 10")
        const mathPattern = /^(\*|\/|\+|\-)\s*(\d+(?:\.\d+)?)$/;
        const match = cleanTransform.match(mathPattern);
        
        if (!match) {
            throw new Error(`Invalid transform pattern: ${transform}. Only simple math operations allowed (e.g., "* 100", "/ 1000")`);
        }
        
        const operator = match[1];
        const operand = parseFloat(match[2]);
        
        if (isNaN(operand)) {
            throw new Error(`Invalid numeric operand: ${match[2]}`);
        }
        
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            throw new Error(`Cannot transform non-numeric value: ${value}`);
        }
        
        switch (operator) {
            case '*':
                return numericValue * operand;
            case '/':
                if (operand === 0) {
                    throw new Error('Division by zero not allowed');
                }
                return numericValue / operand;
            case '+':
                return numericValue + operand;
            case '-':
                return numericValue - operand;
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }

    async mapSensorData(connection, sensor, reading) {
        try {
            let value = reading.value;
            
            // Apply data transformation if specified
            if (sensor.data_transform) {
                try {
                    value = this.safeTransform(value, sensor.data_transform);
                } catch (transformError) {
                    console.warn(`⚠️  Transform error for sensor ${sensor.sensor_name}:`, transformError.message);
                }
            }

            // Map to target table
            if (sensor.mapped_table === 'nutrient_readings') {
                await connection.execute(`
                    INSERT INTO nutrient_readings (system_id, nutrient_type, value, source, reading_date, created_at)
                    VALUES (?, ?, ?, '📡', FROM_UNIXTIME(?), NOW())
                `, [sensor.system_id, sensor.mapped_field, value, reading.ts / 1000]);

            } else if (sensor.mapped_table === 'fish_health') {
                // Validate mapped_field against allowed columns to prevent SQL injection
                const allowedFishHealthFields = ['count', 'mortality', 'average_weight', 'feed_consumption', 'behavior', 'notes'];
                if (!allowedFishHealthFields.includes(sensor.mapped_field)) {
                    throw new Error(`Invalid mapped field for fish_health: ${sensor.mapped_field}. Allowed: ${allowedFishHealthFields.join(', ')}`);
                }
                
                await connection.execute(`
                    INSERT INTO fish_health (system_id, ${sensor.mapped_field}, date, created_at)
                    VALUES (?, ?, FROM_UNIXTIME(?), NOW())
                `, [sensor.system_id, value, reading.ts / 1000]);

            }

        } catch (mappingError) {
            this.logSuppressedError(`MAPPING_ERROR_${sensor.id}`, 
                `❌ Mapping error for sensor ${sensor.sensor_name}: ${mappingError.message}`
            );
        }
    }
}

module.exports = new SensorCollector();