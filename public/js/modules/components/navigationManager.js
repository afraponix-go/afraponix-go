// Navigation Manager Component
// Handles navigation, tab switching, and view management across the application

/**
 * Navigation Manager Component Class
 * Manages all navigation, tabs, and view switching functionality
 */
export class NavigationManagerComponent {
    constructor(app) {
        this.app = app;
        this.currentView = null;
        this.currentDataTab = null;
        this.currentPlantTab = null;
        this.currentDashboardTab = null;
        this.currentCalculatorTab = null;
        
        console.log('🧭 Navigation Manager Component initialized');
    }

    /**
     * Initialize all navigation and tab systems
     * Complexity: 12, Lines: 15
     */
    initializeNavigation() {
        this.setupNavigation();
        this.setupDashboardTabs();
        this.setupCalculatorTabs();
        this.setupDosingTabs();
        this.setupDataEntryTabs();
        this.setupPlantTabs();
        this.setupFishManagementTabs();
        this.setupSettingsTabs();
        this.setupSystemConfigTabs();
        this.setupGrowBedsSubtabs();
        this.setupSprayTabs();
        this.setupDataEditTabs();
        this.setupSensorConfigTabs();
        this.setupAdminSubtabs();
        this.setupRatioManagementTabs();
        
        console.log('🧭 All navigation systems initialized');
    }

