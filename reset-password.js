const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database/init');

async function resetPassword(email, newPassword) {
    const db = getDatabase();
    
    try {
        // Check if user exists
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, email FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            console.log(`❌ User with email ${email} not found`);
            db.close();
            return;
        }
        
        console.log(`✅ Found user: ${user.username} (${user.email})`);
        
        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log(`🔑 Password reset successfully for ${user.username}`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 New password: ${newPassword}`);
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        db.close();
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