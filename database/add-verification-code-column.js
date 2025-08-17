// This script adds the verification_code column to existing production databases
// Run this on production after deployment to fix the registration 500 error

const { getDatabase } = require('./init-mariadb');

async function addVerificationCodeColumn() {
    try {
        const pool = getDatabase();
        
        // Check if verification_code column exists
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'verification_code'
        `);
        
        if (columns.length === 0) {
            console.log('📋 Adding verification_code column to users table...');
            
            // Add the verification_code column
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN verification_code VARCHAR(6) NULL 
                AFTER verification_token_expiry
            `);
            
            console.log('✅ verification_code column added successfully');
        } else {
            console.log('✅ verification_code column already exists');
        }
        
        // Also check and add any other missing columns for completeness
        const requiredColumns = [
            { name: 'verification_token', type: 'VARCHAR(255)' },
            { name: 'verification_token_expiry', type: 'TIMESTAMP NULL' },
            { name: 'verification_code', type: 'VARCHAR(6)' },
            { name: 'reset_token', type: 'VARCHAR(255)' },
            { name: 'reset_token_expiry', type: 'TIMESTAMP NULL' }
        ];
        
        for (const column of requiredColumns) {
            const [existingColumn] = await pool.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME = ?
            `, [column.name]);
            
            if (existingColumn.length === 0) {
                console.log(`📋 Adding ${column.name} column...`);
                await pool.execute(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type} NULL`);
                console.log(`✅ ${column.name} column added`);
            }
        }
        
        console.log('🎉 Database schema verification complete');
        
    } catch (error) {
        console.error('❌ Error adding verification_code column:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    addVerificationCodeColumn()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addVerificationCodeColumn };