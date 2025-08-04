const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load SMTP configuration from environment variables or config file
const loadSmtpConfig = () => {
    // Try environment variables first (production)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const baseUrl = process.env.BASE_URL || 'https://go.aquaponics.online';
        console.log('📧 Using SMTP configuration from environment variables');
        return {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            from: {
                name: process.env.SMTP_FROM_NAME || 'Afraponix Go',
                address: process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER
            },
            resetUrl: `${baseUrl}/reset-password`,
            verifyUrl: `${baseUrl}/verify-email`
        };
    }
    
    // Fallback to config file (development)
    try {
        console.log('📧 Attempting to load SMTP configuration from config file');
        const configPath = path.join(__dirname, '..', 'config', 'smtp.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        console.log('📧 Using SMTP configuration from config file');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Failed to load SMTP configuration:', error);
        throw new Error('SMTP configuration not found. Please set environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
};

// Create transporter
const createTransporter = () => {
    const config = loadSmtpConfig();
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.auth.user,
            pass: config.auth.pass
        }
    });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, username) => {
    try {
        const config = loadSmtpConfig();
        const transporter = createTransporter();
        
        const resetLink = `${config.resetUrl}?token=${resetToken}`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset - Afraponix Go</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .container {
                        background: white;
                        border-radius: 12px;
                        padding: 40px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: #334e9d;
                        margin-bottom: 10px;
                    }
                    .reset-btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #334e9d 0%, #7baaee 100%);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .warning {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 6px;
                        padding: 15px;
                        margin: 20px 0;
                        color: #856404;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">🌿 Afraponix Go</div>
                        <h2>Password Reset Request</h2>
                    </div>
                    
                    <p>Hi ${username},</p>
                    
                    <p>We received a request to reset your password for your Afraponix Go account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="reset-btn">Reset My Password</a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">${resetLink}</p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This link will expire in 1 hour for security reasons</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password will remain unchanged until you create a new one</li>
                        </ul>
                    </div>
                    
                    <p>If you're having trouble accessing your account or didn't request this reset, please contact support.</p>
                    
                    <div class="footer">
                        <p>This email was sent from Afraponix Go aquaponics management system.</p>
                        <p>© ${new Date().getFullYear()} Afraponix Go. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"${config.from.name}" <${config.from.address}>`,
            to: email,
            subject: '🔐 Reset Your Afraponix Go Password',
            html: htmlContent,
            text: `Hi ${username},

We received a request to reset your password for your Afraponix Go account.

Reset your password: ${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this reset, please ignore this email.

Best regards,
Afraponix Go Team`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', result.messageId);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return { success: false, error: error.message };
    }
};

// Send account verification email
const sendVerificationEmail = async (email, verificationToken, username) => {
    try {
        const config = loadSmtpConfig();
        const transporter = createTransporter();
        
        const verificationLink = `${config.verifyUrl || config.resetUrl.replace('reset-password', 'verify-email')}?token=${verificationToken}`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Afraponix Go</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .container {
                        background: white;
                        border-radius: 12px;
                        padding: 40px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: #334e9d;
                        margin-bottom: 10px;
                    }
                    .verify-btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #34C759 0%, #4CD964 100%);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">🌿 Afraponix Go</div>
                        <h2>Welcome to Afraponix Go!</h2>
                    </div>
                    
                    <p>Hi ${username},</p>
                    
                    <p>Thank you for joining Afraponix Go! To complete your registration and start managing your aquaponics system, please verify your email address:</p>
                    
                    <div style="text-align: center;">
                        <a href="${verificationLink}" class="verify-btn">Verify Email Address</a>
                    </div>
                    
                    <p>Once verified, you'll be able to:</p>
                    <ul>
                        <li>🔥 Monitor water quality parameters</li>
                        <li>🐟 Track fish health and growth</li>
                        <li>🌱 Manage plant growth and harvests</li>
                        <li>🧮 Use aquaponics calculators</li>
                        <li>📊 View dashboard analytics</li>
                    </ul>
                    
                    <div class="footer">
                        <p>Welcome to the future of aquaponics management!</p>
                        <p>© ${new Date().getFullYear()} Afraponix Go. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"${config.from.name}" <${config.from.address}>`,
            to: email,
            subject: '🌿 Welcome to Afraponix Go - Verify Your Email',
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', result.messageId);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendVerificationEmail,
    loadSmtpConfig
};