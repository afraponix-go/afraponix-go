// Form Generator Component
// Handles dynamic form generation for editing data records

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Form Generator Component Class
 * Manages dynamic form generation for various data categories
 */
export class FormGeneratorComponent {
    constructor(app) {
        this.app = app;
        
        console.log('📝 Form Generator Component initialized');
    }

    /**
     * Generate edit form based on category
     * Complexity: 8, Lines: 13
     */
    generateEditForm(category, item) {
        switch(category) {
            case 'water-quality':
                return this.generateWaterQualityEditForm(item);
            case 'fish-health':
                return this.generateFishHealthEditForm(item);
            case 'plant-growth':
                return this.generatePlantGrowthEditForm(item);
            case 'operations':
                return this.generateOperationsEditForm(item);
            default:
                return '<div>Edit form not available</div>';
        }
    }

    /**
     * Generate water quality edit form
     * Complexity: 25, Lines: 43
     */
    generateWaterQualityEditForm(item) {
        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>pH Level:</label>
                        <input type="number" id="edit-ph" value="${item.ph || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Temperature (°C):</label>
                        <input type="number" id="edit-temperature" value="${item.temperature || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Dissolved Oxygen (mg/L):</label>
                        <input type="number" id="edit-dissolved-oxygen" value="${item.dissolved_oxygen || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Ammonia (mg/L):</label>
                        <input type="number" id="edit-ammonia" value="${item.ammonia || ''}" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>EC (mS/cm):</label>
                        <input type="number" id="edit-ec" value="${item.ec || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Humidity (%):</label>
                        <input type="number" id="edit-humidity" value="${item.humidity || ''}" step="0.1" min="0" max="100">
                    </div>
                    <div class="form-field">
                        <label>Salinity (ppt):</label>
                        <input type="number" id="edit-salinity" value="${item.salinity || ''}" step="0.1" min="0">
                    </div>
                    <div class="form-field full-width">
                        <label>Notes:</label>
                        <textarea id="edit-notes" rows="3">${item.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate fish health edit form
     * Complexity: 30, Lines: 51
     */
    generateFishHealthEditForm(item) {
        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>Feed Amount (g):</label>
                        <input type="number" id="edit-feed-amount" value="${item.feed_amount || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Feed Type:</label>
                        <select id="edit-feed-type">
                            <option value="">Select type...</option>
                            <option value="Powder" ${item.feed_type === 'Powder' ? 'selected' : ''}>Powder</option>
                            <option value="Crumble" ${item.feed_type === 'Crumble' ? 'selected' : ''}>Crumble</option>
                            <option value="2mm" ${item.feed_type === '2mm' ? 'selected' : ''}>2mm</option>
                            <option value="3mm" ${item.feed_type === '3mm' ? 'selected' : ''}>3mm</option>
                            <option value="4mm" ${item.feed_type === '4mm' ? 'selected' : ''}>4mm</option>
                            <option value="5mm" ${item.feed_type === '5mm' ? 'selected' : ''}>5mm</option>
                            <option value="6mm" ${item.feed_type === '6mm' ? 'selected' : ''}>6mm</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Behavior:</label>
                        <select id="edit-behavior">
                            <option value="">Select behavior...</option>
                            <option value="active_healthy" ${item.behavior === 'active_healthy' ? 'selected' : ''}>🟢 Active & Healthy</option>
                            <option value="feeding_well" ${item.behavior === 'feeding_well' ? 'selected' : ''}>🟢 Feeding Well</option>
                            <option value="normal_schooling" ${item.behavior === 'normal_schooling' ? 'selected' : ''}>🟢 Normal Schooling</option>
                            <option value="sluggish" ${item.behavior === 'sluggish' ? 'selected' : ''}>🟡 Sluggish Movement</option>
                            <option value="poor_appetite" ${item.behavior === 'poor_appetite' ? 'selected' : ''}>🟡 Poor Appetite</option>
                            <option value="scattered" ${item.behavior === 'scattered' ? 'selected' : ''}>🟡 Scattered/Not Schooling</option>
                            <option value="gasping" ${item.behavior === 'gasping' ? 'selected' : ''}>🔴 Gasping at Surface</option>
                            <option value="stressed" ${item.behavior === 'stressed' ? 'selected' : ''}>🔴 Signs of Stress</option>
                            <option value="aggressive" ${item.behavior === 'aggressive' ? 'selected' : ''}>🔴 Aggressive Behavior</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Mortality:</label>
                        <input type="number" id="edit-mortality" value="${item.mortality || ''}" min="0">
                    </div>
                    <div class="form-field">
                        <label>Time:</label>
                        <input type="time" id="edit-time" value="${item.time || ''}">
                    </div>
                    <div class="form-field full-width">
                        <label>Notes:</label>
                        <textarea id="edit-notes" rows="3">${item.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate plant growth edit form
     * Complexity: 20, Lines: 35+
     */
    generatePlantGrowthEditForm(item) {
        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>Plant Count:</label>
                        <input type="number" id="edit-plant-count" value="${item.plant_count || ''}" min="0">
                    </div>
                    <div class="form-field">
                        <label>Plants Harvested:</label>
                        <input type="number" id="edit-plants-harvested" value="${item.plants_harvested || ''}" min="0">
                    </div>
                    <div class="form-field">
                        <label>Harvest Weight (kg):</label>
                        <input type="number" id="edit-harvest-weight" value="${item.harvest_weight ? item.harvest_weight / 1000 : ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Crop Type:</label>
                        <input type="text" id="edit-crop-type" value="${item.crop_type || ''}">
                    </div>
                    <div class="form-field">
                        <label>Grow Bed:</label>
                        <input type="text" id="edit-grow-bed" value="${item.grow_bed || ''}">
                    </div>
                    <div class="form-field full-width">
                        <label>Notes:</label>
                        <textarea id="edit-notes" rows="3">${item.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate operations edit form
     * Complexity: 15, Lines: 25+
     */
    generateOperationsEditForm(item) {
        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>Operation Type:</label>
                        <input type="text" id="edit-operation-type" value="${item.operation_type || ''}">
                    </div>
                    <div class="form-field">
                        <label>Duration (minutes):</label>
                        <input type="number" id="edit-duration" value="${item.duration || ''}" min="0">
                    </div>
                    <div class="form-field full-width">
                        <label>Description:</label>
                        <textarea id="edit-description" rows="3">${item.description || ''}</textarea>
                    </div>
                    <div class="form-field full-width">
                        <label>Notes:</label>
                        <textarea id="edit-notes" rows="3">${item.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            formsSupported: ['water-quality', 'fish-health', 'plant-growth', 'operations']
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Form Generator component');
    }
}

// Export both class and create a factory function
export default FormGeneratorComponent;

/**
 * Factory function to create form generator component
 */
export function createFormGeneratorComponent(app) {
    return new FormGeneratorComponent(app);
}