const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init-mariadb');

// Helper function to format date as yyyy-mm-dd (ISO 8601 standard)
function formatDateToDDMMYY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${year}-${month}-${day}`;
}

// Helper function to parse date in multiple formats
function parseDDMMYYDate(dateStr) {
    if (typeof dateStr === 'number') {
        // Excel date serial number
        return new Date((dateStr - 25569) * 86400 * 1000);
    }

    if (typeof dateStr === 'string') {
        // Try ISO 8601 format with dashes: yyyy-mm-dd
        const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
            const [, year, month, day] = isoMatch;
            console.log(`📅 ISO format: ${year}-${month}-${day} = ${day}th ${getMonthName(parseInt(month))} ${year}`);
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
            return date;
        }

        // Try ISO 8601 format with slashes: yyyy/mm/dd
        const isoSlashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (isoSlashMatch) {
            const [, year, month, day] = isoSlashMatch;
            console.log(`📅 ISO format (slashes): ${year}/${month}/${day} = ${day}th ${getMonthName(parseInt(month))} ${year}`);
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
            return date;
        }

        // Try European format: dd/mm/yy or dd/mm/yyyy
        const euroMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (euroMatch) {
            let [, dayStr, monthStr, year] = euroMatch;

            // Convert 2-digit year to 4-digit (assume 20xx for years 00-50, 19xx for 51-99)
            if (year.length === 2) {
                const numYear = parseInt(year);
                year = numYear <= 50 ? `20${year}` : `19${year}`;
            }

            // ALWAYS interpret as European format: dd/mm/yyyy
            const day = parseInt(dayStr);
            const month = parseInt(monthStr);

            console.log(`📅 European format: ${dayStr}/${monthStr}/${year} = ${day}th ${getMonthName(month)} ${year}`);

            // Validate month and day ranges
            if (month < 1 || month > 12) {
                throw new Error(`Invalid month: ${month}. Expected 1-12. Format must be dd/mm/yy (European).`);
            }
            if (day < 1 || day > 31) {
                throw new Error(`Invalid day: ${day}. Expected 1-31. Format must be dd/mm/yy (European).`);
            }

            // Create date at noon to avoid timezone issues
            const date = new Date(parseInt(year), month - 1, day, 12, 0, 0);
            return date;
        }

        // Fallback to standard Date parsing
        return new Date(dateStr);
    }

    return new Date(dateStr);
}

// Helper function to get month name for logging
function getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept Excel and CSV files
        if (file.mimetype.includes('spreadsheet') || 
            file.mimetype === 'text/csv' ||
            file.originalname.match(/\.(xlsx|xls|csv)$/)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) and CSV files (.csv) are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Generate sample data file for download
router.get('/sample/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const { systemId, format } = req.query; // Added format parameter

        if (!systemId) {
            return res.status(400).json({ error: 'System ID is required' });
        }

        let sampleData = [];
        let filename = '';

        switch (type) {
            case 'water_nutrients':
                // Combined water quality and nutrients in one import file
                sampleData = [
                    ['Date', 'PH', 'EC', 'Temperature', 'Dissolved_Oxygen', 'Humidity', 'Salinity', 'Ammonia', 'Nitrite', 'Nitrate', 'Iron', 'Potassium', 'Calcium', 'Phosphorus', 'Magnesium'],
                    [formatDateToDDMMYY(new Date()), 7.2, 1.8, 21.9, 8.5, 65, 0.8, 0.1, 0.05, 36, 2.0, 5, 14, 45, 50],
                    [formatDateToDDMMYY(new Date(Date.now() - 86400000)), 7.4, 1.9, 22.1, 8.2, 68, 0.9, 0.12, 0.04, 38, 2.1, 6, 15, 48, 52]
                ];
                filename = format === 'csv' ? 'water_nutrients_import_sample.csv' : 'water_nutrients_import_sample.xlsx';
                break;

            case 'nutrients':
                sampleData = [
                    ['Date', 'Nitrite', 'Nitrate', 'Phosphorus', 'Magnesium', 'Iron', 'Zinc', 'Boron', 'Manganese', 'Sulfur', 'Copper', 'Molybdenum', 'Chlorine'],
                    [formatDateToDDMMYY(new Date()), 0.1, 15.2, 2.1, 45, 1.2, 0.05, 0.02, 0.8, 15, 0.01, 0.005, 5.0],
                    [formatDateToDDMMYY(new Date(Date.now() - 86400000)), 0.12, 16.5, 2.3, 48, 1.3, 0.06, 0.03, 0.9, 16, 0.012, 0.006, 5.5]
                ];
                filename = format === 'csv' ? 'nutrient_import_sample.csv' : 'nutrient_import_sample.xlsx';
                break;

            case 'water_quality':
                sampleData = [
                    ['Date', 'System', 'PH', 'Temperature', 'Dissolved_Oxygen', 'Ammonia', 'Nitrite', 'Nitrate', 'Salinity'],
                    [formatDateToDDMMYY(new Date()), systemId, 7.2, 21.9, 8.5, 0.1, 0.05, 10, 0.8],
                    [formatDateToDDMMYY(new Date(Date.now() - 86400000)), systemId, 7.4, 22.1, 8.2, 0.12, 0.04, 12, 0.9]
                ];
                filename = format === 'csv' ? 'water_quality_import_sample.csv' : 'water_quality_import_sample.xlsx';
                break;

            case 'fish_health':
                sampleData = [
                    ['Date', 'System', 'Tank_ID', 'Species', 'Quantity', 'Weight_kg', 'Feed_Amount', 'Mortality', 'Notes'],
                    [formatDateToDDMMYY(new Date()), systemId, 'Tank_1', 'Tilapia', 100, 25.5, 2.1, 0, 'Normal behavior'],
                    [formatDateToDDMMYY(new Date(Date.now() - 86400000)), systemId, 'Tank_1', 'Tilapia', 100, 25.8, 2.2, 1, 'One fish appeared lethargic']
                ];
                filename = format === 'csv' ? 'fish_health_import_sample.csv' : 'fish_health_import_sample.xlsx';
                break;

            default:
                return res.status(400).json({ error: 'Invalid sample type. Use: water_nutrients, nutrients, water_quality, or fish_health' });
        }

        if (format === 'csv') {
            // Generate CSV format
            const csvContent = sampleData
                .map(row => row.map(cell => 
                    // Escape cells containing commas, quotes, or newlines
                    typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
                        ? `"${cell.replace(/"/g, '""')}"` 
                        : cell
                ).join(','))
                .join('\n');

            // Set CSV response headers
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache');
            
            res.send(csvContent);
        } else {
            // Generate Excel format (existing logic)
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Data');

            // Generate Excel file buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            // Set response headers for download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(buffer);
        }

    } catch (error) {
        console.error('Error generating sample file:', error);
        res.status(500).json({ error: 'Failed to generate sample file' });
    }
});

