#!/usr/bin/env node

/**
 * Staging Database Diagnostic Script
 * 
 * Run this script on your staging server to diagnose demo system creation issues:
 * node database/staging-diagnostic.js
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
        console.log('🔍 Staging Database Diagnostic for Demo System Creation');
        console.log('===============================================');
        console.log(`Connecting to: ${config.host}/${config.database}`);
        
        connection = await mysql.createConnection(config);
        console.log('✅ Database connection successful');
        
        // 1. Check if Oribi 1 reference system exists
        console.log('\n1. Checking Oribi 1 reference system...');
        const [systemRows] = await connection.execute(
            'SELECT * FROM systems WHERE id = ?', 
            [ORIBI_1_SYSTEM_ID]
        );
        
        if (systemRows.length === 0) {
            console.log('❌ CRITICAL: Oribi 1 reference system NOT FOUND');
            console.log('   Expected ID:', ORIBI_1_SYSTEM_ID);
            console.log('   This will cause 404 "Reference demo system not available"');
            
            // Check if init.sql was properly applied
            const [allSystems] = await connection.execute('SELECT id, system_name, user_id FROM systems LIMIT 5');
            console.log('   Available systems:', allSystems);
            
        } else {
            console.log('✅ Oribi 1 reference system found:', systemRows[0]);
        }
        
        // 2. Check required tables exist
        console.log('\n2. Checking required tables...');
        const requiredTables = [
            'systems', 'fish_tanks', 'grow_beds', 'water_quality', 
            'nutrient_readings', 'fish_inventory', 'users'
        ];
        
        for (const table of requiredTables) {
            try {
                const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`✅ ${table}: ${rows[0].count} records`);
            } catch (error) {
                console.log(`❌ ${table}: ERROR - ${error.message}`);
            }
        }
        
        // 3. Check fish_tanks table structure
        console.log('\n3. Checking fish_tanks table structure...');
        const [fishTankColumns] = await connection.execute('DESCRIBE fish_tanks');
        const columnNames = fishTankColumns.map(col => col.Field);
        console.log('   Columns:', columnNames.join(', '));
        
        if (!columnNames.includes('current_fish_count')) {
            console.log('❌ MISSING COLUMN: current_fish_count in fish_tanks table');
            console.log('   This will cause constraint violations during demo creation');
        }
        
        // 4. Check for fish tanks and grow beds for Oribi 1
        if (systemRows.length > 0) {
            console.log('\n4. Checking Oribi 1 supporting data...');
            
            const [tankRows] = await connection.execute(
                'SELECT COUNT(*) as count FROM fish_tanks WHERE system_id = ?', 
                [ORIBI_1_SYSTEM_ID]
            );
            console.log(`   Fish tanks: ${tankRows[0].count} found`);
            
            const [bedRows] = await connection.execute(
                'SELECT COUNT(*) as count FROM grow_beds WHERE system_id = ?', 
                [ORIBI_1_SYSTEM_ID]
            );
            console.log(`   Grow beds: ${bedRows[0].count} found`);
            
            const [waterRows] = await connection.execute(
                'SELECT COUNT(*) as count FROM water_quality WHERE system_id = ?', 
                [ORIBI_1_SYSTEM_ID]
            );
            console.log(`   Water quality records: ${waterRows[0].count} found`);
            
            const [nutrientRows] = await connection.execute(
                'SELECT COUNT(*) as count FROM nutrient_readings WHERE system_id = ?', 
                [ORIBI_1_SYSTEM_ID]
            );
            console.log(`   Nutrient readings: ${nutrientRows[0].count} found`);
        }
        
        // 5. Test demo system creation constraints
        console.log('\n5. Testing demo system creation constraints...');
        
        // Check if admin user exists
        const [userRows] = await connection.execute('SELECT id, username FROM users WHERE id = 2');
        if (userRows.length === 0) {
            console.log('❌ Admin user (ID: 2) not found - demo creation will fail');
        } else {
            console.log('✅ Admin user found:', userRows[0]);
        }
        
        console.log('\n===============================================');
        console.log('🏁 Diagnostic Complete');
        
        if (systemRows.length === 0) {
            console.log('\n🔧 RECOMMENDED ACTION:');
            console.log('   Run the updated init.sql script on staging database:');
            console.log('   mysql -u root -p your_database < database/init.sql');
        } else {
            console.log('\n✅ Reference system exists - check server logs for transaction errors');
        }
        
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