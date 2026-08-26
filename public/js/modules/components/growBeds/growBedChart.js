// Grow Bed Chart Component
// Handles grow bed visualization and charts

/**
 * Grow Bed Chart Component
 * Manages charts and visualizations for grow bed data
 */
export default class GrowBedChart {
    constructor(growBedService) {
        this.growBedService = growBedService;
        this.charts = {};
    }

    /**
     * Initialize grow bed chart component
     */
    initialize() {
    }

    /**
     * Sanitize chart data to prevent NaN/Infinity SVG errors
     * @param {Object} config - Chart.js configuration object
     * @returns {Object} - Sanitized configuration
     */
    sanitizeChartConfig(config) {
        if (!config || !config.data) return config;
        
        // Sanitize datasets
        if (config.data.datasets) {
            config.data.datasets.forEach(dataset => {
                if (dataset.data) {
                    const originalLength = dataset.data.length;
                    dataset.data = dataset.data.map(value => {
                        if (value === null || value === undefined) return 0;
                        const num = Number(value);
                        if (!isFinite(num) || isNaN(num)) return 0;
                        return num;
                    });
                    
                    // Log if data was sanitized
                    const sanitizedCount = dataset.data.filter(val => val === 0).length;
                    if (sanitizedCount > 0) {
                        console.warn(`📊 GrowBed Chart sanitizer: Cleaned ${sanitizedCount}/${originalLength} invalid data points`);
                    }
                }
            });
        }
        
        return config;
    }

