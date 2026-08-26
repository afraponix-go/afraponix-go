/**
 * Authentication Integration Tests
 * Tests to ensure all API endpoints include proper authentication headers
 */

import * as fishAPI from '../../public/js/modules/api/fishAPI.js';
import * as plantsAPI from '../../public/js/modules/api/plantsAPI.js';
import * as systemsAPI from '../../public/js/modules/api/systemsAPI.js';
import * as waterQualityAPI from '../../public/js/modules/api/waterQualityAPI.js';
import * as nutrientsAPI from '../../public/js/modules/api/nutrientsAPI.js';
import * as growBedsAPI from '../../public/js/modules/api/growBedsAPI.js';
import * as sensorsAPI from '../../public/js/modules/api/sensorsAPI.js';
import * as operationsAPI from '../../public/js/modules/api/operationsAPI.js';
import * as configAPI from '../../public/js/modules/api/configAPI.js';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('API Authentication Tests', () => {
    const mockToken = 'test-auth-token-123';
    const testSystemId = 'test-system-123';
    
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(mockToken);
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: [] })
        });
    });

    describe('Fish API Authentication', () => {
        test('fetchFishInventory should include auth header', async () => {
            await fishAPI.fetchFishInventory(testSystemId);
            
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/fish-inventory/'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockToken}`
                    })
                })
            );
        });

        test('fetchFishHealthData should include auth header', async () => {
            await fishAPI.fetchFishHealthData(testSystemId);
            
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/data/fish-health/'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockToken}`
                    })
                })
            );
        });

        test('fetchFishTanks should include auth header', async () => {
            await fishAPI.fetchFishTanks(testSystemId);
            
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/fish-tanks/'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockToken}`
                    })
                })
            );
        });
    });

    describe('Water Quality API Authentication', () => {
        test('fetchWaterQualityData should include auth header', async () => {
            await waterQualityAPI.fetchWaterQualityData(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('/api/data/water-quality/');
            
            // If headers are included, they should have auth
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                // Fail if no headers at all
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });

        test('addWaterQualityEntry should include auth header', async () => {
            const testData = { ph: 7.0, temperature: 25 };
            await waterQualityAPI.addWaterQualityEntry(testSystemId, testData);
            
            const fetchCall = fetch.mock.calls[0];
            expect(fetchCall[1].method).toBe('POST');
            
            // Should have auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });
    });

    describe('Nutrients API Authentication', () => {
        test('fetchNutrientsData should include auth header', async () => {
            await nutrientsAPI.fetchNutrientsData(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('/api/data/nutrients/');
            
            // Check for auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });
    });

    describe('Grow Beds API Authentication', () => {
        test('fetchGrowBeds should include auth header', async () => {
            await growBedsAPI.fetchGrowBeds(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('/api/grow-beds/');
            
            // Check for auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });

        test('updateGrowBeds should include auth header', async () => {
            const bedData = { name: 'Test Bed', type: 'DWC' };
            await growBedsAPI.updateGrowBeds(testSystemId, bedData);
            
            const fetchCall = fetch.mock.calls[0];
            expect(fetchCall[1].method).toBe('PUT');
            
            // Should have auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });
    });

    describe('Sensors API Authentication', () => {
        test('fetchSensorData should include auth header', async () => {
            await sensorsAPI.fetchSensorData(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            
            // Check for auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });
    });

    describe('Operations API Authentication', () => {
        test('fetchOperationsData should include auth header', async () => {
            await operationsAPI.fetchOperationsData(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            
            // Check for auth headers
            if (fetchCall[1] && fetchCall[1].headers) {
                expect(fetchCall[1].headers).toHaveProperty('Authorization');
            } else {
                expect(fetchCall[1]).toBeDefined();
                expect(fetchCall[1].headers).toBeDefined();
            }
        });
    });

    describe('Authentication Failure Handling', () => {
        test('should handle 401 responses appropriately', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });

            await expect(fishAPI.fetchFishInventory(testSystemId))
                .rejects.toThrow('Failed to fetch fish inventory');
        });

        test('should handle missing token gracefully', async () => {
            localStorageMock.getItem.mockReturnValue(null);
            
            // API call should still be made, but without auth header
            await fishAPI.fetchFishInventory(testSystemId);
            
            const fetchCall = fetch.mock.calls[0];
            if (fetchCall[1] && fetchCall[1].headers && fetchCall[1].headers.Authorization) {
                // If Authorization header exists, it should not have "Bearer null"
                expect(fetchCall[1].headers.Authorization).not.toBe('Bearer null');
            }
        });
    });

    describe('Critical Endpoints Must Have Auth', () => {
        const criticalEndpoints = [
            { name: 'Fish Health Export', fn: () => fishAPI.fetchFishHealthData(testSystemId) },
            { name: 'Fish Inventory', fn: () => fishAPI.fetchFishInventory(testSystemId) },
            { name: 'System Data', fn: () => systemsAPI.fetchLatestSystemData(testSystemId) },
            { name: 'Water Quality', fn: () => waterQualityAPI.fetchWaterQualityData(testSystemId) },
            { name: 'Nutrient Data', fn: () => nutrientsAPI.fetchNutrientsData(testSystemId) }
        ];

        test.each(criticalEndpoints)('$name endpoint must include authentication', async ({ fn }) => {
            await fn();
            
            const fetchCall = fetch.mock.calls[0];
            
            // These critical endpoints MUST have headers
            expect(fetchCall[1]).toBeDefined();
            expect(fetchCall[1].headers).toBeDefined();
            
            // And if token exists, they MUST include it
            if (mockToken) {
                expect(fetchCall[1].headers.Authorization).toBe(`Bearer ${mockToken}`);
            }
        });
    });
});

describe('Authentication Helper Functions', () => {
    test('should have consistent auth header generation', () => {
        // Test that all API modules use the same auth header pattern
        const modules = [
            plantsAPI,
            systemsAPI,
            // Add other modules as they implement getAuthHeaders
        ];

        modules.forEach(module => {
            if (typeof module.getAuthHeaders === 'function') {
                localStorageMock.getItem.mockReturnValue('test-token');
                const headers = module.getAuthHeaders();
                expect(headers.Authorization).toBe('Bearer test-token');
            }
        });
    });
});