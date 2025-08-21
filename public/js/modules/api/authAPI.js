// Auth API Module
// Handles all authentication and user management API calls

/**
 * Resend verification email
 */
export async function resendVerificationEmail(emailData) {
    const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
    });
    if (!response.ok) throw new Error('Failed to resend verification email');
    return response.json();
}

/**
 * Send forgot password email
 */
export async function sendForgotPasswordEmail(emailData) {
    const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
    });
    if (!response.ok) throw new Error('Failed to send forgot password email');
    return response.json();
}

/**
 * Check username availability
 */
export async function checkUsernameAvailability(usernameData) {
    const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usernameData)
    });
    if (!response.ok) throw new Error('Failed to check username');
    return response.json();
}