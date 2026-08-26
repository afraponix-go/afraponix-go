// DOM Utils
// Common DOM manipulation patterns and utilities

/**
 * DOM Utils Class
 * Provides consistent DOM manipulation and element creation patterns
 */
export class DOMUtils {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        
        console.log('🎯 DOM Utils initialized');
    }

    /**
     * Create element with attributes and children
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className' || key === 'class') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'data' && typeof value === 'object') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            } else if (child && typeof child === 'object') {
                element.appendChild(this.createElement(child.tag, child.attributes, child.children));
            }
        });
        
        return element;
    }

    /**
     * Enhanced query selector with caching
     */
    $(selector, context = document, useCache = true) {
        const cacheKey = `${selector}:${context === document ? 'document' : context.id || 'context'}`;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            // Verify element is still in DOM
            if (cached && cached.parentNode) {
                return cached;
            } else {
                this.cache.delete(cacheKey);
            }
        }
        
        const element = context.querySelector(selector);
        
        if (useCache && element) {
            this.cache.set(cacheKey, element);
        }
        
        return element;
    }

    /**
     * Enhanced query selector all
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Wait for element to exist in DOM
     */
    waitForElement(selector, timeout = 10000, context = document) {
        return new Promise((resolve, reject) => {
            const existing = context.querySelector(selector);
            if (existing) {
                resolve(existing);
                return;
            }
            
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const found = node.matches && node.matches(selector) ? 
                                node : node.querySelector && node.querySelector(selector);
                            
                            if (found) {
                                observer.disconnect();
                                clearTimeout(timeoutId);
                                resolve(found);
                                return;
                            }
                        }
                    }
                }
            });
            
            observer.observe(context, {
                childList: true,
                subtree: true
            });
            
            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element not found: ${selector}`));
            }, timeout);
        });
    }

    /**
     * Show/hide element with animation
     */
    toggleElement(element, show = null, animation = 'fade') {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        const isVisible = element.style.display !== 'none' && element.offsetParent !== null;
        const shouldShow = show !== null ? show : !isVisible;
        
        if (animation === 'fade') {
            this.fadeToggle(element, shouldShow);
        } else if (animation === 'slide') {
            this.slideToggle(element, shouldShow);
        } else {
            element.style.display = shouldShow ? '' : 'none';
        }
        
        return shouldShow;
    }

    /**
     * Fade toggle animation
     */
    fadeToggle(element, show) {
        if (show) {
            element.style.display = '';
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
        } else {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.opacity = '';
                element.style.transition = '';
            }, 300);
        }
    }

    /**
     * Slide toggle animation
     */
    slideToggle(element, show) {
        if (show) {
            element.style.display = '';
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.transition = 'height 0.3s ease';
            
            const fullHeight = element.scrollHeight;
            
            setTimeout(() => {
                element.style.height = fullHeight + 'px';
            }, 10);
            
            setTimeout(() => {
                element.style.height = '';
                element.style.overflow = '';
                element.style.transition = '';
            }, 300);
        } else {
            element.style.height = element.scrollHeight + 'px';
            element.style.overflow = 'hidden';
            element.style.transition = 'height 0.3s ease';
            
            setTimeout(() => {
                element.style.height = '0';
            }, 10);
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
                element.style.transition = '';
            }, 300);
        }
    }

    /**
     * Add class with animation
     */
    addClass(element, className, animation = null) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        if (animation) {
            element.style.transition = `all 0.3s ease`;
            setTimeout(() => {
                element.classList.add(className);
            }, 10);
        } else {
            element.classList.add(className);
        }
    }

    /**
     * Remove class with animation
     */
    removeClass(element, className, animation = null) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        if (animation) {
            element.style.transition = `all 0.3s ease`;
            element.classList.remove(className);
            
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * Empty element safely
     */
    empty(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        // Remove event listeners on child elements to prevent memory leaks
        const elementsWithListeners = element.querySelectorAll('*');
        elementsWithListeners.forEach(el => {
            const clone = el.cloneNode(false);
            el.parentNode?.replaceChild(clone, el);
        });
        
        // Clear content
        element.innerHTML = '';
    }

    /**
     * Set loading state for element
     */
    setLoadingState(element, loading = true, message = 'Loading...') {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        if (loading) {
            const originalContent = element.innerHTML;
            element.dataset.originalContent = originalContent;
            
            element.innerHTML = `
                <div class="loading-state" style="display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.7;">
                    <div class="spinner" style="
                        width: 16px;
                        height: 16px;
                        border: 2px solid #ddd;
                        border-top: 2px solid #007bff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <span>${message}</span>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            element.classList.add('loading');
        } else {
            const originalContent = element.dataset.originalContent;
            if (originalContent) {
                element.innerHTML = originalContent;
                delete element.dataset.originalContent;
            }
            element.classList.remove('loading');
        }
    }

    /**
     * Create modal dialog
     */
    createModal(title, content, options = {}) {
        const modal = this.createElement('div', {
            className: 'modal-overlay',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '10000'
            }
        });
        
        const modalContent = this.createElement('div', {
            className: 'modal-content',
            style: {
                backgroundColor: 'white',
                borderRadius: '8px',
                maxWidth: options.maxWidth || '600px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }
        });
        
        const modalHeader = this.createElement('div', {
            className: 'modal-header',
            style: {
                padding: '1rem',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }
        });
        
        const modalTitle = this.createElement('h3', {
            textContent: title,
            style: { margin: '0' }
        });
        
        const closeButton = this.createElement('button', {
            textContent: '×',
            style: {
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer'
            },
            onclick: () => this.closeModal(modal)
        });
        
        const modalBody = this.createElement('div', {
            className: 'modal-body',
            style: { padding: '1rem' }
        });
        
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else if (content instanceof Node) {
            modalBody.appendChild(content);
        }
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
            }
        };
        
        document.addEventListener('keydown', escapeHandler);
        modal._escapeHandler = escapeHandler;
        
        document.body.appendChild(modal);
        
        // Add show animation
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transition = 'opacity 0.3s ease';
        }, 10);
        
        return modal;
    }

    /**
     * Close modal dialog
     */
    closeModal(modal) {
        if (modal._escapeHandler) {
            document.removeEventListener('keydown', modal._escapeHandler);
        }
        
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    /**
     * Observe element visibility changes
     */
    observeVisibility(element, callback, options = {}) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return null;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                callback(entry.isIntersecting, entry);
            });
        }, {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || '0px',
            ...options
        });
        
        observer.observe(element);
        
        const observerId = `${element.id || 'element'}_${Date.now()}`;
        this.observers.set(observerId, observer);
        
        return {
            disconnect: () => {
                observer.disconnect();
                this.observers.delete(observerId);
            }
        };
    }

    /**
     * Debounce function calls
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function calls
     */
    throttle(func, delay) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, delay);
            }
        };
    }

    /**
     * Get element position relative to viewport
     */
    getElementPosition(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    }

    /**
     * Smooth scroll to element
     */
    scrollToElement(element, options = {}) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
            ...options
        };
        
        element.scrollIntoView(defaultOptions);
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Clear all cached elements
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Disconnect all observers
     */
    disconnectAllObservers() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }

    /**
     * Clean up utility
     */
    destroy() {
        this.clearCache();
        this.disconnectAllObservers();
        console.log('✅ DOM Utils destroyed');
    }
}

