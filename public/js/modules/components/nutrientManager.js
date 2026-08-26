// Nutrient Manager Component
// Coordinates all nutrient components and replaces the monolithic NutrientRatioManager class

import { NutrientDisplay, NutrientForm, NutrientAlerts } from './nutrients/index.js';
import { NutrientCalculator } from '../services/index.js';
import { NutrientValidation } from '../utils/index.js';

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Create authenticated headers
 */
function getAuthHeaders(includeContentType = true) {
    const headers = {};
    const token = getAuthToken();
    
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Nutrient Manager Component
 * Coordinates nutrient display, form, alerts, and calculator components
 * Replaces the monolithic NutrientRatioManager class
 */
export default class NutrientManager {
    constructor(app) {
        this.app = app;
        
        // Initialize services and utilities
        this.validation = new NutrientValidation();
        this.calculator = new NutrientCalculator(app);
        
        // Initialize components
        this.display = new NutrientDisplay(this.calculator, this.validation);
        this.form = new NutrientForm(this.calculator, this.validation);
        this.alerts = new NutrientAlerts(this.calculator, this.validation);
        
        // Set up global references for backward compatibility
        this.setupGlobalReferences();
        
        console.log('🧮 Nutrient Manager initialized');
    }

    /**
     * Initialize the nutrient manager
     */
    async initialize() {
        console.log('🔄 Initializing Nutrient Manager...');
        
        try {
            // Initialize calculator first (loads data)
            await this.calculator.initialize();
            
            // Initialize components in parallel
            await Promise.all([
                this.display.initialize(),
                this.form.initialize(),
                this.alerts.initialize()
            ]);
            
            console.log('✅ Nutrient Manager initialized successfully');
            console.log(`📊 Loaded ${this.calculator.ratioRules.length} ratio rules, ${this.calculator.nutrients.length} nutrients`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Nutrient Manager:', error);
            if (this.app?.showMessage) {
                this.app.showMessage('Failed to initialize nutrient management system', 'error');
            }
            throw error;
        }
    }

    /**
     * Set up global references for backward compatibility
     */
    setupGlobalReferences() {
        // Create global reference for existing HTML onclick handlers
        window.nutrientRatioManager = {
            // Display methods
            switchRatioTab: (target) => this.display.switchRatioTab(target),
            filterRatioRules: () => this.display.filterRatioRules(),
            
            // Form methods
            showRatioRuleModal: (rule) => this.form.showRatioRuleModal(rule),
            showEnvAdjustmentModal: (adjustment) => this.form.showEnvAdjustmentModal(adjustment),
            closeRatioRuleModal: () => this.form.closeModal('ratio-rule-modal'),
            closeEnvAdjustmentModal: () => this.form.closeModal('env-adjustment-modal'),
            addRatioRuleForNutrient: (nutrientCode) => this.form.addRatioRuleForNutrient(nutrientCode),
            
            // CRUD operations
            editRatioRule: (ruleId) => this.editRatioRule(ruleId),
            deleteRatioRule: (ruleId) => this.deleteRatioRule(ruleId),
            editEnvironmentalAdjustment: (adjustmentId) => this.editEnvironmentalAdjustment(adjustmentId),
            deleteEnvironmentalAdjustment: (adjustmentId) => this.deleteEnvironmentalAdjustment(adjustmentId),
            
            // Data loading
            loadRatioManagement: () => this.loadRatioManagement()
        };

        // Also set up main app reference
        if (this.app) {
            this.app.nutrientRatioManager = window.nutrientRatioManager;
            this.app.nutrientManager = this;
            this.app.nutrientDisplay = this.display;
            this.app.nutrientForm = this.form;
            this.app.nutrientAlerts = this.alerts;
            this.app.nutrientCalculator = this.calculator;
        }
    }

    // =====================================================
    // MAIN INTERFACE METHODS
    // =====================================================

    /**
     * Load ratio management (main entry point)
     */
    async loadRatioManagement() {
        console.log('🔄 Loading nutrient ratio management...');
        
        try {
            // Refresh calculator data
            await this.calculator.refreshData();
            
            // Refresh display components
            await this.display.refresh();
            
            // Check for issues
            await this.alerts.checkNutrientIssues();
            
            console.log('✅ Nutrient ratio management loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading ratio management:', error);
            if (this.app?.showMessage) {
                this.app.showMessage('Failed to load ratio management system', 'error');
            }
        }
    }

    /**
     * Edit ratio rule
     */
    async editRatioRule(ruleId) {
        try {
            const rule = this.calculator.ratioRules.find(r => r.id === ruleId);
            if (rule) {
                this.form.showRatioRuleModal(rule);
            } else {
                console.error('Ratio rule not found:', ruleId);
                if (this.app?.showMessage) {
                    this.app.showMessage('Ratio rule not found', 'error');
                }
            }
        } catch (error) {
            console.error('Error editing ratio rule:', error);
            if (this.app?.showMessage) {
                this.app.showMessage('Failed to open ratio rule for editing', 'error');
            }
        }
    }

    /**
     * Delete ratio rule
     */
    async deleteRatioRule(ruleId) {
        if (!confirm('Are you sure you want to delete this ratio rule?')) {
            return;
        }

        try {
            await this.calculator.deleteRatioRule(ruleId);
            
            // Refresh display
            await this.display.refresh();
            
            if (this.app?.showMessage) {
                this.app.showMessage('Ratio rule deleted successfully', 'success');
            }
            
            console.log('✅ Ratio rule deleted successfully');
            
        } catch (error) {
            console.error('Error deleting ratio rule:', error);
            if (this.app?.showMessage) {
                this.app.showMessage(error.message || 'Failed to delete ratio rule', 'error');
            }
        }
    }

    /**
     * Edit environmental adjustment
     */
    async editEnvironmentalAdjustment(adjustmentId) {
        try {
            const adjustment = this.calculator.environmentalAdjustments.find(a => a.id === adjustmentId);
            if (adjustment) {
                this.form.showEnvAdjustmentModal(adjustment);
            } else {
                console.error('Environmental adjustment not found:', adjustmentId);
                if (this.app?.showMessage) {
                    this.app.showMessage('Environmental adjustment not found', 'error');
                }
            }
        } catch (error) {
            console.error('Error editing environmental adjustment:', error);
            if (this.app?.showMessage) {
                this.app.showMessage('Failed to open environmental adjustment for editing', 'error');
            }
        }
    }

    /**
     * Delete environmental adjustment
     */
    async deleteEnvironmentalAdjustment(adjustmentId) {
        if (!confirm('Are you sure you want to delete this environmental adjustment?')) {
            return;
        }

        try {
            // Note: Implementation depends on backend API
            if (this.app?.showMessage) {
                this.app.showMessage('Delete environmental adjustment functionality not yet implemented', 'warning');
            }
            
        } catch (error) {
            console.error('Error deleting environmental adjustment:', error);
            if (this.app?.showMessage) {
                this.app.showMessage(error.message || 'Failed to delete environmental adjustment', 'error');
            }
        }
    }

    // =====================================================
    // CALCULATION AND ANALYSIS METHODS
    // =====================================================

    /**
     * Calculate nutrient requirements for specific system
     */
    async calculateNutrientRequirements(systemId, cropData, environmentalData = {}) {
        try {
            const requirements = this.calculator.calculateNutrientRequirements(cropData, environmentalData);
            
            // Check for issues with the calculated requirements
            const systemIssues = this.alerts.checkSystemNutrientBalance(systemId, requirements);
            if (systemIssues.length > 0) {
                this.alerts.processIssues(systemIssues);
            }
            
            return requirements;
            
        } catch (error) {
            console.error('Error calculating nutrient requirements:', error);
            throw error;
        }
    }

    /**
     * Generate nutrient report for system
     */
    generateNutrientReport(systemId, cropData, environmentalData) {
        try {
            return this.calculator.generateNutrientReport(cropData, environmentalData);
        } catch (error) {
            console.error('Error generating nutrient report:', error);
            throw error;
        }
    }

    // =====================================================
    // SYSTEM INTEGRATION METHODS
    // =====================================================

    /**
     * Handle system change
     */
    async onSystemChange(systemId) {
        console.log('🔄 Nutrient manager handling system change to:', systemId);
        
        try {
            // Refresh data for new system
            await this.loadRatioManagement();
            
            // Check for system-specific nutrient issues
            await this.alerts.checkNutrientIssues();
            
        } catch (error) {
            console.error('Error handling system change:', error);
        }
    }

    /**
     * Refresh for system
     */
    async refreshForSystem(systemId) {
        console.log('🔄 Refreshing nutrients for system:', systemId);
        
        try {
            await this.loadRatioManagement();
            console.log('✅ Nutrients refreshed for system');
        } catch (error) {
            console.error('❌ Failed to refresh nutrients:', error);
        }
    }

    // =====================================================
    // DEFICIENCY IMAGES MANAGEMENT
    // =====================================================

    /**
     * Initialize deficiency images management
     */
    async initializeDeficiencyImagesManagement() {
        console.log('🖼️ Initializing deficiency images management...');
        
        try {
            await this.loadAllDeficiencyImages();
            this.setupDeficiencyFilterEventListeners();
            console.log('✅ Deficiency images management initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing deficiency images management:', error);
        }
    }

    /**
     * Load all deficiency images
     */
    async loadAllDeficiencyImages() {
        try {
            const response = await fetch('/api/crop-knowledge/deficiency-images', {
                method: 'GET',
                headers: getAuthHeaders(false)
            });
            const data = await response.json();
            
            if (data.success) {
                this.displayDeficiencyImages(data.data);
                console.log(`🖼️ Loaded ${data.data.length} deficiency images`);
            } else {
                throw new Error(data.error || 'Failed to load deficiency images');
            }
        } catch (error) {
            console.error('Error loading deficiency images:', error);
            throw error;
        }
    }

    /**
     * Display deficiency images
     */
    displayDeficiencyImages(images) {
        const container = document.getElementById('deficiency-images-container');
        if (!container) return;

        if (images.length === 0) {
            container.innerHTML = '<div class="empty-state">No deficiency images found.</div>';
            return;
        }

        let html = '';
        images.forEach(image => {
            html += `
                <div class="deficiency-image-card">
                    <img src="${image.image_path}" alt="Deficiency: ${image.crop_name} - ${image.nutrient_name}" loading="lazy">
                    <div class="image-details">
                        <h4>${image.crop_name}</h4>
                        <p><strong>Nutrient:</strong> ${image.nutrient_name}</p>
                        <p><strong>Description:</strong> ${image.description || 'No description'}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Set up deficiency filter event listeners
     */
    setupDeficiencyFilterEventListeners() {
        // This would set up filtering for deficiency images
        console.log('🔧 Setting up deficiency filter event listeners...');
    }

    // =====================================================
    // STATISTICS AND REPORTING
    // =====================================================

    /**
     * Get comprehensive statistics
     */
    getStatistics() {
        return {
            calculator: this.calculator.getServiceStats(),
            validation: this.validation.getValidationStats(),
            display: this.display.getDisplayStats(),
            form: this.form.getFormStats(),
            alerts: this.alerts.getAlertStats()
        };
    }

    /**
     * Generate status report
     */
    generateStatusReport() {
        return {
            timestamp: new Date().toISOString(),
            systemStatus: 'active',
            componentStats: this.getStatistics(),
            alertsReport: this.alerts.generateStatusReport(),
            dataLoaded: {
                ratioRules: this.calculator.ratioRules.length,
                environmentalAdjustments: this.calculator.environmentalAdjustments.length,
                nutrients: this.calculator.nutrients.length,
                growthStages: this.calculator.growthStages.length
            }
        };
    }

    // =====================================================
    // CLEANUP AND UTILITY METHODS
    // =====================================================

    /**
     * Validate complete nutrient system configuration
     */
    validateSystemConfiguration() {
        const allRules = this.calculator.ratioRules;
        const allAdjustments = this.calculator.environmentalAdjustments;
        
        const systemData = {
            ratioRules: allRules,
            environmentalAdjustments: allAdjustments
        };
        
        return this.validation.validateSystemNutrients(systemData);
    }

    /**
     * Export configuration
     */
    exportConfiguration() {
        return {
            ratioRules: this.calculator.ratioRules,
            environmentalAdjustments: this.calculator.environmentalAdjustments,
            alertConfig: this.alerts.alertConfig,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        console.log('🧹 Destroying Nutrient Manager');
        
        // Cleanup components
        if (this.calculator) {
            this.calculator.destroy();
        }
        
        if (this.alerts) {
            this.alerts.dismissAllAlerts();
        }
        
        // Remove global references
        delete window.nutrientRatioManager;
        
        if (this.app) {
            delete this.app.nutrientRatioManager;
            delete this.app.nutrientManager;
            delete this.app.nutrientDisplay;
            delete this.app.nutrientForm;
            delete this.app.nutrientAlerts;
            delete this.app.nutrientCalculator;
        }
        
        console.log('✅ Nutrient Manager destroyed');
    }
}