#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Automated Error Scanner for Afraponix Go...\n');

// Configuration
const projectRoot = path.resolve(__dirname, '..');
const iconPath = path.join(projectRoot, 'icons/new-icons');
const scriptFile = path.join(projectRoot, 'script.js');
const htmlFile = path.join(projectRoot, 'index.html');

// Track all issues found
const issues = {
    missingIcons: [],
    apiEndpoints: [],
    duplicateIds: [],
    missingFiles: [],
    brokenReferences: []
};

// 1. CHECK MISSING ICONS
console.log('📁 Checking for missing icon references...');
const iconReferences = new Set();

// Scan script.js for icon references
const scriptContent = fs.readFileSync(scriptFile, 'utf8');
const iconMatches = scriptContent.matchAll(/icons\/new-icons\/([^'"]+\.svg)/g);
for (const match of iconMatches) {
    iconReferences.add(match[1]);
}

// Scan HTML for icon references
const htmlContent = fs.readFileSync(htmlFile, 'utf8');
const htmlIconMatches = htmlContent.matchAll(/icons\/new-icons\/([^'"]+\.svg)/g);
for (const match of htmlIconMatches) {
    iconReferences.add(match[1]);
}

// Check if icons exist
const existingIcons = fs.readdirSync(iconPath);
for (const icon of iconReferences) {
    const decodedIcon = decodeURIComponent(icon);
    if (!existingIcons.includes(decodedIcon)) {
        issues.missingIcons.push(icon);
    }
}

// 2. CHECK API ENDPOINTS
console.log('🌐 Checking API endpoint consistency...');

// Extract all API calls from script.js
const apiPatterns = [
    // fetch calls
    /fetch\(['"`]([^'"`]+)['"`]/g,
    // makeApiCall calls
    /makeApiCall\(['"`]([^'"`]+)['"`]/g,
    // Direct API paths
    /['"`](\/api\/[^'"`]+)['"`]/g,
    /['"`](\/crop-knowledge\/[^'"`]+)['"`]/g,
];

const apiCalls = new Set();
for (const pattern of apiPatterns) {
    const matches = scriptContent.matchAll(pattern);
    for (const match of matches) {
        apiCalls.add(match[1]);
    }
}

// Known problematic endpoints from error logs
const problematicEndpoints = [
    '/crop-knowledge/stages',
    '/crop-knowledge/admin/ratio-rules', 
    '/crop-knowledge/admin/environmental-adjustments',
    '/api/crop-knowledge/crops/tomato'
];

// Check for problematic patterns
for (const endpoint of apiCalls) {
    // Check for double /api prefix
    if (endpoint.includes('/api/api/')) {
        issues.apiEndpoints.push({
            endpoint,
            issue: 'Double /api prefix',
            suggestion: endpoint.replace('/api/api/', '/api/')
        });
    }
    
    // Check for missing /api prefix in crop-knowledge calls
    if (endpoint.startsWith('/crop-knowledge/') && !endpoint.startsWith('/api/crop-knowledge/')) {
        issues.apiEndpoints.push({
            endpoint,
            issue: 'Missing /api prefix',
            suggestion: '/api' + endpoint
        });
    }
    
    // Check for known problematic endpoints
    if (problematicEndpoints.includes(endpoint)) {
        issues.apiEndpoints.push({
            endpoint,
            issue: 'Known 404 endpoint',
            suggestion: 'Check server route implementation'
        });
    }
}

// 3. CHECK FOR DUPLICATE HTML IDS
console.log('🔍 Checking for duplicate HTML element IDs...');
const idMatches = htmlContent.matchAll(/id=["']([^"']+)["']/g);
const idCounts = {};
for (const match of idMatches) {
    const id = match[1];
    idCounts[id] = (idCounts[id] || 0) + 1;
}

for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
        issues.duplicateIds.push({ id, count });
    }
}

// 4. CHECK FILE REFERENCES
console.log('📄 Checking file references...');
const fileReferences = new Set();

// Extract file references from script.js
const filePatterns = [
    /require\(['"`]([^'"`]+)['"`]\)/g,
    /import .+ from ['"`]([^'"`]+)['"`]/g,
];

for (const pattern of filePatterns) {
    const matches = scriptContent.matchAll(pattern);
    for (const match of matches) {
        fileReferences.add(match[1]);
    }
}

// Check if referenced files exist
for (const file of fileReferences) {
    const filePath = path.resolve(projectRoot, file);
    if (!fs.existsSync(filePath)) {
        issues.missingFiles.push(file);
    }
}

// 5. SPECIFIC KNOWN ISSUES
console.log('🎯 Checking specific known issues...');

// Check for chemistry.svg specifically
if (!existingIcons.includes('chemistry.svg')) {
    console.log('❌ chemistry.svg is missing!');
    // Try to find similar icon
    const similarIcons = existingIcons.filter(icon => 
        icon.toLowerCase().includes('chem') || 
        icon.toLowerCase().includes('nutrient') ||
        icon.toLowerCase().includes('parameters')
    );
    if (similarIcons.length > 0) {
        console.log('   Possible alternatives:', similarIcons);
    }
}

// GENERATE REPORT
console.log('\n' + '='.repeat(80));
console.log('📊 SCAN COMPLETE - ISSUES FOUND:');
console.log('='.repeat(80) + '\n');

// Report missing icons
if (issues.missingIcons.length > 0) {
    console.log(`❌ MISSING ICONS (${issues.missingIcons.length}):`);
    issues.missingIcons.forEach(icon => {
        console.log(`   - ${icon}`);
    });
    console.log();
}

// Report API endpoint issues
if (issues.apiEndpoints.length > 0) {
    console.log(`❌ API ENDPOINT ISSUES (${issues.apiEndpoints.length}):`);
    issues.apiEndpoints.forEach(({ endpoint, issue, suggestion }) => {
        console.log(`   - ${endpoint}`);
        console.log(`     Issue: ${issue}`);
        console.log(`     Suggestion: ${suggestion}`);
    });
    console.log();
}

// Report duplicate IDs
if (issues.duplicateIds.length > 0) {
    console.log(`❌ DUPLICATE HTML IDS (${issues.duplicateIds.length}):`);
    issues.duplicateIds.forEach(({ id, count }) => {
        console.log(`   - "${id}" appears ${count} times`);
    });
    console.log();
}

// Report missing files
if (issues.missingFiles.length > 0) {
    console.log(`❌ MISSING FILE REFERENCES (${issues.missingFiles.length}):`);
    issues.missingFiles.forEach(file => {
        console.log(`   - ${file}`);
    });
    console.log();
}

// Generate fix suggestions
console.log('='.repeat(80));
console.log('🔧 AUTOMATED FIX SUGGESTIONS:');
console.log('='.repeat(80) + '\n');

// Icon fixes
if (issues.missingIcons.includes('chemistry.svg')) {
    console.log('1. For chemistry.svg:');
    console.log('   Option A: Copy an existing chemistry-related icon:');
    console.log('   cp "icons/new-icons/Afraponix Go Icons_chemistry.svg" "icons/new-icons/chemistry.svg"');
    console.log('   Option B: Replace references in code to use existing icon');
    console.log();
}

// API endpoint fixes
const endpointsToFix = issues.apiEndpoints.filter(e => e.issue === 'Missing /api prefix');
if (endpointsToFix.length > 0) {
    console.log('2. Fix API endpoint prefixes:');
    endpointsToFix.forEach(({ endpoint, suggestion }) => {
        console.log(`   Replace: "${endpoint}"`);
        console.log(`   With:    "${suggestion}"`);
    });
    console.log();
}

// Count total issues
const totalIssues = 
    issues.missingIcons.length + 
    issues.apiEndpoints.length + 
    issues.duplicateIds.length + 
    issues.missingFiles.length;

console.log('='.repeat(80));
console.log(`📈 SUMMARY: Found ${totalIssues} total issues`);
console.log('='.repeat(80));

// Save detailed report to file
const reportPath = path.join(projectRoot, 'testing', 'error-scan-report.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);

process.exit(totalIssues > 0 ? 1 : 0);