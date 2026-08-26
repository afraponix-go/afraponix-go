// API Module Exports
// Handles all API communication with the backend

// Base API client for standardized patterns
export { BaseApiClient, apiClient } from './baseApiClient.js';

// API client examples and specialized clients
export * from './apiClientExample.js';

// Core API modules organized by resource domain
export * as SystemsAPI from './systemsAPI.js';
export * as GrowBedsAPI from './growBedsAPI.js';
export * as PlantsAPI from './plantsAPI.js';
export * as FishAPI from './fishAPI.js';
export * as WaterQualityAPI from './waterQualityAPI.js';
export * as NutrientsAPI from './nutrientsAPI.js';
export * as SensorsAPI from './sensorsAPI.js';
export * as CropKnowledgeAPI from './cropKnowledgeAPI.js';
export * as OperationsAPI from './operationsAPI.js';
export * as AuthAPI from './authAPI.js';
export * as ConfigAPI from './configAPI.js';

// New comprehensive API modules
export * as DataAPI from './dataAPI.js';
export * as ImportExportAPI from './importExportAPI.js';
export * as SprayAPI from './sprayAPI.js';

// API instances for direct use
export { authAPI } from './authAPI.js';
export { dataAPI } from './dataAPI.js';
export { importExportAPI } from './importExportAPI.js';
export { sprayAPI } from './sprayAPI.js';

// Unified API interface - provides all functionality through a single object
export const API = {
    // Authentication
    auth: () => import('./authAPI.js').then(m => m.authAPI),
    
    // System management
    systems: () => import('./systemsAPI.js'),
    growBeds: () => import('./growBedsAPI.js'),
    config: () => import('./configAPI.js'),
    
    // Data management
    data: () => import('./dataAPI.js').then(m => m.dataAPI),
    nutrients: () => import('./nutrientsAPI.js'),
    waterQuality: () => import('./waterQualityAPI.js'),
    
    // Livestock & crops
    fish: () => import('./fishAPI.js'),
    plants: () => import('./plantsAPI.js'),
    crops: () => import('./cropKnowledgeAPI.js'),
    
    // Operations
    spray: () => import('./sprayAPI.js').then(m => m.sprayAPI),
    operations: () => import('./operationsAPI.js'),
    
    // External integrations
    sensors: () => import('./sensorsAPI.js'),
    
    // Data exchange
    importExport: () => import('./importExportAPI.js').then(m => m.importExportAPI)
};

// Helper function to get all available API modules
export function getAvailableAPIs() {
    return {
        'AuthAPI': 'Authentication and user management',
        'SystemsAPI': 'System CRUD operations and management',
        'DataAPI': 'General data operations and entries',
        'NutrientsAPI': 'Nutrient readings and water quality',
        'FishAPI': 'Fish health, inventory, and tank management',
        'PlantsAPI': 'Plant data, batches, and growth tracking',
        'GrowBedsAPI': 'Grow bed configuration and management',
        'SensorsAPI': 'Sensor data and ThingsBoard integration',
        'SprayAPI': 'Spray programs and pest management',
        'ConfigAPI': 'System configuration and settings',
        'ImportExportAPI': 'Data import/export operations',
        'CropKnowledgeAPI': 'Crop knowledge and variety information',
        'OperationsAPI': 'General system operations',
        'WaterQualityAPI': 'Water quality monitoring'
    };
}