import { Player, Entity, World } from 'hytopia';
// Use type-only imports for interfaces when verbatimModuleSyntax is enabled
import { PlayerStateManager } from './PlayerStateManager';
import questDefinitions from './data/quests';
import type { PlayerState, PlayerQuestState } from './PlayerStateManager';
import { SeaStoryManager } from './SeaStoryManager';
import { InventoryManager } from './Inventory/InventoryManager';
import { CurrencyManager } from './CurrencyManager';
import { LevelingSystem } from './LevelingSystem';
import { MessageManager } from './MessageManager'; // For notifying player
import { ItemFactory } from './Inventory/ItemFactory'; // Import ItemFactory
import type { InventoryItem } from './Inventory/Inventory'; // Import InventoryItem type
import { FISHING_RODS } from './Inventory/RodCatalog'; // Import FISHING_RODS catalog
import { GamePlayerEntity } from './GamePlayerEntity';
import GameManager from './GameManager';

// --- Interfaces matching the Quest JSON structure ---

interface QuestObjective {
    type: 'catchFish' | 'catchFishMinWeight' | 'gatherItem' | 'collectItems' | 'reachLevel' | 'talkToNpc' 
        | 'useBait' | 'useBaitType' | 'openChests' | 'fishAtLocations' | 'catchRarity' 
        | 'weighFish' | 'weighFishByWeight' | 'weighLeaderboardFish' | 'sellFish'; // Daily quest types
    fishType?: string; // For catchFish
    itemId?: string; // For gatherItem
    itemIds?: string[]; // For collectItems (array of item IDs)
    count: number;
    targetNpcId?: string; // For talkToNpc
    targetRarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // For catchRarity
    baitType?: string; // For useBaitType
    targetAmount?: number; // For useBait (total bait count)
    targetLocations?: number; // For fishAtLocations
    minWeight?: number; // For weighFishByWeight and catchFishMinWeight (in pounds)
    minimumWeight?: number; // Alias for minWeight (legacy support)
    weightThreshold?: number; // For daily quest meta-class grouping
    isTrophy?: boolean; // For catchFishMinWeight - requires trophy fish
    description?: string; // Optional description for UI display
    // Add other objective-specific properties
}

interface QuestRewardItem {
    itemId: string;
    count: number;
}

interface QuestRewards {
    experience?: number;
    coins?: number;
    items?: QuestRewardItem[];
    // Add other potential reward types (e.g., reputation)
}

export interface QuestDefinition {
    id: string;
    title: string;
    description: string; // Can contain placeholders like [FISH_TYPE]
    giverNpcId?: string;
    turnInNpcId?: string;
    fishingTip?: string; // Optional custom message when quest is accepted
    objectives: QuestObjective[];
    rewards: QuestRewards;
    repeatable?: 'daily' | 'weekly' | boolean; // Or maybe a cooldown duration
    autoComplete?: boolean; // If true, quest auto-completes when objectives are met (no turn-in)
    prerequisites?: {
        level?: number;
        completedQuestIds?: string[];
        // Add other potential prerequisites
    };
}

// --- The Quest Manager Class ---

export class QuestManager {
    private questDefinitions: Map<string, QuestDefinition> = new Map();
    private recentQuestNotifications: Map<string, number> = new Map(); // Track recent notifications to prevent duplicates
    private delayedContentHandlers: Map<string, NodeJS.Timeout> = new Map(); // Track delayed content handlers to prevent duplicates

    constructor(
        private playerStateManager: PlayerStateManager,
        private seaStoryManager: SeaStoryManager,
        private inventoryManager: InventoryManager,
        private currencyManager: CurrencyManager,
        private levelingSystem: LevelingSystem,
        private messageManager: MessageManager
    ) {
        this.loadQuests();
    }

