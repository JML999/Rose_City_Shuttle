class TileMemoryPanel {
    constructor() {
        this.panel = null;
        this.isActive = false;
        this.currentRound = 0;
        this.totalRounds = 3;
        this.correctPattern = [];
        this.selectedTiles = [];
        this.gamePhase = 'instructions'; // 'instructions', 'study', 'selection', 'complete'
        this.studyTimer = 0;
        this.selectionTimer = 0;
        this.studyInterval = null;
        this.selectionInterval = null;
        this.keyImageType = null; // 'insect', 'fish', 'predator'
        this.roundConfig = {
            1: { imageType: 'insect', rows: 2, cols: 2, tiles: 2, studyTime: 6, selectionTime: 10 },
            2: { imageType: 'fish', rows: 3, cols: 3, tiles: 3, studyTime: 5, selectionTime: 8 },
            3: { imageType: 'predator', rows: 3, cols: 4, tiles: 4, studyTime: 4, selectionTime: 6 }
        };
    }
    
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        this.addStyles();
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'tile-memory-panel';
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);
    }
    
    setupEventListeners() {
        hytopia.onData((data) => {
            if (data.type === 'startTileMemory') {
                this.startGame();
            }
        });
    }
    
    startGame() {
        this.currentRound = 1;
        this.isActive = true;
        this.gamePhase = 'instructions';
        this.selectedTiles = [];
        
        console.log(`[TileMemory] Starting game`);
        
        this.render();
    }
    
    render() {
        if (this.gamePhase === 'instructions') {
            this.renderInstructions();
        } else if (this.gamePhase === 'study' || this.gamePhase === 'selection') {
            this.renderGame();
        }
        
        this.panel.style.display = 'flex';
        hytopia.sendData({ type: 'disablePlayerInput' });
    }
    
    renderInstructions() {
        this.panel.innerHTML = `
            <div class="tile-memory-content">
                <div class="tile-memory-header">
                    <h2>Keystone Memory Test</h2>
                </div>
                
                <div class="instructions-container">
                    <div class="instruction-text">
                        <p>Three rounds await you.</p>
                        <p>Study the key image and remember which tiles show it.</p>
                        <p>When the tiles flip, click all tiles that match the key image.</p>
                        <p>Complete all three rounds to succeed.</p>
                    </div>
                    
                    <button class="ready-button" id="tile-memory-ready">Ready</button>
                </div>
            </div>
        `;
        
        const readyBtn = document.getElementById('tile-memory-ready');
        if (readyBtn) {
            readyBtn.addEventListener('click', () => this.startRound());
            if (hytopia.isMobile) {
                readyBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.startRound();
                });
            }
        }
    }
    
    startRound() {
        const config = this.roundConfig[this.currentRound];
        if (!config) {
            console.error(`[TileMemory] Invalid round ${this.currentRound}, cannot start round`);
            this.completeGame(false);
            return;
        }
        
        // Clear any existing intervals before starting new round
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
            this.studyInterval = null;
        }
        if (this.selectionInterval) {
            clearInterval(this.selectionInterval);
            this.selectionInterval = null;
        }
        
        this.keyImageType = config.imageType;
        this.correctPattern = this.generatePattern(config.tiles, config.rows, config.cols);
        this.selectedTiles = [];
        this.gamePhase = 'study';
        
        console.log(`[TileMemory] Starting round ${this.currentRound}, grid: ${config.rows}x${config.cols}, pattern: [${this.correctPattern.join(', ')}]`);
        
        this.render();
        this.startStudyPhase();
    }
    
    generatePattern(tileCount, rows, cols) {
        // Generate all positions for the grid (rows x cols)
        const totalTiles = rows * cols;
        if (tileCount > totalTiles) {
            console.warn(`[TileMemory] tileCount ${tileCount} exceeds totalTiles ${totalTiles}, using ${totalTiles}`);
            tileCount = totalTiles;
        }
        const allPositions = Array.from({ length: totalTiles }, (_, i) => i);
        const shuffled = [...allPositions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, tileCount);
        return selected.sort((a, b) => a - b);
    }
    
    renderGame() {
        const config = this.roundConfig[this.currentRound];
        const baseUrl = this.getAssetBaseUrl();
        
        // Determine sprite path based on image type
        let spritePath = '';
        if (this.keyImageType === 'insect') {
            spritePath = `${baseUrl}/ui/icons/pressure-block-insect.png`;
        } else if (this.keyImageType === 'fish') {
            spritePath = `${baseUrl}/ui/icons/pressure-block-fish.png`;
        } else if (this.keyImageType === 'predator') {
            spritePath = `${baseUrl}/ui/icons/pressure-plate-shark.png`;
        }
        
        // Fallback if baseUrl doesn't work - try relative path
        if (!spritePath || spritePath.includes('undefined')) {
            const relativeBase = window.location.origin;
            if (this.keyImageType === 'insect') {
                spritePath = `${relativeBase}/ui/icons/pressure-block-insect.png`;
            } else if (this.keyImageType === 'fish') {
                spritePath = `${relativeBase}/ui/icons/pressure-block-fish.png`;
            } else if (this.keyImageType === 'predator') {
                spritePath = `${relativeBase}/ui/icons/pressure-plate-shark.png`;
            }
        }
        
        const isStudyPhase = this.gamePhase === 'study';
        const instructionText = isStudyPhase 
            ? 'Study the pattern. Remember the positions.'
            : 'Select all tiles that match the key image.';
        
        // Reset opacity for new round (in case we're transitioning)
        const resetOpacity = this.gamePhase === 'transitioning' ? 'opacity: 1; transition: opacity 0.3s;' : '';
        
        this.panel.innerHTML = `
            <div class="tile-memory-content">
                <div class="tile-memory-header">
                    <div class="key-image-container">
                        ${isStudyPhase ? `<img src="${spritePath}" class="key-image" style="${resetOpacity}" />` : ''}
                    </div>
                    <div class="timer-display" id="tile-memory-timer" style="${resetOpacity}">
                        ${isStudyPhase ? this.studyTimer : this.selectionTimer}
                    </div>
                </div>
                
                <div class="tile-memory-body">
                    <div class="instruction-label" id="instruction-text" style="${resetOpacity}">
                        ${instructionText}
                    </div>
                    
                    <div class="grid-container">
                        <div class="tile-grid" id="tile-grid" style="grid-template-columns: repeat(${config.cols}, 1fr); grid-template-rows: repeat(${config.rows}, 1fr);">
                            ${Array.from({ length: config.rows * config.cols }, (_, i) => i).map(i => {
                                const isCorrect = this.correctPattern.includes(i);
                                const isSelected = this.selectedTiles.includes(i);
                                
                                // In study phase, show images on ALL tiles
                                // Correct tiles show key image, others show other key images
                                // In selection phase, show blank/flipped tiles
                                let tileContent = '';
                                let tileClass = 'grid-tile';
                                
                                if (isStudyPhase) {
                                    let tileSpritePath = spritePath;
                                    if (isCorrect) {
                                        // Correct tile - show key image
                                        tileSpritePath = spritePath;
                                    } else {
                                        // Incorrect tile - show one of the OTHER key images
                                        const otherImages = this.getOtherKeyImages(this.keyImageType, baseUrl);
                                        // Distribute other images across incorrect tiles
                                        const incorrectIndex = this.correctPattern.filter(pos => pos < i).length;
                                        const otherImageIndex = (i - incorrectIndex) % otherImages.length;
                                        tileSpritePath = otherImages[otherImageIndex];
                                    }
                                    tileContent = `<img src="${tileSpritePath}" class="tile-sprite" />`;
                                } else {
                                    // Selection phase - tiles are flipped/blank
                                    tileClass += ' flipped';
                                    if (isSelected) {
                                        if (isCorrect) {
                                            tileClass += ' correct';
                                        } else {
                                            tileClass += ' incorrect';
                                        }
                                    }
                                }
                                
                                return `
                                    <div class="${tileClass}" data-tile-index="${i}" style="${resetOpacity}">
                                        ${tileContent}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers for selection phase
        if (!isStudyPhase) {
            const gridTiles = this.panel.querySelectorAll('.grid-tile');
            gridTiles.forEach(tile => {
                let isProcessing = false;
                
                const handleClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (isProcessing || this.gamePhase !== 'selection') return;
                    if (tile.style.pointerEvents === 'none') return;
                    
                    isProcessing = true;
                    const tileIndex = parseInt(tile.dataset.tileIndex);
                    this.handleTileClick(tileIndex, tile);
                    
                    setTimeout(() => {
                        isProcessing = false;
                    }, 300);
                };
                
                tile.addEventListener('click', handleClick);
                if (hytopia.isMobile) {
                    tile.addEventListener('touchend', handleClick);
                }
            });
        }
    }
    
    startStudyPhase() {
        const config = this.roundConfig[this.currentRound];
        if (!config) {
            console.error(`[TileMemory] Invalid round ${this.currentRound}, ending game`);
            this.completeGame(false);
            return;
        }
        
        this.studyTimer = config.studyTime;
        
        // Clear any existing interval
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
        }
        
        this.studyInterval = setInterval(() => {
            this.studyTimer--;
            this.updateTimerDisplay();
            
            if (this.studyTimer <= 0) {
                clearInterval(this.studyInterval);
                this.studyInterval = null;
                this.transitionToSelection();
            }
        }, 1000);
    }
    
    transitionToSelection() {
        const config = this.roundConfig[this.currentRound];
        if (!config) {
            console.error(`[TileMemory] Invalid round ${this.currentRound} in transition, ending game`);
            this.completeGame(false);
            return;
        }
        
        this.gamePhase = 'selection';
        this.selectionTimer = config.selectionTime;
        
        // Clear any existing interval
        if (this.selectionInterval) {
            clearInterval(this.selectionInterval);
        }
        
        // Fade out key image and flip tiles
        this.render();
        
        this.selectionInterval = setInterval(() => {
            this.selectionTimer--;
            this.updateTimerDisplay();
            
            if (this.selectionTimer <= 0) {
                clearInterval(this.selectionInterval);
                this.selectionInterval = null;
                this.handleTimeOut();
            }
        }, 1000);
    }
    
    handleTileClick(tileIndex, tileElement) {
        if (this.selectedTiles.includes(tileIndex)) {
            return; // Already selected
        }
        
        const isCorrect = this.correctPattern.includes(tileIndex);
        this.selectedTiles.push(tileIndex);
        
        if (isCorrect) {
            // Correct selection
            tileElement.classList.add('correct');
            tileElement.style.pointerEvents = 'none';
            
            // Check if all correct tiles are selected
            const allCorrectSelected = this.correctPattern.every(pos => 
                this.selectedTiles.includes(pos)
            );
            
            if (allCorrectSelected) {
                // Round complete! Don't re-render yet - let completeRound handle the transition
                clearInterval(this.selectionInterval);
                this.completeRound();
                return; // Exit early, don't re-render
            }
        } else {
            // Incorrect selection
            tileElement.classList.add('incorrect');
            
            // Game over
            setTimeout(() => {
                this.completeGame(false);
            }, 500);
        }
        
        // Re-render to update visual state (only if round not complete)
        this.render();
    }
    
    completeRound() {
        console.log(`[TileMemory] Round ${this.currentRound} complete!`);
        
        // Clear intervals to prevent race conditions
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
            this.studyInterval = null;
        }
        if (this.selectionInterval) {
            clearInterval(this.selectionInterval);
            this.selectionInterval = null;
        }
        
        // Disable input during transition
        this.gamePhase = 'transitioning';
        
        if (this.currentRound < this.totalRounds) {
            // Step 1: Quick cooldown to show success (500ms)
            setTimeout(() => {
                // Step 2: Clear tiles (fade out)
                this.clearTiles();
                
                // Step 3: Wait for tiles to clear, then resize and start next round
                setTimeout(() => {
                    this.currentRound++;
                    // Validate round before starting
                    if (this.currentRound > this.totalRounds) {
                        console.error(`[TileMemory] Round ${this.currentRound} exceeds total rounds ${this.totalRounds}, completing game`);
                        this.completeGame(true);
                        return;
                    }
                    // Reset game phase before starting next round
                    this.gamePhase = 'study';
                    this.startRound();
                }, 500); // Wait for clear animation
            }, 500); // Initial cooldown
        } else {
            // All rounds complete!
            setTimeout(() => {
                this.completeGame(true);
            }, 500);
        }
    }
    
    clearTiles() {
        // Fade out all tiles
        const gridTiles = this.panel.querySelectorAll('.grid-tile');
        gridTiles.forEach(tile => {
            tile.style.opacity = '0';
            tile.style.transition = 'opacity 0.3s';
        });
        
        // Also fade out instruction and timer
        const instructionEl = document.getElementById('instruction-text');
        if (instructionEl) {
            instructionEl.style.opacity = '0';
            instructionEl.style.transition = 'opacity 0.3s';
        }
        
        const timerEl = document.getElementById('tile-memory-timer');
        if (timerEl) {
            timerEl.style.opacity = '0';
            timerEl.style.transition = 'opacity 0.3s';
        }
        
        const keyImageEl = this.panel.querySelector('.key-image');
        if (keyImageEl) {
            keyImageEl.style.opacity = '0';
            keyImageEl.style.transition = 'opacity 0.3s';
        }
    }
    
    handleTimeOut() {
        console.log(`[TileMemory] Time out on round ${this.currentRound}`);
        // Clear intervals before completing
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
            this.studyInterval = null;
        }
        if (this.selectionInterval) {
            clearInterval(this.selectionInterval);
            this.selectionInterval = null;
        }
        this.completeGame(false);
    }
    
    completeGame(success) {
        // Prevent multiple calls to completeGame
        if (!this.isActive) {
            console.log(`[TileMemory] completeGame called but game already inactive, ignoring`);
            return;
        }
        
        this.isActive = false;
        
        // Clear all intervals
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
            this.studyInterval = null;
        }
        if (this.selectionInterval) {
            clearInterval(this.selectionInterval);
            this.selectionInterval = null;
        }
        
        // Calculate rounds completed safely
        let roundsCompleted = 0;
        if (success) {
            roundsCompleted = this.totalRounds;
        } else {
            // If currentRound is valid (1-3), use it. Otherwise use 0.
            if (this.currentRound >= 1 && this.currentRound <= this.totalRounds) {
                roundsCompleted = this.currentRound - 1; // Rounds completed before the failed one
            } else {
                roundsCompleted = 0; // Invalid state, default to 0
            }
        }
        
        console.log(`[TileMemory] Completing game - success: ${success}, roundsCompleted: ${roundsCompleted}, currentRound: ${this.currentRound}`);
        
        setTimeout(() => {
            hytopia.sendData({
                type: 'tileMemoryResult',
                success: success,
                roundsCompleted: roundsCompleted
            });
            this.hide();
        }, success ? 500 : 1000);
    }
    
    updateTimerDisplay() {
        const timerEl = document.getElementById('tile-memory-timer');
        if (timerEl) {
            const time = this.gamePhase === 'study' ? this.studyTimer : this.selectionTimer;
            timerEl.textContent = time;
            
            // Update color based on time
            timerEl.className = 'timer-display';
            if (time <= 1) {
                timerEl.classList.add('critical');
            } else if (time <= 3) {
                timerEl.classList.add('warning');
            }
        }
    }
    
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isActive = false;
            this.currentRound = 0;
            this.selectedTiles = [];
            this.gamePhase = 'instructions';
            clearInterval(this.studyInterval);
            clearInterval(this.selectionInterval);
            
            hytopia.sendData({ type: 'enablePlayerInput' });
        }
    }
    
    getOtherKeyImages(currentImageType, baseUrl) {
        // Return array of sprite paths for the OTHER key images (not the current one)
        const allImages = [
            { type: 'insect', path: `${baseUrl}/ui/icons/pressure-block-insect.png` },
            { type: 'fish', path: `${baseUrl}/ui/icons/pressure-block-fish.png` },
            { type: 'predator', path: `${baseUrl}/ui/icons/pressure-plate-shark.png` }
        ];
        
        // Filter out the current image type
        return allImages
            .filter(img => img.type !== currentImageType)
            .map(img => img.path);
    }
    
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
                if (baseUrl) {
                    return baseUrl;
                }
            }
        }
        
        // Last resort fallback
        return window.location.origin;
    }
    
    addStyles() {
        if (document.getElementById('tile-memory-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'tile-memory-styles';
        style.textContent = `
            #tile-memory-panel {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
            }
            
            .tile-memory-content {
                width: 95%;
                max-width: 600px;
                background-color: #1a2332;
                border: 3px solid #4a6491;
                border-radius: 4px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                overflow: hidden;
            }
            
            .tile-memory-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: #2c3e50;
                border-bottom: 2px solid #4a6491;
                height: 70px;
                box-sizing: border-box;
            }
            
            .tile-memory-header h2 {
                margin: 0;
                color: #85c1e9;
                font-size: 16px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .key-image-container {
                display: flex;
                align-items: center;
            }
            
            .key-image {
                width: 48px;
                height: 48px;
                image-rendering: pixelated;
            }
            
            .timer-display {
                font-size: 20px;
                font-weight: bold;
                color: #85c1e9;
                transition: color 0.3s;
            }
            
            .timer-display.warning {
                color: #f39c12;
                animation: pulse 1s infinite;
            }
            
            .timer-display.critical {
                color: #e74c3c;
                animation: pulse 0.5s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .instructions-container {
                padding: 40px 20px;
                text-align: center;
                display: flex;
                flex-direction: column;
                gap: 30px;
            }
            
            .instruction-text {
                color: #85c1e9;
                font-size: 18px;
                line-height: 1.6;
            }
            
            .instruction-text p {
                margin: 10px 0;
            }
            
            .ready-button {
                padding: 15px 40px;
                background: #4a90e2;
                border: 2px solid #85c1e9;
                border-radius: 8px;
                color: white;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .ready-button:hover,
            .ready-button:active {
                background: #357abd;
                transform: scale(1.05);
            }
            
            .tile-memory-body {
                padding: 10px 15px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .instruction-label {
                text-align: center;
                padding: 5px 10px;
                font-size: 14px;
                color: #85c1e9;
                font-weight: 600;
            }
            
            .grid-container {
                width: 100%;
                display: flex;
                justify-content: center;
                padding: 5px;
            }
            
            .tile-grid {
                display: grid;
                gap: 0;
                width: fit-content;
                margin: 0 auto;
                transition: grid-template-columns 0.5s ease-in-out, grid-template-rows 0.5s ease-in-out;
            }
            
            .grid-tile {
                width: 50px;
                height: 50px;
                background-color: rgba(40, 50, 65, 0.7);
                border: 1px solid #3a4a5c;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
            }
            
            .grid-tile.flipped {
                background-color: rgba(30, 40, 55, 0.8);
            }
            
            .grid-tile:active {
                transform: scale(0.95);
            }
            
            .tile-sprite {
                width: 100%;
                height: 100%;
                object-fit: contain;
                image-rendering: pixelated;
            }
            
            .grid-tile.correct {
                background-color: rgba(46, 204, 113, 0.6);
                border: 3px solid #2ecc71;
                box-shadow: 0 0 20px rgba(46, 204, 113, 0.8);
            }
            
            .grid-tile.incorrect {
                background-color: rgba(231, 76, 60, 0.6);
                border: 3px solid #e74c3c;
                box-shadow: 0 0 20px rgba(231, 76, 60, 0.8);
                animation: shake 0.3s;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
            
            /* Mobile optimizations - match InventoryPanel grid style */
            @media (max-width: 768px) {
                .tile-memory-content {
                    width: 95%;
                    max-width: 100%;
                    max-height: 95vh;
                }
                
                .tile-memory-header {
                    padding: 8px 10px;
                    height: 60px;
                }
                
                .tile-memory-header h2 {
                    font-size: 14px;
                }
                
                .key-image {
                    width: 40px;
                    height: 40px;
                }
                
                .timer-display {
                    font-size: 18px;
                }
                
                .tile-memory-body {
                    padding: 8px 10px;
                    gap: 5px;
                }
                
                .instruction-label {
                    padding: 4px 8px;
                    font-size: 12px;
                }
                
                .grid-container {
                    padding: 5px;
                }
                
                .tile-grid {
                    gap: 0;
                    width: fit-content;
                }
                
                .grid-tile {
                    width: 40px;
                    height: 40px;
                    border: 1px solid #3a4a5c;
                    border-radius: 3px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize panel
window.TileMemoryPanel = new TileMemoryPanel();
window.TileMemoryPanel.initialize();

