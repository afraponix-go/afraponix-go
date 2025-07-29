class AquaponicsApp {
    constructor() {
        this.currentView = 'dashboard';
        this.currentCalcTab = 'fish-calc';
        this.currentDataTab = 'water-quality-form';
        this.lastFeedTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
        this.systems = {};
        this.activeSystemId = null;
        this.dataRecords = { waterQuality: [], fishHealth: [], plantGrowth: [], operations: [] };
        this.user = null;
        this.token = localStorage.getItem('auth_token');
        this.charts = {};
        this.API_BASE = 'http://127.0.0.1:3000/api';
        this.fishData = {
            tilapia: {
                name: 'Tilapia',
                icon: '🐟',
                defaultDensity: 25,
                defaultFingerlingWeight: 50,
                harvestWeight: 500,
                growthPeriod: 24,
                feedConversionRatio: 1.8,
                temperature: '24-30°C',
                growthData: [
                    { week: 0, weight: 50, feedRate: 8, feedAmount: 4 },
                    { week: 4, weight: 100, feedRate: 6, feedAmount: 6 },
                    { week: 8, weight: 180, feedRate: 5, feedAmount: 9 },
                    { week: 12, weight: 280, feedRate: 4, feedAmount: 11 },
                    { week: 16, weight: 380, feedRate: 3, feedAmount: 11 },
                    { week: 20, weight: 450, feedRate: 2.5, feedAmount: 11 },
                    { week: 24, weight: 500, feedRate: 2, feedAmount: 10 }
                ]
            },
            trout: {
                name: 'Trout',
                icon: '🎣',
                defaultDensity: 20,
                defaultFingerlingWeight: 30,
                harvestWeight: 300,
                growthPeriod: 20,
                feedConversionRatio: 1.2,
                temperature: '10-16°C',
                growthData: [
                    { week: 0, weight: 30, feedRate: 6, feedAmount: 2 },
                    { week: 4, weight: 80, feedRate: 5, feedAmount: 4 },
                    { week: 8, weight: 140, feedRate: 4, feedAmount: 6 },
                    { week: 12, weight: 200, feedRate: 3, feedAmount: 6 },
                    { week: 16, weight: 250, feedRate: 2.5, feedAmount: 6 },
                    { week: 20, weight: 300, feedRate: 2, feedAmount: 6 }
                ]
            },
            catfish: {
                name: 'Catfish',
                icon: '🐡',
                defaultDensity: 40,
                defaultFingerlingWeight: 40,
                harvestWeight: 800,
                growthPeriod: 28,
                feedConversionRatio: 2.0,
                temperature: '20-28°C',
                growthData: [
                    { week: 0, weight: 40, feedRate: 10, feedAmount: 4 },
                    { week: 4, weight: 120, feedRate: 8, feedAmount: 10 },
                    { week: 8, weight: 250, feedRate: 6, feedAmount: 15 },
                    { week: 12, weight: 400, feedRate: 5, feedAmount: 20 },
                    { week: 16, weight: 550, feedRate: 4, feedAmount: 22 },
                    { week: 20, weight: 650, feedRate: 3.5, feedAmount: 23 },
                    { week: 24, weight: 720, feedRate: 3, feedAmount: 22 },
                    { week: 28, weight: 800, feedRate: 2.5, feedAmount: 20 }
                ]
            }
        };
        this.init();
    }

    // Authentication Methods
    async makeApiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async checkAuthStatus() {
        if (!this.token) {
            this.showAuthUI();
            return false;
        }

        try {
            const response = await this.makeApiCall('/auth/verify');
            this.user = response.user;
            this.showAppUI();
            await this.loadUserData();
            return true;
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.logout();
            return false;
        }
    }

    showAuthUI() {
        document.getElementById('auth-controls').style.display = 'flex';
        document.getElementById('user-controls').style.display = 'none';
        document.getElementById('system-selector').style.display = 'none';
        
        // Hide main content until authenticated
        document.querySelector('.mobile-content').style.display = 'none';
        document.querySelector('.bottom-nav').style.display = 'none';
    }

    showAppUI() {
        document.getElementById('auth-controls').style.display = 'none';
        document.getElementById('user-controls').style.display = 'flex';
        document.getElementById('system-selector').style.display = 'flex';
        document.getElementById('username-display').textContent = this.user.username;
        
        // Show main content
        document.querySelector('.mobile-content').style.display = 'block';
        document.querySelector('.bottom-nav').style.display = 'flex';
    }

    async login(username, password) {
        try {
            const response = await this.makeApiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('auth_token', this.token);
            
            this.showAppUI();
            await this.loadUserData();
            this.closeAuthModal();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(username, email, password) {
        try {
            const response = await this.makeApiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });

            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('auth_token', this.token);
            
            this.showAppUI();
            await this.loadUserData();
            this.closeAuthModal();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        this.systems = {};
        this.activeSystemId = null;
        this.dataRecords = { waterQuality: [], fishHealth: [], plantGrowth: [], operations: [] };
        
        localStorage.removeItem('auth_token');
        this.showAuthUI();
        this.updateDashboardFromData();
    }

    // Notification System
    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    showNotification(message, type = 'info', duration = 4000) {
        // Try to show inline notification first
        if (this.showInlineNotification(message, type, duration)) {
            return;
        }

        // Fallback to toast notification
        const container = document.getElementById('notification-container');
        if (!container) {
            console.warn('Notification container not found, falling back to alert');
            alert(message);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('notification-fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Remove on click
        notification.addEventListener('click', () => {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        });
    }

    showInlineNotification(message, type = 'info', duration = 4000) {
        // Find the current active view or form context
        const activeView = document.querySelector('.view.active');
        const activeForm = document.querySelector('.data-form.active, .dosing-content.active, .calculator-content.active');
        
        let targetContainer = null;
        
        // Determine where to show the inline notification
        if (activeForm) {
            // Show in active form context
            targetContainer = activeForm.querySelector('.form-section, .calculator-section, .data-entry-section');
        } else if (activeView) {
            // Show in active view
            targetContainer = activeView;
        }
        
        if (!targetContainer) return false;
        
        // Check if there's already an inline notification
        const existingNotification = targetContainer.querySelector('.inline-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create inline notification
        const inlineNotification = document.createElement('div');
        inlineNotification.className = `inline-notification inline-notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        inlineNotification.innerHTML = `
            <div class="inline-notification-content">
                <span class="inline-notification-icon">${icon}</span>
                <span class="inline-notification-message">${message}</span>
                <button class="inline-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Insert at the top of the container
        targetContainer.insertBefore(inlineNotification, targetContainer.firstChild);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (inlineNotification.parentElement) {
                inlineNotification.classList.add('inline-notification-fade-out');
                setTimeout(() => inlineNotification.remove(), 300);
            }
        }, duration);
        
        return true;
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    async loadUserData() {
        try {
            // Load systems
            const systems = await this.makeApiCall('/systems');
            this.systems = {};
            systems.forEach(system => {
                this.systems[system.id] = system;
            });
            
            this.updateSystemSelector();
            
            // Always default to the first system on load
            if (systems.length > 0) {
                await this.switchToSystem(systems[0].id);
            } else {
                this.activeSystemId = null;
                await this.loadDataRecords();
                this.updateDashboardFromData();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    async init() {
        this.setupNavigation();
        this.setupCalculatorTabs();
        this.setupDataEntryTabs();
        this.setupEventListeners();
        this.setupAuthModal();
        this.setupSystemSelector();
        this.setupDataEditTabs();
        this.initializeFishCalculator();
        this.initializeNutrientCalculator();
        this.initializeDataEntryForms();
        this.createNotificationContainer();
        this.loadSystemManagement();
        this.updateLastFeedTime();
        
        // Initialize charts after DOM is ready
        this.initializeCharts();
        
        // Check authentication status
        await this.checkAuthStatus();
    }

    setupAuthModal() {
        const modal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('close-modal');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const showForgotPasswordLink = document.getElementById('show-forgot-password');
        const showLoginFromForgotLink = document.getElementById('show-login-from-forgot');
        const loginForm = document.getElementById('login-form-element');
        const registerForm = document.getElementById('register-form-element');
        const forgotPasswordForm = document.getElementById('forgot-password-form-element');

        // Modal controls
        loginBtn.addEventListener('click', () => this.showModal('login'));
        registerBtn.addEventListener('click', () => this.showModal('register'));
        logoutBtn.addEventListener('click', () => this.logout());
        closeBtn.addEventListener('click', () => this.closeAuthModal());
        
        // Form switching
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('register');
        });
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('login');
        });
        showForgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('forgot-password');
        });
        showLoginFromForgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('login');
        });

        // Form submissions
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(e);
        });

        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword(e);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeAuthModal();
            }
        });
    }

    showModal(type = 'login') {
        const modal = document.getElementById('auth-modal');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        
        // Hide all forms
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        forgotPasswordForm.style.display = 'none';
        
        // Show the requested form
        if (type === 'login') {
            loginForm.style.display = 'block';
        } else if (type === 'register') {
            registerForm.style.display = 'block';
        } else if (type === 'forgot-password') {
            forgotPasswordForm.style.display = 'block';
        }
        
        modal.style.display = 'flex';
        this.clearMessages();
    }

    closeAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
        this.clearMessages();
    }

    async handleLogin(e) {
        const form = e.target;
        const formData = new FormData(form);
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        this.showMessage('', 'info'); // Clear previous messages
        form.classList.add('loading');

        const result = await this.login(username, password);
        
        form.classList.remove('loading');
        
        if (result.success) {
            this.showMessage('Login successful!', 'success');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    async handleRegister(e) {
        const form = e.target;
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        this.showMessage('', 'info'); // Clear previous messages

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        form.classList.add('loading');

        const result = await this.register(username, email, password);
        
        form.classList.remove('loading');
        
        if (result.success) {
            this.showMessage('Account created successfully!', 'success');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    async handleForgotPassword(e) {
        const form = e.target;
        const email = document.getElementById('forgot-email').value;

        this.showMessage('', 'info'); // Clear previous messages

        if (!email) {
            this.showMessage('Please enter your email address', 'error');
            return;
        }

        form.classList.add('loading');

        try {
            const response = await fetch(`${this.API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            
            form.classList.remove('loading');
            
            if (response.ok) {
                this.showMessage(result.message, 'success');
                // Clear the form
                document.getElementById('forgot-email').value = '';
            } else {
                this.showMessage(result.error || 'Failed to send reset email', 'error');
            }
        } catch (error) {
            form.classList.remove('loading');
            console.error('Forgot password error:', error);
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        if (!message) return;

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Insert at the top of the active form
        const activeForm = document.querySelector('.auth-form:not([style*="display: none"])');
        if (activeForm) {
            activeForm.insertBefore(messageDiv, activeForm.firstChild);
        }
    }

    clearMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view || btn.id.replace('-btn', '');
                
                navButtons.forEach(b => b.classList.remove('active'));
                views.forEach(v => v.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(targetView).classList.add('active');
                
                this.currentView = targetView;
                
                // Load data when switching to specific views
                if (targetView === 'settings') {
                    this.loadSystemManagement();
                } else if (targetView === 'plants') {
                    this.updatePlantManagement();
                    this.updatePlantNutrientData();
                }
            });
        });
    }

    setupCalculatorTabs() {
        const calcTabs = document.querySelectorAll('.calc-tab');
        const calcContents = document.querySelectorAll('.calculator-content');

        calcTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.id.replace('-tab', '');
                
                calcTabs.forEach(t => t.classList.remove('active'));
                calcContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                } else {
                    console.error('Could not find element with ID:', targetContent);
                }
                
                this.currentCalcTab = targetContent;
                
                // Refresh calculator content when switching tabs
                if (targetContent === 'nutrient-calc') {
                    this.initializeNutrientCalculator();
                } else if (targetContent === 'fish-calc') {
                    this.initializeFishCalculator();
                }
            });
        });
    }

    setupDataEntryTabs() {
        const dataTabs = document.querySelectorAll('.data-tab');
        const dataForms = document.querySelectorAll('.data-form');

        dataTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetForm = tab.id.replace('-tab', '-form');
                
                dataTabs.forEach(t => t.classList.remove('active'));
                dataForms.forEach(f => f.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(targetForm).classList.add('active');
                
                this.currentDataTab = targetForm;
            });
        });
    }

    setupEventListeners() {
        const feedButton = document.getElementById('feed-fish');
        if (feedButton) {
            feedButton.addEventListener('click', () => this.feedFish());
        }

        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSettings());
        });
    }

    updateDashboardFromData() {
        const latestData = this.getLatestWaterQualityData();
        
        if (latestData) {
            // Update dashboard with latest manual readings
            document.getElementById('water-temp').textContent = latestData.temperature ? `${latestData.temperature.toFixed(1)}°C` : 'No data';
            document.getElementById('ph-level').textContent = latestData.ph ? latestData.ph.toFixed(1) : 'No data';
            document.getElementById('dissolved-oxygen').textContent = latestData.dissolved_oxygen ? `${latestData.dissolved_oxygen.toFixed(1)} mg/L` : 'No data';
            document.getElementById('ammonia').textContent = latestData.ammonia ? `${latestData.ammonia.toFixed(2)} ppm` : 'No data';
        } else {
            // No manual data entered yet
            document.getElementById('water-temp').textContent = 'No data';
            document.getElementById('ph-level').textContent = 'No data';
            document.getElementById('dissolved-oxygen').textContent = 'No data';
            document.getElementById('ammonia').textContent = 'No data';
        }
        
        // Update charts with historical data
        this.updateCharts();
        
        // Update latest data entries
        this.updateLatestDataEntries();
        
        // Update plant tab nutrient data
        this.updatePlantNutrientData();
        
        // Update data history displays
        this.updateDataHistoryDisplays();
        
        // Update fish tank summary
        this.updateFishTankSummary();
        
        // Update plant management interface
        this.updatePlantManagement();
        
        // Update data edit interface if on settings page
        if (document.querySelector('.edit-tab.active')) {
            const activeTab = document.querySelector('.edit-tab.active');
            this.loadDataEditInterface(activeTab.dataset.category);
        }
    }

    getLatestWaterQualityData() {
        if (this.dataRecords.waterQuality.length === 0) {
            return null;
        }
        // Return the most recent water quality entry (data is ordered DESC by date, so first item is newest)
        return this.dataRecords.waterQuality[0];
    }

    initializeCharts() {
        // Initialize charts for each parameter
        this.initChart('temp-chart', 'Temperature (°C)', '#FF6B6B', 'temperature');
        this.initChart('ph-chart', 'pH Level', '#4ECDC4', 'ph');
        this.initChart('oxygen-chart', 'Dissolved Oxygen (mg/L)', '#45B7D1', 'dissolved_oxygen');
        this.initChart('ammonia-chart', 'Ammonia (ppm)', '#FFA07A', 'ammonia');
    }

    initChart(canvasId, label, color, dataField) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        beginAtZero: dataField === 'ammonia'
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    updateCharts() {
        if (Object.keys(this.charts).length === 0) {
            this.initializeCharts();
        }

        const data = this.dataRecords.waterQuality;
        if (data.length === 0) return;

        // Get last 10 data points for charts
        const recentData = data.slice(0, 10).reverse();
        const labels = recentData.map(item => {
            const date = new Date(item.date);
            return date.getMonth() + 1 + '/' + date.getDate();
        });

        // Update each chart
        this.updateChart('temp-chart', labels, recentData.map(item => item.temperature || null));
        this.updateChart('ph-chart', labels, recentData.map(item => item.ph || null));
        this.updateChart('oxygen-chart', labels, recentData.map(item => item.dissolved_oxygen || null));
        this.updateChart('ammonia-chart', labels, recentData.map(item => item.ammonia || null));
    }

    updateChart(chartId, labels, data) {
        if (!this.charts[chartId]) return;
        
        this.charts[chartId].data.labels = labels;
        this.charts[chartId].data.datasets[0].data = data;
        this.charts[chartId].update('none'); // No animation for better performance
    }

    updateLatestDataEntries() {
        const container = document.getElementById('latest-entries-container');
        const entries = [];

        // Get latest entry from each category
        if (this.dataRecords.waterQuality.length > 0) {
            const latest = this.dataRecords.waterQuality[0];
            entries.push({
                type: 'Water Quality',
                className: 'water-quality',
                date: latest.date,
                content: this.formatWaterQualityEntry(latest)
            });
        }

        if (this.dataRecords.fishHealth.length > 0) {
            const latest = this.dataRecords.fishHealth[0];
            entries.push({
                type: 'Fish Health',
                className: 'fish-health',
                date: latest.date,
                content: this.formatFishHealthEntry(latest)
            });
        }

        if (this.dataRecords.plantGrowth.length > 0) {
            const latest = this.dataRecords.plantGrowth[0];
            entries.push({
                type: 'Plant Growth',
                className: 'plant-growth',
                date: latest.date,
                content: this.formatPlantGrowthEntry(latest)
            });
        }

        if (this.dataRecords.operations.length > 0) {
            const latest = this.dataRecords.operations[0];
            entries.push({
                type: 'Operations',
                className: 'operations',
                date: latest.date,
                content: this.formatOperationsEntry(latest)
            });
        }

        if (entries.length === 0) {
            container.innerHTML = '<div class="no-data-message">No data entries yet. Use the Data Entry tab to start recording measurements.</div>';
            return;
        }

        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        const entriesHtml = entries.map(entry => `
            <div class="latest-entry-card ${entry.className}">
                <div class="latest-entry-header">
                    <div class="latest-entry-type">${entry.type}</div>
                    <div class="latest-entry-date">${this.formatEntryDate(entry.date)}</div>
                </div>
                <div class="latest-entry-content">
                    ${entry.content}
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="latest-entries-grid">${entriesHtml}</div>`;
    }

    formatWaterQualityEntry(entry) {
        const items = [];
        if (entry.temperature) items.push(`Temp: ${entry.temperature}°C`);
        if (entry.ph) items.push(`pH: ${entry.ph}`);
        if (entry.dissolved_oxygen) items.push(`DO: ${entry.dissolved_oxygen} mg/L`);
        if (entry.ammonia) items.push(`NH₃: ${entry.ammonia} ppm`);
        if (entry.ec) items.push(`EC: ${entry.ec} ppm`);
        if (entry.nitrite) items.push(`NO₂: ${entry.nitrite} ppm`);
        if (entry.nitrate) items.push(`NO₃: ${entry.nitrate} ppm`);
        return items.join(' • ') || 'No measurements recorded';
    }

    formatFishHealthEntry(entry) {
        const items = [];
        if (entry.fish_tank_id) items.push(`Tank ${entry.fish_tank_id}`);
        if (entry.count) items.push(`Count: ${entry.count}`);
        if (entry.mortality) items.push(`Mortality: ${entry.mortality}`);
        if (entry.average_weight) items.push(`Avg Weight: ${entry.average_weight}g`);
        if (entry.feed_consumption) items.push(`Feed: ${entry.feed_consumption}g`);
        if (entry.behavior) items.push(`Behavior: ${entry.behavior}`);
        return items.join(' • ') || 'No data recorded';
    }

    formatPlantGrowthEntry(entry) {
        const items = [];
        if (entry.crop_type) items.push(`Crop: ${entry.crop_type}`);
        if (entry.count) items.push(`Count: ${entry.count}`);
        if (entry.harvest_weight) items.push(`Harvest: ${entry.harvest_weight}g`);
        if (entry.health) items.push(`Health: ${entry.health}`);
        if (entry.growth_stage) items.push(`Stage: ${entry.growth_stage}`);
        return items.join(' • ') || 'No data recorded';
    }

    formatOperationsEntry(entry) {
        const items = [];
        if (entry.operation_type) items.push(`Type: ${entry.operation_type}`);
        if (entry.water_volume) items.push(`Water: ${entry.water_volume}L`);
        if (entry.chemical_added) items.push(`Chemical: ${entry.chemical_added}`);
        if (entry.amount_added) items.push(`Amount: ${entry.amount_added}`);
        if (entry.downtime_duration) items.push(`Downtime: ${entry.downtime_duration}h`);
        return items.join(' • ') || 'No data recorded';
    }

    formatEntryDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    updateDataHistoryDisplays() {
        this.updateWaterQualityHistory();
        this.updateFishHealthHistory();
        this.updatePlantGrowthHistory();
        this.updateOperationsHistory();
    }

    updateWaterQualityHistory() {
        const container = document.getElementById('water-quality-history');
        if (!container) return;
        
        const data = this.dataRecords.waterQuality.slice(0, 5); // Show last 5 entries
        
        if (data.length === 0) {
            container.innerHTML = '<div class="data-history-empty">No water quality data recorded yet.</div>';
            return;
        }
        
        const itemsHtml = data.map(item => `
            <div class="data-history-item water-quality">
                <div class="data-history-header">
                    <div class="data-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="data-history-content">
                    ${this.formatWaterQualityEntry(item)}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = itemsHtml;
    }

    updateFishHealthHistory() {
        const container = document.getElementById('fish-health-history');
        if (!container) return;
        
        const data = this.dataRecords.fishHealth.slice(0, 5); // Show last 5 entries
        
        if (data.length === 0) {
            container.innerHTML = '<div class="data-history-empty">No fish health data recorded yet.</div>';
            return;
        }
        
        const itemsHtml = data.map(item => `
            <div class="data-history-item fish-health">
                <div class="data-history-header">
                    <div class="data-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="data-history-content">
                    ${this.formatFishHealthEntry(item)}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = itemsHtml;
    }

    updatePlantGrowthHistory() {
        const container = document.getElementById('plant-growth-history');
        if (!container) return;
        
        const data = this.dataRecords.plantGrowth.slice(0, 5); // Show last 5 entries
        
        if (data.length === 0) {
            container.innerHTML = '<div class="data-history-empty">No plant growth data recorded yet.</div>';
            return;
        }
        
        const itemsHtml = data.map(item => `
            <div class="data-history-item plant-growth">
                <div class="data-history-header">
                    <div class="data-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="data-history-content">
                    ${this.formatPlantGrowthEntry(item)}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = itemsHtml;
    }

    updateOperationsHistory() {
        const container = document.getElementById('operations-history');
        if (!container) return;
        
        const data = this.dataRecords.operations.slice(0, 5); // Show last 5 entries
        
        if (data.length === 0) {
            container.innerHTML = '<div class="data-history-empty">No operations data recorded yet.</div>';
            return;
        }
        
        const itemsHtml = data.map(item => `
            <div class="data-history-item operations">
                <div class="data-history-header">
                    <div class="data-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="data-history-content">
                    ${this.formatOperationsEntry(item)}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = itemsHtml;
    }

    updateFishTankSummary() {
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        const systemConfig = this.loadSystemConfig();
        
        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            container.innerHTML = `
                <div class="no-system-message">
                    <p>Please select a system to view fish tank information.</p>
                </div>
            `;
            return;
        }

        // Get latest fish health data to calculate current fish count
        const latestFishData = this.getLatestFishHealthData();
        const fishCount = latestFishData ? latestFishData.count || 0 : 0;
        const mortality = latestFishData ? latestFishData.mortality || 0 : 0;
        const totalFish = fishCount;
        
        // Calculate stocking density based on weight (KG/m³)
        const fishVolume = systemConfig.total_fish_volume || 1000;
        const fishVolumeM3 = fishVolume / 1000; // Convert liters to cubic meters
        const averageWeight = latestFishData ? latestFishData.average_weight || 0 : 0;
        const totalWeightKg = (totalFish * averageWeight) / 1000; // Convert grams to kg
        
        // Current actual density and final harvest density
        const actualDensity = fishVolumeM3 > 0 && totalWeightKg > 0 ? (totalWeightKg / fishVolumeM3).toFixed(1) : 'N/A';
        
        // Get fish type and calculate final harvest weight density
        const fishType = systemConfig.fish_type || 'Unknown';
        const fishTypeDisplay = fishType.charAt(0).toUpperCase() + fishType.slice(1);
        const finalHarvestWeight = this.getFinalHarvestWeight(fishType);
        const finalTotalWeight = (totalFish * finalHarvestWeight) / 1000; // Convert to kg
        const finalDensity = fishVolumeM3 > 0 && finalTotalWeight > 0 ? (finalTotalWeight / fishVolumeM3).toFixed(1) : 'N/A';
        
        // Calculate recommended stocking density based on fish type
        const recommendedMaxDensity = this.getRecommendedStockingDensity(fishType);
        const densityStatus = actualDensity !== 'N/A' && actualDensity > recommendedMaxDensity ? 'warning' : 'good';
        
        // Get last feeding time
        const lastFeedTime = this.getLastFeedingTime();

        container.innerHTML = `
            <div class="tank-summary-grid">
                <div class="tank-summary-card">
                    <h3>Total Fish Count</h3>
                    <div class="summary-value">${totalFish} ${fishTypeDisplay}</div>
                    <div class="summary-detail">Across ${systemConfig.fish_tank_count} tank${systemConfig.fish_tank_count > 1 ? 's' : ''}</div>
                </div>
                
                <div class="tank-summary-card">
                    <h3>Current Density</h3>
                    <div class="summary-value">${actualDensity} kg/m³</div>
                    <div class="summary-detail ${densityStatus}">
                        Current fish biomass density
                    </div>
                </div>
                
                <div class="tank-summary-card">
                    <h3>Final Harvest Density</h3>
                    <div class="summary-value">${finalDensity} kg/m³</div>
                    <div class="summary-detail">
                        Projected at maturity (${finalHarvestWeight}g/fish)
                    </div>
                </div>
                
                <div class="tank-summary-card">
                    <h3>Tank Volume</h3>
                    <div class="summary-value">${fishVolume}L (${fishVolumeM3}m³)</div>
                    <div class="summary-detail">Max recommended: ${recommendedMaxDensity} kg/m³</div>
                </div>
                
                <div class="tank-summary-card">
                    <h3>Last Fed</h3>
                    <div class="summary-value">${lastFeedTime}</div>
                    <div class="summary-detail">Feed regularly for optimal health</div>
                </div>
            </div>
            
            ${totalFish > 0 ? `
                <div class="tank-details">
                    <h4>Tank Details</h4>
                    <div class="tank-details-grid">
                        ${this.generateTankDetails(systemConfig, latestFishData)}
                    </div>
                </div>
                
                <div class="fish-density-chart-section">
                    <h4>Fish Density Over Time</h4>
                    <canvas id="fish-density-chart" width="400" height="200"></canvas>
                </div>
                
                <div class="monthly-comparison-section">
                    <h4>Monthly Comparison</h4>
                    <div class="monthly-stats">
                        ${this.generateMonthlyComparison()}
                    </div>
                </div>
            ` : ''}
            
            ${mortality > 0 ? `
                <div class="mortality-alert">
                    <strong>⚠️ Recent Mortality:</strong> ${mortality} fish reported in latest health check
                </div>
            ` : ''}
        `;
        
        // Initialize fish density chart if fish are present
        if (totalFish > 0) {
            setTimeout(() => this.initializeFishDensityChart(), 100);
        }
    }

    getLatestFishHealthData() {
        if (this.dataRecords.fishHealth.length === 0) {
            return null;
        }
        return this.dataRecords.fishHealth[0];
    }

    getOptimalStockingRate(fishType) {
        // Optimal stocking rates in liters per fish for different species
        const stockingRates = {
            tilapia: 50,    // 50L per tilapia
            catfish: 40,    // 40L per catfish  
            trout: 80,      // 80L per trout
            bass: 100,      // 100L per bass
            goldfish: 20,   // 20L per goldfish
            koi: 150        // 150L per koi
        };
        return stockingRates[fishType.toLowerCase()] || 50; // Default to tilapia rate
    }

    getLastFeedingTime() {
        // Get from localStorage or default
        const lastFeed = localStorage.getItem('lastFeedTime');
        if (!lastFeed) {
            return 'Never';
        }
        
        const feedTime = new Date(lastFeed);
        const now = new Date();
        const diffMs = now - feedTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours === 0) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }

    getFinalHarvestWeight(fishType) {
        // Returns average final harvest weight in grams
        const harvestWeights = {
            'tilapia': 500, // 500g average
            'trout': 300,   // 300g average  
            'catfish': 800, // 800g average
            'default': 400  // 400g default
        };
        return harvestWeights[fishType.toLowerCase()] || harvestWeights.default;
    }

    getRecommendedStockingDensity(fishType) {
        // Returns recommended maximum stocking density in kg/m³
        const densityLimits = {
            'tilapia': 30,  // 30 kg/m³ max for tilapia
            'trout': 25,    // 25 kg/m³ max for trout
            'catfish': 35,  // 35 kg/m³ max for catfish
            'default': 25   // 25 kg/m³ default
        };
        return densityLimits[fishType.toLowerCase()] || densityLimits.default;
    }

    generateTankDetails(systemConfig, latestFishData) {
        let details = '';
        const fishPerTank = latestFishData && latestFishData.count ? 
            Math.ceil(latestFishData.count / systemConfig.fish_tank_count) : 0;
        const avgWeight = latestFishData ? latestFishData.average_weight || 0 : 0;
        
        for (let i = 1; i <= systemConfig.fish_tank_count; i++) {
            const tankVolume = Math.round(systemConfig.total_fish_volume / systemConfig.fish_tank_count);
            const dailyFeed = this.calculateDailyFeedAmount(fishPerTank, avgWeight, systemConfig.fish_type);
            
            details += `
                <div class="tank-detail-item">
                    <strong>Tank ${i}</strong><br>
                    ${fishPerTank} fish • ${tankVolume}L<br>
                    <span class="feed-recommendation">📊 Daily feed: ${dailyFeed}g</span>
                </div>
            `;
        }
        return details;
    }

    calculateDailyFeedAmount(fishCount, avgWeightGrams, fishType) {
        if (fishCount === 0 || avgWeightGrams === 0) return 0;
        
        // Feed rate as percentage of body weight per day
        const feedRates = {
            'tilapia': this.getTilapiaFeedRate(avgWeightGrams),
            'trout': this.getTroutFeedRate(avgWeightGrams),
            'catfish': this.getCatfishFeedRate(avgWeightGrams),
            'default': 0.025 // 2.5% default
        };
        
        const feedRate = feedRates[fishType?.toLowerCase()] || feedRates.default;
        const totalBiomassGrams = fishCount * avgWeightGrams;
        const dailyFeedGrams = totalBiomassGrams * feedRate;
        
        return Math.round(dailyFeedGrams);
    }

    getTilapiaFeedRate(weightGrams) {
        // Tilapia feed rates based on size
        if (weightGrams < 50) return 0.08;      // 8% for fry
        if (weightGrams < 100) return 0.06;     // 6% for juveniles
        if (weightGrams < 250) return 0.04;     // 4% for growing
        return 0.025;                           // 2.5% for adults
    }

    getTroutFeedRate(weightGrams) {
        // Trout feed rates based on size
        if (weightGrams < 30) return 0.10;      // 10% for fry
        if (weightGrams < 80) return 0.07;      // 7% for juveniles
        if (weightGrams < 200) return 0.04;     // 4% for growing
        return 0.02;                            // 2% for adults
    }

    getCatfishFeedRate(weightGrams) {
        // Catfish feed rates based on size
        if (weightGrams < 100) return 0.07;     // 7% for juveniles
        if (weightGrams < 300) return 0.04;     // 4% for growing
        return 0.025;                           // 2.5% for adults
    }

    initializeFishDensityChart() {
        const canvas = document.getElementById('fish-density-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Calculate fish density data over time
        const fishHealthData = this.dataRecords.fishHealth || [];
        const systemConfig = this.loadSystemConfig();
        const fishVolumeM3 = (systemConfig?.total_fish_volume || 1000) / 1000;
        
        const chartData = fishHealthData.map(entry => {
            const date = new Date(entry.date);
            const totalWeight = (entry.count * (entry.average_weight || 0)) / 1000; // Convert to kg
            const density = fishVolumeM3 > 0 ? totalWeight / fishVolumeM3 : 0;
            
            return {
                x: date,
                y: density
            };
        }).reverse(); // Reverse to show chronological order

        // Create chart
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Fish Density (kg/m³)',
                    data: chartData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM DD'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Density (kg/m³)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Density: ${context.parsed.y.toFixed(2)} kg/m³`;
                            }
                        }
                    }
                }
            }
        });
    }

    generateMonthlyComparison() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Calculate current month and previous month date ranges
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const previousMonthEnd = new Date(currentYear, currentMonth, 0);
        
        // Calculate feed consumption
        const feedComparison = this.calculateFeedComparison(currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd);
        
        // Calculate harvest amounts
        const harvestComparison = this.calculateHarvestComparison(currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd);
        
        return `
            <div class="comparison-grid">
                <div class="comparison-card">
                    <h5>📊 Feed Consumption</h5>
                    <div class="current-stat">This Month: ${feedComparison.current}g</div>
                    <div class="previous-stat">Last Month: ${feedComparison.previous}g</div>
                    <div class="comparison-change ${feedComparison.trend}">
                        ${feedComparison.change}
                    </div>
                </div>
                
                <div class="comparison-card">
                    <h5>🌱 Plant Harvest</h5>
                    <div class="current-stat">This Month: ${harvestComparison.current}kg</div>
                    <div class="previous-stat">Last Month: ${harvestComparison.previous}kg</div>
                    <div class="comparison-change ${harvestComparison.trend}">
                        ${harvestComparison.change}
                    </div>
                </div>
            </div>
        `;
    }

    calculateFeedComparison(currentStart, currentEnd, previousStart, previousEnd) {
        const fishHealthData = this.dataRecords.fishHealth || [];
        
        // Calculate total feed consumption for current month
        const currentMonthData = fishHealthData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= currentStart && entryDate <= currentEnd;
        });
        
        const currentFeed = currentMonthData.reduce((total, entry) => {
            return total + (entry.feed_consumption || 0);
        }, 0);
        
        // Calculate total feed consumption for previous month
        const previousMonthData = fishHealthData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= previousStart && entryDate <= previousEnd;
        });
        
        const previousFeed = previousMonthData.reduce((total, entry) => {
            return total + (entry.feed_consumption || 0);
        }, 0);
        
        // Calculate change and trend
        const change = currentFeed - previousFeed;
        const percentChange = previousFeed > 0 ? ((change / previousFeed) * 100).toFixed(1) : 0;
        const trend = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeText = change === 0 ? 'No change' : 
                          `${change > 0 ? '+' : ''}${change}g (${percentChange}%)`;
        
        return {
            current: currentFeed.toFixed(0),
            previous: previousFeed.toFixed(0),
            change: changeText,
            trend
        };
    }

    calculateHarvestComparison(currentStart, currentEnd, previousStart, previousEnd) {
        const plantData = this.dataRecords.plantGrowth || [];
        
        // Calculate total harvest for current month
        const currentMonthData = plantData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= currentStart && entryDate <= currentEnd;
        });
        
        const currentHarvest = currentMonthData.reduce((total, entry) => {
            return total + (entry.harvest_weight || 0);
        }, 0);
        
        // Calculate total harvest for previous month
        const previousMonthData = plantData.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= previousStart && entryDate <= previousEnd;
        });
        
        const previousHarvest = previousMonthData.reduce((total, entry) => {
            return total + (entry.harvest_weight || 0);
        }, 0);
        
        // Calculate change and trend
        const change = currentHarvest - previousHarvest;
        const percentChange = previousHarvest > 0 ? ((change / previousHarvest) * 100).toFixed(1) : 0;
        const trend = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeText = change === 0 ? 'No change' : 
                          `${change > 0 ? '+' : ''}${change.toFixed(1)}kg (${percentChange}%)`;
        
        return {
            current: currentHarvest.toFixed(1),
            previous: previousHarvest.toFixed(1),
            change: changeText,
            trend
        };
    }

    setupDataEditTabs() {
        const editTabs = document.querySelectorAll('.edit-tab');
        editTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                editTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const category = tab.dataset.category;
                this.loadDataEditInterface(category);
            });
        });
        
        // Load initial interface
        this.loadDataEditInterface('water-quality');
    }

    loadDataEditInterface(category) {
        const container = document.getElementById('data-edit-container');
        if (!this.activeSystemId) {
            container.innerHTML = '<div class="no-data-edit-message">Please select a system to edit data.</div>';
            return;
        }

        let data = [];
        let categoryName = '';
        
        switch(category) {
            case 'water-quality':
                data = this.dataRecords.waterQuality || [];
                categoryName = 'Water Quality';
                break;
            case 'fish-health':
                data = this.dataRecords.fishHealth || [];
                categoryName = 'Fish Health';
                break;
            case 'plant-growth':
                data = this.dataRecords.plantGrowth || [];
                categoryName = 'Plant Growth';
                break;
            case 'operations':
                data = this.dataRecords.operations || [];
                categoryName = 'Operations';
                break;
        }

        if (data.length === 0) {
            container.innerHTML = `
                <div class="no-data-edit-message">
                    No ${categoryName.toLowerCase()} data entries to edit yet.
                </div>
            `;
            return;
        }

        const itemsHtml = data.slice(0, 20).map((item, index) => `
            <div class="edit-data-item" data-category="${category}" data-id="${item.id}" data-index="${index}">
                <div class="edit-item-header">
                    <div class="edit-item-date">${this.formatEntryDate(item.date)}</div>
                    <div class="edit-item-actions">
                        <button class="edit-btn" onclick="app.editDataEntry('${category}', ${item.id}, ${index})">Edit</button>
                        <button class="delete-btn" onclick="app.deleteDataEntry('${category}', ${item.id})">Delete</button>
                    </div>
                </div>
                <div class="edit-item-content">
                    ${this.formatDataEntryForEdit(category, item)}
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="data-edit-list">
                ${itemsHtml}
            </div>
        `;
    }

    formatDataEntryForEdit(category, item) {
        switch(category) {
            case 'water-quality':
                return this.formatWaterQualityEntry(item);
            case 'fish-health':
                return this.formatFishHealthEntry(item);
            case 'plant-growth':
                return this.formatPlantGrowthEntry(item);
            case 'operations':
                return this.formatOperationsEntry(item);
            default:
                return 'Unknown data format';
        }
    }

    async editDataEntry(category, id, index) {
        const data = this.getDataByCategory(category);
        const item = data.find(d => d.id === id);
        if (!item) return;

        const formHtml = this.generateEditForm(category, item);
        const itemElement = document.querySelector(`[data-id="${id}"]`);
        
        // Replace content with edit form
        itemElement.innerHTML = `
            <div class="edit-item-header">
                <div class="edit-item-date">${this.formatEntryDate(item.date)}</div>
                <div class="edit-item-actions">
                    <span style="color: #666; font-size: 0.8rem;">Editing...</span>
                </div>
            </div>
            ${formHtml}
        `;
    }

    generateEditForm(category, item) {
        switch(category) {
            case 'water-quality':
                return this.generateWaterQualityEditForm(item);
            case 'fish-health':
                return this.generateFishHealthEditForm(item);
            case 'plant-growth':
                return this.generatePlantGrowthEditForm(item);
            case 'operations':
                return this.generateOperationsEditForm(item);
            default:
                return '<div>Edit form not available</div>';
        }
    }

    generateWaterQualityEditForm(item) {
        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>pH Level:</label>
                        <input type="number" id="edit-ph" value="${item.ph || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Temperature (°C):</label>
                        <input type="number" id="edit-temperature" value="${item.temperature || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Dissolved Oxygen (mg/L):</label>
                        <input type="number" id="edit-dissolved-oxygen" value="${item.dissolved_oxygen || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>EC/TDS (ppm):</label>
                        <input type="number" id="edit-ec" value="${item.ec || ''}" step="10">
                    </div>
                    <div class="form-field">
                        <label>Ammonia (ppm):</label>
                        <input type="number" id="edit-ammonia" value="${item.ammonia || ''}" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Nitrite (ppm):</label>
                        <input type="number" id="edit-nitrite" value="${item.nitrite || ''}" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>Nitrate (ppm):</label>
                        <input type="number" id="edit-nitrate" value="${item.nitrate || ''}" step="0.1">
                    </div>
                </div>
                <div class="edit-form-actions">
                    <button class="save-btn" onclick="app.saveDataEdit('water-quality', ${item.id})">Save Changes</button>
                    <button class="cancel-btn" onclick="app.cancelDataEdit('water-quality')">Cancel</button>
                </div>
            </div>
        `;
    }

    generateFishHealthEditForm(item) {
        const systemConfig = this.loadSystemConfig();
        let tankOptions = '';
        for (let i = 1; i <= (systemConfig.fish_tank_count || 1); i++) {
            const selected = item.fish_tank_id === i ? 'selected' : '';
            tankOptions += `<option value="${i}" ${selected}>Tank ${i}</option>`;
        }

        return `
            <div class="edit-form">
                <div class="edit-form-grid">
                    <div class="form-field">
                        <label>Date & Time:</label>
                        <input type="datetime-local" id="edit-date" value="${item.date.slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label>Fish Tank:</label>
                        <select id="edit-fish-tank">${tankOptions}</select>
                    </div>
                    <div class="form-field">
                        <label>Fish Count:</label>
                        <input type="number" id="edit-count" value="${item.count || ''}" min="0">
                    </div>
                    <div class="form-field">
                        <label>Mortality:</label>
                        <input type="number" id="edit-mortality" value="${item.mortality || ''}" min="0">
                    </div>
                    <div class="form-field">
                        <label>Average Weight (g):</label>
                        <input type="number" id="edit-weight" value="${item.average_weight || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Feed Consumption (g):</label>
                        <input type="number" id="edit-feed" value="${item.feed_consumption || ''}" step="0.1">
                    </div>
                    <div class="form-field">
                        <label>Behavior:</label>
                        <select id="edit-behavior">
                            <option value="normal" ${item.behavior === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="active" ${item.behavior === 'active' ? 'selected' : ''}>Active</option>
                            <option value="lethargic" ${item.behavior === 'lethargic' ? 'selected' : ''}>Lethargic</option>
                            <option value="aggressive" ${item.behavior === 'aggressive' ? 'selected' : ''}>Aggressive</option>
                        </select>
                    </div>
                </div>
                <div class="edit-form-actions">
                    <button class="save-btn" onclick="app.saveDataEdit('fish-health', ${item.id})">Save Changes</button>
                    <button class="cancel-btn" onclick="app.cancelDataEdit('fish-health')">Cancel</button>
                </div>
            </div>
        `;
    }

    getDataByCategory(category) {
        switch(category) {
            case 'water-quality': return this.dataRecords.waterQuality;
            case 'fish-health': return this.dataRecords.fishHealth;
            case 'plant-growth': return this.dataRecords.plantGrowth;
            case 'operations': return this.dataRecords.operations;
            default: return [];
        }
    }

    async saveDataEdit(category, id) {
        // Collect form data
        const formData = this.collectEditFormData(category);
        
        try {
            const endpoint = this.getCategoryEndpoint(category);
            await this.makeApiCall(`${endpoint}/${this.activeSystemId}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            // Reload data
            await this.loadDataRecords();
            this.updateDashboardFromData();
            
            // Refresh the edit interface
            const activeTab = document.querySelector('.edit-tab.active');
            this.loadDataEditInterface(activeTab.dataset.category);
            
            this.showNotification(`✅ ${category.replace('-', ' ')} data updated successfully!`, 'success');
        } catch (error) {
            console.error('Failed to save data edit:', error);
            this.showNotification('❌ Failed to save changes. Please try again.', 'error');
        }
    }

    collectEditFormData(category) {
        const data = {
            date: document.getElementById('edit-date').value
        };

        switch(category) {
            case 'water-quality':
                data.ph = parseFloat(document.getElementById('edit-ph').value) || null;
                data.temperature = parseFloat(document.getElementById('edit-temperature').value) || null;
                data.dissolved_oxygen = parseFloat(document.getElementById('edit-dissolved-oxygen').value) || null;
                data.ec = parseFloat(document.getElementById('edit-ec').value) || null;
                data.ammonia = parseFloat(document.getElementById('edit-ammonia').value) || null;
                data.nitrite = parseFloat(document.getElementById('edit-nitrite').value) || null;
                data.nitrate = parseFloat(document.getElementById('edit-nitrate').value) || null;
                break;
            case 'fish-health':
                data.fish_tank_id = parseInt(document.getElementById('edit-fish-tank').value);
                data.count = parseInt(document.getElementById('edit-count').value) || null;
                data.mortality = parseInt(document.getElementById('edit-mortality').value) || null;
                data.average_weight = parseFloat(document.getElementById('edit-weight').value) || null;
                data.feed_consumption = parseFloat(document.getElementById('edit-feed').value) || null;
                data.behavior = document.getElementById('edit-behavior').value;
                break;
        }

        return data;
    }

    getCategoryEndpoint(category) {
        const endpoints = {
            'water-quality': '/data/water-quality',
            'fish-health': '/data/fish-health',
            'plant-growth': '/data/plant-growth',
            'operations': '/data/operations'
        };
        return endpoints[category];
    }

    cancelDataEdit(category) {
        // Refresh the current tab to cancel editing
        this.loadDataEditInterface(category);
    }

    async deleteDataEntry(category, id) {
        if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            return;
        }

        try {
            const endpoint = this.getCategoryEndpoint(category);
            await this.makeApiCall(`${endpoint}/${this.activeSystemId}/${id}`, {
                method: 'DELETE'
            });
            
            // Reload data
            await this.loadDataRecords();
            this.updateDashboardFromData();
            
            // Refresh the edit interface
            const activeTab = document.querySelector('.edit-tab.active');
            this.loadDataEditInterface(activeTab.dataset.category);
            
            this.showNotification(`🗑️ ${category.replace('-', ' ')} entry deleted successfully!`, 'success');
        } catch (error) {
            console.error('Failed to delete data entry:', error);
            this.showNotification('❌ Failed to delete entry. Please try again.', 'error');
        }
    }

    updatePlantManagement() {
        this.updatePlantOverview();
        this.updateGrowBeds();
        this.updatePlantGrowthHistoryDisplay();
        this.updatePlantRecommendations();
    }

    updatePlantNutrientData() {
        const latestData = this.getLatestWaterQualityData();
        
        if (latestData) {
            // Update plant nutrient displays with latest readings
            document.getElementById('plant-iron').textContent = latestData.iron ? `${latestData.iron.toFixed(1)} mg/L` : 'No data';
            document.getElementById('plant-potassium').textContent = latestData.potassium ? `${latestData.potassium.toFixed(1)} mg/L` : 'No data';
            document.getElementById('plant-calcium').textContent = latestData.calcium ? `${latestData.calcium.toFixed(1)} mg/L` : 'No data';
            document.getElementById('plant-ph').textContent = latestData.ph ? latestData.ph.toFixed(1) : 'No data';
        } else {
            // No data available
            document.getElementById('plant-iron').textContent = 'No data';
            document.getElementById('plant-potassium').textContent = 'No data';
            document.getElementById('plant-calcium').textContent = 'No data';
            document.getElementById('plant-ph').textContent = 'No data';
        }
        
        // Update nutrient charts
        this.updateNutrientCharts();
        
        // Update nutrient recommendations
        this.updateNutrientRecommendations();
    }

    updateNutrientCharts() {
        // Get historical water quality data for charts
        const waterQualityData = this.dataRecords.waterQuality || [];
        
        // Prepare data for charts (last 7 days)
        const recentData = waterQualityData.slice(0, 7).reverse();
        const labels = recentData.map(entry => new Date(entry.date).toLocaleDateString());
        
        // Iron chart
        this.createOrUpdateNutrientChart('iron-chart', 'Iron (Fe)', labels, 
            recentData.map(entry => entry.iron || 0), '#80fb7d');
        
        // Potassium chart
        this.createOrUpdateNutrientChart('potassium-chart', 'Potassium (K)', labels, 
            recentData.map(entry => entry.potassium || 0), '#7baaee');
        
        // Calcium chart
        this.createOrUpdateNutrientChart('calcium-chart', 'Calcium (Ca)', labels, 
            recentData.map(entry => entry.calcium || 0), '#8dfbcc');
        
        // pH chart for plants
        this.createOrUpdateNutrientChart('plant-ph-chart', 'pH Level', labels, 
            recentData.map(entry => entry.ph || 0), '#334e9d');
    }

    createOrUpdateNutrientChart(canvasId, label, labels, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        display: false
                    },
                    x: {
                        display: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    updateNutrientRecommendations() {
        const container = document.getElementById('nutrient-recommendations-container');
        if (!container) return;

        const latestData = this.getLatestWaterQualityData();
        const plantData = this.dataRecords.plantGrowth || [];
        
        if (!latestData) {
            container.innerHTML = `
                <div class="recommendation-card">
                    <div class="recommendation-header">
                        <span class="recommendation-icon">📊</span>
                        <span class="recommendation-title">No Data Available</span>
                    </div>
                    <div class="recommendation-content">
                        Add water quality measurements in the Data Entry tab to receive personalized nutrient recommendations.
                    </div>
                </div>
            `;
            return;
        }

        // Get current crops from recent plant data
        const currentCrops = this.getCurrentCrops(plantData);
        const recommendations = this.generateNutrientRecommendations(latestData, currentCrops);

        container.innerHTML = `
            <div class="nutrient-recommendations-grid">
                ${recommendations.map(rec => this.generateRecommendationCard(rec)).join('')}
            </div>
        `;
    }

    getCurrentCrops(plantData) {
        // Get unique crop types from recent plant data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentPlantData = plantData.filter(entry => 
            new Date(entry.date) >= thirtyDaysAgo && entry.crop_type
        );
        
        const cropTypes = [...new Set(recentPlantData.map(entry => entry.crop_type))];
        return cropTypes.length > 0 ? cropTypes : ['general'];
    }

    generateNutrientRecommendations(data, crops) {
        const recommendations = [];
        
        // pH Recommendations
        const pHRec = this.analyzePH(data.ph, crops);
        if (pHRec) recommendations.push(pHRec);
        
        // Iron Recommendations
        const ironRec = this.analyzeIron(data.iron, crops);
        if (ironRec) recommendations.push(ironRec);
        
        // Potassium Recommendations
        const potassiumRec = this.analyzePotassium(data.potassium, crops);
        if (potassiumRec) recommendations.push(potassiumRec);
        
        // Calcium Recommendations
        const calciumRec = this.analyzeCalcium(data.calcium, crops);
        if (calciumRec) recommendations.push(calciumRec);
        
        // Overall system recommendation
        const systemRec = this.generateSystemRecommendation(data, crops);
        if (systemRec) recommendations.push(systemRec);
        
        return recommendations;
    }

    analyzePH(ph, crops) {
        if (!ph) return null;
        
        const cropOptimal = this.getOptimalPH(crops);
        let status, icon, action, content;
        
        if (ph < 5.5) {
            status = 'critical';
            icon = '⚠️';
            action = 'Add pH buffer or reduce acid input';
            content = `pH is critically low at ${ph.toFixed(1)}. Most plants cannot absorb nutrients effectively below 5.5.`;
        } else if (ph < cropOptimal.min) {
            status = 'warning';
            icon = '📉';
            action = 'Gradually increase pH';
            content = `pH is slightly low at ${ph.toFixed(1)} for your crops. Optimal range is ${cropOptimal.min}-${cropOptimal.max}.`;
        } else if (ph > cropOptimal.max) {
            status = 'warning';
            icon = '📈';
            action = 'Gradually decrease pH';
            content = `pH is slightly high at ${ph.toFixed(1)} for your crops. Optimal range is ${cropOptimal.min}-${cropOptimal.max}.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `pH is optimal at ${ph.toFixed(1)} for your crops. Plants can efficiently absorb nutrients.`;
        }
        
        return {
            title: 'pH Level',
            status,
            icon,
            level: `Current: ${ph.toFixed(1)}`,
            content,
            action,
            cropNote: crops.length > 1 ? `Optimized for: ${crops.join(', ')}` : null
        };
    }

    analyzeIron(iron, crops) {
        if (!iron) return null;
        
        let status, icon, action, content;
        
        if (iron < 0.1) {
            status = 'critical';
            icon = '🔴';
            action = 'Add iron chelate supplement';
            content = `Iron is critically low at ${iron.toFixed(1)} mg/L. Plants will show yellowing leaves (chlorosis).`;
        } else if (iron < 0.3) {
            status = 'warning';
            icon = '🟡';
            action = 'Consider iron supplementation';
            content = `Iron is low at ${iron.toFixed(1)} mg/L. Optimal range is 0.3-2.0 mg/L for healthy chlorophyll production.`;
        } else if (iron > 5.0) {
            status = 'warning';
            icon = '🟠';
            action = 'Reduce iron inputs';
            content = `Iron is high at ${iron.toFixed(1)} mg/L. Excessive iron can block other nutrient uptake.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Iron is optimal at ${iron.toFixed(1)} mg/L. Plants have good access for chlorophyll synthesis.`;
        }
        
        return {
            title: 'Iron (Fe)',
            status,
            icon,
            level: `Current: ${iron.toFixed(1)} mg/L`,
            content,
            action,
            cropNote: this.getIronNote(crops)
        };
    }

    analyzePotassium(potassium, crops) {
        if (!potassium) return null;
        
        let status, icon, action, content;
        
        if (potassium < 150) {
            status = 'critical';
            icon = '🔴';
            action = 'Add potassium supplement';
            content = `Potassium is critically low at ${potassium.toFixed(0)} mg/L. Plants need K for fruit development and disease resistance.`;
        } else if (potassium < 200) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase potassium gradually';
            content = `Potassium is low at ${potassium.toFixed(0)} mg/L. Optimal range is 200-400 mg/L for most crops.`;
        } else if (potassium > 500) {
            status = 'warning';
            icon = '🟠';
            action = 'Reduce potassium inputs';
            content = `Potassium is high at ${potassium.toFixed(0)} mg/L. Excessive K can interfere with calcium uptake.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Potassium is optimal at ${potassium.toFixed(0)} mg/L. Plants have good access for metabolism and fruit quality.`;
        }
        
        return {
            title: 'Potassium (K)',
            status,
            icon,
            level: `Current: ${potassium.toFixed(0)} mg/L`,
            content,
            action,
            cropNote: this.getPotassiumNote(crops)
        };
    }

    analyzeCalcium(calcium, crops) {
        if (!calcium) return null;
        
        let status, icon, action, content;
        
        if (calcium < 100) {
            status = 'critical';
            icon = '🔴';
            action = 'Add calcium supplement';
            content = `Calcium is critically low at ${calcium.toFixed(0)} mg/L. Plants will develop weak cell walls and blossom end rot.`;
        } else if (calcium < 150) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase calcium levels';
            content = `Calcium is low at ${calcium.toFixed(0)} mg/L. Optimal range is 150-300 mg/L for strong plant structure.`;
        } else if (calcium > 400) {
            status = 'warning';
            icon = '🟠';
            action = 'Monitor calcium levels';
            content = `Calcium is high at ${calcium.toFixed(0)} mg/L. Very high Ca can reduce uptake of other nutrients.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Calcium is optimal at ${calcium.toFixed(0)} mg/L. Plants have strong cell wall development.`;
        }
        
        return {
            title: 'Calcium (Ca)',
            status,
            icon,
            level: `Current: ${calcium.toFixed(0)} mg/L`,
            content,
            action,
            cropNote: this.getCalciumNote(crops)
        };
    }

    generateSystemRecommendation(data, crops) {
        const issues = [];
        const strengths = [];
        
        // Analyze overall system health
        if (data.ph && (data.ph < 5.5 || data.ph > 8.0)) issues.push('pH imbalance');
        if (data.iron && data.iron < 0.1) issues.push('iron deficiency');
        if (data.potassium && data.potassium < 150) issues.push('potassium shortage');
        if (data.calcium && data.calcium < 100) issues.push('calcium deficiency');
        
        if (data.ph && data.ph >= 6.0 && data.ph <= 7.0) strengths.push('optimal pH');
        if (data.iron && data.iron >= 0.3 && data.iron <= 2.0) strengths.push('good iron levels');
        if (data.potassium && data.potassium >= 200 && data.potassium <= 400) strengths.push('adequate potassium');
        if (data.calcium && data.calcium >= 150 && data.calcium <= 300) strengths.push('sufficient calcium');
        
        let status, icon, content, action;
        
        if (issues.length >= 3) {
            status = 'critical';
            icon = '🚨';
            content = `Multiple nutrient imbalances detected: ${issues.join(', ')}. Immediate attention required.`;
            action = 'Address critical issues first, then rebalance';
        } else if (issues.length >= 1) {
            status = 'warning';
            icon = '⚠️';
            content = `System needs attention: ${issues.join(', ')}. ${strengths.length > 0 ? `Strengths: ${strengths.join(', ')}.` : ''}`;
            action = 'Focus on identified issues';
        } else {
            status = 'optimal';
            icon = '🌟';
            content = `System is well-balanced with ${strengths.join(', ')}. Plants should thrive in these conditions.`;
            action = 'Continue current maintenance routine';
        }
        
        return {
            title: 'Overall System Health',
            status,
            icon,
            level: `${issues.length} issues, ${strengths.length} optimal`,
            content,
            action,
            cropNote: crops.length > 1 ? `Currently growing: ${crops.join(', ')}` : null
        };
    }

    getOptimalPH(crops) {
        // Default ranges for common crops
        const ranges = {
            lettuce: { min: 5.5, max: 6.5 },
            tomato: { min: 6.0, max: 6.8 },
            basil: { min: 5.5, max: 6.5 },
            spinach: { min: 6.0, max: 7.0 },
            kale: { min: 6.0, max: 7.5 },
            cucumber: { min: 5.5, max: 6.0 },
            peppers: { min: 6.0, max: 6.8 },
            herbs: { min: 5.5, max: 6.5 },
            leafy_greens: { min: 5.5, max: 6.5 },
            general: { min: 5.5, max: 6.5 }
        };
        
        if (crops.length === 1) {
            return ranges[crops[0].toLowerCase()] || ranges.general;
        }
        
        // For multiple crops, find intersection
        return { min: 6.0, max: 6.5 }; // Safe range for most crops
    }

    getIronNote(crops) {
        const highIronCrops = ['spinach', 'kale', 'lettuce', 'leafy_greens'];
        const hasHighIronCrop = crops.some(crop => highIronCrops.includes(crop.toLowerCase()));
        return hasHighIronCrop ? 'Leafy greens require higher iron for dark green color' : null;
    }

    getPotassiumNote(crops) {
        const highKCrops = ['tomato', 'peppers', 'cucumber'];
        const hasHighKCrop = crops.some(crop => highKCrops.includes(crop.toLowerCase()));
        return hasHighKCrop ? 'Fruiting plants need extra potassium for development' : null;
    }

    getCalciumNote(crops) {
        const highCaCrops = ['tomato', 'peppers'];
        const hasHighCaCrop = crops.some(crop => highCaCrops.includes(crop.toLowerCase()));
        return hasHighCaCrop ? 'Prevents blossom end rot in fruiting plants' : null;
    }

    generateRecommendationCard(rec) {
        return `
            <div class="recommendation-card ${rec.status}">
                <div class="recommendation-header">
                    <span class="recommendation-icon">${rec.icon}</span>
                    <span class="recommendation-title">${rec.title}</span>
                </div>
                <div class="recommendation-level">${rec.level}</div>
                <div class="recommendation-content">${rec.content}</div>
                <div class="recommendation-action">${rec.action}</div>
                ${rec.cropNote ? `<div class="crop-specific-note">${rec.cropNote}</div>` : ''}
            </div>
        `;
    }

    updatePlantOverview() {
        const container = document.getElementById('plant-overview-container');
        if (!container) return;

        const systemConfig = this.loadSystemConfig();
        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            container.innerHTML = '<div class="no-plant-data">Please select a system to view plant information.</div>';
            return;
        }

        const plantData = this.dataRecords.plantGrowth || [];
        const totalPlants = this.calculateTotalPlants(plantData);
        const activeGrowBeds = Math.min(systemConfig.grow_bed_count || 4, this.getActiveGrowBeds(plantData));
        const totalHarvested = this.calculateTotalHarvested(plantData);
        const lastHarvestDate = this.getLastHarvestDate(plantData);

        container.innerHTML = `
            <div class="plant-overview-stats">
                <div class="plant-stat-card">
                    <h4>Active Plants</h4>
                    <div class="plant-stat-value">${totalPlants}</div>
                    <div class="plant-stat-detail">Currently growing</div>
                </div>
                
                <div class="plant-stat-card">
                    <h4>Active Grow Beds</h4>
                    <div class="plant-stat-value">${activeGrowBeds}/${systemConfig.grow_bed_count}</div>
                    <div class="plant-stat-detail">Beds in use</div>
                </div>
                
                <div class="plant-stat-card">
                    <h4>Total Harvested</h4>
                    <div class="plant-stat-value">${totalHarvested}g</div>
                    <div class="plant-stat-detail">All time harvest</div>
                </div>
                
                <div class="plant-stat-card">
                    <h4>Last Harvest</h4>
                    <div class="plant-stat-value">${lastHarvestDate || 'Never'}</div>
                    <div class="plant-stat-detail">Most recent harvest</div>
                </div>
            </div>
        `;
    }

    updateGrowBeds() {
        const container = document.getElementById('grow-beds-container');
        if (!container) return;

        const systemConfig = this.loadSystemConfig();
        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            container.innerHTML = '<div class="no-plant-data">No system selected</div>';
            return;
        }

        const plantData = this.dataRecords.plantGrowth || [];
        const growBeds = this.generateGrowBedInfo(systemConfig, plantData);

        if (growBeds.length === 0) {
            container.innerHTML = '<div class="no-plant-data">No grow bed data available</div>';
            return;
        }

        const bedsHtml = growBeds.map(bed => `
            <div class="grow-bed-card">
                <div class="grow-bed-header">
                    <div class="grow-bed-name">Grow Bed ${bed.number}</div>
                    <div class="grow-bed-status ${bed.status.toLowerCase()}">${bed.status}</div>
                </div>
                <div class="grow-bed-details">
                    ${bed.details}
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="grow-beds-grid">${bedsHtml}</div>`;
    }

    updatePlantGrowthHistoryDisplay() {
        const container = document.getElementById('plant-growth-history');
        if (!container) return;

        const plantData = this.dataRecords.plantGrowth || [];
        
        if (plantData.length === 0) {
            container.innerHTML = '<div class="no-plant-data">No plant growth data recorded yet.</div>';
            return;
        }

        const recentData = plantData.slice(0, 10); // Show last 10 entries
        const historyHtml = recentData.map(item => `
            <div class="plant-history-item">
                <div class="plant-history-header">
                    <div class="plant-history-crop">${item.crop_type?.charAt(0).toUpperCase() + item.crop_type?.slice(1) || 'Unknown'}</div>
                    <div class="plant-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="plant-history-details">
                    ${this.formatPlantGrowthEntry(item)}
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="plant-history-list">${historyHtml}</div>`;
    }

    updatePlantRecommendations() {
        const container = document.getElementById('plant-recommendations');
        if (!container) return;

        const systemConfig = this.loadSystemConfig();
        const waterQuality = this.getLatestWaterQualityData();
        const plantData = this.dataRecords.plantGrowth || [];
        
        const recommendations = this.generatePlantRecommendations(systemConfig, waterQuality, plantData);

        const recommendationsHtml = recommendations.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-title">
                    ${rec.icon} ${rec.title}
                </div>
                <div class="recommendation-content">
                    ${rec.content}
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="plant-recommendations-grid">${recommendationsHtml}</div>`;
    }

    calculateTotalPlants(plantData) {
        if (plantData.length === 0) return 0;
        
        // Get the most recent count for each crop type
        const cropCounts = {};
        plantData.forEach(item => {
            if (item.crop_type && item.count) {
                if (!cropCounts[item.crop_type] || new Date(item.date) > new Date(cropCounts[item.crop_type].date)) {
                    cropCounts[item.crop_type] = item;
                }
            }
        });
        
        return Object.values(cropCounts).reduce((total, item) => total + (item.count || 0), 0);
    }

    getActiveGrowBeds(plantData) {
        if (plantData.length === 0) return 0;
        
        // Count unique crop types as active beds
        const activeCrops = new Set();
        plantData.forEach(item => {
            if (item.crop_type && item.count > 0) {
                activeCrops.add(item.crop_type);
            }
        });
        
        return activeCrops.size;
    }

    calculateTotalHarvested(plantData) {
        return plantData.reduce((total, item) => {
            return total + (item.harvest_weight || 0);
        }, 0);
    }

    getLastHarvestDate(plantData) {
        const harvestData = plantData.filter(item => item.harvest_weight > 0);
        if (harvestData.length === 0) return null;
        
        const latest = harvestData.reduce((latest, item) => {
            return new Date(item.date) > new Date(latest.date) ? item : latest;
        });
        
        return this.formatEntryDate(latest.date);
    }

    generateGrowBedInfo(systemConfig, plantData) {
        const beds = [];
        const growBedCount = systemConfig.grow_bed_count || 4;
        
        // Get latest data for each crop type
        const cropData = {};
        plantData.forEach(item => {
            if (item.crop_type) {
                if (!cropData[item.crop_type] || new Date(item.date) > new Date(cropData[item.crop_type].date)) {
                    cropData[item.crop_type] = item;
                }
            }
        });
        
        const crops = Object.values(cropData);
        
        for (let i = 1; i <= growBedCount; i++) {
            let bed = {
                number: i,
                status: 'Empty',
                details: 'No plants currently growing'
            };
            
            if (crops[i - 1]) {
                const crop = crops[i - 1];
                bed = {
                    number: i,
                    status: this.getPlantStatus(crop),
                    details: this.getPlantDetails(crop)
                };
            }
            
            beds.push(bed);
        }
        
        return beds;
    }

    getPlantStatus(crop) {
        if (!crop.growth_stage) return 'Growing';
        
        const stage = crop.growth_stage.toLowerCase();
        if (stage.includes('seed') || stage.includes('germination')) return 'Growing';
        if (stage.includes('mature') || stage.includes('ready')) return 'Ready';
        if (crop.health === 'excellent' || crop.health === 'good') return 'Healthy';
        return 'Growing';
    }

    getPlantDetails(crop) {
        const details = [];
        const cropName = crop.crop_type?.charAt(0).toUpperCase() + crop.crop_type?.slice(1);
        
        if (cropName) details.push(`Crop: ${cropName}`);
        if (crop.count) details.push(`Plants: ${crop.count}`);
        if (crop.growth_stage) details.push(`Stage: ${crop.growth_stage}`);
        if (crop.health) details.push(`Health: ${crop.health}`);
        
        return details.join(' • ') || 'No details available';
    }

    generatePlantRecommendations(systemConfig, waterQuality, plantData) {
        const recommendations = [];
        
        // pH recommendations
        if (waterQuality?.ph) {
            if (waterQuality.ph < 6.0) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'pH Too Low',
                    content: 'Current pH is too acidic for most plants. Consider adding potassium hydroxide to raise pH to 6.0-7.0 range for optimal nutrient uptake.'
                });
            } else if (waterQuality.ph > 7.5) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'pH Too High',
                    content: 'Current pH is too alkaline. Consider adding phosphoric acid to lower pH to 6.0-7.0 range for better nutrient availability.'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    title: 'Optimal pH Range',
                    content: 'Your pH level is perfect for plant growth. Most nutrients are readily available at this range.'
                });
            }
        }
        
        // EC/TDS recommendations
        if (waterQuality?.ec) {
            if (waterQuality.ec < 400) {
                recommendations.push({
                    icon: '💡',
                    title: 'Low Nutrient Levels',
                    content: 'EC levels are low. Consider adding balanced hydroponic nutrients to support plant growth and development.'
                });
            } else if (waterQuality.ec > 1500) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Nutrient Concentration',
                    content: 'EC levels are high. Consider diluting with fresh water to prevent nutrient burn and salt buildup.'
                });
            }
        }
        
        // Temperature recommendations
        if (waterQuality?.temperature) {
            if (waterQuality.temperature < 15) {
                recommendations.push({
                    icon: '🌡️',
                    title: 'Cold Water Temperature',
                    content: 'Water temperature is low. Consider adding heating to improve nutrient uptake and growth rates.'
                });
            } else if (waterQuality.temperature > 30) {
                recommendations.push({
                    icon: '🌡️',
                    title: 'High Water Temperature',
                    content: 'Water temperature is high. Ensure adequate ventilation and consider cooling to prevent plant stress.'
                });
            }
        }
        
        // Plant-specific recommendations for aquaponics
        const activeCrops = [...new Set(plantData.map(item => item.crop_type).filter(Boolean))];
        if (activeCrops.length > 0) {
            recommendations.push({
                icon: '🌱',
                title: 'Crop Diversity',
                content: `You're growing ${activeCrops.join(', ')}. Consider mixing leafy greens with fruiting plants to balance nutrient uptake and maximize space efficiency.`
            });
        }
        
        // Growth bed utilization
        const activeGrowBeds = this.getActiveGrowBeds(plantData);
        const totalGrowBeds = systemConfig?.grow_bed_count || 4;
        if (activeGrowBeds < totalGrowBeds) {
            recommendations.push({
                icon: '📈',
                title: 'Expand Production',
                content: `You have ${totalGrowBeds - activeGrowBeds} unused grow beds. Consider planting fast-growing crops like lettuce or herbs to maximize yield.`
            });
        }
        
        // Harvest timing
        const readyPlants = plantData.filter(item => 
            item.growth_stage?.toLowerCase().includes('ready') || 
            item.growth_stage?.toLowerCase().includes('mature')
        );
        if (readyPlants.length > 0) {
            recommendations.push({
                icon: '🥬',
                title: 'Harvest Ready',
                content: `${readyPlants.length} plant entries show mature growth. Harvest soon for optimal quality and to make room for new plantings.`
            });
        }

        // Aquaponics-specific recommendations
        if (waterQuality?.dissolved_oxygen && waterQuality.dissolved_oxygen < 5.0) {
            recommendations.push({
                icon: '💨',
                title: 'Low Dissolved Oxygen',
                content: 'Low oxygen levels can stress both fish and plants. Increase aeration to improve root health and nutrient uptake.'
            });
        }

        // Iron deficiency recommendations
        if (waterQuality?.iron !== null && waterQuality?.iron !== undefined) {
            if (waterQuality.iron < 1.0) {
                recommendations.push({
                    icon: '🔴',
                    title: 'Iron Deficiency Risk',
                    content: 'Iron levels are low (< 1 ppm). Plants may develop yellowing between leaf veins (chlorosis). Consider adding chelated iron supplement to prevent deficiency.'
                });
            } else if (waterQuality.iron > 3.0) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Iron Levels',
                    content: 'Iron levels are high (> 3 ppm). Excessive iron can interfere with other nutrient uptake. Reduce iron supplementation and monitor plant health.'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    title: 'Optimal Iron Levels',
                    content: 'Iron levels are excellent (1-3 ppm). This supports healthy chlorophyll production and vibrant green growth.'
                });
            }
        }

        // Potassium recommendations
        if (waterQuality?.potassium !== null && waterQuality?.potassium !== undefined) {
            if (waterQuality.potassium < 150) {
                recommendations.push({
                    icon: '🍌',
                    title: 'Low Potassium',
                    content: 'Potassium is low (< 150 ppm). This affects fruit development and plant immunity. Add potassium sulfate or increase fish feeding to boost levels.'
                });
            } else if (waterQuality.potassium > 300) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Potassium',
                    content: 'Potassium levels are high (> 300 ppm). While generally not toxic, monitor for potential salt buildup and ensure proper drainage.'
                });
            }
        }

        // Calcium recommendations
        if (waterQuality?.calcium !== null && waterQuality?.calcium !== undefined) {
            if (waterQuality.calcium < 150) {
                recommendations.push({
                    icon: '🦴',
                    title: 'Calcium Deficiency Risk',
                    content: 'Calcium is low (< 150 ppm). Plants may develop tip burn, blossom end rot, or weak stems. Add calcium chloride or crushed eggshells to boost levels.'
                });
            } else if (waterQuality.calcium > 400) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Calcium',
                    content: 'Calcium levels are high (> 400 ppm). This may interfere with magnesium and potassium uptake. Consider diluting with RO water.'
                });
            }
        }

        // Nutrient balance recommendations
        if (waterQuality?.iron && waterQuality?.potassium && waterQuality?.calcium) {
            const ironOptimal = waterQuality.iron >= 1.0 && waterQuality.iron <= 3.0;
            const potassiumOptimal = waterQuality.potassium >= 150 && waterQuality.potassium <= 300;
            const calciumOptimal = waterQuality.calcium >= 150 && waterQuality.calcium <= 400;
            
            if (ironOptimal && potassiumOptimal && calciumOptimal) {
                recommendations.push({
                    icon: '🎯',
                    title: 'Perfect Nutrient Balance',
                    content: 'All measured nutrients (Iron, Potassium, Calcium) are in optimal ranges. Your plants should thrive with these levels!'
                });
            }
        }

        // Plant density recommendations
        const totalPlants = this.calculateTotalPlants(plantData);
        const totalGrowVolume = systemConfig?.total_grow_volume || 800;
        const plantDensity = totalPlants / (totalGrowVolume / 100); // plants per 100L
        
        if (plantDensity > 20) {
            recommendations.push({
                icon: '🌿',
                title: 'High Plant Density',
                content: 'Plant density is high. Consider spacing plants further apart to prevent competition for nutrients and ensure proper air circulation.'
            });
        } else if (plantDensity > 0 && plantDensity < 5) {
            recommendations.push({
                icon: '📈',
                title: 'Low Plant Density',
                content: 'You have room for more plants. Consider adding more leafy greens to maximize nutrient uptake from your fish waste.'
            });
        }

        // System balance recommendation
        const fishData = this.getLatestFishHealthData();
        if (fishData?.count && totalPlants > 0) {
            const fishToPlantRatio = fishData.count / totalPlants;
            if (fishToPlantRatio > 0.5) {
                recommendations.push({
                    icon: '⚖️',
                    title: 'System Balance',
                    content: 'High fish-to-plant ratio detected. Consider adding more plants to better utilize the nutrients produced by your fish.'
                });
            }
        }
        
        return recommendations.length > 0 ? recommendations : [{
            icon: '🌿',
            title: 'Welcome to Plant Management',
            content: 'Start recording plant growth data to receive personalized recommendations for your aquaponics system.'
        }];
    }

    /* Status indicators replaced with charts
    updateStatusIndicators(data) {
        const tempStatus = this.getStatusElement('water-temp');
        const phStatus = this.getStatusElement('ph-level');
        const oxygenStatus = this.getStatusElement('dissolved-oxygen');
        const ammoniaStatus = this.getStatusElement('ammonia');

        if (data.temperature) {
            tempStatus.textContent = this.getTemperatureStatus(data.temperature);
            tempStatus.className = `stat-status ${this.getTemperatureStatusClass(data.temperature)}`;
        } else {
            tempStatus.textContent = 'No data';
            tempStatus.className = 'stat-status';
        }

        if (data.ph) {
            phStatus.textContent = this.getPHStatus(data.ph);
            phStatus.className = `stat-status ${this.getPHStatusClass(data.ph)}`;
        } else {
            phStatus.textContent = 'No data';
            phStatus.className = 'stat-status';
        }

        if (data.dissolved_oxygen) {
            oxygenStatus.textContent = this.getOxygenStatus(data.dissolved_oxygen);
            oxygenStatus.className = `stat-status ${this.getOxygenStatusClass(data.dissolved_oxygen)}`;
        } else {
            oxygenStatus.textContent = 'No data';
            oxygenStatus.className = 'stat-status';
        }

        if (data.ammonia) {
            ammoniaStatus.textContent = this.getAmmoniaStatus(data.ammonia);
            ammoniaStatus.className = `stat-status ${this.getAmmoniaStatusClass(data.ammonia)}`;
        } else {
            ammoniaStatus.textContent = 'No data';
            ammoniaStatus.className = 'stat-status';
        }
    }
    */

    /* 
    setNoDataStatus() {
        const statusElements = [
            this.getStatusElement('water-temp'),
            this.getStatusElement('ph-level'),
            this.getStatusElement('dissolved-oxygen'),
            this.getStatusElement('ammonia')
        ];

        statusElements.forEach(element => {
            element.textContent = 'Enter data';
            element.className = 'stat-status';
        });
    }
    */

    getStatusElement(id) {
        return document.getElementById(id).parentElement.querySelector('.stat-status');
    }

    getTemperatureStatus(temp) {
        if (temp >= 22 && temp <= 26) return 'Optimal';
        if (temp >= 20 && temp <= 28) return 'Good';
        return 'Critical';
    }

    getTemperatureStatusClass(temp) {
        if (temp >= 22 && temp <= 26) return 'good';
        if (temp >= 20 && temp <= 28) return 'warning';
        return 'critical';
    }

    getPHStatus(ph) {
        if (ph >= 6.5 && ph <= 7.5) return 'Optimal';
        if (ph >= 6.0 && ph <= 8.0) return 'Good';
        return 'Critical';
    }

    getPHStatusClass(ph) {
        if (ph >= 6.5 && ph <= 7.5) return 'good';
        if (ph >= 6.0 && ph <= 8.0) return 'warning';
        return 'critical';
    }

    getOxygenStatus(oxygen) {
        if (oxygen >= 6) return 'Excellent';
        if (oxygen >= 4) return 'Good';
        return 'Low';
    }

    getOxygenStatusClass(oxygen) {
        if (oxygen >= 6) return 'good';
        if (oxygen >= 4) return 'warning';
        return 'critical';
    }

    getAmmoniaStatus(ammonia) {
        if (ammonia <= 0.25) return 'Safe';
        if (ammonia <= 0.5) return 'Monitor';
        return 'High';
    }

    getAmmoniaStatusClass(ammonia) {
        if (ammonia <= 0.25) return 'good';
        if (ammonia <= 0.5) return 'warning';
        return 'critical';
    }

    showAlert(title, message) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body: message });
        } else {
            alert(`${title}: ${message}`);
        }
    }

    feedFish() {
        this.lastFeedTime = new Date();
        this.updateLastFeedTime();
        
        const feedButton = document.getElementById('feed-fish');
        const originalText = feedButton.textContent;
        feedButton.textContent = 'Fish Fed! 🐟';
        feedButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
        
        setTimeout(() => {
            feedButton.textContent = originalText;
            feedButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
        }, 2000);
    }

    updateLastFeedTime() {
        const timeElement = document.querySelector('.time');
        if (timeElement) {
            const now = new Date();
            const diff = Math.floor((now - this.lastFeedTime) / (1000 * 60 * 60));
            timeElement.textContent = diff === 0 ? 'Just now' : `${diff} hours ago`;
        }
    }

    updateSettings() {
        const settings = {
            tempAlerts: document.getElementById('temp-alerts').checked,
            phAlerts: document.getElementById('ph-alerts').checked,
            autoFeed: document.getElementById('auto-feed').checked,
            autoLights: document.getElementById('auto-lights').checked
        };
        
        localStorage.setItem('aquaponicsSettings', JSON.stringify(settings));
        console.log('Settings updated:', settings);
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('aquaponicsSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('temp-alerts').checked = settings.tempAlerts ?? true;
            document.getElementById('ph-alerts').checked = settings.phAlerts ?? true;
            document.getElementById('auto-feed').checked = settings.autoFeed ?? true;
            document.getElementById('auto-lights').checked = settings.autoLights ?? true;
        }
    }

    initializeFishCalculator() {
        const fishCalculatorDiv = document.getElementById('fish-calc');
        const systemConfig = this.loadSystemConfig();
        const tankVolumeL = systemConfig.total_fish_volume || 1000;
        const tankVolumeM3 = (tankVolumeL / 1000).toFixed(1);
        
        fishCalculatorDiv.innerHTML = `
            <div class="calc-section">
                <h3>Tank Specifications</h3>
                <div class="input-group">
                    <label for="tank-volume">Tank Volume (m³):</label>
                    <input type="number" id="tank-volume" min="0.1" step="0.1" placeholder="Enter tank volume" value="${tankVolumeM3}">
                </div>
                <div class="input-group">
                    <label for="fish-type">Fish Species:</label>
                    <select id="fish-type">
                        <option value="">Select Fish Species</option>
                        <option value="tilapia">🐟 Tilapia</option>
                        <option value="trout">🎣 Trout</option>
                        <option value="catfish">🐡 Catfish</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="stocking-density">Stocking Density (kg/m³):</label>
                    <input type="number" id="stocking-density" min="1" step="1" placeholder="Recommended density">
                </div>
                <div class="input-group">
                    <label for="fingerling-weight">Fingerling Weight (grams):</label>
                    <input type="number" id="fingerling-weight" min="1" step="1" placeholder="Initial fish weight">
                </div>
                <div class="input-group">
                    <label for="harvest-weight">Desired Harvest Weight (grams):</label>
                    <input type="number" id="harvest-weight" min="1" step="1" placeholder="Target harvest weight">
                </div>
                <button class="calc-btn" id="calculate-stocking">Calculate Stocking Plan</button>
                <button class="calc-btn" id="clear-fish-calc">Clear All</button>
            </div>
            <div class="results-section" id="fish-results" style="display: none;">
                <h3>Stocking Results</h3>
                <div id="stocking-summary"></div>
                <div id="growth-chart-container"></div>
                <div id="feeding-recommendations"></div>
            </div>
        `;

        // Set up event listeners for fish calculator
        document.getElementById('fish-type').addEventListener('change', this.updateFishDefaults.bind(this));
        document.getElementById('calculate-stocking').addEventListener('click', this.calculateStocking.bind(this));
        document.getElementById('clear-fish-calc').addEventListener('click', this.clearFishCalculator.bind(this));
        
        // Prepopulate system info display and fish type
        this.updateFishCalculatorSystemInfo();
        
        // Auto-select fish type from system configuration
        if (systemConfig.fish_type && systemConfig.system_name !== 'No System Selected') {
            document.getElementById('fish-type').value = systemConfig.fish_type;
            this.updateFishDefaults();
        }
    }

    updateFishCalculatorSystemInfo() {
        const systemConfig = this.loadSystemConfig();
        
        // Find or create system info container
        let systemInfoContainer = document.getElementById('fish-calc-system-info');
        if (!systemInfoContainer) {
            systemInfoContainer = document.createElement('div');
            systemInfoContainer.id = 'fish-calc-system-info';
            systemInfoContainer.className = 'calc-section';
            
            // Insert before tank specifications
            const calcSection = document.querySelector('#fish-calc .calc-section');
            calcSection.parentNode.insertBefore(systemInfoContainer, calcSection);
        }
        
        if (this.activeSystemId && systemConfig.system_name !== 'No System Selected') {
            systemInfoContainer.innerHTML = `
                <h3>System Information</h3>
                <div class="system-info-display">
                    <div class="info-row">
                        <span><strong>System:</strong> ${systemConfig.system_name}</span>
                        <span><strong>Type:</strong> ${systemConfig.system_type.toUpperCase()}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Fish Tanks:</strong> ${systemConfig.fish_tank_count} (${systemConfig.total_fish_volume}L total)</span>
                        <span><strong>Grow Beds:</strong> ${systemConfig.grow_bed_count} (${systemConfig.total_grow_volume}L total)</span>
                    </div>
                </div>
            `;
        } else {
            systemInfoContainer.innerHTML = `
                <div class="calc-section">
                    <h3>⚠️ No System Selected</h3>
                    <p style="text-align: center; color: #e67e22; margin: 1rem 0;">
                        Please select or create a system to get prepopulated values.
                    </p>
                    <button class="calc-btn" onclick="app.goToSettings()" style="display: block; margin: 1rem auto;">
                        Go to Settings
                    </button>
                </div>
            `;
        }
    }

    updateFishDefaults() {
        const fishType = document.getElementById('fish-type').value;
        if (fishType && this.fishData[fishType]) {
            const fish = this.fishData[fishType];
            document.getElementById('stocking-density').value = fish.defaultDensity;
            document.getElementById('fingerling-weight').value = fish.defaultFingerlingWeight;
            document.getElementById('harvest-weight').value = fish.harvestWeight;
        }
    }

    calculateStocking() {
        const tankVolume = parseFloat(document.getElementById('tank-volume').value);
        const fishType = document.getElementById('fish-type').value;
        const stockingDensity = parseFloat(document.getElementById('stocking-density').value);
        const fingerlingWeight = parseFloat(document.getElementById('fingerling-weight').value);
        const harvestWeight = parseFloat(document.getElementById('harvest-weight').value);

        if (!tankVolume || !fishType || !stockingDensity || !fingerlingWeight || !harvestWeight) {
            this.showNotification('📝 Please fill in all fields.', 'warning');
            return;
        }

        const fish = this.fishData[fishType];
        const harvestWeightKg = harvestWeight / 1000;
        const numberOfFish = Math.floor((tankVolume * stockingDensity) / harvestWeightKg);
        const initialBiomass = (numberOfFish * fingerlingWeight) / 1000;
        const harvestBiomass = (numberOfFish * harvestWeight) / 1000;
        const totalFeedRequired = harvestBiomass * fish.feedConversionRatio;

        this.displayStockingResults(fish, tankVolume, numberOfFish, initialBiomass, harvestBiomass, totalFeedRequired, harvestWeight);
        document.getElementById('fish-results').style.display = 'block';
    }

    displayStockingResults(fish, tankVolume, numberOfFish, initialBiomass, harvestBiomass, totalFeedRequired, harvestWeight) {
        const summaryDiv = document.getElementById('stocking-summary');
        summaryDiv.innerHTML = `
            <div class="summary-card">
                <h4>${fish.icon} ${fish.name} Stocking Plan</h4>
                <div class="stats-row">
                    <div class="stat-item">
                        <strong>Tank Volume:</strong> ${tankVolume} m³
                    </div>
                    <div class="stat-item">
                        <strong>Number of Fish:</strong> ${numberOfFish.toLocaleString()} fingerlings
                    </div>
                    <div class="stat-item">
                        <strong>Initial Biomass:</strong> ${initialBiomass.toFixed(1)} kg
                    </div>
                    <div class="stat-item">
                        <strong>Final Harvest Biomass:</strong> ${harvestBiomass.toFixed(1)} kg
                    </div>
                    <div class="stat-item">
                        <strong>Growth Period:</strong> ${fish.growthPeriod} weeks
                    </div>
                    <div class="stat-item">
                        <strong>Total Feed Required:</strong> ${totalFeedRequired.toFixed(1)} kg
                    </div>
                </div>
            </div>
        `;

        // Display growth chart
        this.displayGrowthChart(fish, numberOfFish, harvestWeight);
    }

    displayGrowthChart(fish, numberOfFish, harvestWeight) {
        const chartDiv = document.getElementById('growth-chart-container');
        let chartHTML = `
            <h4>Growth Chart & Feeding Schedule</h4>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Week</th>
                        <th>Avg Weight (g)</th>
                        <th>Total Biomass (kg)</th>
                        <th>Feed Rate (%)</th>
                        <th>Daily Feed/Fish (g)</th>
                        <th>Total Daily Feed (kg)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const growthFactor = harvestWeight / fish.harvestWeight;
        fish.growthData.forEach(data => {
            const adjustedWeight = Math.round(data.weight * growthFactor);
            const totalBiomass = (numberOfFish * adjustedWeight) / 1000;
            const adjustedFeedAmount = Math.round(data.feedAmount * growthFactor);
            const totalDailyFeed = (numberOfFish * adjustedFeedAmount) / 1000;

            chartHTML += `
                <tr>
                    <td>${data.week}</td>
                    <td>${adjustedWeight}g</td>
                    <td>${totalBiomass.toFixed(1)} kg</td>
                    <td>${data.feedRate}%</td>
                    <td>${adjustedFeedAmount}g</td>
                    <td>${totalDailyFeed.toFixed(2)} kg</td>
                </tr>
            `;
        });

        chartHTML += `
                </tbody>
            </table>
        `;

        chartDiv.innerHTML = chartHTML;
    }

    clearFishCalculator() {
        const systemConfig = this.loadSystemConfig();
        const tankVolumeM3 = systemConfig.total_fish_volume ? (systemConfig.total_fish_volume / 1000).toFixed(1) : '';
        
        document.getElementById('tank-volume').value = tankVolumeM3;
        
        // Reset to system's fish type if available
        if (systemConfig.fish_type && systemConfig.system_name !== 'No System Selected') {
            document.getElementById('fish-type').value = systemConfig.fish_type;
            this.updateFishDefaults();
        } else {
            document.getElementById('fish-type').value = '';
            document.getElementById('stocking-density').value = '';
            document.getElementById('fingerling-weight').value = '';
            document.getElementById('harvest-weight').value = '';
        }
        
        document.getElementById('fish-results').style.display = 'none';
        this.updateFishCalculatorSystemInfo();
    }

    async initializeDataEntryForms() {
        // Load latest data for preloading
        await this.loadLatestDataForPreloading();
        
        this.initializeWaterQualityForm();
        this.initializeFishHealthForm();
        await this.initializePlantGrowthForm();
        this.initializeOperationsForm();
    }

    async loadLatestDataForPreloading() {
        if (!this.activeSystemId) return;
        
        try {
            this.latestData = await this.makeApiCall(`/data/latest/${this.activeSystemId}`);
        } catch (error) {
            console.error('Error loading latest data for preloading:', error);
            this.latestData = {};
        }
    }

    initializeWaterQualityForm() {
        const formDiv = document.querySelector('#water-quality-form .data-entry-section');
        formDiv.innerHTML = `
            <div class="form-section">
                <h3>Water Quality Parameters</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="wq-date">Date & Time:</label>
                        <input type="datetime-local" id="wq-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="wq-ph">pH Level:</label>
                        <input type="number" id="wq-ph" min="0" max="14" step="0.1" placeholder="6.0 - 8.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-ec">EC/TDS (ppm):</label>
                        <input type="number" id="wq-ec" min="0" step="10" placeholder="400 - 1200">
                    </div>
                    <div class="form-field">
                        <label for="wq-do">Dissolved Oxygen (mg/L):</label>
                        <input type="number" id="wq-do" min="0" step="0.1" placeholder="5.0 - 8.0">
                    </div>
                    <div class="form-field">
                        <label for="wq-temp">Water Temperature (°C):</label>
                        <input type="number" id="wq-temp" min="0" step="0.1" placeholder="18 - 30">
                    </div>
                    <div class="form-field">
                        <label for="wq-ammonia">Ammonia NH₃ (ppm):</label>
                        <input type="number" id="wq-ammonia" min="0" step="0.01" placeholder="< 0.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-nitrite">Nitrite NO₂ (ppm):</label>
                        <input type="number" id="wq-nitrite" min="0" step="0.01" placeholder="< 0.5">
                    </div>
                    <div class="form-field">
                        <label for="wq-nitrate">Nitrate NO₃ (ppm):</label>
                        <input type="number" id="wq-nitrate" min="0" step="1" placeholder="10 - 150">
                    </div>
                    <div class="form-field">
                        <label for="wq-iron">Iron Fe (ppm):</label>
                        <input type="number" id="wq-iron" min="0" step="0.1" placeholder="1 - 3">
                    </div>
                    <div class="form-field">
                        <label for="wq-potassium">Potassium K (ppm):</label>
                        <input type="number" id="wq-potassium" min="0" step="1" placeholder="150 - 300">
                    </div>
                    <div class="form-field">
                        <label for="wq-calcium">Calcium Ca (ppm):</label>
                        <input type="number" id="wq-calcium" min="0" step="1" placeholder="150 - 400">
                    </div>
                    <div class="form-field">
                        <label for="wq-phosphorus">Phosphorus P (ppm):</label>
                        <input type="number" id="wq-phosphorus" min="0" step="0.1" placeholder="5 - 20">
                    </div>
                    <div class="form-field">
                        <label for="wq-magnesium">Magnesium Mg (ppm):</label>
                        <input type="number" id="wq-magnesium" min="0" step="0.1" placeholder="10 - 30">
                    </div>
                </div>
                <div class="form-field">
                    <label for="wq-notes">Notes:</label>
                    <textarea id="wq-notes" placeholder="Additional observations..."></textarea>
                </div>
                <button class="form-btn" onclick="app.saveWaterQualityData()">Save Water Quality Data</button>
            </div>
        `;
        
        // Preload data from latest entry
        this.preloadWaterQualityData();
    }

    initializeFishHealthForm() {
        const formDiv = document.querySelector('#fish-health-form .data-entry-section');
        const systemConfig = this.loadSystemConfig();
        
        // Generate tank options based on system configuration
        let tankOptions = '';
        if (systemConfig && systemConfig.system_name !== 'No System Selected') {
            for (let i = 1; i <= (systemConfig.fish_tank_count || 1); i++) {
                tankOptions += `<option value="${i}">Tank ${i}</option>`;
            }
        } else {
            tankOptions = '<option value="1">Tank 1</option>';
        }
        
        formDiv.innerHTML = `
            <div class="form-section">
                <h3>Fish Health Metrics</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="fh-date">Date & Time:</label>
                        <input type="datetime-local" id="fh-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="fh-tank">Select Fish Tank:</label>
                        <select id="fh-tank" required>
                            ${tankOptions}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="fh-count">Fish Count:</label>
                        <input type="number" id="fh-count" min="0" step="1" placeholder="Total number of fish in this tank">
                    </div>
                    <div class="form-field">
                        <label for="fh-mortality">Mortality Count:</label>
                        <input type="number" id="fh-mortality" min="0" step="1" placeholder="Fish deaths since last check">
                    </div>
                    <div class="form-field">
                        <label for="fh-weight">Average Fish Weight (g):</label>
                        <input type="number" id="fh-weight" min="0" step="1" placeholder="Sample weight">
                    </div>
                    <div class="form-field">
                        <label for="fh-feed">Feed Consumption/Day (kg):</label>
                        <input type="number" id="fh-feed" min="0" step="0.1" placeholder="Daily feed amount">
                    </div>
                    <div class="form-field">
                        <label for="fh-behavior">Fish Behavior:</label>
                        <select id="fh-behavior">
                            <option value="normal">Normal - Active feeding</option>
                            <option value="sluggish">Sluggish - Slow movement</option>
                            <option value="stressed">Stressed - Erratic swimming</option>
                            <option value="diseased">Signs of disease</option>
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label for="fh-notes">Health Observations:</label>
                    <textarea id="fh-notes" placeholder="Disease symptoms, unusual behavior, etc..."></textarea>
                </div>
                <button class="form-btn" onclick="app.saveFishHealthData()">Save Fish Health Data</button>
            </div>
        `;
        
        // Preload data from latest entry
        this.preloadFishHealthData();
    }

    async initializePlantGrowthForm() {
        const formDiv = document.querySelector('#plant-growth-form .data-entry-section');
        
        // Get system configuration to populate grow bed options
        const systemConfig = this.loadSystemConfig();
        let growBedOptions = '<option value="">Select Grow Bed</option>';
        
        try {
            // Load grow beds from the database
            const growBeds = await this.getGrowBedsForSystem();
            growBeds.forEach(bed => {
                const bedTypeName = bed.bed_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                growBedOptions += `<option value="${bed.id}">Bed ${bed.bed_number} - ${bedTypeName}</option>`;
            });
        } catch (error) {
            console.error('Error loading grow beds:', error);
            // Fallback if error loading grow beds
            for (let i = 1; i <= 4; i++) {
                growBedOptions += `<option value="${i}">Bed ${i} - Media Bed</option>`;
            }
        }
        
        formDiv.innerHTML = `
            <div class="form-section">
                <h3>Plant Growth Data</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="pg-date">Date & Time:</label>
                        <input type="datetime-local" id="pg-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="pg-grow-bed">Grow Bed:</label>
                        <select id="pg-grow-bed" required>
                            ${growBedOptions}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="pg-crop">Crop Type:</label>
                        <select id="pg-crop">
                            <option value="lettuce">Lettuce</option>
                            <option value="basil">Basil</option>
                            <option value="spinach">Spinach</option>
                            <option value="kale">Kale</option>
                            <option value="tomatoes">Tomatoes</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="pg-count">Plant Count:</label>
                        <input type="number" id="pg-count" min="0" step="1" placeholder="Number of plants">
                    </div>
                    <div class="form-field">
                        <label for="pg-harvest-weight">Harvest Weight (kg):</label>
                        <input type="number" id="pg-harvest-weight" min="0" step="0.1" placeholder="If harvesting">
                    </div>
                    <div class="form-field">
                        <label for="pg-plants-harvested"># Plants Harvested:</label>
                        <input type="number" id="pg-plants-harvested" min="0" step="1" placeholder="Number harvested">
                    </div>
                    <div class="form-field">
                        <label for="pg-new-seedlings">New Seedlings Transplanted:</label>
                        <input type="number" id="pg-new-seedlings" min="0" step="1" placeholder="Number transplanted">
                    </div>
                    <div class="form-field">
                        <label for="pg-pest-control">Pest Control Applied:</label>
                        <input type="text" id="pg-pest-control" placeholder="e.g., Neem oil, Bacillus thuringiensis">
                    </div>
                    <div class="form-field">
                        <label for="pg-health">Plant Health:</label>
                        <select id="pg-health">
                            <option value="excellent">Excellent - Vigorous growth</option>
                            <option value="good">Good - Healthy appearance</option>
                            <option value="fair">Fair - Some issues</option>
                            <option value="poor">Poor - Stressed/diseased</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="pg-stage">Growth Stage:</label>
                        <select id="pg-stage">
                            <option value="seedling">Seedling</option>
                            <option value="vegetative">Vegetative growth</option>
                            <option value="flowering">Flowering</option>
                            <option value="fruiting">Fruiting</option>
                            <option value="harvest">Ready for harvest</option>
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label for="pg-notes">Growth Observations:</label>
                    <textarea id="pg-notes" placeholder="Pest issues, nutrient deficiencies, etc..."></textarea>
                </div>
                <button class="form-btn" onclick="app.savePlantGrowthData()">Save Plant Growth Data</button>
            </div>
        `;
        
        // Preload data from latest entry
        this.preloadPlantGrowthData();
    }

    async getGrowBedsForSystem() {
        const systemConfig = this.loadSystemConfig();
        
        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            // Fallback to default grow beds
            return Array.from({length: 4}, (_, i) => ({
                id: i + 1,
                bed_number: i + 1,
                bed_type: 'media-bed'
            }));
        }

        try {
            const response = await fetch(`/api/grow-beds/system/${systemConfig.system_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const growBeds = await response.json();
                return growBeds.length > 0 ? growBeds : [
                    // Default fallback if no grow beds configured
                    ...Array.from({length: systemConfig.grow_bed_count || 4}, (_, i) => ({
                        id: i + 1,
                        bed_number: i + 1,
                        bed_type: 'media-bed'
                    }))
                ];
            } else {
                console.error('Failed to fetch grow beds:', response.statusText);
                // Fallback to system config
                return Array.from({length: systemConfig.grow_bed_count || 4}, (_, i) => ({
                    id: i + 1,
                    bed_number: i + 1,
                    bed_type: 'media-bed'
                }));
            }
        } catch (error) {
            console.error('Error fetching grow beds:', error);
            // Fallback to system config
            return Array.from({length: systemConfig.grow_bed_count || 4}, (_, i) => ({
                id: i + 1,
                bed_number: i + 1,
                bed_type: 'media-bed'
            }));
        }
    }

    initializeOperationsForm() {
        const formDiv = document.querySelector('#operations-form .data-entry-section');
        formDiv.innerHTML = `
            <div class="form-section">
                <h3>System Operations</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="ops-date">Date & Time:</label>
                        <input type="datetime-local" id="ops-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                    <div class="form-field">
                        <label for="ops-type">Operation Type:</label>
                        <select id="ops-type">
                            <option value="water-change">Water Change</option>
                            <option value="maintenance">Equipment Maintenance</option>
                            <option value="chemical-addition">Chemical Addition</option>
                            <option value="system-failure">System Failure</option>
                            <option value="cleaning">System Cleaning</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="ops-volume">Water Volume Changed (L):</label>
                        <input type="number" id="ops-volume" min="0" step="1" placeholder="If water change">
                    </div>
                    <div class="form-field">
                        <label for="ops-chemical">Chemical Added:</label>
                        <input type="text" id="ops-chemical" placeholder="pH adjuster, nutrients, etc.">
                    </div>
                    <div class="form-field">
                        <label for="ops-amount">Amount Added:</label>
                        <input type="text" id="ops-amount" placeholder="Quantity and units">
                    </div>
                    <div class="form-field">
                        <label for="ops-duration">Downtime Duration (hours):</label>
                        <input type="number" id="ops-duration" min="0" step="0.1" placeholder="If system was down">
                    </div>
                </div>
                <div class="form-field">
                    <label for="ops-notes">Operation Details:</label>
                    <textarea id="ops-notes" placeholder="Detailed description of the operation..."></textarea>
                </div>
                <button class="form-btn" onclick="app.saveOperationsData()">Save Operations Data</button>
            </div>
        `;
    }

    async loadDataRecords() {
        if (!this.activeSystemId) {
            this.dataRecords = {
                waterQuality: [],
                fishHealth: [],
                plantGrowth: [],
                operations: []
            };
            return;
        }

        try {
            const [waterQuality, fishHealth, plantGrowth, operations] = await Promise.all([
                this.makeApiCall(`/data/water-quality/${this.activeSystemId}`),
                this.makeApiCall(`/data/fish-health/${this.activeSystemId}`),
                this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`),
                this.makeApiCall(`/data/operations/${this.activeSystemId}`)
            ]);

            this.dataRecords = {
                waterQuality,
                fishHealth,
                plantGrowth,
                operations
            };
        } catch (error) {
            console.error('Failed to load data records:', error);
            this.dataRecords = {
                waterQuality: [],
                fishHealth: [],
                plantGrowth: [],
                operations: []
            };
        }
    }

    async saveWaterQualityData() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('wq-date').value,
            ph: parseFloat(document.getElementById('wq-ph').value) || null,
            ec: parseFloat(document.getElementById('wq-ec').value) || null,
            dissolved_oxygen: parseFloat(document.getElementById('wq-do').value) || null,
            temperature: parseFloat(document.getElementById('wq-temp').value) || null,
            ammonia: parseFloat(document.getElementById('wq-ammonia').value) || null,
            nitrite: parseFloat(document.getElementById('wq-nitrite').value) || null,
            nitrate: parseFloat(document.getElementById('wq-nitrate').value) || null,
            iron: parseFloat(document.getElementById('wq-iron').value) || null,
            potassium: parseFloat(document.getElementById('wq-potassium').value) || null,
            calcium: parseFloat(document.getElementById('wq-calcium').value) || null,
            phosphorus: parseFloat(document.getElementById('wq-phosphorus').value) || null,
            magnesium: parseFloat(document.getElementById('wq-magnesium').value) || null,
            notes: document.getElementById('wq-notes').value
        };

        try {
            await this.makeApiCall(`/data/water-quality/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            // Reload data and update dashboard
            await this.loadDataRecords();
            this.updateDashboardFromData();
            
            this.showNotification('💧 Water quality data saved successfully! Dashboard updated.', 'success');
            this.clearForm('water-quality');
        } catch (error) {
            console.error('Failed to save water quality data:', error);
            this.showNotification('❌ Failed to save water quality data. Please try again.', 'error');
        }
    }

    async saveFishHealthData() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('fh-date').value,
            fish_tank_id: parseInt(document.getElementById('fh-tank').value),
            count: parseInt(document.getElementById('fh-count').value),
            mortality: parseInt(document.getElementById('fh-mortality').value),
            average_weight: parseFloat(document.getElementById('fh-weight').value),
            feed_consumption: parseFloat(document.getElementById('fh-feed').value),
            behavior: document.getElementById('fh-behavior').value,
            notes: document.getElementById('fh-notes').value
        };

        try {
            await this.makeApiCall(`/data/fish-health/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            await this.loadDataRecords();
            this.showNotification('🐟 Fish health data saved successfully!', 'success');
            this.clearForm('fish-health');
        } catch (error) {
            console.error('Failed to save fish health data:', error);
            this.showNotification('❌ Failed to save fish health data. Please try again.', 'error');
        }
    }

    async savePlantGrowthData() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('pg-date').value,
            crop_type: document.getElementById('pg-crop').value,
            count: parseInt(document.getElementById('pg-count').value),
            harvest_weight: parseFloat(document.getElementById('pg-harvest-weight').value),
            plants_harvested: parseInt(document.getElementById('pg-plants-harvested').value) || null,
            new_seedlings: parseInt(document.getElementById('pg-new-seedlings').value) || null,
            pest_control: document.getElementById('pg-pest-control').value,
            health: document.getElementById('pg-health').value,
            growth_stage: document.getElementById('pg-stage').value,
            notes: document.getElementById('pg-notes').value
        };

        try {
            await this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            await this.loadDataRecords();
            this.showNotification('🌱 Plant growth data saved successfully!', 'success');
            this.clearForm('plant-growth');
        } catch (error) {
            console.error('Failed to save plant growth data:', error);
            this.showNotification('❌ Failed to save plant growth data. Please try again.', 'error');
        }
    }

    async saveOperationsData() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('ops-date').value,
            operation_type: document.getElementById('ops-type').value,
            water_volume: parseFloat(document.getElementById('ops-volume').value),
            chemical_added: document.getElementById('ops-chemical').value,
            amount_added: document.getElementById('ops-amount').value,
            downtime_duration: parseFloat(document.getElementById('ops-duration').value),
            notes: document.getElementById('ops-notes').value
        };

        try {
            await this.makeApiCall(`/data/operations/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            await this.loadDataRecords();
            this.showNotification('⚙️ Operations data saved successfully!', 'success');
            this.clearForm('operations');
        } catch (error) {
            console.error('Failed to save operations data:', error);
            this.showNotification('❌ Failed to save operations data. Please try again.', 'error');
        }
    }

    clearForm(formType) {
        const formElements = document.querySelectorAll(`#${formType}-form input, #${formType}-form select, #${formType}-form textarea`);
        formElements.forEach(element => {
            if (element.type === 'datetime-local') {
                element.value = new Date().toISOString().slice(0, 16);
            } else if (element.id === 'fh-tank') {
                // Reset fish tank selector to first tank
                element.selectedIndex = 0;
            } else {
                element.value = '';
            }
        });
    }

    // These methods are now handled by API calls in loadUserData()

    getActiveSystem() {
        return this.activeSystemId ? this.systems[this.activeSystemId] : null;
    }

    setupSystemSelector() {
        const systemSelect = document.getElementById('active-system');
        const addSystemBtn = document.getElementById('add-system-btn');

        // Populate system dropdown
        this.updateSystemSelector();

        // Add event listeners
        systemSelect.addEventListener('change', (e) => {
            this.switchToSystem(e.target.value);
        });

        addSystemBtn.addEventListener('click', () => {
            this.showAddSystemDialog();
        });
    }

    updateSystemSelector() {
        const systemSelect = document.getElementById('active-system');
        systemSelect.innerHTML = '<option value="">No system selected</option>';

        Object.keys(this.systems).forEach(systemId => {
            const system = this.systems[systemId];
            const option = document.createElement('option');
            option.value = systemId;
            option.textContent = system.system_name;
            if (systemId === this.activeSystemId) {
                option.selected = true;
            }
            systemSelect.appendChild(option);
        });
    }

    async switchToSystem(systemId) {
        if (systemId === '') {
            this.activeSystemId = null;
        } else {
            this.activeSystemId = systemId;
        }
        
        // Update the system selector dropdown to reflect the change
        this.updateSystemSelector();
        
        await this.loadDataRecords(); // Reload data for new system
        this.updateDashboardFromData();
        this.updateCurrentSystemDisplay(); // Update system name on all tabs
        this.initializeNutrientCalculator();
        this.initializeFishCalculator(); // Refresh fish calculator with new system data
        this.initializeDataEntryForms(); // Refresh data entry forms including fish health
        this.loadSystemManagement();
    }

    showAddSystemDialog() {
        const systemName = prompt('Enter system name:', 'New Aquaponics System');
        if (systemName) {
            this.createNewSystem(systemName);
        }
    }

    async createNewSystem(systemName) {
        const systemId = 'system_' + Date.now();
        const defaultSystem = {
            id: systemId,
            system_name: systemName,
            system_type: 'media-bed',
            fish_type: 'tilapia',
            fish_tank_count: 1,
            total_fish_volume: 1000,
            grow_bed_count: 4,
            total_grow_volume: 800
        };

        try {
            const createdSystem = await this.makeApiCall('/systems', {
                method: 'POST',
                body: JSON.stringify(defaultSystem)
            });

            this.systems[systemId] = createdSystem;
            this.updateSystemSelector();
            
            // Switch to the new system
            await this.switchToSystem(systemId);
            
            // Redirect to settings to configure the new system
            this.goToSettings();
            this.showNotification(`🏗️ System "${systemName}" created! Please configure the details in Settings.`, 'success');
        } catch (error) {
            console.error('Failed to create system:', error);
            this.showNotification('❌ Failed to create system. Please try again.', 'error');
        }
    }

    async deleteSystem(systemId) {
        if (Object.keys(this.systems).length <= 1) {
            this.showNotification('⚠️ Cannot delete the last system. You must have at least one system.', 'warning');
            return;
        }

        const system = this.systems[systemId];
        if (confirm(`Are you sure you want to delete system "${system.system_name}"? This will also delete all associated data.`)) {
            try {
                await this.makeApiCall(`/systems/${systemId}`, { method: 'DELETE' });
                
                delete this.systems[systemId];
                
                // If this was the active system, switch to another one
                if (this.activeSystemId === systemId) {
                    const remainingSystems = Object.keys(this.systems);
                    await this.switchToSystem(remainingSystems.length > 0 ? remainingSystems[0] : '');
                }
                
                this.updateSystemSelector();
                this.loadSystemManagement();
                this.showNotification('🗑️ System deleted successfully.', 'success');
            } catch (error) {
                console.error('Failed to delete system:', error);
                this.showNotification('❌ Failed to delete system. Please try again.', 'error');
            }
        }
    }

    loadSystemConfig() {
        const activeSystem = this.getActiveSystem();
        return activeSystem || {
            system_name: 'No System Selected',
            system_type: 'media-bed',
            fish_type: 'tilapia',
            fish_tank_count: 1,
            total_fish_volume: 1000,
            grow_bed_count: 4,
            total_grow_volume: 800
        };
    }

    async saveSystemConfig() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select or create a system first.', 'warning');
            return;
        }

        const config = {
            system_name: document.getElementById('system-name').value || 'My Aquaponics System',
            system_type: document.getElementById('system-type-config').value,
            fish_type: document.getElementById('fish-type-config').value,
            fish_tank_count: parseInt(document.getElementById('fish-tank-count').value) || 1,
            total_fish_volume: parseFloat(document.getElementById('total-fish-volume').value) || 1000,
            grow_bed_count: parseInt(document.getElementById('grow-bed-count').value) || 4,
            total_grow_volume: parseFloat(document.getElementById('total-grow-volume').value) || 800,
            total_grow_area: parseFloat(document.getElementById('total-grow-area').value) || 2.0
        };

        try {
            const updatedSystem = await this.makeApiCall(`/systems/${this.activeSystemId}`, {
                method: 'PUT',
                body: JSON.stringify(config)
            });

            // Save grow bed configuration
            await this.saveGrowBedConfiguration();
            
            this.systems[this.activeSystemId] = updatedSystem;
            this.updateSystemSelector(); // Update dropdown with new name
            this.updateCurrentSystemDisplay(); // Update system name on all tabs
            
            // Reload the grow bed configuration to show saved values
            await this.loadGrowBedConfiguration();
            
            this.showNotification('⚙️ System configuration saved successfully!', 'success');
            
            // Refresh calculators and forms with new system data
            this.initializeNutrientCalculator();
            this.initializeFishCalculator();
            this.initializeDataEntryForms(); // Refresh forms including fish health tank selector
        } catch (error) {
            console.error('Failed to save system config:', error);
            this.showNotification('❌ Failed to save system configuration. Please try again.', 'error');
        }
    }

    loadSystemManagement() {
        this.loadSystemConfigToForm();
        this.displaySystemsList();
        this.displayGrowBedStatus();
    }

    loadSystemConfigToForm() {
        const activeSystem = this.getActiveSystem();
        if (activeSystem) {
            document.getElementById('system-name').value = activeSystem.system_name;
            document.getElementById('system-type-config').value = activeSystem.system_type;
            document.getElementById('fish-type-config').value = activeSystem.fish_type || 'tilapia';
            document.getElementById('fish-tank-count').value = activeSystem.fish_tank_count;
            document.getElementById('total-fish-volume').value = activeSystem.total_fish_volume;
            document.getElementById('grow-bed-count').value = activeSystem.grow_bed_count;
            document.getElementById('total-grow-volume').value = activeSystem.total_grow_volume;
            document.getElementById('total-grow-area').value = activeSystem.total_grow_area || 2.0;
            
            // Load grow bed configuration
            this.loadGrowBedConfiguration();
        } else {
            // Clear form if no system selected
            document.getElementById('system-name').value = '';
            document.getElementById('system-type-config').value = 'media-bed';
            document.getElementById('fish-type-config').value = 'tilapia';
            document.getElementById('fish-tank-count').value = '1';
            document.getElementById('total-fish-volume').value = '';
            document.getElementById('grow-bed-count').value = '4';
            document.getElementById('total-grow-volume').value = '';
            document.getElementById('total-grow-area').value = '';
        }
    }

    displaySystemsList() {
        // Find or create systems list container
        let systemsListContainer = document.getElementById('systems-list-container');
        if (!systemsListContainer) {
            systemsListContainer = document.createElement('div');
            systemsListContainer.id = 'systems-list-container';
            
            // Insert after system configuration section
            const systemConfigSection = document.querySelector('.form-section');
            systemConfigSection.parentNode.insertBefore(systemsListContainer, systemConfigSection.nextSibling);
        }

        systemsListContainer.innerHTML = `
            <div class="form-section">
                <h3>Manage Systems</h3>
                <div class="systems-list">
                    ${Object.keys(this.systems).length === 0 ? 
                        '<p style="text-align: center; color: #666;">No systems created yet. Click "+ Add System" to create your first system.</p>' :
                        Object.keys(this.systems).map(systemId => {
                            const system = this.systems[systemId];
                            const isActive = systemId === this.activeSystemId;
                            return `
                                <div class="system-item ${isActive ? 'active' : ''}" data-system-id="${systemId}">
                                    <div class="system-info">
                                        <h4>${system.system_name} ${isActive ? '(Active)' : ''}</h4>
                                        <p>Type: ${system.system_type} | Fish: ${this.fishData[system.fish_type]?.icon || '🐟'} ${this.fishData[system.fish_type]?.name || system.fish_type}</p>
                                        <p>Tanks: ${system.total_fish_volume}L | Grow Beds: ${system.total_grow_volume}L</p>
                                        <small>Created: ${new Date(system.created_at).toLocaleDateString()}</small>
                                    </div>
                                    <div class="system-actions">
                                        ${!isActive ? `<button class="form-btn" onclick="app.switchToSystem('${systemId}')">Switch To</button>` : ''}
                                        <button class="form-btn" onclick="app.deleteSystem('${systemId}')" style="background: #dc3545;">Delete</button>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }

    initializeNutrientCalculator() {
        // Just initialize the hydroponic dosing calculator - the HTML is already in place
        setTimeout(() => {
            this.initializeHydroponicDosingCalculator();
        }, 100);
    }

    goToSettings() {
        // Switch to settings view
        const navButtons = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view');
        
        navButtons.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        document.getElementById('settings-btn').classList.add('active');
        document.getElementById('settings').classList.add('active');
        
        this.currentView = 'settings';
        
        // Load system management data including grow bed configuration
        this.loadSystemManagement();
    }

    // Legacy methods - keeping for compatibility but they won't be used with new calculator

    // Hydroponic dosing calculator methods
    initializeHydroponicDosingCalculator() {
        this.preloadedNutrients = [
            {
                id: 1,
                name: "General Hydroponics Shiman",
                n: 5.0, p: 1.0, k: 6.0, ca: 4.0, mg: 1.5, fe: 0.1,
                price: 35.00
            },
            {
                id: 2,
                name: "Calcium Nitrate",
                n: 15.5, p: 0.0, k: 0.0, ca: 19.0, mg: 0.0, fe: 0.0,
                price: 18.50
            },
            {
                id: 3,
                name: "Iron Micromix",
                n: 0.0, p: 0.0, k: 0.0, ca: 0.0, mg: 0.0, fe: 6.0,
                price: 45.00
            },
            {
                id: 4,
                name: "Magnesium Sulphate",
                n: 0.0, p: 0.0, k: 0.0, ca: 0.0, mg: 9.7, fe: 0.0,
                price: 12.00
            },
            {
                id: 5,
                name: "Mono Potassium Phosphate",
                n: 0.0, p: 22.8, k: 28.7, ca: 0.0, mg: 0.0, fe: 0.0,
                price: 25.00
            },
            {
                id: 6,
                name: "Calcium Chloride",
                n: 0.0, p: 0.0, k: 0.0, ca: 27.0, mg: 0.0, fe: 0.0,
                price: 15.00
            },
            {
                id: 7,
                name: "Potassium Chloride",
                n: 0.0, p: 0.0, k: 52.4, ca: 0.0, mg: 0.0, fe: 0.0,
                price: 20.00
            }
        ];

        // Aquaponics-specific target values (optimized for fish waste supplementation)
        this.cropTargets = {
            lettuce: { n: 100, p: 15, k: 120, ca: 80, mg: 25, fe: 1.5, ec: 0.8 },
            tomato: { n: 120, p: 25, k: 160, ca: 100, mg: 30, fe: 2.0, ec: 1.4 },
            cucumber: { n: 110, p: 20, k: 140, ca: 90, mg: 28, fe: 1.8, ec: 1.2 },
            pepper: { n: 105, p: 18, k: 130, ca: 85, mg: 26, fe: 1.7, ec: 1.1 },
            spinach: { n: 95, p: 12, k: 100, ca: 70, mg: 22, fe: 1.8, ec: 0.9 },
            basil: { n: 90, p: 15, k: 110, ca: 75, mg: 24, fe: 1.6, ec: 1.0 },
            kale: { n: 100, p: 14, k: 105, ca: 75, mg: 25, fe: 1.9, ec: 1.0 },
            strawberry: { n: 70, p: 12, k: 80, ca: 60, mg: 18, fe: 1.4, ec: 0.7 }
        };

        this.customNutrients = JSON.parse(localStorage.getItem('custom_nutrients') || '[]');
        this.setupDosingTabs();
        this.loadAvailableNutrients();
        this.displayMaintenanceSchedule();
        this.loadCurrentNutrientLevels();
    }

    setupDosingTabs() {
        const tabs = document.querySelectorAll('.dosing-tab');
        const contents = document.querySelectorAll('.dosing-content');

        if (tabs.length === 0) {
            console.log('No dosing tabs found, skipping tab setup');
            return;
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const contentId = tab.id.replace('-tab', '-content');
                const content = document.getElementById(contentId);
                if (content) {
                    content.classList.add('active');
                }
            });
        });

        // Setup crop change listener
        const cropSelect = document.getElementById('crop-type');
        if (cropSelect) {
            cropSelect.addEventListener('change', this.updateTargetValues.bind(this));
        }

        // Setup tab listeners to refresh data when switching to calculator
        const calcTab = document.getElementById('nutrient-calc-tab');
        if (calcTab) {
            calcTab.addEventListener('click', () => {
                setTimeout(() => {
                    this.loadCurrentNutrientLevels();
                }, 100);
            });
        }
    }

    updateTargetValues() {
        const crop = document.getElementById('crop-type').value;
        const targetEcField = document.getElementById('target-ec');
        const targetDisplay = document.getElementById('target-values-display');

        if (!crop || !this.cropTargets[crop]) {
            targetDisplay.innerHTML = '<p style="text-align: center; color: #666;">Select crop to view target nutrient levels</p>';
            targetEcField.value = '';
            return;
        }

        const targets = this.cropTargets[crop];
        targetEcField.value = targets.ec;

        targetDisplay.innerHTML = `
            <h4>🐟 Aquaponics Target Values for ${crop.charAt(0).toUpperCase() + crop.slice(1)}</h4>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px; font-style: italic;">
                Optimized for aquaponics systems with fish waste nutrient supplementation
            </p>
            <div class="target-values-grid">
                <div class="target-value-item">
                    <div class="target-value-label">N</div>
                    <div class="target-value-amount">${targets.n} ppm</div>
                </div>
                <div class="target-value-item">
                    <div class="target-value-label">P</div>
                    <div class="target-value-amount">${targets.p} ppm</div>
                </div>
                <div class="target-value-item">
                    <div class="target-value-label">K</div>
                    <div class="target-value-amount">${targets.k} ppm</div>
                </div>
                <div class="target-value-item">
                    <div class="target-value-label">Ca</div>
                    <div class="target-value-amount">${targets.ca} ppm</div>
                </div>
                <div class="target-value-item">
                    <div class="target-value-label">Mg</div>
                    <div class="target-value-amount">${targets.mg} ppm</div>
                </div>
                <div class="target-value-item">
                    <div class="target-value-label">Fe</div>
                    <div class="target-value-amount">${targets.fe} ppm</div>
                </div>
            </div>
        `;
        
        // Load saved current nutrient levels when crop changes
        this.loadCurrentNutrientLevels();
    }

    calculateHydroponicDosing() {
        const crop = document.getElementById('crop-type').value;
        const reservoirVolume = parseFloat(document.getElementById('reservoir-volume').value);

        if (!crop) {
            this.showNotification('🌱 Please select a crop type first.', 'warning');
            return;
        }

        if (!reservoirVolume || reservoirVolume <= 0) {
            this.showNotification('💧 Please enter a valid reservoir volume.', 'warning');
            return;
        }

        const targets = this.cropTargets[crop];
        
        // Get current nutrient levels
        const currentLevels = {
            n: parseFloat(document.getElementById('current-n').value) || 0,
            p: parseFloat(document.getElementById('current-p').value) || 0,
            k: parseFloat(document.getElementById('current-k').value) || 0,
            ca: parseFloat(document.getElementById('current-ca').value) || 0,
            mg: parseFloat(document.getElementById('current-mg').value) || 0,
            fe: parseFloat(document.getElementById('current-fe').value) || 0
        };
        
        // Calculate what's needed (target minus current)
        const needed = {
            n: Math.max(0, targets.n - currentLevels.n),
            p: Math.max(0, targets.p - currentLevels.p),
            k: Math.max(0, targets.k - currentLevels.k),
            ca: Math.max(0, targets.ca - currentLevels.ca),
            mg: Math.max(0, targets.mg - currentLevels.mg),
            fe: Math.max(0, targets.fe - currentLevels.fe)
        };

        const allNutrients = [...this.preloadedNutrients, ...this.customNutrients];
        
        // Calculate optimal nutrient combination based on what's needed
        const dosingPlan = this.optimizeNutrientMix(needed, reservoirVolume, allNutrients);
        
        this.displayDosingResults(dosingPlan, targets, reservoirVolume, currentLevels);
    }

    optimizeNutrientMix(targets, volume, availableNutrients) {
        // Simplified optimization algorithm
        const selectedNutrients = [];
        const remaining = { ...targets };

        // Priority order for nutrient fulfillment
        const elementPriority = ['n', 'k', 'p', 'ca', 'mg', 'fe'];

        elementPriority.forEach(element => {
            if (remaining[element] <= 0) return;

            // Find best nutrient for this element
            const suitable = availableNutrients
                .filter(nutrient => nutrient[element] > 0)
                .sort((a, b) => b[element] - a[element]);

            if (suitable.length > 0) {
                const nutrient = suitable[0];
                const needed = remaining[element];
                const concentration = nutrient[element] / 100; // Convert percentage to decimal
                const amount = (needed * volume) / (concentration * 1000); // grams needed

                selectedNutrients.push({
                    nutrient: nutrient,
                    amount: Math.round(amount * 10) / 10, // Round to 1 decimal
                    cost: (amount / 1000) * nutrient.price
                });

                // Reduce remaining requirements based on this nutrient's contribution
                elementPriority.forEach(el => {
                    const contribution = (nutrient[el] / 100) * amount * 1000 / volume;
                    remaining[el] = Math.max(0, remaining[el] - contribution);
                });
            }
        });

        return selectedNutrients;
    }

    displayDosingResults(dosingPlan, targets, volume, currentLevels = null) {
        const resultsDiv = document.getElementById('dosing-results');
        
        if (dosingPlan.length === 0) {
            const hasCurrentLevels = currentLevels && Object.values(currentLevels).some(val => val > 0);
            if (hasCurrentLevels) {
                resultsDiv.innerHTML = '<p style="text-align: center; color: #80fb7d; font-weight: 600;">✅ Your current nutrient levels are already sufficient for this crop!</p>';
            } else {
                resultsDiv.innerHTML = '<p style="text-align: center; color: #999;">No suitable nutrient combination found.</p>';
            }
            return;
        }

        const totalCost = dosingPlan.reduce((sum, item) => sum + item.cost, 0);

        let html = `
            <h4>Recommended Dosing Plan for Aquaponics</h4>
        `;

        // Show current vs target comparison if current levels provided
        if (currentLevels && Object.values(currentLevels).some(val => val > 0)) {
            html += `
                <div style="background: #f0f8ff; padding: 12px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #7baaee;">
                    <h5>📊 Current vs Target Levels</h5>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.85rem;">
                        <div><strong>N:</strong> ${currentLevels.n}→${targets.n} ppm</div>
                        <div><strong>P:</strong> ${currentLevels.p}→${targets.p} ppm</div>
                        <div><strong>K:</strong> ${currentLevels.k}→${targets.k} ppm</div>
                        <div><strong>Ca:</strong> ${currentLevels.ca}→${targets.ca} ppm</div>
                        <div><strong>Mg:</strong> ${currentLevels.mg}→${targets.mg} ppm</div>
                        <div><strong>Fe:</strong> ${currentLevels.fe}→${targets.fe} ppm</div>
                    </div>
                </div>
            `;
        }

        html += `<div class="dosing-results-grid">`;

        dosingPlan.forEach(item => {
            html += `
                <div class="dosing-result-card">
                    <div class="dosing-result-nutrient">${item.nutrient.name}</div>
                    <div class="dosing-result-amount">${item.amount}</div>
                    <div class="dosing-result-unit">grams</div>
                </div>
            `;
        });

        html += `
            </div>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-top: 12px;">
                <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
                <p><strong>Reservoir Volume:</strong> ${volume}L</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 8px;">
                    <em>Dosing calculated for aquaponic system. Mix each nutrient separately to avoid precipitation.</em>
                </p>
            </div>
        `;

        resultsDiv.innerHTML = html;
        this.generateMixingSchedule(dosingPlan);
    }

    generateMixingSchedule(dosingPlan) {
        const scheduleDiv = document.getElementById('mixing-schedule-display');
        
        if (dosingPlan.length === 0) {
            scheduleDiv.innerHTML = '<p style="text-align: center; color: #666;">No mixing schedule needed - your current levels are sufficient!</p>';
            return;
        }

        // Separate nutrients by compatibility
        const { week1Nutrients, week2Nutrients } = this.separateNutrientsByCompatibility(dosingPlan);
        
        let html = `
            <h4>📅 Two-Week Nutrient Addition Schedule</h4>
            <div style="background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #ffc107;">
                <h5>⚠️ Important: Why Split Into Two Weeks?</h5>
                <p style="margin: 6px 0; font-size: 0.9rem;">
                    Some nutrients can cause precipitation (crystallization) when mixed together, making them unavailable to plants. 
                    This schedule separates incompatible nutrients to ensure maximum nutrient availability.
                </p>
            </div>
        `;

        // Week 1 nutrients
        if (week1Nutrients.length > 0) {
            html += `
                <div class="mixing-week-section">
                    <h5>🗓️ Week 1: Base Nutrients</h5>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 12px;">
                        Add these nutrients first to establish base levels. These are generally compatible with each other.
                    </p>
            `;

            week1Nutrients.forEach((item, index) => {
                const isCalcium = item.nutrient.name.toLowerCase().includes('calcium');
                html += `
                    <div class="mixing-step">
                        <div class="mixing-step-header">
                            <div class="mixing-step-title">Day ${index + 1}: Add ${item.nutrient.name}</div>
                            <div class="mixing-step-time">${item.amount}g</div>
                        </div>
                        <div class="mixing-step-content">
                            ${isCalcium ? 
                                `🥛 Dissolve ${item.amount}g in 200ml warm water. Add slowly while stirring to prevent cloudiness. Wait 2 hours before adding other nutrients.` :
                                `💧 Dissolve ${item.amount}g in 100-150ml warm water. Add to reservoir and stir gently. Wait 30 minutes before adding next nutrient.`
                            }
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // Week 2 nutrients
        if (week2Nutrients.length > 0) {
            html += `
                <div class="mixing-week-section" style="margin-top: 20px;">
                    <h5>🗓️ Week 2: Secondary Nutrients</h5>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 12px;">
                        Add these nutrients in the second week to avoid precipitation with Week 1 nutrients.
                    </p>
            `;

            week2Nutrients.forEach((item, index) => {
                const isIron = item.nutrient.name.toLowerCase().includes('iron');
                html += `
                    <div class="mixing-step">
                        <div class="mixing-step-header">
                            <div class="mixing-step-title">Day ${index + 8}: Add ${item.nutrient.name}</div>
                            <div class="mixing-step-time">${item.amount}g</div>
                        </div>
                        <div class="mixing-step-content">
                            ${isIron ? 
                                `🔶 Iron is sensitive to pH. Dissolve ${item.amount}g in 150ml cool water with a drop of citric acid. Add during low-light hours to prevent oxidation.` :
                                `💧 Dissolve ${item.amount}g in 100-150ml warm water. Add to reservoir and monitor for any cloudiness.`
                            }
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // Final monitoring steps
        html += `
            <div class="mixing-week-section" style="margin-top: 20px;">
                <h5>📊 Daily Monitoring</h5>
                <div class="mixing-step">
                    <div class="mixing-step-header">
                        <div class="mixing-step-title">Daily: Test & Adjust</div>
                        <div class="mixing-step-time">5 min</div>
                    </div>
                    <div class="mixing-step-content">
                        🧪 Test pH daily (keep 6.0-7.0 for aquaponics). Test EC weekly to monitor nutrient levels. 
                        Watch for precipitation (cloudiness) and fish behavior changes.
                    </div>
                </div>
            </div>

            <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin-top: 16px; border-left: 4px solid #80fb7d;">
                <h5>✅ Success Indicators</h5>
                <ul style="margin: 6px 0; padding-left: 16px; font-size: 0.9rem;">
                    <li>Water remains clear (no cloudiness or precipitation)</li>
                    <li>Fish continue normal feeding behavior</li>
                    <li>Plants show improved color and growth within 1-2 weeks</li>
                    <li>pH remains stable between 6.0-7.0</li>
                </ul>
            </div>
        `;

        scheduleDiv.innerHTML = html;
    }

    separateNutrientsByCompatibility(dosingPlan) {
        const week1Nutrients = [];
        const week2Nutrients = [];

        dosingPlan.forEach(item => {
            const nutrientName = item.nutrient.name.toLowerCase();
            
            // Week 1: Primary nutrients that are generally compatible
            if (nutrientName.includes('potassium') || 
                nutrientName.includes('magnesium') || 
                nutrientName.includes('general hydroponics') ||
                nutrientName.includes('npk')) {
                week1Nutrients.push(item);
            }
            // Week 2: Nutrients that can cause precipitation with others
            else if (nutrientName.includes('calcium') || 
                     nutrientName.includes('iron') || 
                     nutrientName.includes('phosphate')) {
                week2Nutrients.push(item);
            }
            // Default to week 1 for unknown nutrients
            else {
                week1Nutrients.push(item);
            }
        });

        return { week1Nutrients, week2Nutrients };
    }

    showNotification(message, type = 'info', duration = 4000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.dosing-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `dosing-notification dosing-notification-${type}`;
        
        // Set icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '✅';
                break;
            case 'warning':
                icon = '⚠️';
                break;
            case 'error':
                icon = '❌';
                break;
            default:
                icon = 'ℹ️';
        }
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Add to page
        const dosingContainer = document.querySelector('.dosing-content');
        if (dosingContainer) {
            dosingContainer.insertBefore(notification, dosingContainer.firstChild);
        }

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    loadAvailableNutrients() {
        const listDiv = document.getElementById('available-nutrients-list');
        if (!listDiv) {
            console.log('available-nutrients-list element not found');
            return;
        }
        const allNutrients = [...this.preloadedNutrients, ...this.customNutrients];

        let html = '';
        allNutrients.forEach(nutrient => {
            const isCustom = !this.preloadedNutrients.find(p => p.id === nutrient.id);
            html += `
                <div class="nutrient-item">
                    <div class="nutrient-item-header">
                        <div class="nutrient-name">${nutrient.name}</div>
                        <div class="nutrient-price">$${nutrient.price}/kg</div>
                    </div>
                    <div class="nutrient-composition">
                        <div class="nutrient-element">
                            <div class="element-symbol">N</div>
                            <div class="element-percentage">${nutrient.n}%</div>
                        </div>
                        <div class="nutrient-element">
                            <div class="element-symbol">P</div>
                            <div class="element-percentage">${nutrient.p}%</div>
                        </div>
                        <div class="nutrient-element">
                            <div class="element-symbol">K</div>
                            <div class="element-percentage">${nutrient.k}%</div>
                        </div>
                        <div class="nutrient-element">
                            <div class="element-symbol">Ca</div>
                            <div class="element-percentage">${nutrient.ca}%</div>
                        </div>
                        <div class="nutrient-element">
                            <div class="element-symbol">Mg</div>
                            <div class="element-percentage">${nutrient.mg}%</div>
                        </div>
                        <div class="nutrient-element">
                            <div class="element-symbol">Fe</div>
                            <div class="element-percentage">${nutrient.fe}%</div>
                        </div>
                    </div>
                    ${isCustom ? `
                        <div class="nutrient-actions">
                            <button onclick="app.deleteCustomNutrient(${nutrient.id})">Delete</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        listDiv.innerHTML = html;
    }

    addCustomNutrient() {
        const name = document.getElementById('nutrient-name').value.trim();
        const n = parseFloat(document.getElementById('nutrient-n').value) || 0;
        const p = parseFloat(document.getElementById('nutrient-p').value) || 0;
        const k = parseFloat(document.getElementById('nutrient-k').value) || 0;
        const ca = parseFloat(document.getElementById('nutrient-ca').value) || 0;
        const mg = parseFloat(document.getElementById('nutrient-mg').value) || 0;
        const fe = parseFloat(document.getElementById('nutrient-fe').value) || 0;
        const price = parseFloat(document.getElementById('nutrient-price').value) || 0;

        if (!name) {
            this.showNotification('🧪 Please enter a nutrient name.', 'warning');
            return;
        }

        if (n + p + k + ca + mg + fe === 0) {
            this.showNotification('📊 Please enter at least one nutrient percentage.', 'warning');
            return;
        }

        const newNutrient = {
            id: Date.now(),
            name: name,
            n: n, p: p, k: k, ca: ca, mg: mg, fe: fe,
            price: price
        };

        this.customNutrients.push(newNutrient);
        localStorage.setItem('custom_nutrients', JSON.stringify(this.customNutrients));

        // Clear form
        document.getElementById('nutrient-name').value = '';
        document.getElementById('nutrient-n').value = '';
        document.getElementById('nutrient-p').value = '';
        document.getElementById('nutrient-k').value = '';
        document.getElementById('nutrient-ca').value = '';
        document.getElementById('nutrient-mg').value = '';
        document.getElementById('nutrient-fe').value = '';
        document.getElementById('nutrient-price').value = '';

        this.loadAvailableNutrients();
        this.showNotification('✅ Custom nutrient added successfully!', 'success');
    }

    deleteCustomNutrient(id) {
        // Show confirmation inline instead of using confirm dialog
        const nutrientName = this.customNutrients.find(n => n.id === id)?.name || 'nutrient';
        
        // Create confirmation notification
        const activeForm = document.querySelector('#custom-nutrients-content');
        if (!activeForm) return;

        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'inline-notification inline-notification-warning';
        confirmationDiv.innerHTML = `
            <div class="inline-notification-content">
                <span class="inline-notification-icon">⚠️</span>
                <span class="inline-notification-message">Delete "${nutrientName}"? This action cannot be undone.</span>
                <div style="display: flex; gap: 8px; margin-left: auto;">
                    <button class="form-btn secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="this.closest('.inline-notification').remove()">Cancel</button>
                    <button class="form-btn" style="padding: 4px 12px; font-size: 0.8rem; background: #FF3B30;" onclick="app.confirmDeleteNutrient(${id}); this.closest('.inline-notification').remove()">Delete</button>
                </div>
            </div>
        `;
        
        // Remove any existing confirmation
        const existingConfirmation = activeForm.querySelector('.inline-notification');
        if (existingConfirmation) {
            existingConfirmation.remove();
        }
        
        activeForm.insertBefore(confirmationDiv, activeForm.firstChild);
    }

    confirmDeleteNutrient(id) {
        this.customNutrients = this.customNutrients.filter(n => n.id !== id);
        localStorage.setItem('custom_nutrients', JSON.stringify(this.customNutrients));
        this.loadAvailableNutrients();
        this.showNotification('🗑️ Custom nutrient deleted successfully.', 'success', 2000);
    }

    displayMaintenanceSchedule() {
        const scheduleDiv = document.getElementById('maintenance-schedule-display');
        if (!scheduleDiv) {
            console.log('maintenance-schedule-display element not found');
            return;
        }
        
        scheduleDiv.innerHTML = `
            <div class="maintenance-item">
                <div class="maintenance-frequency">Daily</div>
                <div class="maintenance-task">
                    Monitor EC and pH levels. Check for nutrient lockout signs in plants.
                </div>
            </div>
            <div class="maintenance-item">
                <div class="maintenance-frequency">Weekly</div>
                <div class="maintenance-task">
                    Top up nutrients as needed (typically 25-50% of original dosing). 
                    Clean filters and check water circulation.
                </div>
            </div>
            <div class="maintenance-item">
                <div class="maintenance-frequency">Bi-weekly</div>
                <div class="maintenance-task">
                    Partial water change (25-30%). Check root health and clean growing media.
                </div>
            </div>
            <div class="maintenance-item">
                <div class="maintenance-frequency">Monthly</div>
                <div class="maintenance-task">
                    Complete nutrient solution change. Deep clean system components. 
                    Calibrate EC and pH meters.
                </div>
            </div>
        `;
    }

    // Current nutrient levels management
    saveCurrentNutrientLevels() {
        if (!this.activeSystemId) {
            this.showNotification('Please select a system first.', 'warning');
            return;
        }

        const currentLevels = {
            n: parseFloat(document.getElementById('current-n').value) || 0,
            p: parseFloat(document.getElementById('current-p').value) || 0,
            k: parseFloat(document.getElementById('current-k').value) || 0,
            ca: parseFloat(document.getElementById('current-ca').value) || 0,
            mg: parseFloat(document.getElementById('current-mg').value) || 0,
            fe: parseFloat(document.getElementById('current-fe').value) || 0,
            updated: new Date().toISOString()
        };

        const storageKey = `current_nutrients_${this.activeSystemId}`;
        localStorage.setItem(storageKey, JSON.stringify(currentLevels));
        
        this.showNotification('💾 Current nutrient levels saved successfully!', 'success');
    }

    loadCurrentNutrientLevels() {
        if (!this.activeSystemId) return;

        // First try to get the latest values from water quality data
        this.loadNutrientsFromWaterQualityData();

        // Then load any manually saved values (these will override if they exist and are more recent)
        const storageKey = `current_nutrients_${this.activeSystemId}`;
        const savedLevels = localStorage.getItem(storageKey);
        
        if (savedLevels) {
            const levels = JSON.parse(savedLevels);
            const savedDate = new Date(levels.updated || 0);
            
            // Only use manually saved values if they're more recent than water quality data
            const latestWaterQuality = this.getLatestWaterQualityData();
            const waterQualityDate = latestWaterQuality ? new Date(latestWaterQuality.date) : new Date(0);
            
            if (savedDate > waterQualityDate) {
                document.getElementById('current-n').value = levels.n || '';
                document.getElementById('current-p').value = levels.p || '';
                document.getElementById('current-k').value = levels.k || '';
                document.getElementById('current-ca').value = levels.ca || '';
                document.getElementById('current-mg').value = levels.mg || '';
                document.getElementById('current-fe').value = levels.fe || '';
            }
        }
    }

    async loadNutrientsFromWaterQualityData() {
        if (!this.activeSystemId) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/data/latest/${this.activeSystemId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch latest data');
            }
            
            const latestData = await response.json();
            const waterQuality = latestData.waterQuality;
            
            if (waterQuality) {
                let loadedCount = 0;
                
                // Nitrogen (N) - Use nitrate as approximation (NO3-N conversion factor ~0.225)
                if (waterQuality.nitrate !== null && waterQuality.nitrate !== undefined) {
                    document.getElementById('current-n').value = (waterQuality.nitrate * 0.225).toFixed(1);
                    loadedCount++;
                }
                
                // Phosphorus (P) - Direct from database
                if (waterQuality.phosphorus !== null && waterQuality.phosphorus !== undefined) {
                    document.getElementById('current-p').value = waterQuality.phosphorus.toFixed(1);
                    loadedCount++;
                }
                
                // Potassium (K) - Direct from database
                if (waterQuality.potassium !== null && waterQuality.potassium !== undefined) {
                    document.getElementById('current-k').value = waterQuality.potassium.toFixed(0);
                    loadedCount++;
                }
                
                // Calcium (Ca) - Direct from database
                if (waterQuality.calcium !== null && waterQuality.calcium !== undefined) {
                    document.getElementById('current-ca').value = waterQuality.calcium.toFixed(0);
                    loadedCount++;
                }
                
                // Magnesium (Mg) - Direct from database
                if (waterQuality.magnesium !== null && waterQuality.magnesium !== undefined) {
                    document.getElementById('current-mg').value = waterQuality.magnesium.toFixed(1);
                    loadedCount++;
                }
                
                // Iron (Fe) - Direct from database
                if (waterQuality.iron !== null && waterQuality.iron !== undefined) {
                    document.getElementById('current-fe').value = waterQuality.iron.toFixed(1);
                    loadedCount++;
                }
                
                console.log('✅ Nutrient levels loaded from database:', waterQuality);
                
                if (loadedCount > 0) {
                    this.showNotification(`🔄 Loaded ${loadedCount} nutrient values from water quality data (${new Date(waterQuality.date).toLocaleDateString()})`, 'success', 3000);
                } else {
                    this.showNotification('📊 No nutrient values found in latest water quality data. Enter values manually as needed.', 'info', 4000);
                }
            } else {
                this.showNotification('📊 No recent water quality data found. Please enter values manually or add data in the Data Entry tab.', 'info', 4000);
            }
        } catch (error) {
            console.error('Error loading nutrient data from database:', error);
            this.showNotification('⚠️ Could not load nutrient data from database. Please enter values manually.', 'warning', 4000);
        }
    }

    getLatestWaterQualityData() {
        if (!this.dataRecords || !this.dataRecords.waterQuality || this.dataRecords.waterQuality.length === 0) {
            return null;
        }
        
        // Sort by date and get the most recent entry
        const sortedData = this.dataRecords.waterQuality.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        return sortedData[0];
    }

    showDataSourceInfo(waterQualityDate) {
        const currentSection = document.querySelector('.current-values-section');
        let infoDiv = currentSection.querySelector('.data-source-info');
        
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.className = 'data-source-info';
            currentSection.querySelector('.current-values-grid').parentNode.insertBefore(infoDiv, currentSection.querySelector('.current-values-grid').nextSibling);
        }
        
        const date = new Date(waterQualityDate).toLocaleDateString();
        infoDiv.innerHTML = `
            <div style="background: #e8f4fd; padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-size: 0.8rem; color: #334e9d; border-left: 3px solid #7baaee;">
                📊 Values auto-loaded from latest water quality data (${date}). You can override any values by typing new numbers and clicking "Save Current Levels".
            </div>
        `;
    }

    clearCurrentNutrientLevels() {
        document.getElementById('current-n').value = '';
        document.getElementById('current-p').value = '';
        document.getElementById('current-k').value = '';
        document.getElementById('current-ca').value = '';
        document.getElementById('current-mg').value = '';
        document.getElementById('current-fe').value = '';
        
        if (this.activeSystemId) {
            const storageKey = `current_nutrients_${this.activeSystemId}`;
            localStorage.removeItem(storageKey);
        }
        
        this.showNotification('🗑️ Current nutrient levels cleared.', 'info');
    }

    // Grow bed management methods
    async updateGrowBedCount() {
        const bedCount = parseInt(document.getElementById('grow-bed-count').value) || 4;
        
        try {
            // First, save any existing configuration before regenerating the form
            if (document.querySelector('.grow-bed-item')) {
                await this.saveGrowBedConfiguration();
            }
            
            // Generate new form structure
            window.growBedManager.generateGrowBedConfiguration(bedCount);
            
            // Load existing data into the new form
            await this.loadGrowBedConfiguration();
            
            this.showNotification('🌱 Grow bed configuration updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update grow bed configuration:', error);
            this.showNotification('❌ Failed to update grow bed configuration. Please try again.', 'error');
        }
    }

    async loadGrowBedConfiguration() {
        if (!this.activeSystemId) return;

        try {
            const growBeds = await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`);
            console.log('Loaded grow beds:', growBeds);
            
            // Generate the configuration UI first
            const bedCount = parseInt(document.getElementById('grow-bed-count').value) || 4;
            window.growBedManager.generateGrowBedConfiguration(bedCount);
            
            // Load existing data
            if (growBeds && growBeds.length > 0) {
                console.log('Loading data for', growBeds.length, 'grow beds');
                growBeds.forEach(bed => {
                    console.log('Processing bed:', bed);
                    const bedItem = document.querySelector(`[data-bed="${bed.bed_number}"]`);
                    console.log('Found bedItem:', bedItem);
                    if (bedItem) {
                        // First set the bed type
                        console.log('Setting bed type to:', bed.bed_type);
                        bedItem.querySelector('.bed-type').value = bed.bed_type;
                        
                        // Trigger calculation first to show/hide vertical config based on type
                        window.growBedManager.updateBedCalculation(bed.bed_number);
                        
                        // Then set the values based on bed type
                        if (bed.area_m2) {
                            console.log('Setting area_m2:', bed.area_m2);
                            const sizeField = bedItem.querySelector('.bed-size');
                            if (sizeField) sizeField.value = bed.area_m2;
                        } else if (bed.length_meters) {
                            console.log('Setting length_meters:', bed.length_meters);
                            const sizeField = bedItem.querySelector('.bed-size');
                            if (sizeField) sizeField.value = bed.length_meters;
                        }
                        
                        // Handle vertical growing fields (now they should be visible)
                        if (bed.bed_type === 'vertical' && bed.vertical_count && bed.plants_per_vertical) {
                            console.log(`Setting vertical values for bed ${bed.bed_number}: ${bed.vertical_count} verticals, ${bed.plants_per_vertical} plants per vertical`);
                            const verticalCountField = bedItem.querySelector('.vertical-count');
                            const plantsPerVerticalField = bedItem.querySelector('.plants-per-vertical');
                            if (verticalCountField) verticalCountField.value = bed.vertical_count;
                            if (plantsPerVerticalField) plantsPerVerticalField.value = bed.plants_per_vertical;
                        }
                        
                        const volumeField = bedItem.querySelector('.bed-volume');
                        const areaField = bedItem.querySelector('.equivalent-area');
                        if (volumeField) volumeField.value = bed.volume_liters;
                        if (areaField) areaField.textContent = `${bed.equivalent_m2.toFixed(1)} m²`;
                        
                        // Trigger calculation again to update equivalent area with loaded values
                        window.growBedManager.updateBedCalculation(bed.bed_number);
                    }
                });
                window.growBedManager.updateTotalEquivalentArea();
            }
        } catch (error) {
            console.error('Error loading grow bed configuration:', error);
        }
    }

    async saveGrowBedConfiguration() {
        if (!this.activeSystemId) return;

        const configuration = window.growBedManager.getGrowBedConfiguration();
        console.log('Saving configuration:', configuration);
        
        try {
            await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify({ growBeds: configuration })
            });
            
            // Refresh the grow bed status display after saving
            await this.displayGrowBedStatus();
        } catch (error) {
            console.error('Error saving grow bed configuration:', error);
            throw error;
        }
    }

    async displayGrowBedStatus() {
        const container = document.getElementById('grow-bed-status-container');
        if (!container || !this.activeSystemId) return;

        try {
            const growBeds = await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`);
            
            if (!growBeds || growBeds.length === 0) {
                container.innerHTML = `
                    <div class="grow-bed-status-empty">
                        <p style="text-align: center; color: #666; font-style: italic;">
                            No grow bed configuration found. Configure your grow beds above to see their status here.
                        </p>
                    </div>
                `;
                return;
            }

            const statusHtml = growBeds.map(bed => {
                let configDetails = '';
                if (bed.bed_type === 'vertical' && bed.vertical_count && bed.plants_per_vertical) {
                    configDetails = `${bed.vertical_count} verticals × ${bed.plants_per_vertical} plants = ${bed.plant_capacity} total plants`;
                } else if (bed.area_m2) {
                    configDetails = `${bed.area_m2} m² area`;
                } else if (bed.length_meters) {
                    configDetails = `${bed.length_meters} m length`;
                }

                return `
                    <div class="grow-bed-status-item">
                        <div class="bed-status-header">
                            <h4>Bed ${bed.bed_number}</h4>
                            <span class="bed-type-badge">${this.formatBedType(bed.bed_type)}</span>
                        </div>
                        <div class="bed-status-details">
                            <div class="status-row">
                                <span class="status-label">Configuration:</span>
                                <span class="status-value">${configDetails}</span>
                            </div>
                            <div class="status-row">
                                <span class="status-label">Volume:</span>
                                <span class="status-value">${bed.volume_liters}L</span>
                            </div>
                            <div class="status-row">
                                <span class="status-label">Equivalent Area:</span>
                                <span class="status-value">${bed.equivalent_m2.toFixed(1)} m²</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="grow-bed-status-grid">
                    ${statusHtml}
                </div>
                <div class="grow-bed-status-summary">
                    <p><strong>Total Beds:</strong> ${growBeds.length}</p>
                    <p><strong>Total Equivalent Area:</strong> ${growBeds.reduce((sum, bed) => sum + bed.equivalent_m2, 0).toFixed(1)} m²</p>
                </div>
            `;

        } catch (error) {
            console.error('Error displaying grow bed status:', error);
            container.innerHTML = `
                <div class="grow-bed-status-error">
                    <p style="color: #d32f2f; text-align: center;">
                        Error loading grow bed status. Please try refreshing the page.
                    </p>
                </div>
            `;
        }
    }

    formatBedType(bedType) {
        const typeMap = {
            'flood-drain': 'Flood & Drain',
            'media-flow': 'Media Flow Through',
            'dwc': 'Deep Water Culture',
            'nft': 'NFT',
            'vertical': 'Vertical Growing'
        };
        return typeMap[bedType] || bedType;
    }

    // Update system name display on all tabs
    updateCurrentSystemDisplay() {
        const activeSystem = this.getActiveSystem();
        const systemName = activeSystem ? activeSystem.system_name : 'No System Selected';
        
        const displays = [
            'current-system-dashboard',
            'current-system-calculators', 
            'current-system-data-entry',
            'current-system-fish-tank',
            'current-system-plants',
            'current-system-settings'
        ];
        
        displays.forEach(displayId => {
            const element = document.getElementById(displayId);
            if (element) {
                element.innerHTML = `<strong>System:</strong> ${systemName}`;
            }
        });
    }

    // Data preloading methods
    preloadWaterQualityData() {
        if (!this.latestData || !this.latestData.waterQuality) return;
        
        const latest = this.latestData.waterQuality;
        
        // Preload fields that commonly remain stable (not including date which should be current)
        if (latest.ammonia !== null) document.getElementById('wq-ammonia').value = latest.ammonia;
        if (latest.nitrite !== null) document.getElementById('wq-nitrite').value = latest.nitrite;
        if (latest.phosphorus !== null) document.getElementById('wq-phosphorus').value = latest.phosphorus;
        if (latest.magnesium !== null) document.getElementById('wq-magnesium').value = latest.magnesium;
    }

    preloadPlantGrowthData() {
        if (!this.latestData || !this.latestData.plantGrowth) return;
        
        const latest = this.latestData.plantGrowth;
        
        // Preload plant count from latest entry
        if (latest.count) document.getElementById('pg-count').value = latest.count;
    }

    preloadFishHealthData() {
        if (!this.latestData || !this.latestData.fishHealth) return;
        
        const latest = this.latestData.fishHealth;
        
        // Preload fish count from latest entry
        if (latest.count) document.getElementById('fh-count').value = latest.count;
    }

    // SMTP Configuration Management
    async loadSmtpConfig() {
        try {
            const response = await this.makeApiCall('/config/smtp');
            
            document.getElementById('smtp-host').value = response.host || '';
            document.getElementById('smtp-port').value = response.port || '';
            document.getElementById('smtp-user').value = response.auth?.user || '';
            document.getElementById('smtp-pass').value = response.auth?.pass || '';
            document.getElementById('smtp-from-name').value = response.from?.name || '';
            document.getElementById('smtp-from-email').value = response.from?.address || '';
            document.getElementById('smtp-reset-url').value = response.resetUrl || '';
            
            this.showNotification('📧 SMTP configuration loaded successfully', 'success', 2000);
        } catch (error) {
            console.error('Failed to load SMTP config:', error);
            this.showNotification('❌ Failed to load SMTP configuration', 'error');
        }
    }

    async saveSmtpConfig() {
        const config = {
            host: document.getElementById('smtp-host').value,
            port: document.getElementById('smtp-port').value,
            secure: false, // Use STARTTLS for port 587
            auth: {
                user: document.getElementById('smtp-user').value,
                pass: document.getElementById('smtp-pass').value
            },
            from: {
                name: document.getElementById('smtp-from-name').value,
                address: document.getElementById('smtp-from-email').value
            },
            resetUrl: document.getElementById('smtp-reset-url').value
        };

        // Validate required fields
        if (!config.host || !config.port || !config.auth.user || !config.auth.pass || !config.from.address || !config.resetUrl) {
            this.showNotification('⚠️ Please fill in all required fields', 'warning');
            return;
        }

        try {
            await this.makeApiCall('/config/smtp', {
                method: 'PUT',
                body: JSON.stringify(config)
            });
            
            this.showNotification('✅ SMTP configuration saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save SMTP config:', error);
            this.showNotification('❌ Failed to save SMTP configuration: ' + error.message, 'error');
        }
    }

    async testSmtpConfig() {
        try {
            const response = await this.makeApiCall('/config/smtp/test', {
                method: 'POST'
            });
            
            this.showNotification('📧 Test email sent successfully! Check your inbox.', 'success', 5000);
        } catch (error) {
            console.error('SMTP test failed:', error);
            this.showNotification('❌ SMTP test failed: ' + error.message, 'error', 6000);
        }
    }
}

let app;

document.addEventListener('DOMContentLoaded', async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    app = new AquaponicsApp();
    window.app = app;
});

setInterval(() => {
    const timeElement = document.querySelector('.time');
    if (timeElement && window.app) {
        window.app.updateLastFeedTime();
    }
}, 60000);

// Grow bed management functionality
class GrowBedManager {
    constructor() {
        this.growBedTypes = {
            'flood-drain': {
                name: 'Flood & Drain',
                calculation: 'direct', // Uses actual m2
                plantsPerM2: 25
            },
            'media-flow': {
                name: 'Media Flow Through',
                calculation: 'direct', // Uses actual m2
                plantsPerM2: 20
            },
            'dwc': {
                name: 'Deep Water Culture',
                calculation: 'direct', // Uses actual m2
                plantsPerM2: 25
            },
            'nft': {
                name: 'NFT (Nutrient Film Technique)',
                calculation: 'length', // 5m = 1m2 equivalent
                conversionRate: 5, // 5 linear meters = 1 m2
                plantsPerM2: 30
            },
            'vertical': {
                name: 'Vertical Growing',
                calculation: 'plants', // 48 plants default, 25 plants = 1m2
                plantsDefault: 48,
                plantsPerM2: 25
            }
        };
    }

    generateGrowBedConfiguration(bedCount) {
        const container = document.getElementById('grow-beds-container');
        if (!container) return;

        let html = '<div class="grow-bed-header" style="display: grid; grid-template-columns: auto 1fr 1fr 1fr auto; gap: 0.5rem; font-weight: 600; padding: 0.5rem; border-bottom: 2px solid #ddd; margin-bottom: 0.5rem;">';
        html += '<span>Bed #</span><span>Type</span><span>Size/Length</span><span>Volume (L)</span><span>Equiv. m²</span>';
        html += '</div>';

        for (let i = 1; i <= bedCount; i++) {
            html += this.generateGrowBedItem(i);
        }

        container.innerHTML = html;
        this.attachEventListeners();
    }

    generateGrowBedItem(bedNumber) {
        return `
            <div class="grow-bed-item" data-bed="${bedNumber}">
                <div>
                    <h5>Bed ${bedNumber}</h5>
                    <select class="bed-type" onchange="window.growBedManager.updateBedCalculation(${bedNumber})">
                        <option value="">Select Type</option>
                        <option value="flood-drain">Flood & Drain</option>
                        <option value="media-flow">Media Flow Through</option>
                        <option value="dwc">Deep Water Culture</option>
                        <option value="nft">NFT</option>
                        <option value="vertical">Vertical Growing</option>
                    </select>
                    <input type="number" class="bed-size" min="0.1" step="0.1" placeholder="Size" onchange="window.growBedManager.updateBedCalculation(${bedNumber})">
                    <input type="number" class="bed-volume" min="1" step="1" placeholder="Volume" onchange="window.growBedManager.updateBedCalculation(${bedNumber})">
                    <div class="equivalent-area">0.0 m²</div>
                </div>
                <div class="vertical-config" id="vertical-config-${bedNumber}" style="display: none;">
                    <input type="number" class="vertical-count" min="1" step="1" placeholder="# Verticals" onchange="window.growBedManager.updateBedCalculation(${bedNumber})">
                    <input type="number" class="plants-per-vertical" min="1" step="1" placeholder="Plants/Vertical" onchange="window.growBedManager.updateBedCalculation(${bedNumber})">
                </div>
            </div>
        `;
    }

    updateBedCalculation(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const typeSelect = bedItem.querySelector('.bed-type');
        const sizeInput = bedItem.querySelector('.bed-size');
        const volumeInput = bedItem.querySelector('.bed-volume');
        const equivalentArea = bedItem.querySelector('.equivalent-area');
        const verticalConfig = bedItem.querySelector('.vertical-config');
        const verticalCountInput = bedItem.querySelector('.vertical-count');
        const plantsPerVerticalInput = bedItem.querySelector('.plants-per-vertical');

        const bedType = typeSelect.value;
        const size = parseFloat(sizeInput.value) || 0;
        const volume = parseFloat(volumeInput.value) || 0;

        // Show/hide vertical configuration based on bed type
        if (bedType === 'vertical') {
            verticalConfig.style.display = 'grid';
            sizeInput.style.display = 'none'; // Hide the main size input for verticals
        } else {
            verticalConfig.style.display = 'none';
            sizeInput.style.display = 'block';
        }

        if (!bedType) {
            equivalentArea.textContent = '0.0 m²';
            this.updateTotalEquivalentArea();
            return;
        }

        const typeConfig = this.growBedTypes[bedType];
        let equivM2 = 0;

        switch (typeConfig.calculation) {
            case 'direct':
                if (size <= 0) {
                    equivalentArea.textContent = '0.0 m²';
                    this.updateTotalEquivalentArea();
                    return;
                }
                equivM2 = size; // size is actual m²
                sizeInput.placeholder = 'Area (m²)';
                break;
            case 'length':
                if (size <= 0) {
                    equivalentArea.textContent = '0.0 m²';
                    this.updateTotalEquivalentArea();
                    return;
                }
                equivM2 = size / typeConfig.conversionRate; // 5m = 1m²
                sizeInput.placeholder = 'Length (m)';
                break;
            case 'plants':
                const verticalCount = parseFloat(verticalCountInput.value) || 0;
                const plantsPerVertical = parseFloat(plantsPerVerticalInput.value) || 0;
                
                if (verticalCount <= 0 || plantsPerVertical <= 0) {
                    equivalentArea.textContent = '0.0 m²';
                    this.updateTotalEquivalentArea();
                    return;
                }
                
                const totalPlants = verticalCount * plantsPerVertical;
                equivM2 = totalPlants / typeConfig.plantsPerM2; // plants converted to m²
                break;
        }

        equivalentArea.textContent = `${equivM2.toFixed(1)} m²`;
        this.updateTotalEquivalentArea();
    }

    updateTotalEquivalentArea() {
        const equivalentAreas = document.querySelectorAll('.equivalent-area');
        let total = 0;

        equivalentAreas.forEach(area => {
            const value = parseFloat(area.textContent.replace(' m²', '')) || 0;
            total += value;
        });

        const totalInput = document.getElementById('total-grow-area');
        if (totalInput) {
            totalInput.value = total.toFixed(1);
        }
    }

    attachEventListeners() {
        // Event listeners are already attached via onchange attributes in HTML
    }

    getGrowBedConfiguration() {
        const bedItems = document.querySelectorAll('.grow-bed-item');
        const configuration = [];

        bedItems.forEach((item, index) => {
            const bedNumber = index + 1;
            const type = item.querySelector('.bed-type').value;
            const size = parseFloat(item.querySelector('.bed-size').value) || 0;
            const volume = parseFloat(item.querySelector('.bed-volume').value) || 0;
            const equivalentM2 = parseFloat(item.querySelector('.equivalent-area').textContent.replace(' m²', '')) || 0;
            
            // Get vertical configuration
            const verticalCount = parseFloat(item.querySelector('.vertical-count').value) || 0;
            const plantsPerVertical = parseFloat(item.querySelector('.plants-per-vertical').value) || 0;

            if (type && volume > 0 && equivalentM2 > 0) {
                const typeConfig = this.growBedTypes[type];
                const config = {
                    bed_number: bedNumber,
                    bed_type: type,
                    volume_liters: volume,
                    equivalent_m2: equivalentM2
                };

                // Add type-specific fields
                if (typeConfig.calculation === 'direct') {
                    config.area_m2 = size;
                } else if (typeConfig.calculation === 'length') {
                    config.length_meters = size;
                } else if (typeConfig.calculation === 'plants') {
                    config.vertical_count = verticalCount;
                    config.plants_per_vertical = plantsPerVertical;
                    config.plant_capacity = verticalCount * plantsPerVertical;
                }

                configuration.push(config);
            }
        });

        return configuration;
    }
}

// Initialize grow bed manager
window.growBedManager = new GrowBedManager();