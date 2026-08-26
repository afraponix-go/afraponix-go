/**
 * Spray Management Service
 * Handles spray programme scheduling, task generation, and application tracking
 */

import { handleApiError, handleGeneralError } from '../utils/errorHandler.js';
import { storageGet, storageSet } from '../utils/storageUtils.js';

/**
 * SprayManager Service Class
 * Manages spray applications, programmes, and scheduling for aquaponics systems
 */
export class SprayManager {
    constructor(dependencies = {}) {
        this.app = dependencies.app;
        this.errorHandler = dependencies.errorHandler;
        this.storageUtils = dependencies.storageUtils;
        
        // Initialize spray product categories
        this.productCategories = ['insecticides', 'fungicides', 'foliarFeeds'];
        
        console.log('🌿 SprayManager service initialized');
    }

    /**
     * Get today's spray application tasks for a system
     * 
     * @param {string} systemId - System identifier
     * @returns {Promise<Array>} Array of spray tasks for today
     */
    async getTodaysSprayTasks(systemId) {
        try {
            if (!systemId) {
                console.warn('SprayManager: No systemId provided for getTodaysSprayTasks');
                return [];
            }

            // Get today's spray applications from programmes
            const programmes = this.getSprayProgrammes(systemId);
            const activeProgrammes = programmes.filter(p => 
                p.systemId === systemId && p.status === 'active'
            );
            
            const tasks = [];
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, 3 = Wednesday
            const todayString = today.toDateString();
            
            // Get completed applications for today
            const completedToday = this.getCompletedApplicationsForToday(systemId, todayString);
            
            // Get all available spray products
            const allProducts = this.getAllSprayProducts();
            
            // Process each active programme
            for (const programme of activeProgrammes) {
                const productsForToday = this.getProductsForToday(programme, dayOfWeek, allProducts);
                
                // Create individual tasks for each product due today (excluding completed ones)
                productsForToday.forEach(product => {
                    // Skip if this product has already been completed today
                    if (completedToday.includes(product.id)) {
                        return;
                    }
                    
                    const dayName = this.getDayName(dayOfWeek);
                    
                    tasks.push({
                        type: 'spray_application',
                        title: `${product.product_name} Application`,
                        subtitle: `${programme.name} - ${dayName} schedule`,
                        priority: 'normal',
                        programmeId: programme.id,
                        productId: product.id,
                        productName: product.product_name,
                        category: product.category,
                        actions: [
                            { 
                                label: 'Record Application', 
                                action: 'record_spray_application', 
                                primary: true, 
                                productId: product.id 
                            },
                            { 
                                label: 'View Programme', 
                                action: 'view_spray_programme', 
                                primary: false 
                            }
                        ]
                    });
                });
            }
            
            return tasks;
            
        } catch (error) {
            console.error('Error getting spray tasks:', error);
            if (this.errorHandler) {
                await this.errorHandler.handleGeneralError(error, { 
                    operation: 'getTodaysSprayTasks',
                    systemId 
                });
            }
            return [];
        }
    }

    /**
     * Get spray programmes from storage
     * 
     * @param {string} systemId - System identifier
     * @returns {Array} Array of spray programmes
     */
    getSprayProgrammes(systemId) {
        try {
            const programmes = JSON.parse(localStorage.getItem('spray_programmes') || '[]');
            return programmes.filter(p => p.systemId === systemId);
        } catch (error) {
            console.error('Error retrieving spray programmes:', error);
            return [];
        }
    }

    /**
     * Get completed applications for today
     * 
     * @param {string} systemId - System identifier  
     * @param {string} todayString - Today's date string
     * @returns {Array} Array of completed application IDs
     */
    getCompletedApplicationsForToday(systemId, todayString) {
        try {
            const storageKey = `completed_spray_applications_${systemId}`;
            const completedApplications = JSON.parse(localStorage.getItem(storageKey) || '{}');
            return completedApplications[todayString] || [];
        } catch (error) {
            console.error('Error retrieving completed applications:', error);
            return [];
        }
    }

