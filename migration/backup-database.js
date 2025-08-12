#!/usr/bin/env node

/**
 * Complete Database Backup Script for Afraponix Go Migration
 * Creates a full backup of all tables and data before migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

async function createDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, 'backups');
    const backupFile = path.join(backupDir, `afraponix-backup-${timestamp}.sql`);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    let connection;
    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });

        console.log('🔗 Connected to database for backup');

        // Get all table names
        const [tables] = await connection.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
            [process.env.DB_NAME]
        );

        let backupSQL = `-- Afraponix Go Database Backup
-- Generated: ${new Date().toISOString()}
-- Database: ${process.env.DB_NAME}
-- 
-- This backup contains all data and structure from the previous version
-- before migration to the new Afraponix Go system

SET FOREIGN_KEY_CHECKS = 0;

`;

        // Backup each table
        for (const table of tables) {
            const tableName = table.table_name || table.TABLE_NAME;
            console.log(`📋 Backing up table: ${tableName}`);

            // Get table structure
            const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
            const createStatement = createTable[0]['Create Table'];
            
            backupSQL += `-- Table structure for ${tableName}\n`;
            backupSQL += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            backupSQL += `${createStatement};\n\n`;

            // Get table data
            const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
            
            if (rows.length > 0) {
                backupSQL += `-- Data for ${tableName}\n`;
                backupSQL += `INSERT INTO \`${tableName}\` VALUES \n`;
                
                const values = rows.map(row => {
                    const rowValues = Object.values(row).map(value => {
                        if (value === null) return 'NULL';
                        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                        if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        return value;
                    });
                    return `(${rowValues.join(', ')})`;
                });

                backupSQL += values.join(',\n') + ';\n\n';
            }
        }

        backupSQL += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        // Write backup file
        await fs.writeFile(backupFile, backupSQL, 'utf8');

        console.log(`✅ Database backup completed: ${backupFile}`);
        console.log(`📊 Backed up ${tables.length} tables`);

        // Also create a JSON backup for data analysis
        const jsonBackup = {};
        for (const table of tables) {
            const tableName = table.table_name || table.TABLE_NAME;
            const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
            jsonBackup[tableName] = rows;
        }

        const jsonBackupFile = path.join(backupDir, `afraponix-data-${timestamp}.json`);
        await fs.writeFile(jsonBackupFile, JSON.stringify(jsonBackup, null, 2), 'utf8');

        console.log(`📋 JSON data backup created: ${jsonBackupFile}`);

        return {
            sqlBackup: backupFile,
            jsonBackup: jsonBackupFile,
            tableCount: tables.length
        };

    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run backup if called directly
if (require.main === module) {
    createDatabaseBackup()
        .then((result) => {
            console.log('\n🎉 Backup completed successfully!');
            console.log(`📁 SQL Backup: ${result.sqlBackup}`);
            console.log(`📁 JSON Backup: ${result.jsonBackup}`);
            console.log(`📊 Tables backed up: ${result.tableCount}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Backup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { createDatabaseBackup };