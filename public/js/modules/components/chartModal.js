// Chart Modal Component
// Handles modal chart displays, detailed charts, and nutrient information

/**
 * Chart Modal Component Class
 * Manages chart modal dialogs with detailed views and data analysis
 * Extracts complex modal functionality from main application class
 */
export class ChartModalComponent {
    constructor(app) {
        this.app = app;
        this.modalChart = null; // Chart.js instance for modal chart
        this.isFullscreen = false;
        this.modalElement = null;
        this.previouslyFocusedElement = null;
        this.currentChartParams = null; // Store current chart parameters for refresh

        // Bind event handlers
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleResize = this.handleResize.bind(this);

        console.log('📊 Chart Modal Component initialized');

        // Initialize modal handlers after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeModalHandlers());
        } else {
            this.initializeModalHandlers();
        }
    }

    /**
     * Open nutrient/parameter detail modal with chart
     * Complexity: 55, Lines: 185
     * Extracted from script.js openNutrientModal function
     */
    async openDetailModal(canvasId, label, labels, data, color) {
        const modal = document.getElementById('nutrient-detail-modal');
        if (!modal) {
            console.error('Modal element not found');
            return;
        }

        const nutrientName = label.toLowerCase().replace(/\s+\(.+?\)/g, '').replace(/\s+/g, '-');

        // Store chart parameters for refresh
        this.currentChartParams = { canvasId, label, labels, data, color };

        try {
            // Fetch detailed nutrient history from API (more data points for modal)
            let detailedData = [];
            let detailedLabels = [];
            
            // Check if this is a dashboard water quality chart
            const isDashboardChart = ['temp-chart', 'ph-chart', 'oxygen-chart', 'ammonia-chart', 'humidity-chart', 'salinity-chart', 'ec-chart', 'nitrate-chart', 'nitrite-chart', 'phosphorus-chart', 'potassium-chart', 'calcium-chart', 'magnesium-chart', 'iron-chart'].includes(canvasId);
            
            if ((isDashboardChart && !['ec-chart', 'nitrate-chart', 'nitrite-chart', 'phosphorus-chart', 'potassium-chart', 'calcium-chart', 'magnesium-chart', 'iron-chart'].includes(canvasId)) ||
                nutrientName === 'ph-level' || nutrientName === 'temperature' ||
                nutrientName === 'dissolved-oxygen' || nutrientName === 'ammonia' || nutrientName === 'ec/tds') {
                // Get selected date range
                const dateRangeSelect = document.getElementById('chart-date-range');
                const dayLimit = dateRangeSelect ? parseInt(dateRangeSelect.value) : 30;

                // For water quality parameters, use water quality data
                const waterQualityData = this.app.dataRecords.waterQuality || [];
                const limitedData = dayLimit === 'all' ? waterQualityData : waterQualityData.slice(0, Math.max(dayLimit, 12));
                const recentData = limitedData.reverse();
                
                // Map chart ID to data field
                let dataField = this.mapChartIdToDataField(canvasId, nutrientName);
                
                detailedData = recentData.map(entry => {
                    const value = entry[dataField];
                    // Return null for missing values to create gaps in the chart
                    return (value !== undefined && value !== null && value !== '') ? value : null;
                });
                detailedLabels = recentData.map(entry => this.app.formatDateDDMMYYYY(new Date(entry.date)));
            } else {
                // Get selected date range
                const dateRangeSelect = document.getElementById('chart-date-range');
                const dayLimit = dateRangeSelect ? (dateRangeSelect.value === 'all' ? 1000 : parseInt(dateRangeSelect.value)) : 30;

                // Fetch from individual nutrient API
                const nutrientType = nutrientName.replace('-', ''); // Convert 'nitrate' etc
                const apiData = await this.app.makeApiCall(`/data/nutrients/${this.app.activeSystemId}?nutrient_type=${nutrientType}&limit=${dayLimit}`);
                
                detailedData = apiData.map(entry => {
                    const val = parseFloat(entry.value);
                    return (!isNaN(val) ? val : null);
                });
                detailedLabels = apiData.map(entry => this.app.formatDateDDMMYYYY(new Date(entry.reading_date))).reverse();
                detailedData = detailedData.reverse(); // Reverse to match labels order
            }
            
            // Use detailed data if available, otherwise fallback to chart data
            const modalData = detailedData.length > 0 ? detailedData : data;
            const modalLabels = detailedLabels.length > 0 ? detailedLabels : labels;
            
            // Calculate current value and trend
            const { currentValue, trend } = this.calculateTrend(modalData);
            
            // Calculate statistics
            const stats = this.calculateStatistics(modalData);
            
            // Get optimal ranges and status
            const optimalRange = this.getNutrientOptimalRange(nutrientName);
            const status = this.getNutrientStatus(currentValue, optimalRange);

            // Update modal UI elements
            this.updateModalElements(label, currentValue, trend, optimalRange, status);
            
            // Update history table
            this.updateNutrientHistoryTable(modalLabels, modalData);

            // Show modal with proper management
            this.showModal(modal, label);
            
            // Create detailed chart after modal is displayed
            setTimeout(() => {
                this.createDetailedChart(modalLabels, modalData, color, label);
            }, 100);
            
        } catch (error) {
            console.error('Error in openDetailModal:', error);
            this.showFallbackModal(labels, data, color, label);
        }
    }

    /**
     * Map chart ID to database field name
     */
    mapChartIdToDataField(canvasId, nutrientName) {
        const mapping = {
            'temp-chart': 'temperature',
            'oxygen-chart': 'dissolved_oxygen', 
            'ammonia-chart': 'ammonia',
            'ph-chart': 'ph',
            'humidity-chart': 'humidity',
            'salinity-chart': 'salinity',
            'plant-ec-chart': 'ec'
        };
        
        // Try mapping by canvas ID first
        if (mapping[canvasId]) {
            return mapping[canvasId];
        }
        
        // Fallback to nutrient name mapping
        if (nutrientName === 'temperature') return 'temperature';
        if (nutrientName === 'dissolved-oxygen') return 'dissolved_oxygen';
        if (nutrientName === 'ammonia') return 'ammonia';
        if (nutrientName === 'ph-level') return 'ph';
        if (nutrientName === 'ec/tds') return 'ec';
        if (nutrientName === 'humidity') return 'humidity';
        if (nutrientName === 'salinity') return 'salinity';
        
        return 'ph'; // default
    }

    /**
     * Calculate trend from data array
     */
    calculateTrend(modalData) {
        // Find the most recent non-zero value (after reversing, newest is at the end)
        let currentValue = modalData[modalData.length - 1];
        let currentIndex = modalData.length - 1;
        
        // If current value is 0 or null, find the most recent non-zero value
        if (!currentValue || currentValue === 0) {
            for (let i = modalData.length - 1; i >= 0; i--) {
                if (modalData[i] && modalData[i] > 0) {
                    currentValue = modalData[i];
                    currentIndex = i;
                    break;
                }
            }
        }
        
        // Find previous non-zero value for trend calculation (skip identical values)
        let previousValue = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (modalData[i] && modalData[i] > 0 && modalData[i] !== currentValue) {
                previousValue = modalData[i];
                break;
            }
        }
        
        const trend = previousValue ? (currentValue > previousValue ? 'increasing' : 'decreasing') : 'stable';
        
        return { currentValue, trend };
    }

    /**
     * Calculate basic statistics from data
     */
    calculateStatistics(modalData) {
        let minValue = 0, maxValue = 0, avgValue = 0;
        try {
            const filteredData = modalData.filter(val => val !== null && val !== undefined && !isNaN(val));
            minValue = filteredData.length > 0 ? Math.min(...filteredData) : 0;
            maxValue = filteredData.length > 0 ? Math.max(...filteredData) : 0;
            avgValue = modalData.reduce((sum, val) => sum + (val || 0), 0) / modalData.length;
        } catch (error) {
            console.error('Error calculating statistics:', error);
        }
        return { minValue, maxValue, avgValue };
    }

    /**
     * Update modal UI elements with calculated values
     */
    updateModalElements(label, currentValue, trend, optimalRange, status) {
        try {
            document.getElementById('nutrient-modal-title').textContent = label;
            
            // Update current reading - ensure we show the actual value
            const currentElement = document.getElementById('nutrient-modal-current');
            if (currentValue && parseFloat(currentValue) > 0) {
                currentElement.textContent = parseFloat(currentValue).toFixed(1);
            } else {
                currentElement.textContent = 'No data';
            }
            
            document.getElementById('nutrient-modal-trend').textContent = trend;
            document.getElementById('nutrient-modal-trend').className = `trend ${trend}`;
            
            // Update optimal range
            const optimalElement = document.getElementById('nutrient-modal-optimal');
            if (optimalElement && optimalRange) {
                optimalElement.textContent = `${optimalRange.min} - ${optimalRange.max}`;
            } else if (optimalElement) {
                optimalElement.textContent = 'Not specified';
            }

            // Update status
            const statusElement = document.getElementById('nutrient-modal-status');
            if (statusElement) {
                statusElement.textContent = status.text;
                statusElement.className = `status ${status.class}`;
            }

        } catch (error) {
            console.error('Error updating basic modal elements:', error);
        }
    }

    /**
     * Show fallback modal with basic functionality
     */
    showFallbackModal(labels, data, color, label) {
        const modal = document.getElementById('nutrient-detail-modal');
        const currentValue = data[data.length - 1];
        const trend = 'stable';
        
        try {
            document.getElementById('nutrient-modal-title').textContent = label;
            const currentElement = document.getElementById('nutrient-modal-current');
            if (currentValue && parseFloat(currentValue) > 0) {
                currentElement.textContent = parseFloat(currentValue).toFixed(1);
            } else {
                currentElement.textContent = 'No data';
            }
            
            this.updateNutrientHistoryTable(labels, data);
            this.showModal(modal, label);
            
            setTimeout(() => {
                this.createDetailedChart(labels, data, color, label);
            }, 100);
        } catch (fallbackError) {
            console.error('Error in fallback modal display:', fallbackError);
        }
    }

    /**
     * Get optimal nutrient range configuration
     * Complexity: 12, Lines: 30
     * Extracted from script.js getNutrientOptimalRange function
     */
    getNutrientOptimalRange(nutrientName) {
        const ranges = {
            // Nutrient ranges
            'nitrate': { min: 5, max: 150 },
            'phosphorus': { min: 4, max: 60 },
            'potassium': { min: 10, max: 40 },
            'iron': { min: 0.5, max: 3.0 },
            'calcium': { min: 20, max: 400 },
            'ph-level': { min: 5.5, max: 7.5 },
            
            // Dashboard water quality parameter ranges
            'temperature': { min: 18, max: 30 },
            'dissolved-oxygen': { min: 4, max: 8 },
            'ammonia': { min: 0, max: 0.25 },
            'humidity': { min: 60, max: 80 },
            'salinity': { min: 0, max: 2 },
            
            // EC ranges for different systems
            'ec': { min: 800, max: 2000 },
            'nitrite': { min: 0, max: 0.75 }
        };
        return ranges[nutrientName] || null;
    }

    /**
     * Get nutrient status based on value and optimal range
     * Complexity: 8, Lines: 14
     * Extracted from script.js getNutrientStatus function  
     */
    getNutrientStatus(value, optimalRange) {
        if (!value || !optimalRange) {
            return { text: 'Unknown', class: 'unknown' };
        }
        
        if (value < optimalRange.min) {
            return { text: 'Low', class: 'low' };
        } else if (value > optimalRange.max) {
            return { text: 'High', class: 'high' };
        } else {
            return { text: 'Optimal', class: 'optimal' };
        }
    }

    /**
     * Create detailed Chart.js chart for modal display
     * Complexity: 35, Lines: 67
     * Extracted from script.js createDetailedChart function
     */
    createDetailedChart(labels, data, color, title) {
        const ctx = document.getElementById('nutrient-modal-chart');
        if (!ctx) {
            console.error('Canvas element nutrient-modal-chart not found');
            return;
        }
        
        // Check if canvas has valid dimensions before creating chart
        const rect = ctx.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            if (window.location.search.includes('debug=chart')) {
                console.warn(`⚠️ Canvas nutrient-modal-chart has zero dimensions (${rect.width}x${rect.height}), skipping chart creation`);
            }
            return;
        }
        
        console.log('📊 ChartModal: Creating detailed chart for:', title, 'with data:', data);
        
        // Validate input data
        const validData = Array.isArray(data) ? data.filter(value => {
            const isValid = value !== null && value !== undefined && isFinite(value) && !isNaN(value);
            if (!isValid) {
                console.warn('📊 ChartModal: Filtered out invalid data point:', value);
            }
            return isValid;
        }) : [];
        
        const validLabels = labels && labels.length === data.length ? 
            labels.slice(0, validData.length) : 
            validData.map((_, index) => `Point ${index + 1}`);
            
        console.log('📊 ChartModal: Using validated data:', validData.length, 'points');
        
        // Destroy existing chart if it exists
        if (this.modalChart) {
            this.modalChart.destroy();
        }
        
        try {
            this.modalChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: validLabels,
                    datasets: [{
                        label: title,
                        data: validData,
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: `${title} - Historical Data`
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: color,
                            borderWidth: 1,
                            cornerRadius: 6,
                            displayColors: true,
                            callbacks: {
                                afterBody: function(context) {
                                    return ['', 'Click and drag to pan', 'Scroll to zoom'];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: true,
                                color: '#e5e5e5'
                            },
                            ticks: {
                                maxRotation: 45,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            grid: {
                                display: true,
                                color: '#e5e5e5'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    elements: {
                        point: {
                            hoverRadius: 6
                        }
                    },
                    onHover: (event, activeElements) => {
                        event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                    }
                }
            });
            
            // Hide loading state after chart is created
            setTimeout(() => {
                this.showLoading(false);
                this.addChartControls();
            }, 200);
            
        } catch (error) {
            console.error('Error creating detailed chart:', error);
            this.showLoading(false);
            
            // Show error state
            const ctx = document.getElementById('nutrient-modal-chart');
            if (ctx) {
                const container = ctx.parentElement;
                container.innerHTML = `
                    <div class="chart-error">
                        <div class="error-icon">⚠️</div>
                        <p>Unable to load chart data</p>
                        <button class="retry-btn" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Update nutrient history table in modal
     * Complexity: 18, Lines: 45
     * Extracted from script.js updateNutrientHistoryTable function
     */
    updateNutrientHistoryTable(labels, data, sourceData = null) {
        // Fix: Use correct table body ID
        const tableBody = document.querySelector('#nutrient-modal-history tbody');
        if (!tableBody) {
            console.log('ℹ️ Nutrient history table not found - likely not on a modal view');
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Take only the last 10 entries for the table
        const maxEntries = Math.min(10, labels.length);
        const tableLabels = labels.slice(-maxEntries);
        const tableData = data.slice(-maxEntries);
        const tableSourceData = sourceData ? sourceData.slice(-maxEntries) : null;

        for (let i = tableLabels.length - 1; i >= 0; i--) {
            const value = tableData[i];
            const displayValue = (value !== null && value !== undefined && value !== '') ? 
                parseFloat(value).toFixed(2) : 'No data';
            
            // Get source icon if sourceData is provided
            let sourceIcon = '';
            if (tableSourceData && tableSourceData[i] && tableSourceData[i].source) {
                sourceIcon = this.getDataSourceIcon(tableSourceData[i].source);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tableLabels[i]}</td>
                <td>${displayValue}</td>
                <td>${sourceIcon}</td>
            `;
            tableBody.appendChild(row);
        }
    }

    /**
     * Get data source icon based on source type
     */
    getDataSourceIcon(source) {
        const iconMap = {
            'sensor': '<img src="/icons/new-icons/Afraponix Go Icons_sensor data.svg" style="width: 1em; height: 1em; vertical-align: middle;" alt="Sensor">',
            'manual': '<img src="/icons/new-icons/Afraponix Go Icons_Data entry.svg" style="width: 1em; height: 1em; vertical-align: middle;" alt="Manual">',
            'calculated': '<img src="/icons/new-icons/Afraponix Go Icons_chemistry.svg" style="width: 1em; height: 1em; vertical-align: middle;" alt="Calculated">'
        };
        return iconMap[source] || '';
    }

    /**
     * Close modal and cleanup
     */
    closeModal() {
        const modal = document.getElementById('nutrient-detail-modal');
        if (modal) {
            // Add smooth closing animation
            modal.classList.add('closing');
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('show', 'closing');
                
                // Re-enable body scroll
                document.body.style.overflow = '';
                
                // Restore focus to previously focused element
                if (this.previouslyFocusedElement) {
                    this.previouslyFocusedElement.focus();
                    this.previouslyFocusedElement = null;
                }
                
                // Exit fullscreen if active
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
            }, 150);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
        
        // Destroy modal chart
        if (this.modalChart) {
            this.modalChart.destroy();
            this.modalChart = null;
        }
        
        this.modalElement = null;
    }

    /**
     * Refresh chart with new date range
     */
    async refreshChartWithDateRange() {
        if (!this.currentChartParams) {
            console.warn('No chart parameters available for refresh');
            return;
        }

        // Show loading state
        this.showLoading(true);

        try {
            const { canvasId, label, labels, data, color } = this.currentChartParams;

            // Re-open the modal with new date range (will fetch new data)
            await this.openDetailModal(canvasId, label, labels, data, color);

            this.showNotification('Chart data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing chart:', error);
            this.showNotification('Failed to refresh chart data', 'error');
            this.showLoading(false);
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            hasModalChart: !!this.modalChart,
            componentLoaded: true
        };
    }

    /**
     * Initialize modal event handlers
     */
    initializeModalHandlers() {
        const modal = document.getElementById('nutrient-detail-modal');
        if (!modal) return;

        // Close button handlers
        const closeBtn = document.getElementById('close-nutrient-modal');
        const closeBtnSecondary = document.getElementById('close-nutrient-modal-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (closeBtnSecondary) {
            closeBtnSecondary.addEventListener('click', () => this.closeModal());
        }

        // Date range refresh button handler
        const refreshBtn = document.getElementById('refresh-chart-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshChartWithDateRange());
        }
        
        // Export dropdown handlers
        const exportBtn = document.getElementById('export-chart-data');
        const exportOptions = document.querySelectorAll('.export-option');
        
        if (exportBtn) {
            // Toggle dropdown on button click
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = exportBtn.closest('.export-dropdown');
                dropdown.classList.toggle('open');
            });
        }
        
        // Handle export option clicks
        exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = option.getAttribute('data-format');
                this.handleExport(format);
                
                // Close dropdown
                const dropdown = option.closest('.export-dropdown');
                dropdown.classList.remove('open');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.export-dropdown')) {
                document.querySelectorAll('.export-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('open');
                });
            }
        });
        
        // Add fullscreen button if not exists
        this.addFullscreenButton();
    }
    
    /**
     * Show modal with proper focus management
     */
    showModal(modal, title = '') {
        if (!modal) return;
        
        // Store previously focused element
        this.previouslyFocusedElement = document.activeElement;
        this.modalElement = modal;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Show modal
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus management
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // Add event listeners
        document.addEventListener('keydown', this.handleKeydown);
        window.addEventListener('resize', this.handleResize);
        modal.addEventListener('click', this.handleBackdropClick);
        
        // Show loading state initially
        this.showLoading(true);
    }
    
    /**
     * Handle keydown events (ESC key, etc.)
     */
    handleKeydown(event) {
        if (!this.modalElement) return;
        
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeModal();
        }
        
        // Handle Tab for focus trapping
        if (event.key === 'Tab') {
            this.trapFocus(event);
        }
        
        // Handle F11 for fullscreen
        if (event.key === 'F11') {
            event.preventDefault();
            this.toggleFullscreen();
        }
    }
    
    /**
     * Handle backdrop clicks
     */
    handleBackdropClick(event) {
        if (event.target === this.modalElement) {
            this.closeModal();
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (this.modalChart) {
            this.modalChart.resize();
        }
    }
    
    /**
     * Trap focus within modal
     */
    trapFocus(event) {
        const focusableElements = this.modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
        }
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!this.modalElement) return;
        
        this.isFullscreen = !this.isFullscreen;
        
        if (this.isFullscreen) {
            this.modalElement.classList.add('fullscreen');
            document.body.classList.add('modal-fullscreen');
        } else {
            this.modalElement.classList.remove('fullscreen');
            document.body.classList.remove('modal-fullscreen');
        }
        
        // Resize chart after fullscreen change
        setTimeout(() => {
            if (this.modalChart) {
                this.modalChart.resize();
            }
        }, 100);
        
        // Update fullscreen button
        this.updateFullscreenButton();
    }
    
    /**
     * Add fullscreen button to modal header
     */
    addFullscreenButton() {
        const modal = document.getElementById('nutrient-detail-modal');
        if (!modal) {
            console.warn('Modal not found when trying to add fullscreen button');
            return;
        }

        const modalHeader = modal.querySelector('.modal-header');
        if (!modalHeader) {
            console.warn('Modal header not found');
            return;
        }

        // Remove existing fullscreen button if present
        const existingBtn = modalHeader.querySelector('.fullscreen-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const closeBtn = modalHeader.querySelector('.close-btn');

        // Create fullscreen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Toggle Fullscreen (F11)';
        fullscreenBtn.type = 'button'; // Prevent form submission
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFullscreen();
        });

        if (closeBtn) {
            modalHeader.insertBefore(fullscreenBtn, closeBtn);
        } else {
            modalHeader.appendChild(fullscreenBtn);
        }

        console.log('✓ Fullscreen button added to modal');
    }
    
    /**
     * Update fullscreen button appearance
     */
    updateFullscreenButton() {
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = this.isFullscreen ? '⇙' : '⛶️';
            fullscreenBtn.title = this.isFullscreen ? 'Exit Fullscreen (F11)' : 'Toggle Fullscreen (F11)';
        }
    }
    
    /**
     * Show/hide loading state
     */
    showLoading(show = true) {
        const modal = document.getElementById('nutrient-detail-modal');
        if (!modal) return;
        
        let loadingDiv = modal.querySelector('.chart-loading');
        
        if (show && !loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.className = 'chart-loading';
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Loading chart data...</p>
            `;
            
            const chartContainer = modal.querySelector('.chart-container-modal');
            if (chartContainer) {
                chartContainer.appendChild(loadingDiv);
            }
        } else if (!show && loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    /**
     * Handle export based on format
     */
    handleExport(format) {
        switch (format) {
            case 'csv':
                this.exportChartData();
                break;
            case 'png':
                this.exportChartImage('png');
                break;
            case 'jpeg':
                this.exportChartImage('jpeg');
                break;
            default:
                this.showNotification('Unknown export format', 'error');
        }
    }
    
    /**
     * Export chart data as CSV
     */
    exportChartData() {
        const titleElement = document.getElementById('nutrient-modal-title');
        const tableBody = document.querySelector('#nutrient-modal-history tbody');
        
        if (!titleElement || !tableBody) {
            this.showNotification('Export failed: No data available', 'error');
            return;
        }
        
        const title = titleElement.textContent || 'Chart Data';
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        
        if (rows.length === 0) {
            this.showNotification('Export failed: No data to export', 'error');
            return;
        }
        
        // Create CSV content
        const headers = ['Date', 'Value', 'Source'];
        let csvContent = headers.join(',') + '\n';
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowData = cells.map(cell => {
                // Clean cell content (remove HTML, escape commas)
                let content = cell.textContent.trim();
                if (content.includes(',')) {
                    content = `"${content}"`;
                }
                return content;
            });
            csvContent += rowData.join(',') + '\n';
        });
        
        // Download CSV file
        this.downloadFile(csvContent, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`, 'text/csv');
        this.showNotification('Chart data exported successfully!', 'success');
    }
    
    /**
     * Export chart as image
     */
    exportChartImage(format = 'png') {
        if (!this.modalChart) {
            this.showNotification('Export failed: No chart available', 'error');
            return;
        }
        
        try {
            const titleElement = document.getElementById('nutrient-modal-title');
            const title = titleElement?.textContent || 'chart';
            
            // Get high-resolution chart image
            const imageData = this.modalChart.toBase64Image('image/' + format, 1.0);
            
            // Create download link
            const link = document.createElement('a');
            link.href = imageData;
            link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`Chart exported as ${format.toUpperCase()} successfully!`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed: Unable to generate image', 'error');
        }
    }
    
    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Add chart interaction controls
     */
    addChartControls() {
        const chartContainer = document.querySelector('.chart-container-modal');
        if (!chartContainer || chartContainer.querySelector('.chart-controls')) return;
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'chart-controls';
        controlsDiv.innerHTML = `
            <div class="chart-controls-row">
                <button class="chart-control-btn" id="zoom-in-btn" title="Zoom In">🔍+</button>
                <button class="chart-control-btn" id="zoom-out-btn" title="Zoom Out">🔍-</button>
                <button class="chart-control-btn" id="reset-zoom-btn" title="Reset View">🏠</button>
                <span class="control-divider">|</span>
                <button class="chart-control-btn" id="pan-left-btn" title="Pan Left">←</button>
                <button class="chart-control-btn" id="pan-right-btn" title="Pan Right">→</button>
                <button class="chart-control-btn" id="pan-up-btn" title="Pan Up">↑</button>
                <button class="chart-control-btn" id="pan-down-btn" title="Pan Down">↓</button>
            </div>
        `;
        
        chartContainer.appendChild(controlsDiv);
        
        // Add event listeners for controls
        this.setupChartControlListeners();
    }
    
    /**
     * Setup chart control event listeners
     */
    setupChartControlListeners() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const resetZoomBtn = document.getElementById('reset-zoom-btn');
        const panLeftBtn = document.getElementById('pan-left-btn');
        const panRightBtn = document.getElementById('pan-right-btn');
        const panUpBtn = document.getElementById('pan-up-btn');
        const panDownBtn = document.getElementById('pan-down-btn');
        
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomChart(1.1));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomChart(0.9));
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => this.resetChartView());
        if (panLeftBtn) panLeftBtn.addEventListener('click', () => this.panChart(-0.1, 0));
        if (panRightBtn) panRightBtn.addEventListener('click', () => this.panChart(0.1, 0));
        if (panUpBtn) panUpBtn.addEventListener('click', () => this.panChart(0, 0.1));
        if (panDownBtn) panDownBtn.addEventListener('click', () => this.panChart(0, -0.1));
        
        // Add double-click to reset
        const canvas = document.getElementById('nutrient-modal-chart');
        if (canvas) {
            canvas.addEventListener('dblclick', () => this.resetChartView());
        }
    }
    
    /**
     * Zoom chart by factor
     */
    zoomChart(factor) {
        if (!this.modalChart) return;
        
        try {
            const xScale = this.modalChart.scales.x;
            const yScale = this.modalChart.scales.y;
            
            if (xScale && yScale) {
                const xRange = xScale.max - xScale.min;
                const yRange = yScale.max - yScale.min;
                
                const newXRange = xRange / factor;
                const newYRange = yRange / factor;
                
                const xCenter = (xScale.max + xScale.min) / 2;
                const yCenter = (yScale.max + yScale.min) / 2;
                
                xScale.options.min = xCenter - newXRange / 2;
                xScale.options.max = xCenter + newXRange / 2;
                yScale.options.min = yCenter - newYRange / 2;
                yScale.options.max = yCenter + newYRange / 2;
                
                this.modalChart.update('none');
            }
        } catch (error) {
            console.log('Zoom not supported for this chart type');
        }
    }
    
    /**
     * Pan chart by offset
     */
    panChart(xOffset, yOffset) {
        if (!this.modalChart) return;
        
        try {
            const xScale = this.modalChart.scales.x;
            const yScale = this.modalChart.scales.y;
            
            if (xScale && yScale) {
                const xRange = xScale.max - xScale.min;
                const yRange = yScale.max - yScale.min;
                
                const xShift = xRange * xOffset;
                const yShift = yRange * yOffset;
                
                xScale.options.min += xShift;
                xScale.options.max += xShift;
                yScale.options.min += yShift;
                yScale.options.max += yShift;
                
                this.modalChart.update('none');
            }
        } catch (error) {
            console.log('Pan not supported for this chart type');
        }
    }
    
    /**
     * Reset chart view to original
     */
    resetChartView() {
        if (!this.modalChart) return;
        
        try {
            const xScale = this.modalChart.scales.x;
            const yScale = this.modalChart.scales.y;
            
            if (xScale && yScale) {
                delete xScale.options.min;
                delete xScale.options.max;
                delete yScale.options.min;
                delete yScale.options.max;
                
                this.modalChart.update();
            }
        } catch (error) {
            console.log('Reset not supported for this chart type');
        }
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Try to use app's notification system if available
        if (this.app && typeof this.app.showNotification === 'function') {
            this.app.showNotification(message, type);
        } else if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to simple alert
            const typeMap = { success: '✓', error: '✗', warning: '⚠', info: 'i' };
            alert(`${typeMap[type] || 'i'} ${message}`);
        }
    }
    
    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Chart Modal component');
        this.closeModal();
        
        // Remove any remaining event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
    }
}

// Export both class and create a factory function
export default ChartModalComponent;

/**
 * Factory function to create chart modal component
 */
export function createChartModalComponent(app) {
    return new ChartModalComponent(app);
}