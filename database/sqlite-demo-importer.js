/**
 * SQLite Demo Data Importer
 * 
 * Imports demo data from SQLite database into MySQL for new demo system creation
 * This replaces the complex MySQL-to-MySQL copying logic with simple, reliable imports
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DEMO_DB_PATH = path.join(__dirname, 'demo-data.sqlite');

class SQLiteDemoImporter {
    constructor(mysqlConnection) {
        this.mysql = mysqlConnection;
        this.sqlite = null;
    }

    async openSQLite() {
        return new Promise((resolve, reject) => {
            this.sqlite = new sqlite3.Database(DEMO_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(new Error(`Failed to open demo database: ${err.message}`));
                } else {
                    console.log('✅ Opened SQLite demo database');
                    resolve();
                }
            });
        });
    }

    async closeSQLite() {
        if (this.sqlite) {
            return new Promise((resolve, reject) => {
                this.sqlite.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('📚 Closed SQLite demo database');
                        resolve();
                    }
                });
            });
        }
    }

    async querySQLite(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.sqlite.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async calculateDateOffset() {
        // Find the maximum (most recent) date in the sample data to calculate offset
        const maxDates = await Promise.all([
            this.querySQLite('SELECT MAX(date) as max_date FROM water_quality'),
            this.querySQLite('SELECT MAX(date(reading_date)) as max_date FROM nutrient_readings'),
            this.querySQLite('SELECT MAX(date) as max_date FROM fish_health'),
            this.querySQLite('SELECT MAX(date) as max_date FROM plant_growth'),
            this.querySQLite('SELECT MAX(application_date) as max_date FROM spray_applications')
        ]);

        // Find the latest date across all tables
        let maxSampleDate = null;
        maxDates.forEach(result => {
            if (result[0] && result[0].max_date) {
                const date = new Date(result[0].max_date);
                if (!maxSampleDate || date > maxSampleDate) {
                    maxSampleDate = date;
                }
            }
        });

        if (!maxSampleDate) {
            console.warn('No sample dates found, using today as reference');
            return 0; // No offset needed
        }

        // Calculate days between sample max date and today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
        maxSampleDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - maxSampleDate.getTime();
        const dayOffset = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`📅 Sample data max date: ${maxSampleDate.toISOString().split('T')[0]}`);
        console.log(`📅 Today's date: ${today.toISOString().split('T')[0]}`);
        console.log(`📅 Date offset: ${dayOffset} days`);
        
        return dayOffset;
    }

    getAdjustedDate(originalDate, baseOffset, additionalOffset = 0) {
        const date = new Date(originalDate);
        date.setDate(date.getDate() + baseOffset + additionalOffset);
        return date.toISOString().split('T')[0];
    }

    getAdjustedDateTime(originalDateTime, baseOffset, additionalOffset = 0) {
        const date = new Date(originalDateTime);
        date.setDate(date.getDate() + baseOffset + additionalOffset);
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }

    async importDemoSystem(newSystemId, userId) {
        console.log('🚀 Starting SQLite demo data import...');
        console.log(`   New System ID: ${newSystemId}`);
        console.log(`   User ID: ${userId}`);

        try {
            await this.openSQLite();

            // Calculate date offset to make sample data relative to today
            const dateOffset = await this.calculateDateOffset();

            // Get demo system info
            const [demoSystem] = await this.querySQLite('SELECT * FROM systems LIMIT 1');
            console.log(`📊 Source system: ${demoSystem.system_name}`);

            // 1. Import main system record
            console.log('Step 1: Creating main system record...');
            const [systemResult] = await this.mysql.execute(`
                INSERT INTO systems (id, user_id, system_name, system_type, fish_type, fish_tank_count, 
                                   total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [newSystemId, userId, demoSystem.system_name + ' (Demo)', demoSystem.system_type, 
                demoSystem.fish_type, demoSystem.fish_tank_count, demoSystem.total_fish_volume,
                demoSystem.grow_bed_count, demoSystem.total_grow_volume, demoSystem.total_grow_area]);
            
            console.log(`✅ System created (affected rows: ${systemResult.affectedRows})`);

            // 2. Import fish tanks
            console.log('Step 2: Importing fish tanks...');
            const fishTanks = await this.querySQLite('SELECT * FROM fish_tanks ORDER BY tank_number');
            
            for (const tank of fishTanks) {
                await this.mysql.execute(`
                    INSERT INTO fish_tanks (system_id, tank_number, size_m3, volume_liters, fish_type, current_fish_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [newSystemId, tank.tank_number, tank.size_m3, tank.volume_liters, tank.fish_type, tank.current_fish_count]);
            }
            console.log(`✅ Imported ${fishTanks.length} fish tanks`);

            // Get new tank IDs for mapping
            const [newTanks] = await this.mysql.execute(
                'SELECT id, tank_number FROM fish_tanks WHERE system_id = ? ORDER BY tank_number',
                [newSystemId]
            );
            
            const tankMapping = {};
            fishTanks.forEach((originalTank, index) => {
                tankMapping[originalTank.id] = newTanks[index].id;
            });

            // 3. Import grow beds
            console.log('Step 3: Importing grow beds...');
            const growBeds = await this.querySQLite('SELECT * FROM grow_beds ORDER BY bed_number');
            
            for (const bed of growBeds) {
                await this.mysql.execute(`
                    INSERT INTO grow_beds (system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, 
                                         length_meters, width_meters, height_meters, plant_capacity, vertical_count, 
                                         plants_per_vertical, equivalent_m2, reservoir_volume, reservoir_volume_liters)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [newSystemId, bed.bed_number, bed.bed_type, bed.bed_name, bed.volume_liters, bed.area_m2,
                    bed.length_meters, bed.width_meters, bed.height_meters, bed.plant_capacity, bed.vertical_count,
                    bed.plants_per_vertical, bed.equivalent_m2, bed.reservoir_volume, bed.reservoir_volume_liters]);
            }
            console.log(`✅ Imported ${growBeds.length} grow beds`);

            // Get new bed IDs for mapping
            const [newBeds] = await this.mysql.execute(
                'SELECT id, bed_number FROM grow_beds WHERE system_id = ? ORDER BY bed_number',
                [newSystemId]
            );
            
            const bedMapping = {};
            growBeds.forEach((originalBed, index) => {
                bedMapping[originalBed.id] = newBeds[index].id;
            });

            // 4. Import water quality data with adjusted dates relative to today
            console.log('Step 4: Importing water quality data...');
            const waterQuality = await this.querySQLite('SELECT * FROM water_quality ORDER BY date DESC');
            
            for (const record of waterQuality) {
                const adjustedDate = this.getAdjustedDate(record.date, dateOffset);
                
                await this.mysql.execute(`
                    INSERT INTO water_quality (system_id, date, temperature, ph, ammonia, nitrite, nitrate, 
                                             dissolved_oxygen, humidity, salinity, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [newSystemId, adjustedDate, record.temperature, record.ph, record.ammonia, record.nitrite,
                    record.nitrate, record.dissolved_oxygen, record.humidity, record.salinity, 
                    record.notes || 'Demo system data']);
            }
            console.log(`✅ Imported ${waterQuality.length} water quality records`);

            // 5. Import nutrient readings with adjusted dates relative to today
            console.log('Step 5: Importing nutrient readings...');
            const nutrients = await this.querySQLite('SELECT * FROM nutrient_readings ORDER BY reading_date DESC');
            
            for (const nutrient of nutrients) {
                const adjustedDateTime = this.getAdjustedDateTime(nutrient.reading_date, dateOffset);
                
                await this.mysql.execute(`
                    INSERT INTO nutrient_readings (system_id, nutrient_type, value, unit, reading_date, source, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `, [newSystemId, nutrient.nutrient_type, nutrient.value, nutrient.unit, adjustedDateTime, 
                    nutrient.source, nutrient.notes || 'Demo system data']);
            }
            console.log(`✅ Imported ${nutrients.length} nutrient readings`);

            // 6. Import fish health data with adjusted dates
            console.log('Step 6: Importing fish health data...');
            const fishHealth = await this.querySQLite('SELECT * FROM fish_health ORDER BY date DESC');
            
            for (const health of fishHealth) {
                const newTankId = tankMapping[health.fish_tank_id];
                if (newTankId) {
                    const adjustedDate = this.getAdjustedDate(health.date, dateOffset);
                    
                    await this.mysql.execute(`
                        INSERT INTO fish_health (system_id, fish_tank_id, date, count, average_weight, mortality, 
                                               feed_consumption, feed_type, behavior, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [newSystemId, newTankId, adjustedDate, health.count, health.average_weight, health.mortality,
                        health.feed_consumption, health.feed_type, health.behavior, health.notes || 'Demo data']);
                }
            }
            console.log(`✅ Imported ${fishHealth.length} fish health records`);

            // 7. Import fish inventory
            console.log('Step 7: Importing fish inventory...');
            const fishInventory = await this.querySQLite('SELECT * FROM fish_inventory');
            
            for (const inventory of fishInventory) {
                const newTankId = tankMapping[inventory.fish_tank_id];
                if (newTankId) {
                    await this.mysql.execute(`
                        INSERT INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, 
                                                  fish_type, batch_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, NOW())
                    `, [newSystemId, newTankId, inventory.current_count, inventory.average_weight,
                        inventory.fish_type, `${newSystemId}_${inventory.batch_id}`]);
                }
            }
            console.log(`✅ Imported ${fishInventory.length} fish inventory records`);

            // 8. Import plant allocations
            console.log('Step 8: Importing plant allocations...');
            const plantAllocations = await this.querySQLite('SELECT * FROM plant_allocations');
            
            for (const allocation of plantAllocations) {
                const newBedId = bedMapping[allocation.grow_bed_id];
                if (newBedId) {
                    const adjustedDatePlanted = allocation.date_planted ? this.getAdjustedDate(allocation.date_planted, dateOffset) : null;
                    
                    await this.mysql.execute(`
                        INSERT INTO plant_allocations (system_id, grow_bed_id, crop_type, percentage_allocated, 
                                                     plants_planted, plant_spacing, date_planted, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [newSystemId, newBedId, allocation.crop_type, allocation.percentage_allocated,
                        allocation.plants_planted, allocation.plant_spacing, adjustedDatePlanted, allocation.status]);
                }
            }
            console.log(`✅ Imported ${plantAllocations.length} plant allocations`);

            // 9. Import plant growth data with adjusted dates
            console.log('Step 9: Importing plant growth data...');
            const plantGrowth = await this.querySQLite('SELECT * FROM plant_growth ORDER BY date DESC');
            
            for (const growth of plantGrowth) {
                const newBedId = bedMapping[growth.grow_bed_id];
                if (newBedId) {
                    const adjustedDate = this.getAdjustedDate(growth.date, dateOffset);
                    const adjustedBatchDate = growth.batch_created_date ? this.getAdjustedDate(growth.batch_created_date, dateOffset) : adjustedDate;
                    
                    await this.mysql.execute(`
                        INSERT INTO plant_growth (system_id, grow_bed_id, date, crop_type, count, harvest_weight, 
                                                plants_harvested, new_seedlings, pest_control, health, growth_stage, 
                                                batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [newSystemId, newBedId, adjustedDate, growth.crop_type, growth.count, growth.harvest_weight,
                        growth.plants_harvested, growth.new_seedlings, growth.pest_control, growth.health,
                        growth.growth_stage, `${newSystemId}_${growth.batch_id}`, growth.seed_variety,
                        adjustedBatchDate, growth.days_to_harvest, growth.notes || 'Demo system data']);
                }
            }
            console.log(`✅ Imported ${plantGrowth.length} plant growth records`);

            // 10. Import spray programmes
            console.log('Step 10: Importing spray programmes...');
            const sprayProgrammes = await this.querySQLite('SELECT * FROM spray_programmes');
            
            const programmeMapping = {};
            for (const programme of sprayProgrammes) {
                const [result] = await this.mysql.execute(`
                    INSERT INTO spray_programmes (system_id, category, product_name, active_ingredient, target_pest, 
                                                application_rate, frequency, start_date, end_date, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [newSystemId, programme.category, programme.product_name, programme.active_ingredient,
                    programme.target_pest, programme.application_rate, programme.frequency, programme.start_date,
                    programme.end_date, programme.status, programme.notes]);
                
                programmeMapping[programme.id] = result.insertId;
            }
            console.log(`✅ Imported ${sprayProgrammes.length} spray programmes`);

            // 11. Import spray applications with adjusted dates
            console.log('Step 11: Importing spray applications...');
            const sprayApplications = await this.querySQLite('SELECT * FROM spray_applications ORDER BY application_date DESC');
            
            for (const application of sprayApplications) {
                const newProgrammeId = programmeMapping[application.programme_id];
                if (newProgrammeId) {
                    const adjustedDate = this.getAdjustedDate(application.application_date, dateOffset);
                    
                    await this.mysql.execute(`
                        INSERT INTO spray_applications (programme_id, application_date, dilution_rate, volume_applied, 
                                                      weather_conditions, effectiveness_rating, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [newProgrammeId, adjustedDate, application.dilution_rate, application.volume_applied,
                        application.weather_conditions, application.effectiveness_rating, application.notes]);
                }
            }
            console.log(`✅ Imported ${sprayApplications.length} spray applications`);

            await this.closeSQLite();
            
            console.log('🎉 SQLite demo import completed successfully!');
            
            return {
                success: true,
                systemId: newSystemId,
                imported: {
                    fishTanks: fishTanks.length,
                    growBeds: growBeds.length,
                    waterQuality: waterQuality.length,
                    nutrients: nutrients.length,
                    fishHealth: fishHealth.length,
                    fishInventory: fishInventory.length,
                    plantAllocations: plantAllocations.length,
                    plantGrowth: plantGrowth.length,
                    sprayProgrammes: sprayProgrammes.length,
                    sprayApplications: sprayApplications.length
                }
            };

        } catch (error) {
            await this.closeSQLite();
            console.error('❌ SQLite import failed:', error);
            throw error;
        }
    }
}

module.exports = SQLiteDemoImporter;