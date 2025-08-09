const { getDatabase } = require('./init-mariadb');

async function migrateSensorMapping() {
    console.log('🔄 Running sensor mapping migration...');
    
    let connection;
    
    try {
        connection = await getDatabase();
        
        // Check if columns already exist (MariaDB syntax)
        const [tableInfo] = await connection.execute("DESCRIBE sensor_configs");
        
        const existingColumns = tableInfo.map(col => col.Field);
        const columnsToAdd = [
            { name: 'mapped_table', type: 'VARCHAR(100)' },
            { name: 'mapped_field', type: 'VARCHAR(100)' }, 
            { name: 'data_transform', type: 'VARCHAR(255)' }
        ];
        
        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Adding column ${column.name} to sensor_configs table...`);
                await connection.execute(`ALTER TABLE sensor_configs ADD COLUMN ${column.name} ${column.type}`);
                console.log(`✅ Added column ${column.name}`);
            } else {
                console.log(`⏭️  Column ${column.name} already exists, skipping`);
            }
        }
        
        await connection.end();
        console.log('✅ Sensor mapping migration completed successfully');
        
    } catch (error) {
        if (connection) await connection.end();
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateSensorMapping().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

module.exports = { migrateSensorMapping };