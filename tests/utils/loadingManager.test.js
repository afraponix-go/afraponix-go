/**
 * LoadingManager Module Tests
 * Tests for the standardized loading states and spinners utility
 */

import { LoadingManager, startLoading, stopLoading, withLoading, withButtonLoading } from '../../public/js/modules/utils/loadingManager.js';

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('LoadingManager', () => {
  let loadingManager;
  
  beforeEach(() => {
    loadingManager = new LoadingManager();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with default options', () => {
      const manager = new LoadingManager();
      expect(manager.options.defaultTimeout).toBe(30000);
      expect(manager.options.showProgress).toBe(true);
      expect(manager.options.enableDebugLogging).toBe(false);
    });

    test('should accept custom options', () => {
      const manager = new LoadingManager({
        defaultTimeout: 10000,
        enableDebugLogging: true
      });
      expect(manager.options.defaultTimeout).toBe(10000);
      expect(manager.options.enableDebugLogging).toBe(true);
    });

    test('should initialize loading statistics', () => {
      const stats = loadingManager.getLoadingStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.completedOperations).toBe(0);
      expect(stats.failedOperations).toBe(0);
      expect(stats.averageLoadTime).toBe(0);
    });
  });

  describe('Basic Loading Operations', () => {
    test('should start loading operation', () => {
      const config = loadingManager.startLoading('test-operation', {
        message: 'Testing...'
      });

      expect(config.id).toBe('test-operation');
      expect(config.message).toBe('Testing...');
      expect(loadingManager.isLoading('test-operation')).toBe(true);
      expect(loadingManager.getLoadingStats().totalOperations).toBe(1);
    });

    test('should stop loading operation successfully', () => {
      loadingManager.startLoading('test-operation');
      const result = loadingManager.stopLoading('test-operation', 'success');

      expect(result.result).toBe('success');
      expect(loadingManager.isLoading('test-operation')).toBe(false);
      expect(loadingManager.getLoadingStats().completedOperations).toBe(1);
    });

    test('should stop loading operation with error', () => {
      loadingManager.startLoading('test-operation');
      loadingManager.stopLoading('test-operation', 'error');

      expect(loadingManager.getLoadingStats().failedOperations).toBe(1);
      expect(loadingManager.getLoadingStats().completedOperations).toBe(0);
    });

    test('should warn when stopping non-existent loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      loadingManager.stopLoading('non-existent');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted to stop non-existent loading')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Element State Management', () => {
    let mockButton;

    beforeEach(() => {
      mockButton = {
        tagName: 'BUTTON',
        textContent: 'Submit',
        innerHTML: 'Submit',
        disabled: false,
        className: 'btn-primary',
        style: { cssText: '' },
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => false)
        }
      };
    });

    test('should capture and restore element state', () => {
      const originalState = loadingManager.captureElementState(mockButton);
      
      expect(originalState.textContent).toBe('Submit');
      expect(originalState.disabled).toBe(false);
      expect(originalState.className).toBe('btn-primary');
    });

    test('should apply loading state to button', () => {
      const config = {
        message: 'Submitting...',
        showSpinner: true,
        disableElement: true
      };
      
      loadingManager.applyLoadingState(mockButton, config);
      
      expect(mockButton.disabled).toBe(true);
      expect(mockButton.innerHTML).toContain('Submitting...');
      expect(mockButton.classList.add).toHaveBeenCalledWith('loading');
    });

    test('should restore element to original state', () => {
      const originalState = {
        textContent: 'Submit',
        innerHTML: 'Submit',
        disabled: false,
        className: 'btn-primary',
        style: ''
      };
      
      mockButton.disabled = true;
      mockButton.innerHTML = 'Loading...';
      
      loadingManager.restoreElementState(mockButton, originalState);
      
      expect(mockButton.disabled).toBe(false);
      expect(mockButton.innerHTML).toBe('Submit');
      expect(mockButton.className).toBe('btn-primary');
    });
  });

  describe('Loading Wrappers', () => {
    test('should wrap async operation with loading', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const wrappedOperation = loadingManager.withLoading('test', mockOperation);
      
      const result = await wrappedOperation('arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2');
      expect(loadingManager.getLoadingStats().completedOperations).toBe(1);
    });

    test('should handle async operation error in wrapper', async () => {
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      const wrappedOperation = loadingManager.withLoading('test', mockOperation);
      
      await expect(wrappedOperation()).rejects.toThrow('Operation failed');
      expect(loadingManager.getLoadingStats().failedOperations).toBe(1);
    });

    test('should wrap button loading operation', async () => {
      const mockButton = {
        tagName: 'BUTTON',
        textContent: 'Submit',
        innerHTML: 'Submit',
        disabled: false,
        className: '',
        style: { cssText: '' },
        classList: {
          add: jest.fn(),
          contains: jest.fn(() => false)
        }
      };
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      const wrappedOperation = loadingManager.withButtonLoading(mockButton, mockOperation);
      
      const result = await wrappedOperation();
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('Form Loading', () => {
    let mockForm, mockInputs;

    beforeEach(() => {
      mockInputs = [
        { disabled: false, tagName: 'INPUT' },
        { disabled: true, tagName: 'SELECT' },
        { disabled: false, tagName: 'BUTTON' }
      ];
      
      mockForm = {
        querySelectorAll: jest.fn().mockReturnValue(mockInputs)
      };
    });

    test('should wrap form with loading state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('submitted');
      const wrappedOperation = loadingManager.withFormLoading(mockForm, mockOperation);
      
      const result = await wrappedOperation();
      
      expect(result).toBe('submitted');
      expect(mockForm.querySelectorAll).toHaveBeenCalledWith('input, select, textarea, button');
      
      // Check that inputs are restored to original disabled state
      expect(mockInputs[0].disabled).toBe(false);
      expect(mockInputs[1].disabled).toBe(true);
      expect(mockInputs[2].disabled).toBe(false);
    });

    test('should restore form inputs on error', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Form error'));
      const wrappedOperation = loadingManager.withFormLoading(mockForm, mockOperation);
      
      await expect(wrappedOperation()).rejects.toThrow('Form error');
      
      // Check that inputs are restored even after error
      expect(mockInputs[0].disabled).toBe(false);
      expect(mockInputs[1].disabled).toBe(true);
      expect(mockInputs[2].disabled).toBe(false);
    });
  });

  describe('Spinner and Overlay Creation', () => {
    test('should create spinner HTML', () => {
      const spinner = loadingManager.createSpinner('medium');
      
      expect(spinner).toContain('svg');
      expect(spinner).toContain('width="20"');
      expect(spinner).toContain('height="20"');
      expect(spinner).toContain('loading-spinner');
    });

    test('should create loading overlay', () => {
      const mockContainer = {
        style: { position: '' },
        appendChild: jest.fn()
      };
      
      const overlay = loadingManager.createLoadingOverlay(mockContainer, {
        message: 'Processing...'
      });
      
      expect(mockContainer.appendChild).toHaveBeenCalled();
      expect(overlay.remove).toBeDefined();
      expect(typeof overlay.remove).toBe('function');
    });
  });

  describe('Timeout Handling', () => {
    test('should handle loading timeout', () => {
      const onTimeout = jest.fn();
      
      loadingManager.startLoading('timeout-test', {
        timeout: 1000,
        onTimeout
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      expect(onTimeout).toHaveBeenCalledWith('timeout-test');
      expect(loadingManager.isLoading('timeout-test')).toBe(false);
    });

    test('should use default timeout handler', () => {
      loadingManager.startLoading('default-timeout', { timeout: 1000 });
      
      jest.advanceTimersByTime(1000);
      
      expect(window.app.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('taking longer than expected'),
        'warning',
        5000
      );
    });

    test('should clear timeout when loading stops before timeout', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      loadingManager.startLoading('early-stop', { timeout: 5000 });
      loadingManager.stopLoading('early-stop', 'success');
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should calculate loading statistics correctly', () => {
      loadingManager.startLoading('op1');
      loadingManager.stopLoading('op1', 'success');
      
      loadingManager.startLoading('op2');
      loadingManager.stopLoading('op2', 'error');
      
      const stats = loadingManager.getLoadingStats();
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.completedOperations).toBe(1);
      expect(stats.failedOperations).toBe(1);
      expect(stats.successRate).toBe('50.0%');
    });

    test('should track active loading operations', () => {
      loadingManager.startLoading('active1', { message: 'Loading 1' });
      loadingManager.startLoading('active2', { message: 'Loading 2' });
      
      const activeLoadings = loadingManager.getActiveLoadings();
      
      expect(activeLoadings).toHaveLength(2);
      expect(activeLoadings[0].id).toBe('active1');
      expect(activeLoadings[0].message).toBe('Loading 1');
      expect(activeLoadings[1].id).toBe('active2');
    });

    test('should stop all active loadings', () => {
      loadingManager.startLoading('bulk1');
      loadingManager.startLoading('bulk2');
      loadingManager.startLoading('bulk3');
      
      expect(loadingManager.getLoadingStats().activeOperations).toBe(3);
      
      const stoppedIds = loadingManager.stopAllLoadings('cancelled');
      
      expect(stoppedIds).toHaveLength(3);
      expect(loadingManager.getLoadingStats().activeOperations).toBe(0);
    });

    test('should clear statistics', () => {
      loadingManager.startLoading('test');
      loadingManager.stopLoading('test', 'success');
      
      expect(loadingManager.getLoadingStats().totalOperations).toBe(1);
      
      loadingManager.clearStats();
      
      expect(loadingManager.getLoadingStats().totalOperations).toBe(0);
    });
  });

  describe('Wait for Loading Completion', () => {
    test('should resolve immediately if not loading', async () => {
      const promise = loadingManager.waitForLoading('not-loading');
      await expect(promise).resolves.toBeUndefined();
    });

    test('should wait for loading to complete', async () => {
      loadingManager.startLoading('wait-test');
      
      const waitPromise = loadingManager.waitForLoading('wait-test');
      
      // Stop loading after delay
      setTimeout(() => {
        loadingManager.stopLoading('wait-test', 'success');
      }, 500);
      
      jest.advanceTimersByTime(500);
      
      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should timeout when waiting too long', async () => {
      loadingManager.startLoading('long-wait');
      
      const waitPromise = loadingManager.waitForLoading('long-wait', 1000);
      
      jest.advanceTimersByTime(1000);
      
      await expect(waitPromise).rejects.toThrow('Timeout waiting for loading');
    });
  });

  describe('Utility Function Exports', () => {
    test('should export utility functions that work correctly', () => {
      startLoading('util-test', { message: 'Utility test' });
      expect(isLoading('util-test')).toBe(true);
      
      stopLoading('util-test', 'success');
      expect(isLoading('util-test')).toBe(false);
    });

    test('should create loading wrapper through utility', async () => {
      const mockFn = jest.fn().mockResolvedValue('wrapped');
      const wrapped = withLoading('wrapper-test', mockFn);
      
      const result = await wrapped('arg');
      
      expect(result).toBe('wrapped');
      expect(mockFn).toHaveBeenCalledWith('arg');
    });
  });
});