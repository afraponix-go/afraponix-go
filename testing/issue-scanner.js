#!/usr/bin/env node

/**
 * Comprehensive Issue Scanner for Afraponix Go
 * Detects duplicate IDs, missing DOM elements, tab navigation issues,
 * chart initialization problems, and console error patterns
 */

const fs = require('fs');
const path = require('path');

class IssueScanner {
    constructor() {
        this.issues = {
            duplicateIds: [],
            missingDomElements: [],
            tabNavigationIssues: [],
            chartInitializationIssues: [],
            consoleErrorPatterns: [],
            iconPathIssues: [],
            authenticationIssues: [],
            apiEndpointIssues: []
        };
        
        this.htmlContent = '';
        this.jsFiles = [];
        this.allIds = new Map(); // Track ID occurrences
        this.chartIds = new Set(); // Expected chart elements
        this.tabGroups = new Map(); // Tab group patterns
    }

    /**
     * Main scanner entry point
     */
    async scan() {
        console.log('🔍 Starting comprehensive issue scan...');
        
        // Load all files
        await this.loadFiles();
        
        // Run all scanners
        this.scanDuplicateIds();
        this.scanMissingDomElements();
        this.scanTabNavigationIssues();
        this.scanChartInitializationIssues();
        this.scanConsoleErrorPatterns();
        this.scanIconPathIssues();
        this.scanAuthenticationIssues();
        this.scanApiEndpointIssues();
        
        // Generate report
        this.generateReport();
        
        console.log('✅ Issue scan complete');
        return this.issues;
    }

    /**
     * Load all HTML and JS files
     */
    async loadFiles() {
        // Load main HTML file
        const htmlPath = path.join(__dirname, '..', 'index.html');
        this.htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Load main script.js
        const scriptPath = path.join(__dirname, '..', 'script.js');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        this.jsFiles.push({ path: 'script.js', content: scriptContent });
        
        // Load modular JS files
        const modulesPath = path.join(__dirname, '..', 'public', 'js', 'modules');
        if (fs.existsSync(modulesPath)) {
            this.loadJsFilesRecursive(modulesPath, 'public/js/modules/');
        }
        
        console.log(`📁 Loaded ${this.jsFiles.length} JS files`);
    }

