// Global spam protection for Shrimp Shop
let globalShrimpShopLock = false;
let globalShrimpShopTimeout = null;

class ShrimpShopPanel {
    constructor() {
        this.container = null;
        this.playerCoins = 0;
        this.styleElement = null;
        this.selectedQuantity = 1;
        this.lastPurchaseTime = 0;
        this.purchaseInProgress = false;
        this.playerLevel = 1;
        this.currentBaitCount = 0;
        this.baitCap = 10;
        
        // Shrimp item data
        this.shrimpItem = {
            id: 'bait_shrimp',
            name: 'Bait Shrimp',
            iconImageUri: 'ui/icons/shrimp_sprite.png',
            price: 25, // 3 for $25
            bundleSize: 3,
            maxQuantity: 30 // Max sets of 3
        };
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML with smaller, more compact design
        const panel = document.createElement('div');
        panel.id = 'shrimp-shop-ui';
        panel.innerHTML = `
            <div class="shrimp-shop-overlay" id="shrimp-shop-overlay">
                <div class="shrimp-shop-container">
                    <div class="shrimp-shop-header">
                        <div class="shrimp-shop-title">🍤 Shrimp Shop</div>
                        <button class="shrimp-shop-close" id="shrimp-shop-close">×</button>
                    </div>
                    
                    <div class="shrimp-shop-content">
                        <div class="shrimp-shop-details" id="shrimp-shop-details">
                            <!-- Purchase interface will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.addStyles();
        this.setupEventListeners();
        
        // Hide panel initially
        document.getElementById('shrimp-shop-overlay').style.display = 'none';
        
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
            } else if (data.type === 'shrimpPurchaseResult') {
                this.handlePurchaseResult(data);
            } else if (data.type === 'openShrimpShop') {
                this.open();
            }
        });
    }

    addStyles() {
        if (this.styleAdded) return;
        this.styleAdded = true;
        
        const style = document.createElement('style');
        style.textContent = `
            /* Compact Shrimp Shop Styles */
            .shrimp-shop-overlay {
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

            .shrimp-shop-container {
                background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                border: 2px solid #444;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
                width: 320px;
                max-width: 90vw;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .shrimp-shop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                border-bottom: 1px solid #444;
            }

            .shrimp-shop-title {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .shrimp-shop-close {
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

            .shrimp-shop-close:hover,
            .shrimp-shop-close:active {
                background: rgba(255, 0, 0, 0.3);
                transform: scale(1.05);
            }

            .shrimp-shop-content {
                padding: 16px;
            }

            .shrimp-shop-purchase-interface {
                display: flex;
                flex-direction: column;
                gap: 16px;
                color: #ffffff;
            }

            .shrimp-shop-item-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding-bottom: 12px;
                border-bottom: 1px solid #444;
            }

            .shrimp-shop-item-icon {
                width: 48px;
                height: 48px;
                object-fit: contain;
                image-rendering: pixelated;
                border-radius: 6px;
                background: rgba(0, 0, 0, 0.4);
                padding: 6px;
                border: 2px solid #444;
            }

            .shrimp-shop-item-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                text-align: center;
            }

            .shrimp-shop-purchase-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: center;
            }

            .shrimp-shop-quantity-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .shrimp-shop-qty-btn {
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

            .shrimp-shop-qty-btn:hover,
            .shrimp-shop-qty-btn:active {
                background: #444;
                transform: translateY(-1px);
            }

            .shrimp-shop-qty-display {
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

            .shrimp-shop-total-display {
                font-size: 16px;
                font-weight: 600;
                color: #facc15;
                text-align: center;
                padding: 8px 16px;
                background: rgba(250, 204, 21, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(250, 204, 21, 0.3);
            }

            .shrimp-shop-action-btn {
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

            .shrimp-shop-action-btn:hover:not(:disabled):not(.disabled),
            .shrimp-shop-action-btn:active:not(:disabled):not(.disabled) {
                background: linear-gradient(135deg, #5ba3ff, #4a9eff);
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
            }

            .shrimp-shop-action-btn:disabled,
            .shrimp-shop-action-btn.disabled {
                background: linear-gradient(135deg, #666666, #555555);
                border-color: #777777;
                cursor: not-allowed;
                opacity: 0.7;
                transform: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .shrimp-shop-container {
                    width: 280px;
                    max-width: 95vw;
                }
                
                .shrimp-shop-header {
                    padding: 10px 12px;
                }
                
                .shrimp-shop-title {
                    font-size: 14px;
                }
                
                .shrimp-shop-close {
                    width: 20px;
                    height: 20px;
                    font-size: 14px;
                }
                
                .shrimp-shop-content {
                    padding: 12px;
                }
                
                .shrimp-shop-qty-btn {
                    width: 48px;
                    height: 48px;
                    font-size: 20px;
                }
                
                .shrimp-shop-qty-display {
                    font-size: 16px;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                
                .shrimp-shop-total-display {
                    font-size: 14px;
                }
                
                .shrimp-shop-action-btn {
                    font-size: 14px;
                    padding: 10px 20px;
                    min-width: 180px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Close button with mobile touch support
        const closeBtn = document.getElementById('shrimp-shop-close');
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
        const overlay = document.getElementById('shrimp-shop-overlay');
        overlay.style.display = 'flex';
        
        // Disable player input and hide chat
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();
        
        // Handle mobile-specific setup
        if (hytopia.isMobile) {
            this.hideMobileControls();
        }
        
        // Add ESC key listener when panel opens
        this.escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
        };
        document.addEventListener('keydown', this.escKeyHandler);
        
        this.updatePurchaseInterface();
    }

    close() {
        const overlay = document.getElementById('shrimp-shop-overlay');
        overlay.style.display = 'none';
        
        // Remove ESC key listener when panel closes
        if (this.escKeyHandler) {
            document.removeEventListener('keydown', this.escKeyHandler);
            this.escKeyHandler = null;
        }
        
        // Re-enable player input and show chat
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();
        
        // Handle mobile-specific cleanup
        if (hytopia.isMobile) {
            this.showMobileControls();
        }
        
        // Reset selection
        this.selectedQuantity = 1;
        
        // Reset purchase locks when panel closes
        globalShrimpShopLock = false;
        this.purchaseInProgress = false;
        if (globalShrimpShopTimeout) {
            clearTimeout(globalShrimpShopTimeout);
            globalShrimpShopTimeout = null;
        }
    }

    isOpen() {
        const overlay = document.getElementById('shrimp-shop-overlay');
        return overlay && overlay.style.display !== 'none';
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'shrimp-shop-chat-style';
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
            this.updatePurchaseInterface();
        }
    }

    updateInventoryData(inventory) {
        if (!inventory) return;
        
        // Count current bait items
        this.currentBaitCount = inventory.items
            .filter(item => item.type === 'bait')
            .reduce((total, item) => total + (item.quantity || 1), 0);
        
        if (this.isOpen()) {
            this.updatePurchaseInterface();
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
            this.updatePurchaseInterface();
        }
    }

    calculateBaitCap(level) {
        if (level < 5) return 10;
        if (level < 10) return 20;
        if (level < 15) return 25;
        return 30; // Max cap at level 15+
    }

    updatePurchaseInterface() {
        const panel = document.getElementById('shrimp-shop-details');
        if (!panel) return;
        
        const totalCost = this.shrimpItem.price * this.selectedQuantity;
        const totalShrimp = this.shrimpItem.bundleSize * this.selectedQuantity;
        const canAfford = this.playerCoins >= totalCost;
        const wouldExceedCap = this.currentBaitCount + totalShrimp > this.baitCap;
        const canPurchase = canAfford && !wouldExceedCap;
        
        // Determine button text and state
        let buttonText = 'Buy Shrimp';
        let buttonClass = 'shrimp-shop-action-btn';
        
        if (!canAfford) {
            buttonText = `Need $${totalCost} (Have $${this.playerCoins})`;
            buttonClass += ' disabled';
        } else if (wouldExceedCap) {
            buttonText = 'Bait Limit Reached';
            buttonClass += ' disabled';
        }
        
        panel.innerHTML = `
            <div class="shrimp-shop-purchase-interface">
                <div class="shrimp-shop-item-display">
                    <img src="${this.getAssetBaseUrl()}/${this.shrimpItem.iconImageUri}" alt="${this.shrimpItem.name}" class="shrimp-shop-item-icon">
                    <div class="shrimp-shop-item-name">${this.shrimpItem.name}</div>
                </div>
                
                <div class="shrimp-shop-purchase-controls">
                    <div class="shrimp-shop-quantity-controls">
                        <button class="shrimp-shop-qty-btn shrimp-shop-qty-decrease">-</button>
                        <div class="shrimp-shop-qty-display">${totalShrimp}</div>
                        <button class="shrimp-shop-qty-btn shrimp-shop-qty-increase">+</button>
                    </div>
                    
                    <div class="shrimp-shop-total-display">
                        ${totalCost} coins
                    </div>
                    
                    <button class="${buttonClass}" ${canPurchase ? '' : 'disabled'}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;

        // Add event listeners with mobile touch support
        const decreaseBtn = panel.querySelector('.shrimp-shop-qty-decrease');
        const increaseBtn = panel.querySelector('.shrimp-shop-qty-increase');
        const confirmBtn = panel.querySelector('.shrimp-shop-action-btn');

        if (decreaseBtn) {
            // Add both click and touch events for mobile support
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
            // Add both click and touch events for mobile support
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

        if (confirmBtn && canPurchase) {
            // Add both click and touch events for mobile support
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.purchaseShrimp();
            });
            
            if (hytopia.isMobile) {
                confirmBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.purchaseShrimp();
                });
            }
        }
    }

    changeQuantity(delta) {
        this.selectedQuantity = Math.max(1, Math.min(this.shrimpItem.maxQuantity, this.selectedQuantity + delta));
        this.updatePurchaseInterface();
    }

    purchaseShrimp() {
        // Capture values in local variables to prevent context issues
        const selectedSets = this.selectedQuantity;
        const totalCost = this.shrimpItem.price * selectedSets;
        const totalShrimp = this.shrimpItem.bundleSize * selectedSets;
        const canAfford = this.playerCoins >= totalCost;
        
        
        if (!canAfford) {
            return;
        }
        
        // Enhanced spam protection
        const currentTime = Date.now();
        
        if (globalShrimpShopLock) {
            return;
        }
        
        if (this.purchaseInProgress) {
            return;
        }
        
        if (currentTime - this.lastPurchaseTime < 2000) {
            return;
        }
        
        // Set all locks immediately
        globalShrimpShopLock = true;
        this.purchaseInProgress = true;
        this.lastPurchaseTime = currentTime;
        
        // Clear any existing timeout
        if (globalShrimpShopTimeout) {
            clearTimeout(globalShrimpShopTimeout);
        }
        // Close the panel immediately so user can see any error messages or success popups
        this.close();
        
        const purchaseData = {
            type: 'purchaseShrimp',
            shrimpQuantity: totalShrimp,
            totalPrice: totalCost,
            sets: selectedSets
        };
        
        hytopia.sendData(purchaseData);
        
        // Set timeout to unlock purchasing after 3 seconds
        globalShrimpShopTimeout = setTimeout(() => {
            globalShrimpShopLock = false;
            this.purchaseInProgress = false;
        }, 3000);
    }

    handlePurchaseResult(data) {
        if (data.success) {
            
            // Clear locks immediately on success
            globalShrimpShopLock = false;
            this.purchaseInProgress = false;
            if (globalShrimpShopTimeout) {
                clearTimeout(globalShrimpShopTimeout);
                globalShrimpShopTimeout = null;
            }
            
            // Panel is already closed from purchaseShrimp(), no need to close again
        } else {
            
            // Reset locks on failure to allow retry
            globalShrimpShopLock = false;
            this.purchaseInProgress = false;
            if (globalShrimpShopTimeout) {
                clearTimeout(globalShrimpShopTimeout);
                globalShrimpShopTimeout = null;
            }
        }
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
}

// Make it globally available
window.ShrimpShopPanel = new ShrimpShopPanel();