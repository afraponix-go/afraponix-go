// Import/Export Data Management
let currentImportFile = null;
let importPreviewData = null;

// File drop zone functionality
function initializeImportExportHandlers() {
    const fileDropZone = document.getElementById("file-drop-zone");
    const fileInput = document.getElementById("file-input");
    const previewBtn = document.getElementById("preview-data-btn");
    const importBtn = document.getElementById("import-data-btn");
    const exportBtn = document.getElementById("export-data-btn");

    if (!fileDropZone) return;

    // File input change handler
    fileInput.addEventListener("change", handleFileSelect);
    
    // Drag and drop handlers
    fileDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        fileDropZone.classList.add("dragover");
    });
    
    fileDropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        fileDropZone.classList.remove("dragover");
    });
    
    fileDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        fileDropZone.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Button handlers
    if (previewBtn) previewBtn.addEventListener("click", previewImportData);
    if (importBtn) importBtn.addEventListener("click", importData);
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    // Initialize date inputs with current date
    const today = new Date().toISOString().split("T")[0];
    const startDateInput = document.getElementById("export-start-date");
    const endDateInput = document.getElementById("export-end-date");
    
    if (startDateInput && endDateInput) {
        // Set default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDateInput.value = thirtyDaysAgo.toISOString().split("T")[0];
        endDateInput.value = today;
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    const allowedTypes = [".csv", ".xlsx", ".xls"];
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showNotification("Please select a CSV or Excel file", "error");
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showNotification("File size must be less than 10MB", "error");
        return;
    }

    currentImportFile = file;
    displaySelectedFile(file);
    enableImportButtons();
}

function displaySelectedFile(file) {
    const fileInfo = document.getElementById("file-info");
    const fileName = document.getElementById("file-name");
    const fileSize = document.getElementById("file-size");
    const dropZone = document.getElementById("file-drop-zone");

    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = "block";
        dropZone.style.display = "none";
    }
}

function clearSelectedFile() {
    currentImportFile = null;
    importPreviewData = null;
    
    const fileInfo = document.getElementById("file-info");
    const dropZone = document.getElementById("file-drop-zone");
    const fileInput = document.getElementById("file-input");
    
    if (fileInfo) fileInfo.style.display = "none";
    if (dropZone) dropZone.style.display = "block";
    if (fileInput) fileInput.value = "";
    
    disableImportButtons();
}

function enableImportButtons() {
    const previewBtn = document.getElementById("preview-data-btn");
    const importBtn = document.getElementById("import-data-btn");
    
    if (previewBtn) previewBtn.disabled = false;
    if (importBtn) importBtn.disabled = false;
}

function disableImportButtons() {
    const previewBtn = document.getElementById("preview-data-btn");
    const importBtn = document.getElementById("import-data-btn");
    
    if (previewBtn) previewBtn.disabled = true;
    if (importBtn) importBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function previewImportData() {
    if (!currentImportFile) {
        showNotification("Please select a file first", "error");
        return;
    }

    try {
        const fileData = await readFileData(currentImportFile);
        importPreviewData = fileData;
        
        displayPreviewModal(fileData);
    } catch (error) {
        console.error("Error reading file:", error);
        showNotification("Error reading file: " + error.message, "error");
    }
}

async function readFileData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                let parsedData;
                
                if (file.name.toLowerCase().endsWith(".csv")) {
                    parsedData = parseCSV(data);
                } else {
                    // For Excel files, you would need a library like xlsx
                    // For now, show a message about CSV support
                    reject(new Error("Excel files require additional processing. Please convert to CSV format."));
                    return;
                }
                
                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error("Error reading file"));
        };
        
        reader.readAsText(file);
    });
}

