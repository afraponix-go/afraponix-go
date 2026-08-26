// Nutrient Alerts Component
// Handles nutrient-related alerts, warnings, and notifications

import { 
    MESSAGE_TYPES,
    CALCULATION_FACTORS,
    VALIDATION_RULES,
    DEFAULTS
} from '../../constants/nutrientConstants.js';

/**
 * Nutrient Alerts Component
 * Provides intelligent alerting for nutrient management issues
 */
export default class NutrientAlerts {
    constructor(calculator, validation) {
        this.calculator = calculator;
        this.validation = validation;
        
        // Alert configuration
        this.alertConfig = {
            enabled: true,
            thresholds: {
                lowEc: 0.8,
                highEc: 3.5,
                lowPh: 5.0,
                highPh: 7.0,
                extremeRatio: 5.0,
                lowMultiplier: 0.3,
                highMultiplier: 2.5
            },
            dismissedAlerts: new Set()
        };
        
        // Alert statistics
        this.alertStats = {
            alertsGenerated: 0,
            criticalAlerts: 0,
            warningAlerts: 0,
            infoAlerts: 0,
            alertsDismissed: 0
        };
        
        // Active alerts
        this.activeAlerts = new Map();
        
        console.log('🚨 Nutrient Alerts Component initialized');
    }

    /**
     * Initialize alerts component
     */
    async initialize() {
        console.log('🔄 Initializing Nutrient Alerts...');
        
        try {
            this.loadAlertConfiguration();
            this.setupPeriodicChecks();
            console.log('✅ Nutrient Alerts initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Nutrient Alerts:', error);
            throw error;
        }
    }

    /**
     * Load alert configuration from localStorage
     */
    loadAlertConfiguration() {
        try {
            const saved = localStorage.getItem('nutrientAlertConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.alertConfig = { ...this.alertConfig, ...config };
            }
        } catch (error) {
            console.warn('Failed to load alert configuration:', error);
        }
    }

    /**
     * Save alert configuration to localStorage
     */
    saveAlertConfiguration() {
        try {
            localStorage.setItem('nutrientAlertConfig', JSON.stringify(this.alertConfig));
        } catch (error) {
            console.warn('Failed to save alert configuration:', error);
        }
    }

    /**
     * Set up periodic nutrient checks
     */
    setupPeriodicChecks() {
        // Check for nutrient issues every 30 seconds
        setInterval(() => {
            if (this.alertConfig.enabled) {
                this.checkNutrientIssues();
            }
        }, 30000);
        
        // Cleanup dismissed alerts every hour
        setInterval(() => {
            this.cleanupDismissedAlerts();
        }, 3600000);
    }

    // =====================================================
    // ALERT CHECKING METHODS
    // =====================================================

    /**
     * Check for various nutrient-related issues
     */
    async checkNutrientIssues() {
        try {
            const issues = [];
            
            // Check ratio rule conflicts
            issues.push(...this.checkRatioRuleConflicts());
            
            // Check missing critical nutrients
            issues.push(...this.checkMissingCriticalNutrients());
            
            // Check extreme ratio values
            issues.push(...this.checkExtremeRatioValues());
            
            // Check environmental parameter issues
            issues.push(...await this.checkEnvironmentalIssues());
            
            // Process and display issues
            this.processIssues(issues);
            
        } catch (error) {
            console.error('Error checking nutrient issues:', error);
        }
    }

    /**
     * Check for conflicting ratio rules
     */
    checkRatioRuleConflicts() {
        const conflicts = [];
        const ruleMap = new Map();
        
        this.calculator.ratioRules.forEach(rule => {
            const key = `${rule.nutrient}-${rule.growth_stage || 'general'}`;
            
            if (ruleMap.has(key)) {
                const existingRule = ruleMap.get(key);
                conflicts.push({
                    type: 'conflict',
                    severity: 'critical',
                    title: 'Duplicate Ratio Rule',
                    message: `Multiple rules found for ${rule.nutrient} in ${rule.growth_stage || 'general'} stage`,
                    details: {
                        nutrient: rule.nutrient,
                        growthStage: rule.growth_stage,
                        rules: [existingRule, rule]
                    },
                    action: 'Review and remove duplicate rules'
                });
            } else {
                ruleMap.set(key, rule);
            }
        });
        
        return conflicts;
    }

