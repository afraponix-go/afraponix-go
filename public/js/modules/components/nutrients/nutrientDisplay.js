// Nutrient Display Component
// Handles UI display and visualization for nutrient data

import { 
    SELECTORS, 
    CSS_CLASSES,
    MESSAGE_TYPES
} from '../../constants/nutrientConstants.js';

/**
 * Nutrient Display Component
 * Manages nutrient data visualization and display updates
 */
export default class NutrientDisplay {
    constructor(calculator, validation) {
        this.calculator = calculator;
        this.validation = validation;
        
        // Display state
        this.activeFilters = {
            nutrient: '',
            growthStage: ''
        };
        
        // Display statistics
        this.displayStats = {
            rulesDisplayed: 0,
            adjustmentsDisplayed: 0,
            filtersApplied: 0
        };
        
        console.log('📊 Nutrient Display Component initialized');
    }

    /**
     * Initialize display component
     */
    async initialize() {
        console.log('🔄 Initializing Nutrient Display...');
        
        try {
            this.setupEventListeners();
            await this.populateFilterDropdowns();
            console.log('✅ Nutrient Display initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Nutrient Display:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for filters and interactions
     */
    setupEventListeners() {
        // Filter event listeners
        const nutrientFilter = document.querySelector(SELECTORS.RATIO_NUTRIENT_FILTER);
        const stageFilter = document.querySelector(SELECTORS.RATIO_STAGE_FILTER);
        
        if (nutrientFilter) {
            nutrientFilter.addEventListener('change', () => this.filterRatioRules());
        }
        
        if (stageFilter) {
            stageFilter.addEventListener('change', () => this.filterRatioRules());
        }

        // Tab switching
        document.querySelectorAll(SELECTORS.RATIO_TABS).forEach(tab => {
            tab.addEventListener('click', (e) => this.switchRatioTab(e.target.dataset.target));
        });
    }

    /**
     * Switch between ratio management tabs
     */
    switchRatioTab(targetTab) {
        // Update active tab
        document.querySelectorAll(SELECTORS.RATIO_TABS).forEach(tab => {
            tab.classList.remove(CSS_CLASSES.ACTIVE);
        });
        document.querySelector(`[data-target="${targetTab}"]`)?.classList.add(CSS_CLASSES.ACTIVE);

        // Update active content
        document.querySelectorAll(SELECTORS.RATIO_CONTENT).forEach(content => {
            content.classList.remove(CSS_CLASSES.ACTIVE);
        });
        document.getElementById(targetTab)?.classList.add(CSS_CLASSES.ACTIVE);

        console.log(`📋 Switched to ${targetTab} tab`);
    }

    /**
     * Populate filter dropdown options
     */
    async populateFilterDropdowns() {
        try {
            await this.populateNutrientFilter();
            await this.populateStageFilter();
            console.log('📝 Filter dropdowns populated');
        } catch (error) {
            console.error('Error populating filter dropdowns:', error);
        }
    }

    /**
     * Populate nutrient filter dropdown
     */
    populateNutrientFilter() {
        const nutrientFilter = document.querySelector(SELECTORS.RATIO_NUTRIENT_FILTER);
        if (!nutrientFilter) return;

        nutrientFilter.innerHTML = '<option value="">All Nutrients</option>';
        
        this.calculator.nutrients.forEach(nutrient => {
            const option = document.createElement('option');
            option.value = nutrient.code;
            option.textContent = `${nutrient.name} (${nutrient.symbol})`;
            nutrientFilter.appendChild(option);
        });
    }

    /**
     * Populate growth stage filter dropdown
     */
    populateStageFilter() {
        const stageFilter = document.querySelector(SELECTORS.RATIO_STAGE_FILTER);
        if (!stageFilter) return;

        stageFilter.innerHTML = '<option value="">All Growth Stages</option>';
        
        this.calculator.growthStages.forEach(stage => {
            const option = document.createElement('option');
            option.value = stage.code;
            option.textContent = stage.name;
            stageFilter.appendChild(option);
        });
    }

    /**
     * Display ratio rules with current filters
     */
    displayRatioRules() {
        const container = document.querySelector(SELECTORS.RATIO_RULES_CONTAINER);
        if (!container) {
            console.warn('Ratio rules container not found');
            return;
        }

        try {
            const filteredRules = this.getFilteredRatioRules();
            
            if (filteredRules.length === 0) {
                container.innerHTML = this.generateEmptyRulesMessage();
                this.displayStats.rulesDisplayed = 0;
                return;
            }

            // Group rules by nutrient for better organization
            const groupedRules = this.groupRulesByNutrient(filteredRules);
            let html = '';

            Object.keys(groupedRules).forEach(nutrientCode => {
                const nutrient = this.calculator.getNutrientByCode(nutrientCode);
                const rules = groupedRules[nutrientCode];
                
                html += this.generateNutrientRulesSection(nutrient, rules);
            });

            container.innerHTML = html;
            this.displayStats.rulesDisplayed = filteredRules.length;
            
            console.log(`📊 Displayed ${filteredRules.length} ratio rules`);
            
        } catch (error) {
            console.error('Error displaying ratio rules:', error);
            container.innerHTML = '<div class="error-message">Error loading ratio rules</div>';
        }
    }

    /**
     * Generate HTML for nutrient rules section
     */
    generateNutrientRulesSection(nutrient, rules) {
        const nutrientName = nutrient ? `${nutrient.name} (${nutrient.symbol})` : 'Unknown Nutrient';
        
        let html = `
            <div class="nutrient-rules-section">
                <div class="nutrient-header">
                    <h4>${nutrientName}</h4>
                    <button class="${CSS_CLASSES.BTN_ADD_STAGE}" 
                            onclick="app.nutrientRatioManager.addRatioRuleForNutrient('${nutrient?.code || ''}')" 
                            title="Add Stage Rule">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Add Stage Rule
                    </button>
                </div>
                <div class="rules-grid">
        `;

        // General rules (no specific growth stage)
        const generalRules = rules.filter(rule => !rule.growth_stage);
        generalRules.forEach(rule => {
            html += this.generateRuleCard(rule, 'general');
        });

        // Stage-specific rules
        const stageRules = rules.filter(rule => rule.growth_stage);
        const groupedStageRules = this.groupRulesByStage(stageRules);
        
        Object.keys(groupedStageRules).forEach(stageCode => {
            const stage = this.calculator.getGrowthStageByCode(stageCode);
            const stageRulesList = groupedStageRules[stageCode];
            
            html += `
                <div class="stage-rules-group">
                    <h5>${stage ? stage.name : stageCode} Stage</h5>
                    <div class="stage-rules-list">
            `;
            
            stageRulesList.forEach(rule => {
                html += this.generateRuleCard(rule, 'stage');
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate individual rule card HTML
     */
    generateRuleCard(rule, type = 'general') {
        const cardClass = type === 'stage' ? 'rule-card-small' : 'rule-card';
        const editClass = type === 'stage' ? CSS_CLASSES.BTN_EDIT_SMALL : CSS_CLASSES.BTN_EDIT;
        const deleteClass = type === 'stage' ? CSS_CLASSES.BTN_DELETE_SMALL : CSS_CLASSES.BTN_DELETE;
        
        return `
            <div class="${cardClass}" data-rule-id="${rule.id}">
                <div class="rule-content">
                    <div class="rule-ratio">
                        <span class="ratio-value">${rule.ratio}</span>
                        <span class="ratio-unit">ratio</span>
                    </div>
                    <div class="rule-details">
                        ${rule.multiplier ? `<div class="multiplier">×${rule.multiplier}</div>` : ''}
                        ${rule.notes ? `<div class="notes">${rule.notes}</div>` : ''}
                        <div class="rule-meta">
                            Created: ${this.formatDate(rule.created_at)}
                        </div>
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="${editClass}" 
                            onclick="app.nutrientRatioManager.editRatioRule(${rule.id})" 
                            title="Edit Rule">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="${deleteClass}" 
                            onclick="app.nutrientRatioManager.deleteRatioRule(${rule.id})" 
                            title="Delete Rule">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Display environmental adjustments
     */
    displayEnvironmentalAdjustments() {
        const container = document.querySelector(SELECTORS.ENV_ADJUSTMENTS_CONTAINER);
        if (!container) {
            console.warn('Environmental adjustments container not found');
            return;
        }

        try {
            const adjustments = this.calculator.environmentalAdjustments;
            
            if (adjustments.length === 0) {
                container.innerHTML = this.generateEmptyAdjustmentsMessage();
                this.displayStats.adjustmentsDisplayed = 0;
                return;
            }

            // Group adjustments by parameter
            const groupedAdjustments = this.groupAdjustmentsByParameter(adjustments);
            let html = '';

            Object.keys(groupedAdjustments).forEach(parameter => {
                const adjustmentsList = groupedAdjustments[parameter];
                html += this.generateParameterAdjustmentsSection(parameter, adjustmentsList);
            });

            container.innerHTML = html;
            this.displayStats.adjustmentsDisplayed = adjustments.length;
            
            console.log(`🌡️ Displayed ${adjustments.length} environmental adjustments`);
            
        } catch (error) {
            console.error('Error displaying environmental adjustments:', error);
            container.innerHTML = '<div class="error-message">Error loading environmental adjustments</div>';
        }
    }

    /**
     * Generate parameter adjustments section HTML
     */
    generateParameterAdjustmentsSection(parameter, adjustments) {
        const parameterData = this.calculator.environmentalParameters.find(p => p.code === parameter);
        const parameterName = parameterData ? parameterData.name : parameter;
        const unit = parameterData ? parameterData.unit : '';

        let html = `
            <div class="parameter-adjustments-section">
                <div class="parameter-header">
                    <h4>${parameterName} ${unit ? `(${unit})` : ''}</h4>
                </div>
                <div class="adjustments-grid">
        `;

        adjustments.forEach(adjustment => {
            html += this.generateAdjustmentCard(adjustment);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Generate adjustment card HTML
     */
    generateAdjustmentCard(adjustment) {
        return `
            <div class="adjustment-card" data-adjustment-id="${adjustment.id}">
                <div class="adjustment-content">
                    <div class="adjustment-condition">
                        ${adjustment.operator || '='} ${adjustment.condition}
                    </div>
                    <div class="adjustment-multiplier">
                        ×${adjustment.multiplier}
                    </div>
                    <div class="adjustment-description">
                        ${adjustment.description || 'No description'}
                    </div>
                </div>
                <div class="adjustment-actions">
                    <button class="${CSS_CLASSES.BTN_EDIT}" 
                            onclick="app.nutrientRatioManager.editEnvironmentalAdjustment(${adjustment.id})" 
                            title="Edit Adjustment">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="${CSS_CLASSES.BTN_DELETE}" 
                            onclick="app.nutrientRatioManager.deleteEnvironmentalAdjustment(${adjustment.id})" 
                            title="Delete Adjustment">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Filter ratio rules based on active filters
     */
    filterRatioRules() {
        this.displayStats.filtersApplied++;
        
        // Update active filters
        const nutrientFilter = document.querySelector(SELECTORS.RATIO_NUTRIENT_FILTER);
        const stageFilter = document.querySelector(SELECTORS.RATIO_STAGE_FILTER);
        
        this.activeFilters.nutrient = nutrientFilter?.value || '';
        this.activeFilters.growthStage = stageFilter?.value || '';
        
        console.log('🔍 Applying filters:', this.activeFilters);
        
        // Refresh display with filters
        this.displayRatioRules();
    }

    /**
     * Get filtered ratio rules
     */
    getFilteredRatioRules() {
        let filtered = [...this.calculator.ratioRules];
        
        // Apply nutrient filter
        if (this.activeFilters.nutrient) {
            filtered = filtered.filter(rule => rule.nutrient === this.activeFilters.nutrient);
        }
        
        // Apply growth stage filter
        if (this.activeFilters.growthStage) {
            filtered = filtered.filter(rule => 
                rule.growth_stage === this.activeFilters.growthStage ||
                (!rule.growth_stage && this.activeFilters.growthStage === 'general')
            );
        }
        
        return filtered;
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Group rules by nutrient
     */
    groupRulesByNutrient(rules) {
        const grouped = {};
        rules.forEach(rule => {
            if (!grouped[rule.nutrient]) {
                grouped[rule.nutrient] = [];
            }
            grouped[rule.nutrient].push(rule);
        });
        return grouped;
    }

    /**
     * Group rules by growth stage
     */
    groupRulesByStage(rules) {
        const grouped = {};
        rules.forEach(rule => {
            const stage = rule.growth_stage || 'general';
            if (!grouped[stage]) {
                grouped[stage] = [];
            }
            grouped[stage].push(rule);
        });
        return grouped;
    }

    /**
     * Group adjustments by parameter
     */
    groupAdjustmentsByParameter(adjustments) {
        const grouped = {};
        adjustments.forEach(adjustment => {
            if (!grouped[adjustment.parameter]) {
                grouped[adjustment.parameter] = [];
            }
            grouped[adjustment.parameter].push(adjustment);
        });
        return grouped;
    }

    /**
     * Generate empty rules message
     */
    generateEmptyRulesMessage() {
        return `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <h4>No Ratio Rules Found</h4>
                <p>No ratio rules match your current filters. Try adjusting the filters or add a new rule.</p>
            </div>
        `;
    }

    /**
     * Generate empty adjustments message
     */
    generateEmptyAdjustmentsMessage() {
        return `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h4>No Environmental Adjustments</h4>
                <p>No environmental adjustments have been configured yet.</p>
            </div>
        `;
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Invalid Date';
        }
    }

    /**
     * Refresh all displays
     */
    async refresh() {
        console.log('🔄 Refreshing nutrient displays...');
        
        try {
            await this.populateFilterDropdowns();
            this.displayRatioRules();
            this.displayEnvironmentalAdjustments();
            
            console.log('✅ Nutrient displays refreshed');
        } catch (error) {
            console.error('❌ Error refreshing displays:', error);
        }
    }

    /**
     * Get display statistics
     */
    getDisplayStats() {
        return {
            ...this.displayStats,
            activeFilters: { ...this.activeFilters }
        };
    }

    /**
     * Clear filters
     */
    clearFilters() {
        this.activeFilters = {
            nutrient: '',
            growthStage: ''
        };
        
        // Reset filter dropdowns
        const nutrientFilter = document.querySelector(SELECTORS.RATIO_NUTRIENT_FILTER);
        const stageFilter = document.querySelector(SELECTORS.RATIO_STAGE_FILTER);
        
        if (nutrientFilter) nutrientFilter.value = '';
        if (stageFilter) stageFilter.value = '';
        
        // Refresh display
        this.displayRatioRules();
        
        console.log('🧹 Filters cleared');
    }
}