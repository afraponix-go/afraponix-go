// Form Utilities
// Standardized form handling, validation, and state management

import { handleValidationError } from './errorHandler.js';
import { withFormLoading } from './loadingManager.js';

/**
 * Form Utils Class
 * Provides consistent form handling patterns
 */
export class FormUtils {
    constructor(options = {}) {
        this.options = {
            validateOnBlur: true,
            validateOnInput: false,
            showInlineErrors: true,
            clearErrorsOnFocus: true,
            enableAutoSave: false,
            debounceValidation: 300,
            ...options
        };
        
        this.forms = new Map();
        this.validationRules = new Map();
        this.validationStats = {
            totalValidations: 0,
            passedValidations: 0,
            failedValidations: 0
        };
        
        console.log('📝 Form Utils initialized');
    }

    /**
     * Register form with validation rules
     */
    registerForm(formElement, rules = {}, options = {}) {
        const formId = formElement.id || this.generateFormId();
        
        const formConfig = {
            id: formId,
            element: formElement,
            rules,
            options: { ...this.options, ...options },
            errors: new Map(),
            isValid: true,
            isDirty: false,
            isSubmitting: false,
            originalValues: this.captureFormValues(formElement)
        };
        
        this.forms.set(formId, formConfig);
        this.validationRules.set(formId, rules);
        
        // Set up event listeners
        this.setupFormEventListeners(formConfig);
        
        console.log(`✅ Form registered: ${formId}`);
        return formId;
    }