    /**
     * Check for missing critical nutrients
     */
    checkMissingCriticalNutrients() {
        const missing = [];
        const criticalNutrients = ['n', 'p', 'k', 'ca', 'mg', 's']; // NPK + secondary macros
        
        const availableNutrients = new Set(this.calculator.ratioRules.map(rule => rule.nutrient));
        
        criticalNutrients.forEach(nutrient => {
            if (!availableNutrients.has(nutrient)) {
                const nutrientData = this.calculator.getNutrientByCode(nutrient);
                missing.push({
                    type: 'missing_nutrient',
                    severity: 'warning',
                    title: 'Missing Critical Nutrient',
                    message: `No ratio rules defined for ${nutrientData ? nutrientData.name : nutrient}`,
                    details: {
                        nutrient,
                        nutrientData
                    },
                    action: 'Add ratio rules for this essential nutrient'
                });
            }
        });
        
        return missing;
    }

    /**
     * Check for extreme ratio values
     */
    checkExtremeRatioValues() {
        const extreme = [];
        
        this.calculator.ratioRules.forEach(rule => {
            const ratio = parseFloat(rule.ratio);
            
            if (ratio > this.alertConfig.thresholds.extremeRatio) {
                const nutrientData = this.calculator.getNutrientByCode(rule.nutrient);
                extreme.push({
                    type: 'extreme_ratio',
                    severity: 'warning',
                    title: 'Extreme Ratio Value',
                    message: `Very high ratio (${ratio}) for ${nutrientData ? nutrientData.name : rule.nutrient}`,
                    details: {
                        nutrient: rule.nutrient,
                        ratio,
                        rule
                    },
                    action: 'Verify ratio value is correct'
                });
            }
            
            if (rule.multiplier) {
                const multiplier = parseFloat(rule.multiplier);
                if (multiplier < this.alertConfig.thresholds.lowMultiplier || 
                    multiplier > this.alertConfig.thresholds.highMultiplier) {
                    extreme.push({
                        type: 'extreme_multiplier',
                        severity: 'info',
                        title: 'Unusual Multiplier',
                        message: `Multiplier (${multiplier}) is outside typical range for ${nutrientData ? nutrientData.name : rule.nutrient}`,
                        details: {
                            nutrient: rule.nutrient,
                            multiplier,
                            rule
                        },
                        action: 'Review multiplier value'
                    });
                }
            }
        });
        
        return extreme;
    }

    /**
     * Check for environmental parameter issues
     */
    async checkEnvironmentalIssues() {
        const issues = [];
        
        // This would typically check current system environmental data
        // For now, we'll check environmental adjustments for potential issues
        
        this.calculator.environmentalAdjustments.forEach(adjustment => {
            const multiplier = parseFloat(adjustment.multiplier);
            
            if (multiplier < 0.5 || multiplier > 2.0) {
                const paramData = this.calculator.environmentalParameters.find(p => p.code === adjustment.parameter);
                issues.push({
                    type: 'extreme_environmental_adjustment',
                    severity: 'warning',
                    title: 'Extreme Environmental Adjustment',
                    message: `Large adjustment multiplier (${multiplier}) for ${paramData ? paramData.name : adjustment.parameter}`,
                    details: {
                        parameter: adjustment.parameter,
                        multiplier,
                        adjustment
                    },
                    action: 'Verify adjustment value is appropriate'
                });
            }
        });
        
        return issues;
    }

    /**
     * Check specific system nutrient balance
     */
    checkSystemNutrientBalance(systemId, currentNutrientLevels) {
        const issues = [];
        
        if (!currentNutrientLevels) return issues;
        
        // Check EC levels
        if (currentNutrientLevels.ec) {
            const ec = parseFloat(currentNutrientLevels.ec);
            
            if (ec < this.alertConfig.thresholds.lowEc) {
                issues.push({
                    type: 'low_ec',
                    severity: 'warning',
                    title: 'Low EC Level',
                    message: `EC level (${ec} mS/cm) is below optimal range`,
                    details: { ec, systemId },
                    action: 'Consider increasing nutrient concentration'
                });
            } else if (ec > this.alertConfig.thresholds.highEc) {
                issues.push({
                    type: 'high_ec',
                    severity: 'critical',
                    title: 'High EC Level',
                    message: `EC level (${ec} mS/cm) is dangerously high`,
                    details: { ec, systemId },
                    action: 'Dilute nutrient solution immediately'
                });
            }
        }
        
        // Check pH levels
        if (currentNutrientLevels.ph) {
            const ph = parseFloat(currentNutrientLevels.ph);
            
            if (ph < this.alertConfig.thresholds.lowPh) {
                issues.push({
                    type: 'low_ph',
                    severity: 'critical',
                    title: 'Low pH Level',
                    message: `pH level (${ph}) is too acidic`,
                    details: { ph, systemId },
                    action: 'Add pH up solution to raise pH'
                });
            } else if (ph > this.alertConfig.thresholds.highPh) {
                issues.push({
                    type: 'high_ph',
                    severity: 'critical',
                    title: 'High pH Level',
                    message: `pH level (${ph}) is too alkaline`,
                    details: { ph, systemId },
                    action: 'Add pH down solution to lower pH'
                });
            }
        }
        
        return issues;
    }

