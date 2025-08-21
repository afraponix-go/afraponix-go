const { getDatabase } = require('../database/init-mariadb');

async function seedDeficiencyImages() {
    console.log('🔄 Adding sample nutrient deficiency images...');
    
    try {
        const pool = getDatabase();
        
        // Sample deficiency images data - In production, these would be actual uploaded files
        const sampleImages = [
            // Potassium deficiency images
            {
                nutrient_code: 'potassium',
                image_filename: 'potassium-deficiency-early.jpg',
                image_url: '/images/deficiencies/potassium-deficiency-early.jpg',
                caption: 'Early potassium deficiency showing yellowing leaf edges',
                deficiency_stage: 'early',
                plant_type: 'leafy_greens',
                crop_specific: 'lettuce'
            },
            {
                nutrient_code: 'potassium',
                image_filename: 'potassium-deficiency-severe.jpg',
                image_url: '/images/deficiencies/potassium-deficiency-severe.jpg',
                caption: 'Severe potassium deficiency with brown marginal burn',
                deficiency_stage: 'severe',
                plant_type: 'leafy_greens',
                crop_specific: 'basil'
            },
            
            // Iron deficiency images
            {
                nutrient_code: 'iron',
                image_filename: 'iron-deficiency-interveinal.jpg',
                image_url: '/images/deficiencies/iron-deficiency-interveinal.jpg',
                caption: 'Classic iron deficiency - interveinal chlorosis in young leaves',
                deficiency_stage: 'moderate',
                plant_type: 'leafy_greens',
                crop_specific: 'spinach'
            },
            {
                nutrient_code: 'iron',
                image_filename: 'iron-deficiency-severe-yellowing.jpg',
                image_url: '/images/deficiencies/iron-deficiency-severe-yellowing.jpg',
                caption: 'Severe iron deficiency with white/yellow young leaves',
                deficiency_stage: 'severe',
                plant_type: 'fruiting',
                crop_specific: 'tomato'
            },
            
            // Nitrogen deficiency images
            {
                nutrient_code: 'nitrate',
                image_filename: 'nitrogen-deficiency-older-leaves.jpg',
                image_url: '/images/deficiencies/nitrogen-deficiency-older-leaves.jpg',
                caption: 'Nitrogen deficiency starting with older leaf yellowing',
                deficiency_stage: 'early',
                plant_type: 'leafy_greens',
                crop_specific: 'lettuce'
            },
            {
                nutrient_code: 'nitrate',
                image_filename: 'nitrogen-deficiency-uniform-yellowing.jpg',
                image_url: '/images/deficiencies/nitrogen-deficiency-uniform-yellowing.jpg',
                caption: 'Advanced nitrogen deficiency with uniform plant yellowing',
                deficiency_stage: 'severe',
                plant_type: 'herbs',
                crop_specific: 'basil'
            },
            
            // Phosphorus deficiency images
            {
                nutrient_code: 'phosphorus',
                image_filename: 'phosphorus-deficiency-purple.jpg',
                image_url: '/images/deficiencies/phosphorus-deficiency-purple.jpg',
                caption: 'Phosphorus deficiency showing purple/reddish leaf coloration',
                deficiency_stage: 'moderate',
                plant_type: 'leafy_greens',
                crop_specific: 'kale'
            },
            
            // Calcium deficiency images
            {
                nutrient_code: 'calcium',
                image_filename: 'calcium-deficiency-necrotic-spots.jpg',
                image_url: '/images/deficiencies/calcium-deficiency-necrotic-spots.jpg',
                caption: 'Calcium deficiency with brown necrotic spots on leaves',
                deficiency_stage: 'moderate',
                plant_type: 'leafy_greens',
                crop_specific: 'lettuce'
            },
            {
                nutrient_code: 'calcium',
                image_filename: 'calcium-blossom-end-rot.jpg',
                image_url: '/images/deficiencies/calcium-blossom-end-rot.jpg',
                caption: 'Blossom end rot in tomatoes caused by calcium deficiency',
                deficiency_stage: 'severe',
                plant_type: 'fruiting',
                crop_specific: 'tomato'
            },
            
            // Magnesium deficiency images
            {
                nutrient_code: 'magnesium',
                image_filename: 'magnesium-interveinal-chlorosis.jpg',
                image_url: '/images/deficiencies/magnesium-interveinal-chlorosis.jpg',
                caption: 'Magnesium deficiency - interveinal chlorosis in older leaves',
                deficiency_stage: 'moderate',
                plant_type: 'leafy_greens',
                crop_specific: 'spinach'
            },
            
            // Zinc deficiency images
            {
                nutrient_code: 'zinc',
                image_filename: 'zinc-deficiency-stunted-growth.jpg',
                image_url: '/images/deficiencies/zinc-deficiency-stunted-growth.jpg',
                caption: 'Zinc deficiency causing stunted growth and small leaves',
                deficiency_stage: 'moderate',
                plant_type: 'herbs',
                crop_specific: 'basil'
            },
            
            // Manganese deficiency images
            {
                nutrient_code: 'manganese',
                image_filename: 'manganese-interveinal-young-leaves.jpg',
                image_url: '/images/deficiencies/manganese-interveinal-young-leaves.jpg',
                caption: 'Manganese deficiency - interveinal chlorosis in young leaves',
                deficiency_stage: 'early',
                plant_type: 'leafy_greens',
                crop_specific: 'lettuce'
            },
            
            // Sulfur deficiency images
            {
                nutrient_code: 'sulfur',
                image_filename: 'sulfur-deficiency-uniform-yellowing.jpg',
                image_url: '/images/deficiencies/sulfur-deficiency-uniform-yellowing.jpg',
                caption: 'Sulfur deficiency - uniform yellowing of young leaves',
                deficiency_stage: 'moderate',
                plant_type: 'leafy_greens',
                crop_specific: 'kale'
            }
        ];
        
        console.log(`Adding ${sampleImages.length} sample deficiency images...`);
        
        for (const imageData of sampleImages) {
            // Get the nutrient ID from the nutrient code
            const [nutrientResult] = await pool.execute(
                'SELECT id FROM nutrients WHERE code = ?', 
                [imageData.nutrient_code]
            );
            
            if (nutrientResult.length > 0) {
                const nutrientId = nutrientResult[0].id;
                
                await pool.execute(`
                    INSERT INTO nutrient_deficiency_images 
                    (nutrient_id, image_filename, image_url, caption, deficiency_stage, plant_type, crop_specific)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    nutrientId,
                    imageData.image_filename,
                    imageData.image_url,
                    imageData.caption,
                    imageData.deficiency_stage,
                    imageData.plant_type,
                    imageData.crop_specific
                ]);
                
                console.log(`✅ Added ${imageData.nutrient_code} deficiency image: ${imageData.caption}`);
            } else {
                console.log(`⚠️ Nutrient '${imageData.nutrient_code}' not found, skipping image`);
            }
        }
        
        // Verify the results
        const [imageCount] = await pool.execute('SELECT COUNT(*) as count FROM nutrient_deficiency_images');
        const [imagesByNutrient] = await pool.execute(`
            SELECT n.code, n.name, COUNT(ndi.id) as image_count
            FROM nutrients n
            LEFT JOIN nutrient_deficiency_images ndi ON n.id = ndi.nutrient_id
            WHERE ndi.id IS NOT NULL
            GROUP BY n.id, n.code, n.name
            ORDER BY image_count DESC
        `);
        
        console.log(`\n📊 Deficiency Images Summary:`);
        console.log(`   - Total images added: ${imageCount[0].count}`);
        console.log(`   - Images by nutrient:`);
        
        imagesByNutrient.forEach(row => {
            console.log(`     - ${row.name} (${row.code}): ${row.image_count} images`);
        });
        
        console.log('\n✅ Sample nutrient deficiency images added successfully!');
        console.log('\n📝 Note: These are placeholder image URLs. In production, you would:');
        console.log('   1. Create an /images/deficiencies/ directory');
        console.log('   2. Add actual deficiency photos');
        console.log('   3. Implement file upload functionality for admin users');
        
    } catch (error) {
        console.error('❌ Error seeding deficiency images:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedDeficiencyImages()
        .then(() => {
            console.log('✅ Deficiency images seeding complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to seed deficiency images:', error);
            process.exit(1);
        });
}

module.exports = { seedDeficiencyImages };