    /**
     * Setup main navigation between views
     * Complexity: 15, Lines: 30+
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-target') || btn.getAttribute('data-view');
                
                // Remove active class from all nav buttons and views
                navButtons.forEach(navBtn => navBtn.classList.remove('active'));
                views.forEach(view => view.classList.remove('active'));
                
                // Add active class to clicked nav button and target view
                btn.classList.add('active');
                const targetElement = document.getElementById(targetView);
                if (targetElement) {
                    targetElement.classList.add('active');
                    this.currentView = targetView;
                }
                
                // Handle special view logic
                if (targetView === 'settings') {
                    // Show admin settings tab if user is admin
                    const adminSettingsTab = document.getElementById('admin-settings-tab');
                    if (adminSettingsTab) {
                        adminSettingsTab.style.display = this.app.currentUser && this.app.currentUser.isAdmin ? 'block' : 'none';
                    }
                } else if (targetView === 'fish-tank') {
                    // Load fish overview tab by default when fish tank view is accessed
                    setTimeout(async () => {
                        // Use the main loadFishOverview implementation directly
                        if (this.app && this.app.loadFishOverview) {
                            await this.app.loadFishOverview();
                        }
                    }, 100);
                } else if (targetView === 'dashboard') {
                    // Activate dashboard overview tab by default when dashboard view is accessed
                    setTimeout(() => {
                        console.log('🏠 Dashboard view accessed, activating overview tab');
                        const overviewTab = document.getElementById('dashboard-overview-tab');
                        if (overviewTab && !overviewTab.classList.contains('active')) {
                            console.log('📊 Clicking dashboard overview tab to trigger activation');
                            overviewTab.click();
                        } else if (overviewTab && overviewTab.classList.contains('active')) {
                            // If already active, still trigger the activation handler to set up mobile dropdown
                            console.log('📊 Overview tab already active, manually triggering activation');
                            if (this.app && this.app.dashboardUI && this.app.dashboardUI.handleOverviewTabActivation) {
                                this.app.dashboardUI.handleOverviewTabActivation();
                            }
                        }
                    }, 100);
                }
            });
        });
    }

    /**
     * Setup calculator tabs
     * Complexity: 12, Lines: 20
     */
    setupCalculatorTabs() {
        const calcTabs = document.querySelectorAll('.calc-tab');
        const calcContents = document.querySelectorAll('.calculator-content');

        calcTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all calc tabs and contents
                calcTabs.forEach(calcTab => calcTab.classList.remove('active'));
                calcContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    this.currentCalculatorTab = targetContent;
                    
                    // Initialize specific calculators
                    if (targetContent === 'nutrient-calc') {
                        if (this.app.nutrientCalculator) {
                            this.app.nutrientCalculator.initialize();
                        }
                    } else if (targetContent === 'fish-calc') {
                        if (this.app.fishTankManager) {
                            this.app.fishTankManager.initializeFishCalculator();
                        }
                    }
                }
            });
        });
    }

    /**
     * Setup dosing tabs (nutrient calculator sub-tabs)
     * Complexity: 10, Lines: 15
     */
    setupDosingTabs() {
        const dosingTabs = document.querySelectorAll('.dosing-tab');
        const dosingContents = document.querySelectorAll('.dosing-content');

        dosingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all dosing tabs and contents
                dosingTabs.forEach(dosingTab => dosingTab.classList.remove('active'));
                dosingContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    
                    // Initialize specific dosing calculators
                    if (targetContent === 'quick-calc-content') {
                        // Quick calculator is already loaded
                        console.log('🧮 Quick calculator tab activated');
                    } else if (targetContent === 'mixing-schedule-content') {
                        // Load mixing schedule interface
                        console.log('📅 Mixing schedule tab activated');
                    } else if (targetContent === 'custom-nutrients-content') {
                        // Load custom nutrients interface
                        console.log('⚗️ Custom nutrients tab activated');
                    }
                }
            });
        });
    }

    /**
     * Setup data entry tabs
     * Complexity: 10, Lines: 15
     */
    setupDataEntryTabs() {
        const dataTabs = document.querySelectorAll('.data-tab');
        const dataForms = document.querySelectorAll('.data-form');

        dataTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetForm = tab.getAttribute('data-target');
                
                // Remove active class from all data tabs and forms
                dataTabs.forEach(dataTab => dataTab.classList.remove('active'));
                dataForms.forEach(form => form.classList.remove('active'));
                
                // Add active class to clicked tab and target form
                tab.classList.add('active');
                const targetElement = document.getElementById(targetForm);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
                this.currentDataTab = targetForm;
            });
        });
    }

    /**
     * Setup plant tabs (delegates to plant management tab setup)
     * Complexity: 8, Lines: 12
     */
    setupPlantTabs() {
        // Setup the main plant management tabs immediately
        this.setupPlantManagementTabs();
        
        // Initialize the plant action tabs and forms on page load
        setTimeout(() => {
            this.setupPlantActionTabs();
            if (this.app.initializePlantActionForms) {
                this.app.initializePlantActionForms();
            }
        }, 500);
    }

    /**
     * Setup dashboard tabs
     * Complexity: 15, Lines: 25
     */
    setupDashboardTabs() {
        const dashboardTabs = document.querySelectorAll('.dashboard-tab');
        const dashboardContents = document.querySelectorAll('.dashboard-content');

        dashboardTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all dashboard tabs and contents
                dashboardTabs.forEach(dashTab => dashTab.classList.remove('active'));
                dashboardContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    this.currentDashboardTab = targetContent;
                }
                
                // Handle specific dashboard content loading
                if (targetContent === 'dashboard-farm-layout-content') {
                    if (this.app.farmLayoutRenderer && this.app.farmLayoutRenderer.renderFarmLayout) {
                        this.app.farmLayoutRenderer.renderFarmLayout();
                    }
                }
            });
        });
    }

    /**
     * Setup plant management tabs
     * Complexity: 20, Lines: 50+
     */
    setupPlantManagementTabs() {
        const mgmtTabs = document.querySelectorAll('.plant-mgmt-tab');
        const mgmtContents = document.querySelectorAll('.plant-mgmt-content');

        mgmtTabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all plant management tabs and contents
                mgmtTabs.forEach(mgmtTab => mgmtTab.classList.remove('active'));
                mgmtContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    this.currentPlantTab = targetContent;
                }
                
                // Load data for specific tabs
                if (targetContent === 'plant-overview-content') {
                    if (this.app.updatePlantOverview) {
                        await this.app.updatePlantOverview();
                    }
                } else if (targetContent === 'plant-actions-content') {
                    // Plant actions content loads automatically via setupPlantActionTabs
                } else if (targetContent === 'plant-batch-content') {
                    // Load batch management interface
                    if (this.app.loadBatchManagement) {
                        await this.app.loadBatchManagement();
                    }
                }
                
                // Special handling for showing farm layout if this tab was accessed
                const targetEl = document.getElementById(targetContent);
                if (targetEl && targetEl.querySelector('.farm-layout-container')) {
                    setTimeout(() => {
                        if (this.app.farmLayoutRenderer && this.app.farmLayoutRenderer.renderFarmLayout) {
                            this.app.farmLayoutRenderer.renderFarmLayout();
                        }
                    }, 100);
                }
            });
        });
    }

    /**
     * Setup plant action tabs (planting, harvest, etc.)
     * Complexity: 12, Lines: 20
     */
    setupPlantActionTabs() {
        const actionTabs = document.querySelectorAll('.plant-action-tab');
        const actionContents = document.querySelectorAll('.plant-action-content');

        actionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all action tabs and contents
                actionTabs.forEach(actionTab => actionTab.classList.remove('active'));
                actionContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup fish management tabs
     * Complexity: 15, Lines: 30+
     */
    setupFishManagementTabs() {
        const fishTabs = document.querySelectorAll('.fish-mgmt-tab');
        const fishContents = document.querySelectorAll('.fish-mgmt-content');

        fishTabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all fish management tabs and contents
                fishTabs.forEach(fishTab => fishTab.classList.remove('active'));
                fishContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
                
                // Load data for specific tabs
                if (targetContent === 'fish-overview-content') {
                    // Use the main loadFishOverview implementation directly
                    if (this.app && this.app.loadFishOverview) {
                        await this.app.loadFishOverview();
                    }
                } else if (targetContent === 'tank-details-content') {
                    if (this.app && this.app.loadTankDetails) {
                        await this.app.loadTankDetails();
                    }
                } else if (targetContent === 'fish-health-entry-content') {
                    if (this.app.fishTankManager) {
                        this.app.fishTankManager.loadFishHealthEntry();
                    }
                } else if (targetContent === 'fish-health-monitoring-content') {
                    if (this.app.loadFishHealthMonitoring) {
                        this.app.loadFishHealthMonitoring();
                    }
                } else if (targetContent === 'tank-information-content') {
                    if (this.app.loadTankInformation) {
                        this.app.loadTankInformation();
                    }
                }
            });
        });
    }

    /**
     * Setup settings tabs
     * Complexity: 12, Lines: 20
     */
    setupSettingsTabs() {
        const settingsTabs = document.querySelectorAll('.settings-tab');
        const settingsContents = document.querySelectorAll('.settings-content');

        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all settings tabs and contents
                settingsTabs.forEach(settingsTab => settingsTab.classList.remove('active'));
                settingsContents.forEach(content => content.classList.remove('active'));
                
                // Hide admin sub-tabs and sub-contents first (system-config-tabs will be handled by CSS)
                const adminSubtabs = document.querySelectorAll('.admin-subtab');
                const adminSubcontents = document.querySelectorAll('.admin-subcontent');
                adminSubtabs.forEach(subtab => subtab.style.setProperty('display', 'none', 'important'));
                adminSubcontents.forEach(subcontent => {
                    subcontent.classList.remove('active');
                    subcontent.style.setProperty('display', 'none', 'important');
                });
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    
                    // Handle specific settings content loading and show appropriate sub-tabs
                    if (targetContent === 'system-config-content') {
                        // System config tabs will be shown automatically by CSS when #system-config-content.active
                        // Activate first system config sub-tab by default
                        const firstSystemConfigSubtab = document.querySelector('#overall-system-tab');
                        const firstSystemConfigSubcontent = document.querySelector('#overall-system-content');
                        if (firstSystemConfigSubtab && firstSystemConfigSubcontent) {
                            // Clear any previous active states for sub-tabs and sub-contents
                            document.querySelectorAll('.system-config-tab').forEach(tab => tab.classList.remove('active'));
                            document.querySelectorAll('#overall-system-content, #fish-tanks-config-content, #grow-beds-config-content').forEach(content => content.classList.remove('active'));
                            // Set first tab as active
                            firstSystemConfigSubtab.classList.add('active');
                            firstSystemConfigSubcontent.classList.add('active');
                        }
                    } else if (targetContent === 'admin-settings-content') {
                        // Show admin sub-tabs but keep subcontent hidden initially
                        adminSubtabs.forEach(subtab => subtab.style.setProperty('display', 'block', 'important'));
                        // Make sure all subcontent is available for showing (remove the blanket hide)
                        adminSubcontents.forEach(subcontent => subcontent.style.removeProperty('display'));
                        // Activate first admin subtab by default
                        const firstAdminSubtab = document.querySelector('.admin-subtab');
                        const firstAdminSubcontent = document.querySelector('.admin-subcontent');
                        if (firstAdminSubtab && firstAdminSubcontent) {
                            // Clear any previous active states
                            document.querySelectorAll('.admin-subtab').forEach(tab => tab.classList.remove('active'));
                            document.querySelectorAll('.admin-subcontent').forEach(content => content.classList.remove('active'));
                            // Set first tab as active and only show its content
                            firstAdminSubtab.classList.add('active');
                            firstAdminSubcontent.classList.add('active');
                            firstAdminSubcontent.style.setProperty('display', 'block', 'important');
                        }
                    }
                }
            });
        });
    }

    /**
     * Setup system config sub-tabs (settings sub-section)
     * Complexity: 10, Lines: 15
     */
    setupSystemConfigTabs() {
        const systemConfigTabs = document.querySelectorAll('.system-config-tab');
        const systemConfigContents = document.querySelectorAll('.system-config-content');

        systemConfigTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Only proceed if system config tabs are visible (i.e., system-config-content is active)
                const systemConfigContent = document.getElementById('system-config-content');
                if (!systemConfigContent || !systemConfigContent.classList.contains('active')) {
                    return;
                }
                
                // Remove active class from all system config tabs and contents
                systemConfigTabs.forEach(configTab => configTab.classList.remove('active'));
                systemConfigContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    
                    // Handle specific system config content loading
                    if (targetContent === 'overall-system-content') {
                        console.log('⚙️ Overall system configuration tab activated');
                        // Load overall system configuration
                    } else if (targetContent === 'fish-tanks-config-content') {
                        console.log('🐟 Fish tanks configuration tab activated');
                        // Load fish tanks configuration
                        if (this.app.loadFishTankConfiguration) {
                            this.app.loadFishTankConfiguration();
                        }
                    } else if (targetContent === 'grow-beds-config-content') {
                        // Generate grow beds configuration forms
                        if (this.app.generateGrowBedConfiguration) {
                            this.app.generateGrowBedConfiguration();
                        }
                        // Load existing grow bed data after forms are generated
                        if (this.app.loadGrowBedConfiguration) {
                            setTimeout(async () => {
                                await this.app.loadGrowBedConfiguration();
                            }, 1000);
                        }
                    }
                }
            });
        });
    }

    /**
     * Switch to specific view programmatically
     * Complexity: 8, Lines: 15
     */
    switchToView(viewId) {
        const navButton = document.querySelector(`[data-target="${viewId}"]`);
        if (navButton) {
            navButton.click();
        }
    }

    /**
     * Switch to specific tab within a view
     * Complexity: 10, Lines: 20
     */
    switchToTab(tabId, tabType = 'dashboard') {
        let selector;
        
        switch (tabType) {
            case 'dashboard':
                selector = `.dashboard-tab[data-target="${tabId}"]`;
                break;
            case 'plant':
                selector = `.plant-mgmt-tab[data-target="${tabId}"]`;
                break;
            case 'fish':
                selector = `.fish-mgmt-tab[data-target="${tabId}"]`;
                break;
            case 'calculator':
                selector = `.calc-tab[data-target="${tabId}"]`;
                break;
            case 'data-entry':
                selector = `.data-tab[data-target="${tabId}"]`;
                break;
            case 'settings':
                selector = `.settings-tab[data-target="${tabId}"]`;
                break;
            default:
                selector = `[data-target="${tabId}"]`;
        }
        
        const tab = document.querySelector(selector);
        if (tab) {
            tab.click();
        }
    }

    /**
     * Get current navigation state
     * Complexity: 5, Lines: 10
     */
    getCurrentState() {
        return {
            currentView: this.currentView,
            currentDataTab: this.currentDataTab,
            currentPlantTab: this.currentPlantTab,
            currentDashboardTab: this.currentDashboardTab,
            currentCalculatorTab: this.currentCalculatorTab
        };
    }

    /**
     * Show/hide navigation elements based on user permissions
     * Complexity: 10, Lines: 15
     */
    updateNavigationForUser(user) {
        // Show/hide admin-only navigation elements
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(element => {
            element.style.display = (user && user.isAdmin) ? 'block' : 'none';
        });

        // Show/hide navigation based on user permissions
        const userElements = document.querySelectorAll('[data-require-auth]');
        userElements.forEach(element => {
            element.style.display = user ? 'block' : 'none';
        });
    }

    /**
     * Set active navigation state (for page refresh/deep linking)
     * Complexity: 12, Lines: 20
     */
    setActiveState(viewId, tabId = null, tabType = null) {
        // Set active view
        if (viewId) {
            this.switchToView(viewId);
        }
        
        // Set active tab if specified
        if (tabId && tabType) {
            setTimeout(() => {
                this.switchToTab(tabId, tabType);
            }, 100);
        }
    }

    /**
     * Handle smooth scrolling for in-page navigation
     * Complexity: 8, Lines: 15
     */
    setupSmoothScrolling() {
        const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
        
        smoothScrollLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Setup navigation keyboard shortcuts
     * Complexity: 15, Lines: 25
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl/Cmd + number keys for quick navigation
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchToView('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchToView('plant-management');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchToView('fish-tank');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchToView('calculators');
                        break;
                    case '5':
                        e.preventDefault();
                        this.switchToView('data-entry');
                        break;
                    case '9':
                        e.preventDefault();
                        this.switchToView('settings');
                        break;
                }
            }
        });
    }

    /**
     * Setup grow beds subtabs (beds overview / plants management)
     */
    setupGrowBedsSubtabs() {
        const growBedsSubtabs = document.querySelectorAll('.grow-beds-subtab');
        const growBedsSubcontents = document.querySelectorAll('.grow-beds-subcontent');
        
        growBedsSubtabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all subtabs and contents
                growBedsSubtabs.forEach(subtab => subtab.classList.remove('active'));
                growBedsSubcontents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup spray programmes tabs (insecticides / fungicides / foliar feeds)
     */
    setupSprayTabs() {
        const sprayTabs = document.querySelectorAll('.spray-tab');
        const sprayContents = document.querySelectorAll('.spray-content');
        
        sprayTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all spray tabs and contents
                sprayTabs.forEach(sprayTab => sprayTab.classList.remove('active'));
                sprayContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup data edit tabs (water quality / fish health / operations)
     */
    setupDataEditTabs() {
        const editTabs = document.querySelectorAll('.edit-tab');
        
        editTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                const category = tab.getAttribute('data-category');
                
                // Remove active class from all edit tabs
                editTabs.forEach(editTab => editTab.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Load data for the selected category
                if (this.app.loadDataEditCategory) {
                    this.app.loadDataEditCategory(category);
                }
            });
        });
    }

    /**
     * Setup sensor config tabs (add new / existing sensors)
     */
    setupSensorConfigTabs() {
        const sensorTabs = document.querySelectorAll('.sensor-tab');
        const sensorTabContents = document.querySelectorAll('.sensor-tab-content');
        
        sensorTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all sensor tabs and contents
                sensorTabs.forEach(sensorTab => sensorTab.classList.remove('active'));
                sensorTabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup admin subtabs (users / smtp / data / crops / ratios / deficiency / stats)
     */
    setupAdminSubtabs() {
        const adminSubtabs = document.querySelectorAll('.admin-subtab');
        const adminSubcontents = document.querySelectorAll('.admin-subcontent');
        
        adminSubtabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Only proceed if admin settings are active
                const adminSettingsContent = document.getElementById('admin-settings-content');
                if (!adminSettingsContent || !adminSettingsContent.classList.contains('active')) {
                    return;
                }
                
                // Remove active class from all admin subtabs and contents
                adminSubtabs.forEach(subtab => subtab.classList.remove('active'));
                adminSubcontents.forEach(content => {
                    content.classList.remove('active');
                    content.style.setProperty('display', 'none', 'important');
                });
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    targetElement.style.setProperty('display', 'block', 'important');
                }
            });
        });
    }

    /**
     * Setup ratio management tabs (ratio rules / environmental adjustments)
     */
    setupRatioManagementTabs() {
        const ratioTabs = document.querySelectorAll('.ratio-tab');
        const ratioContents = document.querySelectorAll('.ratio-content');
        
        ratioTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                // Remove active class from all ratio tabs and contents
                ratioTabs.forEach(ratioTab => ratioTab.classList.remove('active'));
                ratioContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and target content
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            currentView: this.currentView,
            currentDataTab: this.currentDataTab,
            currentPlantTab: this.currentPlantTab,
            currentDashboardTab: this.currentDashboardTab,
            currentCalculatorTab: this.currentCalculatorTab,
            hasNavigation: !!document.querySelector('.nav-btn')
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Navigation Manager component');
        this.currentView = null;
        this.currentDataTab = null;
        this.currentPlantTab = null;
        this.currentDashboardTab = null;
        this.currentCalculatorTab = null;
    }
}

// Export both class and create a factory function
export default NavigationManagerComponent;

/**
 * Factory function to create navigation manager component
 */
export function createNavigationManagerComponent(app) {
    return new NavigationManagerComponent(app);
}