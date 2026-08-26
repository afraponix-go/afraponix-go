// Loading Manager Utility
// Standardized loading states, spinners, and progress indicators

/**
 * Loading Manager Class
 * Handles loading states, spinners, and progress indicators consistently
 */
export class LoadingManager {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: 30000,
            showProgress: true,
            enableDebugLogging: false,
            ...options
        };
        
        this.activeLoadings = new Map();
        this.loadingStats = {
            totalOperations: 0,
            completedOperations: 0,
            failedOperations: 0,
            averageLoadTime: 0,
            totalLoadTime: 0
        };
        
        console.log('⏳ Loading Manager initialized');
    }

    /**
     * Start loading state for an element or operation
     */
    startLoading(identifier, options = {}) {
        const loadingConfig = {
            id: identifier,
            startTime: performance.now(),
            element: options.element || null,
            message: options.message || 'Loading...',
            showSpinner: options.showSpinner !== false,
            disableElement: options.disableElement !== false,
            timeout: options.timeout || this.options.defaultTimeout,
            onTimeout: options.onTimeout || null,
            ...options
        };
        
        // Store original state if element provided
        if (loadingConfig.element) {
            loadingConfig.originalState = this.captureElementState(loadingConfig.element);
            this.applyLoadingState(loadingConfig.element, loadingConfig);
        }
        
        // Set timeout if specified
        if (loadingConfig.timeout > 0) {
            loadingConfig.timeoutId = setTimeout(() => {
                this.handleTimeout(identifier, loadingConfig);
            }, loadingConfig.timeout);
        }
        
        this.activeLoadings.set(identifier, loadingConfig);
        this.loadingStats.totalOperations++;
        
        if (this.options.enableDebugLogging) {
            console.log(`⏳ Started loading: ${identifier}`, loadingConfig);
        }
        
        return loadingConfig;
    }

    /**
     * Stop loading state
     */
    stopLoading(identifier, result = 'success') {
        const loadingConfig = this.activeLoadings.get(identifier);
        if (!loadingConfig) {
            console.warn(`⚠️ Attempted to stop non-existent loading: ${identifier}`);
            return;
        }
        
        // Clear timeout
        if (loadingConfig.timeoutId) {
            clearTimeout(loadingConfig.timeoutId);
        }
        
        // Calculate load time
        const loadTime = performance.now() - loadingConfig.startTime;
        
        // Update stats
        if (result === 'success') {
            this.loadingStats.completedOperations++;
        } else {
            this.loadingStats.failedOperations++;
        }
        
        this.loadingStats.totalLoadTime += loadTime;
        this.loadingStats.averageLoadTime = 
            this.loadingStats.totalLoadTime / this.loadingStats.totalOperations;
        
        // Restore element state
        if (loadingConfig.element && loadingConfig.originalState) {
            this.restoreElementState(loadingConfig.element, loadingConfig.originalState);
        }
        
        this.activeLoadings.delete(identifier);
        
        if (this.options.enableDebugLogging) {
            console.log(`✅ Stopped loading: ${identifier} (${loadTime.toFixed(2)}ms, ${result})`);
        }
        
        return { loadTime, result };
    }

    /**
     * Create loading wrapper for async operations
     */
    withLoading(identifier, asyncOperation, options = {}) {
        return async (...args) => {
            this.startLoading(identifier, options);
            
            try {
                const result = await asyncOperation(...args);
                this.stopLoading(identifier, 'success');
                return result;
            } catch (error) {
                this.stopLoading(identifier, 'error');
                throw error;
            }
        };
    }

    /**
     * Create button loading wrapper
     */
    withButtonLoading(button, asyncOperation, options = {}) {
        return async (...args) => {
            const identifier = `button_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.startLoading(identifier, {
                element: button,
                message: options.loadingText || 'Processing...',
                disableElement: true,
                showSpinner: options.showSpinner !== false,
                ...options
            });
            
            try {
                const result = await asyncOperation(...args);
                this.stopLoading(identifier, 'success');
                return result;
            } catch (error) {
                this.stopLoading(identifier, 'error');
                throw error;
            }
        };
    }

    /**
     * Create form loading wrapper
     */
    withFormLoading(form, asyncOperation, options = {}) {
        return async (...args) => {
            const identifier = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Disable all form inputs
            const inputs = form.querySelectorAll('input, select, textarea, button');
            const originalStates = Array.from(inputs).map(input => ({
                element: input,
                disabled: input.disabled
            }));
            
            this.startLoading(identifier, {
                element: form,
                message: options.loadingText || 'Submitting...',
                customState: { inputs, originalStates },
                ...options
            });
            
            // Disable all inputs
            inputs.forEach(input => { input.disabled = true; });
            
            try {
                const result = await asyncOperation(...args);
                this.stopLoading(identifier, 'success');
                
                // Restore input states
                originalStates.forEach(({ element, disabled }) => {
                    element.disabled = disabled;
                });
                
                return result;
            } catch (error) {
                this.stopLoading(identifier, 'error');
                
                // Restore input states
                originalStates.forEach(({ element, disabled }) => {
                    element.disabled = disabled;
                });
                
                throw error;
            }
        };
    }

    /**
     * Capture original element state
     */
    captureElementState(element) {
        return {
            textContent: element.textContent,
            innerHTML: element.innerHTML,
            disabled: element.disabled,
            className: element.className,
            style: element.style.cssText
        };
    }

    /**
     * Apply loading state to element
     */
    applyLoadingState(element, config) {
        if (config.disableElement && 'disabled' in element) {
            element.disabled = true;
        }
        
        // Handle buttons
        if (element.tagName === 'BUTTON') {
            const spinner = config.showSpinner ? this.createSpinner() : '';
            element.innerHTML = `${spinner}${config.message}`;
        }
        
        // Handle general elements with loading class
        if (config.loadingClass) {
            element.classList.add(config.loadingClass);
        } else {
            element.classList.add('loading');
        }
        
        // Handle specific loading text elements
        if (element.classList.contains('stat-value') || element.id.includes('loading')) {
            element.textContent = config.message;
        }
    }

    /**
     * Restore element to original state
     */
    restoreElementState(element, originalState) {
        if (originalState.textContent !== undefined) {
            element.textContent = originalState.textContent;
        }
        
        if (originalState.innerHTML !== undefined && element.tagName === 'BUTTON') {
            element.innerHTML = originalState.innerHTML;
        }
        
        if ('disabled' in element) {
            element.disabled = originalState.disabled;
        }
        
        element.className = originalState.className;
        element.style.cssText = originalState.style;
    }

    /**
     * Create spinner HTML
     */
    createSpinner(size = 'small') {
        const sizes = {
            small: '14',
            medium: '20',
            large: '32'
        };
        
        const spinnerSize = sizes[size] || sizes.small;
        
        return `
            <svg class="loading-spinner" width="${spinnerSize}" height="${spinnerSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <style>
                    .loading-spinner {
                        animation: spin 1s linear infinite;
                        margin-right: 8px;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            </svg>
        `;
    }

    /**
     * Create loading overlay for containers
     */
    createLoadingOverlay(container, options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                ${this.createSpinner('large')}
                <div class="loading-message">${options.message || 'Loading...'}</div>
            </div>
            <style>
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                }
                .loading-content {
                    text-align: center;
                    color: #666;
                }
                .loading-message {
                    margin-top: 1rem;
                    font-size: 0.9rem;
                }
            </style>
        `;
        
        // Ensure container is positioned relatively
        const originalPosition = container.style.position;
        if (!originalPosition || originalPosition === 'static') {
            container.style.position = 'relative';
        }
        
        container.appendChild(overlay);
        
        return {
            remove: () => {
                overlay.remove();
                if (!originalPosition || originalPosition === 'static') {
                    container.style.position = originalPosition || '';
                }
            }
        };
    }

    /**
     * Handle loading timeout
     */
    handleTimeout(identifier, config) {
        console.warn(`⏰ Loading timeout for: ${identifier}`);
        
        if (config.onTimeout) {
            config.onTimeout(identifier);
        } else {
            // Default timeout handling
            if (window.app?.showNotification) {
                window.app.showNotification('Operation is taking longer than expected...', 'warning', 5000);
            }
        }
        
        this.stopLoading(identifier, 'timeout');
    }

    /**
     * Get loading statistics
     */
    getLoadingStats() {
        return {
            ...this.loadingStats,
            activeOperations: this.activeLoadings.size,
            successRate: this.loadingStats.totalOperations > 0 ?
                (this.loadingStats.completedOperations / this.loadingStats.totalOperations * 100).toFixed(1) + '%' :
                '0%'
        };
    }

    /**
     * Get active loading operations
     */
    getActiveLoadings() {
        return Array.from(this.activeLoadings.entries()).map(([id, config]) => ({
            id,
            message: config.message,
            duration: performance.now() - config.startTime,
            hasTimeout: !!config.timeoutId
        }));
    }

    /**
     * Stop all active loadings
     */
    stopAllLoadings(result = 'cancelled') {
        const activeIds = Array.from(this.activeLoadings.keys());
        activeIds.forEach(id => this.stopLoading(id, result));
        
        console.log(`🛑 Stopped ${activeIds.length} active loading operations`);
        return activeIds;
    }

    /**
     * Check if operation is loading
     */
    isLoading(identifier) {
        return this.activeLoadings.has(identifier);
    }

    /**
     * Wait for operation to complete
     */
    async waitForLoading(identifier, timeout = 30000) {
        if (!this.isLoading(identifier)) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (!this.isLoading(identifier)) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 100);
            
            const timeoutId = setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error(`Timeout waiting for loading to complete: ${identifier}`));
            }, timeout);
        });
    }

    /**
     * Clear statistics
     */
    clearStats() {
        this.loadingStats = {
            totalOperations: 0,
            completedOperations: 0,
            failedOperations: 0,
            averageLoadTime: 0,
            totalLoadTime: 0
        };
    }
}

// Create global loading manager instance
const loadingManager = new LoadingManager();

// Utility functions for common loading patterns
export const startLoading = (id, options) => loadingManager.startLoading(id, options);
export const stopLoading = (id, result) => loadingManager.stopLoading(id, result);
export const withLoading = (id, operation, options) => loadingManager.withLoading(id, operation, options);
export const withButtonLoading = (button, operation, options) => loadingManager.withButtonLoading(button, operation, options);
export const withFormLoading = (form, operation, options) => loadingManager.withFormLoading(form, operation, options);
export const createLoadingOverlay = (container, options) => loadingManager.createLoadingOverlay(container, options);
export const isLoading = (id) => loadingManager.isLoading(id);

// Export the instance as default
export default loadingManager;