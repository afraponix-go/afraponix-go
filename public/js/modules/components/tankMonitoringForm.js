// Tank Monitoring Form Component
// Handles tank monitoring form generation and data entry

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Tank Monitoring Form Component Class
 * Manages tank monitoring form generation, display, and data submission
 */
export class TankMonitoringFormComponent {
    constructor(app) {
        this.app = app;
        this.isSubmittingBulkData = false;
        
        console.log('🐟 Tank Monitoring Form Component initialized');
    }

    /**
     * Generate tank monitoring form HTML
     * Complexity: 35, Lines: 190+
     */
    async generateTankMonitoringForm() {
        // Get tank information for the current system
        let tanks = [];
        try {
            if (this.app.activeSystemId) {
                const response = await this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`);
                tanks = response.tanks || []; // Extract tanks array from response
            }
        } catch (error) {
            console.error('Failed to load tanks:', error);
            tanks = []; // Fallback to empty array
        }

        // If no tanks configured, show message
        if (tanks.length === 0) {
            return `
                <div class="tank-monitoring-interface">
                    <div class="monitoring-header">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 20px; height: 20px; vertical-align: text-bottom; margin-right: 8px;">
                                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12C18,13.5 17.35,14.75 16.24,15.56L15.5,14A4.5,4.5 0 0,0 12,7.5A4.5,4.5 0 0,0 7.5,12C7.5,13.25 8.09,14.42 9,15.19L8.26,16.75C6.88,15.71 6,13.95 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" fill="#0051b1"/>
                            </svg>
                            Tank Monitoring & Data Entry
                        </h3>
                        <p style="color: #666; margin-bottom: 1.5rem;">Quick entry for daily fish tank monitoring data</p>
                    </div>

                    <div style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                        <p style="color: #6c757d; margin-bottom: 1rem;">No fish tanks configured for this system.</p>
                        <p style="color: #6c757d; font-size: 0.9rem;">Please configure your fish tanks in the System Settings to enable monitoring.</p>
                    </div>
                </div>
            `;
        }

        // Get fish inventory data to show current counts and recommended feeding
        let fishInventoryData = {};
        try {
            if (this.app.activeSystemId) {
                const fishData = await this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`);
                // Handle the API response structure which has a tanks property
                const inventoryTanks = fishData.tanks || [];
                // Create lookup by tank number for quick access
                inventoryTanks.forEach(inventoryTank => {
                    // Use tank_number from the fish_tanks join, fallback to fish_tank_id
                    const tankNumber = inventoryTank.tank_number || inventoryTank.fish_tank_id;
                    fishInventoryData[tankNumber] = inventoryTank;
                });
            }
        } catch (error) {
            console.error('Failed to load fish inventory:', error);
        }

