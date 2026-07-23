# Afraponix Go Deployment Guide

## Prerequisites
- Ubuntu/Debian server
- Node.js 16+ installed
- MariaDB/MySQL installed
- Nginx installed
- SSL certificate configured

## Deployment Steps

### 1. Create the Database and User
This creates an **empty** database and its user. The tables and reference data
are created later, in step 4.

```bash
# Edit the password in the script first, then run it as root
sudo mysql -u root -p < database-setup.sql
```

### 2. Clone and Setup Application
```bash
# Clone to web directory
sudo git clone https://github.com/afraponix-go/afraponix-go.git /var/www/aquaponics-app
cd /var/www/aquaponics-app

# Install dependencies
npm install --production

# Set permissions
sudo chown -R www-data:www-data /var/www/aquaponics-app
sudo chmod -R 755 /var/www/aquaponics-app
```

### 3. Configure Environment
```bash
# Copy and edit environment file
sudo cp .env.example .env
sudo nano .env

# Update these values:
NODE_ENV=production
DB_HOST=localhost
DB_USER=aquaponics
DB_PASSWORD=your_secure_password
DB_NAME=aquaponics

# Required. The server refuses to start if this is missing, a placeholder,
# or shorter than 32 characters. Generate one with:
#   openssl rand -base64 48
JWT_SECRET=

# Number of reverse proxies in front of the app. With nginx (step 6) this
# must be set, otherwise every request appears to come from nginx itself and
# the login rate limits would be shared by all users at once.
TRUST_PROXY=1
```

### 4. Create the Database Schema
Run once, before starting the app for the first time. It builds the complete
schema — core tables, crop and nutrient reference data, seed varieties — and
applies every migration.

```bash
cd /var/www/aquaponics-app
npm run db:bootstrap
```

It reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` from the
environment, so make sure `.env` from step 3 is loaded (or pass them inline):

```bash
DB_HOST=localhost DB_USER=aquaponics DB_PASSWORD=your_secure_password \
  DB_NAME=aquaponics npm run db:bootstrap
```

Every step is idempotent, so re-running it is safe — that is also how you apply
new migrations after an update (see *Update Application* below).

### 5. Configure Systemd Service
```bash
# Copy service file
sudo cp afraponix-go.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable afraponix-go
sudo systemctl start afraponix-go

# Check status
sudo systemctl status afraponix-go
```

### 6. Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx-site.conf /etc/nginx/sites-available/afraponix-go

# Enable site
sudo ln -s /etc/nginx/sites-available/afraponix-go /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 7. Configure SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 8. Configure Firewall
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## Monitoring and Maintenance

### Check Application Status
```bash
sudo systemctl status afraponix-go
sudo journalctl -u afraponix-go -f
```

### Database Backup
```bash
mysqldump -u aquaponics -p aquaponics > backup-$(date +%Y%m%d).sql
```

### Update Application
```bash
cd /var/www/aquaponics-app
sudo git pull
npm install --production

# Apply any new migrations (idempotent — safe to run every deploy)
npm run db:bootstrap

sudo systemctl restart afraponix-go
```