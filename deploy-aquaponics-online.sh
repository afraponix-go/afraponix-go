#!/bin/bash

# Afraponix Go Production Deployment Script
# Domain: go.aquaponics.online
# Run this script on your VPS as root

set -e

echo "🌿 Deploying Afraponix Go to go.aquaponics.online..."
echo "📋 This script will:"
echo "   • Install Node.js, MariaDB, Nginx"
echo "   • Configure SSL with Let's Encrypt"
echo "   • Set up the application and database"
echo "   • Configure systemd service"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

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

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates git

# Install Node.js 18.x
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MariaDB
echo "📦 Installing MariaDB..."
apt install -y mariadb-server mariadb-client

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
echo "📦 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Secure MariaDB
echo "🔒 Please secure MariaDB when prompted..."
mysql_secure_installation

# Create database and user
echo "🗄️ Setting up database..."
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES LIKE '${DB_NAME}';
SELECT User, Host FROM mysql.user WHERE User = '${DB_USER}';
EXIT;
EOF

# Clone application
echo "📥 Cloning Afraponix Go application..."
rm -rf ${APP_DIR}
git clone ${REPO_URL} ${APP_DIR}
cd ${APP_DIR}

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production

# Create environment file
echo "⚙️ Creating production environment configuration..."
cat > .env <<EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
EOF

# Set permissions
echo "🔐 Setting file permissions..."
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/.env

# Configure systemd service
echo "⚙️ Configuring systemd service..."
cp ${APP_DIR}/afraponix-go.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ${APP_NAME}

# Configure Nginx
echo "🌐 Configuring Nginx..."
cp ${APP_DIR}/nginx-site.conf /etc/nginx/sites-available/${APP_NAME}
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed. Please check the configuration."
    exit 1
fi

# Start application
echo "🚀 Starting Afraponix Go application..."
systemctl start ${APP_NAME}

# Check if application started successfully
sleep 5
if systemctl is-active --quiet ${APP_NAME}; then
    echo "✅ Application started successfully"
else
    echo "❌ Application failed to start. Checking logs..."
    journalctl -u ${APP_NAME} -n 20
    exit 1
fi

# Reload nginx
systemctl reload nginx

# Configure SSL with Let's Encrypt
echo "🔒 Setting up SSL certificate for go.aquaponics.online..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@aquaponics.online

# Create SMTP configuration template
echo "📧 Creating SMTP configuration template..."
mkdir -p ${APP_DIR}/config
cat > ${APP_DIR}/config/smtp.json.template <<EOF
{
  "host": "smtp-relay.brevo.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@domain.com",
    "pass": "your-smtp-password"
  },
  "from": {
    "name": "Afraponix Go",
    "address": "noreply@aquaponics.online"
  },
  "resetUrl": "https://${DOMAIN}/reset-password"
}
EOF

chown www-data:www-data ${APP_DIR}/config/smtp.json.template

# Final checks
echo "🔍 Running final checks..."
systemctl status ${APP_NAME} --no-pager
nginx -t

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "   • Application URL: https://${DOMAIN}"
echo "   • Database: ${DB_NAME}"
echo "   • Database User: ${DB_USER}"
echo "   • Database Password: ${DB_PASS}"
echo "   • JWT Secret: ${JWT_SECRET}"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure SMTP: Copy config/smtp.json.template to config/smtp.json and add your email settings"
echo "   2. Visit https://${DOMAIN} to access your application"
echo "   3. Create your first admin user account"
echo ""
echo "📊 Service Management Commands:"
echo "   • Check status: systemctl status ${APP_NAME}"
echo "   • View logs: journalctl -u ${APP_NAME} -f"
echo "   • Restart app: systemctl restart ${APP_NAME}"
echo "   • Update app: cd ${APP_DIR} && git pull && npm install --production && systemctl restart ${APP_NAME}"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo "   Database Password: ${DB_PASS}"
echo "   JWT Secret: ${JWT_SECRET}"
echo ""
echo "🌿 Afraponix Go is now live at https://go.aquaponics.online!"