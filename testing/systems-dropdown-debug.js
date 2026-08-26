// Systems Dropdown Debug Tool
// Tests what systems are actually being returned by the API

class SystemsDropdownDebugger {
    constructor() {
        this.results = [];
    }

    async debugSystemsDropdown() {
        console.log('🔍 Debugging Systems Dropdown Issues...');
        
        try {
            // Test 1: Check if app and user exist
            if (!window.app) {
                throw new Error('App not available');
            }
            
            console.log('✅ App available');
            console.log('👤 Current user:', window.app.user);
            console.log('🎫 Auth token:', window.app.token ? 'Present' : 'Missing');
            
            // Test 2: Check dropdown element
            const dropdown = document.getElementById('active-system');
            if (!dropdown) {
                console.error('❌ System dropdown element not found');
                return;
            }
            
            console.log('✅ System dropdown element found');
            console.log('👁️ Dropdown visibility:', window.getComputedStyle(dropdown.parentElement).display);
            
            // Test 3: Check current options in dropdown
            console.log('📋 Current dropdown options:');
            Array.from(dropdown.options).forEach((option, index) => {
                console.log(`  ${index}: "${option.textContent}" (value: "${option.value}")`);
            });
            
            // Test 4: Test direct API call
            console.log('🌐 Testing direct API call...');
            
            try {
                const response = await fetch('/api/systems', {
                    headers: {
                        'Authorization': `Bearer ${window.app.token || localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📡 API Response status:', response.status);
                
                if (response.ok) {
                    const systems = await response.json();
                    console.log('✅ API returned', systems.length, 'systems:');
                    
                    systems.forEach(system => {
                        console.log(`  - ${system.system_name} (${system.id}) - User: ${system.user_id}`);
                    });
                    
                    // Test if this matches what we expect
                    if (window.app.user) {
                        const expectedSystems = systems.filter(s => s.user_id === window.app.user.id);
                        console.log(`🎯 For user ${window.app.user.username} (ID: ${window.app.user.id}), expected ${expectedSystems.length} systems`);
                        
                        if (systems.length !== expectedSystems.length) {
                            console.error('❌ API returned ALL systems instead of user-specific systems!');
                            console.error('This indicates an authentication problem.');
                        } else {
                            console.log('✅ API correctly filtered systems for current user');
                        }
                    }
                    
                } else {
                    const error = await response.text();
                    console.error('❌ API call failed:', response.status, error);
                }
                
            } catch (apiError) {
                console.error('❌ API call exception:', apiError);
            }
            
            // Test 5: Check SystemsList component
            if (window.app.systemsList) {
                console.log('🔧 SystemsList component available');
                console.log('📊 SystemsList systems count:', Object.keys(window.app.systemsList.systems || {}).length);
                console.log('🗂️ SystemsList systems:', window.app.systemsList.systems);
            } else {
                console.warn('⚠️ SystemsList component not available');
            }
            
            // Test 6: Test system switching
            console.log('🔄 Testing system switching mechanism...');
            
            if (window.app.switchToSystem) {
                console.log('✅ switchToSystem method available');
            } else {
                console.error('❌ switchToSystem method missing');
            }
            
            // Test 7: Check SystemManager
            if (window.app.systemManager) {
                console.log('⚙️ SystemManager available');
                console.log('📊 SystemManager systems count:', Object.keys(window.app.systemManager.systems || {}).length);
                console.log('🎯 Current active system:', window.app.activeSystemId);
            } else {
                console.error('❌ SystemManager not available');
            }
            
            this.generateSummary();
            
        } catch (error) {
            console.error('🚨 Debug failed:', error);
        }
    }
    
    generateSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SYSTEMS DROPDOWN DEBUG SUMMARY');
        console.log('='.repeat(60));
        
        const issues = [];
        const fixes = [];
        
        // Check for common issues
        if (!window.app?.token && !localStorage.getItem('auth_token')) {
            issues.push('No authentication token found');
            fixes.push('Ensure user is properly logged in');
        }
        
        if (!document.getElementById('active-system')) {
            issues.push('System dropdown element missing from DOM');
            fixes.push('Verify HTML contains <select id="active-system">');
        }
        
        const systemSelector = document.getElementById('system-selector');
        if (systemSelector && window.getComputedStyle(systemSelector).display === 'none') {
            issues.push('System selector is hidden');
            fixes.push('Ensure showAppUI() is called after login');
        }
        
        if (issues.length === 0) {
            console.log('✅ No obvious issues detected');
            console.log('💡 If problems persist, check:');
            console.log('  - Network tab for API call details');
            console.log('  - Server logs for authentication errors');
            console.log('  - Database user_id matching token payload');
        } else {
            console.log('🚨 Issues found:');
            issues.forEach(issue => console.log(`  ❌ ${issue}`));
            console.log('\n💡 Suggested fixes:');
            fixes.forEach(fix => console.log(`  🔧 ${fix}`));
        }
        
        console.log('='.repeat(60));
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.debugSystemsDropdown = async () => {
        const debugger = new SystemsDropdownDebugger();
        await debugger.debugSystemsDropdown();
    };
}

// Auto-run
setTimeout(() => {
    console.log('🕐 Auto-running systems dropdown debug in 3 seconds...');
    setTimeout(() => {
        if (window.debugSystemsDropdown) {
            window.debugSystemsDropdown();
        }
    }, 3000);
}, 1000);