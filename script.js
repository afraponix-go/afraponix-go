class AquaponicsApp {
    constructor() {
        this.currentView = 'dashboard';
        this.currentCalcTab = 'fish-calc';
        this.currentDataTab = 'water-quality-form';
        this.systems = {};
        this.activeSystemId = null;
        this.dataRecords = { waterQuality: [], fishHealth: [], plantGrowth: [], operations: [] };
        this.user = null;
        this.token = localStorage.getItem('auth_token');
        this.charts = {};
        this.API_BASE = 'http://127.0.0.1:8000/api';
        this.isLoading = true; // Track loading state to suppress notifications
        
        // Shared crop nutrient targets from dosing calculator
        this.cropTargets = {
            // LEAFY GREENS
            lettuce: { n: 73, p: 19, k: 90, ca: 67, mg: 13, fe: 1.8, ec: 1.1, ph_min: 6.0, ph_max: 6.8, notes: "Achieved highest yields with P and K supplementation" },
            spinach: { n: 65, p: 16, k: 75, ca: 65, mg: 15, fe: 1.6, ec: 1.05, ph_min: 6.5, ph_max: 7.2, notes: "Tolerates cooler temperatures well" },
            kale: { n: 75, p: 21, k: 95, ca: 80, mg: 18, fe: 2.0, ec: 1.3, ph_min: 6.0, ph_max: 6.8, notes: "PPM over 600 but below 900 for optimal growth" },
            swiss_chard: { n: 70, p: 19, k: 82, ca: 70, mg: 14, fe: 1.75, ec: 1.2, ph_min: 6.0, ph_max: 6.5, notes: "EC around 2.0 mS/cm for optimal yield" },
            arugula: { n: 60, p: 14, k: 65, ca: 57, mg: 11, fe: 1.6, ec: 0.85, ph_min: 6.0, ph_max: 6.5, notes: "EC between 0.5 and 2.0 mS/cm" },
            pac_choi: { n: 65, p: 17, k: 80, ca: 65, mg: 14, fe: 1.75, ec: 1.25, ph_min: 6.0, ph_max: 6.8, notes: "Same EC range as arugula" },
            
            // HERBS
            basil: { n: 95, p: 25, k: 150, ca: 95, mg: 22, fe: 2.05, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Highest production in micronutrient supplemented systems" },
            mint: { n: 80, p: 21, k: 130, ca: 80, mg: 18, fe: 1.85, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Shows stress response without supplementation" },
            parsley: { n: 70, p: 17, k: 110, ca: 72, mg: 15, fe: 1.65, ec: 1.1, ph_min: 6.0, ph_max: 7.0, notes: "Prefers cooler water temperatures" },
            cilantro: { n: 65, p: 15, k: 100, ca: 65, mg: 13, fe: 1.5, ec: 1.05, ph_min: 6.0, ph_max: 6.8, notes: "Fast-growing, harvest in 2-3 weeks" },
            chives: { n: 55, p: 14, k: 85, ca: 55, mg: 11, fe: 1.3, ec: 1.0, ph_min: 6.0, ph_max: 7.0, notes: "Low nutrient requirements" },
            oregano: { n: 62, p: 16, k: 95, ca: 65, mg: 14, fe: 1.5, ec: 1.15, ph_min: 6.0, ph_max: 7.0, notes: "Mediterranean herb, drought tolerant" },
            thyme: { n: 57, p: 14, k: 90, ca: 60, mg: 12, fe: 1.4, ec: 1.05, ph_min: 6.5, ph_max: 7.5, notes: "Prefers slightly alkaline conditions" },
            
            // FRUITING VEGETABLES
            tomatoes: { n: 150, p: 45, k: 275, ca: 150, mg: 37, fe: 2.5, ec: 2.0, ph_min: 5.8, ph_max: 6.5, notes: "K accumulates in fruits; Ca decreases during fruiting" },
            peppers: { n: 115, p: 37, k: 225, ca: 120, mg: 30, fe: 2.3, ec: 1.85, ph_min: 5.8, ph_max: 6.5, notes: "Require warmer water temperatures" },
            cucumbers: { n: 135, p: 41, k: 250, ca: 135, mg: 33, fe: 2.15, ec: 2.0, ph_min: 5.8, ph_max: 6.8, notes: "High water content, need good aeration" },
            eggplant: { n: 122, p: 36, k: 225, ca: 127, mg: 31, fe: 2.3, ec: 2.05, ph_min: 5.5, ph_max: 6.0, notes: "PPM range of 1750-2450 recommended" }
        };
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
                icon: '<svg enable-background="new 0 0 100 100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><g fill="#0051b1"><path d="m54.96191 59.66748c-1.06738-.04834-4.33496-1.97461-6.31445-3.32666-.18408-.12549-.40771-.19287-.62744-.17236-.104.00635-10.49658.65918-16.03027.25049-2.98706-.2193-5.9267-.75238-8.91229-1.34186 1.31549-1.10309 3.2995-3.04572 3.80927-5.08441.56158-2.24603-.85437-4.50629-1.78333-5.69061 4.54456-1.39368 9.70428-2.93896 16.91223-3.05206.26562-.00439.51855-.11426.70361-.30518 3.12451-3.23096 7.41846-6.32471 8.58447-5.59668.02063.01288.04089.02795.06146.04108-1.77484 1.16016-3.79089 3.77069-4.53265 4.77753-.32727-.04553-.52832-.07349-.52832-.07349l-.27539 1.98047s9.58447 1.3335 12.00098 1.66699c.88135.12158 2.35498.24219 3.91504.37012 2.55859.20996 6.06348.49707 6.95947.82764.11132.041.22851.06151.3457.06151.11914 0 .23779-.021.35107-.06348 1.25146-.46924 3.50293-1.25488 4.21729-1.36475.5459-.08398.92041-.59424.83643-1.14014-.08398-.54639-.60156-.91797-1.14014-.83643-.98291.15088-3.39209 1.01709-4.29688 1.3501-1.25488-.32861-3.77881-.55469-7.10986-.82764-1.53174-.12549-2.97852-.24414-3.80469-.3584-.94812-.13086-3.00031-.41559-5.14307-.7132.87207-.92236 1.70776-1.66272 2.14917-1.89429.43439.54028.69775.91125.70532.92194.31641.45215.94141.56104 1.39258.24512.45215-.31689.56201-.93994.24561-1.39209-.1001-.14307-2.48242-3.52051-5.28955-5.2749-2.95898-1.85107-8.68555 3.47217-10.79248 5.60645-7.41016.17139-12.66748 1.78516-17.31641 3.21191-1.92383.59033-3.74072 1.14795-5.55615 1.55371-6.47803 1.44922-10.71924 4.71582-10.89697 4.854-.32764.25537-.46289.68701-.34033 1.08398.12305.39697.47852.67676.89307.70264.81885.05127 4.4209 1.26318 6.71729 2.10742.11377.04199.23047.06201.34521.06201.40723 0 .79004-.25098.93848-.65527.19043-.51855-.0752-1.09326-.59326-1.28369-.6333-.23291-2.94824-1.07471-4.86865-1.65479.78503-.46039 1.80908-1.00098 3.0116-1.53058.16705.64612.74878 1.12561 1.44714 1.12561.82843 0 1.5-.67157 1.5-1.5 0-.24835-.0661-.47913-.17297-.68542.77515-.25067 1.59387-.48102 2.45593-.67377 1.29089-.28894 2.57617-.65668 3.87842-1.04553.34869.37347 2.40753 2.68005 1.93311 4.57678-.4707 1.88428-3.18262 4.1333-4.18799 4.84131-.10693.0752-.19128.16974-.25867.27301-.38226-.06201-.75275-.13361-1.13879-.19391-2.27246-.35547-4.62207-.72266-6.64795-1.52393-.50098-.19775-.92773-.31982-1.30469-.42725-.65039-.18555-1.12012-.31982-1.72217-.77441-.44043-.33398-1.06885-.24512-1.40039.19531-.33301.44043-.24561 1.06738.19531 1.40039.89941.67969 1.65088.89404 2.37793 1.10205.33691.0957.69873.19824 1.11865.36426 2.23291.88232 4.69385 1.26758 7.07422 1.63965 1.00391.15674 1.99902.31201 2.96045.50342 3.28271.65479 6.50439 1.26221 9.83105 1.50635 5.16113.38281 14.07861-.11572 15.96191-.22803 1.30713.87598 5.21729 3.396 7.06592 3.47998.01562.00049.03076.00098.04639.00098.53125 0 .97363-.41846.99805-.95459.02489-.55173-.40187-1.01951-.95363-1.04441zm-4.18762-18.95288c-.58667-.08154-1.14447-.15906-1.66199-.23096 1.43713-1.80725 3.13007-3.53546 3.82471-3.66772.05853-.01117.10486-.04431.15869-.06476.31415.29108.61145.5896.89056.88403-.89031.57502-1.96044 1.60053-3.21197 3.07941z"/></g></svg>',
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
                icon: '<svg id="Layer_2" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="m47.1155295 24.1677246c2.6532764.529534 5.044589 1.4316276 7.1071725 2.6807979.5403006.3273275 1.089329.7242869 1.6183534 1.1759708-.2118264-1.2184634-.5895462-2.4652766-1.2422262-3.1804533-1.813361-1.6640314-26.3839445-6.5062864-29.4265992-6.237697-1.2683462.1151189-1.9344047 1.5526713-2.2573363 2.6267743 5.9503139.0545333 13.8013314.8573712 24.2006359 2.9346073z" fill="#0051b1"/><path d="m33.9545424 31.9742526c-.1123298.5250399-.2545529 1.2942294-.4221916 2.4674375-.1074574.7522017.5920691 1.3611269 1.0176847 1.6561079 1.1030185.7658972 2.3482599.8817827 2.7823035.7711648.304726-1.1298828-.3281664-3.1553755-1.011627-4.604865-.7496996-.2088571-1.539169-.3019605-2.3661695-.2898452z" fill="#0051b1"/><path d="m11.576416 31.2006226c6.5237918 3.6058327 12.8864102 2.7625121 12.8140516-4.8353103 3.0488744-3.5109919 2.2919307 4.4495968-.8329725 7.5376418 3.2568571 2.1349583 7.913564-.7538779 11.4386558-1.2291121 4.4503433 1.2522076 10.0800679-.8130041 13.7398483 1.9389162 4.9116326-7.9367702-16.5277001-3.027739-18.7003735-2.9212553-4.1082576-1.817751 2.8982044-2.0975484 3.7204673-3.2954151 1.0409823-1.3424914-2.6439031-.9227009-3.635791-.5450525-5.5056777-2.1260204 7.9094262-4.4328407 5.7107526 1.0673607 4.588715-1.3431334 11.9827014-1.5430712 15.2460938 1.5915527 5.0143858-12.7196708 3.4850637 13.7859204-16.7236328 11.6218872 1.3293801 1.1420344 1.6478069 2.8973085 1.078125 4.5117188 7.3209905-2.4553212 16.855255-3.2807426 18.803833-7.5292358.0755414.3492258-15.3958173 8.6502329-12.5546226 3.3750429 21.8262046-4.9067795 19.5890925-15.0059387 5.6645264-18.710719-30.0851236-6.0076466-36.8751626-.6155568-38.2037759 1.0587596 7.3892591 6.4491261-6.2090201 1.3941353 2.4348145 6.3632202zm3.8191528-5.0973511c-1.5417271.0226149-1.5417777-2.3995156.0001074-2.3767025 1.5416197-.0226214 1.5416703 2.3995092-.0001074 2.3767025z" fill="#0051b1"/></svg>',
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
            },
            carp: {
                name: 'Carp',
                icon: '<svg height="300" viewBox="-22 0 464 464" width="300" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="m0 120c0 22.585938 20.03125 23.953125 24.046875 24l9.089844.105469-1.214844 9.015625c-1.058594 7.527344-1.738281 29.4375 7.621094 40.191406 3.914062 4.496094 9.296875 6.6875 16.457031 6.6875 17.167969 0 22.390625-10.121094 29.503906-26.632812 4.25-9.847657 9.007813-20.792969 18.742188-26.527344-.054688-3.425782-.230469-6.726563-.230469-10.214844-18.503906 2.773438-35.382813 13.902344-35.574219 14.03125l-8.875-13.3125c.960938-.640625 21.738282-14.28125 45.035156-16.878906.039063-.585938.023438-1.234375.070313-1.800782-9.609375-1.734374-30.175781-4.375-46.128906.929688l-5.0625-15.167969c18.847656-6.296875 41.457031-3.722656 52.96875-1.707031.933593-6.34375 2.101562-12.292969 3.4375-17.886719-7.039063-2.097656-19.6875-4.824219-37.871094-4.824219-30.078125-.007812-72.015625 15.214844-72.015625 39.992188zm0 0" fill="#0051b1"/></svg>',
                defaultDensity: 30,
                defaultFingerlingWeight: 45,
                harvestWeight: 600,
                growthPeriod: 26,
                feedConversionRatio: 2.0,
                temperature: '22-28°C',
                growthData: [
                    { week: 0, weight: 45, feedRate: 8, feedAmount: 3.6 },
                    { week: 4, weight: 80, feedRate: 7, feedAmount: 5.6 },
                    { week: 8, weight: 150, feedRate: 6, feedAmount: 9 },
                    { week: 12, weight: 250, feedRate: 5, feedAmount: 12.5 },
                    { week: 16, weight: 370, feedRate: 4, feedAmount: 14.8 },
                    { week: 20, weight: 480, feedRate: 3.5, feedAmount: 16.8 },
                    { week: 24, weight: 570, feedRate: 3, feedAmount: 17.1 },
                    { week: 26, weight: 600, feedRate: 2.5, feedAmount: 15 }
                ]
            },
            catfish: {
                name: 'Catfish',
                icon: '🐱‍🐟',
                defaultDensity: 40,
                defaultFingerlingWeight: 30,
                harvestWeight: 450,
                growthPeriod: 20,
                feedConversionRatio: 1.5,
                temperature: '24-32°C',
                growthData: [
                    { week: 0, weight: 30, feedRate: 10, feedAmount: 3 },
                    { week: 4, weight: 80, feedRate: 8, feedAmount: 6.4 },
                    { week: 8, weight: 150, feedRate: 6, feedAmount: 9 },
                    { week: 12, weight: 250, feedRate: 5, feedAmount: 12.5 },
                    { week: 16, weight: 350, feedRate: 4, feedAmount: 14 },
                    { week: 20, weight: 450, feedRate: 3, feedAmount: 13.5 }
                ]
            },
            trout: {
                name: 'Trout',
                icon: '🐟',
                defaultDensity: 50,
                defaultFingerlingWeight: 20,
                harvestWeight: 300,
                growthPeriod: 16,
                feedConversionRatio: 1.2,
                temperature: '12-18°C',
                growthData: [
                    { week: 0, weight: 20, feedRate: 12, feedAmount: 2.4 },
                    { week: 4, weight: 60, feedRate: 10, feedAmount: 6 },
                    { week: 8, weight: 120, feedRate: 8, feedAmount: 9.6 },
                    { week: 12, weight: 200, feedRate: 6, feedAmount: 12 },
                    { week: 16, weight: 300, feedRate: 4, feedAmount: 12 }
                ]
            }
        };
        this.init();
    }

    // Authentication Methods
    async makeApiCall(endpoint, options = {}) {
        // Prevent duplicate login API calls
        if (endpoint === '/auth/login' && this.loginInProgress) {
            throw new Error('Login already in progress');
        }
        
        if (endpoint === '/auth/login') {
            this.loginInProgress = true;
        }
        
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Get token from localStorage
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log('🌐 Making API call to:', url);
        console.log('📋 Config:', { ...config, headers: { ...config.headers, Authorization: config.headers.Authorization ? '[HIDDEN]' : 'Not set' } });

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                // Create enhanced error object that preserves response data
                const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
                error.response = errorData;
                error.status = response.status;
                throw error;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ API call failed:', error);
            throw error;
        } finally {
            if (endpoint === '/auth/login') {
                this.loginInProgress = false;
            }
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
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
            await this.logout();
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
        
        // Show admin settings tab for admin users
        if (this.user && (this.user.user_role === 'admin' || this.user.userRole === 'admin')) {
            const adminSettingsTab = document.getElementById('admin-settings-tab');
            if (adminSettingsTab) {
                adminSettingsTab.style.display = 'flex';
            }
        }
        
        // Show main content
        document.querySelector('.mobile-content').style.display = 'block';
        document.querySelector('.bottom-nav').style.display = 'flex';
    }

    async login(username, password) {
        // Rate limiting - prevent multiple login attempts within 3 seconds
        const now = Date.now();
        if (this.lastLoginAttempt && (now - this.lastLoginAttempt) < 3000) {
            console.log('Rate limited: Too soon since last attempt');
            return { success: false, error: 'Please wait before trying again' };
        }
        this.lastLoginAttempt = now;
        
        console.log('Starting login attempt...');
        
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
            
            console.log('Login successful');
            return { success: true };
        } catch (error) {
            console.error('Login failed:', error.message);
            
            // Check if it's an email verification error
            if (error.message.includes('Email not verified') || error.response?.needsVerification) {
                const email = error.response?.email || '';
                if (email) {
                    this.showEmailVerificationMessage(email);
                }
                return { success: false, error: 'Please verify your email before logging in.', needsVerification: true };
            }
            
            return { success: false, error: error.message };
        }
    }

    async register(username, email, password, firstName, lastName) {
        try {
            const response = await this.makeApiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password, firstName, lastName })
            });

            if (response.needsVerification) {
                // Show email verification message
                this.showEmailVerificationMessage(email);
                return { success: true, needsVerification: true };
            } else {
                // Legacy flow (in case email verification is disabled)
                this.token = response.token;
                this.user = response.user;
                if (this.token) {
                    localStorage.setItem('auth_token', this.token);
                    this.showAppUI();
                    await this.loadUserData();
                    this.closeAuthModal();
                }
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        console.log('Logout initiated');
        this.token = null;
        this.user = null;
        this.systems = {};
        this.activeSystemId = null;
        this.dataRecords = { waterQuality: [], fishHealth: [], plantGrowth: [], operations: [] };
        
        // Hide admin button and SMTP section
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.style.display = 'none';
        }
        const smtpSection = document.getElementById('smtp-section');
        if (smtpSection) {
            smtpSection.style.display = 'none';
        }
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('activeSystemId');
        this.showAuthUI();
        await this.updateDashboardFromData();
        
        // Show notification that logout was successful
        this.showNotification('Successfully logged out', 'success');
        console.log('Logout completed');
    }

    // Notification System
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (container) {
            console.log('Notification container already exists');
            // Force reapply styles to existing container
            container.style.position = 'fixed';
            container.style.top = '70px';
            container.style.right = '20px';
            container.style.zIndex = '99999';
            container.style.maxWidth = '400px';
            container.style.width = 'auto';
            container.style.pointerEvents = 'none';
            container.style.display = 'block';
            container.style.visibility = 'visible';
            return;
        }
        
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        
        // Force positioning with inline styles to override any CSS conflicts
        container.style.position = 'fixed';
        container.style.top = '70px';
        container.style.right = '20px';
        container.style.zIndex = '99999';
        container.style.maxWidth = '400px';
        container.style.width = 'auto';
        container.style.pointerEvents = 'none';
        container.style.display = 'block';
        container.style.visibility = 'visible';
        
        document.body.appendChild(container);
        console.log('Created notification container with forced positioning');
        
        // Double-check styles after DOM insertion
        setTimeout(() => {
            const computedStyles = window.getComputedStyle(container);
            console.log('Container styles after creation:', {
                position: computedStyles.position,
                top: computedStyles.top,
                right: computedStyles.right,
                zIndex: computedStyles.zIndex,
                display: computedStyles.display,
                visibility: computedStyles.visibility
            });
            
            // Force styles again if they're not applied
            if (computedStyles.position !== 'fixed') {
                console.warn('Position not fixed! Forcing styles again...');
                container.style.cssText = 'position: fixed !important; top: 70px !important; right: 20px !important; z-index: 99999 !important; max-width: 400px; width: auto; pointer-events: none; display: block !important; visibility: visible !important;';
            }
        }, 100);
    }

    showNotification(message, type = 'info', duration = 4000) {
        // Suppress notifications during loading unless it's the success message after loading completes
        if (this.isLoading && !message.includes('Afraponix Go loaded successfully')) {
            console.log('🔕 Notification suppressed during loading:', message, type);
            return;
        }
        
        console.log('🔔 showNotification called:', message, type);
        console.log('this object:', this);
        console.log('typeof this.createNotificationContainer:', typeof this.createNotificationContainer);
        
        // Ensure notification container exists
        if (!document.getElementById('notification-container')) {
            console.log('Container not found, creating...');
            this.createNotificationContainer();
        }
        
        // Try to show inline notification first
        // Temporarily disabled to debug toast notifications
        // if (this.showInlineNotification(message, type, duration)) {
        //     console.log('📍 Used inline notification');
        //     return;
        // }

        // Fallback to toast notification
        const container = document.getElementById('notification-container');
        console.log('📦 Notification container found:', !!container);
        if (!container) {
            console.warn('Notification container not found, falling back to alert');
            alert(message);
            return;
        }
        
        // Debug container visibility
        const containerStyles = window.getComputedStyle(container);
        console.log('Container visibility:', {
            display: containerStyles.display,
            visibility: containerStyles.visibility,
            opacity: containerStyles.opacity,
            position: containerStyles.position,
            top: containerStyles.top,
            right: containerStyles.right,
            zIndex: containerStyles.zIndex
        });

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Force notification visibility with inline styles
        notification.style.pointerEvents = 'auto';
        notification.style.opacity = '1';
        notification.style.display = 'flex';
        notification.style.marginBottom = '12px';
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);
        console.log('🎨 Added notification to container');
        console.log('Container children:', container.children.length);
        
        // Force container visibility again right before adding notification
        container.style.position = 'fixed';
        container.style.top = '70px';
        container.style.right = '20px';
        container.style.zIndex = '99999';
        container.style.display = 'block';
        container.style.visibility = 'visible';
        
        // Debug notification visibility
        const notificationStyles = window.getComputedStyle(notification);
        console.log('Notification visibility:', {
            display: notificationStyles.display,
            visibility: notificationStyles.visibility,
            opacity: notificationStyles.opacity,
            width: notificationStyles.width,
            height: notificationStyles.height,
            background: notificationStyles.background
        });
        
        // Try to force visibility of the notification element itself
        notification.style.position = 'relative';
        notification.style.display = 'flex';
        notification.style.opacity = '1';
        notification.style.visibility = 'visible';
        notification.style.width = 'auto';
        notification.style.minHeight = '50px';
        notification.style.backgroundColor = type === 'success' ? '#f0f9ff' : '#ffffff';
        notification.style.border = '1px solid #e0e0e0';
        
        // Log final positions after all manipulations
        setTimeout(() => {
            const finalContainerStyles = window.getComputedStyle(container);
            const finalNotificationStyles = window.getComputedStyle(notification);
            console.log('🔍 Final container position:', {
                position: finalContainerStyles.position,
                top: finalContainerStyles.top,
                right: finalContainerStyles.right,
                display: finalContainerStyles.display,
                visibility: finalContainerStyles.visibility,
                zIndex: finalContainerStyles.zIndex
            });
            console.log('🔍 Final notification styles:', {
                display: finalNotificationStyles.display,
                visibility: finalNotificationStyles.visibility,
                opacity: finalNotificationStyles.opacity,
                position: finalNotificationStyles.position,
                width: finalNotificationStyles.width,
                height: finalNotificationStyles.height
            });
        }, 50);

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

    showCustomConfirm(title, message, details = []) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const detailsEl = document.getElementById('confirm-details');
            const cancelBtn = document.getElementById('confirm-cancel');
            const okBtn = document.getElementById('confirm-ok');
            
            // Set content
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            if (details.length > 0) {
                detailsEl.innerHTML = `
                    This will:
                    <ul>
                        ${details.map(detail => `<li>${detail}</li>`).join('')}
                    </ul>
                `;
                detailsEl.style.display = 'block';
            } else {
                detailsEl.style.display = 'none';
            }
            
            // Set up event handlers
            const handleCancel = () => {
                modal.style.display = 'none';
                resolve(false);
            };
            
            const handleOk = () => {
                modal.style.display = 'none';
                resolve(true);
            };
            
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            
            // Remove existing listeners and add new ones
            cancelBtn.onclick = handleCancel;
            okBtn.onclick = handleOk;
            document.addEventListener('keydown', handleEscape);
            
            // Show modal
            modal.style.display = 'flex';
            
            // Focus the cancel button by default
            setTimeout(() => cancelBtn.focus(), 100);
        });
    }

    hideAllAuthForms() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
    }

    showLoginForm() {
        this.hideAllAuthForms();
        document.getElementById('login-form').style.display = 'block';
    }

    async handleEmailVerificationUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) return;
        
        // Show modal and verification processing message
        const modal = document.getElementById('auth-modal');
        modal.style.display = 'block';
        
        const modalContent = document.querySelector('#auth-modal .modal-content');
        modalContent.innerHTML = `
            <span class="close" id="close-modal">&times;</span>
            <div class="verification-processing">
                <div class="verification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#007bff" stroke-width="2"/>
                        <path d="m9 12 2 2 4-4" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3>Verifying Your Email...</h3>
                <p>Please wait while we verify your email address.</p>
            </div>
        `;
        
        try {
            const response = await this.makeApiCall('/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            
            if (response.verified) {
                // Auto-login after successful verification
                this.token = response.token;
                this.user = response.user;
                localStorage.setItem('auth_token', this.token);
                
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Show success and close modal
                modalContent.innerHTML = `
                    <span class="close" id="close-modal">&times;</span>
                    <div class="verification-success">
                        <div class="verification-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#28a745" stroke-width="2"/>
                                <path d="m9 12 2 2 4-4" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>Email Verified Successfully!</h3>
                        <p>Welcome to Afraponix Go! You have been automatically logged in.</p>
                        <button id="continue-to-dashboard-btn" class="btn-primary">
                            Continue to Dashboard
                        </button>
                    </div>
                `;
                
                // Re-attach modal close handler  
                document.getElementById('close-modal').addEventListener('click', async () => {
                    this.closeAuthModal();
                    this.showAppUI();
                    
                    // Load user data to check if they have any systems
                    await this.loadUserData();
                    
                    // If user has no systems, show system creation dialog
                    if (Object.keys(this.systems).length === 0) {
                        // Show a welcome message and then the system creation dialog
                        this.showNotification('🎉 Welcome to Afraponix Go! Let\'s set up your first aquaponics system.', 'success');
                        
                        // Delay to show notification first
                        setTimeout(() => {
                            this.showAddSystemDialog();
                        }, 1500);
                    }
                });
                
                // Add continue to dashboard button handler
                document.getElementById('continue-to-dashboard-btn').addEventListener('click', async () => {
                    this.closeAuthModal();
                    this.showAppUI();
                    
                    // Load user data to check if they have any systems
                    await this.loadUserData();
                    
                    // If user has no systems, show system creation dialog
                    if (Object.keys(this.systems).length === 0) {
                        // Show a welcome message and then the system creation dialog
                        this.showNotification('🎉 Welcome to Afraponix Go! Let\'s set up your first aquaponics system.', 'success');
                        
                        // Delay to show notification first
                        setTimeout(() => {
                            this.showAddSystemDialog();
                        }, 1500);
                    }
                });
                
            } else {
                throw new Error('Email verification failed');
            }
            
        } catch (error) {
            console.error('Email verification error:', error);
            
            // Show error message
            modalContent.innerHTML = `
                <span class="close" id="close-modal">&times;</span>
                <div class="verification-error">
                    <div class="verification-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#dc3545" stroke-width="2"/>
                            <path d="m15 9-6 6" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="m9 9 6 6" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>Verification Failed</h3>
                    <p>This verification link is invalid or has expired. Please request a new verification email.</p>
                    <button id="back-to-login-btn" class="btn-primary">
                        Back to Login
                    </button>
                </div>
            `;
            
            // Re-attach modal close handler
            document.getElementById('close-modal').addEventListener('click', () => {
                this.closeAuthModal();
            });
            
            // Add back to login button handler
            document.getElementById('back-to-login-btn').addEventListener('click', () => {
                this.showLoginForm();
            });
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    showEmailVerificationMessage(email) {
        // Hide all auth forms and show verification message
        this.hideAllAuthForms();
        
        const modalContent = document.querySelector('#auth-modal .modal-content');
        const verificationHtml = `
            <span class="close" id="close-modal">&times;</span>
            <div class="verification-message">
                <div class="verification-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3>Check Your Email!</h3>
                <p>We've sent a verification link to:</p>
                <p class="email-address">${email}</p>
                <p class="verification-info">Click the link in the email to verify your account and start using Afraponix Go.</p>
                <div class="verification-actions">
                    <button onclick="app.showResendVerification('${email}')" class="btn-primary">
                        📧 Resend Verification Email
                    </button>
                    <button onclick="app.showLoginForm()" class="btn-secondary">
                        Back to Login
                    </button>
                </div>
                <div class="verification-tips">
                    <p><strong>Tips:</strong></p>
                    <ul>
                        <li>Check your spam/junk folder</li>
                        <li>Verification link expires in 24 hours</li>
                        <li>Make sure to check the email address is correct</li>
                    </ul>
                </div>
            </div>
        `;
        
        modalContent.innerHTML = verificationHtml;
        
        // Re-attach modal close handler
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeAuthModal();
        });
    }

    async showResendVerification(email) {
        const confirmed = confirm(`Would you like us to send a new verification email to ${email}?`);

        if (confirmed) {
            try {
                console.log('🔄 Resending verification email to:', email);
                const response = await this.makeApiCall('/auth/resend-verification', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });

                console.log('✅ Resend response:', response);
                // Email sent successfully - no additional notification needed since the confirm dialog already informed the user
            } catch (error) {
                console.error('❌ Resend error:', error);
                this.showNotification('❌ Failed to resend verification email. Please try again.', 'error');
            }
        }
    }

    showInlineNotification(message, type = 'info', duration = 4000) {
        console.log('📍 showInlineNotification called:', message, type);
        
        // Find the current active view or form context
        const activeView = document.querySelector('.view.active');
        const activeForm = document.querySelector('.data-form.active, .dosing-content.active, .calculator-content.active');
        console.log('🎯 Active view found:', !!activeView);
        console.log('📋 Active form found:', !!activeForm);
        
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
            
            // Check for stored system preference
            const storedSystemId = localStorage.getItem('activeSystemId');
            if (storedSystemId && this.systems[storedSystemId]) {
                // Use stored system if it exists
                await this.switchToSystem(storedSystemId);
            } else if (systems.length > 0) {
                // Otherwise default to the first system
                await this.switchToSystem(systems[0].id);
            } else {
                this.activeSystemId = null;
                await this.loadDataRecords();
                await this.updateDashboardFromData();
                
                // Don't auto-show system creation here as it might interfere with email verification flow
                // Let the email verification handler or other specific triggers handle it
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    async init() {
        try {
            this.updateLoadingMessage('Setting up navigation...');
            this.setupNavigation();
            this.setupCalculatorTabs();
            this.setupDataEntryTabs();
            this.setupPlantTabs();
            this.setupFishManagementTabs();
            this.setupSettingsTabs();
            
            this.updateLoadingMessage('Configuring system components...');
            this.setupEventListeners();
            this.setupAuthModal();
            this.setupNewSystemModal();
            this.setupSystemSelector();
            this.setupDataEditTabs();
            
            this.updateLoadingMessage('Initializing calculators...');
            this.initializeFishCalculator();
            this.initializeNutrientCalculator();
            this.initializeDataEntryForms();
            this.createNotificationContainer();
            
            // Initialize charts after DOM is ready
            this.initializeCharts();
            
            this.updateLoadingMessage('Checking authentication...');
            
            // Check for email verification in URL parameters
            await this.handleEmailVerificationUrl();
            
            // Check authentication status - this will load user data and systems
            const isAuthenticated = await this.checkAuthStatus();
            
            if (isAuthenticated) {
                this.updateLoadingMessage('Loading system configuration...');
                // Wait for system management to load
                await this.loadSystemManagement();
                
                // Additional delay to ensure all data is rendered
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Hide loading screen after ALL initialization is complete
            this.hideLoadingScreen();
            
            // Show success notification after loading screen is hidden
            setTimeout(() => {
                if (this && this.showNotification) {
                    try {
                        this.showNotification('🚀 Afraponix Go loaded successfully!', 'success', 3000);
                    } catch (error) {
                        console.error('Error calling showNotification:', error);
                    }
                }
            }, 1000);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateLoadingMessage('Error loading application...');
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
        }
    }
    
    updateLoadingMessage(message) {
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            // Update message before hiding
            this.updateLoadingMessage('Ready!');
            
            // Mark loading as complete to allow notifications
            this.isLoading = false;
            
            // Add fade-out class for smooth transition
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
            }, 200);
            
            // Remove loading screen from DOM after transition completes
            setTimeout(() => {
                loadingScreen.remove();
            }, 700);
        }
    }

    setupAuthModal() {
        // Prevent duplicate setup
        if (this.authModalSetup) {
            return;
        }
        this.authModalSetup = true;
        
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
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Logout button clicked');
                await this.logout();
            });
            console.log('Logout button event listener attached');
        } else {
            console.error('Logout button not found');
        }
        
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

        // Form submissions with debounce protection
        let loginSubmitTimeout;
        let isLoginInProgress = false;
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Prevent submission if login is already in progress
            if (isLoginInProgress) {
                console.log('Login already in progress, ignoring submission');
                return;
            }
            
            // Clear any pending submission
            if (loginSubmitTimeout) {
                clearTimeout(loginSubmitTimeout);
            }
            
            // Capture form reference before timeout
            const formElement = e.target;
            
            // Debounce form submission
            loginSubmitTimeout = setTimeout(async () => {
                if (isLoginInProgress) {
                    console.log('Login already in progress, ignoring debounced submission');
                    return;
                }
                
                isLoginInProgress = true;
                
                try {
                    // Create a synthetic event with the form reference
                    const syntheticEvent = { target: formElement, preventDefault: () => {} };
                    await this.handleLogin(syntheticEvent);
                } finally {
                    isLoginInProgress = false;
                }
            }, 100);
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
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Prevent multiple simultaneous login attempts
        if (form.classList.contains('loading') || (submitBtn && submitBtn.disabled)) {
            e.preventDefault();
            return;
        }
        
        const formData = new FormData(form);
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        this.showMessage('', 'info'); // Clear previous messages
        form.classList.add('loading');
        
        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        const result = await this.login(username, password);
        
        form.classList.remove('loading');
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
        
        if (result.success) {
            this.showMessage('Login successful!', 'success');
        } else {
            // Check if it's an email verification error
            if (result.needsVerification) {
                // Email verification message is already shown by the login method
                // Don't show an additional error message
                return;
            } else {
                this.showMessage(result.error, 'error');
            }
        }
    }

    async handleRegister(e) {
        const form = e.target;
        const firstName = document.getElementById('register-first-name').value;
        const lastName = document.getElementById('register-last-name').value;
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

        const result = await this.register(username, email, password, firstName, lastName);
        
        form.classList.remove('loading');
        
        if (result.success) {
            if (result.needsVerification) {
                // Email verification message is already shown by the register method
                // Don't show an additional success message
            } else {
                this.showMessage('Account created successfully!', 'success');
            }
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
                const targetElement = document.getElementById(targetView);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
                
                this.currentView = targetView;
                
                // Load data when switching to specific views
                if (targetView === 'settings') {
                    this.loadSystemManagement();
                } else if (targetView === 'plants') {
                    this.updatePlantManagement();
                    this.updatePlantNutrientData();
                } else if (targetView === 'fish-tank') {
                    // Load fish overview tab by default when fish tank view is accessed
                    setTimeout(() => {
                        this.loadFishOverview();
                    }, 100);
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

    setupPlantTabs() {
        // Setup the main plant management tabs immediately
        this.setupPlantManagementTabs();
        
        // Initialize the plant action tabs and forms on page load
        setTimeout(() => {
            this.setupPlantActionTabs();
            this.initializePlantActionForms();
        }, 500);
    }

    setupPlantManagementTabs() {
        console.log('Setting up plant management tabs...');
        const mgmtTabs = document.querySelectorAll('.plant-mgmt-tab');
        const mgmtContents = document.querySelectorAll('.plant-mgmt-content');
        console.log('Found plant mgmt tabs:', mgmtTabs.length);
        console.log('Found plant mgmt contents:', mgmtContents.length);
        
        mgmtTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.id.replace('-tab', '-content');
                console.log('Plant mgmt tab clicked:', tab.id, '-> target:', targetContent);
                
                mgmtTabs.forEach(t => t.classList.remove('active'));
                mgmtContents.forEach(c => {
                    c.classList.remove('active');
                    // Reset forced styles on all content
                    c.style.display = '';
                    c.style.visibility = '';
                    c.style.opacity = '';
                    c.style.position = '';
                    c.style.zIndex = '';
                });
                
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                console.log('Target element found:', !!targetElement);
                if (targetElement) {
                    targetElement.classList.add('active');
                    // Force visibility with direct styles only for active element
                    targetElement.style.display = 'block';
                    targetElement.style.visibility = 'visible';
                    targetElement.style.opacity = '1';
                    targetElement.style.position = 'relative';
                    targetElement.style.zIndex = '999';
                    console.log('Added active class to:', targetContent);
                    console.log('Forced styles applied to element');
                }
                
                // Load data for specific tabs
                if (targetContent === 'plant-overview-content') {
                    this.updatePlantOverview().catch(console.error);
                } else if (targetContent === 'allocation-management-content') {
                    this.loadPlantAllocations();
                } else if (targetContent === 'custom-crops-content') {
                    console.log('Setting up Custom Crops tab');
                    this.loadCustomCrops();
                } else if (targetContent === 'spray-programmes-content') {
                    console.log('Setting up Spray Programmes tab');
                    this.setupSprayProgrammes();
                } else if (targetContent === 'planting-harvesting-content') {
                    console.log('Setting up Plant & Harvest tab');
                    
                    // Ensure the plants view is active
                    const plantsView = document.getElementById('plants');
                    if (!plantsView.classList.contains('active')) {
                        console.log('Plants view not active, activating it...');
                        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                        plantsView.classList.add('active');
                        const plantsNavBtn = document.querySelector('[data-view="plants"]') || document.getElementById('plants-btn');
                        if (plantsNavBtn) plantsNavBtn.classList.add('active');
                    }
                    
                    const targetEl = document.getElementById(targetContent);
                    console.log('Target element classes:', targetEl ? targetEl.className : 'NOT FOUND');
                    console.log('Plants view active:', plantsView.classList.contains('active'));
                    console.log('Plants view display:', getComputedStyle(plantsView).display);
                    
                    // Ensure visibility
                    if (targetEl) {
                        targetEl.style.display = 'block';
                        targetEl.style.visibility = 'visible';
                        targetEl.style.opacity = '1';
                    }
                    
                    setTimeout(() => {
                        try {
                            this.setupPlantActionTabs();
                            this.initializePlantActionForms();
                            this.updateRecentPlantEntries();
                            console.log('Plant & Harvest tab initialization completed');
                        } catch (error) {
                            console.error('Error initializing Plant & Harvest tab:', error);
                        }
                    }, 100);
                }
            });
        });
        
        // Setup action tabs for plant/harvest
        this.setupPlantActionTabs();
    }

    setupPlantActionTabs() {
        const actionTabs = document.querySelectorAll('.plant-action-tab');
        const actionContents = document.querySelectorAll('.plant-action-content');
        console.log('Found action tabs:', actionTabs.length);
        console.log('Found action contents:', actionContents.length);
        
        actionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.id.replace('-tab', '-form-content');
                console.log('Plant action tab clicked:', tab.id, '-> target:', targetContent);
                
                actionTabs.forEach(t => t.classList.remove('active'));
                actionContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                if (targetElement) {
                    targetElement.classList.add('active');
                    console.log('Plant action target element found and activated:', targetContent);
                } else {
                    console.log('Plant action target element NOT found:', targetContent);
                }
            });
        });
    }

    async initializePlantActionForms() {
        // Set current date/time for forms
        document.getElementById('plant-date').value = new Date().toISOString().slice(0, 16);
        document.getElementById('harvest-date').value = new Date().toISOString().slice(0, 16);
        
        // Populate grow bed dropdowns
        if (this.activeSystemId) {
            try {
                const growBeds = await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`);
                const plantBedSelect = document.getElementById('plant-grow-bed');
                const harvestBedSelect = document.getElementById('harvest-grow-bed');
                
                if (plantBedSelect && harvestBedSelect) {
                    // Clear existing options
                    plantBedSelect.innerHTML = '<option value="">Select Grow Bed</option>';
                    harvestBedSelect.innerHTML = '<option value="">Select Grow Bed</option>';
                    
                    growBeds.forEach(bed => {
                        const bedTypeName = bed.bed_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const option = `<option value="${bed.id}">Bed ${bed.bed_number} - ${bedTypeName}</option>`;
                        plantBedSelect.innerHTML += option;
                        harvestBedSelect.innerHTML += option;
                    });
                    
                    // Remove existing event listeners to prevent duplicates
                    plantBedSelect.replaceWith(plantBedSelect.cloneNode(true));
                    harvestBedSelect.replaceWith(harvestBedSelect.cloneNode(true));
                    
                    // Get the new elements after cloning
                    const newPlantBedSelect = document.getElementById('plant-grow-bed');
                    const newHarvestBedSelect = document.getElementById('harvest-grow-bed');
                    
                    // Add event listeners for bed selection changes
                    newPlantBedSelect.addEventListener('change', () => this.updatePlantCropDropdown());
                    newHarvestBedSelect.addEventListener('change', () => this.updateHarvestCropDropdown());
                }
                
                // Initialize crop dropdowns
                await this.updatePlantCropDropdown();
                await this.updateHarvestCropDropdown();
                
            } catch (error) {
                console.error('Error loading grow beds for plant forms:', error);
            }
        }
    }

    async updatePlantCropDropdown() {
        const plantBedSelect = document.getElementById('plant-grow-bed');
        const plantCropSelect = document.getElementById('plant-crop-type');
        
        if (!plantCropSelect) return;
        
        // Clear existing options
        plantCropSelect.innerHTML = '<option value="">Select Crop</option>';
        
        if (!this.activeSystemId) {
            plantCropSelect.innerHTML += '<option value="" disabled>Please select a system first</option>';
            return;
        }
        
        const selectedBedId = plantBedSelect?.value;
        
        if (!selectedBedId) {
            plantCropSelect.innerHTML += '<option value="" disabled>Please select a grow bed first</option>';
            return;
        }
        
        try {
            // Get crop allocations for the selected bed
            const allocations = await this.makeApiCall(`/plants/allocations/${this.activeSystemId}`);
            const bedAllocations = allocations.filter(allocation => allocation.grow_bed_id == selectedBedId);
            
            if (bedAllocations.length === 0) {
                plantCropSelect.innerHTML += '<option value="" disabled>No crops allocated for this bed</option>';
                this.showNotification('🌱 Please allocate crops for this grow bed first in the Settings → Crop Allocation tab.', 'warning');
                return;
            }
            
            // Add allocated crops to dropdown
            bedAllocations.sort((a, b) => a.crop_type.localeCompare(b.crop_type)).forEach(allocation => {
                const cleanCropName = this.cleanCustomCropName(allocation.crop_type);
                const cropName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
                plantCropSelect.innerHTML += `<option value="${allocation.crop_type}">${cropName}</option>`;
            });
            
        } catch (error) {
            console.error('Error loading crop allocations for planting:', error);
            plantCropSelect.innerHTML += '<option value="" disabled>Error loading allocated crops</option>';
        }
    }

    async updateHarvestCropDropdown() {
        const harvestBedSelect = document.getElementById('harvest-grow-bed');
        const harvestCropSelect = document.getElementById('harvest-crop-type');
        
        if (!harvestCropSelect) return;
        
        // Clear existing options
        harvestCropSelect.innerHTML = '<option value="">Select Crop</option>';
        
        if (!this.activeSystemId) {
            harvestCropSelect.innerHTML += '<option value="" disabled>Please select a system first</option>';
            return;
        }
        
        const selectedBedId = harvestBedSelect?.value;
        
        if (!selectedBedId) {
            harvestCropSelect.innerHTML += '<option value="" disabled>Please select a grow bed first</option>';
            return;
        }
        
        try {
            // Get all planted crops in the selected bed (including unallocated ones)
            const plantData = await this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`);
            const plantedCrops = plantData
                .filter(entry => entry.grow_bed_id == selectedBedId && entry.count > 0)
                .map(entry => entry.crop_type)
                .filter(Boolean);
            
            // Get unique crop types
            const uniquePlantedCrops = [...new Set(plantedCrops)];
            
            if (uniquePlantedCrops.length === 0) {
                harvestCropSelect.innerHTML += '<option value="" disabled>No crops planted in this bed yet</option>';
                return;
            }
            
            // Get allocations to identify which crops are allocated vs unallocated
            const allocations = await this.makeApiCall(`/plants/allocations/${this.activeSystemId}`);
            const bedAllocations = allocations.filter(allocation => allocation.grow_bed_id == selectedBedId);
            const allocatedCropTypes = new Set(bedAllocations.map(alloc => alloc.crop_type));
            
            // Sort and add all planted crops to dropdown
            uniquePlantedCrops.sort((a, b) => a.localeCompare(b)).forEach(cropType => {
                const cleanCropName = this.cleanCustomCropName(cropType);
                const cropName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
                
                // Add label to distinguish allocated vs unallocated crops
                const isAllocated = allocatedCropTypes.has(cropType);
                const displayName = isAllocated ? cropName : `${cropName} (unallocated)`;
                
                harvestCropSelect.innerHTML += `<option value="${cropType}">${displayName}</option>`;
            });
            
        } catch (error) {
            console.error('Error loading planted crops for harvest:', error);
            harvestCropSelect.innerHTML += '<option value="" disabled>Error loading planted crops</option>';
        }
    }

    // Legacy function - kept for backward compatibility but now redirects to updateHarvestCropDropdown
    async populateHarvestCropDropdown() {
        await this.updateHarvestCropDropdown();
    }

    // Plant management functionality
    async recordPlanting() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('plant-date').value,
            grow_bed_id: parseInt(document.getElementById('plant-grow-bed').value),
            crop_type: document.getElementById('plant-crop-type').value,
            count: parseInt(document.getElementById('plant-count').value),
            new_seedlings: parseInt(document.getElementById('plant-count').value),
            growth_stage: document.getElementById('plant-stage').value,
            health: 'good',
            notes: document.getElementById('plant-notes').value
        };

        if (!data.grow_bed_id || !data.crop_type || !data.count) {
            this.showNotification('📝 Please fill in all required fields.', 'warning');
            return;
        }

        try {
            await this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            // Reload data and update displays
            await this.loadDataRecords();
            await this.updateDashboardFromData();
            this.updatePlantManagement(); // This will refresh the overview if it's active
            
            this.showNotification(`🌱 Recorded planting of ${data.count} ${this.cleanCustomCropName(data.crop_type)} plants!`, 'success');
            this.clearPlantingForm();
        } catch (error) {
            console.error('Failed to record planting:', error);
            this.showNotification('❌ Failed to record planting. Please try again.', 'error');
        }
    }

    async recordHarvest() {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }

        const data = {
            date: document.getElementById('harvest-date').value,
            grow_bed_id: parseInt(document.getElementById('harvest-grow-bed').value),
            crop_type: document.getElementById('harvest-crop-type').value,
            plants_harvested: parseInt(document.getElementById('harvest-plant-count').value),
            harvest_weight: parseFloat(document.getElementById('harvest-weight').value) * 1000, // Convert kg to grams
            health: document.getElementById('harvest-quality').value,
            growth_stage: 'harvest',
            notes: document.getElementById('harvest-notes').value
        };

        if (!data.grow_bed_id || !data.crop_type || !data.plants_harvested || !data.harvest_weight) {
            this.showNotification('📝 Please fill in all required fields.', 'warning');
            return;
        }

        try {
            await this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            // Reload data and update displays
            await this.loadDataRecords();
            await this.updateDashboardFromData();
            this.updatePlantManagement(); // This will refresh the overview if it's active
            
            this.showNotification(`🥬 Recorded harvest of ${data.harvest_weight}kg from ${data.plants_harvested} ${this.cleanCustomCropName(data.crop_type)} plants!`, 'success');
            this.clearHarvestForm();
        } catch (error) {
            console.error('Failed to record harvest:', error);
            this.showNotification('❌ Failed to record harvest. Please try again.', 'error');
        }
    }

    clearPlantingForm() {
        document.getElementById('plant-grow-bed').value = '';
        document.getElementById('plant-crop-type').value = '';
        document.getElementById('plant-count').value = '';
        document.getElementById('plant-stage').value = 'seedling';
        document.getElementById('plant-notes').value = '';
        document.getElementById('plant-date').value = new Date().toISOString().slice(0, 16);
    }

    clearHarvestForm() {
        document.getElementById('harvest-grow-bed').value = '';
        document.getElementById('harvest-crop-type').value = '';
        document.getElementById('harvest-plant-count').value = '';
        document.getElementById('harvest-weight').value = '';
        document.getElementById('harvest-quality').value = 'excellent';
        document.getElementById('harvest-notes').value = '';
        document.getElementById('harvest-date').value = new Date().toISOString().slice(0, 16);
    }

    setupFishManagementTabs() {
        console.log('Setting up fish management tabs...');
        const fishTabs = document.querySelectorAll('.fish-mgmt-tab');
        const fishContents = document.querySelectorAll('.fish-mgmt-content');
        console.log('Found fish mgmt tabs:', fishTabs.length);
        console.log('Found fish mgmt contents:', fishContents.length);
        
        fishTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.id.replace('-tab', '-content');
                console.log('Fish mgmt tab clicked:', tab.id, '-> target:', targetContent);
                
                fishTabs.forEach(t => t.classList.remove('active'));
                fishContents.forEach(c => {
                    c.classList.remove('active');
                    c.style.display = '';
                });
                
                tab.classList.add('active');
                const targetElement = document.getElementById(targetContent);
                console.log('Target element found:', !!targetElement);
                if (targetElement) {
                    targetElement.classList.add('active');
                    targetElement.style.display = 'block';
                    console.log('Added active class to:', targetContent);
                }
                
                // Load data for specific tabs
                if (targetContent === 'fish-overview-content') {
                    console.log('Loading fish overview data');
                    this.loadFishOverview();
                } else if (targetContent === 'fish-health-entry-content') {
                    console.log('Loading fish health entry form');
                    this.loadFishHealthEntry();
                } else if (targetContent === 'tank-information-content') {
                    console.log('Loading tank information');
                    this.loadTankInformation();
                } else if (targetContent === 'fish-health-monitoring-content') {
                    console.log('Loading fish health monitoring');
                    this.loadFishHealthMonitoring();
                }
            });
        });
    }

    setupSettingsTabs() {
        // Setup main settings tabs
        const settingsTabs = document.querySelectorAll('.settings-tab');
        const settingsContents = document.querySelectorAll('.settings-content');
        
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                settingsTabs.forEach(t => t.classList.remove('active'));
                settingsContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const contentElement = document.getElementById(targetContent);
                if (contentElement) {
                    contentElement.classList.add('active');
                    
                    // Load specific content based on tab
                    if (targetContent === 'grow-beds-content') {
                        this.displayGrowBedStatus();
                    } else if (targetContent === 'system-sharing-content') {
                        this.loadSystemSharing();
                    } else if (targetContent === 'admin-settings-content') {
                        this.loadAdminUsers(); // Default to user management
                    }
                }
            });
        });
        
        // Setup system config sub-tabs
        const systemConfigSubTabs = document.querySelectorAll('.system-config-tab');
        const systemConfigContents = document.querySelectorAll('.system-config-content');
        
        systemConfigSubTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                systemConfigSubTabs.forEach(t => t.classList.remove('active'));
                systemConfigContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const contentElement = document.getElementById(targetContent);
                if (contentElement) {
                    contentElement.classList.add('active');
                    
                    // Load specific content based on sub-tab
                    if (targetContent === 'grow-beds-config-content') {
                        this.displayGrowBedStatus(); // Load grow bed status when opening that sub-tab
                        this.loadGrowBedConfiguration(); // Load grow bed configuration form
                    }
                }
            });
        });
        
        // Setup admin sub-tabs
        const adminSubTabs = document.querySelectorAll('.admin-subtab');
        const adminSubContents = document.querySelectorAll('.admin-subcontent');
        
        adminSubTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetContent = tab.getAttribute('data-target');
                
                adminSubTabs.forEach(t => t.classList.remove('active'));
                adminSubContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const contentElement = document.getElementById(targetContent);
                if (contentElement) {
                    contentElement.classList.add('active');
                    
                    // Load specific content based on sub-tab
                    if (targetContent === 'admin-users-subcontent') {
                        this.loadAdminUsers();
                    } else if (targetContent === 'admin-smtp-subcontent') {
                        this.loadSmtpConfig();
                    } else if (targetContent === 'admin-data-subcontent') {
                        this.loadDataEditInterface();
                    } else if (targetContent === 'admin-stats-subcontent') {
                        this.loadAdminStats();
                    }
                }
            });
        });
    }

    setupEventListeners() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSettings());
        });

        // Setup modal close handlers
        this.setupNutrientModalHandlers();
    }

    setupNutrientModalHandlers() {
        const modal = document.getElementById('nutrient-detail-modal');
        const closeBtn = document.getElementById('close-nutrient-modal');
        const closeBtnSecondary = document.getElementById('close-nutrient-modal-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (closeBtnSecondary) {
            closeBtnSecondary.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Close modal when clicking outside of it
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Close modal with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });

        // Export chart data button
        const exportBtn = document.getElementById('export-chart-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportNutrientData();
            });
        }
    }

    async updateDashboardFromData() {
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
        await this.updateFishTankSummary();
        
        // Update plant management interface
        this.updatePlantManagement();
        
        // Update recent water quality entry section
        this.updateRecentWaterQualityEntry();
        
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
        
        // Find the most recent entry that has actual data (not all null/empty values)
        for (const entry of this.dataRecords.waterQuality) {
            const hasData = entry.temperature || entry.ph || entry.dissolved_oxygen || 
                           entry.ammonia || entry.nitrite || entry.nitrate || 
                           entry.ec || entry.iron || entry.potassium || 
                           entry.calcium || entry.phosphorus || entry.magnesium;
            
            if (hasData) {
                return entry;
            }
        }
        
        // If no entries have data, return the most recent entry anyway
        return this.dataRecords.waterQuality[0];
    }

    updateRecentWaterQualityEntry() {
        const container = document.getElementById('recent-water-quality-entry');
        if (!container) return;

        const latestData = this.getLatestWaterQualityData();
        
        if (!latestData) {
            container.innerHTML = `
                <div class="no-data-message">
                    <p>No water quality data available. Add your first entry in the Data Entry tab.</p>
                </div>
            `;
            return;
        }

        const entryDate = new Date(latestData.date);
        const formattedDate = entryDate.toLocaleDateString() + ' ' + entryDate.toLocaleTimeString();
        
        // Check if this is the chronologically most recent entry
        const chronologicallyLatest = this.dataRecords.waterQuality[0];
        const isLatestEntry = latestData.id === chronologicallyLatest.id;
        const statusText = isLatestEntry ? 'Latest Entry' : 'Most Recent Entry with Data';

        container.innerHTML = `
            <div class="water-quality-entry">
                <div class="entry-header">
                    <div class="entry-title">
                        <h4>Water Quality - ${formattedDate}</h4>
                        <span class="status-badge ${isLatestEntry ? 'latest' : 'recent-data'}">${statusText}</span>
                    </div>
                    <div class="entry-actions">
                        <button class="edit-btn" onclick="app.editWaterQualityEntry(${latestData.id})">${SVGIcons.getIcon('edit', 'btn-icon-svg')}Edit</button>
                        <button class="delete-btn" onclick="app.deleteWaterQualityEntry(${latestData.id})">${SVGIcons.getIcon('delete', 'btn-icon-svg')}Delete</button>
                    </div>
                </div>
                <div class="entry-data">
                    <div class="data-grid">
                        <div class="data-item">
                            <span class="data-label">Temperature:</span>
                            <span class="data-value">${latestData.temperature ? latestData.temperature.toFixed(1) + '°C' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">pH Level:</span>
                            <span class="data-value">${latestData.ph ? latestData.ph.toFixed(1) : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Dissolved Oxygen:</span>
                            <span class="data-value">${latestData.dissolved_oxygen ? latestData.dissolved_oxygen.toFixed(1) + ' mg/L' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Ammonia:</span>
                            <span class="data-value">${latestData.ammonia ? latestData.ammonia.toFixed(2) + ' ppm' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Nitrite:</span>
                            <span class="data-value">${latestData.nitrite ? latestData.nitrite.toFixed(2) + ' ppm' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Nitrate:</span>
                            <span class="data-value">${latestData.nitrate ? latestData.nitrate.toFixed(1) + ' ppm' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">EC:</span>
                            <span class="data-value">${latestData.ec ? latestData.ec.toFixed(0) + ' µS/cm' : 'Not recorded'}</span>
                        </div>
                        ${latestData.notes ? `
                        <div class="data-item notes">
                            <span class="data-label">Notes:</span>
                            <span class="data-value">${latestData.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async editWaterQualityEntry(entryId) {
        // Switch to settings view, admin tab, and data edit sub-tab
        this.currentView = 'settings';
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('settings').classList.add('active');
        document.querySelector('[data-view="settings"]').classList.add('active');
        
        // Switch to admin settings tab
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
        document.getElementById('admin-settings-tab').classList.add('active');
        document.getElementById('admin-settings-content').classList.add('active');
        
        // Switch to data edit sub-tab
        document.querySelectorAll('.admin-subtab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-subcontent').forEach(c => c.classList.remove('active'));
        document.getElementById('admin-data-subtab').classList.add('active');
        document.getElementById('admin-data-subcontent').classList.add('active');

        // Wait a bit for the view to switch, then activate data edit tab
        setTimeout(() => {
            const dataEditTab = document.querySelector('[data-category="water-quality"]');
            if (dataEditTab) {
                // Activate water quality edit tab
                document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
                dataEditTab.classList.add('active');
                
                // Load the data edit interface
                this.loadDataEditInterface('water-quality');
                
                // Find and populate the specific entry for editing
                setTimeout(() => {
                    const editRows = document.querySelectorAll('.edit-row');
                    editRows.forEach(row => {
                        const editButton = row.querySelector('.edit-entry-btn');
                        if (editButton && editButton.onclick.toString().includes(entryId)) {
                            editButton.click();
                        }
                    });
                }, 500);
            }
        }, 200);
        
        this.showNotification('📝 Switched to Data Edit tab for water quality entry editing', 'info');
    }

    async deleteWaterQualityEntry(entryId) {
        if (!confirm('Are you sure you want to delete this water quality entry? This action cannot be undone.')) {
            return;
        }

        try {
            await this.makeApiCall(`/data/water-quality/${entryId}`, {
                method: 'DELETE'
            });
            
            // Reload data and update dashboard
            await this.loadDataRecords();
            await this.updateDashboardFromData();
            
            this.showNotification('Water quality entry deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete water quality entry:', error);
            this.showNotification('❌ Failed to delete water quality entry. Please try again.', 'error');
        }
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

    async updateFishTankSummary() {
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        const systemConfig = this.loadSystemConfig();
        
        // Load individual fish tank configurations
        if (this.activeSystemId) {
            try {
                const response = await this.makeApiCall(`/fish-tanks/system/${this.activeSystemId}`);
                systemConfig.fish_tanks = response.tanks || [];
            } catch (error) {
                console.error('Failed to load fish tank configurations:', error);
                systemConfig.fish_tanks = [];
            }
        }
        
        if (!systemConfig || systemConfig.system_name === 'No System Selected') {
            container.innerHTML = `
                <div class="no-system-message">
                    <p>Please select a system to view fish tank information.</p>
                </div>
            `;
            return;
        }

        // Get latest fish health data to calculate current fish count (prioritizes most recent)
        const latestFishData = this.getLatestFishHealthData();
        const fishCount = latestFishData ? latestFishData.count || 0 : 0;
        const mortality = latestFishData ? latestFishData.mortality || 0 : 0;
        const totalFish = fishCount;
        
        // Get fish health data with weight for density calculations (prioritizes weight data)
        const latestFishDataWithWeight = this.getLatestFishHealthDataWithWeight();
        
        // Get fish type for calculations
        const fishType = systemConfig.fish_type || 'Unknown';
        
        // Calculate stocking density based on weight (KG/m³)
        const fishVolume = systemConfig.total_fish_volume || 1000;
        const fishVolumeM3 = fishVolume / 1000; // Convert liters to cubic meters
        const averageWeight = latestFishDataWithWeight ? latestFishDataWithWeight.average_weight || 0 : 0;
        
        // Use estimated weight if no actual weight data is available
        let effectiveWeight = averageWeight;
        if (effectiveWeight === 0 && totalFish > 0) {
            // Provide reasonable estimates based on fish type for density calculation
            const estimatedWeights = {
                'tilapia': 250,  // 250g average for growing tilapia
                'trout': 200,    // 200g average for growing trout  
                'catfish': 300,  // 300g average for growing catfish
                'salmon': 350,   // 350g average for growing salmon
                'bass': 250      // 250g average for growing bass
            };
            effectiveWeight = estimatedWeights[fishType.toLowerCase()] || 250;
        }
        
        const totalWeightKg = (totalFish * effectiveWeight) / 1000; // Convert grams to kg
        
        // Current actual density and final harvest density  
        const actualDensity = fishVolumeM3 > 0 && totalWeightKg > 0 ? (totalWeightKg / fishVolumeM3).toFixed(1) : 'N/A';
        const isUsingEstimatedWeight = averageWeight === 0 && effectiveWeight > 0;
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
                    <div class="summary-value">${totalFish}</div>
                    <div class="summary-detail">Across ${systemConfig.fish_tank_count} tank${systemConfig.fish_tank_count > 1 ? 's' : ''}</div>
                </div>
                
                <div class="tank-summary-card">
                    <h3>Current Density</h3>
                    <div class="summary-value">${actualDensity} kg/m³</div>
                    <div class="density-progress-container">
                        <div class="density-progress-bar">
                            <div class="density-progress-fill ${densityStatus}" style="width: ${Math.min((actualDensity !== 'N/A' ? (parseFloat(actualDensity) / recommendedMaxDensity) * 100 : 0), 100)}%"></div>
                        </div>
                        <div class="density-progress-label">Max: ${recommendedMaxDensity} kg/m³</div>
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
                    <div class="summary-value">${fishVolumeM3}m³</div>
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
        
        // Always return the most recent record by date for fish count accuracy
        // Weight data prioritization is handled separately in density calculations
        return this.dataRecords.fishHealth[0];
    }
    
    getLatestFishHealthDataWithWeight() {
        if (this.dataRecords.fishHealth.length === 0) {
            return null;
        }
        
        // First try to get the latest record with valid weight data
        const recordWithWeight = this.dataRecords.fishHealth.find(record => 
            record.average_weight !== null && record.average_weight > 0
        );
        
        // If we have a record with weight data, use it
        if (recordWithWeight) {
            return recordWithWeight;
        }
        
        // Otherwise fall back to the latest record
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
        // Get latest feeding data from fish health entries
        const fishHealthData = this.dataRecords.fishHealth || [];
        
        // Find the most recent entry with feed_consumption data
        const feedingEntries = fishHealthData.filter(entry => entry.feed_consumption && entry.feed_consumption > 0);
        
        if (feedingEntries.length === 0) {
            return 'No feeding data recorded';
        }
        
        // Sort by date and get the most recent
        feedingEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestFeeding = feedingEntries[0];
        
        const feedTime = new Date(latestFeeding.date);
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
        if (!fishType) return densityLimits.default;
        return densityLimits[fishType.toLowerCase()] || densityLimits.default;
    }

    generateTankDetails(systemConfig, latestFishData) {
        let details = '';
        
        console.log('generateTankDetails called with latestFishData:', latestFishData);
        
        // Get individual tank configurations if available
        const tankConfigs = systemConfig.fish_tanks || [];
        
        for (let i = 1; i <= systemConfig.fish_tank_count; i++) {
            // Try to find the specific tank configuration
            const tankConfig = tankConfigs.find(tank => tank.tank_number === i);
            const tankVolume = tankConfig ? tankConfig.volume_liters : Math.round(systemConfig.total_fish_volume / systemConfig.fish_tank_count);
            const tankVolumeM3 = tankVolume / 1000;
            
            // Get fish health data specific to this tank
            // For now, we'll look for data where fish_tank_id matches the tank number
            // If no specific data exists, we'll check if the data is for tank 1 and this is the first/main tank
            const tankFishData = this.getTankSpecificFishData(i, latestFishData);
            const fishCount = tankFishData ? tankFishData.count || 0 : 0;
            const avgWeight = tankFishData ? tankFishData.average_weight || 0 : 0;
            
            console.log(`Tank ${i} Debug:`, {
                tankFishData,
                fishCount,
                avgWeight,
                latestFishData
            });
            
            const dailyFeed = this.calculateDailyFeedAmount(fishCount, avgWeight, systemConfig.fish_type);
            
            // Calculate actual density for this tank
            const tankBiomassKg = (fishCount * avgWeight) / 1000; // Convert grams to kg
            const actualDensity = tankVolumeM3 > 0 && tankBiomassKg > 0 ? (tankBiomassKg / tankVolumeM3).toFixed(1) : '0.0';
            const maxDensity = this.getRecommendedStockingDensity(systemConfig.fish_type);
            const densityPercentage = Math.min((parseFloat(actualDensity) / maxDensity) * 100, 100);
            const densityStatus = parseFloat(actualDensity) > maxDensity ? 'warning' : 'good';
            
            details += `
                <div class="tank-detail-card">
                    <div class="tank-detail-header">
                        <h5>Tank ${i}</h5>
                        <span class="tank-volume">${tankVolumeM3.toFixed(1)}m³</span>
                    </div>
                    <div class="tank-metrics">
                        <div class="tank-metric">
                            <span class="metric-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="width: 20px; height: 20px;"><path d="m54.988 41.94366a70.19837 70.19837 0 0 1 -.81409-8.09222 70.18137 70.18137 0 0 1 .81415-8.09235.82984.82984 0 0 0 -1.13495-.88818l-8.77484 3.69257c-3.42117-3.79948-9.97561-6.22548-16.93307-6.22548-9.77 0-18.39685 4.90967-19.1452 10.6911h2.40961a.82254.82254 0 0 1 -.00006 1.64478h-2.40955c.74835 5.78137 9.37524 10.691 19.1452 10.691 6.95746 0 13.5119-2.426 16.933-6.23371l8.7749 3.70075a.82975.82975 0 0 0 1.1349-.88826zm-37.82168-10.14819a1.2337 1.2337 0 0 1 .00006-2.46716 1.2337 1.2337 0 0 1 -.00006 2.46716zm12.33588 6.34882a3.30529 3.30529 0 0 1 -3.28144 3.28949c-.36651.053-4.22149-.81372-4.67108-.88806a.82114.82114 0 0 1 -1.53784-.3866 27.35956 27.35956 0 0 0 .02454-12.418.82327.82327 0 1 1 1.612-.329 27.93369 27.93369 0 0 1 .65789 8.47882 46.883 46.883 0 0 1 4.334-1.89154c.0965-1.40936-.68182-1.23773-.329-2.17932a2.45171 2.45171 0 0 0 .04944-2.43421.82209.82209 0 0 1 -.04938-.85534 2.4518 2.4518 0 0 0 .04938-2.43421.82142.82142 0 0 1 1.34869-.9375 4.00913 4.00913 0 0 1 .2467 3.74182 4.12593 4.12593 0 0 1 0 3.28956 4.0171 4.0171 0 0 1 .31257 2.0971 2.45534 2.45534 0 0 1 1.23358 2.13825zm3.38824-4.30929a4.12652 4.12652 0 0 1 0 3.28955 4.13961 4.13961 0 0 1 -.19739 3.69251.82046.82046 0 1 1 -1.44744-.773 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85528 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85529 2.45168 2.45168 0 0 0 .04937-2.43426.82211.82211 0 0 1 -.04937-.85535 2.45158 2.45158 0 0 0 .04937-2.4342.82062.82062 0 0 1 .20557-1.14313c1.09613-.79718 2.34338 1.5622 1.38989 3.94745a4.1265 4.1265 0 0 1 0 3.28954zm4.73694 3.69251a.82058.82058 0 0 1 -1.44738-.77312 2.45169 2.45169 0 0 0 .04932-2.4342.82187.82187 0 0 1 -.04932-.85529 2.45175 2.45175 0 0 0 .04932-2.43426.82059.82059 0 0 1 .20563-1.14313c1.09332-.79889 2.3446 1.5647 1.38989 3.94745a4.13966 4.13966 0 0 1 -.19746 3.69251zm4.72052-1.64478a.82427.82427 0 0 1 -1.45563-.77307 2.45165 2.45165 0 0 0 .04932-2.4342.82809.82809 0 0 1 .20563-1.14313c1.12921-.84806 2.51056 1.82552 1.20068 4.35036zm8.02655 2.90308a21.66 21.66 0 0 1 -2.24512-.78949.82119.82119 0 0 1 .57563-1.53791l1.95727.73194a.82646.82646 0 0 1 -.28778 1.59542zm0-4.11194h-1.135a.82252.82252 0 0 1 0-1.64478h1.135a.82252.82252 0 0 1 0 1.64474zm.28778-4.4903a21.6413 21.6413 0 0 1 -2.24512.78955.82646.82646 0 0 1 -.28778-1.59546l1.95728-.73193a.82116.82116 0 0 1 .57562 1.5378z" fill="#0051b1"/><path d="m26.68964 35.67712-4.58075 2.12177c-.05756.38647-.11512.76483-.181 1.14313l3.95575.81408a1.65689 1.65689 0 0 0 1.97375-1.61181v-1.71875a.82791.82791 0 0 0 -1.16775-.74842z" fill="#0051b1"/><path d="m39.89722 23.037c-6.78473-5.46887-16.81794-6.35706-17.30316-6.3982a.80749.80749 0 0 0 -.87171.68256l-.72369 4.21887a30.11141 30.11141 0 0 1 7.14654-.847 29.66566 29.66566 0 0 1 11.75202 2.34377z" fill="#0051b1"/><path d="m32 2a30 30 0 1 0 30 30 30.03414 30.03414 0 0 0 -30-30zm0 58.29218a28.29221 28.29221 0 1 1 28.29224-28.29218 28.32516 28.32516 0 0 1 -28.29224 28.29218z" fill="#0051b1"/></svg>
                            </span>
                            <div class="metric-info">
                                <span class="metric-value">${fishCount}</span>
                                <span class="metric-label">Fish</span>
                            </div>
                        </div>
                        <div class="tank-metric">
                            <span class="metric-icon">
                                <svg id="Nanny" enable-background="new 0 0 139 139" height="300" viewBox="0 0 139 139" width="300" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;"><g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)"><path d="m69.5 130.334c-33.544 0-60.834-27.29-60.834-60.834s27.29-60.834 60.834-60.834 60.834 27.29 60.834 60.834-27.29 60.834-60.834 60.834zm0-115.668c-30.235 0-54.834 24.599-54.834 54.834s24.599 54.834 54.834 54.834 54.834-24.599 54.834-54.834-24.599-54.834-54.834-54.834z" fill="#0051b1"/><path d="m85.775 49.992c-.941-4.668-3.851-8.723-8.024-11.107v-1.216c0-4.55-3.701-8.251-8.251-8.251s-8.251 3.701-8.251 8.251v1.216c-4.175 2.385-7.084 6.439-8.026 11.108-3.049 1.075-5.244 3.978-5.244 7.39v.645c0 2.697 1.37 5.081 3.45 6.492-.673 1.194-1.062 2.569-1.062 4.035v31.943c0 4.55 3.701 8.251 8.25 8.251h21.763c4.549 0 8.25-3.701 8.25-8.251v-31.944c0-1.466-.389-2.841-1.062-4.035 2.081-1.412 3.451-3.795 3.451-6.493v-.645c.002-3.412-2.194-6.314-5.244-7.389zm-31.796 7.39c0-.406.137-.779.36-1.084h30.32c.224.305.36.678.36 1.084v.645c0 1.015-.827 1.841-1.843 1.841h-27.354c-1.016 0-1.843-.826-1.843-1.841zm11.429-13.871 1.841-.771v-5.072c0-1.241 1.01-2.251 2.251-2.251s2.251 1.01 2.251 2.251v5.072l1.841.771c2.744 1.15 4.804 3.357 5.814 6.029h-19.813c1.011-2.672 3.07-4.878 5.815-6.029zm17.223 56.986c0 1.241-1.01 2.251-2.25 2.251h-21.763c-1.241 0-2.25-1.01-2.25-2.251v-6.582h7.465v-6h-7.465v-7.651h7.465v-6h-7.465v-5.71c0-1.241 1.009-2.25 2.25-2.25h21.763c1.24 0 2.25 1.009 2.25 2.25z" fill="#0051b1"/></g></svg>
                            </span>
                            <div class="metric-info">
                                <span class="metric-value">${dailyFeed}g</span>
                                <span class="metric-label">Daily Feed</span>
                            </div>
                        </div>
                        <div class="tank-metric">
                            <span class="metric-icon">
                                <svg height="300" viewBox="0 -27 512.0005 512" width="300" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;"><g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)"><path d="m497 295h-180c-4.996094 0-9.667969-2.488281-12.453125-6.640625-2.785156-4.148437-3.324219-9.414063-1.429687-14.039063l90-220c2.304687-5.636718 7.792968-9.320312 13.882812-9.320312s11.578125 3.683594 13.882812 9.320312l90 220c1.894532 4.625 1.355469 9.890626-1.429687 14.039063-2.785156 4.152344-7.453125 6.640625-12.453125 6.640625zm-157.65625-30h135.3125l-67.65625-165.382812zm0 0" fill="#c8d4df"/><path d="m195 295h-180c-4.996094 0-9.667969-2.488281-12.453125-6.640625-2.785156-4.148437-3.324219-9.414063-1.429687-14.039063l90-220c2.304687-5.636718 7.792968-9.320312 13.882812-9.320312s11.578125 3.683594 13.882812 9.320312l90 220c1.894532 4.625 1.355469 9.890626-1.429687 14.039063-2.785156 4.152344-7.453125 6.640625-12.453125 6.640625zm-157.65625-30h135.3125l-67.65625-165.382812zm0 0" fill="#d9e7f3"/><path d="m326 427h-55v-322c0-8.285156-6.714844-15-15-15s-15 6.714844-15 15v322h-55c-8.285156 0-15 6.714844-15 15s6.714844 15 15 15h140c8.285156 0 15-6.714844 15-15s-6.714844-15-15-15zm0 0" fill="#0051b1"/><path d="m326 457c8.285156 0 15-6.714844 15-15s-6.714844-15-15-15h-55v-322c0-8.285156-6.714844-15-15-15v367zm0 0" fill="#0051b1"/><path d="m407 75h-106c-8.285156 0-15-6.714844-15-15s6.714844-15 15-15h106c8.285156 0 15 6.714844 15 15s-6.714844 15-15 15zm0 0" fill="#c8d4df"/><path d="m211 75h-106c-8.285156 0-15-6.714844-15-15s6.714844-15 15-15h106c8.285156 0 15 6.714844 15 15s-6.714844 15-15 15zm0 0" fill="#d9e7f3"/><g fill="#ffc300"><path d="m407 375c-57.898438 0-105-42.617188-105-95 0-8.285156 6.714844-15 15-15h180c8.285156 0 15 6.714844 15 15 0 52.382812-47.101562 95-105 95zm0 0" fill="#80fb7b"/><path d="m105 375c-57.898438 0-105-42.617188-105-95 0-8.285156 6.714844-15 15-15h180c8.285156 0 15 6.714844 15 15 0 52.382812-47.101562 95-105 95zm0 0" fill="#80fb7b"/><path d="m256 120c-33.082031 0-60-26.914062-60-60 0-33.082031 26.917969-60 60-60 33.085938 0 60 26.917969 60 60 0 33.085938-26.914062 60-60 60zm0 0" fill="#80fb7b"/></g><path d="m256 0v120c33.085938 0 60-26.914062 60-60 0-33.082031-26.914062-60-60-60zm0 0" fill="#80fb7b"/><path d="m497 265h-90v110c57.898438 0 105-42.617188 105-95 0-8.285156-6.714844-15-15-15zm0 0" fill="#80fb7b"/><path d="m195 265h-90v110c57.898438 0 105-42.617188 105-95 0-8.285156-6.714844-15-15-15zm0 0" fill="#80fb7b"/></g></svg>
                            </span>
                            <div class="metric-info">
                                <span class="metric-value">${actualDensity} kg/m³</span>
                                <span class="metric-label">Density</span>
                            </div>
                        </div>
                    </div>
                    <div class="tank-density-progress">
                        <div class="density-progress-bar">
                            <div class="density-progress-fill ${densityStatus}" style="width: ${densityPercentage}%"></div>
                        </div>
                        <span class="density-progress-text">${densityPercentage.toFixed(0)}% of max (${maxDensity} kg/m³)</span>
                    </div>
                </div>
            `;
        }
        return details;
    }

    getTankSpecificFishData(tankNumber, latestFishData) {
        // If we have fish health data, check if it's specific to this tank
        if (!latestFishData) return null;
        
        // For now, most fish health data is entered for tank 1 (fish_tank_id = 1)
        // If this is tank 1, return the data as-is
        // For other tanks, we'll need to check if there's specific data or return null
        if (tankNumber === 1) {
            return latestFishData;
        }
        
        // For tanks 2-7, we'll need to check if there's specific tank data
        // Since most systems track fish collectively, we'll return null for empty tanks for now
        // This can be enhanced later to support individual tank tracking
        return null;
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
        
        // Calculate fish density data over time - only use entries with actual weight data
        const fishHealthData = this.dataRecords.fishHealth || [];
        const systemConfig = this.loadSystemConfig();
        const fishVolumeM3 = (systemConfig?.total_fish_volume || 1000) / 1000;
        
        // Filter to only include entries with valid weight data
        const validHealthData = fishHealthData.filter(entry => 
            entry.average_weight !== null && entry.average_weight > 0 && entry.count > 0
        );
        
        // Use simple data structure without time scale
        const chartData = validHealthData.map(entry => {
            const totalWeight = (entry.count * entry.average_weight) / 1000; // Convert to kg
            const density = fishVolumeM3 > 0 ? totalWeight / fishVolumeM3 : 0;
            return density;
        }).reverse(); // Reverse to show chronological order
        
        const labels = validHealthData.map(entry => {
            return new Date(entry.date).toLocaleDateString();
        }).reverse();

        // Create chart
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
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
            await this.updateDashboardFromData();
            
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
            await this.updateDashboardFromData();
            
            // Refresh the edit interface
            const activeTab = document.querySelector('.edit-tab.active');
            this.loadDataEditInterface(activeTab.dataset.category);
            
            this.showNotification(`${category.replace('-', ' ')} entry deleted successfully!`, 'success');
        } catch (error) {
            console.error('Failed to delete data entry:', error);
            this.showNotification('❌ Failed to delete entry. Please try again.', 'error');
        }
    }

    updatePlantManagement() {
        // Only update plant overview if the overview tab is active
        const overviewTab = document.getElementById('plant-overview-tab');
        const overviewContent = document.getElementById('plant-overview-content');
        
        if (overviewTab && overviewTab.classList.contains('active') && overviewContent && overviewContent.classList.contains('active')) {
            this.updatePlantOverview().catch(console.error);
        }
        
        this.updateGrowBeds();
        this.updatePlantGrowthHistoryDisplay();
        this.updatePlantRecommendations();
        this.updateRecentPlantEntries();
    }

    updatePlantNutrientData() {
        const plantData = this.dataRecords.plantGrowth || [];
        const crops = this.getCurrentCrops(plantData);
        
        // Get the most recent value for each nutrient (may come from different entries)
        const recentNutrients = this.getLatestNutrientValues();
        
        // Update plant nutrient displays with latest readings and status indicators
        this.updateNutrientStatus('nitrate', recentNutrients.nitrate, this.analyzeNitrate(recentNutrients.nitrate, crops));
        this.updateNutrientStatus('phosphorus', recentNutrients.phosphorus, this.analyzePhosphorus(recentNutrients.phosphorus, crops));
        this.updateNutrientStatus('potassium', recentNutrients.potassium, this.analyzePotassium(recentNutrients.potassium, crops));
        this.updateNutrientStatus('iron', recentNutrients.iron, this.analyzeIron(recentNutrients.iron, crops));
        this.updateNutrientStatus('calcium', recentNutrients.calcium, this.analyzeCalcium(recentNutrients.calcium, crops));
        this.updateNutrientStatus('ph', recentNutrients.ph, this.analyzePH(recentNutrients.ph, crops));
        
        // Update nutrient charts
        this.updateNutrientCharts();
        
        // Update nutrient recommendations
        this.updateNutrientRecommendations();
    }

    getLatestNutrientValues() {
        const waterQualityData = this.dataRecords.waterQuality || [];
        
        if (waterQualityData.length === 0) {
            return {
                nitrate: null,
                phosphorus: null,
                potassium: null,
                iron: null,
                calcium: null,
                ph: null
            };
        }
        
        // Sort by date (most recent first)
        const sortedData = [...waterQualityData].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const nutrients = {
            nitrate: null,
            phosphorus: null,
            potassium: null,
            iron: null,
            calcium: null,
            ph: null
        };
        
        // Find the most recent non-null/non-zero value for each nutrient
        for (const entry of sortedData) {
            if (nutrients.nitrate === null && entry.nitrate !== null && entry.nitrate !== undefined && entry.nitrate > 0) {
                nutrients.nitrate = entry.nitrate;
            }
            if (nutrients.phosphorus === null && entry.phosphorus !== null && entry.phosphorus !== undefined && entry.phosphorus > 0) {
                nutrients.phosphorus = entry.phosphorus;
            }
            if (nutrients.potassium === null && entry.potassium !== null && entry.potassium !== undefined && entry.potassium > 0) {
                nutrients.potassium = entry.potassium;
            }
            if (nutrients.iron === null && entry.iron !== null && entry.iron !== undefined && entry.iron > 0) {
                nutrients.iron = entry.iron;
            }
            if (nutrients.calcium === null && entry.calcium !== null && entry.calcium !== undefined && entry.calcium > 0) {
                nutrients.calcium = entry.calcium;
            }
            if (nutrients.ph === null && entry.ph !== null && entry.ph !== undefined && entry.ph > 0) {
                nutrients.ph = entry.ph;
            }
            
            // Stop early if we've found all nutrients
            if (Object.values(nutrients).every(value => value !== null)) {
                break;
            }
        }
        
        return nutrients;
    }


    updateNutrientStatus(nutrientName, value, analysis) {
        const valueElement = document.getElementById(`plant-${nutrientName}`);
        const indicatorElement = document.getElementById(`${nutrientName}-indicator`);
        const statusTextElement = document.getElementById(`${nutrientName}-status-text`);
        
        if (!valueElement || !indicatorElement || !statusTextElement) {
            console.warn(`Missing elements for ${nutrientName} status update`);
            return;
        }
        
        // Debug: uncomment to troubleshoot nutrient status updates
        // console.log(`Updating ${nutrientName}: value=${value}, analysis=`, analysis);
        
        if (value === null || value === undefined) {
            // No data state
            valueElement.textContent = 'No data';
            indicatorElement.className = 'status-indicator no-data';
            statusTextElement.className = 'status-text no-data';
            statusTextElement.textContent = 'No data';
        } else {
            // Update value display
            if (nutrientName === 'ph') {
                valueElement.textContent = value.toFixed(1);
            } else {
                valueElement.textContent = `${value.toFixed(1)} mg/L`;
            }
            
            // Update status indicator based on analysis
            if (!analysis) {
                // Value exists but no analysis - show as unknown
                indicatorElement.className = 'status-indicator no-data';
                statusTextElement.className = 'status-text no-data';
                statusTextElement.textContent = 'Unknown';
            } else {
                const statusClass = analysis.status || 'no-data';
                indicatorElement.className = `status-indicator ${statusClass}`;
                statusTextElement.className = `status-text ${statusClass}`;
                
                // Set status text based on analysis result
                const statusTexts = {
                    'optimal': 'Optimal',
                    'warning': 'Low',
                    'critical': 'Critical',
                    'caution': 'High'
                };
                statusTextElement.textContent = statusTexts[statusClass] || 'Unknown';
            }
        }
    }

    updateRecentPlantEntries() {
        console.log('🌱 updateRecentPlantEntries called');
        try {
            this.updateRecentPlantEntry();
            this.updateRecentHarvestEntry();
            console.log('✅ Recent plant entries updated successfully');
        } catch (error) {
            console.error('❌ Error updating recent plant entries:', error);
        }
    }

    updateRecentPlantEntry() {
        console.log('🌱 updateRecentPlantEntry called');
        const container = document.getElementById('recent-plant-entry');
        if (!container) {
            console.log('❌ Recent plant entry container not found');
            return;
        }

        const latestPlantData = this.getLatestPlantData('planting');
        console.log('🌱 Latest plant data:', latestPlantData);
        
        if (!latestPlantData) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h5>Recent Planting/Transplant</h5>
                    <p>No planting data available. Record your first planting above.</p>
                </div>
            `;
            return;
        }

        const entryDate = new Date(latestPlantData.date);
        const formattedDate = entryDate.toLocaleDateString() + ' ' + entryDate.toLocaleTimeString();

        container.innerHTML = `
            <div class="plant-entry">
                <div class="entry-header">
                    <div class="entry-title">
                        <h5>Latest Planting - ${formattedDate}</h5>
                        <span class="status-badge latest">LATEST PLANTING</span>
                    </div>
                    <div class="entry-actions">
                        <button class="edit-btn" onclick="app.editPlantEntry(${latestPlantData.id})">${SVGIcons.getIcon('edit', 'btn-icon-svg')}Edit</button>
                        <button class="delete-btn" onclick="app.deletePlantEntry(${latestPlantData.id})">${SVGIcons.getIcon('delete', 'btn-icon-svg')}Delete</button>
                    </div>
                </div>
                <div class="entry-data">
                    <div class="data-grid">
                        <div class="data-item">
                            <span class="data-label">Crop Type:</span>
                            <span class="data-value">${latestPlantData.crop_type || 'Not specified'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Plants Added:</span>
                            <span class="data-value">${latestPlantData.new_seedlings || latestPlantData.count || 0}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Growth Stage:</span>
                            <span class="data-value">${latestPlantData.growth_stage || 'Not specified'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Grow Bed:</span>
                            <span class="data-value">Bed ${latestPlantData.grow_bed_id || 'Not specified'}</span>
                        </div>
                        ${latestPlantData.notes ? `
                        <div class="data-item notes">
                            <span class="data-label">Notes:</span>
                            <span class="data-value">${latestPlantData.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    updateRecentHarvestEntry() {
        console.log('🌾 updateRecentHarvestEntry called');
        const container = document.getElementById('recent-harvest-entry');
        if (!container) {
            console.log('❌ Recent harvest entry container not found');
            return;
        }

        const latestHarvestData = this.getLatestPlantData('harvest');
        console.log('🌾 Latest harvest data:', latestHarvestData);
        
        if (!latestHarvestData) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h5>Recent Harvest</h5>
                    <p>No harvest data available. Record your first harvest above.</p>
                </div>
            `;
            return;
        }

        const entryDate = new Date(latestHarvestData.date);
        const formattedDate = entryDate.toLocaleDateString() + ' ' + entryDate.toLocaleTimeString();

        container.innerHTML = `
            <div class="plant-entry">
                <div class="entry-header">
                    <div class="entry-title">
                        <h5>Latest Harvest - ${formattedDate}</h5>
                        <span class="status-badge harvest">LATEST HARVEST</span>
                    </div>
                    <div class="entry-actions">
                        <button class="edit-btn" onclick="app.editPlantEntry(${latestHarvestData.id})">${SVGIcons.getIcon('edit', 'btn-icon-svg')}Edit</button>
                        <button class="delete-btn" onclick="app.deletePlantEntry(${latestHarvestData.id})">${SVGIcons.getIcon('delete', 'btn-icon-svg')}Delete</button>
                    </div>
                </div>
                <div class="entry-data">
                    <div class="data-grid">
                        <div class="data-item">
                            <span class="data-label">Crop Type:</span>
                            <span class="data-value">${latestHarvestData.crop_type || 'Not specified'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Plants Harvested:</span>
                            <span class="data-value">${latestHarvestData.plants_harvested || 0}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Harvest Weight:</span>
                            <span class="data-value">${latestHarvestData.harvest_weight ? latestHarvestData.harvest_weight + ' kg' : 'Not recorded'}</span>
                        </div>
                        <div class="data-item">
                            <span class="data-label">Grow Bed:</span>
                            <span class="data-value">Bed ${latestHarvestData.grow_bed_id || 'Not specified'}</span>
                        </div>
                        ${latestHarvestData.notes ? `
                        <div class="data-item notes">
                            <span class="data-label">Notes:</span>
                            <span class="data-value">${latestHarvestData.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getLatestPlantData(type) {
        console.log(`📊 getLatestPlantData called for type: ${type}`);
        console.log('📊 Plant growth records available:', this.dataRecords.plantGrowth ? this.dataRecords.plantGrowth.length : 0);
        
        if (!this.dataRecords.plantGrowth || this.dataRecords.plantGrowth.length === 0) {
            console.log('📊 No plant growth data available');
            return null;
        }

        // Filter by type: planting entries have new_seedlings > 0, harvest entries have plants_harvested > 0
        const filteredData = this.dataRecords.plantGrowth.filter(entry => {
            if (type === 'planting') {
                return entry.new_seedlings > 0;
            } else if (type === 'harvest') {
                return entry.plants_harvested > 0;
            }
            return false;
        });

        console.log(`📊 Filtered data for ${type}:`, filteredData.length, 'entries');

        if (filteredData.length === 0) {
            console.log(`📊 No ${type} data found`);
            return null;
        }

        // Return the most recent entry (data is ordered DESC by date)
        const latestEntry = filteredData[0];
        console.log(`📊 Latest ${type} entry:`, latestEntry);
        return latestEntry;
    }

    async editPlantEntry(entryId) {
        // Switch to settings view, admin tab, and data edit sub-tab
        this.currentView = 'settings';
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('settings').classList.add('active');
        document.querySelector('[data-view="settings"]').classList.add('active');
        
        // Switch to admin settings tab
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
        document.getElementById('admin-settings-tab').classList.add('active');
        document.getElementById('admin-settings-content').classList.add('active');
        
        // Switch to data edit sub-tab
        document.querySelectorAll('.admin-subtab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-subcontent').forEach(c => c.classList.remove('active'));
        document.getElementById('admin-data-subtab').classList.add('active');
        document.getElementById('admin-data-subcontent').classList.add('active');

        // Wait a bit for the view to switch, then activate data edit tab
        setTimeout(() => {
            const dataEditTab = document.querySelector('[data-category="plant-growth"]');
            if (dataEditTab) {
                // Activate plant growth edit tab
                document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
                dataEditTab.classList.add('active');
                
                // Load the data edit interface
                this.loadDataEditInterface('plant-growth');
                
                // Find and populate the specific entry for editing
                setTimeout(() => {
                    const editRows = document.querySelectorAll('.edit-row');
                    editRows.forEach(row => {
                        const editButton = row.querySelector('.edit-entry-btn');
                        if (editButton && editButton.onclick.toString().includes(entryId)) {
                            editButton.click();
                        }
                    });
                }, 500);
            }
        }, 200);
        
        this.showNotification('📝 Switched to Data Edit tab for plant entry editing', 'info');
    }

    async deletePlantEntry(entryId) {
        if (!confirm('Are you sure you want to delete this plant entry? This action cannot be undone.')) {
            return;
        }

        try {
            await this.makeApiCall(`/data/plant-growth/${entryId}`, {
                method: 'DELETE'
            });
            
            // Reload data and update displays
            await this.loadDataRecords();
            await this.updateDashboardFromData();
            
            this.showNotification('Plant entry deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete plant entry:', error);
            this.showNotification('❌ Failed to delete plant entry. Please try again.', 'error');
        }
    }

    updateNutrientCharts() {
        // Get historical water quality data for charts
        const waterQualityData = this.dataRecords.waterQuality || [];
        
        // Prepare data for charts (last 7 days)
        const recentData = waterQualityData.slice(0, 7).reverse();
        const labels = recentData.map(entry => new Date(entry.date).toLocaleDateString());
        
        // Nitrate chart
        this.createOrUpdateNutrientChart('nitrate-chart', 'Nitrate (NO₃)', labels, 
            recentData.map(entry => entry.nitrate || 0), '#4CAF50');
        
        // Phosphorus chart
        this.createOrUpdateNutrientChart('phosphorus-chart', 'Phosphorus (P)', labels, 
            recentData.map(entry => entry.phosphorus || 0), '#FF9800');
        
        // Potassium chart
        this.createOrUpdateNutrientChart('potassium-chart', 'Potassium (K)', labels, 
            recentData.map(entry => entry.potassium || 0), '#7baaee');
        
        // Iron chart
        this.createOrUpdateNutrientChart('iron-chart', 'Iron (Fe)', labels, 
            recentData.map(entry => entry.iron || 0), '#80fb7d');
        
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
                },
                onClick: (event, elements) => {
                    this.openNutrientModal(canvasId, label, labels, data, color);
                }
            }
        });
        
        // Add cursor pointer to indicate clickability
        ctx.style.cursor = 'pointer';
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
        
        // Nitrate Recommendations
        const nitrateRec = this.analyzeNitrate(data.nitrate, crops);
        if (nitrateRec) recommendations.push(nitrateRec);
        
        // Phosphorus Recommendations
        const phosphorusRec = this.analyzePhosphorus(data.phosphorus, crops);
        if (phosphorusRec) recommendations.push(phosphorusRec);
        
        // Potassium Recommendations
        const potassiumRec = this.analyzePotassium(data.potassium, crops);
        if (potassiumRec) recommendations.push(potassiumRec);
        
        // Iron Recommendations
        const ironRec = this.analyzeIron(data.iron, crops);
        if (ironRec) recommendations.push(ironRec);
        
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
            status = 'caution';
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
        if (iron === null || iron === undefined) return null;
        
        const optimalRange = this.getCropNutrientRange(crops, 'fe');
        let status, icon, action, content;
        
        if (iron < optimalRange.min * 0.5) {
            status = 'critical';
            icon = '🔴';
            action = 'Add iron chelate supplement';
            content = `Iron is critically low at ${iron.toFixed(1)} mg/L. Plants will show yellowing leaves (chlorosis). Target: ${optimalRange.min}-${optimalRange.max} mg/L.`;
        } else if (iron < optimalRange.min) {
            status = 'warning';
            icon = '🟡';
            action = 'Consider iron supplementation';
            content = `Iron is low at ${iron.toFixed(1)} mg/L. Target range for your crops: ${optimalRange.min}-${optimalRange.max} mg/L.`;
        } else if (iron > optimalRange.max * 2) {
            status = 'caution';
            icon = '🟠';
            action = 'Reduce iron inputs';
            content = `Iron is high at ${iron.toFixed(1)} mg/L. Excessive iron can block other nutrient uptake. Target: ${optimalRange.min}-${optimalRange.max} mg/L.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Iron is optimal at ${iron.toFixed(1)} mg/L for your crop mix. Plants have good access for chlorophyll synthesis.`;
        }
        
        return {
            title: 'Iron (Fe)',
            status,
            icon,
            level: `Current: ${iron.toFixed(1)} mg/L`,
            content,
            action,
            cropNote: `Target for your crops: ${optimalRange.min}-${optimalRange.max} mg/L`
        };
    }

    analyzePotassium(potassium, crops) {
        if (potassium === null || potassium === undefined) return null;
        
        // Use proper aquaponics potassium ranges (10-50 mg/L is typical for aquaponics)
        // These ranges are based on aquaponics best practices
        let optimalMin = 10;  // Minimum for plant growth
        let optimalMax = 40;  // Maximum before potential issues
        
        // Adjust range slightly based on crop types
        const fruitingPlants = ['tomato', 'cucumber', 'pepper', 'strawberry', 'eggplant'];
        const hasFruitingPlants = crops.some(crop => fruitingPlants.includes(crop.toLowerCase()));
        
        if (hasFruitingPlants) {
            // Fruiting plants need more potassium for fruit development
            optimalMin = 15;
            optimalMax = 50;
        }
        
        let status, icon, action, content;
        
        if (potassium < 5) {
            status = 'critical';
            icon = '🔴';
            action = 'Add potassium supplement or increase fish feeding';
            content = `Potassium is critically low at ${potassium.toFixed(0)} mg/L. Plants need K for fruit development and disease resistance.`;
        } else if (potassium < optimalMin) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase potassium gradually';
            content = `Potassium is low at ${potassium.toFixed(0)} mg/L. Target range is ${optimalMin}-${optimalMax} mg/L for your crops.`;
        } else if (potassium > 80) {
            status = 'caution';
            icon = '🟠';
            action = 'Reduce potassium inputs';
            content = `Potassium is high at ${potassium.toFixed(0)} mg/L. Excessive K can interfere with calcium and magnesium uptake.`;
        } else if (potassium > optimalMax) {
            status = 'caution';
            icon = '⚠️';
            action = 'Monitor potassium levels';
            content = `Potassium is slightly high at ${potassium.toFixed(0)} mg/L. Consider reducing supplementation.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Potassium is optimal at ${potassium.toFixed(0)} mg/L for your crop mix. Plants have good access for metabolism and fruit quality.`;
        }
        
        return {
            title: 'Potassium (K)',
            status,
            icon,
            level: `Current: ${potassium.toFixed(0)} mg/L`,
            content,
            action,
            cropNote: `Target range: ${optimalMin}-${optimalMax} mg/L for ${crops.join(', ')}`
        };
    }

    analyzeCalcium(calcium, crops) {
        if (calcium === null || calcium === undefined) return null;
        
        // Use proper aquaponics calcium ranges (20-80 mg/L is typical for aquaponics)
        // These ranges are based on aquaponics best practices
        let optimalMin = 20;  // Minimum for plant growth
        let optimalMax = 60;  // Maximum before potential issues
        
        // Adjust range slightly based on crop types
        const fruitingPlants = ['tomato', 'cucumber', 'pepper', 'strawberry', 'eggplant'];
        const hasFruitingPlants = crops.some(crop => fruitingPlants.includes(crop.toLowerCase()));
        
        if (hasFruitingPlants) {
            // Fruiting plants need more calcium to prevent blossom end rot
            optimalMin = 30;
            optimalMax = 80;
        }
        
        let status, icon, action, content;
        
        if (calcium < 10) {
            status = 'critical';
            icon = '🔴';
            action = 'Add calcium supplement immediately';
            content = `Calcium is critically low at ${calcium.toFixed(0)} mg/L. Plants will develop weak cell walls and blossom end rot.`;
        } else if (calcium < optimalMin) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase calcium levels';
            content = `Calcium is low at ${calcium.toFixed(0)} mg/L. Target range is ${optimalMin}-${optimalMax} mg/L for your crops.`;
        } else if (calcium > 120) {
            status = 'caution';
            icon = '🟠';
            action = 'Reduce calcium inputs';
            content = `Calcium is high at ${calcium.toFixed(0)} mg/L. Very high Ca can reduce uptake of magnesium and other nutrients.`;
        } else if (calcium > optimalMax) {
            status = 'caution';
            icon = '⚠️';
            action = 'Monitor calcium levels';
            content = `Calcium is slightly high at ${calcium.toFixed(0)} mg/L. Consider reducing supplementation.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Calcium is optimal at ${calcium.toFixed(0)} mg/L for your crop mix. Plants have strong cell wall development.`;
        }
        
        return {
            title: 'Calcium (Ca)',
            status,
            icon,
            level: `Current: ${calcium.toFixed(0)} mg/L`,
            content,
            action,
            cropNote: `Target range: ${optimalMin}-${optimalMax} mg/L for ${crops.join(', ')}`
        };
    }

    analyzeNitrate(nitrate, crops) {
        if (nitrate === null || nitrate === undefined) return null;
        
        // Use proper aquaponics nitrate ranges (5-150 mg/L is typical for aquaponics)
        // These ranges are based on aquaponics best practices, not conversion from nitrogen targets
        let optimalMin = 10;  // Minimum for plant growth
        let optimalMax = 80;  // Maximum before potential issues
        
        // Adjust range slightly based on crop types
        const leafyGreens = ['lettuce', 'spinach', 'kale', 'swiss_chard', 'arugula', 'watercress'];
        const fruitingPlants = ['tomato', 'cucumber', 'pepper', 'strawberry', 'eggplant'];
        
        const hasLeafyGreens = crops.some(crop => leafyGreens.includes(crop.toLowerCase()));
        const hasFruitingPlants = crops.some(crop => fruitingPlants.includes(crop.toLowerCase()));
        
        if (hasLeafyGreens && !hasFruitingPlants) {
            // Leafy greens prefer lower nitrate levels
            optimalMin = 10;
            optimalMax = 60;
        } else if (hasFruitingPlants) {
            // Fruiting plants can handle higher nitrate levels
            optimalMin = 20;
            optimalMax = 100;
        }
        
        let status, icon, action, content;
        
        if (nitrate < 5) {
            status = 'critical';
            icon = '🔴';
            action = 'Increase fish feeding or check system balance';
            content = `Nitrate is critically low at ${nitrate.toFixed(1)} mg/L. Plants need adequate nitrate for proper growth.`;
        } else if (nitrate < optimalMin) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase nitrate levels gradually';
            content = `Nitrate is below optimal at ${nitrate.toFixed(1)} mg/L. Target range is ${optimalMin}-${optimalMax} mg/L for your crops.`;
        } else if (nitrate > 150) {
            status = 'warning';
            icon = '🟠';
            action = 'Reduce feeding or increase water changes';
            content = `Nitrate is excessively high at ${nitrate.toFixed(1)} mg/L. This can stress fish and cause algae growth.`;
        } else if (nitrate > optimalMax) {
            status = 'caution';
            icon = '⚠️';
            action = 'Monitor nitrate levels';
            content = `Nitrate is slightly high at ${nitrate.toFixed(1)} mg/L. Consider reducing fish feeding or adding more plants.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Nitrate is optimal at ${nitrate.toFixed(1)} mg/L. Plants have excellent nitrate availability for growth.`;
        }
        
        return {
            title: 'Nitrate (NO₃)',
            status,
            icon,
            level: `Current: ${nitrate.toFixed(1)} mg/L`,
            content,
            action,
            cropNote: `Target range: ${optimalMin}-${optimalMax} mg/L for ${crops.join(', ')}`
        };
    }

    analyzePhosphorus(phosphorus, crops) {
        if (phosphorus === null || phosphorus === undefined) return null;
        
        const optimalRange = this.getCropNutrientRange(crops, 'p');
        let status, icon, action, content;
        
        if (phosphorus < optimalRange.min * 0.5) {
            status = 'critical';
            icon = '🔴';
            action = 'Add phosphorus supplement';
            content = `Phosphorus is critically low at ${phosphorus.toFixed(1)} mg/L. Plants will have poor root development and flowering.`;
        } else if (phosphorus < optimalRange.min) {
            status = 'warning';
            icon = '🟡';
            action = 'Increase phosphorus levels';
            content = `Phosphorus is below optimal at ${phosphorus.toFixed(1)} mg/L. Target range is ${optimalRange.min}-${optimalRange.max} mg/L for your crops.`;
        } else if (phosphorus > optimalRange.max * 1.5) {
            status = 'warning';
            icon = '🟠';
            action = 'Reduce phosphorus input';
            content = `Phosphorus is excessively high at ${phosphorus.toFixed(1)} mg/L. This can cause nutrient lockout and algae growth.`;
        } else if (phosphorus > optimalRange.max) {
            status = 'caution';
            icon = '⚠️';
            action = 'Monitor phosphorus levels';
            content = `Phosphorus is slightly high at ${phosphorus.toFixed(1)} mg/L. Monitor for potential nutrient imbalances.`;
        } else {
            status = 'optimal';
            icon = '✅';
            action = 'Maintain current levels';
            content = `Phosphorus is optimal at ${phosphorus.toFixed(1)} mg/L. Plants have strong root and flower development.`;
        }
        
        return {
            title: 'Phosphorus (P)',
            status,
            icon,
            level: `Current: ${phosphorus.toFixed(1)} mg/L`,
            content,
            action,
            cropNote: `Optimal range: ${optimalRange.min}-${optimalRange.max} mg/L for ${crops.join(', ')}`
        };
    }

    getCropNutrientRange(crops, nutrient) {
        let minValues = [];
        let maxValues = [];
        
        crops.forEach(crop => {
            const cropData = this.cropTargets[crop.toLowerCase()];
            if (cropData && cropData[nutrient]) {
                minValues.push(cropData[nutrient] * 0.8); // 80% of target as minimum
                maxValues.push(cropData[nutrient] * 1.2); // 120% of target as maximum
            }
        });
        
        // If no specific crop data found, use general ranges
        if (minValues.length === 0) {
            const generalRanges = {
                n: { min: 50, max: 100 },
                p: { min: 15, max: 30 },
                k: { min: 80, max: 180 },
                ca: { min: 60, max: 120 },
                mg: { min: 12, max: 25 },
                fe: { min: 1.0, max: 2.5 }
            };
            return generalRanges[nutrient] || { min: 0, max: 100 };
        }
        
        return {
            min: Math.min(...minValues),
            max: Math.max(...maxValues)
        };
    }

    generateSystemRecommendation(data, crops) {
        const issues = [];
        const strengths = [];
        
        // Analyze overall system health
        if (data.ph && (data.ph < 5.5 || data.ph > 8.0)) issues.push('pH imbalance');
        if (data.iron && data.iron < 0.1) issues.push('iron deficiency');
        if (data.potassium && data.potassium < 40) issues.push('potassium shortage');
        if (data.calcium && data.calcium < 50) issues.push('calcium deficiency');
        
        if (data.ph && data.ph >= 6.0 && data.ph <= 7.0) strengths.push('optimal pH');
        if (data.iron && data.iron >= 0.3 && data.iron <= 2.0) strengths.push('good iron levels');
        if (data.potassium && data.potassium >= 40 && data.potassium <= 70) strengths.push('adequate potassium');
        if (data.calcium && data.calcium >= 50 && data.calcium <= 100) strengths.push('sufficient calcium');
        
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
        let minValues = [];
        let maxValues = [];
        
        crops.forEach(crop => {
            const cropData = this.cropTargets[crop.toLowerCase()];
            if (cropData && cropData.ph_min && cropData.ph_max) {
                minValues.push(cropData.ph_min);
                maxValues.push(cropData.ph_max);
            }
        });
        
        if (minValues.length === 0) {
            // Default aquaponics pH range
            return { min: 6.0, max: 6.8 };
        }
        
        if (crops.length === 1) {
            return { min: minValues[0], max: maxValues[0] };
        }
        
        // For multiple crops, find safe overlap
        return { 
            min: Math.max(...minValues), 
            max: Math.min(...maxValues) 
        };
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

    openNutrientModal(canvasId, label, labels, data, color) {
        console.log('Opening nutrient modal:', { canvasId, label, labels, data, color });
        const modal = document.getElementById('nutrient-detail-modal');
        if (!modal) {
            console.error('Modal element not found');
            return;
        }

        const nutrientName = label.toLowerCase().replace(/\s+/g, '-');
        const currentValue = data[data.length - 1];
        const previousValue = data.length > 1 ? data[data.length - 2] : null;
        const trend = previousValue ? (currentValue > previousValue ? 'increasing' : 'decreasing') : 'stable';
        
        console.log('Modal data processed:', { nutrientName, currentValue, previousValue, trend });
        
        // Calculate some basic statistics
        const minValue = Math.min(...data.filter(val => val !== null && val !== undefined));
        const maxValue = Math.max(...data.filter(val => val !== null && val !== undefined));
        const avgValue = data.reduce((sum, val) => sum + (val || 0), 0) / data.length;

        // Get optimal ranges based on nutrient type
        const optimalRange = this.getNutrientOptimalRange(nutrientName);
        const status = this.getNutrientStatus(currentValue, optimalRange);

        document.getElementById('nutrient-modal-title').textContent = label;
        document.getElementById('nutrient-modal-current').textContent = currentValue ? currentValue.toFixed(1) : 'No data';
        document.getElementById('nutrient-modal-trend').textContent = trend;
        document.getElementById('nutrient-modal-trend').className = `trend ${trend}`;

        // Update optimal range
        if (optimalRange) {
            document.getElementById('nutrient-modal-optimal').textContent = `${optimalRange.min} - ${optimalRange.max}`;
        } else {
            document.getElementById('nutrient-modal-optimal').textContent = 'Not specified';
        }

        // Update status
        document.getElementById('nutrient-modal-status').textContent = status.text;
        document.getElementById('nutrient-modal-status').className = `status ${status.class}`;

        // Update history table
        this.updateNutrientHistoryTable(labels, data);

        // Show modal
        modal.style.display = 'block';
        
        // Create detailed chart after modal is displayed (with a small delay to ensure proper rendering)
        setTimeout(() => {
            this.createDetailedChart(labels, data, color, label);
        }, 100);
    }

    getNutrientOptimalRange(nutrientName) {
        const ranges = {
            'nitrate': { min: 5, max: 150 },
            'phosphorus': { min: 4, max: 60 },
            'potassium': { min: 10, max: 40 },
            'iron': { min: 0.5, max: 3.0 },
            'calcium': { min: 20, max: 400 },
            'ph-level': { min: 5.5, max: 7.5 }
        };
        return ranges[nutrientName] || null;
    }

    getNutrientStatus(value, optimalRange) {
        if (!value || !optimalRange) {
            return { text: 'No data', class: 'no-data' };
        }

        if (value < optimalRange.min) {
            return { text: 'Low', class: 'low' };
        } else if (value > optimalRange.max) {
            return { text: 'High', class: 'high' };
        } else {
            return { text: 'Optimal', class: 'optimal' };
        }
    }

    createDetailedChart(labels, data, color, title) {
        console.log('Creating detailed chart:', { labels, data, color, title });
        const ctx = document.getElementById('nutrient-modal-chart');
        if (!ctx) {
            console.error('Canvas element nutrient-modal-chart not found');
            return;
        }
        
        console.log('Canvas found:', ctx);

        // Destroy existing chart if it exists
        if (this.detailChart) {
            this.detailChart.destroy();
        }

        this.detailChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e0e0e0'
                        }
                    },
                    x: {
                        grid: {
                            color: '#e0e0e0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
        
        console.log('Detailed chart created successfully:', this.detailChart);
    }

    updateNutrientHistoryTable(labels, data) {
        const tbody = document.querySelector('#nutrient-modal-history tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        for (let i = labels.length - 1; i >= 0; i--) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${labels[i]}</td>
                <td>${data[i] ? data[i].toFixed(1) : 'No data'}</td>
                <td class="change-indicator">
                    ${i < labels.length - 1 && data[i] && data[i + 1] ? 
                        this.getChangeIndicator(data[i], data[i + 1]) : '-'}
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    getChangeIndicator(current, previous) {
        const change = current - previous;
        const changePercent = ((change / previous) * 100).toFixed(1);
        
        if (Math.abs(change) < 0.1) {
            return `<span class="no-change">No change</span>`;
        } else if (change > 0) {
            return `<span class="increase">+${changePercent}%</span>`;
        } else {
            return `<span class="decrease">${changePercent}%</span>`;
        }
    }

    exportNutrientData() {
        const modal = document.getElementById('nutrient-detail-modal');
        const nutrientName = document.getElementById('nutrient-modal-title').textContent;
        const tbody = document.querySelector('#nutrient-modal-history tbody');
        
        if (!tbody || !nutrientName) return;

        // Collect data from the history table
        const rows = tbody.querySelectorAll('tr');
        const data = [];
        
        // Add CSV header
        data.push(['Date', 'Value', 'Status']);
        
        // Add data rows
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const date = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                const status = cells[2].textContent.trim();
                data.push([date, value, status]);
            }
        });

        // Create CSV content
        const csvContent = data.map(row => row.join(',')).join('\n');
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${nutrientName.replace(/\s+/g, '_')}_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        this.showNotification(`${nutrientName} data exported successfully!`, 'success');
    }

    async updatePlantOverview() {
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

        // Generate grow bed summary
        const growBedSummaryHtml = await this.generateGrowBedSummary();
        
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
                    <div class="plant-stat-value">${this.formatWeight(totalHarvested)}</div>
                    <div class="plant-stat-detail">All time harvest</div>
                </div>
                
                <div class="plant-stat-card">
                    <h4>Last Harvest</h4>
                    <div class="plant-stat-value">${lastHarvestDate || 'Never'}</div>
                    <div class="plant-stat-detail">Most recent harvest</div>
                </div>
            </div>
            
            ${growBedSummaryHtml}
        `;
    }

    async generateGrowBedSummary() {
        if (!this.activeSystemId) {
            return '<div class="grow-bed-summary"><div class="no-data">Please select a system to view grow bed summary.</div></div>';
        }

        try {
            // Get allocations, grow beds, and fresh plant data
            const [allocations, growBeds, plantData] = await Promise.all([
                this.makeApiCall(`/plants/allocations/${this.activeSystemId}`),
                this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`),
                this.makeApiCall(`/data/plant-growth/${this.activeSystemId}`)
            ]);

            if (!growBeds || growBeds.length === 0) {
                return '<div class="grow-bed-summary"><div class="no-data">No grow beds configured for this system.</div></div>';
            }

            console.log('🌱 Grow bed summary data:', {
                allocations: allocations.length,
                growBeds: growBeds.length,
                plantData: plantData.length
            });
            
            console.log('📊 Grow bed IDs:', growBeds.map(bed => ({ id: bed.id, number: bed.bed_number, type: typeof bed.id })));
            console.log('📊 Plant data grow_bed_ids:', [...new Set(plantData.map(p => p.grow_bed_id))].map(id => ({ id, type: typeof id })));
            console.log('📊 Sample plant entries:', plantData.slice(0, 5).map(p => ({ 
                grow_bed_id: p.grow_bed_id, 
                crop_type: p.crop_type, 
                count: p.count,
                date: p.date 
            })));
            
            // Check for plant entries without grow_bed_id
            const entriesWithoutBedId = plantData.filter(p => !p.grow_bed_id);
            if (entriesWithoutBedId.length > 0) {
                console.warn('⚠️ Found plant entries without grow_bed_id:', entriesWithoutBedId.length);
            }

            let summaryHtml = `
                <div class="grow-bed-summary">
                    <h3>🌱 Grow Bed Planting Summary</h3>
                    <div class="bed-summary-grid">
            `;

            growBeds.forEach(bed => {
                const bedAllocations = allocations.filter(a => a.grow_bed_id == bed.id); // Use == for type coercion
                const bedPlantData = plantData.filter(p => p.grow_bed_id == bed.id); // Use == for type coercion
                
                console.log(`🔍 Bed ${bed.bed_number} (ID: ${bed.id}) filtering:`, {
                    bedId: bed.id,
                    bedIdType: typeof bed.id,
                    foundAllocations: bedAllocations.length,
                    foundPlantData: bedPlantData.length,
                    allPlantBedIds: plantData.map(p => p.grow_bed_id)
                });
                
                // Calculate totals
                const totalAllocatedPlants = bedAllocations.reduce((sum, alloc) => sum + (alloc.plants_planted || 0), 0);
                const totalActualPlants = this.calculateCurrentPlantCount(bedPlantData);
                const plantedPercentage = totalAllocatedPlants > 0 ? Math.round((totalActualPlants / totalAllocatedPlants) * 100) : 0;
                
                console.log(`Bed ${bed.bed_number} calculations:`, {
                    allocations: bedAllocations.length,
                    plantData: bedPlantData.length,
                    totalAllocatedPlants,
                    totalActualPlants,
                    plantedPercentage
                });
                
                // Get bed utilization
                const totalAllocatedPercentage = bedAllocations.reduce((sum, alloc) => sum + (alloc.percentage_allocated || 0), 0);
                
                const bedTypeName = bed.bed_type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
                
                summaryHtml += `
                    <div class="bed-summary-card">
                        <div class="bed-summary-header">
                            <h4>${bed.bed_name || `Bed ${bed.bed_number}`}</h4>
                            <span class="bed-type-badge">${bedTypeName}</span>
                        </div>
                        
                        <div class="bed-summary-stats">
                            <div class="bed-stat">
                                <span class="stat-label">Area:</span>
                                <span class="stat-value">${bed.area_m2 || bed.equivalent_m2 || 0}m²</span>
                            </div>
                            <div class="bed-stat">
                                <span class="stat-label">Allocated:</span>
                                <span class="stat-value">${totalAllocatedPercentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div class="planting-progress">
                            <div class="progress-header">
                                <span class="progress-label">Plants: ${totalActualPlants} / ${totalAllocatedPlants}</span>
                                <span class="progress-percentage ${plantedPercentage >= 80 ? 'good' : plantedPercentage >= 50 ? 'medium' : 'low'}">${plantedPercentage}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(plantedPercentage, 100)}%"></div>
                            </div>
                        </div>
                        
                        <div class="bed-crops">
                            ${this.generateBedCropDisplay(bedAllocations, bedPlantData)}
                        </div>
                    </div>
                `;
            });

            summaryHtml += `
                    </div>
                </div>
            `;

            return summaryHtml;

        } catch (error) {
            console.error('Error generating grow bed summary:', error);
            return '<div class="grow-bed-summary"><div class="error">Error loading grow bed summary.</div></div>';
        }
    }

    generateBedCropDisplay(bedAllocations, bedPlantData) {
        // Get all crop types present in this bed (both allocated and planted)
        const allocatedCrops = new Set(bedAllocations.map(alloc => alloc.crop_type));
        const plantedCrops = new Set(bedPlantData.map(plant => plant.crop_type).filter(crop => crop));
        const allCrops = new Set([...allocatedCrops, ...plantedCrops]);

        if (allCrops.size === 0) {
            return '<div class="no-crops">No crops allocated or planted</div>';
        }

        const cropDisplays = [];

        // Display all crops (allocated and unallocated)
        allCrops.forEach(cropType => {
            const allocation = bedAllocations.find(alloc => alloc.crop_type === cropType);
            const cropPlanted = this.getCropPlantCount(bedPlantData, cropType);
            
            const cleanCropName = this.cleanCustomCropName(cropType);
            const cropDisplayName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
            
            if (allocation) {
                // Allocated crop
                const cropAllocated = allocation.plants_planted || 0;
                const cropPercentage = cropAllocated > 0 ? Math.round((cropPlanted / cropAllocated) * 100) : 0;
                
                cropDisplays.push(`
                    <div class="crop-summary">
                        <span class="crop-name">${cropDisplayName}</span>
                        <span class="crop-progress">${cropPlanted}/${cropAllocated} (${cropPercentage}%)</span>
                    </div>
                `);
            } else if (cropPlanted > 0) {
                // Unallocated crop (planted but not in allocations)
                cropDisplays.push(`
                    <div class="crop-summary unallocated">
                        <span class="crop-name">${cropDisplayName}</span>
                        <span class="crop-progress unallocated-label">${cropPlanted}/0 (unallocated)</span>
                    </div>
                `);
            }
        });

        return cropDisplays.join('');
    }

    calculateCurrentPlantCount(plantData) {
        // Get the latest plant count for each crop type
        const latestCounts = {};
        
        plantData.forEach(entry => {
            if (entry.crop_type && entry.count !== undefined) {
                const key = entry.crop_type;
                if (!latestCounts[key] || new Date(entry.date) > new Date(latestCounts[key].date)) {
                    latestCounts[key] = entry;
                }
            }
        });
        
        // Sum up current counts (subtract harvested plants)
        let totalCurrent = 0;
        Object.values(latestCounts).forEach(entry => {
            const planted = entry.count || 0;
            const harvested = this.getHarvestedCount(plantData, entry.crop_type);
            totalCurrent += Math.max(0, planted - harvested);
        });
        
        return totalCurrent;
    }

    getCropPlantCount(plantData, cropType) {
        // Separate planting entries from harvest entries
        const plantingEntries = plantData.filter(entry => 
            entry.crop_type === cropType && 
            entry.count !== undefined && 
            entry.count > 0 &&
            !entry.plants_harvested // This ensures we only get planting records
        );
        
        const latestPlantingEntry = plantingEntries.reduce((latest, entry) => {
            return !latest || new Date(entry.date) > new Date(latest.date) ? entry : latest;
        }, null);
        
        if (!latestPlantingEntry) return 0;
        
        const planted = latestPlantingEntry.count || 0;
        const harvested = this.getHarvestedCount(plantData, cropType);
        
        console.log(`🌱 getCropPlantCount for ${cropType}:`, {
            planted,
            harvested,
            remaining: Math.max(0, planted - harvested),
            latestPlantingEntry: latestPlantingEntry,
            plantingEntries: plantingEntries.length,
            allCropEntries: plantData.filter(entry => entry.crop_type === cropType).length
        });
        
        return Math.max(0, planted - harvested);
    }

    getHarvestedCount(plantData, cropType) {
        const harvestEntries = plantData.filter(entry => entry.crop_type === cropType && entry.plants_harvested > 0);
        const totalHarvested = harvestEntries.reduce((sum, entry) => sum + (entry.plants_harvested || 0), 0);
        
        console.log(`🌾 getHarvestedCount for ${cropType}:`, {
            harvestEntries: harvestEntries.length,
            totalHarvested,
            entries: harvestEntries
        });
        
        return totalHarvested;
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
        const historyHtml = recentData.map(item => {
            const cleanCropName = item.crop_type ? this.cleanCustomCropName(item.crop_type) : 'Unknown';
            const displayName = cleanCropName !== 'Unknown' ? cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1) : 'Unknown';
            return `
            <div class="plant-history-item">
                <div class="plant-history-header">
                    <div class="plant-history-crop">${displayName}</div>
                    <div class="plant-history-date">${this.formatEntryDate(item.date)}</div>
                </div>
                <div class="plant-history-details">
                    ${this.formatPlantGrowthEntry(item)}
                </div>
            </div>
            `;
        }).join('');

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
        console.log('🧮 calculateTotalPlants called with:', plantData.length, 'entries');
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
        
        console.log('🧮 Latest crop counts:', cropCounts);
        
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
    
    formatWeight(grams) {
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(1)}kg`;
        }
        return `${grams}g`;
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
        const cleanCropName = crop.crop_type ? this.cleanCustomCropName(crop.crop_type) : null;
        const cropName = cleanCropName ? cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1) : null;
        
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
            if (waterQuality.potassium < 40) {
                recommendations.push({
                    icon: '🍌',
                    title: 'Low Potassium',
                    content: 'Potassium is low (< 40 ppm). This affects fruit development and plant immunity. Add potassium sulfate or increase fish feeding to boost levels.'
                });
            } else if (waterQuality.potassium > 70) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Potassium',
                    content: 'Potassium levels are high (> 70 ppm). While generally not toxic, monitor for potential salt buildup and ensure proper drainage.'
                });
            }
        }

        // Calcium recommendations
        if (waterQuality?.calcium !== null && waterQuality?.calcium !== undefined) {
            if (waterQuality.calcium < 50) {
                recommendations.push({
                    icon: '🦴',
                    title: 'Calcium Deficiency Risk',
                    content: 'Calcium is low (< 50 ppm). Plants may develop tip burn, blossom end rot, or weak stems. Add calcium chloride or crushed eggshells to boost levels.'
                });
            } else if (waterQuality.calcium > 100) {
                recommendations.push({
                    icon: '⚠️',
                    title: 'High Calcium',
                    content: 'Calcium levels are high (> 100 ppm). This may interfere with magnesium and potassium uptake. Consider diluting with RO water.'
                });
            }
        }

        // Ca:K:Mg Ratio Analysis (Recommended 4:4:1)
        if (waterQuality?.calcium && waterQuality?.potassium && waterQuality?.magnesium) {
            const ca = waterQuality.calcium;
            const k = waterQuality.potassium;
            const mg = waterQuality.magnesium;
            
            // Calculate ratios relative to magnesium (normalize to Mg = 1)
            const caRatio = ca / mg;
            const kRatio = k / mg;
            const mgRatio = 1; // Always 1 as base
            
            // Check if ratios are close to ideal 4:4:1 (allow ±25% tolerance)
            const caIdeal = Math.abs(caRatio - 4) <= 1; // 3-5 range
            const kIdeal = Math.abs(kRatio - 4) <= 1; // 3-5 range
            
            if (caIdeal && kIdeal) {
                recommendations.push({
                    icon: '⚖️',
                    title: 'Excellent Ca:K:Mg Ratio',
                    content: `Perfect nutrient balance! Your Ca:K:Mg ratio is ${caRatio.toFixed(1)}:${kRatio.toFixed(1)}:1, very close to the ideal 4:4:1 ratio for optimal plant nutrition.`
                });
            } else {
                const issues = [];
                if (!caIdeal) {
                    if (caRatio < 3) issues.push(`Calcium too low (${caRatio.toFixed(1)} vs ideal 4)`);
                    else issues.push(`Calcium too high (${caRatio.toFixed(1)} vs ideal 4)`);
                }
                if (!kIdeal) {
                    if (kRatio < 3) issues.push(`Potassium too low (${kRatio.toFixed(1)} vs ideal 4)`);
                    else issues.push(`Potassium too high (${kRatio.toFixed(1)} vs ideal 4)`);
                }
                
                recommendations.push({
                    icon: '📊',
                    title: 'Ca:K:Mg Ratio Imbalance',
                    content: `Current ratio is ${caRatio.toFixed(1)}:${kRatio.toFixed(1)}:1 (ideal: 4:4:1). ${issues.join('. ')}. Balance these nutrients for optimal plant health.`
                });
            }
        }

        // N:K Ratio Analysis for Plant Types
        if (waterQuality?.nitrate && waterQuality?.potassium) {
            // Convert nitrate to nitrogen equivalent (NO3 to N conversion factor ~0.225)
            const nitrogen = waterQuality.nitrate * 0.225;
            const potassium = waterQuality.potassium;
            const nkRatio = nitrogen / potassium;
            
            // Determine plant types currently growing
            const activeCrops = [...new Set(plantData.map(item => item.crop_type).filter(Boolean))];
            const leafyGreens = ['lettuce', 'spinach', 'kale', 'swiss_chard', 'arugula', 'watercress', 'basil', 'cilantro', 'parsley'];
            const fruitingPlants = ['tomato', 'cucumber', 'pepper', 'strawberry', 'eggplant', 'okra', 'beans', 'peas'];
            
            const hasLeafyGreens = activeCrops.some(crop => leafyGreens.includes(crop.toLowerCase()));
            const hasFruitingPlants = activeCrops.some(crop => fruitingPlants.includes(crop.toLowerCase()));
            
            let idealRatioMin, idealRatioMax, plantTypeText;
            
            if (hasLeafyGreens && !hasFruitingPlants) {
                // Leafy greens: N:K ratio of 1:1 to 1:1.5
                idealRatioMin = 1.0;
                idealRatioMax = 1.5;
                plantTypeText = "leafy greens";
            } else if (hasFruitingPlants && !hasLeafyGreens) {
                // Fruiting plants: N:K ratio of 1:2 to 1:3
                idealRatioMin = 2.0;
                idealRatioMax = 3.0;
                plantTypeText = "fruiting plants";
            } else if (hasLeafyGreens && hasFruitingPlants) {
                // Mixed system: Use general aquaponics ratio
                idealRatioMin = 1.25;
                idealRatioMax = 2.0;
                plantTypeText = "mixed crops";
            } else {
                // No specific crops identified, use general aquaponics
                idealRatioMin = 1.25;
                idealRatioMax = 1.5;
                plantTypeText = "general aquaponics";
            }
            
            // Analyze the ratio (invert for N:K comparison since we calculate K/N)
            const kToNRatio = 1 / nkRatio;
            
            if (kToNRatio >= idealRatioMin && kToNRatio <= idealRatioMax) {
                recommendations.push({
                    icon: '🎯',
                    title: 'Excellent N:K Ratio',
                    content: `Perfect nutrient ratio for ${plantTypeText}! Your N:K ratio is 1:${kToNRatio.toFixed(1)} (ideal: 1:${idealRatioMin}-${idealRatioMax}). This balance supports optimal growth and development.`
                });
            } else if (kToNRatio < idealRatioMin) {
                recommendations.push({
                    icon: '📈',
                    title: 'N:K Ratio Imbalance - Low Potassium',
                    content: `Your N:K ratio is 1:${kToNRatio.toFixed(1)}, but ${plantTypeText} need 1:${idealRatioMin}-${idealRatioMax}. Increase potassium levels through fish feed adjustment or potassium supplements.`
                });
            } else {
                recommendations.push({
                    icon: '📉',
                    title: 'N:K Ratio Imbalance - High Potassium',
                    content: `Your N:K ratio is 1:${kToNRatio.toFixed(1)}, but ${plantTypeText} need 1:${idealRatioMin}-${idealRatioMax}. Consider reducing potassium inputs or increasing nitrogen availability.`
                });
            }
        }

        // Nutrient balance recommendations
        if (waterQuality?.iron && waterQuality?.potassium && waterQuality?.calcium) {
            const ironOptimal = waterQuality.iron >= 1.0 && waterQuality.iron <= 3.0;
            const potassiumOptimal = waterQuality.potassium >= 40 && waterQuality.potassium <= 70;
            const calciumOptimal = waterQuality.calcium >= 50 && waterQuality.calcium <= 100;
            
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
            <div class="fish-calc-header">
                <div class="calc-title">
                    <h2>🐟 Fish Stocking Calculator</h2>
                    <p>Plan optimal fish stocking density and feeding schedules for maximum yield</p>
                </div>
                ${this.activeSystemId ? `
                    <div class="system-info-card">
                        <div class="system-info-header">
                            <span class="system-icon">⚙️</span>
                            <span class="system-name">${systemConfig.system_name || 'Current System'}</span>
                        </div>
                        <div class="system-details">
                            <div class="detail-item">
                                <span class="detail-label">Fish Volume:</span>
                                <span class="detail-value">${tankVolumeL}L (${tankVolumeM3}m³)</span>
                            </div>
                            ${systemConfig.fish_type ? `
                                <div class="detail-item">
                                    <span class="detail-label">Fish Type:</span>
                                    <span class="detail-value">${systemConfig.fish_type.charAt(0).toUpperCase() + systemConfig.fish_type.slice(1)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="fish-calc-grid">
                <div class="calc-card tank-specs">
                    <div class="card-header">
                        <h3>🏊 Tank Specifications</h3>
                        <p>Define your fish tank parameters</p>
                    </div>
                    <div class="input-group">
                        <label for="tank-volume">
                            <span class="label-text">Fish Tank Volume</span>
                            <span class="label-unit">(m³)</span>
                        </label>
                        <div class="input-with-icon">
                            <input type="number" id="tank-volume" step="0.1" placeholder="1.0" value="${tankVolumeM3}">
                            <span class="input-icon">📏</span>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="fish-type">
                            <span class="label-text">Fish Species</span>
                        </label>
                        <div class="input-with-icon">
                            <select id="fish-type">
                                <option value="">Select fish species</option>
                                <option value="tilapia">🐟 Tilapia (Hardy, fast-growing)</option>
                                <option value="trout">🐟 Trout (Cool water, premium)</option>
                                <option value="bass">🐠 Bass (Sport fish, good flavor)</option>
                                <option value="catfish">🐟 Catfish (Bottom feeder, resilient)</option>
                                <option value="barramundi">🐟 Barramundi (Premium, warm water)</option>
                                <option value="carp">🐟 Carp (Hardy, fast-growing)</option>
                            </select>
                            <span class="input-icon">🐟</span>
                        </div>
                    </div>

                    <div class="input-group">
                        <label for="stocking-density">
                            <span class="label-text">Stocking Density</span>
                            <span class="label-unit">(kg/m³)</span>
                        </label>
                        <div class="input-with-icon">
                            <input type="number" id="stocking-density" min="1" step="1" placeholder="Auto-calculated">
                            <span class="input-icon">⚖️</span>
                        </div>
                    </div>
                </div>

                <div class="calc-card stocking-params">
                    <div class="card-header">
                        <h3>📊 Stocking Parameters</h3>
                        <p>Set your fish stocking goals</p>
                    </div>
                    
                    <div class="input-row">
                        <div class="input-group">
                            <label for="fingerling-weight">
                                <span class="label-text">Fingerling Weight</span>
                                <span class="label-unit">(g)</span>
                            </label>
                            <div class="input-with-icon">
                                <input type="number" id="fingerling-weight" step="0.1" placeholder="10.0">
                                <span class="input-icon">🐠</span>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label for="fish-harvest-weight">
                                <span class="label-text">Harvest Weight</span>
                                <span class="label-unit">(g)</span>
                            </label>
                            <div class="input-with-icon">
                                <input type="number" id="fish-harvest-weight" step="1" placeholder="500">
                                <span class="input-icon">🎯</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="calc-card feeding-schedule">
                    <div class="card-header">
                        <h3>🍽️ Feeding Schedule</h3>
                        <p>Plan your daily feeding routine</p>
                    </div>
                    
                    <div class="input-group">
                        <label for="feedings-per-day">
                            <span class="label-text">Feedings per Day</span>
                        </label>
                        <div class="input-with-icon">
                            <select id="feedings-per-day">
                                <option value="1">1 time - Low maintenance (6pm)</option>
                                <option value="2" selected>2 times - Adult fish (8am, 6pm)</option>
                                <option value="3">3 times - Growing fish (8am, 2pm, 6pm)</option>
                                <option value="4">4 times - Fingerlings (8am, 12pm, 4pm, 8pm)</option>
                            </select>
                            <span class="input-icon">⏰</span>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="feeding-times">
                            <span class="label-text">Custom Feeding Times</span>
                        </label>
                        <div class="input-with-icon">
                            <input type="text" id="feeding-times" placeholder="08:00, 18:00" value="08:00, 18:00">
                            <span class="input-icon">🕐</span>
                        </div>
                        <small class="input-hint">24-hour format, separated by commas</small>
                    </div>
                </div>
            </div>

            <div class="calc-actions">
                <button class="calc-btn primary" id="calculate-stocking">
                    <span class="btn-icon">🧮</span>
                    Calculate Stocking Plan
                </button>
                <button class="calc-btn secondary" id="clear-fish-calc">
                    ${SVGIcons.getIcon('delete', 'btn-icon-svg')}
                    Clear All
                </button>
            </div>

            <div class="results-section" id="fish-results" style="display: none;">
                <div class="results-header">
                    <h3>📈 Stocking Analysis Results</h3>
                    <p>Based on your system specifications and fish requirements</p>
                </div>
                <div id="stocking-summary" class="results-grid"></div>
                <div id="growth-chart-container" class="chart-container"></div>
                <div id="feeding-schedule" class="schedule-container"></div>
                <div id="feeding-recommendations" class="recommendations-container"></div>
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
            
            // Try to find fish calculator in either old location or new fish management tabs
            let fishCalcContainer = document.getElementById('fish-calc');
            if (!fishCalcContainer) {
                // Look for fish calculator in the fish overview tab
                fishCalcContainer = document.querySelector('#fish-overview-content .fish-calculator');
            }
            
            if (fishCalcContainer) {
                // Insert before tank specifications
                const calcSection = fishCalcContainer.querySelector('.calc-section');
                if (calcSection && calcSection.parentNode) {
                    calcSection.parentNode.insertBefore(systemInfoContainer, calcSection);
                } else {
                    // If no calc-section found, append to beginning of fish calculator
                    fishCalcContainer.insertBefore(systemInfoContainer, fishCalcContainer.firstChild);
                }
            } else {
                console.warn('Fish calculator container not found, skipping system info update');
                return;
            }
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
                        <span><strong>Fish Tanks:</strong> ${systemConfig.fish_tank_count} (${(systemConfig.total_fish_volume / 1000).toFixed(1)}m³ total)</span>
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
            document.getElementById('fish-harvest-weight').value = fish.harvestWeight;
        }
    }

    calculateStocking() {
        const tankVolume = parseFloat(document.getElementById('tank-volume').value);
        const fishType = document.getElementById('fish-type').value;
        const stockingDensity = parseFloat(document.getElementById('stocking-density').value);
        const fingerlingWeight = parseFloat(document.getElementById('fingerling-weight').value);
        const harvestWeight = parseFloat(document.getElementById('fish-harvest-weight').value);
        const feedingsPerDay = parseInt(document.getElementById('feedings-per-day').value);
        const feedingTimes = document.getElementById('feeding-times').value;

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

        // Save feeding schedule to system
        this.saveFeedingSchedule(fishType, feedingsPerDay, feedingTimes);

        this.displayStockingResults(fish, tankVolume, numberOfFish, initialBiomass, harvestBiomass, totalFeedRequired, harvestWeight);
        this.displayFeedingSchedule(fish, numberOfFish, feedingsPerDay, feedingTimes);
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
            document.getElementById('fish-harvest-weight').value = '';
        }
        
        document.getElementById('fish-results').style.display = 'none';
        this.updateFishCalculatorSystemInfo();
    }

    async saveFeedingSchedule(fishType, feedingsPerDay, feedingTimes) {
        if (!this.activeSystemId) return;

        try {
            await this.makeApiCall('/fish/feeding-schedule', {
                method: 'POST',
                body: JSON.stringify({
                    systemId: this.activeSystemId,
                    fishType,
                    feedingsPerDay,
                    feedingTimes
                })
            });
        } catch (error) {
            console.error('Error saving feeding schedule:', error);
        }
    }

    displayFeedingSchedule(fish, numberOfFish, feedingsPerDay, feedingTimes) {
        const scheduleDiv = document.getElementById('feeding-schedule');
        const times = feedingTimes.split(',').map(time => time.trim());

        // Calculate feeding amounts based on current week's data
        const currentWeekData = fish.growthData[fish.growthData.length - 1]; // Use final week as current
        const dailyFeedPerFish = currentWeekData.feedAmount;
        const totalDailyFeed = (numberOfFish * dailyFeedPerFish) / 1000; // Convert to kg
        const feedPerMeal = (totalDailyFeed / feedingsPerDay).toFixed(3);
        const feedPerFishPerMeal = (dailyFeedPerFish / feedingsPerDay).toFixed(1);

        let scheduleHTML = `
            <div class="feeding-schedule-card">
                <h4>🐟 Daily Feeding Schedule</h4>
                <div class="feeding-summary">
                    <div class="feeding-stat">
                        <strong>Feedings per Day:</strong> ${feedingsPerDay}
                    </div>
                    <div class="feeding-stat">
                        <strong>Total Daily Feed:</strong> ${totalDailyFeed.toFixed(2)} kg
                    </div>
                    <div class="feeding-stat">
                        <strong>Feed per Meal:</strong> ${feedPerMeal} kg
                    </div>
                    <div class="feeding-stat">
                        <strong>Feed per Fish per Meal:</strong> ${feedPerFishPerMeal}g
                    </div>
                </div>
                
                <div class="feeding-times">
                    <h5>📅 Feeding Times</h5>
                    <div class="feeding-schedule-grid">
        `;

        times.forEach((time, index) => {
            if (time) {
                scheduleHTML += `
                    <div class="feeding-time-slot">
                        <div class="feeding-time">${time}</div>
                        <div class="feeding-amount">${feedPerMeal} kg</div>
                        <div class="feeding-notes">Meal ${index + 1}</div>
                    </div>
                `;
            }
        });

        scheduleHTML += `
                    </div>
                </div>
                
                <div class="feeding-tips">
                    <h5>💡 Feeding Tips</h5>
                    <ul>
                        <li>Feed only what fish can consume in 5-10 minutes</li>
                        <li>Remove uneaten food after 15 minutes to prevent water quality issues</li>
                        <li>Monitor fish behavior - healthy fish should be actively feeding</li>
                        <li>Adjust amounts based on water temperature and fish activity</li>
                        <li>Consider reducing feed by 50% if water temperature drops below ${fish.temperature.split('-')[0]}°C</li>
                    </ul>
                </div>
            </div>
        `;

        scheduleDiv.innerHTML = scheduleHTML;
    }

    async initializeDataEntryForms() {
        // Load latest data for preloading
        await this.loadLatestDataForPreloading();
        
        this.initializeWaterQualityForm();
        // Fish health form is now handled in Fish Management tabs
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
                        <input type="number" id="wq-potassium" min="0" step="1" placeholder="40 - 70">
                    </div>
                    <div class="form-field">
                        <label for="wq-calcium">Calcium Ca (ppm):</label>
                        <input type="number" id="wq-calcium" min="0" step="1" placeholder="50 - 100">
                    </div>
                    <!-- Nitrate input field already exists above -->
                    <div class="form-field">
                        <label for="wq-phosphorus">Phosphorus P (ppm):</label>
                        <input type="number" id="wq-phosphorus" min="0" step="0.1" placeholder="5 - 20">
                    </div>
                    <div class="form-field">
                        <label for="wq-magnesium">Magnesium Mg (ppm):</label>
                        <input type="number" id="wq-magnesium" min="0" step="0.1" placeholder="12 - 18">
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
                        <label for="fh-count">Current Fish Count:</label>
                        <input type="number" id="fh-count" min="0" step="1" placeholder="Current live fish count (leave blank if only recording mortality)">
                    </div>
                    <div class="form-field">
                        <label for="fh-mortality">Mortality Count:</label>
                        <input type="number" id="fh-mortality" min="0" step="1" placeholder="Fish deaths since last check (will be subtracted automatically)">
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


    async getGrowBedsForSystem() {
        const systemConfig = this.loadSystemConfig();
        
        if (!systemConfig || systemConfig.system_name === 'No System Selected' || !systemConfig.id) {
            // Fallback to default grow beds
            return Array.from({length: 4}, (_, i) => ({
                id: i + 1,
                bed_number: i + 1,
                bed_type: 'media-bed'
            }));
        }

        try {
            const response = await fetch(`/api/grow-beds/system/${systemConfig.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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

    async getPreviousFishCount(tankId) {
        try {
            // Get all fish health data for this system
            const response = await this.makeApiCall(`/data/entries/fish-health?system_id=${this.activeSystemId}&limit=50`);
            const entries = response || [];
            
            // Find the most recent entry for this tank
            const tankEntries = entries.filter(entry => entry.fish_tank_id === tankId);
            if (tankEntries.length > 0) {
                return tankEntries[0]; // Most recent entry
            }
            return null;
        } catch (error) {
            console.error('Failed to get previous fish count:', error);
            return null;
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
            // nitrate field already captured above
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
            await this.updateDashboardFromData();
            
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

        const tankId = parseInt(document.getElementById('fh-tank').value);
        const enteredCount = parseInt(document.getElementById('fh-count').value) || 0;
        const mortality = parseInt(document.getElementById('fh-mortality').value) || 0;
        
        // Get the previous fish count for this tank to handle mortality correctly
        let finalCount = enteredCount;
        
        // If mortality is entered but no count is entered, get previous count and subtract mortality
        if (mortality > 0 && enteredCount === 0) {
            const previousData = await this.getPreviousFishCount(tankId);
            const previousCount = previousData ? previousData.count || 0 : 0;
            finalCount = Math.max(0, previousCount - mortality);
            console.log(`Mortality-only entry: Previous ${previousCount} - ${mortality} mortality = ${finalCount} remaining`);
        }
        // If both count and mortality are entered, subtract mortality from entered count
        else if (mortality > 0 && enteredCount > 0) {
            finalCount = Math.max(0, enteredCount - mortality);
            console.log(`Count with mortality: ${enteredCount} - ${mortality} = ${finalCount}`);
        }

        const data = {
            date: document.getElementById('fh-date').value,
            fish_tank_id: tankId,
            count: finalCount, // Use the adjusted count after subtracting mortality
            mortality: mortality,
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
            await this.updateFishTankSummary(); // Update tank summary with new feeding data
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
            localStorage.removeItem('activeSystemId');
        } else {
            this.activeSystemId = systemId;
            localStorage.setItem('activeSystemId', systemId);
        }
        
        // Update the system selector dropdown to reflect the change
        this.updateSystemSelector();
        
        await this.loadDataRecords(); // Reload data for new system
        await this.updateDashboardFromData();
        this.updateCurrentSystemDisplay(); // Update system name on all tabs
        this.initializeNutrientCalculator();
        this.initializeFishCalculator(); // Refresh fish calculator with new system data
        this.initializeDataEntryForms(); // Refresh data entry forms including fish health
        await this.loadSystemManagement();
    }

    showAddSystemDialog() {
        // Show the new system modal instead of a prompt
        const modal = document.getElementById('new-system-modal');
        modal.style.display = 'block';
        
        // Reset wizard to step 1
        this.currentSystemStep = 1;
        this.systemWizardData = {
            fishTanks: [],
            growBeds: [],
            allocations: {}
        };
        
        // Reset form to default values
        document.getElementById('new-system-name').value = '';
        document.getElementById('new-system-type').value = '';
        document.getElementById('new-fish-tank-count').value = '1';
        document.getElementById('new-grow-bed-count').value = '2';
        
        // Initialize with default tank and bed configurations
        this.updateFishTankFields(1);
        this.updateGrowBedFields(2);
        
        // Update wizard UI
        this.updateWizardUI();
        
        // Focus on the system name input
        setTimeout(() => {
            document.getElementById('new-system-name').focus();
        }, 100);
    }
    
    closeNewSystemModal() {
        const modal = document.getElementById('new-system-modal');
        modal.style.display = 'none';
    }
    
    updateWizardUI() {
        // Update step visibility
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step) === this.currentSystemStep);
        });
        
        // Update progress indicators
        document.querySelectorAll('.progress-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === this.currentSystemStep);
            step.classList.toggle('completed', stepNum < this.currentSystemStep);
        });
        
        // Update navigation buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const submitBtn = document.querySelector('.submit-btn');
        
        prevBtn.style.display = this.currentSystemStep > 1 ? 'flex' : 'none';
        nextBtn.style.display = this.currentSystemStep < 4 ? 'flex' : 'none';
        submitBtn.style.display = this.currentSystemStep === 4 ? 'flex' : 'none';
    }
    
    async validateCurrentStep() {
        console.log('🔍 validateCurrentStep called for step:', this.currentSystemStep);
        const errors = [];
        
        switch(this.currentSystemStep) {
            case 1:
                const name = document.getElementById('new-system-name').value.trim();
                const type = document.getElementById('new-system-type').value;
                const tankCount = parseInt(document.getElementById('new-fish-tank-count').value);
                const bedCount = parseInt(document.getElementById('new-grow-bed-count').value);
                
                if (!name) {
                    errors.push('System name is required');
                    this.highlightError('new-system-name');
                }
                if (!type) {
                    errors.push('System type is required');
                    this.highlightError('new-system-type');
                }
                if (!tankCount || tankCount < 1 || tankCount > 10) {
                    errors.push('Number of fish tanks must be between 1 and 10');
                    this.highlightError('new-fish-tank-count');
                }
                if (!bedCount || bedCount < 1 || bedCount > 20) {
                    errors.push('Number of grow beds must be between 1 and 20');
                    this.highlightError('new-grow-bed-count');
                }
                break;
                
            case 2:
                // For step 2, we need to give the DOM time to update after HTML generation
                // This ensures that when validation runs, the form elements have their values set
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Debug: Check if DOM elements actually have values
                const debugEl = document.getElementById('tank-volume-1');
                console.log('🔧 DOM Debug after timeout:', {
                    elementExists: !!debugEl,
                    elementValue: debugEl?.value,
                    elementValueType: typeof debugEl?.value
                });
                
                // Save current data first to ensure we validate current values
                const tempStep = this.currentSystemStep;
                this.currentSystemStep = 2; // Temporarily set to 2 for saveCurrentStepData
                this.saveCurrentStepData();
                this.currentSystemStep = tempStep; // Restore original step
                
                const tankCountForValidation = this.systemWizardData.fishTankCount || parseInt(document.getElementById('new-fish-tank-count').value);
                for (let i = 1; i <= tankCountForValidation; i++) {
                    // Use saved data if available, otherwise read from DOM
                    const savedTank = this.systemWizardData.fishTanks?.[i-1];
                    const tankNameEl = document.getElementById(`tank-name-${i}`);
                    const tankVolumeEl = document.getElementById(`tank-volume-${i}`);
                    const fishTypeEl = document.getElementById(`tank-fish-${i}`);
                    const stockingDensityEl = document.getElementById(`tank-stocking-${i}`);
                    const harvestWeightEl = document.getElementById(`tank-harvest-${i}`);
                    
                    const tankName = savedTank?.name || tankNameEl?.value?.trim() || '';
                    const tankVolume = (savedTank && savedTank.volume !== null) ? savedTank.volume.toString() : (tankVolumeEl?.value?.trim() || '');
                    const fishType = savedTank?.fishType || fishTypeEl?.value || '';
                    const stockingDensity = (savedTank && savedTank.stockingDensity !== null) ? savedTank.stockingDensity.toString() : (stockingDensityEl?.value?.trim() || '');
                    const harvestWeight = (savedTank && savedTank.harvestWeight !== null) ? savedTank.harvestWeight.toString() : (harvestWeightEl?.value?.trim() || '');
                    
                    // Debug logging
                    console.log(`Tank ${i} validation:`, {
                        tankName: `"${tankName}"`,
                        tankVolume: `"${tankVolume}"`,
                        tankVolumeNum: parseFloat(tankVolume),
                        tankVolumeIsNaN: isNaN(parseFloat(tankVolume)),
                        fishType: `"${fishType}"`,
                        stockingDensity: `"${stockingDensity}"`,
                        harvestWeight: `"${harvestWeight}"`,
                        elementExists: {
                            tankName: !!tankNameEl,
                            tankVolume: !!tankVolumeEl,
                            fishType: !!fishTypeEl,
                            stockingDensity: !!stockingDensityEl,
                            harvestWeight: !!harvestWeightEl
                        }
                    });
                    
                    if (!tankName) {
                        errors.push(`Tank ${i} name is required`);
                        this.highlightError(`tank-name-${i}`);
                    }
                    
                    const volumeNum = parseFloat(tankVolume);
                    if (!tankVolume || isNaN(volumeNum) || volumeNum <= 0) {
                        errors.push(`Tank ${i} volume must be greater than 0`);
                        this.highlightError(`tank-volume-${i}`);
                    }
                    
                    if (!fishType) {
                        errors.push(`Tank ${i} fish type is required`);
                        this.highlightError(`tank-fish-${i}`);
                    }
                    
                    const densityNum = parseFloat(stockingDensity);
                    if (!stockingDensity || isNaN(densityNum) || densityNum <= 0) {
                        errors.push(`Tank ${i} stocking density must be greater than 0`);
                        this.highlightError(`tank-stocking-${i}`);
                    }
                    
                    const weightNum = parseFloat(harvestWeight);
                    if (!harvestWeight || isNaN(weightNum) || weightNum <= 0) {
                        errors.push(`Tank ${i} target harvest weight must be greater than 0`);
                        this.highlightError(`tank-harvest-${i}`);
                    }
                }
                break;
                
            case 3:
                // Similar timing fix for step 3
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const bedCountForValidation = parseInt(document.getElementById('new-grow-bed-count').value);
                for (let i = 1; i <= bedCountForValidation; i++) {
                    const bedName = document.getElementById(`bed-name-${i}`)?.value?.trim() || '';
                    const bedType = document.getElementById(`bed-type-${i}`)?.value || '';
                    
                    if (!bedName) {
                        errors.push(`Grow Bed ${i} name is required`);
                        this.highlightError(`bed-name-${i}`);
                    }
                    if (!bedType) {
                        errors.push(`Grow Bed ${i} type is required`);
                        this.highlightError(`bed-type-${i}`);
                    }
                    
                    // Validate type-specific required fields
                    if (bedType) {
                        if (bedType === 'dwc' || bedType === 'flood-drain' || bedType === 'media-flow') {
                            const length = document.getElementById(`bed-length-${i}`)?.value;
                            const width = document.getElementById(`bed-width-${i}`)?.value;
                            const height = document.getElementById(`bed-height-${i}`)?.value;
                            
                            if (!length || parseFloat(length) <= 0) {
                                errors.push(`Grow Bed ${i} length is required`);
                                this.highlightError(`bed-length-${i}`);
                            }
                            if (!width || parseFloat(width) <= 0) {
                                errors.push(`Grow Bed ${i} width is required`);
                                this.highlightError(`bed-width-${i}`);
                            }
                            if (!height || parseFloat(height) <= 0) {
                                errors.push(`Grow Bed ${i} height/depth is required`);
                                this.highlightError(`bed-height-${i}`);
                            }
                        } else if (bedType === 'vertical') {
                            const length = document.getElementById(`bed-length-${i}`)?.value;
                            const width = document.getElementById(`bed-width-${i}`)?.value;
                            const height = document.getElementById(`bed-height-${i}`)?.value;
                            const verticals = document.getElementById(`bed-verticals-${i}`)?.value;
                            const plantsPerVertical = document.getElementById(`bed-plants-per-vertical-${i}`)?.value;
                            
                            if (!length || parseFloat(length) <= 0) {
                                errors.push(`Grow Bed ${i} base length is required`);
                                this.highlightError(`bed-length-${i}`);
                            }
                            if (!width || parseFloat(width) <= 0) {
                                errors.push(`Grow Bed ${i} base width is required`);
                                this.highlightError(`bed-width-${i}`);
                            }
                            if (!height || parseFloat(height) <= 0) {
                                errors.push(`Grow Bed ${i} base height is required`);
                                this.highlightError(`bed-height-${i}`);
                            }
                            if (!verticals || parseInt(verticals) <= 0) {
                                errors.push(`Grow Bed ${i} number of verticals is required`);
                                this.highlightError(`bed-verticals-${i}`);
                            }
                            if (!plantsPerVertical || parseInt(plantsPerVertical) <= 0) {
                                errors.push(`Grow Bed ${i} plants per vertical is required`);
                                this.highlightError(`bed-plants-per-vertical-${i}`);
                            }
                        } else if (bedType === 'nft') {
                            const length = document.getElementById(`bed-length-${i}`)?.value;
                            const channels = document.getElementById(`bed-channels-${i}`)?.value;
                            const width = document.getElementById(`bed-width-${i}`)?.value;
                            
                            if (!length || parseFloat(length) <= 0) {
                                errors.push(`Grow Bed ${i} channel length is required`);
                                this.highlightError(`bed-length-${i}`);
                            }
                            if (!channels || parseInt(channels) <= 0) {
                                errors.push(`Grow Bed ${i} number of channels is required`);
                                this.highlightError(`bed-channels-${i}`);
                            }
                            if (!width || parseFloat(width) <= 0) {
                                errors.push(`Grow Bed ${i} channel width is required`);
                                this.highlightError(`bed-width-${i}`);
                            }
                        }
                    }
                }
                break;
                
            case 4:
                // Plant allocation is optional, but validate percentages if provided
                const allocBedCount = parseInt(document.getElementById('new-grow-bed-count').value);
                for (let i = 1; i <= allocBedCount; i++) {
                    const allocationRows = document.querySelectorAll(`#plant-allocation-container .allocation-bed:nth-child(${i}) .allocation-row`);
                    let totalPercentage = 0;
                    
                    allocationRows.forEach((row, index) => {
                        const crop = document.getElementById(`bed-${i}-crop-${index + 1}`)?.value;
                        const percentage = document.getElementById(`bed-${i}-alloc-${index + 1}`)?.value;
                        
                        if (crop && percentage) {
                            const percent = parseFloat(percentage);
                            if (percent <= 0 || percent > 100) {
                                errors.push(`Bed ${i} allocation percentage must be between 1-100%`);
                                this.highlightError(`bed-${i}-alloc-${index + 1}`);
                            }
                            totalPercentage += percent;
                        } else if (crop && !percentage) {
                            errors.push(`Bed ${i} crop allocation percentage is required when crop is selected`);
                            this.highlightError(`bed-${i}-alloc-${index + 1}`);
                        }
                    });
                    
                    if (totalPercentage > 100) {
                        errors.push(`Bed ${i} total allocation cannot exceed 100%`);
                    }
                }
                break;
        }
        
        if (errors.length > 0) {
            this.showNotification(errors[0], 'warning');
            // Clear error highlights after 3 seconds
            setTimeout(() => this.clearErrorHighlights(), 3000);
            return false;
        }
        
        this.clearErrorHighlights();
        return true;
    }
    
    highlightError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error-field');
        }
    }
    
    clearErrorHighlights() {
        document.querySelectorAll('.error-field').forEach(field => {
            field.classList.remove('error-field');
        });
    }
    
    saveCurrentStepData() {
        switch(this.currentSystemStep) {
            case 1:
                // Basic info step - save system name, type, and counts
                this.systemWizardData.systemName = document.getElementById('new-system-name').value;
                this.systemWizardData.systemType = document.getElementById('new-system-type').value;
                this.systemWizardData.fishTankCount = parseInt(document.getElementById('new-fish-tank-count').value) || 1;
                this.systemWizardData.growBedCount = parseInt(document.getElementById('new-grow-bed-count').value) || 2;
                break;
                
            case 2:
                // Fish tanks step - save tank data
                this.systemWizardData.fishTanks = [];
                const tankCount = this.systemWizardData.fishTankCount || 1;
                
                for (let i = 1; i <= tankCount; i++) {
                    const name = document.getElementById(`tank-name-${i}`)?.value || `Tank ${i}`;
                    const volume = document.getElementById(`tank-volume-${i}`)?.value;
                    const fishType = document.getElementById(`tank-fish-${i}`)?.value;
                    const stockingDensity = document.getElementById(`tank-stocking-${i}`)?.value;
                    const harvestWeight = document.getElementById(`tank-harvest-${i}`)?.value;
                    
                    this.systemWizardData.fishTanks.push({
                        name,
                        volume: volume ? parseFloat(volume) : null,
                        fishType,
                        stockingDensity: stockingDensity ? parseInt(stockingDensity) : null,
                        harvestWeight: harvestWeight ? parseInt(harvestWeight) : null
                    });
                }
                break;
                
            case 3:
                // Grow beds step - save bed data
                this.systemWizardData.growBeds = [];
                const bedCount = this.systemWizardData.growBedCount || 2;
                
                for (let i = 1; i <= bedCount; i++) {
                    const name = document.getElementById(`bed-name-${i}`)?.value || `Bed ${i}`;
                    const type = document.getElementById(`bed-type-${i}`)?.value;
                    const length = document.getElementById(`bed-length-${i}`)?.value;
                    const width = document.getElementById(`bed-width-${i}`)?.value;
                    const height = document.getElementById(`bed-height-${i}`)?.value;
                    
                    // Additional fields for specific types
                    const verticals = document.getElementById(`bed-verticals-${i}`)?.value;
                    const plantsPerVertical = document.getElementById(`bed-plants-per-vertical-${i}`)?.value;
                    const channels = document.getElementById(`bed-channels-${i}`)?.value;
                    
                    this.systemWizardData.growBeds.push({
                        name,
                        type,
                        length: length ? parseFloat(length) : null,
                        width: width ? parseFloat(width) : null,
                        height: height ? parseFloat(height) : null,
                        verticals: verticals ? parseInt(verticals) : null,
                        plantsPerVertical: plantsPerVertical ? parseInt(plantsPerVertical) : null,
                        channels: channels ? parseInt(channels) : null
                    });
                }
                break;
        }
    }
    
    async nextSystemStep() {
        if (!(await this.validateCurrentStep())) return;
        
        // Save current step data before moving to next step
        this.saveCurrentStepData();
        
        if (this.currentSystemStep < 4) {
            this.currentSystemStep++;
            this.updateWizardUI();
            
            // Initialize specific steps when reaching them
            if (this.currentSystemStep === 2) {
                // Ensure fish tank fields are properly initialized
                const tankCount = parseInt(document.getElementById('new-fish-tank-count').value) || 1;
                this.updateFishTankFields(tankCount);
            } else if (this.currentSystemStep === 3) {
                // Ensure grow bed fields are properly initialized
                const bedCount = parseInt(document.getElementById('new-grow-bed-count').value) || 2;
                this.updateGrowBedFields(bedCount);
            } else if (this.currentSystemStep === 4) {
                this.initializePlantAllocation();
            }
        }
    }
    
    prevSystemStep() {
        if (this.currentSystemStep > 1) {
            // Save current step data before moving to previous step
            this.saveCurrentStepData();
            this.currentSystemStep--;
            this.updateWizardUI();
        }
    }
    
    updateFishTankFields(count) {
        const container = document.getElementById('fish-tank-details');
        container.innerHTML = '';
        
        for (let i = 1; i <= count; i++) {
            // Check if we have existing data for this tank
            const existingTank = this.systemWizardData.fishTanks[i-1];
            const tankVolume = (existingTank && existingTank.volume !== null) ? existingTank.volume : 1000;
            const defaultFishType = existingTank?.fishType || 'tilapia';
            const fishDefaults = this.fishData[defaultFishType];
            
            console.log(`🐟 Tank ${i} field generation:`, {
                count,
                existingTank,
                tankVolume,
                tankVolumeType: typeof tankVolume,
                defaultCalculation: 1000,
                templateValue: `value="${tankVolume}"`
            });
            
            const tankHtml = `
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span>🐟</span>
                        <span>Fish Tank ${i}</span>
                    </div>
                    <div class="detail-fields fish-tank-fields">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Tank Name</span>
                            </label>
                            <input type="text" class="modern-input" id="tank-name-${i}" 
                                   placeholder="Tank ${i}" value="${existingTank?.name || `Tank ${i}`}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Volume (L)</span>
                            </label>
                            <input type="number" class="modern-input" id="tank-volume-${i}" 
                                   value="${tankVolume}" min="100" step="50" required placeholder="1000">
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Fish Type</span>
                            </label>
                            <select class="modern-select" id="tank-fish-${i}" onchange="app.updateFishDefaults(${i}, this.value)" required>
                                <option value="tilapia" ${defaultFishType === 'tilapia' ? 'selected' : ''}>Tilapia</option>
                                <option value="carp" ${defaultFishType === 'carp' ? 'selected' : ''}>Carp</option>
                                <option value="catfish" ${defaultFishType === 'catfish' ? 'selected' : ''}>Catfish</option>
                                <option value="trout" ${defaultFishType === 'trout' ? 'selected' : ''}>Trout</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Stocking Density (fish/m³)</span>
                            </label>
                            <input type="number" class="modern-input" id="tank-stocking-${i}" 
                                   value="${(existingTank && existingTank.stockingDensity !== null) ? existingTank.stockingDensity : fishDefaults.defaultDensity}" min="1" step="1" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Target Harvest Weight (g)</span>
                            </label>
                            <input type="number" class="modern-input" id="tank-harvest-${i}" 
                                   value="${(existingTank && existingTank.harvestWeight !== null) ? existingTank.harvestWeight : fishDefaults.harvestWeight}" min="50" step="50" required>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += tankHtml;
            
            // Explicitly set field values after DOM insertion to ensure they stick
            setTimeout(() => {
                const volumeEl = document.getElementById(`tank-volume-${i}`);
                const stockingEl = document.getElementById(`tank-stocking-${i}`);
                const harvestEl = document.getElementById(`tank-harvest-${i}`);
                
                console.log(`🔧 Setting field values for tank ${i}:`, {
                    volumeEl: !!volumeEl,
                    stockingEl: !!stockingEl,
                    harvestEl: !!harvestEl,
                    tankVolume,
                    stockingDensity: (existingTank && existingTank.stockingDensity !== null) ? existingTank.stockingDensity : fishDefaults.defaultDensity,
                    harvestWeight: (existingTank && existingTank.harvestWeight !== null) ? existingTank.harvestWeight : fishDefaults.harvestWeight
                });
                
                if (volumeEl) volumeEl.value = tankVolume;
                if (stockingEl) stockingEl.value = (existingTank && existingTank.stockingDensity !== null) ? existingTank.stockingDensity : fishDefaults.defaultDensity;
                if (harvestEl) harvestEl.value = (existingTank && existingTank.harvestWeight !== null) ? existingTank.harvestWeight : fishDefaults.harvestWeight;
            }, 0);
        }
    }
    
    updateFishDefaults(tankNum, fishType) {
        if (!this.fishData[fishType]) return;
        
        const fishDefaults = this.fishData[fishType];
        const stockingField = document.getElementById(`tank-stocking-${tankNum}`);
        const harvestField = document.getElementById(`tank-harvest-${tankNum}`);
        
        if (stockingField) stockingField.value = fishDefaults.defaultDensity;
        if (harvestField) harvestField.value = fishDefaults.harvestWeight;
    }
    
    updateGrowBedFields(count) {
        const container = document.getElementById('grow-bed-details');
        container.innerHTML = '';
        
        const bedTypes = {
            'media-flow': 'Media Flow Through (MFT)',
            'flood-drain': 'Flood & Drain (F&D)',
            'dwc': 'Deep Water Culture (DWC)',
            'vertical': 'Vertical Growing',
            'nft': 'NFT (Nutrient Film Technique)'
        };
        
        for (let i = 1; i <= count; i++) {
            // Check if we have existing data for this bed
            const existingBed = this.systemWizardData.growBeds[i-1];
            
            const bedHtml = `
                <div class="detail-card">
                    <div class="detail-card-header">
                        <span>🌱</span>
                        <span>Grow Bed ${i}</span>
                    </div>
                    <div class="detail-fields" style="grid-template-columns: 1fr 1fr; margin-bottom: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Bed Name</span>
                            </label>
                            <input type="text" class="modern-input" id="bed-name-${i}" 
                                   placeholder="Bed ${i}" value="${existingBed?.name || `Bed ${i}`}" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Bed Type</span>
                            </label>
                            <select class="modern-select" id="bed-type-${i}" onchange="app.updateBedTypeFields(${i})" required>
                                <option value="">Select Type</option>
                                ${Object.entries(bedTypes).map(([value, name]) => 
                                    `<option value="${value}" ${existingBed?.type === value ? 'selected' : ''}>${name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Dynamic fields container - moved outside detail-fields -->
                    <div id="bed-type-fields-${i}" class="bed-type-fields" style="margin-top: 1rem;">
                        <!-- Type-specific fields will be inserted here -->
                    </div>
                </div>
            `;
            container.innerHTML += bedHtml;
            
            // If existing bed has a type, populate the type-specific fields
            if (existingBed?.type) {
                setTimeout(() => {
                    this.updateBedTypeFields(i);
                }, 0);
            }
        }
    }
    
    updateBedTypeFields(bedIndex) {
        const typeSelect = document.getElementById(`bed-type-${bedIndex}`);
        const fieldsContainer = document.getElementById(`bed-type-fields-${bedIndex}`);
        
        if (!typeSelect || !fieldsContainer) return;
        
        const bedType = typeSelect.value;
        const existingBed = this.systemWizardData.growBeds?.[bedIndex-1];
        
        if (!bedType) {
            fieldsContainer.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (bedType === 'dwc') {
            html = `
                <div class="bed-dimensions" style="margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Bed Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Length (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-length" id="bed-length-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="2.0" value="${existingBed?.length || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Width (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-width" id="bed-width-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed?.width || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Depth (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-height" id="bed-height-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="0.3" value="${existingBed?.height || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                </div>
                <div class="calculation-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding: 0.75rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Volume</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-volume">0</span> L
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Area</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-area">0.0</span> m²
                        </div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; font-style: italic;">
                    DWC: Volume = L×W×H, Area = L×W
                </p>
            `;
        } else if (bedType === 'flood-drain') {
            html = `
                <div class="bed-dimensions" style="margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Bed Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Length (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-length" id="bed-length-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="2.0" value="${existingBed?.length || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Width (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-width" id="bed-width-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed?.width || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Media Depth (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-height" id="bed-height-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="0.25" value="${existingBed?.height || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                </div>
                <div class="calculation-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding: 0.75rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Volume</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-volume">0</span> L
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Area</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-area">0.0</span> m²
                        </div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; font-style: italic;">
                    F&D: Volume = L×W×H×0.3 (media porosity), Area = L×W
                </p>
            `;
        } else if (bedType === 'media-flow') {
            html = `
                <div class="bed-dimensions" style="margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Bed Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Length (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-length" id="bed-length-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="2.0" value="${existingBed?.length || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Width (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-width" id="bed-width-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed?.width || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Height/Depth (m)</span>
                            </label>
                            <input type="number" class="modern-input bed-height" id="bed-height-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="0.3" value="${existingBed?.height || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                </div>
                <div class="calculation-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding: 0.75rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Volume</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-volume">0</span> L
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Area</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-area">0.0</span> m²
                        </div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; font-style: italic;">
                    MFT: Volume = L×W×H, Area = L×W
                </p>
            `;
        } else if (bedType === 'vertical') {
            html = `
                <div class="bed-dimensions" style="margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Base Dimensions</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Base Length (m)</span>
                            </label>
                            <input type="number" class="modern-input base-length" id="bed-length-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed?.length || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Base Width (m)</span>
                            </label>
                            <input type="number" class="modern-input base-width" id="bed-width-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="1.0" value="${existingBed?.width || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Base Height (m)</span>
                            </label>
                            <input type="number" class="modern-input base-height" id="bed-height-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="0.5" value="${existingBed?.height || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                    
                    <h4 style="margin: 1.5rem 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Vertical Configuration</h4>
                    <div class="vertical-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Number of Verticals</span>
                            </label>
                            <input type="number" class="modern-input vertical-count" id="bed-verticals-${bedIndex}" 
                                   min="1" step="1" placeholder="4" value="${existingBed?.verticals || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Plants per Vertical</span>
                            </label>
                            <input type="number" class="modern-input plants-per-vertical" id="bed-plants-per-vertical-${bedIndex}" 
                                   min="1" step="1" placeholder="12" value="${existingBed?.plantsPerVertical || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                </div>
                <div class="calculation-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding: 0.75rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Volume</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-volume">0</span> L
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Area</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-area">0.0</span> m²
                        </div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; font-style: italic;">
                    Vertical: Volume = Base×H, Area = Verticals×Plants×0.05m²
                </p>
            `;
        } else if (bedType === 'nft') {
            html = `
                <div class="bed-dimensions" style="margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #2c3e50; font-size: 0.9rem; font-weight: 600;">Channel Configuration</h4>
                    <div class="dimension-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Channel Length (m)</span>
                            </label>
                            <input type="number" class="modern-input channel-length" id="bed-length-${bedIndex}" 
                                   min="0.1" step="0.1" placeholder="3.0" value="${existingBed?.length || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Number of Channels</span>
                            </label>
                            <input type="number" class="modern-input channel-count" id="bed-channels-${bedIndex}" 
                                   min="1" step="1" placeholder="6" value="${existingBed?.channels || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                        <div class="form-field">
                            <label class="modern-label">
                                <span class="label-text">Channel Width (m)</span>
                            </label>
                            <input type="number" class="modern-input channel-width" id="bed-width-${bedIndex}" 
                                   min="0.05" step="0.01" placeholder="0.1" value="${existingBed?.width || ''}" 
                                   onchange="app.calculateBedMetrics(${bedIndex})" required>
                        </div>
                    </div>
                </div>
                <div class="calculation-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding: 0.75rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Volume</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-volume">0</span> L
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Area</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">
                            <span class="calculated-area">0.0</span> m²
                        </div>
                    </div>
                </div>
                <p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; font-style: italic;">
                    NFT: Volume = Channels×Length×0.002m³, Area = Channels×Length×Width
                </p>
            `;
        }
        
        fieldsContainer.innerHTML = html;
        
        // Calculate initial values if fields have data
        setTimeout(() => {
            this.calculateBedMetrics(bedIndex);
        }, 0);
    }
    
    calculateBedMetricsForSaving(bedType, bedData) {
        let volume = 0;
        let area = 0;
        
        if (bedType === 'dwc' || bedType === 'media-flow') {
            const length = parseFloat(bedData.length) || 0;
            const width = parseFloat(bedData.width) || 0;
            const height = parseFloat(bedData.height) || 0;
            volume = length * width * height * 1000; // Convert to liters
            area = length * width;
        } else if (bedType === 'flood-drain') {
            const length = parseFloat(bedData.length) || 0;
            const width = parseFloat(bedData.width) || 0;
            const height = parseFloat(bedData.height) || 0;
            volume = length * width * height * 0.3 * 1000; // 30% for media porosity
            area = length * width;
        } else if (bedType === 'vertical') {
            const length = parseFloat(bedData.length) || 0;
            const width = parseFloat(bedData.width) || 0;
            const height = parseFloat(bedData.height) || 0;
            const verticals = parseFloat(bedData.verticals) || 0;
            const plantsPerVertical = parseFloat(bedData.plantsPerVertical) || 0;
            volume = length * width * height * 1000;
            area = verticals * plantsPerVertical * 0.05; // 0.05m² per plant
        } else if (bedType === 'nft') {
            const length = parseFloat(bedData.length) || 0;
            const width = parseFloat(bedData.width) || 0;
            const channels = parseFloat(bedData.channels) || 0;
            volume = channels * length * 0.002 * 1000; // 0.002m³ per channel meter
            area = channels * length * width;
        }
        
        return { volume, area };
    }
    
    calculateBedMetrics(bedIndex) {
        const typeSelect = document.getElementById(`bed-type-${bedIndex}`);
        const fieldsContainer = document.getElementById(`bed-type-fields-${bedIndex}`);
        
        if (!typeSelect || !fieldsContainer) return;
        
        const bedType = typeSelect.value;
        let volume = 0;
        let area = 0;
        
        if (bedType === 'dwc' || bedType === 'media-flow') {
            const length = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value) || 0;
            const width = parseFloat(document.getElementById(`bed-width-${bedIndex}`)?.value) || 0;
            const height = parseFloat(document.getElementById(`bed-height-${bedIndex}`)?.value) || 0;
            
            volume = length * width * height * 1000; // Convert to liters
            area = length * width;
            
        } else if (bedType === 'flood-drain') {
            const length = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value) || 0;
            const width = parseFloat(document.getElementById(`bed-width-${bedIndex}`)?.value) || 0;
            const height = parseFloat(document.getElementById(`bed-height-${bedIndex}`)?.value) || 0;
            
            volume = length * width * height * 0.3 * 1000; // 30% porosity, convert to liters
            area = length * width;
            
        } else if (bedType === 'vertical') {
            const baseLength = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value) || 0;
            const baseWidth = parseFloat(document.getElementById(`bed-width-${bedIndex}`)?.value) || 0;
            const baseHeight = parseFloat(document.getElementById(`bed-height-${bedIndex}`)?.value) || 0;
            const verticals = parseFloat(document.getElementById(`bed-verticals-${bedIndex}`)?.value) || 0;
            const plantsPerVertical = parseFloat(document.getElementById(`bed-plants-per-vertical-${bedIndex}`)?.value) || 0;
            
            volume = baseLength * baseWidth * baseHeight * 1000; // Convert to liters
            area = verticals * plantsPerVertical * 0.05; // 0.05m² per plant site
            
        } else if (bedType === 'nft') {
            const channelLength = parseFloat(document.getElementById(`bed-length-${bedIndex}`)?.value) || 0;
            const channelCount = parseFloat(document.getElementById(`bed-channels-${bedIndex}`)?.value) || 0;
            const channelWidth = parseFloat(document.getElementById(`bed-width-${bedIndex}`)?.value) || 0;
            
            volume = channelCount * channelLength * 0.002 * 1000; // Minimal volume, convert to liters
            area = channelCount * channelLength * channelWidth;
        }
        
        // Update display in the calculation summary
        const volumeSpan = fieldsContainer.querySelector('.calculated-volume');
        const areaSpan = fieldsContainer.querySelector('.calculated-area');
        
        if (volumeSpan) volumeSpan.textContent = Math.round(volume);
        if (areaSpan) areaSpan.textContent = area.toFixed(1);
    }
    
    async initializePlantAllocation() {
        const container = document.getElementById('plant-allocation-container');
        const bedCount = parseInt(document.getElementById('new-grow-bed-count').value);
        
        // Load custom crops for allocation
        let customCrops = [];
        try {
            const response = await this.makeApiCall('/plants/custom-crops');
            customCrops = response || [];
            console.log('Loaded custom crops for allocation:', customCrops);
        } catch (error) {
            console.error('Failed to load custom crops:', error);
        }
        
        container.innerHTML = '';
        
        for (let i = 1; i <= bedCount; i++) {
            const bedName = document.getElementById(`bed-name-${i}`)?.value || `Bed ${i}`;
            const allocationHtml = `
                <div class="allocation-bed">
                    <div class="allocation-bed-header">
                        <span>🌱</span>
                        <span>${bedName} - Plant Allocation</span>
                    </div>
                    <div class="allocation-crops-wrapper" style="max-height: 300px; overflow-y: auto; border: 1px solid rgba(69, 231, 221, 0.2); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div class="allocation-crops">
                            <div class="allocation-row">
                                <select class="modern-select" id="bed-${i}-crop-1">
                                    <option value="">No crop allocated</option>
                                    <optgroup label="Leafy Greens">
                                        <option value="lettuce">Lettuce</option>
                                        <option value="spinach">Spinach</option>
                                        <option value="kale">Kale</option>
                                        <option value="swiss_chard">Swiss Chard</option>
                                    </optgroup>
                                    <optgroup label="Herbs">
                                        <option value="basil">Basil</option>
                                        <option value="mint">Mint</option>
                                        <option value="parsley">Parsley</option>
                                        <option value="cilantro">Cilantro</option>
                                    </optgroup>
                                    ${customCrops.length > 0 ? `
                                        <optgroup label="Custom Crops">
                                            ${customCrops.map(crop => 
                                                `<option value="${crop.crop_name.toLowerCase().replace(/\s+/g, '_')}">${this.cleanCustomCropName(crop.crop_name)}</option>`
                                            ).join('')}
                                        </optgroup>
                                    ` : ''}
                                </select>
                                <input type="number" class="modern-input" placeholder="%" min="0" max="100" id="bed-${i}-alloc-1">
                            </div>
                        </div>
                    </div>
                    <div class="allocation-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn-secondary" onclick="app.addAllocationRow(${i})">
                            <span>+</span> Add Crop
                        </button>
                        <button type="button" class="btn-outline" onclick="app.showAddCustomCropDialog(${i})">
                            <span>🌿</span> Add Custom Crop
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += allocationHtml;
        }
    }
    
    addAllocationRow(bedNum) {
        const container = document.querySelector(`#plant-allocation-container .allocation-bed:nth-child(${bedNum}) .allocation-crops`);
        const rowCount = container.querySelectorAll('.allocation-row').length + 1;
        
        // Clone the first row's select options
        const firstSelect = container.querySelector('select');
        const newRow = document.createElement('div');
        newRow.className = 'allocation-row';
        newRow.innerHTML = `
            <select class="modern-select" id="bed-${bedNum}-crop-${rowCount}">
                ${firstSelect.innerHTML}
            </select>
            <input type="number" class="modern-input" placeholder="%" min="0" max="100" id="bed-${bedNum}-alloc-${rowCount}">
        `;
        container.appendChild(newRow);
    }
    
    async showAddCustomCropDialog(bedNum) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '400px';
        modalContent.style.padding = '2rem';
        
        modalContent.innerHTML = `
            <h3 style="color: #2e3192; margin-bottom: 1rem;">Add Custom Crop</h3>
            <div class="form-field">
                <label class="modern-label">
                    <span class="label-icon">🌿</span>
                    <span class="label-text">Crop Name</span>
                </label>
                <input type="text" id="custom-crop-name-input" class="modern-input" 
                       placeholder="e.g., Cherry Tomatoes" autofocus>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem; justify-content: flex-end;">
                <button type="button" class="btn-secondary" id="cancel-custom-crop">Cancel</button>
                <button type="button" class="btn-primary" id="save-custom-crop">Add Crop</button>
            </div>
        `;
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Focus the input
        setTimeout(() => {
            document.getElementById('custom-crop-name-input')?.focus();
        }, 100);
        
        // Handle save
        const saveHandler = async () => {
            const cropName = document.getElementById('custom-crop-name-input')?.value.trim();
            if (!cropName) {
                this.showNotification('Please enter a crop name', 'warning');
                return;
            }
            
            try {
                const response = await this.makeApiCall('/plants/custom-crops', {
                    method: 'POST',
                    body: JSON.stringify({
                        cropName: cropName,
                        systemId: this.activeSystemId || this.systemWizardData.systemId || null
                    })
                });
                
                if (response) {
                    this.showNotification(`Custom crop "${cropName}" added successfully!`, 'success');
                    modalOverlay.remove();
                    
                    // Refresh the plant allocation section
                    await this.updatePlantAllocationFields();
                }
            } catch (error) {
                console.error('Error adding custom crop:', error);
                this.showNotification('Failed to add custom crop. Please try again.', 'error');
            }
        };
        
        // Event listeners
        document.getElementById('save-custom-crop').addEventListener('click', saveHandler);
        document.getElementById('cancel-custom-crop').addEventListener('click', () => modalOverlay.remove());
        document.getElementById('custom-crop-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveHandler();
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });
    }
    
    setupNewSystemModal() {
        // Close button handler
        const closeBtn = document.getElementById('close-new-system-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeNewSystemModal());
        }
        
        // Click outside modal to close
        const modal = document.getElementById('new-system-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeNewSystemModal();
                }
            });
        }
        
        // Form submission handler
        const form = document.getElementById('new-system-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!this.validateCurrentStep()) return;
                
                // Collect all wizard data
                const systemData = {
                    system_name: document.getElementById('new-system-name').value,
                    system_type: document.getElementById('new-system-type').value,
                    fish_tank_count: parseInt(document.getElementById('new-fish-tank-count').value),
                    grow_bed_count: parseInt(document.getElementById('new-grow-bed-count').value)
                };
                
                // Collect fish tank details
                systemData.fish_tanks = [];
                let totalFishVolume = 0;
                for (let i = 1; i <= systemData.fish_tank_count; i++) {
                    const tankVolume = parseFloat(document.getElementById(`tank-volume-${i}`).value);
                    totalFishVolume += tankVolume;
                    systemData.fish_tanks.push({
                        name: document.getElementById(`tank-name-${i}`).value,
                        volume: tankVolume,
                        fish_type: document.getElementById(`tank-fish-${i}`).value,
                        stocking_density: parseFloat(document.getElementById(`tank-stocking-${i}`).value),
                        target_harvest_weight: parseFloat(document.getElementById(`tank-harvest-${i}`).value)
                    });
                }
                systemData.total_fish_volume = totalFishVolume;
                
                // Collect grow bed details
                systemData.grow_beds = [];
                let totalGrowArea = 0;
                for (let i = 1; i <= systemData.grow_bed_count; i++) {
                    const bedType = document.getElementById(`bed-type-${i}`)?.value;
                    const savedBed = this.systemWizardData.growBeds?.[i-1] || {};
                    
                    // Calculate area based on bed type and saved dimensions
                    let bedArea = 0;
                    if (bedType && savedBed) {
                        const metrics = this.calculateBedMetricsForSaving(bedType, savedBed);
                        bedArea = metrics.area;
                    }
                    
                    totalGrowArea += bedArea;
                    systemData.grow_beds.push({
                        name: document.getElementById(`bed-name-${i}`)?.value || `Bed ${i}`,
                        type: bedType,
                        area: bedArea,
                        ...savedBed // Include all the dimensional data
                    });
                }
                systemData.total_grow_area = totalGrowArea;
                
                // Collect plant allocations
                systemData.allocations = [];
                for (let i = 1; i <= systemData.grow_bed_count; i++) {
                    const allocationRows = document.querySelectorAll(`#plant-allocation-container .allocation-bed:nth-child(${i}) .allocation-row`);
                    allocationRows.forEach((row, index) => {
                        const crop = document.getElementById(`bed-${i}-crop-${index + 1}`)?.value;
                        const percentage = document.getElementById(`bed-${i}-alloc-${index + 1}`)?.value;
                        if (crop && percentage) {
                            systemData.allocations.push({
                                grow_bed_id: i,
                                grow_bed_name: systemData.grow_beds[i-1].name,
                                crop_type: crop,
                                allocation_percentage: parseFloat(percentage)
                            });
                        }
                    });
                }
                
                await this.createNewSystem(systemData);
                this.closeNewSystemModal();
            });
        }
    }

    async createNewSystem(systemData) {
        const systemId = 'system_' + Date.now();
        
        // Extract additional configuration data for later processing
        const { fish_tanks, grow_beds, allocations, ...basicSystemData } = systemData;
        
        const newSystem = {
            id: systemId,
            ...basicSystemData,
            fish_type: fish_tanks[0]?.fish_type || 'tilapia', // Use first tank's fish type as default
            total_grow_volume: systemData.total_grow_area * 200 // Estimate grow bed volume from area
        };

        try {
            const createdSystem = await this.makeApiCall('/systems', {
                method: 'POST',
                body: JSON.stringify(newSystem)
            });

            this.systems[systemId] = createdSystem;
            this.updateSystemSelector();
            
            // Switch to the new system
            await this.switchToSystem(systemId);
            
            // Save fish tank configuration
            if (fish_tanks && fish_tanks.length > 0) {
                try {
                    // Create each tank individually
                    for (let i = 0; i < fish_tanks.length; i++) {
                        const tank = fish_tanks[i];
                        await this.makeApiCall('/fish-tanks', {
                            method: 'POST',
                            body: JSON.stringify({
                                system_id: systemId,
                                tank_number: i + 1,
                                size_m3: tank.volume / 1000, // Convert liters to m³
                                volume_liters: tank.volume,
                                fish_type: tank.fish_type === 'carp' ? 'other' : tank.fish_type,
                                name: tank.name,
                                stocking_density: tank.stocking_density,
                                target_harvest_weight: tank.target_harvest_weight
                            })
                        });
                    }
                } catch (error) {
                    console.error('Failed to save fish tank configuration:', error);
                }
            }
            
            // Save grow bed configuration
            if (grow_beds && grow_beds.length > 0) {
                try {
                    // Transform grow beds data for API
                    const growBedsData = grow_beds.map((bed, index) => {
                        // Calculate volume if not already set
                        let volume = bed.volume || 0;
                        if (bed.type && !volume) {
                            const metrics = this.calculateBedMetricsForSaving(bed.type, bed);
                            volume = metrics.volume;
                        }
                        
                        return {
                            bed_number: index + 1,
                            bed_type: bed.type,
                            volume_liters: Math.round(volume),
                            area_m2: bed.area || 0,
                            length_meters: bed.length || null,
                            width_meters: bed.width || null,
                            height_meters: bed.height || null,
                            vertical_count: bed.verticals || null,
                            plants_per_vertical: bed.plantsPerVertical || null,
                            channel_count: bed.channels || null
                        };
                    });
                    
                    await this.makeApiCall(`/grow-beds/system/${systemId}`, {
                        method: 'POST',
                        body: JSON.stringify({
                            growBeds: growBedsData
                        })
                    });
                } catch (error) {
                    console.error('Failed to save grow bed configuration:', error);
                }
            }
            
            // Get the created grow bed IDs first
            let createdBedIds = [];
            if (grow_beds && grow_beds.length > 0) {
                try {
                    const growBedsResponse = await this.makeApiCall(`/grow-beds/system/${systemId}`);
                    createdBedIds = growBedsResponse.map(bed => ({ 
                        bedNumber: bed.bed_number, 
                        id: bed.id 
                    }));
                } catch (error) {
                    console.error('Failed to fetch created grow beds:', error);
                }
            }
            
            // Save plant allocations if provided
            if (allocations && allocations.length > 0 && createdBedIds.length > 0) {
                try {
                    // Create each allocation individually
                    for (const allocation of allocations) {
                        // Find the actual grow bed ID from the created beds
                        const bedInfo = createdBedIds.find(bed => bed.bedNumber === allocation.grow_bed_id);
                        if (bedInfo) {
                            await this.makeApiCall('/plants/allocations', {
                                method: 'POST',
                                body: JSON.stringify({
                                    systemId: systemId,
                                    growBedId: bedInfo.id,
                                    cropType: allocation.crop_type,
                                    percentageAllocated: allocation.allocation_percentage,
                                    plantsPlanted: 0,
                                    datePlanted: new Date().toISOString().split('T')[0]
                                })
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to save plant allocations:', error);
                }
            }
            
            // Create default spray programmes for the new system
            try {
                const sprayDefaults = await this.makeApiCall('/spray-programmes/create-defaults', {
                    method: 'POST',
                    body: JSON.stringify({
                        system_id: systemId
                    })
                });
                console.log('Default spray programmes created:', sprayDefaults);
            } catch (error) {
                console.error('Failed to create default spray programmes:', error);
                // Don't fail system creation if spray programmes fail
            }
            
            // Redirect to settings to review/modify configuration
            this.goToSettings();
            this.showNotification(`System "${systemData.system_name}" created successfully!`, 'success');
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
                this.showNotification('System deleted successfully.', 'success');
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

        // Calculate total fish volume from individual tanks
        const tankItems = document.querySelectorAll('.fish-tank-item');
        let totalFishVolumeL = 0;
        tankItems.forEach(item => {
            const sizeInput = item.querySelector('.tank-size');
            if (sizeInput && sizeInput.value) {
                const sizeM3 = parseFloat(sizeInput.value) || 0;
                totalFishVolumeL += sizeM3 * 1000; // Convert m³ to liters
            }
        });

        // Calculate total grow bed volume
        const totalGrowVolumeL = await this.calculateTotalGrowBedVolume();
        
        const config = {
            system_name: document.getElementById('system-name').value || 'My Aquaponics System',
            system_type: document.getElementById('system-type-config').value,
            fish_tank_count: parseInt(document.getElementById('fish-tank-count').value) || 1,
            total_fish_volume: totalFishVolumeL || 1000,
            grow_bed_count: parseInt(document.getElementById('grow-bed-count').value) || 4,
            total_grow_volume: totalGrowVolumeL || 800,
            total_grow_area: parseFloat(document.getElementById('total-grow-area').value) || 2.0
        };

        try {
            const updatedSystem = await this.makeApiCall(`/systems/${this.activeSystemId}`, {
                method: 'PUT',
                body: JSON.stringify(config)
            });

            // Save grow bed configuration
            await this.saveGrowBedConfiguration();
            
            // Save fish tank configuration
            await this.saveFishTankConfiguration();
            
            this.systems[this.activeSystemId] = updatedSystem;
            this.updateSystemSelector(); // Update dropdown with new name
            this.updateCurrentSystemDisplay(); // Update system name on all tabs
            
            // Reload the grow bed configuration to show saved values
            await this.loadGrowBedConfiguration();
            
            // Reload the fish tank configuration to show saved values
            await this.loadFishTankConfiguration();
            
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

    async loadSystemManagement() {
        this.loadSystemConfigToForm();
        this.displaySystemsList();
        this.displayGrowBedStatus();
        await this.loadGrowBedConfiguration(); // Load grow bed configuration form
        await this.updateReservoirVolume();
    }

    loadSystemConfigToForm() {
        const activeSystem = this.getActiveSystem();
        if (activeSystem) {
            document.getElementById('system-name').value = activeSystem.system_name;
            document.getElementById('system-type-config').value = activeSystem.system_type;
            document.getElementById('fish-tank-count').value = activeSystem.fish_tank_count || 1;
            document.getElementById('total-fish-volume').value = activeSystem.total_fish_volume || 1000;
            document.getElementById('grow-bed-count').value = activeSystem.grow_bed_count || 4;
            document.getElementById('total-grow-area').value = activeSystem.total_grow_area || 2.0;
            
            // Update the auto-calculated grow bed volume display
            this.updateTotalGrowBedVolume();
            
            // Load grow bed configuration
            this.loadGrowBedConfiguration();
            
            // Initialize fish tank configuration
            const tankCount = activeSystem.fish_tank_count || 1;
            this.generateFishTankConfiguration(tankCount);
            this.loadFishTankConfiguration();
            
            // Update display fields
            this.updateSettingsDisplayFields();
        } else {
            // Clear form if no system selected
            document.getElementById('system-name').value = '';
            document.getElementById('system-type-config').value = 'media-bed';
            document.getElementById('fish-tank-count').value = '1';
            document.getElementById('total-fish-volume').value = '';
            document.getElementById('grow-bed-count').value = '4';
            document.getElementById('total-grow-area').value = '';
            
            // Clear the auto-calculated grow bed volume display
            const displayElement = document.getElementById('total-grow-volume-display');
            if (displayElement) {
                displayElement.textContent = 'Auto-calculated: 0 L';
                displayElement.style.color = '#6c757d';
            }
            
            // Initialize default fish tank configuration
            this.generateFishTankConfiguration(1);
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
                                        <p>Tanks: ${(system.total_fish_volume / 1000).toFixed(1)}m³ | Grow Beds: ${system.total_grow_volume}L</p>
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
            // LEAFY GREENS
            lettuce: { n: 73, p: 19, k: 90, ca: 67, mg: 13, fe: 1.8, ec: 1.1, ph_min: 6.0, ph_max: 6.8, notes: "Achieved highest yields with P and K supplementation" },
            spinach: { n: 65, p: 16, k: 75, ca: 65, mg: 15, fe: 1.6, ec: 1.05, ph_min: 6.5, ph_max: 7.2, notes: "Tolerates cooler temperatures well" },
            kale: { n: 75, p: 21, k: 95, ca: 80, mg: 18, fe: 2.0, ec: 1.3, ph_min: 6.0, ph_max: 6.8, notes: "PPM over 600 but below 900 for optimal growth" },
            swiss_chard: { n: 70, p: 19, k: 82, ca: 70, mg: 14, fe: 1.75, ec: 1.2, ph_min: 6.0, ph_max: 6.5, notes: "EC around 2.0 mS/cm for optimal yield" },
            arugula: { n: 60, p: 14, k: 65, ca: 57, mg: 11, fe: 1.6, ec: 0.85, ph_min: 6.0, ph_max: 6.5, notes: "EC between 0.5 and 2.0 mS/cm" },
            pac_choi: { n: 65, p: 17, k: 80, ca: 65, mg: 14, fe: 1.75, ec: 1.25, ph_min: 6.0, ph_max: 6.8, notes: "Same EC range as arugula" },
            
            // HERBS
            basil: { n: 95, p: 25, k: 150, ca: 95, mg: 22, fe: 2.05, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Highest production in micronutrient supplemented systems" },
            mint: { n: 80, p: 21, k: 130, ca: 80, mg: 18, fe: 1.85, ec: 1.3, ph_min: 5.5, ph_max: 6.5, notes: "Shows stress response without supplementation" },
            parsley: { n: 70, p: 17, k: 110, ca: 72, mg: 15, fe: 1.65, ec: 1.1, ph_min: 6.0, ph_max: 7.0, notes: "Prefers cooler water temperatures" },
            cilantro: { n: 65, p: 15, k: 100, ca: 65, mg: 13, fe: 1.5, ec: 1.05, ph_min: 6.0, ph_max: 6.8, notes: "Fast-growing, harvest in 2-3 weeks" },
            chives: { n: 55, p: 14, k: 85, ca: 55, mg: 11, fe: 1.3, ec: 1.0, ph_min: 6.0, ph_max: 7.0, notes: "Low nutrient requirements" },
            oregano: { n: 62, p: 16, k: 95, ca: 65, mg: 14, fe: 1.5, ec: 1.15, ph_min: 6.0, ph_max: 7.0, notes: "Mediterranean herb, drought tolerant" },
            thyme: { n: 57, p: 14, k: 90, ca: 60, mg: 12, fe: 1.4, ec: 1.05, ph_min: 6.5, ph_max: 7.5, notes: "Prefers slightly alkaline conditions" },
            
            // FRUITING VEGETABLES
            tomatoes: { n: 150, p: 45, k: 275, ca: 150, mg: 37, fe: 2.5, ec: 2.0, ph_min: 5.8, ph_max: 6.5, notes: "K accumulates in fruits; Ca decreases during fruiting" },
            peppers: { n: 115, p: 37, k: 225, ca: 120, mg: 30, fe: 2.3, ec: 1.85, ph_min: 5.8, ph_max: 6.5, notes: "Require warmer water temperatures" },
            cucumbers: { n: 135, p: 41, k: 250, ca: 135, mg: 33, fe: 2.15, ec: 2.0, ph_min: 5.8, ph_max: 6.8, notes: "High water content, need good aeration" },
            eggplant: { n: 122, p: 36, k: 225, ca: 127, mg: 31, fe: 2.3, ec: 2.05, ph_min: 5.5, ph_max: 6.0, notes: "PPM range of 1750-2450 recommended" }
        };

        // Core water quality parameters for aquaponics
        this.systemParameters = {
            pH: { optimal_min: 6.4, optimal_max: 7.0, critical_min: 6.0, critical_max: 7.5 },
            ec: { optimal_min: 1000, optimal_max: 3000, unit: "µS/cm" },
            salinity: { optimal_min: 1.0, optimal_max: 1.5, critical_max: 2.0, unit: "ppt" },
            dissolved_oxygen: { warm_fish: 4, cold_fish: 6, unit: "ppm" },
            ammonia: { safe_max: 0.1, toxic_threshold: 0.75, unit: "mg/L" },
            nitrite: { safe_max: 0.1, toxic_threshold: 0.75, unit: "mg/L" },
            nitrate: { optimal_min: 5, optimal_max: 80, unit: "mg/L" },
            temperature: { optimal_min: 18, optimal_max: 23, unit: "°C" }
        };

        // Nutrient deficiency diagnostic framework
        this.deficiencyDiagnostic = {
            mobile_nutrients: {
                list: ["nitrate", "phosphorus", "potassium", "magnesium", "sulfur", "chlorine"],
                symptom_location: "older_leaves_first",
                description: "Plant can relocate these nutrients from old to new growth when deficient"
            },
            immobile_nutrients: {
                list: ["calcium", "iron", "boron", "zinc", "copper", "manganese", "molybdenum"],
                symptom_location: "new_leaves_first", 
                description: "Once incorporated, cannot be moved within plant"
            },
            deficiency_treatments: {
                iron: {
                    symptoms: ["Yellowing between veins on NEW leaves", "Veins remain green", "Interveinal chlorosis"],
                    treatments: [
                        { name: "Chelated Iron (DTPA)", dosage: "1.5-2.0 mg/L", frequency: "Weekly", notes: "Effective when pH ≤ 7.5" },
                        { name: "Chelated Iron (EDDHA)", dosage: "1.5-2.0 mg/L", frequency: "Weekly", notes: "More stable at higher pH" },
                        { name: "Foliar Iron Spray", dosage: "0.5 g/L", frequency: "2x weekly", notes: "Fast-acting relief" }
                    ]
                },
                potassium: {
                    symptoms: ["Brown scorching on leaf edges", "Weak stems", "Poor flowering", "Affects older leaves first"],
                    treatments: [
                        { name: "Potassium Sulfate (K₂SO₄)", dosage: "20-35 mg/L K", frequency: "Weekly", notes: "Also provides sulfur" },
                        { name: "Potassium Hydroxide (KOH)", dosage: "As needed for pH", frequency: "As needed", notes: "pH buffer + K source" },
                        { name: "Foliar Potassium Spray", dosage: "2-3 g/L K₂SO₄", frequency: "2x weekly", notes: "Effective for herbs" }
                    ]
                },
                calcium: {
                    symptoms: ["Distorted new growth", "Blossom end rot", "Tip burn in leafy greens", "Affects new growth first"],
                    treatments: [
                        { name: "Calcium Sulfate (Gypsum)", dosage: "20-15 mg/L Ca", frequency: "Bi-weekly", notes: "Most effective treatment" },
                        { name: "Calcium Chloride Spray", dosage: "4 tsp/gallon water", frequency: "Weekly", notes: "Fast-acting foliar" },
                        { name: "Crushed Oyster Shell", dosage: "50-100g per 1000L", frequency: "Monthly", notes: "Slow-release natural source" }
                    ]
                },
                magnesium: {
                    symptoms: ["Yellowing between veins on OLD leaves", "Affects older growth first", "Reduced chlorophyll"],
                    treatments: [
                        { name: "Magnesium Sulfate (Epsom Salt)", dosage: "10 mg/L Mg", frequency: "Every 3 weeks", notes: "Standard Mg treatment" },
                        { name: "Foliar Magnesium Spray", dosage: "1-2 g/L Epsom salt", frequency: "Weekly", notes: "Fast-acting relief" }
                    ]
                },
                phosphorus: {
                    symptoms: ["Reddish or purple leaves", "Delayed flowering", "Poor root development", "Affects older leaves first"],
                    treatments: [
                        { name: "Monopotassium Phosphate (KH₂PO₄)", dosage: "10-28 mg/L P", frequency: "Weekly", notes: "Provides both P and K" },
                        { name: "Fish Bone Meal", dosage: "20-50g per 1000L", frequency: "Monthly", notes: "Slow-release organic" }
                    ]
                },
                nitrate: {
                    symptoms: ["General yellowing of older leaves", "Stunted growth", "Pale appearance"],
                    treatments: [
                        { name: "Increase Fish Stocking", dosage: "Target 7+ kg/m³", frequency: "Gradual", notes: "Minimum for adequate nutrients" },
                        { name: "Increase Feeding Rate", dosage: "2-3% body weight", frequency: "Daily", notes: "More feed = more waste" },
                        { name: "Seaweed Extract", dosage: "1-2 ml/L", frequency: "Weekly", notes: "Organic nitrate boost" }
                    ]
                }
            }
        };

        // Weekly supplementation program
        this.supplementationSchedule = {
            iron: { dosage: 1.5, frequency: "Weekly", form: "DTPA or EDDHA with trace elements", unit: "mg/L" },
            potassium: { 
                vegetative: 20, 
                fruiting: 35, 
                frequency: "Weekly", 
                form: "Potassium sulfate or potassium silicate",
                unit: "mg/L"
            },
            calcium: { 
                vegetative: 20, 
                fruiting: 15, 
                frequency: "Bi-weekly", 
                form: "Calcium sulfate (gypsum)",
                unit: "mg/L"
            },
            magnesium: { dosage: 10, frequency: "Every 3 weeks", form: "Magnesium sulfate (Epsom salt)", unit: "mg/L" }
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
            <div class="crop-parameters" style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div><strong>pH Range:</strong> ${targets.ph_min} - ${targets.ph_max}</div>
                    <div><strong>EC Target:</strong> ${targets.ec} mS/cm</div>
                </div>
                ${targets.notes ? `<div style="font-size: 0.85rem; color: #555; font-style: italic;">💡 ${targets.notes}</div>` : ''}
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
        
        // Show action buttons when results are available
        const actionsDiv = document.getElementById('dosing-actions');
        if (actionsDiv) {
            actionsDiv.style.display = 'block';
        }
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

    showDosingNotification(message, type = 'info', duration = 4000) {
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
        this.showNotification('Custom nutrient deleted successfully.', 'success', 2000);
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

    async loadCurrentNutrientLevels() {
        if (!this.activeSystemId) {
            this.showNotification('⚠️ No active system selected', 'warning');
            return;
        }

        console.log('🔄 Loading current nutrient levels...');
        this.showNotification('🔄 Loading latest nutrient data...', 'info', 2000);

        // First try to get the latest values from water quality data
        await this.loadNutrientsFromWaterQualityData();

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
                console.log('💾 Using manually saved nutrient levels (more recent)');
                document.getElementById('current-n').value = levels.n || '';
                document.getElementById('current-p').value = levels.p || '';
                document.getElementById('current-k').value = levels.k || '';
                document.getElementById('current-ca').value = levels.ca || '';
                document.getElementById('current-mg').value = levels.mg || '';
                document.getElementById('current-fe').value = levels.fe || '';
                
                this.showNotification(`📊 Loaded manually saved nutrient levels from ${savedDate.toLocaleDateString()}`, 'success', 3000);
            }
        }
    }

    async loadNutrientsFromWaterQualityData() {
        if (!this.activeSystemId) return;
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.log('❌ No authentication token found');
            this.showNotification('⚠️ Please log in to load nutrient data', 'warning');
            return;
        }
        
        try {
            console.log('🌐 Fetching latest water quality data...');
            const response = await fetch(`${this.API_BASE}/data/latest/${this.activeSystemId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
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
                
                // Nitrate (NO₃) - Convert to nitrogen equivalent for calculator (NO3-N conversion factor ~0.225)
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
        
        this.showNotification('Current nutrient levels cleared.', 'info');
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
            
            // Update display fields
            this.updateSettingsDisplayFields();
            
            this.showNotification('🌱 Grow bed configuration updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update grow bed configuration:', error);
            this.showNotification('❌ Failed to update grow bed configuration. Please try again.', 'error');
        }
    }

    updateSettingsDisplayFields() {
        // Update fish tank display fields
        const fishTankCount = document.getElementById('fish-tank-count')?.value || '1';
        const fishTankCountDisplay = document.getElementById('fish-tank-count-display');
        if (fishTankCountDisplay) {
            fishTankCountDisplay.textContent = fishTankCount;
        }

        // Update grow bed display fields
        const growBedCount = document.getElementById('grow-bed-count')?.value || '4';
        const growBedCountDisplay = document.getElementById('grow-bed-count-display');
        if (growBedCountDisplay) {
            growBedCountDisplay.textContent = growBedCount;
        }

        // Update total grow area display
        const totalGrowArea = document.getElementById('total-grow-area')?.value || '0';
        const totalGrowAreaDisplay = document.getElementById('total-grow-area-display');
        if (totalGrowAreaDisplay) {
            totalGrowAreaDisplay.textContent = `${parseFloat(totalGrowArea).toFixed(1)} m²`;
        }

        // Update total fish volume (this method already updates the display)
        this.updateTotalFishVolume();
    }

    async updateFishTankCount() {
        const tankCount = parseInt(document.getElementById('fish-tank-count').value) || 1;
        
        try {
            // First, save any existing configuration before regenerating the form
            if (document.querySelector('.fish-tank-item')) {
                await this.saveFishTankConfiguration();
            }
            
            // Generate new form structure
            this.generateFishTankConfiguration(tankCount);
            
            // Load existing data into the new form
            await this.loadFishTankConfiguration();
            
            // Update display fields
            this.updateSettingsDisplayFields();
            
            this.showNotification('🐟 Fish tank configuration updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update fish tank configuration:', error);
            this.showNotification('❌ Failed to update fish tank configuration. Please try again.', 'error');
        }
    }

    generateFishTankConfiguration(tankCount) {
        const container = document.getElementById('fish-tanks-container');
        if (!container) return;

        let html = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; color: #666; font-size: 0.9rem;">
                    <strong>⚠️ Important:</strong> Configure and save each fish tank before saving system configuration.
                    <br><strong>Size (m³):</strong> Tank size in cubic meters for volume calculations
                    <br><strong>Fish Type:</strong> Type of fish in each tank for feeding and health calculations
                </p>
            </div>
        `;

        for (let i = 1; i <= tankCount; i++) {
            html += this.generateFishTankItem(i);
        }

        container.innerHTML = html;
        this.updateTotalFishVolume();
    }

    generateFishTankItem(tankNumber) {
        return `
            <div class="fish-tank-item" data-tank="${tankNumber}">
                <div>
                    <h5>Fish Tank ${tankNumber}</h5>
                    <div class="form-field">
                        <label>Size (m³):</label>
                        <input type="number" class="tank-size" min="0.1" max="50" step="0.1" placeholder="1.0" 
                               onchange="app.updateTotalFishVolume()" oninput="app.updateTankVolume(${tankNumber})">
                    </div>
                    <div class="form-field">
                        <label>Fish Type:</label>
                        <select class="fish-type">
                            <option value="">Select Fish Type</option>
                            <option value="tilapia"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;"><path d="m54.988 41.94366a70.19837 70.19837 0 0 1 -.81409-8.09222 70.18137 70.18137 0 0 1 .81415-8.09235.82984.82984 0 0 0 -1.13495-.88818l-8.77484 3.69257c-3.42117-3.79948-9.97561-6.22548-16.93307-6.22548-9.77 0-18.39685 4.90967-19.1452 10.6911h2.40961a.82254.82254 0 0 1 -.00006 1.64478h-2.40955c.74835 5.78137 9.37524 10.691 19.1452 10.691 6.95746 0 13.5119-2.426 16.933-6.23371l8.7749 3.70075a.82975.82975 0 0 0 1.1349-.88826zm-37.82168-10.14819a1.2337 1.2337 0 0 1 .00006-2.46716 1.2337 1.2337 0 0 1 -.00006 2.46716zm12.33588 6.34882a3.30529 3.30529 0 0 1 -3.28144 3.28949c-.36651.053-4.22149-.81372-4.67108-.88806a.82114.82114 0 0 1 -1.53784-.3866 27.35956 27.35956 0 0 0 .02454-12.418.82327.82327 0 1 1 1.612-.329 27.93369 27.93369 0 0 1 .65789 8.47882 46.883 46.883 0 0 1 4.334-1.89154c.0965-1.40936-.68182-1.23773-.329-2.17932a2.45171 2.45171 0 0 0 .04944-2.43421.82209.82209 0 0 1 -.04938-.85534 2.4518 2.4518 0 0 0 .04938-2.43421.82142.82142 0 0 1 1.34869-.9375 4.00913 4.00913 0 0 1 .2467 3.74182 4.12593 4.12593 0 0 1 0 3.28956 4.0171 4.0171 0 0 1 .31257 2.0971 2.45534 2.45534 0 0 1 1.23358 2.13825zm3.38824-4.30929a4.12652 4.12652 0 0 1 0 3.28955 4.13961 4.13961 0 0 1 -.19739 3.69251.82046.82046 0 1 1 -1.44744-.773 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85528 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85529 2.45168 2.45168 0 0 0 .04937-2.43426.82211.82211 0 0 1 -.04937-.85535 2.45158 2.45158 0 0 0 .04937-2.4342.82062.82062 0 0 1 .20557-1.14313c1.09613-.79718 2.34338 1.5622 1.38989 3.94745a4.1265 4.1265 0 0 1 0 3.28954zm4.73694 3.69251a.82058.82058 0 0 1 -1.44738-.77312 2.45169 2.45169 0 0 0 .04932-2.4342.82187.82187 0 0 1 -.04932-.85529 2.45175 2.45175 0 0 0 .04932-2.43426.82059.82059 0 0 1 .20563-1.14313c1.09332-.79889 2.3446 1.5647 1.38989 3.94745a4.13966 4.13966 0 0 1 -.19746 3.69251zm4.72052-1.64478a.82427.82427 0 0 1 -1.45563-.77307 2.45165 2.45165 0 0 0 .04932-2.4342.82809.82809 0 0 1 .20563-1.14313c1.12921-.84806 2.51056 1.82552 1.20068 4.35036zm8.02655 2.90308a21.66 21.66 0 0 1 -2.24512-.78949.82119.82119 0 0 1 .57563-1.53791l1.95727.73194a.82646.82646 0 0 1 -.28778 1.59542zm0-4.11194h-1.135a.82252.82252 0 0 1 0-1.64478h1.135a.82252.82252 0 0 1 0 1.64474zm.28778-4.4903a21.6413 21.6413 0 0 1 -2.24512.78955.82646.82646 0 0 1 -.28778-1.59546l1.95728-.73193a.82116.82116 0 0 1 .57562 1.5378z" fill="#0051b1"/><path d="m26.68964 35.67712-4.58075 2.12177c-.05756.38647-.11512.76483-.181 1.14313l3.95575.81408a1.65689 1.65689 0 0 0 1.97375-1.61181v-1.71875a.82791.82791 0 0 0 -1.16775-.74842z" fill="#0051b1"/><path d="m39.89722 23.037c-6.78473-5.46887-16.81794-6.35706-17.30316-6.3982a.80749.80749 0 0 0 -.87171.68256l-.72369 4.21887a30.11141 30.11141 0 0 1 7.14654-.847 29.66566 29.66566 0 0 1 11.75202 2.34377z" fill="#0051b1"/><path d="m32 2a30 30 0 1 0 30 30 30.03414 30.03414 0 0 0 -30-30zm0 58.29218a28.29221 28.29221 0 1 1 28.29224-28.29218 28.32516 28.32516 0 0 1 -28.29224 28.29218z" fill="#0051b1"/></svg> Tilapia</option>
                            <option value="trout"><svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 100 100" viewBox="0 0 100 100" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;"><path d="m54.96191 59.66748c-1.06738-.04834-4.33496-1.97461-6.31445-3.32666-.18408-.12549-.40771-.19287-.62744-.17236-.104.00635-10.49658.65918-16.03027.25049-2.98706-.2193-5.9267-.75238-8.91229-1.34186 1.31549-1.10309 3.2995-3.04572 3.80927-5.08441.56158-2.24603-.85437-4.50629-1.78333-5.69061 4.54456-1.39368 9.70428-2.93896 16.91223-3.05206.26562-.00439.51855-.11426.70361-.30518 3.12451-3.23096 7.41846-6.32471 8.58447-5.59668.02063.01288.04089.02795.06146.04108-1.77484 1.16016-3.79089 3.77069-4.53265 4.77753-.32727-.04553-.52832-.07349-.52832-.07349l-.27539 1.98047s9.58447 1.3335 12.00098 1.66699c.88135.12158 2.35498.24219 3.91504.37012 2.55859.20996 6.06348.49707 6.95947.82764.11132.041.22851.06151.3457.06151.11914 0 .23779-.021.35107-.06348 1.25146-.46924 3.50293-1.25488 4.21729-1.36475.5459-.08398.92041-.59424.83643-1.14014-.08398-.54639-.60156-.91797-1.14014-.83643-.98291.15088-3.39209 1.01709-4.29688 1.3501-1.25488-.32861-3.77881-.55469-7.10986-.82764-1.53174-.12549-2.97852-.24414-3.80469-.3584-.94812-.13086-3.00031-.41559-5.14307-.7132.87207-.92236 1.70776-1.66272 2.14917-1.89429.43439.54028.69775.91125.70532.92194.31641.45215.94141.56104 1.39258.24512.45215-.31689.56201-.93994.24561-1.39209-.1001-.14307-2.48242-3.52051-5.28955-5.2749-2.95898-1.85107-8.68555 3.47217-10.79248 5.60645-7.41016.17139-12.66748 1.78516-17.31641 3.21191-1.92383.59033-3.74072 1.14795-5.55615 1.55371-6.47803 1.44922-10.71924 4.71582-10.89697 4.854-.32764.25537-.46289.68701-.34033 1.08398.12305.39697.47852.67676.89307.70264.81885.05127 4.4209 1.26318 6.71729 2.10742.11377.04199.23047.06201.34521.06201.40723 0 .79004-.25098.93848-.65527.19043-.51855-.0752-1.09326-.59326-1.28369-.6333-.23291-2.94824-1.07471-4.86865-1.65479.78503-.46039 1.80908-1.00098 3.0116-1.53058.16705.64612.74878 1.12561 1.44714 1.12561.82843 0 1.5-.67157 1.5-1.5 0-.24835-.0661-.47913-.17297-.68542.77515-.25067 1.59387-.48102 2.45593-.67377 1.29089-.28894 2.57617-.65668 3.87842-1.04553.34869.37347 2.40753 2.68005 1.93311 4.57678-.4707 1.88428-3.18262 4.1333-4.18799 4.84131-.10693.0752-.19128.16974-.25867.27301-.38226-.06201-.75275-.13361-1.13879-.19391-2.27246-.35547-4.62207-.72266-6.64795-1.52393-.50098-.19775-.92773-.31982-1.30469-.42725-.65039-.18555-1.12012-.31982-1.72217-.77441-.44043-.33398-1.06885-.24512-1.40039.19531-.33301.44043-.24561 1.06738.19531 1.40039.89941.67969 1.65088.89404 2.37793 1.10205.33691.0957.69873.19824 1.11865.36426 2.23291.88232 4.69385 1.26758 7.07422 1.63965 1.00391.15674 1.99902.31201 2.96045.50342 3.28271.65479 6.50439 1.26221 9.83105 1.50635 5.16113.38281 14.07861-.11572 15.96191-.22803 1.30713.87598 5.21729 3.396 7.06592 3.47998.01562.00049.03076.00098.04639.00098.53125 0 .97363-.41846.99805-.95459.02489-.55173-.40187-1.01951-.95363-1.04441zm-4.18762-18.95288c-.58667-.08154-1.14447-.15906-1.66199-.23096 1.43713-1.80725 3.13007-3.53546 3.82471-3.66772.05853-.01117.10486-.04431.15869-.06476.31415.29108.61145.5896.89056.88403-.89031.57502-1.96044 1.60053-3.21197 3.07941z" fill="#0051b1"/></svg> Trout</option>
                            <option value="catfish"><svg xmlns="http://www.w3.org/2000/svg" id="Layer_2" viewBox="0 0 64 64" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;"><path d="m47.1155295 24.1677246c2.6532764.529534 5.044589 1.4316276 7.1071725 2.6807979.5403006.3273275 1.089329.7242869 1.6183534 1.1759708-.2118264-1.2184634-.5895462-2.4652766-1.2422262-3.1804533-1.813361-1.6640314-26.3839445-6.5062864-29.4265992-6.237697-1.2683462.1151189-1.9344047 1.5526713-2.2573363 2.6267743 5.9503139.0545333 13.8013314.8573712 24.2006359 2.9346073z" fill="#0051b1"/><path d="m33.9545424 31.9742526c-.1123298.5250399-.2545529 1.2942294-.4221916 2.4674375-.1074574.7522017.5920691 1.3611269 1.0176847 1.6561079 1.1030185.7658972 2.3482599.8817827 2.7823035.7711648.304726-1.1298828-.3281664-3.1553755-1.011627-4.604865-.7496996-.2088571-1.539169-.3019605-2.3661695-.2898452z" fill="#0051b1"/><path d="m11.576416 31.2006226c6.5237918 3.6058327 12.8864102 2.7625121 12.8140516-4.8353103 3.0488744-3.5109919 2.2919307 4.4495968-.8329725 7.5376418 3.2568571 2.1349583 7.913564-.7538779 11.4386558-1.2291121 4.4503433 1.2522076 10.0800679-.8130041 13.7398483 1.9389162 4.9116326-7.9367702-16.5277001-3.027739-18.7003735-2.9212553-4.1082576-1.817751 2.8982044-2.0975484 3.7204673-3.2954151 1.0409823-1.3424914-2.6439031-.9227009-3.635791-.5450525-5.5056777-2.1260204 7.9094262-4.4328407 5.7107526 1.0673607 4.588715-1.3431334 11.9827014-1.5430712 15.2460938 1.5915527 5.0143858-12.7196708 3.4850637 13.7859204-16.7236328 11.6218872 1.3293801 1.1420344 1.6478069 2.8973085 1.078125 4.5117188 7.3209905-2.4553212 16.855255-3.2807426 18.803833-7.5292358.0755414.3492258-15.3958173 8.6502329-12.5546226 3.3750429 21.8262046-4.9067795 19.5890925-15.0059387 5.6645264-18.710719-30.0851236-6.0076466-36.8751626-.6155568-38.2037759 1.0587596 7.3892591 6.4491261-6.2090201 1.3941353 2.4348145 6.3632202zm3.8191528-5.0973511c-1.5417271.0226149-1.5417777-2.3995156.0001074-2.3767025 1.5416197-.0226214 1.5416703 2.3995092-.0001074 2.3767025z" fill="#0051b1"/><path d="m45.4893617 33.8510638c-.5898836-.0692623-2.2686868-.3364663-3.7358922-.2695127-1.6119347.0724368-3.2369015.2002914-5.2553191.1914894.0008658.1201989.0113598.523322.0194404.6228865.5760311.1038934 1.5064541.2308742 2.240634.3313045 3.0436433.4171608 5.9693965.8265296 7.8585245 1.8886952.6289879-.4757451 1.2506166-.974722 1.8601245-1.5071756-1.0328734-.6235046-2.14713-1.1599985-2.987512-1.2576871z" fill="#0051b1"/><path d="m14.6230469 39.2182617c-.1254883 0-.2529297-.0239258-.3759766-.0742188-4.4770508-1.8198242-4.7314453-8.3725586-4.7402344-8.6503906-.0170898-.5517578.4155273-1.012207.9672852-1.0297852.5405273-.0214844 1.0126953.4145508 1.0317383.9663086.0019531.0551758.2246094 5.5322266 3.4941406 6.8613281.5117188.2080078.7578125.7910156.5498047 1.3027344-.1577148.3881836-.5317383.6240234-.9267578.6240234z" fill="#0051b1"/><path d="m22.315918 40.6220703c-.0795898 0-.159668-.0092773-.2402344-.0288086-.5361328-.1323242-.8637695-.6743164-.7319336-1.2104492.3754883-1.5244141-2.7802734-5.3032227-3.8393555-5.8193359-.7143555-.3481445-1.1171875-1.0053711-1.340332-1.7016602-.3242188.137207-.7104492.0991211-1.0078125-.1328125-.4350586-.340332-.5117188-.96875-.1713867-1.4038086l1.1489258-1.4682617c.2724609-.3486328.7416992-.4760742 1.1538086-.3144531.4121094.1625977.668457.5761719.6298828 1.0170898-.0722656.8793945.1142578 2.0361328.4628906 2.2060547 1.5092773.7353516 5.5957031 5.293457 4.9057617 8.0957031-.1123047.4560547-.5209961.7607422-.9702148.7607422z" fill="#0051b1"/></svg> Catfish</option>
                            <option value="goldfish"><svg xmlns="http://www.w3.org/2000/svg" id="Capa_1" enable-background="new 0 0 512.248 512.248" height="512" viewBox="0 0 512.248 512.248" width="512" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;"><path d="m460.489 188.173c-14.643-10.65-29.983-19.494-45.785-26.476-16.458-66.72-63.517-106.681-65.925-108.688l-8.078-6.731-97.135 56.663c-25.681 14.98-38.387 44.238-33.495 72.243-9.378 5.949-16.252 11.452-20.536 15.201-23.503-2.036-44.317-16.691-54.014-38.509l-3.416-7.687c-13.378-30.101-43.307-49.551-76.247-49.551h-55.858v83.162c0 35.286 12.647 69.474 35.611 96.266 18.307 21.358 28.389 48.612 28.389 76.742v115.162h15c55.324 0 100.333-45.009 100.333-100.333v-47.773c0-15.186 6.077-29.6 16.612-40.165l15.52 10.548v31.121c0 21.452 8.793 40.883 22.956 54.897-16.018 16.803-25.422 39.402-25.422 63.574v28.132h47.001c46.481 0 86.374-28.722 102.882-69.348 34.123-.298 67.62-11.961 94.462-32.932 27.385-21.394 46.774-51.663 54.598-85.231 2.69-11.543 4.055-28.46 4.057-40.453-2.499-3.08-24.209-29.979-51.51-49.834zm-280.322 63.305c-19.439 16.413-30.833 40.678-30.833 66.386v47.773c0 33.636-23.733 61.833-55.334 68.724v-83.553c0-35.286-12.646-69.474-35.611-96.266-18.307-21.358-28.389-48.613-28.389-76.742v-53.163h25.857c21.097 0 40.265 12.457 48.833 31.735l3.416 7.687c13.214 29.731 40.571 50.363 72.061 55.39zm78.514-122.625 78.321-45.687c5.943 6.112 14.676 16.003 23.312 29.093 7.979 12.094 14.361 24.508 19.171 37.178-17.471-4.496-35.281-6.8-53.152-6.8-35.531 0-64.7 7.748-87.165 17.302 1.029-12.529 7.959-24.346 19.513-31.086zm-2.681 307.117h-16.974c.522-17.505 8.352-33.642 21.119-44.839 8.85 3.539 18.492 5.506 28.59 5.506h36.69c-14.184 23.545-39.992 39.333-69.425 39.333zm222.725-164.319c-6.259 26.855-21.778 51.094-43.701 68.278-35.45-.878-64.024-29.967-64.024-65.625h-30c0 38.056 22.338 70.99 54.589 86.387-12.25 3.89-25.096 5.946-38.049 5.946h-68.805c-26.065 0-47.271-21.205-47.271-47.27v-47.005l-31.101-21.137-.17-39.025c4.878-4.152 13.92-11.102 26.818-17.975 26.879-14.325 56.931-21.588 89.32-21.588 40.684 0 79.615 13.196 115.715 39.222 20.343 14.666 34.059 29.539 39.846 36.32-.321 7.944-1.384 15.818-3.167 23.472z" fill="#0051b1"/><path d="m512 237.97v.036c.32.396.341.419 0-.036z" fill="#0051b1"/><path d="m405.333 243.97h30v30h-30z" fill="#0051b1"/></svg> Goldfish</option>
                            <option value="carp"><svg xmlns="http://www.w3.org/2000/svg" height="300" viewBox="-22 0 464 464" width="300" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;"><path d="m0 120c0 22.585938 20.03125 23.953125 24.046875 24l9.089844.105469-1.214844 9.015625c-1.058594 7.527344-1.738281 29.4375 7.621094 40.191406 3.914062 4.496094 9.296875 6.6875 16.457031 6.6875 17.167969 0 22.390625-10.121094 29.503906-26.632812 4.25-9.847657 9.007813-20.792969 18.742188-26.527344-.054688-3.425782-.230469-6.726563-.230469-10.214844-18.503906 2.773438-35.382813 13.902344-35.574219 14.03125l-8.875-13.3125c.960938-.640625 21.738282-14.28125 45.035156-16.878906.039063-.585938.023438-1.234375.070313-1.800782-9.609375-1.734374-30.175781-4.375-46.128906.929688l-5.0625-15.167969c18.847656-6.296875 41.457031-3.722656 52.96875-1.707031.933593-6.34375 2.101562-12.292969 3.4375-17.886719-7.039063-2.097656-19.6875-4.824219-37.871094-4.824219-30.078125-.007812-72.015625 15.214844-72.015625 39.992188zm0 0" fill="#0051b1"/><path d="m120 312c0 17.648438 14.351562 32 32 32 2.304688 0 4.59375-.320312 6.847656-.855469-11.785156-15.609375-21.664062-33.433593-29.65625-53.425781-5.792968 5.898438-9.191406 13.855469-9.191406 22.28125zm0 0" fill="#0051b1"/><path d="m330.527344 104.414062-5.0625 15.171876c-15.953125-5.304688-36.511719-2.664063-46.128906-.929688.039062.574219.03125 1.222656.070312 1.808594 23.296875 2.597656 44.066406 16.238281 45.035156 16.878906l-8.867187 13.320312c-.191407-.128906-17.140625-11.238281-35.574219-14.03125 0 3.542969-.03125 6.984376-.089844 10.3125 9.632813 5.765626 14.378906 16.628907 18.59375 26.421876 7.113282 16.511718 12.335938 26.632812 29.503906 26.632812 7.167969 0 12.558594-2.191406 16.480469-6.710938 9.398438-10.832031 8.671875-32.664062 7.601563-40.160156l-1.304688-9.136718h9.214844c3.96875-.046876 24-1.417969 24-24 0-24.785157-41.9375-40-72-40-18.175781 0-30.832031 2.726562-37.871094 4.824218 1.335938 5.589844 2.496094 11.542969 3.4375 17.886719 11.511719-2 34.128906-4.574219 52.960938 1.710937zm0 0" fill="#0051b1"/><path d="m240 312c0-29.183594 4.910156-47.511719 10.113281-66.921875 2.949219-11.03125 6.078125-22.765625 8.621094-37.605469-15.132813-2.535156-26.734375-15.625-26.734375-31.472656h16c0 7.800781 5.625 14.296875 13.015625 15.695312 1.808594-15.007812 2.984375-32.992187 2.984375-55.695312 0-.070312-.007812-.128906-.007812-.199219-6.703126 5.070313-14.960938 8.199219-23.992188 8.199219-22.054688 0-40-17.945312-40-40h16c0 13.230469 10.769531 24 24 24 10.449219 0 19.265625-6.753906 22.550781-16.089844-3.71875-33.207031-14.382812-55.628906-22-71.324218-1.519531-3.128907-2.839843-5.921876-4.03125-8.585938h-20.519531v-16h16c0-8.824219-7.175781-16-16-16h-48c-8.824219 0-16 7.175781-16 16h16v16h-20.519531c-1.199219 2.664062-2.519531 5.464844-4.03125 8.585938-7.617188 15.6875-18.28125 38.117187-22 71.324218 3.285156 9.335938 12.101562 16.089844 22.550781 16.089844 13.230469 0 24-10.769531 24-24h16c0 22.054688-17.945312 40-40 40-9.039062 0-17.289062-3.128906-23.992188-8.199219 0 .070313-.007812.128907-.007812.199219 0 19.703125.953125 38.207031 2.6875 55.726562 7.535156-1.277343 13.3125-7.824218 13.3125-15.726562h16c0 16.113281-12 29.34375-27.511719 31.542969 13.464844 100.175781 57.671875 162.136719 134.070313 188.074219-7.3125-19.921876-18.558594-55.210938-18.558594-83.617188zm-16-256h16v16h-16zm-64 16h-16v-16h16zm16 88c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32s-32-14.351562-32-32zm16 136c-17.648438 0-32-14.351562-32-32h16c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32zm1.015625-72h-2.03125c-3.550781 13.792969-16.105469 24-30.984375 24-17.648438 0-32-14.351562-32-32h16c0 8.824219 7.175781 16 16 16s16-7.175781 16-16v-8h32v8c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32-14.878906 0-27.433594-10.207031-30.984375-24zm0 0" fill="#0051b1"/><path d="m256 312c0 1.136719.089844 2.335938.128906 3.503906 9.640625-5.59375 15.871094-15.855468 15.871094-27.503906 0-9.007812-3.910156-17.457031-10.390625-23.414062-3.25 13.605468-5.609375 27.726562-5.609375 47.414062zm0 0" fill="#0051b1"/><path d="m286.425781 425.734375 16.773438-1.695313c.746093-.070312 70.792969-7.589843 116.617187-47.597656-9.089844-6.410156-27.222656-16.441406-51.816406-16.441406-13.183594 0-23.59375 3.902344-34.609375 8.039062-17.039063 6.394532-36.054687 13.503907-65.695313 4.703126 1.625 5.128906 3.234376 9.832031 4.730469 14.042968 9.367188 3.285156 30.894531 8.621094 52-1.9375l7.160157 14.3125c-11.96875 5.984375-23.867188 7.976563-34.410157 7.976563-6.527343 0-12.449219-.800781-17.640625-1.855469l6.265625 14.621094-15.832031-4.167969c-10.039062-2.636719-19.472656-6.015625-28.609375-9.734375 1.976563 8.726562 6.863281 19.199219 19.089844 27.34375l-8.875 13.3125c-16.679688-11.121094-25.765625-27.449219-27.253907-48.488281-8.433593-4.351563-16.488281-9.152344-24.039062-14.542969 1.222656 15.789062 5.878906 40.757812 22.382812 58.535156 13.464844 14.496094 32.761719 21.839844 57.351563 21.839844 21.894531 0 38.457031-5.382812 49.550781-10.792969-10.550781-2.429687-22.65625-7-31.207031-15.550781zm0 0" fill="#0051b1"/></svg> Carp</option>
                        </select>
                    </div>
                    <div class="tank-volume">
                        <span id="tank-volume-${tankNumber}">0 L</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                    <button type="button" class="form-btn secondary" onclick="app.saveTankConfiguration(${tankNumber})" 
                            style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Save Tank Config</button>
                    <button type="button" class="form-btn" onclick="app.deleteTankConfiguration(${tankNumber})" 
                            style="font-size: 0.8rem; padding: 0.3rem 0.6rem; background: #dc3545; border-color: #dc3545;">Delete Tank</button>
                </div>
            </div>
        `;
    }

    updateTankVolume(tankNumber) {
        const tankItem = document.querySelector(`[data-tank="${tankNumber}"]`);
        if (!tankItem) return;

        const sizeInput = tankItem.querySelector('.tank-size');
        const volumeDisplay = document.getElementById(`tank-volume-${tankNumber}`);
        
        if (sizeInput && volumeDisplay) {
            const sizeM3 = parseFloat(sizeInput.value) || 0;
            const volumeL = sizeM3 * 1000; // Convert m³ to liters
            volumeDisplay.textContent = `${volumeL.toLocaleString()} L`;
        }
    }

    updateTotalFishVolume() {
        const tankItems = document.querySelectorAll('.fish-tank-item');
        let totalVolumeL = 0;

        tankItems.forEach(item => {
            const sizeInput = item.querySelector('.tank-size');
            if (sizeInput && sizeInput.value) {
                const sizeM3 = parseFloat(sizeInput.value) || 0;
                totalVolumeL += sizeM3 * 1000; // Convert m³ to liters
            }
        });

        const totalVolumeField = document.getElementById('total-fish-volume');
        if (totalVolumeField) {
            totalVolumeField.value = Math.round(totalVolumeL);
        }

        // Update display field in Fish Tanks tab
        const totalVolumeDisplay = document.getElementById('total-fish-volume-display');
        if (totalVolumeDisplay) {
            totalVolumeDisplay.textContent = `${Math.round(totalVolumeL).toLocaleString()} L`;
        }
    }

    async saveTankConfiguration(tankNumber) {
        if (!this.activeSystemId) {
            this.showNotification('❌ Please select a system first.', 'error');
            return;
        }

        const tankItem = document.querySelector(`[data-tank="${tankNumber}"]`);
        if (!tankItem) return;

        const sizeM3 = parseFloat(tankItem.querySelector('.tank-size').value);
        const fishType = tankItem.querySelector('.fish-type').value;

        if (!sizeM3 || !fishType) {
            this.showNotification('❌ Please fill in all tank fields before saving.', 'error');
            return;
        }

        const tankData = {
            system_id: this.activeSystemId,
            tank_number: tankNumber,
            size_m3: sizeM3,
            volume_liters: sizeM3 * 1000,
            fish_type: fishType
        };

        try {
            await this.makeApiCall('/fish-tanks', {
                method: 'POST',
                body: JSON.stringify(tankData)
            });
            
            this.showNotification(`🐟 Fish Tank ${tankNumber} configuration saved successfully!`, 'success');
        } catch (error) {
            console.error('Failed to save tank configuration:', error);
            this.showNotification(`❌ Failed to save Fish Tank ${tankNumber} configuration.`, 'error');
        }
    }

    async deleteTankConfiguration(tankNumber) {
        if (!this.activeSystemId) return;

        if (!confirm(`Are you sure you want to delete Fish Tank ${tankNumber} configuration?`)) {
            return;
        }

        try {
            await this.makeApiCall(`/fish-tanks/system/${this.activeSystemId}/tank/${tankNumber}`, {
                method: 'DELETE'
            });
            
            this.showNotification(`Fish Tank ${tankNumber} configuration deleted successfully!`, 'success');
            
            // Refresh the configuration
            const tankCount = parseInt(document.getElementById('fish-tank-count').value) || 1;
            this.generateFishTankConfiguration(tankCount);
            await this.loadFishTankConfiguration();
        } catch (error) {
            console.error('Failed to delete tank configuration:', error);
            this.showNotification(`❌ Failed to delete Fish Tank ${tankNumber} configuration.`, 'error');
        }
    }

    async saveFishTankConfiguration() {
        const tankItems = document.querySelectorAll('.fish-tank-item');
        const promises = [];

        tankItems.forEach((item, index) => {
            const tankNumber = index + 1;
            const sizeInput = item.querySelector('.tank-size');
            const fishTypeSelect = item.querySelector('.fish-type');
            
            if (sizeInput.value && fishTypeSelect.value) {
                promises.push(this.saveTankConfiguration(tankNumber));
            }
        });

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    async loadFishTankConfiguration() {
        if (!this.activeSystemId) return;

        try {
            const response = await this.makeApiCall(`/fish-tanks/system/${this.activeSystemId}`);
            const fishTanks = response.tanks || [];
            
            if (fishTanks && fishTanks.length > 0) {
                fishTanks.forEach(tank => {
                    const tankItem = document.querySelector(`[data-tank="${tank.tank_number}"]`);
                    if (tankItem) {
                        const sizeInput = tankItem.querySelector('.tank-size');
                        const fishTypeSelect = tankItem.querySelector('.fish-type');
                        
                        if (sizeInput && tank.size_m3) {
                            sizeInput.value = tank.size_m3;
                            this.updateTankVolume(tank.tank_number);
                        }
                        
                        if (fishTypeSelect && tank.fish_type) {
                            fishTypeSelect.value = tank.fish_type;
                        }
                    }
                });
                
                this.updateTotalFishVolume();
            }
        } catch (error) {
            console.error('Failed to load fish tank configuration:', error);
            // Don't show error notification as this might be a new system without fish tanks yet
        }
    }

    async loadGrowBedConfiguration() {
        if (!this.activeSystemId) return;

        try {
            const growBeds = await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`);
            console.log('Loaded grow beds:', growBeds);
            
            // Generate the configuration UI first
            const bedCountElement = document.getElementById('grow-bed-count');
            const systemConfig = this.loadSystemConfig();
            let bedCount = 4; // Default
            
            if (bedCountElement && bedCountElement.value) {
                bedCount = parseInt(bedCountElement.value);
            } else if (systemConfig && systemConfig.grow_bed_count) {
                bedCount = parseInt(systemConfig.grow_bed_count);
            }
            
            console.log('Generating grow bed configuration for', bedCount, 'beds');
            window.growBedManager.generateGrowBedConfiguration(bedCount);
            
            // Also generate initial empty configuration if no existing beds
            if (!growBeds || growBeds.length === 0) {
                console.log('No existing beds found, form ready for new configuration');
            }
            
            // Load existing data with a small delay to ensure DOM is ready
            if (growBeds && growBeds.length > 0) {
                console.log('Loading data for', growBeds.length, 'grow beds');
                setTimeout(() => {
                    growBeds.forEach(bed => {
                        console.log('Processing bed:', bed);
                        const bedItem = document.querySelector(`[data-bed="${bed.bed_number}"]`);
                        console.log('Found bedItem:', bedItem);
                        if (bedItem) {
                            // First set the bed type
                            console.log('Setting bed type to:', bed.bed_type);
                            const bedTypeSelect = bedItem.querySelector('.bed-type');
                            if (bedTypeSelect) {
                                bedTypeSelect.value = bed.bed_type;
                                console.log('Bed type select value after setting:', bedTypeSelect.value);
                                
                                // Update the fields based on bed type
                                window.growBedManager.updateBedFields(bed.bed_number);
                            } else {
                                console.error('Could not find bed type select for bed', bed.bed_number);
                            }
                        
                        // Set the dimension values based on bed type
                        if (bed.bed_type === 'dwc' || bed.bed_type === 'media-flow' || bed.bed_type === 'flood-drain') {
                            if (bed.length_meters) {
                                const lengthField = bedItem.querySelector('.bed-length');
                                if (lengthField) lengthField.value = bed.length_meters;
                            }
                            if (bed.width_meters) {
                                const widthField = bedItem.querySelector('.bed-width');
                                if (widthField) widthField.value = bed.width_meters;
                            }
                            if (bed.height_meters) {
                                const heightField = bedItem.querySelector('.bed-height');
                                if (heightField) heightField.value = bed.height_meters;
                            }
                        } else if (bed.bed_type === 'vertical') {
                            if (bed.length_meters) {
                                const baseLengthField = bedItem.querySelector('.base-length');
                                if (baseLengthField) baseLengthField.value = bed.length_meters;
                            }
                            if (bed.width_meters) {
                                const baseWidthField = bedItem.querySelector('.base-width');
                                if (baseWidthField) baseWidthField.value = bed.width_meters;
                            }
                            if (bed.height_meters) {
                                const baseHeightField = bedItem.querySelector('.base-height');
                                if (baseHeightField) baseHeightField.value = bed.height_meters;
                            }
                            if (bed.vertical_count) {
                                const verticalCountField = bedItem.querySelector('.vertical-count');
                                if (verticalCountField) verticalCountField.value = bed.vertical_count;
                            }
                            if (bed.plants_per_vertical) {
                                const plantsPerVerticalField = bedItem.querySelector('.plants-per-vertical');
                                if (plantsPerVerticalField) plantsPerVerticalField.value = bed.plants_per_vertical;
                            }
                        } else if (bed.bed_type === 'nft') {
                            if (bed.trough_length) {
                                const troughLengthField = bedItem.querySelector('.trough-length');
                                if (troughLengthField) troughLengthField.value = bed.trough_length;
                            }
                            if (bed.trough_count) {
                                const troughCountField = bedItem.querySelector('.trough-count');
                                if (troughCountField) troughCountField.value = bed.trough_count;
                            }
                            if (bed.plant_spacing) {
                                const plantSpacingField = bedItem.querySelector('.plant-spacing');
                                if (plantSpacingField) plantSpacingField.value = bed.plant_spacing;
                            }
                            if (bed.reservoir_volume_liters) {
                                const reservoirVolumeField = bedItem.querySelector('.reservoir-volume');
                                if (reservoirVolumeField) reservoirVolumeField.value = bed.reservoir_volume_liters;
                            }
                        }
                        
                        // Trigger calculation to update the displayed values
                        window.growBedManager.calculateBed(bed.bed_number);
                    });
                }, 100);
            }
            // Update total grow bed volume display after loading beds
            setTimeout(() => {
                this.updateTotalGrowBedVolume();
            }, 200);
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
            
            // Update the total grow bed volume display
            this.updateTotalGrowBedVolume();
        } catch (error) {
            console.error('Error saving grow bed configuration:', error);
            throw error;
        }
    }

    async calculateTotalGrowBedVolume() {
        if (!this.activeSystemId) return 0;

        try {
            const growBeds = await this.makeApiCall(`/grow-beds/system/${this.activeSystemId}`);
            let totalVolume = 0;
            
            if (growBeds && growBeds.length > 0) {
                totalVolume = growBeds.reduce((sum, bed) => {
                    return sum + (bed.volume_liters || 0);
                }, 0);
            }
            
            return totalVolume;
        } catch (error) {
            console.error('Error calculating total grow bed volume:', error);
            return 0;
        }
    }

    async updateTotalGrowBedVolume() {
        const totalVolume = await this.calculateTotalGrowBedVolume();
        const displayElement = document.getElementById('total-grow-volume-display');
        
        if (displayElement) {
            displayElement.textContent = `Auto-calculated: ${Math.round(totalVolume)} L`;
            displayElement.style.color = totalVolume > 0 ? '#28a745' : '#6c757d';
        }
        
        // Update the system object with calculated volume
        if (this.systems[this.activeSystemId]) {
            this.systems[this.activeSystemId].total_grow_volume = totalVolume;
        }
        
        return totalVolume;
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
        // nitrate field already handled above
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

    // Enhanced Dosing Calculator Methods
    async updateReservoirVolume() {
        const activeSystem = this.getActiveSystem();
        if (activeSystem) {
            // Calculate total grow bed volume from individual beds
            const totalGrowVolume = await this.calculateTotalGrowBedVolume();
            
            // Calculate total reservoir volume = fish tank volume + grow bed volume
            const totalVolume = (activeSystem.total_fish_volume || 0) + totalGrowVolume;
            const reservoirInput = document.getElementById('reservoir-volume');
            if (reservoirInput) {
                reservoirInput.value = totalVolume;
            }
        }
    }

    async downloadDosingSchedulePDF() {
        const resultsDiv = document.getElementById('dosing-results');
        if (!resultsDiv.innerHTML.trim()) {
            this.showMessage('Please calculate dosing first', 'warning');
            return;
        }

        try {
            // Create PDF content
            const pdfContent = this.generatePDFContent();
            
            // Use browser's print to PDF functionality
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Aquaponics Dosing Schedule</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #334e9d; padding-bottom: 10px; margin-bottom: 20px; }
                        .section { margin-bottom: 20px; }
                        .nutrient-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                        .nutrient-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
                        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f5f5f5; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    ${pdfContent}
                    <div class="no-print" style="margin-top: 20px; text-align: center;">
                        <button onclick="window.print()">Print/Save as PDF</button>
                        <button onclick="window.close()">Close</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Failed to generate PDF', 'error');
        }
    }

    generatePDFContent() {
        const activeSystem = this.getActiveSystem();
        const crop = document.getElementById('crop-type').value;
        const reservoirVolume = document.getElementById('reservoir-volume').value;
        const resultsDiv = document.getElementById('dosing-results');
        
        const systemName = activeSystem ? activeSystem.system_name : 'Unknown System';
        const currentDate = new Date().toLocaleDateString();
        
        return `
            <div class="header">
                <h1>🌿 Afraponix Go - Nutrient Dosing Schedule</h1>
                <p><strong>System:</strong> ${systemName} | <strong>Crop:</strong> ${crop} | <strong>Date:</strong> ${currentDate}</p>
                <p><strong>Reservoir Volume:</strong> ${reservoirVolume}L</p>
            </div>
            
            <div class="section">
                <h2>Dosing Instructions</h2>
                ${resultsDiv.innerHTML}
            </div>
            
            <div class="section">
                <h2>Safety Guidelines</h2>
                <div class="warning">
                    <strong>⚠️ Important Safety Notes:</strong>
                    <ul>
                        <li>Always dissolve nutrients in small amounts of water before adding to reservoir</li>
                        <li>Add nutrients slowly and mix thoroughly</li>
                        <li>Test pH after nutrient addition and adjust if necessary (target: 6.0-7.0)</li>
                        <li>Monitor fish behavior for 24 hours after dosing</li>
                        <li>Keep nutrients in cool, dry place away from children</li>
                    </ul>
                </div>
            </div>
            
            <div class="section">
                <h2>Monitoring Schedule</h2>
                <table>
                    <tr><th>Frequency</th><th>Parameter</th><th>Target Range</th></tr>
                    <tr><td>Daily</td><td>pH</td><td>6.0 - 7.0</td></tr>
                    <tr><td>Weekly</td><td>EC</td><td>1.5 - 2.5 mS/cm</td></tr>
                    <tr><td>Weekly</td><td>Nitrate</td><td>5 - 150 ppm</td></tr>
                    <tr><td>Monthly</td><td>Full Nutrient Analysis</td><td>As per crop requirements</td></tr>
                </table>
            </div>
            
            <div style="margin-top: 40px; text-align: center; font-size: 0.9em; color: #666;">
                Generated by Afraponix Go Aquaponics Management System
            </div>
        `;
    }

    async emailDosingSchedule() {
        this.showMessage('Email functionality will be available in a future update', 'info');
    }

    // Admin Panel Methods
    async loadAdminUsers() {
        try {
            const users = await this.makeApiCall('/admin/users');
            this.displayAdminUsers(users);
        } catch (error) {
            console.error('Error loading admin users:', error);
            this.showMessage('Failed to load users', 'error');
        }
    }

    displayAdminUsers(users) {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        let html = '<div class="users-grid">';
        
        users.forEach(user => {
            html += `
                <div class="user-card">
                    <div class="user-header">
                        <h4>${user.first_name || ''} ${user.last_name || ''}</h4>
                        <span class="user-role ${user.user_role}">${user.user_role}</span>
                    </div>
                    <div class="user-details">
                        <div><strong>Username:</strong> ${user.username}</div>
                        <div><strong>Email:</strong> ${user.email}</div>
                        <div><strong>Subscription:</strong> ${user.subscription_status}</div>
                        <div><strong>Created:</strong> ${new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="user-actions">
                        <select onchange="app.updateUserRole(${user.id}, this.value)" class="role-select">
                            <option value="basic" ${user.user_role === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="subscribed" ${user.user_role === 'subscribed' ? 'selected' : ''}>Subscribed</option>
                            <option value="admin" ${user.user_role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button onclick="app.resetUserPassword(${user.id})" class="admin-btn secondary">Reset Password</button>
                        ${user.id !== this.user.id ? `<button onclick="app.deleteUser(${user.id})" class="admin-btn danger">Delete</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    async updateUserRole(userId, newRole) {
        try {
            await this.makeApiCall(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ userRole: newRole })
            });
            
            this.showMessage('User role updated successfully', 'success');
            this.loadAdminUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
            this.showMessage('Failed to update user role', 'error');
        }
    }

    async resetUserPassword(userId) {
        const newPassword = prompt('Enter new password (minimum 6 characters):');
        if (!newPassword || newPassword.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            await this.makeApiCall(`/admin/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword })
            });
            
            this.showMessage(`Password reset successfully. New password: ${newPassword}`, 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            this.showMessage('Failed to reset password', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await this.makeApiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            this.showMessage('User deleted successfully', 'success');
            this.loadAdminUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showMessage('Failed to delete user', 'error');
        }
    }

    async loadAdminStats() {
        try {
            const stats = await this.makeApiCall('/admin/stats');
            this.displayAdminStats(stats);
        } catch (error) {
            console.error('Error loading admin stats:', error);
            this.showMessage('Failed to load statistics', 'error');
        }
    }

    displayAdminStats(stats) {
        const container = document.getElementById('admin-stats-container');
        if (!container) return;

        let html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Systems</h4>
                    <div class="stat-value">${stats.totalSystems}</div>
                </div>
                <div class="stat-card">
                    <h4>Recent Registrations</h4>
                    <div class="stat-value">${stats.recentRegistrations}</div>
                    <small>Last 30 days</small>
                </div>
                <div class="stat-card">
                    <h4>User Breakdown</h4>
                    <div class="user-breakdown">
        `;

        stats.users.forEach(userStat => {
            html += `
                <div class="user-stat">
                    <span class="role ${userStat.user_role}">${userStat.user_role}</span>
                    <span class="count">${userStat.count}</span>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Plant Management Methods
    async loadPlantAllocations() {
        if (!this.activeSystemId) return;
        
        try {
            const allocations = await this.makeApiCall(`/plants/allocations/${this.activeSystemId}`);
            const utilization = await this.makeApiCall(`/plants/utilization/${this.activeSystemId}`);
            
            await this.displayPlantAllocations(allocations, utilization);
        } catch (error) {
            console.error('Error loading plant allocations:', error);
            this.showMessage('Failed to load plant allocations', 'error');
        }
    }

    async displayPlantAllocations(allocations, utilization) {
        const container = document.getElementById('grow-bed-allocation-container');
        if (!container) return;

        // Get crop options including custom crops
        const cropOptionsHtml = await this.generateCropOptionsHtml();
        
        let html = '<div class="allocation-list">';
        
        utilization.forEach(bed => {
            const bedAllocations = allocations.filter(a => a.grow_bed_id === bed.id);
            
            html += `
                <div class="grow-bed-allocation-card">
                    <div class="bed-header">
                        <div class="bed-title">
                            <h4>🌱 ${bed.bed_name || `Bed ${bed.bed_number} - ${this.getBedTypeDisplayName(bed.bed_type)}`}</h4>
                            <div class="bed-type-badge ${bed.bed_type}">${this.getBedTypeDisplayName(bed.bed_type)}</div>
                        </div>
                        <div class="bed-stats">
                            <div class="stat-item">
                                <span class="stat-label">Area:</span>
                                <span class="stat-value">${bed.equivalent_m2}m²</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Used:</span>
                                <span class="stat-value utilization ${bed.total_allocated >= 100 ? 'full' : bed.total_allocated >= 80 ? 'high' : ''}">${bed.total_allocated.toFixed(1)}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Available:</span>
                                <span class="stat-value available">${bed.available_percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bed-utilization-bar">
                        <div class="utilization-fill" style="width: ${bed.total_allocated}%"></div>
                    </div>
                    
                    <div class="bed-allocations">
                        ${bedAllocations.map(allocation => {
                            const cleanCropName = this.cleanCustomCropName(allocation.crop_type);
                            const displayName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
                            return `
                            <div class="allocation-item" id="allocation-${allocation.id}">
                                <div class="allocation-info">
                                    <div class="allocation-crop">
                                        <span class="crop-icon">🌿</span>
                                        <span class="crop-name">${displayName}</span>
                                    </div>
                                    <div class="allocation-details">
                                        <div class="allocation-percentage">
                                            <span class="percentage-value">${allocation.percentage_allocated}%</span>
                                            <span class="percentage-label">allocation</span>
                                        </div>
                                        <div class="allocation-plants">
                                            <span class="plants-count">${allocation.plants_planted || 0}</span>
                                            <span class="plants-label">plants</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="allocation-actions">
                                    <button onclick="app.editAllocation(${allocation.id}, ${bed.id}, '${allocation.crop_type}', ${allocation.percentage_allocated}, ${allocation.plants_planted || 0}).catch(console.error)" 
                                            class="edit-allocation-btn" title="Edit allocation">
                                        ${SVGIcons.getIcon('edit', 'btn-icon-svg')}
                                    </button>
                                    <button onclick="app.removeAllocation(${allocation.id})" class="remove-allocation-btn" title="Remove allocation">
                                        ${SVGIcons.getIcon('delete', 'btn-icon-svg')}
                                    </button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${bed.available_percentage > 0 ? `
                        <div class="add-allocation">
                            <div class="allocation-form">
                                <div class="form-row">
                                    <label class="allocation-label">Crop Type:</label>
                                    <select class="crop-select" id="crop-${bed.id}">
                                        ${cropOptionsHtml}
                                    </select>
                                </div>
                                
                                <div class="form-row">
                                    <label class="allocation-label">Allocation:</label>
                                    <div class="slider-container">
                                        <input type="range" class="percentage-slider" id="percentage-${bed.id}" 
                                               min="1" max="${bed.available_percentage}" value="25" 
                                               oninput="app.updateSliderValue(${bed.id}, this.value)" />
                                        <div class="slider-value">
                                            <span id="slider-value-${bed.id}">25</span>%
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <label class="allocation-label">Plant Count:</label>
                                    <input type="number" class="plants-input" id="plants-${bed.id}" 
                                           min="0" placeholder="Number of plants" />
                                </div>
                                
                                <button onclick="app.addAllocation(${bed.id})" class="add-allocation-btn">
                                    <span class="btn-icon">🌱</span>
                                    Add Crop Allocation
                                </button>
                            </div>
                        </div>
                    ` : '<div class="bed-full">✅ Bed fully allocated</div>'}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    async generateCropOptionsHtml() {
        let html = '<option value="">Select crop</option>';
        
        // Add standard crop options
        html += `
            <optgroup label="Leafy Greens">
                <option value="lettuce">Lettuce</option>
                <option value="spinach">Spinach</option>
                <option value="kale">Kale</option>
                <option value="swiss_chard">Swiss Chard</option>
                <option value="arugula">Arugula</option>
                <option value="pac_choi">Pac Choi</option>
            </optgroup>
            <optgroup label="Herbs">
                <option value="basil">Basil</option>
                <option value="mint">Mint</option>
                <option value="parsley">Parsley</option>
                <option value="cilantro">Cilantro</option>
                <option value="chives">Chives</option>
                <option value="oregano">Oregano</option>
                <option value="thyme">Thyme</option>
            </optgroup>
            <optgroup label="Fruiting Vegetables">
                <option value="tomatoes">Tomatoes</option>
                <option value="peppers">Peppers</option>
                <option value="cucumbers">Cucumbers</option>
                <option value="eggplant">Eggplant</option>
            </optgroup>
        `;
        
        // Add custom crops if any exist
        try {
            const customCrops = await this.makeApiCall('/plants/custom-crops');
            if (customCrops && customCrops.length > 0) {
                html += '<optgroup label="Custom Crops">';
                customCrops.forEach(crop => {
                    const cleanCropName = this.cleanCustomCropName(crop.crop_name);
                    const cropDisplayName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
                    const cropValue = crop.crop_name.toLowerCase().replace(/\s+/g, '_');
                    html += `<option value="${cropValue}">${cropDisplayName}</option>`;
                });
                html += '</optgroup>';
            }
        } catch (error) {
            console.error('Error loading custom crops for allocation:', error);
        }
        
        html += '<option value="other">Other</option>';
        
        return html;
    }

    async generateEditCropOptionsHtml(selectedCropType) {
        let html = '<option value="">Select crop</option>';
        
        // Add standard crop options with selection
        const standardCrops = {
            'Leafy Greens': ['lettuce', 'spinach', 'kale', 'swiss_chard', 'arugula', 'pac_choi'],
            'Herbs': ['basil', 'mint', 'parsley', 'cilantro', 'chives', 'oregano', 'thyme'],
            'Fruiting Vegetables': ['tomatoes', 'peppers', 'cucumbers', 'eggplant']
        };
        
        Object.entries(standardCrops).forEach(([category, crops]) => {
            html += `<optgroup label="${category}">`;
            crops.forEach(crop => {
                const cropName = crop.charAt(0).toUpperCase() + crop.slice(1).replace('_', ' ');
                const selected = crop === selectedCropType ? 'selected' : '';
                html += `<option value="${crop}" ${selected}>${cropName}</option>`;
            });
            html += '</optgroup>';
        });
        
        // Add custom crops if any exist
        try {
            const customCrops = await this.makeApiCall('/plants/custom-crops');
            if (customCrops && customCrops.length > 0) {
                html += '<optgroup label="Custom Crops">';
                customCrops.forEach(crop => {
                    const cleanCropName = this.cleanCustomCropName(crop.crop_name);
                    const cropDisplayName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);
                    const cropValue = crop.crop_name.toLowerCase().replace(/\s+/g, '_');
                    const selected = cropValue === selectedCropType ? 'selected' : '';
                    html += `<option value="${cropValue}" ${selected}>${cropDisplayName}</option>`;
                });
                html += '</optgroup>';
            }
        } catch (error) {
            console.error('Error loading custom crops for edit form:', error);
        }
        
        // Add "Other" option
        const otherSelected = selectedCropType === 'other' ? 'selected' : '';
        html += `<option value="other" ${otherSelected}>Other</option>`;
        
        return html;
    }

    getBedTypeDisplayName(bedType) {
        const bedTypeNames = {
            'dwc': 'Deep Water Culture',
            'flood-drain': 'Flood & Drain',
            'nft': 'NFT',
            'vertical': 'Vertical',
            'mft': 'Media Fill Technique'
        };
        return bedTypeNames[bedType] || bedType.toUpperCase();
    }

    cleanCustomCropName(cropName) {
        if (!cropName) return '';
        
        // Common patterns to remove from crop names
        const patternsToRemove = [
            /\s+(justin|admin|user|test)\s*$/i,  // Remove common suffixes like usernames
            /\s*_\s*(justin|admin|user|test)\s*$/i,  // Remove underscore patterns
            /\s*-\s*(justin|admin|user|test)\s*$/i,  // Remove hyphen patterns
        ];
        
        let cleanName = cropName;
        
        // Apply each pattern
        patternsToRemove.forEach(pattern => {
            cleanName = cleanName.replace(pattern, '');
        });
        
        // Clean up any extra spaces and normalize
        cleanName = cleanName.trim().replace(/\s+/g, ' ');
        
        // Convert underscores to spaces for better display
        cleanName = cleanName.replace(/_/g, ' ');
        
        return cleanName;
    }

    updateSliderValue(bedId, value) {
        const sliderValueElement = document.getElementById(`slider-value-${bedId}`);
        if (sliderValueElement) {
            sliderValueElement.textContent = value;
        }
    }

    async addAllocation(bedId) {
        console.log('🌱 addAllocation called with bedId:', bedId);
        
        const cropSelect = document.getElementById(`crop-${bedId}`);
        const percentageSlider = document.getElementById(`percentage-${bedId}`);
        const plantsInput = document.getElementById(`plants-${bedId}`);
        
        console.log('🔍 Elements found:', {
            cropSelect: !!cropSelect,
            percentageSlider: !!percentageSlider,
            plantsInput: !!plantsInput
        });
        
        if (!cropSelect || !percentageSlider || !plantsInput) {
            console.error('❌ Missing form elements');
            this.showNotification('❌ Form elements not found. Please refresh the page.', 'error');
            return;
        }
        
        const cropType = cropSelect.value;
        const percentage = parseFloat(percentageSlider.value);
        const plants = parseInt(plantsInput.value) || 0;
        
        console.log('📊 Form values:', { cropType, percentage, plants });
        
        if (!cropType) {
            this.showNotification('🌱 Please select a crop type', 'warning');
            return;
        }
        
        if (!percentage || percentage <= 0) {
            this.showNotification('📊 Please set allocation percentage using the slider', 'warning');
            return;
        }

        if (!this.activeSystemId) {
            console.error('❌ No active system ID');
            this.showNotification('❌ No active system selected', 'error');
            return;
        }
        
        console.log('🚀 Making API call with:', {
            systemId: this.activeSystemId,
            growBedId: bedId,
            cropType,
            percentageAllocated: percentage,
            plantsPlanted: plants
        });
        
        try {
            const response = await this.makeApiCall('/plants/allocations', {
                method: 'POST',
                body: JSON.stringify({
                    systemId: this.activeSystemId,
                    growBedId: bedId,
                    cropType,
                    percentageAllocated: percentage,
                    plantsPlanted: plants,
                    datePlanted: new Date().toISOString().split('T')[0]
                })
            });
            
            console.log('✅ API response:', response);
            this.showNotification(`🌱 ${cropType} allocation (${percentage}%) added successfully!`, 'success');
            
            // Reset form
            cropSelect.value = '';
            percentageSlider.value = 25;
            this.updateSliderValue(bedId, 25);
            plantsInput.value = '';
            
            this.loadPlantAllocations();
            // Update harvest crop dropdown with new allocation
            await this.populateHarvestCropDropdown();
        } catch (error) {
            console.error('❌ Error adding allocation:', error);
            this.showNotification('❌ Failed to add crop allocation: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async editAllocation(allocationId, bedId, cropType, currentPercentage, currentPlants) {
        // Find the allocation item
        const allocationItem = document.getElementById(`allocation-${allocationId}`);
        if (!allocationItem) return;

        // Generate crop options including custom crops with current selection
        const cropOptionsHtml = await this.generateEditCropOptionsHtml(cropType);
        
        // Clean the crop name for display
        const cleanCropName = this.cleanCustomCropName(cropType);
        const displayName = cleanCropName.charAt(0).toUpperCase() + cleanCropName.slice(1);

        // Create edit form HTML
        const editFormHtml = `
            <div class="edit-allocation-form">
                <div class="edit-form-header">
                    <h5>${SVGIcons.getIcon('edit', 'icon-svg')} Edit ${displayName} Allocation</h5>
                </div>
                
                <div class="edit-form-body">
                    <div class="edit-form-row">
                        <label class="edit-label">Crop Type:</label>
                        <select class="edit-crop-select" id="edit-crop-${allocationId}">
                            ${cropOptionsHtml}
                        </select>
                    </div>
                    
                    <div class="edit-form-row">
                        <label class="edit-label">Allocation:</label>
                        <div class="edit-slider-container">
                            <input type="range" class="edit-percentage-slider" id="edit-percentage-${allocationId}" 
                                   min="1" max="100" value="${currentPercentage}" 
                                   oninput="app.updateEditSliderValue(${allocationId}, this.value)" />
                            <div class="edit-slider-value">
                                <span id="edit-slider-value-${allocationId}">${currentPercentage}</span>%
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-form-row">
                        <label class="edit-label">Plant Count:</label>
                        <input type="number" class="edit-plants-input" id="edit-plants-${allocationId}" 
                               min="0" value="${currentPlants}" placeholder="Number of plants" />
                    </div>
                </div>
                
                <div class="edit-form-actions">
                    <button onclick="app.saveAllocationEdit(${allocationId}, ${bedId})" class="save-edit-btn">
                        <span class="btn-icon">💾</span>
                        Save Changes
                    </button>
                    <button onclick="app.cancelAllocationEdit(${allocationId})" class="cancel-edit-btn">
                        <span class="btn-icon">❌</span>
                        Cancel
                    </button>
                </div>
            </div>
        `;

        // Store original content and replace with edit form
        allocationItem.dataset.originalContent = allocationItem.innerHTML;
        allocationItem.innerHTML = editFormHtml;
        allocationItem.classList.add('editing');
    }

    updateEditSliderValue(allocationId, value) {
        const sliderValueElement = document.getElementById(`edit-slider-value-${allocationId}`);
        if (sliderValueElement) {
            sliderValueElement.textContent = value;
        }
    }

    async saveAllocationEdit(allocationId, bedId) {
        const cropSelect = document.getElementById(`edit-crop-${allocationId}`);
        const percentageSlider = document.getElementById(`edit-percentage-${allocationId}`);
        const plantsInput = document.getElementById(`edit-plants-${allocationId}`);

        const cropType = cropSelect.value;
        const percentage = parseFloat(percentageSlider.value);
        const plants = parseInt(plantsInput.value) || 0;

        if (!cropType) {
            this.showNotification('🌱 Please select a crop type', 'warning');
            return;
        }

        try {
            await this.makeApiCall(`/plants/allocations/${allocationId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    cropType,
                    percentageAllocated: percentage,
                    plantsPlanted: plants
                })
            });

            this.showNotification(`✅ ${cropType} allocation updated successfully!`, 'success');
            this.loadPlantAllocations();
            // Update harvest crop dropdown with updated allocation
            await this.populateHarvestCropDropdown();
        } catch (error) {
            console.error('Error updating allocation:', error);
            this.showNotification('❌ Failed to update crop allocation', 'error');
        }
    }

    cancelAllocationEdit(allocationId) {
        const allocationItem = document.getElementById(`allocation-${allocationId}`);
        if (allocationItem && allocationItem.dataset.originalContent) {
            allocationItem.innerHTML = allocationItem.dataset.originalContent;
            allocationItem.classList.remove('editing');
            delete allocationItem.dataset.originalContent;
        }
    }

    async removeAllocation(allocationId) {
        if (!confirm('Are you sure you want to remove this crop allocation?')) {
            return;
        }

        try {
            await this.makeApiCall(`/plants/allocations/${allocationId}`, {
                method: 'DELETE'
            });
            
            this.showNotification('Crop allocation removed successfully', 'success');
            this.loadPlantAllocations();
            // Update harvest crop dropdown after removing allocation
            await this.populateHarvestCropDropdown();
        } catch (error) {
            console.error('Error removing allocation:', error);
            this.showNotification('❌ Failed to remove crop allocation', 'error');
        }
    }

    confirmDeleteSystem() {
        const systemName = this.getCurrentSystemName();
        
        // Set the system name in the modal
        document.getElementById('system-name-to-delete').textContent = systemName;
        
        // Clear any previous input
        const confirmInput = document.getElementById('delete-confirmation');
        confirmInput.value = '';
        confirmInput.classList.remove('valid');
        
        // Reset delete button state
        const deleteBtn = document.getElementById('delete-confirm-btn');
        deleteBtn.disabled = true;
        
        // Show modal
        const modal = document.getElementById('delete-system-modal');
        modal.style.display = 'flex';
        
        // Focus on input
        setTimeout(() => confirmInput.focus(), 100);
        
        // Add input listener to enable/disable delete button
        const inputHandler = (e) => {
            const isValid = e.target.value === 'DELETE';
            deleteBtn.disabled = !isValid;
            
            if (isValid) {
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
            }
        };
        
        // Remove any existing listeners and add new one
        confirmInput.removeEventListener('input', inputHandler);
        confirmInput.addEventListener('input', inputHandler);
        
        // Add Enter key handler
        const enterHandler = (e) => {
            if (e.key === 'Enter' && e.target.value === 'DELETE') {
                this.executeDeleteSystem();
            }
        };
        
        confirmInput.removeEventListener('keydown', enterHandler);
        confirmInput.addEventListener('keydown', enterHandler);
    }

    cancelDeleteSystem() {
        const modal = document.getElementById('delete-system-modal');
        modal.style.display = 'none';
        
        // Clear input
        const confirmInput = document.getElementById('delete-confirmation');
        confirmInput.value = '';
        confirmInput.classList.remove('valid');
    }

    executeDeleteSystem() {
        const confirmInput = document.getElementById('delete-confirmation');
        
        if (confirmInput.value !== 'DELETE') {
            this.showNotification('❌ Please type "DELETE" to confirm', 'warning');
            return;
        }
        
        // Hide modal
        this.cancelDeleteSystem();
        
        // Execute deletion
        this.deleteSystem();
    }

    getCurrentSystemName() {
        // Get current system name from the display or default
        const systemDisplay = document.getElementById('current-system-settings');
        if (systemDisplay && systemDisplay.textContent) {
            const match = systemDisplay.textContent.match(/System: (.+)/);
            return match ? match[1] : 'Current System';
        }
        return 'Current System';
    }

    async deleteSystem() {
        if (!this.activeSystemId) {
            this.showNotification('❌ No active system to delete', 'error');
            return;
        }

        try {
            this.showNotification('Deleting system...', 'info');
            
            await this.makeApiCall(`/systems/${this.activeSystemId}`, {
                method: 'DELETE'
            });

            this.showNotification('✅ System deleted successfully', 'success');
            
            // Clear local system data
            this.activeSystemId = null;
            this.systems = [];
            
            // Reload user data to get updated system list
            await this.loadUserData();
            
            // If no systems left, show system creation
            if (Object.keys(this.systems).length === 0) {
                this.showAddSystemDialog();
            }
            
        } catch (error) {
            console.error('Error deleting system:', error);
            this.showNotification('❌ Failed to delete system: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async loadCustomCrops() {
        try {
            const crops = await this.makeApiCall('/plants/custom-crops');
            this.displayCustomCrops(crops);
            this.updateCropDropdowns(crops);
        } catch (error) {
            console.error('Error loading custom crops:', error);
            this.showMessage('Failed to load custom crops', 'error');
        }
    }

    displayCustomCrops(crops) {
        const container = document.getElementById('custom-crops-container');
        if (!container) return;

        if (crops.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: #666; margin-bottom: 1rem;">No custom crops added yet.</p>
                    <button onclick="app.showAddCustomCropModal()" class="btn-primary">
                        <span>🌿</span> Add Your First Custom Crop
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="custom-crops-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #2c3e50;">Your Custom Crops</h3>
                <button onclick="app.showAddCustomCropModal()" class="btn-primary">
                    <span>+</span> Add Custom Crop
                </button>
            </div>
            <div class="custom-crops-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
        `;
        
        crops.forEach(crop => {
            const cleanCropName = this.cleanCustomCropName(crop.crop_name);
            html += `
                <div class="custom-crop-card" style="background: white; border: 2px solid #e9ecef; border-radius: 12px; padding: 1.5rem; position: relative; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div class="crop-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #2c3e50; font-size: 1.2rem; flex: 1;">🌱 ${cleanCropName}</h4>
                        <div class="crop-actions" style="display: flex; gap: 0.5rem;">
                            <button onclick="app.editCustomCrop(${crop.id})" class="icon-btn edit-btn" style="background: #3498db; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                ${SVGIcons.getIcon('edit', 'btn-icon-svg')}
                            </button>
                            <button onclick="app.deleteCustomCrop(${crop.id})" class="icon-btn delete-btn" style="background: #e74c3c; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                ${SVGIcons.getIcon('delete', 'btn-icon-svg')}
                            </button>
                        </div>
                    </div>
                    
                    <div class="crop-nutrients" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        <div class="nutrient-group" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 0.75rem; border-radius: 8px;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #495057; font-size: 0.85rem; font-weight: 600;">Primary Nutrients</h5>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">N:</span>
                                <strong style="color: #28a745;">${crop.target_n || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">P:</span>
                                <strong style="color: #28a745;">${crop.target_p || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                <span style="color: #6c757d;">K:</span>
                                <strong style="color: #28a745;">${crop.target_k || 0} ppm</strong>
                            </div>
                        </div>
                        
                        <div class="nutrient-group" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 0.75rem; border-radius: 8px;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #495057; font-size: 0.85rem; font-weight: 600;">Secondary & Micro</h5>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Ca:</span>
                                <strong style="color: #17a2b8;">${crop.target_ca || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Mg:</span>
                                <strong style="color: #17a2b8;">${crop.target_mg || 0} ppm</strong>
                            </div>
                            <div class="nutrient-item" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                <span style="color: #6c757d;">Fe:</span>
                                <strong style="color: #17a2b8;">${crop.target_fe || 0} ppm</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ec-display" style="margin-top: 0.75rem; padding: 0.5rem; background: #fff3cd; border-radius: 6px; text-align: center;">
                        <span style="color: #856404;">Target EC:</span>
                        <strong style="color: #856404; margin-left: 0.5rem;">${crop.target_ec || 0} mS/cm</strong>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    updateCropDropdowns(customCrops) {
        const dropdowns = document.querySelectorAll('.crop-select, #crop-type');
        
        dropdowns.forEach(dropdown => {
            // Add custom crops to existing options
            customCrops.forEach(crop => {
                const option = document.createElement('option');
                option.value = crop.crop_name.toLowerCase().replace(/\s+/g, '_');
                option.textContent = this.cleanCustomCropName(crop.crop_name);
                dropdown.appendChild(option);
            });
        });
    }

    async addCustomCrop() {
        const cropName = document.getElementById('custom-crop-name').value;
        const targetN = parseFloat(document.getElementById('custom-target-n').value) || 0;
        const targetP = parseFloat(document.getElementById('custom-target-p').value) || 0;
        const targetK = parseFloat(document.getElementById('custom-target-k').value) || 0;
        const targetCa = parseFloat(document.getElementById('custom-target-ca').value) || 0;
        const targetMg = parseFloat(document.getElementById('custom-target-mg').value) || 0;
        const targetFe = parseFloat(document.getElementById('custom-target-fe').value) || 0;
        const targetEc = parseFloat(document.getElementById('custom-target-ec').value) || 0;

        if (!cropName.trim()) {
            this.showMessage('Please enter a crop name', 'error');
            return;
        }

        try {
            await this.makeApiCall('/plants/custom-crops', {
                method: 'POST',
                body: JSON.stringify({
                    cropName: cropName.trim(),
                    targetN,
                    targetP,
                    targetK,
                    targetCa,
                    targetMg,
                    targetFe,
                    targetEc
                })
            });

            this.showNotification('✅ Custom crop added successfully!', 'success');
            
            // Clear form
            document.getElementById('custom-crop-name').value = '';
            document.getElementById('custom-target-n').value = '';
            document.getElementById('custom-target-p').value = '';
            document.getElementById('custom-target-k').value = '';
            document.getElementById('custom-target-ca').value = '';
            document.getElementById('custom-target-mg').value = '';
            document.getElementById('custom-target-fe').value = '';
            document.getElementById('custom-target-ec').value = '';
            
            this.loadCustomCrops();
            
            // Refresh allocation dropdowns if on that tab
            const allocationContainer = document.getElementById('grow-bed-allocation-container');
            if (allocationContainer && allocationContainer.style.display !== 'none') {
                this.loadPlantAllocations();
            }
        } catch (error) {
            console.error('Error adding custom crop:', error);
            this.showMessage('Failed to add custom crop', 'error');
        }
    }

    async showAddCustomCropModal() {
        this.showCustomCropModal();
    }
    
    async editCustomCrop(cropId) {
        try {
            // Fetch the crop details
            const crops = await this.makeApiCall('/plants/custom-crops');
            const crop = crops.find(c => c.id === cropId);
            
            if (!crop) {
                this.showNotification('Custom crop not found', 'error');
                return;
            }
            
            // Show modal with existing data
            this.showCustomCropModal(crop);
        } catch (error) {
            console.error('Error loading custom crop:', error);
            this.showNotification('Failed to load custom crop details', 'error');
        }
    }
    
    showCustomCropModal(existingCrop = null) {
        const isEdit = !!existingCrop;
        const modalTitle = isEdit ? 'Edit Custom Crop' : 'Add Custom Crop';
        const buttonText = isEdit ? 'Update Crop' : 'Add Crop';
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.justifyContent = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '500px';
        modalContent.style.padding = '2rem';
        modalContent.style.maxHeight = '90vh';
        modalContent.style.overflowY = 'auto';
        
        modalContent.innerHTML = `
            <h3 style="color: #2e3192; margin-bottom: 1.5rem;">${modalTitle}</h3>
            
            <div class="form-field" style="margin-bottom: 1rem;">
                <label class="modern-label">
                    <span class="label-icon">🌿</span>
                    <span class="label-text">Crop Name</span>
                </label>
                <input type="text" id="custom-crop-name-input" class="modern-input" 
                       placeholder="e.g., Cherry Tomatoes" value="${existingCrop ? this.cleanCustomCropName(existingCrop.crop_name) : ''}" autofocus>
            </div>
            
            <h4 style="color: #495057; margin: 1.5rem 0 1rem 0; font-size: 1rem;">Target Nutrient Levels</h4>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Nitrogen (N) ppm</span>
                    </label>
                    <input type="number" id="target-n" class="modern-input" 
                           placeholder="150" value="${existingCrop?.target_n || ''}" min="0" step="1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Phosphorus (P) ppm</span>
                    </label>
                    <input type="number" id="target-p" class="modern-input" 
                           placeholder="50" value="${existingCrop?.target_p || ''}" min="0" step="1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Potassium (K) ppm</span>
                    </label>
                    <input type="number" id="target-k" class="modern-input" 
                           placeholder="200" value="${existingCrop?.target_k || ''}" min="0" step="1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Calcium (Ca) ppm</span>
                    </label>
                    <input type="number" id="target-ca" class="modern-input" 
                           placeholder="150" value="${existingCrop?.target_ca || ''}" min="0" step="1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Magnesium (Mg) ppm</span>
                    </label>
                    <input type="number" id="target-mg" class="modern-input" 
                           placeholder="50" value="${existingCrop?.target_mg || ''}" min="0" step="1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Iron (Fe) ppm</span>
                    </label>
                    <input type="number" id="target-fe" class="modern-input" 
                           placeholder="2" value="${existingCrop?.target_fe || ''}" min="0" step="0.1">
                </div>
                
                <div class="form-field">
                    <label class="modern-label">
                        <span class="label-text">Target EC (mS/cm)</span>
                    </label>
                    <input type="number" id="target-ec" class="modern-input" 
                           placeholder="2.0" value="${existingCrop?.target_ec || ''}" min="0" step="0.1">
                </div>
            </div>
            
            <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem; justify-content: flex-end;">
                <button type="button" class="btn-secondary" id="cancel-custom-crop">Cancel</button>
                <button type="button" class="btn-primary" id="save-custom-crop">${buttonText}</button>
            </div>
        `;
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Focus the input
        setTimeout(() => {
            document.getElementById('custom-crop-name-input')?.focus();
        }, 100);
        
        // Handle save
        const saveHandler = async () => {
            const cropName = document.getElementById('custom-crop-name-input')?.value.trim();
            if (!cropName) {
                this.showNotification('Please enter a crop name', 'warning');
                return;
            }
            
            const cropData = {
                cropName: cropName,
                targetN: parseFloat(document.getElementById('target-n')?.value) || 0,
                targetP: parseFloat(document.getElementById('target-p')?.value) || 0,
                targetK: parseFloat(document.getElementById('target-k')?.value) || 0,
                targetCa: parseFloat(document.getElementById('target-ca')?.value) || 0,
                targetMg: parseFloat(document.getElementById('target-mg')?.value) || 0,
                targetFe: parseFloat(document.getElementById('target-fe')?.value) || 0,
                targetEc: parseFloat(document.getElementById('target-ec')?.value) || 0,
                systemId: this.activeSystemId
            };
            
            try {
                if (isEdit) {
                    await this.makeApiCall(`/plants/custom-crops/${existingCrop.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(cropData)
                    });
                    this.showNotification(`Custom crop "${cropName}" updated successfully!`, 'success');
                } else {
                    await this.makeApiCall('/plants/custom-crops', {
                        method: 'POST',
                        body: JSON.stringify(cropData)
                    });
                    this.showNotification(`Custom crop "${cropName}" added successfully!`, 'success');
                }
                
                modalOverlay.remove();
                
                // Refresh the custom crops display
                await this.loadCustomCrops();
                
                // Update dropdowns in allocations if we're on that tab
                const allocationsTab = document.querySelector('[data-content="allocate-crops"]');
                if (allocationsTab && allocationsTab.classList.contains('active')) {
                    await this.loadPlantAllocations();
                }
            } catch (error) {
                console.error('Error saving custom crop:', error);
                this.showNotification('Failed to save custom crop. Please try again.', 'error');
            }
        };
        
        // Event listeners
        document.getElementById('save-custom-crop').addEventListener('click', saveHandler);
        document.getElementById('cancel-custom-crop').addEventListener('click', () => modalOverlay.remove());
        
        // Allow Enter key to save from any input
        const inputs = modalContent.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') saveHandler();
            });
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });
    }

    async deleteCustomCrop(cropId) {
        if (!confirm('Are you sure you want to delete this custom crop?')) {
            return;
        }

        try {
            await this.makeApiCall(`/plants/custom-crops/${cropId}`, {
                method: 'DELETE'
            });

            this.showNotification('Custom crop deleted successfully!', 'success');
            this.loadCustomCrops();
            
            // Refresh allocation dropdowns if on that tab
            const allocationContainer = document.getElementById('grow-bed-allocation-container');
            if (allocationContainer && allocationContainer.style.display !== 'none') {
                this.loadPlantAllocations();
            }
        } catch (error) {
            console.error('Error deleting custom crop:', error);
            this.showMessage('Failed to delete custom crop', 'error');
        }
    }

    // Date formatting utility
    formatDateDDMMYYYY(date) {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Ensure system has default spray programmes
    async ensureDefaultSprayProgrammes() {
        if (!this.activeSystemId) return;
        
        try {
            // Check if system has any programmes
            console.log('Checking for existing programmes for system:', this.activeSystemId);
            const response = await this.makeApiCall(`/spray-programmes?system_id=${this.activeSystemId}`);
            console.log('Spray programmes response:', response);
            const programmes = response.programmes || [];
            console.log('Found programmes:', programmes.length);
            
            // If no programmes exist, create defaults
            if (programmes.length === 0) {
                console.log('No spray programmes found, creating defaults...');
                const defaultsResponse = await this.makeApiCall('/spray-programmes/create-defaults', {
                    method: 'POST',
                    body: JSON.stringify({
                        system_id: this.activeSystemId
                    })
                });
                console.log('Default spray programmes created:', defaultsResponse);
                
                if (defaultsResponse.created > 0) {
                    this.showNotification(`${defaultsResponse.created} default spray programmes added to your system!`, 'success');
                }
            } else {
                console.log('Existing programmes found, not creating defaults');
                console.log('Programme details:', programmes.map(p => ({id: p.id, name: p.product_name, category: p.category})));
                
                // Check if we have proper default programmes (not just mock data)
                const hasRealDefaults = programmes.some(p => p.product_name && p.product_name.includes('Bioneem'));
                if (!hasRealDefaults) {
                    console.log('Found programmes but they appear to be mock data, forcing recreation of defaults...');
                    try {
                        // Delete existing and recreate defaults
                        const defaultsResponse = await this.makeApiCall('/spray-programmes/create-defaults', {
                            method: 'POST',
                            body: JSON.stringify({
                                system_id: this.activeSystemId,
                                force: true // Add a force flag to recreate
                            })
                        });
                        console.log('Forced default spray programmes creation:', defaultsResponse);
                    } catch (error) {
                        console.log('Failed to force recreate defaults:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error ensuring default spray programmes:', error);
            // Don't show error to user - this is a background operation
        }
    }

    // Spray Programmes functionality
    async setupSprayProgrammes() {
        console.log('Setting up spray programmes...');
        
        // Check if system has any spray programmes, if not create defaults
        await this.ensureDefaultSprayProgrammes();
        this.setupSprayTabs();
        this.loadSprayApplications();
        
        // Ensure calendar is updated after setup
        setTimeout(() => {
            console.log('Force updating spray calendar...');
            this.updateSprayCalendar();
        }, 1000);
    }

    setupSprayTabs() {
        const sprayTabs = document.querySelectorAll('.spray-tab');
        const sprayContents = document.querySelectorAll('.spray-content');

        sprayTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.id.replace('-tab', '');
                
                sprayTabs.forEach(t => t.classList.remove('active'));
                sprayContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = document.getElementById(category + '-content');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                this.loadSprayApplications(category);
            });
        });
    }

    async loadSprayApplications(category = 'insecticides') {
        if (!this.activeSystemId) return;
        
        try {
            // Try to load from API first
            console.log('Loading spray applications for category:', category, 'system:', this.activeSystemId);
            // Add cache-busting parameter to ensure fresh data
            const cacheBuster = Date.now();
            const response = await this.makeApiCall(`/spray-programmes?system_id=${this.activeSystemId}&_cb=${cacheBuster}`);
            console.log('API response for spray applications:', response);
            const allApplications = response.programmes || [];
            console.log('All applications before filtering:', allApplications);
            
            // Filter applications by category based on programme type or products
            const applications = this.filterApplicationsByCategory(allApplications, category);
            console.log('Filtered applications for category', category, ':', applications);
            this.displaySprayApplications(applications, category);
            this.updateSprayCalendar();
        } catch (error) {
            console.log('API endpoint not ready, using mock data for spray programmes');
            // Use mock data until backend endpoints are implemented
            const mockApplications = this.getMockSprayApplications(category);
            this.displaySprayApplications(mockApplications, category);
            this.updateSprayCalendarMock();
        }
    }

    displaySprayApplications(applications, category) {
        const container = document.getElementById(category + '-list');
        if (!container) return;

        if (applications.length === 0) {
            container.innerHTML = `<p style="color: #666; text-align: center;">No ${category} applications recorded yet.</p>`;
            return;
        }

        // Separate active and inactive applications
        const activeApplications = applications.filter(app => {
            // Active = has status 'active' (or no status) AND has schedule data
            const hasActiveStatus = !app.status || app.status === 'active';
            const hasScheduleData = app.frequency_days || app.frequency || app.start_date || app.end_date;
            return hasActiveStatus && hasScheduleData;
        });

        const inactiveApplications = applications.filter(app => {
            // Inactive = has status 'inactive' OR doesn't have schedule data
            return app.status === 'inactive' || (!app.frequency_days && !app.frequency && !app.start_date && !app.end_date);
        });

        // Debug: Log all applications with their status and data
        console.log(`🔍 All applications for ${category}:`, applications.map(app => ({
            id: app.id,
            product_name: app.product_name,
            status: app.status,
            rawStatus: typeof app.status,
            frequency_days: app.frequency_days,
            frequency: app.frequency,
            start_date: app.start_date,
            end_date: app.end_date,
            hasScheduleData: !!(app.frequency_days || app.frequency || app.start_date || app.end_date),
            allFields: Object.keys(app)
        })));

        // Enhanced debugging for inactive applications
        const inactiveApps = applications.filter(app => app.status === 'inactive');
        if (inactiveApps.length > 0) {
            console.log(`🚨 FOUND INACTIVE APPLICATIONS:`, inactiveApps.map(app => ({
                id: app.id,
                name: app.product_name,
                status: app.status,
                category: app.category
            })));
        } else {
            console.log(`ℹ️ No inactive applications found for ${category}. All statuses:`, applications.map(app => `${app.product_name}: ${app.status}`));
        }

        // Specific debugging for Metarhizium 62
        const metarhizium = applications.find(app => app.product_name.includes('Metarhizium'));
        if (metarhizium) {
            console.log(`🔬 METARHIZIUM 62 DEBUG:`, {
                id: metarhizium.id,
                status: metarhizium.status,
                frequency: metarhizium.frequency,
                frequency_days: metarhizium.frequency_days,
                start_date: metarhizium.start_date,
                end_date: metarhizium.end_date,
                hasActiveStatus: !metarhizium.status || metarhizium.status === 'active',
                hasScheduleData: !!(metarhizium.frequency_days || metarhizium.frequency || metarhizium.start_date || metarhizium.end_date),
                shouldBeActive: (!metarhizium.status || metarhizium.status === 'active') && !!(metarhizium.frequency_days || metarhizium.frequency || metarhizium.start_date || metarhizium.end_date),
                shouldBeInactive: metarhizium.status === 'inactive' || (!metarhizium.frequency_days && !metarhizium.frequency && !metarhizium.start_date && !metarhizium.end_date)
            });
        }

        console.log(`📊 Section breakdown for ${category}:`, {
            total: applications.length,
            active: activeApplications.length,
            inactive: inactiveApplications.length,
            activeItems: activeApplications.map(a => `${a.product_name} (${a.status})`),
            inactiveItems: inactiveApplications.map(a => `${a.product_name} (${a.status})`)
        });

        let html = '';

        // Active Products Section
        if (activeApplications.length > 0) {
            html += `
                <div class="spray-section">
                    <h4 class="spray-section-title active-section">🟢 Active Spray Programmes</h4>
                    <div class="spray-applications-grid">
            `;
            activeApplications.forEach(app => {
                html += this.generateSprayApplicationCard(app);
            });
            html += `
                    </div>
                </div>
            `;
        }

        // Inactive Products Section
        if (inactiveApplications.length > 0) {
            html += `
                <div class="spray-section">
                    <h4 class="spray-section-title inactive-section">⚪ Available Products (Not in Programme)</h4>
                    <div class="spray-applications-grid">
            `;
            inactiveApplications.forEach(app => {
                html += this.generateSprayApplicationCard(app);
            });
            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    generateSprayApplicationCard(app) {
        const isActive = !app.status || app.status === 'active';
        const nextApplication = isActive ? this.calculateNextApplication(app) : null;
        
        return `
            <div class="spray-application-card">
                <div class="spray-header">
                    <h5>${app.product_name}</h5>
                    <div class="spray-actions">
                        <button onclick="app.recordSprayApplication(${app.id})" class="record-btn" title="Record Application">${SVGIcons.getIcon('add', 'btn-icon-svg')}</button>
                        <button onclick="app.editSprayProgramme(${app.id})" class="edit-btn" title="Edit Programme">${SVGIcons.getIcon('edit', 'btn-icon-svg')}</button>
                        <button onclick="app.deleteSprayApplication(${app.id})" class="delete-btn" title="Delete">${SVGIcons.getIcon('delete', 'btn-icon-svg')}</button>
                    </div>
                </div>
                <div class="spray-details">
                    ${app.active_ingredient ? `
                        <div class="detail-item">
                            <strong>Active Ingredient:</strong> ${app.active_ingredient}
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <strong>Target:</strong> ${app.target_pest || app.target_disease || app.nutrient_type || 'General'}
                    </div>
                    <div class="detail-item">
                        <strong>Rate:</strong> ${app.application_rate} ${app.rate_unit}
                    </div>
                    <div class="detail-item">
                        <strong>Last Applied:</strong> ${app.last_application ? this.formatDateDDMMYYYY(new Date(app.last_application)) : 'Never'}
                    </div>
                    <div class="detail-item">
                        <strong>Frequency:</strong> Every ${app.frequency_days} days
                    </div>
                    ${isActive && nextApplication ? `
                        <div class="detail-item next-application">
                            <strong>Next Due:</strong> ${this.formatDateDDMMYYYY(nextApplication)}
                            ${nextApplication < new Date() ? '<span class="overdue">⚠️ Overdue</span>' : ''}
                        </div>
                    ` : ''}
                    ${!isActive ? `
                        <div class="detail-item inactive-status">
                            <strong>Status:</strong> <span style="color: #ff6b6b;">Not in Programme</span>
                        </div>
                    ` : ''}
                </div>
                <div class="spray-notes">
                    ${app.notes || ''}
                </div>
                <div class="spray-programme-controls">
                    ${this.generateProgrammeControlButton(app)}
                </div>
                <div class="spray-history">
                    <button onclick="app.toggleApplicationHistory(${app.id})" class="history-toggle-btn">
                        📋 View Application History
                    </button>
                    <div id="history-${app.id}" class="application-history" style="display: none;">
                        <!-- History will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    generateProgrammeControlButton(app) {
        // Determine if this item is in an active programme
        // Check if it has programme data (frequency, dates, etc.) AND is active
        const hasScheduleData = app.frequency_days || app.frequency || app.start_date || app.end_date;
        const isActive = !app.status || app.status === 'active'; // Default to active if no status
        const isInProgramme = hasScheduleData && isActive && app.status !== 'inactive';
        
        console.log(`🔍 Programme check for ${app.product_name}:`, {
            hasScheduleData,
            isActive,
            isInProgramme,
            frequency_days: app.frequency_days,
            frequency: app.frequency,
            status: app.status
        });
        
        if (isInProgramme) {
            // Item is in an active programme - show edit/remove options
            return `
                <div class="programme-control-group">
                    <button onclick="app.editSprayProgramme(${app.id})" class="programme-edit-btn" title="Edit Programme">
                        🔧 Edit Programme
                    </button>
                    <button onclick="app.removeFromProgramme(${app.id})" class="programme-remove-btn" title="Remove from Programme">
                        ❌ Remove from Programme
                    </button>
                </div>
            `;
        } else {
            // Item is not in a programme - show add option
            return `
                <button onclick="app.addToProgramme(${app.id})" class="programme-add-btn" title="Add to Spray Programme">
                    ➕ Add to Programme
                </button>
            `;
        }
    }

    parseFrequencyDays(frequency) {
        // Extract number of days from frequency string like "Every 7 days"
        if (typeof frequency === 'number') return frequency;
        if (!frequency || typeof frequency !== 'string') return 7; // default to weekly
        
        const match = frequency.match(/(\d+)/);
        return match ? parseInt(match[1]) : 7;
    }

    calculateNextApplication(application) {
        console.log('calculateNextApplication called for:', application.product_name);
        console.log('Application data:', {
            last_application: application.last_application,
            start_date: application.start_date,
            frequency: application.frequency,
            frequency_days: application.frequency_days
        });
        
        let baseDate;
        
        if (application.last_application) {
            // If there's a last application, calculate next from that date
            baseDate = new Date(application.last_application);
            console.log('Using last application date:', baseDate);
        } else {
            // For new programmes without applications, use start date or today
            if (application.start_date) {
                baseDate = new Date(application.start_date);
                console.log('Using start date:', baseDate);
            } else {
                // For programmes without start date, start from today
                baseDate = new Date();
                console.log('Using today as base date:', baseDate);
            }
        }
        
        const nextDate = new Date(baseDate);
        
        // Get frequency in days from either frequency_days or frequency string
        const frequencyDays = application.frequency_days || this.parseFrequencyDays(application.frequency);
        console.log('Frequency days:', frequencyDays);
        
        // If we're using last application date, add frequency to get next date
        if (application.last_application) {
            nextDate.setDate(baseDate.getDate() + frequencyDays);
        } else {
            // For new programmes, if start date is in the future, use start date
            // Otherwise, schedule for frequency days from now
            if (application.start_date && new Date(application.start_date) > new Date()) {
                console.log('Start date is in future, using start date');
                return new Date(application.start_date);
            } else {
                nextDate.setDate(baseDate.getDate() + frequencyDays);
                console.log('Adding frequency to base date');
            }
        }
        
        console.log('Calculated next date:', nextDate);
        return nextDate;
    }

    async updateSprayCalendar() {
        if (!this.activeSystemId) return;
        
        try {
            // Try to get real spray programmes data
            const cacheBuster = Date.now();
            const response = await this.makeApiCall(`/spray-programmes?system_id=${this.activeSystemId}&_cb=${cacheBuster}`);
            if (response && response.programmes && response.programmes.length > 0) {
                console.log('Using real spray programmes for calendar:', response.programmes);
                this.displaySprayCalendar(response.programmes);
                return;
            }
        } catch (error) {
            console.log('Real spray programmes API not ready or empty, trying calendar endpoint');
        }
        
        try {
            // Fall back to calendar endpoint
            const allApplications = await this.makeApiCall(`/spray-programmes/calendar?system_id=${this.activeSystemId}`);
            this.displaySprayCalendar(allApplications.schedules || allApplications);
        } catch (error) {
            console.log('Calendar API endpoint not ready, using mock calendar data');
            this.updateSprayCalendarMock();
        }
    }

    displaySprayCalendar(applications) {
        const container = document.getElementById('spray-calendar-container');
        if (!container) {
            console.error('spray-calendar-container not found');
            return;
        }

        console.log('displaySprayCalendar called with applications:', applications);

        if (!applications || !Array.isArray(applications)) {
            console.error('Invalid applications data:', applications);
            container.innerHTML = '<p style="color: #666; text-align: center;">Error loading applications.</p>';
            return;
        }

        const upcoming = applications
            .filter(app => {
                // Only include active programmes in upcoming applications
                const isActive = !app.status || app.status === 'active';
                console.log(`App ${app.product_name}: status = ${app.status}, isActive = ${isActive}`);
                return isActive;
            })
            .map(app => {
                const nextDate = this.calculateNextApplication(app);
                console.log(`App ${app.product_name}: nextDate = ${nextDate}`);
                return {
                    ...app,
                    nextDate: nextDate
                };
            })
            .filter(app => {
                const hasDate = app.nextDate !== null && app.nextDate !== undefined;
                console.log(`App ${app.product_name}: hasDate = ${hasDate}`);
                return hasDate;
            })
            .sort((a, b) => a.nextDate - b.nextDate)
            .slice(0, 5);

        console.log('Upcoming applications after processing:', upcoming);

        if (upcoming.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">No upcoming spray applications scheduled.</p>';
            return;
        }

        let html = '<div class="upcoming-sprays">';
        upcoming.forEach(app => {
            const daysUntil = Math.ceil((app.nextDate - new Date()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntil < 0;
            const urgency = isOverdue ? 'overdue' : daysUntil <= 3 ? 'urgent' : 'normal';
            
            html += `
                <div class="upcoming-spray ${urgency}">
                    <div class="spray-date">
                        ${this.formatDateDDMMYYYY(app.nextDate)}
                        ${isOverdue ? '<span class="overdue-badge">Overdue</span>' : 
                          daysUntil === 0 ? '<span class="today-badge">Today</span>' :
                          daysUntil === 1 ? '<span class="tomorrow-badge">Tomorrow</span>' :
                          `<span class="days-badge">${daysUntil} days</span>`}
                    </div>
                    <div class="spray-info">
                        <div class="spray-details">
                            <strong>${app.product_name}</strong>
                            <span class="spray-category">${app.category}</span>
                        </div>
                        <div class="spray-actions">
                            <button onclick="app.recordSprayApplication(${app.id})" class="quick-record-btn" title="Record Application">
                                ${SVGIcons.getIcon('add', 'btn-icon-svg')}
                            </button>
                            <button onclick="app.editSprayProgramme(${app.id})" class="quick-edit-btn" title="Edit Programme">
                                ${SVGIcons.getIcon('edit', 'btn-icon-svg')}
                            </button>
                            <button onclick="app.removeFromProgramme(${app.id})" class="quick-remove-btn" title="Remove from Programme">
                                ${SVGIcons.getIcon('delete', 'btn-icon-svg')}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    showAddSprayModal(category) {
        const modal = document.getElementById('add-spray-modal');
        const categorySelect = document.getElementById('add-spray-category');
        const title = document.getElementById('add-spray-title');
        
        // Set category and update title
        categorySelect.value = category;
        title.textContent = `🌿 Add New ${category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')} Programme`;
        
        // Clear form
        this.clearAddSprayForm();
        
        // Update form based on category
        this.updateAddSprayForm();
        
        // Show modal
        modal.style.display = 'flex';
    }

    closeAddSprayModal() {
        const modal = document.getElementById('add-spray-modal');
        modal.style.display = 'none';
        
        // Clear editing state
        delete modal.dataset.editingId;
        
        this.clearAddSprayForm();
    }

    clearAddSprayForm() {
        const form = document.getElementById('add-spray-form');
        const modal = document.getElementById('add-spray-modal');
        
        // Reset form values
        form.reset();
        
        // Ensure all fields are enabled and editable
        const formFields = form.querySelectorAll('input, select, textarea');
        formFields.forEach(field => {
            field.removeAttribute('readonly');
            field.removeAttribute('disabled');
            field.style.backgroundColor = '';
            field.style.cursor = '';
        });
        
        // Hide target field
        const targetField = document.getElementById('target-field');
        targetField.style.display = 'none';
        
        // Remove category class
        modal.className = 'modal-overlay';
    }

    updateAddSprayForm() {
        const category = document.getElementById('add-spray-category').value;
        const targetField = document.getElementById('target-field');
        const targetInput = document.getElementById('add-spray-target');
        const modal = document.getElementById('add-spray-modal');
        
        // Remove existing category classes
        modal.className = 'modal-overlay';
        
        if (category) {
            // Add category class for styling
            modal.classList.add(`category-${category}`);
            
            // Show and configure target field based on category
            targetField.style.display = 'block';
            
            switch (category) {
                case 'insecticides':
                    targetInput.placeholder = 'e.g., Aphids, Bollworm, Two-Spotted Mite';
                    break;
                case 'fungicides':
                    targetInput.placeholder = 'e.g., Downy Mildew, Powdery Mildew, Pythium';
                    break;
                case 'foliar-feeds':
                    targetInput.placeholder = 'e.g., NPK, Calcium, Iron deficiency';
                    break;
                default:
                    targetField.style.display = 'none';
            }
        } else {
            targetField.style.display = 'none';
        }
    }

    async saveNewSprayProgramme() {
        const modal = document.getElementById('add-spray-modal');
        const isEditing = modal.dataset.editingId;
        
        const formData = {
            category: document.getElementById('add-spray-category').value,
            product_name: document.getElementById('add-spray-product').value,
            active_ingredient: document.getElementById('add-spray-ingredient').value,
            target: document.getElementById('add-spray-target').value,
            application_rate: document.getElementById('add-spray-rate').value,
            rate_unit: document.getElementById('add-spray-rate-unit').value,
            frequency_days: parseInt(document.getElementById('add-spray-frequency').value),
            start_date: document.getElementById('add-spray-start').value,
            end_date: document.getElementById('add-spray-end').value,
            notes: document.getElementById('add-spray-notes').value
        };

        // Validate required fields with specific error messages
        const missingFields = [];
        if (!formData.category) missingFields.push('Category');
        if (!formData.product_name) missingFields.push('Product Name');
        if (!formData.application_rate) missingFields.push('Application Rate');
        if (!formData.frequency_days || isNaN(formData.frequency_days)) missingFields.push('Application Frequency');
        
        if (missingFields.length > 0) {
            this.showNotification(`❌ Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // Validate date fields (both are optional, but if provided, end date should be after start date)
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            
            if (endDate <= startDate) {
                this.showNotification('❌ End date must be after start date', 'error');
                return;
            }
        }

        // Clean up empty date strings (convert to null for backend)
        if (!formData.start_date || formData.start_date.trim() === '') {
            formData.start_date = '';
        }
        if (!formData.end_date || formData.end_date.trim() === '') {
            formData.end_date = '';
        }

        try {
            // Prepare data for API
            const apiData = {
                category: formData.category,
                product_name: formData.product_name,
                active_ingredient: formData.active_ingredient,
                application_rate: `${formData.application_rate} ${formData.rate_unit}`,
                frequency_days: formData.frequency_days,
                start_date: formData.start_date,
                end_date: formData.end_date,
                notes: formData.notes
            };

            // Set target field based on category
            if (formData.category === 'insecticides') {
                apiData.target_pest = formData.target;
            } else if (formData.category === 'fungicides') {
                apiData.target_disease = formData.target;
            } else if (formData.category === 'foliar-feeds') {
                apiData.nutrient_type = formData.target;
            }

            if (isEditing) {
                // Update existing programme
                await this.updateSprayApplication(isEditing, apiData);
                this.showNotification('✅ Spray programme updated successfully!', 'success');
            } else {
                // Create new programme
                await this.addSprayApplication(apiData);
            }
            
            this.closeAddSprayModal();
            
        } catch (error) {
            console.error('Failed to save spray programme:', error);
            this.showNotification('❌ Failed to save spray programme. Please try again.', 'error');
        }
    }

    async addToProgramme(applicationId) {
        // Find the application details
        const application = await this.findSprayApplication(applicationId);
        if (!application) {
            this.showNotification('❌ Application not found', 'error');
            return;
        }

        // Open the add spray modal with pre-filled data
        const modal = document.getElementById('add-spray-modal');
        const categorySelect = document.getElementById('add-spray-category');
        const title = document.getElementById('add-spray-title');
        
        // Clear form first to ensure clean state
        this.clearAddSprayForm();
        
        // Pre-fill the form with application data (all fields remain editable)
        categorySelect.value = application.category;
        document.getElementById('add-spray-product').value = application.product_name;
        document.getElementById('add-spray-ingredient').value = application.active_ingredient || '';
        document.getElementById('add-spray-target').value = application.target_pest || application.target_disease || application.nutrient_type || '';
        document.getElementById('add-spray-rate').value = application.application_rate ? application.application_rate.split(' ')[0] : '';
        document.getElementById('add-spray-rate-unit').value = application.application_rate ? application.application_rate.split(' ').slice(1).join(' ') : 'ml per 10L';
        document.getElementById('add-spray-frequency').value = this.parseFrequencyDays(application.frequency) || 7;
        document.getElementById('add-spray-notes').value = application.notes || '';
        
        // Ensure all fields are enabled and editable
        const formFields = modal.querySelectorAll('input, select, textarea');
        formFields.forEach(field => {
            field.removeAttribute('readonly');
            field.removeAttribute('disabled');
            field.style.backgroundColor = '';
            field.style.cursor = 'text';
        });
        
        title.textContent = `🔄 Add ${application.product_name} to Programme`;
        this.updateAddSprayForm();
        
        // Show informational message that fields can be edited
        this.showNotification('💡 All fields can be edited before adding to programme', 'info');
        
        modal.style.display = 'flex';
        
        // Focus on product name field to indicate it's editable
        setTimeout(() => {
            document.getElementById('add-spray-product').focus();
        }, 100);
    }

    async editSprayProgramme(applicationId) {
        // Find the application details
        const application = await this.findSprayApplication(applicationId);
        if (!application) {
            this.showNotification('❌ Application not found', 'error');
            return;
        }

        // Open the add spray modal in edit mode with pre-filled data
        const modal = document.getElementById('add-spray-modal');
        const categorySelect = document.getElementById('add-spray-category');
        const title = document.getElementById('add-spray-title');
        
        // Pre-fill all form fields
        categorySelect.value = application.category;
        document.getElementById('add-spray-product').value = application.product_name;
        document.getElementById('add-spray-ingredient').value = application.active_ingredient || '';
        document.getElementById('add-spray-target').value = application.target_pest || application.target_disease || application.nutrient_type || '';
        document.getElementById('add-spray-rate').value = application.application_rate ? application.application_rate.split(' ')[0] : '';
        document.getElementById('add-spray-rate-unit').value = application.application_rate ? application.application_rate.split(' ').slice(1).join(' ') : 'ml per 10L';
        document.getElementById('add-spray-frequency').value = this.parseFrequencyDays(application.frequency) || 7;
        document.getElementById('add-spray-start').value = application.start_date || '';
        document.getElementById('add-spray-end').value = application.end_date || '';
        document.getElementById('add-spray-notes').value = application.notes || '';
        
        title.textContent = `🔧 Edit ${application.product_name} Programme`;
        this.updateAddSprayForm();
        
        // Store the ID for updating
        modal.dataset.editingId = applicationId;
        
        modal.style.display = 'flex';
    }

    async removeFromProgramme(applicationId) {
        // Find the application details
        const application = await this.findSprayApplication(applicationId);
        if (!application) {
            this.showNotification('❌ Application not found', 'error');
            return;
        }

        // Confirm removal using custom modal
        const confirmed = await this.showCustomConfirm(
            `Remove "${application.product_name}" from programme?`,
            `Are you sure you want to remove "${application.product_name}" from the spray programme?`,
            [
                'Stop all future scheduled applications',
                'Remove it from upcoming applications calendar', 
                'Move it to "Available Products" section',
                'Keep existing application history for records'
            ]
        );
        
        if (confirmed) {
            try {
                await this.makeApiCall(`/spray-programmes/${applicationId}`, {
                    method: 'DELETE'
                });
                
                this.showNotification(`✅ ${application.product_name} removed from programme successfully!`, 'success');
                
                // Force refresh of all views with slight delays to ensure backend update is complete
                setTimeout(() => {
                    // Refresh the current category view
                    this.loadSprayApplications(application.category);
                }, 100);
                
                setTimeout(() => {
                    // Refresh upcoming applications calendar
                    this.updateSprayCalendar();
                }, 300);
                
                setTimeout(() => {
                    // Also refresh other categories if they were loaded
                    ['insecticides', 'fungicides', 'foliar-feeds'].forEach(cat => {
                        if (cat !== application.category) {
                            this.loadSprayApplications(cat);
                        }
                    });
                }, 500);
                
            } catch (error) {
                console.error('Failed to remove from programme:', error);
                this.showNotification('❌ Failed to remove from programme. Please try again.', 'error');
            }
        }
    }

    async findSprayApplication(applicationId) {
        // Search through all categories to find the application
        const categories = ['insecticides', 'fungicides', 'foliar-feeds'];
        
        for (const category of categories) {
            try {
                const response = await this.makeApiCall(`/spray-programmes?system_id=${this.activeSystemId}`);
                const applications = this.filterApplicationsByCategory(response.programmes, category);
                const found = applications.find(app => app.id == applicationId);
                if (found) return found;
            } catch (error) {
                // Try mock data
                const mockApplications = this.getMockSprayApplications(category);
                const found = mockApplications.find(app => app.id == applicationId);
                if (found) return found;
            }
        }
        
        return null;
    }

    async updateSprayApplication(applicationId, data) {
        try {
            await this.makeApiCall(`/spray-programmes/${applicationId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            // Refresh the current view
            this.loadSprayApplications(data.category);
            
            // Also refresh the calendar
            setTimeout(() => {
                this.updateSprayCalendar();
            }, 500);
            
        } catch (error) {
            console.log('API endpoint not ready, simulating update operation');
            this.showNotification('❌ Update failed - API not available', 'error');
            throw error;
        }
    }

    async addSprayApplication(data) {
        if (!this.activeSystemId) {
            this.showNotification('🏗️ Please select a system first.', 'warning');
            return;
        }
        
        try {
            await this.makeApiCall('/spray-programmes', {
                method: 'POST',
                body: JSON.stringify({
                    ...data,
                    system_id: this.activeSystemId
                })
            });
            this.showNotification('Spray programme added successfully!', 'success');
            
            // Refresh the current category and update calendar
            this.loadSprayApplications(data.category);
            
            // Also refresh the calendar to show upcoming applications
            setTimeout(() => {
                this.updateSprayCalendar();
            }, 500);
        } catch (error) {
            console.log('API endpoint not ready, simulating add operation');
            this.showNotification('Spray application added to demo data!', 'success');
            // Refresh the current category to show mock data
            this.loadSprayApplications(data.category);
        }
    }

    recordSprayApplication(applicationId) {
        console.log('Recording spray application:', applicationId);
        
        // Find the application data
        const allCategories = ['insecticides', 'fungicides', 'foliar-feeds'];
        let application = null;
        
        for (const category of allCategories) {
            const apps = this.getMockSprayApplications(category);
            application = apps.find(app => app.id === applicationId);
            if (application) break;
        }
        
        if (!application) {
            this.showNotification('❌ Application not found', 'error');
            return;
        }
        
        // Store current application for the modal
        this.currentSprayApplication = application;
        
        // Pre-fill the modal with application data
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('record-date').value = today;
        document.getElementById('record-product').value = application.product_name;
        document.getElementById('record-rate').value = application.application_rate;
        document.getElementById('record-rate-unit').value = application.rate_unit;
        
        // Show the modal
        document.getElementById('record-spray-modal').style.display = 'flex';
    }

    closeRecordSprayModal() {
        document.getElementById('record-spray-modal').style.display = 'none';
        this.currentSprayApplication = null;
        
        // Clear form
        document.getElementById('record-spray-form').reset();
    }

    async saveSprayRecord() {
        if (!this.currentSprayApplication) return;
        
        const formData = {
            application_id: this.currentSprayApplication.id,
            date: document.getElementById('record-date').value,
            product_used: document.getElementById('record-product').value,
            amount_used: document.getElementById('record-rate').value,
            rate_unit: document.getElementById('record-rate-unit').value,
            area_treated: document.getElementById('record-area').value,
            area_unit: document.getElementById('record-area-unit').value,
            conditions: document.getElementById('record-conditions').value,
            notes: document.getElementById('record-notes').value,
            system_id: this.activeSystemId
        };
        
        // Validate required fields
        if (!formData.date || !formData.product_used || !formData.amount_used) {
            this.showNotification('❌ Please fill in all required fields', 'error');
            return;
        }
        
        try {
            // Try API call first
            await this.makeApiCall('/spray-programmes/record', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            this.showNotification('Spray application recorded successfully!', 'success');
            this.closeRecordSprayModal();
            this.setupSprayProgrammes(); // Reload data
            
        } catch (error) {
            console.log('API endpoint not ready, simulating record operation');
            
            // Update the last_application date in mock data
            this.updateMockSprayLastApplication(this.currentSprayApplication.id, formData.date);
            
            this.showNotification('Spray application recorded (demo mode)!', 'success');
            this.closeRecordSprayModal();
            this.setupSprayProgrammes(); // Reload data
        }
    }

    updateMockSprayLastApplication(applicationId, newDate) {
        // This would update the mock data to reflect the new last application date
        // In a real implementation, this would be handled by the API
        console.log(`Updated application ${applicationId} last applied date to ${newDate}`);
    }

    async toggleApplicationHistory(applicationId) {
        const historyDiv = document.getElementById(`history-${applicationId}`);
        const toggleBtn = historyDiv.previousElementSibling;
        
        if (historyDiv.style.display === 'none') {
            // Load and show history
            await this.loadApplicationHistory(applicationId);
            historyDiv.style.display = 'block';
            toggleBtn.textContent = '📋 Hide Application History';
        } else {
            // Hide history
            historyDiv.style.display = 'none';
            toggleBtn.textContent = '📋 View Application History';
        }
    }

    async loadApplicationHistory(applicationId) {
        const historyDiv = document.getElementById(`history-${applicationId}`);
        
        try {
            // Try API call first
            const history = await this.makeApiCall(`/spray-programmes/${applicationId}/history`);
            this.displayApplicationHistory(history, historyDiv);
        } catch (error) {
            console.log('API endpoint not ready, using mock history data');
            // Show mock history data
            const mockHistory = this.getMockApplicationHistory(applicationId);
            this.displayApplicationHistory(mockHistory, historyDiv);
        }
    }

    getMockApplicationHistory(applicationId) {
        // Mock history data - in real implementation this would come from API
        return [
            {
                id: 1,
                date: '2025-07-25',
                product_used: 'Bioneem',
                amount_used: '100',
                rate_unit: 'ml per 10L',
                area_treated: '15',
                area_unit: 'm²',
                conditions: 'early morning',
                notes: 'Applied preventatively, good coverage achieved'
            },
            {
                id: 2,
                date: '2025-07-18',
                product_used: 'Bioneem',
                amount_used: '120',
                rate_unit: 'ml per 10L',
                area_treated: '15',
                area_unit: 'm²',
                conditions: 'cloudy',
                notes: 'Increased rate due to aphid pressure'
            },
            {
                id: 3,
                date: '2025-07-11',
                product_used: 'Bioneem',
                amount_used: '100',
                rate_unit: 'ml per 10L',
                area_treated: '12',
                area_unit: 'm²',
                conditions: 'calm',
                notes: 'Regular preventative application'
            }
        ];
    }

    displayApplicationHistory(history, container) {
        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No application history recorded yet.</p>';
            return;
        }

        let html = '<div class="history-entries">';
        history.forEach(entry => {
            html += `
                <div class="history-entry">
                    <div class="history-header">
                        <span class="history-date">${this.formatDateDDMMYYYY(new Date(entry.date))}</span>
                        <span class="history-product">${entry.product_used}</span>
                    </div>
                    <div class="history-details">
                        <div class="history-detail">
                            <strong>Amount:</strong> ${entry.amount_used} ${entry.rate_unit}
                        </div>
                        ${entry.area_treated ? `
                            <div class="history-detail">
                                <strong>Area:</strong> ${entry.area_treated} ${entry.area_unit}
                            </div>
                        ` : ''}
                        ${entry.conditions ? `
                            <div class="history-detail">
                                <strong>Conditions:</strong> ${entry.conditions}
                            </div>
                        ` : ''}
                        ${entry.notes ? `
                            <div class="history-notes">
                                <strong>Notes:</strong> ${entry.notes}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async editSprayApplication(applicationId) {
        // This would show an edit modal
        // For now, we'll implement basic edit functionality
        console.log('Editing spray application:', applicationId);
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    async deleteSprayApplication(applicationId) {
        // Find the application details for better confirmation message
        const application = await this.findSprayApplication(applicationId);
        const productName = application ? application.product_name : 'this spray application';
        
        const confirmed = await this.showCustomConfirm(
            `Remove "${productName}" from programme?`,
            `Are you sure you want to remove "${productName}" from the spray programme?`,
            [
                'Stop all future scheduled applications',
                'Remove it from upcoming applications calendar',
                'Move it to "Available Products" section', 
                'Keep existing application history for records'
            ]
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            await this.makeApiCall(`/spray-programmes/${applicationId}`, {
                method: 'DELETE'
            });
            this.showNotification(`✅ ${productName} removed from programme successfully!`, 'success');
            
            // Use the same enhanced refresh logic as removeFromProgramme
            const category = application ? application.category : 'insecticides';
            
            // Force refresh of all views with slight delays to ensure backend update is complete
            setTimeout(() => {
                // Refresh the current category view
                this.loadSprayApplications(category);
            }, 100);
            
            setTimeout(() => {
                // Refresh upcoming applications calendar
                this.updateSprayCalendar();
            }, 300);
            
            setTimeout(() => {
                // Also refresh other categories if they were loaded
                ['insecticides', 'fungicides', 'foliar-feeds'].forEach(cat => {
                    if (cat !== category) {
                        this.loadSprayApplications(cat);
                    }
                });
            }, 500);
        } catch (error) {
            console.log('API endpoint not ready, simulating delete operation');
            this.showNotification('Delete operation simulated (demo mode)', 'info');
            // In demo mode, we don't actually delete from mock data
        }
    }

    filterApplicationsByCategory(applications, category) {
        console.log('Filtering applications:', applications, 'for category:', category);
        
        // Log each application to see the data structure
        applications.forEach((app, index) => {
            console.log(`App ${index}:`, {
                id: app.id,
                product_name: app.product_name,
                category: app.category,
                programme: app.programme,
                products: app.products
            });
        });
        
        // Map backend programme data to frontend categories
        // Use the category field from the database directly
        return applications.filter(app => {
            // First try direct category match
            console.log(`Checking app ${app.id}: category="${app.category}" vs target="${category}"`);
            if (app.category === category) {
                console.log(`✅ Direct category match for app ${app.id}`);
                return true;
            }
            
            // Fallback to text-based filtering for backwards compatibility
            const programme = app.programme?.toLowerCase() || '';
            const products = app.products?.toLowerCase() || '';
            const productName = app.product_name?.toLowerCase() || '';
            
            switch (category) {
                case 'insecticides':
                    return programme.includes('pest') || 
                           products.includes('neem') || 
                           products.includes('pyrethrin') ||
                           products.includes('spinosad') ||
                           products.includes('metarhizium') ||
                           productName.includes('bioneem') ||
                           productName.includes('pyrol') ||
                           productName.includes('metarhizium') ||
                           productName.includes('eco insect');
                case 'fungicides':
                    return programme.includes('fungal') || 
                           programme.includes('disease') ||
                           products.includes('fungicide') ||
                           products.includes('copper') ||
                           productName.includes('copper') ||
                           productName.includes('bacillus') ||
                           productName.includes('amylox') ||
                           productName.includes('lime sulphur') ||
                           productName.includes('trichoderma') ||
                           productName.includes('milk');
                case 'foliar-feeds':
                    return programme.includes('foliar') || 
                           programme.includes('nutrient') ||
                           products.includes('calmag') ||
                           products.includes('kelp') ||
                           products.includes('fish') ||
                           productName.includes('nitrosol') ||
                           productName.includes('eckosil') ||
                           productName.includes('seabrix') ||
                           productName.includes('oceanfert') ||
                           productName.includes('fulvic') ||
                           productName.includes('iron') ||
                           productName.includes('potassium') ||
                           productName.includes('calcium') ||
                           productName.includes('magnesium') ||
                           productName.includes('calsure') ||
                           productName.includes('organofert') ||
                           productName.includes('shiman');
                case 'soil-drenches':
                    return programme.includes('root') || 
                           programme.includes('drench') ||
                           products.includes('bacteria') ||
                           products.includes('enzyme');
                default:
                    return false;
            }
        });
    }

    // BCF Spray Plan Data (from BCF Spray Plan Feb2019.xlsx)
    getMockSprayApplications(category) {
        const bcfSprayData = {
            'insecticides': [
                {
                    id: 1,
                    product_name: 'Bioneem',
                    active_ingredient: 'Azadirachtin',
                    target_pest: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly',
                    application_rate: '100',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Preventative Foliar - Combine with Foliar feeds'
                },
                {
                    id: 2,
                    product_name: 'Pyrol',
                    active_ingredient: 'Pyrethrin',
                    target_pest: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly',
                    application_rate: '100',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive Foliar - Combine with Foliar feeds'
                },
                {
                    id: 3,
                    product_name: 'Metarhizium 62',
                    active_ingredient: 'Metarhizium anisopliae',
                    target_pest: 'Thrips, Whitefly, Snout Beetle',
                    application_rate: '5',
                    rate_unit: 'ml per 10L',
                    frequency_days: 10,
                    last_application: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Always Foliar - Combine with Foliar feeds'
                },
                {
                    id: 4,
                    product_name: 'Eco Insect Control',
                    active_ingredient: 'Spinosad',
                    target_pest: 'Thrips, Bollworm, Lawn Caterpillar',
                    application_rate: '7',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive Foliar - Combine with Foliar feeds'
                }
            ],
            'fungicides': [
                {
                    id: 5,
                    product_name: 'Copper Soap',
                    active_ingredient: 'Copper Octanoate',
                    target_disease: 'Downy Mildew, Powdery Mildew',
                    application_rate: '150',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Preventative Foliar - Combine with Foliar feeds'
                },
                {
                    id: 6,
                    product_name: 'Bacillus',
                    active_ingredient: 'Bacillus Subtilis',
                    target_disease: 'Downy Mildew, Powdery Mildew',
                    application_rate: '10',
                    rate_unit: 'ml per 10L',
                    frequency_days: 10,
                    last_application: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Preventative Foliar - Combine with ORGANIC Foliar feeds'
                },
                {
                    id: 7,
                    product_name: 'AmyloX',
                    active_ingredient: 'Bacillus Amyloliquefaciens',
                    target_disease: 'Downy Mildew, Powdery Mildew',
                    application_rate: '20',
                    rate_unit: 'g per 10L',
                    frequency_days: 10,
                    last_application: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive - Combine with ORGANIC Foliar feeds'
                },
                {
                    id: 8,
                    product_name: 'Lime Sulphur',
                    active_ingredient: 'Polysulphide Sulphur',
                    target_disease: 'Downy Mildew, Powdery Mildew',
                    application_rate: '250',
                    rate_unit: 'ml per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive - Combine with ORGANIC Foliar feeds'
                },
                {
                    id: 9,
                    product_name: 'Full Cream Milk',
                    active_ingredient: 'Milk Protein',
                    target_disease: 'Powdery Mildew',
                    application_rate: '1 part milk to 2-3 parts water',
                    rate_unit: 'ratio',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive - Combine with ORGANIC Foliar feeds'
                },
                {
                    id: 10,
                    product_name: 'Trichoderma',
                    active_ingredient: 'Trichoderma asperellum oil',
                    target_disease: 'Pythium',
                    application_rate: '30',
                    rate_unit: 'ml per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Reactive - Combine with ORGANIC Foliar feeds'
                }
            ],
            'foliar-feeds': [
                {
                    id: 11,
                    product_name: 'Nitrosol',
                    nutrient_type: 'NPK, Magnesium, Calcium, Sulphur, Micronutrients, Growth hormone',
                    application_rate: '50',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Complete nutrient solution'
                },
                {
                    id: 12,
                    product_name: 'Eckosil',
                    nutrient_type: 'Silicium, Iron EDTA, Molybdenum, Zinc',
                    application_rate: '3',
                    rate_unit: 'ml per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Silicon and micronutrients'
                },
                {
                    id: 13,
                    product_name: 'Seabrix/Oceanfert/Seaboost/Seagrow',
                    nutrient_type: 'N, P, K, Ca, Mg + Micronutrients',
                    application_rate: '30',
                    rate_unit: 'ml per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Seaweed extract with complete nutrition'
                },
                {
                    id: 14,
                    product_name: 'Fulvic Acid',
                    nutrient_type: 'Fulvic Acid, Humic Acid',
                    application_rate: '7.5',
                    rate_unit: 'g per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Nutrient uptake enhancer'
                },
                {
                    id: 15,
                    product_name: 'Iron Chelate',
                    nutrient_type: 'Iron DPTA Chelate 11%',
                    application_rate: '25-50',
                    rate_unit: 'g per 10L',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Iron deficiency correction'
                },
                {
                    id: 16,
                    product_name: 'Potassium Nitrate',
                    nutrient_type: '38.7% Potassium, 61.3% Nitrate',
                    application_rate: '100',
                    rate_unit: 'g/0.5% per 10L with Nitrosol/Seaweed extract',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Potassium and nitrogen boost'
                },
                {
                    id: 17,
                    product_name: 'Calcium Nitrate',
                    nutrient_type: '24.4% Calcium, 77.6% Nitrate',
                    application_rate: '100',
                    rate_unit: 'g/0.5% per 10L with Nitrosol/Seaweed extract',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Calcium deficiency prevention'
                },
                {
                    id: 18,
                    product_name: 'Magnesium Sulphate (Epsom Salt)',
                    nutrient_type: '20.2% Magnesium, 79.8% Sulphate',
                    application_rate: '100',
                    rate_unit: 'g/0.5% per 10L with Nitrosol/Seaweed extract',
                    frequency_days: 10,
                    last_application: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - Promotes green growth, spray on leafy plants'
                },
                {
                    id: 19,
                    product_name: 'Calsure',
                    nutrient_type: 'Calcium Chelate',
                    application_rate: '200',
                    rate_unit: 'ml/1% per 10L with Fulvic acid',
                    frequency_days: 7,
                    last_application: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Use when Calcium Deficiency detected'
                },
                {
                    id: 20,
                    product_name: 'Organofert',
                    nutrient_type: 'Humic and Fulvic Acids, Earthworm extracts, Micro-Organisms and Fish Emulsion',
                    application_rate: '200',
                    rate_unit: 'ml per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Foliar Feed leaves - 10-14 day interval'
                },
                {
                    id: 21,
                    product_name: 'Shiman 2-1-2',
                    nutrient_type: 'Full spectrum of minerals',
                    application_rate: '20',
                    rate_unit: 'g per 10L',
                    frequency_days: 14,
                    last_application: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Do not use with Lime Sulphur, Bordeaux mixture or Copper containing products'
                }
            ]
        };

        return bcfSprayData[category] || [];
    }

    updateSprayCalendarMock() {
        // Generate general spray schedule instead of specific products
        const generalSchedule = this.getGeneralSpraySchedule();
        this.displayGeneralSprayCalendar(generalSchedule);
    }

    getGeneralSpraySchedule() {
        const today = new Date();
        const schedule = [];

        // Create a general weekly schedule
        const scheduleItems = [
            {
                category: 'Insecticides',
                description: 'Pest Control Application',
                daysFromNow: 2,
                type: 'pesticide',
                icon: '🐛'
            },
            {
                category: 'Foliar Feeds',
                description: 'Nutrient Foliar Spray',
                daysFromNow: 3,
                type: 'foliar',
                icon: '🌿'
            },
            {
                category: 'Fungicides',
                description: 'Disease Prevention Spray',
                daysFromNow: 5,
                type: 'fungicide',
                icon: '🍄'
            },
            {
                category: 'Insecticides',
                description: 'Pest Prevention Check',
                daysFromNow: 9,
                type: 'pesticide',
                icon: '🐛'
            },
            {
                category: 'Foliar Feeds',
                description: 'Weekly Nutrient Feed',
                daysFromNow: 10,
                type: 'foliar',
                icon: '🌿'
            },
            {
                category: 'Fungicides',
                description: 'Preventative Fungicide',
                daysFromNow: 12,
                type: 'fungicide',
                icon: '🍄'
            }
        ];

        scheduleItems.forEach(item => {
            const date = new Date(today);
            date.setDate(today.getDate() + item.daysFromNow);
            
            schedule.push({
                date: date,
                category: item.category,
                description: item.description,
                type: item.type,
                icon: item.icon,
                daysFromNow: item.daysFromNow
            });
        });

        return schedule.sort((a, b) => a.date - b.date);
    }

    displayGeneralSprayCalendar(schedule) {
        const container = document.getElementById('spray-calendar-container');
        if (!container) return;

        if (schedule.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">No spray schedule available.</p>';
            return;
        }

        let html = '<div class="upcoming-sprays">';
        schedule.slice(0, 6).forEach(item => {
            const isOverdue = item.daysFromNow < 0;
            const isToday = item.daysFromNow === 0;
            const isTomorrow = item.daysFromNow === 1;
            const urgency = isOverdue ? 'overdue' : item.daysFromNow <= 3 ? 'urgent' : 'normal';
            
            let timeText = '';
            if (isOverdue) {
                timeText = '<span class="overdue-badge">Overdue</span>';
            } else if (isToday) {
                timeText = '<span class="today-badge">Today</span>';
            } else if (isTomorrow) {
                timeText = '<span class="tomorrow-badge">Tomorrow</span>';
            } else {
                timeText = `<span class="days-badge">${item.daysFromNow} days</span>`;
            }
            
            html += `
                <div class="upcoming-spray ${urgency}">
                    <div class="spray-date">
                        ${this.formatDateDDMMYYYY(item.date)}
                        ${timeText}
                    </div>
                    <div class="spray-info">
                        <strong>${item.icon} ${item.description}</strong>
                        <span class="spray-category">${item.category}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // Fish Management Tab Methods
    loadFishOverview() {
        console.log('Loading fish overview...');
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        // Move the fish calculator to the overview tab if it's not already there
        if (!container.querySelector('.fish-calculator')) {
            const existingCalculator = document.querySelector('.fish-calculator');
            if (existingCalculator) {
                container.appendChild(existingCalculator);
                console.log('Moved fish calculator to overview tab');
            } else {
                // If fish calculator doesn't exist, initialize it
                console.log('Fish calculator not found, initializing...');
                this.initializeFishCalculator();
            }
        }

        // Load tank summary data
        this.displayFishTankSummary();
        
        // Update system info in calculator after moving it
        setTimeout(() => {
            this.updateFishCalculatorSystemInfo();
        }, 100);
    }

    async displayFishTankSummary() {
        console.log('Loading fish tank summary...');
        const container = document.getElementById('tank-summary-container');
        if (!container) return;

        try {
            // Get system data for tank information
            const systemData = this.getActiveSystem();
            if (!systemData) {
                container.innerHTML = '<p class="no-data">No system data available. Please configure your system in Settings.</p>';
                return;
            }

            // Create a simple tank summary display above the calculator
            const summaryHtml = `
                <div class="tank-summary-overview" style="margin-bottom: 2rem;">
                    <h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 20px; height: 20px; vertical-align: text-bottom; margin-right: 6px;"><path d="M21 7H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM3 17V9h18v8H3zm2-6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm14 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" fill="#0051b1"/></svg> Tank Overview</h3>
                    <div class="summary-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="summary-card" style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e0e6ed;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">System: ${systemData.system_name}</h4>
                            <p style="margin: 0; color: #666;">Type: ${systemData.system_type?.toUpperCase() || 'N/A'}</p>
                        </div>
                        <div class="summary-card" style="background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e0e6ed;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">Fish Tanks</h4>
                            <p style="margin: 0; color: #666;">${systemData.fish_tank_count || 1} tanks • ${((systemData.total_fish_volume || 1000) / 1000).toFixed(1)}m³ total</p>
                        </div>
                    </div>
                </div>
            `;

            // Insert summary before fish calculator (if it doesn't already exist)
            if (!container.querySelector('.tank-summary-overview')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = summaryHtml;
                container.insertBefore(tempDiv.firstElementChild, container.firstElementChild);
            }

        } catch (error) {
            console.error('Failed to display fish tank summary:', error);
            // Don't show error to user, just log it - the calculator will still work
        }
    }

    loadFishHealthEntry() {
        console.log('Loading fish health entry form...');
        const container = document.querySelector('#fish-health-entry-content .data-entry-section');
        if (!container) return;

        // Create fish health form
        const formHtml = this.generateFishHealthForm();
        container.innerHTML = formHtml;

        // Load recent fish health data
        this.loadFishHealthHistory();

        // Setup form submission handler and tank selection
        setTimeout(() => {
            const form = document.getElementById('fish-health-entry-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.submitFishHealthData();
                });
                
                // Handle tank selection to populate current fish count
                const tankSelect = document.getElementById('fish-tank');
                if (tankSelect) {
                    tankSelect.addEventListener('change', () => {
                        this.updateCurrentFishCount();
                    });
                    
                    // Initialize with first tank if available
                    if (tankSelect.value) {
                        this.updateCurrentFishCount();
                    }
                }
            }
        }, 100);
    }

    generateFishHealthForm() {
        const tankOptions = this.generateTankOptions();
        
        return `
            <form id="fish-health-entry-form" class="data-form-element">
                <h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 18px; height: 18px; vertical-align: text-bottom; margin-right: 6px;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="#0051b1"/></svg> Data Capture</h3>
                
                <div class="form-row">
                    <div class="form-field">
                        <label for="fish-tank">Tank:</label>
                        <select id="fish-tank" required>
                            ${tankOptions}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="fish-count">Current Fish Count:</label>
                        <input type="number" id="fish-count" min="0" placeholder="Current total" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
                        <small style="color: #666; font-size: 0.8em;">Auto-calculated from additions/mortality</small>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label for="new-fish-added">New Fish Added:</label>
                        <input type="number" id="new-fish-added" min="0" placeholder="Number of fish added">
                    </div>
                    <div class="form-field">
                        <label for="new-fish-weight">Avg Weight of New Fish (g):</label>
                        <input type="number" id="new-fish-weight" step="0.1" min="0" placeholder="0.0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label for="fish-mortality">New Mortalities:</label>
                        <input type="number" id="fish-mortality" min="0" placeholder="Number of deaths">
                    </div>
                    <div class="form-field">
                        <label for="mortality-weight">Avg Weight of Mortalities (g):</label>
                        <input type="number" id="mortality-weight" step="0.1" min="0" placeholder="0.0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label for="average-weight">Current Avg Weight (g):</label>
                        <input type="number" id="average-weight" step="0.1" min="0" placeholder="0.0">
                    </div>
                    <div class="form-field">
                        <label for="feed-consumption">Feed Consumption (g):</label>
                        <input type="number" id="feed-consumption" step="0.1" min="0" placeholder="0.0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label for="fish-behavior">Behavior:</label>
                        <select id="fish-behavior">
                            <option value="normal">Normal</option>
                            <option value="lethargic">Lethargic</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="stressed">Stressed</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="fish-entry-date">Date & Time:</label>
                        <input type="datetime-local" id="fish-entry-date" value="${new Date().toISOString().slice(0, 16)}">
                    </div>
                </div>
                
                <div class="form-field">
                    <label for="fish-notes">Notes:</label>
                    <textarea id="fish-notes" rows="3" placeholder="Additional observations..."></textarea>
                </div>
                
                <button type="submit" class="form-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; vertical-align: text-bottom; margin-right: 4px;">
                        <path d="M17 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C13.66 12 15 13.34 15 15S13.66 18 12 18 9 16.66 9 15 10.34 12 12 12M6 6H15V10H6V6Z" fill="#0051b1"/>
                    </svg>
                    Save Data Entry
                </button>
            </form>
        `;
    }

    getFishSvgIcon(fishType) {
        const fishIcons = {
            'tilapia': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="width: 24px; height: 24px;"><path d="m54.988 41.94366a70.19837 70.19837 0 0 1 -.81409-8.09222 70.18137 70.18137 0 0 1 .81415-8.09235.82984.82984 0 0 0 -1.13495-.88818l-8.77484 3.69257c-3.42117-3.79948-9.97561-6.22548-16.93307-6.22548-9.77 0-18.39685 4.90967-19.1452 10.6911h2.40961a.82254.82254 0 0 1 -.00006 1.64478h-2.40955c.74835 5.78137 9.37524 10.691 19.1452 10.691 6.95746 0 13.5119-2.426 16.933-6.23371l8.7749 3.70075a.82975.82975 0 0 0 1.1349-.88826zm-37.82168-10.14819a1.2337 1.2337 0 0 1 .00006-2.46716 1.2337 1.2337 0 0 1 -.00006 2.46716zm12.33588 6.34882a3.30529 3.30529 0 0 1 -3.28144 3.28949c-.36651.053-4.22149-.81372-4.67108-.88806a.82114.82114 0 0 1 -1.53784-.3866 27.35956 27.35956 0 0 0 .02454-12.418.82327.82327 0 1 1 1.612-.329 27.93369 27.93369 0 0 1 .65789 8.47882 46.883 46.883 0 0 1 4.334-1.89154c.0965-1.40936-.68182-1.23773-.329-2.17932a2.45171 2.45171 0 0 0 .04944-2.43421.82209.82209 0 0 1 -.04938-.85534 2.4518 2.4518 0 0 0 .04938-2.43421.82142.82142 0 0 1 1.34869-.9375 4.00913 4.00913 0 0 1 .2467 3.74182 4.12593 4.12593 0 0 1 0 3.28956 4.0171 4.0171 0 0 1 .31257 2.0971 2.45534 2.45534 0 0 1 1.23358 2.13825zm3.38824-4.30929a4.12652 4.12652 0 0 1 0 3.28955 4.13961 4.13961 0 0 1 -.19739 3.69251.82046.82046 0 1 1 -1.44744-.773 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85528 2.45173 2.45173 0 0 0 .04937-2.43427.822.822 0 0 1 -.04937-.85529 2.45168 2.45168 0 0 0 .04937-2.43426.82211.82211 0 0 1 -.04937-.85535 2.45158 2.45158 0 0 0 .04937-2.4342.82062.82062 0 0 1 .20557-1.14313c1.09613-.79718 2.34338 1.5622 1.38989 3.94745a4.1265 4.1265 0 0 1 0 3.28954zm4.73694 3.69251a.82058.82058 0 0 1 -1.44738-.77312 2.45169 2.45169 0 0 0 .04932-2.4342.82187.82187 0 0 1 -.04932-.85529 2.45175 2.45175 0 0 0 .04932-2.43426.82059.82059 0 0 1 .20563-1.14313c1.09332-.79889 2.3446 1.5647 1.38989 3.94745a4.13966 4.13966 0 0 1 -.19746 3.69251zm4.72052-1.64478a.82427.82427 0 0 1 -1.45563-.77307 2.45165 2.45165 0 0 0 .04932-2.4342.82809.82809 0 0 1 .20563-1.14313c1.12921-.84806 2.51056 1.82552 1.20068 4.35036zm8.02655 2.90308a21.66 21.66 0 0 1 -2.24512-.78949.82119.82119 0 0 1 .57563-1.53791l1.95727.73194a.82646.82646 0 0 1 -.28778 1.59542zm0-4.11194h-1.135a.82252.82252 0 0 1 0-1.64478h1.135a.82252.82252 0 0 1 0 1.64474zm.28778-4.4903a21.6413 21.6413 0 0 1 -2.24512.78955.82646.82646 0 0 1 -.28778-1.59546l1.95728-.73193a.82116.82116 0 0 1 .57562 1.5378z" fill="#0051b1"/><path d="m26.68964 35.67712-4.58075 2.12177c-.05756.38647-.11512.76483-.181 1.14313l3.95575.81408a1.65689 1.65689 0 0 0 1.97375-1.61181v-1.71875a.82791.82791 0 0 0 -1.16775-.74842z" fill="#0051b1"/><path d="m39.89722 23.037c-6.78473-5.46887-16.81794-6.35706-17.30316-6.3982a.80749.80749 0 0 0 -.87171.68256l-.72369 4.21887a30.11141 30.11141 0 0 1 7.14654-.847 29.66566 29.66566 0 0 1 11.75202 2.34377z" fill="#0051b1"/><path d="m32 2a30 30 0 1 0 30 30 30.03414 30.03414 0 0 0 -30-30zm0 58.29218a28.29221 28.29221 0 1 1 28.29224-28.29218 28.32516 28.32516 0 0 1 -28.29224 28.29218z" fill="#0051b1"/></svg>',
            'trout': '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 100 100" viewBox="0 0 100 100" style="width: 24px; height: 24px;"><path d="m54.96191 59.66748c-1.06738-.04834-4.33496-1.97461-6.31445-3.32666-.18408-.12549-.40771-.19287-.62744-.17236-.104.00635-10.49658.65918-16.03027.25049-2.98706-.2193-5.9267-.75238-8.91229-1.34186 1.31549-1.10309 3.2995-3.04572 3.80927-5.08441.56158-2.24603-.85437-4.50629-1.78333-5.69061 4.54456-1.39368 9.70428-2.93896 16.91223-3.05206.26562-.00439.51855-.11426.70361-.30518 3.12451-3.23096 7.41846-6.32471 8.58447-5.59668.02063.01288.04089.02795.06146.04108-1.77484 1.16016-3.79089 3.77069-4.53265 4.77753-.32727-.04553-.52832-.07349-.52832-.07349l-.27539 1.98047s9.58447 1.3335 12.00098 1.66699c.88135.12158 2.35498.24219 3.91504.37012 2.55859.20996 6.06348.49707 6.95947.82764.11132.041.22851.06151.3457.06151.11914 0 .23779-.021.35107-.06348 1.25146-.46924 3.50293-1.25488 4.21729-1.36475.5459-.08398.92041-.59424.83643-1.14014-.08398-.54639-.60156-.91797-1.14014-.83643-.98291.15088-3.39209 1.01709-4.29688 1.3501-1.25488-.32861-3.77881-.55469-7.10986-.82764-1.53174-.12549-2.97852-.24414-3.80469-.3584-.94812-.13086-3.00031-.41559-5.14307-.7132.87207-.92236 1.70776-1.66272 2.14917-1.89429.43439.54028.69775.91125.70532.92194.31641.45215.94141.56104 1.39258.24512.45215-.31689.56201-.93994.24561-1.39209-.1001-.14307-2.48242-3.52051-5.28955-5.2749-2.95898-1.85107-8.68555 3.47217-10.79248 5.60645-7.41016.17139-12.66748 1.78516-17.31641 3.21191-1.92383.59033-3.74072 1.14795-5.55615 1.55371-6.47803 1.44922-10.71924 4.71582-10.89697 4.854-.32764.25537-.46289.68701-.34033 1.08398.12305.39697.47852.67676.89307.70264.81885.05127 4.4209 1.26318 6.71729 2.10742.11377.04199.23047.06201.34521.06201.40723 0 .79004-.25098.93848-.65527.19043-.51855-.0752-1.09326-.59326-1.28369-.6333-.23291-2.94824-1.07471-4.86865-1.65479.78503-.46039 1.80908-1.00098 3.0116-1.53058.16705.64612.74878 1.12561 1.44714 1.12561.82843 0 1.5-.67157 1.5-1.5 0-.24835-.0661-.47913-.17297-.68542.77515-.25067 1.59387-.48102 2.45593-.67377 1.29089-.28894 2.57617-.65668 3.87842-1.04553.34869.37347 2.40753 2.68005 1.93311 4.57678-.4707 1.88428-3.18262 4.1333-4.18799 4.84131-.10693.0752-.19128.16974-.25867.27301-.38226-.06201-.75275-.13361-1.13879-.19391-2.27246-.35547-4.62207-.72266-6.64795-1.52393-.50098-.19775-.92773-.31982-1.30469-.42725-.65039-.18555-1.12012-.31982-1.72217-.77441-.44043-.33398-1.06885-.24512-1.40039.19531-.33301.44043-.24561 1.06738.19531 1.40039.89941.67969 1.65088.89404 2.37793 1.10205.33691.0957.69873.19824 1.11865.36426 2.23291.88232 4.69385 1.26758 7.07422 1.63965 1.00391.15674 1.99902.31201 2.96045.50342 3.28271.65479 6.50439 1.26221 9.83105 1.50635 5.16113.38281 14.07861-.11572 15.96191-.22803 1.30713.87598 5.21729 3.396 7.06592 3.47998.01562.00049.03076.00098.04639.00098.53125 0 .97363-.41846.99805-.95459.02489-.55173-.40187-1.01951-.95363-1.04441zm-4.18762-18.95288c-.58667-.08154-1.14447-.15906-1.66199-.23096 1.43713-1.80725 3.13007-3.53546 3.82471-3.66772.05853-.01117.10486-.04431.15869-.06476.31415.29108.61145.5896.89056.88403-.89031.57502-1.96044 1.60053-3.21197 3.07941z" fill="#0051b1"/></svg>',
            'catfish': '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_2" viewBox="0 0 64 64" style="width: 24px; height: 24px;"><path d="m47.1155295 24.1677246c2.6532764.529534 5.044589 1.4316276 7.1071725 2.6807979.5403006.3273275 1.089329.7242869 1.6183534 1.1759708-.2118264-1.2184634-.5895462-2.4652766-1.2422262-3.1804533-1.813361-1.6640314-26.3839445-6.5062864-29.4265992-6.237697-1.2683462.1151189-1.9344047 1.5526713-2.2573363 2.6267743 5.9503139.0545333 13.8013314.8573712 24.2006359 2.9346073z" fill="#0051b1"/><path d="m33.9545424 31.9742526c-.1123298.5250399-.2545529 1.2942294-.4221916 2.4674375-.1074574.7522017.5920691 1.3611269 1.0176847 1.6561079 1.1030185.7658972 2.3482599.8817827 2.7823035.7711648.304726-1.1298828-.3281664-3.1553755-1.011627-4.604865-.7496996-.2088571-1.539169-.3019605-2.3661695-.2898452z" fill="#0051b1"/><path d="m11.576416 31.2006226c6.5237918 3.6058327 12.8864102 2.7625121 12.8140516-4.8353103 3.0488744-3.5109919 2.2919307 4.4495968-.8329725 7.5376418 3.2568571 2.1349583 7.913564-.7538779 11.4386558-1.2291121 4.4503433 1.2522076 10.0800679-.8130041 13.7398483 1.9389162 4.9116326-7.9367702-16.5277001-3.027739-18.7003735-2.9212553-4.1082576-1.817751 2.8982044-2.0975484 3.7204673-3.2954151 1.0409823-1.3424914-2.6439031-.9227009-3.635791-.5450525-5.5056777-2.1260204 7.9094262-4.4328407 5.7107526 1.0673607 4.588715-1.3431334 11.9827014-1.5430712 15.2460938 1.5915527 5.0143858-12.7196708 3.4850637 13.7859204-16.7236328 11.6218872 1.3293801 1.1420344 1.6478069 2.8973085 1.078125 4.5117188 7.3209905-2.4553212 16.855255-3.2807426 18.803833-7.5292358.0755414.3492258-15.3958173 8.6502329-12.5546226 3.3750429 21.8262046-4.9067795 19.5890925-15.0059387 5.6645264-18.710719-30.0851236-6.0076466-36.8751626-.6155568-38.2037759 1.0587596 7.3892591 6.4491261-6.2090201 1.3941353 2.4348145 6.3632202zm3.8191528-5.0973511c-1.5417271.0226149-1.5417777-2.3995156.0001074-2.3767025 1.5416197-.0226214 1.5416703 2.3995092-.0001074 2.3767025z" fill="#0051b1"/><path d="m45.4893617 33.8510638c-.5898836-.0692623-2.2686868-.3364663-3.7358922-.2695127-1.6119347.0724368-3.2369015.2002914-5.2553191.1914894.0008658.1201989.0113598.523322.0194404.6228865.5760311.1038934 1.5064541.2308742 2.240634.3313045 3.0436433.4171608 5.9693965.8265296 7.8585245 1.8886952.6289879-.4757451 1.2506166-.974722 1.8601245-1.5071756-1.0328734-.6235046-2.14713-1.1599985-2.987512-1.2576871z" fill="#0051b1"/><path d="m14.6230469 39.2182617c-.1254883 0-.2529297-.0239258-.3759766-.0742188-4.4770508-1.8198242-4.7314453-8.3725586-4.7402344-8.6503906-.0170898-.5517578.4155273-1.012207.9672852-1.0297852.5405273-.0214844 1.0126953.4145508 1.0317383.9663086.0019531.0551758.2246094 5.5322266 3.4941406 6.8613281.5117188.2080078.7578125.7910156.5498047 1.3027344-.1577148.3881836-.5317383.6240234-.9267578.6240234z" fill="#0051b1"/><path d="m22.315918 40.6220703c-.0795898 0-.159668-.0092773-.2402344-.0288086-.5361328-.1323242-.8637695-.6743164-.7319336-1.2104492.3754883-1.5244141-2.7802734-5.3032227-3.8393555-5.8193359-.7143555-.3481445-1.1171875-1.0053711-1.340332-1.7016602-.3242188.137207-.7104492.0991211-1.0078125-.1328125-.4350586-.340332-.5117188-.96875-.1713867-1.4038086l1.1489258-1.4682617c.2724609-.3486328.7416992-.4760742 1.1538086-.3144531.4121094.1625977.668457.5761719.6298828 1.0170898-.0722656.8793945.1142578 2.0361328.4628906 2.2060547 1.5092773.7353516 5.5957031 5.293457 4.9057617 8.0957031-.1123047.4560547-.5209961.7607422-.9702148.7607422z" fill="#0051b1"/></svg>',
            'goldfish': '<svg xmlns="http://www.w3.org/2000/svg" id="Capa_1" enable-background="new 0 0 512.248 512.248" height="512" viewBox="0 0 512.248 512.248" width="512" style="width: 24px; height: 24px;"><path d="m460.489 188.173c-14.643-10.65-29.983-19.494-45.785-26.476-16.458-66.72-63.517-106.681-65.925-108.688l-8.078-6.731-97.135 56.663c-25.681 14.98-38.387 44.238-33.495 72.243-9.378 5.949-16.252 11.452-20.536 15.201-23.503-2.036-44.317-16.691-54.014-38.509l-3.416-7.687c-13.378-30.101-43.307-49.551-76.247-49.551h-55.858v83.162c0 35.286 12.647 69.474 35.611 96.266 18.307 21.358 28.389 48.612 28.389 76.742v115.162h15c55.324 0 100.333-45.009 100.333-100.333v-47.773c0-15.186 6.077-29.6 16.612-40.165l15.52 10.548v31.121c0 21.452 8.793 40.883 22.956 54.897-16.018 16.803-25.422 39.402-25.422 63.574v28.132h47.001c46.481 0 86.374-28.722 102.882-69.348 34.123-.298 67.62-11.961 94.462-32.932 27.385-21.394 46.774-51.663 54.598-85.231 2.69-11.543 4.055-28.46 4.057-40.453-2.499-3.08-24.209-29.979-51.51-49.834zm-280.322 63.305c-19.439 16.413-30.833 40.678-30.833 66.386v47.773c0 33.636-23.733 61.833-55.334 68.724v-83.553c0-35.286-12.646-69.474-35.611-96.266-18.307-21.358-28.389-48.613-28.389-76.742v-53.163h25.857c21.097 0 40.265 12.457 48.833 31.735l3.416 7.687c13.214 29.731 40.571 50.363 72.061 55.39zm78.514-122.625 78.321-45.687c5.943 6.112 14.676 16.003 23.312 29.093 7.979 12.094 14.361 24.508 19.171 37.178-17.471-4.496-35.281-6.8-53.152-6.8-35.531 0-64.7 7.748-87.165 17.302 1.029-12.529 7.959-24.346 19.513-31.086zm-2.681 307.117h-16.974c.522-17.505 8.352-33.642 21.119-44.839 8.85 3.539 18.492 5.506 28.59 5.506h36.69c-14.184 23.545-39.992 39.333-69.425 39.333zm222.725-164.319c-6.259 26.855-21.778 51.094-43.701 68.278-35.45-.878-64.024-29.967-64.024-65.625h-30c0 38.056 22.338 70.99 54.589 86.387-12.25 3.89-25.096 5.946-38.049 5.946h-68.805c-26.065 0-47.271-21.205-47.271-47.27v-47.005l-31.101-21.137-.17-39.025c4.878-4.152 13.92-11.102 26.818-17.975 26.879-14.325 56.931-21.588 89.32-21.588 40.684 0 79.615 13.196 115.715 39.222 20.343 14.666 34.059 29.539 39.846 36.32-.321 7.944-1.384 15.818-3.167 23.472z" fill="#0051b1"/><path d="m512 237.97v.036c.32.396.341.419 0-.036z" fill="#0051b1"/><path d="m405.333 243.97h30v30h-30z" fill="#0051b1"/></svg>',
            'carp': '<svg xmlns="http://www.w3.org/2000/svg" height="300" viewBox="-22 0 464 464" width="300" style="width: 24px; height: 24px;"><path d="m0 120c0 22.585938 20.03125 23.953125 24.046875 24l9.089844.105469-1.214844 9.015625c-1.058594 7.527344-1.738281 29.4375 7.621094 40.191406 3.914062 4.496094 9.296875 6.6875 16.457031 6.6875 17.167969 0 22.390625-10.121094 29.503906-26.632812 4.25-9.847657 9.007813-20.792969 18.742188-26.527344-.054688-3.425782-.230469-6.726563-.230469-10.214844-18.503906 2.773438-35.382813 13.902344-35.574219 14.03125l-8.875-13.3125c.960938-.640625 21.738282-14.28125 45.035156-16.878906.039063-.585938.023438-1.234375.070313-1.800782-9.609375-1.734374-30.175781-4.375-46.128906.929688l-5.0625-15.167969c18.847656-6.296875 41.457031-3.722656 52.96875-1.707031.933593-6.34375 2.101562-12.292969 3.4375-17.886719-7.039063-2.097656-19.6875-4.824219-37.871094-4.824219-30.078125-.007812-72.015625 15.214844-72.015625 39.992188zm0 0" fill="#0051b1"/><path d="m120 312c0 17.648438 14.351562 32 32 32 2.304688 0 4.59375-.320312 6.847656-.855469-11.785156-15.609375-21.664062-33.433593-29.65625-53.425781-5.792968 5.898438-9.191406 13.855469-9.191406 22.28125zm0 0" fill="#0051b1"/><path d="m330.527344 104.414062-5.0625 15.171876c-15.953125-5.304688-36.511719-2.664063-46.128906-.929688.039062.574219.03125 1.222656.070312 1.808594 23.296875 2.597656 44.066406 16.238281 45.035156 16.878906l-8.867187 13.320312c-.191407-.128906-17.140625-11.238281-35.574219-14.03125 0 3.542969-.03125 6.984376-.089844 10.3125 9.632813 5.765626 14.378906 16.628907 18.59375 26.421876 7.113282 16.511718 12.335938 26.632812 29.503906 26.632812 7.167969 0 12.558594-2.191406 16.480469-6.710938 9.398438-10.832031 8.671875-32.664062 7.601563-40.160156l-1.304688-9.136718h9.214844c3.96875-.046876 24-1.417969 24-24 0-24.785157-41.9375-40-72-40-18.175781 0-30.832031 2.726562-37.871094 4.824218 1.335938 5.589844 2.496094 11.542969 3.4375 17.886719 11.511719-2 34.128906-4.574219 52.960938 1.710937zm0 0" fill="#0051b1"/><path d="m240 312c0-29.183594 4.910156-47.511719 10.113281-66.921875 2.949219-11.03125 6.078125-22.765625 8.621094-37.605469-15.132813-2.535156-26.734375-15.625-26.734375-31.472656h16c0 7.800781 5.625 14.296875 13.015625 15.695312 1.808594-15.007812 2.984375-32.992187 2.984375-55.695312 0-.070312-.007812-.128906-.007812-.199219-6.703126 5.070313-14.960938 8.199219-23.992188 8.199219-22.054688 0-40-17.945312-40-40h16c0 13.230469 10.769531 24 24 24 10.449219 0 19.265625-6.753906 22.550781-16.089844-3.71875-33.207031-14.382812-55.628906-22-71.324218-1.519531-3.128907-2.839843-5.921876-4.03125-8.585938h-20.519531v-16h16c0-8.824219-7.175781-16-16-16h-48c-8.824219 0-16 7.175781-16 16h16v16h-20.519531c-1.199219 2.664062-2.519531 5.464844-4.03125 8.585938-7.617188 15.6875-18.28125 38.117187-22 71.324218 3.285156 9.335938 12.101562 16.089844 22.550781 16.089844 13.230469 0 24-10.769531 24-24h16c0 22.054688-17.945312 40-40 40-9.039062 0-17.289062-3.128906-23.992188-8.199219 0 .070313-.007812.128907-.007812.199219 0 19.703125.953125 38.207031 2.6875 55.726562 7.535156-1.277343 13.3125-7.824218 13.3125-15.726562h16c0 16.113281-12 29.34375-27.511719 31.542969 13.464844 100.175781 57.671875 162.136719 134.070313 188.074219-7.3125-19.921876-18.558594-55.210938-18.558594-83.617188zm-16-256h16v16h-16zm-64 16h-16v-16h16zm16 88c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32s-32-14.351562-32-32zm16 136c-17.648438 0-32-14.351562-32-32h16c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32zm1.015625-72h-2.03125c-3.550781 13.792969-16.105469 24-30.984375 24-17.648438 0-32-14.351562-32-32h16c0 8.824219 7.175781 16 16 16s16-7.175781 16-16v-8h32v8c0 8.824219 7.175781 16 16 16s16-7.175781 16-16h16c0 17.648438-14.351562 32-32 32-14.878906 0-27.433594-10.207031-30.984375-24zm0 0" fill="#0051b1"/><path d="m256 312c0 1.136719.089844 2.335938.128906 3.503906 9.640625-5.59375 15.871094-15.855468 15.871094-27.503906 0-9.007812-3.910156-17.457031-10.390625-23.414062-3.25 13.605468-5.609375 27.726562-5.609375 47.414062zm0 0" fill="#0051b1"/><path d="m286.425781 425.734375 16.773438-1.695313c.746093-.070312 70.792969-7.589843 116.617187-47.597656-9.089844-6.410156-27.222656-16.441406-51.816406-16.441406-13.183594 0-23.59375 3.902344-34.609375 8.039062-17.039063 6.394532-36.054687 13.503907-65.695313 4.703126 1.625 5.128906 3.234376 9.832031 4.730469 14.042968 9.367188 3.285156 30.894531 8.621094 52-1.9375l7.160157 14.3125c-11.96875 5.984375-23.867188 7.976563-34.410157 7.976563-6.527343 0-12.449219-.800781-17.640625-1.855469l6.265625 14.621094-15.832031-4.167969c-10.039062-2.636719-19.472656-6.015625-28.609375-9.734375 1.976563 8.726562 6.863281 19.199219 19.089844 27.34375l-8.875 13.3125c-16.679688-11.121094-25.765625-27.449219-27.253907-48.488281-8.433593-4.351563-16.488281-9.152344-24.039062-14.542969 1.222656 15.789062 5.878906 40.757812 22.382812 58.535156 13.464844 14.496094 32.761719 21.839844 57.351563 21.839844 21.894531 0 38.457031-5.382812 49.550781-10.792969-10.550781-2.429687-22.65625-7-31.207031-15.550781zm0 0" fill="#0051b1"/></svg>'
        };
        
        return fishIcons[fishType?.toLowerCase()] || fishIcons['tilapia']; // Default to tilapia if type not found
    }

    async updateCurrentFishCount() {
        const tankSelect = document.getElementById('fish-tank');
        const fishCountInput = document.getElementById('fish-count');
        
        if (!tankSelect || !fishCountInput || !this.activeSystemId) return;
        
        const selectedTankId = parseInt(tankSelect.value);
        if (!selectedTankId) {
            fishCountInput.value = '';
            return;
        }

        try {
            // Get all fish health data for this system, then filter by tank
            const response = await this.makeApiCall(`/data/entries/fish-health?system_id=${this.activeSystemId}&limit=50`);
            const entries = response || [];
            
            // Find the latest entry for the selected tank
            const tankEntries = entries.filter(entry => entry.fish_tank_id === selectedTankId);
            const latestTankEntry = tankEntries.length > 0 ? tankEntries[0] : null;
            const currentCount = latestTankEntry ? latestTankEntry.count || 0 : 0;
            
            fishCountInput.value = currentCount;
            console.log(`Tank ${selectedTankId} current fish count: ${currentCount}`);
        } catch (error) {
            console.error('Error fetching current fish count:', error);
            fishCountInput.value = 0;
        }
    }

    generateTankOptions() {
        const systemData = this.getActiveSystem();
        
        if (!systemData?.fish_tanks) {
            // Generate options based on system configuration
            const tankCount = systemData?.fish_tank_count || 1;
            const tankVolume = systemData?.total_fish_volume || 1000;
            const volumePerTank = Math.floor(tankVolume / tankCount);
            
            let options = '';
            for (let i = 1; i <= tankCount; i++) {
                options += `<option value="${i}">Tank ${i} (${(volumePerTank / 1000).toFixed(1)}m³)</option>`;
            }
            return options || '<option value="1">Tank 1 (1.0m³)</option>';
        }

        return systemData.fish_tanks.map(tank => 
            `<option value="${tank.id}">Tank ${tank.tank_number} (${(tank.volume_liters / 1000).toFixed(1)}m³)</option>`
        ).join('');
    }

    async loadFishHealthHistory() {
        try {
            const response = await this.makeApiCall(`/data/entries/fish-health?system_id=${this.activeSystemId}`);
            const entries = response || [];
            
            const container = document.getElementById('fish-health-history');
            if (!container) return;

            if (entries.length === 0) {
                container.innerHTML = '<p class="no-data">No fish health data recorded yet.</p>';
                return;
            }

            const html = entries.slice(0, 10).map(entry => `
                <div class="data-entry-item">
                    <div class="entry-header">
                        <span class="entry-date">${this.formatDateDDMMYYYY(entry.entry_date)}</span>
                        <span class="entry-tank">Tank ${entry.tank_number || 'N/A'}</span>
                    </div>
                    <div class="entry-details">
                        <div class="detail-row">
                            <span><strong>Count:</strong> ${entry.count || 'N/A'}</span>
                            <span><strong>Mortality:</strong> ${entry.mortality || '0'}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Avg Weight:</strong> ${entry.average_weight || 'N/A'}g</span>
                            <span><strong>Behavior:</strong> ${entry.behavior || 'Normal'}</span>
                        </div>
                        ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ''}
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load fish health history:', error);
            const container = document.getElementById('fish-health-history');
            if (container) {
                container.innerHTML = '<p class="no-data">Fish health history will show here once you start recording data. API endpoint not yet available.</p>';
            }
        }
    }

    loadTankInformation() {
        console.log('Loading tank information...');
        const container = document.querySelector('#tank-information-content .tank-info-grid');
        if (!container) return;

        // Generate tank cards with detailed information
        this.displayTankCards(container);
    }

    async displayTankCards(container) {
        try {
            // Get system data and recent fish health entries
            const systemData = this.getActiveSystem();
            console.log('System data:', systemData);
            
            // Use .catch() to gracefully handle API endpoints that don't exist yet
            const fishHealthData = await this.makeApiCall(`/data/entries/fish-health?system_id=${this.activeSystemId}&limit=50`).catch((error) => {
                console.log('Fish health API not available, using empty data:', error.message);
                return [];
            });
            const waterQualityData = await this.makeApiCall(`/data/entries/water-quality?system_id=${this.activeSystemId}&limit=10`).catch((error) => {
                console.log('Water quality API not available, using default temperature:', error.message);
                return [];
            });
            
            if (!systemData) {
                container.innerHTML = '<p class="no-data">No system data available. Please configure your system in Settings.</p>';
                return;
            }

            if (!systemData.fish_tanks || systemData.fish_tanks.length === 0) {
                // Create mock tanks based on system configuration
                const tankCount = systemData.fish_tank_count || 1;
                const tankVolume = systemData.total_fish_volume || 1000;
                const volumePerTank = Math.floor(tankVolume / tankCount);
                
                const mockTanks = [];
                for (let i = 1; i <= tankCount; i++) {
                    mockTanks.push({
                        id: i,
                        tank_number: i,
                        volume: volumePerTank
                    });
                }
                // Ensure systemData exists before setting fish_tanks
                if (!systemData.fish_tanks) {
                    systemData.fish_tanks = [];
                }
                systemData.fish_tanks = mockTanks;
                console.log('Created mock tanks:', mockTanks);
            }

            const currentTemp = this.getCurrentWaterTemperature(waterQualityData);

            // Calculate overall system density in kg/m³
            const totalSystemVolume = systemData.total_fish_volume || 1000; // in liters
            const totalSystemVolumeM3 = totalSystemVolume / 1000; // convert to cubic meters
            let totalSystemFishWeight = 0;
            
            // Calculate total fish weight across all tanks
            systemData.fish_tanks.forEach(tank => {
                const recentHealthData = fishHealthData.filter(entry => entry.fish_tank_id === tank.tank_number).slice(0, 5);
                
                // Find the most recent record with valid weight data
                const latestHealthWithWeight = recentHealthData.find(record => 
                    record.average_weight !== null && record.average_weight > 0
                );
                const latestHealth = latestHealthWithWeight || recentHealthData[0];
                
                const fishCount = latestHealth?.count || 0;
                const avgWeight = latestHealth?.average_weight || 50; // default 50g
                totalSystemFishWeight += (fishCount * avgWeight); // in grams
            });
            
            const totalSystemFishWeightKg = totalSystemFishWeight / 1000; // convert to kg
            const systemDensityKgM3 = totalSystemVolumeM3 > 0 ? (totalSystemFishWeightKg / totalSystemVolumeM3).toFixed(1) : '0.0';

            const tankCards = systemData.fish_tanks.map(tank => {
                const recentHealthData = fishHealthData.filter(entry => entry.fish_tank_id === tank.tank_number).slice(0, 5);
                
                // Find the most recent record with valid weight data, similar to Overview tab fix
                const latestHealthWithWeight = recentHealthData.find(record => 
                    record.average_weight !== null && record.average_weight > 0
                );
                const latestHealth = latestHealthWithWeight || recentHealthData[0];
                
                // Get fish count for this tank
                const fishCount = latestHealth?.count || 0;
                
                // Calculate feeding amount (2-3% of total fish weight per day)
                const avgWeight = latestHealth?.average_weight || 50; // default 50g
                const totalFishWeight = fishCount * avgWeight;
                const dailyFeedAmount = (totalFishWeight * 0.025).toFixed(0); // 2.5% of body weight
                
                // Calculate tank-specific density (kg/m³)
                const tankVolumeM3 = tank.volume_liters / 1000; // Convert liters to cubic meters
                const tankBiomassKg = (fishCount * avgWeight) / 1000; // Convert grams to kg
                const tankDensity = tankVolumeM3 > 0 && tankBiomassKg > 0 ? (tankBiomassKg / tankVolumeM3).toFixed(1) : '0.0';
                
                return `
                    <div class="tank-card">
                        <div class="tank-header">
                            <div class="tank-icon" style="background: none; background-color: transparent;">${this.getFishSvgIcon(systemData.fish_type)}</div>
                            <div>
                                <h3>Tank ${tank.tank_number}</h3>
                                <p style="margin: 0; color: #666; font-size: 0.9em;">${(tank.volume_liters / 1000).toFixed(1)}m³ capacity</p>
                            </div>
                        </div>
                        
                        <div class="tank-stats">
                            <div class="tank-stat">
                                <div class="tank-stat-label">Fish Count</div>
                                <div class="tank-stat-value">${fishCount}</div>
                            </div>
                            <div class="tank-stat">
                                <div class="tank-stat-label">Actual Density</div>
                                <div class="tank-stat-value">${tankDensity} kg/m³</div>
                            </div>
                            <div class="tank-stat">
                                <div class="tank-stat-label">Fish Type</div>
                                <div class="tank-stat-value">${systemData.fish_type ? systemData.fish_type.charAt(0).toUpperCase() + systemData.fish_type.slice(1) : 'Not set'}</div>
                            </div>
                            <div class="tank-stat">
                                <div class="tank-stat-label">Avg Weight</div>
                                <div class="tank-stat-value">${avgWeight}g</div>
                            </div>
                        </div>
                        
                        <div class="feeding-schedule">
                            <h4>🍽️ Feeding Schedule</h4>
                            <p><strong>Daily Amount:</strong> ${dailyFeedAmount}g</p>
                            <p><strong>Frequency:</strong> 2-3 times per day</p>
                            <p><strong>Per Feeding:</strong> ${Math.round(dailyFeedAmount / 2.5)}g</p>
                        </div>
                        
                        <div class="growth-chart-container">
                            <div class="growth-chart-header">
                                <h4>📈 Growth Projection</h4>
                                <div class="temp-indicator">${currentTemp}°C</div>
                            </div>
                            <div class="growth-chart" id="growth-chart-${tank.id}">
                                Growth chart based on ${currentTemp}°C water temperature
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = tankCards;

            // Initialize growth charts
            systemData.fish_tanks.forEach(tank => {
                this.initializeGrowthChart(tank.id, currentTemp, fishHealthData.filter(entry => entry.fish_tank_id === tank.tank_number));
            });

        } catch (error) {
            console.error('Failed to load tank information:', error);
            container.innerHTML = '<p class="no-data">Unable to load tank information.</p>';
        }
    }

    getCurrentWaterTemperature(waterQualityData) {
        const recentEntry = waterQualityData.find(entry => entry.temperature);
        return recentEntry?.temperature || 25; // Default to 25°C
    }

    initializeGrowthChart(tankId, temperature, healthData) {
        const chartElement = document.getElementById(`growth-chart-${tankId}`);
        if (!chartElement) return;

        // Simple growth projection based on temperature
        const tempFactor = Math.max(0.5, Math.min(1.5, (temperature - 15) / 15)); // Optimal around 25-30°C
        const growthRate = tempFactor * 2; // grams per week base rate

        chartElement.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p style="margin: 10px 0; color: #2c3e50;">
                    <strong>Expected Weekly Growth:</strong> ${growthRate.toFixed(1)}g/week
                </p>
                <p style="margin: 10px 0; color: #7f8c8d; font-size: 0.9em;">
                    Growth rate varies with temperature, feeding, and water quality
                </p>
                <div style="background: #ecf0f1; border-radius: 4px; padding: 10px; margin-top: 10px;">
                    <strong>Temperature Impact:</strong> ${temperature < 20 ? 'Slow growth' : temperature > 30 ? 'Stress conditions' : 'Optimal range'}
                </div>
            </div>
        `;
    }

    loadFishHealthMonitoring() {
        console.log('Loading fish health monitoring dashboard...');
        const container = document.querySelector('#fish-health-monitoring-content .fish-health-dashboard');
        if (!container) return;

        this.displayFishHealthDashboard(container);
    }

    async displayFishHealthDashboard(container) {
        try {
            const fishHealthData = await this.makeApiCall(`/data-entries/fish-health?system_id=${this.activeSystemId}&limit=100`).catch((error) => {
                console.log('Fish health API not available for dashboard:', error.message);
                return [];
            });
            const waterQualityData = await this.makeApiCall(`/data-entries/water-quality?system_id=${this.activeSystemId}&limit=50`).catch((error) => {
                console.log('Water quality API not available for dashboard:', error.message);
                return [];
            });

            // Calculate health metrics
            const totalFish = fishHealthData.reduce((sum, entry) => sum + (entry.count || 0), 0);
            const totalMortality = fishHealthData.reduce((sum, entry) => sum + (entry.mortality || 0), 0);
            const mortalityRate = totalFish > 0 ? ((totalMortality / totalFish) * 100).toFixed(1) : 0;
            
            const recentEntries = fishHealthData.slice(0, 10);
            const avgWeight = recentEntries.reduce((sum, entry) => sum + (entry.average_weight || 0), 0) / Math.max(recentEntries.length, 1);
            
            const behaviorCounts = fishHealthData.reduce((counts, entry) => {
                const behavior = entry.behavior || 'normal';
                counts[behavior] = (counts[behavior] || 0) + 1;
                return counts;
            }, {});
            
            const normalBehaviorPercentage = behaviorCounts.normal ? 
                ((behaviorCounts.normal / fishHealthData.length) * 100).toFixed(1) : 0;

            // Get latest water quality
            const latestWaterQuality = waterQualityData[0];
            const tempStatus = this.getTemperatureStatus(latestWaterQuality?.temperature);
            const phStatus = this.getPHStatus(latestWaterQuality?.ph);

            const dashboardHtml = `
                <div class="health-overview">
                    <h3>🐟 Fish Health Overview</h3>
                    <div class="health-metrics">
                        <div class="health-metric">
                            <div class="health-metric-label">Total Fish</div>
                            <div class="health-metric-value good">${totalFish}</div>
                            <div class="health-metric-status good">Active</div>
                        </div>
                        <div class="health-metric">
                            <div class="health-metric-label">Mortality Rate</div>
                            <div class="health-metric-value ${mortalityRate > 5 ? 'danger' : mortalityRate > 2 ? 'warning' : 'good'}">${mortalityRate}%</div>
                            <div class="health-metric-status ${mortalityRate > 5 ? 'danger' : mortalityRate > 2 ? 'warning' : 'good'}">
                                ${mortalityRate > 5 ? 'High' : mortalityRate > 2 ? 'Moderate' : 'Low'}
                            </div>
                        </div>
                        <div class="health-metric">
                            <div class="health-metric-label">Avg Weight</div>
                            <div class="health-metric-value good">${avgWeight.toFixed(1)}g</div>
                            <div class="health-metric-status good">Growing</div>
                        </div>
                        <div class="health-metric">
                            <div class="health-metric-label">Normal Behavior</div>
                            <div class="health-metric-value ${normalBehaviorPercentage > 80 ? 'good' : normalBehaviorPercentage > 60 ? 'warning' : 'danger'}">${normalBehaviorPercentage}%</div>
                            <div class="health-metric-status ${normalBehaviorPercentage > 80 ? 'good' : normalBehaviorPercentage > 60 ? 'warning' : 'danger'}">
                                ${normalBehaviorPercentage > 80 ? 'Excellent' : normalBehaviorPercentage > 60 ? 'Good' : 'Concerning'}
                            </div>
                        </div>
                        <div class="health-metric">
                            <div class="health-metric-label">Water Temp</div>
                            <div class="health-metric-value ${tempStatus.class}">${latestWaterQuality?.temperature || 'N/A'}°C</div>
                            <div class="health-metric-status ${tempStatus.class}">${tempStatus.status}</div>
                        </div>
                        <div class="health-metric">
                            <div class="health-metric-label">pH Level</div>
                            <div class="health-metric-value ${phStatus.class}">${latestWaterQuality?.ph || 'N/A'}</div>
                            <div class="health-metric-status ${phStatus.class}">${phStatus.status}</div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = dashboardHtml;

        } catch (error) {
            console.error('Failed to load fish health dashboard:', error);
            container.innerHTML = '<p class="no-data">Unable to load fish health data.</p>';
        }
    }

    getTemperatureStatus(temperature) {
        if (!temperature) return { class: 'warning', status: 'No Data' };
        if (temperature < 18) return { class: 'danger', status: 'Too Cold' };
        if (temperature > 32) return { class: 'danger', status: 'Too Hot' };
        if (temperature < 22 || temperature > 28) return { class: 'warning', status: 'Suboptimal' };
        return { class: 'good', status: 'Optimal' };
    }

    getPHStatus(ph) {
        if (!ph) return { class: 'warning', status: 'No Data' };
        if (ph < 6.0 || ph > 8.5) return { class: 'danger', status: 'Critical' };
        if (ph < 6.5 || ph > 8.0) return { class: 'warning', status: 'Suboptimal' };
        return { class: 'good', status: 'Optimal' };
    }

    async submitFishHealthData() {
        if (!this.activeSystemId) {
            this.showNotification('❌ No active system selected', 'error');
            return;
        }

        // Get current values and calculate new fish count
        const newFishAdded = parseInt(document.getElementById('new-fish-added').value) || 0;
        const newMortalities = parseInt(document.getElementById('fish-mortality').value) || 0;
        const currentCount = parseInt(document.getElementById('fish-count').value) || 0;
        
        // Calculate updated fish count (current + new additions - mortalities)
        const updatedCount = Math.max(0, currentCount + newFishAdded - newMortalities);
        
        console.log(`Fish count calculation: ${currentCount} + ${newFishAdded} - ${newMortalities} = ${updatedCount}`);

        const formData = {
            system_id: this.activeSystemId,
            fish_tank_id: parseInt(document.getElementById('fish-tank').value),
            count: updatedCount,
            mortality: newMortalities,
            average_weight: parseFloat(document.getElementById('average-weight').value) || null,
            feed_consumption: parseFloat(document.getElementById('feed-consumption').value) || null,
            behavior: document.getElementById('fish-behavior').value,
            notes: document.getElementById('fish-notes').value.trim() || null,
            date: document.getElementById('fish-entry-date').value
        };

        try {
            await this.makeApiCall('/data/entries/fish-health', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.showNotification('✅ Fish health data recorded successfully!', 'success');
            
            // Reset form but keep the tank selection
            const selectedTank = document.getElementById('fish-tank').value;
            document.getElementById('fish-health-entry-form').reset();
            document.getElementById('fish-entry-date').value = new Date().toISOString().slice(0, 16);
            document.getElementById('fish-tank').value = selectedTank;
            
            // Update the current fish count to reflect the new total
            setTimeout(() => {
                this.updateCurrentFishCount();
            }, 100);
            
            // Reload fish health history
            this.loadFishHealthHistory();
            
            // Refresh tank information if that tab is active
            const tankInfoContent = document.getElementById('tank-information-content');
            if (tankInfoContent && tankInfoContent.classList.contains('active')) {
                this.loadTankInformation();
            }
            
            // Refresh fish health monitoring if that tab is active
            const healthMonitoringContent = document.getElementById('fish-health-monitoring-content');
            if (healthMonitoringContent && healthMonitoringContent.classList.contains('active')) {
                this.loadFishHealthMonitoring();
            }

        } catch (error) {
            console.error('Failed to submit fish health data:', error);
            this.showNotification('❌ Failed to record fish health data. Please try again.', 'error');
        }
    }

    // System Sharing Methods
    loadSystemSharing() {
        console.log('Loading system sharing...');
        this.setupSystemSharingEventListeners();
        this.loadSharedUsers();
        this.loadPendingInvitations();
        this.loadPublicAccessSettings();
    }

    setupSystemSharingEventListeners() {
        // Invite user form
        const inviteForm = document.getElementById('invite-user-form');
        if (inviteForm) {
            inviteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.sendInvitation();
            });
        }

        // Public access toggle
        const publicViewToggle = document.getElementById('allow-public-view');
        if (publicViewToggle) {
            publicViewToggle.addEventListener('change', (e) => {
                this.togglePublicAccess(e.target.checked);
            });
        }

        // Copy public link
        const copyLinkBtn = document.getElementById('copy-public-link');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                this.copyPublicLink();
            });
        }
    }

    async sendInvitation() {
        const email = document.getElementById('invite-email').value.trim();
        const permission = document.getElementById('invite-permission').value;
        const message = document.getElementById('invite-message').value.trim();

        if (!email || !permission) {
            this.showNotification('❌ Please fill in all required fields', 'error');
            return;
        }

        if (!this.activeSystemId) {
            this.showNotification('❌ No active system selected', 'error');
            return;
        }

        try {
            const invitationData = {
                system_id: this.activeSystemId,
                email: email,
                permission_level: permission,
                message: message || null,
                invited_by: this.user?.email || 'Unknown'
            };

            await this.makeApiCall('/system-sharing/invite', {
                method: 'POST',
                body: JSON.stringify(invitationData)
            });

            this.showNotification('✅ Invitation sent successfully!', 'success');
            
            // Clear form
            document.getElementById('invite-user-form').reset();
            
            // Reload pending invitations
            this.loadPendingInvitations();

        } catch (error) {
            console.error('Failed to send invitation:', error);
            if (error.message.includes('already has access')) {
                this.showNotification('⚠️ User already has access to this system', 'warning');
            } else {
                this.showNotification('❌ Failed to send invitation. Please try again.', 'error');
            }
        }
    }

    async loadSharedUsers() {
        try {
            const response = await this.makeApiCall(`/system-sharing/users?system_id=${this.activeSystemId}`).catch(() => ({ shares: [] }));
            const sharedUsers = response.shares || response || []; // Handle both response formats
            
            const container = document.getElementById('shared-users-list');
            if (!container) return;

            if (sharedUsers.length === 0) {
                container.innerHTML = '<div class="no-data-message">No users currently have access to this system.</div>';
                return;
            }

            const html = sharedUsers.map(user => {
                const userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
                const initials = this.getUserInitials(userName || user.email);
                const isCurrentUser = user.email === this.user?.email;
                
                return `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-avatar">${initials}</div>
                            <div class="user-details">
                                <div class="user-name">${userName || 'Unknown User'} ${isCurrentUser ? '(You)' : ''}</div>
                                <div class="user-email">${user.email}</div>
                            </div>
                            <span class="user-role ${user.permission_level}">${user.permission_level}</span>
                        </div>
                        <div class="user-actions">
                            ${!isCurrentUser ? `
                                <button class="action-btn edit-btn" onclick="app.editUserPermission('${user.id}', '${user.permission_level}')">
                                    Edit
                                </button>
                                <button class="action-btn remove-btn" onclick="app.removeUserAccess('${user.id}', '${user.email}')">
                                    Remove
                                </button>
                            ` : '<span style="color: #666; font-size: 0.9rem;">System Owner</span>'}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('Failed to load shared users:', error);
            const container = document.getElementById('shared-users-list');
            if (container) {
                container.innerHTML = '<div class="no-data-message">Unable to load shared users.</div>';
            }
        }
    }

    async loadPendingInvitations() {
        try {
            const response = await this.makeApiCall(`/system-sharing/invitations?system_id=${this.activeSystemId}`).catch(() => ({ invitations: [] }));
            const pendingInvitations = response.invitations || response || []; // Handle both response formats
            
            const container = document.getElementById('pending-invitations-list');
            if (!container) return;

            if (pendingInvitations.length === 0) {
                container.innerHTML = '<div class="no-data-message">No pending invitations.</div>';
                return;
            }

            const html = pendingInvitations.map(invitation => {
                const initials = this.getUserInitials(invitation.email);
                const sentDate = new Date(invitation.created_at).toLocaleDateString();
                
                return `
                    <div class="invitation-item">
                        <div class="invitation-info">
                            <div class="user-avatar">${initials}</div>
                            <div class="invitation-details">
                                <div class="invitation-email">${invitation.email}</div>
                                <div style="color: #666; font-size: 0.8rem;">Sent on ${sentDate}</div>
                            </div>
                            <span class="invitation-role ${invitation.permission_level}">${invitation.permission_level}</span>
                        </div>
                        <div class="invitation-actions">
                            <button class="action-btn resend-btn" onclick="app.resendInvitation('${invitation.id}')">
                                Resend
                            </button>
                            <button class="action-btn cancel-btn" onclick="app.cancelInvitation('${invitation.id}')">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('Failed to load pending invitations:', error);
            const container = document.getElementById('pending-invitations-list');
            if (container) {
                container.innerHTML = '<div class="no-data-message">Unable to load pending invitations.</div>';
            }
        }
    }

    async loadPublicAccessSettings() {
        try {
            const settings = await this.makeApiCall(`/system-sharing/public-settings?system_id=${this.activeSystemId}`).catch(() => ({ public_access: false, public_link: null }));
            
            const publicToggle = document.getElementById('allow-public-view');
            const publicLinkSection = document.getElementById('public-link-section');
            const publicLinkInput = document.getElementById('public-link');

            if (publicToggle) {
                publicToggle.checked = settings.public_access || false;
            }

            if (publicLinkSection && publicLinkInput) {
                if (settings.public_access && settings.public_link) {
                    publicLinkSection.style.display = 'block';
                    publicLinkInput.value = settings.public_link;
                } else {
                    publicLinkSection.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Failed to load public access settings:', error);
        }
    }

    async togglePublicAccess(enabled) {
        try {
            const result = await this.makeApiCall('/system-sharing/public-access', {
                method: 'PUT',
                body: JSON.stringify({
                    system_id: this.activeSystemId,
                    public_access: enabled
                })
            });

            const publicLinkSection = document.getElementById('public-link-section');
            const publicLinkInput = document.getElementById('public-link');

            if (enabled && result.public_link) {
                publicLinkSection.style.display = 'block';
                publicLinkInput.value = result.public_link;
                this.showNotification('✅ Public access enabled! Link generated.', 'success');
            } else {
                publicLinkSection.style.display = 'none';
                this.showNotification('✅ Public access disabled.', 'success');
            }

        } catch (error) {
            console.error('Failed to toggle public access:', error);
            this.showNotification('❌ Failed to update public access settings.', 'error');
            
            // Revert checkbox state
            const publicToggle = document.getElementById('allow-public-view');
            if (publicToggle) {
                publicToggle.checked = !enabled;
            }
        }
    }

    copyPublicLink() {
        const publicLinkInput = document.getElementById('public-link');
        if (publicLinkInput && publicLinkInput.value) {
            navigator.clipboard.writeText(publicLinkInput.value).then(() => {
                this.showNotification('📋 Public link copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                publicLinkInput.select();
                document.execCommand('copy');
                this.showNotification('📋 Public link copied to clipboard!', 'success');
            });
        }
    }

    async editUserPermission(userId, currentPermission) {
        const newPermission = prompt(`Change permission level for this user:\n\nCurrent: ${currentPermission}\n\nEnter new permission (viewer/collaborator/admin):`, currentPermission);
        
        if (!newPermission || newPermission === currentPermission) {
            return;
        }

        if (!['viewer', 'collaborator', 'admin'].includes(newPermission.toLowerCase())) {
            this.showNotification('❌ Invalid permission level. Use: viewer, collaborator, or admin', 'error');
            return;
        }

        try {
            await this.makeApiCall('/system-sharing/permission', {
                method: 'PUT',
                body: JSON.stringify({
                    user_id: userId,
                    system_id: this.activeSystemId,
                    permission_level: newPermission.toLowerCase()
                })
            });

            this.showNotification('✅ User permission updated successfully!', 'success');
            this.loadSharedUsers();

        } catch (error) {
            console.error('Failed to update user permission:', error);
            this.showNotification('❌ Failed to update user permission.', 'error');
        }
    }

    async removeUserAccess(shareId, userEmail) {
        if (!confirm(`Are you sure you want to remove access for ${userEmail}?\n\nThey will no longer be able to view or edit this system.`)) {
            return;
        }

        try {
            await this.makeApiCall(`/system-sharing/access/${shareId}`, {
                method: 'DELETE'
            });

            this.showNotification('✅ User access removed successfully!', 'success');
            this.loadSharedUsers();

        } catch (error) {
            console.error('Failed to remove user access:', error);
            this.showNotification('❌ Failed to remove user access.', 'error');
        }
    }

    async resendInvitation(invitationId) {
        try {
            await this.makeApiCall(`/system-sharing/invitation/${invitationId}/resend`, {
                method: 'POST'
            });

            this.showNotification('✅ Invitation resent successfully!', 'success');
            this.loadPendingInvitations();

        } catch (error) {
            console.error('Failed to resend invitation:', error);
            this.showNotification('❌ Failed to resend invitation.', 'error');
        }
    }

    async cancelInvitation(invitationId) {
        if (!confirm('Are you sure you want to cancel this invitation?')) {
            return;
        }

        try {
            await this.makeApiCall(`/system-sharing/invitation/${invitationId}`, {
                method: 'DELETE'
            });

            this.showNotification('✅ Invitation cancelled successfully!', 'success');
            this.loadPendingInvitations();

        } catch (error) {
            console.error('Failed to cancel invitation:', error);
            this.showNotification('❌ Failed to cancel invitation.', 'error');
        }
    }

    getUserInitials(name) {
        if (!name) return '?';
        
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        } else {
            return name.substring(0, 2).toUpperCase();
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
    
    // Set up add spray programme form event listeners
    const addSprayForm = document.getElementById('add-spray-form');
    if (addSprayForm) {
        addSprayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await app.saveNewSprayProgramme();
        });
    }
    
    // Close modal on Escape key for add spray modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const addSprayModal = document.getElementById('add-spray-modal');
            if (addSprayModal && addSprayModal.style.display === 'flex') {
                app.closeAddSprayModal();
            }
        }
    });
    
    // Close modal when clicking outside
    const addSprayModal = document.getElementById('add-spray-modal');
    if (addSprayModal) {
        addSprayModal.addEventListener('click', (e) => {
            if (e.target === addSprayModal) {
                app.closeAddSprayModal();
            }
        });
    }
});


// Grow bed management functionality
class GrowBedManager {
    constructor() {
        this.growBedTypes = {
            'dwc': {
                name: 'Deep Water Culture',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'flood-drain': {
                name: 'Flood & Drain',
                fields: ['length', 'width', 'height'],
                calculation: 'media'
            },
            'media-flow': {
                name: 'Media Flow Through',
                fields: ['length', 'width', 'height'],
                calculation: 'lwh'
            },
            'vertical': {
                name: 'Vertical Growing',
                fields: ['base_length', 'base_width', 'base_height', 'vertical_count', 'plants_per_vertical'],
                calculation: 'vertical'
            },
            'nft': {
                name: 'NFT (Nutrient Film Technique)',
                fields: ['trough_length', 'trough_count', 'plant_spacing', 'reservoir_volume'],
                calculation: 'nft'
            }
        };
    }

    generateGrowBedConfiguration(bedCount) {
        const container = document.getElementById('grow-beds-container');
        if (!container) return;

        let html = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; color: #666; font-size: 0.9rem;">
                    <strong>⚠️ Important:</strong> Configure and save each grow bed before saving system configuration.
                    <br><strong>Volume (m³):</strong> Reservoir volume for nutrient solution
                    <br><strong>Area (m²):</strong> Equivalent growing area for plant calculations
                </p>
            </div>
        `;

        for (let i = 1; i <= bedCount; i++) {
            html += this.generateGrowBedItem(i);
        }

        container.innerHTML = html;
    }

    generateGrowBedItem(bedNumber) {
        return `
            <div class="grow-bed-item" data-bed="${bedNumber}" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h5 style="margin: 0; color: #2c3e50;">Grow Bed ${bedNumber}</h5>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="form-btn secondary" onclick="window.growBedManager.saveBedConfiguration(${bedNumber})" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Save Bed Config</button>
                        <button type="button" class="form-btn" onclick="window.growBedManager.deleteBedConfiguration(${bedNumber})" style="font-size: 0.8rem; padding: 0.3rem 0.6rem; background: #dc3545; border-color: #dc3545;">Delete Bed</button>
                    </div>
                </div>
                
                <div class="form-field">
                    <label>Bed Type:</label>
                    <select class="bed-type" onchange="window.growBedManager.updateBedFields(${bedNumber})">
                        <option value="">Select Type</option>
                        <option value="dwc">Deep Water Culture (DWC)</option>
                        <option value="flood-drain">Flood & Drain (F&D)</option>
                        <option value="media-flow">Media Flow Through (MFT)</option>
                        <option value="nft">NFT (Nutrient Film Technique)</option>
                        <option value="vertical">Vertical Growing</option>
                    </select>
                </div>

                <div id="bed-fields-${bedNumber}" class="bed-fields" style="display: none;">
                    <!-- Dynamic fields will be inserted here -->
                </div>

                <div class="calculation-results" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <strong>Reservoir Volume (m³):</strong>
                            <span class="calculated-volume">0.0</span>
                        </div>
                        <div>
                            <strong>Equivalent Grow Area (m²):</strong>
                            <span class="calculated-area">0.0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateBedFields(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const typeSelect = bedItem.querySelector('.bed-type');
        const fieldsContainer = bedItem.querySelector(`#bed-fields-${bedNumber}`);
        const resultsContainer = bedItem.querySelector('.calculation-results');
        
        const bedType = typeSelect.value;
        
        if (!bedType) {
            fieldsContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            return;
        }

        const typeConfig = this.growBedTypes[bedType];
        let html = '';

        if (bedType === 'dwc') {
            html = `
                <div class="form-grid">
                    <div class="form-field">
                        <label>Length (m):</label>
                        <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Width (m):</label>
                        <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Height/Depth (m):</label>
                        <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    DWC: Volume = L×W×H, Area = L×W
                </p>
            `;
        } else if (bedType === 'flood-drain') {
            html = `
                <div class="form-grid">
                    <div class="form-field">
                        <label>Length (m):</label>
                        <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Width (m):</label>
                        <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Height/Depth (m):</label>
                        <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    F&D: Volume = (L×W×H)/4 (media takes 75% space), Area = L×W
                </p>
            `;
        } else if (bedType === 'media-flow') {
            html = `
                <div class="form-grid">
                    <div class="form-field">
                        <label>Length (m):</label>
                        <input type="number" class="bed-length" min="0.1" step="0.1" placeholder="2.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Width (m):</label>
                        <input type="number" class="bed-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Height/Depth (m):</label>
                        <input type="number" class="bed-height" min="0.1" step="0.1" placeholder="0.3" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    MFT: Volume = L×W×H, Area = L×W
                </p>
            `;
        } else if (bedType === 'vertical') {
            html = `
                <div class="form-grid">
                    <div class="form-field">
                        <label>Base Length (m):</label>
                        <input type="number" class="base-length" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Base Width (m):</label>
                        <input type="number" class="base-width" min="0.1" step="0.1" placeholder="1.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Base Height (m):</label>
                        <input type="number" class="base-height" min="0.1" step="0.1" placeholder="0.5" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Number of Verticals:</label>
                        <input type="number" class="vertical-count" min="1" step="1" placeholder="4" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Plants per Vertical:</label>
                        <input type="number" class="plants-per-vertical" min="1" step="1" placeholder="12" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    Vertical: Volume = base L×W×H, Area = (verticals × plants per vertical) ÷ 25
                </p>
            `;
        } else if (bedType === 'nft') {
            html = `
                <div class="form-grid">
                    <div class="form-field">
                        <label>Trough Length (m):</label>
                        <input type="number" class="trough-length" min="0.1" step="0.1" placeholder="3.0" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Number of Troughs:</label>
                        <input type="number" class="trough-count" min="1" step="1" placeholder="4" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Plant Spacing (cm):</label>
                        <input type="number" class="plant-spacing" min="1" step="1" placeholder="15" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                    <div class="form-field">
                        <label>Reservoir Volume (L):</label>
                        <input type="number" class="reservoir-volume" min="1" step="1" placeholder="100" onchange="window.growBedManager.calculateBed(${bedNumber})">
                    </div>
                </div>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    NFT: Volume = manual reservoir volume, Area = (total plants) ÷ 25<br>
                    Total plants = (trough length ÷ plant spacing) × number of troughs
                </p>
            `;
        }

        fieldsContainer.innerHTML = html;
        fieldsContainer.style.display = 'block';
        resultsContainer.style.display = 'block';
        
        this.calculateBed(bedNumber);
    }

    calculateBed(bedNumber) {
        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const typeSelect = bedItem.querySelector('.bed-type');
        const volumeSpan = bedItem.querySelector('.calculated-volume');
        const areaSpan = bedItem.querySelector('.calculated-area');
        
        const bedType = typeSelect.value;
        if (!bedType) return;

        let volume = 0;
        let area = 0;

        if (bedType === 'dwc' || bedType === 'media-flow') {
            const length = parseFloat(bedItem.querySelector('.bed-length')?.value) || 0;
            const width = parseFloat(bedItem.querySelector('.bed-width')?.value) || 0;
            const height = parseFloat(bedItem.querySelector('.bed-height')?.value) || 0;
            
            if (length > 0 && width > 0 && height > 0) {
                volume = length * width * height;
                area = length * width;
            }
        } else if (bedType === 'flood-drain') {
            const length = parseFloat(bedItem.querySelector('.bed-length')?.value) || 0;
            const width = parseFloat(bedItem.querySelector('.bed-width')?.value) || 0;
            const height = parseFloat(bedItem.querySelector('.bed-height')?.value) || 0;
            
            if (length > 0 && width > 0 && height > 0) {
                volume = (length * width * height) / 4; // 25% volume for water, 75% for media
                area = length * width;
            }
        } else if (bedType === 'vertical') {
            const baseLength = parseFloat(bedItem.querySelector('.base-length')?.value) || 0;
            const baseWidth = parseFloat(bedItem.querySelector('.base-width')?.value) || 0;
            const baseHeight = parseFloat(bedItem.querySelector('.base-height')?.value) || 0;
            const verticalCount = parseFloat(bedItem.querySelector('.vertical-count')?.value) || 0;
            const plantsPerVertical = parseFloat(bedItem.querySelector('.plants-per-vertical')?.value) || 0;
            
            if (baseLength > 0 && baseWidth > 0 && baseHeight > 0) {
                volume = baseLength * baseWidth * baseHeight;
            }
            
            if (verticalCount > 0 && plantsPerVertical > 0) {
                const totalPlants = verticalCount * plantsPerVertical;
                area = totalPlants / 25; // 25 plants per m²
            }
        } else if (bedType === 'nft') {
            const troughLength = parseFloat(bedItem.querySelector('.trough-length')?.value) || 0;
            const troughCount = parseFloat(bedItem.querySelector('.trough-count')?.value) || 0;
            const plantSpacing = parseFloat(bedItem.querySelector('.plant-spacing')?.value) || 0;
            const reservoirVolume = parseFloat(bedItem.querySelector('.reservoir-volume')?.value) || 0;
            
            if (reservoirVolume > 0) {
                volume = reservoirVolume / 1000; // Convert liters to m³
            }
            
            if (troughLength > 0 && troughCount > 0 && plantSpacing > 0) {
                const plantsPerTrough = Math.floor((troughLength * 100) / plantSpacing); // Convert meters to cm for spacing calculation
                const totalPlants = plantsPerTrough * troughCount;
                area = totalPlants / 25; // 25 plants per m²
            }
        }

        volumeSpan.textContent = `${volume.toFixed(2)} m³`;
        areaSpan.textContent = `${area.toFixed(2)} m²`;
        
        this.updateTotalEquivalentArea();
    }

    updateTotalEquivalentArea() {
        const areaSpans = document.querySelectorAll('.calculated-area');
        let total = 0;

        areaSpans.forEach(span => {
            const value = parseFloat(span.textContent.replace(' m²', '')) || 0;
            total += value;
        });

        const totalInput = document.getElementById('total-grow-area');
        if (totalInput) {
            totalInput.value = total.toFixed(1);
        }
    }

    async saveBedConfiguration(bedNumber) {
        if (!window.app || !window.app.activeSystemId) {
            console.error('window.app not available or no active system');
            alert('❌ No active system selected');
            return;
        }

        const bedItem = document.querySelector(`[data-bed="${bedNumber}"]`);
        if (!bedItem) return;

        const bedType = bedItem.querySelector('.bed-type').value;
        if (!bedType) {
            window.app.showNotification('❌ Please select a bed type first', 'error');
            return;
        }

        const volume = parseFloat(bedItem.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
        const area = parseFloat(bedItem.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;

        console.log(`Saving bed ${bedNumber}: type=${bedType}, volume=${volume}, area=${area}`);

        // Check if required dimensions are filled based on bed type
        let isValid = false;
        let missingFields = [];

        if (bedType === 'dwc' || bedType === 'media-flow' || bedType === 'flood-drain') {
            const length = parseFloat(bedItem.querySelector('.bed-length')?.value) || 0;
            const width = parseFloat(bedItem.querySelector('.bed-width')?.value) || 0;
            const height = parseFloat(bedItem.querySelector('.bed-height')?.value) || 0;
            
            if (length <= 0) missingFields.push('Length');
            if (width <= 0) missingFields.push('Width');
            if (height <= 0) missingFields.push('Height');
            
            isValid = length > 0 && width > 0 && height > 0;
        } else if (bedType === 'vertical') {
            const baseLength = parseFloat(bedItem.querySelector('.base-length')?.value) || 0;
            const baseWidth = parseFloat(bedItem.querySelector('.base-width')?.value) || 0;
            const baseHeight = parseFloat(bedItem.querySelector('.base-height')?.value) || 0;
            const verticalCount = parseFloat(bedItem.querySelector('.vertical-count')?.value) || 0;
            const plantsPerVertical = parseFloat(bedItem.querySelector('.plants-per-vertical')?.value) || 0;
            
            if (baseLength <= 0) missingFields.push('Base Length');
            if (baseWidth <= 0) missingFields.push('Base Width');
            if (baseHeight <= 0) missingFields.push('Base Height');
            if (verticalCount <= 0) missingFields.push('Number of Verticals');
            if (plantsPerVertical <= 0) missingFields.push('Plants per Vertical');
            
            isValid = baseLength > 0 && baseWidth > 0 && baseHeight > 0 && verticalCount > 0 && plantsPerVertical > 0;
        } else if (bedType === 'nft') {
            const troughLength = parseFloat(bedItem.querySelector('.trough-length')?.value) || 0;
            const troughCount = parseFloat(bedItem.querySelector('.trough-count')?.value) || 0;
            const plantSpacing = parseFloat(bedItem.querySelector('.plant-spacing')?.value) || 0;
            const reservoirVolume = parseFloat(bedItem.querySelector('.reservoir-volume')?.value) || 0;
            
            if (troughLength <= 0) missingFields.push('Trough Length');
            if (troughCount <= 0) missingFields.push('Number of Troughs');
            if (plantSpacing <= 0) missingFields.push('Plant Spacing');
            if (reservoirVolume <= 0) missingFields.push('Reservoir Volume');
            
            isValid = troughLength > 0 && troughCount > 0 && plantSpacing > 0 && reservoirVolume > 0;
        }

        if (!isValid) {
            window.app.showNotification(`❌ Please fill in: ${missingFields.join(', ')}`, 'error');
            return;
        }

        // Build bed configuration
        const config = {
            bed_number: bedNumber,
            bed_type: bedType,
            bed_name: `Bed ${bedNumber}`,
            volume_liters: volume * 1000, // Convert m³ to liters
            area_m2: area,
            equivalent_m2: area,
            reservoir_volume: volume * 1000
        };

        // Add type-specific dimensions
        if (bedType === 'dwc' || bedType === 'media-flow' || bedType === 'flood-drain') {
            config.length_meters = parseFloat(bedItem.querySelector('.bed-length')?.value) || 0;
            config.width_meters = parseFloat(bedItem.querySelector('.bed-width')?.value) || 0;
            config.height_meters = parseFloat(bedItem.querySelector('.bed-height')?.value) || 0;
        } else if (bedType === 'vertical') {
            config.length_meters = parseFloat(bedItem.querySelector('.base-length')?.value) || 0;
            config.width_meters = parseFloat(bedItem.querySelector('.base-width')?.value) || 0;
            config.height_meters = parseFloat(bedItem.querySelector('.base-height')?.value) || 0;
            config.vertical_count = parseFloat(bedItem.querySelector('.vertical-count')?.value) || 0;
            config.plants_per_vertical = parseFloat(bedItem.querySelector('.plants-per-vertical')?.value) || 0;
            config.plant_capacity = config.vertical_count * config.plants_per_vertical;
        } else if (bedType === 'nft') {
            config.trough_length = parseFloat(bedItem.querySelector('.trough-length')?.value) || 0;
            config.trough_count = parseFloat(bedItem.querySelector('.trough-count')?.value) || 0;
            config.plant_spacing = parseFloat(bedItem.querySelector('.plant-spacing')?.value) || 0;
            config.reservoir_volume_liters = parseFloat(bedItem.querySelector('.reservoir-volume')?.value) || 0;
            
            // Calculate total plant capacity for NFT
            if (config.trough_length > 0 && config.trough_count > 0 && config.plant_spacing > 0) {
                const plantsPerTrough = Math.floor((config.trough_length * 100) / config.plant_spacing);
                config.plant_capacity = plantsPerTrough * config.trough_count;
            }
        }

        try {
            // Get all current bed configurations to preserve them
            const allBedConfigs = this.getGrowBedConfiguration();
            
            // Update or add the current bed configuration
            const existingIndex = allBedConfigs.findIndex(bed => bed.bed_number === bedNumber);
            if (existingIndex >= 0) {
                allBedConfigs[existingIndex] = config;
            } else {
                allBedConfigs.push(config);
            }
            
            // Save all beds together
            console.log('About to save grow beds...');
            const response = await window.app.makeApiCall(`/grow-beds/system/${window.app.activeSystemId}`, {
                method: 'POST',
                body: JSON.stringify({ growBeds: allBedConfigs })
            });
            console.log('API response received:', response);

            if (window.app && window.app.showNotification) {
                window.app.showNotification(`✅ Bed ${bedNumber} configuration saved`, 'success');
                console.log('Notification sent for bed save success');
            } else {
                console.error('window.app.showNotification not available');
                alert(`✅ Bed ${bedNumber} configuration saved`);
            }
        } catch (error) {
            console.error('Failed to save bed configuration:', error);
            if (window.app && window.app.showNotification) {
                window.app.showNotification('❌ Failed to save bed configuration', 'error');
            } else {
                alert('❌ Failed to save bed configuration');
            }
        }
    }

    async deleteBedConfiguration(bedNumber) {
        if (!window.app || !window.app.activeSystemId) {
            window.app.showNotification('❌ No active system selected', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete Grow Bed ${bedNumber} configuration? This action cannot be undone.`)) {
            return;
        }

        try {
            // Get current grow beds from the database
            const growBeds = await window.app.makeApiCall(`/grow-beds/system/${window.app.activeSystemId}`);
            
            // Find the bed to delete by bed_number
            const bedToDelete = growBeds.find(bed => bed.bed_number === bedNumber);
            
            if (!bedToDelete) {
                window.app.showNotification('❌ Bed configuration not found in database', 'error');
                return;
            }

            // Delete the specific bed from database
            await window.app.makeApiCall(`/grow-beds/${bedToDelete.id}`, {
                method: 'DELETE'
            });

            // Reload the entire grow bed configuration to sync with database
            await window.app.loadGrowBedConfiguration();

            window.app.showNotification(`✅ Bed ${bedNumber} configuration deleted`, 'success');
        } catch (error) {
            console.error('Failed to delete bed configuration:', error);
            window.app.showNotification('❌ Failed to delete bed configuration', 'error');
        }
    }

    getGrowBedConfiguration() {
        const bedItems = document.querySelectorAll('.grow-bed-item');
        const configuration = [];

        console.log('Getting grow bed configuration for', bedItems.length, 'beds');

        bedItems.forEach((item, index) => {
            const bedNumber = index + 1;
            const bedType = item.querySelector('.bed-type').value;
            
            console.log(`Bed ${bedNumber}: type = "${bedType}"`);
            
            if (!bedType) {
                console.log(`Bed ${bedNumber}: No bed type selected, skipping`);
                return;
            }

            const volume = parseFloat(item.querySelector('.calculated-volume')?.textContent.replace(' m³', '')) || 0;
            const area = parseFloat(item.querySelector('.calculated-area')?.textContent.replace(' m²', '')) || 0;

            console.log(`Bed ${bedNumber}: volume = ${volume}m³, area = ${area}m²`);

            // Save bed configuration if bed type is selected, even if calculations are incomplete
            if (bedType) {
                const config = {
                    bed_number: bedNumber,
                    bed_type: bedType,
                    bed_name: `Bed ${bedNumber}`,
                    volume_liters: volume * 1000,
                    area_m2: area,
                    equivalent_m2: area,
                    reservoir_volume: volume * 1000
                };

                // Add type-specific dimensions
                if (bedType === 'dwc' || bedType === 'media-flow' || bedType === 'flood-drain') {
                    config.length_meters = parseFloat(item.querySelector('.bed-length')?.value) || 0;
                    config.width_meters = parseFloat(item.querySelector('.bed-width')?.value) || 0;
                    config.height_meters = parseFloat(item.querySelector('.bed-height')?.value) || 0;
                } else if (bedType === 'vertical') {
                    config.length_meters = parseFloat(item.querySelector('.base-length')?.value) || 0;
                    config.width_meters = parseFloat(item.querySelector('.base-width')?.value) || 0;
                    config.height_meters = parseFloat(item.querySelector('.base-height')?.value) || 0;
                    config.vertical_count = parseFloat(item.querySelector('.vertical-count')?.value) || 0;
                    config.plants_per_vertical = parseFloat(item.querySelector('.plants-per-vertical')?.value) || 0;
                    config.plant_capacity = config.vertical_count * config.plants_per_vertical;
                } else if (bedType === 'nft') {
                    config.trough_length = parseFloat(item.querySelector('.trough-length')?.value) || 0;
                    config.trough_count = parseFloat(item.querySelector('.trough-count')?.value) || 0;
                    config.plant_spacing = parseFloat(item.querySelector('.plant-spacing')?.value) || 0;
                    config.reservoir_volume_liters = parseFloat(item.querySelector('.reservoir-volume')?.value) || 0;
                    
                    // Calculate total plant capacity for NFT
                    if (config.trough_length > 0 && config.trough_count > 0 && config.plant_spacing > 0) {
                        const plantsPerTrough = Math.floor((config.trough_length * 100) / config.plant_spacing);
                        config.plant_capacity = plantsPerTrough * config.trough_count;
                    }
                }

                configuration.push(config);
                console.log(`Bed ${bedNumber}: Added to configuration`, config);
            }
        });

        console.log('Final grow bed configuration:', configuration);
        return configuration;
    }
}

// Initialize grow bed manager
window.growBedManager = new GrowBedManager();

// SVG Icon Helper Functions
const SVGIcons = {
    // Cache for loaded SVG content
    cache: {},
    
    // Load SVG content from file
    async loadSVG(iconName) {
        if (this.cache[iconName]) {
            return this.cache[iconName];
        }
        
        try {
            const response = await fetch(`/icons/${iconName}.svg`);
            const svgContent = await response.text();
            this.cache[iconName] = svgContent;
            return svgContent;
        } catch (error) {
            console.warn(`Failed to load SVG icon: ${iconName}`, error);
            return null;
        }
    },
    
    // Create an SVG icon element
    async createIcon(iconName, className = 'icon-svg') {
        const svgContent = await this.loadSVG(iconName);
        if (!svgContent) {
            return `<span class="${className}">?</span>`;
        }
        
        const div = document.createElement('div');
        div.innerHTML = svgContent;
        const svg = div.querySelector('svg');
        
        if (svg) {
            svg.className = className;
            // Remove hardcoded width/height attributes to allow CSS sizing
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            return svg.outerHTML;
        }
        
        return `<span class="${className}">?</span>`;
    },
    
    // Synchronous version using cached content only
    getIcon(iconName, className = 'icon-svg') {
        const svgContent = this.cache[iconName];
        if (!svgContent) {
            return `<span class="${className}">?</span>`;
        }
        
        const div = document.createElement('div');
        div.innerHTML = svgContent;
        const svg = div.querySelector('svg');
        
        if (svg) {
            svg.className = className;
            // Remove hardcoded width/height attributes to allow CSS sizing
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            return svg.outerHTML;
        }
        
        return `<span class="${className}">?</span>`;
    },
    
    // Preload all icons
    async preloadIcons() {
        const icons = ['add', 'edit', 'delete'];
        await Promise.all(icons.map(icon => this.loadSVG(icon)));
        console.log('SVG icons preloaded:', Object.keys(this.cache));
        
        // Replace icon placeholders after preloading
        this.replaceIconPlaceholders();
        
        // Fix existing SVG icons that might have hardcoded dimensions
        this.fixExistingSVGIcons();
    },
    
    // Replace all icon placeholders in the DOM
    replaceIconPlaceholders() {
        const placeholders = document.querySelectorAll('.icon-placeholder[data-icon]');
        placeholders.forEach(placeholder => {
            const iconName = placeholder.getAttribute('data-icon');
            const iconHTML = this.getIcon(iconName, 'btn-icon-svg');
            placeholder.outerHTML = iconHTML;
        });
    },
    
    // Fix existing SVG icons in the DOM that have hardcoded dimensions
    fixExistingSVGIcons() {
        const svgElements = document.querySelectorAll('.btn-icon-svg svg, .icon-svg svg');
        svgElements.forEach(svg => {
            svg.removeAttribute('width');
            svg.removeAttribute('height');
        });
        console.log('Fixed', svgElements.length, 'existing SVG icons');
    }
};

// Preload icons when the page loads
document.addEventListener('DOMContentLoaded', () => {
    SVGIcons.preloadIcons();
});