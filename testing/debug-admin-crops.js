// Debug script to test admin crops functionality

console.log('🧪 Debugging Admin Crops Issues...\n');

// Test 1: Check if the admin crops container exists in HTML
console.log('1️⃣ Checking HTML structure...');
console.log('   Looking for admin-crops-container element');
console.log('   Looking for crop-count-display element');

// Test 2: Test the CropKnowledgeAPI module directly
console.log('\n2️⃣ Testing CropKnowledgeAPI module...');
console.log('   Module should be at: ./public/js/modules/api/cropKnowledgeAPI.js');
console.log('   fetchCrops() function should exist and work');

// Test 3: Test the API endpoint directly
console.log('\n3️⃣ Testing API endpoint directly...');
fetch('/api/crop-knowledge/crops')
    .then(response => {
        console.log('   API Response Status:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(data => {
        console.log('   ✅ API Success:', {
            success: data.success,
            count: data.count,
            hasData: !!data.data,
            dataLength: data.data ? data.data.length : 0
        });
        if (data.data && data.data.length > 0) {
            console.log('   Sample crop:', {
                code: data.data[0].code,
                name: data.data[0].name
            });
        }
    })
    .catch(error => {
        console.log('   ❌ API Error:', error.message);
    });

console.log('\n4️⃣ Checking for admin sub-tab functionality...');
console.log('   Admin sub-tab click should trigger loadAdminCrops()');
console.log('   Event listener should be on admin-crops-subcontent');

console.log('\n5️⃣ Potential Issues to Check:');
console.log('   - Missing admin-crops-container element in HTML');
console.log('   - CropKnowledgeAPI module import failure');
console.log('   - JavaScript errors preventing execution');
console.log('   - Event listener not attached to crop knowledge tab');
console.log('   - Display function not rendering data properly');

console.log('\n🎯 Debug complete - check browser console for real results!');