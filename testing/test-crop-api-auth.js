const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function testCropAPIAuth() {
    try {
        console.log('🧪 Testing Crop API Authentication Requirements...\n');
        
        // Test 1: Without authentication headers
        console.log('1️⃣ Testing without auth headers...');
        const response1 = await fetch('http://127.0.0.1:8000/api/crop-knowledge/crops');
        console.log(`   Status: ${response1.status}`);
        if (response1.ok) {
            const data1 = await response1.json();
            console.log(`   ✅ Success without auth: ${data1.count} crops`);
        } else {
            console.log(`   ❌ Failed without auth: ${response1.statusText}`);
        }
        
        // Test 2: With empty Authorization header
        console.log('\n2️⃣ Testing with empty auth header...');
        const response2 = await fetch('http://127.0.0.1:8000/api/crop-knowledge/crops', {
            headers: {
                'Authorization': 'Bearer '
            }
        });
        console.log(`   Status: ${response2.status}`);
        if (response2.ok) {
            const data2 = await response2.json();
            console.log(`   ✅ Success with empty auth: ${data2.count} crops`);
        } else {
            console.log(`   ❌ Failed with empty auth: ${response2.statusText}`);
        }
        
        // Test 3: With invalid token
        console.log('\n3️⃣ Testing with invalid token...');
        const response3 = await fetch('http://127.0.0.1:8000/api/crop-knowledge/crops', {
            headers: {
                'Authorization': 'Bearer invalid-token-12345'
            }
        });
        console.log(`   Status: ${response3.status}`);
        if (response3.ok) {
            const data3 = await response3.json();
            console.log(`   ✅ Success with invalid token: ${data3.count} crops`);
        } else {
            console.log(`   ❌ Failed with invalid token: ${response3.statusText}`);
        }
        
        console.log('\n🎯 Auth Requirements Analysis:');
        console.log('   - If all tests pass: endpoint is public (no auth required)');
        console.log('   - If tests 2&3 fail: endpoint requires valid authentication');
        console.log('   - Frontend getAuthHeaders() might be causing issues if no token exists');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

testCropAPIAuth();