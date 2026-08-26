/**
 * System Creation Wizard Component
 * Handles the complete system creation workflow including:
 * - Quick start options (demo vs custom)
 * - Basic system information
 * - Fish tank configuration
 * - Grow bed configuration
 * - Plant allocation setup
 */

export class SystemCreationWizard {
    constructor(app) {
        this.app = app;
        this.currentStep = 1;
        this.fishTankFieldsGenerated = false;  // Track if fish tank fields have been generated
        this.growBedFieldsGenerated = false;   // Track if grow bed fields have been generated
        this.wizardData = {
            setupType: 'custom',
            fishTanks: [],
            growBeds: [],
            demoData: null
        };

        // Fish type defaults for calculations
        this.fishData = {
            tilapia: { defaultDensity: 20, harvestWeight: 500 },
            carp: { defaultDensity: 15, harvestWeight: 800 },
            catfish: { defaultDensity: 25, harvestWeight: 600 },
            trout: { defaultDensity: 30, harvestWeight: 400 }
        };

        console.log('🧙 System Creation Wizard Component initialized');
    }

    /**
     * Open the system creation wizard modal
     */
    openWizard() {
        const modal = document.getElementById('new-system-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.currentStep = 1;
            this.resetWizard();
            this.updateProgressIndicator();
        }
    }

    /**
     * Close the wizard modal
     */
    closeWizard() {
        const modal = document.getElementById('new-system-modal');
        if (modal) {
            // The modal is opened via the `show` class (.modal.show { display: flex !important }),
            // so an inline display:none alone is overridden. Remove the class to actually hide it.
            modal.classList.remove('show');
            modal.style.display = 'none';
            this.resetWizard();
        }
    }

    /**
     * Reset wizard to initial state
     */
    resetWizard() {
        this.currentStep = 1;
        this.fishTankFieldsGenerated = false;  // Reset generation flags
        this.growBedFieldsGenerated = false;
        this.wizardData = {
            setupType: 'custom',
            fishTanks: [],
            growBeds: [],
            demoData: null
        };

        // Reset form
        const form = document.getElementById('new-system-form');
        if (form) {
            form.reset();
        }

        // Clear generated fields
        const fishTankContainer = document.getElementById('fish-tank-details');
        if (fishTankContainer) fishTankContainer.innerHTML = '';
        const growBedContainer = document.getElementById('grow-bed-details');
        if (growBedContainer) growBedContainer.innerHTML = '';

        // Show first step
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        const firstStep = document.querySelector('.wizard-step[data-step="1"]');
        if (firstStep) {
            firstStep.classList.add('active');
        }

        this.updateProgressIndicator();
    }

    /**
     * Move to next step in wizard
     */
    async nextStep() {
        // Validate current step before proceeding
        if (!await this.validateCurrentStep()) {
            return;
        }

        // Save current step data AFTER validation passes
        this.saveStepData();

        // Move to next step
        this.currentStep++;

        // Special handling for step transitions.
        // Regenerate whenever the requested count no longer matches what's rendered,
        // so changing tank/bed counts on an earlier step is reflected here (previously a
        // one-shot flag froze the fields at their first-generated count).
        if (this.currentStep === 3) {
            const tankCount = parseInt(document.getElementById('new-fish-tank-count').value) || 1;
            const rendered = document.querySelectorAll('#fish-tank-details select[id^="wizard-tank-fish-"]').length;
            if (!this.fishTankFieldsGenerated || rendered !== tankCount) {
                if (rendered > 0) this.saveFishTankData();   // preserve current entries before rebuilding
                this.generateFishTankFields(tankCount);
                this.fishTankFieldsGenerated = true;
            }
        } else if (this.currentStep === 4) {
            const bedCount = parseInt(document.getElementById('new-grow-bed-count').value) || 1;
            const rendered = document.querySelectorAll('#grow-bed-details select[id^="wizard-bed-type-"]').length;
            if (!this.growBedFieldsGenerated || rendered !== bedCount) {
                if (rendered > 0) this.saveGrowBedData();     // preserve current entries before rebuilding
                this.generateGrowBedFields(bedCount);
                this.growBedFieldsGenerated = true;
            }
        }

        this.updateStepDisplay();
        this.updateProgressIndicator();
    }

    /**
     * Move to previous step in wizard
     */
    prevStep() {
        if (this.currentStep > 1) {
            // Save current step data before going back
            this.saveStepData();

            this.currentStep--;
            this.updateStepDisplay();
            this.updateProgressIndicator();
        }
    }

