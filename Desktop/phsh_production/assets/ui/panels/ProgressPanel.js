class ProgressPanel {
    constructor() {
        this.container = null;
        this.levelNumber = null;
        this.xpFill = null;
        this.coinAmount = null;
        this.currentXP = 0;
        this.requiredXP = 100;
        this.initialized = false;
        
        // Hotkeys UI removed - deprecated
    }

    // createHotkeysUI() method removed - hotkeys panel deprecated

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.className = 'progress-panel';
        panel.innerHTML = `
            <div id="currency-display" class="currency-display">
                <span id="coin-amount">0</span>
                <span class="coin-icon">🪙</span>
            </div>

            <div id="time-display" class="time-display" style="display: none;">
                <span id="time-icon" class="time-icon">☀️</span>
                <span id="time-text" class="time-text">12:00</span>
            </div>

            <div id="level-panel">
                <div id="level-number">Level 1</div>
                <div id="xp-bar">
                    <div id="xp-fill"></div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);
        
        // Store references to elements we'll need to update
        this.levelNumber = document.getElementById('level-number');
        this.xpFill = document.getElementById('xp-fill');
        this.coinAmount = document.getElementById('coin-amount');
        this.timeIcon = document.getElementById('time-icon');
        this.timeText = document.getElementById('time-text');
        this.levelPanel = document.getElementById('level-panel');

        // Make level panel clickable on mobile to open quest panel
        this.setupMobileQuestButton();

        // Set up message handling
        if (window.hytopia) {

            window.hytopia.onData(data => {
                
                if (data.type === 'levelUpdate') {
                    this.updateLevelDisplay(data);
                }
                else if (data.type === 'currencyUpdate') {
                    this.updateCurrencyDisplay(data);
                }
                else if (data.type === 'timeUpdate') {
                    this.updateTimeDisplay(data);
                }
            });
            
            // Signal that this component is ready

            window.hytopia.sendData({ type: 'uiReady' });
        } else {
            console.error('hytopia not available for message handling');
        }
        
        // Add mobile-specific styles
        this.addMobileStyles();
        
        this.initialized = true;
    }

    updateLevelDisplay(data) {
        
        // Update level number
        this.levelNumber.textContent = `Level ${data.level}`;
        
        // Store current XP values
        this.currentXP = data.xp || 0;
        this.requiredXP = data.nextLevelXP || 100;
        
        // Calculate XP progress percentage
        const progress = (this.currentXP / this.requiredXP) * 100;
        this.xpFill.style.width = `${progress}%`;
    }
    
    updateCurrencyDisplay(data) {
        
        // Handle both formats of currency data
        if (data.currency && data.currency.coins !== undefined) {
            this.coinAmount.textContent = data.currency.coins.toLocaleString();
        } else if (data.coins !== undefined) {
            this.coinAmount.textContent = data.coins.toLocaleString();
        }
    }

    updateTimeDisplay(data) {
        
        // Show the time display if it's currently hidden (first time receiving data)
        if (this.timeIcon && this.timeIcon.parentElement.style.display === 'none') {
            this.timeIcon.parentElement.style.display = 'flex';
        }
        
        // Update time text
        if (data.formattedTime) {
            this.timeText.textContent = data.formattedTime;
        }
        
        // Update time icon based on hour or isDayTime flag
        let icon = '☀️'; // Default to sun
        
        if (data.isDayTime !== undefined) {
            // Use server-provided day/night status
            icon = data.isDayTime ? '☀️' : '🌙';
        } else if (data.hour !== undefined) {
            // Calculate icon based on hour
            const hour = data.hour;
            if (hour >= 5 && hour < 12) {
                icon = '🌅'; // Morning
            } else if (hour >= 12 && hour < 18) {
                icon = '☀️'; // Day
            } else if (hour >= 18 && hour < 21) {
                icon = '🌅'; // Evening
            } else {
                icon = '🌙'; // Night
            }
        }
        
        this.timeIcon.textContent = icon;
        
        // Optional: Add CSS class for styling based on time of day
        if (data.isDayTime !== undefined) {
            if (data.isDayTime) {
                this.timeIcon.className = 'time-icon day-time';
                this.timeText.className = 'time-text day-time';
            } else {
                this.timeIcon.className = 'time-icon night-time';
                this.timeText.className = 'time-text night-time';
            }
        }
    }

    // Add this new method to ProgressPanel class
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Time display styling */
            .time-display {
                position: fixed;
                bottom: 120px;  /* Position above currency with proper spacing */
                right: 20px;
                background-color: rgba(0, 0, 0, 0.6);
                padding: 8px 12px;
                border-radius: 8px;
                border: 2px solid #555;
                color: white;
                font-family: 'Minecraft', monospace;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 1000;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                margin: 0;
            }
            
            .time-icon {
                font-size: 16px;
                filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
            }
            
            .time-text {
                font-weight: bold;
                color: #ffffff;
            }
            
            /* Day/night time styling */
            .day-time {
                color: #ffd700 !important;
                text-shadow: 0 0 3px rgba(255, 215, 0, 0.5);
            }
            
            .night-time {
                color: #87ceeb !important;
                text-shadow: 0 0 3px rgba(135, 206, 235, 0.5);
            }

            /* Move level panel and currency display to bottom left on mobile */
            @media (max-width: 768px), (pointer: coarse) {
                body.mobile .time-display {
                    bottom: calc(120px + 0.66vh);  /* Position from bottom, above currency with 2.5% more buffer */
                    right: auto;         /* Remove right positioning */
                    left: 20px;          /* Add left positioning */
                    font-size: 12px;     /* Slightly smaller on mobile */
                    padding: 6px 10px;   /* Smaller padding */
                    margin: 0;           /* Ensure no extra margin */
                }
                
                body.mobile #level-panel {
                    top: auto;           /* Remove top positioning */
                    bottom: 25px;        /* Position from bottom - lower than before */
                    right: auto;         /* Remove right positioning */
                    left: 20px;          /* Add left positioning */
                    margin: 0;          /* Ensure no extra margin */
                }
                
                body.mobile .currency-display {
                    top: auto;           /* Remove top positioning */
                    bottom: 80px;        /* Position from bottom, above level panel with proper spacing */
                    right: auto;         /* Remove right positioning */
                    left: 20px;          /* Add left positioning */
                    margin: 0;          /* Ensure no extra margin */
                }
                
                /* Hotkeys panel removed - deprecated */
            }
        `;
        document.head.appendChild(style);
    }
    
    setupMobileQuestButton() {
        if (!this.levelPanel) return;
        
        // Only make it clickable on mobile
        const isMobile = hytopia.isMobile || document.body.classList.contains('mobile') || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Add mobile-specific styling to make it look clickable
            const mobileQuestStyle = document.createElement('style');
            mobileQuestStyle.textContent = `
                body.mobile #level-panel {
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                }
                
                body.mobile #level-panel:active {
                    background-color: rgba(0, 0, 0, 0.7);
                    transform: scale(0.98);
                }
            `;
            document.head.appendChild(mobileQuestStyle);
            
            // Track if we've handled the touch to prevent click event
            let touchHandled = false;
            let lastToggleTime = 0;
            const TOGGLE_COOLDOWN = 300; // 300ms cooldown between toggles
            
            // Add touch handlers
            this.levelPanel.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                touchHandled = false;
                this.levelPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            });
            
            this.levelPanel.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.levelPanel.style.backgroundColor = '';
                
                // Prevent click event from firing
                touchHandled = true;
                
                // Debounce toggles
                const now = Date.now();
                if (now - lastToggleTime < TOGGLE_COOLDOWN) {
                    return;
                }
                lastToggleTime = now;
                
                // Open quest panel
                if (window.PlayerProgressPanel) {
                    window.PlayerProgressPanel.toggle();
                } else {
                    console.warn("PlayerProgressPanel not found");
                }
                
                // Reset touchHandled after a delay to allow future clicks
                setTimeout(() => {
                    touchHandled = false;
                }, 300);
            });
            
            // Click handler as fallback (only if touch wasn't handled)
            this.levelPanel.addEventListener('click', (e) => {
                if (touchHandled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                // Debounce toggles
                const now = Date.now();
                if (now - lastToggleTime < TOGGLE_COOLDOWN) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                lastToggleTime = now;
                
                if (window.PlayerProgressPanel) {
                    window.PlayerProgressPanel.toggle();
                }
            });
            
        }
    }
}

// Make it globally available
window.ProgressPanel = new ProgressPanel();
