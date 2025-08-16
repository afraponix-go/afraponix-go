#!/bin/bash

# DNS Cache Clearing Script for macOS
echo "🧹 Clearing DNS Cache..."
echo ""

echo "1️⃣ Flushing system DNS cache..."
sudo dscacheutil -flushcache

echo "2️⃣ Restarting mDNSResponder..."
sudo killall -HUP mDNSResponder

echo ""
echo "✅ Local DNS cache cleared successfully!"
echo ""

echo "📋 Browser DNS Cache Clearing:"
echo "Chrome: chrome://net-internals/#dns → Clear host cache"
echo "Firefox: about:networking#dns → Clear DNS Cache" 
echo "Safari: Develop → Empty Caches"
echo ""

echo "🔍 Testing DNS resolution..."
echo "afraponix.com resolves to:"
nslookup afraponix.com | grep "Address:" | tail -1

echo ""
echo "🎯 DNS cache clearing complete!"