#!/usr/bin/env node

/**
 * Auto-Fix Generator for Afraponix Go
 * Generates fix scripts based on issue scanner results
 */

const fs = require('fs');
const path = require('path');

class AutoFixGenerator {
    constructor(issues) {
        this.issues = issues;
        this.fixes = [];
        this.manualFixes = [];
    }

    /**
     * Generate all possible fixes
     */
    generateFixes() {
        console.log('🔧 Generating auto-fixes...');
        
        this.generateDuplicateIdFixes();
        this.generateMissingDomElementFixes();
        this.generateTabNavigationFixes();
        this.generateChartInitializationFixes();
        this.generateConsoleErrorPatternFixes();
        this.generateIconPathFixes();
        this.generateAuthenticationFixes();
        this.generateApiEndpointFixes();
        
        return {
            autoFixes: this.fixes,
            manualFixes: this.manualFixes
        };
    }

    /**
     * Generate fixes for duplicate IDs
     */
    generateDuplicateIdFixes() {
        this.issues.duplicateIds.forEach((issue, index) => {
            const newId = `alt-${issue.id}`;
            
            this.fixes.push({
                type: 'duplicate_id_fix',
                description: `Rename duplicate ID "${issue.id}" to "${newId}"`,
                file: 'index.html',
                action: 'replace_second_occurrence',
                oldValue: `id="${issue.id}"`,
                newValue: `id="${newId}"`,
                severity: issue.severity
            });
            
            // Add corresponding JS updates if needed
            this.manualFixes.push({
                type: 'duplicate_id_js_update',
                description: `Update JavaScript references to use "${newId}" where appropriate`,
                severity: 'medium',
                action: 'manual_review_required',
                suggestion: `Search for getElementById('${issue.id}') and querySelector('#${issue.id}') to determine which should use '${newId}'`
            });
        });
    }

    /**
     * Generate fixes for missing DOM elements
     */
    generateMissingDomElementFixes() {
        this.issues.missingDomElements.forEach(issue => {
            // Try to determine element type based on ID
            let elementType = 'div';
            let elementClass = '';
            
            if (issue.id.includes('chart')) {
                elementType = 'canvas';
                elementClass = 'class="chart-canvas"';
            } else if (issue.id.includes('modal')) {
                elementType = 'div';
                elementClass = 'class="modal"';
            } else if (issue.id.includes('content')) {
                elementType = 'div';
                elementClass = 'class="content-section"';
            } else if (issue.id.includes('tab')) {
                elementType = 'button';
                elementClass = 'class="tab-button"';
            }
            
            this.fixes.push({
                type: 'missing_element_fix',
                description: `Create missing element "${issue.id}"`,
                file: 'index.html',
                action: 'add_element',
                element: `<${elementType} id="${issue.id}" ${elementClass}></${elementType}>`,
                severity: issue.severity,
                insertLocation: 'before_closing_body'
            });
            
            // Also suggest JS fix for better error handling
            this.fixes.push({
                type: 'missing_element_js_fix',
                description: `Add existence check for "${issue.id}" in ${issue.file}`,
                file: issue.file,
                action: 'add_existence_check',
                elementId: issue.id,
                severity: 'low'
            });
        });
    }

    /**
     * Generate fixes for tab navigation issues
     */
    generateTabNavigationFixes() {
        this.issues.tabNavigationIssues.forEach(issue => {
            if (issue.issue === 'missing_target_attribute') {
                const targetId = issue.tabId.replace('-tab', '-content');
                
                this.fixes.push({
                    type: 'tab_target_fix',
                    description: `Add data-target attribute to tab "${issue.tabId}"`,
                    file: 'index.html',
                    action: 'add_attribute',
                    elementId: issue.tabId,
                    attribute: 'data-target',
                    value: targetId,
                    severity: issue.severity
                });
                
                // Also create the target element if it doesn't exist
                this.fixes.push({
                    type: 'tab_content_fix',
                    description: `Create content element "${targetId}"`,
                    file: 'index.html',
                    action: 'add_element',
                    element: `<div id="${targetId}" class="tab-content"><p>Content for ${issue.tabId}</p></div>`,
                    severity: 'medium'
                });
            }
            
            if (issue.issue === 'missing_target_element') {
                this.fixes.push({
                    type: 'tab_target_element_fix',
                    description: `Create missing target element "${issue.targetId}"`,
                    file: 'index.html',
                    action: 'add_element',
                    element: `<div id="${issue.targetId}" class="tab-content"><p>Content for ${issue.tabId}</p></div>`,
                    severity: issue.severity
                });
            }
            
            if (issue.issue === 'missing_tab_handler') {
                this.manualFixes.push({
                    type: 'tab_handler_fix',
                    description: `Add tab handler for "${issue.tabClass}"`,
                    file: 'public/js/modules/components/navigationManager.js',
                    action: 'add_method',
                    methodTemplate: this.generateTabHandlerMethod(issue.tabClass),
                    severity: issue.severity
                });
            }
        });
    }

