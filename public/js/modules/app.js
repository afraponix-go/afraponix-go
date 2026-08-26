// Main Application Module
// Coordinates initialization of all components and services in correct order

import moduleLoader from './moduleLoader.js';

/**
 * Application Class
 * Manages the initialization and lifecycle of the entire application
 */
class Application {
    constructor() {
        this.initialized = false;
        this.components = new Map();
        this.services = new Map();
        this.config = null;
        this.startTime = performance.now();
        
        // Application state
        this.state = {
            isLoading: true,
            currentUser: null,
            activeSystem: null,
            lastError: null
        };
        
        console.log('🚀 Application initializing...');
    }

    /**
     * Initialize the application with error boundaries
     */
    async initialize() {
        if (this.initialized) {
            console.warn('⚠️ Application already initialized');
            return this;
        }

        try {
            console.log('🔄 Starting application initialization...');
            
            // Phase 1: Load configuration and constants
            await this.loadConfiguration();
            
            // Phase 2: Load core services (order matters)
            await this.loadCoreServices();
            
            // Phase 3: Load API modules
            await this.loadApiModules();
            
            // Phase 4: Load utilities
            await this.loadUtilities();
            
            // Phase 5: Load UI components
            await this.loadComponents();
            
            // Phase 6: Initialize legacy compatibility
            await this.setupLegacyCompatibility();
            
            // Phase 7: Start the application
            await this.startApplication();
            
            this.initialized = true;
            const totalTime = performance.now() - this.startTime;
            
            console.log(`✅ Application initialized successfully in ${totalTime.toFixed(2)}ms`);
            console.log('📊 Module loading stats:', moduleLoader.getStats());
            
            return this;
            
        } catch (error) {
            console.error('🚨 Application initialization failed:', error);
            await this.handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Phase 1: Load configuration and constants
     */
    async loadConfiguration() {
        console.log('📋 Phase 1: Loading configuration...');
        
        const configModules = [
            { path: './constants/index.js', options: { critical: true } }
        ];
        
        const results = await moduleLoader.loadModules(configModules);
        
        // Store configuration for later use
        if (results.successful.length > 0) {
            this.config = results.successful[0];
            console.log('✅ Configuration loaded');
        }
    }

    /**
     * Phase 2: Load core services (order-dependent)
     */
    async loadCoreServices() {
        console.log('⚙️ Phase 2: Loading core services...');
        
        const coreServices = [
            { 
                path: './services/appInitializer.js', 
                options: { 
                    critical: true,
                    dependencies: ['./constants/index.js']
                }
            },
            { 
                path: './services/eventManager.js', 
                options: { critical: true }
            },
            { 
                path: './services/systemManager.js', 
                options: { critical: true }
            },
            { 
                path: './services/dataProcessor.js', 
                options: { critical: false }
            }
        ];
        
        // Load core services sequentially to respect dependencies
        const results = await moduleLoader.loadModulesSequentially(coreServices);
        
        // Register successful services
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const serviceName = this.getServiceNameFromPath(coreServices[index].path);
                this.services.set(serviceName, result.value);
                console.log(`✅ Core service loaded: ${serviceName}`);
            }
        });
    }

    /**
     * Phase 3: Load API modules
     */
    async loadApiModules() {
        console.log('🌐 Phase 3: Loading API modules...');
        
        const apiModules = [
            './api/authAPI.js',
            './api/systemsAPI.js',
            './api/dataAPI.js',
            './api/plantsAPI.js',
            './api/fishAPI.js',
            './api/waterQualityAPI.js',
            './api/growBedsAPI.js',
            './api/cropKnowledgeAPI.js',
            './api/deficiencyImagesAPI.js',
            './api/notificationAPI.js',
            './api/settingsAPI.js'
        ];
        
        const results = await moduleLoader.loadModules(
            apiModules.map(path => ({ 
                path, 
                options: { 
                    critical: false, 
                    retries: 3 
                } 
            }))
        );
        
        console.log(`✅ API modules loaded: ${results.successful.length}/${apiModules.length}`);
    }

    /**
     * Phase 4: Load utilities
     */
    async loadUtilities() {
        console.log('🔧 Phase 4: Loading utilities...');
        
        const utilityModules = [
            './utils/storageUtils.js',
            './utils/growBedValidation.js',
            './utils/nutrientValidation.js'
        ];
        
        const results = await moduleLoader.loadModules(
            utilityModules.map(path => ({ 
                path, 
                options: { critical: false } 
            }))
        );
        
        console.log(`✅ Utilities loaded: ${results.successful.length}/${utilityModules.length}`);
    }

    /**
     * Phase 5: Load UI components
     */
    async loadComponents() {
        console.log('🎨 Phase 5: Loading UI components...');
        
        // Load specialized services first
        const serviceModules = [
            { 
                path: './services/growBedService.js', 
                options: { critical: false }
            },
            { 
                path: './services/nutrientCalculator.js', 
                options: { critical: false }
            }
        ];
        
        await moduleLoader.loadModules(serviceModules);
        
        // Load component groups
        const componentModules = [
            { 
                path: './components/notifications.js', 
                options: { critical: true } 
            },
            { 
                path: './components/systemsList.js', 
                options: { critical: true }
            },
            { 
                path: './components/dashboard.js', 
                options: { critical: true }
            },
            { 
                path: './components/growBedsManager.js', 
                options: { 
                    critical: false,
                    dependencies: ['./services/growBedService.js']
                }
            },
            { 
                path: './components/nutrientManager.js', 
                options: { 
                    critical: false,
                    dependencies: ['./services/nutrientCalculator.js']
                }
            }
        ];
        
        const results = await moduleLoader.loadModules(componentModules);
        
        // Register successful components
        results.successful.forEach((module, index) => {
            const componentName = this.getComponentNameFromPath(componentModules[index].path);
            this.components.set(componentName, module);
            console.log(`✅ Component loaded: ${componentName}`);
        });
        
        console.log(`✅ Components loaded: ${results.successful.length}/${componentModules.length}`);
    }

    /**
     * Phase 6: Setup legacy compatibility layer
     */
    async setupLegacyCompatibility() {
        console.log('🔗 Phase 6: Setting up legacy compatibility...');
        
        try {
            // Create legacy app instance for backward compatibility
            const legacyApp = this.createLegacyAppInstance();
            
            // Make it globally available
            window.app = legacyApp;
            
            // Initialize component managers if available
            await this.initializeComponentManagers(legacyApp);
            
            console.log('✅ Legacy compatibility layer established');
            
        } catch (error) {
            console.warn('⚠️ Legacy compatibility setup failed:', error);
            // Non-critical, continue initialization
        }
    }

    /**
     * Phase 7: Start the application
     */
    async startApplication() {
        console.log('🎯 Phase 7: Starting application...');
        
        try {
            // Check critical modules
            moduleLoader.checkCriticalModules();
            
            // Initialize authentication
            await this.initializeAuthentication();
            
            // Set initial state
            this.state.isLoading = false;
            
            // Emit application ready event
            this.dispatchEvent('app:ready', { 
                timestamp: new Date().toISOString(),
                loadTime: performance.now() - this.startTime,
                stats: moduleLoader.getStats()
            });
            
            console.log('✅ Application started successfully');
            
        } catch (error) {
            console.error('🚨 Failed to start application:', error);
            throw error;
        }
    }

    /**
     * Create legacy app instance for backward compatibility
     */
    createLegacyAppInstance() {
        const legacyApp = {
            // Core methods that existing code expects
            showMessage: (message, type = 'info') => {
                const notifications = this.components.get('notifications');
                if (notifications && notifications.default) {
                    notifications.default.show(message, type);
                } else {
                    console.log(`${type.toUpperCase()}: ${message}`);
                }
            },
            
            showNotification: (message, type = 'info', duration = 4000) => {
                const notifications = this.components.get('notifications');
                if (notifications && notifications.default) {
                    notifications.default.show(message, type, duration);
                } else {
                    console.log(`${type.toUpperCase()}: ${message}`);
                }
            },
            
            // Component references (will be populated by component managers)
            growBedManager: null,
            nutrientManager: null,
            nutrientRatioManager: null,
            
            // Services
            eventManager: this.services.get('eventManager')?.default,
            systemManager: this.services.get('systemManager')?.default,
            
            // Application instance reference
            _application: this
        };
        
        return legacyApp;
    }

    /**
     * Initialize component managers
     */
    async initializeComponentManagers(legacyApp) {
        try {
            // Initialize grow bed manager if available
            const growBedsManager = this.components.get('growBedsManager');
            if (growBedsManager && growBedsManager.default) {
                const manager = new growBedsManager.default(legacyApp);
                await manager.initialize();
                legacyApp.growBedManager = manager;
            }
            
            // Initialize nutrient manager if available
            const nutrientManager = this.components.get('nutrientManager');
            if (nutrientManager && nutrientManager.default) {
                const manager = new nutrientManager.default(legacyApp);
                await manager.initialize();
                legacyApp.nutrientManager = manager;
                legacyApp.nutrientRatioManager = manager; // Legacy alias
                console.log('✅ Nutrient manager initialized');
            }
            
        } catch (error) {
            console.warn('⚠️ Component manager initialization failed:', error);
        }
    }

    /**
     * Initialize authentication
     */
    async initializeAuthentication() {
        try {
            const authAPI = moduleLoader.getModule('./api/authAPI.js');
            if (authAPI) {
                // Check if user is already authenticated
                const token = localStorage.getItem('auth_token');
                if (token) {
                    // Validate token and load user data
                    console.log('🔐 Validating existing authentication...');
                    // Implementation would depend on your auth system
                }
            }
        } catch (error) {
            console.warn('⚠️ Authentication initialization failed:', error);
        }
    }

    /**
     * Handle initialization errors
     */
    async handleInitializationError(error) {
        this.state.lastError = error;
        this.state.isLoading = false;
        
        // Try to show error message if notifications are available
        const notifications = this.components.get('notifications');
        if (notifications) {
            notifications.default?.show(
                'Application failed to initialize. Please refresh the page.',
                'error',
                10000
            );
        }
        
        // Emit error event
        this.dispatchEvent('app:error', { error: error.message, timestamp: new Date().toISOString() });
        
        // Log detailed error information
        console.error('🚨 Application Error Details:');
        console.error('Error:', error);
        console.error('Module Stats:', moduleLoader.getStats());
        console.error('Dependency Report:', moduleLoader.generateDependencyReport());
    }

    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Get service name from file path
     */
    getServiceNameFromPath(path) {
        return path.split('/').pop().replace('.js', '').replace(/([A-Z])/g, '$1').toLowerCase();
    }

    /**
     * Get component name from file path
     */
    getComponentNameFromPath(path) {
        return path.split('/').pop().replace('.js', '').replace(/([A-Z])/g, '$1').toLowerCase();
    }

    /**
     * Get application state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get loaded components
     */
    getComponents() {
        return Array.from(this.components.keys());
    }

    /**
     * Get loaded services
     */
    getServices() {
        return Array.from(this.services.keys());
    }

    /**
     * Cleanup application
     */
    async destroy() {
        console.log('🧹 Cleaning up application...');
        
        // Cleanup components
        for (const [name, component] of this.components) {
            if (component.default && typeof component.default.destroy === 'function') {
                try {
                    await component.default.destroy();
                    console.log(`✅ Cleaned up component: ${name}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to cleanup component ${name}:`, error);
                }
            }
        }
        
        // Clear collections
        this.components.clear();
        this.services.clear();
        
        // Clear module loader
        moduleLoader.clear();
        
        // Remove global references
        if (window.app) {
            delete window.app;
        }
        
        this.initialized = false;
        console.log('✅ Application cleanup complete');
    }
}

// Create and export application instance
const app = new Application();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('🚨 Failed to auto-initialize application:', error);
        
        // Show fallback error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #dc3545; color: white; padding: 1rem; border-radius: 8px;
            z-index: 10000; max-width: 500px; text-align: center; font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>Application Error</strong><br>
            Failed to initialize. Please refresh the page.<br>
            <small>${error.message}</small>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Export for manual initialization if needed
export default app;