        // Generate tank rows
        let tankRows = '';
        tanks.forEach(tank => {
            const fishData = fishInventoryData[tank.tank_number] || {};
            const currentFishCount = fishData.current_count || 0;
            const avgWeight = fishData.average_weight || 0;
            
            // Calculate recommended daily feed (3% of biomass, split across 2-3 feedings)
            const totalBiomass = currentFishCount * avgWeight; // grams
            const dailyFeedAmount = Math.round(totalBiomass * 0.03); // 3% of biomass
            const perFeedingAmount = Math.round(dailyFeedAmount / 2.5); // Assuming 2.5 feedings per day
            
            tankRows += `
                <tr data-tank-id="${tank.id}">
                    <td class="tank-info">
                        <div class="tank-name">Tank ${tank.tank_number}</div>
                        <div class="tank-details">${tank.fish_type} • ${tank.volume_liters}L</div>
                        <div class="tank-fish-info">
                            <span class="fish-count">🐟 ${currentFishCount} fish</span>
                            ${dailyFeedAmount > 0 ? `<span class="recommended-feed">📊 ${perFeedingAmount}g/feeding (${dailyFeedAmount}g/day)</span>` : '<span class="no-fish">No fish - no feeding needed</span>'}
                        </div>
                    </td>
                    <td class="feed-inputs">
                        <input type="number" id="feed-amount-${tank.id}" step="0.1" min="0" placeholder="g" class="compact-input">
                        <select id="feed-type-${tank.id}" class="compact-select">
                            <option value="">Select feed type...</option>
                            <option value="Powder">Powder</option>
                            <option value="Crumble">Crumble</option>
                            <option value="2mm">2mm</option>
                            <option value="3mm">3mm</option>
                            <option value="4mm">4mm</option>
                            <option value="5mm">5mm</option>
                            <option value="6mm">6mm</option>
                        </select>
                    </td>
                    <td class="behavior-input">
                        <select id="behavior-${tank.id}" class="compact-select">
                            <option value="">--</option>
                            <option value="active_healthy">🟢 Active & Healthy</option>
                            <option value="feeding_well">🟢 Feeding Well</option>
                            <option value="normal_schooling">🟢 Normal Schooling</option>
                            <option value="sluggish">🟡 Sluggish Movement</option>
                            <option value="poor_appetite">🟡 Poor Appetite</option>
                            <option value="scattered">🟡 Scattered/Not Schooling</option>
                            <option value="gasping">🔴 Gasping at Surface</option>
                            <option value="stressed">🔴 Signs of Stress</option>
                            <option value="aggressive">🔴 Aggressive Behavior</option>
                        </select>
                    </td>
                    <td class="mortality-input">
                        <input type="number" id="mortality-${tank.id}" min="0" max="999" placeholder="0" class="compact-input">
                    </td>
                    <td class="notes-input">
                        <textarea id="notes-${tank.id}" placeholder="Observations, issues, etc." class="compact-textarea"></textarea>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="tank-monitoring-interface">
                <div class="monitoring-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 20px; height: 20px; vertical-align: text-bottom; margin-right: 8px;">
                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12C18,13.5 17.35,14.75 16.24,15.56L15.5,14A4.5,4.5 0 0,0 12,7.5A4.5,4.5 0 0,0 7.5,12C7.5,13.25 8.09,14.42 9,15.19L8.26,16.75C6.88,15.71 6,13.95 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" fill="#0051b1"/>
                        </svg>
                        Tank Monitoring & Data Entry
                    </h3>
                    <p style="color: #666; margin-bottom: 1.5rem;">Quick entry for all tanks at once</p>
                </div>

                <form id="bulk-tank-monitoring-form" class="bulk-monitoring-form">
                    <!-- Global Time Selection -->
                    <div class="time-selection-section">
                        <div class="form-field">
                            <label for="monitoring-time">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;">
                                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" fill="#0051b1"/>
                                </svg>
                                Entry Time:
                            </label>
                            <input type="time" id="monitoring-time" value="${new Date().toTimeString().slice(0, 5)}" required class="time-input">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 6px;">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
                                </svg>
                                Record All Data
                            </button>
                            <button type="button" id="clear-all-btn" class="btn btn-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 6px;">
                                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" fill="currentColor"/>
                                </svg>
                                Clear All
                            </button>
                        </div>
                    </div>

                    <!-- Tank Monitoring Table -->
                    <div class="monitoring-table-container">
                        <table class="monitoring-table">
                            <thead>
                                <tr>
                                    <th class="tank-col">Tank</th>
                                    <th class="feed-col">
                                        <div class="header-icon">🍽️</div>
                                        <div class="header-text">Feed Amount & Type</div>
                                    </th>
                                    <th class="behavior-col">
                                        <div class="header-icon">🐟</div>
                                        <div class="header-text">Behavior</div>
                                    </th>
                                    <th class="mortality-col">
                                        <div class="header-icon">💀</div>
                                        <div class="header-text">Mortality</div>
                                    </th>
                                    <th class="notes-col">
                                        <div class="header-icon">📝</div>
                                        <div class="header-text">Notes</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tankRows}
                            </tbody>
                        </table>
                    </div>
                </form>

                <!-- Today's Entry Summary -->
                <div class="today-summary">
                    <h4>Today's Entries</h4>
                    <div id="today-entries-list" class="entries-list">
                        <p style="color: #666; text-align: center; padding: 1rem;">Loading today's entries...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event handlers for tank monitoring form
     * Complexity: 15, Lines: 25
     */
    setupTankMonitoringHandlers() {
        // Setup bulk form submission handler
        setTimeout(() => {
            const bulkForm = document.getElementById('bulk-tank-monitoring-form');
            const clearAllBtn = document.getElementById('clear-all-btn');
            
            if (bulkForm && !bulkForm.hasAttribute('data-handlers-attached')) {
                bulkForm.setAttribute('data-handlers-attached', 'true');
                bulkForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitBulkTankData();
                });
            }
            
            if (clearAllBtn && !clearAllBtn.hasAttribute('data-handlers-attached')) {
                clearAllBtn.setAttribute('data-handlers-attached', 'true');
                clearAllBtn.addEventListener('click', () => {
                    this.clearAllTankInputs();
                });
            }

            // Load today's entries
            this.loadTodaysTankEntries();
        }, 100);
    }

    /**
     * Load tank monitoring history (for today)
     */
    loadTankMonitoringHistory() {
        // Load today's tank entries
        this.loadTodaysTankEntries();
    }

    /**
     * Submit bulk tank monitoring data
     * Complexity: 25, Lines: 80+
     */
    async submitBulkTankData() {
        // Prevent double submission
        if (this.isSubmittingBulkData) {
            return;
        }
        
        const monitoringTime = document.getElementById('monitoring-time').value;
        
        if (!monitoringTime) {
            this.app.showNotification('Please select a time for this monitoring entry', 'error');
            return;
        }

        try {
            this.isSubmittingBulkData = true;
            
            // Get all tank rows
            const tankRows = document.querySelectorAll('#bulk-tank-monitoring-form tbody tr[data-tank-id]');
            const entries = [];
            let hasValidData = false;

            tankRows.forEach(row => {
                const tankId = row.getAttribute('data-tank-id');
                const feedAmount = document.getElementById(`feed-amount-${tankId}`)?.value;
                const feedType = document.getElementById(`feed-type-${tankId}`)?.value;
                const behavior = document.getElementById(`behavior-${tankId}`)?.value;
                const mortality = document.getElementById(`mortality-${tankId}`)?.value;
                const notes = document.getElementById(`notes-${tankId}`)?.value;

                // Check if this row has any data
                if (feedAmount || feedType || behavior || mortality || notes) {
                    hasValidData = true;
                    
                    entries.push({
                        fish_tank_id: parseInt(tankId),
                        feed_amount: feedAmount ? parseFloat(feedAmount) : null,
                        feed_type: feedType || null,
                        behavior: behavior || null,
                        mortality: mortality ? parseInt(mortality) : null,
                        notes: notes || null,
                        time: monitoringTime
                    });
                }
            });

            if (!hasValidData) {
                this.app.showNotification('Please enter data for at least one tank', 'error');
                return;
            }

            // Submit all entries
            const response = await this.app.makeApiCall(`/data/fish-health/bulk/${this.app.activeSystemId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ entries })
            });

            if (response.success) {
                this.app.showNotification(`✅ Successfully recorded data for ${entries.length} tank(s)`, 'success');
                
                // Clear the form
                this.clearAllTankInputs();
                
                // Reload today's entries
                await this.loadTodaysTankEntries();
                
                // Refresh dashboard if fish management component exists
                if (this.app.fishManagement && typeof this.app.fishManagement.updateFishTankSummary === 'function') {
                    await this.app.fishManagement.updateFishTankSummary();
                }
                
            } else {
                throw new Error(response.message || 'Failed to submit data');
            }

        } catch (error) {
            console.error('Error submitting bulk tank data:', error);
            this.app.showNotification('❌ Failed to record tank data: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.isSubmittingBulkData = false;
        }
    }

    /**
     * Clear all tank input fields
     */
    clearAllTankInputs() {
        const tankRows = document.querySelectorAll('#bulk-tank-monitoring-form tbody tr[data-tank-id]');
        
        tankRows.forEach(row => {
            const tankId = row.getAttribute('data-tank-id');
            
            // Clear all inputs for this tank
            const feedAmountInput = document.getElementById(`feed-amount-${tankId}`);
            const feedTypeSelect = document.getElementById(`feed-type-${tankId}`);
            const behaviorSelect = document.getElementById(`behavior-${tankId}`);
            const mortalityInput = document.getElementById(`mortality-${tankId}`);
            const notesTextarea = document.getElementById(`notes-${tankId}`);
            
            if (feedAmountInput) feedAmountInput.value = '';
            if (feedTypeSelect) feedTypeSelect.selectedIndex = 0;
            if (behaviorSelect) behaviorSelect.selectedIndex = 0;
            if (mortalityInput) mortalityInput.value = '';
            if (notesTextarea) notesTextarea.value = '';
        });
    }

    /**
     * Load today's tank entries for display
     * Complexity: 20, Lines: 60+
     */
    async loadTodaysTankEntries() {
        try {
            if (!this.app.activeSystemId) return;
            
            const today = new Date().toISOString().split('T')[0];
            const response = await this.app.makeApiCall(`/data/fish-health/${this.app.activeSystemId}?date=${today}`);
            
            const entriesContainer = document.getElementById('today-entries-list');
            if (!entriesContainer) return;
            
            if (!response || response.length === 0) {
                entriesContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No entries recorded today.</p>';
                return;
            }

            // Group entries by time
            const entriesByTime = {};
            response.forEach(entry => {
                const time = entry.time || '00:00';
                if (!entriesByTime[time]) {
                    entriesByTime[time] = [];
                }
                entriesByTime[time].push(entry);
            });

            let html = '';
            Object.keys(entriesByTime).sort().forEach(time => {
                const timeEntries = entriesByTime[time];
                
                html += `
                    <div class="time-entry-group">
                        <h5 class="entry-time">📅 ${time}</h5>
                        <div class="entry-cards">
                `;
                
                timeEntries.forEach(entry => {
                    const tankName = entry.tank_number ? `Tank ${entry.tank_number}` : `Tank ID ${entry.fish_tank_id}`;
                    
                    html += `
                        <div class="entry-card">
                            <div class="entry-header">
                                <strong>${tankName}</strong>
                                <div class="entry-actions">
                                    <button onclick="app.editTankEntry(${entry.id})" class="edit-btn" title="Edit entry">
                                        <img src="icons/new-icons/Afraponix Go Icons_edit.svg" alt="Edit" style="width: 1em; height: 1em;">
                                    </button>
                                    <button onclick="app.deleteTankEntry(${entry.id})" class="delete-btn" title="Delete entry">
                                        <img src="icons/new-icons/Afraponix Go Icons_delete.svg" alt="Delete" style="width: 1em; height: 1em;">
                                    </button>
                                </div>
                            </div>
                            <div class="entry-details">
                                ${entry.feed_amount ? `<span class="detail">🍽️ ${entry.feed_amount}g ${entry.feed_type || ''}</span>` : ''}
                                ${entry.behavior ? `<span class="detail behavior-${entry.behavior.split('_')[0]}">🐟 ${this.formatBehavior(entry.behavior)}</span>` : ''}
                                ${entry.mortality && entry.mortality > 0 ? `<span class="detail mortality">💀 ${entry.mortality} died</span>` : ''}
                                ${entry.notes ? `<span class="detail notes">📝 ${entry.notes}</span>` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            entriesContainer.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading today\'s tank entries:', error);
            const entriesContainer = document.getElementById('today-entries-list');
            if (entriesContainer) {
                entriesContainer.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 1rem;">Failed to load today\'s entries</p>';
            }
        }
    }

    /**
     * Format behavior text for display
     */
    formatBehavior(behavior) {
        const behaviorMap = {
            'active_healthy': 'Active & Healthy',
            'feeding_well': 'Feeding Well',
            'normal_schooling': 'Normal Schooling',
            'sluggish': 'Sluggish Movement',
            'poor_appetite': 'Poor Appetite',
            'scattered': 'Scattered/Not Schooling',
            'gasping': 'Gasping at Surface',
            'stressed': 'Signs of Stress',
            'aggressive': 'Aggressive Behavior'
        };
        return behaviorMap[behavior] || behavior;
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            isSubmitting: this.isSubmittingBulkData,
            hasForm: !!document.getElementById('bulk-tank-monitoring-form')
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Tank Monitoring Form component');
        this.isSubmittingBulkData = false;
    }
}

// Export both class and create a factory function
export default TankMonitoringFormComponent;

/**
 * Factory function to create tank monitoring form component
 */
export function createTankMonitoringFormComponent(app) {
    return new TankMonitoringFormComponent(app);
}