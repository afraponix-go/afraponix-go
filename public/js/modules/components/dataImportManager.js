import { BaseUIComponent } from './baseUIComponent.js';

export class DataImportManager extends BaseUIComponent {
    constructor(systemId, app) {
        super('data-import-manager');
        this.systemId = systemId;
        this.app = app;
        this.isImporting = false;
    }

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="data-import-section">
                <div class="section-header">
                    <h3>📊 Data Import/Export</h3>
                    <p>Import data from Excel files or download sample templates</p>
                </div>

                <div class="import-export-grid">
                    <!-- Export Section -->
                    <div class="card">
                        <div class="card-header">
                            <h4>📥 Download Sample Templates</h4>
                        </div>
                        <div class="card-body">
                            <p>Download sample files in Excel or CSV format. <strong>CSV format is recommended</strong> to avoid date formatting issues.</p>

                            <div class="template-section featured">
                                <h6>💧🧪 Water Quality & Nutrients (Combined)</h6>
                                <p class="template-description">Import both water quality and nutrient data in a single file - recommended for comprehensive data entry.</p>
                                <div class="button-group">
                                    <button type="button" class="btn-secondary" onclick="dataImportManager.downloadSample('water_nutrients', 'xlsx')">
                                        📥 Excel Template
                                    </button>
                                    <button type="button" class="btn-primary" onclick="dataImportManager.downloadSample('water_nutrients', 'csv')">
                                        📄 CSV Template (Recommended)
                                    </button>
                                </div>
                            </div>

                            <div class="template-section">
                                <h6>🧪 Nutrient Data Only</h6>
                                <div class="button-group">
                                    <button type="button" class="btn-secondary" onclick="dataImportManager.downloadSample('nutrients', 'xlsx')">
                                        📥 Excel Template
                                    </button>
                                    <button type="button" class="btn-primary" onclick="dataImportManager.downloadSample('nutrients', 'csv')">
                                        📄 CSV Template (Recommended)
                                    </button>
                                </div>
                            </div>

                            <div class="template-section">
                                <h6>💧 Water Quality Only</h6>
                                <div class="button-group">
                                    <button type="button" class="btn-secondary" onclick="dataImportManager.downloadSample('water_quality', 'xlsx')">
                                        📥 Excel Template
                                    </button>
                                    <button type="button" class="btn-primary" onclick="dataImportManager.downloadSample('water_quality', 'csv')">
                                        📄 CSV Template (Recommended)
                                    </button>
                                </div>
                            </div>

                            <div class="template-section">
                                <h6>🐟 Fish Health</h6>
                                <div class="button-group">
                                    <button type="button" class="btn-secondary" onclick="dataImportManager.downloadSample('fish_health', 'xlsx')">
                                        📥 Excel Template
                                    </button>
                                    <button type="button" class="btn-primary" onclick="dataImportManager.downloadSample('fish_health', 'csv')">
                                        📄 CSV Template (Recommended)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Import Section -->
                    <div class="card">
                        <div class="card-header">
                            <h4>📤 Import Data from Excel</h4>
                        </div>
                        <div class="card-body">
                            <p>Upload Excel files with your data using the templates above.</p>
                            
                            <form id="data-import-form" class="import-form">
                                <div class="form-group">
                                    <label for="import-type">Data Type:</label>
                                    <select id="import-type" name="import-type" class="form-control" required>
                                        <option value="">Select data type...</option>
                                        <option value="water_nutrients">💧🧪 Water Quality & Nutrients (Recommended)</option>
                                        <option value="nutrients">🧪 Nutrient Readings Only</option>
                                        <option value="water_quality">💧 Water Quality Only</option>
                                        <option value="fish_health">🐟 Fish Health</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="data-file">Data File:</label>
                                    <input type="file" id="data-file" name="data-file" 
                                           accept=".xlsx,.xls,.csv" class="form-control" required>
                                    <small class="form-text text-muted">
                                        Excel (.xlsx, .xls) and CSV (.csv) files up to 10MB are allowed. CSV format recommended.
                                    </small>
                                </div>

