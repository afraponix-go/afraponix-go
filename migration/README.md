# Afraponix Go - Complete System Migration

This directory contains all the tools and scripts needed to completely migrate from the old Afraponix system to the new enhanced version.

## ⚠️ IMPORTANT WARNING

**This migration will COMPLETELY REPLACE your existing database structure and data.** The new system has been redesigned from the ground up with enhanced features, improved performance, and better data organization.

## 📋 What's New in Afraponix Go

### Enhanced Features
- **Advanced Plant Batch Tracking** - Track individual plant batches with detailed lifecycle data
- **Custom Crop Management** - Create and manage custom crop varieties
- **Plant Allocation System** - Allocate specific crops to grow bed sections
- **Enhanced Water Quality** - Additional parameters including humidity, salinity, TDS
- **Spray Programme Management** - Complete pesticide and foliar feeding schedules
- **Sensor Integration** - ThingsBoard sensor configuration and data collection
- **Improved Fish Management** - Detailed fish event tracking and health monitoring
- **Nutrient Tracking** - Separate nutrient readings with laboratory-grade tracking
- **Performance Optimization** - Better database indexes and query optimization

### Database Changes
- **11 New/Enhanced Tables** - Complete restructure for better data organization
- **Advanced Indexing** - Optimized for query performance
- **Data Validation** - Database-level constraints and triggers
- **Foreign Keys** - Proper relational integrity
- **JSON Fields** - Flexible configuration storage

## 🚀 Migration Process

### Pre-Migration Checklist

1. **Backup Current Data**
   - All existing data will be backed up automatically
   - Backups stored in `migration/backups/`
   - Both SQL and JSON formats created

2. **Environment Setup**
   - Ensure `.env` file is configured
   - Database credentials must be correct
   - Node.js and npm must be installed

3. **System Requirements**
   - Node.js 16+ 
   - MariaDB/MySQL 8.0+
   - Sufficient disk space for backups

### Migration Steps

#### Option 1: Automated Migration (Recommended)

```bash
# Run the complete automated migration
./migration/deploy-new-system.sh
```

This script will:
1. ✅ Run pre-deployment checks
2. 🛑 Stop existing services  
3. 📦 Install dependencies
4. 💾 Create database backup
5. 🔄 Migrate database structure
6. ⚙️ Update configuration
7. 🧪 Run tests
8. 🚀 Start new system

#### Option 2: Manual Migration

```bash
# 1. Create backup first
node migration/backup-database.js

# 2. Run database migration
node migration/migrate-to-new-structure.js

# 3. Start the application
npm start
```

## 📁 File Structure

```
migration/
├── README.md                    # This documentation
├── deploy-new-system.sh         # Complete automated deployment
├── backup-database.js           # Database backup utility
├── migrate-to-new-structure.js  # Database migration script
├── backups/                     # Database backups (created during migration)
│   ├── afraponix-backup-*.sql   # SQL backup files
│   └── afraponix-data-*.json    # JSON data exports
└── logs/                        # Migration logs
    └── migration-*.log          # Detailed migration logs
```

## 🗃️ New Database Schema

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User management | Enhanced with roles, preferences, email verification |
| `systems` | Aquaponics systems | System-wide configuration, status tracking |
| `fish_tanks` | Fish tank details | Position tracking, capacity, fish counts |
| `grow_beds` | Growing beds | Position, area, bed type, allocation tracking |
| `water_quality` | Water parameters | Enhanced with humidity, salinity, TDS |
| `plant_growth` | Plant lifecycle | Batch tracking, harvest data, growth stages |
| `fish_events` | Fish activities | Feeding, health, mortality, harvest events |
| `nutrient_readings` | Nutrient levels | Separated from water quality, lab-grade tracking |
| `custom_crops` | Crop varieties | User-defined crops with growing requirements |
| `plant_allocations` | Bed allocations | Crop assignments to specific bed areas |
| `spray_programmes` | Spray schedules | Pesticide and foliar feeding programs |
| `sensor_config` | Sensor setup | ThingsBoard integration, calibration |

### Key Improvements

1. **Normalized Structure** - Properly separated concerns
2. **Performance Indexes** - Optimized for common queries
3. **Data Integrity** - Foreign key constraints
4. **Audit Trail** - Created/updated timestamps
5. **Flexible Configuration** - JSON fields for complex data

## 🔄 Data Migration Strategy

### What Gets Migrated
- ✅ User accounts and basic information
- ✅ System configurations
- ✅ Fish tank setups
- ✅ Grow bed configurations
- ✅ Historical water quality data
- ✅ Plant and harvest records

