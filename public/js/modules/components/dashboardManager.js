// Dashboard Manager Component
// Handles dashboard updates, data loading, and system health monitoring

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Dashboard Manager Component Class
 * Manages dashboard data updates and system health displays
 */
export class DashboardManagerComponent {
    constructor(app) {
        this.app = app;
        
        console.log('📊 Dashboard Manager Component initialized');
    }

    /**
     * Update dashboard with all data sources
     * Complexity: 35, Lines: 94
     */
    async updateDashboardFromData() {
        try {
            // Get latest sensor data to supplement/override manual data
            const sensorData = await this.getLatestSensorData();

            // Get latest data from nutrient_readings table (now includes all water quality + nutrients)
            const nutrientData = await this.app.getLatestNutrientValues();

            // Combine all data sources, prioritizing sensor data, then nutrient_readings
            const displayData = this.combineDataSources(sensorData, nutrientData);

            // Update dashboard displays
            this.updateWaterQualityDisplays(displayData, sensorData, nutrientData);
            this.updateNutrientDisplays(displayData, sensorData, nutrientData);

            // Update charts with historical data - but only if charts are initialized
            if (this.app.charts && this.app.charts.initialized) {
                await this.app.updateCharts();
            } else {
                console.log('📊 Charts not yet initialized, skipping chart update');
            }
            
            // Update latest data entries
            this.app.updateLatestDataEntries();
            
            // Update live sensor data display
            await this.app.updateLiveSensorData();
            
            // Update plant tab nutrient data (only if charts are initialized)
            if (this.app.charts && Object.keys(this.app.charts.charts || {}).length > 0) {
                this.app.updatePlantNutrientData().catch(console.error);
            } else {
                console.log('Skipping nutrient chart updates - charts not initialized yet');
            }
            
            // Update data history displays
            this.app.updateDataHistoryDisplays();
            
            // Update fish tank summary
            if (typeof this.app.updateFishTankSummary === 'function') {
                await this.app.updateFishTankSummary();
            }
            
            // Update plant management interface
            if (typeof this.app.updatePlantManagement === 'function') {
                await this.app.updatePlantManagement();
            }
            
            // Update recent water quality entry section
            if (typeof this.app.updateRecentWaterQualityEntry === 'function') {
                this.app.updateRecentWaterQualityEntry();
            }
            
            // Update System Health Status badges
            this.updateSystemHealthBadges(displayData);
            
            // Update farm layout dashboard
            if (typeof this.app.updateMainFarmLayout === 'function') {
                await this.app.updateMainFarmLayout();
            }
            
            // Update data edit interface if on settings page
            const editTab = document.querySelector('.edit-tab.active');
            if (editTab && typeof this.app.loadDataEditInterface === 'function') {
                this.app.loadDataEditInterface(editTab.dataset.category);
            }
        } catch (error) {
            console.error('Error updating dashboard from data:', error);
        }
    }

