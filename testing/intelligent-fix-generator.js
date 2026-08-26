#!/usr/bin/env node

/**
 * Intelligent Fix Generator for Afraponix Go
 * Creates pattern-based fixes following successful repair strategies
 */

const fs = require('fs');
const path = require('path');

class IntelligentFixGenerator {
    constructor(issues) {
        this.issues = issues;
        this.fixes = [];
        this.patterns = this.analyzePatterns();
    }

    /**
     * Analyze patterns in issues to create intelligent fixes
     */
    analyzePatterns() {
        return {
            duplicateIdPatterns: this.analyzeDuplicateIdPatterns(),
            missingElementPatterns: this.analyzeMissingElementPatterns(),
            tabNavigationPatterns: this.analyzeTabNavigationPatterns(),
            errorPatterns: this.analyzeErrorPatterns()
        };
    }

    /**
     * Analyze duplicate ID patterns
     */
    analyzeDuplicateIdPatterns() {
        const patterns = {
            formElements: [],
            modalElements: [],
            repeatedSections: [],
            chartElements: []
        };

        this.issues.duplicateIds.forEach(issue => {
            const id = issue.id;
            
            if (id.includes('date') || id.includes('weight') || id.includes('notes') || 
                id.includes('quantity') || id.includes('input')) {
                patterns.formElements.push(id);
            } else if (id.includes('modal') || id.includes('title') || id.includes('header')) {
                patterns.modalElements.push(id);
            } else if (id.includes('grid') || id.includes('container') || id.includes('section')) {
                patterns.repeatedSections.push(id);
            } else if (id.includes('chart') || id.includes('canvas')) {
                patterns.chartElements.push(id);
            }
        });

        return patterns;
    }

    /**
     * Analyze missing element patterns
     */
    analyzeMissingElementPatterns() {
        const patterns = {
            chartElements: [],
            formElements: [],
            modalElements: [],
            navigationElements: [],
            containerElements: []
        };

        this.issues.missingDomElements.forEach(issue => {
            const id = issue.id;
            
            if (id.includes('chart') || id.includes('canvas')) {
                patterns.chartElements.push(issue);
            } else if (id.includes('form') || id.includes('input') || id.includes('btn')) {
                patterns.formElements.push(issue);
            } else if (id.includes('modal') || id.includes('overlay')) {
                patterns.modalElements.push(issue);
            } else if (id.includes('nav') || id.includes('tab') || id.includes('menu')) {
                patterns.navigationElements.push(issue);
            } else if (id.includes('container') || id.includes('section') || id.includes('content')) {
                patterns.containerElements.push(issue);
            }
        });

        return patterns;
    }

    /**
     * Analyze tab navigation patterns
     */
    analyzeTabNavigationPatterns() {
        const tabGroups = new Map();
        
        this.issues.tabNavigationIssues.forEach(issue => {
            if (issue.tabId) {
                const groupName = issue.tabId.replace(/-tab$/, '').replace(/-(overview|content|info)$/, '');
                if (!tabGroups.has(groupName)) {
                    tabGroups.set(groupName, []);
                }
                tabGroups.get(groupName).push(issue);
            }
        });

        return { tabGroups };
    }

    /**
     * Analyze error patterns for deduplication
     */
    analyzeErrorPatterns() {
        const patterns = {
            repetitiveWarnings: [],
            unsafeMethodCalls: [],
            nullReferenceErrors: []
        };

        this.issues.consoleErrorPatterns.forEach(issue => {
            if (issue.issue === 'repetitive_warning') {
                patterns.repetitiveWarnings.push(issue);
            } else if (issue.issue === 'unsafe_method_call') {
                patterns.unsafeMethodCalls.push(issue);
            }
        });

        return patterns;
    }

    /**
     * Generate all intelligent fixes
     */
    generateIntelligentFixes() {
        console.log('🧠 Generating intelligent pattern-based fixes...');
        
        this.generateDuplicateIdFixes();
        this.generateMissingElementFixes();
        this.generateTabNavigationFixes();
        this.generateErrorDeduplicationFixes();
        
        return this.fixes;
    }

