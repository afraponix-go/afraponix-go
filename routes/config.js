const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../database/init-mariadb');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get SMTP configuration
router.get('/smtp', async (req, res) => {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'smtp.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Don't send the password in the response for security
        const safeConfig = {
            ...config,
            auth: {
                user: config.auth.user,
                pass: '***hidden***'
            }
        };
        
        res.json(safeConfig);
    } catch (error) {
        console.error('Failed to load SMTP configuration:', error);
        res.status(500).json({ error: 'Failed to load SMTP configuration' });
    }
});

// Update SMTP configuration
router.put('/smtp', async (req, res) => {
    try {
        const { host, port, secure, auth, from, resetUrl } = req.body;
        
        // Validate required fields
        if (!host || !port || !auth?.user || !from?.address || !resetUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields: host, port, auth.user, from.address, resetUrl' 
            });
        }
        
        const configPath = path.join(__dirname, '..', 'config', 'smtp.json');
        
        // Load current config to preserve password if not provided
        let currentConfig = {};
        try {
            const currentConfigData = await fs.readFile(configPath, 'utf8');
            currentConfig = JSON.parse(currentConfigData);
        } catch (error) {
            // File doesn't exist or is invalid, will create new one
        }
        
        // Prepare new configuration
        const newConfig = {
            host,
            port: parseInt(port),
            secure: Boolean(secure),
            auth: {
                user: auth.user,
                pass: auth.pass === '***hidden***' ? currentConfig.auth?.pass : auth.pass
            },
            from: {
                name: from.name || 'Afraponix Go',
                address: from.address
            },
            resetUrl
        };
        
        // Validate the password is provided
        if (!newConfig.auth.pass) {
            return res.status(400).json({ 
                error: 'SMTP password is required' 
            });
        }
        
        // Save the configuration
        await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
        
        res.json({ message: 'SMTP configuration updated successfully' });
        
    } catch (error) {
        console.error('Failed to save SMTP configuration:', error);
        res.status(500).json({ error: 'Failed to save SMTP configuration' });
    }
});

// Test SMTP configuration
router.post('/smtp/test', async (req, res) => {
    try {
        const { sendPasswordResetEmail } = require('../utils/emailService');
        
        // Send a test email to the user's own email
        const testResult = await sendPasswordResetEmail(
            req.user.email, 
            'test-token-12345', 
            req.user.username
        );
        
        if (testResult.success) {
            res.json({ 
                message: 'Test email sent successfully! Check your inbox.',
                messageId: testResult.messageId
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send test email: ' + testResult.error 
            });
        }
        
    } catch (error) {
        console.error('SMTP test failed:', error);
        res.status(500).json({ error: 'SMTP test failed: ' + error.message });
    }
});

// Send email endpoint for nutrient plans and other system emails
router.post('/send-email', async (req, res) => {
    try {
        const { subject, html, type } = req.body;
        
        // Get user email from the database using the authenticated user ID
        const pool = getDatabase();
        const [userRows] = await pool.execute(
            'SELECT email FROM users WHERE id = ?', 
            [req.user.userId]
        );        
        if (userRows.length === 0) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }
        
        const userEmail = userRows[0].email;
        
        // Validate required fields
        if (!subject || !html) {
            return res.status(400).json({ 
                error: 'Missing required fields: subject, html' 
            });
        }
        
        // Load SMTP configuration
        const configPath = path.join(__dirname, '..', 'config', 'smtp.json');
        let smtpConfig;
        try {
            const configData = await fs.readFile(configPath, 'utf8');
            smtpConfig = JSON.parse(configData);
        } catch (error) {
            return res.status(500).json({ 
                error: 'SMTP not configured. Please configure SMTP settings first.' 
            });
        }
        
        // Create nodemailer transporter
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
                user: smtpConfig.auth.user,
                pass: smtpConfig.auth.pass
            }
        });
        
        // Email options
        const mailOptions = {
            from: `"${smtpConfig.from.name}" <${smtpConfig.from.address}>`,
            to: userEmail,
            subject: subject,
            html: html
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email sent successfully:', info.messageId);
        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: info.messageId,
            type: type || 'general'
        });
        
    } catch (error) {
        console.error('Failed to send email:', error);
        res.status(500).json({ 
            error: 'Failed to send email: ' + error.message 
        });
    }
});

module.exports = router;