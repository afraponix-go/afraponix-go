// Data Entry Component
// Handles all data entry forms for water quality, fish health, and operations

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Data Entry Component Class
 * Manages data entry forms and data recording functionality
 */
export class DataEntryComponent {
    constructor(app) {
        this.app = app;
        this.latestData = {};
        
        console.log('📝 Data Entry Component initialized');
    }

    /**
     * Initialize all data entry forms
     * Complexity: 10, Lines: 8
     */
    async initializeDataEntryForms() {
        // Load latest data for preloading
        await this.loadLatestDataForPreloading();
        
        this.initializeWaterQualityForm();
        // Fish health form is now handled in Fish Management tabs
        this.initializeOperationsForm();
    }

    /**
     * Load latest data for form preloading
     * Complexity: 8, Lines: 10
     */
    async loadLatestDataForPreloading() {
        if (!this.app.activeSystemId) return;
        
        try {
            this.latestData = await this.app.makeApiCall(`/data/latest/${this.app.activeSystemId}`);
        } catch (error) {
            console.error('Error loading latest data for preloading:', error);
            this.latestData = {};
        }
    }

    /**
     * Initialize water quality data entry form
     * Complexity: 15, Lines: 78
     */
    initializeWaterQualityForm() {
        const formDiv = document.querySelector('#water-quality-form .data-entry-section');
        if (!formDiv) {
            console.debug('Water quality form container not found');
            return;
        }

        formDiv.innerHTML = `
            <div class="form-section">
                <h3>Water Quality Parameters</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="wq-date">Date & Time:</label>
                        <input type="datetime-local" id="wq-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="wq-ph">pH Level:</label>
                        <input type="number" id="wq-ph" min="0" max="14" step="0.1" placeholder="6.0 - 8.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-ec">EC/TDS (ppm):</label>
                        <input type="number" id="wq-ec" min="0" step="10" placeholder="400 - 1200">
                    </div>
                    <div class="form-field">
                        <label for="wq-do">Dissolved Oxygen (mg/L):</label>
                        <input type="number" id="wq-do" min="0" step="0.1" placeholder="5.0 - 8.0">
                    </div>
                    <div class="form-field">
                        <label for="wq-temp">Water Temperature (°C):</label>
                        <input type="number" id="wq-temp" min="0" step="0.1" placeholder="18 - 30">
                    </div>
                    <div class="form-field">
                        <label for="wq-humidity">Humidity (%):</label>
                        <input type="number" id="wq-humidity" min="0" max="100" step="1" placeholder="40 - 80">
                    </div>
                    <div class="form-field">
                        <label for="wq-salinity">Salinity (ppt):</label>
                        <input type="number" id="wq-salinity" min="0" step="0.1" placeholder="0 - 1.0">
                    </div>
                    <div class="form-field">
                        <label for="wq-ammonia">Ammonia NH₃ (ppm):</label>
                        <input type="number" id="wq-ammonia" min="0" step="0.01" placeholder="< 0.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-nitrite">Nitrite NO₂ (ppm):</label>
                        <input type="number" id="wq-nitrite" min="0" step="0.01" placeholder="< 0.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-nitrate">Nitrate NO₃ (ppm):</label>
                        <input type="number" id="wq-nitrate" min="0" step="1" placeholder="10 - 150">
                    </div>
                    <div class="form-field">
                        <label for="wq-iron">Iron Fe (ppm):</label>
                        <input type="number" id="wq-iron" min="0" step="0.1" placeholder="1 - 3">
                    </div>
                    <div class="form-field">
                        <label for="wq-potassium">Potassium K (ppm):</label>
                        <input type="number" id="wq-potassium" min="0" step="1" placeholder="40 - 70">
                    </div>
                    <div class="form-field">
                        <label for="wq-calcium">Calcium Ca (ppm):</label>
                        <input type="number" id="wq-calcium" min="0" step="1" placeholder="50 - 100">
                    </div>
                    <div class="form-field">
                        <label for="wq-phosphorus">Phosphorus P (ppm):</label>
                        <input type="number" id="wq-phosphorus" min="0" step="0.1" placeholder="5 - 20">
                    </div>
                    <div class="form-field">
                        <label for="wq-magnesium">Magnesium Mg (ppm):</label>
                        <input type="number" id="wq-magnesium" min="0" step="0.1" placeholder="12 - 18">
                    </div>
                </div>
                <div class="form-field">
                    <label for="wq-notes">Notes:</label>
                    <textarea id="wq-notes" placeholder="Additional observations..."></textarea>
                </div>
                <button class="form-btn" onclick="app.saveWaterQualityData()">Save Water Quality Data</button>
            </div>
        `;
        
        // Preload data from latest entry
        this.preloadWaterQualityData();
    }

