#!/usr/bin/env node

/**
 * Afraponix Go - Migration Testing Script
 * Tests the new database structure and basic functionality
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

class MigrationTester {
    constructor() {
        this.connection = null;
        this.testResults = [];
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            charset: 'utf8mb4'
        });
        console.log('🔗 Connected to database');
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Disconnected from database');
        }
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`\n🧪 Testing: ${testName}`);
            await testFunction();
            console.log(`✅ PASSED: ${testName}`);
            this.testResults.push({ name: testName, status: 'PASSED' });
        } catch (error) {
            console.log(`❌ FAILED: ${testName}`);
            console.log(`   Error: ${error.message}`);
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    async testTableStructure() {
        const requiredTables = [
            'users', 'systems', 'fish_tanks', 'grow_beds', 'water_quality',
            'plant_growth', 'fish_events', 'nutrient_readings', 'custom_crops',
            'plant_allocations', 'spray_programmes', 'sensor_config'
        ];

        const [tables] = await this.connection.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
            [process.env.DB_NAME]
        );

        const existingTables = tables.map(row => row.table_name || row.TABLE_NAME);
        
        for (const table of requiredTables) {
            if (!existingTables.includes(table)) {
                throw new Error(`Required table '${table}' not found`);
            }
        }

        console.log(`   📋 Found all ${requiredTables.length} required tables`);
    }

    async testTableIndexes() {
        const criticalIndexes = [
            { table: 'water_quality', index: 'idx_system_date' },
            { table: 'plant_growth', index: 'idx_system_bed_date' },
            { table: 'fish_events', index: 'idx_fish_events_system_tank_date' },
            { table: 'users', index: 'idx_email' }
        ];

        for (const { table, index } of criticalIndexes) {
            const [indexes] = await this.connection.execute(
                `SHOW INDEX FROM ${table} WHERE Key_name = ?`,
                [index]
            );

            if (indexes.length === 0) {
                throw new Error(`Critical index '${index}' not found on table '${table}'`);
            }
        }

        console.log(`   📊 Verified ${criticalIndexes.length} critical indexes`);
    }

    async testForeignKeys() {
        const [constraints] = await this.connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.key_column_usage 
            WHERE table_schema = ? AND referenced_table_name IS NOT NULL
        `, [process.env.DB_NAME]);

        const fkCount = constraints[0].count;
        if (fkCount < 10) {
            throw new Error(`Expected at least 10 foreign keys, found ${fkCount}`);
        }

        console.log(`   🔗 Found ${fkCount} foreign key constraints`);
    }

    async testDataTypes() {
        // Test that critical columns have correct data types
        const columnChecks = [
            { table: 'water_quality', column: 'temperature', type: 'DECIMAL' },
            { table: 'fish_tanks', column: 'volume_liters', type: 'DECIMAL' },
            { table: 'plant_growth', column: 'harvest_weight_g', type: 'DECIMAL' },
            { table: 'systems', column: 'configuration', type: 'JSON' }
        ];

        for (const { table, column, type } of columnChecks) {
            const [columns] = await this.connection.execute(`
                SELECT DATA_TYPE 
                FROM information_schema.columns 
                WHERE table_schema = ? AND table_name = ? AND column_name = ?
            `, [process.env.DB_NAME, table, column]);

            if (columns.length === 0) {
                throw new Error(`Column '${column}' not found in table '${table}'`);
            }

            const actualType = columns[0].DATA_TYPE.toUpperCase();
            if (!actualType.includes(type)) {
                throw new Error(`Column '${table}.${column}' has type '${actualType}', expected '${type}'`);
            }
        }

        console.log(`   🎯 Verified ${columnChecks.length} critical column types`);
    }

    async testBasicOperations() {
        // Test basic CRUD operations on key tables
        
        // Insert test user
        const [userResult] = await this.connection.execute(`
            INSERT INTO users (username, email, password_hash, role) 
            VALUES ('test_user', 'test@example.com', 'test_hash', 'user')
        `);
        
        const userId = userResult.insertId;

        // Insert test system
        const [systemResult] = await this.connection.execute(`
            INSERT INTO systems (user_id, system_name, system_type) 
            VALUES (?, 'Test System', 'media_bed')
        `, [userId]);
        
        const systemId = systemResult.insertId;

        // Insert test fish tank
        await this.connection.execute(`
            INSERT INTO fish_tanks (system_id, tank_number, volume_liters, fish_type) 
            VALUES (?, 1, 1000, 'tilapia')
        `, [systemId]);

        // Insert test grow bed
        const [bedResult] = await this.connection.execute(`
            INSERT INTO grow_beds (system_id, bed_number, area_m2, bed_type) 
            VALUES (?, 1, 2.5, 'media_bed')
        `, [systemId]);

        const bedId = bedResult.insertId;

        // Insert test plant growth record
        await this.connection.execute(`
            INSERT INTO plant_growth (system_id, grow_bed_id, crop_variety, plant_count, event_date) 
            VALUES (?, ?, 'lettuce', 20, NOW())
        `, [systemId, bedId]);

        // Clean up test data
        await this.connection.execute('DELETE FROM users WHERE id = ?', [userId]);
        
        console.log(`   ✍️ Successfully performed CRUD operations`);
    }

    async testTriggers() {
        // Test if triggers are working by checking if they exist
        const [triggers] = await this.connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.triggers 
            WHERE trigger_schema = ?
        `, [process.env.DB_NAME]);

        const triggerCount = triggers[0].count;
        console.log(`   ⚡ Found ${triggerCount} database triggers`);
        
        if (triggerCount === 0) {
            console.log(`   ℹ️  No triggers found (this may be normal)`);
        }
    }

    async testPerformance() {
        // Test query performance on key operations
        const start = Date.now();
        
        // Simulate common query patterns
        await this.connection.execute(`
            SELECT s.system_name, COUNT(ft.id) as tank_count, COUNT(gb.id) as bed_count
            FROM systems s
            LEFT JOIN fish_tanks ft ON s.id = ft.system_id
            LEFT JOIN grow_beds gb ON s.id = gb.system_id
            GROUP BY s.id, s.system_name
            LIMIT 100
        `);

        const queryTime = Date.now() - start;
        
        if (queryTime > 1000) {
            throw new Error(`Query took too long: ${queryTime}ms`);
        }

        console.log(`   🚀 Query performance: ${queryTime}ms`);
    }

    async printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 MIGRATION TEST SUMMARY');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📋 Total:  ${this.testResults.length}`);
        
        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.error}`);
                });
        }
        
        console.log('\n' + '='.repeat(50));
        
        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Migration appears successful.');
            return true;
        } else {
            console.log('⚠️  SOME TESTS FAILED! Review the issues above.');
            return false;
        }
    }

    async runAllTests() {
        try {
            await this.connect();
            
            console.log('🧪 Running Afraponix Go Migration Tests...');
            console.log('='.repeat(50));
            
            // Run all tests
            await this.runTest('Table Structure', () => this.testTableStructure());
            await this.runTest('Database Indexes', () => this.testTableIndexes());
            await this.runTest('Foreign Keys', () => this.testForeignKeys());
            await this.runTest('Data Types', () => this.testDataTypes());
            await this.runTest('Basic Operations', () => this.testBasicOperations());
            await this.runTest('Database Triggers', () => this.testTriggers());
            await this.runTest('Query Performance', () => this.testPerformance());
            
            const success = await this.printSummary();
            return success;
            
        } catch (error) {
            console.error('\n💥 Test suite crashed:', error.message);
            return false;
        } finally {
            await this.disconnect();
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MigrationTester();
    
    tester.runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { MigrationTester };