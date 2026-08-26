// Spray API Module
// Handles spray programs and pest management operations with comprehensive CRUD functionality

import { apiClient } from './baseApiClient.js';

/**
 * Spray API operations using the BaseApiClient for standardized patterns
 */
export class SprayAPI {
    constructor(client = apiClient) {
        this.client = client;
    }

    // ================== SPRAY PROGRAMME OPERATIONS ==================

    /**
     * Get all spray programmes for a system
     * @param {string} systemId - System ID
     * @returns {Promise<Object>} Spray programmes data
     */
    async getSprayProgrammes(systemId) {
        try {
            const params = new URLSearchParams({ system_id: systemId });
            return await this.client.get(`/spray-programmes?${params.toString()}`);
        } catch (error) {
            console.error('❌ Failed to fetch spray programmes:', error);
            throw new Error(`Failed to get spray programmes: ${error.message}`);
        }
    }

    /**
     * Create a new spray programme
     * @param {Object} programmeData - Spray programme data
     * @param {string} programmeData.system_id - System ID
     * @param {string} programmeData.category - Programme category
     * @param {string} programmeData.product_name - Product name
     * @param {string} programmeData.active_ingredient - Active ingredient
     * @param {string} programmeData.target_pest - Target pest/disease/nutrient type
     * @param {string} programmeData.application_rate - Application rate
     * @param {string} programmeData.rate_unit - Rate unit (optional)
     * @param {number} programmeData.frequency_days - Frequency in days
     * @param {string} programmeData.start_date - Start date
     * @param {string} programmeData.end_date - End date
     * @param {string} programmeData.notes - Additional notes
     * @returns {Promise<Object>} Creation result
     */
    async createSprayProgramme(programmeData) {
        try {
            return await this.client.post('/spray-programmes', programmeData);
        } catch (error) {
            console.error('❌ Failed to create spray programme:', error);
            throw new Error(`Failed to create spray programme: ${error.message}`);
        }
    }

    /**
     * Update an existing spray programme
     * @param {string} programmeId - Programme ID
     * @param {Object} updateData - Updated programme data
     * @returns {Promise<Object>} Update result
     */
    async updateSprayProgramme(programmeId, updateData) {
        try {
            return await this.client.put(`/spray-programmes/${programmeId}`, updateData);
        } catch (error) {
            console.error('❌ Failed to update spray programme:', error);
            throw new Error(`Failed to update spray programme: ${error.message}`);
        }
    }

    /**
     * Delete/deactivate a spray programme
     * @param {string} programmeId - Programme ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteSprayProgramme(programmeId) {
        try {
            return await this.client.delete(`/spray-programmes/${programmeId}`);
        } catch (error) {
            console.error('❌ Failed to delete spray programme:', error);
            throw new Error(`Failed to delete spray programme: ${error.message}`);
        }
    }

    // ================== SPRAY APPLICATION OPERATIONS ==================

    /**
     * Record a spray programme application
     * @param {Object} applicationData - Application record data
     * @param {string} applicationData.programme_id - Programme ID
     * @param {string} applicationData.products_used - Products used
     * @param {string} applicationData.amount_used - Amount used
     * @param {string} applicationData.application_date - Application date
     * @param {string} applicationData.dilution_rate - Dilution rate
     * @param {string} applicationData.volume_applied - Volume applied
     * @param {string} applicationData.weather_conditions - Weather conditions
     * @param {number} applicationData.effectiveness_rating - Effectiveness rating (1-5)
     * @param {string} applicationData.notes - Application notes
     * @returns {Promise<Object>} Recording result
     */
    async recordSprayApplication(applicationData) {
        try {
            return await this.client.post('/spray-programmes/record', applicationData);
        } catch (error) {
            console.error('❌ Failed to record spray application:', error);
            throw new Error(`Failed to record spray application: ${error.message}`);
        }
    }

    /**
     * Get application history for a spray programme
     * @param {string} programmeId - Programme ID
     * @returns {Promise<Object>} Application history
     */
    async getSprayApplicationHistory(programmeId) {
        try {
            return await this.client.get(`/spray-programmes/${programmeId}/history`);
        } catch (error) {
            console.error('❌ Failed to fetch spray application history:', error);
            throw new Error(`Failed to get spray application history: ${error.message}`);
        }
    }

    // ================== CALENDAR AND SCHEDULING ==================