    /**
     * Initialize operations data entry form
     * Complexity: 12, Lines: 44
     */
    initializeOperationsForm() {
        const formDiv = document.querySelector('#operations-form .data-entry-section');
        if (!formDiv) {
            console.debug('Operations form container not found');
            return;
        }

        formDiv.innerHTML = `
            <div class="form-section">
                <h3>Daily Operations</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="op-date">Date & Time:</label>
                        <input type="datetime-local" id="op-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="op-task">Task Performed:</label>
                        <select id="op-task">
                            <option value="">Select a task...</option>
                            <option value="feeding">Fish Feeding</option>
                            <option value="water_change">Water Change</option>
                            <option value="plant_harvest">Plant Harvest</option>
                            <option value="plant_seeding">Plant Seeding</option>
                            <option value="system_check">System Check</option>
                            <option value="filter_clean">Filter Cleaning</option>
                            <option value="pump_maintenance">Pump Maintenance</option>
                            <option value="pest_control">Pest Control</option>
                            <option value="nutrient_dosing">Nutrient Dosing</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="op-duration">Duration (minutes):</label>
                        <input type="number" id="op-duration" min="0" step="5" placeholder="Minutes spent">
                    </div>
                </div>
                <div class="form-field">
                    <label for="op-notes">Details/Notes:</label>
                    <textarea id="op-notes" placeholder="Describe the task performed..."></textarea>
                </div>
                <button class="form-btn" onclick="app.saveOperationsData()">Save Operations Data</button>
            </div>
        `;
    }

