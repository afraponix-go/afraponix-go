const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function testCropsApiQuery() {
    try {
        const pool = getDatabase();
        
        console.log('🔍 Testing crops API query...');
        
        const [crops] = await pool.execute(`
            SELECT 
                c.id,
                c.code,
                c.name,
                c.scientific_name,
                c.default_ec_min,
                c.default_ec_max,
                c.default_ph_min,
                c.default_ph_max,
                c.days_to_harvest,
                c.plant_spacing_cm,
                c.light_requirements,
                c.growing_notes,
                c.research_source,
                cc.code as category_code,
                cc.name as category_name,
                COUNT(cnt.id) as nutrient_targets_count
            FROM crops c
            LEFT JOIN crop_categories cc ON c.category_id = cc.id
            LEFT JOIN crop_nutrient_targets cnt ON c.id = cnt.crop_id
            WHERE c.is_active = true
            GROUP BY c.id, cc.code, cc.name
            ORDER BY cc.name, c.name
        `);
        
        console.log('✅ Query executed successfully!');
        console.log('📊 Number of crops returned:', crops.length);
        
        if (crops.length > 0) {
            console.log('\n🌱 First crop sample:');
            console.log({
                id: crops[0].id,
                code: crops[0].code,
                name: crops[0].name,
                category_code: crops[0].category_code,
                category_name: crops[0].category_name,
                nutrient_targets_count: crops[0].nutrient_targets_count
            });
        }
        
        // Test the response format
        const apiResponse = {
            success: true,
            count: crops.length,
            data: crops
        };
        
        console.log('\n📦 API Response format:');
        console.log('success:', apiResponse.success);
        console.log('count:', apiResponse.count);
        console.log('data length:', apiResponse.data.length);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database error:', error);
        process.exit(1);
    }
}

testCropsApiQuery();