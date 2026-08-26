// Comprehensive Crop Allocation Manager Component
// Advanced plant allocation, batch tracking, visual bed layouts, and optimization

import { BaseManagerComponent } from './baseManager.js';
import { PlantsAPI } from '../api/index.js';
import { API_ENDPOINTS, HTTP_METHODS } from '../constants/index.js';

/**
 * Comprehensive Crop Allocation Manager Component
 * Provides professional plant allocation capabilities with drag-and-drop interface,
 * batch tracking, visual bed layouts, recommendations, and optimization
 */
export class CropAllocationManagerComponent extends BaseManagerComponent {
    constructor(app) {
        super(app, 'CropAllocationManager');
        
        // Core data stores
        this.cropAllocations = new Map();
        this.plantBatches = new Map();
        this.growBeds = new Map();
        this.customCrops = new Map();
        this.allocationHistory = new Map();
        
        // UI state management
        this.selectedBeds = new Set();
        this.draggedAllocation = null;
        this.viewMode = 'grid'; // grid, visual, timeline
        this.filterSettings = {
            cropType: 'all',
            bedStatus: 'all',
            season: 'all',
            readyForHarvest: false
        };
        
        // Advanced features
        this.recommendations = [];
        this.optimizationSuggestions = [];
        this.performanceMetrics = {};
        
        // Bind methods for event handlers
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleBedClick = this.handleBedClick.bind(this);
        
        this.log('🌾 Comprehensive Crop Allocation Manager initialized');
    }

    /**
     * Initialize the component with all data and UI
     */
    async onInitialize() {
        try {
            // Initialize API reference
            this.api = PlantsAPI;
            
            // Load initial data
            await this.loadAllData();
            
            // Initialize UI components
            this.setupEventListeners();
            this.setupDragAndDrop();
            
            // Generate initial recommendations
            await this.generateRecommendations();
            
            this.log('✅ Crop Allocation Manager fully initialized');
        } catch (error) {
            this.logError('Failed to initialize Crop Allocation Manager', error);
            throw error;
        }
    }

    /**
     * Load all necessary data for the allocation manager
     */
    async loadAllData() {
        if (!this.app.activeSystemId) {
            this.log('⚠️ No active system selected');
            return;
        }

        const loadOperations = [
            this.loadData('cropAllocations', () => this.fetchPlantAllocations()),
            this.loadData('plantBatches', () => this.fetchPlantBatches()),
            this.loadData('growBeds', () => this.fetchGrowBeds()),
            this.loadData('customCrops', () => this.fetchCustomCrops()),
            this.loadData('plantData', () => this.fetchPlantData())
        ];

        await Promise.all(loadOperations);
        this.processLoadedData();
    }

    /**
     * Fetch plant allocations from API
     */
    async fetchPlantAllocations() {
        try {
            const response = await this.makeApiCall(`/plants/allocations/${this.app.activeSystemId}`);
            return Array.isArray(response) ? response : response.allocations || [];
        } catch (error) {
            this.logError('Error fetching plant allocations', error);
            return [];
        }
    }

