/**
 * Utility functions for plant batch tracking
 */

/**
 * Generate a unique batch ID
 * Format: BATCH_YYYYMMDD_HHMMSS
 * @param {Date} date - Optional date, defaults to current date
 * @returns {string} - Unique batch ID
 */
function generateBatchId(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `BATCH_${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Parse batch ID to extract creation date
 * @param {string} batchId - Batch ID to parse
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseBatchIdDate(batchId) {
    if (!batchId || !batchId.startsWith('BATCH_')) {
        return null;
    }
    
    const parts = batchId.split('_');
    if (parts.length !== 3) {
        return null;
    }
    
    const datePart = parts[1]; // YYYYMMDD
    const timePart = parts[2]; // HHMMSS
    
    if (datePart.length !== 8 || timePart.length !== 6) {
        return null;
    }
    
    const year = parseInt(datePart.substr(0, 4));
    const month = parseInt(datePart.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(datePart.substr(6, 2));
    const hours = parseInt(timePart.substr(0, 2));
    const minutes = parseInt(timePart.substr(2, 2));
    const seconds = parseInt(timePart.substr(4, 2));
    
    return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * Calculate batch age in days
 * @param {string} batchId - Batch ID
 * @param {Date} currentDate - Current date for comparison
 * @returns {number} - Age in days
 */
function calculateBatchAge(batchId, currentDate = new Date()) {
    const batchDate = parseBatchIdDate(batchId);
    if (!batchDate) {
        return 0;
    }
    
    const diffTime = Math.abs(currentDate - batchDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Format batch ID for display
 * @param {string} batchId - Batch ID to format
 * @returns {string} - Formatted display string
 */
function formatBatchIdForDisplay(batchId) {
    const date = parseBatchIdDate(batchId);
    if (!date) {
        return batchId;
    }
    
    const age = calculateBatchAge(batchId);
    const formattedDate = date.toLocaleDateString();
    
    return `${batchId} (${formattedDate}, ${age} days old)`;
}

/**
 * Get expected harvest date for a batch
 * @param {string} batchId - Batch ID
 * @param {number} daysToHarvest - Expected days to harvest
 * @returns {Date|null} - Expected harvest date
 */
function getExpectedHarvestDate(batchId, daysToHarvest) {
    const batchDate = parseBatchIdDate(batchId);
    if (!batchDate || !daysToHarvest) {
        return null;
    }
    
    const harvestDate = new Date(batchDate);
    harvestDate.setDate(harvestDate.getDate() + daysToHarvest);
    return harvestDate;
}

/**
 * Check if batch is ready for harvest
 * @param {string} batchId - Batch ID
 * @param {number} daysToHarvest - Expected days to harvest
 * @param {Date} currentDate - Current date
 * @returns {boolean} - True if ready for harvest
 */
function isBatchReadyForHarvest(batchId, daysToHarvest, currentDate = new Date()) {
    const expectedDate = getExpectedHarvestDate(batchId, daysToHarvest);
    if (!expectedDate) {
        return false;
    }
    
    return currentDate >= expectedDate;
}

/**
 * Get batch status based on age and harvest timeline
 * @param {string} batchId - Batch ID
 * @param {number} daysToHarvest - Expected days to harvest
 * @returns {object} - Status object with phase, progress, etc.
 */
function getBatchStatus(batchId, daysToHarvest) {
    const age = calculateBatchAge(batchId);
    
    if (!daysToHarvest) {
        return {
            phase: 'unknown',
            progress: 0,
            status: 'No harvest timeline set'
        };
    }
    
    const progress = Math.min((age / daysToHarvest) * 100, 100);
    
    let phase, status;
    if (age < daysToHarvest * 0.3) {
        phase = 'seedling';
        status = 'Growing - Seedling stage';
    } else if (age < daysToHarvest * 0.7) {
        phase = 'vegetative';
        status = 'Growing - Vegetative stage';
    } else if (age < daysToHarvest) {
        phase = 'mature';
        status = 'Approaching harvest';
    } else {
        phase = 'harvest';
        status = 'Ready for harvest';
    }
    
    return {
        phase,
        progress: Math.round(progress),
        status,
        age,
        daysRemaining: Math.max(daysToHarvest - age, 0)
    };
}

module.exports = {
    generateBatchId,
    parseBatchIdDate,
    calculateBatchAge,
    formatBatchIdForDisplay,
    getExpectedHarvestDate,
    isBatchReadyForHarvest,
    getBatchStatus
};