// Base API Client
// Provides standardized patterns for API communication with authentication, error handling, and retries

export class BaseApiClient {
    constructor(baseUrl = '/api', options = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.defaultTimeout = options.timeout || 30000; // 30 seconds default
        this.defaultRetries = options.retries || 2;
        this.retryDelay = options.retryDelay || 1000; // 1 second
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Default headers
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };
    }

    /**
     * Get authentication token from multiple sources
     */
    getAuthToken() {
        // Priority: window.app.token > localStorage authToken > localStorage token
        if (typeof window !== 'undefined') {
            return window.app?.token || 
                   localStorage.getItem('authToken') || 
                   localStorage.getItem('auth_token') || 
                   localStorage.getItem('token') || 
                   '';
        }
        return '';
    }

    /**
     * Create authenticated headers
     */
    createHeaders(options = {}) {
        const headers = { ...this.defaultHeaders };
        
        // Add authentication if available
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Override with custom headers
        if (options.headers) {
            Object.assign(headers, options.headers);
        }
        
        // Handle FormData - remove Content-Type to let browser set it
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }
        
        return headers;
    }

    /**
     * Build full URL from endpoint
     */
    buildUrl(endpoint) {
        // Handle absolute URLs
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        
        // Handle endpoints that already include /api
        if (endpoint.startsWith('/api/')) {
            return endpoint;
        }
        
        // Handle relative endpoints
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.baseUrl}/${cleanEndpoint}`;
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        if (typeof interceptor === 'function') {
            this.requestInterceptors.push(interceptor);
        }
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor) {
        if (typeof interceptor === 'function') {
            this.responseInterceptors.push(interceptor);
        }
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(url, options) {
        let modifiedOptions = { ...options };
        
        for (const interceptor of this.requestInterceptors) {
            try {
                const result = await interceptor(url, modifiedOptions);
                if (result) {
                    modifiedOptions = result;
                }
            } catch (error) {
                console.warn('Request interceptor error:', error);
            }
        }
        
        return modifiedOptions;
    }

    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response, url, options) {
        let modifiedResponse = response;
        
        for (const interceptor of this.responseInterceptors) {
            try {
                const result = await interceptor(modifiedResponse, url, options);
                if (result) {
                    modifiedResponse = result;
                }
            } catch (error) {
                console.warn('Response interceptor error:', error);
            }
        }
        
        return modifiedResponse;
    }

    /**
     * Wait for specified delay (used in retry logic)
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Determine if error should trigger a retry
     */
    shouldRetry(error, attempt, maxRetries) {
        if (attempt >= maxRetries) return false;
        
        // Retry on network errors
        if (error instanceof TypeError && error.message.includes('fetch')) return true;
        
        // Retry on server errors (5xx)
        if (error.status >= 500) return true;
        
        // Retry on timeout
        if (error.name === 'AbortError') return true;
        
        // Don't retry on client errors (4xx)
        return false;
    }

    /**
     * Core request method with retry logic
     */
    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const maxRetries = options.retries ?? this.defaultRetries;
        let attempt = 0;
        
        while (attempt <= maxRetries) {
            try {
                // Apply request interceptors
                const modifiedOptions = await this.applyRequestInterceptors(url, options);
                
                // Create headers
                const headers = this.createHeaders(modifiedOptions);
                
                // Set up request options
                const requestOptions = {
                    method: modifiedOptions.method || 'GET',
                    headers,
                    ...modifiedOptions
                };
                
                // Remove custom options that fetch doesn't understand
                delete requestOptions.retries;
                delete requestOptions.timeout;
                
                // Add timeout using AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);
                requestOptions.signal = controller.signal;
                
                // Make the request
                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);
                
                // Apply response interceptors
                const modifiedResponse = await this.applyResponseInterceptors(response, url, options);
                
                // Handle HTTP errors
                if (!modifiedResponse.ok) {
                    const error = new Error(`HTTP ${modifiedResponse.status}: ${modifiedResponse.statusText}`);
                    error.status = modifiedResponse.status;
                    error.response = modifiedResponse;
                    
                    // Try to parse error response
                    try {
                        const errorData = await modifiedResponse.json();
                        error.data = errorData;
                        error.message = errorData.error || errorData.message || error.message;
                    } catch (parseError) {
                        // If we can't parse the error response, use the status text
                        error.message = modifiedResponse.statusText || error.message;
                    }
                    
                    throw error;
                }
                
                return modifiedResponse;
                
            } catch (error) {
                attempt++;
                
                // If this is the last attempt or shouldn't retry, throw the error
                if (!this.shouldRetry(error, attempt, maxRetries)) {
                    // Enhance error with request context
                    error.url = url;
                    error.attempt = attempt;
                    throw error;
                }
                
                // Wait before retrying
                await this.wait(this.retryDelay * attempt); // Exponential backoff
                console.warn(`Request failed, retrying (${attempt}/${maxRetries}):`, error.message);
            }
        }
    }

    /**
     * Parse response based on content type
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else if (contentType && contentType.includes('text/')) {
            return response.text();
        } else {
            return response.blob();
        }
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        const response = await this.request(endpoint, { ...options, method: 'GET' });
        return this.parseResponse(response);
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        const response = await this.request(endpoint, { 
            ...options, 
            method: 'POST', 
            body 
        });
        return this.parseResponse(response);
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        const response = await this.request(endpoint, { 
            ...options, 
            method: 'PUT', 
            body 
        });
        return this.parseResponse(response);
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        const response = await this.request(endpoint, { ...options, method: 'DELETE' });
        return this.parseResponse(response);
    }

    /**
     * PATCH request
     */
    async patch(endpoint, data, options = {}) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        const response = await this.request(endpoint, { 
            ...options, 
            method: 'PATCH', 
            body 
        });
        return this.parseResponse(response);
    }
}

// Create default instance
export const apiClient = new BaseApiClient();

// Export both class and instance
export default BaseApiClient;