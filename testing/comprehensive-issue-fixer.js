#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Comprehensive Issue Fixer for Afraponix Go\n');
console.log('='.repeat(80) + '\n');

const projectRoot = path.resolve(__dirname, '..');
const scriptFile = path.join(projectRoot, 'script.js');

// Read current content
let scriptContent = fs.readFileSync(scriptFile, 'utf8');
const originalContent = scriptContent;

let totalFixes = 0;
const fixLog = [];

// ============================================================================
// FIX 1: Crop name singular/plural normalization
// ============================================================================
console.log('🌱 Fixing crop endpoint singular/plural issues...');

// Map of singular to plural forms for crops
const cropPlurals = {
    'tomato': 'tomatoes',
    'potato': 'potatoes',
    'chili': 'chilies',
    'berry': 'berries'
};

// Find all crop endpoint calls
const cropEndpointPattern = /\/api\/crop-knowledge\/crops\/([a-z]+)/g;
let match;
let cropFixes = 0;

while ((match = cropEndpointPattern.exec(scriptContent)) !== null) {
    const cropName = match[1];
    if (cropPlurals[cropName]) {
        const oldPattern = `/api/crop-knowledge/crops/${cropName}`;
        const newPattern = `/api/crop-knowledge/crops/${cropPlurals[cropName]}`;
        
        // Count occurrences
        const occurrences = scriptContent.split(oldPattern).length - 1;
        if (occurrences > 0) {
            scriptContent = scriptContent.split(oldPattern).join(newPattern);
            cropFixes += occurrences;
            fixLog.push(`   ✅ Fixed ${cropName} → ${cropPlurals[cropName]}: ${occurrences} occurrences`);
        }
    }
}

if (cropFixes > 0) {
    console.log(`   Fixed ${cropFixes} crop name issues`);
    totalFixes += cropFixes;
} else {
    console.log('   No crop name issues found');
}

// ============================================================================
// FIX 2: Check and fix any remaining missing /api prefixes
// ============================================================================
console.log('\n🌐 Checking for missing /api prefixes in fetch calls...');

// Pattern to find fetch calls without /api prefix for known API routes
const needsApiPrefix = [
    { pattern: /fetch\(['"]\/crop-knowledge\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/admin\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/auth\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/data\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/systems\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/fish-/g, prefix: '/api' },
    { pattern: /fetch\(['"]\/grow-beds\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/sensors\//g, prefix: '/api' },
    { pattern: /fetch\(['"]\/custom-crops\//g, prefix: '/api' }
];

let prefixFixes = 0;
for (const { pattern, prefix } of needsApiPrefix) {
    const matches = scriptContent.match(pattern);
    if (matches) {
        matches.forEach(match => {
            const fixedMatch = match.replace(/fetch\(['"]\//, `fetch('${prefix}/`);
            scriptContent = scriptContent.replace(match, fixedMatch);
            prefixFixes++;
        });
    }
}

if (prefixFixes > 0) {
    console.log(`   Fixed ${prefixFixes} missing /api prefixes`);
    fixLog.push(`   ✅ Fixed ${prefixFixes} missing /api prefixes`);
    totalFixes += prefixFixes;
} else {
    console.log('   All fetch calls have proper /api prefixes');
}

// ============================================================================
// FIX 3: Fix admin panel auto-loading issues
// ============================================================================
console.log('\n👤 Verifying admin panel auto-loading...');

// Check if admin auto-loading is properly configured
const adminAutoLoadPattern = /setTimeout\(async \(\) => \{[\s\S]*?this\.loadAdminUsers\(\);[\s\S]*?\}, 1000\)/;
const hasAdminAutoLoad = adminAutoLoadPattern.test(scriptContent);

if (hasAdminAutoLoad) {
    console.log('   ✅ Admin panel auto-loading is properly configured');
} else {
    console.log('   ⚠️  Admin panel auto-loading may need manual verification');
    fixLog.push('   ⚠️  Admin panel auto-loading needs manual verification');
}

// ============================================================================
// FIX 4: Check for and fix any double slashes in URLs
// ============================================================================
console.log('\n🔗 Checking for double slashes in API URLs...');

const doubleSlashPattern = /\/api\/\//g;
const doubleSlashMatches = scriptContent.match(doubleSlashPattern);

if (doubleSlashMatches) {
    const count = doubleSlashMatches.length;
    scriptContent = scriptContent.replace(doubleSlashPattern, '/api/');
    console.log(`   Fixed ${count} double slashes`);
    fixLog.push(`   ✅ Fixed ${count} double slashes in URLs`);
    totalFixes += count;
} else {
    console.log('   No double slash issues found');
}

// ============================================================================
// FIX 5: Verify all icon references use correct paths
// ============================================================================
console.log('\n🎨 Checking icon references...');

// Check for incorrect icon paths
const iconPathPattern = /['"]\/icons\/new-icons\/([^'"]+)['"]/g;
let iconIssues = 0;

// Reset lastIndex for new search
iconPathPattern.lastIndex = 0;

while ((match = iconPathPattern.exec(scriptContent)) !== null) {
    const iconName = match[1];
    
    // Check for common issues
    if (iconName.includes('${')) {
        // Template literal inside regular string
        console.log(`   ⚠️  Found template literal in icon path: ${iconName}`);
        iconIssues++;
    }
}

if (iconIssues > 0) {
    fixLog.push(`   ⚠️  Found ${iconIssues} icon path issues that need manual review`);
} else {
    console.log('   All icon paths appear correct');
}

// ============================================================================
// SAVE CHANGES
// ============================================================================
if (totalFixes > 0) {
    console.log('\n💾 Saving changes...');
    
    // Create backup
    const timestamp = Date.now();
    const backupPath = `${scriptFile}.backup-${timestamp}`;
    fs.writeFileSync(backupPath, originalContent);
    console.log(`   Backup created: ${backupPath}`);
    
    // Save fixed content
    fs.writeFileSync(scriptFile, scriptContent);
    console.log(`   Changes saved to: ${scriptFile}`);
    
    // Save detailed fix report
    const reportPath = path.join(projectRoot, 'testing', `fix-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalFixes,
        fixLog,
        backup: backupPath
    }, null, 2));
    console.log(`   Report saved to: ${reportPath}`);
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📊 FIX SUMMARY');
console.log('='.repeat(80) + '\n');

if (fixLog.length > 0) {
    fixLog.forEach(log => console.log(log));
    console.log(`\n✅ Total fixes applied: ${totalFixes}`);
} else {
    console.log('✅ No issues found - code appears to be clean!');
}

// ============================================================================
// NEXT STEPS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📝 NEXT STEPS');
console.log('='.repeat(80) + '\n');

console.log('1. Refresh the browser (Ctrl+F5 to clear cache)');
console.log('2. Check browser console for any remaining errors');
console.log('3. Test the admin panel functionality');
console.log('4. Verify that crop knowledge endpoints are working');

if (totalFixes > 0) {
    console.log('\n⚠️  Note: The server is still running. The changes will take effect on next page refresh.');
}

process.exit(0);