    /**
     * Generate intelligent duplicate ID fixes
     */
    generateDuplicateIdFixes() {
        console.log('🔧 Generating duplicate ID fixes...');
        
        // Form elements get context-specific prefixes
        this.patterns.duplicateIdPatterns.formElements.forEach(id => {
            this.fixes.push({
                type: 'duplicate_id_smart_fix',
                description: `Rename duplicate form element "${id}" with context prefix`,
                file: 'index.html',
                action: 'rename_with_context',
                originalId: id,
                strategy: 'form_context',
                renames: this.generateFormContextRenames(id),
                severity: 'high'
            });
        });

        // Modal elements get modal-specific prefixes
        this.patterns.duplicateIdPatterns.modalElements.forEach(id => {
            this.fixes.push({
                type: 'duplicate_id_smart_fix',
                description: `Rename duplicate modal element "${id}" with modal prefix`,
                file: 'index.html',
                action: 'rename_with_context',
                originalId: id,
                strategy: 'modal_context',
                renames: this.generateModalContextRenames(id),
                severity: 'high'
            });
        });

        // Repeated sections get section prefixes
        this.patterns.duplicateIdPatterns.repeatedSections.forEach(id => {
            this.fixes.push({
                type: 'duplicate_id_smart_fix',
                description: `Rename duplicate section "${id}" with section prefix`,
                file: 'index.html',
                action: 'rename_with_context',
                originalId: id,
                strategy: 'section_context',
                renames: this.generateSectionContextRenames(id),
                severity: 'medium'
            });
        });
    }

    /**
     * Generate form context renames
     */
    generateFormContextRenames(id) {
        // Determine context based on surrounding form structure
        if (id.includes('harvest')) {
            return [`harvest-${id}`, `plant-${id}`];
        } else if (id.includes('fish')) {
            return [`fish-${id}`, `tank-${id}`];
        } else if (id.includes('nutrient')) {
            return [`nutrient-${id}`, `water-${id}`];
        }
        return [`main-${id}`, `alt-${id}`];
    }

    /**
     * Generate modal context renames  
     */
    generateModalContextRenames(id) {
        return [`main-${id}`, `secondary-${id}`, `popup-${id}`];
    }

    /**
     * Generate section context renames
     */
    generateSectionContextRenames(id) {
        return [`primary-${id}`, `secondary-${id}`, `mobile-${id}`];
    }

    /**
     * Generate intelligent missing element fixes
     */
    generateMissingElementFixes() {
        console.log('🔧 Generating missing element fixes...');

        // Chart elements: Add existence checks (following fish-density-chart pattern)
        this.patterns.missingElementPatterns.chartElements.forEach(issue => {
            this.fixes.push({
                type: 'missing_chart_element_fix',
                description: `Add defensive check for chart element "${issue.id}"`,
                file: issue.file,
                action: 'add_defensive_check',
                elementId: issue.id,
                checkPattern: `const canvas = document.getElementById('${issue.id}');
        if (!canvas) {
            console.warn('Chart canvas ${issue.id} not found in DOM');
            return;
        }`,
                severity: 'high'
            });
        });

        // Form elements: Add dynamic creation or warning
        this.patterns.missingElementPatterns.formElements.forEach(issue => {
            this.fixes.push({
                type: 'missing_form_element_fix',
                description: `Add defensive handling for form element "${issue.id}"`,
                file: issue.file,
                action: 'add_defensive_check',
                elementId: issue.id,
                checkPattern: `const element = document.getElementById('${issue.id}');
        if (!element) {
            console.warn('Form element ${issue.id} not found in DOM');
            return;
        }`,
                severity: 'medium'
            });
        });

        // Modal elements: Add existence checks (following closeAuthModal pattern)
        this.patterns.missingElementPatterns.modalElements.forEach(issue => {
            this.fixes.push({
                type: 'missing_modal_element_fix',
                description: `Add defensive check for modal element "${issue.id}"`,
                file: issue.file,
                action: 'add_defensive_check',
                elementId: issue.id,
                checkPattern: `const modal = document.getElementById('${issue.id}');
        if (!modal) {
            console.warn('Modal element ${issue.id} not found in DOM');
            return;
        }`,
                severity: 'medium'
            });
        });

        // Container elements: Add null checks
        this.patterns.missingElementPatterns.containerElements.forEach(issue => {
            this.fixes.push({
                type: 'missing_container_element_fix',
                description: `Add null check for container "${issue.id}"`,
                file: issue.file,
                action: 'add_null_check',
                elementId: issue.id,
                checkPattern: `if (!document.getElementById('${issue.id}')) return;`,
                severity: 'low'
            });
        });
    }

