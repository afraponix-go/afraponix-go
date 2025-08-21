// Event Manager Service
// Handles all application event listeners and event coordination

/**
 * Event Manager Service
 * Centralizes event handling and provides event coordination across components
 */
export default class EventManager {
    constructor(app) {
        this.app = app;
        this.listeners = new Map();
        this.boundHandlers = new Map();
    }

    /**
     * Initialize all global event listeners
     */
    initialize() {
        console.log('🎯 Initializing event management system');
        
        this.setupGlobalEvents();
        this.setupKeyboardEvents();
        this.setupWindowEvents();
        this.setupFormEvents();
        
        console.log('✅ Event management system initialized');
    }

    /**
     * Setup global application events
     */
    setupGlobalEvents() {
        // Global error handler
        const errorHandler = this.handleGlobalError.bind(this);
        window.addEventListener('error', errorHandler);
        this.trackListener('window', 'error', errorHandler);

        // Unhandled promise rejection handler
        const rejectionHandler = this.handleUnhandledRejection.bind(this);
        window.addEventListener('unhandledrejection', rejectionHandler);
        this.trackListener('window', 'unhandledrejection', rejectionHandler);

        // Page visibility changes
        const visibilityHandler = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', visibilityHandler);
        this.trackListener('document', 'visibilitychange', visibilityHandler);
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyboardEvents() {
        const keydownHandler = this.handleGlobalKeydown.bind(this);
        document.addEventListener('keydown', keydownHandler);
        this.trackListener('document', 'keydown', keydownHandler);
    }

    /**
     * Setup window-level events
     */
    setupWindowEvents() {
        // Window resize handler
        const resizeHandler = this.debounce(this.handleWindowResize.bind(this), 250);
        window.addEventListener('resize', resizeHandler);
        this.trackListener('window', 'resize', resizeHandler);

        // Before unload handler for cleanup
        const beforeUnloadHandler = this.handleBeforeUnload.bind(this);
        window.addEventListener('beforeunload', beforeUnloadHandler);
        this.trackListener('window', 'beforeunload', beforeUnloadHandler);

        // Online/offline status
        const onlineHandler = () => this.app.showNotification('🌐 Connection restored', 'success');
        const offlineHandler = () => this.app.showNotification('⚠️ Connection lost', 'warning');
        
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);
        this.trackListener('window', 'online', onlineHandler);
        this.trackListener('window', 'offline', offlineHandler);
    }

    /**
     * Setup form-related events
     */
    setupFormEvents() {
        // Prevent accidental form submissions
        const formSubmitHandler = this.handleFormSubmit.bind(this);
        document.addEventListener('submit', formSubmitHandler);
        this.trackListener('document', 'submit', formSubmitHandler);

        // Handle input changes for form validation
        const inputHandler = this.handleInputChange.bind(this);
        document.addEventListener('input', inputHandler);
        this.trackListener('document', 'input', inputHandler);
    }

    /**
     * Handle global errors
     */
    handleGlobalError(event) {
        console.error('🚨 Global error:', event.error);
        
        // Don't show error notifications for certain types of errors
        const ignoredErrors = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Script error'
        ];
        
        const errorMessage = event.error?.message || event.message || 'Unknown error';
        const shouldIgnore = ignoredErrors.some(ignored => 
            errorMessage.includes(ignored)
        );
        
        if (!shouldIgnore) {
            this.app.showNotification('⚠️ An unexpected error occurred', 'error');
        }

        // Log detailed error information for debugging
        console.error('Error details:', {
            message: errorMessage,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
        });
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(event) {
        console.error('🚨 Unhandled promise rejection:', event.reason);
        
        // Prevent default browser behavior
        event.preventDefault();
        
        // Show user-friendly error message
        this.app.showNotification('⚠️ Operation failed unexpectedly', 'error');
    }

