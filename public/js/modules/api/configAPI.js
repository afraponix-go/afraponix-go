// Config API Module
// Handles configuration and utility API calls

/**
 * Send email configuration test
 */
export async function sendEmailConfig(emailData) {
    const response = await fetch('/api/config/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
    });
    if (!response.ok) throw new Error('Failed to send email config');
    return response.json();
}

/**
 * Fetch icon SVG
 */
export async function fetchIcon(iconName) {
    const response = await fetch(`/icons/new-icons/Afraponix Go Icons_${iconName}.svg`);
    if (!response.ok) throw new Error('Failed to fetch icon');
    return response.text();
}