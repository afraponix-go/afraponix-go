/**
 * AppCore Service Module
 * Handles core application initialization and configuration data
 * Extracted from AquaponicsApp constructor for better modularity
 */

export class AppCoreService {
    constructor(appInstance) {
        this.app = appInstance;
        this.initializeConfiguration();
        console.log('🔧 App Core Service initialized - Configuration loaded');
    }

    /**
     * Initialize all core application configuration
     */
    initializeConfiguration() {
        this.initializeBasicState();
        this.initializeFishData();
        this.initializeGrowBedTypes();
        this.initializeApiConfiguration();
    }

    /**
     * Set up basic application state properties
     */
    initializeBasicState() {
        this.app.currentView = 'dashboard';
        this.app.currentCalcTab = 'fish-calc';
        this.app.currentDataTab = 'water-quality-form';
        this.app.systems = {};
        this.app.activeSystemId = null;
        this.app.dataRecords = { 
            waterQuality: [], 
            fishInventory: { tanks: [] }, 
            fishEvents: [], 
            plantGrowth: [], 
            operations: [] 
        };
        this.app.user = null;
        this.app.token = localStorage.getItem('auth_token');
        this.app.chartInstances = {};
        this.app.isLoading = true; // Track loading state to suppress notifications
        this.app.plantOverviewRendering = false; // Prevent concurrent renders
        this.app.plantOverviewRenderTimeout = null; // Debounce multiple render requests
        
        // Initialize service handlers
        this.app.customCropHandler = null; // Will be initialized after imports
        this.app.growBedDataProcessor = null; // Will be initialized after imports
        this.app.systemManager = null; // Will be initialized after import
        
        // Initialize API client - will be set from the main app context
        this.app.apiClient = null; // Will be set after imports are loaded
        this.app.cropKnowledgeCache = null; // Cache for crop knowledge from API
    }

