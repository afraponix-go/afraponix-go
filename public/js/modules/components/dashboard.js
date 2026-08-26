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
        console.log('📊 Dashboard charts disabled - using MetricsChartManager instead');
        // Chart initialization disabled to prevent NaN/Infinity errors
        // All charts now handled by MetricsChartManager in Metrics tab only
        return;
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
            'temp-chart': {
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
            'oxygen-chart': {
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
            const [allReadingsData, fishData, plantData] = await Promise.all([
                this.app.makeApiCall(`/data/water-quality/${this.app.activeSystemId}?limit=50`).catch(() => []), // Get water quality data with nutrients
                this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`).catch(() => ({ tanks: [] })),
                this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`).catch(() => [])
            ]);

            // Update charts
            this.updateCharts(allReadingsData);

            // Update metric cards
            this.updateMetricCards(allReadingsData, fishData, plantData);

            console.log('✅ Dashboard data refreshed');

        } catch (error) {
            console.error('❌ Failed to refresh dashboard data:', error);
        }
    }

    /**
     * Update all charts with new data from water_quality table
     */
    updateCharts(allReadingsData) {
        // Skip if no charts exist (might be called before initialization)
        if (Object.keys(this.charts).length === 0) {
            console.log('📊 Skipping chart update - charts not initialized');
            return;
        }

        if (!allReadingsData || !Array.isArray(allReadingsData) || allReadingsData.length === 0) {
            console.log('📊 No readings data available for charts');
            return;
        }

        console.log('📊 Updating dashboard charts with', allReadingsData.length, 'total readings');

        // Process data by parameter type - from water_quality table
        const processParameterData = (parameterType) => {
            const labels = [];
            const values = [];

            // Water quality table has direct columns, not nutrient_type/value structure
            allReadingsData.forEach(item => {
                if (!item) return;

                const value = item[parameterType];
                if (value === null || value === undefined || value === '') return;

                const parsedValue = parseFloat(value);
                // Validate parsed value is finite and not NaN
                if (isFinite(parsedValue) && !isNaN(parsedValue)) {
                    const date = new Date(item.date || item.created_at);
                    labels.push(date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    values.push(parsedValue);
                } else {
                    console.warn('📊 Dashboard: Filtered out invalid value for', parameterType, ':', value);
                }
            });

            console.log('📊 Dashboard: Processed', parameterType, 'data points:', values.length, 'values:', values.slice(0, 3));

            return { labels, values };
        };

        // All chart mappings - using actual HTML canvas IDs
        const allChartTypes = {
            // Water quality parameters (using actual HTML IDs)
            'temp-chart': 'temperature',
            'ph-chart': 'ph', 
            'oxygen-chart': 'dissolved_oxygen',
            'ammonia-chart': 'ammonia',
            'humidity-chart': 'humidity',
            'salinity-chart': 'salinity',
            // Nutrient parameters
            'ec-chart': 'ec',
            'nitrate-chart': 'nitrate', 
            'nitrite-chart': 'nitrite',
            'phosphorus-chart': 'phosphorus',
            'potassium-chart': 'potassium',
            'calcium-chart': 'calcium',
            'magnesium-chart': 'magnesium',
            'iron-chart': 'iron'
        };

        // Update all charts
        Object.entries(allChartTypes).forEach(([chartId, parameterType]) => {
            const chart = this.charts[chartId];
            if (chart) {
                const chartData = processParameterData(parameterType);
                console.log(`📊 Chart ${chartId} (${parameterType}): ${chartData.values.length} data points`);
                
                if (chartData.values.length > 0) {
                    chart.data.labels = chartData.labels;
                    chart.data.datasets[0].data = chartData.values;
                    chart.update('none'); // Skip animation for better performance
                } else {
                    console.log(`⚠️ No data found for ${parameterType}`);
                }
            }
        });
    }

    /**
     * Update metric cards
     */
    updateMetricCards(allReadingsData, fishData, plantData) {
        console.log('📊 Updating metric cards');
        
        // Update water quality metrics from readings data
        this.updateWaterQualityMetrics(allReadingsData);
        
        // Update fish metrics
        this.updateFishMetrics(fishData);
        
        // Update plant metrics
        this.updatePlantMetrics(plantData);
        
        // Update nutrient metrics from readings data
        this.updateNutrientMetrics(allReadingsData);
    }

    /**
     * Update water quality metric cards
     */
    updateWaterQualityMetrics(allReadingsData) {
        if (!allReadingsData || !Array.isArray(allReadingsData) || allReadingsData.length === 0) return;

        // Get latest record from water_quality table (already sorted by date DESC from API)
        const latestRecord = allReadingsData[0];
        if (!latestRecord) return;

        const metrics = {
            'temperature-value': { value: latestRecord.temperature, unit: '°C' },
            'ph-value': { value: latestRecord.ph, unit: '' },
            'dissolved-oxygen-value': { value: latestRecord.dissolved_oxygen, unit: 'mg/L' },
            'ammonia-value': { value: latestRecord.ammonia, unit: 'mg/L' },
            'humidity-value': { value: latestRecord.humidity, unit: '%' },
            'salinity-value': { value: latestRecord.salinity, unit: 'ppt' }
        };

        Object.entries(metrics).forEach(([id, metric]) => {
            const element = document.getElementById(id);
            if (element && metric.value !== null && metric.value !== undefined) {
                element.textContent = `${metric.value}${metric.unit}`;
            } else if (element) {
                element.textContent = 'N/A';
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
    updateNutrientMetrics(allReadingsData) {
        if (!allReadingsData || !Array.isArray(allReadingsData) || allReadingsData.length === 0) return;

        // Get latest record from water_quality table
        const latestRecord = allReadingsData[0];
        if (!latestRecord) return;

        const nutrientElements = {
            'ec-value': { value: latestRecord.ec, unit: ' μS/cm' },
            'nitrate-value': { value: latestRecord.nitrate, unit: ' mg/L' }
        };

        Object.entries(nutrientElements).forEach(([elementId, nutrient]) => {
            const element = document.getElementById(elementId);

            if (element && nutrient.value !== null && nutrient.value !== undefined) {
                element.textContent = `${nutrient.value}${nutrient.unit}`;
            } else if (element) {
                element.textContent = 'N/A';
            }
        });
    }

    /**
     * Get latest water quality data with fallbacks for null values
     */
    getLatestWaterQualityData(waterData) {
        const latest = {
            temperature: null,
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