/**
 * Jest Test Setup
 * Global setup for all tests
 */

// Mock global window object for DOM tests
global.window = window;
global.document = document;

// Mock console methods to reduce test noise
global.console = {
  ...console,
  // Keep error and warn for debugging, but suppress log/info
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for important messages
  error: console.error,
  warn: console.warn
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch API
global.fetch = jest.fn();

// Mock window.app for notification system
global.window.app = {
  showNotification: jest.fn(),
  activeSystemId: 'test-system-1',
  errorHandler: null
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});