    /**
     * Handle visibility changes (tab switching, etc.)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('👁️ Page hidden - pausing updates');
            // Could pause automatic data updates here
        } else {
            console.log('👁️ Page visible - resuming updates');
            // Could resume automatic data updates here
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeydown(event) {
        // Handle Escape key for closing modals
        if (event.key === 'Escape') {
            this.handleEscapeKey(event);
        }
        
        // Handle Ctrl+S for quick save (prevent default browser save)
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.handleQuickSave(event);
        }
        
        // Handle Ctrl+/ for help
        if (event.ctrlKey && event.key === '/') {
            event.preventDefault();
            this.showKeyboardShortcuts();
        }
    }

    /**
     * Handle Escape key press
     */
    handleEscapeKey(event) {
        // Close any open modals
        const openModals = document.querySelectorAll('.modal[style*="display: block"], .modal.show');
        if (openModals.length > 0) {
            const topModal = openModals[openModals.length - 1];
            const closeBtn = topModal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
            if (closeBtn) {
                closeBtn.click();
            }
            return;
        }

        // Close lightbox if open
        const lightbox = document.getElementById('image-lightbox');
        if (lightbox && lightbox.style.display !== 'none') {
            if (this.app.closeLightbox) {
                this.app.closeLightbox();
            }
            return;
        }

        // Close any dropdown menus
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show, .quick-actions-menu[style*="display: block"]');
        openDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
        });
    }

    /**
     * Handle quick save shortcut
     */
    handleQuickSave(event) {
        console.log('⌨️ Quick save triggered');
        
        // Look for any forms that might need saving
        const activeElement = document.activeElement;
        const form = activeElement?.closest('form');
        
        if (form) {
            const saveButton = form.querySelector('button[type="submit"], .btn-save, .save-btn');
            if (saveButton && !saveButton.disabled) {
                saveButton.click();
                this.app.showNotification('💾 Quick save triggered', 'info');
            }
        }
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Escape', description: 'Close modals and dropdowns' },
            { key: 'Ctrl + S', description: 'Quick save (when in forms)' },
            { key: 'Ctrl + /', description: 'Show this help' }
        ];

        const shortcutList = shortcuts.map(s => 
            `<div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${s.key}</code>
                <span>${s.description}</span>
            </div>`
        ).join('');

        this.app.showCustomConfirm(
            '⌨️ Keyboard Shortcuts',
            'Available keyboard shortcuts:',
            [shortcutList]
        );
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        console.log('📏 Window resized:', window.innerWidth, 'x', window.innerHeight);
        
        // Trigger chart updates if charts exist
        if (this.app.charts) {
            Object.values(this.app.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }
        
        // Emit custom resize event for components
        this.emit('window-resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    /**
     * Handle page unload
     */
    handleBeforeUnload(event) {
        console.log('🧹 Page unloading - cleaning up resources');
        
        // Check for unsaved changes
        const unsavedForms = document.querySelectorAll('form[data-unsaved="true"], .unsaved-changes');
        if (unsavedForms.length > 0) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            event.preventDefault();
            event.returnValue = message;
            return message;
        }
        
        // Cleanup any ongoing processes
        this.cleanup();
    }

    /**
     * Handle form submissions
     */
    handleFormSubmit(event) {
        const form = event.target;
        
        // Add loading state to submit buttons
        const submitBtns = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitBtns.forEach(btn => {
            btn.disabled = true;
            const originalText = btn.textContent || btn.value;
            btn.setAttribute('data-original-text', originalText);
            btn.textContent = btn.value = 'Submitting...';
            
            // Re-enable after a timeout as fallback
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = btn.value = originalText;
            }, 5000);
        });
    }

    /**
     * Handle input changes
     */
    handleInputChange(event) {
        const input = event.target;
        const form = input.closest('form');
        
        if (form) {
            // Mark form as having unsaved changes
            form.setAttribute('data-unsaved', 'true');
            
            // Remove unsaved flag when form is submitted
            const submitHandler = () => {
                form.removeAttribute('data-unsaved');
                form.removeEventListener('submit', submitHandler);
            };
            form.addEventListener('submit', submitHandler, { once: true });
        }
    }

    /**
     * Custom event system
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }

    emit(eventName, data) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventName}:`, error);
                }
            });
        }
    }

    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Track event listeners for cleanup
     */
    trackListener(target, event, handler) {
        if (!this.boundHandlers.has(target)) {
            this.boundHandlers.set(target, []);
        }
        this.boundHandlers.get(target).push({ event, handler });
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
        console.log('🧹 Cleaning up event listeners');
        
        // Remove tracked event listeners
        for (const [target, handlers] of this.boundHandlers) {
            const element = target === 'window' ? window : 
                          target === 'document' ? document : 
                          document.querySelector(target);
            
            if (element) {
                handlers.forEach(({ event, handler }) => {
                    element.removeEventListener(event, handler);
                });
            }
        }
        
        // Clear all listeners
        this.listeners.clear();
        this.boundHandlers.clear();
    }
}