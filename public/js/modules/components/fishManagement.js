// Fish Management Component
// Handles fish tank displays, summaries, and fish-related UI rendering

import { API_ENDPOINTS, MAGIC_NUMBERS } from '../constants/index.js';

/**
 * Fish Management Component Class
 * Manages fish tank summaries, displays, and related UI interactions
 */
export class FishManagementComponent {
    constructor(app) {
        this.app = app;
        this.charts = new Map();
        
        console.log('🐟 Fish Management Component initialized');
    }

    /**
     * Update fish tank summary display with metrics and tank details
     */
    async updateFishTankSummary() {
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        const systemConfig = this.app.loadSystemConfig();
        
        // Load individual fish tank configurations
        if (this.app.activeSystemId) {
            try {
                const response = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
                systemConfig.fish_tanks = response.tanks || [];
            } catch (error) {
                console.error('Failed to load fish tank configurations:', error);
                systemConfig.fish_tanks = [];
            }
        }
        
        // Calculate actual tank count based on configured tanks
        const tankConfigs = systemConfig.fish_tanks || [];
        
        // If no tank configs loaded, create mock tanks based on system configuration
        if (tankConfigs.length === 0 && systemConfig.fish_tank_count > 0) {
            const totalVolume = systemConfig.total_fish_volume || 7000; // Default 7000L for 7 tanks
            const volumePerTank = Math.floor(totalVolume / systemConfig.fish_tank_count);
            
            for (let i = 1; i <= systemConfig.fish_tank_count; i++) {
                tankConfigs.push({
                    id: i,
                    tank_number: i,
                    volume_liters: volumePerTank,
                    size_m3: volumePerTank / 1000,
                    fish_type: systemConfig.fish_type || 'tilapia',
                    system_id: this.app.activeSystemId
                });
            }
            systemConfig.fish_tanks = tankConfigs;
        }
        
        const actualTankCount = Math.max(tankConfigs.length, systemConfig.fish_tank_count || 1);

        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            container.innerHTML = `
                <div class="no-system-message">
                    <p>Please select a system to view fish tank information.</p>
                </div>
            `;
            return;
        }

        // Load fish inventory and health data
        const fishData = await this.loadFishData();
        
        // Get fish type for calculations
        const fishType = systemConfig.fish_type || 'Unknown';
        
        // Calculate volumes and metrics
        const metrics = this.calculateFishMetrics(tankConfigs, fishData, fishType, systemConfig);
        
        // Render the fish tank summary
        container.innerHTML = this.renderFishTankSummary(
            metrics, 
            fishData, 
            actualTankCount, 
            systemConfig, 
            fishData.inventoryTanks
        );
        
