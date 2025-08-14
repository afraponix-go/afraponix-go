const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function checkRecentEvents() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        // Check recent fish events for Oribi 1
        const [events] = await connection.execute(
            `SELECT * FROM fish_events 
             WHERE system_id = 'system_1754627714554' 
             ORDER BY created_at DESC 
             LIMIT 10`
        );
        
        console.log('=== Recent Fish Events for Oribi 1 ===');
        events.forEach(event => {
            console.log(`${event.created_at}: Tank ${event.fish_tank_id}, Type: ${event.event_type}, Count: ${event.count_change}`);
        });
        
        // Check current tank states
        const [tanks] = await connection.execute(
            `SELECT id, tank_number, current_fish_count 
             FROM fish_tanks 
             WHERE system_id = 'system_1754627714554' 
             ORDER BY tank_number`
        );
        
        console.log('\n=== Current Tank States ===');
        tanks.forEach(tank => {
            console.log(`Tank ${tank.tank_number} (ID: ${tank.id}): ${tank.current_fish_count} fish`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkRecentEvents();