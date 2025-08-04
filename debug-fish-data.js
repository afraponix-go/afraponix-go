const { getDatabase } = require('./database/init');

async function debugFishData() {
    const db = getDatabase();
    
    try {
        // Get the latest fish health data for Oribi System 1
        const systemId = 'system_1753945450208';
        
        const data = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM fish_health WHERE system_id = ? ORDER BY date DESC LIMIT 3', 
                [systemId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('🔍 Latest Fish Health Data for Oribi System 1:');
        console.log('================================================');
        
        data.forEach((record, index) => {
            console.log(`\n--- Record ${index + 1} (Latest: ${index === 0 ? 'YES' : 'NO'}) ---`);
            console.log('ID:', record.id);
            console.log('Date:', record.date);
            console.log('Fish Tank ID:', record.fish_tank_id);
            console.log('Count:', record.count);
            console.log('Average Weight:', record.average_weight, 'grams');
            console.log('Mortality:', record.mortality);
            console.log('Feed Consumption:', record.feed_consumption);
            console.log('Behavior:', record.behavior);
            console.log('Notes:', record.notes);
            
            if (index === 0) {
                console.log('\n🧮 Expected Calculations for this data:');
                if (record.count && record.average_weight) {
                    const biomass = record.count * record.average_weight;
                    const feedRate = record.average_weight >= 250 ? 0.025 : 0.04; // tilapia feed rate
                    const dailyFeed = Math.round(biomass * feedRate);
                    const tankVolumeM3 = 6.0; // Tank 1 volume
                    const density = (biomass / 1000) / tankVolumeM3; // kg/m³
                    
                    console.log(`Total Biomass: ${record.count} × ${record.average_weight}g = ${biomass.toLocaleString()}g`);
                    console.log(`Daily Feed: ${biomass.toLocaleString()}g × ${feedRate} = ${dailyFeed}g`);
                    console.log(`Density: ${biomass/1000}kg ÷ ${tankVolumeM3}m³ = ${density.toFixed(2)} kg/m³`);
                } else {
                    console.log('❌ Missing count or average_weight data');
                }
            }
        });
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error debugging fish data:', error);
        db.close();
    }
}

debugFishData();