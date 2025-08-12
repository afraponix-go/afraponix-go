# 🧪 CSS Design System Testing Plan

## Overview
This document organizes all CSS migration changes into logical testing groups for systematic review and feedback.

---

## 📋 Testing Group 1: BUTTONS & PRIMARY ACTIONS
**Focus**: All button styling and interactions across the app

### Areas to Test:
1. **Dashboard Tab**
   - Quick action buttons (Add Fish, Record Feeding, etc.)
   - Chart view buttons
   - Export/Import buttons

2. **Plant Management Tab**
   - Plant/Harvest action tabs
   - Record Plant/Record Harvest buttons
   - Export Data button

3. **Settings Tab**
   - Save Configuration buttons
   - Test Credentials button
   - Delete System button (danger zone)

### What to Check:
- [ ] Primary buttons are Deep Blue (#0051b1)
- [ ] Success buttons are Bio Green (#80FB7B) 
- [ ] Hover effects work (slight lift + shadow)
- [ ] Button text is readable
- [ ] Consistent spacing and sizing

### Known Locations:
- `/index.html` - All `btn btn-primary`, `btn btn-success`, `btn btn-secondary` classes

---

## 📋 Testing Group 2: DASHBOARD METRICS & CARDS
**Focus**: Dashboard visual components and metric displays

### Areas to Test:
1. **Overview Tab**
   - 8 metric cards (Total Fish, Plants Growing, etc.)
   - Plant metrics summary (4 cards)
   - Water quality status badges
   - Grow bed summary section

2. **Dashboard Tab**
   - Water quality charts
   - Nutrient level displays
   - System health indicators

### What to Check:
- [ ] Metric cards have proper icons and hover effects
- [ ] Values are large and readable
- [ ] Labels use consistent typography
- [ ] Cards have subtle shadows and borders
- [ ] Responsive grid layout works

### Known Locations:
- Lines 175-267: Dashboard metric cards
- Lines 715-738: Plant metrics summary
- Lines 366-375: Water quality badges

---

## 📋 Testing Group 3: FORMS & INPUT FIELDS
**Focus**: All form elements and data entry interfaces

### Areas to Test:
1. **Plant Management Tab**
   - Plant entry form (date, bed, crop, count)
   - Harvest entry form (date, bed, weight, quality)
   - Search and filter inputs

2. **Settings Tab → System Config**
   - System name and type inputs
   - Tank count and volume inputs
   - Grow bed configuration forms

3. **Settings Tab → Sensors**
   - Sensor configuration forms
   - ThingsBoard authentication forms
   - Data mapping dropdowns

4. **Calculators Tab**
   - Nutrient calculator inputs
   - Current nutrient level inputs

### What to Check:
- [ ] Input fields have consistent borders
- [ ] Focus states show blue outline
- [ ] Labels are properly styled
- [ ] Placeholder text is visible
- [ ] Form groups have proper spacing

### Known Locations:
- All `form-input`, `form-label`, `form-group` classes

---

## 📋 Testing Group 4: TYPOGRAPHY & HEADINGS
**Focus**: All text hierarchy and section headers

### Areas to Test:
1. **All Main Tabs**
   - Tab section headings (h2)
   - Subsection headings (h3)
   - Card titles (h4)

2. **Settings Tab**
   - Section headers with borders
   - Configuration panel headings
   - Help text and descriptions

3. **Modals**
   - Modal titles
   - Step titles in system creation
   - Confirmation dialog headings

### What to Check:
- [ ] Heading sizes follow hierarchy (h1 > h2 > h3 > h4)
- [ ] Section headers have bottom borders
- [ ] Text colors are consistent
- [ ] Secondary text is properly muted
- [ ] Small text is readable

### Known Locations:
- All `heading-1`, `heading-2`, `heading-3`, `heading-4` classes
- All `section-header` classes
- All `text-muted` and `text-small` classes

---

## 📋 Testing Group 5: AQUAPONICS-SPECIFIC COMPONENTS
**Focus**: Custom components for aquaponics system

### Areas to Test:
1. **Tank Indicators**
   - Fish tank status displays
   - Tank health indicators

2. **Grow Bed Status**
   - Bed status badges (active/empty/warning)
   - Planting progress bars
   - Allocation vs actual displays

3. **Water Quality Badges**
   - pH, temperature, oxygen badges
   - Quality level indicators (excellent/good/fair/poor)
   - Nutrient level displays

### What to Check:
- [ ] Tank indicators use Blue Fish color (#7BAAEE)
- [ ] Active beds show Bio Green (#80FB7B)
- [ ] Warning states are clearly visible
- [ ] Icons display correctly
- [ ] Status text is readable

### Known Locations:
- Tank indicators: `tank-indicator` class
- Bed status: `bed-status-active`, `bed-status-empty` classes
- Water quality: `water-quality` classes

---

## 📋 Testing Group 6: NAVIGATION & SYSTEM CHROME
**Focus**: App header, navigation, and system controls

### Areas to Test:
1. **Header**
   - App logo and title
   - System selector dropdown
   - User menu

2. **Tab Navigation**
   - Main tab buttons
   - Active tab highlighting
   - Sub-tab navigation in Settings

3. **Modals & Overlays**
   - Modal backgrounds
   - Close buttons
   - Modal headers and footers

### What to Check:
- [ ] Header uses Deep Blue primary color
- [ ] Active tabs have blue underline
- [ ] Hover states on navigation items
- [ ] System dropdown is styled consistently
- [ ] Modal overlays darken background

---

## 🔄 Testing Process

### For Each Group:
1. **Visual Check**: Does it look professional and consistent?
2. **Interaction Test**: Do hover/focus states work?
3. **Color Verification**: Are brand colors applied correctly?
4. **Spacing Review**: Is spacing consistent and comfortable?
5. **Responsive Check**: Does it work on different screen sizes?

### Feedback Format:
```
Group: [Number and Name]
Issue: [What's wrong]
Location: [Where you found it]
Expected: [What it should be]
Actual: [What you're seeing]
Screenshot: [If possible]
```

---

## 🎯 Priority Testing Order

1. **Start with Group 1 (Buttons)** - Most visible changes
2. **Then Group 2 (Dashboard)** - High-impact visual area
3. **Then Group 3 (Forms)** - Critical for functionality
4. **Then Group 4 (Typography)** - Overall consistency
5. **Then Group 5 (Aquaponics)** - Specialized components
6. **Finally Group 6 (Navigation)** - System chrome

---

## 📝 Notes

- Test in your actual browser at: http://localhost:8000
- Check both light backgrounds and any darker sections
- Try different zoom levels (90%, 100%, 110%)
- Test at least one form submission to ensure functionality

Ready to start with **Group 1: Buttons & Primary Actions**?