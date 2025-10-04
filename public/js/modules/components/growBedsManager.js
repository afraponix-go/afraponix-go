// Grow Beds Manager Component
// Coordinates all grow bed components and replaces the monolithic GrowBedManager class

import { GrowBeds } from './index.js';
import { GrowBedService } from '../services/index.js';
import { GrowBedValidation } from '../utils/index.js';

/**
 * Grow Beds Manager Component
 * Coordinates grow bed form, list, and chart components
 * Replaces the monolithic GrowBedManager class
 */
export default class GrowBedsManager {
    constructor(app) {
        this.app = app;
        
        // Initialize utilities and services
        this.validation = new GrowBedValidation();
        this.service = new GrowBedService(app);
        
        // Initialize components
        this.form = new GrowBeds.GrowBedForm(this.service, this.validation);
        this.list = new GrowBeds.GrowBedList(this.service, this.form);
        this.chart = new GrowBeds.GrowBedChart(this.service);
        
        // Set up global references for backward compatibility
        this.setupGlobalReferences();
    }

    /**
     * Initialize the grow beds manager
     */
    async initialize() {
        
        // Initialize service and components
        await this.service.initialize();
        await this.list.initialize();
        await this.chart.initialize();
        
    }

    /**
     * Set up global references for backward compatibility
     */
    setupGlobalReferences() {
        // Create global reference for existing HTML onclick handlers
        window.growBedManager = {
            // Form methods
            updateBedFields: (bedNumber) => this.form.updateBedFields(bedNumber),
            calculateBed: (bedNumber) => this.form.calculateBed(bedNumber),
            saveBedConfiguration: (bedNumber) => this.form.saveBedConfiguration(bedNumber),
            deleteBedConfiguration: (bedNumber) => this.form.deleteBedConfiguration(bedNumber),

            // List methods
            generateGrowBedConfiguration: (bedCount) => this.list.generateGrowBedConfiguration(bedCount),

            // Expose the list object for systemConfigManager to use
            list: this.list
        };

        // Also set up on the form component for direct access
        window.growBedForm = this.form;
    }

    /**
     * Generate grow bed configuration (main entry point)
     */
    generateGrowBedConfiguration(bedCount) {
        return this.list.generateGrowBedConfiguration(bedCount);
    }

    /**
     * Display grow bed summary for dashboard
     */
    displayGrowBedSummary(systemId) {
        return this.list.displayGrowBedSummary(systemId);
    }

    /**
     * Create grow bed charts
     */
    createGrowBedCharts(systemId) {
        return this.chart.refreshChartsForSystem(systemId);
    }

    /**
     * Refresh all grow bed displays for system
     */
    async refreshForSystem(systemId) {
        
        try {
            // Refresh all components in parallel
            await Promise.all([
                this.list.refresh(systemId),
                this.chart.refreshChartsForSystem(systemId)
            ]);
            
        } catch (error) {
            console.error('❌ Failed to refresh grow beds:', error);
        }
    }

    /**
     * Validate complete system configuration
     */
    validateSystemConfiguration() {
        const allConfigs = this.form.getGrowBedConfiguration();
        return this.validation.validateSystemBeds(allConfigs);
    }

    /**
     * Get grow bed statistics
     */
    getStatistics() {
        return {
            service: this.service.getServiceStats(),
            validation: this.validation.getValidationStats(),
            charts: this.chart.getChartStats(),
            list: this.list.getBedStatistics()
        };
    }

    /**
     * Handle system change
     */
    async onSystemChange(systemId) {
        await this.refreshForSystem(systemId);
    }

    /**
     * Clean up resources
     */
    destroy() {
        
        // Cleanup charts
        this.chart.destroyCharts();
        
        // Remove global references
        delete window.growBedManager;
        delete window.growBedForm;
        
    }
}