#!/bin/bash

# Afraponix Go VPS Deployment Script
# Run this script on your VPS as root or with sudo privileges

set -e

# Configuration
APP_NAME="afraponix-go"
APP_DIR="/var/www/aquaponics-app"
REPO_URL="https://github.com/afraponix-go/afraponix-go.git"
DOMAIN="go.aquaponics.online"
DB_NAME="aquaponics"
DB_USER="aquaponics"
DB_PASS="$(openssl rand -base64 32)"  # Generate secure password
JWT_SECRET="$(openssl rand -base64 32)"  # Generate secure JWT secret

echo "🚀 Starting Afraponix Go deployment on VPS..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MariaDB
echo "📦 Installing MariaDB..."
apt install -y mariadb-server mariadb-client

# Secure MariaDB installation
echo "🔒 Securing MariaDB..."
mysql_secure_installation

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

# Create database and user
echo "🗄️ Setting up MariaDB database..."
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
exit
EOF

# Clone application
echo "📥 Cloning application..."
rm -rf ${APP_DIR}
git clone ${REPO_URL} ${APP_DIR}
cd ${APP_DIR}

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production

# Check for existing SQLite database to migrate
SQLITE_DB_PATH="${APP_DIR}/aquaponics.db"
if [ -f "$SQLITE_DB_PATH" ]; then
    echo "📊 Found existing SQLite database, migrating to MariaDB..."
    
    # Install sqlite3 command line tool if not present
    apt install -y sqlite3
    
    # Backup the SQLite database
    cp "$SQLITE_DB_PATH" "${APP_DIR}/aquaponics_backup_$(date +%Y%m%d_%H%M%S).db"
    
    # Export SQLite data
    echo "📤 Exporting SQLite data..."
    sqlite3 "$SQLITE_DB_PATH" .dump > /tmp/sqlite_export.sql
    
    # Convert SQLite dump to MariaDB format
    echo "🔧 Converting to MariaDB format..."
    sed -i 's/AUTOINCREMENT/AUTO_INCREMENT/g' /tmp/sqlite_export.sql
    sed -i '/^PRAGMA/d' /tmp/sqlite_export.sql
    sed -i '/^BEGIN TRANSACTION/d' /tmp/sqlite_export.sql
    sed -i '/^COMMIT/d' /tmp/sqlite_export.sql
    sed -i 's/INTEGER PRIMARY KEY/INT PRIMARY KEY AUTO_INCREMENT/g' /tmp/sqlite_export.sql
    sed -i 's/DATETIME DEFAULT CURRENT_TIMESTAMP/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g' /tmp/sqlite_export.sql
    
    # Import to MariaDB
    echo "📥 Importing data to MariaDB..."
    mysql -u ${DB_USER} -p${DB_PASS} ${DB_NAME} < /tmp/sqlite_export.sql
    
    # Verify migration
    echo "✅ Verifying migration..."
    USER_COUNT=$(mysql -u ${DB_USER} -p${DB_PASS} -N -s -e "USE ${DB_NAME}; SELECT COUNT(*) FROM users;")
    SYSTEM_COUNT=$(mysql -u ${DB_USER} -p${DB_PASS} -N -s -e "USE ${DB_NAME}; SELECT COUNT(*) FROM systems;")
    
    echo "📊 Migration completed:"
    echo "   • Users migrated: ${USER_COUNT}"
    echo "   • Systems migrated: ${SYSTEM_COUNT}"
    
    # Clean up
    rm /tmp/sqlite_export.sql
    
    # Move SQLite database to backup location
    mv "$SQLITE_DB_PATH" "${APP_DIR}/aquaponics_sqlite_backup.db"
    
else
    echo "📊 No existing SQLite database found, starting fresh with MariaDB"
fi

# Create environment file for MariaDB
echo "⚙️ Creating MariaDB environment configuration..."
cat > .env <<EOF
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

# Configure systemd service
echo "⚙️ Configuring systemd service..."
cp ${APP_DIR}/afraponix-go.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ${APP_NAME}

# Configure Nginx
echo "🌐 Configuring Nginx..."
sed "s/your-domain.com/${DOMAIN}/g" ${APP_DIR}/nginx-site.conf > /etc/nginx/sites-available/${APP_NAME}
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Start services
echo "🚀 Starting services..."
systemctl start ${APP_NAME}
systemctl reload nginx

# Configure SSL with Let's Encrypt
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}

# Create SMTP configuration template
echo "📧 Creating SMTP configuration template..."
mkdir -p ${APP_DIR}/config
cat > ${APP_DIR}/config/smtp.json.template <<EOF
{
  "host": "your-smtp-host.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@domain.com",
    "pass": "your-app-password"
  },
  "from": {
    "name": "Afraponix Go",
    "address": "your-email@domain.com"
  },
  "resetUrl": "https://${DOMAIN}/reset-password"
}
EOF

chown www-data:www-data ${APP_DIR}/config/smtp.json.template

echo "✅ Deployment completed!"
echo ""
echo "🎉 Afraponix Go is now running on your VPS!"
echo ""
echo "📋 Deployment Summary:"
echo "   • Application URL: https://${DOMAIN}"
echo "   • Database: ${DB_NAME}"
echo "   • Database User: ${DB_USER}"
echo "   • Database Password: ${DB_PASS}"
echo "   • JWT Secret: ${JWT_SECRET}"
echo ""
echo "🔧 Next Steps:"
echo "   1. Copy ${APP_DIR}/config/smtp.json.template to smtp.json and configure your email settings"
echo "   2. Visit https://${DOMAIN} to access your application"
echo "   3. Create your first admin user account"
echo ""
echo "📊 Service Management:"
echo "   • Check status: systemctl status ${APP_NAME}"
echo "   • View logs: journalctl -u ${APP_NAME} -f"
echo "   • Restart app: systemctl restart ${APP_NAME}"
echo ""
echo "⚠️  IMPORTANT: Save the database password and JWT secret shown above!"