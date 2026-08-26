const fs = require('fs');

console.log('🔍 Scanning for Specific Missing Tab Handlers\n');
console.log('=============================================');

// Function to read file safely
function readFileSafely(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Find sub-tabs that might be missing handlers
function scanForMissingHandlers() {
    console.log('1️⃣ Looking for sub-tabs that might be missing handlers...\n');
    
    const html = readFileSafely('./index.html');
    const scriptJS = readFileSafely('./script.js');
    
    if (!html || !scriptJS) {
        console.log('❌ Could not read files');
        return;
    }
    
    // Extract all data-target sub-tabs from HTML
    const subTabPattern = /<button[^>]*data-target="([^"]+)"[^>]*>/g;
    const htmlSubTabs = [];
    let match;
    
    while ((match = subTabPattern.exec(html)) !== null) {
        const target = match[1];
        // Exclude admin tabs as we already fixed those
        if (!target.includes('admin-') && target.includes('-content')) {
            htmlSubTabs.push(target);
        }
    }
    
    console.log('📋 All non-admin sub-tabs in HTML:');
    htmlSubTabs.forEach((tab, index) => {
        console.log(`   ${index + 1}. ${tab}`);
    });
    
    // Check which ones have event handlers in JavaScript
    console.log('\n🔍 Checking for event handlers in JavaScript...\n');
    
    const missingHandlers = [];
    const hasHandlers = [];
    
    htmlSubTabs.forEach(tab => {
        if (scriptJS.includes(`targetContent === '${tab}'`)) {
            hasHandlers.push(tab);
        } else {
            missingHandlers.push(tab);
        }
    });
    
    console.log('✅ Sub-tabs WITH event handlers:');
    hasHandlers.forEach((tab, index) => {
        console.log(`   ${index + 1}. ${tab}`);
    });
    
    console.log('\n❌ Sub-tabs WITHOUT event handlers:');
    missingHandlers.forEach((tab, index) => {
        console.log(`   ${index + 1}. ${tab}`);
    });
    
    return { missingHandlers, hasHandlers };
}

// Check for load functions that might correspond to missing tabs
function findCorrespondingLoadFunctions(missingHandlers) {
    console.log('\n2️⃣ Looking for load functions that might correspond to missing tabs...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find all load functions
    const loadFunctionPattern = /(load\w+)\s*\(/g;
    const loadFunctions = [];
    let match;
    
    while ((match = loadFunctionPattern.exec(scriptJS)) !== null) {
        loadFunctions.push(match[1]);
    }
    
    console.log('📋 Potential matches for missing handlers:');
    missingHandlers.forEach(tab => {
        console.log(`\n🎯 ${tab}:`);
        
        // Try to find related load functions
        const tabWords = tab.replace('-content', '').split('-');
        const matches = [];
        
        loadFunctions.forEach(func => {
            const funcLower = func.toLowerCase();
            const tabWordsMatch = tabWords.some(word => funcLower.includes(word));
            if (tabWordsMatch) {
                matches.push(func);
            }
        });
        
        if (matches.length > 0) {
            console.log(`   Possible functions: ${matches.join(', ')}`);
        } else {
            console.log(`   ❌ No obvious matching load functions found`);
        }
    });
}

// Main execution
async function main() {
    try {
        const { missingHandlers, hasHandlers } = scanForMissingHandlers();
        
        if (missingHandlers && missingHandlers.length > 0) {
            findCorrespondingLoadFunctions(missingHandlers);
        }
        
        console.log('\n📊 SUMMARY:');
        console.log('===========');
        console.log(`Sub-tabs with handlers: ${hasHandlers ? hasHandlers.length : 0}`);
        console.log(`Sub-tabs missing handlers: ${missingHandlers ? missingHandlers.length : 0}`);
        
        if (missingHandlers && missingHandlers.length > 0) {
            console.log('\n🎯 PRIORITY FIXES NEEDED:');
            console.log('Focus on sub-tabs that users click but don\'t load content');
        }
        
        console.log('\n✅ Missing handlers scan complete!');
        
    } catch (error) {
        console.error('❌ Scanner error:', error);
    }
}

main();