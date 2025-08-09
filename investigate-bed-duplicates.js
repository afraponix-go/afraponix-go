#!/usr/bin/env node

require('dotenv').config({ path: '.env.dev' });
const { getDatabase } = require('./database/init-mariadb');

async function investigateBedDuplicates() {
    console.log('🔍 Investigating bed 1 duplicate display in Oribi 7...');
    
    try {
        const connection = await getDatabase();
        
        // First, find the Oribi 7 system ID
        const [systems] = await connection.execute(
            "SELECT id, system_name FROM systems WHERE system_name LIKE '%oribi%7%' OR system_name LIKE '%Oribi%7%'"
        );
        
        if (systems.length === 0) {
            console.log('❌ Could not find Oribi 7 system');
            await connection.end();
            return;
        }
        
        const systemId = systems[0].id;
        const systemName = systems[0].system_name;
        console.log(`\n📊 Found system: ${systemName} (ID: ${systemId})`);
        
        // Check grow beds for this system
        console.log('\n🛏️  Grow beds for this system:');
        console.log('==========================================');
        
        const [growBeds] = await connection.execute(
            'SELECT * FROM grow_beds WHERE system_id = ? ORDER BY id',
            [systemId]
        );
        
        growBeds.forEach(bed => {
            console.log(`Bed ${bed.id}: ${bed.bed_name || 'Unnamed'} - ${bed.bed_type || 'No type'}`);
        });
        
        // Check plant allocations for bed 1 specifically
        console.log('\n🌱 Plant allocations for bed 1:');
        console.log('==========================================');
        
        const [allocations] = await connection.execute(`
            SELECT pa.*, gb.bed_name 
            FROM plant_allocations pa
            JOIN grow_beds gb ON pa.grow_bed_id = gb.id
            WHERE pa.system_id = ? AND gb.bed_name LIKE '%bed%1%'
            ORDER BY pa.id
        `, [systemId]);
        
        if (allocations.length > 0) {
            allocations.forEach(alloc => {
                console.log(`Allocation ${alloc.id}: ${alloc.crop_type} - ${alloc.percentage_allocated}% (Status: ${alloc.status || 'active'})`);
            });
        } else {
            console.log('No allocations found for bed 1');
        }
        
        // Check plant history for bed 1
        console.log('\n📈 Plant history for bed 1:');
        console.log('==========================================');
        
        const [plantHistory] = await connection.execute(`
            SELECT ph.*, gb.bed_name
            FROM plant_history ph
            JOIN grow_beds gb ON ph.grow_bed_id = gb.id
            WHERE ph.system_id = ? AND gb.bed_name LIKE '%bed%1%'
            ORDER BY ph.date_planted DESC, ph.id DESC
            LIMIT 10
        `, [systemId]);
        
        if (plantHistory.length > 0) {
            plantHistory.forEach(entry => {
                const plantedDate = entry.date_planted ? new Date(entry.date_planted).toLocaleDateString() : 'Unknown';
                const harvestedDate = entry.date_harvested ? new Date(entry.date_harvested).toLocaleDateString() : 'Not harvested';
                console.log(`Entry ${entry.id}: ${entry.crop_type} - ${entry.plants_planted} planted on ${plantedDate}, harvested: ${harvestedDate}`);
            });
        } else {
            console.log('No plant history found for bed 1');
        }
        
        // Check for potential duplicates in the query that generates batch display
        console.log('\n🔍 Checking for duplicate batch data:');
        console.log('==========================================');
        
        const [batchData] = await connection.execute(`
            SELECT 
                gb.id as bed_id,
                gb.bed_name,
                ph.crop_type,
                ph.plants_planted,
                ph.date_planted,
                ph.date_harvested,
                COUNT(*) as count
            FROM plant_history ph
            JOIN grow_beds gb ON ph.grow_bed_id = gb.id
            WHERE ph.system_id = ? AND gb.bed_name LIKE '%bed%1%'
            GROUP BY gb.id, gb.bed_name, ph.crop_type, ph.plants_planted, ph.date_planted, ph.date_harvested
            HAVING COUNT(*) > 1
        `, [systemId]);
        
        if (batchData.length > 0) {
            console.log('⚠️  Found duplicate batch entries:');
            batchData.forEach(batch => {
                console.log(`${batch.bed_name}: ${batch.crop_type} (${batch.count} duplicates)`);
            });
        } else {
            console.log('✅ No duplicate batch entries found');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
    }
    
    process.exit(0);
}

investigateBedDuplicates();