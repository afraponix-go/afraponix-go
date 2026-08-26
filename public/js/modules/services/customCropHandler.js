// Custom Crop Handler Service
// Handles custom crop creation and editing operations

export class CustomCropHandler {
    constructor(app) {
        this.app = app;
    }

    /**
     * Save handler for simple custom crop (just name)
     */
    async handleSimpleCropSave(modalOverlay) {
        const cropName = document.getElementById('custom-crop-name-input')?.value.trim();
        if (!cropName) {
            this.app.showNotification('Please enter a crop name', 'warning');
            return false;
        }
        
        try {
            const response = await this.app.makeApiCall('/plants/custom-crops', {
                method: 'POST',
                body: JSON.stringify({
                    cropName: cropName,
                    systemId: this.app.activeSystemId || this.app.systemWizardData?.systemId || null
                })
            });
            
            if (response) {
                this.app.showNotification(`Custom crop "${cropName}" added successfully!`, 'success');
                modalOverlay.remove();
                
                // Refresh the plant allocation section
                await this.app.updatePlantAllocationFields();
                return true;
            }
        } catch (error) {
            console.error('Error adding custom crop:', error);
            this.app.showNotification('Failed to add custom crop. Please try again.', 'error');
            return false;
        }
    }

    /**
     * Save handler for advanced custom crop (name + nutrient targets)
     */
    async handleAdvancedCropSave(modalOverlay, isEdit = false, existingCrop = null) {
        const cropName = document.getElementById('custom-crop-name-input')?.value.trim();
        if (!cropName) {
            this.app.showNotification('Please enter a crop name', 'warning');
            return false;
        }
        
        const cropData = {
            cropName: cropName,
            targetN: parseFloat(document.getElementById('target-n')?.value) || 0,
            targetP: parseFloat(document.getElementById('target-p')?.value) || 0,
            targetK: parseFloat(document.getElementById('target-k')?.value) || 0,
            targetCa: parseFloat(document.getElementById('target-ca')?.value) || 0,
            targetMg: parseFloat(document.getElementById('target-mg')?.value) || 0,
            targetFe: parseFloat(document.getElementById('target-fe')?.value) || 0,
            targetEc: parseFloat(document.getElementById('target-ec')?.value) || 0,
            systemId: this.app.activeSystemId
        };
        
        try {
            if (isEdit && existingCrop) {
                await this.app.makeApiCall(`/plants/custom-crops/${existingCrop.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(cropData)
                });
                this.app.showNotification(`Custom crop "${cropName}" updated successfully!`, 'success');
            } else {
                await this.app.makeApiCall('/plants/custom-crops', {
                    method: 'POST',
                    body: JSON.stringify(cropData)
                });
                this.app.showNotification(`Custom crop "${cropName}" added successfully!`, 'success');
            }
            
            modalOverlay.remove();
            
            // Refresh the custom crops display
            await this.app.loadCustomCrops();
            
            // Update dropdowns in allocations if we're on that tab
            const allocationsTab = document.querySelector('[data-content="allocate-crops"]');
            if (allocationsTab && allocationsTab.classList.contains('active')) {
                await this.app.loadPlantAllocations();
            }
            
            return true;
        } catch (error) {
            console.error('Error saving custom crop:', error);
            this.app.showNotification('Failed to save custom crop. Please try again.', 'error');
            return false;
        }
    }

    /**
     * Attach event listeners for simple crop modal
     */
    attachSimpleCropListeners(modalOverlay) {
        const saveHandler = () => this.handleSimpleCropSave(modalOverlay);
        
        document.getElementById('save-custom-crop')?.addEventListener('click', saveHandler);
        document.getElementById('cancel-custom-crop')?.addEventListener('click', () => modalOverlay.remove());
        document.getElementById('custom-crop-name-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveHandler();
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });
    }

    /**
     * Attach event listeners for advanced crop modal
     */
    attachAdvancedCropListeners(modalOverlay, isEdit = false, existingCrop = null) {
        const saveHandler = () => this.handleAdvancedCropSave(modalOverlay, isEdit, existingCrop);
        
        document.getElementById('save-custom-crop')?.addEventListener('click', saveHandler);
        document.getElementById('cancel-custom-crop')?.addEventListener('click', () => modalOverlay.remove());
        
        // Allow Enter key to save from any input
        const inputs = modalOverlay.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') saveHandler();
            });
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });
    }
}

// Export as default for easy importing
export default CustomCropHandler;