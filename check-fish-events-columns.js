const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function checkColumns() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM fish_events"
        );
        console.log('=== fish_events table columns ===');
        columns.forEach(col => {
            console.log(`${col.Field} - ${col.Type}`);
        });
        
        // Also check a sample of data
        const [sample] = await connection.execute(
            "SELECT * FROM fish_events LIMIT 5"
        );
        console.log('\n=== Sample fish_events data ===');
        console.log(sample);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkColumns();