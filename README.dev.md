# Afraponix Go - Development Setup

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Docker & Docker Compose
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Environment
```bash
# Start database and application (all-in-one)
npm run dev:setup

# Or start database separately
npm run dev:db:up
npm run dev
```

### 3. Access Applications
- **Main App**: http://localhost:8000
- **Database Admin** (Adminer): http://localhost:8080
  - Server: `mariadb`
  - Username: `aquaponics`
  - Password: `dev123`
  - Database: `aquaponics_dev`

## 🗄️ Database Management

### Available Commands
```bash
# Start database only
npm run dev:db:up

# Stop database
npm run dev:db:down

# Reset database (removes all data)
npm run dev:db:reset

# View database logs
docker-compose -f docker-compose.dev.yml logs -f mariadb
```

### Default Admin Account
- **Username**: `admin`
- **Email**: `admin@aquaponics.local`
- **Password**: `admin123`

## 🔧 Environment Configuration

Development uses `.env.dev` with these settings:
- **Database**: MariaDB 10.6 (Docker)
- **Port**: 8000
- **Auto-reload**: Enabled (nodemon)

## 🧪 Testing Batch Tracking

1. Login with admin account
2. Create a new system
3. Configure grow beds
4. Navigate to Plant Management
5. Test **Planting form** with:
   - Auto-generated Batch ID
   - Seed Variety input
   - Days to Harvest input
6. Test **Harvest form** with:
   - Batch selection dropdown
   - Batch age calculation

## 🛠️ Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Database | MariaDB (Docker) | MariaDB (VPS) |
| Environment | `.env.dev` | `.env` |
| Hot Reload | ✅ Enabled | ❌ Disabled |
| Debug Logs | ✅ Verbose | ⚠️ Essential only |
| Admin UI | ✅ Adminer | ❌ Not exposed |

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Check if database is running
docker ps | grep mariadb

# Check database logs
docker-compose -f docker-compose.dev.yml logs mariadb

# Reset database completely
npm run dev:db:reset
```

### Port Conflicts
If port 3306 or 8080 are in use:
```bash
# Kill processes using ports
sudo lsof -ti:3306 | xargs kill -9
sudo lsof -ti:8080 | xargs kill -9
```

### Clean Restart
```bash
# Complete clean restart
npm run dev:db:down
docker system prune -f
npm run dev:setup
```

## 📊 Database Schema

The development database includes all production tables with batch tracking:
- `users` - User accounts
- `systems` - Aquaponics systems
- `plant_growth` - **Plant data with batch tracking fields**
- `grow_beds` - Grow bed configurations
- `water_quality` - Water monitoring data
- `fish_health` - Fish monitoring data
- Plus all other production tables...

## 🎯 Next Steps

This setup provides:
- ✅ Database parity with production
- ✅ Proper development workflow
- ✅ Batch tracking functionality
- ✅ Easy database management
- ✅ Admin tools for debugging