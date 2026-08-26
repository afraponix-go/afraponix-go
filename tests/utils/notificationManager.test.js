/**
 * NotificationManager Module Tests
 * Tests for the standardized notification system utility
 */

import { NotificationManager, showNotification, showSuccess, showError, dismissNotification } from '../../public/js/modules/utils/notificationManager.js';

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn((tagName) => {
    const element = {
      tagName: tagName.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      style: { cssText: '' },
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn()
      },
      setAttribute: jest.fn(),
      addEventListener: jest.fn(),
      remove: jest.fn(),
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };
    return element;
  })
});

Object.defineProperty(document, 'querySelectorAll', {
  writable: true,
  value: jest.fn(() => [])
});

// Mock document.body
Object.defineProperty(document, 'body', {
  writable: true,
  value: {
    appendChild: jest.fn()
  }
});

describe('NotificationManager', () => {
  let notificationManager;
  
  beforeEach(() => {
    // Clear any existing global references
    delete window.notificationManager;
    delete window.app;
    
    notificationManager = new NotificationManager();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    notificationManager.destroy();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with default options', () => {
      const manager = new NotificationManager();
      expect(manager.options.defaultDuration).toBe(4000);
      expect(manager.options.maxNotifications).toBe(5);
      expect(manager.options.position).toBe('top-right');
      expect(manager.options.enableSound).toBe(false);
    });

    test('should accept custom options', () => {
      const manager = new NotificationManager({
        defaultDuration: 6000,
        maxNotifications: 10,
        position: 'bottom-left',
        enableSound: true
      });
      expect(manager.options.defaultDuration).toBe(6000);
      expect(manager.options.maxNotifications).toBe(10);
      expect(manager.options.position).toBe('bottom-left');
      expect(manager.options.enableSound).toBe(true);
    });

    test('should initialize container', () => {
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    test('should initialize statistics', () => {
      const stats = notificationManager.getStats();
      expect(stats.totalShown).toBe(0);
      expect(stats.dismissed).toBe(0);
      expect(stats.expired).toBe(0);
      expect(stats.active).toBe(0);
    });
  });

  describe('Basic Notification Operations', () => {
    test('should show basic notification', () => {
      const id = notificationManager.show('Test message', 'info', 5000);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(notificationManager.getStats().totalShown).toBe(1);
      expect(notificationManager.getStats().active).toBe(1);
    });

    test('should show success notification with default duration', () => {
      const id = notificationManager.success('Success message');
      
      expect(id).toBeDefined();
      expect(notificationManager.getStats().totalShown).toBe(1);
    });

    test('should show error notification with longer default duration', () => {
      const id = notificationManager.error('Error message');
      
      expect(id).toBeDefined();
      expect(notificationManager.getStats().totalShown).toBe(1);
      
      // Error notifications should auto-dismiss after 8000ms
      jest.advanceTimersByTime(8000);
      expect(notificationManager.getStats().expired).toBe(1);
    });

    test('should show warning notification', () => {
      const id = notificationManager.warning('Warning message');
      
      expect(id).toBeDefined();
      // Warning notifications should auto-dismiss after 6000ms
      jest.advanceTimersByTime(6000);
      expect(notificationManager.getStats().expired).toBe(1);
    });

    test('should show info notification', () => {
      const id = notificationManager.info('Info message');
      
      expect(id).toBeDefined();
    });
  });

  describe('Notification Dismissal', () => {
    test('should dismiss notification manually', () => {
      const id = notificationManager.show('Test message');
      
      const dismissed = notificationManager.dismiss(id, 'manual');
      
      expect(dismissed).toBe(true);
      expect(notificationManager.getStats().dismissed).toBe(1);
    });

    test('should return false when dismissing non-existent notification', () => {
      const dismissed = notificationManager.dismiss('non-existent-id');
      
      expect(dismissed).toBe(false);
    });

    test('should dismiss all notifications', () => {
      notificationManager.show('Message 1');
      notificationManager.show('Message 2');
      notificationManager.show('Message 3');
      
      expect(notificationManager.getStats().active).toBe(3);
      
      const dismissedCount = notificationManager.dismissAll();
      
      expect(dismissedCount).toBe(3);
      expect(notificationManager.getStats().dismissed).toBe(3);
    });

    test('should auto-dismiss after duration expires', () => {
      notificationManager.show('Auto dismiss', 'info', 2000);
      
      expect(notificationManager.getStats().active).toBe(1);
      
      jest.advanceTimersByTime(2000);
      
      expect(notificationManager.getStats().expired).toBe(1);
    });
  });

  describe('Persistent Notifications', () => {
    test('should create persistent notification', () => {
      const id = notificationManager.persistent('Persistent message', 'warning');
      
      expect(id).toBeDefined();
      
      // Should not auto-dismiss
      jest.advanceTimersByTime(10000);
      expect(notificationManager.getStats().active).toBe(1);
      expect(notificationManager.getStats().expired).toBe(0);
    });
  });

  describe('Notification Queue', () => {
    test('should queue notifications when max limit reached', () => {
      const manager = new NotificationManager({ maxNotifications: 2 });
      
      manager.show('Message 1');
      manager.show('Message 2');
      manager.show('Message 3'); // Should be queued
      
      expect(manager.getStats().active).toBe(2);
      expect(manager.getStats().queued).toBe(1);
    });

    test('should process queue when notification is dismissed', () => {
      const manager = new NotificationManager({ maxNotifications: 2 });
      
      const id1 = manager.show('Message 1', 'info', 1000);
      manager.show('Message 2');
      manager.show('Message 3'); // Queued
      
      expect(manager.getStats().active).toBe(2);
      expect(manager.getStats().queued).toBe(1);
      
      // Dismiss first notification
      manager.dismiss(id1);
      
      // Process queue (simulate timeout)
      jest.advanceTimersByTime(100);
      
      expect(manager.getStats().active).toBe(2);
      expect(manager.getStats().queued).toBe(0);
    });
  });

  describe('Notification Updates', () => {
    test('should update existing notification message', () => {
      const id = notificationManager.show('Original message');
      
      const updated = notificationManager.update(id, 'Updated message');
      
      expect(updated).toBe(true);
    });

    test('should update notification type', () => {
      const id = notificationManager.show('Message', 'info');
      
      const updated = notificationManager.update(id, 'Updated message', 'success');
      
      expect(updated).toBe(true);
    });

    test('should return false when updating non-existent notification', () => {
      const updated = notificationManager.update('non-existent', 'New message');
      
      expect(updated).toBe(false);
    });
  });

  describe('Icon Generation', () => {
    test('should return correct icons for different types', () => {
      expect(notificationManager.getNotificationIcon('success')).toBe('✅');
      expect(notificationManager.getNotificationIcon('error')).toBe('❌');
      expect(notificationManager.getNotificationIcon('warning')).toBe('⚠️');
      expect(notificationManager.getNotificationIcon('info')).toBe('ℹ️');
    });

    test('should return default icon for unknown type', () => {
      expect(notificationManager.getNotificationIcon('unknown')).toBe('ℹ️');
    });
  });

  describe('HTML Escaping', () => {
    test('should escape HTML in messages', () => {
      const htmlMessage = '<script>alert("xss")</script>Test';
      const escaped = notificationManager.escapeHtml(htmlMessage);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    test('should handle plain text messages', () => {
      const plainMessage = 'This is a plain message';
      const result = notificationManager.escapeHtml(plainMessage);
      
      expect(result).toBe(plainMessage);
    });
  });

  describe('Sound Functionality', () => {
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
      mockOscillator = {
        connect: jest.fn(),
        frequency: { setValueAtTime: jest.fn() },
        type: 'sine',
        start: jest.fn(),
        stop: jest.fn()
      };
      
      mockGainNode = {
        connect: jest.fn(),
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn()
        }
      };
      
      mockAudioContext = {
        createOscillator: jest.fn(() => mockOscillator),
        createGain: jest.fn(() => mockGainNode),
        destination: {},
        currentTime: 0
      };
      
      global.window.AudioContext = jest.fn(() => mockAudioContext);
    });

    test('should play sound when enabled', () => {
      const manager = new NotificationManager({ enableSound: true });
      
      manager.playNotificationSound('success');
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    test('should use different frequencies for different types', () => {
      const manager = new NotificationManager({ enableSound: true });
      
      manager.playNotificationSound('error');
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(400, 0);
    });

    test('should handle audio context creation error gracefully', () => {
      delete global.window.AudioContext;
      delete global.window.webkitAudioContext;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      notificationManager.playNotificationSound('info');
      
      // Should not throw error
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track notification statistics correctly', () => {
      notificationManager.show('Message 1', 'info', 1000);
      notificationManager.show('Message 2', 'success', 2000);
      
      const stats = notificationManager.getStats();
      
      expect(stats.totalShown).toBe(2);
      expect(stats.active).toBe(2);
      
      // Let one expire
      jest.advanceTimersByTime(1000);
      
      const updatedStats = notificationManager.getStats();
      expect(updatedStats.expired).toBe(1);
    });

    test('should get active notifications list', () => {
      notificationManager.show('Active 1', 'info');
      notificationManager.show('Active 2', 'warning');
      
      const activeNotifications = notificationManager.getActiveNotifications();
      
      expect(activeNotifications).toHaveLength(2);
      expect(activeNotifications[0].message).toBe('Active 1');
      expect(activeNotifications[1].message).toBe('Active 2');
    });

    test('should clear statistics', () => {
      notificationManager.show('Test');
      notificationManager.dismiss(notificationManager.notifications.keys().next().value);
      
      expect(notificationManager.getStats().totalShown).toBe(1);
      
      notificationManager.clearStats();
      
      expect(notificationManager.getStats().totalShown).toBe(0);
      expect(notificationManager.getStats().dismissed).toBe(0);
    });
  });

  describe('Global References', () => {
    test('should set up global references', () => {
      notificationManager.setupGlobalReference();
      
      expect(window.notificationManager).toBe(notificationManager);
      expect(typeof window.app.showNotification).toBe('function');
      expect(typeof window.app.showMessage).toBe('function');
    });

    test('should remove global references', () => {
      notificationManager.setupGlobalReference();
      expect(window.notificationManager).toBeDefined();
      
      notificationManager.removeGlobalReference();
      
      expect(window.notificationManager).toBeUndefined();
    });
  });

  describe('ID Generation', () => {
    test('should generate unique IDs', () => {
      const id1 = notificationManager.generateId();
      const id2 = notificationManager.generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^notification_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^notification_\d+_[a-z0-9]+$/);
    });
  });

  describe('Container Positioning', () => {
    test('should apply correct styles for different positions', () => {
      const manager = new NotificationManager({ position: 'bottom-left' });
      
      // Container should be created with correct positioning
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    test('should handle unknown position with fallback', () => {
      const manager = new NotificationManager({ position: 'unknown' });
      
      // Should not throw error and use default
      expect(manager.options.position).toBe('unknown');
    });
  });

  describe('Destruction', () => {
    test('should clean up properly on destroy', () => {
      notificationManager.show('Test 1');
      notificationManager.show('Test 2');
      
      expect(notificationManager.getStats().active).toBe(2);
      
      notificationManager.destroy();
      
      expect(notificationManager.container.remove).toHaveBeenCalled();
    });
  });

  describe('Utility Function Exports', () => {
    test('should export utility functions that work correctly', () => {
      const id = showNotification('Utility test', 'info', 3000);
      expect(id).toBeDefined();
      
      const successId = showSuccess('Success test');
      expect(successId).toBeDefined();
      
      const errorId = showError('Error test');
      expect(errorId).toBeDefined();
      
      const dismissed = dismissNotification(id);
      expect(dismissed).toBe(true);
    });
  });
});