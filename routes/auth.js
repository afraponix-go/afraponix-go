const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();

// Helper function to format JavaScript dates for MySQL
const formatDateForMySQL = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Register new user
router.post('/register', async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
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

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Create user with unverified email
        const result = await new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, email, first_name, last_name, password_hash, email_verified, verification_token, verification_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [username, email, firstName, lastName, passwordHash, 0, verificationToken, formatDateForMySQL(verificationTokenExpiry)], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        db.close();

        // Send verification email
        const emailResult = await sendVerificationEmail(email, verificationToken, username);
        
        if (!emailResult.success) {
            console.error('Failed to send verification email:', emailResult.error);
            // Note: We still create the user but log the email failure
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            needsVerification: true,
            user: { 
                id: result.id, 
                username, 
                email, 
                firstName, 
                lastName,
                userRole: 'basic',
                subscriptionStatus: 'basic',
                emailVerified: false
            }
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

        // Check if email is verified
        if (!user.email_verified) {
            db.close();
            return res.status(403).json({ 
                error: 'Email not verified',
                message: 'Please check your email and verify your account before logging in.',
                needsVerification: true,
                email: user.email
            });
        }

        db.close();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username,
                userRole: user.user_role || 'basic',
                subscriptionStatus: user.subscription_status || 'basic'
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                userRole: user.user_role || 'basic',
                subscriptionStatus: user.subscription_status || 'basic'
            }
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
            db.get('SELECT id, username, email, user_role, subscription_status FROM users WHERE id = ?', [decoded.userId], (err, row) => {
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
                [resetToken, formatDateForMySQL(resetTokenExpiry), user.id], 
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

// Verify email with token
router.post('/verify-email', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }

    const db = getDatabase();

    try {
        // Find user with valid verification token
        
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE verification_token = ? AND verification_token_expiry > ?', 
                [token, formatDateForMySQL(new Date())], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            db.close();
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Mark email as verified and clear verification token
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expiry = NULL WHERE id = ?', 
                [user.id], 
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();

        // Generate JWT token for automatic login after verification
        const authToken = jwt.sign(
            { 
                userId: user.id, 
                username: user.username,
                userRole: user.user_role || 'basic',
                subscriptionStatus: user.subscription_status || 'basic'
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ 
            message: 'Email verified successfully! You can now log in to your account.',
            verified: true,
            token: authToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                userRole: user.user_role || 'basic',
                subscriptionStatus: user.subscription_status || 'basic',
                emailVerified: true
            }
        });

    } catch (error) {
        db.close();
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
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
                message: 'If an account with that email exists and is unverified, we\'ve sent a new verification link.' 
            });
        }

        // Check if already verified
        if (user.email_verified) {
            db.close();
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Update verification token in database
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE id = ?', 
                [verificationToken, formatDateForMySQL(verificationTokenExpiry), user.id], 
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        db.close();

        // Send verification email
        console.log('📧 Attempting to send verification email to:', email);
        const emailResult = await sendVerificationEmail(email, verificationToken, user.username);
        console.log('📧 Email result:', emailResult);
        
        if (emailResult.success) {
            console.log('✅ Verification email sent successfully to:', email);
            res.json({ 
                message: 'If an account with that email exists and is unverified, we\'ve sent a new verification link.' 
            });
        } else {
            console.error('❌ Failed to send verification email:', emailResult.error);
            res.status(500).json({ error: 'Failed to send verification email' });
        }

    } catch (error) {
        db.close();
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to process verification request' });
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
                [token, formatDateForMySQL(new Date())], (err, row) => {
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