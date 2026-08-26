// Dashboard UI Component
// Coordinates dashboard display, tabs, navigation, and user interactions

import Dashboard from './dashboard.js';

/**
 * Dashboard UI Component
 * Main coordinator for all dashboard functionality - charts, tabs, navigation, and data display
 */
export class DashboardUIComponent {
    constructor(app) {
        this.app = app;
        this.dashboard = new Dashboard(app);
        this.isActive = false;
        this.tabEventHandlers = new Map();
        
        console.log('📊 Dashboard UI Component initialized (v2.0 - with mobile dropdown)');
    }

    /**
     * Initialize the dashboard UI component
     */
    async initialize() {
        this.setupDashboardTabs();
        this.setupDashboardActions();
        this.setupKeyboardShortcuts();
        this.dashboard.initialize();
        
        console.log('🎛️ Dashboard UI fully initialized');
    }

    /**
     * Show/activate the dashboard
     */
    async show() {
        console.log('📊 Activating dashboard UI');
        this.isActive = true;
        
        // Show the dashboard component
        await this.dashboard.show();
        
        // Ensure the overview tab is active by default
        this.activateDefaultTab();
        
        // Update dashboard data
        await this.refreshDashboard();
    }

    /**
     * Hide/deactivate the dashboard
     */
    hide() {
        console.log('📊 Deactivating dashboard UI');
        this.isActive = false;
        this.dashboard.hide();
    }

