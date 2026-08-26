/**
 * ErrorHandler Module Tests
 * Tests for the standardized error handling utility
 */

import { ErrorHandler, handleApiError, handleValidationError, handleGeneralError } from '../../public/js/modules/utils/errorHandler.js';

describe('ErrorHandler', () => {
  let errorHandler;
  
  beforeEach(() => {
    errorHandler = new ErrorHandler();
    // Clear stats before each test
    errorHandler.clearStats();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with default options', () => {
      const handler = new ErrorHandler();
      expect(handler.options.logErrors).toBe(true);
      expect(handler.options.showUserMessages).toBe(true);
      expect(handler.options.enableRetries).toBe(true);
      expect(handler.options.defaultRetryCount).toBe(2);
    });

    test('should accept custom options', () => {
      const handler = new ErrorHandler({
        logErrors: false,
        enableRetries: false,
        defaultRetryCount: 5
      });
      expect(handler.options.logErrors).toBe(false);
      expect(handler.options.enableRetries).toBe(false);
      expect(handler.options.defaultRetryCount).toBe(5);
    });

    test('should initialize error statistics', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.apiErrors).toBe(0);
      expect(stats.validationErrors).toBe(0);
      expect(stats.unknownErrors).toBe(0);
    });
  });

  describe('API Error Handling', () => {
    test('should handle API error with status code', async () => {
      const apiError = new Error('API request failed');
      apiError.status = 404;
      apiError.data = { error: 'Resource not found' };

      const result = await errorHandler.handleApiError(apiError, { endpoint: '/api/test' });

      expect(result.handled).toBe(true);
      expect(result.userMessage).toContain('not found');
      expect(result.shouldRetry).toBe(false);
      expect(errorHandler.getErrorStats().apiErrors).toBe(1);
    });

    test('should handle API error without status code', async () => {
      const apiError = new Error('Network error');
      
      const result = await errorHandler.handleApiError(apiError);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true); // Network errors should retry
      expect(errorHandler.getErrorStats().apiErrors).toBe(1);
    });

    test('should show user notification when enabled', async () => {
      const apiError = new Error('Test error');
      apiError.status = 500;

      await errorHandler.handleApiError(apiError);

      expect(window.app.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Server error'),
        'error',
        6000
      );
    });

    test('should not show notification when disabled', async () => {
      const handler = new ErrorHandler({ showUserMessages: false });
      const apiError = new Error('Test error');
      
      await handler.handleApiError(apiError);

      expect(window.app.showNotification).not.toHaveBeenCalled();
    });
  });

  describe('Validation Error Handling', () => {
    test('should handle single validation error', () => {
      const error = 'Email is required';
      
      const result = errorHandler.handleValidationError(error, { form: 'login' });

      expect(result.handled).toBe(true);
      expect(result.errors).toEqual([error]);
      expect(result.context).toBe('login');
      expect(errorHandler.getErrorStats().validationErrors).toBe(1);
    });

    test('should handle multiple validation errors', () => {
      const errors = ['Email is required', 'Password too short', 'Name cannot be empty'];
      
      const result = errorHandler.handleValidationError(errors);

      expect(result.handled).toBe(true);
      expect(result.errors).toEqual(errors);
      // For 3 errors, it joins them with semicolons (not "Multiple validation errors" prefix)
      expect(window.app.showNotification).toHaveBeenCalledWith(
        'Email is required; Password too short; Name cannot be empty',
        'warning',
        5000
      );
    });

    test('should format validation message correctly for few errors', () => {
      const errors = ['Email invalid', 'Password required'];
      
      errorHandler.handleValidationError(errors);

      expect(window.app.showNotification).toHaveBeenCalledWith(
        'Email invalid; Password required',
        'warning',
        5000
      );
    });
  });

  describe('General Error Handling', () => {
    test('should handle general JavaScript error', () => {
      const error = new Error('Unexpected error');
      
      const result = errorHandler.handleGeneralError(error, { operation: 'dataProcessing' });

      expect(result.handled).toBe(true);
      expect(result.errorInfo.type).toBe('general');
      expect(result.errorInfo.context).toBe('dataProcessing');
      expect(errorHandler.getErrorStats().unknownErrors).toBe(1);
    });

    test('should use custom user message when provided', () => {
      const error = new Error('System failure');
      
      const result = errorHandler.handleGeneralError(error, { 
        userMessage: 'Custom error message'
      });

      expect(result.userMessage).toBe('Custom error message');
      expect(window.app.showNotification).toHaveBeenCalledWith(
        'Custom error message',
        'error',
        4000
      );
    });
  });

  describe('Async Wrapper Functions', () => {
    test('should wrap async function and handle success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = errorHandler.wrapAsync(successFn, { operation: 'test' });
      
      const result = await expect(wrappedFn('arg1', 'arg2')).resolves.toBe('success');
      
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should wrap async function and handle API error', async () => {
      const apiError = new Error('API failed');
      apiError.status = 500;
      const failureFn = jest.fn().mockRejectedValue(apiError);
      const wrappedFn = errorHandler.wrapAsync(failureFn, { operation: 'apiCall' });
      
      await expect(wrappedFn()).rejects.toThrow('API failed');
      
      expect(errorHandler.getErrorStats().apiErrors).toBe(1);
    });

    test('should execute operation safely and return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('operation result');
      
      const result = await errorHandler.executeSafely(operation, { operation: 'test' });
      
      expect(result).toBe('operation result');
    });

    test('should execute operation safely and handle error', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const result = await errorHandler.executeSafely(operation);
      
      expect(result.handled).toBe(true);
      expect(result.errorInfo.type).toBe('general');
    });
  });

  describe('Fetch Response Handling', () => {
    test('should handle successful response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      
      const result = await errorHandler.handleFetchResponse(mockResponse);
      
      expect(result).toBe(mockResponse);
    });

    test('should handle failed response with JSON error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('{"error": "Bad request"}')
      };
      
      await expect(errorHandler.handleFetchResponse(mockResponse))
        .rejects.toThrow('Bad request');
    });

    test('should handle failed response with plain text error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error')
      };
      
      try {
        await errorHandler.handleFetchResponse(mockResponse);
      } catch (error) {
        expect(error.message).toBe('Internal Server Error');
        expect(error.status).toBe(500);
      }
    });
  });

  describe('Error Classification', () => {
    test('should identify API errors correctly', () => {
      const apiError1 = new Error('API call failed');
      apiError1.status = 404;
      
      const apiError2 = new Error('fetch failed');
      
      const generalError = new Error('Regular error');
      
      expect(errorHandler.isApiError(apiError1)).toBe(true);
      expect(errorHandler.isApiError(apiError2)).toBe(true);
      expect(errorHandler.isApiError(generalError)).toBe(false);
    });

    test('should determine retry logic correctly', () => {
      const clientError = new Error('Bad request');
      clientError.status = 400;
      
      const serverError = new Error('Internal error');
      serverError.status = 500;
      
      const networkError = new Error('fetch failed');
      
      expect(errorHandler.shouldRetryApiError(clientError)).toBe(false);
      expect(errorHandler.shouldRetryApiError(serverError)).toBe(true);
      expect(errorHandler.shouldRetryApiError(networkError)).toBe(true);
    });
  });

  describe('Error Message Generation', () => {
    test('should generate appropriate messages for different status codes', () => {
      expect(errorHandler.getApiErrorMessage({ status: 401 }))
        .toContain('Authentication required');
      
      expect(errorHandler.getApiErrorMessage({ status: 403 }))
        .toContain('Access denied');
      
      expect(errorHandler.getApiErrorMessage({ status: 404 }))
        .toContain('not found');
      
      expect(errorHandler.getApiErrorMessage({ status: 500 }))
        .toContain('Server error');
    });

    test('should handle network errors', () => {
      const networkError = { message: 'fetch failed' };
      
      expect(errorHandler.getApiErrorMessage(networkError))
        .toContain('Network connection failed');
    });
  });

  describe('Error Statistics', () => {
    test('should track error statistics correctly', async () => {
      // Generate different types of errors
      await errorHandler.handleApiError(new Error('API error'));
      errorHandler.handleValidationError('Validation error');
      errorHandler.handleGeneralError(new Error('General error'));
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.apiErrors).toBe(1);
      expect(stats.validationErrors).toBe(1);
      expect(stats.unknownErrors).toBe(1);
      expect(stats.errorRate).toBeDefined();
    });

    test('should clear statistics', () => {
      errorHandler.handleGeneralError(new Error('Test'));
      expect(errorHandler.getErrorStats().totalErrors).toBe(1);
      
      errorHandler.clearStats();
      expect(errorHandler.getErrorStats().totalErrors).toBe(0);
    });
  });

  describe('Utility Function Exports', () => {
    test('should export utility functions that work correctly', async () => {
      const apiError = new Error('API test');
      apiError.status = 500;
      
      const result = await handleApiError(apiError, { endpoint: '/test' });
      expect(result.handled).toBe(true);
      
      const valResult = handleValidationError('Required field');
      expect(valResult.handled).toBe(true);
      
      const genResult = handleGeneralError(new Error('General test'));
      expect(genResult.handled).toBe(true);
    });
  });
});