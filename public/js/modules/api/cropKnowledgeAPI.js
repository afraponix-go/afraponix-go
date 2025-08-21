// Crop Knowledge API Module
// Handles all crop knowledge, nutrients database, and deficiency management API calls

/**
 * Fetch all crops
 */
export async function fetchCrops() {
    const response = await fetch('/api/crop-knowledge/crops');
    if (!response.ok) throw new Error('Failed to fetch crops');
    return response.json();
}

/**
 * Fetch crop details by code
 */
export async function fetchCropDetails(cropCode) {
    const response = await fetch(`/api/crop-knowledge/crops/${cropCode}`);
    if (!response.ok) throw new Error('Failed to fetch crop details');
    return response.json();
}

/**
 * Fetch crop nutrient ranges
 */
export async function fetchCropNutrientRanges(crop, stage = 'general') {
    const response = await fetch(`/api/crop-knowledge/crops/${crop.toLowerCase()}/nutrient-ranges?stage=${stage}`);
    if (!response.ok) throw new Error('Failed to fetch nutrient ranges');
    return response.json();
}

/**
 * Calculate nutrient ratios
 */
export async function calculateNutrientRatios(calculationData) {
    const response = await fetch('/api/crop-knowledge/calculate/nutrient-ratios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationData)
    });
    if (!response.ok) throw new Error('Failed to calculate nutrient ratios');
    return response.json();
}

/**
 * Fetch detailed nutrient information
 */
export async function fetchNutrientDetails(nutrientCode, systemId) {
    const url = `/api/crop-knowledge/nutrients/${nutrientCode}/detailed${systemId ? `?systemId=${systemId}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch nutrient details');
    return response.json();
}

/**
 * Fetch all nutrients
 */
export async function fetchNutrients() {
    const response = await fetch('/api/crop-knowledge/nutrients');
    if (!response.ok) throw new Error('Failed to fetch nutrients');
    return response.json();
}

/**
 * Fetch growth stages
 */
export async function fetchGrowthStages() {
    const response = await fetch('/api/crop-knowledge/stages');
    if (!response.ok) throw new Error('Failed to fetch growth stages');
    return response.json();
}

// Admin Functions

/**
 * Fetch or create admin crop
 */
export async function saveAdminCrop(cropData, isEdit = false, cropCode = null) {
    const url = isEdit 
        ? `/api/crop-knowledge/admin/crops/${cropCode}`
        : '/api/crop-knowledge/admin/crops';
    const method = isEdit ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cropData)
    });
    if (!response.ok) throw new Error('Failed to save admin crop');
    return response.json();
}

/**
 * Delete admin crop
 */
export async function deleteAdminCrop(cropCode) {
    const response = await fetch(`/api/crop-knowledge/admin/crops/${cropCode}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete admin crop');
    return response.json();
}

/**
 * Fetch crop targets
 */
export async function fetchCropTargets(cropCode) {
    const response = await fetch(`/api/crop-knowledge/admin/crops/${cropCode}/targets`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch crop targets');
    return response.json();
}

/**
 * Create crop targets
 */
export async function createCropTargets(cropCode, targetsData) {
    const response = await fetch(`/api/crop-knowledge/admin/crops/${cropCode}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetsData)
    });
    if (!response.ok) throw new Error('Failed to create crop targets');
    return response.json();
}

/**
 * Update crop target
 */
export async function updateCropTarget(targetId, targetData) {
    const response = await fetch(`/api/crop-knowledge/admin/targets/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetData)
    });
    if (!response.ok) throw new Error('Failed to update crop target');
    return response.json();
}

/**
 * Delete crop target
 */
export async function deleteCropTarget(targetId) {
    const response = await fetch(`/api/crop-knowledge/admin/targets/${targetId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete crop target');
    return response.json();
}

// Ratio Rules

/**
 * Fetch ratio rules
 */
export async function fetchRatioRules() {
    const response = await fetch('/api/crop-knowledge/admin/ratio-rules');
    if (!response.ok) throw new Error('Failed to fetch ratio rules');
    return response.json();
}

/**
 * Save ratio rule
 */
export async function saveRatioRule(ruleData, isEdit = false, ruleId = null) {
    const url = isEdit 
        ? `/api/crop-knowledge/admin/ratio-rules/${ruleId}`
        : '/api/crop-knowledge/admin/ratio-rules';
    const method = isEdit ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
    });
    if (!response.ok) throw new Error('Failed to save ratio rule');
    return response.json();
}

/**
 * Delete ratio rule
 */
export async function deleteRatioRule(ruleId) {
    const response = await fetch(`/api/crop-knowledge/admin/ratio-rules/${ruleId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete ratio rule');
    return response.json();
}

// Environmental Adjustments

/**
 * Fetch environmental adjustments
 */
export async function fetchEnvironmentalAdjustments() {
    const response = await fetch('/api/crop-knowledge/admin/environmental-adjustments');
    if (!response.ok) throw new Error('Failed to fetch environmental adjustments');
    return response.json();
}

/**
 * Save environmental adjustments
 */
export async function saveEnvironmentalAdjustments(adjustmentData) {
    const response = await fetch('/api/crop-knowledge/admin/environmental-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData)
    });
    if (!response.ok) throw new Error('Failed to save environmental adjustments');
    return response.json();
}

// Deficiency Images

/**
 * Fetch deficiency images
 */
export async function fetchDeficiencyImages(nutrientCode = null) {
    const url = nutrientCode 
        ? `/api/crop-knowledge/admin/nutrients/${nutrientCode}/deficiency-images`
        : `/api/crop-knowledge/admin/deficiency-images?nocache=${Date.now()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch deficiency images');
    return response.json();
}

/**
 * Upload deficiency image
 */
export async function uploadDeficiencyImage(nutrientCode, formData) {
    const response = await fetch(`/api/crop-knowledge/admin/nutrients/${nutrientCode}/deficiency-images/upload`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload deficiency image');
    return response.json();
}

/**
 * Save deficiency image (URL or update)
 */
export async function saveDeficiencyImage(nutrientCode, imageData, imageId = null) {
    const url = imageId 
        ? `/api/crop-knowledge/admin/deficiency-images/${imageId}`
        : `/api/crop-knowledge/admin/nutrients/${nutrientCode}/deficiency-images`;
    const method = imageId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageData)
    });
    if (!response.ok) throw new Error('Failed to save deficiency image');
    return response.json();
}

/**
 * Delete deficiency image
 */
export async function deleteDeficiencyImage(imageId) {
    const response = await fetch(`/api/crop-knowledge/admin/deficiency-images/${imageId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete deficiency image');
    return response.json();
}

// Seed Varieties

/**
 * Fetch seed varieties for crop
 */
export async function fetchSeedVarieties(cropCode) {
    const response = await fetch(`/api/seed-varieties/crop/${cropCode}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch seed varieties');
    return response.json();
}

/**
 * Save seed variety
 */
export async function saveSeedVariety(varietyData) {
    const response = await fetch('/api/seed-varieties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(varietyData)
    });
    if (!response.ok) throw new Error('Failed to save seed variety');
    return response.json();
}

/**
 * Delete seed variety
 */
export async function deleteSeedVariety(varietyId) {
    const response = await fetch(`/api/seed-varieties/${varietyId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete seed variety');
    return response.json();
}