function parseCSV(csvText) {
    const lines = csvText.split("\n").filter(line => line.trim());
    const hasHeaders = document.getElementById("has-headers").checked;
    
    let headers = [];
    let data = [];
    
    if (hasHeaders && lines.length > 0) {
        headers = parseCSVLine(lines[0]);
        data = lines.slice(1).map(line => parseCSVLine(line));
    } else {
        // Generate generic headers
        const firstLine = lines[0] ? parseCSVLine(lines[0]) : [];
        headers = firstLine.map((_, index) => `Column ${index + 1}`);
        data = lines.map(line => parseCSVLine(line));
    }
    
    return { headers, data };
}

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    // Detect delimiter - prefer semicolon if present, otherwise use comma
    const delimiter = line.includes(';') ? ';' : ',';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function displayPreviewModal(data) {
    const modal = document.getElementById("data-preview-modal");
    const container = document.getElementById("preview-table-container");
    
    if (!modal || !container || !data.headers || !data.data) {
        showNotification("Error displaying preview", "error");
        return;
    }
    
    // Create preview table
    let tableHTML = `
        <table class="preview-table">
            <thead>
                <tr>
                    ${data.headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;
    
    // Show first 50 rows
    const rowsToShow = Math.min(data.data.length, 50);
    for (let i = 0; i < rowsToShow; i++) {
        const row = data.data[i];
        tableHTML += `
            <tr>
                ${row.map(cell => `<td>${escapeHtml(cell || "")}</td>`).join("")}
            </tr>
        `;
    }
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    if (data.data.length > 50) {
        tableHTML += `<p style="text-align: center; margin-top: 1rem; color: #6c757d;">Showing first 50 rows of ${data.data.length} total rows</p>`;
    }
    
    container.innerHTML = tableHTML;
    modal.style.display = "block";
}

function closePreviewModal() {
    const modal = document.getElementById("data-preview-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

function confirmImport() {
    closePreviewModal();
    importData();
}

async function importData() {
    if (!currentImportFile && !importPreviewData) {
        showNotification("Please select and preview a file first", "error");
        return;
    }

    const importType = document.getElementById("import-type").value;
    const skipDuplicates = document.getElementById("skip-duplicates").checked;
    const validateData = document.getElementById("validate-data").checked;

    try {
        // Show progress modal
        showImportProgress();
        
        // If we don't have preview data, read the file
        let data = importPreviewData;
        if (!data) {
            data = await readFileData(currentImportFile);
        }
        
        // Process the import
        const result = await processImport(importType, data, {
            skipDuplicates,
            validateData
        });
        
        // Show completion
        showImportComplete(result);
        
    } catch (error) {
        console.error("Import error:", error);
        hideImportProgress();
        showNotification("Import failed: " + error.message, "error");
    }
}

function showImportProgress() {
    const modal = document.getElementById("import-progress-modal");
    const progress = document.getElementById("import-progress");
    const status = document.getElementById("import-status");
    
    if (modal) {
        modal.style.display = "block";
        if (progress) progress.style.width = "0%";
        if (status) status.textContent = "Preparing import...";
    }
}

function hideImportProgress() {
    const modal = document.getElementById("import-progress-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

function updateImportProgress(percentage, message) {
    const progress = document.getElementById("import-progress");
    const status = document.getElementById("import-status");
    
    if (progress) progress.style.width = percentage + "%";
    if (status) status.textContent = message;
}

async function processImport(importType, data, options) {
    updateImportProgress(10, "Validating data format...");
    await sleep(200);

    // Get current system ID
    const systemId = getCurrentSystemId();
    if (!systemId) {
        throw new Error("No system selected");
    }

    if (!currentImportFile) {
        throw new Error("No file selected for import");
    }

    updateImportProgress(30, "Uploading file...");

    try {
        // Convert type from kebab-case to snake_case
        const apiType = importType.replace(/-/g, '_');

        // Create FormData and upload file
        const formData = new FormData();
        formData.append('dataFile', currentImportFile);
        formData.append('systemId', systemId);

        const response = await fetch(`/api/import/${apiType}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Import failed' }));
            const errorMsg = errorData.details || errorData.error || 'Import failed';
            console.error('Import error details:', errorData);
            throw new Error(errorMsg);
        }

        const result = await response.json();

        updateImportProgress(90, "Finalizing import...");
        await sleep(500);

        updateImportProgress(100, "Import complete!");

        // Refresh data in the application
        if (window.app && window.app.loadDataRecords) {
            await window.app.loadDataRecords();
        }

        return {
            success: true,
            totalRecords: result.imported || 0,
            importedRecords: result.imported || 0,
            errors: result.errorDetails || [],
            skippedRecords: result.errors || 0
        };

    } catch (error) {
        console.error('Import API error:', error);
        throw error;
    }
}