    /**
     * Load all data records for the active system
     * Complexity: 25, Lines: 48
     */
    async loadDataRecords() {
        if (!this.app.activeSystemId) {
            this.app.dataRecords = this.getEmptyDataRecords();
            return;
        }

        try {
            const [waterQuality, fishInventory, fishHealth, plantGrowth, operations] = await Promise.all([
                this.app.makeApiCall(`/data/water-quality/${this.app.activeSystemId}`).catch(() => []),
                this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`).catch(() => ({ tanks: [] })),
                this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}`).catch(() => []),
                this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`).catch(() => []),
                this.app.makeApiCall(`/data/operations/${this.app.activeSystemId}`).catch(() => [])
            ]);

            this.app.dataRecords = {
                waterQuality,
                fishInventory: fishInventory || { tanks: [] },
                fishHealth: fishHealth || [],
                fishEvents: [], // Will be loaded on demand
                plantGrowth,
                operations,
                nutrients: waterQuality || [] // nutrients are now in water_quality table
            };
        } catch (error) {
            console.error('Failed to load data records:', error);
            this.app.dataRecords = this.getEmptyDataRecords();
        }
    }

    /**
     * Get empty data records structure
     */
    getEmptyDataRecords() {
        return {
            waterQuality: [],
            fishInventory: { tanks: [] },
            fishHealth: [],
            fishEvents: [],
            plantGrowth: [],
            operations: [],
            nutrientReadings: []
        };
    }

    /**
     * Get latest sensor data
     */
    async getLatestSensorData() {
        try {
            if (!this.app.activeSystemId) return {};
            
            const response = await this.app.makeApiCall(`/data/sensors/latest/${this.app.activeSystemId}`);
            return response || {};
        } catch (error) {
            // Sensor data is supplementary - fail silently if endpoint doesn't exist
            if (error.message === 'Endpoint not found') {
                return {};
            }
            console.warn('Failed to fetch sensor data:', error);
            return {};
        }
    }

    /**
     * Combine data sources with priority
     */
    combineDataSources(sensorData, nutrientData) {
        return {
            temperature: sensorData.temperature || nutrientData.temperature?.value,
            ph: sensorData.ph || nutrientData.ph?.value,
            dissolved_oxygen: sensorData.dissolved_oxygen || nutrientData.dissolved_oxygen?.value,
            ammonia: sensorData.ammonia || nutrientData.ammonia?.value,
            humidity: sensorData.humidity || nutrientData.humidity?.value,
            salinity: sensorData.salinity || nutrientData.salinity?.value,
            ec: sensorData.ec || nutrientData.ec?.value,
            nitrate: sensorData.nitrate || nutrientData.nitrate?.value,
            nitrite: sensorData.nitrite || nutrientData.nitrite?.value,
            phosphorus: sensorData.phosphorus || nutrientData.phosphorus?.value,
            potassium: sensorData.potassium || nutrientData.potassium?.value,
            calcium: sensorData.calcium || nutrientData.calcium?.value,
            magnesium: sensorData.magnesium || nutrientData.magnesium?.value,
            iron: sensorData.iron || nutrientData.iron?.value
        };
    }

    /**
     * Update water quality displays
     */
    updateWaterQualityDisplays(displayData, sensorData, nutrientData) {
        const displays = {
            'water-temp': { value: displayData.temperature, unit: '°C', sensor: sensorData.temperature, nutrient: nutrientData.temperature?.value },
            'ph-level': { value: displayData.ph, unit: '', sensor: sensorData.ph, nutrient: nutrientData.ph?.value },
            'dissolved-oxygen': { value: displayData.dissolved_oxygen, unit: 'mg/L', sensor: sensorData.dissolved_oxygen, nutrient: nutrientData.dissolved_oxygen?.value },
            'ammonia': { value: displayData.ammonia, unit: 'ppm', sensor: sensorData.ammonia, nutrient: nutrientData.ammonia?.value },
            'humidity': { value: displayData.humidity, unit: '%', sensor: sensorData.humidity, nutrient: nutrientData.humidity?.value },
            'salinity': { value: displayData.salinity, unit: 'ppt', sensor: sensorData.salinity, nutrient: nutrientData.salinity?.value }
        };

        Object.entries(displays).forEach(([id, data]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = this.app.formatSensorValue(data.value, data.unit, '');
            }
            
            // Update the metric card icon based on data source
            this.updateMetricCardIcon(id, data.sensor, data.nutrient, data.value);

            // Update the date for this metric
            const dateElement = document.getElementById(id + '-chart-timestamp');
            if (dateElement) {
                const lastDate = this.getLastRecordedDate(id, data.sensor, data.nutrient, nutrientData);
                dateElement.textContent = lastDate ? `Last updated: ${lastDate}` : 'Last updated: Loading...';
            }
        });
    }

    /**
     * Update nutrient displays
     */
    updateNutrientDisplays(displayData, sensorData, nutrientData) {
        const displays = {
            'ec': { value: displayData.ec, unit: 'μS/cm', sensor: sensorData.ec, nutrient: nutrientData.ec?.value },
            'nitrate': { value: displayData.nitrate, unit: 'mg/L', sensor: sensorData.nitrate, nutrient: nutrientData.nitrate?.value },
            'nitrite': { value: displayData.nitrite, unit: 'mg/L', sensor: sensorData.nitrite, nutrient: nutrientData.nitrite?.value },
            'phosphorus': { value: displayData.phosphorus, unit: 'mg/L', sensor: sensorData.phosphorus, nutrient: nutrientData.phosphorus?.value },
            'potassium': { value: displayData.potassium, unit: 'mg/L', sensor: sensorData.potassium, nutrient: nutrientData.potassium?.value },
            'calcium': { value: displayData.calcium, unit: 'mg/L', sensor: sensorData.calcium, nutrient: nutrientData.calcium?.value },
            'magnesium': { value: displayData.magnesium, unit: 'mg/L', sensor: sensorData.magnesium, nutrient: nutrientData.magnesium?.value },
            'iron': { value: displayData.iron, unit: 'mg/L', sensor: sensorData.iron, nutrient: nutrientData.iron?.value }
        };

        console.log('🔬 Nutrient data received:', nutrientData);

        Object.entries(displays).forEach(([id, data]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = this.app.formatSensorValue(data.value, data.unit, '');
            }

            // Update the metric card icon based on data source
            this.updateMetricCardIcon(id, data.sensor, data.nutrient, data.value);

            // Update the date for this metric
            const dateElement = document.getElementById(id + '-chart-timestamp');
            if (dateElement) {
                const lastDate = this.getLastRecordedDate(id, data.sensor, data.nutrient, nutrientData);
                dateElement.textContent = lastDate ? `Last updated: ${lastDate}` : 'Last updated: Loading...';
            }
        });
    }

    /**
     * Get the last recorded date for a specific metric
     */
    getLastRecordedDate(metricId, sensorValue, nutrientValue, nutrientData) {
        let lastDate = null;
        const metricFieldName = this.getMetricFieldName(metricId);

        // Priority 1: Check nutrient/water quality data (has timestamp from database)
        if (nutrientData && nutrientData[metricFieldName]?.date) {
            lastDate = new Date(nutrientData[metricFieldName].date);
        }
        // Priority 2: Fallback to water quality table if available
        else {
            const latestWQ = this.app.getLatestWaterQualityData();
            if (latestWQ && latestWQ.date) {
                const fieldName = this.getWaterQualityFieldName(metricId);
                // If the metric has a value in water quality data, use that date
                if (latestWQ[fieldName] !== null && latestWQ[fieldName] !== undefined) {
                    lastDate = new Date(latestWQ.date);
                }
            }
        }

        if (lastDate && !isNaN(lastDate.getTime())) {
            return this.app.formatDateDDMMYYYY(lastDate);
        }

        return null;
    }

    /**
     * Map metric ID to nutrient data field name
     */
    getMetricFieldName(metricId) {
        const fieldMap = {
            'water-temp': 'temperature',
            'ph-level': 'ph',
            'dissolved-oxygen': 'dissolved_oxygen',
            'ammonia': 'ammonia',
            'humidity': 'humidity',
            'salinity': 'salinity',
            'ec': 'ec',
            'nitrate': 'nitrate',
            'nitrite': 'nitrite',
            'phosphorus': 'phosphorus',
            'potassium': 'potassium',
            'calcium': 'calcium',
            'magnesium': 'magnesium',
            'iron': 'iron'
        };
        return fieldMap[metricId] || metricId;
    }

    /**
     * Map metric ID to water quality data field name
     */
    getWaterQualityFieldName(metricId) {
        const fieldMap = {
            'water-temp': 'temperature',
            'ph-level': 'ph',
            'dissolved-oxygen': 'dissolved_oxygen',
            'ammonia': 'ammonia',
            'humidity': 'humidity',
            'salinity': 'salinity'
        };
        return fieldMap[metricId] || metricId;
    }

    /**
     * Update the metric card icon based on data source
     */
    updateMetricCardIcon(metricId, sensorValue, nutrientValue, displayValue) {
        // Find the metric card container
        const metricCard = document.querySelector(`[data-metric*="${this.getMetricShortName(metricId)}"]`);
        if (!metricCard) return;

        // Find the icon element within the card
        const iconElement = metricCard.querySelector('.metric-icon img, .metric-icon-svg');
        if (!iconElement) return;

        let newIconSrc, newAlt;

        // Determine which icon to show based on data source priority
        if (sensorValue !== undefined && sensorValue !== null) {
            // Sensor data available
            newIconSrc = 'icons/new-icons/Afraponix Go Icons_sensor data.svg';
            newAlt = 'Sensor Data';
        } else if (nutrientValue !== undefined && nutrientValue !== null) {
            // Manual/nutrient data available
            newIconSrc = 'icons/new-icons/Afraponix Go Icons_Data entry.svg';
            newAlt = 'Manual Entry';
        } else if (displayValue !== undefined && displayValue !== null && displayValue !== 'No data') {
            // Some other data source available
            newIconSrc = 'icons/new-icons/Afraponix Go Icons_Data entry.svg';
            newAlt = 'Manual Entry';
        } else {
            // No data available
            newIconSrc = 'icons/new-icons/Afraponix Go Icons_warning.svg';
            newAlt = 'No Data';
        }

        // Update the icon
        iconElement.src = newIconSrc;
        iconElement.alt = newAlt;
        iconElement.title = newAlt; // Tooltip
    }

    /**
     * Get metric short name for data-metric attribute matching
     */
    getMetricShortName(metricId) {
        const shortNameMap = {
            'water-temp': 'temperature',
            'ph-level': 'ph',
            'dissolved-oxygen': 'dissolved_oxygen',
            'ammonia': 'ammonia',
            'humidity': 'humidity',
            'salinity': 'salinity',
            'ec': 'ec',
            'nitrate': 'nitrate',
            'nitrite': 'nitrite',
            'phosphorus': 'phosphorus',
            'potassium': 'potassium',
            'calcium': 'calcium',
            'magnesium': 'magnesium',
            'iron': 'iron'
        };
        return shortNameMap[metricId] || metricId;
    }

    /**
     * Update system health status badges
     * Complexity: 22, Lines: 55
     */
    updateSystemHealthBadges(displayData) {
        // Update pH status
        this.updateHealthBadge('ph-status', displayData.ph, (value) => {
            if (value < 6.0) return { status: 'warning', text: 'Low pH' };
            if (value > 7.5) return { status: 'warning', text: 'High pH' };
            return { status: 'good', text: 'pH Good' };
        });

        // Update temperature status
        this.updateHealthBadge('temperature-status', displayData.temperature, (value) => {
            if (value < 18) return { status: 'warning', text: 'Cold' };
            if (value > 28) return { status: 'warning', text: 'Hot' };
            return { status: 'good', text: 'Temp Good' };
        });

        // Update oxygen status
        this.updateHealthBadge('oxygen-status', displayData.dissolved_oxygen, (value) => {
            if (value < 4) return { status: 'critical', text: 'Low O₂' };
            if (value < 6) return { status: 'warning', text: 'O₂ Fair' };
            return { status: 'good', text: 'O₂ Good' };
        });

        // Update overall system health
        this.updateOverallHealth(displayData);
    }

    /**
     * Update individual health badge
     */
    updateHealthBadge(elementId, value, evaluator) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (value === null || value === undefined) {
            element.className = 'status-badge no-data';
            element.textContent = 'No Data';
            return;
        }

        const evaluation = evaluator(value);
        element.className = `status-badge ${evaluation.status}`;
        element.textContent = evaluation.text;
    }

    /**
     * Update overall system health status
     */
    updateOverallHealth(displayData) {
        const overallElement = document.getElementById('overall-health');
        if (!overallElement) return;

        // Count critical, warning, and good statuses
        let criticalCount = 0;
        let warningCount = 0;
        let goodCount = 0;

        // Check each parameter
        if (displayData.ph !== null) {
            if (displayData.ph < 6.0 || displayData.ph > 7.5) warningCount++;
            else goodCount++;
        }

        if (displayData.temperature !== null) {
            if (displayData.temperature < 18 || displayData.temperature > 28) warningCount++;
            else goodCount++;
        }

        if (displayData.dissolved_oxygen !== null) {
            if (displayData.dissolved_oxygen < 4) criticalCount++;
            else if (displayData.dissolved_oxygen < 6) warningCount++;
            else goodCount++;
        }

        // Determine overall status
        if (criticalCount > 0) {
            overallElement.className = 'status-badge critical';
            overallElement.textContent = 'Needs Attention';
        } else if (warningCount > goodCount) {
            overallElement.className = 'status-badge warning';
            overallElement.textContent = 'Fair';
        } else if (goodCount > 0) {
            overallElement.className = 'status-badge good';
            overallElement.textContent = 'Excellent';
        } else {
            overallElement.className = 'status-badge no-data';
            overallElement.textContent = 'No Data';
        }
    }

    /**
     * Update current system display
     * Complexity: 10, Lines: 20
     */
    updateCurrentSystemDisplay() {
        const systemConfig = this.app.loadSystemConfig();
        const systemNameElements = document.querySelectorAll('.current-system-name');
        
        systemNameElements.forEach(element => {
            element.textContent = systemConfig?.system_name || 'No System Selected';
        });
        
        // Update system info display
        if (systemConfig) {
            const infoElement = document.getElementById('system-info');
            if (infoElement) {
                infoElement.innerHTML = `
                    <strong>${systemConfig.system_name}</strong><br>
                    Fish Tanks: ${systemConfig.fish_tank_count || 0}<br>
                    Grow Beds: ${systemConfig.grow_bed_count || 0}
                `;
            }
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            hasActiveSystem: !!this.app.activeSystemId,
            dataRecordsLoaded: this.app.dataRecords && Object.keys(this.app.dataRecords).length > 0,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Dashboard Manager component');
    }
}

// Export both class and create a factory function
export default DashboardManagerComponent;

/**
 * Factory function to create dashboard manager component
 */
export function createDashboardManagerComponent(app) {
    return new DashboardManagerComponent(app);
}