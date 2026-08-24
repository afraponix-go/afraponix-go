const express = require('express');
const crypto = require('crypto');
const { getDatabase, getDatabaseConnection } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem } = require('../utils/systemAccess');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Confirm the authenticated user owns the given system.
async function verifyOwnership(pool, systemId, userId, write = false) {
    return canAccessSystem(systemId, userId, { write }, pool);
}

// Get plant allocations for a system
router.get('/allocations/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, req.params.systemId, req.user.userId))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        const [allocations] = await pool.execute(`
            SELECT pa.*, gb.bed_name, gb.bed_type, gb.equivalent_m2
            FROM plant_allocations pa
            LEFT JOIN grow_beds gb ON pa.grow_bed_id = gb.id
            WHERE pa.system_id = ?
            ORDER BY gb.bed_number, pa.crop_type
        `, [req.params.systemId]);

        res.json(allocations);

    } catch (error) {
        console.error('Error fetching plant allocations:', error);
        res.status(500).json({ error: 'Failed to fetch plant allocations' });
    }
});

// Server-side batch aggregation. Plants are event-sourced in plant_growth; a
// "batch" is all rows sharing a batch_id. We aggregate planted vs harvested
// here so the client consumes clean batch objects instead of re-deriving them.
router.get('/batches/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, req.params.systemId, req.user.userId))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        const [rows] = await pool.execute(`
            SELECT
                pg.batch_id,
                MAX(pg.crop_type)                                   AS crop_type,
                gb.id                                               AS grow_bed_id,
                gb.bed_name, gb.bed_type, gb.bed_number,
                MAX(pg.seed_variety)                                AS seed_variety,
                MAX(pg.days_to_harvest)                             AS days_to_harvest,
                MAX(pg.plants_per_m2)                               AS plants_per_m2,
                COALESCE(MIN(pg.batch_created_date), MIN(pg.date))  AS planted_date,
                MAX(pg.date)                                        AS last_event_date,
                -- Planting quantity: for non-harvest rows use new_seedlings, or
                -- fall back to count (legacy rows store the planting in count).
                -- Matches the old app's Beds Overview (new_seedlings || count).
                COALESCE(SUM(CASE WHEN COALESCE(pg.plants_harvested, 0) > 0 THEN 0
                                  ELSE COALESCE(NULLIF(pg.new_seedlings, 0), pg.count, 0) END), 0) AS planted,
                COALESCE(SUM(pg.plants_harvested), 0)               AS harvested,
                COALESCE(SUM(pg.harvest_weight), 0)                 AS harvest_weight_g
            FROM plant_growth pg
            LEFT JOIN grow_beds gb ON pg.grow_bed_id = gb.id
            WHERE pg.system_id = ? AND pg.batch_id IS NOT NULL AND pg.batch_id <> ''
            GROUP BY pg.batch_id, gb.id, gb.bed_name, gb.bed_type, gb.bed_number
            ORDER BY planted_date DESC
        `, [req.params.systemId]);

        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const batches = rows.map((r) => {
            const planted = Number(r.planted) || 0;
            const harvested = Number(r.harvested) || 0;
            const remaining = Math.max(0, planted - harvested);
            const dth = r.days_to_harvest != null ? Number(r.days_to_harvest) : null;
            // planted_date is a 'YYYY-MM-DD' string; parse at noon to avoid tz drift.
            const plantedMs = r.planted_date ? new Date(`${String(r.planted_date).slice(0, 10)}T12:00:00`).getTime() : null;
            const ageDays = plantedMs ? Math.max(0, Math.floor((now - plantedMs) / DAY)) : null;

            let status;
            if (remaining <= 0) status = 'harvested';
            else if (dth && ageDays != null && ageDays >= dth) status = 'ready';
            else if (dth && ageDays != null && ageDays >= 0.8 * dth) status = 'approaching';
            else status = 'growing';

            return {
                batch_id: r.batch_id,
                crop_type: r.crop_type,
                grow_bed_id: r.grow_bed_id,
                bed_name: r.bed_name,
                bed_type: r.bed_type,
                bed_number: r.bed_number,
                seed_variety: r.seed_variety,
                days_to_harvest: dth,
                plants_per_m2: r.plants_per_m2 != null ? Number(r.plants_per_m2) : null,
                planted_date: r.planted_date ? String(r.planted_date).slice(0, 10) : null,
                last_event_date: r.last_event_date ? String(r.last_event_date).slice(0, 10) : null,
                planted,
                harvested,
                remaining,
                harvest_weight_g: Number(r.harvest_weight_g) || 0,
                age_days: ageDays,
                status,
            };
        });

        res.json({ system_id: req.params.systemId, batches });

    } catch (error) {
        console.error('Error building plant batches:', error);
        res.status(500).json({ error: 'Failed to build plant batches' });
    }
});

// Transfer some/all of a plant batch to a bed in another system (or another bed
// via the same flow). Event-based, preserving history: the source batch gets a
// negative-count "transfer_out" event (reducing its remaining without counting as
// a harvest), and a NEW linked batch is opened in the destination — carrying the
// original planting date so age/days-to-harvest stay true. Both systems require
// write access. A stock_transfers row ties the two batches together.
router.post('/transfer', async (req, res) => {
    const { from_system_id, batch_id, to_system_id, to_bed_id } = req.body || {};
    const notes = req.body && req.body.notes ? String(req.body.notes).slice(0, 500) : null;
    if (!from_system_id || !batch_id || !to_system_id || !to_bed_id) {
        return res.status(400).json({ error: 'from_system_id, batch_id, to_system_id and to_bed_id are required' });
    }
    const pool = getDatabase();
    let conn;
    try {
        if (!(await verifyOwnership(pool, from_system_id, req.user.userId, true)) ||
            !(await verifyOwnership(pool, to_system_id, req.user.userId, true))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }
        const [srcRows] = await pool.execute(`
            SELECT MAX(crop_type) crop_type, MAX(seed_variety) seed_variety, MAX(days_to_harvest) days_to_harvest,
                   MAX(plants_per_m2) plants_per_m2, COALESCE(MIN(batch_created_date), MIN(date)) planted_date,
                   MAX(grow_bed_id) grow_bed_id,
                   COALESCE(SUM(CASE WHEN COALESCE(plants_harvested,0) > 0 THEN 0 ELSE COALESCE(NULLIF(new_seedlings,0), count, 0) END),0) planted,
                   COALESCE(SUM(plants_harvested),0) harvested
            FROM plant_growth WHERE system_id = ? AND batch_id = ?
        `, [from_system_id, batch_id]);
        const src = srcRows[0];
        if (!src || !src.crop_type) return res.status(404).json({ error: 'Batch not found' });
        const remaining = Math.max(0, Number(src.planted) - Number(src.harvested));
        let count = (req.body.count != null && req.body.count !== '') ? Math.round(Number(req.body.count)) : remaining;
        if (!(count > 0)) return res.status(400).json({ error: 'Nothing to transfer' });
        if (count > remaining) count = remaining;

        const [bedRows] = await pool.execute('SELECT id FROM grow_beds WHERE id = ? AND system_id = ?', [to_bed_id, to_system_id]);
        if (bedRows.length === 0) return res.status(400).json({ error: 'Destination bed not found in that system' });

        const newBatchId = `tr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`.slice(0, 100);
        const plantedDate = src.planted_date ? String(src.planted_date).slice(0, 10) : null;
        const dth = src.days_to_harvest != null ? src.days_to_harvest : null;

        conn = await getDatabaseConnection();
        await conn.query('START TRANSACTION');
        try {
            await conn.execute(
                `INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, plants_per_m2, new_seedlings, growth_stage, batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                 VALUES (?, ?, CURDATE(), ?, 0, ?, ?, 'transfer_out', ?, ?, ?, ?, ?)`,
                [from_system_id, src.grow_bed_id, src.crop_type, src.plants_per_m2, -count, batch_id, src.seed_variety, plantedDate, dth, `Transferred ${count} plant(s) out.${notes ? ' ' + notes : ''}`]
            );
            await conn.execute(
                `INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, plants_per_m2, new_seedlings, growth_stage, batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                 VALUES (?, ?, CURDATE(), ?, 0, ?, ?, 'transfer_in', ?, ?, ?, ?, ?)`,
                [to_system_id, to_bed_id, src.crop_type, src.plants_per_m2, count, newBatchId, src.seed_variety, plantedDate, dth, `Transferred ${count} plant(s) in.${notes ? ' ' + notes : ''}`]
            );
            await conn.execute(
                `INSERT INTO stock_transfers (kind, from_system_id, to_system_id, from_ref, to_ref, from_bed_id, to_bed_id, label, count, notes, moved_by)
                 VALUES ('plant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [from_system_id, to_system_id, batch_id, newBatchId, src.grow_bed_id, to_bed_id, src.crop_type, count, notes, req.user.userId]
            );
            await conn.query('COMMIT');
        } catch (e) {
            await conn.query('ROLLBACK').catch(() => {});
            throw e;
        }
        res.json({ success: true, new_batch_id: newBatchId, count });
    } catch (error) {
        console.error('Failed to transfer plant batch:', error);
        res.status(500).json({ error: 'Failed to transfer batch' });
    } finally {
        if (conn) await conn.end().catch(() => {});
    }
});

