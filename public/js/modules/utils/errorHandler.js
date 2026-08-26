// Error Handler Utility
// Standardized error handling patterns used throughout the application

/**
 * Error Handler Class
 * Provides consistent error handling, logging, and user feedback
 */
export class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            logErrors: true,
            showUserMessages: true,
            enableRetries: true,
            defaultRetryCount: 2,
            enableErrorReporting: false,
            ...options
        };
        
        this.errorStats = {
            totalErrors: 0,
            apiErrors: 0,
            validationErrors: 0,
            unknownErrors: 0
        };
        
        console.log('🛡️ Error Handler initialized');
    }

    /**
     * Handle API errors with standardized patterns
     */
    async handleApiError(error, context = {}) {
        this.errorStats.totalErrors++;
        this.errorStats.apiErrors++;
        
        const errorInfo = {
            type: 'api',
            message: error.message || 'Unknown API error',
            status: error.status || 500,
            context: context.endpoint || 'unknown',
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        // Log error if enabled
        if (this.options.logErrors) {
            console.error(`🚨 API Error [${context.endpoint || 'Unknown'}]:`, errorInfo);
        }
        
        // Determine user-friendly message
        const userMessage = this.getApiErrorMessage(error);
        
        // Show user notification if enabled
        if (this.options.showUserMessages && window.app?.showNotification) {
            window.app.showNotification(userMessage, 'error', 6000);
        }
        
        // Report error if enabled
        if (this.options.enableErrorReporting) {
            await this.reportError(errorInfo);
        }
        
        return {
            handled: true,
            userMessage,
            errorInfo,
            shouldRetry: this.shouldRetryApiError(error)
        };
    }

    /**
     * Handle validation errors
     */
    handleValidationError(errors, context = {}) {
        this.errorStats.totalErrors++;
        this.errorStats.validationErrors++;
        
        const errorInfo = {
            type: 'validation',
            errors: Array.isArray(errors) ? errors : [errors],
            context: context.form || context.field || 'unknown',
            timestamp: new Date().toISOString()
        };
        
        if (this.options.logErrors) {
            console.warn(`⚠️ Validation Error [${errorInfo.context}]:`, errorInfo.errors);
        }
        
        // Show validation errors to user
        if (this.options.showUserMessages) {
            const message = this.formatValidationMessage(errorInfo.errors);
            if (window.app?.showNotification) {
                window.app.showNotification(message, 'warning', 5000);
            }
        }
        
        return {
            handled: true,
            errors: errorInfo.errors,
            context: errorInfo.context
        };
    }

    /**
     * Handle general JavaScript errors
     */
    handleGeneralError(error, context = {}) {
        this.errorStats.totalErrors++;
        this.errorStats.unknownErrors++;
        
        const errorInfo = {
            type: 'general',
            message: error.message || 'Unknown error',
            context: context.operation || 'unknown',
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        if (this.options.logErrors) {
            console.error(`💥 General Error [${errorInfo.context}]:`, errorInfo);
        }
        
        const userMessage = context.userMessage || 'An unexpected error occurred. Please try again.';
        
        if (this.options.showUserMessages && window.app?.showNotification) {
            window.app.showNotification(userMessage, 'error', 4000);
        }
        
        if (this.options.enableErrorReporting) {
            this.reportError(errorInfo);
        }
        
        return {
            handled: true,
            userMessage,
            errorInfo
        };
    }

    /**
     * Wrap async functions with error handling
     */
    wrapAsync(asyncFn, context = {}) {
        return async (...args) => {
            try {
                return await asyncFn(...args);
            } catch (error) {
                if (this.isApiError(error)) {
                    const result = await this.handleApiError(error, context);
                    if (result.shouldRetry && this.options.enableRetries) {
                        // Retry logic can be implemented here
                        console.log(`🔄 Retrying operation: ${context.operation || 'unknown'}`);
                    }
                    throw error; // Re-throw for caller to handle
                } else {
                    this.handleGeneralError(error, context);
                    throw error;
                }
            }
        };
    }

    /**
     * Create try-catch wrapper with consistent error handling
     */
    async executeSafely(operation, context = {}) {
        try {
            return await operation();
        } catch (error) {
            if (this.isApiError(error)) {
                return await this.handleApiError(error, context);
            } else {
                return this.handleGeneralError(error, context);
            }
        }
    }

    /**
     * Handle fetch response errors consistently
     */
    async handleFetchResponse(response, context = {}) {
        if (!response.ok) {
            let errorData;
            try {
                const errorText = await response.text();
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
            } catch (e) {
                errorData = { error: 'Failed to read error response' };
            }
            
            const error = new Error(errorData.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            
            throw error;
        }
        
        return response;
    }

    /**
     * Get user-friendly API error message
     */
    getApiErrorMessage(error) {
        const status = error.status || 500;
        const message = error.message || '';
        
        // Network errors
        if (message.includes('fetch') || message.includes('network')) {
            return 'Network connection failed. Please check your internet connection.';
        }
        
        // HTTP status based messages
        switch (status) {
            case 400:
                return error.data?.error || 'Invalid request. Please check your input.';
            case 401:
                return 'Authentication required. Please log in again.';
            case 403:
                return 'Access denied. You don\'t have permission for this action.';
            case 404:
                return 'The requested resource was not found.';
            case 409:
                return error.data?.error || 'Conflict: This action cannot be completed.';
            case 422:
                return error.data?.error || 'Validation failed. Please check your input.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
                return 'Server error occurred. Please try again later.';
            case 503:
                return 'Service temporarily unavailable. Please try again later.';
            default:
                return message || 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Format validation errors for user display
     */
    formatValidationMessage(errors) {
        if (!Array.isArray(errors)) {
            return errors.toString();
        }
        
        if (errors.length === 1) {
            return errors[0];
        }
        
        if (errors.length <= 3) {
            return errors.join('; ');
        }
        
        return `Multiple validation errors: ${errors.slice(0, 2).join(', ')} and ${errors.length - 2} more.`;
    }

    /**
     * Check if error is an API error
     */
    isApiError(error) {
        return !!(error.status || 
                error.message?.includes('fetch') || 
                error.message?.includes('HTTP') ||
                (error.name === 'TypeError' && error.message?.includes('fetch')));
    }

    /**
     * Determine if API error should be retried
     */
    shouldRetryApiError(error) {
        const status = error.status;
        
        // Don't retry client errors (4xx)
        if (status >= 400 && status < 500) {
            return false;
        }
        
        // Retry server errors (5xx) and network errors
        return status >= 500 || !status;
    }

    /**
     * Report error to monitoring service (placeholder)
     */
    async reportError(errorInfo) {
        try {
            // This would send to an error reporting service
            console.log('📊 Error reported:', errorInfo);
            
            // Example: send to monitoring endpoint
            // await fetch('/api/errors', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorInfo)
            // });
            
        } catch (reportError) {
            console.warn('Failed to report error:', reportError);
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            errorRate: this.errorStats.totalErrors > 0 ? 
                ((this.errorStats.totalErrors / (this.errorStats.totalErrors + 100)) * 100).toFixed(1) + '%' : 
                '0%'
        };
    }

    /**
     * Clear error statistics
     */
    clearStats() {
        this.errorStats = {
            totalErrors: 0,
            apiErrors: 0,
            validationErrors: 0,
            unknownErrors: 0
        };
    }

    /**
     * Set global error handlers
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled Promise Rejection:', event.reason);
            this.handleGeneralError(event.reason, { operation: 'unhandledPromise' });
            event.preventDefault(); // Prevent default browser error handling
        });
        
        // Handle general JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('🚨 Global JavaScript Error:', event.error);
            this.handleGeneralError(event.error, { operation: 'globalError' });
        });
        
        console.log('✅ Global error handlers installed');
    }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Utility functions for common error handling patterns
export const handleApiError = (error, context) => errorHandler.handleApiError(error, context);
export const handleValidationError = (errors, context) => errorHandler.handleValidationError(errors, context);
export const handleGeneralError = (error, context) => errorHandler.handleGeneralError(error, context);
export const wrapAsync = (fn, context) => errorHandler.wrapAsync(fn, context);
export const executeSafely = (operation, context) => errorHandler.executeSafely(operation, context);
export const handleFetchResponse = (response, context) => errorHandler.handleFetchResponse(response, context);

// Export the instance as default
export default errorHandler;