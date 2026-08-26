const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Auto-Loading Issues Scanner\n');

// Function to read file safely
function readFileSafely(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Function to find all JavaScript files
function findJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            findJSFiles(filePath, fileList);
        } else if (file.endsWith('.js') && !file.includes('.backup') && !file.includes('.test')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Scan for auto-loading patterns
function scanAutoLoadingIssues() {
    console.log('1️⃣ Scanning for auto-loading initialization patterns...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) {
        console.log('❌ Could not read script.js');
        return;
    }
    
    // Find all load functions in script.js
    const loadFunctionPattern = /async\s+(load\w+)\s*\(/g;
    const loadFunctions = [];
    let match;
    
    while ((match = loadFunctionPattern.exec(scriptJS)) !== null) {
        loadFunctions.push(match[1]);
    }
    
    console.log('📋 Found load functions in script.js:');
    loadFunctions.forEach(func => console.log(`   - ${func}()`));
    
    // Find auto-initialization blocks
    const autoInitPattern = /Auto-initializing admin data[\s\S]*?} catch/g;
    const autoInitMatch = autoInitPattern.exec(scriptJS);
    
    if (autoInitMatch) {
        const autoInitBlock = autoInitMatch[0];
        console.log('\n🔧 Current auto-initialization block:');
        console.log(autoInitBlock.split('\n').slice(0, 15).map(line => `   ${line}`).join('\n'));
        
        console.log('\n❌ Missing from auto-initialization:');
        loadFunctions.forEach(func => {
            if (!autoInitBlock.includes(func)) {
                console.log(`   - ${func}() - NOT auto-loaded`);
            } else {
                console.log(`   ✅ ${func}() - auto-loaded`);
            }
        });
    }
}

// Scan for event handlers that might need auto-loading
function scanEventHandlers() {
    console.log('\n\n2️⃣ Scanning for admin sub-tab event handlers...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find admin sub-tab event handlers
    const subTabPattern = /admin-(\w+)-subcontent.*?\{([\s\S]*?)\}/g;
    let match;
    const subTabHandlers = [];
    
    while ((match = subTabPattern.exec(scriptJS)) !== null) {
        const subTabName = match[1];
        const handlerCode = match[2];
        subTabHandlers.push({ name: subTabName, code: handlerCode.trim() });
    }
    
    console.log('📋 Found admin sub-tab handlers:');
    subTabHandlers.forEach(handler => {
        console.log(`   - admin-${handler.name}-subcontent:`);
        console.log(`     ${handler.code.split('\n')[0].trim()}`);
    });
}

// Scan for manual click-only loading functions
function scanManualOnlyFunctions() {
    console.log('\n\n3️⃣ Scanning for functions that only load on manual clicks...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find functions called in event handlers but not in auto-init
    const eventHandlerPattern = /console\.log\('📞 Calling (\w+)\(\)'\);\s*this\.(\w+)\(/g;
    const manualFunctions = [];
    let match;
    
    while ((match = eventHandlerPattern.exec(scriptJS)) !== null) {
        const functionName = match[2];
        manualFunctions.push(functionName);
    }
    
    // Check which are missing from auto-init
    const autoInitPattern = /Auto-initializing admin data[\s\S]*?} catch/g;
    const autoInitMatch = autoInitPattern.exec(scriptJS);
    const autoInitBlock = autoInitMatch ? autoInitMatch[0] : '';
    
    console.log('🎯 Manual-only functions analysis:');
    const uniqueFunctions = [...new Set(manualFunctions)];
    uniqueFunctions.forEach(func => {
        if (!autoInitBlock.includes(func)) {
            console.log(`   ❌ ${func}() - Only loads on manual click`);
        } else {
            console.log(`   ✅ ${func}() - Has auto-loading`);
        }
    });
}

// Scan modular files for similar patterns
function scanModularFiles() {
    console.log('\n\n4️⃣ Scanning modular files for auto-loading patterns...\n');
    
    const moduleFiles = [
        './public/js/modules/components',
        './public/js/modules/services',
        './public/js/modules/api'
    ];
    
    moduleFiles.forEach(moduleDir => {
        if (fs.existsSync(moduleDir)) {
            const jsFiles = findJSFiles(moduleDir);
            
            console.log(`📂 Checking ${moduleDir}:`);
            jsFiles.forEach(file => {
                const content = readFileSafely(file);
                if (content) {
                    const fileName = path.basename(file);
                    
                    // Check for load/init functions
                    const loadMatches = content.match(/(load\w+|init\w+)\s*\(/g);
                    if (loadMatches) {
                        console.log(`   📄 ${fileName}: ${loadMatches.join(', ')}`);
                    }
                }
            });
        }
    });
}

// Check for data loading dependencies
function scanDataDependencies() {
    console.log('\n\n5️⃣ Scanning for data loading dependencies...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find functions that depend on system data
    const systemDataPattern = /(loadDataRecords|switchToSystem|updateDashboardFromData)/g;
    const systemDataCalls = scriptJS.match(systemDataPattern) || [];
    
    console.log('📊 System data loading calls found:', systemDataCalls.length);
    
    // Find functions that should be called after system switch
    const updateFunctionPattern = /(update\w+Tab|load\w+Overview|refresh\w+)/g;
    const updateFunctions = scriptJS.match(updateFunctionPattern) || [];
    
    console.log('🔄 Update functions that might need system data:');
    const uniqueUpdates = [...new Set(updateFunctions)];
    uniqueUpdates.forEach(func => console.log(`   - ${func}`));
}

// Main execution
async function main() {
    try {
        scanAutoLoadingIssues();
        scanEventHandlers();
        scanManualOnlyFunctions();
        scanModularFiles();
        scanDataDependencies();
        
        console.log('\n\n📋 SUMMARY OF POTENTIAL ISSUES:');
        console.log('===============================');
        console.log('1. Check functions marked "Only loads on manual click"');
        console.log('2. Verify all admin sub-tabs have proper auto-loading');
        console.log('3. Ensure system-dependent functions are called after data loads');
        console.log('4. Review modular components for missing initialization');
        console.log('\n✅ Comprehensive scan complete!');
        
    } catch (error) {
        console.error('❌ Scanner error:', error);
    }
}

main();