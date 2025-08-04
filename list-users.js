const { getDatabase } = require('./database/init');

async function listUsers() {
    const db = getDatabase();
    
    try {
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, username, email, first_name, last_name, user_role, subscription_status, created_at FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${users.length} users in database:`);
        console.log('='.repeat(80));
        
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(user => {
                console.log(`👤 ID: ${user.id}`);
                console.log(`   Username: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'}`);
                console.log(`   Role: ${user.user_role || 'basic'}`);
                console.log(`   Subscription: ${user.subscription_status || 'basic'}`);
                console.log(`   Created: ${user.created_at}`);
                console.log('-'.repeat(40));
            });
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error listing users:', error);
        db.close();
    }
}

listUsers();