    /**
     * Fetch plant batches with comprehensive data
     */
    async fetchPlantBatches() {
        try {
            const response = await this.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`);
            return this.processBatchData(response || []);
        } catch (error) {
            this.logError('Error fetching plant batches', error);
            return [];
        }
    }

    /**
     * Fetch grow beds with capacity information
     */
    async fetchGrowBeds() {
        try {
            const response = await this.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logError('Error fetching grow beds', error);
            return [];
        }
    }

    /**
     * Fetch custom crops
     */
    async fetchCustomCrops() {
        try {
            const response = await this.makeApiCall(`/custom-crops/system/${this.app.activeSystemId}`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logError('Error fetching custom crops', error);
            return [];
        }
    }

    /**
     * Fetch plant growth data
     */
    async fetchPlantData() {
        try {
            const response = await this.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logError('Error fetching plant data', error);
            return [];
        }
    }

    /**
     * Process batch data to create batch tracking information
     */
    processBatchData(plantData) {
        const batches = new Map();
        const currentDate = new Date();

        plantData.forEach(record => {
            if (!record.batch_id) return;

            const batchId = record.batch_id;
            if (!batches.has(batchId)) {
                batches.set(batchId, {
                    batchId,
                    cropType: record.crop_type,
                    seedVariety: record.seed_variety,
                    growBedId: record.grow_bed_id,
                    planted: 0,
                    harvested: 0,
                    remaining: 0,
                    plantedDate: record.date,
                    lastActivity: record.date,
                    daysToHarvest: record.days_to_harvest,
                    status: 'growing',
                    health: record.health || 'good',
                    growthStage: record.growth_stage,
                    plantSpacing: record.plant_spacing,
                    records: []
                });
            }

            const batch = batches.get(batchId);
            batch.records.push(record);

            // Update batch data
            if (record.new_seedlings > 0) {
                batch.planted += record.new_seedlings;
                if (!batch.plantedDate || record.date < batch.plantedDate) {
                    batch.plantedDate = record.date;
                }
            }

            if (record.plants_harvested > 0) {
                batch.harvested += record.plants_harvested;
            }

            if (record.date > batch.lastActivity) {
                batch.lastActivity = record.date;
                batch.growBedId = record.grow_bed_id; // Latest bed location
                batch.health = record.health || batch.health;
                batch.growthStage = record.growth_stage || batch.growthStage;
            }
        });

        // Calculate remaining plants and determine status
        batches.forEach((batch, batchId) => {
            batch.remaining = batch.planted - batch.harvested;
            
            if (batch.remaining <= 0) {
                batch.status = 'harvested';
            } else if (batch.daysToHarvest) {
                const plantedDate = new Date(batch.plantedDate);
                const daysSincePlanting = Math.floor((currentDate - plantedDate) / (1000 * 60 * 60 * 24));
                
                if (daysSincePlanting >= batch.daysToHarvest) {
                    batch.status = 'ready';
                } else if (daysSincePlanting >= batch.daysToHarvest * 0.8) {
                    batch.status = 'approaching';
                } else {
                    batch.status = 'growing';
                }
            }
        });

        return Array.from(batches.values());
    }

    /**
     * Process all loaded data into Maps for efficient access
     */
    processLoadedData() {
        // Process allocations
        const allocations = this.getData('cropAllocations') || [];
        this.cropAllocations.clear();
        allocations.forEach(allocation => {
            this.cropAllocations.set(allocation.id, allocation);
        });

        // Process batches
        const batches = this.getData('plantBatches') || [];
        this.plantBatches.clear();
        batches.forEach(batch => {
            this.plantBatches.set(batch.batchId, batch);
        });

        // Process grow beds
        const beds = this.getData('growBeds') || [];
        this.growBeds.clear();
        beds.forEach(bed => {
            this.growBeds.set(bed.id, {
                ...bed,
                allocations: [],
                batches: [],
                utilization: 0,
                availableSpace: bed.area_m2 || 0
            });
        });

        // Process custom crops
        const crops = this.getData('customCrops') || [];
        this.customCrops.clear();
        crops.forEach(crop => {
            this.customCrops.set(crop.id, crop);
        });

        // Link allocations to beds
        this.cropAllocations.forEach(allocation => {
            const bed = this.growBeds.get(allocation.grow_bed_id);
            if (bed) {
                bed.allocations.push(allocation);
                bed.utilization += parseFloat(allocation.percentage_allocated || 0);
                bed.availableSpace = Math.max(0, 100 - bed.utilization);
            }
        });

        // Link batches to beds
        this.plantBatches.forEach(batch => {
            const bed = this.growBeds.get(batch.growBedId);
            if (bed) {
                bed.batches.push(batch);
            }
        });

        this.log(`📊 Processed data: ${this.cropAllocations.size} allocations, ${this.plantBatches.size} batches, ${this.growBeds.size} beds`);
    }

    /**
     * Generate the main allocation management interface
     */
    async generateInterface() {
        const container = document.getElementById('allocation-management-content');
        if (!container) {
            this.logWarning('Allocation management container not found');
            return;
        }

        if (!this.app.activeSystemId) {
            this.displayNoSystemMessage(container);
            return;
        }

        container.innerHTML = this.buildMainInterface();
        
        // Initialize all UI components
        await this.initializeInterface();
    }

    /**
     * Display no system selected message
     */
    displayNoSystemMessage(container) {
        container.innerHTML = `
            <div class="no-system-allocation">
                <div class="no-system-icon">
                    <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="No System" 
                         style="width: 64px; height: 64px; opacity: 0.5;">
                </div>
                <h3>No System Selected</h3>
                <p>Please select or create an aquaponics system to manage crop allocations and plant batches.</p>
                <div class="no-system-actions">
                    <button class="btn-primary" onclick="app.showSystemCreationWizard()">
                        <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="Add" class="btn-icon"> 
                        Create New System
                    </button>
                    <button class="btn-secondary" onclick="app.showSystemSelector()">
                        <img src="/icons/new-icons/Afraponix Go Icons_list.svg" alt="List" class="btn-icon"> 
                        Select Existing System
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Build the main interface HTML
     */
    buildMainInterface() {
        return `
            <div class="crop-allocation-manager">
                <!-- Header with controls -->
                <div class="allocation-header">
                    <div class="allocation-title">
                        <h2>
                            <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Crop Allocation" class="title-icon">
                            Crop Allocation Manager
                        </h2>
                        <div class="allocation-subtitle">
                            Manage plant allocations, track batches, and optimize growing space
                        </div>
                    </div>
                    
                    <div class="allocation-controls">
                        <div class="view-mode-selector">
                            <button class="view-btn active" data-view="grid" title="Grid View">
                                <img src="/icons/new-icons/Afraponix Go Icons_grid.svg" alt="Grid" class="btn-icon">
                            </button>
                            <button class="view-btn" data-view="visual" title="Visual Layout">
                                <img src="/icons/new-icons/Afraponix Go Icons_layout.svg" alt="Visual" class="btn-icon">
                            </button>
                            <button class="view-btn" data-view="timeline" title="Timeline View">
                                <img src="/icons/new-icons/Afraponix Go Icons_calendar.svg" alt="Timeline" class="btn-icon">
                            </button>
                        </div>
                        
                        <div class="allocation-actions">
                            <button class="btn-success" onclick="app.cropAllocationManager.showNewAllocationWizard()">
                                <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="Add" class="btn-icon">
                                New Allocation
                            </button>
                            <button class="btn-secondary" onclick="app.cropAllocationManager.showBatchManager()">
                                <img src="/icons/new-icons/Afraponix Go Icons_batch.svg" alt="Batches" class="btn-icon">
                                Manage Batches
                            </button>
                            <button class="btn-info" onclick="app.cropAllocationManager.showRecommendations()">
                                <img src="/icons/new-icons/Afraponix Go Icons_lightbulb.svg" alt="Tips" class="btn-icon">
                                Recommendations
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Filter and search bar -->
                <div class="allocation-filters">
                    <div class="filter-section">
                        <div class="filter-group">
                            <label>Crop Type:</label>
                            <select id="crop-filter" class="filter-select">
                                <option value="all">All Crops</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Bed Status:</label>
                            <select id="bed-status-filter" class="filter-select">
                                <option value="all">All Beds</option>
                                <option value="available">Available Space</option>
                                <option value="full">Fully Allocated</option>
                                <option value="over">Over-allocated</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Season:</label>
                            <select id="season-filter" class="filter-select">
                                <option value="all">All Seasons</option>
                                <option value="spring">Spring</option>
                                <option value="summer">Summer</option>
                                <option value="autumn">Autumn</option>
                                <option value="winter">Winter</option>
                                <option value="year_round">Year Round</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="ready-harvest-filter">
                                <span class="checkmark"></span>
                                Ready for Harvest Only
                            </label>
                        </div>
                    </div>
                    
                    <div class="search-section">
                        <div class="search-box">
                            <input type="text" id="allocation-search" placeholder="Search allocations, batches, crops...">
                            <img src="/icons/new-icons/Afraponix Go Icons_search.svg" alt="Search" class="search-icon">
                        </div>
                        <button class="btn-outline" onclick="app.cropAllocationManager.clearFilters()">
                            Clear Filters
                        </button>
                    </div>
                </div>

                <!-- Summary dashboard -->
                <div class="allocation-summary-dashboard">
                    <div id="allocation-metrics" class="allocation-metrics">
                        <!-- Metrics will be populated here -->
                    </div>
                    <div id="quick-recommendations" class="quick-recommendations">
                        <!-- Quick recommendations will be populated here -->
                    </div>
                </div>

                <!-- Main content area -->
                <div class="allocation-content">
                    <div id="allocation-view-container" class="allocation-view-container">
                        <!-- Dynamic content based on view mode -->
                    </div>
                </div>

                <!-- Modals and overlays -->
                ${this.buildModalsHTML()}
            </div>
        `;
    }

    /**
     * Build modals HTML
     */
    buildModalsHTML() {
        return `
            <!-- New Allocation Wizard Modal -->
            <div id="new-allocation-modal" class="modal allocation-modal" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>
                            <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="New" class="modal-icon">
                            New Crop Allocation
                        </h3>
                        <button class="close-btn" onclick="app.cropAllocationManager.hideNewAllocationWizard()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="allocation-wizard-content">
                            <!-- Wizard content will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Batch Manager Modal -->
            <div id="batch-manager-modal" class="modal batch-modal" style="display: none;">
                <div class="modal-content extra-large">
                    <div class="modal-header">
                        <h3>
                            <img src="/icons/new-icons/Afraponix Go Icons_batch.svg" alt="Batches" class="modal-icon">
                            Plant Batch Manager
                        </h3>
                        <button class="close-btn" onclick="app.cropAllocationManager.hideBatchManager()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="batch-manager-content">
                            <!-- Batch manager content will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recommendations Modal -->
            <div id="recommendations-modal" class="modal recommendations-modal" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>
                            <img src="/icons/new-icons/Afraponix Go Icons_lightbulb.svg" alt="Recommendations" class="modal-icon">
                            Smart Recommendations
                        </h3>
                        <button class="close-btn" onclick="app.cropAllocationManager.hideRecommendations()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="recommendations-content">
                            <!-- Recommendations will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Allocation Details Modal -->
            <div id="allocation-details-modal" class="modal details-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>
                            <img src="/icons/new-icons/Afraponix Go Icons_details.svg" alt="Details" class="modal-icon">
                            Allocation Details
                        </h3>
                        <button class="close-btn" onclick="app.cropAllocationManager.hideAllocationDetails()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="allocation-details-content">
                            <!-- Allocation details will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize the interface after HTML is inserted
     */
    async initializeInterface() {
        try {
            // Setup event listeners for UI controls
            this.setupViewModeSelector();
            this.setupFilters();
            
            // Load and display content
            await this.updateSummaryDashboard();
            await this.updateAllocationView();
            
            // Setup drag and drop for visual mode
            this.setupDragAndDrop();
            
            this.log('✅ Interface initialized successfully');
        } catch (error) {
            this.logError('Failed to initialize interface', error);
        }
    }

    /**
     * Setup view mode selector
     */
    setupViewModeSelector() {
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                // Remove active class from all buttons
                viewButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                e.target.closest('.view-btn').classList.add('active');
                
                // Update view mode
                this.viewMode = e.target.closest('.view-btn').dataset.view;
                this.updateAllocationView();
            });
        });
    }

    /**
     * Setup filter event listeners
     */
    setupFilters() {
        const filterElements = [
            'crop-filter',
            'bed-status-filter', 
            'season-filter',
            'ready-harvest-filter',
            'allocation-search'
        ];

        filterElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                this.addEventListener(element, eventType, () => {
                    this.updateFilterSettings();
                    this.updateAllocationView();
                });
            }
        });
    }

    /**
     * Update filter settings from UI
     */
    updateFilterSettings() {
        const cropFilter = document.getElementById('crop-filter');
        const bedStatusFilter = document.getElementById('bed-status-filter');
        const seasonFilter = document.getElementById('season-filter');
        const readyHarvestFilter = document.getElementById('ready-harvest-filter');
        const searchInput = document.getElementById('allocation-search');

        this.filterSettings = {
            cropType: cropFilter?.value || 'all',
            bedStatus: bedStatusFilter?.value || 'all',
            season: seasonFilter?.value || 'all',
            readyForHarvest: readyHarvestFilter?.checked || false,
            searchTerm: searchInput?.value?.toLowerCase() || ''
        };
    }

    /**
     * Update summary dashboard with current metrics
     */
    async updateSummaryDashboard() {
        const metricsContainer = document.getElementById('allocation-metrics');
        const recommendationsContainer = document.getElementById('quick-recommendations');
        
        if (!metricsContainer || !recommendationsContainer) return;

        // Calculate metrics
        const metrics = this.calculateAllocationMetrics();
        
        // Display metrics
        metricsContainer.innerHTML = this.buildMetricsHTML(metrics);
        
        // Display quick recommendations
        recommendationsContainer.innerHTML = this.buildQuickRecommendationsHTML();
    }

    /**
     * Calculate allocation metrics
     */
    calculateAllocationMetrics() {
        const totalBeds = this.growBeds.size;
        const totalAllocations = this.cropAllocations.size;
        const activeBatches = Array.from(this.plantBatches.values()).filter(b => b.status !== 'harvested').length;
        
        let totalUtilization = 0;
        let overAllocatedBeds = 0;
        let availableBeds = 0;
        let readyForHarvest = 0;

        this.growBeds.forEach(bed => {
            totalUtilization += bed.utilization;
            if (bed.utilization > 100) overAllocatedBeds++;
            if (bed.utilization < 80) availableBeds++;
        });

        this.plantBatches.forEach(batch => {
            if (batch.status === 'ready') readyForHarvest++;
        });

        return {
            totalBeds,
            totalAllocations,
            activeBatches,
            averageUtilization: totalBeds > 0 ? (totalUtilization / totalBeds).toFixed(1) : 0,
            overAllocatedBeds,
            availableBeds,
            readyForHarvest,
            uniqueCrops: new Set(Array.from(this.cropAllocations.values()).map(a => a.crop_type)).size
        };
    }

    /**
     * Build metrics HTML
     */
    buildMetricsHTML(metrics) {
        return `
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Beds">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.totalBeds}</div>
                        <div class="metric-label">Total Grow Beds</div>
                    </div>
                </div>
                
                <div class="metric-card success">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Allocations">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.totalAllocations}</div>
                        <div class="metric-label">Active Allocations</div>
                    </div>
                </div>
                
                <div class="metric-card info">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_batch.svg" alt="Batches">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.activeBatches}</div>
                        <div class="metric-label">Active Batches</div>
                    </div>
                </div>
                
                <div class="metric-card ${metrics.averageUtilization >= 80 ? 'warning' : metrics.averageUtilization >= 60 ? 'success' : 'secondary'}">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_chart.svg" alt="Utilization">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.averageUtilization}%</div>
                        <div class="metric-label">Avg Utilization</div>
                    </div>
                </div>
                
                <div class="metric-card ${metrics.readyForHarvest > 0 ? 'warning' : 'secondary'}">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Harvest">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.readyForHarvest}</div>
                        <div class="metric-label">Ready to Harvest</div>
                    </div>
                </div>
                
                <div class="metric-card ${metrics.availableBeds > 0 ? 'success' : 'secondary'}">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_available.svg" alt="Available">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.availableBeds}</div>
                        <div class="metric-label">Available Beds</div>
                    </div>
                </div>
                
                <div class="metric-card secondary">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_crop.svg" alt="Crops">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.uniqueCrops}</div>
                        <div class="metric-label">Crop Varieties</div>
                    </div>
                </div>
                
                <div class="metric-card ${metrics.overAllocatedBeds > 0 ? 'danger' : 'success'}">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_warning.svg" alt="Over-allocated">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${metrics.overAllocatedBeds}</div>
                        <div class="metric-label">Over-allocated</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build quick recommendations HTML
     */
    buildQuickRecommendationsHTML() {
        const quickTips = this.generateQuickRecommendations();
        
        if (quickTips.length === 0) {
            return `
                <div class="quick-recommendations-header">
                    <h4>
                        <img src="/icons/new-icons/Afraponix Go Icons_lightbulb.svg" alt="Tips" class="section-icon">
                        Quick Tips
                    </h4>
                </div>
                <div class="no-recommendations">
                    <p>✅ All systems optimal! Check back later for new recommendations.</p>
                </div>
            `;
        }

        return `
            <div class="quick-recommendations-header">
                <h4>
                    <img src="/icons/new-icons/Afraponix Go Icons_lightbulb.svg" alt="Tips" class="section-icon">
                    Quick Tips
                </h4>
                <button class="btn-link" onclick="app.cropAllocationManager.showRecommendations()">
                    View All
                </button>
            </div>
            <div class="quick-tips-list">
                ${quickTips.slice(0, 3).map(tip => `
                    <div class="quick-tip ${tip.priority}">
                        <div class="tip-icon">${tip.icon}</div>
                        <div class="tip-content">
                            <div class="tip-title">${tip.title}</div>
                            <div class="tip-description">${tip.description}</div>
                        </div>
                        ${tip.action ? `
                            <button class="tip-action" onclick="${tip.action}">
                                ${tip.actionText || 'Fix'}
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Generate quick recommendations
     */
    generateQuickRecommendations() {
        const recommendations = [];
        const currentDate = new Date();

        // Check for beds with available space
        this.growBeds.forEach(bed => {
            if (bed.utilization < 60 && bed.utilization >= 0) {
                recommendations.push({
                    priority: 'low',
                    icon: '📈',
                    title: 'Underutilized Bed',
                    description: `${bed.bed_name || `Bed ${bed.bed_number}`} is only ${bed.utilization.toFixed(1)}% utilized`,
                    action: `app.cropAllocationManager.showNewAllocationWizard(${bed.id})`,
                    actionText: 'Add Crops'
                });
            }
        });

        // Check for ready to harvest batches
        this.plantBatches.forEach(batch => {
            if (batch.status === 'ready' && batch.remaining > 0) {
                recommendations.push({
                    priority: 'high',
                    icon: '🌾',
                    title: 'Ready for Harvest',
                    description: `${this.cleanCropName(batch.cropType)} batch has ${batch.remaining} plants ready`,
                    action: `app.harvestBatch('${batch.batchId}')`,
                    actionText: 'Harvest'
                });
            }
        });

        // Check for over-allocated beds
        this.growBeds.forEach(bed => {
            if (bed.utilization > 100) {
                recommendations.push({
                    priority: 'medium',
                    icon: '⚠️',
                    title: 'Over-allocated Bed',
                    description: `${bed.bed_name || `Bed ${bed.bed_number}`} is ${bed.utilization.toFixed(1)}% allocated`,
                    action: `app.cropAllocationManager.showBedDetails(${bed.id})`,
                    actionText: 'Review'
                });
            }
        });

        // Sort by priority
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    /**
     * Update allocation view based on current mode
     */
    async updateAllocationView() {
        const container = document.getElementById('allocation-view-container');
        if (!container) return;

        this.setLoading('updateView', true);

        try {
            switch (this.viewMode) {
                case 'grid':
                    container.innerHTML = await this.buildGridView();
                    break;
                case 'visual':
                    container.innerHTML = await this.buildVisualView();
                    this.initializeVisualInteractions();
                    break;
                case 'timeline':
                    container.innerHTML = await this.buildTimelineView();
                    break;
                default:
                    container.innerHTML = await this.buildGridView();
            }

            // Apply filters after view is built
            this.applyCurrentFilters();

        } catch (error) {
            this.logError('Failed to update allocation view', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Failed to load allocation view. Please try again.</p>
                    <button class="btn-primary" onclick="app.cropAllocationManager.updateAllocationView()">
                        Retry
                    </button>
                </div>
            `;
        } finally {
            this.setLoading('updateView', false);
        }
    }

    /**
     * Build grid view HTML
     */
    async buildGridView() {
        const filteredBeds = this.getFilteredBeds();
        
        if (filteredBeds.length === 0) {
            return this.buildEmptyStateHTML();
        }

        let html = '<div class="allocation-grid">';
        
        filteredBeds.forEach(bed => {
            html += this.buildBedCard(bed);
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Build bed card HTML
     */
    buildBedCard(bed) {
        const utilizationClass = bed.utilization > 100 ? 'over-allocated' : 
                                bed.utilization >= 80 ? 'high-utilization' :
                                bed.utilization >= 40 ? 'medium-utilization' : 'low-utilization';

        const activeBatches = bed.batches.filter(b => b.status !== 'harvested');
        const readyBatches = bed.batches.filter(b => b.status === 'ready');

        return `
            <div class="bed-card ${utilizationClass}" data-bed-id="${bed.id}">
                <div class="bed-card-header">
                    <div class="bed-info">
                        <h3>${bed.bed_name || `Bed ${bed.bed_number}`}</h3>
                        <div class="bed-type">${this.getBedTypeDisplay(bed.bed_type)}</div>
                    </div>
                    <div class="bed-utilization">
                        <div class="utilization-circle ${utilizationClass}">
                            <span class="utilization-percentage">${bed.utilization.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div class="bed-capacity">
                    <div class="capacity-bar">
                        <div class="capacity-fill ${utilizationClass}" 
                             style="width: ${Math.min(bed.utilization, 100)}%"></div>
                    </div>
                    <div class="capacity-details">
                        <span class="area">${bed.area_m2 ? `${bed.area_m2}m²` : 'Area not set'}</span>
                        <span class="available">${bed.availableSpace.toFixed(0)}% available</span>
                    </div>
                </div>

                <div class="bed-allocations">
                    ${bed.allocations.length > 0 ? `
                        <div class="allocations-list">
                            ${bed.allocations.map(allocation => `
                                <div class="allocation-item" data-allocation-id="${allocation.id}">
                                    <div class="allocation-crop">
                                        <img src="/icons/new-icons/Afraponix Go Icons_crop.svg" alt="Crop" class="crop-icon">
                                        <span class="crop-name">${this.cleanCropName(allocation.crop_type)}</span>
                                    </div>
                                    <div class="allocation-percentage">${allocation.percentage_allocated}%</div>
                                    <div class="allocation-actions">
                                        <button class="btn-icon" onclick="app.cropAllocationManager.editAllocation(${allocation.id})" title="Edit">
                                            <img src="/icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit">
                                        </button>
                                        <button class="btn-icon btn-danger" onclick="app.cropAllocationManager.deleteAllocation(${allocation.id})" title="Delete">
                                            <img src="/icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete">
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="no-allocations">No crops allocated</div>'}
                </div>

                <div class="bed-batches">
                    ${activeBatches.length > 0 ? `
                        <div class="batch-summary">
                            <div class="batch-count">${activeBatches.length} active batch${activeBatches.length !== 1 ? 'es' : ''}</div>
                            ${readyBatches.length > 0 ? `
                                <div class="ready-harvest">${readyBatches.length} ready for harvest</div>
                            ` : ''}
                        </div>
                    ` : '<div class="no-batches">No active batches</div>'}
                </div>

                <div class="bed-actions">
                    <button class="btn-success btn-sm" onclick="app.cropAllocationManager.showNewAllocationWizard(${bed.id})">
                        <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="Add" class="btn-icon"> 
                        Add Crop
                    </button>
                    <button class="btn-secondary btn-sm" onclick="app.cropAllocationManager.showBedDetails(${bed.id})">
                        <img src="/icons/new-icons/Afraponix Go Icons_details.svg" alt="Details" class="btn-icon"> 
                        Details
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Build visual layout view HTML
     */
    async buildVisualView() {
        const filteredBeds = this.getFilteredBeds();
        
        if (filteredBeds.length === 0) {
            return this.buildEmptyStateHTML();
        }

        let html = `
            <div class="visual-layout">
                <div class="layout-header">
                    <h3>System Layout</h3>
                    <div class="layout-legend">
                        <div class="legend-item">
                            <div class="legend-color available"></div>
                            <span>Available</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color allocated"></div>
                            <span>Allocated</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color over-allocated"></div>
                            <span>Over-allocated</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color ready-harvest"></div>
                            <span>Ready to Harvest</span>
                        </div>
                    </div>
                </div>
                
                <div class="layout-grid" id="layout-grid">
        `;

        // Create a grid representation of the grow beds
        filteredBeds.forEach(bed => {
            html += this.buildVisualBedElement(bed);
        });

        html += `
                </div>
                
                <div class="visual-controls">
                    <button class="btn-secondary" onclick="app.cropAllocationManager.resetLayoutView()">
                        <img src="/icons/new-icons/Afraponix Go Icons_refresh.svg" alt="Reset" class="btn-icon">
                        Reset View
                    </button>
                    <button class="btn-info" onclick="app.cropAllocationManager.optimizeLayout()">
                        <img src="/icons/new-icons/Afraponix Go Icons_optimize.svg" alt="Optimize" class="btn-icon">
                        Optimize Layout
                    </button>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Build visual bed element
     */
    buildVisualBedElement(bed) {
        const hasReadyHarvest = bed.batches.some(b => b.status === 'ready');
        const visualClass = bed.utilization > 100 ? 'over-allocated' :
                           hasReadyHarvest ? 'ready-harvest' :
                           bed.utilization > 0 ? 'allocated' : 'available';

        return `
            <div class="visual-bed ${visualClass}" 
                 data-bed-id="${bed.id}" 
                 draggable="true"
                 onclick="app.cropAllocationManager.showBedDetails(${bed.id})">
                <div class="bed-visual-header">
                    <div class="bed-number">${bed.bed_number || bed.id}</div>
                    <div class="bed-utilization">${bed.utilization.toFixed(0)}%</div>
                </div>
                
                <div class="bed-visual-body">
                    <div class="bed-name">${bed.bed_name || `Bed ${bed.bed_number}`}</div>
                    <div class="bed-area">${bed.area_m2 ? `${bed.area_m2}m²` : ''}</div>
                    
                    ${bed.allocations.length > 0 ? `
                        <div class="visual-crops">
                            ${bed.allocations.map(allocation => `
                                <div class="visual-crop" style="height: ${allocation.percentage_allocated}%">
                                    <span class="crop-label">${this.cleanCropName(allocation.crop_type)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-bed">
                            <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="Add" class="add-icon">
                            <span>Click to add crops</span>
                        </div>
                    `}
                </div>
                
                ${hasReadyHarvest ? `
                    <div class="harvest-indicator">
                        <img src="/icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Ready" class="harvest-icon">
                        <span>Ready to harvest</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Build timeline view HTML
     */
    async buildTimelineView() {
        const timelineData = this.generateTimelineData();
        
        if (timelineData.length === 0) {
            return this.buildEmptyStateHTML();
        }

        let html = `
            <div class="timeline-view">
                <div class="timeline-header">
                    <h3>Planting & Harvest Timeline</h3>
                    <div class="timeline-controls">
                        <button class="btn-secondary" onclick="app.cropAllocationManager.showTimelineSettings()">
                            <img src="/icons/new-icons/Afraponix Go Icons_settings.svg" alt="Settings" class="btn-icon">
                            Settings
                        </button>
                    </div>
                </div>
                
                <div class="timeline-container">
                    <div class="timeline-axis">
                        ${this.buildTimelineAxis()}
                    </div>
                    
                    <div class="timeline-content">
        `;

        timelineData.forEach(item => {
            html += this.buildTimelineItem(item);
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate timeline data from batches
     */
    generateTimelineData() {
        const timeline = [];
        const currentDate = new Date();
        const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));

        this.plantBatches.forEach(batch => {
            const plantedDate = new Date(batch.plantedDate);
            
            // Add planting event
            if (plantedDate >= thirtyDaysAgo) {
                timeline.push({
                    type: 'planted',
                    date: plantedDate,
                    batch: batch,
                    title: `Planted ${this.cleanCropName(batch.cropType)}`,
                    description: `${batch.planted} plants in ${this.getBedName(batch.growBedId)}`
                });
            }

            // Add harvest events
            if (batch.daysToHarvest && batch.remaining > 0) {
                const harvestDate = new Date(plantedDate.getTime() + (batch.daysToHarvest * 24 * 60 * 60 * 1000));
                
                if (harvestDate <= thirtyDaysFromNow) {
                    timeline.push({
                        type: 'harvest',
                        date: harvestDate,
                        batch: batch,
                        title: `Harvest ${this.cleanCropName(batch.cropType)}`,
                        description: `${batch.remaining} plants ready in ${this.getBedName(batch.growBedId)}`,
                        isReady: harvestDate <= currentDate
                    });
                }
            }
        });

        return timeline.sort((a, b) => a.date - b.date);
    }

    /**
     * Build timeline axis
     */
    buildTimelineAxis() {
        const currentDate = new Date();
        const days = [];
        
        // Generate 30 days before and after current date
        for (let i = -30; i <= 30; i++) {
            const date = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000));
            days.push(date);
        }

        return days.map(date => {
            const isToday = date.toDateString() === currentDate.toDateString();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return `
                <div class="timeline-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">
                    <div class="day-label">${date.getDate()}</div>
                    <div class="day-month">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Build timeline item
     */
    buildTimelineItem(item) {
        const isOverdue = item.type === 'harvest' && item.isReady && item.batch.remaining > 0;
        const itemClass = `timeline-item ${item.type} ${isOverdue ? 'overdue' : ''}`;

        return `
            <div class="${itemClass}" data-batch-id="${item.batch.batchId}">
                <div class="timeline-marker">
                    <div class="marker-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_${item.type === 'planted' ? 'plant' : 'harvest'}.svg" alt="${item.type}">
                    </div>
                </div>
                
                <div class="timeline-content-item">
                    <div class="timeline-date">
                        ${item.date.toLocaleDateString()}
                        ${isOverdue ? '<span class="overdue-badge">Overdue</span>' : ''}
                    </div>
                    <div class="timeline-title">${item.title}</div>
                    <div class="timeline-description">${item.description}</div>
                    
                    ${item.type === 'harvest' && item.isReady ? `
                        <div class="timeline-actions">
                            <button class="btn-success btn-sm" onclick="app.harvestBatch('${item.batch.batchId}')">
                                <img src="/icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Harvest" class="btn-icon">
                                Harvest Now
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Build empty state HTML
     */
    buildEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="No Data" style="width: 64px; height: 64px; opacity: 0.5;">
                </div>
                <h3>No Crop Allocations Found</h3>
                <p>Start by creating your first crop allocation to track plant growth and optimize space usage.</p>
                <div class="empty-state-actions">
                    <button class="btn-primary" onclick="app.cropAllocationManager.showNewAllocationWizard()">
                        <img src="/icons/new-icons/Afraponix Go Icons_plus.svg" alt="Add" class="btn-icon">
                        Create First Allocation
                    </button>
                    <button class="btn-secondary" onclick="app.cropAllocationManager.showRecommendations()">
                        <img src="/icons/new-icons/Afraponix Go Icons_lightbulb.svg" alt="Tips" class="btn-icon">
                        Get Started Tips
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered beds based on current filter settings
     */
    getFilteredBeds() {
        let filtered = Array.from(this.growBeds.values());

        // Apply crop type filter
        if (this.filterSettings.cropType !== 'all') {
            filtered = filtered.filter(bed => 
                bed.allocations.some(alloc => alloc.crop_type === this.filterSettings.cropType)
            );
        }

        // Apply bed status filter
        if (this.filterSettings.bedStatus !== 'all') {
            filtered = filtered.filter(bed => {
                switch (this.filterSettings.bedStatus) {
                    case 'available':
                        return bed.utilization < 80;
                    case 'full':
                        return bed.utilization >= 80 && bed.utilization <= 100;
                    case 'over':
                        return bed.utilization > 100;
                    default:
                        return true;
                }
            });
        }

        // Apply season filter
        if (this.filterSettings.season !== 'all') {
            filtered = filtered.filter(bed =>
                bed.allocations.some(alloc => 
                    !alloc.planting_season || 
                    alloc.planting_season === this.filterSettings.season ||
                    alloc.planting_season === 'year_round'
                )
            );
        }

        // Apply ready for harvest filter
        if (this.filterSettings.readyForHarvest) {
            filtered = filtered.filter(bed =>
                bed.batches.some(batch => batch.status === 'ready')
            );
        }

        // Apply search term
        if (this.filterSettings.searchTerm) {
            const searchTerm = this.filterSettings.searchTerm.toLowerCase();
            filtered = filtered.filter(bed => {
                const bedName = (bed.bed_name || `Bed ${bed.bed_number}`).toLowerCase();
                const cropTypes = bed.allocations.map(a => a.crop_type.toLowerCase());
                const batchTypes = bed.batches.map(b => b.cropType.toLowerCase());
                
                return bedName.includes(searchTerm) ||
                       cropTypes.some(crop => crop.includes(searchTerm)) ||
                       batchTypes.some(crop => crop.includes(searchTerm));
            });
        }

        return filtered;
    }

    /**
     * Apply current filters to the view
     */
    applyCurrentFilters() {
        // Update filter dropdowns with available options
        this.updateFilterDropdowns();
        
        // Show/hide filtered elements if needed
        this.updateVisibilityBasedOnFilters();
    }

    /**
     * Update filter dropdown options
     */
    updateFilterDropdowns() {
        const cropFilter = document.getElementById('crop-filter');
        if (cropFilter) {
            const currentValue = cropFilter.value;
            const allCrops = new Set();
            
            this.cropAllocations.forEach(allocation => {
                allCrops.add(allocation.crop_type);
            });

            let options = '<option value="all">All Crops</option>';
            Array.from(allCrops).sort().forEach(crop => {
                const cleanName = this.cleanCropName(crop);
                options += `<option value="${crop}">${cleanName}</option>`;
            });

            cropFilter.innerHTML = options;
            cropFilter.value = currentValue;
        }
    }

    /**
     * Update visibility based on current filters
     */
    updateVisibilityBasedOnFilters() {
        // This method can be enhanced to hide/show specific elements
        // based on filters without rebuilding the entire view
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        // This will be implemented for visual mode
        this.log('🎯 Drag and drop functionality ready');
    }

    /**
     * Initialize visual interactions for visual layout mode
     */
    initializeVisualInteractions() {
        const visualBeds = document.querySelectorAll('.visual-bed');
        
        visualBeds.forEach(bed => {
            this.addEventListener(bed, 'dragstart', this.handleDragStart);
            this.addEventListener(bed, 'dragover', this.handleDragOver);
            this.addEventListener(bed, 'drop', this.handleDrop);
            this.addEventListener(bed, 'click', this.handleBedClick);
        });
    }

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        this.draggedAllocation = {
            bedId: e.target.dataset.bedId,
            element: e.target
        };
        e.target.classList.add('dragging');
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        e.target.closest('.visual-bed')?.classList.add('drag-over');
    }

    /**
     * Handle drop
     */
    handleDrop(e) {
        e.preventDefault();
        const targetBed = e.target.closest('.visual-bed');
        
        if (targetBed && this.draggedAllocation) {
            const targetBedId = parseInt(targetBed.dataset.bedId);
            const sourceBedId = parseInt(this.draggedAllocation.bedId);
            
            if (targetBedId !== sourceBedId) {
                this.handleAllocationMove(sourceBedId, targetBedId);
            }
        }

        // Clean up drag state
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        this.draggedAllocation = null;
    }

    /**
     * Handle bed click in visual mode
     */
    handleBedClick(e) {
        if (!this.draggedAllocation) {
            const bedId = parseInt(e.target.closest('.visual-bed').dataset.bedId);
            this.showBedDetails(bedId);
        }
    }

    /**
     * Handle allocation move between beds
     */
    async handleAllocationMove(sourceBedId, targetBedId) {
        try {
            // Implementation would go here to move allocations
            this.log(`Moving allocation from bed ${sourceBedId} to bed ${targetBedId}`);
            
            // Show confirmation dialog
            const confirmed = await this.showConfirmDialog(
                'Move Allocation',
                'Are you sure you want to move this allocation to a different bed?'
            );

            if (confirmed) {
                // Implement the move logic
                await this.moveAllocationToBed(sourceBedId, targetBedId);
                this.showNotification('Allocation moved successfully', 'success');
                this.updateAllocationView();
            }
        } catch (error) {
            this.logError('Failed to move allocation', error);
            this.showNotification('Failed to move allocation', 'error');
        }
    }

    /**
     * Generate comprehensive recommendations
     */
    async generateRecommendations() {
        this.setLoading('recommendations', true);

        try {
            const recommendations = [];

            // Bed utilization recommendations
            recommendations.push(...this.generateUtilizationRecommendations());
            
            // Harvest timing recommendations
            recommendations.push(...this.generateHarvestRecommendations());
            
            // Crop rotation recommendations
            recommendations.push(...this.generateRotationRecommendations());
            
            // Space optimization recommendations
            recommendations.push(...this.generateOptimizationRecommendations());

            this.recommendations = recommendations;
            this.log(`Generated ${recommendations.length} recommendations`);

        } catch (error) {
            this.logError('Failed to generate recommendations', error);
        } finally {
            this.setLoading('recommendations', false);
        }
    }

    /**
     * Generate utilization recommendations
     */
    generateUtilizationRecommendations() {
        const recommendations = [];

        this.growBeds.forEach(bed => {
            if (bed.utilization < 50) {
                recommendations.push({
                    id: `utilization-${bed.id}`,
                    type: 'utilization',
                    priority: 'medium',
                    title: 'Underutilized Grow Bed',
                    description: `${bed.bed_name || `Bed ${bed.bed_number}`} is only ${bed.utilization.toFixed(1)}% utilized. Consider adding more crops to maximize space usage.`,
                    action: 'add_crops',
                    bedId: bed.id,
                    impact: 'medium',
                    category: 'space_optimization'
                });
            } else if (bed.utilization > 100) {
                recommendations.push({
                    id: `over-allocation-${bed.id}`,
                    type: 'over_allocation',
                    priority: 'high',
                    title: 'Over-allocated Grow Bed',
                    description: `${bed.bed_name || `Bed ${bed.bed_number}`} is ${bed.utilization.toFixed(1)}% allocated, which may lead to overcrowding and poor plant health.`,
                    action: 'reduce_allocation',
                    bedId: bed.id,
                    impact: 'high',
                    category: 'plant_health'
                });
            }
        });

        return recommendations;
    }

    /**
     * Generate harvest recommendations
     */
    generateHarvestRecommendations() {
        const recommendations = [];
        const currentDate = new Date();

        this.plantBatches.forEach(batch => {
            if (batch.status === 'ready' && batch.remaining > 0) {
                const daysOverdue = batch.daysToHarvest ? 
                    Math.floor((currentDate - new Date(batch.plantedDate)) / (1000 * 60 * 60 * 24)) - batch.daysToHarvest : 0;

                recommendations.push({
                    id: `harvest-${batch.batchId}`,
                    type: 'harvest',
                    priority: daysOverdue > 7 ? 'critical' : 'high',
                    title: 'Ready for Harvest',
                    description: `${this.cleanCropName(batch.cropType)} batch has ${batch.remaining} plants ready for harvest${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''}.`,
                    action: 'harvest_batch',
                    batchId: batch.batchId,
                    impact: 'high',
                    category: 'harvest_timing'
                });
            }
        });

        return recommendations;
    }

    /**
     * Generate crop rotation recommendations
     */
    generateRotationRecommendations() {
        const recommendations = [];
        
        // Analyze crop diversity and rotation opportunities
        const cropFrequency = new Map();
        this.cropAllocations.forEach(allocation => {
            const count = cropFrequency.get(allocation.crop_type) || 0;
            cropFrequency.set(allocation.crop_type, count + 1);
        });

        // Suggest diversification if too many beds have the same crop
        cropFrequency.forEach((count, cropType) => {
            if (count > this.growBeds.size * 0.6) {
                recommendations.push({
                    id: `diversify-${cropType}`,
                    type: 'diversification',
                    priority: 'medium',
                    title: 'Consider Crop Diversification',
                    description: `${this.cleanCropName(cropType)} is planted in ${count} beds. Diversifying crops can improve pest resistance and soil health.`,
                    action: 'diversify_crops',
                    cropType: cropType,
                    impact: 'medium',
                    category: 'crop_management'
                });
            }
        });

        return recommendations;
    }

    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations() {
        const recommendations = [];

        // Check for inefficient plant spacing
        this.cropAllocations.forEach(allocation => {
            if (allocation.plant_spacing && allocation.plant_spacing > 50) {
                const bed = this.growBeds.get(allocation.grow_bed_id);
                if (bed && bed.utilization < 70) {
                    recommendations.push({
                        id: `spacing-${allocation.id}`,
                        type: 'spacing_optimization',
                        priority: 'low',
                        title: 'Optimize Plant Spacing',
                        description: `${this.cleanCropName(allocation.crop_type)} in ${bed.bed_name || `Bed ${bed.bed_number}`} has wide spacing (${allocation.plant_spacing}cm). Consider reducing spacing to fit more plants.`,
                        action: 'optimize_spacing',
                        allocationId: allocation.id,
                        impact: 'low',
                        category: 'space_optimization'
                    });
                }
            }
        });

        return recommendations;
    }

    // Modal and UI Management Methods

    /**
     * Show new allocation wizard
     */
    async showNewAllocationWizard(bedId = null) {
        const modal = document.getElementById('new-allocation-modal');
        if (!modal) return;

        const content = document.getElementById('allocation-wizard-content');
        content.innerHTML = await this.buildAllocationWizardHTML(bedId);
        
        modal.style.display = 'block';
        this.setupAllocationWizard(bedId);
    }

    /**
     * Hide new allocation wizard
     */
    hideNewAllocationWizard() {
        const modal = document.getElementById('new-allocation-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show batch manager
     */
    async showBatchManager() {
        const modal = document.getElementById('batch-manager-modal');
        if (!modal) return;

        const content = document.getElementById('batch-manager-content');
        content.innerHTML = await this.buildBatchManagerHTML();
        
        modal.style.display = 'block';
        this.setupBatchManager();
    }

    /**
     * Hide batch manager
     */
    hideBatchManager() {
        const modal = document.getElementById('batch-manager-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show recommendations modal
     */
    showRecommendations() {
        const modal = document.getElementById('recommendations-modal');
        if (!modal) return;

        const content = document.getElementById('recommendations-content');
        content.innerHTML = this.buildRecommendationsHTML();
        
        modal.style.display = 'block';
    }

    /**
     * Hide recommendations modal
     */
    hideRecommendations() {
        const modal = document.getElementById('recommendations-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show bed details
     */
    showBedDetails(bedId) {
        const bed = this.growBeds.get(bedId);
        if (!bed) return;

        const modal = document.getElementById('allocation-details-modal');
        if (!modal) return;

        const content = document.getElementById('allocation-details-content');
        content.innerHTML = this.buildBedDetailsHTML(bed);
        
        modal.style.display = 'block';
    }

    /**
     * Hide allocation details
     */
    hideAllocationDetails() {
        const modal = document.getElementById('allocation-details-modal');
        if (modal) modal.style.display = 'none';
    }

    // Utility Methods

    /**
     * Clean crop name for display
     */
    cleanCropName(cropName) {
        if (!cropName) return 'Unknown Crop';
        return cropName.replace(/[_-]/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
    }

    /**
     * Get bed type display name
     */
    getBedTypeDisplay(bedType) {
        const types = {
            'nft': 'NFT (Nutrient Film Technique)',
            'dwc': 'DWC (Deep Water Culture)', 
            'media': 'Media Bed',
            'raft': 'Raft System',
            'tower': 'Tower Garden',
            'other': 'Other'
        };
        return types[bedType] || bedType || 'Unknown Type';
    }

    /**
     * Get bed name by ID
     */
    getBedName(bedId) {
        const bed = this.growBeds.get(bedId);
        return bed ? (bed.bed_name || `Bed ${bed.bed_number}`) : `Bed ${bedId}`;
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmDialog(title, message) {
        // Implementation would depend on the app's notification system
        return confirm(`${title}\n\n${message}`);
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filterSettings = {
            cropType: 'all',
            bedStatus: 'all',
            season: 'all',
            readyForHarvest: false,
            searchTerm: ''
        };

        // Reset UI controls
        const cropFilter = document.getElementById('crop-filter');
        const bedStatusFilter = document.getElementById('bed-status-filter');
        const seasonFilter = document.getElementById('season-filter');
        const readyHarvestFilter = document.getElementById('ready-harvest-filter');
        const searchInput = document.getElementById('allocation-search');

        if (cropFilter) cropFilter.value = 'all';
        if (bedStatusFilter) bedStatusFilter.value = 'all';
        if (seasonFilter) seasonFilter.value = 'all';
        if (readyHarvestFilter) readyHarvestFilter.checked = false;
        if (searchInput) searchInput.value = '';

        this.updateAllocationView();
    }

    /**
     * Refresh all data for current system
     */
    async onRefreshAllData() {
        await this.loadAllData();
        await this.generateRecommendations();
        if (this.isActive) {
            await this.updateSummaryDashboard();
            await this.updateAllocationView();
        }
    }

    /**
     * Handle system change
     */
    async onSystemChange(systemId) {
        this.log(`System changed to: ${systemId}`);
        this.clearAllData();
        
        if (systemId) {
            await this.loadAllData();
            await this.generateRecommendations();
            
            if (this.isActive) {
                await this.generateInterface();
            }
        }
    }

    /**
     * Component cleanup
     */
    onDestroy() {
        super.onDestroy();
        
        // Clear component-specific data
        this.cropAllocations.clear();
        this.plantBatches.clear();
        this.growBeds.clear();
        this.customCrops.clear();
        this.allocationHistory.clear();
        
        this.recommendations = [];
        this.optimizationSuggestions = [];
        this.selectedBeds.clear();
        this.draggedAllocation = null;
    }

    /**
     * Get component health issues
     */
    getHealthIssues() {
        const issues = super.getHealthIssues();
        
        // Check for data consistency issues
        if (this.cropAllocations.size === 0 && this.app.activeSystemId) {
            issues.push('No crop allocations loaded for active system');
        }
        
        return issues;
    }

    /**
     * Get component statistics
     */
    getComponentStats() {
        return {
            ...super.getComponentStats(),
            cropAllocations: this.cropAllocations.size,
            plantBatches: this.plantBatches.size,
            growBeds: this.growBeds.size,
            customCrops: this.customCrops.size,
            recommendations: this.recommendations.length,
            currentViewMode: this.viewMode,
            filtersActive: Object.values(this.filterSettings).some(v => v !== 'all' && v !== false && v !== ''),
            hasSelectedBeds: this.selectedBeds.size > 0
        };
    }

    /**
     * Setup event listeners for the allocation manager
     */
    setupEventListeners() {
        // View mode switches
        const viewModeButtons = document.querySelectorAll('[data-allocation-view]');
        viewModeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchViewMode(e.target.dataset.allocationView);
            });
        });

        // Filter controls
        const filterControls = document.querySelectorAll('[data-allocation-filter]');
        filterControls.forEach(control => {
            control.addEventListener('change', (e) => {
                this.handleFilterChange(e.target.dataset.allocationFilter, e.target.value);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('allocation-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchChange(e.target.value);
            });
        }

        // Batch action buttons
        const batchActionButtons = document.querySelectorAll('[data-batch-action]');
        batchActionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleBatchAction(e.target.dataset.batchAction);
            });
        });

        this.log('🎯 Event listeners setup complete');
    }
}

// Export the comprehensive component
export default CropAllocationManagerComponent;

/**
 * Factory function to create the comprehensive crop allocation manager
 */
export function createCropAllocationManagerComponent(app) {
    return new CropAllocationManagerComponent(app);
}