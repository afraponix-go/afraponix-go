// Water Quality & Sensor Manager Component
// Handles water quality monitoring, sensor management, and data collection

/**
 * Water Quality & Sensor Manager Component Class
 * Manages water quality data, sensor configurations, and automated data collection
 */
export class WaterQualitySensorManagerComponent {
    constructor(app) {
        this.app = app;
        this.editingSensorId = null;
        this.sensorData = {};
        this.calibrationData = {};
        
        console.log('💧 Water Quality & Sensor Manager Component initialized');
    }

    /**
     * Save water quality data (delegates to DataEntry component)
     * Complexity: 5, Lines: 8
     */
    async saveWaterQualityData() {
        try {
            const result = await this.app.dataEntry.saveWaterQualityData();
            if (result) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return result;
        } catch (error) {
            console.error('Error saving water quality data:', error);
            throw error;
        }
    }

    /**
     * Fetch latest sensor data for dashboard
     * Complexity: 15, Lines: 30+
     */
    async fetchSensorData() {
        try {
            if (!this.app.activeSystemId) {
                return {};
            }
            
            // Get sensors configured for this system
            const sensorsResponse = await this.app.makeApiCall(`/sensors/system/${this.app.activeSystemId}`);
            const sensors = sensorsResponse.sensors || [];
            
            const sensorData = {};
            
            // For each sensor, get the latest reading from sensor_readings table
            for (const sensor of sensors) {
                try {
                    const latestReading = await this.app.makeApiCall(`/sensor-readings/latest/${sensor.id}`);
                    if (latestReading && latestReading.value !== null) {
                        sensorData[sensor.mapped_field] = latestReading.value;
                    } else {
                        // Fallback: Get latest water quality data to see if sensor data is there
                        const latestWQ = this.app.getLatestWaterQualityData();
                        if (latestWQ && latestWQ[sensor.mapped_field]) {
                            sensorData[sensor.mapped_field] = latestWQ[sensor.mapped_field];
                        }
                    }
                } catch (error) {
                    console.warn(`Error fetching data for sensor ${sensor.id}:`, error);
                }
            }
            
            this.sensorData = sensorData;
            return sensorData;
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            return {};
        }
    }

    /**
     * Initialize sensor management interface
     * Complexity: 20, Lines: 80+
     */
    initializeSensorManagement() {
        const container = document.getElementById('sensor-management-container');
        if (!container) return;

        container.innerHTML = `
            <div class="sensor-management-section">
                <div class="section-header">
                    <h3>
                        <img src="icons/new-icons/sensor.svg" alt="Sensors" style="width: 18px; height: 18px; vertical-align: text-bottom; margin-right: 6px;">
                        Sensor Configuration
                    </h3>
                    <button class="btn-success" onclick="app.waterQualitySensorManager.showAddSensorForm()">Add Sensor</button>
                </div>

                <div id="sensor-list" class="sensor-list">
                    <!-- Sensors will be loaded here -->
                </div>

                <div id="add-sensor-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="sensor-modal-title">Add Sensor</h3>
                            <button class="close" onclick="app.waterQualitySensorManager.hideAddSensorForm()">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.generateSensorForm()}
                        </div>
                    </div>
                </div>

                <div class="sensor-status-section">
                    <h4>
                        <img src="icons/new-icons/data.svg" alt="Status" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 6px;">
                        Sensor Status
                    </h4>
                    <div id="sensor-status-container">
                        <!-- Sensor status will be loaded here -->
                    </div>
                </div>
            </div>
        `;

        // Load existing sensors
        this.loadSensorList();
        this.updateSensorStatus();
    }

