#!/bin/bash

# Quick fix for Nginx SSL configuration
# Run this on your VPS if you're having SSL/HTTPS issues

set -e

echo "🔧 Fixing Nginx SSL configuration..."

# Create proper Nginx configuration with SSL
cat > /etc/nginx/sites-available/afraponix-go << 'EOF'
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
EOF

# Test the configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    # Check if SSL certificate exists
    if [ -f "/etc/letsencrypt/live/go.aquaponics.online/fullchain.pem" ]; then
        echo "✅ Let's Encrypt certificate found"
        
        # Update SSL certificate paths in Nginx config
        sed -i 's|ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;|ssl_certificate /etc/letsencrypt/live/go.aquaponics.online/fullchain.pem;|g' /etc/nginx/sites-available/afraponix-go
        sed -i 's|ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;|ssl_certificate_key /etc/letsencrypt/live/go.aquaponics.online/privkey.pem;|g' /etc/nginx/sites-available/afraponix-go
        
        echo "🔄 Updated SSL certificate paths, reloading Nginx..."
        nginx -t && systemctl reload nginx
        
    else
        echo "⚠️  Let's Encrypt certificate not found. Getting SSL certificate..."
        
        # Install certbot if not already installed
        apt update
        apt install -y certbot python3-certbot-nginx
        
        # Get SSL certificate
        certbot --nginx -d go.aquaponics.online --non-interactive --agree-tos --email admin@aquaponics.online
    fi
    
    echo ""
    echo "🎉 SSL configuration fixed!"
    echo "🌐 Your site should now be accessible at: https://go.aquaponics.online"
    echo ""
    echo "🔍 Quick tests:"
    echo "   • HTTP redirect: curl -I http://go.aquaponics.online"
    echo "   • HTTPS access: curl -I https://go.aquaponics.online"
    echo "   • Check SSL: openssl s_client -connect go.aquaponics.online:443 -servername go.aquaponics.online"
    
else
    echo "❌ Nginx configuration test failed. Please check the configuration."
    exit 1
fi