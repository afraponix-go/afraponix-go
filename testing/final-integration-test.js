// Final Integration Test - Complete User Workflow
// Tests the entire user journey after all fixes

class FinalIntegrationTester {
    constructor() {
        this.results = [];
        this.errors = [];
        this.startTime = Date.now();
    }

    async runCompleteWorkflowTest() {
        console.log('🚀 Starting Final Integration Test - Complete User Workflow');
        
        try {
            // Test 1: Application Initialization
            await this.testAppInitialization();
            
            // Test 2: Authentication System
            await this.testAuthenticationSystem();
            
            // Test 3: System Loading and Persistence
            await this.testSystemLoadingAndPersistence();
            
            // Test 4: Navigation System
            await this.testNavigationSystem();
            
            // Test 5: Chart System
            await this.testChartSystem();
            
            // Test 6: Module Dependencies
            await this.testModuleDependencies();
            
            // Test 7: Error Handling
            await this.testErrorHandling();
            
            // Test 8: Performance and Responsiveness
            await this.testPerformance();
            
            this.generateFinalReport();
            return this.getTestSummary();
            
        } catch (error) {
            console.error('🚨 Critical test failure:', error);
            this.errors.push({ test: 'Complete Workflow', error: error.message });
            return { success: false, error: error.message };
        }
    }

    async testAppInitialization() {
        console.log('🧪 Testing Application Initialization...');
        
        // Test app object exists
        if (!window.app) {
            throw new Error('App object not found');
        }
        this.logResult('App Object', 'PASS', 'App object exists in global scope');
        
        // Test essential methods exist
        const requiredMethods = ['makeApiCall', 'showNotification', 'loadUserData', 'switchToSystem'];
        const missingMethods = requiredMethods.filter(method => typeof window.app[method] !== 'function');
        
        if (missingMethods.length === 0) {
            this.logResult('App Methods', 'PASS', 'All required methods available');
        } else {
            this.logResult('App Methods', 'FAIL', `Missing methods: ${missingMethods.join(', ')}`);
        }
        
        // Test AppCore service
        if (window.app.appCore) {
            this.logResult('AppCore Service', 'PASS', 'AppCore service initialized');
        } else {
            this.logResult('AppCore Service', 'FAIL', 'AppCore service not initialized');
        }
    }

    async testAuthenticationSystem() {
        console.log('🔐 Testing Authentication System...');
        
        // Test modalManager exists (critical for login)
        if (window.app.modalManager && typeof window.app.modalManager.closeAuthModal === 'function') {
            this.logResult('Modal Manager', 'PASS', 'Modal manager with closeAuthModal available');
        } else {
            this.logResult('Modal Manager', 'FAIL', 'Modal manager or closeAuthModal missing');
        }
        
        // Test authentication elements
        const authElements = {
            loginButton: document.querySelector('#login-btn'),
            loginModal: document.querySelector('.auth-slideout') || document.querySelector('#login-slideout'),
            usernameField: document.querySelector('#username'),
            passwordField: document.querySelector('#password')
        };
        
        const foundElements = Object.entries(authElements).filter(([name, element]) => element).length;
        const totalElements = Object.keys(authElements).length;
        
        if (foundElements === totalElements) {
            this.logResult('Auth Elements', 'PASS', 'All authentication elements present');
        } else {
            this.logResult('Auth Elements', 'WARN', `${foundElements}/${totalElements} auth elements found`);
        }
    }

