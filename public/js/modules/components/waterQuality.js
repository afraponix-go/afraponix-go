// Water Quality Component
// Handles water quality data management, nutrient analysis, and display

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Water Quality Component Class
 * Manages water quality data retrieval, nutrient analysis, and display
 */
export class WaterQualityComponent {
    constructor(app) {
        this.app = app;
        this.cachedNutrientData = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        
        console.log('💧 Water Quality Component initialized');
    }

    /**
     * Get latest nutrient values with intelligent fallback system
     */
    async getLatestNutrientValues() {
        try {
            // Early return if no active system selected
            if (!this.app.activeSystemId || this.app.activeSystemId === 'undefined') {
                return this.getDefaultNutrientValues();
            }
            
            // Check cache first
            if (this.isCacheValid()) {
                return this.cachedNutrientData;
            }
            
            // Fetch ALL latest values from water_quality table (includes water quality + nutrients)
            const response = await this.app.makeApiCall(`/data/latest/${this.app.activeSystemId}`);

            // Extract water quality data from response
            const wq = response.waterQuality || {};

            // Get the timestamp for this water quality record
            const recordDate = wq.date || wq.created_at || null;

            // Return all available parameters with their values and sources
            const nutrientData = {
                // Water quality parameters - directly from water_quality table
                ph: {
                    value: wq.ph !== undefined && wq.ph !== null ? wq.ph : null,
                    source: 'manual', // water_quality table data
                    date: recordDate
                },
                temperature: {
                    value: wq.temperature !== undefined && wq.temperature !== null ? wq.temperature : null,
                    source: 'manual',
                    date: recordDate
                },
                dissolved_oxygen: {
                    value: wq.dissolved_oxygen !== undefined && wq.dissolved_oxygen !== null ? wq.dissolved_oxygen : null,
                    source: 'manual',
                    date: recordDate
                },
                ammonia: {
                    value: wq.ammonia !== undefined && wq.ammonia !== null ? wq.ammonia : null,
                    source: 'manual',
                    date: recordDate
                },
                humidity: {
                    value: wq.humidity !== undefined && wq.humidity !== null ? wq.humidity : null,
                    source: 'manual',
                    date: recordDate
                },
                salinity: {
                    value: wq.salinity !== undefined && wq.salinity !== null ? wq.salinity : null,
                    source: 'manual',
                    date: recordDate
                },
                ec: {
                    value: wq.ec !== undefined && wq.ec !== null ? wq.ec : null,
                    source: 'manual',
                    date: recordDate
                },
                // Nutrient parameters - also from water_quality table
                nitrate: {
                    value: wq.nitrate !== undefined && wq.nitrate !== null ? wq.nitrate : null,
                    source: 'manual',
                    date: recordDate
                },
                phosphorus: {
                    value: wq.phosphorus !== undefined && wq.phosphorus !== null ? wq.phosphorus : null,
                    source: 'manual',
                    date: recordDate
                },
                potassium: {
                    value: wq.potassium !== undefined && wq.potassium !== null ? wq.potassium : null,
                    source: 'manual',
                    date: recordDate
                },
                iron: {
                    value: wq.iron !== undefined && wq.iron !== null ? wq.iron : null,
                    source: 'manual',
                    date: recordDate
                },
                calcium: {
                    value: wq.calcium !== undefined && wq.calcium !== null ? wq.calcium : null,
                    source: 'manual',
                    date: recordDate
                },
                magnesium: {
                    value: wq.magnesium !== undefined && wq.magnesium !== null ? wq.magnesium : null,
                    source: 'manual',
                    date: recordDate
                },
                nitrite: {
                    value: wq.nitrite !== undefined && wq.nitrite !== null ? wq.nitrite : null,
                    source: 'manual',
                    date: recordDate
                }
            };

            // Cache the result
            this.cacheNutrientData(nutrientData);
            
            return nutrientData;
            
        } catch (error) {
            console.error('Error fetching latest nutrient values:', error);
            
            // Fallback to old method using water quality data
            return this.getFallbackNutrientValues();
        }
    }