    // =====================================================
    // ALERT PROCESSING AND DISPLAY
    // =====================================================

    /**
     * Process and display issues
     */
    processIssues(issues) {
        issues.forEach(issue => {
            const alertId = this.generateAlertId(issue);
            
            // Skip if alert was dismissed recently
            if (this.alertConfig.dismissedAlerts.has(alertId)) {
                return;
            }
            
            // Skip if same alert is already active
            if (this.activeAlerts.has(alertId)) {
                return;
            }
            
            // Create and display alert
            this.createAlert(alertId, issue);
        });
    }

    /**
     * Create and display an alert
     */
    createAlert(alertId, issue) {
        this.alertStats.alertsGenerated++;
        
        // Update severity statistics
        switch (issue.severity) {
            case 'critical':
                this.alertStats.criticalAlerts++;
                break;
            case 'warning':
                this.alertStats.warningAlerts++;
                break;
            case 'info':
                this.alertStats.infoAlerts++;
                break;
        }
        
        // Store active alert
        this.activeAlerts.set(alertId, {
            ...issue,
            id: alertId,
            timestamp: new Date().toISOString(),
            dismissed: false
        });
        
        // Display alert
        this.displayAlert(issue);
        
        console.log(`🚨 Created ${issue.severity} alert: ${issue.title}`);
    }

    /**
     * Display alert to user
     */
    displayAlert(issue) {
        // Use app's notification system if available
        if (window.app?.showNotification) {
            const duration = issue.severity === 'critical' ? 10000 : 5000;
            window.app.showNotification(
                `${issue.title}: ${issue.message}`,
                issue.severity === 'critical' ? 'error' : 
                issue.severity === 'warning' ? 'warning' : 'info',
                duration
            );
        }
        
        // Also create persistent alert in alerts panel if it exists
        this.addToPersistentAlerts(issue);
    }

