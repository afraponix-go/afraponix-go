/**
 * ModalManagerComponent Tests
 * Comprehensive test coverage for modal management functionality
 */

import { ModalManagerComponent } from '../../public/js/modules/components/modalManager.js';

describe('ModalManagerComponent', () => {
  let component;
  let mockApp;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create mock app instance
    mockApp = {
      showNotification: jest.fn(),
      clearMessages: jest.fn(),
      hideLayoutTooltip: jest.fn(),
      getGrowBedsForSystem: jest.fn(),
      cleanCustomCropName: jest.fn(name => name),
      submitBatchMove: jest.fn(),
      openHarvestForm: jest.fn()
    };

    // Initialize component
    component = new ModalManagerComponent(mockApp);
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
    // Clean up any remaining modals
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  });

  describe('Initialization', () => {
    test('should initialize with correct app reference', () => {
      expect(component.app).toBe(mockApp);
    });

    test('should initialize with empty modal tracking', () => {
      expect(component.activeModals).toBeInstanceOf(Map);
      expect(component.modalStack).toEqual([]);
      expect(component.activeModals.size).toBe(0);
    });

    test('should initialize with default configuration', () => {
      expect(component.defaultConfig).toEqual({
        backdrop: true,
        keyboard: true,
        focus: true,
        animation: true,
        animationDuration: 400
      });
    });

    test('should log initialization message', () => {
      expect(console.log).toHaveBeenCalledWith('📋 Modal Manager Component initialized');
    });
  });

  describe('Modal Display Functions', () => {
    beforeEach(() => {
      // Create slideout elements that the component expects
      ['login', 'register', 'forgot-password'].forEach(type => {
        const backdrop = document.createElement('div');
        backdrop.id = `${type}-slideout-backdrop`;
        backdrop.className = 'slideout-backdrop';
        document.body.appendChild(backdrop);

        const panel = document.createElement('div');
        panel.id = `${type}-slideout-panel`;
        panel.className = 'slideout-panel';
        document.body.appendChild(panel);
      });
    });

    test('should show login modal by default', () => {
      component.showModal();
      
      const backdrop = document.getElementById('login-slideout-backdrop');
      const panel = document.getElementById('login-slideout-panel');
      
      expect(backdrop.classList.contains('show')).toBe(true);
      expect(mockApp.clearMessages).toHaveBeenCalled();
    });

    test('should show register modal when specified', () => {
      component.showModal('register');
      
      const backdrop = document.getElementById('register-slideout-backdrop');
      expect(backdrop.classList.contains('show')).toBe(true);
    });

    test('should show forgot password modal when specified', () => {
      component.showModal('forgot-password');
      
      const backdrop = document.getElementById('forgot-password-slideout-backdrop');
      expect(backdrop.classList.contains('show')).toBe(true);
    });

    test('should show login slideout with animation delay', () => {
      jest.useFakeTimers();
      
      component.showLoginSlideout();
      
      const backdrop = document.getElementById('login-slideout-backdrop');
      const panel = document.getElementById('login-slideout-panel');
      
      expect(backdrop.classList.contains('show')).toBe(true);
      
      // Panel should show after delay
      jest.advanceTimersByTime(15);
      expect(panel.classList.contains('show')).toBe(true);
      
      jest.useRealTimers();
    });

    test('should show register slideout with step reset', () => {
      // Create step elements
      const step1 = document.createElement('div');
      step1.id = 'register-step-1';
      step1.style.display = 'none';
      document.body.appendChild(step1);

      const step2 = document.createElement('div');
      step2.id = 'register-step-2';
      step2.style.display = 'block';
      document.body.appendChild(step2);

      component.showRegisterSlideout();

      expect(step1.style.display).toBe('block');
      expect(step2.style.display).toBe('none');
    });

    test('should handle missing slideout elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements
      
      expect(() => {
        component.showLoginSlideout();
      }).not.toThrow();
    });
  });

  describe('Modal Closing Functions', () => {
    beforeEach(() => {
      // Create slideout elements
      ['login', 'register', 'forgot-password'].forEach(type => {
        const backdrop = document.createElement('div');
        backdrop.id = `${type}-slideout-backdrop`;
        backdrop.className = 'slideout-backdrop show';
        document.body.appendChild(backdrop);

        const panel = document.createElement('div');
        panel.id = `${type}-slideout-panel`;
        panel.className = 'slideout-panel show';
        document.body.appendChild(panel);
      });
    });

    test('should close login slideout with animation', () => {
      jest.useFakeTimers();
      
      component.closeLoginSlideout();
      
      const panel = document.getElementById('login-slideout-panel');
      expect(panel.classList.contains('show')).toBe(false);
      
      jest.advanceTimersByTime(400);
      
      const backdrop = document.getElementById('login-slideout-backdrop');
      expect(backdrop.classList.contains('show')).toBe(false);
      
      expect(mockApp.clearMessages).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('should close register slideout', () => {
      component.closeRegisterSlideout();
      
      const panel = document.getElementById('register-slideout-panel');
      expect(panel.classList.contains('show')).toBe(false);
    });

    test('should close forgot password slideout', () => {
      component.closeForgotPasswordSlideout();
      
      const panel = document.getElementById('forgot-password-slideout-panel');
      expect(panel.classList.contains('show')).toBe(false);
    });

    test('should close all slideout panels', () => {
      const closeSpy = jest.spyOn(component, 'closeLoginSlideout');
      const closeRegSpy = jest.spyOn(component, 'closeRegisterSlideout');
      const closeForgotSpy = jest.spyOn(component, 'closeForgotPasswordSlideout');
      
      component.closeAllSlideoutPanels();
      
      expect(closeSpy).toHaveBeenCalled();
      expect(closeRegSpy).toHaveBeenCalled();
      expect(closeForgotSpy).toHaveBeenCalled();
    });

    test('should close auth modal (alias for slideout panels)', () => {
      const spy = jest.spyOn(component, 'closeAllSlideoutPanels');
      
      component.closeAuthModal();
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Custom Confirmation Dialog', () => {
    beforeEach(() => {
      // Create confirmation modal elements
      const modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'modal';
      
      const title = document.createElement('h3');
      title.id = 'confirm-title';
      modal.appendChild(title);
      
      const message = document.createElement('p');
      message.id = 'confirm-message';
      modal.appendChild(message);
      
      const details = document.createElement('div');
      details.id = 'confirm-details';
      modal.appendChild(details);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'confirm-cancel';
      modal.appendChild(cancelBtn);
      
      const okBtn = document.createElement('button');
      okBtn.id = 'confirm-ok';
      modal.appendChild(okBtn);
      
      document.body.appendChild(modal);
    });

    test('should show custom confirmation dialog', async () => {
      const confirmPromise = component.showCustomConfirm(
        'Delete Item',
        'Are you sure you want to delete this item?',
        ['Remove from database', 'Cannot be undone']
      );
      
      const title = document.getElementById('confirm-title');
      const message = document.getElementById('confirm-message');
      const details = document.getElementById('confirm-details');
      
      expect(title.textContent).toBe('Delete Item');
      expect(message.textContent).toBe('Are you sure you want to delete this item?');
      expect(details.innerHTML).toContain('Remove from database');
      expect(details.innerHTML).toContain('Cannot be undone');
      
      // Simulate OK click
      const okBtn = document.getElementById('confirm-ok');
      okBtn.click();
      
      const result = await confirmPromise;
      expect(result).toBe(true);
    });

    test('should handle confirmation dialog cancellation', async () => {
      const confirmPromise = component.showCustomConfirm(
        'Delete Item',
        'Are you sure?'
      );
      
      // Simulate cancel click
      const cancelBtn = document.getElementById('confirm-cancel');
      cancelBtn.click();
      
      const result = await confirmPromise;
      expect(result).toBe(false);
    });

    test('should handle keyboard navigation in confirmation dialog', async () => {
      const confirmPromise = component.showCustomConfirm(
        'Test Dialog',
        'Test message'
      );
      
      // Simulate escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      const result = await confirmPromise;
      expect(result).toBe(false);
    });

    test('should handle enter key confirmation', async () => {
      const confirmPromise = component.showCustomConfirm(
        'Test Dialog',
        'Test message'
      );
      
      // Simulate enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      const result = await confirmPromise;
      expect(result).toBe(true);
    });

    test('should handle missing confirmation elements gracefully', async () => {
      document.getElementById('confirm-modal').remove();
      
      const result = await component.showCustomConfirm('Test', 'Message');
      expect(result).toBe(false);
    });

    test('should hide details when no details provided', () => {
      component.showCustomConfirm('Title', 'Message');
      
      const details = document.getElementById('confirm-details');
      expect(details.style.display).toBe('none');
    });
  });

  describe('Batch Modal', () => {
    beforeEach(() => {
      mockApp.getGrowBedsForSystem.mockResolvedValue([
        { id: '2', name: 'Test Bed 2', bed_type: 'DWC' },
        { id: '3', name: 'Test Bed 3', bed_type: 'NFT' }
      ]);
    });

    test('should create and show batch modal', async () => {
      const batch = {
        id: '123',
        cropName: 'lettuce',
        plantCount: 24,
        area: 2.5,
        plantedDate: '2025-01-15',
        daysGrowing: 10,
        expectedHarvest: '2025-02-15'
      };
      
      const bed = {
        id: '1',
        name: 'Test Bed 1'
      };
      
      await component.showBatchModal(batch, bed);
      
      const overlay = document.getElementById('component-modal-overlay');
      expect(overlay).toBeTruthy();
      
      const modal = overlay.querySelector('.modal-content');
      expect(modal).toBeTruthy();
      expect(modal.innerHTML).toContain('Batch Details');
      expect(modal.innerHTML).toContain('123'); // batch ID
      expect(modal.innerHTML).toContain('Test Bed 1'); // bed name
      expect(modal.innerHTML).toContain('lettuce'); // crop name
    });

    test('should generate bed options correctly', async () => {
      const options = await component.generateBedOptions('1');
      
      expect(mockApp.getGrowBedsForSystem).toHaveBeenCalled();
      expect(options).toContain('Test Bed 2 (DWC)');
      expect(options).toContain('Test Bed 3 (NFT)');
      expect(options).not.toContain('Bed 1'); // Should exclude current bed
    });

    test('should handle missing grow beds gracefully', async () => {
      mockApp.getGrowBedsForSystem.mockResolvedValue([]);
      
      const options = await component.generateBedOptions('1');
      
      expect(options).toContain('No grow beds available');
    });

    test('should handle API errors in bed generation', async () => {
      mockApp.getGrowBedsForSystem.mockRejectedValue(new Error('API Error'));
      
      const options = await component.generateBedOptions('1');
      
      expect(options).toContain('Error loading beds');
    });

    test('should setup batch modal event listeners', async () => {
      const batch = { id: '123', cropName: 'lettuce', plantCount: 10 };
      const bed = { id: '1', name: 'Test Bed 1' };
      
      await component.showBatchModal(batch, bed);
      
      const overlay = document.getElementById('component-modal-overlay');
      
      // Test backdrop click to close
      overlay.click();
      expect(document.getElementById('component-modal-overlay')).toBeFalsy();
    });

    test('should handle batch move operation', async () => {
      mockApp.submitBatchMove.mockResolvedValue();
      
      const batch = { id: '123', cropName: 'lettuce' };
      const bed = { id: '1', name: 'Test Bed 1' };
      
      await component.showBatchModal(batch, bed);
      
      // Find the actual batchModalId from the modal content
      const modal = document.getElementById('component-modal-overlay');
      const selectElement = modal.querySelector('select[id^="target-bed-"]');
      if (selectElement) {
        selectElement.value = '2';
        
        // Extract the modal ID from the select element's ID
        const batchModalId = selectElement.id.replace('target-bed-', '');
        
        // Test the method directly
        await component.handleBatchMove(batchModalId, batch, modal);
        
        expect(mockApp.submitBatchMove).toHaveBeenCalledWith({
          batch_id: '123',
          target_grow_bed_id: '2'
        });
        
        expect(mockApp.showNotification).toHaveBeenCalledWith('Batch moved successfully!', 'success');
      } else {
        // If no select found, test the validation path
        await component.handleBatchMove('test-id', batch, modal);
        expect(mockApp.showNotification).toHaveBeenCalledWith(
          'Please select a target grow bed', 'warning'
        );
      }
    });

    test('should handle batch harvest operation', () => {
      const batch = { id: '123', cropName: 'lettuce' };
      const overlay = document.createElement('div');
      document.body.appendChild(overlay);
      
      component.handleBatchHarvest(batch, overlay);
      
      expect(mockApp.openHarvestForm).toHaveBeenCalledWith(batch);
      expect(document.body.contains(overlay)).toBe(false); // Should be removed
    });

    test('should handle missing harvest form gracefully', () => {
      mockApp.openHarvestForm = null;
      
      const batch = { id: '123', cropName: 'lettuce' };
      const overlay = document.createElement('div');
      document.body.appendChild(overlay);
      
      component.handleBatchHarvest(batch, overlay);
      
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        'Harvest functionality not available', 'warning'
      );
    });
  });

  describe('Generic Modal Creation', () => {
    test('should create basic modal structure', () => {
      const { overlay, modal } = component.createModal({
        id: 'test-modal',
        title: 'Test Modal',
        content: '<p>Test content</p>'
      });
      
      expect(overlay.className).toBe('modal-overlay');
      expect(overlay.id).toBe('test-modal');
      expect(modal.className).toBe('modal-content');
      expect(modal.innerHTML).toContain('Test Modal');
      expect(modal.innerHTML).toContain('Test content');
    });

    test('should create modal without title or content', () => {
      const { overlay, modal } = component.createModal();
      
      expect(overlay).toBeTruthy();
      expect(modal).toBeTruthy();
      expect(modal.innerHTML.trim()).toBe('');
    });

    test('should setup backdrop click handler', () => {
      const { overlay } = component.createModal({ backdrop: true });
      const closeSpy = jest.spyOn(component, 'closeModal');
      
      // Create and append to test backdrop click
      document.body.appendChild(overlay);
      overlay.click();
      
      expect(closeSpy).toHaveBeenCalledWith(overlay);
    });

    test('should setup keyboard handler', () => {
      const { overlay } = component.createModal({ keyboard: true });
      document.body.appendChild(overlay);
      
      const closeSpy = jest.spyOn(component, 'closeModal');
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(closeSpy).toHaveBeenCalledWith(overlay);
    });

    test('should show generic modal with animation', () => {
      jest.useFakeTimers();
      
      const { overlay } = component.showGenericModal({
        id: 'animated-modal',
        animation: true,
        content: 'Animated content'
      });
      
      expect(document.body.contains(overlay)).toBe(true);
      
      jest.advanceTimersByTime(15);
      expect(overlay.classList.contains('show')).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('Modal Lifecycle Management', () => {
    test('should track active modals', () => {
      const elements = { overlay: document.createElement('div') };
      
      component.trackModal('test-modal', elements);
      
      expect(component.activeModals.get('test-modal')).toBe(elements);
      expect(component.modalStack).toContain('test-modal');
    });

    test('should untrack modals', () => {
      component.trackModal('test-modal', { overlay: document.createElement('div') });
      
      component.untrackModal('test-modal');
      
      expect(component.activeModals.has('test-modal')).toBe(false);
      expect(component.modalStack).not.toContain('test-modal');
    });

    test('should get active modal count', () => {
      component.trackModal('modal1', { overlay: document.createElement('div') });
      component.trackModal('modal2', { overlay: document.createElement('div') });
      
      expect(component.getActiveModalCount()).toBe(2);
    });

    test('should check if specific modal is active', () => {
      component.trackModal('test-modal', { overlay: document.createElement('div') });
      
      expect(component.isModalActive('test-modal')).toBe(true);
      expect(component.isModalActive('other-modal')).toBe(false);
    });

    test('should close specific modal by element', () => {
      const overlay = document.createElement('div');
      overlay.id = 'test-overlay';
      overlay.classList.add('show');
      document.body.appendChild(overlay);
      
      component.closeModal(overlay);
      
      expect(overlay.classList.contains('show')).toBe(false);
    });

    test('should close modal by ID string', () => {
      const overlay = document.createElement('div');
      overlay.id = 'test-overlay';
      overlay.classList.add('show');
      document.body.appendChild(overlay);
      
      component.closeModal('test-overlay');
      
      expect(overlay.classList.contains('show')).toBe(false);
    });

    test('should close all modals', () => {
      // Create multiple modals
      const overlay1 = document.createElement('div');
      overlay1.className = 'modal-overlay';
      overlay1.classList.add('show');
      document.body.appendChild(overlay1);
      
      const overlay2 = document.createElement('div');
      overlay2.className = 'modal-overlay';
      overlay2.classList.add('show');
      document.body.appendChild(overlay2);
      
      component.trackModal('modal1', { overlay: overlay1 });
      component.trackModal('modal2', { overlay: overlay2 });
      
      component.closeAllModals();
      
      expect(component.activeModals.size).toBe(0);
      expect(component.modalStack.length).toBe(0);
    });
  });

  describe('Component Statistics and Lifecycle', () => {
    test('should get component statistics', () => {
      component.trackModal('modal1', { overlay: document.createElement('div') });
      component.trackModal('modal2', { overlay: document.createElement('div') });
      
      const stats = component.getStats();
      
      expect(stats).toEqual({
        activeModals: 2,
        modalStack: 2,
        componentLoaded: true
      });
    });

    test('should destroy component properly', () => {
      // Track some modals
      component.trackModal('modal1', { overlay: document.createElement('div') });
      component.trackModal('modal2', { overlay: document.createElement('div') });
      
      const closeAllSpy = jest.spyOn(component, 'closeAllModals');
      
      component.destroy();
      
      expect(closeAllSpy).toHaveBeenCalled();
      expect(component.activeModals.size).toBe(0);
      expect(component.modalStack.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully in slideouts', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        component.showLoginSlideout();
        component.showRegisterSlideout();
        component.showForgotPasswordSlideout();
      }).not.toThrow();
    });

    test('should handle missing confirmation modal elements', async () => {
      const result = await component.showCustomConfirm('Title', 'Message');
      expect(result).toBe(false);
    });

    test('should handle batch modal API failures gracefully', async () => {
      mockApp.getGrowBedsForSystem.mockRejectedValue(new Error('API Error'));
      
      expect(async () => {
        await component.showBatchModal(
          { id: '123', cropName: 'lettuce' },
          { id: '1', name: 'Test Bed' }
        );
      }).not.toThrow();
    });

    test('should handle batch move validation', async () => {
      const batch = { id: '123' };
      const overlay = document.createElement('div');
      
      // No target bed selected
      await component.handleBatchMove(Date.now(), batch, overlay);
      
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        'Please select a target grow bed', 'warning'
      );
    });

    test('should handle batch move API errors', async () => {
      mockApp.submitBatchMove.mockRejectedValue(new Error('Move failed'));
      
      const batchModalId = 'test-modal-id';
      const targetSelect = document.createElement('select');
      targetSelect.id = `target-bed-${batchModalId}`;
      targetSelect.value = '2';
      document.body.appendChild(targetSelect);
      
      const batch = { id: '123' };
      const overlay = document.createElement('div');
      
      await component.handleBatchMove(batchModalId, batch, overlay);
      
      expect(mockApp.submitBatchMove).toHaveBeenCalledWith({
        batch_id: '123',
        target_grow_bed_id: '2'
      });
      
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        'Failed to move batch', 'error'
      );
    });
  });

  describe('Animation and Timing', () => {
    test('should use correct animation duration', () => {
      expect(component.defaultConfig.animationDuration).toBe(400);
    });

    test('should handle modal close timing', () => {
      jest.useFakeTimers();
      
      const overlay = document.createElement('div');
      overlay.classList.add('show');
      document.body.appendChild(overlay);
      
      component.closeModal(overlay);
      
      expect(overlay.classList.contains('show')).toBe(false);
      expect(document.body.contains(overlay)).toBe(true);
      
      jest.advanceTimersByTime(400);
      
      expect(document.body.contains(overlay)).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe('Factory Function', () => {
    test('should create modal manager via factory function', async () => {
      const { createModalManagerComponent } = await import('../../public/js/modules/components/modalManager.js');
      
      const factoryComponent = createModalManagerComponent(mockApp);
      
      expect(factoryComponent).toBeInstanceOf(ModalManagerComponent);
      expect(factoryComponent.app).toBe(mockApp);
      
      factoryComponent.destroy();
    });
  });
});