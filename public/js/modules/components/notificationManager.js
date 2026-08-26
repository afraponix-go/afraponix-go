// Notification Manager Component
// Handles application notifications, toasts, and confirmation dialogs

/**
 * Notification Manager Component Class
 * Manages toast notifications, confirmations, and user messaging
 */
export class NotificationManagerComponent {
    constructor(app) {
        this.app = app;
        
        console.log('🔔 Notification Manager Component initialized');
    }

    /**
     * Create notification container if it doesn't exist
     * Complexity: 15, Lines: 35+
     */
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            
            // Apply aggressive inline styling to override any potential CSS conflicts
            const containerStyles = {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '10000',
                maxWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none'
            };
            
            Object.assign(container.style, containerStyles);
            
            // Force styles with higher specificity
            container.setAttribute('style', `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 10000 !important;
                max-width: 400px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                pointer-events: none !important;
            `);
            
            document.body.appendChild(container);
            
            // Re-enforce styles after a brief delay
            setTimeout(() => {
                Object.assign(container.style, containerStyles);
                container.setAttribute('style', `
                    position: fixed !important;
                    top: 20px !important;
                    right: 20px !important;
                    z-index: 10000 !important;
                    max-width: 400px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 10px !important;
                    pointer-events: none !important;
                `);
            }, 50);
        }
        return container;
    }

    /**
     * Show notification toast
     * Complexity: 25, Lines: 110+
     */
    showNotification(message, type = 'info', duration = 4000) {
        // Don't show notifications if we're in a test environment or if notifications are disabled
        if (typeof window === 'undefined' || document.hidden) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const container = this.createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Enhanced styling for better visibility
        const baseStyles = {
            backgroundColor: this.getNotificationColor(type),
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${this.getNotificationBorderColor(type)}`,
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease-in-out',
            pointerEvents: 'auto',
            maxWidth: '100%',
            wordWrap: 'break-word',
            position: 'relative'
        };
        
        Object.assign(notification.style, baseStyles);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.7;
            transition: opacity 0.2s;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        closeButton.onmouseover = () => closeButton.style.opacity = '1';
        closeButton.onmouseout = () => closeButton.style.opacity = '0.7';
        closeButton.onclick = () => this.removeNotification(notification);
        
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.textContent = message;
        messageContainer.style.flex = '1';
        
        notification.appendChild(messageContainer);
        notification.appendChild(closeButton);
        
        // Force visibility styles
        setTimeout(() => {
            Object.assign(notification.style, baseStyles);
            notification.setAttribute('style', notification.getAttribute('style') + `
                background-color: ${this.getNotificationColor(type)} !important;
                color: white !important;
                position: relative !important;
                z-index: 10001 !important;
                display: flex !important;
            `);
        }, 10);

        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 50);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Remove notification with animation
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Get notification background color
     */
    getNotificationColor(type) {
        const colors = {
            success: '#10b981', // green-500
            error: '#ef4444',   // red-500
            warning: '#f59e0b', // amber-500
            info: '#3b82f6'     // blue-500
        };
        return colors[type] || colors.info;
    }

    /**
     * Get notification border color
     */
    getNotificationBorderColor(type) {
        const colors = {
            success: '#059669', // green-600
            error: '#dc2626',   // red-600
            warning: '#d97706', // amber-600
            info: '#2563eb'     // blue-600
        };
        return colors[type] || colors.info;
    }

    /**
     * Clear all notifications
     * Complexity: 5, Lines: 10
     */
    clearAllNotifications() {
        const container = document.getElementById('notification-container');
        if (container) {
            const notifications = container.querySelectorAll('.notification');
            notifications.forEach(notification => {
                this.removeNotification(notification);
            });
        }
    }

    /**
     * Show custom confirmation dialog
     * Complexity: 20, Lines: 80+
     */
    showCustomConfirm(title, message, details = []) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;

            // Create dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.2s ease-out;
            `;

            let detailsHtml = '';
            if (details.length > 0) {
                detailsHtml = `
                    <div style="margin: 16px 0; padding: 12px; background: #f3f4f6; border-radius: 8px;">
                        ${details.map(detail => `<div style="margin: 4px 0; color: #374151;">• ${detail}</div>`).join('')}
                    </div>
                `;
            }

            dialog.innerHTML = `
                <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600;">${title}</h3>
                <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.5;">${message}</p>
                ${detailsHtml}
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                    <button id="cancel-btn" style="
                        padding: 8px 16px;
                        border: 1px solid #d1d5db;
                        background: white;
                        color: #374151;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Cancel</button>
                    <button id="confirm-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background: #ef4444;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Confirm</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Add animation styles
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            // Event listeners
            dialog.querySelector('#cancel-btn').onclick = () => {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
                resolve(false);
            };

            dialog.querySelector('#confirm-btn').onclick = () => {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
                resolve(true);
            };

            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                    resolve(false);
                }
            };

            // Close on escape key
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                        document.head.removeChild(style);
                        resolve(false);
                    }
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            componentLoaded: true,
            hasNotificationContainer: !!document.getElementById('notification-container'),
            activeNotifications: document.querySelectorAll('.notification').length
        };
    }

    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Notification Manager component');
        this.clearAllNotifications();
        
        const container = document.getElementById('notification-container');
        if (container) {
            container.remove();
        }
    }
}

// Export both class and create a factory function
export default NotificationManagerComponent;

/**
 * Factory function to create notification manager component
 */
export function createNotificationManagerComponent(app) {
    return new NotificationManagerComponent(app);
}