    /**
     * Add alert to persistent alerts panel
     */
    addToPersistentAlerts(issue) {
        const alertsContainer = document.getElementById('nutrient-alerts-container');
        if (!alertsContainer) return;
        
        const alertElement = this.createAlertElement(issue);
        alertsContainer.appendChild(alertElement);
        
        // Auto-remove after some time for non-critical alerts
        if (issue.severity !== 'critical') {
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 30000);
        }
    }

    /**
     * Create DOM element for alert
     */
    createAlertElement(issue) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `nutrient-alert nutrient-alert-${issue.severity}`;
        alertDiv.setAttribute('data-alert-id', this.generateAlertId(issue));
        
        alertDiv.innerHTML = `
            <div class="alert-icon">
                ${this.getAlertIcon(issue.severity)}
            </div>
            <div class="alert-content">
                <div class="alert-title">${issue.title}</div>
                <div class="alert-message">${issue.message}</div>
                ${issue.action ? `<div class="alert-action">Action: ${issue.action}</div>` : ''}
                <div class="alert-timestamp">${new Date().toLocaleString()}</div>
            </div>
            <div class="alert-actions">
                <button class="alert-dismiss" onclick="app.nutrientAlerts.dismissAlert('${this.generateAlertId(issue)}')">
                    ✕
                </button>
            </div>
        `;
        
        return alertDiv;
    }

    /**
     * Get appropriate icon for alert severity
     */
    getAlertIcon(severity) {
        switch (severity) {
            case 'critical':
                return '🚨';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return '📢';
        }
    }

    /**
     * Generate unique alert ID
     */
    generateAlertId(issue) {
        const key = `${issue.type}-${issue.details?.nutrient || ''}-${issue.details?.systemId || ''}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    // =====================================================
    // ALERT MANAGEMENT
    // =====================================================

    /**
     * Dismiss specific alert
     */
    dismissAlert(alertId) {
        // Add to dismissed alerts
        this.alertConfig.dismissedAlerts.add(alertId);
        this.alertStats.alertsDismissed++;
        
        // Remove from active alerts
        this.activeAlerts.delete(alertId);
        
        // Remove from DOM
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.remove();
        }
        
        // Save configuration
        this.saveAlertConfiguration();
        
        console.log(`🗑️ Dismissed alert: ${alertId}`);
    }

    /**
     * Dismiss all alerts
     */
    dismissAllAlerts() {
        // Add all active alerts to dismissed list
        this.activeAlerts.forEach((alert, alertId) => {
            this.alertConfig.dismissedAlerts.add(alertId);
            this.alertStats.alertsDismissed++;
        });
        
        // Clear active alerts
        this.activeAlerts.clear();
        
        // Remove all alert elements
        document.querySelectorAll('.nutrient-alert').forEach(el => el.remove());
        
        // Save configuration
        this.saveAlertConfiguration();
        
        console.log('🗑️ Dismissed all alerts');
    }

    /**
     * Clean up old dismissed alerts
     */
    cleanupDismissedAlerts() {
        // Keep dismissed alerts for 24 hours
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        
        // For now, just limit the size of dismissed alerts set
        if (this.alertConfig.dismissedAlerts.size > 100) {
            // Convert to array, keep last 50 items
            const dismissedArray = Array.from(this.alertConfig.dismissedAlerts);
            this.alertConfig.dismissedAlerts = new Set(dismissedArray.slice(-50));
            this.saveAlertConfiguration();
        }
    }

    /**
     * Enable/disable alerts
     */
    setAlertsEnabled(enabled) {
        this.alertConfig.enabled = enabled;
        this.saveAlertConfiguration();
        
        console.log(`🚨 Alerts ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update alert thresholds
     */
    updateAlertThresholds(newThresholds) {
        this.alertConfig.thresholds = { ...this.alertConfig.thresholds, ...newThresholds };
        this.saveAlertConfiguration();
        
        console.log('⚙️ Alert thresholds updated');
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get current active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Get alerts statistics
     */
    getAlertStats() {
        return {
            ...this.alertStats,
            activeAlerts: this.activeAlerts.size,
            dismissedAlerts: this.alertConfig.dismissedAlerts.size,
            alertsEnabled: this.alertConfig.enabled
        };
    }

    /**
     * Generate nutrient status report
     */
    generateStatusReport() {
        return {
            timestamp: new Date().toISOString(),
            systemHealth: this.assessSystemHealth(),
            activeIssues: this.getActiveAlerts(),
            recommendations: this.generateRecommendations(),
            statistics: this.getAlertStats()
        };
    }

    /**
     * Assess overall system health
     */
    assessSystemHealth() {
        const criticalCount = this.alertStats.criticalAlerts;
        const warningCount = this.alertStats.warningAlerts;
        
        if (criticalCount > 0) {
            return 'critical';
        } else if (warningCount > 2) {
            return 'warning';
        } else if (warningCount > 0) {
            return 'caution';
        } else {
            return 'good';
        }
    }

    /**
     * Generate recommendations based on current issues
     */
    generateRecommendations() {
        const recommendations = [];
        const activeAlerts = this.getActiveAlerts();
        
        // Analyze patterns in active alerts
        const alertsByType = new Map();
        activeAlerts.forEach(alert => {
            if (!alertsByType.has(alert.type)) {
                alertsByType.set(alert.type, []);
            }
            alertsByType.get(alert.type).push(alert);
        });
        
        // Generate specific recommendations
        alertsByType.forEach((alerts, type) => {
            switch (type) {
                case 'conflict':
                    recommendations.push('Review and consolidate conflicting ratio rules to avoid confusion');
                    break;
                case 'missing_nutrient':
                    recommendations.push('Add ratio rules for missing essential nutrients');
                    break;
                case 'extreme_ratio':
                    recommendations.push('Verify high ratio values are intentional and appropriate');
                    break;
                case 'low_ec':
                    recommendations.push('Increase nutrient concentration to improve plant uptake');
                    break;
                case 'high_ec':
                    recommendations.push('Dilute solution immediately to prevent plant damage');
                    break;
            }
        });
        
        return recommendations;
    }

    /**
     * Reset alert statistics
     */
    resetAlertStats() {
        this.alertStats = {
            alertsGenerated: 0,
            criticalAlerts: 0,
            warningAlerts: 0,
            infoAlerts: 0,
            alertsDismissed: 0
        };
        
        console.log('📊 Alert statistics reset');
    }
}