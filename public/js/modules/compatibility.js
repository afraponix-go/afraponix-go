// Compatibility Layer
// Bridges legacy script.js with modern ES6 modules during transition

import moduleLoader from './moduleLoader.js';

/**
 * Compatibility Manager
 * Handles integration between legacy code and modern modules
 */
class CompatibilityManager {
    constructor() {
        this.legacyApp = null;
        this.modernApp = null;
        this.migrationStatus = {
            phase: 'legacy', // 'legacy', 'hybrid', 'modern'
            componentsUsingModules: new Set(),
            legacyComponentsRemaining: new Set()
        };
        
        console.log('🔗 Compatibility Manager initialized');
    }

    /**
     * Initialize compatibility layer
     */
    async initialize() {
        console.log('🔄 Initializing compatibility layer...');
        
        try {
            // Check what's available
            await this.assessEnvironment();
            
            // Set up bridge functions
            this.setupBridgeFunctions();
            
            // Create compatibility shims
            this.createCompatibilityShims();
            
            // Monitor for component migrations
            this.setupMigrationMonitoring();
            
            console.log(`✅ Compatibility layer initialized (Phase: ${this.migrationStatus.phase})`);
            
        } catch (error) {
            console.error('❌ Compatibility layer initialization failed:', error);
            throw error;
        }
    }

    /**
     * Assess current environment and available components
     */
    async assessEnvironment() {
        // Check if legacy app exists
        this.legacyApp = window.app || null;
        
        // Try to detect modern app
        try {
            const appModule = await moduleLoader.loadModule('./app.js', { critical: false });
            this.modernApp = appModule?.default || null;
        } catch (error) {
            console.log('Modern app not available:', error.message);
        }
        
        // Determine migration phase
        if (this.modernApp && this.legacyApp) {
            this.migrationStatus.phase = 'hybrid';
            console.log('🔄 Running in hybrid mode (legacy + modules)');
        } else if (this.modernApp) {
            this.migrationStatus.phase = 'modern';
            console.log('✨ Running in modern mode (modules only)');
        } else {
            this.migrationStatus.phase = 'legacy';
            console.log('📰 Running in legacy mode (script.js only)');
        }
    }

    /**
     * Set up bridge functions between legacy and modern systems
     */
    setupBridgeFunctions() {
        // Create global bridge object
        window.appBridge = {
            // Component access
            getComponent: (name) => this.getComponent(name),
            getService: (name) => this.getService(name),
            
            // Messaging bridge
            showMessage: (message, type) => this.bridgeShowMessage(message, type),
            showNotification: (message, type, duration) => this.bridgeShowNotification(message, type, duration),
            
            // Event bridge
            emitEvent: (eventName, data) => this.bridgeEmitEvent(eventName, data),
            onEvent: (eventName, handler) => this.bridgeOnEvent(eventName, handler),
            
            // Data bridge
            getData: (key) => this.bridgeGetData(key),
            setData: (key, value) => this.bridgeSetData(key, value),
            
            // Migration helpers
            migrateComponent: (componentName) => this.migrateComponent(componentName),
            isComponentMigrated: (componentName) => this.isComponentMigrated(componentName),
            
            // Status
            getStatus: () => this.migrationStatus
        };
        
        console.log('✅ Bridge functions established');
    }

    /**
     * Create compatibility shims for common legacy patterns
     */
    createCompatibilityShims() {
        // Ensure window.app exists for legacy code
        if (!window.app) {
            window.app = this.createLegacyAppShim();
        } else if (this.modernApp) {
            // Enhance existing app with modern features
            this.enhanceLegacyApp();
        }
        
        // Create component shims for components that have been migrated
        this.createComponentShims();
        
        console.log('✅ Compatibility shims created');
    }

    /**
     * Create legacy app shim when no legacy app exists
     */
    createLegacyAppShim() {
        return {
            // Basic app methods
            showMessage: (msg, type) => this.bridgeShowMessage(msg, type),
            showNotification: (msg, type, dur) => this.bridgeShowNotification(msg, type, dur),
            
            // Component references (will be populated as components migrate)
            growBedManager: null,
            nutrientManager: null,
            nutrientRatioManager: null,
            
            // Bridge to modern app
            _modernApp: this.modernApp,
            _compatibilityManager: this
        };
    }