    /**
     * Setup dashboard tab navigation
     */
    setupDashboardTabs() {
        const dashboardTabs = document.querySelectorAll('.dashboard-tab');
        const dashboardContents = document.querySelectorAll('.dashboard-content');

        dashboardTabs.forEach(tab => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const targetContent = tab.id.replace('-tab', '-content');
                console.log(`🏷️ Switching to dashboard tab: ${targetContent}`);

                // Remove active from all tabs and contents
                dashboardTabs.forEach(t => t.classList.remove('active'));
                dashboardContents.forEach(c => c.classList.remove('active'));
                
                // Add active to selected tab and its content
                tab.classList.add('active');
                document.getElementById(targetContent)?.classList.add('active');
                
                // Handle tab-specific actions
                this.handleTabActivation(targetContent);
            };
            
            // Remove existing listeners to prevent duplicates
            if (this.tabEventHandlers.has(tab)) {
                tab.removeEventListener('click', this.tabEventHandlers.get(tab));
            }
            
            // Add new listener and store reference
            tab.addEventListener('click', handler);
            this.tabEventHandlers.set(tab, handler);
        });
        
        console.log('🏷️ Dashboard tabs configured');
    }

    /**
     * Handle specific tab activation logic
     */
    async handleTabActivation(tabContent) {
        try {
            switch (tabContent) {
                case 'dashboard-overview-content':
                    await this.handleOverviewTabActivation();
                    break;
                    
                case 'dashboard-plants-content':
                    await this.handlePlantsTabActivation();
                    break;
                    
                case 'dashboard-fish-content':
                    await this.handleFishTabActivation();
                    break;
                    
                case 'dashboard-water-content':
                    await this.handleWaterTabActivation();
                    break;
                    
                case 'dashboard-actions-content':
                    await this.handleActionsTabActivation();
                    break;
                    
                case 'dashboard-metrics-content':
                    await this.handleMetricsTabActivation();
                    break;
                    
                default:
                    console.log(`📊 No specific handler for tab: ${tabContent}`);
            }
        } catch (error) {
            console.error(`❌ Error handling tab activation for ${tabContent}:`, error);
        }
    }

    /**
     * Handle overview tab activation
     */
    async handleOverviewTabActivation() {
        console.log('📊 Activating overview tab');
        
        // Refresh charts and metrics
        await this.dashboard.refreshData();
        
        // Update system health badges if app method exists
        if (typeof this.app.updateSystemHealthBadges === 'function') {
            const displayData = await this.getLatestDisplayData();
            this.app.updateSystemHealthBadges(displayData);
        }
        
        // Update quick actions
        this.updateQuickActions();
        
        // Setup metric card click handlers
        this.setupMetricCardClickHandlers();
        
        // Setup dashboard mobile dropdown after content is loaded
        setTimeout(() => {
            console.log('🔧 Setting up dashboard mobile dropdown...');
            const mobileToggle = document.getElementById("dashboard-mobile-toggle");
            const mobileMenu = document.getElementById("dashboard-mobile-menu");
            const mobileOptions = document.querySelectorAll("#dashboard-mobile-menu .mobile-tab-option");
            const currentLabel = document.querySelector("#dashboard-mobile-toggle .mobile-tab-current");
            
            // Debug info only in development mode
            if (window.location.hostname === 'localhost') {
                console.log('🔍 Found dashboard elements:', {
                    mobileToggle: !!mobileToggle,
                    mobileMenu: !!mobileMenu,
                    mobileOptions: mobileOptions.length,
                    currentLabel: !!currentLabel
                });
            }
            
            if (mobileToggle && mobileMenu && mobileOptions.length > 0 && currentLabel) {
                // Clean up any existing listeners
                const newToggle = mobileToggle.cloneNode(true);
                mobileToggle.parentNode.replaceChild(newToggle, mobileToggle);
                
                // Get updated references
                const toggle = document.getElementById("dashboard-mobile-toggle");
                const menu = document.getElementById("dashboard-mobile-menu");
                const options = document.querySelectorAll("#dashboard-mobile-menu .mobile-tab-option");
                const label = document.querySelector("#dashboard-mobile-toggle .mobile-tab-current");
                
                // Toggle dropdown on button click
                toggle.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Mobile toggle clicked
                    
                    // Get button position for dynamic positioning
                    const rect = toggle.getBoundingClientRect();
                    const menuHeight = 200; // estimated
                    const viewportHeight = window.innerHeight;
                    
                    menu.style.position = 'fixed';
                    menu.style.left = rect.left + 'px';
                    menu.style.width = rect.width + 'px';
                    menu.style.zIndex = '1000';
                    
                    // Position above or below based on space
                    if (rect.bottom + menuHeight > viewportHeight) {
                        menu.style.bottom = (viewportHeight - rect.top) + 'px';
                        menu.style.top = 'auto';
                    } else {
                        menu.style.top = rect.bottom + 'px';
                        menu.style.bottom = 'auto';
                    }
                    
                    console.log('📍 Positioned dashboard dropdown at:', {
                        left: rect.left,
                        top: rect.bottom,
                        bottom: viewportHeight - rect.top,
                        width: rect.width
                    });
                    
                    toggle.classList.toggle("open");
                    menu.classList.toggle("show");
                    console.log('✅ Dashboard classes toggled');
                });
                
                // Handle option clicks
                options.forEach(option => {
                    option.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const targetContent = option.getAttribute("data-target");
                        const tabId = option.getAttribute("data-tab");
                        
                        // Dashboard mobile option clicked
                        
                        // Update current label
                        label.textContent = option.textContent;
                        
                        // Close dropdown
                        toggle.classList.remove("open");
                        menu.classList.remove("show");
                        
                        // Trigger the tab click
                        const targetTab = document.getElementById(tabId);
                        if (targetTab) {
                            targetTab.click();
                        }
                    });
                });
                
                // Close dropdown when clicking outside
                document.addEventListener("click", (e) => {
                    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                        toggle.classList.remove("open");
                        menu.classList.remove("show");
                    }
                });
                
                console.log('✅ Dashboard mobile dropdown setup complete');
            } else {
                // Only show warning in development mode - mobile dropdown is optional
                if (window.location.hostname === 'localhost' && window.location.search.includes('debug=mobile')) {
                    console.warn('⚠️ Dashboard mobile dropdown elements not found:', {
                        mobileToggle: !!mobileToggle,
                        mobileMenu: !!mobileMenu,
                        mobileOptions: mobileOptions.length,
                        currentLabel: !!currentLabel
                    });
                }
            }
        }, 100);
    }

    /**
     * Setup click handlers for metric cards on overview tab
     */
    setupMetricCardClickHandlers() {
        const metricCards = document.querySelectorAll('#dashboard-overview-content .metric-card[data-metric]');
        
        metricCards.forEach(card => {
            // Remove existing click handlers
            card.style.cursor = 'pointer';
            card.classList.add('clickable');
            
            // Add click handler
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const metric = card.getAttribute('data-metric');
                console.log('📊 Metric card clicked:', metric);
                
                if (typeof this.app.openDashboardChartModal === 'function') {
                    this.app.openDashboardChartModal(metric);
                } else {
                    console.warn('openDashboardChartModal function not available');
                }
            });
        });
        
        console.log(`📊 Setup click handlers for ${metricCards.length} metric cards`);
    }

    /**
     * Handle plants tab activation
     */
    async handlePlantsTabActivation() {
        console.log('🌱 Activating plants tab');
        
        // Update plant overview if method exists
        if (typeof this.app.updatePlantOverview === 'function') {
            await this.app.updatePlantOverview();
        }
        
        // Update grow bed summary
        if (typeof this.app.updateGrowBeds === 'function') {
            this.app.updateGrowBeds();
        }
    }

    /**
     * Handle fish tab activation
     */
    async handleFishTabActivation() {
        console.log('🐟 Activating fish tab');
        
        // Update fish overview
        if (typeof this.app.loadFishOverview === 'function') {
            await this.app.loadFishOverview();
        }
        
        // Update fish density charts
        if (typeof this.app.initializeFishDensityChart === 'function') {
            await this.app.initializeFishDensityChart();
        }
    }

    /**
     * Handle water tab activation
     */
    async handleWaterTabActivation() {
        console.log('💧 Activating water tab');
        
        // Update nutrient displays
        if (typeof this.app.updatePlantNutrientData === 'function') {
            await this.app.updatePlantNutrientData();
        }
        
        // Update water quality metrics
        if (typeof this.app.updateWaterQualityMetrics === 'function') {
            await this.app.updateWaterQualityMetrics();
        }
    }

    /**
     * Handle metrics tab activation
     */
    async handleMetricsTabActivation() {
        console.log('📊 Activating metrics tab');
        
        // Call the main app's loadMetricsTab function
        if (typeof this.app.loadMetricsTab === 'function') {
            await this.app.loadMetricsTab();
        }
    }

    /**
     * Handle actions tab activation
     */
    async handleActionsTabActivation() {
        console.log('⚡ Activating actions tab');
        
        // Load actions required if function exists
        if (typeof window.loadActionsRequired === 'function') {
            await window.loadActionsRequired();
        }
        
        // Update task recommendations
        this.updateTaskRecommendations();
    }

    /**
     * Setup dashboard action buttons and quick access features
     */
    setupDashboardActions() {
        // Setup quick action buttons
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                this.handleQuickAction(action, e);
            });
        });
        
        // Setup metric card click handlers for detailed views
        const metricCards = document.querySelectorAll('.metric-card[data-chart]');
        metricCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const chartType = card.dataset.chart;
                this.openDetailedChart(chartType);
            });
        });
        
        console.log('⚡ Dashboard actions configured');
    }

    /**
     * Handle quick action button clicks
     */
    handleQuickAction(action, event) {
        console.log(`⚡ Quick action triggered: ${action}`);
        
        try {
            switch (action) {
                case 'add-water-quality':
                    this.openWaterQualityModal();
                    break;
                    
                case 'add-plant-entry':
                    this.openPlantEntryModal();
                    break;
                    
                case 'add-fish-feeding':
                    this.openFishFeedingModal();
                    break;
                    
                case 'view-analytics':
                    this.openAnalyticsView();
                    break;
                    
                case 'export-data':
                    this.openExportDialog();
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown quick action: ${action}`);
            }
        } catch (error) {
            console.error(`❌ Error handling quick action ${action}:`, error);
            this.app.showNotification('Action failed. Please try again.', 'error');
        }
    }

    /**
     * Open detailed chart modal
     */
    openDetailedChart(chartType) {
        console.log(`📊 Opening detailed chart: ${chartType}`);
        
        // Delegate to app's chart modal function if it exists
        if (typeof this.app.openDashboardChartModal === 'function') {
            this.app.openDashboardChartModal(chartType);
        } else {
            console.warn('Chart modal function not available');
        }
    }

    /**
     * Open water quality entry modal
     */
    openWaterQualityModal() {
        // Find and trigger water quality button
        const waterBtn = document.querySelector('.action-btn[onclick*="Water Quality"]');
        if (waterBtn) {
            waterBtn.click();
        } else if (typeof this.app.openWaterQualityModal === 'function') {
            this.app.openWaterQualityModal();
        }
    }

    /**
     * Open plant entry modal
     */
    openPlantEntryModal() {
        // Navigate to plants tab and open planting modal
        this.app.navigateToPlants?.();
        setTimeout(() => {
            const plantBtn = document.querySelector('.action-btn[onclick*="Plant"]');
            if (plantBtn) plantBtn.click();
        }, 200);
    }

    /**
     * Open fish feeding modal
     */
    openFishFeedingModal() {
        // Navigate to fish tab and open feeding modal
        this.app.navigateToFish?.();
        setTimeout(() => {
            const feedBtn = document.querySelector('.action-btn[onclick*="Feeding"]');
            if (feedBtn) feedBtn.click();
        }, 200);
    }

    /**
     * Open analytics view
     */
    openAnalyticsView() {
        console.log('📈 Opening analytics view');
        // Could expand to dedicated analytics modal or tab
        this.app.showNotification('Analytics view coming soon!', 'info');
    }

    /**
     * Open export data dialog
     */
    openExportDialog() {
        console.log('💾 Opening export dialog');
        // Could expand to dedicated export functionality
        this.app.showNotification('Export functionality coming soon!', 'info');
    }

    /**
     * Setup keyboard shortcuts for dashboard
     */
    setupKeyboardShortcuts() {
        // Dashboard-specific shortcuts are handled in main app keyboard handler
        // This could be expanded for tab-specific shortcuts
        console.log('⌨️ Dashboard keyboard shortcuts ready');
    }

    /**
     * Activate the default dashboard tab
     */
    activateDefaultTab() {
        const overviewTab = document.getElementById('dashboard-overview-tab');
        if (overviewTab && !overviewTab.classList.contains('active')) {
            overviewTab.click();
        }
    }

    /**
     * Navigate to dashboard from external components
     */
    navigateTo() {
        console.log('🧭 Navigating to dashboard');
        
        const dashBtn = document.querySelector('[data-view="dashboard"]');
        if (dashBtn) {
            dashBtn.click();
        } else {
            console.warn('Dashboard navigation button not found');
        }
    }

    /**
     * Refresh the entire dashboard
     */
    async refreshDashboard() {
        if (!this.isActive) return;
        
        console.log('🔄 Refreshing dashboard data');
        
        try {
            // Refresh main dashboard data
            await this.dashboard.refreshData();
            
            // Update comprehensive dashboard from data manager
            if (typeof this.app.updateDashboardFromData === 'function') {
                await this.app.updateDashboardFromData();
            }
            
            console.log('✅ Dashboard refresh complete');
            
        } catch (error) {
            console.error('❌ Dashboard refresh failed:', error);
            this.app.showNotification('Failed to refresh dashboard data', 'error');
        }
    }

    /**
     * Update quick actions based on system state
     */
    updateQuickActions() {
        // Update action buttons based on current system state
        const hasActiveSystem = !!this.app.activeSystemId;
        
        const actionButtons = document.querySelectorAll('.quick-action-btn');
        actionButtons.forEach(button => {
            button.disabled = !hasActiveSystem;
            if (!hasActiveSystem) {
                button.title = 'Please select a system first';
            }
        });
    }

    /**
     * Update task recommendations
     */
    updateTaskRecommendations() {
        // This could be expanded to show intelligent task suggestions
        console.log('📋 Updating task recommendations');
    }

    /**
     * Get latest display data for health badges
     */
    async getLatestDisplayData() {
        try {
            if (!this.app.activeSystemId) return {};
            
            // Get latest sensor and nutrient data
            const sensorData = await this.app.dashboardManager?.getLatestSensorData() || {};
            const nutrientData = await this.app.getLatestNutrientValues?.() || {};
            
            // Combine data sources with sensor priority
            return this.app.dashboardManager?.combineDataSources(sensorData, nutrientData) || {};
            
        } catch (error) {
            console.error('❌ Failed to get latest display data:', error);
            return {};
        }
    }

    /**
     * Get dashboard component statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            tabHandlers: this.tabEventHandlers.size,
            dashboardStats: this.dashboard.getStats(),
            hasActiveSystem: !!this.app.activeSystemId
        };
    }

    /**
     * Destroy the dashboard UI component
     */
    destroy() {
        console.log('🧹 Destroying dashboard UI component');
        
        // Remove tab event handlers
        this.tabEventHandlers.forEach((handler, tab) => {
            tab.removeEventListener('click', handler);
        });
        this.tabEventHandlers.clear();
        
        // Destroy dashboard component
        this.dashboard.destroy();
        
        this.isActive = false;
        
        console.log('✅ Dashboard UI component destroyed');
    }
}

// Export both class and create a factory function
export default DashboardUIComponent;

/**
 * Factory function to create dashboard UI component
 */
export function createDashboardUIComponent(app) {
    return new DashboardUIComponent(app);
}