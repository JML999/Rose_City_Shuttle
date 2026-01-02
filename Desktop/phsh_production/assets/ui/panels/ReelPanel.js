class ReelPanel {
    constructor() {
        this.container = null;
        this.isActive = false;
        
        // Cached DOM references
        this.elements = {
            panel: null,
            fishMarker: null,
            targetZone: null,
            progressFill: null,
            baitDisplay: null,
            baitName: null
        };
        
        // Current state tracking
        this.currentState = { fishPosition: 0.5, barPosition: 0.5, progress: 0 };
        this.targetState = { fishPosition: 0.5, barPosition: 0.5, progress: 0 };
        
        // Animation properties
        this.animationId = null;
        this.lastFrameTime = 0;
        
        // Smoothing factors (0-1)
        this.fishSmoothingFactor = 0.2;
        this.barSmoothingFactor = 0.4; // Higher value = more responsive for user controls
        
        // Track inventory
        this.equippedBait = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        const panel = document.createElement('div');
        panel.id = 'reeling-minigame';
        panel.style.display = 'none';
        panel.innerHTML = `
            <!-- Pixelated, Minecraft-inspired design -->
            <div id="reel-tension-bar" class="tension-bar">
                <!-- Pixelated background with darker water pattern -->
                <div class="tension-bar-bg"></div>
                
                <!-- Target zone - pixel block style with enhanced visibility -->
                <div id="reel-target-zone" class="target-zone">
                    <div class="target-zone-overlay"></div>
                    <div class="target-zone-pattern"></div>
                </div>
                
                <!-- Fish marker with sprite image and highlight -->
                <div id="reel-fish-marker" class="marker">
                    <div class="fish-highlight"></div>
                    <div class="fish-sprite"></div>
                </div>
            </div>
            
            <!-- Pixelated progress bar -->
            <div id="reel-progress" class="progress-bar">
                <div class="progress-bar-bg"></div>
                <div id="reel-progress-fill" class="progress-fill"></div>
            </div>
            
            <!-- Add stylized bait display -->
            <div id="bait-display" class="bait-display">
                <div class="bait-icon"></div>
                <div class="bait-name">No bait equipped</div>
            </div>
        `;
        
        // Pixelated Minecraft-inspired CSS with darker blue and enhanced highlighting
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'Minecraft';
                src: url('https://fonts.cdnfonts.com/css/minecraft-3') format('woff2');
                font-weight: normal;
                font-style: normal;
            }
            
            #reeling-minigame {
                font-family: 'Minecraft', monospace;
                color: white;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 8px;
                image-rendering: pixelated;
            }
            
            /* Tension bar - pixelated design */
            .tension-bar {
                position: relative;
                height: 32px; /* Power of 2 for pixel precision */
                border: 4px solid #535353;
                border-radius: 0; /* Square corners for pixel aesthetic */
                background: transparent;
                overflow: hidden;
                box-shadow: inset 0 0 0 2px #000000; /* Inner black border */
            }
            
            .tension-bar-bg {
                position: absolute;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    0deg,
                    #023a67 0px, /* Darker blue */
                    #023a67 4px,
                    #034982 4px, /* Slightly lighter but still dark */
                    #034982 8px
                ); /* Pixelated water pattern */
                image-rendering: pixelated;
            }
            
            /* Enhanced target zone styling - more visible */
            #reel-target-zone {
                position: absolute;
                width: 25%;
                height: 100%;
                z-index: 2;
                box-sizing: border-box;
                border-left: 4px solid #ffffff;
                border-right: 4px solid #ffffff;
                background: transparent;
                /* Subtle pulse animation */
                animation: target-pulse 1.5s infinite alternate;
            }
            
            @keyframes target-pulse {
                from { box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.3); }
                to { box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.5); }
            }
            
            .target-zone-overlay {
                position: absolute;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.15);
            }
            
            .target-zone-pattern {
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: repeating-linear-gradient(
                    45deg,
                    rgba(255, 255, 255, 0.05),
                    rgba(255, 255, 255, 0.05) 4px,
                    rgba(255, 255, 255, 0.1) 4px,
                    rgba(255, 255, 255, 0.1) 8px
                );
            }
            
            /* Enhanced fish marker with sprite and highlight */
            #reel-fish-marker {
                position: absolute;
                width: 4px;
                height: 100%;
                z-index: 3;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .fish-highlight {
                position: absolute;
                width: 30px;
                height: 30px;
                background: radial-gradient(circle, rgba(255,204,0,0.3) 0%, rgba(255,204,0,0) 70%);
                border-radius: 50%;
            }
            
            .fish-sprite {
                width: 24px;
                height: 24px;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                image-rendering: pixelated;
                /* Add subtle outline for better visibility */
                filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
            }
            
            /* Pixelated progress bar */
            .progress-bar {
                position: relative;
                height: 16px;
                border: 4px solid #535353;
                border-radius: 0; /* Square for pixel look */
                background: #181818;
                overflow: hidden;
                box-shadow: inset 0 0 0 2px #000000; /* Inner black border */
            }
            
            .progress-bar-bg {
                position: absolute;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    90deg,
                    #333333 0px,
                    #333333 4px,
                    #3a3a3a 4px,
                    #3a3a3a 8px
                ); /* Pixelated pattern */
                image-rendering: pixelated;
            }
            
            .progress-fill {
                position: absolute;
                height: 100%;
                width: 0%;
                background: repeating-linear-gradient(
                    90deg,
                    #41b93e 0px,
                    #41b93e 4px,
                    #5dc25a 4px,
                    #5dc25a 8px
                ); /* Pixelated pattern */
                image-rendering: pixelated;
                transition: width 0.2s steps(10); /* Use steps for pixelated animation */
            }
            
            /* Enhanced feedback when fish is in target zone */
            .in-target-zone .fish-sprite {
            }
            
            .in-target-zone .fish-highlight {
                background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%);
                animation: highlight-pulse 0.5s infinite alternate;
            }
            
            /* Enchantment Visual Feedback Styles */
            
            /* Widened catch zone - cyan/blue border */
            #reel-target-zone.enchantment-widened-zone {
                border-left-color: #00ffff;
                border-right-color: #00ffff;
                box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.4);
            }
            
            /* High Drag - purple/violet glow (fish slowed) */
            #reel-fish-marker.enchantment-high-drag .fish-highlight {
                background: radial-gradient(circle, rgba(150, 50, 255, 0.4) 0%, rgba(150, 50, 255, 0) 70%);
                box-shadow: 0 0 10px rgba(150, 50, 255, 0.6);
            }
            
            /* Low Drag - red/orange glow (fish faster) */
            #reel-fish-marker.enchantment-low-drag .fish-highlight {
                background: radial-gradient(circle, rgba(255, 100, 50, 0.4) 0%, rgba(255, 100, 50, 0) 70%);
                box-shadow: 0 0 10px rgba(255, 100, 50, 0.6);
            }
            
            /* Fatigue - enhanced green glow on fish marker */
            #reel-fish-marker.enchantment-fatigue .fish-highlight {
                background: radial-gradient(circle, rgba(0, 255, 100, 0.7) 0%, rgba(0, 255, 100, 0.3) 50%, rgba(0, 255, 100, 0) 80%);
                box-shadow: 0 0 15px rgba(0, 255, 100, 0.8), 0 0 25px rgba(0, 255, 100, 0.5);
                animation: fatigue-pulse 1.5s infinite alternate;
            }
            
            /* Fatigue - also tint the fish sprite itself */
            #reel-fish-marker.enchantment-fatigue .fish-sprite {
                filter: drop-shadow(0 0 8px rgba(0, 255, 100, 0.9)) drop-shadow(0 0 4px rgba(0, 255, 100, 0.6));
            }
            
            /* Temptranquil - enhanced blue-green glow */
            #reel-fish-marker.enchantment-temptranquil .fish-highlight {
                background: radial-gradient(circle, rgba(0, 200, 255, 0.8) 0%, rgba(0, 150, 200, 0.4) 50%, rgba(0, 150, 200, 0) 80%);
                box-shadow: 0 0 20px rgba(0, 200, 255, 0.9), 0 0 30px rgba(0, 150, 200, 0.6);
                animation: temptranquil-pulse 1.2s infinite alternate;
            }
            
            /* Temptranquil - also tint the fish sprite itself */
            #reel-fish-marker.enchantment-temptranquil .fish-sprite {
                filter: drop-shadow(0 0 10px rgba(0, 200, 255, 1)) drop-shadow(0 0 6px rgba(0, 150, 200, 0.7));
            }
            
            @keyframes fatigue-pulse {
                from { 
                    opacity: 0.8; 
                    transform: scale(1);
                    box-shadow: 0 0 15px rgba(0, 255, 100, 0.8), 0 0 25px rgba(0, 255, 100, 0.5);
                }
                to { 
                    opacity: 1; 
                    transform: scale(1.15);
                    box-shadow: 0 0 20px rgba(0, 255, 100, 1), 0 0 35px rgba(0, 255, 100, 0.7);
                }
            }
            
            @keyframes temptranquil-pulse {
                from { 
                    opacity: 0.85; 
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(0, 200, 255, 0.9), 0 0 30px rgba(0, 150, 200, 0.6);
                }
                to { 
                    opacity: 1; 
                    transform: scale(1.2);
                    box-shadow: 0 0 25px rgba(0, 200, 255, 1), 0 0 40px rgba(0, 150, 200, 0.8);
                }
            }
            
            @keyframes success-pulse {
                0%, 49% { transform: translateY(-50%) scale(1); }
                50%, 100% { transform: translateY(-50%) scale(1.1); }
            }
            
            @keyframes highlight-pulse {
                from { opacity: 0.7; }
                to { opacity: 1; }
            }
            
            /* Main panel positioning (ensure it's using relative positioning) */
            .reel-panel {
                position: relative;
            }
            
            /* Bait display container - positioned below the main panel content */
            .bait-display {
                position: absolute;
                bottom: 40px; /* Position below the panel */
                left: 50%;
                transform: translateX(-50%); /* Perfect horizontal centering */
                
                /* Styling for the box */
                background-color: rgba(0, 0, 0, 0.6);
                border: 2px solid #555;
                border-radius: 5px;
                padding: 5px 10px;
                
                /* Fixed width to ensure consistent centering */
                width: auto;
                min-width: 120px;
                max-width: 200px;
                
                /* Center the text inside */
                text-align: center;
                
                /* Hidden by default */
                display: none;
                
                /* Ensure it's on top of other elements */
                z-index: 100;
            }
            
            /* Active state */
            .bait-display.active {
                display: block;
            }
            
            /* Bait name text */
            .bait-name {
                color: white;
                font-size: 14px;
                text-shadow: 1px 1px 2px black;
                font-family: 'Minecraft', monospace; /* Pixelated font if available */
                text-align: center;
            }
            
            /* Bait effect text */
            .bait-effect {
                font-size: 12px;
                opacity: 0.9;
                font-style: italic;
                display: block;
                margin-top: 2px;
                text-align: center;
            }
            
            /* Rarity colors */
            .bait-common { color: #ffffff; }
            .bait-uncommon { color: #2bff00; }
            .bait-rare { color: #0070dd; }
            .bait-epic { color: #a335ee; }
            .bait-legendary { color: #ff8000; }
            
            /* Remove background from bait display when using no-background class */
            .bait-display.no-background {
                background-color: transparent;
                border: none;
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
            }
            
            /* Add a pulse highlight effect to the text */
            .highlight-pulse {
                animation: text-pulse 1.2s infinite alternate;
                filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));
                font-weight: bold;
                font-size: 16px !important;
            }
            
            @keyframes text-pulse {
                from { opacity: 0.8; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1.05); }
            }
            
            /* Make rarity colors more vivid without background */
            .no-background .bait-common { color: #ffffff; text-shadow: 0 0 5px #ffffff; }
            .no-background .bait-uncommon { color: #4eff24; text-shadow: 0 0 5px #4eff24; }
            .no-background .bait-rare { color: #0091ff; text-shadow: 0 0 5px #0091ff; }
            .no-background .bait-epic { color: #c44aff; text-shadow: 0 0 5px #c44aff; }
            .no-background .bait-legendary { color: #ffaa33; text-shadow: 0 0 5px #ffaa33; }
            
            /* Ultra-highlight for maximum visibility */
            .ultra-highlight {
                animation: strong-pulse 1.2s infinite alternate;
                font-weight: bold;
                font-size: 18px !important;
                letter-spacing: 1px;
                text-transform: uppercase;
                filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.9)) 
                        drop-shadow(0 0 5px rgba(255, 255, 255, 0.6));
            }
            
            @keyframes strong-pulse {
                from { 
                    opacity: 0.9; 
                    transform: scale(1);
                    text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
                }
                to { 
                    opacity: 1; 
                    transform: scale(1.08);
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.9),
                                 0 0 15px rgba(255, 255, 255, 0.5);
                }
            }
            
            /* Enhanced rarity colors with stronger glow */
            .no-background .bait-common { 
                color: #ffffff; 
                text-shadow: 0 0 5px #ffffff, 0 0 10px #ffffff, 0 0 2px #000000;
            }
            .no-background .bait-uncommon { 
                color: #50ff20; 
                text-shadow: 0 0 5px #50ff20, 0 0 10px #50ff20, 0 0 2px #000000;
            }
            .no-background .bait-rare { 
                color: #0091ff; 
                text-shadow: 0 0 5px #0091ff, 0 0 10px #0091ff, 0 0 2px #000000;
            }
            .no-background .bait-epic { 
                color: #c44aff; 
                text-shadow: 0 0 5px #c44aff, 0 0 10px #c44aff, 0 0 2px #000000;
            }
            .no-background .bait-legendary { 
                color: #ffaa33; 
                text-shadow: 0 0 5px #ffaa33, 0 0 10px #ffaa33, 0 0 2px #000000;
            }
            
            /* Optional: Add a subtle background highlight that doesn't look like a box */
            .bait-display.no-background {
                background-color: transparent;
                border: none;
                position: relative;
            }
            
            .bait-display.no-background::before {
                content: '';
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                background: radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
                z-index: -1;
                pointer-events: none;
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
            
            /* Only show on mobile when reeling is active */
            body.mobile .mobile-fishing-button {
                display: none;
            }
            
            body.mobile.reeling-active #mobile-reel-button {
                display: flex;
            }
            
            /* Position the reel button - same location as cast/jig buttons */
            body.mobile #mobile-reel-button {
                position: fixed !important;
                bottom: 120px !important;
                right: 30px !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
            }
            
            /* Hide any mobile-fishing-button that might be inside the reeling-minigame container */
            #reeling-minigame .mobile-fishing-button,
            .reel-panel .mobile-fishing-button {
                display: none !important;
            }
            
            /* Hide when tacklebox is open */
            body.mobile:has(#tacklebox-ui[style*="flex"]) #mobile-reel-button {
                display: none !important;
            }
            
            /* Reel button - 33% bigger and moved left when reeling is active */
            body.mobile.reeling-active #mobile-reel-button {
                width: 93px !important; /* 70px * 1.33 = 93px */
                height: 93px !important;
                font-size: 37px !important; /* 28px * 1.33 = 37px */
                right: 50px !important; /* Move left by increasing right value */
                border-width: 4px !important; /* Slightly thicker border for larger button */
                /* Keep opacity at 0.75 to match other buttons and not distract from game */
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
            
            /* Adjust reeling UI for mobile */
            body.mobile #reeling-minigame {
                width: 80%;  /* Make it narrower than desktop */
                max-width: 450px;  /* Set a maximum width */
                left: 50%;  /* Center it horizontally */
                transform: translateX(-50%);  /* Ensure it's properly centered */
                bottom: 20%;  /* Position a bit higher from bottom */
                margin-top: 30px;
                position: absolute;
            }
            
            /* Make the tension bar wider and progress bar narrower on mobile */
            body.mobile .tension-bar {
                height: 36px;  /* Slightly taller for better touch targets */
                width: 110%;  /* Make it 10% wider than the container */
                margin-left: -5%;  /* Center it by offsetting half of the extra width */
                border-width: 5px; /* Thicker borders for visibility */
            }
            
            body.mobile #reel-target-zone {
                border-left-width: 5px;
                border-right-width: 5px;
            }
            
            /* Make the progress bar slightly smaller and narrower */
            body.mobile .progress-bar {
                height: 20px;
                width: 90%;  /* Make it 90% of the container width */
                margin: 0 auto;  /* Center it horizontally */
                margin-bottom: min(2vh, 10px);
                border-width: 5px; /* Thicker borders for visibility */
            }
            
            /* Adjust text size for mobile */
            body.mobile .reeling-instructions {
                font-size: 16px;
                margin-top: 10px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            /* Enhance visual feedback for mobile */
            body.mobile .fish-sprite {
                transform: translateY(-50%) scale(1.2);
            }
            
            /* Enhanced target zone visibility on mobile */
            body.mobile .target-zone-overlay {
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* Enhanced progress bar visibility on mobile */
            body.mobile .progress-fill {
                box-shadow: 0 0 8px rgba(95, 255, 100, 0.6);
            }
            
            /* Add touch-friendly spacing */
            body.mobile #reeling-minigame > * {
                margin-bottom: 10px;
            }
        `;
        document.head.appendChild(style);
        
        this.container.appendChild(panel);
        
        // Create mobile reel button separately (outside the panel container to avoid positioning issues)
        if (!document.getElementById('mobile-reel-button')) {
            const reelButton = document.createElement('div');
            reelButton.id = 'mobile-reel-button';
            reelButton.className = 'mobile-fishing-button';
            reelButton.innerHTML = '<span class="mobile-button-icon">🎣</span>';
            document.body.appendChild(reelButton);
        }
        
        // Load the sardine sprite
        this.loadAssets();
        
        // Retain existing functionality
        this.cacheElements();
        this.setupEventListeners();
        this.startRenderLoop();
        
        // Make sure these methods are called:
        this.addMobileStyles();
        this.setupMobileControls();
    }
    
    // Add method to load the sardine sprite image
    loadAssets() {
        const baseUrl = this.getAssetBaseUrl();
        
        // Apply to fish sprite elements
        const fishSprites = document.querySelectorAll('.fish-sprite');
        fishSprites.forEach(sprite => {
            sprite.style.backgroundImage = `url('${baseUrl}/ui/icons/sardine_sprite.png')`;
        });
        
        // Default bait icon (will be updated when specific bait is equipped)
        const baitIcon = document.querySelector('.bait-icon');
        if (baitIcon) {
            baitIcon.style.backgroundImage = `url('${baseUrl}/ui/icons/bait_default.png')`;
        }
    }
    
    // Add the getAssetBaseUrl method from InventoryPanel
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
    
    cacheElements() {
        this.elements.panel = document.getElementById('reeling-minigame');
        this.elements.fishMarker = document.getElementById('reel-fish-marker');
        this.elements.targetZone = document.getElementById('reel-target-zone');
        this.elements.progressFill = document.getElementById('reel-progress-fill');
        this.elements.baitDisplay = document.getElementById('bait-display');
        this.elements.baitName = document.getElementById('bait-display').querySelector('.bait-name');
    }

    setupEventListeners() {
        hytopia.onData((data) => {
            if (data.type === 'startReeling') {
                if (this.elements.panel) {
                    this.elements.panel.style.display = 'block';
                    this.isActive = true;
                    
                    // Initialize current and target state
                    this.currentState = { fishPosition: 0.5, barPosition: 0.5, progress: 0 };
                    this.targetState = { fishPosition: 0.5, barPosition: 0.5, progress: 0 };
                    this.applyState(this.currentState);
                    
                    // Apply enchantment visual feedback
                    this.applyEnchantmentVisuals(data);
                    
                    // Check for bait effect data
                    if (data.baitEffect) {
                        this.displayBaitEffect(data.baitEffect);
                    }
                }
                
                // Add reeling-active class immediately to hide cast button
                // Also remove fishing-active if present (transition from jigging)
                document.body.classList.remove('fishing-active');
                document.body.classList.add('reeling-active');
            } else if (data.type === 'updateReeling') {
                // Store target values - animation loop will handle the updates
                this.targetState = {
                    fishPosition: data.fishPosition,
                    barPosition: data.barPosition,
                    progress: data.progress
                };
                
                // Progress bar updates immediately - no need for smoothing
                if (this.elements.progressFill) {
                    this.elements.progressFill.style.width = `${data.progress}%`;
                }
                this.currentState.progress = data.progress;
                
                // Apply enchantment visual feedback (updates every tick)
                this.applyEnchantmentVisuals(data);
                
                // Check if fish is in target zone for visual effects
                this.updateTargetZoneEffects();
                
            } else if (data.type === 'hideReeling') {
                if (this.elements.panel) {
                    this.elements.panel.style.display = 'none';
                    this.isActive = false;
                    
                    // Hide the bait display when reeling ends
                    if (this.elements.baitDisplay) {
                        this.elements.baitDisplay.classList.remove('active');
                        this.elements.baitDisplay.style.display = 'none';
                    }
                }
                
                // Add this line:
                document.body.classList.remove('reeling-active');
            } else if (data.type === 'inventoryUpdate') {
                this.updateInventoryData(data.inventory);
                
                // If we're actively reeling, update the bait display
                if (this.isActive) {
                    this.displayBaitEffect(data.baitEffect);
                }
            }
        });
    }
    
    updateInventoryData(inventory) {
        // Extract equipped bait
        this.equippedBait = inventory?.equippedBait || null;
    }
    
    // Simplified version - ONLY show resilience bonuses
    displayBaitEffect(effect) {
        if (!this.elements.baitDisplay || !this.elements.baitName) {
            console.error("BAIT DISPLAY ELEMENTS NOT FOUND");
            return;
        }
        
        // Always hide first - this will set display: none
        this.elements.baitDisplay.classList.remove('active');
        this.elements.baitDisplay.style.display = 'none';
        
        // If no effect data, stay hidden
        if (!effect) {
            return;
        }
        
        // Check for resilience bonus only
        const resilience = effect.resilliance || effect.resilience || 1.0;
        
        // ONLY show if there's actually a resilience bonus
        if (resilience > 1.0) {
            const boostPercent = Math.round((resilience - 1) * 100);
            
            // Set the text and show the element
            this.elements.baitName.textContent = `+${boostPercent}% RESILIENCE`;
            this.elements.baitName.className = 'bait-name ultra-highlight';
            this.elements.baitName.classList.add(`bait-${(effect.rarity || 'common').toLowerCase()}`);
            
            // Make sure display is visible but without background
            this.elements.baitDisplay.classList.add('active');
            this.elements.baitDisplay.classList.add('no-background');
        }
    }
    
    updateTargetZoneEffects() {
        // Add visual feedback when fish is in target zone
        const fishInZone = 
            this.targetState.fishPosition >= this.targetState.barPosition && 
            this.targetState.fishPosition <= (this.targetState.barPosition + 0.25);
            
        if (fishInZone) {
            this.elements.fishMarker.classList.add('in-target-zone');
        } else {
            this.elements.fishMarker.classList.remove('in-target-zone');
        }
    }
    
    // Apply enchantment visual feedback
    applyEnchantmentVisuals(data) {
        if (!this.elements.targetZone || !this.elements.fishMarker) return;
        
        // 1. Catch Zone Widening
        if (data.catchZoneWidth !== undefined) {
            const baseZoneWidth = 0.25; // Base 25% width
            const newWidth = baseZoneWidth * data.catchZoneWidth * 0.75; // Apply 25% reduction to match server-side BAR_WIDTH
            this.elements.targetZone.style.width = `${newWidth * 100}%`;
            
            // Add visual class if zone is widened
            if (data.catchZoneWidth > 1.0) {
                this.elements.targetZone.classList.add('enchantment-widened-zone');
            } else {
                this.elements.targetZone.classList.remove('enchantment-widened-zone');
            }
        }
        
        // 2. Drag Visual Feedback
        if (data.rodDrag !== undefined) {
            this.elements.fishMarker.classList.remove('enchantment-high-drag', 'enchantment-low-drag');
            
            if (data.rodDrag > 1.0) {
                // High drag = slower fish = purple glow
                this.elements.fishMarker.classList.add('enchantment-high-drag');
            } else if (data.rodDrag < 1.0) {
                // Low drag = faster fish = red/orange glow
                this.elements.fishMarker.classList.add('enchantment-low-drag');
            }
        }
        
        // 3. Fatigue Visual Feedback - Enhanced visibility
        if (data.fatigueMultiplier !== undefined) {
            this.elements.fishMarker.classList.remove('enchantment-fatigue', 'enchantment-temptranquil');
            
            if (data.hasTemptranquil) {
                // Temptranquil - stronger exhaustion effect with more visible indicators
                this.elements.fishMarker.classList.add('enchantment-temptranquil');
                const exhaustion = 1 - data.fatigueMultiplier; // 0-0.18
                // More dramatic visual changes
                const hueRotate = exhaustion * 120; // Stronger blue-green shift
                const brightness = 0.6 + exhaustion * 0.4; // More noticeable darkening
                const saturation = 1.5 + exhaustion * 0.5; // Increase saturation for visibility
                this.elements.fishMarker.style.filter = `hue-rotate(${hueRotate}deg) brightness(${brightness}) saturate(${saturation})`;
            } else if (data.hasFatigue) {
                // Fatigue - more visible exhaustion effect
                this.elements.fishMarker.classList.add('enchantment-fatigue');
                const exhaustion = 1 - data.fatigueMultiplier; // 0-0.15
                // More noticeable visual changes
                const hueRotate = exhaustion * 80; // Stronger green shift
                const brightness = 0.7 + exhaustion * 0.3; // Noticeable darkening
                const saturation = 1.3 + exhaustion * 0.3; // Increase saturation
                this.elements.fishMarker.style.filter = `hue-rotate(${hueRotate}deg) brightness(${brightness}) saturate(${saturation})`;
            } else {
                // No fatigue - reset filter
                this.elements.fishMarker.style.filter = '';
            }
        }
    }
    
    // Smooth animation loop
    startRenderLoop() {
        const render = (timestamp) => {
            // Calculate delta time for smooth animation
            const deltaTime = timestamp - (this.lastFrameTime || timestamp);
            this.lastFrameTime = timestamp;
            
            if (this.isActive) {
                // Smoothly interpolate positions
                this.interpolatePositions(deltaTime);
            }
            
            this.animationId = requestAnimationFrame(render);
        };
        
        this.animationId = requestAnimationFrame(render);
    }
    
    // Interpolate positions smoothly
    interpolatePositions(deltaTime) {
        if (!this.elements.fishMarker || !this.elements.targetZone) return;
        
        // Handle fish marker interpolation
        const currentFishPos = this.currentState.fishPosition;
        const targetFishPos = this.targetState.fishPosition;
        
        if (Math.abs(currentFishPos - targetFishPos) > 0.001) {
            const newFishPos = currentFishPos + (targetFishPos - currentFishPos) * this.fishSmoothingFactor;
            this.currentState.fishPosition = newFishPos;
            this.elements.fishMarker.style.left = `${newFishPos * 100}%`;
        }
        
        // Handle target zone interpolation - smoother but still responsive
        const currentBarPos = this.currentState.barPosition;
        const targetBarPos = this.targetState.barPosition;
        
        if (Math.abs(currentBarPos - targetBarPos) > 0.001) {
            const newBarPos = currentBarPos + (targetBarPos - currentBarPos) * this.barSmoothingFactor;
            this.currentState.barPosition = newBarPos;
            this.elements.targetZone.style.left = `${newBarPos * 100}%`;
        }
    }
    
    // Apply complete state to DOM (used for initialization)
    applyState(state) {
        if (this.elements.fishMarker) {
            this.elements.fishMarker.style.left = `${state.fishPosition * 100}%`;
        }
        if (this.elements.targetZone) {
            this.elements.targetZone.style.left = `${state.barPosition * 100}%`;
        }
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${state.progress}%`;
        }
    }
    
    // Cleanup when panel is removed
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    // Test method to verify bait display works - ONLY resilience bonuses
    testBaitDisplay() {
        if (!this.elements.baitDisplay || !this.elements.baitName) {
            console.error("BAIT DISPLAY ELEMENTS NOT FOUND FOR TEST");
            return;
        }
        
        // Test 1: Show resilience boost
        setTimeout(() => {
            this.displayBaitEffect({
                name: "Earthworm",
                rarity: "uncommon",
                resilience: 1.3
            });
        }, 1000);
        
        // Test 2: No resilience bonus (should stay hidden)
        setTimeout(() => {
            this.displayBaitEffect({
                name: "Basic Bait",
                rarity: "common",
                resilience: 1.0
            });
        }, 3000);
        
        // Test 3: Another resilience boost
        setTimeout(() => {
            this.displayBaitEffect({
                name: "Premium Bait",
                rarity: "rare",
                resilience: 1.5
            });
        }, 5000);
        
        // Test 4: Hide completely
        setTimeout(() => {
            this.displayBaitEffect(null);
        }, 7000);
    }

    createHTML() {
        // Clear any existing panel first to avoid duplicates
        const existingPanel = document.querySelector('.reel-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const html = `
            <div class="reel-panel">
                <!-- Your existing elements -->
                
                <!-- Bait display with clear structure -->
                <div class="bait-display" style="position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.6); border: 2px solid #555; border-radius: 5px; padding: 5px 10px; text-align: center; min-width: 120px; z-index: 100;">
                    <div class="bait-name" style="color: white; font-size: 14px; text-shadow: 1px 1px 2px black;">Resilience display</div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Store element references with verification
        this.elements = {
            panel: document.querySelector('.reel-panel'),
            baitDisplay: document.querySelector('.bait-display'),
            baitName: document.querySelector('.bait-display .bait-name')
        };
        
        // Add a test message to verify the element works
        if (this.elements.baitName) {
            this.elements.baitName.textContent = "TEST RESILIENCE MESSAGE";
            this.elements.baitDisplay.classList.add('active');
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.elements.baitDisplay.classList.remove('active');
            }, 2000);
        }
    }

    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
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
            
            /* Only show on mobile when reeling is active */
            body.mobile .mobile-fishing-button {
                display: none;
            }
            
            body.mobile.reeling-active #mobile-reel-button {
                display: flex;
            }
            
            /* Position the reel button - same location as cast/jig buttons */
            body.mobile #mobile-reel-button {
                position: fixed !important;
                bottom: 120px !important;
                right: 30px !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
            }
            
            /* Hide any mobile-fishing-button that might be inside the reeling-minigame container */
            #reeling-minigame .mobile-fishing-button,
            .reel-panel .mobile-fishing-button {
                display: none !important;
            }
            
            /* Hide when tacklebox is open */
            body.mobile:has(#tacklebox-ui[style*="flex"]) #mobile-reel-button {
                display: none !important;
            }
            
            /* Reel button - 33% bigger and moved left when reeling is active */
            body.mobile.reeling-active #mobile-reel-button {
                width: 93px !important; /* 70px * 1.33 = 93px */
                height: 93px !important;
                font-size: 37px !important; /* 28px * 1.33 = 37px */
                right: 50px !important; /* Move left by increasing right value */
                border-width: 4px !important; /* Slightly thicker border for larger button */
                /* Keep opacity at 0.75 to match other buttons and not distract from game */
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
            
            /* Adjust reeling UI for mobile */
            body.mobile #reeling-minigame {
                width: 80%;  /* Make it narrower than desktop */
                max-width: 450px;  /* Set a maximum width */
                left: 50%;  /* Center it horizontally */
                transform: translateX(-50%);  /* Ensure it's properly centered */
                bottom: 20%;  /* Position a bit higher from bottom */
                margin-top: 30px;
                position: absolute;
            }
            
            /* Make the tension bar wider and progress bar narrower on mobile */
            body.mobile .tension-bar {
                height: 36px;  /* Slightly taller for better touch targets */
                width: 110%;  /* Make it 10% wider than the container */
                margin-left: -5%;  /* Center it by offsetting half of the extra width */
                border-width: 5px; /* Thicker borders for visibility */
            }
            
            body.mobile #reel-target-zone {
                border-left-width: 5px;
                border-right-width: 5px;
            }
            
            /* Make the progress bar slightly smaller and narrower */
            body.mobile .progress-bar {
                height: 20px;
                width: 90%;  /* Make it 90% of the container width */
                margin: 0 auto;  /* Center it horizontally */
                margin-bottom: min(2vh, 10px);
                border-width: 5px; /* Thicker borders for visibility */
            }
            
            /* Adjust text size for mobile */
            body.mobile .reeling-instructions {
                font-size: 16px;
                margin-top: 10px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }
            
            /* Enhance visual feedback for mobile */
            body.mobile .fish-sprite {
                transform: translateY(-50%) scale(1.2);
            }
            
            /* Enhanced target zone visibility on mobile */
            body.mobile .target-zone-overlay {
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* Enhanced progress bar visibility on mobile */
            body.mobile .progress-fill {
                box-shadow: 0 0 8px rgba(95, 255, 100, 0.6);
            }
            
            /* Add touch-friendly spacing */
            body.mobile #reeling-minigame > * {
                margin-bottom: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    setupMobileControls() {
        // Only set up if on mobile
        if (!hytopia.isMobile && !document.body.classList.contains('mobile')) return;
        
        // Get the reel button from the HTML template (already created in panel HTML)
        const reelButton = document.getElementById('mobile-reel-button');
        if (!reelButton) return;
        
        // Reel button (Q key)
        reelButton.addEventListener('touchstart', e => {
            e.preventDefault();
            reelButton.classList.add('active');
            hytopia.pressInput('q', true);
        });
        
        reelButton.addEventListener('touchend', e => {
            e.preventDefault();
            reelButton.classList.remove('active');
            hytopia.pressInput('q', false);
        });
        
        // Make sure mobile detection is working
        const checkMobile = () => {
            const isMobile = hytopia.isMobile || 
                             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile && !document.body.classList.contains('mobile')) {
                document.body.classList.add('mobile');
            }
        };
        
        // Run mobile check immediately
        checkMobile();
        
        // Also check when window resizes
        window.addEventListener('resize', checkMobile);
    }
}

window.ReelPanel = new ReelPanel();