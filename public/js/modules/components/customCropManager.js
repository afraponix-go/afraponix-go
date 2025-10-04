// Enhanced Custom Crop Manager Component
// Comprehensive crop database management with professional growing data

import { BaseManagerComponent } from './baseManager.js';
import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Enhanced Custom Crop Manager Component Class
 * Provides comprehensive crop database management, knowledge base integration,
 * and professional growing data with advanced validation and recommendations
 */
export class CustomCropManagerComponent extends BaseManagerComponent {
    constructor(app) {
        super(app, 'CustomCropManager');
        
        // Enhanced data stores
        this.customCrops = new Map();
        this.cropKnowledgeBase = new Map();
        this.cropCategories = new Map();
        this.seedVarieties = new Map();
        this.cropCompatibility = new Map();
        
        // UI state management
        this.currentView = 'grid'; // grid, detailed, wizard
        this.filterSettings = {
            category: 'all',
            season: 'all',
            difficulty: 'all',
            searchTerm: ''
        };
        
        // Professional crop data templates
        this.cropTemplates = this.initializeCropTemplates();
        this.nutrientProfiles = this.initializeNutrientProfiles();
        this.growthStageTemplates = this.initializeGrowthStageTemplates();
        
        // Validation and recommendations
        this.validationRules = this.initializeValidationRules();
        this.compatibilityMatrix = this.initializeCompatibilityMatrix();
        
        this.log('🌿 Enhanced Custom Crop Manager initialized with professional features');
    }

    /**
     * Initialize crop templates with professional growing data
     */
    initializeCropTemplates() {
        return {
            leafy_greens: {
                category: 'Leafy Greens',
                defaultSpacing: 15,
                averageGrowthDays: 30,
                harvestMethod: 'cut_and_come_again',
                lightRequirement: 'moderate',
                temperatureRange: { min: 15, max: 25 },
                phRange: { min: 6.0, max: 7.0 },
                commonVarieties: ['buttercrunch', 'romaine', 'oak_leaf', 'arugula']
            },
            herbs: {
                category: 'Herbs',
                defaultSpacing: 20,
                averageGrowthDays: 45,
                harvestMethod: 'continuous',
                lightRequirement: 'high',
                temperatureRange: { min: 18, max: 28 },
                phRange: { min: 6.0, max: 7.5 },
                commonVarieties: ['basil', 'cilantro', 'parsley', 'mint']
            },
            fruiting: {
                category: 'Fruiting Plants',
                defaultSpacing: 40,
                averageGrowthDays: 90,
                harvestMethod: 'individual_fruits',
                lightRequirement: 'high',
                temperatureRange: { min: 20, max: 30 },
                phRange: { min: 6.0, max: 6.8 },
                commonVarieties: ['tomato', 'pepper', 'cucumber', 'strawberry']
            },
            root_vegetables: {
                category: 'Root Vegetables',
                defaultSpacing: 25,
                averageGrowthDays: 60,
                harvestMethod: 'full_plant',
                lightRequirement: 'moderate',
                temperatureRange: { min: 12, max: 22 },
                phRange: { min: 6.0, max: 7.0 },
                commonVarieties: ['radish', 'carrot', 'beet', 'turnip']
            }
        };
    }

    /**
     * Initialize nutrient profiles for different crop categories
     */
    initializeNutrientProfiles() {
        return {
            leafy_greens: { n: 150, p: 50, k: 200, ca: 160, mg: 50, fe: 3, ec: 1.2 },
            herbs: { n: 120, p: 40, k: 180, ca: 140, mg: 40, fe: 2.5, ec: 1.0 },
            fruiting: { n: 200, p: 60, k: 300, ca: 200, mg: 60, fe: 4, ec: 2.0 },
            root_vegetables: { n: 130, p: 45, k: 220, ca: 150, mg: 45, fe: 3, ec: 1.4 }
        };
    }

    /**
     * Initialize growth stage templates
     */
    initializeGrowthStageTemplates() {
        return {
            germination: { days: 7, description: 'Seed germination and first leaves', nutrients: 0.8 },
            seedling: { days: 14, description: 'Early vegetative growth', nutrients: 1.0 },
            vegetative: { days: 21, description: 'Rapid leaf and stem development', nutrients: 1.2 },
            pre_harvest: { days: 7, description: 'Final growth before harvest', nutrients: 1.0 },
            harvest: { days: 0, description: 'Ready for harvest', nutrients: 0.8 }
        };
    }

