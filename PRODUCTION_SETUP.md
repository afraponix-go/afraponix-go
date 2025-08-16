# Afraponix Go - Production Environment Setup Guide

This guide covers the essential steps for deploying Afraponix Go to a production environment with proper email functionality.

## 📋 Quick Setup Checklist

- [ ] **Environment Configuration** - Copy and configure `.env.example` to `.env`
- [ ] **Database Setup** - Configure MariaDB/MySQL connection  
- [ ] **Security Keys** - Generate JWT_SECRET and ENCRYPTION_KEY
- [ ] **Email Service** - Configure SMTP for password reset and verification
- [ ] **File Permissions** - Secure environment file permissions
- [ ] **SSL/TLS** - Configure HTTPS for production
- [ ] **Database Backup** - Set up automated backups

## 🔧 Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Generate Security Keys
```bash
# Generate JWT Secret (64 bytes)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (32 bytes) 
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Database
Update your `.env` file with MariaDB/MySQL credentials:
```env
DB_HOST=localhost
DB_USER=afraponix_user
DB_PASSWORD=your_secure_database_password
DB_NAME=afraponix_production
DB_PORT=3306
```

## 📧 Email Service Configuration (SMTP)

Email functionality is **optional** but **highly recommended** for:
- Password reset capabilities  
- Email verification for new accounts
- User notifications

### Important Note
If SMTP is not configured, the application will gracefully degrade:
- Password reset will show "temporarily unavailable" message
- Email verification will show "limited features" message  
- Core application functionality remains fully operational

### Recommended Email Providers

#### Option 1: Gmail (Recommended for small-scale)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
SMTP_FROM_NAME=Afraponix Go
SMTP_FROM_ADDRESS=noreply@your-domain.com
```

**Gmail Setup Steps:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the App Password (not your regular Gmail password) in `SMTP_PASS`

#### Option 2: SendGrid (Recommended for production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_NAME=Afraponix Go
SMTP_FROM_ADDRESS=noreply@your-domain.com
```

**SendGrid Setup Steps:**
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Verify your domain or sender identity
3. Create an API key with Mail Send permissions
4. Use `apikey` as username and API key as password

#### Option 3: Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM_NAME=Afraponix Go
SMTP_FROM_ADDRESS=noreply@your-domain.com
```

#### Option 4: Outlook/Office 365
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_NAME=Afraponix Go
SMTP_FROM_ADDRESS=noreply@your-domain.com
```

### Testing Email Configuration

After configuring SMTP, test the email service:

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Test password reset:**
   - Go to login page
   - Click "Forgot Password"
   - Enter a test email address
   - Check server logs for email sending confirmation

3. **Check logs for success/failure:**
   ```bash
   # Look for these log messages:
   # SUCCESS: "Password reset email sent: <message-id>"
   # FAILURE: "SMTP configuration not available: <error>"
   ```

## 🔒 Security Configuration

### File Permissions
```bash
# Secure the environment file
chmod 600 .env
chown your-app-user:your-app-group .env
```

### Required Environment Variables
```env
NODE_ENV=production
BASE_URL=https://your-domain.com
JWT_SECRET=your-generated-jwt-secret
ENCRYPTION_KEY=your-generated-encryption-key
```

## 🚀 Production Deployment

### 1. Database Setup
```bash
# Create production database
mysql -u root -p
CREATE DATABASE afraponix_production;
CREATE USER 'afraponix_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON afraponix_production.* TO 'afraponix_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Application Setup
```bash
# Install dependencies
npm ci --production

# Run database migrations (if any)
npm run migrate

# Start application
npm start
```

### 3. Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name "afraponix-go"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔍 Troubleshooting

### Email Issues

**Problem**: Password reset returns "temporarily unavailable"
- **Check**: SMTP environment variables are set correctly
- **Check**: Server logs for specific SMTP errors
- **Solution**: Verify SMTP credentials and provider settings

**Problem**: Gmail authentication fails
- **Check**: Using App Password instead of regular password
- **Check**: 2-Factor Authentication is enabled
- **Solution**: Generate new App Password from Google Account settings

**Problem**: SendGrid emails not sending
- **Check**: Domain verification status in SendGrid dashboard
- **Check**: API key has Mail Send permissions
- **Solution**: Verify sender identity or domain in SendGrid

### Application Issues

**Problem**: Application fails to start
- **Check**: All required environment variables are set
- **Check**: Database connection is working
- **Solution**: Review server logs for specific error messages

**Problem**: Users can't reset passwords  
- **Check**: Email service configuration
- **Note**: Application will function without email, but users won't be able to reset passwords
- **Solution**: Configure SMTP or manually reset user passwords via database

## 📊 Monitoring

### Health Check
The application provides a health check endpoint:
```
GET /api/health
```

### Log Monitoring
Monitor these log messages:
- Email service configuration status
- SMTP connection success/failure
- Database connection status
- Authentication errors

## 🔄 Maintenance

### Database Backups
```bash
# Daily backup script
mysqldump -u afraponix_user -p afraponix_production > backup_$(date +%Y%m%d).sql
```

### Environment Updates
When updating environment variables:
1. Update `.env` file
2. Restart application: `pm2 restart afraponix-go`
3. Verify health check: `curl https://your-domain.com/api/health`

## 📞 Support

For deployment assistance:
- Review server logs for specific error messages
- Check environment variable configuration
- Verify database connectivity
- Test email service configuration independently

The application is designed to be resilient - email functionality is optional and will gracefully degrade if not configured, ensuring core aquaponics management features remain available.