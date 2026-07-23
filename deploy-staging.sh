#!/bin/bash

# Afraponix Go Staging Deployment Script
# Domain: staging.go.aquaponics.online
# Run this script on your VPS as root

set -e

echo "🧪 Deploying Afraponix Go STAGING to staging.go.aquaponics.online..."
echo "📋 This script will:"
echo "   • Set up staging environment alongside production"
echo "   • Configure SSL with Let's Encrypt"
echo "   • Set up staging database and service"
echo "   • Configure Nginx for staging subdomain"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Configuration
APP_NAME="afraponix-go-staging"
APP_DIR="/var/www/aquaponics-app-staging"
REPO_URL="https://github.com/afraponix-go/afraponix-go.git"
DOMAIN="staging.go.aquaponics.online"
DB_NAME="aquaponics_staging"
DB_USER="aquaponics_staging"
DB_PASS="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 32)"

echo "🔐 Generated secure staging credentials:"
echo "   Database Password: $DB_PASS"
echo "   JWT Secret: $JWT_SECRET"
echo ""

# Create staging database and user
echo "🗄️ Setting up staging database..."
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES LIKE '${DB_NAME}';
SELECT User, Host FROM mysql.user WHERE User = '${DB_USER}';
exit
EOF

# Clone application to staging directory
echo "📥 Cloning Afraponix Go staging application..."
rm -rf ${APP_DIR}
git clone ${REPO_URL} ${APP_DIR}
cd ${APP_DIR}

# Install dependencies
echo "📦 Installing staging application dependencies..."
npm install --production

# Build the database schema: core tables, crop/nutrient reference data, seed
# varieties, then every migration. Idempotent, so it is safe to re-run.
echo "🗄️  Building database schema..."
DB_HOST=localhost DB_USER="${DB_USER}" DB_PASSWORD="${DB_PASS}" DB_NAME="${DB_NAME}" npm run db:bootstrap

# Create staging environment file
echo "⚙️ Creating staging environment configuration..."
cat > .env <<EOF
NODE_ENV=staging
PORT=3001
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://staging.go.aquaponics.online
EOF

# Set permissions
echo "🔐 Setting staging file permissions..."
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/.env

# Configure systemd service for staging
echo "⚙️ Configuring staging systemd service..."
cp ${APP_DIR}/afraponix-go-staging.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ${APP_NAME}

# Configure Nginx for staging
echo "🌐 Configuring Nginx for staging..."
cp ${APP_DIR}/nginx-staging.conf /etc/nginx/sites-available/${APP_NAME}
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed. Please check the configuration."
    exit 1
fi

# Start staging application
echo "🚀 Starting Afraponix Go staging application..."
systemctl start ${APP_NAME}

# Check if application started successfully
sleep 5
if systemctl is-active --quiet ${APP_NAME}; then
    echo "✅ Staging application started successfully"
else
    echo "❌ Staging application failed to start. Checking logs..."
    journalctl -u ${APP_NAME} -n 20
    exit 1
fi

# Reload nginx
systemctl reload nginx

# Configure SSL with Let's Encrypt for staging subdomain
echo "🔒 Setting up SSL certificate for staging.go.aquaponics.online..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@aquaponics.online

# Final checks
echo "🔍 Running final staging checks..."
systemctl status ${APP_NAME} --no-pager
nginx -t

echo ""
echo "🎉 Staging deployment completed successfully!"
echo ""
echo "📊 Staging Deployment Summary:"
echo "   • Staging URL: https://${DOMAIN}"
echo "   • Database: ${DB_NAME}"
echo "   • Database User: ${DB_USER}"
echo "   • Database Password: ${DB_PASS}"
echo "   • JWT Secret: ${JWT_SECRET}"
echo "   • Port: 3001"
echo ""
echo "📊 Staging Service Management Commands:"
echo "   • Check status: systemctl status ${APP_NAME}"
echo "   • View logs: journalctl -u ${APP_NAME} -f"
echo "   • Restart staging: systemctl restart ${APP_NAME}"
echo "   • Update staging: cd ${APP_DIR} && git pull && npm install --production && npm run db:bootstrap && systemctl restart ${APP_NAME}"
echo ""
echo "⚠️  IMPORTANT: Save these staging credentials securely!"
echo "   Database Password: ${DB_PASS}"
echo "   JWT Secret: ${JWT_SECRET}"
echo ""
echo "🧪 Staging environment is now live at https://staging.go.aquaponics.online!"