        // Initialize fish density chart if fish are present
        if (metrics.totalFish > 0) {
            setTimeout(() => this.initializeFishDensityChart().catch(console.error), 100);
        }
    }

    /**
     * Load fish data from inventory and health APIs
     */
    async loadFishData() {
        let totalFish = 0;
        let totalBiomassKg = 0;
        let averageWeight = 0;
        let inventoryTanks = [];
        
        try {
            // Try fish inventory API first
            const fishInventoryData = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);

            if (fishInventoryData && fishInventoryData.tanks) {
                inventoryTanks = fishInventoryData.tanks;
                totalFish = inventoryTanks.reduce((sum, tank) => {
                    const count = parseInt(tank.current_count) || 0;
                    return sum + (isNaN(count) ? 0 : count);
                }, 0);
                totalBiomassKg = inventoryTanks.reduce((sum, tank) => {
                    const biomass = parseFloat(tank.biomass_kg) || 0;
                    return sum + (isNaN(biomass) ? 0 : biomass);
                }, 0);
                
                // Calculate weighted average weight
                if (totalFish > 0) {
                    const totalWeight = inventoryTanks.reduce((sum, tank) => {
                        const count = parseInt(tank.current_count) || 0;
                        const weight = parseFloat(tank.average_weight) || 0;
                        return sum + ((isNaN(count) ? 0 : count) * (isNaN(weight) ? 0 : weight));
                    }, 0);
                    averageWeight = isNaN(totalWeight) || totalFish === 0 ? 0 : totalWeight / totalFish;
                }
            }
        } catch (error) {
            console.error('Failed to fetch fish inventory data:', error);
        }
        
        // If no inventory data, use fish health data as fallback
        if (totalFish === 0 && totalBiomassKg === 0) {
            try {
                const fishHealthData = this.app.dataRecords?.fishHealth || [];
                const latestHealthEntry = fishHealthData.find(entry => 
                    entry.count > 0 && entry.average_weight > 0
                );
                
                if (latestHealthEntry) {
                    totalFish = latestHealthEntry.count;
                    averageWeight = latestHealthEntry.average_weight;
                    totalBiomassKg = (totalFish * averageWeight) / 1000; // Convert to kg
                }
            } catch (error) {
                console.error('Failed to use fish health fallback:', error);
            }
        }

        return {
            totalFish,
            totalBiomassKg,
            averageWeight,
            inventoryTanks
        };
    }

    /**
     * Calculate fish metrics and densities
     */
    calculateFishMetrics(tankConfigs, fishData, fishType, systemConfig) {
        const { totalFish, totalBiomassKg, averageWeight } = fishData;
        
        // Calculate actual total volume from tank configurations
        let fishVolume = 0;
        if (tankConfigs.length > 0) {
            fishVolume = tankConfigs.reduce((total, tank) => total + (parseFloat(tank.volume_liters) || 0), 0);
        } else {
            fishVolume = systemConfig.total_fish_volume || 1000;
        }
        const fishVolumeM3 = fishVolume / 1000; // Convert liters to cubic meters
        
        // Use inventory biomass if available, otherwise estimate
        let totalWeightKg = totalBiomassKg;
        let effectiveWeight = averageWeight;
        
        if (totalWeightKg === 0 && totalFish > 0) {
            // Use estimated weight if no actual weight data is available
            const estimatedWeights = {
                'tilapia': 250,  // 250g average for growing tilapia
                'trout': 200,    // 200g average for growing trout  
                'catfish': 300,  // 300g average for growing catfish
                'salmon': 350,   // 350g average for growing salmon
                'bass': 250      // 250g average for growing bass
            };
            effectiveWeight = estimatedWeights[fishType.toLowerCase()] || 250;
            totalWeightKg = (totalFish * effectiveWeight) / 1000; // Convert grams to kg
        }
        
        // Add safety checks for NaN values
        const safeWeightKg = isNaN(totalWeightKg) || !isFinite(totalWeightKg) ? 0 : totalWeightKg;
        const safeVolumeM3 = isNaN(fishVolumeM3) || !isFinite(fishVolumeM3) ? 1 : fishVolumeM3; // Default 1m³ to avoid division by zero
        
        // Current actual density and final harvest density
        const actualDensity = safeVolumeM3 > 0 ? (safeWeightKg / safeVolumeM3).toFixed(1) : 'N/A';
        const isUsingEstimatedWeight = totalBiomassKg === 0 && effectiveWeight > 0;
        const finalHarvestWeight = this.getFinalHarvestWeight(fishType);
        const finalTotalWeight = (totalFish * finalHarvestWeight) / 1000; // Convert to kg
        const finalDensity = fishVolumeM3 > 0 ? (finalTotalWeight / fishVolumeM3).toFixed(1) : 'N/A';
        
        // Calculate recommended stocking density based on fish type
        const recommendedMaxDensity = this.getRecommendedStockingDensity(fishType);
        const densityStatus = actualDensity !== 'N/A' && actualDensity > recommendedMaxDensity ? 'warning' : 'good';

        return {
            totalFish,
            totalWeightKg: safeWeightKg,
            fishVolumeM3: safeVolumeM3,
            actualDensity,
            finalDensity,
            recommendedMaxDensity,
            densityStatus,
            isUsingEstimatedWeight
        };
    }

    /**
     * Render the fish tank summary HTML
     */
    renderFishTankSummary(metrics, fishData, actualTankCount, systemConfig, inventoryTanks) {
        const lastFeedTime = this.getLastFeedingTime();
        const feedConsumption = this.getCurrentMonthFeedConsumption();

        return `
            <div class="charts-grid">
                <div class="chart-card metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish" class="metric-icon-svg"></div>
                    <div class="metric-value">${metrics.totalFish}</div>
                    <div class="metric-label">Total Fish Count</div>
                    <div class="summary-detail">Across ${actualTankCount} tank${actualTankCount > 1 ? 's' : ''}</div>
                </div>
                
                <div class="chart-card metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_parameters.svg" alt="Density" class="metric-icon-svg"></div>
                    <div class="metric-value">${metrics.actualDensity} kg/m³</div>
                    <div class="metric-label">Current Density</div>
                    <div class="density-progress-container">
                        <div class="density-progress-bar">
                            <div class="density-progress-fill ${metrics.densityStatus}" style="width: ${Math.min((metrics.actualDensity !== 'N/A' ? (parseFloat(metrics.actualDensity) / metrics.recommendedMaxDensity) * 100 : 0), 100)}%"></div>
                        </div>
                        <div class="density-progress-label">Max: ${metrics.recommendedMaxDensity} kg/m³</div>
                    </div>
                </div>
                
                <div class="chart-card metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_data.svg" alt="Feed Consumption" class="metric-icon-svg"></div>
                    <div class="metric-value">${feedConsumption.current}</div>
                    <div class="metric-label">Feed This Month</div>
                    <div class="summary-detail">${feedConsumption.comparison}</div>
                </div>
                
                <div class="chart-card metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_feed.svg" alt="Feed" class="metric-icon-svg"></div>
                    <div class="metric-value">${lastFeedTime}</div>
                    <div class="metric-label">Last Fed</div>
                    <div class="summary-detail">Feed regularly for optimal health</div>
                </div>
            </div>
            
            ${metrics.totalFish > 0 ? `
                <div class="tank-details">
                    <h4>Tank Details</h4>
                    <div class="tank-details-grid">
                        ${this.generateTankDetails(systemConfig, inventoryTanks, actualTankCount)}
                    </div>
                </div>
                
                <div class="fish-density-chart-section">
                    <h4>Fish Density Over Time</h4>
                    <canvas id="fish-density-chart" width="400" height="200"></canvas>
                </div>
                
            ` : ''}
            
            ${false ? `
                <div class="mortality-alert">
                    <strong>⚠️ Recent Mortality:</strong> mortality data from fish events coming soon
                </div>
            ` : ''}
        `;
    }

    /**
     * Generate tank details HTML
     */
    generateTankDetails(systemConfig, inventoryTanks, actualTankCount) {
        const tankConfigs = systemConfig.fish_tanks || [];
        let html = '';

        // Show tanks based on configuration with inventory data overlay
        for (let i = 1; i <= actualTankCount; i++) {
            const tankConfig = tankConfigs.find(t => t.tank_number === i) || {
                tank_number: i,
                volume_liters: Math.floor((systemConfig.total_fish_volume || 1000) / actualTankCount),
                fish_type: systemConfig.fish_type || 'tilapia'
            };

            // Find corresponding inventory data
            const inventoryData = inventoryTanks.find(inv => parseInt(inv.tank_number) === i);
            
            const fishCount = inventoryData ? (parseInt(inventoryData.current_count) || 0) : 0;
            const averageWeight = inventoryData ? (parseFloat(inventoryData.average_weight) || 0) : 0;
            const biomassKg = inventoryData ? (parseFloat(inventoryData.biomass_kg) || 0) : 0;
            
            const tankVolumeM3 = (parseFloat(tankConfig.volume_liters) || 1000) / 1000;
            const tankDensity = tankVolumeM3 > 0 && biomassKg > 0 ? (biomassKg / tankVolumeM3).toFixed(1) : '0.0';

            html += `
                <div class="tank-detail-card">
                    <div class="tank-header">
                        <h5>Tank ${i}</h5>
                        <span class="tank-volume">${(parseFloat(tankConfig.volume_liters) || 1000).toLocaleString()}L</span>
                    </div>
                    <div class="tank-metrics">
                        <div class="tank-metric">
                            <span class="metric-label">Fish Count</span>
                            <span class="metric-value">${fishCount}</span>
                        </div>
                        <div class="tank-metric">
                            <span class="metric-label">Avg Weight</span>
                            <span class="metric-value">${averageWeight}g</span>
                        </div>
                        <div class="tank-metric">
                            <span class="metric-label">Density</span>
                            <span class="metric-value">${tankDensity} kg/m³</span>
                        </div>
                    </div>
                    <div class="tank-fish-type">${tankConfig.fish_type || 'Unknown'}</div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Get final harvest weight based on fish type
     */
    getFinalHarvestWeight(fishType) {
        const harvestWeights = {
            'tilapia': 500,   // 500g at harvest
            'trout': 400,     // 400g at harvest
            'catfish': 600,   // 600g at harvest  
            'salmon': 800,    // 800g at harvest
            'bass': 500       // 500g at harvest
        };
        return harvestWeights[fishType.toLowerCase()] || 500;
    }

    /**
     * Get recommended stocking density based on fish type
     */
    getRecommendedStockingDensity(fishType) {
        if (!fishType || typeof fishType !== 'string') {
            console.warn('Invalid fish type provided to getRecommendedStockingDensity:', fishType);
            return 20; // Default fallback density
        }
        
        const densities = {
            'tilapia': 20,    // 20 kg/m³ max density
            'trout': 15,      // 15 kg/m³ max density (need more oxygen)
            'catfish': 25,    // 25 kg/m³ max density (hardy species)
            'salmon': 12,     // 12 kg/m³ max density (need cold, oxygenated water)
            'bass': 18        // 18 kg/m³ max density
        };
        return densities[fishType.toLowerCase()] || 20;
    }

    /**
     * Get last feeding time
     */
    getLastFeedingTime() {
        try {
            const fishHealthData = this.app.dataRecords?.fishHealth || [];
            if (fishHealthData.length === 0) return 'No data';
            
            // Sort by date descending and find most recent feeding entry
            const sortedEntries = fishHealthData.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastFeedEntry = sortedEntries.find(entry => entry.feeding_amount_grams > 0);
            
            if (!lastFeedEntry) return 'No feeds recorded';
            
            const feedDate = new Date(lastFeedEntry.date);
            const now = new Date();
            const diffMs = now - feedDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffDays === 0) {
                return diffHours === 0 ? 'Just now' : `${diffHours}h ago`;
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays <= 7) {
                return `${diffDays} days ago`;
            } else {
                return this.app.formatDateDDMMYYYY(feedDate);
            }
        } catch (error) {
            console.error('Error getting last feeding time:', error);
            return 'Error loading';
        }
    }

    /**
     * Get current month feed consumption
     */
    getCurrentMonthFeedConsumption() {
        try {
            const fishHealthData = this.app.dataRecords?.fishHealth || [];
            if (fishHealthData.length === 0) {
                return { current: '0g', comparison: 'No feeding data' };
            }
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Filter entries for current month
            const thisMonthEntries = fishHealthData.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getMonth() === currentMonth && 
                       entryDate.getFullYear() === currentYear &&
                       entry.feeding_amount_grams > 0;
            });
            
            const thisMonthTotal = thisMonthEntries.reduce((sum, entry) => {
                return sum + (parseFloat(entry.feeding_amount_grams) || 0);
            }, 0);
            
            // Get previous month for comparison
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            const lastMonthEntries = fishHealthData.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getMonth() === prevMonth && 
                       entryDate.getFullYear() === prevYear &&
                       entry.feeding_amount_grams > 0;
            });
            
            const lastMonthTotal = lastMonthEntries.reduce((sum, entry) => {
                return sum + (parseFloat(entry.feeding_amount_grams) || 0);
            }, 0);
            
            // Format the current month total
            const currentFormatted = thisMonthTotal >= 1000 ? 
                `${(thisMonthTotal / 1000).toFixed(1)}kg` : 
                `${Math.round(thisMonthTotal)}g`;
            
            // Calculate comparison
            let comparison = '';
            if (lastMonthTotal === 0) {
                comparison = 'First month tracking';
            } else {
                const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
                const changeSymbol = percentChange > 0 ? '↑' : percentChange < 0 ? '↓' : '→';
                comparison = `${changeSymbol} ${Math.abs(percentChange).toFixed(0)}% vs last month`;
            }
            
            return {
                current: currentFormatted,
                comparison: comparison
            };
        } catch (error) {
            console.error('Error calculating feed consumption:', error);
            return { current: 'Error', comparison: 'Error loading data' };
        }
    }

    /**
     * Initialize fish density chart
     */
    async initializeFishDensityChart() {
        console.log('🐟 Fish density charts disabled - using MetricsChartManager instead');
        // Chart initialization disabled to prevent NaN/Infinity errors
        return;

        const canvas = document.getElementById('fish-density-chart');
        if (!canvas) {
            console.warn('⚠️ Fish density chart canvas not found');
            return;
        }

        // Check if canvas has valid dimensions before creating chart
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            if (window.location.search.includes('debug=chart')) {
                console.warn(`⚠️ Canvas fish-density-chart has zero dimensions (${rect.width}x${rect.height}), skipping chart creation`);
            }
            return;
        }

        try {
            // Destroy existing chart if it exists
            if (this.charts.has('fishDensity')) {
                this.charts.get('fishDensity').destroy();
                this.charts.delete('fishDensity');
            }

            // Load fish inventory data for chart
            const inventoryResponse = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
            let chartData = [];
            
            if (inventoryResponse?.tanks?.length > 0) {
                // Use fish inventory data (primary source)
                const tanks = inventoryResponse.tanks;
                const totalVolume = tanks.reduce((sum, tank) => sum + (parseFloat(tank.volume_liters) || 0), 0) / 1000; // Convert to m³
                
                if (totalVolume > 0) {
                    tanks.forEach(tank => {
                        const biomassKg = parseFloat(tank.biomass_kg) || 0;
                        const volumeM3 = (parseFloat(tank.volume_liters) || 0) / 1000;
                        const density = volumeM3 > 0 ? biomassKg / volumeM3 : 0;
                        
                        // Validate density is finite
                        if (!isFinite(density) || isNaN(density)) {
                            console.warn('🐟 FishManagement: Invalid density for tank:', tank, 'biomass:', biomassKg, 'volume:', volumeM3);
                            return; // Skip this entry
                        }
                        
                        console.log('🐟 FishManagement: Adding tank density:', density, 'for tank:', tank.tank_name);
                        chartData.push({
                            x: this.app.formatDateDDMMYYYY(new Date(tank.updated_at || tank.created_at || Date.now())),
                            y: density
                        });
                    });
                }
            } else {
                // Fallback to fish health data
                const fishHealthData = this.app.dataRecords?.fishHealth || [];
                const systemConfig = this.app.loadSystemConfig();
                const totalVolumeM3 = (systemConfig.total_fish_volume || 1000) / 1000;
                
                fishHealthData.forEach(entry => {
                    if (entry.count > 0 && entry.average_weight > 0) {
                        const totalWeightKg = (entry.count * entry.average_weight) / 1000;
                        const density = totalVolumeM3 > 0 ? totalWeightKg / totalVolumeM3 : 0;
                        
                        // Validate density is finite
                        if (!isFinite(density) || isNaN(density)) {
                            console.warn('🐟 FishManagement: Invalid fallback density for entry:', entry, 'weight:', totalWeightKg, 'volume:', totalVolumeM3);
                            return; // Skip this entry
                        }
                        
                        console.log('🐟 FishManagement: Adding fallback density:', density, 'for date:', entry.date);
                        chartData.push({
                            x: this.app.formatDateDDMMYYYY(new Date(entry.date)),
                            y: density
                        });
                    }
                });
            }

            // Sort by date and limit to last 12 entries
            chartData.sort((a, b) => new Date(a.x) - new Date(b.x));
            chartData = chartData.slice(-12);

            // Final validation of all chart data
            const validChartData = chartData.filter(point => {
                const isValid = isFinite(point.y) && !isNaN(point.y);
                if (!isValid) {
                    console.warn('🐟 FishManagement: Filtered out invalid chart point:', point);
                }
                return isValid;
            });

            console.log('🐟 FishManagement: Final chart data points:', validChartData.length, 'values:', validChartData.map(p => p.y));

            const chart = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Fish Density (kg/m³)',
                        data: validChartData,
                        borderColor: '#0051b1',
                        backgroundColor: 'rgba(0, 81, 177, 0.1)',
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff'
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            title: { display: true, text: 'Date' },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            ticks: { maxTicksLimit: 8 }
                        },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Density (kg/m³)' },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });

            this.charts.set('fishDensity', chart);
            console.log('✅ Fish density chart initialized with', chartData.length, 'data points');
            
        } catch (error) {
            console.error('❌ Failed to initialize fish density chart:', error);
        }
    }

    /**
     * Update fish overview cards display
     */
    async displayFishOverviewCards(container, actualTotalVolumeL) {
        if (!container) return;

        try {
            const systemConfig = this.app.loadSystemConfig();
            const fishData = await this.loadFishData();
            const metrics = this.calculateFishMetrics(
                systemConfig.fish_tanks || [], 
                fishData, 
                systemConfig.fish_type || 'tilapia', 
                systemConfig
            );

            container.innerHTML = `
                <div class="fish-overview-cards">
                    <div class="overview-card">
                        <h4>Total Fish</h4>
                        <div class="overview-value">${fishData.totalFish.toLocaleString()}</div>
                        <div class="overview-detail">Across all tanks</div>
                    </div>
                    
                    <div class="overview-card">
                        <h4>Average Weight</h4>
                        <div class="overview-value">${fishData.averageWeight.toFixed(0)}g</div>
                        <div class="overview-detail">Current average</div>
                    </div>
                    
                    <div class="overview-card">
                        <h4>Total Biomass</h4>
                        <div class="overview-value">${fishData.totalBiomassKg.toFixed(1)}kg</div>
                        <div class="overview-detail">Current total weight</div>
                    </div>
                    
                    <div class="overview-card ${metrics.densityStatus}">
                        <h4>Stocking Density</h4>
                        <div class="overview-value">${metrics.actualDensity} kg/m³</div>
                        <div class="overview-detail">Max: ${metrics.recommendedMaxDensity} kg/m³</div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Failed to display fish overview cards:', error);
            container.innerHTML = '<div class="error-message">Failed to load fish overview data</div>';
        }
    }

    /**
     * Display tank cards with detailed information and actions
     */
    async displayTankCards(container) {
        try {
            // Early return if no active system selected
            if (!this.app.activeSystemId || this.app.activeSystemId === 'undefined') {
                container.innerHTML = '<p>Please select a system to view tank information.</p>';
                return;
            }
            
            // Get system data and fish inventory
            const systemData = this.app.getActiveSystem();
            const fishData = await this.loadTankData();
            
            if (!systemData) {
                container.innerHTML = '<p class="no-data">No system data available. Please configure your system in Settings.</p>';
                return;
            }

            // Get current water temperature
            const currentTemp = this.app.getLatestWaterQualityData()?.temperature || 25;
            
            // Calculate system-level metrics
            const systemMetrics = this.calculateSystemMetrics(systemData, fishData.inventoryTanks);
            
            // Generate tank cards
            const tankCards = this.generateTankCards(fishData.fishTanks, systemData, currentTemp);
            
            container.innerHTML = tankCards;

            // Initialize growth charts for each tank
            fishData.fishTanks.forEach(tank => {
                const inventory = tank.inventory || {};
                const chartData = {
                    fishCount: parseInt(inventory.current_count) || 0,
                    avgWeight: parseFloat(inventory.average_weight) || 0,
                    fishType: systemData.fish_type || 'tilapia',
                    density: parseFloat(inventory.density_kg_m3) || 0
                };
                this.initializeGrowthChart(tank.id, currentTemp, chartData);
            });

        } catch (error) {
            console.error('Failed to load tank information:', error);
            container.innerHTML = '<p class="no-data">Unable to load tank information.</p>';
        }
    }

    /**
     * Load comprehensive tank data including inventory and configuration
     */
    async loadTankData() {
        // Get fish inventory data from the new API
        const fishInventoryData = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`).catch((error) => {
            console.warn('Failed to load fish inventory:', error);
            return { tanks: [] };
        });

        // Try to fetch latest fish tank configuration from API
        let fishTanks = [];
        try {
            const tankResponse = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
            fishTanks = tankResponse.tanks || [];
        } catch (error) {
            console.warn('Failed to load tank configuration:', error);
            const systemData = this.app.getActiveSystem();
            fishTanks = systemData.fish_tanks || [];
        }

        // Create mock tanks if none configured
        if (!fishTanks || fishTanks.length === 0) {
            const systemData = this.app.getActiveSystem();
            const tankCount = systemData.fish_tank_count || 1;
            const tankVolume = systemData.total_fish_volume || 1000;
            const volumePerTank = Math.floor(tankVolume / tankCount);
            
            fishTanks = [];
            for (let i = 1; i <= tankCount; i++) {
                fishTanks.push({
                    id: i,
                    tank_number: i,
                    volume_liters: volumePerTank,
                    size_m3: volumePerTank / 1000,
                    fish_type: systemData.fish_type || 'tilapia'
                });
            }
        }

        // Merge tank configuration with inventory data
        const inventoryTanks = fishInventoryData.tanks || [];
        fishTanks = fishTanks.map(tank => {
            const inventory = inventoryTanks.find(inv => 
                inv.fish_tank_id === tank.id || inv.fish_tank_id === tank.tank_number
            ) || {};
            return { ...tank, inventory };
        });

        return {
            fishTanks,
            inventoryTanks
        };
    }

    /**
     * Calculate system-level metrics
     */
    calculateSystemMetrics(systemData, inventoryTanks) {
        const totalSystemVolume = systemData.total_fish_volume || 1000; // in liters
        const totalSystemVolumeM3 = totalSystemVolume / 1000;
        
        let totalSystemFishWeight = 0;
        inventoryTanks.forEach(inventory => {
            const fishCount = inventory.current_count || 0;
            const avgWeight = inventory.average_weight || 0;
            totalSystemFishWeight += (fishCount * avgWeight); // in grams
        });
        
        const totalSystemFishWeightKg = totalSystemFishWeight / 1000;
        const systemDensityKgM3 = totalSystemVolumeM3 > 0 ? (totalSystemFishWeightKg / totalSystemVolumeM3).toFixed(1) : '0.0';

        return {
            totalSystemVolume,
            totalSystemVolumeM3,
            totalSystemFishWeightKg,
            systemDensityKgM3
        };
    }

    /**
     * Generate HTML for all tank cards
     */
    generateTankCards(fishTanks, systemData, currentTemp) {
        return fishTanks.map(tank => {
            const inventory = tank.inventory || {};

            // Get fish data from inventory
            const fishCount = parseInt(inventory.current_count) || 0;
            const avgWeight = parseFloat(inventory.average_weight) || 0;
            const biomassKg = parseFloat(inventory.biomass_kg) || 0;
            const densityKgM3 = parseFloat(inventory.density_kg_m3) || 0;

            // Calculate temperature-adjusted feeding amount
            const totalFishWeight = fishCount * avgWeight;
            const tempAdjustedRate = this.getTemperatureAdjustedFeedingRate(currentTemp, systemData.fish_type);
            const dailyFeedAmount = (totalFishWeight * tempAdjustedRate).toFixed(0);
            
            const tankDensity = (isNaN(densityKgM3) || !isFinite(densityKgM3)) ? '0.0' : densityKgM3.toFixed(1);
            
            return `
                <div class="tank-card">
                    <div class="tank-header">
                        <div class="tank-icon" style="background: none; background-color: transparent;">${this.getFishSvgIcon(systemData.fish_type)}</div>
                        <div>
                            <h3>Tank ${tank.tank_number}</h3>
                            <p style="margin: 0; color: #666; font-size: 0.9em;">${(tank.volume_liters / 1000).toFixed(1)}m³ capacity</p>
                        </div>
                    </div>
                    
                    <div class="tank-stats">
                        <div class="tank-stat">
                            <div class="tank-stat-label">Fish Count</div>
                            <div class="tank-stat-value">${fishCount}</div>
                        </div>
                        <div class="tank-stat">
                            <div class="tank-stat-label">Actual Density</div>
                            <div class="tank-stat-value">${tankDensity} kg/m³</div>
                        </div>
                        <div class="tank-stat">
                            <div class="tank-stat-label">Fish Type</div>
                            <div class="tank-stat-value">${systemData.fish_type ? systemData.fish_type.charAt(0).toUpperCase() + systemData.fish_type.slice(1) : 'Not set'}</div>
                        </div>
                        <div class="tank-stat">
                            <div class="tank-stat-label">Avg Weight</div>
                            <div class="tank-stat-value">${fishCount > 0 && avgWeight > 0 ? avgWeight.toFixed(1) + 'g' : 'Not recorded'}</div>
                        </div>
                    </div>
                    
                    <div class="feeding-schedule">
                        <h4>🍽️ Feeding Schedule</h4>
                        ${fishCount > 0 ? `
                            <p><strong>Daily Amount:</strong> ${dailyFeedAmount}g</p>
                            <p><strong>Frequency:</strong> 2-3 times per day</p>
                            <p><strong>Per Feeding:</strong> ${Math.round(dailyFeedAmount / 2.5)}g</p>
                            <p style="font-size: 0.9em; color: #666; font-style: italic;">Temperature-adjusted for ${currentTemp}°C</p>
                        ` : `
                            <p style="color: #666; font-style: italic;">No fish in this tank</p>
                        `}
                    </div>
                    
                    <div class="growth-chart-container">
                        <div class="growth-chart-header">
                            <h4><img src="icons/new-icons/Afraponix Go Icons_data.svg" alt="Growth" class="metric-icon-svg" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 8px;"> Growth Projection</h4>
                            <div class="temp-indicator">${currentTemp}°C</div>
                        </div>
                        <div class="growth-chart" id="growth-chart-${tank.id}">
                            Growth chart based on ${currentTemp}°C water temperature
                        </div>
                    </div>
                    
                    <div class="tank-actions">
                        <button class="tank-action-btn primary" onclick="app.showAddFishModal(${tank.tank_number})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            Add Fish
                        </button>
                        <button class="tank-action-btn warning" onclick="app.showMortalityModal(${tank.tank_number})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            Mortality
                        </button>
                        <button class="tank-action-btn success" onclick="app.showFeedingModal(${tank.tank_number})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z"/>
                            </svg>
                            Feed
                        </button>
                        <button class="tank-action-btn info" onclick="app.showFishSizeModal(${tank.tank_number})" 
                                style="background: #17a2b8; border-color: #17a2b8;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Size
                        </button>
                        <button class="tank-action-btn harvest" onclick="app.showHarvestFishModal(${tank.tank_number})" 
                                style="background: #28a745; border-color: #28a745;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h2v10z"/>
                            </svg>
                            Harvest
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get temperature-adjusted feeding rate
     */
    getTemperatureAdjustedFeedingRate(temperature, fishType) {
        const baseFeeding = 0.025; // 2.5% base feeding rate
        
        // Temperature adjustments by fish type
        const tempAdjustments = {
            'tilapia': {
                optimal: 28, // 26-30°C optimal
                min: 15,
                max: 35
            },
            'trout': {
                optimal: 15, // 12-18°C optimal  
                min: 4,
                max: 20
            },
            'catfish': {
                optimal: 26, // 24-28°C optimal
                min: 12,
                max: 32
            },
            'salmon': {
                optimal: 12, // 8-15°C optimal
                min: 2,
                max: 18
            },
            'bass': {
                optimal: 24, // 22-26°C optimal
                min: 10,
                max: 30
            }
        };

        const adjustments = tempAdjustments[fishType?.toLowerCase()] || tempAdjustments.tilapia;
        
        // Calculate temperature factor (0.5 to 1.2)
        let tempFactor = 1.0;
        if (temperature < adjustments.optimal) {
            const diffFromOptimal = adjustments.optimal - temperature;
            const maxDiff = adjustments.optimal - adjustments.min;
            tempFactor = Math.max(0.5, 1.0 - (diffFromOptimal / maxDiff) * 0.5);
        } else if (temperature > adjustments.optimal) {
            const diffFromOptimal = temperature - adjustments.optimal;
            const maxDiff = adjustments.max - adjustments.optimal;
            tempFactor = Math.max(0.5, 1.0 - (diffFromOptimal / maxDiff) * 0.3);
        }

        return baseFeeding * tempFactor;
    }

    /**
     * Get fish SVG icon based on fish type
     */
    getFishSvgIcon(fishType) {
        return `<img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish" style="width: 24px; height: 24px;">`;
    }

    /**
     * Initialize growth chart for a specific tank
     */
    initializeGrowthChart(tankId, temperature, fishData) {
        const container = document.getElementById(`growth-chart-${tankId}`);
        if (!container || !fishData.fishCount) return;

        // Generate growth projection data
        const projectionData = this.generateGrowthProjection(fishData, temperature);
        
        container.innerHTML = `
            <div class="growth-projection">
                <div class="projection-item">
                    <span class="projection-label">Current:</span>
                    <span class="projection-value">${fishData.avgWeight}g</span>
                </div>
                <div class="projection-item">
                    <span class="projection-label">30 days:</span>
                    <span class="projection-value">${projectionData.thirtyDays}g</span>
                </div>
                <div class="projection-item">
                    <span class="projection-label">90 days:</span>
                    <span class="projection-value">${projectionData.ninetyDays}g</span>
                </div>
                <div class="projection-item">
                    <span class="projection-label">Harvest:</span>
                    <span class="projection-value">${projectionData.harvestWeight}g</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate growth projection data
     */
    generateGrowthProjection(fishData, temperature) {
        const { avgWeight, fishType } = fishData;
        const baseGrowthRate = this.getGrowthRateForSpecies(fishType, temperature);
        
        return {
            thirtyDays: Math.round(avgWeight * (1 + baseGrowthRate * 30)),
            ninetyDays: Math.round(avgWeight * (1 + baseGrowthRate * 90)),
            harvestWeight: this.getFinalHarvestWeight(fishType)
        };
    }

    /**
     * Get daily growth rate for fish species at given temperature
     */
    getGrowthRateForSpecies(fishType, temperature) {
        const growthRates = {
            'tilapia': 0.015,   // 1.5% daily at optimal temp
            'trout': 0.012,     // 1.2% daily at optimal temp
            'catfish': 0.018,   // 1.8% daily at optimal temp
            'salmon': 0.010,    // 1.0% daily at optimal temp
            'bass': 0.014       // 1.4% daily at optimal temp
        };
        
        const baseRate = growthRates[fishType?.toLowerCase()] || growthRates.tilapia;
        const tempFactor = this.getTemperatureAdjustedFeedingRate(temperature, fishType) / 0.025;
        
        return baseRate * tempFactor;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            chartsInitialized: this.charts.size,
            availableCharts: Array.from(this.charts.keys()),
            componentLoaded: true
        };
    }

    /**
     * Generate tank cards HTML for fish tank overview display
     * 
     * @param {Array} fishTanks - Array of fish tank configurations
     * @param {Object} systemData - System configuration data
     * @param {number} currentTemp - Current water temperature
     * @returns {string} HTML string for tank cards
     */
    generateTankCards(fishTanks, systemData, currentTemp) {
        if (!fishTanks || !Array.isArray(fishTanks) || fishTanks.length === 0) {
            return '<div class="no-tanks-message">No fish tanks configured for this system.</div>';
        }
        
        try {
            const tankCards = fishTanks.map(tank => {
                const inventory = tank.inventory || {};

                // Get fish data from inventory
                const fishCount = parseInt(inventory.current_count) || 0;
                const avgWeight = parseFloat(inventory.average_weight) || 0;
                const biomassKg = parseFloat(inventory.biomass_kg) || 0;
                const densityKgM3 = parseFloat(inventory.density_kg_m3) || 0;

                // Calculate temperature-adjusted feeding amount
                const totalFishWeight = fishCount * avgWeight;
                const tempAdjustedRate = this.getTemperatureAdjustedFeedingRate(currentTemp, systemData.fish_type);
                const dailyFeedAmount = (totalFishWeight * tempAdjustedRate).toFixed(0);
                
                const tankDensity = (isNaN(densityKgM3) || !isFinite(densityKgM3)) ? '0.0' : densityKgM3.toFixed(1);
                
                // Calculate density percentage for visual indicator
                const maxRecommendedDensity = 30; // kg/m³
                const densityPercentage = Math.min((densityKgM3 / maxRecommendedDensity) * 100, 100);
                const isOverstocked = densityKgM3 > maxRecommendedDensity;
                
                return `
                    <div class="modern-tank-card">
                        <div class="card-header">
                            <div class="tank-title">
                                <span>Tank ${tank.tank_number}</span>
                                <div class="status-badge">
                                    <div class="status-dot"></div>
                                    <span>HEALTHY</span>
                                </div>
                            </div>
                            <div class="volume-info">Volume: ${(tank.volume_liters / 1000).toFixed(1)}m³</div>
                        </div>
                        
                        <div class="card-body">
                            <div class="primary-metrics">
                                <div class="metric">
                                    <div class="metric-value">${fishCount}</div>
                                    <div class="metric-label">Fish Count</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-value">${biomassKg.toFixed(1)}</div>
                                    <div class="metric-label">Biomass (kg)</div>
                                </div>
                            </div>
                            
                            <div class="secondary-metrics">
                                <div class="metric-row">
                                    <div class="metric-row-label">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2m0 2a8 8 0 00-8 8 8 8 0 008 8 8 8 0 008-8 8 8 0 00-8-8m0 3a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5m0 2a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3z"/>
                                        </svg>
                                        Average Weight
                                    </div>
                                    <div class="metric-row-value">${avgWeight > 0 ? avgWeight.toFixed(0) + 'g' : 'Not recorded'}</div>
                                </div>
                                <div class="metric-row">
                                    <div class="metric-row-label">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        Daily Feed
                                    </div>
                                    <div class="metric-row-value">${dailyFeedAmount}g</div>
                                </div>
                                <div class="metric-row">
                                    <div class="metric-row-label">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M4 4h16v12H4V4m0-2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4m0 16v4h16v-4H4m8 2h4v2h-4v-2z"/>
                                        </svg>
                                        Density
                                    </div>
                                    <div class="metric-row-value">${tankDensity} kg/m³</div>
                                </div>
                                <div class="density-indicator">
                                    <div class="density-fill ${isOverstocked ? 'density-warning' : ''}" style="width: ${densityPercentage}%"></div>
                                </div>
                                <div class="recommendation">Recommended: ${maxRecommendedDensity} kg/m³</div>
                            </div>
                            
                            <div class="tank-actions">
                                <button class="action-btn primary" onclick="app.showAddFishModal(${tank.tank_number})" title="Add Fish">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                    </svg>
                                </button>
                                <button class="action-btn warning" onclick="app.showMortalityModal(${tank.tank_number})" title="Record Mortality">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                    </svg>
                                </button>
                                <button class="action-btn success" onclick="app.showFeedingModal(${tank.tank_number})" title="Record Feeding">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z"/>
                                    </svg>
                                </button>
                                <button class="action-btn info" onclick="app.showFishSizeModal(${tank.tank_number})" title="Update Size">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                </button>
                                <button class="action-btn harvest" onclick="app.showHarvestFishModal(${tank.tank_number})" title="Harvest Fish">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h2v10z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            return `<div class="tank-grid">${tankCards}</div>`;
            
        } catch (error) {
            console.error('Error generating tank cards:', error);
            return '<div class="error-message">Error loading fish tank information. Please refresh the page.</div>';
        }
    }

    /**
     * Get temperature-adjusted feeding rate based on water temperature
     * 
     * @param {number} temperature - Water temperature in Celsius
     * @param {string} fishType - Type of fish (optional)
     * @returns {number} Adjusted feeding rate multiplier
     */
    getTemperatureAdjustedFeedingRate(temperature, fishType = null) {
        if (!temperature || isNaN(temperature)) {
            return 0.025; // Default 2.5% feeding rate
        }
        
        // Temperature-based feeding rate adjustments
        const temperatureFactors = {
            5: 0.5,   // Very cold - slow metabolism
            10: 0.7,  // Cold
            15: 0.85, // Cool
            20: 1.0,  // Optimal base
            25: 1.15, // Warm
            30: 1.25, // Hot
            35: 0.9   // Too hot - stress reduces feeding
        };
        
        // Find closest temperature factor
        const temps = Object.keys(temperatureFactors).map(t => parseInt(t)).sort((a, b) => a - b);
        let closestTemp = temps[0];
        
        for (const temp of temps) {
            if (Math.abs(temp - temperature) < Math.abs(closestTemp - temperature)) {
                closestTemp = temp;
            }
        }
        
        const baseFeedingRate = 0.025; // 2.5% of body weight per day
        const factor = temperatureFactors[closestTemp] || 1.0;
        
        return baseFeedingRate * factor;
    }

    /**
     * Get fish SVG icon based on fish type
     * 
     * @param {string} fishType - Type of fish
     * @returns {string} SVG icon HTML
     */
    getFishSvgIcon(fishType) {
        if (!fishType) {
            return '<img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish" style="width: 24px; height: 24px;">';
        }
        
        const iconMap = {
            'tilapia': 'Afraponix Go Icons_tilapia.svg',
            'bass': 'Afraponix Go Icons_bass.svg',
            'catfish': 'Afraponix Go Icons_catfish.svg',
            'trout': 'Afraponix Go Icons_trout.svg',
            'barramundi': 'Afraponix Go Icons_barramundi.svg',
            'carp': 'Afraponix Go Icons_carp.svg'
        };
        
        const iconFile = iconMap[fishType.toLowerCase()] || 'Afraponix Go Icons_fish.svg';
        return `<img src="icons/new-icons/${iconFile}" alt="${fishType}" style="width: 24px; height: 24px;">`;
    }

    /**
     * Update tank cards display in the DOM
     * 
     * @param {string} containerId - ID of the container element
     * @param {Array} fishTanks - Array of fish tank configurations
     * @param {Object} systemData - System configuration data
     * @param {number} currentTemp - Current water temperature
     */
    updateTankCardsDisplay(containerId, fishTanks, systemData, currentTemp) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Tank cards container '${containerId}' not found`);
            return;
        }
        
        try {
            const tankCardsHtml = this.generateTankCards(fishTanks, systemData, currentTemp);
            container.innerHTML = tankCardsHtml;
            
            // Initialize growth charts after DOM update
            this.initializeTankGrowthCharts(fishTanks, currentTemp);
            
        } catch (error) {
            console.error('Error updating tank cards display:', error);
            container.innerHTML = '<div class="error-message">Error loading fish tank display.</div>';
        }
    }

    /**
     * Initialize growth charts for individual tanks
     * 
     * @param {Array} fishTanks - Array of fish tank configurations
     * @param {number} currentTemp - Current water temperature
     */
    initializeTankGrowthCharts(fishTanks, currentTemp) {
        if (!fishTanks || !Array.isArray(fishTanks) || !window.Chart) {
            return;
        }
        
        fishTanks.forEach(tank => {
            const chartContainer = document.getElementById(`growth-chart-${tank.id}`);
            if (!chartContainer) return;
            
            const inventory = tank.inventory || {};
            const fishCount = parseInt(inventory.current_count) || 0;
            const avgWeight = parseFloat(inventory.average_weight) || 0;
            
            if (fishCount > 0 && avgWeight > 0) {
                // Generate simple growth projection data
                const growthData = this.generateGrowthProjectionData(avgWeight, currentTemp);
                this.renderTankGrowthChart(`growth-chart-${tank.id}`, growthData, currentTemp);
            } else {
                chartContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">No fish data for growth projection</p>';
            }
        });
    }

    /**
     * Generate growth projection data based on current weight and temperature
     * 
     * @param {number} currentWeight - Current average fish weight
     * @param {number} temperature - Water temperature
     * @returns {Array} Growth projection data points
     */
    generateGrowthProjectionData(currentWeight, temperature) {
        const growthRate = this.getTemperatureAdjustedGrowthRate(temperature);
        const data = [];
        
        // Generate 12 weeks of growth projection
        for (let week = 0; week <= 12; week++) {
            const projectedWeight = currentWeight * Math.pow(1 + growthRate, week);
            data.push({
                week: week,
                weight: Math.round(projectedWeight)
            });
        }
        
        return data;
    }

    /**
     * Get temperature-adjusted growth rate
     * 
     * @param {number} temperature - Water temperature
     * @returns {number} Weekly growth rate
     */
    getTemperatureAdjustedGrowthRate(temperature) {
        if (!temperature || isNaN(temperature)) return 0.02; // Default 2% per week
        
        // Optimal growth around 20-25°C
        if (temperature >= 20 && temperature <= 25) {
            return 0.03; // 3% per week
        } else if (temperature >= 15 && temperature <= 30) {
            return 0.025; // 2.5% per week
        } else {
            return 0.015; // 1.5% per week (suboptimal conditions)
        }
    }

    /**
     * Render individual tank growth chart
     * 
     * @param {string} containerId - Chart container ID
     * @param {Array} growthData - Growth projection data
     * @param {number} temperature - Water temperature
     */
    renderTankGrowthChart(containerId, growthData, temperature) {
        // For now, display simple text summary instead of full chart
        const container = document.getElementById(containerId);
        if (!container || !growthData || growthData.length < 2) return;
        
        const currentWeight = growthData[0].weight;
        const projectedWeight = growthData[growthData.length - 1].weight;
        const growthPercent = ((projectedWeight - currentWeight) / currentWeight * 100).toFixed(0);
        
        container.innerHTML = `
            <div class="growth-summary">
                <p><strong>Current:</strong> ${currentWeight}g average</p>
                <p><strong>12-week projection:</strong> ${projectedWeight}g</p>
                <p><strong>Expected growth:</strong> +${growthPercent}%</p>
                <p style="font-size: 0.8em; color: #666;">Based on ${temperature}°C water temperature</p>
            </div>
        `;
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Fish Management component');
        
        // Destroy all charts
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts.clear();
    }
}

// Export both class and create a factory function
export default FishManagementComponent;

/**
 * Factory function to create fish management component
 */
export function createFishManagementComponent(app) {
    return new FishManagementComponent(app);
}