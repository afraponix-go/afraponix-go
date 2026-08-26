const fs = require('fs');

console.log('🚀 Tab Handlers Automation Script\n');
console.log('=================================');

// Configuration for tab groups
const TAB_GROUPS = {
    dashboard: {
        name: 'Dashboard',
        priority: 'HIGH',
        setupFunction: 'setupDashboardTabs',
        cssSelector: '.dashboard-tab',
        contentSelector: '.dashboard-content',
        tabs: [
            { id: 'dashboard-overview-content', loadFunction: 'loadActionsRequired', extraAction: 'this.initializeCharts()' },
            { id: 'dashboard-farm-layout-content', loadFunction: 'loadSVG', extraAction: null },
            { id: 'dashboard-actions-content', loadFunction: 'loadActionsRequired', extraAction: null }
        ]
    },
    plantManagement: {
        name: 'Plant Management',
        priority: 'HIGH',
        setupFunction: 'setupPlantTabs',
        cssSelector: '.plant-action-tab',
        contentSelector: '.plant-action-content',
        tabs: [
            { id: 'plant-actions-content', loadFunction: 'initializePlantActionForms', extraAction: null },
            { id: 'beds-overview-content', loadFunction: 'loadBedsOverview', extraAction: null },
            { id: 'plants-management-content', loadFunction: 'loadPlantsManagement', extraAction: null },
            { id: 'planting-form-content', loadFunction: 'initializePlantActionForms', extraAction: null },
            { id: 'harvesting-form-content', loadFunction: 'initializePlantActionForms', extraAction: null }
        ]
    },
    sensorConfig: {
        name: 'Sensor Configuration',
        priority: 'HIGH',
        setupFunction: 'setupSensorTabs',
        cssSelector: '.sensor-tab',
        contentSelector: '.sensor-content',
        tabs: [
            { id: 'add-sensor-content', loadFunction: 'loadSensorConfiguration', extraAction: null },
            { id: 'existing-sensors-content', loadFunction: 'loadSensorsList', extraAction: null }
        ]
    },
    dataEdit: {
        name: 'Data Editing',
        priority: 'MEDIUM',
        setupFunction: 'setupDataEditTabs',
        cssSelector: '.edit-tab',
        contentSelector: '.edit-content',
        tabs: [
            { id: 'edit-water-quality-content', loadFunction: 'loadDataEditInterface', extraAction: null },
            { id: 'edit-fish-health-content', loadFunction: 'loadDataEditInterface', extraAction: null },
            { id: 'edit-operations-content', loadFunction: 'loadDataEditInterface', extraAction: null }
        ]
    },
    nutrientManagement: {
        name: 'Nutrient Management',
        priority: 'MEDIUM',
        setupFunction: 'setupNutrientManagementTabs',
        cssSelector: '.nutrient-mgmt-tab',
        contentSelector: '.nutrient-mgmt-content',
        tabs: [
            { id: 'ratio-rules-content', loadFunction: 'loadRatioRules', extraAction: null },
            { id: 'environmental-adjustments-content', loadFunction: 'loadEnvironmentalAdjustments', extraAction: null }
        ]
    },
    calculator: {
        name: 'Calculator',
        priority: 'LOWER',
        setupFunction: 'setupCalculatorTabs',
        cssSelector: '.calc-tab',
        contentSelector: '.calculator-content',
        tabs: [
            { id: 'quick-calc-content', loadFunction: 'initializeNutrientCalculator', extraAction: null },
            { id: 'mixing-schedule-content', loadFunction: 'loadDosingSchedulePDF', extraAction: null },
            { id: 'custom-nutrients-content', loadFunction: 'loadAvailableNutrients', extraAction: null }
        ]
    }
};

