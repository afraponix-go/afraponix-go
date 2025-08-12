#!/bin/bash

# Afraponix Go - Complete System Deployment Script
# This script handles the complete replacement of the old system with the new enhanced version

set -e  # Exit on any error

echo "🚀 Afraponix Go - Complete System Migration & Deployment"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./migration/backups"
LOG_DIR="./migration/logs"
DEPLOYMENT_LOG="$LOG_DIR/deployment-$(date +%Y%m%d-%H%M%S).log"

# Create directories
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOYMENT_LOG"
}

# Error handling
handle_error() {
    echo -e "${RED}❌ Error occurred at line $1${NC}"
    log "ERROR: Deployment failed at line $1"
    echo -e "${YELLOW}📋 Check the log file: $DEPLOYMENT_LOG${NC}"
    exit 1
}

trap 'handle_error $LINENO' ERR

echo -e "${BLUE}📋 Starting deployment log: $DEPLOYMENT_LOG${NC}"

# Step 1: Pre-deployment checks
echo -e "\n${BLUE}Step 1/8: Pre-deployment checks...${NC}"
log "Starting pre-deployment checks"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}Please create .env file with database credentials${NC}"
    exit 1
fi

# Load environment variables
source .env

# Check database connection
echo "🔌 Testing database connection..."
if ! node -e "
const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: '$DB_HOST',
            user: '$DB_USER',
            password: '$DB_PASSWORD',
            database: '$DB_NAME'
        });
        await conn.end();
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
})();
"; then
    log "Database connection test passed"
else
    log "ERROR: Database connection test failed"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Step 2: Stop existing services
echo -e "\n${BLUE}Step 2/8: Stopping existing services...${NC}"
log "Stopping existing Node.js processes"

# Kill any existing Node.js processes on ports 8000 and 3000
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 2
echo -e "${GREEN}✅ Existing services stopped${NC}"

# Step 3: Install/Update dependencies
echo -e "\n${BLUE}Step 3/8: Installing dependencies...${NC}"
log "Installing npm dependencies"

npm install --production=false
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 4: Run database backup
echo -e "\n${BLUE}Step 4/8: Creating database backup...${NC}"
log "Creating database backup before migration"

node ./migration/backup-database.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database backup completed${NC}"
    log "Database backup completed successfully"
else
    echo -e "${RED}❌ Database backup failed${NC}"
    log "ERROR: Database backup failed"
    exit 1
fi

# Step 5: Run database migration
echo -e "\n${BLUE}Step 5/8: Running database migration...${NC}"
log "Starting complete database migration"

echo -e "${YELLOW}⚠️  WARNING: This will completely replace the existing database structure!${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled by user${NC}"
    exit 0
fi

node ./migration/migrate-to-new-structure.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
    log "Database migration completed successfully"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    log "ERROR: Database migration failed"
    echo -e "${YELLOW}Check backup files in $BACKUP_DIR for recovery${NC}"
    exit 1
fi

# Step 6: Update application configuration
echo -e "\n${BLUE}Step 6/8: Updating application configuration...${NC}"
log "Updating application configuration"

# Create/update package.json scripts if needed
if ! grep -q '"start":' package.json; then
    log "Adding start script to package.json"
    npm pkg set scripts.start="node server.js"
fi

# Ensure all required directories exist
mkdir -p uploads logs temp
chmod 755 uploads logs temp

echo -e "${GREEN}✅ Application configuration updated${NC}"

# Step 7: Run application tests
echo -e "\n${BLUE}Step 7/8: Running application tests...${NC}"
log "Running basic application tests"

# Test database connection with new structure
node -e "
const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: '$DB_HOST',
            user: '$DB_USER', 
            password: '$DB_PASSWORD',
            database: '$DB_NAME'
        });
        
        // Test that key tables exist
        const tables = ['users', 'systems', 'fish_tanks', 'grow_beds', 'water_quality', 'plant_growth'];
        for (const table of tables) {
            const [rows] = await conn.execute(\`SELECT COUNT(*) as count FROM \${table}\`);
            console.log(\`✅ Table \${table}: \${rows[0].count} records\`);
        }
        
        await conn.end();
        console.log('✅ All database tests passed');
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    }
})();
"

# Test that the server can start
echo "🔌 Testing server startup..."
timeout 10s node server.js &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Server startup test passed${NC}"
    kill $SERVER_PID 2>/dev/null || true
    log "Server startup test passed"
else
    echo -e "${RED}❌ Server startup test failed${NC}"
    log "ERROR: Server startup test failed"
    exit 1
fi

# Step 8: Start the new system
echo -e "\n${BLUE}Step 8/8: Starting the new Afraponix Go system...${NC}"
log "Starting the new system"

# Start the server in the background
nohup npm start > logs/server.log 2>&1 &
SERVER_PID=$!

# Wait a moment for startup
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ New Afraponix Go system started successfully!${NC}"
    log "New system started successfully with PID $SERVER_PID"
    
    # Test HTTP response
    if curl -f http://localhost:8000 > /dev/null 2>&1; then
        echo -e "${GREEN}🌐 Web interface is accessible at http://localhost:8000${NC}"
        log "Web interface is responding"
    else
        echo -e "${YELLOW}⚠️  Server started but web interface may not be ready yet${NC}"
        log "WARNING: Web interface not immediately accessible"
    fi
else
    echo -e "${RED}❌ Failed to start the new system${NC}"
    log "ERROR: Failed to start new system"
    exit 1
fi

# Final success message
echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "=========================================="
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "   • Database: Completely migrated to new structure"
echo -e "   • Application: Updated to latest version"  
echo -e "   • Server: Running on http://localhost:8000"
echo -e "   • Logs: $DEPLOYMENT_LOG"
echo -e "   • Backups: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Test the application thoroughly"
echo -e "   2. Configure user accounts as needed"
echo -e "   3. Import/migrate any custom data if required"
echo -e "   4. Set up monitoring and alerts"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo -e "   • Check server status: ps aux | grep node"
echo -e "   • View server logs: tail -f logs/server.log" 
echo -e "   • Stop server: pkill -f 'node.*server'"
echo -e "   • Restart server: npm start"

log "Deployment completed successfully"
echo -e "\n${GREEN}🚀 Welcome to the new Afraponix Go!${NC}"