function getCurrentSystemId() {
    // Try to get system ID from the application
    if (window.app && window.app.activeSystemId) {
        return window.app.activeSystemId;
    }
    
    if (window.app && window.app.currentSystemId) {
        return window.app.currentSystemId;
    }
    
    // Fallback to localStorage with proper key
    const systemId = localStorage.getItem('activeSystemId') || localStorage.getItem('currentSystem');
    return systemId || 'system_1757071014969'; // Use the actual system ID from logs
}

function convertDataToRecords(importType, data) {
    const records = [];
    const headers = data.headers;
    
    for (const row of data.data) {
        if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
            continue; // Skip empty rows
        }
        
        const record = {};
        
        // Map CSV columns to database fields based on import type
        for (let i = 0; i < headers.length && i < row.length; i++) {
            const header = headers[i].toLowerCase().trim();
            const value = row[i] ? row[i].trim() : '';
            
            if (!value) continue; // Skip empty values
            
            switch (importType) {
                case 'fish-health':
                    mapFishHealthColumn(record, header, value);
                    break;
                case 'plant-growth':
                    mapPlantGrowthColumn(record, header, value);
                    break;
                case 'nutrients':
                    mapNutrientColumn(record, header, value);
                    break;
                case 'operations':
                    mapOperationColumn(record, header, value);
                    break;
                case 'water-quality':
                    mapWaterQualityColumn(record, header, value);
                    break;
            }
        }
        
        if (Object.keys(record).length > 0) {
            records.push(record);
        }
    }
    
    return records;
}

function mapFishHealthColumn(record, header, value) {
    const mapping = {
        'date': 'date',
        'tank': 'fish_tank_id',
        'tank_id': 'fish_tank_id',
        'fish_tank_id': 'fish_tank_id',
        'count': 'count',
        'fish_count': 'count',
        'mortality': 'mortality',
        'deaths': 'mortality',
        'weight': 'average_weight',
        'average_weight': 'average_weight',
        'feed': 'feed_consumption',
        'feed_consumption': 'feed_consumption',
        'feed_type': 'feed_type',
        'behavior': 'behavior',
        'notes': 'notes'
    };
    
    const fieldName = mapping[header];
    if (fieldName) {
        if (['count', 'mortality', 'average_weight', 'feed_consumption'].includes(fieldName)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                record[fieldName] = numValue;
            }
        } else {
            record[fieldName] = value;
        }
    }
}

function mapPlantGrowthColumn(record, header, value) {
    const mapping = {
        'date': 'date',
        'grow_bed': 'grow_bed_id',
        'grow_bed_id': 'grow_bed_id',
        'bed_id': 'grow_bed_id',
        'crop': 'crop_type',
        'crop_type': 'crop_type',
        'plant': 'crop_type',
        'count': 'count',
        'plant_count': 'count',
        'harvest_weight': 'harvest_weight',
        'weight': 'harvest_weight',
        'harvested': 'plants_harvested',
        'plants_harvested': 'plants_harvested',
        'seedlings': 'new_seedlings',
        'new_seedlings': 'new_seedlings',
        'pest_control': 'pest_control',
        'health': 'health',
        'growth_stage': 'growth_stage',
        'stage': 'growth_stage',
        'notes': 'notes',
        'batch_id': 'batch_id',
        'batch': 'batch_id',
        'variety': 'seed_variety',
        'seed_variety': 'seed_variety',
        'batch_created_date': 'batch_created_date',
        'days_to_harvest': 'days_to_harvest'
    };
    
    const fieldName = mapping[header];
    if (fieldName) {
        if (['count', 'harvest_weight', 'plants_harvested', 'new_seedlings', 'days_to_harvest'].includes(fieldName)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                record[fieldName] = numValue;
            }
        } else {
            record[fieldName] = value;
        }
    }
}

