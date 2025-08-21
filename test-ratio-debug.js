const { getDatabase } = require('./database/init-mariadb');

async function debugRatioQuery() {
    console.log('🔍 Debugging ratio query...');
    
    try {
        const pool = getDatabase();
        
        // Test the exact query used in the calculation API
        const [ratioRules] = await pool.execute(`
            SELECT 
                n.code as nutrient_code,
                n.name as nutrient_name,
                n.symbol,
                n.unit,
                n.is_ratio_based,
                nrr.min_factor,
                nrr.max_factor,
                nrr.is_default,
                nrr.priority
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            WHERE (gs.code = ? OR gs.code IS NULL)
            ORDER BY n.code, nrr.priority DESC, nrr.is_default DESC
        `, ['general']);
        
        console.log('Query results:');
        ratioRules.forEach(rule => {
            if (rule.nutrient_code === 'iron') {
                console.log(`Iron rule: `, {
                    nutrient_code: rule.nutrient_code,
                    is_ratio_based: rule.is_ratio_based,
                    min_factor: rule.min_factor,
                    max_factor: rule.max_factor,
                    stage: 'general'
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// Run if called directly
if (require.main === module) {
    debugRatioQuery()
        .then(() => {
            console.log('✅ Debug completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugRatioQuery };