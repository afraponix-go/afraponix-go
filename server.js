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
const { initializeDatabase } = require('./database/init-mariadb');
const sensorCollector = require('./services/sensor-collector');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

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

// Email verification route - serve main page with token parameter
app.get('/verify-email', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
initializeDatabase().then(() => {
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
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (sensorCollector) {
        sensorCollector.stop();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    if (sensorCollector) {
        sensorCollector.stop();
    }
    process.exit(0);
});

// Make sensor collector available globally for routes
global.sensorCollector = sensorCollector;

module.exports = app;