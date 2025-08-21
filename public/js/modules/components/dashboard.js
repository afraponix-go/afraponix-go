// Dashboard Component
// Handles dashboard display, charts, and overview information

/**
 * Dashboard Component
 * Manages the main dashboard display with charts, metrics, and overview data
 */
export default class Dashboard {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.refreshInterval = null;
        this.isVisible = false;
    }

    /**
     * Initialize the dashboard component
     */
    initialize() {
        this.setupRefreshInterval();
        console.log('📊 Dashboard component initialized');
    }

    /**
     * Show the dashboard
     */
    async show() {
        console.log('📊 Showing dashboard');
        this.isVisible = true;
        
        // Initialize charts if not already done
        if (Object.keys(this.charts).length === 0) {
            this.initializeCharts();
        }
        
        // Load and display data
        await this.refreshData();
        
        // Start refresh interval
        this.startRefreshInterval();
    }

    /**
     * Hide the dashboard
     */
    hide() {
        console.log('📊 Hiding dashboard');
        this.isVisible = false;
        this.stopRefreshInterval();
    }

    /**
     * Initialize all dashboard charts
     */
    initializeCharts() {
        if (!window.Chart) {
            console.warn('⚠️ Chart.js not available, skipping chart initialization');
            return;
        }

        console.log('📊 Initializing dashboard charts');
        
        const chartConfigs = this.getChartConfigurations();
        
        Object.entries(chartConfigs).forEach(([chartId, config]) => {
            try {
                const canvas = document.getElementById(chartId);
                if (canvas) {
                    this.charts[chartId] = new Chart(canvas.getContext('2d'), config);
                    console.log(`✅ Initialized ${chartId} chart`);
                } else {
                    console.warn(`⚠️ Chart canvas not found: ${chartId}`);
                }
            } catch (error) {
                console.error(`❌ Failed to initialize ${chartId} chart:`, error);
            }
        });
    }

    /**
     * Get chart configurations
     */
    getChartConfigurations() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    ticks: { color: '#666', font: { size: 11 } }
                },
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    ticks: { color: '#666', font: { size: 11 } }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };

        return {
            'temperature-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#0051b1',
                        backgroundColor: 'rgba(0, 81, 177, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, title: { display: true, text: '°C' } } } }
            },
            'ph-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'pH Level',
                        data: [],
                        borderColor: '#7BAAEE',
                        backgroundColor: 'rgba(123, 170, 238, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 14, title: { display: true, text: 'pH' } } } }
            },
            'dissolved-oxygen-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Dissolved Oxygen (mg/L)',
                        data: [],
                        borderColor: '#8DFBCC',
                        backgroundColor: 'rgba(141, 251, 204, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, title: { display: true, text: 'mg/L' } } } }
            },
            'ammonia-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Ammonia (mg/L)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, title: { display: true, text: 'mg/L' } } } }
            },
            'humidity-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Humidity (%)',
                        data: [],
                        borderColor: '#5a8fd9',
                        backgroundColor: 'rgba(90, 143, 217, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100, title: { display: true, text: '%' } } } }
            },
            'salinity-chart': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Salinity (ppt)',
                        data: [],
                        borderColor: '#95bcf2',
                        backgroundColor: 'rgba(149, 188, 242, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, title: { display: true, text: 'ppt' } } } }
            }
        };
    }

    /**
     * Refresh dashboard data
     */
    async refreshData() {
        if (!this.isVisible || !this.app.activeSystemId) return;
        
        console.log('🔄 Refreshing dashboard data');
        
        try {
            // Load all data in parallel
            const [waterQualityData, fishData, plantData, nutrientData] = await Promise.all([
                this.app.makeApiCall(`/data/water-quality/${this.app.activeSystemId}`).catch(() => []),
                this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`).catch(() => ({ tanks: [] })),
                this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`).catch(() => []),
                this.app.makeApiCall(`/data/nutrients/latest/${this.app.activeSystemId}`).catch(() => [])
            ]);

            // Update charts
            this.updateCharts(waterQualityData);
            
            // Update metric cards
            this.updateMetricCards(waterQualityData, fishData, plantData, nutrientData);
            
            console.log('✅ Dashboard data refreshed');
            
        } catch (error) {
            console.error('❌ Failed to refresh dashboard data:', error);
        }
    }

    /**
     * Update all charts with new data
     */
    updateCharts(waterQualityData) {
        if (!waterQualityData || !Array.isArray(waterQualityData)) return;
        
        // Skip if no charts exist (might be called before initialization)
        if (Object.keys(this.charts).length === 0) {
            console.log('📊 Skipping chart update - charts not initialized');
            return;
        }

        console.log('📊 Updating dashboard charts with', waterQualityData.length, 'data points');

        // Prepare data for charts (last 20 readings)
        const recentData = waterQualityData.slice(-20);
        const labels = recentData.map(entry => {
            const date = new Date(entry.date || entry.created_at);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });

        // Chart data mappings
        const chartDataMap = {
            'temperature-chart': recentData.map(entry => entry.water_temperature),
            'ph-chart': recentData.map(entry => entry.ph),
            'dissolved-oxygen-chart': recentData.map(entry => entry.dissolved_oxygen),
            'ammonia-chart': recentData.map(entry => entry.ammonia),
            'humidity-chart': recentData.map(entry => entry.humidity),
            'salinity-chart': recentData.map(entry => entry.salinity)
        };

        // Update each chart
        Object.entries(chartDataMap).forEach(([chartId, data]) => {
            const chart = this.charts[chartId];
            if (chart && data) {
                chart.data.labels = labels;
                chart.data.datasets[0].data = data;
                chart.update('none'); // Skip animation for better performance
            }
        });
    }

    /**
     * Update metric cards
     */
    updateMetricCards(waterData, fishData, plantData, nutrientData) {
        console.log('📊 Updating metric cards');
        
        // Update water quality metrics
        this.updateWaterQualityMetrics(waterData);
        
        // Update fish metrics
        this.updateFishMetrics(fishData);
        
        // Update plant metrics
        this.updatePlantMetrics(plantData);
        
        // Update nutrient metrics
        this.updateNutrientMetrics(nutrientData);
    }

    /**
     * Update water quality metric cards
     */
    updateWaterQualityMetrics(waterData) {
        if (!waterData || !Array.isArray(waterData) || waterData.length === 0) return;
        
        const latest = this.getLatestWaterQualityData(waterData);
        
        const metrics = {
            'temperature-value': { value: latest.water_temperature, unit: '°C' },
            'ph-value': { value: latest.ph, unit: '' },
            'dissolved-oxygen-value': { value: latest.dissolved_oxygen, unit: 'mg/L' },
            'ammonia-value': { value: latest.ammonia, unit: 'mg/L' },
            'humidity-value': { value: latest.humidity, unit: '%' },
            'salinity-value': { value: latest.salinity, unit: 'ppt' }
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
     * Update fish metric cards
     */
    updateFishMetrics(fishData) {
        const totalFish = fishData?.tanks?.reduce((sum, tank) => sum + (tank.fish_count || 0), 0) || 0;
        const totalTanks = fishData?.tanks?.length || 0;
        
        const fishCountElement = document.getElementById('fish-count-value');
        const tankCountElement = document.getElementById('tank-count-value');
        
        if (fishCountElement) fishCountElement.textContent = totalFish.toLocaleString();
        if (tankCountElement) tankCountElement.textContent = totalTanks.toString();
    }

    /**
     * Update plant metric cards
     */
    updatePlantMetrics(plantData) {
        if (!plantData || !Array.isArray(plantData)) return;
        
        const activePlants = plantData.filter(entry => !entry.plants_harvested || entry.plants_harvested === 0);
        const totalHarvested = plantData
            .filter(entry => entry.plants_harvested > 0)
            .reduce((sum, entry) => sum + entry.plants_harvested, 0);
        
        const plantsGrowingElement = document.getElementById('plants-growing-value');
        const totalHarvestedElement = document.getElementById('total-harvested-value');
        
        if (plantsGrowingElement) plantsGrowingElement.textContent = activePlants.length.toString();
        if (totalHarvestedElement) totalHarvestedElement.textContent = totalHarvested.toLocaleString();
    }

    /**
     * Update nutrient metric cards
     */
    updateNutrientMetrics(nutrientData) {
        if (!nutrientData || !Array.isArray(nutrientData)) return;
        
        // Get latest readings for key nutrients
        const latestNutrients = {};
        nutrientData.forEach(entry => {
            if (!latestNutrients[entry.nutrient_type] || 
                new Date(entry.date) > new Date(latestNutrients[entry.nutrient_type].date)) {
                latestNutrients[entry.nutrient_type] = entry;
            }
        });

        const nutrientElements = {
            'ec-value': 'ec',
            'nitrate-value': 'nitrate'
        };

        Object.entries(nutrientElements).forEach(([elementId, nutrientType]) => {
            const element = document.getElementById(elementId);
            const data = latestNutrients[nutrientType];
            
            if (element && data) {
                element.textContent = `${data.value}${data.unit || ''}`;
            } else if (element) {
                element.textContent = 'No data';
            }
        });
    }

    /**
     * Get latest water quality data with fallbacks for null values
     */
    getLatestWaterQualityData(waterData) {
        const latest = {
            water_temperature: null,
            ph: null,
            dissolved_oxygen: null,
            ammonia: null,
            humidity: null,
            salinity: null
        };

        // Find the most recent non-null value for each parameter
        const sortedData = waterData.sort((a, b) => 
            new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
        );

        Object.keys(latest).forEach(param => {
            const entry = sortedData.find(data => 
                data[param] !== null && data[param] !== undefined && data[param] !== ''
            );
            if (entry) {
                latest[param] = entry[param];
            }
        });

        return latest;
    }

    /**
     * Setup refresh interval
     */
    setupRefreshInterval() {
        // Refresh every 5 minutes when dashboard is visible
        this.refreshInterval = setInterval(() => {
            if (this.isVisible) {
                this.refreshData();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Start refresh interval
     */
    startRefreshInterval() {
        if (this.refreshInterval) return; // Already running
        
        this.setupRefreshInterval();
        console.log('⏱️ Dashboard refresh interval started');
    }

    /**
     * Stop refresh interval
     */
    stopRefreshInterval() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ Dashboard refresh interval stopped');
        }
    }

    /**
     * Destroy charts and cleanup
     */
    destroy() {
        console.log('🧹 Destroying dashboard component');
        
        this.stopRefreshInterval();
        
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
        this.isVisible = false;
    }

    /**
     * Get dashboard statistics
     */
    getStats() {
        return {
            chartsInitialized: Object.keys(this.charts).length,
            isVisible: this.isVisible,
            refreshInterval: !!this.refreshInterval,
            activeSystemId: this.app.activeSystemId
        };
    }
}