    /**
     * Get all available spray products
     * 
     * @returns {Object} Object containing all spray products by category
     */
    getAllSprayProducts() {
        try {
            const allProducts = {};
            
            this.productCategories.forEach(category => {
                // Use app reference if available, otherwise return empty array
                if (window.app?.getMockSprayApplications) {
                    allProducts[category] = window.app.getMockSprayApplications(
                        category === 'foliarFeeds' ? 'foliar-feeds' : category
                    );
                } else {
                    allProducts[category] = [];
                }
            });
            
            return allProducts;
        } catch (error) {
            console.error('Error retrieving spray products:', error);
            return {
                insecticides: [],
                fungicides: [],
                foliarFeeds: []
            };
        }
    }

    /**
     * Get products scheduled for today based on programme and day
     * 
     * @param {Object} programme - Spray programme configuration
     * @param {number} dayOfWeek - Day of week (0-6)
     * @param {Object} allProducts - All available products
     * @returns {Array} Products scheduled for today
     */
    getProductsForToday(programme, dayOfWeek, allProducts) {
        const productsForToday = [];
        
        const getProductById = (id, category) => {
            return allProducts[category]?.find(p => p.id == id) || null;
        };
        
        try {
            if (programme.schedule && typeof programme.schedule === 'object') {
                // Modern schedule format
                if (dayOfWeek === 1 && programme.schedule.monday) {
                    // Monday: Insecticides + Foliar feeds
                    this.addProductsByCategory(programme, ['insecticides', 'foliarFeeds'], 
                                              productsForToday, getProductById);
                    
                } else if (dayOfWeek === 3 && programme.schedule.wednesday) {
                    // Wednesday: Fungicides + Foliar feeds
                    this.addProductsByCategory(programme, ['fungicides', 'foliarFeeds'], 
                                              productsForToday, getProductById);
                }
                
            } else if (programme.schedule === 'monday_wednesday' && (dayOfWeek === 1 || dayOfWeek === 3)) {
                // Legacy format support
                const allIds = [
                    ...(programme.selections?.insecticides || []),
                    ...(programme.selections?.fungicides || []),
                    ...(programme.selections?.foliarFeeds || [])
                ];
                
                allIds.forEach(id => {
                    const product = getProductById(id, 'insecticides') || 
                                   getProductById(id, 'fungicides') || 
                                   getProductById(id, 'foliarFeeds');
                    if (product) productsForToday.push(product);
                });
            }
            
        } catch (error) {
            console.error('Error processing products for today:', error);
        }
        
        return productsForToday;
    }

    /**
     * Add products by category to today's list
     * 
     * @param {Object} programme - Programme configuration
     * @param {Array} categories - Categories to process
     * @param {Array} productsForToday - Array to add products to
     * @param {Function} getProductById - Function to get product by ID
     */
    addProductsByCategory(programme, categories, productsForToday, getProductById) {
        categories.forEach(category => {
            const products = programme.selections?.[category] || [];
            products.forEach(id => {
                const product = getProductById(id, category);
                if (product) productsForToday.push(product);
            });
        });
    }

