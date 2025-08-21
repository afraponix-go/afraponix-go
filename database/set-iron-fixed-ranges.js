const { getDatabase } = require('../database/init-mariadb');

async function setIronFixedRanges() {
    console.log('🔄 Setting iron to use fixed ranges instead of ratios...');
    
    try {
        const pool = getDatabase();
        
        // First, delete existing iron ratio rules
        console.log('Removing existing iron ratio rules...');
        await pool.execute(`
            DELETE FROM nutrient_ratio_rules 
            WHERE nutrient_id = (SELECT id FROM nutrients WHERE code = 'iron')
        `);
        
        // Now insert iron with fixed ranges (stored as min_factor/max_factor but interpreted as absolute ppm)
        console.log('Adding iron fixed ranges...');
        
        const ironRanges = [
            { stage: null, min: 1.0, max: 2.5, isDefault: true, notes: 'Fixed range (ppm) - not ratio based' },
            { stage: 'vegetative', min: 1.5, max: 2.8, isDefault: false, notes: 'Fixed range (ppm) for vegetative stage' },
            { stage: 'flowering', min: 0.8, max: 1.8, isDefault: false, notes: 'Fixed range (ppm) for flowering stage' },
            { stage: 'fruiting', min: 0.8, max: 1.8, isDefault: false, notes: 'Fixed range (ppm) for fruiting stage' }
        ];
        
        for (const range of ironRanges) {
            let stageId = null;
            if (range.stage) {
                const [stageResult] = await pool.execute(
                    'SELECT id FROM growth_stages WHERE code = ?',
                    [range.stage]
                );
                if (stageResult.length > 0) {
                    stageId = stageResult[0].id;
                }
            }
            
            await pool.execute(`
                INSERT INTO nutrient_ratio_rules 
                (nutrient_id, growth_stage_id, min_factor, max_factor, is_default, priority, notes)
                VALUES (
                    (SELECT id FROM nutrients WHERE code = 'iron'),
                    ?,
                    ?,
                    ?,
                    ?,
                    1,
                    ?
                )
            `, [stageId, range.min, range.max, range.isDefault, range.notes]);
        }
        
        // Verify the changes
        const [ironRules] = await pool.execute(`
            SELECT 
                nrr.*,
                n.code as nutrient_code,
                gs.code as stage_code
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            WHERE n.code = 'iron'
        `);
        
        console.log('✅ Iron fixed ranges set:');
        ironRules.forEach(rule => {
            const stage = rule.stage_code || 'general';
            console.log(`   ${stage}: ${rule.min_factor}-${rule.max_factor} ppm`);
        });
        
    } catch (error) {
        console.error('❌ Error setting iron fixed ranges:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setIronFixedRanges()
        .then(() => {
            console.log('✅ Iron fixed ranges configured successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to configure iron fixed ranges:', error);
            process.exit(1);
        });
}

module.exports = { setIronFixedRanges };