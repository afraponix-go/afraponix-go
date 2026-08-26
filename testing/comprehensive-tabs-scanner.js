const fs = require('fs');

console.log('🔍 Comprehensive Tabs Auto-Loading Scanner\n');
console.log('=============================================');

// Function to read file safely
function readFileSafely(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Find all tab-related patterns
function scanAllTabs() {
    console.log('1️⃣ Scanning all tabs in index.html...\n');
    
    const html = readFileSafely('./index.html');
    if (!html) {
        console.log('❌ Could not read index.html');
        return;
    }
    
    // Find all main tabs
    const tabPattern = /<button[^>]*class="[^"]*tab[^"]*"[^>]*data-target="([^"]+)"/g;
    const tabs = [];
    let match;
    
    while ((match = tabPattern.exec(html)) !== null) {
        tabs.push(match[1]);
    }
    
    console.log('📋 Found main tabs:');
    tabs.forEach((tab, index) => {
        console.log(`   ${index + 1}. ${tab}`);
    });
    
    return tabs;
}

// Find sub-tabs within each main tab
function scanSubTabs() {
    console.log('\n2️⃣ Scanning sub-tabs in each main tab...\n');
    
    const html = readFileSafely('./index.html');
    if (!html) return;
    
    // Find sub-tabs (buttons with data-target inside tab content)
    const subTabPattern = /<button[^>]*data-target="([^"]+)"[^>]*>([^<]+)</g;
    const subTabs = [];
    let match;
    
    while ((match = subTabPattern.exec(html)) !== null) {
        const target = match[1];
        const text = match[2].trim();
        if (!target.includes('admin-') && target.includes('-')) {
            subTabs.push({ target, text });
        }
    }
    
    console.log('📋 Found sub-tabs (non-admin):');
    subTabs.forEach((subTab, index) => {
        console.log(`   ${index + 1}. ${subTab.target} → "${subTab.text}"`);
    });
    
    return subTabs;
}

// Check tab switching logic
function scanTabSwitchingLogic() {
    console.log('\n3️⃣ Scanning tab switching logic in script.js...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find tab click handlers
    const tabClickPattern = /tab-button.*?addEventListener.*?click.*?\{([\s\S]*?)\}/g;
    const tabSwitchPattern = /showTab\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const switchToTabPattern = /switchToTab\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    console.log('🔄 Tab switching patterns found:');
    
    let match;
    const showTabCalls = [];
    while ((match = tabSwitchPattern.exec(scriptJS)) !== null) {
        showTabCalls.push(match[1]);
    }
    
    const switchToTabCalls = [];
    while ((match = switchToTabPattern.exec(scriptJS)) !== null) {
        switchToTabCalls.push(match[1]);
    }
    
    console.log('   showTab() calls:', [...new Set(showTabCalls)]);
    console.log('   switchToTab() calls:', [...new Set(switchToTabCalls)]);
}

// Check for tab-specific load functions
function scanTabLoadFunctions() {
    console.log('\n4️⃣ Scanning for tab-specific load functions...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find functions that might be tab-specific
    const tabLoadPattern = /(load\w*Tab|load\w*Management|load\w*Configuration|load\w*Overview)\s*\(/g;
    const tabLoadFunctions = [];
    let match;
    
    while ((match = tabLoadPattern.exec(scriptJS)) !== null) {
        tabLoadFunctions.push(match[1]);
    }
    
    console.log('📋 Tab-related load functions found:');
    const uniqueFunctions = [...new Set(tabLoadFunctions)];
    uniqueFunctions.forEach((func, index) => {
        console.log(`   ${index + 1}. ${func}()`);
    });
    
    return uniqueFunctions;
}

// Check for sub-tab click handlers
function scanSubTabHandlers() {
    console.log('\n5️⃣ Scanning sub-tab click handlers...\n');
    
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return;
    
    // Find sub-tab event handlers
    const subTabHandlerPattern = /data-target.*?===.*?['"`]([^'"`]+)['"`].*?\{([\s\S]*?)\}/g;
    const targetContentPattern = /targetContent === ['"`]([^'"`]+)['"`]/g;
    
    const handlers = [];
    let match;
    
    while ((match = targetContentPattern.exec(scriptJS)) !== null) {
        const target = match[1];
        if (!target.includes('admin-')) {
            handlers.push(target);
        }
    }
    
    console.log('📋 Non-admin sub-tab handlers found:');
    const uniqueHandlers = [...new Set(handlers)];
    uniqueHandlers.forEach((handler, index) => {
        console.log(`   ${index + 1}. ${handler}`);
    });
    
    return uniqueHandlers;
}

// Main execution
async function main() {
    try {
        const tabs = scanAllTabs();
        const subTabs = scanSubTabs();
        scanTabSwitchingLogic();
        const loadFunctions = scanTabLoadFunctions();
        const subTabHandlers = scanSubTabHandlers();
        
        console.log('\n📊 ANALYSIS SUMMARY:');
        console.log('====================');
        console.log(`Main tabs found: ${tabs ? tabs.length : 0}`);
        console.log(`Sub-tabs found: ${subTabs ? subTabs.length : 0}`);
        console.log(`Load functions found: ${loadFunctions ? loadFunctions.length : 0}`);
        console.log(`Sub-tab handlers found: ${subTabHandlers ? subTabHandlers.length : 0}`);
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Focus on System Config tab first');
        console.log('2. Check each sub-tab for auto-loading vs manual-only');
        console.log('3. Identify missing event handlers');
        console.log('4. Verify tab switching triggers appropriate load functions');
        
        console.log('\n✅ Initial tabs scan complete!');
        
    } catch (error) {
        console.error('❌ Scanner error:', error);
    }
}

main();