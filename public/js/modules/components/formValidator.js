// Form Validator Component
// Handles form validation, step validation, and form error management

/**
 * Form Validator Component Class
 * Manages complex multi-step form validation and error handling
 */
export class FormValidatorComponent {
    constructor(app) {
        this.app = app;
        this.validationRules = new Map();
        this.errorHighlightTimeout = null;
        
        console.log('✅ Form Validator Component initialized');
    }

    /**
     * Validate the current step in a multi-step wizard
     */
    async validateCurrentStep() {
        const errors = [];
        
        switch(this.app.currentSystemStep) {
            case 1:
                this.validateQuickstartStep(errors);
                break;
                
            case 2:
                this.validateBasicInfoStep(errors);
                break;
                
            case 3:
                await this.validateFishTanksStep(errors);
                break;
                
            case 4:
                await this.validateGrowBedsStep(errors);
                break;
        }
        
        if (errors.length > 0) {
            this.app.showNotification(errors[0], 'warning');
            // Clear error highlights after 3 seconds
            this.scheduleErrorHighlightClear();
            return false;
        }
        
        this.clearErrorHighlights();
        return true;
    }

    /**
     * Validate quickstart options step (Step 1)
     */
    validateQuickstartStep(errors) {
        const setupType = document.querySelector('input[name="system-setup"]:checked')?.value;
        if (!setupType) {
            errors.push('Please select a setup method');
        }
    }

    /**
     * Validate basic system information step (Step 2)
     */
    validateBasicInfoStep(errors) {
        const name = document.getElementById('new-system-name').value.trim();
        const type = document.getElementById('new-system-type').value;
        const tankCount = parseInt(document.getElementById('new-fish-tank-count').value);
        const bedCount = parseInt(document.getElementById('new-grow-bed-count').value);
        
        if (!name) {
            errors.push('System name is required');
            this.highlightError('new-system-name');
        }
        if (!type) {
            errors.push('System type is required');
            this.highlightError('new-system-type');
        }
        if (!tankCount || tankCount < 1 || tankCount > 10) {
            errors.push('Number of fish tanks must be between 1 and 10');
            this.highlightError('new-fish-tank-count');
        }
        if (!bedCount || bedCount < 1 || bedCount > 20) {
            errors.push('Number of grow beds must be between 1 and 20');
            this.highlightError('new-grow-bed-count');
        }
    }

    /**
     * Validate fish tanks configuration step (Step 3)
     */
    async validateFishTanksStep(errors) {
        // Wait for DOM updates after HTML generation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Save current data first to ensure we validate current values
        const tempStep = this.app.currentSystemStep;
        this.app.currentSystemStep = 3; // Temporarily set to 3 for saveCurrentStepData
        await this.app.saveCurrentStepData();
        this.app.currentSystemStep = tempStep; // Restore original step
        
        const tankCountForValidation = this.app.systemWizardData.fishTankCount || 
                                      parseInt(document.getElementById('new-fish-tank-count').value);
        
        for (let i = 1; i <= tankCountForValidation; i++) {
            this.validateSingleTank(i, errors);
        }
    }

    /**
     * Validate a single fish tank configuration
     */
    validateSingleTank(tankIndex, errors) {
        // Use saved data if available, otherwise read from DOM
        const savedTank = this.app.systemWizardData.fishTanks?.[tankIndex-1];
        const tankNameEl = document.getElementById(`tank-name-${tankIndex}`);
        const tankVolumeEl = document.getElementById(`tank-volume-${tankIndex}`);
        const fishTypeEl = document.getElementById(`tank-fish-${tankIndex}`);
        const stockingDensityEl = document.getElementById(`tank-stocking-${tankIndex}`);
        const harvestWeightEl = document.getElementById(`tank-harvest-${tankIndex}`);
        
        const tankName = savedTank?.name || tankNameEl?.value?.trim() || '';
        const tankVolume = (savedTank && savedTank.volume !== null) ? 
                          savedTank.volume.toString() : (tankVolumeEl?.value?.trim() || '');
        const fishType = savedTank?.fishType || fishTypeEl?.value || '';
        const stockingDensity = (savedTank && savedTank.stockingDensity !== null) ? 
                               savedTank.stockingDensity.toString() : (stockingDensityEl?.value?.trim() || '');
        const harvestWeight = (savedTank && savedTank.harvestWeight !== null) ? 
                             savedTank.harvestWeight.toString() : (harvestWeightEl?.value?.trim() || '');

        // Validate tank name
        if (!tankName) {
            errors.push(`Tank ${tankIndex} name is required`);
            this.highlightError(`tank-name-${tankIndex}`);
        }
        
        // Validate tank volume
        const volumeNum = parseFloat(tankVolume);
        if (!tankVolume || isNaN(volumeNum) || volumeNum <= 0) {
            errors.push(`Tank ${tankIndex} volume must be greater than 0`);
            this.highlightError(`tank-volume-${tankIndex}`);
        }
        
        // Validate fish type
        if (!fishType) {
            errors.push(`Tank ${tankIndex} fish type is required`);
            this.highlightError(`tank-fish-${tankIndex}`);
        }
        
        // Validate stocking density
        const densityNum = parseFloat(stockingDensity);
        if (!stockingDensity || isNaN(densityNum) || densityNum <= 0) {
            errors.push(`Tank ${tankIndex} stocking density must be greater than 0`);
            this.highlightError(`tank-stocking-${tankIndex}`);
        }
        
        // Validate harvest weight
        const weightNum = parseFloat(harvestWeight);
        if (!harvestWeight || isNaN(weightNum) || weightNum <= 0) {
            errors.push(`Tank ${tankIndex} target harvest weight must be greater than 0`);
            this.highlightError(`tank-harvest-${tankIndex}`);
        }
    }

