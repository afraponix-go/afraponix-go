# 🚀 VPS Migration Guide for Afraponix Go

## Quick Start (Automated Deployment)

### Option 1: Automated Script (Recommended)
1. **Create GitHub Repository**
   - Follow instructions in `GITHUB_SETUP.md`
   - Update `REPO_URL` in `vps-deploy.sh`

2. **Run Deployment Script on VPS**
   ```bash
   # Copy deployment script to your VPS
   scp vps-deploy.sh root@your-vps-ip:/root/
   
   # SSH to your VPS
   ssh root@your-vps-ip
   
   # Edit the script to set your domain and repo URL
   nano vps-deploy.sh
   
   # Run deployment
   chmod +x vps-deploy.sh
   ./vps-deploy.sh
   ```

### Option 2: Manual Deployment
Follow the detailed steps in `DEPLOYMENT.md`

## Pre-Migration Checklist

### ✅ Domain Setup
- [ ] Domain pointing to VPS IP address
- [ ] DNS A record configured
- [ ] Subdomain configured (optional)

### ✅ VPS Requirements
- [ ] Ubuntu/Debian VPS (2GB+ RAM recommended)
- [ ] Root access or sudo privileges
- [ ] Port 80 and 443 open
- [ ] SSH access configured

### ✅ Email Configuration  
- [ ] SMTP service ready (Gmail, SendGrid, etc.)
- [ ] App password generated
- [ ] Email templates tested

## Migration Steps

### 1. Backup Current Data (if applicable)
```bash
# Backup SQLite database
cp aquaponics.db aquaponics-backup-$(date +%Y%m%d).db

# Export to SQL (for MariaDB import)
sqlite3 aquaponics.db .dump > aquaponics-export.sql
```

### 2. Deploy to VPS
- Use automated script or manual deployment
- Configure environment variables
- Set up SSL certificates
- Configure email settings

### 3. Data Migration (if needed)
```sql
-- Import data to MariaDB if migrating from SQLite
mysql -u aquaponics -p aquaponics < aquaponics-export.sql
```

### 4. DNS Update
- Update DNS to point to VPS
- Wait for propagation (up to 48 hours)

### 5. Testing
- [ ] Application loads correctly
- [ ] User authentication works
- [ ] Data entry functions work
- [ ] Email notifications work
- [ ] Charts and dashboards load
- [ ] Mobile responsiveness

## Post-Migration Tasks

### Security Hardening
```bash
# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Create non-root user
adduser yourusername
usermod -aG sudo yourusername

# Configure fail2ban
apt install fail2ban
```

### Monitoring Setup
```bash
# Install monitoring tools
apt install htop netstat-nat
npm install -g pm2  # Alternative to systemd

# Check application logs
journalctl -u afraponix-go -f
```

### Backup Strategy
```bash
# Create backup script
cat > /root/backup-aquaponics.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u aquaponics -p'password' aquaponics > /backups/aquaponics_$DATE.sql
find /backups -name "aquaponics_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-aquaponics.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /root/backup-aquaponics.sh
```

## Troubleshooting

### Application Won't Start
```bash
# Check service status
systemctl status afraponix-go

# Check logs
journalctl -u afraponix-go -n 50

# Check Node.js errors
cd /var/www/aquaponics-app && node server.js
```

### Database Connection Issues
```bash
# Test database connection
mysql -u aquaponics -p aquaponics

# Check database permissions
mysql -u root -p
> SHOW GRANTS FOR 'aquaponics'@'localhost';
```

### Nginx Configuration Issues
```bash
# Test nginx config
nginx -t

# Check nginx logs
tail -f /var/log/nginx/error.log
```

## Performance Optimization

### Database Optimization
```sql
# Add indexes for better performance
USE aquaponics;
CREATE INDEX idx_water_quality_system_date ON water_quality(system_id, date);
CREATE INDEX idx_fish_health_system_date ON fish_health(system_id, date);
CREATE INDEX idx_plant_growth_system_date ON plant_growth(system_id, date);
```

### Nginx Caching
```nginx
# Add to nginx config for better performance
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip_static on;
}
```

## Support
- Check logs: `journalctl -u afraponix-go -f`
- Application files: `/var/www/aquaponics-app`
- Nginx config: `/etc/nginx/sites-available/afraponix-go`
- Service config: `/etc/systemd/system/afraponix-go.service`