const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load SMTP configuration from environment variables or config file
const loadSmtpConfig = () => {
    // Try environment variables first (production)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const baseUrl = process.env.BASE_URL || 'https://go.afraponix.com';
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

// ---- Shared, email-safe branded template ---------------------------------
// Email clients (Gmail, Outlook, Apple Mail) strip <style> blocks, ignore flex
// and gradients, and don't load web fonts — so every email is built from ONE
// helper using table layout, inline styles, a solid brand-blue button and the
// system font stack (with Inter as a hint). Brand: Deep Blue #334E9D, Bio
// Green #80FB7D.
const EMAIL_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderBrandEmail({ preheader = '', heading, intro, contentHtml = '', buttonLabel = '', buttonUrl = '', altLabel = '', altUrl = '', note = '' }) {
    const year = new Date().getFullYear();
    const button = buttonUrl ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0 26px;">
                <tr><td align="center" bgcolor="#334E9D" style="border-radius:10px;">
                  <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${EMAIL_FONT};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(buttonLabel)}</a>
                </td></tr>
              </table>` : '';
    const alt = altUrl ? `
              <p style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:13px;color:#64748b;">${escapeHtml(altLabel)}</p>
              <p style="margin:0 0 22px;padding:12px 14px;background:#f1f5fb;border:1px solid #e3e8f2;border-radius:8px;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:12px;line-height:1.5;color:#334E9D;word-break:break-all;">${altUrl}</p>` : '';
    const noteHtml = note ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #eef1f6;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:#94a3b8;">${note}</p>` : '';
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#eef2f9;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f9;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr><td style="padding:4px 6px 18px;font-family:${EMAIL_FONT};font-size:20px;font-weight:800;letter-spacing:-.01em;color:#334E9D;">Afraponix<span style="color:#6f93da;"> Go</span></td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e3e8f2;border-radius:16px;padding:36px 36px 32px;">
          <div style="width:44px;height:4px;background:#80FB7D;border-radius:2px;margin:0 0 22px;font-size:0;line-height:0;">&nbsp;</div>
          <h1 style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:22px;line-height:1.3;font-weight:800;color:#0f172a;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 22px;font-family:${EMAIL_FONT};font-size:15px;line-height:1.65;color:#475569;">${intro}</p>
          ${contentHtml}${button}${alt}${noteHtml}
        </td></tr>
        <tr><td style="padding:22px 8px;text-align:center;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:#94a3b8;">
          Afraponix Go — smart aquaponics management<br>&copy; ${year} Afraponix. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

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
        const name = escapeHtml(username);

        const htmlContent = renderBrandEmail({
            preheader: 'Reset your Afraponix Go password — this link expires in 1 hour.',
            heading: 'Reset your password',
            intro: `Hi ${name}, we received a request to reset the password for your Afraponix Go account. Click the button below to choose a new one.`,
            buttonLabel: 'Reset password',
            buttonUrl: resetLink,
            altLabel: 'Or paste this link into your browser:',
            altUrl: resetLink,
            note: "This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password won't change.",
        });

        const mailOptions = {
            from: `"${config.from.name}" <${config.from.address}>`,
            to: email,
            subject: 'Reset your Afraponix Go password',
            html: htmlContent,
            text: `Reset your Afraponix Go password

Hi ${username},

We received a request to reset the password for your Afraponix Go account.
Use this link to choose a new one:

${resetLink}

This link expires in 1 hour. If you didn't request a reset, you can safely
ignore this email — your password won't change.

— Afraponix Go`
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
const sendVerificationEmail = async (email, verificationToken, username, verificationCode) => {
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

        // Use the code from the database; generate one only for backward compatibility.
        if (!verificationCode) {
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        }
        const name = escapeHtml(username);

        const codeBlock = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td align="center" style="background:#f1f5fb;border:1px solid #e3e8f2;border-radius:12px;padding:20px 16px;">
              <div style="font-family:${EMAIL_FONT};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin:0 0 10px;">Verification code</div>
              <div style="font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#334E9D;">${escapeHtml(verificationCode)}</div>
            </td></tr>
          </table>`;

        const htmlContent = renderBrandEmail({
            preheader: `Your Afraponix Go verification code is ${verificationCode}.`,
            heading: 'Confirm your email address',
            intro: `Welcome to Afraponix Go${name ? `, ${name}` : ''}! Enter the code below in the app, or tap the button, to activate your account.`,
            contentHtml: codeBlock,
            buttonLabel: 'Confirm email',
            buttonUrl: verificationLink,
            altLabel: 'Or paste this link into your browser:',
            altUrl: verificationLink,
            note: "This code and link expire in 24 hours. If you didn't create an Afraponix Go account, you can safely ignore this email.",
        });

        const mailOptions = {
            from: `"${config.from.name}" <${config.from.address}>`,
            to: email,
            subject: 'Verify your email — Afraponix Go',
            html: htmlContent,
            text: `Confirm your email address

Welcome to Afraponix Go${username ? `, ${username}` : ''}!

Your verification code is: ${verificationCode}

Enter it in the app, or confirm your email with this link:
${verificationLink}

This code and link expire in 24 hours. If you didn't create an account, you
can safely ignore this email.

— Afraponix Go`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', result.messageId, 'Code:', verificationCode);
        return { success: true, messageId: result.messageId, verificationCode };

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
