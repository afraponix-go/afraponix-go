const { getDatabase } = require('./init-mariadb');

// Extract current cropTargets data from script.js
const cropTargetsData = {
    // LEAFY GREENS
    lettuce: { n: 73, p: 19, k: 90, ca: 67, mg: 13, fe: 1.8, ec: 1.1, ph_min: 6.0, ph_max: 6.8, notes: "Achieved highest yields with P and K supplementation" },
    spinach: { n: 65, p: 16, k: 75, ca: 65, mg: 15, fe: 1.6, ec: 1.05, ph_min: 6.5, ph_max: 7.2, notes: "Tolerates cooler temperatures well" },
    kale: { n: 75, p: 21, k: 95, ca: 80, mg: 18, fe: 2.0, ec: 1.3, ph_min: 6.0, ph_max: 6.8, notes: "PPM over 600 but below 900 for optimal growth" },
    swiss_chard: { n: 70, p: 19, k: 82, ca: 70, mg: 14, fe: 1.75, ec: 1.2, ph_min: 6.0, ph_max: 6.5, notes: "EC around 2.0 mS/cm for optimal yield" },
    arugula: { n: 60, p: 14, k: 65, ca: 57, mg: 11, fe: 1.6, ec: 0.85, ph_min: 6.0, ph_max: 6.5, notes: "EC between 0.5 and 2.0 mS/cm" },
    pac_choi: { n: 65, p: 17, k: 80, ca: 65, mg: 14, fe: 1.75, ec: 1.25, ph_min: 6.0, ph_max: 6.8, notes: "Same EC range as arugula" },
    
    // HERBS
    basil: { n: 95, p: 25, k: 150, ca: 95, mg: 22, fe: 2.05, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Highest production in micronutrient supplemented systems" },
    mint: { n: 80, p: 21, k: 130, ca: 80, mg: 18, fe: 1.85, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Shows stress response without supplementation" },
    parsley: { n: 70, p: 17, k: 110, ca: 72, mg: 15, fe: 1.65, ec: 1.1, ph_min: 6.0, ph_max: 7.0, notes: "Prefers cooler water temperatures" },
    cilantro: { n: 65, p: 15, k: 100, ca: 65, mg: 13, fe: 1.5, ec: 1.05, ph_min: 6.0, ph_max: 6.8, notes: "Fast-growing, harvest in 2-3 weeks" },
    chives: { n: 55, p: 14, k: 85, ca: 55, mg: 11, fe: 1.3, ec: 1.0, ph_min: 6.0, ph_max: 7.0, notes: "Low nutrient requirements" },
    oregano: { n: 62, p: 16, k: 95, ca: 65, mg: 14, fe: 1.5, ec: 1.15, ph_min: 6.0, ph_max: 7.0, notes: "Mediterranean herb, drought tolerant" },
    thyme: { n: 57, p: 14, k: 90, ca: 60, mg: 12, fe: 1.4, ec: 1.05, ph_min: 6.5, ph_max: 7.5, notes: "Prefers slightly alkaline conditions" },
    
    // FRUITING VEGETABLES
    tomatoes: { n: 150, p: 45, k: 275, ca: 150, mg: 37, fe: 2.5, ec: 2.0, ph_min: 5.8, ph_max: 6.5, notes: "K accumulates in fruits; Ca decreases during fruiting" },
    peppers: { n: 115, p: 37, k: 225, ca: 120, mg: 30, fe: 2.3, ec: 1.85, ph_min: 5.8, ph_max: 6.5, notes: "Require warmer water temperatures" },
    cucumbers: { n: 135, p: 40, k: 200, ca: 135, mg: 33, fe: 2.4, ec: 1.9, ph_min: 5.8, ph_max: 6.2, notes: "High water requirement; good for NFT systems" },
    eggplant: { n: 125, p: 38, k: 210, ca: 125, mg: 28, fe: 2.2, ec: 1.8, ph_min: 5.8, ph_max: 6.2, notes: "Slower growing than other fruiting vegetables" },
    strawberries: { n: 85, p: 28, k: 165, ca: 85, mg: 20, fe: 2.0, ec: 1.4, ph_min: 5.5, ph_max: 6.2, notes: "Prefer cooler root zones; sensitive to salt buildup" }
};

// Mapping crop names to categories
const cropCategories = {
    lettuce: 'leafy_greens', spinach: 'leafy_greens', kale: 'leafy_greens',
    swiss_chard: 'leafy_greens', arugula: 'leafy_greens', pac_choi: 'leafy_greens',
    basil: 'herbs', mint: 'herbs', parsley: 'herbs', cilantro: 'herbs',
    chives: 'herbs', oregano: 'herbs', thyme: 'herbs',
    tomatoes: 'fruiting_vegetables', peppers: 'fruiting_vegetables',
    cucumbers: 'fruiting_vegetables', eggplant: 'fruiting_vegetables',
    strawberries: 'fruiting_vegetables'
};

// Nutrient mapping
const nutrientMapping = {
    n: 'nitrogen',
    p: 'phosphorus',
    k: 'potassium',
    ca: 'calcium',
    mg: 'magnesium',
    fe: 'iron',
    ec: 'ec',
    ph: 'ph'
};

async function migrateCropKnowledgeData() {
    console.log('🌱 Migrating crop knowledge data...');
    
    try {
        const pool = getDatabase();
        
        // Get reference IDs
        const [categories] = await pool.execute('SELECT id, code FROM crop_categories');
        const [nutrients] = await pool.execute('SELECT id, code FROM nutrients');
        const [stages] = await pool.execute('SELECT id, code FROM growth_stages WHERE code = "general"');
        
        const categoryMap = {};
        categories.forEach(cat => categoryMap[cat.code] = cat.id);
        
        const nutrientMap = {};
        nutrients.forEach(nut => nutrientMap[nut.code] = nut.id);
        
        const generalStageId = stages[0]?.id;
        
        console.log('📋 Reference maps created:', {
            categories: Object.keys(categoryMap).length,
            nutrients: Object.keys(nutrientMap).length,
            generalStageId
        });
        
        // Migrate each crop
        for (const [cropCode, cropData] of Object.entries(cropTargetsData)) {
            console.log(`🌿 Processing ${cropCode}...`);
            
            // Get category ID
            const categoryCode = cropCategories[cropCode];
            const categoryId = categoryMap[categoryCode];
            
            if (!categoryId) {
                console.warn(`⚠️  Category not found for ${cropCode}: ${categoryCode}`);
                continue;
            }
            
            // Insert crop
            const [cropResult] = await pool.execute(`
                INSERT IGNORE INTO crops (
                    code, name, category_id, 
                    default_ec_min, default_ec_max, 
                    default_ph_min, default_ph_max,
                    growing_notes, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cropCode,
                cropCode.charAt(0).toUpperCase() + cropCode.slice(1).replace(/_/g, ' '),
                categoryId,
                cropData.ec * 0.8, // 20% range around target
                cropData.ec * 1.2,
                cropData.ph_min,
                cropData.ph_max,
                cropData.notes || '',
                true
            ]);
            
            // Get crop ID
            const [cropRows] = await pool.execute('SELECT id FROM crops WHERE code = ?', [cropCode]);
            const cropId = cropRows[0]?.id;
            
            if (!cropId) {
                console.warn(`⚠️  Could not get crop ID for ${cropCode}`);
                continue;
            }
            
            // Insert nutrient targets
            for (const [nutrientCode, value] of Object.entries(cropData)) {
                if (nutrientCode === 'notes' || nutrientCode === 'ph_min' || nutrientCode === 'ph_max') continue;
                if (nutrientCode === 'ec') continue; // EC handled separately
                
                const mappedNutrientCode = nutrientMapping[nutrientCode];
                const nutrientId = nutrientMap[mappedNutrientCode];
                
                if (!nutrientId) {
                    console.warn(`⚠️  Nutrient not found: ${nutrientCode} -> ${mappedNutrientCode}`);
                    continue;
                }
                
                // Calculate range (±20% of target)
                const target = parseFloat(value);
                const minValue = target * 0.8;
                const maxValue = target * 1.2;
                
                await pool.execute(`
                    INSERT IGNORE INTO crop_nutrient_targets (
                        crop_id, nutrient_id, growth_stage_id,
                        target_value, min_value, max_value
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [cropId, nutrientId, generalStageId, target, minValue, maxValue]);
            }
            
            console.log(`✅ ${cropCode} migrated successfully`);
        }
        
        // Verify migration
        const [cropCount] = await pool.execute('SELECT COUNT(*) as count FROM crops WHERE is_active = true');
        const [targetCount] = await pool.execute('SELECT COUNT(*) as count FROM crop_nutrient_targets');
        
        console.log('🎉 Migration completed successfully!');
        console.log(`📊 Results: ${cropCount[0].count} crops, ${targetCount[0].count} nutrient targets`);
        
    } catch (error) {
        console.error('❌ Error migrating crop knowledge data:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    migrateCropKnowledgeData()
        .then(() => {
            console.log('🎉 Data migration completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateCropKnowledgeData };