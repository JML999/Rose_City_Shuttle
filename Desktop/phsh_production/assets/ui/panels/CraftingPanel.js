// At the top of your CraftingPanel.js file, outside the class
let globalCraftingLock = false;
let globalCraftingTimeout = null;

class CraftingPanel {
    constructor() {
        this.container = null;
        this.craftingOpen = false;
        this.craftingSlots = [null, null, null, null]; // 4 input slots
        this.resultSlot = null;
        this.recipes = []; // Start with empty recipes, will be populated from server
        this.styleElement = null;
        this.lastMessageTimestamp = null;
        this._originalCraftingHTML = null;
        this._originalUpdateInventoryGrid = null;
        this._touchedItem = null;
        this._draggedItem = null;
        this.craftingType = 'default';
        this.lastInventory = null; // Store the latest inventory
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'crafting-ui';
        panel.innerHTML = `
            <div id="crafting-overlay">
                <div class="crafting-container">
                    <div class="crafting-header">
                        <h2>Crafting Station</h2>
                        <div class="close-button" id="crafting-close-button">×</div>
                    </div>
                    <div class="crafting-content">
                        <div class="crafting-grid">
                            <div class="crafting-inputs">
                                <div class="crafting-slot" data-slot="0"></div>
                                <div class="crafting-slot" data-slot="1"></div>
                                <div class="crafting-slot" data-slot="2"></div>
                                <div class="crafting-slot" data-slot="3"></div>
                            </div>
                            <div class="crafting-arrow">→</div>
                            <div class="crafting-result">
                                <div class="result-slot"></div>
                            </div>
                        </div>
                        <div class="crafting-inventory">
                            <h3>Inventory</h3>
                            <div class="inventory-grid" id="crafting-inventory-grid"></div>
                        </div>
                        <button id="craft-button" disabled>Craft</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);

        // Add CSS for the crafting panel
        const style = document.createElement('style');
        style.textContent = `
            #crafting-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: none;
                justify-content: center;
                align-items: center;
            }
            
            .crafting-container {
                width: 700px;
                background-color: #1a2633;
                border: 2px solid #4a90e2;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .crafting-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #0a1622;
                border-bottom: 1px solid #4a90e2;
            }
            
            .crafting-header h2 {
                margin: 0;
                color: #ffffff;
                font-size: 22px;
            }
            
