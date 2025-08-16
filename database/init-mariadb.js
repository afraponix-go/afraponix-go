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
            humidity DECIMAL(8,2),
            salinity DECIMAL(8,2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Nutrient readings table (individual nutrient records)
        `CREATE TABLE IF NOT EXISTS nutrient_readings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            nutrient_type VARCHAR(50) NOT NULL,
            value DECIMAL(8,2) NOT NULL,
            unit VARCHAR(10) DEFAULT 'mg/L',
            reading_date DATETIME NOT NULL,
            source VARCHAR(20) DEFAULT 'manual',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            INDEX idx_nutrient_system_type (system_id, nutrient_type),
            INDEX idx_nutrient_date (reading_date),
            INDEX idx_nutrient_system_date (system_id, reading_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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

        // Fish inventory table (current state)
        `CREATE TABLE IF NOT EXISTS fish_inventory (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            fish_tank_id INT NOT NULL,
            current_count INT DEFAULT 0,
            average_weight DECIMAL(8,2) DEFAULT NULL,
            fish_type VARCHAR(50) DEFAULT 'tilapia',
            batch_id VARCHAR(100) DEFAULT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            UNIQUE KEY unique_system_tank (system_id, fish_tank_id)
        ) ENGINE=InnoDB`,

        // Fish events table (historical log)
        `CREATE TABLE IF NOT EXISTS fish_events (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            fish_tank_id INT NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            count_change INT DEFAULT 0,
            weight DECIMAL(8,2) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            event_date TIMESTAMP NOT NULL,
            batch_id VARCHAR(100) DEFAULT NULL,
            user_id VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            INDEX idx_fish_events_system_tank_date (system_id, fish_tank_id, event_date DESC)
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
            batch_id VARCHAR(50),
            seed_variety VARCHAR(100),
            batch_created_date VARCHAR(20),
            days_to_harvest INT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
            FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE SET NULL,
            INDEX idx_batch_id (batch_id),
            INDEX idx_batch_date (batch_created_date)
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
            plant_spacing INT DEFAULT 30,
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
        ) ENGINE=InnoDB`,

        // Sensor configurations table
        `CREATE TABLE IF NOT EXISTS sensor_configs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            system_id VARCHAR(255) NOT NULL,
            sensor_name VARCHAR(255) NOT NULL,
            sensor_type VARCHAR(100) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            telemetry_key VARCHAR(255),
            api_url VARCHAR(500),
            api_token TEXT,
            update_interval INT DEFAULT 300,
            active BOOLEAN DEFAULT 1,
            last_reading TIMESTAMP NULL,
            mapped_table VARCHAR(100),
            mapped_field VARCHAR(100),
            data_transform VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        ) ENGINE=InnoDB`,

        // Sensor readings table
        `CREATE TABLE IF NOT EXISTS sensor_readings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sensor_id INT NOT NULL,
            reading_time TIMESTAMP NOT NULL,
            value DECIMAL(10,2),
            unit VARCHAR(50),
            raw_data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sensor_id) REFERENCES sensor_configs (id) ON DELETE CASCADE,
            INDEX idx_sensor_time (sensor_id, reading_time)
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

// Connection pool for better performance
let connectionPool = null;

function initializeConnectionPool() {
    if (!useMariaDB) {
        console.log('📦 MariaDB environment variables not found, skipping connection pool initialization');
        return null;
    }

    if (!connectionPool) {
        console.log('🏊 Initializing MariaDB connection pool...');
        
        connectionPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4',
            // Connection pool settings
            connectionLimit: 10,           // Maximum number of connections in pool
            queueLimit: 0,                 // No limit on queued connection requests
            idleTimeout: 600000,           // Close idle connections after 10 minutes
            enableKeepAlive: true,         // Keep connections alive
            keepAliveInitialDelay: 0
        });

        // Handle pool events
        connectionPool.on('connection', (connection) => {
            console.log('🔗 New database connection established as id ' + connection.threadId);
        });

        connectionPool.on('error', (error) => {
            console.error('❌ Database pool error:', error);
            if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('🔄 Attempting to reconnect to database...');
            }
        });

        console.log('✅ MariaDB connection pool initialized successfully');
    }

    return connectionPool;
}

function getDatabase() {
    if (useMariaDB) {
        // Initialize pool if it doesn't exist
        if (!connectionPool) {
            initializeConnectionPool();
        }
        
        // Return pool connection (mysql2 handles connection/release automatically)
        return connectionPool;
    } else {
        throw new Error('MariaDB environment variables not configured');
    }
}

function getDatabaseConnection() {
    // For cases where you need a single connection that you manage manually
    if (useMariaDB) {
        return mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });
    } else {
        throw new Error('MariaDB environment variables not configured');
    }
}

async function closeConnectionPool() {
    if (connectionPool) {
        console.log('🏊 Closing database connection pool...');
        await connectionPool.end();
        connectionPool = null;
        console.log('✅ Database connection pool closed');
    }
}

module.exports = {
    initializeDatabase,
    initializeConnectionPool,
    getDatabase,
    getDatabaseConnection,
    closeConnectionPool,
    useMariaDB
};