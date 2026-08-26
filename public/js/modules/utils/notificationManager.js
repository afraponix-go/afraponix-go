// Notification Manager Utility
// Standardized notification system for success/error/info messages

/**
 * Notification Manager Class
 * Handles toast notifications, alerts, and user feedback consistently
 */
export class NotificationManager {
    constructor(options = {}) {
        this.options = {
            defaultDuration: 4000,
            maxNotifications: 5,
            position: 'top-right',
            enableSound: false,
            enableQueue: true,
            animationDuration: 300,
            ...options
        };
        
        this.notifications = new Map();
        this.queue = [];
        this.container = null;
        this.notificationStats = {
            totalShown: 0,
            dismissed: 0,
            expired: 0
        };
        
        this.initializeContainer();
        console.log('📢 Notification Manager initialized');
    }

    /**
     * Initialize notification container
     */
    initializeContainer() {
        // Remove any existing containers
        const existingContainers = document.querySelectorAll('.notification-container');
        existingContainers.forEach(container => container.remove());
        
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.setAttribute('data-position', this.options.position);
        
        this.applyContainerStyles();
        document.body.appendChild(this.container);
        
        console.log('✅ Notification container created');
    }

    /**
     * Apply styles to notification container
     */
    applyContainerStyles() {
        const positions = {
            'top-right': { top: '20px', right: '20px' },
            'top-left': { top: '20px', left: '20px' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
        };
        
        const position = positions[this.options.position] || positions['top-right'];
        
        this.container.style.cssText = `
            position: fixed;
            z-index: 10000;
            max-width: 400px;
            width: auto;
            pointer-events: none;
            display: block;
            visibility: visible;
            ${Object.entries(position).map(([key, value]) => `${key}: ${value}`).join('; ')};
        `;
    }

    /**
     * Show notification
     */
    show(message, type = 'info', duration = null) {
        const notificationConfig = {
            id: this.generateId(),
            message,
            type,
            duration: duration !== null ? duration : this.options.defaultDuration,
            timestamp: new Date().toISOString(),
            dismissed: false
        };
        
        // Add to queue if container is full
        if (this.notifications.size >= this.options.maxNotifications && this.options.enableQueue) {
            this.queue.push(notificationConfig);
            return notificationConfig.id;
        }
        
        this.displayNotification(notificationConfig);
        return notificationConfig.id;
    }

    /**
     * Display individual notification
     */
    displayNotification(config) {
        const element = this.createNotificationElement(config);
        
        this.notifications.set(config.id, {
            ...config,
            element
        });
        
        this.container.appendChild(element);
        this.notificationStats.totalShown++;
        
        // Trigger enter animation
        setTimeout(() => {
            element.classList.add('notification-enter');
        }, 10);
        
        // Auto-dismiss if duration is set
        if (config.duration > 0) {
            setTimeout(() => {
                this.dismiss(config.id, 'expired');
            }, config.duration);
        }
        
        // Play sound if enabled
        if (this.options.enableSound) {
            this.playNotificationSound(config.type);
        }
        
        // Process queue if notification was dismissed
        setTimeout(() => this.processQueue(), config.duration || 5000);
        
        return config.id;
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(config) {
        const element = document.createElement('div');
        element.className = `notification notification-${config.type}`;
        element.setAttribute('data-id', config.id);
        element.style.pointerEvents = 'auto';
        
        const icon = this.getNotificationIcon(config.type);
        const closeButton = config.duration === 0 ? this.createCloseButton(config.id) : '';
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${this.escapeHtml(config.message)}</div>
                ${closeButton}
            </div>
            ${config.duration > 0 ? this.createProgressBar(config.duration) : ''}
        `;
        
        // Apply styles
        this.applyNotificationStyles(element, config);
        
        // Add click handler for dismissal
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                this.dismiss(config.id, 'clicked');
            }
        });
        
        return element;
    }

    /**
     * Apply notification styles
     */
    applyNotificationStyles(element, config) {
        const baseStyles = `
            background: var(--bg-primary, #ffffff);
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 12px;
            min-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all ${this.options.animationDuration}ms ease;
            position: relative;
            overflow: hidden;
            cursor: pointer;
        `;
        
        const typeStyles = {
            success: 'border-left: 4px solid var(--color-bio-green, #28a745);',
            error: 'border-left: 4px solid #dc3545;',
            warning: 'border-left: 4px solid #ffc107;',
            info: 'border-left: 4px solid var(--color-deep-blue, #007bff);'
        };
        
        element.style.cssText = baseStyles + (typeStyles[config.type] || typeStyles.info);
        
        // Content styles
        const content = element.querySelector('.notification-content');
        if (content) {
            content.style.cssText = `
                display: flex;
                align-items: flex-start;
                padding: 16px;
                gap: 12px;
            `;
        }
        
        // Message styles
        const message = element.querySelector('.notification-message');
        if (message) {
            message.style.cssText = `
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
                color: var(--text-primary, #333333);
            `;
        }
        
        // Icon styles
        const icon = element.querySelector('.notification-icon');
        if (icon) {
            icon.style.cssText = `
                font-size: 16px;
                line-height: 1;
                margin-top: 1px;
            `;
        }
        
        // Enter animation class styles
        element.addEventListener('transitionend', () => {
            if (element.classList.contains('notification-enter')) {
                element.style.opacity = '1';
                element.style.transform = 'translateX(0)';
            }
        });
    }

    /**
     * Create close button
     */
    createCloseButton(id) {
        return `
            <button class="notification-close" onclick="event.stopPropagation(); window.notificationManager?.dismiss('${id}', 'manual')" 
                    style="
                        background: none;
                        border: none;
                        color: #666;
                        cursor: pointer;
                        font-size: 16px;
                        line-height: 1;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0.6;
                        transition: opacity 0.2s ease;
                    "
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.6'">
                ×
            </button>
        `;
    }

    /**
     * Create progress bar for timed notifications
     */
    createProgressBar(duration) {
        return `
            <div class="notification-progress" style="
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                width: 100%;
            ">
                <div class="notification-progress-bar" style="
                    height: 100%;
                    background: currentColor;
                    width: 100%;
                    animation: notificationProgress ${duration}ms linear forwards;
                "></div>
            </div>
            <style>
                @keyframes notificationProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            </style>
        `;
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Dismiss notification
     */
    dismiss(id, reason = 'manual') {
        const notification = this.notifications.get(id);
        if (!notification) {
            return false;
        }
        
        notification.dismissed = true;
        notification.dismissReason = reason;
        
        // Update stats
        if (reason === 'expired') {
            this.notificationStats.expired++;
        } else {
            this.notificationStats.dismissed++;
        }
        
        // Add exit animation
        const element = notification.element;
        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
            this.notifications.delete(id);
            this.processQueue();
        }, this.options.animationDuration);
        
        return true;
    }

    /**
     * Dismiss all notifications
     */
    dismissAll(reason = 'manual') {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.dismiss(id, reason));
        this.queue = [];
        return ids.length;
    }

    /**
     * Process notification queue
     */
    processQueue() {
        if (this.queue.length === 0 || this.notifications.size >= this.options.maxNotifications) {
            return;
        }
        
        const nextNotification = this.queue.shift();
        this.displayNotification(nextNotification);
    }

    /**
     * Show success notification
     */
    success(message, duration = null) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error notification
     */
    error(message, duration = null) {
        return this.show(message, 'error', duration !== null ? duration : 8000);
    }

    /**
     * Show warning notification
     */
    warning(message, duration = null) {
        return this.show(message, 'warning', duration !== null ? duration : 6000);
    }

    /**
     * Show info notification
     */
    info(message, duration = null) {
        return this.show(message, 'info', duration);
    }

    /**
     * Show persistent notification (no auto-dismiss)
     */
    persistent(message, type = 'info') {
        return this.show(message, type, 0);
    }

    /**
     * Update existing notification
     */
    update(id, newMessage, newType = null) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return false;
        }
        
        const messageElement = notification.element.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = newMessage;
        }
        
        if (newType && newType !== notification.type) {
            notification.element.className = `notification notification-${newType}`;
            const iconElement = notification.element.querySelector('.notification-icon');
            if (iconElement) {
                iconElement.textContent = this.getNotificationIcon(newType);
            }
        }
        
        notification.message = newMessage;
        if (newType) notification.type = newType;
        
        return true;
    }

    /**
     * Play notification sound
     */
    playNotificationSound(type) {
        try {
            // Create audio context if supported
            if (window.AudioContext || window.webkitAudioContext) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Different frequencies for different types
                const frequencies = {
                    success: 800,
                    error: 400,
                    warning: 600,
                    info: 700
                };
                
                oscillator.frequency.setValueAtTime(frequencies[type] || 700, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    /**
     * Escape HTML in messages
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get notification statistics
     */
    getStats() {
        return {
            ...this.notificationStats,
            active: this.notifications.size,
            queued: this.queue.length,
            totalProcessed: this.notificationStats.totalShown + this.queue.length
        };
    }

    /**
     * Get active notifications
     */
    getActiveNotifications() {
        return Array.from(this.notifications.values()).map(n => ({
            id: n.id,
            message: n.message,
            type: n.type,
            timestamp: n.timestamp,
            dismissed: n.dismissed
        }));
    }

    /**
     * Clear statistics
     */
    clearStats() {
        this.notificationStats = {
            totalShown: 0,
            dismissed: 0,
            expired: 0
        };
    }

    /**
     * Set global reference for compatibility
     */
    setupGlobalReference() {
        window.notificationManager = this;
        
        // Provide compatibility functions
        if (!window.app) {
            window.app = {};
        }
        
        window.app.showMessage = (message, type) => this.show(message, type);
        window.app.showNotification = (message, type, duration) => this.show(message, type, duration);
        
        console.log('✅ Global notification references established');
    }

    /**
     * Remove global references
     */
    removeGlobalReference() {
        delete window.notificationManager;
        
        if (window.app) {
            delete window.app.showMessage;
            delete window.app.showNotification;
        }
    }

    /**
     * Destroy notification manager
     */
    destroy() {
        this.dismissAll('destroyed');
        
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
        
        this.removeGlobalReference();
        console.log('✅ Notification Manager destroyed');
    }
}

// Create global notification manager instance
const notificationManager = new NotificationManager();

// Set up global references
notificationManager.setupGlobalReference();

// Utility functions
export const showNotification = (message, type, duration) => notificationManager.show(message, type, duration);
export const showSuccess = (message, duration) => notificationManager.success(message, duration);
export const showError = (message, duration) => notificationManager.error(message, duration);
export const showWarning = (message, duration) => notificationManager.warning(message, duration);
export const showInfo = (message, duration) => notificationManager.info(message, duration);
export const dismissNotification = (id) => notificationManager.dismiss(id);
export const dismissAllNotifications = () => notificationManager.dismissAll();

// Export the instance as default
export default notificationManager;