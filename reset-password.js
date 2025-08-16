const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database/init-mariadb');

async function resetPassword(email, newPassword) {
    let connection;
    
    try {
        connection = await getDatabase();
        
        // Check if user exists
        const [userRows] = await connection.execute(
            'SELECT id, username, email FROM users WHERE email = ?', 
            [email]
        );
        const user = userRows[0];
        
        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            await connection.end();
            return;
        }
        
        console.log(`✅ Found user: ${user.username} (${user.email})`);
        
        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?', 
            [passwordHash, user.id]
        );
        
        console.log(`🔑 Password reset successfully for ${user.username}`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 New password: [HIDDEN FOR SECURITY]`);
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        if (connection) await connection.end();
    }
}

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log('Usage: node reset-password.js <email> <new-password>');
    console.log('Example: node reset-password.js justdabug@gmail.com newpassword123');
    process.exit(1);
}

resetPassword(email, newPassword);