class CastingPanel {
    constructor() {
        this.container = null;
        
        // DOM references
        this.powerContainer = null;
        this.powerBar = null;
        this.powerGlow = null;
        this.castMarker = null;
        
        // State machine
        this.state = 'IDLE';
        this.power = 0;
        
        // Animation config
        this.fillDuration = 1000;    // ms to fill from 0-100%
        this.maxPauseDuration = 250; // ms to pause at max
        this.minPauseDuration = 100; // ms to pause at min
        
        // Animation timing
        this.lastFrameTime = 0;
        this.stateTime = 0;
        this.animationId = null;
        

        
        // Config
        this.useDynamicColors = true;
        
        // Critical timing protection
        this.lastPowerValue = 0;     // Power on previous frame
        this.powerTrend = 0;         // Direction of power change
        this.wasNearMax = false;     // Flag for near-max power detection
        this.nearMaxThreshold = 90;  // Consider "near max" at 90%
        this.recentlyAtMax = false;  // Flag for recently at max
        this.maxPowerTimeout = null; // Timeout for max power protection
        this.sampleHistory = [];     // Power history for smoothing
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'casting-ui';
        panel.innerHTML = `
            <div id="casting-power-container">
                <div id="casting-power-bar"></div>
                <div id="casting-power-glow"></div>
            </div>

            <div id="cast-marker"></div>
            
            <!-- Mobile cast button (only visible on mobile) -->
            <div id="mobile-cast-button" class="mobile-fishing-button">
                <span class="mobile-button-icon">🎣</span>
            </div>
        `;
        
        // Note: Main positioning styles are in styles.css
        // Only add styles that don't conflict with global CSS
        const style = document.createElement('style');
        style.textContent = `
            #casting-power-bar {
                position: absolute;
                bottom: 0;
                width: 100%;
                transition: background-color 0.2s;
            }
            
            #casting-power-glow {
                position: absolute;
                bottom: 0;
                width: 100%;
                height: 0;
                background: radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%);
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            #cast-marker {
                transition: opacity 0.2s ease-in-out;
            }
        `;
        document.head.appendChild(style);
        
        this.container.appendChild(panel);

        // Cache DOM elements
        this.powerContainer = document.getElementById('casting-power-container');
        this.powerBar = document.getElementById('casting-power-bar');
        this.powerGlow = document.getElementById('casting-power-glow');
        this.castMarker = document.getElementById('cast-marker');
        
        // Initial state
        this.powerContainer.style.display = 'none';
        
        // Add mobile-specific styles
        this.addMobileStyles();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up mobile controls
        this.setupMobileControls();
    }
    
    setupEventListeners() {
        hytopia.onData((data) => {
            if (data.type === 'castingPowerUpdate') {
                if (data.power === null) {
                    // Just hide the UI without sending castConfirm
                    this.state = 'IDLE';
                    this.powerContainer.style.display = 'none';
                    
                    // Clean up
                    if (this.maxPowerTimeout) {
                        clearTimeout(this.maxPowerTimeout);
                        this.maxPowerTimeout = null;
                    }
                } else {
                    this.startCasting();
                }
            }
            else if (data.type === 'showCastMarker') {
                this.updateCastMarker(data.position);
                // Note: fishing-active class is managed by JigPanel to avoid conflicts
            }
            else if (data.type === 'startFishing') {
                // Note: fishing-active class is managed by JigPanel to avoid conflicts
            }
            else if (data.type === 'fishingComplete') {
                // Note: fishing-active class is managed by JigPanel to avoid conflicts
            }
            else if (data.type === 'fishingSuccessCooldown') {
                // Disable cast button for 2.5 seconds after successful catch
                this.disableCastButtonTemporarily(2500);
            }
        });
    }
    
