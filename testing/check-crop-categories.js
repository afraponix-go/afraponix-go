const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function checkCropCategories() {
    try {
        const pool = getDatabase();
        
        // Check if crop_categories table exists
        const [tables] = await pool.execute("SHOW TABLES LIKE 'crop_categories'");
        console.log('🔍 crop_categories table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Check categories count
            const [categoryCount] = await pool.execute('SELECT COUNT(*) as count FROM crop_categories');
            console.log('📊 Total categories in database:', categoryCount[0].count);
            
            // Show all categories
            const [categories] = await pool.execute('SELECT * FROM crop_categories');
            console.log('🗂️ Categories:');
            categories.forEach((category, index) => {
                console.log(`Category ${index + 1}:`, category);
            });
        } else {
            console.log('❌ crop_categories table does not exist!');
            
            // Let's check what categories are referenced in crops table
            const [categoryIds] = await pool.execute('SELECT DISTINCT category_id FROM crops WHERE category_id IS NOT NULL');
            console.log('🔍 Category IDs referenced in crops table:');
            categoryIds.forEach(row => console.log('  Category ID:', row.category_id));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
}

checkCropCategories();