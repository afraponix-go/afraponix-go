const mysql = require('mysql2/promise');

// Check if we should use MariaDB/MySQL based on environment variables
const useMariaDB = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;

async function initializeDatabase() {
    if (!useMariaDB) {
        console.log('📦 MariaDB environment variables not found, skipping MariaDB initialization');
        return null;
    }

    console.log('📦 Initializing MariaDB database...');
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });

        console.log('📦 Connected to MariaDB database');

        // Create all tables
        await createTables(connection);
        
        console.log('✅ MariaDB database initialized successfully');
        return connection;
        
    } catch (error) {
        console.error('❌ Error initializing MariaDB database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createTables(connection) {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            password_hash TEXT NOT NULL,
            user_role VARCHAR(50) DEFAULT 'basic',
            subscription_status VARCHAR(50) DEFAULT 'basic',
            reset_token TEXT,
            reset_token_expiry TIMESTAMP NULL,
            email_verified BOOLEAN DEFAULT 0,
            verification_token TEXT,
            verification_token_expiry TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`,

        // Systems table
        `CREATE TABLE IF NOT EXISTS systems (
            id VARCHAR(255) PRIMARY KEY,
            user_id INT NOT NULL,
            system_name VARCHAR(255) NOT NULL,
            system_type VARCHAR(100) NOT NULL DEFAULT 'media-bed',
            fish_type VARCHAR(100) DEFAULT 'tilapia',
            fish_tank_count INT DEFAULT 1,
            total_fish_volume DECIMAL(10,2) DEFAULT 1000,
            grow_bed_count INT DEFAULT 4,
            total_grow_volume DECIMAL(10,2) DEFAULT 800,
            total_grow_area DECIMAL(10,2) DEFAULT 2.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Water quality table
        `CREATE TABLE IF NOT EXISTS water_quality (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            date VARCHAR(20) NOT NULL,
            ph DECIMAL(4,2),
            ec DECIMAL(8,2),
            dissolved_oxygen DECIMAL(6,2),
            temperature DECIMAL(5,2),
            ammonia DECIMAL(8,2),
            nitrite DECIMAL(8,2),
            nitrate DECIMAL(8,2),
            iron DECIMAL(8,2),
            potassium DECIMAL(8,2),
            calcium DECIMAL(8,2),
            phosphorus DECIMAL(8,2),
            magnesium DECIMAL(8,2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Grow beds table
        `CREATE TABLE IF NOT EXISTS grow_beds (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            bed_number INT NOT NULL,
            bed_type VARCHAR(100) NOT NULL,
            bed_name VARCHAR(255),
            volume_liters DECIMAL(10,2) NOT NULL,
            area_m2 DECIMAL(8,2),
            length_meters DECIMAL(8,2),
            width_meters DECIMAL(8,2),
            height_meters DECIMAL(8,2),
            plant_capacity INT,
            vertical_count INT,
            plants_per_vertical INT,
            equivalent_m2 DECIMAL(8,2) NOT NULL,
            reservoir_volume DECIMAL(10,2),
            trough_length DECIMAL(8,2),
            trough_count INT,
            plant_spacing DECIMAL(6,2),
            reservoir_volume_liters DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Fish health table
        `CREATE TABLE IF NOT EXISTS fish_health (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            fish_tank_id INT NOT NULL DEFAULT 1,
            date VARCHAR(20) NOT NULL,
            count INT,
            mortality INT,
            average_weight DECIMAL(8,2),
            feed_consumption DECIMAL(8,2),
            behavior TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Plant growth table
        `CREATE TABLE IF NOT EXISTS plant_growth (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            grow_bed_id INT,
            date VARCHAR(20) NOT NULL,
            crop_type VARCHAR(100),
            count INT,
            harvest_weight DECIMAL(8,2),
            plants_harvested INT,
            new_seedlings INT,
            pest_control TEXT,
            health VARCHAR(100),
            growth_stage VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE SET NULL
        ) ENGINE=InnoDB`,

        // Operations table
        `CREATE TABLE IF NOT EXISTS operations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            date VARCHAR(20) NOT NULL,
            operation_type VARCHAR(100),
            water_volume DECIMAL(10,2),
            chemical_added TEXT,
            amount_added TEXT,
            downtime_duration DECIMAL(8,2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Custom crops table
        `CREATE TABLE IF NOT EXISTS custom_crops (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            crop_name VARCHAR(255) NOT NULL,
            target_n DECIMAL(8,2),
            target_p DECIMAL(8,2),
            target_k DECIMAL(8,2),
            target_ca DECIMAL(8,2),
            target_mg DECIMAL(8,2),
            target_fe DECIMAL(8,2),
            target_ec DECIMAL(8,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Plant allocations table
        `CREATE TABLE IF NOT EXISTS plant_allocations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            grow_bed_id INT NOT NULL,
            crop_type VARCHAR(100) NOT NULL,
            percentage_allocated DECIMAL(5,2) NOT NULL,
            plants_planted INT DEFAULT 0,
            date_planted VARCHAR(20),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // System shares table
        `CREATE TABLE IF NOT EXISTS system_shares (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            owner_id INT NOT NULL,
            shared_with_id INT NOT NULL,
            permission_level VARCHAR(50) DEFAULT 'view',
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (shared_with_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Fish tanks table
        `CREATE TABLE IF NOT EXISTS fish_tanks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            tank_number INT NOT NULL,
            size_m3 DECIMAL(8,2) NOT NULL,
            volume_liters DECIMAL(10,2) NOT NULL,
            fish_type VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            UNIQUE(system_id, tank_number)
        ) ENGINE=InnoDB`,

        // Fish feeding table
        `CREATE TABLE IF NOT EXISTS fish_feeding (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            fish_type VARCHAR(100) NOT NULL,
            feedings_per_day INT DEFAULT 2,
            amount_per_feeding DECIMAL(8,2),
            feeding_times TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Spray programmes table
        `CREATE TABLE IF NOT EXISTS spray_programmes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            active_ingredient TEXT,
            target_pest TEXT,
            application_rate TEXT,
            frequency TEXT,
            start_date VARCHAR(20),
            end_date VARCHAR(20),
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Spray applications table
        `CREATE TABLE IF NOT EXISTS spray_applications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            programme_id INT NOT NULL,
            application_date VARCHAR(20) NOT NULL,
            dilution_rate TEXT,
            volume_applied DECIMAL(8,2),
            weather_conditions TEXT,
            effectiveness_rating INT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (programme_id) REFERENCES spray_programmes (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    ];

    // Create tables sequentially
    for (let i = 0; i < tables.length; i++) {
        try {
            await connection.execute(tables[i]);
            console.log(`✅ Table ${i + 1}/${tables.length} created successfully`);
        } catch (error) {
            console.error(`❌ Error creating table ${i + 1}:`, error.message);
            throw error;
        }
    }
}

function getDatabase() {
    if (useMariaDB) {
        // Use the non-promise version for compatibility with callback-style queries
        const mysql2 = require('mysql2');
        const connection = mysql2.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });
        
        // Add compatibility methods for SQLite-style queries
        const originalGet = connection.query.bind(connection);
        const originalRun = connection.query.bind(connection);
        
        // Emulate SQLite's db.get() method (returns single row)
        connection.get = function(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            this.query(sql, params, (err, results) => {
                if (err) return callback(err);
                callback(null, results[0] || null);
            });
        };
        
        // Emulate SQLite's db.run() method (returns lastID and changes)
        connection.run = function(sql, params, callback) {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            this.query(sql, params, function(err, results) {
                if (err) return callback(err);
                // Emulate SQLite's this.lastID and this.changes
                const context = {
                    lastID: results.insertId || null,
                    changes: results.affectedRows || 0
                };
                callback.call(context, null);
            });
        };
        
        // Add a close() method for backward compatibility
        connection.close = function() {
            this.end();
        };
        
        return connection;
    } else {
        throw new Error('MariaDB environment variables not configured');
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    useMariaDB
};