    /**
     * Generate fixes for chart initialization issues
     */
    generateChartInitializationFixes() {
        this.issues.chartInitializationIssues.forEach(issue => {
            if (issue.issue === 'missing_dom_check') {
                this.fixes.push({
                    type: 'chart_dom_check_fix',
                    description: `Add DOM existence check for chart "${issue.chartId}"`,
                    file: issue.file,
                    action: 'add_dom_check',
                    chartId: issue.chartId,
                    checkCode: `const canvas = document.getElementById('${issue.chartId}');\n        if (!canvas) {\n            console.warn('Chart canvas ${issue.chartId} not found in DOM');\n            return;\n        }`,
                    severity: issue.severity
                });
            }
            
            if (issue.issue === 'unsafe_destroy') {
                this.fixes.push({
                    type: 'chart_safe_destroy_fix',
                    description: `Add null check for chart destroy "${issue.chartVariable}"`,
                    file: issue.file,
                    action: 'add_null_check',
                    variable: issue.chartVariable,
                    checkCode: `if (${issue.chartVariable}) {\n            ${issue.chartVariable}.destroy();\n            ${issue.chartVariable} = null;\n        }`,
                    severity: issue.severity
                });
            }
        });
    }

    /**
     * Generate fixes for console error patterns
     */
    generateConsoleErrorPatternFixes() {
        this.issues.consoleErrorPatterns.forEach(issue => {
            if (issue.issue === 'unsafe_method_call') {
                const match = issue.code.match(/(\w+)\.(\w+)\s*\(/);
                if (match) {
                    const object = match[1];
                    const method = match[2];
                    
                    this.fixes.push({
                        type: 'unsafe_method_call_fix',
                        description: `Add null check for method call "${object}.${method}()"`,
                        file: issue.file,
                        action: 'add_null_check',
                        line: issue.line,
                        oldCode: issue.code,
                        newCode: issue.code.replace(
                            `${object}.${method}(`,
                            `if (${object}) { ${object}.${method}(`
                        ) + ' }',
                        severity: issue.severity
                    });
                }
            }
            
            if (issue.issue === 'repetitive_warning') {
                this.fixes.push({
                    type: 'warning_deduplication_fix',
                    description: `Add deduplication for warning message`,
                    file: issue.file,
                    action: 'add_deduplication',
                    line: issue.line,
                    warningKey: `${issue.file}:${issue.line}`,
                    severity: issue.severity
                });
            }
        });
    }

    /**
     * Generate fixes for icon path issues
     */
    generateIconPathFixes() {
        this.issues.iconPathIssues.forEach(issue => {
            const iconName = issue.iconPath.split('/').pop().replace('.svg', '');
            const newPath = `icons/new-icons/Afraponix Go Icons_${iconName}.svg`;
            
            this.fixes.push({
                type: 'icon_path_fix',
                description: `Update icon path from "${issue.iconPath}" to "${newPath}"`,
                file: issue.file,
                action: 'replace_string',
                oldValue: issue.iconPath,
                newValue: newPath,
                severity: issue.severity
            });
        });
    }

    /**
     * Generate fixes for authentication issues
     */
    generateAuthenticationFixes() {
        this.issues.authenticationIssues.forEach(issue => {
            if (issue.issue === 'premature_system_loading') {
                this.manualFixes.push({
                    type: 'authentication_sequence_fix',
                    description: `Move system loading after authentication in ${issue.file}`,
                    file: issue.file,
                    line: issue.line,
                    action: 'move_code',
                    suggestion: 'Move this call to after successful authentication or wrap in authentication check',
                    severity: issue.severity
                });
            }
        });
    }

    /**
     * Generate fixes for API endpoint issues
     */
    generateApiEndpointFixes() {
        this.issues.apiEndpointIssues.forEach(issue => {
            if (issue.issue === 'missing_system_id') {
                this.manualFixes.push({
                    type: 'api_system_id_fix',
                    description: `Add system ID to endpoint "${issue.endpoint}"`,
                    file: issue.file,
                    endpoint: issue.endpoint,
                    action: 'add_system_id',
                    suggestion: `Replace "${issue.endpoint}" with "${issue.endpoint.replace('/data/', '/data/')}/$\{systemId}" or similar`,
                    severity: issue.severity
                });
            }
            
            if (issue.issue === 'hardcoded_id') {
                this.fixes.push({
                    type: 'hardcoded_id_fix',
                    description: `Replace hardcoded ID in endpoint "${issue.endpoint}"`,
                    file: issue.file,
                    action: 'replace_hardcoded_id',
                    oldEndpoint: issue.endpoint,
                    newEndpoint: issue.endpoint.replace(/\/\d+\//, '/${systemId}/'),
                    severity: issue.severity
                });
            }
        });
    }

    /**
     * Generate tab handler method template
     */
    generateTabHandlerMethod(tabClass) {
        const methodName = `setup${this.capitalize(tabClass.replace('-tab', ''))}Tabs`;
        const contentClass = tabClass.replace('-tab', '-content');
        
        return `
    /**
     * Setup ${tabClass.replace('-tab', '')} tabs
     */
    ${methodName}() {
        const tabs = document.querySelectorAll('.${tabClass}');
        const contents = document.querySelectorAll('.${contentClass}');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
                
                // Add any specific loading logic here
                console.log(\`Switched to \${targetContent}\`);
            });
        });
    }`;
    }

    /**
     * Save fixes to files
     */
    async saveFixes() {
        // Save auto-fixes script
        const autoFixScript = this.generateAutoFixScript();
        fs.writeFileSync(
            path.join(__dirname, 'apply-auto-fixes.js'), 
            autoFixScript
        );
        
        // Save manual fixes guide
        const manualFixGuide = this.generateManualFixGuide();
        fs.writeFileSync(
            path.join(__dirname, 'manual-fixes-guide.md'), 
            manualFixGuide
        );
        
        console.log('✅ Fix files generated:');
        console.log('   - testing/apply-auto-fixes.js');
        console.log('   - testing/manual-fixes-guide.md');
    }

    /**
     * Generate executable auto-fix script
     */
    generateAutoFixScript() {
        return `#!/usr/bin/env node

/**
 * Apply Auto-Fixes Script
 * Generated automatically by AutoFixGenerator
 */

const fs = require('fs');
const path = require('path');

class AutoFixApplier {
    constructor() {
        this.fixes = ${JSON.stringify(this.fixes, null, 8)};
        this.applied = 0;
        this.failed = 0;
    }

    async applyAll() {
        console.log(\`🔧 Applying \${this.fixes.length} auto-fixes...\`);
        
        for (const fix of this.fixes) {
            try {
                await this.applyFix(fix);
                this.applied++;
                console.log(\`✅ Applied: \${fix.description}\`);
            } catch (error) {
                this.failed++;
                console.error(\`❌ Failed: \${fix.description}\`, error.message);
            }
        }
        
        console.log(\`\\n📊 Results: \${this.applied} applied, \${this.failed} failed\`);
    }

    async applyFix(fix) {
        const filePath = path.join(__dirname, '..', fix.file);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        switch (fix.action) {
            case 'replace_second_occurrence':
                content = this.replaceSecondOccurrence(content, fix.oldValue, fix.newValue);
                break;
                
            case 'add_element':
                content = this.addElement(content, fix.element, fix.insertLocation);
                break;
                
            case 'add_attribute':
                content = this.addAttribute(content, fix.elementId, fix.attribute, fix.value);
                break;
                
            case 'replace_string':
                content = content.replace(new RegExp(this.escapeRegex(fix.oldValue), 'g'), fix.newValue);
                break;
                
            case 'add_dom_check':
                content = this.addDomCheck(content, fix.chartId, fix.checkCode);
                break;
                
            case 'add_null_check':
                content = this.addNullCheck(content, fix);
                break;
                
            default:
                throw new Error(\`Unknown fix action: \${fix.action}\`);
        }
        
        fs.writeFileSync(filePath, content);
    }

    replaceSecondOccurrence(content, oldValue, newValue) {
        const firstIndex = content.indexOf(oldValue);
        if (firstIndex === -1) return content;
        
        const secondIndex = content.indexOf(oldValue, firstIndex + 1);
        if (secondIndex === -1) return content;
        
        return content.substring(0, secondIndex) + 
               newValue + 
               content.substring(secondIndex + oldValue.length);
    }

    addElement(content, element, location) {
        switch (location) {
            case 'before_closing_body':
                return content.replace('</body>', \`    \${element}\\n</body>\`);
            default:
                return content + '\\n' + element;
        }
    }

    addAttribute(content, elementId, attribute, value) {
        const pattern = new RegExp(\`(<[^>]*id=["']\${elementId}["'][^>]*)\`, 'i');
        return content.replace(pattern, \`$1 \${attribute}="\${value}"\`);
    }

    addDomCheck(content, chartId, checkCode) {
        const chartPattern = new RegExp(\`(new Chart\\\\(\\\\s*document\\\\.getElementById\\\\(['"\`]\${chartId}['"\`]\\\\))\`, 'm');
        return content.replace(chartPattern, \`\${checkCode}\\n        $1\`);
    }

    addNullCheck(content, fix) {
        if (fix.oldCode && fix.newCode) {
            return content.replace(fix.oldCode, fix.newCode);
        }
        return content;
    }

    escapeRegex(string) {
        // Simple escape for special regex characters
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Run applier if called directly
if (require.main === module) {
    const applier = new AutoFixApplier();
    applier.applyAll().catch(error => {
        console.error('❌ Auto-fix application failed:', error);
        process.exit(1);
    });
}

module.exports = AutoFixApplier;`;
    }

    /**
     * Generate manual fixes guide
     */
    generateManualFixGuide() {
        let guide = `# Manual Fixes Guide

This document contains fixes that require manual review and implementation.

## Summary
- Total Manual Fixes: ${this.manualFixes.length}
- High Priority: ${this.manualFixes.filter(f => f.severity === 'high').length}
- Medium Priority: ${this.manualFixes.filter(f => f.severity === 'medium').length}
- Low Priority: ${this.manualFixes.filter(f => f.severity === 'low').length}

---

`;

        // Group fixes by type
        const fixesByType = this.manualFixes.reduce((acc, fix) => {
            if (!acc[fix.type]) acc[fix.type] = [];
            acc[fix.type].push(fix);
            return acc;
        }, {});

        for (const [type, fixes] of Object.entries(fixesByType)) {
            guide += `## ${type.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}\n\n`;
            
            fixes.forEach((fix, index) => {
                guide += `### ${index + 1}. ${fix.description}\n`;
                guide += `**File:** \`${fix.file}\`\n`;
                guide += `**Severity:** ${fix.severity.toUpperCase()}\n`;
                
                if (fix.line) {
                    guide += `**Line:** ${fix.line}\n`;
                }
                
                if (fix.suggestion) {
                    guide += `**Suggestion:** ${fix.suggestion}\n`;
                }
                
                if (fix.methodTemplate) {
                    guide += `**Method Template:**\n\`\`\`javascript${fix.methodTemplate}\n\`\`\`\n`;
                }
                
                guide += '\n---\n\n';
            });
        }

        return guide;
    }

    /**
     * Utility function to capitalize strings
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoFixGenerator;
}

// Run generator if called directly with issues file
if (require.main === module) {
    const issuesFile = process.argv[2];
    if (!issuesFile) {
        console.error('Usage: node auto-fix-generator.js <issues-file.json>');
        process.exit(1);
    }
    
    const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
    const generator = new AutoFixGenerator(issues);
    const result = generator.generateFixes();
    generator.saveFixes();
    
    console.log(`✅ Generated ${result.autoFixes.length} auto-fixes and ${result.manualFixes.length} manual fixes`);
}