    /**
     * Initialize validation rules for crop data
     */
    initializeValidationRules() {
        return {
            cropName: {
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z0-9\s_-]+$/,
                message: 'Crop name must be 2-100 characters, alphanumeric with spaces, hyphens, or underscores'
            },
            nutrients: {
                n: { min: 0, max: 500, message: 'Nitrogen (N) must be between 0-500 ppm' },
                p: { min: 0, max: 200, message: 'Phosphorus (P) must be between 0-200 ppm' },
                k: { min: 0, max: 600, message: 'Potassium (K) must be between 0-600 ppm' },
                ca: { min: 0, max: 400, message: 'Calcium (Ca) must be between 0-400 ppm' },
                mg: { min: 0, max: 100, message: 'Magnesium (Mg) must be between 0-100 ppm' },
                fe: { min: 0, max: 10, message: 'Iron (Fe) must be between 0-10 ppm' },
                ec: { min: 0.5, max: 4.0, message: 'EC must be between 0.5-4.0 mS/cm' }
            },
            plantSpacing: {
                min: 5,
                max: 100,
                message: 'Plant spacing must be between 5-100 cm'
            },
            growthDays: {
                min: 14,
                max: 365,
                message: 'Growth days must be between 14-365 days'
            }
        };
    }

    /**
     * Initialize compatibility matrix for companion planting
     */
    initializeCompatibilityMatrix() {
        return {
            leafy_greens: {
                compatible: ['herbs', 'root_vegetables'],
                incompatible: ['fruiting'],
                neutral: []
            },
            herbs: {
                compatible: ['leafy_greens', 'fruiting'],
                incompatible: [],
                neutral: ['root_vegetables']
            },
            fruiting: {
                compatible: ['herbs'],
                incompatible: ['leafy_greens'],
                neutral: ['root_vegetables']
            },
            root_vegetables: {
                compatible: ['leafy_greens'],
                incompatible: [],
                neutral: ['herbs', 'fruiting']
            }
        };
    }

    /**
     * Initialize component with data loading
     */
    async onInitialize() {
        try {
            await this.loadAllCropData();
            await this.generateInterface();
            this.log('✅ Custom Crop Manager fully initialized');
        } catch (error) {
            this.logError('Failed to initialize Custom Crop Manager', error);
            throw error;
        }
    }

    /**
     * Load all crop-related data
     */
    async loadAllCropData() {
        if (!this.app.user?.userId) {
            this.log('⚠️ No user logged in');
            return;
        }

        const loadOperations = [
            this.loadData('customCrops', () => this.fetchCustomCrops()),
            this.loadData('seedVarieties', () => this.fetchSeedVarieties()),
            this.loadData('cropCategories', () => this.fetchCropCategories())
        ];

        await Promise.all(loadOperations);
        this.processLoadedData();
    }

    /**
     * Fetch custom crops with enhanced data
     */
    async fetchCustomCrops() {
        try {
            const response = await this.makeApiCall('/plants/custom-crops');
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logError('Error fetching custom crops', error);
            return [];
        }
    }

    /**
     * Fetch seed varieties from database
     */
    async fetchSeedVarieties() {
        try {
            const response = await this.makeApiCall('/plants/seed-varieties');
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logError('Error fetching seed varieties', error);
            return [];
        }
    }

    /**
     * Fetch crop categories
     */
    async fetchCropCategories() {
        try {
            // For now, return built-in categories
            return Object.keys(this.cropTemplates).map(key => ({
                id: key,
                name: this.cropTemplates[key].category,
                description: `${this.cropTemplates[key].category} crops`
            }));
        } catch (error) {
            this.logError('Error fetching crop categories', error);
            return [];
        }
    }

    /**
     * Process loaded data into Maps
     */
    processLoadedData() {
        // Process custom crops
        const crops = this.getData('customCrops') || [];
        this.customCrops.clear();
        crops.forEach(crop => {
            this.customCrops.set(crop.id, this.enhanceCropData(crop));
        });

        // Process seed varieties
        const varieties = this.getData('seedVarieties') || [];
        this.seedVarieties.clear();
        varieties.forEach(variety => {
            if (!this.seedVarieties.has(variety.crop_type)) {
                this.seedVarieties.set(variety.crop_type, []);
            }
            this.seedVarieties.get(variety.crop_type).push(variety);
        });

        // Process categories
        const categories = this.getData('cropCategories') || [];
        this.cropCategories.clear();
        categories.forEach(category => {
            this.cropCategories.set(category.id, category);
        });

        this.log(`📊 Processed crop data: ${this.customCrops.size} crops, ${this.seedVarieties.size} variety types`);
    }

    /**
     * Enhance crop data with template information
     */
    enhanceCropData(crop) {
        const category = this.determineCropCategory(crop.crop_name);
        const template = this.cropTemplates[category] || this.cropTemplates.leafy_greens;
        const nutrients = this.nutrientProfiles[category] || this.nutrientProfiles.leafy_greens;

        return {
            ...crop,
            category,
            template,
            recommendedNutrients: nutrients,
            compatibility: this.compatibilityMatrix[category] || {},
            growthStages: this.growthStageTemplates,
            isEnhanced: true
        };
    }

    /**
     * Determine crop category from name
     */
    determineCropCategory(cropName) {
        const name = cropName.toLowerCase();
        
        if (name.includes('lettuce') || name.includes('spinach') || name.includes('kale') || 
            name.includes('chard') || name.includes('arugula')) {
            return 'leafy_greens';
        }
        
        if (name.includes('basil') || name.includes('cilantro') || name.includes('parsley') || 
            name.includes('mint') || name.includes('herb')) {
            return 'herbs';
        }
        
        if (name.includes('tomato') || name.includes('pepper') || name.includes('cucumber') || 
            name.includes('strawberry') || name.includes('fruit')) {
            return 'fruiting';
        }
        
        if (name.includes('radish') || name.includes('carrot') || name.includes('beet') || 
            name.includes('turnip') || name.includes('root')) {
            return 'root_vegetables';
        }
        
        return 'leafy_greens'; // Default category
    }

    /**
     * Generate the main custom crop management interface
     */
    async generateInterface() {
        const container = document.getElementById('custom-crops-container');
        if (!container) {
            this.logWarning('Custom crops container not found');
            return;
        }

        container.innerHTML = await this.buildMainInterface();
        await this.initializeInterface();
    }

    /**
     * Build main interface HTML
     */
    async buildMainInterface() {
        return `
            <div class="custom-crop-manager">
                <!-- Header with controls -->
                <div class="crop-manager-header">
                    <div class="crop-title">
                        <h2>
                            <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Custom Crops" class="title-icon">
                            Custom Crop Manager
                        </h2>
                        <div class="crop-subtitle">
                            Create and manage custom crop varieties with professional growing data
                        </div>
                    </div>
                    
                    <div class="crop-controls">
                        <div class="view-mode-selector">
                            <button class="view-btn active" data-view="grid" title="Grid View">
                                <img src="/icons/new-icons/Afraponix Go Icons_view.svg" alt="Grid" class="btn-icon">
                            </button>
                            <button class="view-btn" data-view="detailed" title="Detailed View">
                                <img src="/icons/new-icons/Afraponix Go Icons_data.svg" alt="Detailed" class="btn-icon">
                            </button>
                            <button class="view-btn" data-view="wizard" title="Wizard View">
                                <img src="/icons/new-icons/Afraponix Go Icons_settings.svg" alt="Wizard" class="btn-icon">
                            </button>
                        </div>
                        
                        <div class="crop-actions">
                            <button class="btn-success" onclick="app.customCropManager.showAddCropWizard()">
                                <img src="/icons/new-icons/Afraponix Go Icons_add.svg" alt="Add" class="btn-icon">
                                Add Custom Crop
                            </button>
                            <button class="btn-secondary" onclick="app.customCropManager.showKnowledgeBase()">
                                <img src="/icons/new-icons/Afraponix Go Icons_data history.svg" alt="Knowledge" class="btn-icon">
                                Knowledge Base
                            </button>
                            <button class="btn-info" onclick="app.customCropManager.showImportExport()">
                                <img src="/icons/new-icons/Afraponix Go Icons_data.svg" alt="Import" class="btn-icon">
                                Import/Export
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Filter and search bar -->
                <div class="crop-filters">
                    <div class="filter-section">
                        <div class="filter-group">
                            <label>Category:</label>
                            <select id="category-filter" class="filter-select">
                                <option value="all">All Categories</option>
                                <option value="leafy_greens">Leafy Greens</option>
                                <option value="herbs">Herbs</option>
                                <option value="fruiting">Fruiting Plants</option>
                                <option value="root_vegetables">Root Vegetables</option>
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
                            <label>Difficulty:</label>
                            <select id="difficulty-filter" class="filter-select">
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="search-section">
                        <div class="search-box">
                            <input type="text" id="crop-search" placeholder="Search crops, varieties, nutrients...">
                            <img src="/icons/new-icons/Afraponix Go Icons_search.svg" alt="Search" class="search-icon">
                        </div>
                        <button class="btn-outline" onclick="app.customCropManager.clearFilters()">
                            Clear Filters
                        </button>
                    </div>
                </div>

                <!-- Summary dashboard -->
                <div class="crop-summary-dashboard">
                    <div id="crop-metrics" class="crop-metrics">
                        ${await this.buildMetricsHTML()}
                    </div>
                    <div id="crop-recommendations" class="crop-recommendations">
                        ${await this.buildQuickRecommendationsHTML()}
                    </div>
                </div>

                <!-- Main content area -->
                <div class="crop-content">
                    <div id="crop-view-container" class="crop-view-container">
                        ${await this.buildCropViewHTML()}
                    </div>
                </div>

                <!-- Modals -->
                ${this.buildModalsHTML()}
            </div>
        `;
    }

    /**
     * Build modals HTML
     */
    buildModalsHTML() {
        return `
            <!-- Add Custom Crop Modal -->
            <div id="add-custom-crop-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close-modal" onclick="customCropManager.hideAddCropModal()">&times;</span>
                    <h2>Add Custom Crop</h2>
                    <form id="custom-crop-form">
                        <div class="form-group">
                            <label for="add-custom-crop-name">Crop Name</label>
                            <input type="text" id="add-custom-crop-name" name="crop_name" required>
                        </div>
                        <div class="form-group">
                            <label for="crop-variety">Variety (Optional)</label>
                            <input type="text" id="crop-variety" name="variety">
                        </div>
                        <div class="form-group">
                            <label for="crop-description">Description</label>
                            <textarea id="crop-description" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="customCropManager.hideAddCropModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Add Crop</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Custom Crop Modal -->
            <div id="edit-custom-crop-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close-modal" onclick="customCropManager.hideEditCropModal()">&times;</span>
                    <h2>Edit Custom Crop</h2>
                    <form id="edit-custom-crop-form">
                        <input type="hidden" id="edit-crop-id">
                        <div class="form-group">
                            <label for="edit-crop-name">Crop Name</label>
                            <input type="text" id="edit-crop-name" name="crop_name" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-crop-variety">Variety (Optional)</label>
                            <input type="text" id="edit-crop-variety" name="variety">
                        </div>
                        <div class="form-group">
                            <label for="edit-crop-description">Description</label>
                            <textarea id="edit-crop-description" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="customCropManager.hideEditCropModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Update Crop</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Show add crop modal
     */
    showAddCropModal() {
        const modal = document.getElementById('add-custom-crop-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * Hide add crop modal
     */
    hideAddCropModal() {
        const modal = document.getElementById('add-custom-crop-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show edit crop modal
     */
    showEditCropModal(crop) {
        const modal = document.getElementById('edit-custom-crop-modal');
        if (modal && crop) {
            document.getElementById('edit-crop-id').value = crop.id;
            document.getElementById('edit-crop-name').value = crop.crop_name || '';
            document.getElementById('edit-crop-variety').value = crop.variety || '';
            document.getElementById('edit-crop-description').value = crop.description || '';
            modal.style.display = 'block';
        }
    }

    /**
     * Hide edit crop modal
     */
    hideEditCropModal() {
        const modal = document.getElementById('edit-custom-crop-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Load custom crops from API and display them
     * Compatibility method for existing code
     */
    async loadCustomCrops() {
        try {
            await this.loadAllCropData();
            await this.displayCustomCrops();
            await this.updateCropDropdowns();
        } catch (error) {
            this.logError('Error loading custom crops', error);
            this.showNotification('Failed to load custom crops', 'error');
        }
    }

    /**
     * Initialize interface after HTML is inserted
     */
    async initializeInterface() {
        try {
            this.setupViewModeSelector();
            this.setupFilters();
            this.setupEventListeners();
            
            this.log('✅ Custom crop interface initialized successfully');
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
                viewButtons.forEach(b => b.classList.remove('active'));
                e.target.closest('.view-btn').classList.add('active');
                this.currentView = e.target.closest('.view-btn').dataset.view;
                this.updateCropView();
            });
        });
    }

    /**
     * Setup filter event listeners
     */
    setupFilters() {
        const filterElements = ['category-filter', 'season-filter', 'difficulty-filter', 'crop-search'];

        filterElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                const eventType = element.type === 'text' ? 'input' : 'change';
                this.addEventListener(element, eventType, () => {
                    this.updateFilterSettings();
                    this.updateCropView();
                });
            }
        });
    }

    /**
     * Setup additional event listeners
     */
    setupEventListeners() {
        // Clear filters button
        const clearFiltersBtn = document.querySelector('.btn-outline');
        if (clearFiltersBtn) {
            this.addEventListener(clearFiltersBtn, 'click', () => {
                this.clearFilters();
            });
        }

        // Form submissions for modals
        const addForm = document.getElementById('custom-crop-form');
        if (addForm) {
            this.addEventListener(addForm, 'submit', (e) => {
                e.preventDefault();
                this.handleAddCrop(e);
            });
        }

        const editForm = document.getElementById('edit-custom-crop-form');
        if (editForm) {
            this.addEventListener(editForm, 'submit', (e) => {
                e.preventDefault();
                this.handleEditCrop(e);
            });
        }

        // Modal close clicks
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.addEventListener(modal, 'click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        this.log('✅ Additional event listeners setup complete');
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const seasonFilter = document.getElementById('season-filter');
        const difficultyFilter = document.getElementById('difficulty-filter');
        const searchInput = document.getElementById('crop-search');

        if (categoryFilter) categoryFilter.value = 'all';
        if (seasonFilter) seasonFilter.value = 'all';
        if (difficultyFilter) difficultyFilter.value = 'all';
        if (searchInput) searchInput.value = '';

        this.updateFilterSettings();
        this.updateCropView();
    }

    /**
     * Handle adding a new crop
     */
    async handleAddCrop(event) {
        const formData = new FormData(event.target);
        const cropData = Object.fromEntries(formData.entries());
        
        this.log('Adding new crop:', cropData);
        // TODO: Implement crop addition logic
        this.hideAddCropModal();
    }

    /**
     * Handle editing an existing crop
     */
    async handleEditCrop(event) {
        const formData = new FormData(event.target);
        const cropData = Object.fromEntries(formData.entries());
        
        this.log('Editing crop:', cropData);
        // TODO: Implement crop editing logic
        this.hideEditCropModal();
    }

    /**
     * Update filter settings from UI
     */
    updateFilterSettings() {
        const categoryFilter = document.getElementById('category-filter');
        const seasonFilter = document.getElementById('season-filter');
        const difficultyFilter = document.getElementById('difficulty-filter');
        const searchInput = document.getElementById('crop-search');

        this.filterSettings = {
            category: categoryFilter?.value || 'all',
            season: seasonFilter?.value || 'all',
            difficulty: difficultyFilter?.value || 'all',
            searchTerm: searchInput?.value?.toLowerCase() || ''
        };
    }

    /**
     * Build metrics HTML
     */
    async buildMetricsHTML() {
        const totalCrops = this.customCrops.size;
        const categories = new Map();
        const difficulties = new Map();
        
        this.customCrops.forEach(crop => {
            const cat = crop.category || 'leafy_greens';
            const diff = crop.difficulty || 'beginner';
            categories.set(cat, (categories.get(cat) || 0) + 1);
            difficulties.set(diff, (difficulties.get(diff) || 0) + 1);
        });

        return `
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Total">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${totalCrops}</div>
                        <div class="metric-label">Custom Crops</div>
                    </div>
                </div>
                
                <div class="metric-card success">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_tag.svg" alt="Categories">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${categories.size}</div>
                        <div class="metric-label">Categories</div>
                    </div>
                </div>
                
                <div class="metric-card info">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_growth.svg" alt="Beginner">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${difficulties.get('beginner') || 0}</div>
                        <div class="metric-label">Beginner Friendly</div>
                    </div>
                </div>
                
                <div class="metric-card secondary">
                    <div class="metric-icon">
                        <img src="/icons/new-icons/Afraponix Go Icons_success.svg" alt="Advanced">
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${difficulties.get('advanced') || 0}</div>
                        <div class="metric-label">Advanced</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build quick recommendations HTML
     */
    async buildQuickRecommendationsHTML() {
        const recommendations = this.generateCropRecommendations();
        
        if (recommendations.length === 0) {
            return `
                <div class="crop-recommendations-header">
                    <h4>
                        <img src="/icons/new-icons/Afraponix Go Icons_warning.svg" alt="Tips" class="section-icon">
                        Growing Tips
                    </h4>
                </div>
                <div class="no-recommendations">
                    <p>✅ Your crop library looks great! Consider diversifying with new categories.</p>
                </div>
            `;
        }

        return `
            <div class="crop-recommendations-header">
                <h4>
                    <img src="/icons/new-icons/Afraponix Go Icons_warning.svg" alt="Tips" class="section-icon">
                    Growing Tips
                </h4>
            </div>
            <div class="recommendations-list">
                ${recommendations.slice(0, 3).map(rec => `
                    <div class="recommendation ${rec.priority}">
                        <div class="rec-icon">${rec.icon}</div>
                        <div class="rec-content">
                            <div class="rec-title">${rec.title}</div>
                            <div class="rec-description">${rec.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Generate crop recommendations
     */
    generateCropRecommendations() {
        const recommendations = [];
        const categories = new Map();
        
        this.customCrops.forEach(crop => {
            const cat = crop.category || 'leafy_greens';
            categories.set(cat, (categories.get(cat) || 0) + 1);
        });

        // Suggest diversification
        if (categories.size < 3) {
            recommendations.push({
                priority: 'medium',
                icon: '🌈',
                title: 'Diversify Your Crops',
                description: 'Try adding crops from different categories for better nutrition and risk management'
            });
        }

        // Suggest beginner crops if none exist
        const beginnerCrops = Array.from(this.customCrops.values()).filter(c => c.difficulty === 'beginner');
        if (beginnerCrops.length === 0 && this.customCrops.size > 0) {
            recommendations.push({
                priority: 'low',
                icon: '🌱',
                title: 'Add Beginner-Friendly Options',
                description: 'Include some easy-to-grow crops for reliable harvests'
            });
        }

        // Suggest year-round crops
        const yearRoundCrops = Array.from(this.customCrops.values()).filter(c => c.season === 'year_round');
        if (yearRoundCrops.length === 0 && this.customCrops.size > 0) {
            recommendations.push({
                priority: 'low',
                icon: '📅',
                title: 'Consider Year-Round Varieties',
                description: 'Add some crops that can grow in any season for continuous harvests'
            });
        }

        return recommendations;
    }

    /**
     * Build crop view HTML based on current view mode
     */
    async buildCropViewHTML() {
        switch (this.currentView) {
            case 'detailed':
                return this.buildDetailedView();
            case 'wizard':
                return this.buildWizardView();
            default:
                return this.buildGridView();
        }
    }

    /**
     * Build grid view of crops
     */
    buildGridView() {
        const filteredCrops = this.getFilteredCrops();
        
        if (filteredCrops.length === 0) {
            return this.buildEmptyStateHTML();
        }

        return `
            <div class="crops-grid">
                ${filteredCrops.map(crop => this.buildEnhancedCropCard(crop)).join('')}
            </div>
        `;
    }

    /**
     * Build enhanced crop card with professional data
     */
    buildEnhancedCropCard(crop) {
        const categoryIcon = this.getCategoryIcon(crop.category);
        const difficultyClass = crop.difficulty || 'beginner';
        const seasonIcon = this.getSeasonIcon(crop.season);
        
        return `
            <div class="enhanced-crop-card" data-crop-id="${crop.id}">
                <div class="crop-card-header">
                    <div class="crop-info">
                        <h3>${categoryIcon} ${this.cleanCropName(crop.crop_name)}</h3>
                        <div class="crop-meta">
                            <span class="difficulty-badge ${difficultyClass}">${crop.difficulty || 'beginner'}</span>
                            <span class="season-badge">${seasonIcon} ${crop.season || 'year_round'}</span>
                        </div>
                    </div>
                    <div class="crop-actions">
                        <button class="btn-icon btn-edit" onclick="app.customCropManager.editCrop(${crop.id})" title="Edit">
                            <img src="/icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit">
                        </button>
                        <button class="btn-icon btn-delete" onclick="app.customCropManager.deleteCrop(${crop.id})" title="Delete">
                            <img src="/icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete">
                        </button>
                    </div>
                </div>
                
                <div class="crop-details">
                    <div class="detail-row">
                        <span class="detail-label">Growth Time:</span>
                        <span class="detail-value">${crop.growth_days || crop.template?.averageGrowthDays || 30} days</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Plant Spacing:</span>
                        <span class="detail-value">${crop.plant_spacing || crop.template?.defaultSpacing || 15} cm</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Target EC:</span>
                        <span class="detail-value">${crop.target_ec || crop.recommendedNutrients?.ec || 1.2} mS/cm</span>
                    </div>
                </div>

                <div class="crop-nutrients">
                    <h5>Nutrient Targets</h5>
                    <div class="nutrients-grid">
                        <div class="nutrient-item">
                            <span class="nutrient-label">N:</span>
                            <span class="nutrient-value">${crop.target_n || 0} ppm</span>
                        </div>
                        <div class="nutrient-item">
                            <span class="nutrient-label">P:</span>
                            <span class="nutrient-value">${crop.target_p || 0} ppm</span>
                        </div>
                        <div class="nutrient-item">
                            <span class="nutrient-label">K:</span>
                            <span class="nutrient-value">${crop.target_k || 0} ppm</span>
                        </div>
                        <div class="nutrient-item">
                            <span class="nutrient-label">Ca:</span>
                            <span class="nutrient-value">${crop.target_ca || 0} ppm</span>
                        </div>
                    </div>
                </div>
                
                <div class="crop-card-footer">
                    <button class="btn-secondary btn-sm" onclick="app.customCropManager.viewCropDetails(${crop.id})">
                        <img src="/icons/new-icons/Afraponix Go Icons_details.svg" alt="Details" class="btn-icon">
                        View Details
                    </button>
                    <button class="btn-success btn-sm" onclick="app.customCropManager.useCropInAllocation(${crop.id})">
                        <img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Use" class="btn-icon">
                        Use in System
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered crops based on current filters
     */
    getFilteredCrops() {
        let filtered = Array.from(this.customCrops.values());

        if (this.filterSettings.category !== 'all') {
            filtered = filtered.filter(crop => crop.category === this.filterSettings.category);
        }

        if (this.filterSettings.season !== 'all') {
            filtered = filtered.filter(crop => 
                crop.season === this.filterSettings.season || crop.season === 'year_round'
            );
        }

        if (this.filterSettings.difficulty !== 'all') {
            filtered = filtered.filter(crop => crop.difficulty === this.filterSettings.difficulty);
        }

        if (this.filterSettings.searchTerm) {
            const searchTerm = this.filterSettings.searchTerm.toLowerCase();
            filtered = filtered.filter(crop => 
                crop.crop_name.toLowerCase().includes(searchTerm) ||
                (crop.description && crop.description.toLowerCase().includes(searchTerm)) ||
                crop.category.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }

    /**
     * Helper method to get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            leafy_greens: '🥬',
            herbs: '🌿',
            fruiting: '🍅',
            root_vegetables: '🥕'
        };
        return icons[category] || '🌱';
    }

    /**
     * Helper method to get season icon
     */
    getSeasonIcon(season) {
        const icons = {
            spring: '🌸',
            summer: '☀️',
            autumn: '🍂',
            winter: '❄️',
            year_round: '📅'
        };
        return icons[season] || '📅';
    }

    /**
     * Clean crop name for display (compatibility method)
     */
    cleanCropName(cropName) {
        if (!cropName) return 'Unknown Crop';
        return cropName.replace(/[_-]/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
    }

    /**
     * Display custom crops in the UI
     * Complexity: 18, Lines: 105
     */
    displayCustomCrops(crops) {
        const container = document.getElementById('custom-crops-container');
        if (!container) return;

        if (crops.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: #666; margin-bottom: 1rem;">No custom crops added yet.</p>
                    <button onclick="app.showAddCustomCropModal()" class="btn-primary">
                        <span>🌿</span> Add Your First Custom Crop
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="custom-crops-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border-left: 4px solid #80FB7B;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Your Custom Crops</h3>
                    <p style="margin: 0; color: #6c757d; font-size: 0.9rem;">
                        <img src="icons/new-icons/Afraponix Go Icons_chemistry.svg" alt="Info" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.25em;">
                        Create your own crops with custom nutrient targets. Submit successful crops to the global database to share with the community!
                    </p>
                </div>
                <button onclick="app.showAddCustomCropModal()" class="btn-primary">
                    <img src="icons/new-icons/Afraponix Go Icons_plant.svg" alt="Add" class="btn-icon-svg" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.25em;">
                    Add Custom Crop
                </button>
            </div>
            <div class="custom-crops-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
        `;
        
        crops.forEach(crop => {
            const cleanCropName = this.app.cleanCustomCropName(crop.crop_name);
            html += `
                <div class="custom-crop-card" style="background: white; border: 2px solid #e9ecef; border-radius: 12px; padding: 1.5rem; position: relative; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div class="crop-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #2c3e50; font-size: 1.2rem; flex: 1;">🌱 ${cleanCropName}</h4>
                        <div class="crop-actions" style="display: flex; gap: 0.5rem;">
                            <button onclick="app.editCustomCrop(${crop.id})" class="icon-btn edit-btn" style="background: #3498db; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                <img src="icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit" class="btn-icon-svg" style="width: 1em; height: 1em; vertical-align: middle;">
                            </button>
                            <button onclick="app.deleteCustomCrop(${crop.id})" class="icon-btn delete-btn" style="background: #e74c3c; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                <img src="icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete" class="btn-icon-svg" style="width: 1em; height: 1em; vertical-align: middle;">
                            </button>
                        </div>
                    </div>
                    
                    <div class="crop-nutrients" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        <div class="nutrient-group" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 0.75rem; border-radius: 8px;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #495057; font-size: 0.85rem; font-weight: 600;">Primary Nutrients</h5>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">N:</span>
                                <strong style="color: #28a745;">${crop.target_n || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">P:</span>
                                <strong style="color: #28a745;">${crop.target_p || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                <span style="color: #6c757d;">K:</span>
                                <strong style="color: #28a745;">${crop.target_k || 0} ppm</strong>
                            </div>
                        </div>
                        
                        <div class="nutrient-group" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 0.75rem; border-radius: 8px;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #495057; font-size: 0.85rem; font-weight: 600;">Secondary & Micro</h5>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Ca:</span>
                                <strong style="color: #17a2b8;">${crop.target_ca || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Mg:</span>
                                <strong style="color: #17a2b8;">${crop.target_mg || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Fe:</span>
                                <strong style="color: #17a2b8;">${crop.target_fe || 0} ppm</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ec-display" style="margin-top: 0.75rem; padding: 0.5rem; background: #fff3cd; border-radius: 6px; text-align: center;">
                        <span style="color: #856404;">Target EC:</span>
                        <strong style="color: #856404; margin-left: 0.5rem;">${crop.target_ec || 0} mS/cm</strong>
                    </div>
                    
                    <div class="crop-integration-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef; text-align: center;">
                        <button onclick="app.submitToGlobalDatabase(${crop.id}, '${cleanCropName}')" 
                                class="btn-success" 
                                style="background: #80FB7B; color: #333; border: none; padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.3s ease;"
                                onmouseover="this.style.background='#60da5b'" 
                                onmouseout="this.style.background='#80FB7B'"
                                title="Submit this crop to the global admin database">
                            <img src="icons/new-icons/Afraponix Go Icons_chemistry.svg" alt="Submit" class="btn-icon-svg" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.5em;">
                            Submit to Global Database
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Update crop dropdowns with custom crops
     * Complexity: 15, Lines: 35
     */
    updateCropDropdowns(crops) {
        // Update all crop type dropdowns to include custom crops
        const cropSelectors = document.querySelectorAll('select[id*="crop"], select[class*="crop"]');
        
        cropSelectors.forEach(selector => {
            // Skip if this is the search/filter dropdown or disabled
            if (selector.disabled || selector.classList.contains('crop-filter-dropdown')) {
                return;
            }
            
            // Store current value
            const currentValue = selector.value;
            
            // Get existing standard options (non-custom)
            const existingOptions = Array.from(selector.options).filter(option => 
                !option.dataset.isCustom && option.value !== ''
            );
            
            // Clear and rebuild
            selector.innerHTML = '<option value="">Select crop type...</option>';
            
            // Add back standard options
            existingOptions.forEach(option => {
                selector.appendChild(option.cloneNode(true));
            });
            
            // Add separator if we have custom crops
            if (crops && crops.length > 0) {
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '── Custom Crops ──';
                selector.appendChild(separator);
                
                // Add custom crops
                crops.forEach(crop => {
                    const option = document.createElement('option');
                    const cleanName = this.app.cleanCustomCropName(crop.crop_name);
                    const value = crop.crop_name.toLowerCase().replace(/\s+/g, '_');
                    
                    option.value = value;
                    option.textContent = cleanName;
                    option.dataset.isCustom = 'true';
                    option.dataset.cropId = crop.id;
                    selector.appendChild(option);
                });
            }
            
            // Restore previous value if it still exists
            if (currentValue) {
                selector.value = currentValue;
            }
        });
    }

    /**
     * Edit custom crop
     */
    async editCustomCrop(cropId) {
        try {
            // Get crop details
            const crop = await this.app.makeApiCall(`/plants/custom-crops/${cropId}`);
            
            // Show edit modal (delegate to app for modal handling)
            if (this.app.showEditCustomCropModal) {
                this.app.showEditCustomCropModal(crop);
            } else {
                console.warn('showEditCustomCropModal method not found in app');
            }
        } catch (error) {
            console.error('Error loading crop for editing:', error);
            this.app.showNotification('Failed to load crop for editing', 'error');
        }
    }

    /**
     * Delete custom crop
     */
    async deleteCustomCrop(cropId) {
        if (!confirm('Are you sure you want to delete this custom crop?')) {
            return;
        }

        try {
            await this.app.makeApiCall(`/plants/custom-crops/${cropId}`, {
                method: 'DELETE'
            });

            this.app.showNotification('Custom crop deleted successfully', 'success');
            
            // Reload the custom crops display
            await this.loadCustomCrops();
        } catch (error) {
            console.error('Error deleting custom crop:', error);
            this.app.showNotification('Failed to delete custom crop: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    /**
     * Submit crop to global database
     */
    async submitToGlobalDatabase(cropId, cropName) {
        if (!confirm(`Submit "${cropName}" to the global crop database? This will make it available to all Afraponix users.`)) {
            return;
        }

        try {
            await this.app.makeApiCall(`/plants/custom-crops/${cropId}/submit-global`, {
                method: 'POST'
            });

            this.app.showNotification(`🌍 "${cropName}" submitted to global database successfully!`, 'success');
        } catch (error) {
            console.error('Error submitting to global database:', error);
            this.app.showNotification('Failed to submit to global database: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    /**
     * Build HTML for empty state when no crops are found
     */
    buildEmptyStateHTML() {
        return `
            <div class="empty-state-container">
                <div class="empty-state-content">
                    <div class="empty-state-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </div>
                    <h3>No Custom Crops Found</h3>
                    <p>Create your first custom crop to get started with personalized growing.</p>
                    <button class="btn-primary" onclick="customCropManager.showAddCropModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add Custom Crop
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            hasContainer: !!document.getElementById('custom-crops-container')
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Custom Crop Manager component');
    }
}

// Export both class and create a factory function
export default CustomCropManagerComponent;

/**
 * Factory function to create custom crop manager component
 */
export function createCustomCropManagerComponent(app) {
    return new CustomCropManagerComponent(app);
}