    /**
     * Recursively load JS files from modules directory
     */
    loadJsFilesRecursive(dir, relativePath = '') {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.loadJsFilesRecursive(fullPath, `${relativePath}${file}/`);
            } else if (file.endsWith('.js')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                this.jsFiles.push({ 
                    path: `${relativePath}${file}`, 
                    content: content 
                });
            }
        }
    }

    /**
     * Scan for duplicate HTML element IDs
     */
    scanDuplicateIds() {
        console.log('🔍 Scanning for duplicate IDs...');
        
        // Extract all IDs from HTML
        const idMatches = this.htmlContent.match(/id=["']([^"']+)["']/g);
        if (!idMatches) return;
        
        idMatches.forEach(match => {
            const id = match.match(/id=["']([^"']+)["']/)[1];
            
            if (this.allIds.has(id)) {
                this.allIds.get(id).count++;
                this.allIds.get(id).locations.push('index.html');
            } else {
                this.allIds.set(id, { count: 1, locations: ['index.html'] });
            }
        });
        
        // Find duplicates
        for (const [id, data] of this.allIds.entries()) {
            if (data.count > 1) {
                this.issues.duplicateIds.push({
                    id: id,
                    count: data.count,
                    locations: data.locations,
                    severity: 'high',
                    description: `Element ID "${id}" appears ${data.count} times`
                });
            }
        }
        
        console.log(`⚠️ Found ${this.issues.duplicateIds.length} duplicate IDs`);
    }

    /**
     * Scan for missing DOM elements referenced in JavaScript
     */
    scanMissingDomElements() {
        console.log('🔍 Scanning for missing DOM elements...');
        
        const existingIds = new Set();
        const idMatches = this.htmlContent.match(/id=["']([^"']+)["']/g);
        if (idMatches) {
            idMatches.forEach(match => {
                const id = match.match(/id=["']([^"']+)["']/)[1];
                existingIds.add(id);
            });
        }
        
        // Scan JS files for DOM element references
        this.jsFiles.forEach(file => {
            // getElementById references
            const getElementMatches = file.content.match(/getElementById\(['"`]([^'"`]+)['"`]\)/g);
            if (getElementMatches) {
                getElementMatches.forEach(match => {
                    const id = match.match(/getElementById\(['"`]([^'"`]+)['"`]\)/)[1];
                    if (!existingIds.has(id)) {
                        this.issues.missingDomElements.push({
                            id: id,
                            file: file.path,
                            method: 'getElementById',
                            severity: 'high',
                            description: `Referenced element "${id}" not found in DOM`
                        });
                    }
                });
            }
            
            // querySelector ID references
            const querySelectorMatches = file.content.match(/querySelector\(['"`]#([^'"`\s.]+)['"`]\)/g);
            if (querySelectorMatches) {
                querySelectorMatches.forEach(match => {
                    const id = match.match(/querySelector\(['"`]#([^'"`\s.]+)['"`]\)/)[1];
                    if (!existingIds.has(id)) {
                        this.issues.missingDomElements.push({
                            id: id,
                            file: file.path,
                            method: 'querySelector',
                            severity: 'medium',
                            description: `Referenced element "#${id}" not found in DOM`
                        });
                    }
                });
            }
        });
        
        console.log(`⚠️ Found ${this.issues.missingDomElements.length} missing DOM elements`);
    }

    /**
     * Scan for tab navigation issues
     */
    scanTabNavigationIssues() {
        console.log('🔍 Scanning for tab navigation issues...');
        
        // Extract tab button patterns
        const tabButtonMatches = this.htmlContent.match(/<button[^>]*class="[^"]*tab[^"]*"[^>]*>/g);
        if (!tabButtonMatches) return;
        
        tabButtonMatches.forEach(match => {
            const idMatch = match.match(/id=["']([^"']+)["']/);
            const dataTargetMatch = match.match(/data-target=["']([^"']+)["']/);
            const dataViewMatch = match.match(/data-view=["']([^"']+)["']/);
            const classMatch = match.match(/class=["']([^"']+)["']/);
            
            if (idMatch && classMatch) {
                const id = idMatch[1];
                const classes = classMatch[1];
                const target = dataTargetMatch ? dataTargetMatch[1] : (dataViewMatch ? dataViewMatch[1] : null);
                
                // Check for missing data-target or data-view
                if (!target) {
                    this.issues.tabNavigationIssues.push({
                        tabId: id,
                        issue: 'missing_target_attribute',
                        severity: 'high',
                        description: `Tab button "${id}" missing data-target or data-view attribute`,
                        suggestion: `Add data-target="${id.replace('-tab', '-content')}" or similar`
                    });
                }
                
                // Check if target element exists
                if (target && !this.htmlContent.includes(`id="${target}"`)) {
                    this.issues.tabNavigationIssues.push({
                        tabId: id,
                        targetId: target,
                        issue: 'missing_target_element',
                        severity: 'high',
                        description: `Tab "${id}" targets non-existent element "${target}"`,
                        suggestion: `Create element with id="${target}" or fix data-target attribute`
                    });
                }
                
                // Track tab groups for handler verification
                const tabClass = classes.split(' ').find(c => c.endsWith('-tab'));
                if (tabClass) {
                    if (!this.tabGroups.has(tabClass)) {
                        this.tabGroups.set(tabClass, []);
                    }
                    this.tabGroups.get(tabClass).push({ id, target, classes });
                }
            }
        });
        
        // Check for missing tab handlers in NavigationManager
        const navManagerFile = this.jsFiles.find(f => f.path.includes('navigationManager'));
        if (navManagerFile) {
            for (const [tabClass, tabs] of this.tabGroups.entries()) {
                const setupMethodName = `setup${this.capitalize(tabClass.replace('-tab', ''))}Tabs`;
                if (!navManagerFile.content.includes(setupMethodName)) {
                    this.issues.tabNavigationIssues.push({
                        tabClass: tabClass,
                        issue: 'missing_tab_handler',
                        severity: 'medium',
                        description: `No ${setupMethodName} method found in NavigationManager`,
                        suggestion: `Add ${setupMethodName}() method to handle ${tabClass} navigation`
                    });
                }
            }
        }
        
        console.log(`⚠️ Found ${this.issues.tabNavigationIssues.length} tab navigation issues`);
    }

    /**
     * Scan for chart initialization issues
     */
    scanChartInitializationIssues() {
        console.log('🔍 Scanning for chart initialization issues...');
        
        // Find chart canvas elements in HTML
        const canvasMatches = this.htmlContent.match(/<canvas[^>]*id=["']([^"']+)["'][^>]*>/g);
        if (canvasMatches) {
            canvasMatches.forEach(match => {
                const id = match.match(/id=["']([^"']+)["']/)[1];
                if (id.includes('chart')) {
                    this.chartIds.add(id);
                }
            });
        }
        
        // Find chart initialization code in JS files
        this.jsFiles.forEach(file => {
            // Look for Chart.js initialization patterns
            const chartInitMatches = file.content.match(/new Chart\([^)]+\)/g);
            if (chartInitMatches) {
                chartInitMatches.forEach(match => {
                    // Extract canvas reference
                    const canvasRef = match.match(/new Chart\(\s*([^,]+)/)[1].trim();
                    
                    // Check if it uses getElementById
                    if (canvasRef.includes('getElementById')) {
                        const idMatch = canvasRef.match(/getElementById\(['"`]([^'"`]+)['"`]\)/);
                        if (idMatch) {
                            const chartId = idMatch[1];
                            
                            // Check if DOM element exists check is present
                            const beforeChart = file.content.substring(0, file.content.indexOf(match));
                            const domCheckPattern = new RegExp(`${chartId}[^;]*;\\s*if\\s*\\([^)]*!`, 'm');
                            
                            if (!domCheckPattern.test(beforeChart) && !beforeChart.includes(`if (!${chartId})`)) {
                                this.issues.chartInitializationIssues.push({
                                    chartId: chartId,
                                    file: file.path,
                                    issue: 'missing_dom_check',
                                    severity: 'medium',
                                    description: `Chart initialization for "${chartId}" lacks DOM existence check`,
                                    suggestion: `Add: const canvas = document.getElementById('${chartId}'); if (!canvas) return;`
                                });
                            }
                        }
                    }
                });
            }
            
            // Look for destroy() calls without existence checks
            const destroyMatches = file.content.match(/\w+\.destroy\(\)/g);
            if (destroyMatches) {
                destroyMatches.forEach(match => {
                    const chartVar = match.split('.')[0];
                    const beforeDestroy = file.content.substring(0, file.content.indexOf(match));
                    
                    if (!beforeDestroy.includes(`if (${chartVar})`) && !beforeDestroy.includes(`${chartVar} &&`)) {
                        this.issues.chartInitializationIssues.push({
                            chartVariable: chartVar,
                            file: file.path,
                            issue: 'unsafe_destroy',
                            severity: 'low',
                            description: `Chart destroy() call for "${chartVar}" lacks null check`,
                            suggestion: `Add: if (${chartVar}) { ${chartVar}.destroy(); }`
                        });
                    }
                });
            }
        });
        
        console.log(`⚠️ Found ${this.issues.chartInitializationIssues.length} chart initialization issues`);
    }

    /**
     * Scan for console error patterns
     */
    scanConsoleErrorPatterns() {
        console.log('🔍 Scanning for console error patterns...');
        
        this.jsFiles.forEach(file => {
            const lines = file.content.split('\n');
            
            lines.forEach((line, index) => {
                // Function calls without existence checks
                if (line.includes('.') && (line.includes('()') || line.includes('click'))) {
                    const methodCall = line.match(/(\w+)\.(\w+)\s*\(/);
                    if (methodCall) {
                        const object = methodCall[1];
                        const method = methodCall[2];
                        
                        // Check for common error patterns
                        if (!line.includes(`if (${object})`) && 
                            !line.includes(`${object} &&`) &&
                            !line.includes(`?.`) &&
                            (method === 'click' || method.startsWith('close') || method.startsWith('show'))) {
                            
                            this.issues.consoleErrorPatterns.push({
                                file: file.path,
                                line: index + 1,
                                code: line.trim(),
                                issue: 'unsafe_method_call',
                                severity: 'medium',
                                description: `Potentially unsafe method call: ${object}.${method}()`,
                                suggestion: `Add null check: if (${object}) { ${object}.${method}(); }`
                            });
                        }
                    }
                }
                
                // Repetitive console warnings
                if (line.includes('console.warn') || line.includes('console.log')) {
                    const message = line.match(/console\.(warn|log)\s*\(\s*['"`]([^'"`]+)['"`]/);
                    if (message && (message[2].includes('not found') || message[2].includes('No data'))) {
                        this.issues.consoleErrorPatterns.push({
                            file: file.path,
                            line: index + 1,
                            code: line.trim(),
                            issue: 'repetitive_warning',
                            severity: 'low',
                            description: `Potentially repetitive warning: "${message[2]}"`,
                            suggestion: 'Add warning deduplication or rate limiting'
                        });
                    }
                }
            });
        });
        
        console.log(`⚠️ Found ${this.issues.consoleErrorPatterns.length} console error patterns`);
    }

    /**
     * Scan for icon path issues
     */
    scanIconPathIssues() {
        console.log('🔍 Scanning for icon path issues...');
        
        // Check for old icon references
        this.jsFiles.forEach(file => {
            const iconMatches = file.content.match(/["']icons\/[^"']+["']/g);
            if (iconMatches) {
                iconMatches.forEach(match => {
                    const iconPath = match.slice(1, -1); // Remove quotes
                    
                    // Check for simple icon names that should be full names
                    if (iconPath.includes('/fish.svg') || 
                        iconPath.includes('/plant.svg') || 
                        iconPath.includes('/water.svg')) {
                        
                        this.issues.iconPathIssues.push({
                            file: file.path,
                            iconPath: iconPath,
                            issue: 'old_icon_reference',
                            severity: 'medium',
                            description: `Old icon reference: "${iconPath}"`,
                            suggestion: `Update to full icon name like "Afraponix Go Icons_${iconPath.split('/').pop()}"`
                        });
                    }
                });
            }
        });
        
        console.log(`⚠️ Found ${this.issues.iconPathIssues.length} icon path issues`);
    }

    /**
     * Scan for authentication issues
     */
    scanAuthenticationIssues() {
        console.log('🔍 Scanning for authentication issues...');
        
        this.jsFiles.forEach(file => {
            // Check for premature system loading
            if (file.content.includes('updateSystemSelector') || file.content.includes('loadSystems')) {
                const lines = file.content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.includes('updateSystemSelector') || line.includes('loadSystems')) {
                        // Check if it's in constructor or init method
                        const beforeLines = lines.slice(Math.max(0, index - 10), index);
                        const inConstructor = beforeLines.some(l => l.includes('constructor') || l.includes('init'));
                        
                        if (inConstructor && !beforeLines.some(l => l.includes('authenticate') || l.includes('login'))) {
                            this.issues.authenticationIssues.push({
                                file: file.path,
                                line: index + 1,
                                code: line.trim(),
                                issue: 'premature_system_loading',
                                severity: 'high',
                                description: 'System loading called before authentication',
                                suggestion: 'Move system loading after successful authentication'
                            });
                        }
                    }
                });
            }
        });
        
        console.log(`⚠️ Found ${this.issues.authenticationIssues.length} authentication issues`);
    }

    /**
     * Scan for API endpoint issues
     */
    scanApiEndpointIssues() {
        console.log('🔍 Scanning for API endpoint issues...');
        
        this.jsFiles.forEach(file => {
            // Find API calls
            const apiMatches = file.content.match(/\/api\/[^'"`\s)]+/g);
            if (apiMatches) {
                apiMatches.forEach(endpoint => {
                    // Check for missing system ID in endpoints that should have it
                    if (endpoint.includes('/data/') && !endpoint.includes('${') && !endpoint.includes('systemId')) {
                        this.issues.apiEndpointIssues.push({
                            file: file.path,
                            endpoint: endpoint,
                            issue: 'missing_system_id',
                            severity: 'high',
                            description: `API endpoint "${endpoint}" may be missing system ID parameter`,
                            suggestion: 'Add system ID parameter to ensure user-specific data filtering'
                        });
                    }
                    
                    // Check for hardcoded endpoints that should be dynamic
                    if (!endpoint.includes('${') && (endpoint.includes('/1/') || endpoint.includes('/2/'))) {
                        this.issues.apiEndpointIssues.push({
                            file: file.path,
                            endpoint: endpoint,
                            issue: 'hardcoded_id',
                            severity: 'medium',
                            description: `Hardcoded ID in endpoint: "${endpoint}"`,
                            suggestion: 'Use dynamic system ID instead of hardcoded value'
                        });
                    }
                });
            }
        });
        
        console.log(`⚠️ Found ${this.issues.apiEndpointIssues.length} API endpoint issues`);
    }

    /**
     * Generate summary report
     */
    generateReport() {
        const totalIssues = Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0);
        const highSeverityIssues = Object.values(this.issues).flat().filter(i => i.severity === 'high').length;
        const mediumSeverityIssues = Object.values(this.issues).flat().filter(i => i.severity === 'medium').length;
        const lowSeverityIssues = Object.values(this.issues).flat().filter(i => i.severity === 'low').length;
        
        console.log('\n📊 SCAN SUMMARY');
        console.log('=================');
        console.log(`Total Issues Found: ${totalIssues}`);
        console.log(`High Severity: ${highSeverityIssues}`);
        console.log(`Medium Severity: ${mediumSeverityIssues}`);
        console.log(`Low Severity: ${lowSeverityIssues}`);
        console.log('\nIssue Breakdown:');
        console.log(`- Duplicate IDs: ${this.issues.duplicateIds.length}`);
        console.log(`- Missing DOM Elements: ${this.issues.missingDomElements.length}`);
        console.log(`- Tab Navigation Issues: ${this.issues.tabNavigationIssues.length}`);
        console.log(`- Chart Initialization Issues: ${this.issues.chartInitializationIssues.length}`);
        console.log(`- Console Error Patterns: ${this.issues.consoleErrorPatterns.length}`);
        console.log(`- Icon Path Issues: ${this.issues.iconPathIssues.length}`);
        console.log(`- Authentication Issues: ${this.issues.authenticationIssues.length}`);
        console.log(`- API Endpoint Issues: ${this.issues.apiEndpointIssues.length}`);
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
    module.exports = IssueScanner;
}

// Run scanner if called directly
if (require.main === module) {
    const scanner = new IssueScanner();
    scanner.scan().then(issues => {
        console.log('\n✅ Scanner complete. Issues saved to scanner results.');
    }).catch(error => {
        console.error('❌ Scanner failed:', error);
        process.exit(1);
    });
}