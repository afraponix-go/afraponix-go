const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database/init');

async function createUser(username, email, password, firstName, lastName, role = 'basic') {
    const db = getDatabase();
    
    try {
        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            console.log(`❌ User with username '${username}' or email '${email}' already exists`);
            db.close();
            return;
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, email, first_name, last_name, password_hash, user_role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [username, email, firstName, lastName, passwordHash, role, 'basic'], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
        
        console.log(`✅ User created successfully!`);
        console.log(`👤 ID: ${result.id}`);
        console.log(`📧 Email: ${email}`);
        console.log(`👨‍💼 Username: ${username}`);
        console.log(`🔐 Password: ${password}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🏷️ Role: ${role}`);
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        db.close();
    }
}

// Get command line arguments
const username = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];
const firstName = process.argv[5];
const lastName = process.argv[6];
const role = process.argv[7] || 'basic';

if (!username || !email || !password || !firstName || !lastName) {
    console.log('Usage: node create-user.js <username> <email> <password> <firstName> <lastName> [role]');
    console.log('Example: node create-user.js justdabug justdabug@gmail.com password123 Justin Hess admin');
    process.exit(1);
}

createUser(username, email, password, firstName, lastName, role);