    /**
     * Loads all quest definitions from the bundled quest data.
     * Uses the same import pattern as NPC definitions for reliable production deployment.
     */
    private loadQuests(): void {
        try {
            // Quest definitions are imported at the top of the file (bundled at compile time, same pattern as NPC definitions)
            let loadedCount = 0;
            for (const questData of questDefinitions) {
                // Validate quest data
                if (!questData.id) {
                    console.warn(`[QuestManager] Quest definition is missing an 'id'. Skipping.`);
                    continue;
                }

                if (!questData.title || !questData.description || !questData.objectives || !questData.rewards) {
                    console.warn(`[QuestManager] Quest definition ${questData.id} is missing required fields (title, description, objectives, rewards). Skipping.`);
                    continue;
                }

                this.questDefinitions.set(questData.id, questData);
                loadedCount++;
            }
            
            console.log(`[QuestManager] Successfully loaded ${loadedCount} quest definitions from bundled data`);
            if (loadedCount > 0) {
                const questIds = Array.from(this.questDefinitions.keys());
                console.log(`[QuestManager] Available quest IDs (first 10): ${questIds.slice(0, 10).join(', ')}${questIds.length > 10 ? '...' : ''}`);
            } else {
                console.error(`[QuestManager] WARNING: No quests were loaded!`);
            }
        } catch (error) {
            console.error('[QuestManager] CRITICAL ERROR loading quest definitions:', error);
            console.error('[QuestManager] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
    }

    /**
     * Retrieves a quest definition by its ID.
     */
    public getQuestDefinition(questId: string): QuestDefinition | undefined {
        return this.questDefinitions.get(questId);
    }

     /**
     * Gets the dynamic description for a quest, replacing placeholders.
     * Currently supports [FISH_TYPE] for sea_story_catch and trophy fish count for trophy_weighin.
     */
    public getDynamicQuestDescription(questId: string): string {
        const definition = this.getQuestDefinition(questId);
        if (!definition) return "Quest not found.";

        let description = definition.description;

        // Handle specific dynamic elements
        if (questId === 'sea_story_catch') {
            const mainStory = this.seaStoryManager.getCurrentSeaStory();
            const fishType = mainStory ? mainStory.fishType : "mystery fish"; // Fallback
            description = description.replace(/\[FISH_TYPE\]/g, fishType);
        }
        
        // Handle trophy quest dynamic description
        if (questId === 'trophy_weighin') {
            // This will be called when sending quest updates, so we need to get the current player context
            // For now, return the base description - the UI will handle the dynamic count display
            return description;
        }
        
        // Add more placeholder replacements here if needed for other quests

        return description;
    }

    /**
     * Checks if a player meets the prerequisites and conditions to accept a quest.
     * (Placeholder Implementation)
     */
    public isQuestAvailable(player: Player, questId: string): boolean {
        const definition = this.getQuestDefinition(questId);
        const playerState = this.playerStateManager.getState(player);

        if (!definition || !playerState) return false;

        // 1. Check if already active or completed (handle repeatability later)
        if (playerState.quests.active[questId] || playerState.quests.completed[questId]) {
             // TODO: Add logic for repeatable quests (e.g., check completion timestamp against 'daily')
             return false;
        }

        // 2. Check prerequisites (level, other quests, etc.) - Placeholder
        if (definition.prerequisites?.level && this.playerStateManager.getCurrentLevel(player) < definition.prerequisites.level) {
            return false;
        }
        
        // Check completed quests prerequisite
        if (definition.prerequisites?.completedQuestIds) {
            const completedQuests = playerState.quests.completed;
            const activeQuests = playerState.quests.active;
            
            for (const requiredQuestId of definition.prerequisites.completedQuestIds) {
                // First check if quest is completed (original behavior)
                if (completedQuests[requiredQuestId]) {
                    continue; // Prerequisite met
                }
                
                // Special case: fitz_quest_2_kelp_eel accepts either fitz_quest_1_sardines OR fitz_quest_getting_started
                // This allows players who completed the old sardine quest OR the new getting started quest to access kelp eel
                if (requiredQuestId === 'fitz_quest_1_sardines' && definition.id === 'fitz_quest_2_kelp_eel') {
                    if (completedQuests['fitz_quest_getting_started']) {
                        continue; // Prerequisite met (new quest completed)
                    }
                }
                
                // Special case: For fitz_quest_4_map_delivery, also check if it's active
                // This allows shard quests (Brock, Explorer, Forrest) to be available once you have the scroll from Fitz,
                // without requiring you to show it to any specific NPC first
                if (requiredQuestId === 'fitz_quest_4_map_delivery') {
                    const metaQuest = activeQuests[requiredQuestId];
                    if (metaQuest) {
                        // Meta quest is active (player has the scroll) - prerequisite met
                        continue; // Prerequisite met
                    }
                }
                
                // If we get here, prerequisite is not met
                return false;
            }
        }

        // If all checks passed
        return true; 
    }

    /**
     * Checks if a specific quest is currently active for the player.
     */
    public isQuestActive(player: Player, questId: string): boolean {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState || !playerState.quests || !playerState.quests.active) {
            return false;
        }
        return !!playerState.quests.active[questId];
    }

    /**
     * Assigns a quest to a player if available.
     * (Placeholder Implementation)
     */
    public assignQuest(player: Player, questId: string, skipNotifications: boolean = false): boolean {
         if (!this.isQuestAvailable(player, questId)) {
            return false;
         }

        const definition = this.getQuestDefinition(questId);
        const playerState = this.playerStateManager.getState(player);

        if (!definition || !playerState) return false; // Should have been caught by isQuestAvailable

        // --- Create PlayerQuestState ---
        const newQuestState: PlayerQuestState = {
            questId: questId,
            status: 'active',
            objectivesProgress: {}, // Initialize progress for all objectives
            assignedTimestamp: Date.now(),
        };

        // Initialize progress for each objective to 0
        definition.objectives.forEach((_, index) => {
            newQuestState.objectivesProgress[index] = 0;
        });

        // --- Scan inventory for matching fish and update progress ---
        const inventory = this.inventoryManager.getInventory(player);
        if (inventory) {
            definition.objectives.forEach((objective, index) => {
                if (objective.type === 'catchFish' && objective.fishType) {
                    // Count matching fish in inventory
                    const count = inventory.items.filter(
                        item => item.type === 'fish' && item.name === objective.fishType
                    ).reduce((sum, item) => sum + (item.quantity || 1), 0);
                    newQuestState.objectivesProgress[index] = Math.min(count, objective.count);
                }
                // Add similar logic for other objective types if needed
            });
        }

        // --- Update Player State ---
        playerState.quests.active[questId] = newQuestState;

        // --- Check if objectives are already complete after initial progress calculation ---
        const allObjectivesMet = definition.objectives.every((obj, idx) =>
            (newQuestState.objectivesProgress[idx] || 0) >= obj.count
        );

        if (allObjectivesMet) {
            
            // Handle different quest completion paths
            if (questId === 'sea_story_catch') {
                // Sea story quest: Tell player to sell fish and update tracker
                const mainStory = this.seaStoryManager.getCurrentSeaStory();
                const fishType = mainStory ? mainStory.fishType : 'your catch';
                this.messageManager.sendGameMessage(`✨ Great catch! Sell your ${fishType} at the Fishmonger for bonus coins!`, player);
                // Set a special flag for sea story quest tracker
                newQuestState.requiresSellAtFishmonger = true;
            } else {
                // Standard quests: Mark for turn-in and send follow-up message
                newQuestState.requiresTurnIn = true;
                this.sendQuestCompletionFollowUpMessage(player, questId, definition);
            }
        }

        // --- Notify Player (skip for daily quest auto-assignment) ---
        if (!skipNotifications) {
            const dynamicDescription = this.getDynamicQuestDescription(questId);
            this.messageManager.sendGameMessage(`Quest Added: ${definition.title}`, player);
            
            // Send quest update notification
            const isMobile = this.playerStateManager.isMobile(player);
            const mobileText = isMobile ? 'Or tap quest button on mobile' : '';
            this.sendQuestUpdateNotification(player, questId, 'objective', 
                `Quest log updated. Press [P] to view. ${mobileText}`.trim());
        }
        
        // TODO: Send detailed quest info (with dynamic description) to the client's Quest Log UI


        // --- Send initial state to UI Tracker --- 
        this.sendActiveQuestsUpdate(player); // NEW: Send all active quests
        // -----------------------------------------

        // Update tutorial arrows when quest is assigned
        this.updateTutorialArrows(player);

        // CRITICAL: Save quest assignment immediately to prevent data loss
        // This ensures the quest is persisted even if player disconnects immediately
        this.playerStateManager.save(player);
        
        // Debug logging to verify quest was assigned
        console.log(`[QuestManager] Quest ${questId} assigned to player ${player.id}. Active quests:`, 
            Object.keys(playerState.quests.active));

        return true;
    }

     /**
     * Updates quest progress based on game events (e.g., catching a fish).
     */
    public updateQuestProgress(player: Player, eventType: string, eventData: any): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;


        for (const questId in playerState.quests.active) {
            const activeQuest = playerState.quests.active[questId];
            const definition = this.getQuestDefinition(questId);

            if (!definition || activeQuest.status !== 'active') continue; // Skip inactive or non-existent

            let questProgressMade = false;

            definition.objectives.forEach((objective, index) => {
                if (activeQuest.objectivesProgress[index] >= objective.count) return; // Skip completed

                let objectiveProgressMade = false;

                if (eventType === 'catchFish' && objective.type === 'catchFish') {
                     let requiredFishType: string | undefined = objective.fishType;
                     if (questId === 'sea_story_catch' && requiredFishType === '[DYNAMIC_FISH_TYPE]') {
                         const mainStory = this.seaStoryManager.getCurrentSeaStory();
                         requiredFishType = mainStory ? mainStory.fishType : undefined;
                     }
                     
                     if (requiredFishType && eventData.fishType === requiredFishType) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = (activeQuest.objectivesProgress[index] || 0) + 1;
                         const newProgress = activeQuest.objectivesProgress[index];
                         
                         objectiveProgressMade = true;
                     } 
                 }

                 // Handle catchFishMinWeight objectives
                 if (eventType === 'catchFish' && objective.type === 'catchFishMinWeight') {
                     const requiredFishType = objective.fishType;
                     const minimumWeight = objective.minWeight || objective.minimumWeight || 0;
                     const caughtWeight = eventData.weight || 0;
                     const isTrophy = objective.isTrophy || false;
                     
                     // Check if fish type matches (or if "Any" is allowed)
                     const fishTypeMatches = !requiredFishType || requiredFishType === 'Any' || eventData.fishType === requiredFishType;
                     
                     // Check if weight requirement is met
                     const weightMeetsRequirement = caughtWeight >= minimumWeight;
                     
                     // Check trophy requirement if needed
                     let trophyRequirementMet = true;
                     if (isTrophy) {
                         // Check if fish is a trophy fish (epic, legendary, or mythic rarity)
                         // Or check eventData.isTrophy if it's passed
                         trophyRequirementMet = eventData.isTrophy || false;
                         // Fallback: check rarity if isTrophy not in eventData
                         if (!eventData.isTrophy && eventData.rarity) {
                             trophyRequirementMet = ['epic', 'legendary', 'mythic'].includes(eventData.rarity.toLowerCase());
                         }
                     }
                     
                     if (fishTypeMatches && weightMeetsRequirement && trophyRequirementMet) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = (activeQuest.objectivesProgress[index] || 0) + 1;
                         const newProgress = activeQuest.objectivesProgress[index];
                         
                         objectiveProgressMade = true;
                     } 
                 }

                 // Handle sellFish objectives (general handling for any quest with sellFish objective)
                 if (eventType === 'sellFish' && objective.type === 'sellFish' && objective.fishType) {
                     const requiredFishType = objective.fishType;
                     const soldFishType = eventData.fishType;
                     
                     if (soldFishType === requiredFishType) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle sellFish event for sea story quest (special case - uses catchFish objective)
                 if (eventType === 'sellFish' && objective.type === 'catchFish' && questId === 'sea_story_catch') {
                     let requiredFishType: string | undefined = objective.fishType;
                     if (requiredFishType === '[DYNAMIC_FISH_TYPE]') {
                         const mainStory = this.seaStoryManager.getCurrentSeaStory();
                         requiredFishType = mainStory ? mainStory.fishType : undefined;
                     }
                     if (requiredFishType && eventData.fishType === requiredFishType) {
                         // For sea story quest, selling the fish completes the quest entirely
                         this.completeSeaStoryQuest(player, questId);
                         return; // Exit early, quest is complete
                     }
                 }

                 // Handle gatherItem objectives (e.g., worms quest)
                 if (objective.type === 'gatherItem' && objective.itemId) {
                     // Check inventory for the item (supports both raw ID and bait_ prefix)
                     const inventory = this.inventoryManager.getInventory(player);
                     if (inventory) {
                         const itemId = objective.itemId;
                         const baitItemId = `bait_${itemId}`;
                         
                         // Count matching items (check both IDs and timestamped versions)
                         const currentCount = inventory.items.filter(
                             item => item.id === itemId || 
                                     item.id === baitItemId || 
                                     item.id.startsWith(`${itemId}_`) ||
                                     item.id.startsWith(`${baitItemId}_`)
                         ).reduce((sum, item) => sum + (item.quantity || 1), 0);
                         
                         // Update progress to match current inventory count (but don't exceed objective count)
                         const newProgress = Math.min(currentCount, objective.count);
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         
                         if (newProgress !== oldProgress) {
                             activeQuest.objectivesProgress[index] = newProgress;
                             objectiveProgressMade = true;
                         }
                     }
                 }
                 
                 // Handle collectItems objectives (check inventory for items)
                 if (objective.type === 'collectItems' && objective.itemIds) {
                     const inventory = this.inventoryManager.getInventory(player);
                     if (inventory) {
                         let totalCount = 0;
                         // Count all items that match any of the itemIds
                         for (const itemId of objective.itemIds) {
                             const item = inventory.items.find(i => i.id === itemId);
                             if (item) {
                                 totalCount += item.quantity || 0;
                             }
                         }
                         
                         // Update progress to match current inventory count (but don't exceed objective count)
                         const newProgress = Math.min(totalCount, objective.count);
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         
                         if (newProgress !== oldProgress) {
                             activeQuest.objectivesProgress[index] = newProgress;
                             objectiveProgressMade = true;
                         }
                     }
                 }
                 
                 // Handle catchRarity objectives (catch fish of specific rarity)
                 if (eventType === 'catchFish' && objective.type === 'catchRarity' && objective.targetRarity) {
                     const caughtRarity = eventData.rarity?.toLowerCase();
                     const targetRarity = objective.targetRarity.toLowerCase();
                     
                     if (caughtRarity === targetRarity) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle catchFish (any fish) for daily quests and fitz_quest_bait_fishing
                 if (eventType === 'catchFish' && objective.type === 'catchFish' && !objective.fishType) {
                     // For fitz_quest_bait_fishing, only count if bait was used
                     if (questId === 'fitz_quest_bait_fishing') {
                         const usedBait = eventData.usedBait === true;
                         if (usedBait) {
                             const oldProgress = activeQuest.objectivesProgress[index] || 0;
                             activeQuest.objectivesProgress[index] = oldProgress + 1;
                             objectiveProgressMade = true;
                         }
                     } else {
                         // No specific fish type = count any fish (for daily quests)
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle useBaitType objectives (use specific bait type)
                 if (eventType === 'useBait' && objective.type === 'useBaitType' && objective.baitType) {
                     const usedBaitType = eventData.baitType?.toLowerCase();
                     const targetBaitType = objective.baitType.toLowerCase();
                     
                     if (usedBaitType === targetBaitType) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle useBait objectives (use any bait, total count)
                 if (eventType === 'useBait' && objective.type === 'useBait') {
                     const oldProgress = activeQuest.objectivesProgress[index] || 0;
                     activeQuest.objectivesProgress[index] = oldProgress + 1;
                     objectiveProgressMade = true;
                 }
                 
                 // Handle openChests objectives
                 if (eventType === 'openChest' && objective.type === 'openChests') {
                     const oldProgress = activeQuest.objectivesProgress[index] || 0;
                     activeQuest.objectivesProgress[index] = oldProgress + 1;
                     objectiveProgressMade = true;
                 }
                 
                 // Handle fishAtLocations objectives
                 if (eventType === 'fishAtLocation' && objective.type === 'fishAtLocations') {
                     // Progress is based on unique locations visited (tracked in daily stats)
                     const dailyStats = this.playerStateManager.getDailyStats(player);
                     const uniqueLocations = dailyStats.locationsVisited.length;
                     const newProgress = Math.min(uniqueLocations, objective.count);
                     const oldProgress = activeQuest.objectivesProgress[index] || 0;
                     
                     if (newProgress !== oldProgress) {
                         activeQuest.objectivesProgress[index] = newProgress;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle weighFish objectives (weigh any fish)
                 if (eventType === 'weighFish' && objective.type === 'weighFish') {
                     // Progress is based on unique fish weighed (tracked in daily stats)
                     const dailyStats = this.playerStateManager.getDailyStats(player);
                     const uniqueFishWeighed = dailyStats.uniqueFishWeighed.length;
                     const newProgress = Math.min(uniqueFishWeighed, objective.count);
                     const oldProgress = activeQuest.objectivesProgress[index] || 0;
                     
                     if (newProgress !== oldProgress) {
                         activeQuest.objectivesProgress[index] = newProgress;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle weighFishByWeight objectives
                 if (eventType === 'weighFish' && objective.type === 'weighFishByWeight' && objective.minWeight) {
                     const fishWeight = eventData.weight || 0;
                     
                     if (fishWeight >= objective.minWeight) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }
                 
                 // Handle weighLeaderboardFish objectives
                 if (eventType === 'weighFish' && objective.type === 'weighLeaderboardFish') {
                     const madeLeaderboard = eventData.madeLeaderboard || false;
                     
                     if (madeLeaderboard) {
                         const oldProgress = activeQuest.objectivesProgress[index] || 0;
                         activeQuest.objectivesProgress[index] = oldProgress + 1;
                         objectiveProgressMade = true;
                     }
                 }

                 if (objectiveProgressMade) {
                    questProgressMade = true;
                    
                    // Send quest update notification for objective progress
                    const currentProgress = activeQuest.objectivesProgress[index] || 0;
                    
                    // Generate user-friendly objective text
                    let objectiveText = '';
                    if (objective.type === 'catchFish') {
                        const fishName = objective.fishType || 'fish';
                        objectiveText = `${fishName} caught`;
                    } else if (objective.type === 'catchFishMinWeight') {
                        const fishName = objective.fishType === 'Any' ? 'fish' : (objective.fishType || 'fish');
                        const minWeight = objective.minWeight || objective.minimumWeight || 0;
                        const weightText = minWeight > 0 ? ` (${minWeight}lbs+)` : '';
                        const trophyText = objective.isTrophy ? ' trophy' : '';
                        objectiveText = `${fishName}${trophyText}${weightText} caught`;
                    } else if (objective.type === 'gatherItem') {
                        const itemName = objective.itemId || 'item';
                        objectiveText = `${itemName} acquired`;
                    } else if (objective.type === 'sellFish') {
                        const fishName = objective.fishType || 'fish';
                        objectiveText = `${fishName} sold`;
                    } else if (objective.type === 'collectItems') {
                        // Use description or generate from itemIds
                        if (objective.itemIds && objective.itemIds.length > 0) {
                            const itemName = objective.itemIds[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            objectiveText = `${itemName} collected`;
                        } else {
                            objectiveText = `Item collected`;
                        }
                    } else {
                        objectiveText = `Objective ${index + 1}`;
                    }
                    
                    // Don't send notification on progress updates - only on assignment and completion
                    // Removed progress notification to reduce noise
                    
                    if (activeQuest.objectivesProgress[index] >= objective.count) {
                         // Check if *all* objectives are now complete
                         const allObjectivesMet = definition.objectives.every((obj, idx) =>
                            (activeQuest.objectivesProgress[idx] || 0) >= obj.count
                         );

                         if (allObjectivesMet) {
                             
                             // Check if quest has autoComplete flag (daily quests)
                             if (definition.autoComplete) {
                                 // Auto-complete: Award rewards immediately and remove quest
                                 this.completeQuest(player, questId, true); // true = skip turn-in
                                 return; // Exit early, quest is complete
                             }
                             
                             // Handle different quest completion paths
                             if (questId === 'sea_story_catch') {
                                 // Sea story quest: Tell player to sell fish and update tracker
                                 const mainStory = this.seaStoryManager.getCurrentSeaStory();
                                 const fishType = mainStory ? mainStory.fishType : 'your catch';
                                 this.messageManager.sendGameMessage(`✨ Great catch! Sell your ${fishType} at the Fishmonger for bonus coins!`, player);
                                 // Set a special flag for sea story quest tracker
                                 activeQuest.requiresSellAtFishmonger = true;
                            } else {
                                // Standard quests: Mark for turn-in and send follow-up message
                                // Only send notification if not already marked for turn-in (prevent duplicates)
                                if (!activeQuest.requiresTurnIn) {
                                    activeQuest.requiresTurnIn = true;
                                    this.sendQuestCompletionFollowUpMessage(player, questId, definition);
                                    // Send standardized quest log update notification
                                    const isMobile = this.playerStateManager.isMobile(player);
                                    const mobileText = isMobile ? '(Or tap quest button on mobile)' : '';
                                    this.sendQuestUpdateNotification(player, questId, 'complete', 
                                        `Quest log updated. Press [P] to view. ${mobileText}`.trim());
                                }
                            }
                         }
                    }
                 }
            });

            if (questProgressMade) {
                this.sendActiveQuestsUpdate(player);
            }
        }

        // Recalculate progress based on current inventory for inventory-dependent events
        if (eventType === 'sellFish' || eventType === 'addItem') {
            this.recalculateInventoryBasedProgress(player);
        }

        // Update tutorial arrows when quest progress changes
        // SKIP arrow updates for catchFish events - they will be handled in FishingMiniGame.ts
        // after the fish is confirmed to be in inventory
        if (eventType !== 'catchFish') {
            // For non-catchFish events, update arrows normally
            setTimeout(() => {
                this.updateTutorialArrows(player);
            }, 100);
        }
        // For catchFish events, arrows will be updated in FishingMiniGame.ts after fish is in inventory
    }

    /**
     * Updates tutorial arrows for player based on current quest state
     */
    private updateTutorialArrows(player: Player): void {
        const world = GameManager.instance?.getWorld();
        if (!world) return;

        const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) return;

        const playerEntity = playerEntities[0];
        if (playerEntity && (playerEntity as any).arrowManager) {
            (playerEntity as any).arrowManager.updateArrowsForPlayer(player);
        }
    }

    /**
     * Recalculates quest progress based on current inventory state.
     * This ensures that selling items reduces progress appropriately.
     * ONLY applies to inventory-dependent quests, not accumulation quests.
     */
    public recalculateInventoryBasedProgress(player: Player): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;

        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) return;

        let progressChanged = false;

        for (const questId in playerState.quests.active) {
            const activeQuest = playerState.quests.active[questId];
            const definition = this.getQuestDefinition(questId);

            if (!definition || activeQuest.status !== 'active') continue;

            // Angler quests, sea story quests, and gatherItem quests are inventory-based
            // Other quest types might be accumulation-based
            const isInventoryBasedQuest = questId === 'sea_story_catch' || 
                                         questId.startsWith('angler_quest_') || 
                                         questId.startsWith('inventory_quest_') ||
                                         questId === 'fitz_quest_0_worms';
            
            if (!isInventoryBasedQuest) {
                continue; // Skip accumulation-based quests
            }

            // Handle inventory-based quests
            definition.objectives.forEach((objective, index) => {
                // Handle gatherItem objectives (e.g., worms quest)
                if (objective.type === 'gatherItem' && objective.itemId) {
                    // Check for both the raw item ID and the bait version (e.g., 'worm' and 'bait_worm')
                    const itemId = objective.itemId;
                    const baitItemId = `bait_${itemId}`;
                    
                    // Count matching items in current inventory (check both IDs)
                    const currentCount = inventory.items.filter(
                        item => (item.id === itemId || item.id === baitItemId || item.id.startsWith(`${itemId}_`))
                    ).reduce((sum, item) => sum + (item.quantity || 1), 0);

                    const oldProgress = activeQuest.objectivesProgress[index] || 0;
                    const newProgress = Math.min(currentCount, objective.count);

                    if (oldProgress !== newProgress) {
                        activeQuest.objectivesProgress[index] = newProgress;
                        progressChanged = true;

                        // Clear completion flags if progress dropped
                        if (newProgress < objective.count) {
                            activeQuest.requiresTurnIn = false;
                        }
                    }
                } else if (objective.type === 'catchFish' && objective.fishType) {
                    let requiredFishType: string | undefined = objective.fishType;
                    
                    // Handle dynamic fish type for sea story quest
                    if (questId === 'sea_story_catch' && requiredFishType === '[DYNAMIC_FISH_TYPE]') {
                        const mainStory = this.seaStoryManager.getCurrentSeaStory();
                        requiredFishType = mainStory ? mainStory.fishType : undefined;
                    }

                    if (requiredFishType) {
                        // Count matching fish in current inventory
                        const currentCount = inventory.items.filter(
                            item => item.type === 'fish' && item.name === requiredFishType
                        ).reduce((sum, item) => sum + (item.quantity || 1), 0);

                        const oldProgress = activeQuest.objectivesProgress[index] || 0;
                        const newProgress = Math.min(currentCount, objective.count);

                        if (oldProgress !== newProgress) {
                            activeQuest.objectivesProgress[index] = newProgress;
                            progressChanged = true;

                            // Clear completion flags if progress dropped
                            if (newProgress < objective.count) {
                                delete (activeQuest as any).requiresTurnIn;
                                delete (activeQuest as any).requiresSellAtFishmonger;
                            }
                        }
                    }
                }
                // Add similar logic for other inventory-dependent objective types if needed
            });
        }

        if (progressChanged) {
            this.sendActiveQuestsUpdate(player);
        }
    }

    /**
     * Sends quest update notification to GameUpdatesPanel
     * Delays by 7 seconds to allow achievement popups to clear first
     */
    private sendQuestUpdateNotification(player: Player, questId: string, questType: 'objective' | 'complete', message: string): void {
        const messageId = `quest-${questId}-${Date.now()}`;
        
        // Deduplication: Check if same message was sent recently (within 5 seconds)
        const dedupeKey = `${player.id}:${message}`;
        const now = Date.now();
        const lastSent = this.recentQuestNotifications.get(dedupeKey);
        if (lastSent && (now - lastSent < 5000)) {
            return;
        }
        this.recentQuestNotifications.set(dedupeKey, now);
        
        // Clean up old entries occasionally
        if (Math.random() < 0.1) {
            for (const [key, timestamp] of this.recentQuestNotifications.entries()) {
                if (now - timestamp > 10000) { // Remove entries older than 10 seconds
                    this.recentQuestNotifications.delete(key);
                }
            }
        }
        
        // Delay 7 seconds before sending to allow achievement popups to clear
        setTimeout(() => {
            player.ui.sendData({
                type: 'questUpdate',
                message: message,
                messageId: messageId,
                questId: questId,
                questType: questType
            });
        }, 7000); // 7 second delay
    }

    private sendQuestCompletionFollowUpMessage(player: Player, questId: string, definition: QuestDefinition): void {
        let followUpMessage = "";

        // Determine appropriate follow-up message based on quest
        if (questId.startsWith('angler_quest_')) {
            followUpMessage = "🎣 Return to the Angler for your reward!";
        } else if (definition.turnInNpcId) {
            // Generic message for quests with turn-in NPCs
            const npcName = this.getNpcDisplayName(definition.turnInNpcId);
            followUpMessage = `✅ Return to ${npcName} for your reward!`;
        } else {
            // Fallback message
            followUpMessage = "✅ Quest objectives complete! Return to the quest giver for your reward.";
        }

        this.messageManager.sendGameMessage(followUpMessage, player);
    }

    /**
     * Completes the sea story quest directly when fish is sold (no turn-in required).
     */
    private completeSeaStoryQuest(player: Player, questId: string): void {
         const playerState = this.playerStateManager.getState(player);
         const activeQuest = playerState?.quests.active[questId];
         const definition = this.getQuestDefinition(questId);

         if (!playerState || !activeQuest || !definition || activeQuest.status !== 'active') {
              console.warn(`[QuestManager] Cannot complete sea story quest ${questId} for player ${player.id}. Conditions not met.`);
              return;
         }

         // --- Update Quest State ---
         activeQuest.status = 'completed';
         activeQuest.completedTimestamp = Date.now();
         delete (activeQuest as any).requiresSellAtFishmonger; // Clean up the flag
         playerState.quests.completed[questId] = activeQuest; // Move to completed
         delete playerState.quests.active[questId];       // Remove from active
         this.sendActiveQuestsUpdate(player); // Send remaining active quests

         // --- Grant Rewards ---
         this.grantRewards(player, questId);

         // --- Notify Player ---
         this.messageManager.sendGameMessage(`Quest Complete: ${definition.title}! Your catch earned bonus rewards!`, player);
    }

    /**
     * Helper to get display name for NPCs.
     */
    private getNpcDisplayName(npcId: string): string {
        const displayNames: { [key: string]: string } = {
            'angler': 'Angler',
            'fitzwilliam': 'Fitzwilliam',
            'greeter': 'Phsher',
            'welcome_npc': 'Phsher',
            'fishmonger': 'Fishmonger',
            'toolmaster': 'Toolmaster',
            'roddy': 'Roddy',
            'mariner': 'Mariner',
            'collector': 'Collector',
            'explorer': 'Explorer'
        };
        return displayNames[npcId] || npcId;
    }

    /**
     * Grants the rewards specified in the quest definition to the player.
     * Modified to use ItemFactory and send reward summary message.
     */
    private grantRewards(player: Player, questId: string): void {
        const definition = this.getQuestDefinition(questId);
        if (!definition) return;


        const rewards = definition.rewards;
        const rewardMessages: string[] = []; // Track what was actually granted

        // Grant Experience
        if (rewards.experience) {
            this.playerStateManager.addXP(player, rewards.experience);
            rewardMessages.push(`${rewards.experience} XP`);
        }

        // Grant Coins
        if (rewards.coins) {
            this.playerStateManager.addCoins(player, rewards.coins);
            rewardMessages.push(`${rewards.coins} coins`);
        }

        // Grant Items using ItemFactory
        if (rewards.items && rewards.items.length > 0) {
            rewards.items!.forEach((itemReward, index) => {
                try {
                    let itemToGrant: InventoryItem | null = null;

                    // Check if item is a rod by looking in the FISHING_RODS catalog
                    const isRodItem = FISHING_RODS.some(rod => rod.id === itemReward.itemId);
                    
                    if (isRodItem) {
                        // Assuming count is 1 for rods
                        itemToGrant = ItemFactory.createRodItem(itemReward.itemId);
                    } else {
                        // All other lootable items (bait, loot, etc.)
                        itemToGrant = ItemFactory.createInventoryItemFromLootId(itemReward.itemId, itemReward.count);
                    }

                    if (itemToGrant) {
                        const granted = this.inventoryManager.addItem(player, itemToGrant);
                        
                        if (granted) {
                            // Verify the item was actually added
                            const inventory = this.inventoryManager.getInventory(player);
                            const itemInInventory = inventory?.items.find(i => i.id === itemReward.itemId);
                            if (itemInInventory) {
                                // Auto-equip beginner rod when granted from getting started quest
                                if (itemReward.itemId === 'beginner-rod' && (questId === 'fitz_quest_getting_started' || questId === 'fitz_quest_0_worms')) {
                                    this.inventoryManager.equipItem(player, 'beginner-rod');
                                    console.log(`[QuestManager] Auto-equipped beginner rod for player ${player.id} after completing getting started quest`);
                                }
                            } else {
                                console.warn(`[QuestManager] ⚠ WARNING: addItem returned true but item ${itemReward.itemId} not found in inventory!`);
                            }
                            
                            // Display relic shard if it's a relic shard reward
                            if (itemReward.itemId === 'relic_shard') {
                                // Check if this is Fitz's quest - use special UI panel
                                if (questId === 'fitz_quest_bait_fishing') {
                                    // Show single shard reward UI panel
                                    player.ui.sendData({
                                        type: 'showRelicShardReward',
                                        shardData: {
                                            id: 'relic_shard',
                                            name: 'Relic Shard',
                                            rarity: 'legendary'
                                        }
                                    });
                                    // Send discovery message
                                    this.messageManager.sendRichGameMessage('You were given an ancient relic shard!', player, {
                                        bonus: 'Looks like a part of something bigger. I should look for more pieces.',
                                        rarity: 'epic',
                                        duration: 5000
                                    });
                                } else {
                                    // For other quests (Brock, Forrest), use 3D display
                                    this.displayRelicShard(player);
                                    this.messageManager.sendRichGameMessage('A relic shard appeared!', player, {
                                        bonus: 'Added to inventory',
                                        rarity: 'epic',
                                        duration: 5000
                                    });
                                }
                            }
                            
                            // Display pharaoh hilt if it's a pharaoh hilt reward
                            if (itemReward.itemId === 'pharaoh_hilt') {
                                // Show pharaoh hilt reward UI panel (same as relic shard panel)
                                player.ui.sendData({
                                    type: 'showRelicShardReward',
                                    shardData: {
                                        id: 'pharaoh_hilt',
                                        name: 'Pharaoh Hilt',
                                        rarity: 'epic',
                                        text: "You were rewarded a pharaoh hilt - a piece of an ancient puzzle."
                                    }
                                });
                                // Send discovery message
                                this.messageManager.sendRichGameMessage('You received a pharaoh hilt', player, {
                                    bonus: 'A piece of an ancient puzzle',
                                    rarity: 'epic',
                                    duration: 5000
                                });
                            }
                            
                            // Add to reward messages using the actual item name
                            const itemName = itemToGrant.name || itemReward.itemId;
                            const countText = itemReward.count > 1 ? ` x${itemReward.count}` : '';
                            rewardMessages.push(`${itemName}${countText}`);
                        } else {
                            console.error(`[QuestManager] ✗ Failed to grant item ${itemReward.itemId} x${itemReward.count}. Inventory might be full or addItem returned false.`);
                            // Still show what was supposed to be granted, but with a note
                            const itemName = itemToGrant.name || itemReward.itemId;
                            const countText = itemReward.count > 1 ? ` x${itemReward.count}` : '';
                            rewardMessages.push(`${itemName}${countText} (inventory full)`);
                        }
                    } else {
                         console.error(`[QuestManager] ✗ ItemFactory failed to create item for ID: ${itemReward.itemId} - returned null/undefined`);
                    }
                } catch (error) {
                     console.error(`[QuestManager] ✗ Exception while creating/granting item ${itemReward.itemId}:`, error);
                     if (error instanceof Error) {
                         console.error(`[QuestManager] Error stack:`, error.stack);
                     }
                }
            });
        } else {
        }

        // Send reward summary message to player (skip for relic shard quests - they have special message)
        const isRelicShardQuest = questId === 'fitz_quest_bait_fishing' ||
                                  questId === 'brock_strength_test' || 
                                  questId === 'forrest_anglerfish_light';
        const isPharaohHiltQuest = questId === 'researcher_pharaoh_hilt';
        if (rewardMessages.length > 0 && !isRelicShardQuest && !isPharaohHiltQuest) {
            const rewardSummary = this.formatRewardMessage(rewardMessages);
            this.messageManager.sendGameMessage(`🎁 Quest Rewards: ${rewardSummary}`, player);
        } else if (isRelicShardQuest || isPharaohHiltQuest) {
            // Relic shard and pharaoh hilt quests have their own special messages/UI
        }
    }
    
    private displayRelicShard(player: Player): void {
        const world = GameManager.instance?.getWorld();
        if (!world) return;
        
        const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) return;
        
        const playerEntity = playerEntities[0] as GamePlayerEntity;
        
        // Remove existing display items (only despawn if they're actually spawned)
        const existingDisplays = world.entityManager.getAllEntities().filter(
            entity => entity.name === 'displayRelicShard' && entity.isSpawned
        );
        existingDisplays.forEach(entity => {
            try {
                if (entity.isSpawned) {
                    entity.despawn();
                }
            } catch (error) {
                // Entity may have already been despawned, ignore error
                console.warn(`[QuestManager] Error despawning display entity:`, error);
            }
        });
        
        // Create display entity
        const displayEntity = new Entity({
            name: 'displayRelicShard',
            modelUri: 'models/items/relic_shard.gltf',
            modelScale: 1.5,
            parent: playerEntity,
        });
        
        const baseY = playerEntity.isBoating ? 1.6 : 1.2;
        displayEntity.spawn(world, { x: 0, y: baseY, z: 0 });
        displayEntity.setAngularVelocity({ x: 0, y: Math.PI / 2, z: 0 });
        
        // Rotate and float animation
        let startTime = Date.now();
        const duration = 3000;
        const floatY = playerEntity.isBoating ? 3 : 1.5;
        const floatHeight = 0.3;
        
        const animateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(animateInterval);
                displayEntity.despawn();
                return;
            }
            
            displayEntity.rotation.y = progress * Math.PI * 2;
            displayEntity.position.y = floatY + Math.sin(progress * Math.PI * 2) * floatHeight;
        }, 16);
    }

    /**
     * Removes quest items from player inventory when quest is completed.
     * Handles both catchFish and collectItems objectives.
     */
    private removeQuestItemsFromInventory(player: Player, definition: QuestDefinition): void {
        
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) {
            console.error(`[QuestManager] No inventory found for player ${player.id}`);
            return;
        }
        
        definition.objectives.forEach((objective, index) => {
            if (objective.type === 'catchFish' && objective.fishType) {
                const itemsToRemove = objective.count;
                
                // Find items by name (since objective.fishType is the fish name, not ID)
                const matchingItems = inventory.items.filter(item => 
                    item.type === 'fish' && item.name === objective.fishType
                );
                
                let removedCount = 0;
                for (const item of matchingItems) {
                    if (removedCount >= itemsToRemove) break;
                    
                    const removeFromThisItem = Math.min(item.quantity || 1, itemsToRemove - removedCount);
                    
                    for (let i = 0; i < removeFromThisItem; i++) {
                        const removed = this.inventoryManager.removeItem(player, item.id, 1);
                    if (removed) {
                            removedCount++;
                    } else {
                            console.warn(`[QuestManager] Failed to remove ${objective.fishType} (ID: ${item.id}) from inventory`);
                            break;
                    }
                    }
                }
                
                if (removedCount < itemsToRemove) {
                    console.warn(`[QuestManager] Only removed ${removedCount}/${itemsToRemove} ${objective.fishType} items - some may not exist`);
                }
            } else if (objective.type === 'collectItems' && objective.itemIds) {
                const itemsToRemove = objective.count;
                
                // For collectItems, we need to remove items matching any of the itemIds
                let removedCount = 0;
                
                for (const itemId of objective.itemIds) {
                    if (removedCount >= itemsToRemove) break;
                    
                    // Find items matching this itemId
                    const matchingItem = inventory.items.find(item => item.id === itemId);
                    
                    if (matchingItem) {
                        const currentQuantity = matchingItem.quantity || 1;
                        const toRemove = Math.min(currentQuantity, itemsToRemove - removedCount);
                        
                        if (toRemove >= currentQuantity) {
                            // Remove entire item using inventoryManager method
                            if (this.inventoryManager.removeItem(player, itemId, currentQuantity)) {
                                removedCount += currentQuantity;
                            }
                        } else {
                            // Remove partial quantity using inventoryManager method
                            if (this.inventoryManager.removeItem(player, itemId, toRemove)) {
                                removedCount += toRemove;
                            }
                        }
                    }
                }
                
                // Update inventory UI
                this.inventoryManager.updateInventoryUI(player);
                
                if (removedCount < itemsToRemove) {
                    console.warn(`[QuestManager] Only removed ${removedCount}/${itemsToRemove} items from collectItems objective - some may not exist`);
                } else {
                }
            }
        });
    }

