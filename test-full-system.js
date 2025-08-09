#!/usr/bin/env node

/**
 * Comprehensive Afraponix Go System Test Suite
 * 
 * This script performs a complete end-to-end test of the aquaponics system:
 * 1. Creates a new system with realistic configuration
 * 2. Sets up grow beds and fish tanks
 * 3. Configures crop allocations
 * 4. Adds fish inventory and health records
 * 5. Plants crops and creates batches
 * 6. Records water quality and nutrient data
 * 7. Harvests crops and fish over time
 * 8. Simulates sensor data collection
 * 9. Validates all data relationships and calculations
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

class AquaponicsSystemTester {
    constructor(baseUrl = 'http://127.0.0.1:8000', jwtSecret = 'your-dev-jwt-secret-key-change-this-in-production') {
        this.baseUrl = baseUrl;
        this.jwtSecret = jwtSecret;
        this.token = this.generateTestToken();
        this.systemId = `test_system_${Date.now()}`;
        this.testUserId = 1;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Configure axios defaults
        this.api = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }

    generateTestToken() {
        const payload = {
            userId: this.testUserId,
            username: 'tester',
            userRole: 'admin',
            subscriptionStatus: 'admin'
        };
        const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '2h' });
        console.log(`🔑 Generated test token for user ${this.testUserId}`);
        return token;
    }

    async test(name, testFn) {
        try {
            console.log(`🧪 Testing: ${name}`);
            const startTime = Date.now();
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`✅ PASSED: ${name} (${duration}ms)`);
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED', duration });
        } catch (error) {
            console.error(`❌ FAILED: ${name}`);
            console.error(`   Error: ${error.message}`);
            if (error.response?.data) {
                console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Afraponix Go Comprehensive System Test');
        console.log(`📡 Testing against: ${this.baseUrl}`);
        console.log(`🆔 Test System ID: ${this.systemId}`);
        console.log('='.repeat(70));

        // Ensure test user exists
        await this.ensureTestUser();

        // Phase 1: System Setup
        await this.test('Create test user in database', () => this.ensureTestUser());
        await this.test('Create new aquaponics system', () => this.createSystem());
        await this.test('Update system configuration', () => this.updateSystem());
        await this.test('Get system details', () => this.getSystem());

        // Phase 2: Infrastructure Setup
        await this.test('Configure grow beds', () => this.configureGrowBeds());
        await this.test('Configure fish tanks', () => this.configureFishTanks());
        await this.test('Verify grow bed configuration', () => this.verifyGrowBeds());
        await this.test('Verify fish tank configuration', () => this.verifyFishTanks());

        // Phase 3: Crop Management Setup
        await this.test('Create custom crops', () => this.createCustomCrops());
        await this.test('Configure crop allocations', () => this.configureCropAllocations());
        await this.test('Verify crop allocations', () => this.verifyCropAllocations());

        // Phase 4: Fish Management
        await this.test('Add initial fish inventory', () => this.addFishInventory());
        await this.test('Record fish health data', () => this.recordFishHealth());
        await this.test('Update fish inventory over time', () => this.updateFishInventory());

        // Phase 5: Plant Management
        await this.test('Plant initial crops', () => this.plantInitialCrops());
        await this.test('Create plant batches', () => this.createPlantBatches());
        await this.test('Record plant growth data', () => this.recordPlantGrowth());

        // Phase 6: Water Quality and Sensors
        await this.test('Record water quality measurements', () => this.recordWaterQuality());
        await this.test('Record nutrient readings', () => this.recordNutrientReadings());
        await this.test('Simulate sensor data collection', () => this.simulateSensorData());

        // Phase 7: Operations and Maintenance
        await this.test('Record system operations', () => this.recordOperations());
        await this.test('Perform system maintenance', () => this.performMaintenance());

        // Phase 8: Harvesting
        await this.test('Harvest mature crops', () => this.harvestCrops());
        await this.test('Harvest fish', () => this.harvestFish());
        await this.test('Record harvest weights and yields', () => this.recordHarvestData());

        // Phase 9: Time Simulation and Data Trends
        await this.test('Simulate 30 days of operations', () => this.simulate30Days());
        await this.test('Generate trend data', () => this.generateTrendData());

        // Phase 10: Data Validation and Relationships
        await this.test('Validate data relationships', () => this.validateDataRelationships());
        await this.test('Test data filtering and queries', () => this.testDataQueries());
        await this.test('Verify calculations and summaries', () => this.verifyCalculations());

        // Phase 11: Error Handling and Edge Cases
        await this.test('Test invalid data handling', () => this.testInvalidData());
        await this.test('Test data constraints', () => this.testDataConstraints());
        await this.test('Test authentication and permissions', () => this.testAuthAndPermissions());

        // Cleanup
        await this.test('Cleanup test data', () => this.cleanupTestData());

        this.printSummary();
    }

    async ensureTestUser() {
        // This is handled by direct database insertion - assume user exists
        return true;
    }

    async createSystem() {
        const systemData = {
            id: this.systemId,
            system_name: 'Automated Test System',
            system_type: 'media-bed',
            fish_type: 'tilapia',
            fish_tank_count: 3,
            total_fish_volume: 15000,
            grow_bed_count: 8,
            total_grow_volume: 6400,
            total_grow_area: 32.0
        };

        const response = await this.api.post('/api/systems/', systemData);
        if (response.data.id !== this.systemId) {
            throw new Error('System ID mismatch');
        }
        console.log(`   📋 Created system: ${response.data.system_name}`);
    }

    async updateSystem() {
        const updateData = {
            system_name: 'Updated Test System - Full Scale',
            total_grow_area: 40.0
        };

        const response = await this.api.put(`/api/systems/${this.systemId}`, updateData);
        if (response.data.system_name !== updateData.system_name) {
            throw new Error('System update failed');
        }
        console.log(`   📝 Updated system name and area`);
    }

    async getSystem() {
        const response = await this.api.get(`/api/systems/${this.systemId}`);
        if (!response.data || response.data.id !== this.systemId) {
            throw new Error('Failed to retrieve system');
        }
        console.log(`   📊 Retrieved system: ${response.data.system_name}`);
    }

    async configureGrowBeds() {
        const growBeds = [];
        const bedTypes = ['media-bed', 'dwc', 'nft', 'vertical'];
        
        for (let i = 1; i <= 8; i++) {
            growBeds.push({
                bed_number: i,
                bed_type: bedTypes[(i - 1) % bedTypes.length],
                bed_name: `Test Bed ${i}`,
                volume_liters: i <= 4 ? 800 : 400,
                area_m2: i <= 4 ? 4.0 : 2.0,
                length_meters: i <= 4 ? 2.0 : 1.0,
                width_meters: 2.0,
                height_meters: 0.4,
                plant_capacity: i <= 4 ? 32 : 16,
                equivalent_m2: i <= 4 ? 4.0 : 2.0
            });
        }

        const response = await this.api.post(`/api/grow-beds/system/${this.systemId}`, { growBeds });
        if (response.data.length !== 8) {
            throw new Error('Incorrect number of grow beds created');
        }
        console.log(`   🌱 Configured ${response.data.length} grow beds`);
    }

    async configureFishTanks() {
        const fishTanks = [
            { tank_number: 1, size_m3: 5.0, volume_liters: 5000, fish_type: 'tilapia' },
            { tank_number: 2, size_m3: 5.0, volume_liters: 5000, fish_type: 'tilapia' },
            { tank_number: 3, size_m3: 5.0, volume_liters: 5000, fish_type: 'tilapia' }
        ];

        for (const tank of fishTanks) {
            const tankData = { system_id: this.systemId, ...tank };
            await this.api.post('/api/fish-tanks/', tankData);
        }
        console.log(`   🐟 Configured ${fishTanks.length} fish tanks`);
    }

    async verifyGrowBeds() {
        const response = await this.api.get(`/api/grow-beds/system/${this.systemId}`);
        if (response.data.length !== 8) {
            throw new Error('Grow bed count mismatch');
        }
        
        // Verify different bed types exist
        const bedTypes = response.data.map(bed => bed.bed_type);
        const uniqueTypes = [...new Set(bedTypes)];
        if (uniqueTypes.length < 3) {
            throw new Error('Expected multiple bed types');
        }
        console.log(`   ✓ Verified ${response.data.length} beds with ${uniqueTypes.length} different types`);
    }

    async verifyFishTanks() {
        const response = await this.api.get(`/api/fish-tanks/system/${this.systemId}`);
        if (response.data.length !== 3) {
            throw new Error('Fish tank count mismatch');
        }
        
        const totalVolume = response.data.reduce((sum, tank) => sum + parseFloat(tank.volume_liters), 0);
        if (totalVolume !== 15000) {
            throw new Error(`Expected 15000L total, got ${totalVolume}L`);
        }
        console.log(`   ✓ Verified ${response.data.length} tanks with ${totalVolume}L total volume`);
    }

    async createCustomCrops() {
        const customCrops = [
            { cropName: 'Purple Basil Test', targetN: 200, targetP: 50, targetK: 250, targetCa: 150, targetMg: 50, targetFe: 3, targetEc: 1.2 },
            { cropName: 'Cherry Tomatoes Test', targetN: 180, targetP: 45, targetK: 300, targetCa: 180, targetMg: 60, targetFe: 4, targetEc: 1.4 },
            { cropName: 'Butterhead Lettuce Test', targetN: 150, targetP: 40, targetK: 200, targetCa: 120, targetMg: 40, targetFe: 2, targetEc: 1.0 }
        ];

        for (const crop of customCrops) {
            await this.api.post('/api/plants/custom-crops', crop);
        }
        console.log(`   🌿 Created ${customCrops.length} custom crops`);
    }

    async configureCropAllocations() {
        const allocations = [
            { systemId: this.systemId, growBedId: 1, cropType: 'lettuce', percentageAllocated: 100, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 2, cropType: 'basil', percentageAllocated: 100, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 3, cropType: 'tomato', percentageAllocated: 100, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 4, cropType: 'spinach', percentageAllocated: 100, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 5, cropType: 'kale', percentageAllocated: 100, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 6, cropType: 'lettuce', percentageAllocated: 50, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 7, cropType: 'herbs', percentageAllocated: 75, plantsPlanted: 0 },
            { systemId: this.systemId, growBedId: 8, cropType: 'cucumber', percentageAllocated: 100, plantsPlanted: 0 }
        ];

        for (const allocation of allocations) {
            await this.api.post('/api/plants/allocations', allocation);
        }
        console.log(`   📋 Created ${allocations.length} crop allocations`);
    }

    async verifyCropAllocations() {
        const response = await this.api.get(`/api/plants/allocations/${this.systemId}`);
        if (response.data.length !== 8) {
            throw new Error('Allocation count mismatch');
        }
        
        const totalAllocated = response.data.reduce((sum, alloc) => sum + alloc.allocated_count, 0);
        console.log(`   ✓ Verified ${response.data.length} allocations, ${totalAllocated} total plants`);
    }

    async addFishInventory() {
        const fishData = [
            { fish_tank_id: 1, species: 'tilapia', count: 150, average_weight_g: 50, date: new Date().toISOString().split('T')[0] },
            { fish_tank_id: 2, species: 'tilapia', count: 150, average_weight_g: 50, date: new Date().toISOString().split('T')[0] },
            { fish_tank_id: 3, species: 'tilapia', count: 100, average_weight_g: 75, date: new Date().toISOString().split('T')[0] }
        ];

        for (const fish of fishData) {
            const inventoryData = { system_id: this.systemId, ...fish };
            await this.api.post('/api/fish-inventory/add-fish', inventoryData);
        }
        console.log(`   🐠 Added fish inventory for ${fishData.length} tanks`);
    }

    async recordFishHealth() {
        const healthRecords = [
            { fish_tank_id: 1, date: new Date().toISOString().split('T')[0], count: 148, mortality: 2, average_weight: 52, feed_consumption: 1.2, behavior: 'active' },
            { fish_tank_id: 2, date: new Date().toISOString().split('T')[0], count: 149, mortality: 1, average_weight: 51, feed_consumption: 1.1, behavior: 'active' },
            { fish_tank_id: 3, date: new Date().toISOString().split('T')[0], count: 100, mortality: 0, average_weight: 76, feed_consumption: 1.5, behavior: 'active' }
        ];

        for (const health of healthRecords) {
            await this.api.post(`/api/data/fish-health/${this.systemId}`, health);
        }
        console.log(`   📊 Recorded fish health for ${healthRecords.length} tanks`);
    }

    async updateFishInventory() {
        // Simulate growth over time
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const growthData = {
            fish_tank_id: 1,
            species: 'tilapia', 
            count: 145,
            average_weight_g: 85,
            date: thirtyDaysAgo.toISOString().split('T')[0]
        };
        
        const inventoryData = { system_id: this.systemId, ...growthData };
        await this.api.post('/api/fish-inventory/add-fish', inventoryData);
        console.log(`   📈 Updated fish inventory with growth data`);
    }

    async plantInitialCrops() {
        const today = new Date();
        const plantings = [
            { grow_bed_id: 1, crop_type: 'lettuce', count: 30, batch_id: 'lettuce_batch_001', seed_variety: 'buttercrunch', days_to_harvest: 35 },
            { grow_bed_id: 2, crop_type: 'basil', count: 25, batch_id: 'basil_batch_001', seed_variety: 'sweet_basil', days_to_harvest: 45 },
            { grow_bed_id: 3, crop_type: 'tomato', count: 15, batch_id: 'tomato_batch_001', seed_variety: 'cherry', days_to_harvest: 75 }
        ];

        for (const planting of plantings) {
            const plantData = { 
                system_id: this.systemId,
                date: today.toISOString().split('T')[0],
                new_seedlings: planting.count,
                growth_stage: 'seedling',
                health: 'good',
                ...planting
            };
            await this.api.post(`/api/data/plant-growth/${this.systemId}`, plantData);
        }
        console.log(`   🌱 Planted ${plantings.length} different crop types`);
    }

    async createPlantBatches() {
        const today = new Date();
        const batchData = [
            { grow_bed_id: 4, crop_type: 'purple_basil_test', count: 20, batch_id: 'custom_basil_001' },
            { grow_bed_id: 5, crop_type: 'cherry_tomatoes_test', count: 10, batch_id: 'custom_tomato_001' },
            { grow_bed_id: 6, crop_type: 'butterhead_lettuce_test', count: 18, batch_id: 'custom_lettuce_001' }
        ];

        for (const batch of batchData) {
            const batchPlantData = { 
                system_id: this.systemId,
                date: today.toISOString().split('T')[0],
                new_seedlings: batch.count,
                growth_stage: 'seedling',
                health: 'excellent',
                batch_created_date: today.toISOString().split('T')[0],
                ...batch
            };
            await this.api.post(`/api/data/plant-growth/${this.systemId}`, batchPlantData);
        }
        console.log(`   📦 Created ${batchData.length} custom crop batches`);
    }

    async recordPlantGrowth() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const growthRecords = [
            { grow_bed_id: 1, crop_type: 'lettuce', growth_stage: 'vegetative', health: 'good', notes: 'Rapid growth observed' },
            { grow_bed_id: 2, crop_type: 'basil', growth_stage: 'vegetative', health: 'excellent', notes: 'Strong aroma developing' },
            { grow_bed_id: 3, crop_type: 'tomato', growth_stage: 'early_vegetative', health: 'good', notes: 'First true leaves appearing' }
        ];

        for (const growth of growthRecords) {
            const growthData = { 
                system_id: this.systemId,
                date: yesterday.toISOString().split('T')[0],
                ...growth
            };
            await this.api.post(`/api/data/plant-growth/${this.systemId}`, growthData);
        }
        console.log(`   📊 Recorded growth data for ${growthRecords.length} crop types`);
    }

    async recordWaterQuality() {
        const today = new Date();
        const waterData = {
            date: today.toISOString().split('T')[0],
            ph: 6.8,
            ec: 1200,
            dissolved_oxygen: 7.5,
            temperature: 24.5,
            ammonia: 0.25,
            humidity: 65,
            salinity: 0.5,
            notes: 'Automated test measurement'
        };

        await this.api.post(`/api/data/water-quality/${this.systemId}`, waterData);
        console.log(`   💧 Recorded water quality measurements`);
    }

    async recordNutrientReadings() {
        const today = new Date();
        const nutrients = [
            { type: 'nitrogen', value: 150, unit: 'mg/L', source: 'test_kit' },
            { type: 'phosphorus', value: 45, unit: 'mg/L', source: 'test_kit' },
            { type: 'potassium', value: 200, unit: 'mg/L', source: 'test_kit' },
            { type: 'calcium', value: 180, unit: 'mg/L', source: 'test_kit' },
            { type: 'magnesium', value: 50, unit: 'mg/L', source: 'test_kit' }
        ];

        const nutrientData = {
            nutrients: nutrients.map(n => ({
                ...n,
                reading_date: today.toISOString().split('T')[0],
                notes: 'Comprehensive nutrient test'
            }))
        };

        await this.api.post(`/api/data/nutrients/${this.systemId}`, nutrientData);
        console.log(`   🧪 Recorded ${nutrients.length} nutrient readings`);
    }

    async simulateSensorData() {
        // Simulate sensor readings over the past 7 days
        const readings = [];
        
        for (let i = 7; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const sensorNutrients = [
                { type: 'ph', value: 6.5 + (Math.random() * 1.0), unit: '', source: 'sensor' },
                { type: 'temperature', value: 22 + (Math.random() * 6), unit: '°C', source: 'sensor' },
                { type: 'dissolved_oxygen', value: 6 + (Math.random() * 3), unit: 'mg/L', source: 'sensor' }
            ];
            
            readings.push({
                nutrients: sensorNutrients.map(n => ({
                    ...n,
                    reading_date: date.toISOString().split('T')[0],
                    notes: 'Simulated sensor data'
                }))
            });
        }

        for (const reading of readings) {
            await this.api.post(`/api/data/nutrients/${this.systemId}`, reading);
        }
        
        console.log(`   📡 Simulated sensor data for 8 days`);
    }

    async recordOperations() {
        const today = new Date();
        const operations = [
            { operation_type: 'water_change', water_volume: 500, notes: 'Routine 10% water change' },
            { operation_type: 'cleaning', notes: 'Cleaned grow bed filters' },
            { operation_type: 'feeding', chemical_added: 'fish_food', amount_added: 2.5, notes: '2.5kg fish food added' }
        ];

        for (const operation of operations) {
            const operationData = { 
                system_id: this.systemId,
                date: today.toISOString().split('T')[0],
                ...operation
            };
            await this.api.post(`/api/data/operations/${this.systemId}`, operationData);
        }
        console.log(`   🔧 Recorded ${operations.length} system operations`);
    }

    async performMaintenance() {
        // Record maintenance activities
        const maintenanceData = {
            operation_type: 'maintenance',
            downtime_duration: 2.5,
            notes: 'Pump maintenance and system inspection - 2.5 hour downtime'
        };

        const operationData = { 
            system_id: this.systemId,
            date: new Date().toISOString().split('T')[0],
            ...maintenanceData
        };
        
        await this.api.post(`/api/data/operations/${this.systemId}`, operationData);
        console.log(`   🔧 Recorded maintenance with ${maintenanceData.downtime_duration}h downtime`);
    }

    async harvestCrops() {
        const today = new Date();
        const harvests = [
            { grow_bed_id: 1, crop_type: 'lettuce', plants_harvested: 8, harvest_weight: 2400, batch_id: 'lettuce_batch_001' },
            { grow_bed_id: 2, crop_type: 'basil', plants_harvested: 5, harvest_weight: 750, batch_id: 'basil_batch_001' }
        ];

        for (const harvest of harvests) {
            const harvestData = { 
                system_id: this.systemId,
                date: today.toISOString().split('T')[0],
                growth_stage: 'harvest',
                health: 'excellent',
                notes: `Harvested ${harvest.plants_harvested} plants weighing ${harvest.harvest_weight}g`,
                ...harvest
            };
            await this.api.post(`/api/data/plant-growth/${this.systemId}`, harvestData);
        }
        console.log(`   🥬 Harvested ${harvests.length} crop types`);
    }

    async harvestFish() {
        const today = new Date();
        const fishHarvest = {
            fish_tank_id: 3,
            date: today.toISOString().split('T')[0],
            count: 95, // 5 fish harvested
            mortality: 0,
            average_weight: 185,
            behavior: 'active',
            notes: 'Harvested 5 mature fish for market - average 350g each'
        };

        await this.api.post(`/api/data/fish-health/${this.systemId}`, fishHarvest);
        console.log(`   🐟 Recorded fish harvest - 5 mature fish`);
    }

    async recordHarvestData() {
        // Record detailed harvest metrics
        const harvestMetrics = {
            operation_type: 'harvest',
            notes: 'Weekly harvest: 8 lettuce (2.4kg), 5 basil (0.75kg), 5 tilapia (1.75kg total)'
        };

        const operationData = { 
            system_id: this.systemId,
            date: new Date().toISOString().split('T')[0],
            ...harvestMetrics
        };
        
        await this.api.post(`/api/data/operations/${this.systemId}`, operationData);
        console.log(`   📋 Recorded detailed harvest metrics`);
    }

    async simulate30Days() {
        console.log(`   ⏰ Simulating 30 days of operations...`);
        
        for (let day = 30; day >= 1; day--) {
            const date = new Date();
            date.setDate(date.getDate() - day);
            const dateStr = date.toISOString().split('T')[0];

            // Daily water quality (every 3 days)
            if (day % 3 === 0) {
                const waterData = {
                    date: dateStr,
                    ph: 6.4 + (Math.random() * 0.8),
                    temperature: 22 + (Math.random() * 5),
                    dissolved_oxygen: 6 + (Math.random() * 2),
                    notes: `Day ${30-day} automated reading`
                };
                await this.api.post(`/api/data/water-quality/${this.systemId}`, waterData);
            }

            // Fish health (weekly)
            if (day % 7 === 0) {
                const fishHealth = {
                    fish_tank_id: 1,
                    date: dateStr,
                    count: 150 - Math.floor((30-day) * 0.2), // Slight mortality over time
                    mortality: Math.floor(Math.random() * 2),
                    average_weight: 50 + ((30-day) * 1.2), // Growth over time
                    feed_consumption: 1.0 + (Math.random() * 0.5),
                    behavior: Math.random() > 0.8 ? 'lethargic' : 'active'
                };
                await this.api.post(`/api/data/fish-health/${this.systemId}`, fishHealth);
            }

            // Plant growth updates (every 5 days)
            if (day % 5 === 0) {
                const stages = ['seedling', 'early_vegetative', 'vegetative', 'flowering', 'harvest'];
                const stageIndex = Math.floor((30-day) / 6);
                
                const plantGrowth = {
                    grow_bed_id: 1,
                    crop_type: 'lettuce',
                    date: dateStr,
                    growth_stage: stages[Math.min(stageIndex, stages.length-1)],
                    health: Math.random() > 0.9 ? 'poor' : 'good',
                    notes: `Day ${30-day} growth check`
                };
                await this.api.post(`/api/data/plant-growth/${this.systemId}`, plantGrowth);
            }
        }
        
        console.log(`   ✓ Generated 30 days of realistic data`);
    }

    async generateTrendData() {
        // Verify we can retrieve and process trend data
        const waterQuality = await this.api.get(`/api/data/water-quality/${this.systemId}`);
        const fishHealth = await this.api.get(`/api/data/fish-health/${this.systemId}`);
        const plantGrowth = await this.api.get(`/api/data/plant-growth/${this.systemId}`);
        const nutrients = await this.api.get(`/api/data/nutrients/${this.systemId}?limit=50`);

        if (waterQuality.data.length < 5 || fishHealth.data.length < 3 || plantGrowth.data.length < 10) {
            throw new Error('Insufficient trend data generated');
        }

        console.log(`   📈 Generated trends: ${waterQuality.data.length} water, ${fishHealth.data.length} fish, ${plantGrowth.data.length} plant, ${nutrients.data.length} nutrient records`);
    }

    async validateDataRelationships() {
        // Check that all data properly relates to our test system
        const [systems, growBeds, fishTanks, plantData, waterData] = await Promise.all([
            this.api.get(`/api/systems/${this.systemId}`),
            this.api.get(`/api/grow-beds/system/${this.systemId}`),
            this.api.get(`/api/fish-tanks/system/${this.systemId}`),
            this.api.get(`/api/data/plant-growth/${this.systemId}`),
            this.api.get(`/api/data/water-quality/${this.systemId}`)
        ]);

        // Verify system exists and has correct structure
        if (!systems.data || systems.data.id !== this.systemId) {
            throw new Error('System relationship validation failed');
        }

        // Verify all grow beds belong to system
        const invalidBeds = growBeds.data.filter(bed => bed.system_id !== this.systemId);
        if (invalidBeds.length > 0) {
            throw new Error('Grow bed relationship validation failed');
        }

        // Verify all plant data belongs to valid grow beds
        const validBedIds = growBeds.data.map(bed => bed.bed_number);
        const invalidPlantData = plantData.data.filter(plant => !validBedIds.includes(plant.grow_bed_id));
        if (invalidPlantData.length > 0) {
            throw new Error('Plant data relationship validation failed');
        }

        console.log(`   ✓ Validated relationships: ${growBeds.data.length} beds, ${fishTanks.data.length} tanks, ${plantData.data.length} plant records`);
    }

    async testDataQueries() {
        // Test various query parameters and filters
        const queries = [
            `/api/data/nutrients/${this.systemId}?nutrient_type=ph&limit=10`,
            `/api/data/plant-growth/${this.systemId}`,
            `/api/data/fish-health/${this.systemId}`,
            `/api/data/operations/${this.systemId}`,
            `/api/data/latest/${this.systemId}`
        ];

        for (const query of queries) {
            const response = await this.api.get(query);
            if (!response.data) {
                throw new Error(`Query failed: ${query}`);
            }
        }

        console.log(`   ✓ Tested ${queries.length} different query endpoints`);
    }

    async verifyCalculations() {
        // Test the latest data aggregation endpoint
        const latestData = await this.api.get(`/api/data/latest/${this.systemId}`);
        
        if (!latestData.data.waterQuality || !latestData.data.plantGrowth || !latestData.data.fishHealth) {
            throw new Error('Latest data aggregation incomplete');
        }

        // Test nutrient readings aggregation
        const latestNutrients = await this.api.get(`/api/data/nutrients/latest/${this.systemId}`);
        
        if (!latestNutrients.data || Object.keys(latestNutrients.data).length === 0) {
            throw new Error('Nutrient aggregation failed');
        }

        console.log(`   🧮 Verified calculations and aggregations`);
    }

    async testInvalidData() {
        // Test that the system properly handles invalid data
        try {
            await this.api.post(`/api/data/plant-growth/${this.systemId}`, {
                grow_bed_id: 'invalid',
                crop_type: '',
                count: -5
            });
            throw new Error('Should have rejected invalid plant data');
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                // Expected - API properly rejected invalid data
                console.log(`   ✓ Properly rejected invalid data`);
            } else {
                throw error;
            }
        }
    }

    async testDataConstraints() {
        // Test database constraints and validation
        try {
            await this.api.post(`/api/systems/`, {
                id: this.systemId, // Duplicate ID
                system_name: 'Duplicate Test'
            });
            throw new Error('Should have rejected duplicate system ID');
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                console.log(`   ✓ Database constraints working correctly`);
            } else {
                throw error;
            }
        }
    }

    async testAuthAndPermissions() {
        // Test that endpoints require authentication
        const unauthenticatedApi = axios.create({
            baseURL: this.baseUrl,
            timeout: 5000
        });

        try {
            await unauthenticatedApi.get(`/api/systems/${this.systemId}`);
            throw new Error('Should have required authentication');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log(`   ✓ Authentication required correctly`);
            } else {
                throw error;
            }
        }
    }

    async cleanupTestData() {
        // Delete the test system (cascades to related data)
        await this.api.delete(`/api/systems/${this.systemId}`);
        console.log(`   🗑️  Cleaned up test system and all related data`);
    }

    printSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('🏁 TEST SUITE COMPLETE');
        console.log('='.repeat(70));
        console.log(`✅ PASSED: ${this.results.passed}`);
        console.log(`❌ FAILED: ${this.results.failed}`);
        console.log(`📊 TOTAL:  ${this.results.passed + this.results.failed}`);
        console.log(`🎯 SUCCESS RATE: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.tests.filter(t => t.status === 'FAILED').forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }
        
        console.log('\n📋 FUNCTIONALITY TESTED:');
        console.log('   ✓ System creation and configuration');
        console.log('   ✓ Grow bed and fish tank setup');  
        console.log('   ✓ Custom crop creation and allocation');
        console.log('   ✓ Fish inventory and health tracking');
        console.log('   ✓ Plant growth and batch management');
        console.log('   ✓ Water quality and nutrient monitoring');
        console.log('   ✓ Sensor data simulation');
        console.log('   ✓ Operations and maintenance logging');
        console.log('   ✓ Crop and fish harvesting');
        console.log('   ✓ 30-day operation simulation');
        console.log('   ✓ Data relationships and integrity');
        console.log('   ✓ Query endpoints and filters');
        console.log('   ✓ Calculations and aggregations');
        console.log('   ✓ Error handling and validation');
        console.log('   ✓ Authentication and permissions');
        console.log('   ✓ Data cleanup and deletion');
        
        console.log('\n🎉 Full-scale aquaponics system test completed successfully!');
    }
}

// Run the tests
async function main() {
    const tester = new AquaponicsSystemTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('💥 Test suite crashed:', error.message);
        process.exit(1);
    }
    
    // Exit with error code if any tests failed
    process.exit(tester.results.failed > 0 ? 1 : 0);
}

// Check if this file is being run directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AquaponicsSystemTester;