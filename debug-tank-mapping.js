const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function debugTankMapping() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        const systemId = 'system_1754627714554'; // Oribi 1
        
        console.log('=== Tank Mapping Debug for Oribi 1 ===\n');
        
        // Show actual tank structure
        const [tanks] = await connection.execute(
            'SELECT id, tank_number, current_fish_count FROM fish_tanks WHERE system_id = ? ORDER BY tank_number',
            [systemId]
        );
        
        console.log('Actual Tank Structure:');
        console.log('Tank Number | Tank ID | Current Count');
        tanks.forEach(tank => {
            console.log(`${tank.tank_number} | ${tank.id} | ${tank.current_fish_count}`);
        });
        
        // Show recent fish events that went to wrong tank IDs
        const [wrongEvents] = await connection.execute(
            `SELECT * FROM fish_events 
             WHERE system_id = ? AND fish_tank_id IN (3) 
             ORDER BY created_at DESC`,
            [systemId]
        );
        
        console.log('\n=== Fish Events with Wrong Tank ID (3) ===');
        wrongEvents.forEach(event => {
            console.log(`${event.created_at}: Tank ID ${event.fish_tank_id}, Count: ${event.count_change}, Type: ${event.event_type}`);
        });
        
        // Fix the events - move from tank_id 3 to tank_id 13
        console.log('\n=== Fixing Tank ID Mapping ===');
        
        await connection.execute(
            'UPDATE fish_events SET fish_tank_id = 13 WHERE system_id = ? AND fish_tank_id = 3',
            [systemId]
        );
        console.log('Updated fish_events: tank_id 3 → 13');
        
        // Calculate total fish added to tank 13
        const [events] = await connection.execute(
            `SELECT SUM(count_change) as total FROM fish_events 
             WHERE system_id = ? AND fish_tank_id = 13 AND event_type = 'add_fish'`,
            [systemId]
        );
        
        const totalFish = events[0].total || 0;
        console.log(`Total fish added to tank 13: ${totalFish}`);
        
        // Update the current_fish_count
        await connection.execute(
            'UPDATE fish_tanks SET current_fish_count = ? WHERE id = 13 AND system_id = ?',
            [totalFish, systemId]
        );
        console.log(`Updated fish_tanks: tank 13 current_fish_count = ${totalFish}`);
        
        // Verify the fix
        const [updatedTanks] = await connection.execute(
            'SELECT id, tank_number, current_fish_count FROM fish_tanks WHERE system_id = ? ORDER BY tank_number',
            [systemId]
        );
        
        console.log('\n=== Updated Tank States ===');
        console.log('Tank Number | Tank ID | Current Count');
        updatedTanks.forEach(tank => {
            console.log(`${tank.tank_number} | ${tank.id} | ${tank.current_fish_count}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debugTankMapping();