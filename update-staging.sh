#!/bin/bash

# Quick staging update script
# Run this on your VPS to update staging from GitHub

set -e

APP_DIR="/var/www/aquaponics-app-staging"
APP_NAME="afraponix-go-staging"

echo "🔄 Updating staging environment..."

# Navigate to staging directory
cd ${APP_DIR}

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart staging service
echo "🔄 Restarting staging service..."
systemctl restart ${APP_NAME}

# Check service status
sleep 3
if systemctl is-active --quiet ${APP_NAME}; then
    echo "✅ Staging updated and restarted successfully"
    echo "🌐 Check: https://staging.go.aquaponics.online"
else
    echo "❌ Staging service failed to start. Checking logs..."
    journalctl -u ${APP_NAME} -n 10
    exit 1
fi

echo "🎉 Staging update completed!"