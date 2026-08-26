// Integration Test for Aquaponics App
// Tests all critical functionality after modularization

class AquaponicsIntegrationTester {
    constructor() {
        this.testResults = [];
        this.criticalErrors = [];
        this.warnings = [];
        this.startTime = Date.now();
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🧪 Starting Aquaponics App Integration Tests...');
        
        // Wait for app to be available
        await this.waitForApp();
        
        // Test critical functionality
        await this.testIconLoading();
        await this.testAuthenticationFlow();
        await this.testNavigation();
        await this.testModuleInitialization();
        await this.testDataLoading();
        await this.testChartSystem();
        await this.testFormSubmission();
        
        // Generate report
        this.generateTestReport();
        
        return this.getTestSummary();
    }

    /**
     * Wait for app to be available
     */
    async waitForApp() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds
            
            const checkApp = () => {
                attempts++;
                if (window.app && window.app.init) {
                    this.logTest('App Availability', 'PASS', 'App object found and initialized');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    this.logTest('App Availability', 'FAIL', 'App object not found after 5 seconds');
                    reject(new Error('App not available'));
                } else {
                    setTimeout(checkApp, 100);
                }
            };
            
            checkApp();
        });
    }

    /**
     * Test icon loading (fish.svg fix)
     */
    async testIconLoading() {
        console.log('Testing icon loading...');
        
        // Test fish icon exists
        const fishIcons = document.querySelectorAll('img[src*="fish"]');
        let correctIcons = 0;
        let incorrectIcons = 0;
        
        fishIcons.forEach(img => {
            if (img.src.includes('Afraponix Go Icons_fish.svg')) {
                correctIcons++;
            } else if (img.src.includes('fish.svg')) {
                incorrectIcons++;
                this.criticalErrors.push(`Incorrect fish icon path: ${img.src}`);
            }
        });
        
        if (incorrectIcons === 0) {
            this.logTest('Fish Icon Loading', 'PASS', `${correctIcons} fish icons using correct path`);
        } else {
            this.logTest('Fish Icon Loading', 'FAIL', `${incorrectIcons} icons still using incorrect path`);
        }
        
        // Test icon accessibility
        const missingAltText = Array.from(fishIcons).filter(img => !img.alt);
        if (missingAltText.length === 0) {
            this.logTest('Icon Accessibility', 'PASS', 'All fish icons have alt text');
        } else {
            this.logTest('Icon Accessibility', 'WARN', `${missingAltText.length} icons missing alt text`);
        }
    }

    /**
     * Test authentication flow
     */
    async testAuthenticationFlow() {
        console.log('Testing authentication flow...');
        
        // Test closeAuthModal function exists
        const hasModalManager = window.app && window.app.modalManager;
        if (hasModalManager && typeof window.app.modalManager.closeAuthModal === 'function') {
            this.logTest('closeAuthModal Function', 'PASS', 'Function exists on modalManager');
        } else {
            this.logTest('closeAuthModal Function', 'FAIL', 'Function missing from modalManager');
        }
        
        // Test login modal elements exist
        const loginElements = {
            loginButton: document.querySelector('#login-btn'),
            loginModal: document.querySelector('.auth-slideout'),
            usernameField: document.querySelector('#username'),
            passwordField: document.querySelector('#password')
        };
        
        let missingElements = [];
        Object.entries(loginElements).forEach(([name, element]) => {
            if (!element) {
                missingElements.push(name);
            }
        });
        
        if (missingElements.length === 0) {
            this.logTest('Login Elements', 'PASS', 'All login elements present');
        } else {
            this.logTest('Login Elements', 'FAIL', `Missing: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Test navigation system
     */
    async testNavigation() {
        console.log('Testing navigation system...');
        
        // Test navigation buttons exist
        const navButtons = document.querySelectorAll('.nav-btn');
        this.logTest('Navigation Buttons', navButtons.length > 0 ? 'PASS' : 'FAIL', 
                    `Found ${navButtons.length} navigation buttons`);
        
        // Test specific navigation attributes
        const fishBtn = document.querySelector('#fish-btn');
        if (fishBtn) {
            const dataAttr = fishBtn.getAttribute('data-view') || fishBtn.getAttribute('data-target');
            if (dataAttr === 'fish-tank') {
                this.logTest('Fish Navigation', 'PASS', 'Fish button has correct data attribute');
            } else {
                this.logTest('Fish Navigation', 'FAIL', `Fish button data attribute: ${dataAttr}`);
            }
        } else {
            this.logTest('Fish Navigation', 'FAIL', 'Fish navigation button not found');
        }
        
        // Test views exist
        const views = document.querySelectorAll('.view');
        const fishTankView = document.querySelector('#fish-tank');
        
        if (views.length > 0) {
            this.logTest('View Elements', 'PASS', `Found ${views.length} view elements`);
        } else {
            this.logTest('View Elements', 'FAIL', 'No view elements found');
        }
        
        if (fishTankView) {
            this.logTest('Fish Tank View', 'PASS', 'Fish tank view element exists');
        } else {
            this.logTest('Fish Tank View', 'FAIL', 'Fish tank view element missing');
        }
    }

    /**
     * Test module initialization
     */
    async testModuleInitialization() {
        console.log('Testing module initialization...');
        
        const requiredModules = [
            'modalManager',
            'navigationManager', 
            'fishTankManager',
            'dashboardManager',
            'systemManager'
        ];
        
        let initializedModules = 0;
        let failedModules = [];
        
        requiredModules.forEach(moduleName => {
            if (window.app && window.app[moduleName]) {
                initializedModules++;
            } else {
                failedModules.push(moduleName);
            }
        });
        
        if (failedModules.length === 0) {
            this.logTest('Module Initialization', 'PASS', `All ${initializedModules} critical modules initialized`);
        } else {
            this.logTest('Module Initialization', 'FAIL', `Failed modules: ${failedModules.join(', ')}`);
        }
        
        // Test basic navigation setup as fallback
        if (!window.app.navigationManager) {
            const basicNavSetup = typeof window.app.setupBasicNavigation === 'function';
            this.logTest('Fallback Navigation', basicNavSetup ? 'PASS' : 'FAIL', 
                        'Basic navigation fallback available');
        }
    }

    /**
     * Test data loading capabilities
     */
    async testDataLoading() {
        console.log('Testing data loading...');
        
        // Test API methods exist
        const apiMethods = ['makeApiCall', 'loadDataRecords', 'getActiveSystem'];
        let workingMethods = 0;
        
        apiMethods.forEach(method => {
            if (window.app && typeof window.app[method] === 'function') {
                workingMethods++;
            }
        });
        
        this.logTest('API Methods', workingMethods === apiMethods.length ? 'PASS' : 'FAIL',
                    `${workingMethods}/${apiMethods.length} API methods available`);
        
        // Test data properties
        const dataProperties = ['dataRecords', 'plantData', 'fishData', 'growBeds'];
        let availableData = 0;
        
        dataProperties.forEach(prop => {
            if (window.app && window.app[prop] !== undefined) {
                availableData++;
            }
        });
        
        this.logTest('Data Properties', 'INFO', `${availableData}/${dataProperties.length} data properties initialized`);
    }

    /**
     * Test chart system
     */
    async testChartSystem() {
        console.log('Testing chart system...');
        
        // Test chart containers exist
        const chartContainers = document.querySelectorAll('[id$="-chart"]');
        this.logTest('Chart Containers', chartContainers.length > 0 ? 'PASS' : 'FAIL',
                    `Found ${chartContainers.length} chart containers`);
        
        // Test Chart.js availability
        const hasChartJs = typeof window.Chart !== 'undefined';
        this.logTest('Chart.js Library', hasChartJs ? 'PASS' : 'FAIL', 
                    hasChartJs ? 'Chart.js loaded' : 'Chart.js not available');
        
        // Test chart manager
        const hasChartManager = window.app && window.app.chartsComponent;
        this.logTest('Chart Manager', hasChartManager ? 'PASS' : 'WARN',
                    hasChartManager ? 'Chart manager available' : 'Chart manager not initialized');
    }

    /**
     * Test form submission capabilities
     */
    async testFormSubmission() {
        console.log('Testing form submission...');
        
        // Test forms exist
        const forms = document.querySelectorAll('form');
        this.logTest('Form Elements', forms.length > 0 ? 'PASS' : 'WARN',
                    `Found ${forms.length} form elements`);
        
        // Test form validation
        const hasFormValidator = window.app && window.app.formValidator;
        this.logTest('Form Validation', hasFormValidator ? 'PASS' : 'WARN',
                    hasFormValidator ? 'Form validator available' : 'Form validator not initialized');
        
        // Test notification system
        const hasNotifications = window.app && window.app.notificationManager;
        this.logTest('Notification System', hasNotifications ? 'PASS' : 'WARN',
                    hasNotifications ? 'Notification manager available' : 'Notification manager not initialized');
    }

    /**
     * Log test result
     */
    logTest(testName, status, details) {
        const result = {
            test: testName,
            status: status,
            details: details,
            timestamp: Date.now() - this.startTime
        };
        
        this.testResults.push(result);
        
        const statusIcon = {
            'PASS': '✅',
            'FAIL': '❌', 
            'WARN': '⚠️',
            'INFO': 'ℹ️'
        }[status] || '❓';
        
        console.log(`${statusIcon} ${testName}: ${details}`);
        
        if (status === 'FAIL') {
            this.criticalErrors.push(`${testName}: ${details}`);
        } else if (status === 'WARN') {
            this.warnings.push(`${testName}: ${details}`);
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        const warnings = this.testResults.filter(r => r.status === 'WARN').length;
        
        console.log('\n📊 Integration Test Report');
        console.log('=' * 50);
        console.log(`Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`🕐 Duration: ${Date.now() - this.startTime}ms`);
        
        if (this.criticalErrors.length > 0) {
            console.log('\n🚨 Critical Errors:');
            this.criticalErrors.forEach(error => console.log(`  • ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`  • ${warning}`));
        }
        
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach(result => {
            const statusIcon = {
                'PASS': '✅',
                'FAIL': '❌',
                'WARN': '⚠️', 
                'INFO': 'ℹ️'
            }[result.status] || '❓';
            console.log(`  ${statusIcon} ${result.test}: ${result.details}`);
        });
    }

    /**
     * Get test summary
     */
    getTestSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: this.warnings.length,
            criticalErrors: this.criticalErrors,
            success: failedTests === 0,
            duration: Date.now() - this.startTime
        };
    }
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
    window.runIntegrationTests = async () => {
        const tester = new AquaponicsIntegrationTester();
        return await tester.runAllTests();
    };
    
    // Auto-run after a delay to ensure app is loaded
    setTimeout(async () => {
        console.log('🔧 Auto-running integration tests...');
        await window.runIntegrationTests();
    }, 2000);
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AquaponicsIntegrationTester;
}