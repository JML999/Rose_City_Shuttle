// Global spam protection for Rune Shop
let globalRuneShopLock = false;
let globalRuneShopTimeout = null;

class RuneShopPanel {
    constructor() {
        this.container = null;
        this.playerCoins = 0;
        this.styleElement = null;
        this.selectedQuantity = 1;
        this.lastPurchaseTime = 0;
        this.purchaseInProgress = false;
        this.playerLevel = 1;
        
        // Rune item data
        this.runeItem = {
            id: 'rune',
            name: 'Rune',
            iconImageUri: 'ui/icons/rune_sprite.png',
            price: 2500, // 2500 coins per rune
            maxQuantity: 10 // Max 10 runes per purchase
        };
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML with smaller, more compact design
        const panel = document.createElement('div');
        panel.id = 'rune-shop-ui';
        panel.innerHTML = `
            <div class="rune-shop-overlay" id="rune-shop-overlay">
                <div class="rune-shop-container">
                    <div class="rune-shop-header">
                        <div class="rune-shop-title">🔮 Wizard's Rune Shop</div>
                        <button class="rune-shop-close" id="rune-shop-close">×</button>
                    </div>
                    
                    <div class="rune-shop-content">
                        <div class="rune-shop-details" id="rune-shop-details">
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
        document.getElementById('rune-shop-overlay').style.display = 'none';
        
        // Set up message handling
        hytopia.onData((data) => {
            if (data.type === 'currencyUpdate') {
                this.updateCoins(data.currency.coins);
            } else if (data.type === 'coinsUpdate') {
                this.updateCoins(data.coins);
            } else if (data.type === 'playerDataUpdate') {
                this.updatePlayerData(data);
            } else if (data.type === 'runePurchaseResult') {
                this.handlePurchaseResult(data);
            } else if (data.type === 'openRuneShop') {
                this.open();
            }
        });
    }

    addStyles() {
        if (this.styleAdded) return;
        this.styleAdded = true;
        
        const style = document.createElement('style');
        style.textContent = `
            /* Compact Rune Shop Styles */
            .rune-shop-overlay {
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

            .rune-shop-container {
                background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                border: 2px solid #6b46c1;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(107, 70, 193, 0.5);
                width: 320px;
                max-width: 90vw;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .rune-shop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                border-bottom: 1px solid #6b46c1;
            }

            .rune-shop-title {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .rune-shop-close {
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

            .rune-shop-close:hover,
            .rune-shop-close:active {
                background: rgba(255, 0, 0, 0.3);
                transform: scale(1.05);
            }

            .rune-shop-content {
                padding: 16px;
            }

            .rune-shop-purchase-interface {
                display: flex;
                flex-direction: column;
                gap: 16px;
                color: #ffffff;
            }

            .rune-shop-item-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding-bottom: 12px;
                border-bottom: 1px solid #6b46c1;
            }

            .rune-shop-item-icon {
                width: 48px;
                height: 48px;
                object-fit: contain;
                image-rendering: pixelated;
                border-radius: 6px;
                background: rgba(107, 70, 193, 0.2);
                padding: 6px;
                border: 2px solid #6b46c1;
            }

            .rune-shop-item-name {
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                text-align: center;
            }

            .rune-shop-level-requirement {
                font-size: 12px;
                color: #a78bfa;
                text-align: center;
                padding: 4px 8px;
                background: rgba(107, 70, 193, 0.1);
                border-radius: 4px;
            }

            .rune-shop-level-requirement.insufficient {
                color: #f87171;
            }

            .rune-shop-purchase-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: center;
            }

            .rune-shop-quantity-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .rune-shop-qty-btn {
                width: 40px;
                height: 40px;
                border: 1px solid #6b46c1;
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

            .rune-shop-qty-btn:hover,
            .rune-shop-qty-btn:active {
                background: #6b46c1;
                transform: translateY(-1px);
            }

            .rune-shop-qty-display {
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                min-width: 40px;
                text-align: center;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #6b46c1;
                border-radius: 6px;
            }

            .rune-shop-total-display {
                font-size: 16px;
                font-weight: 600;
                color: #facc15;
                text-align: center;
                padding: 8px 16px;
                background: rgba(250, 204, 21, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(250, 204, 21, 0.3);
            }

            .rune-shop-action-btn {
                background: linear-gradient(135deg, #6b46c1, #5b21b6);
                border: 2px solid #7c3aed;
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

            .rune-shop-action-btn:hover:not(:disabled):not(.disabled),
            .rune-shop-action-btn:active:not(:disabled):not(.disabled) {
                background: linear-gradient(135deg, #7c3aed, #6b46c1);
                transform: translateY(-1px);
                box-shadow: 0 6px 12px rgba(107, 70, 193, 0.4);
            }

            .rune-shop-action-btn:disabled,
            .rune-shop-action-btn.disabled {
                background: linear-gradient(135deg, #666666, #555555);
                border-color: #777777;
                cursor: not-allowed;
                opacity: 0.7;
                transform: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .rune-shop-container {
                    width: 280px;
                    max-width: 95vw;
                }
                
                .rune-shop-header {
                    padding: 10px 12px;
                }
                
                .rune-shop-title {
                    font-size: 14px;
                }
                
                .rune-shop-close {
                    width: 20px;
                    height: 20px;
                    font-size: 14px;
                }
                
                .rune-shop-content {
                    padding: 12px;
                }
                
                .rune-shop-qty-btn {
                    width: 48px;
                    height: 48px;
                    font-size: 20px;
                }
                
                .rune-shop-qty-display {
                    font-size: 16px;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                
                .rune-shop-total-display {
                    font-size: 14px;
                }
                
                .rune-shop-action-btn {
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
        const closeBtn = document.getElementById('rune-shop-close');
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
        const overlay = document.getElementById('rune-shop-overlay');
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
        const overlay = document.getElementById('rune-shop-overlay');
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
        globalRuneShopLock = false;
        this.purchaseInProgress = false;
        if (globalRuneShopTimeout) {
            clearTimeout(globalRuneShopTimeout);
            globalRuneShopTimeout = null;
        }
    }

    isOpen() {
        const overlay = document.getElementById('rune-shop-overlay');
        return overlay && overlay.style.display !== 'none';
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'rune-shop-chat-style';
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

    updatePlayerData(data) {
        if (data.level !== undefined) {
            this.playerLevel = data.level;
        }
        
        if (data.coins !== undefined) {
            this.updateCoins(data.coins);
        }
        
        if (this.isOpen()) {
            this.updatePurchaseInterface();
        }
    }

    updatePurchaseInterface() {
        const panel = document.getElementById('rune-shop-details');
        if (!panel) return;
        
        const totalCost = this.runeItem.price * this.selectedQuantity;
        const canAfford = this.playerCoins >= totalCost;
        const hasLevelRequirement = this.playerLevel >= 15;
        const canPurchase = canAfford && hasLevelRequirement;
        
        // Determine button text and state
        let buttonText = 'Buy Rune';
        let buttonClass = 'rune-shop-action-btn';
        
        if (!hasLevelRequirement) {
            buttonText = `Requires Level 15 (You are Level ${this.playerLevel})`;
            buttonClass += ' disabled';
        } else if (!canAfford) {
            buttonText = `Need $${totalCost} (Have $${this.playerCoins})`;
            buttonClass += ' disabled';
        }
        
        panel.innerHTML = `
            <div class="rune-shop-purchase-interface">
                <div class="rune-shop-item-display">
                    <img src="${this.getAssetBaseUrl()}/${this.runeItem.iconImageUri}" alt="${this.runeItem.name}" class="rune-shop-item-icon">
                    <div class="rune-shop-item-name">${this.runeItem.name}</div>
                    <div class="rune-shop-level-requirement ${hasLevelRequirement ? '' : 'insufficient'}">
                        Requires Level 15 ${hasLevelRequirement ? '✓' : `(You are Level ${this.playerLevel})`}
                    </div>
                </div>
                
                <div class="rune-shop-purchase-controls">
                    <div class="rune-shop-quantity-controls">
                        <button class="rune-shop-qty-btn rune-shop-qty-decrease">-</button>
                        <div class="rune-shop-qty-display">${this.selectedQuantity}</div>
                        <button class="rune-shop-qty-btn rune-shop-qty-increase">+</button>
                    </div>
                    
                    <div class="rune-shop-total-display">
                        ${totalCost} coins
                    </div>
                    
                    <button class="${buttonClass}" ${canPurchase ? '' : 'disabled'}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;

        // Add event listeners with mobile touch support
        const decreaseBtn = panel.querySelector('.rune-shop-qty-decrease');
        const increaseBtn = panel.querySelector('.rune-shop-qty-increase');
        const confirmBtn = panel.querySelector('.rune-shop-action-btn');

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

        if (confirmBtn && canPurchase) {
            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.purchaseRune();
            });
            
            if (hytopia.isMobile) {
                confirmBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.purchaseRune();
                });
            }
        }
    }

    changeQuantity(delta) {
        this.selectedQuantity = Math.max(1, Math.min(this.runeItem.maxQuantity, this.selectedQuantity + delta));
        this.updatePurchaseInterface();
    }

    purchaseRune() {
        const selectedQuantity = this.selectedQuantity;
        const totalCost = this.runeItem.price * selectedQuantity;
        const canAfford = this.playerCoins >= totalCost;
        const hasLevelRequirement = this.playerLevel >= 15;
        
        if (!canAfford || !hasLevelRequirement) {
            return;
        }
        
        // Enhanced spam protection
        const currentTime = Date.now();
        
        if (globalRuneShopLock) {
            return;
        }
        
        if (this.purchaseInProgress) {
            return;
        }
        
        if (currentTime - this.lastPurchaseTime < 2000) {
            return;
        }
        
        // Set all locks immediately
        globalRuneShopLock = true;
        this.purchaseInProgress = true;
        this.lastPurchaseTime = currentTime;
        
        // Clear any existing timeout
        if (globalRuneShopTimeout) {
            clearTimeout(globalRuneShopTimeout);
        }
        
        // Close the panel immediately so user can see any error messages or success popups
        this.close();
        
        const purchaseData = {
            type: 'purchaseRune',
            runeQuantity: selectedQuantity,
            totalPrice: totalCost
        };
        
        hytopia.sendData(purchaseData);
        
        // Set timeout to unlock purchasing after 3 seconds
        globalRuneShopTimeout = setTimeout(() => {
            globalRuneShopLock = false;
            this.purchaseInProgress = false;
        }, 3000);
    }

    handlePurchaseResult(data) {
        if (data.success) {
            // Clear locks immediately on success
            globalRuneShopLock = false;
            this.purchaseInProgress = false;
            if (globalRuneShopTimeout) {
                clearTimeout(globalRuneShopTimeout);
                globalRuneShopTimeout = null;
            }
        } else {
            // Reset locks on failure to allow retry
            globalRuneShopLock = false;
            this.purchaseInProgress = false;
            if (globalRuneShopTimeout) {
                clearTimeout(globalRuneShopTimeout);
                globalRuneShopTimeout = null;
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
window.RuneShopPanel = new RuneShopPanel();

