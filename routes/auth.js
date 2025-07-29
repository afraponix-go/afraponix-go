const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { sendPasswordResetEmail } = require('../utils/emailService');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

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
            db.close();
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
                [username, email, passwordHash], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        db.close();

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.id, username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: result.id, username, email }
        });

    } catch (error) {
        db.close();
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDatabase();

    try {
        // Find user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        db.close();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (error) {
        db.close();
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to authenticate user' });
    }
});

// Verify token (for checking if user is still authenticated)
router.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const db = getDatabase();
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        db.close();

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDatabase();

    try {
        // Find user by email
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            db.close();
            // Don't reveal if email exists or not for security
            return res.json({ 
                message: 'If an account with that email exists, we\'ve sent a password reset link.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store reset token in database
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', 
                [resetToken, resetTokenExpiry.toISOString(), user.id], 
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.username);
        
        if (emailResult.success) {
            res.json({ 
                message: 'If an account with that email exists, we\'ve sent a password reset link.' 
            });
        } else {
            console.error('Failed to send password reset email:', emailResult.error);
            res.status(500).json({ error: 'Failed to send password reset email' });
        }

    } catch (error) {
        db.close();
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = getDatabase();

    try {
        // Find user with valid reset token
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?', 
                [token, new Date().toISOString()], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            db.close();
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update password and clear reset token
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', 
                [passwordHash, user.id], 
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        db.close();
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;