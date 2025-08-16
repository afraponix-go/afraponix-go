const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all grow beds for a system
router.get('/system/:systemId', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        const [growBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
            [req.params.systemId]
        );        res.json(growBeds);

    } catch (error) {
        console.error('Error fetching grow beds:', error);
        res.status(500).json({ error: 'Failed to fetch grow beds' });
    }
});

// Create or update grow beds for a system
router.post('/system/:systemId', async (req, res) => {
    const { growBeds } = req.body;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Get existing grow beds for this system
        const [existingBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number',
            [req.params.systemId]
        );

        // Create a map of existing beds by bed_number for quick lookup
        const existingBedMap = new Map();
        existingBeds.forEach(bed => {
            existingBedMap.set(bed.bed_number, bed);
        });

        // Process each bed in the request
        for (const bed of growBeds) {
            // Convert undefined values to null for proper SQL handling
            const cleanBed = {
                bed_type: bed.bed_type ?? null,
                bed_name: bed.bed_name ?? null,
                volume_liters: bed.volume_liters ?? null,
                area_m2: bed.area_m2 ?? null,
                length_meters: bed.length_meters ?? null,
                width_meters: bed.width_meters ?? null,
                height_meters: bed.height_meters ?? null,
                plant_capacity: bed.plant_capacity ?? null,
                vertical_count: bed.vertical_count ?? null,
                plants_per_vertical: bed.plants_per_vertical ?? null,
                equivalent_m2: bed.equivalent_m2 ?? null,
                reservoir_volume: bed.reservoir_volume ?? null,
                trough_length: bed.trough_length ?? null,
                trough_count: bed.trough_count ?? null,
                plant_spacing: bed.plant_spacing ?? null,
                reservoir_volume_liters: bed.reservoir_volume_liters ?? null
            };
            
            const existingBed = existingBedMap.get(bed.bed_number);
            
            if (existingBed) {
                // Update existing bed (preserve ID)
                await pool.execute(`UPDATE grow_beds SET 
                    bed_type = ?, bed_name = ?, volume_liters = ?, area_m2 = ?, 
                    length_meters = ?, width_meters = ?, height_meters = ?, 
                    plant_capacity = ?, vertical_count = ?, plants_per_vertical = ?, 
                    equivalent_m2 = ?, reservoir_volume = ?, trough_length = ?, 
                    trough_count = ?, plant_spacing = ?, reservoir_volume_liters = ?
                    WHERE id = ?`, [
                    cleanBed.bed_type, cleanBed.bed_name, cleanBed.volume_liters, cleanBed.area_m2, 
                    cleanBed.length_meters, cleanBed.width_meters, cleanBed.height_meters, cleanBed.plant_capacity, 
                    cleanBed.vertical_count, cleanBed.plants_per_vertical, cleanBed.equivalent_m2, cleanBed.reservoir_volume,
                    cleanBed.trough_length, cleanBed.trough_count, cleanBed.plant_spacing, cleanBed.reservoir_volume_liters, 
                    existingBed.id
                ]);
            } else {
                // Insert new bed
                await pool.execute(`INSERT INTO grow_beds 
                    (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, length_meters, width_meters, height_meters, 
                     plant_capacity, vertical_count, plants_per_vertical, equivalent_m2, reservoir_volume, 
                     trough_length, trough_count, plant_spacing, reservoir_volume_liters) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    req.params.systemId, bed.bed_number, cleanBed.bed_type, cleanBed.bed_name, cleanBed.volume_liters, 
                    cleanBed.area_m2, cleanBed.length_meters, cleanBed.width_meters, cleanBed.height_meters, cleanBed.plant_capacity, 
                    cleanBed.vertical_count, cleanBed.plants_per_vertical, cleanBed.equivalent_m2, cleanBed.reservoir_volume,
                    cleanBed.trough_length, cleanBed.trough_count, cleanBed.plant_spacing, cleanBed.reservoir_volume_liters
                ]);
            }
        }

        // Delete beds that are no longer needed (beds not in the new configuration)
        const newBedNumbers = growBeds.map(bed => bed.bed_number);
        for (const existingBed of existingBeds) {
            if (!newBedNumbers.includes(existingBed.bed_number)) {
                await pool.execute(
                    'DELETE FROM grow_beds WHERE id = ?',
                    [existingBed.id]
                );
            }
        }

        // Get the final grow beds
        const [updatedBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number',
            [req.params.systemId]
        );        res.json(updatedBeds);

    } catch (error) {
        console.error('Error saving grow beds:', error);
        console.error('Error details:', error.message);
        console.error('Request data:', JSON.stringify(req.body, null, 2));
        console.error('System ID:', req.params.systemId);
        res.status(500).json({ 
            error: 'Failed to save grow beds',
            details: error.message,
            code: error.code 
        });
    }
});

// Update a single grow bed
router.put('/bed/:systemId/:bedNumber', async (req, res) => {
    const { systemId, bedNumber } = req.params;
    const bedConfig = req.body;
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Check if bed exists
        const [existingBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? AND bed_number = ?',
            [systemId, bedNumber]
        );
        const existingBed = existingBeds[0];

        if (existingBed) {
            // Update existing bed
            await pool.execute(`UPDATE grow_beds SET 
                bed_type = ?, bed_name = ?, volume_liters = ?, area_m2 = ?, 
                length_meters = ?, width_meters = ?, height_meters = ?, 
                plant_capacity = ?, vertical_count = ?, plants_per_vertical = ?, 
                equivalent_m2 = ?, reservoir_volume = ?, trough_length = ?, 
                trough_count = ?, plant_spacing = ?, reservoir_volume_liters = ?
                WHERE system_id = ? AND bed_number = ?`, [
                bedConfig.bed_type, bedConfig.bed_name, bedConfig.volume_liters, 
                bedConfig.area_m2, bedConfig.length_meters, bedConfig.width_meters, 
                bedConfig.height_meters, bedConfig.plant_capacity, bedConfig.vertical_count, 
                bedConfig.plants_per_vertical, bedConfig.equivalent_m2, bedConfig.reservoir_volume,
                bedConfig.trough_length, bedConfig.trough_count, bedConfig.plant_spacing, 
                bedConfig.reservoir_volume_liters, systemId, bedNumber
            ]);
        } else {
            // Insert new bed
            await pool.execute(`INSERT INTO grow_beds 
                (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, 
                 length_meters, width_meters, height_meters, plant_capacity, vertical_count, 
                 plants_per_vertical, equivalent_m2, reservoir_volume, trough_length, 
                 trough_count, plant_spacing, reservoir_volume_liters) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                systemId, bedConfig.bed_number, bedConfig.bed_type, bedConfig.bed_name, 
                bedConfig.volume_liters, bedConfig.area_m2, bedConfig.length_meters, 
                bedConfig.width_meters, bedConfig.height_meters, bedConfig.plant_capacity, 
                bedConfig.vertical_count, bedConfig.plants_per_vertical, bedConfig.equivalent_m2, 
                bedConfig.reservoir_volume, bedConfig.trough_length, bedConfig.trough_count, 
                bedConfig.plant_spacing, bedConfig.reservoir_volume_liters
            ]);
        }

        // Return the updated/created bed
        const [updatedBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? AND bed_number = ?',
            [systemId, bedNumber]
        );
        const updatedBed = updatedBeds[0];        res.json(updatedBed);

    } catch (error) {
        console.error('Error updating grow bed:', error);
        res.status(500).json({ error: 'Failed to update grow bed' });
    }
});

// Delete a specific grow bed
router.delete('/:bedId', async (req, res) => {
    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        const [result] = await pool.execute(
            'DELETE FROM grow_beds WHERE id = ?',
            [req.params.bedId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Grow bed not found' });
        }

        res.json({ message: 'Grow bed deleted successfully' });

    } catch (error) {
        console.error('Error deleting grow bed:', error);
        res.status(500).json({ error: 'Failed to delete grow bed' });
    }
});

module.exports = router;