    /**
     * Generate intelligent tab navigation fixes
     */
    generateTabNavigationFixes() {
        console.log('🔧 Generating tab navigation fixes...');

        // Fix missing data-target attributes (following fish-mgmt-tab pattern)
        this.issues.tabNavigationIssues.forEach(issue => {
            if (issue.issue === 'missing_target_attribute') {
                const targetId = issue.tabId.replace('-tab', '-content');
                
                this.fixes.push({
                    type: 'tab_target_attribute_fix',
                    description: `Add data-target="${targetId}" to tab "${issue.tabId}"`,
                    file: 'index.html',
                    action: 'add_data_target',
                    tabId: issue.tabId,
                    targetId: targetId,
                    severity: 'high'
                });

                // Also create the content container
                this.fixes.push({
                    type: 'tab_content_container_fix',
                    description: `Create content container "${targetId}"`,
                    file: 'index.html',
                    action: 'create_tab_content',
                    contentId: targetId,
                    tabId: issue.tabId,
                    severity: 'high'
                });
            }
        });

        // Add missing tab handlers to NavigationManager (following fish-health-monitoring pattern)
        for (const [groupName, issues] of this.patterns.tabNavigationPatterns.tabGroups.entries()) {
            const hasHandlerIssue = issues.some(i => i.issue === 'missing_tab_handler');
            if (hasHandlerIssue) {
                this.fixes.push({
                    type: 'tab_handler_fix',
                    description: `Add missing tab handler for "${groupName}" group`,
                    file: 'public/js/modules/components/navigationManager.js',
                    action: 'add_tab_handler',
                    groupName: groupName,
                    handlerMethod: this.generateTabHandlerMethod(groupName),
                    severity: 'medium'
                });
            }
        }
    }

    /**
     * Generate tab handler method (following NavigationManager patterns)
     */
    generateTabHandlerMethod(groupName) {
        const methodName = `setup${this.capitalize(groupName)}Tabs`;
        const tabClass = `${groupName}-tab`;
        const contentClass = `${groupName}-content`;
        
        return `
    /**
     * Setup ${groupName} tabs
     * Generated by intelligent fix system
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
                
                // Load specific content based on tab
                if (targetContent.includes('overview')) {
                    // Load overview data
                    console.log('Loading ${groupName} overview data...');
                } else if (targetContent.includes('management')) {
                    // Load management interface
                    console.log('Loading ${groupName} management interface...');
                } else if (targetContent.includes('monitoring')) {
                    // Load monitoring dashboard
                    console.log('Loading ${groupName} monitoring dashboard...');
                }
            });
        });
    }`;
    }