    /**
     * Validate grow beds configuration step (Step 4)
     */
    async validateGrowBedsStep(errors) {
        // Wait for DOM updates after HTML generation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const bedCountForValidation = parseInt(document.getElementById('new-grow-bed-count').value);
        
        for (let i = 1; i <= bedCountForValidation; i++) {
            this.validateSingleGrowBed(i, errors);
        }
    }

    /**
     * Validate a single grow bed configuration
     */
    validateSingleGrowBed(bedIndex, errors) {
        const bedName = document.getElementById(`bed-name-${bedIndex}`)?.value?.trim() || '';
        const bedType = document.getElementById(`bed-type-${bedIndex}`)?.value || '';
        
        // Validate basic bed information
        if (!bedName) {
            errors.push(`Grow Bed ${bedIndex} name is required`);
            this.highlightError(`bed-name-${bedIndex}`);
        }
        if (!bedType) {
            errors.push(`Grow Bed ${bedIndex} type is required`);
            this.highlightError(`bed-type-${bedIndex}`);
        }
        
        // Validate type-specific required fields
        if (bedType) {
            this.validateBedTypeSpecificFields(bedIndex, bedType, errors);
        }
    }

    /**
     * Validate type-specific grow bed fields
     */
    validateBedTypeSpecificFields(bedIndex, bedType, errors) {
        if (bedType === 'dwc' || bedType === 'flood-drain' || bedType === 'media-flow') {
            this.validateStandardBedDimensions(bedIndex, errors);
        } else if (bedType === 'vertical') {
            this.validateVerticalBedFields(bedIndex, errors);
        } else if (bedType === 'nft') {
            this.validateNFTBedFields(bedIndex, errors);
        }
    }

    /**
     * Validate standard bed dimensions (DWC, flood-drain, media-flow)
     */
    validateStandardBedDimensions(bedIndex, errors) {
        const length = document.getElementById(`bed-length-${bedIndex}`)?.value;
        const width = document.getElementById(`bed-width-${bedIndex}`)?.value;
        const height = document.getElementById(`bed-height-${bedIndex}`)?.value;
        
        if (!length || parseFloat(length) <= 0) {
            errors.push(`Grow Bed ${bedIndex} length is required`);
            this.highlightError(`bed-length-${bedIndex}`);
        }
        if (!width || parseFloat(width) <= 0) {
            errors.push(`Grow Bed ${bedIndex} width is required`);
            this.highlightError(`bed-width-${bedIndex}`);
        }
        if (!height || parseFloat(height) <= 0) {
            errors.push(`Grow Bed ${bedIndex} height/depth is required`);
            this.highlightError(`bed-height-${bedIndex}`);
        }
    }

    /**
     * Validate vertical bed specific fields
     */
    validateVerticalBedFields(bedIndex, errors) {
        const length = document.getElementById(`bed-length-${bedIndex}`)?.value;
        const width = document.getElementById(`bed-width-${bedIndex}`)?.value;
        const height = document.getElementById(`bed-height-${bedIndex}`)?.value;
        const verticals = document.getElementById(`bed-verticals-${bedIndex}`)?.value;
        const plantsPerVertical = document.getElementById(`bed-plants-per-vertical-${bedIndex}`)?.value;
        
        if (!length || parseFloat(length) <= 0) {
            errors.push(`Grow Bed ${bedIndex} base length is required`);
            this.highlightError(`bed-length-${bedIndex}`);
        }
        if (!width || parseFloat(width) <= 0) {
            errors.push(`Grow Bed ${bedIndex} base width is required`);
            this.highlightError(`bed-width-${bedIndex}`);
        }
        if (!height || parseFloat(height) <= 0) {
            errors.push(`Grow Bed ${bedIndex} base height is required`);
            this.highlightError(`bed-height-${bedIndex}`);
        }
        if (!verticals || parseInt(verticals) <= 0) {
            errors.push(`Grow Bed ${bedIndex} number of verticals is required`);
            this.highlightError(`bed-verticals-${bedIndex}`);
        }
        if (!plantsPerVertical || parseInt(plantsPerVertical) <= 0) {
            errors.push(`Grow Bed ${bedIndex} plants per vertical is required`);
            this.highlightError(`bed-plants-per-vertical-${bedIndex}`);
        }
    }

