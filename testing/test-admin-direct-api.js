// Test admin API endpoints directly from browser console
console.log('🧪 Testing admin API calls directly...');

// Test 1: Admin users
console.log('Testing /api/admin/users...');
fetch('/api/admin/users', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('auth_token')}`
    }
})
.then(response => {
    console.log('✅ Admin users response status:', response.status);
    return response.json();
})
.then(data => {
    console.log('✅ Admin users data:', data);
})
.catch(error => {
    console.error('❌ Admin users error:', error);
});

// Test 2: Admin stats  
setTimeout(() => {
    console.log('Testing /api/admin/stats...');
    fetch('/api/admin/stats', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('auth_token')}`
        }
    })
    .then(response => {
        console.log('✅ Admin stats response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Admin stats data:', data);
    })
    .catch(error => {
        console.error('❌ Admin stats error:', error);
    });
}, 1000);

// Test 3: Crop knowledge crops
setTimeout(() => {
    console.log('Testing /crop-knowledge/admin/ratio-rules...');
    fetch('/crop-knowledge/admin/ratio-rules', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('auth_token')}`
        }
    })
    .then(response => {
        console.log('✅ Ratio rules response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Ratio rules data:', data);
    })
    .catch(error => {
        console.error('❌ Ratio rules error:', error);
    });
}, 2000);