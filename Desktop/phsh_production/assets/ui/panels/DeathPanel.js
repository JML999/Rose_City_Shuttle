class DeathPanel {
    constructor() {
        this.overlay = null;
        this.container = null;
        this.coinLossElement = null;
        this.respawnBtn = null;
        this.respawnFade = null;
        this.isRespawning = false;
        this.isDead = false; // Track death state
    }

    initialize() {
        // Create death overlay (black background like inventory/leaderboard)
        this.overlay = document.createElement('div');
        this.overlay.id = 'hud-death-overlay';
        this.overlay.className = 'hud-death-overlay';
        
        // Create interior container (like leaderboard panel)
        this.container = document.createElement('div');
        this.container.className = 'hud-death-container';
        
        // Create death content
        const content = document.createElement('div');
        content.className = 'hud-death-content';
        
        // Title
        const title = document.createElement('div');
        title.className = 'hud-death-title';
        title.textContent = "No Feed'n the PHSH!";
        
        // Divider line (like leaderboard panel)
        const divider = document.createElement('div');
        divider.className = 'hud-death-divider';
        
        // Coin loss display
        const coinLoss = document.createElement('div');
        coinLoss.className = 'hud-death-coin-loss';
        coinLoss.id = 'hud-death-coin-loss';
        coinLoss.innerHTML = 'A third of your coin was claimed by the depths!';
        this.coinLossElement = coinLoss;
        
        // Coin amount display
        const coinAmount = document.createElement('div');
        coinAmount.className = 'hud-death-coin-amount';
        coinAmount.id = 'hud-death-coin-amount';
        coinAmount.innerHTML = '<span id="coin-loss-amount">0</span> coins lost';
        
        // Respawn button
        const respawnBtn = document.createElement('button');
        respawnBtn.className = 'hud-death-respawn-btn';
        respawnBtn.id = 'hud-death-respawn-btn';
        respawnBtn.textContent = 'Respawn';
        this.respawnBtn = respawnBtn;
        
        // Assemble content
        content.appendChild(title);
        content.appendChild(divider);
        content.appendChild(coinLoss);
        content.appendChild(coinAmount);
        content.appendChild(respawnBtn);
        this.container.appendChild(content);
        this.overlay.appendChild(this.container);
        
        // Create respawn fade overlay
        this.respawnFade = document.createElement('div');
        this.respawnFade.id = 'hud-respawn-fade';
        this.respawnFade.className = 'hud-respawn-fade';
        
        // Add to body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.respawnFade);
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Add styles
        this.addStyles();
        
        // Set up message handling
        hytopia.onData(data => {
            if (data.type === 'playerDeath') {
                // Only show if not already respawning
                if (!this.isRespawning) {
                    this.showDeathOverlay(data.coinLoss || 0, data.coinsRemaining || 0);
                }
            } else if (data.type === 'playerRespawned') {
                // Server confirmed respawn - ensure overlay is hidden
                this.hideDeathOverlay();
            }
        });
    }

    setupEventHandlers() {
        this.respawnBtn.addEventListener('pointerdown', () => this.handleRespawn());
    }

    async handleRespawn() {
        if (this.isRespawning) return;
        
        this.isRespawning = true;
        this.respawnBtn.disabled = true;
        this.respawnBtn.style.opacity = '0.6';
        
        try {
            // Fade to black
            await this.fadeElement(this.respawnFade, 1);
            
            // Hide death overlay immediately (before server response)
            this.hideDeathOverlay();
            
            // Send respawn request to server
            hytopia.sendData({ type: 'respawnPlayer' });
            
            // Wait a bit for respawn to complete
            await this.delay(250);
            
            // Fade back in
            await this.fadeElement(this.respawnFade, 0);
        } finally {
            this.respawnBtn.disabled = false;
            this.respawnBtn.style.opacity = '';
            this.isRespawning = false;
        }
    }

    showDeathOverlay(coinLoss, coinsRemaining) {
        // Only show if not already respawning
        if (this.isRespawning) return;
        
        this.isDead = true;
        
        // Disable player input to lock pointer (like inventory/leaderboard panels)
        hytopia.sendData({ type: 'disablePlayerInput' });
        
        // Update coin loss display
        const coinLossAmount = document.getElementById('coin-loss-amount');
        if (coinLossAmount) {
            coinLossAmount.textContent = coinLoss.toLocaleString();
        }
        
        // Show overlay with animation
        this.overlay.classList.add('show');
    }

    hideDeathOverlay() {
        this.isDead = false;
        this.overlay.classList.remove('show');
        // Re-enable player input when hiding the overlay
        hytopia.sendData({ type: 'enablePlayerInput' });
    }

    fadeElement(element, opacity) {
        return new Promise((resolve) => {
            const duration = 300;
            const start = parseFloat(element.style.opacity) || 0;
            const difference = opacity - start;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = start + (difference * progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .hud-death-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
            }

            .hud-death-overlay.show {
                display: flex;
            }

            .hud-death-container {
                width: 65vw;
                max-width: 600px;
                background-color: rgba(22, 28, 36, 0.95);
                border: 2px solid #3a4a5c;
                border-radius: 8px;
                box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
                color: #e0e0e0;
                padding: 40px;
                position: relative;
                display: flex;
                flex-direction: column;
            }

            .hud-death-content {
                text-align: center;
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 25px;
            }

            .hud-death-title {
                font-size: 36px;
                font-weight: 600;
                margin-bottom: 20px;
                color: #4a90e2;
                text-align: center;
                font-family: Arial, sans-serif;
            }

            .hud-death-divider {
                width: 100%;
                height: 2px;
                background: linear-gradient(to right, transparent, #3a4a5c, transparent);
                margin-bottom: 25px;
            }

            .hud-death-coin-loss {
                font-size: 16px;
                color: #b0b0b0;
                margin-bottom: 5px;
                font-weight: 500;
                font-style: italic;
                text-align: center;
            }

            .hud-death-coin-amount {
                font-size: 28px;
                color: #ffaa00;
                margin-bottom: 10px;
                font-weight: 600;
                text-align: center;
            }

            .hud-death-coin-amount span {
                color: #ff4444;
            }

            .hud-death-respawn-btn {
                background-color: rgba(74, 144, 226, 0.2);
                color: #4a90e2;
                border: 1px solid #4a90e2;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 500;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                margin-top: 10px;
                min-width: 150px;
                font-family: Arial, sans-serif;
            }

            .hud-death-respawn-btn:hover {
                background-color: rgba(74, 144, 226, 0.3);
                color: #5aa0f2;
                border-color: #5aa0f2;
            }

            .hud-death-respawn-btn:active {
                transform: scale(0.98);
            }

            .hud-death-respawn-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .hud-respawn-fade {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: black;
                z-index: 10001;
                opacity: 0;
                pointer-events: none;
            }

            /* Mobile styles */
            body.mobile .hud-death-container {
                width: 85vw;
                padding: 30px 20px;
            }

            body.mobile .hud-death-title {
                font-size: 28px;
            }

            body.mobile .hud-death-coin-loss {
                font-size: 14px;
            }

            body.mobile .hud-death-coin-amount {
                font-size: 22px;
            }

            body.mobile .hud-death-respawn-btn {
                padding: 12px 20px;
                font-size: 14px;
                min-width: 120px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Make it globally available
window.DeathPanel = new DeathPanel();

