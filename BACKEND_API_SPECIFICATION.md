# Afraponix Go Backend API Specification

## Overview
This document provides a comprehensive specification for backend API endpoints based on the frontend requirements. The endpoints are categorized by priority and implementation status.

**Base URL**: `http://127.0.0.1:8000/api`

---

## Priority 1 - Critical Missing Endpoints (Causing 404s)

### 1. Fish Tank Configuration API

#### 1.1 Create Fish Tank
- **Endpoint**: `POST /fish-tanks`
- **Status**: ❌ Missing
- **Purpose**: Create individual fish tank configurations

**Request Body**:
```json
{
  "systemId": "string",
  "tankNumber": "number",
  "tankName": "string",
  "volume": "number",
  "fishType": "string",
  "fishCount": "number",
  "feedingSchedule": {
    "feedingsPerDay": "number",
    "feedingTimes": ["string"]
  }
}
```

**Response**:
```json
{
  "id": "number",
  "message": "Fish tank created successfully"
}
```

**Database Model Required**:
```sql
CREATE TABLE fish_tanks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    tank_number INTEGER NOT NULL,
    tank_name TEXT,
    volume_liters REAL NOT NULL,
    fish_type TEXT,
    fish_count INTEGER DEFAULT 0,
    water_temperature REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
);
```

#### 1.2 Get Fish Tanks by System
- **Endpoint**: `GET /fish-tanks/system/{systemId}`
- **Status**: ❌ Missing

**Response**:
```json
[
  {
    "id": "number",
    "systemId": "string",
    "tankNumber": "number",
    "tankName": "string",
    "volume": "number",
    "fishType": "string",
    "fishCount": "number"
  }
]
```

#### 1.3 Delete Fish Tank
- **Endpoint**: `DELETE /fish-tanks/system/{systemId}/tank/{tankNumber}`
- **Status**: ❌ Missing

### 2. Enhanced Data Entry Endpoints

#### 2.1 Fish Health Data Entry
- **Endpoint**: `POST /data-entries/fish-health`
- **Status**: ❌ Missing (references missing)
- **Current**: Available at `POST /data/fish-health/{systemId}`

**Request Body**:
```json
{
  "systemId": "string",
  "fishTankId": "number",
  "date": "string",
  "fishCount": "number",
  "mortality": "number",
  "averageWeight": "number",
  "feedConsumption": "number",
  "behavior": "string",
  "healthStatus": "string",
  "notes": "string"
}
```

#### 2.2 Get Fish Health History
- **Endpoint**: `GET /data-entries/fish-health`
- **Status**: ❌ Missing
- **Query Parameters**: `system_id`, `limit`

**Response**:
```json
[
  {
    "id": "number",
    "systemId": "string",
    "date": "string",
    "fishCount": "number",
    "mortality": "number",
    "averageWeight": "number",
    "feedConsumption": "number",
    "behavior": "string",
    "notes": "string",
    "createdAt": "string"
  }
]
```

#### 2.3 Water Quality Data Entry
- **Endpoint**: `GET /data-entries/water-quality`
- **Status**: ❌ Missing
- **Current**: Available at `GET /data/water-quality/{systemId}`

### 3. Chart Data Endpoints

#### 3.1 Chart Data for Water Quality
- **Endpoint**: `GET /data/chart/water-quality/{systemId}`
- **Status**: ❌ Missing

**Query Parameters**:
- `period`: `7d`, `30d`, `90d`, `1y`
- `parameters`: `ph,ec,temperature,dissolved_oxygen`

**Response**:
```json
{
  "labels": ["2024-01-01", "2024-01-02"],
  "datasets": {
    "ph": [7.2, 7.1],
    "ec": [1.2, 1.3],
    "temperature": [24.5, 25.0],
    "dissolved_oxygen": [8.2, 8.5]
  }
}
```

#### 3.2 Chart Data for Fish Health
- **Endpoint**: `GET /data/chart/fish-health/{systemId}`
- **Status**: ❌ Missing

**Response**:
```json
{
  "labels": ["2024-01-01", "2024-01-02"],
  "datasets": {
    "fishCount": [100, 98],
    "mortality": [0, 2],
    "averageWeight": [150, 155],
    "feedConsumption": [5.2, 5.5]
  }
}
```

