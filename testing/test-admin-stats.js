const { getDatabase } = require('../database/init-mariadb');
require('dotenv').config();

async function testAdminStats() {
    try {
        const pool = getDatabase();
        
        console.log('🔍 Testing admin stats query...');
        
        // Test the same queries used in the admin stats endpoint
        
        // User counts by role
        const [userStats] = await pool.execute(`
            SELECT 
                user_role,
                subscription_status,
                COUNT(*) as count
            FROM users 
            GROUP BY user_role, subscription_status
        `);
        
        console.log('👥 User stats:', userStats);

        // Total systems
        const [systemRows] = await pool.execute('SELECT COUNT(*) as count FROM systems');
        const systemCount = systemRows[0].count;
        
        console.log('🏠 Total systems:', systemCount);

        // Recent registrations (last 30 days)
        const [recentRows] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recentUsers = recentRows[0].count;
        
        console.log('📅 Recent registrations (30 days):', recentUsers);

        // Build stats object like the API does
        const stats = {
            users: userStats,
            totalSystems: systemCount,
            recentRegistrations: recentUsers
        };
        
        console.log('\n📊 Complete stats object:');
        console.log(JSON.stringify(stats, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database error:', error);
        process.exit(1);
    }
}

testAdminStats();