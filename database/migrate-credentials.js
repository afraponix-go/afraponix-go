const { getDatabase } = require('./init-mariadb');

async function migrateCredentials() {
    console.log('🔄 Running credentials table migration...');
    
    let connection;
    
    try {
        connection = await getDatabase();
        
        // Create credentials table for secure storage
        await connection.execute(`CREATE TABLE IF NOT EXISTS system_credentials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            system_id VARCHAR(255) NOT NULL,
            service_name VARCHAR(100) NOT NULL,
            api_url VARCHAR(255),
            username_encrypted TEXT,
            password_encrypted TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
            UNIQUE KEY unique_system_service (system_id, service_name)
        )`);
        
        console.log('✅ Created system_credentials table');
        
        await connection.end();
        console.log('✅ Credentials migration completed successfully');
        
    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateCredentials().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

module.exports = { migrateCredentials };