    /**
     * Preload water quality form with latest data
     * Complexity: 10, Lines: 25
     */
    preloadWaterQualityData() {
        if (!this.latestData || !this.latestData.waterQuality) return;
        
        const latest = this.latestData.waterQuality;
        const fields = {
            'wq-ph': latest.ph,
            'wq-ec': latest.ec,
            'wq-do': latest.dissolved_oxygen,
            'wq-temp': latest.temperature,
            'wq-humidity': latest.humidity,
            'wq-salinity': latest.salinity,
            'wq-ammonia': latest.ammonia,
            'wq-nitrite': latest.nitrite,
            'wq-nitrate': latest.nitrate,
            'wq-iron': latest.iron,
            'wq-potassium': latest.potassium,
            'wq-calcium': latest.calcium,
            'wq-phosphorus': latest.phosphorus,
            'wq-magnesium': latest.magnesium
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== null && value !== undefined) {
                element.value = value;
            }
        });
    }

    /**
     * Save water quality data
     * Complexity: 20, Lines: 50
     */
    async saveWaterQualityData() {
        if (!this.app.activeSystemId) {
            this.app.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('wq-date').value,
            ph: this.app.parseNumericValue(document.getElementById('wq-ph').value),
            ec: this.app.parseNumericValue(document.getElementById('wq-ec').value),
            dissolved_oxygen: this.app.parseNumericValue(document.getElementById('wq-do').value),
            temperature: this.app.parseNumericValue(document.getElementById('wq-temp').value),
            humidity: this.app.parseNumericValue(document.getElementById('wq-humidity').value),
            salinity: this.app.parseNumericValue(document.getElementById('wq-salinity').value),
            ammonia: this.app.parseNumericValue(document.getElementById('wq-ammonia').value),
            nitrite: this.app.parseNumericValue(document.getElementById('wq-nitrite').value),
            nitrate: this.app.parseNumericValue(document.getElementById('wq-nitrate').value),
            iron: this.app.parseNumericValue(document.getElementById('wq-iron').value),
            potassium: this.app.parseNumericValue(document.getElementById('wq-potassium').value),
            calcium: this.app.parseNumericValue(document.getElementById('wq-calcium').value),
            phosphorus: this.app.parseNumericValue(document.getElementById('wq-phosphorus').value),
            magnesium: this.app.parseNumericValue(document.getElementById('wq-magnesium').value),
            notes: document.getElementById('wq-notes').value
        };

        try {
            await this.app.performSaveWithProgress('water', async () => {
                // Save to water_quality table as a complete snapshot
                await this.app.makeApiCall(`/data/water-quality/${this.app.activeSystemId}`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                // Also save individual parameters to nutrient_readings for tracking
                const nutrients = [];
                const readingDate = new Date().toISOString();

                // Map water quality parameters to nutrient readings for tracking
                if (data.temperature !== null) nutrients.push({ type: 'temperature', value: data.temperature, unit: '°C', reading_date: readingDate, source: 'manual' });
                if (data.ph !== null) nutrients.push({ type: 'ph', value: data.ph, unit: '', reading_date: readingDate, source: 'manual' });
                if (data.dissolved_oxygen !== null) nutrients.push({ type: 'dissolved_oxygen', value: data.dissolved_oxygen, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.ammonia !== null) nutrients.push({ type: 'ammonia', value: data.ammonia, unit: 'ppm', reading_date: readingDate, source: 'manual' });
                if (data.humidity !== null) nutrients.push({ type: 'humidity', value: data.humidity, unit: '%', reading_date: readingDate, source: 'manual' });
                if (data.salinity !== null) nutrients.push({ type: 'salinity', value: data.salinity, unit: 'ppt', reading_date: readingDate, source: 'manual' });
                if (data.ec !== null) nutrients.push({ type: 'ec', value: data.ec, unit: 'µS/cm', reading_date: readingDate, source: 'manual' });
                if (data.nitrate !== null) nutrients.push({ type: 'nitrate', value: data.nitrate, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.nitrite !== null) nutrients.push({ type: 'nitrite', value: data.nitrite, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.phosphorus !== null) nutrients.push({ type: 'phosphorus', value: data.phosphorus, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.potassium !== null) nutrients.push({ type: 'potassium', value: data.potassium, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.iron !== null) nutrients.push({ type: 'iron', value: data.iron, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.calcium !== null) nutrients.push({ type: 'calcium', value: data.calcium, unit: 'mg/L', reading_date: readingDate, source: 'manual' });
                if (data.magnesium !== null) nutrients.push({ type: 'magnesium', value: data.magnesium, unit: 'mg/L', reading_date: readingDate, source: 'manual' });

                // Add notes to the first nutrient entry if provided
                if (nutrients.length > 0 && data.notes) {
                    nutrients[0].notes = data.notes;
                }

                // Also save to nutrients endpoint for individual tracking
                if (nutrients.length > 0) {
                    await this.app.makeApiCall(`/data/nutrients/${this.app.activeSystemId}`, {
                        method: 'POST',
                        body: JSON.stringify({ nutrients })
                    });
                }

                // Clear form after successful save
                this.clearWaterQualityForm();

                // Reload data to update displays
                await this.app.loadDataRecords();
                await this.app.updateDashboardFromData();
            });
        } catch (error) {
            console.error('Failed to save water quality data:', error);
            this.app.showNotification('❌ Failed to save water quality data', 'error');
        }
    }

    /**
     * Save operations data
     * Complexity: 15, Lines: 35
     */
    async saveOperationsData() {
        if (!this.app.activeSystemId) {
            this.app.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const task = document.getElementById('op-task').value;
        if (!task) {
            this.app.showNotification('Please select a task type', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('op-date').value,
            task_type: task,
            duration_minutes: this.app.parseNumericValue(document.getElementById('op-duration').value),
            notes: document.getElementById('op-notes').value
        };

        try {
            await this.app.performSaveWithProgress('operations', async () => {
                await this.app.makeApiCall(`/data/operations/${this.app.activeSystemId}`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                // Clear form after successful save
                this.clearOperationsForm();
                
                // Reload data
                await this.app.loadDataRecords();
            });
        } catch (error) {
            console.error('Failed to save operations data:', error);
            this.app.showNotification('❌ Failed to save operations data', 'error');
        }
    }

    /**
     * Clear water quality form
     */
    clearWaterQualityForm() {
        const fields = [
            'wq-ph', 'wq-ec', 'wq-do', 'wq-temp', 'wq-humidity', 'wq-salinity',
            'wq-ammonia', 'wq-nitrite', 'wq-nitrate', 'wq-iron', 'wq-potassium',
            'wq-calcium', 'wq-phosphorus', 'wq-magnesium', 'wq-notes'
        ];
        
        fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Reset date to current
        const dateElement = document.getElementById('wq-date');
        if (dateElement) {
            dateElement.value = new Date().toISOString().slice(0, 16);
        }
    }

    /**
     * Clear operations form
     */
    clearOperationsForm() {
        document.getElementById('op-task').value = '';
        document.getElementById('op-duration').value = '';
        document.getElementById('op-notes').value = '';
        
        // Reset date to current
        document.getElementById('op-date').value = new Date().toISOString().slice(0, 16);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            hasLatestData: Object.keys(this.latestData).length > 0,
            activeSystemId: this.app.activeSystemId,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Data Entry component');
        this.latestData = {};
    }
}

// Export both class and create a factory function
export default DataEntryComponent;

/**
 * Factory function to create data entry component
 */
export function createDataEntryComponent(app) {
    return new DataEntryComponent(app);
}