// Fish Tank Renderer Component
// Handles fish tank rendering, details generation, and display

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Fish Tank Renderer Component Class
 * Manages fish tank display, detail generation, and quick actions
 */
export class FishTankRendererComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🐟 Fish Tank Renderer Component initialized');
    }

    /**
     * Generate tank details HTML for fish overview
     * Complexity: 40, Lines: 164
     */
    generateTankDetails(systemConfig, inventoryTanks, actualTankCount) {
        let details = '';

        // Get individual tank configurations if available
        const tankConfigs = systemConfig.fish_tanks || [];
        
        for (let i = 1; i <= actualTankCount; i++) {
            // Try to find the specific tank configuration
            const tankConfig = tankConfigs.find(tank => tank.tank_number === i);
            let tankVolume = tankConfig?.volume_liters || null;

            // Fallback to calculating from total volume if no specific tank config
            if (!tankVolume && systemConfig.total_fish_volume && systemConfig.fish_tank_count > 0) {
                tankVolume = Math.round(systemConfig.total_fish_volume / systemConfig.fish_tank_count);
            }
            
            // Default fallback if still no volume (prevent NaN)
            if (!tankVolume || isNaN(tankVolume) || tankVolume <= 0) {
                tankVolume = 1000; // Default 1000L tank
            }
            
            const tankVolumeM3 = tankVolume / 1000;

            // Get fish inventory data specific to this tank
            // Match by tank_number first (display number 1-7), then fallback to fish_tank_id
            const tankInventory = inventoryTanks.find(tank => 
                tank.tank_number === i
            ) || inventoryTanks.find(tank => tank.fish_tank_id === i) || {};
            const fishCount = parseInt(tankInventory.current_count) || 0;
            const avgWeight = parseFloat(tankInventory.average_weight) || 0;

            // Use estimated weight if no actual weight data is available (same logic as main summary)
            let effectiveWeight = avgWeight;
            if (effectiveWeight === 0 && fishCount > 0) {
                const estimatedWeights = {
                    'tilapia': 250,  // 250g average for growing tilapia
                    'trout': 200,    // 200g average for growing trout  
                    'catfish': 300,  // 300g average for growing catfish
                    'salmon': 350,   // 350g average for growing salmon
                    'bass': 250      // 250g average for growing bass
                };
                effectiveWeight = estimatedWeights[systemConfig.fish_type?.toLowerCase()] || 250;
            }
            
            const dailyFeed = this.calculateDailyFeedAmount(fishCount, effectiveWeight, systemConfig.fish_type);
            
            // Calculate actual density for this tank using effective weight
            const tankBiomassKg = (fishCount * effectiveWeight) / 1000; // Convert grams to kg
            const actualDensity = tankBiomassKg / tankVolumeM3; // kg/m³
            
            // Get recommended density based on fish type
            const recommendedDensity = this.app.getRecommendedStockingDensity(systemConfig.fish_type);
            
            // Determine density status
            let densityStatus = 'good';
            let densityColor = '#28a745'; // green
            if (actualDensity > recommendedDensity * 1.2) {
                densityStatus = 'high';
                densityColor = '#dc3545'; // red
            } else if (actualDensity > recommendedDensity * 1.05) {
                densityStatus = 'moderate';
                densityColor = '#ffc107'; // yellow
            }

            const biomass = tankBiomassKg.toFixed(1);
            
            // Determine tank status based on fish count and health
            let statusClass = 'status-good';
            let statusIcon = '🟢';
            let statusText = 'Healthy';
            
            if (fishCount === 0) {
                statusClass = 'status-empty';
                statusIcon = '⚪';
                statusText = 'Empty';
            } else if (actualDensity > recommendedDensity * 1.2) {
                statusClass = 'status-warning';
                statusIcon = '🔴';
                statusText = 'Overstocked';
            } else if (actualDensity > recommendedDensity * 1.05) {
                statusClass = 'status-caution';
                statusIcon = '🟡';
                statusText = 'Near Capacity';
            }
            
            // Calculate density percentage for visual indicator
            const maxRecommendedDensity = recommendedDensity || 30; // kg/m³
            let densityPercentage = (actualDensity / maxRecommendedDensity) * 100;
            densityPercentage = Math.min(Math.max(densityPercentage, 0), 100); // Clamp between 0 and 100
            const isOverstocked = actualDensity > maxRecommendedDensity;
            
            // Status badge text without emoji
            let statusBadgeText = 'HEALTHY';
            if (fishCount === 0) {
                statusBadgeText = 'EMPTY';
            } else if (actualDensity > recommendedDensity * 1.2) {
                statusBadgeText = 'OVERSTOCKED';
            } else if (actualDensity > recommendedDensity * 1.05) {
                statusBadgeText = 'NEAR CAPACITY';
            }
            
            details += `
                <div class="modern-tank-card overview-tank" data-tank-number="${i}">
                    <div class="card-header">
                        <div class="tank-title">
                            <span>Tank ${i}</span>
                            <div class="status-badge">
                                <div class="status-dot"></div>
                                <span>${statusBadgeText}</span>
                            </div>
                        </div>
                        <div class="volume-info">Volume: ${(tankVolume / 1000).toFixed(1)}m³</div>
                        <div class="tank-actions-header">
                            <button onclick="app.toggleTankDetailsQuickActions(${i})" class="quick-action-btn" title="Quick Actions">
                                <img src="icons/new-icons/Afraponix Go Icons_more.svg" alt="Actions" style="width: 1em; height: 1em;">
                            </button>
                            <!-- Quick Actions Menu positioned relative to button -->
                            <div id="tank-quick-actions-${i}" class="tank-quick-actions" style="display: none;">
                                <div class="quick-actions-menu">
                                    <button onclick="app.showAddFishModal(${i})" class="quick-action-item" title="Add new fish to this tank and update inventory">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                        </svg>
                                        Add Fish
                                    </button>
                                    <button onclick="app.showFeedingModal(${i})" class="quick-action-item" title="Record feeding activity including feed type and amount">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        Record Feeding
                                    </button>
                                    <button onclick="app.showMortalityModal(${i})" class="quick-action-item" title="Record fish deaths and update tank inventory counts">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        Record Mortality
                                    </button>
                                    <button onclick="app.openFishHealthDataCapture()" class="quick-action-item" title="Log comprehensive health observations and behavioral data">
                                        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                        </svg>
                                        Log Health Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="primary-metrics">
                            <div class="metric">
                                <div class="metric-value">${fishCount}</div>
                                <div class="metric-label">Fish Count</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${biomass}</div>
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
                                <div class="metric-row-value">${effectiveWeight}g</div>
                            </div>
                            <div class="metric-row">
                                <div class="metric-row-label">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                    Daily Feed
                                </div>
                                <div class="metric-row-value">${dailyFeed}g</div>
                            </div>
                            <div class="metric-row">
                                <div class="metric-row-label">
                                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M4 4h16v12H4V4m0-2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4m0 16v4h16v-4H4m8 2h4v2h-4v-2z"/>
                                    </svg>
                                    Density
                                </div>
                                <div class="metric-row-value">${actualDensity.toFixed(1)} kg/m³</div>
                            </div>
                            <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; position: relative;">
                                <div style="width: ${densityPercentage.toFixed(1)}%; background: ${isOverstocked ? '#ef4444' : '#22c55e'}; height: 8px; position: absolute; left: 0; top: 0;"></div>
                            </div>
                            <div class="recommendation">Recommended: ${maxRecommendedDensity} kg/m³</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return details;
    }

    /**
     * Calculate daily feed amount based on fish data
     */
    calculateDailyFeedAmount(fishCount, avgWeight, fishType) {
        if (fishCount === 0 || avgWeight === 0) return 0;
        
        // Calculate total biomass in grams
        const totalBiomass = fishCount * avgWeight;
        
        // Feed rate as percentage of biomass (varies by fish type and size)
        let feedRate = 0.025; // 2.5% default
        
        // Adjust feed rate based on fish type
        const feedRates = {
            'tilapia': 0.03,    // 3% for tilapia (higher metabolism)
            'trout': 0.025,     // 2.5% for trout
            'catfish': 0.02,    // 2% for catfish (lower metabolism)
            'salmon': 0.025,    // 2.5% for salmon
            'bass': 0.025       // 2.5% for bass
        };
        
        if (fishType && feedRates[fishType.toLowerCase()]) {
            feedRate = feedRates[fishType.toLowerCase()];
        }
        
        // Adjust feed rate based on average weight (smaller fish eat more as % of body weight)
        if (avgWeight < 100) {
            feedRate *= 1.5; // 50% more for fingerlings
        } else if (avgWeight < 200) {
            feedRate *= 1.2; // 20% more for juveniles
        }
        
        return Math.round(totalBiomass * feedRate);
    }

    /**
     * Toggle quick actions menu for tank
     */
    async toggleQuickActions(tankNumber) {
        return this.app.toggleQuickActions(tankNumber);
    }

    /**
     * Create floating quick actions menu
     */
    createFloatingQuickActionsMenu(tankNumber) {
        return this.app.createFloatingQuickActionsMenu(tankNumber);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            hasActiveSystem: !!this.app.activeSystemId
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Fish Tank Renderer component');
    }
}

// Export both class and create a factory function
export default FishTankRendererComponent;

/**
 * Factory function to create fish tank renderer component
 */
export function createFishTankRendererComponent(app) {
    return new FishTankRendererComponent(app);
}