    /**
     * Validate NFT bed specific fields
     */
    validateNFTBedFields(bedIndex, errors) {
        const length = document.getElementById(`bed-length-${bedIndex}`)?.value;
        const channels = document.getElementById(`bed-channels-${bedIndex}`)?.value;
        const width = document.getElementById(`bed-width-${bedIndex}`)?.value;
        
        if (!length || parseFloat(length) <= 0) {
            errors.push(`Grow Bed ${bedIndex} channel length is required`);
            this.highlightError(`bed-length-${bedIndex}`);
        }
        if (!channels || parseInt(channels) <= 0) {
            errors.push(`Grow Bed ${bedIndex} number of channels is required`);
            this.highlightError(`bed-channels-${bedIndex}`);
        }
        if (!width || parseFloat(width) <= 0) {
            errors.push(`Grow Bed ${bedIndex} channel width is required`);
            this.highlightError(`bed-width-${bedIndex}`);
        }
    }

    /**
     * Highlight a field with an error
     */
    highlightError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error-field');
        }
    }

    /**
     * Clear all error highlights
     */
    clearErrorHighlights() {
        document.querySelectorAll('.error-field').forEach(field => {
            field.classList.remove('error-field');
        });
    }

    /**
     * Schedule clearing of error highlights
     */
    scheduleErrorHighlightClear() {
        if (this.errorHighlightTimeout) {
            clearTimeout(this.errorHighlightTimeout);
        }
        
        this.errorHighlightTimeout = setTimeout(() => {
            this.clearErrorHighlights();
            this.errorHighlightTimeout = null;
        }, 3000);
    }

    /**
     * Validate a generic form with custom rules
     */
    validateForm(formId, rules = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            console.warn(`Form ${formId} not found`);
            return { isValid: false, errors: ['Form not found'] };
        }

        const errors = [];
        const formData = new FormData(form);
        
        // Apply validation rules
        Object.entries(rules).forEach(([fieldName, rule]) => {
            const value = formData.get(fieldName);
            const fieldErrors = this.validateFieldValue(value, rule, fieldName);
            errors.push(...fieldErrors);
            
            // Highlight field if it has errors
            if (fieldErrors.length > 0) {
                this.highlightError(fieldName);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            data: Object.fromEntries(formData)
        };
    }

    /**
     * Validate a single field value against rules
     */
    validateFieldValue(value, rules, fieldName) {
        const errors = [];
        
        // Required validation
        if (rules.required && (!value || value.trim() === '')) {
            errors.push(`${this.formatFieldName(fieldName)} is required`);
            return errors; // Early return for required fields
        }
        
        // Skip other validations if field is empty and not required
        if (!value || value.trim() === '') {
            return errors;
        }
        
        // Type validations
        if (rules.type === 'email' && !this.isValidEmail(value)) {
            errors.push(`${this.formatFieldName(fieldName)} must be a valid email address`);
        }
        
        if (rules.type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                errors.push(`${this.formatFieldName(fieldName)} must be a valid number`);
            } else {
                if (rules.min !== undefined && num < rules.min) {
                    errors.push(`${this.formatFieldName(fieldName)} must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && num > rules.max) {
                    errors.push(`${this.formatFieldName(fieldName)} must be at most ${rules.max}`);
                }
            }
        }
        
        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${this.formatFieldName(fieldName)} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${this.formatFieldName(fieldName)} must be at most ${rules.maxLength} characters`);
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${this.formatFieldName(fieldName)} has invalid format`);
        }
        
        // Custom validation function
        if (rules.custom && typeof rules.custom === 'function') {
            const customError = rules.custom(value);
            if (customError) {
                errors.push(customError);
            }
        }
        
        return errors;
    }

    /**
     * Format field name for display in error messages
     */
    formatFieldName(fieldName) {
        return fieldName
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Register validation rules for a form
     */
    registerValidationRules(formId, rules) {
        this.validationRules.set(formId, rules);
        console.log(`📋 Validation rules registered for form: ${formId}`);
    }

    /**
     * Get registered validation rules for a form
     */
    getValidationRules(formId) {
        return this.validationRules.get(formId) || {};
    }

    /**
     * Clear validation rules for a form
     */
    clearValidationRules(formId) {
        this.validationRules.delete(formId);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            registeredForms: this.validationRules.size,
            hasActiveHighlights: !!this.errorHighlightTimeout,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Form Validator component');
        
        if (this.errorHighlightTimeout) {
            clearTimeout(this.errorHighlightTimeout);
            this.errorHighlightTimeout = null;
        }
        
        this.validationRules.clear();
        this.clearErrorHighlights();
    }
}

// Export both class and create a factory function
export default FormValidatorComponent;

/**
 * Factory function to create form validator component
 */
export function createFormValidatorComponent(app) {
    return new FormValidatorComponent(app);
}