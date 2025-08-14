-- MariaDB initialization script for development
-- This file is automatically loaded when the Docker container starts

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Users table
CREATE TABLE IF NOT EXISTS users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Systems table
CREATE TABLE IF NOT EXISTS systems (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plant growth table with batch tracking
CREATE TABLE IF NOT EXISTS plant_growth (
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
    INDEX idx_batch_id (batch_id),
    INDEX idx_batch_date (batch_created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grow beds table
CREATE TABLE IF NOT EXISTS grow_beds (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Water quality table
CREATE TABLE IF NOT EXISTS water_quality (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fish health table
CREATE TABLE IF NOT EXISTS fish_health (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Operations table
CREATE TABLE IF NOT EXISTS operations (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additional tables for complete functionality
CREATE TABLE IF NOT EXISTS custom_crops (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plant_allocations (
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
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_shares (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fish_tanks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    tank_number INT NOT NULL,
    size_m3 DECIMAL(8,2) NOT NULL,
    volume_liters DECIMAL(10,2) NOT NULL,
    fish_type VARCHAR(100) NOT NULL,
    current_fish_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
    UNIQUE(system_id, tank_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spray_programmes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spray_applications (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensor_configs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensor_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sensor_id INT NOT NULL,
    reading_time TIMESTAMP NOT NULL,
    value DECIMAL(10,2),
    unit VARCHAR(50),
    raw_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensor_configs (id) ON DELETE CASCADE,
    INDEX idx_sensor_time (sensor_id, reading_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fish inventory table for tracking current fish counts per tank
CREATE TABLE IF NOT EXISTS fish_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    fish_tank_id INT NOT NULL,
    current_count INT DEFAULT 0,
    average_weight DECIMAL(8,2),
    fish_type VARCHAR(50) DEFAULT 'tilapia',
    batch_id VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fish events table for tracking additions/mortalities/moves
CREATE TABLE IF NOT EXISTS fish_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    fish_tank_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    count_change INT DEFAULT 0,
    weight DECIMAL(8,2),
    notes TEXT,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    batch_id VARCHAR(100),
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fish feeding schedules table
CREATE TABLE IF NOT EXISTS fish_feeding (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    fish_type VARCHAR(100) NOT NULL,
    feedings_per_day INT DEFAULT 2,
    amount_per_feeding DECIMAL(8,2),
    feeding_times TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fish harvest tracking table
CREATE TABLE IF NOT EXISTS fish_harvest (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    tank_number INT NOT NULL,
    harvest_date DATE NOT NULL,
    fish_count INT NOT NULL,
    total_weight_kg DECIMAL(10,2) NOT NULL,
    average_weight_kg DECIMAL(6,3),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
    INDEX idx_system_harvest_date (system_id, harvest_date),
    INDEX idx_tank_harvest (system_id, tank_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nutrient readings table (migrated from water_quality columns)
CREATE TABLE IF NOT EXISTS nutrient_readings (
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
    INDEX idx_system_nutrient_date (system_id, nutrient_type, reading_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed varieties table for crop management
CREATE TABLE IF NOT EXISTS seed_varieties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    crop_type VARCHAR(100) NOT NULL,
    variety_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crop_type (crop_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System credentials table for encrypted API storage
CREATE TABLE IF NOT EXISTS system_credentials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    system_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    api_url VARCHAR(255),
    username_encrypted TEXT,
    password_encrypted TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample data for development and demo system template

-- Create admin user (password: admin123)
INSERT IGNORE INTO users (id, username, email, first_name, last_name, password_hash, email_verified) 
VALUES (2, 'admin', 'admin@aquaponics.local', 'Admin', 'User', '$2a$10$rZ4UzQ9mxLzK.vF0bL0WqOd7nQjvZ1gF8vZ1gF8vZ1gF8vZ1gF8vZ1g', 1);

-- Create Oribi 1 reference system for demo system creation
INSERT IGNORE INTO systems (id, user_id, system_name, system_type, fish_type, fish_tank_count, total_fish_volume, grow_bed_count, total_grow_volume, total_grow_area, created_at)
VALUES ('system_1754627714554', 2, 'Oribi 1', 'hybrid', 'tilapia', 7, 49000.00, 7, 43200.00, 355.20, '2025-08-08 04:35:14');

-- Create fish tanks for Oribi 1 reference system
INSERT IGNORE INTO fish_tanks (id, system_id, tank_number, size_m3, volume_liters, fish_type, current_fish_count, created_at) VALUES
(11, 'system_1754627714554', 1, 7.00, 7000.00, 'tilapia', 179, '2025-08-08 04:35:14'),
(12, 'system_1754627714554', 2, 7.00, 7000.00, 'tilapia', 420, '2025-08-08 04:35:14'),
(13, 'system_1754627714554', 3, 7.00, 7000.00, 'tilapia', 198, '2025-08-08 04:35:14'),
(14, 'system_1754627714554', 4, 7.00, 7000.00, 'tilapia', 103, '2025-08-08 04:35:14'),
(15, 'system_1754627714554', 5, 7.00, 7000.00, 'tilapia', 260, '2025-08-08 04:35:14'),
(16, 'system_1754627714554', 6, 7.00, 7000.00, 'tilapia', 153, '2025-08-08 04:35:14'),
(17, 'system_1754627714554', 7, 7.00, 7000.00, 'tilapia', 195, '2025-08-08 04:35:14');

-- Create grow beds for Oribi 1 reference system
INSERT IGNORE INTO grow_beds (id, system_id, bed_number, bed_type, bed_name, volume_liters, area_m2, length_meters, width_meters, height_meters, plant_capacity, vertical_count, plants_per_vertical, equivalent_m2, reservoir_volume, reservoir_volume_liters, created_at) VALUES
(14, 'system_1754627714554', 1, 'dwc', 'Bed 1', 43200.00, 144.00, 40.00, 3.60, 0.30, NULL, NULL, NULL, 144.00, 43200.00, NULL, '2025-08-08 04:35:14'),
(15, 'system_1754627714554', 2, 'dwc', 'Bed 2', 43200.00, 144.00, 40.00, 3.60, 0.30, NULL, NULL, NULL, 144.00, 43200.00, NULL, '2025-08-08 04:35:14'),
(16, 'system_1754627714554', 3, 'vertical', 'Bed 3', 1440.00, 48.00, 6.00, 0.60, 0.40, 1200, 25, 48, 48.00, 1440.00, NULL, '2025-08-08 04:35:14'),
(44, 'system_1754627714554', 4, 'vertical', 'Bed 4', 1440.00, 19.20, 6.00, 0.60, 0.40, 480, 10, 48, 19.20, 1440.00, NULL, '2025-08-11 04:41:16'),
(46, 'system_1754627714554', 5, 'vertical', 'Bed 5', 1080.00, 19.20, 6.00, 0.60, 0.30, 480, 10, 48, 19.20, 1080.00, NULL, '2025-08-13 10:22:42'),
(47, 'system_1754627714554', 6, 'nft', 'Bed 6', 720.00, 24.00, 8.00, 3.00, 0.08, 96, NULL, NULL, 24.00, 720.00, NULL, '2025-08-13 10:22:42'),
(48, 'system_1754627714554', 7, 'media', 'Bed 7', 3600.00, 18.00, 6.00, 3.00, 0.20, 72, NULL, NULL, 18.00, 3600.00, NULL, '2025-08-13 10:22:42');

-- Add sample water quality data for Oribi 1 reference system  
INSERT IGNORE INTO water_quality (system_id, date, temperature, ph, ammonia, nitrite, nitrate, dissolved_oxygen, humidity, salinity, notes, created_at) VALUES
('system_1754627714554', '2025-08-14', 24.5, 7.70, 0.00, 0.30, 50.00, 6.50, 65.0, 0.50, 'Reference system data', NOW()),
('system_1754627714554', '2025-08-13', 24.8, 7.50, 0.30, 0.25, 55.00, 6.80, 68.0, 0.45, 'Reference system data', NOW());

-- Add sample nutrient readings for Oribi 1 reference system
INSERT IGNORE INTO nutrient_readings (system_id, nutrient_type, value, unit, reading_date, source, notes, created_at, updated_at) VALUES
('system_1754627714554', 'ammonia', 0.30, 'ppm', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'nitrite', 0.30, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'nitrate', 50.00, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'phosphorus', 20.00, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'potassium', 60.00, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'calcium', 60.00, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'magnesium', 12.00, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'iron', 1.40, 'mg/L', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW()),
('system_1754627714554', 'ec', 500.00, 'µS/cm', '2025-08-14 12:00:00', 'manual', 'Reference data', NOW(), NOW());

-- Add fish inventory data for Oribi 1 reference system
INSERT IGNORE INTO fish_inventory (system_id, fish_tank_id, current_count, average_weight, fish_type, batch_id, created_at) VALUES
('system_1754627714554', 11, 179, 250.00, 'tilapia', 'oribi1_tank1_batch', NOW()),
('system_1754627714554', 12, 420, 250.00, 'tilapia', 'oribi1_tank2_batch', NOW()),
('system_1754627714554', 13, 198, 250.00, 'tilapia', 'oribi1_tank3_batch', NOW()),
('system_1754627714554', 14, 103, 250.00, 'tilapia', 'oribi1_tank4_batch', NOW()),
('system_1754627714554', 15, 260, 250.00, 'tilapia', 'oribi1_tank5_batch', NOW()),
('system_1754627714554', 16, 153, 250.00, 'tilapia', 'oribi1_tank6_batch', NOW()),
('system_1754627714554', 17, 195, 250.00, 'tilapia', 'oribi1_tank7_batch', NOW());

-- Note: The admin password hash above is for 'admin123' - change in production!
-- The Oribi 1 system serves as the reference template for demo system creation