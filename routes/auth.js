const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../database/init-mariadb');
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Check if user already exists
        const [existingUserRows] = await pool.execute('SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
        
        if (existingUserRows.length > 0) {            const existingUser = existingUserRows[0];
            
            if (existingUser.email === email) {
                return res.status(400).json({ 
                    error: 'Email already exists',
                    field: 'email',
                    message: 'An account with this email address already exists. Please sign in instead.'
                });
            } else if (existingUser.username === username) {
                return res.status(400).json({ 
                    error: 'Username already exists',
                    field: 'username',
                    message: 'This username is already taken. Please choose a different one.'
                });
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Create user with unverified email
        const [result] = await pool.execute('INSERT INTO users (username, email, first_name, last_name, password_hash, email_verified, verification_token, verification_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [username, email, firstName, lastName, passwordHash, 0, verificationToken, formatDateForMySQL(verificationTokenExpiry)]);
        
        const userId = result.insertId;
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
                id: userId, 
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();

        // Find user
        const [userRows] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?', 
            [username, username]
        );

        if (userRows.length === 0) {            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userRows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.email_verified) {            return res.status(403).json({ 
                error: 'Email not verified',
                message: 'Please check your email and verify your account before logging in.',
                needsVerification: true,
                email: user.email
            });
        }
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

    // Using connection pool - no manual connection management

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const pool = getDatabase();
        const [userRows] = await pool.execute(
            'SELECT id, username, email, user_role, subscription_status FROM users WHERE id = ?', 
            [decoded.userId]
        );
        if (userRows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ user: userRows[0] });

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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Find user by email
        const [userRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = userRows[0];

        if (!user) {            // Don't reveal if email exists or not for security
            return res.json({ 
                message: 'If an account with that email exists, we\'ve sent a password reset link.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store reset token in database
        await pool.execute('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', 
            [resetToken, formatDateForMySQL(resetTokenExpiry), user.id]);
        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.username);
        
        if (emailResult.success) {
            res.json({ 
                message: 'If an account with that email exists, we\'ve sent a password reset link.' 
            });
        } else {
            console.error('Failed to send password reset email:', emailResult.error);
            // Don't expose internal errors to the client for security
            if (emailResult.error && emailResult.error.includes('Email service not configured')) {
                res.json({ 
                    message: 'Password reset functionality is temporarily unavailable. Please contact support.',
                    temporaryIssue: true
                });
            } else {
                res.json({ 
                    message: 'If an account with that email exists, we\'ve sent a password reset link.' 
                });
            }
        }

    } catch (error) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Find user with valid verification token
        const [userRows] = await pool.execute('SELECT * FROM users WHERE verification_token = ? AND verification_token_expiry > ?', 
            [token, formatDateForMySQL(new Date())]);
        const user = userRows[0];

        if (!user) {            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Mark email as verified and clear verification token
        await pool.execute('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expiry = NULL WHERE id = ?', 
            [user.id]);
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Find user by email
        const [userRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = userRows[0];

        if (!user) {            // Don't reveal if email exists or not for security
            return res.json({ 
                message: 'If an account with that email exists and is unverified, we\'ve sent a new verification link.' 
            });
        }

        // Check if already verified
        if (user.email_verified) {            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Update verification token in database
        await pool.execute('UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE id = ?', 
            [verificationToken, formatDateForMySQL(verificationTokenExpiry), user.id]);
        // Send verification email
        const emailResult = await sendVerificationEmail(email, verificationToken, user.username);
        
        if (emailResult.success) {
            res.json({ 
                message: 'If an account with that email exists and is unverified, we\'ve sent a new verification link.' 
            });
        } else {
            console.error('Failed to send verification email:', emailResult.error);
            // Don't expose internal errors to the client for security
            if (emailResult.error && emailResult.error.includes('Email service not configured')) {
                res.json({ 
                    message: 'Email verification is temporarily unavailable. You can still use the application, but some features may be limited.',
                    temporaryIssue: true
                });
            } else {
                res.json({ 
                    message: 'If an account with that email exists and is unverified, we\'ve sent a new verification link.' 
                });
            }
        }

    } catch (error) {
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

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Find user with valid reset token
        const [userRows] = await pool.execute('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?', 
            [token, formatDateForMySQL(new Date())]);
        const user = userRows[0];

        if (!user) {            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update password and clear reset token
        await pool.execute('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', 
            [passwordHash, user.id]);
        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Check username availability
router.post('/check-username', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    // Using connection pool - no manual connection management

    try {
        const pool = getDatabase();
        
        // Check if username exists
        const [userRows] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);        
        const isAvailable = userRows.length === 0;
        
        res.json({ 
            available: isAvailable,
            username: username
        });

    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ error: 'Failed to check username availability' });
    }
});

module.exports = router;