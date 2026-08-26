const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function checkCropsSchema() {
    try {
        const pool = getDatabase();
        
        // Show crops table structure
        const [columns] = await pool.execute('DESCRIBE crops');
        console.log('🏗️ Crops table structure:');
        columns.forEach((column, index) => {
            console.log(`Column ${index + 1}:`, {
                field: column.Field,
                type: column.Type,
                null: column.Null,
                key: column.Key,
                default: column.Default
            });
        });
        
        // Show first crop
        const [crops] = await pool.execute('SELECT * FROM crops LIMIT 1');
        console.log('\n🌱 Sample crop data:');
        if (crops.length > 0) {
            console.log(crops[0]);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
}

checkCropsSchema();