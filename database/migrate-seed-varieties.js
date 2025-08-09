require('dotenv').config();
const { getDatabase } = require('./init-mariadb');

async function migrateSeedVarieties() {
    let connection;
    
    try {
        connection = await getDatabase();
        
        // Check if seed_varieties table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'seed_varieties'"
        );
        
        if (tables.length > 0) {
            console.log('✅ Seed varieties table already exists - checking for data...');
        } else {
            // Create seed_varieties table
            await connection.execute(`
                CREATE TABLE seed_varieties (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    crop_type VARCHAR(100) NOT NULL,
                    variety_name VARCHAR(200) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_crop_variety (crop_type, variety_name)
                )
            `);
            console.log('✅ Created seed_varieties table');
        }
        
        // Insert seed varieties data
        const varieties = [
            // Lettuce - batavian varieties
            ['lettuce_batavian', 'Junction'],
            ['lettuce_batavian', 'Starfighter'],
            
            // Lettuce - butter varieties  
            ['lettuce_butter', 'Analera'],
            ['lettuce_butter', 'Anandria'],
            ['lettuce_butter', 'EZME'],
            ['lettuce_butter', 'Faustina'],
            ['lettuce_butter', 'Abonned'],
            ['lettuce_butter', 'Rafael'],
            ['lettuce_butter', 'Rosaire'],
            ['lettuce_butter', 'Tiberius'],
            
            // Lettuce - cos varieties
            ['lettuce_cos', 'Carmim'],
            ['lettuce_cos', 'Dabi'],
            ['lettuce_cos', 'Levistro'],
            ['lettuce_cos', 'Lucano'],
            ['lettuce_cos', 'Red Sead'],
            ['lettuce_cos', 'Vela'],
            ['lettuce_cos', 'Wildebest'],
            
            // Lettuce - little gem varieties (icty)
            ['lettuce_icty', 'Pinocrio'],
            ['lettuce_icty', 'Sudica da'],
            ['lettuce_icty', 'Angelica'],
            ['lettuce_icty', 'Gloria'],
            ['lettuce_icty', 'Lunix'],
            ['lettuce_icty', 'Mik'],
            
            // General lettuce varieties (for base lettuce type)
            ['lettuce', 'Junction'],
            ['lettuce', 'Starfighter'],
            ['lettuce', 'Analera'],
            ['lettuce', 'Anandria'],
            ['lettuce', 'EZME'],
            ['lettuce', 'Faustina'],
            ['lettuce', 'Carmim'],
            ['lettuce', 'Dabi'],
            ['lettuce', 'Levistro'],
            ['lettuce', 'Pinocrio'],
            
            // Other crops - add some example varieties
            ['spinach', 'Space'],
            ['spinach', 'Bloomsdale'],
            ['spinach', 'Giant Winter'],
            ['kale', 'Curly'],
            ['kale', 'Lacinato'],
            ['kale', 'Red Russian'],
            ['basil', 'Genovese'],
            ['basil', 'Purple Ruffles'],
            ['basil', 'Thai'],
            ['celery', 'Utah'],
            ['celery', 'Golden Self-Blanching'],
            ['spring_onion', 'White Lisbon'],
            ['spring_onion', 'Red Baron'],
            ['leeks', 'American Flag'],
            ['leeks', 'King Richard']
        ];
        
        let insertedCount = 0;
        for (const [cropType, varietyName] of varieties) {
            try {
                await connection.execute(
                    'INSERT IGNORE INTO seed_varieties (crop_type, variety_name) VALUES (?, ?)',
                    [cropType, varietyName]
                );
                insertedCount++;
            } catch (err) {
                // Ignore duplicates
                if (!err.message.includes('Duplicate entry')) {
                    console.error(`Error inserting ${cropType} - ${varietyName}:`, err.message);
                }
            }
        }
        
        // Check final count
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM seed_varieties');
        const totalVarieties = countResult[0].count;
        
        await connection.end();
        
        console.log(`✅ Seed varieties migration completed successfully!`);
        console.log(`📊 Total varieties in database: ${totalVarieties}`);
        console.log(`🌱 Ready for dynamic seed variety dropdowns`);
        
    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Seed varieties migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateSeedVarieties()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { migrateSeedVarieties };