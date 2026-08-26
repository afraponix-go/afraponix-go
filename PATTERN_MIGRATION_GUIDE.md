# Pattern Migration Guide: script.js → ES6 Utility Modules

## Overview

This guide shows how to replace repeated patterns in `script.js` with the new utility modules in `public/js/modules/utils/`.

**Analysis Results:**
- 274 error handling try-catch blocks → **ErrorHandler utility**
- 458 notification function calls → **NotificationManager utility**  
- 35+ loading spinner patterns → **LoadingManager utility**
- 45+ form state changes → **FormUtils utility**
- DOM manipulation patterns → **DOMUtils utility**

## 1. Error Handling Patterns

### ❌ Before (Repeated 274 times):
```javascript
async function someFunction() {
    try {
        const response = await fetch('/api/endpoint');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        showNotification('Success!', 'success');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Something went wrong', 'error');
        throw error;
    }
}
```

### ✅ After (Using ErrorHandler utility):
```javascript
import { handleApiError, wrapAsync } from './modules/utils/errorHandler.js';

const someFunction = wrapAsync(async () => {
    const response = await fetch('/api/endpoint');
    await handleFetchResponse(response, { endpoint: '/api/endpoint' });
    const data = await response.json();
    showNotification('Success!', 'success');
    return data;
}, { operation: 'someFunction' });
```

### Migration Steps:
1. Import error handler: `import { wrapAsync, handleApiError } from './modules/utils/errorHandler.js';`
2. Replace try-catch blocks with `wrapAsync()` wrapper
3. Use `handleFetchResponse()` for consistent HTTP error handling
4. Remove manual error logging (handled automatically)

## 2. Loading Spinner Patterns  

### ❌ Before (Repeated 35+ times):
```javascript
async function submitForm(button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Loading...';
    
    try {
        const result = await apiCall();
        showNotification('Success!', 'success');
        return result;
    } catch (error) {
        showNotification('Error occurred', 'error');
        throw error;
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}
```

### ✅ After (Using LoadingManager utility):
```javascript
import { withButtonLoading } from './modules/utils/loadingManager.js';

const submitForm = withButtonLoading(
    document.getElementById('submit-btn'),
    async () => {
        const result = await apiCall();
        showNotification('Success!', 'success');
        return result;
    },
    { loadingText: 'Submitting...', showSpinner: true }
);
```

### Migration Steps:
1. Import loading manager: `import { withButtonLoading, withFormLoading } from './modules/utils/loadingManager.js';`
2. Replace manual disabled/enabled logic with wrapper functions
3. Remove manual loading text management
4. Use `createLoadingOverlay()` for container-based loading states

## 3. Notification Patterns

### ❌ Before (Repeated 458 times):
```javascript
// Inconsistent notification calls throughout codebase
showNotification('Success!', 'success', 3000);
showMessage('Error occurred', 'error');
app.showNotification('Warning!', 'warning', 5000);
createNotification('Info message', 'info');
```

### ✅ After (Using NotificationManager utility):
```javascript
import { showSuccess, showError, showWarning, showInfo } from './modules/utils/notificationManager.js';

// Consistent, typed notification calls
showSuccess('Operation completed successfully!');
showError('Something went wrong, please try again');
showWarning('Please review your input');
showInfo('Data has been updated');
```

### Migration Steps:
1. Import notification functions: `import { showSuccess, showError, showWarning, showInfo } from './modules/utils/notificationManager.js';`
2. Replace all notification variants with typed functions
3. Remove manual notification styling and positioning code
4. Use `persistent()` for notifications that require user dismissal

## 4. Form Validation Patterns

### ❌ Before (Scattered throughout codebase):
```javascript
function validateForm() {
    const errors = [];
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email) errors.push('Email is required');
    if (!email.includes('@')) errors.push('Invalid email format');
    if (password.length < 8) errors.push('Password too short');
    
    if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return false;
    }
    return true;
}
```

### ✅ After (Using FormUtils utility):
```javascript
import { registerForm, validateForm } from './modules/utils/formUtils.js';

// Register form with validation rules
const formId = registerForm(document.getElementById('myForm'), {
    email: {
        required: true,
        type: 'email'
    },
    password: {
        required: true,
        minLength: 8
    }
}, {
    validateOnBlur: true,
    showInlineErrors: true
});

// Validation happens automatically, or manually:
const isValid = validateForm(formId);
```

### Migration Steps:
1. Import form utilities: `import { registerForm, validateForm } from './modules/utils/formUtils.js';`
2. Define validation rules as objects instead of manual checks
3. Remove manual error message handling (handled automatically)
4. Use `getFormData()` and `setFormData()` for consistent form data management

## 5. DOM Manipulation Patterns

### ❌ Before (Common patterns):
```javascript
// Manual DOM queries and manipulation
const element = document.querySelector('#myElement');
if (element) {
    element.style.display = 'none';
    setTimeout(() => {
        element.style.display = 'block';
        element.style.opacity = '1';
    }, 300);
}

// Manual element creation
const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `<div class="modal-content">${content}</div>`;
document.body.appendChild(modal);
```

