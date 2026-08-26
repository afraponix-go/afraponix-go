// Authentication Manager Component
// Professional ES6 module for comprehensive authentication management

import { BaseComponent } from './baseComponent.js';
import { STORAGE_KEYS, CSS_CLASSES, API_ENDPOINTS } from '../constants/index.js';

/**
 * Authentication Manager Component
 * Handles all authentication operations including login, registration, token management,
 * session management, and user profile operations for the Afraponix Go application
 */
export class AuthenticationManagerComponent extends BaseComponent {
    constructor(app) {
        super(app, 'AuthenticationManager');
        
        // Authentication state
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authToken = null;
        this.tokenExpiry = null;
        this.loginInProgress = false;
        this.lastLoginAttempt = 0;
        this.refreshTokenTimer = null;
        this.sessionCheckInterval = null;
        
        // Session management
        this.sessionTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        this.refreshInterval = 60 * 60 * 1000; // 1 hour in milliseconds
        this.lastActivity = Date.now();
        
        // Rate limiting
        this.maxLoginAttempts = 5;
        this.loginAttemptWindow = 15 * 60 * 1000; // 15 minutes
        this.loginAttempts = new Map(); // IP/user tracking would be server-side
        
        // Remember me functionality
        this.rememberMe = false;
        this.rememberMeStorage = 'local'; // 'local' vs 'session'
        
        // Configuration
        this.config = {
            autoRefresh: true,
            sessionWarning: 5 * 60 * 1000, // Warn 5 minutes before expiry
            csrfProtection: true,
            secureTokenStorage: true
        };
        
        this.log('Authentication Manager initialized');
        this.initializeAuth();
    }

    /**
     * Initialize authentication system
     * Sets up token validation, session monitoring, and event handlers
     */
    async initializeAuth() {
        try {
            // Load existing token if present
            await this.loadStoredToken();
            
            // Set up session monitoring
            this.setupSessionMonitoring();
            
            // Set up activity tracking for session timeout
            this.setupActivityTracking();
            
            // Initialize CSRF protection if enabled
            if (this.config.csrfProtection) {
                await this.initializeCsrfProtection();
            }
            
            this.log('Authentication system initialized successfully');
            
        } catch (error) {
            this.logError('Failed to initialize authentication system', error);
            throw error;
        }
    }

    /**
     * Load stored authentication token and validate it
     */
    async loadStoredToken() {
        try {
            const token = this.getStoredToken();
            
            if (!token) {
                this.log('No stored token found');
                return false;
            }
            
            // Validate token with server
            const isValid = await this.validateToken(token);
            
            if (isValid) {
                this.authToken = token;
                this.isAuthenticated = true;
                await this.loadUserInfo();
                this.setupTokenRefresh();
                this.log('Authentication restored from stored token');
                return true;
            } else {
                this.clearStoredToken();
                this.log('Stored token is invalid, cleared from storage');
                return false;
            }
            
        } catch (error) {
            this.logError('Error loading stored token', error);
            this.clearStoredToken();
            return false;
        }
    }

