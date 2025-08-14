-- Water Quality Table Archive
-- Archived on: 2025-08-14T06:29:16.449Z
-- Original table: water_quality (migrated to nutrient_readings)
-- Records at archive time: 0

-- TABLE STRUCTURE BACKUP
-- This table has been successfully migrated to nutrient_readings
-- All water quality and nutrient data is now stored in nutrient_readings table

CREATE TABLE water_quality_archived_2025-08-14 (
    id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    system_id varchar(255) NOT NULL INDEX,
    date varchar(20) NOT NULL,
    ph decimal(4,2) NULL,
    ec decimal(8,2) NULL,
    dissolved_oxygen decimal(6,2) NULL,
    temperature decimal(5,2) NULL,
    ammonia decimal(8,2) NULL,
    nitrite decimal(8,2) NULL,
    nitrate decimal(8,2) NULL,
    iron decimal(8,2) NULL,
    potassium decimal(8,2) NULL,
    calcium decimal(8,2) NULL,
    phosphorus decimal(8,2) NULL,
    magnesium decimal(8,2) NULL,
    humidity decimal(8,2) NULL,
    salinity decimal(8,2) NULL,
    notes text NULL,
    created_at timestamp NOT NULL DEFAULT 'current_timestamp()'
);

-- MIGRATION STATUS
-- ✅ All data successfully migrated to nutrient_readings table
-- ✅ API endpoints updated to use nutrient_readings
-- ✅ Frontend updated to use new data structure  
-- ✅ No active INSERT/UPDATE operations to water_quality
-- ✅ Table confirmed empty (0 records)

-- MIGRATION SUMMARY:
-- - Total records migrated: Previously migrated
-- - New storage location: nutrient_readings table
-- - Migration completed: 2025/08/14
-- - Safe to drop original water_quality table

-- TO RESTORE (if needed):
-- 1. Run this SQL to recreate the table structure
-- 2. Data can be restored from nutrient_readings using reverse migration
-- 3. Contact system administrator for assistance

-- ARCHIVE METADATA:
-- Archive date: 2025-08-14T06:29:16.476Z
-- System: Afraponix Go v4.0.0
-- Database: MariaDB/MySQL
-- Migration framework: Complete restructure to nutrient_readings
