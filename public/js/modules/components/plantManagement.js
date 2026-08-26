// Plant Management Component
// Handles plant overview rendering, metrics, and plant-related UI interactions

import { API_ENDPOINTS, MAGIC_NUMBERS } from '../constants/index.js';

/**
 * Plant Management Component Class
 * Manages plant overview displays, batch statistics, and plant-related UI
 */
export class PlantManagementComponent {
    constructor(app) {
        this.app = app;
        this.plantOverviewRendering = false;
        this.plantOverviewRenderTimeout = null;
        
        console.log('🌱 Plant Management Component initialized');
    }

    /**
     * Main plant overview render method - handles the complete plant dashboard
     */
    async renderPlantOverview() {
        // Prevent concurrent renders
        if (this.plantOverviewRendering) {
            return;
        }
        
        this.plantOverviewRendering = true;
        try {
            const container = document.getElementById('plant-overview-container');
            if (!container) {
                console.warn('plant-overview-container not found');
                return;
            }
            
            const systemConfig = this.app.loadSystemConfig();
            if (!systemConfig || systemConfig.system_name === 'No System Selected') {
                container.innerHTML = '<div class="no-plant-data">Please select a system to view plant information.</div>';
                return;
            }

            // Fetch fresh plant data
            const plantData = await this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`);
            const growBeds = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
            
            // Calculate plant metrics
            const plantMetrics = this.calculatePlantMetrics(plantData);
            const batchStats = this.generateBatchStatistics(plantData);
            
            // Calculate grow bed capacity metrics
            const growBedsData = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
            const bedCapacityStats = this.calculateBedCapacityMetrics(growBedsData, plantData);
            
            // Update plant metrics summary at top of Plants tab
            this.updatePlantMetricsDisplay(plantMetrics);
            
            // Generate nutrient overview section  
            const nutrientOverviewHtml = await this.generateNutrientOverview();
            
            // Clear container and render
            this.clearContainer(container);
            
            // Render the complete plant overview
            container.innerHTML = this.renderPlantOverviewHTML(
                plantMetrics,
                batchStats,
                bedCapacityStats,
                nutrientOverviewHtml
            );
            
            // Initialize quick action buttons after rendering
            this.app.initializeQuickActions();
            
        } finally {
            this.plantOverviewRendering = false;
            this.plantOverviewRenderTimeout = null;
        }
    }

    /**
     * Calculate comprehensive plant metrics from plant data
     */
    calculatePlantMetrics(plantData) {
        // Use the simple, correct function to count active batches
        const activeBatches = this.app.getActiveBatchCount(plantData);
        
        // Calculate total plants remaining
        let totalPlants = 0;
        const batches = new Map();
        
        plantData.forEach(entry => {
            if (!entry.batch_id) return;
            
            const key = `${entry.grow_bed_id}-${entry.batch_id}`;
            if (!batches.has(key)) {
                batches.set(key, { planted: 0, harvested: 0 });
            }
            
            const batch = batches.get(key);
            if (entry.new_seedlings > 0) {
                batch.planted += entry.new_seedlings;
            }
            if (entry.plants_harvested > 0) {
                batch.harvested += entry.plants_harvested;
            }
        });
        
        // Calculate total remaining plants
        batches.forEach(batch => {
            const remaining = batch.planted - batch.harvested;
            if (remaining > 0) {
                totalPlants += remaining;
            }
        });
        
        const activeGrowBeds = Math.min(
            this.app.loadSystemConfig()?.grow_bed_count || 4, 
            this.app.getActiveGrowBeds(plantData)
        );
        const totalHarvested = this.app.calculateTotalHarvested(plantData);
        const lastHarvestDate = this.app.getLastHarvestDate(plantData);
        
        // Calculate unique crop varieties with remaining plants
        const uniqueCrops = new Set();
        batches.forEach((batch, key) => {
            const remaining = batch.planted - batch.harvested;
            if (remaining > 0) {
                // Extract crop type from the original data
                const batchId = key.split('-').slice(1).join('-');
                const bedId = key.split('-')[0];
                const batchEntry = plantData.find(e => 
                    e.batch_id === batchId && 
                    e.grow_bed_id == bedId && 
                    e.crop_type
                );
                if (batchEntry && batchEntry.crop_type) {
                    uniqueCrops.add(batchEntry.crop_type);
                }
            }
        });

        return {
            totalPlants,
            activeBatches,
            activeGrowBeds,
            totalHarvested,
            lastHarvestDate,
            uniqueCrops,
            batches
        };
    }

    /**
     * Update plant metrics display elements
     */
    updatePlantMetricsDisplay(plantMetrics) {
        const totalPlantsEl = document.getElementById('total-plants-growing');
        const totalHarvestedEl = document.getElementById('total-harvested');
        const activeGrowBedsEl = document.getElementById('active-grow-beds');
        const growingVarietiesEl = document.getElementById('growing-varieties');
        
        if (totalPlantsEl) totalPlantsEl.textContent = plantMetrics.totalPlants.toLocaleString();
        if (totalHarvestedEl) totalHarvestedEl.textContent = this.app.formatWeight(plantMetrics.totalHarvested);
        if (activeGrowBedsEl) activeGrowBedsEl.textContent = plantMetrics.activeGrowBeds;
        if (growingVarietiesEl) growingVarietiesEl.textContent = plantMetrics.uniqueCrops.size;
    }

    /**
     * Calculate grow bed capacity metrics
     */
    calculateBedCapacityMetrics(growBedsData, plantData) {
        if (!growBedsData || !Array.isArray(growBedsData)) {
            return {
                totalBeds: 0,
                utilizationPercent: 0,
                utilizationColor: '#666',
                availableSpace: 0,
                totalSpace: 0,
                occupiedSpace: 0
            };
        }

        const totalBeds = growBedsData.length;
        let totalSpace = 0;
        let occupiedSpace = 0;

        growBedsData.forEach(bed => {
            const bedArea = parseFloat(bed.area_m2) || 0;
            totalSpace += bedArea;
            
            // Check if bed has active plants
            const hasActivePlants = plantData.some(entry => 
                entry.grow_bed_id == bed.id && entry.new_seedlings > 0
            );
            
            if (hasActivePlants) {
                occupiedSpace += bedArea;
            }
        });

        const availableSpace = totalSpace - occupiedSpace;
        const utilizationPercent = totalSpace > 0 ? Math.round((occupiedSpace / totalSpace) * 100) : 0;
        
        let utilizationColor = '#666';
        if (utilizationPercent >= 80) utilizationColor = '#28a745'; // Green
        else if (utilizationPercent >= 50) utilizationColor = '#ffc107'; // Yellow
        else if (utilizationPercent >= 25) utilizationColor = '#fd7e14'; // Orange
        else utilizationColor = '#dc3545'; // Red

        return {
            totalBeds,
            utilizationPercent,
            utilizationColor,
            availableSpace: Math.round(availableSpace * 10) / 10, // Round to 1 decimal
            totalSpace: Math.round(totalSpace * 10) / 10,
            occupiedSpace: Math.round(occupiedSpace * 10) / 10
        };
    }

    /**
     * Clear container safely
     */
    clearContainer(container) {
        container.innerHTML = '';
        if (container.children.length > 0) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    }

    /**
     * Render the complete plant overview HTML
     */
    renderPlantOverviewHTML(plantMetrics, batchStats, bedCapacityStats, nutrientOverviewHtml) {
        return `
            <div class="plant-metrics-summary">
                <div class="metric-card clickable" onclick="window.app.navigateToTab('grow-beds-tab')" title="Click to view Plant Management" style="cursor: pointer;">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_number plants.svg" alt="Plants Growing" class="metric-icon-svg"></div>
                    <div class="metric-value">${plantMetrics.totalPlants}</div>
                    <div class="metric-label">Plants Growing</div>
                </div>
                
                <div class="metric-card clickable" onclick="window.app.navigateToTab('beds-overview-tab')" title="Click to view Beds Overview" style="cursor: pointer;">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_target.svg" alt="Active Batches" class="metric-icon-svg"></div>
                    <div class="metric-value">${batchStats.activeBatches}</div>
                    <div class="metric-label">Active Batches</div>
                </div>
                
                <div class="metric-card clickable" onclick="window.app.navigateToHarvestReady()" title="Click to view harvest ready batches" style="cursor: pointer;">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Ready for Harvest" class="metric-icon-svg"></div>
                    <div class="metric-value">${batchStats.readyForHarvest}</div>
                    <div class="metric-label">${batchStats.readyForHarvest === 0 ? 'No Batches Ready' : 'Ready for Harvest'}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Total Harvested" class="metric-icon-svg"></div>
                    <div class="metric-value">${this.app.formatWeight(plantMetrics.totalHarvested)}</div>
                    <div class="metric-label">Total Harvested</div>
                </div>
                
                <div class="metric-card clickable" onclick="window.app.navigateToTab('beds-overview-tab')" title="Click to view Beds Overview" style="cursor: pointer;">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Active Grow Beds" class="metric-icon-svg"></div>
                    <div class="metric-value">${plantMetrics.activeGrowBeds}</div>
                    <div class="metric-label">Active Grow Beds</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><img src="icons/new-icons/Afraponix Go Icons_crop.svg" alt="Crop Varieties" class="metric-icon-svg"></div>
                    <div class="metric-value">${plantMetrics.uniqueCrops.size}</div>
                    <div class="metric-label">Crop Varieties</div>
                </div>
            </div>
            
            <div class="grow-bed-capacity-stats">
                <div class="capacity-stat-card clickable" onclick="window.app.navigateToTab('beds-overview-tab')" title="Click to view Beds Overview">
                    <h4><img src="/icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Grow Beds" class="heading-icon" style="width: 1.2em; height: 1.2em; vertical-align: middle; margin-right: 0.5em;"> ${bedCapacityStats.totalBeds} Grow Beds</h4>
                    <div class="capacity-details">
                        <span class="bed-utilization" style="color: ${bedCapacityStats.utilizationColor}">
                            ${bedCapacityStats.utilizationPercent}% Utilized
                        </span>
                    </div>
                </div>
                
                <div class="capacity-stat-card clickable" onclick="window.app.navigateToTab('beds-overview-tab')" title="Click to view available space">
                    <h4>📐 ${bedCapacityStats.availableSpace}m² Available</h4>
                    <div class="capacity-details">
                        <span class="space-breakdown">
                            ${bedCapacityStats.totalSpace}m² total • ${bedCapacityStats.occupiedSpace}m² occupied
                        </span>
                    </div>
                </div>
            </div>
            
            ${nutrientOverviewHtml}
        `;
    }

    /**
     * Generate nutrient overview HTML with interactive cards
     */
    async generateNutrientOverview() {
        const html = `
            <div class="nutrient-overview-section">
                <h3><img src="/icons/new-icons/Afraponix Go Icons_chemistry.svg" alt="Nutrients" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> Current Nutrient Status</h3>
                <p style="color: #666; margin-bottom: 1rem;">
                    Real-time nutrient levels and plant health indicators for optimal growth conditions.
                </p>
                <div class="nutrient-cards-grid">
                    <div class="nutrient-card clickable-nutrient-card" onclick="app.openComprehensiveNutrientModal('nitrate')" title="Click for detailed nutrient information">
                        <h4>Nitrate (NO₃)</h4>
                        <div class="nutrient-status" id="nitrate-status">
                            <span class="status-indicator" id="nitrate-indicator">●</span>
                            <span class="status-text" id="nitrate-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-nitrate">Loading...</div>
                        <div class="chart-timestamp" id="plant-nitrate-chart-timestamp">Last updated: Loading...</div>
                    </div>
                    <div class="nutrient-card clickable-nutrient-card" onclick="app.openComprehensiveNutrientModal('phosphorus')" title="Click for detailed nutrient information">
                        <h4>Phosphorus (P)</h4>
                        <div class="nutrient-status" id="phosphorus-status">
                            <span class="status-indicator" id="phosphorus-indicator">●</span>
                            <span class="status-text" id="phosphorus-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-phosphorus">Loading...</div>
                        <div class="chart-timestamp" id="plant-phosphorus-chart-timestamp">Last updated: Loading...</div>
                    </div>
                    <div class="nutrient-card clickable-nutrient-card" onclick="app.openComprehensiveNutrientModal('potassium')" title="Click for detailed nutrient information">
                        <h4>Potassium (K)</h4>
                        <div class="nutrient-status" id="potassium-status">
                            <span class="status-indicator" id="potassium-indicator">●</span>
                            <span class="status-text" id="potassium-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-potassium">Loading...</div>
                        <div class="chart-timestamp" id="plant-potassium-chart-timestamp">Last updated: Loading...</div>
                    </div>
                    <div class="nutrient-card clickable-nutrient-card" onclick="app.openComprehensiveNutrientModal('iron')" title="Click for detailed nutrient information">
                        <h4>Iron (Fe)</h4>
                        <div class="nutrient-status" id="iron-status">
                            <span class="status-indicator" id="iron-indicator">●</span>
                            <span class="status-text" id="iron-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-iron">Loading...</div>
                        <div class="chart-timestamp" id="plant-iron-chart-timestamp">Last updated: Loading...</div>
                    </div>
                    <div class="nutrient-card clickable-nutrient-card" onclick="app.openComprehensiveNutrientModal('calcium')" title="Click for detailed nutrient information">
                        <h4>Calcium (Ca)</h4>
                        <div class="nutrient-status" id="calcium-status">
                            <span class="status-indicator" id="calcium-indicator">●</span>
                            <span class="status-text" id="calcium-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-calcium">Loading...</div>
                        <div class="chart-timestamp" id="plant-calcium-chart-timestamp">Last updated: Loading...</div>
                    </div>
                    <div class="nutrient-card">
                        <h4>EC/TDS</h4>
                        <div class="nutrient-status" id="ec-status">
                            <span class="status-indicator" id="ec-indicator">●</span>
                            <span class="status-text" id="ec-status-text">No data</span>
                        </div>
                        <div class="stat-value" id="plant-ec">Loading...</div>
                        <div class="chart-timestamp" id="plant-ec-chart-timestamp">Last updated: Loading...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Update nutrient data after a short delay to allow DOM rendering
        setTimeout(() => {
            this.app.updatePlantNutrientData().catch(console.error);
        }, 100);
        
        return html;
    }

    /**
     * Generate batch statistics for plant overview
     */
    generateBatchStatistics(plantData) {
        const batchMap = new Map();
        let readyForHarvest = 0;
        
        // FIRST PASS: Process planting records to create all batches
        plantData.forEach(record => {
            if (record.batch_id && record.new_seedlings > 0) {
                // This is a planting record
                if (!batchMap.has(record.batch_id)) {
                    batchMap.set(record.batch_id, {
                        batch_id: record.batch_id,
                        crop_type: record.crop_type,
                        seed_variety: record.seed_variety,
                        days_to_harvest: record.days_to_harvest,
                        planted_count: 0,
                        harvested_count: 0,
                        date_planted: record.date
                    });
                }
                
                const batch = batchMap.get(record.batch_id);
                batch.planted_count += record.new_seedlings || 0;
            }
        });
        
        // SECOND PASS: Process harvest records now that all batches exist
        plantData.forEach(record => {
            if (record.batch_id && (record.plants_harvested > 0 || record.harvest_weight > 0)) {
                // This is a harvest record
                if (batchMap.has(record.batch_id)) {
                    const batch = batchMap.get(record.batch_id);
                    batch.harvested_count += record.plants_harvested || 0;
                } else {
                    console.warn('Found harvest record for unknown batch:', record.batch_id);
                }
            }
        });
        
        // THIRD PASS: Check which batches are ready for harvest
        const currentDate = new Date();
        batchMap.forEach((batch, batchId) => {
            const remaining = batch.planted_count - batch.harvested_count;
            if (remaining > 0 && batch.days_to_harvest) {
                const plantedDate = new Date(batch.date_planted);
                const harvestDate = new Date(plantedDate.getTime() + (batch.days_to_harvest * 24 * 60 * 60 * 1000));
                
                if (currentDate >= harvestDate) {
                    readyForHarvest++;
                }
            }
        });

        return {
            activeBatches: batchMap.size,
            readyForHarvest,
            totalBatches: batchMap.size,
            batchDetails: Array.from(batchMap.values())
        };
    }

    /**
     * Debounced update method to prevent excessive re-renders
     */
    scheduleUpdate() {
        // Clear any pending render
        if (this.plantOverviewRenderTimeout) {
            clearTimeout(this.plantOverviewRenderTimeout);
        }
        
        // Schedule new render
        this.plantOverviewRenderTimeout = setTimeout(() => {
            this.renderPlantOverview().catch(console.error);
        }, 100); // Wait 100ms for more requests
    }

    /**
     * Generate comprehensive plant recommendations based on system data
     */
    generatePlantRecommendations(systemConfig, waterQuality, plantData) {
        const recommendations = [];
        
        // pH recommendations
        if (waterQuality?.ph) {
            if (waterQuality.ph < 6.0) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'pH Too Low',
                    content: 'Current pH is too acidic for most plants. Consider adding potassium hydroxide to raise pH to 6.0-7.0 range for optimal nutrient uptake.'
                });
            } else if (waterQuality.ph > 7.5) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'pH Too High',
                    content: 'Current pH is too alkaline. Consider adding phosphoric acid to lower pH to 6.0-7.0 range for better nutrient availability.'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    title: 'Optimal pH Range',
                    content: 'Your pH level is perfect for plant growth. Most nutrients are readily available at this range.'
                });
            }
        }
        
        // EC/TDS recommendations
        if (waterQuality?.ec) {
            if (waterQuality.ec < 400) {
                recommendations.push({
                    icon: '💡',
                    title: 'Low Nutrient Levels',
                    content: 'EC levels are low. Consider adding balanced hydroponic nutrients to support plant growth and development.'
                });
            } else if (waterQuality.ec > 1500) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Nutrient Concentration',
                    content: 'EC levels are high. Consider diluting with fresh water to prevent nutrient burn and salt buildup.'
                });
            }
        }
        
        // Temperature recommendations
        if (waterQuality?.temperature) {
            if (waterQuality.temperature < 15) {
                recommendations.push({
                    icon: '🌡️',
                    title: 'Cold Water Temperature',
                    content: 'Water temperature is low. Consider adding heating to improve nutrient uptake and growth rates.'
                });
            } else if (waterQuality.temperature > 30) {
                recommendations.push({
                    icon: '🌡️',
                    title: 'High Water Temperature',
                    content: 'Water temperature is high. Ensure adequate ventilation and consider cooling to prevent plant stress.'
                });
            }
        }
        
        // Plant-specific recommendations for aquaponics
        const activeCrops = [...new Set(plantData.map(item => item.crop_type).filter(Boolean))];
        if (activeCrops.length > 0) {
            recommendations.push({
                icon: '🌱',
                title: 'Crop Diversity',
                content: `You're growing ${activeCrops.join(', ')}. Consider mixing leafy greens with fruiting plants to balance nutrient uptake and maximize space efficiency.`
            });
        }
        
        // Growth bed utilization
        const activeGrowBeds = this.app.getActiveGrowBeds(plantData);
        const totalGrowBeds = systemConfig?.grow_bed_count || 4;
        if (activeGrowBeds < totalGrowBeds) {
            recommendations.push({
                icon: '📈',
                title: 'Expand Production',
                content: `You have ${totalGrowBeds - activeGrowBeds} unused grow beds. Consider planting fast-growing crops like lettuce or herbs to maximize yield.`
            });
        }
        
        // Harvest timing
        const readyPlants = plantData.filter(item => 
            item.growth_stage?.toLowerCase().includes('ready') || 
            item.growth_stage?.toLowerCase().includes('mature')
        );
        if (readyPlants.length > 0) {
            recommendations.push({
                icon: '🥬',
                title: 'Harvest Ready',
                content: `${readyPlants.length} plant entries show mature growth. Harvest soon for optimal quality and to make room for new plantings.`
            });
        }

        // Aquaponics-specific recommendations
        if (waterQuality?.dissolved_oxygen && waterQuality.dissolved_oxygen < 5.0) {
            recommendations.push({
                icon: '💨',
                title: 'Low Dissolved Oxygen',
                content: 'Low oxygen levels can stress both fish and plants. Increase aeration to improve root health and nutrient uptake.'
            });
        }

        // Iron deficiency recommendations
        if (waterQuality?.iron !== null && waterQuality?.iron !== undefined) {
            if (waterQuality.iron < 1.0) {
                recommendations.push({
                    icon: '🔴',
                    title: 'Iron Deficiency Risk',
                    content: 'Iron levels are low (< 1 ppm). Plants may develop yellowing between leaf veins (chlorosis). Consider adding chelated iron supplement to prevent deficiency.'
                });
            } else if (waterQuality.iron > 3.0) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Iron Levels',
                    content: 'Iron levels are high (> 3 ppm). Excessive iron can interfere with other nutrient uptake. Reduce iron supplementation and monitor plant health.'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    title: 'Optimal Iron Levels',
                    content: 'Iron levels are excellent (1-3 ppm). This supports healthy chlorophyll production and vibrant green growth.'
                });
            }
        }

        // Advanced nutrient ratio analysis
        this.addNutrientRatioRecommendations(recommendations, waterQuality, plantData);
        
        // System balance and density recommendations
        this.addSystemBalanceRecommendations(recommendations, systemConfig, plantData);
        
        return recommendations.length > 0 ? recommendations : [{
            icon: '🌿',
            title: 'Welcome to Plant Management',
            content: 'Start recording plant growth data to receive personalized recommendations for your aquaponics system.'
        }];
    }

    /**
     * Add advanced nutrient ratio analysis recommendations
     */
    addNutrientRatioRecommendations(recommendations, waterQuality, plantData) {
        // Potassium recommendations
        if (waterQuality?.potassium !== null && waterQuality?.potassium !== undefined) {
            if (waterQuality.potassium < 40) {
                recommendations.push({
                    icon: '🍌',
                    title: 'Low Potassium',
                    content: 'Potassium is low (< 40 ppm). This affects fruit development and plant immunity. Add potassium sulfate or increase fish feeding to boost levels.'
                });
            } else if (waterQuality.potassium > 70) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Potassium',
                    content: 'Potassium levels are high (> 70 ppm). While generally not toxic, monitor for potential salt buildup and ensure proper drainage.'
                });
            }
        }

        // Calcium recommendations
        if (waterQuality?.calcium !== null && waterQuality?.calcium !== undefined) {
            if (waterQuality.calcium < 50) {
                recommendations.push({
                    icon: '🦴',
                    title: 'Calcium Deficiency Risk',
                    content: 'Calcium is low (< 50 ppm). Plants may develop tip burn, blossom end rot, or weak stems. Add calcium chloride or crushed eggshells to boost levels.'
                });
            } else if (waterQuality.calcium > 100) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Calcium',
                    content: 'Calcium levels are high (> 100 ppm). This may interfere with magnesium and potassium uptake. Consider diluting with RO water.'
                });
            }
        }

        // Ca:K:Mg Ratio Analysis (Recommended 4:4:1)
        if (waterQuality?.calcium && waterQuality?.potassium && waterQuality?.magnesium) {
            const ca = waterQuality.calcium;
            const k = waterQuality.potassium;
            const mg = waterQuality.magnesium;
            
            // Calculate ratios relative to magnesium (normalize to Mg = 1)
            const caRatio = ca / mg;
            const kRatio = k / mg;
            
            // Check if ratios are close to ideal 4:4:1 (allow ±25% tolerance)
            const caIdeal = Math.abs(caRatio - 4) <= 1; // 3-5 range
            const kIdeal = Math.abs(kRatio - 4) <= 1; // 3-5 range
            
            if (caIdeal && kIdeal) {
                recommendations.push({
                    icon: '⚖️',
                    title: 'Excellent Ca:K:Mg Ratio',
                    content: `Perfect nutrient balance! Your Ca:K:Mg ratio is ${caRatio.toFixed(1)}:${kRatio.toFixed(1)}:1, very close to the ideal 4:4:1 ratio for optimal plant nutrition.`
                });
            } else {
                const issues = [];
                if (!caIdeal) {
                    if (caRatio < 3) issues.push(`Calcium too low (${caRatio.toFixed(1)} vs ideal 4)`);
                    else issues.push(`Calcium too high (${caRatio.toFixed(1)} vs ideal 4)`);
                }
                if (!kIdeal) {
                    if (kRatio < 3) issues.push(`Potassium too low (${kRatio.toFixed(1)} vs ideal 4)`);
                    else issues.push(`Potassium too high (${kRatio.toFixed(1)} vs ideal 4)`);
                }
                
                recommendations.push({
                    icon: '📊',
                    title: 'Ca:K:Mg Ratio Imbalance',
                    content: `Current ratio is ${caRatio.toFixed(1)}:${kRatio.toFixed(1)}:1 (ideal: 4:4:1). ${issues.join('. ')}. Balance these nutrients for optimal plant health.`
                });
            }
        }

        // N:K Ratio Analysis for Plant Types
        this.addNKRatioAnalysis(recommendations, waterQuality, plantData);
    }

    /**
     * Add N:K ratio analysis based on plant types
     */
    addNKRatioAnalysis(recommendations, waterQuality, plantData) {
        if (waterQuality?.nitrate && waterQuality?.potassium) {
            // Convert nitrate to nitrogen equivalent (NO3 to N conversion factor ~0.225)
            const nitrogen = waterQuality.nitrate * 0.225;
            const potassium = waterQuality.potassium;
            const nkRatio = nitrogen / potassium;
            
            // Determine plant types currently growing
            const activeCrops = [...new Set(plantData.map(item => item.crop_type).filter(Boolean))];
            const leafyGreens = ['lettuce', 'lettuce_batavian', 'lettuce_butter', 'lettuce_cos', 'lettuce_icty', 'lettuce_datem', 'lettuce_oak', 'spinach', 'kale', 'swiss_chard', 'arugula', 'watercress', 'basil', 'cilantro', 'parsley', 'celery'];
            const fruitingPlants = ['tomato', 'cucumber', 'pepper', 'strawberry', 'eggplant', 'okra', 'beans', 'peas'];
            
            const hasLeafyGreens = activeCrops.some(crop => leafyGreens.includes(crop.toLowerCase()));
            const hasFruitingPlants = activeCrops.some(crop => fruitingPlants.includes(crop.toLowerCase()));
            
            let idealRatioMin, idealRatioMax, plantTypeText;
            
            if (hasLeafyGreens && !hasFruitingPlants) {
                // Leafy greens: N:K ratio of 1:1 to 1:1.5
                idealRatioMin = 1.0;
                idealRatioMax = 1.5;
                plantTypeText = "leafy greens";
            } else if (hasFruitingPlants && !hasLeafyGreens) {
                // Fruiting plants: N:K ratio of 1:2 to 1:3
                idealRatioMin = 2.0;
                idealRatioMax = 3.0;
                plantTypeText = "fruiting plants";
            } else if (hasLeafyGreens && hasFruitingPlants) {
                // Mixed system: Use general aquaponics ratio
                idealRatioMin = 1.25;
                idealRatioMax = 2.0;
                plantTypeText = "mixed crops";
            } else {
                // No specific crops identified, use general aquaponics
                idealRatioMin = 1.25;
                idealRatioMax = 1.5;
                plantTypeText = "general aquaponics";
            }
            
            // Analyze the ratio (invert for N:K comparison since we calculate K/N)
            const kToNRatio = 1 / nkRatio;
            
            if (kToNRatio >= idealRatioMin && kToNRatio <= idealRatioMax) {
                recommendations.push({
                    icon: '🎯',
                    title: 'Excellent N:K Ratio',
                    content: `Perfect nutrient ratio for ${plantTypeText}! Your N:K ratio is 1:${kToNRatio.toFixed(1)} (ideal: 1:${idealRatioMin}-${idealRatioMax}). This balance supports optimal growth and development.`
                });
            } else if (kToNRatio < idealRatioMin) {
                recommendations.push({
                    icon: '📈',
                    title: 'N:K Ratio Imbalance - Low Potassium',
                    content: `Your N:K ratio is 1:${kToNRatio.toFixed(1)}, but ${plantTypeText} need 1:${idealRatioMin}-${idealRatioMax}. Increase potassium levels through fish feed adjustment or potassium supplements.`
                });
            } else {
                recommendations.push({
                    icon: '📉',
                    title: 'N:K Ratio Imbalance - High Potassium',
                    content: `Your N:K ratio is 1:${kToNRatio.toFixed(1)}, but ${plantTypeText} need 1:${idealRatioMin}-${idealRatioMax}. Consider reducing potassium inputs or increasing nitrogen availability.`
                });
            }
        }
    }

    /**
     * Add system balance and density recommendations
     */
    addSystemBalanceRecommendations(recommendations, systemConfig, plantData) {
        // Nutrient balance recommendations
        const waterQuality = this.app.getLatestWaterQualityData();
        if (waterQuality?.iron && waterQuality?.potassium && waterQuality?.calcium) {
            const ironOptimal = waterQuality.iron >= 1.0 && waterQuality.iron <= 3.0;
            const potassiumOptimal = waterQuality.potassium >= 40 && waterQuality.potassium <= 70;
            const calciumOptimal = waterQuality.calcium >= 50 && waterQuality.calcium <= 100;
            
            if (ironOptimal && potassiumOptimal && calciumOptimal) {
                recommendations.push({
                    icon: '🎯',
                    title: 'Perfect Nutrient Balance',
                    content: 'All measured nutrients (Iron, Potassium, Calcium) are in optimal ranges. Your plants should thrive with these levels!'
                });
            }
        }

        // Plant density recommendations
        const totalPlants = this.app.calculateTotalPlants(plantData);
        const totalGrowVolume = systemConfig?.total_grow_volume || 800;
        const plantDensity = totalPlants / (totalGrowVolume / 100); // plants per 100L
        
        if (plantDensity > 20) {
            recommendations.push({
                icon: '🌿',
                title: 'High Plant Density',
                content: 'Plant density is high. Consider spacing plants further apart to prevent competition for nutrients and ensure proper air circulation.'
            });
        } else if (plantDensity > 0 && plantDensity < 5) {
            recommendations.push({
                icon: '📈',
                title: 'Low Plant Density',
                content: 'You have room for more plants. Consider adding more leafy greens to maximize nutrient uptake from your fish waste.'
            });
        }

        // System balance recommendation
        const fishData = this.app.getLatestFishHealthData();
        if (fishData?.count && totalPlants > 0) {
            const fishToPlantRatio = fishData.count / totalPlants;
            if (fishToPlantRatio > 0.5) {
                recommendations.push({
                    icon: '⚖️',
                    title: 'System Balance',
                    content: 'High fish-to-plant ratio detected. Consider adding more plants to better utilize the nutrients produced by your fish.'
                });
            }
        }
    }

    /**
     * Generate comprehensive batch overview for plant management
     * Complexity: 44, Lines: 248
     */
    async generateBatchOverview(plantData) {
        const batchMap = new Map();
        
        // Get grow bed information for icons and types
        let growBeds = [];
        try {
            growBeds = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
        } catch (error) {
            console.error('Error fetching grow beds for batch overview:', error);
        }
        
        // Create a map for quick bed lookup
        const bedMap = new Map();
        growBeds.forEach(bed => {
            bedMap.set(bed.bed_number, bed);
        });
        
        // Build batch information - Two pass approach

        // First pass: Build all batches from planting records
        plantData.forEach(record => {
            if (record.batch_id && record.new_seedlings > 0) {
                // This is a planting record
                if (!batchMap.has(record.batch_id)) {
                    batchMap.set(record.batch_id, {
                        batch_id: record.batch_id,
                        crop_type: record.crop_type,
                        seed_variety: record.seed_variety || '',
                        days_to_harvest: record.days_to_harvest,
                        planted_count: 0,
                        harvested_count: 0,
                        date_planted: record.date,
                        grow_bed_id: record.grow_bed_id,
                        last_activity_date: record.date
                    });
                }
                
                const batch = batchMap.get(record.batch_id);
                batch.planted_count += record.new_seedlings || 0;
                
                // Ensure we use the earliest planting date for the batch
                if (!batch.date_planted || new Date(record.date) < new Date(batch.date_planted)) {
                    batch.date_planted = record.date;
                }
                
                // Update grow bed ID to the most recent one (in case batch was moved)
                if (new Date(record.date) >= new Date(batch.last_activity_date)) {
                    batch.grow_bed_id = record.grow_bed_id;
                    batch.last_activity_date = record.date;
                }
            }
        });
        
        // Second pass: Add harvest data to existing batches
        plantData.forEach(record => {
            if (record.batch_id && (record.plants_harvested > 0 || record.harvest_weight > 0)) {
                // This is a harvest record
                if (batchMap.has(record.batch_id)) {
                    const batch = batchMap.get(record.batch_id);
                    batch.harvested_count += record.plants_harvested || 0;
                    
                    // Update grow bed ID to the most recent one (in case batch was moved)
                    if (new Date(record.date) >= new Date(batch.last_activity_date)) {
                        batch.grow_bed_id = record.grow_bed_id;
                        batch.last_activity_date = record.date;
                    }
                }
            }
        });
        
        if (batchMap.size === 0) {
            return '<div class="batch-overview"><h3><img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Plant" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> Plant Batches</h3><div class="no-batch-data">No plant batches found. Start planting to see batch tracking information.</div></div>';
        }
        
        // Group batches by grow bed
        const batchesByBed = new Map();
        Array.from(batchMap.values()).forEach(batch => {
            const bedId = batch.grow_bed_id || 'unknown';
            if (!batchesByBed.has(bedId)) {
                batchesByBed.set(bedId, []);
            }
            batchesByBed.get(bedId).push(batch);
        });
        
        let batchHtml = `
            <div class="batch-overview">
                <div class="batch-overview-header">
                    <h3><img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Plant" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> Plant Batches</h3>
                    <div class="batch-header-actions">
                        <button id="export-batch-data" class="form-btn secondary" onclick="window.app.exportBatchData()">
                            <img src="/icons/new-icons/Afraponix Go Icons_data.svg" alt="Export" class="btn-icon-svg" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.5em;"> Export Batch Data
                        </button>
                    </div>
                </div>
        `;
        
        // Generate HTML for each grow bed
        const sortedBedIds = Array.from(batchesByBed.keys()).sort((a, b) => {
            if (a === 'unknown') return 1;
            if (b === 'unknown') return -1;
            return a - b;
        });
        
        sortedBedIds.forEach(bedId => {
            const batches = batchesByBed.get(bedId);
            
            const bedInfo = bedMap.get(parseInt(bedId));
            
            // Get bed display info
            let bedName, bedIcon, bedType;
            if (bedId === 'unknown') {
                bedName = 'Unknown Bed';
                bedIcon = '❓';
                bedType = 'Unknown';
            } else if (bedInfo) {
                bedName = bedInfo.bed_name || `Bed ${bedId}`;
                bedIcon = this.app.getBedTypeIcon(bedInfo.bed_type);
                bedType = this.app.getBedTypeDisplayName(bedInfo.bed_type);
            } else {
                // Try to find bed by ID in locally fetched growBeds data
                const bedById = growBeds.find(bed => bed.id == bedId);
                if (bedById) {
                    bedName = bedById.bed_name || `Bed ${bedById.bed_number}`;
                    bedIcon = this.app.getBedTypeIcon(bedById.bed_type);
                    bedType = this.app.getBedTypeDisplayName(bedById.bed_type);
                } else {
                    bedName = `Bed ${bedId}`;
                    bedIcon = '🛏️';
                    bedType = 'Unknown';
                }
            }
            
            // Sort batches within each bed by readiness and age
            const sortedBatches = batches.sort((a, b) => {
                const ageA = this.calculateBatchAge(a); // Pass full batch object
                const ageB = this.calculateBatchAge(b); // Pass full batch object
                
                const readyA = a.days_to_harvest && ageA >= a.days_to_harvest;
                const readyB = b.days_to_harvest && ageB >= b.days_to_harvest;
                
                if (readyA && !readyB) return -1;
                if (!readyA && readyB) return 1;
                
                return ageB - ageA;
            });
            
            // Count only active batches (with remaining plants)
            const activeBatchCount = batches.filter(batch => {
                const remainingPlants = batch.planted_count - batch.harvested_count;
                return remainingPlants > 0;
            }).length;
            
            batchHtml += `
                <div class="bed-batch-section">
                    <div class="bed-batch-header">
                        <div class="bed-info">
                            <h4>${bedIcon} ${bedName}</h4>
                            <span class="bed-type">${bedType}</span>
                        </div>
                        <span class="batch-count">${activeBatchCount} batch${activeBatchCount !== 1 ? 'es' : ''}</span>
                    </div>
                    <div class="batch-grid">
            `;
            
            sortedBatches.forEach(batch => {
                const age = this.calculateBatchAge(batch); // Pass the full batch object
                const isReady = batch.days_to_harvest && age >= batch.days_to_harvest;
                const progress = batch.days_to_harvest ? Math.min((age / batch.days_to_harvest) * 100, 100) : 0;
                const remainingPlants = batch.planted_count - batch.harvested_count;

                // Skip batches with no remaining plants (fully harvested)
                if (remainingPlants <= 0) {
                    return;
                }
                
                let statusClass = 'growing';
                let statusText = 'Growing';
                let statusIcon = '🌱';
                
                if (isReady && remainingPlants > 0) {
                    statusClass = 'ready';
                    statusText = 'Ready for Harvest';
                    statusIcon = '✅';
                } else if (remainingPlants === 0) {
                    statusClass = 'harvested';
                    statusText = 'Fully Harvested';
                    statusIcon = '✅';
                } else if (progress > 70) {
                    statusClass = 'approaching';
                    statusText = 'Approaching Harvest';
                    statusIcon = '🌿';
                }
                
                const variety = batch.seed_variety ? ` (${batch.seed_variety})` : '';
                const cleanCropName = this.app.cleanCustomCropName(batch.crop_type);
                
                batchHtml += `
                    <div class="batch-card ${statusClass}" data-batch-id="${batch.batch_id}" data-bed-id="${bedId}" data-render-id="${Date.now()}-${Math.random()}">
                        <div class="batch-header">
                            <div class="batch-id">${batch.batch_id}</div>
                            <div class="batch-status">${statusIcon} ${statusText}</div>
                        </div>
                        <div class="batch-details">
                            <div class="batch-crop">${cleanCropName}${variety}</div>
                            <div class="batch-stats">
                                <span class="batch-stat">
                                    <i class="stat-icon">📊</i>
                                    ${remainingPlants}/${batch.planted_count} plants
                                </span>
                                <span class="batch-stat">
                                    <i class="stat-icon">⏱️</i>
                                    ${age} days old
                                </span>
                            </div>
                        ${batch.days_to_harvest ? `
                            <div class="batch-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill ${statusClass}" style="width: ${progress}%"></div>
                                </div>
                                <div class="progress-text">${Math.round(progress)}% mature</div>
                            </div>
                        ` : ''}
                        ${remainingPlants > 0 ? `
                            <div class="batch-actions">
                                <button class="harvest-batch-btn" onclick="window.app.harvestBatch('${batch.batch_id}', '${batch.crop_type}', ${batch.grow_bed_id}, ${remainingPlants})" 
                                        title="Harvest this batch">
                                    🌾 Harvest
                                </button>
                                <button class="move-batch-btn" onclick="window.app.editBatchGrowBed('${batch.batch_id}', ${batch.grow_bed_id})" 
                                        title="Move batch to different grow bed">
                                    Move
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                `;
            });
            
            batchHtml += '</div></div>';
        });
        
        batchHtml += '</div>';
        
        return batchHtml;
    }

    /**
     * Calculate batch age in days from planting date
     */
    calculateBatchAge(batchIdOrBatch, currentDate = new Date()) {
        let batchDate;
        
        // Check if we received a batch object with date_planted
        if (typeof batchIdOrBatch === 'object' && batchIdOrBatch.date_planted) {
            // Use the actual planting date from the batch object
            batchDate = new Date(batchIdOrBatch.date_planted);
        } else {
            // Fallback to parsing the batch ID (for backward compatibility)
            const batchId = typeof batchIdOrBatch === 'string' ? batchIdOrBatch : batchIdOrBatch.batch_id;
            batchDate = this.app.parseBatchIdDate(batchId);
        }
        
        if (!batchDate) {
            return 0;
        }
        
        const diffTime = Math.abs(currentDate - batchDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            methodsExtracted: 4,
            isRendering: this.plantOverviewRendering,
            hasPendingUpdate: !!this.plantOverviewRenderTimeout,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Plant Management component');
        
        if (this.plantOverviewRenderTimeout) {
            clearTimeout(this.plantOverviewRenderTimeout);
            this.plantOverviewRenderTimeout = null;
        }
        
        this.plantOverviewRendering = false;
    }
}

// Export both class and create a factory function
export default PlantManagementComponent;

/**
 * Factory function to create plant management component
 */
export function createPlantManagementComponent(app) {
    return new PlantManagementComponent(app);
}