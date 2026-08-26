// Charts Component - Rebuilt from scratch
// Handles Chart.js visualization initialization and updates

import { domUtils } from '../utils/domReady.js';

/**
 * Charts Component Class - Simple and Clean
 */
export class ChartsComponent {
    constructor(app) {
        console.log('🏗️ ChartsComponent constructor called');
        this.app = app;
        this.charts = {};
        this.initialized = false;

        // Brand colors for different parameters
        this.colors = {
            temperature: '#0051b1',
            ph: '#7BAAEE',
            salinity: '#3379c9',
            nitrate: '#80FB7B',
            phosphorus: '#40b93b',
            potassium: '#a0fc9d',
            calcium: '#95bcf2'
        };

        console.log('📊 Charts Component initialized');
    }

    /**
     * Initialize all charts
     */
    async initializeCharts() {
        console.log('📊 ==========================================');
        console.log('📊 INITIALIZE CHARTS CALLED');
        console.log('📊 Already initialized?', this.initialized);
        console.log('📊 ==========================================');

        if (this.initialized) {
            console.log('📊 Charts already initialized, skipping');
            return;
        }

        try {
            console.log('📊 Step 1: Starting chart initialization...');

            // Wait for Chart.js to be available
            console.log('📊 Step 2: Waiting for Chart.js to load...');
            await domUtils.waitForChartJS(5000);
            console.log('📊 Step 3: Chart.js is available');

            // Destroy any existing charts
            console.log('📊 Step 4: Destroying existing charts...');
            Object.keys(this.charts).forEach(id => {
                if (this.charts[id]) {
                    this.charts[id].destroy();
                }
            });
            this.charts = {};
            console.log('📊 Step 5: Existing charts destroyed');

            // Create charts for each parameter
            console.log('📊 Step 6: Creating 7 charts...');
            this.createChart('temp-chart', 'Temperature (°C)', this.colors.temperature);
            this.createChart('ph-chart', 'pH Level', this.colors.ph);
            this.createChart('salinity-chart', 'Salinity (ppt)', this.colors.salinity);
            this.createChart('nitrate-chart', 'Nitrate (mg/L)', this.colors.nitrate);
            this.createChart('phosphorus-chart', 'Phosphorus (mg/L)', this.colors.phosphorus);
            this.createChart('potassium-chart', 'Potassium (mg/L)', this.colors.potassium);
            this.createChart('calcium-chart', 'Calcium (mg/L)', this.colors.calcium);

            console.log('✅ All charts initialized. Chart count:', Object.keys(this.charts).length);
            console.log('📊 Chart IDs created:', Object.keys(this.charts));
            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize charts:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }

    /**
     * Create a single chart
     */
    createChart(canvasId, label, color) {
        console.log(`📊 ========================================`);
        console.log(`📊 CREATE CHART: ${canvasId}`);
        console.log(`📊 Label: ${label}, Color: ${color}`);

        const canvas = document.getElementById(canvasId);
        console.log(`📊 Canvas element:`, canvas);

        if (!canvas) {
            console.error(`❌ Canvas NOT FOUND: ${canvasId}`);
            console.log(`📊 Available canvas IDs in document:`,
                Array.from(document.querySelectorAll('canvas')).map(c => c.id));
            return;
        }

        console.log(`✅ Canvas FOUND: ${canvasId}`);

        // Check dimensions
        const rect = canvas.getBoundingClientRect();
        console.log(`📐 Canvas ${canvasId} CSS dimensions: ${rect.width}x${rect.height}`);
        console.log(`📐 Canvas ${canvasId} internal dimensions: ${canvas.width}x${canvas.height}`);

        if (rect.width === 0 || rect.height === 0) {
            console.warn(`⚠️ Canvas ${canvasId} has zero CSS dimensions, skipping`);
            return;
        }

        // FIX: Set canvas internal dimensions to match CSS dimensions
        // This is CRITICAL - Chart.js draws on the canvas pixel grid, not CSS size
        canvas.width = Math.floor(rect.width);
        canvas.height = 120;
        console.log(`✅ Set canvas internal dimensions to: ${canvas.width}x${canvas.height}`);

        try {
            // Get 2D context to ensure canvas is ready
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error(`❌ Cannot get 2D context for ${canvasId}`);
                return;
            }

            console.log(`✅ 2D context obtained for ${canvasId}`);

            // Verify Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error(`❌ Chart.js is not loaded!`);
                return;
            }
            console.log(`✅ Chart.js version:`, Chart.version || 'unknown');

            // Create chart with simple configuration
            // IMPORTANT: Pass canvas element, NOT context
            console.log(`🎨 Creating Chart.js instance for ${canvasId}...`);
            console.log(`🎨 Canvas dimensions before Chart.js: ${canvas.width}x${canvas.height}`);

            const chart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: ['1', '2', '3', '4', '5', '6'],
                    datasets: [{
                        label: label,
                        data: [10, 20, 15, 25, 22, 30],
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: color
                    }]
                },
                options: {
                    responsive: false,  // CRITICAL: Disable responsive to prevent dimension reset
                    maintainAspectRatio: false,
                    animation: false,  // Disable animation to see immediately
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#e0e0e0',
                                lineWidth: 1
                            }
                        },
                        x: {
                            grid: {
                                color: '#e0e0e0',
                                lineWidth: 1
                            }
                        }
                    }
                }
            });

            // Force canvas dimensions again after Chart.js creation
            canvas.width = Math.floor(rect.width);
            canvas.height = 120;
            console.log(`🔧 Re-set canvas dimensions after Chart.js: ${canvas.width}x${canvas.height}`);

            // Draw a test rectangle directly on canvas to verify it's working
            const testCtx = canvas.getContext('2d');
            testCtx.fillStyle = '#FF0000';
            testCtx.fillRect(10, 10, 50, 50);
            testCtx.strokeStyle = '#00FF00';
            testCtx.lineWidth = 5;
            testCtx.strokeRect(70, 10, 50, 50);
            console.log(`✅ Drew test shapes: red square at (10,10) and green border square at (70,10)`);

            console.log(`🎨 Chart.js instance created:`, chart);
            console.log(`🎨 Chart has canvas:`, !!chart.canvas);
            console.log(`🎨 Chart has ctx:`, !!chart.ctx);
            console.log(`🎨 Chart data:`, chart.data);

            this.charts[canvasId] = chart;

            // Immediate render attempt
            try {
                chart.update('none');
                console.log(`🔄 Immediate render for ${canvasId}`);
            } catch (e) {
                console.error(`Error in immediate render for ${canvasId}:`, e);
            }

            // Force multiple render attempts at different timings
            setTimeout(() => {
                try {
                    chart.resize();
                    chart.update('active');
                    console.log(`🔄 First delayed render for ${canvasId}`);
                } catch (e) {
                    console.error(`Error in first delayed render for ${canvasId}:`, e);
                }
            }, 50);

            setTimeout(() => {
                try {
                    chart.resize();
                    chart.update('show');
                    console.log(`🔄 Second delayed render for ${canvasId}`);
                } catch (e) {
                    console.error(`Error in second delayed render for ${canvasId}:`, e);
                }
            }, 200);

            setTimeout(() => {
                try {
                    chart.resize();
                    chart.render();
                    console.log(`🔄 Third delayed render for ${canvasId}`);
                } catch (e) {
                    console.error(`Error in third delayed render for ${canvasId}:`, e);
                }
            }, 500);

            console.log(`✅ Chart created: ${canvasId}`);

        } catch (error) {
            console.error(`❌ Error creating chart ${canvasId}:`, error);
        }
    }

    /**
     * Update all charts with real data
     */
    async updateCharts() {
        console.log('📊 ===== UPDATE CHARTS CALLED =====');

        if (!this.initialized) {
            console.warn('📊 Charts not initialized yet');
            return;
        }

        const data = this.app.dataRecords?.waterQuality;
        if (!data || data.length === 0) {
            console.warn('📊 No water quality data available');
            return;
        }

        console.log(`📊 Updating charts with ${data.length} water quality records`);

        // Update temperature chart
        this.updateSingleChart('temp-chart', data, 'temperature');

        // Update pH chart
        this.updateSingleChart('ph-chart', data, 'ph');

        // Update salinity chart
        this.updateSingleChart('salinity-chart', data, 'salinity');

        // Update nitrate chart
        this.updateSingleChart('nitrate-chart', data, 'nitrate');

        // Update phosphorus chart
        this.updateSingleChart('phosphorus-chart', data, 'phosphorus');

        // Update potassium chart
        this.updateSingleChart('potassium-chart', data, 'potassium');

        // Update calcium chart
        this.updateSingleChart('calcium-chart', data, 'calcium');
    }

    /**
     * Update a single chart with data
     */
    updateSingleChart(chartId, allData, paramName) {
        console.log(`📊 ========== UPDATE SINGLE CHART: ${chartId} ==========`);
        console.log(`📊 Param name: ${paramName}`);
        console.log(`📊 Total records received: ${allData?.length || 0}`);

        const chart = this.charts[chartId];
        if (!chart) {
            console.warn(`📊 Chart ${chartId} not found in this.charts`);
            console.log(`📊 Available charts:`, Object.keys(this.charts));
            return;
        }

        console.log(`✅ Chart object found for ${chartId}`);
        console.log(`📊 Chart current data:`, chart.data);

        // Get last 12 non-null values
        const validData = allData
            .filter(item => {
                const value = item[paramName];
                const isValid = value !== null && value !== undefined && !isNaN(value);
                if (!isValid && item[paramName] !== null && item[paramName] !== undefined) {
                    console.log(`⚠️ Filtered out invalid value for ${paramName}:`, item[paramName]);
                }
                return isValid;
            })
            .slice(0, 12)
            .reverse();

        console.log(`📊 Valid data points after filtering: ${validData.length}`);

        if (validData.length === 0) {
            console.log(`📊 No valid data for ${chartId} - keeping placeholder data`);
            return;
        }

        // Extract labels and values
        const labels = validData.map(item => {
            const date = new Date(item.date || item.created_at);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        const values = validData.map(item => parseFloat(item[paramName]));

        console.log(`📊 FULL DATA for ${chartId}:`);
        console.log(`📊 Labels:`, labels);
        console.log(`📊 Values:`, values);
        console.log(`📊 Chart instance:`, chart);
        console.log(`📊 Chart canvas:`, chart.canvas);
        console.log(`📊 Chart ctx:`, chart.ctx);

        // Update chart data
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;

        console.log(`📊 Chart data BEFORE update:`, JSON.stringify(chart.data));
        chart.update('none');  // Force immediate update without animation
        console.log(`📊 Chart data AFTER update:`, JSON.stringify(chart.data));
        console.log(`📊 Chart updated, forcing render...`);

        // Force additional render
        setTimeout(() => {
            chart.render();
            console.log(`🔄 Forced additional render for ${chartId}`);
        }, 100);

        console.log(`✅ Updated ${chartId} complete`);
        console.log(`📊 ========================================`);
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(id => {
            if (this.charts[id]) {
                this.charts[id].destroy();
            }
        });
        this.charts = {};
        this.initialized = false;
    }
}

export default ChartsComponent;

export function createChartsComponent(app) {
    return new ChartsComponent(app);
}