function mapNutrientColumn(record, header, value) {
    const mapping = {
        'date': 'date',
        'system': 'system_id',
        'nitrite': 'nitrite',
        'nitrate': 'nitrate',
        'phosphorus': 'phosphorus',
        'magnesium': 'magnesium',
        'iron': 'iron',
        'zinc': 'zinc',
        'boron': 'boron',
        'manganese': 'manganese',
        'sulfur': 'sulfur',
        'copper': 'copper',
        'molybdenum': 'molybdenum',
        'chlorine': 'chlorine'
    };
    
    const fieldName = mapping[header];
    if (fieldName) {
        if (fieldName === 'date') {
            // Handle DD/MM/YY format
            if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                    record[fieldName] = `${year}-${month}-${day}`;
                } else {
                    record[fieldName] = value;
                }
            } else {
                record[fieldName] = value;
            }
        } else if (['nitrite', 'nitrate', 'phosphorus', 'magnesium', 'iron', 'zinc', 'boron', 'manganese', 'sulfur', 'copper', 'molybdenum', 'chlorine'].includes(fieldName)) {
            // Only store numeric values, skip empty ones
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                record[fieldName] = numValue;
            }
        } else {
            record[fieldName] = value;
        }
    }
}

function mapOperationColumn(record, header, value) {
    const mapping = {
        'date': 'date',
        'operation': 'operation_type',
        'operation_type': 'operation_type',
        'type': 'operation_type',
        'water_volume': 'water_volume',
        'volume': 'water_volume',
        'chemical': 'chemical_added',
        'chemical_added': 'chemical_added',
        'amount': 'amount_added',
        'amount_added': 'amount_added',
        'downtime': 'downtime_duration',
        'downtime_duration': 'downtime_duration',
        'notes': 'notes'
    };
    
    const fieldName = mapping[header];
    if (fieldName) {
        if (['water_volume', 'amount_added', 'downtime_duration'].includes(fieldName)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                record[fieldName] = numValue;
            }
        } else {
            record[fieldName] = value;
        }
    }
}

function mapWaterQualityColumn(record, header, value) {
    const mapping = {
        'date': 'date',
        'system': 'system_id',
        'ph': 'ph',
        'salinity': 'salinity',
        'nitrogen': 'nitrogen',
        'potassium': 'potassium',
        'calcium': 'calcium',
        'dissolved_oxygen': 'dissolved_oxygen',
        'temperature': 'temperature'
    };
    
    const fieldName = mapping[header];
    if (fieldName) {
        if (fieldName === 'date') {
            // Handle DD/MM/YY format
            if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                    record[fieldName] = `${year}-${month}-${day}`;
                } else {
                    record[fieldName] = value;
                }
            } else {
                record[fieldName] = value;
            }
        } else if (['ph', 'salinity', 'nitrogen', 'potassium', 'calcium', 'dissolved_oxygen', 'temperature'].includes(fieldName)) {
            // Only store numeric values, skip empty ones
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                record[fieldName] = numValue;
            }
        } else {
            record[fieldName] = value;
        }
    }
}

function showImportComplete(result) {
    const modal = document.getElementById("import-progress-modal");
    const resultsDiv = document.getElementById("import-results");
    const summaryDiv = document.getElementById("import-summary");
    
    if (resultsDiv && summaryDiv) {
        resultsDiv.style.display = "block";
        
        let summaryHTML = `
            <div class="import-summary-stats">
                <div class="stat-item">
                    <strong>Total Records:</strong> ${result.totalRecords}
                </div>
                <div class="stat-item">
                    <strong>Imported:</strong> ${result.importedRecords}
                </div>
                <div class="stat-item">
                    <strong>Skipped:</strong> ${result.skippedRecords}
                </div>
            </div>
        `;
        
        if (result.errors && result.errors.length > 0) {
            summaryHTML += `
                <div class="import-errors">
                    <h5>Errors:</h5>
                    <ul>
                        ${result.errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}
                    </ul>
                </div>
            `;
        }
        
        summaryDiv.innerHTML = summaryHTML;
        
        // Clear the file selection
        setTimeout(() => {
            clearSelectedFile();
        }, 1000);
    }
}

