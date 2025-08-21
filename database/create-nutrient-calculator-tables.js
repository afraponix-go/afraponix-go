const { getDatabase } = require('./init-mariadb');

async function createNutrientCalculatorTables() {
    try {
        const pool = getDatabase();
        console.log('🧪 Creating advanced nutrient calculator tables...');

        // Core nutrient definitions (enhanced from existing nutrients table)
        await pool.execute(`
            ALTER TABLE nutrients ADD COLUMN IF NOT EXISTS 
                atomic_weight DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS 
                valence INTEGER,
            ADD COLUMN IF NOT EXISTS 
                is_base_nutrient BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS 
                min_safe_level DECIMAL(10,2),
            ADD COLUMN IF NOT EXISTS 
                max_safe_level DECIMAL(10,2)
        `);

        // Mark nitrate as base nutrient
        await pool.execute(`
            UPDATE nutrients SET is_base_nutrient = TRUE WHERE code = 'nitrogen'
        `);

        // Environmental parameters
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS environmental_parameters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                unit VARCHAR(20),
                min_value DECIMAL(10,4),
                max_value DECIMAL(10,4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert environmental parameters
        await pool.execute(`
            INSERT IGNORE INTO environmental_parameters (code, name, unit, min_value, max_value) VALUES
            ('ec', 'Electrical Conductivity', 'mS/cm', 0.0, 5.0),
            ('ph', 'pH', NULL, 0.0, 14.0),
            ('temperature', 'Temperature', '°C', 0.0, 50.0),
            ('humidity', 'Relative Humidity', '%', 0.0, 100.0),
            ('ppfd', 'Light Intensity', 'μmol/m²/s', 0.0, 2000.0)
        `);

        // Condition types
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS condition_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            INSERT IGNORE INTO condition_types (code, name, category) VALUES
            ('standard', 'Standard Conditions', 'environmental'),
            ('high_transpiration', 'High Transpiration', 'environmental'),
            ('high_light', 'High Light Intensity', 'environmental'),
            ('low_humidity', 'Low Humidity', 'environmental'),
            ('minimum', 'Minimum Requirements', 'physiological')
        `);

        // Base ratio rules for nutrients
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS nutrient_ratio_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nutrient_id INT NOT NULL,
                growth_stage_id INT NULL,
                condition_type_id INT NULL,
                min_factor DECIMAL(10,4) NOT NULL,
                max_factor DECIMAL(10,4) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                priority INT DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id),
                FOREIGN KEY (growth_stage_id) REFERENCES growth_stages(id),
                FOREIGN KEY (condition_type_id) REFERENCES condition_types(id),
                UNIQUE KEY unique_nutrient_stage_condition (nutrient_id, growth_stage_id, condition_type_id)
            )
        `);

        // Environmental adjustments
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS environmental_adjustments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parameter_id INT NOT NULL,
                condition_name VARCHAR(50) NOT NULL,
                operator VARCHAR(10) NOT NULL,
                threshold_value DECIMAL(10,4) NOT NULL,
                threshold_value_max DECIMAL(10,4) NULL,
                adjustment_factor DECIMAL(10,4),
                applies_to_all_nutrients BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parameter_id) REFERENCES environmental_parameters(id)
            )
        `);

        // Environmental nutrient-specific adjustments
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS environmental_nutrient_adjustments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                adjustment_id INT NOT NULL,
                nutrient_id INT NOT NULL,
                factor_override DECIMAL(10,4),
                factor_multiplier DECIMAL(10,4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (adjustment_id) REFERENCES environmental_adjustments(id),
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id),
                UNIQUE KEY unique_adjustment_nutrient (adjustment_id, nutrient_id)
            )
        `);

        // Enhanced crop nutrient modifiers (building on existing crop_nutrient_targets)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS crop_nutrient_modifiers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                crop_id INT NOT NULL,
                nutrient_id INT NOT NULL,
                growth_stage_id INT NULL,
                factor_multiplier DECIMAL(10,4) NOT NULL DEFAULT 1.0,
                override_base_factor BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (crop_id) REFERENCES crops(id),
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id),
                FOREIGN KEY (growth_stage_id) REFERENCES growth_stages(id),
                UNIQUE KEY unique_crop_nutrient_stage (crop_id, nutrient_id, growth_stage_id)
            )
        `);

        // Formula templates for saved calculations
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS formula_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                base_nitrate_ppm DECIMAL(10,2) NOT NULL,
                crop_id INT NULL,
                growth_stage_id INT NULL,
                target_ec DECIMAL(4,2),
                target_ph DECIMAL(4,2),
                is_public BOOLEAN DEFAULT FALSE,
                tags JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (crop_id) REFERENCES crops(id),
                FOREIGN KEY (growth_stage_id) REFERENCES growth_stages(id)
            )
        `);

        // Calculation history
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS calculation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                formula_template_id INT NULL,
                input_nitrate_ppm DECIMAL(10,2) NOT NULL,
                crop_id INT NULL,
                growth_stage_id INT NULL,
                input_ec DECIMAL(4,2),
                input_ph DECIMAL(4,2),
                calculation_result JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (formula_template_id) REFERENCES formula_templates(id),
                FOREIGN KEY (crop_id) REFERENCES crops(id),
                FOREIGN KEY (growth_stage_id) REFERENCES growth_stages(id)
            )
        `);

        // Insert default ratio rules
        console.log('📊 Setting up default nutrient ratio rules...');
        
        // Get nutrient and stage IDs
        const [nutrients] = await pool.execute('SELECT id, code FROM nutrients');
        const [stages] = await pool.execute('SELECT id, code FROM growth_stages');

        const nutrientMap = Object.fromEntries(nutrients.map(n => [n.code, n.id]));
        const stageMap = Object.fromEntries(stages.map(s => [s.code, s.id]));

        // Default ratios based on common hydroponic formulas
        const defaultRatios = [
            // Phosphorus ratios
            { nutrient: 'phosphorus', stage: 'general', min: 0.25, max: 0.35, isDefault: true },
            { nutrient: 'phosphorus', stage: 'vegetative', min: 0.20, max: 0.30 },
            { nutrient: 'phosphorus', stage: 'flowering', min: 0.30, max: 0.40 },
            { nutrient: 'phosphorus', stage: 'fruiting', min: 0.35, max: 0.45 },
            
            // Potassium ratios
            { nutrient: 'potassium', stage: 'general', min: 1.0, max: 1.2, isDefault: true },
            { nutrient: 'potassium', stage: 'vegetative', min: 0.8, max: 1.0 },
            { nutrient: 'potassium', stage: 'flowering', min: 1.2, max: 1.5 },
            { nutrient: 'potassium', stage: 'fruiting', min: 1.4, max: 1.8 },
            
            // Calcium ratios
            { nutrient: 'calcium', stage: 'general', min: 0.6, max: 0.8, isDefault: true },
            { nutrient: 'calcium', stage: 'vegetative', min: 0.5, max: 0.7 },
            { nutrient: 'calcium', stage: 'flowering', min: 0.7, max: 0.9 },
            { nutrient: 'calcium', stage: 'fruiting', min: 0.8, max: 1.0 },
            
            // Magnesium ratios
            { nutrient: 'magnesium', stage: 'general', min: 0.15, max: 0.25, isDefault: true },
            { nutrient: 'magnesium', stage: 'vegetative', min: 0.12, max: 0.20 },
            { nutrient: 'magnesium', stage: 'flowering', min: 0.18, max: 0.28 },
            { nutrient: 'magnesium', stage: 'fruiting', min: 0.20, max: 0.30 },
            
            // Iron ratios
            { nutrient: 'iron', stage: 'general', min: 0.008, max: 0.015, isDefault: true },
            { nutrient: 'iron', stage: 'vegetative', min: 0.010, max: 0.018 },
            { nutrient: 'iron', stage: 'flowering', min: 0.006, max: 0.012 },
            { nutrient: 'iron', stage: 'fruiting', min: 0.008, max: 0.015 }
        ];

        for (const ratio of defaultRatios) {
            if (nutrientMap[ratio.nutrient] && stageMap[ratio.stage]) {
                await pool.execute(`
                    INSERT IGNORE INTO nutrient_ratio_rules 
                    (nutrient_id, growth_stage_id, min_factor, max_factor, is_default, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    nutrientMap[ratio.nutrient],
                    stageMap[ratio.stage],
                    ratio.min,
                    ratio.max,
                    ratio.isDefault || false,
                    `Default ratio for ${ratio.nutrient} during ${ratio.stage} stage`
                ]);
            }
        }

        // Add some environmental adjustments
        const [ecParam] = await pool.execute('SELECT id FROM environmental_parameters WHERE code = "ec"');
        const [phParam] = await pool.execute('SELECT id FROM environmental_parameters WHERE code = "ph"');

        if (ecParam.length > 0) {
            await pool.execute(`
                INSERT IGNORE INTO environmental_adjustments 
                (parameter_id, condition_name, operator, threshold_value, adjustment_factor)
                VALUES 
                (?, 'high', '>', 2.5, 0.9),
                (?, 'very_high', '>', 3.0, 0.8),
                (?, 'low', '<', 1.0, 1.1)
            `, [ecParam[0].id, ecParam[0].id, ecParam[0].id]);
        }

        if (phParam.length > 0) {
            await pool.execute(`
                INSERT IGNORE INTO environmental_adjustments 
                (parameter_id, condition_name, operator, threshold_value, adjustment_factor)
                VALUES 
                (?, 'high', '>', 7.5, 0.95),
                (?, 'low', '<', 5.5, 1.05)
            `, [phParam[0].id, phParam[0].id]);
        }

        // Create indexes for performance
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_ratio_rules_nutrient ON nutrient_ratio_rules(nutrient_id)');
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_ratio_rules_stage ON nutrient_ratio_rules(growth_stage_id)');
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_calculation_logs_user ON calculation_logs(user_id)');
        await pool.execute('CREATE INDEX IF NOT EXISTS idx_calculation_logs_created ON calculation_logs(created_at)');

        console.log('✅ Advanced nutrient calculator tables created successfully!');
        console.log('📈 Default ratio rules and environmental adjustments configured');

    } catch (error) {
        console.error('❌ Error creating nutrient calculator tables:', error);
        throw error;
    }
}

module.exports = { createNutrientCalculatorTables };

// Run if called directly
if (require.main === module) {
    createNutrientCalculatorTables()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}