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
        const config = loadSmtpConfig();
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
                    .logo-icon::before {
                        content: "🌱";
                        font-size: 18px;
                    }
                    .greeting {
                        background: linear-gradient(135deg, #e6f0fb 0%, #b3d1f0 100%);
                        border-radius: 12px;
                        padding: 20px;
                        margin: 25px 0;
                        border-left: 4px solid #0051b1;
                    }
                    .reset-btn {
                        display: inline-block;
                        background: linear-gradient(135deg, #0051b1 0%, #7baaee 100%);
                        color: white;
                        padding: 16px 32px;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 16px;
                        margin: 25px 0;
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
                    .security-notice .icon {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 24px;
                        height: 24px;
                        background: #f59e0b;
                        color: white;
                        border-radius: 50%;
                        margin-right: 8px;
                        font-weight: bold;
                        font-size: 14px;
                    }
                    .security-notice .icon::before {
                        content: "!";
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
                        border-radius: 8px;
                        padding: 15px;
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
                        <h2 style="color: #0f172a; margin: 0;">Secure Password Reset</h2>
                    </div>
                    
                    <div class="greeting">
                        <p style="margin: 0; font-weight: 600;">Hello ${username}! 👋</p>
                        <p style="margin: 8px 0 0 0; color: #475569;">We're here to help you regain access to your aquaponics management system.</p>
                    </div>
                    
                    <p>We received a request to reset your password for your Afraponix Go account. Click the secure button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" class="reset-btn">🔐 Reset My Password</a>
                    </div>
                    
                    <p>Having trouble with the button? Copy and paste this secure link into your browser:</p>
                    <div class="link-box">${resetLink}</div>
                    
                    <div class="security-notice">
                        <div style="display: flex; align-items: flex-start;">
                            <div class="icon"></div>
                            <div>
                                <strong style="color: #92400e;">Security Information</strong>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #92400e;">
                                    <li>This secure link expires in <strong>1 hour</strong> for your protection</li>
                                    <li>If you didn't request this reset, please ignore this email safely</li>
                                    <li>Your current password remains active until you create a new one</li>
                                    <li>Only you have received this personalized reset link</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="request-details">
                        <strong>Request Details:</strong><br>
                        📧 Account: ${email}<br>
                        🕐 Requested: ${currentDate}<br>
                        🔒 Expires: 1 hour from request time
                    </div>
                    
                    <p>Need assistance? Our aquaponics experts are here to help you get back to managing your systems. Contact support if you're experiencing any issues.</p>
                    
                    <div class="footer">
                        <div class="social-links">
                            <a href="#" style="text-decoration: none;">📚 Documentation</a>
                            <a href="#" style="text-decoration: none;">💬 Support</a>
                            <a href="#" style="text-decoration: none;">🌿 Community</a>
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
            text: `Hello ${username}!

We received a request to reset your password for your Afraponix Go aquaponics management account.

SECURE RESET LINK:
${resetLink}

SECURITY INFORMATION:
- This link expires in 1 hour for your protection
- If you didn't request this reset, please ignore this email safely  
- Your current password remains active until you create a new one

REQUEST DETAILS:
Account: ${email}
Requested: ${currentDate}
Expires: 1 hour from request time

Need assistance? Contact our aquaponics support team for help.

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
        const config = loadSmtpConfig();
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