            .crafting-content {
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .crafting-grid {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                padding: 20px;
                padding-bottom: 40px;
                background: rgba(10, 22, 34, 0.5);
                border-radius: 8px;
            }
            
            .crafting-inputs {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 10px;
            }
            
            .crafting-slot, .result-slot {
                width: 70px;
                height: 70px;
                background: rgba(0, 0, 0, 0.3);
                border: 2px solid #4a90e2;
                border-radius: 6px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .crafting-slot:hover {
                background: rgba(74, 144, 226, 0.1);
            }
            
            .crafting-slot.filled {
                background: rgba(74, 144, 226, 0.2);
            }
            
            .crafting-arrow {
                font-size: 32px;
                color: #4a90e2;
                margin: 0 10px;
            }
            
            .result-slot {
                width: 80px;
                height: 80px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #ffeb3b;
                border-radius: 4px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                transition: all 0.2s;
            }
            
            .crafting-cost {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 235, 59, 0.9);
                color: #1a2633;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                border: 1px solid #ffc107;
            }
            
            .crafting-inventory {
                background: rgba(10, 22, 34, 0.5);
                border-radius: 8px;
                padding: 15px;
            }
            
            .crafting-inventory h3 {
                color: #4a90e2;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
                border-bottom: 1px solid #4a90e2;
                padding-bottom: 5px;
            }
            
            .inventory-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 10px;
                max-height: 250px;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .inventory-item {
                width: 60px;
                height: 60px;
                background: rgba(0, 0, 0, 0.3);
                border: 2px solid #4a90e2;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                position: relative;
                cursor: pointer;
                transition: all 0.2s;
                padding: 5px;
            }
            
            .inventory-item:hover {
                background: rgba(74, 144, 226, 0.1);
                transform: translateY(-2px);
            }
            
            .inventory-item .item-name {
                font-size: 10px;
                color: white;
                text-align: center;
                margin-top: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            
            .inventory-item .item-icon {
                width: 32px;
                height: 32px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .inventory-item .item-quantity {
                position: absolute;
                bottom: 2px;
                right: 2px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 4px;
            }
            
            .item-in-slot {
                width: 80%;
                height: 80%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .item-in-slot .item-icon {
                width: 32px;
                height: 32px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .item-in-slot .item-name {
                font-size: 9px;
                color: white;
                text-align: center;
                margin-top: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            
            #craft-button {
                background-color: #4a90e2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.2s;
                align-self: center;
            }
            
            #craft-button:hover:not(:disabled) {
                background-color: #3a7bc8;
            }
            
            #craft-button:disabled {
                background-color: #2a3b4d;
                cursor: not-allowed;
            }
            
            .common { color: #ffffff; }
            .uncommon { color: #4caf50; }
            .rare { color: #2196f3; }
            .epic { color: #9c27b0; }
            .legendary { color: #ff9800; }
            
            /* Animation for crafting */
            @keyframes craftingGlow {
                0% { box-shadow: 0 0 5px #4a90e2; }
                50% { box-shadow: 0 0 20px #4a90e2; }
                100% { box-shadow: 0 0 5px #4a90e2; }
            }
            
            .crafting-animation {
                animation: craftingGlow 1.5s infinite;
            }
            
            .crafting-message {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 100;
                animation: message-slide-in 0.3s ease-out;
            }
            
            .crafting-message.success {
                background-color: rgba(46, 125, 50, 0.9);
                border: 1px solid #4CAF50;
            }
            
            .crafting-message.error {
                background-color: rgba(183, 28, 28, 0.9);
                border: 1px solid #F44336;
            }
            
            .message-icon {
                font-size: 24px;
                font-weight: bold;
            }
            
            .message-text {
                font-size: 16px;
                font-weight: 500;
                color: white;
            }
            
            .crafting-message.fade-out {
                opacity: 0;
                transition: opacity 0.5s ease-out;
            }
            
            @keyframes message-slide-in {
                from {
                    transform: translateX(-50%) translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);

        // Set up event listeners
        this.setupEventListeners();
        
        // Hide crafting menu initially
        document.getElementById('crafting-overlay').style.display = 'none';

        // Set up message handling
        hytopia.onData((data) => {
            if (data.type === 'inventoryUpdate') {
                this.lastInventory = data.inventory; // Store latest inventory
                this.updateInventoryGrid(data.inventory);
            } else if (data.type === 'craftingResult') {
                // Only handle the result for UI updates if suppressMessage is true
                if (data.suppressMessage) {
                    // Just update the UI without showing a message
                    setTimeout(() => {
                        // Ensure animations are cleared
                        const craftingSlots = document.querySelectorAll('.crafting-slot.filled');
                        craftingSlots.forEach(slot => {
                            slot.classList.remove('crafting-animation');
                        });
                        
                        // Clear slots after crafting
                        this.clearCraftingSlots();
                        
                        // Request updated inventory
                        hytopia.sendData({ type: 'requestInventory' });
                    }, 500);
                } else {
                    // Show the normal message
                    this.handleCraftingResult(data.success, data.result);
                }
            } else if (data.type === 'craftingRecipes') {
                this.recipes = data.recipes;
            } else if (data.type === 'openForge') {
                this.craftingType = 'forge';
                this.toggleCraftingMenu(true);
                if (this.lastInventory) {
                    this.updateInventoryGrid(this.lastInventory);
                }
                hytopia.sendData({ type: 'requestInventory' });
                hytopia.sendData({ type: 'requestCraftingRecipes' });
            } else if (data.type === 'craftingMessage') {
                this.displayCraftingMessage(data.messageType, data.message);
            }
        });

        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.craftingOpen) {
                this.toggleCraftingMenu(false);
            }
        });

        // Apply dynamic icon styles
        this.applyIconStyles();

        // After the panel is created and filled with content, optimize for mobile
        if (hytopia.isMobile) {
            setTimeout(() => {
                this.optimizeCraftingPanelForMobile();
            }, 100); // Small delay to ensure DOM is fully rendered
        }
    }

    setupEventListeners() {
        // Close button
        document.getElementById('crafting-close-button').addEventListener('click', () => {
            this.toggleCraftingMenu(false);
        });

        // Crafting slots
        document.querySelectorAll('.crafting-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotIndex = parseInt(e.currentTarget.dataset.slot);
                if (this.craftingSlots[slotIndex]) {
                    // Remove item from slot
                    this.removeItemFromSlot(slotIndex);
                }
            });
        });

        // Craft button with enhanced spam protection
        document.getElementById('craft-button').addEventListener('click', () => {
            // Check global crafting lock
            if (globalCraftingLock) {
                return;
            }

            // Set global lock immediately
            globalCraftingLock = true;
            
            // Attempt crafting
            this.attemptCrafting();
            
            // Set a timeout to unlock crafting after a significant delay
            if (globalCraftingTimeout) {
                clearTimeout(globalCraftingTimeout);
            }
            
            globalCraftingTimeout = setTimeout(() => {
                globalCraftingLock = false;
            }, 3000); // 3 second lockout
        });
    }

    toggleCraftingMenu(force) {
        const overlay = document.getElementById('crafting-overlay');
        this.craftingOpen = force !== undefined ? force : !this.craftingOpen;
        
        if (this.craftingOpen) {
            overlay.style.display = 'flex';
            hytopia.sendData({ type: 'disablePlayerInput' });
            this.addHideChatStyle();
            
            // Hide mobile controls when crafting is open
            if (hytopia.isMobile) {
                this.hideMobileControls();
            }
            
            // Request inventory data and recipes
            hytopia.sendData({ type: 'requestInventory' });
            hytopia.sendData({ type: 'requestCraftingRecipes' });
        } else {
            overlay.style.display = 'none';
            hytopia.sendData({ type: 'enablePlayerInput' });
            this.removeHideChatStyle();
            
            // Show mobile controls when crafting is closed
            if (hytopia.isMobile) {
                this.showMobileControls();
            }
            
            // Clear slots after crafting
            this.clearCraftingSlots();
            
            // Explicitly reset global crafting lock when menu closes
            globalCraftingLock = false;
            if (globalCraftingTimeout) {
                clearTimeout(globalCraftingTimeout);
                globalCraftingTimeout = null;
            }
        }
    }

    getAssetBaseUrl() {
        // Check if we're in a Hytopia environment with CDN_ASSETS_URL available in the global scope
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            return window.CDN_ASSETS_URL;
        }
        
        // For local development or when CDN_ASSETS_URL isn't available as a global
        // Try to extract it from a script tag's src attribute
        const scriptTags = document.getElementsByTagName('script');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].src;
            if (src && src.includes('/ui/panels/')) {
                // Extract the base URL up to /ui/panels/
                const baseUrl = src.substring(0, src.indexOf('/ui/panels/'));
                return baseUrl;
            }
        }
        
        // If we can't determine it from script tags, use the current origin
        return window.location.origin;
    }

    updateInventoryGrid(inventory) {
        const baseUrl = this.getAssetBaseUrl();
        const grid = document.getElementById('crafting-inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';
        let craftableItems;
        if (this.craftingType === 'forge') {
            const hookIngredientIds = [
                'old_can', 'iron_nugget', 'gold_nugget', 'feather',
                'iron_hook', 'gold_hook', 'fly_hook'
            ];
            craftableItems = inventory.items.filter(item =>
                item.type === 'hook' ||
                hookIngredientIds.includes(item.id)
            );
        } else {
            craftableItems = inventory.items.filter(item => 
            ['bait', 'item'].includes(item.type) || 
            (item.type === 'fish' && item.metadata?.fishStats?.isBaitFish === true)
        );
        }
        
        // Test image loading for the first bait item we find
        for (let i = 0; i < craftableItems.length; i++) {
            const item = craftableItems[i];
            if (item.type === 'bait') {
                this.testImageLoading(item.id, item.type);
            }
        }
        
        craftableItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.dataset.itemId = item.id;
            itemElement.dataset.itemType = item.type;
            
            // Get sprite path based on item type and ID
            let spritePath = '';
            if (item.type === 'bait' || item.type === 'item') {

                if (item.sprite) {
                    // Use the sprite property directly
                    spritePath = `${baseUrl}/ui/icons/${item.sprite}`;

                }
            } else if (item.type === 'fish') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            } else if (item.type === 'hook') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            } else if (item.type === 'rod') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            }
            
            // Use sprite if available, otherwise use colored background with fallback
            const iconStyle = spritePath ? 
                `background-image: url('${spritePath}');` : 
                `background-color: ${this.getColorForRarity(item.rarity)};`;
            
            itemElement.innerHTML = `
                <div class="item-icon" style="${iconStyle}"></div>
                <div class="item-name ${item.rarity}">${item.name}</div>
                <div class="item-quantity">x${item.quantity}</div>
            `;
            
            // Add drag functionality
            this.addDragFunctionality(itemElement, item);
            
            grid.appendChild(itemElement);
        });
        
        if (craftableItems.length === 0) {
            grid.innerHTML = '<div class="empty-message">No craftable items in inventory</div>';
        }
    }
    
    addDragFunctionality(element, item) {
        element.draggable = true;
        
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(item));
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        // Also add click to select functionality
        element.addEventListener('click', () => {
            // Find first empty slot
            const emptySlotIndex = this.craftingSlots.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                this.addItemToSlot(emptySlotIndex, item);
            }
        });
        
        // Make crafting slots droppable
        document.querySelectorAll('.crafting-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                const itemData = JSON.parse(e.dataTransfer.getData('text/plain'));
                const slotIndex = parseInt(slot.dataset.slot);
                
                this.addItemToSlot(slotIndex, itemData);
            });
        });
    }
    
    addItemToSlot(slotIndex, item) {
        if (slotIndex < 0 || slotIndex >= this.craftingSlots.length) return;
        
        // Check if we have enough of this item
        const existingCount = this.craftingSlots.filter(
            slot => slot && slot.id === item.id
        ).length;
        
        if (existingCount >= item.quantity) {
            // Not enough of this item
            return;
        }
        
        this.craftingSlots[slotIndex] = item;
        
        // Get sprite path based on item type and ID
        const baseUrl = this.getAssetBaseUrl();
        let spritePath = '';
        
        // Use the same logic as in updateInventoryGrid
        if (item.type === 'bait' || item.type === 'item') {
            if (item.sprite) {
                // Use the sprite property directly
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            }
        } else if (item.type === 'fish') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        } else if (item.type === 'hook') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        } else if (item.type === 'rod') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        }
        
        // Use sprite if available, otherwise use colored background
        const iconStyle = spritePath ? 
            `background-image: url('${spritePath}');` : 
            `background-color: ${this.getColorForRarity(item.rarity)};`;
        
        // Update the UI
        const slotElement = document.querySelector(`.crafting-slot[data-slot="${slotIndex}"]`);
        slotElement.innerHTML = `
            <div class="item-in-slot">
                <div class="item-icon" style="${iconStyle}"></div>
                <div class="item-name ${item.rarity}">${item.name}</div>
            </div>
        `;
        slotElement.classList.add('filled');
        
        // Check if we can craft something
        this.checkRecipes();
    }
    
    removeItemFromSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.craftingSlots.length) return;
        
        this.craftingSlots[slotIndex] = null;
        
        // Update the UI
        const slotElement = document.querySelector(`.crafting-slot[data-slot="${slotIndex}"]`);
        slotElement.innerHTML = '';
        slotElement.classList.remove('filled');
        
        // Clear result slot
        this.clearResultSlot();
        
        // Disable craft button
        document.getElementById('craft-button').disabled = true;
    }
    
    clearCraftingSlots() {
        this.craftingSlots = [null, null, null, null];
        
        // Update UI
        document.querySelectorAll('.crafting-slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('filled');
        });
        
        this.clearResultSlot();
        document.getElementById('craft-button').disabled = true;
        
        // Reset global crafting lock when slots are cleared
        // (This ensures the lock is reset when inventory is closed)
        globalCraftingLock = false;
        if (globalCraftingTimeout) {
            clearTimeout(globalCraftingTimeout);
            globalCraftingTimeout = null;
        }
    }
    
    clearResultSlot() {
        this.resultSlot = null;
        const resultElement = document.querySelector('.result-slot');
        resultElement.innerHTML = '';
        resultElement.classList.remove('filled');
    }
    
    checkRecipes() {
        
        // Get the items in slots
        const slotItems = this.craftingSlots.filter(slot => slot !== null);
        
        // Check if we match any recipe
        for (const recipe of this.recipes) {
            if (slotItems.length !== recipe.inputs.length) continue;
            
            const recipeInputs = [...recipe.inputs]; // Clone the recipe inputs
            let match = true;
            
            // Check if all slots match recipe requirements
            for (const slotItem of slotItems) {
                // Extract the base item type from the ID
                const baseItemId = this.getBaseItemId(slotItem.id);
                
                // Check if this is a direct match with the base ID or name
                const inputIndex = recipeInputs.findIndex(input => 
                    input === baseItemId || 
                    input.toLowerCase() === slotItem.name.toLowerCase()
                );
                
                if (inputIndex !== -1) {
                    // Direct match found, remove this input from the recipe
                    recipeInputs.splice(inputIndex, 1);
                } else {
                    match = false;
                    break;
                }
            }
            
            if (match && recipeInputs.length === 0) {
                // We have a match!
                this.showCraftingResult(recipe.output);
                return;
            }
        }
        this.clearResultSlot();
        // Check if we're in mobile view or desktop view when disabling button
        const craftButton = document.getElementById('craft-button');
        if (craftButton) {
            craftButton.disabled = true;
        }
    }
    
    showCraftingResult(item) {
        
        this.resultSlot = item;
        
        // Get sprite path based on result type and ID
        const baseUrl = this.getAssetBaseUrl();
        let spritePath = '';
        
        // Use the same logic as in other methods
        if (item.type === 'bait' || item.type === 'item') {
            if (item.sprite) {
                // Use the sprite property directly
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            }
        } else if (item.type === 'fish') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        } else if (item.type === 'hook') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        } else if (item.type === 'rod') {
            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
        }
        
        // Use sprite if available, otherwise use colored background
        const iconStyle = spritePath ? 
            `background-image: url('${spritePath}');` : 
            `background-color: ${this.getColorForRarity(item.rarity)};`;
        
        // Check if there's a crafting cost
        const craftingCost = item.value || 0;
        const costDisplay = craftingCost > 0 ? 
            `<div class="crafting-cost">Cost: ${craftingCost} coins</div>` : '';
        
        const resultElement = document.querySelector('.result-slot');
        resultElement.innerHTML = `
            <div class="item-in-slot">
                <div class="item-icon" style="${iconStyle}"></div>
                <div class="item-name ${item.rarity}">${item.name}</div>
            </div>
            ${costDisplay}
        `;
        resultElement.classList.add('filled');
        
        // Enable craft button
        document.getElementById('craft-button').disabled = false;
    }
    
    attemptCrafting() {
        if (!this.resultSlot) {
            return;
        }
        
        // IMPORTANT: Force quantity to be 1 to avoid doubling
        const outputItemId = this.resultSlot.id;
        
        // Get base IDs for crafting
        const inputIds = this.craftingSlots.map(slot => 
            slot ? slot.id : null
        );
        
        // Animate the crafting process
        const craftingSlots = document.querySelectorAll('.crafting-slot.filled');
        craftingSlots.forEach(slot => {
            slot.classList.add('crafting-animation');
        });
        
        // Send crafting request to server with explicit quantity override
        hytopia.sendData({
            type: 'craftItem',
            inputs: inputIds,
            output: outputItemId,
            quantity: 1  // Explicitly state we only want 1 item
        });
        
        // Simulate crafting delay
        setTimeout(() => {
            // Remove animation
            craftingSlots.forEach(slot => {
                slot.classList.remove('crafting-animation');
            });
            
            // Clear slots after crafting
            this.clearCraftingSlots();
            
            // Request updated inventory
            hytopia.sendData({ type: 'requestInventory' });
            
        }, 1500);
        hytopia.sendData({ type: 'disablePlayerInput' });
    }
    
    handleCraftingResult(success, result) {
        // Skip showing result messages if we've already received a specific crafting message
        // This prevents duplicate messages when there's already a custom message (like bait limit)
        if (this.lastMessageTimestamp && Date.now() - this.lastMessageTimestamp < 500) {
            return;
        }
        
        if (success) {
            // Show success message
            const message = document.createElement('div');
            message.className = 'crafting-message success';
            message.innerHTML = `
                <div class="message-icon">✓</div>
                <div class="message-text">Successfully crafted ${result.name}!</div>
            `;
            document.querySelector('.crafting-content').prepend(message);
            
            setTimeout(() => {
                message.classList.add('fade-out');
                setTimeout(() => {
                    message.remove();
                }, 500);
            }, 2500);
        } else {
            // Show error message
            const message = document.createElement('div');
            message.className = 'crafting-message error';
            message.innerHTML = `
                <div class="message-icon">✗</div>
                <div class="message-text">Crafting failed. Please try again.</div>
            `;
            document.querySelector('.crafting-content').prepend(message);
            
            setTimeout(() => {
                message.classList.add('fade-out');
                setTimeout(() => {
                    message.remove();
                }, 500);
            }, 2500);
        }
    }
    
    // New method to display crafting messages from the server
    displayCraftingMessage(messageType, messageText) {
        // Set timestamp to prevent duplicate messages
        this.lastMessageTimestamp = Date.now();
        
        const message = document.createElement('div');
        message.className = `crafting-message ${messageType}`;
        
        const icon = messageType === 'success' ? '✓' : '✗';
        
        message.innerHTML = `
            <div class="message-icon">${icon}</div>
            <div class="message-text">${messageText}</div>
        `;
        
        document.querySelector('.crafting-content').prepend(message);
        
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 2500);
        
        // If it's an error message, remove crafting animation
        if (messageType === 'error') {
            const craftingSlots = document.querySelectorAll('.crafting-slot.filled');
            craftingSlots.forEach(slot => {
                slot.classList.remove('crafting-animation');
            });
        }
    }
    
    getColorForRarity(rarity) {
        const rarityColors = {
            common: '#aaaaaa',
            uncommon: '#4caf50',
            rare: '#2196f3',
            epic: '#9c27b0',
            legendary: '#ff9800'
        };
        
        return rarityColors[rarity] || '#aaaaaa';
    }

    // Add a debug method to test image loading
    testImageLoading(itemId, itemType) {
        const baseUrl = this.getAssetBaseUrl();
        
        // Test different path variations
        const paths = [
            `${baseUrl}/ui/icons/${itemType}/${itemId}.png`,
            `${baseUrl}/ui/icons/${itemType}_sprite.png`,
            `${baseUrl}/ui/icons/${itemId}.png`,
            `${baseUrl}/ui/icons/${itemType}s/${itemId}.png`,
            `${baseUrl}/ui/icons/worm_sprite.png`  // Direct test for worm sprite
        ];
        

        
        paths.forEach((path, index) => {
            const testImg = new Image();
            testImg.onload = () => {};
            testImg.onerror = () => {};
            testImg.src = path;
        });
    }

    // Add a method to apply dynamic icon styles
    applyIconStyles() {
        setTimeout(() => {
            const baseUrl = this.getAssetBaseUrl();
            
            // Apply to all crafting-related icons
            const craftingIcons = document.querySelectorAll('.crafting-icon, .recipe-icon, .material-icon');
            craftingIcons.forEach(icon => {
                // Get the icon type from a data attribute or class name
                let iconType = '';
                if (icon.classList.contains('crafting-icon')) iconType = 'crafting';
                else if (icon.classList.contains('recipe-icon')) iconType = 'recipe';
                else if (icon.classList.contains('material-icon')) iconType = 'material';
                
                // Only proceed if we have an icon type
                if (!iconType) return;
                
                // Get the specific icon name from data attribute if available
                const iconName = icon.dataset.icon || `${iconType}_default`;
                
                // Set the background image
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/${iconName}.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
            });
        }, 100); // Small delay to ensure elements are in the DOM
    }

    getBaseItemId(itemId) {
        if (!itemId) return null;
        
        // Convert to lowercase
        let normalized = itemId.toLowerCase();
        
        // Handle bait items with specific types
        if (normalized.startsWith('bait_')) {
            // Extract the actual bait type instead of just returning "bait"
            normalized = normalized.substring(5); // e.g., 'bait_raw_shrimp' -> 'raw_shrimp'
            return normalized;
        }
        
        // Handle fish IDs with timestamps
        const fishMatch = normalized.match(/^([a-z_]+)_\d+_\d+$/);
        if (fishMatch) {
            normalized = fishMatch[1];
        }
        
        return normalized;
    }

    // Add a style to hide chat window
    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'crafting-chat-style';
            this.styleElement.textContent = `
                #chat-window {
                    display: none !important;
                }
            `;
            document.head.appendChild(this.styleElement);
        }
    }

    // Remove style to show chat window
    removeHideChatStyle() {
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

    // Add this new method to optimize the crafting panel for mobile
    optimizeCraftingPanelForMobile() {
        if (!hytopia.isMobile) return;
        
        // Get the crafting overlay
        const overlay = document.getElementById('crafting-overlay');
        if (!overlay) return;
        
        // Clear the existing content and add our mobile-specific UI
        const container = overlay.querySelector('.crafting-container');
        if (!container) return;
        
        // Store original content to restore for desktop if needed
        if (!this._originalCraftingHTML) {
            this._originalCraftingHTML = container.innerHTML;
        }
        
        // Adjust the container for landscape view
        container.style.width = '95vw';
        container.style.height = '85vh';
        container.style.maxHeight = 'none';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        
        // Create mobile-specific content with a more compact header
        container.innerHTML = `
            <div class="crafting-header mobile-compact">
                <h2>Crafting</h2>
                <div class="close-button" id="crafting-close-button">×</div>
            </div>
            <div class="crafting-mobile-content">
                <div class="crafting-mobile-grid">
                    <div class="crafting-ingredients-section">
                        <h3>Ingredients</h3>
                        <div class="mobile-inventory-grid" id="mobile-crafting-inventory"></div>
                    </div>
                    <div class="crafting-workbench-section">

                        <div class="crafting-slots-container">
                            <div class="crafting-slot" data-slot="0"></div>
                            <div class="crafting-slot" data-slot="1"></div>
                            <div class="crafting-slot" data-slot="2"></div>
                            <div class="crafting-slot" data-slot="3"></div>
                        </div>
                        <div class="crafting-result-container">
                            <div class="result-slot" id="mobile-result-slot">
                                <div class="result-slot-message">Tap result to craft</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add mobile-specific styles
        const mobileStyles = document.createElement('style');
        mobileStyles.id = 'mobile-crafting-styles';
        mobileStyles.textContent = `
            /* More compact header for mobile */
            .crafting-header.mobile-compact {
                padding: 8px 12px;
                min-height: 0;
                background: #0a1622;
                border-bottom: 1px solid #4a90e2;
            }
            
            .crafting-header.mobile-compact h2 {
                font-size: 16px;
                margin: 0;
            }
            
            .crafting-header.mobile-compact .close-button {
                font-size: 22px;
            }
            
            .crafting-mobile-instructions {
                text-align: center;
                padding: 5px;
                background: rgba(10, 22, 34, 0.7);
                color: #ccc;
                font-size: 12px;
                border-bottom: 1px solid #4a90e2;
            }
            
            .crafting-mobile-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .crafting-mobile-grid {
                display: flex;
                width: 100%;
                height: 100%;
            }
            
            .crafting-ingredients-section {
                width: 60%;
                padding: 8px;
                border-right: 1px solid #4a90e2;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .crafting-ingredients-section h3 {
                margin: 0 0 4px 0;
                color: #4a90e2;
                font-size: 14px;
                text-align: center;
                padding-bottom: 2px;
                border-bottom: 1px solid rgba(74, 144, 226, 0.3);
            }
            
            .crafting-workbench-section {
                width: 40%;
                padding: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .crafting-workbench-section h3 {
                margin: 0 0 4px 0;
                color: #4a90e2;
                font-size: 14px;
                text-align: center;
                padding-bottom: 2px;
                border-bottom: 1px solid rgba(74, 144, 226, 0.3);
            }
            
            .mobile-inventory-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 5px;
                overflow-y: auto;
                padding: 5px;
                flex: 1;
            }
            
            .mobile-inventory-item {
                width: 50px;
                height: 50px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #4a90e2;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                position: relative;
                transition: transform 0.1s, background-color 0.1s;
            }
            
            .mobile-inventory-item .item-icon {
                width: 28px;
                height: 28px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .mobile-inventory-item .item-name {
                font-size: 8px;
                text-align: center;
                margin-top: 2px;
                width: 100%;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            
            .mobile-inventory-item .item-quantity {
                position: absolute;
                bottom: 1px;
                right: 1px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                font-size: 8px;
                padding: 1px 3px;
                border-radius: 3px;
            }
            
            .crafting-slots-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 6px;
                margin: 8px 0;
            }
            
            .crafting-slot {
                width: 45px;
                height: 45px;
                background: rgba(0, 0, 0, 0.3);
                border: 2px solid #4a90e2;
                border-radius: 4px;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: background-color 0.2s;
            }
            
            .crafting-slot.filled {
                background: rgba(74, 144, 226, 0.2);
            }
            
            .crafting-slot.filled:active {
                background: rgba(255, 100, 100, 0.3);
            }
            
            .crafting-result-container {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 12px 0;
                position: relative;
            }
            
            .crafting-arrow {
                font-size: 22px;
                color: #4a90e2;
                margin: 0 6px;
            }
            
            .result-slot {
                width: 70px;
                height: 70px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #ffeb3b;
                border-radius: 4px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                transition: all 0.2s;
            }
            
            .result-slot.craftable {
                cursor: pointer;
                background: rgba(74, 144, 226, 0.2);
                animation: pulse-glow 1.5s infinite;
            }
            
            .result-slot.craftable:active {
                transform: scale(0.95);
                background: rgba(74, 144, 226, 0.4);
            }
            
            .result-slot-message {
                font-size: 10px;
                color: #aaa;
                text-align: center;
                padding: 0 5px;
            }
            
            .item-in-slot {
                width: 80%;
                height: 80%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .item-in-slot .item-icon {
                width: 32px;
                height: 32px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .item-in-slot .item-name {
                font-size: 9px;
                color: white;
                text-align: center;
                margin-top: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            
            /* For touch highlight feedback */
            .mobile-inventory-item.touched {
                background: rgba(74, 144, 226, 0.3);
                transform: scale(0.95);
            }
            
            /* Visual feedback when too many of an item are used */
            .mobile-inventory-item.max-items {
                border-color: #ff9800;
                animation: flash-orange 0.3s;
            }
            
            /* Visual feedback when all slots are full */
            .mobile-inventory-item.no-slots {
                border-color: #f44336;
                animation: flash-red 0.3s;
            }
            
            /* "Tap to craft" message */
            body.mobile .result-slot.craftable::after {
                content: "Tap to craft";
                position: absolute;
                bottom: -18px;
                left: 0;
                right: 0;
                text-align: center;
                color: #ffeb3b;
                font-size: 10px;
            }
            
            /* "Tap to craft" message with cost */
            body.mobile .result-slot.craftable[data-crafting-cost]:not([data-crafting-cost="0"])::after {
                content: "Tap to craft for " attr(data-crafting-cost) " coins";
            }
            
            @keyframes flash-orange {
                0% { background-color: rgba(255, 152, 0, 0.3); }
                100% { background-color: rgba(0, 0, 0, 0.3); }
            }
            
            @keyframes flash-red {
                0% { background-color: rgba(244, 67, 54, 0.3); }
                100% { background-color: rgba(0, 0, 0, 0.3); }
            }
            
            @keyframes pulse-glow {
                0% { box-shadow: 0 0 5px #ffeb3b; }
                50% { box-shadow: 0 0 15px #ffeb3b; }
                100% { box-shadow: 0 0 5px #ffeb3b; }
            }
            
            /* New CSS for crafting states */
            .result-slot.crafting {
                opacity: 0.6;
                animation: none !important;
                pointer-events: none;
            }
            
            //filler text for slot when crafting on mobile 
            .result-slot.crafting::after {
                content: "..." !important;
            }
            
            .result-slot.crafting-locked {
                animation: shake 0.2s linear !important;
            }
            
            @keyframes shake {
                0% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                50% { transform: translateX(5px); }
                75% { transform: translateX(-5px); }
                100% { transform: translateX(0); }
            }
            
            /* Make all item names white regardless of rarity */
            .item-name {
                color: white !important;
            }
            
            /* Override any rarity classes */
            .item-name.common,
            .item-name.uncommon,
            .item-name.rare,
            .item-name.epic,
            .item-name.legendary,
            .item-name.mythic {
                color: white !important;
            }
        `;
        
        document.head.appendChild(mobileStyles);
        
        // Set up close button
        document.getElementById('crafting-close-button').addEventListener('click', () => {
            this.toggleCraftingMenu(false);
        });
        
        // Set up crafting slots
        document.querySelectorAll('.crafting-slot').forEach(slot => {
            // Make tap more reliable on mobile
            slot.addEventListener('touchend', (e) => {
                e.preventDefault();
                const slotIndex = parseInt(e.currentTarget.dataset.slot);
                if (this.craftingSlots[slotIndex]) {
                    // Visual feedback
                    slot.classList.add('removing');
                    setTimeout(() => {
                        slot.classList.remove('removing');
                        // Remove item from slot
                        this.removeItemFromSlot(slotIndex);
                    }, 100);
                }
            });
        });
        
        // Set up the result slot as the craft button with enhanced spam protection
        const resultSlot = document.getElementById('mobile-result-slot');
        resultSlot.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Strong spam prevention check using global variables
            if (globalCraftingLock) {
                console.log("Crafting locked, please wait...");
                
                // Visual feedback that crafting is locked
                resultSlot.classList.add('crafting-locked');
                setTimeout(() => {
                    resultSlot.classList.remove('crafting-locked');
                }, 300);
                
                return;
            }
            
            if (this.resultSlot && resultSlot.classList.contains('craftable')) {
                // Set global lock immediately
                globalCraftingLock = true;
                
                // Clear any existing timeouts
                if (globalCraftingTimeout) {
                    clearTimeout(globalCraftingTimeout);
                }
                
                // Add pressed effect
                resultSlot.classList.add('pressing');
                
                // Disable the result slot visually
                resultSlot.classList.add('crafting');
                resultSlot.classList.remove('craftable');
                
                setTimeout(() => {
                    resultSlot.classList.remove('pressing');
                    
                    // Attempt crafting
                    this.attemptCrafting();
                    
                    // Set a timeout to unlock crafting after a significant delay
                    globalCraftingTimeout = setTimeout(() => {
                        globalCraftingLock = false;
                        resultSlot.classList.remove('crafting');
                        console.log("Crafting unlocked");
                    }, 3000); // 3 second lockout
                }, 100);
            }
        });
        
        // Request inventory & recipes to populate
        hytopia.sendData({ type: 'requestInventory' });
        hytopia.sendData({ type: 'requestCraftingRecipes' });
        
        // Override the showCraftingResult method
        this._originalShowCraftingResult = this.showCraftingResult;
        this.showCraftingResult = (item) => {
            
            this.resultSlot = item;
            
            // Get sprite path based on result type and ID - EXACT SAME AS DESKTOP
            const baseUrl = this.getAssetBaseUrl();
            let spritePath = '';
            
            // Use the same logic as in other methods - EXACT SAME AS DESKTOP
            if (item.type === 'bait' || item.type === 'item') {
                if (item.sprite) {
                    // Use the sprite property directly
                    spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
                }
            } else if (item.type === 'fish') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            } else if (item.type === 'hook') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            } else if (item.type === 'rod') {
                spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
            }
            
            // Use sprite if available, otherwise use colored background - EXACT SAME AS DESKTOP
            const iconStyle = spritePath ? 
                `background-image: url('${spritePath}');` : 
                `background-color: ${this.getColorForRarity(item.rarity)};`;
            
            const resultElement = document.querySelector('.result-slot');
            resultElement.innerHTML = `
                <div class="item-in-slot">
                    <div class="item-icon" style="${iconStyle}"></div>
                    <div class="item-name">${item.name}</div>
                </div>
            `;
            
            // Add mobile-specific classes and set cost data attribute
            resultElement.classList.add('filled', 'craftable');
            resultElement.style.cursor = 'pointer';
            
            // Store the crafting cost for the CSS to use
            const craftingCost = item.value || 0;
            resultElement.setAttribute('data-crafting-cost', craftingCost);
        };
        
        // Override clearResultSlot
        this._originalClearResultSlot = this.clearResultSlot;
        this.clearResultSlot = () => {
            this.resultSlot = null;
            const resultElement = document.querySelector('.result-slot');
            resultElement.innerHTML = `<div class="result-slot-message">Tap Result to Craft.</div>`;
            resultElement.classList.remove('filled', 'craftable');
        };
        
        // Override the updateInventoryGrid method to populate our mobile grid
        this._originalUpdateInventoryGrid = this.updateInventoryGrid;
        this.updateInventoryGrid = (inventory) => {
            const grid = document.getElementById('mobile-crafting-inventory');
            if (!grid) return;
            grid.innerHTML = '';
            let craftableItems;
            if (this.craftingType === 'forge') {
                const hookIngredientIds = [
                    'old_can', 'iron_nugget', 'gold_nugget', 'feather',
                    'iron_hook', 'gold_hook', 'fly_hook'
                ];
                craftableItems = inventory.items.filter(item =>
                    item.type === 'hook' ||
                    hookIngredientIds.includes(item.id)
                );
            } else {
                craftableItems = inventory.items.filter(item => 
                ['bait', 'item'].includes(item.type) || 
                (item.type === 'fish' && item.metadata?.fishStats?.isBaitFish === true)
            );
            }
            const baseUrl = this.getAssetBaseUrl();
            craftableItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'mobile-inventory-item';
                itemElement.dataset.itemId = item.id;
                itemElement.dataset.itemType = item.type;
                let spritePath = '';
                if (item.type === 'bait' || item.type === 'item') {
                    if (item.sprite) {
                        spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
                    }
                } else if (item.type === 'fish') {
                    spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
                } else if (item.type === 'hook') {
                    spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
                }
                const iconStyle = spritePath ? 
                    `background-image: url('${spritePath}');` : 
                    `background-color: ${this.getColorForRarity(item.rarity)};`;
                itemElement.innerHTML = `
                    <div class="item-icon" style="${iconStyle}"></div>
                    <div class="item-name ${item.rarity}">${item.name}</div>
                    <div class="item-quantity">x${item.quantity}</div>
                `;
                this.setupMobileTouchEvents(itemElement, item);
                grid.appendChild(itemElement);
            });
        };
    }

    // Simplified tap-only touch events
    setupMobileTouchEvents(element, item) {
        element.addEventListener('touchstart', (e) => {
            // Visual feedback
            element.classList.add('touched');
        });
        
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Visual feedback
            element.classList.remove('touched');
            
            // Check if there are enough of this item available
            const existingCount = this.craftingSlots.filter(
                slot => slot && slot.id === item.id
            ).length;
            
            if (existingCount >= item.quantity) {
                // Show a subtle flash to indicate we can't add more
                element.classList.add('max-items');
                setTimeout(() => {
                    element.classList.remove('max-items');
                }, 300);
                return;
            }
            
            // Find first empty slot
            const emptySlotIndex = this.craftingSlots.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                this.addItemToSlot(emptySlotIndex, item);
            } else {
                // All slots full, show a subtle flash
                element.classList.add('no-slots');
                setTimeout(() => {
                    element.classList.remove('no-slots');
                }, 300);
            }
        });
        
        element.addEventListener('touchcancel', () => {
            element.classList.remove('touched');
        });
    }

    // Add methods to hide and show mobile controls

    // Hide mobile control buttons
    hideMobileControls() {
        // Common mobile control button IDs and classes
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('break-button'),
            document.getElementById('mobile-movement-area'),
            document.getElementById('mobile-look-area'),
            document.getElementById('mobile-build-button'),
            document.getElementById('mobile-jump-button'),
            document.getElementById('mobile-cast-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-fishing-button'),
                document.getElementById('mobile-quest-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Hide elements by ID
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide elements by class
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = 'none';
            }
        });
    }

    // Show mobile control buttons
    showMobileControls() {
        // Common mobile control button IDs and classes
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('break-button'),
            document.getElementById('mobile-movement-area'),
            document.getElementById('mobile-look-area'),
            document.getElementById('mobile-build-button'),
            document.getElementById('mobile-jump-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-break-button'),
            document.getElementById('mobile-fishing-button'),
            document.getElementById('mobile-cast-button'),
                document.getElementById('mobile-quest-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Show elements by ID
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = '';  // Reset to default display value
            }
        });
        
        // Show elements by class
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = '';   // Reset to default display value
            }
        });
    }
}

// Make it globally available
window.CraftingPanel = new CraftingPanel();