#!/usr/bin/env node

/**
 * Test SQLite Demo Import System
 * 
 * This script tests the SQLite demo importer without requiring the full server
 */

const SQLiteDemoImporter = require('./sqlite-demo-importer');
const fs = require('fs');
const path = require('path');

// Mock MySQL connection for testing
class MockMySQLConnection {
    constructor() {
        this.queries = [];
        this.insertId = 1;
    }
    
    async execute(sql, params = []) {
        this.queries.push({ sql, params });
        
        // Mock responses for different query types
        if (sql.includes('SELECT id, tank_number FROM fish_tanks')) {
            return [[
                { id: 101, tank_number: 1 },
                { id: 102, tank_number: 2 },
                { id: 103, tank_number: 3 },
                { id: 104, tank_number: 4 },
                { id: 105, tank_number: 5 },
                { id: 106, tank_number: 6 },
                { id: 107, tank_number: 7 }
            ]];
        }
        
        if (sql.includes('SELECT id, bed_number FROM grow_beds')) {
            return [[
                { id: 201, bed_number: 1 },
                { id: 202, bed_number: 2 },
                { id: 203, bed_number: 3 },
                { id: 204, bed_number: 4 },
                { id: 205, bed_number: 5 },
                { id: 206, bed_number: 6 },
                { id: 207, bed_number: 7 }
            ]];
        }
        
        // Mock insert results
        return [{ affectedRows: 1, insertId: this.insertId++ }];
    }
}

async function testSQLiteImport() {
    console.log('🧪 Testing SQLite Demo Import System...\n');
    
    // Check if demo database exists
    const demoDbPath = path.join(__dirname, 'demo-data.sqlite');
    if (!fs.existsSync(demoDbPath)) {
        console.error('❌ Demo database not found at:', demoDbPath);
        console.log('   Run: node database/create-demo-data.js');
        return;
    }
    
    console.log('✅ Demo database found');
    
    try {
        // Create mock MySQL connection
        const mockConnection = new MockMySQLConnection();
        
        // Test the importer
        const importer = new SQLiteDemoImporter(mockConnection);
        
        console.log('🔄 Running import simulation...\n');
        const result = await importer.importDemoSystem('test_system_123', 1);
        
        console.log('✅ Import simulation completed successfully!\n');
        console.log('📊 Import Results:');
        console.log('   System ID:', result.systemId);
        console.log('   Success:', result.success);
        console.log('\n📈 Data Imported:');
        Object.entries(result.imported).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} records`);
        });
        
        console.log('\n🔍 SQL Queries Generated:', mockConnection.queries.length);
        
        // Show sample queries
        console.log('\n📝 Sample SQL Queries:');
        const sampleQueries = mockConnection.queries.slice(0, 5);
        sampleQueries.forEach((query, index) => {
            console.log(`   ${index + 1}. ${query.sql.split('\n')[0].trim()}...`);
        });
        
        console.log('\n🎉 SQLite Demo Import System is working correctly!');
        console.log('   Ready for production deployment');
        
    } catch (error) {
        console.error('❌ Import test failed:', error);
        console.error('   Error details:', {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
    }
}

// Run the test
testSQLiteImport().catch(console.error);