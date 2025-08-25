// Charts Component
// Handles Chart.js visualization initialization and updates

import { API_ENDPOINTS } from '../constants/index.js';
import { domUtils } from '../utils/domReady.js';

/**
 * Charts Component Class
 * Manages Chart.js chart initialization, updates, and brand color schemes
 */
export class ChartsComponent {
    constructor(app) {
        console.log('🏗️ ChartsComponent constructor called');
        this.app = app;
        this.charts = {};
        this.initialized = false;
        
        // Brand color mappings for different chart types
        this.colorScheme = {
            // Water quality parameters
            temperature: '#0051b1',      // Deep Blue
            ph: '#7BAAEE',              // Blue Fish
            dissolved_oxygen: '#8DFBCC', // Aqua Green
            ammonia: '#f59e0b',         // Warning Orange
            humidity: '#5a8fd9',        // Blue Fish Dark
            salinity: '#3379c9',        // Deep Blue Light
            
            // Nutrient parameters
            ec: '#002a61',              // Deep Blue Darker
            nitrate: '#80FB7B',         // Bio Green
            nitrite: '#60da5b',         // Bio Green Dark
            phosphorus: '#40b93b',      // Bio Green Darker
            potassium: '#a0fc9d',       // Bio Green Light
            calcium: '#95bcf2',         // Blue Fish Light
            magnesium: '#6ee0ad',       // Aqua Green Dark
            iron: '#4fc58e'             // Aqua Green Darker
        };
        
        console.log('📊 Charts Component initialized');
    }

    /**
     * Initialize all dashboard charts with brand colors
     * Complexity: 18, Lines: 22
     */
    async initializeCharts() {
        if (this.initialized) {
            console.log('📊 Charts already initialized, skipping...');
            return;
        }
        
        try {
            console.log('📊 Starting chart initialization...');
            
            // Wait for Chart.js to be available
            await domUtils.waitForChartJS(5000);
            console.log('📊 Chart.js available');
            
            // Wait for DOM to be ready
            await domUtils.domReady();
            console.log('📊 DOM ready');
            
            // Destroy existing charts first
            this.destroyAllCharts();
            console.log('📊 Existing charts destroyed');
        
        // Initialize charts for each parameter using brand colors
        this.initChart('temp-chart', 'Temperature (°C)', this.colorScheme.temperature, 'temperature');
        this.initChart('ph-chart', 'pH Level', this.colorScheme.ph, 'ph');
        this.initChart('oxygen-chart', 'Dissolved Oxygen (mg/L)', this.colorScheme.dissolved_oxygen, 'dissolved_oxygen');
        this.initChart('ammonia-chart', 'Ammonia (ppm)', this.colorScheme.ammonia, 'ammonia');
        this.initChart('humidity-chart', 'Humidity (%)', this.colorScheme.humidity, 'humidity');
        this.initChart('salinity-chart', 'Salinity (ppt)', this.colorScheme.salinity, 'salinity');
        
        // Initialize nutrient charts using brand color variations
        this.initChart('ec-chart', 'EC (μS/cm)', this.colorScheme.ec, 'ec');
        this.initChart('nitrate-chart', 'Nitrate (mg/L)', this.colorScheme.nitrate, 'nitrate');
        this.initChart('nitrite-chart', 'Nitrite (mg/L)', this.colorScheme.nitrite, 'nitrite');
        this.initChart('phosphorus-chart', 'Phosphorus (mg/L)', this.colorScheme.phosphorus, 'phosphorus');
        this.initChart('potassium-chart', 'Potassium (mg/L)', this.colorScheme.potassium, 'potassium');
        this.initChart('calcium-chart', 'Calcium (mg/L)', this.colorScheme.calcium, 'calcium');
        this.initChart('magnesium-chart', 'Magnesium (mg/L)', this.colorScheme.magnesium, 'magnesium');
        this.initChart('iron-chart', 'Iron (mg/L)', this.colorScheme.iron, 'iron');
            
            console.log('✅ All charts initialized successfully');
            this.initialized = true;
            
            // Force an immediate update with current data
            setTimeout(() => {
                console.log('🔄 Forcing chart update after initialization...');
                this.updateCharts();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to initialize charts:', error);
            // Continue without charts rather than breaking the app
        }
    }

    /**
     * Initialize individual chart with Chart.js configuration
     * Complexity: 25, Lines: 60
     */
    initChart(canvasId, label, color, dataField) {
        console.log(`📊 Initializing chart: ${canvasId}`);
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.warn(`❌ Canvas element ${canvasId} not found`);
            return;
        }
        
        // Check canvas visibility and dimensions
        const rect = ctx.getBoundingClientRect();
        const computedStyle = getComputedStyle(ctx);
        const parentElement = ctx.parentElement;
        const parentRect = parentElement ? parentElement.getBoundingClientRect() : null;
        
        console.log(`✅ Canvas element found: ${canvasId}`, {
            canvas: {
                width: rect.width,
                height: rect.height,
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                position: computedStyle.position
            },
            parent: parentRect ? {
                width: parentRect.width,
                height: parentRect.height,
                display: getComputedStyle(parentElement).display,
                visibility: getComputedStyle(parentElement).visibility
            } : 'no parent',
            visible: rect.width > 0 && rect.height > 0,
            inViewport: rect.top >= 0 && rect.left >= 0
        });
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
                console.log(`🗑️ Destroyed existing chart: ${canvasId}`);
            } catch (error) {
                console.warn(`Warning destroying chart ${canvasId}:`, error);
            }
            delete this.charts[canvasId];
        }
        
