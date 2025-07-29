const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', process.env.DB_NAME || 'aquaponics.db');

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            console.log('📦 Connected to SQLite database');
        });

        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    reset_token TEXT,
                    reset_token_expiry DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Systems table
            db.run(`
                CREATE TABLE IF NOT EXISTS systems (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    system_name TEXT NOT NULL,
                    system_type TEXT NOT NULL DEFAULT 'media-bed',
                    fish_type TEXT DEFAULT 'tilapia',
                    fish_tank_count INTEGER DEFAULT 1,
                    total_fish_volume REAL DEFAULT 1000,
                    grow_bed_count INTEGER DEFAULT 4,
                    total_grow_volume REAL DEFAULT 800,
                    total_grow_area REAL DEFAULT 2.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);

            // Water quality data table
            db.run(`
                CREATE TABLE IF NOT EXISTS water_quality (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    ph REAL,
                    ec REAL,
                    dissolved_oxygen REAL,
                    temperature REAL,
                    ammonia REAL,
                    nitrite REAL,
                    nitrate REAL,
                    iron REAL,
                    potassium REAL,
                    calcium REAL,
                    phosphorus REAL,
                    magnesium REAL,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
                )
            `);

            // Fish health data table
            db.run(`
                CREATE TABLE IF NOT EXISTS fish_health (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
                    fish_tank_id INTEGER NOT NULL DEFAULT 1,
                    date TEXT NOT NULL,
                    count INTEGER,
                    mortality INTEGER,
                    average_weight REAL,
                    feed_consumption REAL,
                    behavior TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
                )
            `);

            // Plant growth data table
            db.run(`
                CREATE TABLE IF NOT EXISTS plant_growth (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
                    grow_bed_id INTEGER,
                    date TEXT NOT NULL,
                    crop_type TEXT,
                    count INTEGER,
                    harvest_weight REAL,
                    plants_harvested INTEGER,
                    new_seedlings INTEGER,
                    pest_control TEXT,
                    health TEXT,
                    growth_stage TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                    FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE SET NULL
                )
            `);

            // Individual grow beds table
            db.run(`
                CREATE TABLE IF NOT EXISTS grow_beds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
                    bed_number INTEGER NOT NULL,
                    bed_type TEXT NOT NULL,
                    volume_liters REAL NOT NULL,
                    area_m2 REAL,
                    length_meters REAL,
                    plant_capacity INTEGER,
                    vertical_count INTEGER,
                    plants_per_vertical INTEGER,
                    equivalent_m2 REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
                )
            `);

            // Operations data table
            db.run(`
                CREATE TABLE IF NOT EXISTS operations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    operation_type TEXT,
                    water_volume REAL,
                    chemical_added TEXT,
                    amount_added TEXT,
                    downtime_duration REAL,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    // Add missing columns to existing tables if they don't exist
                    const tempDb = new sqlite3.Database(DB_PATH);
                    
                    // Add fish_type column to systems table
                    tempDb.run(`ALTER TABLE systems ADD COLUMN fish_type TEXT DEFAULT 'tilapia'`, (alterErr1) => {
                        if (alterErr1 && !alterErr1.message.includes('duplicate column name')) {
                            console.error('Error adding fish_type column:', alterErr1);
                        }
                        
                        // Add fish_tank_id column to fish_health table
                        tempDb.run(`ALTER TABLE fish_health ADD COLUMN fish_tank_id INTEGER DEFAULT 1`, (alterErr2) => {
                            if (alterErr2 && !alterErr2.message.includes('duplicate column name')) {
                                console.error('Error adding fish_tank_id column:', alterErr2);
                            }
                            
                            // Add total_grow_area column to systems table
                            tempDb.run(`ALTER TABLE systems ADD COLUMN total_grow_area REAL DEFAULT 2.0`, (alterErr3) => {
                                if (alterErr3 && !alterErr3.message.includes('duplicate column name')) {
                                    console.error('Error adding total_grow_area column:', alterErr3);
                                }
                                
                                // Add new columns to water_quality table
                                tempDb.run(`ALTER TABLE water_quality ADD COLUMN iron REAL`, (alterErr4) => {
                                    if (alterErr4 && !alterErr4.message.includes('duplicate column name')) {
                                        console.error('Error adding iron column:', alterErr4);
                                    }
                                    
                                    tempDb.run(`ALTER TABLE water_quality ADD COLUMN potassium REAL`, (alterErr5) => {
                                        if (alterErr5 && !alterErr5.message.includes('duplicate column name')) {
                                            console.error('Error adding potassium column:', alterErr5);
                                        }
                                        
                                        tempDb.run(`ALTER TABLE water_quality ADD COLUMN calcium REAL`, (alterErr6) => {
                                            if (alterErr6 && !alterErr6.message.includes('duplicate column name')) {
                                                console.error('Error adding calcium column:', alterErr6);
                                            }
                                            
                                            // Add new columns to plant_growth table
                                            tempDb.run(`ALTER TABLE plant_growth ADD COLUMN plants_harvested INTEGER`, (alterErr7) => {
                                                if (alterErr7 && !alterErr7.message.includes('duplicate column name')) {
                                                    console.error('Error adding plants_harvested column:', alterErr7);
                                                }
                                                
                                                tempDb.run(`ALTER TABLE plant_growth ADD COLUMN new_seedlings INTEGER`, (alterErr8) => {
                                                    if (alterErr8 && !alterErr8.message.includes('duplicate column name')) {
                                                        console.error('Error adding new_seedlings column:', alterErr8);
                                                    }
                                                    
                                                    tempDb.run(`ALTER TABLE plant_growth ADD COLUMN pest_control TEXT`, (alterErr9) => {
                                                        if (alterErr9 && !alterErr9.message.includes('duplicate column name')) {
                                                            console.error('Error adding pest_control column:', alterErr9);
                                                        }
                                                        
                                                        // Add new columns to grow_beds table
                                                        tempDb.run(`ALTER TABLE grow_beds ADD COLUMN vertical_count INTEGER`, (alterErr10) => {
                                                            if (alterErr10 && !alterErr10.message.includes('duplicate column name')) {
                                                                console.error('Error adding vertical_count column:', alterErr10);
                                                            }
                                                            
                                                            tempDb.run(`ALTER TABLE grow_beds ADD COLUMN plants_per_vertical INTEGER`, (alterErr11) => {
                                                                if (alterErr11 && !alterErr11.message.includes('duplicate column name')) {
                                                                    console.error('Error adding plants_per_vertical column:', alterErr11);
                                                                }
                                                                
                                                                // Add missing nutrient columns to water_quality table
                                                                tempDb.run(`ALTER TABLE water_quality ADD COLUMN phosphorus REAL`, (alterErr12) => {
                                                                    if (alterErr12 && !alterErr12.message.includes('duplicate column name')) {
                                                                        console.error('Error adding phosphorus column:', alterErr12);
                                                                    }
                                                                    
                                                                    tempDb.run(`ALTER TABLE water_quality ADD COLUMN magnesium REAL`, (alterErr13) => {
                                                                        if (alterErr13 && !alterErr13.message.includes('duplicate column name')) {
                                                                            console.error('Error adding magnesium column:', alterErr13);
                                                                        }
                                                                        
                                                                        // Add reset token columns to users table
                                                                        tempDb.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, (alterErr14) => {
                                                                            if (alterErr14 && !alterErr14.message.includes('duplicate column name')) {
                                                                                console.error('Error adding reset_token column:', alterErr14);
                                                                            }
                                                                            
                                                                            tempDb.run(`ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME`, (alterErr15) => {
                                                                                if (alterErr15 && !alterErr15.message.includes('duplicate column name')) {
                                                                                    console.error('Error adding reset_token_expiry column:', alterErr15);
                                                                                }
                                                                                
                                                                                // Add grow_bed_id column to plant_growth table
                                                                                tempDb.run(`ALTER TABLE plant_growth ADD COLUMN grow_bed_id INTEGER`, (alterErr16) => {
                                                                                    if (alterErr16 && !alterErr16.message.includes('duplicate column name')) {
                                                                                        console.error('Error adding grow_bed_id column:', alterErr16);
                                                                                    }
                                                                                    
                                                                                    tempDb.close();
                                                                                    console.log('✅ Database tables initialized');
                                                                                    resolve(db);
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
            });
        });

        db.close();
    });
}

function getDatabase() {
    return new sqlite3.Database(DB_PATH);
}

module.exports = {
    initializeDatabase,
    getDatabase,
    DB_PATH
};