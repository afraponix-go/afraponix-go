// Modal Manager Component
// Handles all modal dialogs, slideout panels, and confirmation dialogs

/**
 * Modal Manager Component Class
 * Manages all modal-related functionality across the application
 * Extracts modal management logic from main application class
 */
export class ModalManagerComponent {
    constructor(app) {
        this.app = app;
        this.activeModals = new Map();
        this.modalStack = [];
        this.defaultConfig = {
            backdrop: true,
            keyboard: true,
            focus: true,
            animation: true,
            animationDuration: 400
        };
        
        console.log('📋 Modal Manager Component initialized');
    }

    /**
     * Show auth modal (login/register/forgot-password)
     * Complexity: 8, Lines: 14
     * Extracted from script.js showModal function
     */
    showModal(type = 'login') {
        // Close any open slide-out panels first
        this.closeAllSlideoutPanels();
        
        if (type === 'register') {
            this.showRegisterSlideout();
        } else if (type === 'forgot-password') {
            this.showForgotPasswordSlideout();
        } else {
            this.showLoginSlideout();
        }
        
        this.app.clearMessages();
    }

    /**
     * Show login slideout panel
     * Complexity: 6, Lines: 10
     * Extracted from script.js showLoginSlideout function
     */
    showLoginSlideout() {
        const backdrop = document.getElementById('login-slideout-backdrop');
        const panel = document.getElementById('login-slideout-panel');
        
        if (!backdrop || !panel) {
            console.warn('Login slideout elements not found');
            return;
        }
        
        backdrop.classList.add('show');
        // Small delay for smooth animation
        setTimeout(() => {
            panel.classList.add('show');
        }, 10);
        
        this.trackModal('login-slideout', { backdrop, panel });
    }