    disableCastButtonTemporarily(durationMs) {
        if (!hytopia.isMobile) return;
        
        const castButton = document.getElementById('mobile-cast-button');
        if (!castButton) return;
        
        // Disable the button
        castButton.style.pointerEvents = 'none';
        castButton.style.opacity = '0.5';
        castButton.classList.add('disabled');
        
        // Re-enable after duration
        setTimeout(() => {
            castButton.style.pointerEvents = 'auto';
            castButton.style.opacity = '1';
            castButton.classList.remove('disabled');
        }, durationMs);
    }

    startCasting() {
        if (this.state !== 'IDLE') return;
        
        this.state = 'FILLING';
        this.power = 0;
        this.stateTime = 0;
        
        // Show power container
        this.powerContainer.style.display = 'block';
        this.updatePowerBar(0);
        
        // Start animation loop if not running
        if (!this.animationId) {
            this.lastFrameTime = performance.now();
            this.animationLoop(this.lastFrameTime);
        }
    }
    
    stopCasting() {
        const finalPower = this.getCastPower();
        
        // Send the protected power value to the server
        hytopia.sendData({
            type: 'castConfirm',
            power: finalPower
        });
        
        this.state = 'IDLE';
        this.powerContainer.style.display = 'none';
        
        // Clean up
        if (this.maxPowerTimeout) {
            clearTimeout(this.maxPowerTimeout);
            this.maxPowerTimeout = null;
        }
        
        return finalPower;
    }
    