// Add or update plant allocation
router.post('/allocations', async (req, res) => {
    const { 
        systemId, 
        growBedId, 
        cropType, 
        percentageAllocated, 
        plantsPlanted,
        datePlanted,
        plantSpacing 
    } = req.body;

    if (!systemId || !growBedId || !cropType || !percentageAllocated) {
        return res.status(400).json({ 
            error: 'System ID, grow bed ID, crop type, and percentage are required' 
        });
    }

    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, systemId, req.user.userId, true))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Check if allocation already exists
        const [existingRows] = await pool.execute(
            'SELECT id FROM plant_allocations WHERE system_id = ? AND grow_bed_id = ? AND crop_type = ?',
            [systemId, growBedId, cropType]
        );

        if (existingRows.length > 0) {
            // Update existing allocation
            await pool.execute(`
                UPDATE plant_allocations 
                SET percentage_allocated = ?, plants_planted = ?, date_planted = ?, plant_spacing = ?
                WHERE id = ?
            `, [percentageAllocated, plantsPlanted || 0, datePlanted || null, plantSpacing || 30, existingRows[0].id]);
        } else {
            // Create new allocation
            await pool.execute(`
                INSERT INTO plant_allocations 
                (system_id, grow_bed_id, crop_type, percentage_allocated, plants_planted, date_planted, plant_spacing)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [systemId, growBedId, cropType, percentageAllocated, plantsPlanted || 0, datePlanted || null, plantSpacing || 30]);
        }

        res.json({ success: true, message: 'Plant allocation saved successfully' });

    } catch (error) {
        console.error('Error saving plant allocation:', error);
        res.status(500).json({ error: 'Failed to save plant allocation' });
    } finally {
    }
});

// Get custom crops for user
router.get('/custom-crops', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [crops] = await pool.execute(
            'SELECT * FROM custom_crops WHERE user_id = ? ORDER BY crop_name',
            [req.user.userId]
        );

        res.json(crops);

    } catch (error) {
        console.error('Error fetching custom crops:', error);
        res.status(500).json({ error: 'Failed to fetch custom crops' });
    } finally {
    }
});

// Get single custom crop by ID
router.get('/custom-crops/:id', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [crops] = await pool.execute(
            'SELECT * FROM custom_crops WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        if (crops.length === 0) {
            return res.status(404).json({ error: 'Custom crop not found' });
        }

        res.json(crops[0]);

    } catch (error) {
        console.error('Error fetching custom crop:', error);
        res.status(500).json({ error: 'Failed to fetch custom crop' });
    }
});

// Update custom crop
router.put('/custom-crops/:id', async (req, res) => {
    const {
        cropName, cropCode, scientificName,
        targetN, targetP, targetK, targetCa, targetMg, targetFe, targetEc,
        ecMin, ecMax, category, plantSpacing, growthDays, difficulty, season, description,
        germinationDays, daysToTransplant
    } = req.body;

    if (!cropName) {
        return res.status(400).json({ error: 'Crop name is required' });
    }
    const nn = (v) => (v === undefined || v === '' ? null : v);

    try {
        const pool = getDatabase();

        // Check if crop exists and belongs to user
        const [existing] = await pool.execute(
            'SELECT id FROM custom_crops WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Custom crop not found' });
        }

        await pool.execute(`
            UPDATE custom_crops
            SET crop_name = ?, crop_code = ?, scientific_name = ?,
                target_n = ?, target_p = ?, target_k = ?, target_ca = ?, target_mg = ?, target_fe = ?, target_ec = ?,
                ec_min = ?, ec_max = ?, category = ?, plant_spacing = ?, growth_days = ?, difficulty = ?,
                season = ?, description = ?, germination_days = ?, days_to_transplant = ?
            WHERE id = ? AND user_id = ?
        `, [cropName, nn(cropCode), nn(scientificName),
            nn(targetN), nn(targetP), nn(targetK), nn(targetCa), nn(targetMg), nn(targetFe), nn(targetEc),
            nn(ecMin), nn(ecMax), nn(category), nn(plantSpacing), nn(growthDays), nn(difficulty),
            nn(season), nn(description), nn(germinationDays), nn(daysToTransplant), req.params.id, req.user.userId]);

        res.json({ success: true, message: 'Custom crop updated successfully' });

    } catch (error) {
        console.error('Error updating custom crop:', error);
        res.status(500).json({ error: 'Failed to update custom crop' });
    }
});

// Get seed varieties
router.get('/seed-varieties', async (req, res) => {
    try {
        const pool = getDatabase();
        
        const [varieties] = await pool.execute(
            'SELECT * FROM seed_varieties ORDER BY crop_type, variety_name'
        );

        res.json(varieties);

    } catch (error) {
        console.error('Error fetching seed varieties:', error);
        res.status(500).json({ error: 'Failed to fetch seed varieties' });
    }
});

// Submit custom crop to global database (for future implementation)
router.post('/custom-crops/:id/submit-global', async (req, res) => {
    try {
        const pool = getDatabase();
        
        // Check if crop exists and belongs to user
        const [crop] = await pool.execute(
            'SELECT * FROM custom_crops WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        if (crop.length === 0) {
            return res.status(404).json({ error: 'Custom crop not found' });
        }

        // For now, just log the submission request
        console.log(`User ${req.user.userId} submitted custom crop "${crop[0].crop_name}" to global database`);
        
        // TODO: Implement actual submission to global/admin database
        // This could involve copying to an admin review table

        res.json({ 
            success: true, 
            message: 'Custom crop submitted for review. It will be available globally once approved.' 
        });

    } catch (error) {
        console.error('Error submitting to global database:', error);
        res.status(500).json({ error: 'Failed to submit to global database' });
    }
});

// Bulk import custom crops
router.post('/custom-crops/bulk-import', async (req, res) => {
    const { crops } = req.body;

    if (!Array.isArray(crops) || crops.length === 0) {
        return res.status(400).json({ error: 'Crops array is required' });
    }

    try {
        const pool = getDatabase();
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const crop of crops) {
            try {
                if (!crop.cropName) {
                    skipped++;
                    errors.push(`Crop missing name: ${JSON.stringify(crop)}`);
                    continue;
                }

                await pool.execute(`
                    INSERT INTO custom_crops 
                    (user_id, crop_name, target_n, target_p, target_k, target_ca, target_mg, target_fe, target_ec,
                     category, plant_spacing, growth_days, difficulty, season, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [req.user.userId, crop.cropName, crop.targetN || 0, crop.targetP || 0, crop.targetK || 0,
                    crop.targetCa || 0, crop.targetMg || 0, crop.targetFe || 0, crop.targetEc || 0,
                    crop.category || 'leafy_greens', crop.plantSpacing || 15, crop.growthDays || 30,
                    crop.difficulty || 'beginner', crop.season || 'year_round', crop.description || '']);
                
                imported++;
            } catch (cropError) {
                skipped++;
                errors.push(`Error importing ${crop.cropName}: ${cropError.message}`);
            }
        }

        res.json({ 
            success: true, 
            imported, 
            skipped,
            errors: errors.slice(0, 10), // Limit error messages
            message: `Imported ${imported} crops, skipped ${skipped}` 
        });

    } catch (error) {
        console.error('Error bulk importing crops:', error);
        res.status(500).json({ error: 'Failed to bulk import crops' });
    }
});

