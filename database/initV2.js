const DatabaseAdapter = require('./adapter');
const { currentEnvironment } = require('./config');

let dbAdapter = null;

async function initializeDatabase() {
    try {
        dbAdapter = new DatabaseAdapter();
        await dbAdapter.connect();
        
        console.log(`📦 Connected to ${dbAdapter.config.type.toUpperCase()} database (${currentEnvironment})`);
        
        // Create tables
        const createTableSQL = dbAdapter.getCreateTableSQL();
        
        for (const [tableName, sql] of Object.entries(createTableSQL)) {
            try {
                await dbAdapter.run(sql);
                console.log(`✅ Table '${tableName}' created/verified`);
            } catch (error) {
                console.error(`❌ Error creating table '${tableName}':`, error.message);
                throw error;
            }
        }
        
        console.log('✅ Database tables initialized');
        return dbAdapter;
        
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}

function getDatabase() {
    if (!dbAdapter) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return dbAdapter;
}

async function closeDatabase() {
    if (dbAdapter) {
        await dbAdapter.close();
        dbAdapter = null;
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};