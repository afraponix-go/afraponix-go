#!/bin/bash

# VPS Deployment Commands for 38.242.199.47
# Run these commands to deploy Afraponix Go

echo "🚀 Afraponix Go VPS Deployment"
echo "VPS IP: 38.242.199.47"
echo "Domain: go.aquaponics.online"
echo ""

echo "📋 Step 1: Copy deployment script to VPS"
echo "scp deploy-aquaponics-online.sh root@38.242.199.47:/root/"
echo ""

echo "📋 Step 2: SSH to VPS and run deployment"
echo "ssh root@38.242.199.47"
echo "chmod +x deploy-aquaponics-online.sh"
echo "./deploy-aquaponics-online.sh"
echo ""

echo "🔐 Alternative: If you need password authentication, use:"
echo "scp -o PreferredAuthentications=password deploy-aquaponics-online.sh root@38.242.199.47:/root/"
echo "ssh -o PreferredAuthentications=password root@38.242.199.47"
echo ""

echo "📧 Post-deployment: Configure SMTP"
echo "cd /var/www/aquaponics-app"
echo "cp config/smtp.json.template config/smtp.json"
echo "nano config/smtp.json"
echo "systemctl restart afraponix-go"
echo ""

echo "🌿 Your application will be live at: https://go.aquaponics.online"