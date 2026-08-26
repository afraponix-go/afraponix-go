// Plant Batch Manager Component
// Handles plant management, batch tracking, planting/harvest operations

/**
 * Plant Batch Manager Component Class
 * Manages plant operations, batch tracking, crop dropdowns, and harvest calculations
 */
export class PlantBatchManagerComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🌱 Plant Batch Manager Component initialized');
    }

    /**
     * Update plant crop dropdown with available crops
     * Complexity: 15, Lines: 40+
     */
    async updatePlantCropDropdown() {
        const plantCropSelect = document.getElementById('plant-crop-type');
        
        if (!plantCropSelect) return;
        
        // Clear existing options and add all available crops
        plantCropSelect.innerHTML = '<option value="">Select crop type...</option>';
        
        try {
            // Get custom crops
            const customCrops = await this.app.makeApiCall(`/custom-crops/system/${this.app.activeSystemId}`);
            
            // Add custom crops first
            if (customCrops && customCrops.length > 0) {
                customCrops.forEach(crop => {
                    const cleanName = this.app.utilities ? this.app.utilities.cleanCustomCropName(crop.crop_name) : crop.crop_name;
                    plantCropSelect.innerHTML += `<option value="${crop.crop_name}">${cleanName}</option>`;
                });
            }
            
            // Get admin crops (built-in crop types)
            const adminCrops = await this.app.makeApiCall('/crop-knowledge/crops');
            if (adminCrops && adminCrops.success && adminCrops.data && adminCrops.data.length > 0) {
                adminCrops.data.forEach(crop => {
                    // Check if this crop name already exists in custom crops
                    const isDuplicate = customCrops && customCrops.some(customCrop => 
                        customCrop.crop_name.toLowerCase() === crop.name.toLowerCase()
                    );
                    if (!isDuplicate) {
                        plantCropSelect.innerHTML += `<option value="${crop.name}">${crop.name}</option>`;
                    }
                });
            }
            
        } catch (error) {
            console.error('Error loading crops for plant dropdown:', error);
        }
        
        plantCropSelect.innerHTML += '<option value="other">Other</option>';
    }

    /**
     * Update harvest crop dropdown with planted crops
     * Complexity: 20, Lines: 30+
     */
    async updateHarvestCropDropdown() {
        const harvestBedSelect = document.getElementById('harvest-grow-bed');
        const harvestCropSelect = document.getElementById('harvest-crop-type');
        
        if (!harvestCropSelect) return;
        
        harvestCropSelect.innerHTML = '<option value="">Select crop type...</option>';
        
        if (!this.app.activeSystemId) {
            harvestCropSelect.innerHTML += '<option value="" disabled>No system selected</option>';
            return;
        }
        
        const selectedBedId = harvestBedSelect ? harvestBedSelect.value : null;
        if (!selectedBedId) {
            harvestCropSelect.innerHTML += '<option value="" disabled>Please select a grow bed first</option>';
            return;
        }
        
        try {
            // Get plant data to find what crops are planted in the selected bed
            const plantData = await this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`);
            
            // Filter plant data to only include records for the selected bed
            const bedPlantData = plantData.filter(record => record.grow_bed_id == selectedBedId);
            
            // Find unique planted crops that haven't been fully harvested
            const uniquePlantedCrops = [...new Set(
                bedPlantData
                    .filter(record => record.new_seedlings > 0) // Only records with new plantings
                    .map(record => record.crop_type)
            )];
            
            if (uniquePlantedCrops.length === 0) {
                harvestCropSelect.innerHTML += '<option value="" disabled>No crops planted in this bed</option>';
                return;
            }
            
            uniquePlantedCrops.forEach(cropType => {
                const cleanName = this.app.utilities ? this.app.utilities.cleanCustomCropName(cropType) : cropType;
                harvestCropSelect.innerHTML += `<option value="${cropType}">${cleanName}</option>`;
            });
            
        } catch (error) {
            console.error('Error loading planted crops for harvest:', error);
            harvestCropSelect.innerHTML += '<option value="" disabled>Error loading planted crops</option>';
        }
    }

    /**
     * Legacy function - kept for backward compatibility
     * Complexity: 3, Lines: 3
     */
    async populateHarvestCropDropdown() {
        await this.updateHarvestCropDropdown();
    }

    /**
     * Update remaining plants display for selected bed and crop
     * Complexity: 25, Lines: 100+
     */
    async updateRemainingPlantsDisplay() {
        const plantBedSelect = document.getElementById('plant-grow-bed');
        const plantCropSelect = document.getElementById('plant-crop-type');
        const remainingPlantsDisplay = document.getElementById('remaining-plants-display');
        const remainingPlantsContainer = document.getElementById('remaining-plants-container');
        
        if (!plantBedSelect || !remainingPlantsDisplay || !remainingPlantsContainer) {
            return;
        }
        
        const selectedBedId = plantBedSelect.value;
        const selectedCrop = plantCropSelect ? plantCropSelect.value : null;
        
        if (!selectedBedId) {
            remainingPlantsDisplay.style.display = 'none';
            return;
        }
        
        try {
            // Get grow beds and plant data
            const growBeds = await this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`);
            const plantData = await this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`);
            
            // Find the selected bed
            const selectedBed = growBeds.find(bed => bed.id === parseInt(selectedBedId));
            
            // Get all active batches for this bed
            const activeBatches = this.getActiveBatchesForBed(plantData, selectedBedId);
            
            let html = '<div class="bed-capacity-info">';
            
            if (selectedCrop) {
                // Show crop-specific capacity
                const cropAllocation = this.app.cropAllocations ? 
                    this.app.cropAllocations.find(alloc => alloc.grow_bed_id === parseInt(selectedBedId) && alloc.crop_type === selectedCrop) :
                    null;
                
                if (cropAllocation) {
                    // Get current batch for this crop
                    const currentBatch = this.getCurrentBatchForCrop(plantData, selectedBedId, selectedCrop);
                    const remaining = currentBatch ? currentBatch.remaining : (cropAllocation.allocated_count || 0);
                    
                    html += `
                        <div class="capacity-summary">
                            <strong>${this.app.utilities ? this.app.utilities.cleanCustomCropName(selectedCrop) : selectedCrop}</strong><br>
                            <span class="capacity-detail">Allocated: ${cropAllocation.allocated_count || 0} plants</span><br>
                            <span class="capacity-detail remaining-count">Available space: ${remaining} plants</span>
                        </div>
                    `;
                }
            } else {
                // Show all batches in bed
                html += `<div class="bed-summary"><strong>${selectedBed ? selectedBed.name : 'Bed'} Overview</strong></div>`;
            }
            
            if (activeBatches.length === 0) {
                if (!selectedCrop) {
                    html += '<div class="no-batches">No active plantings in this bed</div>';
                }
            } else {
                html += '<div class="active-batches">';
                if (!selectedCrop) {
                    html += '<div class="batch-header">Active Batches:</div>';
                }
                
                activeBatches.forEach(batch => {
                    const cropName = this.app.utilities ? this.app.utilities.cleanCustomCropName(batch.cropType) : batch.cropType;
                    const plantedDate = this.app.formatDateDDMMYYYY(new Date(batch.plantedDate));
                    
                    if (!selectedCrop || batch.cropType === selectedCrop) {
                        html += `
                            <div class="batch-item">
                                <strong>${cropName}</strong> (${batch.remaining} remaining)<br>
                                <small>Planted: ${plantedDate} | Batch: ${batch.batchId.substring(0, 12)}...</small>
                            </div>
                        `;
                    }
                });
                
                html += '</div>';
            }
            
            html += '</div>';
            remainingPlantsContainer.innerHTML = html;
            remainingPlantsDisplay.style.display = 'block';
            
        } catch (error) {
            console.error('Error updating remaining plants display:', error);
            remainingPlantsDisplay.style.display = 'none';
        }
    }

    /**
     * Get active batches for a grow bed
     * Complexity: 20, Lines: 40+
     */
    getActiveBatchesForBed(plantData, bedId) {
        // Get all batches for this bed with remaining plants
        const batches = new Map();
        
        // Process all plant records for this bed
        plantData.forEach(record => {
            if (record.grow_bed_id == bedId && record.batch_id) {
                const batchId = record.batch_id;
                
                if (!batches.has(batchId)) {
                    batches.set(batchId, {
                        batchId,
                        cropType: record.crop_type,
                        planted: 0,
                        harvested: 0,
                        remaining: 0,
                        plantedDate: record.date,
                        lastDate: record.date
                    });
                }
                
                const batch = batches.get(batchId);
                
                // Update planted count and dates
                if (record.new_seedlings > 0) {
                    batch.planted += record.new_seedlings;
                    
                    if (!batch.plantedDate || record.date < batch.plantedDate) {
                        batch.plantedDate = record.date;
                    }
                }
                
                // Update harvested count
                if (record.plants_harvested > 0) {
                    batch.harvested += record.plants_harvested;
                }
                
                // Update last activity date
                if (record.date > batch.lastDate) {
                    batch.lastDate = record.date;
                }
            }
        });
        
        // Calculate remaining plants and filter active batches
        const activeBatches = Array.from(batches.values())
            .map(batch => ({
                ...batch,
                remaining: batch.planted - batch.harvested
            }))
            .filter(batch => batch.remaining > 0);
        
        // Sort by planted date (most recent first)
        activeBatches.sort((a, b) => b.plantedDate.localeCompare(a.plantedDate));
        
        return activeBatches;
    }

    /**
     * Get current batch for a specific crop in a bed
     * Complexity: 18, Lines: 35+
     */
    getCurrentBatchForCrop(plantData, bedId, cropType) {
        // Find the most recent batch for this crop in this bed that still has plants
        const cropBatches = new Map();
        
        // Process all plant records for this bed and crop
        plantData.forEach(record => {
            if (record.grow_bed_id == bedId && record.crop_type === cropType && record.batch_id) {
                const batchId = record.batch_id;
                
                if (!cropBatches.has(batchId)) {
                    cropBatches.set(batchId, {
                        batchId,
                        planted: 0,
                        harvested: 0,
                        lastDate: record.date
                    });
                }
                
                const batch = cropBatches.get(batchId);
                
                if (record.date > batch.lastDate) {
                    batch.lastDate = record.date;
                }
                
                if (record.new_seedlings > 0) {
                    batch.planted += record.new_seedlings;
                }
                
                if (record.plants_harvested > 0) {
                    batch.harvested += record.plants_harvested;
                }
            }
        });
        
        // Find the current batch with remaining plants
        let currentBatch = null;
        let mostRecentDate = '';
        
        cropBatches.forEach(batch => {
            const remaining = batch.planted - batch.harvested;
            if (remaining > 0 && batch.lastDate > mostRecentDate) {
                currentBatch = { ...batch, remaining };
                mostRecentDate = batch.lastDate;
            }
        });
        
        return currentBatch;
    }

    /**
     * Record new planting with batch tracking
     * Complexity: 25, Lines: 60+
     */
    async recordPlanting() {
        if (!this.app.activeSystemId) {
            this.app.showNotification('Please select a system first.', 'warning');
            return;
        }

        // Generate batch ID using utility function
        const batchId = this.generateBatchId();
        
        // Display the generated batch ID in the form
        document.getElementById('plant-batch-id').value = batchId;

        // Handle seed variety - check if custom variety was entered
        const seedVarietySelect = document.getElementById('plant-seed-variety');
        const customVarietyInput = document.getElementById('plant-seed-variety-custom');
        let selectedVariety = seedVarietySelect ? seedVarietySelect.value : '';
        
        if (selectedVariety === '__add_new__' && customVarietyInput && customVarietyInput.value.trim()) {
            // Add the new variety first
            const cropTypeSelect = document.getElementById('plant-crop-type');
            const cropType = cropTypeSelect ? cropTypeSelect.value : '';
            
            if (cropType && customVarietyInput.value.trim()) {
                const success = await this.addNewSeedVariety(cropType, customVarietyInput.value.trim());
                if (success) {
                    selectedVariety = customVarietyInput.value.trim();
                } else {
                    return; // Exit if adding variety failed
                }
            }
        }

        // Collect form data with defensive checks
        const plantDateEl = document.getElementById('plant-date');
        const plantBedEl = document.getElementById('plant-grow-bed');
        const plantCountEl = document.getElementById('plant-count');
        const plantSpacingEl = document.getElementById('plant-spacing');
        const plantStageEl = document.getElementById('plant-stage');
        const plantNotesEl = document.getElementById('plant-notes');
        const plantHarvestEl = document.getElementById('plant-days-to-harvest');
        const cropTypeEl = document.getElementById('plant-crop-type');

        if (!plantDateEl || !plantBedEl || !plantCountEl || !plantSpacingEl || !plantStageEl || !cropTypeEl) {
            this.app.showNotification('Required form fields not found. Please refresh the page.', 'error');
            return;
        }

        const data = {
            date: plantDateEl.value,
            grow_bed_id: parseInt(plantBedEl.value),
            crop_type: cropTypeEl.value,
            count: parseInt(plantCountEl.value),
            new_seedlings: parseInt(plantCountEl.value),
            growth_stage: plantStageEl.value,
            health: 'good',
            notes: plantNotesEl ? plantNotesEl.value : '',
            // New batch tracking fields
            batch_id: batchId,
            seed_variety: selectedVariety,
            batch_created_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            days_to_harvest: plantHarvestEl ? (parseInt(plantHarvestEl.value) || null) : null,
            // Plant spacing for area calculation
            plant_spacing: parseInt(plantSpacingEl.value)
        };

        // Validate the data
        const validation = this.app.formValidation.validatePlantEntry(data);
        if (!validation.valid) {
            this.app.showNotification(validation.message, 'warning');
            return;
        }

        try {
            // Make API call directly
            await this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            // Reload data and update displays
            await this.app.loadDataRecords();
            await this.app.updateDashboardFromData();
            this.app.updateGrowBeds();
            this.app.updatePlantGrowthHistoryDisplay();
            this.app.updatePlantRecommendations();
            this.app.updateRecentPlantEntries();
            if (document.getElementById('plant-actions-container')) {
                await this.app.loadPlantActionsHistory();
            }
            await this.app.updatePlantOverview();
            this.app.updateRemainingPlantsDisplay();
            
            // Show success notification
            const cleanCropName = this.app.utilities ? this.app.utilities.cleanCustomCropName(data.crop_type) : data.crop_type;
            this.app.showNotification(`🌱 Recorded planting of ${data.count} ${cleanCropName} plants in batch ${batchId}!`, 'success');
            
            // Clear the planting form
            this.app.clearPlantingForm();
            
            return { success: true, batchId, cropType: data.crop_type, count: data.count, data };
            
        } catch (error) {
            console.error('Error recording planting:', error);
            this.app.showNotification('Failed to record planting', 'error');
            return null;
        }
    }

    /**
     * Record harvest with batch tracking
     * Complexity: 20, Lines: 50+
     */
    async recordHarvest() {
        if (!this.app.activeSystemId) {
            this.app.showNotification('Please select a system first.', 'warning');
            return;
        }

        // Get selected batches for harvest
        const selectedBatches = this.getSelectedHarvestBatches();
        
        if (selectedBatches.length === 0) {
            this.app.showNotification('Please select at least one batch to harvest from', 'error');
            return;
        }

        if (selectedBatches.length > 1) {
            this.app.showNotification('Please select only one batch per harvest entry', 'error');
            return;
        }

        // Get harvest form data
        const harvestData = this.collectHarvestFormData(selectedBatches[0]);
        
        if (!harvestData) {
            this.app.showNotification('Please fill in all required harvest fields', 'error');
            return;
        }

        // Submit harvest to API
        const success = await this.submitHarvestData(harvestData);
        
        if (success) {
            const data = success.data || success;
            
            // Show success notification
            const cleanCropName = this.app.utilities ? this.app.utilities.cleanCustomCropName(data.crop_type) : data.crop_type;
            const harvestText = data.plants_harvested > 0 ? 
                `${data.plants_harvested} plants` : 
                `${data.harvest_weight/1000}kg`;
            
            this.app.showNotification(`Harvested ${harvestText} of ${cleanCropName}`, 'success');

            // Update all relevant displays
            setTimeout(async () => {
                this.app.loadDataRecords();
                this.app.updateGrowBeds();
                this.app.updatePlantGrowthHistoryDisplay();
                this.app.updatePlantRecommendations();
                this.app.updateRecentPlantEntries();
                await this.app.updatePlantOverview();
                this.updateRemainingPlantsDisplay();
                
                return { success: true, data };
            });
            
            // Success actions after modal closes
            if (this.app.plantModalManager) {
                this.app.plantModalManager.hidePlantModal();
            }
            
            // Clear form
            this.app.clearHarvestForm();
            
        } else {
            console.error('Failed to record harvest - API returned false');
            this.app.showNotification('Failed to record harvest. Please try again.', 'error');
        }
    }

    /**
     * Collect harvest form data
     */
    collectHarvestFormData(selectedBatch) {
        const harvestDate = document.getElementById('harvest-date')?.value;
        const harvestCount = document.getElementById('harvest-plant-count')?.value || 0;
        const harvestWeight = document.getElementById('harvest-weight')?.value || 0;
        const harvestNotes = document.getElementById('harvest-notes')?.value || '';
        const harvestQuality = document.getElementById('harvest-quality')?.value || 'good';
        
        // Validate required fields
        if (!harvestDate) {
            this.app.showNotification('Please select a harvest date', 'error');
            return null;
        }
        
        if (!harvestCount && !harvestWeight) {
            this.app.showNotification('Please enter either plant count or harvest weight', 'error');
            return null;
        }
        
        return {
            date: harvestDate,
            grow_bed_id: selectedBatch.bedId,
            crop_type: selectedBatch.cropType,
            plants_harvested: parseInt(harvestCount) || 0,
            harvest_weight: parseFloat(harvestWeight) * 1000 || 0, // Convert kg to grams
            health: harvestQuality,
            growth_stage: 'harvest',
            notes: harvestNotes,
            batch_id: selectedBatch.batchId
        };
    }

    /**
     * Submit harvest data to API
     */
    async submitHarvestData(harvestData) {
        try {
            const response = await fetch(`/api/data/plant-growth/${this.app.activeSystemId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(harvestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success ? result : false;
            
        } catch (error) {
            console.error('Error submitting harvest data:', error);
            return false;
        }
    }

    /**
     * Generate batch ID with timestamp
     * Complexity: 5, Lines: 10
     */
    generateBatchId(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `BATCH_${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    /**
     * Parse date from batch ID
     * Complexity: 8, Lines: 15
     */
    parseBatchIdDate(batchId) {
        if (!batchId || !batchId.startsWith('BATCH_')) {
            return null;
        }
        
        const parts = batchId.split('_');
        if (parts.length < 3) {
            return null;
        }
        
        const datePart = parts[1]; // YYYYMMDD
        const timePart = parts[2]; // HHMMSS
        
        if (datePart.length !== 8 || timePart.length !== 6) {
            return null;
        }
        
        const year = parseInt(datePart.substring(0, 4));
        const month = parseInt(datePart.substring(4, 6)) - 1;
        const day = parseInt(datePart.substring(6, 8));
        const hours = parseInt(timePart.substring(0, 2));
        const minutes = parseInt(timePart.substring(2, 4));
        const seconds = parseInt(timePart.substring(4, 6));
        
        return new Date(year, month, day, hours, minutes, seconds);
    }

    /**
     * Add new seed variety to database
     * Complexity: 12, Lines: 25
     */
    async addNewSeedVariety(cropType, varietyName) {
        try {
            await this.app.makeApiCall('/seed-varieties', {
                method: 'POST',
                body: JSON.stringify({
                    crop_type: cropType,
                    variety_name: varietyName
                })
            });
            
            // Refresh the dropdown with the new variety
            await this.updateSeedVarietiesForCrop(cropType);
            
            // Select the newly added variety
            const seedVarietySelect = document.getElementById('plant-seed-variety');
            if (seedVarietySelect) {
                seedVarietySelect.value = varietyName;
            }
            
            this.app.showNotification(`Added new variety: ${varietyName}`, 'success');
            return true;
            
        } catch (error) {
            console.error('Error adding seed variety:', error);
            this.app.showNotification(`Failed to add variety: ${error.message || 'Unknown error'}`, 'error');
            return false;
        }
    }

    /**
     * Update seed varieties for selected crop
     * Complexity: 10, Lines: 25
     */
    async updateSeedVarietiesForCrop(cropType) {
        const seedVarietySelect = document.getElementById('plant-seed-variety');
        if (!seedVarietySelect || !cropType) {
            // Reset dropdown if no crop selected
            if (seedVarietySelect) {
                seedVarietySelect.innerHTML = `
                    <option value="">Select variety...</option>
                    <option value="__add_new__">➕ Add New Variety</option>
                `;
            }
            return;
        }
        
        try {
            const data = await this.app.makeApiCall(`/seed-varieties/crop/${cropType}`);
            
            // Build dropdown options
            let optionsHtml = '<option value="">Select variety...</option>';
            
            if (data.varieties && data.varieties.length > 0) {
                data.varieties.forEach(variety => {
                    optionsHtml += `<option value="${variety.variety_name}">${variety.variety_name}</option>`;
                });
            }
            
            optionsHtml += '<option value="__add_new__">➕ Add New Variety</option>';
            seedVarietySelect.innerHTML = optionsHtml;
            
        } catch (error) {
            console.error('Error fetching seed varieties:', error);
        }
    }

    /**
     * Initialize seed variety dropdown functionality
     * Complexity: 8, Lines: 15
     */
    initializeSeedVarietyDropdown() {
        const seedVarietySelect = document.getElementById('plant-seed-variety');
        const customInput = document.getElementById('plant-seed-variety-custom');
        
        if (seedVarietySelect && customInput) {
            seedVarietySelect.addEventListener('change', (e) => {
                if (e.target.value === '__add_new__') {
                    customInput.style.display = 'block';
                    customInput.focus();
                } else {
                    customInput.style.display = 'none';
                    customInput.value = '';
                }
            });
        }
    }

    /**
     * Get selected harvest batches from UI
     * Complexity: 10, Lines: 15
     */
    getSelectedHarvestBatches() {
        const selectedBatches = [];
        const batchCheckboxes = document.querySelectorAll('input[name="harvest-batch"]:checked');
        
        batchCheckboxes.forEach(checkbox => {
            selectedBatches.push({
                batchId: checkbox.value,
                cropType: checkbox.dataset.cropType,
                bedId: checkbox.dataset.bedId
            });
        });
        
        return selectedBatches;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            hasPlantData: !!this.app.plantData,
            plantDataCount: this.app.plantData?.length || 0
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Plant Batch Manager component');
    }
}

// Export both class and create a factory function
export default PlantBatchManagerComponent;

/**
 * Factory function to create plant batch manager component
 */
export function createPlantBatchManagerComponent(app) {
    return new PlantBatchManagerComponent(app);
}