// Function to read file safely
function readFileSafely(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Check if functions exist in the codebase
function checkFunctionExists(functionName) {
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return false;
    
    const patterns = [
        new RegExp(`async\\s+${functionName}\\s*\\(`),
        new RegExp(`${functionName}\\s*\\(`),
        new RegExp(`${functionName}\\s*=`)
    ];
    
    return patterns.some(pattern => pattern.test(scriptJS));
}

// Check if setup function exists
function checkSetupFunctionExists(setupFunction) {
    const scriptJS = readFileSafely('./script.js');
    if (!scriptJS) return false;
    
    return scriptJS.includes(`${setupFunction}()`) || scriptJS.includes(`${setupFunction} {`);
}

// Generate event handler code for a tab group
function generateTabHandlerCode(groupKey, group) {
    const { name, setupFunction, cssSelector, contentSelector, tabs } = group;
    
    let code = `\n    // ========================================\n`;
    code += `    // ${name.toUpperCase()} TAB HANDLERS\n`;
    code += `    // ========================================\n\n`;
    
    code += `    ${setupFunction}() {\n`;
    code += `        console.log('🔧 Setting up ${name} tabs...');\n`;
    code += `        const tabs = document.querySelectorAll('${cssSelector}');\n`;
    code += `        const contents = document.querySelectorAll('${contentSelector}');\n\n`;
    
    code += `        tabs.forEach(tab => {\n`;
    code += `            tab.addEventListener('click', async () => {\n`;
    code += `                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');\n`;
    code += `                console.log('📞 ${name} tab clicked:', targetContent);\n\n`;
    
    code += `                // Remove active states\n`;
    code += `                tabs.forEach(t => t.classList.remove('active'));\n`;
    code += `                contents.forEach(c => c.classList.remove('active'));\n\n`;
    
    code += `                // Add active states\n`;
    code += `                tab.classList.add('active');\n`;
    code += `                const targetElement = document.getElementById(targetContent);\n`;
    code += `                if (targetElement) {\n`;
    code += `                    targetElement.classList.add('active');\n`;
    code += `                }\n\n`;
    
    code += `                // Load data for specific tabs\n`;
    tabs.forEach((tabConfig, index) => {
        const condition = index === 0 ? 'if' : 'else if';
        code += `                ${condition} (targetContent === '${tabConfig.id}') {\n`;
        code += `                    console.log('📡 Loading ${tabConfig.loadFunction}...');\n`;
        
        if (tabConfig.loadFunction.includes('()')) {
            code += `                    ${tabConfig.loadFunction};\n`;
        } else {
            code += `                    await this.${tabConfig.loadFunction}();\n`;
        }
        
        if (tabConfig.extraAction) {
            code += `                    ${tabConfig.extraAction};\n`;
        }
        code += `                }\n`;
    });
    
    code += `            });\n`;
    code += `        });\n`;
    code += `    }\n`;
    
    return code;
}

// Generate initialization code
function generateInitializationCode() {
    let code = '\n    // ========================================\n';
    code += '    // ENHANCED TAB INITIALIZATION SEQUENCE\n';
    code += '    // ========================================\n\n';
    code += '    async initializeAllTabHandlers() {\n';
    code += '        console.log("🚀 Initializing all tab handlers...");\n';
    code += '        try {\n';
    
    Object.entries(TAB_GROUPS).forEach(([key, group]) => {
        code += `            this.${group.setupFunction}(); // ${group.name}\n`;
    });
    
    code += '            console.log("✅ All tab handlers initialized successfully");\n';
    code += '        } catch (error) {\n';
    code += '            console.error("❌ Error initializing tab handlers:", error);\n';
    code += '        }\n';
    code += '    }\n';
    
    return code;
}

// Analyze current state and generate implementation
function analyzeAndGenerate() {
    console.log('1️⃣ Analyzing current codebase...\n');
    
    // Check function existence
    const functionAnalysis = {};
    Object.entries(TAB_GROUPS).forEach(([groupKey, group]) => {
        functionAnalysis[groupKey] = {
            name: group.name,
            priority: group.priority,
            setupExists: checkSetupFunctionExists(group.setupFunction),
            tabs: group.tabs.map(tab => ({
                id: tab.id,
                loadFunction: tab.loadFunction,
                exists: checkFunctionExists(tab.loadFunction)
            }))
        };
    });
    
    // Display analysis
    console.log('📊 Function Existence Analysis:\n');
    Object.entries(functionAnalysis).forEach(([groupKey, analysis]) => {
        console.log(`🎯 ${analysis.name} (${analysis.priority} PRIORITY):`);
        console.log(`   Setup Function: ${analysis.setupExists ? '✅' : '❌'} exists`);
        analysis.tabs.forEach(tab => {
            const status = tab.exists ? '✅' : '❌';
            console.log(`   - ${tab.id} → ${tab.loadFunction}: ${status}`);
        });
        console.log('');
    });
    
    return functionAnalysis;
}

// Generate complete implementation code
function generateImplementation() {
    console.log('\n2️⃣ Generating implementation code...\n');
    
    let allCode = '';
    
    // Generate handler code for each group
    Object.entries(TAB_GROUPS).forEach(([groupKey, group]) => {
        allCode += generateTabHandlerCode(groupKey, group);
    });
    
    // Generate initialization code
    allCode += generateInitializationCode();
    
    // Write to output file
    fs.writeFileSync('./testing/generated-tab-handlers.js', allCode);
    
    console.log('✅ Generated code written to: ./testing/generated-tab-handlers.js');
    
    return allCode;
}

// Generate integration instructions
function generateIntegrationInstructions() {
    console.log('\n3️⃣ Generating integration instructions...\n');
    
    const instructions = `
# Tab Handlers Integration Instructions

## 🔧 **Implementation Steps**

### **Step 1: Add Generated Functions**
Copy all functions from \`generated-tab-handlers.js\` to \`script.js\`

### **Step 2: Add Initialization Call**
Add to the main initialization sequence (around line 1300):
\`\`\`javascript
await this.initializeAllTabHandlers();
\`\`\`

### **Step 3: Verify CSS Classes**
Ensure these CSS classes exist in HTML:
${Object.values(TAB_GROUPS).map(group => `- ${group.cssSelector} and ${group.contentSelector}`).join('\n')}

### **Step 4: Test Each Group**
Test each tab group systematically:
${Object.entries(TAB_GROUPS).map(([key, group]) => `- ${group.name}: ${group.tabs.length} tabs`).join('\n')}

### **Step 5: Monitor Console**
Watch for debug messages:
- 🔧 Setting up [Group] tabs...
- 📞 [Group] tab clicked: [content-id]
- 📡 Loading [function]...

## 📊 **Statistics**
- Total Groups: ${Object.keys(TAB_GROUPS).length}
- Total Tabs: ${Object.values(TAB_GROUPS).reduce((sum, group) => sum + group.tabs.length, 0)}
- High Priority: ${Object.values(TAB_GROUPS).filter(g => g.priority === 'HIGH').length} groups
- Medium Priority: ${Object.values(TAB_GROUPS).filter(g => g.priority === 'MEDIUM').length} groups
- Lower Priority: ${Object.values(TAB_GROUPS).filter(g => g.priority === 'LOWER').length} groups
`;
    
    fs.writeFileSync('./testing/integration-instructions.md', instructions);
    console.log('✅ Integration instructions written to: ./testing/integration-instructions.md');
}

// Main execution
async function main() {
    try {
        const analysis = analyzeAndGenerate();
        const code = generateImplementation();
        generateIntegrationInstructions();
        
        console.log('\n🎯 SUMMARY:');
        console.log('===========');
        console.log(`Tab Groups Configured: ${Object.keys(TAB_GROUPS).length}`);
        console.log(`Total Tabs to Implement: ${Object.values(TAB_GROUPS).reduce((sum, group) => sum + group.tabs.length, 0)}`);
        console.log('Code Generation: ✅ Complete');
        console.log('Ready for Implementation: ✅ Yes');
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Review generated-tab-handlers.js');
        console.log('2. Follow integration-instructions.md');
        console.log('3. Test each group systematically');
        console.log('4. Monitor console for debug output');
        
        console.log('\n✅ Automation script complete!');
        
    } catch (error) {
        console.error('❌ Automation script error:', error);
    }
}

main();