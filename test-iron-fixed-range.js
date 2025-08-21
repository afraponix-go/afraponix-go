const fetch = require('node-fetch');

async function testIronFixedRange() {
    console.log('🧪 Testing iron fixed-range calculation...\n');
    
    try {
        // Test with different nitrogen levels to prove iron is NOT ratio-based
        const nitrogenLevels = [50, 100, 150, 200];
        
        for (const nitrogen of nitrogenLevels) {
            const response = await fetch('http://localhost:3000/api/crop-knowledge/calculate/nutrient-ratios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base_nitrate_ppm: nitrogen,
                    growth_stage: 'general',
                    environmental_conditions: {
                        temperature: 25,
                        ph: 6.5
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.calculations && data.calculations.iron) {
                const iron = data.calculations.iron;
                console.log(`Nitrogen: ${nitrogen} ppm`);
                console.log(`  Iron calculation type: ${iron.calculation_type || 'unknown'}`);
                console.log(`  Iron range: ${iron.min_range} - ${iron.max_range} ppm`);
                console.log(`  Iron recommendation: ${iron.calculated_ppm} ppm`);
                console.log(`  Environmental adjustment: ${iron.environmental_adjustment}`);
                console.log('');
            } else {
                console.log(`No iron calculation for nitrogen level ${nitrogen} ppm`);
            }
        }
        
        console.log('✅ Test complete!');
        console.log('\n📊 Analysis:');
        console.log('If iron is truly fixed-range, all nitrogen levels should show the same iron values.');
        console.log('If iron values scale with nitrogen, then it\'s still ratio-based.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testIronFixedRange();