    /**
     * Generate sensor configuration form
     * Complexity: 15, Lines: 60+
     */
    generateSensorForm() {
        return `
            <form id="add-sensor-form">
                <div class="form-row">
                    <div class="form-field">
                        <label for="sensor_name">Sensor Name:</label>
                        <input type="text" id="sensor_name" name="sensor_name" required 
                               placeholder="e.g., pH Sensor Tank 1">
                    </div>
                    <div class="form-field">
                        <label for="sensor_type">Sensor Type:</label>
                        <select id="sensor_type" name="sensor_type" required>
                            <option value="">Select sensor type...</option>
                            <option value="ph">pH Sensor</option>
                            <option value="temperature">Temperature Sensor</option>
                            <option value="ec">EC/TDS Sensor</option>
                            <option value="dissolved_oxygen">Dissolved Oxygen Sensor</option>
                            <option value="turbidity">Turbidity Sensor</option>
                            <option value="level">Water Level Sensor</option>
                            <option value="flow">Flow Rate Sensor</option>
                            <option value="pressure">Pressure Sensor</option>
                            <option value="humidity">Humidity Sensor</option>
                            <option value="light">Light Sensor</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="device_id">Device/Platform ID:</label>
                        <input type="text" id="device_id" name="device_id" required 
                               placeholder="e.g., arduino_001, thingsboard_device_token">
                        <small>Unique identifier for the sensor device or platform</small>
                    </div>
                    <div class="form-field">
                        <label for="mapped_field">Data Field Mapping:</label>
                        <select id="mapped_field" name="mapped_field" required>
                            <option value="">Select field to map to...</option>
                            <option value="ph">pH Level</option>
                            <option value="temperature">Temperature</option>
                            <option value="ec">EC/Conductivity</option>
                            <option value="dissolved_oxygen">Dissolved Oxygen</option>
                            <option value="ammonia">Ammonia</option>
                            <option value="nitrite">Nitrite</option>
                            <option value="nitrate">Nitrate</option>
                            <option value="humidity">Humidity</option>
                            <option value="salinity">Salinity</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label for="unit">Unit:</label>
                        <input type="text" id="unit" name="unit" placeholder="e.g., °C, ppm, %">
                    </div>
                    <div class="form-field">
                        <label for="calibration_offset">Calibration Offset:</label>
                        <input type="number" id="calibration_offset" name="calibration_offset" 
                               step="0.01" placeholder="0.0">
                        <small>Adjustment value for sensor calibration</small>
                    </div>
                </div>

                <div class="form-field">
                    <label for="data_transform">Data Transform (Optional):</label>
                    <select id="data_transform" name="data_transform">
                        <option value="">No transformation</option>
                        <option value="multiply_10">Multiply by 10</option>
                        <option value="divide_10">Divide by 10</option>
                        <option value="multiply_100">Multiply by 100</option>
                        <option value="divide_100">Divide by 100</option>
                        <option value="celsius_to_fahrenheit">Celsius to Fahrenheit</option>
                        <option value="fahrenheit_to_celsius">Fahrenheit to Celsius</option>
                    </select>
                    <small>Apply mathematical transformation to raw sensor values</small>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-success" onclick="app.waterQualitySensorManager.saveSensorConfiguration()">
                        <span id="save-sensor-text">Save Sensor</span>
                    </button>
                    <button type="button" class="btn-secondary" onclick="app.waterQualitySensorManager.hideAddSensorForm()">
                        Cancel
                    </button>
                </div>
            </form>
        `;
    }

    /**
     * Show add sensor form modal
     * Complexity: 5, Lines: 10
     */
    showAddSensorForm() {
        const modal = document.getElementById('add-sensor-modal');
        if (modal) {
            modal.style.display = 'block';
            this.editingSensorId = null;
            document.getElementById('sensor-modal-title').textContent = 'Add Sensor';
            document.getElementById('save-sensor-text').textContent = 'Save Sensor';
            
            // Clear form
            const form = document.getElementById('add-sensor-form');
            if (form) form.reset();
        }
    }

    /**
     * Hide add sensor form modal
     * Complexity: 5, Lines: 8
     */
    hideAddSensorForm() {
        const modal = document.getElementById('add-sensor-modal');
        if (modal) {
            modal.style.display = 'none';
            this.editingSensorId = null;
        }
    }

    /**
     * Save sensor configuration
     * Complexity: 20, Lines: 50+
     */
    async saveSensorConfiguration() {
        try {
            const form = document.getElementById('add-sensor-form');
            const formData = new FormData(form);
            
            const sensorData = {
                system_id: this.app.activeSystemId,
                sensor_name: formData.get('sensor_name'),
                sensor_type: formData.get('sensor_type'),
                device_id: formData.get('device_id'),
                mapped_field: formData.get('mapped_field'),
                unit: formData.get('unit') || null,
                calibration_offset: parseFloat(formData.get('calibration_offset')) || 0,
                data_transform: formData.get('data_transform') || null
            };

            if (!sensorData.sensor_name || !sensorData.sensor_type || !sensorData.device_id) {
                this.app.showNotification('Please fill in all required fields', 'error');
                return;
            }

            if (!sensorData.mapped_field) {
                this.app.showNotification('Please select a data field to map the sensor to', 'error');
                return;
            }

            let data;
            let successMessage;
            
            if (this.editingSensorId) {
                // Update existing sensor
                data = await this.app.makeApiCall(`/sensors/${this.editingSensorId}`, {
                    method: 'PUT',
                    body: JSON.stringify(sensorData)
                });
                successMessage = 'Sensor configuration updated successfully';
            } else {
                // Create new sensor
                data = await this.app.makeApiCall('/sensors', {
                    method: 'POST',
                    body: JSON.stringify(sensorData)
                });
                successMessage = 'Sensor configuration saved successfully';
            }

            if (data.success !== false) {
                this.app.showNotification(successMessage, 'success');
                this.hideAddSensorForm();
                this.loadSensorList();
                this.updateSensorStatus();
            }

        } catch (error) {
            console.error('Error saving sensor configuration:', error);
            this.app.showNotification('Failed to save sensor configuration', 'error');
        }
    }

