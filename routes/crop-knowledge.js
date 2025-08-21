const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { requireAdmin } = require('../middleware/admin-auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Log all requests to this router
router.use((req, res, next) => {
    console.log(`🔍 CROP-KNOWLEDGE REQUEST: ${req.method} ${req.originalUrl}`);
    next();
});

// Configure multer for deficiency image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './images/deficiencies';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: nutrientcode-stage-timestamp.ext
        const nutrientCode = req.params.nutrientCode || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${nutrientCode}-deficiency-${timestamp}${ext}`;
        cb(null, filename);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// =====================================================
// CROP KNOWLEDGE API ENDPOINTS
// =====================================================

// Get all crops with their categories and nutrient targets
router.get('/crops', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [crops] = await pool.execute(`
            SELECT 
                c.id,
                c.code,
                c.name,
                c.scientific_name,
                c.default_ec_min,
                c.default_ec_max,
                c.default_ph_min,
                c.default_ph_max,
                c.days_to_harvest,
                c.plant_spacing_cm,
                c.light_requirements,
                c.growing_notes,
                c.research_source,
                cc.code as category_code,
                cc.name as category_name,
                COUNT(cnt.id) as nutrient_targets_count
            FROM crops c
            LEFT JOIN crop_categories cc ON c.category_id = cc.id
            LEFT JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
            WHERE c.is_active = true
            GROUP BY c.id, cc.code, cc.name
            ORDER BY cc.name, c.name
        `);
        
        res.json({
            success: true,
            count: crops.length,
            data: crops
        });
        
    } catch (error) {
        console.error('Error fetching crops:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch crops',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get specific crop with full nutrient profile
router.get('/crops/:cropCode', async (req, res) => {
    try {
        const { cropCode } = req.params;
        const { stage } = req.query; // Optional growth stage filter
        const pool = getDatabase();
        
        // Get crop info
        const [cropRows] = await pool.execute(`
            SELECT 
                c.*,
                cc.code as category_code,
                cc.name as category_name
            FROM crops c
            LEFT JOIN crop_categories cc ON c.category_id = cc.id
            WHERE c.code = ? AND c.is_active = true
        `, [cropCode]);
        
        if (cropRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crop not found'
            });
        }
        
        const crop = cropRows[0];
        
        // Get nutrient targets
        let stageFilter = '';
        let params = [crop.id];
        
        if (stage && stage !== 'general') {
            stageFilter = 'AND gs.code = ?';
            params.push(stage);
        }
        
        const [targets] = await pool.execute(`
            SELECT 
                n.code as nutrient_code,
                n.symbol,
                n.name as nutrient_name,
                n.unit,
                cnt.target_value,
                cnt.min_value,
                cnt.max_value,
                cnt.notes,
                gs.code as stage_code,
                gs.name as stage_name
            FROM crop_nutrient_targets cnt
            JOIN nutrients n ON cnt.nutrient_id = n.id
            JOIN growth_stages gs ON cnt.growth_stage_id = gs.id
            WHERE cnt.crop_id = ? ${stageFilter}
            ORDER BY n.code, gs.sort_order
        `, params);
        
        // Format nutrient targets by stage
        const nutrientsByStage = {};
        const nutrientSummary = {};
        
        targets.forEach(target => {
            if (!nutrientsByStage[target.stage_code]) {
                nutrientsByStage[target.stage_code] = {
                    stage_name: target.stage_name,
                    nutrients: {}
                };
            }
            
            nutrientsByStage[target.stage_code].nutrients[target.nutrient_code] = {
                symbol: target.symbol,
                name: target.nutrient_name,
                unit: target.unit,
                target: parseFloat(target.target_value),
                min: target.min_value ? parseFloat(target.min_value) : null,
                max: target.max_value ? parseFloat(target.max_value) : null,
                notes: target.notes
            };
            
            // Summary for general stage
            if (target.stage_code === 'general') {
                nutrientSummary[target.nutrient_code] = {
                    symbol: target.symbol,
                    target: parseFloat(target.target_value),
                    unit: target.unit
                };
            }
        });
        
        res.json({
            success: true,
            data: {
                crop,
                nutrients_by_stage: nutrientsByStage,
                nutrient_summary: nutrientSummary
            }
        });
        
    } catch (error) {
        console.error('Error fetching crop details:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch crop details',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get crop nutrient ranges for analysis functions
router.get('/crops/:cropCode/nutrient-ranges', async (req, res) => {
    try {
        const { cropCode } = req.params;
        const { stage = 'general' } = req.query;
        const pool = getDatabase();
        
        const [ranges] = await pool.execute(`
            SELECT 
                n.code as nutrient_code,
                cnt.target_value,
                cnt.min_value,
                cnt.max_value
            FROM crops c
            JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
            JOIN nutrients n ON cnt.nutrient_id = n.id
            JOIN growth_stages gs ON cnt.growth_stage_id = gs.id
            WHERE c.code = ? AND gs.code = ? AND c.is_active = true
        `, [cropCode, stage]);
        
        if (ranges.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crop or stage not found'
            });
        }
        
        // Format for frontend compatibility
        const rangeData = {};
        ranges.forEach(range => {
            rangeData[range.nutrient_code] = {
                target: parseFloat(range.target_value),
                min: range.min_value ? parseFloat(range.min_value) : parseFloat(range.target_value) * 0.8,
                max: range.max_value ? parseFloat(range.max_value) : parseFloat(range.target_value) * 1.2
            };
        });
        
        res.json({
            success: true,
            crop_code: cropCode,
            stage: stage,
            ranges: rangeData
        });
        
    } catch (error) {
        console.error('Error fetching nutrient ranges:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch nutrient ranges',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all nutrients
router.get('/nutrients', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [nutrients] = await pool.execute(`
            SELECT * FROM nutrients 
            ORDER BY is_base DESC, code
        `);
        
        res.json({
            success: true,
            count: nutrients.length,
            data: nutrients
        });
        
    } catch (error) {
        console.error('Error fetching nutrients:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch nutrients',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all growth stages
router.get('/stages', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [stages] = await pool.execute(`
            SELECT * FROM growth_stages 
            ORDER BY sort_order
        `);
        
        res.json({
            success: true,
            count: stages.length,
            data: stages
        });
        
    } catch (error) {
        console.error('Error fetching growth stages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch growth stages',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get crop categories
router.get('/categories', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [categories] = await pool.execute(`
            SELECT 
                cc.*,
                COUNT(c.id) as crop_count
            FROM crop_categories cc
            LEFT JOIN crops c ON cc.id = c.category_id AND c.is_active = true
            GROUP BY cc.id
            ORDER BY cc.name
        `);
        
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch categories',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// ADMIN ENDPOINTS (Authenticated)
// =====================================================

// Add new crop
// Temporarily bypass requireAdmin for testing
router.post('/admin/crops', async (req, res) => {
    try {
        const {
            code,
            name,
            scientific_name,
            category_code,
            default_ec_min,
            default_ec_max,
            default_ph_min,
            default_ph_max,
            days_to_harvest,
            plant_spacing_cm,
            light_requirements,
            growing_notes,
            research_source,
            nutrient_targets = []
        } = req.body;

        if (!code || !name || !category_code) {
            return res.status(400).json({
                success: false,
                error: 'Code, name, and category are required'
            });
        }

        const pool = getDatabase();
        
        // Start transaction
        await pool.execute('START TRANSACTION');
        
        try {
            // Get category ID
            const [categoryRows] = await pool.execute(
                'SELECT id FROM crop_categories WHERE code = ?',
                [category_code]
            );
            
            if (categoryRows.length === 0) {
                throw new Error(`Category '${category_code}' not found`);
            }
            
            const categoryId = categoryRows[0].id;
            
            // Insert crop
            const [cropResult] = await pool.execute(`
                INSERT INTO crops (
                    code, name, scientific_name, category_id,
                    default_ec_min, default_ec_max, default_ph_min, default_ph_max,
                    days_to_harvest, plant_spacing_cm, light_requirements,
                    growing_notes, research_source, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
            `, [
                code, name, scientific_name, categoryId,
                default_ec_min, default_ec_max, default_ph_min, default_ph_max,
                days_to_harvest, plant_spacing_cm, light_requirements,
                growing_notes, research_source
            ]);
            
            const cropId = cropResult.insertId;
            
            // Insert nutrient targets if provided
            if (nutrient_targets && nutrient_targets.length > 0) {
                for (const target of nutrient_targets) {
                    const { nutrient_code, growth_stage_code, target_value, min_value, max_value, notes } = target;
                    
                    // Get nutrient and stage IDs
                    const [nutrientRows] = await pool.execute(
                        'SELECT id FROM nutrients WHERE code = ?',
                        [nutrient_code]
                    );
                    
                    const [stageRows] = await pool.execute(
                        'SELECT id FROM growth_stages WHERE code = ?',
                        [growth_stage_code]
                    );
                    
                    if (nutrientRows.length > 0 && stageRows.length > 0) {
                        await pool.execute(`
                            INSERT INTO crop_nutrient_targets (
                                crop_id, nutrient_id, growth_stage_id,
                                target_value, min_value, max_value, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            cropId, nutrientRows[0].id, stageRows[0].id,
                            target_value, min_value, max_value, notes
                        ]);
                    }
                }
            }
            
            await pool.execute('COMMIT');
            
            res.json({
                success: true,
                message: 'Crop created successfully',
                crop_id: cropId,
                code: code
            });
            
        } catch (transactionError) {
            await pool.execute('ROLLBACK');
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Error creating crop:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create crop',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update crop
// Temporarily bypass requireAdmin for testing
router.put('/admin/crops/:cropCode', async (req, res) => {
    try {
        const { cropCode } = req.params;
        const updates = req.body;
        const pool = getDatabase();
        
        // Get crop ID
        const [cropRows] = await pool.execute(
            'SELECT id FROM crops WHERE code = ? AND is_active = true',
            [cropCode]
        );
        
        if (cropRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crop not found'
            });
        }
        
        const cropId = cropRows[0].id;
        
        // Build dynamic update query
        const allowedFields = [
            'name', 'scientific_name', 'default_ec_min', 'default_ec_max',
            'default_ph_min', 'default_ph_max', 'days_to_harvest',
            'plant_spacing_cm', 'light_requirements', 'growing_notes', 'research_source'
        ];
        
        const updateFields = [];
        const updateValues = [];
        
        for (const [field, value] of Object.entries(updates)) {
            if (allowedFields.includes(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(value);
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        updateValues.push(cropId);
        
        await pool.execute(
            `UPDATE crops SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        res.json({
            success: true,
            message: 'Crop updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating crop:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update crop',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete crop (soft delete)
// Temporarily bypass requireAdmin for testing
router.delete('/admin/crops/:cropCode', async (req, res) => {
    try {
        const { cropCode } = req.params;
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'UPDATE crops SET is_active = false WHERE code = ? AND is_active = true',
            [cropCode]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crop not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Crop deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting crop:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete crop',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get nutrient targets for specific crop (admin view with full data)
// Temporarily bypass requireAdmin to test if endpoint works
router.get('/admin/crops/:cropCode/targets', async (req, res) => {
    console.log('Admin targets endpoint hit for crop:', req.params.cropCode);
    try {
        const { cropCode } = req.params;
        const pool = getDatabase();
        
        const [targets] = await pool.execute(`
            SELECT 
                cnt.id,
                n.code as nutrient_code,
                n.name as nutrient_name,
                n.symbol,
                n.unit,
                gs.code as stage_code,
                gs.name as stage_name,
                cnt.target_value,
                cnt.min_value,
                cnt.max_value,
                cnt.notes,
                cnt.created_at,
                cnt.updated_at
            FROM crops c
            JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
            JOIN nutrients n ON cnt.nutrient_id = n.id
            JOIN growth_stages gs ON cnt.growth_stage_id = gs.id
            WHERE c.code = ? AND c.is_active = true
            ORDER BY gs.sort_order, n.code
        `, [cropCode]);
        
        res.json({
            success: true,
            crop_code: cropCode,
            count: targets.length,
            data: targets
        });
        
    } catch (error) {
        console.error('Error fetching crop targets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crop targets',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update nutrient target
// Temporarily bypass requireAdmin for testing
router.put('/admin/targets/:targetId', async (req, res) => {
    try {
        const { targetId } = req.params;
        const { target_value, min_value, max_value, notes } = req.body;
        const pool = getDatabase();
        
        const [result] = await pool.execute(`
            UPDATE crop_nutrient_targets 
            SET target_value = ?, min_value = ?, max_value = ?, notes = ?
            WHERE id = ?
        `, [target_value, min_value, max_value, notes, targetId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient target not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Nutrient target updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating nutrient target:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update nutrient target',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add new nutrient target for a crop
// Temporarily bypass requireAdmin for testing
router.post('/admin/crops/:cropCode/targets', async (req, res) => {
    try {
        const { cropCode } = req.params;
        const { nutrient_code, growth_stage, target_value, min_value, max_value, notes } = req.body;
        const pool = getDatabase();
        
        // Get crop ID
        const [cropRows] = await pool.execute(
            'SELECT id FROM crops WHERE code = ? AND is_active = true',
            [cropCode]
        );
        
        if (cropRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crop not found'
            });
        }
        
        const cropId = cropRows[0].id;
        
        // Get nutrient ID
        const [nutrientRows] = await pool.execute(
            'SELECT id FROM nutrients WHERE code = ?',
            [nutrient_code]
        );
        
        if (nutrientRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient not found'
            });
        }
        
        const nutrientId = nutrientRows[0].id;
        
        // Get growth stage ID
        const [stageRows] = await pool.execute(
            'SELECT id FROM growth_stages WHERE code = ?',
            [growth_stage]
        );
        
        if (stageRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Growth stage not found'
            });
        }
        
        const stageId = stageRows[0].id;
        
        // Insert the new target
        const [result] = await pool.execute(`
            INSERT INTO crop_nutrient_targets 
            (crop_id, nutrient_id, growth_stage_id, target_value, min_value, max_value, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [cropId, nutrientId, stageId, target_value, min_value, max_value, notes]);
        
        res.json({
            success: true,
            message: 'Nutrient target added successfully',
            target_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error adding nutrient target:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add nutrient target',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete nutrient target
// Temporarily bypass requireAdmin for testing
router.delete('/admin/targets/:targetId', async (req, res) => {
    try {
        const { targetId } = req.params;
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'DELETE FROM crop_nutrient_targets WHERE id = ?',
            [targetId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient target not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Nutrient target deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting nutrient target:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete nutrient target',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// CALCULATION HELPER ENDPOINTS
// =====================================================

// Calculate nutrients for multiple crops (smart mixing)
router.post('/calculate/multi-crop', async (req, res) => {
    try {
        const { crops, stage = 'general', current_conditions = {} } = req.body;
        
        if (!crops || !Array.isArray(crops) || crops.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Crops array is required'
            });
        }
        
        const pool = getDatabase();
        const results = {};
        
        // Get ranges for each crop
        for (const cropCode of crops) {
            const [ranges] = await pool.execute(`
                SELECT 
                    n.code as nutrient_code,
                    cnt.target_value,
                    cnt.min_value,
                    cnt.max_value
                FROM crops c
                JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
                JOIN nutrients n ON cnt.nutrient_id = n.id
                JOIN growth_stages gs ON cnt.growth_stage_id = gs.id
                WHERE c.code = ? AND gs.code = ? AND c.is_active = true
            `, [cropCode, stage]);
            
            if (ranges.length > 0) {
                results[cropCode] = {};
                ranges.forEach(range => {
                    results[cropCode][range.nutrient_code] = {
                        target: parseFloat(range.target_value),
                        min: range.min_value ? parseFloat(range.min_value) : parseFloat(range.target_value) * 0.8,
                        max: range.max_value ? parseFloat(range.max_value) : parseFloat(range.target_value) * 1.2
                    };
                });
            }
        }
        
        // Calculate compromise ranges (future enhancement)
        // For now, return individual crop data
        
        res.json({
            success: true,
            crops,
            stage,
            current_conditions,
            individual_ranges: results,
            // TODO: Add compromise calculation logic
            compromise_ranges: null
        });
        
    } catch (error) {
        console.error('Error calculating multi-crop nutrients:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to calculate multi-crop nutrients',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// NUTRIENT RATIO MANAGEMENT ENDPOINTS
// =====================================================

// Get all nutrient ratio rules
router.get('/admin/ratio-rules', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [rules] = await pool.execute(`
            SELECT 
                nrr.id,
                nrr.min_factor,
                nrr.max_factor,
                nrr.is_default,
                nrr.priority,
                nrr.notes,
                nrr.created_at,
                nrr.updated_at,
                n.code as nutrient_code,
                n.name as nutrient_name,
                n.symbol,
                n.unit,
                n.is_ratio_based,
                gs.code as stage_code,
                gs.name as stage_name,
                ct.code as condition_code,
                ct.name as condition_name
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            LEFT JOIN condition_types ct ON nrr.condition_type_id = ct.id
            ORDER BY n.code, gs.sort_order, nrr.priority DESC
        `);
        
        res.json({
            success: true,
            count: rules.length,
            data: rules
        });
        
    } catch (error) {
        console.error('Error fetching ratio rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ratio rules',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get ratio rules for specific nutrient
router.get('/admin/ratio-rules/nutrient/:nutrientCode', async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const pool = getDatabase();
        
        const [rules] = await pool.execute(`
            SELECT 
                nrr.id,
                nrr.min_factor,
                nrr.max_factor,
                nrr.is_default,
                nrr.priority,
                nrr.notes,
                nrr.created_at,
                nrr.updated_at,
                gs.code as stage_code,
                gs.name as stage_name,
                ct.code as condition_code,
                ct.name as condition_name
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            LEFT JOIN condition_types ct ON nrr.condition_type_id = ct.id
            WHERE n.code = ?
            ORDER BY gs.sort_order, nrr.priority DESC
        `, [nutrientCode]);
        
        res.json({
            success: true,
            nutrient_code: nutrientCode,
            count: rules.length,
            data: rules
        });
        
    } catch (error) {
        console.error('Error fetching nutrient ratio rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch nutrient ratio rules',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add new ratio rule
router.post('/admin/ratio-rules', async (req, res) => {
    try {
        const {
            nutrient_code,
            growth_stage_code,
            condition_type_code,
            min_factor,
            max_factor,
            is_default = false,
            priority = 0,
            notes
        } = req.body;

        if (!nutrient_code || min_factor === undefined || max_factor === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Nutrient code, min_factor, and max_factor are required'
            });
        }

        const pool = getDatabase();
        
        // Start transaction
        await pool.execute('START TRANSACTION');
        
        try {
            // Get nutrient ID
            const [nutrientRows] = await pool.execute(
                'SELECT id FROM nutrients WHERE code = ?',
                [nutrient_code]
            );
            
            if (nutrientRows.length === 0) {
                throw new Error(`Nutrient '${nutrient_code}' not found`);
            }
            
            const nutrientId = nutrientRows[0].id;
            
            // Get growth stage ID (optional)
            let stageId = null;
            if (growth_stage_code) {
                const [stageRows] = await pool.execute(
                    'SELECT id FROM growth_stages WHERE code = ?',
                    [growth_stage_code]
                );
                
                if (stageRows.length === 0) {
                    throw new Error(`Growth stage '${growth_stage_code}' not found`);
                }
                
                stageId = stageRows[0].id;
            }
            
            // Get condition type ID (optional)
            let conditionId = null;
            if (condition_type_code) {
                const [conditionRows] = await pool.execute(
                    'SELECT id FROM condition_types WHERE code = ?',
                    [condition_type_code]
                );
                
                if (conditionRows.length === 0) {
                    throw new Error(`Condition type '${condition_type_code}' not found`);
                }
                
                conditionId = conditionRows[0].id;
            }
            
            // Insert ratio rule
            const [result] = await pool.execute(`
                INSERT INTO nutrient_ratio_rules (
                    nutrient_id, growth_stage_id, condition_type_id,
                    min_factor, max_factor, is_default, priority, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nutrientId, stageId, conditionId,
                min_factor, max_factor, is_default, priority, notes
            ]);
            
            await pool.execute('COMMIT');
            
            res.json({
                success: true,
                message: 'Ratio rule created successfully',
                rule_id: result.insertId
            });
            
        } catch (transactionError) {
            await pool.execute('ROLLBACK');
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Error creating ratio rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create ratio rule',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update ratio rule
router.put('/admin/ratio-rules/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { min_factor, max_factor, is_default, priority, notes } = req.body;
        const pool = getDatabase();
        
        // Build dynamic update query
        const allowedFields = ['min_factor', 'max_factor', 'is_default', 'priority', 'notes'];
        const updateFields = [];
        const updateValues = [];
        
        for (const [field, value] of Object.entries(req.body)) {
            if (allowedFields.includes(field) && value !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(value);
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        updateValues.push(ruleId);
        
        const [result] = await pool.execute(
            `UPDATE nutrient_ratio_rules SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ratio rule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Ratio rule updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating ratio rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ratio rule',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete ratio rule
router.delete('/admin/ratio-rules/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'DELETE FROM nutrient_ratio_rules WHERE id = ?',
            [ruleId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ratio rule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Ratio rule deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting ratio rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete ratio rule',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// ENVIRONMENTAL ADJUSTMENTS ENDPOINTS
// =====================================================

// Get all environmental adjustments
router.get('/admin/environmental-adjustments', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [adjustments] = await pool.execute(`
            SELECT 
                ea.id,
                ea.condition_name,
                ea.operator,
                ea.threshold_value,
                ea.threshold_value_max,
                ea.adjustment_factor,
                ea.applies_to_all_nutrients,
                ea.created_at,
                ea.updated_at,
                ep.code as parameter_code,
                ep.name as parameter_name,
                ep.unit as parameter_unit
            FROM environmental_adjustments ea
            JOIN environmental_parameters ep ON ea.parameter_id = ep.id
            ORDER BY ep.code, ea.condition_name
        `);
        
        res.json({
            success: true,
            count: adjustments.length,
            data: adjustments
        });
        
    } catch (error) {
        console.error('Error fetching environmental adjustments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch environmental adjustments',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add environmental adjustment
router.post('/admin/environmental-adjustments', async (req, res) => {
    try {
        const {
            parameter_code,
            condition_name,
            operator,
            threshold_value,
            threshold_value_max,
            adjustment_factor,
            applies_to_all_nutrients = true
        } = req.body;

        if (!parameter_code || !condition_name || !operator || threshold_value === undefined || adjustment_factor === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Parameter code, condition name, operator, threshold value, and adjustment factor are required'
            });
        }

        const pool = getDatabase();
        
        // Get parameter ID
        const [parameterRows] = await pool.execute(
            'SELECT id FROM environmental_parameters WHERE code = ?',
            [parameter_code]
        );
        
        if (parameterRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Environmental parameter '${parameter_code}' not found`
            });
        }
        
        const parameterId = parameterRows[0].id;
        
        // Insert adjustment
        const [result] = await pool.execute(`
            INSERT INTO environmental_adjustments (
                parameter_id, condition_name, operator, threshold_value,
                threshold_value_max, adjustment_factor, applies_to_all_nutrients
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            parameterId, condition_name, operator, threshold_value,
            threshold_value_max, adjustment_factor, applies_to_all_nutrients
        ]);
        
        res.json({
            success: true,
            message: 'Environmental adjustment created successfully',
            adjustment_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error creating environmental adjustment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create environmental adjustment',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// CALCULATION ENDPOINTS
// =====================================================

// Calculate nutrient ratios based on conditions
router.post('/calculate/nutrient-ratios', async (req, res) => {
    try {
        const {
            base_nitrate_ppm,
            crop_code,
            growth_stage = 'general',
            environmental_conditions = {}
        } = req.body;

        if (!base_nitrate_ppm) {
            return res.status(400).json({
                success: false,
                error: 'Base nitrate PPM is required'
            });
        }

        const pool = getDatabase();
        
        // Get ratio rules for the specified stage or default to general
        const [ratioRules] = await pool.execute(`
            SELECT 
                n.code as nutrient_code,
                n.name as nutrient_name,
                n.symbol,
                n.unit,
                n.is_ratio_based,
                nrr.min_factor,
                nrr.max_factor,
                nrr.is_default,
                nrr.priority
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            WHERE (gs.code = ? OR gs.code IS NULL)
            ORDER BY n.code, nrr.priority DESC, nrr.is_default DESC
        `, [growth_stage]);
        
        // Get environmental adjustments
        const [envAdjustments] = await pool.execute(`
            SELECT 
                ea.*,
                ep.code as parameter_code
            FROM environmental_adjustments ea
            JOIN environmental_parameters ep ON ea.parameter_id = ep.id
        `);
        
        // Calculate base nutrient values
        const calculations = {};
        const ratiosByNutrient = {};
        
        // Group ratios by nutrient (use highest priority/default first)
        ratioRules.forEach(rule => {
            if (!ratiosByNutrient[rule.nutrient_code]) {
                ratiosByNutrient[rule.nutrient_code] = rule;
            }
        });
        
        // Calculate each nutrient
        Object.entries(ratiosByNutrient).forEach(([nutrientCode, rule]) => {
            // Apply environmental adjustments
            let adjustmentFactor = 1.0;
            envAdjustments.forEach(adj => {
                if (adj.applies_to_all_nutrients && environmental_conditions[adj.parameter_code] !== undefined) {
                    const envValue = environmental_conditions[adj.parameter_code];
                    
                    // Check if adjustment applies
                    let applies = false;
                    if (adj.operator === '>' && envValue > adj.threshold_value) applies = true;
                    if (adj.operator === '<' && envValue < adj.threshold_value) applies = true;
                    if (adj.operator === '>=' && envValue >= adj.threshold_value) applies = true;
                    if (adj.operator === '<=' && envValue <= adj.threshold_value) applies = true;
                    if (adj.operator === '=' && envValue === adj.threshold_value) applies = true;
                    if (adj.operator === 'between' && adj.threshold_value_max !== null) {
                        applies = envValue >= adj.threshold_value && envValue <= adj.threshold_value_max;
                    }
                    
                    if (applies) {
                        adjustmentFactor *= adj.adjustment_factor;
                    }
                }
            });
            
            // Smart detection: Only iron and specific micronutrients use fixed ppm ranges
            // All others (including calcium, potassium with small ratios) are ratio-based
            const isFixedRange = (nutrientCode === 'iron');
            
            if (!isFixedRange) {
                // Ratio-based nutrients: calculate based on nitrogen
                const avgFactor = (rule.min_factor + rule.max_factor) / 2;
                let calculatedValue = base_nitrate_ppm * avgFactor * adjustmentFactor;
                
                calculations[nutrientCode] = {
                    symbol: rule.symbol,
                    name: rule.nutrient_name,
                    unit: rule.unit,
                    base_ratio: avgFactor,
                    calculated_ppm: parseFloat(calculatedValue.toFixed(3)),
                    min_range: parseFloat((base_nitrate_ppm * rule.min_factor * adjustmentFactor).toFixed(3)),
                    max_range: parseFloat((base_nitrate_ppm * rule.max_factor * adjustmentFactor).toFixed(3)),
                    environmental_adjustment: adjustmentFactor,
                    rule_source: rule.is_default ? 'default' : 'custom',
                    calculation_type: 'ratio'
                };
            } else {
                // Fixed-range nutrients: use absolute values
                const minRange = parseFloat(rule.min_factor);
                const maxRange = parseFloat(rule.max_factor);
                const avgValue = (minRange + maxRange) / 2;
                
                calculations[nutrientCode] = {
                    symbol: rule.symbol,
                    name: rule.nutrient_name,
                    unit: rule.unit,
                    base_ratio: null, // No ratio for fixed-range nutrients
                    calculated_ppm: parseFloat((avgValue * adjustmentFactor).toFixed(3)),
                    min_range: parseFloat((minRange * adjustmentFactor).toFixed(3)),
                    max_range: parseFloat((maxRange * adjustmentFactor).toFixed(3)),
                    environmental_adjustment: adjustmentFactor,
                    rule_source: rule.is_default ? 'default' : 'custom',
                    calculation_type: 'fixed'
                };
            }
        });
        
        res.json({
            success: true,
            input: {
                base_nitrate_ppm,
                crop_code,
                growth_stage,
                environmental_conditions
            },
            calculations,
            total_nutrients: Object.keys(calculations).length
        });
        
    } catch (error) {
        console.error('Error calculating nutrient ratios:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate nutrient ratios',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// COMPREHENSIVE NUTRIENT INFORMATION ENDPOINTS
// =====================================================

// Get detailed nutrient information with mobility, deficiencies, competitions
router.get('/nutrients/:nutrientCode/detailed', async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const { systemId } = req.query; // Optional system ID for current crop context
        const pool = getDatabase();
        
        // Get comprehensive nutrient information
        const [nutrientRows] = await pool.execute(`
            SELECT 
                n.*,
                COUNT(DISTINCT ndi.id) as deficiency_images_count
            FROM nutrients n
            LEFT JOIN nutrient_deficiency_images ndi ON n.id = ndi.nutrient_id AND ndi.is_active = true
            WHERE n.code = ?
            GROUP BY n.id
        `, [nutrientCode]);
        
        if (nutrientRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient not found'
            });
        }
        
        const nutrient = nutrientRows[0];
        
        // Get deficiency images
        const [deficiencyImages] = await pool.execute(`
            SELECT 
                image_filename,
                image_url,
                caption,
                deficiency_stage,
                plant_type,
                crop_specific
            FROM nutrient_deficiency_images
            WHERE nutrient_id = ? AND is_active = true
            ORDER BY deficiency_stage, uploaded_at DESC
        `, [nutrient.id]);
        
        // Get nutrient competitions/interactions
        const [competitions] = await pool.execute(`
            SELECT 
                cn.code as competing_nutrient,
                cn.name as competing_name,
                cn.symbol as competing_symbol,
                nc.competition_type,
                nc.competition_strength,
                nc.description as competition_description,
                nc.optimal_ratio_notes
            FROM nutrient_competition nc
            JOIN nutrients cn ON nc.competing_nutrient_id = cn.id
            WHERE nc.primary_nutrient_id = ?
        `, [nutrient.id]);
        
        // Get pH availability ranges
        const [phRanges] = await pool.execute(`
            SELECT 
                ph_min,
                ph_max,
                availability_percentage,
                notes
            FROM nutrient_ph_availability
            WHERE nutrient_id = ?
            ORDER BY ph_min
        `, [nutrient.id]);
        
        // Get current system crops if systemId provided
        let currentSystemCrops = [];
        let nutrientRanges = {};
        
        if (systemId) {
            try {
                const [cropRows] = await pool.execute(`
                    SELECT DISTINCT crop_code 
                    FROM plant_data 
                    WHERE system_id = ? 
                    AND plants_harvested = 0 
                    AND crop_code IS NOT NULL
                    ORDER BY crop_code
                `, [systemId]);
                
                currentSystemCrops = cropRows.map(row => row.crop_code).filter(Boolean);
                
                // Get nutrient ranges for current crops
                if (currentSystemCrops.length > 0) {
                    const cropPlaceholders = currentSystemCrops.map(() => '?').join(',');
                    const [rangeRows] = await pool.execute(`
                        SELECT 
                            c.code as crop_code,
                            c.name as crop_name,
                            cnt.target_value,
                            cnt.min_value,
                            cnt.max_value,
                            gs.code as stage_code,
                            gs.name as stage_name
                        FROM crops c
                        JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
                        JOIN nutrients n ON cnt.nutrient_id = n.id
                        JOIN growth_stages gs ON cnt.growth_stage_id = gs.id
                        WHERE c.code IN (${cropPlaceholders}) 
                        AND n.code = ?
                        ORDER BY c.name, gs.sort_order
                    `, [...currentSystemCrops, nutrientCode]);
                    
                    // Group by crop
                    rangeRows.forEach(row => {
                        if (!nutrientRanges[row.crop_code]) {
                            nutrientRanges[row.crop_code] = {
                                crop_name: row.crop_name,
                                stages: {}
                            };
                        }
                        
                        nutrientRanges[row.crop_code].stages[row.stage_code] = {
                            stage_name: row.stage_name,
                            target: parseFloat(row.target_value),
                            min: row.min_value ? parseFloat(row.min_value) : parseFloat(row.target_value) * 0.8,
                            max: row.max_value ? parseFloat(row.max_value) : parseFloat(row.target_value) * 1.2
                        };
                    });
                }
            } catch (systemError) {
                console.warn('Warning: Could not fetch system crop data:', systemError.message);
            }
        }
        
        // Get ratio information if nutrient is ratio-based
        let ratioInfo = null;
        
        if (nutrient.is_ratio_based === 1) {
            const [ratioRows] = await pool.execute(`
                SELECT 
                    nrr.min_factor,
                    nrr.max_factor,
                    nrr.is_default,
                    nrr.notes,
                    gs.code as stage_code,
                    gs.name as stage_name
                FROM nutrient_ratio_rules nrr
                JOIN nutrients n ON nrr.nutrient_id = n.id
                LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
                WHERE n.code = ?
                ORDER BY gs.sort_order, nrr.priority DESC
            `, [nutrientCode]);
            
            if (ratioRows.length > 0) {
                ratioInfo = {
                    is_ratio_based: true,
                    base_nutrient: 'nitrogen',
                    stages: {}
                };
                
                ratioRows.forEach(row => {
                    const stageKey = row.stage_code || 'general';
                    const minRatio = parseFloat(row.min_factor) || 0;
                    const maxRatio = parseFloat(row.max_factor) || 0;
                    
                    // Calculate average ratio safely
                    let avgRatio = 0;
                    if (!isNaN(minRatio) && !isNaN(maxRatio) && (minRatio > 0 || maxRatio > 0)) {
                        avgRatio = parseFloat(((minRatio + maxRatio) / 2).toFixed(4));
                    }
                    
                    ratioInfo.stages[stageKey] = {
                        stage_name: row.stage_name || 'General',
                        min_ratio: minRatio,
                        max_ratio: maxRatio,
                        avg_ratio: avgRatio,
                        is_default: row.is_default,
                        notes: row.notes
                    };
                });
            }
        } else {
            // For fixed-range nutrients
            const [fixedRangeRows] = await pool.execute(`
                SELECT 
                    nrr.min_factor as min_ppm,
                    nrr.max_factor as max_ppm,
                    nrr.notes,
                    gs.code as stage_code,
                    gs.name as stage_name
                FROM nutrient_ratio_rules nrr
                JOIN nutrients n ON nrr.nutrient_id = n.id
                LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
                WHERE n.code = ?
                ORDER BY gs.sort_order
            `, [nutrientCode]);
            
            if (fixedRangeRows.length > 0) {
                ratioInfo = {
                    is_ratio_based: false,
                    fixed_ranges: {}
                };
                
                fixedRangeRows.forEach(row => {
                    const stageKey = row.stage_code || 'general';
                    const minPpm = parseFloat(row.min_ppm);
                    const maxPpm = parseFloat(row.max_ppm);
                    ratioInfo.fixed_ranges[stageKey] = {
                        stage_name: row.stage_name || 'General',
                        min_ppm: minPpm,
                        max_ppm: maxPpm,
                        avg_ppm: parseFloat(((minPpm + maxPpm) / 2).toFixed(2)),
                        notes: row.notes
                    };
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                // Basic nutrient information
                code: nutrient.code,
                name: nutrient.name,
                symbol: nutrient.symbol,
                unit: nutrient.unit,
                mobility: nutrient.mobility,
                is_essential: nutrient.is_essential,
                
                // Detailed information
                description: nutrient.description,
                primary_functions: nutrient.primary_functions,
                deficiency_symptoms: nutrient.deficiency_symptoms,
                toxicity_symptoms: nutrient.toxicity_symptoms,
                common_sources: nutrient.common_sources,
                uptake_interactions: nutrient.uptake_interactions,
                
                // Visual resources
                deficiency_images: deficiencyImages,
                deficiency_images_count: nutrient.deficiency_images_count,
                
                // Interactions and competitions
                competitions: competitions,
                ph_availability: phRanges,
                
                // Ratio/range information
                ratio_info: ratioInfo,
                
                // Current system context
                system_context: systemId ? {
                    system_id: systemId,
                    current_crops: currentSystemCrops,
                    crop_ranges: nutrientRanges
                } : null
            }
        });
        
    } catch (error) {
        console.error('Error fetching detailed nutrient info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch detailed nutrient information',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Upload deficiency image for nutrient (will need file upload middleware)
router.post('/admin/nutrients/:nutrientCode/deficiency-images', async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const { 
            image_filename,
            image_url,
            caption,
            deficiency_stage = 'moderate',
            plant_type,
            crop_specific
        } = req.body;
        
        if (!image_filename && !image_url) {
            return res.status(400).json({
                success: false,
                error: 'Either image_filename or image_url is required'
            });
        }
        
        const pool = getDatabase();
        
        // Get nutrient ID
        const [nutrientRows] = await pool.execute(
            'SELECT id FROM nutrients WHERE code = ?',
            [nutrientCode]
        );
        
        if (nutrientRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient not found'
            });
        }
        
        const nutrientId = nutrientRows[0].id;
        
        // Insert deficiency image record
        const [result] = await pool.execute(`
            INSERT INTO nutrient_deficiency_images (
                nutrient_id, image_filename, image_url, caption,
                deficiency_stage, plant_type, crop_specific, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, true)
        `, [
            nutrientId, image_filename, image_url, caption,
            deficiency_stage, plant_type, crop_specific
        ]);
        
        res.json({
            success: true,
            message: 'Deficiency image added successfully',
            image_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error adding deficiency image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add deficiency image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all nutrients with basic info (for modal triggers)
router.get('/nutrients-summary', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [nutrients] = await pool.execute(`
            SELECT 
                n.code,
                n.name,
                n.symbol,
                n.unit,
                n.mobility,
                n.is_essential,
                COUNT(DISTINCT ndi.id) as deficiency_images_count,
                COUNT(DISTINCT nc.id) as competition_count
            FROM nutrients n
            LEFT JOIN nutrient_deficiency_images ndi ON n.id = ndi.nutrient_id AND ndi.is_active = true
            LEFT JOIN nutrient_competition nc ON n.id = nc.primary_nutrient_id
            GROUP BY n.id
            ORDER BY n.is_essential DESC, n.code
        `);
        
        res.json({
            success: true,
            count: nutrients.length,
            data: nutrients
        });
        
    } catch (error) {
        console.error('Error fetching nutrients summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch nutrients summary',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ========================
// Deficiency Image Management Endpoints
// ========================

// Get all deficiency images for a specific nutrient
router.get('/admin/nutrients/:nutrientCode/deficiency-images', async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const pool = getDatabase();
        
        const [images] = await pool.execute(`
            SELECT 
                ndi.id,
                ndi.image_filename,
                ndi.image_url,
                ndi.caption,
                ndi.deficiency_stage,
                ndi.plant_type,
                ndi.crop_specific,
                ndi.plant_id,
                ndi.system_id,
                ndi.grow_bed_id,
                ndi.is_active,
                ndi.uploaded_at,
                n.code as nutrient_code,
                n.name as nutrient_name
            FROM nutrient_deficiency_images ndi
            JOIN nutrients n ON ndi.nutrient_id = n.id
            WHERE n.code = ? AND ndi.is_active = true
            ORDER BY ndi.deficiency_stage, ndi.uploaded_at DESC
        `, [nutrientCode]);
        
        res.json({
            success: true,
            nutrient_code: nutrientCode,
            count: images.length,
            data: images
        });
        
    } catch (error) {
        console.error('Error fetching deficiency images:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch deficiency images',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all deficiency images (admin overview)
router.get('/admin/deficiency-images', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [images] = await pool.execute(`
            SELECT 
                ndi.id,
                ndi.image_filename,
                ndi.image_url,
                ndi.caption,
                ndi.deficiency_stage,
                ndi.plant_type,
                ndi.crop_specific,
                ndi.plant_id,
                ndi.system_id,
                ndi.grow_bed_id,
                ndi.is_active,
                ndi.uploaded_at,
                n.code as nutrient_code,
                n.name as nutrient_name,
                c.name as crop_name
            FROM nutrient_deficiency_images ndi
            JOIN nutrients n ON ndi.nutrient_id = n.id
            LEFT JOIN crops c ON ndi.plant_id = c.id
            WHERE ndi.is_active = true
            ORDER BY n.code, ndi.deficiency_stage, ndi.uploaded_at DESC
        `);
        
        console.log('🔍 Raw DB result:', JSON.stringify(images[0], null, 2));
        
        const response = {
            success: true,
            count: images.length,
            data: images
        };
        
        console.log('🔍 API response:', JSON.stringify(response.data[0], null, 2));
        
        response.debug_endpoint = "REBUILT_API_V2";
        res.json(response);
        
    } catch (error) {
        console.error('Error loading deficiency images:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load deficiency images'
        });
    }
});

// Add new deficiency image with file upload
router.post('/admin/nutrients/:nutrientCode/deficiency-images/upload', upload.single('deficiency_image'), async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const { 
            caption, 
            deficiency_stage, 
            plant_type, 
            crop_specific,
            plant_id,
            system_id,
            grow_bed_id
        } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }
        
        const pool = getDatabase();
        
        // Get nutrient ID and name
        const [nutrientResult] = await pool.execute(
            'SELECT id, name FROM nutrients WHERE code = ?',
            [nutrientCode]
        );
        
        if (nutrientResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient not found'
            });
        }
        
        const nutrientId = nutrientResult[0].id;
        const nutrientName = nutrientResult[0].name;
        
        // Create image URL (relative path for web access)
        const imageUrl = `/images/deficiencies/${req.file.filename}`;
        
        // Auto-generate caption if not provided
        const finalCaption = caption || `${nutrientName} deficiency - ${deficiency_stage} stage${crop_specific ? ` in ${crop_specific}` : ''}`;
        
        // Insert new deficiency image with uploaded file info and plant association
        const [result] = await pool.execute(`
            INSERT INTO nutrient_deficiency_images 
            (nutrient_id, image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific, plant_id, system_id, grow_bed_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nutrientId, req.file.filename, imageUrl, finalCaption, deficiency_stage, plant_type || null, crop_specific || null, plant_id || null, system_id || null, grow_bed_id || null]);
        
        res.json({
            success: true,
            message: 'Deficiency image uploaded successfully',
            image_id: result.insertId,
            filename: req.file.filename,
            image_url: imageUrl
        });
        
    } catch (error) {
        console.error('Error uploading deficiency image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload deficiency image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add new deficiency image (manual URL entry)
router.post('/admin/nutrients/:nutrientCode/deficiency-images', async (req, res) => {
    try {
        const { nutrientCode } = req.params;
        const { 
            image_filename, 
            image_url, 
            caption, 
            deficiency_stage, 
            plant_type, 
            crop_specific,
            plant_id,
            system_id,
            grow_bed_id
        } = req.body;
        
        const pool = getDatabase();
        
        // Get nutrient ID
        const [nutrientResult] = await pool.execute(
            'SELECT id FROM nutrients WHERE code = ?',
            [nutrientCode]
        );
        
        if (nutrientResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nutrient not found'
            });
        }
        
        const nutrientId = nutrientResult[0].id;
        
        // Insert new deficiency image with plant association
        const [result] = await pool.execute(`
            INSERT INTO nutrient_deficiency_images 
            (nutrient_id, image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific, plant_id, system_id, grow_bed_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nutrientId, image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific, plant_id || null, system_id || null, grow_bed_id || null]);
        
        res.json({
            success: true,
            message: 'Deficiency image added successfully',
            image_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error adding deficiency image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add deficiency image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update deficiency image
router.put('/admin/deficiency-images/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        console.log('🔄 PUT deficiency image update request:', imageId);
        console.log('📤 Request body:', req.body);
        
        const { 
            image_filename, 
            image_url, 
            caption, 
            deficiency_stage, 
            plant_type, 
            crop_specific,
            plant_id,
            system_id,
            grow_bed_id
        } = req.body;
        
        console.log('🌱 Plant ID from request:', plant_id);
        
        const pool = getDatabase();
        
        const [result] = await pool.execute(`
            UPDATE nutrient_deficiency_images 
            SET image_filename = ?, image_url = ?, caption = ?, 
                deficiency_stage = ?, plant_type = ?, crop_specific = ?,
                plant_id = ?, system_id = ?, grow_bed_id = ?
            WHERE id = ?
        `, [image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific, plant_id || null, system_id || null, grow_bed_id || null, imageId]);
        
        console.log('✅ Database update result:', result);
        console.log('📊 Affected rows:', result.affectedRows);
        
        if (result.affectedRows === 0) {
            console.log('❌ No rows affected - image not found');
            return res.status(404).json({
                success: false,
                error: 'Deficiency image not found'
            });
        }
        
        console.log('✅ Deficiency image updated successfully');
        
        res.json({
            success: true,
            message: 'Deficiency image updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating deficiency image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update deficiency image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete deficiency image (soft delete)
router.delete('/admin/deficiency-images/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        const pool = getDatabase();
        
        const [result] = await pool.execute(`
            UPDATE nutrient_deficiency_images 
            SET is_active = false
            WHERE id = ?
        `, [imageId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Deficiency image not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Deficiency image deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting deficiency image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete deficiency image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;