    /**
     * Login user with credentials
     */
    async login(credentials) {
        const { username, password, rememberMe = false } = credentials;
        
        // Validate input
        if (!username || !password) {
            throw new Error('Username and password are required');
        }
        
        // Rate limiting check
        if (this.isRateLimited()) {
            throw new Error('Too many login attempts. Please try again later.');
        }
        
        // Prevent duplicate login calls
        if (this.loginInProgress) {
            throw new Error('Login already in progress');
        }
        
        this.loginInProgress = true;
        this.rememberMe = rememberMe;
        
        try {
            this.log('Attempting login for user:', username);
            
            const response = await this.makeApiCall('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.token) {
                // Successful login
                await this.handleSuccessfulLogin(response);
                this.clearLoginAttempts();
                this.log('Login successful for user:', username);
                return { success: true, user: this.currentUser };
                
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error) {
            this.recordLoginAttempt();
            this.logError('Login failed', error);
            
            // Handle specific error types
            if (error.message?.includes('Email not verified')) {
                return {
                    success: false,
                    error: 'EMAIL_NOT_VERIFIED',
                    message: error.message,
                    needsVerification: true
                };
            }
            
            if (error.message?.includes('Invalid credentials')) {
                return {
                    success: false,
                    error: 'INVALID_CREDENTIALS',
                    message: 'Invalid username or password'
                };
            }
            
            return {
                success: false,
                error: 'LOGIN_FAILED',
                message: error.message || 'Login failed'
            };
            
        } finally {
            this.loginInProgress = false;
        }
    }

    /**
     * Register new user account
     */
    async register(userData) {
        const { username, email, password, firstName, lastName, confirmPassword } = userData;
        
        // Validate required fields
        const requiredFields = { username, email, password, firstName, lastName };
        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
            
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate password confirmation
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        // Validate password strength
        const passwordValidation = this.validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
        }
        
        // Validate email format
        if (!this.validateEmail(email)) {
            throw new Error('Invalid email format');
        }
        
        try {
            this.log('Attempting registration for user:', username);
            
            const response = await this.makeApiCall('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    firstName,
                    lastName
                })
            });
            
            this.log('Registration successful for user:', username);
            
            return {
                success: true,
                message: response.message,
                needsVerification: response.needsVerification,
                user: response.user
            };
            
        } catch (error) {
            this.logError('Registration failed', error);
            
            // Handle specific registration errors
            if (error.message?.includes('already exists')) {
                return {
                    success: false,
                    error: 'USER_EXISTS',
                    message: error.message
                };
            }
            
            return {
                success: false,
                error: 'REGISTRATION_FAILED',
                message: error.message || 'Registration failed'
            };
        }
    }

    /**
     * Logout user and clean up session
     */
    async logout(silent = false) {
        try {
            this.log('Logging out user');
            
            // Clear refresh timer
            if (this.refreshTokenTimer) {
                this.clearTimeout(this.refreshTokenTimer);
                this.refreshTokenTimer = null;
            }
            
            // Clear session monitoring
            if (this.sessionCheckInterval) {
                this.clearInterval(this.sessionCheckInterval);
                this.sessionCheckInterval = null;
            }
            
            // Notify server of logout (optional, for session cleanup)
            if (this.authToken && !silent) {
                try {
                    await this.makeApiCall('/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    // Server logout failed, but continue with client cleanup
                    this.logWarning('Server logout failed, continuing with client cleanup', error);
                }
            }
            
            // Clear local state
            this.isAuthenticated = false;
            this.currentUser = null;
            this.authToken = null;
            this.tokenExpiry = null;
            this.lastActivity = Date.now();
            
            // Clear stored tokens
            this.clearStoredToken();
            
            // Emit logout event
            this.emit('logout', { silent });
            
            if (!silent) {
                this.showNotification('Logged out successfully', 'info');
            }
            
            this.log('Logout completed successfully');
            
        } catch (error) {
            this.logError('Error during logout', error);
            
            // Force cleanup even if logout fails
            this.isAuthenticated = false;
            this.currentUser = null;
            this.authToken = null;
            this.clearStoredToken();
            
            throw error;
        }
    }

    /**
     * Request password reset for email
     */
    async requestPasswordReset(email) {
        if (!email || !this.validateEmail(email)) {
            throw new Error('Valid email address is required');
        }
        
        try {
            this.log('Requesting password reset for email:', email);
            
            const response = await this.makeApiCall('/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({ email })
            });
            
            this.log('Password reset request sent successfully');
            
            return {
                success: true,
                message: response.message || 'Password reset link sent to your email'
            };
            
        } catch (error) {
            this.logError('Password reset request failed', error);
            return {
                success: false,
                error: 'RESET_FAILED',
                message: error.message || 'Failed to send password reset email'
            };
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword, confirmPassword) {
        if (!token) {
            throw new Error('Reset token is required');
        }
        
        if (!newPassword || !confirmPassword) {
            throw new Error('New password and confirmation are required');
        }
        
        if (newPassword !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        // Validate password strength
        const passwordValidation = this.validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
        }
        
        try {
            this.log('Resetting password with token');
            
            const response = await this.makeApiCall('/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({ token, password: newPassword })
            });
            
            this.log('Password reset successful');
            
            return {
                success: true,
                message: response.message || 'Password reset successfully'
            };
            
        } catch (error) {
            this.logError('Password reset failed', error);
            return {
                success: false,
                error: 'RESET_FAILED',
                message: error.message || 'Password reset failed'
            };
        }
    }

    /**
     * Verify email with token or code
     */
    async verifyEmail(verification) {
        const { token, code, email } = verification;
        
        if (!token && (!code || !email)) {
            throw new Error('Either verification token or code with email is required');
        }
        
        try {
            let endpoint, payload;
            
            if (token) {
                this.log('Verifying email with token');
                endpoint = '/auth/verify-email';
                payload = { token };
            } else {
                this.log('Verifying email with code');
                endpoint = '/auth/verify-code';
                payload = { code, email };
            }
            
            const response = await this.makeApiCall(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify(payload)
            });
            
            // Auto-login after successful verification if token is provided
            if (response.token && response.user) {
                await this.handleSuccessfulLogin(response);
            }
            
            this.log('Email verification successful');
            
            return {
                success: true,
                message: response.message,
                verified: true,
                autoLogin: !!response.token
            };
            
        } catch (error) {
            this.logError('Email verification failed', error);
            return {
                success: false,
                error: 'VERIFICATION_FAILED',
                message: error.message || 'Email verification failed'
            };
        }
    }

    /**
     * Resend verification email
     */
    async resendVerification(email) {
        if (!email || !this.validateEmail(email)) {
            throw new Error('Valid email address is required');
        }
        
        try {
            this.log('Resending verification email to:', email);
            
            const response = await this.makeApiCall('/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({ email })
            });
            
            this.log('Verification email resent successfully');
            
            return {
                success: true,
                message: response.message || 'Verification email sent'
            };
            
        } catch (error) {
            this.logError('Failed to resend verification email', error);
            return {
                success: false,
                error: 'RESEND_FAILED',
                message: error.message || 'Failed to resend verification email'
            };
        }
    }

    /**
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            tokenExpiry: this.tokenExpiry,
            sessionTimeLeft: this.getSessionTimeLeft(),
            lastActivity: this.lastActivity
        };
    }

    /**
     * Get current user information
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Update user profile information
     */
    async updateProfile(updates) {
        if (!this.isAuthenticated || !this.authToken) {
            throw new Error('User must be authenticated to update profile');
        }
        
        // Validate updates object
        if (!updates || typeof updates !== 'object') {
            throw new Error('Valid update data is required');
        }
        
        // Sanitize updates (remove sensitive fields)
        const allowedFields = ['firstName', 'lastName', 'email'];
        const sanitizedUpdates = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                sanitizedUpdates[key] = value;
            }
        }
        
        if (Object.keys(sanitizedUpdates).length === 0) {
            throw new Error('No valid fields to update');
        }
        
        try {
            this.log('Updating user profile:', Object.keys(sanitizedUpdates));
            
            const response = await this.makeApiCall('/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify(sanitizedUpdates)
            });
            
            // Update local user data
            if (response.user) {
                this.currentUser = { ...this.currentUser, ...response.user };
                this.emit('profileUpdated', { user: this.currentUser });
            }
            
            this.log('Profile updated successfully');
            
            return {
                success: true,
                message: response.message || 'Profile updated successfully',
                user: this.currentUser
            };
            
        } catch (error) {
            this.logError('Profile update failed', error);
            return {
                success: false,
                error: 'UPDATE_FAILED',
                message: error.message || 'Failed to update profile'
            };
        }
    }

    /**
     * Change user password
     */
    async changePassword(currentPassword, newPassword, confirmPassword) {
        if (!this.isAuthenticated || !this.authToken) {
            throw new Error('User must be authenticated to change password');
        }
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('Current password, new password, and confirmation are required');
        }
        
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match');
        }
        
        // Validate password strength
        const passwordValidation = this.validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
        }
        
        try {
            this.log('Changing user password');
            
            const response = await this.makeApiCall('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json',
                    ...(this.config.csrfProtection && this.csrfToken && {
                        'X-CSRF-Token': this.csrfToken
                    })
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            this.log('Password changed successfully');
            
            return {
                success: true,
                message: response.message || 'Password changed successfully'
            };
            
        } catch (error) {
            this.logError('Password change failed', error);
            return {
                success: false,
                error: 'CHANGE_FAILED',
                message: error.message || 'Failed to change password'
            };
        }
    }

    /**
     * Validate authentication token with server
     */
    async validateToken(token = null) {
        const tokenToValidate = token || this.authToken;
        
        if (!tokenToValidate) {
            return false;
        }
        
        try {
            const response = await this.makeApiCall('/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenToValidate}`
                }
            });
            
            if (response.user) {
                // Update user info if we're validating current token
                if (!token) {
                    this.currentUser = response.user;
                    this.emit('tokenValidated', { user: this.currentUser });
                }
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.logWarning('Token validation failed', error);
            return false;
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        if (!this.authToken) {
            this.logWarning('No token available to refresh');
            return false;
        }
        
        try {
            this.log('Refreshing authentication token');
            
            const response = await this.makeApiCall('/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.token) {
                const oldToken = this.authToken;
                this.authToken = response.token;
                
                // Update token expiry if provided
                if (response.expiresIn) {
                    this.tokenExpiry = Date.now() + (response.expiresIn * 1000);
                }
                
                // Store new token
                this.storeToken(this.authToken);
                
                // Setup next refresh
                this.setupTokenRefresh();
                
                this.emit('tokenRefreshed', { oldToken, newToken: this.authToken });
                this.log('Token refreshed successfully');
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.logError('Token refresh failed', error);
            
            // If refresh fails, the user needs to login again
            await this.logout(true);
            this.emit('sessionExpired', { reason: 'Token refresh failed' });
            
            return false;
        }
    }

    /**
     * Check username availability
     */
    async checkUsernameAvailability(username) {
        if (!username || username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }
        
        try {
            const response = await this.makeApiCall('/auth/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            return {
                available: response.available,
                username: response.username
            };
            
        } catch (error) {
            this.logError('Username availability check failed', error);
            return {
                available: false,
                error: error.message
            };
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    /**
     * Handle successful login response
     */
    async handleSuccessfulLogin(response) {
        this.authToken = response.token;
        this.currentUser = response.user;
        this.isAuthenticated = true;
        
        // Parse token expiry if available
        if (response.expiresIn) {
            this.tokenExpiry = Date.now() + (response.expiresIn * 1000);
        } else {
            // Default to 7 days if not specified
            this.tokenExpiry = Date.now() + this.sessionTimeout;
        }
        
        // Store token based on remember me setting
        this.storeToken(this.authToken);
        
        // Setup token refresh
        this.setupTokenRefresh();
        
        // Update last activity
        this.lastActivity = Date.now();
        
        // Emit login event
        this.emit('login', { user: this.currentUser });
        
        this.log('User authentication state updated');
    }

    /**
     * Load user information from server
     */
    async loadUserInfo() {
        if (!this.authToken) {
            return;
        }
        
        try {
            const response = await this.makeApiCall('/auth/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.user) {
                this.currentUser = response.user;
                this.emit('userInfoLoaded', { user: this.currentUser });
            }
            
        } catch (error) {
            this.logWarning('Failed to load user info', error);
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh() {
        // Clear existing timer
        if (this.refreshTokenTimer) {
            this.clearTimeout(this.refreshTokenTimer);
        }
        
        if (!this.config.autoRefresh || !this.tokenExpiry) {
            return;
        }
        
        // Calculate refresh time (refresh 5 minutes before expiry)
        const refreshTime = this.tokenExpiry - Date.now() - (5 * 60 * 1000);
        
        if (refreshTime > 0) {
            this.refreshTokenTimer = this.setTimeout(() => {
                this.refreshToken();
            }, refreshTime);
            
            this.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000)} seconds`);
        }
    }

    /**
     * Setup session monitoring for timeout detection
     */
    setupSessionMonitoring() {
        if (this.sessionCheckInterval) {
            this.clearInterval(this.sessionCheckInterval);
        }
        
        this.sessionCheckInterval = this.setInterval(() => {
            this.checkSessionTimeout();
        }, 60000); // Check every minute
    }

    /**
     * Check for session timeout
     */
    checkSessionTimeout() {
        if (!this.isAuthenticated) {
            return;
        }
        
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        
        // Session timeout check (no activity for session timeout duration)
        if (timeSinceActivity > this.sessionTimeout) {
            this.log('Session timed out due to inactivity');
            this.logout(true);
            this.emit('sessionExpired', { reason: 'Inactivity timeout' });
            return;
        }
        
        // Session warning (warn before timeout)
        const warningThreshold = this.sessionTimeout - this.config.sessionWarning;
        if (timeSinceActivity > warningThreshold) {
            const timeLeft = this.sessionTimeout - timeSinceActivity;
            this.emit('sessionWarning', { timeLeft });
        }
    }

    /**
     * Setup activity tracking for session management
     */
    setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.lastActivity = Date.now();
        };
        
        // Add activity listeners
        activityEvents.forEach(event => {
            this.addEventListener(document, event, updateActivity, { passive: true });
        });
    }

    /**
     * Initialize CSRF protection
     */
    async initializeCsrfProtection() {
        try {
            const response = await this.makeApiCall('/auth/csrf-token', {
                method: 'GET'
            });
            
            if (response.csrfToken) {
                this.csrfToken = response.csrfToken;
                this.log('CSRF protection initialized');
            }
            
        } catch (error) {
            this.logWarning('Failed to initialize CSRF protection', error);
        }
    }

    /**
     * Get stored authentication token
     */
    getStoredToken() {
        try {
            if (this.rememberMe || this.rememberMeStorage === 'local') {
                return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            } else {
                return sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            }
        } catch (error) {
            this.logWarning('Failed to get stored token', error);
            return null;
        }
    }

    /**
     * Store authentication token
     */
    storeToken(token) {
        if (!token) return;
        
        try {
            if (this.rememberMe) {
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
                sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            } else {
                sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
                localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            }
        } catch (error) {
            this.logWarning('Failed to store token', error);
        }
    }

    /**
     * Clear stored authentication token
     */
    clearStoredToken() {
        try {
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            this.logWarning('Failed to clear stored token', error);
        }
    }

    /**
     * Check if rate limited for login attempts
     */
    isRateLimited() {
        const now = Date.now();
        const timeSinceLastAttempt = now - this.lastLoginAttempt;
        
        // Simple rate limiting - 3 second delay between attempts
        return timeSinceLastAttempt < 3000;
    }

    /**
     * Record login attempt for rate limiting
     */
    recordLoginAttempt() {
        this.lastLoginAttempt = Date.now();
    }

    /**
     * Clear login attempt tracking
     */
    clearLoginAttempts() {
        this.lastLoginAttempt = 0;
    }

    /**
     * Get remaining session time in milliseconds
     */
    getSessionTimeLeft() {
        if (!this.isAuthenticated || !this.tokenExpiry) {
            return 0;
        }
        
        return Math.max(0, this.tokenExpiry - Date.now());
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get component-specific statistics
     */
    getComponentStats() {
        return {
            isAuthenticated: this.isAuthenticated,
            hasCurrentUser: !!this.currentUser,
            hasAuthToken: !!this.authToken,
            tokenExpiry: this.tokenExpiry,
            sessionTimeLeft: this.getSessionTimeLeft(),
            lastActivity: this.lastActivity,
            rememberMe: this.rememberMe,
            autoRefresh: this.config.autoRefresh,
            csrfProtection: this.config.csrfProtection,
            loginInProgress: this.loginInProgress
        };
    }

    /**
     * Get component-specific health issues
     */
    getHealthIssues() {
        const issues = [];
        
        if (this.isAuthenticated && !this.currentUser) {
            issues.push('Authenticated but no user data');
        }
        
        if (this.isAuthenticated && !this.authToken) {
            issues.push('Authenticated but no auth token');
        }
        
        if (this.authToken && this.getSessionTimeLeft() < 300000) { // Less than 5 minutes
            issues.push('Token expires soon');
        }
        
        if (this.loginInProgress && (Date.now() - this.lastLoginAttempt) > 30000) {
            issues.push('Login appears stuck in progress');
        }
        
        return issues;
    }

    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear timers
        if (this.refreshTokenTimer) {
            this.clearTimeout(this.refreshTokenTimer);
        }
        
        if (this.sessionCheckInterval) {
            this.clearInterval(this.sessionCheckInterval);
        }
        
        // Clear sensitive data
        this.authToken = null;
        this.currentUser = null;
        this.csrfToken = null;
        
        this.log('Authentication Manager destroyed and cleaned up');
    }
}

// Export the component
export default AuthenticationManagerComponent;

/**
 * Factory function to create authentication manager instance
 */
export function createAuthenticationManager(app) {
    return new AuthenticationManagerComponent(app);
}