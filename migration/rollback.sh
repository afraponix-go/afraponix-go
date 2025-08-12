#!/bin/bash

# Afraponix Go - Emergency Rollback Script
# Use this script to restore from backup if migration fails

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./migration/backups"
LOG_DIR="./migration/logs"
ROLLBACK_LOG="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$ROLLBACK_LOG"
}

echo -e "${RED}🚨 Afraponix Go - Emergency Rollback${NC}"
echo "=================================="

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# List available backups
echo -e "\n${BLUE}📋 Available backups:${NC}"
BACKUPS=($(ls -1t "$BACKUP_DIR"/*.sql 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No backup files found in $BACKUP_DIR${NC}"
    exit 1
fi

# Display backup options
for i in "${!BACKUPS[@]}"; do
    backup_file="${BACKUPS[$i]}"
    backup_name=$(basename "$backup_file")
    backup_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup_file")
    echo "  $((i+1)). $backup_name (created: $backup_date)"
done

# Get user selection
echo -e "\n${YELLOW}⚠️  WARNING: This will completely replace the current database!${NC}"
read -p "Select backup to restore (1-${#BACKUPS[@]}), or 'q' to quit: " choice

if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
    echo -e "${BLUE}Rollback cancelled${NC}"
    exit 0
fi

# Validate selection
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#BACKUPS[@]} ]; then
    echo -e "${RED}❌ Invalid selection${NC}"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$((choice-1))]}"
echo -e "\n${BLUE}Selected backup: $(basename "$SELECTED_BACKUP")${NC}"

# Final confirmation
read -p "Are you absolutely sure you want to restore this backup? (yes/NO): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}Rollback cancelled${NC}"
    exit 0
fi

log "Starting rollback process with backup: $SELECTED_BACKUP"

# Step 1: Stop current application
echo -e "\n${BLUE}Step 1/4: Stopping current application...${NC}"
log "Stopping application services"

pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

sleep 2
echo -e "${GREEN}✅ Application stopped${NC}"

# Step 2: Load environment variables
echo -e "\n${BLUE}Step 2/4: Loading database configuration...${NC}"
log "Loading environment configuration"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

source .env

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Database configuration incomplete in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database configuration loaded${NC}"

# Step 3: Test database connection
echo -e "\n${BLUE}Step 3/4: Testing database connection...${NC}"
log "Testing database connectivity"

if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    log "ERROR: Database connection failed"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 4: Restore database from backup
echo -e "\n${BLUE}Step 4/4: Restoring database from backup...${NC}"
log "Starting database restore from $SELECTED_BACKUP"

# Create restore command
RESTORE_CMD="mysql -h \"$DB_HOST\" -u \"$DB_USER\" -p\"$DB_PASSWORD\" \"$DB_NAME\" < \"$SELECTED_BACKUP\""

# Execute restore
if eval $RESTORE_CMD; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
    log "Database restore completed successfully"
else
    echo -e "${RED}❌ Database restore failed${NC}"
    log "ERROR: Database restore failed"
    exit 1
fi

# Verify restore
echo -e "\n${BLUE}Verifying restore...${NC}"
TABLE_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null | tail -n 1)

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Restore verified: $TABLE_COUNT tables restored${NC}"
    log "Restore verified: $TABLE_COUNT tables found"
else
    echo -e "${YELLOW}⚠️  Warning: No tables found after restore${NC}"
    log "WARNING: No tables found after restore"
fi

# Success message
echo -e "\n${GREEN}🎉 ROLLBACK COMPLETED SUCCESSFULLY!${NC}"
echo "================================="
echo -e "${BLUE}📊 Rollback Summary:${NC}"
echo -e "   • Backup file: $(basename "$SELECTED_BACKUP")"
echo -e "   • Database: Restored from backup"
echo -e "   • Tables: $TABLE_COUNT tables restored"
echo -e "   • Log: $ROLLBACK_LOG"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Test the restored database"
echo -e "   2. Start your application manually"
echo -e "   3. Verify all data is accessible"
echo -e "   4. Check application functionality"
echo ""
echo -e "${BLUE}🔧 Manual Start Commands:${NC}"
echo -e "   • Start server: npm start"
echo -e "   • Check status: ps aux | grep node"
echo -e "   • View logs: tail -f logs/server.log"

log "Rollback completed successfully"

echo -e "\n${GREEN}✅ Your system has been rolled back to the selected backup.${NC}"
echo -e "${YELLOW}Remember to start your application manually when ready.${NC}"