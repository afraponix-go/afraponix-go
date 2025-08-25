// Config API Module
// Handles configuration and utility API calls

import { apiClient } from './baseApiClient.js';

/**
 * Send email configuration test
 */
export async function sendEmailConfig(emailData) {
    try {
        return await apiClient.post('config/send-email', emailData);
    } catch (error) {
        throw new Error(`Failed to send email config: ${error.message}`);
    }
}

/**
 * Fetch icon SVG
 */
export async function fetchIcon(iconName) {
    try {
        // Use full URL since icons are not in /api path
        const iconUrl = `/icons/new-icons/Afraponix Go Icons_${iconName}.svg`;
        const response = await apiClient.request(iconUrl, { 
            headers: { 'Content-Type': 'image/svg+xml' } 
        });
        return await response.text();
    } catch (error) {
        throw new Error(`Failed to fetch icon: ${error.message}`);
    }
}