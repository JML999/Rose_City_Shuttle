// Simple LeaderboardPanel implementation with tutorial styling and overlay
window.LeaderboardPanel = {
    panel: null,
    isInitialized: false,
    allLeaderboardData: [],
    topXPData: [],
    topEarnersData: [],
    overallData: [],
    currentFishType: 'all',
    currentSortBy: 'weight', // 'weight' or 'value'
    currentTab: 'species', // 'species', 'overall', 'xp', 'earners'
    touchHandlersSetup: false,
    
    initialize: function() {
        console.log("[LEADERBOARD] Initializing simple leaderboard");
        
        // Create panel if it doesn't exist
        if (!this.panel) {
            this.panel = document.createElement('div');
            this.panel.id = 'leaderboard-ui';
            this.panel.innerHTML = `
                <div id="leaderboard-overlay">
                    <div class="leaderboard-container">
                        <div class="panel-header">
                            <div class="close-button" id="leaderboard-close-button">×</div>
                        </div>
                        <div class="tab-buttons">
                            <button class="tab-button active" data-tab="species">Top Species</button>
                            <button class="tab-button" data-tab="overall">Top Overall</button>
                            <button class="tab-button" data-tab="xp">Top XP</button>
                            <button class="tab-button" data-tab="earners">Top Earners</button>
                        </div>
                        <div class="panel-controls" id="species-controls">
                            <div class="filter-container">
                                <button id="species-filter-button" class="filter-button">
                                    <span id="species-filter-text">All Fish Types</span>
                                    <span class="filter-arrow">▼</span>
                                </button>
                            </div>
                            <div class="sort-container">
                                <label>Sort By:</label>
                                <div class="sort-buttons">
                                    <button id="sort-by-weight" class="sort-button active">Weight</button>
                                    <button id="sort-by-value" class="sort-button">Value</button>
                                </div>
                            </div>
                        </div>
                        <!-- Species Filter Modal -->
                        <div id="species-filter-modal" class="filter-modal">
                            <div class="filter-modal-content">
                                <div class="filter-modal-header">
                                    <h3>Filter by Species</h3>
                                    <button class="filter-modal-close">×</button>
                                </div>
                                <div class="filter-options-container" id="species-filter-options">
                                    <!-- Options will be populated dynamically -->
                                </div>
                            </div>
                        </div>
                        <div class="panel-content">
                            <div class="table-wrapper">
                                <table class="leaderboard-table">
                                    <thead>
                                        <tr id="table-headers">
                                            <th>Rank</th>
                                            <th>Player</th>
                                            <th>Fish Type</th>
                                            <th>Weight</th>
                                            <th>Value</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Leaderboard entries will go here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.panel);
            
            // Add event listeners
            this.panel.querySelector('#leaderboard-close-button').addEventListener('click', () => {
                this.hide();
            });
            
            // Species filter button
            this.panel.querySelector('#species-filter-button').addEventListener('click', () => {
                this.toggleSpeciesFilterModal();
            });
            
            // Species filter modal close
            this.panel.querySelector('.filter-modal-close').addEventListener('click', () => {
                this.toggleSpeciesFilterModal();
            });
            
            // Close modal when clicking outside
            this.panel.querySelector('#species-filter-modal').addEventListener('click', (e) => {
                if (e.target.id === 'species-filter-modal') {
                    this.toggleSpeciesFilterModal();
                }
            });
            
            // Tab buttons
            this.panel.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const tab = e.target.getAttribute('data-tab');
                    this.switchTab(tab);
                });
            });
            
            // Sort buttons (only for species tab)
            this.panel.querySelector('#sort-by-weight').addEventListener('click', () => {
                this.setSortBy('weight');
                hytopia.sendData({ type: 'disablePlayerInput' });
            });
            
            this.panel.querySelector('#sort-by-value').addEventListener('click', () => {
                this.setSortBy('value');
                hytopia.sendData({ type: 'disablePlayerInput' });
            });
            
            // Add event listener for L key
            document.addEventListener('keydown', (event) => {
                if (event.key.toLowerCase() === 'l') {
                    console.log("[LEADERBOARD] L key pressed");
                    this.toggle();
                    
                    // Request leaderboard data when showing
                    if (this.isShowing()) {
                        this.requestLeaderboardData();
                    }
                } else if (event.key === 'Escape' && this.isShowing()) {
                    this.hide();
                }
            });
            
            // Set up data listener
            hytopia.onData((data) => {            
                if (data.type === 'leaderboardUpdate') {
                     console.log("[LEADERBOARD] Received data:", data);
                    console.log("[LEADERBOARD] Processing leaderboard update");
                    this.processLeaderboardUpdate(data);
                }
            });
            
            // Add styles with tutorial-like appearance
            const style = document.createElement('style');
            style.textContent = `
                #leaderboard-overlay {
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
                
                /* Hide hotbar and other UI when leaderboard is open */
                body:has(#leaderboard-overlay[style*="display: flex"]) #inventory-toolbar,
                body:has(#leaderboard-overlay[style*="display: flex"]) .hud-hotbar-container,
                body:has(#leaderboard-overlay[style*="display: flex"]) #inventory-toolbar * {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                .leaderboard-container {
                    width: 65vw;
                    max-width: 700px;
                    background-color: rgba(22, 28, 36, 0.95);
                    border: 2px solid #3a4a5c;
                    border-radius: 8px;
                    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    color: #e0e0e0;
                }
                
                .panel-header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding: 8px 15px;
                    background: linear-gradient(to right, #2c3e50, #4a6491);
                    border-bottom: 2px solid #3a4a5c;
                    min-height: 40px;
                }
                
                .close-button {
                    font-size: 24px;
                    color: #ffffff;
                    cursor: pointer;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: color 0.2s;
                }
                
                .close-button:hover {
                    color: #ff9966;
                }
                
                .tab-buttons {
                    display: flex;
                    gap: 8px;
                    padding: 10px 20px;
                    background-color: rgba(30, 38, 50, 0.8);
                    border-bottom: 1px solid #3a4a5c;
                }
                
                .tab-button {
                    flex: 1;
                    padding: 10px 12px;
                    background-color: transparent;
                    border: 1px solid transparent;
                    color: #b0b0b0;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .tab-button:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                    color: #e0e0e0;
                }
                
                .tab-button.active {
                    background-color: rgba(74, 144, 226, 0.2);
                    color: #4a90e2;
                    border-color: #4a90e2;
                }
                
                .panel-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 15px;
                    padding: 10px;
                    background-color: rgba(10, 22, 34, 0.5);
                    border-radius: 4px;
                    border: 1px solid #3a4a5c;
                    gap: 15px;
                }
                
                .filter-container, .sort-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .sort-container label {
                    color: #b0b0b0;
                    font-size: 14px;
                }
                
                .filter-button {
                    background-color: rgba(30, 38, 50, 0.8);
                    color: #e0e0e0;
                    border: 1px solid #3a4a5c;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    transition: all 0.2s;
                    min-width: 150px;
                    justify-content: space-between;
                }
                
                .filter-button:hover {
                    background-color: rgba(58, 74, 92, 0.8);
                    border-color: #4a90e2;
                }
                
                .filter-arrow {
                    font-size: 10px;
                    opacity: 0.7;
                }
                
                /* Species Filter Modal */
                .filter-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    z-index: 3000;
                    justify-content: center;
                    align-items: center;
                }
                
                .filter-modal.show {
                    display: flex;
                }
                
                .filter-modal-content {
                    background-color: rgba(22, 28, 36, 0.95);
                    border: 2px solid #3a4a5c;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
                }
                
                .filter-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    background: linear-gradient(to right, #2c3e50, #4a6491);
                    border-bottom: 2px solid #3a4a5c;
                }
                
                .filter-modal-header h3 {
                    margin: 0;
                    color: #ffffff;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .filter-modal-close {
                    font-size: 24px;
                    color: #ffffff;
                    cursor: pointer;
                    background: none;
                    border: none;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: color 0.2s;
                }
                
                .filter-modal-close:hover {
                    color: #ff9966;
                }
                
                .filter-options-container {
                    padding: 10px;
                    overflow-y: auto;
                    max-height: 50vh;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .filter-option {
                    padding: 10px 15px;
                    background-color: rgba(30, 38, 50, 0.5);
                    border: 1px solid #3a4a5c;
                    border-radius: 4px;
                    color: #e0e0e0;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                
                .filter-option:hover {
                    background-color: rgba(58, 74, 92, 0.8);
                    border-color: #4a90e2;
                }
                
                .filter-option.selected {
                    background-color: rgba(74, 144, 226, 0.2);
                    border-color: #4a90e2;
                    color: #4a90e2;
                }
                
                .sort-buttons {
                    display: flex;
                    margin-left: 10px;
                }
                
                .sort-button {
                    padding: 6px 12px;
                    background-color: rgba(30, 38, 50, 0.8);
                    border: 1px solid #3a4a5c;
                    color: #b0b0b0;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                
                .sort-button:first-child {
                    border-radius: 4px 0 0 4px;
                }
                
                .sort-button:last-child {
                    border-radius: 0 4px 4px 0;
                }
                
                .sort-button:hover {
                    background-color: rgba(58, 74, 92, 0.8);
                    color: #e0e0e0;
                }
                
                .sort-button.active {
                    background-color: rgba(74, 144, 226, 0.2);
                    color: #4a90e2;
                    border-color: #4a90e2;
                }
                
                .panel-content {
                    padding: 15px;
                    overflow: hidden;
                    max-height: 50vh;
                    flex: 1;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                
                .table-wrapper {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    position: relative;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    touch-action: pan-y;
                }
                
                .leaderboard-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    color: #e0e0e0;
                }
                
                .leaderboard-table thead {
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    background-color: rgba(22, 28, 36, 1);
                }
                
                .leaderboard-table th, .leaderboard-table td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #3a4a5c;
                    background-color: transparent;
                }
                
                .leaderboard-table th {
                    background-color: rgba(22, 28, 36, 1) !important;
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 14px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                    border-bottom: 2px solid #3a4a5c;
                }
                
                /* Mobile: Make headers clickable for sorting */
                @media (max-width: 768px) {
                    .leaderboard-table th.sortable {
                        cursor: pointer;
                        user-select: none;
                        transition: background-color 0.2s;
                        position: relative;
                        padding: 10px 8px;
                    }
                    
                    .leaderboard-table th.sortable:hover,
                    .leaderboard-table th.sortable:active {
                        background-color: rgba(58, 74, 92, 1) !important;
                    }
                    
                    .leaderboard-table th.sortable.active {
                        background-color: rgba(74, 144, 226, 0.3) !important;
                    }
                    
                    /* Fish type header - clickable to open modal */
                    .leaderboard-table th.fish-type-header {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px 8px;
                        cursor: pointer;
                    }
                    
                    .leaderboard-table th.fish-type-header:hover {
                        background-color: rgba(58, 74, 92, 1) !important;
                    }
                    
                    /* Hide panel controls on mobile */
                    .panel-controls {
                        display: none !important;
                    }
                }
                
                .leaderboard-table tbody tr {
                    background-color: transparent;
                }
                
                .leaderboard-table tbody tr:nth-child(even) {
                    background-color: rgba(30, 38, 50, 0.2);
                }
                
                .leaderboard-table td {
                    font-size: 14px;
                }
                
                .leaderboard-table tr:hover {
                    background-color: rgba(30, 38, 50, 0.3);
                }
                
                /* Fish rarity colors */
                .fish-common {
                    color: #d0d0d0;
                }
                
                .fish-uncommon {
                    color: #4a90e2;
                }
                
                .fish-rare {
                    color: #9b59b6;
                }
                
                .fish-epic {
                    color: #f1c40f;
                }
                
                .fish-legendary {
                    color: #e74c3c;
                }
                
                /* Custom scrollbar */
                .panel-content::-webkit-scrollbar,
                .filter-options-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .panel-content::-webkit-scrollbar-track,
                .filter-options-container::-webkit-scrollbar-track {
                    background: rgba(30, 38, 50, 0.5);
                    border-radius: 4px;
                }
                
                .panel-content::-webkit-scrollbar-thumb,
                .filter-options-container::-webkit-scrollbar-thumb {
                    background: #3a4a5c;
                    border-radius: 4px;
                }
                
                .panel-content::-webkit-scrollbar-thumb:hover,
                .filter-options-container::-webkit-scrollbar-thumb:hover {
                    background: #4a90e2;
                }
                
                /* Empty state */
                .empty-state {
                    text-align: center;
                    padding: 30px;
                    color: #6c7a89;
                }
                
                /* Mobile responsive */
                @media (max-width: 768px) {
                    .leaderboard-container {
                        width: 95vw;
                        max-width: none;
                        max-height: 90vh;
                    }
                    
                    .panel-controls {
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .filter-button {
                        width: 100%;
                        min-width: auto;
                    }
                    
                    .sort-container {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .tab-button {
                        font-size: 12px;
                        padding: 8px 6px;
                    }
                    
                    .leaderboard-table th,
                    .leaderboard-table td {
                        padding: 8px 6px;
                        font-size: 12px;
                    }
                    
                    .filter-modal-content {
                        width: 95vw;
                        max-height: 85vh;
                    }
                    
                    .filter-options-container {
                        max-height: 60vh;
                    }
                }
            `;
            document.head.appendChild(style);
            
            this.isInitialized = true;
            console.log("[LEADERBOARD] Initialization complete");
        }
    },
    
    setSortBy: function(sortBy) {
        if (this.currentSortBy === sortBy) return;
        
        this.currentSortBy = sortBy;
        
        // Update button states (desktop)
        const weightButton = this.panel.querySelector('#sort-by-weight');
        const valueButton = this.panel.querySelector('#sort-by-value');
        
        if (weightButton && valueButton) {
            if (sortBy === 'weight') {
                weightButton.classList.add('active');
                valueButton.classList.remove('active');
            } else {
                weightButton.classList.remove('active');
                valueButton.classList.add('active');
            }
        }
        
        // Update mobile header active state
        const headers = this.panel.querySelector('#table-headers');
        if (headers) {
            headers.querySelectorAll('th.sortable[data-sort]').forEach(th => {
                th.classList.remove('active');
                if (th.getAttribute('data-sort') === sortBy) {
                    th.classList.add('active');
                }
            });
        }
        
        this.updateLeaderboardDisplay();
    },
    
    cycleFishType: function(direction) {
        // Get all available fish types
        const allTypes = ['all', ...new Set(this.allLeaderboardData.map(entry => entry.fishType).filter(Boolean))];
        const currentIndex = allTypes.indexOf(this.currentFishType);
        
        let newIndex;
        if (direction > 0) {
            // Next
            newIndex = (currentIndex + 1) % allTypes.length;
        } else {
            // Previous
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = allTypes.length - 1;
        }
        
        this.currentFishType = allTypes[newIndex];
        
        // Update display
        const display = this.panel.querySelector('#fish-type-display');
        if (display) {
            display.textContent = this.currentFishType === 'all' ? 'All Fish Types' : this.currentFishType;
        }
        
        // Also update the filter button text if it exists (desktop)
        const filterText = this.panel.querySelector('#species-filter-text');
        if (filterText) {
            filterText.textContent = this.currentFishType === 'all' ? 'All Fish Types' : this.currentFishType;
        }
        
        this.updateLeaderboardDisplay();
    },
    
    requestLeaderboardData: function() {
        console.log("[LEADERBOARD] Requesting leaderboard data");
        hytopia.sendData({ type: 'requestLeaderboard' });
    },
    
    processLeaderboardUpdate: function(data) {
        console.log("[LEADERBOARD] Processing leaderboard update:", data);
        console.log("[LEADERBOARD] Data type:", data.type);
        console.log("[LEADERBOARD] Has allLeaderboards:", !!data.allLeaderboards);
        console.log("[LEADERBOARD] Has topXP:", !!data.topXP);
        console.log("[LEADERBOARD] Has topEarners:", !!data.topEarners);
        console.log("[LEADERBOARD] Has overall:", !!data.overall);
        
        const isMobile = hytopia.isMobile || window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile: show simple panel if not showing
            if (!this.mobileSimplePanel || this.mobileSimplePanel.style.display === 'none') {
                console.log("[LEADERBOARD] Mobile panel not showing, calling show()");
                this.show();
            } else {
                console.log("[LEADERBOARD] Mobile panel already showing, updating display");
            }
        } else {
            // Desktop: show regular panel if not showing
            if (!this.isShowing()) {
                console.log("[LEADERBOARD] Panel not showing, calling show()");
                this.show();
            } else {
                console.log("[LEADERBOARD] Panel already showing, updating display");
            }
        }
        
        // Store new leaderboard data (Top XP, Top Earners, Overall)
        if (data.topXP) {
            this.topXPData = data.topXP;
        }
        if (data.topEarners) {
            this.topEarnersData = data.topEarners;
        }
        if (data.overall) {
            this.overallData = data.overall;
        }
        
        if (data.allLeaderboards) {
            // Process all leaderboards
            const allEntries = [];
            
            for (const [species, leaderboard] of Object.entries(data.allLeaderboards)) {
                if (leaderboard) {
                    // Process weight leaderboard
                    if (leaderboard.byWeight) {
                        leaderboard.byWeight.forEach(entry => {
                            allEntries.push({
                                ...entry,
                                fishType: species
                            });
                        });
                    }
                    
                    // Process value leaderboard if not already included
                    if (leaderboard.byValue) {
                        leaderboard.byValue.forEach(entry => {
                            // Check if this entry is already in the list (from byWeight)
                            const isDuplicate = allEntries.some(e => 
                                e.playerId === entry.playerId && 
                                e.timestamp === entry.timestamp && 
                                e.fishType === species
                            );
                            
                            if (!isDuplicate) {
                                allEntries.push({
                                    ...entry,
                                    fishType: species
                                });
                            }
                        });
                    }
                }
            }
            
            console.log("[LEADERBOARD] Processed all fish types:", 
                [...new Set(allEntries.map(e => e.fishType))]);
            console.log("[LEADERBOARD] Total entries:", allEntries.length);
            
            this.allLeaderboardData = allEntries;
            this.updateFishTypeDropdown();
            
            // Update mobile simple display if showing
            const isMobile = hytopia.isMobile || window.innerWidth <= 768;
            if (isMobile && this.mobileSimplePanel && this.mobileSimplePanel.style.display !== 'none') {
                this.updateMobileSimpleDisplay();
            }
            
            this.updateLeaderboardDisplay();
            
            // Add this line: also update mobile leaderboard if it's visible
            if (hytopia.isMobile && document.getElementById('mobile-leaderboard-container')?.style.display === 'block') {
                console.log("[LEADERBOARD] Updating mobile display with", allEntries.length, "entries");
                this.currentFishFilter = 'all'; // Reset to show all fish
                this.mobileSortBy = 'value'; // Set default sort
                this.updateMobileLeaderboard();
            }
        } else if (data.species && data.leaderboard) {
            // Process single species leaderboard
            const entries = [];
            
            // Process weight leaderboard
            if (data.leaderboard.byWeight) {
                data.leaderboard.byWeight.forEach(entry => {
                    entries.push({
                        ...entry,
                        fishType: data.species
                    });
                });
            }
            
            // Process value leaderboard if not already included
            if (data.leaderboard.byValue) {
                data.leaderboard.byValue.forEach(entry => {
                    // Check if this entry is already in the list (from byWeight)
                    const isDuplicate = entries.some(e => 
                        e.playerId === entry.playerId && 
                        e.timestamp === entry.timestamp
                    );
                    
                    if (!isDuplicate) {
                        entries.push({
                            ...entry,
                            fishType: data.species
                        });
                    }
                });
            }
            
            this.allLeaderboardData = entries;
            this.updateFishTypeDropdown();
            this.updateLeaderboardDisplay();
            
            // Add this line: also update mobile leaderboard if it's visible
            if (hytopia.isMobile && document.getElementById('mobile-leaderboard-container')?.style.display === 'block') {
                this.updateMobileLeaderboard();
            }
        }
    },
    
    updateFishTypeDropdown: function() {
        // Get unique fish types
        const fishTypes = ['all'];
        this.allLeaderboardData.forEach(entry => {
            if (!fishTypes.includes(entry.fishType)) {
                fishTypes.push(entry.fishType);
            }
        });
        
        // Sort alphabetically (except 'all' stays first)
        fishTypes.sort((a, b) => {
            if (a === 'all') return -1;
            if (b === 'all') return 1;
            return a.localeCompare(b);
        });
        
        // Update filter modal options
        const optionsContainer = this.panel.querySelector('#species-filter-options');
        optionsContainer.innerHTML = '';
        
        fishTypes.forEach(fishType => {
            const option = document.createElement('div');
            option.className = 'filter-option';
            if (fishType === this.currentFishType) {
                option.classList.add('selected');
            }
            option.textContent = fishType === 'all' ? 'All Fish Types' : fishType;
            option.dataset.value = fishType;
            option.addEventListener('click', () => {
                this.selectSpeciesFilter(fishType);
            });
            optionsContainer.appendChild(option);
        });
        
        // Update filter button text
        const filterText = this.panel.querySelector('#species-filter-text');
        filterText.textContent = this.currentFishType === 'all' ? 'All Fish Types' : this.currentFishType;
    },
    
    toggleSpeciesFilterModal: function() {
        const modal = this.panel.querySelector('#species-filter-modal');
        modal.classList.toggle('show');
    },
    
    selectSpeciesFilter: function(fishType) {
        this.currentFishType = fishType;
        
        // Update selected state
        this.panel.querySelectorAll('.filter-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.value === fishType) {
                opt.classList.add('selected');
            }
        });
        
        // Update filter button text
        const filterText = this.panel.querySelector('#species-filter-text');
        filterText.textContent = fishType === 'all' ? 'All Fish Types' : fishType;
        
        // Close modal
        this.toggleSpeciesFilterModal();
        
        // Update display
        this.updateLeaderboardDisplay();
    },
    
    
    switchTab: function(tab) {
        this.currentTab = tab;
        
        // Update tab button states
        this.panel.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tab) {
                btn.classList.add('active');
            }
        });
        
        // Show/hide controls based on tab (desktop only)
        const controls = this.panel.querySelector('#species-controls');
        const isMobile = hytopia.isMobile || window.innerWidth <= 768;
        if (tab === 'species' && !isMobile) {
            controls.style.display = 'flex';
        } else {
            controls.style.display = 'none';
        }
        
        // Update table headers
        const headers = this.panel.querySelector('#table-headers');
        if (tab === 'species') {
            if (isMobile) {
                    // Mobile: clickable headers with fish type tap-to-open
                    headers.innerHTML = `
                        <th>Rank</th>
                        <th>Player</th>
                        <th class="fish-type-header sortable" id="mobile-fish-type-header">
                            <span id="fish-type-display">All Fish Types</span>
                        </th>
                        <th class="sortable" data-sort="weight">Weight</th>
                        <th class="sortable" data-sort="value">Value</th>
                        <th>Date</th>
                    `;
                    // Add click handlers for sortable headers
                    headers.querySelectorAll('th.sortable[data-sort]').forEach(th => {
                        th.addEventListener('click', () => {
                            const sortBy = th.getAttribute('data-sort');
                            this.setSortBy(sortBy);
                            // Update active state
                            headers.querySelectorAll('th.sortable').forEach(t => t.classList.remove('active'));
                            th.classList.add('active');
                        });
                    });
                    // Add fish type tap handler to open modal
                    const fishTypeHeader = headers.querySelector('#mobile-fish-type-header');
                    if (fishTypeHeader) {
                        fishTypeHeader.addEventListener('click', () => {
                            this.toggleSpeciesFilterModal();
                        });
                    }
            } else {
                headers.innerHTML = '<th>Rank</th><th>Player</th><th>Fish Type</th><th>Weight</th><th>Value</th><th>Date</th>';
            }
        } else if (tab === 'overall') {
            headers.innerHTML = '<th>Rank</th><th>Player</th><th>Fish Type</th><th>Weight</th><th>Value</th><th>Date</th>';
        } else if (tab === 'xp') {
            headers.innerHTML = '<th>Rank</th><th>Player</th><th>Total XP</th><th>Last Updated</th>';
        } else if (tab === 'earners') {
            headers.innerHTML = '<th>Rank</th><th>Player</th><th>Total Earned</th><th>Last Updated</th>';
        }
        
        this.updateLeaderboardDisplay();
    },
    
    updateLeaderboardDisplay: function() {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        const tbody = this.panel.querySelector('.leaderboard-table tbody');
        if (!tbody) {
            console.error("[LEADERBOARD] Could not find tbody element");
            return;
        }
        
        tbody.innerHTML = '';
        
        let dataToDisplay = [];
        
        if (this.currentTab === 'species') {
            // Filter by fish type
            let filteredData = [...this.allLeaderboardData];
            if (this.currentFishType !== 'all') {
                filteredData = filteredData.filter(entry => entry.fishType === this.currentFishType);
            }
            
            // Sort by selected criteria
            if (this.currentSortBy === 'weight') {
                filteredData.sort((a, b) => b.weight - a.weight);
            } else {
                filteredData.sort((a, b) => b.value - a.value);
            }
            
            dataToDisplay = filteredData;
            
            // Limit to top 5 on mobile
            const isMobile = hytopia.isMobile || window.innerWidth <= 768;
            if (isMobile && dataToDisplay.length > 5) {
                dataToDisplay = dataToDisplay.slice(0, 5);
            }
            
            // Create table rows
            dataToDisplay.forEach((entry, index) => {
                const row = document.createElement('tr');
                let rarityClass = '';
                if (entry.rarity) {
                    rarityClass = `fish-${entry.rarity.toLowerCase()}`;
                }
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.playerName || 'Unknown'}</td>
                    <td class="${rarityClass}">${entry.fishType || 'Unknown'}</td>
                    <td>${entry.weight ? entry.weight.toFixed(2) : '0.00'} lbs</td>
                    <td>$${entry.value || 0}</td>
                    <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Unknown'}</td>
                `;
                tbody.appendChild(row);
            });
        } else if (this.currentTab === 'overall') {
            dataToDisplay = this.overallData || [];
            // Limit to top 5 on mobile
            const isMobile = hytopia.isMobile || window.innerWidth <= 768;
            if (isMobile && dataToDisplay.length > 5) {
                dataToDisplay = dataToDisplay.slice(0, 5);
            }
            dataToDisplay.forEach((entry, index) => {
                const row = document.createElement('tr');
                let rarityClass = '';
                if (entry.rarity) {
                    rarityClass = `fish-${entry.rarity.toLowerCase()}`;
                }
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.playerName || 'Unknown'}</td>
                    <td class="${rarityClass}">${entry.location || 'Unknown'}</td>
                    <td>${entry.weight ? entry.weight.toFixed(2) : '0.00'} lbs</td>
                    <td>$${entry.value || 0}</td>
                    <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Unknown'}</td>
                `;
                tbody.appendChild(row);
            });
        } else if (this.currentTab === 'xp') {
            dataToDisplay = this.topXPData || [];
            // Limit to top 5 on mobile
            const isMobile = hytopia.isMobile || window.innerWidth <= 768;
            if (isMobile && dataToDisplay.length > 5) {
                dataToDisplay = dataToDisplay.slice(0, 5);
            }
            dataToDisplay.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.playerName || 'Unknown'}</td>
                    <td>${entry.totalXP || 0} XP</td>
                    <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Unknown'}</td>
                `;
                tbody.appendChild(row);
            });
        } else if (this.currentTab === 'earners') {
            dataToDisplay = this.topEarnersData || [];
            // Limit to top 5 on mobile
            const isMobile = hytopia.isMobile || window.innerWidth <= 768;
            if (isMobile && dataToDisplay.length > 5) {
                dataToDisplay = dataToDisplay.slice(0, 5);
            }
            dataToDisplay.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.playerName || 'Unknown'}</td>
                    <td>$${entry.totalEarned || 0}</td>
                    <td>${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Unknown'}</td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Show empty state if no data
        if (dataToDisplay.length === 0) {
            const emptyRow = document.createElement('tr');
            const colSpan = this.currentTab === 'xp' || this.currentTab === 'earners' ? 4 : 6;
            emptyRow.innerHTML = `
                <td colspan="${colSpan}" class="empty-state">
                    <p>No leaderboard entries found</p>
                    <p>${this.currentTab === 'xp' ? 'Gain XP to see your name here!' : 
                        this.currentTab === 'earners' ? 'Sell fish to see your name here!' : 
                        'Catch some fish to see your name here!'}</p>
                </td>
            `;
            tbody.appendChild(emptyRow);
        }
        
        console.log(`[LEADERBOARD] Added ${dataToDisplay.length} rows to the ${this.currentTab} table`);
    },
    
    isShowing: function() {
        return this.panel && 
               this.panel.querySelector('#leaderboard-overlay') && 
               this.panel.querySelector('#leaderboard-overlay').style.display === 'flex';
    },
    
    show: function() {
        console.log("[LEADERBOARD] Showing panel");
        
        if (!this.isInitialized) {
            this.initialize();
        }
        
        // Check if mobile - use simple mobile UI
        const isMobile = hytopia.isMobile || window.innerWidth <= 768;
        if (isMobile) {
            this.showMobileSimple();
            return;
        }
        
        const overlay = this.panel.querySelector('#leaderboard-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            
            // Hide hotbar manually (CSS :has() may not work in all browsers)
            const hotbar = document.getElementById('inventory-toolbar');
            if (hotbar) {
                hotbar.style.display = 'none';
            }
            const hotbarContainers = document.querySelectorAll('.hud-hotbar-container');
            hotbarContainers.forEach(container => {
                container.style.display = 'none';
            });
            
            // Disable player input and hide mobile controls
            hytopia.sendData({ type: 'disablePlayerInput' });
            
            this.requestLeaderboardData();
        }
    },
    
    showMobileSimple: function() {
        // Create simple mobile leaderboard if it doesn't exist
        if (!this.mobileSimplePanel) {
            this.createMobileSimplePanel();
        }
        
        this.mobileSimplePanel.style.display = 'flex';
        
        // Hide hotbar
        const hotbar = document.getElementById('inventory-toolbar');
        if (hotbar) {
            hotbar.style.display = 'none';
        }
        const hotbarContainers = document.querySelectorAll('.hud-hotbar-container');
        hotbarContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Disable player input and hide mobile controls
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.hideMobileControls();
        
        // Initialize mobile category and page
        this.mobileCurrentCategory = 'earners';
        this.mobileCurrentPage = 0; // 0 = 1-5, 1 = 6-10, etc.
        this.updateMobileSimpleDisplay();
        
        this.requestLeaderboardData();
    },
    
    createMobileSimplePanel: function() {
        const panel = document.createElement('div');
        panel.id = 'mobile-leaderboard-simple';
        panel.innerHTML = `
            <div class="mobile-leaderboard-content">
                <div class="mobile-leaderboard-header">
                    <button class="mobile-nav-arrow" id="mobile-lb-prev">‹</button>
                    <div class="mobile-category-text" id="mobile-lb-category">Total Earned</div>
                    <button class="mobile-nav-arrow" id="mobile-lb-next">›</button>
                    <button class="mobile-close-btn" id="mobile-lb-close">×</button>
                </div>
                <div class="mobile-leaderboard-body">
                    <div class="mobile-leaderboard-table-container">
                        <table class="mobile-leaderboard-table" id="mobile-lb-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody id="mobile-lb-entries">
                                <!-- Entries will be populated here -->
                            </tbody>
                        </table>
                    </div>
                    <div class="mobile-leaderboard-pagination">
                        <button class="mobile-page-arrow" id="mobile-lb-page-up">▲</button>
                        <div class="mobile-page-info" id="mobile-lb-page-info">1-5</div>
                        <button class="mobile-page-arrow" id="mobile-lb-page-down">▼</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.mobileSimplePanel = panel;
        
        // Add styles matching pixel-art leaderboard aesthetic
        const style = document.createElement('style');
        style.textContent = `
            #mobile-leaderboard-simple {
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
            
            .mobile-leaderboard-content {
                width: 95%;
                max-width: 500px;
                background-color: #1a2332;
                border: 3px solid #4a6491;
                border-radius: 4px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                overflow: hidden;
            }
            
            .mobile-leaderboard-header {
                display: flex;
                align-items: center;
                padding: 12px 15px;
                background: #2c3e50;
                border-bottom: 2px solid #4a6491;
                gap: 10px;
            }
            
            .mobile-nav-arrow {
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
            
            .mobile-nav-arrow:hover,
            .mobile-nav-arrow:active {
                color: #4a90e2;
                transform: scale(1.1);
            }
            
            .mobile-category-text {
                flex: 1;
                text-align: center;
                color: #85c1e9;
                font-size: 16px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                padding: 0 10px;
            }
            
            .mobile-close-btn {
                background: transparent;
                border: none;
                color: #85c1e9;
                font-size: 24px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                padding: 0;
                font-weight: bold;
            }
            
            .mobile-close-btn:hover,
            .mobile-close-btn:active {
                color: #e74c3c;
                transform: scale(1.1);
            }
            
            .mobile-leaderboard-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .mobile-leaderboard-table-container {
                flex: 1;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                touch-action: pan-y;
                background-color: #161b26;
            }
            
            .mobile-leaderboard-table {
                width: 100%;
                border-collapse: collapse;
                color: #e0e0e0;
            }
            
            .mobile-leaderboard-table thead {
                position: sticky;
                top: 0;
                z-index: 10;
                background-color: #2c3e50;
            }
            
            .mobile-leaderboard-table th {
                padding: 10px 6px;
                text-align: left;
                background-color: #2c3e50 !important;
                color: #85c1e9;
                font-weight: 700;
                font-size: 12px;
                text-transform: uppercase;
                border-bottom: 2px solid #4a6491;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            
            .mobile-leaderboard-table td {
                padding: 8px 6px;
                border-bottom: 1px solid #3a4a5c;
                font-size: 13px;
            }
            
            .mobile-leaderboard-table tbody tr {
                background-color: transparent;
            }
            
            .mobile-leaderboard-table tbody tr:nth-child(even) {
                background-color: rgba(44, 62, 80, 0.3);
            }
            
            .mobile-leaderboard-table tbody tr:hover {
                background-color: rgba(74, 100, 145, 0.5);
            }
            
            .mobile-entry-rank {
                font-weight: 700;
                color: #4a90e2;
                width: 35px;
                font-size: 13px;
            }
            
            .mobile-entry-name {
                color: #e0e0e0;
                font-size: 13px;
            }
            
            .mobile-entry-value {
                font-weight: 600;
                color: #2ecc71;
                text-align: right;
                font-size: 13px;
            }
            
            .mobile-entry-fish-type {
                color: #85c1e9;
                font-size: 12px;
            }
            
            .mobile-entry-weight {
                color: #f39c12;
                font-size: 12px;
                text-align: right;
            }
            
            .mobile-entry-open {
                color: #7f8c8d;
                font-style: italic;
            }
            
            .mobile-leaderboard-pagination {
                width: 50px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px 8px;
                background-color: #1a2332;
                border-left: 2px solid #4a6491;
                gap: 12px;
            }
            
            .mobile-page-arrow {
                background: transparent;
                border: none;
                color: #85c1e9;
                font-size: 20px;
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
            
            .mobile-page-arrow:hover,
            .mobile-page-arrow:active {
                color: #4a90e2;
                transform: scale(1.1);
            }
            
            .mobile-page-arrow:disabled {
                color: #3a4a5c;
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .mobile-page-info {
                color: #85c1e9;
                font-size: 11px;
                font-weight: 700;
                text-align: center;
                writing-mode: vertical-rl;
                text-orientation: mixed;
            }
        `;
        document.head.appendChild(style);
        
        // Add event listeners
        panel.querySelector('#mobile-lb-prev').addEventListener('click', () => {
            this.cycleMobileCategory(-1);
        });
        
        panel.querySelector('#mobile-lb-next').addEventListener('click', () => {
            this.cycleMobileCategory(1);
        });
        
        panel.querySelector('#mobile-lb-close').addEventListener('click', () => {
            this.hideMobileSimple();
        });
        
        panel.querySelector('#mobile-lb-page-up').addEventListener('click', () => {
            if (this.mobileCurrentPage > 0) {
                this.mobileCurrentPage--;
                this.updateMobileSimpleDisplay();
            }
        });
        
        panel.querySelector('#mobile-lb-page-down').addEventListener('click', () => {
            this.mobileCurrentPage++;
            this.updateMobileSimpleDisplay();
        });
        
        // Prevent touch events from reaching game
        const tableContainer = panel.querySelector('.mobile-leaderboard-table-container');
        panel.addEventListener('touchstart', (e) => {
            // Allow scrolling in table container
            if (tableContainer && tableContainer.contains(e.target)) {
                return;
            }
            e.stopPropagation();
        }, { passive: true });
        
        panel.addEventListener('touchmove', (e) => {
            // Allow scrolling in table container
            if (tableContainer && tableContainer.contains(e.target)) {
                return;
            }
            e.stopPropagation();
        }, { passive: true });
        
        panel.addEventListener('touchend', (e) => {
            // Allow touches in table container
            if (tableContainer && tableContainer.contains(e.target)) {
                return;
            }
            e.stopPropagation();
        }, { passive: true });
    },
    
    cycleMobileCategory: function(direction) {
        const categories = ['earners', 'xp', 'overall_value', 'overall_weight'];
        const categoryNames = ['Total Earned', 'Total XP', 'All Species (Value)', 'All Species (Weight)'];
        
        // Get all species for cycling
        const allSpecies = [...new Set(this.allLeaderboardData?.map(e => e.fishType).filter(Boolean) || [])];
        const allCategoryNames = [...categoryNames];
        allSpecies.forEach(species => {
            categories.push(`species_${species}`);
            allCategoryNames.push(species);
        });
        
        const currentIndex = categories.indexOf(this.mobileCurrentCategory);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) {
            newIndex = categories.length - 1;
        } else if (newIndex >= categories.length) {
            newIndex = 0;
        }
        
        this.mobileCurrentCategory = categories[newIndex];
        const categoryText = allCategoryNames[newIndex] || 'All Species';
        
        const textEl = this.mobileSimplePanel.querySelector('#mobile-lb-category');
        if (textEl) {
            textEl.textContent = categoryText;
        }
        
        // Reset to first page when changing category
        this.mobileCurrentPage = 0;
        this.updateMobileSimpleDisplay();
    },
    
    updateMobileSimpleDisplay: function() {
        const entriesContainer = this.mobileSimplePanel.querySelector('#mobile-lb-entries');
        const table = this.mobileSimplePanel.querySelector('#mobile-lb-table');
        const pageInfo = this.mobileSimplePanel.querySelector('#mobile-lb-page-info');
        const pageUpBtn = this.mobileSimplePanel.querySelector('#mobile-lb-page-up');
        const pageDownBtn = this.mobileSimplePanel.querySelector('#mobile-lb-page-down');
        
        if (!entriesContainer || !table) return;
        
        entriesContainer.innerHTML = '';
        
        // Update table headers based on category
        const thead = table.querySelector('thead tr');
        if (thead) {
            if (this.mobileCurrentCategory === 'xp') {
                thead.innerHTML = '<th>Rank</th><th>Player</th><th>XP</th>';
            } else if (this.mobileCurrentCategory === 'earners') {
                thead.innerHTML = '<th>Rank</th><th>Player</th><th>Earned</th>';
            } else if (this.mobileCurrentCategory === 'overall_value' || this.mobileCurrentCategory === 'overall_weight') {
                thead.innerHTML = '<th>Rank</th><th>Player</th><th>Fish Type</th><th>Weight</th><th>Value</th>';
            } else if (this.mobileCurrentCategory.startsWith('species_')) {
                thead.innerHTML = '<th>Rank</th><th>Player</th><th>Weight</th><th>Value</th>';
            } else {
                thead.innerHTML = '<th>Rank</th><th>Player</th><th>Value</th>';
            }
        }
        
        let allData = [];
        
        if (this.mobileCurrentCategory === 'earners') {
            allData = this.topEarnersData || [];
        } else if (this.mobileCurrentCategory === 'xp') {
            allData = this.topXPData || [];
        } else if (this.mobileCurrentCategory === 'overall_value') {
            allData = (this.overallData || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        } else if (this.mobileCurrentCategory === 'overall_weight') {
            allData = (this.overallData || []).sort((a, b) => (b.weight || 0) - (a.weight || 0));
        } else if (this.mobileCurrentCategory.startsWith('species_')) {
            const species = this.mobileCurrentCategory.replace('species_', '');
            allData = (this.allLeaderboardData || []).filter(e => e.fishType === species);
            allData.sort((a, b) => (b.weight || 0) - (a.weight || 0));
        }
        
        // Calculate pagination
        const pageSize = 5;
        const startIndex = this.mobileCurrentPage * pageSize;
        const endIndex = startIndex + pageSize;
        const totalPages = Math.ceil(Math.max(allData.length, 20) / pageSize); // Always allow up to 20 entries
        
        // Update page info
        if (pageInfo) {
            const displayStart = startIndex + 1;
            const displayEnd = Math.min(endIndex, Math.max(allData.length, 20));
            pageInfo.textContent = `${displayStart}-${displayEnd}`;
        }
        
        // Enable/disable pagination buttons
        if (pageUpBtn) {
            pageUpBtn.disabled = this.mobileCurrentPage === 0;
        }
        if (pageDownBtn) {
            pageDownBtn.disabled = this.mobileCurrentPage >= totalPages - 1;
        }
        
        // Get data for current page
        const pageData = allData.slice(startIndex, endIndex);
        
        // Always show 5 rows (fill with OPEN if needed)
        for (let i = 0; i < pageSize; i++) {
            const row = document.createElement('tr');
            const globalRank = startIndex + i + 1;
            
            if (i < pageData.length) {
                const entry = pageData[i];
                if (this.mobileCurrentCategory === 'xp') {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name">${entry.playerName || 'Unknown'}</td>
                        <td class="mobile-entry-value">${entry.totalXP || 0}</td>
                    `;
                } else if (this.mobileCurrentCategory === 'earners') {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name">${entry.playerName || 'Unknown'}</td>
                        <td class="mobile-entry-value">$${entry.totalEarned || 0}</td>
                    `;
                } else if (this.mobileCurrentCategory === 'overall_value' || this.mobileCurrentCategory === 'overall_weight') {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name">${entry.playerName || 'Unknown'}</td>
                        <td class="mobile-entry-fish-type">${entry.fishType || entry.species || '-'}</td>
                        <td class="mobile-entry-weight">${entry.weight ? entry.weight.toFixed(2) : '0.00'}</td>
                        <td class="mobile-entry-value">$${entry.value || 0}</td>
                    `;
                } else if (this.mobileCurrentCategory.startsWith('species_')) {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name">${entry.playerName || 'Unknown'}</td>
                        <td class="mobile-entry-weight">${entry.weight ? entry.weight.toFixed(2) : '0.00'}</td>
                        <td class="mobile-entry-value">$${entry.value || 0}</td>
                    `;
                } else {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name">${entry.playerName || 'Unknown'}</td>
                        <td class="mobile-entry-value">$${entry.value || 0}</td>
                    `;
                }
            } else {
                // Empty slot - show OPEN
                if (this.mobileCurrentCategory === 'overall_value' || this.mobileCurrentCategory === 'overall_weight') {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name mobile-entry-open">OPEN</td>
                        <td class="mobile-entry-fish-type mobile-entry-open">-</td>
                        <td class="mobile-entry-weight mobile-entry-open">-</td>
                        <td class="mobile-entry-value mobile-entry-open">-</td>
                    `;
                } else if (this.mobileCurrentCategory.startsWith('species_')) {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name mobile-entry-open">OPEN</td>
                        <td class="mobile-entry-weight mobile-entry-open">-</td>
                        <td class="mobile-entry-value mobile-entry-open">-</td>
                    `;
                } else {
                    row.innerHTML = `
                        <td class="mobile-entry-rank">#${globalRank}</td>
                        <td class="mobile-entry-name mobile-entry-open">OPEN</td>
                        <td class="mobile-entry-value mobile-entry-open">-</td>
                    `;
                }
            }
            
            entriesContainer.appendChild(row);
        }
    },
    
    hideMobileSimple: function() {
        if (this.mobileSimplePanel) {
            this.mobileSimplePanel.style.display = 'none';
        }
        
        // Show hotbar again
        const hotbar = document.getElementById('inventory-toolbar');
        if (hotbar) {
            hotbar.style.display = '';
        }
        const hotbarContainers = document.querySelectorAll('.hud-hotbar-container');
        hotbarContainers.forEach(container => {
            container.style.display = '';
        });
        
        // Enable player input and show mobile controls
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.showMobileControls();
    },
    
    hide: function() {
        console.log("[LEADERBOARD] Hiding panel");
        if (this.panel) {
            const overlay = this.panel.querySelector('#leaderboard-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
            
            // Show hotbar again
            const hotbar = document.getElementById('inventory-toolbar');
            if (hotbar) {
                hotbar.style.display = '';
            }
            const hotbarContainers = document.querySelectorAll('.hud-hotbar-container');
            hotbarContainers.forEach(container => {
                container.style.display = '';
            });
            
            // Enable player input and show mobile controls
            hytopia.sendData({ type: 'enablePlayerInput' });
            
            if (hytopia.isMobile) {
                this.showMobileControls();
            }
            
            // Also close species filter modal if open
            const modal = this.panel.querySelector('#species-filter-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }
    },
    
    hideMobileControls: function() {
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('interact-button'),
            document.querySelector('.mobile-controls-container')
        ];
        
        mobileControls.forEach(control => {
            if (control) {
                control.style.display = 'none';
            }
        });
    },
    
    showMobileControls: function() {
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('interact-button'),
            document.querySelector('.mobile-controls-container')
        ];
        
        mobileControls.forEach(control => {
            if (control) {
                control.style.display = '';
            }
        });
    },
    
    setupMobileTouchHandling: function() {
        if (!hytopia.isMobile) return;
        
        // Only setup once
        if (this.touchHandlersSetup) return;
        this.touchHandlersSetup = true;
        
        const overlay = this.panel.querySelector('#leaderboard-overlay');
        const container = this.panel.querySelector('.leaderboard-container');
        const tableWrapper = this.panel.querySelector('.table-wrapper');
        const filterModal = this.panel.querySelector('#species-filter-modal');
        const filterOptionsContainer = this.panel.querySelector('.filter-options-container');
        
        if (!overlay || !container) return;
        
        // Prevent touch events from reaching the game when touching the overlay
        // But allow scrolling within the table wrapper
        overlay.addEventListener('touchstart', (e) => {
            // Allow touches on buttons and interactive elements
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.filter-option')) {
                return; // Let buttons handle their own touches
            }
            // Allow touches on the scrollable table wrapper
            if (tableWrapper && tableWrapper.contains(e.target)) {
                return; // Let native scrolling work
            }
            e.stopPropagation();
        }, { passive: true });
        
        overlay.addEventListener('touchmove', (e) => {
            // Allow scrolling in the table wrapper
            if (tableWrapper && tableWrapper.contains(e.target)) {
                return; // Let native scrolling work
            }
            // Allow scrolling in filter modal options
            if (filterOptionsContainer && filterOptionsContainer.contains(e.target)) {
                return; // Let native scrolling work
            }
            // Stop propagation for other areas
            if (!e.target.closest('button') && !e.target.closest('input')) {
                e.stopPropagation();
            }
        }, { passive: true });
        
        overlay.addEventListener('touchend', (e) => {
            // Allow button clicks
            if (e.target.closest('button') || e.target.closest('.filter-option')) {
                return; // Let buttons handle their own touches
            }
            // Allow touches on the scrollable table wrapper
            if (tableWrapper && tableWrapper.contains(e.target)) {
                return; // Let native scrolling work
            }
            e.stopPropagation();
        }, { passive: true });
        
        // Handle scrolling in table wrapper (the actual scrollable element)
        if (tableWrapper) {
            tableWrapper.style.webkitOverflowScrolling = 'touch';
            tableWrapper.style.overscrollBehavior = 'contain';
            tableWrapper.style.touchAction = 'pan-y';
            
            // Stop propagation to prevent game input, but allow native scrolling
            tableWrapper.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            tableWrapper.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            tableWrapper.addEventListener('touchend', (e) => {
                e.stopPropagation();
            }, { passive: true });
        }
        
        // Handle scrolling in filter modal options (vertical scrolling like rod shop horizontal)
        if (filterOptionsContainer && filterModal) {
            filterOptionsContainer.style.webkitOverflowScrolling = 'touch';
            filterOptionsContainer.style.overscrollBehavior = 'contain';
            filterOptionsContainer.style.touchAction = 'pan-y';
            
            // Prevent touch events from reaching the game when touching the modal
            // But allow scrolling within the filter options container
            filterModal.addEventListener('touchstart', (e) => {
                // Only stop propagation if not touching the scroll container
                if (!filterOptionsContainer.contains(e.target)) {
                    e.stopPropagation();
                }
            }, { passive: true });
            
            filterModal.addEventListener('touchmove', (e) => {
                // Allow scrolling in the container, but prevent other touches from reaching game
                if (!filterOptionsContainer.contains(e.target)) {
                    e.stopPropagation();
                }
            }, { passive: true });
            
            filterModal.addEventListener('touchend', (e) => {
                // Only stop propagation if not touching the scroll container
                if (!filterOptionsContainer.contains(e.target)) {
                    e.stopPropagation();
                }
            }, { passive: true });
            
            // Handle scrolling within the filter options container (vertical)
            let touchStartY = 0;
            let hasScrolled = false;
            
            filterOptionsContainer.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                hasScrolled = false;
                // Stop propagation to prevent game from receiving touch
                e.stopPropagation();
            }, { passive: true });
            
            filterOptionsContainer.addEventListener('touchmove', (e) => {
                const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
                
                // If vertical movement is significant, mark as scrolling
                if (deltaY > 5) {
                    hasScrolled = true;
                }
                // Stop propagation to prevent game from receiving touch
                e.stopPropagation();
            }, { passive: true });
            
            // Handle touchend - allow option selection if not scrolling
            filterOptionsContainer.addEventListener('touchend', (e) => {
                // Stop propagation to prevent game from receiving touch
                e.stopPropagation();
                
                // Allow option selection if we didn't scroll
                if (!hasScrolled && e.target.closest('.filter-option')) {
                    // Let the option handle its own click
                    const option = e.target.closest('.filter-option');
                    if (option) {
                        option.click();
                    }
                }
                
                hasScrolled = false;
            }, { passive: true });
        }
    },
    
    toggle: function() {
        console.log("[LEADERBOARD] Toggling panel");
        if (!this.isInitialized) {
            this.initialize();
        }
        
        if (this.isShowing()) {
            this.hide();
        } else {
            this.show();
        }
    },

    createMobileLeaderboard: function() {
        // Only create this once
        if (this.mobileLeaderboardCreated) return;
        
        console.log("[LEADERBOARD] Creating mobile-specific leaderboard");
        
        // Create mobile leaderboard container
        const mobileLeaderboard = document.createElement('div');
        mobileLeaderboard.id = 'mobile-leaderboard-container';
        mobileLeaderboard.className = 'mobile-leaderboard';
        mobileLeaderboard.style.display = 'none';
        
        // Create the content
        mobileLeaderboard.innerHTML = `
            <div class="mobile-leaderboard-overlay">
                <div class="mobile-leaderboard-panel">
                    <div class="mobile-panel-header">
                        <h2>Leaderboard</h2>
                        <div class="mobile-close-button">×</div>
                    </div>
                    <div class="mobile-panel-controls">
                        <div class="mobile-sorting-options">
                            <button class="sort-by-value active">Sort by Value</button>
                            <button class="sort-by-weight">Sort by Weight</button>
                        </div>
                        <div class="mobile-filter-button">
                            <span class="filter-icon">🔍</span>
                            <span class="filter-text">Filter</span>
                        </div>
                    </div>
                    
                    <div class="mobile-filter-dropdown">
                        <div class="filter-header">Filter by Fish Type</div>
                        <div class="filter-options">
                            <!-- Fish type options will be added here -->
                        </div>
                    </div>
                    
                    <div class="mobile-panel-content">
                        <div class="mobile-leaderboard-loading">Loading leaderboard data...</div>
                        <table class="mobile-leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Fish Type</th>
                                    <th>Weight</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Leaderboard entries will go here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(mobileLeaderboard);
        
        // Add mobile-specific styles
        const mobileStyles = document.createElement('style');
        mobileStyles.id = 'mobile-leaderboard-styles';
        mobileStyles.textContent = `
            .mobile-leaderboard-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            
            .mobile-leaderboard-panel {
                background-color: #222;
                border: 2px solid #4a90e2;
                border-radius: 10px;
                width: 92vw;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }
            
            .mobile-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: #333;
                padding: 12px 16px;
                border-bottom: 1px solid #4a90e2;
                border-radius: 8px 8px 0 0;
            }
            
            .mobile-panel-header h2 {
                color: #fff;
                margin: 0;
                font-size: 20px;
            }
            
            .mobile-close-button {
                color: #fff;
                font-size: 28px;
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .mobile-panel-controls {
                display: flex;
                padding: 8px;
                background-color: #2a2a2a;
                border-bottom: 1px solid #444;
            }
            
            .mobile-sorting-options {
                display: flex;
                flex: 3;
            }
            
            .mobile-sorting-options button {
                flex: 1;
                padding: 8px;
                background-color: #333;
                border: 1px solid #555;
                color: #ccc;
                font-size: 14px;
                margin: 0 4px;
                border-radius: 4px;
            }
            
            .mobile-sorting-options button.active {
                background-color: #4a90e2;
                color: white;
                border-color: #2a6cb6;
            }
            
            .mobile-filter-button {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #444;
                border-radius: 4px;
                margin-left: 8px;
                color: white;
                cursor: pointer;
                padding: 0 10px;
            }
            
            .mobile-filter-button:active {
                background-color: #4a90e2;
            }
            
            .filter-icon {
                margin-right: 5px;
            }
            
            .mobile-filter-dropdown {
                display: none;
                background-color: #2a2a2a;
                border-bottom: 1px solid #444;
                padding: 8px 12px;
            }
            
            .mobile-filter-dropdown.active {
                display: block;
            }
            
            .filter-header {
                color: #ccc;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .filter-options {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .fish-filter-option {
                background-color: #333;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 8px 12px;
                color: #ccc;
                font-size: 14px;
                cursor: pointer;
            }
            
            .fish-filter-option.active {
                background-color: #4a90e2;
                color: white;
                border-color: #2a6cb6;
            }
            
            .mobile-panel-content {
                padding: 10px;
                overflow-y: auto;
                flex: 1;
                -webkit-overflow-scrolling: touch; /* For smoother scrolling on iOS */
            }
            
            .mobile-leaderboard-loading {
                color: #ccc;
                text-align: center;
                padding: 20px;
            }
            
            .mobile-leaderboard-table {
                width: 100%;
                border-collapse: collapse;
                color: #fff;
            }
            
            .mobile-leaderboard-table th,
            .mobile-leaderboard-table td {
                padding: 12px 8px;
                text-align: left;
                border-bottom: 1px solid #444;
                font-size: 14px;
            }
            
            .mobile-leaderboard-table th {
                background-color: #2a2a2a;
                color: #ccc;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            
            .mobile-leaderboard-table tr:nth-child(even) {
                background-color: rgba(255, 255, 255, 0.05);
            }
            
            .mobile-leaderboard-table .fish-legendary {
                color: #ffd700;
            }
            
            .mobile-leaderboard-table .fish-rare {
                color: #ff9800;
            }
            
            .mobile-leaderboard-table .fish-uncommon {
                color: #4caf50;
            }
            
            .mobile-leaderboard-table .fish-common {
                color: #03a9f4;
            }
            
        `;
        document.head.appendChild(mobileStyles);
        
        // Set up event handlers
        this.setupMobileLeaderboardEvents();
        
        this.mobileLeaderboardCreated = true;
        this.currentFishFilter = 'all';
    },

    setupMobileLeaderboardEvents: function() {
        // Close button
        const closeButton = document.querySelector('.mobile-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideMobileLeaderboard();
            });
        }
        
        // Sort by value button
        const sortByValueBtn = document.querySelector('.sort-by-value');
        if (sortByValueBtn) {
            sortByValueBtn.addEventListener('click', () => {
                document.querySelector('.sort-by-value').classList.add('active');
                document.querySelector('.sort-by-weight').classList.remove('active');
                this.mobileSortBy = 'value';
                this.updateMobileLeaderboard();
            });
        }
        
        // Sort by weight button
        const sortByWeightBtn = document.querySelector('.sort-by-weight');
        if (sortByWeightBtn) {
            sortByWeightBtn.addEventListener('click', () => {
                document.querySelector('.sort-by-weight').classList.add('active');
                document.querySelector('.sort-by-value').classList.remove('active');
                this.mobileSortBy = 'weight';
                this.updateMobileLeaderboard();
            });
        }
        
        // Filter button
        const filterButton = document.querySelector('.mobile-filter-button');
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                const filterDropdown = document.querySelector('.mobile-filter-dropdown');
                filterDropdown.classList.toggle('active');
                
                // Only populate options if they're not already populated
                if (filterDropdown.classList.contains('active') && 
                    document.querySelectorAll('.fish-filter-option').length === 0) {
                    this.populateMobileFilterOptions();
                }
            });
        }
        
        // Note: Quest button is now created by MobileControlsPanel.js and opens PlayerProgressPanel
        // No leaderboard button needed here anymore
    },

    populateMobileFilterOptions: function() {
        const filterOptions = document.querySelector('.filter-options');
        if (!filterOptions) return;
        
        // Clear existing options
        filterOptions.innerHTML = '';
        
        // Get unique fish types from data
        const fishTypes = ['all'];
        if (this.allLeaderboardData && this.allLeaderboardData.length > 0) {
            this.allLeaderboardData.forEach(entry => {
                if (entry.fishType && !fishTypes.includes(entry.fishType)) {
                    fishTypes.push(entry.fishType);
                }
            });
        }
        
        // Create filter options
        fishTypes.forEach(fishType => {
            const option = document.createElement('div');
            option.className = 'fish-filter-option' + (fishType === this.currentFishFilter ? ' active' : '');
            option.textContent = fishType === 'all' ? 'All Fish Types' : fishType;
            option.dataset.fishType = fishType;
            
            option.addEventListener('click', () => {
                // Update selected filter
                document.querySelectorAll('.fish-filter-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                option.classList.add('active');
                
                // Update filter and refresh display
                this.currentFishFilter = fishType;
                this.updateMobileLeaderboard();
                
                // Hide the dropdown
                document.querySelector('.mobile-filter-dropdown').classList.remove('active');
            });
            
            filterOptions.appendChild(option);
        });
    },

    updateMobileLeaderboard: function() {
        if (!this.allLeaderboardData) {
            console.error("[LEADERBOARD] No leaderboard data available for mobile view");
            return;
        }
        
        console.log("[LEADERBOARD] Updating mobile leaderboard:", {
            totalEntries: this.allLeaderboardData.length,
            currentFilter: this.currentFishFilter,
            sortBy: this.mobileSortBy,
            fishTypes: [...new Set(this.allLeaderboardData.map(e => e.fishType))]
        });
        
        const tbody = document.querySelector('.mobile-leaderboard-table tbody');
        const loadingElem = document.querySelector('.mobile-leaderboard-loading');
        
        if (!tbody || !loadingElem) {
            console.error("[LEADERBOARD] Could not find table body or loading element");
            return;
        }
        
        // Hide loading indicator
        loadingElem.style.display = 'none';
        
        // Clear current table
        tbody.innerHTML = '';
        
        // Filter data by fish type
        let filteredData = [...this.allLeaderboardData];
        if (this.currentFishFilter !== 'all') {
            filteredData = filteredData.filter(entry => entry.fishType === this.currentFishFilter);
        }
        
        console.log("[LEADERBOARD] After filter:", filteredData.length, "entries");
        
        // Sort data
        if (this.mobileSortBy === 'value') {
            filteredData.sort((a, b) => b.value - a.value);
        } else {
            filteredData.sort((a, b) => b.weight - a.weight);
        }
        
        // Check if we have data
        if (filteredData.length === 0) {
            console.warn("[LEADERBOARD] No entries to display after filtering!");
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 20px;">
                    No fish found with the selected filter. Try a different filter.
                </td>
            `;
            tbody.appendChild(emptyRow);
            return;
        }
        
        // Add rows to table - limit to 100 entries to prevent performance issues
        const displayLimit = 100;
        const displayData = filteredData.slice(0, displayLimit);
        
        displayData.forEach((entry, index) => {
            const row = document.createElement('tr');
            
            // Determine fish rarity class
            let rarityClass = '';
            if (entry.rarity) {
                rarityClass = `fish-${entry.rarity.toLowerCase()}`;
            }
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.playerName || 'Unknown'}</td>
                <td class="${rarityClass}">${entry.fishType || 'Unknown'}</td>
                <td>${entry.weight ? entry.weight.toFixed(2) : '0.00'} lbs</td>
                <td>$${entry.value || 0}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log(`[LEADERBOARD] Added ${displayData.length} rows to mobile table`);
        
        // Show message if we limited the displayed entries
        if (filteredData.length > displayLimit) {
            const limitMessage = document.createElement('tr');
            limitMessage.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 10px; font-style: italic; color: #888;">
                    Showing top ${displayLimit} of ${filteredData.length} entries
                </td>
            `;
            tbody.appendChild(limitMessage);
        }
    },

    showMobileLeaderboard: function() {
        // Create if not already created
        this.createMobileLeaderboard();
        
        const mobileLeaderboard = document.getElementById('mobile-leaderboard-container');
        if (mobileLeaderboard) {
            console.log("[LEADERBOARD] Showing mobile leaderboard");
            mobileLeaderboard.style.display = 'block';
            
            // Disable player controls
            hytopia.sendData({
                type: 'disablePlayerInput'
            });
            
            // Reset to show all fish types by default
            this.mobileSortBy = 'value';
            this.currentFishFilter = 'all';
            
            // Update sort button visuals to match
            const valueBtn = document.querySelector('.sort-by-value');
            const weightBtn = document.querySelector('.sort-by-weight');
            if (valueBtn && weightBtn) {
                valueBtn.classList.add('active');
                weightBtn.classList.remove('active');
            }
            
            // Reset filter dropdown state
            const filterDropdown = document.querySelector('.mobile-filter-dropdown');
            if (filterDropdown) {
                filterDropdown.classList.remove('active');
            }
            
            // Request fresh data
            console.log("[LEADERBOARD] Requesting fresh data for mobile view");
            this.requestLeaderboardData();
            
            // Show loading indicator while waiting for data
            const loadingElem = document.querySelector('.mobile-leaderboard-loading');
            if (loadingElem) loadingElem.style.display = 'block';
            
            // Also update with existing data if available
            if (this.allLeaderboardData && this.allLeaderboardData.length > 0) {
                console.log("[LEADERBOARD] Using existing data while waiting for update");
                setTimeout(() => this.updateMobileLeaderboard(), 100); // Short delay to ensure UI is ready
            }
        }
    },

    hideMobileLeaderboard: function() {
        const mobileLeaderboard = document.getElementById('mobile-leaderboard-container');
        if (mobileLeaderboard) {
            mobileLeaderboard.style.display = 'none';
            
            // Re-enable player controls
            hytopia.sendData({
                type: 'enablePlayerInput'
            });
        }
    },

    toggleMobileLeaderboard: function() {
        const mobileLeaderboard = document.getElementById('mobile-leaderboard-container');
        if (mobileLeaderboard && mobileLeaderboard.style.display === 'block') {
            this.hideMobileLeaderboard();
        } else {
            this.showMobileLeaderboard();
        }
    },
    
};

// Initialize the leaderboard
window.LeaderboardPanel.initialize();

console.log("[LEADERBOARD] Module loaded");