    /**
     * Set up event listeners for form
     */
    setupFormEventListeners(formConfig) {
        const { element, options } = formConfig;
        
        // Form submission
        element.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit(formConfig, e);
        });
        
        // Input validation
        const inputs = element.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Validation on blur
            if (options.validateOnBlur) {
                input.addEventListener('blur', () => {
                    this.validateField(formConfig.id, input.name || input.id);
                });
            }
            
            // Validation on input (debounced)
            if (options.validateOnInput) {
                let timeoutId;
                input.addEventListener('input', () => {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        this.validateField(formConfig.id, input.name || input.id);
                    }, options.debounceValidation);
                });
            }
            
            // Clear errors on focus
            if (options.clearErrorsOnFocus) {
                input.addEventListener('focus', () => {
                    this.clearFieldError(formConfig.id, input.name || input.id);
                });
            }
            
            // Track dirty state
            input.addEventListener('input', () => {
                formConfig.isDirty = true;
            });
        });
        
        // Auto-save if enabled
        if (options.enableAutoSave) {
            let autoSaveTimeout;
            element.addEventListener('input', () => {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    this.autoSaveForm(formConfig.id);
                }, options.autoSaveDelay || 2000);
            });
        }
    }

    /**
     * Validate entire form
     */
    validateForm(formId) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) {
            console.warn(`Form not found: ${formId}`);
            return false;
        }
        
        this.validationStats.totalValidations++;
        
        const { element, rules } = formConfig;
        const formData = new FormData(element);
        const errors = new Map();
        let isValid = true;
        
        // Validate each field
        for (const [fieldName, fieldRules] of Object.entries(rules)) {
            const fieldValue = formData.get(fieldName) || '';
            const fieldErrors = this.validateFieldValue(fieldValue, fieldRules, fieldName);
            
            if (fieldErrors.length > 0) {
                errors.set(fieldName, fieldErrors);
                isValid = false;
            }
        }
        
        // Custom form-level validation
        if (rules._formValidation && typeof rules._formValidation === 'function') {
            const formErrors = rules._formValidation(formData);
            if (formErrors && formErrors.length > 0) {
                errors.set('_form', formErrors);
                isValid = false;
            }
        }
        
        // Update form state
        formConfig.errors = errors;
        formConfig.isValid = isValid;
        
        // Display errors
        if (formConfig.options.showInlineErrors) {
            this.displayFormErrors(formConfig);
        }
        
        // Update stats
        if (isValid) {
            this.validationStats.passedValidations++;
        } else {
            this.validationStats.failedValidations++;
        }
        
        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(formId, fieldName) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return false;
        
        const rules = this.validationRules.get(formId);
        if (!rules[fieldName]) return true;
        
        const input = formConfig.element.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!input) return true;
        
        const fieldValue = input.value || '';
        const fieldErrors = this.validateFieldValue(fieldValue, rules[fieldName], fieldName);
        
        if (fieldErrors.length > 0) {
            formConfig.errors.set(fieldName, fieldErrors);
            this.displayFieldError(formConfig, fieldName, fieldErrors);
            return false;
        } else {
            formConfig.errors.delete(fieldName);
            this.clearFieldError(formId, fieldName);
            return true;
        }
    }

    /**
     * Validate field value against rules
     */
    validateFieldValue(value, rules, fieldName) {
        const errors = [];
        
        // Required validation
        if (rules.required && (!value || value.trim() === '')) {
            errors.push(`${this.formatFieldName(fieldName)} is required`);
            return errors; // Stop validation if required field is empty
        }
        
        // Skip other validations if field is empty and not required
        if (!value || value.trim() === '') {
            return errors;
        }
        
        // Type validation
        if (rules.type) {
            switch (rules.type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        errors.push('Please enter a valid email address');
                    }
                    break;
                case 'url':
                    if (!this.isValidUrl(value)) {
                        errors.push('Please enter a valid URL');
                    }
                    break;
                case 'number':
                    if (isNaN(value) || isNaN(parseFloat(value))) {
                        errors.push('Please enter a valid number');
                    }
                    break;
                case 'integer':
                    if (!Number.isInteger(parseFloat(value))) {
                        errors.push('Please enter a valid integer');
                    }
                    break;
                case 'phone':
                    if (!this.isValidPhone(value)) {
                        errors.push('Please enter a valid phone number');
                    }
                    break;
            }
        }
        
        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Must be at least ${rules.minLength} characters long`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Must be no more than ${rules.maxLength} characters long`);
        }
        
        // Numeric validation
        if (rules.min !== undefined) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue < rules.min) {
                errors.push(`Must be at least ${rules.min}`);
            }
        }
        
        if (rules.max !== undefined) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > rules.max) {
                errors.push(`Must be no more than ${rules.max}`);
            }
        }
        
        // Pattern validation
        if (rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
                errors.push(rules.patternMessage || 'Invalid format');
            }
        }
        
        // Custom validation
        if (rules.custom && typeof rules.custom === 'function') {
            const customResult = rules.custom(value, fieldName);
            if (customResult !== true) {
                errors.push(customResult || 'Invalid value');
            }
        }
        
        // Match field validation (for password confirmation, etc.)
        if (rules.matches) {
            const matchField = document.querySelector(`[name="${rules.matches}"], #${rules.matches}`);
            if (matchField && value !== matchField.value) {
                errors.push(`Must match ${this.formatFieldName(rules.matches)}`);
            }
        }
        
        return errors;
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(formConfig, event) {
        if (formConfig.isSubmitting) {
            return;
        }
        
        formConfig.isSubmitting = true;
        
        try {
            // Validate form
            const isValid = this.validateForm(formConfig.id);
            
            if (!isValid) {
                handleValidationError(
                    Array.from(formConfig.errors.values()).flat(),
                    { form: formConfig.id }
                );
                return;
            }
            
            // Get form data
            const formData = new FormData(formConfig.element);
            const submitHandler = formConfig.element.dataset.submitHandler;
            
            // Call custom submit handler if specified
            if (submitHandler && window[submitHandler]) {
                await withFormLoading(formConfig.element, async () => {
                    await window[submitHandler](formData, event);
                })();
            } else if (formConfig.options.onSubmit) {
                await withFormLoading(formConfig.element, async () => {
                    await formConfig.options.onSubmit(formData, event);
                })();
            } else {
                console.warn(`No submit handler found for form: ${formConfig.id}`);
            }
            
            // Mark as clean after successful submission
            formConfig.isDirty = false;
            
        } catch (error) {
            console.error('Form submission error:', error);
            throw error;
        } finally {
            formConfig.isSubmitting = false;
        }
    }

    /**
     * Display form errors
     */
    displayFormErrors(formConfig) {
        // Clear existing errors first
        this.clearAllFieldErrors(formConfig.id);
        
        // Display field errors
        for (const [fieldName, errors] of formConfig.errors) {
            if (fieldName !== '_form') {
                this.displayFieldError(formConfig, fieldName, errors);
            }
        }
        
        // Display form-level errors
        const formErrors = formConfig.errors.get('_form');
        if (formErrors && formErrors.length > 0) {
            this.displayFormLevelErrors(formConfig, formErrors);
        }
    }

    /**
     * Display field error
     */
    displayFieldError(formConfig, fieldName, errors) {
        const input = formConfig.element.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!input) return;
        
        // Add error class to input
        input.classList.add('error');
        
        // Create or update error message
        let errorElement = input.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            input.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = Array.isArray(errors) ? errors[0] : errors;
        
        // Apply error styles
        errorElement.style.cssText = `
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
        `;
        
        input.style.borderColor = '#dc3545';
    }

    /**
     * Clear field error
     */
    clearFieldError(formId, fieldName) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return;
        
        const input = formConfig.element.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!input) return;
        
        // Remove error class and styles
        input.classList.remove('error');
        input.style.borderColor = '';
        
        // Remove error message
        const errorElement = input.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
        
        // Remove from errors map
        formConfig.errors.delete(fieldName);
    }

    /**
     * Clear all field errors
     */
    clearAllFieldErrors(formId) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return;
        
        const errorElements = formConfig.element.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());
        
        const errorInputs = formConfig.element.querySelectorAll('.error');
        errorInputs.forEach(input => {
            input.classList.remove('error');
            input.style.borderColor = '';
        });
        
        formConfig.errors.clear();
    }

    /**
     * Display form-level errors
     */
    displayFormLevelErrors(formConfig, errors) {
        let errorContainer = formConfig.element.querySelector('.form-errors');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'form-errors';
            formConfig.element.insertBefore(errorContainer, formConfig.element.firstChild);
        }
        
        errorContainer.innerHTML = `
            <div class="error-list">
                ${errors.map(error => `<div class="error-item">${error}</div>`).join('')}
            </div>
        `;
        
        // Apply styles
        errorContainer.style.cssText = `
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 0.375rem;
            color: #721c24;
            padding: 0.75rem;
            margin-bottom: 1rem;
        `;
    }

    /**
     * Auto-save form data
     */
    async autoSaveForm(formId) {
        const formConfig = this.forms.get(formId);
        if (!formConfig || !formConfig.isDirty) return;
        
        try {
            const formData = new FormData(formConfig.element);
            const autoSaveHandler = formConfig.options.onAutoSave;
            
            if (autoSaveHandler) {
                await autoSaveHandler(formData);
                console.log(`💾 Auto-saved form: ${formId}`);
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Get form data as object
     */
    getFormData(formId) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return null;
        
        const formData = new FormData(formConfig.element);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    /**
     * Set form data
     */
    setFormData(formId, data) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return false;
        
        for (const [fieldName, value] of Object.entries(data)) {
            const input = formConfig.element.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (input) {
                input.value = value;
            }
        }
        
        return true;
    }

    /**
     * Reset form to original values
     */
    resetForm(formId) {
        const formConfig = this.forms.get(formId);
        if (!formConfig) return false;
        
        formConfig.element.reset();
        this.clearAllFieldErrors(formId);
        formConfig.isDirty = false;
        
        return true;
    }

    /**
     * Check if form is dirty
     */
    isFormDirty(formId) {
        const formConfig = this.forms.get(formId);
        return formConfig ? formConfig.isDirty : false;
    }

    /**
     * Utility validation methods
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    /**
     * Format field name for display
     */
    formatFieldName(fieldName) {
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ');
    }

    /**
     * Capture form values
     */
    captureFormValues(formElement) {
        const formData = new FormData(formElement);
        const values = {};
        
        for (const [key, value] of formData.entries()) {
            values[key] = value;
        }
        
        return values;
    }

    /**
     * Generate form ID
     */
    generateFormId() {
        return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        const successRate = this.validationStats.totalValidations > 0 ?
            (this.validationStats.passedValidations / this.validationStats.totalValidations * 100).toFixed(1) + '%' :
            '0%';
            
        return {
            ...this.validationStats,
            successRate,
            activeForms: this.forms.size
        };
    }

    /**
     * Unregister form
     */
    unregisterForm(formId) {
        const formConfig = this.forms.get(formId);
        if (formConfig) {
            this.clearAllFieldErrors(formId);
            this.forms.delete(formId);
            this.validationRules.delete(formId);
            console.log(`✅ Form unregistered: ${formId}`);
            return true;
        }
        return false;
    }
}

// Create global form utils instance
const formUtils = new FormUtils();

// Utility functions
export const registerForm = (element, rules, options) => formUtils.registerForm(element, rules, options);
export const validateForm = (formId) => formUtils.validateForm(formId);
export const validateField = (formId, fieldName) => formUtils.validateField(formId, fieldName);
export const getFormData = (formId) => formUtils.getFormData(formId);
export const setFormData = (formId, data) => formUtils.setFormData(formId, data);
export const resetForm = (formId) => formUtils.resetForm(formId);
export const isFormDirty = (formId) => formUtils.isFormDirty(formId);

// Export the instance as default
export default formUtils;