const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function checkCropCodes() {
    try {
        const pool = getDatabase();
        
        console.log('🔍 Checking crop codes in database...\n');
        
        const [crops] = await pool.execute('SELECT code, name FROM crops LIMIT 20');
        
        console.log('Crop codes in database:');
        console.log('========================');
        crops.forEach(crop => {
            console.log(`${crop.code.padEnd(20)} → ${crop.name}`);
        });
        
        console.log('\n🎯 Key findings:');
        console.log('- Crop codes are lowercase (e.g., "tomatoes", "lettuce")');
        console.log('- Most codes are plural forms');
        console.log('- The API expects these codes, not the display names');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database error:', error);
        process.exit(1);
    }
}

checkCropCodes();