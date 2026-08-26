// Plant Data Grid Component
// Handles plant growth history display, formatting, and interaction

import BaseUIComponent from './baseUIComponent.js';

/**
 * Plant Data Grid Component
 * Manages the display and interaction of plant growth data in a grid/list format
 */
export class PlantDataGridComponent extends BaseUIComponent {
    constructor(app) {
        super(app, 'PlantDataGrid', '#plant-growth-history');
        
        // Grid configuration
        this.config = {
            maxEntries: 10,
            showEmptyMessage: true,
            allowEdit: true,
            allowDelete: true,
            autoRefresh: false
        };
        
        // Data formatting options
        this.formatOptions = {
            showCropType: true,
            showCount: true,
            showHarvestWeight: true,
            showHealth: true,
            showGrowthStage: true,
            showBatchId: true,
            showGrowBed: true,
            showNotes: false // Hide by default to keep entries concise
        };
        
        // Grid state
        this.currentData = [];
        this.filteredData = [];
        this.sortOrder = 'desc'; // 'asc' or 'desc'
        this.sortBy = 'date';
        this.currentFilter = null;
        
        this.log('🌱 Plant Data Grid component initialized');
    }

    /**
     * Setup UI elements specific to the plant data grid
     */
    setupUI() {
        // Cache elements
        this.cacheElements({
            container: '#plant-growth-history',
            filterContainer: '#plant-history-filters',
            sortContainer: '#plant-history-sort',
            refreshButton: '#plant-history-refresh'
        });
        
        // Setup controls if they exist
        this.setupGridControls();
        
        // Setup event listeners
        this.setupGridEventListeners();
    }

    /**
     * Setup grid controls (filters, sorting, refresh)
     */
    setupGridControls() {
        // Create controls if container exists but controls don't
        if (this.container && !this.getElement('filterContainer')) {
            this.createGridControls();
        }
    }

    /**
     * Create grid control elements
     */
    createGridControls() {
        if (!this.container) return;
        
        // Create controls container
        const controlsHtml = `
            <div class="plant-grid-controls" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <div class="plant-grid-filters">
                    <label style="margin-right: 0.5rem;">Filter:</label>
                    <select id="plant-history-filter" class="form-input" style="min-width: 120px;">
                        <option value="">All Types</option>
                        <option value="planting">Planting</option>
                        <option value="harvest">Harvest</option>
                        <option value="health">Health Check</option>
                    </select>
                </div>
                <div class="plant-grid-sort">
                    <label style="margin-right: 0.5rem;">Sort:</label>
                    <select id="plant-history-sort" class="form-input" style="min-width: 100px;">
                        <option value="date_desc">Date (Newest)</option>
                        <option value="date_asc">Date (Oldest)</option>
                        <option value="crop_asc">Crop (A-Z)</option>
                        <option value="crop_desc">Crop (Z-A)</option>
                    </select>
                </div>
                <div class="plant-grid-actions">
                    <button id="plant-history-refresh" class="btn-secondary" style="padding: 0.25rem 0.75rem;">
                        <img src="icons/new-icons/Afraponix Go Icons_reset.svg" alt="Refresh" style="width: 1em; height: 1em; margin-right: 0.25rem;">
                        Refresh
                    </button>
                </div>
            </div>
        `;
        
        // Insert controls before the container
        this.container.insertAdjacentHTML('beforebegin', controlsHtml);
        
        // Cache the new elements
        this.cacheElement('filterSelect', '#plant-history-filter');
        this.cacheElement('sortSelect', '#plant-history-sort');
        this.cacheElement('refreshButton', '#plant-history-refresh');
    }

    /**
     * Setup grid-specific event listeners
     */
    setupGridEventListeners() {
        // Filter change
        const filterSelect = this.getElement('filterSelect');
        if (filterSelect) {
            this.addEventListener(filterSelect, 'change', this.handleFilterChange);
        }
        
        // Sort change
        const sortSelect = this.getElement('sortSelect');
        if (sortSelect) {
            this.addEventListener(sortSelect, 'change', this.handleSortChange);
        }
        
        // Refresh button
        const refreshButton = this.getElement('refreshButton');
        if (refreshButton) {
            this.addEventListener(refreshButton, 'click', this.handleRefresh);
        }
    }

