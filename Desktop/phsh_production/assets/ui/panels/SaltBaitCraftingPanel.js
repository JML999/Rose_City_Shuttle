// Global spam protection for Salt Bait Crafting
let globalSaltBaitCraftingLock = false;
let globalSaltBaitCraftingTimeout = null;

class SaltBaitCraftingPanel {
    constructor() {
        this.container = null;
        this.playerCoins = 0;
        this.styleElement = null;
        this.selectedQuantity = 1;
        this.lastCraftTime = 0;
        this.craftInProgress = false;
        this.playerLevel = 1;
        this.currentBaitCount = 0;
        this.baitCap = 10;
        this.inventory = null;
        
        // Salt bait item data
        this.saltBaitItem = {
            id: 'bait_salty_bait',
            name: 'Salty Bait',
            iconImageUri: 'ui/icons/salty_bait_sprite.png',
            price: 50, // 50 coins per bait
            maxQuantity: 20
        };
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'salt-bait-crafting-ui';
        panel.innerHTML = `
            <div class="salt-bait-crafting-overlay" id="salt-bait-crafting-overlay">
                <div class="salt-bait-crafting-container">
                    <div class="salt-bait-crafting-header">
                        <div class="salt-bait-crafting-title">🧂 Ms. Dee's Bait Crafting</div>
                        <button class="salt-bait-crafting-close" id="salt-bait-crafting-close">×</button>
                    </div>
                    
                    <div class="salt-bait-crafting-content">
                        <div class="salt-bait-crafting-details" id="salt-bait-crafting-details">
                            <!-- Crafting interface will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.addStyles();
        this.setupEventListeners();
        
        // Hide panel initially
        document.getElementById('salt-bait-crafting-overlay').style.display = 'none';
        
        // Set up message handling
        hytopia.onData((data) => {
            if (data.type === 'currencyUpdate') {
                this.updateCoins(data.currency.coins);
            } else if (data.type === 'coinsUpdate') {
                this.updateCoins(data.coins);
            } else if (data.type === 'inventoryUpdate') {
                this.updateInventoryData(data.inventory);
            } else if (data.type === 'playerDataUpdate') {
                this.updatePlayerData(data);
            } else if (data.type === 'saltBaitCraftResult') {
                this.handleCraftResult(data);
            } else if (data.type === 'openSaltBaitCrafting') {
                this.open();
            }
        });
    }

    addStyles() {
        if (this.styleAdded) return;
        this.styleAdded = true;
        
        const style = document.createElement('style');
        style.textContent = `
            /* Salt Bait Crafting Panel Styles */
            .salt-bait-crafting-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                user-select: none;
            }

            .salt-bait-crafting-container {
                background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                border: 2px solid #444;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
                width: 360px;
                max-width: 90vw;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .salt-bait-crafting-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                border-bottom: 1px solid #444;
            }

            .salt-bait-crafting-title {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .salt-bait-crafting-close {
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 6px;
                color: #ff6b6b;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            .salt-bait-crafting-close:hover,
            .salt-bait-crafting-close:active {
                background: rgba(255, 0, 0, 0.3);
                transform: scale(1.05);
            }

            .salt-bait-crafting-content {
                padding: 16px;
            }

            .salt-bait-crafting-interface {
                display: flex;
                flex-direction: column;
                gap: 16px;
                color: #ffffff;
            }

            .salt-bait-crafting-item-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding-bottom: 12px;
                border-bottom: 1px solid #444;
            }

            .salt-bait-crafting-item-icon {
                width: 48px;
                height: 48px;
                object-fit: contain;
                image-rendering: pixelated;
                border-radius: 6px;
                background: rgba(0, 0, 0, 0.4);
                padding: 6px;
                border: 2px solid #444;
            }

            .salt-bait-crafting-item-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                text-align: center;
            }

            .salt-bait-crafting-requirements {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .salt-bait-crafting-requirements-title {
                font-size: 14px;
                font-weight: 600;
                color: #facc15;
                margin-bottom: 4px;
            }

            .salt-bait-crafting-requirement {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #cccccc;
            }

            .salt-bait-crafting-requirement-icon {
                width: 24px;
                height: 24px;
                object-fit: contain;
                image-rendering: pixelated;
            }

            .salt-bait-crafting-requirement.sufficient {
                color: #4ade80;
            }

            .salt-bait-crafting-requirement.insufficient {
                color: #f87171;
            }

            .salt-bait-crafting-purchase-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: center;
            }

