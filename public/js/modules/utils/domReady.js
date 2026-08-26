// DOM Ready Utilities
// Provides utilities for waiting for DOM elements and ensuring proper initialization timing

/**
 * DOM Ready Utilities Class
 * Helps manage timing issues between module loading and DOM element availability
 */
export class DOMReadyUtils {
    constructor() {
        this.waitingElements = new Map();
        this.elementObserver = null;
        this.readyPromise = null;
        
        this.initializeMutationObserver();
    }

    /**
     * Wait for DOM to be ready
     */
    domReady() {
        if (this.readyPromise) {
            return this.readyPromise;
        }

        this.readyPromise = new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        return this.readyPromise;
    }

    /**
     * Wait for a specific element to exist in the DOM
     * @param {string} selector - CSS selector for the element
     * @param {number} timeout - Maximum time to wait in milliseconds (default: 10000)
     * @returns {Promise<Element>} - Promise that resolves with the element
     */
    waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const timeoutId = setTimeout(() => {
                this.waitingElements.delete(selector);
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);

            this.waitingElements.set(selector, {
                resolve: (element) => {
                    clearTimeout(timeoutId);
                    this.waitingElements.delete(selector);
                    resolve(element);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    this.waitingElements.delete(selector);
                    reject(error);
                }
            });
        });
    }

    /**
     * Wait for multiple elements to exist
     * @param {string[]} selectors - Array of CSS selectors
     * @param {number} timeout - Maximum time to wait
     * @returns {Promise<Element[]>} - Promise that resolves with array of elements
     */
    waitForElements(selectors, timeout = 10000) {
        const promises = selectors.map(selector => this.waitForElement(selector, timeout));
        return Promise.all(promises);
    }

    /**
     * Check if element exists without waiting
     * @param {string} selector - CSS selector
     * @returns {boolean} - True if element exists
     */
    elementExists(selector) {
        return document.querySelector(selector) !== null;
    }

    /**
     * Get element safely with optional waiting
     * @param {string} selector - CSS selector
     * @param {boolean} wait - Whether to wait for element if not found
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<Element|null>} - Element or null
     */
    async getElement(selector, wait = false, timeout = 5000) {
        const element = document.querySelector(selector);
        if (element || !wait) {
            return element;
        }

        try {
            return await this.waitForElement(selector, timeout);
        } catch (error) {
            console.warn(`Element ${selector} not found:`, error.message);
            return null;
        }
    }

    /**
     * Initialize mutation observer to watch for new elements
     */
    initializeMutationObserver() {
        if (typeof window === 'undefined' || !window.MutationObserver) {
            return;
        }

        this.elementObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkWaitingElements(node);
                    }
                });
            });
        });

        // Start observing when DOM is ready
        this.domReady().then(() => {
            this.elementObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * Check if any waiting elements are now available
     * @param {Element} node - Newly added DOM node
     */
    checkWaitingElements(node) {
        this.waitingElements.forEach((callbacks, selector) => {
            const element = node.matches && node.matches(selector) ? 
                          node : 
                          node.querySelector && node.querySelector(selector);
            
            if (element) {
                callbacks.resolve(element);
            }
        });
    }

    /**
     * Wait for Chart.js to be available
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<boolean>} - True if Chart.js is available
     */
    waitForChartJS(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (typeof window.Chart !== 'undefined') {
                resolve(true);
                return;
            }

            const checkInterval = 100;
            const maxAttempts = timeout / checkInterval;
            let attempts = 0;

            const intervalId = setInterval(() => {
                attempts++;
                if (typeof window.Chart !== 'undefined') {
                    clearInterval(intervalId);
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    reject(new Error('Chart.js not available within timeout'));
                }
            }, checkInterval);
        });
    }

    /**
     * Wait for app instance to be available
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<object>} - App instance
     */
    waitForApp(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.app && window.app.init) {
                resolve(window.app);
                return;
            }

            const checkInterval = 100;
            const maxAttempts = timeout / checkInterval;
            let attempts = 0;

            const intervalId = setInterval(() => {
                attempts++;
                if (window.app && window.app.init) {
                    clearInterval(intervalId);
                    resolve(window.app);
                } else if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    reject(new Error('App instance not available within timeout'));
                }
            }, checkInterval);
        });
    }

    /**
     * Create a safe initialization wrapper
     * @param {Function} initFunction - Function to run after DOM and dependencies ready
     * @param {Object} options - Configuration options
     * @returns {Promise} - Promise that resolves when initialization completes
     */
    async safeInit(initFunction, options = {}) {
        const {
            waitForApp = true,
            waitForChartJS = false,
            requiredElements = [],
            timeout = 10000
        } = options;

        try {
            // Wait for DOM to be ready
            await this.domReady();

            // Wait for app if required
            if (waitForApp) {
                await this.waitForApp(timeout);
            }

            // Wait for Chart.js if required
            if (waitForChartJS) {
                await this.waitForChartJS(timeout);
            }

            // Wait for required elements
            if (requiredElements.length > 0) {
                await this.waitForElements(requiredElements, timeout);
            }

            // Run the initialization function
            return await initFunction();

        } catch (error) {
            console.error('Safe initialization failed:', error);
            throw error;
        }
    }

    /**
     * Cleanup observer and pending promises
     */
    cleanup() {
        if (this.elementObserver) {
            this.elementObserver.disconnect();
        }
        
        this.waitingElements.forEach((callbacks, selector) => {
            callbacks.reject(new Error('DOMReadyUtils cleanup called'));
        });
        
        this.waitingElements.clear();
    }
}

// Create singleton instance
export const domUtils = new DOMReadyUtils();

// Export helper functions for convenience
export const {
    domReady,
    waitForElement,
    waitForElements,
    elementExists,
    getElement,
    waitForChartJS,
    waitForApp,
    safeInit
} = domUtils;