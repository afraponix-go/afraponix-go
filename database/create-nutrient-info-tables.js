const { getDatabase } = require('../database/init-mariadb');

async function createNutrientInfoTables() {
    console.log('🔄 Creating comprehensive nutrient information tables...');
    
    try {
        const pool = getDatabase();
        
        // 1. Add mobility and detailed info columns to existing nutrients table
        console.log('Adding mobility and description columns to nutrients table...');
        await pool.execute(`
            ALTER TABLE nutrients 
            ADD COLUMN IF NOT EXISTS mobility ENUM('mobile', 'immobile') DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS primary_functions TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS deficiency_symptoms TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS toxicity_symptoms TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS common_sources TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS uptake_interactions TEXT DEFAULT NULL
        `);
        
        // 2. Create nutrient_deficiency_images table
        console.log('Creating nutrient_deficiency_images table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS nutrient_deficiency_images (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nutrient_id INT NOT NULL,
                image_filename VARCHAR(255) NOT NULL,
                image_url VARCHAR(500) DEFAULT NULL,
                caption TEXT DEFAULT NULL,
                deficiency_stage ENUM('early', 'moderate', 'severe') DEFAULT 'moderate',
                plant_type VARCHAR(100) DEFAULT NULL,
                crop_specific VARCHAR(100) DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                uploaded_by INT DEFAULT NULL,
                
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
                
                INDEX idx_nutrient_deficiency (nutrient_id),
                INDEX idx_deficiency_stage (deficiency_stage),
                INDEX idx_active (is_active)
            )
        `);
        
        // 3. Create nutrient_competition table for uptake interactions
        console.log('Creating nutrient_competition table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS nutrient_competition (
                id INT PRIMARY KEY AUTO_INCREMENT,
                primary_nutrient_id INT NOT NULL,
                competing_nutrient_id INT NOT NULL,
                competition_type ENUM('antagonistic', 'synergistic', 'inhibitive') NOT NULL,
                competition_strength ENUM('weak', 'moderate', 'strong') DEFAULT 'moderate',
                description TEXT DEFAULT NULL,
                optimal_ratio_notes TEXT DEFAULT NULL,
                
                FOREIGN KEY (primary_nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE,
                FOREIGN KEY (competing_nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE,
                
                UNIQUE KEY unique_competition (primary_nutrient_id, competing_nutrient_id),
                INDEX idx_primary_nutrient (primary_nutrient_id),
                INDEX idx_competing_nutrient (competing_nutrient_id)
            )
        `);
        
        // 4. Create nutrient_ph_availability table for pH-dependent uptake
        console.log('Creating nutrient_ph_availability table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS nutrient_ph_availability (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nutrient_id INT NOT NULL,
                ph_min DECIMAL(3,1) NOT NULL,
                ph_max DECIMAL(3,1) NOT NULL,
                availability_percentage INT NOT NULL CHECK (availability_percentage BETWEEN 0 AND 100),
                notes TEXT DEFAULT NULL,
                
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE,
                
                INDEX idx_nutrient_ph (nutrient_id),
                INDEX idx_ph_range (ph_min, ph_max)
            )
        `);
        
        // 5. Seed the nutrients table with comprehensive information
        console.log('Seeding nutrients table with detailed information...');
        
        const nutrientDetails = [
            {
                code: 'nitrate',
                mobility: 'mobile',
                description: 'Primary macronutrient essential for vegetative growth and chlorophyll production',
                primary_functions: 'Protein synthesis, chlorophyll formation, vegetative growth, enzyme activation',
                deficiency_symptoms: 'Yellowing of older leaves (chlorosis), stunted growth, reduced leaf size, pale green coloration',
                toxicity_symptoms: 'Dark green foliage, delayed maturity, reduced flowering, increased susceptibility to diseases',
                common_sources: 'Calcium nitrate, potassium nitrate, ammonium nitrate, fish emulsion',
                uptake_interactions: 'High nitrogen can reduce potassium and phosphorus uptake; competes with chloride'
            },
            {
                code: 'phosphorus',
                mobility: 'mobile',
                description: 'Essential for energy transfer, root development, and flowering',
                primary_functions: 'Energy storage and transfer (ATP), root development, flowering, seed formation',
                deficiency_symptoms: 'Purple or reddish leaf coloration, poor root development, delayed flowering, reduced yields',
                toxicity_symptoms: 'Reduced uptake of iron, manganese, and zinc leading to micronutrient deficiencies',
                common_sources: 'Monopotassium phosphate, diammonium phosphate, bone meal, rock phosphate',
                uptake_interactions: 'Can be fixed by calcium and magnesium in alkaline conditions; competes with iron and zinc'
            },
            {
                code: 'potassium',
                mobility: 'mobile',
                description: 'Regulates water uptake, enzyme activation, and disease resistance',
                primary_functions: 'Osmotic regulation, enzyme activation, photosynthesis, disease resistance, fruit quality',
                deficiency_symptoms: 'Yellowing and browning of leaf edges (marginal burn), weak stems, increased disease susceptibility',
                toxicity_symptoms: 'Reduced uptake of calcium and magnesium, potential salt stress',
                common_sources: 'Potassium sulfate, potassium nitrate, potassium chloride, kelp meal',
                uptake_interactions: 'Competes with calcium and magnesium; high potassium can induce magnesium deficiency'
            },
            {
                code: 'calcium',
                mobility: 'immobile',
                description: 'Structural component essential for cell wall development and membrane stability',
                primary_functions: 'Cell wall formation, membrane stability, enzyme regulation, root development',
                deficiency_symptoms: 'Brown/black spots on leaves, blossom end rot in fruits, stunted growth, poor root development',
                toxicity_symptoms: 'Reduced uptake of potassium, magnesium, iron, and manganese',
                common_sources: 'Calcium nitrate, calcium chloride, gypsum, limestone',
                uptake_interactions: 'Competes with potassium and magnesium; requires proper Ca:Mg:K ratios'
            },
            {
                code: 'magnesium',
                mobility: 'mobile',
                description: 'Central component of chlorophyll and enzyme cofactor',
                primary_functions: 'Chlorophyll synthesis, enzyme activation, photosynthesis, sugar transport',
                deficiency_symptoms: 'Interveinal chlorosis (yellowing between leaf veins), starting with older leaves',
                toxicity_symptoms: 'Rare in hydroponic systems, can reduce calcium uptake',
                common_sources: 'Magnesium sulfate (Epsom salt), magnesium nitrate, dolomite limestone',
                uptake_interactions: 'Competes with calcium and potassium; optimal Ca:Mg ratio is 3-4:1'
            },
            {
                code: 'sulfur',
                mobility: 'mobile',
                description: 'Component of amino acids, proteins, and essential oils',
                primary_functions: 'Protein synthesis, oil production, enzyme formation, nitrogen metabolism',
                deficiency_symptoms: 'Yellowing of younger leaves (similar to nitrogen but affects new growth first)',
                toxicity_symptoms: 'Rare, may cause leaf burn at very high concentrations',
                common_sources: 'Magnesium sulfate, potassium sulfate, calcium sulfate (gypsum)',
                uptake_interactions: 'Generally compatible with other nutrients, absorbed as sulfate ion'
            },
            {
                code: 'iron',
                mobility: 'immobile',
                description: 'Essential for chlorophyll synthesis and electron transport',
                primary_functions: 'Chlorophyll synthesis, electron transport, enzyme activation, oxygen transport',
                deficiency_symptoms: 'Interveinal chlorosis of young leaves, yellowing with green veins, stunted growth',
                toxicity_symptoms: 'Bronze spotting on leaves, reduced growth, possible root damage',
                common_sources: 'Iron EDTA, iron DTPA, iron sulfate, chelated iron compounds',
                uptake_interactions: 'Competes with manganese and zinc; availability decreased by high pH and phosphorus'
            },
            {
                code: 'manganese',
                mobility: 'immobile',
                description: 'Enzyme activator essential for photosynthesis and nitrogen metabolism',
                primary_functions: 'Enzyme activation, photosynthesis, nitrogen metabolism, disease resistance',
                deficiency_symptoms: 'Interveinal chlorosis of young leaves, necrotic spots, reduced flowering',
                toxicity_symptoms: 'Brown spots on older leaves, reduced iron uptake',
                common_sources: 'Manganese sulfate, manganese EDTA, manganese chloride',
                uptake_interactions: 'Competes with iron and zinc; high pH reduces availability'
            },
            {
                code: 'zinc',
                mobility: 'immobile',
                description: 'Enzyme cofactor essential for growth regulation and protein synthesis',
                primary_functions: 'Enzyme activation, growth regulation, protein synthesis, auxin production',
                deficiency_symptoms: 'Stunted growth, small leaves, interveinal chlorosis, delayed maturity',
                toxicity_symptoms: 'Iron chlorosis, reduced growth, root damage',
                common_sources: 'Zinc sulfate, zinc EDTA, zinc oxide',
                uptake_interactions: 'Competes with iron, copper, and manganese; high phosphorus can induce deficiency'
            },
            {
                code: 'copper',
                mobility: 'immobile',
                description: 'Component of enzymes involved in respiration and photosynthesis',
                primary_functions: 'Enzyme component, photosynthesis, respiration, protein synthesis',
                deficiency_symptoms: 'Wilting, yellowing of leaf tips, poor flowering, dieback of shoots',
                toxicity_symptoms: 'Chlorosis, stunted roots, reduced iron uptake',
                common_sources: 'Copper sulfate, copper EDTA, copper oxide',
                uptake_interactions: 'Competes with iron and zinc; antagonistic with molybdenum'
            },
            {
                code: 'boron',
                mobility: 'immobile',
                description: 'Essential for cell wall formation and reproductive development',
                primary_functions: 'Cell wall synthesis, sugar transport, flowering, pollen tube growth',
                deficiency_symptoms: 'Brittle leaves, poor flowering, hollow stems, stunted growth',
                toxicity_symptoms: 'Leaf burn, yellowing of leaf tips, reduced growth',
                common_sources: 'Boric acid, sodium borate, boron EDTA',
                uptake_interactions: 'Availability affected by pH; high calcium can reduce uptake'
            },
            {
                code: 'molybdenum',
                mobility: 'mobile',
                description: 'Essential for nitrogen fixation and nitrate reduction',
                primary_functions: 'Nitrogen fixation, nitrate reduction, enzyme component',
                deficiency_symptoms: 'Stunted growth, yellowing similar to nitrogen deficiency, poor flowering',
                toxicity_symptoms: 'Rare, may cause copper deficiency symptoms',
                common_sources: 'Sodium molybdate, ammonium molybdate',
                uptake_interactions: 'Antagonistic with copper; availability increases with pH'
            }
        ];
        
        for (const nutrient of nutrientDetails) {
            await pool.execute(`
                UPDATE nutrients SET
                    mobility = ?,
                    description = ?,
                    primary_functions = ?,
                    deficiency_symptoms = ?,
                    toxicity_symptoms = ?,
                    common_sources = ?,
                    uptake_interactions = ?
                WHERE code = ?
            `, [
                nutrient.mobility,
                nutrient.description,
                nutrient.primary_functions,
                nutrient.deficiency_symptoms,
                nutrient.toxicity_symptoms,
                nutrient.common_sources,
                nutrient.uptake_interactions,
                nutrient.code
            ]);
        }
        
        // 6. Add common nutrient competition relationships
        console.log('Adding nutrient competition relationships...');
        
        const competitions = [
            { primary: 'potassium', competing: 'calcium', type: 'antagonistic', strength: 'moderate', description: 'High potassium can reduce calcium uptake' },
            { primary: 'potassium', competing: 'magnesium', type: 'antagonistic', strength: 'strong', description: 'Potassium-magnesium antagonism is well documented' },
            { primary: 'calcium', competing: 'magnesium', type: 'antagonistic', strength: 'moderate', description: 'Calcium can interfere with magnesium uptake at high ratios' },
            { primary: 'phosphorus', competing: 'iron', type: 'antagonistic', strength: 'strong', description: 'High phosphorus can precipitate iron, causing deficiency' },
            { primary: 'phosphorus', competing: 'zinc', type: 'antagonistic', strength: 'moderate', description: 'Phosphorus can reduce zinc availability' },
            { primary: 'iron', competing: 'manganese', type: 'antagonistic', strength: 'moderate', description: 'Iron and manganese compete for uptake sites' },
            { primary: 'iron', competing: 'zinc', type: 'antagonistic', strength: 'moderate', description: 'Iron can reduce zinc uptake' },
            { primary: 'copper', competing: 'iron', type: 'antagonistic', strength: 'weak', description: 'Copper can interfere with iron uptake' },
            { primary: 'copper', competing: 'molybdenum', type: 'antagonistic', strength: 'strong', description: 'Copper and molybdenum are strongly antagonistic' },
            { primary: 'nitrate', competing: 'potassium', type: 'synergistic', strength: 'moderate', description: 'Nitrogen and potassium work together for growth' }
        ];
        
        for (const comp of competitions) {
            // Get nutrient IDs
            const [primaryResult] = await pool.execute('SELECT id FROM nutrients WHERE code = ?', [comp.primary]);
            const [competingResult] = await pool.execute('SELECT id FROM nutrients WHERE code = ?', [comp.competing]);
            
            if (primaryResult.length > 0 && competingResult.length > 0) {
                await pool.execute(`
                    INSERT IGNORE INTO nutrient_competition 
                    (primary_nutrient_id, competing_nutrient_id, competition_type, competition_strength, description)
                    VALUES (?, ?, ?, ?, ?)
                `, [primaryResult[0].id, competingResult[0].id, comp.type, comp.strength, comp.description]);
            }
        }
        
        // 7. Add pH availability ranges for key nutrients
        console.log('Adding pH availability data...');
        
        const phAvailability = [
            { nutrient: 'iron', ranges: [[5.0, 6.0, 100], [6.0, 7.0, 80], [7.0, 8.0, 40], [8.0, 8.5, 20]] },
            { nutrient: 'manganese', ranges: [[5.0, 6.5, 100], [6.5, 7.5, 70], [7.5, 8.5, 30]] },
            { nutrient: 'zinc', ranges: [[5.0, 6.5, 100], [6.5, 7.0, 80], [7.0, 8.0, 50], [8.0, 8.5, 25]] },
            { nutrient: 'phosphorus', ranges: [[5.5, 7.0, 100], [5.0, 5.5, 80], [7.0, 8.0, 80], [8.0, 8.5, 60]] },
            { nutrient: 'boron', ranges: [[5.5, 7.5, 100], [5.0, 5.5, 80], [7.5, 8.5, 70]] }
        ];
        
        for (const nutrient of phAvailability) {
            const [nutrientResult] = await pool.execute('SELECT id FROM nutrients WHERE code = ?', [nutrient.nutrient]);
            if (nutrientResult.length > 0) {
                const nutrientId = nutrientResult[0].id;
                for (const [phMin, phMax, availability] of nutrient.ranges) {
                    await pool.execute(`
                        INSERT IGNORE INTO nutrient_ph_availability 
                        (nutrient_id, ph_min, ph_max, availability_percentage)
                        VALUES (?, ?, ?, ?)
                    `, [nutrientId, phMin, phMax, availability]);
                }
            }
        }
        
        console.log('✅ Comprehensive nutrient information tables created successfully!');
        
        // Verify the setup
        const [nutrientCount] = await pool.execute('SELECT COUNT(*) as count FROM nutrients WHERE mobility IS NOT NULL');
        const [imageTableCheck] = await pool.execute('SHOW TABLES LIKE "nutrient_deficiency_images"');
        const [competitionCount] = await pool.execute('SELECT COUNT(*) as count FROM nutrient_competition');
        const [phCount] = await pool.execute('SELECT COUNT(*) as count FROM nutrient_ph_availability');
        
        console.log(`📊 Setup verification:`);
        console.log(`   - Nutrients with mobility data: ${nutrientCount[0].count}`);
        console.log(`   - Deficiency images table: ${imageTableCheck.length > 0 ? '✅ Created' : '❌ Not found'}`);
        console.log(`   - Competition relationships: ${competitionCount[0].count}`);
        console.log(`   - pH availability records: ${phCount[0].count}`);
        
    } catch (error) {
        console.error('❌ Error creating nutrient information tables:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createNutrientInfoTables()
        .then(() => {
            console.log('✅ Nutrient information schema setup complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to setup nutrient information schema:', error);
            process.exit(1);
        });
}

module.exports = { createNutrientInfoTables };