    /**
     * Handle filter changes
     */
    handleFilterChange(event) {
        this.currentFilter = event.target.value || null;
        this.applyFiltersAndSort();
        this.render();
        
        this.log(`🔍 Filter changed to: ${this.currentFilter || 'all'}`);
    }

    /**
     * Handle sort changes
     */
    handleSortChange(event) {
        const [field, order] = event.target.value.split('_');
        this.sortBy = field;
        this.sortOrder = order;
        
        this.applyFiltersAndSort();
        this.render();
        
        this.log(`📊 Sort changed to: ${field} (${order})`);
    }

    /**
     * Handle refresh button click
     */
    async handleRefresh() {
        this.log('🔄 Manual refresh requested');
        await this.refreshData();
    }

    /**
     * Update the grid with new plant data
     */
    async updateData(plantData = null) {
        try {
            // Get data from app if not provided
            if (!plantData) {
                plantData = this.app.dataRecords?.plantGrowth || [];
            }
            
            this.currentData = [...plantData];
            this.applyFiltersAndSort();
            this.render();
            
            this.emit('dataUpdated', { 
                totalEntries: this.currentData.length,
                filteredEntries: this.filteredData.length
            });
            
        } catch (error) {
            this.logError('Failed to update plant data grid', error);
        }
    }

    /**
     * Apply current filters and sorting to the data
     */
    applyFiltersAndSort() {
        let filtered = [...this.currentData];
        
        // Apply filter
        if (this.currentFilter) {
            filtered = filtered.filter(item => this.matchesFilter(item, this.currentFilter));
        }
        
        // Apply sorting
        filtered.sort((a, b) => this.compareItems(a, b));
        
        // Apply entry limit
        if (this.config.maxEntries > 0) {
            filtered = filtered.slice(0, this.config.maxEntries);
        }
        
        this.filteredData = filtered;
    }

    /**
     * Check if an item matches the current filter
     */
    matchesFilter(item, filter) {
        switch (filter) {
            case 'planting':
                return item.count && !item.plants_harvested;
            case 'harvest':
                return item.plants_harvested || item.harvest_weight;
            case 'health':
                return item.health && !item.count && !item.plants_harvested;
            default:
                return true;
        }
    }

    /**
     * Compare two items for sorting
     */
    compareItems(a, b) {
        let valueA, valueB;
        
        switch (this.sortBy) {
            case 'date':
                valueA = new Date(a.date || a.created_at);
                valueB = new Date(b.date || b.created_at);
                break;
            case 'crop':
                valueA = (a.crop_type || '').toLowerCase();
                valueB = (b.crop_type || '').toLowerCase();
                break;
            default:
                return 0;
        }
        
        let result = 0;
        if (valueA < valueB) result = -1;
        if (valueA > valueB) result = 1;
        
        return this.sortOrder === 'desc' ? -result : result;
    }

