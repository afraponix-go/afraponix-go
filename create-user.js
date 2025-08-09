const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database/init-mariadb');

async function createUser(username, email, password, firstName, lastName, role = 'basic') {
    let connection;
    
    try {
        connection = await getDatabase();
        
        // Check if user already exists
        const [existingRows] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?', 
            [username, email]
        );
        const existingUser = existingRows[0];
        
        if (existingUser) {
            console.log(`❌ User with username '${username}' or email '${email}' already exists`);
            await connection.end();
            return;
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, first_name, last_name, password_hash, user_role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [username, email, firstName, lastName, passwordHash, role, 'basic']
        );
        
        console.log(`✅ User created successfully!`);
        console.log(`👤 ID: ${result.insertId}`);
        console.log(`📧 Email: ${email}`);
        console.log(`👨‍💼 Username: ${username}`);
        console.log(`🔐 Password: ${password}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🏷️ Role: ${role}`);
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        if (connection) await connection.end();
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