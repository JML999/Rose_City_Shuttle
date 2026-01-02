class MobileControlsPanel {
    constructor() {
        this.container = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Ensure body.mobile class is set if on mobile (fallback detection)
        if (hytopia.isMobile && !document.body.classList.contains('mobile')) {
            document.body.classList.add('mobile');
            console.log('Added mobile class to body');
        }
        
        // Create a simple container with mobile buttons using the Hytopia example approach
        const panel = document.createElement('div');
        panel.className = 'mobile-controls';
        
        // Also add mobile-active class if on mobile (fallback)
        if (hytopia.isMobile) {
            panel.classList.add('mobile-active');
        }
        panel.innerHTML = `
            <a id="mobile-interact-button" class="mobile-button">
                <span class="mobile-button-icon" style="font-size: 24px;">👊</span>
            </a>
            
            <a id="mobile-jump-button" class="mobile-button">
                <span class="mobile-button-icon">⬆️</span>
            </a>
        `;
        
        // Note: Cast button is created by CastingPanel
        // Jig button is created by JigPanel
        // Reel button is created by ReelPanel
        
        this.container.appendChild(panel);
        
        // Add mobile styles
        this.addStyles();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Quest button is now the level panel in bottom left (handled by ProgressPanel)
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* By default, we hide the mobile controls */
            .mobile-controls {
                display: none;
                pointer-events: none;
            }
            
            /* Show on mobile devices */
            body.mobile .mobile-controls,
            .mobile-controls.mobile-active {
                display: flex !important;
                pointer-events: auto;
                gap: 14px;
                position: fixed;
                bottom: 40px;
                right: 40px;
                z-index: 9000;
            }
            
            /* Button styling - Shiny Stardew Valley inspired (teal/cyan for action buttons) */
            .mobile-button {
                background-color: rgba(0, 0, 0, 0.5); /* Fallback */
                border-radius: 50%;
                align-items: center;
                justify-content: center;
                display: flex;
                width: 60px;
                height: 60px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform, background-color;
                font-size: 24px;
                opacity: 0.75; /* Make more translucent */
                
                /* Stardew Valley inspired gradient - teal/cyan tones for action buttons */
                background: linear-gradient(135deg, 
                    #16a085 0%, 
                    #138d75 25%,
                    #16a085 50%,
                    #1abc9c 75%,
                    #16a085 100%);
                color: white;
                
                /* Reduced shadow intensity for less prominence */
                box-shadow: 
                    0 2px 8px rgba(22, 160, 133, 0.2),
                    0 1px 4px rgba(0, 0, 0, 0.15),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.15);
                
                border: 2px solid rgba(255, 255, 255, 0.2); /* Thinner, more subtle border */
                /* Glossy highlight effect */
                position: relative;
                overflow: hidden;
            }
            
            /* Jump button - different color (deep purple/violet) */
            #mobile-jump-button {
                order: 1;
                /* Stardew Valley inspired gradient - deep purple/violet tones */
                background: linear-gradient(135deg, 
                    #8e44ad 0%, 
                    #7d3c98 25%,
                    #8e44ad 50%,
                    #9b59b6 75%,
                    #8e44ad 100%) !important;
                box-shadow: 
                    0 2px 8px rgba(142, 68, 173, 0.2),
                    0 1px 4px rgba(0, 0, 0, 0.15),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.15) !important;
            }
            
            #mobile-jump-button.active {
                background: linear-gradient(135deg, 
                    #7d3c98 0%, 
                    #6c3483 25%,
                    #7d3c98 50%,
                    #8e44ad 75%,
                    #7d3c98 100%) !important;
                box-shadow: 
                    0 1px 4px rgba(125, 60, 152, 0.25),
                    0 1px 2px rgba(0, 0, 0, 0.2),
                    inset 0 2px 4px rgba(255, 255, 255, 0.25),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2) !important;
            }
            
            /* Interact button - teal/cyan (default) */
            #mobile-interact-button {
                order: 2;
            }
            
            /* Shiny highlight overlay for glossy effect - reduced intensity */
            .mobile-button::before {
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
            .mobile-button .mobile-button-icon {
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* Note: Fishing button styles (cast/jig/reel) are handled by their respective panels:
               - Cast button: CastingPanel.js
               - Jig button: JigPanel.js  
               - Reel button: ReelPanel.js
            */
            
            .mobile-button.active {
                transform: scale(0.95);
                opacity: 0.85; /* Slightly more visible when active */
                /* Darker, richer gradient when active */
                background: linear-gradient(135deg, 
                    #138d75 0%, 
                    #0e6655 25%,
                    #138d75 50%,
                    #16a085 75%,
                    #138d75 100%);
                box-shadow: 
                    0 1px 4px rgba(19, 141, 117, 0.25),
                    0 1px 2px rgba(0, 0, 0, 0.2),
                    inset 0 2px 4px rgba(255, 255, 255, 0.25),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
            }
            
            /* Reduced highlight when active */
            .mobile-button.active::before {
                opacity: 0.5;
                background: radial-gradient(
                    circle at 30% 30%,
                    rgba(255, 255, 255, 0.3) 0%,
                    rgba(255, 255, 255, 0.1) 30%,
                    transparent 60%
                );
            }
            
            /* Hide other mobile controls during fishing activities */
            body.mobile.fishing-active .mobile-controls,
            body.mobile.reeling-active .mobile-controls {
                display: none;
            }
            
            /* Hide mobile controls when merchant/shop panels are open (matching fishing button behavior) */
            body.mobile.inventory-open .mobile-controls {
                display: none !important;
            }
            
       /* Hide mobile controls when merchant overlays are visible - using :has() selector */
       body.mobile:has(#rod-shop-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#experimental-rod-shop-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#merchant-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#rune-shop-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#shrimp-shop-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#toolmaster-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#baitmaster-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#salt-bait-crafting-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#tacklebox-ui[style*="flex"]) .mobile-controls,
       body.mobile:has(#fish-weighing-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(#prize-display-overlay[style*="flex"]) .mobile-controls,
       body.mobile:has(.quests-overlay[style*="flex"]) .mobile-controls {
           display: none !important;
       }
            
            /* Quest button is now the level panel in bottom left (handled by ProgressPanel) */
        `;
        document.head.appendChild(style);
    }
    
    setupEventHandlers() {
        // Handle interact button touch/untouch
        const mobileInteractButton = document.getElementById('mobile-interact-button');
        if (mobileInteractButton) {
            mobileInteractButton.addEventListener('touchstart', e => {
                e.preventDefault();
                mobileInteractButton.classList.add('active');
                hytopia.pressInput('ml', true);
            });
            
            mobileInteractButton.addEventListener('touchend', e => {
                e.preventDefault();
                mobileInteractButton.classList.remove('active');
                hytopia.pressInput('ml', false);
            });
        }
        
        // Handle jump button touch/untouch
        const mobileJumpButton = document.getElementById('mobile-jump-button');
        if (mobileJumpButton) {
            mobileJumpButton.addEventListener('touchstart', e => {
                e.preventDefault();
                mobileJumpButton.classList.add('active');
                hytopia.pressInput(' ', true);
            });
            
            mobileJumpButton.addEventListener('touchend', e => {
                e.preventDefault();
                mobileJumpButton.classList.remove('active');
                hytopia.pressInput(' ', false);
            });
        }
        
        // Set up mobile movement detection to abort fishing (simple polling approach)
        this.setupFishingMovementDetection();
        
        // Note: Cast button is handled by CastingPanel.js
        // Jig and Reel buttons are handled by their respective panels (JigPanel.js and ReelPanel.js)
        
        // Quest button is now the level panel in bottom left (handled by ProgressPanel.js)
    }
    
    setupFishingMovementDetection() {
        // Track fishing state
        let isFishingActive = false;
        let hasSentAbort = false; // Prevent multiple abort messages
        
        // Listen for fishing state changes
        hytopia.onData((data) => {
            // Include casting phase in fishing state
            if (data.type === 'startFishing' || data.type === 'startReeling' || data.type === 'updateJigging' || data.type === 'castingPowerUpdate') {
                isFishingActive = true;
                hasSentAbort = false; // Reset abort flag when fishing starts
            } else if (data.type === 'fishingComplete' || data.type === 'hideReeling') {
                isFishingActive = false;
                hasSentAbort = false;
            }
        });
        
        // According to Hytopia docs, the joystick is in the left 40% of screen
        // The engine automatically handles it and sets input state
        // We'll detect touches in that area that result in movement
        let touchStartPos = null;
        let touchStartTime = 0;
        
        const handleTouchStart = (e) => {
            if (!isFishingActive || hasSentAbort) return;
            
            const touch = e.touches[0];
            const screenWidth = window.innerWidth;
            
            // Left 40% of screen is the movement joystick area (per Hytopia docs)
            if (touch.clientX < screenWidth * 0.4) {
                touchStartPos = { x: touch.clientX, y: touch.clientY };
                touchStartTime = Date.now();
            }
        };
        
        const handleTouchMove = (e) => {
            if (!isFishingActive || !touchStartPos || hasSentAbort) return;
            
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // If touch moved more than 20px, it's actual joystick movement
            // This threshold prevents accidental triggers from taps
            if (distance > 20) {
                console.log('[MobileControlsPanel] Joystick movement detected during fishing, aborting');
                hytopia.sendData({ type: 'abortFishing' });
                hasSentAbort = true;
                touchStartPos = null; // Reset
            }
        };
        
        const handleTouchEnd = () => {
            touchStartPos = null;
        };
        
        // Add listeners with passive flag - this won't interfere with the engine's joystick
        // The engine's handlers are on the root container, so our listeners won't block them
        document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: true, capture: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: false });
    }
}

// Make it globally available
window.MobileControlsPanel = new MobileControlsPanel();
console.log('MobileControlsPanel global object created');