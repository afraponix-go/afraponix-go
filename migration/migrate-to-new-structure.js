#!/usr/bin/env node

/**
 * Afraponix Go - Complete Migration Script
 * Migrates from old database structure to new enhanced structure
 * This script completely replaces the old system with the new one
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { createDatabaseBackup } = require('./backup-database');

// Load environment variables
require('dotenv').config();

class AfraponixMigration {
    constructor() {
        this.connection = null;
        this.migrationLog = [];
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        
        console.log(logEntry);
        this.migrationLog.push(logEntry);
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });
        
        await this.log('Connected to database');
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            await this.log('Disconnected from database');
        }
    }

    async createBackup() {
        await this.log('Creating full database backup before migration...');
        
        try {
            const backupResult = await createDatabaseBackup();
            await this.log(`Backup completed: ${backupResult.sqlBackup}`);
            return backupResult;
        } catch (error) {
            await this.log(`Backup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async dropAllTables() {
        await this.log('Dropping all existing tables for complete replacement...');
        
        // Disable foreign key checks
        await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Get all tables
        const [tables] = await this.connection.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
            [process.env.DB_NAME]
        );

        // Drop each table
        for (const table of tables) {
            const tableName = table.table_name || table.TABLE_NAME;
            await this.connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
            await this.log(`Dropped table: ${tableName}`);
        }

        // Re-enable foreign key checks
        await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    async createNewStructure() {
        await this.log('Creating new enhanced database structure...');

        const newTables = [
            // Enhanced Users table with new fields
            `CREATE TABLE users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                email_verified BOOLEAN DEFAULT FALSE,
                email_verification_token VARCHAR(255),
                password_reset_token VARCHAR(255),
                password_reset_expires TIMESTAMP NULL,
                last_login TIMESTAMP NULL,
                preferences JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_username (username),
                INDEX idx_role (role)
            ) ENGINE=InnoDB`,

            // Enhanced Systems table
            `CREATE TABLE systems (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                system_name VARCHAR(255) NOT NULL,
                system_type ENUM('media_bed', 'nft', 'dwc', 'hybrid') DEFAULT 'media_bed',
                fish_tank_count INT DEFAULT 1,
                grow_bed_count INT DEFAULT 1,
                description TEXT,
                location VARCHAR(255),
                setup_date DATE,
                total_water_volume DECIMAL(10,2),
                system_status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
                configuration JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                INDEX idx_user_system (user_id, system_name),
                INDEX idx_status (system_status)
            ) ENGINE=InnoDB`,

            // Enhanced Fish Tanks with detailed tracking
            `CREATE TABLE fish_tanks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                tank_number INT NOT NULL,
                size_m3 DECIMAL(8,2),
                volume_liters DECIMAL(10,2) NOT NULL,
                fish_type VARCHAR(100),
                max_stocking_density DECIMAL(8,2),
                current_fish_count INT DEFAULT 0,
                water_temperature_target DECIMAL(4,1),
                ph_target DECIMAL(3,1),
                position_x DECIMAL(10,2),
                position_y DECIMAL(10,2),
                tank_status ENUM('active', 'maintenance', 'empty') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                UNIQUE KEY unique_tank_per_system (system_id, tank_number),
                INDEX idx_system_tank (system_id, tank_number),
                INDEX idx_fish_type (fish_type)
            ) ENGINE=InnoDB`,

            // Enhanced Grow Beds with position tracking
            `CREATE TABLE grow_beds (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                bed_number INT NOT NULL,
                bed_type ENUM('media_bed', 'nft', 'dwc') DEFAULT 'media_bed',
                area_m2 DECIMAL(8,2) NOT NULL,
                depth_cm DECIMAL(6,2),
                media_type VARCHAR(100),
                planting_density INT,
                position_x DECIMAL(10,2),
                position_y DECIMAL(10,2),
                width_cm DECIMAL(6,2),
                length_cm DECIMAL(6,2),
                bed_status ENUM('active', 'maintenance', 'empty') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                UNIQUE KEY unique_bed_per_system (system_id, bed_number),
                INDEX idx_system_bed (system_id, bed_number),
                INDEX idx_bed_type (bed_type)
            ) ENGINE=InnoDB`,

            // Enhanced Water Quality with additional parameters
            `CREATE TABLE water_quality (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                fish_tank_id INT,
                temperature DECIMAL(4,1),
                ph DECIMAL(3,1),
                dissolved_oxygen DECIMAL(4,1),
                ammonia DECIMAL(6,3),
                nitrite DECIMAL(6,3),
                nitrate DECIMAL(6,2),
                humidity DECIMAL(5,2),
                salinity DECIMAL(6,3),
                tds DECIMAL(8,2),
                conductivity DECIMAL(8,2),
                measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_source ENUM('manual', 'sensor', 'calculated') DEFAULT 'manual',
                sensor_id VARCHAR(100),
                quality_score DECIMAL(3,1),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                FOREIGN KEY (fish_tank_id) REFERENCES fish_tanks (id) ON DELETE SET NULL,
                INDEX idx_system_date (system_id, measurement_date DESC),
                INDEX idx_tank_date (fish_tank_id, measurement_date DESC),
                INDEX idx_data_source (data_source)
            ) ENGINE=InnoDB`,

            // New Plant Growth table with batch tracking
            `CREATE TABLE plant_growth (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                grow_bed_id INT NOT NULL,
                crop_variety VARCHAR(255) NOT NULL,
                plant_count INT NOT NULL DEFAULT 0,
                plants_harvested INT DEFAULT 0,
                date_planted DATE,
                date_harvested DATE,
                harvest_weight_g DECIMAL(8,2),
                harvest_quality ENUM('excellent', 'good', 'fair', 'poor'),
                growth_stage ENUM('seed', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'harvest') DEFAULT 'seed',
                batch_id VARCHAR(100),
                planting_density DECIMAL(6,2),
                expected_harvest_date DATE,
                actual_yield_kg DECIMAL(8,3),
                market_value DECIMAL(8,2),
                notes TEXT,
                event_date TIMESTAMP NOT NULL,
                user_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE CASCADE,
                INDEX idx_system_bed_date (system_id, grow_bed_id, event_date DESC),
                INDEX idx_crop_variety (crop_variety),
                INDEX idx_batch (batch_id),
                INDEX idx_growth_stage (growth_stage)
            ) ENGINE=InnoDB`,

            // Enhanced Fish Events with detailed tracking
            `CREATE TABLE fish_events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                fish_tank_id INT NOT NULL,
                event_type ENUM('stock', 'feed', 'health_check', 'mortality', 'harvest', 'treatment', 'water_change') NOT NULL,
                fish_count INT DEFAULT 0,
                individual_weight_g DECIMAL(8,2),
                total_weight_kg DECIMAL(8,3),
                feed_amount_g DECIMAL(8,2),
                feed_type VARCHAR(100),
                mortality_count INT DEFAULT 0,
                mortality_cause VARCHAR(255),
                health_score ENUM('excellent', 'good', 'fair', 'poor', 'critical'),
                behavioral_notes TEXT,
                treatment_type VARCHAR(255),
                water_change_percentage DECIMAL(5,2),
                temperature_c DECIMAL(4,1),
                event_date TIMESTAMP NOT NULL,
                batch_id VARCHAR(100) DEFAULT NULL,
                user_id VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                FOREIGN KEY (fish_tank_id) REFERENCES fish_tanks (id) ON DELETE CASCADE,
                INDEX idx_fish_events_system_tank_date (system_id, fish_tank_id, event_date DESC),
                INDEX idx_event_type (event_type),
                INDEX idx_batch (batch_id)
            ) ENGINE=InnoDB`,

            // New Nutrient Readings table (migrated from water_quality)
            `CREATE TABLE nutrient_readings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                grow_bed_id INT,
                nutrient_type ENUM('nitrogen', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'iron', 'zinc', 'boron', 'manganese') NOT NULL,
                concentration_ppm DECIMAL(8,3) NOT NULL,
                optimal_range_min DECIMAL(8,3),
                optimal_range_max DECIMAL(8,3),
                measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_source ENUM('manual', 'sensor', 'laboratory') DEFAULT 'manual',
                sensor_id VARCHAR(100),
                analysis_method VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE SET NULL,
                INDEX idx_system_nutrient_date (system_id, nutrient_type, measurement_date DESC),
                INDEX idx_bed_nutrient (grow_bed_id, nutrient_type)
            ) ENGINE=InnoDB`,

            // New Custom Crops table
            `CREATE TABLE custom_crops (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                crop_name VARCHAR(255) NOT NULL,
                scientific_name VARCHAR(255),
                crop_family VARCHAR(100),
                growth_cycle_days INT,
                optimal_ph_min DECIMAL(3,1),
                optimal_ph_max DECIMAL(3,1),
                optimal_temp_min_c DECIMAL(4,1),
                optimal_temp_max_c DECIMAL(4,1),
                nutrient_requirements JSON,
                planting_density_per_m2 INT,
                expected_yield_kg_m2 DECIMAL(6,3),
                market_price_per_kg DECIMAL(8,2),
                growing_notes TEXT,
                is_public BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                INDEX idx_user_crop (user_id, crop_name),
                INDEX idx_public_crops (is_public, crop_name)
            ) ENGINE=InnoDB`,

            // New Plant Allocations table
            `CREATE TABLE plant_allocations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                grow_bed_id INT NOT NULL,
                crop_variety VARCHAR(255) NOT NULL,
                allocated_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
                allocated_area_m2 DECIMAL(8,2),
                planned_plant_count INT,
                allocation_date DATE DEFAULT (CURRENT_DATE),
                active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                FOREIGN KEY (grow_bed_id) REFERENCES grow_beds (id) ON DELETE CASCADE,
                INDEX idx_system_bed_active (system_id, grow_bed_id, active),
                INDEX idx_crop_allocation (crop_variety, active)
            ) ENGINE=InnoDB`,

            // New Sensor Configuration table
            `CREATE TABLE sensor_config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                sensor_name VARCHAR(255) NOT NULL,
                sensor_type ENUM('temperature', 'ph', 'dissolved_oxygen', 'ammonia', 'nitrite', 'nitrate', 'humidity', 'salinity', 'tds', 'flow_rate') NOT NULL,
                thingsboard_device_id VARCHAR(255),
                telemetry_key VARCHAR(255),
                location_description VARCHAR(255),
                calibration_offset DECIMAL(10,6) DEFAULT 0,
                calibration_multiplier DECIMAL(10,6) DEFAULT 1,
                alert_threshold_min DECIMAL(10,3),
                alert_threshold_max DECIMAL(10,3),
                is_active BOOLEAN DEFAULT TRUE,
                last_reading_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                INDEX idx_system_sensor (system_id, sensor_type),
                INDEX idx_thingsboard (thingsboard_device_id, telemetry_key)
            ) ENGINE=InnoDB`,

            // New Spray Programmes table
            `CREATE TABLE spray_programmes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                system_id INT NOT NULL,
                programme_name VARCHAR(255) NOT NULL,
                programme_type ENUM('insecticide', 'fungicide', 'foliar_feed', 'growth_regulator') NOT NULL,
                target_crop VARCHAR(255),
                active_ingredient VARCHAR(255),
                concentration_percentage DECIMAL(6,3),
                application_rate_ml_per_l DECIMAL(8,3),
                spray_frequency_days INT,
                total_applications INT,
                applications_completed INT DEFAULT 0,
                start_date DATE,
                next_application_date DATE,
                programme_status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
                safety_interval_days INT,
                application_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
                INDEX idx_system_programme (system_id, programme_status),
                INDEX idx_next_application (next_application_date, programme_status)
            ) ENGINE=InnoDB`
        ];

        // Create each table
        for (const [index, tableSQL] of newTables.entries()) {
            try {
                await this.connection.execute(tableSQL);
                
                // Extract table name from SQL
                const tableName = tableSQL.match(/CREATE TABLE (\w+)/)[1];
                await this.log(`Created table ${index + 1}/${newTables.length}: ${tableName}`);
            } catch (error) {
                await this.log(`Failed to create table: ${error.message}`, 'error');
                throw error;
            }
        }

        await this.log(`Successfully created ${newTables.length} new tables`);
    }

    async createIndexes() {
        await this.log('Creating additional performance indexes...');

        const additionalIndexes = [
            'CREATE INDEX idx_plant_growth_harvest_date ON plant_growth(date_harvested, harvest_weight_g)',
            'CREATE INDEX idx_fish_events_feeding ON fish_events(event_type, event_date) WHERE event_type = "feed"',
            'CREATE INDEX idx_water_quality_recent ON water_quality(measurement_date DESC, system_id)',
            'CREATE INDEX idx_systems_active ON systems(system_status, user_id) WHERE system_status = "active"'
        ];

        for (const indexSQL of additionalIndexes) {
            try {
                await this.connection.execute(indexSQL);
                await this.log(`Created index: ${indexSQL.substring(0, 50)}...`);
            } catch (error) {
                // Indexes might fail if they already exist, log but continue
                await this.log(`Index creation skipped: ${error.message}`, 'warn');
            }
        }
    }

    async createTriggers() {
        await this.log('Creating database triggers for data consistency...');

        const triggers = [
            // Update fish count in tanks when fish events occur
            `CREATE TRIGGER update_fish_count_after_event
            AFTER INSERT ON fish_events
            FOR EACH ROW
            BEGIN
                IF NEW.event_type = 'stock' THEN
                    UPDATE fish_tanks 
                    SET current_fish_count = current_fish_count + NEW.fish_count
                    WHERE id = NEW.fish_tank_id;
                ELSEIF NEW.event_type = 'mortality' OR NEW.event_type = 'harvest' THEN
                    UPDATE fish_tanks 
                    SET current_fish_count = GREATEST(0, current_fish_count - COALESCE(NEW.mortality_count, NEW.fish_count, 0))
                    WHERE id = NEW.fish_tank_id;
                END IF;
            END`,

            // Update system water volume when tanks are modified
            `CREATE TRIGGER update_system_water_volume
            AFTER INSERT ON fish_tanks
            FOR EACH ROW
            BEGIN
                UPDATE systems 
                SET total_water_volume = (
                    SELECT SUM(volume_liters) 
                    FROM fish_tanks 
                    WHERE system_id = NEW.system_id
                )
                WHERE id = NEW.system_id;
            END`,

            // Auto-update spray programme status
            `CREATE TRIGGER update_spray_programme_status
            BEFORE UPDATE ON spray_programmes
            FOR EACH ROW
            BEGIN
                IF NEW.applications_completed >= NEW.total_applications THEN
                    SET NEW.programme_status = 'completed';
                END IF;
            END`
        ];

        for (const triggerSQL of triggers) {
            try {
                await this.connection.execute(triggerSQL);
                const triggerName = triggerSQL.match(/CREATE TRIGGER (\w+)/)[1];
                await this.log(`Created trigger: ${triggerName}`);
            } catch (error) {
                await this.log(`Trigger creation failed: ${error.message}`, 'warn');
            }
        }
    }

    async insertDefaultData() {
        await this.log('Inserting default system data...');

        // Insert default admin user if none exists
        const [existingUsers] = await this.connection.execute('SELECT COUNT(*) as count FROM users');
        
        if (existingUsers[0].count === 0) {
            await this.connection.execute(`
                INSERT INTO users (username, email, first_name, last_name, password_hash, role, email_verified)
                VALUES ('admin', 'admin@afraponix.com', 'Admin', 'User', '$2b$10$defaulthash', 'admin', TRUE)
            `);
            await this.log('Created default admin user');
        }

        // Insert common crop varieties
        const commonCrops = [
            ['lettuce', 'Lactuca sativa', 'Asteraceae', 45, 6.0, 7.0, 15.0, 25.0],
            ['basil', 'Ocimum basilicum', 'Lamiaceae', 60, 5.5, 6.5, 18.0, 28.0],
            ['tomato', 'Solanum lycopersicum', 'Solanaceae', 120, 6.0, 6.8, 18.0, 30.0],
            ['cucumber', 'Cucumis sativus', 'Cucurbitaceae', 65, 5.5, 6.0, 20.0, 30.0],
            ['spinach', 'Spinacia oleracea', 'Amaranthaceae', 40, 6.0, 7.0, 10.0, 20.0]
        ];

        const [adminUser] = await this.connection.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        
        for (const [name, scientific, family, cycle, phMin, phMax, tempMin, tempMax] of commonCrops) {
            await this.connection.execute(`
                INSERT IGNORE INTO custom_crops 
                (user_id, crop_name, scientific_name, crop_family, growth_cycle_days, 
                 optimal_ph_min, optimal_ph_max, optimal_temp_min_c, optimal_temp_max_c, is_public)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            `, [adminUser[0].id, name, scientific, family, cycle, phMin, phMax, tempMin, tempMax]);
        }

        await this.log('Inserted default crop varieties');
    }

    async saveMigrationLog() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const logDir = path.join(__dirname, 'logs');
        const logFile = path.join(logDir, `migration-${timestamp}.log`);

        await fs.mkdir(logDir, { recursive: true });
        await fs.writeFile(logFile, this.migrationLog.join('\n'), 'utf8');

        console.log(`\n📋 Migration log saved: ${logFile}`);
        return logFile;
    }

    async runMigration() {
        const startTime = Date.now();
        
        try {
            await this.log('🚀 Starting Afraponix Go complete database migration...');
            
            // Step 1: Create backup
            await this.log('Step 1/7: Creating database backup...');
            const backup = await this.createBackup();

            // Step 2: Connect to database
            await this.log('Step 2/7: Connecting to database...');
            await this.connect();

            // Step 3: Drop all existing tables
            await this.log('Step 3/7: Dropping all existing tables...');
            await this.dropAllTables();

            // Step 4: Create new structure
            await this.log('Step 4/7: Creating new enhanced database structure...');
            await this.createNewStructure();

            // Step 5: Create indexes
            await this.log('Step 5/7: Creating performance indexes...');
            await this.createIndexes();

            // Step 6: Create triggers
            await this.log('Step 6/7: Creating database triggers...');
            await this.createTriggers();

            // Step 7: Insert default data
            await this.log('Step 7/7: Inserting default data...');
            await this.insertDefaultData();

            const duration = Math.round((Date.now() - startTime) / 1000);
            await this.log(`✅ Migration completed successfully in ${duration} seconds`);

            return {
                success: true,
                duration,
                backup,
                logFile: await this.saveMigrationLog()
            };

        } catch (error) {
            await this.log(`❌ Migration failed: ${error.message}`, 'error');
            await this.log(error.stack, 'error');
            
            return {
                success: false,
                error: error.message,
                logFile: await this.saveMigrationLog()
            };
        } finally {
            await this.disconnect();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migration = new AfraponixMigration();
    
    migration.runMigration()
        .then((result) => {
            if (result.success) {
                console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
                console.log(`⏱️  Duration: ${result.duration} seconds`);
                console.log(`💾 Backup: ${result.backup.sqlBackup}`);
                console.log(`📋 Log: ${result.logFile}`);
                console.log('\n🔄 The database has been completely replaced with the new structure.');
                console.log('🚀 You can now start the new Afraponix Go application!');
            } else {
                console.log('\n💥 MIGRATION FAILED!');
                console.log(`❌ Error: ${result.error}`);
                console.log(`📋 Log: ${result.logFile}`);
                console.log('\n🔄 Check the backup files to restore if needed.');
            }
        })
        .catch((error) => {
            console.error('\n💥 Migration crashed:', error);
            process.exit(1);
        });
}

module.exports = { AfraponixMigration };