    /**
     * Generate error deduplication fixes (following nutrient warning pattern)
     */
    generateErrorDeduplicationFixes() {
        console.log('🔧 Generating error deduplication fixes...');

        // Create central error manager
        this.fixes.push({
            type: 'error_manager_creation',
            description: 'Create central error deduplication manager',
            file: 'script.js',
            action: 'add_error_manager',
            managerCode: this.generateErrorManagerCode(),
            severity: 'medium'
        });

        // Fix repetitive warnings with deduplication
        const warningGroups = new Map();
        this.patterns.errorPatterns.repetitiveWarnings.forEach(issue => {
            const key = this.extractWarningKey(issue);
            if (!warningGroups.has(key)) {
                warningGroups.set(key, []);
            }
            warningGroups.get(key).push(issue);
        });

        for (const [warningKey, issues] of warningGroups.entries()) {
            this.fixes.push({
                type: 'warning_deduplication_fix',
                description: `Add deduplication for "${warningKey}" warnings`,
                files: issues.map(i => i.file),
                action: 'deduplicate_warnings',
                warningKey: warningKey,
                issues: issues,
                deduplicationCode: this.generateWarningDeduplicationCode(warningKey),
                severity: 'low'
            });
        }

        // Fix unsafe method calls with defensive checks
        this.patterns.errorPatterns.unsafeMethodCalls.forEach(issue => {
            const methodMatch = issue.code.match(/(\w+)\.(\w+)\s*\(/);
            if (methodMatch) {
                const object = methodMatch[1];
                const method = methodMatch[2];
                
                this.fixes.push({
                    type: 'unsafe_method_call_fix',
                    description: `Add defensive check for ${object}.${method}()`,
                    file: issue.file,
                    action: 'add_defensive_check',
                    line: issue.line,
                    originalCode: issue.code,
                    defensiveCode: this.generateDefensiveMethodCall(object, method, issue.code),
                    severity: 'medium'
                });
            }
        });
    }

    /**
     * Generate error manager code (following successful patterns)
     */
    generateErrorManagerCode() {
        return `
    /**
     * Central Error Deduplication Manager
     * Prevents console spam from repeated warnings
     */
    class ErrorManager {
        constructor() {
            this.warningCache = new Map();
            this.errorCache = new Map();
            this.throttleTime = 5000; // 5 seconds
        }

        /**
         * Deduplicated warning (following nutrient warning pattern)
         */
        warnOnce(key, message, context = '') {
            const now = Date.now();
            const cacheKey = \`\${key}:\${context}\`;
            
            if (!this.warningCache.has(cacheKey) || 
                (now - this.warningCache.get(cacheKey)) > this.throttleTime) {
                console.warn(message);
                this.warningCache.set(cacheKey, now);
                return true;
            }
            return false;
        }

        /**
         * Deduplicated error logging
         */
        errorOnce(key, message, error = null) {
            const now = Date.now();
            
            if (!this.errorCache.has(key) || 
                (now - this.errorCache.get(key)) > this.throttleTime) {
                console.error(message, error);
                this.errorCache.set(key, now);
                return true;
            }
            return false;
        }

        /**
         * Clear old cache entries (prevent memory leaks)
         */
        clearOldEntries() {
            const now = Date.now();
            const maxAge = this.throttleTime * 10; // 50 seconds
            
            for (const [key, timestamp] of this.warningCache.entries()) {
                if (now - timestamp > maxAge) {
                    this.warningCache.delete(key);
                }
            }
            
            for (const [key, timestamp] of this.errorCache.entries()) {
                if (now - timestamp > maxAge) {
                    this.errorCache.delete(key);
                }
            }
        }
    }

    // Global error manager instance
    window.errorManager = new ErrorManager();
    
    // Clear old entries every minute
    setInterval(() => {
        window.errorManager.clearOldEntries();
    }, 60000);`;
    }

    /**
     * Extract warning key for grouping
     */
    extractWarningKey(issue) {
        const message = issue.code.match(/console\.(warn|log)\s*\(\s*['"\`]([^'"\`]+)['"\`]/);
        if (message) {
            return message[2].replace(/\$\{[^}]+\}/g, '{}'); // Normalize template variables
        }
        return 'unknown_warning';
    }

    /**
     * Generate warning deduplication code
     */
    generateWarningDeduplicationCode(warningKey) {
        return `
        // Replace console.warn with deduplicated version
        if (window.errorManager) {
            window.errorManager.warnOnce('${warningKey}', \`${warningKey}\`, systemId || 'global');
        } else {
            console.warn(\`${warningKey}\`);
        }`;
    }

    /**
     * Generate defensive method call
     */
    generateDefensiveMethodCall(object, method, originalCode) {
        // Follow closeAuthModal pattern
        if (method.includes('close') || method.includes('hide') || method.includes('show')) {
            return `if (${object}) { ${originalCode} }`;
        }
        
        // Follow chart pattern
        if (object.includes('chart') || object.includes('Chart')) {
            return `if (${object} && typeof ${object}.${method} === 'function') { ${originalCode} }`;
        }
        
        // General defensive pattern
        return `if (${object}) { ${originalCode} }`;
    }

    /**
     * Save all fixes to executable scripts
     */
    async saveIntelligentFixes() {
        // Save the main fix applier
        const fixApplier = this.generateFixApplierScript();
        fs.writeFileSync(
            path.join(__dirname, 'apply-intelligent-fixes.js'),
            fixApplier
        );

        // Save specific fix scripts by category
        await this.saveCategoryFixes();

        console.log('✅ Intelligent fix files generated:');
        console.log('   - testing/apply-intelligent-fixes.js (main applier)');
        console.log('   - testing/fix-duplicate-ids.js');
        console.log('   - testing/fix-missing-elements.js');
        console.log('   - testing/fix-tab-navigation.js');
        console.log('   - testing/fix-error-patterns.js');
    }

    /**
     * Save category-specific fixes
     */
    async saveCategoryFixes() {
        const categories = {
            'fix-duplicate-ids.js': this.fixes.filter(f => f.type.includes('duplicate_id')),
            'fix-missing-elements.js': this.fixes.filter(f => f.type.includes('missing_')),
            'fix-tab-navigation.js': this.fixes.filter(f => f.type.includes('tab_')),
            'fix-error-patterns.js': this.fixes.filter(f => f.type.includes('error_') || f.type.includes('warning_'))
        };

        for (const [filename, fixes] of Object.entries(categories)) {
            const script = this.generateCategoryFixScript(filename.replace('.js', ''), fixes);
            fs.writeFileSync(path.join(__dirname, filename), script);
        }
    }

    /**
     * Generate category-specific fix script
     */
    generateCategoryFixScript(category, fixes) {
        return `#!/usr/bin/env node

/**
 * ${category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Script
 * Generated by Intelligent Fix Generator
 */

const fs = require('fs');
const path = require('path');

class ${this.capitalize(category.replace(/-/g, ''))}Fixer {
    constructor() {
        this.fixes = ${JSON.stringify(fixes, null, 8)};
        this.applied = 0;
        this.failed = 0;
    }

    async applyFixes() {
        console.log(\`🔧 Applying \${this.fixes.length} ${category} fixes...\`);
        
        for (const fix of this.fixes) {
            try {
                await this.applyFix(fix);
                this.applied++;
                console.log(\`✅ \${fix.description}\`);
            } catch (error) {
                this.failed++;
                console.error(\`❌ \${fix.description}:\`, error.message);
            }
        }
        
        console.log(\`\\n📊 ${category} Results: \${this.applied} applied, \${this.failed} failed\`);
    }

    async applyFix(fix) {
        // Implementation would go here based on fix.action
        console.log(\`Applying \${fix.action} for \${fix.description}\`);
    }
}

// Run if called directly
if (require.main === module) {
    const fixer = new ${this.capitalize(category.replace(/-/g, ''))}Fixer();
    fixer.applyFixes().catch(error => {
        console.error('❌ Fix application failed:', error);
        process.exit(1);
    });
}

module.exports = ${this.capitalize(category.replace(/-/g, ''))}Fixer;`;
    }

    /**
     * Generate main fix applier script
     */
    generateFixApplierScript() {
        return `#!/usr/bin/env node

/**
 * Intelligent Fix Applier
 * Applies pattern-based fixes following successful repair strategies
 */

const fs = require('fs');
const path = require('path');

class IntelligentFixApplier {
    constructor() {
        this.fixes = ${JSON.stringify(this.fixes, null, 8)};
        this.results = {
            applied: 0,
            failed: 0,
            skipped: 0
        };
    }

    async applyAllFixes() {
        console.log('🧠 Applying intelligent pattern-based fixes...');
        console.log(\`Total fixes to apply: \${this.fixes.length}\`);
        
        // Apply fixes by category for better error isolation
        await this.applyFixesByType('duplicate_id_smart_fix');
        await this.applyFixesByType('missing_chart_element_fix');
        await this.applyFixesByType('missing_form_element_fix');
        await this.applyFixesByType('tab_target_attribute_fix');
        await this.applyFixesByType('error_manager_creation');
        
        this.showResults();
    }

    async applyFixesByType(fixType) {
        const fixes = this.fixes.filter(f => f.type === fixType);
        if (fixes.length === 0) return;
        
        console.log(\`\\n🔧 Applying \${fixes.length} \${fixType} fixes...\`);
        
        for (const fix of fixes) {
            try {
                await this.applyFix(fix);
                this.results.applied++;
                console.log(\`  ✅ \${fix.description}\`);
            } catch (error) {
                this.results.failed++;
                console.error(\`  ❌ \${fix.description}:\`, error.message);
            }
        }
    }

    async applyFix(fix) {
        const filePath = path.join(__dirname, '..', fix.file);
        
        switch (fix.action) {
            case 'rename_with_context':
                await this.applyContextualRename(filePath, fix);
                break;
            case 'add_defensive_check':
                await this.addDefensiveCheck(filePath, fix);
                break;
            case 'add_data_target':
                await this.addDataTarget(filePath, fix);
                break;
            case 'create_tab_content':
                await this.createTabContent(filePath, fix);
                break;
            case 'add_error_manager':
                await this.addErrorManager(filePath, fix);
                break;
            default:
                throw new Error(\`Unknown fix action: \${fix.action}\`);
        }
    }

    async applyContextualRename(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Apply renames based on context
        fix.renames.forEach((newId, index) => {
            if (index === 0) return; // Keep first occurrence
            
            // Find nth occurrence and rename
            const regex = new RegExp(\`id="?\${fix.originalId}"?\`, 'g');
            let match;
            let count = 0;
            
            while ((match = regex.exec(content)) !== null) {
                count++;
                if (count === index + 1) {
                    content = content.substring(0, match.index) + 
                             \`id="\${newId}"\` + 
                             content.substring(match.index + match[0].length);
                    break;
                }
            }
        });
        
        fs.writeFileSync(filePath, content);
    }

    async addDefensiveCheck(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Find element usage and add check before it
        const elementUsage = \`document.getElementById('\${fix.elementId}')\`;
        const checkCode = fix.checkPattern;
        
        if (content.includes(elementUsage)) {
            content = content.replace(elementUsage, \`\${checkCode}\\n        \${elementUsage}\`);
            fs.writeFileSync(filePath, content);
        }
    }

    async addDataTarget(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add data-target to tab button
        const tabPattern = new RegExp(\`(<[^>]*id="\${fix.tabId}"[^>]*)\`, 'i');
        content = content.replace(tabPattern, \`$1 data-target="\${fix.targetId}"\`);
        
        fs.writeFileSync(filePath, content);
    }

    async createTabContent(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Create content div near other tab content
        const contentDiv = \`<div id="\${fix.contentId}" class="tab-content">
            <p>Content for \${fix.tabId}</p>
        </div>\`;
        
        // Insert before closing body tag
        content = content.replace('</body>', \`    \${contentDiv}\\n</body>\`);
        
        fs.writeFileSync(filePath, content);
    }

    async addErrorManager(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(\`File not found: \${fix.file}\`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add error manager at the beginning of the file (after initial comments)
        const insertPoint = content.indexOf('class AquaponicsApp') || content.indexOf('$(document)') || 0;
        
        content = content.substring(0, insertPoint) + 
                 fix.managerCode + 
                 '\\n\\n' + 
                 content.substring(insertPoint);
        
        fs.writeFileSync(filePath, content);
    }

    showResults() {
        console.log('\\n📊 INTELLIGENT FIX RESULTS');
        console.log('=====================================');
        console.log(\`✅ Applied: \${this.results.applied}\`);
        console.log(\`❌ Failed: \${this.results.failed}\`);
        console.log(\`⏭️ Skipped: \${this.results.skipped}\`);
        console.log(\`📈 Success Rate: \${((this.results.applied / (this.results.applied + this.results.failed)) * 100).toFixed(1)}%\`);
    }
}

// Run if called directly
if (require.main === module) {
    const applier = new IntelligentFixApplier();
    applier.applyAllFixes().catch(error => {
        console.error('❌ Intelligent fix application failed:', error);
        process.exit(1);
    });
}

module.exports = IntelligentFixApplier;`;
    }

    /**
     * Utility function to capitalize strings
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntelligentFixGenerator;
}

// Run if called directly
if (require.main === module) {
    const issuesFile = process.argv[2] || 'issues.json';
    
    if (!fs.existsSync(issuesFile)) {
        console.error('❌ Issues file not found. Run issue-scanner.js first.');
        process.exit(1);
    }
    
    const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
    const generator = new IntelligentFixGenerator(issues);
    
    const fixes = generator.generateIntelligentFixes();
    generator.saveIntelligentFixes();
    
    console.log('\\n✅ Generated ' + fixes.length + ' intelligent fixes');
    console.log('🚀 Run: node testing/apply-intelligent-fixes.js');
}