---

## Priority 2 - System Features

### 1. System Sharing/Collaboration API

#### 1.1 Send System Invitation
- **Endpoint**: `POST /system-sharing/invite`
- **Status**: ❌ Missing

**Request Body**:
```json
{
  "systemId": "string",
  "email": "string",
  "permissionLevel": "view|edit|admin",
  "message": "string",
  "invitedBy": "string"
}
```

**Database Model Required**:
```sql
CREATE TABLE system_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    inviter_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    permission_level TEXT DEFAULT 'view',
    status TEXT DEFAULT 'pending',
    invitation_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users (id) ON DELETE CASCADE
);
```

#### 1.2 Get Shared Users
- **Endpoint**: `GET /system-sharing/users`
- **Status**: ❌ Missing
- **Query Parameters**: `system_id`

#### 1.3 Get Pending Invitations
- **Endpoint**: `GET /system-sharing/invitations`
- **Status**: ❌ Missing
- **Query Parameters**: `system_id`

#### 1.4 Manage Public Access
- **Endpoint**: `PUT /system-sharing/public-access`
- **Status**: ❌ Missing

**Request Body**:
```json
{
  "systemId": "string",
  "publicAccess": "boolean"
}
```

#### 1.5 Update User Permission
- **Endpoint**: `PUT /system-sharing/permission`
- **Status**: ❌ Missing

#### 1.6 Remove User Access
- **Endpoint**: `DELETE /system-sharing/access`
- **Status**: ❌ Missing

#### 1.7 Resend Invitation
- **Endpoint**: `POST /system-sharing/invitation/{invitationId}/resend`
- **Status**: ❌ Missing

#### 1.8 Cancel Invitation
- **Endpoint**: `DELETE /system-sharing/invitation/{invitationId}`
- **Status**: ❌ Missing

---

## Priority 3 - Advanced Features

### 1. Spray Programme Management API

#### 1.1 Create Spray Programme
- **Endpoint**: `POST /spray-programmes`
- **Status**: ❌ Missing

**Request Body**:
```json
{
  "systemId": "string",
  "category": "foliar|systemic|biological|organic",
  "productName": "string",
  "activeIngredient": "string",
  "targetPest": "string",
  "applicationRate": "string",
  "frequency": "string",
  "startDate": "string",
  "endDate": "string",
  "notes": "string"
}
```

**Database Model Required**:
```sql
CREATE TABLE spray_programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id TEXT NOT NULL,
    category TEXT NOT NULL,
    product_name TEXT NOT NULL,
    active_ingredient TEXT,
    target_pest TEXT,
    application_rate TEXT,
    frequency TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
);

CREATE TABLE spray_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    programme_id INTEGER NOT NULL,
    application_date TEXT NOT NULL,
    dilution_rate TEXT,
    volume_applied REAL,
    weather_conditions TEXT,
    effectiveness_rating INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (programme_id) REFERENCES spray_programmes (id) ON DELETE CASCADE
);
```

#### 1.2 Get Spray Programmes
- **Endpoint**: `GET /spray-programmes/{systemId}`
- **Status**: ❌ Missing
- **Query Parameters**: `category`

#### 1.3 Record Spray Application
- **Endpoint**: `POST /spray-programmes/record`
- **Status**: ❌ Missing

#### 1.4 Get Application Calendar
- **Endpoint**: `GET /spray-programmes/{systemId}/calendar`
- **Status**: ❌ Missing

#### 1.5 Get Application History
- **Endpoint**: `GET /spray-programmes/{applicationId}/history`
- **Status**: ❌ Missing

#### 1.6 Delete Spray Programme
- **Endpoint**: `DELETE /spray-programmes/{applicationId}`
- **Status**: ❌ Missing

### 2. Analytics Endpoints

#### 2.1 System Performance Analytics
- **Endpoint**: `GET /analytics/performance/{systemId}`
- **Status**: ❌ Missing

**Query Parameters**:
- `period`: `7d`, `30d`, `90d`, `1y`

**Response**:
```json
{
  "growthRate": "number",
  "harvestYield": "number",
  "mortalityRate": "number",
  "feedConversionRatio": "number",
  "waterQualityScore": "number",
  "systemEfficiency": "number"
}
```