// Import data from uploaded Excel file
router.post('/:type', authenticateToken, upload.single('dataFile'), async (req, res) => {
    try {
        const { type } = req.params;
        const { systemId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!systemId) {
            return res.status(400).json({ error: 'System ID is required' });
        }

        const pool = getDatabase();

        // Verify system exists and user has access
        const [systems] = await pool.execute(
            'SELECT * FROM systems WHERE id = ?',
            [systemId]
        );

        if (systems.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        // Parse file based on type
        let rawData;
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
            try {
                // Parse CSV file
                const csvContent = req.file.buffer.toString('utf-8');
                
                if (!csvContent || csvContent.trim().length === 0) {
                    return res.status(400).json({ 
                        error: 'CSV file is empty or contains no readable content',
                        details: 'Please ensure the file contains headers and data rows' 
                    });
                }
                
                const lines = csvContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                
                if (lines.length === 0) {
                    return res.status(400).json({ 
                        error: 'No valid data rows found in CSV file',
                        details: 'File appears to contain only empty lines' 
                    });
                }
                
                // Auto-detect delimiter from first line (header)
                let delimiter = ',';
                let detectedDelimiter = 'comma';
                if (lines.length > 0) {
                    const firstLine = lines[0];
                    const commaCount = (firstLine.match(/,/g) || []).length;
                    const semicolonCount = (firstLine.match(/;/g) || []).length;
                    
                    if (semicolonCount > commaCount) {
                        delimiter = ';';
                        detectedDelimiter = 'semicolon';
                        console.log('📝 Auto-detected semicolon delimiter');
                    } else {
                        console.log('📝 Auto-detected comma delimiter');
                    }
                    
                    // Validate that we found some delimiters
                    if (commaCount === 0 && semicolonCount === 0) {
                        return res.status(400).json({ 
                            error: 'No valid CSV delimiters found',
                            details: 'CSV file must use either commas (,) or semicolons (;) to separate columns. First line: ' + firstLine.substring(0, 100) + (firstLine.length > 100 ? '...' : '')
                        });
                    }
                }
                
                rawData = lines.map((line, lineIndex) => {
                    try {
                        // Simple CSV parsing with quote handling and auto-detected delimiter
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === delimiter && !inQuotes) {
                                result.push(isNaN(current) ? current : parseFloat(current) || current);
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(isNaN(current) ? current : parseFloat(current) || current);
                        return result;
                    } catch (parseError) {
                        throw new Error(`Line ${lineIndex + 1}: Failed to parse CSV line - ${parseError.message}`);
                    }
                });
                
                console.log(`📊 Parsed CSV: ${rawData.length} lines using ${detectedDelimiter} delimiter`);
                
            } catch (csvError) {
                console.error('CSV parsing error:', csvError);
                return res.status(400).json({ 
                    error: 'Failed to parse CSV file',
                    details: csvError.message 
                });
            }
        } else {
            // Parse Excel file
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }

        if (rawData.length < 2) {
            return res.status(400).json({ error: 'File must contain headers and at least one data row' });
        }

        const headers = rawData[0];
        const dataRows = rawData.slice(1).filter(row => row.length > 0);

        // Validate headers based on import type (System is optional since user already selected it)
        const requiredHeaders = {
            'water_nutrients': ['Date', 'PH'],
            'nutrients': ['Date', 'PH', 'Nitrate'],
            'water_quality': ['Date', 'PH', 'Temperature'],
            'fish_health': ['Date', 'Tank_ID', 'Species']
        };

        const expectedHeaders = requiredHeaders[type];
        if (expectedHeaders) {
            const missingHeaders = [];
            const headerLower = headers.map(h => String(h).toLowerCase());
            
            for (const required of expectedHeaders) {
                const found = headerLower.some(header => 
                    header.includes(required.toLowerCase()) || 
                    required.toLowerCase().includes(header)
                );
                if (!found) {
                    missingHeaders.push(required);
                }
            }
            
            if (missingHeaders.length > 0) {
                return res.status(400).json({
                    error: 'Missing required columns in CSV file',
                    details: `Missing headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`,
                    expectedHeaders: expectedHeaders,
                    foundHeaders: headers
                });
            }
            
            console.log(`✅ Header validation passed for ${type} import`);
        }

        // Validate data rows
        if (dataRows.length === 0) {
            return res.status(400).json({
                error: 'No data rows found',
                details: 'File contains headers but no data to import'
            });
        }

        // Check for consistent column count
        const headerCount = headers.length;
        const inconsistentRows = [];
        dataRows.forEach((row, index) => {
            if (row.length !== headerCount) {
                inconsistentRows.push({
                    rowNumber: index + 2, // +2 because index starts at 0 and we skip header
                    expected: headerCount,
                    found: row.length
                });
            }
        });

        if (inconsistentRows.length > 0) {
            return res.status(400).json({
                error: 'Inconsistent column count in data rows',
                details: `Expected ${headerCount} columns but found mismatches in ${inconsistentRows.length} rows`,
                examples: inconsistentRows.slice(0, 5), // Show first 5 problematic rows
                headers: headers
            });
        }

        console.log(`📊 Data validation passed: ${dataRows.length} rows, ${headerCount} columns each`);

        let importCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;
        const errors = [];

        // Generate unique import session ID for undo functionality
        const importSessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Process based on import type
        switch (type) {
            case 'water_nutrients':
                // Combined import - processes both water quality and nutrients
                await importWaterNutrientsData(pool, systemId, headers, dataRows, importSessionId, (count, errCount, dupCount, errs) => {
                    importCount = count;
                    errorCount = errCount;
                    duplicateCount = dupCount;
                    errors.push(...errs);
                });
                break;

            case 'nutrients':
                await importNutrientData(pool, systemId, headers, dataRows, importSessionId, (count, errCount, dupCount, errs) => {
                    importCount = count;
                    errorCount = errCount;
                    duplicateCount = dupCount;
                    errors.push(...errs);
                });
                break;

            case 'water_quality':
                await importWaterQualityData(pool, systemId, headers, dataRows, importSessionId, (count, errCount, dupCount, errs) => {
                    importCount = count;
                    errorCount = errCount;
                    duplicateCount = dupCount;
                    errors.push(...errs);
                });
                break;

            case 'fish_health':
                await importFishHealthData(pool, systemId, headers, dataRows, importSessionId, (count, errCount, dupCount, errs) => {
                    importCount = count;
                    errorCount = errCount;
                    duplicateCount = dupCount;
                    errors.push(...errs);
                });
                break;

            default:
                return res.status(400).json({ error: 'Invalid import type' });
        }

        // Log the import activity with session ID
        let historyId = null;
        try {
            const [historyResult] = await pool.execute(`
                INSERT INTO import_history 
                (system_id, import_type, file_name, records_imported, records_errors, records_duplicates, user_id, import_date, import_session_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            `, [
                systemId,
                type,
                req.file.originalname,
                importCount,
                errorCount,
                duplicateCount || 0,
                req.user.userId || req.user.id,
                importSessionId
            ]);
            historyId = historyResult.insertId;
        } catch (historyError) {
            console.log('⚠️ Failed to log import history:', historyError.message);
            // Don't fail the import if history logging fails
        }

        // Provide detailed success/warning response
        const response = {
            success: true,
            imported: importCount,
            errors: errorCount,
            duplicates: duplicateCount || 0,
            importSessionId: importSessionId,
            historyId: historyId,
            fileName: req.file.originalname,
            importType: type
        };

        if (errorCount === 0 && duplicateCount === 0) {
            response.message = `✅ Import completed successfully! ${importCount} records imported.`;
        } else if (errorCount > 0 && importCount > 0) {
            response.message = `⚠️ Import completed with warnings. ${importCount} records imported, ${errorCount} failed, ${duplicateCount || 0} duplicates skipped.`;
            response.errorDetails = errors.slice(0, 10); // Limit error details to first 10
            if (errors.length > 10) {
                response.moreErrors = `... and ${errors.length - 10} more errors`;
            }
        } else if (errorCount > 0 && importCount === 0) {
            response.success = false;
            response.message = `❌ Import failed. All ${errorCount} records had errors. No data was imported.`;
            response.errorDetails = errors.slice(0, 10);
            if (errors.length > 10) {
                response.moreErrors = `... and ${errors.length - 10} more errors`;
            }
        } else {
            response.message = `🔄 Import processed. ${duplicateCount || 0} duplicates were skipped.`;
        }

        console.log(`📋 Import summary: ${importCount} imported, ${errorCount} errors, ${duplicateCount || 0} duplicates`);
        res.json(response);

    } catch (error) {
        console.error('Import error:', error);
        
        // Provide more specific error messages based on error type
        let errorMessage = 'Import failed due to an unexpected error';
        let details = error.message;
        
        if (error.message.includes('ENOENT')) {
            errorMessage = 'File could not be read';
            details = 'The uploaded file appears to be corrupted or inaccessible';
        } else if (error.message.includes('database') || error.message.includes('mysql') || error.message.includes('pool')) {
            errorMessage = 'Database connection error';
            details = 'Unable to connect to the database. Please try again later.';
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
            errorMessage = 'Permission denied';
            details = 'You do not have permission to perform this import operation';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Import timed out';
            details = 'The import operation took too long. Try importing a smaller file or contact support.';
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            details: details,
            fileName: req.file ? req.file.originalname : 'unknown',
            importType: type || 'unknown'
        });
    }
});

