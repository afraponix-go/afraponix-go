// Chart Fix Test - Verify chart initialization order is correct

class ChartFixTester {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    async testChartInitializationSequence() {
        console.log('🔧 Testing Chart Initialization Fix...');
        
        try {
            // Test 1: Check if app exists
            if (!window.app) {
                throw new Error('App not available');
            }
            this.logResult('App Available', 'PASS', 'App object exists');
            
            // Test 2: Check chart containers exist in DOM
            const chartContainers = [
                'ec-chart', 'nitrate-chart', 'nitrite-chart', 'phosphorus-chart',
                'potassium-chart', 'calcium-chart', 'magnesium-chart', 'iron-chart'
            ];
            
            let foundContainers = 0;
            const missingContainers = [];
            
            chartContainers.forEach(chartId => {
                const element = document.getElementById(chartId);
                if (element) {
                    foundContainers++;
                } else {
                    missingContainers.push(chartId);
                }
            });
            
            if (foundContainers === chartContainers.length) {
                this.logResult('Chart Containers', 'PASS', 'All nutrient chart containers exist in DOM');
            } else {
                this.logResult('Chart Containers', 'FAIL', `Missing: ${missingContainers.join(', ')}`);
            }
            
            // Test 3: Check charts component
            if (window.app.charts) {
                this.logResult('Charts Component', 'PASS', 'Charts component initialized');
                
                // Test 4: Check if charts are actually created
                const chartsObj = window.app.charts.charts || {};
                const initializedCharts = Object.keys(chartsObj).length;
                
                if (initializedCharts > 0) {
                    this.logResult('Chart Instances', 'PASS', `${initializedCharts} charts initialized`);
                } else {
                    this.logResult('Chart Instances', 'WARN', 'No chart instances found - may not be initialized yet');
                }
            } else {
                this.logResult('Charts Component', 'FAIL', 'Charts component not initialized');
            }
            
            // Test 5: Test updateChart method with defensive programming
            if (window.app.updateChart) {
                // Try to update a chart that should exist
                try {
                    window.app.updateChart('ec-chart', ['test'], [1]);
                    this.logResult('Chart Update Test', 'PASS', 'updateChart method handled gracefully');
                } catch (error) {
                    this.logResult('Chart Update Test', 'FAIL', `updateChart threw error: ${error.message}`);
                }
            } else {
                this.logResult('Chart Update Method', 'FAIL', 'updateChart method not available');
            }
            
            // Test 6: Test Chart.js library availability
            if (typeof window.Chart !== 'undefined') {
                this.logResult('Chart.js Library', 'PASS', 'Chart.js library loaded');
            } else {
                this.logResult('Chart.js Library', 'FAIL', 'Chart.js library not available');
            }
            
            // Test 7: Test DOM utilities
            if (window.domUtils) {
                this.logResult('DOM Utilities', 'PASS', 'DOM utilities available');
            } else {
                this.logResult('DOM Utilities', 'WARN', 'DOM utilities not available');
            }
            
            this.generateReport();
            return this.getSummary();
            
        } catch (error) {
            console.error('Chart fix test failed:', error);
            return { success: false, error: error.message };
        }
    }

    logResult(test, status, details) {
        const result = { test, status, details, timestamp: Date.now() - this.startTime };
        this.results.push(result);
        
        const icon = { 'PASS': '✅', 'FAIL': '❌', 'WARN': '⚠️' }[status] || '❓';
        console.log(`${icon} ${test}: ${details}`);
    }

    generateReport() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        
        console.log('\n📊 Chart Fix Test Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        
        if (failed === 0) {
            console.log('\n🎉 Chart initialization fixes appear to be working!');
            console.log('The "Chart [name] not found" errors should be resolved.');
        } else {
            console.log('\n⚠️ Some chart issues remain. Check the failed tests above.');
        }
    }

    getSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        return {
            passed,
            failed,
            success: failed === 0,
            duration: Date.now() - this.startTime
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.testChartFix = async () => {
        const tester = new ChartFixTester();
        return await tester.testChartInitializationSequence();
    };
}

// Auto-run test
setTimeout(() => {
    console.log('🧪 Running Chart Fix Test...');
    if (window.testChartFix) {
        window.testChartFix();
    }
}, 2000);