### ✅ After (Using DOMUtils utility):
```javascript
import { $, toggleElement, createModal } from './modules/utils/domUtils.js';

// Clean DOM queries with caching
const element = $('#myElement');
toggleElement(element, true, 'fade');

// Simplified modal creation
const modal = createModal('Title', content, { maxWidth: '600px' });
```

### Migration Steps:
1. Import DOM utilities: `import { $, $$, createElement, createModal } from './modules/utils/domUtils.js';`
2. Replace `document.querySelector` with `$()` for caching benefits
3. Use `toggleElement()` with animation support instead of manual show/hide
4. Replace manual modal creation with `createModal()`

## 6. Complete Migration Example

### ❌ Before (Typical function with all patterns):
```javascript
async function addPlantRecord(formData) {
    const button = document.getElementById('add-plant-btn');
    const originalText = button.textContent;
    
    // Loading state
    button.disabled = true;
    button.textContent = 'Adding...';
    
    try {
        // Validation
        if (!formData.crop_name) {
            showNotification('Crop name is required', 'error');
            return;
        }
        
        // API call
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        showNotification('Plant record added successfully!', 'success');
        
        // Update UI
        const plantList = document.querySelector('.plant-list');
        plantList.style.display = 'none';
        setTimeout(() => {
            updatePlantList();
            plantList.style.display = 'block';
        }, 100);
        
        return result;
        
    } catch (error) {
        console.error('Error adding plant record:', error);
        showNotification('Failed to add plant record', 'error');
        throw error;
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}
```

### ✅ After (Using all utility modules):
```javascript
import { 
    withButtonLoading, 
    wrapAsync, 
    handleFetchResponse, 
    showSuccess, 
    showError,
    $,
    toggleElement 
} from './modules/utils/index.js';

const addPlantRecord = withButtonLoading(
    $('#add-plant-btn'),
    wrapAsync(async (formData) => {
        // Validation handled by FormUtils (registered separately)
        
        // API call with error handling
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        await handleFetchResponse(response, { endpoint: '/api/plants' });
        const result = await response.json();
        
        showSuccess('Plant record added successfully!');
        
        // Clean UI update
        toggleElement($('.plant-list'), false, 'fade');
        setTimeout(() => {
            updatePlantList();
            toggleElement($('.plant-list'), true, 'fade');
        }, 100);
        
        return result;
    }, { operation: 'addPlantRecord' }),
    { loadingText: 'Adding plant...', showSpinner: true }
);
```

## 7. Implementation Strategy

### Phase 1: Setup Module Loading
```html
<!-- Add to index.html -->
<script type="module">
    import './public/js/modules/moduleLoader.js';
</script>
```

### Phase 2: Gradual Migration
1. Start with high-impact functions (most repeated patterns)
2. Migrate one pattern type at a time (error handling → loading → notifications)
3. Test each migration thoroughly
4. Update function signatures to use async/await consistently

### Phase 3: Global Function Bridge
```javascript
// Add to script.js for backward compatibility
import { 
    showSuccess, 
    showError, 
    withButtonLoading, 
    handleApiError 
} from './public/js/modules/utils/index.js';

// Legacy compatibility
window.showSuccess = showSuccess;
window.showError = showError;
window.withButtonLoading = withButtonLoading;
window.handleApiError = handleApiError;
```

### Phase 4: Pattern Replacement Stats
- **Error Handling**: 274 try-catch blocks → 5-10 `wrapAsync()` utility calls
- **Loading States**: 35 manual loading patterns → Automatic with wrapper functions  
- **Notifications**: 458 inconsistent calls → Consistent typed functions
- **Form Validation**: Scattered validation → Centralized rule-based system
- **DOM Manipulation**: Manual queries → Cached, utility-based operations

## 8. Benefits After Migration

1. **Code Reduction**: ~80% reduction in boilerplate code
2. **Consistency**: Standardized error handling, loading states, and notifications
3. **Maintainability**: Centralized patterns easy to update and extend
4. **Performance**: Caching, debouncing, and optimized DOM operations
5. **Developer Experience**: Type-safe patterns with better error messages
6. **Testing**: Isolated utilities are easier to unit test

## 9. Next Steps

1. ✅ **Utility modules created** (errorHandler.js, loadingManager.js, notificationManager.js, formUtils.js, domUtils.js)
2. 🔄 **Module loader implemented** (moduleLoader.js with dependency management)
3. 📋 **Migration guide documented** (this file)
4. ⏳ **Begin gradual migration** (start with high-impact patterns)
5. ⏳ **Add TypeScript definitions** (for better developer experience)
6. ⏳ **Create automated migration tools** (regex-based pattern replacement)

---

The utility modules are ready to replace all 800+ repeated patterns in script.js, providing a clean, maintainable, and performant foundation for the aquaponics application.