    animationLoop(timestamp) {
        // Calculate delta time in seconds
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update based on current state
        if (this.state !== 'IDLE') {
            this.update(deltaTime);
        }
        // Continue animation loop
        this.animationId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    update(deltaTime) {
        // Update state timer
        this.stateTime += deltaTime;
        
        // Store last power value for trend detection
        this.lastPowerValue = this.power;
        
        // Handle different states
        switch (this.state) {
            case 'FILLING':
                // Calculate power increase based on deltaTime and fillDuration
                const powerDelta = (deltaTime / this.fillDuration) * 100;
                const oldPower = this.power;
                this.power += powerDelta;
                
                // Cap power at 100% immediately to prevent going over
                if (this.power > 100) {
                    this.power = 100;
                }
                
                // Track power trend (1 = increasing, -1 = decreasing)
                this.powerTrend = 1;
                
                // Store power in sample history (for lag protection) - ensure it's capped
                this.sampleHistory.push(Math.min(100, this.power));
                // Keep last 10 samples only
                if (this.sampleHistory.length > 10) {
                    this.sampleHistory.shift();
                }
                
                // Check if we're approaching max
                if (this.power >= this.nearMaxThreshold && !this.wasNearMax) {
                    this.wasNearMax = true;
                    // Set a timeout for max power protection
                    if (this.maxPowerTimeout) {
                        clearTimeout(this.maxPowerTimeout);
                    }
                    this.maxPowerTimeout = setTimeout(() => {
                        this.recentlyAtMax = false;
                        this.wasNearMax = false;
                    }, 500); // Protection window
                }
                
                // Check if we've reached max
                if (this.power >= 100) {
                    this.power = 100;
                    this.state = 'MAX_PAUSE';
                    this.stateTime = 0;
                    this.showMaxEffect();
                    this.recentlyAtMax = true;
                }
                break;
                
            case 'MAX_PAUSE':
                if (this.stateTime >= this.maxPauseDuration) {
                    this.state = 'RESETTING';
                    this.stateTime = 0;
                    this.wasNearMax = false;
                }
                break;
                
            case 'RESETTING':
                // Quick reset to 0
                this.power = 0;
                this.state = 'MIN_PAUSE';
                this.stateTime = 0;
                this.powerTrend = -1;
                this.sampleHistory = []; // Clear history
                break;
                
            case 'MIN_PAUSE':
                if (this.stateTime >= this.minPauseDuration) {
                    this.state = 'FILLING';
                    this.stateTime = 0;
                }
                break;
        }
        
        // Update visuals
        this.updatePowerBar(this.power);
        hytopia.sendData({
            type: 'castUpdate',
            power: this.power
        });
    }
    
    updatePowerBar(power) {
        if (!this.powerBar) return;
        
        // Update height
        this.powerBar.style.height = `${power}%`;
        
        // Update color based on power level
        if (this.useDynamicColors) {
            if (power < 33) {
                this.powerBar.style.backgroundColor = '#3498db'; // Blue
            } else if (power < 66) {
                this.powerBar.style.backgroundColor = '#f1c40f'; // Yellow
        } else {
                this.powerBar.style.backgroundColor = '#e74c3c'; // Red
            }
        }
    }
    
    showMaxEffect() {
        if (!this.powerGlow) return;
        
        // Show glow effect at max power
        this.powerGlow.style.height = '100%';
        this.powerGlow.style.opacity = '1';
        
        // Reset after animation
        setTimeout(() => {
            if (this.powerGlow) {
                this.powerGlow.style.opacity = '0';
            }
        }, 200);
    }

    updateCastMarker(position) {
        if (!this.castMarker) return;
        
        const screenPos = hytopia.worldToScreen(position);

        if (screenPos) {
            // Position the marker
            this.castMarker.style.display = 'block';
            this.castMarker.style.left = `${screenPos.x - 20}px`;
            this.castMarker.style.top = `${screenPos.y - 20}px`;
            this.castMarker.style.opacity = '0';
            
            // Force reflow
            void this.castMarker.offsetWidth;
            
            // Fade in with animation
            this.castMarker.style.opacity = '1';
            this.castMarker.style.animation = 'pulse 1s infinite';
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                if (this.castMarker) {
                    this.castMarker.style.opacity = '0';
                    setTimeout(() => {
                        if (this.castMarker) {
                            this.castMarker.style.display = 'none';
                            this.castMarker.style.animation = '';
                        }
                    }, 300);
                }
            }, 3000);
        } else {
            this.castMarker.style.display = 'none';
        }
    }
    
    // Called when server gets click event
    getCastPower() {
        // Return the current displayed power value with lag protection
        
        // If we're exactly at 100%, return 100
        if (this.power === 100) {
            return 100;
        }
        
        // If we were recently at max, or near max and trending upward, grant max power
        if (this.recentlyAtMax || (this.wasNearMax && this.powerTrend > 0 && this.power > 95)) {
            return 100;
        }
        
        // If we're just past the loop point (low power but recently at high power)
        if (this.power < 10 && this.wasNearMax) {
            return 100; // Assume they meant to click at max
        }
        
        // If we have samples, use the highest recent value to account for network delay
        if (this.sampleHistory.length > 0) {
            const recentMax = Math.max(...this.sampleHistory);
            // If recent max is significantly higher, use it (but cap at 100)
            if (recentMax > this.power + 10 && recentMax > 50) {
                return Math.min(100, recentMax); // Cap at 100%
            }
        }
        
        // Otherwise return the current power (capped at 100)
        return Math.min(100, this.power);
    }
    
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Mobile fishing button styling - Shiny Stardew Valley inspired */
            .mobile-fishing-button {
                align-items: center;
                justify-content: center;
                position: fixed;
                width: 70px;
                height: 70px;
                border-radius: 50%;
                opacity: 0.75; /* Make more translucent */
                /* Stardew Valley inspired gradient - warm orange/amber tones */
                background: linear-gradient(135deg, 
                    #ff8c42 0%, 
                    #ff6b35 25%,
                    #ff8c42 50%,
                    #ffa366 75%,
                    #ff8c42 100%);
                color: white;
                font-size: 28px;
                /* Reduced shadow intensity for less prominence */
                box-shadow: 
                    0 2px 8px rgba(255, 140, 66, 0.2),
                    0 1px 4px rgba(0, 0, 0, 0.15),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                flex-direction: column;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid rgba(255, 255, 255, 0.2); /* Thinner, more subtle border */
                /* Glossy highlight effect */
                position: relative;
                overflow: hidden;
            }
            
            /* Shiny highlight overlay for glossy effect - reduced intensity */
            .mobile-fishing-button::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(
                    circle at 30% 30%,
                    rgba(255, 255, 255, 0.2) 0%,
                    rgba(255, 255, 255, 0.05) 30%,
                    transparent 60%
                );
                pointer-events: none;
                animation: shimmer 3s ease-in-out infinite;
            }
            
            @keyframes shimmer {
                0%, 100% { opacity: 0.3; transform: translate(-50%, -50%); }
                50% { opacity: 0.4; transform: translate(-50%, -50%); }
            }
            
            /* Icon styling for better visibility */
            .mobile-fishing-button .mobile-button-icon {
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* Make cast button hidden by default */
            #mobile-cast-button {
                display: none;
            }
            
            /* Show on mobile devices */
            body.mobile #mobile-cast-button {
                display: flex;
                position: fixed !important;
                bottom: 120px !important;
                right: 30px !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
            }
            
            /* Hide when inventory is open */
            body.mobile.inventory-open #mobile-cast-button {
                display: none;
            }
            
            /* Hide when tacklebox is open */
            body.mobile:has(#tacklebox-ui[style*="flex"]) #mobile-cast-button {
                display: none !important;
            }
            
            /* Hide cast button during active fishing - must use !important to override show rule */
            body.mobile.fishing-active #mobile-cast-button,
            body.mobile.reeling-active #mobile-cast-button {
                display: none !important;
            }
            
            /* Active state - pressed down with reduced shine */
            .mobile-fishing-button.active {
                transform: scale(0.95);
                opacity: 0.85; /* Slightly more visible when active */
                /* Darker, richer gradient when active */
                background: linear-gradient(135deg, 
                    #ff6b35 0%, 
                    #ff5722 25%,
                    #ff6b35 50%,
                    #ff8c42 75%,
                    #ff6b35 100%);
                box-shadow: 
                    0 1px 4px rgba(255, 107, 53, 0.25),
                    0 1px 2px rgba(0, 0, 0, 0.2),
                    inset 0 2px 4px rgba(255, 255, 255, 0.25),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            /* Reduced highlight when active */
            .mobile-fishing-button.active::before {
                opacity: 0.5;
                background: radial-gradient(
                    circle at 30% 30%,
                    rgba(255, 255, 255, 0.3) 0%,
                    rgba(255, 255, 255, 0.1) 30%,
                    transparent 60%
                );
            }
            
            /* Adjust meter sizing for mobile - 20% smaller than desktop and positioned */
            body.mobile #casting-power-container {
                height: 180px; /* 20% smaller than desktop's 200px */
                left: 30%;
                top: 45%;
            }
            
            /* Fix power bar scaling on mobile - remove scaleY transform that causes overflow */
            body.mobile #casting-power-bar {
                transform: none !important; /* Remove scaleY(1.1) on mobile to prevent going over 100% */
            }
        `;
        document.head.appendChild(style);
    }
    
    setupMobileControls() {
        // Only set up if on mobile
        if (!hytopia.isMobile) return;
        
        const castButton = document.getElementById('mobile-cast-button');
        if (!castButton) return;
        
        // Cast button (Right Mouse Button - mr)
        castButton.addEventListener('touchstart', e => {
            // Don't allow casting if button is disabled (cooldown active)
            if (castButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            castButton.classList.add('active');
            hytopia.pressInput('mr', true);
        });
        
        castButton.addEventListener('touchend', e => {
            // Don't process if button is disabled
            if (castButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            castButton.classList.remove('active');
            hytopia.pressInput('mr', false);
        });
    }
    
    // Clean up resources
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Make it globally available
window.CastingPanel = new CastingPanel();