    /**
     * Create bed utilization chart
     */
    createUtilizationChart(containerId, bedsData) {
        const canvas = document.getElementById(containerId);
        if (!canvas || !window.Chart) {
            console.warn('⚠️ Chart.js not available or container not found:', containerId);
            return;
        }

        // Check if canvas has valid dimensions before creating chart
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            if (window.location.search.includes('debug=chart')) {
                console.warn(`⚠️ Canvas ${containerId} has zero dimensions (${rect.width}x${rect.height}), skipping chart creation`);
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[containerId]) {
            this.charts[containerId].destroy();
        }

        const chartData = this.prepareUtilizationData(bedsData);

        // Create chart configuration
        const chartConfig = {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Grow Bed Utilization',
                        color: '#2c3e50',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#666',
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value.toFixed(1)} m² (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        // Sanitize chart configuration before creating Chart.js instance
        const sanitizedConfig = this.sanitizeChartConfig(chartConfig);
        
        // Create Chart.js instance with sanitized data
        this.charts[containerId] = new Chart(ctx, sanitizedConfig);

        return this.charts[containerId];
    }

    /**
     * Prepare utilization chart data
     */
    prepareUtilizationData(bedsData) {
        console.log('🌱 GrowBedChart: Preparing utilization data with beds:', bedsData);
        
        if (!bedsData || bedsData.length === 0) {
            console.log('🌱 GrowBedChart: No beds data, returning default');
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0'],
                    borderWidth: 0
                }]
            };
        }

        // Group beds by type
        const typeGroups = bedsData.reduce((groups, bed) => {
            const type = bed.bed_type || 'unknown';
            if (!groups[type]) {
                groups[type] = { count: 0, area: 0 };
            }
            groups[type].count += 1;
            const area = parseFloat(bed.area_m2) || 0;
            // Validate area is a finite number
            if (!isFinite(area) || isNaN(area)) {
                console.warn('🌱 GrowBedChart: Invalid area for bed:', bed, 'using 0');
                groups[type].area += 0;
            } else {
                groups[type].area += area;
            }
            return groups;
        }, {});

        const labels = [];
        const data = [];
        const colors = this.getBedTypeColors();

        Object.entries(typeGroups).forEach(([type, info]) => {
            const displayName = this.getBedTypeDisplay(type);
            labels.push(`${displayName} (${info.count})`);
            // Ensure area is finite and valid
            const validArea = isFinite(info.area) && !isNaN(info.area) ? info.area : 0;
            data.push(validArea);
        });

        console.log('🌱 GrowBedChart: Utilization chart data:', { labels, data });

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: Object.keys(typeGroups).map(type => colors[type] || '#95a5a6'),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        };
    }

    /**
     * Create volume distribution chart
     */
    createVolumeChart(containerId, bedsData) {
        const canvas = document.getElementById(containerId);
        if (!canvas || !window.Chart) return;

        // Check if canvas has valid dimensions before creating chart
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            if (window.location.search.includes('debug=chart')) {
                console.warn(`⚠️ Canvas ${containerId} has zero dimensions (${rect.width}x${rect.height}), skipping chart creation`);
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        
        if (this.charts[containerId]) {
            this.charts[containerId].destroy();
        }

        const chartData = this.prepareVolumeData(bedsData);

        // Create chart configuration
        const chartConfig = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Reservoir Volume by Bed',
                        color: '#2c3e50',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Volume: ${context.parsed.y.toFixed(1)} m³ (${(context.parsed.y * 1000).toFixed(0)}L)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Volume (m³)',
                            color: '#666'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return value.toFixed(1) + ' m³';
                            }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Grow Beds',
                            color: '#666'
                        },
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    }
                }
            }
        };

        // Sanitize chart configuration before creating Chart.js instance
        const sanitizedConfig = this.sanitizeChartConfig(chartConfig);
        
        // Create Chart.js instance with sanitized data
        this.charts[containerId] = new Chart(ctx, sanitizedConfig);

        return this.charts[containerId];
    }

    /**
     * Prepare volume chart data
     */
    prepareVolumeData(bedsData) {
        console.log('🌱 GrowBedChart: Preparing volume data with beds:', bedsData);
        
        if (!bedsData || bedsData.length === 0) {
            console.log('🌱 GrowBedChart: No beds data for volume chart');
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [0],
                    backgroundColor: ['#e0e0e0']
                }]
            };
        }

        const labels = bedsData.map(bed => bed.bed_name || `Bed ${bed.bed_number}`);
        const volumes = bedsData.map(bed => {
            const volumeLiters = parseFloat(bed.volume_liters) || 0;
            const volumeM3 = volumeLiters / 1000; // Convert to m³
            // Validate the result is finite
            if (!isFinite(volumeM3) || isNaN(volumeM3)) {
                console.warn('🌱 GrowBedChart: Invalid volume for bed:', bed, 'using 0');
                return 0;
            }
            return volumeM3;
        });
        const colors = bedsData.map(bed => this.getBedTypeColors()[bed.bed_type] || '#95a5a6');

        console.log('🌱 GrowBedChart: Volume chart data:', { labels, volumes });

        return {
            labels,
            datasets: [{
                label: 'Volume (m³)',
                data: volumes,
                backgroundColor: colors,
                borderColor: colors.map(color => this.darkenColor(color)),
                borderWidth: 1
            }]
        };
    }

    /**
     * Create capacity chart
     */
    createCapacityChart(containerId, bedsData) {
        const canvas = document.getElementById(containerId);
        if (!canvas || !window.Chart) return;

        // Check if canvas has valid dimensions before creating chart
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            if (window.location.search.includes('debug=chart')) {
                console.warn(`⚠️ Canvas ${containerId} has zero dimensions (${rect.width}x${rect.height}), skipping chart creation`);
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        
        if (this.charts[containerId]) {
            this.charts[containerId].destroy();
        }

        // Filter beds that have plant capacity data
        const bedsWithCapacity = bedsData.filter(bed => bed.plant_capacity && bed.plant_capacity > 0);
        
        if (bedsWithCapacity.length === 0) {
            this.renderNoCapacityData(canvas);
            return;
        }

        const chartData = this.prepareCapacityData(bedsWithCapacity);

        // Create chart configuration
        const chartConfig = {
            type: 'bar', // Changed from 'horizontalBar' for Chart.js v3 compatibility
            data: chartData,
            options: {
                indexAxis: 'y', // Makes the bar chart horizontal in Chart.js v3
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Plant Capacity by Bed',
                        color: '#2c3e50',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Plant Capacity',
                            color: '#666'
                        },
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    }
                }
            }
        };

        // Sanitize chart configuration before creating Chart.js instance
        const sanitizedConfig = this.sanitizeChartConfig(chartConfig);
        
        // Create Chart.js instance with sanitized data
        this.charts[containerId] = new Chart(ctx, sanitizedConfig);

        return this.charts[containerId];
    }

    /**
     * Prepare capacity chart data
     */
    prepareCapacityData(bedsData) {
        console.log('🌱 GrowBedChart: Preparing capacity data with beds:', bedsData);
        
        const labels = bedsData.map(bed => bed.bed_name || `Bed ${bed.bed_number}`);
        const capacities = bedsData.map(bed => {
            const capacity = parseFloat(bed.plant_capacity) || 0;
            // Validate capacity is finite
            if (!isFinite(capacity) || isNaN(capacity)) {
                console.warn('🌱 GrowBedChart: Invalid capacity for bed:', bed, 'using 0');
                return 0;
            }
            return capacity;
        });
        const colors = bedsData.map(bed => this.getBedTypeColors()[bed.bed_type] || '#95a5a6');

        console.log('🌱 GrowBedChart: Capacity chart data:', { labels, capacities });

        return {
            labels,
            datasets: [{
                label: 'Plant Capacity',
                data: capacities,
                backgroundColor: colors,
                borderColor: colors.map(color => this.darkenColor(color)),
                borderWidth: 1
            }]
        };
    }

    /**
     * Render no capacity data message
     */
    renderNoCapacityData(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No plant capacity data available', canvas.width / 2, canvas.height / 2);
    }

    /**
     * Get bed type display names
     */
    getBedTypeDisplay(bedType) {
        const typeMap = {
            'dwc': 'Deep Water Culture',
            'flood-drain': 'Flood & Drain',
            'media-flow': 'Media Flow',
            'nft': 'NFT',
            'vertical': 'Vertical'
        };
        return typeMap[bedType] || bedType;
    }

    /**
     * Get bed type colors
     */
    getBedTypeColors() {
        return {
            'dwc': '#0051b1',        // Deep blue
            'flood-drain': '#7BAAEE', // Blue fish
            'media-flow': '#8DFBCC',  // Aqua green
            'nft': '#80FB7B',         // Bio green
            'vertical': '#95bcf2',    // Light blue
            'unknown': '#95a5a6'      // Gray
        };
    }

    /**
     * Darken a color for borders
     */
    darkenColor(color) {
        console.log('🌱 GrowBedChart: Darkening color:', color);
        
        // Validate input color
        if (!color || typeof color !== 'string') {
            console.warn('🌱 GrowBedChart: Invalid color input, using default:', color);
            return '#000000';
        }
        
        // Simple color darkening - convert hex to rgb, darken, convert back
        const hex = color.replace('#', '');
        
        // Ensure hex string is valid length
        if (hex.length !== 6) {
            console.warn('🌱 GrowBedChart: Invalid hex color format, using default:', color);
            return '#000000';
        }
        
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
        
        // Validate parsed RGB values
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            console.warn('🌱 GrowBedChart: Failed to parse color components, using default:', { color, hex, r, g, b });
            return '#000000';
        }
        
        const darkenedColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        console.log('🌱 GrowBedChart: Darkened color result:', darkenedColor);
        return darkenedColor;
    }

    /**
     * Update chart with new data
     */
    updateChart(containerId, bedsData) {
        const chart = this.charts[containerId];
        if (!chart) return;

        // Check if canvas has valid dimensions before updating
        const canvas = document.getElementById(containerId);
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                if (window.location.search.includes('debug=chart')) {
                    console.warn(`⚠️ Canvas ${containerId} has zero dimensions (${rect.width}x${rect.height}), skipping chart update`);
                }
                return;
            }
        }

        // Update data based on chart type
        if (chart.config.type === 'doughnut') {
            const newData = this.prepareUtilizationData(bedsData);
            chart.data = newData;
        } else if (chart.config.type === 'bar') {
            const newData = this.prepareVolumeData(bedsData);
            chart.data = newData;
        } else if (chart.config.type === 'bar' && chart.config.options.indexAxis === 'y') {
            const bedsWithCapacity = bedsData.filter(bed => bed.plant_capacity && bed.plant_capacity > 0);
            const newData = this.prepareCapacityData(bedsWithCapacity);
            chart.data = newData;
        }

        chart.update('none'); // Update without animation for better performance
    }

    /**
     * Destroy all charts
     */
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    /**
     * Refresh charts for system
     */
    async refreshChartsForSystem(systemId) {
        try {
            const bedsData = await this.growBedService.getGrowBedsForSystem(systemId);
            
            // Update all active charts
            Object.keys(this.charts).forEach(containerId => {
                this.updateChart(containerId, bedsData);
            });

        } catch (error) {
            console.error('❌ Failed to refresh grow bed charts:', error);
        }
    }

    /**
     * Get chart statistics
     */
    getChartStats() {
        return {
            activeCharts: Object.keys(this.charts).length,
            chartTypes: Object.values(this.charts).map(chart => chart.config.type),
            charts: this.charts
        };
    }
}