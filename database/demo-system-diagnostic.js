#!/usr/bin/env node

/**
 * Demo System Diagnostic Script
 * 
 * Run this script on your staging server to diagnose demo system creation issues:
 * node database/demo-system-diagnostic.js
 */

const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'aquaponics',
    password: process.env.DB_PASSWORD || 'dev123',
    database: process.env.DB_NAME || 'aquaponics_dev'
};

const ORIBI_1_SYSTEM_ID = 'system_1754627714554';

async function runDiagnostic() {
    let connection;
    
    try {
        console.log('🔍 Demo System Creation Diagnostic');
        console.log('=====================================');
        console.log(`Connecting to: ${config.host}/${config.database}`);
        
        connection = await mysql.createConnection(config);
        console.log('✅ Database connection successful');
        
        // 1. Check if Oribi 1 reference system exists
        console.log('\n1. Checking Oribi 1 reference system...');
        const [systemRows] = await connection.execute(
            'SELECT id, user_id, system_name, fish_tank_count FROM systems WHERE id = ?', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        if (systemRows.length === 0) {
            console.log('❌ CRITICAL: Oribi 1 reference system NOT FOUND');
            console.log('   Expected ID:', ORIBI_1_SYSTEM_ID);
            return;
        } else {
            console.log('✅ Oribi 1 reference system found:');
            console.log('   ID:', systemRows[0].id);
            console.log('   User ID:', systemRows[0].user_id);
            console.log('   Name:', systemRows[0].system_name);
            console.log('   Expected Fish Tanks:', systemRows[0].fish_tank_count);
        }
        
        // 2. Check fish tanks for Oribi 1
        console.log('\n2. Checking Oribi 1 fish tanks...');
        const [fishTankRows] = await connection.execute(
            'SELECT id, tank_number, volume_liters, current_fish_count FROM fish_tanks WHERE system_id = ? ORDER BY tank_number', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        console.log(`   Found ${fishTankRows.length} fish tanks:`);
        fishTankRows.forEach(tank => {
            console.log(`   - Tank ${tank.tank_number}: ID=${tank.id}, Volume=${tank.volume_liters}L, Fish=${tank.current_fish_count}`);
        });
        
        if (fishTankRows.length !== 7) {
            console.log('❌ ISSUE: Expected 7 fish tanks, found', fishTankRows.length);
        }
        
        // 3. Check grow beds for Oribi 1
        console.log('\n3. Checking Oribi 1 grow beds...');
        const [growBedRows] = await connection.execute(
            'SELECT id, bed_number, bed_type, bed_name, area_m2 FROM grow_beds WHERE system_id = ? ORDER BY bed_number', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        console.log(`   Found ${growBedRows.length} grow beds:`);
        growBedRows.forEach(bed => {
            console.log(`   - Bed ${bed.bed_number}: ID=${bed.id}, Type=${bed.bed_type}, Name=${bed.bed_name}, Area=${bed.area_m2}m²`);
        });
        
        // 4. Check water quality data for Oribi 1
        console.log('\n4. Checking Oribi 1 water quality data...');
        const [waterRows] = await connection.execute(
            'SELECT date, temperature, ph, ammonia, nitrate FROM water_quality WHERE system_id = ? ORDER BY date DESC', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        console.log(`   Found ${waterRows.length} water quality records:`);
        waterRows.forEach(record => {
            console.log(`   - ${record.date}: pH=${record.ph}, Temp=${record.temperature}°C, NH3=${record.ammonia}, NO3=${record.nitrate}`);
        });
        
        // 5. Check nutrient readings for Oribi 1
        console.log('\n5. Checking Oribi 1 nutrient readings...');
        const [nutrientRows] = await connection.execute(
            'SELECT nutrient_type, value, unit, DATE(reading_date) as date FROM nutrient_readings WHERE system_id = ? ORDER BY reading_date DESC', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        console.log(`   Found ${nutrientRows.length} nutrient readings:`);
        const nutrientsByType = {};
        nutrientRows.forEach(reading => {
            if (!nutrientsByType[reading.nutrient_type]) {
                nutrientsByType[reading.nutrient_type] = [];
            }
            nutrientsByType[reading.nutrient_type].push(`${reading.value}${reading.unit} (${reading.date})`);
        });
        
        Object.entries(nutrientsByType).forEach(([type, readings]) => {
            console.log(`   - ${type}: ${readings.slice(0, 2).join(', ')}${readings.length > 2 ? '...' : ''}`);
        });
        
        // 6. Check fish inventory for Oribi 1
        console.log('\n6. Checking Oribi 1 fish inventory...');
        const [inventoryRows] = await connection.execute(
            'SELECT fish_tank_id, current_count, average_weight FROM fish_inventory WHERE system_id = ? ORDER BY fish_tank_id', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        console.log(`   Found ${inventoryRows.length} fish inventory records:`);
        inventoryRows.forEach(inv => {
            console.log(`   - Tank ID ${inv.fish_tank_id}: ${inv.current_count} fish @ ${inv.average_weight}g avg`);
        });
        
        // 7. Check most recent demo system to see what was copied
        console.log('\n7. Checking most recent demo system...');
        const [demoSystems] = await connection.execute(
            'SELECT id, system_name, created_at FROM systems WHERE system_name LIKE "%demo%" ORDER BY created_at DESC LIMIT 1'
        );
        
        if (demoSystems.length > 0) {
            const demoSystemId = demoSystems[0].id;
            console.log(`   Most recent demo system: ${demoSystems[0].system_name} (${demoSystemId})`);
            console.log(`   Created: ${demoSystems[0].created_at}`);
            
            // Check what data was copied
            const [demoTanks] = await connection.execute(
                'SELECT COUNT(*) as count FROM fish_tanks WHERE system_id = ?', 
                [demoSystemId]
            );
            console.log(`   Demo fish tanks copied: ${demoTanks[0].count}`);
            
            const [demoWater] = await connection.execute(
                'SELECT COUNT(*) as count FROM water_quality WHERE system_id = ?', 
                [demoSystemId]
            );
            console.log(`   Demo water quality records: ${demoWater[0].count}`);
            
            const [demoNutrients] = await connection.execute(
                'SELECT COUNT(*) as count FROM nutrient_readings WHERE system_id = ?', 
                [demoSystemId]
            );
            console.log(`   Demo nutrient records: ${demoNutrients[0].count}`);
            
            const [demoInventory] = await connection.execute(
                'SELECT COUNT(*) as count FROM fish_inventory WHERE system_id = ?', 
                [demoSystemId]
            );
            console.log(`   Demo fish inventory records: ${demoInventory[0].count}`);
        } else {
            console.log('   No demo systems found');
        }
        
        console.log('\n=====================================');
        console.log('🏁 Diagnostic Complete');
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run diagnostic
runDiagnostic().catch(console.error);