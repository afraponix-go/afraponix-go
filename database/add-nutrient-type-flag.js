const { getDatabase } = require('../database/init-mariadb');

async function addNutrientTypeFlag() {
    console.log('🔄 Adding nutrient type flag to distinguish ratio-based vs fixed-range nutrients...');
    
    try {
        const pool = getDatabase();
        
        // Add is_ratio_based column to nutrients table
        await pool.execute(`
            ALTER TABLE nutrients 
            ADD COLUMN IF NOT EXISTS is_ratio_based BOOLEAN DEFAULT TRUE 
            COMMENT 'TRUE for ratio-based nutrients (relative to N), FALSE for fixed-range nutrients'
        `);
        
        // Update iron to be non-ratio based
        await pool.execute(`
            UPDATE nutrients 
            SET is_ratio_based = FALSE 
            WHERE code = 'iron'
        `);
        
        // Verify the change
        const [results] = await pool.execute(`
            SELECT code, name, is_ratio_based 
            FROM nutrients 
            ORDER BY code
        `);
        
        console.log('✅ Nutrient type flags updated:');
        results.forEach(nutrient => {
            const type = nutrient.is_ratio_based ? 'Ratio-based' : 'Fixed-range';
            console.log(`   ${nutrient.code} (${nutrient.name}): ${type}`);
        });
        
        // Update iron ratio rules to be fixed ranges instead
        console.log('🔄 Converting iron ratio rules to fixed ranges...');
        
        // Get current iron rules and convert them to fixed ppm values
        const [ironRules] = await pool.execute(`
            SELECT nrr.id, nrr.min_factor, nrr.max_factor, gs.code as stage_code, nrr.notes 
            FROM nutrient_ratio_rules nrr
            JOIN nutrients n ON nrr.nutrient_id = n.id
            LEFT JOIN growth_stages gs ON nrr.growth_stage_id = gs.id
            WHERE n.code = 'iron'
        `);
        
        for (const rule of ironRules) {
            // Convert ratios to fixed ppm values (assuming 150 ppm N baseline)
            const baselineN = 150;
            const minPpm = parseFloat(rule.min_factor) * baselineN;
            const maxPpm = parseFloat(rule.max_factor) * baselineN;
            
            // Update to use more realistic iron ranges (1.0-3.0 ppm typical)
            let adjustedMinPpm, adjustedMaxPpm;
            
            switch (rule.stage_code) {
                case 'general':
                    adjustedMinPpm = 1.0;
                    adjustedMaxPpm = 2.5;
                    break;
                case 'vegetative':
                    adjustedMinPpm = 1.5;
                    adjustedMaxPpm = 2.8;
                    break;
                case 'flowering':
                case 'fruiting':
                    adjustedMinPpm = 0.8;
                    adjustedMaxPpm = 1.8;
                    break;
                default:
                    adjustedMinPpm = 1.0;
                    adjustedMaxPpm = 2.5;
            }
            
            // Store as fixed values (not ratios) - we'll interpret these differently for iron
            await pool.execute(`
                UPDATE nutrient_ratio_rules 
                SET min_factor = ?, max_factor = ?, 
                    notes = CONCAT(COALESCE(notes, ''), ' [Fixed range: ', ?, '-', ?, ' ppm]')
                WHERE id = ?
            `, [
                adjustedMinPpm, 
                adjustedMaxPpm, 
                adjustedMinPpm, 
                adjustedMaxPpm, 
                rule.id
            ]);
            
            console.log(`   Updated ${rule.stage_code}: ${adjustedMinPpm}-${adjustedMaxPpm} ppm`);
        }
        
        console.log('✅ Iron conversion completed successfully!');
        
    } catch (error) {
        console.error('❌ Error adding nutrient type flag:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    addNutrientTypeFlag()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addNutrientTypeFlag };