            .salt-bait-crafting-quantity-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .salt-bait-crafting-qty-btn {
                width: 40px;
                height: 40px;
                border: 1px solid #444;
                border-radius: 6px;
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                color: #ffffff;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                -webkit-user-select: none;
            }

            .salt-bait-crafting-qty-btn:hover,
            .salt-bait-crafting-qty-btn:active {
                background: #444;
                transform: translateY(-1px);
            }

            .salt-bait-crafting-qty-display {
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                min-width: 40px;
                text-align: center;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #444;
                border-radius: 6px;
            }

            .salt-bait-crafting-total-display {
                font-size: 16px;
                font-weight: 600;
                color: #facc15;
                text-align: center;
                padding: 8px 16px;
                background: rgba(250, 204, 21, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(250, 204, 21, 0.3);
            }

            .salt-bait-crafting-action-btn {
                background: linear-gradient(135deg, #4a9eff, #3d85e6);
                border: 2px solid #5ba3ff;
                border-radius: 8px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                padding: 12px 24px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                min-width: 200px;
                text-align: center;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                -webkit-user-select: none;
            }

            .salt-bait-crafting-action-btn:hover:not(:disabled):not(.disabled),
            .salt-bait-crafting-action-btn:active:not(:disabled):not(.disabled) {
                background: linear-gradient(135deg, #5ba3ff, #4a9eff);
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
            }

            .salt-bait-crafting-action-btn:disabled,
            .salt-bait-crafting-action-btn.disabled {
                background: linear-gradient(135deg, #666666, #555555);
                border-color: #777777;
                cursor: not-allowed;
                opacity: 0.7;
                transform: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .salt-bait-crafting-container {
                    width: 320px;
                    max-width: 95vw;
                }
                
                .salt-bait-crafting-header {
                    padding: 10px 12px;
                }
                
                .salt-bait-crafting-title {
                    font-size: 14px;
                }
                
                .salt-bait-crafting-close {
                    width: 20px;
                    height: 20px;
                    font-size: 14px;
                }
                
                .salt-bait-crafting-content {
                    padding: 12px;
                }
                
                .salt-bait-crafting-qty-btn {
                    width: 48px;
                    height: 48px;
                    font-size: 20px;
                }
                
                .salt-bait-crafting-qty-display {
                    font-size: 16px;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                
                .salt-bait-crafting-total-display {
                    font-size: 14px;
                }
                
                .salt-bait-crafting-action-btn {
                    font-size: 14px;
                    padding: 10px 20px;
                    min-width: 180px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const closeBtn = document.getElementById('salt-bait-crafting-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });
            
            if (hytopia.isMobile) {
                closeBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                });
            }
        }
    }

    open() {
        const overlay = document.getElementById('salt-bait-crafting-overlay');
        overlay.style.display = 'flex';
        
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();
        
        if (hytopia.isMobile) {
            this.hideMobileControls();
        }
        
        this.escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
        };
        document.addEventListener('keydown', this.escKeyHandler);
        
        this.updateCraftingInterface();
    }

    close() {
        const overlay = document.getElementById('salt-bait-crafting-overlay');
        overlay.style.display = 'none';
        
        if (this.escKeyHandler) {
            document.removeEventListener('keydown', this.escKeyHandler);
            this.escKeyHandler = null;
        }
        
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();
        
        if (hytopia.isMobile) {
            this.showMobileControls();
        }
        
        this.selectedQuantity = 1;
        
        globalSaltBaitCraftingLock = false;
        this.craftInProgress = false;
        if (globalSaltBaitCraftingTimeout) {
            clearTimeout(globalSaltBaitCraftingTimeout);
            globalSaltBaitCraftingTimeout = null;
        }
    }

    isOpen() {
        const overlay = document.getElementById('salt-bait-crafting-overlay');
        return overlay && overlay.style.display !== 'none';
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'salt-bait-crafting-chat-style';
            this.styleElement.textContent = `
                #chat-window {
                    display: none !important;
                }
            `;
            document.head.appendChild(this.styleElement);
        }
    }

    removeHideChatStyle() {
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

    hideMobileControls() {
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
        
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = 'none';
            }
        });
    }

