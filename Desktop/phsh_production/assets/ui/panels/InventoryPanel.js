class InventoryPanel {
    constructor() {
        this.container = null;
        this.currentTab = 'rods';
        this.currentRod = null;
        this.lastEquippedRod = null;
        this.selectedBait = null;
        this.equipmentMenuOpen = false;
        this.currentFish = null;
        this.lastEquippedFish = null;
        this.cachedBaitItems = null;
        this._itemTooltipTimeout = null;
        this._hasAddedTooltipDismissHandlers = false;
        this.cachedPhshdexData = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML with simplified toolbar design
        const panel = document.createElement('div');
        panel.id = 'inventory-ui';
        panel.innerHTML = `
            <!-- Hotbar - Rod, Bait, and Fish slots (frontiers-style, separate containers) -->
            <div id="inventory-toolbar">
                <div class="hud-hotbar-container">
                    <div class="hud-hotbar-single-grid">
                        <div class="hud-hotbar-slot" id="rod-slot" data-type="rod">
                            <div class="hud-hotbar-slot-content">1</div>
                            <div class="hud-hotbar-slot-label">Rod</div>
                            <div class="hud-hotbar-key-indicator">1</div>
                        </div>
                    </div>
                </div>
                <div class="hud-hotbar-container">
                    <div class="hud-hotbar-single-grid">
                        <div class="hud-hotbar-slot" id="bait-slot" data-type="bait">
                            <div class="hud-hotbar-slot-content">2</div>
                            <div class="hud-hotbar-slot-label">Bait</div>
                            <div class="hud-hotbar-key-indicator">2</div>
                        </div>
                    </div>
                </div>
                <div class="hud-hotbar-container">
                    <div class="hud-hotbar-single-grid">
                        <div class="hud-hotbar-slot" id="fish-slot" data-type="fish">
                            <div class="hud-hotbar-slot-content">3</div>
                            <div class="hud-hotbar-slot-label">Fish</div>
                            <div class="hud-hotbar-key-indicator">3</div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Quick Bait Selection Popup -->
            <div id="bait-quick-select" class="inventory-quick-select"></div>
            <!-- Inventory Panel (Crafting-style) -->
            <div id="inventory-equipment-menu" class="inventory-panel">
                <div class="inventory-panel-header">
                    <h2>Equipment & Items</h2>
                    <span class="inventory-close-button">×</span>
                </div>
                <div class="inventory-panel-content">
                    <div class="inventory-panel-sidebar">
                        <button class="inventory-sidebar-button active" data-tab="rods">
                            <div class="rod-icon"></div>
                            <span>Rods</span>
                        </button>
                        <button class="inventory-sidebar-button" data-tab="bait">
                            <div class="worm-icon"></div>
                            <span>Bait</span>
                        </button>
                        <button class="inventory-sidebar-button" data-tab="items">
                             <div class="crate-icon"></div>
                            <span>Loot</span>
                        </button>
                        <button class="inventory-sidebar-button" data-tab="chests">
                            <div class="chest-icon"></div>
                            <span>Chests</span>
                        </button>
                        <button class="inventory-sidebar-button" data-tab="fish">
                            <div class="fish-icon"></div>
                            <span>Fish</span>
                        </button>
                        <button class="inventory-sidebar-button" data-tab="phshdex">
                            <div class="phshdex-icon"></div>
                            <span>Phshdex</span>
                        </button>
                    </div>
                    <div class="inventory-panel-main">
                        <div id="rods-tab" class="inventory-tab-content active"></div>
                        <div id="bait-tab" class="inventory-tab-content"></div>
                        <div id="items-tab" class="inventory-tab-content"></div>
                        <div id="chests-tab" class="inventory-tab-content"></div>
                        <div id="fish-tab" class="inventory-tab-content"></div>
                        <div id="phshdex-tab" class="inventory-tab-content"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);

        // Add CSS for simplified toolbar design
        this.addStyles();
        this.addBaitStyles();
        // Add icon styles
        this.addIconStyles();

        // Set up event listeners
        this.setupEventListeners();
        
        // Hide equipment menu and bait selector initially
        document.getElementById('inventory-equipment-menu').style.display = 'none';

        // Show rods tab by default
        this.showTab('rods');

        // Set up message handling
        hytopia.onData((data) => {
            if (data.type === 'inventoryUpdate') {
                this.updateInventory(data.inventory);
            } else if (data.type === 'phshdexUpdate') {
                // Cache the persistent phshdex data from the server
                this.cachedPhshdexData = data.phshdexData;
                
                // If phshdex tab is currently open, refresh it
                if (this.currentTab === 'phshdex') {
                    const inventory = this.lastInventory || { items: [] };
                    this.updatePhshdexTab(inventory);
                }
            } 
        });

        // Keyboard shortcuts - 'i' key disabled (deprecated panel)
        document.addEventListener('keydown', (e) => {
            if (window.MerchantPanel?.isMerchantDialogOpen) {
                return; // Don't handle inventory keys if merchant dialog is open
            }

            // 'i' key binding removed - use 'e' for TackleBoxPanel instead
            // if (e.key === 'i') {
            //     this.toggleEquipmentMenu(true);
            // } else if (e.key === 'Escape') {
            if (e.key === 'Escape') {
                // Always hide tooltips when Escape is pressed, regardless of inventory state
                this.hideAllTooltips();
                
                if (this.equipmentMenuOpen) {
                    this.toggleEquipmentMenu(false);
                }
            }
            // Number keys for toolbar slots
            /*
            if (e.key >= '1' && e.key <= '3') {
                const slotNum = parseInt(e.key);
                this.activateToolbarSlot(slotNum);
                e.preventDefault();
            } 
            */
        });

        // Global click handler to hide tooltips when clicking anywhere
        document.addEventListener('click', (e) => {
            // Check if the click was on or inside a tooltip
            const tooltip = document.getElementById('bait-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                // If the click wasn't on the tooltip itself, hide it
                if (!tooltip.contains(e.target)) {
                    tooltip.style.display = 'none';
                }
            }
        });

        // Load saved bait hotkeys
        this.loadBaitHotkeys();

        // Setup hotbar click handlers
        this.setupHotbar();
    }
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Panel Base Styles */
            .inventory-panel {
                background-color: rgba(22, 28, 36, 0.95);
                border: 2px solid #3a4a5c;
                border-radius: 8px;
                color: #e0e0e0;
                width: 65vw;
                max-width: 650px;
                height: 60vh;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }
            
            .inventory-panel-header {
                background: linear-gradient(to right, #2c3e50, #4a6491);
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #3a4a5c;
            }
            
            .inventory-panel-header h2 {
                margin: 0;
                color: #ffffff;
                font-size: 22px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .inventory-close-button {
                font-size: 28px;
                cursor: pointer;
                color: #ffffff;
                transition: color 0.2s;
            }
            
            .inventory-close-button:hover {
                color: #ff9966;
            }
            
            .inventory-panel-content {
                display: flex;
                flex: 1;
                overflow: hidden;
                padding: 4px;
            }
            
            /* Sidebar Styles */
            .inventory-panel-sidebar {
                width: 28%;
                min-width: 80px;
                max-width: 120px;
                background-color: rgba(30, 38, 50, 0.8);
                border-right: 1px solid #3a4a5c;
                display: flex;
                flex-direction: column;
                padding: 8px 0;
            }
            
            .inventory-sidebar-button {
                background: transparent;
                border: none;
                color: #b0b0b0;
                padding: 12px 15px;
                text-align: left;
                display: flex;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s;
                border-left: 3px solid transparent;
            }
            
            .inventory-sidebar-button img {
                width: 24px;
                height: 24px;
                margin-right: 12px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .inventory-sidebar-button:hover {
                background-color: rgba(74, 100, 145, 0.2);
                color: #ffffff;
            }
            
            .inventory-sidebar-button:hover img {
                opacity: 1;
            }
            
            .inventory-sidebar-button.active {
                background-color: rgba(74, 100, 145, 0.3);
                color: #ffffff;
                border-left: 3px solid #4a90e2;
            }
            
            .inventory-sidebar-button.active img {
                opacity: 1;
            }
            
            /* Main Content Area */
            .inventory-panel-main {
                flex: 1 1 67%;
                padding: 4px;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #4a6491 #1e2632;
                -webkit-overflow-scrolling: touch; /* Enable smooth scrolling on iOS */
                overscroll-behavior: contain; /* Prevent scroll chaining */
                touch-action: pan-y; /* Allow vertical touch scrolling */
            }
            
            .inventory-panel-main::-webkit-scrollbar {
                width: 8px;
            }
            
            .inventory-panel-main::-webkit-scrollbar-track {
                background: #1e2632;
            }
            
            .inventory-panel-main::-webkit-scrollbar-thumb {
                background-color: #4a6491;
                border-radius: 4px;
            }
            
            /* Tab Content */
            .inventory-tab-content {
                display: none;
                animation: fadeIn 0.3s ease;
            }
            
            .inventory-tab-content.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Empty Message */
            .inventory-empty-message {
                text-align: center;
                padding: 40px 0;
                color: #8a9cad;
                font-style: italic;
            }
            
            /* Rod Items */
            .inventory-rod-item {
                background-color: rgba(40, 50, 65, 0.7);
                border: 1px solid #3a4a5c;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
            }
            
            .inventory-rod-item:hover {
                background-color: rgba(50, 65, 85, 0.8);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .inventory-rod-item.equipped {
                border: 1px solid #4a90e2;
                background-color: rgba(74, 144, 226, 0.15);
            }
            
            .inventory-rod-info {
                flex: 1;
            }
            
            .inventory-rod-name {
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 8px;
            }
            
            .inventory-rod-stats {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                color: #b0b0b0;
                font-size: 14px;
            }
            
            .inventory-equip-button {
                background-color: #4a6491;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            }
            
            .inventory-equip-button:hover {
                background-color: #5a7cb6;
            }
            
            .inventory-rod-item.equipped .inventory-equip-button {
                background-color: #2c3e50;
            }
            
            /* Bait Items */
            .inventory-bait-section {
                margin-bottom: 25px;
            }
            
            .inventory-section-header {
                color: #4a90e2;
                font-size: 18px;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #4a90e2;
            }
            
            .inventory-bait-item {
                background-color: rgba(40, 50, 65, 0.7);
                border: 1px solid #3a4a5c;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
            }
            
            .inventory-bait-item:hover {
                background-color: rgba(50, 65, 85, 0.8);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .inventory-bait-item.selected {
                border: 1px solid #4a90e2;
                background-color: rgba(74, 144, 226, 0.15);
            }
            
            .inventory-bait-info {
                flex: 1;
            }
            
            .inventory-bait-header {
                margin-bottom: 8px;
            }
            
            .inventory-bait-name-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .inventory-bait-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }
            
            .inventory-bait-name.common { color: #b0b0b0; }
            .inventory-bait-name.uncommon { color: #4ade80; }
            .inventory-bait-name.rare { color: #60a5fa; }
            .inventory-bait-name.epic { color: #c084fc; }
            .inventory-bait-name.legendary { color: #facc15; }
            
            .inventory-bait-quantity {
                color: #8a9cad;
                font-size: 14px;
            }
            
            .inventory-bait-stats {
                color: #b0b0b0;
                font-size: 14px;
            }
            
            .inventory-target-species {
                margin-top: 5px;
                font-style: italic;
            }
            
            .inventory-select-bait-button {
                background-color: #4a6491;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            }
            
            .inventory-select-bait-button:hover {
                background-color: #5a7cb6;
            }
            
            .inventory-bait-item.selected .inventory-select-bait-button {
                background-color: #2c3e50;
            }
            
            /* Items Grid */
            .inventory-items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
            }
            
            .inventory-item-card {
                background-color: rgba(40, 50, 65, 0.7);
                border: 1px solid #3a4a5c;
                border-radius: 6px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
            }
            
            .inventory-item-card:hover {
                background-color: rgba(50, 65, 85, 0.8);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .inventory-item-card.common { border-color: #b0b0b0; }
            .inventory-item-card.uncommon { border-color: #4ade80; }
            .inventory-item-card.rare { border-color: #60a5fa; }
            .inventory-item-card.epic { border-color: #c084fc; }
            .inventory-item-card.legendary { border-color: #facc15; }
            
            .inventory-item-info {
                flex: 1;
                margin-bottom: 15px;
            }
            
            .inventory-item-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .inventory-item-quantity {
                color: #8a9cad;
                font-size: 14px;
                font-weight: normal;
            }
            
            .inventory-item-description {
                color: #b0b0b0;
                font-size: 14px;
                font-style: italic;
            }
            
            .inventory-use-item-button {
                background-color: #4a6491;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
                align-self: flex-end;
            }
            
            .inventory-use-item-button:hover {
                background-color: #5a7cb6;
            }
            
            /* Fish Grid */
            .inventory-fish-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 0;
                padding: 0;
            }
            
            .inventory-fish-card {
                background-color: rgba(40, 50, 65, 0.7);
                border: 1px solid #3a4a5c;
                border-radius: 6px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
            }
            
            .inventory-fish-card:hover {
                background-color: rgba(50, 65, 85, 0.8);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .inventory-fish-card.common { border-color: #b0b0b0; }
            .inventory-fish-card.uncommon { border-color: #4ade80; }
            .inventory-fish-card.rare { border-color: #60a5fa; }
            .inventory-fish-card.epic { border-color: #c084fc; }
            .inventory-fish-card.legendary { border-color: #facc15; }
            
            .inventory-fish-card.equipped {
                background-color: rgba(74, 144, 226, 0.15);
            }
            
            .inventory-fish-info {
                flex: 1;
                margin-bottom: 15px;
            }
            
            .inventory-fish-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 8px;
            }
            
            .inventory-fish-stats {
                color: #b0b0b0;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .inventory-fish-value {
                color: #facc15;
                font-size: 14px;
                font-weight: 500;
            }
            
            .inventory-equip-fish-button {
                background-color: #4a6491;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
                align-self: flex-end;
            }
            
            .inventory-equip-fish-button:hover {
                background-color: #5a7cb6;
            }
            
            .inventory-fish-card.equipped .inventory-equip-fish-button {
                background-color: #2c3e50;
            }
            
            /* Hotbar Styles (fishing/ocean theme) */
            :root {
                --hud-hotbar-size: 50.4px;
                --hud-hotbar-gap: 8px;
                --hud-primary: #1e3a5f;
                --hud-secondary: #2d5a87;
                --hud-border: #4a90e2;
                --hud-text: #ffffff;
                --hud-text-secondary: #b0e0e6;
                --hud-transition: 0.2s ease;
                --hud-box-shadow: 0 4px 16px rgba(30, 58, 95, 0.6), 0 0 8px rgba(74, 144, 226, 0.3);
                --hud-inset-shadow: inset 0 1px 0 rgba(176, 224, 230, 0.2);
                --hud-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            #inventory-toolbar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 900;
                display: flex;
                gap: var(--hud-hotbar-gap);
                align-items: center;
                justify-content: center;
            }

            .hud-hotbar-container {
                position: relative;
                pointer-events: auto;
            }

            .hud-hotbar-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--hud-hotbar-gap);
                background: linear-gradient(145deg, var(--hud-primary), var(--hud-secondary));
                padding: 12px;
                border: 2px solid var(--hud-border);
                border-radius: 12px;
                box-shadow: var(--hud-box-shadow), var(--hud-inset-shadow);
            }

            .hud-hotbar-single-grid {
                display: flex;
                background: linear-gradient(145deg, var(--hud-primary), var(--hud-secondary));
                padding: 12px;
                border: 2px solid var(--hud-border);
                border-radius: 12px;
                box-shadow: var(--hud-box-shadow), var(--hud-inset-shadow);
            }

            .hud-hotbar-slot {
                position: relative;
                width: var(--hud-hotbar-size);
                height: var(--hud-hotbar-size);
                background: rgba(30, 58, 95, 0.7);
                border: 2px solid #4a90e2;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all var(--hud-transition);
                overflow: visible;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 4px rgba(74, 144, 226, 0.2);
            }

            .hud-hotbar-slot:hover {
                border-color: #6bb3ff;
                background: rgba(45, 90, 135, 0.9);
                transform: translateY(-2px);
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(74, 144, 226, 0.4), 0 0 8px rgba(107, 179, 255, 0.3);
            }

            .hud-hotbar-slot-active {
                border-color: #b0e0e6 !important;
                background: rgba(74, 144, 226, 0.2) !important;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 6px rgba(176, 224, 230, 0.5) !important;
            }

            .hud-hotbar-slot-active .hud-hotbar-slot-content {
                color: var(--hud-text-secondary);
            }

            .hud-hotbar-slot-content {
                position: relative;
                z-index: 2;
                font-size: 14px;
                font-weight: 600;
                color: #888;
                text-shadow: var(--hud-text-shadow);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }

            .hud-hotbar-slot-label {
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 9px;
                font-weight: 500;
                color: var(--hud-text-secondary);
                text-shadow: var(--hud-text-shadow);
                opacity: 0.7;
                pointer-events: none;
                white-space: nowrap;
            }

            .hud-hotbar-slot.has-item .hud-hotbar-slot-label {
                display: none;
            }

            .hud-hotbar-key-indicator {
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                width: 18px;
                height: 18px;
                background: linear-gradient(145deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.6));
                border: 1px solid var(--hud-border);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 700;
                color: var(--hud-text);
                text-shadow: var(--hud-text-shadow);
                z-index: 3;
                pointer-events: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            }

            .hud-hotbar-slot-icon {
                width: 43.2px;
                height: 43.2px;
                object-fit: contain;
                image-rendering: pixelated;
                filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
            }

            .hud-hotbar-slot-icon.default-icon {
                width: 28.8px;
                height: 28.8px;
                transform: translateY(-4px);
            }

            .hud-hotbar-slot-quantity {
                position: absolute;
                bottom: 2px;
                right: 2px;
                background: rgba(0, 0, 0, 0.8);
                color: var(--hud-text);
                font-size: 10px;
                font-weight: 700;
                padding: 1px 4px;
                border-radius: 3px;
                line-height: 1;
                text-shadow: var(--hud-text-shadow);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 12px;
                text-align: center;
            }

            /* Mobile responsive hotbar (frontiers-style optimization) */
            body.mobile {
                --hud-hotbar-size: 39.6px;
                --hud-hotbar-gap: 5px;
            }

            body.mobile #inventory-toolbar {
                bottom: 8px;
                gap: 5px;
            }

            body.mobile .hud-hotbar-grid,
            body.mobile .hud-hotbar-single-grid {
                padding: 8px;
                border-radius: 8px;
            }

            body.mobile .hud-hotbar-grid {
                gap: 4px;
            }

            body.mobile .hud-hotbar-slot {
                border-radius: 8px;
                border-width: 2px;
                /* Ensure adequate touch target (minimum 44px recommended) */
                min-width: 44px;
                min-height: 44px;
            }

            body.mobile .hud-hotbar-slot-content {
                font-size: 12px;
            }

            body.mobile .hud-hotbar-slot-icon {
                width: 28.8px;
                height: 28.8px;
            }

            body.mobile .hud-hotbar-slot-icon.default-icon {
                width: 21.6px;
                height: 21.6px;
                transform: translateY(-3px); /* Slightly less offset on mobile */
            }

            body.mobile .hud-hotbar-slot-quantity {
                font-size: 8px;
                padding: 1px 3px;
                bottom: 2px;
                right: 2px;
            }

            body.mobile .hud-hotbar-slot-label {
                font-size: 8px;
                bottom: 2px;
            }

            body.mobile .hud-hotbar-key-indicator {
                width: 16px;
                height: 16px;
                font-size: 9px;
                bottom: -18px;
                border-radius: 3px;
            }

            /* Mobile-specific positioning considerations:
               - Mobile controls: bottom: 40px, right: 40px, z-index: 9000
               - Fishing buttons (cast/jig/reel): bottom: 120px, right: 30px, z-index: 1000
               - Breath bubbles: bottom: 110px, center
               - Hotbar: bottom: 8px, center, z-index: 900
               Hotbar is positioned well below all other UI elements to avoid conflicts */
            
            /* Hide hotbar when tacklebox is open (same behavior as fishing buttons) */
            body.mobile:has(#tacklebox-ui[style*="flex"]) #inventory-toolbar {
                display: none !important;
            }
            
            /* Note: Hotbar tiles (rod, bait, fish) are no longer hidden during fishing mini-game */
            
            /* Ensure adequate spacing from bottom edge on mobile */
            body.mobile #inventory-toolbar {
                padding-bottom: 4px;
            }

            .inventory-quick-select-header {
                background: linear-gradient(to right, #2c3e50, #4a6491) !important;
                padding: 10px 15px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-bottom: 1px solid #3a4a5c !important;
            }
            
            .inventory-quick-select-header h3 {
                margin: 0 !important;
                color: #ffffff !important;
                font-size: 16px !important;
                font-weight: 600 !important;
            }
            
            .inventory-quick-close {
                font-size: 20px !important;
                cursor: pointer !important;
                color: #ffffff !important;
            }
            
            .inventory-quick-select-content {
                padding: 10px !important;
                overflow-y: auto !important;
                max-height: 250px !important;
            }
            
            .inventory-quick-bait-option {
                display: flex !important;
                align-items: center !important;
                padding: 8px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                transition: background-color 0.2s !important;
                margin-bottom: 5px !important;
                position: relative !important;
            }
            
            .inventory-quick-bait-option:hover {
                background-color: rgba(74, 100, 145, 0.3) !important;
            }
            
            .inventory-quick-bait-option.selected {
                background-color: rgba(74, 144, 226, 0.15) !important;
                border: 1px solid #4a90e2 !important;
            }
            
            .inventory-quick-bait-hotkey {
                position: absolute !important;
                right: 8px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                background-color: #2c3e50 !important;
                color: white !important;
                border-radius: 4px !important;
                padding: 2px 6px !important;
                font-size: 11px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .inventory-quick-bait-icon {
                width: 24px !important;
                height: 24px !important;
                margin-right: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .inventory-quick-bait-icon img {
                max-width: 100% !important;
                max-height: 100% !important;
            }
            
            .inventory-quick-bait-info {
                flex: 1 !important;
            }
            
            .inventory-quick-bait-name {
                font-weight: 500 !important;
                color: #ffffff !important;
            }
            
            .inventory-quick-bait-name.common { color: #b0b0b0 !important; }
            .inventory-quick-bait-name.uncommon { color: #4ade80 !important; }
            .inventory-quick-bait-name.rare { color: #60a5fa !important; }
            .inventory-quick-bait-name.epic { color: #c084fc !important; }
            .inventory-quick-bait-name.legendary { color: #facc15 !important; }
            
            .inventory-quick-bait-quantity {
                font-size: 12px !important;
                color: #8a9cad !important;
            }
            
            /* Mobile touch improvements */
            body.mobile .inventory-sidebar-button {
                padding: 15px;  /* Larger padding for better touch targets */
            }

            body.mobile .inventory-close-button {
                font-size: 36px;  /* Larger close button */
                padding: 10px;
            }

            body.mobile .inventory-equip-button,
            body.mobile .inventory-select-bait-button,
            body.mobile .inventory-equip-fish-button {
                padding: 12px 20px;  /* Larger buttons */
                font-size: 16px;
            }

            /* Make sure touch targets have at least 44px height */
            body.mobile .inventory-panel-main button,
            body.mobile .inventory-panel-sidebar button {
                min-height: 44px;
            }
            
            /* Mobile improvements for scrollable areas */
            body.mobile .inventory-panel-main {
                padding-right: 25px; /* Extra padding on the right for better thumb scrolling */
                padding-bottom: 100px; /* Add extra padding at the bottom for better visibility of last items */
            }
            
            /* Make scrollable tab content areas more mobile-friendly */
            body.mobile .inventory-tab-content {
                padding-bottom: 40px;
            }
            
            /* Increase spacing between items on mobile for easier scrolling */
            body.mobile .inventory-rod-item,
            body.mobile .inventory-bait-item,
            body.mobile .inventory-fish-card {
                margin-bottom: 20px;
            }
            
            /* Mobile Scroll Controls */
            .mobile-scroll-control {
                display: none;
                position: absolute;
                right: 15px;  /* Positioned on the right */
                top: 50%;
                transform: translateY(-50%);
                width: 50px;
                height: 240px;
                background-color: rgba(30, 40, 55, 0.8);
                border: 2px solid #4a6491;
                border-radius: 25px;
                z-index: 1010;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 20px 0;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }
            
            /* Only show on mobile when inventory is open */
            body.mobile .inventory-panel-main .mobile-scroll-control {
                display: flex;
            }
            
            .scroll-button {
                width: 40px;
                height: 40px;
                background-color: #4a90e2;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                user-select: none;
            }
            
            .scroll-up:after {
                content: "↑";
            }
            
            .scroll-down:after {
                content: "↓";
            }
            
            .scroll-slider {
                width: 8px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                position: relative;
            }
            
            .scroll-handle {
                width: 26px;
                height: 26px;
                background-color: #4a90e2;
                border: 2px solid #fff;
                border-radius: 50%;
                position: absolute;
                left: -9px;
                top: 0;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // Add this method to create and set up the scroll controls
    addMobileScrollControls() {
        if (!hytopia.isMobile) return;
        
        const mainContent = document.querySelector('.inventory-panel-main');
        if (!mainContent) return;
        
        // Check if scroll controls already exist
        if (mainContent.querySelector('.mobile-scroll-control')) {
            console.log('Mobile scroll controls already exist');
            return;
        }
        
        // Create scroll control container
        const scrollControl = document.createElement('div');
        scrollControl.className = 'mobile-scroll-control';
        scrollControl.style.position = 'absolute';
        scrollControl.style.right = '15px';  // Position on the right
        scrollControl.style.top = '50%';
        scrollControl.style.transform = 'translateY(-20%)';
        scrollControl.style.zIndex = '1010';
        scrollControl.style.display = 'flex';
        
        // Create up button
        const scrollUpBtn = document.createElement('div');
        scrollUpBtn.className = 'scroll-button scroll-up';
        
        // Create slider
        const scrollSlider = document.createElement('div');
        scrollSlider.className = 'scroll-slider';
        
        // Create handle
        const scrollHandle = document.createElement('div');
        scrollHandle.className = 'scroll-handle';
        scrollSlider.appendChild(scrollHandle);
        
        // Create down button
        const scrollDownBtn = document.createElement('div');
        scrollDownBtn.className = 'scroll-button scroll-down';
        
        // Add elements to container
        scrollControl.appendChild(scrollUpBtn);
        scrollControl.appendChild(scrollSlider);
        scrollControl.appendChild(scrollDownBtn);
        
        // Add container to main content
        mainContent.appendChild(scrollControl);
        
        // Set initial handle position based on current scroll
        const maxScroll = mainContent.scrollHeight - mainContent.clientHeight;
        if (maxScroll > 0) {
            const scrollRatio = mainContent.scrollTop / maxScroll;
            const sliderHeight = scrollSlider.clientHeight - scrollHandle.clientHeight;
            scrollHandle.style.top = `${scrollRatio * sliderHeight}px`;
        }
        
        // Set up event listeners
        
        // Up button - scroll up when pressed
        scrollUpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const scrollInterval = setInterval(() => {
                mainContent.scrollTop -= 20;
            }, 50);
            
            // Clear interval when touch ends
            const clearScrolling = () => {
                clearInterval(scrollInterval);
                document.removeEventListener('touchend', clearScrolling);
            };
            
            document.addEventListener('touchend', clearScrolling);
        });
        
        // Down button - scroll down when pressed
        scrollDownBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const scrollInterval = setInterval(() => {
                mainContent.scrollTop += 20;
            }, 50);
            
            // Clear interval when touch ends
            const clearScrolling = () => {
                clearInterval(scrollInterval);
                document.removeEventListener('touchend', clearScrolling);
            };
            
            document.addEventListener('touchend', clearScrolling);
        });
        
        // Slider handle dragging
        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        
        scrollHandle.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startTop = parseInt(scrollHandle.style.top || '0');
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const deltaY = e.touches[0].clientY - startY;
            const sliderHeight = scrollSlider.clientHeight - scrollHandle.clientHeight;
            
            // Calculate new position, constrained to the slider
            let newTop = Math.max(0, Math.min(sliderHeight, startTop + deltaY));
            scrollHandle.style.top = `${newTop}px`;
            
            // Calculate and set scroll position
            const scrollRatio = newTop / sliderHeight;
            const maxScroll = mainContent.scrollHeight - mainContent.clientHeight;
            mainContent.scrollTop = scrollRatio * maxScroll;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        // Update slider position when content is scrolled
        mainContent.addEventListener('scroll', () => {
            const maxScroll = mainContent.scrollHeight - mainContent.clientHeight;
            if (maxScroll <= 0) return; // Don't update if there's nothing to scroll
            
            const scrollRatio = mainContent.scrollTop / maxScroll;
            const sliderHeight = scrollSlider.clientHeight - scrollHandle.clientHeight;
            scrollHandle.style.top = `${scrollRatio * sliderHeight}px`;
        });
        
        // Make sure the scroll control is visible and positioned correctly
        scrollControl.style.display = 'flex';
        
        console.log('Mobile scroll controls added on the right side');
    }

    addIconStyles() {
        console.log('Setting up icon styles with dynamic paths');
        
        // Apply background images to tab icons using the same approach as bait items
        setTimeout(() => {
            const baseUrl = this.getAssetBaseUrl();
            console.log('Using base URL for icons:', baseUrl);
            
            // Apply to rod icon
            const rodIcons = document.querySelectorAll('.rod-icon');
            rodIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/oak_rod_sprite.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });
            
            // Apply to worm icon
            const wormIcons = document.querySelectorAll('.worm-icon');
            wormIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/worm_sprite.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });

            const fishIcons = document.querySelectorAll('.fish-icon');
            fishIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/icon_fish.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });

            const crateIcons = document.querySelectorAll('.crate-icon');
            crateIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/seaweed_sprite.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });
            
            // Apply to chest icon
            const chestIcons = document.querySelectorAll('.chest-icon');
            chestIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/common_chest_sprite.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });
            
            // Apply to backpack icon if needed
            const backpackIcons = document.querySelectorAll('.backpack-icon');
            backpackIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/backpack.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '40px';
                icon.style.height = '40px';
            });
            
            
            // Add to codex icon
            const codexIcons = document.querySelectorAll('.phshdex-icon');
            codexIcons.forEach(icon => {
                icon.style.backgroundImage = `url('${baseUrl}/ui/icons/hook_sprite.png')`;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.style.width = '24px';
                icon.style.height = '24px';
                icon.style.marginRight = '12px';
            });
            
            console.log('Applied dynamic background images to icons');
        }, 100); // Small delay to ensure elements are in the DOM
    }
    setupEventListeners() {
        // Close button for main inventory
        document.querySelector('.inventory-close-button').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Explicitly hide all tooltips first before closing the panel
            this.hideAllTooltips();
            this.toggleEquipmentMenu(false);
        });

        // Sidebar tab buttons
        document.querySelectorAll('.inventory-sidebar-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showTab(button.dataset.tab);
            });

            // For mobile touches
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showTab(button.dataset.tab);
                console.log('Touch on sidebar button:', button.dataset.tab);
            });
        });

        // Toolbar slots
        document.querySelectorAll('.inventory-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const slotNum = parseInt(slot.dataset.slot);
                this.activateToolbarSlot(slotNum);
            });
        });

        // Handle ESC key to close inventory
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                // Dismiss any mobile tooltips first
                if (hytopia.isMobile && this.dismissMobileTooltips) {
                    this.dismissMobileTooltips();
                }
                this.toggleEquipmentMenu(false);
            }
        });
    }

    toggleEquipmentMenu(force) {
        const menu = document.getElementById('inventory-equipment-menu');
        this.equipmentMenuOpen = force !== undefined ? force : !this.equipmentOpen;
        
        if (this.equipmentMenuOpen) {
            menu.style.display = 'flex';
            menu.style.pointerEvents = 'all';
            hytopia.sendData({ type: 'disablePlayerInput' });
            
            // Hide mobile controls when inventory is opened
            if (hytopia.isMobile) {
                this.hideMobileControls();
                
                // Make header smaller on mobile
                this.adjustHeaderForMobile(true);
            }
            
            // Hide chat window when inventory is opened
            this.hideChatWindow(true);
        } else {
            menu.style.display = 'none';
            menu.style.pointerEvents = 'none';
            hytopia.sendData({ type: 'enablePlayerInput' });
            
            // Show mobile controls when inventory is closed
            if (hytopia.isMobile) {
                this.showMobileControls();
                
                // Reset header when closing inventory
                this.adjustHeaderForMobile(false);
            }
            
            // Show chat window again when inventory is closed
            this.hideChatWindow(false);
            
            // Hide all tooltips when closing the inventory
            this.hideAllTooltips();
        }
    }

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
            document.getElementById('mobile-fishing-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Hide elements by ID
        mobileControls.forEach(element => {
            if (element) {
                console.log(`Hiding mobile control: ${element.id}`);
                element.style.display = 'none';
            }
        });
        
        // Hide elements by class
        controlButtons.forEach(button => {
            if (button) {
                console.log('Hiding mobile control button by class');
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
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Show elements by ID
        mobileControls.forEach(element => {
            if (element) {
                console.log(`Showing mobile control: ${element.id}`);
                element.style.display = '';  // Reset to default display value
            }
        });
        
        // Show elements by class
        controlButtons.forEach(button => {
            if (button) {
                console.log('Showing mobile control button by class');
                button.style.display = '';   // Reset to default display value
            }
        });
    }

    // Add new method to hide/show chat window
    hideChatWindow(hide) {
        // Create or get the style element
        let chatStyle = document.getElementById('inventory-chat-style');
        
        if (hide) {
            // Create style element if it doesn't exist
            if (!chatStyle) {
                chatStyle = document.createElement('style');
                chatStyle.id = 'inventory-chat-style';
                chatStyle.textContent = `
                    #chat-window {
                    display: none !important;
                    }
                `;
                document.head.appendChild(chatStyle);
            }
        } else {
            // Remove style element if it exists
            if (chatStyle) {
                chatStyle.remove();
            }
        }
    }

    // New method to hide all tooltips
    hideAllTooltips() {
        // Hide the bait tooltip
        const tooltip = document.getElementById('bait-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        // Hide any notifications
        const notification = document.getElementById('bait-notification');
        if (notification) {
            notification.classList.remove('show');
        }
        
        // Hide any hotkey notifications
        const hotkeyNotification = document.getElementById('bait-hotkey-notification');
        if (hotkeyNotification) {
            hotkeyNotification.style.display = 'none';
        }
        
        console.log('All tooltips and notifications hidden');
    }

    showTab(tabName) {
        // Hide all tab content
        document.querySelectorAll('.inventory-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Update active sidebar button
        document.querySelectorAll('.inventory-sidebar-button').forEach(button => {
            button.classList.remove('active');
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            }
        });

        this.currentTab = tabName;
    }

    updateInventory(inventory) {
        
        // Cache the inventory for potential future use
        this.lastInventory = inventory;
        
        // Cache bait items for quick select
        this.cachedBaitItems = inventory.items.filter(item => item.type === 'bait');
        
        // Update all tabs with inventory data
        this.updateRodsTab(inventory);
        this.updateBaitTab(inventory);
        this.updateItemsTab(inventory);
        this.updateChestsTab(inventory);
        this.updateFishTab(inventory);
        this.updatePhshdexTab(inventory);
        
        // Update toolbar displays
        this.updateToolbarDisplay(inventory);
    }

    updateRodsTab(inventory) {
        const rodsTab = document.getElementById('rods-tab');
        if (!rodsTab) return;
        
        rodsTab.innerHTML = '';

        // Sort rods to show newest first
        const sortedRods = inventory.items
            .filter(item => item.type === 'rod')
            .reverse();
        
        if (sortedRods.length === 0) {
            rodsTab.innerHTML = '<div class="inventory-empty-message">No fishing rods available</div>';
            return;
        }

        // Always use the grid layout (formerly mobile)
        const rodGrid = document.createElement('div');
        rodGrid.className = 'rod-inventory-grid';
        rodGrid.style.display = 'grid';
        rodGrid.style.gridTemplateColumns = 'repeat(10, 1fr)';
        rodGrid.style.gap = '0';
        rodGrid.style.padding = '0';
        
        // Get the asset base URL for icons
        const baseUrl = this.getAssetBaseUrl();
        
        // Add each rod as a grid item
        sortedRods.forEach(rod => {
            const rodIconPath = `${baseUrl}/ui/icons/${rod.sprite}`; 

            const rodElement = document.createElement('div');
            rodElement.className = `rod-grid-item ${rod.rarity} ${rod.equipped ? 'equipped' : ''}`;
            rodElement.dataset.rodId = rod.id;
            
            // Style the rod item for grid
            rodElement.style.width = '60px';
            rodElement.style.height = '60px';
            rodElement.style.padding = '8px 5px';
            rodElement.style.display = 'flex';
            rodElement.style.flexDirection = 'column';
            rodElement.style.alignItems = 'center';
            
            // Add rod icon
            const iconImg = document.createElement('img');
            iconImg.src = rodIconPath;
            iconImg.alt = 'Rod';
            iconImg.style.width = '32px';
            iconImg.style.height = '32px';
            iconImg.style.objectFit = 'contain';
            iconImg.style.marginBottom = '4px';
            
            // Add rod name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = rod.name || 'Rod';
            nameSpan.style.fontSize = '10px';
            nameSpan.style.textAlign = 'center';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '100%';
            
            rodElement.appendChild(iconImg);
            rodElement.appendChild(nameSpan);
            
            rodElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            rodElement.style.border = rod.equipped ? '2px solid #4a90e2' : '2px solid #3a4a5c';
            rodElement.style.borderRadius = '10px';
            rodElement.style.position = 'relative';
            
            // Add a subtle checkmark if equipped
            if (rod.equipped) {
                const equippedMark = document.createElement('div');
                equippedMark.style.position = 'absolute';
                equippedMark.style.top = '3px';
                equippedMark.style.right = '3px';
                equippedMark.style.fontSize = '10px';
                equippedMark.style.color = '#4a90e2';
                equippedMark.textContent = '✓';
                rodElement.appendChild(equippedMark);
            }
            
            // Function to equip the rod - shared between click and touch
            const equipRod = (e) => {
                // Prevent default behavior to ensure our handler runs
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                

                
                // Send data to server to equip the rod
                hytopia.sendData({
                    type: 'equipItem', 
                    itemId: rod.id
                });
                
                // Update UI immediately for better responsiveness
                document.querySelectorAll('.rod-grid-item').forEach(item => {
                    item.classList.remove('equipped');
                    item.style.border = '2px solid #3a4a5c';
                    item.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
                    
                    // Remove checkmark if exists
                    const checkmark = item.querySelector('div[style*="position: absolute"]');
                    if (checkmark) checkmark.remove();
                    
                    // Reset name font weight
                    const nameEl = item.querySelector('.rod-name');
                    if (nameEl) nameEl.style.fontWeight = 'normal';
                });
                
                rodElement.classList.add('equipped');
                rodElement.style.border = '2px solid #4a90e2';
                rodElement.style.backgroundColor = 'rgba(74, 144, 226, 0.15)';
                
                // Add checkmark to newly equipped rod
                if (!rodElement.querySelector('div[style*="position: absolute"]')) {
                    const equippedMark = document.createElement('div');
                    equippedMark.style.position = 'absolute';
                    equippedMark.style.top = '3px';
                    equippedMark.style.right = '3px';
                    equippedMark.style.fontSize = '10px';
                    equippedMark.style.color = '#4a90e2';
                    equippedMark.textContent = '✓';
                    rodElement.appendChild(equippedMark);
                }
                
                // Bold the name
                const nameEl = rodElement.querySelector('.rod-name');
                if (nameEl) nameEl.style.fontWeight = 'bold';
                
                this.currentRod = rod.id;
                this.lastEquippedRod = rod.id;
                
                // Toolbar will be updated via updateToolbarDisplay() when inventory update arrives
            };
            
            // Add click event for desktop and mouse
            rodElement.addEventListener('click', equipRod);
            
            // Add proper touch event handling
            let touchStarted = false;
            let longPressTimer = null;
            
            // Handle touch start - detect long press for tooltip
            rodElement.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                touchStarted = true;
                
                // Set up timer for long press (tooltip)
                longPressTimer = setTimeout(() => {
                    this.showRodTooltip(rod, e);
                    touchStarted = false; // Prevent tap after tooltip
                }, 500);
            });
            
            // Clear timer on touch move
            rodElement.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
            });
            
            // Handle touch end - equip rod if it was a tap
            rodElement.addEventListener('touchend', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                
                // Clear long press timer
                if (longPressTimer) clearTimeout(longPressTimer);
                
                // If this was a tap (not long press or move), equip the rod
                if (touchStarted) {

                    equipRod(e);
                }
                
                // Hide tooltip if showing
                setTimeout(() => {
                    const tooltip = document.getElementById('rod-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                }, 100);
                
                touchStarted = false;
            });
            
            // Cancel touch interaction on touch cancel
            rodElement.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
                
                // Hide tooltip if showing
                const tooltip = document.getElementById('rod-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            // Add tooltip on hover for desktop
            rodElement.addEventListener('mouseenter', (e) => {
                this.showRodTooltip(rod, e);
            });
            
            rodElement.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('rod-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            rodGrid.appendChild(rodElement);
            
            if (rod.equipped) {
                this.currentRod = rod.id;
                this.lastEquippedRod = rod.id;
            }
        });
        
        rodsTab.appendChild(rodGrid);

    }

    // Add a method for rod tooltips
    showRodTooltip(rod, event) {
        // Create tooltip if it doesn't exist
        let tooltip = document.getElementById('rod-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'rod-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '3000';
            tooltip.style.backgroundColor = 'rgba(22, 28, 36, 0.95)';
            tooltip.style.border = '1px solid #4a90e2';
            tooltip.style.borderRadius = '8px';
            tooltip.style.padding = '12px';
            tooltip.style.maxWidth = '280px';
            tooltip.style.color = 'white';
            tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
            tooltip.style.display = 'none';
            tooltip.style.fontFamily = 'Arial, sans-serif';
            tooltip.style.fontSize = '13px';
            tooltip.style.lineHeight = '1.4';
            document.body.appendChild(tooltip);
        }

        // Get rod stats and metadata
        const stats = rod.metadata.rodStats;
        const catchSpeed = stats.catchSpeed ?? 1;
        const drag = stats.drag ?? 1;
        const catchZone = stats.catchZone ?? 1;
        const lootScore = stats.lootScore ?? 1;
        const maxDistance = stats.maxDistance || 0;
        const maxWeight = stats.maxCatchWeight || 0;
        const luck = stats.luck || 0;

        // Determine rod type and enchantment slots based on comprehensive logic
        const rodType = this.determineRodType(rod);
        const enchantmentSlots = this.getEnchantmentSlots(rodType);
        
        // Get current enchantments (placeholder for now)
        const currentEnchantments = rod.enchantments || [];
        
        // Build header with rod name and enchantment slots
        const rarityColor = this.getRarityColor(rod.rarity || 'common');
        
        let headerHTML = `
            <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span style="font-size: 16px; font-weight: bold; color: ${rarityColor};">🎣 ${rod.name}</span>
                </div>`;
        
        // Only show enchantment slots if there are enchantments
        if (currentEnchantments.length > 0) {
            headerHTML += `<div style="display: flex; gap: 5px; justify-content: center; margin-top: 5px;">`;
            // Add enchantment slots to header
            for (let i = 0; i < enchantmentSlots; i++) {
                if (i < currentEnchantments.length) {
                    headerHTML += `<div style="width: 20px; height: 20px; background: rgba(74,144,226,0.6); border: 1px solid #4a90e2; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px;">⚡</div>`;
                } else {
                    headerHTML += `<div style="width: 20px; height: 20px; background: rgba(60,60,60,0.5); border: 1px dashed #666; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666;">○</div>`;
                }
            }
            headerHTML += `</div>`;
        }
        headerHTML += `</div>`;

        // Build enchantments section (only show if enchantments exist)
        let enchantmentHTML = '';
        if (currentEnchantments.length > 0) {
            enchantmentHTML += `<div style="text-align: center; margin-bottom: 10px;">`;
            currentEnchantments.forEach(enchant => {
                enchantmentHTML += `<span style="color: #4a90e2; font-size: 12px; margin: 0 2px;">[${enchant.name}]</span>`;
            });
            enchantmentHTML += `</div>`;
        }
        
        // Build core stats in a single row
        let statsGridHTML = `
            <div style="margin-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #e0e0e0;">Core Stats:</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <div>Luck: ${this.formatStatPercent(luck)}</div>
                    <div>Range: <span style="color: #ff9800; font-weight: 600;">${maxDistance}m</span></div>
                    <div>Max Weight: <span style="color: #9c27b0; font-weight: 600;">${maxWeight}lb</span></div>
                </div>
            </div>
        `;

        // Build attribute boosts section
        let boostsHTML = `
            <div style="margin-bottom: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #e0e0e0;">Attribute Boosts:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                    <div>Catch Speed: ${this.formatStatPercent(catchSpeed)}</div>
                    <div>Drag: ${this.formatStatPercent(drag)}</div>
                    <div>Catch Zone: ${this.formatStatPercent(catchZone)}</div>
                    <div>Loot Score: ${this.formatStatPercent(lootScore)}</div>
                </div>
            </div>
        `;

        // Build description/special ability section
        let descriptionHTML = '';
        const description = rod.description || this.getDefaultRodDescription(rod);
        const specialAbility = rod.specialAbility || this.getRodSpecialAbility(rod);
        
        if (specialAbility || description) {
            descriptionHTML = `
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                    ${specialAbility ? `<div style="font-size: 11px; font-weight: 600; color: #facc15; margin-bottom: 3px;">Special: ${specialAbility}</div>` : ''}
                    <div style="font-size: 11px; color: #b0b0b0; font-style: italic; line-height: 1.3;">${description}</div>
                </div>
            `;
        }

        // Combine all sections
        tooltip.innerHTML = headerHTML + enchantmentHTML + statsGridHTML + boostsHTML + descriptionHTML;

        // Position the tooltip near the pointer/touch
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        tooltip.style.left = `${clientX + 20}px`;
        tooltip.style.top = `${clientY - 100}px`;

        // Make sure tooltip stays on screen
        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = `${window.innerWidth - tooltipRect.width - 20}px`;
            }
            if (tooltipRect.top < 0) {
                tooltip.style.top = '20px';
            }
        }, 0);

        // Show the tooltip
        tooltip.style.display = 'block';
    }

    updateBaitTab(inventory) {
        const baitTab = document.getElementById('bait-tab');
        baitTab.innerHTML = '';
        
        // Filter bait items and sort with equipped first
        const baitItems = inventory.items
            .filter(item => item.type === 'bait')
            .sort((a, b) => {
                // Secondary sort by name to maintain consistent order
                return a.name.localeCompare(b.name);
            });
        
        if (baitItems.length === 0) {
            baitTab.innerHTML = '<div class="inventory-empty-message">No bait available</div>';
            return;
        }
        
        // Always use the grid layout for bait
        const baitGrid = document.createElement('div');
        baitGrid.className = 'bait-grid';
        baitGrid.style.display = 'grid';
        baitGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        baitGrid.style.gap = '0';
        baitGrid.style.padding = '0';
        
        // Add each bait as a grid item
        baitItems.forEach(bait => {
                    const baitElement = document.createElement('div');
            // Important: Add 'equipped' class for highlighting
            baitElement.className = `bait-item ${bait.equipped ? 'equipped' : ''}`;
                    baitElement.dataset.baitId = bait.id;
            
            // Style to match the rod items
            baitElement.style.position = 'relative';
            baitElement.style.width = '60px';
            baitElement.style.height = '60px';
            baitElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            baitElement.style.border = bait.equipped ? '2px solid #4a90e2' : '2px solid #3a4a5c';
            baitElement.style.borderRadius = '10px';
            baitElement.style.padding = '8px 5px';
            baitElement.style.display = 'flex';
            baitElement.style.flexDirection = 'column';
            baitElement.style.alignItems = 'center';
            baitElement.style.justifyContent = 'center';
                    
                    // Get sprite path for this bait
                    const baseUrl = this.getAssetBaseUrl();
                    let spritePath = '';
                    if (bait.sprite) {
                        if (!bait.sprite.includes('/')) {
                            spritePath = `${baseUrl}/ui/icons/${bait.sprite}`;
                        } else {
                            spritePath = `${baseUrl}${bait.sprite}`;
                        }
                    } else if (bait.id.includes('worm')) {
                        spritePath = `${baseUrl}/ui/icons/worm_sprite.png`;
                    } else {
                        spritePath = `${baseUrl}/ui/icons/bait/${bait.id}.png`;
                    }
                    
            // Use the existing mobile layout HTML with consistent sizing
                    baitElement.innerHTML = `
                <div class="bait-icon" style="background-image: url('${spritePath}'); width: 32px; height: 32px; background-size: contain; background-repeat: no-repeat; background-position: center; margin-bottom: 4px;"></div>
                <div class="bait-name ${bait.rarity}" style="font-size: 10px; text-align: center; margin-top: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${bait.name}</div>
                <div class="bait-quantity" style="position: absolute; bottom: 5px; right: 5px; background: transparent; color: white; font-size: 8px; padding: 1px 3px; border-radius: 8px;">×${bait.quantity}</div>
            `;
            
            // Add equip functionality
            const equipBait = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // If already equipped, do nothing to prevent reordering
                if (bait.equipped) {
                    console.log(`Bait ${bait.id} already equipped`);
                    return;
                }
                
                console.log(`Equipping bait: ${bait.id}`);
                
                // Send equip command to the server
                this.equipBait(bait.id);
                
                // Update UI immediately for responsiveness
                document.querySelectorAll('.bait-item').forEach(item => {
                    item.classList.remove('equipped');
                    item.style.border = '1px solid #666';
                    item.style.boxShadow = 'none';
                });
                
                baitElement.classList.add('equipped');
                
                // Mark this bait as equipped in our local data
                baitItems.forEach(b => {
                    b.equipped = (b.id === bait.id);
                });
            };
            
            // Add click and touch handlers
            baitElement.addEventListener('click', equipBait);

            if (hytopia.isMobile) {
                baitElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    equipBait(e);
                });
            }

            // Add tooltip on hover for desktop
            baitElement.addEventListener('mouseenter', (e) => {
                this.showBaitTooltip(bait, e);
            });
            baitElement.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('bait-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
                    
                    baitGrid.appendChild(baitElement);
                });
        
        baitTab.appendChild(baitGrid);
    }

    updateHotbarDisplay() {
        console.log('updateHotbarDisplay called');
        console.log('Current baitHotbar:', this.baitHotbar);
        
        const hotbarSlots = document.querySelectorAll('.bait-hotbar-slot');
        console.log(`Found ${hotbarSlots.length} hotbar slots`);
        
        if (hotbarSlots.length === 0) {
            console.error('No hotbar slots found in the DOM');
            return;
        }
        
        hotbarSlots.forEach((slot, index) => {
            console.log(`Processing slot ${index}`);
            
            // Clear existing content except slot number
            const slotNumber = slot.querySelector('.hotbar-slot-number');
            if (slotNumber) {
                console.log(`Slot ${index} has slot number element, preserving it`);
                slot.innerHTML = '';
                slot.appendChild(slotNumber);
            } else {
                console.log(`Slot ${index} missing slot number, creating new one`);
                slot.innerHTML = '';
                const newSlotNumber = document.createElement('span');
                newSlotNumber.className = 'hotbar-slot-number';
                newSlotNumber.textContent = index + 1;
                slot.appendChild(newSlotNumber);
            }
            
            const baitData = this.baitHotbar[index];
            console.log(`Slot ${index} bait data:`, baitData);
            
            if (baitData) {
                console.log(`Slot ${index} has bait assigned: ${baitData}`);
                
                // Check if the bait still exists in the inventory
                if (!this.cachedBaitItems) {
                    console.error('cachedBaitItems is null or undefined');
                    return;
                }
                
                console.log(`Checking if bait ${baitData} exists in inventory of ${this.cachedBaitItems.length} items`);
                const baitStillExists = this.cachedBaitItems.some(item => item.id === baitData);
                console.log(`Bait ${baitData} exists in inventory: ${baitStillExists}`);
                
                if (baitStillExists) {
                    // Get the current bait data from the inventory
                    const currentBait = this.cachedBaitItems.find(item => item.id === baitData);
                    console.log(`Found current bait data:`, currentBait);
                    
                    // Get sprite path
                    const baseUrl = this.getAssetBaseUrl();
                    let spritePath = '';
                    
                    if (currentBait.sprite) {
                        if (!currentBait.sprite.includes('/')) {
                            spritePath = `${baseUrl}/ui/icons/${currentBait.sprite}`;
                        } else {
                            spritePath = `${baseUrl}${currentBait.sprite}`;
                        }
                    } else if (currentBait.id.includes('worm')) {
                        spritePath = `${baseUrl}/ui/icons/worm_sprite.png`;
                    } else {
                        spritePath = `${baseUrl}/ui/icons/bait/${currentBait.id}.png`;
                    }
                    console.log(`Using sprite path: ${spritePath}`);
                    
                    // Create bait element
                    const baitElement = document.createElement('div');
                    baitElement.className = 'bait-item in-hotbar';
                    baitElement.dataset.baitId = currentBait.id;
                    
                    baitElement.innerHTML = `
                        <div class="bait-icon" style="background-image: url('${spritePath}');"></div>
                        <div class="bait-quantity">x${currentBait.quantity}</div>
                    `;
                    
                    slot.appendChild(baitElement);
                    console.log(`Added bait element to slot ${index}`);
                    
                    // Highlight if equipped
                    if (currentBait.equipped) {
                        console.log(`Bait ${currentBait.id} is equipped, highlighting slot ${index}`);
                        slot.classList.add('equipped');
                    } else {
                        slot.classList.remove('equipped');
                    }
                } else {
                    console.log(`Bait ${baitData} no longer exists in inventory, removing from slot ${index}`);
                    // Bait no longer exists in inventory, remove from hotbar
                    this.baitHotbar[index] = null;
                    this.saveHotbar();
                }
            } else {
                console.log(`Slot ${index} is empty`);
            }
        });
        
        console.log('updateHotbarDisplay completed');
    }

    setupBaitHotbarDragAndDrop() {
        const hotbarSlots = document.querySelectorAll('.bait-hotbar-slot');
        
        hotbarSlots.forEach((slot, index) => {
            // Make slots droppable
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
                
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.type === 'bait') {
                        this.assignBaitToHotbarSlot(index, data.id);
                    }
                } catch (error) {
                    console.error('Error parsing drag data:', error);
                }
            });
            
            // Click to equip if bait is assigned
            slot.addEventListener('click', () => {
                const baitId = this.baitHotbar[index];
                if (baitId) {
                    this.equipBait(baitId);
                }
            });
        });
    }

    getBaitById(baitId) {
        if (!this.cachedBaitItems) return null;
        return this.cachedBaitItems.find(bait => bait.id === baitId);
    }

    assignBaitToHotbarSlot(slotIndex, baitId) {
        console.log(`Assigning bait ${baitId} to hotbar slot ${slotIndex}`);
        if (slotIndex < 0 || slotIndex >= this.baitHotbar.length) return;
        console.log(`Bait hotbar: ${this.baitHotbar}`);
        
        // Check if this bait is already in another slot
        const existingSlotIndex = this.baitHotbar.indexOf(baitId);
        if (existingSlotIndex !== -1 && existingSlotIndex !== slotIndex) {
            console.log(`Bait ${baitId} is already in slot ${existingSlotIndex}`);
            
            // Show notification to user
            this.showNotification(`This bait is already assigned to slot ${existingSlotIndex + 1}`);
            
            // Don't allow the drop
            return;
        }
        
        // Assign bait to slot
        this.baitHotbar[slotIndex] = baitId;
        
        // Save to localStorage
        this.saveHotbar();
        
        // Update display with a small delay to ensure DOM is ready
        setTimeout(() => {
            this.updateHotbarDisplay();
        }, 10); // 10ms delay
        
        console.log(`Assigned bait ${baitId} to hotbar slot ${slotIndex}`);
    }

    saveHotbar() {
        try {
            localStorage.setItem('baitHotbar', JSON.stringify(this.baitHotbar));
        } catch (error) {
            console.error('Error saving bait hotbar:', error);
        }
    }

    loadBaitHotbar() {
        try {
            const saved = localStorage.getItem('baitHotbar');
            if (saved) {
                // Load the saved configuration
                const savedHotbar = JSON.parse(saved);
                
                // Initialize with nulls
                this.baitHotbar = [null, null, null, null, null];
                
                // Only copy valid entries from saved data
                for (let i = 0; i < savedHotbar.length && i < this.baitHotbar.length; i++) {
                    if (savedHotbar[i]) {
                        // We'll validate each saved item when we display it
                        this.baitHotbar[i] = savedHotbar[i];
                    }
                }
            } else {
                // Initialize with empty slots
                this.baitHotbar = [null, null, null, null, null];
            }
        } catch (error) {
            console.error('Error loading bait hotbar:', error);
            this.baitHotbar = [null, null, null, null, null];
        }
    }

    addBaitStyles() {
        const style = document.createElement('style');
        style.id = 'bait-styles';
        style.textContent = `
            /* Bait tab layout similar to crafting panel */
            .bait-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 10px;
            }
            
            /* Hotbar section */
            .bait-hotbar-section {
                background: rgba(10, 22, 34, 0.5);
                border-radius: 8px;
                padding: 15px;
            }
            
            .bait-hotbar-section h3 {
                color: #4a90e2;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
                border-bottom: 1px solid #4a90e2;
                padding-bottom: 5px;
            }
            
            .bait-hotbar-grid {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 10px;
            }
            
            .bait-hotbar-slot {
                width: 70px;
                height: 70px;
                background: rgba(0, 0, 0, 0.3);
                border: 2px solid #4a90e2;
                border-radius: 6px;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .bait-hotbar-slot:hover {
                background: rgba(74, 144, 226, 0.1);
            }
            
            .bait-hotbar-slot.equipped {
                border-color: #ffeb3b;
                box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
            }
            
            .bait-hotbar-slot .hotbar-slot-number {
                position: absolute;
                top: 2px;
                left: 5px;
                font-size: 12px;
                color: #aaa;
            }
            
            .bait-hotbar-help {
                text-align: center;
                color: #8a9cad;
                font-style: italic;
                font-size: 12px;
                margin-top: 10px;
            }
            .bait-item.in-hotbar {
                width: 100%;
                height: 100%;
                margin: 0;
                border: none;
                background: transparent;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .bait-item.in-hotbar .bait-icon {
                width: 60%;
                height: 60%;
            }

            .bait-item.in-hotbar .bait-quantity {
                position: absolute;
                bottom: 20%;
                right: 10%;
                background: transparent;
                color: white;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 4px;
                z-index: 2;
            }
            
            /* Inventory section */
            .bait-inventory-section {
                background: rgba(10, 22, 34, 0.5);
                border-radius: 8px;
                padding: 15px;
            }
            
            .bait-inventory-section h3 {
                color: #4a90e2;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
                border-bottom: 1px solid #4a90e2;
                padding-bottom: 5px;
            }
            
            .bait-inventory-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 1px;
                max-height: 250px;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .bait-item {
                width: 70px;
                height: 70px;
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
            
            .bait-item:hover {
                background: rgba(74, 144, 226, 0.1);

            }
            
            .bait-item.equipped {
                border-color: #ffeb3b;
                box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
            }
            
            .bait-item .bait-icon {
                width: 32px;
                height: 32px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .bait-item .bait-name {
                font-size: 10px;
                color: white;
                text-align: center;
                margin-top: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            
            .bait-item .bait-quantity {
                position: absolute;
                bottom: 2px;
                right: 2px;
                background: transparent;
                color: white;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 4px;
            }
            
            .item-in-slot {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .empty-message {
                text-align: center;
                padding: 20px;
                color: #8a9cad;
                font-style: italic;
            }
            
            .drag-over {
                background: rgba(74, 144, 226, 0.3);
                border-style: dashed;
            }
            
            .bait-tooltip {
                position: fixed;
                display: none;
                background: rgba(22, 28, 36, 0.95);
                border: 1px solid #4a90e2;
                border-radius: 6px;
                padding: 10px;
                min-width: 200px;
                max-width: 300px;
                z-index: 3000;
                color: white;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            
            .tooltip-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 4px;
            }
            
            .tooltip-stat {
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .tooltip-stat-label {
                color: #aaa;
            }
            
            .tooltip-description {
                font-size: 12px;
                font-style: italic;
                color: #ccc;
                margin-top: 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                padding-top: 4px;
            }
            
            /* Rarity colors */
            .common { color: #ffffff; }
            .uncommon { color: #4caf50; }
            .rare { color: #2196f3; }
            .epic { color: #9c27b0; }
            .legendary { color: #ff9800; }
        `;
        
        document.head.appendChild(style);
    }

    updateItemsTab(inventory) {
        const itemsTab = document.getElementById('items-tab');
        itemsTab.innerHTML = '';
        
        // Filter items
        const lootItems = inventory.items
            .filter(item => item.type !== 'rod' && item.type !== 'bait' && item.type !== 'fish' && item.type !== 'chest')
            .sort((a, b) => a.name.localeCompare(b.name));
        
        if (lootItems.length === 0) {
            itemsTab.innerHTML = '<div class="inventory-empty-message">No items available</div>';
            return;
        }
        
        // Create a container with padding for the grid
        const itemContainer = document.createElement('div');
        itemContainer.style.padding = '15px';
        
        // Always use the grid layout for items
        const itemGrid = document.createElement('div');
        itemGrid.className = 'item-grid';
        itemGrid.style.display = 'grid';
        itemGrid.style.gridTemplateColumns = 'repeat(10, 1fr)';
        itemGrid.style.gap = '0';
        itemGrid.style.padding = '0';
        
        // Track active tooltip timeouts
        if (!this._itemTooltipTimeout) {
            this._itemTooltipTimeout = null;
        }
        
        // Helper function to dismiss mobile tooltips
        this.dismissMobileTooltips = () => {
            const tooltip = document.getElementById('mobile-item-tooltip');
            if (tooltip && tooltip.parentNode) {
                console.log('Dismissing mobile tooltip');
                tooltip.parentNode.removeChild(tooltip);
            }
            
            if (this._itemTooltipTimeout) {
                clearTimeout(this._itemTooltipTimeout);
                this._itemTooltipTimeout = null;
            }
        };
        
        // Add each item as a grid item
        lootItems.forEach(item => {
                    const itemElement = document.createElement('div');
            itemElement.className = `item-grid-item ${item.rarity || 'common'}`;
                    itemElement.dataset.itemId = item.id;
            
            // Style to match the rod items
            itemElement.style.width = '60px';
            itemElement.style.height = '60px';
            itemElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            // Boats are spawned entities, not equipped items - never show as equipped
            const isEquipped = item.type === 'boat' ? false : item.equipped;
            itemElement.style.border = isEquipped ? '2px solid #4a90e2' : '2px solid #3a4a5c';
            itemElement.style.borderRadius = '10px';
            itemElement.style.padding = '8px 5px';
            itemElement.style.display = 'flex';
            itemElement.style.flexDirection = 'column';
            itemElement.style.alignItems = 'center';
            itemElement.style.justifyContent = 'center';
                    
                    // Get sprite path for this item
                    const baseUrl = this.getAssetBaseUrl();
                    let spritePath = '';
                    if (item.sprite) {
                        if (!item.sprite.includes('/')) {
                            spritePath = `${baseUrl}/ui/icons/${item.sprite}`;
                        } else {
                            spritePath = `${baseUrl}${item.sprite}`;
                        }
                    } else {
                        spritePath = `${baseUrl}/ui/icons/items/${item.id}.png`;
                    }
                    
            // Use the existing mobile layout HTML
                    itemElement.style.position = 'relative';
                    itemElement.style.width = '60px';
                    itemElement.style.height = '60px';
                    itemElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
                    // Boats are spawned entities, not equipped items - never show as equipped
                    const isEquippedDisplay = item.type === 'boat' ? false : item.equipped;
                    itemElement.style.border = isEquippedDisplay ? '2px solid #4a90e2' : '2px solid #3a4a5c';
                    itemElement.style.borderRadius = '10px';
                    itemElement.style.padding = '8px 5px';
                    itemElement.style.display = 'flex';
                    itemElement.style.flexDirection = 'column';
                    itemElement.style.alignItems = 'center';
                    itemElement.style.justifyContent = 'center';
                    itemElement.innerHTML = `
                <div class="bait-icon" style="background-image: url('${spritePath}'); width: 32px; height: 32px; background-size: contain; background-repeat: no-repeat; background-position: center; margin-bottom: 4px;"></div>
                <div class="bait-name ${item.rarity || 'common'}" style="font-size: 10px; text-align: center; margin-top: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                <div class="bait-quantity" style="position: absolute; bottom: 5px; right: 5px; background: transparent; color: white; font-size: 8px; padding: 1px 3px; border-radius: 8px;">×${item.quantity || 1}</div>
            `;
            
            // Custom styled tooltip for mobile
            if (hytopia.isMobile) {
                itemElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`Creating tooltip for: ${item.name}`);
                    
                    // First, dismiss any existing tooltips
                    this.dismissMobileTooltips();
                    
                    // Create tooltip container
                    const tooltip = document.createElement('div');
                    tooltip.id = 'mobile-item-tooltip';
                    
                    // Style like desktop tooltip but fixed position
                    Object.assign(tooltip.style, {
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(21, 21, 21, 0.95)',
                        color: '#e0e0e0',
                        padding: '12px',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        width: '80%',
                        maxWidth: '250px',
                        zIndex: '999999',
                        border: `1px solid ${this.getRarityColor(item.rarity || 'common')}`,
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '14px',
                        display: 'block'
                    });
                    
                    // Create tooltip content styled like desktop tooltip
                    const rarityColor = this.getRarityColor(item.rarity || 'common');
                    tooltip.innerHTML = `
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div style="width: 32px; height: 32px; background-image: url('${spritePath}'); background-size: contain; background-repeat: no-repeat; background-position: center; margin-right: 10px;"></div>
                            <h3 style="margin: 0; color: ${rarityColor}; font-size: 16px;">${item.name}</h3>
                        </div>
                        <div style="margin-bottom: 8px; font-size: 12px; opacity: 0.8;">${item.rarity || 'Common'} Item</div>
                        <div style="margin-bottom: 8px;">Quantity: ${item.quantity || 1}</div>
                        <div style="font-size: 13px; line-height: 1.4; color: #cccccc;">${item.description || 'No description available.'}</div>
                    `;
                    
                    // Add tooltip to DOM
                    document.body.appendChild(tooltip);
                    
                    // Add tap-to-dismiss functionality on the tooltip itself
                    tooltip.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.dismissMobileTooltips();
                    });
                    
                    // Auto-hide after 5 seconds
                    this._itemTooltipTimeout = setTimeout(() => {
                        console.log(`Auto-hiding tooltip for ${item.name}`);
                        this.dismissMobileTooltips();
                    }, 5000);
                });
            } else {
                // Desktop behavior
                itemElement.addEventListener('click', (e) => {
                    this.showItemTooltip(item, e);
                });
            }
            
            itemGrid.appendChild(itemElement);
        });
        
        // Add the grid to the container, then the container to the tab
        itemContainer.appendChild(itemGrid);
        itemsTab.appendChild(itemContainer);
        
        // Add touch handler to dismiss tooltips when tapping anywhere
        if (hytopia.isMobile) {
            // Only add this listener once
            if (!this._hasAddedTooltipDismissHandlers) {
                // Add global touch listener to dismiss tooltips when tapping anywhere
                document.addEventListener('touchstart', (e) => {
                    // Check if we have a tooltip and the tap is not on the tooltip itself
                    const tooltip = document.getElementById('mobile-item-tooltip');
                    if (tooltip && !tooltip.contains(e.target)) {
                        this.dismissMobileTooltips();
                    }
                });
                
                // Mark that we've added these handlers
                this._hasAddedTooltipDismissHandlers = true;
            }
        }
    }

    // Add a method to show a confirmation for dropping items on mobile
    showDropConfirmation(item) {
        // Create confirmation element if it doesn't exist
        let confirmation = document.getElementById('drop-confirmation');
        if (!confirmation) {
            confirmation = document.createElement('div');
            confirmation.id = 'drop-confirmation';
            confirmation.style.position = 'fixed';
            confirmation.style.zIndex = '9999';
            confirmation.style.backgroundColor = 'rgba(22, 28, 36, 0.95)';
            confirmation.style.border = '1px solid #e74c3c';
            confirmation.style.borderRadius = '8px';
            confirmation.style.padding = '15px';
            confirmation.style.width = '80%';
            confirmation.style.maxWidth = '300px';
            confirmation.style.top = '50%';
            confirmation.style.left = '50%';
            confirmation.style.transform = 'translate(-50%, -50%)';
            confirmation.style.color = 'white';
            confirmation.style.textAlign = 'center';
            confirmation.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)';
            document.body.appendChild(confirmation);
        }
        
        // Set content and show
        confirmation.innerHTML = `
            <div style="margin-bottom: 15px;">Are you sure you want to drop ${item.name}?</div>
            <div style="display: flex; justify-content: space-between;">
                <button id="drop-confirm-yes" style="background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold;">Drop</button>
                <button id="drop-confirm-no" style="background-color: #7f8c8d; color: white; border: none; padding: 8px 15px; border-radius: 4px;">Cancel</button>
            </div>
        `;
        
        confirmation.style.display = 'block';
        
        // Set up button events
        document.getElementById('drop-confirm-yes').addEventListener('click', () => {
            this.dropItem(item.id);
            confirmation.style.display = 'none';
        });
        
        document.getElementById('drop-confirm-no').addEventListener('click', () => {
            confirmation.style.display = 'none';
        });
    }

    updateFishTab(inventory) {
        const fishTab = document.getElementById('fish-tab');
        if (!fishTab) return;
        fishTab.innerHTML = '';
        const fishItems = inventory.items.filter(item => item.type === 'fish');
        if (fishItems.length === 0) {
            fishTab.innerHTML = '<div class="inventory-empty-message">No fish caught yet!</div>';
            return;
        }
        
        // Always use grid layout for fish
        const fishGrid = document.createElement('div');
        fishGrid.className = 'fish-inventory-grid';
        fishGrid.style.display = 'grid';
        fishGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        fishGrid.style.gap = '0';
        fishGrid.style.padding = '0';
        
        fishItems.forEach(fish => {
            const fishElement = document.createElement('div');
            fishElement.className = `fish-grid-item ${fish.rarity} ${fish.equipped ? 'equipped' : ''}`;
            fishElement.dataset.fishId = fish.id;
            
            // Style the fish item for grid - slightly larger
            fishElement.style.width = '60px';            // Larger width
            fishElement.style.height = '60px';           // Larger height
            fishElement.style.padding = '8px 5px';       // More padding
            fishElement.style.display = 'flex';
            fishElement.style.flexDirection = 'column';
            fishElement.style.alignItems = 'center';
            fishElement.style.justifyContent = 'center';
            fishElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            fishElement.style.border = fish.equipped ? '2px solid #4a90e2' : '2px solid #3a4a5c';
            fishElement.style.borderRadius = '10px';
            fishElement.style.position = 'relative';
            
            // Simplified layout with just name, trophy status, and value
            const trophyStatus = this.getTrophyStatus(fish);
            const trophyDisplay = this.getTrophyDisplay(trophyStatus);
            
            fishElement.innerHTML = `
                <div class="fish-name" style="font-size: 10px; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${this.getRarityColor(fish.rarity)}; font-weight: ${fish.equipped ? 'bold' : 'normal'}; margin-bottom: ${trophyDisplay ? '4px' : '8px'};">${fish.name}</div>
                ${trophyDisplay}
                <div class="fish-value" style="font-size: 10px; color: #facc15;">${fish.value} coins</div>
            `;
            
            // Add a subtle checkmark if equipped
            if (fish.equipped) {
                const equippedMark = document.createElement('div');
                equippedMark.style.position = 'absolute';
                equippedMark.style.top = '3px';
                equippedMark.style.right = '3px';
                equippedMark.style.fontSize = '10px';
                equippedMark.style.color = '#4a90e2';
                equippedMark.textContent = '✓';
                fishElement.appendChild(equippedMark);
            }
            
            // Add click/touch handler for equipping
            const equipFish = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`Equipping fish: ${fish.id}`);
                hytopia.sendData({
                    type: 'equipItem',
                    itemId: fish.id
                });
                
                // Update UI immediately for better responsiveness
                document.querySelectorAll('.fish-grid-item').forEach(item => {
                    item.classList.remove('equipped');
                    item.style.border = '2px solid #3a4a5c';
                    item.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
                    
                    // Remove checkmark if exists
                    const checkmark = item.querySelector('div[style*="position: absolute"]');
                    if (checkmark) checkmark.remove();
                    
                    // Reset name font weight
                    const nameEl = item.querySelector('.fish-name');
                    if (nameEl) nameEl.style.fontWeight = 'normal';
                });
                
                fishElement.classList.add('equipped');
                fishElement.style.border = '2px solid #4a90e2';
                fishElement.style.backgroundColor = 'rgba(74, 144, 226, 0.15)';
                
                // Add checkmark to newly equipped fish
                if (!fishElement.querySelector('div[style*="position: absolute"]')) {
                    const equippedMark = document.createElement('div');
                    equippedMark.style.position = 'absolute';
                    equippedMark.style.top = '3px';
                    equippedMark.style.right = '3px';
                    equippedMark.style.fontSize = '10px';
                    equippedMark.style.color = '#4a90e2';
                    equippedMark.textContent = '✓';
                    fishElement.appendChild(equippedMark);
                }
                
                // Bold the name
                const nameEl = fishElement.querySelector('.fish-name');
                if (nameEl) nameEl.style.fontWeight = 'bold';
                
                this.currentFish = fish.id;
                this.lastEquippedFish = fish.id;
            };
            
            // Add event listeners for both click and touch
            fishElement.addEventListener('click', equipFish);
            fishElement.addEventListener('touchend', equipFish);
            
            // Add tooltip for fish details on long press
            let touchTimer;
            fishElement.addEventListener('touchstart', (e) => {
                touchTimer = setTimeout(() => {
                    this.showFishTooltip(fish, e);
                }, 500);
            });
            
            fishElement.addEventListener('touchmove', () => {
                clearTimeout(touchTimer);
            });
            
            fishElement.addEventListener('touchend', () => {
                clearTimeout(touchTimer);
                // Hide tooltip with delay
                setTimeout(() => {
                    const tooltip = document.getElementById('fish-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                }, 100);
            });
            
            // Add tooltip on hover for desktop
            fishElement.addEventListener('mouseenter', (e) => {
                this.showFishTooltip(fish, e);
            });
            
            fishElement.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('fish-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            fishGrid.appendChild(fishElement);
            
            if (fish.equipped) {
                this.currentFish = fish.id;
                this.lastEquippedFish = fish.id;
            }
        });
        
        fishTab.appendChild(fishGrid);
    }

    // Helper method to get rarity color
    getRarityColor(rarity) {
        switch(rarity.toLowerCase()) {
            case 'common': return '#9d9d9d';
            case 'uncommon': return '#1eff00';
            case 'rare': return '#0070dd';
            case 'epic': return '#a335ee';
            case 'legendary': return '#ff8000';
            default: return '#ffffff';
        }
    }

    // Add method for fish tooltips
    showFishTooltip(fish, event) {
        // Get or create tooltip element
        let tooltip = document.getElementById('fish-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'fish-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '3000';
            tooltip.style.backgroundColor = 'rgba(22, 28, 36, 0.95)';
            tooltip.style.border = '1px solid #4a90e2';
            tooltip.style.borderRadius = '8px';
            tooltip.style.padding = '12px';
            tooltip.style.maxWidth = '250px';
            tooltip.style.color = 'white';
            tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
            document.body.appendChild(tooltip);
        }
        
        // Determine what weight to display
        const fishStats = fish.metadata?.fishStats;
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
        
        // Set tooltip content
        tooltip.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 5px; color: ${this.getRarityColor(fish.rarity)};">${fish.name}</div>
            <div style="font-size: 14px; margin-bottom: 5px;">Rarity: ${fish.rarity}</div>
            <div style="font-size: 14px; margin-bottom: 5px; color: ${fishStats?.hasBeenWeighed ? '#4a90e2' : '#888'};">Weight: ${displayWeight}</div>
            <div style="font-size: 14px; margin-bottom: 5px; color: #facc15;">Value: ${fish.value} coins</div>
            ${fishStats?.hasBeenWeighed ? this.getWeighingStatusDisplay(fishStats) : '<div style="font-size: 12px; color: #888; font-style: italic;">Take to Collector for weighing</div>'}
        `;
        
        // Position the tooltip near the pointer/touch
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        tooltip.style.left = `${clientX + 20}px`;
        tooltip.style.top = `${clientY - 100}px`;
        
        // Make sure tooltip stays on screen
        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = `${window.innerWidth - tooltipRect.width - 20}px`;
            }
            if (tooltipRect.top < 0) {
                tooltip.style.top = '20px';
            }
        }, 0);
        
        // Show the tooltip
        tooltip.style.display = 'block';
    }

    setupRodClickHandlers() {
        document.querySelectorAll('.inventory-equip-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rodId = button.dataset.rodId;
                if (rodId) {
                    hytopia.sendData({
                        type: 'equipItem',
                        itemId: rodId
                    });
                    
                    // Update UI immediately for better responsiveness
                    document.querySelectorAll('.inventory-equip-button').forEach(btn => {
                        btn.textContent = 'Equip';
                        const rodItem = btn.closest('.inventory-rod-item');
                        if (rodItem) {
                            rodItem.classList.remove('equipped');
                        }
                    });
                    
                    button.textContent = 'Equipped';
                    const rodItem = button.closest('.inventory-rod-item');
                    if (rodItem) {
                        rodItem.classList.add('equipped');
                    }
                    
                    this.currentRod = rodId;
                    this.lastEquippedRod = rodId;
                    
                    // Toolbar will be updated via updateToolbarDisplay() when inventory update arrives
                }
            });
        });
    }

    setupBaitClickHandlers() {
        document.querySelectorAll('.inventory-select-bait-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const baitId = button.dataset.baitId;
                if (baitId) {
                    hytopia.sendData({
                        type: 'equipItem',
                        itemId: baitId
                    });
                    
                    // Update UI immediately for better responsiveness
                    document.querySelectorAll('.inventory-select-bait-button').forEach(btn => {
                        btn.textContent = 'Equip';
                        const baitItem = btn.closest('.inventory-bait-item');
                        if (baitItem) {
                            baitItem.classList.remove('selected');
                        }
                    });
                    
                    button.textContent = 'Equipped';
                    const baitItem = button.closest('.inventory-bait-item');
                    if (baitItem) {
                        baitItem.classList.add('selected');
                    }
                    
                    this.selectedBait = { id: baitId };
                }
            });
        });
    }

    setupItemClickHandlers() {
        document.querySelectorAll('.inventory-use-item-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemId = button.dataset.itemId;
                if (itemId) {
                    hytopia.sendData({
                        type: 'useItem',
                        itemId: itemId
                    });
                }
            });
        });
    }

    setupFishClickHandlers() {
        document.querySelectorAll('.inventory-equip-fish-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fishId = button.dataset.fishId;
                if (fishId) {
                    hytopia.sendData({
                        type: 'equipItem',
                        itemId: fishId
                    });
                    
                    // Update UI immediately for better responsiveness
                    document.querySelectorAll('.inventory-equip-fish-button').forEach(btn => {
                        btn.textContent = 'Equip';
                        const fishCard = btn.closest('.inventory-fish-card');
                        if (fishCard) {
                            fishCard.classList.remove('equipped');
                        }
                    });
                    
                    button.textContent = 'Equipped';
                    const fishCard = button.closest('.inventory-fish-card');
                    if (fishCard) {
                        fishCard.classList.add('equipped');
                    }
                    
                    this.currentFish = fishId;
                    this.lastEquippedFish = fishId;
                }
            });
        });
    }

    setupHotbar() {
        const rodSlot = document.getElementById('rod-slot');
        const baitSlot = document.getElementById('bait-slot');
        const fishSlot = document.getElementById('fish-slot');
        
        // Rod slot click handler
        if (rodSlot) {
            rodSlot.addEventListener('click', () => {
                this.openHotbarSlot('rods');
            });
        }
        
        // Bait slot click handler
        if (baitSlot) {
            baitSlot.addEventListener('click', () => {
                this.openHotbarSlot('bait');
            });
        }
        
        // Fish slot click handler
        if (fishSlot) {
            fishSlot.addEventListener('click', () => {
                this.openHotbarSlot('fish');
            });
        }
        
        // Keyboard handlers for hotbar slots (1 = rod, 2 = bait)
        // Use a named function so we can remove it if needed
        this.hotbarKeyHandler = (e) => {
            // Don't interfere with other panels that use number keys
            if (window.MerchantPanel?.isMerchantDialogOpen) {
                return; // Merchant dialog uses 1-3
            }
            
            // Check if NPC options are visible (they use 1, 2, 3 for dialog responses)
            const npcOptionsContainers = document.querySelectorAll('.player-options-container');
            let npcOptionsVisible = false;
            for (const container of npcOptionsContainers) {
                const computedStyle = window.getComputedStyle(container);
                if (computedStyle.display !== 'none' && computedStyle.display !== '') {
                    npcOptionsVisible = true;
                    break;
                }
            }
            
            // If NPC options are visible, don't handle hotbar keys (let NPC dialog handle them)
            if (npcOptionsVisible) {
                return;
            }
            
            // Don't handle if user is typing in an input field
            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            )) {
                return;
            }
            
            // Handle number keys 1, 2, and 3 for hotbar
            if (e.key === '1' || e.key === '2' || e.key === '3') {
                // Special case: If key 1 is pressed while holding a fish, unhide rod instead of opening inventory
                if (e.key === '1') {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Check if player has a fish equipped
                    const hasEquippedFish = this.lastInventory?.items?.some(item => item.type === 'fish' && item.equipped);
                    if (hasEquippedFish) {
                        // Unhide rod by unequipping fish
                        hytopia.sendData({
                            type: 'unequipItem',
                            itemType: 'fish'
                        });
                    } else {
                        // Normal behavior: open rods tab
                        this.openHotbarSlot('rods');
                    }
                } else if (e.key === '2') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openHotbarSlot('bait');
                } else if (e.key === '3') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openHotbarSlot('fish');
                }
            }
        };
        
        document.addEventListener('keydown', this.hotbarKeyHandler);
    }

    openHotbarSlot(slotType) {
        // Open TackleBoxPanel and switch to the appropriate tab
        if (window.TackleBoxPanel) {
            window.TackleBoxPanel.toggle(true);
            window.TackleBoxPanel.switchTab(slotType);
        }
    }

    openInventoryToTab(tabName) {
        // Deprecated panel - redirect to TackleBoxPanel instead
        if (window.TackleBoxPanel) {
            window.TackleBoxPanel.toggle(true);
            window.TackleBoxPanel.switchTab(tabName);
        }
        // Original deprecated panel access disabled:
        // if (!this.equipmentMenuOpen) {
        //     this.toggleEquipmentMenu(true);
        // }
        // this.showTab(tabName);
    }

    activateToolbarSlot(slotNum) {
        // Deprecated - redirect to TackleBoxPanel instead
        if (slotNum === 1 && window.TackleBoxPanel) {
            window.TackleBoxPanel.toggle(true);
            window.TackleBoxPanel.switchTab('rods');
        }
        // Original deprecated panel access disabled:
        // if (slotNum === 1) {
        //     this.toggleEquipmentMenu();
        // }
    }

    toggleBaitQuickSelect(force) {
    }

    populateBaitQuickSelect() {
    }

    setupBaitQuickSelectHotkeys() {
    }

    equipBait(baitId) {
        hytopia.sendData({
            type: 'equipItem',
            itemId: baitId
        });
        
        // Update UI immediately for better responsiveness
        if (this.cachedBaitItems) {
            const baitItem = this.cachedBaitItems.find(bait => bait.id === baitId);
            if (baitItem) {
                // Update cached items equipped status
                this.cachedBaitItems.forEach(bait => {
                    bait.equipped = bait.id === baitId;
                });
                // Toolbar will be updated via updateToolbarDisplay() when inventory update arrives
            }
        }
    }

    updateToolbarDisplay(inventory) {
        // Store inventory for fish check
        this.lastInventory = inventory;
        
        // Update rod slot
        const equippedRod = inventory.items.find(item => item.type === 'rod' && item.equipped);
        this.updateHotbarSlot('rod', equippedRod || null);
        
        // Update bait slot
        const equippedBait = inventory.items.find(item => item.type === 'bait' && item.equipped);
        this.updateHotbarSlot('bait', equippedBait || null);
        
        // Update fish slot
        const equippedFish = inventory.items.find(item => item.type === 'fish' && item.equipped);
        this.updateHotbarSlot('fish', equippedFish || null);
    }

    updateHotbarSlot(slotType, itemData) {
        const slot = document.getElementById(`${slotType}-slot`);
        if (!slot) return;
        
        const content = slot.querySelector('.hud-hotbar-slot-content');
        if (!content) return;
        
        content.innerHTML = '';
        
        if (!itemData || itemData.removed) {
            // Empty state - show default images
            slot.classList.remove('has-item');
            
            if (slotType === 'rod') {
                // Rod: show beginner rod sprite as default placeholder
                const icon = document.createElement('img');
                icon.src = this.getDefaultIconPath('rod');
                icon.alt = 'Rod';
                icon.className = 'hud-hotbar-slot-icon default-icon';
                icon.style.opacity = '0.5'; // Dimmed for empty state
                content.appendChild(icon);
            } else if (slotType === 'bait') {
                // Bait: show worm sprite as default
                const icon = document.createElement('img');
                icon.src = this.getDefaultIconPath('bait');
                icon.alt = 'Bait';
                icon.className = 'hud-hotbar-slot-icon default-icon';
                icon.style.opacity = '0.5'; // Dimmed for empty state
                content.appendChild(icon);
            } else if (slotType === 'fish') {
                // Fish: show icon_fish.png as default
                const icon = document.createElement('img');
                icon.src = this.getDefaultIconPath('fish');
                icon.alt = 'Fish';
                icon.className = 'hud-hotbar-slot-icon default-icon';
                icon.style.opacity = '0.5'; // Dimmed for empty state
                content.appendChild(icon);
            }
        } else {
            slot.classList.add('has-item');
            
            // For fish, show text name instead of icon (since we don't have full sprite collection)
            if (slotType === 'fish') {
                const fishName = document.createElement('div');
                fishName.className = 'hud-hotbar-slot-text';
                fishName.textContent = itemData.name || 'Fish';
                fishName.style.cssText = `
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--hud-text);
                    text-shadow: var(--hud-text-shadow);
                    text-align: center;
                    padding: 2px 4px;
                    word-break: break-word;
                    line-height: 1.1;
                    max-width: 100%;
                `;
                content.appendChild(fishName);
            } else {
                // For rod and bait, show icon
                const icon = document.createElement('img');
                icon.src = this.getIconPath(itemData);
                icon.alt = itemData.name || 'Item';
                icon.className = 'hud-hotbar-slot-icon';
                content.appendChild(icon);
                
                // Add quantity badge if applicable
                if (itemData.quantity && itemData.quantity > 1) {
                    const quantity = document.createElement('div');
                    quantity.className = 'hud-hotbar-slot-quantity';
                    quantity.textContent = itemData.quantity.toLocaleString();
                    content.appendChild(quantity);
                }
            }
        }
    }

    getDefaultIconPath(type) {
        const baseUrl = this.getAssetBaseUrl();
        if (type === 'rod') {
            return `${baseUrl}/ui/icons/beginner_rod_sprite.png`;
        } else if (type === 'bait') {
            return `${baseUrl}/ui/icons/worm_sprite.png`;
        } else if (type === 'fish') {
            return `${baseUrl}/ui/icons/icon_fish.png`;
        }
        return '';
    }

    getIconPath(item) {
        if (!item) return '';
        const baseUrl = this.getAssetBaseUrl();
        if (item.sprite) {
            if (item.sprite.startsWith('/')) {
                return `${baseUrl}${item.sprite}`;
            } else {
                return `${baseUrl}/ui/icons/${item.sprite}`;
            }
        } else {
            // Fallback icons based on type
            let fallbackIcon = 'crate-icon.png';
            switch(item.type) {
                case 'rod': fallbackIcon = 'rod-icon.png'; break;
                case 'bait': fallbackIcon = 'worm_sprite.png'; break;
            }
            return `${baseUrl}/ui/icons/${fallbackIcon}`;
        }
    }


    showBaitHotkeyNotification(key) {
        const baitItem = this.cachedBaitItems?.find(bait => bait.id === this.hotkeyBaits[key]);
        if (!baitItem) return;
        
        // Create or get notification element
        let notification = document.getElementById('bait-hotkey-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'bait-hotkey-notification';
            document.body.appendChild(notification);
        }
        
        // Set content and show
        notification.innerHTML = `
            <div class="hotkey-icon">${key}</div>
            <div class="hotkey-bait-name ${baitItem.rarity}">${baitItem.name}</div>
            <div class="hotkey-equipped">Equipped</div>
        `;
        
        // Show and animate
        notification.style.display = 'flex';
        notification.style.animation = 'none';
        void notification.offsetWidth; // Trigger reflow
        notification.style.animation = 'fadeInOut 2s forwards';
        
        // Hide after animation
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2000);
    }

    assignBaitToHotkey(baitId, hotkey) {
        this.hotkeyBaits[hotkey] = baitId;
        
        // Save to localStorage for persistence
        try {
            localStorage.setItem('baitHotkeys', JSON.stringify(this.hotkeyBaits));
        } catch (e) {
            console.error('Failed to save bait hotkeys to localStorage', e);
        }
        
        // Update UI to reflect the assignment
        this.updateBaitHotkeyIndicators();
    }

    loadBaitHotkeys() {
        try {
            const savedHotkeys = localStorage.getItem('baitHotkeys');
            if (savedHotkeys) {
                this.hotkeyBaits = JSON.parse(savedHotkeys);
            }
        } catch (e) {
            console.error('Failed to load bait hotkeys from localStorage', e);
        }
    }

    updateBaitHotkeyIndicators() {
        // This could be implemented later to show which baits are assigned to hotkeys
        // in the main toolbar, if desired
    }

    getAssetBaseUrl() {
        // Check if we're in a Hytopia environment with CDN_ASSETS_URL available in the global scope
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            console.log('Using global CDN_ASSETS_URL:', window.CDN_ASSETS_URL);
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

    clearHotbarSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.baitHotbar.length) return;
        
        // Clear the slot in the data structure
        this.baitHotbar[slotIndex] = null;
        
        // Update the slot display
        const slot = document.querySelector(`.bait-hotbar-slot[data-hotbar-slot="${slotIndex}"]`);
        if (slot) {
            // Clear existing content except the slot number
            const slotNumber = slot.querySelector('.hotbar-slot-number');
            if (slotNumber) {
                slot.innerHTML = '';
                slot.appendChild(slotNumber);
            } else {
                // If slot number is missing, recreate it
                slot.innerHTML = '';
                const newSlotNumber = document.createElement('span');
                newSlotNumber.className = 'hotbar-slot-number';
                newSlotNumber.textContent = slotIndex + 1;
                slot.appendChild(newSlotNumber);
            }
        }
        
        // Save hotbar configuration
        this.saveHotbar();
        
        // Update the game hotbar if needed
        this.updateGameHotbar();
    }

    updateGameHotbar() {
        // This method would update any game state that needs to know about the hotbar
        // For now, it's just a placeholder

    }

    // Add a method to show notifications
    showNotification(message) {
        // Check if notification element exists, create if not
        let notification = document.getElementById('bait-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'bait-notification';
            notification.className = 'bait-notification';
            document.body.appendChild(notification);
            
            // Add notification styles if not already added
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .bait-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background-color: rgba(22, 28, 36, 0.95);
                        border-left: 4px solid #e74c3c;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 4px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        z-index: 3000;
                        font-size: 14px;
                        max-width: 300px;
                        opacity: 0;
                        transform: translateY(-20px);
                        transition: opacity 0.3s, transform 0.3s;
                    }
                    
                    .bait-notification.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showBaitTooltip(bait, event) {
        // Get or create tooltip element
        let tooltip = document.getElementById('bait-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'bait-tooltip';
            tooltip.className = 'bait-tooltip'; // Use the class defined in addBaitStyles
            document.body.appendChild(tooltip);
        }

        if (!bait || !bait.metadata || !bait.metadata.baitStats) {
            tooltip.style.display = 'none';
            return;
        }

        const stats = bait.metadata.baitStats;
        const rarity = bait.rarity || 'common';
        const rarityColor = this.getRarityColor(rarity);

        let tooltipHTML = `<div class="tooltip-title ${rarity}" style="color:${rarityColor};font-size:16px;font-weight:bold;margin-bottom:8px;">${bait.name}</div>`;

        // Primary Stats: Lucks - Always show these
        tooltipHTML += `<div class="tooltip-stat"><span class="tooltip-stat-label">Base Luck:</span> ${this.formatStatPercent(stats.baseLuck)}</div>`;
        tooltipHTML += `<div class="tooltip-stat"><span class="tooltip-stat-label">Species Luck:</span> ${this.formatStatPercent(stats.speciesLuck)}</div>`;
        tooltipHTML += `<div class="tooltip-stat"><span class="tooltip-stat-label">Loot Luck:</span> ${this.formatStatPercent(stats.lootScore)}</div>`;

        tooltipHTML += `<hr class="tooltip-hr" style="margin-top: 8px; margin-bottom: 8px;">`; // Separator

        tooltipHTML += `<div style="font-weight:bold; margin-bottom:4px;">Attribute Boosts:</div>`;
        
        // Logic for attribute boosts (only show if not 0%, or show "None")
        let displayedAnyAttributeBoost = false;
        let attributeBoostsHtmlContent = '';

        const createAttributeBoostStatHtml = (label, rawValue) => {
            const value = Number(rawValue);
            const effectiveValue = isNaN(value) ? 1 : value; 
            const percent = Math.round((effectiveValue - 1) * 100);

            if (percent !== 0) {
                attributeBoostsHtmlContent += `<div class="tooltip-stat"><span class="tooltip-stat-label">${label}:</span> ${this.formatStatPercent(rawValue)}</div>`;
                displayedAnyAttributeBoost = true;
            }
        };

        createAttributeBoostStatHtml('Drag', stats.drag);
        createAttributeBoostStatHtml('Catch Speed', stats.catchSpeed);
        createAttributeBoostStatHtml('Catch Zone', stats.catchZone);
        createAttributeBoostStatHtml('Catch Weight', stats.catchWeight);

        if (displayedAnyAttributeBoost) {
            tooltipHTML += attributeBoostsHtmlContent;
        } else {
            tooltipHTML += `<div class="tooltip-stat" style="color: #8a9cad;">None</div>`;
        }

        tooltip.innerHTML = tooltipHTML;
        
        // Positioning logic (remains the same as your current version based on user selection context)
        const padding = 15;
        tooltip.style.left = `${event.clientX + padding}px`;
        tooltip.style.top = `${event.clientY + padding}px`;
        
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        if (rect.right > viewportWidth) {
            tooltip.style.left = `${event.clientX - rect.width - padding}px`;
        }
        if (rect.bottom > viewportHeight) {
            tooltip.style.top = `${event.clientY - rect.height - padding}px`;
        }
        tooltip.style.display = 'block';
    }

    showItemTooltip(item, event) {
        const tooltip = document.getElementById('bait-tooltip');
        if (!tooltip) return;
        

        
        // Default values for missing properties
        const itemName = item.name || 'Unknown Item';
        const itemRarity = item.rarity || 'common';
        const itemDescription = item.description || 'No description available.';
        
        // Format the rarity text with proper capitalization
        const formattedRarity = itemRarity.charAt(0).toUpperCase() + itemRarity.slice(1);
        
        tooltip.innerHTML = `
            <div class="tooltip-title ${itemRarity}">${itemName}</div>
            <div class="tooltip-rarity ${itemRarity}">Rarity: ${formattedRarity}</div>
            <div class="tooltip-description">${itemDescription}</div>
        `;
        
        tooltip.style.display = 'block';
        
        // Position the tooltip near the cursor
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        
        // Adjust position to keep tooltip within viewport
        let left = event.clientX + 10;
        let top = event.clientY + 10;
        
        // Check right edge
        if (left + tooltipWidth > window.innerWidth) {
            left = event.clientX - tooltipWidth - 10;
        }
        
        // Check bottom edge
        if (top + tooltipHeight > window.innerHeight) {
            top = event.clientY - tooltipHeight - 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    dropItem(itemId) {
        console.log(`Dropping item: ${itemId}`);
        hytopia.sendData({
            type: 'dropItem',
            itemId: itemId
        });
    }

    addItemsStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Items tab layout similar to bait tab */
            .items-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 10px;
            }
            
            /* Inventory section */
            .items-inventory-section {
                background: rgba(10, 22, 34, 0.5);
                border-radius: 8px;
                padding: 15px;
            }
            
            .items-inventory-section h3 {
                color: #4a90e2;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
                border-bottom: 1px solid #4a90e2;
                padding-bottom: 5px;
            }
            
            .items-inventory-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                max-height: 250px;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .drop-item-button {
                background-color: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 3px 8px;
                font-size: 10px;
                margin-top: 10px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .drop-item-button:hover {
                background-color: #c0392b;
            }

            /* Tooltip rarity styles */
            .tooltip-rarity {
                font-size: 14px;
                margin-bottom: 8px;
                font-weight: bold;
            }

            /* Rarity colors */
            .tooltip-rarity.common {
                color: #9d9d9d;
            }

            .tooltip-rarity.uncommon {
                color: #1eff00;
            }

            .tooltip-rarity.rare {
                color: #0070dd;
            }

            .tooltip-rarity.epic {
                color: #a335ee;
            }

            .tooltip-rarity.legendary {
                color: #ff8000;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Add this method to adjust header size
    adjustHeaderForMobile(isOpen) {
        if (!hytopia.isMobile) return;
        
        // Get the header elements
        const panelHeader = document.querySelector('.inventory-panel-header');
        const headerTitle = document.querySelector('.inventory-panel-header h2');
        const closeButton = document.querySelector('.inventory-close-button');
        
        if (isOpen) {
            // Adjust header for mobile - make it VERY small
            if (panelHeader) {
                panelHeader.style.padding = '5px 8px';
                panelHeader.style.borderBottom = '1px solid #3a4a5c'; // Thinner border
            }
            
            if (headerTitle) {
                headerTitle.style.fontSize = '14px';
                headerTitle.style.margin = '0';
                headerTitle.textContent = 'Inventory'; // Ultra short title
            }
            
            if (closeButton) {
                closeButton.style.fontSize = '20px';
            }
            
            // Make the sidebar smaller too
            const sidebar = document.querySelector('.inventory-panel-sidebar');
            const sidebarButtons = document.querySelectorAll('.inventory-sidebar-button');
            
            if (sidebar) {
                sidebar.style.width = '80px'; // Much narrower
                sidebar.style.paddingTop = '5px';
                sidebar.style.paddingBottom = '5px';
            }
            
            sidebarButtons.forEach(button => {
                button.style.padding = '5px';
                button.style.borderLeft = '2px solid transparent';
                
                // Make sidebar button text smaller
                const span = button.querySelector('span');
                if (span) {
                    span.style.fontSize = '10px';
                }
                
                // Make icons smaller
                const icon = button.querySelector('div[class$="-icon"]');
                if (icon) {
                    icon.style.width = '18px';
                    icon.style.height = '18px';
                    icon.style.marginRight = '6px';
                }
            });
            
            // Give more space to the main panel content
            const mainPanel = document.querySelector('.inventory-panel-main');
            if (mainPanel) {
                mainPanel.style.padding = '5px';
            }
            
            // Make the entire panel take less vertical space
            const panel = document.querySelector('.inventory-panel');
            if (panel) {
                panel.style.height = '75vh'; // Take less vertical space
                panel.style.width = '68vw';
            }
        } else {
            // Reset styles when closing
            if (panelHeader) {
                panelHeader.style.padding = '';
                panelHeader.style.borderBottom = '';
            }
            if (headerTitle) {
                headerTitle.style.fontSize = '';
                headerTitle.style.margin = '';
                headerTitle.textContent = 'Equipment & Items';
            }
            if (closeButton) closeButton.style.fontSize = '';
            
            const sidebar = document.querySelector('.inventory-panel-sidebar');
            const sidebarButtons = document.querySelectorAll('.inventory-sidebar-button');
            
            if (sidebar) {
                sidebar.style.width = '';
                sidebar.style.paddingTop = '';
                sidebar.style.paddingBottom = '';
            }
            
            sidebarButtons.forEach(button => {
                button.style.padding = '';
                button.style.borderLeft = '';
                
                const span = button.querySelector('span');
                if (span) span.style.fontSize = '';
                
                const icon = button.querySelector('div[class$="-icon"]');
                if (icon) {
                    icon.style.width = '';
                    icon.style.height = '';
                    icon.style.marginRight = '';
                }
            });
            
            const mainPanel = document.querySelector('.inventory-panel-main');
            if (mainPanel) mainPanel.style.padding = '';
            
            const panel = document.querySelector('.inventory-panel');
            if (panel) panel.style.height = '';
        }
    }

    // Add a helper to map stat values to a color-coded bar
    getStatBarColors(statValue) {
        let value = Number(statValue);
        if (isNaN(value)) value = 1;
        let min = 0.7, max = 1.3;
        // Map value to 0-4
        let idx = 2; // Neutral
        if (value <= min) idx = 0;
        else if (value < 0.9) idx = 1;
        else if (value <= 1.1) idx = 2;
        else if (value < max) idx = 3;
        else idx = 4;
        // Color codes for each block
        const colors = [
            '#e74c3c',   // dark red (major detract)
            '#ffb3b3',   // light red (slight detract)
            '#ffe066',   // yellow (neutral)
            '#b6fcb6',   // light green (slight bonus)
            '#27ae60'    // dark green (major bonus)
        ];
        // Build color array for the bar
        let barColors = [];
        for (let i = 0; i < 5; i++) {
            barColors.push(i <= idx ? colors[i] : '#444'); // gray for unfilled
        }
        return barColors;
    }

    // Helper to format stat as colored percentage
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

    updatePhshdexTab(inventory) {
        const phshdexTab = document.getElementById('phshdex-tab');
        if (!phshdexTab) return;
        phshdexTab.innerHTML = '';
        
        // Use persistent phshdex data if available, otherwise fall back to current fish analysis
        const phshdexData = this.cachedPhshdexData || this.analyzeCurrentFish(inventory);
        
        if (!phshdexData || Object.keys(phshdexData.speciesRecords).length === 0) {
            phshdexTab.innerHTML = '<div class="inventory-empty-message" style="text-align: center; padding: 40px 0; color: #8a9cad; font-style: italic;">No fish caught yet! Start fishing to build your Phshdex.</div>';
            return;
        }
        
        const { speciesRecords, overallStats } = phshdexData;
        
        // Create main container
        const container = document.createElement('div');
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        
        // Create header with Phshdex title and gross stats
        const header = document.createElement('div');
        header.className = 'phshdex-header';
        header.style.padding = '20px';
        header.style.borderBottom = '2px solid #3a4a5c';
        header.style.background = 'linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(100, 181, 246, 0.05))';
        
        header.innerHTML = `
            <h2 style="color: #4a90e2; margin: 0 0 20px 0; font-size: 24px; text-align: center; font-weight: 700;">🐟 PHSHDEX 🐟</h2>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 10px;">
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
                    <div style="color: #facc15; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${overallStats.biggestValueCatch.value}</div>
                    <div style="color: #b0b0b0; font-size: 12px; margin-bottom: 3px;">BIGGEST VALUE</div>
                    <div style="color: #e0e0e0; font-size: 11px;">${overallStats.biggestValueCatch.speciesName} (${overallStats.biggestValueCatch.weight.toFixed(2)}lb)</div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(74,144,226,0.3);">
                    <div style="color: #4a90e2; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${overallStats.largestWeightCatch.weight.toFixed(2)}lb</div>
                    <div style="color: #b0b0b0; font-size: 12px; margin-bottom: 3px;">LARGEST CATCH</div>
                    <div style="color: #e0e0e0; font-size: 11px;">${overallStats.largestWeightCatch.speciesName} (${overallStats.largestWeightCatch.value} coins)</div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(76,175,80,0.3);">
                    <div style="color: #4caf50; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${overallStats.totalValueEarned.toLocaleString()}</div>
                    <div style="color: #b0b0b0; font-size: 12px; margin-bottom: 3px;">TOTAL EARNED</div>
                    <div style="color: #e0e0e0; font-size: 11px;">From ${overallStats.totalFishCaught} fish</div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(156,39,176,0.3);">
                    <div style="color: #9c27b0; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${(overallStats.totalXP || 0).toLocaleString()}</div>
                    <div style="color: #b0b0b0; font-size: 12px; margin-bottom: 3px;">TOTAL XP</div>
                    <div style="color: #e0e0e0; font-size: 11px;">Experience earned</div>
                </div>
            </div>
            
            <div style="text-align: center; color: #8a9cad; font-size: 13px; margin-top: 10px;">
                📊 ${Object.keys(speciesRecords).length} Species Discovered
            </div>
        `;
        
        container.appendChild(header);
        
        // Create scrollable species list
        const speciesSection = document.createElement('div');
        speciesSection.style.flex = '1';
        speciesSection.style.overflow = 'hidden';
        speciesSection.style.display = 'flex';
        speciesSection.style.flexDirection = 'column';
        
        const speciesHeader = document.createElement('div');
        speciesHeader.style.padding = '15px 20px 10px 20px';
        speciesHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        speciesHeader.innerHTML = '<h3 style="margin: 0; color: #e0e0e0; font-size: 16px; font-weight: 600;">Species Records</h3>';
        
        const speciesList = document.createElement('div');
        speciesList.className = 'phshdex-species-list';
        speciesList.style.flex = '1';
        speciesList.style.overflowY = 'auto';
        speciesList.style.padding = '10px 20px 20px 20px';
        
        // Sort species by best value (highest first)
        const sortedSpecies = Object.values(speciesRecords).sort((a, b) => {
            return b.bestValue - a.bestValue;
        });
        
        // Create species entries
        sortedSpecies.forEach((species, index) => {
            const speciesEntry = document.createElement('div');
            speciesEntry.className = 'phshdex-species-entry';
            speciesEntry.style.display = 'flex';
            speciesEntry.style.alignItems = 'center';
            speciesEntry.style.padding = '12px';
            speciesEntry.style.marginBottom = '8px';
            speciesEntry.style.backgroundColor = 'rgba(40, 50, 65, 0.6)';
            speciesEntry.style.borderRadius = '8px';
            speciesEntry.style.border = `1px solid ${this.getRarityColor(species.bestRarity)}`;
            speciesEntry.style.transition = 'all 0.2s';
            speciesEntry.style.cursor = 'pointer';
            
            const baseUrl = this.getAssetBaseUrl();
            // Try to get sprite from species record or use placeholder
            const spritePath = species.bestCatchData?.sprite || `${baseUrl}/ui/icons/fish_placeholder.png`;
            
            speciesEntry.innerHTML = `
                <div style="width: 40px; height: 40px; background-image: url('${spritePath}'); background-size: contain; background-repeat: no-repeat; background-position: center; margin-right: 15px; flex-shrink: 0;"></div>
                
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                        <h4 style="margin: 0; color: ${this.getRarityColor(species.bestRarity)}; font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${species.name}</h4>
                        <div style="color: #facc15; font-weight: 600; font-size: 14px; flex-shrink: 0; margin-left: 10px;">${species.bestValue} coins</div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 12px;">
                        <div>
                            <span style="color: #8a9cad;">Weight:</span>
                            <span style="color: #4a90e2; font-weight: 600; margin-left: 5px;">${typeof species.bestWeight === 'number' ? species.bestWeight.toFixed(2) : species.bestWeight}lb</span>
                        </div>
                        <div>
                            <span style="color: #8a9cad;">Caught:</span>
                            <span style="color: #64b5f6; font-weight: 600; margin-left: 5px;">${species.totalCaught}x</span>
                        </div>
                        <div>
                            <span style="color: #8a9cad;">Rarity:</span>
                            <span style="color: ${this.getRarityColor(species.bestRarity)}; font-weight: 600; margin-left: 5px; text-transform: capitalize;">${species.bestRarity}</span>
                        </div>
                    </div>
                </div>
                
                <div style="color: #8a9cad; font-size: 18px; margin-left: 10px; flex-shrink: 0;">#${index + 1}</div>
            `;
            
            // Add hover effects
            speciesEntry.addEventListener('mouseenter', () => {
                speciesEntry.style.backgroundColor = 'rgba(50, 65, 85, 0.8)';
                speciesEntry.style.transform = 'translateX(5px)';
            });
            
            speciesEntry.addEventListener('mouseleave', () => {
                speciesEntry.style.backgroundColor = 'rgba(40, 50, 65, 0.6)';
                speciesEntry.style.transform = 'translateX(0)';
            });
            
            // Click for details (future feature)
            speciesEntry.addEventListener('click', () => {
                this.showSpeciesDetails(species);
            });
            
            speciesList.appendChild(speciesEntry);
        });
        
        speciesSection.appendChild(speciesHeader);
        speciesSection.appendChild(speciesList);
        container.appendChild(speciesSection);
        
        phshdexTab.appendChild(container);
    }

    // Fallback method to analyze current fish if no persistent data is available
    analyzeCurrentFish(inventory) {
        const caughtFishItems = inventory.items.filter(item => item.type === 'fish');
        
        if (caughtFishItems.length === 0) {
            return null;
        }
        
        // Calculate gross statistics
        let biggestValueCatch = { value: 0, speciesName: '', weight: 0, timestamp: 0 };
        let largestWeightCatch = { weight: 0, speciesName: '', value: 0, timestamp: 0 };
        let totalValueEarned = 0;
        let totalFishCaught = 0;
        const speciesMap = new Map();
        
        caughtFishItems.forEach(fish => {
            const fishStats = fish.metadata?.fishStats;
            // Use official weight if weighed, otherwise use preliminary weight for analysis
            const weight = fishStats?.hasBeenWeighed ? fishStats.weight : (fishStats?.preliminaryWeight || 0);
            const value = fish.value || 0;
            const speciesName = fish.name;
            const timestamp = fishStats?.timestamp || Date.now();
            
            totalFishCaught++;
            totalValueEarned += value;
            
            // Track biggest value catch
            if (value > biggestValueCatch.value) {
                biggestValueCatch = { value, speciesName, weight, timestamp };
            }
            
            // Track largest weight catch (only count officially weighed fish for weight records)
            if (fishStats?.hasBeenWeighed && weight > largestWeightCatch.weight) {
                largestWeightCatch = { weight, speciesName, value, timestamp };
            }
            
            // Build species records (keeping best of each species)
            // For weight comparison, only consider officially weighed fish
            const existingEntry = speciesMap.get(speciesName);
            const shouldUpdateWeight = fishStats?.hasBeenWeighed && (!existingEntry || weight > (existingEntry.bestWeight || 0));
            
            if (!speciesMap.has(speciesName) || shouldUpdateWeight) {
                speciesMap.set(speciesName, {
                    name: speciesName,
                    bestWeight: fishStats?.hasBeenWeighed ? weight : (existingEntry?.bestWeight || 0),
                    bestValue: value > (existingEntry?.bestValue || 0) ? value : (existingEntry?.bestValue || value),
                    bestRarity: fish.rarity,
                    totalCaught: (existingEntry?.totalCaught || 0) + 1,
                    firstCaughtTimestamp: existingEntry?.firstCaughtTimestamp || timestamp,
                    bestCatchData: {
                        weight: fishStats?.hasBeenWeighed ? weight : (existingEntry?.bestCatchData?.weight || 0),
                        value: value > (existingEntry?.bestValue || 0) ? value : (existingEntry?.bestCatchData?.value || value),
                        rarity: fish.rarity,
                        timestamp,
                        sprite: fish.sprite,
                        hasBeenWeighed: fishStats?.hasBeenWeighed || false
                    }
                });
            } else {
                // Update total caught and best value if this is a better specimen
                const existing = speciesMap.get(speciesName);
                existing.totalCaught += 1;
                if (value > existing.bestValue) {
                    existing.bestValue = value;
                    existing.bestRarity = fish.rarity;
                    existing.bestCatchData = {
                        weight: existing.bestCatchData.weight, // Keep existing weight unless this one is weighed and better
                        value,
                        rarity: fish.rarity,
                        timestamp,
                        sprite: fish.sprite,
                        hasBeenWeighed: existing.bestCatchData.hasBeenWeighed
                    };
                }
            }
        });
        
        // Convert map to records object
        const speciesRecords = {};
        speciesMap.forEach((value, key) => {
            speciesRecords[key] = value;
        });
        
        return {
            speciesRecords,
            overallStats: {
                biggestValueCatch,
                largestWeightCatch,
                totalValueEarned,
                totalFishCaught
            }
        };
    }

    // Method to show detailed species information (placeholder for future)
    showSpeciesDetails(species) {
        console.log('Species details for:', species.name);
        // Future: Show modal with catch history, locations, gear used, etc.
    }

    // Helper method to get rarity level (for stars)
    getRarityLevel(rarity) {
        switch(rarity.toLowerCase()) {
            case 'common': return 1;
            case 'uncommon': return 2;
            case 'rare': return 3;
            case 'epic': return 4;
            case 'legendary': return 5;
            default: return 1;
        }
    }

    // Helper method to format stat multipliers
    formatStatMultiplier(value) {
        const num = Number(value);
        if (isNaN(num)) return '1.0x';
        return `${num.toFixed(1)}x`;
    }

    // Helper method to get default rod description
    getDefaultRodDescription(rod) {
        if (rod.description) return rod.description;
        
        // Generate description based on rod type and stats
        const isCrafted = rod.metadata.rodStats.custom === true;
        const luck = rod.metadata.rodStats.luck || 0;
        const lootScore = rod.metadata.rodStats.lootScore || 1;
        
        if (isCrafted) {
            return "Expertly crafted with premium materials. Designed for serious anglers who demand performance and reliability.";
        } else if (rod.id === 'explorer_rod') {
            return "Specialized archaeological equipment. Not ideal for fishing, but excellent for detecting underwater treasures and artifacts.";
        } else if (lootScore > 1.1) {
            return "This rod has an affinity for finding valuable items beneath the surface.";
        } else if (luck > 1.2) {
            return "A lucky rod that seems to attract the finest catches.";
        } else {
            return "A reliable fishing rod suitable for various fishing conditions.";
        }
    }

    // Helper method to get rod special ability
    getRodSpecialAbility(rod) {
        if (rod.specialAbility) return rod.specialAbility;
        
        // Generate special ability based on rod characteristics
        const stats = rod.metadata.rodStats;
        const isCrafted = stats.custom === true;
        const lootScore = stats.lootScore || 1;
        const luck = stats.luck || 0;
        
        if (rod.id === 'explorer_rod') {
            return "Treasure Hunter";
        } else if (isCrafted) {
            if (rod.id === 'iron_rod') {
                return "Reliable Performance";
            } else if (rod.id === 'gold_rod') {
                return "Lucky Charm";
            } else if (rod.id === 'mithril_rod') {
                return "Balanced Excellence";
            }
        } else if (lootScore > 1.1) {
            return "Loot Detector";
        } else if (luck > 1.2) {
            return "Fortune's Favor";
        }
        
        return null; // No special ability
    }

    // Helper method to determine rod type based on characteristics
    determineRodType(rod) {
        // Check for explicit origin field first (new system)
        if (rod.metadata?.rodStats?.origin) {
            return rod.metadata.rodStats.origin;
        }
        
        // Fallback to old ID-based categorization for rods without origin field
        const rodId = rod.id;
        
        // Player-crafted rods (from Toolmaster)
        if (['iron_rod', 'gold_rod', 'mithril_rod'].includes(rodId)) {
            return 'crafted';
        }
        
        // Merchant/bought rods
        if (['oak_rod', 'carbon_fiber_rod', 'light_rod'].includes(rodId)) {
            return 'merchant';
        }
        
        // Treasure/loot specialized rods
        if (['explorer_rod'].includes(rodId)) {
            return 'treasure';
        }
        
        // Relic/special/rare rods (from chests, trades, special events)
        if (['relic_rod', 'nimbus_rod', 'zhu_rod', 'leviathan_rod', 'keystone_rod'].includes(rodId)) {
            return 'relic';
        }
        
        // Starter/beginner rods
        if (['beginner-rod'].includes(rodId)) {
            return 'starter';
        }
        
        // Default fallback - assume merchant rod
        return 'merchant';
    }

    // Helper method to get enchantment slots based on rod type
    getEnchantmentSlots(rodType) {
        switch (rodType) {
            case 'crafted':    // Player-crafted rods get 2 slots (investment reward)
                return 2;
            case 'merchant':   // Store-bought rods get 1 slot (standard equipment)
            case 'treasure':   // Treasure hunting rods get 1 slot (specialized tools)
            case 'relic':      // Relic/special rods get 1 slot (unique finds)
            case 'starter':    // Beginner rods get 1 slot (basic equipment)
            default:
                return 1;
        }
    }

    // Helper method to get display text for rod type
    getRodTypeDisplay(rodType) {
        switch (rodType) {
            case 'crafted':
                return '[CRAFTED]';
            case 'merchant':
                return '[MERCHANT]';
            case 'treasure':
                return '[TREASURE]';
            case 'relic':
                return '[RELIC]';
            case 'starter':
                return '[STARTER]';
            default:
                return '[FOUND]';
        }
    }

    // Method to determine trophy status from server data
    getTrophyStatus(fish) {
        // Check if fish has trophy metadata (will be sent from server)
        if (fish.metadata && fish.metadata.fishStats && fish.metadata.fishStats.trophyStatus) {
            return fish.metadata.fishStats.trophyStatus;
        }
        return null; // No trophy status
    }

    // Method to get trophy display
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
        
        return `<div class="fish-trophy-status" style="font-size: 8px; text-align: center; color: ${trophy.color}; margin-bottom: 4px; font-weight: bold;">${trophy.emoji} [${trophy.text}]</div>`;
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
                return `<div style="font-size: 12px; color: ${trophy.color}; font-style: italic; font-weight: bold;">${trophy.emoji} ${trophy.text} (${trophyTypeText})</div>`;
            }
        }
        
        // Default to "Officially Weighed" if no trophy status
        return '<div style="font-size: 12px; color: #4CAF50; font-style: italic;">✓ Officially Weighed</div>';
    }

    updateChestsTab(inventory) {
        const chestsTab = document.getElementById('chests-tab');
        if (!chestsTab) return;

        chestsTab.innerHTML = '';

        // Filter and sort chests and ores
        const chestItems = inventory.items
            .filter(item => item.type === 'chest')
            .reverse(); // Show newest first
        
        const oreItems = inventory.items
            .filter(item => item.id && item.id.includes('ore'))
            .reverse(); // Show newest first

        if (chestItems.length === 0 && oreItems.length === 0) {
            chestsTab.innerHTML = '<div class="inventory-empty-message">No chests or ores available</div>';
            return;
        }

        // Create a container with padding for the grid
        const chestContainer = document.createElement('div');
        chestContainer.style.padding = '15px';

        // Create grid layout similar to rods
        const chestGrid = document.createElement('div');
        chestGrid.className = 'chest-inventory-grid';
        chestGrid.style.display = 'grid';
        chestGrid.style.gridTemplateColumns = 'repeat(10, 1fr)';
        chestGrid.style.gap = '0';
        chestGrid.style.padding = '0';
        
        // Get the asset base URL for icons
        const baseUrl = this.getAssetBaseUrl();
        
        // Add each chest as a grid item
        chestItems.forEach(chest => {
            const chestIconPath = `${baseUrl}/ui/icons/${chest.sprite}`; 
            const chestElement = document.createElement('div');
            chestElement.className = `chest-grid-item ${chest.rarity}`;
            chestElement.dataset.chestId = chest.id;
            
            // Style the chest item for grid
            chestElement.style.width = '60px';
            chestElement.style.height = '60px';
            chestElement.style.padding = '8px 5px';
            chestElement.style.display = 'flex';
            chestElement.style.flexDirection = 'column';
            chestElement.style.alignItems = 'center';
            chestElement.style.position = 'relative'; // For quantity badge
            
            // Add chest icon
            const iconImg = document.createElement('img');
            iconImg.src = chestIconPath;
            iconImg.alt = 'Chest';
            iconImg.style.width = '32px';
            iconImg.style.height = '32px';
            iconImg.style.objectFit = 'contain';
            iconImg.style.marginBottom = '4px';
            
            // Add chest name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = chest.name || 'Chest';
            nameSpan.style.fontSize = '10px';
            nameSpan.style.textAlign = 'center';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '100%';

            // Add quantity badge if quantity > 1
            if (chest.quantity > 1) {
                const quantityBadge = document.createElement('div');
                quantityBadge.style.position = 'absolute';
                quantityBadge.style.top = '2px';
                quantityBadge.style.right = '2px';
                quantityBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                quantityBadge.style.color = 'white';
                quantityBadge.style.padding = '2px 4px';
                quantityBadge.style.borderRadius = '4px';
                quantityBadge.style.fontSize = '10px';
                quantityBadge.style.fontWeight = 'bold';
                quantityBadge.textContent = chest.quantity;
                chestElement.appendChild(quantityBadge);
            }
            
            chestElement.appendChild(iconImg);
            chestElement.appendChild(nameSpan);
            
            chestElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            chestElement.style.border = '2px solid #3a4a5c';
            chestElement.style.borderRadius = '10px';
            chestElement.style.cursor = 'pointer';
            
            // Function to open the chest - shared between click and touch
            const openChest = (e) => {
                // Prevent default behavior to ensure our handler runs
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                console.log(`Opening chest: ${chest.id}`);
                
                // Close the inventory UI first
                this.toggleEquipmentMenu(false);
                
                // Send data to server to open the chest
                hytopia.sendData({
                    type: 'openChest', 
                    chestId: chest.id
                });
            };
            
            // Add click event for desktop and mouse
            chestElement.addEventListener('click', openChest);
            
            // Add proper touch event handling
            let touchStarted = false;
            let longPressTimer = null;
            
            // Handle touch start - detect long press for tooltip
            chestElement.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                touchStarted = true;
                
                // Set up timer for long press (tooltip)
                longPressTimer = setTimeout(() => {
                    this.showChestTooltip(chest, e);
                    touchStarted = false; // Prevent tap after tooltip
                }, 500);
            });
            
            // Clear timer on touch move
            chestElement.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
            });
            
            // Handle touch end - open chest if it was a tap
            chestElement.addEventListener('touchend', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                
                // Clear long press timer
                if (longPressTimer) clearTimeout(longPressTimer);
                
                // If this was a tap (not long press or move), open the chest
                if (touchStarted) {
                    console.log('Touch detected on chest item, opening');
                    openChest(e);
                }
                
                // Hide tooltip if showing
                setTimeout(() => {
                    const tooltip = document.getElementById('chest-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                }, 100);
                
                touchStarted = false;
            });
            
            // Cancel touch interaction on touch cancel
            chestElement.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
                
                // Hide tooltip if showing
                const tooltip = document.getElementById('chest-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            // Add tooltip on hover for desktop
            chestElement.addEventListener('mouseenter', (e) => {
                this.showChestTooltip(chest, e);
            });
            
            chestElement.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('chest-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            chestGrid.appendChild(chestElement);
        });
        
        // Add ores to the grid (similar to chests)
        oreItems.forEach(ore => {
            const oreIconPath = `${baseUrl}/ui/icons/${ore.sprite}`; 
            const oreElement = document.createElement('div');
            oreElement.className = `chest-grid-item ${ore.rarity}`;
            oreElement.dataset.oreId = ore.id;
            
            // Style the ore item for grid
            oreElement.style.width = '60px';
            oreElement.style.height = '60px';
            oreElement.style.padding = '8px 5px';
            oreElement.style.display = 'flex';
            oreElement.style.flexDirection = 'column';
            oreElement.style.alignItems = 'center';
            oreElement.style.position = 'relative'; // For quantity badge
            
            // Add ore icon
            const iconImg = document.createElement('img');
            iconImg.src = oreIconPath;
            iconImg.alt = 'Ore';
            iconImg.style.width = '32px';
            iconImg.style.height = '32px';
            iconImg.style.objectFit = 'contain';
            iconImg.style.marginBottom = '4px';
            
            // Add ore name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = ore.name || 'Ore';
            nameSpan.style.fontSize = '10px';
            nameSpan.style.textAlign = 'center';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '100%';

            // Add quantity badge if quantity > 1
            if (ore.quantity > 1) {
                const quantityBadge = document.createElement('div');
                quantityBadge.style.position = 'absolute';
                quantityBadge.style.top = '2px';
                quantityBadge.style.right = '2px';
                quantityBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                quantityBadge.style.color = 'white';
                quantityBadge.style.padding = '2px 4px';
                quantityBadge.style.borderRadius = '4px';
                quantityBadge.style.fontSize = '10px';
                quantityBadge.style.fontWeight = 'bold';
                quantityBadge.textContent = ore.quantity;
                oreElement.appendChild(quantityBadge);
            }
            
            oreElement.appendChild(iconImg);
            oreElement.appendChild(nameSpan);
            
            // Add "Open" button for ores (similar to chests)
            const openButton = document.createElement('button');
            openButton.textContent = 'Open';
            openButton.style.position = 'absolute';
            openButton.style.bottom = '2px';
            openButton.style.left = '50%';
            openButton.style.transform = 'translateX(-50%)';
            openButton.style.width = '90%';
            openButton.style.height = '16px';
            openButton.style.fontSize = '9px';
            openButton.style.padding = '0';
            openButton.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
            openButton.style.color = 'white';
            openButton.style.border = '1px solid rgba(56, 142, 60, 1)';
            openButton.style.borderRadius = '4px';
            openButton.style.cursor = 'pointer';
            openButton.style.fontWeight = 'bold';
            openButton.style.zIndex = '10';
            openButton.style.display = 'flex';
            openButton.style.alignItems = 'center';
            openButton.style.justifyContent = 'center';
            openButton.style.lineHeight = '1';
            openButton.onmouseenter = () => {
                openButton.style.backgroundColor = 'rgba(76, 175, 80, 1)';
            };
            openButton.onmouseleave = () => {
                openButton.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
            };
            
            oreElement.appendChild(openButton);
            
            oreElement.style.backgroundColor = 'rgba(40, 50, 65, 0.7)';
            oreElement.style.border = '2px solid #3a4a5c';
            oreElement.style.borderRadius = '10px';
            oreElement.style.cursor = 'pointer';
            
            // Function to open the ore - shared between click and touch
            const openOre = (e) => {
                // Prevent default behavior to ensure our handler runs
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                console.log(`Opening ore: ${ore.id}`);
                
                // Close the inventory UI first
                this.toggleEquipmentMenu(false);
                
                // Send data to server to open the ore
                hytopia.sendData({
                    type: 'openOre', 
                    oreId: ore.id
                });
            };
            
            // Add click event for desktop and mouse (on the ore element)
            oreElement.addEventListener('click', openOre);
            
            // Add click event for the Open button
            openButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering oreElement click
                openOre(e);
            });
            
            // Add proper touch event handling
            let touchStarted = false;
            let longPressTimer = null;
            
            // Handle touch start - detect long press for tooltip
            oreElement.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                touchStarted = true;
                
                // Set up timer for long press (tooltip)
                longPressTimer = setTimeout(() => {
                    this.showOreTooltip(ore, e);
                    touchStarted = false; // Prevent tap after tooltip
                }, 500);
            });
            
            // Clear timer on touch move
            oreElement.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
            });
            
            // Handle touch end - open ore if it was a tap
            oreElement.addEventListener('touchend', (e) => {
                e.preventDefault(); // Important to prevent mouse events
                
                // Clear long press timer
                if (longPressTimer) clearTimeout(longPressTimer);
                
                // If this was a tap (not long press or move), open the ore
                if (touchStarted) {
                    console.log('Touch detected on ore item, opening');
                    openOre(e);
                }
                
                // Hide tooltip if showing
                setTimeout(() => {
                    const tooltip = document.getElementById('ore-tooltip');
                    if (tooltip) tooltip.style.display = 'none';
                }, 100);
                
                touchStarted = false;
            });
            
            // Cancel touch interaction on touch cancel
            oreElement.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                if (longPressTimer) clearTimeout(longPressTimer);
                touchStarted = false;
                
                // Hide tooltip if showing
                const tooltip = document.getElementById('ore-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            // Add tooltip on hover for desktop
            oreElement.addEventListener('mouseenter', (e) => {
                this.showOreTooltip(ore, e);
            });
            
            oreElement.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('ore-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            
            chestGrid.appendChild(oreElement);
        });
        
        // Add the grid to the container, then the container to the tab
        chestContainer.appendChild(chestGrid);
        chestsTab.appendChild(chestContainer);
        console.log('Chest and ore grid created');
    }

    // Add method for ore tooltips
    showOreTooltip(ore, event) {
        const tooltip = document.createElement('div');
        tooltip.id = 'ore-tooltip';
        tooltip.className = 'tooltip';
        
        // Get the ore type name
        const oreType = ore.name;
        
        tooltip.innerHTML = `
            <div class="tooltip-header ${ore.rarity.toLowerCase()}">
                <span>${oreType}</span>
            </div>
            <div class="tooltip-body">
                <p>${ore.description || 'A mystical ore containing valuable materials.'}</p>
                ${ore.quantity > 1 ? `<p>Quantity: ${ore.quantity}</p>` : ''}
            </div>
            <div class="tooltip-footer">
                <span class="tooltip-hint">Click to open</span>
            </div>
        `;
        
        // Position tooltip near the mouse/event
        const rect = event.target.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.zIndex = '10000';
        
        // Remove existing tooltip if any
        const existingTooltip = document.getElementById('ore-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        document.body.appendChild(tooltip);
    }

    // Add method for chest tooltips
    showChestTooltip(chest, event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        
        // Get the chest type name without the word "chest"
        const chestType = chest.name.replace(' Chest', '');
        
        tooltip.innerHTML = `
            <div class="tooltip-header ${chest.rarity.toLowerCase()}">
                <span>${chestType}</span>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-description">${chest.metadata.lootStats.description}</div>
                <div class="tooltip-stats">
                    <div class="tooltip-stat">
                        <span class="stat-label">Value:</span>
                        <span class="stat-value">${chest.value} coins</span>
                    </div>
                    <div class="tooltip-stat">
                        <span class="stat-label">Quantity:</span>
                        <span class="stat-value">${chest.quantity || 1}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position the tooltip
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        
        // Remove tooltip on mouse leave
        event.target.addEventListener('mouseleave', () => {
            tooltip.remove();
        }, { once: true });
    }
}

// Make it globally available
window.InventoryPanel = new InventoryPanel();
console.log('InventoryPanel global object created'); 