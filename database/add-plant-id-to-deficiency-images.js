const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'aquaponics',
  password: process.env.DB_PASSWORD || 'dev123',
  database: process.env.DB_NAME || 'aquaponics_dev'
};

async function addPlantIdToDeficiencyImages() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Add plant_id column to nutrient_deficiency_images table
    console.log('📝 Adding plant_id column to nutrient_deficiency_images table...');
    
    await connection.execute(`
      ALTER TABLE nutrient_deficiency_images 
      ADD COLUMN IF NOT EXISTS plant_id INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS system_id VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grow_bed_id INT DEFAULT NULL,
      ADD INDEX idx_plant_id (plant_id),
      ADD INDEX idx_system_id (system_id),
      ADD INDEX idx_grow_bed_id (grow_bed_id)
    `);
    
    console.log('✅ Successfully added plant_id and related columns to nutrient_deficiency_images table');
    
    // Check if crops table exists and has the expected structure
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name = 'crops'
    `, [dbConfig.database]);
    
    if (tables[0].count > 0) {
      console.log('✅ crops table exists');
      
      // Add foreign key constraint if the table exists
      try {
        await connection.execute(`
          ALTER TABLE nutrient_deficiency_images
          ADD CONSTRAINT fk_deficiency_crop
          FOREIGN KEY (plant_id) REFERENCES crops(id)
          ON DELETE SET NULL
        `);
        console.log('✅ Added foreign key constraint to crops table');
      } catch (error) {
        if (error.code === 'ER_DUP_KEY_NAME') {
          console.log('ℹ️ Foreign key constraint already exists');
        } else {
          console.log('⚠️ Could not add foreign key constraint:', error.message);
        }
      }
    } else {
      console.log('ℹ️ crops table not found - foreign key constraint not added');
    }
    
    // Show the updated table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns
      WHERE table_schema = ?
      AND table_name = 'nutrient_deficiency_images'
      AND COLUMN_NAME IN ('plant_id', 'system_id', 'grow_bed_id')
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('\n📊 New columns added:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding plant_id to deficiency images:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the migration
if (require.main === module) {
  addPlantIdToDeficiencyImages()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Deficiency images can now be linked to specific crops from the master crops database');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to add plant_id column:', error);
      process.exit(1);
    });
}

module.exports = { addPlantIdToDeficiencyImages };