// Farm Layout Renderer Component
// Handles complex farm layout visualization with SVG rendering

import { API_ENDPOINTS } from '../constants/index.js';

/**
 * Farm Layout Renderer Component Class
 * Manages farm layout visualization, component positioning, and interactive elements
 */
export class FarmLayoutRendererComponent {
    constructor(app) {
        this.app = app;
        this.layoutScale = 1;
        this.layoutPanX = 0;
        this.layoutPanY = 0;
        this.labelsVisible = true;
        this.activeTooltip = null;
        
        // Add document-level event listener to hide tooltips when mouse leaves SVG area
        this.setupGlobalTooltipHiding();
        
        console.log('🏞️ Farm Layout Renderer Component initialized');
    }

    /**
     * Setup global tooltip hiding mechanism
     */
    setupGlobalTooltipHiding() {
        // Hide tooltip when mouse moves outside farm layout area OR away from batch blocks
        document.addEventListener('mousemove', (e) => {
            if (this.activeTooltip) {
                const farmLayout = document.getElementById('main-farm-layout-svg');
                if (farmLayout) {
                    const rect = farmLayout.getBoundingClientRect();
                    const isOutside = e.clientX < rect.left || e.clientX > rect.right || 
                                    e.clientY < rect.top || e.clientY > rect.bottom;
                    
                    // Also check if mouse is over a batch block
                    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
                    const isOverBatch = elementUnderMouse && (
                        elementUnderMouse.classList.contains('farm-batch-block') ||
                        elementUnderMouse.closest('.farm-batch-block')
                    );
                    
                    if (isOutside || (!isOverBatch && this.activeTooltip.classList.contains('batch-tooltip'))) {
                        console.log('🔧 Global hide - outside:', isOutside, 'overBatch:', isOverBatch);
                        this.hideLayoutTooltip();
                    }
                }
            }
        });
        
        // Also hide on scroll or window resize - throttled to prevent excessive calls
        let scrollTimeout;
        let resizeTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.hideLayoutTooltip(), 100);
        });
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.hideLayoutTooltip(), 100);
        });
        
        // Hide batch tooltips when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (this.activeTooltip && this.activeTooltip.classList.contains('batch-tooltip')) {
                const isClickOnBatch = e.target && (
                    e.target.classList.contains('farm-batch-block') ||
                    e.target.closest('.farm-batch-block')
                );
                if (!isClickOnBatch) {
                    this.hideLayoutTooltip();
                }
            }
        });
    }

    /**
     * Main farm layout rendering method
     * Complexity: 35, Lines: 48
     */
    async renderFarmLayout() {
        try {
            // Fetch system data including fish inventory
            const [fishTanksResponse, growBeds, plantData, fishInventory] = await Promise.all([
                this.app.makeApiCall(`/fish-tanks/system/${this.app.activeSystemId}`).catch(() => ({ tanks: [] })),
                this.app.makeApiCall(`/grow-beds/system/${this.app.activeSystemId}`),
                this.app.makeApiCall(`/data/plant-growth/${this.app.activeSystemId}`),
                this.app.makeApiCall(`/fish-inventory/system/${this.app.activeSystemId}`).catch(() => ({ tanks: [] }))
            ]);
            
            // Extract fish tanks array from response object, with fallback to system config
            let fishTanks = fishTanksResponse?.tanks || [];
            
            // If no tank data from API, create fallback tanks from system configuration
            if (!fishTanks || fishTanks.length === 0) {
                const systemData = this.app.getActiveSystem();
                if (systemData && systemData.fish_tank_count > 0) {
                    const tankCount = systemData.fish_tank_count || 1;
                    const tankVolume = systemData.total_fish_volume || 1000;
                    const volumePerTankLiters = Math.floor(tankVolume / tankCount);
                    const volumePerTankM3 = volumePerTankLiters / 1000;
                    
                    fishTanks = [];
                    for (let i = 1; i <= tankCount; i++) {
                        fishTanks.push({
                            id: i,
                            tank_number: i,
                            size_m3: volumePerTankM3,
                            volume_liters: volumePerTankLiters,
                            fish_type: 'tilapia' // default fish type
                        });
                    }
                }
            }
            
            // Store fish inventory for later use
            this.fishInventoryData = fishInventory?.tanks || [];
            console.log('🐠 Farm layout loaded with inventory data for', this.fishInventoryData.length, 'tanks');
            
            // Calculate layout bounds and positioning
            console.log(`🎯 About to call calculateLayoutPositions with ${fishTanks?.length} tanks, ${growBeds?.length} beds`);
            const layoutData = this.calculateLayoutPositions(fishTanks, growBeds, plantData);
            console.log(`🎯 calculateLayoutPositions returned:`, layoutData?.components?.length, 'components');
            
            // Render components
            this.renderFarmComponents(layoutData);
            
            // Update scale and stats
            this.updateLayoutScale(layoutData.bounds);
            this.updateLayoutStats(layoutData);
            
        } catch (error) {
            console.error('Error rendering farm layout:', error);
            this.showFarmLayoutError('Failed to render components');
        }
    }
    
    /**
     * Calculate positions for all farm components
     * Complexity: 42, Lines: 105
     */
    calculateLayoutPositions(fishTanks, growBeds, plantData) {
        console.log(`🎯 calculateLayoutPositions() called with fishTanks:`, fishTanks?.length, 'growBeds:', growBeds?.length);
        const components = [];
        const margin = 50;
        let currentX = margin;
        let currentY = margin;
        let rowHeight = 0;
        
        // Add fish tanks with proper top padding
        const topPadding = 40; // Normal padding since viewBox will handle spacing
        
        if (Array.isArray(fishTanks)) {
            fishTanks.forEach((tank, index) => {
                const volume = tank.size_m3 || (tank.volume_liters ? tank.volume_liters / 1000 : 1);
                const diameter = this.calculateTankDiameter(volume);
                const tankNumber = tank.tank_number || index + 1;
                const fishCount = this.getFishCount(tankNumber, plantData);
                
                // Get actual average weight from inventory data
                let avgFishWeight = 0.25; // default kg per fish
                if (this.fishInventoryData && this.fishInventoryData.length > 0) {
                    const tankData = this.fishInventoryData.find(t => t.tank_number === tankNumber);
                    if (tankData) {
                        // Try different possible field names for average weight
                        const avgWeight = tankData.average_weight || tankData.avg_weight || tankData.weight || 0;
                        if (avgWeight > 0) {
                            avgFishWeight = parseFloat(avgWeight) / 1000; // Convert grams to kg
                        }
                    }
                }
                
                const density = volume > 0 ? ((fishCount * avgFishWeight) / volume).toFixed(1) : 0; // kg/m³
                
                components.push({
                    type: 'tank',
                    id: tank.id || `tank-${index}`,
                    name: `${tank.tank_number || index + 1}`, // Just the number
                    x: currentX + diameter/2,
                    y: currentY + diameter/2 + topPadding, // Add top padding
                    diameter: diameter,
                    volume: volume,
                    fishCount: fishCount,
                    density: density,
                    fishType: tank.fish_type || 'Unknown'
                });
                
                currentX += diameter + margin;
                rowHeight = Math.max(rowHeight, diameter);
            });
        }
        
        // Move to next row for grow beds with tighter spacing
        currentX = margin;
        currentY += rowHeight + margin + 30; // Reduced space between tanks and beds
        rowHeight = 0;
        
        // Add grow beds
        if (Array.isArray(growBeds)) {
            growBeds.forEach((bed, index) => {
            const width = (bed.length_meters || 2) * 50; // 50px per meter (original size)
            const height = (bed.width_meters || 1.2) * 50;
            
            // Wrap to next row if needed
            if (currentX + width > 700) {
                currentX = margin;
                currentY += rowHeight + margin;
                rowHeight = 0;
            }
            
            const plantCount = this.getBedPlantCount(bed.id, plantData);
            const status = plantCount > 0 ? 'planted' : 'empty';
            
            // Calculate bed area and capacity
            const bedArea = (bed.length_meters || 2) * (bed.width_meters || 1.2);
            const equivalentArea = bed.equivalent_m2 || bedArea;
            
            // Get plant spacing info to calculate capacity
            const avgSpacing = 0.04; // Default 0.04m² per plant (20cm x 20cm)
            const maxCapacity = Math.floor(equivalentArea / avgSpacing);
            const plantedPercentage = maxCapacity > 0 ? Math.min(100, (plantCount / maxCapacity) * 100) : 0;
            const availableArea = Math.max(0, equivalentArea - (plantCount * avgSpacing));
            
            // Get batch data for this bed
            const batches = this.getBedBatches(bed.id, plantData, avgSpacing);
            
            components.push({
                type: 'bed',
                id: bed.id || `bed-${index}`,
                name: bed.bed_name || `Bed ${bed.bed_number || index + 1}`,
                x: currentX,
                y: currentY,
                width: width,
                height: height,
                bedType: bed.bed_type || 'media',
                status: status,
                plantCount: plantCount,
                dimensions: `${bed.length_meters || 2}m × ${bed.width_meters || 1.2}m`,
                bedArea: bedArea,
                equivalentArea: equivalentArea,
                plantedPercentage: plantedPercentage,
                availableArea: availableArea,
                maxCapacity: maxCapacity,
                batches: batches
            });
            
            currentX += width + margin;
            rowHeight = Math.max(rowHeight, height);
            });
        }
        
        // Calculate bounds
        const bounds = this.calculateBounds(components, margin);
        
        return {
            components,
            bounds,
            fishTanks: Array.isArray(fishTanks) ? fishTanks.length : 0,
            growBeds: Array.isArray(growBeds) ? growBeds.length : 0,
            totalArea: this.calculateTotalArea(growBeds || [])
        };
    }
    
    /**
     * Calculate tank diameter based on volume
     */
    calculateTankDiameter(volume) {
        // Volume (m³) = π × r² × h
        // Given: height = 1.2m (standard)
        // Therefore: diameter = 2 × √(Volume / (π × 1.2))
        const height = 1.2;
        const radius = Math.sqrt(volume / (Math.PI * height));
        const diameter = 2 * radius;
        return diameter * 75; // 75px per meter (50% larger than 50px)
    }
    
    /**
     * Get fish count for tank from actual inventory data
     */
    getFishCount(tankNumber, plantData) {
        // Get actual fish count from inventory data
        if (this.fishInventoryData && this.fishInventoryData.length > 0) {
            const tankData = this.fishInventoryData.find(tank => {
                return tank.tank_number == tankNumber; // Use == for type coercion
            });
            if (tankData) {
                // Try different possible field names for fish count
                const fishCount = tankData.current_count || tankData.fish_count || tankData.count || tankData.current_fish_count || 0;
                return parseInt(fishCount) || 0;
            }
        }
        // Fallback if no inventory data
        return 0;
    }
    
    /**
     * Get batch data for a grow bed
     * Complexity: 25, Lines: 58
     */
    getBedBatches(bedId, plantData, spacing) {
        if (!Array.isArray(plantData) || plantData.length === 0) {
            return [];
        }
        
        const batches = new Map();
        
        // Collect batch data
        plantData.forEach(entry => {
            if (entry.grow_bed_id == bedId && entry.batch_id) {
                if (!batches.has(entry.batch_id)) {
                    // Try multiple possible field names for crop
                    const cropName = entry.crop_name || entry.crop_type || entry.plant_name || entry.variety || 'Unknown';
                    batches.set(entry.batch_id, {
                        id: entry.batch_id,
                        plantCount: 0,
                        cropName: cropName,
                        plantedDate: entry.planting_date || entry.date_planted || entry.created_at
                    });
                }
                
                // Update crop name if we find a better one in subsequent entries
                const batch = batches.get(entry.batch_id);
                if (batch.cropName === 'Unknown' && entry.crop_name) {
                    batch.cropName = entry.crop_name;
                } else if (batch.cropName === 'Unknown' && entry.crop_type) {
                    batch.cropName = entry.crop_type;
                } else if (batch.cropName === 'Unknown' && entry.plant_name) {
                    batch.cropName = entry.plant_name;
                } else if (batch.cropName === 'Unknown' && entry.variety) {
                    batch.cropName = entry.variety;
                }
                
                // Add planted plants
                if (entry.new_seedlings && entry.new_seedlings > 0) {
                    batch.plantCount += entry.new_seedlings;
                }
                
                // Subtract harvested plants
                if (entry.plants_harvested && entry.plants_harvested > 0) {
                    batch.plantCount = Math.max(0, batch.plantCount - entry.plants_harvested);
                }
            }
        });
        
        // Convert to array and calculate area for each batch
        const batchArray = [];
        batches.forEach(batch => {
            if (batch.plantCount > 0) {
                batch.area = batch.plantCount * spacing;
                batchArray.push(batch);
            }
        });
        
        return batchArray;
    }
    
    /**
     * Get plant count for a specific bed
     * Complexity: 18, Lines: 34
     */
    getBedPlantCount(bedId, plantData) {
        if (!Array.isArray(plantData) || plantData.length === 0) {
            return 0;
        }
        
        let plantCount = 0;
        const plantCounts = new Map();
        
        plantData.forEach(entry => {
            // Use == for type coercion since bed IDs might be strings or numbers
            if (entry.grow_bed_id == bedId && entry.batch_id) {
                // Add planted plants
                if (entry.new_seedlings && entry.new_seedlings > 0) {
                    const existing = plantCounts.get(entry.batch_id) || 0;
                    plantCounts.set(entry.batch_id, existing + entry.new_seedlings);
                }
                
                // Subtract harvested plants
                if (entry.plants_harvested && entry.plants_harvested > 0) {
                    const existing = plantCounts.get(entry.batch_id) || 0;
                    const newCount = Math.max(0, existing - entry.plants_harvested);
                    plantCounts.set(entry.batch_id, newCount);
                }
            }
        });
        
        plantCounts.forEach(count => {
            plantCount += count;
        });
        
        return plantCount;
    }
    
    /**
     * Calculate layout bounds for all components
     * Complexity: 15, Lines: 39
     */
    calculateBounds(components, margin) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        components.forEach(comp => {
            if (comp.type === 'tank') {
                minX = Math.min(minX, comp.x - comp.diameter/2);
                minY = Math.min(minY, comp.y - comp.diameter/2);
                maxX = Math.max(maxX, comp.x + comp.diameter/2);
                maxY = Math.max(maxY, comp.y + comp.diameter/2);
            } else {
                minX = Math.min(minX, comp.x);
                minY = Math.min(minY, comp.y);
                maxX = Math.max(maxX, comp.x + comp.width);
                maxY = Math.max(maxY, comp.y + comp.height);
            }
        });
        
        // Handle case where no valid components exist (prevents Infinity values)
        if (minX === Infinity || maxX === -Infinity) {
            minX = 0;
            maxX = 400;
            minY = 0;
            maxY = 300;
        }
        
        // Minimal space for scale indicator at bottom
        const scaleSpace = 30;
        // Reduce side margins for tighter layout
        const sidePadding = 20;
        // Add top margin to avoid legend overlap
        const topMargin = 140;
        
        return {
            minX: minX - sidePadding,
            minY: minY - topMargin, // Add top margin for legend
            maxX: maxX + sidePadding, 
            maxY: maxY + scaleSpace, // No bottom margin, just scale space
            width: maxX - minX + 2 * sidePadding,
            height: maxY - minY + scaleSpace + topMargin
        };
    }
    
    /**
     * Calculate total area of all grow beds
     */
    calculateTotalArea(growBeds) {
        return growBeds.reduce((total, bed) => {
            const area = (bed.length_meters || 2) * (bed.width_meters || 1.2);
            return total + area;
        }, 0);
    }
    
    /**
     * Render all farm components to SVG
     * Complexity: 15, Lines: 21
     */
    renderFarmComponents(layoutData) {
        const svg = document.getElementById('main-farm-layout-svg');
        let componentsGroup = document.getElementById('main-farm-components');
        
        // Create the components group if it doesn't exist
        if (!componentsGroup && svg) {
            componentsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            componentsGroup.setAttribute('id', 'main-farm-components');
            svg.appendChild(componentsGroup);
            console.log('✅ Created missing main-farm-components group');
        }
        
        console.log(`🎯 renderFarmComponents() called with ${layoutData.components?.length} components`);
        console.log(`📊 SVG found: ${!!svg}, Components group found: ${!!componentsGroup}`);
        
        if (!svg || !componentsGroup) {
            console.log(`❌ Missing DOM elements - SVG: ${!!svg}, Components: ${!!componentsGroup}`);
            return;
        }
        
        // Clear existing components
        componentsGroup.innerHTML = '';
        
        // Update SVG viewBox to fit all components
        const bounds = layoutData.bounds;
        svg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
        
        // Render each component
        layoutData.components.forEach(comp => {
            if (comp.type === 'tank') {
                this.renderTank(componentsGroup, comp);
            } else {
                this.renderGrowBed(componentsGroup, comp);
            }
        });
    }
    
    /**
     * Render individual tank component
     * Complexity: 12, Lines: 35
     */
    renderTank(parent, tank) {
        console.log(`🎯 renderTank() called for ${tank.name}: ${tank.fishCount} fish, ${tank.density} kg/m³`);
        const tankGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tankGroup.setAttribute('class', 'farm-tank-group');
        
        // Tank circle - ADD FIRST so it's in the background
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', tank.x);
        circle.setAttribute('cy', tank.y);
        circle.setAttribute('r', tank.diameter / 2);
        circle.setAttribute('class', 'farm-tank');
        circle.setAttribute('data-tank-id', tank.id);
        tankGroup.appendChild(circle);  // Add circle FIRST
        
        // Tank label - ADD AFTER circle so it's on top
        if (this.labelsVisible) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', tank.x);
            label.setAttribute('y', tank.y - 20);
            label.setAttribute('class', 'component-label');
            label.setAttribute('style', 'fill: #ffffff; font-size: 14px; font-weight: bold; text-anchor: middle;');
            label.textContent = tank.name;
            tankGroup.appendChild(label);
            
            
            // Tank info
            const info = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            info.setAttribute('x', tank.x);
            info.setAttribute('y', tank.y + 20);
            info.setAttribute('class', 'component-info');
            info.setAttribute('style', 'fill: #ffffff; font-size: 12px; font-weight: bold; text-anchor: middle;');
            info.textContent = `${tank.fishCount} fish • ${tank.density} kg/m³`;
            tankGroup.appendChild(info);
        }
        
        parent.appendChild(tankGroup);
        
        // Add hover/click handlers
        this.addComponentInteractions(circle, tank);
    }
    
    /**
     * Render individual grow bed component
     * Complexity: 18, Lines: 44
     */
    renderGrowBed(parent, bed) {
        const bedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        bedGroup.setAttribute('class', 'farm-bed-group');
        
        // Bed rectangle - ADD FIRST so it's in the background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', bed.x);
        rect.setAttribute('y', bed.y);
        rect.setAttribute('width', bed.width);
        rect.setAttribute('height', bed.height);
        rect.setAttribute('class', `farm-grow-bed ${bed.status}`);
        rect.setAttribute('data-bed-id', bed.id);
        
        // Apply pattern based on bed type
        if (bed.bedType === 'nft') {
            rect.setAttribute('fill', 'url(#nft-pattern)');
        } else if (bed.bedType === 'dwc') {
            rect.setAttribute('fill', 'url(#dwc-pattern)');
        }
        
        bedGroup.appendChild(rect);  // Add rect FIRST
        
        // Render plant batches as filled blocks (left to right, proportional to bed capacity)
        if (bed.batches && bed.batches.length > 0) {
            const activeBatches = bed.batches.filter(batch => batch.plantCount > 0);
            
            // Calculate total planted area and bed capacity
            let totalPlantedArea = 0;
            activeBatches.forEach(batch => {
                const plantSpacing = batch.plantSpacing || 0.25; // Default 0.25m² per plant
                const batchArea = batch.plantCount * plantSpacing;
                totalPlantedArea += batchArea;
            });
            
            // Use bed capacity or estimate from bed area
            const bedCapacity = bed.maxCapacity || (bed.bedArea / 0.25) || 100; // plants
            const totalBedArea = bedCapacity * 0.25; // m²
            
            console.log(`🌱 ${bed.name}: Planted=${totalPlantedArea}m², Capacity=${totalBedArea}m², Available=${totalBedArea - totalPlantedArea}m²`);
            
            const blockHeight = bed.height - 4; // Full height minus padding
            let currentX = bed.x + 2; // Start with small padding
            const availableWidth = bed.width - 4; // Total width minus padding
            
            // Render planted batches
            if (activeBatches.length > 0) {
                activeBatches.forEach((batch, index) => {
                    const plantSpacing = batch.plantSpacing || 0.25; // Default 0.25m² per plant
                    const batchArea = batch.plantCount * plantSpacing;
                    
                    // Calculate proportional width based on this batch's area vs total bed capacity
                    const areaProportion = batchArea / totalBedArea;
                    const blockWidth = availableWidth * areaProportion;
                    
                    if (blockWidth > 2) { // Only render if meaningful width
                        const batchRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        batchRect.setAttribute('x', currentX);
                        batchRect.setAttribute('y', bed.y + 2);
                        batchRect.setAttribute('width', blockWidth);
                        batchRect.setAttribute('height', blockHeight);
                        batchRect.setAttribute('fill', '#065f46'); // Dark green for planted areas
                        batchRect.setAttribute('opacity', '0.7');
                        batchRect.setAttribute('rx', '2'); // Rounded corners
                        batchRect.setAttribute('class', 'farm-batch-block');
                        batchRect.setAttribute('data-batch-id', batch.batchId || `batch-${index}`);
                        batchRect.style.cursor = 'pointer';
                        bedGroup.appendChild(batchRect);
                        
                        // Add batch hover tooltip and click handler
                        this.addBatchInteractions(batchRect, batch, bed);
                        
                        // Add batch label (only if width is sufficient)
                        if (blockWidth > 30) {
                            const batchLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                            batchLabel.setAttribute('x', currentX + blockWidth / 2);
                            batchLabel.setAttribute('y', bed.y + bed.height / 2 - 3);
                            batchLabel.setAttribute('fill', '#ffffff');
                            batchLabel.setAttribute('font-size', '14px'); // 9px * 1.5 = 13.5px → 14px
                            batchLabel.setAttribute('font-weight', 'bold');
                            batchLabel.setAttribute('text-anchor', 'middle');
                            batchLabel.style.pointerEvents = 'none'; // Allow click through to batch rect
                            const cropName = batch.cropName || `Batch ${index + 1}`;
                            batchLabel.textContent = `${cropName}`;
                            bedGroup.appendChild(batchLabel);
                            
                            // Add plant count below
                            const countLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                            countLabel.setAttribute('x', currentX + blockWidth / 2);
                            countLabel.setAttribute('y', bed.y + bed.height / 2 + 15); // Adjust spacing
                            countLabel.setAttribute('fill', '#ffffff');
                            countLabel.setAttribute('font-size', '12px'); // 8px * 1.5 = 12px
                            countLabel.setAttribute('font-weight', 'normal');
                            countLabel.setAttribute('text-anchor', 'middle');
                            countLabel.style.pointerEvents = 'none'; // Allow click through to batch rect
                            countLabel.textContent = `${batch.plantCount}`;
                            bedGroup.appendChild(countLabel);
                        }
                        
                        currentX += blockWidth; // Move to next position
                    }
                });
            }
            
            // Show remaining available space based on actual capacity
            const availableArea = totalBedArea - totalPlantedArea;
            if (availableArea > 0) {
                const availableProportion = availableArea / totalBedArea;
                const availableBlockWidth = availableWidth * availableProportion;
                
                if (availableBlockWidth > 5) { // Only show if meaningful width
                    const availableRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    availableRect.setAttribute('x', currentX);
                    availableRect.setAttribute('y', bed.y + 2);
                    availableRect.setAttribute('width', availableBlockWidth);
                    availableRect.setAttribute('height', blockHeight);
                    availableRect.setAttribute('fill', '#f3f4f6'); // Light gray for available space
                    availableRect.setAttribute('opacity', '0.8');
                    availableRect.setAttribute('rx', '2');
                    availableRect.setAttribute('stroke', '#d1d5db');
                    availableRect.setAttribute('stroke-width', '1');
                    availableRect.setAttribute('stroke-dasharray', '3,3'); // Dashed border to indicate empty
                    bedGroup.appendChild(availableRect);
                    
                    // Add "Available" label if width is sufficient
                    if (availableBlockWidth > 40) {
                        const availableLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        availableLabel.setAttribute('x', currentX + availableBlockWidth / 2);
                        availableLabel.setAttribute('y', bed.y + bed.height / 2 + 3);
                        availableLabel.setAttribute('fill', '#6b7280');
                        availableLabel.setAttribute('font-size', '9px');
                        availableLabel.setAttribute('font-weight', 'normal');
                        availableLabel.setAttribute('text-anchor', 'middle');
                        availableLabel.textContent = 'Available';
                        bedGroup.appendChild(availableLabel);
                    }
                }
            }
        } else if (bed.maxCapacity || bed.bedArea) {
            // Show full bed as available if no batches
            const blockHeight = bed.height - 4;
            const availableRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            availableRect.setAttribute('x', bed.x + 2);
            availableRect.setAttribute('y', bed.y + 2);
            availableRect.setAttribute('width', bed.width - 4);
            availableRect.setAttribute('height', blockHeight);
            availableRect.setAttribute('fill', '#f3f4f6');
            availableRect.setAttribute('opacity', '0.8');
            availableRect.setAttribute('rx', '2');
            availableRect.setAttribute('stroke', '#d1d5db');
            availableRect.setAttribute('stroke-width', '1');
            availableRect.setAttribute('stroke-dasharray', '3,3');
            bedGroup.appendChild(availableRect);
            
            const availableLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            availableLabel.setAttribute('x', bed.x + bed.width / 2);
            availableLabel.setAttribute('y', bed.y + bed.height / 2 + 3);
            availableLabel.setAttribute('fill', '#6b7280');
            availableLabel.setAttribute('font-size', '9px');
            availableLabel.setAttribute('font-weight', 'normal');
            availableLabel.setAttribute('text-anchor', 'middle');
            availableLabel.textContent = 'Fully Available';
            bedGroup.appendChild(availableLabel);
        }
        
        // Bed label - ADD AFTER rect and batches so it's on top
        if (this.labelsVisible) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', bed.x + bed.width / 2);
            label.setAttribute('y', bed.y - 5); // Move above the bed
            label.setAttribute('class', 'component-label');
            label.textContent = bed.name;
            bedGroup.appendChild(label);
            
            // Bed info - below the bed
            const info = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            info.setAttribute('x', bed.x + bed.width / 2);
            info.setAttribute('y', bed.y + bed.height + 15);
            info.setAttribute('class', 'component-info');
            const availableText = bed.availableArea ? ` • ${bed.availableArea.toFixed(1)}m² available` : '';
            info.textContent = `${bed.dimensions} • ${bed.plantCount} plants${availableText}`;
            bedGroup.appendChild(info);
        }
        
        parent.appendChild(bedGroup);
        
        // Add hover/click handlers
        this.addComponentInteractions(rect, bed);
    }
    
    /**
     * Add interaction handlers to components
     */
    addComponentInteractions(element, component) {
        // Hover tooltip
        element.addEventListener('mouseenter', (e) => {
            this.showLayoutTooltip(e, component);
        });
        
        element.addEventListener('mouseleave', () => {
            this.hideLayoutTooltip();
        });
        
        // Click handler
        element.addEventListener('click', () => {
            this.handleComponentClick(component);
        });
    }
    
    /**
     * Add interaction handlers to batch blocks
     */
    addBatchInteractions(element, batch, bed) {
        // Combined hover handlers for tooltip and visual effect
        element.addEventListener('mouseenter', (e) => {
            console.log('🌱 Batch mouseenter:', batch.cropName);
            this.showBatchTooltip(e, batch, bed);
            element.setAttribute('opacity', '0.9'); // Brighten on hover
        });
        
        element.addEventListener('mouseleave', () => {
            console.log('🌱 Batch mouseleave:', batch.cropName);
            this.hideLayoutTooltip();
            element.setAttribute('opacity', '0.7'); // Return to normal
        });
        
        // Click handler for batch modal
        element.addEventListener('click', (e) => {
            console.log('🌱 Batch clicked:', batch.cropName);
            e.stopPropagation(); // Prevent bed click handler
            this.hideLayoutTooltip(); // Hide tooltip on click
            this.showBatchModal(batch, bed);
        });
    }
    
    /**
     * Show component tooltip on hover
     * Complexity: 20, Lines: 56
     */
    showLayoutTooltip(event, component) {
        // Remove any existing tooltip first
        this.hideLayoutTooltip();
        
        // Implementation for tooltip display
        const tooltip = document.createElement('div');
        tooltip.className = 'layout-tooltip';
        tooltip.id = 'layout-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '10000';
        tooltip.style.pointerEvents = 'none';
        
        if (component.type === 'tank') {
            tooltip.innerHTML = `
                <strong>Tank ${component.name}</strong><br>
                Fish: ${component.fishCount}<br>
                Density: ${component.density} kg/m³<br>
                Type: ${component.fishType}
            `;
        } else {
            const percentageText = component.plantedPercentage !== undefined 
                ? `${component.plantedPercentage.toFixed(0)}%` 
                : 'N/A';
            const availableText = component.availableArea !== undefined 
                ? `${component.availableArea.toFixed(1)}m²` 
                : 'N/A';
            tooltip.innerHTML = `
                <strong>${component.name}</strong><br>
                Type: ${component.bedType.toUpperCase()}<br>
                Size: ${component.dimensions}<br>
                Plants: ${component.plantCount} (${percentageText} planted)<br>
                Available: ${availableText}<br>
                Status: ${component.status}
            `;
        }
        
        document.body.appendChild(tooltip);
        
        // Position tooltip with better calculation
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;
        
        // Keep tooltip within viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10; // Show below if no space above
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = '1';
    }
    
    /**
     * Hide component tooltip
     */
    hideLayoutTooltip() {
        // Early return if no tooltip to hide
        if (!this.activeTooltip && !document.getElementById('layout-tooltip')) {
            return;
        }
        
        // Remove active tooltip reference
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
        
        // Remove tooltip by ID (legacy system)
        const tooltip = document.getElementById('layout-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        // Force cleanup of any remaining tooltips (failsafe)
        const allTooltips = document.querySelectorAll('.layout-tooltip, .batch-tooltip');
        if (allTooltips.length > 0) {
            console.log('🧹 Force removing', allTooltips.length, 'remaining tooltips');
            allTooltips.forEach(tooltip => tooltip.remove());
        }
    }
    
    /**
     * Handle component click events
     */
    handleComponentClick(component) {
        if (component.type === 'tank') {
            this.showTankModal(component);
        } else {
            this.showBedModal(component);
        }
    }
    
    /**
     * Show tank details modal
     * Complexity: 15, Lines: 74
     */
    showTankModal(tank) {
        // Hide any tooltips first
        this.hideLayoutTooltip();
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'component-modal-overlay';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        const cropName = this.app.cleanCustomCropName ? this.app.cleanCustomCropName(tank.fishType) : tank.fishType;
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2><img src="/icons/new-icons/Afraponix Go Icons_fish.svg" alt="Fish" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> Tank ${tank.name} Details</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-info-grid">
                    <div class="info-item">
                        <label>Tank Number:</label>
                        <span>${tank.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Fish Type:</label>
                        <span>${cropName}</span>
                    </div>
                    <div class="info-item">
                        <label>Fish Count:</label>
                        <span>${tank.fishCount} fish</span>
                    </div>
                    <div class="info-item">
                        <label>Volume:</label>
                        <span>${(tank.volume && typeof tank.volume === 'number' && tank.volume > 0) ? tank.volume.toFixed(2) + ' m³' : 'Not configured'}</span>
                    </div>
                    <div class="info-item">
                        <label>Density:</label>
                        <span>${(tank.density && tank.density !== '0.0') ? tank.density + ' kg/m³' : 'No fish or volume not configured'}</span>
                    </div>
                    <div class="info-item">
                        <label>Diameter:</label>
                        <span>${(tank.diameter && typeof tank.diameter === 'number' && tank.diameter > 0) ? (tank.diameter / 75).toFixed(1) + ' meters' : 'Not configured'}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="modal-actions-grid">
                    <button class="modal-action-btn add-fish" onclick="app.showAddFishModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_fish.svg" alt="Add Fish" style="width: 16px; height: 16px;">
                        Add Fish
                    </button>
                    <button class="modal-action-btn mortality" onclick="app.showMortalityModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_mortality.svg" alt="Mortality" style="width: 16px; height: 16px;">
                        Mortality
                    </button>
                    <button class="modal-action-btn feed" onclick="app.showFeedingModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_feed.svg" alt="Feed" style="width: 16px; height: 16px;">
                        Feed
                    </button>
                    <button class="modal-action-btn record-size" onclick="app.showFishSizeModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_record_size.svg" alt="Record Size" style="width: 16px; height: 16px;">
                        Record Size
                    </button>
                    <button class="modal-action-btn harvest" onclick="app.showHarvestFishModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_harvest.svg" alt="Harvest" style="width: 16px; height: 16px;">
                        Harvest
                    </button>
                    <button class="modal-action-btn move-fish" onclick="app.showMoveFishModal(${tank.name}); this.closest('.modal-overlay').remove();">
                        <img src="icons/new-icons/Afraponix Go Icons_move.svg" alt="Move Fish" style="width: 16px; height: 16px;">
                        Move Fish
                    </button>
                </div>
                <div class="modal-footer-buttons">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn-primary" onclick="app.navigateToFishManagement(); this.closest('.modal-overlay').remove();">Manage Tank</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    /**
     * Show bed details modal
     * Complexity: 18, Lines: 83
     */
    showBedModal(bed) {
        // Hide any tooltips first
        this.hideLayoutTooltip();
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'component-modal-overlay';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        const utilizationPercent = bed.plantedPercentage || 0;
        const batchList = bed.batches && bed.batches.length > 0 
            ? bed.batches.map(b => this.app.cleanCustomCropName ? this.app.cleanCustomCropName(b.cropName) : b.cropName).join(', ')
            : 'No active batches';
        
        modal.innerHTML = `
            <div class="modal-header">
                <h2><img src="/icons/new-icons/Afraponix Go Icons_growbed.svg" alt="Grow Bed" class="heading-icon" style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.5em;"> ${bed.name} Details</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-info-grid">
                    <div class="info-item">
                        <label>Bed Name:</label>
                        <span>${bed.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Dimensions:</label>
                        <span>${bed.dimensions}</span>
                    </div>
                    <div class="info-item">
                        <label>Bed Type:</label>
                        <span>${bed.bedType.toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                        <label>Total Area:</label>
                        <span>${bed.equivalentArea.toFixed(2)} m²</span>
                    </div>
                    <div class="info-item">
                        <label>Plant Count:</label>
                        <span>${bed.plantCount} plants</span>
                    </div>
                    <div class="info-item">
                        <label>Utilization:</label>
                        <span>${utilizationPercent.toFixed(1)}%</span>
                    </div>
                    <div class="info-item">
                        <label>Available Space:</label>
                        <span>${bed.availableArea.toFixed(2)} m²</span>
                    </div>
                    <div class="info-item">
                        <label>Active Crops:</label>
                        <span>${batchList}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-primary" onclick="app.navigateToTab('grow-beds-tab'); this.closest('.modal-overlay').remove();">Manage Bed</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    /**
     * Zoom layout by factor
     */
    zoomLayout(factor) {
        this.layoutScale *= factor;
        this.layoutScale = Math.max(0.5, Math.min(2, this.layoutScale)); // Limit zoom range
        this.updateLayoutTransform();
    }
    
    /**
     * Reset layout view to default
     */
    resetLayoutView() {
        this.layoutScale = 1;
        this.layoutPanX = 0;
        this.layoutPanY = 0;
        this.updateLayoutTransform();
    }
    
    /**
     * Toggle component labels visibility
     */
    toggleLayoutLabels() {
        this.labelsVisible = !this.labelsVisible;
        const labels = document.querySelectorAll('.component-label, .component-info');
        labels.forEach(label => {
            label.style.display = this.labelsVisible ? 'block' : 'none';
        });
        
        // Update button appearance
        const btn = document.getElementById('toggle-labels-btn');
        if (btn) {
            btn.style.opacity = this.labelsVisible ? '1' : '0.6';
        }
    }
    
    /**
     * Update layout transform for zoom/pan
     */
    updateLayoutTransform() {
        const componentsGroup = document.getElementById('main-farm-components');
        if (componentsGroup) {
            componentsGroup.style.transform = `translate(${this.layoutPanX}px, ${this.layoutPanY}px) scale(${this.layoutScale})`;
        }
    }
    
    /**
     * Update layout scale indicator
     */
    updateLayoutScale(bounds) {
        const scaleText = document.getElementById('scale-text');
        if (scaleText && bounds) {
            const pixelsPerMeter = 50;
            const actualScale = pixelsPerMeter * this.layoutScale;
            scaleText.textContent = `Scale: ${(actualScale/50).toFixed(1)}cm = 1m`;
        }
    }
    
    /**
     * Update layout statistics display
     */
    updateLayoutStats(layoutData) {
        const statsElement = document.getElementById('layout-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <span>Tanks: ${layoutData.fishTanks}</span>
                <span>Beds: ${layoutData.growBeds}</span>
                <span>Total Area: ${layoutData.totalArea.toFixed(1)}m²</span>
            `;
        }
    }
    
    /**
     * Show farm layout error message
     */
    showFarmLayoutError(message) {
        const componentsGroup = document.getElementById('main-farm-components');
        if (componentsGroup) {
            componentsGroup.innerHTML = `
                <text x="400" y="300" text-anchor="middle" fill="#ef4444" font-size="16">
                    ⚠️ ${message}
                </text>
            `;
        }
    }
    
    /**
     * Get component statistics
     */
    getStats() {
        return {
            layoutScale: this.layoutScale,
            labelsVisible: this.labelsVisible,
            componentLoaded: true
        };
    }
    
    /**
     * Show batch tooltip on hover
     */
    showBatchTooltip(event, batch, bed) {
        this.hideLayoutTooltip(); // Clear any existing tooltip
        
        const tooltip = document.createElement('div');
        tooltip.className = 'layout-tooltip batch-tooltip';
        tooltip.style.position = 'fixed'; // Use fixed positioning instead of absolute
        tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '12px 18px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '18px';
        tooltip.style.zIndex = '10000';
        tooltip.style.maxWidth = '375px';
        tooltip.style.pointerEvents = 'none'; // Critical: tooltip should not interfere with mouse events
        tooltip.style.userSelect = 'none';
        
        const cropName = batch.cropName || 'Unknown Crop';
        const plantCount = batch.plantCount || 0;
        const plantSpacing = batch.plantSpacing || 0.25;
        const batchArea = plantCount * plantSpacing;
        const status = batch.status || 'Active';
        const plantedDate = batch.plantedDate ? new Date(batch.plantedDate).toLocaleDateString() : 'Unknown';
        
        tooltip.innerHTML = `
            <strong>🌱 ${cropName}</strong><br>
            Bed: ${bed.name}<br>
            Plants: ${plantCount}<br>
            Area: ${batchArea.toFixed(1)} m²<br>
            Status: ${status}<br>
            Planted: ${plantedDate}<br>
            <em>Click for actions</em>
        `;
        
        // Position tooltip using clientX/clientY for fixed positioning
        const padding = 10;
        let left = event.clientX + padding;
        let top = event.clientY - tooltip.offsetHeight - padding;
        
        // Adjust position if tooltip would go off screen
        if (left + tooltip.offsetWidth > window.innerWidth) {
            left = event.clientX - tooltip.offsetWidth - padding;
        }
        if (top < 0) {
            top = event.clientY + padding;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;
        
        // Add a failsafe timeout to auto-remove tooltip after 5 seconds
        setTimeout(() => {
            if (this.activeTooltip === tooltip) {
                this.hideLayoutTooltip();
            }
        }, 5000);
    }
    
    /**
     * Show batch modal for actions (move, harvest, etc.)
     */
    showBatchModal(batch, bed) {
        // Hide any tooltips first
        this.hideLayoutTooltip();
        
        // Use the existing modal manager to show batch modal
        if (this.app && this.app.modalManager && this.app.modalManager.showBatchModal) {
            this.app.modalManager.showBatchModal(batch, bed);
        } else {
            console.warn('Modal manager not available for batch modal');
        }
    }
    
    /**
     * Destroy component and cleanup resources
     */
    destroy() {
        console.log('🧹 Destroying Farm Layout Renderer component');
        this.hideLayoutTooltip();
    }
}

// Export both class and create a factory function
export default FarmLayoutRendererComponent;

/**
 * Factory function to create farm layout renderer component
 */
export function createFarmLayoutRendererComponent(app) {
    return new FarmLayoutRendererComponent(app);
}