    /**
     * Render the grid with current data
     */
    render() {
        if (!this.container) {
            this.logWarning('Cannot render - container not found');
            return;
        }
        
        if (this.filteredData.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        const historyHtml = this.filteredData.map(item => this.renderGridItem(item)).join('');
        this.container.innerHTML = `<div class="plant-history-list">${historyHtml}</div>`;
        
        // Setup item-specific event listeners
        this.setupItemEventListeners();
        
        this.log(`📊 Rendered ${this.filteredData.length} plant data entries`);
    }

    /**
     * Render individual grid item
     */
    renderGridItem(item) {
        const cleanCropName = this.cleanCropName(item.crop_type);
        const displayName = cleanCropName !== 'Unknown' ? 
            cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1) : 'Unknown';
        
        const formattedDate = this.formatEntryDate(item.date || item.created_at);
        const formattedDetails = this.formatPlantGrowthEntry(item);
        const entryType = this.determineEntryType(item);
        
        return `
            <div class="plant-history-item ${entryType}" data-id="${item.id}">
                <div class="plant-history-header">
                    <div class="plant-history-crop">
                        <span class="crop-name">${displayName}</span>
                        <span class="entry-type-badge ${entryType}">${entryType}</span>
                    </div>
                    <div class="plant-history-date">${formattedDate}</div>
                    ${this.config.allowEdit || this.config.allowDelete ? 
                        `<div class="plant-history-actions">
                            ${this.config.allowEdit ? 
                                `<button class="action-btn edit-btn" data-action="edit" data-id="${item.id}" title="Edit entry">
                                    <img src="icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit" style="width: 1em; height: 1em;">
                                </button>` : ''
                            }
                            ${this.config.allowDelete ? 
                                `<button class="action-btn delete-btn" data-action="delete" data-id="${item.id}" title="Delete entry">
                                    <img src="icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete" style="width: 1em; height: 1em;">
                                </button>` : ''
                            }
                        </div>` : ''
                    }
                </div>
                <div class="plant-history-details">
                    ${formattedDetails}
                </div>
            </div>
        `;
    }

    /**
     * Determine the type of plant entry
     */
    determineEntryType(item) {
        if (item.plants_harvested || item.harvest_weight) return 'harvest';
        if (item.count && !item.plants_harvested) return 'planting';
        if (item.health) return 'health';
        return 'other';
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const message = this.currentFilter ? 
            `No plant entries found matching filter: ${this.currentFilter}` :
            'No plant growth data recorded yet.';
            
        this.container.innerHTML = `
            <div class="no-plant-data" style="text-align: center; padding: 2rem; color: #666;">
                <img src="icons/new-icons/Afraponix Go Icons_plant.svg" alt="No Data" style="width: 3rem; height: 3rem; opacity: 0.3; margin-bottom: 1rem;">
                <div>${message}</div>
                ${!this.currentFilter ? 
                    '<div style="margin-top: 0.5rem; font-size: 0.9rem;">Start recording plant data to see entries here.</div>' : 
                    '<button class="btn-secondary" onclick="this.parentElement.querySelector(\'#plant-history-filter\').value = \'\'; this.parentElement.querySelector(\'#plant-history-filter\').dispatchEvent(new Event(\'change\'));" style="margin-top: 1rem;">Clear Filter</button>'
                }
            </div>
        `;
    }

    /**
     * Setup event listeners for item actions
     */
    setupItemEventListeners() {
        // Edit buttons
        const editButtons = this.container.querySelectorAll('[data-action="edit"]');
        editButtons.forEach(button => {
            this.addEventListener(button, 'click', (e) => {
                const itemId = e.target.closest('[data-action="edit"]').dataset.id;
                this.handleItemEdit(itemId);
            });
        });
        
        // Delete buttons
        const deleteButtons = this.container.querySelectorAll('[data-action="delete"]');
        deleteButtons.forEach(button => {
            this.addEventListener(button, 'click', (e) => {
                const itemId = e.target.closest('[data-action="delete"]').dataset.id;
                this.handleItemDelete(itemId);
            });
        });
    }

    /**
     * Handle edit item action
     */
    handleItemEdit(itemId) {
        this.log(`✏️ Edit requested for item: ${itemId}`);
        
        // Delegate to app's edit functionality if available
        if (this.app && typeof this.app.editPlantEntry === 'function') {
            this.app.editPlantEntry(itemId);
        } else {
            this.showNotification('Edit functionality not available', 'warning');
        }
        
        this.emit('itemEdit', { itemId });
    }

    /**
     * Handle delete item action
     */
    async handleItemDelete(itemId) {
        this.log(`🗑️ Delete requested for item: ${itemId}`);
        
        // Show confirmation
        const confirmed = confirm('Are you sure you want to delete this plant entry? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            // Delegate to app's delete functionality if available
            if (this.app && typeof this.app.deletePlantEntry === 'function') {
                await this.app.deletePlantEntry(itemId);
                // Refresh data after successful deletion
                await this.refreshData();
            } else {
                this.showNotification('Delete functionality not available', 'warning');
            }
            
            this.emit('itemDelete', { itemId });
            
        } catch (error) {
            this.logError(`Failed to delete plant entry ${itemId}`, error);
            this.showNotification('Failed to delete entry', 'error');
        }
    }

