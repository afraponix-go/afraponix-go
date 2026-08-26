// Nutrient Form Component
// Handles form management for ratio rules and environmental adjustments

import { 
    SELECTORS, 
    CSS_CLASSES,
    MESSAGE_TYPES,
    VALIDATION_RULES 
} from '../../constants/nutrientConstants.js';

/**
 * Nutrient Form Component
 * Manages form interactions, validation, and submissions
 */
export default class NutrientForm {
    constructor(calculator, validation) {
        this.calculator = calculator;
        this.validation = validation;
        
        // Form state
        this.currentEditingRule = null;
        this.currentEditingAdjustment = null;
        this.formStates = {
            ratioRule: 'add', // 'add' or 'edit'
            environmentalAdjustment: 'add'
        };
        
        // Form statistics
        this.formStats = {
            formsSubmitted: 0,
            validationErrors: 0,
            successfulSubmissions: 0
        };
        
        console.log('📝 Nutrient Form Component initialized');
    }

    /**
     * Initialize form component
     */
    async initialize() {
        console.log('🔄 Initializing Nutrient Form...');
        
        try {
            this.setupEventListeners();
            await this.populateModalDropdowns();
            console.log('✅ Nutrient Form initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Nutrient Form:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for form interactions
     */
    setupEventListeners() {
        // Modal buttons
        const addRuleBtn = document.querySelector(SELECTORS.ADD_RATIO_RULE);
        const addAdjustmentBtn = document.querySelector(SELECTORS.ADD_ENV_ADJUSTMENT);
        
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => this.showRatioRuleModal());
        }
        
        if (addAdjustmentBtn) {
            addAdjustmentBtn.addEventListener('click', () => this.showEnvAdjustmentModal());
        }

        // Form submissions
        const ratioRuleForm = document.querySelector(SELECTORS.RATIO_RULE_FORM);
        const envAdjustmentForm = document.querySelector(SELECTORS.ENV_ADJUSTMENT_FORM);
        
        if (ratioRuleForm) {
            ratioRuleForm.addEventListener('submit', (e) => this.handleRatioRuleSubmit(e));
        }
        
        if (envAdjustmentForm) {
            envAdjustmentForm.addEventListener('submit', (e) => this.handleEnvironmentalAdjustmentSubmit(e));
        }

        // Modal close handlers
        this.setupModalCloseHandlers();
        
        // Form validation on input change
        this.setupRealTimeValidation();
    }

    /**
     * Set up modal close handlers
     */
    setupModalCloseHandlers() {
        // Close buttons
        document.querySelectorAll('[data-modal-close]').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal-close');
                this.closeModal(modalId);
            });
        });

        // Background click to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Set up real-time form validation
     */
    setupRealTimeValidation() {
        // Ratio rule form validation
        const ratioInput = document.getElementById('rule-ratio');
        const multiplierInput = document.getElementById('rule-multiplier');
        
        if (ratioInput) {
            ratioInput.addEventListener('blur', () => this.validateRatioField(ratioInput));
            ratioInput.addEventListener('input', () => this.clearFieldError(ratioInput));
        }
        
        if (multiplierInput) {
            multiplierInput.addEventListener('blur', () => this.validateMultiplierField(multiplierInput));
            multiplierInput.addEventListener('input', () => this.clearFieldError(multiplierInput));
        }

        // Environmental adjustment form validation
        const adjustmentInput = document.getElementById('adjustment-multiplier');
        const conditionInput = document.getElementById('adjustment-condition');
        
        if (adjustmentInput) {
            adjustmentInput.addEventListener('blur', () => this.validateAdjustmentField(adjustmentInput));
            adjustmentInput.addEventListener('input', () => this.clearFieldError(adjustmentInput));
        }
        
        if (conditionInput) {
            conditionInput.addEventListener('blur', () => this.validateConditionField(conditionInput));
            conditionInput.addEventListener('input', () => this.clearFieldError(conditionInput));
        }
    }

    // =====================================================
    // MODAL MANAGEMENT
    // =====================================================

    /**
     * Show ratio rule modal for adding or editing
     */
    showRatioRuleModal(rule = null) {
        const modal = document.querySelector(SELECTORS.RATIO_RULE_MODAL);
        if (!modal) {
            console.error('Ratio rule modal not found');
            return;
        }

        this.currentEditingRule = rule;
        this.formStates.ratioRule = rule ? 'edit' : 'add';
        
        // Update modal title
        const title = modal.querySelector('.modal-title');
        if (title) {
            title.textContent = rule ? 'Edit Ratio Rule' : 'Add New Ratio Rule';
        }

        // Populate form fields
        this.populateRatioRuleForm(rule);
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);

        console.log(`📝 Opened ratio rule modal (${this.formStates.ratioRule} mode)`);
    }

    /**
     * Show environmental adjustment modal
     */
    showEnvAdjustmentModal(adjustment = null) {
        const modal = document.querySelector(SELECTORS.ENV_ADJUSTMENT_MODAL);
        if (!modal) {
            console.error('Environmental adjustment modal not found');
            return;
        }

        this.currentEditingAdjustment = adjustment;
        this.formStates.environmentalAdjustment = adjustment ? 'edit' : 'add';
        
        // Update modal title
        const title = modal.querySelector('.modal-title');
        if (title) {
            title.textContent = adjustment ? 'Edit Environmental Adjustment' : 'Add New Environmental Adjustment';
        }

        // Populate form fields
        this.populateEnvironmentalAdjustmentForm(adjustment);
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);

        console.log(`🌡️ Opened environmental adjustment modal (${this.formStates.environmentalAdjustment} mode)`);
    }

    /**
     * Close specific modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.clearFormErrors(modal);
            console.log(`✅ Closed modal: ${modalId}`);
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.clearAllFormErrors();
    }

    // =====================================================
    // FORM POPULATION
    // =====================================================

    /**
     * Populate modal dropdown menus
     */
    async populateModalDropdowns() {
        try {
            await this.populateRatioRuleDropdowns();
            await this.populateEnvironmentalDropdowns();
            console.log('📝 Modal dropdowns populated');
        } catch (error) {
            console.error('Error populating modal dropdowns:', error);
        }
    }

    /**
     * Populate ratio rule form dropdowns
     */
    populateRatioRuleDropdowns() {
        // Nutrients dropdown
        const nutrientSelect = document.querySelector(SELECTORS.RULE_NUTRIENT);
        if (nutrientSelect) {
            nutrientSelect.innerHTML = '<option value="">Select Nutrient</option>';
            this.calculator.nutrients.forEach(nutrient => {
                const option = document.createElement('option');
                option.value = nutrient.code;
                option.textContent = `${nutrient.name} (${nutrient.symbol})`;
                nutrientSelect.appendChild(option);
            });
        }

        // Growth stages dropdown
        const stageSelect = document.querySelector(SELECTORS.RULE_GROWTH_STAGE);
        if (stageSelect) {
            stageSelect.innerHTML = '<option value="">All Stages (General)</option>';
            this.calculator.growthStages.forEach(stage => {
                const option = document.createElement('option');
                option.value = stage.code;
                option.textContent = stage.name;
                stageSelect.appendChild(option);
            });
        }
    }

    /**
     * Populate environmental adjustment dropdowns
     */
    populateEnvironmentalDropdowns() {
        const parameterSelect = document.getElementById('adjustment-parameter');
        if (parameterSelect) {
            parameterSelect.innerHTML = '<option value="">Select Parameter</option>';
            this.calculator.environmentalParameters.forEach(param => {
                const option = document.createElement('option');
                option.value = param.code;
                option.textContent = `${param.name} ${param.unit ? `(${param.unit})` : ''}`;
                parameterSelect.appendChild(option);
            });
        }

        const operatorSelect = document.getElementById('adjustment-operator');
        if (operatorSelect && operatorSelect.children.length <= 1) {
            operatorSelect.innerHTML = `
                <option value="">Select Operator</option>
                <option value="greater_than">Greater Than (>)</option>
                <option value="less_than">Less Than (<)</option>
                <option value="greater_equal">Greater Than or Equal (>=)</option>
                <option value="less_equal">Less Than or Equal (<=)</option>
                <option value="equals">Equals (=)</option>
            `;
        }
    }

    /**
     * Populate ratio rule form with existing data
     */
    populateRatioRuleForm(rule) {
        if (!rule) {
            this.clearRatioRuleForm();
            return;
        }

        // Populate form fields
        const fields = {
            'rule-nutrient': rule.nutrient,
            'rule-growth-stage': rule.growth_stage || '',
            'rule-ratio': rule.ratio,
            'rule-multiplier': rule.multiplier || '',
            'rule-notes': rule.notes || ''
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    }

    /**
     * Populate environmental adjustment form with existing data
     */
    populateEnvironmentalAdjustmentForm(adjustment) {
        if (!adjustment) {
            this.clearEnvironmentalAdjustmentForm();
            return;
        }

        // Populate form fields
        const fields = {
            'adjustment-parameter': adjustment.parameter,
            'adjustment-operator': adjustment.operator || 'equals',
            'adjustment-condition': adjustment.condition,
            'adjustment-multiplier': adjustment.multiplier,
            'adjustment-description': adjustment.description || ''
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    }

    /**
     * Clear ratio rule form
     */
    clearRatioRuleForm() {
        const form = document.querySelector(SELECTORS.RATIO_RULE_FORM);
        if (form) {
            form.reset();
            this.clearFormErrors(form);
        }
    }

    /**
     * Clear environmental adjustment form
     */
    clearEnvironmentalAdjustmentForm() {
        const form = document.querySelector(SELECTORS.ENV_ADJUSTMENT_FORM);
        if (form) {
            form.reset();
            this.clearFormErrors(form);
        }
    }

    // =====================================================
    // FORM SUBMISSION HANDLERS
    // =====================================================

    /**
     * Handle ratio rule form submission
     */
    async handleRatioRuleSubmit(e) {
        e.preventDefault();
        this.formStats.formsSubmitted++;
        
        const form = e.target;
        const formData = new FormData(form);
        const ruleData = Object.fromEntries(formData.entries());
        
        // Add ID if editing
        if (this.currentEditingRule) {
            ruleData.id = this.currentEditingRule.id;
        }

        try {
            // Validate form data
            const validation = this.validation.validateRatioRule(ruleData);
            
            if (!validation.isValid) {
                this.displayFormErrors(form, validation.errors);
                this.formStats.validationErrors++;
                return;
            }

            // Display warnings if any
            if (validation.warnings.length > 0) {
                this.displayFormWarnings(form, validation.warnings);
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;

            // Save ratio rule
            await this.calculator.saveRatioRule(validation.sanitizedData);
            
            // Success
            this.formStats.successfulSubmissions++;
            this.showMessage('Ratio rule saved successfully', MESSAGE_TYPES.SUCCESS);
            
            // Close modal and refresh display
            this.closeModal('ratio-rule-modal');
            
            // Trigger refresh of display component
            if (window.app?.nutrientDisplay) {
                await window.app.nutrientDisplay.refresh();
            }
            
            console.log('✅ Ratio rule saved successfully');
            
        } catch (error) {
            console.error('Error saving ratio rule:', error);
            this.showMessage(error.message || 'Failed to save ratio rule', MESSAGE_TYPES.ERROR);
        } finally {
            // Restore button state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = this.formStates.ratioRule === 'edit' ? 'Update Rule' : 'Add Rule';
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Handle environmental adjustment form submission
     */
    async handleEnvironmentalAdjustmentSubmit(e) {
        e.preventDefault();
        this.formStats.formsSubmitted++;
        
        const form = e.target;
        const formData = new FormData(form);
        const adjustmentData = Object.fromEntries(formData.entries());
        
        // Add ID if editing
        if (this.currentEditingAdjustment) {
            adjustmentData.id = this.currentEditingAdjustment.id;
        }

        try {
            // Validate form data
            const validation = this.validation.validateEnvironmentalAdjustment(adjustmentData);
            
            if (!validation.isValid) {
                this.displayFormErrors(form, validation.errors);
                this.formStats.validationErrors++;
                return;
            }

            // Display warnings if any
            if (validation.warnings.length > 0) {
                this.displayFormWarnings(form, validation.warnings);
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;

            // Save environmental adjustment
            await this.calculator.saveEnvironmentalAdjustment(validation.sanitizedData);
            
            // Success
            this.formStats.successfulSubmissions++;
            this.showMessage('Environmental adjustment saved successfully', MESSAGE_TYPES.SUCCESS);
            
            // Close modal and refresh display
            this.closeModal('env-adjustment-modal');
            
            // Trigger refresh of display component
            if (window.app?.nutrientDisplay) {
                await window.app.nutrientDisplay.refresh();
            }
            
            console.log('✅ Environmental adjustment saved successfully');
            
        } catch (error) {
            console.error('Error saving environmental adjustment:', error);
            this.showMessage(error.message || 'Failed to save environmental adjustment', MESSAGE_TYPES.ERROR);
        } finally {
            // Restore button state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = this.formStates.environmentalAdjustment === 'edit' ? 'Update Adjustment' : 'Add Adjustment';
                submitBtn.disabled = false;
            }
        }
    }

    // =====================================================
    // FIELD VALIDATION
    // =====================================================

    /**
     * Validate ratio field
     */
    validateRatioField(input) {
        const value = parseFloat(input.value);
        const errors = [];

        if (isNaN(value)) {
            errors.push('Ratio must be a valid number');
        } else {
            if (value < VALIDATION_RULES.RATIO.MIN) {
                errors.push(`Ratio must be at least ${VALIDATION_RULES.RATIO.MIN}`);
            }
            if (value > VALIDATION_RULES.RATIO.MAX) {
                errors.push(`Ratio cannot exceed ${VALIDATION_RULES.RATIO.MAX}`);
            }
        }

        this.displayFieldErrors(input, errors);
        return errors.length === 0;
    }

    /**
     * Validate multiplier field
     */
    validateMultiplierField(input) {
        if (!input.value) return true; // Optional field
        
        const value = parseFloat(input.value);
        const errors = [];

        if (isNaN(value)) {
            errors.push('Multiplier must be a valid number');
        } else {
            if (value < VALIDATION_RULES.MULTIPLIER.MIN) {
                errors.push(`Multiplier must be at least ${VALIDATION_RULES.MULTIPLIER.MIN}`);
            }
            if (value > VALIDATION_RULES.MULTIPLIER.MAX) {
                errors.push(`Multiplier cannot exceed ${VALIDATION_RULES.MULTIPLIER.MAX}`);
            }
        }

        this.displayFieldErrors(input, errors);
        return errors.length === 0;
    }

    /**
     * Validate adjustment field
     */
    validateAdjustmentField(input) {
        const value = parseFloat(input.value);
        const errors = [];

        if (isNaN(value)) {
            errors.push('Adjustment must be a valid number');
        } else {
            if (value < 0.1) {
                errors.push('Adjustment must be at least 0.1');
            }
            if (value > 3.0) {
                errors.push('Adjustment cannot exceed 3.0');
            }
        }

        this.displayFieldErrors(input, errors);
        return errors.length === 0;
    }

    /**
     * Validate condition field
     */
    validateConditionField(input) {
        const value = parseFloat(input.value);
        const errors = [];

        if (isNaN(value)) {
            errors.push('Condition must be a valid number');
        }

        this.displayFieldErrors(input, errors);
        return errors.length === 0;
    }

    // =====================================================
    // ERROR DISPLAY MANAGEMENT
    // =====================================================

    /**
     * Display form errors
     */
    displayFormErrors(form, errors) {
        this.clearFormErrors(form);
        
        if (errors.length === 0) return;

        // Create or update error container
        let errorContainer = form.querySelector('.form-errors');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'form-errors';
            form.insertBefore(errorContainer, form.firstChild);
        }

        errorContainer.innerHTML = `
            <div class="error-list">
                ${errors.map(error => `<div class="error-item">${error}</div>`).join('')}
            </div>
        `;
    }

    /**
     * Display form warnings
     */
    displayFormWarnings(form, warnings) {
        if (warnings.length === 0) return;

        let warningContainer = form.querySelector('.form-warnings');
        if (!warningContainer) {
            warningContainer = document.createElement('div');
            warningContainer.className = 'form-warnings';
            const errorContainer = form.querySelector('.form-errors');
            if (errorContainer) {
                errorContainer.insertAdjacentElement('afterend', warningContainer);
            } else {
                form.insertBefore(warningContainer, form.firstChild);
            }
        }

        warningContainer.innerHTML = `
            <div class="warning-list">
                ${warnings.map(warning => `<div class="warning-item">${warning}</div>`).join('')}
            </div>
        `;
    }

    /**
     * Display field-specific errors
     */
    displayFieldErrors(input, errors) {
        this.clearFieldError(input);
        
        if (errors.length === 0) {
            input.classList.remove('error');
            return;
        }

        input.classList.add('error');
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = errors[0]; // Show first error
        
        // Insert after input
        input.parentNode.insertBefore(errorElement, input.nextSibling);
    }

    /**
     * Clear field error
     */
    clearFieldError(input) {
        input.classList.remove('error');
        const errorElement = input.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Clear form errors
     */
    clearFormErrors(form) {
        const errorContainers = form.querySelectorAll('.form-errors, .form-warnings');
        errorContainers.forEach(container => container.remove());
        
        const fieldErrors = form.querySelectorAll('.field-error');
        fieldErrors.forEach(error => error.remove());
        
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }

    /**
     * Clear all form errors
     */
    clearAllFormErrors() {
        document.querySelectorAll('.form-errors, .form-warnings, .field-error').forEach(el => el.remove());
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Show message (use app's notification system if available)
     */
    showMessage(message, type) {
        if (window.app?.showMessage) {
            window.app.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Add ratio rule for specific nutrient (convenience method)
     */
    addRatioRuleForNutrient(nutrientCode) {
        this.showRatioRuleModal();
        
        // Pre-select the nutrient
        setTimeout(() => {
            const nutrientSelect = document.querySelector(SELECTORS.RULE_NUTRIENT);
            if (nutrientSelect) {
                nutrientSelect.value = nutrientCode;
            }
        }, 100);
    }

    /**
     * Get form statistics
     */
    getFormStats() {
        const successRate = this.formStats.formsSubmitted > 0 ?
            (this.formStats.successfulSubmissions / this.formStats.formsSubmitted * 100).toFixed(1) :
            0;

        return {
            ...this.formStats,
            successRate: `${successRate}%`
        };
    }

    /**
     * Reset form statistics
     */
    resetFormStats() {
        this.formStats = {
            formsSubmitted: 0,
            validationErrors: 0,
            successfulSubmissions: 0
        };
    }
}