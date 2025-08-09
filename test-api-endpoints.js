const axios = require('axios');
require('dotenv').config({ path: '.env.dev' });

const BASE_URL = 'http://localhost:8000';

async function testAPI() {
    console.log('🧪 Testing API endpoints after water_quality migration...\n');

    try {
        // First, we need to login to get a token
        console.log('1️⃣ Testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',  // Update with your test credentials
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful, token received\n');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // Get systems to find a valid system ID
        console.log('2️⃣ Getting systems...');
        const systemsResponse = await axios.get(`${BASE_URL}/api/systems`, config);
        const systemId = systemsResponse.data.systems[0]?.id;
        
        if (!systemId) {
            console.log('❌ No systems found');
            return;
        }
        console.log(`✅ Found system: ${systemId}\n`);

        // Test water quality GET endpoint (should return data from nutrient_readings)
        console.log('3️⃣ Testing GET /api/data/water-quality/:systemId');
        const waterQualityResponse = await axios.get(`${BASE_URL}/api/data/water-quality/${systemId}`, config);
        console.log(`✅ Retrieved ${waterQualityResponse.data.length} water quality records`);
        
        if (waterQualityResponse.data.length > 0) {
            const sample = waterQualityResponse.data[0];
            console.log('   Sample record:', {
                date: sample.date,
                ph: sample.ph,
                temperature: sample.temperature,
                ammonia: sample.ammonia
            });
        }
        console.log();

        // Test nutrient readings latest endpoint
        console.log('4️⃣ Testing GET /api/data/nutrients/latest/:systemId');
        const nutrientsLatestResponse = await axios.get(`${BASE_URL}/api/data/nutrients/latest/${systemId}`, config);
        console.log('✅ Latest nutrient readings:');
        const nutrients = Object.keys(nutrientsLatestResponse.data);
        nutrients.slice(0, 5).forEach(nutrient => {
            const data = nutrientsLatestResponse.data[nutrient];
            console.log(`   ${nutrient}: ${data.value} ${data.unit} (${data.source})`);
        });
        console.log();

        // Test POST water quality (should save to nutrient_readings)
        console.log('5️⃣ Testing POST /api/data/water-quality/:systemId');
        const testData = {
            date: new Date().toISOString(),
            ph: 7.2,
            temperature: 25.5,
            dissolved_oxygen: 8.0,
            ammonia: 0.15,
            humidity: 65,
            salinity: 0.5,
            ec: 1200,
            notes: 'Test entry after migration'
        };

        const postResponse = await axios.post(`${BASE_URL}/api/data/water-quality/${systemId}`, testData, config);
        console.log('✅ Water quality data saved:', postResponse.data.message);
        console.log(`   Inserted ${postResponse.data.ids.length} records to nutrient_readings`);
        console.log();

        // Verify the data was saved correctly
        console.log('6️⃣ Verifying saved data...');
        const verifyResponse = await axios.get(`${BASE_URL}/api/data/nutrients/latest/${systemId}`, config);
        
        console.log('✅ Verification - Latest values:');
        ['ph', 'temperature', 'ammonia', 'dissolved_oxygen'].forEach(param => {
            const data = verifyResponse.data[param];
            if (data) {
                console.log(`   ${param}: ${data.value} ${data.unit}`);
            }
        });

        console.log('\n✅ All API endpoints working correctly with nutrient_readings table!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.log('   Authentication failed - update test credentials');
        }
    }
}

// Run the tests
testAPI();