    /**
     * Enhance existing legacy app with modern features
     */
    enhanceLegacyApp() {
        if (!this.legacyApp || !this.modernApp) return;
        
        // Add modern app reference
        this.legacyApp._modernApp = this.modernApp;
        this.legacyApp._compatibilityManager = this;
        
        // Enhance showMessage/showNotification to use modern system if available
        const originalShowMessage = this.legacyApp.showMessage;
        this.legacyApp.showMessage = (msg, type) => {
            return this.bridgeShowMessage(msg, type) || originalShowMessage?.call(this.legacyApp, msg, type);
        };
        
        const originalShowNotification = this.legacyApp.showNotification;
        this.legacyApp.showNotification = (msg, type, dur) => {
            return this.bridgeShowNotification(msg, type, dur) || originalShowNotification?.call(this.legacyApp, msg, type, dur);
        };
        
        console.log('✅ Legacy app enhanced with modern features');
    }

    /**
     * Create shims for migrated components
     */
    createComponentShims() {
        const migratedComponents = [
            'growBedManager',
            'nutrientManager',
            'nutrientRatioManager'
        ];
        
        migratedComponents.forEach(componentName => {
            if (this.isComponentMigrated(componentName)) {
                this.createComponentShim(componentName);
            }
        });
    }

    /**
     * Create shim for specific component
     */
    createComponentShim(componentName) {
        if (!window.app) return;
        
        // Create lazy-loading shim
        Object.defineProperty(window.app, componentName, {
            get: () => {
                // Try to get from modern app first
                const modernComponent = this.getComponent(componentName);
                if (modernComponent) {
                    return modernComponent;
                }
                
                // Fall back to legacy if available
                return this.legacyApp?.[componentName] || null;
            },
            
            set: (value) => {
                // Allow setting for backward compatibility
                if (this.legacyApp) {
                    this.legacyApp[`_${componentName}`] = value;
                }
            },
            
            configurable: true
        });
        
        console.log(`✅ Created shim for ${componentName}`);
    }

    /**
     * Set up monitoring for component migrations
     */
    setupMigrationMonitoring() {
        // Listen for component load events
        document.addEventListener('component:loaded', (event) => {
            const { componentName } = event.detail;
            this.migrationStatus.componentsUsingModules.add(componentName);
            console.log(`📦 Component migrated to modules: ${componentName}`);
        });
        
        // Listen for component unload events
        document.addEventListener('component:unloaded', (event) => {
            const { componentName } = event.detail;
            this.migrationStatus.componentsUsingModules.delete(componentName);
            this.migrationStatus.legacyComponentsRemaining.add(componentName);
            console.log(`📰 Component reverted to legacy: ${componentName}`);
        });
    }

    // =====================================================
    // BRIDGE METHODS
    // =====================================================

    /**
     * Bridge showMessage calls
     */
    bridgeShowMessage(message, type = 'info') {
        // Try modern app first
        if (this.modernApp?.showMessage) {
            this.modernApp.showMessage(message, type);
            return true;
        }
        
        // Try modern components
        const notifications = this.getComponent('notifications');
        if (notifications?.show) {
            notifications.show(message, type);
            return true;
        }
        
        // Fall back to legacy
        if (this.legacyApp?.showMessage) {
            this.legacyApp.showMessage(message, type);
            return true;
        }
        
        // Last resort
        console.log(`${type.toUpperCase()}: ${message}`);
        return false;
    }

    /**
     * Bridge showNotification calls
     */
    bridgeShowNotification(message, type = 'info', duration = 4000) {
        // Try modern app first
        if (this.modernApp?.showNotification) {
            this.modernApp.showNotification(message, type, duration);
            return true;
        }
        
        // Try modern components
        const notifications = this.getComponent('notifications');
        if (notifications?.show) {
            notifications.show(message, type, duration);
            return true;
        }
        
        // Fall back to legacy
        if (this.legacyApp?.showNotification) {
            this.legacyApp.showNotification(message, type, duration);
            return true;
        }
        
        return this.bridgeShowMessage(message, type);
    }

    /**
     * Bridge event emission
     */
    bridgeEmitEvent(eventName, data) {
        // Emit both modern and legacy events
        const modernEvent = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(modernEvent);
        
        // Legacy event system if available
        if (this.legacyApp?.eventManager?.emit) {
            this.legacyApp.eventManager.emit(eventName, data);
        }
    }

    /**
     * Bridge event listening
     */
    bridgeOnEvent(eventName, handler) {
        // Listen to modern events
        document.addEventListener(eventName, handler);
        
        // Legacy event system if available
        if (this.legacyApp?.eventManager?.on) {
            this.legacyApp.eventManager.on(eventName, handler);
        }
    }