    showMobileControls() {
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
        
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = '';
            }
        });
        
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = '';
            }
        });
    }

    updateCoins(coins) {
        this.playerCoins = coins;
        if (this.isOpen()) {
            this.updateCraftingInterface();
        }
    }

    updateInventoryData(inventory) {
        if (!inventory) return;
        
        this.inventory = inventory;
        
        this.currentBaitCount = inventory.items
            .filter(item => item.type === 'bait')
            .reduce((total, item) => total + (item.quantity || 1), 0);
        
        if (this.isOpen()) {
            this.updateCraftingInterface();
        }
    }

    updatePlayerData(data) {
        if (data.level !== undefined) {
            this.playerLevel = data.level;
            this.baitCap = this.calculateBaitCap(data.level);
        }
        
        if (data.coins !== undefined) {
            this.updateCoins(data.coins);
        }
        
        if (this.isOpen()) {
            this.updateCraftingInterface();
        }
    }

    calculateBaitCap(level) {
        if (level < 5) return 10;
        if (level < 10) return 20;
        if (level < 15) return 25;
        return 30;
    }

    getMackerelCount() {
        if (!this.inventory) return 0;
        return this.inventory.items
            .filter(item => item.type === 'fish' && item.metadata?.fishStats?.species === 'Mackerel')
            .reduce((total, item) => total + (item.quantity || 1), 0);
    }

    getRockSaltCount() {
        if (!this.inventory) return 0;
        const rockSaltItem = this.inventory.items.find(item => item.id === 'rock_salt');
        return rockSaltItem ? (rockSaltItem.quantity || 1) : 0;
    }

    updateCraftingInterface() {
        const panel = document.getElementById('salt-bait-crafting-details');
        if (!panel) return;
        
        const totalCost = this.saltBaitItem.price * this.selectedQuantity;
        const mackerelCount = this.getMackerelCount();
        const rockSaltCount = this.getRockSaltCount();
        const canAfford = this.playerCoins >= totalCost;
        const hasMackerel = mackerelCount >= this.selectedQuantity;
        const hasRockSalt = rockSaltCount >= this.selectedQuantity;
        const wouldExceedCap = this.currentBaitCount + this.selectedQuantity > this.baitCap;
        const canCraft = canAfford && hasMackerel && hasRockSalt && !wouldExceedCap;
        
        let buttonText = 'Craft Salty Bait';
        let buttonClass = 'salt-bait-crafting-action-btn';
        
        if (!canAfford) {
            buttonText = `Need $${totalCost} (Have $${this.playerCoins})`;
            buttonClass += ' disabled';
        } else if (!hasMackerel) {
            buttonText = `Need ${this.selectedQuantity} Mackerel (Have ${mackerelCount})`;
            buttonClass += ' disabled';
        } else if (!hasRockSalt) {
            buttonText = `Need ${this.selectedQuantity} Rock Salt (Have ${rockSaltCount})`;
            buttonClass += ' disabled';
        } else if (wouldExceedCap) {
            buttonText = 'Bait Limit Reached';
            buttonClass += ' disabled';
        }
        
        panel.innerHTML = `
            <div class="salt-bait-crafting-interface">
                <div class="salt-bait-crafting-item-display">
                    <img src="${this.getAssetBaseUrl()}/${this.saltBaitItem.iconImageUri}" alt="${this.saltBaitItem.name}" class="salt-bait-crafting-item-icon" onerror="this.src='${this.getAssetBaseUrl()}/ui/icons/bait_worm_sprite.png'">
                    <div class="salt-bait-crafting-item-name">${this.saltBaitItem.name}</div>
                </div>
                
                <div class="salt-bait-crafting-requirements">
                    <div class="salt-bait-crafting-requirements-title">Requires:</div>
                    <div class="salt-bait-crafting-requirement ${hasMackerel ? 'sufficient' : 'insufficient'}">
                        <img src="${this.getAssetBaseUrl()}/ui/icons/mackerel_sprite.png" alt="Mackerel" class="salt-bait-crafting-requirement-icon" onerror="this.style.display='none'">
                        <span>${this.selectedQuantity}x Mackerel (${hasMackerel ? mackerelCount : mackerelCount}/${this.selectedQuantity})</span>
                    </div>
                    <div class="salt-bait-crafting-requirement ${hasRockSalt ? 'sufficient' : 'insufficient'}">
                        <img src="${this.getAssetBaseUrl()}/ui/icons/rock_salt_sprite.png" alt="Rock Salt" class="salt-bait-crafting-requirement-icon" onerror="this.style.display='none'">
                        <span>${this.selectedQuantity}x Rock Salt (${hasRockSalt ? rockSaltCount : rockSaltCount}/${this.selectedQuantity})</span>
                    </div>
                </div>
                
                <div class="salt-bait-crafting-purchase-controls">
                    <div class="salt-bait-crafting-quantity-controls">
                        <button class="salt-bait-crafting-qty-btn salt-bait-crafting-qty-decrease">-</button>
                        <div class="salt-bait-crafting-qty-display">${this.selectedQuantity}</div>
                        <button class="salt-bait-crafting-qty-btn salt-bait-crafting-qty-increase">+</button>
                    </div>
                    
                    <div class="salt-bait-crafting-total-display">
                        ${totalCost} coins
                    </div>
                    
                    <button class="${buttonClass}" ${canCraft ? '' : 'disabled'}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;

        const decreaseBtn = panel.querySelector('.salt-bait-crafting-qty-decrease');
        const increaseBtn = panel.querySelector('.salt-bait-crafting-qty-increase');
        const confirmBtn = panel.querySelector('.salt-bait-crafting-action-btn');

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeQuantity(-1);
            });
            
            if (hytopia.isMobile) {
                decreaseBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.changeQuantity(-1);
                });
            }
        }
        
        if (increaseBtn) {
            increaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeQuantity(1);
            });
            
            if (hytopia.isMobile) {
                increaseBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.changeQuantity(1);
                });
            }
        }

        if (confirmBtn && canCraft) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.craftSaltBait();
            });
            
            if (hytopia.isMobile) {
                confirmBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.craftSaltBait();
                });
            }
        }
    }

    changeQuantity(delta) {
        this.selectedQuantity = Math.max(1, Math.min(this.saltBaitItem.maxQuantity, this.selectedQuantity + delta));
        this.updateCraftingInterface();
    }

    craftSaltBait() {
        const selectedQuantity = this.selectedQuantity;
        const totalCost = this.saltBaitItem.price * selectedQuantity;
        const canAfford = this.playerCoins >= totalCost;
        const mackerelCount = this.getMackerelCount();
        const rockSaltCount = this.getRockSaltCount();
        const hasMackerel = mackerelCount >= selectedQuantity;
        const hasRockSalt = rockSaltCount >= selectedQuantity;
        
        if (!canAfford || !hasMackerel || !hasRockSalt) {
            return;
        }
        
        const currentTime = Date.now();
        
        if (globalSaltBaitCraftingLock) {
            return;
        }
        
        if (this.craftInProgress) {
            return;
        }
        
        if (currentTime - this.lastCraftTime < 2000) {
            return;
        }
        
        globalSaltBaitCraftingLock = true;
        this.craftInProgress = true;
        this.lastCraftTime = currentTime;
        
        if (globalSaltBaitCraftingTimeout) {
            clearTimeout(globalSaltBaitCraftingTimeout);
        }
        
        this.close();
        
        const craftData = {
            type: 'craftSaltBait',
            quantity: selectedQuantity
        };
        
        hytopia.sendData(craftData);
        
        globalSaltBaitCraftingTimeout = setTimeout(() => {
            globalSaltBaitCraftingLock = false;
            this.craftInProgress = false;
        }, 3000);
    }

    handleCraftResult(data) {
        if (data.success) {
            globalSaltBaitCraftingLock = false;
            this.craftInProgress = false;
            if (globalSaltBaitCraftingTimeout) {
                clearTimeout(globalSaltBaitCraftingTimeout);
                globalSaltBaitCraftingTimeout = null;
            }
        } else {
            globalSaltBaitCraftingLock = false;
            this.craftInProgress = false;
            if (globalSaltBaitCraftingTimeout) {
                clearTimeout(globalSaltBaitCraftingTimeout);
                globalSaltBaitCraftingTimeout = null;
            }
        }
    }

    getAssetBaseUrl() {
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            return window.CDN_ASSETS_URL;
        }
        
        const scriptTags = document.getElementsByTagName('script');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].src;
            if (src && src.includes('/ui/panels/')) {
                const baseUrl = src.substring(0, src.indexOf('/ui/panels/'));
                return baseUrl;
            }
        }
        
        return window.location.origin;
    }
}

// Make it globally available
window.SaltBaitCraftingPanel = new SaltBaitCraftingPanel();

