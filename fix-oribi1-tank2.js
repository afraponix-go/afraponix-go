const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function fixOribi1Tank2() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        const systemId = 'system_1754627714554'; // Oribi 1
        
        // First, update the fish_events record from tank 2 to tank 12
        console.log('Updating fish_events to use correct tank ID for tank 2...');
        await connection.execute(
            `UPDATE fish_events 
             SET fish_tank_id = 12 
             WHERE system_id = ? AND fish_tank_id = 2`,
            [systemId]
        );
        console.log('Updated fish_events for tank 2 -> tank 12');
        
        // Now update the current_fish_count in fish_tanks for tank 12
        console.log('\nUpdating current_fish_count for tank 12...');
        await connection.execute(
            `UPDATE fish_tanks 
             SET current_fish_count = 500 
             WHERE id = 12 AND system_id = ?`,
            [systemId]
        );
        console.log('Updated tank 12 to have 500 fish');
        
        // Verify the update
        const [tanks] = await connection.execute(
            `SELECT id, tank_number, current_fish_count 
             FROM fish_tanks 
             WHERE system_id = ? 
             ORDER BY tank_number`,
            [systemId]
        );
        
        console.log('\n=== Updated Fish Tanks for Oribi 1 ===');
        console.log('Tank ID | Tank Number | Current Fish Count');
        tanks.forEach(tank => {
            console.log(`${tank.id} | ${tank.tank_number} | ${tank.current_fish_count}`);
        });
        
        console.log('\nFix completed successfully!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixOribi1Tank2();