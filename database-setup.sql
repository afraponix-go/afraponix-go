-- Afraponix Go Database Setup Script
-- Run this script on your MariaDB server

-- Create database
CREATE DATABASE IF NOT EXISTS aquaponics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (change password!)
CREATE USER IF NOT EXISTS 'aquaponics'@'localhost' IDENTIFIED BY 'change_this_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON aquaponics.* TO 'aquaponics'@'localhost';
FLUSH PRIVILEGES;

-- Show created database and user
SHOW DATABASES LIKE 'aquaponics';
SELECT User, Host FROM mysql.user WHERE User = 'aquaponics';

-- Use the database
USE aquaponics;

-- Tables will be created automatically by the application
-- This script just sets up the database and user