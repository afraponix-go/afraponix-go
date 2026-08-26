#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Automated Issue Fixer for Afraponix Go...\n');

const projectRoot = path.resolve(__dirname, '..');
const scriptFile = path.join(projectRoot, 'script.js');

// Read the script file
let scriptContent = fs.readFileSync(scriptFile, 'utf8');
const originalContent = scriptContent;

// Track fixes
let fixCount = 0;
const fixes = [];

// 1. FIX CROP-KNOWLEDGE API ENDPOINTS
console.log('🌐 Fixing crop-knowledge API endpoints...');

const endpointFixes = [
    {
        pattern: /fetch\(['"]\/crop-knowledge\/admin\/ratio-rules['"]/g,
        replacement: "fetch('/api/crop-knowledge/admin/ratio-rules'",
        description: 'Fix ratio-rules endpoint'
    },
    {
        pattern: /fetch\(['"]\/crop-knowledge\/admin\/environmental-adjustments['"]/g,
        replacement: "fetch('/api/crop-knowledge/admin/environmental-adjustments'",
        description: 'Fix environmental-adjustments endpoint'
    },
    {
        pattern: /fetch\(['"]\/crop-knowledge\/stages['"]/g,
        replacement: "fetch('/api/crop-knowledge/stages'",
        description: 'Fix stages endpoint'
    },
    {
        pattern: /fetch\(['"]\/crop-knowledge\/crops['"]/g,
        replacement: "fetch('/api/crop-knowledge/crops'",
        description: 'Fix crops endpoint'
    },
    {
        pattern: /fetch\(['"]\/crop-knowledge\/nutrients['"]/g,
        replacement: "fetch('/api/crop-knowledge/nutrients'",
        description: 'Fix nutrients endpoint'
    },
    {
        pattern: /fetch\(['"]\/crop-knowledge\/admin\/deficiency-images['"]/g,
        replacement: "fetch('/api/crop-knowledge/admin/deficiency-images'",
        description: 'Fix deficiency-images endpoint'
    }
];

// Apply endpoint fixes
for (const fix of endpointFixes) {
    const matches = scriptContent.match(fix.pattern);
    if (matches) {
        const count = matches.length;
        scriptContent = scriptContent.replace(fix.pattern, fix.replacement);
        fixCount += count;
        fixes.push(`✅ ${fix.description}: Fixed ${count} occurrence(s)`);
        console.log(`   ${fix.description}: Fixed ${count} occurrence(s)`);
    }
}

// 2. FIX DOUBLE API PREFIXES
console.log('\n🔍 Checking for double /api prefixes...');
const doubleApiPattern = /\/api\/api\//g;
const doubleApiMatches = scriptContent.match(doubleApiPattern);
if (doubleApiMatches) {
    const count = doubleApiMatches.length;
    scriptContent = scriptContent.replace(doubleApiPattern, '/api/');
    fixCount += count;
    fixes.push(`✅ Fixed ${count} double /api prefix(es)`);
    console.log(`   Fixed ${count} double /api prefix(es)`);
}

// 3. FIX SPECIFIC CROP ENDPOINT ISSUES
console.log('\n🌱 Fixing specific crop endpoint issues...');

// Fix the tomato endpoint that's causing 404s
const tomatoEndpointPattern = /\/api\/crop-knowledge\/crops\/tomato(?!es)/g;
const tomatoMatches = scriptContent.match(tomatoEndpointPattern);
if (tomatoMatches) {
    // Check if this should be 'tomatoes' instead
    const count = tomatoMatches.length;
    scriptContent = scriptContent.replace(tomatoEndpointPattern, '/api/crop-knowledge/crops/tomatoes');
    fixCount += count;
    fixes.push(`✅ Fixed tomato → tomatoes endpoint: ${count} occurrence(s)`);
    console.log(`   Fixed tomato → tomatoes endpoint: ${count} occurrence(s)`);
}

// 4. SAVE CHANGES
if (fixCount > 0) {
    console.log('\n💾 Saving changes to script.js...');
    
    // Create backup
    const backupPath = scriptFile + '.backup-' + Date.now();
    fs.writeFileSync(backupPath, originalContent);
    console.log(`   Backup created: ${backupPath}`);
    
    // Save fixed content
    fs.writeFileSync(scriptFile, scriptContent);
    console.log(`   Changes saved to: ${scriptFile}`);
} else {
    console.log('\n✅ No changes needed - all endpoints appear correct');
}

// 5. GENERATE REPORT
console.log('\n' + '='.repeat(80));
console.log('📊 FIX SUMMARY:');
console.log('='.repeat(80) + '\n');

if (fixes.length > 0) {
    fixes.forEach(fix => console.log(fix));
    console.log(`\n✅ Total fixes applied: ${fixCount}`);
} else {
    console.log('No fixes were necessary.');
}

// 6. ADDITIONAL RECOMMENDATIONS
console.log('\n' + '='.repeat(80));
console.log('📝 ADDITIONAL RECOMMENDATIONS:');
console.log('='.repeat(80) + '\n');

console.log('1. Restart the server to ensure changes take effect');
console.log('2. Clear browser cache and refresh the page');
console.log('3. Check server logs for any remaining 404 errors');
console.log('4. Verify that the crop-knowledge API routes exist on the server');

// Save fix report
const reportPath = path.join(projectRoot, 'testing', 'fix-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    fixCount,
    fixes,
    backupPath: fixCount > 0 ? backupPath : null
}, null, 2));

console.log(`\n📄 Fix report saved to: ${reportPath}`);

process.exit(0);