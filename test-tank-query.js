const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function testTankQuery() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',
        database: currentConfig.database
    });
    
    try {
        const systemId = 'system_1754627714554'; // Oribi 1
        const fish_tank_id = 3; // What the frontend sends
        
        console.log(`Testing query for system_id='${systemId}' and fish_tank_id=${fish_tank_id}`);
        console.log('Query: SELECT id FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)');
        console.log(`Parameters: ['${systemId}', ${fish_tank_id}, ${fish_tank_id}]`);
        
        const [rows] = await connection.execute(
            'SELECT id, tank_number FROM fish_tanks WHERE system_id = ? AND (id = ? OR tank_number = ?)',
            [systemId, fish_tank_id, fish_tank_id]
        );
        
        console.log('\nResult:');
        console.log(rows);
        
        if (rows.length > 0) {
            console.log(`\nMapping successful: tank_number ${fish_tank_id} → tank_id ${rows[0].id}`);
        } else {
            console.log('\nNo matching tank found!');
        }
        
        // Also show all tanks for this system
        const [allTanks] = await connection.execute(
            'SELECT id, tank_number FROM fish_tanks WHERE system_id = ? ORDER BY tank_number',
            [systemId]
        );
        
        console.log('\nAll tanks for this system:');
        allTanks.forEach(tank => {
            console.log(`Tank number ${tank.tank_number} → Tank ID ${tank.id}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

testTankQuery();