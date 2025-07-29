# Aquaponics Management App

A comprehensive web-based aquaponics management application that combines powerful calculators with system monitoring and data tracking capabilities. Perfect for both students and commercial aquaponics operations.

## Features

### 🧮 Professional Calculators
- **Fish Stocking Calculator**: Calculate optimal fish numbers for Tilapia, Trout, and Catfish
  - Species-specific stocking densities and growth charts
  - Feed conversion ratios and harvest projections
  - Growth timeline with feeding schedules
- **Nutrient Dosing Calculator**: (Coming Soon)
  - Hydroponic and aquaponic nutrient calculations
  - Crop-specific nutrient profiles
  - Two-week alternating dosing schedules

### 📊 Real-time System Monitoring
- **Dashboard**: Live sensor data and system status
- **Water Quality**: Temperature, pH, dissolved oxygen, ammonia tracking
- **System Components**: Monitor pumps, lights, and equipment status
- **Alerts**: Configurable notifications for critical parameters

### 📝 Comprehensive Data Recording
- **Water Quality Parameters**: pH, EC/TDS, dissolved oxygen, temperature, ammonia, nitrite, nitrate
- **Fish Health Metrics**: Fish count, mortality, weight tracking, feed consumption, behavior observations
- **Plant Growth Data**: Crop tracking, harvest weights, health assessments, growth stages
- **System Operations**: Maintenance logs, water changes, chemical additions, equipment failures

### 📈 Data Management
- **Local Storage**: All data persists between sessions
- **Export Ready**: Data structured for easy analysis
- **Time-Series Tracking**: Historical data with timestamps
- **Trend Analysis**: (Coming Soon) Visual charts and correlations

## Getting Started

1. Navigate to the project directory:
   ```bash
   cd aquaponics-app
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and visit `http://localhost:8000`

## Project Structure

- `index.html` - Main application interface with calculator and data entry sections
- `style.css` - Responsive styling optimized for tablets and mobile
- `script.js` - Application logic with calculator algorithms and data management
- `package.json` - Project configuration

## Usage Guide

### 🎯 Calculators
- **Fish Stocking**: Select fish species, enter tank volume, and get optimal stocking recommendations
- Navigate between calculator tabs to access different tools

### 📊 Dashboard
- View real-time simulated sensor data
- Monitor system component status
- Check alerts and system health

### 📝 Data Entry
- **Water Quality**: Record all essential water parameters with timestamps
- **Fish Health**: Track fish count, growth, and health observations
- **Plant Growth**: Monitor crop development and harvest data
- **Operations**: Log maintenance activities and system changes

### 🔧 Settings
- Configure alert preferences
- Set up automation features
- Customize system preferences

## Technical Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile use
- **Offline Capable**: Works without internet connection
- **Data Persistence**: All entries saved locally
- **Real-time Updates**: Live sensor simulation
- **Professional UI**: Clean, modern interface suitable for commercial use

## Fish Species Supported

- **Tilapia**: 25 kg/m³ default density, 24-week growth cycle
- **Trout**: 20 kg/m³ default density, 20-week growth cycle  
- **Catfish**: 40 kg/m³ default density, 28-week growth cycle

Each species includes:
- Species-specific growth charts
- Feeding schedules and rates
- Temperature requirements
- Feed conversion ratios

## Data Tracking Capabilities

### Water Quality Parameters
- pH levels (6.0-8.5 optimal range)
- EC/TDS (400-1200 ppm)
- Dissolved oxygen (5.0-8.0 mg/L)
- Water temperature (18-30°C)
- Ammonia NH₃ (<0.5 ppm)
- Nitrite NO₂ (<0.5 ppm)
- Nitrate NO₃ (10-150 ppm)

### System Operations Tracking
- Water changes with volume tracking
- Equipment maintenance schedules
- Chemical additions and dosing
- System failures and downtime
- Cleaning and sanitation logs

## Browser Compatibility

Works in all modern browsers that support ES6+ JavaScript features. Optimized for:
- Chrome/Safari (mobile and desktop)
- Firefox
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Nutrient dosing calculator integration
- Data visualization with charts and trends
- Export functionality (CSV, PDF)
- Cloud synchronization
- Advanced analytics and AI insights
- Multi-system management
- Course integration features

Perfect for aquaponics students, commercial farmers, and system designers who need professional-grade tools for successful aquaponics operations.