    /**
     * Show register slideout panel
     * Complexity: 8, Lines: 15
     * Extracted from script.js showRegisterSlideout function
     */
    showRegisterSlideout() {
        const backdrop = document.getElementById('register-slideout-backdrop');
        const panel = document.getElementById('register-slideout-panel');
        
        if (!backdrop || !panel) {
            console.warn('Register slideout elements not found');
            return;
        }
        
        // Reset to step 1
        const step1 = document.getElementById('register-step-1');
        const step2 = document.getElementById('register-step-2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        
        backdrop.classList.add('show');
        setTimeout(() => {
            panel.classList.add('show');
        }, 10);
        
        this.trackModal('register-slideout', { backdrop, panel });
    }

    /**
     * Show forgot password slideout panel
     * Complexity: 6, Lines: 10
     * Extracted from script.js showForgotPasswordSlideout function
     */
    showForgotPasswordSlideout() {
        const backdrop = document.getElementById('forgot-password-slideout-backdrop');
        const panel = document.getElementById('forgot-password-slideout-panel');
        
        if (!backdrop || !panel) {
            console.warn('Forgot password slideout elements not found');
            return;
        }
        
        backdrop.classList.add('show');
        setTimeout(() => {
            panel.classList.add('show');
        }, 10);
        
        this.trackModal('forgot-password-slideout', { backdrop, panel });
    }

    /**
     * Close login slideout panel
     * Complexity: 8, Lines: 10
     * Extracted from script.js closeLoginSlideout function
     */
    closeLoginSlideout() {
        const backdrop = document.getElementById('login-slideout-backdrop');
        const panel = document.getElementById('login-slideout-panel');
        
        if (panel) panel.classList.remove('show');
        setTimeout(() => {
            if (backdrop) backdrop.classList.remove('show');
        }, this.defaultConfig.animationDuration);
        
        this.app.clearMessages();
        this.untrackModal('login-slideout');
    }

    /**
     * Close register slideout panel
     * Complexity: 8, Lines: 10
     * Extracted from script.js closeRegisterSlideout function
     */
    closeRegisterSlideout() {
        const backdrop = document.getElementById('register-slideout-backdrop');
        const panel = document.getElementById('register-slideout-panel');
        
        if (panel) panel.classList.remove('show');
        setTimeout(() => {
            if (backdrop) backdrop.classList.remove('show');
        }, this.defaultConfig.animationDuration);
        
        this.app.clearMessages();
        this.untrackModal('register-slideout');
    }

    /**
     * Close forgot password slideout panel
     * Complexity: 8, Lines: 10
     * Extracted from script.js closeForgotPasswordSlideout function
     */
    closeForgotPasswordSlideout() {
        const backdrop = document.getElementById('forgot-password-slideout-backdrop');
        const panel = document.getElementById('forgot-password-slideout-panel');
        
        if (panel) panel.classList.remove('show');
        setTimeout(() => {
            if (backdrop) backdrop.classList.remove('show');
        }, this.defaultConfig.animationDuration);
        
        this.app.clearMessages();
        this.untrackModal('forgot-password-slideout');
    }

    /**
     * Close all slideout panels
     * Complexity: 4, Lines: 5
     * Extracted from script.js closeAllSlideoutPanels function
     */
    closeAllSlideoutPanels() {
        this.closeLoginSlideout();
        this.closeRegisterSlideout();
        this.closeForgotPasswordSlideout();
    }

    /**
     * Close auth modal (wrapper for slideout panels)
     * Complexity: 2, Lines: 3
     * Extracted from script.js closeAuthModal function
     */
    closeAuthModal() {
        // Updated to work with slide-out panels
        this.closeAllSlideoutPanels();
    }

    /**
     * Show custom confirmation dialog
     * Complexity: 25, Lines: 55
     * Extracted from script.js showCustomConfirm function
     */
    showCustomConfirm(title, message, details = []) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const detailsEl = document.getElementById('confirm-details');
            const cancelBtn = document.getElementById('confirm-cancel');
            const okBtn = document.getElementById('confirm-ok');
            
            if (!modal || !titleEl || !messageEl) {
                console.warn('Confirmation modal elements not found');
                resolve(false);
                return;
            }
            
            // Set content
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            if (detailsEl) {
                if (details.length > 0) {
                    detailsEl.innerHTML = `
                        This will:
                        <ul>
                            ${details.map(detail => `<li>${detail}</li>`).join('')}
                        </ul>
                    `;
                    detailsEl.style.display = 'block';
                } else {
                    detailsEl.style.display = 'none';
                }
            }
            
            // Set up event handlers
            const handleCancel = () => {
                modal.classList.remove('show');
                resolve(false);
                this.cleanupEventListeners();
            };
            
            const handleOk = () => {
                modal.classList.remove('show');
                resolve(true);
                this.cleanupEventListeners();
            };
            
            // Cleanup function for event listeners
            const cleanupEventListeners = () => {
                if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
                if (okBtn) okBtn.removeEventListener('click', handleOk);
                document.removeEventListener('keydown', handleKeydown);
            };
            
            // Keyboard handler
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                } else if (e.key === 'Enter') {
                    handleOk();
                }
            };
            
            // Attach event listeners
            if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
            if (okBtn) okBtn.addEventListener('click', handleOk);
            document.addEventListener('keydown', handleKeydown);
            
            // Store cleanup function for later use
            this.cleanupEventListeners = cleanupEventListeners;
            
            // Show modal
            modal.classList.add('show');
            this.trackModal('confirm-modal', { modal });
        });
    }

    /**
     * Show batch modal with batch details
     * Complexity: 35, Lines: 85
     * Extracted from script.js showBatchModal function
     */
    async showBatchModal(batch, bed) {
        // Hide any tooltips first
        if (this.app.hideLayoutTooltip) {
            this.app.hideLayoutTooltip();
        }
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'component-modal-overlay';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        const cropName = this.app.cleanCustomCropName ? this.app.cleanCustomCropName(batch.cropName) : batch.cropName;
        const plantedDate = batch.plantedDate ? new Date(batch.plantedDate).toLocaleDateString() : 'Unknown';
        
        // Use a unique numeric ID for the batch modal elements
        const batchModalId = Date.now();
        
        // Generate bed options asynchronously
        const bedOptions = await this.generateBedOptions(bed.id);
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2><img src="/icons/new-icons/Afraponix Go Icons_plant.svg" alt="Plant" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> Batch ${batch.id || 'N/A'}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="batch-info-grid">
                    <div class="info-item">
                        <label>Grow Bed:</label>
                        <span>${bed.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Crop Type:</label>
                        <span>${cropName}</span>
                    </div>
                    <div class="info-item">
                        <label>Plant Count:</label>
                        <span>${batch.plantCount || 0}</span>
                    </div>
                    <div class="info-item">
                        <label>Area Used:</label>
                        <span>${batch.area ? batch.area.toFixed(2) : 'N/A'} m²</span>
                    </div>
                    <div class="info-item">
                        <label>Planted Date:</label>
                        <span>${plantedDate}</span>
                    </div>
                    <div class="info-item">
                        <label>Days Growing:</label>
                        <span>${batch.daysGrowing || 0} days</span>
                    </div>
                    <div class="info-item">
                        <label>Expected Harvest:</label>
                        <span>${batch.expectedHarvest || 'Not set'}</span>
                    </div>
                    <div class="info-item">
                        <label>Status:</label>
                        <span>${batch.status || 'Active'}</span>
                    </div>
                    <div class="info-item">
                        <label>Health:</label>
                        <span>${batch.health || 'Good'}</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <h3>Actions</h3>
                    <div class="action-buttons">
                        <button class="btn btn-primary" id="move-batch-${batchModalId}">
                            <img src="/icons/new-icons/Afraponix Go Icons_copy.svg" alt="Move" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.5em;">
                            Move Batch
                        </button>
                        <button class="btn btn-success" id="harvest-batch-${batchModalId}">
                            <img src="/icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Harvest" style="width: 1em; height: 1em; vertical-align: middle; margin-right: 0.5em;">
                            Harvest
                        </button>
                    </div>
                </div>
                
                <div id="move-section-${batchModalId}" class="move-section" style="display: none;">
                    <h4>Move to Different Bed</h4>
                    <div class="form-group">
                        <label for="target-bed-${batchModalId}">Target Grow Bed:</label>
                        <select id="target-bed-${batchModalId}" class="form-input">
                            ${bedOptions}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" id="confirm-move-${batchModalId}">Confirm Move</button>
                        <button class="btn btn-secondary" id="cancel-move-${batchModalId}">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Set up event listeners
        this.setupBatchModalEventListeners(batchModalId, batch, bed, overlay);
        
        this.trackModal('batch-modal', { overlay, modal });
    }

    /**
     * Generate bed options for batch modal
     */
    async generateBedOptions(currentBedId) {
        try {
            const growBeds = await this.app.getGrowBedsForSystem();
            
            if (!growBeds || growBeds.length === 0) {
                return '<option value="">No grow beds available</option>';
            }
            
            return growBeds
                .filter(bed => bed.id !== currentBedId)
                .map(bed => `<option value="${bed.id}">${bed.name || `Bed ${bed.bed_number}`} (${bed.bed_type || 'Unknown'})</option>`)
                .join('');
                
        } catch (error) {
            console.error('Error generating bed options:', error);
            return '<option value="">Error loading beds</option>';
        }
    }

    /**
     * Setup event listeners for batch modal
     */
    setupBatchModalEventListeners(batchModalId, batch, bed, overlay) {
        // Move batch button
        const moveBtn = document.getElementById(`move-batch-${batchModalId}`);
        const moveSection = document.getElementById(`move-section-${batchModalId}`);
        const confirmMoveBtn = document.getElementById(`confirm-move-${batchModalId}`);
        const cancelMoveBtn = document.getElementById(`cancel-move-${batchModalId}`);
        const harvestBtn = document.getElementById(`harvest-batch-${batchModalId}`);
        
        if (moveBtn) {
            moveBtn.addEventListener('click', () => {
                moveSection.style.display = moveSection.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        if (cancelMoveBtn) {
            cancelMoveBtn.addEventListener('click', () => {
                moveSection.style.display = 'none';
            });
        }
        
        if (confirmMoveBtn) {
            confirmMoveBtn.addEventListener('click', async () => {
                await this.handleBatchMove(batchModalId, batch, overlay);
            });
        }
        
        if (harvestBtn) {
            harvestBtn.addEventListener('click', () => {
                this.handleBatchHarvest(batch, overlay);
            });
        }
        
        // Close modal on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    /**
     * Handle batch move operation
     */
    async handleBatchMove(batchModalId, batch, overlay) {
        const targetBedSelect = document.getElementById(`target-bed-${batchModalId}`);
        if (!targetBedSelect || !targetBedSelect.value) {
            this.app.showNotification('Please select a target grow bed', 'warning');
            return;
        }
        
        try {
            await this.app.submitBatchMove({
                batch_id: batch.id,
                target_grow_bed_id: targetBedSelect.value
            });
            
            overlay.remove();
            this.app.showNotification('Batch moved successfully!', 'success');
        } catch (error) {
            console.error('Error moving batch:', error);
            this.app.showNotification('Failed to move batch', 'error');
        }
    }

    /**
     * Handle batch harvest operation
     */
    handleBatchHarvest(batch, overlay) {
        // Close modal and open harvest form with pre-filled data
        overlay.remove();
        
        if (this.app.openHarvestForm) {
            this.app.openHarvestForm(batch);
        } else {
            this.app.showNotification('Harvest functionality not available', 'warning');
        }
    }

    /**
     * Create a generic modal
     */
    createModal(config = {}) {
        const settings = { ...this.defaultConfig, ...config };
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        if (settings.id) overlay.id = settings.id;
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        if (settings.title || settings.content) {
            modal.innerHTML = `
                ${settings.title ? `
                    <div class="modal-header">
                        <h2>${settings.title}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                ` : ''}
                ${settings.content ? `
                    <div class="modal-body">
                        ${settings.content}
                    </div>
                ` : ''}
            `;
        }
        
        overlay.appendChild(modal);
        
        if (settings.backdrop) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && settings.dismissible !== false) {
                    this.closeModal(overlay);
                }
            });
        }
        
        if (settings.keyboard) {
            const handleKeydown = (e) => {
                if (e.key === 'Escape' && settings.dismissible !== false) {
                    this.closeModal(overlay);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        }
        
        return { overlay, modal };
    }

    /**
     * Show a generic modal
     */
    showGenericModal(config = {}) {
        const { overlay, modal } = this.createModal(config);
        document.body.appendChild(overlay);
        
        if (config.animation) {
            setTimeout(() => overlay.classList.add('show'), 10);
        } else {
            overlay.classList.add('show');
        }
        
        this.trackModal(config.id || 'generic-modal', { overlay, modal });
        return { overlay, modal };
    }

    /**
     * Close a specific modal
     */
    closeModal(modalElement) {
        if (typeof modalElement === 'string') {
            modalElement = document.getElementById(modalElement);
        }
        
        if (modalElement) {
            modalElement.classList.remove('show');
            setTimeout(() => {
                if (modalElement.parentNode) {
                    modalElement.remove();
                }
            }, this.defaultConfig.animationDuration);
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.closeAllSlideoutPanels();
        
        // Close all tracked modals
        this.activeModals.forEach((modal, id) => {
            this.closeModal(modal.overlay || modal.modal);
        });
        
        // Close any remaining modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.remove();
        });
        
        this.activeModals.clear();
        this.modalStack = [];
    }

    /**
     * Track active modals
     */
    trackModal(id, elements) {
        this.activeModals.set(id, elements);
        this.modalStack.push(id);
    }

    /**
     * Untrack modal
     */
    untrackModal(id) {
        this.activeModals.delete(id);
        const index = this.modalStack.indexOf(id);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
    }

    /**
     * Get active modal count
     */
    getActiveModalCount() {
        return this.activeModals.size;
    }

    /**
     * Check if a specific modal is active
     */
    isModalActive(id) {
        return this.activeModals.has(id);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            activeModals: this.activeModals.size,
            modalStack: this.modalStack.length,
            componentLoaded: true
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Modal Manager component');
        this.closeAllModals();
        this.activeModals.clear();
        this.modalStack = [];
    }
}

// Export both class and create a factory function
export default ModalManagerComponent;

/**
 * Factory function to create modal manager component
 */
export function createModalManagerComponent(app) {
    return new ModalManagerComponent(app);
}