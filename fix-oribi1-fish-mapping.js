const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function fixOribi1FishMapping() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        const systemId = 'system_1754627714554'; // Oribi 1
        
        // First, update the fish_events to map to the correct tank ID
        // Tank 1 (display) = Tank ID 11 (database)
        console.log('Updating fish_events to use correct tank ID...');
        await connection.execute(
            `UPDATE fish_events 
             SET fish_tank_id = 11 
             WHERE system_id = ? AND fish_tank_id = 1`,
            [systemId]
        );
        console.log('Updated fish_events for tank 1 -> tank 11');
        
        // Now update the current_fish_count in fish_tanks
        console.log('\nUpdating current_fish_count for tank 11...');
        await connection.execute(
            `UPDATE fish_tanks 
             SET current_fish_count = 1000 
             WHERE id = 11 AND system_id = ?`,
            [systemId]
        );
        console.log('Updated tank 11 to have 1000 fish');
        
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

fixOribi1FishMapping();