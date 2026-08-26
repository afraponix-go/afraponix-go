// Form Validation Component
// Handles all form validation logic, password strength checking, and field validation

/**
 * Form Validation Component Class
 * Manages comprehensive form validation across the application
 * Extracts validation logic from main application class
 */
export class FormValidationComponent {
    constructor(app) {
        this.app = app;
        this.validationRules = {};
        this.fieldValidators = {};
        
        // Initialize validation patterns
        this.initializeValidationRules();
        
        console.log('✅ Form Validation Component initialized');
    }

    /**
     * Initialize validation rules and patterns
     */
    initializeValidationRules() {
        // Username validation pattern
        this.validationRules.username = {
            pattern: /^[a-zA-Z0-9_]{3,20}$/,
            message: 'Username must be 3-20 characters, letters, numbers, and underscores only'
        };
        
        // Email validation pattern
        this.validationRules.email = {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        };
        
        // Password validation requirements
        this.validationRules.password = {
            requirements: {
                length: { test: (pwd) => pwd.length >= 8, message: 'At least 8 characters' },
                uppercase: { test: (pwd) => /[A-Z]/.test(pwd), message: 'At least one uppercase letter' },
                lowercase: { test: (pwd) => /[a-z]/.test(pwd), message: 'At least one lowercase letter' },
                number: { test: (pwd) => /\d/.test(pwd), message: 'At least one number' },
                special: { test: (pwd) => /[!@#$%^&*]/.test(pwd), message: 'At least one special character (!@#$%^&*)' }
            }
        };

        // Form field validation rules
        this.validationRules.forms = {
            plant: {
                required: ['grow_bed_id', 'crop_type', 'count'],
                message: 'Please fill in all required fields.'
            },
            harvest: {
                required: ['grow_bed_id', 'crop_type', 'harvest_weight'],
                message: 'Please fill in all required fields.'
            },
            fish: {
                required: ['tank_id', 'species', 'count'],
                message: 'Please fill in all required fields'
            },
            waterQuality: {
                required: ['ph', 'temperature'],
                message: 'Please fill in all required fields'
            },
            batchMove: {
                required: ['batch_id', 'target_grow_bed_id'],
                message: 'Please fill in all fields including batch selection'
            }
        };
    }

    /**
     * Setup password validation with real-time feedback
     * Complexity: 18, Lines: 25
     * Extracted from script.js setupPasswordValidation function
     */
    setupPasswordValidation() {
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const usernameInput = document.getElementById('register-username');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.validatePassword());
            passwordInput.addEventListener('focus', () => this.showPasswordRequirements());
        }
        
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }
        