    /**
     * Fallback method using water quality data when API fails
     */
    getFallbackNutrientValues() {
        const waterQualityData = this.app.dataRecords.waterQuality || [];

        if (waterQualityData.length === 0) {
            return this.getDefaultNutrientValues();
        }

        // Sort by date (most recent first)
        const sortedData = [...waterQualityData].sort((a, b) => new Date(b.date) - new Date(a.date));

        const nutrients = {
            nitrate: { value: null, source: null, date: null },
            phosphorus: { value: null, source: null, date: null },
            potassium: { value: null, source: null, date: null },
            iron: { value: null, source: null, date: null },
            calcium: { value: null, source: null, date: null },
            ph: { value: null, source: null, date: null },
            humidity: { value: null, source: null, date: null },
            salinity: { value: null, source: null, date: null },
            temperature: { value: null, source: null, date: null },
            dissolved_oxygen: { value: null, source: null, date: null },
            ammonia: { value: null, source: null, date: null },
            ec: { value: null, source: null, date: null }
        };

        // Find the most recent non-null/non-zero value for each nutrient
        for (const entry of sortedData) {
            Object.keys(nutrients).forEach(key => {
                if (nutrients[key].value === null &&
                    entry[key] !== null &&
                    entry[key] !== undefined &&
                    entry[key] > 0) {
                    nutrients[key] = {
                        value: entry[key],
                        source: 'manual',
                        date: entry.date || entry.created_at
                    };
                }
            });

            // Stop early if we've found all nutrients
            if (Object.values(nutrients).every(item => item.value !== null)) {
                break;
            }
        }

        return nutrients;
    }

    /**
     * Get default nutrient values when no data is available
     */
    getDefaultNutrientValues() {
        const defaultNutrients = [
            'nitrate', 'nitrite', 'phosphorus', 'potassium', 'iron', 'calcium',
            'magnesium', 'ph', 'temperature', 'dissolved_oxygen', 'ammonia',
            'humidity', 'salinity', 'ec'
        ];

        const defaults = {};
        defaultNutrients.forEach(nutrient => {
            defaults[nutrient] = { value: null, source: null, date: null };
        });

        return defaults;
    }

