class QuestTrackerPanel {
    constructor() {
        this.container = null;
        this.panel = null;
    }

    initialize(containerId) {
        
        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error(`QuestTrackerUI: Container element with ID '${containerId}' not found.`);
            return;
        }

        // --- Create Panel HTML (Simpler initial structure) ---
        this.panel = document.createElement('div');
        this.panel.id = 'quest-tracker-ui';
        this.panel.style.display = 'none'; // Start hidden
        // Content will be built dynamically in updateDisplay
        this.container.appendChild(this.panel);

        // --- Get Element References (Removed, done dynamically) ---

        // --- Add CSS Styling ---
        this.addStyles();

        // --- Setup Event Listener for Server Data ---
        this.setupEventListeners();

        console.log('QuestTrackerUI initialized');
    }

    addStyles() {
        // Prevent adding styles multiple times
        if (document.getElementById('quest-tracker-styles')) return;

        const style = document.createElement('style');
        style.id = 'quest-tracker-styles';
        style.textContent = `
            #quest-tracker-ui {
                position: fixed;
                top: 10px;
                right: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                border: 1px solid #6a7a8c;
                border-radius: 6px;
                padding: 8px 12px;
                color: white;
                width: 250px;
                max-width: 30vw;
                max-height: 45vh; /* Increased max-height */
                overflow-y: auto; /* Allow scrolling for multiple quests */
                z-index: 90;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                transition: opacity 0.3s, transform 0.3s;
                scrollbar-width: thin;
                scrollbar-color: #4a6491 #1e2632;
            }

            #quest-tracker-ui::-webkit-scrollbar {
                width: 5px;
            }
            #quest-tracker-ui::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.1);
            }
            #quest-tracker-ui::-webkit-scrollbar-thumb {
                background-color: #4a6491;
                border-radius: 3px;
            }

            #quest-tracker-ui.hidden {
                opacity: 0;
                transform: translateX(20px);
                pointer-events: none;
            }

            /* Style for each quest entry */
            .quest-entry {
                margin-bottom: 10px; /* Space between quests */
                padding-bottom: 6px; /* Space before border */
                border-bottom: 1px solid rgba(106, 122, 140, 0.3); /* Faint separator */
            }
            .quest-entry:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none; /* No border for the last quest */
            }

            .quest-entry-title {
                margin: 0 0 6px 0;
                font-size: 15px;
                font-weight: bold;
                color: #ffc107;
                text-align: left;
                /* Removed border, handled by .quest-entry */
                padding-bottom: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .quest-entry-objectives {
                list-style: none;
                padding: 0;
                margin: 0;
                /* Max height removed, panel scrolls */
                /* Overflow removed, panel scrolls */
            }

            .quest-entry-objectives li {
                margin-bottom: 4px;
                padding-left: 15px;
                position: relative;
                color: #e0e0e0;
                font-size: 13px;
            }

            /* Simple bullet point */
            .quest-entry-objectives li::before {
                content: '•';
                position: absolute;
                left: 0;
                top: 0px;
                color: #ffc107;
                font-size: 14px;
            }

             .quest-entry-objectives li.completed {
                text-decoration: line-through;
                color: #8a9cad;
            }

            .quest-entry-objectives li.completed::before {
                 content: '✓';
                 color: #4caf50;
            }

            /* Next step message styling */
            .quest-entry-objectives li.quest-next-step-message {
                color: #4caf50;
                font-weight: bold;
                font-size: 13px;
                background-color: rgba(76, 175, 80, 0.1);
                border-radius: 3px;
                padding: 4px 6px;
                margin-top: 6px;
                border-left: 3px solid #4caf50;
                list-style: none; /* Remove default bullet */
            }

            .quest-entry-objectives li.quest-next-step-message::before {
                content: '🎯';
                color: #4caf50;
                font-size: 12px;
                margin-right: 6px;
            }

            /* Basic mobile adjustments */
             @media (max-width: 767px) {
                 #quest-tracker-ui {
                     width: 200px;
                     font-size: 13px;
                     max-height: 40vh;
                 }
                 .quest-entry-title {
                     font-size: 14px;
                 }
                  .quest-entry-objectives li {
                      font-size: 12px;
                  }
             }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        console.log('[QuestTrackerPanel] Setting up event listeners...');
        hytopia.onData(data => {
            if (data.type === 'questTrackerUpdate') {
                // Expecting data.trackedQuests to be an array now
                this.updateDisplay(data.trackedQuests); // Pass the array
            }
        });
    }

    updateDisplay(trackedQuests) { // Accepts an array

        // Clear previous content
        this.panel.innerHTML = '';

        if (!trackedQuests || trackedQuests.length === 0) {
            // No quests tracked or data incomplete, hide panel
            this.panel.style.display = 'none';
            return;
        }

        // Limit to displaying max 3 quests, even if more are sent
        const questsToDisplay = trackedQuests.slice(0, 3);

        questsToDisplay.forEach(questData => {
            if (!questData || !questData.definition || !questData.progress) {
                console.warn('QuestTrackerUI: Invalid quest data received in array. Skipping.', questData);
                return; // Skip this invalid entry
            }

            const definition = questData.definition;
            const progress = questData.progress;
            const dynamicData = questData.dynamicData; // Get dynamic data for this quest
            const requiresTurnIn = questData.requiresTurnIn || false;
            const turnInNpcName = questData.turnInNpcName;
            const nextStepMessage = questData.nextStepMessage; // Get the next step message

            // --- Create Quest Entry Container ---
            const questEntryDiv = document.createElement('div');
            questEntryDiv.className = 'quest-entry';

            // --- Create Title ---
            const titleEl = document.createElement('h4');
            titleEl.className = 'quest-entry-title';
            // Add "Daily" label for daily quests
            const isDailyQuest = definition.autoComplete === true || definition.repeatable === 'daily' || definition.id?.startsWith('daily_');
            const titleText = isDailyQuest ? `[Daily] ${definition.title || 'Tracked Quest'}` : (definition.title || 'Tracked Quest');
            titleEl.textContent = titleText;
            questEntryDiv.appendChild(titleEl);

            // --- Create Objectives List ---
            const objectivesUl = document.createElement('ul');
            objectivesUl.className = 'quest-entry-objectives';

            
            if (!definition.objectives || definition.objectives.length === 0) {
                console.warn('[QuestTrackerPanel] No objectives found for quest:', definition.id);
                objectivesUl.innerHTML = '<li>No objectives defined.</li>';
            } else {
                definition.objectives.forEach((obj, index) => {
                    const objectiveProgress = progress.objectivesProgress[index] || 0;
                    const isCompleted = objectiveProgress >= (obj.count || 0);

                    // Pass definition and dynamicData to getObjectiveText
                    let objectiveText = this.getObjectiveText(obj, dynamicData, definition);

                    // Add progress count (e.g., "(1/5)") if count > 1
                    if (obj.count > 1) {
                        objectiveText += ` (${objectiveProgress}/${obj.count})`;
                    } else if (isCompleted && obj.count === 1) {
                        objectiveText += ` (1/1)`;
                    } else if (!isCompleted && obj.count === 1) {
                        objectiveText += ` (0/1)`;
                    }

                    const li = document.createElement('li');
                    li.textContent = objectiveText;
                    if (isCompleted) {
                        li.classList.add('completed');
                    }
                    objectivesUl.appendChild(li);
                });
            }

            // --- Add Next Step Message if Available ---
            if (nextStepMessage && nextStepMessage.trim() !== "") {
                const nextStepLi = document.createElement('li');
                nextStepLi.className = 'quest-next-step-message';
                nextStepLi.textContent = nextStepMessage;
                objectivesUl.appendChild(nextStepLi);
            }

            questEntryDiv.appendChild(objectivesUl);

            // --- Append Quest Entry to Panel ---
            this.panel.appendChild(questEntryDiv);
        });

        // --- Show Panel ---
        this.panel.style.display = 'block';
    }

    /**
     * Generates the display text for an objective, handling placeholders.
     * Now accepts dynamicData and the quest definition.
     */
    getObjectiveText(objective, dynamicData, questDefinition) {
        
        if (!objective || !objective.type) {
            console.warn('[QuestTrackerPanel] Invalid objective passed to getObjectiveText:', objective);
            return "Unknown objective";
        }
        
        let text = "Unknown objective";
        const isDailyQuest = questDefinition?.repeatable === 'daily' || questDefinition?.id?.startsWith('daily_');
        const xpReward = questDefinition?.rewards?.experience || 0;

        // --- Objective Descriptions ---
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

        // --- Placeholder Replacement ---
        // Specific handling for sea_story_catch placeholders
        if (questDefinition?.id === 'sea_story_catch') {
            const targetFish = dynamicData?.targetFishType || 'the target fish';
            text = text.replace(/\[FISH_TYPE\]/gi, targetFish);
            text = text.replace(/\[DYNAMIC_FISH_TYPE\]/gi, targetFish);
        }

        // Add more generic placeholder replacements here if needed in the future

        return text;
    }
}

// Make it globally available
window.QuestTrackerPanel = new QuestTrackerPanel();

// Initialize after the main container exists
// Make sure this runs after the DOM is ready and the container element exists
// Example: Call window.QuestTrackerUI.initialize('ui-container'); in your main UI setup script.
