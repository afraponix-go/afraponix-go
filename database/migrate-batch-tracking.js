const { getDatabase } = require('./init-mariadb');

/**
 * Migration script to add batch tracking fields to existing plant_growth table
 * Run this script on existing databases to add the new batch tracking columns
 */

async function migrateBatchTracking() {
    console.log('🔄 Starting batch tracking migration...');
    
    if (!process.env.DB_HOST) {
        console.log('❌ MariaDB environment variables not found - skipping migration');
        console.log('This migration is only needed for production MariaDB databases');
        return;
    }

    let connection;
    
    try {
        connection = await getDatabase();
        console.log('📊 Checking if batch tracking columns already exist...');
        
        // Check if batch_id column exists
        const [batchIdResults] = await connection.execute("SHOW COLUMNS FROM plant_growth LIKE 'batch_id'");
        const batchIdExists = batchIdResults.length > 0;
        
        if (batchIdExists) {
            console.log('✅ Batch tracking columns already exist - no migration needed');
            await connection.end();
            return;
        }
        
        console.log('🔧 Adding batch tracking columns to plant_growth table...');
        
        // Add new columns for batch tracking
        const alterQueries = [
            "ALTER TABLE plant_growth ADD COLUMN batch_id VARCHAR(50) AFTER growth_stage",
            "ALTER TABLE plant_growth ADD COLUMN seed_variety VARCHAR(100) AFTER batch_id", 
            "ALTER TABLE plant_growth ADD COLUMN batch_created_date VARCHAR(20) AFTER seed_variety",
            "ALTER TABLE plant_growth ADD COLUMN days_to_harvest INT AFTER batch_created_date"
        ];
        
        for (const query of alterQueries) {
            await connection.execute(query);
            console.log('✅ Added column:', query.match(/ADD COLUMN (\w+)/)[1]);
        }
        
        // Add indexes for better performance
        console.log('📈 Adding indexes for batch tracking...');
        const indexQueries = [
            "CREATE INDEX idx_batch_id ON plant_growth (batch_id)",
            "CREATE INDEX idx_batch_date ON plant_growth (batch_created_date)"
        ];
        
        for (const query of indexQueries) {
            try {
                await connection.execute(query);
                console.log('✅ Added index:', query.match(/INDEX (\w+)/)[1]);
            } catch (error) {
                // Indexes might already exist, continue
                console.log('⚠️  Index might already exist:', error.message);
            }
        }
        
        console.log('🎉 Batch tracking migration completed successfully!');
        console.log('📊 New columns added:');
        console.log('   - batch_id: Unique identifier for each plant batch');
        console.log('   - seed_variety: Specific variety/cultivar of the plant');
        console.log('   - batch_created_date: Date when the batch was first planted');
        console.log('   - days_to_harvest: Expected days from planting to harvest');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateBatchTracking().catch(console.error);
}

module.exports = { migrateBatchTracking };