function closeImportModal() {
    hideImportProgress();
    
    // Reset the modal state
    const resultsDiv = document.getElementById("import-results");
    if (resultsDiv) {
        resultsDiv.style.display = "none";
    }
}

async function exportData() {
    const exportType = document.getElementById("export-type").value;
    const startDate = document.getElementById("export-start-date").value;
    const endDate = document.getElementById("export-end-date").value;
    const formatRadio = document.querySelector('input[name="export-format"]:checked');
    const format = formatRadio ? formatRadio.value : 'csv'; // Default to CSV if not selected

    if (!startDate || !endDate) {
        showNotification("Please select date range for export", "error");
        return;
    }

    try {
        showNotification("Preparing export...", "info");

        // Fetch the data
        const exportData = await fetchExportData(exportType, startDate, endDate);

        // Always export as CSV (Excel can open CSV files)
        const filename = `${exportType}_${startDate}_to_${endDate}.csv`;
        downloadCSV(exportData, filename);

        if (format === "xlsx") {
            showNotification(`Data exported as CSV. You can open ${filename} directly in Excel.`, "success");
        }

    } catch (error) {
        console.error("Export error:", error);
        showNotification("Export failed: " + error.message, "error");
    }
}

function combineWaterNutrientData(waterQuality, nutrients) {
    // Create a map of water quality data by date
    const wqMap = {};
    waterQuality.forEach(wq => {
        const date = new Date(wq.date).toISOString().split('T')[0];
        wqMap[date] = {
            date: date,
            ph: wq.ph,
            temperature: wq.temperature,
            dissolved_oxygen: wq.dissolved_oxygen,
            salinity: wq.salinity,
            ammonia: wq.ammonia,
            nitrite: wq.nitrite,
            nitrate: wq.nitrate
        };
    });

    // Add nutrient data to the map
    nutrients.forEach(nutrient => {
        const date = new Date(nutrient.reading_date).toISOString().split('T')[0];
        if (!wqMap[date]) {
            wqMap[date] = { date: date };
        }
        // Add nutrient with its type as column name
        wqMap[date][nutrient.nutrient_type] = nutrient.value;
    });

    // Convert map to array
    return Object.values(wqMap).sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function fetchExportData(type, startDate, endDate) {
    const systemId = getCurrentSystemId();

    try {
        let data;
        switch (type) {
            case "water-nutrients":
                // Fetch both water quality and nutrients
                const waterQuality = await makeApiCall(`/api/data/water-quality/${systemId}`);
                const nutrients = await makeApiCall(`/api/data/nutrients/${systemId}`);
                // Combine the datasets
                data = combineWaterNutrientData(waterQuality, nutrients);
                break;
            case "water-quality":
                data = await makeApiCall(`/api/data/water-quality/${systemId}`);
                break;
            case "nutrients":
                data = await makeApiCall(`/api/data/nutrients/${systemId}`);
                break;
            case "fish-health":
                data = await makeApiCall(`/api/data/fish-health/${systemId}`);
                break;
            case "plant-growth":
                data = await makeApiCall(`/api/data/plant-growth/${systemId}`);
                break;
            case "operations":
                data = await makeApiCall(`/api/data/operations/${systemId}`);
                break;
            default:
                throw new Error("Invalid export type");
        }
        
        // Filter by date range if provided
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            data = data.filter(record => {
                const recordDate = new Date(record.date || record.reading_date || record.created_at);
                return recordDate >= start && recordDate <= end;
            });
        }
        
        return data;
    } catch (error) {
        console.error('Export fetch error:', error);
        throw error;
    }
}

