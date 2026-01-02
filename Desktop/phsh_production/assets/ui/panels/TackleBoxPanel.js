class TackleBoxPanel {
    constructor() {
        this.container = null;
        this.tackleBoxOpen = false;
        this.tackleBoxElement = null;
        this.currentTab = 'rods';
        this.cachedInventory = null;
        this.selectedItem = null;
        
        // Mobile detection will be done via hytopia.isMobile when needed
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[TackleBoxPanel] Main UI container with ID '${containerId}' not found.`);
            return;
        }

        this.createTackleBoxUI();
        this.addStyles();
        this.setupEventListeners();
        
        // Listen for inventory updates
        hytopia.onData((data) => {
            if (data.type === 'inventoryUpdate') {
                this.cachedInventory = data.inventory;
                if (this.tackleBoxOpen) {
                    this.updateContent();
                }
            }
        });

        // Listen for 'e' key to toggle
        document.addEventListener('keydown', (e) => {
            if (this.isInputElementActive()) return;
            if (window.MerchantPanel?.isMerchantDialogOpen) return;
            
            if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.tackleBoxOpen) {
                e.preventDefault();
                this.toggle(false);
            }
        });
    }

    createTackleBoxUI() {
        this.tackleBoxElement = document.createElement('div');
        this.tackleBoxElement.id = 'tacklebox-ui';
        this.tackleBoxElement.className = 'tacklebox-overlay';
        this.tackleBoxElement.style.display = 'none';

        this.tackleBoxElement.innerHTML = `
            <div class="tacklebox-container">
                <!-- Header Section -->
                <div class="tacklebox-header">
                    <div class="tacklebox-info">
                        <div class="tacklebox-icon">🎣</div>
                        <div class="tacklebox-details">
                            <div class="tacklebox-name">Tackle Box</div>
                            <div class="tacklebox-subtitle">Fishing Equipment & Gear</div>
                        </div>
                    </div>
                    <button class="tacklebox-close">×</button>
                </div>

                <!-- Main Content Area -->
                <div class="tacklebox-content">
                    <!-- Left Navigation Tabs -->
                    <div class="tacklebox-nav">
                        <button class="tacklebox-tab active" data-tab="rods" title="Rods">
                            <img src="" alt="Rods" class="tab-sprite" data-sprite="oak_rod_sprite.png">
                        </button>
                        <button class="tacklebox-tab" data-tab="bait" title="Bait">
                            <img src="" alt="Bait" class="tab-sprite" data-sprite="worm_sprite.png">
                        </button>
                        <button class="tacklebox-tab" data-tab="fish" title="Fish">
                            <img src="" alt="Fish" class="tab-sprite" data-sprite="icon_fish.png">
                        </button>
                        <button class="tacklebox-tab" data-tab="items" title="Items">
                            <img src="" alt="Items" class="tab-sprite" data-sprite="dritwood_sprite.png">
                        </button>
                    </div>

                    <!-- Main Grid Container -->
                    <div class="tacklebox-main">
                        <div class="tacklebox-grid-container">
                            <div class="tacklebox-grid" id="tacklebox-grid">
                                <!-- Items will be populated here -->
                            </div>
                        </div>

                        <!-- Right Panel for Item Details -->
                        <div class="tacklebox-right-panel">
                            <div class="tacklebox-panel-content" id="tacklebox-panel-content">
                                <div class="tacklebox-panel-placeholder">
                                    Select an item to view details and actions
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.tackleBoxElement);
        
        // Load tab sprites after UI is created
        this.loadTabSprites();
    }

    loadTabSprites() {
        const sprites = this.tackleBoxElement.querySelectorAll('.tab-sprite[data-sprite]');
        const baseUrl = this.getAssetBaseUrl();
        
        sprites.forEach(sprite => {
            const spriteName = sprite.getAttribute('data-sprite');
            sprite.src = `${baseUrl}/ui/icons/${spriteName}`;
        });
    }

    isInputElementActive() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable === true ||
            activeElement.closest('#chat-input')
        );
    }

    toggle(forceState) {
        if (!this.tackleBoxElement) {
            console.error('[TackleBoxPanel] No tackleBoxElement found!');
            return;
        }

        this.tackleBoxOpen = typeof forceState === 'boolean' ? forceState : !this.tackleBoxOpen;

        if (this.tackleBoxOpen) {
            
            // Apply mobile styles if needed
            if (hytopia.isMobile) {
                this.applyMobileStyles();
                this.hideMobileControls();
            }
            
            // Always start with rods tab when opening
            this.currentTab = 'rods';
            this.switchTab('rods');
            
            this.tackleBoxElement.style.display = 'flex';
            hytopia.sendData({ type: 'disablePlayerInput' });
            hytopia.sendData({ type: 'requestInventory' });
            
            if (this.cachedInventory) {
                this.updateContent();
            }
        } else {
            
            // Restore mobile controls if needed
            if (hytopia.isMobile) {
                this.showMobileControls();
                this.restoreDesktopStyles();
            }
            
            this.tackleBoxElement.style.display = 'none';
            hytopia.sendData({ type: 'enablePlayerInput' });
            this.clearSelection();
        }
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tacklebox-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        this.currentTab = tabName;
        this.clearSelection();
        this.populateGrid();
        this.autoSelectEquippedItem();
        this.updateRightPanel();
    }

    updateContent() {
        if (!this.tackleBoxOpen || !this.cachedInventory) return;
        this.populateGrid();
        this.autoSelectEquippedItem();
        this.updateRightPanel();
    }

    populateGrid() {
        const grid = document.getElementById('tacklebox-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (!this.cachedInventory || !this.cachedInventory.items) {
            for (let i = 0; i < 18; i++) {
                const emptySlot = this.createEmptySlot();
                grid.appendChild(emptySlot);
            }
            return;
        }
        
        let items = [];
        
        switch (this.currentTab) {
            case 'rods':
                items = this.cachedInventory.items.filter(item => item.type === 'rod');
                break;
            case 'bait':
                items = this.cachedInventory.items.filter(item => item.type === 'bait');
                break;
            case 'fish':
                items = this.cachedInventory.items.filter(item => item.type === 'fish');
                break;
            case 'items':
                items = this.cachedInventory.items.filter(item => 
                    !['rod', 'bait', 'fish'].includes(item.type));
                break;

        }

        items.forEach((item, index) => {
            const slot = this.createItemSlot(item, index);
            grid.appendChild(slot);
        });

        const minSlots = Math.max(18, Math.ceil(items.length / 6) * 6);
        for (let i = items.length; i < minSlots; i++) {
            const emptySlot = this.createEmptySlot();
            grid.appendChild(emptySlot);
        }
    }

    createItemSlot(item, index) {
        const slot = document.createElement('div');
        slot.className = `tacklebox-slot ${item.equipped ? 'equipped' : ''}`;
        slot.dataset.itemId = item.id;
        slot.dataset.itemIndex = index;
        
        const content = document.createElement('div');
        content.className = 'tacklebox-slot-content';
        
        // Special handling for fish (text-based like InventoryPanel)
        if (item.type === 'fish') {
            // Style the slot for text content
            slot.style.height = 'auto';
            slot.style.minHeight = 'var(--tacklebox-slot-size)';
            slot.style.padding = '4px 3px';
            slot.style.display = 'flex';
            slot.style.flexDirection = 'column';
            slot.style.justifyContent = 'space-between';
            slot.style.alignItems = 'center';
            
            // Style the content container for vertical stacking
            content.style.display = 'flex';
            content.style.flexDirection = 'column';
            content.style.justifyContent = 'space-between';
            content.style.alignItems = 'center';
            content.style.height = '100%';
            content.style.width = '100%';
            
            // Get trophy status if available
            const trophyStatus = this.getTrophyStatus(item);
            const trophyDisplay = this.getTrophyDisplay(trophyStatus);
            
            // Calculate dynamic font size based on name length (slightly smaller on mobile)
            const nameLength = item.name.length;
            const isMobile = hytopia.isMobile;
            let fontSize = isMobile ? '9px' : '10px';
            if (nameLength > 12) fontSize = isMobile ? '7px' : '8px';
            else if (nameLength > 8) fontSize = isMobile ? '8px' : '9px';
            
            content.innerHTML = `
                <div class="fish-name" style="
                    font-size: ${fontSize}; 
                    text-align: center; 
                    width: 100%; 
                    max-width: 100%;
                    line-height: 1.1;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: ${this.getRarityColor(item.rarity)}; 
                    font-weight: ${item.equipped ? 'bold' : 'normal'}; 
                    margin-bottom: ${trophyDisplay ? '2px' : '4px'};
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                ">${item.name}</div>
                ${trophyDisplay}
                <div class="fish-value" style="
                    font-size: 8px; 
                    color: #facc15; 
                    text-align: center;
                    margin-top: 2px;
                ">${item.value} coins</div>
            `;
            
            // Add equipped checkmark for fish
            if (item.equipped) {
                const equippedMark = document.createElement('div');
                equippedMark.style.position = 'absolute';
                equippedMark.style.top = '3px';
                equippedMark.style.right = '3px';
                equippedMark.style.fontSize = '10px';
                equippedMark.style.color = '#4a90e2';
                equippedMark.textContent = '✓';
                content.appendChild(equippedMark);
            }
        } else {
            // Regular icon-based display for rods, bait, items
        const icon = document.createElement('img');
        icon.src = this.getIconPath(item);
        icon.alt = item.name;
        icon.className = 'tacklebox-item-icon';
        content.appendChild(icon);
        
        // Quantity badge
        if (item.quantity > 1) {
            const quantity = document.createElement('div');
            quantity.className = 'tacklebox-slot-quantity';
            quantity.textContent = item.quantity.toLocaleString();
            content.appendChild(quantity);
        }

        // Equipped indicator
        if (item.equipped) {
            const equipped = document.createElement('div');
            equipped.className = 'tacklebox-equipped-indicator';
            equipped.textContent = '⚡';
            content.appendChild(equipped);
            }
        }
        
        slot.appendChild(content);
        
        // Add interaction handlers (mobile-aware)
        this.setupSlotInteraction(slot, item, index);
        
        return slot;
    }

    createEmptySlot() {
        const slot = document.createElement('div');
        slot.className = 'tacklebox-slot tacklebox-slot-empty';
        
        const content = document.createElement('div');
        content.className = 'tacklebox-slot-content';
        slot.appendChild(content);
        
        return slot;
    }

        setupSlotInteraction(slot, item, index) {
        if (hytopia.isMobile) {
            // Mobile touch handling - don't prevent default to allow scrolling
            let touchStartTime = 0;
            let hasMoved = false;
            let startPos = { x: 0, y: 0 };
            let isScrolling = false;
            
            slot.addEventListener('touchstart', (e) => {
                // Don't prevent default - allow natural scrolling
                touchStartTime = Date.now();
                hasMoved = false;
                isScrolling = false;
                startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                
                // Light visual feedback
                slot.style.transform = 'scale(0.98)';
                slot.style.opacity = '0.9';
            }, { passive: true });
            
            slot.addEventListener('touchmove', (e) => {
                const moveDistance = Math.sqrt(
                    Math.pow(e.touches[0].clientX - startPos.x, 2) +
                    Math.pow(e.touches[0].clientY - startPos.y, 2)
                );
                
                // If user moved more than 15px, consider it scrolling
                if (moveDistance > 15) {
                    hasMoved = true;
                    isScrolling = true;
                    slot.style.transform = '';
                    slot.style.opacity = '';
                }
            }, { passive: true });
            
            slot.addEventListener('touchend', (e) => {
                // Reset visual state
                slot.style.transform = '';
                slot.style.opacity = '';
                
                // Only select if it was a quick tap without scrolling
                const touchDuration = Date.now() - touchStartTime;
                
                if (!hasMoved && !isScrolling && touchDuration < 300) {
                    // Small delay to ensure we're not interfering with scroll
                    setTimeout(() => this.selectItem(item, index), 100);
        }
            }, { passive: true });
            
            slot.addEventListener('touchcancel', () => {
                slot.style.transform = '';
                slot.style.opacity = '';
            }, { passive: true });
        } else {
            // Desktop click handler
            slot.addEventListener('click', () => this.selectItem(item, index));
        }
    }

    selectItem(item, index) {
        // Clear previous selection
        document.querySelectorAll('.tacklebox-slot-selected').forEach(slot => {
            slot.classList.remove('tacklebox-slot-selected');
        });
        
        // Select new item
        const slot = document.querySelector(`[data-item-index="${index}"]`);
        if (slot) {
            slot.classList.add('tacklebox-slot-selected');
        }
        
        this.selectedItem = { ...item, index };
        
        // Auto-equip rods and bait when selected
        if (item.type === 'rod' || item.type === 'bait') {
            this.equipItem(item.id);
        }
        
        // Fish can be equipped/unequipped by clicking
        if (item.type === 'fish') {
            this.equipItem(item.id);
        }
        
        this.updateRightPanel();
    }

    autoSelectEquippedItem() {
        if (!this.cachedInventory || !this.cachedInventory.items) return;
        
        // Find the equipped item for the current tab
        let equippedItem = null;
        let equippedIndex = -1;
        
        // Get items for current tab
        let items = [];
        switch (this.currentTab) {
            case 'rods':
                items = this.cachedInventory.items.filter(item => item.type === 'rod');
                break;
            case 'bait':
                items = this.cachedInventory.items.filter(item => item.type === 'bait');
                break;
            case 'fish':
                items = this.cachedInventory.items.filter(item => item.type === 'fish');
                break;
            case 'items':
                items = this.cachedInventory.items.filter(item => 
                    !['rod', 'bait', 'fish'].includes(item.type));
                break;
        }
        
        // Find equipped item in the filtered list
        for (let i = 0; i < items.length; i++) {
            if (items[i].equipped) {
                equippedItem = items[i];
                equippedIndex = i;
                break;
            }
        }
        
        // If we found an equipped item, select it
        if (equippedItem && equippedIndex >= 0) {
            // Clear previous selection
            this.clearSelection();
            
            // Select the equipped item
            const slot = document.querySelector(`[data-item-index="${equippedIndex}"]`);
            if (slot) {
                slot.classList.add('tacklebox-slot-selected');
            }
            
            this.selectedItem = { ...equippedItem, index: equippedIndex };
        }
    }

    clearSelection() {
        document.querySelectorAll('.tacklebox-slot-selected').forEach(slot => {
            slot.classList.remove('tacklebox-slot-selected');
        });
        this.selectedItem = null;
        this.updateRightPanel();
    }

    updateRightPanel() {
        const panel = document.getElementById('tacklebox-panel-content');
        if (!panel) return;
        
        if (!this.selectedItem) {
            panel.innerHTML = `
                <div class="tacklebox-panel-placeholder">
                    Select an item to view details and actions
                </div>
            `;
            return;
        }
        
        const item = this.selectedItem;
        
        // Generate detailed item information based on type
        let detailsHTML = '';
        
        if (item.type === 'rod') {
            detailsHTML = this.generateRodDetails(item);
        } else if (item.type === 'bait') {
            detailsHTML = this.generateBaitDetails(item);
        } else if (item.type === 'fish') {
            detailsHTML = this.generateFishDetails(item);
        } else {
            detailsHTML = this.generateItemDetails(item);
        }
        
        panel.innerHTML = `
            <div class="tacklebox-item-details">
                <div class="tacklebox-item-header-compact">
                    ${item.type !== 'fish' ? `<img src="${this.getIconPath(item)}" alt="${item.name}" class="tacklebox-detail-icon-compact">` : ''}
                    <div class="tacklebox-item-info">
                        <div class="tacklebox-item-name-compact">${item.name}</div>
                        <div class="tacklebox-item-type">${this.getItemTypeDisplay(item)}</div>
                    </div>
                </div>
                
                ${detailsHTML}
                
                <div class="tacklebox-item-actions">
            ${item.type === 'chest' ? this.generateChestActions(item) : (item.id && item.id.includes('ore')) ? this.generateOreActions(item) : ''}
                    </div>
                </div>
            `;
        }
        
    generateRodDetails(rod) {
        if (!rod.metadata || !rod.metadata.rodStats) {
            return `<div class="tacklebox-stats-compact">No detailed stats available</div>`;
        }

        const stats = rod.metadata.rodStats;
        const catchSpeed = stats.catchSpeed ?? 1;
        const drag = stats.drag ?? 1;
        const catchZone = stats.catchZone ?? 1;
        const lootScore = stats.lootScore ?? 1;
        const maxDistance = stats.maxDistance || 0;
        const maxWeight = stats.maxCatchWeight || 0;
        const luck = stats.luck || 0;

        // Check for enchantments
        const enchantments = rod.metadata?.enchantments || [];
        const enchantmentHTML = enchantments.length > 0 ? `
            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Enchantments:</div>
                ${enchantments.map(ench => `
                    <div class="tacklebox-enchantment" style="color: #FFD700; font-weight: bold; font-size: 11px; margin-bottom: 2px;">
                        [${ench.name}]
                </div>
                    <div class="tacklebox-enchantment-desc" style="color: #B8860B; font-size: 10px; font-style: italic; margin-bottom: 4px;">
                        ${ench.description}
                </div>
                `).join('')}
                </div>
        ` : '';

        return `
            ${enchantmentHTML}
            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Core Stats:</div>
                <div class="tacklebox-stat-compact">Luck: ${this.formatStatPercent(luck)}</div>
                <div class="tacklebox-stat-compact">Range: <span style="color: #ff9800;">${maxDistance}m</span></div>
                <div class="tacklebox-stat-compact">Max Weight: <span style="color: #9c27b0;">${maxWeight}lb</span></div>
                </div>

            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Attribute Boosts:</div>
                <div class="tacklebox-stat-compact">Catch Speed: ${this.formatStatPercent(catchSpeed)}</div>
                <div class="tacklebox-stat-compact">Drag: ${this.formatStatPercent(drag)}</div>
                <div class="tacklebox-stat-compact">Catch Zone: ${this.formatStatPercent(catchZone)}</div>
                <div class="tacklebox-stat-compact">Loot Score: ${this.formatStatPercent(lootScore)}</div>
            </div>
        `;
    }

    generateBaitDetails(bait) {
        if (!bait.metadata || !bait.metadata.baitStats) {
            return `<div class="tacklebox-stats-compact">No detailed stats available</div>`;
        }

        const stats = bait.metadata.baitStats;
        
        // Check if any attribute boosts exist
        const hasBoosts = stats.drag !== 1 || stats.catchSpeed !== 1 || 
                         stats.catchZone !== 1 || stats.catchWeight !== 1;

        return `
            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Luck Stats:</div>
                <div class="tacklebox-stat-compact">Base Luck: ${this.formatStatPercent(stats.baseLuck)}</div>
                <div class="tacklebox-stat-compact">Species Luck: ${this.formatStatPercent(stats.speciesLuck)}</div>
                <div class="tacklebox-stat-compact">Loot Luck: ${this.formatStatPercent(stats.lootScore)}</div>
                </div>

            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Attribute Boosts:</div>
                ${hasBoosts ? `
                    <div class="tacklebox-stat-compact">Drag: ${this.formatStatPercent(stats.drag)}</div>
                    <div class="tacklebox-stat-compact">Catch Speed: ${this.formatStatPercent(stats.catchSpeed)}</div>
                    <div class="tacklebox-stat-compact">Catch Zone: ${this.formatStatPercent(stats.catchZone)}</div>
                    <div class="tacklebox-stat-compact">Catch Weight: ${this.formatStatPercent(stats.catchWeight)}</div>
                ` : `
                    <div class="tacklebox-stat-compact" style="color: #8a9cad;">None</div>
                `}
                </div>
        `;
    }

    generateFishDetails(fish) {
        const fishStats = fish.metadata?.fishStats;
        const value = fish.value || 0;
        const rarity = fish.rarity || 'common';
        
        // Determine what weight to display
        let displayWeight;
        if (fishStats?.hasBeenWeighed && fishStats?.weight) {
            // Fish has been officially weighed - show actual weight
            displayWeight = `${fishStats.weight}lb`;
        } else if (fishStats?.displayWeight) {
            // Show the display weight (should be "Not Weighed")
            displayWeight = fishStats.displayWeight;
        } else {
            // Fallback
            displayWeight = "Not Weighed";
        }

        return `
            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Fish Stats:</div>
                <div class="tacklebox-stat-compact">Rarity: <span style="color: ${this.getRarityColor(rarity)}">${rarity}</span></div>
                <div class="tacklebox-stat-compact">Weight: <span style="color: ${fishStats?.hasBeenWeighed ? '#4a90e2' : '#888'};">${displayWeight}</span></div>
                <div class="tacklebox-stat-compact">Value: <span style="color: #facc15;">${value} coins</span></div>
                ${fishStats?.hasBeenWeighed ? this.getWeighingStatusDisplay(fishStats) : '<div class="tacklebox-stat-compact" style="color: #888; font-size: 10px; font-style: italic;">Take to Collector for official weighing</div>'}
                </div>
        `;
        }

    generateItemDetails(item) {
        const rarity = item.rarity || 'common';
        // Check for description in multiple locations: direct description, lootStats, or baitStats
        const description = item.description 
            || item.metadata?.lootStats?.description 
            || item.metadata?.baitStats?.description 
            || 'No description available.';

        return `
            <div class="tacklebox-stats-compact">
                <div class="tacklebox-stats-title-compact">Item Info:</div>
                <div class="tacklebox-stat-compact">Rarity: <span style="color: ${this.getRarityColor(rarity)}">${rarity}</span></div>
                <div class="tacklebox-item-description">${description}</div>
            </div>
        `;
    }

    generateChestActions(item) {
        // Check if this is a quest chest by looking for quest-related indicators
        const isQuestChest = item.metadata?.sources?.includes('quest') || 
                            item.id?.includes('cartographer') || 
                            item.id?.includes('quest') ||
                            item.description?.toLowerCase().includes('quest') ||
                            item.description?.toLowerCase().includes('cartographer');
        
        if (isQuestChest) {
            return `
                <div class="tacklebox-quest-chest-notice" style="
                    padding: 10px;
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 6px;
                    text-align: center;
                    color: #FFC107;
                    font-size: 11px;
                    font-style: italic;
                ">
                    📜 Quest Treasure<br>
                    Turn in to quest giver to claim rewards
                </div>
            `;
        } else {
            return `
                <button class="tacklebox-action-btn chest" 
                        onclick="window.TackleBoxPanel.openChest('${item.id}')">
                    📦 Open Chest
                </button>
            `;
        }
    }

    generateOreActions(item) {
        return `
            <button class="tacklebox-action-btn ore" 
                    onclick="window.TackleBoxPanel.openOre('${item.id}')">
                ✨ Open Ore
            </button>
        `;
    }

    formatStatPercent(statValue) {
        let value = Number(statValue);
        if (isNaN(value)) value = 1;
        let percent = Math.round((value - 1) * 100);
        if (percent === 0) {
            return `<span style='color:#aaa;'>0%</span>`;
        } else if (percent > 0) {
            return `<span style='color:#27ae60;'>+${percent}%</span>`;
        } else {
            return `<span style='color:#e74c3c;'>${percent}%</span>`;
        }
    }

    getRarityColor(rarity) {
        switch(rarity?.toLowerCase()) {
            case 'common': return '#9CA3AF';
            case 'uncommon': return '#22C55E';
            case 'rare': return '#3B82F6';
            case 'epic': return '#A855F7';
            case 'legendary': return '#F59E0B';
            case 'mythic': return '#EF4444';
            default: return '#9CA3AF';
        }
        }
        
    // Helper methods for fish display (copied from InventoryPanel)
    getTrophyStatus(fish) {
        // Check if fish has trophy metadata (will be sent from server)
        if (fish.metadata && fish.metadata.fishStats && fish.metadata.fishStats.trophyStatus) {
            return fish.metadata.fishStats.trophyStatus;
        }
        return null; // No trophy status
    }

    getTrophyDisplay(trophyStatus) {
        if (!trophyStatus) return '';
        
        const trophyMap = {
            'first': { emoji: '🥇', text: 'First', color: '#FFD700' },
            'second': { emoji: '🥈', text: 'Second', color: '#C0C0C0' },
            'third': { emoji: '🥉', text: 'Third', color: '#CD7F32' },
            'trophy': { emoji: '🏆', text: 'Trophy', color: '#FFA500' }
        };
        
        const trophy = trophyMap[trophyStatus.toLowerCase()];
        if (!trophy) return '';
        
        return `<div class="fish-trophy-status" style="font-size: 8px; text-align: center; color: ${trophy.color}; margin-bottom: 2px; font-weight: bold;">${trophy.emoji}</div>`;
    }

    getWeighingStatusDisplay(fishStats) {
        // Check if fish has a trophy status
        if (fishStats && fishStats.trophyStatus) {
            const trophyMap = {
                'first': { emoji: '🥇', text: '1st', color: '#FFD700' },
                'second': { emoji: '🥈', text: '2nd', color: '#C0C0C0' }, 
                'third': { emoji: '🥉', text: '3rd', color: '#CD7F32' },
                'trophy': { emoji: '🏆', text: 'Trophy', color: '#FFA500' }
            };
            
            const trophy = trophyMap[fishStats.trophyStatus.toLowerCase()];
            if (trophy) {
                // Use trophyType if available, otherwise default to "Species"
                const trophyTypeText = fishStats.trophyType === 'overall' ? 'Overall' : 'Species';
                return `<div class="tacklebox-stat-compact" style="color: ${trophy.color}; font-size: 10px; font-style: italic; font-weight: bold;">${trophy.emoji} ${trophy.text} (${trophyTypeText})</div>`;
            }
        }
        
        // Default to "Officially Weighed" if no trophy status
        return '<div class="tacklebox-stat-compact" style="color: #4CAF50; font-size: 10px; font-style: italic;">✓ Officially Weighed</div>';
    }

    getItemTypeDisplay(item) {
        // For rods and baits, show description if available, otherwise fallback to type
        if (item.type === 'rod' && item.description) {
            return item.description;
        } else if (item.type === 'bait' && item.metadata?.baitStats?.description) {
            return item.metadata.baitStats.description;
        } else if (item.type === 'rod') {
            return 'ROD';
        } else if (item.type === 'bait') {
            return 'BAIT';
        } else {
            // For other items, show type with quantity if > 1
            return `${item.type}${item.quantity > 1 ? ` (${item.quantity})` : ''}`;
        }
    }

    // Action methods
    equipItem(itemId) {
        hytopia.sendData({
            type: 'equipItem',
            itemId: itemId
        });
    }

    sellItem(itemId) {
        hytopia.sendData({
            type: 'sellItem',
            itemId: itemId
        });
        this.clearSelection();
    }

    openChest(itemId) {
        this.toggle(false);
        hytopia.sendData({
            type: 'openChest',
            chestId: itemId
        });
    }

    openOre(itemId) {
        this.toggle(false);
        hytopia.sendData({
            type: 'openOre',
            oreId: itemId
        });
    }

    getAssetBaseUrl() {
        // Check if we're in a Hytopia environment with CDN_ASSETS_URL available
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            return window.CDN_ASSETS_URL;
        }
        
        // Try to extract it from a script tag's src attribute
            const scriptTags = document.getElementsByTagName('script');
            for (let i = 0; i < scriptTags.length; i++) {
                const src = scriptTags[i].src;
                if (src && src.includes('/ui/panels/')) {
                const baseUrl = src.substring(0, src.indexOf('/ui/panels/'));
                return baseUrl;
            }
        }
        
        // Fallback to current origin
        return window.location.origin;
            }

    getIconPath(item) {
        const baseUrl = this.getAssetBaseUrl();

        if (item.sprite) {
            if (item.sprite.startsWith('/')) {
                return `${baseUrl}${item.sprite}`;
            } else {
                return `${baseUrl}/ui/icons/${item.sprite}`;
            }
        } else {
            let fallbackIcon = 'crate-icon.png';
            switch(item.type) {
                case 'rod': 
                    fallbackIcon = 'rod-icon.png'; 
                    break;
                case 'bait': 
                    fallbackIcon = 'worm_sprite.png'; 
                    break;
                case 'fish': 
                    fallbackIcon = 'mackerel_sprite.png'; 
                    break;
            }
            return `${baseUrl}/ui/icons/${fallbackIcon}`;
        }
    }

    setupEventListeners() {
        // Close button
        const closeButton = this.tackleBoxElement.querySelector('.tacklebox-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.toggle(false));
            
            // Mobile touch handling for close button
            if (hytopia.isMobile) {
                closeButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    closeButton.style.transform = 'scale(0.95)';
                });
                closeButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    closeButton.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        closeButton.style.transform = '';
                        this.toggle(false);
                    }, 100);
                });
            }
        }

        // Tab buttons
        const tabButtons = this.tackleBoxElement.querySelectorAll('.tacklebox-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
            
            // Mobile touch handling for tabs
            if (hytopia.isMobile) {
                this.setupMobileTabHandling(button);
            }
        });
        
        // Setup mobile-specific event handlers
        if (hytopia.isMobile) {
            this.setupMobileHandlers();
        }
    }

    setupMobileTabHandling(button) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.style.transform = 'scale(0.95)';
            button.style.opacity = '0.8';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.style.transform = '';
            button.style.opacity = '';
            
            const tabName = button.dataset.tab;
            setTimeout(() => this.switchTab(tabName), 50);
        });
        
        button.addEventListener('touchcancel', (e) => {
            button.style.transform = '';
            button.style.opacity = '';
        });
    }

    setupMobileHandlers() {
        // Prevent default touch behaviors that might interfere
        this.tackleBoxElement.addEventListener('touchmove', (e) => {
            // Allow scrolling within the grid, but prevent other touch moves
            if (!e.target.closest('.tacklebox-grid')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle mobile back button / escape gesture
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.tackleBoxOpen) {
                this.toggle(false);
            }
        });
    }

    applyMobileStyles() {
        if (!hytopia.isMobile) {
            return;
        }
        
        // Add mobile-specific styling class
        this.tackleBoxElement.classList.add('tacklebox-mobile');
        
        // Apply mobile styles directly via JavaScript like other panels
        const header = this.tackleBoxElement.querySelector('.tacklebox-header');
        const icon = this.tackleBoxElement.querySelector('.tacklebox-icon');
        const subtitle = this.tackleBoxElement.querySelector('.tacklebox-subtitle');
        const title = this.tackleBoxElement.querySelector('.tacklebox-name');
        const closeButton = this.tackleBoxElement.querySelector('.tacklebox-close');
        const nav = this.tackleBoxElement.querySelector('.tacklebox-nav');
        const main = this.tackleBoxElement.querySelector('.tacklebox-main');
        const grid = this.tackleBoxElement.querySelector('.tacklebox-grid');
        
        // Header optimizations
        if (header) {
            header.style.padding = '8px 12px';
            header.style.minHeight = 'auto';
        }
        
        // Hide icon and subtitle on mobile
        if (icon) {
            icon.style.display = 'none';
        }
        if (subtitle) {
            subtitle.style.display = 'none';
        }
        
        // Optimize title
        if (title) {
            title.style.fontSize = '14px';
        }
        
        // Optimize close button
        if (closeButton) {
            closeButton.style.width = '36px';
            closeButton.style.height = '36px';
            closeButton.style.fontSize = '20px';
            closeButton.style.minWidth = '36px';
            closeButton.style.minHeight = '36px';
        }
        
        // Optimize navigation
        if (nav) {
            nav.style.width = '70px';
        }
        
        // Optimize main content
        if (main) {
            main.style.padding = '12px';
            main.style.gap = '12px';
        }
        
        // Make grid scrollable with momentum for mobile
        if (grid) {
            grid.style.webkitOverflowScrolling = 'touch';
            grid.style.overscrollBehavior = 'contain';
        }
    }

    restoreDesktopStyles() {
        // Reset any inline styles that might interfere with desktop layout
        const header = this.tackleBoxElement.querySelector('.tacklebox-header');
        const icon = this.tackleBoxElement.querySelector('.tacklebox-icon');
        const subtitle = this.tackleBoxElement.querySelector('.tacklebox-subtitle');
        const title = this.tackleBoxElement.querySelector('.tacklebox-name');
        const closeButton = this.tackleBoxElement.querySelector('.tacklebox-close');
        const nav = this.tackleBoxElement.querySelector('.tacklebox-nav');
        const main = this.tackleBoxElement.querySelector('.tacklebox-main');
        const grid = this.tackleBoxElement.querySelector('.tacklebox-grid');
        
        // Only restore if not on mobile
        if (!hytopia.isMobile) {
            if (header) header.style.cssText = '';
            if (icon) icon.style.cssText = '';
            if (subtitle) subtitle.style.cssText = '';
            if (title) title.style.cssText = '';
            if (closeButton) closeButton.style.cssText = '';
            if (nav) nav.style.cssText = '';
            if (main) main.style.cssText = '';
            if (grid) {
                grid.style.cssText = '';
                grid.style.webkitOverflowScrolling = 'touch';
                grid.style.overscrollBehavior = 'contain';
            }
        }
    }

    hideMobileControls() {
        // Hide any mobile UI elements that might interfere
        const mobileElements = [
            '#mobile-controls',
            '.mobile-ui-overlay',
            '.mobile-toolbar'
        ];
        
        mobileElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    showMobileControls() {
        // Restore mobile UI elements
        const mobileElements = [
            '#mobile-controls',
            '.mobile-ui-overlay', 
            '.mobile-toolbar'
        ];
        
        mobileElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = '';
            }
        });
    }

    addStyles() {
        let style = document.getElementById('tacklebox-modern-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'tacklebox-modern-styles';
            document.head.appendChild(style);
        }

        style.textContent = `
            :root {
                --tacklebox-slot-size: 56px;
                --tacklebox-icon-size: 48px;
                --tacklebox-gap: 6px;
                --tacklebox-padding: 12px;
                --tacklebox-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                
                /* Hytopia-inspired color palette */
                --tacklebox-bg-primary: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                --tacklebox-bg-secondary: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                --tacklebox-bg-tertiary: rgba(0, 0, 0, 0.6);
                --tacklebox-border: #444;
                --tacklebox-border-light: #555;
                --tacklebox-border-active: #4CAF50;
                --tacklebox-text: #ffffff;
                --tacklebox-text-muted: #cccccc;
                --tacklebox-text-dim: #888;
                --tacklebox-overlay: rgba(0, 0, 0, 0.3);
                --tacklebox-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
                --tacklebox-shadow-inset: inset 0 2px 8px rgba(0, 0, 0, 0.5);
                --tacklebox-hover: rgba(255, 255, 255, 0.1);
            }

            .tacklebox-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                font-family: var(--tacklebox-font);
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }

            .tacklebox-container {
                background: var(--tacklebox-bg-primary);
                border: 2px solid var(--tacklebox-border);
                border-radius: 12px;
                box-shadow: var(--tacklebox-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                width: 850px;
                height: 500px;
                max-width: 90vw;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            /* Header */
            .tacklebox-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: var(--tacklebox-bg-secondary);
                border-bottom: 1px solid var(--tacklebox-border);
            }

            .tacklebox-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .tacklebox-icon {
                width: 48px;
                height: 48px;
                background: var(--tacklebox-bg-tertiary);
                border: 2px solid var(--tacklebox-border);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
            }

            .tacklebox-details {
                display: flex;
                flex-direction: column;
            }

            .tacklebox-name {
                font-size: 16px;
                font-weight: 600;
                color: var(--tacklebox-text);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                line-height: 1;
            }

            .tacklebox-subtitle {
                font-size: 14px;
                font-weight: 500;
                color: var(--tacklebox-text-muted);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                margin-top: 2px;
                letter-spacing: 0.3px;
            }

            .tacklebox-close {
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 6px;
                color: #ff6b6b;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }

            .tacklebox-close:hover {
                background: rgba(255, 0, 0, 0.3);
                transform: scale(1.05);
            }

            /* Content Area */
            .tacklebox-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            /* Navigation Tabs */
            .tacklebox-nav {
                width: 80px;
                background: var(--tacklebox-bg-secondary);
                border-right: 1px solid var(--tacklebox-border);
                display: flex;
                flex-direction: column;
                padding: 8px;
                gap: 4px;
            }

            .tacklebox-tab {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                -webkit-tap-highlight-color: transparent;
                width: 64px;
                height: 64px;
            }

            .tacklebox-tab:hover {
                background: var(--tacklebox-hover);
                border-color: var(--tacklebox-border-light);
            }

            .tacklebox-tab.active {
                background: var(--tacklebox-bg-tertiary);
                border-color: var(--tacklebox-border-active);
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
            }

            .tab-sprite {
                width: 40px;
                height: 40px;
                object-fit: contain;
                image-rendering: pixelated;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .tacklebox-tab:hover .tab-sprite,
            .tacklebox-tab.active .tab-sprite {
                opacity: 1;
            }

            /* Main Content */
            .tacklebox-main {
                flex: 1;
                display: flex;
                padding: 20px;
                gap: 20px;
                overflow: hidden;
            }

            .tacklebox-grid-container {
                flex: 2;
                min-width: 0;
                overflow-x: hidden; /* Prevent horizontal overflow */
            }

            .tacklebox-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                grid-auto-rows: max-content;
                gap: var(--tacklebox-gap);
                background: var(--tacklebox-overlay);
                padding: var(--tacklebox-padding);
                border: 1px solid var(--tacklebox-border);
                border-radius: 8px;
                box-shadow: var(--tacklebox-shadow-inset);
                max-height: 320px;
                overflow-y: auto;
                overflow-x: hidden; /* Prevent horizontal overflow */
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                align-content: start;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }

            /* Item Slots */
            .tacklebox-slot {
                width: var(--tacklebox-slot-size);
                height: var(--tacklebox-slot-size);
                background: var(--tacklebox-bg-tertiary);
                border: 2px solid #333;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.7);
                transition: all 0.2s ease;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                max-width: 100%; /* Prevent overflow */
                overflow: hidden; /* Prevent content from overflowing */
                box-sizing: border-box; /* Include border in width calculation */
            }

            .tacklebox-slot:hover {
                border-color: var(--tacklebox-border-light);
                background: rgba(0, 0, 0, 0.8);
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5);
                transform: translateY(-1px);
            }

            .tacklebox-slot-selected {
                border-color: var(--tacklebox-border-active) !important;
                background: rgba(76, 175, 80, 0.1) !important;
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3) !important;
            }

            .tacklebox-slot-empty {
                opacity: 0.3;
                cursor: default;
            }

            .tacklebox-slot-empty:hover {
                transform: none;
                border-color: #333;
                background: var(--tacklebox-bg-tertiary);
            }

            .tacklebox-slot-content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                max-width: 100%; /* Prevent overflow */
                overflow: hidden; /* Prevent content from overflowing */
                box-sizing: border-box;
            }

            .tacklebox-item-icon {
                width: var(--tacklebox-icon-size);
                height: var(--tacklebox-icon-size);
                object-fit: contain;
                image-rendering: pixelated;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
                pointer-events: none;
            }

            .tacklebox-slot-quantity {
                position: absolute;
                bottom: 2px;
                right: 2px;
                background: rgba(0, 0, 0, 0.8);
                color: var(--tacklebox-text);
                font-weight: 700;
                font-size: 9px;
                padding: 1px 3px;
                border-radius: 3px;
                line-height: 1;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 10px;
                text-align: center;
                pointer-events: none;
            }

            .tacklebox-equipped-indicator {
                position: absolute;
                top: 2px;
                left: 2px;
                color: #4CAF50;
                font-size: 12px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                pointer-events: none;
            }

            /* Equipped Items Highlighting */
            .tacklebox-slot.equipped {
                border-color: var(--tacklebox-border-active) !important;
                background: rgba(76, 175, 80, 0.1) !important;
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3) !important;
            }

            /* Right Panel */
            .tacklebox-right-panel {
                flex: 1;
                background: var(--tacklebox-overlay);
                border: 1px solid var(--tacklebox-border);
                border-radius: 8px;
                padding: var(--tacklebox-padding);
                overflow-y: auto;
                display: flex;
                align-items: flex-start;
                justify-content: flex-start;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                min-height: 0;
            }

            .tacklebox-panel-content {
                width: 100%;
                height: auto;
                flex: 1;
            }

            .tacklebox-panel-placeholder {
                color: var(--tacklebox-text-dim);
                font-size: 14px;
                text-align: center;
                line-height: 1.5;
                padding: 60px 20px;
                display: block;
            }

            /* Item Details - Compact Layout */
            .tacklebox-item-details {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 12px;
                color: var(--tacklebox-text);
                min-height: fit-content;
            }

            .tacklebox-item-header-compact {
                display: flex;
                align-items: center;
                gap: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--tacklebox-border);
            }

            .tacklebox-detail-icon-compact {
                width: 32px;
                height: 32px;
                object-fit: contain;
                image-rendering: pixelated;
                border-radius: 3px;
                background: rgba(0, 0, 0, 0.4);
                padding: 2px;
                flex-shrink: 0;
            }

            .tacklebox-item-info {
                flex: 1;
                min-width: 0;
            }

            .tacklebox-item-name-compact {
                font-size: 14px;
                font-weight: 600;
                color: var(--tacklebox-text);
                line-height: 1.2;
            }

            .tacklebox-item-type {
                font-size: 11px;
                color: var(--tacklebox-text-muted);
                line-height: 1.3;
                margin-top: 2px;
                font-style: italic;
            }

            .tacklebox-stats-compact {
                background: rgba(0, 0, 0, 0.3);
                padding: 10px;
                border-radius: 6px;
                border: 1px solid var(--tacklebox-border);
                margin-bottom: 8px;
            }

            .tacklebox-stats-title-compact {
                font-size: 11px;
                font-weight: 600;
                color: #4a90e2;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }

            .tacklebox-stat-compact {
                font-size: 12px;
                margin-bottom: 4px;
                line-height: 1.3;
                color: var(--tacklebox-text);
            }

            .tacklebox-item-description {
                font-size: 11px;
                color: var(--tacklebox-text-muted);
                line-height: 1.3;
                margin-top: 6px;
                font-style: italic;
            }

            /* Action Buttons */
            .tacklebox-item-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
            }

            .tacklebox-action-btn {
                padding: 10px 16px;
                border: 1px solid;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                -webkit-tap-highlight-color: transparent;
            }

            .tacklebox-action-btn.equip {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.2);
                color: #4CAF50;
            }

            .tacklebox-action-btn.equip:hover {
                background: rgba(76, 175, 80, 0.3);
                color: #66BB6A;
            }

            .tacklebox-action-btn.sell {
                border-color: #FF9800;
                background: rgba(255, 152, 0, 0.2);
                color: #FF9800;
            }

            .tacklebox-action-btn.sell:hover {
                background: rgba(255, 152, 0, 0.3);
                color: #FFB74D;
            }

            .tacklebox-action-btn.chest {
                border-color: #9C27B0;
                background: rgba(156, 39, 176, 0.2);
                color: #9C27B0;
            }

            .tacklebox-action-btn.chest:hover {
                background: rgba(156, 39, 176, 0.3);
                color: #BA68C8;
            }

            /* Mobile-specific styles */
            @media (max-width: 768px) {
                .tacklebox-container {
                    width: 95vw;
                    height: 85vh;
            }

                /* Much smaller header on mobile */
                .tacklebox-header {
                    padding: 8px 12px;
                    min-height: auto;
            }

                /* Hide the fishing icon and subtitle on mobile */
                .tacklebox-icon,
                .tacklebox-subtitle {
                    display: none;
                }

                /* Keep just the title and close button */
                .tacklebox-name {
                    font-size: 14px;
            }

                .tacklebox-close {
                    width: 36px;
                    height: 36px;
                    font-size: 20px;
                    min-width: 36px;
                    min-height: 36px;
            }

                .tacklebox-nav {
                    width: 70px;
                }

                .tacklebox-tab {
                    width: 54px;
                    height: 54px;
                    padding: 7px;
                }

                .tab-sprite {
                    width: 32px;
                    height: 32px;
                }

                .tacklebox-main {
                    padding: 12px;
                    gap: 12px;
                }

                .tacklebox-grid-container {
                    flex: 2.2; /* Slightly more space for grid on mobile */
                    overflow-x: hidden; /* Prevent horizontal overflow */
                }

                .tacklebox-grid {
                    grid-template-columns: repeat(4, 1fr);
                    overflow-x: hidden; /* Prevent grid from overflowing horizontally */
                    width: 100%;
                    max-width: 100%;
                }

                .tacklebox-right-panel {
                    flex: 0.8; /* Slimmer right panel on mobile */
                    padding: 8px;
                    min-width: 0; /* Allow flex shrinking */
                    max-width: 35%; /* Cap right panel width */
                }
                
                /* Ensure fish slot text doesn't overflow */
                .tacklebox-slot {
                    max-width: 100%;
                    overflow: hidden;
                }
                
                .tacklebox-slot .fish-name {
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap; /* Prevent text wrapping that causes overflow */
                }

                .tacklebox-action-btn {
                    padding: 12px 16px;
                font-size: 13px;
                    min-height: 44px;
                }
            }

            .tacklebox-mobile .tacklebox-grid {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            }

            .tacklebox-mobile .tacklebox-slot {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            .tacklebox-mobile .tacklebox-tab {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            .tacklebox-mobile .tacklebox-action-btn {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                min-height: 48px;
            }

            .tacklebox-mobile .tacklebox-right-panel {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                touch-action: pan-y;
            }

            /* Enable scrolling for tacklebox panel content - matching quest panel pattern */
            body.mobile .tacklebox-panel-content * {
                touch-action: pan-y !important;
            }

            .tacklebox-mobile .tacklebox-panel-content {
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                touch-action: pan-y;
            }

            .tacklebox-mobile .tacklebox-close {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                min-width: 44px;
                min-height: 44px;
            }
        `;
    }
}

// Make it globally available and expose action methods
window.TackleBoxPanel = new TackleBoxPanel();

// Add a test method to check if everything is working
window.TackleBoxPanel.test = function() {
    this.toggle();
};