    /**
     * Formats a list of reward messages into a nice summary string.
     */
    private formatRewardMessage(rewardMessages: string[]): string {
        if (rewardMessages.length === 0) return "None";
        if (rewardMessages.length === 1) return rewardMessages[0];
        if (rewardMessages.length === 2) return `${rewardMessages[0]} and ${rewardMessages[1]}`;
        
        // For 3+ items: "item1, item2, and item3"
        const lastItem = rewardMessages.pop();
        return `${rewardMessages.join(', ')}, and ${lastItem}`;
    }

    /**
     * Helper function to send the tracked quest update to the client UI.
     * Sends up to 3 active quests to the client UI.
     */
    private sendActiveQuestsUpdate(player: Player): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;

        const activeQuestsMap = playerState.quests.active;
        const questsToSend: any[] = []; // Array to hold { definition, progress, dynamicData }


        // Iterate through all active quests (no limit - send all quests to UI)
        for (const questId in activeQuestsMap) {

            const progress = activeQuestsMap[questId];
            const definition = this.getQuestDefinition(questId);

            if (!definition) {
                console.warn(`[QuestManager] Could not find definition for active quest ${questId}. Skipping.`);
                continue;
            }

            // Prepare dynamic data (currently only for sea story)
            let dynamicData: any = {};
            let questDescription = definition.description;
            
            if (questId === 'sea_story_catch') {
                const mainStory = this.seaStoryManager.getCurrentSeaStory();
                const fishType = mainStory ? mainStory.fishType : "rare fish";
                dynamicData.targetFishType = fishType;
                // Replace [FISH_TYPE] placeholder in description
                questDescription = questDescription.replace(/\[FISH_TYPE\]/g, fishType);
            }
            
            // Handle dynamic description for fitz_quest_4_map_delivery
            if (questId === 'fitz_quest_4_map_delivery') {
                const objective0Complete = (progress.objectivesProgress[0] || 0) >= 1;
                const objective1Complete = (progress.objectivesProgress[1] || 0) >= 1;
                const objective2Complete = (progress.objectivesProgress[2] || 0) >= 1; // show_shards_to_fitzwilliam
                const objective3Complete = (progress.objectivesProgress[3] || 0) >= 1; // assemble_shards_with_wizard
                
                if (objective3Complete) {
                    // All objectives complete - quest should be completed by wizard
                    questDescription = "You've assembled the shards! The quest is complete.";
                } else if (objective2Complete) {
                    // Shards shown to Fitzwilliam - update description with wizard info
                    questDescription = "Fitzwilliam has directed you to bring the three relic shards to the wizard at the Shadow Isle altar at night to assemble them. The wizard will know what to do.";
                } else if (objective1Complete) {
                    // All shards collected - ready to return to Phsher (Greeter)
                    questDescription = "You've collected all three relic shards! Return to Phsher to show them to them.";
                } else if (objective0Complete) {
                    // Scroll shown, but shards not all collected yet
                    const shardQuestsCompleted = 
                        (playerState.quests.completed['fitz_quest_bait_fishing'] ? 1 : 0) +
                        (playerState.quests.completed['brock_strength_test'] ? 1 : 0) +
                        (playerState.quests.completed['forrest_anglerfish_light'] ? 1 : 0);
                    
                    if (shardQuestsCompleted === 0) {
                        questDescription = "You've shown the scroll to the Explorer. Now seek out those who can help solve each clue and collect the three relic shards.";
                    } else if (shardQuestsCompleted < 3) {
                        questDescription = `You've collected ${shardQuestsCompleted} of 3 relic shards. Continue seeking out those who can help solve the remaining clues.`;
                    }
                }
            }

            // Create a copy of definition with replaced description
            // IMPORTANT: Ensure objectives are included (they should be, but make sure)
            const definitionWithReplacedDescription = {
                ...definition,
                description: questDescription,
                objectives: definition.objectives || [] // Explicitly include objectives
            };
            

            // Include turn-in information for quest tracker
            const questData = {
                definition: definitionWithReplacedDescription,
                progress,
                dynamicData,
                requiresTurnIn: progress.requiresTurnIn || false,
                turnInNpcName: definition.turnInNpcId ? this.getNpcDisplayName(definition.turnInNpcId) : null,
                nextStepMessage: this.getNextStepMessage(questId, progress, definition)
            };

            questsToSend.push(questData);
        }