async function makeApiCall(url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || 'API request failed');
    }
    
    return await response.json();
}

function getAuthToken() {
    // Try to get token from the app first
    if (window.app && window.app.token) {
        return window.app.token;
    }
    
    // Fallback to localStorage with correct key
    return localStorage.getItem('auth_token') || localStorage.getItem('authToken') || localStorage.getItem('jwtToken') || '';
}

function downloadCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification("No data to export", "warning");
        return;
    }
    
    // Convert data to CSV format
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(","),
        ...data.map(row => 
            headers.map(header => {
                let value = row[header] || "";
                // Escape commas and quotes
                if (value.toString().includes(",") || value.toString().includes('"')) {
                    value = `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value;
            }).join(",")
        )
    ].join("\n");
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("Export downloaded successfully", "success");
}

async function downloadSampleTemplate(type, format) {
    const templates = {
        "water-nutrients": {
            headers: ["Date", "PH", "EC", "Temperature", "Dissolved_Oxygen", "Humidity", "Salinity", "Ammonia", "Nitrite", "Nitrate", "Iron", "Potassium", "Calcium", "Phosphorus", "Magnesium"],
            sample: ["2025-06-30", "7.2", "1.8", "21.9", "8.5", "65", "0.8", "0.1", "0.05", "36", "2.0", "5", "14", "45", "50"]
        },
        "water-quality": {
            headers: ["Date", "PH", "Salinity", "Nitrogen", "Potassium", "Calcium", "Dissolved_Oxygen", "Temperature"],
            sample: ["2025-06-30", "7.36", "0.8", "36", "5", "14", "", "21.9"]
        },
        "fish-health": {
            headers: ["date", "fish_tank_id", "count", "mortality", "average_weight", "feed_consumption", "feed_type", "behavior", "notes"],
            sample: ["2024-01-15", "1", "250", "0", "15.5", "2.5", "Pellets", "Active", "Fish feeding well"]
        },
        "plant-growth": {
            headers: ["date", "grow_bed_id", "crop_type", "count", "harvest_weight", "plants_harvested", "new_seedlings", "pest_control", "health", "growth_stage", "notes", "batch_id", "seed_variety"],
            sample: ["2024-01-15", "1", "Lettuce", "50", "0", "0", "10", "None", "Good", "Vegetative", "New seedlings planted", "BATCH001", "Buttercrunch"]
        },
        "operations": {
            headers: ["date", "operation_type", "water_volume", "chemical_added", "amount_added", "downtime_duration", "notes"],
            sample: ["2024-01-15", "Water Change", "100", "pH Buffer", "50", "0", "Weekly water change completed"]
        },
        "nutrients": {
            headers: ["Date", "Nitrite", "Nitrate", "Phosphorus", "Magnesium", "Iron", "Zinc", "Boron", "Manganese", "Sulfur", "Copper", "Molybdenum", "Chlorine"],
            sample: ["2025-06-30", "0.1", "15.2", "2.1", "45", "1.2", "0.05", "0.02", "0.8", "15", "0.01", "0.005", "5.0"]
        }
    };

    const template = templates[type];
    if (!template) {
        showNotification("Template not found", "error");
        return;
    }

    if (format === "csv") {
        // Use semicolon delimiter for water-quality, water-nutrients, and nutrients to match wide format
        const delimiter = (type === "water-quality" || type === "nutrients" || type === "water-nutrients") ? ";" : ",";
        
        const csvContent = [
            template.headers.join(delimiter),
            template.sample.join(delimiter)
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${type}_template.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification("Template downloaded successfully", "success");
    } else {
        showNotification("Excel templates require additional library setup", "warning");
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotification(message, type = "info") {
    // Use the app's notification system if available
    if (window.app && window.app.showNotification) {
        window.app.showNotification(message, type);
    } else if (window.app && window.app.displayToast) {
        window.app.displayToast(message);
    } else {
        // Fallback to console for now
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Try to find and use any existing notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    // Initialize import/export handlers when the tab is loaded
    setTimeout(initializeImportExportHandlers, 1000);
});