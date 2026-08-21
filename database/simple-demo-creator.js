/**
 * Simple Demo System Creator
 * 
 * Creates a basic demo system without relying on SQLite database
 * This is a fallback for when the SQLite demo database is not available
 */

class SimpleDemoCreator {
    constructor(mysqlConnection) {
        this.mysql = mysqlConnection;
    }

    async createDemoSystem(systemId, userId, systemName) {
        try {
            // Create the base system
            await this.mysql.execute(
                `INSERT INTO systems (id, user_id, system_name, system_type, fish_type, 
                 fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, 
                 total_grow_area, created_at) 
                 VALUES (?, ?, ?, 'media-bed', 'tilapia', 2, 7000, 2, 1600, 4.0, NOW())`,
                [systemId, userId, systemName]
            );

            // Create two fish tanks
            await this.mysql.execute(
                `INSERT INTO fish_tanks (system_id, tank_number, size_m3, volume_liters, fish_type, current_fish_count)
                 VALUES
                 (?, 1, 3.5, 3500, 'tilapia', 100),
                 (?, 2, 3.5, 3500, 'tilapia', 100)`,
                [systemId, systemId]
            );

            // Create two grow beds (equivalent_m2 is NOT NULL; for a media bed it
            // equals the grow area)
            await this.mysql.execute(
                `INSERT INTO grow_beds (system_id, bed_number, bed_name, bed_type, area_m2, equivalent_m2, height_meters, volume_liters)
                 VALUES
                 (?, 1, 'Grow Bed 1', 'media', 2.0, 2.0, 0.3, 600),
                 (?, 2, 'Grow Bed 2', 'media', 2.0, 2.0, 0.4, 800)`,
                [systemId, systemId]
            );

            // Water quality lives in nutrient_readings (one typed row per metric) —
            // that's what the app reads, not the legacy water_quality table. Seed
            // 7 days of core params there.
            const nutrientRows = [];
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const readingDate = `${date.toISOString().slice(0, 10)} 12:00:00`;
                const metrics = [
                    ['ph', (7.0 + Math.random() * 0.4).toFixed(2), ''],
                    ['temperature', (24 + Math.random() * 2).toFixed(1), '°C'],
                    ['dissolved_oxygen', (6 + Math.random() * 2).toFixed(1), 'mg/L'],
                    ['ammonia', (Math.random() * 0.25).toFixed(2), 'ppm'],
                    ['nitrate', (10 + Math.random() * 20).toFixed(0), 'ppm'],
                ];
                for (const [type, value, unit] of metrics) {
                    nutrientRows.push([systemId, type, value, unit, readingDate, 'demo', 'Demo system data']);
                }
            }

            if (nutrientRows.length > 0) {
                await this.mysql.query(
                    `INSERT INTO nutrient_readings
                     (system_id, nutrient_type, value, unit, reading_date, source, notes)
                     VALUES ?`,
                    [nutrientRows]
                );
            }

            // Add sample fish inventory (one row per tank)
            await this.mysql.execute(
                `INSERT INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, fish_type)
                 SELECT ?, id, 100, 250, fish_type FROM fish_tanks WHERE system_id = ?`,
                [systemId, systemId]
            );

            // Add sample plant allocation (percentage_allocated is a percent of the bed)
            await this.mysql.execute(
                `INSERT INTO plant_allocations (system_id, grow_bed_id, crop_type, percentage_allocated, plants_planted)
                 SELECT ?, gb.id, 'lettuce', 100.0, 20 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 1
                 UNION ALL
                 SELECT ?, gb.id, 'basil', 100.0, 15 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 2`,
                [systemId, systemId, systemId, systemId]
            );

            // Add some sample plant growth data. plant_growth is the event log
            // (there is no plant_data table); a planting sets new_seedlings/count.
            await this.mysql.execute(
                `INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, new_seedlings, growth_stage, batch_id, batch_created_date)
                 SELECT ?, gb.id, DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 14 DAY), '%Y-%m-%d'), 'lettuce', 20, 20, 'vegetative', CONCAT('batch_', UNIX_TIMESTAMP()), DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 14 DAY), '%Y-%m-%d')
                 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 1
                 UNION ALL
                 SELECT ?, gb.id, DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 7 DAY), '%Y-%m-%d'), 'basil', 15, 15, 'seedling', CONCAT('batch_', UNIX_TIMESTAMP() + 1), DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 7 DAY), '%Y-%m-%d')
                 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 2`,
                [systemId, systemId, systemId, systemId]
            );

            return {
                success: true,
                systemId: systemId,
                message: 'Demo system created successfully with sample data',
                imported: {
                    fish_tanks: 2,
                    grow_beds: 2,
                    water_quality: 7,
                    plant_allocations: 2,
                    plant_growth: 2
                }
            };

        } catch (error) {
            console.error('Error creating demo system:', error);
            throw error;
        }
    }
}

module.exports = SimpleDemoCreator;