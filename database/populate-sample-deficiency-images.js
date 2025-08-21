const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'aquaponics',
  password: process.env.DB_PASSWORD || 'dev123',
  database: process.env.DB_NAME || 'aquaponics_dev'
};

// Sample deficiency images data with correct column names matching database schema
const sampleDeficiencyImages = [
  // Nitrogen deficiency images  
  {
    nutrient_code: 'nitrate', // Use 'nitrate' as that's the code in nutrients table
    image_filename: 'nitrogen_deficiency_lettuce.jpg',
    image_url: '/images/deficiencies/nitrogen_deficiency_lettuce.jpg',
    caption: 'Lettuce showing pale yellow lower leaves - early nitrogen deficiency',
    deficiency_stage: 'early',
    plant_type: 'lettuce',
    crop_specific: 'lettuce'
  },
  {
    nutrient_code: 'nitrate',
    image_filename: 'nitrogen_deficiency_basil_severe.jpg',
    image_url: '/images/deficiencies/nitrogen_deficiency_basil_severe.jpg',
    caption: 'Basil with severe nitrogen deficiency - yellow leaves progressing to brown',
    deficiency_stage: 'severe',
    plant_type: 'basil',
    crop_specific: 'basil'
  },
  
  // Potassium deficiency images
  {
    nutrient_code: 'potassium',
    image_filename: 'potassium_deficiency_tomato.jpg',
    image_url: '/images/deficiencies/potassium_deficiency_tomato.jpg',
    caption: 'Tomato leaves showing brown leaf edges - classic potassium deficiency',
    deficiency_stage: 'moderate',
    plant_type: 'tomato',
    crop_specific: 'tomato'
  },
  {
    nutrient_code: 'potassium',
    image_filename: 'potassium_deficiency_lettuce_mild.jpg',
    image_url: '/images/deficiencies/potassium_deficiency_lettuce_mild.jpg',
    caption: 'Lettuce with early potassium deficiency - slight yellowing of leaf margins',
    deficiency_stage: 'early',
    plant_type: 'lettuce',
    crop_specific: 'lettuce'
  },
  
  // Phosphorus deficiency images
  {
    nutrient_code: 'phosphorus',
    image_filename: 'phosphorus_deficiency_basil.jpg',
    image_url: '/images/deficiencies/phosphorus_deficiency_basil.jpg',
    caption: 'Basil showing purple-red discoloration on stems and leaves',
    deficiency_stage: 'moderate',
    plant_type: 'basil',
    crop_specific: 'basil'
  },
  
  // Iron deficiency images
  {
    nutrient_code: 'iron',
    image_filename: 'iron_deficiency_lettuce.jpg',
    image_url: '/images/deficiencies/iron_deficiency_lettuce.jpg',
    caption: 'Lettuce showing interveinal chlorosis - iron deficiency in young leaves',
    deficiency_stage: 'moderate',
    plant_type: 'lettuce',
    crop_specific: 'lettuce'
  },
  {
    nutrient_code: 'iron',
    image_filename: 'iron_deficiency_spinach_severe.jpg',
    image_url: '/images/deficiencies/iron_deficiency_spinach_severe.jpg',
    caption: 'Spinach with severe iron chlorosis - almost white young leaves',
    deficiency_stage: 'severe',
    plant_type: 'spinach',
    crop_specific: 'spinach'
  },
  
  // Calcium deficiency images
  {
    nutrient_code: 'calcium',
    image_filename: 'calcium_deficiency_lettuce_tipburn.jpg',
    image_url: '/images/deficiencies/calcium_deficiency_lettuce_tipburn.jpg',
    caption: 'Lettuce showing tip burn - calcium deficiency in leaf margins',
    deficiency_stage: 'moderate',
    plant_type: 'lettuce',
    crop_specific: 'lettuce'
  },
  
  // Magnesium deficiency images
  {
    nutrient_code: 'magnesium',
    image_filename: 'magnesium_deficiency_tomato.jpg',
    image_url: '/images/deficiencies/magnesium_deficiency_tomato.jpg',
    caption: 'Tomato showing interveinal chlorosis starting from lower leaves',
    deficiency_stage: 'moderate',
    plant_type: 'tomato',
    crop_specific: 'tomato'
  },
  
  // Sulfur deficiency images
  {
    nutrient_code: 'sulfur',
    image_filename: 'sulfur_deficiency_kale.jpg',
    image_url: '/images/deficiencies/sulfur_deficiency_kale.jpg',
    caption: 'Kale with pale green coloration - sulfur deficiency affecting young leaves',
    deficiency_stage: 'early',
    plant_type: 'kale',
    crop_specific: 'kale'
  }
];

async function populateSampleDeficiencyImages() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Clear existing sample data
    console.log('Clearing existing sample deficiency images...');
    await connection.execute('DELETE FROM nutrient_deficiency_images WHERE image_url LIKE "/images/deficiencies/%"');
    
    console.log('Inserting sample deficiency images...');
    
    for (const image of sampleDeficiencyImages) {
      // First get the nutrient ID from the nutrients table
      const [nutrientResult] = await connection.execute(
        'SELECT id FROM nutrients WHERE code = ?', 
        [image.nutrient_code]
      );
      
      if (nutrientResult.length === 0) {
        console.log(`⚠️  Nutrient '${image.nutrient_code}' not found, skipping image`);
        continue;
      }
      
      const nutrientId = nutrientResult[0].id;
      
      const query = `
        INSERT INTO nutrient_deficiency_images 
        (nutrient_id, image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await connection.execute(query, [
        nutrientId,
        image.image_filename,
        image.image_url,
        image.caption,
        image.deficiency_stage,
        image.plant_type,
        image.crop_specific
      ]);
      
      console.log(`✓ Added ${image.deficiency_stage} ${image.nutrient_code} deficiency image for ${image.plant_type}`);
    }
    
    // Verify insertion
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM nutrient_deficiency_images');
    console.log(`\n✅ Successfully populated ${result[0].count} sample deficiency images`);
    
    // Show summary by nutrient
    const [summary] = await connection.execute(`
      SELECT 
        n.code as nutrient_code,
        COUNT(*) as image_count,
        GROUP_CONCAT(DISTINCT ndi.plant_type) as plant_types,
        GROUP_CONCAT(DISTINCT ndi.deficiency_stage) as stages
      FROM nutrient_deficiency_images ndi
      JOIN nutrients n ON ndi.nutrient_id = n.id
      GROUP BY n.code
      ORDER BY n.code
    `);
    
    console.log('\n📊 Summary by nutrient:');
    summary.forEach(row => {
      console.log(`  ${row.nutrient_code}: ${row.image_count} images (${row.plant_types}) - stages: ${row.stages}`);
    });
    
  } catch (error) {
    console.error('Error populating sample deficiency images:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the population script
if (require.main === module) {
  populateSampleDeficiencyImages()
    .then(() => {
      console.log('\n🎉 Sample deficiency images population completed successfully!');
      console.log('💡 Note: These are placeholder image URLs for demonstration.');
      console.log('💡 To use real images, upload them to the /images/deficiencies/ directory.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to populate sample deficiency images:', error);
      process.exit(1);
    });
}

module.exports = { populateSampleDeficiencyImages };