// Base UI Component Class
// Specialized base class for UI components that handle DOM interactions and user interface

import BaseComponent from './baseComponent.js';

/**
 * Base UI Component Class
 * Extends BaseComponent with UI-specific functionality for DOM manipulation and user interactions
 */
export class BaseUIComponent extends BaseComponent {
    constructor(app, componentName = 'UIComponent', containerSelector = null) {
        super(app, componentName);
        
        // UI-specific properties
        this.containerSelector = containerSelector;
        this.container = null;
        this.elements = new Map();
        this.formElements = new Map();
        this.isVisible = false;
        this.boundMethods = new Map();
        
        // UI state management
        this.uiState = {
            activeTab: null,
            openModals: new Set(),
            focusedElement: null
        };
        
        this.log(`🎨 ${this.componentName} UI Component initialized with DOM management capabilities`);
    }

    /**
     * Initialize UI component with container setup
     */
    async onInitialize() {
        if (this.containerSelector) {
            this.findContainer();
        }
        
        // Setup UI-specific initialization
        this.setupUIElements();
        this.bindMethods();
        
        // Call subclass UI initialization if it exists
        if (typeof this.setupUI === 'function') {
            await this.setupUI();
        }
    }

    /**
     * Find and set the container element
     */
    findContainer() {
        if (!this.containerSelector) return;
        
        this.container = document.querySelector(this.containerSelector);
        if (!this.container) {
            this.logWarning(`Container not found: ${this.containerSelector}`);
        } else {
            this.log(`📦 Container found: ${this.containerSelector}`);
        }
    }

    /**
     * Find and cache UI elements
     */
    setupUIElements() {
        // Override in subclasses to define specific elements
        // Example: this.cacheElement('submitButton', '#submit-btn');
    }

    /**
     * Cache a DOM element for easy access
     */
    cacheElement(key, selector, container = document) {
        const element = container.querySelector(selector);
        if (element) {
            this.elements.set(key, element);
            this.log(`🎯 Cached element: ${key} (${selector})`);
        } else {
            this.logWarning(`Element not found: ${key} (${selector})`);
        }
        return element;
    }

    /**
     * Get a cached element
     */
    getElement(key) {
        return this.elements.get(key);
    }

    /**
     * Cache multiple elements at once
     */
    cacheElements(elementMap, container = document) {
        Object.entries(elementMap).forEach(([key, selector]) => {
            this.cacheElement(key, selector, container);
        });
    }

    /**
     * Bind methods to preserve 'this' context
     */
    bindMethods() {
        // Auto-bind methods that start with 'handle' or 'on'
        const proto = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(proto)
            .filter(name => 
                typeof proto[name] === 'function' && 
                (name.startsWith('handle') || name.startsWith('on')) &&
                name !== 'onInitialize' && name !== 'onShow' && name !== 'onHide' && name !== 'onDestroy'
            );

        methodNames.forEach(methodName => {
            const boundMethod = this[methodName].bind(this);
            this.boundMethods.set(methodName, boundMethod);
            this[`bound${methodName.charAt(0).toUpperCase()}${methodName.slice(1)}`] = boundMethod;
        });

        if (methodNames.length > 0) {
            this.log(`🔗 Bound ${methodNames.length} methods: ${methodNames.join(', ')}`);
        }
    }

    /**
     * Get a bound method
     */
    getBoundMethod(methodName) {
        return this.boundMethods.get(methodName) || this[methodName]?.bind(this);
    }

    /**
     * Setup event listeners on UI elements
     */
    setupEventListeners(eventMap) {
        Object.entries(eventMap).forEach(([elementKey, events]) => {
            const element = this.getElement(elementKey);
            if (!element) {
                this.logWarning(`Cannot setup events for missing element: ${elementKey}`);
                return;
            }

            Object.entries(events).forEach(([eventType, handlerName]) => {
                const handler = this.getBoundMethod(handlerName);
                if (handler) {
                    this.addEventListener(element, eventType, handler);
                } else {
                    this.logWarning(`Handler method not found: ${handlerName}`);
                }
            });
        });
    }

    /**
     * Show the UI component
     */
    async onShow() {
        this.isVisible = true;
        
        if (this.container) {
            this.container.style.display = '';
            this.container.classList.add('active');
        }
        
        // Focus first focusable element if appropriate
        this.focusFirstElement();
        
        // Call subclass show logic
        if (typeof this.showUI === 'function') {
            await this.showUI();
        }
    }

    /**
     * Hide the UI component
     */
    onHide() {
        this.isVisible = false;
        
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('active');
        }
        