    /**
     * Get day name from day of week number
     * 
     * @param {number} dayOfWeek - Day of week (0-6)
     * @returns {string} Day name
     */
    getDayName(dayOfWeek) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dayOfWeek] || 'Unknown';
    }

    /**
     * Record completed spray application
     * 
     * @param {string} systemId - System identifier
     * @param {string} productId - Product identifier
     * @param {Object} applicationData - Application details
     * @returns {Promise<boolean>} Success status
     */
    async recordSprayApplication(systemId, productId, applicationData = {}) {
        try {
            const today = new Date().toDateString();
            const storageKey = `completed_spray_applications_${systemId}`;
            
            const completedApplications = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            if (!completedApplications[today]) {
                completedApplications[today] = [];
            }
            
            // Add application if not already recorded
            if (!completedApplications[today].includes(productId)) {
                completedApplications[today].push(productId);
                
                // Store application details if provided
                const detailsKey = `spray_application_details_${systemId}_${productId}_${today}`;
                if (Object.keys(applicationData).length > 0) {
                    localStorage.setItem(detailsKey, JSON.stringify({
                        ...applicationData,
                        timestamp: new Date().toISOString(),
                        systemId,
                        productId
                    }));
                }
                
                localStorage.setItem(storageKey, JSON.stringify(completedApplications));
                return true;
            }
            
            return false; // Already recorded
            
        } catch (error) {
            console.error('Error recording spray application:', error);
            if (this.errorHandler) {
                await this.errorHandler.handleGeneralError(error, { 
                    operation: 'recordSprayApplication',
                    systemId,
                    productId 
                });
            }
            return false;
        }
    }

    /**
     * Get spray application history
     * 
     * @param {string} systemId - System identifier
     * @param {number} days - Number of days to retrieve (default 30)
     * @returns {Array} Array of application records
     */
    getSprayApplicationHistory(systemId, days = 30) {
        try {
            const storageKey = `completed_spray_applications_${systemId}`;
            const completedApplications = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            const history = [];
            const today = new Date();
            
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateString = date.toDateString();
                
                if (completedApplications[dateString]) {
                    completedApplications[dateString].forEach(productId => {
                        history.push({
                            date: dateString,
                            productId,
                            systemId
                        });
                    });
                }
            }
            
            return history.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        } catch (error) {
            console.error('Error retrieving spray application history:', error);
            return [];
        }
    }

    /**
     * Get programme statistics
     * 
     * @param {string} systemId - System identifier
     * @returns {Object} Programme statistics
     */
    getProgrammeStatistics(systemId) {
        try {
            const programmes = this.getSprayProgrammes(systemId);
            const history = this.getSprayApplicationHistory(systemId, 30);
            
            return {
                totalProgrammes: programmes.length,
                activeProgrammes: programmes.filter(p => p.status === 'active').length,
                applicationsLast30Days: history.length,
                lastApplication: history.length > 0 ? history[0].date : null
            };
            
        } catch (error) {
            console.error('Error calculating programme statistics:', error);
            return {
                totalProgrammes: 0,
                activeProgrammes: 0,
                applicationsLast30Days: 0,
                lastApplication: null
            };
        }
    }

    /**
     * Cleanup old application records
     * 
     * @param {string} systemId - System identifier
     * @param {number} retentionDays - Days to retain records (default 90)
     * @returns {number} Number of records cleaned up
     */
    cleanupOldRecords(systemId, retentionDays = 90) {
        try {
            const storageKey = `completed_spray_applications_${systemId}`;
            const completedApplications = JSON.parse(localStorage.getItem(storageKey) || '{}');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            let cleanedCount = 0;
            
            Object.keys(completedApplications).forEach(dateString => {
                const recordDate = new Date(dateString);
                if (recordDate < cutoffDate) {
                    delete completedApplications[dateString];
                    cleanedCount++;
                }
            });
            
            if (cleanedCount > 0) {
                localStorage.setItem(storageKey, JSON.stringify(completedApplications));
                console.log(`🧹 Cleaned up ${cleanedCount} old spray application records`);
            }
            
            return cleanedCount;
            
        } catch (error) {
            console.error('Error cleaning up old records:', error);
            return 0;
        }
    }
}

// Create service instance with dependency injection
export const createSprayManager = (dependencies = {}) => {
    return new SprayManager(dependencies);
};

// Export utility functions for backward compatibility
export const getTodaysSprayTasks = (systemId) => {
    const sprayManager = new SprayManager({ app: window.app });
    return sprayManager.getTodaysSprayTasks(systemId);
};

export const recordSprayApplication = (systemId, productId, applicationData) => {
    const sprayManager = new SprayManager({ app: window.app });
    return sprayManager.recordSprayApplication(systemId, productId, applicationData);
};

export const getSprayApplicationHistory = (systemId, days = 30) => {
    const sprayManager = new SprayManager({ app: window.app });
    return sprayManager.getSprayApplicationHistory(systemId, days);
};

// Export default instance
const sprayManager = new SprayManager({ app: window.app });
export default sprayManager;