#!/usr/bin/env node

require('dotenv').config({ path: '.env.dev' });
const { getDatabase } = require('./database/init-mariadb');

async function checkPlantTables() {
    console.log('🔍 Checking plant-related table structure...');
    
    try {
        const connection = await getDatabase();
        
        // Check what plant-related tables exist
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE '%plant%'
        `);
        
        console.log('\n📊 Plant-related tables:');
        console.log('==========================================');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`- ${tableName}`);
        });
        
        // Check the correct table (likely plant_growth or plants)
        const [plantsTable] = await connection.execute(`
            SHOW TABLES LIKE '%plants'
        `);
        
        if (plantsTable.length > 0) {
            const tableName = Object.values(plantsTable[0])[0];
            console.log(`\n🌱 Checking ${tableName} table for Oribi 7 bed 1:`);
            console.log('==========================================');
            
            // Find Oribi 7 system ID
            const [systems] = await connection.execute(
                "SELECT id FROM systems WHERE system_name LIKE '%oribi%7%' OR system_name LIKE '%Oribi%7%'"
            );
            
            if (systems.length > 0) {
                const systemId = systems[0].id;
                
                // Check plants data for bed 1 (bed_id = 8 from previous query)
                const [plantsData] = await connection.execute(`
                    SELECT p.*, gb.bed_name
                    FROM ${tableName} p
                    JOIN grow_beds gb ON p.grow_bed_id = gb.id
                    WHERE p.system_id = ? AND gb.bed_name LIKE '%bed%1%'
                    ORDER BY p.date_planted DESC, p.id DESC
                    LIMIT 10
                `, [systemId]);
                
                if (plantsData.length > 0) {
                    plantsData.forEach(entry => {
                        const plantedDate = entry.date_planted ? new Date(entry.date_planted).toLocaleDateString() : 'Unknown';
                        const harvestedDate = entry.date_harvested ? new Date(entry.date_harvested).toLocaleDateString() : 'Not harvested';
                        console.log(`Entry ${entry.id}: ${entry.crop_type} - ${entry.plants_planted || entry.count || 'Unknown count'} planted on ${plantedDate}`);
                    });
                    
                    // Check for duplicates
                    console.log(`\n🔍 Checking for duplicates in ${tableName}:`);
                    const [duplicates] = await connection.execute(`
                        SELECT 
                            crop_type,
                            date_planted,
                            plants_planted,
                            COUNT(*) as duplicate_count
                        FROM ${tableName} p
                        JOIN grow_beds gb ON p.grow_bed_id = gb.id
                        WHERE p.system_id = ? AND gb.bed_name LIKE '%bed%1%'
                        GROUP BY crop_type, date_planted, plants_planted
                        HAVING COUNT(*) > 1
                    `, [systemId]);
                    
                    if (duplicates.length > 0) {
                        console.log('⚠️  Found duplicate entries:');
                        duplicates.forEach(dup => {
                            console.log(`${dup.crop_type} on ${new Date(dup.date_planted).toLocaleDateString()}: ${dup.duplicate_count} duplicates`);
                        });
                    } else {
                        console.log('✅ No duplicates found in plant data');
                    }
                } else {
                    console.log('No plant data found for bed 1');
                }
            }
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Table check failed:', error.message);
    }
    
    process.exit(0);
}

checkPlantTables();