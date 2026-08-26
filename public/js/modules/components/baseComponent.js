// Base Component Class
// Provides common functionality and patterns for all UI components

/**
 * Base Component Class
 * Standard foundation for all UI components with common lifecycle methods and patterns
 */
export class BaseComponent {
    constructor(app, componentName = 'Component') {
        // Core properties every component needs
        this.app = app;
        this.componentName = componentName;
        this.isInitialized = false;
        this.isActive = false;
        this.eventHandlers = new Map();
        this.timers = new Set();
        this.intervals = new Set();
        this.abortController = new AbortController();
        
        // Component metadata
        this.version = '1.0.0';
        this.createdAt = new Date();
        
        // Initialize logging
        this.log(`🏗️ ${this.componentName} Component initialized`);
    }

    /**
     * Initialize the component (should be overridden by subclasses)
     * Called after construction to set up component-specific functionality
     */
    async initialize() {
        if (this.isInitialized) {
            this.log(`⚠️ ${this.componentName} already initialized`);
            return;
        }

        this.log(`🔧 Initializing ${this.componentName} component...`);
        
        try {
            // Call subclass initialization if it exists
            if (typeof this.onInitialize === 'function') {
                await this.onInitialize();
            }
            
            this.isInitialized = true;
            this.log(`✅ ${this.componentName} component initialized successfully`);
            
        } catch (error) {
            this.logError(`Failed to initialize ${this.componentName} component`, error);
            throw error;
        }
    }

    /**
     * Show/activate the component
     */
    async show() {
        this.log(`👁️ Showing ${this.componentName} component`);
        this.isActive = true;
        
        try {
            // Call subclass show method if it exists
            if (typeof this.onShow === 'function') {
                await this.onShow();
            }
            
            // Emit show event
            this.emit('show');
            
        } catch (error) {
            this.logError(`Failed to show ${this.componentName} component`, error);
            throw error;
        }
    }

    /**
     * Hide/deactivate the component
     */
    hide() {
        this.log(`🙈 Hiding ${this.componentName} component`);
        this.isActive = false;
        
        try {
            // Call subclass hide method if it exists
            if (typeof this.onHide === 'function') {
                this.onHide();
            }
            
            // Emit hide event
            this.emit('hide');
            
        } catch (error) {
            this.logError(`Failed to hide ${this.componentName} component`, error);
        }
    }

    /**
     * Register an event handler with automatic cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || typeof element.addEventListener !== 'function') {
            this.logError('Invalid element provided to addEventListener');
            return;
        }

        // Create wrapped handler that includes abort signal
        const wrappedHandler = (e) => {
            try {
                handler(e);
            } catch (error) {
                this.logError(`Event handler error for ${event}`, error);
            }
        };

        // Use AbortController for automatic cleanup
        const eventOptions = { 
            ...options, 
            signal: this.abortController.signal 
        };

        element.addEventListener(event, wrappedHandler, eventOptions);

        // Store reference for manual removal if needed
        const handlerKey = `${element.tagName || 'element'}_${event}_${Date.now()}`;
        this.eventHandlers.set(handlerKey, { element, event, handler: wrappedHandler });

        return handlerKey;
    }

    /**
     * Remove a specific event handler
     */
    removeEventListener(handlerKey) {
        const handlerData = this.eventHandlers.get(handlerKey);
        if (handlerData) {
            handlerData.element.removeEventListener(
                handlerData.event, 
                handlerData.handler
            );
            this.eventHandlers.delete(handlerKey);
        }
    }

