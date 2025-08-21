// Main Application Entry Point
// Slimmed-down coordinating class for the modular Afraponix Go application

import { AppInitializer, EventManager, SystemManager, DataProcessor } from './modules/services/index.js';
import { Notifications, SystemsList, Dashboard } from './modules/components/index.js';
import { StorageUtils } from './modules/utils/index.js';

/**
 * Main Application Class (Slimmed Down)
 * Core coordination logic only - delegates functionality to specialized modules
 */
class AquaponicsApp {
    constructor() {
        // Core application state
        this.activeSystemId = null;
        this.isInitialized = false;
        this.isLoading = true;
        this.currentView = 'dashboard';
        
        // Authentication state
        this.token = localStorage.getItem('auth_token');
        this.user = null;
        
        // Legacy data structure for backward compatibility
        this.dataRecords = { 
            waterQuality: [], 
            fishInventory: { tanks: [] }, 
            fishEvents: [], 
            plantGrowth: [], 
            operations: [],
            nutrients: []
        };
        
        // API configuration
        this.API_BASE = '/api';
        this.charts = {}; // For backward compatibility
        
        // Initialize modules
        this.initializeModules();
        
        // Start initialization
        this.init();
    }

    /**
     * Initialize all application modules
     */
    initializeModules() {
        console.log('🚀 Initializing application modules...');
        
        // Core services
        this.initializer = new AppInitializer(this);
        this.eventManager = new EventManager(this);
        this.systemManager = new SystemManager(this);
        this.dataProcessor = new DataProcessor(this);
        
        // UI components
        this.notifications = new Notifications(this);
        this.systemsList = new SystemsList(this);
        this.dashboard = new Dashboard(this);
        
        console.log('📦 Application modules initialized');
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Starting Afraponix Go application initialization...');
            
            // Initialize modules in order
            await this.eventManager.initialize();
            await this.notifications.initialize();
            await this.systemsList.initialize();
            await this.dashboard.initialize();
            await this.dataProcessor.initialize();
            
            // Handle authentication and system loading
            const authSuccess = await this.initializer.initialize();
            
            if (authSuccess) {
                // Initialize system manager and load systems
                await this.systemManager.initialize();
            }
            
            this.isInitialized = true;
            this.isLoading = false;
            
            console.log('✅ Afraponix Go application initialized successfully');
            this.showNotification('Afraponix Go loaded successfully!', 'success', 2000);
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.isLoading = false;
            this.showNotification('Application initialization failed', 'error');
        }
    }

    /**
     * Core API communication method
     */
    async makeApiCall(endpoint, options = {}) {
        // Delegate to initializer for auth-related endpoints
        if (endpoint.startsWith('/auth/')) {
            return this.initializer.makeApiCall?.(endpoint, options) || this.makeDirectApiCall(endpoint, options);
        }
        
        return this.makeDirectApiCall(endpoint, options);
    }

    /**
     * Direct API call implementation
     */
    async makeDirectApiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = this.token;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorMessage;
                } catch {
                    // Use default error message
                }
                
                throw new Error(errorMessage);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Set current view and manage component visibility
     */
    setCurrentView(view) {
        const previousView = this.currentView;
        this.currentView = view;
        
        console.log(`📱 View changed: ${previousView} → ${view}`);
        
        // Hide previous view components
        if (previousView === 'dashboard') {
            this.dashboard.hide();
        }
        
        // Show new view components
        if (view === 'dashboard') {
            this.dashboard.show();
        }
        
        // Emit view change event
        this.eventManager.emit('view-changed', { previousView, currentView: view });
    }

    /**
     * Switch to a different system
     */
    async switchToSystem(systemId) {
        if (this.systemManager) {
            await this.systemManager.switchToSystem(systemId);
        } else {
            console.warn('⚠️ System manager not initialized');
        }
    }

    // Delegation methods for backward compatibility
    showNotification(message, type = 'info', duration = 4000) {
        if (this.notifications) {
            return this.notifications.showNotification(message, type, duration);
        }
        console.log(`Notification [${type}]: ${message}`);
    }

    clearAllNotifications() {
        if (this.notifications) {
            this.notifications.clearAllNotifications();
        }
    }

    showCustomConfirm(title, message, details = []) {
        if (this.notifications) {
            return this.notifications.showCustomConfirm(title, message, details);
        }
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    // Authentication delegation methods
    async login(username, password) {
        return this.initializer.login(username, password);
    }

    async register(username, email, password, firstName, lastName) {
        return this.initializer.register(username, email, password, firstName, lastName);
    }

    async logout() {
        return this.initializer.logout();
    }

    // Legacy lightbox methods (maintain backward compatibility)
    openLightbox(imageUrl, caption, nutrientName, cropName) {
        console.log('🖼️ Opening lightbox for:', imageUrl);
        // Implementation moved to a dedicated lightbox component
        // This is a placeholder for backward compatibility
    }

    closeLightbox() {
        console.log('🖼️ Closing lightbox');
        // Implementation moved to a dedicated lightbox component
    }

    /**
     * Get application statistics and state
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            currentView: this.currentView,
            activeSystemId: this.activeSystemId,
            hasToken: !!this.token,
            user: this.user?.username || null,
            modules: {
                initializer: !!this.initializer,
                eventManager: !!this.eventManager,
                systemManager: !!this.systemManager,
                dataProcessor: !!this.dataProcessor,
                notifications: !!this.notifications,
                systemsList: !!this.systemsList,
                dashboard: !!this.dashboard
            },
            cache: this.dataProcessor?.getCacheStats?.() || {},
            systems: this.systemManager?.getSystemStats?.() || {}
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying application');
        
        // Cleanup modules
        if (this.eventManager) this.eventManager.cleanup();
        if (this.dashboard) this.dashboard.destroy();
        
        // Clear references
        this.isInitialized = false;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM loaded, initializing Afraponix Go...');
    window.app = new AquaponicsApp();
});

// Export for module use
export default AquaponicsApp;