// Fish Weighing Panel - Collector weighing ceremony overlay
class FishWeighingPanel {
    constructor() {
        this.playerId = null;
        this.currentFish = null;
        this.currentDisplayWeight = 0;
        this.finalWeight = 0;
        this.isAnimating = false;
        this.onComplete = null;
        this.speciesLeaderboard = [];
        this.overallLeaderboard = [];
        this.animationFrame = null;
        this.styleElement = null;
        this.container = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('[FishWeighing] Container not found:', containerId);
            return;
        }
        
        // Create panel HTML following merchant panel structure
        const panel = document.createElement('div');
        panel.id = 'fish-weighing-ui';
        panel.innerHTML = `
            <div class="weighing-overlay" id="fish-weighing-overlay">
                <div class="weighing-container">
                    <div class="weighing-header">
                        <div class="weighing-title">⚖️ FISH WEIGHING CEREMONY ⚖️</div>
                    </div>
                    
                    <div class="weighing-content">
                        <!-- Left Panel: Top 3 Species by Value -->
                        <div class="weighing-left-panel">
                            <div class="leaderboard-title">TOP 3 SPECIES</div>
                            <div class="leaderboard-subtitle" id="species-name">-</div>
                            <div class="leaderboard-list" id="species-leaderboard">
                                <div class="leaderboard-entry">
                                    <span class="rank">🥇</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                                <div class="leaderboard-entry">
                                    <span class="rank">🥈</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                                <div class="leaderboard-entry">
                                    <span class="rank">🥉</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Center Panel: Scale Animation -->
                        <div class="weighing-center-panel">
                            <div class="scale-container">
                                <div class="fish-display">
                                    <div class="fish-name" id="fish-name">---</div>
                                </div>
                                
                                <div class="weight-value-display">
                                    <div class="weight-main">
                                        <span class="weight-number" id="weight-value">0.00</span>
                                        <span class="weight-unit">LBS</span>
                                    </div>
                                    <div class="value-subscript" id="fish-value">$0</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Panel: Top 3 Overall by Value -->
                        <div class="weighing-right-panel">
                            <div class="leaderboard-title">TOP 3 OVERALL</div>
                            <div class="leaderboard-subtitle">All Species</div>
                            <div class="leaderboard-list" id="overall-leaderboard">
                                <div class="leaderboard-entry">
                                    <span class="rank">🥇</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                                <div class="leaderboard-entry">
                                    <span class="rank">🥈</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                                <div class="leaderboard-entry">
                                    <span class="rank">🥉</span>
                                    <span class="player">---</span>
                                    <span class="value">$0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom status/result area -->
                    <div class="weighing-result" id="weighing-result">
                        <div class="result-text" id="result-text"></div>
                        <div class="celebration-area" id="celebration-area"></div>
                        <div class="wheel-button-area" id="wheel-button-area" style="display: none;">
                            <button class="wheel-spin-button" id="wheel-spin-button">🎰 SPIN THE WHEEL 🎰</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.addStyles();
        
        // Hide panel initially
        document.getElementById('fish-weighing-overlay').style.display = 'none';
        
        // Set up message handling
        hytopia.onData((data) => {
            // Listen for player ID from server
            if (data.type === 'playerIdentity') {
                this.playerId = data.playerId;
                return;
            }
            
            if (data.type === 'startFishWeighing') {
                this.startWeighing(data.fishData, data.leaderboards, data.onComplete);
            } else if (data.type === 'fishWeighingComplete') {
                this.completeWeighing(data.result);
            }
        });
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Fish Weighing Panel Styles - Following merchant panel patterns */
            :root {
                --weighing-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                --weighing-bg-primary: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                --weighing-bg-secondary: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                --weighing-border: #444;
                --weighing-border-light: #555;
                --weighing-text: #ffffff;
                --weighing-text-muted: #cccccc;
                --weighing-text-dim: #888;
                --weighing-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
                --weighing-shadow-inset: inset 0 2px 8px rgba(0, 0, 0, 0.5);
                --weighing-gold: #ffd700;
                --weighing-silver: #c0c0c0;
                --weighing-bronze: #cd7f32;
            }

            #fish-weighing-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 3000;
                font-family: var(--weighing-font);
                user-select: none;
            }

            .weighing-container {
                background: var(--weighing-bg-primary);
                border: 2px solid var(--weighing-border);
                border-radius: 12px;
                box-shadow: var(--weighing-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                width: 900px;
                max-width: 95vw;
                max-height: 85vh;
                height: fit-content;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .weighing-header {
                padding: 12px 16px;
                background: var(--weighing-bg-secondary);
                border-bottom: 1px solid var(--weighing-border);
                text-align: center;
            }

            .weighing-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--weighing-text);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
                letter-spacing: 1px;
            }

            .weighing-content {
                padding: 16px;
                display: grid;
                grid-template-columns: 1fr 2fr 1fr;
                gap: 16px;
                align-items: flex-start;
                flex: 1;
                min-height: 0;
                max-height: calc(85vh - 200px);
            }

            /* Leaderboard Panels */
            .weighing-left-panel,
            .weighing-right-panel {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid var(--weighing-border);
                border-radius: 8px;
                padding: 12px;
                height: fit-content;
            }

            .leaderboard-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--weighing-gold);
                text-align: center;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .leaderboard-subtitle {
                font-size: 11px;
                color: var(--weighing-text-muted);
                text-align: center;
                margin-bottom: 12px;
                font-style: italic;
            }

            .leaderboard-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .leaderboard-entry {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .leaderboard-entry .rank {
                font-size: 14px;
                width: 20px;
                text-align: center;
            }

            .leaderboard-entry .player {
                flex: 1;
                font-size: 11px;
                color: var(--weighing-text);
                margin: 0 6px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .leaderboard-entry .value {
                font-size: 11px;
                font-weight: 600;
                color: var(--weighing-gold);
                min-width: 50px;
                text-align: right;
            }

            /* Center Scale Panel */
            .weighing-center-panel {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: rgba(0, 0, 0, 0.4);
                border: 2px solid var(--weighing-border);
                border-radius: 12px;
                padding: 16px;
                box-shadow: var(--weighing-shadow-inset);
                min-height: 0;
            }

            .scale-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                width: 100%;
            }

            .fish-display {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .fish-icon {
                width: 56px;
                height: 56px;
                object-fit: contain;
                image-rendering: pixelated;
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.3);
                padding: 6px;
                border: 2px solid var(--weighing-border);
            }

            .fish-name {
                font-size: 18px;
                font-weight: 700;
                color: var(--weighing-text);
                text-align: center;
            }

            .fish-rarity {
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
                padding: 4px 8px;
                border-radius: 6px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--weighing-border);
            }

            .weight-value-display {
                background: rgba(0, 0, 0, 0.6);
                padding: 20px;
                border-radius: 12px;
                border: 2px solid var(--weighing-border);
                min-width: 200px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }

            .weight-main {
                display: flex;
                align-items: baseline;
                gap: 8px;
            }

            .weight-number {
                font-size: 36px;
                font-weight: 700;
                color: var(--weighing-text);
                font-family: 'Courier New', monospace;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                transition: all 0.1s ease;
            }

            .weight-unit {
                font-size: 16px;
                font-weight: 600;
                color: var(--weighing-text-muted);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .value-subscript {
                font-size: 20px;
                font-weight: 700;
                color: var(--weighing-gold);
                font-family: 'Courier New', monospace;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                margin-top: 4px;
            }

            /* Result Area */
            .weighing-result {
                padding: 12px 16px;
                background: var(--weighing-bg-secondary);
                border-top: 1px solid var(--weighing-border);
                text-align: center;
                min-height: 40px;
                max-height: 100px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                flex-shrink: 0;
                overflow: hidden;
            }

            .result-text {
                font-size: 13px;
                font-weight: 600;
                color: var(--weighing-text);
                line-height: 1.3;
                max-height: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .celebration-area {
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .wheel-button-area {
                margin-top: 6px;
                display: flex;
                justify-content: center;
            }

            .wheel-spin-button {
                background: linear-gradient(135deg, #ff6b35, #ff8c42);
                border: 2px solid #ff6b35;
                border-radius: 8px;
                color: white;
                font-size: 13px;
                font-weight: 700;
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3);
            }

            .wheel-spin-button:hover {
                background: linear-gradient(135deg, #ff8c42, #ffab5e);
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(255, 107, 53, 0.4);
            }

            .wheel-spin-button:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
            }

            /* Rarity Colors */
            .rarity-common { color: #ffffff; background-color: rgba(255, 255, 255, 0.1); }
            .rarity-uncommon { color: #00ff00; background-color: rgba(0, 255, 0, 0.1); }
            .rarity-rare { color: #0080ff; background-color: rgba(0, 128, 255, 0.1); }
            .rarity-epic { color: #8000ff; background-color: rgba(128, 0, 255, 0.1); }
            .rarity-legendary { color: #ff8000; background-color: rgba(255, 128, 0, 0.1); }
            .rarity-mythic { color: #ff0080; background-color: rgba(255, 0, 128, 0.1); }

            /* Animation Effects */
            .weight-hovering {
                animation: weightHover 0.3s ease-in-out infinite alternate;
            }

            @keyframes weightHover {
                0% { transform: translateY(-1px); }
                100% { transform: translateY(1px); }
            }

            .celebration-confetti {
                animation: confetti 0.6s ease-out;
            }

            @keyframes confetti {
                0% { transform: scale(0) rotate(0deg); opacity: 0; }
                50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
                100% { transform: scale(1) rotate(360deg); opacity: 1; }
            }

            .record-glow {
                animation: recordGlow 2s ease-in-out infinite alternate;
            }

            @keyframes recordGlow {
                0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 10px rgba(255, 215, 0, 0.2); }
            }

            /* Mobile Responsive - Landscape Optimized */
            @media (max-width: 768px), (pointer: coarse) {
                .weighing-container {
                    width: 71.25vw;
                    max-height: 64.4vh;
                    height: auto;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .weighing-header {
                    padding: 6px 9px;
                    flex-shrink: 0;
                }
                
                .weighing-title {
                    font-size: 11px;
                    line-height: 1.1;
                }
                
                .weighing-content {
                    display: grid;
                    grid-template-columns: 1fr 2fr 1fr;
                    grid-template-rows: 1fr;
                    gap: 6px;
                    padding: 6px;
                    flex: 1;
                    min-height: 0;
                    height: 100%;
                    overflow: hidden;
                }
                
                .weighing-center-panel {
                    order: 0;
                    padding: 6px;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                }
                
                .weighing-left-panel,
                .weighing-right-panel {
                    order: 0;
                    padding: 4px;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow-y: auto;
                }
                
                .scale-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 6px;
                    min-height: 0;
                }
                
                .fish-display {
                    margin-bottom: 4px;
                }
                
                .fish-name {
                    font-size: 12px;
                }
                
                .weight-value-display {
                    padding: 8px;
                    min-width: 120px;
                }
                
                .weight-number {
                    font-size: 22px;
                }
                
                .weight-unit {
                    font-size: 11px;
                }
                
                .value-subscript {
                    font-size: 13px;
                    margin-top: 2px;
                }
                
                .leaderboard-title {
                    font-size: 8px;
                    margin-bottom: 2px;
                    padding: 2px 0;
                }
                
                .leaderboard-subtitle {
                    font-size: 7px;
                    margin-bottom: 4px;
                }
                
                .leaderboard-list {
                    gap: 3px;
                    flex: 1;
                    overflow-y: auto;
                }
                
                .leaderboard-entry {
                    padding: 2px 4px;
                }
                
                .leaderboard-entry .rank {
                    font-size: 9px;
                    width: 14px;
                }
                
                .leaderboard-entry .player {
                    font-size: 7px;
                    margin: 0 2px;
                }
                
                .leaderboard-entry .value {
                    font-size: 7px;
                    min-width: 30px;
                }
                
                .weighing-result {
                    padding: 6px 9px;
                    min-height: 30px;
                    max-height: 50px;
                    flex-shrink: 0;
                }
                
                .result-text {
                    font-size: 9px;
                    line-height: 1.2;
                    max-height: 35px;
                }
                
                .celebration-area {
                    height: 10px;
                }
                
                .wheel-spin-button {
                    font-size: 9px;
                    padding: 5px 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    startWeighing(fishData, leaderboards, onCompleteCallback) {
        // Reset any previous state before starting new weighing
        this.resetPanelState();
        
        this.currentFish = fishData;
        this.finalWeight = fishData.correctedWeight || fishData.weight;
        this.currentDisplayWeight = 0;
        this.speciesLeaderboard = leaderboards?.species || [];
        this.overallLeaderboard = leaderboards?.overall || [];
        this.onComplete = onCompleteCallback;

        // Show overlay
        const overlay = document.getElementById('fish-weighing-overlay');
        overlay.style.display = 'flex';

        // Disable player input like other panels
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();

        // Populate fish info
        this.populateFishInfo();
        this.populateLeaderboards();

        // Start weighing animation after short delay
        setTimeout(() => {
            this.startScaleAnimation();
        }, 500);
    }

    resetPanelState() {
        
        // Reset measurements
        const weightValue = document.getElementById('weight-value');
        const fishValue = document.getElementById('fish-value');
        
        if (weightValue) {
            weightValue.textContent = '0.00';
        }
        
        if (fishValue) {
            fishValue.textContent = '$0';
        }
        
        // Clear result messages and celebrations
        const resultText = document.getElementById('result-text');
        const celebrationArea = document.getElementById('celebration-area');
        const wheelButtonArea = document.getElementById('wheel-button-area');
        
        if (resultText) {
            resultText.innerHTML = '';
        }
        
        if (celebrationArea) {
            celebrationArea.innerHTML = '';
            celebrationArea.classList.remove('celebration-confetti');
        }
        
        if (wheelButtonArea) {
            wheelButtonArea.style.display = 'none';
        }
        
        // Reset layout changes - restore leaderboard panels
        const leftPanel = document.querySelector('.weighing-left-panel');
        const rightPanel = document.querySelector('.weighing-right-panel');
        const centerPanel = document.querySelector('.weighing-center-panel');
        
        if (leftPanel) leftPanel.style.display = 'block';
        if (rightPanel) rightPanel.style.display = 'block';
        
        if (centerPanel) {
            centerPanel.style.gridColumn = '';
            centerPanel.style.maxWidth = '';
            centerPanel.style.margin = '';
        }
        
        // Remove any visual effects
        const weightDisplay = document.querySelector('.weight-value-display');
        if (weightDisplay) {
            weightDisplay.classList.remove('record-glow');
        }
        
        // Reset animation state
        this.isAnimating = false;
        this.currentDisplayWeight = 0;
        
        // Clear any existing wheel button event listeners
        const wheelButton = document.getElementById('wheel-spin-button');
        if (wheelButton) {
            const newButton = wheelButton.cloneNode(true);
            wheelButton.parentNode.replaceChild(newButton, wheelButton);
        }
    }

    populateFishInfo() {
        const fishName = document.getElementById('fish-name');
        const speciesName = document.getElementById('species-name');

        fishName.textContent = this.currentFish.name;
        
        speciesName.textContent = this.currentFish.name;
    }

    populateLeaderboards() {
        this.populateLeaderboardList('species-leaderboard', this.speciesLeaderboard);
        this.populateLeaderboardList('overall-leaderboard', this.overallLeaderboard);
    }

    populateLeaderboardList(elementId, leaderboard) {
        const list = document.getElementById(elementId);
        if (!list) {
            console.error(`[FishWeighing] Could not find element with ID: ${elementId}`);
            return;
        }
        
        const entries = list.querySelectorAll('.leaderboard-entry');
        
        if (entries.length === 0) {
            console.error(`[FishWeighing] No .leaderboard-entry elements found in ${elementId}`);
            return;
        }
        
        entries.forEach((entry, index) => {
            const playerSpan = entry.querySelector('.player');
            const valueSpan = entry.querySelector('.value');
            
            if (!playerSpan || !valueSpan) {
                console.error(`[FishWeighing] Missing .player or .value span in entry ${index} of ${elementId}`);
                return;
            }
            
            if (index < leaderboard.length) {
                const record = leaderboard[index];
                playerSpan.textContent = record.playerName || '---';
                valueSpan.textContent = `$${record.value?.toLocaleString() || 0}`;
            } else {
                playerSpan.textContent = '---';
                valueSpan.textContent = '$0';
            }
        });
    }

    startScaleAnimation() {
        const weightValueElement = document.getElementById('weight-value');
        const fishValueElement = document.getElementById('fish-value');
        
        weightValueElement.textContent = '0.00';
        this.isAnimating = true;
        
        // Phase 1: Fast tick up to ~80% of final weight
        const targetPhase1 = this.finalWeight * 0.8;
        const tickUpDuration = 2000; // 2 seconds
        const tickUpInterval = 50; // Update every 50ms
        const tickUpSteps = tickUpDuration / tickUpInterval;
        const tickUpIncrement = targetPhase1 / tickUpSteps;
        
        let currentStep = 0;
        
        const tickUpAnimation = setInterval(() => {
            currentStep++;
            this.currentDisplayWeight = Math.min(currentStep * tickUpIncrement, targetPhase1);
            
            weightValueElement.textContent = this.currentDisplayWeight.toFixed(2);
            
            // Calculate and show value based on weight and rarity
            const currentValue = this.calculateFishValue(this.currentDisplayWeight);
            fishValueElement.textContent = `$${currentValue.toLocaleString()}`;
            
            if (currentStep >= tickUpSteps) {
                clearInterval(tickUpAnimation);
                this.startHoveringPhase();
            }
        }, tickUpInterval);
    }

    startHoveringPhase() {
        const weightValueElement = document.getElementById('weight-value');
        const fishValueElement = document.getElementById('fish-value');
        
        weightValueElement.classList.add('weight-hovering');
        
        // Phase 2: Hover between 80% and 120% of final weight for 2 seconds
        const hoverDuration = 2000;
        const hoverInterval = 100;
        const hoverSteps = hoverDuration / hoverInterval;
        const baseWeight = this.finalWeight * 0.8;
        const hoverRange = this.finalWeight * 0.4; // 40% range
        
        let hoverStep = 0;
        
        const hoverAnimation = setInterval(() => {
            hoverStep++;
            
            // Sine wave for smooth hovering
            const hoverOffset = Math.sin((hoverStep / hoverSteps) * Math.PI * 4) * (hoverRange / 2);
            this.currentDisplayWeight = this.finalWeight + hoverOffset;
            
            weightValueElement.textContent = this.currentDisplayWeight.toFixed(2);
            
            const currentValue = this.calculateFishValue(this.currentDisplayWeight);
            fishValueElement.textContent = `$${currentValue.toLocaleString()}`;
            
            if (hoverStep >= hoverSteps) {
                clearInterval(hoverAnimation);
                this.settleOnFinalWeight();
            }
        }, hoverInterval);
    }

    settleOnFinalWeight() {
        const weightValueElement = document.getElementById('weight-value');
        const fishValueElement = document.getElementById('fish-value');
        
        weightValueElement.classList.remove('weight-hovering');
        
        // Phase 3: Settle to final weight
        this.currentDisplayWeight = this.finalWeight;
        weightValueElement.textContent = this.finalWeight.toFixed(2);
        
        const finalValue = this.calculateFishValue(this.finalWeight);
        fishValueElement.textContent = `$${finalValue.toLocaleString()}`;
        
        this.isAnimating = false;
        
        // Check for records and show results
        setTimeout(() => {
            this.checkForRecords(finalValue);
        }, 1000);
    }

    calculateFishValue(weight) {
        // Use the same calculation as server-side for consistency
        const rarityMultipliers = {
            'common': 1.0,
            'uncommon': 1.5,
            'rare': 2.0,
            'epic': 3.0,
            'legendary': 5.0,
            'mythic': 6.0
        };
        
        const rarity = this.currentFish.rarity || 'common';
        const multiplier = rarityMultipliers[rarity] || 1.0;
        
        // Use the proper baseValue and minWeight from fish data if available
        const baseValue = this.currentFish.baseValue || 10;
        const minWeight = this.currentFish.minWeight || 1;
        
        // Use the same formula as FishSpawnManager: Math.floor(baseValue * (weight / minWeight) * multiplier)
        return Math.floor(baseValue * (weight / minWeight) * multiplier);
    }

    checkForRecords(fishValue) {
        const resultElement = document.getElementById('result-text');
        const celebrationElement = document.getElementById('celebration-area');
        const wheelButtonArea = document.getElementById('wheel-button-area');
        
        // Check if this fish beats any records
        const speciesRecord = this.checkSpeciesRecord(fishValue);
        const overallRecord = this.checkOverallRecord(fishValue);
        
        if (overallRecord.isRecord || speciesRecord.isRecord) {
            // RECORD STATE: Show compact congratulations and wheel button
            this.showRecordState(overallRecord, speciesRecord, fishValue, wheelButtonArea);
        } else {
            // NO RECORD STATE: Show detailed results and auto-close
            this.showNoRecordState(fishValue, resultElement, celebrationElement);
        }
    }

    showRecordState(overallRecord, speciesRecord, fishValue, wheelButtonArea) {
        const resultElement = document.getElementById('result-text');
        const celebrationElement = document.getElementById('celebration-area');
        
        // Hide leaderboards to make more space for the important stuff
        const leftPanel = document.querySelector('.weighing-left-panel');
        const rightPanel = document.querySelector('.weighing-right-panel');
        if (leftPanel) leftPanel.style.display = 'none';
        if (rightPanel) rightPanel.style.display = 'none';
        
        // Adjust center panel to take full width
        const centerPanel = document.querySelector('.weighing-center-panel');
        if (centerPanel) {
            centerPanel.style.gridColumn = '1 / -1';
            centerPanel.style.maxWidth = '400px';
            centerPanel.style.margin = '0 auto';
        }
        
        let recordType = '';
        let celebration = '';
        
        if (overallRecord.isRecord) {
            const position = this.getOrdinalNumber(overallRecord.position);
            recordType = `🏆 ${position} Overall! 🏆`;
            celebration = '🎉✨🏆✨🎉';
            document.querySelector('.weight-value-display').classList.add('record-glow');
        } else if (speciesRecord.isRecord) {
            const position = this.getOrdinalNumber(speciesRecord.position);
            recordType = `🥇 ${position} in Species! 🥇`;
            celebration = '🎊🥇🥇🌟🎊';
        }
        
        // Show compact record message
        resultElement.innerHTML = `
            <div style="font-size: 15px; font-weight: 700; color: #ffd700; margin-bottom: 8px;">
                ${recordType}
            </div>
            <div style="font-size: 12px; color: #fff;">
                ${this.currentFish.name} • ${this.finalWeight.toFixed(2)} lbs • $${fishValue.toLocaleString()}
            </div>
        `;
        
        celebrationElement.innerHTML = celebration;
        if (celebration) {
            celebrationElement.classList.add('celebration-confetti');
        }
        
        // Show wheel button immediately in this compact layout
        wheelButtonArea.style.display = 'flex';
        
        // Add click handler for wheel spin button
        const wheelButton = document.getElementById('wheel-spin-button');
        if (wheelButton) {
            // Remove any existing listeners
            const newButton = wheelButton.cloneNode(true);
            wheelButton.parentNode.replaceChild(newButton, wheelButton);
            
            // Store fish data for the button click handler
            const fishData = {
                name: this.currentFish.name,
                rarity: this.currentFish.rarity,
                weight: this.finalWeight
            };
            
            newButton.addEventListener('click', () => {
                this.triggerWheelSpin(fishValue, fishData);
            });
        }
    }

    showNoRecordState(fishValue, resultElement, celebrationElement) {
        // Keep leaderboards visible for context
        const leftPanel = document.querySelector('.weighing-left-panel');
        const rightPanel = document.querySelector('.weighing-right-panel');
        if (leftPanel) leftPanel.style.display = 'block';
        if (rightPanel) rightPanel.style.display = 'block';
        
        // Reset center panel grid
        const centerPanel = document.querySelector('.weighing-center-panel');
        if (centerPanel) {
            centerPanel.style.gridColumn = '';
            centerPanel.style.maxWidth = '';
            centerPanel.style.margin = '';
        }
        
        // Show detailed no-record message
        const resultText = `Your ${this.currentFish.name} weighs ${this.finalWeight.toFixed(2)} lbs and is worth $${fishValue.toLocaleString()}.\n\nNot quite leaderboard material this time, but keep fishing!`;
        
        resultElement.innerHTML = resultText.replace(/\n/g, '<br>');
        celebrationElement.innerHTML = '';
        
        // Auto-close after delay
        setTimeout(() => {
            this.close();
            if (this.onComplete) {
                this.onComplete({
                    isRecord: false,
                    fishValue: fishValue,
                    weight: this.finalWeight
                });
            }
        }, 4000);
    }

    checkSpeciesRecord(fishValue) {
        // Find where this fish would rank in species leaderboard
        for (let i = 0; i < this.speciesLeaderboard.length; i++) {
            if (fishValue > this.speciesLeaderboard[i].value) {
                return { isRecord: true, position: i + 1 };
            }
        }
        
        // If leaderboard isn't full (less than 3 entries), it's still a record
        if (this.speciesLeaderboard.length < 3) {
            return { isRecord: true, position: this.speciesLeaderboard.length + 1 };
        }
        
        return { isRecord: false, position: -1 };
    }

    checkOverallRecord(fishValue) {
        // Find where this fish would rank in overall leaderboard
        for (let i = 0; i < this.overallLeaderboard.length; i++) {
            if (fishValue > this.overallLeaderboard[i].value) {
                return { isRecord: true, position: i + 1 };
            }
        }
        
        // If leaderboard isn't full (less than 3 entries), it's still a record
        if (this.overallLeaderboard.length < 3) {
            return { isRecord: true, position: this.overallLeaderboard.length + 1 };
        }
        
        return { isRecord: false, position: -1 };
    }

    triggerWheelSpin(fishValue, fishData) {
        // Check if we have a valid player ID
        if (!this.playerId) {
            console.error('[FishWeighing] Cannot trigger wheel spin: No player ID available');
            return;
        }
        
        // Hide the weighing panel
        this.close();
        
        // Send message to server to trigger wheel spin
        hytopia.sendData({
            type: 'triggerWheelSpin',
            playerId: this.playerId,
            fishValue: fishValue,
            weight: fishData.weight,
            fishName: fishData.name,
            fishRarity: fishData.rarity
        });
        
        // Complete the weighing process
        if (this.onComplete) {
            this.onComplete({
                isRecord: true,
                fishValue: fishValue,
                weight: fishData.weight,
                triggeredWheelSpin: true
            });
        }
    }

    close() {
        const overlay = document.getElementById('fish-weighing-overlay');
        overlay.style.display = 'none';
        
        // Re-enable player input
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();
        
        // Reset state
        this.currentFish = null;
        this.currentDisplayWeight = 0;
        this.finalWeight = 0;
        this.isAnimating = false;
        this.onComplete = null;
        
        // Clear any animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Reset visual effects
        document.querySelector('.weight-value-display')?.classList.remove('record-glow');
        document.getElementById('weight-value')?.classList.remove('weight-hovering');
        document.getElementById('celebration-area')?.classList.remove('celebration-confetti');
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'fish-weighing-chat-style';
            this.styleElement.textContent = `#chat-window { display: none !important; }`;
            document.head.appendChild(this.styleElement);
        }
    }

    removeHideChatStyle() {
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
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
                return src.substring(0, src.indexOf('/ui/panels/'));
            }
        }
        
        return window.location.origin;
    }

    getOrdinalNumber(number) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = number % 100;
        return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }
}

// Make it globally available
window.FishWeighingPanel = new FishWeighingPanel();