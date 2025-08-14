#!/usr/bin/env node

/**
 * Create SQLite Demo Database
 * 
 * This script creates a comprehensive SQLite database with rich demo data
 * including spray programmes, historical data, and realistic aquaponics scenarios.
 * 
 * Usage: node database/create-demo-data.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'demo-data.sqlite');

// Remove existing database
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Removed existing demo database');
}

const db = new sqlite3.Database(DB_PATH);

console.log('🚀 Creating comprehensive demo database...');

// Create tables matching MySQL schema
const createTables = `
-- Systems table (reference system data)
CREATE TABLE systems (
    id TEXT PRIMARY KEY,
    system_name TEXT NOT NULL,
    system_type TEXT NOT NULL DEFAULT 'hybrid',
    fish_type TEXT DEFAULT 'tilapia',
    fish_tank_count INTEGER DEFAULT 7,
    total_fish_volume DECIMAL(10,2) DEFAULT 49000.00,
    grow_bed_count INTEGER DEFAULT 7,
    total_grow_volume DECIMAL(10,2) DEFAULT 43200.00,
    total_grow_area DECIMAL(10,2) DEFAULT 355.20
);

-- Fish tanks
CREATE TABLE fish_tanks (
    id INTEGER PRIMARY KEY,
    tank_number INTEGER NOT NULL,
    size_m3 DECIMAL(8,2) NOT NULL,
    volume_liters DECIMAL(10,2) NOT NULL,
    fish_type TEXT NOT NULL,
    current_fish_count INTEGER NOT NULL DEFAULT 0
);

-- Grow beds
CREATE TABLE grow_beds (
    id INTEGER PRIMARY KEY,
    bed_number INTEGER NOT NULL,
    bed_type TEXT NOT NULL,
    bed_name TEXT,
    volume_liters DECIMAL(10,2) NOT NULL,
    area_m2 DECIMAL(8,2),
    length_meters DECIMAL(8,2),
    width_meters DECIMAL(8,2),
    height_meters DECIMAL(8,2),
    plant_capacity INTEGER,
    vertical_count INTEGER,
    plants_per_vertical INTEGER,
    equivalent_m2 DECIMAL(8,2) NOT NULL,
    reservoir_volume DECIMAL(10,2),
    reservoir_volume_liters DECIMAL(10,2)
);

-- Water quality data
CREATE TABLE water_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    temperature DECIMAL(5,2),
    ph DECIMAL(4,2),
    ammonia DECIMAL(8,2),
    nitrite DECIMAL(8,2),
    nitrate DECIMAL(8,2),
    dissolved_oxygen DECIMAL(6,2),
    humidity DECIMAL(8,2),
    salinity DECIMAL(8,2),
    notes TEXT
);

-- Nutrient readings
CREATE TABLE nutrient_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nutrient_type TEXT NOT NULL,
    value DECIMAL(8,2) NOT NULL,
    unit TEXT DEFAULT 'mg/L',
    reading_date TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    notes TEXT
);

-- Fish health data
CREATE TABLE fish_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fish_tank_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    count INTEGER,
    mortality INTEGER,
    average_weight DECIMAL(8,2),
    feed_consumption DECIMAL(8,2),
    feed_type TEXT,
    behavior TEXT,
    notes TEXT
);

-- Fish inventory
CREATE TABLE fish_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fish_tank_id INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    average_weight DECIMAL(8,2),
    fish_type TEXT DEFAULT 'tilapia',
    batch_id TEXT
);

-- Plant growth data
CREATE TABLE plant_growth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grow_bed_id INTEGER,
    date TEXT NOT NULL,
    crop_type TEXT,
    count INTEGER,
    harvest_weight DECIMAL(8,2),
    plants_harvested INTEGER,
    new_seedlings INTEGER,
    pest_control TEXT,
    health TEXT,
    growth_stage TEXT,
    batch_id TEXT,
    seed_variety TEXT,
    batch_created_date TEXT,
    days_to_harvest INTEGER,
    notes TEXT
);

-- Plant allocations
CREATE TABLE plant_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grow_bed_id INTEGER NOT NULL,
    crop_type TEXT NOT NULL,
    percentage_allocated DECIMAL(5,2) NOT NULL,
    plants_planted INTEGER DEFAULT 0,
    plant_spacing INTEGER DEFAULT 30,
    date_planted TEXT,
    status TEXT DEFAULT 'active'
);

-- Spray programmes (comprehensive aquaponics spray schedule)
CREATE TABLE spray_programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    product_name TEXT NOT NULL,
    active_ingredient TEXT,
    target_pest TEXT,
    application_rate TEXT,
    frequency TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT
);

-- Spray applications (historical application records)
CREATE TABLE spray_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    programme_id INTEGER NOT NULL,
    application_date TEXT NOT NULL,
    dilution_rate TEXT,
    volume_applied DECIMAL(8,2),
    weather_conditions TEXT,
    effectiveness_rating INTEGER,
    notes TEXT,
    FOREIGN KEY (programme_id) REFERENCES spray_programmes (id)
);
`;

db.exec(createTables, (err) => {
    if (err) {
        console.error('❌ Error creating tables:', err);
        return;
    }
    
    console.log('✅ Tables created successfully');
    
    // Insert comprehensive demo data
    insertDemoData();
});

function insertDemoData() {
    console.log('📊 Inserting comprehensive demo data...');
    
    db.serialize(() => {
        // 1. System data
        db.run(`INSERT INTO systems VALUES 
            ('demo_reference', 'Oribi 1 Demo System', 'hybrid', 'tilapia', 7, 49000.00, 7, 43200.00, 355.20)`);
        
        // 2. Fish tanks (7 tanks with realistic data)
        const fishTanks = [
            [1, 1, 7.00, 7000.00, 'tilapia', 179],
            [2, 2, 7.00, 7000.00, 'tilapia', 420],
            [3, 3, 7.00, 7000.00, 'tilapia', 198],
            [4, 4, 7.00, 7000.00, 'tilapia', 103],
            [5, 5, 7.00, 7000.00, 'tilapia', 260],
            [6, 6, 7.00, 7000.00, 'tilapia', 153],
            [7, 7, 7.00, 7000.00, 'tilapia', 195]
        ];
        
        fishTanks.forEach(tank => {
            db.run(`INSERT INTO fish_tanks VALUES (?, ?, ?, ?, ?, ?)`, tank);
        });
        
        // 3. Grow beds (7 beds with different types)
        const growBeds = [
            [1, 1, 'dwc', 'DWC Bed 1', 43200.00, 144.00, 40.00, 3.60, 0.30, null, null, null, 144.00, 43200.00, null],
            [2, 2, 'dwc', 'DWC Bed 2', 43200.00, 144.00, 40.00, 3.60, 0.30, null, null, null, 144.00, 43200.00, null],
            [3, 3, 'vertical', 'Vertical Tower 1', 1440.00, 48.00, 6.00, 0.60, 0.40, 1200, 25, 48, 48.00, 1440.00, null],
            [4, 4, 'vertical', 'Vertical Tower 2', 1440.00, 19.20, 6.00, 0.60, 0.40, 480, 10, 48, 19.20, 1440.00, null],
            [5, 5, 'vertical', 'Vertical Tower 3', 1080.00, 19.20, 6.00, 0.60, 0.30, 480, 10, 48, 19.20, 1080.00, null],
            [6, 6, 'nft', 'NFT Channel System', 720.00, 24.00, 8.00, 3.00, 0.08, 96, null, null, 24.00, 720.00, null],
            [7, 7, 'media', 'Media Bed', 3600.00, 18.00, 6.00, 3.00, 0.20, 72, null, null, 18.00, 3600.00, null]
        ];
        
        growBeds.forEach(bed => {
            db.run(`INSERT INTO grow_beds VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, bed);
        });
        
        // 4. Generate 45 days of realistic water quality data
        console.log('💧 Generating 45 days of water quality data...');
        for (let i = 0; i < 45; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Realistic fluctuating values
            const temp = 24.0 + (Math.random() - 0.5) * 4; // 22-26°C
            const ph = 7.0 + (Math.random() - 0.5) * 1.0;   // 6.5-7.5
            const ammonia = Math.random() * 0.5;             // 0-0.5 ppm
            const nitrite = Math.random() * 1.0;             // 0-1.0 ppm  
            const nitrate = 20 + Math.random() * 40;         // 20-60 ppm
            const oxygen = 6.0 + Math.random() * 2.0;        // 6-8 ppm
            const humidity = 60 + Math.random() * 20;        // 60-80%
            const salinity = 0.3 + Math.random() * 0.4;     // 0.3-0.7 ppt
            
            db.run(`INSERT INTO water_quality (date, temperature, ph, ammonia, nitrite, nitrate, dissolved_oxygen, humidity, salinity, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                   [dateStr, temp.toFixed(1), ph.toFixed(2), ammonia.toFixed(2), nitrite.toFixed(2), 
                    nitrate.toFixed(1), oxygen.toFixed(1), humidity.toFixed(0), salinity.toFixed(2), 'Auto-generated demo data']);
        }
        
        // 5. Generate comprehensive nutrient readings (45 days)
        console.log('🌿 Generating nutrient readings...');
        const nutrients = [
            {type: 'ammonia', range: [0, 0.5], unit: 'ppm'},
            {type: 'nitrite', range: [0, 1.0], unit: 'mg/L'},
            {type: 'nitrate', range: [20, 60], unit: 'mg/L'},
            {type: 'phosphorus', range: [15, 25], unit: 'mg/L'},
            {type: 'potassium', range: [50, 70], unit: 'mg/L'},
            {type: 'calcium', range: [50, 80], unit: 'mg/L'},
            {type: 'magnesium', range: [10, 15], unit: 'mg/L'},
            {type: 'iron', range: [1.0, 2.0], unit: 'mg/L'},
            {type: 'ec', range: [400, 600], unit: 'µS/cm'}
        ];
        
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString();
            
            nutrients.forEach(nutrient => {
                const value = nutrient.range[0] + Math.random() * (nutrient.range[1] - nutrient.range[0]);
                const source = Math.random() > 0.7 ? 'sensor' : 'manual';
                
                db.run(`INSERT INTO nutrient_readings (nutrient_type, value, unit, reading_date, source, notes) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                       [nutrient.type, value.toFixed(2), nutrient.unit, dateStr, source, 'Demo system data']);
            });
        }
        
        // 6. Fish health data for all tanks (30 days)
        console.log('🐟 Generating fish health data...');
        for (let tankId = 1; tankId <= 7; tankId++) {
            for (let i = 0; i < 10; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i * 3);
                const dateStr = date.toISOString().split('T')[0];
                
                const feedTypes = ['pellets', 'flakes', 'bloodworms', 'commercial_mix'];
                const behaviors = ['active', 'feeding_well', 'normal', 'very_active'];
                
                db.run(`INSERT INTO fish_health (fish_tank_id, date, count, mortality, average_weight, feed_consumption, feed_type, behavior, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                       [tankId, dateStr, 
                        Math.floor(180 + Math.random() * 50), // count
                        Math.floor(Math.random() * 3),        // mortality
                        (240 + Math.random() * 40).toFixed(1), // avg weight
                        (2.5 + Math.random() * 1.5).toFixed(1), // feed consumption
                        feedTypes[Math.floor(Math.random() * feedTypes.length)],
                        behaviors[Math.floor(Math.random() * behaviors.length)],
                        'Healthy tank conditions']);
            }
        }
        
        // 7. Fish inventory (current stock for all tanks)
        console.log('📊 Adding fish inventory...');
        const fishCounts = [179, 420, 198, 103, 260, 153, 195];
        fishCounts.forEach((count, index) => {
            db.run(`INSERT INTO fish_inventory (fish_tank_id, current_count, average_weight, fish_type, batch_id)
                    VALUES (?, ?, ?, ?, ?)`,
                   [index + 1, count, (250 + Math.random() * 50).toFixed(1), 'tilapia', `demo_batch_${index + 1}`]);
        });
        
        // 8. Plant allocations for grow beds
        console.log('🌱 Adding plant allocations...');
        const cropAllocations = [
            [1, 'lettuce', 60.0, 85, 25, '2024-12-01'],
            [1, 'spinach', 40.0, 55, 20, '2024-12-01'],
            [2, 'kale', 70.0, 95, 30, '2024-11-28'],
            [2, 'arugula', 30.0, 40, 15, '2024-11-28'],
            [3, 'cherry_tomatoes', 80.0, 380, 25, '2024-11-20'],
            [3, 'basil', 20.0, 95, 10, '2024-11-20'],
            [4, 'peppers', 100.0, 160, 40, '2024-11-15'],
            [5, 'strawberries', 100.0, 240, 20, '2024-10-30'],
            [6, 'lettuce', 100.0, 48, 20, '2024-12-05'],
            [7, 'herbs_mix', 100.0, 36, 20, '2024-11-25']
        ];
        
        cropAllocations.forEach(allocation => {
            db.run(`INSERT INTO plant_allocations (grow_bed_id, crop_type, percentage_allocated, plants_planted, plant_spacing, date_planted, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'active')`, allocation);
        });
        
        // 9. Plant growth history (30 days of records)
        console.log('📈 Generating plant growth history...');
        const crops = ['lettuce', 'spinach', 'kale', 'cherry_tomatoes', 'basil', 'peppers', 'strawberries', 'herbs_mix'];
        const growthStages = ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest_ready'];
        
        for (let i = 0; i < 25; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Generate random plant growth records
            for (let bedId = 1; bedId <= 7; bedId++) {
                if (Math.random() > 0.6) { // 40% chance per day per bed
                    const crop = crops[Math.floor(Math.random() * crops.length)];
                    const isHarvest = Math.random() > 0.85;
                    
                    db.run(`INSERT INTO plant_growth (grow_bed_id, date, crop_type, count, harvest_weight, plants_harvested, 
                                                     new_seedlings, health, growth_stage, batch_id, seed_variety, batch_created_date, days_to_harvest, notes)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                           [bedId, dateStr, crop,
                            isHarvest ? 0 : Math.floor(10 + Math.random() * 30), // count
                            isHarvest ? (Math.random() * 3 + 1).toFixed(2) : null, // harvest weight
                            isHarvest ? Math.floor(5 + Math.random() * 15) : null, // plants harvested
                            isHarvest ? 0 : Math.floor(Math.random() * 10), // new seedlings
                            'healthy',
                            growthStages[Math.floor(Math.random() * growthStages.length)],
                            `demo_batch_${bedId}_${crop}`,
                            `${crop}_variety_1`,
                            dateStr,
                            Math.floor(30 + Math.random() * 60), // days to harvest
                            isHarvest ? 'Harvest completed' : 'Regular monitoring']);
                }
            }
        }
        
        // 10. Comprehensive spray programmes for aquaponics
        console.log('🚿 Adding spray programmes...');
        const sprayProgrammes = [
            // Organic pest control
            ['biological', 'Bacillus thuringiensis (Bt)', 'Bacillus thuringiensis', 'Caterpillars, larvae', '1-2g/L', 'Weekly as needed', '2024-03-01', '2024-12-31', 'Organic caterpillar control for leafy greens'],
            ['biological', 'Neem Oil Solution', 'Azadirachtin', 'Aphids, whiteflies, thrips', '5-10ml/L', 'Bi-weekly', '2024-01-01', '2024-12-31', 'Broad spectrum organic insecticide'],
            ['biological', 'Insecticidal Soap', 'Potassium salts of fatty acids', 'Soft-bodied insects', '10-20ml/L', 'Weekly as needed', '2024-01-01', '2024-12-31', 'Gentle contact insecticide'],
            
            // Beneficial applications
            ['beneficial', 'EM-1 Microbial Inoculant', 'Effective microorganisms', 'Root health, disease prevention', '1:500 dilution', 'Monthly', '2024-01-01', '2024-12-31', 'Microbial soil/root enhancement'],
            ['beneficial', 'Compost Tea Spray', 'Beneficial bacteria and fungi', 'Plant health, disease resistance', '1:10 dilution', 'Bi-weekly', '2024-01-01', '2024-12-31', 'Natural plant immunity booster'],
            
            // Fungal control
            ['fungicide', 'Milk Spray (Organic)', 'Lactobacillus bacteria', 'Powdery mildew, fungal issues', '1:10 milk to water', 'Weekly during humid periods', '2024-05-01', '2024-10-31', 'Natural fungal prevention'],
            ['fungicide', 'Baking Soda Solution', 'Sodium bicarbonate', 'Powdery mildew, black spot', '5g/L + 2ml dish soap', 'Bi-weekly as needed', '2024-01-01', '2024-12-31', 'pH adjustment fungal control'],
            
            // Nutrient supplementation
            ['foliar_feed', 'Liquid Kelp Extract', 'Natural growth hormones, minerals', 'General plant health', '2-5ml/L', 'Monthly', '2024-01-01', '2024-12-31', 'Natural growth stimulant'],
            ['foliar_feed', 'Fish Emulsion Spray', 'Organic nitrogen and minerals', 'Leafy green nutrition', '10ml/L', 'Bi-weekly', '2024-01-01', '2024-12-31', 'Gentle organic fertilizer'],
            
            // Integrated pest management
            ['ipm', 'Sticky Yellow Traps', 'Physical trap', 'Flying insects monitoring', 'Replace monthly', 'Monthly', '2024-01-01', '2024-12-31', 'Early pest detection system'],
            ['ipm', 'Companion Planting Spray', 'Garlic and chili extract', 'General pest deterrent', '20ml/L', 'Weekly', '2024-01-01', '2024-12-31', 'Natural repellent mixture']
        ];
        
        sprayProgrammes.forEach((programme, index) => {
            db.run(`INSERT INTO spray_programmes (category, product_name, active_ingredient, target_pest, application_rate, frequency, start_date, end_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, programme);
        });
        
        // 11. Spray application history
        console.log('📅 Adding spray application history...');
        for (let i = 0; i < 60; i++) { // 60 days of spray records
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Random applications (not every day)
            if (Math.random() > 0.7) { // 30% chance per day
                const programmeId = Math.floor(Math.random() * 11) + 1;
                const weather = ['sunny', 'cloudy', 'overcast', 'light_breeze'][Math.floor(Math.random() * 4)];
                const effectiveness = Math.floor(Math.random() * 3) + 3; // 3-5 rating
                
                db.run(`INSERT INTO spray_applications (programme_id, application_date, dilution_rate, volume_applied, weather_conditions, effectiveness_rating, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                       [programmeId, dateStr, 'As per programme', (5 + Math.random() * 15).toFixed(1), weather, effectiveness, 'Regular application schedule']);
            }
        }
        
        console.log('✅ Demo data insertion completed!');
        console.log('📊 Database created with:');
        console.log('   • 1 Reference system');
        console.log('   • 7 Fish tanks with inventory');
        console.log('   • 7 Grow beds (DWC, Vertical, NFT, Media)');
        console.log('   • 45 days of water quality data');
        console.log('   • 30 days of nutrient readings');
        console.log('   • 30 days of fish health records');
        console.log('   • 25 days of plant growth history');
        console.log('   • 10 crop allocations');
        console.log('   • 11 comprehensive spray programmes');
        console.log('   • 60 days of spray application history');
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('🎉 Demo database created successfully at:', DB_PATH);
            }
        });
    });
}