### What Gets Enhanced
- 🔄 Water quality data → Enhanced with new parameters
- 🔄 Plant records → Batch tracking system
- 🔄 Fish data → Detailed event tracking
- 🔄 User data → Role-based access, preferences

### What's New
- 🆕 Custom crop varieties
- 🆕 Plant allocation system
- 🆕 Spray programme management
- 🆕 Sensor configuration
- 🆕 Nutrient tracking system

## 🔧 Post-Migration Tasks

### 1. System Verification
```bash
# Check all services are running
ps aux | grep node

# Test web interface
curl http://localhost:8000

# Check logs
tail -f logs/server.log
```

### 2. User Account Setup
- Default admin account: `admin@afraponix.com`
- Set up additional user accounts as needed
- Configure user roles and permissions

### 3. System Configuration
- Configure sensor integrations
- Set up custom crop varieties
- Create spray programmes
- Configure plant allocations

### 4. Data Validation
- Verify all historical data migrated correctly
- Check water quality readings
- Validate plant and fish records
- Test all system functionality

## 🚨 Troubleshooting

### Migration Fails

1. **Check database connection**
   ```bash
   # Test connection
   mysql -h $DB_HOST -u $DB_USER -p $DB_NAME
   ```

2. **Check backup files**
   ```bash
   # List backups
   ls -la migration/backups/
   ```

3. **Review migration logs**
   ```bash
   # Check latest log
   tail -f migration/logs/migration-*.log
   ```

### Rollback Procedure

If migration fails and you need to rollback:

```bash
# 1. Stop new application
pkill -f "node.*server"

# 2. Restore from backup
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < migration/backups/afraponix-backup-*.sql

# 3. Restart old system (if available)
# Follow your previous startup procedure
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Database not running | Start MariaDB/MySQL service |
| Permission denied | Insufficient DB privileges | Grant ALL privileges to user |
| Backup fails | Disk space | Free up disk space |
| Migration timeout | Large database | Increase timeout values |
| Port in use | Previous app running | Kill existing processes |

## 📊 Performance Tuning

### Database Optimization
```sql
-- Optimize tables after migration
OPTIMIZE TABLE users, systems, fish_tanks, grow_beds, water_quality;

-- Check index usage
SHOW INDEX FROM water_quality;

-- Analyze query performance
EXPLAIN SELECT * FROM plant_growth WHERE system_id = 1;
```

### Application Tuning
```bash
# Monitor memory usage
top -p $(pgrep node)

# Check process status
systemctl status afraponix-go  # if using systemd
```

## 🔒 Security Considerations

### Post-Migration Security
1. **Change default passwords** - Update admin account credentials
2. **Configure SSL** - Set up HTTPS for production
3. **Firewall rules** - Restrict database access
4. **Regular backups** - Set up automated backup schedule
5. **Monitor logs** - Set up log monitoring and alerts

### Environment Variables
Ensure all sensitive data is in environment variables:
```bash
DB_HOST=localhost
DB_USER=afraponix_user  
DB_PASSWORD=secure_password
DB_NAME=afraponix_go
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## 📈 Monitoring & Maintenance

### Health Checks
```bash
# System health check
curl http://localhost:8000/api/health

# Database health
mysql -e "SELECT 'OK' as status"

# Disk space
df -h
```

### Regular Maintenance
- **Weekly**: Check application logs
- **Monthly**: Database optimization
- **Quarterly**: Security updates
- **Annually**: Full system backup verification

## 📞 Support

If you encounter issues during migration:

1. **Check documentation** - Review this README and migration logs
2. **Check backups** - Ensure you have valid backup files
3. **Test rollback** - Verify you can restore from backup if needed
4. **Contact support** - Provide migration logs and error details

## 🎯 Success Metrics

After migration, verify these metrics:

- ✅ All users can log in
- ✅ All systems display correctly
- ✅ Historical data is accessible
- ✅ New features are functional
- ✅ Performance is acceptable
- ✅ Backups are created
- ✅ Monitoring is active

## 📝 Version Information

- **Migration Version**: 2.0.0
- **Database Schema Version**: 2.0
- **Compatibility**: Replaces all previous versions
- **PHP Requirement**: None (Node.js only)
- **Database**: MariaDB 10.5+ or MySQL 8.0+

---

## 🚀 Ready to Migrate?

When you're ready to proceed with the migration:

```bash
# Run the automated migration
./migration/deploy-new-system.sh
```

**Remember**: This will completely replace your existing system. Make sure you have reviewed this documentation and are prepared for the migration process.

Good luck with your Afraponix Go upgrade! 🌱🐟