    /**
     * Create a managed timeout that will be cleaned up automatically
     */
    setTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            try {
                callback();
            } catch (error) {
                this.logError('Timeout callback error', error);
            } finally {
                this.timers.delete(timeoutId);
            }
        }, delay);

        this.timers.add(timeoutId);
        return timeoutId;
    }

    /**
     * Create a managed interval that will be cleaned up automatically
     */
    setInterval(callback, delay) {
        const intervalId = setInterval(() => {
            try {
                callback();
            } catch (error) {
                this.logError('Interval callback error', error);
            }
        }, delay);

        this.intervals.add(intervalId);
        return intervalId;
    }

    /**
     * Clear a specific timeout
     */
    clearTimeout(timeoutId) {
        clearTimeout(timeoutId);
        this.timers.delete(timeoutId);
    }

    /**
     * Clear a specific interval
     */
    clearInterval(intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(intervalId);
    }

    /**
     * Emit a custom event (basic event emitter functionality)
     */
    emit(eventName, data = {}) {
        if (this.app && typeof this.app.emit === 'function') {
            // Use app-level event system if available
            this.app.emit(`${this.componentName.toLowerCase()}:${eventName}`, {
                component: this.componentName,
                ...data
            });
        }
    }

    /**
     * Get component statistics and health information
     */
    getStats() {
        const stats = {
            componentName: this.componentName,
            version: this.version,
            isInitialized: this.isInitialized,
            isActive: this.isActive,
            createdAt: this.createdAt,
            uptime: Date.now() - this.createdAt.getTime(),
            eventHandlers: this.eventHandlers.size,
            activeTimers: this.timers.size,
            activeIntervals: this.intervals.size,
            hasActiveSystem: !!(this.app && this.app.activeSystemId)
        };

        // Allow subclasses to add their own stats
        if (typeof this.getComponentStats === 'function') {
            const componentStats = this.getComponentStats();
            Object.assign(stats, componentStats);
        }

        return stats;
    }

    /**
     * Check if component is healthy and functioning properly
     */
    healthCheck() {
        const issues = [];

        // Basic health checks
        if (!this.app) {
            issues.push('No app reference');
        }

        if (this.eventHandlers.size > 50) {
            issues.push(`High number of event handlers: ${this.eventHandlers.size}`);
        }

        if (this.timers.size > 20) {
            issues.push(`High number of active timers: ${this.timers.size}`);
        }

        if (this.intervals.size > 10) {
            issues.push(`High number of active intervals: ${this.intervals.size}`);
        }

        // Allow subclasses to add component-specific health checks
        if (typeof this.getHealthIssues === 'function') {
            const componentIssues = this.getHealthIssues();
            issues.push(...componentIssues);
        }

        return {
            healthy: issues.length === 0,
            issues,
            lastChecked: new Date()
        };
    }

    /**
     * Standardized logging with component context
     */
    log(message, data = null) {
        const logMessage = `[${this.componentName}] ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    /**
     * Standardized error logging
     */
    logError(message, error = null) {
        const errorMessage = `[${this.componentName}] ❌ ${message}`;
        if (error) {
            console.error(errorMessage, error);
        } else {
            console.error(errorMessage);
        }
    }

    /**
     * Standardized warning logging
     */
    logWarning(message, data = null) {
        const warningMessage = `[${this.componentName}] ⚠️ ${message}`;
        if (data) {
            console.warn(warningMessage, data);
        } else {
            console.warn(warningMessage);
        }
    }

    /**
     * Make API calls with component context and error handling
     */
    async makeApiCall(endpoint, options = {}) {
        if (!this.app || typeof this.app.makeApiCall !== 'function') {
            throw new Error(`${this.componentName}: App API client not available`);
        }

        try {
            this.log(`📡 API call: ${options.method || 'GET'} ${endpoint}`);
            const result = await this.app.makeApiCall(endpoint, options);
            this.log(`✅ API call successful: ${endpoint}`);
            return result;
            
        } catch (error) {
            this.logError(`API call failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Show notification through app notification system
     */
    showNotification(message, type = 'info', duration = 3000) {
        if (this.app && typeof this.app.showNotification === 'function') {
            this.app.showNotification(`[${this.componentName}] ${message}`, type, duration);
        } else {
            this.log(`Notification: ${message} (${type})`);
        }
    }

    /**
     * Destroy component and cleanup all resources
     */
    destroy() {
        this.log(`🧹 Destroying ${this.componentName} component...`);

        try {
            // Call subclass cleanup if it exists
            if (typeof this.onDestroy === 'function') {
                this.onDestroy();
            }

            // Cleanup all managed resources
            this.abortController.abort(); // Removes all event listeners with signal
            
            // Clear all timers and intervals
            this.timers.forEach(timeoutId => clearTimeout(timeoutId));
            this.intervals.forEach(intervalId => clearInterval(intervalId));
            
            // Clear collections
            this.eventHandlers.clear();
            this.timers.clear();
            this.intervals.clear();

            // Reset state
            this.isActive = false;
            this.isInitialized = false;

            // Emit destroy event
            this.emit('destroy');

            this.log(`✅ ${this.componentName} component destroyed successfully`);

        } catch (error) {
            this.logError(`Error during ${this.componentName} component destruction`, error);
        }
    }
}

// Export the base class
export default BaseComponent;

/**
 * Factory function to create components extending BaseComponent
 */
export function createBaseComponent(app, componentName) {
    return new BaseComponent(app, componentName);
}