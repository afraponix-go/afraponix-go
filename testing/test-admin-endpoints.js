const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function testAdminEndpoints() {
    try {
        console.log('🧪 Testing Admin API Endpoints...\n');
        
        // Test 1: Direct crop-knowledge API call
        console.log('1️⃣ Testing crop-knowledge endpoint directly...');
        const response1 = await fetch('http://127.0.0.1:8000/api/crop-knowledge/crops');
        console.log(`   Status: ${response1.status}`);
        if (response1.ok) {
            const crops = await response1.json();
            console.log(`   ✅ Success: Retrieved data:`, typeof crops, Array.isArray(crops) ? crops.length : 'not array');
            console.log(`   Response preview:`, JSON.stringify(crops).substring(0, 200));
            if (Array.isArray(crops) && crops.length > 0) {
                console.log(`   First 3 crops: ${crops.slice(0,3).map(c => c.code).join(', ')}`);
            }
        } else {
            console.log(`   ❌ Failed: ${response1.statusText}`);
        }
        
        // Test 2: Direct admin/users endpoint
        console.log('\n2️⃣ Testing admin/users endpoint...');
        const response2 = await fetch('http://127.0.0.1:8000/api/admin/users');
        console.log(`   Status: ${response2.status}`);
        if (response2.ok) {
            const users = await response2.json();
            console.log(`   ✅ Success: Retrieved ${users.length} users`);
        } else {
            console.log(`   ❌ Failed: ${response2.statusText}`);
        }
        
        // Test 3: Database direct access
        console.log('\n3️⃣ Testing database direct access...');
        const pool = getDatabase();
        const [crops] = await pool.execute('SELECT COUNT(*) as total FROM crops');
        console.log(`   ✅ Database: ${crops[0].total} crops in database`);
        
        const [users] = await pool.execute('SELECT COUNT(*) as total FROM users');
        console.log(`   ✅ Database: ${users[0].total} users in database`);
        
        console.log('\n🎯 All endpoint tests completed!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

testAdminEndpoints();