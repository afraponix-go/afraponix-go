// Debug script to test admin API endpoints directly

console.log('🔍 Testing admin API endpoints...');

// Test admin users endpoint
fetch('/api/admin/users', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
})
.then(response => {
    console.log('👥 Admin Users Response Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('👥 Admin Users Data:', data);
})
.catch(error => {
    console.error('❌ Admin Users Error:', error);
});

// Test admin stats endpoint
fetch('/api/admin/stats', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
})
.then(response => {
    console.log('📊 Admin Stats Response Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('📊 Admin Stats Data:', data);
})
.catch(error => {
    console.error('❌ Admin Stats Error:', error);
});

// Test crop knowledge crops endpoint
fetch('/api/crop-knowledge/crops', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
})
.then(response => {
    console.log('🌱 Crops Response Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('🌱 Crops Data:', data);
})
.catch(error => {
    console.error('❌ Crops Error:', error);
});

// Test ratio rules endpoint
fetch('/api/crop-knowledge/admin/ratio-rules', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
})
.then(response => {
    console.log('🧮 Ratio Rules Response Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('🧮 Ratio Rules Data:', data);
})
.catch(error => {
    console.error('❌ Ratio Rules Error:', error);
});