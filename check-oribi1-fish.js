const mysql = require('mysql2/promise');
const { currentConfig } = require('./database/config');

async function checkOribi1Fish() {
    const connection = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: 'dev123',  // Using the known password
        database: currentConfig.database
    });
    
    try {
        // Get Oribi 1 system ID
        const [systems] = await connection.execute(
            "SELECT id, system_name FROM systems WHERE system_name LIKE '%Oribi%1%' OR system_name = 'Oribi 1'"
        );
        console.log('\n=== Oribi 1 System ===');
        console.log(systems);
        
        if (systems.length === 0) {
            console.log('No Oribi 1 system found');
            return;
        }
        
        const systemId = systems[0].id;
        console.log(`\nOribi 1 System ID: ${systemId}`);
        
        // Get fish tanks for Oribi 1
        const [tanks] = await connection.execute(
            `SELECT id, tank_number, current_fish_count 
             FROM fish_tanks 
             WHERE system_id = ? 
             ORDER BY tank_number`,
            [systemId]
        );
        console.log('\n=== Fish Tanks for Oribi 1 ===');
        console.log('Tank ID | Tank Number | Current Fish Count');
        tanks.forEach(tank => {
            console.log(`${tank.id} | ${tank.tank_number} | ${tank.current_fish_count}`);
        });
        
        // Get fish events to calculate actual counts
        const [events] = await connection.execute(
            `SELECT 
                fish_tank_id,
                event_type,
                SUM(count_change) as total_fish
             FROM fish_events 
             WHERE system_id = ? 
             GROUP BY fish_tank_id, event_type`,
            [systemId]
        );
        
        console.log('\n=== Fish Events Summary ===');
        const tankSummary = {};
        events.forEach(event => {
            if (!tankSummary[event.fish_tank_id]) {
                tankSummary[event.fish_tank_id] = { added: 0, mortality: 0 };
            }
            if (event.event_type === 'add_fish') {
                tankSummary[event.fish_tank_id].added = event.total_fish;
            } else if (event.event_type === 'mortality') {
                tankSummary[event.fish_tank_id].mortality = Math.abs(event.total_fish);
            }
        });
        
        console.log('Tank ID | Added | Mortality | Actual Count');
        Object.keys(tankSummary).forEach(tankId => {
            const summary = tankSummary[tankId];
            const actual = summary.added - summary.mortality;
            console.log(`${tankId} | ${summary.added} | ${summary.mortality} | ${actual}`);
        });
        
        // Check if we need to update current_fish_count
        console.log('\n=== Updates Needed ===');
        const updates = [];
        tanks.forEach(tank => {
            const summary = tankSummary[tank.id] || { added: 0, mortality: 0 };
            const actual = summary.added - summary.mortality;
            if (tank.current_fish_count !== actual) {
                updates.push({ tank_id: tank.id, current: tank.current_fish_count, should_be: actual });
                console.log(`Tank ${tank.id}: Current=${tank.current_fish_count}, Should be=${actual}`);
            }
        });
        
        if (updates.length > 0) {
            console.log('\nUpdating fish counts...');
            for (const update of updates) {
                await connection.execute(
                    'UPDATE fish_tanks SET current_fish_count = ? WHERE id = ?',
                    [update.should_be, update.tank_id]
                );
                console.log(`Updated tank ${update.tank_id}: ${update.current} -> ${update.should_be}`);
            }
            console.log('Fish counts updated successfully!');
        } else {
            console.log('No updates needed - counts are already correct');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkOribi1Fish();