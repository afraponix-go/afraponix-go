const axios = require('axios');
const { getDatabase } = require('../database/init-mariadb');

class SensorCollector {
    constructor() {
        this.isRunning = false;
        this.intervals = new Map();
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

    async scheduleAllSensors() {
        let connection;

        try {
            connection = await getDatabase();
            const [sensors] = await connection.execute('SELECT * FROM sensor_configs WHERE active = 1');
            await connection.end();

            for (const sensor of sensors) {
                this.scheduleSensor(sensor);
            }

        } catch (error) {
            if (connection) await connection.end();
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
        let connection;
        
        try {
            connection = await getDatabase();
            const [sensors] = await connection.execute('SELECT * FROM sensor_configs WHERE id = ? AND active = 1', [sensorId]);
            await connection.end();
            
            if (sensors.length > 0) {
                this.scheduleSensor(sensors[0]);
            }
        } catch (error) {
            if (connection) await connection.end();
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
        let connection;

        try {
            connection = await getDatabase();

            // Get sensor configuration
            const [sensorRows] = await connection.execute('SELECT * FROM sensor_configs WHERE id = ? AND active = 1', [sensorId]);
            
            if (sensorRows.length === 0) {
                await connection.end();

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
                    console.error(`❌ No ThingsBoard credentials found for sensor ${sensor.sensor_name}`);
                    await connection.end();
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
                console.error(`❌ Failed to get credentials for sensor ${sensor.sensor_name}:`, credError.message);
                await connection.end();
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
                console.error(`❌ Authentication failed for sensor ${sensor.sensor_name}:`, authError.message);
                await connection.end();
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
                        await connection.end();
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

            await connection.end();

        } catch (error) {
            if (connection) await connection.end();
            console.error(`Error collecting data for sensor ${sensorId}:`, error);
        }
    }

    async mapSensorData(connection, sensor, reading) {
        try {
            let value = reading.value;
            
            // Apply data transformation if specified
            if (sensor.data_transform) {
                try {
                    // Simple math expressions like "* 100" or "/ 1000"
                    if (sensor.data_transform.match(/^[\s\*\+\-\/\d\.]+$/)) {
                        value = eval(`${value} ${sensor.data_transform}`);
                    }
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
                await connection.execute(`
                    INSERT INTO fish_health (system_id, ${sensor.mapped_field}, date, created_at)
                    VALUES (?, ?, FROM_UNIXTIME(?), NOW())
                `, [sensor.system_id, value, reading.ts / 1000]);

            }

        } catch (mappingError) {
            console.error(`❌ Mapping error for sensor ${sensor.sensor_name}:`, mappingError.message);
        }
    }
}

module.exports = new SensorCollector();