    /**
     * Load sensor list for management interface
     * Complexity: 15, Lines: 40+
     */
    async loadSensorList() {
        try {
            const container = document.getElementById('sensor-list');
            if (!container) return;

            const response = await this.app.makeApiCall(`/sensors/system/${this.app.activeSystemId}`);
            const sensors = response.sensors || [];

            if (sensors.length === 0) {
                container.innerHTML = '<p class="no-data">No sensors configured for this system.</p>';
                return;
            }

            let html = '<div class="sensors-grid">';
            
            sensors.forEach(sensor => {
                html += `
                    <div class="sensor-card" data-sensor-id="${sensor.id}">
                        <div class="sensor-header">
                            <h4>${sensor.sensor_name}</h4>
                            <div class="sensor-actions">
                                <button class="btn-icon" onclick="app.waterQualitySensorManager.editSensor(${sensor.id})"
                                        title="Edit sensor">
                                    <img src="icons/new-icons/edit.svg" alt="Edit" style="width: 14px; height: 14px;">
                                </button>
                                <button class="btn-icon btn-danger" onclick="app.waterQualitySensorManager.deleteSensor(${sensor.id})"
                                        title="Delete sensor">
                                    <img src="icons/new-icons/delete.svg" alt="Delete" style="width: 14px; height: 14px;">
                                </button>
                            </div>
                        </div>
                        <div class="sensor-details">
                            <div class="sensor-detail">
                                <strong>Type:</strong> ${sensor.sensor_type}
                            </div>
                            <div class="sensor-detail">
                                <strong>Device ID:</strong> ${sensor.device_id}
                            </div>
                            <div class="sensor-detail">
                                <strong>Maps to:</strong> ${sensor.mapped_field}
                            </div>
                            <div class="sensor-detail">
                                <strong>Unit:</strong> ${sensor.unit || 'N/A'}
                            </div>
                            ${sensor.calibration_offset ? `
                                <div class="sensor-detail">
                                    <strong>Calibration:</strong> ${sensor.calibration_offset > 0 ? '+' : ''}${sensor.calibration_offset}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading sensor list:', error);
        }
    }

    /**
     * Update sensor status display
     * Complexity: 18, Lines: 50+
     */
    async updateSensorStatus() {
        try {
            const container = document.getElementById('sensor-status-container');
            if (!container) return;

            const response = await this.app.makeApiCall(`/sensors/system/${this.app.activeSystemId}`);
            const sensors = response.sensors || [];

            if (sensors.length === 0) {
                container.innerHTML = '<p class="no-data">No sensors to monitor.</p>';
                return;
            }

            let html = '<div class="sensor-status-grid">';
            
            for (const sensor of sensors) {
                let status = 'unknown';
                let lastReading = 'Never';
                let lastValue = 'N/A';
                
                try {
                    const latestReading = await this.app.makeApiCall(`/sensor-readings/latest/${sensor.id}`);
                    if (latestReading) {
                        lastValue = this.formatSensorValue(latestReading.value, sensor.unit);
                        lastReading = new Date(latestReading.timestamp).toLocaleString();
                        
                        // Determine status based on reading age
                        const readingAge = Date.now() - new Date(latestReading.timestamp).getTime();
                        const hoursSinceReading = readingAge / (1000 * 60 * 60);
                        
                        if (hoursSinceReading < 1) {
                            status = 'active';
                        } else if (hoursSinceReading < 24) {
                            status = 'warning';
                        } else {
                            status = 'offline';
                        }
                    } else {
                        status = 'offline';
                    }
                } catch (error) {
                    status = 'error';
                }

                const statusIcon = this.getStatusIcon(status);
                const statusClass = `sensor-status-${status}`;
                
                html += `
                    <div class="sensor-status-card ${statusClass}">
                        <div class="sensor-status-header">
                            <span class="sensor-name">${sensor.sensor_name}</span>
                            <span class="sensor-status-icon">${statusIcon}</span>
                        </div>
                        <div class="sensor-status-details">
                            <div class="sensor-current-value">
                                <strong>${lastValue}</strong>
                            </div>
                            <div class="sensor-last-reading">
                                Last: ${lastReading}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error updating sensor status:', error);
        }
    }

    /**
     * Format sensor value for display
     * Complexity: 8, Lines: 15
     */
    formatSensorValue(value, unit) {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        
        let formattedValue;
        if (typeof value === 'number') {
            formattedValue = parseFloat(value).toFixed(2);
        } else {
            formattedValue = value.toString();
        }
        
        return unit ? `${formattedValue} ${unit}` : formattedValue;
    }

    /**
     * Get status icon for sensor status
     * Complexity: 5, Lines: 12
     */
    getStatusIcon(status) {
        const icons = {
            active: '🟢',
            warning: '🟡', 
            offline: '🔴',
            error: '⚠️',
            unknown: '❓'
        };
        return icons[status] || icons.unknown;
    }

    /**
     * Edit sensor configuration
     * Complexity: 15, Lines: 30+
     */
    async editSensor(sensorId) {
        try {
            const sensor = await this.app.makeApiCall(`/sensors/${sensorId}`);
            
            if (sensor) {
                this.editingSensorId = sensorId;
                
                // Show modal and update title
                const modal = document.getElementById('add-sensor-modal');
                modal.style.display = 'block';
                document.getElementById('sensor-modal-title').textContent = 'Edit Sensor';
                document.getElementById('save-sensor-text').textContent = 'Update Sensor';
                
                // Populate form with existing data
                document.getElementById('sensor_name').value = sensor.sensor_name || '';
                document.getElementById('sensor_type').value = sensor.sensor_type || '';
                document.getElementById('device_id').value = sensor.device_id || '';
                document.getElementById('mapped_field').value = sensor.mapped_field || '';
                document.getElementById('unit').value = sensor.unit || '';
                document.getElementById('calibration_offset').value = sensor.calibration_offset || 0;
                document.getElementById('data_transform').value = sensor.data_transform || '';
            }
        } catch (error) {
            console.error('Error loading sensor for editing:', error);
            this.app.showNotification('Failed to load sensor configuration', 'error');
        }
    }

    /**
     * Delete sensor configuration
     * Complexity: 12, Lines: 25
     */
    async deleteSensor(sensorId) {
        try {
            const sensor = await this.app.makeApiCall(`/sensors/${sensorId}`);
            
            const confirmed = await this.app.notificationManager.showCustomConfirm(
                'Delete Sensor',
                `Are you sure you want to delete "${sensor.sensor_name}"?`,
                ['This will remove the sensor configuration permanently', 'Historical data will not be affected']
            );
            
            if (confirmed) {
                await this.app.makeApiCall(`/sensors/${sensorId}`, {
                    method: 'DELETE'
                });
                
                this.app.showNotification('Sensor deleted successfully', 'success');
                this.loadSensorList();
                this.updateSensorStatus();
            }
        } catch (error) {
            console.error('Error deleting sensor:', error);
            this.app.showNotification('Failed to delete sensor', 'error');
        }
    }

    /**
     * Calibrate sensor with known reference value
     * Complexity: 15, Lines: 30+
     */
    async calibrateSensor(sensorId, referenceValue, currentReading) {
        try {
            const offset = referenceValue - currentReading;
            
            await this.app.makeApiCall(`/sensors/${sensorId}/calibrate`, {
                method: 'POST',
                body: JSON.stringify({
                    reference_value: referenceValue,
                    current_reading: currentReading,
                    calibration_offset: offset
                })
            });
            
            this.app.showNotification('Sensor calibrated successfully', 'success');
            this.loadSensorList();
            
        } catch (error) {
            console.error('Error calibrating sensor:', error);
            this.app.showNotification('Failed to calibrate sensor', 'error');
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            hasSensorData: Object.keys(this.sensorData).length > 0,
            sensorDataFields: Object.keys(this.sensorData).length,
            isEditingsensor: !!this.editingSensorId
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Water Quality & Sensor Manager component');
        this.editingSensorId = null;
        this.sensorData = {};
        this.calibrationData = {};
    }
}

// Export both class and create a factory function
export default WaterQualitySensorManagerComponent;

/**
 * Factory function to create water quality sensor manager component
 */
export function createWaterQualitySensorManagerComponent(app) {
    return new WaterQualitySensorManagerComponent(app);
}