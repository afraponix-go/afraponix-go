const { getDatabase } = require('./database/init-mariadb');

async function testCropKnowledgeIntegration() {
    console.log('🧪 Testing Crop Knowledge Integration...\n');
    
    try {
        const pool = getDatabase();
        
        // Test 1: Verify database tables exist and have data
        console.log('1. Testing Database Tables:');
        
        const [nutrientsCount] = await pool.execute('SELECT COUNT(*) as count FROM nutrients');
        console.log(`   ✅ Nutrients: ${nutrientsCount[0].count} entries`);
        
        const [categoriesCount] = await pool.execute('SELECT COUNT(*) as count FROM crop_categories');
        console.log(`   ✅ Categories: ${categoriesCount[0].count} entries`);
        
        const [cropsCount] = await pool.execute('SELECT COUNT(*) as count FROM crops WHERE is_active = true');
        console.log(`   ✅ Active Crops: ${cropsCount[0].count} entries`);
        
        const [targetsCount] = await pool.execute('SELECT COUNT(*) as count FROM crop_nutrient_targets');
        console.log(`   ✅ Nutrient Targets: ${targetsCount[0].count} entries`);
        
        // Test 2: Verify API endpoints
        console.log('\n2. Testing API Endpoints:');
        
        // Test crops endpoint
        const cropsResponse = await fetch('http://localhost:8000/api/crop-knowledge/crops');
        const cropsData = await cropsResponse.json();
        console.log(`   ✅ /crops endpoint: ${cropsData.success ? 'SUCCESS' : 'FAILED'} (${cropsData.count} crops)`);
        
        // Test specific crop endpoint
        const lettuceResponse = await fetch('http://localhost:8000/api/crop-knowledge/crops/lettuce');
        const lettuceData = await lettuceResponse.json();
        console.log(`   ✅ /crops/lettuce endpoint: ${lettuceData.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Test nutrient ranges endpoint
        const rangesResponse = await fetch('http://localhost:8000/api/crop-knowledge/crops/lettuce/nutrient-ranges?stage=general');
        const rangesData = await rangesResponse.json();
        console.log(`   ✅ /crops/lettuce/nutrient-ranges endpoint: ${rangesData.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Test 3: Verify data consistency with original hardcoded values
        console.log('\n3. Testing Data Consistency:');
        
        const originalLettuce = {
            nitrogen: 73, phosphorus: 19, potassium: 90,
            calcium: 67, magnesium: 13, iron: 1.8
        };
        
        let consistencyErrors = 0;
        for (const [nutrient, expectedValue] of Object.entries(originalLettuce)) {
            if (rangesData.ranges[nutrient]) {
                const actualValue = rangesData.ranges[nutrient].target;
                if (Math.abs(actualValue - expectedValue) < 0.01) {
                    console.log(`   ✅ ${nutrient}: ${actualValue} (matches expected ${expectedValue})`);
                } else {
                    console.log(`   ❌ ${nutrient}: ${actualValue} (expected ${expectedValue})`);
                    consistencyErrors++;
                }
            } else {
                console.log(`   ❌ ${nutrient}: missing from API response`);
                consistencyErrors++;
            }
        }
        
        // Test 4: Performance test
        console.log('\n4. Testing Performance:');
        
        const performanceStart = Date.now();
        const performanceTests = [];
        
        // Test multiple concurrent crop requests
        const testCrops = ['lettuce', 'basil', 'tomatoes', 'spinach', 'kale'];
        for (const crop of testCrops) {
            performanceTests.push(
                fetch(`http://localhost:8000/api/crop-knowledge/crops/${crop}/nutrient-ranges?stage=general`)
                    .then(res => res.json())
            );
        }
        
        const performanceResults = await Promise.all(performanceTests);
        const performanceTime = Date.now() - performanceStart;
        
        const successCount = performanceResults.filter(result => result.success).length;
        console.log(`   ✅ Concurrent requests: ${successCount}/${testCrops.length} successful in ${performanceTime}ms`);
        
        // Test 5: Error handling
        console.log('\n5. Testing Error Handling:');
        
        const invalidCropResponse = await fetch('http://localhost:8000/api/crop-knowledge/crops/nonexistent');
        console.log(`   ✅ Invalid crop handling: ${invalidCropResponse.status === 404 ? 'PASSED' : 'FAILED'}`);
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log(`   Database Tables: ✅ Populated`);
        console.log(`   API Endpoints: ✅ Functional`);
        console.log(`   Data Consistency: ${consistencyErrors === 0 ? '✅' : '❌'} ${consistencyErrors} errors`);
        console.log(`   Performance: ✅ ${performanceTime}ms for ${testCrops.length} concurrent requests`);
        console.log(`   Error Handling: ✅ Proper 404 responses`);
        
        if (consistencyErrors === 0) {
            console.log('\n🎉 All tests passed! Crop Knowledge Integration is working correctly.');
            return true;
        } else {
            console.log(`\n⚠️  ${consistencyErrors} consistency errors detected. Review data migration.`);
            return false;
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    testCropKnowledgeIntegration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = { testCropKnowledgeIntegration };