    /**
     * Cache management methods
     */
    isCacheValid() {
        return this.cachedNutrientData && 
               this.cacheTimestamp && 
               (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }

    cacheNutrientData(data) {
        this.cachedNutrientData = data;
        this.cacheTimestamp = Date.now();
    }

    clearCache() {
        this.cachedNutrientData = null;
        this.cacheTimestamp = null;
    }

    /**
     * Update water quality metrics display
     */
    async updateWaterQualityMetrics() {
        try {
            const nutrientData = await this.getLatestNutrientValues();
            const sensorData = await this.getSensorData();
            
            // Combine all data sources, prioritizing sensor data
            const displayData = {
                temperature: sensorData.temperature || nutrientData.temperature?.value,
                ph: sensorData.ph || nutrientData.ph?.value,
                dissolved_oxygen: sensorData.dissolved_oxygen || nutrientData.dissolved_oxygen?.value,
                ammonia: sensorData.ammonia || nutrientData.ammonia?.value,
                humidity: sensorData.humidity || nutrientData.humidity?.value,
                salinity: sensorData.salinity || nutrientData.salinity?.value,
                ec: sensorData.ec || nutrientData.ec?.value
            };

            // Update display elements
            this.updateMetricDisplays(displayData, nutrientData);
            
        } catch (error) {
            console.error('Error updating water quality metrics:', error);
        }
    }

    /**
     * Get sensor data
     */
    async getSensorData() {
        try {
            if (!this.app.activeSystemId) return {};
            
            const sensorResponse = await this.app.makeApiCall(`/data/sensors/latest/${this.app.activeSystemId}`);
            return sensorResponse || {};
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
     * Update metric display elements
     */
    updateMetricDisplays(displayData, nutrientData) {
        const metrics = {
            'temperature-value': { value: displayData.temperature, unit: '°C' },
            'ph-value': { value: displayData.ph, unit: '' },
            'dissolved-oxygen-value': { value: displayData.dissolved_oxygen, unit: 'mg/L' },
            'ammonia-value': { value: displayData.ammonia, unit: 'mg/L' },
            'humidity-value': { value: displayData.humidity, unit: '%' },
            'salinity-value': { value: displayData.salinity, unit: 'ppt' },
            'ec-value': { value: displayData.ec, unit: 'μS/cm' },
            'nitrate-value': { value: nutrientData.nitrate?.value, unit: 'ppm' },
            'phosphorus-value': { value: nutrientData.phosphorus?.value, unit: 'ppm' },
            'potassium-value': { value: nutrientData.potassium?.value, unit: 'ppm' },
            'iron-value': { value: nutrientData.iron?.value, unit: 'ppm' },
            'calcium-value': { value: nutrientData.calcium?.value, unit: 'ppm' }
        };

        Object.entries(metrics).forEach(([id, metric]) => {
            const element = document.getElementById(id);
            if (element && metric.value !== null && metric.value !== undefined) {
                element.textContent = `${metric.value}${metric.unit}`;
            } else if (element) {
                element.textContent = 'No data';
            }
        });
    }

    /**
     * Analyze water quality parameters and provide status
     */
    analyzeWaterQuality(parameter, value) {
        const analyses = {
            ph: (val) => {
                if (val < 6.0) return { status: 'warning', message: 'Too acidic for plants' };
                if (val > 7.5) return { status: 'warning', message: 'Too alkaline' };
                return { status: 'good', message: 'Optimal range' };
            },
            temperature: (val) => {
                if (val < 18) return { status: 'warning', message: 'Too cold for optimal growth' };
                if (val > 28) return { status: 'warning', message: 'Too warm, may stress plants' };
                return { status: 'good', message: 'Good temperature' };
            },
            dissolved_oxygen: (val) => {
                if (val < 4) return { status: 'critical', message: 'Critical - increase aeration' };
                if (val < 6) return { status: 'warning', message: 'Low - needs improvement' };
                return { status: 'good', message: 'Good oxygen levels' };
            },
            nitrate: (val) => {
                if (val < 10) return { status: 'warning', message: 'Low - plants need nitrogen' };
                if (val > 100) return { status: 'warning', message: 'High - risk of algae growth' };
                return { status: 'good', message: 'Good nitrate levels' };
            },
            ec: (val) => {
                if (val < 400) return { status: 'warning', message: 'Low nutrient concentration' };
                if (val > 2000) return { status: 'warning', message: 'High - risk of nutrient burn' };
                return { status: 'good', message: 'Good nutrient levels' };
            }
        };

        const analyzer = analyses[parameter];
        if (!analyzer || value === null || value === undefined) {
            return { status: 'unknown', message: 'No data available' };
        }

        return analyzer(value);
    }

    /**
     * Update nutrient status indicators
     */
    updateNutrientStatus(nutrientName, value, analysis, source = null) {
        const valueElement = document.getElementById(`plant-${nutrientName}`);
        const indicatorElement = document.getElementById(`${nutrientName}-indicator`);
        const statusTextElement = document.getElementById(`${nutrientName}-status-text`);
        
        if (!valueElement || !indicatorElement || !statusTextElement) {
            // Elements might be intentionally missing in some tabs - use debug level
            console.debug(`Nutrient status elements not found for ${nutrientName} (normal for some tabs)`);
            return;
        }

        // Update timestamp for plant nutrient charts
        const timestampElement = document.getElementById(`plant-${nutrientName}-chart-timestamp`);
        if (timestampElement) {
            const currentTime = new Date().toLocaleString();
            timestampElement.textContent = `Last updated: ${currentTime}`;
        }
        
        if (value === null || value === undefined) {
            // No data state
            valueElement.textContent = 'No data';
            indicatorElement.className = 'status-indicator no-data';
            statusTextElement.className = 'status-text no-data';
            statusTextElement.textContent = 'No data';
        } else {
            // Convert to number and validate
            const numericValue = parseFloat(value);
            
            // Update value display
            if (isNaN(numericValue)) {
                valueElement.textContent = 'Invalid data';
                indicatorElement.className = 'status-indicator no-data';
                statusTextElement.className = 'status-text no-data';
                statusTextElement.textContent = 'Invalid data';
                return;
            }
            
            // Determine unit based on nutrient type
            let unit = 'mg/L';
            if (nutrientName === 'ph') unit = '';
            else if (nutrientName === 'humidity') unit = '%';
            else if (nutrientName === 'salinity') unit = 'ppt';
            
            // Determine source icon
            let sourceIcon = '';
            if (source === 'sensor') sourceIcon = '<img src="icons/new-icons/Afraponix Go Icons_sensor data.svg" alt="Sensor" style="width: 1em; height: 1em; vertical-align: middle;">';
            else if (source === 'manual') sourceIcon = '<img src="icons/new-icons/Afraponix Go Icons_Data entry.svg" alt="Manual" style="width: 1em; height: 1em; vertical-align: middle;">';
            else if (source === 'lab_test') sourceIcon = '<img src="icons/new-icons/chemistry.svg" alt="Lab" style="width: 1em; height: 1em; vertical-align: middle;">';
            
            // Use app's formatSensorValue to display with source icon
            valueElement.innerHTML = this.app.formatSensorValue(numericValue, unit, sourceIcon);
            
            // Update status indicator based on analysis
            if (!analysis) {
                // Value exists but no analysis - show as unknown
                indicatorElement.className = 'status-indicator no-data';
                statusTextElement.className = 'status-text no-data';
                statusTextElement.textContent = 'Unknown';
            } else {
                const statusClass = analysis.status || 'no-data';
                indicatorElement.className = `status-indicator ${statusClass}`;
                statusTextElement.className = `status-text ${statusClass}`;
                
                // Set status text based on analysis result and nutrient type
                let statusText = 'Unknown';
                if (nutrientName === 'ph') {
                    // Special handling for pH
                    if (statusClass === 'optimal') statusText = 'Optimal';
                    else if (statusClass === 'caution') statusText = 'High';  // pH high shows as caution
                    else if (statusClass === 'warning') statusText = 'Low';   // pH low shows as warning
                    else if (statusClass === 'critical') statusText = 'Critical';
                } else {
                    // Standard nutrient status text
                    const statusTexts = {
                        'optimal': 'Optimal',
                        'warning': 'Low',      // warning = below optimal range
                        'critical': 'Critical',
                        'caution': 'High'      // caution = above optimal range
                    };
                    statusText = statusTexts[statusClass] || 'Unknown';
                }
                statusTextElement.textContent = statusText;
            }
        }
    }

    /**
     * Get status symbol for indicators
     */
    getStatusSymbol(status) {
        const symbols = {
            'good': '●',
            'warning': '▲',
            'critical': '■',
            'unknown': '○'
        };
        return symbols[status] || '○';
    }

    /**
     * Format nutrient value for display
     */
    formatNutrientValue(nutrientType, value) {
        if (value === null || value === undefined) {
            return 'No data';
        }

        const units = {
            ph: '',
            temperature: '°C',
            dissolved_oxygen: 'mg/L',
            ammonia: 'mg/L',
            nitrate: 'ppm',
            phosphorus: 'ppm',
            potassium: 'ppm',
            iron: 'ppm',
            calcium: 'ppm',
            ec: 'μS/cm',
            humidity: '%',
            salinity: 'ppt'
        };

        const unit = units[nutrientType] || '';
        return `${value}${unit}`;
    }

    /**
     * Get data source icon
     */
    getSourceIcon(source) {
        const icons = {
            'sensor': '<img src="icons/new-icons/Afraponix Go Icons_sensor data.svg" alt="Sensor" style="width: 1em; height: 1em; vertical-align: middle;">',
            'manual': '<img src="icons/new-icons/Afraponix Go Icons_Data entry.svg" alt="Manual" style="width: 1em; height: 1em; vertical-align: middle;">',
            'lab': '<img src="icons/new-icons/chemistry.svg" alt="Lab" style="width: 1em; height: 1em; vertical-align: middle;">'
        };
        return icons[source] || icons.manual;
    }

    /**
     * Get comprehensive water quality report
     */
    async getWaterQualityReport() {
        const nutrientData = await this.getLatestNutrientValues();
        const report = {
            timestamp: new Date().toISOString(),
            parameters: {},
            overallStatus: 'unknown',
            recommendations: []
        };

        // Analyze each parameter
        Object.entries(nutrientData).forEach(([parameter, data]) => {
            if (data.value !== null) {
                const analysis = this.analyzeWaterQuality(parameter, data.value);
                report.parameters[parameter] = {
                    value: data.value,
                    source: data.source,
                    status: analysis.status,
                    message: analysis.message
                };
            }
        });

        // Determine overall status
        const statuses = Object.values(report.parameters).map(p => p.status);
        if (statuses.includes('critical')) {
            report.overallStatus = 'critical';
        } else if (statuses.includes('warning')) {
            report.overallStatus = 'warning';
        } else if (statuses.includes('good')) {
            report.overallStatus = 'good';
        }

        return report;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            cacheValid: this.isCacheValid(),
            cacheAge: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Water Quality component');
        this.clearCache();
    }
}

// Export both class and create a factory function
export default WaterQualityComponent;

/**
 * Factory function to create water quality component
 */
export function createWaterQualityComponent(app) {
    return new WaterQualityComponent(app);
}