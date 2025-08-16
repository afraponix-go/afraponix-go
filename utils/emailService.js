const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load SMTP configuration from environment variables or config file
const loadSmtpConfig = () => {
    // Try environment variables first (production)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const baseUrl = process.env.BASE_URL || 'https://go.aquaponics.online';
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
        const configPath = path.join(__dirname, '..', 'config', 'smtp.json');
        const configData = fs.readFileSync(configPath, 'utf8');
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
        let config;
        try {
            config = loadSmtpConfig();
        } catch (configError) {
            console.error('SMTP configuration not available:', configError.message);
            return { 
                success: false, 
                error: 'Email service not configured. Please contact support.' 
            };
        }
        
        const transporter = createTransporter();
        
        const resetLink = `${config.resetUrl}?token=${resetToken}`;
        
        const currentDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset - Afraponix Go</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                        line-height: 1.6;
                        color: #0f172a;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8fafb;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 35px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 25px;
                    }
                    .logo {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        font-size: 28px;
                        font-weight: 700;
                        color: #0051b1;
                        margin-bottom: 15px;
                    }
                    .logo-icon {
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(135deg, #0051b1 0%, #7baaee 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .icon {
                        width: 20px;
                        height: 20px;
                        display: inline-block;
                        vertical-align: middle;
                        margin-right: 8px;
                    }
                    .greeting {
                        background: linear-gradient(135deg, #e6f0fb 0%, #b3d1f0 100%);
                        border-radius: 12px;
                        padding: 25px;
                        margin: 25px 0;
                        border-left: 4px solid #0051b1;
                    }
                    .reset-btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #0051b1 0%, #7baaee 100%);
                        color: white !important;
                        padding: 18px 36px;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 16px;
                        margin: 30px 0;
                        text-align: center;
                        box-shadow: 0 4px 14px rgba(0, 81, 177, 0.3);
                        transition: transform 0.2s ease;
                    }
                    .reset-btn:hover {
                        transform: translateY(-2px);
                    }
                    .security-notice {
                        background: #fef3c7;
                        border: 1px solid #fcd34d;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 25px 0;
                        border-left: 4px solid #f59e0b;
                    }
                    .security-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 12px;
                        color: #92400e;
                        font-weight: 600;
                    }
                    .link-box {
                        background: #f8fafb;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 15px;
                        margin: 20px 0;
                        word-break: break-all;
                        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
                        font-size: 14px;
                        color: #475569;
                    }
                    .request-details {
                        background: #f1f5f9;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 25px 0;
                        border-left: 4px solid #0051b1;
                    }
                    .detail-item {
                        display: flex;
                        align-items: center;
                        margin: 8px 0;
                        color: #475569;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 25px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 14px;
                    }
                    .social-links {
                        margin: 20px 0;
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                    }
                    .social-links a {
                        display: flex;
                        align-items: center;
                        color: #0051b1;
                        text-decoration: none;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">
                            <div class="logo-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21A2 2 0 0 0 5 23H19A2 2 0 0 0 21 21V9M19 21H5V3H13V9H19V21Z"/>
                                </svg>
                            </div>
                            Afraponix Go
                        </div>
                        <h2 style="color: #0f172a; margin: 0;">Password Reset Request</h2>
                    </div>
                    
                    <div class="greeting">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <svg class="icon" viewBox="0 0 24 24" fill="#0051b1">
                                <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                            </svg>
                            <span style="font-weight: 600; color: #0051b1; font-size: 18px;">Hello ${username}!</span>
                        </div>
                        <p style="margin: 0; color: #475569;">We're here to help you regain access to your aquaponics management system.</p>
                    </div>
                    
                    <p style="margin: 20px 0;">We received a request to reset your password for your Afraponix Go account. Click the secure button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${resetLink}" class="reset-btn">
                            <svg style="width: 18px; height: 18px; margin-right: 8px; vertical-align: middle;" viewBox="0 0 24 24" fill="white">
                                <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                            </svg>
                            Reset My Password
                        </a>
                    </div>
                    
                    <p style="margin: 20px 0; color: #64748b;">Having trouble with the button? Copy and paste this secure link into your browser:</p>
                    <div class="link-box">${resetLink}</div>
                    
                    <div class="security-notice">
                        <div class="security-header">
                            <svg class="icon" viewBox="0 0 24 24" fill="#92400e">
                                <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                            </svg>
                            Security Information
                        </div>
                        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                            <li>This secure link expires in <strong>1 hour</strong> for your protection</li>
                            <li>If you didn't request this reset, please ignore this email safely</li>
                            <li>Your current password remains active until you create a new one</li>
                            <li>Only you have received this personalized reset link</li>
                        </ul>
                    </div>
                    
                    <div class="request-details">
                        <div style="margin-bottom: 15px; font-weight: 600; color: #0051b1;">Request Details</div>
                        <div class="detail-item">
                            <svg class="icon" viewBox="0 0 24 24" fill="#64748b">
                                <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                            </svg>
                            Account: ${email}
                        </div>
                        <div class="detail-item">
                            <svg class="icon" viewBox="0 0 24 24" fill="#64748b">
                                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                            </svg>
                            Requested: ${currentDate}
                        </div>
                        <div class="detail-item">
                            <svg class="icon" viewBox="0 0 24 24" fill="#64748b">
                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                            </svg>
                            Expires: 1 hour from request time
                        </div>
                    </div>
                    
                    <p style="margin: 25px 0;">Need assistance? Our aquaponics experts are here to help you get back to managing your systems. Contact support if you're experiencing any issues.</p>
                    
                    <div class="footer">
                        <div class="social-links">
                            <a href="#">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M14,17H12V14.5C12,13.9 11.6,13.5 11,13.5C10.4,13.5 10,13.9 10,14.5V17H8V10H10V10.8C10.3,10.4 10.8,10.1 11.5,10.1C12.6,10.1 13.5,11 13.5,12.1V17H14Z"/>
                                </svg>
                                Documentation
                            </a>
                            <a href="#">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3Z"/>
                                </svg>
                                Support
                            </a>
                            <a href="#">
                                <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                                </svg>
                                Community
                            </a>
                        </div>
                        <p style="margin: 15px 0 5px 0;">This email was sent from your Afraponix Go aquaponics management system.</p>
                        <p style="margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Afraponix Go. All rights reserved. | Cultivating sustainable futures through smart aquaponics.</p>
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
            text: `AFRAPONIX GO - PASSWORD RESET REQUEST

Hello ${username}!

We received a request to reset your password for your Afraponix Go aquaponics management account. We're here to help you regain access to your system.

SECURE RESET LINK:
${resetLink}

SECURITY INFORMATION:
- This secure link expires in 1 hour for your protection
- If you didn't request this reset, please ignore this email safely  
- Your current password remains active until you create a new one
- Only you have received this personalized reset link

REQUEST DETAILS:
Account: ${email}
Requested: ${currentDate}
Expires: 1 hour from request time

NEXT STEPS:
1. Click the secure reset link above
2. Create a new strong password
3. Sign in with your new credentials

Need assistance? Our aquaponics experts are here to help you get back to managing your systems. Contact support if you're experiencing any issues.

SUPPORT RESOURCES:
- Documentation: Visit our help center
- Support: Contact our technical team  
- Community: Join our user community

This email was sent from your Afraponix Go aquaponics management system.

Best regards,
Afraponix Go Team
Cultivating sustainable futures through smart aquaponics

© ${new Date().getFullYear()} Afraponix Go. All rights reserved.`
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
        let config;
        try {
            config = loadSmtpConfig();
        } catch (configError) {
            console.error('SMTP configuration not available:', configError.message);
            return { 
                success: false, 
                error: 'Email service not configured. Please contact support.' 
            };
        }
        
        const transporter = createTransporter();
        
        const verificationLink = `${config.verifyUrl || config.resetUrl.replace('reset-password', 'verify-email')}?token=${verificationToken}`;
        
        const joinDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Afraponix Go - Verify Your Account</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                        line-height: 1.6;
                        color: #0f172a;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8fafb;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 35px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 25px;
                    }
                    .logo {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        font-size: 28px;
                        font-weight: 700;
                        color: #0051b1;
                        margin-bottom: 15px;
                    }
                    .logo-icon {
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(135deg, #80FB7B 0%, #8DFBCC 100%);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .logo-icon::before {
                        content: "🌱";
                        font-size: 18px;
                    }
                    .welcome-banner {
                        background: linear-gradient(135deg, #e8fee7 0%, #e8fef5 100%);
                        border-radius: 12px;
                        padding: 25px;
                        margin: 25px 0;
                        border-left: 4px solid #60da5b;
                        text-align: center;
                    }
                    .verify-btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #60da5b 0%, #80FB7B 100%);
                        color: white;
                        padding: 18px 36px;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 16px;
                        margin: 25px 0;
                        text-align: center;
                        box-shadow: 0 4px 14px rgba(96, 218, 91, 0.3);
                        transition: transform 0.2s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .verify-btn:hover {
                        transform: translateY(-2px);
                    }
                    .features-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        margin: 30px 0;
                        padding: 25px;
                        background: #f8fafb;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                    }
                    .feature-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 15px;
                        font-weight: 500;
                    }
                    .feature-icon {
                        width: 40px;
                        height: 40px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        flex-shrink: 0;
                    }
                    .feature-icon.water { background: linear-gradient(135deg, #7baaee 0%, #b3d1f0 100%); }
                    .feature-icon.fish { background: linear-gradient(135deg, #0051b1 0%, #3379c9 100%); }
                    .feature-icon.plant { background: linear-gradient(135deg, #80FB7B 0%, #a0fc9d 100%); }
                    .feature-icon.tools { background: linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%); }
                    .feature-icon.analytics { background: linear-gradient(135deg, #8DFBCC 0%, #a5fcd6 100%); }
                    .feature-icon.community { background: linear-gradient(135deg, #60da5b 0%, #4fc58e 100%); }
                    .next-steps {
                        background: #f1f5f9;
                        border-radius: 12px;
                        padding: 25px;
                        margin: 25px 0;
                        border-left: 4px solid #0051b1;
                    }
                    .account-details {
                        background: #f8fafb;
                        border-radius: 8px;
                        padding: 20px;
                        margin: 20px 0;
                        font-size: 14px;
                        color: #475569;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 25px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 14px;
                    }
                    .social-links {
                        margin: 20px 0;
                    }
                    .social-links a {
                        display: inline-block;
                        margin: 0 10px;
                        color: #0051b1;
                        text-decoration: none;
                        font-weight: 500;
                    }
                    @media (max-width: 480px) {
                        .features-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">
                            <div class="logo-icon"></div>
                            Afraponix Go
                        </div>
                        <h2 style="color: #0f172a; margin: 0;">Welcome to Smart Aquaponics! 🎉</h2>
                    </div>
                    
                    <div class="welcome-banner">
                        <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 20px;">Hello ${username}! 👋</h3>
                        <p style="margin: 0; color: #166534; font-size: 16px;">You're one step away from revolutionizing your aquaponics management</p>
                    </div>
                    
                    <p>Thank you for joining the Afraponix Go community! We're excited to help you optimize your aquaponics system with smart monitoring and management tools.</p>
                    
                    <p><strong>To activate your account and unlock all features, please verify your email address:</strong></p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${verificationLink}" class="verify-btn">✓ Verify My Account</a>
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-item">
                            <div class="feature-icon water">💧</div>
                            <span>Monitor Water Quality</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon fish">🐟</div>
                            <span>Track Fish Health</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon plant">🌱</div>
                            <span>Manage Plant Growth</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon tools">🧮</div>
                            <span>Aquaponics Calculators</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon analytics">📊</div>
                            <span>Dashboard Analytics</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon community">🌿</div>
                            <span>System Optimization</span>
                        </div>
                    </div>
                    
                    <div class="next-steps">
                        <h4 style="margin: 0 0 15px 0; color: #1e40af;">What happens after verification?</h4>
                        <ol style="margin: 0; padding-left: 20px; color: #475569;">
                            <li>Immediate access to your personalized dashboard</li>
                            <li>Set up your first aquaponics system profile</li>
                            <li>Start monitoring water quality parameters</li>
                            <li>Begin tracking your fish and plant health</li>
                        </ol>
                    </div>
                    
                    <div class="account-details">
                        <strong>Account Information:</strong><br>
                        👤 Username: ${username}<br>
                        📧 Email: ${email}<br>
                        📅 Joined: ${joinDate}<br>
                        ⏰ Verification link expires in 24 hours
                    </div>
                    
                    <p>Having trouble with the verification button? Copy and paste this link into your browser:</p>
                    <div style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 14px; color: #475569;">
                        ${verificationLink}
                    </div>
                    
                    <div class="footer">
                        <div class="social-links">
                            <a href="#" style="text-decoration: none;">📚 Getting Started Guide</a>
                            <a href="#" style="text-decoration: none;">💬 Community Support</a>
                            <a href="#" style="text-decoration: none;">🎓 Learning Resources</a>
                        </div>
                        <p style="margin: 15px 0 5px 0;">Welcome to the future of sustainable aquaponics management!</p>
                        <p style="margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Afraponix Go. All rights reserved. | Cultivating sustainable futures through smart aquaponics.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"${config.from.name}" <${config.from.address}>`,
            to: email,
            subject: '🌿 Welcome to Afraponix Go - Verify Your Email',
            html: htmlContent,
            text: `Welcome to Afraponix Go! 🎉

Hello ${username}!

Thank you for joining the Afraponix Go community! We're excited to help you optimize your aquaponics system with smart monitoring and management tools.

To activate your account and unlock all features, please verify your email address:

VERIFICATION LINK:
${verificationLink}

Once verified, you'll have access to:
- Monitor Water Quality Parameters
- Track Fish Health & Growth  
- Manage Plant Growth & Harvests
- Use Aquaponics Calculators
- View Dashboard Analytics
- System Optimization Tools

WHAT HAPPENS AFTER VERIFICATION:
1. Immediate access to your personalized dashboard
2. Set up your first aquaponics system profile
3. Start monitoring water quality parameters
4. Begin tracking your fish and plant health

ACCOUNT INFORMATION:
Username: ${username}
Email: ${email}
Joined: ${joinDate}
Verification link expires in 24 hours

Welcome to the future of sustainable aquaponics management!

Best regards,
Afraponix Go Team
Cultivating sustainable futures through smart aquaponics

© ${new Date().getFullYear()} Afraponix Go. All rights reserved.`
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