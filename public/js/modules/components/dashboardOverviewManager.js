// Dashboard Overview Manager Component
// Handles overview cards, metrics calculations, and dashboard summaries

/**
 * Dashboard Overview Manager Component Class
 * Manages overview cards, metrics calculations, and dashboard summary displays
 */
export class DashboardOverviewManagerComponent {
    constructor(app) {
        this.app = app;
        this.overviewData = {};
        this.renderTimeout = null;
        
        console.log('📊 Dashboard Overview Manager Component initialized');
    }

    /**
     * Update plant overview with grow bed summary and metrics
     * Complexity: 30, Lines: 100+
     */
    async updatePlantOverview() {
        // Clear any pending render timeout
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }

        try {
            // Ensure fresh data is loaded
            if (!this.app.plantData || this.app.plantData.length === 0) {
                await this.app.loadDataRecords();
            }

            // Generate the overview content
            const overviewContainer = document.getElementById('plant-overview-summary');
            if (!overviewContainer) {
                console.warn('Plant overview container not found');
                return;
            }

            // Generate overview cards and grow bed summary
            const overviewHtml = await this.generatePlantOverviewContent();
            overviewContainer.innerHTML = overviewHtml;

            // Store the updated data
            this.overviewData.plant = {
                lastUpdated: new Date(),
                growBeds: this.app.growBeds || [],
                plantData: this.app.plantData || []
            };

        } catch (error) {
            console.error('Error updating plant overview:', error);
        }
    }

    /**
     * Generate complete plant overview content
     * Complexity: 25, Lines: 80+
     */
    async generatePlantOverviewContent() {
        let html = '';

        // Generate plant metrics cards
        html += await this.generatePlantMetricsCards();

        // Generate grow bed summary
        html += await this.generateGrowBedSummary();

        return html;
    }

    /**
     * Generate plant metrics overview cards
     * Complexity: 20, Lines: 60+
     */
    async generatePlantMetricsCards() {
        try {
            const plantData = this.app.plantData || [];
            const growBeds = this.app.growBeds || [];

            // Calculate metrics
            const totalPlanted = plantData
                .filter(entry => entry.new_seedlings > 0)
                .reduce((sum, entry) => sum + (entry.new_seedlings || 0), 0);

            const totalHarvested = plantData
                .filter(entry => entry.plants_harvested > 0)
                .reduce((sum, entry) => sum + (entry.plants_harvested || 0), 0);

            const totalHarvestedWeight = plantData
                .filter(entry => entry.harvest_weight > 0)
                .reduce((sum, entry) => sum + (entry.harvest_weight || 0), 0);

            const activeBeds = growBeds.filter(bed => {
                const bedPlantData = plantData.filter(entry => entry.grow_bed_id == bed.id);
                return this.hasPlantsInBed(bedPlantData);
            }).length;

            const uniqueCrops = [...new Set(plantData.map(entry => entry.crop_type))].length;

            return `
                <div class="plant-metrics-summary">
                    <h3>Plant Management Overview</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-icon">
                                <img src="icons/new-icons/plant.svg" alt="Plants Growing" style="width: 1.2em; height: 1.2em;">
                            </div>
                            <div class="metric-content">
                                <h4>Plants Growing</h4>
                                <div class="metric-value">${totalPlanted - totalHarvested}</div>
                                <div class="metric-subtitle">Currently in system</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">
                                <img src="icons/new-icons/harvest.svg" alt="Total Harvested" style="width: 1.2em; height: 1.2em;">
                            </div>
                            <div class="metric-content">
                                <h4>Total Harvested</h4>
                                <div class="metric-value">${this.formatWeight(totalHarvestedWeight)}</div>
                                <div class="metric-subtitle">${totalHarvested} plants</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">
                                <img src="icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Active Grow Beds" style="width: 1.2em; height: 1.2em;">
                            </div>
                            <div class="metric-content">
                                <h4>Active Grow Beds</h4>
                                <div class="metric-value">${activeBeds}</div>
                                <div class="metric-subtitle">of ${growBeds.length} total beds</div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">
                                <img src="icons/new-icons/growth.svg" alt="Crop Varieties" style="width: 1.2em; height: 1.2em;">
                            </div>
                            <div class="metric-content">
                                <h4>Crop Varieties</h4>
                                <div class="metric-value">${uniqueCrops}</div>
                                <div class="metric-subtitle">Different crops grown</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error generating plant metrics cards:', error);
            return '<div class="error-message">Error loading plant metrics</div>';
        }
    }

    /**
     * Generate grow bed summary with allocation vs actual data
     * Complexity: 35, Lines: 150+
     */
    async generateGrowBedSummary() {
        if (!this.app.activeSystemId) {
            return '<div class="grow-bed-summary"><div class="no-data">Please select a system to view grow bed summary.</div></div>';
        }

        try {
            // Get fresh data
            const [plantData, growBeds, allocations] = await Promise.all([
                this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`),
                this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`),
                this.getCropAllocations()
            ]);

            if (!growBeds || growBeds.length === 0) {
                return '<div class="grow-bed-summary"><div class="no-data">No grow beds configured for this system.</div></div>';
            }

            let html = `
                <div class="grow-bed-summary">
                    <h4>Grow Bed Utilization</h4>
                    <div class="beds-grid">
            `;

            // Process each grow bed
            for (const bed of growBeds) {
                const bedPlantData = plantData.filter(entry => entry.grow_bed_id == bed.id);
                const bedAllocations = allocations.filter(alloc => alloc.grow_bed_id === bed.id);
                
                // Calculate area and allocation percentage
                const totalArea = bed.area_m2 || (bed.length * bed.width / 10000) || 1;
                const totalAllocationPercentage = bedAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.percentage_allocated || 0), 0);
                
                // Calculate actual plant counts by crop
                const cropCounts = {};
                bedPlantData.forEach(entry => {
                    const cropType = entry.crop_type;
                    if (!cropCounts[cropType]) {
                        cropCounts[cropType] = { planted: 0, harvested: 0, remaining: 0 };
                    }
                    if (entry.new_seedlings > 0) {
                        cropCounts[cropType].planted += entry.new_seedlings;
                    }
                    if (entry.plants_harvested > 0) {
                        cropCounts[cropType].harvested += entry.plants_harvested;
                    }
                });

                // Calculate remaining plants
                Object.keys(cropCounts).forEach(crop => {
                    cropCounts[crop].remaining = Math.max(0, cropCounts[crop].planted - cropCounts[crop].harvested);
                });

                // Calculate total remaining plants
                const totalRemainingPlants = Object.values(cropCounts).reduce((sum, crop) => sum + crop.remaining, 0);
                
                // Determine bed status
                let statusClass = 'empty';
                let statusText = 'Empty';
                if (totalRemainingPlants > 0) {
                    const utilizationPercentage = Math.min(100, (totalRemainingPlants / (bedAllocations.reduce((sum, alloc) => sum + (alloc.expected_plants || 0), 0) || 1)) * 100);
                    if (utilizationPercentage >= 80) {
                        statusClass = 'full';
                        statusText = 'Well Utilized';
                    } else if (utilizationPercentage >= 50) {
                        statusClass = 'partial';
                        statusText = 'Partially Planted';
                    } else {
                        statusClass = 'low';
                        statusText = 'Lightly Planted';
                    }
                }

                html += `
                    <div class="bed-summary-card ${statusClass}">
                        <div class="bed-header">
                            <h5>${bed.name || `Bed ${bed.bed_number || bed.id}`}</h5>
                            <span class="bed-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="bed-stats">
                            <div class="bed-stat">
                                <strong>Area:</strong> ${totalArea.toFixed(1)}m² 
                                ${totalAllocationPercentage > 0 ? `(${totalAllocationPercentage.toFixed(0)}% allocated)` : ''}
                            </div>
                            <div class="bed-stat">
                                <strong>Plants:</strong> ${totalRemainingPlants} currently growing
                            </div>
                        </div>
                `;

                // Show crop breakdown if there are plants
                if (Object.keys(cropCounts).length > 0) {
                    html += '<div class="crop-breakdown">';
                    Object.entries(cropCounts).forEach(([crop, counts]) => {
                        if (counts.remaining > 0) {
                            const cleanCropName = this.app.utilities ? 
                                this.app.utilities.cleanCustomCropName(crop) : crop;
                            const allocation = bedAllocations.find(alloc => alloc.crop_type === crop);
                            const expectedPlants = allocation ? allocation.expected_plants : 0;
                            
                            html += `
                                <div class="crop-item">
                                    <span class="crop-name">${cleanCropName}</span>
                                    <span class="crop-count">${counts.remaining}${expectedPlants ? ` / ${expectedPlants}` : ''}</span>
                                </div>
                            `;
                        }
                    });
                    html += '</div>';
                } else if (bedAllocations.length > 0) {
                    // Show what's allocated but not planted
                    html += '<div class="crop-breakdown">';
                    bedAllocations.forEach(allocation => {
                        const cleanCropName = this.app.utilities ? 
                            this.app.utilities.cleanCustomCropName(allocation.crop_type) : allocation.crop_type;
                        html += `
                            <div class="crop-item allocated">
                                <span class="crop-name">${cleanCropName}</span>
                                <span class="crop-count">0 / ${allocation.expected_plants || 0}</span>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                html += '</div>';
            }

            html += '</div></div>';
            return html;

        } catch (error) {
            console.error('Error generating grow bed summary:', error);
            return '<div class="grow-bed-summary"><div class="error-message">Error loading grow bed summary</div></div>';
        }
    }

    /**
     * Check if bed has plants
     * Complexity: 8, Lines: 15
     */
    hasPlantsInBed(bedPlantData) {
        let totalPlanted = 0;
        let totalHarvested = 0;

        bedPlantData.forEach(entry => {
            if (entry.new_seedlings > 0) {
                totalPlanted += entry.new_seedlings;
            }
            if (entry.plants_harvested > 0) {
                totalHarvested += entry.plants_harvested;
            }
        });

        return totalPlanted > totalHarvested;
    }

    /**
     * Get crop allocations for calculations
     * Complexity: 8, Lines: 12
     */
    async getCropAllocations() {
        try {
            const response = await this.app.makeApiCall(`/crop-allocations/system/${this.app.activeSystemId}`);
            return response.allocations || [];
        } catch (error) {
            console.warn('No crop allocations found:', error);
            return [];
        }
    }

    /**
     * Display fish overview cards with comprehensive metrics
     * Complexity: 25, Lines: 80+
     */
    async displayFishOverviewCards(container, actualTotalVolumeL) {
        try {
            // Primary data source: Fish Inventory API
            let fishData = [];
            let totalFish = 0;
            let totalBiomass = 0;
            let averageWeight = 0;

            try {
                const inventoryResponse = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
                if (inventoryResponse && inventoryResponse.inventory && inventoryResponse.inventory.length > 0) {
                    fishData = inventoryResponse.inventory;
                    
                    fishData.forEach(tank => {
                        totalFish += tank.fish_count || 0;
                        totalBiomass += (tank.fish_count || 0) * (tank.average_weight || 0);
                    });
                    
                    averageWeight = totalFish > 0 ? totalBiomass / totalFish : 0;
                }
            } catch (error) {
                console.warn('Fish inventory API not available, using fish health data fallback');
            }

            // Fallback: Fish Health API
            if (totalFish === 0 && this.app.dataRecords?.fishHealth) {
                const fishHealthData = this.app.dataRecords.fishHealth;
                if (fishHealthData.length > 0) {
                    // Get latest fish health record with fish count
                    const latestRecord = fishHealthData
                        .filter(record => record.fish_count && record.fish_count > 0)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    
                    if (latestRecord) {
                        totalFish = latestRecord.fish_count || 0;
                        averageWeight = latestRecord.average_weight || 0;
                        totalBiomass = totalFish * averageWeight;
                    }
                }
            }

            // Calculate density and feeding metrics
            const totalVolumeM3 = actualTotalVolumeL / 1000;
            const density = totalVolumeM3 > 0 ? (totalBiomass / totalVolumeM3) : 0;

            // Get latest feeding data
            let lastFeedingDate = 'Never';
            let dailyFeedAmount = 0;
            try {
                if (this.app.dataRecords?.fishHealth && this.app.dataRecords.fishHealth.length > 0) {
                    const recentFeeding = this.app.dataRecords.fishHealth
                        .filter(record => record.feed_amount && record.feed_amount > 0)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    
                    if (recentFeeding) {
                        lastFeedingDate = new Date(recentFeeding.date).toLocaleDateString();
                        dailyFeedAmount = recentFeeding.feed_amount || 0;
                    }
                }
            } catch (error) {
                console.error('Error getting feeding data:', error);
            }

            // Generate overview cards HTML
            const html = `
                <div class="overview-cards">
                    <div class="metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish Count" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Fish Count</h3>
                            <p class="metric-value">${totalFish}</p>
                            <p class="metric-subtitle">Total fish in system</p>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/weight.svg" alt="Total Biomass" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Total Biomass</h3>
                            <p class="metric-value">${this.formatWeight(totalBiomass)}</p>
                            <p class="metric-subtitle">Combined fish weight</p>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/density.svg" alt="Density" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Stocking Density</h3>
                            <p class="metric-value">${density.toFixed(1)} kg/m³</p>
                            <p class="metric-subtitle">System density</p>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/feed.svg" alt="Last Fed" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Last Fed</h3>
                            <p class="metric-value">${lastFeedingDate}</p>
                            <p class="metric-subtitle">${dailyFeedAmount}g daily</p>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Store the overview data
            this.overviewData.fish = {
                lastUpdated: new Date(),
                totalFish,
                totalBiomass,
                density,
                lastFeedingDate,
                dailyFeedAmount
            };

        } catch (error) {
            console.error('Error generating fish overview cards:', error);
            container.innerHTML = '<p class="error">Error loading fish overview</p>';
        }
    }

    /**
     * Update fish tank summary
     * Complexity: 15, Lines: 30+
     */
    async updateFishTankSummary() {
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        try {
            // Get system data for tank information
            const systemData = this.app.getActiveSystem();
            if (!systemData) {
                container.innerHTML = '<p class="no-data">No system data available. Please configure your system in Settings.</p>';
                return;
            }

            // Fetch actual fish tank configurations to get real total volume
            let actualTotalVolumeL = systemData.total_fish_volume || 1000;
            try {
                const tankResponse = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
                const fishTanks = tankResponse.tanks || [];

                if (fishTanks.length > 0) {
                    actualTotalVolumeL = 0;
                    fishTanks.forEach(tank => {
                        const volumeL = parseFloat(tank.volume_liters) || 0;
                        actualTotalVolumeL += volumeL;
                    });
                }
            } catch (error) {
                console.error('Error fetching tank configurations:', error);
            }

            // Generate fish overview cards
            await this.displayFishOverviewCards(container, actualTotalVolumeL);

        } catch (error) {
            console.error('Failed to display fish tank summary:', error);
        }
    }

    /**
     * Format weight for display (kg vs g)
     * Complexity: 5, Lines: 8
     */
    formatWeight(grams) {
        if (!grams || grams === 0) return '0g';
        
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(1)}kg`;
        } else {
            return `${Math.round(grams)}g`;
        }
    }

    /**
     * Generate water quality status summary
     * Complexity: 15, Lines: 40+
     */
    async generateWaterQualityStatusSummary() {
        try {
            const latestData = this.app.getLatestWaterQualityData();
            if (!latestData) {
                return '<div class="water-quality-summary"><div class="no-data">No water quality data available</div></div>';
            }

            // Determine overall status based on key parameters
            let overallStatus = 'good';
            let statusMessage = 'Water quality within acceptable ranges';

            // Check critical parameters
            const ph = latestData.ph;
            const temperature = latestData.temperature;
            const oxygen = latestData.dissolved_oxygen;
            const ammonia = latestData.ammonia;

            if (ph && (ph < 6.0 || ph > 8.5)) {
                overallStatus = 'warning';
                statusMessage = 'pH levels need attention';
            }
            if (temperature && (temperature < 18 || temperature > 30)) {
                overallStatus = 'warning';
                statusMessage = 'Temperature outside optimal range';
            }
            if (oxygen && oxygen < 5.0) {
                overallStatus = 'poor';
                statusMessage = 'Dissolved oxygen levels critical';
            }
            if (ammonia && ammonia > 0.5) {
                overallStatus = 'poor';
                statusMessage = 'Ammonia levels too high';
            }

            const statusIcon = this.getWaterQualityStatusIcon(overallStatus);

            return `
                <div class="water-quality-summary">
                    <h4>Water Quality Status</h4>
                    <div class="quality-status ${overallStatus}">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusMessage}</span>
                    </div>
                    <div class="quality-badges-grid">
                        <div class="quality-badge ${this.getParameterStatus(ph, 6.5, 7.5)}">
                            pH: ${ph ? ph.toFixed(1) : 'N/A'}
                        </div>
                        <div class="quality-badge ${this.getParameterStatus(temperature, 22, 26)}">
                            Temp: ${temperature ? `${temperature.toFixed(1)}°C` : 'N/A'}
                        </div>
                        <div class="quality-badge ${this.getParameterStatus(oxygen, 6, 8)}">
                            DO: ${oxygen ? `${oxygen.toFixed(1)}mg/L` : 'N/A'}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error generating water quality summary:', error);
            return '<div class="water-quality-summary"><div class="error-message">Error loading water quality status</div></div>';
        }
    }

    /**
     * Get water quality status icon
     * Complexity: 5, Lines: 10
     */
    getWaterQualityStatusIcon(status) {
        const icons = {
            excellent: '🟢',
            good: '🟡',
            warning: '🟠',
            poor: '🔴'
        };
        return icons[status] || icons.good;
    }

    /**
     * Get parameter status for badges
     * Complexity: 8, Lines: 12
     */
    getParameterStatus(value, optimalMin, optimalMax) {
        if (!value) return 'unknown';
        if (value >= optimalMin && value <= optimalMax) return 'excellent';
        if (value >= optimalMin * 0.8 && value <= optimalMax * 1.2) return 'good';
        return 'warning';
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            hasPlantOverviewData: !!this.overviewData.plant,
            hasFishOverviewData: !!this.overviewData.fish,
            lastPlantUpdate: this.overviewData.plant?.lastUpdated,
            lastFishUpdate: this.overviewData.fish?.lastUpdated
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Dashboard Overview Manager component');
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.overviewData = {};
    }
}

// Export both class and create a factory function
export default DashboardOverviewManagerComponent;

/**
 * Factory function to create dashboard overview manager component
 */
export function createDashboardOverviewManagerComponent(app) {
    return new DashboardOverviewManagerComponent(app);
}