require('dotenv').config({ path: '.env.dev' });
const mysql = require('mysql2/promise');

/**
 * MariaDB Migration: Restructure nutrient data from single water_quality records to individual nutrient_readings
 * 
 * Purpose: 
 * - Enable independent nutrient testing and tracking
 * - Support sensors and manual entries with different frequencies
 * - Improve data flexibility and historical accuracy
 */

async function migrateNutrientReadingsMariaDB() {
    console.log('🔄 Starting MariaDB nutrient readings migration...');
    
    // Check if MariaDB is configured
    const useMariaDB = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;
    if (!useMariaDB) {
        console.log('📦 MariaDB not configured, skipping MariaDB migration');
        return;
    }
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });

        console.log('📦 Connected to MariaDB database');
        
        // Step 1: Create new nutrient_readings table
        await createNutrientReadingsTable(connection);
        
        // Step 2: Migrate existing data
        await migrateExistingData(connection);
        
        // Step 3: Clean up water_quality table (remove nutrient columns)
        await cleanupWaterQualityTable(connection);
        
        console.log('✅ MariaDB nutrient readings migration completed successfully');
        
    } catch (error) {
        console.error('❌ MariaDB migration failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createNutrientReadingsTable(connection) {
    console.log('📊 Creating nutrient_readings table in MariaDB...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS nutrient_readings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            nutrient_type VARCHAR(50) NOT NULL,
            value DECIMAL(8,2) NOT NULL,
            unit VARCHAR(10) DEFAULT 'mg/L',
            reading_date DATETIME NOT NULL,
            source VARCHAR(20) DEFAULT 'manual',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nutrient_system_type (system_id, nutrient_type),
            INDEX idx_nutrient_date (reading_date),
            INDEX idx_nutrient_system_date (system_id, reading_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ nutrient_readings table created in MariaDB');
}

async function migrateExistingData(connection) {
    console.log('📋 Migrating existing MariaDB water quality data...');
    
    // Get all existing water_quality records with nutrient data
    const [waterQualityData] = await connection.execute(`
        SELECT id, system_id, date, nitrate, nitrite, iron, potassium, calcium, phosphorus, magnesium
        FROM water_quality 
        WHERE nitrate IS NOT NULL 
           OR nitrite IS NOT NULL 
           OR iron IS NOT NULL 
           OR potassium IS NOT NULL 
           OR calcium IS NOT NULL 
           OR phosphorus IS NOT NULL 
           OR magnesium IS NOT NULL
    `);
    
    console.log(`📊 Found ${waterQualityData.length} water quality records with nutrient data`);
    
    // Define nutrient types to migrate
    const nutrientTypes = [
        'nitrate', 'nitrite', 'iron', 'potassium', 'calcium', 'phosphorus', 'magnesium'
    ];
    
    let totalInserted = 0;
    
    for (const record of waterQualityData) {
        for (const nutrientType of nutrientTypes) {
            const value = record[nutrientType];
            
            if (value !== null && value !== undefined && value !== '') {
                // Insert individual nutrient reading
                await connection.execute(`
                    INSERT INTO nutrient_readings 
                    (system_id, nutrient_type, value, unit, reading_date, source, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    record.system_id,
                    nutrientType,
                    parseFloat(value),
                    'mg/L',
                    record.date.replace('T', ' ') + ':00', // Convert ISO format to MySQL datetime
                    'manual',
                    `Migrated from water_quality record ID ${record.id}`
                ]);
                
                totalInserted++;
            }
        }
    }
    
    console.log(`✅ Migrated ${totalInserted} individual nutrient readings in MariaDB`);
}

async function cleanupWaterQualityTable(connection) {
    console.log('🧹 Cleaning up MariaDB water_quality table...');
    
    // MariaDB approach: Drop nutrient columns instead of recreating table
    const columnsToRemove = ['nitrate', 'nitrite', 'iron', 'potassium', 'calcium', 'phosphorus', 'magnesium'];
    
    for (const column of columnsToRemove) {
        try {
            await connection.execute(`ALTER TABLE water_quality DROP COLUMN ${column}`);
            console.log(`✅ Dropped column: ${column}`);
        } catch (error) {
            if (!error.message.includes("doesn't exist")) {
                throw error;
            }
            console.log(`⚠️  Column ${column} already doesn't exist`);
        }
    }
    
    // Add timestamps if they don't exist
    try {
        await connection.execute(`
            ALTER TABLE water_quality 
            ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
    } catch (error) {
        console.log('⚠️  Timestamp columns may already exist');
    }
    
    console.log('✅ MariaDB water_quality table cleaned up');
}

// Export for use in other scripts
module.exports = {
    migrateNutrientReadingsMariaDB,
    createNutrientReadingsTable,
    migrateExistingData,
    cleanupWaterQualityTable
};

// Run migration if called directly
if (require.main === module) {
    migrateNutrientReadingsMariaDB()
        .then(() => {
            console.log('🎉 MariaDB Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 MariaDB Migration failed:', error);
            process.exit(1);
        });
}