                                <div class="form-actions">
                                    <button type="submit" class="btn-primary" id="import-btn">
                                        <span class="btn-text">📤 Import Data</span>
                                        <span class="btn-spinner" style="display: none;">
                                            <i class="spinner"></i> Importing...
                                        </span>
                                    </button>
                                </div>
                            </form>

                            <!-- Import Status -->
                            <div id="import-status" class="import-status" style="display: none;">
                                <div class="status-content"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Import History -->
                <div class="card">
                    <div class="card-header">
                        <h4>📋 Recent Imports</h4>
                    </div>
                    <div class="card-body">
                        <div id="import-history" class="import-history">
                            <p class="text-muted">No recent imports found.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.loadImportHistory();
    }

    bindEvents() {
        const form = document.getElementById('data-import-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleImport(e));
        }
    }

    async downloadSample(type, format = 'xlsx') {
        try {
            // Get token from localStorage - try multiple possible keys
            const token = localStorage.getItem('auth_token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('authToken');
                         
            if (!token) {
                this.showMessage('Authentication required. Please login again.', 'error');
                return;
            }

            const response = await fetch(`/api/import/sample/${type}?systemId=${this.systemId}&format=${format}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download sample file');
            }

            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Use correct file extension based on format
            const extension = format === 'csv' ? 'csv' : 'xlsx';
            a.download = `${type}_sample_template.${extension}`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showMessage('Sample file downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading sample:', error);
            this.showMessage('Failed to download sample file', 'error');
        }
    }

    async handleImport(event) {
        event.preventDefault();
        
        if (this.isImporting) return;

        const form = event.target;
        const formData = new FormData();
        const importType = document.getElementById('import-type').value;
        const fileInput = document.getElementById('data-file');

        if (!fileInput.files[0]) {
            this.showMessage('Please select a file to import', 'error');
            return;
        }

        if (!importType) {
            this.showMessage('Please select a data type', 'error');
            return;
        }

        // Set loading state
        this.isImporting = true;
        this.setImportButtonState(true);

        formData.append('dataFile', fileInput.files[0]);
        formData.append('systemId', this.systemId);

        try {
            // Get token from localStorage - try multiple possible keys
            const token = localStorage.getItem('auth_token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('authToken');
                         
            if (!token) {
                this.showMessage('Authentication required. Please login again.', 'error');
                this.setImportButtonState(false);
                return;
            }

            const response = await fetch(`/api/import/import/${importType}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            // Show success message
            let message = `Import completed! Imported ${result.imported} records.`;
            if (result.errors > 0) {
                message += ` ${result.errors} records had errors.`;
            }
            if (result.duplicates > 0) {
                message += ` ${result.duplicates} duplicate records were ignored.`;
            }

            this.showImportResult(result);
            this.loadImportHistory();
            
            // Reset form
            form.reset();

            // Trigger comprehensive data refresh in the app
            await this.refreshAppData();

        } catch (error) {
            console.error('Import error:', error);
            this.showMessage(`Import failed: ${error.message}`, 'error');
        } finally {
            this.isImporting = false;
            this.setImportButtonState(false);
        }
    }

    setImportButtonState(loading) {
        const btn = document.getElementById('import-btn');
        const textSpan = btn.querySelector('.btn-text');
        const spinnerSpan = btn.querySelector('.btn-spinner');

        if (loading) {
            btn.disabled = true;
            textSpan.style.display = 'none';
            spinnerSpan.style.display = 'inline';
        } else {
            btn.disabled = false;
            textSpan.style.display = 'inline';
            spinnerSpan.style.display = 'none';
        }
    }

    showImportResult(result) {
        const statusDiv = document.getElementById('import-status');
        const contentDiv = statusDiv.querySelector('.status-content');

        let statusClass = result.errors > 0 ? 'warning' : 'success';
        let statusIcon = result.errors > 0 ? '⚠️' : '✅';

        let html = `
            <div class="alert alert-${statusClass}">
                <h5>${statusIcon} Import Results</h5>
                <p><strong>Imported:</strong> ${result.imported} records</p>
                ${result.errors > 0 ? `<p><strong>Errors:</strong> ${result.errors} records</p>` : ''}
                ${result.duplicates > 0 ? `<p><strong>Duplicates Ignored:</strong> ${result.duplicates} records</p>` : ''}
                
                ${result.errorDetails && result.errorDetails.length > 0 ? `
                    <details>
                        <summary>Error Details</summary>
                        <ul>
                            ${result.errorDetails.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </details>
                ` : ''}
                
                ${result.historyId ? `
                    <div class="import-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <button type="button" class="btn-danger" onclick="dataImportManager.undoImport(${result.historyId})" 
                                style="font-size: 14px; padding: 8px 16px;">
                            🗑️ Undo This Import
                        </button>
                        <small style="display: block; margin-top: 8px; color: #666;">
                            This will permanently delete all ${result.imported} imported records
                        </small>
                    </div>
                ` : ''}
            </div>
        `;

        contentDiv.innerHTML = html;
        statusDiv.style.display = 'block';

        // Auto-hide after 10 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 10000);
    }

    showMessage(message, type = 'info') {
        // Create and show a temporary message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;

        const statusDiv = document.getElementById('import-status');
        const contentDiv = statusDiv.querySelector('.status-content');
        
        contentDiv.innerHTML = '';
        contentDiv.appendChild(messageDiv);
        statusDiv.style.display = 'block';

        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    async refreshAppData() {
        console.log('📊 Refreshing app data after import...');
        
        try {
            // Multiple approaches to refresh the app data
            
            // 1. If the main app has a loadDataRecords method, call it
            if (this.app && typeof this.app.loadDataRecords === 'function') {
                console.log('🔄 Calling app.loadDataRecords()');
                await this.app.loadDataRecords();
            }
            
            // 2. If the app has an updateDashboard method, call it
            if (this.app && typeof this.app.updateDashboard === 'function') {
                console.log('🔄 Calling app.updateDashboard()');
                await this.app.updateDashboard();
            }
            
            // 3. Trigger dashboard refresh event if available
            if (window.app && typeof window.app.refreshDashboard === 'function') {
                console.log('🔄 Calling window.app.refreshDashboard()');
                await window.app.refreshDashboard();
            }
            
            // 4. Dispatch a custom event for other components to listen to
            const refreshEvent = new CustomEvent('dataImported', {
                detail: { 
                    systemId: this.systemId,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(refreshEvent);
            console.log('📡 Dispatched dataImported event');
            
            // 5. Force reload of specific data sections
            await this.forceDataReload();
            
            console.log('✅ App data refresh completed');
            
        } catch (error) {
            console.error('❌ Error refreshing app data:', error);
        }
    }

    async forceDataReload() {
        // Force reload of key data sections by triggering their refresh methods
        try {
            // Reload nutrients data
            if (window.location.hash === '#dashboard' || window.location.hash === '') {
                // If we're on dashboard, refresh the charts and data
                const nutrientCharts = document.querySelectorAll('[id*="nutrient"], [id*="chart"]');
                console.log(`🔄 Found ${nutrientCharts.length} chart elements to potentially refresh`);
                
                // Trigger chart refresh if available
                if (window.refreshCharts && typeof window.refreshCharts === 'function') {
                    await window.refreshCharts();
                }
                
                // Refresh any visible data tables or lists
                const dataTables = document.querySelectorAll('.data-history-list, .metrics-list, .nutrient-list');
                dataTables.forEach(table => {
                    if (table.dataset.refresh && typeof window[table.dataset.refresh] === 'function') {
                        window[table.dataset.refresh]();
                    }
                });
            }
            
            // Show a subtle notification that data has been refreshed
            setTimeout(() => {
                this.showMessage('Data successfully imported and dashboard updated', 'success');
            }, 500);
            
        } catch (error) {
            console.error('❌ Error in forceDataReload:', error);
        }
    }

    async loadImportHistory() {
        try {
            // Get token for API call
            const token = localStorage.getItem('auth_token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('authToken');
                         
            if (!token) return;

            const response = await fetch(`/api/import/history/${this.systemId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load import history');
            }

            const result = await response.json();
            this.displayImportHistory(result.data || []);

        } catch (error) {
            console.error('Error loading import history:', error);
            this.displayImportHistory([]);
        }
    }

    displayImportHistory(history) {
        const historyContainer = document.getElementById('import-history');
        if (!historyContainer) return;

        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="text-muted">No recent imports found.</p>';
            return;
        }

        const historyHtml = history.map(item => {
            const date = new Date(item.import_date).toLocaleString();
            const typeIcon = this.getImportTypeIcon(item.import_type);
            const statusClass = item.records_errors > 0 ? 'warning' : 'success';
            
            return `
                <div class="import-history-item">
                    <div class="import-info">
                        <div class="import-header">
                            <span class="import-type">${typeIcon} ${this.formatImportType(item.import_type)}</span>
                            <span class="import-date">${date}</span>
                        </div>
                        <div class="import-details">
                            <span class="file-name">📄 ${item.file_name}</span>
                        </div>
                        <div class="import-stats">
                            <span class="stat-item success">✅ ${item.records_imported}</span>
                            ${item.records_errors > 0 ? `<span class="stat-item error">❌ ${item.records_errors}</span>` : ''}
                            ${item.records_duplicates > 0 ? `<span class="stat-item warning">🔄 ${item.records_duplicates}</span>` : ''}
                        </div>
                        ${item.records_imported > 0 ? `
                            <div class="import-actions">
                                <button type="button" class="btn-danger btn-sm" 
                                        onclick="dataImportManager.undoImport(${item.id})"
                                        title="Delete all ${item.records_imported} records from this import">
                                    🗑️ Delete Import
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        historyContainer.innerHTML = historyHtml;
    }

    getImportTypeIcon(type) {
        switch (type) {
            case 'water_nutrients': return '💧🧪';
            case 'nutrients': return '🧪';
            case 'water_quality': return '💧';
            case 'fish_health': return '🐟';
            default: return '📊';
        }
    }

    formatImportType(type) {
        switch (type) {
            case 'water_nutrients': return 'Water Quality & Nutrients';
            case 'nutrients': return 'Nutrient Data';
            case 'water_quality': return 'Water Quality';
            case 'fish_health': return 'Fish Health';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    async undoImport(historyId) {
        // Show custom confirmation dialog using standard app styling
        const confirmed = await this.showConfirmationDialog(
            'Delete Import',
            'Are you sure you want to delete this import?',
            'This will permanently delete all imported records and cannot be undone.'
        );
        
        if (!confirmed) return;

        try {
            // Get token for API call
            const token = localStorage.getItem('auth_token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('authToken');
                         
            if (!token) {
                this.showMessage('Authentication required. Please login again.', 'error');
                return;
            }

            // Show loading message
            this.showMessage('Deleting import...', 'info');

            const response = await fetch(`/api/import/undo/${historyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete import');
            }

            // Show success message
            this.showMessage(
                `Import deleted successfully! Removed ${result.deletedRecords} records.`, 
                'success'
            );

            // Refresh import history to remove the deleted import
            await this.loadImportHistory();

            // Refresh app data since we removed data
            await this.refreshAppData();

        } catch (error) {
            console.error('Error deleting import:', error);
            this.showMessage(`Failed to delete import: ${error.message}`, 'error');
        }
    }

    showConfirmationDialog(title, message, description) {
        return new Promise((resolve) => {
            // Create modal backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create modal dialog
            const modal = document.createElement('div');
            modal.className = 'confirmation-modal';
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                animation: modalFadeIn 0.2s ease;
            `;

            modal.innerHTML = `
                <div class="modal-header">
                    <h4 style="margin: 0 0 1rem 0; color: #dc3545; font-weight: 600;">
                        🗑️ ${title}
                    </h4>
                </div>
                <div class="modal-body">
                    <p style="margin: 0 0 0.5rem 0; font-weight: 500; color: #333;">
                        ${message}
                    </p>
                    <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.9rem;">
                        ${description}
                    </p>
                </div>
                <div class="modal-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                    <button type="button" class="btn-secondary" id="cancel-btn">
                        Cancel
                    </button>
                    <button type="button" class="btn-danger" id="confirm-btn">
                        Delete Import
                    </button>
                </div>
            `;

            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);

            // Add animation keyframes
            if (!document.querySelector('#modal-animations')) {
                const style = document.createElement('style');
                style.id = 'modal-animations';
                style.textContent = `
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: scale(0.9) translateY(-20px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }

            // Handle button clicks
            const cancelBtn = modal.querySelector('#cancel-btn');
            const confirmBtn = modal.querySelector('#confirm-btn');

            const cleanup = () => {
                document.body.removeChild(backdrop);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    cleanup();
                    resolve(false);
                }
            });

            // Close on Escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    }
}

// CSS styles for the import manager
const styles = `
<style>
.data-import-section {
    max-width: 1200px;
    margin: 0 auto;
}

.import-export-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

@media (max-width: 768px) {
    .import-export-grid {
        grid-template-columns: 1fr;
    }
}

.sample-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.sample-buttons button {
    text-align: left;
    padding: 0.75rem;
    border-radius: 6px;
}

.template-section {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--bg-tertiary, #f8f9fa);
    border-radius: 6px;
}

.template-section.featured {
    background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
    border: 2px solid var(--primary-color, #0051b1);
    padding: 1rem;
}

.template-section h6 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #333);
    font-weight: 600;
}

.template-description {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    margin: 0 0 0.75rem 0;
    font-style: italic;
}

.button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.import-form .form-group {
    margin-bottom: 1rem;
}

.import-status {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    background-color: var(--bg-secondary);
}

.spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.alert {
    padding: 0.75rem;
    margin-bottom: 1rem;
    border: 1px solid;
    border-radius: 6px;
}

.alert-success {
    color: #155724;
    background-color: #d4edda;
    border-color: #c3e6cb;
}

.alert-warning {
    color: #856404;
    background-color: #fff3cd;
    border-color: #ffeaa7;
}

.alert-error {
    color: #721c24;
    background-color: #f8d7da;
    border-color: #f5c6cb;
}

.alert-info {
    color: #0c5460;
    background-color: #d1ecf1;
    border-color: #bee5eb;
}

details {
    margin-top: 0.5rem;
}

details ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

details li {
    margin-bottom: 0.25rem;
}

.import-history-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 6px;
    border-left: 4px solid var(--primary-color, #0051b1);
}

.import-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
}

.import-type {
    font-weight: 500;
    color: var(--text-primary, #333);
}

.import-date {
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
}

.import-details {
    margin-bottom: 0.5rem;
}

.file-name {
    font-size: 0.85rem;
    color: var(--text-secondary, #666);
}

.import-stats {
    display: flex;
    gap: 0.75rem;
}

.stat-item {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
}

.stat-item.success {
    color: #155724;
    background-color: #d4edda;
}

.stat-item.error {
    color: #721c24;
    background-color: #f8d7da;
}

.stat-item.warning {
    color: #856404;
    background-color: #fff3cd;
}

.import-actions {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.btn-danger {
    background-color: #dc3545;
    color: white;
    border: 1px solid #dc3545;
    border-radius: 4px;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-danger:hover {
    background-color: #c82333;
    border-color: #bd2130;
}

.btn-danger.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}

.btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
`;

// Add styles to head
if (!document.querySelector('#data-import-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'data-import-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
}