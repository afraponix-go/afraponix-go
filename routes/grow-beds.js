const express = require('express');
const { getDatabase } = require('../database/init-mariadb');
const { authenticateToken } = require('../middleware/auth');
const { canAccessSystem } = require('../utils/systemAccess');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Confirm the authenticated user owns the given system.
async function verifyOwnership(pool, systemId, userId, write = false) {
    return canAccessSystem(systemId, userId, { write }, pool);
}

// Get all grow beds for a system
router.get('/system/:systemId', async (req, res) => {
    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, req.params.systemId, req.user.userId))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        const [growBeds] = await pool.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? ORDER BY bed_number',
            [req.params.systemId]
        );
        res.json(growBeds);

    } catch (error) {
        console.error('Error fetching grow beds:', error);
        res.status(500).json({ error: 'Failed to fetch grow beds' });
    }
});

// Create or update grow beds for a system
router.post('/system/:systemId', async (req, res) => {
    const { growBeds } = req.body;
    // Using connection pool - no manual connection management

    // Beds missing from the payload are deleted further down, so a non-array
    // body must be rejected before anything is read or written.
    if (!Array.isArray(growBeds)) {
        return res.status(400).json({ error: 'growBeds must be an array' });
    }

    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, req.params.systemId, req.user.userId, true))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

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
                volume_liters: bed.volume_liters ?? 0,
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

            // Calculate equivalent_m2 if not provided or is 0
            if (!cleanBed.equivalent_m2 || cleanBed.equivalent_m2 === 0) {
                const bedType = (cleanBed.bed_type || '').toLowerCase();
                const length = parseFloat(cleanBed.length_meters) || 0;
                const width = parseFloat(cleanBed.width_meters) || 0;
                const verticalCount = parseFloat(cleanBed.vertical_count) || 0;
                const plantsPerVertical = parseFloat(cleanBed.plants_per_vertical) || 0;
                const troughLength = parseFloat(cleanBed.trough_length) || 0;
                const troughCount = parseFloat(cleanBed.trough_count) || 0;
                const plantSpacing = parseFloat(cleanBed.plant_spacing) || 0;

                switch (bedType) {
                    case 'dwc':
                    case 'deep_water_culture':
                    case 'ebb_flow':
                    case 'flood_drain':
                        if (length > 0 && width > 0) {
                            cleanBed.equivalent_m2 = length * width;
                        }
                        break;

                    case 'vertical':
                        if (verticalCount > 0 && plantsPerVertical > 0) {
                            const totalPlants = verticalCount * plantsPerVertical;
                            cleanBed.equivalent_m2 = totalPlants / 25;
                        }
                        break;

                    case 'nft':
                        if (troughLength > 0 && plantSpacing > 0 && troughCount > 0) {
                            const plantsPerTrough = Math.floor(troughLength / (plantSpacing / 100));
                            const totalPlants = plantsPerTrough * troughCount;
                            cleanBed.equivalent_m2 = totalPlants / 25;
                        }
                        break;

                    default:
                        if (length > 0 && width > 0) {
                            cleanBed.equivalent_m2 = length * width;
                        }
                }
            }

            // equivalent_m2 is NOT NULL in the schema; never let it fall through as null.
            cleanBed.equivalent_m2 = cleanBed.equivalent_m2 ?? 0;

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
        // Details stay in the server log — echoing the driver's error message
        // and code back to the caller discloses schema internals.
        res.status(500).json({ error: 'Failed to save grow beds' });
    }
});

// Update a single grow bed
router.put('/bed/:systemId/:bedNumber', async (req, res) => {
    const { systemId, bedNumber } = req.params;
    const bedConfig = req.body;

    try {
        const pool = getDatabase();

        if (!(await verifyOwnership(pool, systemId, req.user.userId, true))) {
            return res.status(404).json({ error: 'System not found or access denied' });
        }

        // Calculate equivalent_m2 if not provided or is 0
        if (!bedConfig.equivalent_m2 || bedConfig.equivalent_m2 === 0) {
            const bedType = (bedConfig.bed_type || '').toLowerCase();
            const length = parseFloat(bedConfig.length_meters) || 0;
            const width = parseFloat(bedConfig.width_meters) || 0;
            const verticalCount = parseFloat(bedConfig.vertical_count) || 0;
            const plantsPerVertical = parseFloat(bedConfig.plants_per_vertical) || 0;
            const troughLength = parseFloat(bedConfig.trough_length) || 0;
            const troughCount = parseFloat(bedConfig.trough_count) || 0;
            const plantSpacing = parseFloat(bedConfig.plant_spacing) || 0;

            switch (bedType) {
                case 'dwc':
                case 'deep_water_culture':
                case 'ebb_flow':
                case 'flood_drain':
                    // Calculate from dimensions
                    if (length > 0 && width > 0) {
                        bedConfig.equivalent_m2 = length * width;
                    }
                    break;

                case 'vertical':
                    // Calculate based on number of plants (25 plants per m²)
                    if (verticalCount > 0 && plantsPerVertical > 0) {
                        const totalPlants = verticalCount * plantsPerVertical;
                        bedConfig.equivalent_m2 = totalPlants / 25;
                    }
                    break;

                case 'nft':
                    // Calculate based on trough length and plant spacing
                    if (troughLength > 0 && plantSpacing > 0 && troughCount > 0) {
                        const plantsPerTrough = Math.floor(troughLength / (plantSpacing / 100)); // Convert cm to m
                        const totalPlants = plantsPerTrough * troughCount;
                        bedConfig.equivalent_m2 = totalPlants / 25;
                    }
                    break;

                default:
                    // Default to length × width if available
                    if (length > 0 && width > 0) {
                        bedConfig.equivalent_m2 = length * width;
                    }
            }
        }

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
    try {
        const pool = getDatabase();

        // Ownership: the bed must belong to a system owned by the user.
        const [owned] = await pool.execute(
            'SELECT gb.id FROM grow_beds gb JOIN systems s ON gb.system_id = s.id WHERE gb.id = ? AND s.user_id = ?',
            [req.params.bedId, req.user.userId]
        );
        if (owned.length === 0) {
            return res.status(404).json({ error: 'Grow bed not found or access denied' });
        }

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