// Create global DOM utils instance
const domUtils = new DOMUtils();

// Utility functions
export const $ = (selector, context, useCache) => domUtils.$(selector, context, useCache);
export const $$ = (selector, context) => domUtils.$$(selector, context);
export const createElement = (tag, attrs, children) => domUtils.createElement(tag, attrs, children);
export const waitForElement = (selector, timeout, context) => domUtils.waitForElement(selector, timeout, context);
export const toggleElement = (element, show, animation) => domUtils.toggleElement(element, show, animation);
export const addClass = (element, className, animation) => domUtils.addClass(element, className, animation);
export const removeClass = (element, className, animation) => domUtils.removeClass(element, className, animation);
export const empty = (element) => domUtils.empty(element);
export const setLoadingState = (element, loading, message) => domUtils.setLoadingState(element, loading, message);
export const createModal = (title, content, options) => domUtils.createModal(title, content, options);
export const closeModal = (modal) => domUtils.closeModal(modal);
export const observeVisibility = (element, callback, options) => domUtils.observeVisibility(element, callback, options);
export const debounce = (func, delay) => domUtils.debounce(func, delay);
export const throttle = (func, delay) => domUtils.throttle(func, delay);
export const scrollToElement = (element, options) => domUtils.scrollToElement(element, options);
export const copyToClipboard = (text) => domUtils.copyToClipboard(text);

// Export the instance as default
export default domUtils;