        player.ui.sendData({
            type: 'questTrackerUpdate',
            trackedQuests: questsToSend // Send the array
        });
    }

    /**
     * Marks a quest as completed, moves it from active to completed, and grants rewards.
     * Called explicitly when player interacts with the turn-in NPC.
     */
    public completeQuest(player: Player, questId: string, skipTurnIn: boolean = false): boolean {
         const playerState = this.playerStateManager.getState(player);
         const activeQuest = playerState?.quests.active[questId];
         const definition = this.getQuestDefinition(questId);

         // Check if quest exists and is active
         // For auto-complete (skipTurnIn), don't require requiresTurnIn flag
         if (!playerState || !activeQuest || !definition || activeQuest.status !== 'active') {
              console.warn(`[QuestManager] Cannot complete quest ${questId} for player ${player.id}. Quest not active or missing.`);
              return false;
         }
         
         // For regular turn-in, require requiresTurnIn flag
         if (!skipTurnIn && !activeQuest.requiresTurnIn) {
              console.warn(`[QuestManager] Cannot complete quest ${questId} for player ${player.id}. Quest not ready for turn-in.`);
              return false;
         }


         // --- Remove Quest Items from Inventory (only for non-auto-complete quests that require items) ---
         // Daily quests are accumulation-based, so we don't remove items
         if (!skipTurnIn) {
             this.removeQuestItemsFromInventory(player, definition);
         }

         // --- Update Quest State ---
         activeQuest.status = 'completed';
         activeQuest.completedTimestamp = Date.now();
         delete activeQuest.requiresTurnIn; // Remove the flag
         playerState.quests.completed[questId] = activeQuest; // Move to completed
         delete playerState.quests.active[questId];       // Remove from active
         this.sendActiveQuestsUpdate(player); // Send remaining active quests

         // --- Grant Rewards ---
         this.grantRewards(player, questId);

        // --- Notify Player ---
        // Check if this is a relic shard quest - if so, skip all messages (notification already sent)
        const isRelicShardQuest = questId === 'fitz_quest_bait_fishing' ||
                                  questId === 'brock_strength_test' || 
                                  questId === 'forrest_anglerfish_light';
        
        if (isRelicShardQuest) {
            // Skip all messages - relic shard notification already sent (during catch for Explorer, during grantRewards for Brock/Forrest)
            
            // Check if all three shard quests are now completed, and update fitz_quest_4_map_delivery if active
            this.checkAndUpdateFitzMetaQuest(player);
        } else if (skipTurnIn) {
            // Check if it's actually a daily quest (not just any auto-complete quest)
            const isDailyQuest = questId.startsWith('daily_') || definition.repeatable === 'daily';
            if (isDailyQuest) {
                // Auto-complete message for daily quests
                const xpReward = definition.rewards.experience || 0;
                this.messageManager.sendGameMessage(`Daily Challenge Complete: ${definition.title}! +${xpReward} XP`, player);
            } 
        } else {
            this.messageManager.sendGameMessage(`Quest Complete: ${definition.title}!`, player);
        }

        // Update tutorial arrows when quest is completed
        this.updateTutorialArrows(player);

        // Save player data after quest completion to persist quest state - debounced is fine
        this.playerStateManager.save(player);

         return true;
    }

    /**
     * Checks if all three relic shard quests are completed and updates fitz_quest_4_map_delivery accordingly.
     * Called after each shard quest completes.
     */
    private checkAndUpdateFitzMetaQuest(player: Player): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;

        const META_QUEST_ID = 'fitz_quest_4_map_delivery';
        const metaQuest = playerState.quests.active[META_QUEST_ID];
        
        // Only proceed if the meta quest is active
        if (!metaQuest) {
            return;
        }

        // Check if all three shard quests are completed
        const allShardQuestsCompleted = 
            playerState.quests.completed['fitz_quest_bait_fishing'] &&
            playerState.quests.completed['brock_strength_test'] &&
            playerState.quests.completed['forrest_anglerfish_light'];

        if (allShardQuestsCompleted) {
            // Complete the second objective (collect all three shards)
            this.completeQuestObjective(player, META_QUEST_ID, 'collect_all_three_shards');
            
            // Send notification that all tests are complete
            this.messageManager.sendRichGameMessage('All Three Tests Complete!', player, {
                bonus: 'Return to Phsher with the three relic shards',
                rarity: 'epic',
                duration: 5000
            });
            
            // Also send quest update notification
            this.sendQuestUpdateNotification(player, META_QUEST_ID, 'objective', 
                'Quest log updated. Press [P] to view.');
        }
    }

    /**
     * Completes a custom quest objective by its ID.
     * Used for objectives with type: "custom" and an "id" field.
     */
    public completeQuestObjective(player: Player, questId: string, objectiveId: string): boolean {
        const playerState = this.playerStateManager.getState(player);
        const activeQuest = playerState?.quests.active[questId];
        const definition = this.getQuestDefinition(questId);

        if (!playerState || !activeQuest || !definition || activeQuest.status !== 'active') {
            console.warn(`[QuestManager] Cannot complete objective ${objectiveId} for quest ${questId} - quest not active.`);
            return false;
        }

        // Find the objective by its custom ID
        const objectiveIndex = definition.objectives.findIndex(
            (obj: any) => obj.type === 'custom' && obj.id === objectiveId
        );

        if (objectiveIndex === -1) {
            console.warn(`[QuestManager] Objective with ID "${objectiveId}" not found in quest ${questId}`);
            return false;
        }

        const objective = definition.objectives[objectiveIndex];
        const currentProgress = activeQuest.objectivesProgress[objectiveIndex] || 0;

        // Default count to 1 if missing (defensive coding for quest definitions)
        const targetCount = objective.count ?? 1;
        if (objective.count === undefined) {
            console.warn(`[QuestManager] Objective ${objectiveId} in quest ${questId} is missing 'count' field. Defaulting to 1.`);
        }

        // Update progress (custom objectives typically have count: 1)
        if (currentProgress < targetCount) {
            activeQuest.objectivesProgress[objectiveIndex] = targetCount;

            // Check if all objectives are now complete
            const allObjectivesMet = definition.objectives.every((obj, idx) =>
                (activeQuest.objectivesProgress[idx] || 0) >= (obj.count ?? 1)
            );

            if (allObjectivesMet) {
                
                // Check if this quest will auto-complete (only if explicitly set to true)
                // Note: fitz_quest_bait_fishing should NOT auto-complete - player must turn in to Fitzwilliam
                const willAutoComplete = definition.autoComplete === true;
                
                if (willAutoComplete) {
                    // Actually complete the quest immediately (like Brock's quest does)
                    this.completeQuest(player, questId, true);
                    return true; // Return early since completeQuest handles everything
                } else {
                    // Mark quest as ready for turn-in
                    activeQuest.requiresTurnIn = true;
                    
                    // Skip follow-up message for fitz_quest_4_map_delivery - we already send a message in checkAndUpdateFitzMetaQuest
                    if (questId !== 'fitz_quest_4_map_delivery') {
                        this.sendQuestCompletionFollowUpMessage(player, questId, definition);
                    }
                    
                    // Send quest update notification
                    const isMobile = this.playerStateManager.isMobile(player);
                    const mobileText = isMobile ? '(Or tap quest button on mobile)' : '';
                    this.sendQuestUpdateNotification(player, questId, 'complete', 
                        `Quest log updated. Press [P] to view. ${mobileText}`.trim());
                }
            }

            // Send quest update to UI
            this.sendActiveQuestsUpdate(player);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Gets the next step message for a quest based on current progress.
     */
    private getNextStepMessage(questId: string, activeQuest: PlayerQuestState, definition: QuestDefinition): string {
        // Check if all objectives are complete
        const allObjectivesMet = definition.objectives.every((obj, idx) =>
            (activeQuest.objectivesProgress[idx] || 0) >= obj.count
        );

        if (allObjectivesMet) {
            // Quest objectives complete - show what to do next
            if (questId === 'sea_story_catch' && (activeQuest as any).requiresSellAtFishmonger) {
                return `🐟 Sell your fish at the market for a bonus`;
            } else if ((activeQuest as any).requiresTurnIn && definition.turnInNpcId) {
                const npcName = this.getNpcDisplayName(definition.turnInNpcId);
                return `✅ Return to ${npcName} for your reward!`;
            }
        }

        // For incomplete objectives, return empty string (just show the objectives)
        return "";
    }

    /**
     * Called when quest data is restored from persistence.
     * Updates the UI with any active quests.
     */
    public onQuestDataRestored(player: Player): void {
        
        // Check and reset daily stats if needed (new day)
        const wasReset = this.playerStateManager.checkAndResetDailyStats(player);
        
        // REMOVED: Daily quest pool generation and cleanup (auto-assignment disabled)
        // Daily quests will be handled by NPCs in the future
        
        // Clean up expired sea story quests first (before other checks)
        this.cleanupExpiredSeaStoryQuests(player);
        
        // Recalculate inventory-based progress in case inventory changed
        this.recalculateInventoryBasedProgress(player);
        
        // Check if any active quests should be marked as ready for turn-in
        this.recheckQuestCompletionStatus(player);
        
        // Send active quests to UI
        this.sendActiveQuestsUpdate(player);
        
        // Handle delayed daily login bonus (daily quests removed)
        // Sequence: spawn → 10s → level check → login bonus
        this.handleDelayedDailyContent(player);
    }

    /**
     * Cleans up expired sea story quests that are no longer valid.
     * A sea story quest is considered expired if:
     * 1. The current sea story has changed (different fish type), OR
     * 2. The quest was assigned before the current sea story was generated
     */
    private cleanupExpiredSeaStoryQuests(player: Player): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;

        const activeQuest = playerState.quests.active['sea_story_catch'];
        if (!activeQuest) return; // No sea story quest active

        const currentSeaStory = this.seaStoryManager.getCurrentSeaStory();
        if (!currentSeaStory) {
            // No current sea story - remove the quest
            delete playerState.quests.active['sea_story_catch'];
            this.sendActiveQuestsUpdate(player);
            this.messageManager.sendGameMessage('The trending fish quest has expired. Check with the gossip for the latest hot catch!', player);
            return;
        }

        // Check if quest was assigned before the current sea story was generated
        const questAssignedTime = activeQuest.assignedTimestamp || 0;
        const seaStoryGeneratedTime = currentSeaStory.timestamp || 0;

        if (questAssignedTime < seaStoryGeneratedTime) {
            // Quest was assigned before current sea story - it's expired
            delete playerState.quests.active['sea_story_catch'];
            this.sendActiveQuestsUpdate(player);
            this.messageManager.sendGameMessage(`The trending fish quest has expired. The new hot catch is ${currentSeaStory.fishType}! Check with the gossip for details.`, player);
        }
    }


    /**
     * Rechecks completion status for all active quests and marks them for turn-in if objectives are met.
     * This is useful when quest data is restored or inventory changes.
     */
    private recheckQuestCompletionStatus(player: Player): void {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return;

        let statusChanged = false;

        for (const questId in playerState.quests.active) {
            const activeQuest = playerState.quests.active[questId];
            const definition = this.getQuestDefinition(questId);

            if (!definition || activeQuest.status !== 'active') continue;

            // Skip if already marked for completion
            if ((activeQuest as any).requiresTurnIn || (activeQuest as any).requiresSellAtFishmonger) continue;

            // Check if all objectives are now complete
            const allObjectivesMet = definition.objectives.every((obj, idx) =>
                (activeQuest.objectivesProgress[idx] || 0) >= obj.count
            );

            if (allObjectivesMet) {
                
                // Handle different quest completion paths
                if (questId === 'sea_story_catch') {
                    // Sea story quest: Tell player to sell fish and update tracker
                    const mainStory = this.seaStoryManager.getCurrentSeaStory();
                    const fishType = mainStory ? mainStory.fishType : 'your catch';
                    this.messageManager.sendGameMessage(`✨ Great catch! Sell your ${fishType} at the Fishmonger for bonus coins!`, player);
                    // Set a special flag for sea story quest tracker
                    (activeQuest as any).requiresSellAtFishmonger = true;
                } else {
                    // Standard quests: Mark for turn-in and send follow-up message
                    (activeQuest as any).requiresTurnIn = true;
                    this.sendQuestCompletionFollowUpMessage(player, questId, definition);
                }
                
                statusChanged = true;
            }
        }


    }







    
    /**
     * Gets today's date as YYYY-MM-DD string.
     */
    private getTodayDateString(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Handles delayed daily login bonus after player spawns.
     * Sequence: spawn → 10s → level check → login bonus
     * Prevents duplicate handlers if called multiple times.
     * 
     * NOTE: Daily quest auto-assignment has been removed.
     * Daily quests will be handled by NPCs in the future.
     */
    private handleDelayedDailyContent(player: Player): void {
        // Clear any existing handler for this player
        const existingHandler = this.delayedContentHandlers.get(player.id);
        if (existingHandler) {
            clearTimeout(existingHandler);
        }
        
        // Wait 10 seconds after spawn
        const handler = setTimeout(() => {
            // Remove from map when handler completes
            this.delayedContentHandlers.delete(player.id);
            
            const playerLevel = this.levelingSystem.getCurrentLevel(player);
            
            // Only proceed if player is level 2 or above
            if (playerLevel < 2) {
                console.log(`[QuestManager] Skipping daily login bonus for player ${player.id} - level ${playerLevel} is below 2`);
                return;
            }
            
            // Give daily login bonus (if new day)
            this.giveDailyLoginBonus(player);
            
            // REMOVED: Auto-assign daily quests
            // Daily quests will be handled by NPCs in the future
        }, 10000); // 10 second delay after spawn
        
        // Store handler to prevent duplicates
        this.delayedContentHandlers.set(player.id, handler);
    }
    
    /**
     * Gives daily login bonus (5 XP) if player hasn't logged in today.
     * Returns true if bonus was given, false if already received today.
     */
    private giveDailyLoginBonus(player: Player): boolean {
        const playerState = this.playerStateManager.getState(player);
        if (!playerState) return false;
        
        const today = this.getTodayDateString();
        const lastLoginDate = playerState.lastLoginDate;
        
        // Check if already received bonus today
        if (lastLoginDate === today) {
              console.log(`[QuestManager] Player ${player.id} already received daily login bonus today`);
            return false;
        }
        
        // Give 5 XP bonus
        this.levelingSystem.addXP(player, 5);
        
        // Update last login date
        playerState.lastLoginDate = today;
        
        // Show achievement popup
        this.messageManager.sendRichGameMessage('Daily Login Bonus!', player, {
            bonus: '+5 XP',
            rarity: 'common',
            duration: 4000
        });
        
        return true;
    }
    
    // TODO: Add methods for:
    // - Handling quest abandonment
    // - Resetting daily/weekly repeatable quests
    // - Getting player's active/completed quest list (formatted for UI)
} 