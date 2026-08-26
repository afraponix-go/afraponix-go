/**
 * ChartModalComponent Tests
 * Comprehensive test coverage for chart modal functionality
 */

import { ChartModalComponent } from '../../public/js/modules/components/chartModal.js';

// Mock Chart.js (loaded via CDN)
global.Chart = jest.fn(() => ({
  destroy: jest.fn(),
  update: jest.fn(),
  data: { datasets: [], labels: [] },
  options: {},
  getElementsAtEventForMode: jest.fn(() => []),
  canvas: { getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 }))
  })) }
}));

describe('ChartModalComponent', () => {
  let component;
  let mockApp;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create modal element that the component expects
    const modal = document.createElement('div');
    modal.id = 'nutrient-detail-modal';
    modal.style.display = 'none';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'nutrient-detail-chart';
    modal.appendChild(canvas);
    
    const table = document.createElement('table');
    table.id = 'nutrient-history-table';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    modal.appendChild(table);
    
    // Add elements for updateModalElements
    const currentElement = document.createElement('span');
    currentElement.id = 'nutrient-current-value';
    modal.appendChild(currentElement);
    
    const trendElement = document.createElement('span');
    trendElement.id = 'nutrient-trend';
    modal.appendChild(trendElement);
    
    const optimalElement = document.createElement('span');
    optimalElement.id = 'nutrient-optimal-range';
    modal.appendChild(optimalElement);
    
    const statusElement = document.createElement('span');
    statusElement.id = 'nutrient-status';
    modal.appendChild(statusElement);
    
    document.body.appendChild(modal);
    
    // Create mock app instance
    mockApp = {
      showNotification: jest.fn(),
      activeSystemId: 'test-system-1',
      makeApiCall: jest.fn(),
      dataRecords: {
        waterQuality: [
          { ph: 7.2, temperature: 22.5, dissolved_oxygen: 6.8, date: '2025-01-20' },
          { ph: 7.1, temperature: 22.3, dissolved_oxygen: 6.9, date: '2025-01-21' },
          { ph: 7.3, temperature: 22.7, dissolved_oxygen: 6.7, date: '2025-01-22' }
        ],
        nutrients: [
          { nitrate: 15.0, date: '2025-01-20' },
          { nitrate: 14.5, date: '2025-01-21' },
          { nitrate: 15.5, date: '2025-01-22' }
        ]
      },
      formatValue: jest.fn((value) => value?.toString() || 'N/A')
    };

    // Initialize component
    component = new ChartModalComponent(mockApp);
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
    // Clean up any modals
    document.querySelectorAll('.chart-modal-overlay').forEach(el => el.remove());
  });

  describe('Initialization', () => {
    test('should initialize with correct app reference', () => {
      expect(component.app).toBe(mockApp);
    });

    test('should initialize with null modal chart', () => {
      expect(component.modalChart).toBe(null);
    });

    test('should log initialization message', () => {
      expect(console.log).toHaveBeenCalledWith('📊 Chart Modal Component initialized');
    });
  });

  describe('openDetailModal', () => {
    beforeEach(() => {
      // Mock successful API response
      mockApp.makeApiCall.mockResolvedValue({
        success: true,
        data: [
          { date: '2025-01-20', value: 7.2, source: 'sensor' },
          { date: '2025-01-21', value: 7.1, source: 'manual' },
          { date: '2025-01-22', value: 7.3, source: 'sensor' }
        ]
      });
    });

    test('should create modal overlay and content', async () => {
      await component.openDetailModal('ph-chart', 'pH Level', 
        ['2025-01-20', '2025-01-21', '2025-01-22'], 
        [7.2, 7.1, 7.3], 
        '#0051b1'
      );

      const overlay = document.querySelector('.chart-modal-overlay');
      expect(overlay).toBeTruthy();
      
      const modal = overlay.querySelector('.chart-modal');
      expect(modal).toBeTruthy();
    });

    test('should set correct modal title', async () => {
      await component.openDetailModal('temperature-chart', 'Water Temperature', 
        ['2025-01-20'], [22.5], '#7baaee'
      );

      const title = document.querySelector('.chart-modal h2');
      expect(title.textContent).toContain('Water Temperature History');
    });

    test('should create chart canvas', async () => {
      await component.openDetailModal('ph-chart', 'pH Level', 
        ['2025-01-20'], [7.2], '#0051b1'
      );

      const canvas = document.querySelector('#chart-modal-detailed-chart');
      expect(canvas).toBeTruthy();
      expect(canvas.tagName).toBe('CANVAS');
    });

    test('should handle API call failure gracefully', async () => {
      mockApp.makeApiCall.mockRejectedValue(new Error('API Error'));
      
      await component.openDetailModal('ph-chart', 'pH Level', 
        ['2025-01-20'], [7.2], '#0051b1'
      );

      expect(mockApp.showNotification).toHaveBeenCalledWith(
        'Failed to load detailed chart data', 'error'
      );
    });

    test('should close modal on overlay click', async () => {
      await component.openDetailModal('ph-chart', 'pH Level', 
        ['2025-01-20'], [7.2], '#0051b1'
      );

      const overlay = document.querySelector('.chart-modal-overlay');
      overlay.click();

      // Modal should be removed after animation
      setTimeout(() => {
        expect(document.querySelector('.chart-modal-overlay')).toBeFalsy();
      }, 500);
    });

    test('should close modal on escape key', async () => {
      await component.openDetailModal('ph-chart', 'pH Level', 
        ['2025-01-20'], [7.2], '#0051b1'
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      setTimeout(() => {
        expect(document.querySelector('.chart-modal-overlay')).toBeFalsy();
      }, 500);
    });
  });

  describe('createDetailedChart', () => {
    test('should create chart with correct data', () => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);

      const chart = component.createDetailedChart(
        ['Day 1', 'Day 2', 'Day 3'],
        [7.2, 7.1, 7.3],
        '#0051b1',
        'pH Levels'
      );

      expect(chart).toBeTruthy();
      expect(chart.data.labels).toEqual(['Day 1', 'Day 2', 'Day 3']);
      expect(chart.data.datasets[0].data).toEqual([7.2, 7.1, 7.3]);
    });

    test('should apply correct color scheme', () => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);

      const chart = component.createDetailedChart(
        ['Day 1'],
        [22.5],
        '#7baaee',
        'Temperature'
      );

      expect(chart.data.datasets[0].borderColor).toBe('#7baaee');
      expect(chart.data.datasets[0].backgroundColor).toBe('#7baaee20');
    });

    test('should handle empty data', () => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);

      const chart = component.createDetailedChart([], [], '#0051b1', 'Empty Chart');
      
      expect(chart.data.labels).toEqual([]);
      expect(chart.data.datasets[0].data).toEqual([]);
    });
  });

  describe('updateNutrientHistoryTable', () => {
    test('should populate table with history data', () => {
      const labels = ['2025-01-20', '2025-01-21', '2025-01-22'];
      const data = [7.2, 7.1, 7.3];
      const sourceData = [
        { date: '2025-01-20', source: 'sensor' },
        { date: '2025-01-21', source: 'manual' },
        { date: '2025-01-22', source: 'sensor' }
      ];

      component.updateNutrientHistoryTable(labels, data, sourceData);

      const tbody = document.querySelector('#nutrient-history-table tbody');
      const rows = tbody.querySelectorAll('tr');
      
      expect(rows.length).toBe(3);
      expect(rows[0].textContent).toContain('2025-01-22');
      expect(rows[0].textContent).toContain('7.3');
    });

    test('should handle missing source data', () => {
      const labels = ['2025-01-20'];
      const data = [7.2];

      component.updateNutrientHistoryTable(labels, data, null);

      const tbody = document.querySelector('#nutrient-history-table tbody');
      const rows = tbody.querySelectorAll('tr');
      
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Manual Entry');
    });

    test('should limit to maximum 50 entries', () => {
      const labels = Array.from({length: 100}, (_, i) => `Day ${i + 1}`);
      const data = Array.from({length: 100}, (_, i) => i + 1);

      component.updateNutrientHistoryTable(labels, data, null);

      const tbody = document.querySelector('#nutrient-history-table tbody');
      const rows = tbody.querySelectorAll('tr');
      
      expect(rows.length).toBe(50);
    });
  });

  describe('getNutrientOptimalRange', () => {
    test('should return correct pH range', () => {
      const range = component.getNutrientOptimalRange('ph');
      expect(range).toEqual({ min: 6.0, max: 7.5 });
    });

    test('should return correct temperature range', () => {
      const range = component.getNutrientOptimalRange('temperature');
      expect(range).toEqual({ min: 18, max: 26 });
    });

    test('should return correct dissolved oxygen range', () => {
      const range = component.getNutrientOptimalRange('dissolved_oxygen');
      expect(range).toEqual({ min: 5.0, max: 8.0 });
    });

    test('should return default range for unknown nutrient', () => {
      const range = component.getNutrientOptimalRange('unknown_nutrient');
      expect(range).toEqual({ min: null, max: null });
    });
  });

  describe('getNutrientStatus', () => {
    test('should return optimal status for values in range', () => {
      const status = component.getNutrientStatus(7.0, { min: 6.0, max: 7.5 });
      expect(status).toBe('optimal');
    });

    test('should return low status for values below range', () => {
      const status = component.getNutrientStatus(5.5, { min: 6.0, max: 7.5 });
      expect(status).toBe('low');
    });

    test('should return high status for values above range', () => {
      const status = component.getNutrientStatus(8.0, { min: 6.0, max: 7.5 });
      expect(status).toBe('high');
    });

    test('should return unknown status for null ranges', () => {
      const status = component.getNutrientStatus(7.0, { min: null, max: null });
      expect(status).toBe('unknown');
    });

    test('should handle edge values correctly', () => {
      const range = { min: 6.0, max: 7.5 };
      expect(component.getNutrientStatus(6.0, range)).toBe('optimal');
      expect(component.getNutrientStatus(7.5, range)).toBe('optimal');
    });
  });

  describe('mapChartIdToDataField', () => {
    test('should map pH chart correctly', () => {
      expect(component.mapChartIdToDataField('ph-chart')).toBe('ph');
    });

    test('should map temperature chart correctly', () => {
      expect(component.mapChartIdToDataField('temperature-chart')).toBe('temperature');
    });

    test('should map conductivity chart correctly', () => {
      expect(component.mapChartIdToDataField('conductivity-chart')).toBe('ec');
    });

    test('should handle unknown chart IDs', () => {
      expect(component.mapChartIdToDataField('unknown-chart')).toBe('unknown-chart');
    });
  });

  describe('calculateTrend', () => {
    test('should identify upward trend', () => {
      const trend = component.calculateTrend([1, 2, 3, 4, 5]);
      expect(trend.direction).toBe('up');
      expect(trend.strength).toBeGreaterThan(0);
    });

    test('should identify downward trend', () => {
      const trend = component.calculateTrend([5, 4, 3, 2, 1]);
      expect(trend.direction).toBe('down');
      expect(trend.strength).toBeGreaterThan(0);
    });

    test('should identify stable trend', () => {
      const trend = component.calculateTrend([5, 5, 5, 5, 5]);
      expect(trend.direction).toBe('stable');
      expect(trend.strength).toBe(0);
    });

    test('should handle insufficient data', () => {
      const trend = component.calculateTrend([5]);
      expect(trend.direction).toBe('stable');
      expect(trend.strength).toBe(0);
    });

    test('should handle empty array', () => {
      const trend = component.calculateTrend([]);
      expect(trend.direction).toBe('stable');
      expect(trend.strength).toBe(0);
    });
  });

  describe('calculateStatistics', () => {
    test('should calculate correct statistics', () => {
      const stats = component.calculateStatistics([1, 2, 3, 4, 5]);
      
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.mean).toBe(3);
      expect(stats.median).toBe(3);
    });

    test('should handle even number of values for median', () => {
      const stats = component.calculateStatistics([1, 2, 3, 4]);
      expect(stats.median).toBe(2.5);
    });

    test('should handle single value', () => {
      const stats = component.calculateStatistics([7.5]);
      
      expect(stats.min).toBe(7.5);
      expect(stats.max).toBe(7.5);
      expect(stats.mean).toBe(7.5);
      expect(stats.median).toBe(7.5);
    });

    test('should handle empty array', () => {
      const stats = component.calculateStatistics([]);
      
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
    });
  });

  describe('Component Lifecycle', () => {
    test('should get component statistics', () => {
      const stats = component.getStats();
      
      expect(stats).toEqual({
        hasModalChart: false,
        componentLoaded: true
      });
    });

    test('should destroy component properly', () => {
      // Create a modal chart
      component.modalChart = { destroy: jest.fn() };

      component.destroy();

      expect(component.modalChart.destroy).toHaveBeenCalled();
      expect(component.modalChart).toBe(null);
    });

    test('should close modal on destroy', () => {
      const closeSpy = jest.spyOn(component, 'closeModal');
      
      component.destroy();
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle chart creation errors', () => {
      // Mock Chart constructor to throw error
      global.Chart = jest.fn(() => {
        throw new Error('Chart creation failed');
      });

      const canvas = document.createElement('canvas');
      canvas.id = 'chart-modal-detailed-chart';
      document.body.appendChild(canvas);

      expect(() => {
        component.createDetailedChart(['Day 1'], [1], '#0051b1', 'Test');
      }).not.toThrow();
    });

    test('should handle missing DOM elements gracefully', () => {
      // Try to update table that doesn't exist
      expect(() => {
        component.updateNutrientHistoryTable(['Day 1'], [1], null);
      }).not.toThrow();
    });
  });

  describe('Data Source Icons', () => {
    test('should return correct sensor icon', () => {
      const icon = component.getDataSourceIcon('sensor');
      expect(icon).toContain('sensor data.svg');
    });

    test('should return correct manual icon', () => {
      const icon = component.getDataSourceIcon('manual');
      expect(icon).toContain('Data entry.svg');
    });

    test('should return correct lab icon', () => {
      const icon = component.getDataSourceIcon('lab');
      expect(icon).toContain('chemistry.svg');
    });

    test('should handle unknown source', () => {
      const icon = component.getDataSourceIcon('unknown');
      expect(icon).toContain('Data entry.svg'); // Default fallback
    });
  });
});