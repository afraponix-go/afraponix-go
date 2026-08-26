// Auth API Module  
// Handles all authentication and user management API calls with comprehensive functionality

import { apiClient } from './baseApiClient.js';

/**
 * Authentication API operations using the BaseApiClient for standardized patterns
 */
export class AuthAPI {
    constructor(client = apiClient) {
        this.client = client;
        // Create a client instance that doesn't add auth headers for most auth operations
        this.publicClient = new (client.constructor)('/api');
    }

    // ================== USER REGISTRATION ==================

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @param {string} userData.username - Username
     * @param {string} userData.email - Email address
     * @param {string} userData.password - Password
     * @param {string} userData.firstName - First name
     * @param {string} userData.lastName - Last name
     * @returns {Promise<Object>} Registration result
     */
    async register(userData) {
        try {
            return await this.publicClient.post('/auth/register', userData);
        } catch (error) {
            console.error('❌ Failed to register user:', error);
            throw new Error(`Failed to register: ${error.message}`);
        }
    }

    // ================== USER LOGIN ==================

    /**
     * User login
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.username - Username or email
     * @param {string} credentials.password - Password
     * @returns {Promise<Object>} Login result with token
     */
    async login(credentials) {
        try {
            const result = await this.publicClient.post('/auth/login', credentials);
            
            // Store token in localStorage and window.app if login successful
            if (result.token) {
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('auth_token', result.token);
                if (window.app) {
                    window.app.token = result.token;
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Failed to login:', error);
            throw new Error(`Failed to login: ${error.message}`);
        }
    }

    // ================== EMAIL VERIFICATION ==================

    /**
     * Verify user email with token
     * @param {string} token - Verification token
     * @returns {Promise<Object>} Verification result
     */
    async verifyEmail(token) {
        try {
            const params = new URLSearchParams({ token });
            return await this.publicClient.get(`/auth/verify?${params.toString()}`);
        } catch (error) {
            console.error('❌ Failed to verify email:', error);
            throw new Error(`Failed to verify email: ${error.message}`);
        }
    }

    /**
     * Send verification email to user
     * @param {Object} emailData - Email data
     * @param {string} emailData.email - Email address
     * @returns {Promise<Object>} Send result
     */
    async sendVerificationEmail(emailData) {
        try {
            return await this.publicClient.post('/auth/verify-email', emailData);
        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            throw new Error(`Failed to send verification email: ${error.message}`);
        }
    }

    /**
     * Resend verification email
     * @param {Object} emailData - Email data
     * @param {string} emailData.email - Email address
     * @returns {Promise<Object>} Resend result
     */
    async resendVerificationEmail(emailData) {
        try {
            return await this.publicClient.post('/auth/resend-verification', emailData);
        } catch (error) {
            console.error('❌ Failed to resend verification email:', error);
            throw new Error(`Failed to resend verification email: ${error.message}`);
        }
    }

    // ================== PASSWORD RESET ==================

    /**
     * Send forgot password email
     * @param {Object} emailData - Email data
     * @param {string} emailData.email - Email address
     * @returns {Promise<Object>} Send result
     */
    async sendForgotPasswordEmail(emailData) {
        try {
            return await this.publicClient.post('/auth/forgot-password', emailData);
        } catch (error) {
            console.error('❌ Failed to send forgot password email:', error);
            throw new Error(`Failed to send forgot password email: ${error.message}`);
        }
    }

    /**
     * Verify password reset code
     * @param {Object} codeData - Code verification data
     * @param {string} codeData.email - Email address
     * @param {string} codeData.code - Verification code
     * @returns {Promise<Object>} Code verification result
     */
    async verifyResetCode(codeData) {
        try {
            return await this.publicClient.post('/auth/verify-code', codeData);
        } catch (error) {
            console.error('❌ Failed to verify reset code:', error);
            throw new Error(`Failed to verify reset code: ${error.message}`);
        }
    }

    /**
     * Reset password with token
     * @param {Object} resetData - Password reset data
     * @param {string} resetData.token - Reset token
     * @param {string} resetData.password - New password
     * @param {string} resetData.confirmPassword - Password confirmation
     * @returns {Promise<Object>} Reset result
     */
    async resetPassword(resetData) {
        try {
            return await this.publicClient.post('/auth/reset-password', resetData);
        } catch (error) {
            console.error('❌ Failed to reset password:', error);
            throw new Error(`Failed to reset password: ${error.message}`);
        }
    }

    // ================== USERNAME VALIDATION ==================

    /**
     * Check username availability
     * @param {Object} usernameData - Username data
     * @param {string} usernameData.username - Username to check
     * @returns {Promise<Object>} Availability result
     */
    async checkUsernameAvailability(usernameData) {
        try {
            return await this.publicClient.post('/auth/check-username', usernameData);
        } catch (error) {
            console.error('❌ Failed to check username availability:', error);
            throw new Error(`Failed to check username: ${error.message}`);
        }
    }

    // ================== USER SESSION MANAGEMENT ==================

    /**
     * Logout user (clear tokens)
     * @returns {Promise<Object>} Logout result
     */
    async logout() {
        try {
            // Clear stored tokens
            localStorage.removeItem('authToken');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
            
            if (window.app) {
                window.app.token = null;
            }
            
            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            console.error('❌ Failed to logout:', error);
            throw new Error(`Failed to logout: ${error.message}`);
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        const token = this.getAuthToken();
        return !!token;
    }

    /**
     * Get authentication token
     * @returns {string|null} Authentication token
     */
    getAuthToken() {
        return window.app?.token || 
               localStorage.getItem('authToken') || 
               localStorage.getItem('auth_token') || 
               localStorage.getItem('token') || 
               null;
    }

    /**
     * Get user info from token (basic decode)
     * @returns {Object|null} User info from token payload
     */
    getUserFromToken() {
        const token = this.getAuthToken();
        if (!token) return null;

        try {
            // Basic JWT decode (not verified)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (error) {
            console.warn('Failed to decode token:', error);
            return null;
        }
    }

    /**
     * Check if token is expired
     * @returns {boolean} True if token is expired
     */
    isTokenExpired() {
        const user = this.getUserFromToken();
        if (!user || !user.exp) return true;
        
        return user.exp < Date.now() / 1000;
    }

    // ================== VALIDATION UTILITIES ==================

    /**
     * Validate registration data
     * @param {Object} userData - User registration data
     * @returns {Object} Validation result
     */
    validateRegistrationData(userData) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Required fields
        const requiredFields = ['username', 'email', 'password', 'firstName', 'lastName'];
        requiredFields.forEach(field => {
            if (!userData[field]) {
                validation.valid = false;
                validation.errors.push(`${field} is required`);
            }
        });

        // Email validation
        if (userData.email && !this.isValidEmail(userData.email)) {
            validation.valid = false;
            validation.errors.push('Please enter a valid email address');
        }

        // Password validation
        if (userData.password && userData.password.length < 6) {
            validation.valid = false;
            validation.errors.push('Password must be at least 6 characters long');
        }

        // Username validation
        if (userData.username && userData.username.length < 3) {
            validation.valid = false;
            validation.errors.push('Username must be at least 3 characters long');
        }

        // Password confirmation
        if (userData.password && userData.confirmPassword && 
            userData.password !== userData.confirmPassword) {
            validation.valid = false;
            validation.errors.push('Passwords do not match');
        }

        return validation;
    }

    /**
     * Validate login credentials
     * @param {Object} credentials - Login credentials
     * @returns {Object} Validation result
     */
    validateLoginCredentials(credentials) {
        const validation = {
            valid: true,
            errors: []
        };

        if (!credentials.username) {
            validation.valid = false;
            validation.errors.push('Username or email is required');
        }

        if (!credentials.password) {
            validation.valid = false;
            validation.errors.push('Password is required');
        }

        return validation;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate strong password requirements
     * @returns {Object} Password requirements
     */
    getPasswordRequirements() {
        return {
            minLength: 6,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSpecialChars: false,
            description: 'Password must be at least 6 characters long'
        };
    }

    // ================== TEST ENDPOINTS ==================

    /**
     * Test authentication endpoint
     * @returns {Promise<Object>} Test result
     */
    async testAuth() {
        try {
            return await this.publicClient.get('/auth/test');
        } catch (error) {
            console.error('❌ Auth test failed:', error);
            throw new Error(`Auth test failed: ${error.message}`);
        }
    }

    /**
     * Test password reset functionality
     * @returns {Promise<Object>} Test result
     */
    async testPasswordReset() {
        try {
            return await this.publicClient.get('/auth/reset-password-test');
        } catch (error) {
            console.error('❌ Password reset test failed:', error);
            throw new Error(`Password reset test failed: ${error.message}`);
        }
    }
}

// Create default instance
const authAPI = new AuthAPI();

// Export both class and default instance
export { authAPI };
export default authAPI;

// Legacy function exports for backward compatibility
export const register = (userData) => authAPI.register(userData);
export const login = (credentials) => authAPI.login(credentials);
export const logout = () => authAPI.logout();
export const verifyEmail = (token) => authAPI.verifyEmail(token);
export const sendVerificationEmail = (emailData) => authAPI.sendVerificationEmail(emailData);
export const resendVerificationEmail = (emailData) => authAPI.resendVerificationEmail(emailData);
export const sendForgotPasswordEmail = (emailData) => authAPI.sendForgotPasswordEmail(emailData);
export const verifyResetCode = (codeData) => authAPI.verifyResetCode(codeData);
export const resetPassword = (resetData) => authAPI.resetPassword(resetData);
export const checkUsernameAvailability = (usernameData) => authAPI.checkUsernameAvailability(usernameData);
export const isAuthenticated = () => authAPI.isAuthenticated();
export const getAuthToken = () => authAPI.getAuthToken();
export const getUserFromToken = () => authAPI.getUserFromToken();
export const isTokenExpired = () => authAPI.isTokenExpired();
export const validateRegistrationData = (userData) => authAPI.validateRegistrationData(userData);
export const validateLoginCredentials = (credentials) => authAPI.validateLoginCredentials(credentials);
export const isValidEmail = (email) => authAPI.isValidEmail(email);
export const testAuth = () => authAPI.testAuth();
export const testPasswordReset = () => authAPI.testPasswordReset();