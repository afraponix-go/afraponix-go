// Fish Tank Manager Component
// Handles fish management, tank monitoring, feeding, and health tracking

/**
 * Fish Tank Manager Component Class
 * Manages fish operations, tank monitoring, feeding schedules, and health tracking
 */
export class FishTankManagerComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🐟 Fish Tank Manager Component initialized');
    }

    /**
     * Load fish overview with tank summary cards
     * Complexity: 15, Lines: 30+
     */
    async loadFishOverview() {
        console.log('🐟 FishTankManager: Delegating to main loadFishOverview implementation...');
        
        // Delegate to the main implementation which has the modern professional interface
        // This ensures consistency across all entry points
        if (this.app && typeof this.app.loadFishOverview === 'function') {
            return await this.app.loadFishOverview();
        } else {
            console.error('Main loadFishOverview implementation not found');
            const container = document.getElementById('fish-overview-content');
            if (container) {
                container.innerHTML = '<p class="error">Error loading fish overview - main implementation not found</p>';
            }
        }
    }

    /**
     * Display fish tank summary with overview cards
     * Complexity: 20, Lines: 50+
     */
    async displayFishTankSummary() {
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        try {
            // Get system data for tank information
            const systemData = this.app.getActiveSystem();
            if (!systemData) {
                container.innerHTML = '<p class="no-data">No system data available. Please configure your system in Settings.</p>';
                return;
            }

            // Fetch actual fish tank configurations to get real total volume
            let actualTotalVolumeL = systemData.total_fish_volume || 1000;
            try {
                const tankResponse = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
                const fishTanks = tankResponse.tanks || [];

                if (fishTanks.length > 0) {
                    actualTotalVolumeL = 0;
                    fishTanks.forEach((tank, index) => {
                        const volumeL = parseFloat(tank.volume_liters) || 0;
                        actualTotalVolumeL += volumeL;
                    });
                }
            } catch (error) {
                console.error('Error fetching tank configurations:', error);
            }

            // Generate fish overview cards
            await this.displayFishOverviewCards(container, actualTotalVolumeL);

        } catch (error) {
            console.error('Failed to display fish tank summary:', error);
        }
    }

    /**
     * Display fish overview cards with key metrics
     * Complexity: 25, Lines: 80+
     */
    async displayFishOverviewCards(container, totalVolumeL) {
        try {
            // Primary data source: Fish Inventory API
            let fishData = [];
            let totalFish = 0;
            let totalBiomass = 0;
            let averageWeight = 0;

            try {
                const inventoryResponse = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
                if (inventoryResponse && inventoryResponse.inventory && inventoryResponse.inventory.length > 0) {
                    fishData = inventoryResponse.inventory;
                    
                    fishData.forEach(tank => {
                        totalFish += tank.fish_count || 0;
                        totalBiomass += (tank.fish_count || 0) * (tank.average_weight || 0);
                    });
                    
                    averageWeight = totalFish > 0 ? totalBiomass / totalFish : 0;
                }
            } catch (error) {
                console.warn('Fish inventory API not available, using fish health data fallback');
            }

            // Fallback: Fish Health API
            if (totalFish === 0) {
                try {
                    const fishHealthData = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}`);
                    if (fishHealthData && fishHealthData.length > 0) {
                        // Get latest fish health record
                        const latestRecord = fishHealthData[fishHealthData.length - 1];
                        totalFish = latestRecord.fish_count || 0;
                        averageWeight = latestRecord.average_weight || 0;
                        totalBiomass = totalFish * averageWeight;
                    }
                } catch (error) {
                    console.warn('Fish health API also not available');
                }
            }

            // Calculate density
            const totalVolumeM3 = totalVolumeL / 1000;
            const density = totalVolumeM3 > 0 ? (totalBiomass / totalVolumeM3) : 0;

            // Get latest feeding data
            let lastFeedingDate = 'Never';
            let dailyFeedAmount = 0;
            try {
                if (this.app.dataRecords?.fishHealth && this.app.dataRecords.fishHealth.length > 0) {
                    const recentFeeding = this.app.dataRecords.fishHealth
                        .filter(record => record.feed_amount && record.feed_amount > 0)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                    
                    if (recentFeeding) {
                        lastFeedingDate = new Date(recentFeeding.date).toLocaleDateString();
                        dailyFeedAmount = recentFeeding.feed_amount || 0;
                    }
                }
            } catch (error) {
                console.error('Error getting feeding data:', error);
            }

            // Generate overview cards HTML
            const html = `
                <div class="fish-tank-overview-cards">
                    <div class="fish-tank-metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish Count" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Fish Count</h3>
                            <p class="metric-value">${totalFish}</p>
                            <p class="metric-subtitle">Total fish in system</p>
                        </div>
                    </div>
                    
                    <div class="fish-tank-metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/Afraponix Go Icons_weight.svg" alt="Total Biomass" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Total Biomass</h3>
                            <p class="metric-value">${this.formatWeight(totalBiomass)}</p>
                            <p class="metric-subtitle">Combined fish weight</p>
                        </div>
                    </div>
                    
                    <div class="fish-tank-metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/Afraponix Go Icons_density.svg" alt="Density" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Stocking Density</h3>
                            <p class="metric-value">${density.toFixed(1)} kg/m³</p>
                            <p class="metric-subtitle">System density</p>
                        </div>
                    </div>
                    
                    <div class="fish-tank-metric-card">
                        <div class="metric-icon">
                            <img src="icons/new-icons/Afraponix Go Icons_feed.svg" alt="Last Fed" style="width: 1.2em; height: 1.2em;">
                        </div>
                        <div class="metric-content">
                            <h3>Last Fed</h3>
                            <p class="metric-value">${lastFeedingDate}</p>
                            <p class="metric-subtitle">${dailyFeedAmount}g daily</p>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Debug: Check what styles are actually applied
            setTimeout(() => {
                const overviewContainer = document.querySelector('.fish-tank-overview-cards');
                const cards = document.querySelectorAll('.fish-tank-metric-card');
                
                if (overviewContainer) {
                    const computedStyle = window.getComputedStyle(overviewContainer);
                    console.log('🐟 Fish Tank Overview Container Styles:', {
                        display: computedStyle.display,
                        gridTemplateColumns: computedStyle.gridTemplateColumns,
                        gap: computedStyle.gap,
                        className: overviewContainer.className,
                        parentId: overviewContainer.parentElement?.id
                    });
                }
                
                if (cards.length > 0) {
                    console.log(`🐟 Found ${cards.length} fish tank metric cards`);
                    const firstCard = cards[0];
                    const cardStyle = window.getComputedStyle(firstCard);
                    console.log('🐟 First Card Styles:', {
                        minWidth: cardStyle.minWidth,
                        width: cardStyle.width,
                        padding: cardStyle.padding,
                        className: firstCard.className
                    });
                }
            }, 100);

        } catch (error) {
            console.error('Error generating fish overview cards:', error);
            container.innerHTML = '<p class="error">Error loading fish overview</p>';
        }
    }

    /**
     * Format weight for display (kg vs g)
     * Complexity: 5, Lines: 8
     */
    formatWeight(grams) {
        if (!grams || grams === 0) return '0g';
        
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(1)}kg`;
        } else {
            return `${Math.round(grams)}g`;
        }
    }

    /**
     * Load fish health entry form
     * Complexity: 12, Lines: 20
     */
    async loadFishHealthEntry() {
        const container = document.querySelector('#fish-health-entry-content .data-entry-section');
        if (!container) return;

        // Create new streamlined fish tank monitoring interface
        const formHtml = await this.generateTankMonitoringForm();
        container.innerHTML = formHtml;

        // Load recent tank data
        this.loadTankMonitoringHistory();

        // Auto-populate feed data from most recent entries
        await this.populateDataCaptureFeedingData();

        // Setup form submission handlers
        this.setupTankMonitoringHandlers();
    }

    /**
     * Generate bulk tank monitoring form HTML for all tanks
     * Complexity: 25, Lines: 100+
     */
    async generateTankMonitoringForm() {
        const systemData = this.app.getActiveSystem();
        const tankCount = systemData?.fish_tank_count || 7;
        
        console.log('🐟 [DEBUG] generateTankMonitoringForm - Tank count:', tankCount);
        
        // Get current fish inventory and previous feeding data
        const currentInventory = await this.getCurrentFishInventory();
        const previousFeedingData = await this.getPreviousFeedingData();
        
        console.log('🐟 [DEBUG] Current inventory data:', currentInventory.length, 'tanks found');
        console.log('🐟 [DEBUG] Previous feeding data:', previousFeedingData.length, 'tanks found');
        
        let tankRows = '';
        for (let i = 1; i <= tankCount; i++) {
            const currentFishData = currentInventory.find(d => d.tank_number === i) || {};
            const prevFeedData = previousFeedingData.find(d => d.tank_number === i) || {};
            
            if (currentFishData.fish_count || currentFishData.current_count) {
                console.log(`🐟 [DEBUG] Tank ${i} - Found fish:`, currentFishData.fish_count || currentFishData.current_count, 'fish at', currentFishData.average_weight, 'g avg');
            }
            
            tankRows += this.generateTankRow(i, currentFishData, prevFeedData);
        }
        
        return `
            <div id="bulk-fish-health-form" class="bulk-data-form">
                <div class="form-header">
                    <h3>
                        <img src="icons/new-icons/Afraponix Go Icons_data.svg" alt="Bulk Data Capture" style="width: 18px; height: 18px; vertical-align: text-bottom; margin-right: 6px;">
                        Bulk Data Capture
                    </h3>
                    <div class="form-controls">
                        <div class="form-field date-field">
                            <label for="bulk-date">Date for All Tanks:</label>
                            <input type="date" id="bulk-date" required>
                        </div>
                        <button type="button" id="copy-previous-day" class="btn-secondary" title="Copy data from previous day">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            Copy Previous Day
                        </button>
                    </div>
                </div>

                <div class="bulk-table-container">
                    <table class="bulk-data-table" id="bulk-tank-table">
                        <thead>
                            <tr>
                                <th>Tank</th>
                                <th>Avg Weight (g)</th>
                                <th>Feed Amount (g)</th>
                                <th>Suggested Feed</th>
                                <th>Mortality</th>
                                <th>Behavior</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tankRows}
                        </tbody>
                    </table>
                </div>

                <div class="summary-section">
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-value" id="total-fish">0</div>
                            <div class="summary-label">Total Fish</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="total-feed">0g</div>
                            <div class="summary-label">Total Feed</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="total-mortality">0</div>
                            <div class="summary-label">Total Mortality</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="completion-status">0%</div>
                            <div class="summary-label">Completion</div>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" id="save-all-data" class="btn-success">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                        </svg>
                        Save All Tank Data
                    </button>
                    <button type="button" id="clear-all-form" class="btn-secondary">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                        Clear All
                    </button>
                    <button type="button" id="import-data" class="btn-success">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        Import Data
                    </button>
                    <button type="button" id="export-data" class="btn-info">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        Export Data
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate individual tank row for bulk form
     */
    generateTankRow(tankNumber, currentFishData = {}, previousFeedData = {}) {
        // Use current fish count and average weight from inventory
        const fishCount = currentFishData.fish_count || currentFishData.current_count || 0;
        // Only use average weight if it's greater than 50 (not the default fallback value)
        let avgWeight = currentFishData.average_weight || currentFishData.weight || '';
        
        // If average weight is exactly 50, it's likely the default fallback - show empty instead
        if (avgWeight === 50 && fishCount === 0) {
            avgWeight = '';
        }
        
        console.log(`🐟 [DEBUG] generateTankRow Tank ${tankNumber}: fishCount=${fishCount}, avgWeight=${avgWeight}, rawData:`, currentFishData);
        
        // Use previous day's feed amount (not current feed amount)
        const previousFeedAmount = previousFeedData.feed_amount || '';
        
        // Calculate suggested feed amount like Tank Information tab using current fish data
        const suggestedFeed = this.calculateSuggestedFeed(fishCount, avgWeight);
        
        return `
            <tr class="tank-row" data-tank="${tankNumber}" data-fish-count="${fishCount}">
                <td class="tank-name">
                    <div class="tank-identifier">
                        <strong>Tank ${tankNumber}</strong>
                        <small class="fish-count-display">${fishCount > 0 ? `${fishCount} fish` : 'No fish'}</small>
                    </div>
                </td>
                <td>
                    <input type="number" 
                           class="bulk-input avg-weight" 
                           data-field="average_weight" 
                           data-tank="${tankNumber}"
                           min="0" 
                           step="0.1" 
                           placeholder="0.0"
                           value="${avgWeight}"
                           tabindex="${(tankNumber - 1) * 4 + 1}">
                </td>
                <td>
                    <input type="number" 
                           class="bulk-input feed-amount" 
                           data-field="feed_amount" 
                           data-tank="${tankNumber}"
                           min="0" 
                           step="0.1" 
                           placeholder="0.0"
                           value="${previousFeedAmount}"
                           tabindex="${(tankNumber - 1) * 4 + 2}">
                </td>
                <td class="suggested-feed-cell">
                    <span class="suggested-feed" data-tank="${tankNumber}">
                        ${suggestedFeed > 0 ? 
                            `<strong style="color: var(--color-bio-green);">${suggestedFeed}g</strong>` : 
                            `<small class="text-muted">No fish data</small>`
                        }
                    </span>
                </td>
                <td>
                    <input type="number" 
                           class="bulk-input mortality" 
                           data-field="mortality" 
                           data-tank="${tankNumber}"
                           min="0" 
                           placeholder="0"
                           value="0"
                           tabindex="${(tankNumber - 1) * 4 + 3}">
                </td>
                <td>
                    <select class="bulk-select behavior" 
                            data-field="behavior" 
                            data-tank="${tankNumber}"
                            tabindex="${(tankNumber - 1) * 4 + 4}">
                        <option value="">Select...</option>
                        <option value="active">Active</option>
                        <option value="normal">Normal</option>
                        <option value="sluggish">Sluggish</option>
                        <option value="stressed">Stressed</option>
                    </select>
                </td>
            </tr>
        `;
    }

    /**
     * Generate tank options for dropdown
     * Complexity: 10, Lines: 20
     */
    generateTankOptions() {
        let tankOptions = '<option value="">Select tank...</option>';
        
        try {
            const systemData = this.app.getActiveSystem();
            if (systemData && systemData.fish_tank_count > 0) {
                for (let i = 1; i <= systemData.fish_tank_count; i++) {
                    tankOptions += `<option value="${i}">Tank ${i}</option>`;
                }
            } else {
                tankOptions += '<option value="1">Tank 1</option>';
            }
        } catch (error) {
            console.error('Error generating tank options:', error);
            tankOptions += '<option value="1">Tank 1</option>';
        }
        
        return tankOptions;
    }

    /**
     * Setup bulk tank monitoring form handlers
     * Complexity: 30, Lines: 80+
     */
    setupTankMonitoringHandlers() {
        // Set today's date as default
        const dateInput = document.getElementById('bulk-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Setup bulk form handlers
        this.setupBulkFormHandlers();
        this.setupBulkCalculations();
        this.setupKeyboardNavigation();
        
        // Initialize summary calculations
        this.updateBulkSummary();
    }

    /**
     * Setup bulk form button handlers
     */
    setupBulkFormHandlers() {
        // Save all data button
        const saveAllBtn = document.getElementById('save-all-data');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveBulkFishHealthData());
        }

        // Clear all form button
        const clearAllBtn = document.getElementById('clear-all-form');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearBulkForm());
        }

        // Copy previous day button
        const copyPrevBtn = document.getElementById('copy-previous-day');
        if (copyPrevBtn) {
            copyPrevBtn.addEventListener('click', () => this.copyPreviousDayData());
        }

        // Import data button
        const importBtn = document.getElementById('import-data');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importBulkData());
        }
        // Export data button
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportBulkData());
        }
    }

    /**
     * Setup real-time calculations and validation
     */
    setupBulkCalculations() {
        const inputs = document.querySelectorAll('.bulk-input, .bulk-select, .bulk-textarea');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateTankStatus(input);
                this.updateSuggestedFeed(input);
                this.updateBulkSummary();
                this.markTankAsModified(input.dataset.tank);
            });

            input.addEventListener('blur', () => {
                this.validateTankRow(input.dataset.tank);
            });
        });
    }

    /**
     * Setup keyboard navigation between cells
     */
    setupKeyboardNavigation() {
        const inputs = document.querySelectorAll('.bulk-input, .bulk-select, .bulk-textarea');
        
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % inputs.length;
                    inputs[nextIndex].focus();
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    this.navigateVertically(input, e.key === 'ArrowUp' ? -1 : 1);
                }
            });
        });
    }

    /**
     * Get previous day's data for copy functionality
     */
    async getPreviousDayData() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const response = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}?date=${yesterdayStr}`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.warn('Could not fetch previous day data:', error);
            return [];
        }
    }

    /**
     * Update tank status based on input data
     */
    updateTankStatus(input) {
        const tankNumber = input.dataset.tank;
        const row = document.querySelector(`tr[data-tank="${tankNumber}"]`);
        if (!row) return;

        // Since we removed fish count input, get it from data attribute
        const fishCount = parseInt(row.dataset.fishCount) || 0;
        const avgWeight = row.querySelector('.avg-weight').value || 0;
        const feedAmount = row.querySelector('.feed-amount').value || 0;

        // Mark row as having data if there's feed amount or average weight
        if (feedAmount > 0 || avgWeight > 0) {
            row.classList.add('has-data');
        } else {
            row.classList.remove('has-data');
        }
    }

    /**
     * Update suggested feed amount based on fish count and weight
     */
    updateSuggestedFeed(input) {
        const tankNumber = input.dataset.tank;
        const row = document.querySelector(`tr[data-tank="${tankNumber}"]`);
        if (!row) return;

        // Get fish count from data attribute (current inventory)
        const fishCount = parseInt(row.dataset.fishCount) || 0;
        const avgWeight = parseFloat(row.querySelector('.avg-weight').value) || 0;
        const suggestedSpan = row.querySelector('.suggested-feed');

        if (fishCount > 0 && avgWeight > 0) {
            // Calculate suggested feed using the same logic as Tank Information tab
            const suggestedFeed = this.calculateSuggestedFeed(fishCount, avgWeight);
            suggestedSpan.innerHTML = `<strong style="color: var(--color-bio-green);">${suggestedFeed}g</strong>`;
        } else if (fishCount > 0 && avgWeight === 0) {
            suggestedSpan.innerHTML = `<small class="text-muted">Enter weight</small>`;
        } else {
            suggestedSpan.innerHTML = `<small class="text-muted">No fish data</small>`;
        }
    }

    /**
     * Update bulk summary totals
     */
    updateBulkSummary() {
        let totalFish = 0;
        let totalFeed = 0;
        let totalMortality = 0;
        let completedRows = 0;
        let totalRows = 0;

        document.querySelectorAll('.tank-row').forEach(row => {
            totalRows++;
            const fishCount = parseInt(row.dataset.fishCount) || 0;
            const feedAmount = parseFloat(row.querySelector('.feed-amount').value) || 0;
            const avgWeight = parseFloat(row.querySelector('.avg-weight').value) || 0;
            const mortality = parseFloat(row.querySelector('.mortality').value) || 0;
            const behavior = row.querySelector('.behavior').value;
            
            totalFish += fishCount;
            totalFeed += feedAmount;
            totalMortality += mortality;
            
            // Consider row complete if it has feed amount, avg weight, mortality, or behavior
            if (feedAmount > 0 || avgWeight > 0 || mortality > 0 || behavior) {
                completedRows++;
            }
        });

        // Update summary display
        document.getElementById('total-fish').textContent = totalFish;
        document.getElementById('total-feed').textContent = totalFeed + 'g';
        document.getElementById('total-mortality').textContent = totalMortality;
        
        const completionPercent = totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0;
        document.getElementById('completion-status').textContent = completionPercent + '%';
    }

    /**
     * Mark tank as modified with visual indicator
     */
    markTankAsModified(tankNumber) {
        const row = document.querySelector(`tr[data-tank="${tankNumber}"]`);
        if (row) {
            row.classList.add('modified');
        }
    }

    /**
     * Validate tank row data
     */
    validateTankRow(tankNumber) {
        const row = document.querySelector(`tr[data-tank="${tankNumber}"]`);
        if (!row) return;

        const fishCount = parseInt(row.dataset.fishCount) || 0;
        const avgWeight = row.querySelector('.avg-weight').value;
        const feedAmount = row.querySelector('.feed-amount').value;

        // Remove existing validation classes
        row.classList.remove('validation-error', 'validation-warning');

        // Validate: if feed amount is provided but no average weight for tanks with fish
        if (feedAmount && fishCount > 0 && !avgWeight) {
            row.classList.add('validation-warning');
            row.title = 'Average weight recommended for accurate feed calculations';
        }
        // Clear validation
        else {
            row.title = '';
        }
    }

    /**
     * Navigate vertically between table cells
     */
    navigateVertically(currentInput, direction) {
        const tankNumber = parseInt(currentInput.dataset.tank);
        const fieldName = currentInput.dataset.field;
        const newTankNumber = tankNumber + direction;
        
        const nextInput = document.querySelector(`[data-tank="${newTankNumber}"][data-field="${fieldName}"]`);
        if (nextInput) {
            nextInput.focus();
        }
    }

    /**
     * Save bulk fish health data for all tanks
     */
    async saveBulkFishHealthData() {
        const date = document.getElementById('bulk-date').value;
        if (!date) {
            this.app.showNotification('Please select a date', 'warning');
            return;
        }

        const bulkData = [];
        const rows = document.querySelectorAll('.tank-row');

        rows.forEach(row => {
            const tankNumber = row.dataset.tank;
            const fishCount = parseInt(row.dataset.fishCount) || null; // Get from data attribute
            const avgWeight = row.querySelector('.avg-weight').value;
            const feedAmount = row.querySelector('.feed-amount').value;
            const mortality = row.querySelector('.mortality').value;
            const behavior = row.querySelector('.behavior').value;

            // Only include rows with at least some data (feed amount, weight, mortality, or behavior)
            if (feedAmount || avgWeight || mortality || behavior) {
                bulkData.push({
                    tank_number: parseInt(tankNumber),
                    date: date,
                    fish_count: fishCount,
                    average_weight: avgWeight ? parseFloat(avgWeight) : null,
                    feed_amount: feedAmount ? parseFloat(feedAmount) : null,
                    mortality: mortality ? parseInt(mortality) : null,
                    behavior: behavior || null,
                    notes: null // Still no notes
                });
            }
        });

        if (bulkData.length === 0) {
            this.app.showNotification('No data to save', 'warning');
            return;
        }

        try {
            // Save each tank's data
            for (const tankData of bulkData) {
                const healthData = {
                    system_id: this.app.activeSystemId,
                    fish_tank_id: tankData.tank_number,
                    tank_number: tankData.tank_number,
                    date: tankData.date,
                    count: tankData.fish_count,
                    average_weight: tankData.average_weight,
                    feed_amount: tankData.feed_amount,
                    mortality: tankData.mortality,
                    behavior: tankData.behavior,
                    notes: tankData.notes
                };

                await this.app.makeApiCall('/data/fish-health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(healthData)
                });
            }

            this.app.showNotification(`Successfully saved data for ${bulkData.length} tanks`, 'success');
            
            // Clear modified indicators
            document.querySelectorAll('.tank-row').forEach(row => {
                row.classList.remove('modified');
            });

            // Refresh data
            await this.app.loadDataRecords();
            
        } catch (error) {
            console.error('Error saving bulk fish health data:', error);
            this.app.showNotification('Error saving data. Please try again.', 'error');
        }
    }

    /**
     * Clear all form data
     */
    clearBulkForm() {
        if (!confirm('Clear all form data? This action cannot be undone.')) {
            return;
        }

        document.querySelectorAll('.bulk-input, .bulk-textarea').forEach(input => {
            input.value = '';
        });
        
        document.querySelectorAll('.bulk-select').forEach(select => {
            select.selectedIndex = 0;
        });

        document.querySelectorAll('.tank-row').forEach(row => {
            row.classList.remove('modified', 'has-data', 'validation-error', 'validation-warning');
        });

        this.updateBulkSummary();
        this.app.showNotification('Form cleared', 'info');
    }

    /**
     * Copy previous day's data to current form
     */
    async copyPreviousDayData() {
        try {
            const previousData = await this.getPreviousDayData();
            
            if (previousData.length === 0) {
                this.app.showNotification('No previous day data found', 'warning');
                return;
            }

            previousData.forEach(data => {
                const row = document.querySelector(`tr[data-tank="${data.tank_number}"]`);
                if (row) {
                    // Don't copy fish_count - it comes from inventory data, not user input
                    if (data.average_weight) row.querySelector('.avg-weight').value = data.average_weight;
                    if (data.feed_amount) row.querySelector('.feed-amount').value = data.feed_amount;
                    if (data.mortality) row.querySelector('.mortality').value = data.mortality;
                    if (data.behavior) row.querySelector('.behavior').value = data.behavior;
                    if (data.notes) row.querySelector('.notes').value = data.notes;
                    
                    // Use any input field for triggering updates since fish-count doesn't exist as input
                    const triggerInput = row.querySelector('.avg-weight') || row.querySelector('.feed-amount');
                    if (triggerInput) {
                        this.updateTankStatus(triggerInput);
                        this.updateSuggestedFeed(triggerInput);
                    }
                    this.markTankAsModified(data.tank_number);
                }
            });

            this.updateBulkSummary();
            this.app.showNotification(`Copied data for ${previousData.length} tanks`, 'success');
            
        } catch (error) {
            console.error('Error copying previous day data:', error);
            this.app.showNotification('Error copying previous data', 'error');
        }
    }

    /**
     * Export bulk data to CSV - exports all historical fish health data
     */
    async exportBulkData() {
        try {
            // Show loading state
            this.app.showNotification('Fetching historical data...', 'info');
            
            // Fetch all historical fish health data for the active system
            const systemId = this.app.activeSystemId;
            if (!systemId) {
                this.app.showNotification('No active system selected', 'error');
                return;
            }
            
            // Get historical fish health data with authentication
            const token = localStorage.getItem('auth_token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`/api/data/fish-health/${systemId}`, {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) {
                throw new Error('Failed to fetch fish health data');
            }
            
            const historicalData = await response.json();
            
            if (!historicalData || historicalData.length === 0) {
                this.app.showNotification('No historical data to export', 'warning');
                return;
            }
            
            // Create CSV with date/time stamps
            let csvContent = 'Date,Time,Tank,Fish Count,Avg Weight (g),Feed Amount (g),Mortality,Behavior,Notes,Data Source,Created At\n';
            
            // Sort data by date and tank number
            historicalData.sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                if (dateCompare !== 0) return dateCompare;
                return a.tank_number - b.tank_number;
            });
            
            // Process each historical record
            historicalData.forEach(record => {
                const date = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
                const time = record.date ? new Date(record.date).toTimeString().split(' ')[0] : '';
                const tankNumber = record.tank_number || '';
                const fishCount = record.fish_count || '0';
                const avgWeight = record.average_weight || '';
                const feedAmount = record.feed_amount || '';
                const mortality = record.mortality || '0';
                const behavior = record.behavior || '';
                const notes = record.notes ? record.notes.replace(/,/g, ';') : '';
                const dataSource = record.data_source || 'manual';
                const createdAt = record.created_at ? new Date(record.created_at).toISOString() : '';
                
                csvContent += `${date},${time},${tankNumber},${fishCount},${avgWeight},${feedAmount},${mortality},${behavior},"${notes}",${dataSource},${createdAt}\n`;
            });

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const exportDate = new Date().toISOString().split('T')[0];
            a.download = `fish-health-historical-data-${exportDate}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.app.showNotification(`Exported ${historicalData.length} historical records`, 'success');
            
        } catch (error) {
            console.error('Error exporting historical data:', error);
            this.app.showNotification('Error exporting data: ' + error.message, 'error');
        }
    }

    /**
     * Import bulk data from CSV file
     */
    importBulkData() {
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await this.readFileAsText(file);
                this.parseAndPopulateCSV(text);
            } catch (error) {
                console.error('Error importing CSV:', error);
                this.app.showNotification('Error importing CSV file', 'error');
            }
        };
        
        // Append to body, click, then remove
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Read file as text using FileReader
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    /**
     * Parse CSV text and populate form fields
     * Handles both legacy format and new historical format
     */
    parseAndPopulateCSV(csvText) {
        const lines = csvText.trim().split('\n');
        
        // Check for different CSV formats
        const actualHeader = lines[0].trim();
        const legacyHeader = 'Tank,Fish Count,Avg Weight (g),Feed Amount (g),Mortality,Behavior,Notes';
        const historicalHeader = 'Date,Time,Tank,Fish Count,Avg Weight (g),Feed Amount (g),Mortality,Behavior,Notes,Data Source,Created At';
        
        let isHistoricalFormat = false;
        
        if (actualHeader === legacyHeader) {
            console.log('🔄 Detected legacy CSV format');
        } else if (actualHeader === historicalHeader) {
            console.log('🔄 Detected historical CSV format');
            isHistoricalFormat = true;
        } else {
            this.app.showNotification('Invalid CSV format. Expected either legacy or historical format.', 'error');
            return;
        }

        // Process data rows (skip header)
        let importedCount = 0;
        let skippedCount = 0;
        
        // For historical format, we'll use only the most recent entry for each tank
        const latestTankData = {};
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const values = this.parseCSVLine(line);
                
                if (isHistoricalFormat && values.length >= 11) {
                    // Historical format: Date,Time,Tank,Fish Count,Avg Weight (g),Feed Amount (g),Mortality,Behavior,Notes,Data Source,Created At
                    const [date, time, tankNumber, fishCount, avgWeight, feedAmount, mortality, behavior, notes, dataSource, createdAt] = values;
                    
                    // Keep only the most recent entry for each tank
                    const dateTime = new Date(`${date}T${time}`);
                    if (!latestTankData[tankNumber] || dateTime > latestTankData[tankNumber].dateTime) {
                        latestTankData[tankNumber] = {
                            tankNumber,
                            fishCount,
                            avgWeight,
                            feedAmount,
                            mortality: mortality || '0',
                            behavior,
                            notes,
                            dateTime
                        };
                    }
                    
                } else if (!isHistoricalFormat && values.length >= 7) {
                    // Legacy format: Tank,Fish Count,Avg Weight (g),Feed Amount (g),Mortality,Behavior,Notes
                    const [tankNumber, fishCount, avgWeight, feedAmount, mortality, behavior, notes] = values;
                    
                    if (this.populateTankRow(tankNumber, {
                        fishCount: fishCount,
                        avgWeight: avgWeight, 
                        feedAmount: feedAmount,
                        mortality: mortality || '0',
                        behavior: behavior,
                        notes: notes
                    })) {
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                }
            } catch (error) {
                console.warn('Skipping invalid line:', line, error);
                skippedCount++;
            }
        }
        
        // For historical format, populate the latest data for each tank
        if (isHistoricalFormat) {
            for (const tankData of Object.values(latestTankData)) {
                if (this.populateTankRow(tankData.tankNumber, tankData)) {
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }
        }
        
        // Update calculations and show feedback
        this.updateBulkSummary();
        this.app.showNotification(
            `Import complete: ${importedCount} tanks imported, ${skippedCount} skipped`, 
            importedCount > 0 ? 'success' : 'warning'
        );
    }

    /**
     * Parse a single CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last value
        values.push(current.trim());
        
        // Clean up quoted values
        return values.map(val => val.replace(/^"(.*)"$/, '$1'));
    }

    /**
     * Populate a specific tank row with imported data
     */
    populateTankRow(tankNumber, data) {
        const tankRow = document.querySelector(`.tank-row[data-tank="${tankNumber}"]`);
        if (!tankRow) {
            console.warn(`Tank ${tankNumber} not found in form`);
            return false;
        }

        try {
            // Don't populate fish count and avg weight as these come from inventory
            // Only populate the editable fields
            
            const feedAmountInput = tankRow.querySelector('.feed-amount');
            if (feedAmountInput && data.feedAmount) {
                feedAmountInput.value = data.feedAmount;
            }
            
            const mortalityInput = tankRow.querySelector('.mortality');
            if (mortalityInput) {
                mortalityInput.value = data.mortality || '0';
            }
            
            const behaviorSelect = tankRow.querySelector('.behavior');
            if (behaviorSelect && data.behavior) {
                behaviorSelect.value = data.behavior;
            }
            
            const notesTextarea = tankRow.querySelector('.notes');
            if (notesTextarea && data.notes) {
                notesTextarea.value = data.notes.replace(/;/g, ','); // Convert back semicolons to commas
            }

            // Trigger change events to update calculations
            [feedAmountInput, mortalityInput, behaviorSelect, notesTextarea].forEach(input => {
                if (input) {
                    input.dispatchEvent(new Event('input'));
                    this.markTankAsModified(tankNumber);
                }
            });

            return true;
        } catch (error) {
            console.error(`Error populating tank ${tankNumber}:`, error);
            return false;
        }
    }

    /**
     * Record fish health data (legacy method - kept for compatibility)
     * Complexity: 20, Lines: 40+
     */
    async recordFishHealthData() {
        try {
            const formData = this.getFishHealthFormData();
            
            if (!this.validateFishHealthData(formData)) {
                return;
            }

            const response = await this.app.makeApiCall('/data/fish-health', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    system_id: this.app.activeSystemId
                })
            });

            if (response) {
                this.app.showNotification('Fish health data recorded successfully', 'success');
                
                // Refresh displays
                await this.loadFishOverview();
                this.app.loadDataRecords();
                
                // Clear form
                this.clearFishHealthForm();
            }

        } catch (error) {
            console.error('Error recording fish health data:', error);
            this.app.showNotification('Failed to record fish health data', 'error');
        }
    }

    /**
     * Get fish health form data
     * Complexity: 8, Lines: 15
     */
    getFishHealthFormData() {
        return {
            date: document.getElementById('fish-date')?.value,
            tank_number: document.getElementById('fish-tank')?.value,
            fish_count: parseInt(document.getElementById('fish-count')?.value) || null,
            average_weight: parseFloat(document.getElementById('average-weight')?.value) || null,
            feed_amount: parseFloat(document.getElementById('feed-amount')?.value) || null,
            mortality: parseInt(document.getElementById('mortality')?.value) || null,
            behavior: document.getElementById('behavior')?.value || null,
            notes: document.getElementById('notes')?.value || null
        };
    }

    /**
     * Validate fish health data
     * Complexity: 10, Lines: 15
     */
    validateFishHealthData(data) {
        if (!data.date) {
            this.app.showNotification('Please select a date', 'error');
            return false;
        }

        if (!data.tank_number) {
            this.app.showNotification('Please select a tank', 'error');
            return false;
        }

        // At least one data field must be filled
        const hasData = data.fish_count || data.average_weight || data.feed_amount || data.mortality || data.behavior || data.notes;
        if (!hasData) {
            this.app.showNotification('Please enter at least one measurement or observation', 'error');
            return false;
        }

        return true;
    }

    /**
     * Clear fish health form
     * Complexity: 5, Lines: 10
     */
    clearFishHealthForm() {
        const form = document.getElementById('fish-health-entry-form');
        if (form) {
            form.reset();
            
            // Reset date to today
            const dateInput = document.getElementById('fish-date');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }

    /**
     * Load tank monitoring history
     * Complexity: 12, Lines: 25
     */
    loadTankMonitoringHistory() {
        // Display recent tank monitoring entries
        const historyContainer = document.getElementById('tank-monitoring-history');
        if (!historyContainer) return;

        try {
            const fishHealthData = this.app.dataRecords?.fishHealth || [];
            const recentEntries = fishHealthData
                .slice(-10) // Get last 10 entries
                .reverse(); // Show most recent first

            let html = '<div class="history-header">Recent Entries</div>';
            
            if (recentEntries.length === 0) {
                html += '<p class="no-data">No recent entries</p>';
            } else {
                recentEntries.forEach(entry => {
                    const date = new Date(entry.date).toLocaleDateString();
                    html += `
                        <div class="history-entry">
                            <div class="entry-date">${date}</div>
                            <div class="entry-details">
                                Tank ${entry.tank_number} | 
                                ${entry.fish_count ? `${entry.fish_count} fish` : ''}
                                ${entry.feed_amount ? ` | ${entry.feed_amount}g feed` : ''}
                            </div>
                        </div>
                    `;
                });
            }

            historyContainer.innerHTML = html;

        } catch (error) {
            console.error('Error loading tank monitoring history:', error);
        }
    }

    /**
     * Auto-populate feeding data from recent entries
     * Complexity: 15, Lines: 25+
     */
    async populateDataCaptureFeedingData() {
        try {
            if (this.app.dataRecords?.fishHealth && this.app.dataRecords.fishHealth.length > 0) {
                const recentEntries = this.app.dataRecords.fishHealth
                    .filter(entry => entry.feed_amount && entry.feed_amount > 0)
                    .slice(-5); // Get last 5 feeding entries

                if (recentEntries.length > 0) {
                    // Calculate average feeding amount
                    const avgFeedAmount = recentEntries.reduce((sum, entry) => sum + (entry.feed_amount || 0), 0) / recentEntries.length;
                    
                    // Pre-populate feed amount field
                    const feedAmountInput = document.getElementById('feed-amount');
                    if (feedAmountInput && !feedAmountInput.value) {
                        feedAmountInput.value = Math.round(avgFeedAmount);
                        feedAmountInput.placeholder = `Avg: ${Math.round(avgFeedAmount)}g`;
                    }
                }
            }
        } catch (error) {
            console.error('Error populating feeding data:', error);
        }
    }

    /**
     * Initialize fish calculator in calculators tab
     * Complexity: 15, Lines: 40+
     */
    initializeFishCalculator() {
        let fishCalculatorDiv = document.getElementById('fish-calc');
        if (!fishCalculatorDiv) {
            return;
        }

        const systemData = this.app.getActiveSystem();
        const tankVolumeL = systemData?.total_fish_volume || 1000;
        const tankVolumeM3 = (tankVolumeL / 1000).toFixed(1);
        
        // Add fish-calculator class for proper identification
        fishCalculatorDiv.className = 'calculator-content active fish-calculator';
        
        fishCalculatorDiv.innerHTML = `
            <div class="fish-calc-header clean">
                <div class="calc-title-clean">
                    <div class="title-icon-clean">
                        <img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish Calculator" style="width: 1.2em; height: 1.2em;">
                    </div>
                    <h3>Fish Stocking Calculator</h3>
                </div>
                <div class="system-volume-clean">System Volume: ${tankVolumeM3}m³ (${tankVolumeL}L)</div>
            </div>

            <div class="calculator-section">
                <h4>Fish Details</h4>
                <div class="form-row">
                    <div class="form-field">
                        <label for="fish-type">Fish Type:</label>
                        <select id="fish-type">
                            <option value="tilapia">Tilapia</option>
                            <option value="trout">Trout</option>
                            <option value="catfish">Catfish</option>
                            <option value="bass">Bass</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="target-weight">Target Weight (g):</label>
                        <input type="number" id="target-weight" value="500" min="50" max="2000">
                    </div>
                </div>
            </div>

            <div class="calculator-results">
                <div class="result-card">
                    <h4>Recommended Stocking</h4>
                    <div id="recommended-fish-count" class="result-value">-</div>
                    <div class="result-unit">fish</div>
                </div>
                <div class="result-card">
                    <h4>Stocking Density</h4>
                    <div id="stocking-density" class="result-value">-</div>
                    <div class="result-unit">kg/m³</div>
                </div>
                <div class="result-card">
                    <h4>Daily Feed</h4>
                    <div id="daily-feed-amount" class="result-value">-</div>
                    <div class="result-unit">g/day</div>
                </div>
            </div>
        `;

        // Setup calculator event listeners
        this.setupFishCalculatorHandlers();
        
        // Initial calculation
        this.calculateFishStocking();
    }

    /**
     * Setup fish calculator event handlers
     * Complexity: 8, Lines: 15
     */
    setupFishCalculatorHandlers() {
        const fishTypeSelect = document.getElementById('fish-type');
        const targetWeightInput = document.getElementById('target-weight');

        if (fishTypeSelect) {
            fishTypeSelect.addEventListener('change', () => this.calculateFishStocking());
        }

        if (targetWeightInput) {
            targetWeightInput.addEventListener('input', () => this.calculateFishStocking());
        }
    }

    /**
     * Calculate fish stocking recommendations
     * Complexity: 15, Lines: 30+
     */
    calculateFishStocking() {
        const fishType = document.getElementById('fish-type')?.value || 'tilapia';
        const targetWeight = parseFloat(document.getElementById('target-weight')?.value) || 500;
        
        const systemData = this.app.getActiveSystem();
        const tankVolumeL = systemData?.total_fish_volume || 1000;
        const tankVolumeM3 = tankVolumeL / 1000;

        // Get recommended stocking density for fish type
        const maxDensity = this.getRecommendedStockingDensity(fishType);
        
        // Calculate maximum biomass and fish count
        const maxBiomassKg = maxDensity * tankVolumeM3;
        const maxBiomassG = maxBiomassKg * 1000;
        const recommendedFishCount = Math.floor(maxBiomassG / targetWeight);
        
        // Calculate actual density with recommended count
        const actualDensity = (recommendedFishCount * targetWeight) / 1000 / tankVolumeM3;
        
        // Calculate daily feed amount (typically 2-4% of biomass)
        const feedRate = fishType === 'trout' ? 0.03 : 0.025; // 3% for trout, 2.5% for others
        const dailyFeedAmount = Math.round(recommendedFishCount * targetWeight * feedRate);

        // Update display
        document.getElementById('recommended-fish-count').textContent = recommendedFishCount;
        document.getElementById('stocking-density').textContent = actualDensity.toFixed(1);
        document.getElementById('daily-feed-amount').textContent = dailyFeedAmount;
    }

    /**
     * Get recommended stocking density by fish type
     * Complexity: 5, Lines: 12
     */
    getRecommendedStockingDensity(fishType) {
        const densityLimits = {
            tilapia: 50,    // kg/m³
            trout: 80,      // kg/m³
            catfish: 40,    // kg/m³
            bass: 30,       // kg/m³
            default: 40     // kg/m³
        };
        
        return densityLimits[fishType.toLowerCase()] || densityLimits.default;
    }

    /**
     * Get current fish inventory data for all tanks
     * Fetches fresh data directly from fish inventory API
     */
    async getCurrentFishInventory() {
        console.log('🐟 [DEBUG] Fetching fish inventory for system:', this.app.activeSystemId);
        
        try {
            const response = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
            console.log('🐟 [DEBUG] Fish inventory API response:', response);
            
            if (response && response.tanks && Array.isArray(response.tanks)) {
                console.log('🐟 [DEBUG] Found tanks data:', response.tanks.length, 'tanks');
                response.tanks.forEach(tank => {
                    console.log(`🐟 [DEBUG] Tank ${tank.tank_number}:`, tank);
                    console.log(`🐟 [DEBUG] - fish_count: ${tank.fish_count}, current_count: ${tank.current_count}`);
                    console.log(`🐟 [DEBUG] - average_weight: ${tank.average_weight}, weight: ${tank.weight}`);
                });
                return response.tanks;
            } else if (response && response.inventory && Array.isArray(response.inventory)) {
                console.log('🐟 [DEBUG] Found inventory data:', response.inventory.length, 'tanks');
                response.inventory.forEach(tank => {
                    console.log(`🐟 [DEBUG] Tank ${tank.tank_number}: ${tank.fish_count || tank.current_count} fish, ${tank.average_weight}g avg weight`);
                });
                return response.inventory;
            } else {
                console.log('🐟 [DEBUG] Invalid inventory response format, trying different property structure...');
                // Try direct response if it's an array
                if (Array.isArray(response)) {
                    console.log('🐟 [DEBUG] Response is direct array:', response.length, 'tanks');
                    return response;
                }
            }
        } catch (error) {
            console.warn('🐟 [DEBUG] Fish inventory API error:', error);
            console.warn('🐟 [DEBUG] Trying fish health fallback...');
            
            // Fallback to fish health data if inventory is not available
            try {
                const fishHealthResponse = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}`);
                console.log('🐟 [DEBUG] Fish health fallback response:', fishHealthResponse ? fishHealthResponse.length : 'null', 'records');
                
                if (fishHealthResponse && Array.isArray(fishHealthResponse)) {
                    // Group by tank and get latest data for each tank
                    const tankData = {};
                    fishHealthResponse.forEach(record => {
                        const tankNum = record.tank_number;
                        if (!tankData[tankNum] || new Date(record.date) > new Date(tankData[tankNum].date)) {
                            tankData[tankNum] = {
                                tank_number: tankNum,
                                fish_count: record.fish_count || record.count,
                                current_count: record.fish_count || record.count,
                                average_weight: record.average_weight
                            };
                        }
                    });
                    const fallbackData = Object.values(tankData);
                    console.log('🐟 [DEBUG] Fish health fallback data:', fallbackData.length, 'tanks');
                    fallbackData.forEach(tank => {
                        console.log(`🐟 [DEBUG] Fallback Tank ${tank.tank_number}: ${tank.fish_count} fish, ${tank.average_weight}g avg weight`);
                    });
                    return fallbackData;
                }
            } catch (fallbackError) {
                console.warn('🐟 [DEBUG] Fish health fallback also failed:', fallbackError);
            }
        }
        
        console.log('🐟 [DEBUG] No fish data available, returning empty array');
        return [];
    }

    /**
     * Get previous feeding data from yesterday
     * Used to pre-populate feed amounts in bulk form
     */
    async getPreviousFeedingData() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const response = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}`);
            if (response && Array.isArray(response)) {
                // Filter for yesterday's data and get feed amounts by tank
                const yesterdayFeeding = response.filter(record => {
                    const recordDate = new Date(record.date).toISOString().split('T')[0];
                    return recordDate === yesterdayStr && record.feed_amount && record.feed_amount > 0;
                });
                
                // Group by tank and get the latest feed amount for each tank
                const tankFeedData = {};
                yesterdayFeeding.forEach(record => {
                    const tankNum = record.tank_number;
                    if (!tankFeedData[tankNum] || new Date(record.date) > new Date(tankFeedData[tankNum].date)) {
                        tankFeedData[tankNum] = {
                            tank_number: tankNum,
                            feed_amount: record.feed_amount,
                            date: record.date
                        };
                    }
                });
                
                return Object.values(tankFeedData);
            }
        } catch (error) {
            console.warn('Could not fetch previous feeding data:', error);
        }
        return [];
    }

    /**
     * Calculate suggested feed amount matching Tank Information calculations
     * Uses the same logic as the Tank Information tab for consistency
     */
    calculateSuggestedFeed(fishCount, avgWeight) {
        const count = parseFloat(fishCount) || 0;
        const weight = parseFloat(avgWeight) || 0;
        
        if (count === 0 || weight === 0) return 0;
        
        // Calculate total biomass in grams
        const totalBiomass = count * weight;
        
        // Feed rate as percentage of biomass (standard aquaculture rates)
        let feedRate = 0.025; // 2.5% default
        
        // Adjust feed rate based on fish size (smaller fish eat more as % of body weight)
        if (weight < 100) {
            feedRate = 0.04; // 4% for fingerlings
        } else if (weight < 200) {
            feedRate = 0.03; // 3% for juveniles
        } else if (weight < 500) {
            feedRate = 0.025; // 2.5% for growing fish
        } else {
            feedRate = 0.02; // 2% for mature fish
        }
        
        // Calculate daily feed amount
        const dailyFeed = Math.round(totalBiomass * feedRate);
        
        return dailyFeed;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            activeSystemId: this.app.activeSystemId,
            hasFishData: !!this.app.dataRecords?.fishHealth,
            fishHealthCount: this.app.dataRecords?.fishHealth?.length || 0
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Fish Tank Manager component');
    }
}

// Export both class and create a factory function
export default FishTankManagerComponent;

/**
 * Factory function to create fish tank manager component
 */
export function createFishTankManagerComponent(app) {
    return new FishTankManagerComponent(app);
}