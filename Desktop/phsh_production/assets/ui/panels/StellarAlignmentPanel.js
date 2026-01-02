class StellarAlignmentPanel {
    constructor() {
        this.panel = null;
        this.isActive = false;
        this.correctPattern = [];
        this.playerSequence = [];
        this.currentStep = 0;
        this.gridPatterns = {};
        this.questId = null;
        this.isDisplayingPattern = false;
        this.isInputEnabled = false;
        this.gamePhase = 'initial'; // 'initial', 'showing_message', 'displaying_pattern', 'pattern_complete', 'grid_ready'
        
        // Pattern designs (CSS classes) - 6 unique constellation patterns
        this.patternDesigns = ['pattern-triangle', 'pattern-square', 'pattern-cross', 'pattern-line', 'pattern-two-dots', 'pattern-six-dots'];
    }
    
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        this.addStyles();
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'stellar-alignment-panel';
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);
    }
    
    setupEventListeners() {
        hytopia.onData((data) => {
            if (data.type === 'startStellarAlignment') {
                this.startGame(data.pattern, data.questId);
            }
        });
    }
    
    startGame(pattern, questId) {
        this.correctPattern = pattern; // [0, 2, 4, 5] for 6-tile grid
        this.playerSequence = [];
        this.currentStep = 0;
        this.questId = questId;
        this.isActive = true;
        this.isInputEnabled = false;
        this.gamePhase = 'initial';
        
        
        // Create 6 grid positions (2 rows x 3 columns)
        const allPositions = [0, 1, 2, 3, 4, 5];
        const fakePositions = allPositions.filter(p => !pattern.includes(p));
        
        // Assign patterns: correct positions get pattern designs matching the sequence
        this.gridPatterns = {};
        pattern.forEach((pos, index) => {
            this.gridPatterns[pos] = this.patternDesigns[index % this.patternDesigns.length];
            console.log(`[StellarAlignment] Grid position ${pos} gets pattern: ${this.patternDesigns[index % this.patternDesigns.length]} (step ${index})`);
        });
        
        // Assign unique patterns to fake positions (distractors) - ensure no duplicates
        const usedPatterns = new Set();
        pattern.forEach((pos, index) => {
            usedPatterns.add(this.patternDesigns[index % this.patternDesigns.length]);
        });
        
        // Get available patterns (not used in correct positions)
        const availablePatterns = this.patternDesigns.filter(p => !usedPatterns.has(p));
        
        // Assign unique patterns to fake positions
        fakePositions.forEach((pos, index) => {
            // Use available patterns first, then cycle through if needed
            const patternIndex = index % availablePatterns.length;
            this.gridPatterns[pos] = availablePatterns[patternIndex];
            console.log(`[StellarAlignment] Fake position ${pos} gets pattern: ${availablePatterns[patternIndex]}`);
        });
        
        this.render();
        this.startGameSequence();
    }
    
    startGameSequence() {
        // Phase 1: Initial state - Forrest's tiles blank, grid visible
        this.gamePhase = 'initial';
        const labelEl = document.getElementById('pattern-label');
        if (labelEl) {
            labelEl.textContent = "Remember Forrest's Pattern";
        }
        
        // Hide only Forrest's pattern tiles initially (grid stays visible)
        const patternTiles = this.panel.querySelectorAll('.pattern-tile .constellation-pattern');
        patternTiles.forEach(tile => tile.style.opacity = '0');
        
        // Grey out the grid section to focus attention on pattern
        const gridSection = this.panel.querySelector('.stellar-grid-section');
        if (gridSection) {
            gridSection.classList.add('disabled');
        }
        
        // Phase 2: Display pattern sequence after brief pause
        setTimeout(() => {
            this.gamePhase = 'showing_message';
            setTimeout(() => {
                this.displayPatternSequence();
            }, 500);
        }, 500);
    }
    
    render() {
        this.panel.innerHTML = `
            <div class="stellar-alignment-content">
                <div class="stellar-header">
                    <h2>Stellar Alignment</h2>
                    <button class="stellar-close-btn" id="stellar-close">×</button>
                </div>
                
                <div class="stellar-pattern-section">
                    <div class="pattern-label-container">
                        <div class="pattern-label" id="pattern-label">Remember Forrest's Pattern</div>
                    </div>
                    <div class="pattern-display-container">
                        <div class="pattern-display" id="pattern-display">
                            ${[0, 1, 2, 3].map(i => `
                                <div class="pattern-tile" data-pattern-index="${i}">
                                    <div class="constellation-pattern ${this.patternDesigns[i]}"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="stellar-divider"></div>
                
                <div class="stellar-grid-section">
                    <div class="grid-label">Select the pattern tiles:</div>
                    <div class="stellar-grid-container">
                        <div class="stellar-grid" id="stellar-grid">
                            ${[0, 1, 2, 3, 4, 5].map(i => `
                                <div class="grid-tile" data-tile-index="${i}">
                                    <div class="constellation-pattern ${this.gridPatterns[i] || ''}"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const closeBtn = document.getElementById('stellar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
            if (hytopia.isMobile) {
                closeBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.hide();
                });
            }
        }
        
        // Add grid tile click handlers (will be enabled later)
        const gridTiles = this.panel.querySelectorAll('.grid-tile');
        gridTiles.forEach(tile => {
            let isProcessing = false; // Prevent double-clicks
            
            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Prevent double-clicks/touches
                if (isProcessing || !this.isInputEnabled) return;
                
                // Check if tile is already disabled
                if (tile.style.pointerEvents === 'none') return;
                
                isProcessing = true;
                const tileIndex = parseInt(tile.dataset.tileIndex);
                this.handleTileClick(tileIndex);
                
                // Reset processing flag after a short delay
                setTimeout(() => {
                    isProcessing = false;
                }, 300);
            };
            
            tile.addEventListener('click', handleClick);
            if (hytopia.isMobile) {
                tile.addEventListener('touchend', handleClick);
            }
        });
        
        this.panel.style.display = 'flex';
        
        // Free mouse cursor on desktop (disable player input)
        hytopia.sendData({ type: 'disablePlayerInput' });
    }
    
    displayPatternSequence() {
        this.gamePhase = 'displaying_pattern';
        this.isDisplayingPattern = true;
        this.isInputEnabled = false;
        
        const patternTiles = this.panel.querySelectorAll('.pattern-tile');
        const labelEl = document.getElementById('pattern-label');
        
        // Initially hide all pattern tiles
        patternTiles.forEach(tile => {
            const pattern = tile.querySelector('.constellation-pattern');
            if (pattern) pattern.style.opacity = '0';
        });
        
        // Show each pattern tile sequentially (one at a time), but keep them visible
        this.correctPattern.forEach((tilePos, index) => {
            setTimeout(() => {
                const patternTile = patternTiles[index];
                if (patternTile) {
                    const pattern = patternTile.querySelector('.constellation-pattern');
                    if (pattern) {
                        // Show this pattern tile and keep it visible
                        pattern.style.opacity = '1';
                        patternTile.classList.add('active');
                    }
                }
            }, index * 1000); // 1 second between each
            
            // Dim after flash but keep visible
            setTimeout(() => {
                const patternTile = patternTiles[index];
                if (patternTile) {
                    patternTile.classList.remove('active');
                    // Keep pattern visible (don't hide it)
                }
            }, index * 1000 + 800); // Active glow for 0.8 seconds, then stays visible
        });
        
        // After pattern completes, hide pattern section and enable grid
        setTimeout(() => {
            this.gamePhase = 'pattern_complete';
            
            // Hide all pattern tiles (they were kept visible, now dismiss them all)
            patternTiles.forEach(tile => {
                const pattern = tile.querySelector('.constellation-pattern');
                if (pattern) pattern.style.opacity = '0';
            });
            
            // Hide the entire pattern display section
            const patternSection = this.panel.querySelector('.stellar-pattern-section');
            if (patternSection) {
                patternSection.style.display = 'none';
            }
            
            // Hide the divider
            const divider = this.panel.querySelector('.stellar-divider');
            if (divider) {
                divider.style.display = 'none';
            }
            
            // Update label text (move it to grid section)
            const gridLabel = this.panel.querySelector('.grid-label');
            if (gridLabel) {
                gridLabel.textContent = "Recount Forrest's pattern below";
            }
            
            // Remove grey out from grid section and re-enable
            const gridSection = this.panel.querySelector('.stellar-grid-section');
            if (gridSection) {
                gridSection.classList.remove('disabled');
            }
            
            // Enable input
            setTimeout(() => {
                this.gamePhase = 'grid_ready';
                this.isDisplayingPattern = false;
                this.isInputEnabled = true;
            }, 500);
        }, this.correctPattern.length * 1000 + 800 + 1000); // Extra 1 second pause after last tile dims
    }
    
    handleTileClick(tileIndex) {
        if (!this.isInputEnabled || this.playerSequence.length >= this.correctPattern.length) {
            return;
        }
        
        // Check if this tile was already selected
        if (this.playerSequence.includes(tileIndex)) {
            console.log(`[StellarAlignment] Tile ${tileIndex} already selected, ignoring click`);
            return;
        }
        
        const expectedTile = this.correctPattern[this.currentStep];
        const gridTile = this.panel.querySelector(`[data-tile-index="${tileIndex}"]`);
        
        // Check if tile is disabled
        if (gridTile && gridTile.style.pointerEvents === 'none') {
            console.log(`[StellarAlignment] Tile ${tileIndex} is disabled, ignoring click`);
            return;
        }
        
        // Debug logging
        console.log(`[StellarAlignment] Clicked tile ${tileIndex}, expected ${expectedTile}, step ${this.currentStep}, pattern: [${this.correctPattern.join(', ')}]`);
        console.log(`[StellarAlignment] Already selected: [${this.playerSequence.join(', ')}]`);
        
        if (tileIndex === expectedTile) {
            // Correct!
            this.playerSequence.push(tileIndex);
            this.currentStep++;
            
            // Visual feedback - green and disable this tile immediately
            gridTile.classList.add('correct');
            gridTile.classList.remove('incorrect');
            gridTile.style.pointerEvents = 'none'; // Prevent clicking this tile again
            gridTile.style.cursor = 'default'; // Change cursor to indicate disabled
            
            console.log(`[StellarAlignment] Correct! Step ${this.currentStep - 1} complete. Next expected: ${this.correctPattern[this.currentStep] || 'NONE'}`);
            
            // Check if complete
            if (this.playerSequence.length === this.correctPattern.length) {
                // All correct - complete game
                setTimeout(() => {
                    this.completeGame(true);
                }, 500);
            }
        } else {
            // Wrong!
            console.log(`[StellarAlignment] Wrong! Clicked ${tileIndex} but expected ${expectedTile} at step ${this.currentStep}`);
            gridTile.classList.add('incorrect');
            gridTile.classList.remove('correct');
            
            // Dismiss after showing red
            setTimeout(() => {
                this.completeGame(false);
            }, 500);
        }
    }
    
    completeGame(success) {
        this.isInputEnabled = false;
        
        if (success) {
            // Send success to server
            setTimeout(() => {
                hytopia.sendData({
                    type: 'stellarAlignmentResult',
                    success: true,
                    questId: this.questId
                });
                this.hide();
            }, 500);
        } else {
            // Shake animation
            const grid = document.getElementById('stellar-grid');
            if (grid) {
                grid.classList.add('shake');
                setTimeout(() => grid.classList.remove('shake'), 500);
            }
            
            // Send failure to server
            setTimeout(() => {
                hytopia.sendData({
                    type: 'stellarAlignmentResult',
                    success: false,
                    questId: this.questId
                });
                this.hide();
            }, 1000);
        }
    }
    
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isActive = false;
            this.playerSequence = [];
            this.currentStep = 0;
            this.isInputEnabled = false;
            this.gamePhase = 'initial';
            
            // Re-enable player input (lock mouse cursor back)
            hytopia.sendData({ type: 'enablePlayerInput' });
        }
    }
    
    addStyles() {
        if (document.getElementById('stellar-alignment-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'stellar-alignment-styles';
        style.textContent = `
            #stellar-alignment-panel {
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
            
            .stellar-alignment-content {
                width: 95%;
                max-width: 500px;
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
            
            .stellar-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #2c3e50;
                border-bottom: 2px solid #4a6491;
            }
            
            .stellar-header h2 {
                margin: 0;
                color: #85c1e9;
                font-size: 20px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .stellar-close-btn {
                background: transparent;
                border: none;
                color: #85c1e9;
                font-size: 28px;
                width: 35px;
                height: 35px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                padding: 0;
                font-weight: bold;
            }
            
            .stellar-close-btn:hover,
            .stellar-close-btn:active {
                color: #e74c3c;
                transform: scale(1.1);
            }
            
            .stellar-pattern-section {
                padding: 20px;
                text-align: center;
            }
            
            .pattern-label-container {
                margin-bottom: 15px;
                padding: 15px 20px;
                background-color: rgba(26, 35, 50, 0.8);
                border: 2px solid #3a4a5c;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .pattern-label {
                color: #85c1e9;
                font-size: 16px;
                font-weight: 700;
                margin: 0;
                text-transform: uppercase;
            }
            
            .pattern-display-container {
                width: 100%;
                max-width: 100%;
                overflow: hidden;
                display: flex;
                justify-content: center;
            }
            
            .pattern-display {
                display: flex;
                justify-content: center;
                gap: 10px;
                flex-wrap: nowrap;
                max-width: 100%;
            }
            
            .pattern-tile {
                width: 70px;
                height: 70px;
                min-width: 70px;
                flex-shrink: 0;
                background-color: rgba(26, 35, 50, 0.7);
                border: 2px solid #3a4a5c;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            
            .pattern-tile.active {
                background-color: rgba(74, 144, 226, 0.5);
                border: 2px solid #4a90e2;
                box-shadow: 0 0 20px rgba(74, 144, 226, 0.8);
            }
            
            .stellar-divider {
                height: 2px;
                background: #4a6491;
                margin: 15px 20px;
            }
            
            .stellar-grid-section {
                padding: 20px;
                text-align: center;
                transition: opacity 0.3s, filter 0.3s;
            }
            
            .stellar-grid-section.disabled {
                opacity: 0.3;
                filter: grayscale(100%);
                pointer-events: none;
            }
            
            .grid-label {
                color: #85c1e9;
                font-size: 16px;
                font-weight: 700;
                margin-bottom: 15px;
                text-transform: uppercase;
            }
            
            .stellar-grid-container {
                width: 100%;
                max-width: 100%;
                overflow: hidden;
                display: flex;
                justify-content: center;
            }
            
            .stellar-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(2, 1fr);
                gap: 12px;
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
            }
            
            .grid-tile {
                width: 100%;
                aspect-ratio: 1;
                max-width: 90px;
                max-height: 90px;
                background-color: rgba(40, 50, 65, 0.7);
                border: 2px solid #3a4a5c;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }
            
            .grid-tile:active {
                transform: scale(0.95);
            }
            
            .grid-tile.pattern-highlight {
                background-color: rgba(74, 144, 226, 0.4);
                border: 2px solid #4a90e2;
                box-shadow: 0 0 15px rgba(74, 144, 226, 0.6);
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
            
            .stellar-grid.shake {
                animation: shake 0.5s;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
            
            /* Constellation Pattern Styles - Dots Only, No Lines */
            .constellation-pattern {
                width: 100%;
                height: 100%;
                position: relative;
                transition: opacity 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            /* Pattern A: Triangle (3 dots) - Smaller, centered */
            .pattern-triangle::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    12px 15px 0 0 #85c1e9,
                    -12px 15px 0 0 #85c1e9;
            }
            
            .pattern-triangle.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    12px 15px 0 0 #4a90e2,
                    -12px 15px 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    12px 15px 0 0 rgba(74, 144, 226, 0.8),
                    -12px 15px 0 0 rgba(74, 144, 226, 0.8);
            }
            
            /* Pattern B: Square (4 dots) - Smaller, centered */
            .pattern-square::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    15px 0 0 0 #85c1e9,
                    15px 15px 0 0 #85c1e9,
                    0 15px 0 0 #85c1e9;
            }
            
            .pattern-square.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    15px 0 0 0 #4a90e2,
                    15px 15px 0 0 #4a90e2,
                    0 15px 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    15px 0 0 0 rgba(74, 144, 226, 0.8),
                    15px 15px 0 0 rgba(74, 144, 226, 0.8),
                    0 15px 0 0 rgba(74, 144, 226, 0.8);
            }
            
            /* Pattern C: Cross/Plus (5 dots) - Smaller, centered */
            .pattern-cross::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    -12px 0 0 0 #85c1e9,
                    12px 0 0 0 #85c1e9,
                    0 -12px 0 0 #85c1e9,
                    0 12px 0 0 #85c1e9;
            }
            
            .pattern-cross.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px 0 0 0 #4a90e2,
                    12px 0 0 0 #4a90e2,
                    0 -12px 0 0 #4a90e2,
                    0 12px 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px 0 0 0 rgba(74, 144, 226, 0.8),
                    12px 0 0 0 rgba(74, 144, 226, 0.8),
                    0 -12px 0 0 rgba(74, 144, 226, 0.8),
                    0 12px 0 0 rgba(74, 144, 226, 0.8);
            }
            
            /* Pattern D: Line (3 dots horizontal) - Smaller, centered */
            .pattern-line::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    -12px 0 0 0 #85c1e9,
                    12px 0 0 0 #85c1e9;
            }
            
            .pattern-line.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px 0 0 0 #4a90e2,
                    12px 0 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px 0 0 0 rgba(74, 144, 226, 0.8),
                    12px 0 0 0 rgba(74, 144, 226, 0.8);
            }
            
            /* Pattern E: Two Dots (vertical) */
            .pattern-two-dots::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    0 20px 0 0 #85c1e9;
            }
            
            .pattern-two-dots.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    0 20px 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    0 20px 0 0 rgba(74, 144, 226, 0.8);
            }
            
            /* Pattern F: Six Dots (2 lines of 3 dots) */
            .pattern-six-dots::before {
                content: '';
                position: absolute;
                width: 5px;
                height: 5px;
                background: #85c1e9;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 
                    0 0 4px rgba(133, 193, 233, 0.8),
                    -12px -10px 0 0 #85c1e9,
                    12px -10px 0 0 #85c1e9,
                    -12px 10px 0 0 #85c1e9,
                    0 10px 0 0 #85c1e9,
                    12px 10px 0 0 #85c1e9;
            }
            
            .pattern-six-dots.active::before {
                box-shadow: 
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px -10px 0 0 #4a90e2,
                    12px -10px 0 0 #4a90e2,
                    -12px 10px 0 0 #4a90e2,
                    0 10px 0 0 #4a90e2,
                    12px 10px 0 0 #4a90e2,
                    0 0 12px rgba(74, 144, 226, 1),
                    -12px -10px 0 0 rgba(74, 144, 226, 0.8),
                    12px -10px 0 0 rgba(74, 144, 226, 0.8),
                    -12px 10px 0 0 rgba(74, 144, 226, 0.8),
                    0 10px 0 0 rgba(74, 144, 226, 0.8),
                    12px 10px 0 0 rgba(74, 144, 226, 0.8);
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize panel
window.StellarAlignmentPanel = new StellarAlignmentPanel();
window.StellarAlignmentPanel.initialize();