    /**
     * Bridge data getting
     */
    bridgeGetData(key) {
        // Try modern app state
        if (this.modernApp?.getState) {
            const state = this.modernApp.getState();
            if (state[key] !== undefined) {
                return state[key];
            }
        }
        
        // Try legacy app
        if (this.legacyApp?.[key] !== undefined) {
            return this.legacyApp[key];
        }
        
        // Try localStorage
        try {
            const stored = localStorage.getItem(`app_${key}`);
            return stored ? JSON.parse(stored) : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Bridge data setting
     */
    bridgeSetData(key, value) {
        // Set in modern app if available
        if (this.modernApp?.setState) {
            this.modernApp.setState({ [key]: value });
        }
        
        // Set in legacy app
        if (this.legacyApp) {
            this.legacyApp[key] = value;
        }
        
        // Persist to localStorage
        try {
            localStorage.setItem(`app_${key}`, JSON.stringify(value));
        } catch (error) {
            console.warn('Failed to persist data to localStorage:', error);
        }
    }

    // =====================================================
    // COMPONENT ACCESS
    // =====================================================

    /**
     * Get component from modern or legacy system
     */
    getComponent(name) {
        // Try modern app components first
        if (this.modernApp?.getComponent) {
            const component = this.modernApp.getComponent(name);
            if (component) return component;
        }
        
        // Try module loader
        const module = moduleLoader.getModule(`./components/${name}.js`);
        if (module) return module.default || module;
        
        // Fall back to legacy app
        return this.legacyApp?.[name] || null;
    }

    /**
     * Get service from modern or legacy system
     */
    getService(name) {
        // Try modern app services first
        if (this.modernApp?.getService) {
            const service = this.modernApp.getService(name);
            if (service) return service;
        }
        
        // Try module loader
        const module = moduleLoader.getModule(`./services/${name}.js`);
        if (module) return module.default || module;
        
        // Fall back to legacy app
        return this.legacyApp?.[name] || null;
    }

    // =====================================================
    // MIGRATION HELPERS
    // =====================================================

    /**
     * Migrate specific component to module system
     */
    async migrateComponent(componentName) {
        console.log(`🔄 Migrating ${componentName} to module system...`);
        
        try {
            // Load the modern component
            const component = await moduleLoader.loadModule(`./components/${componentName}.js`);
            
            if (component) {
                // Initialize if needed
                if (typeof component.initialize === 'function') {
                    await component.initialize();
                }
                
                // Replace legacy component
                if (this.legacyApp) {
                    this.legacyApp[componentName] = component.default || component;
                }
                
                // Mark as migrated
                this.migrationStatus.componentsUsingModules.add(componentName);
                this.migrationStatus.legacyComponentsRemaining.delete(componentName);
                
                // Emit migration event
                document.dispatchEvent(new CustomEvent('component:migrated', {
                    detail: { componentName, component }
                }));
                
                console.log(`✅ Successfully migrated ${componentName}`);
                return true;
            }
        } catch (error) {
            console.error(`❌ Failed to migrate ${componentName}:`, error);
            return false;
        }
        
        return false;
    }

    /**
     * Check if component is migrated to modules
     */
    isComponentMigrated(componentName) {
        return this.migrationStatus.componentsUsingModules.has(componentName);
    }

    /**
     * Get migration status report
     */
    getMigrationStatus() {
        return {
            ...this.migrationStatus,
            totalComponents: this.migrationStatus.componentsUsingModules.size + 
                           this.migrationStatus.legacyComponentsRemaining.size,
            migrationProgress: this.migrationStatus.componentsUsingModules.size > 0 ?
                (this.migrationStatus.componentsUsingModules.size / 
                 (this.migrationStatus.componentsUsingModules.size + this.migrationStatus.legacyComponentsRemaining.size) * 100).toFixed(1) + '%' :
                '0%'
        };
    }

    /**
     * Force fallback to legacy system
     */
    fallbackToLegacy() {
        console.log('⚠️ Falling back to legacy system...');
        
        this.migrationStatus.phase = 'legacy';
        
        // Clear modern app reference
        if (window.app?._modernApp) {
            delete window.app._modernApp;
        }
        
        // Emit fallback event
        document.dispatchEvent(new CustomEvent('app:fallback', {
            detail: { reason: 'Manual fallback requested' }
        }));
    }

    /**
     * Clean up compatibility layer
     */
    destroy() {
        console.log('🧹 Cleaning up compatibility layer...');
        
        // Remove bridge
        delete window.appBridge;
        
        // Clean up modern references in legacy app
        if (this.legacyApp) {
            delete this.legacyApp._modernApp;
            delete this.legacyApp._compatibilityManager;
        }
        
        console.log('✅ Compatibility layer cleanup complete');
    }
}

// Create global compatibility manager
const compatibilityManager = new CompatibilityManager();

// Auto-initialize compatibility layer
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await compatibilityManager.initialize();
    } catch (error) {
        console.error('Failed to initialize compatibility layer:', error);
    }
});

export default compatibilityManager;