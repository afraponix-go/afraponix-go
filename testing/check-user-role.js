const { getDatabase } = require('./database/connection');
require('dotenv').config();

async function checkUserRole() {
    try {
        const pool = getDatabase();
        const [userRows] = await pool.execute(
            'SELECT id, username, email, user_role, subscription_status FROM users LIMIT 5'
        );
        
        console.log('🔍 Users in database:');
        userRows.forEach((user, index) => {
            console.log(`User ${index + 1}:`, {
                id: user.id,
                username: user.username,
                email: user.email,
                user_role: user.user_role,
                subscription_status: user.subscription_status
            });
        });
        
        // Check specifically for admin users
        const [adminUsers] = await pool.execute(
            'SELECT id, username, email, user_role FROM users WHERE user_role = ?',
            ['admin']
        );
        
        console.log('\n🔐 Admin users:');
        adminUsers.forEach((user, index) => {
            console.log(`Admin ${index + 1}:`, {
                id: user.id,
                username: user.username,
                email: user.email,
                user_role: user.user_role
            });
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
}

checkUserRole();