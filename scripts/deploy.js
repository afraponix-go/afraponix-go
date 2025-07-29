#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function createDeploymentConfig() {
    console.log('🚀 Setting up Afraponix Go for production deployment...\n');
    
    try {
        // Check if .env file exists
        const envPath = path.join(__dirname, '..', '.env');
        try {
            await fs.access(envPath);
            console.log('✅ .env file already exists');
        } catch (error) {
            // Copy example env file
            const exampleEnvPath = path.join(__dirname, '..', '.env.example');
            const exampleContent = await fs.readFile(exampleEnvPath, 'utf8');
            
            const productionEnv = exampleContent.replace(
                'NODE_ENV=development',
                'NODE_ENV=production'
            );
            
            await fs.writeFile(envPath, productionEnv);
            console.log('✅ Created .env file from template');
            console.log('⚠️  IMPORTANT: Update the .env file with your production values!');
        }
        
        // Create systemd service file
        const serviceContent = `[Unit]
Description=Afraponix Go Aquaponics Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/aquaponics-app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=afraponix-go

[Install]
WantedBy=multi-user.target`;
        
        const servicePath = path.join(__dirname, '..', 'afraponix-go.service');
        await fs.writeFile(servicePath, serviceContent);
        console.log('✅ Created systemd service file');
        
        // Create nginx configuration
        const nginxConfig = `server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration (update paths to your certificates)
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Static files
    location / {
        root /var/www/aquaponics-app;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}`;
        
        const nginxPath = path.join(__dirname, '..', 'nginx-site.conf');
        await fs.writeFile(nginxPath, nginxConfig);
        console.log('✅ Created nginx configuration file');
        
        // Create database setup script
        const dbSetupSQL = `-- Afraponix Go Database Setup Script
-- Run this script on your MariaDB server

-- Create database
CREATE DATABASE IF NOT EXISTS aquaponics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (change password!)
CREATE USER IF NOT EXISTS 'aquaponics'@'localhost' IDENTIFIED BY 'change_this_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON aquaponics.* TO 'aquaponics'@'localhost';
FLUSH PRIVILEGES;

-- Show created database and user
SHOW DATABASES LIKE 'aquaponics';
SELECT User, Host FROM mysql.user WHERE User = 'aquaponics';

-- Use the database
USE aquaponics;

-- Tables will be created automatically by the application
-- This script just sets up the database and user`;
        
        const dbSetupPath = path.join(__dirname, '..', 'database-setup.sql');
        await fs.writeFile(dbSetupPath, dbSetupSQL);
        console.log('✅ Created database setup script');
        
        // Create deployment instructions
        const deployInstructions = `# Afraponix Go Deployment Guide

## Prerequisites
- Ubuntu/Debian server
- Node.js 16+ installed
- MariaDB/MySQL installed
- Nginx installed
- SSL certificate configured

## Deployment Steps

### 1. Setup Database
\`\`\`bash
# Login to MariaDB as root
mysql -u root -p

# Run the database setup script
source /path/to/database-setup.sql
\`\`\`

### 2. Clone and Setup Application
\`\`\`bash
# Clone to web directory
sudo git clone <your-repo-url> /var/www/aquaponics-app
cd /var/www/aquaponics-app

# Install dependencies
npm install --production

# Set permissions
sudo chown -R www-data:www-data /var/www/aquaponics-app
sudo chmod -R 755 /var/www/aquaponics-app
\`\`\`

### 3. Configure Environment
\`\`\`bash
# Copy and edit environment file
sudo cp .env.example .env
sudo nano .env

# Update these values:
NODE_ENV=production
DB_HOST=localhost
DB_USER=aquaponics
DB_PASSWORD=your_secure_password
DB_NAME=aquaponics
JWT_SECRET=your-super-secure-jwt-secret
\`\`\`

### 4. Configure Systemd Service
\`\`\`bash
# Copy service file
sudo cp afraponix-go.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable afraponix-go
sudo systemctl start afraponix-go

# Check status
sudo systemctl status afraponix-go
\`\`\`

### 5. Configure Nginx
\`\`\`bash
# Copy nginx configuration
sudo cp nginx-site.conf /etc/nginx/sites-available/afraponix-go

# Enable site
sudo ln -s /etc/nginx/sites-available/afraponix-go /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
\`\`\`

### 6. Configure SSL (Let's Encrypt)
\`\`\`bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
\`\`\`

### 7. Configure Firewall
\`\`\`bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
\`\`\`

## Monitoring and Maintenance

### Check Application Status
\`\`\`bash
sudo systemctl status afraponix-go
sudo journalctl -u afraponix-go -f
\`\`\`

### Database Backup
\`\`\`bash
mysqldump -u aquaponics -p aquaponics > backup-$(date +%Y%m%d).sql
\`\`\`

### Update Application
\`\`\`bash
cd /var/www/aquaponics-app
sudo git pull
npm install --production
sudo systemctl restart afraponix-go
\`\`\``;
        
        const instructionsPath = path.join(__dirname, '..', 'DEPLOYMENT.md');
        await fs.writeFile(instructionsPath, deployInstructions);
        console.log('✅ Created deployment instructions');
        
        console.log('\n🎉 Deployment configuration complete!');
        console.log('\nNext steps:');
        console.log('1. Update .env file with your production values');
        console.log('2. Update nginx-site.conf with your domain name');
        console.log('3. Run database-setup.sql on your MariaDB server');
        console.log('4. Follow the instructions in DEPLOYMENT.md');
        
    } catch (error) {
        console.error('❌ Error setting up deployment:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    createDeploymentConfig();
}

module.exports = { createDeploymentConfig };