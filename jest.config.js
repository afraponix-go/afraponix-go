module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/public/js/modules'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'public/js/modules/**/*.js',
    '!public/js/modules/**/index.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@babel/runtime)/)'
  ],
  verbose: true,
  collectCoverage: false // Enable with --coverage flag
};