    /**
     * Refresh data from the app
     */
    async refreshData() {
        this.log('🔄 Refreshing plant data...');
        
        try {
            // Reload data from app if possible
            if (this.app && typeof this.app.loadDataRecords === 'function') {
                await this.app.loadDataRecords();
            }
            
            // Update grid with fresh data
            await this.updateData();
            
            this.showNotification('Plant data refreshed', 'success');
            
        } catch (error) {
            this.logError('Failed to refresh plant data', error);
            this.showNotification('Failed to refresh data', 'error');
        }
    }

    /**
     * Clean crop name (delegates to app method or provides fallback)
     */
    cleanCropName(cropName) {
        if (this.app && typeof this.app.cleanCustomCropName === 'function') {
            return this.app.cleanCustomCropName(cropName);
        }
        
        // Fallback cleaning logic
        if (!cropName) return 'Unknown';
        return cropName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format plant growth entry (delegates to app method or provides fallback)
     */
    formatPlantGrowthEntry(entry) {
        if (this.app && typeof this.app.formatPlantGrowthEntry === 'function') {
            return this.app.formatPlantGrowthEntry(entry);
        }
        
        // Fallback formatting logic
        const items = [];
        if (entry.crop_type && this.formatOptions.showCropType) items.push(`Crop: ${entry.crop_type}`);
        if (entry.count && this.formatOptions.showCount) items.push(`Count: ${entry.count}`);
        if (entry.harvest_weight && this.formatOptions.showHarvestWeight) items.push(`Harvest: ${entry.harvest_weight}g`);
        if (entry.health && this.formatOptions.showHealth) items.push(`Health: ${entry.health}`);
        if (entry.growth_stage && this.formatOptions.showGrowthStage) items.push(`Stage: ${entry.growth_stage}`);
        if (entry.batch_id && this.formatOptions.showBatchId) items.push(`Batch: ${entry.batch_id}`);
        if (entry.grow_bed_id && this.formatOptions.showGrowBed) items.push(`Bed: ${entry.grow_bed_id}`);
        if (entry.notes && this.formatOptions.showNotes) items.push(`Notes: ${entry.notes}`);
        
        return items.join(' • ') || 'No data recorded';
    }

    /**
     * Format entry date (delegates to app method or provides fallback)
     */
    formatEntryDate(dateString) {
        if (this.app && typeof this.app.formatEntryDate === 'function') {
            return this.app.formatEntryDate(dateString);
        }
        
        // Fallback date formatting
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return this.app.formatDateDDMMYYYY(date);
    }

    /**
     * Configure grid options
     */
    configure(options = {}) {
        this.config = { ...this.config, ...options };
        this.log(`⚙️ Grid configured with options:`, options);
    }

    /**
     * Configure format options
     */
    configureFormat(options = {}) {
        this.formatOptions = { ...this.formatOptions, ...options };
        this.log(`🎨 Format configured with options:`, options);
    }

    /**
     * Get component-specific statistics
     */
    getComponentStats() {
        return {
            ...super.getComponentStats(),
            totalEntries: this.currentData.length,
            filteredEntries: this.filteredData.length,
            currentFilter: this.currentFilter,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            maxEntries: this.config.maxEntries,
            hasData: this.currentData.length > 0
        };
    }

    /**
     * Component-specific health checks
     */
    getHealthIssues() {
        const issues = super.getHealthIssues();
        
        if (this.currentData.length > 1000) {
            issues.push(`Large dataset may impact performance: ${this.currentData.length} entries`);
        }
        
        return issues;
    }

    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear data arrays
        this.currentData = [];
        this.filteredData = [];
        
        this.log('🌱 Plant Data Grid cleaned up');
    }
}

// Export both class and factory function
export default PlantDataGridComponent;

/**
 * Factory function to create plant data grid component
 */
export function createPlantDataGridComponent(app) {
    return new PlantDataGridComponent(app);
}