// Spray Application Manager Component
// Handles spray application management, display, and scheduling

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Spray Application Manager Component Class
 * Manages spray application loading, display, and programme management
 */
export class SprayApplicationManagerComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🌿 Spray Application Manager Component initialized');
    }

    /**
     * Load spray applications by category
     * Complexity: 25, Lines: 30
     */
    async loadSprayApplications(category = 'insecticides') {
        if (!this.app.activeSystemId) return;
        
        try {
            // Try to load from API first
            // Add cache-busting parameter to ensure fresh data
            const cacheBuster = Date.now();
            const response = await this.app.makeApiCall(`/spray-programmes?system_id=${this.app.activeSystemId}&_cb=${cacheBuster}`);

            const allApplications = response.programmes || [];

            // If no applications exist, use mock data to show available default sprays
            if (allApplications.length === 0) {
                const mockApplications = this.getMockSprayApplications(category);
                this.displaySprayApplications(mockApplications, category);
                this.updateSprayCalendarMock();
                return;
            }
            
            // Filter applications by category based on programme type or products
            const applications = this.filterApplicationsByCategory(allApplications, category);

            this.displaySprayApplications(applications, category);
            this.updateSprayCalendar();
        } catch (error) {
            // Use mock data until backend endpoints are implemented
            const mockApplications = this.getMockSprayApplications(category);
            this.displaySprayApplications(mockApplications, category);
            this.updateSprayCalendarMock();
        }
    }

    /**
     * Display spray applications in the UI
     * Complexity: 22, Lines: 75
     */
    displaySprayApplications(applications, category) {
        const container = document.getElementById(category + '-list');
        if (!container) return;

        if (applications.length === 0) {
            container.innerHTML = `<p style="color: #666; text-align: center;">No ${category} products available.</p>`;
            return;
        }

        // Get active programmes to check which products are in use
        const programmes = JSON.parse(localStorage.getItem('spray_programmes') || '[]');
        const activeProgrammes = programmes.filter(p => 
            p.systemId === this.app.activeSystemId && p.status === 'active'
        );
        
        // Get IDs of products that are in active programmes
        const productsInProgrammes = new Set();
        activeProgrammes.forEach(programme => {
            programme.selections.insecticides?.forEach(id => productsInProgrammes.add(parseInt(id)));
            programme.selections.fungicides?.forEach(id => productsInProgrammes.add(parseInt(id)));
            programme.selections.foliarFeeds?.forEach(id => productsInProgrammes.add(parseInt(id)));
        });

        // Separate products based on whether they're in active programmes
        const activeApplications = applications.filter(app => productsInProgrammes.has(app.id));
        const inactiveApplications = applications.filter(app => !productsInProgrammes.has(app.id));
        const inactiveApps = applications.filter(app => app.status === 'inactive');
        
        if (inactiveApps.length > 0) {
            console.log(`Found ${inactiveApps.length} inactive applications for ${category}`);
        }

        // Specific debugging for Metarhizium 62
        const metarhizium = applications.find(app => app.product_name.includes('Metarhizium'));
        if (metarhizium) {
            console.log('Metarhizium product found:', metarhizium);
        }

        let html = '';

        // Active Products Section
        if (activeApplications.length > 0) {
            html += `
                <div class="spray-section">
                    <h4 class="spray-section-title active-section">🟢 Products in Active Programmes</h4>
                    <div class="spray-applications-grid">
            `;
            activeApplications.forEach(app => {
                html += this.generateSprayApplicationCard(app, true);
            });
            html += `
                    </div>
                </div>
            `;
        }

        // Inactive Products Section
        if (inactiveApplications.length > 0) {
            html += `
                <div class="spray-section">
                    <h4 class="spray-section-title inactive-section">⚪ Available Products (Not in Programme)</h4>
                    <div class="spray-applications-grid">
            `;
            inactiveApplications.forEach(app => {
                html += this.generateSprayApplicationCard(app, false);
            });
            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * Generate spray application card HTML
     * Complexity: 20, Lines: 85
     */
    generateSprayApplicationCard(app, isInProgramme = false) {
        // Only show next application if product is in an active programme
        const nextApplication = isInProgramme ? this.calculateNextApplication(app) : null;
        
        return `
            <div class="spray-application-card">
                <div class="spray-header">
                    <h5>${app.product_name}</h5>
                    <div class="spray-actions">
                        <button onclick="app.recordSprayApplication(${app.id})" class="record-btn" title="Record Application">
                            <img src="icons/new-icons/Afraponix Go Icons_add.svg" alt="Add" class="btn-icon-svg" style="width: 1em; height: 1em;">
                        </button>
                        <button onclick="app.editSprayProgramme(${app.id})" class="edit-btn" title="Edit Programme">
                            <img src="icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit" class="btn-icon-svg" style="width: 1em; height: 1em;">
                        </button>
                        <button onclick="app.deleteSprayApplication(${app.id})" class="delete-btn" title="Delete">
                            <img src="icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete" class="btn-icon-svg" style="width: 1em; height: 1em;">
                        </button>
                    </div>
                </div>
                <div class="spray-details">
                    ${app.active_ingredient ? `
                        <div class="detail-item">
                            <strong>Active Ingredient:</strong> ${app.active_ingredient}
                        </div>
                    ` : ''}
                    ${app.concentration ? `
                        <div class="detail-item">
                            <strong>Concentration:</strong> ${app.concentration}
                        </div>
                    ` : ''}
                    ${app.application_rate ? `
                        <div class="detail-item">
                            <strong>Application Rate:</strong> ${app.application_rate}
                        </div>
                    ` : ''}
                    ${app.interval_days ? `
                        <div class="detail-item">
                            <strong>Spray Interval:</strong> ${app.interval_days} days
                        </div>
                    ` : ''}
                    ${app.target_pests ? `
                        <div class="detail-item">
                            <strong>Target:</strong> ${app.target_pests}
                        </div>
                    ` : ''}
                    ${app.notes ? `
                        <div class="detail-item">
                            <strong>Notes:</strong> ${app.notes}
                        </div>
                    ` : ''}
                </div>
                ${nextApplication ? `
                    <div class="next-application">
                        <div class="next-app-header">Next Application</div>
                        <div class="next-app-details">
                            <div class="next-date">${nextApplication.date}</div>
                            <div class="days-until">${nextApplication.daysUntil > 0 ? `${nextApplication.daysUntil} days` : nextApplication.daysUntil === 0 ? 'Today' : 'Overdue'}</div>
                        </div>
                    </div>
                ` : ''}
                ${app.last_applied ? `
                    <div class="last-application">
                        <small>Last applied: ${this.app.formatDateDDMMYYYY(new Date(app.last_applied))}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Filter applications by category
     */
    filterApplicationsByCategory(applications, category) {
        return applications.filter(app => {
            // Filter based on product category or type
            if (app.category) {
                return app.category.toLowerCase() === category.toLowerCase();
            }
            // Fallback to product name matching
            const productName = app.product_name.toLowerCase();
            switch(category) {
                case 'insecticides':
                    return productName.includes('insect') || productName.includes('pest') || 
                           productName.includes('aphid') || productName.includes('thrips') ||
                           productName.includes('metarhizium');
                case 'fungicides':
                    return productName.includes('fungi') || productName.includes('disease') ||
                           productName.includes('mold') || productName.includes('blight');
                case 'foliarfeeds':
                    return productName.includes('feed') || productName.includes('nutrient') ||
                           productName.includes('fertilizer') || productName.includes('foliar');
                default:
                    return true;
            }
        });
    }

    /**
     * Calculate next application date
     */
    calculateNextApplication(app) {
        if (!app.last_applied || !app.interval_days) {
            return null;
        }

        const lastApplied = new Date(app.last_applied);
        const nextDate = new Date(lastApplied.getTime() + (app.interval_days * 24 * 60 * 60 * 1000));
        const today = new Date();
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        return {
            date: this.app.formatDateDDMMYYYY(nextDate),
            daysUntil: daysUntil
        };
    }

    /**
     * Get mock spray applications for testing
     */
    getMockSprayApplications(category) {
        const mockData = {
            insecticides: [
                {
                    id: 1,
                    product_name: 'Neem Oil Concentrate',
                    active_ingredient: 'Azadirachtin',
                    concentration: '70%',
                    application_rate: '5ml/L',
                    interval_days: 7,
                    target_pests: 'Aphids, Thrips, Whiteflies',
                    category: 'insecticides'
                },
                {
                    id: 2,
                    product_name: 'Metarhizium anisopliae',
                    active_ingredient: 'Metarhizium spores',
                    concentration: '1×10^8 spores/g',
                    application_rate: '2g/L',
                    interval_days: 14,
                    target_pests: 'Thrips, Root aphids',
                    category: 'insecticides'
                },
                {
                    id: 5,
                    product_name: 'Pyrethrin Extract',
                    active_ingredient: 'Pyrethrins',
                    concentration: '1.4%',
                    application_rate: '3ml/L',
                    interval_days: 5,
                    target_pests: 'Aphids, Caterpillars, Spider mites',
                    category: 'insecticides'
                },
                {
                    id: 6,
                    product_name: 'Beauveria bassiana',
                    active_ingredient: 'Beauveria spores',
                    concentration: '2×10^8 spores/g',
                    application_rate: '1.5g/L',
                    interval_days: 14,
                    target_pests: 'Whiteflies, Aphids, Thrips',
                    category: 'insecticides'
                },
                {
                    id: 7,
                    product_name: 'Spinosad',
                    active_ingredient: 'Spinosyn A & D',
                    concentration: '0.5%',
                    application_rate: '2ml/L',
                    interval_days: 7,
                    target_pests: 'Caterpillars, Leafminers, Thrips',
                    category: 'insecticides'
                },
                {
                    id: 8,
                    product_name: 'Horticultural Oil',
                    active_ingredient: 'Refined petroleum oil',
                    concentration: '98%',
                    application_rate: '10ml/L',
                    interval_days: 14,
                    target_pests: 'Scale insects, Aphids, Spider mites',
                    category: 'insecticides'
                },
                {
                    id: 9,
                    product_name: 'Diatomaceous Earth',
                    active_ingredient: 'Silica',
                    concentration: '100%',
                    application_rate: '5g/L',
                    interval_days: 10,
                    target_pests: 'Soft-bodied insects, Slugs',
                    category: 'insecticides'
                },
                {
                    id: 10,
                    product_name: 'BTK (Bacillus thuringiensis)',
                    active_ingredient: 'Bt kurstaki',
                    concentration: '32,000 IU/mg',
                    application_rate: '1g/L',
                    interval_days: 7,
                    target_pests: 'Caterpillars, Moth larvae',
                    category: 'insecticides'
                }
            ],
            fungicides: [
                {
                    id: 3,
                    product_name: 'Copper Sulfate',
                    active_ingredient: 'Copper Sulfate',
                    concentration: '98%',
                    application_rate: '2g/L',
                    interval_days: 10,
                    target_pests: 'Powdery mildew, Bacterial diseases',
                    category: 'fungicides'
                },
                {
                    id: 11,
                    product_name: 'Copper Hydroxide',
                    active_ingredient: 'Copper Hydroxide',
                    concentration: '77%',
                    application_rate: '2.5g/L',
                    interval_days: 14,
                    target_pests: 'Blight, Bacterial spot, Downy mildew',
                    category: 'fungicides'
                },
                {
                    id: 12,
                    product_name: 'Bacillus subtilis',
                    active_ingredient: 'Bacillus subtilis',
                    concentration: '1×10^9 cfu/g',
                    application_rate: '2g/L',
                    interval_days: 7,
                    target_pests: 'Root rot, Damping off, Powdery mildew',
                    category: 'fungicides'
                },
                {
                    id: 13,
                    product_name: 'Trichoderma harzianum',
                    active_ingredient: 'Trichoderma spores',
                    concentration: '1×10^8 spores/g',
                    application_rate: '3g/L',
                    interval_days: 14,
                    target_pests: 'Root diseases, Soil-borne pathogens',
                    category: 'fungicides'
                },
                {
                    id: 14,
                    product_name: 'Potassium Bicarbonate',
                    active_ingredient: 'Potassium Bicarbonate',
                    concentration: '85%',
                    application_rate: '5g/L',
                    interval_days: 7,
                    target_pests: 'Powdery mildew, Black spot',
                    category: 'fungicides'
                },
                {
                    id: 15,
                    product_name: 'Sulfur Powder',
                    active_ingredient: 'Elemental Sulfur',
                    concentration: '90%',
                    application_rate: '3g/L',
                    interval_days: 10,
                    target_pests: 'Powdery mildew, Rust diseases',
                    category: 'fungicides'
                }
            ],
            foliarfeeds: [
                {
                    id: 4,
                    product_name: 'SeaWeed Extract',
                    active_ingredient: 'Kelp meal',
                    concentration: 'Liquid concentrate',
                    application_rate: '10ml/L',
                    interval_days: 14,
                    target_pests: 'General plant health',
                    category: 'foliarfeeds'
                },
                {
                    id: 16,
                    product_name: 'Calcium-Magnesium Chelate',
                    active_ingredient: 'Ca-EDTA, Mg-EDTA',
                    concentration: '10% Ca, 5% Mg',
                    application_rate: '2ml/L',
                    interval_days: 10,
                    target_pests: 'Calcium/Magnesium deficiency',
                    category: 'foliarfeeds'
                },
                {
                    id: 17,
                    product_name: 'Iron Chelate (EDDHA)',
                    active_ingredient: 'Fe-EDDHA',
                    concentration: '6% Fe',
                    application_rate: '1ml/L',
                    interval_days: 14,
                    target_pests: 'Iron deficiency, Chlorosis',
                    category: 'foliarfeeds'
                },
                {
                    id: 18,
                    product_name: 'Fish Emulsion',
                    active_ingredient: 'Hydrolyzed fish',
                    concentration: '5-1-1 NPK',
                    application_rate: '15ml/L',
                    interval_days: 14,
                    target_pests: 'General nutrition',
                    category: 'foliarfeeds'
                },
                {
                    id: 19,
                    product_name: 'Liquid Trace Elements',
                    active_ingredient: 'Multi-mineral blend',
                    concentration: 'Zn, Mn, B, Mo, Cu',
                    application_rate: '1ml/L',
                    interval_days: 21,
                    target_pests: 'Micronutrient deficiencies',
                    category: 'foliarfeeds'
                },
                {
                    id: 20,
                    product_name: 'Humic Acid Solution',
                    active_ingredient: 'Humic acid',
                    concentration: '12%',
                    application_rate: '5ml/L',
                    interval_days: 14,
                    target_pests: 'Nutrient uptake enhancement',
                    category: 'foliarfeeds'
                },
                {
                    id: 21,
                    product_name: 'Silica Solution',
                    active_ingredient: 'Potassium Silicate',
                    concentration: '7.8% Si',
                    application_rate: '2ml/L',
                    interval_days: 7,
                    target_pests: 'Plant strengthening, pest resistance',
                    category: 'foliarfeeds'
                },
                {
                    id: 22,
                    product_name: 'Amino Acid Complex',
                    active_ingredient: 'Free amino acids',
                    concentration: '20% amino acids',
                    application_rate: '3ml/L',
                    interval_days: 10,
                    target_pests: 'Stress recovery, growth stimulation',
                    category: 'foliarfeeds'
                },
                {
                    id: 23,
                    product_name: 'Fulvic Acid',
                    active_ingredient: 'Fulvic acid',
                    concentration: '15%',
                    application_rate: '2ml/L',
                    interval_days: 7,
                    target_pests: 'Nutrient chelation, root development',
                    category: 'foliarfeeds'
                }
            ]
        };

        return mockData[category] || [];
    }

    /**
     * Update spray calendar (placeholder)
     */
    updateSprayCalendar() {
        // Implementation for spray calendar updates
        console.log('Updating spray calendar with real data');
    }

    /**
     * Update spray calendar with mock data
     */
    updateSprayCalendarMock() {
        // Implementation for mock spray calendar
        console.log('Updating spray calendar with mock data');
    }

    /**
     * Record spray application
     */
    async recordSprayApplication(applicationId) {
        try {
            // Delegate to app for modal handling
            if (this.app.recordSprayApplication && typeof this.app.recordSprayApplication === 'function') {
                return this.app.recordSprayApplication(applicationId);
            } else {
                console.warn('recordSprayApplication method not found in app');
            }
        } catch (error) {
            console.error('Error recording spray application:', error);
            this.app.showNotification('Failed to record spray application', 'error');
        }
    }

    /**
     * Edit spray programme
     */
    async editSprayProgramme(programmeId) {
        try {
            // Delegate to app for modal handling
            if (this.app.editSprayProgramme && typeof this.app.editSprayProgramme === 'function') {
                return this.app.editSprayProgramme(programmeId);
            } else {
                console.warn('editSprayProgramme method not found in app');
            }
        } catch (error) {
            console.error('Error editing spray programme:', error);
            this.app.showNotification('Failed to edit spray programme', 'error');
        }
    }

    /**
     * Delete spray application
     */
    async deleteSprayApplication(applicationId) {
        if (!confirm('Are you sure you want to delete this spray application?')) {
            return;
        }

        try {
            await this.app.makeApiCall(`/spray-programmes/${applicationId}`, {
                method: 'DELETE'
            });

            this.app.showNotification('Spray application deleted successfully', 'success');
            
            // Reload the spray applications
            await this.loadSprayApplications();
        } catch (error) {
            console.error('Error deleting spray application:', error);
            this.app.showNotification('Failed to delete spray application: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            hasActiveSystem: !!this.app.activeSystemId
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Spray Application Manager component');
    }
}

// Export both class and create a factory function
export default SprayApplicationManagerComponent;

/**
 * Factory function to create spray application manager component
 */
export function createSprayApplicationManagerComponent(app) {
    return new SprayApplicationManagerComponent(app);
}