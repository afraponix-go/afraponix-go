// Notifications Component
// Handles toast notifications and confirmation dialogs

/**
 * Notifications Component
 * Manages toast notifications, confirmation dialogs, and user feedback
 */
export default class Notifications {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.activeNotifications = new Set();
    }

    /**
     * Initialize the notifications system
     */
    initialize() {
        this.createNotificationContainer();
        console.log('📢 Notifications system initialized');
    }

    /**
     * Create and setup notification container
     */
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (container) {
            console.log('📢 Using existing notification container');
            this.container = container;
            return container;
        }

        console.log('📢 Creating notification container');
        container = document.createElement('div');
        container.id = 'notification-container';
        
        // Apply critical styles with aggressive specificity
        const criticalStyles = {
            'position': 'fixed !important',
            'top': '20px !important',
            'right': '20px !important',
            'z-index': '999999 !important',
            'pointer-events': 'none !important',
            'width': 'auto !important',
            'height': 'auto !important',
            'max-width': '400px !important',
            'display': 'block !important',
            'visibility': 'visible !important',
            'opacity': '1 !important'
        };

        // Apply styles with high specificity
        Object.entries(criticalStyles).forEach(([property, value]) => {
            container.style.setProperty(property, value.replace(' !important', ''), 'important');
        });

        document.body.appendChild(container);
        this.container = container;

        // Force style recalculation
        setTimeout(() => {
            const computedStyles = window.getComputedStyle(container);
            if (computedStyles.position !== 'fixed') {
                console.warn('⚠️ Notification container position override detected, forcing fixed position');
                container.style.setProperty('position', 'fixed', 'important');
                container.style.setProperty('top', '20px', 'important');
                container.style.setProperty('right', '20px', 'important');
                container.style.setProperty('z-index', '999999', 'important');
            }
        }, 100);

        return container;
    }

    /**
     * Show a toast notification
     */
    showNotification(message, type = 'info', duration = 4000) {
        // Suppress notifications during loading unless it's a success message
        if (this.app.isLoading && !message.includes('Afraponix Go loaded successfully')) {
            console.log('🔇 Suppressing notification during loading:', message);
            return;
        }

        // Don't show notifications on landing page unless it's auth-related
        const landingPage = document.getElementById('landing-page');
        if (landingPage && landingPage.style.display === 'block') {
            const authKeywords = ['login', 'register', 'verification', 'password', 'email', 'Welcome', 'Logged out'];
            const isAuthNotification = authKeywords.some(keyword => 
                message.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (!isAuthNotification) {
                console.log('🔇 Suppressing non-auth notification on landing page:', message);
                return;
            }
        }

        console.log(`📢 Showing ${type} notification:`, message);

        if (!document.getElementById('notification-container')) {
            this.createNotificationContainer();
        }

        const container = this.container || document.getElementById('notification-container');
        if (!container) {
            console.error('❌ Failed to create notification container');
            return;
        }

        const notification = this.createNotificationElement(message, type);
        
        // Add to container and track
        container.appendChild(notification);
        this.activeNotifications.add(notification);

        // Force container visibility
        this.enforceContainerStyles(container);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.removeNotification(notification), duration);
        }

        return notification;
    }

    /**
     * Create a notification element
     */
    createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Type-specific styling
        const typeStyles = {
            success: { backgroundColor: '#4caf50', color: 'white', icon: '✅' },
            error: { backgroundColor: '#f44336', color: 'white', icon: '❌' },
            warning: { backgroundColor: '#ff9800', color: 'white', icon: '⚠️' },
            info: { backgroundColor: '#2196f3', color: 'white', icon: 'ℹ️' }
        };

        const style = typeStyles[type] || typeStyles.info;
        
        // Apply styles
        Object.assign(notification.style, {
            backgroundColor: style.backgroundColor,
            color: style.color,
            padding: '12px 16px',
            marginBottom: '10px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            lineHeight: '1.4',
            maxWidth: '100%',
            wordBreak: 'break-word',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: '1000000'
        });

        // Add content with icon
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="flex-shrink: 0; font-size: 16px;">${style.icon}</span>
                <span style="flex: 1;">${message}</span>
                <span style="flex-shrink: 0; cursor: pointer; opacity: 0.7; margin-left: 8px; font-size: 18px; line-height: 1;" onclick="this.closest('.notification').remove()">×</span>
            </div>
        `;

        // Click to dismiss
        notification.addEventListener('click', (e) => {
            if (e.target.textContent !== '×') {
                this.removeNotification(notification);
            }
        });

        // Hover effects
        notification.addEventListener('mouseenter', () => {
            notification.style.transform = 'translateX(-5px)';
            notification.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
        });

        notification.addEventListener('mouseleave', () => {
            notification.style.transform = 'translateX(0)';
            notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });

        return notification;
    }

    /**
     * Remove a notification
     */
    removeNotification(notification) {
        if (!notification || !notification.parentElement) return;

        // Fade out animation
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';

        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
            this.activeNotifications.delete(notification);
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        const container = this.container || document.getElementById('notification-container');
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
        this.activeNotifications.clear();
    }

    /**
     * Show custom confirmation dialog
     */
    showCustomConfirm(title, message, details = []) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                transform: scale(0.9);
                transition: transform 0.3s ease;
                margin: 20px;
            `;

            // Build modal content
            let modalContent = `
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px; font-weight: 600;">
                        ${title}
                    </h3>
                    <p style="margin: 0; color: #666; line-height: 1.5;">
                        ${message}
                    </p>
                </div>
            `;

            if (details.length > 0) {
                modalContent += `
                    <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #2196f3;">
                        ${details.join('<br>')}
                    </div>
                `;
            }

            modalContent += `
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="confirm-cancel" style="
                        background: #f5f5f5;
                        color: #666;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.2s ease;
                    ">Cancel</button>
                    <button id="confirm-ok" style="
                        background: #2196f3;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s ease;
                    ">OK</button>
                </div>
            `;

            modal.innerHTML = modalContent;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });

            // Event handlers
            const cleanup = () => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    if (overlay.parentElement) {
                        document.body.removeChild(overlay);
                    }
                }, 300);
            };

            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };

            document.addEventListener('keydown', handleKeydown);

            modal.querySelector('#confirm-ok').addEventListener('click', () => {
                cleanup();
                resolve(true);
                document.removeEventListener('keydown', handleKeydown);
            });

            modal.querySelector('#confirm-cancel').addEventListener('click', () => {
                cleanup();
                resolve(false);
                document.removeEventListener('keydown', handleKeydown);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            });

            // Button hover effects
            const buttons = modal.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    if (btn.id === 'confirm-ok') {
                        btn.style.background = '#1976d2';
                    } else {
                        btn.style.background = '#eeeeee';
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    if (btn.id === 'confirm-ok') {
                        btn.style.background = '#2196f3';
                    } else {
                        btn.style.background = '#f5f5f5';
                    }
                });
            });
        });
    }

    /**
     * Enforce container styles (fix for CSS conflicts)
     */
    enforceContainerStyles(container) {
        const forceStyles = () => {
            container.style.setProperty('position', 'fixed', 'important');
            container.style.setProperty('top', '20px', 'important');
            container.style.setProperty('right', '20px', 'important');
            container.style.setProperty('z-index', '999999', 'important');
            container.style.setProperty('pointer-events', 'none', 'important');
            container.style.setProperty('display', 'block', 'important');
            container.style.setProperty('visibility', 'visible', 'important');
        };

        forceStyles();
        
        // Re-enforce after a brief delay
        setTimeout(forceStyles, 50);
        setTimeout(forceStyles, 100);
    }

    /**
     * Get notification statistics
     */
    getStats() {
        return {
            container: !!this.container,
            activeCount: this.activeNotifications.size,
            containerInDOM: !!document.getElementById('notification-container')
        };
    }
}