        // Also check for any Chart.js instance on this canvas globally
        const globalChart = Chart.getChart(canvasId);
        if (globalChart) {
            console.log(`🗑️ Destroying global Chart.js instance: ${canvasId}`);
            globalChart.destroy();
        }
        
        try {
            console.log(`📊 Creating Chart.js instance for: ${canvasId}`);
            this.charts[canvasId] = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: label,
                        data: [],
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: true,
                                color: '#e5e5e5'
                            },
                            ticks: {
                                font: {
                                    size: 10
                                }
                            }
                        },
                        y: {
                            grid: {
                                display: true,
                                color: '#e5e5e5'
                            },
                            ticks: {
                                font: {
                                    size: 10
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    elements: {
                        point: {
                            hoverRadius: 5
                        }
                    }
                }
            });
            console.log(`✅ Chart created successfully: ${canvasId}`);
            
            // Check if chart actually rendered by looking at canvas content
            setTimeout(() => {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const hasContent = rect.width > 0 && rect.height > 0;
                    console.log(`🔍 Chart render check for ${canvasId}:`, {
                        rendered: hasContent,
                        dimensions: `${rect.width}x${rect.height}`,
                        hasChart: !!this.charts[canvasId]
                    });
                }
            }, 500);
        } catch (error) {
            console.error(`❌ Error initializing chart ${canvasId}:`, error);
        }
    }

    /**
     * Update all charts with latest data
     * Complexity: 55, Lines: 120+
     */
    async updateCharts() {
        if (Object.keys(this.charts).length === 0) {
            console.warn('📊 No charts initialized, skipping update');
            return;
        }

        const data = this.app.dataRecords.waterQuality;
        console.log('📊 Chart update - Water quality data:', data ? `${data.length} records` : 'null/undefined');
        
        if (!data || data.length === 0) {
            console.warn('📊 No water quality data available for charts');
            // Update timestamps to show no data
            this.updateChartTimestamp('temp-chart-timestamp', 'No data available');
            this.updateChartTimestamp('ph-chart-timestamp', 'No data available');
            this.updateChartTimestamp('oxygen-chart-timestamp', 'No data available');
            this.updateChartTimestamp('ammonia-chart-timestamp', 'No data available');
            this.updateChartTimestamp('humidity-chart-timestamp', 'No data available');
            this.updateChartTimestamp('salinity-chart-timestamp', 'No data available');
            return;
        }

        // Get data for charts - use more records to ensure we capture sparse parameters like DO
        const chartData = data.slice(0, 30); // Increased from 10 to 30 to capture more sparse data
        
        // For each parameter, get the most recent 10 non-null values
        const getRecentNonNullData = (paramName) => {
            return chartData
                .filter(item => item[paramName] !== null && item[paramName] !== undefined)
                .slice(0, 10)
                .reverse();
        };
        
        // Get recent data for each parameter independently
        const tempData = getRecentNonNullData('temperature');
        const phData = getRecentNonNullData('ph');
        const doData = getRecentNonNullData('dissolved_oxygen');
        const ammoniaData = getRecentNonNullData('ammonia');
        const humidityData = getRecentNonNullData('humidity');
        const salinityData = getRecentNonNullData('salinity');
        
        // Create charts with individual data sets and labels
        if (tempData.length > 0) {
            const tempLabels = this.createDateLabels(tempData);
            this.updateChart('temp-chart', tempLabels, tempData.map(item => item.temperature));
        }
        
        if (phData.length > 0) {
            const phLabels = this.createDateLabels(phData);
            this.updateChart('ph-chart', phLabels, phData.map(item => item.ph));
        }
        
        if (doData.length > 0) {
            const doLabels = this.createDateLabels(doData);
            this.updateChart('oxygen-chart', doLabels, doData.map(item => item.dissolved_oxygen));
        }
        
        if (ammoniaData.length > 0) {
            const ammoniaLabels = this.createDateLabels(ammoniaData);
            this.updateChart('ammonia-chart', ammoniaLabels, ammoniaData.map(item => item.ammonia));
        }
        
        if (humidityData.length > 0) {
            const humidityLabels = this.createDateLabels(humidityData);
            this.updateChart('humidity-chart', humidityLabels, humidityData.map(item => item.humidity));
        }
        
        if (salinityData.length > 0) {
            const salinityLabels = this.createDateLabels(salinityData);
            this.updateChart('salinity-chart', salinityLabels, salinityData.map(item => item.salinity));
        }
        
        // Update nutrient charts (EC and nutrients from water quality data)
        const ecData = getRecentNonNullData('ec');
        if (ecData.length > 0) {
            const ecLabels = this.createDateLabels(ecData);
            this.updateChart('ec-chart', ecLabels, ecData.map(item => item.ec));
        }
        
        // Update nutrient charts with separate API call
        await this.updateNutrientCharts();
        
        // Only initialize fish density chart if canvas actually exists
        if (document.getElementById('fish-density-chart')) {
            await this.initializeFishDensityChart();
        } else {
            console.log('📊 Skipping fish density chart - canvas not in current view');
        }
        
        // Update chart timestamps with current time
        this.updateAllChartTimestamps();
    }

    /**
     * Update nutrient charts with data from nutrient_readings table
     */
    async updateNutrientCharts() {
        try {
            if (!this.app.activeSystemId) return;
            
            // Get nutrient data from the app's dataRecords
            const nutrientData = this.app.dataRecords.nutrients;
            if (!nutrientData || nutrientData.length === 0) {
                console.log('📊 No nutrient data available for charts');
                return;
            }
            
            // Get recent data for each nutrient parameter
            const getNutrientData = (nutrientType) => {
                return nutrientData
                    .filter(item => item.nutrient_type === nutrientType && 
                           item.value !== null && item.value !== undefined)
                    .slice(0, 10)
                    .reverse();
            };
            
            // Update each nutrient chart
            const nutrients = ['nitrate', 'nitrite', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'iron'];
            for (const nutrient of nutrients) {
                const data = getNutrientData(nutrient);
                if (data.length > 0) {
                    const labels = data.map(item => {
                        const date = new Date(item.reading_date);
                        return date.getMonth() + 1 + '/' + date.getDate();
                    });
                    const values = data.map(item => parseFloat(item.value));
                    this.updateChart(`${nutrient}-chart`, labels, values);
                }
            }
            
        } catch (error) {
            console.error('❌ Error updating nutrient charts:', error);
        }
    }

    /**
     * Create formatted date labels for chart data
     */
    createDateLabels(dataArray) {
        return dataArray.map(item => {
            const date = new Date(item.date);
            return date.getMonth() + 1 + '/' + date.getDate();
        });
    }

    /**
     * Update individual chart with new data
     */
    updateChart(chartId, labels, data) {
        const chart = this.charts[chartId];
        if (!chart) {
            // Only warn for charts that should exist, not optional ones like fish-density
            if (!chartId.includes('fish-density')) {
                console.warn(`📊 Chart ${chartId} not found in charts collection`);
            }
            return;
        }
        
        console.log(`📊 Updating chart ${chartId} with ${data.length} data points:`, data);
        
        try {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            
            // Force chart update and resize
            chart.update('none'); // Disable animation for better performance
            chart.resize(); // Force resize to ensure proper rendering
            
            // Additional delayed resize to handle timing issues
            setTimeout(() => {
                try {
                    chart.resize();
                    chart.update('none');
                } catch (e) {
                    // Silent failure for cleanup
                }
            }, 100);
            
            console.log(`✅ Updated chart ${chartId} with ${data.length} data points`);
        } catch (error) {
            console.error(`❌ Error updating chart ${chartId}:`, error);
        }
    }


    /**
     * Initialize fish density chart
     */
    async initializeFishDensityChart() {
        // Check if canvas element exists before attempting to initialize
        const canvas = document.getElementById('fish-density-chart');
        if (!canvas) {
            console.log('⚠️ Fish density chart canvas not found, skipping initialization');
            return;
        }

        // Check if chart already exists to prevent canvas reuse error
        if (this.charts['fish-density-chart']) {
            console.log('📊 Fish density chart already exists, updating data only');
            try {
                const fishDensityData = await this.getFishDensityData();
                if (fishDensityData.length > 0) {
                    const labels = fishDensityData.map(item => {
                        const date = new Date(item.date);
                        return date.getMonth() + 1 + '/' + date.getDate();
                    });
                    const densityValues = fishDensityData.map(item => item.density);
                    this.updateChart('fish-density-chart', labels, densityValues);
                }
            } catch (error) {
                console.error('❌ Error updating fish density chart:', error);
            }
            return;
        }

        try {
            // Force destroy any existing Chart.js instance on this canvas
            const existingChart = Chart.getChart('fish-density-chart');
            if (existingChart) {
                console.log('🗑️ Destroying existing Chart.js instance on fish-density-chart canvas');
                existingChart.destroy();
            }
            
            const fishDensityData = await this.getFishDensityData();
            if (fishDensityData.length > 0) {
                const labels = fishDensityData.map(item => {
                    const date = new Date(item.date);
                    return date.getMonth() + 1 + '/' + date.getDate();
                });
                const densityValues = fishDensityData.map(item => item.density);
                
                this.initChart('fish-density-chart', 'Fish Density (kg/m³)', this.colorScheme.temperature, 'density');
                this.updateChart('fish-density-chart', labels, densityValues);
            }
        } catch (error) {
            console.error('❌ Error initializing fish density chart:', error);
        }
    }

    /**
     * Get fish density data for charts
     */
    async getFishDensityData() {
        try {
            if (!this.app.activeSystemId) return [];
            
            // Try to get fish inventory data first (primary source)
            const fishInventoryResponse = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
            const fishHealthResponse = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}`);
            
            // Get system volume
            const systemVolume = this.app.fishTankVolumeL || 49000; // Default volume in liters
            const systemVolumeM3 = systemVolume / 1000; // Convert to cubic meters
            
            let densityData = [];
            
            if (fishInventoryResponse && fishInventoryResponse.tanks && fishInventoryResponse.tanks.length > 0) {
                // Use fish inventory data (primary source)
                const totalWeight = fishInventoryResponse.tanks.reduce((sum, tank) => {
                    return sum + (tank.total_weight_kg || 0);
                }, 0);
                
                densityData.push({
                    date: new Date().toISOString(),
                    density: totalWeight / systemVolumeM3
                });
            } else if (fishHealthResponse && fishHealthResponse.length > 0) {
                // Fallback to fish health data
                const recentHealthData = fishHealthResponse.slice(0, 10);
                densityData = recentHealthData.map(record => ({
                    date: record.date,
                    density: (record.fish_count * (record.average_weight_g || 250) / 1000) / systemVolumeM3
                }));
            }
            
            return densityData;
        } catch (error) {
            console.error('Error fetching fish density data:', error);
            return [];
        }
    }

    /**
     * Update chart timestamp displays
     */
    updateChartTimestamp(timestampId, message = null) {
        const timestampElement = document.getElementById(timestampId);
        if (timestampElement) {
            if (message) {
                timestampElement.textContent = message;
            } else {
                const currentTime = new Date().toLocaleString();
                timestampElement.textContent = `Last updated: ${currentTime}`;
            }
        }
    }

    /**
     * Update all chart timestamps
     */
    updateAllChartTimestamps() {
        const chartIds = [
            'temp-chart-timestamp',
            'ph-chart-timestamp', 
            'oxygen-chart-timestamp',
            'ammonia-chart-timestamp',
            'humidity-chart-timestamp',
            'salinity-chart-timestamp'
        ];
        
        chartIds.forEach(timestampId => {
            this.updateChartTimestamp(timestampId);
        });
    }

    /**
     * Force chart visibility check and re-render
     */
    forceChartVisibilityCheck() {
        console.log('🔍 Forcing chart visibility check and re-render...');
        Object.keys(this.charts).forEach(chartId => {
            const canvas = document.getElementById(chartId);
            const chart = this.charts[chartId];
            
            if (canvas && chart) {
                const rect = canvas.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                
                console.log(`📊 Chart ${chartId} visibility:`, {
                    visible: isVisible,
                    dimensions: `${rect.width}x${rect.height}`,
                    display: getComputedStyle(canvas).display
                });
                
                if (isVisible) {
                    // Force chart resize and update
                    try {
                        chart.resize();
                        chart.update('none');
                        console.log(`✅ Forced update for visible chart: ${chartId}`);
                    } catch (error) {
                        console.error(`❌ Error forcing update for ${chartId}:`, error);
                    }
                }
            }
        });
    }

    /**
     * Destroy all existing charts
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            if (this.charts[chartId]) {
                try {
                    this.charts[chartId].destroy();
                    console.log(`🗑️ Destroyed chart: ${chartId}`);
                } catch (error) {
                    console.warn(`Warning destroying chart ${chartId}:`, error);
                }
                delete this.charts[chartId];
            }
        });
        this.charts = {};
        this.initialized = false;
    }

    /**
     * Get chart by ID
     */
    getChart(chartId) {
        return this.charts[chartId] || null;
    }

    /**
     * Get all active charts
     */
    getAllCharts() {
        return { ...this.charts };
    }

    /**
     * Check if charts are initialized
     */
    hasCharts() {
        return Object.keys(this.charts).length > 0;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            totalCharts: Object.keys(this.charts).length,
            activeCharts: Object.keys(this.charts).filter(id => this.charts[id]).length,
            colorSchemeParams: Object.keys(this.colorScheme).length,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Charts component');
        this.destroyAllCharts();
    }
}

// Export both class and create a factory function
export default ChartsComponent;

/**
 * Factory function to create charts component
 */
export function createChartsComponent(app) {
    return new ChartsComponent(app);
}