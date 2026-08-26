#!/usr/bin/env node

/**
 * Intelligent Fix Applier
 * Applies pattern-based fixes following successful repair strategies
 */

const fs = require('fs');
const path = require('path');

class IntelligentFixApplier {
    constructor() {
        this.fixes = [
        {
                "type": "duplicate_id_smart_fix",
                "description": "Rename duplicate form element \"harvest-date\" with context prefix",
                "file": "index.html",
                "action": "rename_with_context",
                "originalId": "harvest-date",
                "strategy": "form_context",
                "renames": [
                        "harvest-harvest-date",
                        "plant-harvest-date"
                ],
                "severity": "high"
        },
        {
                "type": "duplicate_id_smart_fix",
                "description": "Rename duplicate form element \"harvest-notes\" with context prefix",
                "file": "index.html",
                "action": "rename_with_context",
                "originalId": "harvest-notes",
                "strategy": "form_context",
                "renames": [
                        "harvest-harvest-notes",
                        "plant-harvest-notes"
                ],
                "severity": "high"
        },
        {
                "type": "duplicate_id_smart_fix",
                "description": "Rename duplicate modal element \"nutrient-modal-title\" with modal prefix",
                "file": "index.html",
                "action": "rename_with_context",
                "originalId": "nutrient-modal-title",
                "strategy": "modal_context",
                "renames": [
                        "main-nutrient-modal-title",
                        "secondary-nutrient-modal-title",
                        "popup-nutrient-modal-title"
                ],
                "severity": "high"
        },
        {
                "type": "duplicate_id_smart_fix",
                "description": "Rename duplicate section \"deficiency-images-grid\" with section prefix",
                "file": "index.html",
                "action": "rename_with_context",
                "originalId": "deficiency-images-grid",
                "strategy": "section_context",
                "renames": [
                        "primary-deficiency-images-grid",
                        "secondary-deficiency-images-grid",
                        "mobile-deficiency-images-grid"
                ],
                "severity": "medium"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"fish-density-chart\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "fish-density-chart",
                "checkPattern": "const canvas = document.getElementById('fish-density-chart');\n        if (!canvas) {\n            console.warn('Chart canvas fish-density-chart not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"plant-${nutrient}-chart-timestamp\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-${nutrient}-chart-timestamp",
                "checkPattern": "const canvas = document.getElementById('plant-${nutrient}-chart-timestamp');\n        if (!canvas) {\n            console.warn('Chart canvas plant-${nutrient}-chart-timestamp not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"growth-chart-container\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "growth-chart-container",
                "checkPattern": "const canvas = document.getElementById('growth-chart-container');\n        if (!canvas) {\n            console.warn('Chart canvas growth-chart-container not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"growth-chart-${tankId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "growth-chart-${tankId}",
                "checkPattern": "const canvas = document.getElementById('growth-chart-${tankId}');\n        if (!canvas) {\n            console.warn('Chart canvas growth-chart-${tankId} not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"fish-density-chart\"",
                "file": "public/js/modules/components/charts.js",
                "action": "add_defensive_check",
                "elementId": "fish-density-chart",
                "checkPattern": "const canvas = document.getElementById('fish-density-chart');\n        if (!canvas) {\n            console.warn('Chart canvas fish-density-chart not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"fish-density-chart\"",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "elementId": "fish-density-chart",
                "checkPattern": "const canvas = document.getElementById('fish-density-chart');\n        if (!canvas) {\n            console.warn('Chart canvas fish-density-chart not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"growth-chart-${tankId}\"",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "elementId": "growth-chart-${tankId}",
                "checkPattern": "const canvas = document.getElementById('growth-chart-${tankId}');\n        if (!canvas) {\n            console.warn('Chart canvas growth-chart-${tankId} not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"growth-chart-${tank.id}\"",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "elementId": "growth-chart-${tank.id}",
                "checkPattern": "const canvas = document.getElementById('growth-chart-${tank.id}');\n        if (!canvas) {\n            console.warn('Chart canvas growth-chart-${tank.id} not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_chart_element_fix",
                "description": "Add defensive check for chart element \"plant-${nutrientName}-chart-timestamp\"",
                "file": "public/js/modules/components/waterQuality.js",
                "action": "add_defensive_check",
                "elementId": "plant-${nutrientName}-chart-timestamp",
                "checkPattern": "const canvas = document.getElementById('plant-${nutrientName}-chart-timestamp');\n        if (!canvas) {\n            console.warn('Chart canvas plant-${nutrientName}-chart-timestamp not found in DOM');\n            return;\n        }",
                "severity": "high"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"admin-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "admin-btn",
                "checkPattern": "const element = document.getElementById('admin-btn');\n        if (!element) {\n            console.warn('Form element admin-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"forgot-password-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "forgot-password-form",
                "checkPattern": "const element = document.getElementById('forgot-password-form');\n        if (!element) {\n            console.warn('Form element forgot-password-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"continue-to-dashboard-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "continue-to-dashboard-btn",
                "checkPattern": "const element = document.getElementById('continue-to-dashboard-btn');\n        if (!element) {\n            console.warn('Form element continue-to-dashboard-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"back-to-login-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "back-to-login-btn",
                "checkPattern": "const element = document.getElementById('back-to-login-btn');\n        if (!element) {\n            console.warn('Form element back-to-login-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"verification-code-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "verification-code-form",
                "checkPattern": "const element = document.getElementById('verification-code-form');\n        if (!element) {\n            console.warn('Form element verification-code-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"verification-code-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "verification-code-form",
                "checkPattern": "const element = document.getElementById('verification-code-form');\n        if (!element) {\n            console.warn('Form element verification-code-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"quick-harvest-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "quick-harvest-form",
                "checkPattern": "const element = document.getElementById('quick-harvest-form');\n        if (!element) {\n            console.warn('Form element quick-harvest-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"plant-edit-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-form",
                "checkPattern": "const element = document.getElementById('plant-edit-form');\n        if (!element) {\n            console.warn('Form element plant-edit-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"zoom-in-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "zoom-in-btn",
                "checkPattern": "const element = document.getElementById('zoom-in-btn');\n        if (!element) {\n            console.warn('Form element zoom-in-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"zoom-out-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "zoom-out-btn",
                "checkPattern": "const element = document.getElementById('zoom-out-btn');\n        if (!element) {\n            console.warn('Form element zoom-out-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"reset-view-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "reset-view-btn",
                "checkPattern": "const element = document.getElementById('reset-view-btn');\n        if (!element) {\n            console.warn('Form element reset-view-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"toggle-labels-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "toggle-labels-btn",
                "checkPattern": "const element = document.getElementById('toggle-labels-btn');\n        if (!element) {\n            console.warn('Form element toggle-labels-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"toggle-labels-btn\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "toggle-labels-btn",
                "checkPattern": "const element = document.getElementById('toggle-labels-btn');\n        if (!element) {\n            console.warn('Form element toggle-labels-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"batch-harvest-form-${batchId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-harvest-form-${batchId}",
                "checkPattern": "const element = document.getElementById('batch-harvest-form-${batchId}');\n        if (!element) {\n            console.warn('Form element batch-harvest-form-${batchId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"batch-move-form-${batchId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-move-form-${batchId}",
                "checkPattern": "const element = document.getElementById('batch-move-form-${batchId}');\n        if (!element) {\n            console.warn('Form element batch-move-form-${batchId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"command-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "command-input",
                "checkPattern": "const element = document.getElementById('command-input');\n        if (!element) {\n            console.warn('Form element command-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"fish-health-entry-form\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "fish-health-entry-form",
                "checkPattern": "const element = document.getElementById('fish-health-entry-form');\n        if (!element) {\n            console.warn('Form element fish-health-entry-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"verification-form\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "elementId": "verification-form",
                "checkPattern": "const element = document.getElementById('verification-form');\n        if (!element) {\n            console.warn('Form element verification-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"verification-form\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "elementId": "verification-form",
                "checkPattern": "const element = document.getElementById('verification-form');\n        if (!element) {\n            console.warn('Form element verification-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"verification-form\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "elementId": "verification-form",
                "checkPattern": "const element = document.getElementById('verification-form');\n        if (!element) {\n            console.warn('Form element verification-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"allocation-form\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "elementId": "allocation-form",
                "checkPattern": "const element = document.getElementById('allocation-form');\n        if (!element) {\n            console.warn('Form element allocation-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"allocation-form\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "elementId": "allocation-form",
                "checkPattern": "const element = document.getElementById('allocation-form');\n        if (!element) {\n            console.warn('Form element allocation-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"toggle-labels-btn\"",
                "file": "public/js/modules/components/farmLayoutRenderer.js",
                "action": "add_defensive_check",
                "elementId": "toggle-labels-btn",
                "checkPattern": "const element = document.getElementById('toggle-labels-btn');\n        if (!element) {\n            console.warn('Form element toggle-labels-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"fish-health-entry-form\"",
                "file": "public/js/modules/components/fishTankManager.js",
                "action": "add_defensive_check",
                "elementId": "fish-health-entry-form",
                "checkPattern": "const element = document.getElementById('fish-health-entry-form');\n        if (!element) {\n            console.warn('Form element fish-health-entry-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"clear-fish-form\"",
                "file": "public/js/modules/components/fishTankManager.js",
                "action": "add_defensive_check",
                "elementId": "clear-fish-form",
                "checkPattern": "const element = document.getElementById('clear-fish-form');\n        if (!element) {\n            console.warn('Form element clear-fish-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"fish-health-entry-form\"",
                "file": "public/js/modules/components/fishTankManager.js",
                "action": "add_defensive_check",
                "elementId": "fish-health-entry-form",
                "checkPattern": "const element = document.getElementById('fish-health-entry-form');\n        if (!element) {\n            console.warn('Form element fish-health-entry-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"cancel-btn\"",
                "file": "public/js/modules/components/notificationManager.js",
                "action": "add_defensive_check",
                "elementId": "cancel-btn",
                "checkPattern": "const element = document.getElementById('cancel-btn');\n        if (!element) {\n            console.warn('Form element cancel-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"confirm-btn\"",
                "file": "public/js/modules/components/notificationManager.js",
                "action": "add_defensive_check",
                "elementId": "confirm-btn",
                "checkPattern": "const element = document.getElementById('confirm-btn');\n        if (!element) {\n            console.warn('Form element confirm-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"system-config-form\"",
                "file": "public/js/modules/components/systemConfigManager.js",
                "action": "add_defensive_check",
                "elementId": "system-config-form",
                "checkPattern": "const element = document.getElementById('system-config-form');\n        if (!element) {\n            console.warn('Form element system-config-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"create-system-form\"",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "elementId": "create-system-form",
                "checkPattern": "const element = document.getElementById('create-system-form');\n        if (!element) {\n            console.warn('Form element create-system-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"bulk-tank-monitoring-form\"",
                "file": "public/js/modules/components/tankMonitoringForm.js",
                "action": "add_defensive_check",
                "elementId": "bulk-tank-monitoring-form",
                "checkPattern": "const element = document.getElementById('bulk-tank-monitoring-form');\n        if (!element) {\n            console.warn('Form element bulk-tank-monitoring-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"clear-all-btn\"",
                "file": "public/js/modules/components/tankMonitoringForm.js",
                "action": "add_defensive_check",
                "elementId": "clear-all-btn",
                "checkPattern": "const element = document.getElementById('clear-all-btn');\n        if (!element) {\n            console.warn('Form element clear-all-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"bulk-tank-monitoring-form\"",
                "file": "public/js/modules/components/tankMonitoringForm.js",
                "action": "add_defensive_check",
                "elementId": "bulk-tank-monitoring-form",
                "checkPattern": "const element = document.getElementById('bulk-tank-monitoring-form');\n        if (!element) {\n            console.warn('Form element bulk-tank-monitoring-form not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"data_transform\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "data_transform",
                "checkPattern": "const element = document.getElementById('data_transform');\n        if (!element) {\n            console.warn('Form element data_transform not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"admin-settings-btn\"",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "elementId": "admin-settings-btn",
                "checkPattern": "const element = document.getElementById('admin-settings-btn');\n        if (!element) {\n            console.warn('Form element admin-settings-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"admin-settings-btn\"",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "elementId": "admin-settings-btn",
                "checkPattern": "const element = document.getElementById('admin-settings-btn');\n        if (!element) {\n            console.warn('Form element admin-settings-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"admin-settings-btn\"",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "elementId": "admin-settings-btn",
                "checkPattern": "const element = document.getElementById('admin-settings-btn');\n        if (!element) {\n            console.warn('Form element admin-settings-btn not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "public/js/modules/services/customCropHandler.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "public/js/modules/services/customCropHandler.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_form_element_fix",
                "description": "Add defensive handling for form element \"custom-crop-name-input\"",
                "file": "public/js/modules/services/customCropHandler.js",
                "action": "add_defensive_check",
                "elementId": "custom-crop-name-input",
                "checkPattern": "const element = document.getElementById('custom-crop-name-input');\n        if (!element) {\n            console.warn('Form element custom-crop-name-input not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"close-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "close-modal",
                "checkPattern": "const modal = document.getElementById('close-modal');\n        if (!modal) {\n            console.warn('Modal element close-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"close-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "close-modal",
                "checkPattern": "const modal = document.getElementById('close-modal');\n        if (!modal) {\n            console.warn('Modal element close-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"quick-harvest-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "quick-harvest-modal",
                "checkPattern": "const modal = document.getElementById('quick-harvest-modal');\n        if (!modal) {\n            console.warn('Modal element quick-harvest-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"quick-harvest-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "quick-harvest-modal",
                "checkPattern": "const modal = document.getElementById('quick-harvest-modal');\n        if (!modal) {\n            console.warn('Modal element quick-harvest-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"plant-edit-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-modal",
                "checkPattern": "const modal = document.getElementById('plant-edit-modal');\n        if (!modal) {\n            console.warn('Modal element plant-edit-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"plant-edit-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-modal",
                "checkPattern": "const modal = document.getElementById('plant-edit-modal');\n        if (!modal) {\n            console.warn('Modal element plant-edit-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"plant-edit-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-modal",
                "checkPattern": "const modal = document.getElementById('plant-edit-modal');\n        if (!modal) {\n            console.warn('Modal element plant-edit-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"plant-edit-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-modal",
                "checkPattern": "const modal = document.getElementById('plant-edit-modal');\n        if (!modal) {\n            console.warn('Modal element plant-edit-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"plant-edit-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "plant-edit-modal",
                "checkPattern": "const modal = document.getElementById('plant-edit-modal');\n        if (!modal) {\n            console.warn('Modal element plant-edit-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-harvest-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-harvest-modal",
                "checkPattern": "const modal = document.getElementById('inline-harvest-modal');\n        if (!modal) {\n            console.warn('Modal element inline-harvest-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-harvest-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-harvest-modal",
                "checkPattern": "const modal = document.getElementById('inline-harvest-modal');\n        if (!modal) {\n            console.warn('Modal element inline-harvest-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-harvest-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-harvest-modal",
                "checkPattern": "const modal = document.getElementById('inline-harvest-modal');\n        if (!modal) {\n            console.warn('Modal element inline-harvest-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-plant-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-plant-modal",
                "checkPattern": "const modal = document.getElementById('inline-plant-modal');\n        if (!modal) {\n            console.warn('Modal element inline-plant-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-selection-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-selection-modal",
                "checkPattern": "const modal = document.getElementById('batch-selection-modal');\n        if (!modal) {\n            console.warn('Modal element batch-selection-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-plant-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-plant-modal",
                "checkPattern": "const modal = document.getElementById('inline-plant-modal');\n        if (!modal) {\n            console.warn('Modal element inline-plant-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"inline-plant-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "inline-plant-modal",
                "checkPattern": "const modal = document.getElementById('inline-plant-modal');\n        if (!modal) {\n            console.warn('Modal element inline-plant-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-selection-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-selection-modal",
                "checkPattern": "const modal = document.getElementById('batch-selection-modal');\n        if (!modal) {\n            console.warn('Modal element batch-selection-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-harvest-weight-${modalId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-harvest-weight-${modalId}",
                "checkPattern": "const modal = document.getElementById('batch-harvest-weight-${modalId}');\n        if (!modal) {\n            console.warn('Modal element batch-harvest-weight-${modalId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-harvest-count-${modalId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-harvest-count-${modalId}",
                "checkPattern": "const modal = document.getElementById('batch-harvest-count-${modalId}');\n        if (!modal) {\n            console.warn('Modal element batch-harvest-count-${modalId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-harvest-notes-${modalId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-harvest-notes-${modalId}",
                "checkPattern": "const modal = document.getElementById('batch-harvest-notes-${modalId}');\n        if (!modal) {\n            console.warn('Modal element batch-harvest-notes-${modalId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"component-modal-overlay\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "component-modal-overlay",
                "checkPattern": "const modal = document.getElementById('component-modal-overlay');\n        if (!modal) {\n            console.warn('Modal element component-modal-overlay not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-move-bed-${modalId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-move-bed-${modalId}",
                "checkPattern": "const modal = document.getElementById('batch-move-bed-${modalId}');\n        if (!modal) {\n            console.warn('Modal element batch-move-bed-${modalId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-move-count-${modalId}\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-move-count-${modalId}",
                "checkPattern": "const modal = document.getElementById('batch-move-count-${modalId}');\n        if (!modal) {\n            console.warn('Modal element batch-move-count-${modalId} not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"component-modal-overlay\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "component-modal-overlay",
                "checkPattern": "const modal = document.getElementById('component-modal-overlay');\n        if (!modal) {\n            console.warn('Modal element component-modal-overlay not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"programme-details-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "programme-details-modal",
                "checkPattern": "const modal = document.getElementById('programme-details-modal');\n        if (!modal) {\n            console.warn('Modal element programme-details-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"programme-details-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "programme-details-modal",
                "checkPattern": "const modal = document.getElementById('programme-details-modal');\n        if (!modal) {\n            console.warn('Modal element programme-details-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"edit-fish-entry-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "edit-fish-entry-modal",
                "checkPattern": "const modal = document.getElementById('edit-fish-entry-modal');\n        if (!modal) {\n            console.warn('Modal element edit-fish-entry-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-selection-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-selection-modal",
                "checkPattern": "const modal = document.getElementById('batch-selection-modal');\n        if (!modal) {\n            console.warn('Modal element batch-selection-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"batch-selection-modal\"",
                "file": "script.js",
                "action": "add_defensive_check",
                "elementId": "batch-selection-modal",
                "checkPattern": "const modal = document.getElementById('batch-selection-modal');\n        if (!modal) {\n            console.warn('Modal element batch-selection-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"add-allocation-modal\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "elementId": "add-allocation-modal",
                "checkPattern": "const modal = document.getElementById('add-allocation-modal');\n        if (!modal) {\n            console.warn('Modal element add-allocation-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"add-allocation-modal\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "elementId": "add-allocation-modal",
                "checkPattern": "const modal = document.getElementById('add-allocation-modal');\n        if (!modal) {\n            console.warn('Modal element add-allocation-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"create-system-modal\"",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "elementId": "create-system-modal",
                "checkPattern": "const modal = document.getElementById('create-system-modal');\n        if (!modal) {\n            console.warn('Modal element create-system-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"add-sensor-modal\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "add-sensor-modal",
                "checkPattern": "const modal = document.getElementById('add-sensor-modal');\n        if (!modal) {\n            console.warn('Modal element add-sensor-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"sensor-modal-title\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "sensor-modal-title",
                "checkPattern": "const modal = document.getElementById('sensor-modal-title');\n        if (!modal) {\n            console.warn('Modal element sensor-modal-title not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"add-sensor-modal\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "add-sensor-modal",
                "checkPattern": "const modal = document.getElementById('add-sensor-modal');\n        if (!modal) {\n            console.warn('Modal element add-sensor-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"add-sensor-modal\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "add-sensor-modal",
                "checkPattern": "const modal = document.getElementById('add-sensor-modal');\n        if (!modal) {\n            console.warn('Modal element add-sensor-modal not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_modal_element_fix",
                "description": "Add defensive check for modal element \"sensor-modal-title\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "elementId": "sensor-modal-title",
                "checkPattern": "const modal = document.getElementById('sensor-modal-title');\n        if (!modal) {\n            console.warn('Modal element sensor-modal-title not found in DOM');\n            return;\n        }",
                "severity": "medium"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"smtp-section\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "smtp-section",
                "checkPattern": "if (!document.getElementById('smtp-section')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"nutrient-recommendations-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "nutrient-recommendations-container",
                "checkPattern": "if (!document.getElementById('nutrient-recommendations-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"grow-bed-allocation-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "grow-bed-allocation-container",
                "checkPattern": "if (!document.getElementById('grow-bed-allocation-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"grow-bed-allocation-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "grow-bed-allocation-container",
                "checkPattern": "if (!document.getElementById('grow-bed-allocation-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"plant-allocation-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "plant-allocation-container",
                "checkPattern": "if (!document.getElementById('plant-allocation-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"systems-list-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "systems-list-container",
                "checkPattern": "if (!document.getElementById('systems-list-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"grow-bed-allocation-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "grow-bed-allocation-container",
                "checkPattern": "if (!document.getElementById('grow-bed-allocation-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"grow-bed-allocation-container\"",
                "file": "script.js",
                "action": "add_null_check",
                "elementId": "grow-bed-allocation-container",
                "checkPattern": "if (!document.getElementById('grow-bed-allocation-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"auth-container\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_null_check",
                "elementId": "auth-container",
                "checkPattern": "if (!document.getElementById('auth-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"app-container\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_null_check",
                "elementId": "app-container",
                "checkPattern": "if (!document.getElementById('app-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"auth-container\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_null_check",
                "elementId": "auth-container",
                "checkPattern": "if (!document.getElementById('auth-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"app-container\"",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_null_check",
                "elementId": "app-container",
                "checkPattern": "if (!document.getElementById('app-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"allocation-management-content\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_null_check",
                "elementId": "allocation-management-content",
                "checkPattern": "if (!document.getElementById('allocation-management-content')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"allocation-management-content\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_null_check",
                "elementId": "allocation-management-content",
                "checkPattern": "if (!document.getElementById('allocation-management-content')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"allocation-summary-content\"",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_null_check",
                "elementId": "allocation-summary-content",
                "checkPattern": "if (!document.getElementById('allocation-summary-content')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"move-section-${batchModalId}\"",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_null_check",
                "elementId": "move-section-${batchModalId}",
                "checkPattern": "if (!document.getElementById('move-section-${batchModalId}')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"deficiency-images-container\"",
                "file": "public/js/modules/components/nutrientManager.js",
                "action": "add_null_check",
                "elementId": "deficiency-images-container",
                "checkPattern": "if (!document.getElementById('deficiency-images-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"nutrient-alerts-container\"",
                "file": "public/js/modules/components/nutrients/nutrientAlerts.js",
                "action": "add_null_check",
                "elementId": "nutrient-alerts-container",
                "checkPattern": "if (!document.getElementById('nutrient-alerts-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"sensor-management-container\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_null_check",
                "elementId": "sensor-management-container",
                "checkPattern": "if (!document.getElementById('sensor-management-container')) return;",
                "severity": "low"
        },
        {
                "type": "missing_container_element_fix",
                "description": "Add null check for container \"sensor-status-container\"",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_null_check",
                "elementId": "sensor-status-container",
                "checkPattern": "if (!document.getElementById('sensor-status-container')) return;",
                "severity": "low"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"dashboard-overview-content\" to tab \"dashboard-overview-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "dashboard-overview-tab",
                "targetId": "dashboard-overview-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"dashboard-overview-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "dashboard-overview-content",
                "tabId": "dashboard-overview-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"dashboard-farm-layout-content\" to tab \"dashboard-farm-layout-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "dashboard-farm-layout-tab",
                "targetId": "dashboard-farm-layout-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"dashboard-farm-layout-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "dashboard-farm-layout-content",
                "tabId": "dashboard-farm-layout-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"dashboard-actions-content\" to tab \"dashboard-actions-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "dashboard-actions-tab",
                "targetId": "dashboard-actions-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"dashboard-actions-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "dashboard-actions-content",
                "tabId": "dashboard-actions-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"fish-calc-content\" to tab \"fish-calc-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "fish-calc-tab",
                "targetId": "fish-calc-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"fish-calc-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "fish-calc-content",
                "tabId": "fish-calc-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"nutrient-calc-content\" to tab \"nutrient-calc-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "nutrient-calc-tab",
                "targetId": "nutrient-calc-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"nutrient-calc-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "nutrient-calc-content",
                "tabId": "nutrient-calc-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"quick-calc-content\" to tab \"quick-calc-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "quick-calc-tab",
                "targetId": "quick-calc-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"quick-calc-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "quick-calc-content",
                "tabId": "quick-calc-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"mixing-schedule-content\" to tab \"mixing-schedule-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "mixing-schedule-tab",
                "targetId": "mixing-schedule-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"mixing-schedule-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "mixing-schedule-content",
                "tabId": "mixing-schedule-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"custom-nutrients-content\" to tab \"custom-nutrients-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "custom-nutrients-tab",
                "targetId": "custom-nutrients-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"custom-nutrients-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "custom-nutrients-content",
                "tabId": "custom-nutrients-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"water-quality-content\" to tab \"water-quality-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "water-quality-tab",
                "targetId": "water-quality-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"water-quality-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "water-quality-content",
                "tabId": "water-quality-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"operations-content\" to tab \"operations-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "operations-tab",
                "targetId": "operations-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"operations-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "operations-content",
                "tabId": "operations-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"plant-overview-content\" to tab \"plant-overview-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "plant-overview-tab",
                "targetId": "plant-overview-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"plant-overview-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "plant-overview-content",
                "tabId": "plant-overview-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"grow-beds-content\" to tab \"grow-beds-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "grow-beds-tab",
                "targetId": "grow-beds-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"grow-beds-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "grow-beds-content",
                "tabId": "grow-beds-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"planting-harvesting-content\" to tab \"planting-harvesting-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "planting-harvesting-tab",
                "targetId": "planting-harvesting-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"planting-harvesting-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "planting-harvesting-content",
                "tabId": "planting-harvesting-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"spray-programmes-content\" to tab \"spray-programmes-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "spray-programmes-tab",
                "targetId": "spray-programmes-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"spray-programmes-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "spray-programmes-content",
                "tabId": "spray-programmes-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"custom-crops-content\" to tab \"custom-crops-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "custom-crops-tab",
                "targetId": "custom-crops-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"custom-crops-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "custom-crops-content",
                "tabId": "custom-crops-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"beds-overview-subtab\" to tab \"beds-overview-subtab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "beds-overview-subtab",
                "targetId": "beds-overview-subtab",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"beds-overview-subtab\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "beds-overview-subtab",
                "tabId": "beds-overview-subtab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"plants-management-subtab\" to tab \"plants-management-subtab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "plants-management-subtab",
                "targetId": "plants-management-subtab",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"plants-management-subtab\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "plants-management-subtab",
                "tabId": "plants-management-subtab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"planting-content\" to tab \"planting-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "planting-tab",
                "targetId": "planting-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"planting-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "planting-content",
                "tabId": "planting-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"harvesting-content\" to tab \"harvesting-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "harvesting-tab",
                "targetId": "harvesting-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"harvesting-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "harvesting-content",
                "tabId": "harvesting-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"insecticides-content\" to tab \"insecticides-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "insecticides-tab",
                "targetId": "insecticides-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"insecticides-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "insecticides-content",
                "tabId": "insecticides-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"fungicides-content\" to tab \"fungicides-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "fungicides-tab",
                "targetId": "fungicides-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"fungicides-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "fungicides-content",
                "tabId": "fungicides-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"foliar-feeds-content\" to tab \"foliar-feeds-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "foliar-feeds-tab",
                "targetId": "foliar-feeds-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"foliar-feeds-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "foliar-feeds-content",
                "tabId": "foliar-feeds-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"edit-water-quality-content\" to tab \"edit-water-quality-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "edit-water-quality-tab",
                "targetId": "edit-water-quality-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"edit-water-quality-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "edit-water-quality-content",
                "tabId": "edit-water-quality-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"edit-fish-health-content\" to tab \"edit-fish-health-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "edit-fish-health-tab",
                "targetId": "edit-fish-health-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"edit-fish-health-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "edit-fish-health-content",
                "tabId": "edit-fish-health-tab",
                "severity": "high"
        },
        {
                "type": "tab_target_attribute_fix",
                "description": "Add data-target=\"edit-operations-content\" to tab \"edit-operations-tab\"",
                "file": "index.html",
                "action": "add_data_target",
                "tabId": "edit-operations-tab",
                "targetId": "edit-operations-content",
                "severity": "high"
        },
        {
                "type": "tab_content_container_fix",
                "description": "Create content container \"edit-operations-content\"",
                "file": "index.html",
                "action": "create_tab_content",
                "contentId": "edit-operations-content",
                "tabId": "edit-operations-tab",
                "severity": "high"
        },
        {
                "type": "error_manager_creation",
                "description": "Create central error deduplication manager",
                "file": "script.js",
                "action": "add_error_manager",
                "managerCode": "\n    /**\n     * Central Error Deduplication Manager\n     * Prevents console spam from repeated warnings\n     */\n    class ErrorManager {\n        constructor() {\n            this.warningCache = new Map();\n            this.errorCache = new Map();\n            this.throttleTime = 5000; // 5 seconds\n        }\n\n        /**\n         * Deduplicated warning (following nutrient warning pattern)\n         */\n        warnOnce(key, message, context = '') {\n            const now = Date.now();\n            const cacheKey = `${key}:${context}`;\n            \n            if (!this.warningCache.has(cacheKey) || \n                (now - this.warningCache.get(cacheKey)) > this.throttleTime) {\n                console.warn(message);\n                this.warningCache.set(cacheKey, now);\n                return true;\n            }\n            return false;\n        }\n\n        /**\n         * Deduplicated error logging\n         */\n        errorOnce(key, message, error = null) {\n            const now = Date.now();\n            \n            if (!this.errorCache.has(key) || \n                (now - this.errorCache.get(key)) > this.throttleTime) {\n                console.error(message, error);\n                this.errorCache.set(key, now);\n                return true;\n            }\n            return false;\n        }\n\n        /**\n         * Clear old cache entries (prevent memory leaks)\n         */\n        clearOldEntries() {\n            const now = Date.now();\n            const maxAge = this.throttleTime * 10; // 50 seconds\n            \n            for (const [key, timestamp] of this.warningCache.entries()) {\n                if (now - timestamp > maxAge) {\n                    this.warningCache.delete(key);\n                }\n            }\n            \n            for (const [key, timestamp] of this.errorCache.entries()) {\n                if (now - timestamp > maxAge) {\n                    this.errorCache.delete(key);\n                }\n            }\n        }\n    }\n\n    // Global error manager instance\n    window.errorManager = new ErrorManager();\n    \n    // Clear old entries every minute\n    setInterval(() => {\n        window.errorManager.clearOldEntries();\n    }, 60000);",
                "severity": "medium"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Notification container not found, falling back to alert\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Notification container not found, falling back to alert",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 447,
                                "code": "console.warn('Notification container not found, falling back to alert');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Notification container not found, falling back to alert\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Notification container not found, falling back to alert', `Notification container not found, falling back to alert`, systemId || 'global');\n        } else {\n            console.warn(`Notification container not found, falling back to alert`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Auth modal setup skipped - login/register buttons not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Auth modal setup skipped - login/register buttons not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 1204,
                                "code": "console.warn('Auth modal setup skipped - login/register buttons not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Auth modal setup skipped - login/register buttons not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Auth modal setup skipped - login/register buttons not found', `Auth modal setup skipped - login/register buttons not found`, systemId || 'global');\n        } else {\n            console.warn(`Auth modal setup skipped - login/register buttons not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Canvas element {} not found\" warnings",
                "files": [
                        "script.js",
                        "public/js/modules/components/charts.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Canvas element {} not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 4339,
                                "code": "console.warn(`Canvas element ${canvasId} not found`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Canvas element ${canvasId} not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        },
                        {
                                "file": "public/js/modules/components/charts.js",
                                "line": 87,
                                "code": "console.warn(`Canvas element ${canvasId} not found`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Canvas element ${canvasId} not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Canvas element {} not found', `Canvas element {} not found`, systemId || 'global');\n        } else {\n            console.warn(`Canvas element {} not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"plant-overview-container not found\" warnings",
                "files": [
                        "script.js",
                        "public/js/modules/components/plantManagement.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "plant-overview-container not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 8518,
                                "code": "console.warn('plant-overview-container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"plant-overview-container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        },
                        {
                                "file": "public/js/modules/components/plantManagement.js",
                                "line": 32,
                                "code": "console.warn('plant-overview-container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"plant-overview-container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('plant-overview-container not found', `plant-overview-container not found`, systemId || 'global');\n        } else {\n            console.warn(`plant-overview-container not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ Add deficiency image button not found\" warnings",
                "files": [
                        "script.js",
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ Add deficiency image button not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 31175,
                                "code": "console.log('❌ Add deficiency image button not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ Add deficiency image button not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        },
                        {
                                "file": "script.js",
                                "line": 31342,
                                "code": "console.log('❌ Add deficiency image button not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ Add deficiency image button not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ Add deficiency image button not found', `❌ Add deficiency image button not found`, systemId || 'global');\n        } else {\n            console.warn(`❌ Add deficiency image button not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ Upload form not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ Upload form not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 31199,
                                "code": "console.log('❌ Upload form not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ Upload form not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ Upload form not found', `❌ Upload form not found`, systemId || 'global');\n        } else {\n            console.warn(`❌ Upload form not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ URL form not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ URL form not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 31213,
                                "code": "console.log('❌ URL form not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ URL form not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ URL form not found', `❌ URL form not found`, systemId || 'global');\n        } else {\n            console.warn(`❌ URL form not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ File input not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ File input not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 31224,
                                "code": "console.log('❌ File input not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ File input not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ File input not found', `❌ File input not found`, systemId || 'global');\n        } else {\n            console.warn(`❌ File input not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Crop select elements not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Crop select elements not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 31754,
                                "code": "console.warn('Crop select elements not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Crop select elements not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Crop select elements not found', `Crop select elements not found`, systemId || 'global');\n        } else {\n            console.warn(`Crop select elements not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ Deficiency subtab element not found\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ Deficiency subtab element not found",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 32059,
                                "code": "console.log('❌ Deficiency subtab element not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ Deficiency subtab element not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ Deficiency subtab element not found', `❌ Deficiency subtab element not found`, systemId || 'global');\n        } else {\n            console.warn(`❌ Deficiency subtab element not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"❌ Button not found - run window.forceInitDeficiencyImages() first\" warnings",
                "files": [
                        "script.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "❌ Button not found - run window.forceInitDeficiencyImages() first",
                "issues": [
                        {
                                "file": "script.js",
                                "line": 32133,
                                "code": "console.log('❌ Button not found - run window.forceInitDeficiencyImages() first');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"❌ Button not found - run window.forceInitDeficiencyImages() first\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('❌ Button not found - run window.forceInitDeficiencyImages() first', `❌ Button not found - run window.forceInitDeficiencyImages() first`, systemId || 'global');\n        } else {\n            console.warn(`❌ Button not found - run window.forceInitDeficiencyImages() first`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"History table not found\" warnings",
                "files": [
                        "public/js/modules/components/chartModal.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "History table not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/chartModal.js",
                                "line": 394,
                                "code": "console.warn('History table not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"History table not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('History table not found', `History table not found`, systemId || 'global');\n        } else {\n            console.warn(`History table not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Chart {} not found\" warnings",
                "files": [
                        "public/js/modules/components/charts.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Chart {} not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/charts.js",
                                "line": 259,
                                "code": "console.warn(`Chart ${chartId} not found`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Chart ${chartId} not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Chart {} not found', `Chart {} not found`, systemId || 'global');\n        } else {\n            console.warn(`Chart {} not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Fish density chart canvas not found, skipping initialization\" warnings",
                "files": [
                        "public/js/modules/components/charts.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Fish density chart canvas not found, skipping initialization",
                "issues": [
                        {
                                "file": "public/js/modules/components/charts.js",
                                "line": 279,
                                "code": "console.log('⚠️ Fish density chart canvas not found, skipping initialization');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Fish density chart canvas not found, skipping initialization\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Fish density chart canvas not found, skipping initialization', `⚠️ Fish density chart canvas not found, skipping initialization`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Fish density chart canvas not found, skipping initialization`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"showEditCustomCropModal method not found in app\" warnings",
                "files": [
                        "public/js/modules/components/customCropManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "showEditCustomCropModal method not found in app",
                "issues": [
                        {
                                "file": "public/js/modules/components/customCropManager.js",
                                "line": 213,
                                "code": "console.warn('showEditCustomCropModal method not found in app');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"showEditCustomCropModal method not found in app\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('showEditCustomCropModal method not found in app', `showEditCustomCropModal method not found in app`, systemId || 'global');\n        } else {\n            console.warn(`showEditCustomCropModal method not found in app`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Chart canvas not found: {}\" warnings",
                "files": [
                        "public/js/modules/components/dashboard.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Chart canvas not found: {}",
                "issues": [
                        {
                                "file": "public/js/modules/components/dashboard.js",
                                "line": 72,
                                "code": "console.warn(`⚠️ Chart canvas not found: ${chartId}`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Chart canvas not found: ${chartId}\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Chart canvas not found: {}', `⚠️ Chart canvas not found: {}`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Chart canvas not found: {}`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Plant overview container not found\" warnings",
                "files": [
                        "public/js/modules/components/dashboardOverviewManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Plant overview container not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/dashboardOverviewManager.js",
                                "line": 36,
                                "code": "console.warn('Plant overview container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Plant overview container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Plant overview container not found', `Plant overview container not found`, systemId || 'global');\n        } else {\n            console.warn(`Plant overview container not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Dashboard navigation button not found\" warnings",
                "files": [
                        "public/js/modules/components/dashboardUI.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Dashboard navigation button not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/dashboardUI.js",
                                "line": 377,
                                "code": "console.warn('Dashboard navigation button not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Dashboard navigation button not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Dashboard navigation button not found', `Dashboard navigation button not found`, systemId || 'global');\n        } else {\n            console.warn(`Dashboard navigation button not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Fish density chart canvas not found\" warnings",
                "files": [
                        "public/js/modules/components/fishManagement.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Fish density chart canvas not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/fishManagement.js",
                                "line": 481,
                                "code": "console.warn('⚠️ Fish density chart canvas not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Fish density chart canvas not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Fish density chart canvas not found', `⚠️ Fish density chart canvas not found`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Fish density chart canvas not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Form {} not found\" warnings",
                "files": [
                        "public/js/modules/components/formValidator.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Form {} not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/formValidator.js",
                                "line": 330,
                                "code": "console.warn(`Form ${formId} not found`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Form ${formId} not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Form {} not found', `Form {} not found`, systemId || 'global');\n        } else {\n            console.warn(`Form {} not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Chart.js not available or container not found:\" warnings",
                "files": [
                        "public/js/modules/components/growBeds/growBedChart.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Chart.js not available or container not found:",
                "issues": [
                        {
                                "file": "public/js/modules/components/growBeds/growBedChart.js",
                                "line": 27,
                                "code": "console.warn('⚠️ Chart.js not available or container not found:', containerId);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Chart.js not available or container not found:\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Chart.js not available or container not found:', `⚠️ Chart.js not available or container not found:`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Chart.js not available or container not found:`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Grow beds config container not found\" warnings",
                "files": [
                        "public/js/modules/components/growBeds/growBedList.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Grow beds config container not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/growBeds/growBedList.js",
                                "line": 27,
                                "code": "console.warn('⚠️ Grow beds config container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Grow beds config container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Grow beds config container not found', `⚠️ Grow beds config container not found`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Grow beds config container not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Login slideout elements not found\" warnings",
                "files": [
                        "public/js/modules/components/modalManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Login slideout elements not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/modalManager.js",
                                "line": 55,
                                "code": "console.warn('Login slideout elements not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Login slideout elements not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Login slideout elements not found', `Login slideout elements not found`, systemId || 'global');\n        } else {\n            console.warn(`Login slideout elements not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Register slideout elements not found\" warnings",
                "files": [
                        "public/js/modules/components/modalManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Register slideout elements not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/modalManager.js",
                                "line": 78,
                                "code": "console.warn('Register slideout elements not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Register slideout elements not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Register slideout elements not found', `Register slideout elements not found`, systemId || 'global');\n        } else {\n            console.warn(`Register slideout elements not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Forgot password slideout elements not found\" warnings",
                "files": [
                        "public/js/modules/components/modalManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Forgot password slideout elements not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/modalManager.js",
                                "line": 106,
                                "code": "console.warn('Forgot password slideout elements not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Forgot password slideout elements not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Forgot password slideout elements not found', `Forgot password slideout elements not found`, systemId || 'global');\n        } else {\n            console.warn(`Forgot password slideout elements not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Confirmation modal elements not found\" warnings",
                "files": [
                        "public/js/modules/components/modalManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Confirmation modal elements not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/modalManager.js",
                                "line": 208,
                                "code": "console.warn('Confirmation modal elements not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Confirmation modal elements not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Confirmation modal elements not found', `Confirmation modal elements not found`, systemId || 'global');\n        } else {\n            console.warn(`Confirmation modal elements not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Ratio rules container not found\" warnings",
                "files": [
                        "public/js/modules/components/nutrients/nutrientDisplay.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Ratio rules container not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/nutrients/nutrientDisplay.js",
                                "line": 145,
                                "code": "console.warn('Ratio rules container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Ratio rules container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Ratio rules container not found', `Ratio rules container not found`, systemId || 'global');\n        } else {\n            console.warn(`Ratio rules container not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Environmental adjustments container not found\" warnings",
                "files": [
                        "public/js/modules/components/nutrients/nutrientDisplay.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Environmental adjustments container not found",
                "issues": [
                        {
                                "file": "public/js/modules/components/nutrients/nutrientDisplay.js",
                                "line": 289,
                                "code": "console.warn('Environmental adjustments container not found');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Environmental adjustments container not found\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Environmental adjustments container not found', `Environmental adjustments container not found`, systemId || 'global');\n        } else {\n            console.warn(`Environmental adjustments container not found`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"recordSprayApplication method not found in app\" warnings",
                "files": [
                        "public/js/modules/components/sprayApplicationManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "recordSprayApplication method not found in app",
                "issues": [
                        {
                                "file": "public/js/modules/components/sprayApplicationManager.js",
                                "line": 334,
                                "code": "console.warn('recordSprayApplication method not found in app');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"recordSprayApplication method not found in app\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('recordSprayApplication method not found in app', `recordSprayApplication method not found in app`, systemId || 'global');\n        } else {\n            console.warn(`recordSprayApplication method not found in app`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"editSprayProgramme method not found in app\" warnings",
                "files": [
                        "public/js/modules/components/sprayApplicationManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "editSprayProgramme method not found in app",
                "issues": [
                        {
                                "file": "public/js/modules/components/sprayApplicationManager.js",
                                "line": 351,
                                "code": "console.warn('editSprayProgramme method not found in app');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"editSprayProgramme method not found in app\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('editSprayProgramme method not found in app', `editSprayProgramme method not found in app`, systemId || 'global');\n        } else {\n            console.warn(`editSprayProgramme method not found in app`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Component {} not found, skipping initialization\" warnings",
                "files": [
                        "public/js/modules/services/appCore.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Component {} not found, skipping initialization",
                "issues": [
                        {
                                "file": "public/js/modules/services/appCore.js",
                                "line": 248,
                                "code": "console.warn(`⚠️ Component ${className} not found, skipping initialization`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Component ${className} not found, skipping initialization\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Component {} not found, skipping initialization', `⚠️ Component {} not found, skipping initialization`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Component {} not found, skipping initialization`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ System {} not found in available systems:\" warnings",
                "files": [
                        "public/js/modules/services/systemManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ System {} not found in available systems:",
                "issues": [
                        {
                                "file": "public/js/modules/services/systemManager.js",
                                "line": 98,
                                "code": "console.warn(`⚠️ System ${systemId} not found in available systems:`, Object.keys(this.systems));",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ System ${systemId} not found in available systems:\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ System {} not found in available systems:', `⚠️ System {} not found in available systems:`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ System {} not found in available systems:`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"⚠️ Legacy dropdown (#active-system) not found in DOM\" warnings",
                "files": [
                        "public/js/modules/services/systemManager.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "⚠️ Legacy dropdown (#active-system) not found in DOM",
                "issues": [
                        {
                                "file": "public/js/modules/services/systemManager.js",
                                "line": 264,
                                "code": "console.warn('⚠️ Legacy dropdown (#active-system) not found in DOM');",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"⚠️ Legacy dropdown (#active-system) not found in DOM\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('⚠️ Legacy dropdown (#active-system) not found in DOM', `⚠️ Legacy dropdown (#active-system) not found in DOM`, systemId || 'global');\n        } else {\n            console.warn(`⚠️ Legacy dropdown (#active-system) not found in DOM`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Element {} not found:\" warnings",
                "files": [
                        "public/js/modules/utils/domReady.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Element {} not found:",
                "issues": [
                        {
                                "file": "public/js/modules/utils/domReady.js",
                                "line": 106,
                                "code": "console.warn(`Element ${selector} not found:`, error.message);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Element ${selector} not found:\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Element {} not found:', `Element {} not found:`, systemId || 'global');\n        } else {\n            console.warn(`Element {} not found:`);\n        }",
                "severity": "low"
        },
        {
                "type": "warning_deduplication_fix",
                "description": "Add deduplication for \"Form not found: {}\" warnings",
                "files": [
                        "public/js/modules/utils/formUtils.js"
                ],
                "action": "deduplicate_warnings",
                "warningKey": "Form not found: {}",
                "issues": [
                        {
                                "file": "public/js/modules/utils/formUtils.js",
                                "line": 126,
                                "code": "console.warn(`Form not found: ${formId}`);",
                                "issue": "repetitive_warning",
                                "severity": "low",
                                "description": "Potentially repetitive warning: \"Form not found: ${formId}\"",
                                "suggestion": "Add warning deduplication or rate limiting"
                        }
                ],
                "deduplicationCode": "\n        // Replace console.warn with deduplicated version\n        if (window.errorManager) {\n            window.errorManager.warnOnce('Form not found: {}', `Form not found: {}`, systemId || 'global');\n        } else {\n            console.warn(`Form not found: {}`);\n        }",
                "severity": "low"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 161,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 168,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 256,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAuthModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 259,
                "originalCode": "this.modalManager.closeAuthModal();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAuthModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 303,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAuthModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 306,
                "originalCode": "this.modalManager.closeAuthModal();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAuthModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 338,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 553,
                "originalCode": "this.modalManager.showLoginSlideout();",
                "defensiveCode": "if (modalManager) { this.modalManager.showLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAuthModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 616,
                "originalCode": "this.modalManager.closeAuthModal();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAuthModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 618,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAuthModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 627,
                "originalCode": "this.modalManager.closeAuthModal();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAuthModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 629,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAuthModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 664,
                "originalCode": "this.modalManager.closeAuthModal();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAuthModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginForm()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 670,
                "originalCode": "this.showLoginForm();",
                "defensiveCode": "if (this) { this.showLoginForm(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 680,
                "originalCode": "this.modalManager.showLoginSlideout();",
                "defensiveCode": "if (modalManager) { this.modalManager.showLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAllSlideoutPanels()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 695,
                "originalCode": "<button class=\"close-slideout\" onclick=\"app.modalManager.closeAllSlideoutPanels()\">&times;</button>",
                "defensiveCode": "if (modalManager) { <button class=\"close-slideout\" onclick=\"app.modalManager.closeAllSlideoutPanels()\">&times;</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showResendVerification()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 709,
                "originalCode": "<button onclick=\"app.showResendVerification('${email}')\" class=\"btn-success\">",
                "defensiveCode": "if (app) { <button onclick=\"app.showResendVerification('${email}')\" class=\"btn-success\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showLoginForm()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 713,
                "originalCode": "<button onclick=\"app.showLoginForm()\" class=\"btn-secondary\">",
                "defensiveCode": "if (app) { <button onclick=\"app.showLoginForm()\" class=\"btn-secondary\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAllSlideoutPanels()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 779,
                "originalCode": "<button class=\"close-slideout\" onclick=\"app.modalManager.closeAllSlideoutPanels()\">&times;</button>",
                "defensiveCode": "if (modalManager) { <button class=\"close-slideout\" onclick=\"app.modalManager.closeAllSlideoutPanels()\">&times;</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showResendVerification()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 807,
                "originalCode": "<button type=\"button\" onclick=\"app.showResendVerification('${email}')\" class=\"btn-secondary\">",
                "defensiveCode": "if (app) { <button type=\"button\" onclick=\"app.showResendVerification('${email}')\" class=\"btn-secondary\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.closeAllSlideoutPanels()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 889,
                "originalCode": "this.modalManager.closeAllSlideoutPanels();",
                "defensiveCode": "if (modalManager) { this.modalManager.closeAllSlideoutPanels(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAddSystemDialog()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1048,
                "originalCode": "this.showAddSystemDialog();",
                "defensiveCode": "if (this) { this.showAddSystemDialog(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1263,
                "originalCode": "this.closeLoginSlideout();",
                "defensiveCode": "if (this) { this.closeLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showRegisterSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1264,
                "originalCode": "setTimeout(() => this.modalManager.showRegisterSlideout(), 300);",
                "defensiveCode": "if (modalManager) { setTimeout(() => this.modalManager.showRegisterSlideout(), 300); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRegisterSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1270,
                "originalCode": "this.closeRegisterSlideout();",
                "defensiveCode": "if (this) { this.closeRegisterSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1271,
                "originalCode": "setTimeout(() => this.modalManager.showLoginSlideout(), 300);",
                "defensiveCode": "if (modalManager) { setTimeout(() => this.modalManager.showLoginSlideout(), 300); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1277,
                "originalCode": "this.closeLoginSlideout();",
                "defensiveCode": "if (this) { this.closeLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showForgotPasswordSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1278,
                "originalCode": "setTimeout(() => this.modalManager.showForgotPasswordSlideout(), 300);",
                "defensiveCode": "if (modalManager) { setTimeout(() => this.modalManager.showForgotPasswordSlideout(), 300); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeForgotPasswordSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1284,
                "originalCode": "this.closeForgotPasswordSlideout();",
                "defensiveCode": "if (this) { this.closeForgotPasswordSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1285,
                "originalCode": "setTimeout(() => this.modalManager.showLoginSlideout(), 300);",
                "defensiveCode": "if (modalManager) { setTimeout(() => this.modalManager.showLoginSlideout(), 300); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1406,
                "originalCode": "this.showLoginSlideout();",
                "defensiveCode": "if (this) { this.showLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRegisterSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1532,
                "originalCode": "this.closeRegisterSlideout();",
                "defensiveCode": "if (this) { this.closeRegisterSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modalManager.showLoginSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1534,
                "originalCode": "this.modalManager.showLoginSlideout();",
                "defensiveCode": "if (modalManager) { this.modalManager.showLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeForgotPasswordSlideout()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 1902,
                "originalCode": "this.closeForgotPasswordSlideout();",
                "defensiveCode": "if (this) { this.closeForgotPasswordSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginForm()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 2055,
                "originalCode": "this.showLoginForm();",
                "defensiveCode": "if (this) { this.showLoginForm(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for overviewTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 2824,
                "originalCode": "overviewTab.click();",
                "defensiveCode": "if (overviewTab) { overviewTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for overviewTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 2912,
                "originalCode": "overviewTab.click();",
                "defensiveCode": "if (overviewTab) { overviewTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 3462,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal').remove()\">&times;</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal').remove()\">&times;</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modal.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 3522,
                "originalCode": "modal.closest('.modal').remove();",
                "defensiveCode": "if (modal) { modal.closest('.modal').remove(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for modal.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 3545,
                "originalCode": "modal.closest('.modal').remove();",
                "defensiveCode": "if (modal) { modal.closest('.modal').remove(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for editButton.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 4286,
                "originalCode": "editButton.click();",
                "defensiveCode": "if (editButton) { editButton.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddFishModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5347,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showAddFishModal(${tankNumber})\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showAddFishModal(${tankNumber})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showMortalityModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5353,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showMortalityModal(${tankNumber})\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showMortalityModal(${tankNumber})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFeedingModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5359,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showFeedingModal(${tankNumber})\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showFeedingModal(${tankNumber})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFishSizeModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5365,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showFishSizeModal(${tankNumber})\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showFishSizeModal(${tankNumber})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showHarvestFishModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5371,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showHarvestFishModal(${tankNumber})\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showHarvestFishModal(${tankNumber})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showBedDetails()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5517,
                "originalCode": "<button class=\"quick-action-item\" onclick=\"app.showBedDetails('${bedId}')\">",
                "defensiveCode": "if (app) { <button class=\"quick-action-item\" onclick=\"app.showBedDetails('${bedId}')\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for target.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5527,
                "originalCode": "const clickedItem = e.target.closest('.quick-action-item');",
                "defensiveCode": "if (target) { const clickedItem = e.target.closest('.quick-action-item'); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantsNavBtn.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5589,
                "originalCode": "plantsNavBtn.click();",
                "defensiveCode": "if (plantsNavBtn) { plantsNavBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantHarvestTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5596,
                "originalCode": "plantHarvestTab.click();",
                "defensiveCode": "if (plantHarvestTab) { plantHarvestTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantingTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5603,
                "originalCode": "plantingTab.click();",
                "defensiveCode": "if (plantingTab) { plantingTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantHarvestTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5642,
                "originalCode": "plantHarvestTab.click();",
                "defensiveCode": "if (plantHarvestTab) { plantHarvestTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantsNavBtn.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5658,
                "originalCode": "plantsNavBtn.click();",
                "defensiveCode": "if (plantsNavBtn) { plantsNavBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantHarvestTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5665,
                "originalCode": "plantHarvestTab.click();",
                "defensiveCode": "if (plantHarvestTab) { plantHarvestTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for harvestTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5672,
                "originalCode": "harvestTab.click();",
                "defensiveCode": "if (harvestTab) { harvestTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5746,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal').remove()\">&times;</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal').remove()\">&times;</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5773,
                "originalCode": "<button class=\"btn btn-secondary\" onclick=\"this.closest('.modal').remove()\">Cancel</button>",
                "defensiveCode": "if (this) { <button class=\"btn btn-secondary\" onclick=\"this.closest('.modal').remove()\">Cancel</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5879,
                "originalCode": "<button type=\"button\" class=\"close-modal\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button type=\"button\" class=\"close-modal\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 5934,
                "originalCode": "<button type=\"button\" class=\"btn btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Cancel</button>",
                "defensiveCode": "if (this) { <button type=\"button\" class=\"btn btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Cancel</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for overviewTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 6088,
                "originalCode": "overviewTab.click();",
                "defensiveCode": "if (overviewTab) { overviewTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantsNavBtn.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 6120,
                "originalCode": "plantsNavBtn.click();",
                "defensiveCode": "if (plantsNavBtn) { plantsNavBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for overviewTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 6127,
                "originalCode": "overviewTab.click();",
                "defensiveCode": "if (overviewTab) { overviewTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for link.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 8369,
                "originalCode": "link.click();",
                "defensiveCode": "if (link) { link.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for link.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 8489,
                "originalCode": "link.click();",
                "defensiveCode": "if (link) { link.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantsBtn.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9393,
                "originalCode": "plantsBtn.click();",
                "defensiveCode": "if (plantsBtn) { plantsBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantManagementTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9400,
                "originalCode": "plantManagementTab.click();",
                "defensiveCode": "if (plantManagementTab) { plantManagementTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantsTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9424,
                "originalCode": "plantsTab.click();",
                "defensiveCode": "if (plantsTab) { plantsTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for bedsOverviewSubtab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9429,
                "originalCode": "bedsOverviewSubtab.click();",
                "defensiveCode": "if (bedsOverviewSubtab) { bedsOverviewSubtab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for tab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9442,
                "originalCode": "tab.click();",
                "defensiveCode": "if (tab) { tab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for tab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9446,
                "originalCode": "tab.click();",
                "defensiveCode": "if (tab) { tab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for tankInfoTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 9476,
                "originalCode": "tankInfoTab.click();",
                "defensiveCode": "if (tankInfoTab) { tankInfoTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 10589,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 10620,
                "originalCode": "<button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button>",
                "defensiveCode": "if (this) { <button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 10668,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 10707,
                "originalCode": "<button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button>",
                "defensiveCode": "if (this) { <button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showKeyboardShortcuts()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 12696,
                "originalCode": "this.showKeyboardShortcuts();",
                "defensiveCode": "if (this) { this.showKeyboardShortcuts(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeCommandPalette()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 12976,
                "originalCode": "<button class=\"command-close\" onclick=\"window.app.closeCommandPalette()\">✕</button>",
                "defensiveCode": "if (app) { <button class=\"command-close\" onclick=\"window.app.closeCommandPalette()\">✕</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCommandPalette()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 13060,
                "originalCode": "this.closeCommandPalette();",
                "defensiveCode": "if (this) { this.closeCommandPalette(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCommandPalette()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 13066,
                "originalCode": "this.closeCommandPalette();",
                "defensiveCode": "if (this) { this.closeCommandPalette(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCommandPalette()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 13141,
                "originalCode": "this.closeCommandPalette();",
                "defensiveCode": "if (this) { this.closeCommandPalette(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showKeyboardShortcuts()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 13181,
                "originalCode": "this.showKeyboardShortcuts();",
                "defensiveCode": "if (this) { this.showKeyboardShortcuts(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAddSystemDialog()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 15127,
                "originalCode": "this.showAddSystemDialog();",
                "defensiveCode": "if (this) { this.showAddSystemDialog(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddCustomCropDialog()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 16612,
                "originalCode": "<button type=\"button\" class=\"btn-outline\" onclick=\"app.showAddCustomCropDialog(${i})\">",
                "defensiveCode": "if (app) { <button type=\"button\" class=\"btn-outline\" onclick=\"app.showAddCustomCropDialog(${i})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeNewSystemModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 16885,
                "originalCode": "this.closeNewSystemModal();",
                "defensiveCode": "if (this) { this.closeNewSystemModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for allocationTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 16905,
                "originalCode": "allocationTab.click();",
                "defensiveCode": "if (allocationTab) { allocationTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeNewSystemModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 16951,
                "originalCode": "this.closeNewSystemModal();",
                "defensiveCode": "if (this) { this.closeNewSystemModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showDemoLoadingModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 16952,
                "originalCode": "this.showDemoLoadingModal();",
                "defensiveCode": "if (this) { this.showDemoLoadingModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showExportOptions()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 18225,
                "originalCode": "this.showExportOptions();",
                "defensiveCode": "if (this) { this.showExportOptions(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for document.close()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 18538,
                "originalCode": "printWindow.document.close();",
                "defensiveCode": "if (document) { printWindow.document.close(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 18846,
                "originalCode": "<button class=\"form-btn secondary\" style=\"padding: 4px 12px; font-size: 0.8rem;\" onclick=\"this.closest('.inline-notification').remove()\">Cancel</button>",
                "defensiveCode": "if (this) { <button class=\"form-btn secondary\" style=\"padding: 4px 12px; font-size: 0.8rem;\" onclick=\"this.closest('.inline-notification').remove()\">Cancel</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for window.close()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 20036,
                "originalCode": "<button onclick=\"window.close()\">Close</button>",
                "defensiveCode": "if (window) { <button onclick=\"window.close()\">Close</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for document.close()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 20041,
                "originalCode": "printWindow.document.close();",
                "defensiveCode": "if (document) { printWindow.document.close(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCropManagementModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 20550,
                "originalCode": "this.closeCropManagementModal();",
                "defensiveCode": "if (this) { this.closeCropManagementModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAddSystemDialog()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 21746,
                "originalCode": "this.showAddSystemDialog();",
                "defensiveCode": "if (this) { this.showAddSystemDialog(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showCustomCropModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 21823,
                "originalCode": "this.showCustomCropModal();",
                "defensiveCode": "if (this) { this.showCustomCropModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAddSprayModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 22975,
                "originalCode": "this.closeAddSprayModal();",
                "defensiveCode": "if (this) { this.closeAddSprayModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAddToProgrammeModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 23132,
                "originalCode": "this.closeAddToProgrammeModal();",
                "defensiveCode": "if (this) { this.closeAddToProgrammeModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRecordSprayModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 23465,
                "originalCode": "this.closeRecordSprayModal();",
                "defensiveCode": "if (this) { this.closeRecordSprayModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRecordSprayModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 23482,
                "originalCode": "this.closeRecordSprayModal();",
                "defensiveCode": "if (this) { this.closeRecordSprayModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCreateProgrammeModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 24380,
                "originalCode": "this.closeCreateProgrammeModal();",
                "defensiveCode": "if (this) { this.closeCreateProgrammeModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeDeleteProgrammeModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 24579,
                "originalCode": "this.closeDeleteProgrammeModal();",
                "defensiveCode": "if (this) { this.closeDeleteProgrammeModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeCreateProgrammeModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 24809,
                "originalCode": "this.closeCreateProgrammeModal();",
                "defensiveCode": "if (this) { this.closeCreateProgrammeModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeEditFishEntryModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 25540,
                "originalCode": "<button class=\"close-btn\" onclick=\"app.closeEditFishEntryModal()\">×</button>",
                "defensiveCode": "if (app) { <button class=\"close-btn\" onclick=\"app.closeEditFishEntryModal()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeEditFishEntryModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 25591,
                "originalCode": "<button type=\"button\" class=\"btn btn-secondary\" onclick=\"app.closeEditFishEntryModal()\">Cancel</button>",
                "defensiveCode": "if (app) { <button type=\"button\" class=\"btn btn-secondary\" onclick=\"app.closeEditFishEntryModal()\">Cancel</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeEditFishEntryModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 25640,
                "originalCode": "this.closeEditFishEntryModal();",
                "defensiveCode": "if (this) { this.closeEditFishEntryModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for tabElement.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 27525,
                "originalCode": "tabElement.click();",
                "defensiveCode": "if (tabElement) { tabElement.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeMetricsConfig()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 27908,
                "originalCode": "this.closeMetricsConfig();",
                "defensiveCode": "if (this) { this.closeMetricsConfig(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for plantingTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 28438,
                "originalCode": "plantingTab.click();",
                "defensiveCode": "if (plantingTab) { plantingTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for link.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 28568,
                "originalCode": "link.click();",
                "defensiveCode": "if (link) { link.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeLightbox()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 29112,
                "originalCode": "this.closeLightbox();",
                "defensiveCode": "if (this) { this.closeLightbox(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeMetricsConfig()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 29138,
                "originalCode": "window.app.closeMetricsConfig();",
                "defensiveCode": "if (app) { window.app.closeMetricsConfig(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeLightbox()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 29166,
                "originalCode": "app.closeLightbox();",
                "defensiveCode": "if (app) { app.closeLightbox(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeAddSprayModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 29204,
                "originalCode": "app.closeAddSprayModal();",
                "defensiveCode": "if (app) { app.closeAddSprayModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeAddSprayModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 29214,
                "originalCode": "app.closeAddSprayModal();",
                "defensiveCode": "if (app) { app.closeAddSprayModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for sprayTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 30034,
                "originalCode": "sprayTab.click();",
                "defensiveCode": "if (sprayTab) { sprayTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for sprayTab.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 30071,
                "originalCode": "sprayTab.click();",
                "defensiveCode": "if (sprayTab) { sprayTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showRatioRuleModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 30772,
                "originalCode": "this.showRatioRuleModal();",
                "defensiveCode": "if (this) { this.showRatioRuleModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRatioRuleModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 30898,
                "originalCode": "this.closeRatioRuleModal();",
                "defensiveCode": "if (this) { this.closeRatioRuleModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeEnvAdjustmentModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 30952,
                "originalCode": "this.closeEnvAdjustmentModal();",
                "defensiveCode": "if (this) { this.closeEnvAdjustmentModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for nutrientRatioManager.closeRatioRuleModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31028,
                "originalCode": "app.closeRatioRuleModal = () => app.nutrientRatioManager.closeRatioRuleModal();",
                "defensiveCode": "if (nutrientRatioManager) { app.closeRatioRuleModal = () => app.nutrientRatioManager.closeRatioRuleModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for nutrientRatioManager.closeEnvAdjustmentModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31029,
                "originalCode": "app.closeEnvAdjustmentModal = () => app.nutrientRatioManager.closeEnvAdjustmentModal();",
                "defensiveCode": "if (nutrientRatioManager) { app.closeEnvAdjustmentModal = () => app.nutrientRatioManager.closeEnvAdjustmentModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showNoNutrientSelected()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31121,
                "originalCode": "app.showNoNutrientSelected();",
                "defensiveCode": "if (app) { app.showNoNutrientSelected(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for fileInput.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31235,
                "originalCode": "fileInput.click();",
                "defensiveCode": "if (fileInput) { fileInput.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeDeficiencyImageModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31585,
                "originalCode": "app.closeDeficiencyImageModal();",
                "defensiveCode": "if (app) { app.closeDeficiencyImageModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeDeficiencyImageModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 31969,
                "originalCode": "app.closeDeficiencyImageModal();",
                "defensiveCode": "if (app) { app.closeDeficiencyImageModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeDeficiencyImageModal()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 32008,
                "originalCode": "app.closeDeficiencyImageModal();",
                "defensiveCode": "if (app) { app.closeDeficiencyImageModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for button.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 32146,
                "originalCode": "button.click();",
                "defensiveCode": "if (button) { button.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for button.click()",
                "file": "script.js",
                "action": "add_defensive_check",
                "line": 32173,
                "originalCode": "button.click();",
                "defensiveCode": "if (button) { button.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginForm()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 24,
                "originalCode": "this.showLoginForm();",
                "defensiveCode": "if (this) { this.showLoginForm(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 72,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 155,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 229,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 239,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 245,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/components/authenticationManager.js",
                "action": "add_defensive_check",
                "line": 253,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showUI()",
                "file": "public/js/modules/components/baseUIComponent.js",
                "action": "add_defensive_check",
                "line": 171,
                "originalCode": "await this.showUI();",
                "defensiveCode": "if (this) { await this.showUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.show()",
                "file": "public/js/modules/components/baseUIComponent.js",
                "action": "add_defensive_check",
                "line": 199,
                "originalCode": "this.show();",
                "defensiveCode": "if (this) { this.show(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllModals()",
                "file": "public/js/modules/components/baseUIComponent.js",
                "action": "add_defensive_check",
                "line": 421,
                "originalCode": "this.closeAllModals();",
                "defensiveCode": "if (this) { this.closeAllModals(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeModal()",
                "file": "public/js/modules/components/chartModal.js",
                "action": "add_defensive_check",
                "line": 472,
                "originalCode": "this.closeModal();",
                "defensiveCode": "if (this) { this.closeModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showSystemCreationWizard()",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "line": 51,
                "originalCode": "<button class=\"btn-success\" onclick=\"app.showSystemCreationWizard()\">Create New System</button>",
                "defensiveCode": "if (app) { <button class=\"btn-success\" onclick=\"app.showSystemCreationWizard()\">Create New System</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for cropAllocationManager.showAddAllocationForm()",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "line": 86,
                "originalCode": "<button class=\"btn-success\" onclick=\"app.cropAllocationManager.showAddAllocationForm()\">",
                "defensiveCode": "if (cropAllocationManager) { <button class=\"btn-success\" onclick=\"app.cropAllocationManager.showAddAllocationForm()\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for cropAllocationManager.showAddAllocationForm()",
                "file": "public/js/modules/components/cropAllocationManager.js",
                "action": "add_defensive_check",
                "line": 435,
                "originalCode": "<button class=\"btn-success\" onclick=\"app.cropAllocationManager.showAddAllocationForm()\">",
                "defensiveCode": "if (cropAllocationManager) { <button class=\"btn-success\" onclick=\"app.cropAllocationManager.showAddAllocationForm()\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddCustomCropModal()",
                "file": "public/js/modules/components/customCropManager.js",
                "action": "add_defensive_check",
                "line": 44,
                "originalCode": "<button onclick=\"app.showAddCustomCropModal()\" class=\"btn-primary\">",
                "defensiveCode": "if (app) { <button onclick=\"app.showAddCustomCropModal()\" class=\"btn-primary\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddCustomCropModal()",
                "file": "public/js/modules/components/customCropManager.js",
                "action": "add_defensive_check",
                "line": 61,
                "originalCode": "<button onclick=\"app.showAddCustomCropModal()\" class=\"btn-primary\">",
                "defensiveCode": "if (app) { <button onclick=\"app.showAddCustomCropModal()\" class=\"btn-primary\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for dashboard.show()",
                "file": "public/js/modules/components/dashboardUI.js",
                "action": "add_defensive_check",
                "line": 40,
                "originalCode": "await this.dashboard.show();",
                "defensiveCode": "if (dashboard) { await this.dashboard.show(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for waterBtn.click()",
                "file": "public/js/modules/components/dashboardUI.js",
                "action": "add_defensive_check",
                "line": 300,
                "originalCode": "waterBtn.click();",
                "defensiveCode": "if (waterBtn) { waterBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for overviewTab.click()",
                "file": "public/js/modules/components/dashboardUI.js",
                "action": "add_defensive_check",
                "line": 363,
                "originalCode": "overviewTab.click();",
                "defensiveCode": "if (overviewTab) { overviewTab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for dashBtn.click()",
                "file": "public/js/modules/components/dashboardUI.js",
                "action": "add_defensive_check",
                "line": 375,
                "originalCode": "dashBtn.click();",
                "defensiveCode": "if (dashBtn) { dashBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/farmLayoutRenderer.js",
                "action": "add_defensive_check",
                "line": 606,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/farmLayoutRenderer.js",
                "action": "add_defensive_check",
                "line": 637,
                "originalCode": "<button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button>",
                "defensiveCode": "if (this) { <button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/farmLayoutRenderer.js",
                "action": "add_defensive_check",
                "line": 687,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/farmLayoutRenderer.js",
                "action": "add_defensive_check",
                "line": 726,
                "originalCode": "<button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button>",
                "defensiveCode": "if (this) { <button class=\"btn-secondary\" onclick=\"this.closest('.modal-overlay').remove()\">Close</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddFishModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 844,
                "originalCode": "<button class=\"tank-action-btn primary\" onclick=\"app.showAddFishModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn primary\" onclick=\"app.showAddFishModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showMortalityModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 850,
                "originalCode": "<button class=\"tank-action-btn warning\" onclick=\"app.showMortalityModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn warning\" onclick=\"app.showMortalityModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFeedingModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 856,
                "originalCode": "<button class=\"tank-action-btn success\" onclick=\"app.showFeedingModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn success\" onclick=\"app.showFeedingModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFishSizeModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 862,
                "originalCode": "<button class=\"tank-action-btn info\" onclick=\"app.showFishSizeModal(${tank.tank_number})\"",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn info\" onclick=\"app.showFishSizeModal(${tank.tank_number})\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showHarvestFishModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 869,
                "originalCode": "<button class=\"tank-action-btn harvest\" onclick=\"app.showHarvestFishModal(${tank.tank_number})\"",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn harvest\" onclick=\"app.showHarvestFishModal(${tank.tank_number})\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showAddFishModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 1098,
                "originalCode": "<button class=\"tank-action-btn primary\" onclick=\"app.showAddFishModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn primary\" onclick=\"app.showAddFishModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showMortalityModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 1104,
                "originalCode": "<button class=\"tank-action-btn warning\" onclick=\"app.showMortalityModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn warning\" onclick=\"app.showMortalityModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFeedingModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 1110,
                "originalCode": "<button class=\"tank-action-btn success\" onclick=\"app.showFeedingModal(${tank.tank_number})\">",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn success\" onclick=\"app.showFeedingModal(${tank.tank_number})\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showFishSizeModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 1116,
                "originalCode": "<button class=\"tank-action-btn info\" onclick=\"app.showFishSizeModal(${tank.tank_number})\"",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn info\" onclick=\"app.showFishSizeModal(${tank.tank_number})\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showHarvestFishModal()",
                "file": "public/js/modules/components/fishManagement.js",
                "action": "add_defensive_check",
                "line": 1123,
                "originalCode": "<button class=\"tank-action-btn harvest\" onclick=\"app.showHarvestFishModal(${tank.tank_number})\"",
                "defensiveCode": "if (app) { <button class=\"tank-action-btn harvest\" onclick=\"app.showHarvestFishModal(${tank.tank_number})\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllSlideoutPanels()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 32,
                "originalCode": "this.closeAllSlideoutPanels();",
                "defensiveCode": "if (this) { this.closeAllSlideoutPanels(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showRegisterSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 35,
                "originalCode": "this.showRegisterSlideout();",
                "defensiveCode": "if (this) { this.showRegisterSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showForgotPasswordSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 37,
                "originalCode": "this.showForgotPasswordSlideout();",
                "defensiveCode": "if (this) { this.showForgotPasswordSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 39,
                "originalCode": "this.showLoginSlideout();",
                "defensiveCode": "if (this) { this.showLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeLoginSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 178,
                "originalCode": "this.closeLoginSlideout();",
                "defensiveCode": "if (this) { this.closeLoginSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeRegisterSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 179,
                "originalCode": "this.closeRegisterSlideout();",
                "defensiveCode": "if (this) { this.closeRegisterSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeForgotPasswordSlideout()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 180,
                "originalCode": "this.closeForgotPasswordSlideout();",
                "defensiveCode": "if (this) { this.closeForgotPasswordSlideout(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllSlideoutPanels()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 190,
                "originalCode": "this.closeAllSlideoutPanels();",
                "defensiveCode": "if (this) { this.closeAllSlideoutPanels(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 306,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 504,
                "originalCode": "<button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button>",
                "defensiveCode": "if (this) { <button class=\"modal-close\" onclick=\"this.closest('.modal-overlay').remove()\">×</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllSlideoutPanels()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 577,
                "originalCode": "this.closeAllSlideoutPanels();",
                "defensiveCode": "if (this) { this.closeAllSlideoutPanels(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllModals()",
                "file": "public/js/modules/components/modalManager.js",
                "action": "add_defensive_check",
                "line": 642,
                "originalCode": "this.closeAllModals();",
                "defensiveCode": "if (this) { this.closeAllModals(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for navButton.click()",
                "file": "public/js/modules/components/navigationManager.js",
                "action": "add_defensive_check",
                "line": 357,
                "originalCode": "navButton.click();",
                "defensiveCode": "if (navButton) { navButton.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for tab.click()",
                "file": "public/js/modules/components/navigationManager.js",
                "action": "add_defensive_check",
                "line": 393,
                "originalCode": "tab.click();",
                "defensiveCode": "if (tab) { tab.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/notifications.js",
                "action": "add_defensive_check",
                "line": 170,
                "originalCode": "<span style=\"flex-shrink: 0; cursor: pointer; opacity: 0.7; margin-left: 8px; font-size: 18px; line-height: 1;\" onclick=\"this.closest('.notification').remove()\">×</span>",
                "defensiveCode": "if (this) { <span style=\"flex-shrink: 0; cursor: pointer; opacity: 0.7; margin-left: 8px; font-size: 18px; line-height: 1;\" onclick=\"this.closest('.notification').remove()\">×</span> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for form.closeModal()",
                "file": "public/js/modules/components/nutrientManager.js",
                "action": "add_defensive_check",
                "line": 74,
                "originalCode": "closeRatioRuleModal: () => this.form.closeModal('ratio-rule-modal'),",
                "defensiveCode": "if (form) { closeRatioRuleModal: () => this.form.closeModal('ratio-rule-modal'), }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for form.closeModal()",
                "file": "public/js/modules/components/nutrientManager.js",
                "action": "add_defensive_check",
                "line": 75,
                "originalCode": "closeEnvAdjustmentModal: () => this.form.closeModal('env-adjustment-modal'),",
                "defensiveCode": "if (form) { closeEnvAdjustmentModal: () => this.form.closeModal('env-adjustment-modal'), }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeAllModals()",
                "file": "public/js/modules/components/nutrients/nutrientForm.js",
                "action": "add_defensive_check",
                "line": 113,
                "originalCode": "this.closeAllModals();",
                "defensiveCode": "if (this) { this.closeAllModals(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showRatioRuleModal()",
                "file": "public/js/modules/components/nutrients/nutrientForm.js",
                "action": "add_defensive_check",
                "line": 740,
                "originalCode": "this.showRatioRuleModal();",
                "defensiveCode": "if (this) { this.showRatioRuleModal(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showSystemCreationWizard()",
                "file": "public/js/modules/components/systemConfigManager.js",
                "action": "add_defensive_check",
                "line": 54,
                "originalCode": "<button class=\"btn-success\" onclick=\"app.showSystemCreationWizard()\">Create New System</button>",
                "defensiveCode": "if (app) { <button class=\"btn-success\" onclick=\"app.showSystemCreationWizard()\">Create New System</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showSystemCreationWizard()",
                "file": "public/js/modules/components/systemStateManager.js",
                "action": "add_defensive_check",
                "line": 31,
                "originalCode": "this.app.showSystemCreationWizard();",
                "defensiveCode": "if (app) { this.app.showSystemCreationWizard(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeSystemsDropdown()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 45,
                "originalCode": "this.closeSystemsDropdown();",
                "defensiveCode": "if (this) { this.closeSystemsDropdown(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for systemsList.showCreateSystemModal()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 188,
                "originalCode": "<div class=\"dropdown-item\" onclick=\"app.systemsList.showCreateSystemModal()\">",
                "defensiveCode": "if (systemsList) { <div class=\"dropdown-item\" onclick=\"app.systemsList.showCreateSystemModal()\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for systemsList.showCreateSystemModal()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 221,
                "originalCode": "<div class=\"dropdown-item\" onclick=\"app.systemsList.showCreateSystemModal()\" style=\"cursor: pointer;\">",
                "defensiveCode": "if (systemsList) { <div class=\"dropdown-item\" onclick=\"app.systemsList.showCreateSystemModal()\" style=\"cursor: pointer;\"> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeSystemsDropdown()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 244,
                "originalCode": "this.closeSystemsDropdown();",
                "defensiveCode": "if (this) { this.closeSystemsDropdown(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeSystemsDropdown()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 254,
                "originalCode": "this.closeSystemsDropdown();",
                "defensiveCode": "if (this) { this.closeSystemsDropdown(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeSystemsDropdown()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 282,
                "originalCode": "this.closeSystemsDropdown();",
                "defensiveCode": "if (this) { this.closeSystemsDropdown(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeSystemsDropdown()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 317,
                "originalCode": "this.closeSystemsDropdown();",
                "defensiveCode": "if (this) { this.closeSystemsDropdown(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for createBtn.click()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 322,
                "originalCode": "createBtn.click();",
                "defensiveCode": "if (createBtn) { createBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closest()",
                "file": "public/js/modules/components/systemsList.js",
                "action": "add_defensive_check",
                "line": 380,
                "originalCode": "<button type=\"button\" onclick=\"this.closest('#create-system-modal').remove()\"",
                "defensiveCode": "if (this) { <button type=\"button\" onclick=\"this.closest('#create-system-modal').remove()\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for waterQualitySensorManager.showAddSensorForm()",
                "file": "public/js/modules/components/waterQualitySensorManager.js",
                "action": "add_defensive_check",
                "line": 92,
                "originalCode": "<button class=\"btn-success\" onclick=\"app.waterQualitySensorManager.showAddSensorForm()\">Add Sensor</button>",
                "defensiveCode": "if (waterQualitySensorManager) { <button class=\"btn-success\" onclick=\"app.waterQualitySensorManager.showAddSensorForm()\">Add Sensor</button> }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 32,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 35,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 44,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 116,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showLoginForm()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 151,
                "originalCode": "this.showLoginForm();",
                "defensiveCode": "if (this) { this.showLoginForm(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 208,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAppUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 248,
                "originalCode": "this.showAppUI();",
                "defensiveCode": "if (this) { this.showAppUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showAuthUI()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 286,
                "originalCode": "this.showAuthUI();",
                "defensiveCode": "if (this) { this.showAuthUI(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for initializer.showResendVerification()",
                "file": "public/js/modules/services/appInitializer.js",
                "action": "add_defensive_check",
                "line": 328,
                "originalCode": "onclick=\"app.initializer.showResendVerification('${email}')\"",
                "defensiveCode": "if (initializer) { onclick=\"app.initializer.showResendVerification('${email}')\" }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showNotification()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 73,
                "originalCode": "const onlineHandler = () => this.app.showNotification('🌐 Connection restored', 'success');",
                "defensiveCode": "if (app) { const onlineHandler = () => this.app.showNotification('🌐 Connection restored', 'success'); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.showNotification()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 74,
                "originalCode": "const offlineHandler = () => this.app.showNotification('⚠️ Connection lost', 'warning');",
                "defensiveCode": "if (app) { const offlineHandler = () => this.app.showNotification('⚠️ Connection lost', 'warning'); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.showKeyboardShortcuts()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 173,
                "originalCode": "this.showKeyboardShortcuts();",
                "defensiveCode": "if (this) { this.showKeyboardShortcuts(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for closeBtn.click()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 187,
                "originalCode": "closeBtn.click();",
                "defensiveCode": "if (closeBtn) { closeBtn.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for app.closeLightbox()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 196,
                "originalCode": "this.app.closeLightbox();",
                "defensiveCode": "if (app) { this.app.closeLightbox(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for saveButton.click()",
                "file": "public/js/modules/services/eventManager.js",
                "action": "add_defensive_check",
                "line": 222,
                "originalCode": "saveButton.click();",
                "defensiveCode": "if (saveButton) { saveButton.click(); }",
                "severity": "medium"
        },
        {
                "type": "unsafe_method_call_fix",
                "description": "Add defensive check for this.closeModal()",
                "file": "public/js/modules/utils/domUtils.js",
                "action": "add_defensive_check",
                "line": 382,
                "originalCode": "onclick: () => this.closeModal(modal)",
                "defensiveCode": "if (this) { onclick: () => this.closeModal(modal) }",
                "severity": "medium"
        }
];
        this.results = {
            applied: 0,
            failed: 0,
            skipped: 0
        };
    }

    async applyAllFixes() {
        console.log('🧠 Applying intelligent pattern-based fixes...');
        console.log(`Total fixes to apply: ${this.fixes.length}`);
        
        // Apply fixes by category for better error isolation
        await this.applyFixesByType('duplicate_id_smart_fix');
        await this.applyFixesByType('missing_chart_element_fix');
        await this.applyFixesByType('missing_form_element_fix');
        await this.applyFixesByType('tab_target_attribute_fix');
        await this.applyFixesByType('error_manager_creation');
        
        this.showResults();
    }

    async applyFixesByType(fixType) {
        const fixes = this.fixes.filter(f => f.type === fixType);
        if (fixes.length === 0) return;
        
        console.log(`\n🔧 Applying ${fixes.length} ${fixType} fixes...`);
        
        for (const fix of fixes) {
            try {
                await this.applyFix(fix);
                this.results.applied++;
                console.log(`  ✅ ${fix.description}`);
            } catch (error) {
                this.results.failed++;
                console.error(`  ❌ ${fix.description}:`, error.message);
            }
        }
    }

    async applyFix(fix) {
        const filePath = path.join(__dirname, '..', fix.file);
        
        switch (fix.action) {
            case 'rename_with_context':
                await this.applyContextualRename(filePath, fix);
                break;
            case 'add_defensive_check':
                await this.addDefensiveCheck(filePath, fix);
                break;
            case 'add_data_target':
                await this.addDataTarget(filePath, fix);
                break;
            case 'create_tab_content':
                await this.createTabContent(filePath, fix);
                break;
            case 'add_error_manager':
                await this.addErrorManager(filePath, fix);
                break;
            default:
                throw new Error(`Unknown fix action: ${fix.action}`);
        }
    }

    async applyContextualRename(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fix.file}`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Apply renames based on context
        fix.renames.forEach((newId, index) => {
            if (index === 0) return; // Keep first occurrence
            
            // Find nth occurrence and rename
            const regex = new RegExp(`id="?${fix.originalId}"?`, 'g');
            let match;
            let count = 0;
            
            while ((match = regex.exec(content)) !== null) {
                count++;
                if (count === index + 1) {
                    content = content.substring(0, match.index) + 
                             `id="${newId}"` + 
                             content.substring(match.index + match[0].length);
                    break;
                }
            }
        });
        
        fs.writeFileSync(filePath, content);
    }

    async addDefensiveCheck(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fix.file}`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Find element usage and add check before it
        const elementUsage = `document.getElementById('${fix.elementId}')`;
        const checkCode = fix.checkPattern;
        
        if (content.includes(elementUsage)) {
            content = content.replace(elementUsage, `${checkCode}\n        ${elementUsage}`);
            fs.writeFileSync(filePath, content);
        }
    }

    async addDataTarget(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fix.file}`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add data-target to tab button
        const tabPattern = new RegExp(`(<[^>]*id="${fix.tabId}"[^>]*)`, 'i');
        content = content.replace(tabPattern, `$1 data-target="${fix.targetId}"`);
        
        fs.writeFileSync(filePath, content);
    }

    async createTabContent(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fix.file}`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Create content div near other tab content
        const contentDiv = `<div id="${fix.contentId}" class="tab-content">
            <p>Content for ${fix.tabId}</p>
        </div>`;
        
        // Insert before closing body tag
        content = content.replace('</body>', `    ${contentDiv}\n</body>`);
        
        fs.writeFileSync(filePath, content);
    }

    async addErrorManager(filePath, fix) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fix.file}`);
        }
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add error manager at the beginning of the file (after initial comments)
        const insertPoint = content.indexOf('class AquaponicsApp') || content.indexOf('$(document)') || 0;
        
        content = content.substring(0, insertPoint) + 
                 fix.managerCode + 
                 '\n\n' + 
                 content.substring(insertPoint);
        
        fs.writeFileSync(filePath, content);
    }

    showResults() {
        console.log('\n📊 INTELLIGENT FIX RESULTS');
        console.log('=====================================');
        console.log(`✅ Applied: ${this.results.applied}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️ Skipped: ${this.results.skipped}`);
        console.log(`📈 Success Rate: ${((this.results.applied / (this.results.applied + this.results.failed)) * 100).toFixed(1)}%`);
    }
}

// Run if called directly
if (require.main === module) {
    const applier = new IntelligentFixApplier();
    applier.applyAllFixes().catch(error => {
        console.error('❌ Intelligent fix application failed:', error);
        process.exit(1);
    });
}

module.exports = IntelligentFixApplier;