        // Call subclass hide logic
        if (typeof this.hideUI === 'function') {
            this.hideUI();
        }
    }

    /**
     * Toggle UI component visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Focus the first focusable element in the container
     */
    focusFirstElement() {
        if (!this.container) return;
        
        const focusableElements = this.container.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
            this.uiState.focusedElement = focusableElements[0];
        }
    }

    /**
     * Create and manage modal dialogs
     */
    createModal(modalId, content, options = {}) {
        const defaults = {
            title: '',
            closeable: true,
            size: 'medium',
            backdrop: true
        };
        
        const config = { ...defaults, ...options };
        
        // Remove existing modal with same ID
        this.removeModal(modalId);
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `modal modal-${config.size}`;
        
        modal.innerHTML = `
            <div class="modal-backdrop ${config.backdrop ? 'modal-backdrop-visible' : ''}"></div>
            <div class="modal-dialog">
                <div class="modal-content">
                    ${config.title ? `<div class="modal-header">
                        <h3>${config.title}</h3>
                        ${config.closeable ? '<button class="modal-close">&times;</button>' : ''}
                    </div>` : ''}
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.uiState.openModals.add(modalId);
        
        // Setup close handlers
        if (config.closeable) {
            const closeBtn = modal.querySelector('.modal-close');
            const backdrop = modal.querySelector('.modal-backdrop');
            
            if (closeBtn) {
                this.addEventListener(closeBtn, 'click', () => this.removeModal(modalId));
            }
            
            if (backdrop && config.backdrop) {
                this.addEventListener(backdrop, 'click', () => this.removeModal(modalId));
            }
        }
        
        this.log(`🪟 Modal created: ${modalId}`);
        return modal;
    }

    /**
     * Remove a modal dialog
     */
    removeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
            this.uiState.openModals.delete(modalId);
            this.log(`🗑️ Modal removed: ${modalId}`);
        }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        this.uiState.openModals.forEach(modalId => {
            this.removeModal(modalId);
        });
    }

    /**
     * Setup tab navigation
     */
    setupTabs(tabsSelector, contentsSelector, activeClass = 'active') {
        const tabs = document.querySelectorAll(tabsSelector);
        const contents = document.querySelectorAll(contentsSelector);
        
        tabs.forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                e.preventDefault();
                
                const targetId = tab.dataset.target || tab.getAttribute('href')?.substring(1);
                
                // Remove active from all tabs and contents
                tabs.forEach(t => t.classList.remove(activeClass));
                contents.forEach(c => c.classList.remove(activeClass));
                
                // Add active to clicked tab and its content
                tab.classList.add(activeClass);
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    targetContent.classList.add(activeClass);
                    this.uiState.activeTab = targetId;
                }
                
                // Call tab change handler if it exists
                if (typeof this.onTabChange === 'function') {
                    this.onTabChange(targetId, tab);
                }
            });
        });
        
        this.log(`🏷️ Tabs setup: ${tabs.length} tabs, ${contents.length} contents`);
    }

    /**
     * Validate forms within the component
     */
    validateForm(formSelector) {
        const form = this.container ? 
            this.container.querySelector(formSelector) : 
            document.querySelector(formSelector);
            
        if (!form) {
            this.logWarning(`Form not found: ${formSelector}`);
            return false;
        }
        
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('invalid');
                isValid = false;
            } else {
                field.classList.remove('invalid');
            }
        });
        
        return isValid;
    }

    /**
     * Get form data as object
     */
    getFormData(formSelector) {
        const form = this.container ? 
            this.container.querySelector(formSelector) : 
            document.querySelector(formSelector);
            
        if (!form) {
            this.logWarning(`Form not found: ${formSelector}`);
            return {};
        }
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    /**
     * Get UI component statistics
     */
    getComponentStats() {
        return {
            isVisible: this.isVisible,
            hasContainer: !!this.container,
            cachedElements: this.elements.size,
            boundMethods: this.boundMethods.size,
            openModals: this.uiState.openModals.size,
            activeTab: this.uiState.activeTab,
            containerSelector: this.containerSelector
        };
    }

    /**
     * UI-specific health checks
     */
    getHealthIssues() {
        const issues = [];
        
        // Check container availability
        if (this.containerSelector && !this.container) {
            issues.push(`Container element not found: ${this.containerSelector}`);
        }
        
        // Check for too many open modals
        if (this.uiState.openModals.size > 5) {
            issues.push(`Too many open modals: ${this.uiState.openModals.size}`);
        }
        
        return issues;
    }

    /**
     * UI component cleanup
     */
    onDestroy() {
        // Close all modals
        this.closeAllModals();
        
        // Clear UI state
        this.uiState = {
            activeTab: null,
            openModals: new Set(),
            focusedElement: null
        };
        
        // Clear cached elements and bound methods
        this.elements.clear();
        this.formElements.clear();
        this.boundMethods.clear();
        
        // Hide container
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('active');
        }
        
        this.log('🎨 UI component cleaned up');
    }
}

// Export the base UI component class
export default BaseUIComponent;

/**
 * Factory function to create UI components
 */
export function createBaseUIComponent(app, componentName, containerSelector) {
    return new BaseUIComponent(app, componentName, containerSelector);
}