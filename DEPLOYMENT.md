# Afraponix Go Deployment Guide

## Prerequisites
- Ubuntu/Debian server
- Node.js 16+ installed
- MariaDB/MySQL installed
- Nginx installed
- SSL certificate configured

## Deployment Steps

### 1. Setup Database
```bash
# Login to MariaDB as root
mysql -u root -p

# Run the database setup script
source /path/to/database-setup.sql
```

### 2. Clone and Setup Application
```bash
# Clone to web directory
sudo git clone <your-repo-url> /var/www/aquaponics-app
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
JWT_SECRET=your-super-secure-jwt-secret
```

### 4. Configure Systemd Service
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

### 5. Configure Nginx
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

### 6. Configure SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Configure Firewall
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
sudo systemctl restart afraponix-go
```