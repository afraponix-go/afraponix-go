# 🚀 Deploy to VPS: 38.242.199.47

## Quick Deployment Commands

### Step 1: Copy Deployment Script to VPS
```bash
# Copy the domain-specific deployment script
scp deploy-aquaponics-online.sh root@38.242.199.47:/root/
```

### Step 2: SSH to VPS and Deploy
```bash
# SSH to your VPS
ssh root@38.242.199.47

# Make script executable and run deployment
chmod +x deploy-aquaponics-online.sh
./deploy-aquaponics-online.sh
```

## Alternative: Manual Commands

If you prefer to run the commands manually:

```bash
# Copy script
scp deploy-aquaponics-online.sh root@38.242.199.47:/root/

# SSH and deploy
ssh root@38.242.199.47
chmod +x deploy-aquaponics-online.sh
./deploy-aquaponics-online.sh
```

## What the Script Will Do

1. **System Setup**
   - Update packages
   - Install Node.js 18, MariaDB, Nginx, Certbot
   - Configure firewall

2. **Database Setup**
   - Create `aquaponics` database
   - Create secure database user with random password
   - Secure MariaDB installation

3. **Application Deployment**
   - Clone from GitHub: https://github.com/afraponix-go/afraponix-go
   - Install dependencies
   - Configure environment variables
   - Set proper file permissions

4. **Service Configuration**
   - Configure systemd service for auto-start
   - Configure Nginx reverse proxy
   - Set up SSL certificate for go.aquaponics.online

5. **Security**
   - Enable firewall (SSH, HTTP, HTTPS)
   - Configure SSL/TLS with Let's Encrypt
   - Secure file permissions

## Expected Output

The script will display:
- ✅ Installation progress
- 🔐 Generated database password and JWT secret (SAVE THESE!)
- 📊 Final deployment summary
- 🌿 Success confirmation

## Post-Deployment

After successful deployment:

1. **Test Access**: Visit https://go.aquaponics.online
2. **Configure Email**: 
   ```bash
   ssh root@38.242.199.47
   cd /var/www/aquaponics-app
   cp config/smtp.json.template config/smtp.json
   nano config/smtp.json  # Add your SMTP settings
   systemctl restart afraponix-go
   ```
3. **Create Admin Account**: Register your first user

## Service Management

```bash
# Check application status
systemctl status afraponix-go

# View logs
journalctl -u afraponix-go -f

# Restart application
systemctl restart afraponix-go

# Update application
cd /var/www/aquaponics-app
git pull
npm install --production
systemctl restart afraponix-go
```

## DNS Configuration

Make sure your DNS is pointing to the VPS:
- **Domain**: go.aquaponics.online
- **A Record**: 38.242.199.47
- **TTL**: 300 (5 minutes)

## Troubleshooting

If deployment fails:
- Check DNS: `nslookup go.aquaponics.online`
- Check ports: `netstat -tlnp | grep :80`
- Check logs: `journalctl -u afraponix-go -n 50`
- Check Nginx: `nginx -t && systemctl status nginx`

## Ready to Deploy! 🌿

Run the deployment commands above to get Afraponix Go live at:
**https://go.aquaponics.online**