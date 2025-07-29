// Database configuration
const databaseConfig = {
    development: {
        type: 'sqlite',
        database: process.env.DB_NAME || 'aquaponics.db'
    },
    production: {
        type: 'mariadb',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'aquaponics',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aquaponics',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
    }
};

const currentEnvironment = process.env.NODE_ENV || 'development';
const currentConfig = databaseConfig[currentEnvironment];

module.exports = {
    databaseConfig,
    currentConfig,
    currentEnvironment
};