    /**
     * Get spray programme calendar/schedule
     * @param {string} systemId - System ID
     * @param {number} month - Month (1-12)
     * @param {number} year - Year
     * @returns {Promise<Object>} Calendar data
     */
    async getSprayCalendar(systemId, month = null, year = null) {
        try {
            const params = new URLSearchParams({ system_id: systemId });
            if (month) params.append('month', month.toString());
            if (year) params.append('year', year.toString());
            
            return await this.client.get(`/spray-programmes/calendar?${params.toString()}`);
        } catch (error) {
            console.error('❌ Failed to fetch spray calendar:', error);
            throw new Error(`Failed to get spray calendar: ${error.message}`);
        }
    }

    /**
     * Get upcoming spray applications for a system
     * @param {string} systemId - System ID
     * @param {number} days - Days ahead to look (default: 7)
     * @returns {Promise<Array>} Upcoming applications
     */
    async getUpcomingApplications(systemId, days = 7) {
        try {
            const calendar = await this.getSprayCalendar(systemId);
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + days);
            
            if (calendar.schedules) {
                return calendar.schedules.filter(schedule => {
                    const scheduleDate = new Date(schedule.date);
                    return scheduleDate >= today && scheduleDate <= futureDate;
                });
            }
            
            return [];
        } catch (error) {
            console.error('❌ Failed to get upcoming applications:', error);
            throw new Error(`Failed to get upcoming applications: ${error.message}`);
        }
    }

    // ================== DEFAULT PROGRAMME MANAGEMENT ==================

    /**
     * Create default spray programmes for a new system
     * @param {string} systemId - System ID
     * @param {boolean} force - Force recreation of programmes (deletes existing)
     * @returns {Promise<Object>} Creation result
     */
    async createDefaultProgrammes(systemId, force = false) {
        try {
            return await this.client.post('/spray-programmes/create-defaults', {
                system_id: systemId,
                force
            });
        } catch (error) {
            console.error('❌ Failed to create default spray programmes:', error);
            throw new Error(`Failed to create default programmes: ${error.message}`);
        }
    }

    // ================== PROGRAMME CATEGORIES AND TYPES ==================

    /**
     * Get available spray programme categories
     * @returns {Object} Programme categories and their details
     */
    getProgrammeCategories() {
        return {
            'insecticides': {
                name: 'Insecticides',
                description: 'Products for controlling insects and pests',
                targetField: 'target_pest',
                color: '#ff6b6b',
                icon: '🐛'
            },
            'fungicides': {
                name: 'Fungicides',
                description: 'Products for controlling fungal diseases',
                targetField: 'target_disease',
                color: '#4ecdc4',
                icon: '🍄'
            },
            'foliar-feeds': {
                name: 'Foliar Feeds',
                description: 'Foliar nutrition and supplements',
                targetField: 'nutrient_type',
                color: '#45b7d1',
                icon: '🌱'
            },
            'soil-drenches': {
                name: 'Soil Drenches',
                description: 'Root zone treatments and soil amendments',
                targetField: 'treatment_type',
                color: '#96ceb4',
                icon: '🌿'
            }
        };
    }

    /**
     * Get common pests and diseases for targeting
     * @returns {Object} Organized pest and disease lists
     */
    getCommonTargets() {
        return {
            pests: [
                'Aphids',
                'Two-Spotted Mite',
                'European Red Mite',
                'Thrips',
                'Whitefly',
                'Bollworm',
                'Snout Beetle',
                'Codling Moth',
                'Fruit Fly',
                'Lawn Caterpillar'
            ],
            diseases: [
                'Downy Mildew',
                'Powdery Mildew',
                'Pythium',
                'Root Rot',
                'Leaf Spot',
                'Bacterial Blight'
            ],
            nutrients: [
                'Nitrogen Deficiency',
                'Phosphorus Deficiency',
                'Potassium Deficiency',
                'Calcium Deficiency',
                'Magnesium Deficiency',
                'Iron Deficiency',
                'Complete Nutrition',
                'Micronutrient Boost',
                'Silicon Supplementation'
            ]
        };
    }

    // ================== PROGRAMME ANALYTICS ==================

    /**
     * Get spray programme effectiveness analytics
     * @param {string} systemId - System ID
     * @param {string} period - Analysis period ('30d', '90d', '1y')
     * @returns {Promise<Object>} Analytics data
     */
    async getSprayAnalytics(systemId, period = '90d') {
        try {
            const programmes = await this.getSprayProgrammes(systemId);
            
            if (!programmes.programmes) {
                return { applications: 0, effectiveness: 0, categories: {} };
            }
            
            const analytics = {
                totalProgrammes: programmes.programmes.length,
                activeProgrammes: programmes.programmes.filter(p => p.status === 'active').length,
                appliedProgrammes: programmes.programmes.filter(p => p.applied).length,
                categories: {}
            };
            
            // Group by category
            programmes.programmes.forEach(programme => {
                if (!analytics.categories[programme.category]) {
                    analytics.categories[programme.category] = {
                        total: 0,
                        applied: 0,
                        effectiveness: []
                    };
                }
                analytics.categories[programme.category].total++;
                if (programme.applied) {
                    analytics.categories[programme.category].applied++;
                }
            });
            
            return analytics;
        } catch (error) {
            console.error('❌ Failed to get spray analytics:', error);
            throw new Error(`Failed to get spray analytics: ${error.message}`);
        }
    }

    // ================== BULK OPERATIONS ==================

    /**
     * Create multiple spray programmes at once
     * @param {Array} programmes - Array of programme data objects
     * @returns {Promise<Array>} Creation results
     */
    async createMultipleProgrammes(programmes) {
        try {
            const results = [];
            
            for (const programme of programmes) {
                try {
                    const result = await this.createSprayProgramme(programme);
                    results.push({ success: true, programme: programme.product_name, result });
                } catch (error) {
                    results.push({ 
                        success: false, 
                        programme: programme.product_name, 
                        error: error.message 
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('❌ Failed to create multiple programmes:', error);
            throw new Error(`Failed to create multiple programmes: ${error.message}`);
        }
    }

    /**
     * Record multiple spray applications
     * @param {Array} applications - Array of application data objects
     * @returns {Promise<Array>} Recording results
     */
    async recordMultipleApplications(applications) {
        try {
            const results = [];
            
            for (const application of applications) {
                try {
                    const result = await this.recordSprayApplication(application);
                    results.push({ success: true, application, result });
                } catch (error) {
                    results.push({ 
                        success: false, 
                        application, 
                        error: error.message 
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('❌ Failed to record multiple applications:', error);
            throw new Error(`Failed to record multiple applications: ${error.message}`);
        }
    }

    // ================== VALIDATION UTILITIES ==================

    /**
     * Validate spray programme data
     * @param {Object} programmeData - Programme data to validate
     * @returns {Object} Validation result
     */
    validateProgrammeData(programmeData) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Required fields validation
        const requiredFields = ['system_id', 'category', 'product_name'];
        requiredFields.forEach(field => {
            if (!programmeData[field]) {
                validation.valid = false;
                validation.errors.push(`${field} is required`);
            }
        });

        // Category validation
        const validCategories = Object.keys(this.getProgrammeCategories());
        if (programmeData.category && !validCategories.includes(programmeData.category)) {
            validation.valid = false;
            validation.errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
        }

        // Date validation
        if (programmeData.start_date && programmeData.end_date) {
            const startDate = new Date(programmeData.start_date);
            const endDate = new Date(programmeData.end_date);
            
            if (endDate <= startDate) {
                validation.valid = false;
                validation.errors.push('End date must be after start date');
            }
        }

        // Frequency validation
        if (programmeData.frequency_days && programmeData.frequency_days < 1) {
            validation.valid = false;
            validation.errors.push('Frequency days must be at least 1');
        }

        return validation;
    }

    /**
     * Validate application data
     * @param {Object} applicationData - Application data to validate
     * @returns {Object} Validation result
     */
    validateApplicationData(applicationData) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Required fields validation
        const requiredFields = ['programme_id', 'application_date'];
        requiredFields.forEach(field => {
            if (!applicationData[field]) {
                validation.valid = false;
                validation.errors.push(`${field} is required`);
            }
        });

        // Date validation
        if (applicationData.application_date) {
            const appDate = new Date(applicationData.application_date);
            const today = new Date();
            
            if (appDate > today) {
                validation.warnings.push('Application date is in the future');
            }
        }

        // Effectiveness rating validation
        if (applicationData.effectiveness_rating && 
            (applicationData.effectiveness_rating < 1 || applicationData.effectiveness_rating > 5)) {
            validation.valid = false;
            validation.errors.push('Effectiveness rating must be between 1 and 5');
        }

        return validation;
    }

    // ================== UTILITY METHODS ==================

    /**
     * Format programme data for display
     * @param {Object} programme - Raw programme data
     * @returns {Object} Formatted programme data
     */
    formatProgrammeForDisplay(programme) {
        const categories = this.getProgrammeCategories();
        const category = categories[programme.category] || { name: programme.category, color: '#666', icon: '🧪' };
        
        return {
            ...programme,
            categoryName: category.name,
            categoryColor: category.color,
            categoryIcon: category.icon,
            formattedRate: this.formatApplicationRate(programme.application_rate),
            nextDue: this.calculateNextApplication(programme),
            daysUntilNext: this.calculateDaysUntilNext(programme)
        };
    }

    /**
     * Format application rate for display
     * @param {string} rate - Raw application rate
     * @returns {string} Formatted rate
     */
    formatApplicationRate(rate) {
        if (!rate) return '';
        
        // Handle common rate formats
        return rate
            .replace(/per 10L/gi, '/10L')
            .replace(/per litre/gi, '/L')
            .replace(/percent/gi, '%')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate next application date
     * @param {Object} programme - Programme data
     * @returns {Date|null} Next application date
     */
    calculateNextApplication(programme) {
        if (!programme.last_application || !programme.frequency_days) {
            return null;
        }
        
        const lastApp = new Date(programme.last_application);
        const nextApp = new Date(lastApp);
        nextApp.setDate(lastApp.getDate() + programme.frequency_days);
        
        return nextApp;
    }

    /**
     * Calculate days until next application
     * @param {Object} programme - Programme data
     * @returns {number|null} Days until next application
     */
    calculateDaysUntilNext(programme) {
        const nextApp = this.calculateNextApplication(programme);
        if (!nextApp) return null;
        
        const today = new Date();
        const diffTime = nextApp - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    /**
     * Generate programme schedule for a period
     * @param {Object} programme - Programme data
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Array of scheduled dates
     */
    generateProgrammeSchedule(programme, startDate, endDate) {
        if (!programme.frequency_days) return [];
        
        const schedule = [];
        let currentDate = new Date(programme.start_date || startDate);
        
        while (currentDate <= endDate) {
            if (currentDate >= startDate) {
                schedule.push({
                    date: new Date(currentDate),
                    programme: programme.product_name,
                    category: programme.category,
                    rate: programme.application_rate,
                    notes: programme.notes
                });
            }
            
            currentDate.setDate(currentDate.getDate() + programme.frequency_days);
        }
        
        return schedule;
    }
}

// Create default instance
const sprayAPI = new SprayAPI();

// Export both class and default instance
export { sprayAPI };
export default sprayAPI;

// Legacy function exports for backward compatibility
export const getSprayProgrammes = (systemId) => sprayAPI.getSprayProgrammes(systemId);
export const createSprayProgramme = (data) => sprayAPI.createSprayProgramme(data);
export const updateSprayProgramme = (id, data) => sprayAPI.updateSprayProgramme(id, data);
export const deleteSprayProgramme = (id) => sprayAPI.deleteSprayProgramme(id);
export const recordSprayApplication = (data) => sprayAPI.recordSprayApplication(data);
export const getSprayApplicationHistory = (id) => sprayAPI.getSprayApplicationHistory(id);
export const getSprayCalendar = (systemId, month, year) => sprayAPI.getSprayCalendar(systemId, month, year);
export const getUpcomingApplications = (systemId, days) => sprayAPI.getUpcomingApplications(systemId, days);
export const createDefaultProgrammes = (systemId, force) => sprayAPI.createDefaultProgrammes(systemId, force);
export const getProgrammeCategories = () => sprayAPI.getProgrammeCategories();
export const getCommonTargets = () => sprayAPI.getCommonTargets();
export const getSprayAnalytics = (systemId, period) => sprayAPI.getSprayAnalytics(systemId, period);
export const createMultipleProgrammes = (programmes) => sprayAPI.createMultipleProgrammes(programmes);
export const recordMultipleApplications = (applications) => sprayAPI.recordMultipleApplications(applications);
export const validateProgrammeData = (data) => sprayAPI.validateProgrammeData(data);
export const validateApplicationData = (data) => sprayAPI.validateApplicationData(data);
export const formatProgrammeForDisplay = (programme) => sprayAPI.formatProgrammeForDisplay(programme);
export const generateProgrammeSchedule = (programme, start, end) => sprayAPI.generateProgrammeSchedule(programme, start, end);