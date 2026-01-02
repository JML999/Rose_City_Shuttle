class JigPanel {
    constructor() {
        this.container = null;
        this.isActive = false;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'jig-ui';
        panel.innerHTML = `
            <div id="jigging-meter">
                <div class="meter-background"></div>
                <div id="jig-indicator"></div>
            </div>
            
            <!-- Mobile jig button (only visible on mobile) -->
            <div id="mobile-jig-button" class="mobile-fishing-button">
                <span class="mobile-button-icon">🎣</span>
            </div>
        `;

         // Note: Main positioning styles are in styles.css
         // Only add styles that don't conflict with global CSS
        const style = document.createElement('style');
        style.textContent = `
            /* Additional jigging meter styles (positioning is in styles.css) */
            
            .meter-background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    to bottom,
                    #ff4444 0%,      /* Red danger zone - top */
                    #ff6666 20%,     /* Light red */
                    #ffaa44 35%,     /* Orange transition */
                    #44ff44 45%,     /* Green safe zone start */
                    #22ff22 50%,     /* Bright green center */
                    #44ff44 55%,     /* Green safe zone end */
                    #ffaa44 65%,     /* Orange transition */
                    #ff6666 80%,     /* Light red */
                    #ff4444 100%     /* Red danger zone - bottom */
                );
            }
            
            #jig-indicator {
                position: absolute;
                width: 16px;
                height: 16px;
                background: radial-gradient(circle, #fff 0%, #ddd 70%, #999 100%);
                border: 2px solid #333;
                border-radius: 50%;
                left: 50%;
                transform: translateX(-50%);
                transition: top 0.1s ease-out;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
                z-index: 10;
            }
            
            /* Add a subtle pulse animation when in the target zone */
            #jig-indicator.in-target {
                box-shadow: 
                    0 2px 6px rgba(0, 0, 0, 0.4),
                    0 0 15px rgba(34, 255, 34, 0.6);
                animation: targetPulse 1s infinite alternate;
            }
            
            @keyframes targetPulse {
                from { transform: translateX(-50%) scale(1); }
                to { transform: translateX(-50%) scale(1.1); }
            }
            
            /* Swift Current enchantment - yellow/orange glow */
            #jigging-meter.enchantment-swift-current {
                box-shadow: 0 0 15px rgba(255, 200, 0, 0.6);
                border-color: #ffaa00;
            }
            
            #jigging-meter.enchantment-swift-current .meter-background {
                background: linear-gradient(
                    to bottom,
                    #ff4444 0%,
                    #ff6666 20%,
                    #ffaa44 35%,
                    #ffff44 45%,     /* Brighter yellow for Swift Current */
                    #ffff66 50%,     /* Bright yellow center */
                    #ffff44 55%,
                    #ffaa44 65%,
                    #ff6666 80%,
                    #ff4444 100%
                );
            }
        `;
        document.head.appendChild(style);
        
        this.container.appendChild(panel);
        this.meter = document.getElementById('jigging-meter');
        this.meter.style.display = 'none';
        
        // Add mobile styles
        this.addMobileStyles();
        
        this.setupEventListeners();
        
        // Set up mobile controls
        this.setupMobileControls();
    }

    setupEventListeners() {
        // Track if reeling is starting to avoid showing cast button briefly
        let reelingStartingTimeout = null;
        let hideReelingReceived = false; // Track if hideReeling was received
        let fishingCompleteReceived = false; // Track if fishingComplete was received
        let lastMessageTime = 0; // Track timing to detect abort/fallback vs transition
        
        hytopia.onData((data) => {
            if (data.type === 'startFishing') {
                this.isActive = true;
                this.meter.style.display = 'block';
                hideReelingReceived = false; // Reset flags when fishing starts
                fishingCompleteReceived = false;
                lastMessageTime = Date.now();
                
                // Add fishing-active class to hide cast button (same as ReelPanel does for reeling-active)
                document.body.classList.add('fishing-active');
         
                this.updateJigging(data);
                
                // Apply Swift Current visual feedback if active
                if (data.hasSwiftCurrent) {
                    this.meter.classList.add('enchantment-swift-current');
                } else {
                    this.meter.classList.remove('enchantment-swift-current');
                }
            } else if (data.type === 'fishingComplete') {
                this.isActive = false;
                this.meter.style.display = 'none';
                this.meter.classList.remove('enchantment-swift-current');
                fishingCompleteReceived = true;
                lastMessageTime = Date.now();
                
                // Delay removing fishing-active class to allow reeling to start first
                // This prevents the cast button from briefly appearing between jig and reel
                // Clear any existing timeout
                if (reelingStartingTimeout) {
                    clearTimeout(reelingStartingTimeout);
                }
                
                // Wait a bit to see if startReeling comes (usually within 1-2 seconds)
                reelingStartingTimeout = setTimeout(() => {
                    // Only remove if reeling hasn't started
                    if (!document.body.classList.contains('reeling-active')) {
                        document.body.classList.remove('fishing-active');
                    }
                    reelingStartingTimeout = null;
                    hideReelingReceived = false;
                    fishingCompleteReceived = false;
                }, 1500); // Wait 1.5 seconds for reeling to start
            } else if (data.type === 'hideReeling') {
                hideReelingReceived = true;
                const now = Date.now();
                const timeSinceLastMessage = now - lastMessageTime;
                lastMessageTime = now;
                
                // If hideReeling comes shortly after fishingComplete (within 100ms),
                // it's likely from clearAllFishingUI during transition - don't remove immediately
                // If it comes later (>500ms), it's likely a true abort/fallback scenario
                if (fishingCompleteReceived && !this.isActive && !document.body.classList.contains('reeling-active')) {
                    if (timeSinceLastMessage > 500) {
                        // Clear any pending timeout
                        if (reelingStartingTimeout) {
                            clearTimeout(reelingStartingTimeout);
                            reelingStartingTimeout = null;
                        }
                        // Both messages received with delay = fishing truly ending (abort/fallback)
                        document.body.classList.remove('fishing-active');
                        hideReelingReceived = false;
                        fishingCompleteReceived = false;
                    }
                    // If timeSinceLastMessage <= 500ms, it's likely a transition - let timeout handle it
                }
            } else if (data.type === 'startReeling') {
                // Reeling is starting - cancel the timeout and let ReelPanel manage the class
                if (reelingStartingTimeout) {
                    clearTimeout(reelingStartingTimeout);
                    reelingStartingTimeout = null;
                }
                hideReelingReceived = false; // Reset flags - we're transitioning to reeling
                fishingCompleteReceived = false;
                // Remove fishing-active since reeling-active will take over
                document.body.classList.remove('fishing-active');
            } else if (data.type === 'updateJigging') {
                // Handle jigging updates
                this.updateJigging(data);
            } else if (data.type === 'fallbackLootDetected') {
                // Grey out jig button immediately when fallback loot is detected (before it's displayed)
                if (this.isActive) {
                    this.disableJigButtonTemporarily(2500);
                }
            } else if (data.type === 'fishingSuccessCooldown') {
                // Also handle cooldown message (backup, in case fallbackLootDetected isn't sent)
                if (this.isActive) {
                    this.disableJigButtonTemporarily(2500);
                }
            }
        });
    }
    
    disableJigButtonTemporarily(durationMs) {
        if (!hytopia.isMobile) return;
        
        const jigButton = document.getElementById('mobile-jig-button');
        if (!jigButton) return;
        
        // Disable the button
        jigButton.style.pointerEvents = 'none';
        jigButton.style.opacity = '0.5';
        jigButton.classList.add('disabled');
        
        // Re-enable after duration
        setTimeout(() => {
            jigButton.style.pointerEvents = 'auto';
            jigButton.style.opacity = '1';
            jigButton.classList.remove('disabled');
        }, durationMs);
    }

    updateJigging(data) {
        if (!this.isActive) return;
        
        // Note: fishing-active class is managed in setupEventListeners() 
        // when startFishing/fishingComplete messages are received
        // Don't add it here to avoid timing issues
        
        const indicator = document.getElementById('jig-indicator');
        if (data.fishDepth !== undefined) {
            // Calculate position based on fishDepth (0-2.5 range)
            const depthPercentage = (data.fishDepth / 2.5) * 100;
            
            // Ensure the indicator stays within bounds (2% margin from edges)
            const adjustedPercentage = Math.min(Math.max(depthPercentage, 2), 98);
            indicator.style.top = `${adjustedPercentage}%`;
            
            // Check if bobber is in the target zone (40-60% of the meter)
            // This corresponds to the green zone in our gradient
            const isInTarget = adjustedPercentage >= 40 && adjustedPercentage <= 60;
            
            // Add visual feedback for being in target zone
            if (isInTarget) {
                indicator.classList.add('in-target');
            } else {
                indicator.classList.remove('in-target');
            }
        }
    }
    
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Mobile/Desktop specific instruction visibility */
            .desktop-only {
                display: inline;
            }
            .mobile-only {
                display: none;
            }
            
            body.mobile .desktop-only {
                display: none;
            }
            body.mobile .mobile-only {
                display: inline;
            }
            
            /* Mobile fishing button styling - Shiny Stardew Valley inspired */
            .mobile-fishing-button {
                display: none;
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
            
            /* Only show on mobile when fishing is active */
            body.mobile .mobile-fishing-button {
                display: none;
            }
            
            /* Only show jig button when fishing is active - be specific to avoid conflicts */
            body.mobile.fishing-active #mobile-jig-button {
                display: flex;
            }
            
            /* Position the jig button - same location as cast/reel buttons */
            body.mobile #mobile-jig-button {
                position: fixed !important;
                bottom: 120px !important;
                right: 30px !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
            }
            
            /* Jig button - 33% bigger and moved left when fishing is active */
            body.mobile.fishing-active #mobile-jig-button {
                width: 93px !important; /* 70px * 1.33 = 93px */
                height: 93px !important;
                font-size: 37px !important; /* 28px * 1.33 = 37px */
                right: 50px !important; /* Move left by increasing right value */
                border-width: 4px !important; /* Slightly thicker border for larger button */
                /* Keep opacity at 0.75 to match other buttons and not distract from game */
            }
            
            /* Hide when tacklebox is open */
            body.mobile:has(#tacklebox-ui[style*="flex"]) #mobile-jig-button {
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
            
            /* Adjust jigging meter for mobile - 20% smaller and repositioned */
            body.mobile #jigging-meter {
                left: 30%;           /* Move to the right (same as casting) */
                top: 45%;            /* Move 5% up from center */
                height: 180px;       /* 20% smaller height */
                transform: translateY(-50%); /* Keep it vertically centered */
            }
        `;
        document.head.appendChild(style);
    }
    
    setupMobileControls() {
        // Only set up if on mobile
        if (!hytopia.isMobile) return;
        
        const jigButton = document.getElementById('mobile-jig-button');
        if (!jigButton) return;
        
        // Jig button (Q key)
        jigButton.addEventListener('touchstart', e => {
            // Don't allow jigging if button is disabled (cooldown active)
            if (jigButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            jigButton.classList.add('active');
            hytopia.pressInput('q', true);
        });
        
        jigButton.addEventListener('touchend', e => {
            // Don't process if button is disabled
            if (jigButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            jigButton.classList.remove('active');
            hytopia.pressInput('q', false);
        });
        
        // Note: fishing-active class is now managed in setupEventListeners() 
        // to ensure it's added/removed at the right time
    }
}

// Make it globally available
window.JigPanel = new JigPanel();