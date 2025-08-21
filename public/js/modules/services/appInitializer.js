// App Initializer Service
// Handles application initialization, auth checks, and startup logic

import { StorageUtils } from '../utils/index.js';

/**
 * Application Initializer Service
 * Manages startup sequence, authentication, and initial state setup
 */
export default class AppInitializer {
    constructor(app) {
        this.app = app;
        this.loginInProgress = false;
        this.lastLoginAttempt = 0;
    }

    /**
     * Initialize the complete application
     */
    async initialize() {
        console.log('🚀 Initializing Afraponix Go application...');
        
        try {
            // Check authentication status first
            await this.checkAuthStatus();
            
            // Handle any URL-based authentication (email verification, etc.)
            await this.handleEmailVerificationUrl();
            
            // Show appropriate UI based on auth status
            if (this.app.token && this.app.user) {
                this.showAppUI();
                console.log('✅ User authenticated, showing app interface');
            } else {
                this.showAuthUI();
                console.log('🔐 No authentication, showing login interface');
            }
            
            console.log('✅ Application initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showAuthUI();
            return false;
        }
    }

    /**
     * Check current authentication status
     */
    async checkAuthStatus() {
        const token = StorageUtils.getItem('auth_token');
        if (!token) {
            console.log('🔍 No auth token found');
            return false;
        }

        try {
            this.app.token = token;
            const response = await this.app.makeApiCall('/auth/verify');
            
            if (response.valid) {
                this.app.user = response.user;
                console.log('✅ Auth token valid, user:', response.user.username);
                return true;
            } else {
                console.log('❌ Auth token invalid');
                StorageUtils.removeItem('auth_token');
                this.app.token = null;
                return false;
            }
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            StorageUtils.removeItem('auth_token');
            this.app.token = null;
            return false;
        }
    }

    /**
     * Handle email verification from URL parameters
     */
    async handleEmailVerificationUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const requestVerification = urlParams.get('request-verification');

        if (requestVerification === 'true') {
            console.log('📧 Email verification requested via URL');
            const email = urlParams.get('email');
            if (email) {
                this.showEmailVerificationMessage(email);
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
        }

        if (token) {
            console.log('🔐 Processing email verification token...');
            try {
                const response = await this.app.makeApiCall('/auth/verify-email', {
                    method: 'POST',
                    body: JSON.stringify({ token })
                });

                if (response.verified) {
                    this.app.showNotification('✅ Email verified successfully! You can now log in.', 'success');
                    this.app.token = response.token;
                    StorageUtils.setItem('auth_token', response.token);
                    this.app.user = response.user;
                    
                    // Clear URL parameters and show app
                    window.history.replaceState({}, document.title, window.location.pathname);
                    this.showAppUI();
                } else {
                    this.app.showNotification('❌ Email verification failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('❌ Email verification error:', error);
                this.app.showNotification('❌ Email verification failed. Please try again.', 'error');
            }
            return;
        }
    }

    /**
     * Show authentication UI (login/register forms)
     */
    showAuthUI() {
        console.log('🔐 Displaying authentication interface');
        
        // Hide app interface
        const appInterface = document.getElementById('app');
        if (appInterface) appInterface.style.display = 'none';
        
        // Show landing page with auth forms
        const landingPage = document.getElementById('landing-page');
        if (landingPage) landingPage.style.display = 'block';
        
        // Hide admin settings if visible
        const adminBtn = document.getElementById('admin-settings-btn');
        if (adminBtn) adminBtn.style.display = 'none';
        
        // Hide bottom navigation
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';
        
        this.hideAllAuthForms();
        this.showLoginForm();
    }

    /**
     * Show main application UI after successful authentication
     */
    showAppUI() {
        console.log('🎯 Displaying application interface');
        
        // Show app interface
        const appInterface = document.getElementById('app');
        if (appInterface) appInterface.style.display = 'block';
        
        // Hide landing page
        const landingPage = document.getElementById('landing-page');
        if (landingPage) landingPage.style.display = 'none';
        
        // Show admin settings if user is admin
        if (this.app.user && (this.app.user.user_role === 'admin' || this.app.user.userRole === 'admin')) {
            const adminSettingsTab = document.getElementById('admin-settings-btn');
            if (adminSettingsTab) {
                adminSettingsTab.style.display = 'block';
            }
        }
        
        // Show bottom navigation
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'flex';
        
        // Initialize the main app view
        this.app.setCurrentView('dashboard');
        this.app.isLoading = false;
    }

    /**
     * Handle user login
     */
    async login(username, password) {
        const now = Date.now();
        if (this.lastLoginAttempt && (now - this.lastLoginAttempt) < 3000) {
            throw new Error('Please wait before trying again');
        }

        this.loginInProgress = true;
        this.lastLoginAttempt = now;

        try {
            const response = await this.app.makeApiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.token) {
                this.app.token = response.token;
                this.app.user = response.user;
                StorageUtils.setItem('auth_token', response.token);
                
                this.showAppUI();
                this.app.showNotification(`Welcome back, ${response.user.username}!`, 'success');
                
                return response;
            } else {
                throw new Error('Login failed: No token received');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            
            if (error.message.includes('Email not verified') || error.response?.needsVerification) {
                const email = error.response?.email || username;
                if (email) {
                    this.showEmailVerificationMessage(email);
                }
                throw new Error('Please verify your email before logging in');
            }
            
            throw error;
        } finally {
            this.loginInProgress = false;
        }
    }

    /**
     * Handle user registration
     */
    async register(username, email, password, firstName, lastName) {
        try {
            const response = await this.app.makeApiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password, firstName, lastName })
            });

            if (response.needsVerification) {
                this.showEmailVerificationMessage(email);
                return response;
            } else {
                if (this.app.token) {
                    this.app.user = response.user;
                    this.showAppUI();
                    this.app.showNotification(`Welcome, ${response.user.username}!`, 'success');
                }
                return response;
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    /**
     * Handle user logout
     */
    async logout() {
        console.log('👋 Logging out user');
        
        try {
            await this.app.makeApiCall('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('⚠️ Logout API call failed:', error);
        }

        // Clear local state
        this.app.token = null;
        this.app.user = null;
        this.app.activeSystemId = null;
        StorageUtils.removeItem('auth_token');
        StorageUtils.removeItem('activeSystemId');
        
        // Hide admin elements
        const adminBtn = document.getElementById('admin-settings-btn');
        if (adminBtn) adminBtn.style.display = 'none';
        
        const smtpSection = document.getElementById('smtp-configuration');
        if (smtpSection) smtpSection.style.display = 'none';
        
        // Show authentication UI
        this.showAuthUI();
        this.app.showNotification('Logged out successfully', 'info');
    }

    // Helper methods for form management
    hideAllAuthForms() {
        const forms = ['login-panel', 'register-panel', 'forgot-password-panel'];
        forms.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    showLoginForm() {
        this.hideAllAuthForms();
        const loginPanel = document.getElementById('login-panel');
        if (loginPanel) loginPanel.style.display = 'block';
    }

    showEmailVerificationMessage(email) {
        console.log('📧 Showing email verification message for:', email);
        
        const loginPanel = document.getElementById('login-panel');
        if (!loginPanel) return;

        const existingMessage = loginPanel.querySelector('.verification-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'verification-message';
        messageDiv.innerHTML = `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center;">
                <div style="color: #1976d2; font-weight: 600; margin-bottom: 8px;">
                    📧 Email Verification Required
                </div>
                <div style="color: #424242; font-size: 14px; line-height: 1.4;">
                    We've sent a verification email to <strong>${email}</strong><br>
                    Please check your email and click the verification link to complete your account setup.
                </div>
                <button 
                    onclick="app.initializer.showResendVerification('${email}')" 
                    style="background: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer; font-size: 13px;">
                    Resend Verification Email
                </button>
            </div>
        `;

        loginPanel.insertBefore(messageDiv, loginPanel.firstChild);
    }

    async showResendVerification(email) {
        try {
            await this.app.makeApiCall('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            this.app.showNotification('✅ Verification email sent! Please check your inbox.', 'success');
        } catch (error) {
            console.error('❌ Resend verification error:', error);
            
            if (error.message.includes('already verified')) {
                this.app.showNotification('✅ Your email is already verified! You can log in now.', 'success');
                const messageDiv = document.querySelector('.verification-message');
                if (messageDiv) messageDiv.remove();
            } else {
                this.app.showNotification('❌ Failed to send verification email. Please try again.', 'error');
            }
        }
    }
}