    /**
     * Initialize comprehensive fish species data with growth curves and feeding schedules
     */
    initializeFishData() {
        this.app.fishData = {
            tilapia: {
                name: 'Tilapia',
                icon: '🐟',
                defaultDensity: 25,
                defaultFingerlingWeight: 50,
                harvestWeight: 500,
                growthPeriod: 24,
                feedConversionRatio: 1.8,
                temperature: '24-30°C',
                growthData: [
                    { week: 0, weight: 50, feedRate: 8, feedAmount: 4 },
                    { week: 4, weight: 100, feedRate: 6, feedAmount: 6 },
                    { week: 8, weight: 180, feedRate: 5, feedAmount: 9 },
                    { week: 12, weight: 280, feedRate: 4, feedAmount: 11 },
                    { week: 16, weight: 380, feedRate: 3, feedAmount: 11 },
                    { week: 20, weight: 450, feedRate: 2.5, feedAmount: 11 },
                    { week: 24, weight: 500, feedRate: 2, feedAmount: 10 }
                ]
            },
            trout: {
                name: 'Trout',
                icon: '<svg enable-background="new 0 0 100 100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><g fill="#0051b1"><path d="m54.96191 59.66748c-1.06738-.04834-4.33496-1.97461-6.31445-3.32666-.18408-.12549-.40771-.19287-.62744-.17236-.104.00635-10.49658.65918-16.03027.25049-2.98706-.2193-5.9267-.75238-8.91229-1.34186 1.31549-1.10309 3.2995-3.04572 3.80927-5.08441.56158-2.24603-.85437-4.50629-1.78333-5.69061 4.54456-1.39368 9.70428-2.93896 16.91223-3.05206.26562-.00439.51855-.11426.70361-.30518 3.12451-3.23096 7.41846-6.32471 8.58447-5.59668.02063.01288.04089.02795.06146.04108-1.77484 1.16016-3.79089 3.77069-4.53265 4.77753-.32727-.04553-.52832-.07349-.52832-.07349l-.27539 1.98047s9.58447 1.3335 12.00098 1.66699c.88135.12158 2.35498.24219 3.91504.37012 2.55859.20996 6.06348.49707 6.95947.82764.11132.041.22851.06151.3457.06151.11914 0 .23779-.021.35107-.06348 1.25146-.46924 3.50293-1.25488 4.21729-1.36475.5459-.08398.92041-.59424.83643-1.14014-.08398-.54639-.60156-.91797-1.14014-.83643-.98291.15088-3.39209 1.01709-4.29688 1.3501-1.25488-.32861-3.77881-.55469-7.10986-.82764-1.53174-.12549-2.97852-.24414-3.80469-.3584-.94812-.13086-3.00031-.41559-5.14307-.7132.87207-.92236 1.70776-1.66272 2.14917-1.89429.43439.54028.69775.91125.70532.92194.31641.45215.94141.56104 1.39258.24512.45215-.31689.56201-.93994.24561-1.39209-.1001-.14307-2.48242-3.52051-5.28955-5.2749-2.95898-1.85107-8.68555 3.47217-10.79248 5.60645-7.41016.17139-12.66748 1.78516-17.31641 3.21191-1.92383.59033-3.74072 1.14795-5.55615 1.55371-6.47803 1.44922-10.71924 4.71582-10.89697 4.854-.32764.25537-.46289.68701-.34033 1.08398.12305.39697.47852.67676.89307.70264.81885.05127 4.4209 1.26318 6.71729 2.10742.11377.04199.23047.06201.34521.06201.40723 0 .79004-.25098.93848-.65527.19043-.51855-.0752-1.09326-.59326-1.28369-.6333-.23291-2.94824-1.07471-4.86865-1.65479.78503-.46039 1.80908-1.00098 3.0116-1.53058.16705.64612.74878 1.12561 1.44714 1.12561.82843 0 1.5-.67157 1.5-1.5 0-.24835-.0661-.47913-.17297-.68542.77515-.25067 1.59387-.48102 2.45593-.67377 1.29089-.28894 2.57617-.65668 3.87842-1.04553.34869.37347 2.40753 2.68005 1.93311 4.57678-.4707 1.88428-3.18262 4.1333-4.18799 4.84131-.10693.0752-.19128.16974-.25867.27301-.38226-.06201-.75275-.13361-1.13879-.19391-2.27246-.35547-4.62207-.72266-6.64795-1.52393-.50098-.19775-.92773-.31982-1.30469-.42725-.65039-.18555-1.12012-.31982-1.72217-.77441-.44043-.33398-1.06885-.24512-1.40039.19531-.33301.44043-.24561 1.06738.19531 1.40039.89941.67969 1.65088.89404 2.37793 1.10205.33691.0957.69873.19824 1.11865.36426 2.23291.88232 4.69385 1.26758 7.07422 1.63965 1.00391.15674 1.99902.31201 2.96045.50342 3.28271.65479 6.50439 1.26221 9.83105 1.50635 5.16113.38281 14.07861-.11572 15.96191-.22803 1.30713.87598 5.21729 3.396 7.06592 3.47998.01562.00049.03076.00098.04639.00098.53125 0 .97363-.41846.99805-.95459.02489-.55173-.40187-1.01951-.95363-1.04441zm-4.18762-18.95288c-.58667-.08154-1.14447-.15906-1.66199-.23096 1.43713-1.80725 3.13007-3.53546 3.82471-3.66772.05853-.01117.10486-.04431.15869-.06476.31415.29108.61145.5896.89056.88403-.89031.57502-1.96044 1.60053-3.21197 3.07941z"/></g></svg>',
                defaultDensity: 20,
                defaultFingerlingWeight: 30,
                harvestWeight: 300,
                growthPeriod: 20,
                feedConversionRatio: 1.2,
                temperature: '10-16°C',
                growthData: [
                    { week: 0, weight: 30, feedRate: 6, feedAmount: 2 },
                    { week: 4, weight: 80, feedRate: 5, feedAmount: 4 },
                    { week: 8, weight: 140, feedRate: 4, feedAmount: 6 },
                    { week: 12, weight: 200, feedRate: 3, feedAmount: 6 },
                    { week: 16, weight: 250, feedRate: 2.5, feedAmount: 6 },
                    { week: 20, weight: 300, feedRate: 2, feedAmount: 6 }
                ]
            },
            catfish: {
                name: 'Catfish',
                icon: '<svg id="Layer_2" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="m47.1155295 24.1677246c2.6532764.529534 5.044589 1.4316276 7.1071725 2.6807979.5403006.3273275 1.089329.7242869 1.6183534 1.1759708-.2118264-1.2184634-.5895462-2.4652766-1.2422262-3.1804533-1.813361-1.6640314-26.3839445-6.5062864-29.4265992-6.237697-1.2683462.1151189-1.9344047 1.5526713-2.2573363 2.6267743 5.9503139.0545333 13.8013314.8573712 24.2006359 2.9346073z" fill="#0051b1"/><path d="m33.9545424 31.9742526c-.1123298.5250399-.2545529 1.2942294-.4221916 2.4674375-.1074574.7522017.5920691 1.3611269 1.0176847 1.6561079 1.1030185.7658972 2.3482599.8817827 2.7823035.7711648.304726-1.1298828-.3281664-3.1553755-1.011627-4.604865-.7496996-.2088571-1.539169-.3019605-2.3661695-.2898452z" fill="#0051b1"/><path d="m11.576416 31.2006226c6.5237918 3.6058327 12.8864102 2.7625121 12.8140516-4.8353103 3.0488744-3.5109919 2.2919307 4.4495968-.8329725 7.5376418 3.2568571 2.1349583 7.913564-.7538779 11.4386558-1.2291121 4.4503433 1.2522076 10.0800679-.8130041 13.7398483 1.9389162 4.9116326-7.9367702-16.5277001-3.027739-18.7003735-2.9212553-4.1082576-1.817751 2.8982044-2.0975484 3.7204673-3.2954151 1.0409823-1.3424914-2.6439031-.9227009-3.635791-.5450525-5.5056777-2.1260204 7.9094262-4.4328407 5.7107526 1.0673607 4.588715-1.3431334 11.9827014-1.5430712 15.2460938 1.5915527 5.0143858-12.7196708 3.4850637 13.7859204-16.7236328 11.6218872 1.3293801 1.1420344 1.6478069 2.8973085 1.078125 4.5117188 7.3209905-2.4553212 16.855255-3.2807426 18.803833-7.5292358.0755414.3492258-15.3958173 8.6502329-12.5546226 3.3750429 21.8262046-4.9067795 19.5890925-15.0059387 5.6645264-18.710719-30.0851236-6.0076466-36.8751626-.6155568-38.2037759 1.0587596 7.3892591 6.4491261-6.2090201 1.3941353 2.4348145 6.3632202zm3.8191528-5.0973511c-1.5417271.0226149-1.5417777-2.3995156.0001074-2.3767025 1.5416197-.0226214 1.5416703 2.3995092-.0001074 2.3767025z" fill="#0051b1"/></svg>',
                defaultDensity: 40,
                defaultFingerlingWeight: 40,
                harvestWeight: 800,
                growthPeriod: 28,
                feedConversionRatio: 2.0,
                temperature: '20-28°C',
                growthData: [
                    { week: 0, weight: 40, feedRate: 10, feedAmount: 4 },
                    { week: 4, weight: 120, feedRate: 8, feedAmount: 10 },
                    { week: 8, weight: 250, feedRate: 6, feedAmount: 15 },
                    { week: 12, weight: 400, feedRate: 5, feedAmount: 20 },
                    { week: 16, weight: 550, feedRate: 4, feedAmount: 22 },
                    { week: 20, weight: 650, feedRate: 3.5, feedAmount: 23 },
                    { week: 24, weight: 720, feedRate: 3, feedAmount: 22 },
                    { week: 28, weight: 800, feedRate: 2.5, feedAmount: 20 }
                ]
            },
            carp: {
                name: 'Carp',
                icon: '<svg height="300" viewBox="-22 0 464 464" width="300" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="m0 120c0 22.585938 20.03125 23.953125 24.046875 24l9.089844.105469-1.214844 9.015625c-1.058594 7.527344-1.738281 29.4375 7.621094 40.191406 3.914062 4.496094 9.296875 6.6875 16.457031 6.6875 17.167969 0 22.390625-10.121094 29.503906-26.632812 4.25-9.847657 9.007813-20.792969 18.742188-26.527344-.054688-3.425782-.230469-6.726563-.230469-10.214844-18.503906 2.773438-35.382813 13.902344-35.574219 14.03125l-8.875-13.3125c.960938-.640625 21.738282-14.28125 45.035156-16.878906.039063-.585938.023438-1.234375.070313-1.800782-9.609375-1.734374-30.175781-4.375-46.128906.929688l-5.0625-15.167969c18.847656-6.296875 41.457031-3.722656 52.96875-1.707031.933593-6.34375 2.101562-12.292969 3.4375-17.886719-7.039063-2.097656-19.6875-4.824219-37.871094-4.824219-30.078125-.007812-72.015625 15.214844-72.015625 39.992188zm0 0" fill="#0051b1"/></svg>',
                defaultDensity: 30,
                defaultFingerlingWeight: 45,
                harvestWeight: 600,
                growthPeriod: 26,
                feedConversionRatio: 2.0,
                temperature: '22-28°C',
                growthData: [
                    { week: 0, weight: 45, feedRate: 8, feedAmount: 3.6 },
                    { week: 4, weight: 80, feedRate: 7, feedAmount: 5.6 },
                    { week: 8, weight: 150, feedRate: 6, feedAmount: 9 },
                    { week: 12, weight: 250, feedRate: 5, feedAmount: 12.5 },
                    { week: 16, weight: 370, feedRate: 4, feedAmount: 14.8 },
                    { week: 20, weight: 480, feedRate: 3.5, feedAmount: 16.8 },
                    { week: 24, weight: 570, feedRate: 3, feedAmount: 17.1 },
                    { week: 26, weight: 600, feedRate: 2.5, feedAmount: 15 }
                ]
            }
        };
    }

