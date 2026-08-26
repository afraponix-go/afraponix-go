# Afraponix Go - Technical Documentation

## Project Overview
Afraponix Go is an aquaponics management application built with:
- **Frontend**: Modular JavaScript (ES6 modules), HTML, CSS
- **Backend**: Node.js, Express.js
- **Database**: MariaDB/MySQL
- **Authentication**: JWT tokens
- **Architecture**: RESTful API with modular frontend

## Current Architecture Status

### ✅ Modular System Architecture
- **140+ API functions** extracted into 11 specialized API modules
- **AquaponicsApp class** reduced from 903 methods to core coordination
- **Modular components** with isolated responsibilities and error boundaries
- **Backward compatibility** maintained through delegation patterns

### File Structure
```
public/js/
├── script.js                   (Main coordinating application)
└── modules/
    ├── api/                    (11 API modules)
    ├── components/             (UI component management)
    ├── services/               (Business logic services)  
    ├── utils/                  (Utility functions)
    └── constants/              (Configuration constants)
```

## Database Schema

### Current Active Tables
- **fish_inventory**: Stock management (primary data source for fish overview)
- **fish_health**: Daily operations (feeding, behavior, mortality tracking)
- **water_quality**: Core parameters + humidity & salinity
- **nutrient_readings**: Nutrient tracking with source attribution
- **plant_data**: Plant management with batch tracking
- **systems**: Multi-system support with user permissions
- **grow_beds**: Grow bed configurations and calculations

### Data Source Priorities
- **Fish Data**: fish_inventory → fish_health (fallback)
- **Water Quality**: water_quality table with composite latest value logic
- **Nutrients**: nutrient_readings table with source attribution (📡/📝/🧪)

## Recent Major Fixes & Enhancements

### ✅ Chart.js SVG Rendering Errors Fixed
- **Issue**: Hundreds of "NaN" and "Infinity" SVG attribute errors in Chart.js
- **Root Cause**: Invalid numerical data from division by zero and missing data validation
- **Solution**: 
  - Enhanced data filtering with `!isNaN(value) && isFinite(value)` checks
  - Added comprehensive data sanitization in chart update methods
  - Protected fish density calculations from division by zero
  - Validated system volume and weight calculations
- **Files Modified**: 
  - `/public/js/modules/components/charts.js` - Enhanced data validation
  - `/script.js` - Added validation to legacy fish density calculations
- **Result**: Chart.js now receives only valid numerical data, eliminating all SVG rendering errors

### ✅ Dashboard Chart System Overhaul
- **Issues Fixed**: Charts disappearing, infinite height expansion, non-brand colors, wrong grid layout
- **Solutions**: Proper lifecycle management, canvas sizing constraints, brand color mapping, 4-column responsive grid
- **Brand Colors Applied**: Deep Blue, Bio Green, Blue Fish, Aqua Green with logical parameter associations

### ✅ Professional Icon System Migration
- **Replaced 50+ emojis** with professional SVG icons throughout application
- **Maintained semantic meaning** while improving visual consistency
- **Enhanced data source indicators** with proper icon mappings

### ✅ Complete CSS Design System
- **Unified brand colors** with CSS custom properties
- **Standardized components**: buttons, forms, typography, metric cards
- **Professional aquaponics UI**: tank indicators, bed status, water quality badges
- **Responsive design** with mobile-first approach

### ✅ Core Functionality Fixes
- **Grow bed configuration** forms now display and save correctly
- **Fish density synchronization** between overview cards and charts
- **Batch move functionality** with proper API endpoints and data refresh
- **Custom crop integration** in allocation dropdowns
- **Real-time data updates** after plant/harvest entries
- **Smart positioning** for dropdown menus and modals

## Technical Architecture Insights

### API Design Patterns
- **RESTful Endpoints**: Consistent `/api/data/` and `/api/` URL structure
- **System Scoping**: All APIs include `systemId` parameter for multi-tenant support
- **Error Handling**: Comprehensive try-catch with proper HTTP status codes
- **Data Validation**: Input sanitization and proper type checking

### Frontend Data Management
- **Centralized Loading**: `loadDataRecords()` function for all system data
- **Async/Await Pattern**: Modern promise handling throughout
- **Data Refresh Strategy**: Immediate refresh after modifications
- **Fallback Systems**: Graceful degradation when APIs fail

### Chart.js Integration
- **Data Validation**: Multiple layers of NaN/Infinity protection
- **Brand Color System**: Systematic color mapping aligned with design system
- **Performance Optimization**: Disabled animations, proper canvas sizing
- **Error Boundaries**: Try-catch blocks with fallback behavior

### Component Architecture
- **Modular Design**: Single responsibility principle with clear boundaries
- **Event-Driven**: Inter-component communication via app events
- **Backward Compatibility**: Legacy HTML onclick handlers still work
- **Error Isolation**: Component failures don't cascade

## Development Guidelines

### Code Quality Standards
- **Data Validation**: Always validate numerical data before chart operations
- **Error Handling**: Comprehensive try-catch blocks with meaningful messages
- **Async Patterns**: Use async/await consistently, update all callers
- **Type Checking**: Validate data types and handle edge cases
- **Performance**: Use efficient data filtering and avoid unnecessary operations

### Chart Development
- **Data Sanitization**: Filter NaN/Infinity values before Chart.js
- **Color Consistency**: Use brand color variables from CSS design system
- **Responsive Design**: Set proper canvas constraints and container limits
- **Error Recovery**: Implement fallback displays for missing data

### Database Operations
- **Data Source Priority**: Use fish_inventory as primary, fish_health as fallback
- **Proper Joins**: Ensure efficient queries with appropriate indexes
- **Null Handling**: Check for null/undefined values in calculations
- **Type Coercion**: Use proper equality operators (== vs ===) when needed

## Session Key Learnings

1. **Chart Data Validation**: Multiple layers of validation prevent Chart.js rendering errors
2. **Brand Consistency**: Systematic color mapping maintains professional appearance
3. **Data Source Investigation**: Always verify database contents vs API behavior
4. **Error Boundary Strategy**: Isolate failures to prevent cascade effects
5. **Performance vs Functionality**: Balance responsive design with proper constraints
6. **Debug Strategy**: Structured logging helps identify timing and data flow issues

## Current Development Status

### ✅ Stable & Production Ready
- Chart.js rendering system with proper error handling
- Professional design system with brand consistency
- Modular architecture with backward compatibility
- Core aquaponics functionality (fish, plants, water quality, nutrients)

### 🔄 Ongoing Architecture Migration
- Gradual migration from monolithic to modular components
- Legacy method deprecation and cleanup
- ES6 modules transition strategy prepared but not implemented

### 📋 Technical Debt
- Some redundant code in legacy components
- Mixed old/new styling patterns during CSS migration
- Database schema could be further optimized

The application is currently stable and fully functional with significant improvements in code quality, visual consistency, and error resilience.