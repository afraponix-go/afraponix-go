const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function checkCrops() {
    try {
        const pool = getDatabase();
        
        // Check if crops table exists
        const [tables] = await pool.execute("SHOW TABLES LIKE 'crops'");
        console.log('🔍 Crops table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Check crops count
            const [cropCount] = await pool.execute('SELECT COUNT(*) as count FROM crops');
            console.log('📊 Total crops in database:', cropCount[0].count);
            
            // Show first 5 crops
            const [crops] = await pool.execute('SELECT id, name, code, category_id, is_active FROM crops LIMIT 5');
            console.log('🌱 Sample crops:');
            crops.forEach((crop, index) => {
                console.log(`Crop ${index + 1}:`, {
                    id: crop.id,
                    name: crop.name,
                    code: crop.code,
                    category_id: crop.category_id,
                    is_active: crop.is_active
                });
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
}

checkCrops();