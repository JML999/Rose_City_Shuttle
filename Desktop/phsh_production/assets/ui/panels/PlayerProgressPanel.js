class PlayerProgressPanel {
    constructor() {
        this.container = null;
        this.progressOpen = false;
        this.progressElement = null;
        
        // Data storage
        this.questData = [];
        this.inventoryData = null;
        
        // State management following the example pattern
        this.progressState = {
            activeQuests: new Map(),
            completedQuests: new Map(),
            phshdexData: null,
            selectedItemId: null,
            selectedItemType: null, // 'quest' or 'species'
            currentTab: 'quests' // 'quests' or 'phshdex'
        };
        

    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`[PlayerProgressPanel] Container with ID '${containerId}' not found.`);
            return;
        }

        this.createProgressUI();
        this.addStyles();
        this.setupEventListeners();
        

    }

    createProgressUI() {
        this.progressElement = document.createElement('div');
        this.progressElement.className = 'quests-overlay';
        this.progressElement.style.display = 'none';

        this.progressElement.innerHTML = `
            <div class="quests-container">
                <!-- Header Section -->
                <div class="quests-header">
                    <h2 class="quests-title">Player Progress</h2>
                    <button class="quests-close">×</button>
                </div>
                
                <!-- Tab Navigation -->
                <div class="progress-tabs">
                    <button class="progress-tab active" data-tab="quests">Quests</button>
                    <button class="progress-tab" data-tab="phshdex">Phshdex</button>
                </div>

                <!-- Content Area -->
                <div class="quests-content">
                    <!-- Left Sidebar (for quests) -->
                    <div class="quests-sidebar" id="quests-sidebar">
                        <!-- Will be populated by renderQuestsTab -->
                    </div>
                    
                    <!-- Main Content Area -->
                    <div class="quests-main-area">
                        <!-- Content will be populated based on active tab -->
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.progressElement);
        

    }

    setupEventListeners() {

        
        // Key listener for 'P' to toggle
        document.addEventListener('keydown', (e) => {
            if (this.isInputElementActive()) return;
            if (window.MerchantPanel?.isMerchantDialogOpen) return;
            
            if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.progressOpen) {
                e.preventDefault();
                this.closeProgress();
            }
        });
        
        // Prevent overlay clicks from closing (only close button should close)
        // This prevents accidental closes when tapping on mobile
        if (this.progressElement) {
            this.progressElement.addEventListener('click', (e) => {
                // Only close if clicking directly on the overlay background (not on container)
                if (e.target === this.progressElement) {
                    e.stopPropagation();
                    // Don't close on overlay click - user must use close button
                }
            });
        }

        // Setup mobile interactions if mobile
        this.setupMobileInteractions();

        // Listen for data updates
        hytopia.onData((data) => {
            switch (data.type) {
                case 'questTrackerUpdate':

                    this.questData = data.trackedQuests || [];
                    this.populateQuestData();
                    if (this.progressOpen && this.progressState.currentTab === 'quests') {
                        this.renderQuestsTab();
                    }
                    break;
                case 'phshdexUpdate':
                    this.progressState.phshdexData = data.phshdexData;
                    if (this.progressOpen && this.progressState.currentTab === 'phshdex') {
                        this.renderPhshdexTab();
                    }
                    break;
                case 'inventoryUpdate':

                    // Store inventory for phshdex analysis
                    this.inventoryData = data.inventory;
                    if (this.progressOpen) {
                        hytopia.sendData({ type: 'requestPhshdexData' });
                    }
                    break;
            }
        });
        
        // Setup UI element event listeners
        this.setupUIEventListeners();
        

    }

    setupUIEventListeners() {
        // Close button
        const closeButton = this.progressElement.querySelector('.quests-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeProgress());
            
            // Mobile touch handling for close button
            if (hytopia.isMobile) {
                closeButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    closeButton.style.transform = 'scale(0.95)';
                });
                closeButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    closeButton.style.transform = '';
                    setTimeout(() => this.closeProgress(), 100);
                });
            }
        }

        // Tab buttons
        const tabButtons = this.progressElement.querySelectorAll('.progress-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
            
            // Mobile touch handling for tabs
            if (hytopia.isMobile) {
                this.setupMobileTabHandling(button);
            }
        });
    }

    setupMobileTabHandling(button) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.style.transform = 'scale(0.95)';
            button.style.opacity = '0.8';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.style.transform = '';
            button.style.opacity = '';
            
            const tabName = button.dataset.tab;
            setTimeout(() => this.switchTab(tabName), 50);
        });
        
        button.addEventListener('touchcancel', (e) => {
            button.style.transform = '';
            button.style.opacity = '';
        });
    }

    isInputElementActive() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable === true ||
            activeElement.closest('#chat-input')
        );
    }

    toggle() {
        if (this.progressOpen) {
            this.closeProgress();
        } else {
            this.openProgress();
        }
    }

    openProgress() {

        this.progressOpen = true;
        this.progressElement.style.display = 'flex';
        
        // Lock pointer like frontiers example
        if (hytopia.lockPointer) {
            hytopia.lockPointer(false, true);
        }
        
        // Apply mobile styles if needed
        if (hytopia.isMobile) {
            this.applyMobileStyles();
            this.hideMobileControls();
        }
        
        // Disable player input and request data
        hytopia.sendData({ type: 'disablePlayerInput' });
        hytopia.sendData({ type: 'requestPlayerProgress' });
        hytopia.sendData({ type: 'requestQuestData' }); // Request quest data like QuestTrackerPanel
        hytopia.sendData({ type: 'requestInventory' }); // Request inventory data for phshdex
        
        // Render initial state
        this.renderProgressLists();
        this.updateEmptyState();
    }

    closeProgress() {

        this.progressOpen = false;
        this.progressElement.style.display = 'none';
        
        // Unlock pointer like frontiers example
        if (hytopia.lockPointer) {
            hytopia.lockPointer(true);
        }
        
        // Restore mobile controls if needed
        if (hytopia.isMobile) {
            this.showMobileControls();
            this.restoreDesktopStyles();
        }
        
        // Re-enable player input
        hytopia.sendData({ type: 'enablePlayerInput' });
    }

    // Process quest data and separate into active/completed
    populateQuestData() {
        if (!this.questData || !Array.isArray(this.questData)) {
            return;
        }

        // Clear existing quest data
        this.progressState.activeQuests.clear();
        this.progressState.completedQuests.clear();

        // Process each quest and categorize
        this.questData.forEach(questData => {
            if (!questData || !questData.definition || !questData.progress) {
                console.warn('[PlayerProgressPanel] Invalid quest data received. Skipping.', questData);
                return;
            }

            const definition = questData.definition;
            const progress = questData.progress;
            const questId = definition.id;

            // Check if quest is completed by examining objectives
            const isCompleted = this.isQuestCompleted(definition, progress);
            
            // Store in appropriate category
            if (isCompleted) {
                this.progressState.completedQuests.set(questId, questData);
            } else {
                this.progressState.activeQuests.set(questId, questData);
            }
        });


    }

    // Helper method to determine if a quest is completed (discharged)
    isQuestCompleted(definition, progress) {
        // If quest requires turn-in, it's NOT completed until turned in
        // Keep it in active section until discharge
        if (progress.requiresTurnIn === true) {
            return false; // Still needs turn-in, keep in active
        }
        
        // Check if quest status is actually 'completed' (discharged/turned in)
        // Note: sendActiveQuestsUpdate() only sends active quests, so this check is defensive
        if (progress.status === 'completed') {
            return true; // Quest has been discharged
        }
        
        // For auto-complete quests (no turn-in required), check if objectives are met
        if (!definition.objectives || definition.objectives.length === 0) {
            return false;
        }

        // Check if all objectives are completed (for auto-complete quests only)
        const allObjectivesMet = definition.objectives.every((objective, index) => {
            const objectiveProgress = progress.objectivesProgress[index] || 0;
            return objectiveProgress >= objective.count;
        });
        
        // Only consider completed if objectives are met AND it doesn't require turn-in
        return allObjectivesMet;
    }

    updatePhshdexData(phshdexData) {
        if (!phshdexData || !phshdexData.phshdexData) {
            return;
        }

        // Store the phshdex data in progressState
        this.progressState.phshdexData = phshdexData.phshdexData;

        // Re-render the phshdex tab if the panel is open and on phshdex tab
        if (this.progressOpen && this.progressState.currentTab === 'phshdex') {
            this.renderPhshdexTab();
        }
    }

    updateAllProgressData(data) {
    }

    switchTab(tabName) {

        
        // Update tab state
        this.progressState.currentTab = tabName;
        
        // Update tab button states - use proper scoping to find buttons within our panel
        const allTabs = this.progressElement.querySelectorAll('.progress-tab');
        
        allTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = this.progressElement.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            console.error(`[PlayerProgressPanel] Could not find tab with data-tab="${tabName}"`);
        }
        
        // Clear selections when switching tabs
        this.clearSelections();
        
        // Render content for active tab
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        const mainArea = document.querySelector('.quests-main-area');
        if (!mainArea) return;

        if (this.progressState.currentTab === 'quests') {
            this.renderQuestsTab();
        } else if (this.progressState.currentTab === 'phshdex') {
            this.renderPhshdexTab();
        }
    }

    renderQuestsTab() {
        const sidebar = document.getElementById('quests-sidebar');
        const mainArea = document.querySelector('.quests-main-area');
        
        if (!sidebar || !mainArea) return;

        // Show sidebar for quests
        sidebar.style.display = 'flex';

        // Populate sidebar with quest sections
        sidebar.innerHTML = `
            <!-- Active Quests Section -->
            <div class="quests-section">
                <h3 class="quests-section-title">Active Quests</h3>
                <div class="quests-list" id="quests-active-list">
                    <!-- Active quests will be populated below -->
                </div>
            </div>
            
            <!-- Completed Quests Section REMOVED - Freeing up space for active quests -->
        `;

        // Populate main area with quest details panel
        mainArea.innerHTML = `
            <div class="quests-details-panel">
                <div class="quests-details-content" id="quests-details-content" style="display: none;">
                    <!-- Quest details will be populated when quest is selected -->
                </div>
                
                <!-- Empty state when no quest is selected -->
                <div class="quests-empty-state" id="quests-empty-state">
                    <div class="quests-empty-content">
                        <div class="quests-empty-icon">📋</div>
                        <div class="quests-empty-text">Select a quest to view details!</div>
                    </div>
                </div>
            </div>
        `;

        // Populate quest lists
        this.renderQuestList(document.getElementById('quests-active-list'), this.progressState.activeQuests, 'active');
        // Completed quests section removed - not rendering completed quests to free up space for active quests
        
        // Update empty states
        this.updateQuestsEmptyState();
    }

    renderQuestList(listElement, questMap, questType) {
        // Clear previous content
        listElement.innerHTML = '';
        
        if (questMap.size === 0) {
            const emptyMessage = questType === 'active' ? 'No active quests' : 'No completed quests';
            listElement.innerHTML = `<div class="quests-empty-message">${emptyMessage}</div>`;
            return;
        }

        // Create quest items
        for (const [questId, questData] of questMap) {
            const questItem = this.createQuestItem(questId, questData, questType);
            listElement.appendChild(questItem);
        }
    }

    createQuestItem(questId, questData, questType) {
        const questItem = document.createElement('div');
        const isSelected = this.progressState.selectedQuestId === questId;
        const isCompleted = questType === 'completed';
        
        questItem.className = `quests-item${isCompleted ? ' quests-item-completed' : ''}${isSelected ? ' quests-item-selected' : ''}`;
        questItem.dataset.questId = questId;
        
        // Calculate progress
        const definition = questData.definition;
        const progress = questData.progress;
        let completedObjectives = 0;
        let totalObjectives = definition.objectives ? definition.objectives.length : 0;
        
        if (definition.objectives) {
            completedObjectives = definition.objectives.filter((objective, index) => {
                const objectiveProgress = progress.objectivesProgress[index] || 0;
                return objectiveProgress >= objective.count;
            }).length;
        }
        
        const progressText = isCompleted ? '✓' : `${completedObjectives}/${totalObjectives}`;
        
        questItem.innerHTML = `
            <div class="quests-item-name">${definition.title || 'Unknown Quest'}</div>
            <div class="quests-item-progress">${progressText}</div>
        `;
        
        questItem.addEventListener('click', () => this.selectQuest(questId, questData, questType));
        return questItem;
    }

    selectQuest(questId, questData, questType) {
        // Clear previous selection
        this.clearSelections();
        
        // Set new selection
        this.progressState.selectedQuestId = questId;
        
        // Highlight selected item
        const questItem = document.querySelector(`[data-quest-id="${questId}"]`);
        if (questItem) {
            questItem.classList.add('quests-item-selected');
        }
        
        // Show quest details
        this.showQuestDetails(questData, questType);
    }

    showQuestDetails(questData, questType) {
        const detailsContent = document.getElementById('quests-details-content');
        const emptyState = document.getElementById('quests-empty-state');
        
        if (!detailsContent) return;

        const definition = questData.definition;
        const progress = questData.progress;
        const dynamicData = questData.dynamicData;
        const nextStepMessage = questData.nextStepMessage;

        // Hide empty state, show details
        if (emptyState) emptyState.style.display = 'none';
        detailsContent.style.display = 'block';

        // Generate quest details HTML
        detailsContent.innerHTML = `
            <div class="quest-detail-header">
                <h3 class="quest-detail-title">${definition.title || 'Untitled Quest'}</h3>
                <span class="quest-status-badge ${questType}">${questType === 'completed' ? 'Completed' : 'Active'}</span>
            </div>

            ${definition.description ? `<div class="quest-detail-description">${definition.description}</div>` : ''}

            <div class="quest-detail-objectives">
                <h4>Objectives:</h4>
                <ul>
                    ${this.generateObjectivesList(definition, progress, dynamicData)}
                </ul>
                ${nextStepMessage ? `<div class="quest-next-step" style="margin-top: 12px; padding: 8px 12px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4caf50; border-radius: 4px; color: #4caf50; font-weight: 500;">🎯 ${nextStepMessage}</div>` : ''}
            </div>
        `;
    }

    generateObjectivesList(definition, progress, dynamicData) {
        if (!definition.objectives || definition.objectives.length === 0) {
            return '<li>No objectives defined.</li>';
        }

        return definition.objectives.map((objective, index) => {
            const objectiveProgress = progress.objectivesProgress[index] || 0;
            const isCompleted = objectiveProgress >= objective.count;
            
            // Generate objective text (similar to QuestTrackerPanel)
            let objectiveText = this.getObjectiveText(objective, dynamicData, definition);
            
            // Add progress count
            if (objective.count > 1) {
                objectiveText += ` (${objectiveProgress}/${objective.count})`;
            } else if (isCompleted && objective.count === 1) {
                objectiveText += ` (1/1)`;
            } else if (!isCompleted && objective.count === 1) {
                objectiveText += ` (0/1)`;
            }

            const completedClass = isCompleted ? ' class="completed"' : '';
            return `<li${completedClass}>${objectiveText}</li>`;
        }).join('');
    }

    // Copy the objective text generation from QuestTrackerPanel
    getObjectiveText(objective, dynamicData, questDefinition) {
        
        if (!objective || !objective.type) {
            console.warn('[PlayerProgressPanel] Invalid objective passed to getObjectiveText:', objective);
            return "Unknown objective";
        }
        
        let text = "Unknown objective";
        const isDailyQuest = questDefinition?.repeatable === 'daily' || questDefinition?.id?.startsWith('daily_');
        const xpReward = questDefinition?.rewards?.experience || 0;

        // Priority: Use objective.description if available
        if (objective.description) {
            text = objective.description;
        }
        // Fallback: Generate text based on type if no description
        else {
            switch (objective.type) {
                case 'catchFish':
                    if (objective.fishType) {
                        text = `Catch ${objective.count || 1} ${objective.fishType}`;
                    } else {
                        text = `Catch ${objective.count || 1} fish`;
                    }
                    break;
                case 'gatherItem':
                    text = `Gather ${objective.count || 1} ${objective.itemId || 'item'}`;
                    break;
                case 'reachLevel':
                    text = `Reach Level ${objective.count}`; // Using count as target level
                    break;
                case 'talkToNpc':
                    text = `Talk to ${objective.targetNpcId || 'NPC'}`;
                    break;
                case 'useBaitType':
                    const baitName = objective.baitType ? objective.baitType.charAt(0).toUpperCase() + objective.baitType.slice(1).replace(/_/g, ' ') : 'bait';
                    text = `Use ${objective.count || 1} ${baitName}`;
                    break;
                case 'useBait':
                    text = `Use ${objective.count || 1} bait`;
                    break;
                case 'openChests':
                    text = `Open ${objective.count || 1} treasure chest${objective.count !== 1 ? 's' : ''}`;
                    break;
                case 'fishAtLocations':
                    text = `Fish at ${objective.count || 1} different location${objective.count !== 1 ? 's' : ''}`;
                    break;
                case 'catchRarity':
                    const rarityName = objective.targetRarity ? objective.targetRarity.charAt(0).toUpperCase() + objective.targetRarity.slice(1) : 'fish';
                    text = `Catch ${objective.count || 1} ${rarityName} fish`;
                    break;
                case 'weighFish':
                    text = `Weigh ${objective.count || 1} different fish`;
                    break;
                case 'weighFishByWeight':
                    const weightThreshold = objective.weightThreshold || objective.minWeight || 50;
                    if (objective.count && objective.count > 1) {
                        text = `Weigh ${objective.count} ${weightThreshold}+ pound fish`;
                    } else {
                        text = `Weigh a ${weightThreshold}+ pound fish`;
                    }
                    break;
                case 'weighLeaderboardFish':
                    text = `Weigh a fish that makes the leaderboard`;
                    break;
                // Add more cases for other objective types
            }
        }

        // --- For Daily Quests: Make objectives more descriptive ---
        if (isDailyQuest && xpReward > 0) {
            // Transform objective text to be more descriptive
            // Example: "Use 25 bait" -> "Earn an extra 25 XP automatically when you use 25 bait"
            text = `Earn an extra ${xpReward} XP automatically when you ${text.toLowerCase()}`;
        }

        // Placeholder Replacement
        // Specific handling for sea_story_catch placeholders
        if (questDefinition?.id === 'sea_story_catch') {
            const targetFish = dynamicData?.targetFishType || 'the target fish';
            text = text.replace(/\[FISH_TYPE\]/gi, targetFish);
            text = text.replace(/\[DYNAMIC_FISH_TYPE\]/gi, targetFish);
        }

        return text;
    }

    renderPhshdexTab() {
        const sidebar = document.getElementById('quests-sidebar');
        const mainArea = document.querySelector('.quests-main-area');
        if (!mainArea) return;

        // Hide sidebar for phshdex and make main area full width
        if (sidebar) {
            sidebar.style.display = 'none';
        }

        // Check if we have phshdex data
        const phshdexData = this.progressState.phshdexData;
        
        if (!phshdexData || !phshdexData.speciesRecords || Object.keys(phshdexData.speciesRecords).length === 0) {
            // Show empty state
            mainArea.innerHTML = `
                <div class="quests-content-area">
                    <div class="quest-empty-state">
                        <div class="quest-empty-icon">🐠</div>
                        <div class="quest-empty-title">Your Phshdex is Empty</div>
                        <div class="quest-empty-message">Start fishing to discover and catalog different fish species!</div>
                    </div>
                </div>
            `;
            return;
        }

        const { speciesRecords, overallStats } = phshdexData;
        const speciesCount = Object.keys(speciesRecords).length;

        mainArea.innerHTML = `
            <div class="phshdex-content">
                <!-- Overview Stats Header -->
                <div class="phshdex-overview">
                    <div class="phshdex-title">
                        <h2>🐟 Phshdex Overview</h2>
                        <div class="phshdex-subtitle">${speciesCount} Species Discovered</div>
                    </div>
                    
                    <div class="phshdex-stats">
                        <div class="phshdex-stat-card">
                            <div class="phshdex-stat-value">${overallStats.biggestValueCatch?.value || 0}</div>
                            <div class="phshdex-stat-label">Most Valuable</div>
                            <div class="phshdex-stat-detail">${overallStats.biggestValueCatch?.speciesName || 'None'} (${(overallStats.biggestValueCatch?.weight || 0).toFixed(2)}lb)</div>
                        </div>
                        <div class="phshdex-stat-card">
                            <div class="phshdex-stat-value">${(overallStats.largestWeightCatch?.weight || 0).toFixed(2)}lb</div>
                            <div class="phshdex-stat-label">Largest Catch</div>
                            <div class="phshdex-stat-detail">${overallStats.largestWeightCatch?.speciesName || 'None'}</div>
                        </div>
                        <div class="phshdex-stat-card">
                            <div class="phshdex-stat-value">${(overallStats.totalValueEarned || 0).toLocaleString()}</div>
                            <div class="phshdex-stat-label">Total Earned</div>
                            <div class="phshdex-stat-detail">${overallStats.totalFishCaught || 0} fish caught</div>
                        </div>
                        <div class="phshdex-stat-card">
                            <div class="phshdex-stat-value">${(overallStats.totalXP || 0).toLocaleString()}</div>
                            <div class="phshdex-stat-label">Total XP</div>
                            <div class="phshdex-stat-detail">Experience earned</div>
                        </div>
                    </div>
                </div>

                <!-- Species Search and List -->
                <div class="phshdex-species-section">
                    <div class="phshdex-search-bar">
                        <input type="text" 
                               id="phshdex-search" 
                               placeholder="Search species..."
                               class="phshdex-search-input">
                        <div class="phshdex-sort-options">
                            <select id="phshdex-sort" class="phshdex-sort-select">
                                <option value="value">Sort by Value</option>
                                <option value="weight">Sort by Weight</option>
                                <option value="name">Sort by Name</option>
                                <option value="rarity">Sort by Rarity</option>
                                <option value="caught">Sort by Count</option>
                            </select>
                        </div>
                    </div>

                    <div class="phshdex-species-list" id="phshdex-species-list">
                        ${this.renderSpeciesList(speciesRecords)}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for search and sort
        this.setupPhshdexControls();
    }

    renderSpeciesList(speciesRecords, searchTerm = '', sortBy = 'value') {
        // Convert to array and filter by search term
        let speciesArray = Object.values(speciesRecords);
        
        if (searchTerm) {
            speciesArray = speciesArray.filter(species => 
                species.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort the species
        speciesArray.sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    return (b.bestValue || 0) - (a.bestValue || 0);
                case 'weight':
                    // Use correct weight extraction
                    const aWeight = a.bestFish?.metadata?.fishStats?.weight || a.bestWeight || 0;
                    const bWeight = b.bestFish?.metadata?.fishStats?.weight || b.bestWeight || 0;
                    return bWeight - aWeight;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'rarity':
                    const rarityOrder = { 'mythic': 6, 'legendary': 5, 'epic': 4, 'rare': 3, 'uncommon': 2, 'common': 1 };
                    return (rarityOrder[b.bestRarity] || 0) - (rarityOrder[a.bestRarity] || 0);
                case 'caught':
                    return (b.totalCaught || 0) - (a.totalCaught || 0);
                default:
                    return (b.bestValue || 0) - (a.bestValue || 0);
            }
        });

        if (speciesArray.length === 0) {
            return `
                <div class="phshdex-no-results">
                    <div style="text-align: center; padding: 40px; color: #888;">
                        ${searchTerm ? `No species found matching "${searchTerm}"` : 'No species discovered yet'}
                    </div>
                </div>
            `;
        }

        return speciesArray.map((species, index) => {
            // Handle weight display using the same logic as TackleBoxPanel
            let weightDisplay = 'Not Weighed';
            
            // Check if we have a bestFish with metadata (like TackleBoxPanel does)
            if (species.bestFish?.metadata?.fishStats) {
                const fishStats = species.bestFish.metadata.fishStats;
                if (fishStats.hasBeenWeighed && fishStats.weight) {
                    weightDisplay = `${typeof fishStats.weight === 'number' ? fishStats.weight.toFixed(2) : fishStats.weight}lb`;
                } else if (fishStats.displayWeight) {
                    weightDisplay = fishStats.displayWeight;
                }
            }
            // Fallback to direct weight properties for different phshdex implementations
            else if (species.bestWeight !== undefined && species.bestWeight !== null && species.bestWeight > 0) {
                weightDisplay = `${typeof species.bestWeight === 'number' ? species.bestWeight.toFixed(2) : species.bestWeight}lb`;
            } else if (species.weight !== undefined && species.weight !== null && species.weight > 0) {
                weightDisplay = `${typeof species.weight === 'number' ? species.weight.toFixed(2) : species.weight}lb`;
            }
            
            return `
                <div class="phshdex-species-item" data-species="${species.name}">
                    <div class="phshdex-species-info">
                        <div class="phshdex-species-header">
                            <h4 class="phshdex-species-name" style="color: ${this.getRarityColor(species.bestRarity || species.rarity)}">${species.name}</h4>
                            <div class="phshdex-species-value">${species.bestValue || species.value || 0} coins</div>
                        </div>
                        <div class="phshdex-species-stats">
                            <span class="phshdex-stat">Weight: ${weightDisplay}</span>
                            <span class="phshdex-stat">Caught: ${species.totalCaught || species.caught || 0}x</span>
                            <span class="phshdex-stat" style="color: ${this.getRarityColor(species.bestRarity || species.rarity)}">${species.bestRarity || species.rarity || 'common'}</span>
                        </div>
                    </div>
                    <div class="phshdex-species-rank">#${index + 1}</div>
                </div>
            `;
        }).join('');
    }

    setupPhshdexControls() {
        const searchInput = document.getElementById('phshdex-search');
        const sortSelect = document.getElementById('phshdex-sort');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.updateSpeciesList(e.target.value, sortSelect?.value || 'value');
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.updateSpeciesList(searchInput?.value || '', e.target.value);
            });
        }

        // Add click handlers for species details
        document.querySelectorAll('.phshdex-species-item').forEach(item => {
            item.addEventListener('click', () => {
                const speciesName = item.dataset.species;
                this.showSpeciesDetails(speciesName);
            });
        });
    }

    updateSpeciesList(searchTerm, sortBy) {
        const speciesList = document.getElementById('phshdex-species-list');
        const phshdexData = this.progressState.phshdexData;
        
        if (speciesList && phshdexData?.speciesRecords) {
            speciesList.innerHTML = this.renderSpeciesList(phshdexData.speciesRecords, searchTerm, sortBy);
            
            // Re-add click handlers
            document.querySelectorAll('.phshdex-species-item').forEach(item => {
                item.addEventListener('click', () => {
                    const speciesName = item.dataset.species;
                    this.showSpeciesDetails(speciesName);
                });
            });
        }
    }

    showSpeciesDetails(speciesName) {
        const phshdexData = this.progressState.phshdexData;
        const species = phshdexData?.speciesRecords[speciesName];
        
        if (!species) {
            return;
        }

        // Show detailed modal/overlay for the species
        // TODO: Implement species detail modal
    }

    getSpeciesIconPath(species) {
        const baseUrl = this.getAssetBaseUrl();
        // Try to get the icon from fish catalog sprite naming conventions
        const spriteName = species.name.toLowerCase().replace(/ /g, '_') + '_sprite.png';
        return `${baseUrl}/ui/icons/${spriteName}`;
    }

    getRarityColor(rarity) {
        switch(rarity?.toLowerCase()) {
            case 'common': return '#9CA3AF';
            case 'uncommon': return '#22C55E';
            case 'rare': return '#3B82F6';
            case 'epic': return '#A855F7';
            case 'legendary': return '#F59E0B';
            case 'mythic': return '#EF4444';
            default: return '#9CA3AF';
        }
    }

    getAssetBaseUrl() {
        // Check if we're in a Hytopia environment with CDN_ASSETS_URL available
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            return window.CDN_ASSETS_URL;
        }
        
        // Try to extract it from a script tag's src attribute
        const scriptTags = document.getElementsByTagName('script');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].src;
            if (src && src.includes('/ui/panels/')) {
                const baseUrl = src.substring(0, src.indexOf('/ui/panels/'));
                return baseUrl;
            }
        }
        
        // Fallback to current origin
        return window.location.origin;
    }

    renderProgressLists() {
        // This will render the appropriate tab based on current state
        this.renderCurrentTab();
    }

    clearSelections() {
        // Clear quest selections
        document.querySelectorAll('.quests-item-selected').forEach(item => {
            item.classList.remove('quests-item-selected');
        });
        
        this.progressState.selectedQuestId = null;
        
        // Show empty state in details panel
        const detailsContent = document.getElementById('quests-details-content');
        const emptyState = document.getElementById('quests-empty-state');
        
        if (detailsContent) detailsContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    }

    updateQuestsEmptyState() {
        const emptyState = document.getElementById('quests-empty-state');
        const detailsContent = document.getElementById('quests-details-content');
        
        if (this.progressState.selectedItemId && this.progressState.selectedItemType === 'quest') {
            if (emptyState) emptyState.style.display = 'none';
            if (detailsContent) detailsContent.style.display = 'block';
            detailsContent.innerHTML = `<p>Quest details for: ${this.progressState.selectedItemId}</p>`;
        } else {
            if (emptyState) emptyState.style.display = 'flex';
            if (detailsContent) detailsContent.style.display = 'none';
        }
    }

    updatePhshdexEmptyState() {
        const emptyState = document.getElementById('phshdex-empty-state');
        const detailsContent = document.getElementById('phshdex-details-content');
        
        if (this.progressState.selectedItemId && this.progressState.selectedItemType === 'species') {
            if (emptyState) emptyState.style.display = 'none';
            if (detailsContent) detailsContent.style.display = 'block';
            detailsContent.innerHTML = `<p>Species details for: ${this.progressState.selectedItemId}</p>`;
        } else {
            if (emptyState) emptyState.style.display = 'flex';
            if (detailsContent) detailsContent.style.display = 'none';
        }
    }

    updateEmptyState() {
        // Update the appropriate tab's details panel
        if (this.progressState.currentTab === 'quests') {
            this.updateQuestsEmptyState();
        } else if (this.progressState.currentTab === 'phshdex') {
            this.updatePhshdexEmptyState();
        }
    }

    // Mobile optimization methods (following TackleBoxPanel pattern)
    applyMobileStyles() {
        if (!hytopia.isMobile) {
            return;
        }
        
        
        // Add mobile-specific styling class
        this.progressElement.classList.add('progress-mobile');
        
        // Apply mobile styles directly via JavaScript like TackleBoxPanel
        const header = this.progressElement.querySelector('.quests-header');
        const title = this.progressElement.querySelector('.quests-title');
        const closeButton = this.progressElement.querySelector('.quests-close');
        const sidebar = this.progressElement.querySelector('.quests-sidebar');
        const content = this.progressElement.querySelector('.quests-content');
        const tabs = this.progressElement.querySelector('.progress-tabs');
        
        // Header optimizations
        if (header) {
            header.style.padding = '8px 12px';
            header.style.minHeight = 'auto';
        }
        
        // Optimize title
        if (title) {
            title.style.fontSize = '14px';
        }
        
        // Optimize close button for touch
        if (closeButton) {
            closeButton.style.width = '36px';
            closeButton.style.height = '36px';
            closeButton.style.fontSize = '18px';
            closeButton.style.minWidth = '36px';
            closeButton.style.minHeight = '36px';
        }
        
        // Optimize tabs for touch
        if (tabs) {
            tabs.style.flexDirection = 'row';
        }
        
        // Optimize sidebar width
        if (sidebar) {
            sidebar.style.width = '240px';
        }
        
        // Make scrollable areas touch-friendly
        const scrollableAreas = this.progressElement.querySelectorAll('.quests-list, .quests-details-content, .phshdex-species-list');
        scrollableAreas.forEach(area => {
            area.style.webkitOverflowScrolling = 'touch';
            area.style.overscrollBehavior = 'contain';
        });
        
    }

    restoreDesktopStyles() {
        // Reset any inline styles that might interfere with desktop layout
        const header = this.progressElement.querySelector('.quests-header');
        const title = this.progressElement.querySelector('.quests-title');
        const closeButton = this.progressElement.querySelector('.quests-close');
        const sidebar = this.progressElement.querySelector('.quests-sidebar');
        const tabs = this.progressElement.querySelector('.progress-tabs');
        
        // Only restore if not on mobile
        if (!hytopia.isMobile) {
            if (header) header.style.cssText = '';
            if (title) title.style.cssText = '';
            if (closeButton) closeButton.style.cssText = '';
            if (sidebar) sidebar.style.cssText = '';
            if (tabs) tabs.style.cssText = '';
            
            const scrollableAreas = this.progressElement.querySelectorAll('.quests-list, .quests-details-content, .phshdex-species-list');
            scrollableAreas.forEach(area => {
                area.style.cssText = '';
                area.style.webkitOverflowScrolling = 'touch';
                area.style.overscrollBehavior = 'contain';
            });
        }
    }

    hideMobileControls() {
        // Hide any mobile UI elements that might interfere
        const mobileElements = [
            '#mobile-controls',
            '.mobile-ui-overlay',
            '.mobile-toolbar'
        ];
        
        mobileElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Also directly hide individual buttons to ensure they're hidden
        const buttons = [
            '#mobile-jump-button',
            '#mobile-interact-button',
            '#mobile-break-button'
        ];
        
        buttons.forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                button.style.display = 'none';
            }
        });
    }

    showMobileControls() {
        // Restore mobile UI elements
        const mobileElements = [
            '#mobile-controls',
            '.mobile-ui-overlay', 
            '.mobile-toolbar'
        ];
        
        mobileElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = '';
            }
        });
        
        // Also restore individual buttons
        const buttons = [
            '#mobile-jump-button',
            '#mobile-interact-button',
            '#mobile-break-button'
        ];
        
        buttons.forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                button.style.display = '';
            }
        });
    }

    setupMobileInteractions() {
        if (!hytopia.isMobile) return;
        
        // Add mobile-friendly touch interactions
        this.progressElement.addEventListener('touchmove', (e) => {
            // Allow scrolling within scrollable areas, but prevent other touch moves
            if (!e.target.closest('.quests-list, .quests-details-content, .phshdex-species-list')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle mobile back button / escape gesture
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.progressOpen) {
                this.closeProgress();
            }
        });
    }

    addStyles() {
        let style = document.getElementById('player-progress-panel-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'player-progress-panel-styles';
            document.head.appendChild(style);
        }

        style.textContent = `
            :root {
                --quests-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            .quests-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                font-family: var(--quests-font);
                user-select: none;
            }

            /* Container Styles */
            .quests-container {
                background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                border: 2px solid #444;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                width: 850px;
                height: 600px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            /* Header Styles */
            .quests-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                border-bottom: 1px solid #444;
                flex-shrink: 0;
            }

            .quests-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                letter-spacing: 0.3px;
            }

            .quests-close {
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 6px;
                color: #ff6b6b;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .quests-close:hover {
                background: rgba(255, 0, 0, 0.3);
                transform: scale(1.05);
            }

            /* Tab Navigation */
            .progress-tabs {
                display: flex;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid #444;
                flex-shrink: 0;
            }

            .progress-tab {
                padding: 12px 24px;
                background: transparent;
                border: none;
                color: #cccccc;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
                position: relative;
                font-family: var(--quests-font);
            }

            .progress-tab:hover {
                color: #ffffff;
                background: rgba(255, 255, 255, 0.05);
            }

            .progress-tab.active {
                color: #ffffff;
                background: rgba(76, 175, 80, 0.1);
                border-bottom-color: #4CAF50;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            /* Content Layout */
            .quests-content {
                display: flex;
                flex: 1;
                min-height: 0;
            }

            /* Tab Content Areas */
            .tab-content {
                width: 100%;
                height: 100%;
                display: none;
            }

            .tab-content.active {
                display: flex;
            }

            /* Sidebar Styles */
            .quests-sidebar {
                width: 280px;
                background: rgba(0, 0, 0, 0.3);
                border-right: 1px solid #444;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                flex-shrink: 0;
                height: 100%;
            }

            .quests-section {
                display: flex;
                flex-direction: column;
                min-height: 0;
                flex: 1;
                /* Active quests section now fills entire sidebar since completed section is removed */
            }

            .quests-section:first-child {
                flex: 1;
                min-height: 0;
                /* Removed max-height: 50% - now fills full height */
            }

            .quests-section:last-child {
                flex: 1;
                min-height: 0;
                /* Removed max-height: 50% - now fills full height */
                /* Removed border-top - no longer needed since there's only one section */
            }

            .quests-section-title {
                margin: 0;
                padding: 12px 16px 8px;
                font-size: 14px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                border-bottom: 1px solid #333;
                background: rgba(0, 0, 0, 0.2);
                flex-shrink: 0;
            }

            .quests-list {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 8px;
            }

            /* Quest Item Styles */
            .quests-item {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #333;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }

            .quests-item:hover {
                border-color: #555;
                background: rgba(0, 0, 0, 0.6);
                transform: translateX(2px);
            }

            .quests-item-selected {
                border-color: #4CAF50 !important;
                background: rgba(76, 175, 80, 0.1) !important;
                box-shadow: 0 0 0 1px rgba(76, 175, 80, 0.3);
            }

            .quests-item-name {
                font-size: 12px;
                font-weight: 500;
                color: #cccccc;
                line-height: 1.3;
                flex: 1;
                min-width: 0;
                word-wrap: break-word;
            }

            .quests-item-progress {
                font-size: 11px;
                font-weight: 600;
                color: #888;
                flex-shrink: 0;
            }

            .quests-item-completed {
                opacity: 0.7;
            }

            .quests-item-completed .quests-item-name {
                color: #999;
                text-decoration: line-through;
            }

            .quests-item-completed .quests-item-progress {
                color: #4CAF50;
            }

            .quests-item-active .quests-item-progress {
                color: #ffd700;
            }

            /* Empty section placeholder */
            .quests-empty-section {
                padding: 16px 12px;
                text-align: center;
                font-weight: 500;
                font-size: 12px;
                color: #cccccc;
                line-height: 1.5;
            }

            .quests-empty-message {
                padding: 16px 12px;
                text-align: center;
                font-weight: 500;
                font-size: 12px;
                color: #cccccc;
                line-height: 1.5;
                font-style: italic;
            }

            /* Details Panel Styles */
            .quests-details-panel {
                flex: 1;
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .quests-main-area {
                flex: 1;
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .quests-content-area {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .quests-details-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .quest-detail-header {
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .quest-detail-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                line-height: 1.2;
                flex: 1;
            }

            .quest-status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .quest-status-badge.active {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
                border: 1px solid rgba(255, 193, 7, 0.3);
            }

            .quest-status-badge.completed {
                background: rgba(76, 175, 80, 0.2);
                color: #4caf50;
                border: 1px solid rgba(76, 175, 80, 0.3);
            }

            .quest-detail-description {
                margin-bottom: 24px;
                font-size: 14px;
                line-height: 1.5;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                background: rgba(0, 0, 0, 0.2);
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #4a90e2;
            }

            .quest-detail-objectives {
                margin-bottom: 20px;
            }

            .quest-detail-objectives h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .quest-detail-objectives ul {
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .quest-detail-objectives li {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 13px;
                line-height: 1.4;
                color: #ffffff;
            }

            .quest-detail-objectives li:last-child {
                border-bottom: none;
            }

            .quest-detail-objectives li:before {
                content: '•';
                color: #ffc107;
                font-weight: bold;
                flex-shrink: 0;
            }

            .quest-detail-objectives li.completed {
                color: #cccccc;
                text-decoration: line-through;
            }

            .quest-detail-objectives li.completed:before {
                content: '✓';
                color: #4caf50;
            }

            .quest-next-step {
                margin-top: 12px;
                padding: 8px 12px;
                background: rgba(76, 175, 80, 0.1);
                border-left: 3px solid #4caf50;
                border-radius: 4px;
                color: #4caf50;
                font-weight: 500;
                font-size: 13px;
            }

            /* Empty State */
            .quests-empty-state,
            .quest-empty-state {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .quests-empty-content,
            .quest-empty-content {
                text-align: center;
                color: #cccccc;
            }

            .quests-empty-icon,
            .quest-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
                opacity: 0.5;
            }

            .quests-empty-text,
            .quest-empty-title {
                font-size: 16px;
                font-weight: 600;
                line-height: 1.5;
                padding: 0 12px;
                color: #ffffff;
                margin-bottom: 8px;
            }

            .quest-empty-message {
                font-size: 14px;
                font-weight: 400;
                line-height: 1.5;
                padding: 0 12px;
                color: #cccccc;
            }

            /* Phshdex Specific Styles */
            .phshdex-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .phshdex-overview {
                background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(100, 181, 246, 0.05));
                border-bottom: 2px solid #444;
                padding: 20px;
                flex-shrink: 0;
            }

            .phshdex-title h2 {
                color: #ffffff;
                margin: 0 0 8px 0;
                font-size: 18px;
                text-align: center;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .phshdex-subtitle {
                text-align: center;
                color: #cccccc;
                font-size: 14px;
                margin-bottom: 20px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .phshdex-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
            }

            .phshdex-stat-card {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .phshdex-stat-value {
                font-size: 20px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 4px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
            }

            .phshdex-stat-label {
                font-size: 11px;
                color: #cccccc;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 500;
                margin-bottom: 4px;
            }

            .phshdex-stat-detail {
                font-size: 13px;
                color: #ffffff;
            }

            .phshdex-species-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                padding: 20px;
                padding-top: 15px;
            }

            .phshdex-search-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-shrink: 0;
            }

            .phshdex-search-input {
                flex: 1;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #444;
                border-radius: 6px;
                color: #ffffff;
                font-size: 14px;
                font-family: inherit;
            }

            .phshdex-search-input:focus {
                outline: none;
                border-color: #4a90e2;
                box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
            }

            .phshdex-search-input::placeholder {
                color: #888;
            }

            .phshdex-sort-select {
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #444;
                border-radius: 6px;
                color: #ffffff;
                font-size: 14px;
                font-family: inherit;
                min-width: 160px;
            }

            .phshdex-sort-select:focus {
                outline: none;
                border-color: #4a90e2;
            }

            .phshdex-species-list {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .phshdex-species-item {
                display: flex;
                align-items: center;
                padding: 16px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid #444;
                border-radius: 8px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .phshdex-species-item:hover {
                background: rgba(74, 144, 226, 0.1);
                border-color: #4a90e2;
                transform: translateX(4px);
            }

            .phshdex-species-info {
                flex: 1;
                min-width: 0;
            }

            .phshdex-species-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .phshdex-species-name {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: #ffffff;
            }

            .phshdex-species-value {
                color: #facc15;
                font-weight: 600;
                font-size: 14px;
                flex-shrink: 0;
                margin-left: 12px;
            }

            .phshdex-species-stats {
                display: flex;
                gap: 20px;
                font-size: 13px;
            }

            .phshdex-stat {
                color: #ffffff;
            }

            .phshdex-species-rank {
                color: #cccccc;
                font-size: 18px;
                font-weight: bold;
                margin-left: 16px;
                flex-shrink: 0;
            }

            .phshdex-no-results {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* Scrollbar Styles */
            .quests-list::-webkit-scrollbar,
            .quests-details-content::-webkit-scrollbar,
            .quests-content-area::-webkit-scrollbar,
            .phshdex-species-list::-webkit-scrollbar {
                width: 6px;
            }

            .quests-list::-webkit-scrollbar-track,
            .quests-details-content::-webkit-scrollbar-track,
            .quests-content-area::-webkit-scrollbar-track,
            .phshdex-species-list::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            }

            .quests-list::-webkit-scrollbar-thumb,
            .quests-details-content::-webkit-scrollbar-thumb,
            .quests-content-area::-webkit-scrollbar-thumb,
            .phshdex-species-list::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }

            .quests-list::-webkit-scrollbar-thumb:hover,
            .quests-details-content::-webkit-scrollbar-thumb:hover,
            .quests-content-area::-webkit-scrollbar-thumb:hover,
            .phshdex-species-list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            /* Mobile Styles - matching frontiers example */
            body.mobile .quests-container {
                width: auto;
                max-width: 600px;
                min-width: 340px;
                height: 85vh;
                border-radius: 8px;
            }
            
            body.mobile .quests-header {
                padding: 8px 12px;
                border-radius: 8px 8px 0 0;
            }
            
            body.mobile .quests-title {
                font-size: 14px;
            }
            
            body.mobile .quests-close {
                width: 24px;
                height: 24px;
                font-size: 16px;
                border-radius: 6px;
            }
            
            body.mobile .quests-sidebar {
                width: 175px;
                min-width: 175px;
            }
            
            body.mobile .quests-section-title {
                padding: 8px 10px 6px;
                font-size: 11px;
            }
            
            body.mobile .quests-list {
                padding: 6px;
            }
            
            /* Enable scrolling for quest list children on mobile - matching frontiers */
            body.mobile .quests-list * {
                overflow-y: scroll;
            }
            
            body.mobile .quests-item {
                padding: 3px 8px;
                margin-bottom: 3px;
                border-radius: 6px;
                min-height: 28px;
                overflow: visible !important; /* Quest items themselves shouldn't scroll */
            }
            
            body.mobile .quests-item-name {
                font-size: 11px;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            body.mobile .quests-item-progress {
                font-size: 9px;
                font-weight: 600;
            }
            
            body.mobile .quests-details-content {
                padding: 12px;
            }
            
            body.mobile .quests-details-content * {
                overflow-y: scroll;
                touch-action: pan-y !important;
            }
            
            /* Exception for reward items and tooltips - override the blanket overflow rule */
            body.mobile .quests-reward-item,
            body.mobile .quests-reward-item *,
            body.mobile .quests-reward-item-tooltip,
            body.mobile .quests-reward-item-tooltip * {
                overflow: visible !important;
            }
            
            /* Ensure all parent containers allow tooltips to escape */
            body.mobile .quests-rewards-list,
            body.mobile .quests-detail-rewards,
            body.mobile .quests-details-panel {
                overflow: visible !important;
            }
            
            body.mobile .quests-rewards-list * {
                overflow-y: scroll !important;
                touch-action: pan-y !important;
            }
            
            /* Mobile Styles */
            @media (max-width: 768px) {
                .quests-container {
                    width: 95vw;
                    height: 85vh;
                }

                .phshdex-stats {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .phshdex-search-bar {
                    flex-direction: column;
                    gap: 8px;
                }

                .phshdex-species-stats {
                    flex-direction: column;
                    gap: 4px;
                }

                .phshdex-species-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }

                .phshdex-species-value {
                    margin-left: 0;
                }
            }

            /* Scrollbar styles for phshdex */
            .phshdex-species-list::-webkit-scrollbar {
                width: 6px;
            }
            .phshdex-species-list::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
            }
            .phshdex-species-list::-webkit-scrollbar-thumb {
                background: #4a90e2;
                border-radius: 3px;
            }
            .phshdex-species-list::-webkit-scrollbar-thumb:hover {
                background: #357ab8;
            }

            /* Mobile-specific styles */
            @media (max-width: 768px) {
                .progress-overlay {
                    padding: 0;
                }

                .progress-container {
                    width: 95vw;
                    height: 85vh;
                    max-height: 85vh;
                    border-radius: 8px;
                }

                /* Smaller header on mobile */
                .quests-header {
                    padding: 8px 12px;
                    min-height: auto;
                }

                .quests-title {
                    font-size: 14px;
                }

                .quests-close {
                    width: 36px;
                    height: 36px;
                    font-size: 18px;
                    min-width: 36px;
                    min-height: 36px;
                }

                /* Stack tabs vertically on very small screens */
                .progress-tabs {
                    flex-direction: row;
                    margin-bottom: 12px;
                }

                .progress-tab {
                    padding: 8px 16px;
                    font-size: 13px;
                    min-height: 44px;
                }

                /* Adjust sidebar width */
                .quests-sidebar {
                    width: 240px;
                    padding: 8px;
                }

                .quests-content {
                    padding: 12px;
                }

                /* Smaller quest items */
                .quests-item {
                    padding: 8px 10px;
                    font-size: 13px;
                }

                .quests-item-title {
                    font-size: 13px;
                }

                .quests-item-status {
                    font-size: 11px;
                    padding: 2px 6px;
                }

                /* Quest details optimizations */
                .quest-detail-title {
                    font-size: 16px;
                }

                .quest-detail-description {
                    font-size: 13px;
                }

                .quest-detail-objectives li {
                    font-size: 12px;
                }

                /* Phshdex mobile optimizations */
                .phshdex-controls {
                    flex-direction: column;
                    gap: 8px;
                }

                .phshdex-search {
                    font-size: 14px;
                    padding: 8px 12px;
                }

                .phshdex-sort {
                    font-size: 13px;
                    padding: 6px 10px;
                }

                .phshdex-species-item {
                    padding: 8px 10px;
                    font-size: 13px;
                }

                .phshdex-species-name {
                    font-size: 13px;
                }

                .phshdex-species-stats {
                    font-size: 11px;
                }

                .phshdex-species-rarity {
                    font-size: 10px;
                    padding: 2px 6px;
                }
            }

            /* Touch-specific mobile styles */
            .progress-mobile .quests-list,
            .progress-mobile .quests-details-content,
            .progress-mobile .phshdex-species-list {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            }
            
            /* Mobile scrolling for phshdex species list - matching frontiers */
            body.mobile .phshdex-species-list {
                touch-action: pan-y !important;
            }
            
            body.mobile .phshdex-species-list * {
                overflow-y: scroll;
                touch-action: pan-y !important;
            }
            
            body.mobile .phshdex-species-item {
                overflow: visible !important; /* Species items themselves shouldn't scroll */
            }

            .progress-mobile .progress-tab {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            .progress-mobile .quests-item {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            .progress-mobile .phshdex-species-item {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }

            .progress-mobile .quests-close {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                min-width: 44px;
                min-height: 44px;
            }

            .progress-mobile .phshdex-search,
            .progress-mobile .phshdex-sort {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
        `;
    }
}

// Make it globally available
window.PlayerProgressPanel = new PlayerProgressPanel();