// Helper function to import combined water quality and nutrients data
async function importWaterNutrientsData(pool, systemId, headers, dataRows, importSessionId, callback) {
    let importCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    // Create header mapping (case-insensitive, underscore-insensitive)
    const headerMap = {};
    headers.forEach((header, index) => {
        const cleanHeader = String(header).toLowerCase().trim().replace(/_/g, '');
        headerMap[cleanHeader] = index;
    });

    console.log('📋 Header mapping for water_nutrients:', headerMap);

    // Helper function to find column index by header name variations
    const findColumn = (variations) => {
        for (const variation of variations) {
            const cleanVariation = variation.toLowerCase().replace(/_/g, '');
            const index = headerMap[cleanVariation];
            if (index !== undefined) {
                console.log(`✅ Found column "${variation}" at index ${index}`);
                return index;
            }
        }
        return -1;
    };

    // Map column indices for both water quality and nutrients
    const dateIndex = findColumn(['date', 'reading_date', 'timestamp']);
    const systemIndex = findColumn(['system', 'system_id', 'system_name']);

    // Water quality parameters
    const phIndex = findColumn(['ph', 'pH']);
    const ecIndex = findColumn(['ec', 'electrical_conductivity', 'conductivity']);
    const temperatureIndex = findColumn(['temperature', 'temp', 'water_temp']);
    const doIndex = findColumn(['dissolved_oxygen', 'do', 'oxygen']);
    const humidityIndex = findColumn(['humidity', 'rh', 'relative_humidity']);
    const ammoniaIndex = findColumn(['ammonia', 'nh3']);
    const nitriteIndex = findColumn(['nitrite', 'no2']);
    const nitrateIndex = findColumn(['nitrate', 'no3', 'nitrogen']);
    const salinityIndex = findColumn(['salinity', 'salt']);

    // Additional nutrient parameters
    const ironIndex = findColumn(['iron', 'fe']);
    const potassiumIndex = findColumn(['potassium', 'k']);
    const calciumIndex = findColumn(['calcium', 'ca']);
    const phosphorusIndex = findColumn(['phosphorus', 'p']);
    const magnesiumIndex = findColumn(['magnesium', 'mg']);

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];

        try {
            // Parse date using dd/mm/yy format
            if (dateIndex === -1) {
                throw new Error('Date column not found in headers');
            }

            const dateValue = row[dateIndex];
            console.log(`📅 Parsing date from row ${rowIndex + 2}: "${dateValue}"`);
            const date = parseDDMMYYDate(dateValue);

            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date format: "${dateValue}". Use dd/mm/yy European format (e.g., 05/09/24 = 5th September 2024).`);
            }

            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
            console.log(`📅 Formatted date: ${formattedDate}`);

            // First, insert/update water quality record (master table)
            const [existingWQ] = await pool.execute(`
                SELECT id FROM water_quality
                WHERE system_id = ? AND date = ?
            `, [systemId, formattedDate]);

            if (existingWQ.length > 0) {
                // Update existing water quality record
                await pool.execute(`
                    UPDATE water_quality
                    SET ph = COALESCE(?, ph),
                        ec = COALESCE(?, ec),
                        temperature = COALESCE(?, temperature),
                        dissolved_oxygen = COALESCE(?, dissolved_oxygen),
                        humidity = COALESCE(?, humidity),
                        ammonia = COALESCE(?, ammonia),
                        nitrite = COALESCE(?, nitrite),
                        nitrate = COALESCE(?, nitrate),
                        iron = COALESCE(?, iron),
                        potassium = COALESCE(?, potassium),
                        calcium = COALESCE(?, calcium),
                        phosphorus = COALESCE(?, phosphorus),
                        magnesium = COALESCE(?, magnesium),
                        salinity = COALESCE(?, salinity)
                    WHERE id = ?
                `, [
                    phIndex >= 0 ? parseFloat(row[phIndex]) || null : null,
                    ecIndex >= 0 ? parseFloat(row[ecIndex]) || null : null,
                    temperatureIndex >= 0 ? parseFloat(row[temperatureIndex]) || null : null,
                    doIndex >= 0 ? parseFloat(row[doIndex]) || null : null,
                    humidityIndex >= 0 ? parseFloat(row[humidityIndex]) || null : null,
                    ammoniaIndex >= 0 ? parseFloat(row[ammoniaIndex]) || null : null,
                    nitriteIndex >= 0 ? parseFloat(row[nitriteIndex]) || null : null,
                    nitrateIndex >= 0 ? parseFloat(row[nitrateIndex]) || null : null,
                    ironIndex >= 0 ? parseFloat(row[ironIndex]) || null : null,
                    potassiumIndex >= 0 ? parseFloat(row[potassiumIndex]) || null : null,
                    calciumIndex >= 0 ? parseFloat(row[calciumIndex]) || null : null,
                    phosphorusIndex >= 0 ? parseFloat(row[phosphorusIndex]) || null : null,
                    magnesiumIndex >= 0 ? parseFloat(row[magnesiumIndex]) || null : null,
                    salinityIndex >= 0 ? parseFloat(row[salinityIndex]) || null : null,
                    existingWQ[0].id
                ]);
                duplicateCount++;
                console.log(`🔄 Updated existing water quality record for ${formattedDate}`);
            } else {
                // Insert new water quality record
                await pool.execute(`
                    INSERT INTO water_quality
                    (system_id, date, ph, ec, temperature, dissolved_oxygen, humidity, ammonia, nitrite, nitrate, iron, potassium, calcium, phosphorus, magnesium, salinity, source, import_session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    systemId,
                    formattedDate,
                    phIndex >= 0 ? parseFloat(row[phIndex]) || null : null,
                    ecIndex >= 0 ? parseFloat(row[ecIndex]) || null : null,
                    temperatureIndex >= 0 ? parseFloat(row[temperatureIndex]) || null : null,
                    doIndex >= 0 ? parseFloat(row[doIndex]) || null : null,
                    humidityIndex >= 0 ? parseFloat(row[humidityIndex]) || null : null,
                    ammoniaIndex >= 0 ? parseFloat(row[ammoniaIndex]) || null : null,
                    nitriteIndex >= 0 ? parseFloat(row[nitriteIndex]) || null : null,
                    nitrateIndex >= 0 ? parseFloat(row[nitrateIndex]) || null : null,
                    ironIndex >= 0 ? parseFloat(row[ironIndex]) || null : null,
                    potassiumIndex >= 0 ? parseFloat(row[potassiumIndex]) || null : null,
                    calciumIndex >= 0 ? parseFloat(row[calciumIndex]) || null : null,
                    phosphorusIndex >= 0 ? parseFloat(row[phosphorusIndex]) || null : null,
                    magnesiumIndex >= 0 ? parseFloat(row[magnesiumIndex]) || null : null,
                    salinityIndex >= 0 ? parseFloat(row[salinityIndex]) || null : null,
                    'import',
                    importSessionId
                ]);
                importCount++;
                console.log(`✅ Inserted new water quality record for ${formattedDate}`);
            }

            // Note: iron, potassium, calcium, phosphorus, and magnesium are now stored directly in water_quality table
            // No need to insert them into nutrient_readings separately

            // If there are any other nutrients in the future that don't belong in water_quality, add them here
            const additionalNutrients = [];

            for (const nutrient of additionalNutrients) {
                if (nutrient.value !== null && !isNaN(nutrient.value) && nutrient.value !== undefined && nutrient.value !== '') {
                    console.log(`💾 Importing additional nutrient ${nutrient.type}: ${nutrient.value}`);

                    // Check for duplicate nutrient entry
                    const [existingNutrient] = await pool.execute(`
                        SELECT id FROM nutrient_readings
                        WHERE system_id = ? AND nutrient_type = ? AND reading_date = ?
                    `, [systemId, nutrient.type, formattedDate]);

                    if (existingNutrient.length === 0) {
                        await pool.execute(`
                            INSERT INTO nutrient_readings
                            (system_id, nutrient_type, value, unit, reading_date, source, notes, import_session_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            systemId,
                            nutrient.type,
                            nutrient.value,
                            nutrient.unit,
                            formattedDate,
                            'import',
                            'Imported with water quality data',
                            importSessionId
                        ]);
                        importCount++;
                        console.log(`✅ Inserted nutrient reading for ${nutrient.type}`);
                    } else {
                        console.log(`⏭️  Skipping duplicate nutrient ${nutrient.type}`);
                    }
                }
            }

        } catch (error) {
            errorCount++;
            errors.push(`Row ${rowIndex + 2}: ${error.message}`);
            console.error(`❌ Error processing row ${rowIndex + 2}:`, error.message);
        }
    }

    callback(importCount, errorCount, duplicateCount, errors);
}

// Helper function to import nutrient data
async function importNutrientData(pool, systemId, headers, dataRows, importSessionId, callback) {
    let importCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    // Create header mapping (case-insensitive)
    const headerMap = {};
    headers.forEach((header, index) => {
        const cleanHeader = String(header).toLowerCase().trim();
        headerMap[cleanHeader] = index;
    });

    console.log('📋 Header mapping for nutrients:', headerMap);

    // Helper function to find column index by header name variations
    const findColumn = (variations) => {
        for (const variation of variations) {
            const index = headerMap[variation.toLowerCase()];
            if (index !== undefined) {
                console.log(`✅ Found column "${variation}" at index ${index}`);
                return index;
            }
        }
        console.log(`❌ Column not found for variations: ${variations.join(', ')}`);
        return -1;
    };

    // Map column indices
    const dateIndex = findColumn(['date', 'reading_date', 'timestamp']);
    const systemIndex = findColumn(['system', 'system_id', 'system_name']);
    const phIndex = findColumn(['ph', 'pH']);
    const salinityIndex = findColumn(['salinity', 'salt']);
    const nitrateIndex = findColumn(['nitrate', 'nitrogen', 'no3']);
    const potassiumIndex = findColumn(['potassium', 'k']);
    const calciumIndex = findColumn(['calcium', 'ca']);
    const doIndex = findColumn(['dissolved_oxygen', 'do', 'oxygen']);
    const temperatureIndex = findColumn(['temperature', 'temp', 'water_temp']);

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        
        try {
            // Parse date using dd/mm/yy format
            if (dateIndex === -1) {
                throw new Error('Date column not found in headers');
            }
            
            const dateValue = row[dateIndex];
            console.log(`📅 Parsing date from row ${rowIndex + 2}: "${dateValue}"`);
            const date = parseDDMMYYDate(dateValue);
            
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date format: "${dateValue}". Use dd/mm/yy European format (e.g., 05/09/24 = 5th September 2024, 09/05/24 = 9th May 2024).`);
            }

            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
            console.log(`📅 Formatted date: ${formattedDate}`);

            // Extract nutrient values using header mapping
            const nutrientValues = [
                { type: 'ph', value: phIndex >= 0 ? parseFloat(row[phIndex]) : null, unit: 'pH', index: phIndex },
                { type: 'salinity', value: salinityIndex >= 0 ? parseFloat(row[salinityIndex]) : null, unit: 'ppt', index: salinityIndex },
                { type: 'nitrogen', value: nitrateIndex >= 0 ? parseFloat(row[nitrateIndex]) : null, unit: 'ppm', index: nitrateIndex }, // Column is Nitrate but stored as nitrogen
                { type: 'potassium', value: potassiumIndex >= 0 ? parseFloat(row[potassiumIndex]) : null, unit: 'ppm', index: potassiumIndex },
                { type: 'calcium', value: calciumIndex >= 0 ? parseFloat(row[calciumIndex]) : null, unit: 'ppm', index: calciumIndex },
                { type: 'dissolved_oxygen', value: doIndex >= 0 ? parseFloat(row[doIndex]) : null, unit: 'mg/L', index: doIndex },
                { type: 'temperature', value: temperatureIndex >= 0 ? parseFloat(row[temperatureIndex]) : null, unit: '°C', index: temperatureIndex }
            ];

            console.log(`📊 Row ${rowIndex + 2} nutrient values:`, nutrientValues.map(n => `${n.type}: ${n.value} (col ${n.index})`).join(', '));

            // Insert each valid nutrient reading
            for (const nutrient of nutrientValues) {
                if (nutrient.value !== null && !isNaN(nutrient.value) && nutrient.value !== undefined && nutrient.value !== '') {
                    console.log(`💾 Importing ${nutrient.type}: ${nutrient.value}`);
                    // Check for duplicate entry
                    const [existing] = await pool.execute(`
                        SELECT id FROM nutrient_readings 
                        WHERE system_id = ? AND nutrient_type = ? AND reading_date = ?
                    `, [systemId, nutrient.type, formattedDate]);

                    if (existing.length > 0) {
                        duplicateCount++;
                    } else {
                        await pool.execute(`
                            INSERT INTO nutrient_readings 
                            (system_id, nutrient_type, value, unit, reading_date, source, notes, import_session_id) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            systemId,
                            nutrient.type,
                            nutrient.value,
                            nutrient.unit,
                            formattedDate,
                            'import',
                            'Imported from file',
                            importSessionId
                        ]);
                        importCount++;
                    }
                } else if (nutrient.index >= 0) {
                    console.log(`⏭️  Skipping ${nutrient.type}: invalid value "${row[nutrient.index]}" (null, empty, or NaN)`);
                }
            }

        } catch (error) {
            errorCount++;
            errors.push(`Row ${rowIndex + 2}: ${error.message}`);
        }
    }

    callback(importCount, errorCount, duplicateCount, errors);
}

// Helper function to import water quality data
async function importWaterQualityData(pool, systemId, headers, dataRows, importSessionId, callback) {
    let importCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        
        try {
            // Parse date using dd/mm/yy format
            const date = parseDDMMYYDate(row[0]);
            
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format. Use dd/mm/yy European format (e.g., 05/09/24 = 5th September 2024, 09/05/24 = 9th May 2024).');
            }

            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');

            // Check for duplicate entry
            const [existing] = await pool.execute(`
                SELECT id FROM water_quality 
                WHERE system_id = ? AND date = ?
            `, [systemId, formattedDate]);

            if (existing.length > 0) {
                duplicateCount++;
            } else {
                await pool.execute(`
                    INSERT INTO water_quality
                    (system_id, date, ph, temperature, dissolved_oxygen, ammonia, nitrite, nitrate, salinity, source, import_session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    systemId,
                    formattedDate,
                    isNaN(parseFloat(row[2])) ? null : parseFloat(row[2]),
                    isNaN(parseFloat(row[3])) ? null : parseFloat(row[3]),
                    isNaN(parseFloat(row[4])) ? null : parseFloat(row[4]),
                    isNaN(parseFloat(row[5])) ? null : parseFloat(row[5]),
                    isNaN(parseFloat(row[6])) ? null : parseFloat(row[6]),
                    isNaN(parseFloat(row[7])) ? null : parseFloat(row[7]),
                    isNaN(parseFloat(row[8])) ? null : parseFloat(row[8]),
                    'import',
                    importSessionId
                ]);
                importCount++;
            }

        } catch (error) {
            errorCount++;
            errors.push(`Row ${rowIndex + 2}: ${error.message}`);
        }
    }

    callback(importCount, errorCount, duplicateCount, errors);
}

// Helper function to import fish health data
async function importFishHealthData(pool, systemId, headers, dataRows, importSessionId, callback) {
    let importCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        
        try {
            // Parse date using dd/mm/yy format
            const date = parseDDMMYYDate(row[0]);
            
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format. Use dd/mm/yy European format (e.g., 05/09/24 = 5th September 2024, 09/05/24 = 9th May 2024).');
            }

            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');

            // Resolve the tank by its number (CSV holds e.g. "Tank_1", "Tank 1" or "1").
            const tankNum = parseInt(String(row[2] ?? '').replace(/\D/g, ''), 10);
            let fishTankId = null;
            if (!isNaN(tankNum)) {
                const [tanks] = await pool.execute(
                    'SELECT id FROM fish_tanks WHERE system_id = ? AND tank_number = ? LIMIT 1',
                    [systemId, tankNum]
                );
                if (tanks.length > 0) fishTankId = tanks[0].id;
            }

            // Check for duplicate entry (same tank + date)
            const [existing] = await pool.execute(`
                SELECT id FROM fish_health
                WHERE system_id = ? AND date = ? AND (fish_tank_id <=> ?)
            `, [systemId, formattedDate, fishTankId]);

            if (existing.length > 0) {
                duplicateCount++;
            } else {
                // CSV columns: [date, system, tank, species, quantity, weight, feed, mortality, notes].
                // The schema has no species/source columns, so fold species into notes.
                const species = String(row[3] ?? '').trim();
                const note = [species ? `Species: ${species}` : '', row[8] || ''].filter(Boolean).join(' — ') || null;
                await pool.execute(`
                    INSERT INTO fish_health
                    (system_id, fish_tank_id, date, count, average_weight, feed_consumption, mortality, notes, import_session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    systemId,
                    fishTankId,
                    formattedDate,
                    isNaN(parseInt(row[4])) ? null : parseInt(row[4]),
                    isNaN(parseFloat(row[5])) ? null : parseFloat(row[5]),
                    isNaN(parseFloat(row[6])) ? null : parseFloat(row[6]),
                    isNaN(parseInt(row[7])) ? null : parseInt(row[7]),
                    note,
                    importSessionId
                ]);
                importCount++;
            }

        } catch (error) {
            errorCount++;
            errors.push(`Row ${rowIndex + 2}: ${error.message}`);
        }
    }

    callback(importCount, errorCount, duplicateCount, errors);
}

// Get import history for a system
router.get('/history/:systemId', authenticateToken, async (req, res) => {
    try {
        const { systemId } = req.params;
        const pool = getDatabase();

        const [history] = await pool.execute(`
            SELECT 
                id,
                import_type,
                file_name,
                records_imported,
                records_errors,
                records_duplicates,
                import_date,
                (records_imported + records_errors + records_duplicates) as total_records
            FROM import_history 
            WHERE system_id = ? 
            ORDER BY import_date DESC 
            LIMIT 10
        `, [systemId]);

        res.json({ success: true, data: history });

    } catch (error) {
        console.error('Error fetching import history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch import history', 
            details: error.message 
        });
    }
});

// Delete/Undo import endpoint
router.delete('/undo/:historyId', authenticateToken, async (req, res) => {
    try {
        const { historyId } = req.params;
        const pool = getDatabase();

        // Get import details
        const [importDetails] = await pool.execute(
            'SELECT * FROM import_history WHERE id = ?',
            [historyId]
        );

        if (importDetails.length === 0) {
            return res.status(404).json({ error: 'Import not found' });
        }

        const importRecord = importDetails[0];
        const { import_session_id, import_type } = importRecord;

        // Every import type tags its rows with import_session_id, so remove them
        // from each table an import can write to.
        let recordsDeleted = 0;
        for (const table of ['nutrient_readings', 'water_quality', 'fish_health']) {
            const [del] = await pool.execute(
                `DELETE FROM ${table} WHERE import_session_id = ?`,
                [import_session_id]
            );
            recordsDeleted += del.affectedRows;
        }

        // Delete the import history record
        await pool.execute(
            'DELETE FROM import_history WHERE id = ?',
            [historyId]
        );

        res.json({
            success: true,
            message: `Successfully undone import: ${importRecord.file_name}`,
            recordsDeleted,
            importType: import_type
        });

    } catch (error) {
        console.error('Error undoing import:', error);
        res.status(500).json({ 
            error: 'Failed to undo import', 
            details: error.message 
        });
    }
});

module.exports = router;