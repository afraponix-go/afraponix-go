const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');
const { currentConfig } = require('./config');

class DatabaseAdapter {
    constructor() {
        this.config = currentConfig;
        this.connection = null;
        this.pool = null;
    }

    async connect() {
        if (this.config.type === 'sqlite') {
            const dbPath = path.join(__dirname, '..', this.config.database);
            this.connection = new sqlite3.Database(dbPath);
            return this.connection;
        } else if (this.config.type === 'mariadb') {
            this.pool = mysql.createPool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                connectionLimit: this.config.connectionLimit,
                acquireTimeout: this.config.acquireTimeout,
                timeout: this.config.timeout,
                waitForConnections: true,
                queueLimit: 0
            });
            return this.pool;
        }
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }

    async query(sql, params = []) {
        if (this.config.type === 'sqlite') {
            return new Promise((resolve, reject) => {
                this.connection.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        } else if (this.config.type === 'mariadb') {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        }
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }

    async run(sql, params = []) {
        if (this.config.type === 'sqlite') {
            return new Promise((resolve, reject) => {
                this.connection.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        } else if (this.config.type === 'mariadb') {
            const [result] = await this.pool.execute(sql, params);
            return { lastID: result.insertId, changes: result.affectedRows };
        }
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }

    async get(sql, params = []) {
        if (this.config.type === 'sqlite') {
            return new Promise((resolve, reject) => {
                this.connection.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } else if (this.config.type === 'mariadb') {
            const [rows] = await this.pool.execute(sql, params);
            return rows[0] || null;
        }
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }

    async close() {
        if (this.config.type === 'sqlite' && this.connection) {
            return new Promise((resolve) => {
                this.connection.close(resolve);
            });
        } else if (this.config.type === 'mariadb' && this.pool) {
            await this.pool.end();
        }
    }

    // Helper method to convert SQLite syntax to MariaDB
    convertSQL(sql, type = null) {
        if (this.config.type === 'mariadb') {
            // Convert SQLite specific syntax to MariaDB
            let convertedSQL = sql
                .replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT')
                .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INT AUTO_INCREMENT PRIMARY KEY')
                .replace(/TEXT/g, 'VARCHAR(1000)')
                .replace(/REAL/g, 'DECIMAL(10,2)')
                .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
                .replace(/IF NOT EXISTS/g, 'IF NOT EXISTS');

            // Handle specific table creation differences
            if (type === 'create_table') {
                // Add ENGINE=InnoDB and charset
                if (!convertedSQL.includes('ENGINE=')) {
                    convertedSQL = convertedSQL.replace(/\)$/, ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
                }
            }

            return convertedSQL;
        }
        return sql;
    }

    // Get SQL for creating tables based on database type
    getCreateTableSQL() {
        const baseSQL = {
            users: `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    reset_token TEXT,
                    reset_token_expiry DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `,
            systems: `
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
            `,
            water_quality: `
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
            `,
            fish_health: `
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
            `,
            plant_growth: `
                CREATE TABLE IF NOT EXISTS plant_growth (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id TEXT NOT NULL,
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
                    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
                )
            `,
            grow_beds: `
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
            `,
            operations: `
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
            `
        };

        // Convert SQL for MariaDB if needed
        const convertedSQL = {};
        for (const [table, sql] of Object.entries(baseSQL)) {
            convertedSQL[table] = this.convertSQL(sql, 'create_table');
        }

        return convertedSQL;
    }
}

module.exports = DatabaseAdapter;