    /**
     * Update step display (show/hide appropriate steps)
     */
    updateStepDisplay() {
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });

        const currentStepElement = document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }

        // Update button visibility
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const submitBtn = document.querySelector('.submit-btn');

        if (prevBtn) prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = this.currentStep === 4 ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = this.currentStep === 4 ? 'inline-flex' : 'none';
    }

    /**
     * Update progress indicator
     */
    updateProgressIndicator() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }

    /**
     * Save current step data to wizardData
     */
    saveStepData() {
        switch(this.currentStep) {
            case 1:
                this.wizardData.setupType = document.querySelector('input[name="system-setup"]:checked')?.value || 'custom';
                break;
            case 2:
                // Basic info is saved when moving to next steps
                break;
            case 3:
                // Save fish tank data
                this.saveFishTankData();
                break;
            case 4:
                // Save grow bed data
                this.saveGrowBedData();
                break;
        }
    }

    /**
     * Save fish tank configuration from form
     */
    saveFishTankData() {
        const tankCount = parseInt(document.getElementById('new-fish-tank-count').value) || 1;
        this.wizardData.fishTanks = [];

        console.log(`💾 Saving data for ${tankCount} tanks...`);

        for (let i = 1; i <= tankCount; i++) {
            const nameField = document.getElementById(`wizard-tank-name-${i}`);
            const volumeField = document.getElementById(`wizard-tank-volume-${i}`);
            const fishTypeField = document.getElementById(`wizard-tank-fish-${i}`);
            const densityField = document.getElementById(`wizard-tank-stocking-${i}`);
            const harvestField = document.getElementById(`wizard-tank-harvest-${i}`);

            console.log(`🔍 Tank ${i} fields:`, {
                nameExists: !!nameField,
                volumeExists: !!volumeField,
                volumeValue: volumeField?.value,
                volumeAttribute: volumeField?.getAttribute('value'),
                volumeHTML: volumeField?.outerHTML?.substring(0, 200),
                densityValue: densityField?.value,
                harvestValue: harvestField?.value
            });

            const tankData = {
                name: nameField?.value || `Tank ${i}`,
                volume: (volumeField?.value && !isNaN(parseFloat(volumeField.value))) ? parseFloat(volumeField.value) : 1000,
                fish_type: fishTypeField?.value || 'tilapia',
                stocking_density: (densityField?.value && !isNaN(parseFloat(densityField.value))) ? parseFloat(densityField.value) : 20,
                target_harvest_weight: (harvestField?.value && !isNaN(parseFloat(harvestField.value))) ? parseFloat(harvestField.value) : 500
            };
            console.log(`🐟 Tank ${i} data collected:`, tankData);
            this.wizardData.fishTanks.push(tankData);
        }
        console.log(`✅ Total fish tanks collected: ${this.wizardData.fishTanks.length}`, this.wizardData.fishTanks);
    }

    /**
     * Save grow bed configuration from form
     */
    saveGrowBedData() {
        const bedCount = parseInt(document.getElementById('new-grow-bed-count').value) || 1;
        this.wizardData.growBeds = [];

        for (let i = 1; i <= bedCount; i++) {
            const bedType = document.getElementById(`wizard-bed-type-${i}`)?.value;
            const bedData = this.collectBedDataFromForm(i, bedType);
            console.log(`🌱 Grow bed ${i} (${bedType}) data collected:`, bedData);
            this.wizardData.growBeds.push(bedData);
        }
        console.log(`✅ Total grow beds collected: ${this.wizardData.growBeds.length}`, this.wizardData.growBeds);
    }

    /**
     * Collect grow bed data from form based on bed type
     */
    collectBedDataFromForm(bedIndex, bedType) {
        const formData = {
            name: document.getElementById(`wizard-bed-name-${bedIndex}`)?.value || `Bed ${bedIndex}`,
            type: bedType
        };

        let volume = 0;
        let area = 0;

        // Collect type-specific fields and calculate volume/area
        if (bedType === 'dwc' || bedType === 'flood-drain' || bedType === 'media-flow') {
            formData.length = parseFloat(document.getElementById(`wizard-bed-length-${bedIndex}`)?.value) || 0;
            formData.width = parseFloat(document.getElementById(`wizard-bed-width-${bedIndex}`)?.value) || 0;
            formData.height = parseFloat(document.getElementById(`wizard-bed-height-${bedIndex}`)?.value) || 0;

            // Calculate volume and area
            if (bedType === 'dwc' || bedType === 'media-flow') {
                volume = formData.length * formData.width * formData.height * 1000; // m³ to liters
                area = formData.length * formData.width;
            } else if (bedType === 'flood-drain') {
                volume = formData.length * formData.width * formData.height * 0.3 * 1000; // 30% porosity
                area = formData.length * formData.width;
            }
        } else if (bedType === 'vertical') {
            formData.length = parseFloat(document.getElementById(`wizard-bed-length-${bedIndex}`)?.value) || 0;
            formData.width = parseFloat(document.getElementById(`wizard-bed-width-${bedIndex}`)?.value) || 0;
            formData.height = parseFloat(document.getElementById(`wizard-bed-height-${bedIndex}`)?.value) || 0;
            formData.verticals = parseInt(document.getElementById(`wizard-vertical-count-${bedIndex}`)?.value) || 0;
            formData.plantsPerVertical = parseInt(document.getElementById(`wizard-plants-per-vertical-${bedIndex}`)?.value) || 0;

            // Calculate volume (reservoir) and area (plant sites)
            volume = formData.length * formData.width * formData.height * 1000; // Reservoir volume
            area = formData.verticals * formData.plantsPerVertical * 0.05; // 0.05m² per plant site
        } else if (bedType === 'nft') {
            formData.troughLength = parseFloat(document.getElementById(`wizard-trough-length-${bedIndex}`)?.value) || 0;
            formData.channels = parseInt(document.getElementById(`wizard-bed-channels-${bedIndex}`)?.value) || 0;
            formData.plantSpacing = parseFloat(document.getElementById(`plant-spacing-${bedIndex}`)?.value) || 0;
            formData.reservoirVolume = parseFloat(document.getElementById(`reservoir-volume-${bedIndex}`)?.value) || 0;

            // Calculate volume and area
            volume = formData.channels * formData.troughLength * 0.002 * 1000; // Minimal trough volume
            area = formData.channels * formData.troughLength * (formData.plantSpacing / 100); // Convert cm to m
        }

        // Add calculated values to formData
        formData.volume_liters = Math.round(volume);
        formData.equivalent_m2 = parseFloat(area.toFixed(2));

        return formData;
    }

    /**
     * Validate current wizard step
     */
    async validateCurrentStep() {
        const errors = [];

        switch(this.currentStep) {
            case 1:
                const setupType = document.querySelector('input[name="system-setup"]:checked')?.value;
                if (!setupType) {
                    errors.push('Please select a setup method');
                }
                break;

            case 2:
                const name = document.getElementById('new-system-name').value.trim();
                const tankCount = parseInt(document.getElementById('new-fish-tank-count').value);
                const bedCount = parseInt(document.getElementById('new-grow-bed-count').value);

                if (!name) errors.push('System name is required');
                if (!tankCount || tankCount < 1) errors.push('At least 1 fish tank is required');
                if (!bedCount || bedCount < 1) errors.push('At least 1 grow bed is required');
                break;

            case 3:
                // Validate fish tank data from saved wizardData
                console.log(`🔍 Validating ${this.wizardData.fishTanks.length} fish tanks...`);
                for (let i = 0; i < this.wizardData.fishTanks.length; i++) {
                    const tank = this.wizardData.fishTanks[i];
                    console.log(`🔍 Tank ${i+1}: volume=${tank.volume}`);
                    if (!tank.volume || tank.volume < 100) {
                        errors.push(`Tank ${i+1}: Volume must be at least 100L`);
                    }
                }
                break;

            case 4:
                // Validate grow bed data
                const beds = parseInt(document.getElementById('new-grow-bed-count').value);
                for (let i = 1; i <= beds; i++) {
                    const bedType = document.getElementById(`wizard-bed-type-${i}`)?.value;
                    if (!bedType) {
                        errors.push(`Bed ${i}: Please select a bed type`);
                    }
                }
                break;
        }

        if (errors.length > 0) {
            this.app.showNotification(errors.join('\n'), 'error');
            return false;
        }

        return true;
    }

    /**
     * Generate fish tank configuration fields
     */
    generateFishTankFields(count) {
        const container = document.getElementById('fish-tank-details');
        if (!container) return;

        console.log(`🏗️ Generating ${count} fish tank fields...`);
        console.log(`🏗️ Existing tank data:`, this.wizardData.fishTanks);
        container.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const existingTank = this.wizardData.fishTanks[i-1];

            // Use saved data if it exists, otherwise use reasonable defaults
            const tankData = {
                name: existingTank?.name || `Tank ${i}`,
                volume: existingTank?.volume || 7000,  // Default to 7000L
                fishType: existingTank?.fish_type || 'tilapia',
                stockingDensity: existingTank?.stocking_density || 20,
                harvestWeight: existingTank?.target_harvest_weight || 500
            };
            console.log(`🏗️ Tank ${i} data:`, tankData);

            const fishDefaults = this.fishData[tankData.fishType];

            const tankHtml = `
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span>🐟</span>
                        <span>Fish Tank ${i}</span>
                    </div>
                    <div class="detail-fields fish-tank-fields">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Tank Name</span>
                            </label>
                            <input type="text" class="modern-input" id="wizard-tank-name-${i}"
                                   placeholder="Tank ${i}" value="${tankData.name}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Volume (L)</span>
                            </label>
                            <input type="number" class="modern-input" id="wizard-tank-volume-${i}"
                                   value="${tankData.volume}" min="100" step="50" required placeholder="1000">
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Fish Type</span>
                            </label>
                            <select class="modern-select" id="wizard-tank-fish-${i}" required>
                                <option value="tilapia" ${tankData.fishType === 'tilapia' ? 'selected' : ''}>Tilapia</option>
                                <option value="carp" ${tankData.fishType === 'carp' ? 'selected' : ''}>Carp</option>
                                <option value="catfish" ${tankData.fishType === 'catfish' ? 'selected' : ''}>Catfish</option>
                                <option value="trout" ${tankData.fishType === 'trout' ? 'selected' : ''}>Trout</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Stocking Density (fish/m³)</span>
                            </label>
                            <input type="number" class="modern-input" id="wizard-tank-stocking-${i}"
                                   value="${tankData.stockingDensity}" min="1" step="1" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Target Harvest Weight (g)</span>
                            </label>
                            <input type="number" class="modern-input" id="wizard-tank-harvest-${i}"
                                   value="${tankData.harvestWeight}" min="50" step="50" required>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += tankHtml;
        }
    }

    /**
     * Generate grow bed configuration fields
     */
    generateGrowBedFields(count) {
        const container = document.getElementById('grow-bed-details');
        if (!container) return;

        container.innerHTML = '';

        const bedTypes = {
            'media-flow': 'Media Flow Through (MFT)',
            'flood-drain': 'Flood & Drain (F&D)',
            'dwc': 'Deep Water Culture (DWC)',
            'vertical': 'Vertical Growing',
            'nft': 'NFT (Nutrient Film Technique)'
        };

        for (let i = 1; i <= count; i++) {
            const existingBed = this.wizardData.growBeds[i-1];
            const bedData = {
                name: existingBed?.name || `Bed ${i}`,
                type: existingBed?.type || ''
            };

            const bedHtml = `
                <div class="detail-card">
                    <div class="detail-card-header">
                        <img src="/icons/new-icons/Afraponix Go Icons_flow through.svg" alt="Grow Bed" class="bed-config-icon" />
                        <span>Grow Bed ${i}</span>
                    </div>
                    <div class="detail-fields" style="grid-template-columns: 1fr 1fr; margin-bottom: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Bed Name</span>
                            </label>
                            <input type="text" class="modern-input" id="wizard-bed-name-${i}"
                                   placeholder="Bed ${i}" value="${bedData.name}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Bed Type</span>
                            </label>
                            <select class="modern-select" id="wizard-bed-type-${i}" required>
                                <option value="">Select Type</option>
                                ${Object.entries(bedTypes).map(([value, name]) =>
                                    `<option value="${value}" ${bedData.type === value ? 'selected' : ''}>${name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>

                    <div id="wizard-bed-type-fields-${i}" class="bed-type-fields" style="margin-top: 1rem;">
                        <!-- Type-specific fields will be inserted here via updateBedTypeFields -->
                    </div>
                </div>
            `;
            container.innerHTML += bedHtml;

            // Attach event listener for bed type changes
            setTimeout(() => {
                const typeSelect = document.getElementById(`wizard-bed-type-${i}`);
                if (typeSelect) {
                    typeSelect.addEventListener('change', () => this.updateBedTypeFields(i));
                    if (bedData.type) {
                        this.updateBedTypeFields(i);
                    }
                }
            }, 0);
        }
    }

    /**
     * Update bed type-specific fields when bed type is selected
     */
    updateBedTypeFields(bedIndex) {
        const typeSelect = document.getElementById(`wizard-bed-type-${bedIndex}`);
        const fieldsContainer = document.getElementById(`wizard-bed-type-fields-${bedIndex}`);

        if (!typeSelect || !fieldsContainer) return;

        const bedType = typeSelect.value;

        if (!bedType) {
            fieldsContainer.innerHTML = '';
            return;
        }

        const existingBed = this.wizardData.growBeds?.[bedIndex-1] || {};

        let html = '';

        if (bedType === 'dwc' || bedType === 'flood-drain') {
            html = `
                <div class="bed-dimensions">
                    <h4 style="margin: 0 0 1rem 0;">Bed Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">Length (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-length-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="2.0" value="${existingBed.length || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">Width (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-width-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed.width || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">${bedType === 'dwc' ? 'Depth' : 'Media Depth'} (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-height-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="0.3" value="${existingBed.height || ''}" required>
                        </div>
                    </div>
                </div>
            `;
        } else if (bedType === 'vertical') {
            html = `
                <div class="bed-dimensions">
                    <h4 style="margin: 0 0 1rem 0;">Vertical System Configuration</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">Number of Verticals</label>
                            <input type="number" class="modern-input" id="wizard-vertical-count-${bedIndex}"
                                   min="1" step="1" placeholder="10" value="${existingBed.verticals || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">Plants per Vertical</label>
                            <input type="number" class="modern-input" id="wizard-plants-per-vertical-${bedIndex}"
                                   min="1" step="1" placeholder="12" value="${existingBed.plantsPerVertical || ''}" required>
                        </div>
                    </div>
                    <h4 style="margin: 1rem 0 1rem 0;">Reservoir/Trough Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">Length (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-length-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="1.2" value="${existingBed.length || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">Width (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-width-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="0.6" value="${existingBed.width || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">Depth (m)</label>
                            <input type="number" class="modern-input" id="wizard-bed-height-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="0.3" value="${existingBed.height || ''}" required>
                        </div>
                    </div>
                </div>
            `;
        } else if (bedType === 'nft') {
            html = `
                <div class="bed-dimensions">
                    <h4 style="margin: 0 0 1rem 0;">NFT Channel Configuration</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">Trough Length (m)</label>
                            <input type="number" class="modern-input" id="wizard-trough-length-${bedIndex}"
                                   min="0.1" step="0.1" placeholder="3.0" value="${existingBed.troughLength || ''}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">Number of Channels</label>
                            <input type="number" class="modern-input" id="wizard-bed-channels-${bedIndex}"
                                   min="1" step="1" placeholder="6" value="${existingBed.channels || ''}" required>
                        </div>
                    </div>
                </div>
            `;
        }

        fieldsContainer.innerHTML = html;
    }

    /**
     * Submit the wizard and create the system
     */
    async submitWizard() {
        // Final validation
        if (!await this.validateCurrentStep()) {
            return;
        }

        // Collect all data
        this.saveStepData();

        const systemData = {
            system_name: document.getElementById('new-system-name').value,
            system_type: document.getElementById('new-system-type').value,
            fish_tank_count: parseInt(document.getElementById('new-fish-tank-count').value),
            grow_bed_count: parseInt(document.getElementById('new-grow-bed-count').value),
            fish_tanks: this.wizardData.fishTanks,
            grow_beds: this.wizardData.growBeds
        };

        try {
            // Create system via app
            await this.app.createNewSystem(systemData);

            // Close wizard
            this.closeWizard();

            // Show success message
            this.app.showNotification('✅ System created successfully!', 'success');

            // Redirect to allocation tab
            setTimeout(() => {
                this.app.currentView = 'settings';
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById('settings')?.classList.add('active');

                const allocationTab = document.querySelector('[data-setting="plant-allocations"]');
                if (allocationTab) {
                    allocationTab.click();
                }
            }, 500);

        } catch (error) {
            console.error('Failed to create system:', error);
            this.app.showNotification('❌ Failed to create system: ' + error.message, 'error');
        }
    }

    /**
     * Initialize wizard event listeners
     */
    initializeEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-new-system-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeWizard());
        }

        // Form submission
        const form = document.getElementById('new-system-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitWizard();
            });
        }

        // Navigation buttons are handled via onclick in HTML for backward compatibility
        // But we could migrate them here if needed

        console.log('✅ System Creation Wizard event listeners initialized');
    }
}

export default SystemCreationWizard;
