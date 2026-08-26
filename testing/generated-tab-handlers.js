
    // ========================================
    // DASHBOARD TAB HANDLERS
    // ========================================

    setupDashboardTabs() {
        console.log('🔧 Setting up Dashboard tabs...');
        const tabs = document.querySelectorAll('.dashboard-tab');
        const contents = document.querySelectorAll('.dashboard-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Dashboard tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'dashboard-overview-content') {
                    console.log('📡 Loading loadActionsRequired...');
                    await this.loadActionsRequired();
                    this.initializeCharts();
                }
                else if (targetContent === 'dashboard-farm-layout-content') {
                    console.log('📡 Loading loadSVG...');
                    await this.loadSVG();
                }
                else if (targetContent === 'dashboard-actions-content') {
                    console.log('📡 Loading loadActionsRequired...');
                    await this.loadActionsRequired();
                }
            });
        });
    }

    // ========================================
    // PLANT MANAGEMENT TAB HANDLERS
    // ========================================

    setupPlantTabs() {
        console.log('🔧 Setting up Plant Management tabs...');
        const tabs = document.querySelectorAll('.plant-action-tab');
        const contents = document.querySelectorAll('.plant-action-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Plant Management tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'plant-actions-content') {
                    console.log('📡 Loading initializePlantActionForms...');
                    await this.initializePlantActionForms();
                }
                else if (targetContent === 'beds-overview-content') {
                    console.log('📡 Loading loadBedsOverview...');
                    await this.loadBedsOverview();
                }
                else if (targetContent === 'plants-management-content') {
                    console.log('📡 Loading loadPlantsManagement...');
                    await this.loadPlantsManagement();
                }
                else if (targetContent === 'planting-form-content') {
                    console.log('📡 Loading initializePlantActionForms...');
                    await this.initializePlantActionForms();
                }
                else if (targetContent === 'harvesting-form-content') {
                    console.log('📡 Loading initializePlantActionForms...');
                    await this.initializePlantActionForms();
                }
            });
        });
    }

    // ========================================
    // SENSOR CONFIGURATION TAB HANDLERS
    // ========================================

    setupSensorTabs() {
        console.log('🔧 Setting up Sensor Configuration tabs...');
        const tabs = document.querySelectorAll('.sensor-tab');
        const contents = document.querySelectorAll('.sensor-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Sensor Configuration tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'add-sensor-content') {
                    console.log('📡 Loading loadSensorConfiguration...');
                    await this.loadSensorConfiguration();
                }
                else if (targetContent === 'existing-sensors-content') {
                    console.log('📡 Loading loadSensorsList...');
                    await this.loadSensorsList();
                }
            });
        });
    }

    // ========================================
    // DATA EDITING TAB HANDLERS
    // ========================================

    setupDataEditTabs() {
        console.log('🔧 Setting up Data Editing tabs...');
        const tabs = document.querySelectorAll('.edit-tab');
        const contents = document.querySelectorAll('.edit-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Data Editing tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'edit-water-quality-content') {
                    console.log('📡 Loading loadDataEditInterface...');
                    await this.loadDataEditInterface();
                }
                else if (targetContent === 'edit-fish-health-content') {
                    console.log('📡 Loading loadDataEditInterface...');
                    await this.loadDataEditInterface();
                }
                else if (targetContent === 'edit-operations-content') {
                    console.log('📡 Loading loadDataEditInterface...');
                    await this.loadDataEditInterface();
                }
            });
        });
    }

    // ========================================
    // NUTRIENT MANAGEMENT TAB HANDLERS
    // ========================================

    setupNutrientManagementTabs() {
        console.log('🔧 Setting up Nutrient Management tabs...');
        const tabs = document.querySelectorAll('.nutrient-mgmt-tab');
        const contents = document.querySelectorAll('.nutrient-mgmt-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Nutrient Management tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'ratio-rules-content') {
                    console.log('📡 Loading loadRatioRules...');
                    await this.loadRatioRules();
                }
                else if (targetContent === 'environmental-adjustments-content') {
                    console.log('📡 Loading loadEnvironmentalAdjustments...');
                    await this.loadEnvironmentalAdjustments();
                }
            });
        });
    }

    // ========================================
    // CALCULATOR TAB HANDLERS
    // ========================================

    setupCalculatorTabs() {
        console.log('🔧 Setting up Calculator tabs...');
        const tabs = document.querySelectorAll('.calc-tab');
        const contents = document.querySelectorAll('.calculator-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                const targetContent = tab.getAttribute('data-target') || tab.id.replace('-tab', '-content');
                console.log('📞 Calculator tab clicked:', targetContent);

                // Remove active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active states
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                }

                // Load data for specific tabs
                if (targetContent === 'quick-calc-content') {
                    console.log('📡 Loading initializeNutrientCalculator...');
                    await this.initializeNutrientCalculator();
                }
                else if (targetContent === 'mixing-schedule-content') {
                    console.log('📡 Loading loadDosingSchedulePDF...');
                    await this.loadDosingSchedulePDF();
                }
                else if (targetContent === 'custom-nutrients-content') {
                    console.log('📡 Loading loadAvailableNutrients...');
                    await this.loadAvailableNutrients();
                }
            });
        });
    }

    // ========================================
    // ENHANCED TAB INITIALIZATION SEQUENCE
    // ========================================

    async initializeAllTabHandlers() {
        console.log("🚀 Initializing all tab handlers...");
        try {
            this.setupDashboardTabs(); // Dashboard
            this.setupPlantTabs(); // Plant Management
            this.setupSensorTabs(); // Sensor Configuration
            this.setupDataEditTabs(); // Data Editing
            this.setupNutrientManagementTabs(); // Nutrient Management
            this.setupCalculatorTabs(); // Calculator
            console.log("✅ All tab handlers initialized successfully");
        } catch (error) {
            console.error("❌ Error initializing tab handlers:", error);
        }
    }