    async testSystemLoadingAndPersistence() {
        console.log('⚙️ Testing System Loading and Persistence...');
        
        // Test SystemManager
        if (window.app.systemManager) {
            this.logResult('System Manager', 'PASS', 'System manager initialized');
            
            // Test if systems object exists
            if (window.app.systemManager.systems) {
                const systemCount = Object.keys(window.app.systemManager.systems).length;
                this.logResult('Systems Data', systemCount > 0 ? 'PASS' : 'WARN', 
                              `${systemCount} systems available`);
            } else {
                this.logResult('Systems Data', 'FAIL', 'Systems object not initialized');
            }
        } else {
            this.logResult('System Manager', 'FAIL', 'System manager not initialized');
        }
        
        // Test localStorage handling
        try {
            const testKey = 'test_key_' + Date.now();
            localStorage.setItem(testKey, 'test_value');
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved === 'test_value') {
                this.logResult('LocalStorage', 'PASS', 'LocalStorage working correctly');
            } else {
                this.logResult('LocalStorage', 'FAIL', 'LocalStorage read/write failed');
            }
        } catch (error) {
            this.logResult('LocalStorage', 'FAIL', `LocalStorage error: ${error.message}`);
        }
    }

    async testNavigationSystem() {
        console.log('🧭 Testing Navigation System...');
        
        // Test NavigationManager
        if (window.app.navigationManager) {
            this.logResult('Navigation Manager', 'PASS', 'Navigation manager initialized');
        } else {
            // Test fallback navigation
            if (typeof window.app.setupBasicNavigation === 'function') {
                this.logResult('Navigation Manager', 'WARN', 'Using fallback navigation');
            } else {
                this.logResult('Navigation Manager', 'FAIL', 'No navigation system available');
            }
        }
        
        // Test navigation elements
        const navButtons = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view');
        
        this.logResult('Nav Buttons', navButtons.length > 0 ? 'PASS' : 'FAIL', 
                      `${navButtons.length} navigation buttons found`);
        this.logResult('View Elements', views.length > 0 ? 'PASS' : 'FAIL', 
                      `${views.length} view elements found`);
        
        // Test specific fish navigation
        const fishBtn = document.querySelector('#fish-btn');
        const fishView = document.querySelector('#fish-tank');
        
        if (fishBtn && fishView) {
            const dataAttr = fishBtn.getAttribute('data-view') || fishBtn.getAttribute('data-target');
            if (dataAttr === 'fish-tank') {
                this.logResult('Fish Navigation', 'PASS', 'Fish navigation properly configured');
            } else {
                this.logResult('Fish Navigation', 'WARN', `Fish button data attribute: ${dataAttr}`);
            }
        } else {
            this.logResult('Fish Navigation', 'FAIL', 'Fish navigation elements missing');
        }
    }

    async testChartSystem() {
        console.log('📊 Testing Chart System...');
        
        // Test Chart.js availability
        if (typeof window.Chart !== 'undefined') {
            this.logResult('Chart.js Library', 'PASS', 'Chart.js library loaded');
        } else {
            this.logResult('Chart.js Library', 'FAIL', 'Chart.js library not available');
            return;
        }
        
        // Test Charts component
        if (window.app.charts) {
            this.logResult('Charts Component', 'PASS', 'Charts component initialized');
            
            // Test chart containers
            const chartContainers = document.querySelectorAll('[id$="-chart"]');
            this.logResult('Chart Containers', chartContainers.length > 0 ? 'PASS' : 'WARN',
                          `${chartContainers.length} chart containers found`);
            
            // Test defensive chart methods
            if (typeof window.app.updateChart === 'function') {
                this.logResult('Chart Methods', 'PASS', 'Chart update methods available');
            } else {
                this.logResult('Chart Methods', 'FAIL', 'Chart update methods missing');
            }
        } else {
            this.logResult('Charts Component', 'FAIL', 'Charts component not initialized');
        }
        
        // Test DOM utilities for charts
        if (window.domUtils) {
            this.logResult('DOM Utilities', 'PASS', 'DOM utilities available for timing issues');
        } else {
            this.logResult('DOM Utilities', 'WARN', 'DOM utilities not available');
        }
    }

    async testModuleDependencies() {
        console.log('🔗 Testing Module Dependencies...');
        
        const criticalModules = [
            'modalManager',
            'navigationManager',
            'charts',
            'systemManager',
            'fishTankManager',
            'notificationManager'
        ];
        
        let initializedModules = 0;
        const failedModules = [];
        
        criticalModules.forEach(moduleName => {
            if (window.app[moduleName]) {
                initializedModules++;
                this.logResult(`Module: ${moduleName}`, 'PASS', 'Initialized');
            } else {
                failedModules.push(moduleName);
                this.logResult(`Module: ${moduleName}`, 'FAIL', 'Not initialized');
            }
        });
        
        const successRate = (initializedModules / criticalModules.length) * 100;
        this.logResult('Module Initialization', successRate >= 80 ? 'PASS' : 'FAIL',
                      `${successRate.toFixed(0)}% of critical modules initialized`);
    }

    async testErrorHandling() {
        console.log('⚠️ Testing Error Handling...');
        
        // Test notification system
        if (window.app.showNotification && typeof window.app.showNotification === 'function') {
            this.logResult('Notification System', 'PASS', 'Notification system available');
        } else {
            this.logResult('Notification System', 'FAIL', 'Notification system not available');
        }
        
        // Test console error tracking
        let errorCount = 0;
        const originalError = console.error;
        console.error = (...args) => {
            errorCount++;
            originalError.apply(console, args);
        };
        
        // Trigger a safe test that might cause warnings
        try {
            window.app.updateChart?.('non-existent-chart', [], []);
        } catch (error) {
            // Expected - this should be handled gracefully
        }
        
        // Restore console.error
        console.error = originalError;
        
        // Check if errors were handled gracefully
        this.logResult('Error Handling', errorCount <= 1 ? 'PASS' : 'WARN',
                      `${errorCount} console errors during test`);
    }

    async testPerformance() {
        console.log('⚡ Testing Performance...');
        
        const performanceStart = performance.now();
        
        // Test DOM query performance
        const domStart = performance.now();
        document.querySelectorAll('.nav-btn');
        document.querySelectorAll('.view');
        document.querySelectorAll('[id$="-chart"]');
        const domTime = performance.now() - domStart;
        
        // Test module access performance
        const moduleStart = performance.now();
        window.app.systemManager;
        window.app.charts;
        window.app.modalManager;
        const moduleTime = performance.now() - moduleStart;
        
        const totalTime = performance.now() - performanceStart;
        
        this.logResult('DOM Query Performance', domTime < 50 ? 'PASS' : 'WARN',
                      `${domTime.toFixed(2)}ms for DOM queries`);
        this.logResult('Module Access Performance', moduleTime < 10 ? 'PASS' : 'WARN',
                      `${moduleTime.toFixed(2)}ms for module access`);
        this.logResult('Overall Performance', totalTime < 100 ? 'PASS' : 'WARN',
                      `${totalTime.toFixed(2)}ms total test time`);
    }

    logResult(testName, status, details) {
        const result = {
            test: testName,
            status: status,
            details: details,
            timestamp: Date.now() - this.startTime
        };
        
        this.results.push(result);
        
        const statusIcon = {
            'PASS': '✅',
            'FAIL': '❌',
            'WARN': '⚠️'
        }[status] || '❓';
        
        console.log(`${statusIcon} ${testName}: ${details}`);
        
        if (status === 'FAIL') {
            this.errors.push({ test: testName, details });
        }
    }

    generateFinalReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const successRate = (passedTests / totalTests) * 100;
        
        console.log('\n' + '='.repeat(60));
        console.log('🏁 FINAL INTEGRATION TEST REPORT');
        console.log('='.repeat(60));
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`🕐 Duration: ${Date.now() - this.startTime}ms`);
        
        if (successRate >= 80) {
            console.log('\n🎉 TEST RESULT: SUCCESSFUL');
            console.log('The application is ready for use with core functionality working.');
        } else if (successRate >= 60) {
            console.log('\n⚠️ TEST RESULT: PARTIAL SUCCESS');
            console.log('The application has issues but core functionality may work.');
        } else {
            console.log('\n❌ TEST RESULT: FAILED');
            console.log('The application has significant issues that need to be resolved.');
        }
        
        if (this.errors.length > 0) {
            console.log('\n🚨 Critical Issues Found:');
            this.errors.forEach(error => {
                console.log(`  • ${error.test}: ${error.details}`);
            });
        }
        
        console.log('\n💡 Recommendations:');
        if (failedTests === 0) {
            console.log('  • All critical tests passed - ready for production testing');
            console.log('  • Consider running load tests and user acceptance testing');
        } else {
            console.log('  • Address failed tests before deploying to users');
            console.log('  • Review error logs and implement additional defensive programming');
        }
        
        console.log('='.repeat(60));
    }

    getTestSummary() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const successRate = (passedTests / totalTests) * 100;
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warnings,
            successRate: successRate,
            success: successRate >= 80 && failedTests === 0,
            duration: Date.now() - this.startTime,
            errors: this.errors,
            recommendation: successRate >= 80 ? 'READY' : successRate >= 60 ? 'PARTIAL' : 'FAILED'
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.runFinalIntegrationTest = async () => {
        const tester = new FinalIntegrationTester();
        return await tester.runCompleteWorkflowTest();
    };
    
    // Auto-run after delay
    setTimeout(async () => {
        console.log('🔧 Auto-running final integration test...');
        await window.runFinalIntegrationTest();
    }, 3000);
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinalIntegrationTester;
}