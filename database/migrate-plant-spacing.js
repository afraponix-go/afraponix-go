#!/usr/bin/env node

require('dotenv').config({ path: '.env.dev' });
const mysql = require('mysql2');

async function migrateDatabase() {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    console.log('🌱 Starting plant spacing migration...\n');
    
    try {
        // Add plant_spacing column to plant_allocations table
        console.log('📋 Adding plant_spacing column to plant_allocations table...');
        
        await new Promise((resolve, reject) => {
            // Check if column already exists
            connection.query("SHOW COLUMNS FROM plant_allocations LIKE 'plant_spacing'", (err, results) => {
                if (err) {
                    console.error('❌ Error checking for plant_spacing column:', err);
                    reject(err);
                    return;
                }
                
                if (results && results.length > 0) {
                    console.log('✅ plant_spacing column already exists');
                    resolve();
                    return;
                }
                
                // Add the column
                connection.query(
                    "ALTER TABLE plant_allocations ADD COLUMN plant_spacing INT DEFAULT 30 AFTER plants_planted",
                    (err) => {
                        if (err) {
                            console.error('❌ Error adding plant_spacing column:', err);
                            reject(err);
                            return;
                        }
                        console.log('✅ plant_spacing column added successfully');
                        resolve();
                    }
                );
            });
        });
        
        console.log('\n🎉 Migration completed successfully!\n');
        console.log('📝 New field added:');
        console.log('   - plant_spacing: Plant spacing in centimeters (default: 30)');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        connection.end();
    }
}

// Run migration
migrateDatabase();