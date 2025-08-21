const { getDatabase } = require('./init-mariadb');

async function createNutrientKnowledgeBase() {
    console.log('🌱 Creating nutrient knowledge base tables...');
    
    try {
        const pool = getDatabase();
        
        // 1. Create nutrients reference table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS nutrients (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(20) UNIQUE NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                name VARCHAR(50) NOT NULL,
                unit VARCHAR(10) DEFAULT 'ppm',
                is_base BOOLEAN DEFAULT FALSE,
                min_safe_level DECIMAL(10,2) DEFAULT NULL,
                max_safe_level DECIMAL(10,2) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_code (code),
                INDEX idx_is_base (is_base)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 2. Create crop categories table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS crop_categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(30) UNIQUE NOT NULL,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 3. Create growth stages table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS growth_stages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(30) UNIQUE NOT NULL,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_code (code),
                INDEX idx_sort_order (sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 4. Create crops master table (compatible with existing plant tables)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS crops (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(30) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                scientific_name VARCHAR(150) DEFAULT NULL,
                category_id INT REFERENCES crop_categories(id),
                default_ec_min DECIMAL(4,2) DEFAULT NULL,
                default_ec_max DECIMAL(4,2) DEFAULT NULL,
                default_ph_min DECIMAL(3,1) DEFAULT NULL,
                default_ph_max DECIMAL(3,1) DEFAULT NULL,
                days_to_harvest INT DEFAULT NULL,
                plant_spacing_cm DECIMAL(4,1) DEFAULT NULL,
                light_requirements ENUM('low', 'medium', 'high') DEFAULT 'medium',
                growing_notes TEXT DEFAULT NULL,
                research_source VARCHAR(255) DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_code (code),
                INDEX idx_category (category_id),
                INDEX idx_active (is_active),
                FOREIGN KEY (category_id) REFERENCES crop_categories(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // 5. Create crop nutrient targets table (normalized approach)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS crop_nutrient_targets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                crop_id INT NOT NULL,
                nutrient_id INT NOT NULL,
                target_value DECIMAL(10,3) NOT NULL,
                min_value DECIMAL(10,3) DEFAULT NULL,
                max_value DECIMAL(10,3) DEFAULT NULL,
                growth_stage_id INT DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_crop_nutrient_stage (crop_id, nutrient_id, growth_stage_id),
                INDEX idx_crop (crop_id),
                INDEX idx_nutrient (nutrient_id),
                INDEX idx_stage (growth_stage_id),
                FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
                FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE,
                FOREIGN KEY (growth_stage_id) REFERENCES growth_stages(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Nutrient knowledge base tables created successfully');
        
        // Insert initial reference data
        await seedReferenceData(pool);
        
    } catch (error) {
        console.error('❌ Error creating nutrient knowledge base:', error);
        throw error;
    }
}

async function seedReferenceData(pool) {
    console.log('🌱 Seeding reference data...');
    
    try {
        // Insert nutrients
        await pool.execute(`
            INSERT IGNORE INTO nutrients (code, symbol, name, unit, is_base, min_safe_level, max_safe_level) VALUES
            ('nitrate', 'NO₃⁻', 'Nitrate', 'ppm', true, 5, 300),
            ('nitrogen', 'N', 'Nitrogen', 'ppm', true, 50, 250),
            ('phosphorus', 'P', 'Phosphorus', 'ppm', false, 10, 50),
            ('potassium', 'K', 'Potassium', 'ppm', false, 40, 300),
            ('calcium', 'Ca', 'Calcium', 'ppm', false, 40, 200),
            ('magnesium', 'Mg', 'Magnesium', 'ppm', false, 10, 50),
            ('iron', 'Fe', 'Iron', 'ppm', false, 0.5, 5),
            ('ec', 'EC', 'Electrical Conductivity', 'mS/cm', false, 0.5, 4),
            ('ph', 'pH', 'pH Level', '', false, 5, 8)
        `);
        
        // Insert crop categories
        await pool.execute(`
            INSERT IGNORE INTO crop_categories (code, name, description) VALUES
            ('leafy_greens', 'Leafy Greens', 'Fast-growing leafy vegetables like lettuce, spinach, kale'),
            ('herbs', 'Herbs', 'Culinary herbs like basil, parsley, cilantro'),
            ('fruiting_vegetables', 'Fruiting Vegetables', 'Vegetables that produce fruits like tomatoes, peppers, cucumbers'),
            ('root_vegetables', 'Root Vegetables', 'Root-based crops like radishes, carrots'),
            ('microgreens', 'Microgreens', 'Young seedlings harvested early for tender leaves')
        `);
        
        // Insert growth stages
        await pool.execute(`
            INSERT IGNORE INTO growth_stages (code, name, description, sort_order) VALUES
            ('general', 'General Purpose', 'Default stage for most crops', 0),
            ('seedling', 'Seedling', 'First 1-2 weeks after germination', 1),
            ('vegetative', 'Vegetative', 'Active leaf and stem growth phase', 2),
            ('flowering', 'Flowering', 'Flower development stage', 3),
            ('fruiting', 'Fruiting', 'Fruit development and maturation', 4)
        `);
        
        console.log('✅ Reference data seeded successfully');
        
    } catch (error) {
        console.error('❌ Error seeding reference data:', error);
        throw error;
    }
}

// Alias for backward compatibility
const createCropKnowledgeTable = createNutrientKnowledgeBase;

// Run if called directly
if (require.main === module) {
    createCropKnowledgeTable()
        .then(() => {
            console.log('🎉 Database migration completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { createCropKnowledgeTable };