// Add custom crop
router.post('/custom-crops', async (req, res) => {
    const {
        cropName, cropCode, scientificName,
        targetN, targetP, targetK, targetCa, targetMg, targetFe, targetEc,
        ecMin, ecMax, category, plantSpacing, growthDays, difficulty, season, description,
        germinationDays, daysToTransplant
    } = req.body;

    if (!cropName) {
        return res.status(400).json({ error: 'Crop name is required' });
    }
    const nn = (v) => (v === undefined || v === '' ? null : v);
    const code = cropCode || cropName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    try {
        const pool = getDatabase();

        const [result] = await pool.execute(`
            INSERT INTO custom_crops
            (user_id, crop_name, crop_code, scientific_name, target_n, target_p, target_k, target_ca, target_mg, target_fe, target_ec,
             ec_min, ec_max, category, plant_spacing, growth_days, difficulty, season, description, germination_days, days_to_transplant)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.userId, cropName, code, nn(scientificName), targetN || 0, targetP || 0, targetK || 0, targetCa || 0,
            targetMg || 0, targetFe || 0, targetEc || 0, nn(ecMin), nn(ecMax), category || 'leafy_greens',
            plantSpacing || 15, growthDays || 30, difficulty || 'beginner',
            season || 'year_round', description || '', nn(germinationDays), nn(daysToTransplant)]);

        res.json({ success: true, id: result.insertId, message: 'Custom crop added successfully' });

    } catch (error) {
        console.error('Error adding custom crop:', error);
        res.status(500).json({ error: 'Failed to add custom crop' });
    } finally {
    }
});

// Update plant allocation
router.put('/allocations/:id', async (req, res) => {
    const { cropType, percentageAllocated, plantsPlanted } = req.body;
    const allocationId = req.params.id;

    if (!cropType || percentageAllocated === undefined) {
        return res.status(400).json({ 
            error: 'Crop type and percentage are required' 
        });
    }

    try {
        const pool = getDatabase();

        // Ownership: the allocation must belong to a system owned by the user.
        const [owned] = await pool.execute(
            'SELECT pa.id FROM plant_allocations pa JOIN systems s ON pa.system_id = s.id WHERE pa.id = ? AND s.user_id = ?',
            [allocationId, req.user.userId]
        );
        if (owned.length === 0) {
            return res.status(404).json({ error: 'Allocation not found or access denied' });
        }

        await pool.execute(`
            UPDATE plant_allocations
            SET crop_type = ?, percentage_allocated = ?, plants_planted = ?
            WHERE id = ?
        `, [cropType, percentageAllocated, plantsPlanted || 0, allocationId]);

        res.json({ success: true, message: 'Plant allocation updated successfully' });

    } catch (error) {
        console.error('Error updating plant allocation:', error);
        res.status(500).json({ error: 'Failed to update plant allocation' });
    } finally {
    }
});

// Delete plant allocation
router.delete('/allocations/:id', async (req, res) => {
    try {
        const pool = getDatabase();

        const [owned] = await pool.execute(
            'SELECT pa.id FROM plant_allocations pa JOIN systems s ON pa.system_id = s.id WHERE pa.id = ? AND s.user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (owned.length === 0) {
            return res.status(404).json({ error: 'Allocation not found or access denied' });
        }

        await pool.execute('DELETE FROM plant_allocations WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'Plant allocation removed successfully' });

    } catch (error) {
        console.error('Error deleting plant allocation:', error);
        res.status(500).json({ error: 'Failed to delete plant allocation' });
    } finally {
    }
});

// Delete custom crop
router.delete('/custom-crops/:id', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        await pool.execute(
            'DELETE FROM custom_crops WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        res.json({ success: true, message: 'Custom crop deleted successfully' });

    } catch (error) {
        console.error('Error deleting custom crop:', error);
        res.status(500).json({ error: 'Failed to delete custom crop' });
    } finally {
    }
});

// Get grow bed utilization summary
router.get('/utilization/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, req.params.systemId, req.user.userId))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        const [utilization] = await pool.execute(`
            SELECT 
                gb.id,
                gb.bed_name,
                gb.bed_type,
                gb.equivalent_m2,
                COALESCE(SUM(pa.percentage_allocated), 0) as total_allocated,
                (100 - COALESCE(SUM(pa.percentage_allocated), 0)) as available_percentage
            FROM grow_beds gb
            LEFT JOIN plant_allocations pa ON gb.id = pa.grow_bed_id AND pa.status = 'active'
            WHERE gb.system_id = ?
            GROUP BY gb.id, gb.bed_name, gb.bed_type, gb.equivalent_m2
            ORDER BY gb.bed_number
        `, [req.params.systemId]);

        res.json(utilization);

    } catch (error) {
        console.error('Error fetching utilization data:', error);
        res.status(500).json({ error: 'Failed to fetch utilization data' });
    } finally {
    }
});

module.exports = router;