    /**
     * Initialize grow bed types configuration for system setup
     */
    initializeGrowBedTypes() {
        this.app.growBedTypes = {
            'dwc': {
                name: 'Deep Water Culture',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'flood-drain': {
                name: 'Flood & Drain',
                fields: ['length', 'width', 'height'],
                calculation: 'media'
            },
            'media-flow': {
                name: 'Media Flow Through',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'vertical': {
                name: 'Vertical Growing',
                fields: ['base_length', 'base_width', 'base_height', 'vertical_count', 'plants_per_vertical'],
                calculation: 'vertical'
            },
            'nft': {
                name: 'NFT (Nutrient Film Technique)',
                fields: ['trough_length', 'trough_count', 'plant_spacing', 'reservoir_volume'],
                calculation: 'nft'
            }
        };
    }

    /**
     * Initialize API configuration and endpoints
     */
    initializeApiConfiguration() {
        // Use relative API URLs to avoid CSP issues
        this.app.API_BASE = '/api';
    }

    /**
     * Initialize UI Components (moved from constructor)
     * This method will be called after all modules are loaded
     */
    initializeUIComponents() {
        // Create a mapping of component names to their classes for better organization
        const componentMapping = {
            systemManagement: 'SystemManagementComponent',
            systemsList: 'SystemsListComponent',
            // charts: 'ChartsComponent', // Disabled - using MetricsChartManager instead
            chartModal: 'ChartModalComponent',
            formValidation: 'FormValidationComponent',
            modalManager: 'ModalManagerComponent',
            dataEntry: 'DataEntryComponent',
            dashboardManager: 'DashboardManagerComponent',
            dashboardUI: 'DashboardUIComponent',
            waterQuality: 'WaterQualityComponent',
            plantManagement: 'PlantManagementComponent',
            fishManagement: 'FishManagementComponent',
            forms: 'FormsComponent',
            formValidator: 'FormValidatorComponent',
            farmLayoutRenderer: 'FarmLayoutRendererComponent',
            customCropManager: 'CustomCropManagerComponent',
            tankMonitoringForm: 'TankMonitoringFormComponent',
            sprayApplicationManager: 'SprayApplicationManagerComponent',
            fishTankRenderer: 'FishTankRendererComponent',
            formGenerator: 'FormGeneratorComponent',
            utilities: 'UtilitiesComponent',
            notificationManager: 'NotificationManagerComponent',
            authenticationManager: 'AuthenticationManagerComponent',
            systemStateManager: 'SystemStateManagerComponent',
            plantBatchManager: 'PlantBatchManagerComponent',
            fishTankManager: 'FishTankManagerComponent',
            navigationManager: 'NavigationManagerComponent',
            waterQualitySensorManager: 'WaterQualitySensorManagerComponent',
            systemConfigManager: 'SystemConfigManagerComponent',
            cropAllocationManager: 'CropAllocationManagerComponent',
            systemCreationWizard: 'SystemCreationWizard'
        };

        // Initialize all UI components with error handling
        Object.entries(componentMapping).forEach(([propertyName, className]) => {
            try {
                // Check if the component class exists in the global scope
                if (window[className]) {
                    // Skip re-initialization of auth components if they already exist
                    if ((propertyName === 'modalManager' || propertyName === 'formValidation') && this.app[propertyName]) {
                        console.log(`🔄 Skipping ${propertyName} - already initialized for auth UI`);
                        return;
                    }
                    
                    this.app[propertyName] = new window[className](this.app);
                    
                    // Call initialize method if it exists
                    if (typeof this.app[propertyName].initialize === 'function') {
                        try {
                            const initResult = this.app[propertyName].initialize();
                            // Handle async initialize methods
                            if (initResult && typeof initResult.then === 'function') {
                                initResult.then(() => {
                                    console.log(`🔄 Initialized ${propertyName} component (async)`);
                                }).catch(initError => {
                                    console.error(`❌ Failed to initialize ${propertyName} (async):`, initError);
                                });
                            } else {
                                console.log(`🔄 Initialized ${propertyName} component`);
                            }
                        } catch (initError) {
                            console.error(`❌ Failed to initialize ${propertyName}:`, initError);
                        }
                    }
                } else {
                    console.warn(`⚠️ Component ${className} not found, skipping initialization`);
                }
            } catch (error) {
                console.error(`❌ Failed to initialize ${className}:`, error);
                // Set to null to prevent undefined access
                this.app[propertyName] = null;
            }
        });

        // Initialize wizard event listeners after wizard component is created
        if (this.app.systemCreationWizard && typeof this.app.systemCreationWizard.initializeEventListeners === 'function') {
            this.app.systemCreationWizard.initializeEventListeners();
        }

        console.log('✅ UI Components initialized via AppCore service');
    }

    /**
     * Get fish species data by name
     * @param {string} species - Species name (tilapia, trout, catfish, carp)
     * @returns {Object|null} Fish data object or null if not found
     */
    getFishData(species) {
        return this.app.fishData[species] || null;
    }

    /**
     * Get all available fish species
     * @returns {Array} Array of species names
     */
    getAvailableFishSpecies() {
        return Object.keys(this.app.fishData);
    }

    /**
     * Get grow bed type configuration
     * @param {string} bedType - Bed type (dwc, flood-drain, etc.)
     * @returns {Object|null} Bed type configuration or null if not found
     */
    getGrowBedTypeConfig(bedType) {
        return this.app.growBedTypes[bedType] || null;
    }

    /**
     * Get all available grow bed types
     * @returns {Array} Array of bed type names
     */
    getAvailableGrowBedTypes() {
        return Object.keys(this.app.growBedTypes);
    }

    /**
     * Update fish data for a specific species
     * @param {string} species - Species name
     * @param {Object} data - Updated fish data
     */
    updateFishData(species, data) {
        if (this.app.fishData[species]) {
            this.app.fishData[species] = { ...this.app.fishData[species], ...data };
        }
    }

    /**
     * Add new fish species data
     * @param {string} species - Species name
     * @param {Object} data - Fish data object
     */
    addFishSpecies(species, data) {
        this.app.fishData[species] = data;
    }

    /**
     * Get component statistics
     * @returns {Object} Statistics about the AppCore service
     */
    getStats() {
        return {
            fishSpecies: Object.keys(this.app.fishData).length,
            growBedTypes: Object.keys(this.app.growBedTypes).length,
            componentsInitialized: true,
            configurationLoaded: true
        };
    }

    /**
     * Clean up resources when component is destroyed
     */
    destroy() {
        // Clear configuration data
        this.app.fishData = {};
        this.app.growBedTypes = {};
        
        console.log('🧹 App Core Service destroyed');
    }
}

/**
 * Factory function to create AppCore service instance
 * @param {Object} appInstance - The main app instance
 * @returns {AppCoreService} New AppCore service instance
 */
export function createAppCoreService(appInstance) {
    return new AppCoreService(appInstance);
}

// Default export
export default AppCoreService;