#### 2.2 Comparative Analytics
- **Endpoint**: `GET /analytics/compare/{systemId}`
- **Status**: ❌ Missing

#### 2.3 Predictive Analytics
- **Endpoint**: `GET /analytics/predictions/{systemId}`
- **Status**: ❌ Missing

---

## Existing Endpoints (✅ Implemented)

### Authentication
- `POST /auth/register` ✅
- `POST /auth/login` ✅
- `GET /auth/verify` ✅
- `POST /auth/forgot-password` ✅
- `POST /auth/reset-password` ✅

### Systems Management
- `GET /systems` ✅
- `GET /systems/{id}` ✅
- `POST /systems` ✅
- `PUT /systems/{id}` ✅
- `DELETE /systems/{id}` ✅

### Data Management
- `GET /data/latest/{systemId}` ✅
- `GET /data/water-quality/{systemId}` ✅
- `POST /data/water-quality/{systemId}` ✅
- `GET /data/fish-health/{systemId}` ✅
- `POST /data/fish-health/{systemId}` ✅
- `GET /data/plant-growth/{systemId}` ✅
- `POST /data/plant-growth/{systemId}` ✅
- `GET /data/operations/{systemId}` ✅
- `POST /data/operations/{systemId}` ✅

### Grow Beds
- `GET /grow-beds/system/{systemId}` ✅
- `POST /grow-beds/system/{systemId}` ✅
- `DELETE /grow-beds/{bedId}` ✅

### Plants Management
- `GET /plants/allocations/{systemId}` ✅
- `POST /plants/allocations` ✅
- `PUT /plants/allocations/{id}` ✅
- `DELETE /plants/allocations/{id}` ✅
- `GET /plants/custom-crops` ✅
- `POST /plants/custom-crops` ✅
- `DELETE /plants/custom-crops/{id}` ✅
- `GET /plants/utilization/{systemId}` ✅

### Fish Management
- `POST /fish/feeding-schedule` ✅
- `GET /fish/feeding-schedule/{systemId}` ✅
- `DELETE /fish/feeding-schedule/{systemId}` ✅

### Configuration
- `GET /config/smtp` ✅
- `PUT /config/smtp` ✅
- `POST /config/smtp/test` ✅

### Admin
- `GET /admin/users` ✅
- `PUT /admin/users/{userId}` ✅
- `POST /admin/users/{userId}/reset-password` ✅
- `GET /admin/users/{userId}/systems` ✅
- `DELETE /admin/users/{userId}` ✅
- `GET /admin/stats` ✅

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "number",
  "username": "string",
  "userRole": "basic|subscribed|admin",
  "subscriptionStatus": "basic|subscribed"
}
```

### Permission Levels
- **basic**: Can manage own systems and data
- **subscribed**: Basic + advanced features (analytics, sharing)
- **admin**: All permissions + user management

### Middleware Requirements
- All endpoints except auth require `authenticateToken`
- Admin endpoints require `isAdmin`
- System-specific endpoints require ownership verification

---

## Error Handling

### Standard Error Response
```json
{
  "error": "string",
  "code": "string",
  "details": "object"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

## Implementation Priority

### Phase 1 (Critical - Fix 404s)
1. Fish tank configuration endpoints
2. Enhanced data entry endpoints
3. Chart data endpoints

### Phase 2 (System Features)
1. System sharing/collaboration API
2. Email invitation system
3. User permission management

### Phase 3 (Advanced Features)
1. Spray programme management
2. Analytics endpoints
3. Predictive analytics

---

## Database Schema Updates Required

### New Tables Needed
1. `fish_tanks` - Individual tank configurations
2. `system_invitations` - Sharing invitations
3. `system_shares` - Active sharing relationships (exists but needs updates)
4. `spray_programmes` - Spray program configurations
5. `spray_applications` - Application records

### Existing Tables to Update
1. `systems` - Add sharing configuration fields
2. `users` - Add notification preferences
3. `water_quality` - Add chart optimization indexes

This specification provides a complete roadmap for implementing the missing backend endpoints based on the frontend requirements analysis.