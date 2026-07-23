const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/systems');
const dataRoutes = require('./routes/data');
const growBedRoutes = require('./routes/grow-beds');
const plantsRoutes = require('./routes/plants');
const fishRoutes = require('./routes/fish');
const fishTankRoutes = require('./routes/fish-tanks');
const fishInventoryRoutes = require('./routes/fish-inventory');
const adminRoutes = require('./routes/admin');
const configRoutes = require('./routes/config');
const systemSharingRoutes = require('./routes/system-sharing');
const sprayProgrammeRoutes = require('./routes/spray-programmes');
const sensorRoutes = require('./routes/sensors');
const credentialsRoutes = require('./routes/credentials');
const seedVarietiesRoutes = require('./routes/seed-varieties');
const cropKnowledgeRoutes = require('./routes/crop-knowledge');
const customCropsRoutes = require('./routes/custom-crops');
const dataImportRoutes = require('./routes/data-import');
const { initializeDatabase, initializeConnectionPool, closeConnectionPool } = require('./database/init-mariadb');
const sensorCollector = require('./services/sensor-collector');

// JWT_SECRET signs every session token. Refuse to start without a strong one:
// a missing or guessable secret lets anyone forge a token for any account, and
// failing at startup is far safer than discovering it in production.
const KNOWN_PLACEHOLDER_SECRETS = [
    'your-secret-key-change-this',
    'your-super-secure-jwt-secret',
    'your-generated-jwt-secret',
    'change-me',
    'secret'
];

function assertJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || !secret.trim()) {
        throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -base64 48');
    }
    if (KNOWN_PLACEHOLDER_SECRETS.includes(secret.trim().toLowerCase())) {
        throw new Error('JWT_SECRET is still set to a placeholder value. Generate a real one with: openssl rand -base64 48');
    }
    if (secret.length < 32) {
        throw new Error(`JWT_SECRET is too short (${secret.length} chars, need at least 32). Generate one with: openssl rand -base64 48`);
    }
}

try {
    assertJwtSecret();
} catch (error) {
    console.error(`\n❌ Refusing to start: ${error.message}\n`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8000;

// Behind nginx the real client IP arrives in X-Forwarded-For. Without this
// every request looks like it came from the proxy, so the rate limits below
// would be shared by all users at once. Opt-in via TRUST_PROXY (e.g. 1 for a
// single nginx in front) — left off, Express uses the direct socket address,
// which cannot be spoofed.
if (process.env.TRUST_PROXY) {
    const trustProxy = process.env.TRUST_PROXY;
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable COEP to avoid message port issues
}));
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:8000', 
        'http://127.0.0.1:8000',
        'https://go.afraponix.com',
        'https://www.go.afraponix.com',
        'https://go.aquaponics.online',
        'https://www.go.aquaponics.online',
        'https://staging.aquaponics.online',
        'https://staging.go.aquaponics.online'
    ],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // limit each IP to 5000 requests per windowMs (increased for development)
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// The general limit above is far too permissive for authentication — it would
// allow thousands of password guesses per window. These endpoints get their own
// strict per-IP limits. Mounted before the auth router so they run first.

// Password guessing. Successful logins are not counted, so normal use never
// trips it; only failures burn the allowance.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many failed login attempts. Please try again in 15 minutes.' }
});

// Guessing a verification code or password-reset token — every attempt counts.
const codeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' }
});

// Endpoints that create accounts or send email — limits signup floods and
// using the app to spam someone else's inbox.
const accountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/verify-code', codeLimiter);
app.use('/api/auth/verify-email', codeLimiter);
app.use('/api/auth/reset-password', codeLimiter);
app.use('/api/auth/register', accountLimiter);
app.use('/api/auth/forgot-password', accountLimiter);
app.use('/api/auth/resend-verification', accountLimiter);

// Request logging middleware (for debugging)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/data-entries', dataRoutes); // Mount same routes for frontend compatibility
app.use('/api/grow-beds', growBedRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/fish', fishRoutes);
app.use('/api/fish-tanks', fishTankRoutes);
app.use('/api/fish-inventory', fishInventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system-sharing', systemSharingRoutes);
app.use('/api/spray-programmes', sprayProgrammeRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/seed-varieties', seedVarietiesRoutes);
app.use('/api/crop-knowledge', cropKnowledgeRoutes);
app.use('/api/custom-crops', customCropsRoutes);
app.use('/api/import', dataImportRoutes);

// Email verification route - serve main page with token parameter
app.get('/verify-email', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Password reset route - serve reset password page
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

// Favicon route
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo-clean.svg'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global sensor collector instance is imported above

// Initialize database and start server
Promise.all([
    initializeDatabase(),
    initializeConnectionPool()
]).then(() => {
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`🌿 Afraponix Go server running on http://127.0.0.1:${PORT}`);
        console.log(`📊 Health check: http://127.0.0.1:${PORT}/api/health`);
        
        // Initialize sensor data collection service
        // SensorCollector is already instantiated
        sensorCollector.start().then(() => {
            console.log('📊 Sensor data collection service started');
        }).catch(err => {
            console.error('Failed to start sensor data collection:', err);
        });
    }).on('error', (err) => {
        console.error('Server failed to start:', err);
        process.exit(1);
    });
}).catch(err => {
    console.error('Failed to initialize database and connection pool:', err);
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    
    try {
        // Stop sensor collection first
        if (sensorCollector) {
            await sensorCollector.stop();
            console.log('✅ Sensor collector stopped');
        }
        
        // Close database connection pool
        await closeConnectionPool();
        console.log('✅ Database connection pool closed');
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Make sensor collector available globally for routes
global.sensorCollector = sensorCollector;

module.exports = app;