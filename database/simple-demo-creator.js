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
                `INSERT INTO fish_tanks (system_id, tank_number, name, volume, unit, fish_type) 
                 VALUES 
                 (?, 1, 'Tank 1', 3500, 'liters', 'tilapia'),
                 (?, 2, 'Tank 2', 3500, 'liters', 'tilapia')`,
                [systemId, systemId]
            );

            // Create two grow beds
            await this.mysql.execute(
                `INSERT INTO grow_beds (system_id, bed_number, bed_name, type, area_m2, depth, volume) 
                 VALUES 
                 (?, 1, 'Grow Bed 1', 'media', 2.0, 0.3, 600),
                 (?, 2, 'Grow Bed 2', 'media', 2.0, 0.4, 800)`,
                [systemId, systemId]
            );

            // Add some sample water quality data (last 7 days)
            const waterQualityData = [];
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');
                
                // Generate realistic values with slight variations
                const ph = (7.0 + Math.random() * 0.4).toFixed(2);
                const temperature = (24 + Math.random() * 2).toFixed(1);
                const dissolvedOxygen = (6 + Math.random() * 2).toFixed(1);
                const ammonia = (Math.random() * 0.25).toFixed(2);
                
                waterQualityData.push([
                    systemId, dateStr, temperature, ph, dissolvedOxygen, ammonia, null, null
                ]);
            }

            if (waterQualityData.length > 0) {
                await this.mysql.query(
                    `INSERT INTO water_quality 
                     (system_id, date, temperature, ph, dissolved_oxygen, ammonia, nitrite, nitrate) 
                     VALUES ?`,
                    [waterQualityData]
                );
            }

            // Add sample fish inventory
            await this.mysql.execute(
                `INSERT INTO fish_inventory (system_id, tank_id, fish_count, average_weight, total_biomass, date) 
                 SELECT ?, id, 100, 250, 25000, NOW() FROM fish_tanks WHERE system_id = ?`,
                [systemId, systemId]
            );

            // Add sample plant allocation
            await this.mysql.execute(
                `INSERT INTO plant_allocations (system_id, grow_bed_id, crop_type, allocated_area, plant_count) 
                 SELECT ?, gb.id, 'lettuce', 1.0, 20 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 1
                 UNION ALL
                 SELECT ?, gb.id, 'basil', 1.0, 15 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 2`,
                [systemId, systemId, systemId, systemId]
            );

            // Add some sample plant growth data
            await this.mysql.execute(
                `INSERT INTO plant_data (system_id, grow_bed_id, batch_id, crop_type, plant_date, plant_count, growth_stage) 
                 SELECT ?, gb.id, CONCAT('batch_', UNIX_TIMESTAMP()), 'lettuce', DATE_SUB(NOW(), INTERVAL 14 DAY), 20, 'vegetative' 
                 FROM grow_beds gb WHERE gb.system_id = ? AND gb.bed_number = 1
                 UNION ALL
                 SELECT ?, gb.id, CONCAT('batch_', UNIX_TIMESTAMP()+1), 'basil', DATE_SUB(NOW(), INTERVAL 7 DAY), 15, 'seedling' 
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
                    plant_data: 2
                }
            };

        } catch (error) {
            console.error('Error creating demo system:', error);
            throw error;
        }
    }
}

module.exports = SimpleDemoCreator;