        if (usernameInput) {
            // Add username availability checking with debounce
            let usernameTimeout;
            usernameInput.addEventListener('input', () => {
                clearTimeout(usernameTimeout);
                usernameTimeout = setTimeout(() => this.checkUsernameAvailability(), 500);
            });
        }
    }

    /**
     * Validate password strength with real-time UI feedback
     * Complexity: 22, Lines: 28
     * Extracted from script.js validatePassword function
     */
    validatePassword() {
        const passwordInput = document.getElementById('register-password');
        if (!passwordInput) return false;
        
        const password = passwordInput.value;
        const requirements = this.validationRules.password.requirements;
        
        // Check all requirements
        const results = {};
        for (const [key, requirement] of Object.entries(requirements)) {
            results[key] = requirement.test(password);
        }

        // Update requirement indicators
        this.updateRequirement('req-length', results.length);
        this.updateRequirement('req-uppercase', results.uppercase);
        this.updateRequirement('req-lowercase', results.lowercase);
        this.updateRequirement('req-number', results.number);
        this.updateRequirement('req-special', results.special);

        // Calculate strength
        const metCount = Object.values(results).filter(met => met).length;
        const strength = this.calculatePasswordStrength(metCount, password);
        
        this.updatePasswordStrength(strength);
        this.validatePasswordMatch(); // Also check match when password changes
        
        return Object.values(results).every(met => met);
    }

    /**
     * Update individual password requirement indicator
     */
    updateRequirement(elementId, met) {
        const element = document.getElementById(elementId);
        if (element) {
            const icon = element.querySelector('.req-icon');
            if (met) {
                element.classList.add('met');
                if (icon) icon.textContent = '✓';
            } else {
                element.classList.remove('met');
                if (icon) icon.textContent = '✗';
            }
        }
    }

    /**
     * Calculate password strength score
     */
    calculatePasswordStrength(metCount, password) {
        let score = metCount * 20; // Base score from requirements
        
        // Bonus points for length beyond minimum
        if (password.length > 12) score += 10;
        if (password.length > 16) score += 10;
        
        // Bonus for character variety
        const uniqueChars = new Set(password).size;
        if (uniqueChars > 8) score += 5;
        if (uniqueChars > 12) score += 5;
        
        return Math.min(100, score);
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(strength) {
        const strengthBar = document.getElementById('password-strength-bar');
        const strengthText = document.getElementById('password-strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        // Update progress bar
        strengthBar.style.width = `${strength}%`;
        
        // Update colors and text based on strength
        if (strength < 40) {
            strengthBar.className = 'strength-bar weak';
            strengthText.textContent = 'Weak';
        } else if (strength < 70) {
            strengthBar.className = 'strength-bar medium';
            strengthText.textContent = 'Medium';
        } else if (strength < 90) {
            strengthBar.className = 'strength-bar strong';
            strengthText.textContent = 'Strong';
        } else {
            strengthBar.className = 'strength-bar very-strong';
            strengthText.textContent = 'Very Strong';
        }
    }

    /**
     * Validate password confirmation match
     * Complexity: 15, Lines: 33
     * Extracted from script.js validatePasswordMatch function
     */
    validatePasswordMatch() {
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const matchIndicator = document.getElementById('password-match');
        
        if (!passwordInput || !confirmPasswordInput || !matchIndicator) return;
        
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword.length === 0) {
            matchIndicator.style.display = 'none';
            return;
        }
        
        const isMatch = password === confirmPassword;
        const matchIcon = matchIndicator.querySelector('.match-icon');
        const matchText = matchIndicator.querySelector('.match-text');
        
        matchIndicator.style.display = 'flex';
        matchIndicator.className = 'password-match';
        
        if (isMatch) {
            matchIndicator.classList.add('match');
            if (matchIcon) matchIcon.textContent = '✓';
            if (matchText) matchText.textContent = 'Passwords match';
        } else {
            matchIndicator.classList.add('mismatch');
            if (matchIcon) matchIcon.textContent = '✗';
            if (matchText) matchText.textContent = 'Passwords do not match';
        }
        
        return isMatch;
    }

    /**
     * Show password requirements panel
     */
    showPasswordRequirements() {
        const requirements = document.querySelector('.password-requirements');
        if (requirements) {
            requirements.style.display = 'block';
        }
    }

    /**
     * Validate username format
     * Complexity: 4, Lines: 4
     * Extracted from script.js isValidUsername function
     */
    isValidUsername(username) {
        return this.validationRules.username.pattern.test(username);
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        return this.validationRules.email.pattern.test(email);
    }

    /**
     * Check username availability with debouncing
     */
    async checkUsernameAvailability() {
        const usernameInput = document.getElementById('register-username');
        const availabilityIndicator = document.getElementById('username-availability');
        
        if (!usernameInput || !availabilityIndicator) return;
        
        const username = usernameInput.value.trim();
        
        // Clear indicator if username is too short
        if (username.length < 3) {
            availabilityIndicator.style.display = 'none';
            return;
        }
        
        // Validate format first
        if (!this.isValidUsername(username)) {
            this.showUsernameAvailability(false, 'Invalid format');
            return;
        }
        
        try {
            // Show checking state
            availabilityIndicator.style.display = 'flex';
            availabilityIndicator.className = 'username-availability checking';
            availabilityIndicator.innerHTML = '<span class="availability-icon">⏳</span><span class="availability-text">Checking...</span>';
            
            // Check availability via API
            const response = await this.app.makeApiCall(`/auth/check-username/${username}`);
            const isAvailable = response.available;
            
            this.showUsernameAvailability(isAvailable, isAvailable ? 'Available' : 'Username taken');
            
        } catch (error) {
            console.error('Error checking username availability:', error);
            this.showUsernameAvailability(false, 'Unable to check availability');
        }
    }

    /**
     * Show username availability status
     */
    showUsernameAvailability(isAvailable, message) {
        const availabilityIndicator = document.getElementById('username-availability');
        if (!availabilityIndicator) return;
        
        availabilityIndicator.style.display = 'flex';
        availabilityIndicator.className = `username-availability ${isAvailable ? 'available' : 'unavailable'}`;
        
        const icon = isAvailable ? '✓' : '✗';
        availabilityIndicator.innerHTML = `<span class="availability-icon">${icon}</span><span class="availability-text">${message}</span>`;
    }

    /**
     * Validate form data based on form type
     * Complexity: 12, Lines: 20
     * Consolidated validation for different form types
     */
    validateForm(formType, data) {
        const rules = this.validationRules.forms[formType];
        if (!rules) {
            console.warn(`No validation rules found for form type: ${formType}`);
            return { valid: true };
        }
        
        const errors = [];
        const missing = [];
        
        // Check required fields
        for (const field of rules.required) {
            if (!data[field] || data[field] === '' || data[field] === null || data[field] === undefined) {
                // Special handling for numeric fields that can be 0
                if (field === 'plants_harvested' && data[field] === 0) {
                    continue; // 0 is valid for plants_harvested in fruit-only harvests
                }
                missing.push(field);
            }
        }
        
        if (missing.length > 0) {
            errors.push(rules.message);
            return { 
                valid: false, 
                errors, 
                missingFields: missing,
                message: rules.message 
            };
        }
        
        return { valid: true };
    }

    /**
     * Validate plant entry form data
     */
    validatePlantEntry(data) {
        return this.validateForm('plant', data);
    }

    /**
     * Validate harvest form data
     */
    validateHarvestEntry(data) {
        return this.validateForm('harvest', data);
    }

    /**
     * Validate fish entry form data
     */
    validateFishEntry(data) {
        return this.validateForm('fish', data);
    }

    /**
     * Validate water quality form data
     */
    validateWaterQuality(data) {
        return this.validateForm('waterQuality', data);
    }

    /**
     * Validate batch move form data
     */
    validateBatchMove(data) {
        return this.validateForm('batchMove', data);
    }

    /**
     * Generic field validation with custom rules
     */
    validateField(fieldName, value, customRules = {}) {
        const errors = [];
        
        // Required field check
        if (customRules.required && (!value || value === '')) {
            errors.push(`${fieldName} is required`);
            return { valid: false, errors };
        }
        
        // Length validation
        if (customRules.minLength && value.length < customRules.minLength) {
            errors.push(`${fieldName} must be at least ${customRules.minLength} characters`);
        }
        
        if (customRules.maxLength && value.length > customRules.maxLength) {
            errors.push(`${fieldName} must be no more than ${customRules.maxLength} characters`);
        }
        
        // Pattern validation
        if (customRules.pattern && !customRules.pattern.test(value)) {
            errors.push(customRules.patternMessage || `${fieldName} format is invalid`);
        }
        
        // Range validation for numbers
        if (customRules.min !== undefined && parseFloat(value) < customRules.min) {
            errors.push(`${fieldName} must be at least ${customRules.min}`);
        }
        
        if (customRules.max !== undefined && parseFloat(value) > customRules.max) {
            errors.push(`${fieldName} must be no more than ${customRules.max}`);
        }
        
        return { valid: errors.length === 0, errors };
    }

    /**
     * Show validation error message
     */
    showValidationError(message, type = 'warning') {
        if (this.app.showNotification) {
            this.app.showNotification(message, type);
        } else {
            console.warn('Validation error:', message);
        }
    }

    /**
     * Clear validation indicators for a form
     */
    clearValidationErrors(formSelector) {
        const form = document.querySelector(formSelector);
        if (form) {
            // Clear error classes
            form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            
            // Clear error messages
            form.querySelectorAll('.error-message').forEach(el => el.remove());
        }
    }

    /**
     * Highlight validation errors on form fields
     */
    highlightValidationErrors(formSelector, missingFields) {
        const form = document.querySelector(formSelector);
        if (!form || !missingFields) return;
        
        missingFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                field.classList.add('error');
                
                // Add error message if not already present
                const existingError = field.parentElement.querySelector('.error-message');
                if (!existingError) {
                    const errorMessage = document.createElement('span');
                    errorMessage.className = 'error-message';
                    errorMessage.textContent = 'This field is required';
                    field.parentElement.appendChild(errorMessage);
                }
            }
        });
    }

    /**
     * Toggle password visibility
     * Utility function for password fields
     */
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const button = input.parentElement.querySelector('.password-toggle');
        const icon = button ? button.querySelector('.password-toggle-icon') : null;
        
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.src = 'icons/new-icons/Afraponix Go Icons_close.svg';
                icon.alt = 'Hide';
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.src = 'icons/new-icons/Afraponix Go Icons_view.svg';
                icon.alt = 'Show';
            }
        }
    }

    /**
     * Add validation rules for a specific form
     */
    addFormValidationRules(formType, rules) {
        this.validationRules.forms[formType] = rules;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            validationRules: Object.keys(this.validationRules.forms).length,
            passwordRequirements: Object.keys(this.validationRules.password.requirements).length,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Form Validation component');
        this.validationRules = {};
        this.fieldValidators = {};
    }
}

// Export both class and create a factory function
export default FormValidationComponent;

/**
 * Factory function to create form validation component
 */
export function createFormValidationComponent(app) {
    return new FormValidationComponent(app);
}