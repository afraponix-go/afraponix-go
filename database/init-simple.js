// Simple database initialization for production MariaDB deployment
const mariadb = require('./init-mariadb');

// For production, we only need MariaDB support
module.exports = {
    initializeDatabase: mariadb.initializeDatabase,
    getDatabase: mariadb.getDatabase,
    useMariaDB: mariadb.useMariaDB
};