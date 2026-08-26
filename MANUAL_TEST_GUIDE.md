# Manual Test Guide: System Creation Wizard

## Prerequisites
- Server running on http://127.0.0.1:8000
- Logged in as admin/admin

## Test Scenario
Create a new aquaponics system with:
- **3 Fish Tanks** with varying volumes
- **4 Grow Beds** (2 DWC, 1 Vertical, 1 NFT)

---

## Step-by-Step Test

### 1. Open System Creation Wizard
1. Navigate to http://127.0.0.1:8000
2. Click **"Add New System"** button (or similar)
3. ✅ Verify: Modal opens with title "Add New System"
4. ✅ Verify: Progress indicator shows 4 steps

### 2. Step 1: Setup Method
1. Select **"Start Fresh"** (custom setup)
2. Click **"Next"**
3. ✅ Verify: Progress moves to Step 2

### 3. Step 2: Basic Information
Enter the following:
- **System Name**: `Test System Automated`
- **System Type**: `Aquaponics`
- **Number of Fish Tanks**: `3`
- **Number of Grow Beds**: `4`

Click **"Next"**

✅ Verify: Console logs show wizard progressing
✅ Verify: Fish tank configuration fields appear

### 4. Step 3: Fish Tank Configuration

**Open Browser Console** (F12) to see debug logs

#### Tank 1:
- Name: `Tank 1`
- Volume (L): `5000`
- Fish Type: `Tilapia`
- Stocking Density: `25`
- Harvest Weight: `500`

#### Tank 2:
- Name: `Tank 2`
- Volume (L): `7000`
- Fish Type: `Catfish`
- Stocking Density: `20`
- Harvest Weight: `600`

#### Tank 3:
- Name: `Tank 3`
- Volume (L): `3000`
- Fish Type: `Trout`
- Stocking Density: `30`
- Harvest Weight: `400`

Click **"Next"**

✅ Verify: Console shows:
```
🐟 Tank 1 data collected: {name: "Tank 1", volume: 5000, fish_type: "tilapia", ...}
🐟 Tank 2 data collected: {name: "Tank 2", volume: 7000, fish_type: "catfish", ...}
🐟 Tank 3 data collected: {name: "Tank 3", volume: 3000, fish_type: "trout", ...}
✅ Total fish tanks collected: 3
```

### 5. Step 4: Grow Bed Configuration

#### Bed 1 (DWC):
- Name: `DWC Bed 1`
- Type: `Deep Water Culture (DWC)`
- Length (m): `2.5`
- Width (m): `1.2`
- Depth (m): `0.4`

**Expected Volume**: 2.5 × 1.2 × 0.4 × 1000 = **1,200L**

#### Bed 2 (DWC):
- Name: `DWC Bed 2`
- Type: `Deep Water Culture (DWC)`
- Length (m): `3.0`
- Width (m): `1.5`
- Depth (m): `0.5`

**Expected Volume**: 3.0 × 1.5 × 0.5 × 1000 = **2,250L**

#### Bed 3 (Vertical):
- Name: `Vertical Tower 1`
- Type: `Vertical Growing`
- Number of Verticals: `10`
- Plants per Vertical: `12`
- **Reservoir Dimensions**:
  - Length (m): `1.5`
  - Width (m): `0.8`
  - Depth (m): `0.3`

**Expected Reservoir Volume**: 1.5 × 0.8 × 0.3 × 1000 = **360L**
**Expected Plant Capacity**: 10 × 12 = **120 plants**

#### Bed 4 (NFT):
- Name: `NFT Channel`
- Type: `NFT (Nutrient Film Technique)`
- Trough Length (m): `4.0`
- Number of Channels: `6`

Click **"Create System"**

✅ Verify: Console shows:
```
🌱 Grow bed 1 (dwc) data collected: {name: "DWC Bed 1", type: "dwc", length: 2.5, width: 1.2, height: 0.4}
🌱 Grow bed 2 (dwc) data collected: {name: "DWC Bed 2", type: "dwc", length: 3.0, width: 1.5, height: 0.5}
🌱 Grow bed 3 (vertical) data collected: {name: "Vertical Tower 1", type: "vertical", verticals: 10, plantsPerVertical: 12, length: 1.5, width: 0.8, height: 0.3}
🌱 Grow bed 4 (nft) data collected: {name: "NFT Channel", type: "nft", troughLength: 4.0, channels: 6}
✅ Total grow beds collected: 4
```

### 6. Verify Creation

✅ System appears in system selector dropdown
✅ Success notification appears
✅ Redirected to Plant Allocations tab

---

## Database Verification

Run this query to verify data was saved correctly:

\`\`\`sql
-- Check system
SELECT * FROM systems WHERE system_name = 'Test System Automated';

-- Check fish tanks (should show 3 tanks with volumes 5000L, 7000L, 3000L)
SELECT tank_number, name, volume_liters, fish_type, stocking_density
FROM fish_tanks
WHERE system_id = (SELECT id FROM systems WHERE system_name = 'Test System Automated')
ORDER BY tank_number;

-- Check grow beds
SELECT bed_number, bed_name, bed_type, volume_liters, area_m2, vertical_count, plants_per_vertical
FROM grow_beds
WHERE system_id = (SELECT id FROM systems WHERE system_name = 'Test System Automated')
ORDER BY bed_number;
\`\`\`

### Expected Results:

**Fish Tanks:**
| tank_number | name | volume_liters | fish_type |
|-------------|------|---------------|-----------|
| 1 | Tank 1 | 5000 | tilapia |
| 2 | Tank 2 | 7000 | catfish |
| 3 | Tank 3 | 3000 | trout |

**Total Fish Volume**: 15,000L ✅

**Grow Beds:**
| bed_number | bed_name | bed_type | volume_liters | area_m2 |
|------------|----------|----------|---------------|---------|
| 1 | DWC Bed 1 | dwc | 1200 | 3.0 |
| 2 | DWC Bed 2 | dwc | 2250 | 4.5 |
| 3 | Vertical Tower 1 | vertical | 360 | 6.0 |
| 4 | NFT Channel | nft | ~48 | ~24 |

**Total Grow Bed Volume**: ~3,858L ✅

---

## Success Criteria

✅ All fish tanks saved with correct volumes (not defaulting to 1000L)
✅ All grow beds saved with correct volumes
✅ Vertical bed has reservoir volume (not 0L)
✅ NFT bed has calculated volume
✅ Console logs show correct data collection
✅ No errors in console
✅ System appears in dropdown

---

## Common Issues to Watch For

❌ **Fish tanks all showing 1000L**: User didn't change default values
❌ **Vertical bed showing 0L**: Missing reservoir dimension fields
❌ **Property name mismatches**: Check console for undefined values
❌ **Modal doesn't open**: Check SystemCreationWizard initialization

---

## Cleanup After Test

To remove test system from database:

\`\`\`sql
DELETE FROM grow_beds WHERE system_id = (SELECT id FROM systems WHERE system_name = 'Test System Automated');
DELETE FROM fish_tanks WHERE system_id = (SELECT id FROM systems WHERE system_name = 'Test System Automated');
DELETE FROM systems WHERE system_name = 'Test System Automated';
\`\`\`
