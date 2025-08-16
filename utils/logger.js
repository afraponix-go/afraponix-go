/**
 * Centralized logging utility for Afraponix Go
 * Provides conditional logging based on environment
 */

class Logger {
    constructor() {
        // Determine if we're in development mode
        // In browser, check for development indicators; in Node.js, use NODE_ENV
        this.isClient = typeof window !== 'undefined';
        if (this.isClient) {
            // Browser environment - check for development indicators
            this.isDevelopment = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' ||
                                window.location.port !== '';
        } else {
            // Node.js environment
            this.isDevelopment = process.env.NODE_ENV !== 'production';
        }
    }

    /**
     * Log informational messages (only in development)
     */
    info(...args) {
        if (this.isDevelopment) {
            console.info('[INFO]', ...args);
        }
    }

    /**
     * Log debug messages (only in development)
     */
    debug(...args) {
        if (this.isDevelopment) {
            console.log('[DEBUG]', ...args);
        }
    }

    /**
     * Log warnings (always show)
     */
    warn(...args) {
        console.warn('[WARN]', ...args);
    }

    /**
     * Log errors (always show)
     */
    error(...args) {
        console.error('[ERROR]', ...args);
    }

    /**
     * Log API requests/responses (only in development)
     */
    api(method, url, data = null) {
        if (this.isDevelopment) {
            const timestamp = new Date().toISOString();
            console.log(`[API ${timestamp}] ${method} ${url}`, data ? data : '');
        }
    }

    /**
     * Log database operations (only in development)
     */
    db(operation, table, details = null) {
        if (this.isDevelopment) {
            const timestamp = new Date().toISOString();
            console.log(`[DB ${timestamp}] ${operation} on ${table}`, details ? details : '');
        }
    }

    /**
     * Log user actions (only in development)
     */
    user(action, details = null) {
        if (this.isDevelopment) {
            const timestamp = new Date().toISOString();
            console.log(`[USER ${timestamp}] ${action}`, details ? details : '');
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
} else if (typeof window !== 'undefined') {
    window.logger = logger;
}