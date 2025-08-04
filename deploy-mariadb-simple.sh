#!/bin/bash

# Simple MariaDB-focused deployment script
# Run this script on your VPS as root

set -e

echo "🚀 Starting Afraponix Go MariaDB deployment..."

# Configuration
APP_NAME="afraponix-go"
APP_DIR="/var/www/aquaponics-app"
REPO_URL="https://github.com/afraponix-go/afraponix-go.git"
DOMAIN="go.aquaponics.online"
DB_NAME="aquaponics"
DB_USER="aquaponics"
DB_PASS="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 32)"

echo "🔐 Generated secure credentials:"
echo "   Database Password: $DB_PASS"
echo "   JWT Secret: $JWT_SECRET"
echo ""

# Update system packages
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt update -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates nginx certbot python3-certbot-nginx sqlite3

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MariaDB (non-interactive)
echo "📦 Installing MariaDB..."
apt install -y mariadb-server mariadb-client

# Start MariaDB
systemctl start mariadb
systemctl enable mariadb

# Secure MariaDB and create database
echo "🗄️ Setting up MariaDB database..."
mysql << EOF
-- Set root password if not set
ALTER USER 'root'@'localhost' IDENTIFIED BY 'temp_root_password_123';
-- Create application database and user
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# Test database connection
echo "🔍 Testing database connection..."
mysql -u ${DB_USER} -p${DB_PASS} -e "USE ${DB_NAME}; SELECT 'Database connection successful' as status;"

# Clone application
echo "📥 Cloning application..."
rm -rf ${APP_DIR}
git clone ${REPO_URL} ${APP_DIR}
cd ${APP_DIR}

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production

# Replace the complex database init with simple version
echo "🔧 Configuring database initialization..."
cp database/init-simple.js database/init.js

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://${DOMAIN}
EOF

# Set permissions
echo "🔐 Setting file permissions..."
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/.env

# Test the application
echo "🧪 Testing application startup..."
cd ${APP_DIR}
timeout 10s npm start || echo "App test completed"

# Configure systemd service
echo "⚙️ Configuring systemd service..."
cp ${APP_DIR}/afraponix-go.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl start ${APP_NAME}

# Wait and check service status
sleep 5
if systemctl is-active --quiet ${APP_NAME}; then
    echo "✅ Application service started successfully"
else
    echo "❌ Application service failed to start. Checking logs..."
    journalctl -u ${APP_NAME} -n 20
    exit 1
fi

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/${APP_NAME} << 'NGINX_EOF'
# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name go.aquaponics.online;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name go.aquaponics.online;
    
    # SSL configuration (will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Static files
    location / {
        root /var/www/aquaponics-app;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
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
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Start Nginx
systemctl enable nginx
systemctl restart nginx

# Configure SSL with Let's Encrypt
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@aquaponics.online

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Final status check
echo "🔍 Final system check..."
systemctl status ${APP_NAME} --no-pager
systemctl status nginx --no-pager
systemctl status mariadb --no-pager

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   • Application URL: https://${DOMAIN}"
echo "   • Database: ${DB_NAME}"
echo "   • Database User: ${DB_USER}"
echo "   • Database Password: ${DB_PASS}"
echo "   • JWT Secret: ${JWT_SECRET}"
echo ""
echo "📊 Service Management:"
echo "   • Check status: systemctl status ${APP_NAME}"
echo "   • View logs: journalctl -u ${APP_NAME} -f"
echo "   • Restart app: systemctl restart ${APP_NAME}"
echo ""
echo "⚠️  IMPORTANT: Save the database password and JWT secret shown above!"
echo ""
echo "🌐 Your Afraponix Go system is now live at https://${DOMAIN}!"