#!/bin/bash

# SQLite to MariaDB Migration Script
# Run this script to migrate existing SQLite data to MariaDB

set -e

SQLITE_DB="/var/www/aquaponics-app/aquaponics.db"
MARIADB_DB="aquaponics"
MARIADB_USER="aquaponics"

echo "🔄 Migrating SQLite data to MariaDB..."

# Check if SQLite database exists
if [ ! -f "$SQLITE_DB" ]; then
    echo "❌ SQLite database not found at: $SQLITE_DB"
    exit 1
fi

echo "📊 Current SQLite data:"
sqlite3 $SQLITE_DB "SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as systems FROM systems;"

# Export SQLite data to SQL dump
echo "📤 Exporting SQLite data..."
sqlite3 $SQLITE_DB .dump > sqlite_export.sql

# Clean up the dump for MariaDB compatibility
echo "🔧 Converting SQLite dump to MariaDB format..."
sed -i 's/AUTOINCREMENT/AUTO_INCREMENT/g' sqlite_export.sql
sed -i '/^PRAGMA/d' sqlite_export.sql
sed -i '/^BEGIN TRANSACTION/d' sqlite_export.sql
sed -i '/^COMMIT/d' sqlite_export.sql

# Import to MariaDB
echo "📥 Importing data to MariaDB..."
read -p "Enter MariaDB root password: " -s MARIADB_ROOT_PASS
echo

mysql -u root -p$MARIADB_ROOT_PASS $MARIADB_DB < sqlite_export.sql

# Verify migration
echo "✅ Migration completed. Verifying data..."
mysql -u root -p$MARIADB_ROOT_PASS -e "USE $MARIADB_DB; SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as systems FROM systems;"

# Clean up
rm sqlite_export.sql

echo "🎉 Migration completed successfully!"
echo "📝 Don't forget to update your .env file to use MariaDB connection"