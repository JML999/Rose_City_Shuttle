import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameClock from '../GameClock';
import { ItemFactory } from '../Inventory/ItemFactory';
import GameManager from '../GameManager';

// --- Time-Based NPC Movement System ---
export interface TimeBasedLocation {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    facing: { x: number; y: number; z: number };
    timeCondition: (hour: number) => boolean;
    prompt: string;
    behaviorMode: 'study' | 'enchant' | 'travel' | 'sleep'; // Extensible for other NPCs
}

export interface TimedNpcSchedule {
    npcId: string;
    locations: TimeBasedLocation[];
    transitionMessages?: {
        despawn: string;
        spawn: string;
    };
}

// --- Enchantment Definitions ---
export interface RodEnchantment {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
    weight: number;
}

// Standard Rune Enchantments (from regular Runes)
export const STANDARD_RUNE_ENCHANTMENTS: RodEnchantment[] = [
    {
        id: 'giants_pull',
        name: "Giant's Pull",
        description: 'Allows catching heavier fish than normal',
        rarity: 'uncommon',
        weight: 20
    },
    {
        id: 'twin_hook',
        name: 'Twin Hook',
        description: 'Chance to catch two fish at once, plus double rollback loot',
        rarity: 'rare',
        weight: 15
    },
    {
        id: 'modest_luck',
        name: 'Lucky Charm',
        description: 'Modest boost to luck for all fishing',
        rarity: 'common',
        weight: 25
    },
    {
        id: 'swift_current',
        name: 'Swift Current',
        description: 'Faster reeling during jig phase',
        rarity: 'common',
        weight: 20
    },
    {
        id: 'xp_boost',
        name: 'Scholar\'s Blessing',
        description: 'Gain bonus XP from all catches',
        rarity: 'uncommon',
        weight: 18
    },
    {
        id: 'fatigue',
        name: 'Fatigue',
        description: 'Fish tire over time during reeling, making them slower',
        rarity: 'uncommon',
        weight: 15
    },
    {
        id: 'treasure_seeker',
        name: 'Treasure Seeker',
        description: 'Increases loot level, making chests and ores more likely to be caught',
        rarity: 'uncommon',
        weight: 18
    }
];

// Ark Rune Enchantments (from Ark Runes)
export const ARK_RUNE_ENCHANTMENTS: RodEnchantment[] = [
    {
        id: 'steady_hands',
        name: 'Steady Hands', 
        description: 'Increases catch zone size during minigame',
        rarity: 'rare',
        weight: 20
    },
    {
        id: 'greater_luck',
        name: 'Greater Fortune',
        description: 'Significant boost to luck for all fishing',
        rarity: 'epic',
        weight: 12
    },
    {
        id: 'tranquil',
        name: 'Temptranquil',
        description: 'Fish tire significantly over time during reeling',
        rarity: 'rare',
        weight: 15
    },
    {
        id: 'weighted_zone',
        name: 'Anchored Zone',
        description: 'Modest boost to catch zone and weight capacity',
        rarity: 'epic',
        weight: 10
    },
    {
        id: 'zone_fortune',
        name: 'Fortunate Zone',
        description: 'Modest boost to catch zone and luck',
        rarity: 'epic',
        weight: 10
    },
    {
        id: 'weighted_fortune',
        name: 'Weighted Fortune',
        description: 'Modest boost to weight capacity and luck',
        rarity: 'epic',
        weight: 10
    }
];

export class WizardDialogNpc extends DialogNpc {
    private readonly ENCHANTMENT_COST = 1000;
    private readonly REQUIRED_LEVEL = 15; // For enchanting
    private readonly RUNE_SHOP_LEVEL = 15; // For purchasing runes
    private readonly RUNE_PRICE = 2500;
    private readonly RUNE_ITEM_ID = 'rune';
    private readonly RARE_RUNE_ITEM_ID = 'rare_rune';
    
    // Time-based movement system
    private schedule: TimedNpcSchedule;
    private currentLocation: TimeBasedLocation | null = null;
    private lastTimeCheck = -1;
    private static globalInstances: Map<string, WizardDialogNpc> = new Map();
    private isRelocating = false; // Add flag to prevent rapid relocation
    private updateInterval: NodeJS.Timeout | null = null; // Periodic check for hour changes

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
        
        // Define wizard's daily schedule
        this.schedule = this.createWizardSchedule();
        
        // Register this instance globally for time management
        WizardDialogNpc.globalInstances.set(this.config.id, this);
        
        console.log(`[WizardDialogNpc ${this.config.id}] Initialized with time-based movement.`);
    }

    private createWizardSchedule(): TimedNpcSchedule {
        return {
            npcId: 'wizard',
            locations: [
                {
                    id: 'town_study',
                    name: 'Town Study',
                    position: { x: 35.82, y: 35.25, z: -8.45 }, // Main street coordinates (adjusted)
                    facing: { x: 35.82, y: 34.50, z: -10.49 },
                    timeCondition: (hour) => hour >= 6 && hour < 17, // 6 AM - 5 PM (sunrise end to sunset start)
                    prompt: "I spend my days studying these ancient runes... fascinating symbols of power from the lost civilization.",
                    behaviorMode: 'study'
                },
                {
                    id: 'shadow_isle_enchanting',
                    name: 'Shadow Isle Altar',
                    position: { x: 230.5, y: 22.2, z: 140.0 }, // Shadow isle coordinates (updated)
                    facing: { x: 228, y: 21, z: 140 },
                    timeCondition: (hour) => hour >= 19 || hour < 5, // 7 PM - 5 AM (night skybox start to sunrise end)
                    prompt: "The ancient altar channels the moon's power... here I can bind enchantments to your fishing rod.",
                    behaviorMode: 'enchant'
                }
            ],
            transitionMessages: {
                despawn: "I must prepare for my evening journey to the Shadow Isle...",
                spawn: "The ancient energies have guided me here..."
            }
        };
    }

    // --- Time Management System ---
    public static updateAllWizardLocations(): void {
        const currentHour = GameClock.instance.hour;
        console.log(`[WizardDialogNpc] Global update triggered for hour ${currentHour}, ${WizardDialogNpc.globalInstances.size} wizard instances`);
        
        WizardDialogNpc.globalInstances.forEach((wizard, wizardId) => {
            console.log(`[WizardDialogNpc] Checking wizard ${wizardId} - isRelocating: ${wizard.isRelocating}, currentLocation: ${wizard.currentLocation?.id || 'none'}`);
            // Add safety check to prevent rapid updates
            if (!wizard.isRelocating) {
            wizard.updateLocationBasedOnTime(currentHour);
            } else {
                console.log(`[WizardDialogNpc] Skipping wizard ${wizardId} update - currently relocating`);
            }
        });
    }

    private updateLocationBasedOnTime(currentHour: number): void {
        // Skip if time hasn't changed
        if (this.lastTimeCheck === currentHour) return;
        
        // If relocating, don't update lastTimeCheck - we'll check again after relocation
        if (this.isRelocating) {
            console.log(`[WizardDialogNpc] Skipping location update for hour ${currentHour} - currently relocating (will check again after relocation)`);
            return;
        }
        
        this.lastTimeCheck = currentHour;
        console.log(`[WizardDialogNpc] Checking location for hour ${currentHour}`);

        const correctLocation = this.schedule.locations.find(loc => {
            const conditionResult = loc.timeCondition(currentHour);
            console.log(`[WizardDialogNpc] Location ${loc.id}: condition result = ${conditionResult} for hour ${currentHour}`);
            return conditionResult;
        });

        if (!correctLocation) {
            console.warn(`[WizardDialogNpc] No valid location found for hour ${currentHour}`);
            return;
        }

        console.log(`[WizardDialogNpc] Current location: ${this.currentLocation?.id || 'none'}, Target location: ${correctLocation.id}`);

        // Check if we need to move
        if (this.currentLocation?.id !== correctLocation.id) {
            console.log(`[WizardDialogNpc] Time-based location change needed: ${this.currentLocation?.id || 'none'} -> ${correctLocation.id} (hour: ${currentHour})`);
            console.log(`[WizardDialogNpc] Current location condition: ${this.currentLocation ? 'exists' : 'null'}`);
            console.log(`[WizardDialogNpc] Target location condition: ${correctLocation.timeCondition(currentHour)} for hour ${currentHour}`);
            this.moveToLocationSafely(correctLocation);
        } else {
            console.log(`[WizardDialogNpc] Wizard correctly positioned at ${correctLocation.id} for hour ${currentHour}`);
        }
    }

    private async moveToLocationSafely(newLocation: TimeBasedLocation): Promise<void> {
        if (this.isRelocating) {
            console.log(`[WizardDialogNpc] Already relocating, skipping move to ${newLocation.name}`);
            return;
        }

        this.isRelocating = true;
        
        try {
            const oldLocationName = this.currentLocation?.name || 'unknown';
            console.log(`[WizardDialogNpc] Moving from ${oldLocationName} to ${newLocation.name}`);
            
            // Despawn if currently spawned
            if (this.entity) {
                // Clean up all interactions before despawning
            this.cleanupAllInteractions();
            
                // Brief delay before despawn to prevent conflicts
                await new Promise(resolve => setTimeout(resolve, 500));
                this.despawn();
        }

            // Update location data
        this.currentLocation = newLocation;
        this.config.position = newLocation.position;
        this.config.facing = newLocation.facing;

            // Moderate delay before respawning
            await new Promise(resolve => setTimeout(resolve, 1000));

        // Spawn at new location
        this.spawn();
            
            // Notify altars of wizard's arrival/departure
            this.notifyAltarsOfLocationChange(newLocation);
            
            console.log(`[WizardDialogNpc] Successfully moved to ${newLocation.name}`);
            
        } catch (error) {
            console.error(`[WizardDialogNpc] Error during relocation:`, error);
        } finally {
            // Reset relocation flag promptly to allow future moves
            setTimeout(() => {
                this.isRelocating = false;
                // Re-check location after relocation completes (in case hour changed during relocation)
                const currentHour = GameClock.instance.hour;
                if (this.lastTimeCheck !== currentHour) {
                    console.log(`[WizardDialogNpc] Re-checking location after relocation - hour may have changed`);
                    this.updateLocationBasedOnTime(currentHour);
                }
            }, 1500); // Reduced from 3000ms to 1500ms
        }
    }

    private cleanupAllInteractions(): void {
        // Clean up all active player interactions
        for (const [playerId, playerUI] of this.interactingPlayers) {
            if (playerUI.dialog) {
                try { playerUI.dialog.unload(); } catch(e) {}
            }
            if (playerUI.options) {
                try { playerUI.options.unload(); } catch(e) {}
            }
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
        }
        this.interactingPlayers.clear();
    }

    // --- Override spawn to handle initial location setup ---
    public override spawn(): void {
        // Determine initial location based on current time
        const currentHour = GameClock.instance.hour;
        const initialLocation = this.schedule.locations.find(loc => 
            loc.timeCondition(currentHour)
        );

        if (initialLocation) {
            this.currentLocation = initialLocation;
            this.config.position = initialLocation.position;
            this.config.facing = initialLocation.facing;
        }

        // Call parent spawn
        super.spawn();
        
        // Set up periodic check for hour changes (every 5 seconds, like altar)
        this.updateInterval = setInterval(() => {
            this.checkForHourChange();
        }, 5000);
        
        // Initialize last hour checked
        this.lastTimeCheck = GameClock.instance.hour;
        
        console.log(`[WizardDialogNpc] Spawned at ${this.currentLocation?.name || 'unknown location'}`);
    }
    
    // Add periodic check method (similar to altar)
    private checkForHourChange(): void {
        const currentHour = GameClock.instance.hour;
        if (currentHour !== this.lastTimeCheck) {
            console.log(`[WizardDialogNpc] Periodic check detected hour change: ${this.lastTimeCheck} -> ${currentHour}`);
            this.updateLocationBasedOnTime(currentHour);
        }
    }

    // --- Context-Aware Dialog System ---
    private getContextualPrompt(player: Player): string {
        if (!this.currentLocation) {
            return "I seem to be lost in time...";
        }

        const behaviorMode = this.currentLocation.behaviorMode;

        if (behaviorMode === 'study') {
            // Default greeting - no auto-popup, just show options
            return "Welcome angler, to my magical emporium. How can I help you?";
        } else if (behaviorMode === 'enchant') {
            const hasRune = this.hasRequiredRune(player);
            const hasThreeShards = this.hasThreeRelicShards(player);
            const hasKeystoneQuest = this.hasKeystoneQuestActive(player);
            
            // Prioritize keystone assembly if player has 3 shards and quest is active
            if (hasThreeShards && hasKeystoneQuest) {
                const canAttempt = this.canAttemptTileMemory(player);
                if (canAttempt) {
                    return "Fitzwilliam told me you would be coming. Your shards assemble a keystone. The keystone will test you with a puzzle to earn its treasure. Are you ready to begin?";
                } else {
                    return "The altar's power has been exhausted for today. Return tomorrow night to attempt the keystone assembly once more.";
                }
            }
            
            // Existing rune enchanting logic
            if (hasRune) {
                const canEnchant = this.canPlayerEnchant(player);
                const equippedRod = this.getEquippedRod(player);
                const canActuallyEnchant = canEnchant && equippedRod && !this.isRodAlreadyEnchanted(equippedRod);
                
                if (canActuallyEnchant) {
                    return "Perfect timing... the altar thrums with power and you carry a rune. We are ready to bind its magic to your rod.";
                } else {
                    return "I sense you carry a rune, but we need to prepare. Ensure you have an equipped rod that hasn't been enchanted yet, and that you've reached level 15.";
                }
            }
            return "The altar awaits, but you'll need a rune to channel its power. Find one in runic ores, or visit me during the day if you're level 15 or above.";
        }

        return "Welcome angler, to my magical emporium. How can I help you?";
    }

    private getContextualOptions(player: Player): string[] {
        if (!this.currentLocation) {
            return ["I'll return later"];
        }

        const hasRune = this.hasRequiredRune(player);
        const behaviorMode = this.currentLocation.behaviorMode;

        if (behaviorMode === 'study') {
            const baseOptions = [
                "Buy a rune",
                "Who are you?",
                "What are runes?"
            ];
            
            // Add "I have a rune!" option if player has a rune
            if (hasRune) {
                baseOptions.push("I have a rune!");
            }
            
            return baseOptions;
        } else if (behaviorMode === 'enchant') {
            const hasThreeShards = this.hasThreeRelicShards(player);
            const hasKeystoneQuest = this.hasKeystoneQuestActive(player);
            const canAttempt = this.canAttemptTileMemory(player);
            
            // Build options array - prioritize keystone, but include enchanting if available
            const options: string[] = [];
            
            // Keystone assembly options (if applicable)
            if (hasThreeShards && hasKeystoneQuest) {
                if (canAttempt) {
                    options.push("Yes, I'm ready");
                    options.push("Tell me about the ritual");
                } else {
                    options.push("When can I try again?");
                }
            }
            
            // Rod enchanting options (if applicable and not conflicting)
            if (hasRune) {
                const canEnchant = this.canPlayerEnchant(player);
                const equippedRod = this.getEquippedRod(player);
                const canActuallyEnchant = canEnchant && equippedRod && !this.isRodAlreadyEnchanted(equippedRod);
                
                if (canActuallyEnchant) {
                    // Only add if we don't already have keystone options (to avoid clutter)
                    if (!(hasThreeShards && hasKeystoneQuest && canAttempt)) {
                        options.push("Enchant my rod");
                        options.push("What enchantments are possible?");
                    } else {
                        // Both available - add enchanting as secondary option
                        options.push("Actually, I want to enchant my rod instead");
                    }
                } else {
                    // Can't enchant yet, but has rune
                    if (!(hasThreeShards && hasKeystoneQuest)) {
                        options.push("Tell me about enchanting");
                        options.push("What do I need?");
                    }
                }
            } else {
                // No rune - only show enchanting info if no keystone quest
                if (!(hasThreeShards && hasKeystoneQuest)) {
                    options.push("Tell me about enchanting");
                    options.push("What do I need?");
                }
            }
            
            // Add closing option
            if (options.length === 0) {
                options.push("I'll return when ready");
            } else {
                options.push("Not now");
            }
            
            return options;
        }

        return ["I'll return later"];
    }

    // --- Cleanup for global instances ---
    public despawn(): void {
        // Remove from global instances
        WizardDialogNpc.globalInstances.delete(this.config.id);
        
        // Clear periodic update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clean up all interactions
        this.cleanupAllInteractions();
        
        // Call parent despawn
        super.despawn();
    }

    // --- Override handlePlayerInteraction to use new contextual system ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[WizardDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Check cooldown
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < 3000)) { return; } // 3 second cooldown

        if (this.interactingPlayers.has(player.id)) { return; }

        // Get player entities for UI attachment
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[WizardDialogNpc ${this.config.id}] No player entity found for ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        console.log(`[WizardDialogNpc ${this.config.id}] Player ${player.id} starting interaction at ${this.currentLocation?.name || 'unknown'}.`);

        // Create contextual interaction
        const playerUI: any = {
            currentFallbackResponse: "The ancient magic flows mysteriously..."
        };

        // Get contextual prompt and options
        const interactionPrompt = this.getContextualPrompt(player);
        const displayOptions = this.getContextualOptions(player);

        // Create NPC Dialog Bubble
        if (this.entity && interactionPrompt) {
            playerUI.dialog = new SceneUI({
                templateId: 'npc-dialogue',
                attachedToEntity: this.entity,
                offset: { x: 0, y: this.config.modelScale * 1.2, z: 0 },
                state: { 
                    text: interactionPrompt, 
                    npcName: this.config.name || this.config.id,
                    owningPlayerId: player.id 
                }
            });
            
            if (playerUI.dialog) {
                try {
                    playerUI.dialog.load(this.world);
                } catch (error) {
                    console.error(`[WizardDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        // Handle UI based on device type and available options
        if (displayOptions.length > 0) {
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: displayOptions
                });
                console.log(`[WizardDialogNpc ${this.config.id}] Sent mobile options to player ${player.id}`);
            } else {
                playerUI.options = new SceneUI({
                    templateId: 'player-options',
                    attachedToEntity: playerEntity,
                    offset: { x: 0, y: -0.5, z: 0 },
                    state: { options: displayOptions, owningPlayerId: player.id }
                });
                try { 
                    playerUI.options.load(this.world); 
                } catch (error) { 
                    console.error(`[WizardDialogNpc ${this.config.id}] Error loading options UI:`, error);
                    playerUI.options = undefined; 
                }
            }
        }

        // Store player UI state
        this.interactingPlayers.set(player.id, playerUI);

        // Update player state
        if (!state.npcInteraction) {
            state.npcInteraction = { currentNpcId: this.config.id };
        } else {
            state.npcInteraction.currentNpcId = this.config.id;
        }

        console.log(`[WizardDialogNpc ${this.config.id}] Interaction setup complete for player ${player.id}.`);
    }

    // --- Implement Abstract Methods (no sea story reaction) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "This enchanting table is quite dusty...";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "The ancient magic flows through these waters...";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return ["Tell me about enchanting", "I'll return later"];
    }

    // --- Core Dialog Logic ---
    private getBasePrompt(): string {
        return this.config.interaction?.prompt || "This enchanting table is quite dusty...";
    }

    private canPlayerEnchant(player: Player): boolean {
        const level = this.stateManager.getCurrentLevel(player);
        return level >= this.REQUIRED_LEVEL;
    }

    private hasRequiredRune(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        
        // Accept either standard rune or rare rune
        return inventory.items.some(item => 
            (item.id === this.RUNE_ITEM_ID || item.id === this.RARE_RUNE_ITEM_ID) && item.quantity > 0
        );
    }
    
    private getRuneItemId(player: Player): string | null {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return null;
        
        // Prefer rare rune if available, otherwise standard rune
        const rareRune = inventory.items.find(item => item.id === this.RARE_RUNE_ITEM_ID && item.quantity > 0);
        if (rareRune) return this.RARE_RUNE_ITEM_ID;
        
        const standardRune = inventory.items.find(item => item.id === this.RUNE_ITEM_ID && item.quantity > 0);
        if (standardRune) return this.RUNE_ITEM_ID;
        
        return null;
    }

    private hasEnoughCoins(player: Player): boolean {
        const coins = this.stateManager.getCoinBalance(player);
        return coins >= this.ENCHANTMENT_COST;
    }

    private getEquippedRod(player: Player) {
        return this.stateManager.getInventoryManager().getEquippedRod(player);
    }

    private isRodAlreadyEnchanted(rod: any): boolean {
        return rod?.metadata?.enchantments && rod.metadata.enchantments.length > 0;
    }

    // --- Keystone Assembly Helper Methods ---
    private hasThreeRelicShards(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        
        // Count relic shards in inventory
        const shardCount = inventory.items
            .filter(item => item.id === 'relic_shard' || item.id.startsWith('relic_shard'))
            .reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        return shardCount >= 3;
    }

    private canAttemptTileMemory(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        
        // Check if player already attempted within 24 hours
        const lastAttempt = state.flags?.lastTileMemoryAttemptTimestamp;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (lastAttempt && (now - lastAttempt < oneDayMs)) {
            return false; // Cannot attempt if attempted within 24 hours
        }
        
        return true; // Can attempt if no previous attempt or 24 hours have passed
    }

    private getTodayDateString(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private hasKeystoneQuestActive(player: Player): boolean {
        const questManager = GameManager.instance?.questManager;
        if (!questManager) return false;
        
        const state = this.stateManager.getState(player);
        if (!state) return false;
        
        const metaQuest = state.quests.active['fitz_quest_4_map_delivery'];
        if (!metaQuest) return false;
        
        // Objective 1 is "collect_all_three_shards" - should be complete
        return metaQuest.objectivesProgress?.['1'] === 1;
    }

    // --- Handle Dialog Options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[WizardDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        console.log(`[WizardDialogNpc ${this.config.id}] handleOption called for player ${player.id} with option: ${option}`);
        let npcResponseText = playerUI.currentFallbackResponse || "The ancient magic flows mysteriously...";
        let endInteraction = true;

        if (!this.currentLocation) {
            npcResponseText = "I seem to be lost in time...";
        } else {
            const hasRune = this.hasRequiredRune(player);
            const behaviorMode = this.currentLocation.behaviorMode;
            
            if (behaviorMode === 'study') {
                npcResponseText = this.handleStudyModeOption(player, option, hasRune);
            } else if (behaviorMode === 'enchant') {
                npcResponseText = this.handleEnchantModeOption(player, option, hasRune);
            } else {
                npcResponseText = "The ancient magic flows mysteriously...";
            }
        }

        console.log(`[WizardDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[WizardDialogNpc ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[WizardDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        }

        // Hide options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined;
        }

        if (endInteraction) {
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    private handleStudyModeOption(player: Player, option: number, hasRune: boolean): string {
        const playerLevel = this.stateManager.getCurrentLevel(player);
        const hasRuneShopAccess = playerLevel >= this.RUNE_SHOP_LEVEL;
        
        // Calculate option indices
        const baseOptionCount = 3; // Always 3 base options
        const runeOptionIndex = hasRune ? baseOptionCount : -1;
        
        // Check for "I have a rune!" option first
        if (hasRune && option === runeOptionIndex) {
            return "Excellent! Meet me at the Shadow Isle altar when night falls - we'll channel its energy under the moon's influence.";
        }
        
        // Handle base options
        switch (option) {
            case 0: // "Buy a rune"
                if (hasRuneShopAccess) {
                    this.openRuneShop(player);
                    return "Take a look at my rune selection! These ancient artifacts hold great power.";
                } else {
                    return "Runes are reserved for anglers above level 15. Until then, you can find them in runic ores throughout the waters.";
                }
            case 1: // "Who are you?"
                return "I am Orin the Enchanter. By day, I tend this emporium. By night, I journey to the Shadow Isle to enchant rods with runes.";
            case 2: // "What are runes?"
                return "Runes enchant your fishing rod with powerful abilities. Regular runes can be purchased from me or found in runic ores. Ark runes are rarer and only found in runic ores.";
            default:
                return "The ancient texts reveal many secrets...";
        }
    }

    private handleEnchantModeOption(player: Player, option: number, hasRune: boolean): string {
        const hasThreeShards = this.hasThreeRelicShards(player);
        const hasKeystoneQuest = this.hasKeystoneQuestActive(player);
        const canAttempt = this.canAttemptTileMemory(player);
        
        // Determine which options the player saw
        const hasKeystoneAvailable = hasThreeShards && hasKeystoneQuest && canAttempt;
        const hasEnchantAvailable = hasRune && this.canPlayerEnchant(player) && 
                                     this.getEquippedRod(player) && 
                                     !this.isRodAlreadyEnchanted(this.getEquippedRod(player)!);
        
        // Handle keystone assembly first (if available)
        if (hasKeystoneAvailable) {
            // Player saw: "Yes, I'm ready", "Tell me about the ritual", [maybe enchanting], "Not now"
            switch (option) {
                case 0: // "Yes, I'm ready"
                    this.startTileMemoryGame(player);
                    return "The ritual begins! Focus your mind and remember the patterns...";
                case 1: // "Tell me about the ritual"
                    return "The three keystone fragments must be assembled through a test of memory. You'll see patterns on tiles - insects, small fish, and predators. Remember which tiles show each category across three rounds. Fail, and you must wait until tomorrow night to try again.";
                case 2: // Could be "Actually, I want to enchant my rod instead" or "Not now"
                    if (hasEnchantAvailable) {
                        // Check if this is the enchanting option
                        const options = this.getContextualOptions(player);
                        if (options[2] === "Actually, I want to enchant my rod instead") {
                            // Switch to enchanting flow
                            return this.handleEnchantingOption(player, 0); // Treat as "Enchant my rod"
                        }
                    }
                    return "The altar's power will remain ready when you are.";
                default:
                    return "The ancient magic flows through this place...";
            }
        } else if (hasThreeShards && hasKeystoneQuest && !canAttempt) {
            // Cooldown active
            switch (option) {
                case 0: // "When can I try again?"
                    return "The altar's power regenerates each night. Return tomorrow after sunset to attempt the keystone assembly once more.";
                case 1: // "I'll return tomorrow" or "Not now"
                    return "I will be here, waiting at the altar under the moonlight.";
                default:
                    return "The ancient magic flows through this place...";
            }
        }
        
        // Handle rod enchanting (existing logic)
        return this.handleEnchantingOption(player, option, hasRune);
    }

    // Extract enchanting logic to separate method for clarity
    private handleEnchantingOption(player: Player, option: number, hasRune?: boolean): string {
        if (hasRune === undefined) {
            hasRune = this.hasRequiredRune(player);
        }
        
        if (!hasRune) {
            switch (option) {
                case 0: // "Tell me about enchanting"
                    return "Bring me a rune and I'll bind its power to your rod at this altar. The ancient magic flows strongest here under the moonlight.";
                case 1: // "What do I need?"
                    return `You need: a rune (from runic ores or purchased from me), level ${this.REQUIRED_LEVEL}+, and an equipped fishing rod.`;
                case 2: // "I'll return when ready"
                    return "The altar will await your return. Seek runic ores for runes, or visit me during the day if you're level 15 or above.";
                default:
                    return "The altar requires proper preparation...";
            }
        } else {
            const canEnchant = this.canPlayerEnchant(player);
            const equippedRod = this.getEquippedRod(player);
            const canActuallyEnchant = canEnchant && equippedRod && !this.isRodAlreadyEnchanted(equippedRod);
            
            if (canActuallyEnchant) {
                switch (option) {
                    case 0: // "Enchant my rod"
                        this.performEnchantment(player, equippedRod);
                        return `The ancient magic has been bound to your ${equippedRod.name}! The enchantment has chosen its path.`;
                    case 1: // "What enchantments are possible?"
                        return this.getEnchantmentOverview();
                    case 2: // "Not now"
                        return "The altar's power remains ready for when you wish to proceed.";
                    default:
                        return "The ancient magic flows through this place...";
                }
            } else {
                switch (option) {
                    case 0: // "Tell me about enchanting"
                        if (!canEnchant) {
                            return `Return when you reach level ${this.REQUIRED_LEVEL}.`;
                        } else if (!equippedRod) {
                            return "Equip a fishing rod first, then return with your rune.";
                        } else if (this.isRodAlreadyEnchanted(equippedRod)) {
                            return "Your rod is already enchanted. Each rod can only be enchanted once.";
                        }
                        return "With your rune, I can bind its power to your rod at this altar. The ancient magic flows strongest here under the moonlight.";
                    case 1: // "What do I need?"
                        if (!canEnchant) {
                            return `You need to reach level ${this.REQUIRED_LEVEL}. You already have a rune, so return with an equipped rod once you reach that level.`;
                        } else if (!equippedRod) {
                            return "You need to equip a fishing rod. The rune is ready.";
                        } else if (this.isRodAlreadyEnchanted(equippedRod)) {
                            return "Your current rod is already enchanted. Equip a different rod if you wish to enchant it.";
                        }
                        return `You have everything needed! We're ready to begin the enchantment.`;
                    case 2: // "I'll return when ready"
                        return "The altar's power remains ready for when you wish to proceed.";
                    default:
                        return "The ancient magic flows through this place...";
                }
            }
        }
    }

    private getEnchantmentOverview(): string {
        const standardNames = STANDARD_RUNE_ENCHANTMENTS.map(ench => ench.name).join(', ');
        const arkNames = ARK_RUNE_ENCHANTMENTS.map(ench => ench.name).join(', ');
        
        return `Regular runes can grant: ${standardNames}. Ark runes can grant: ${arkNames}. Each rune randomly selects one effect from its pool.`;
    }

    private getDetailedResearchFindings(): string {
        // Give specific examples of enchantments with engaging descriptions
        const examples = [
            "The ancients used runes to power up their rods. For instance, the 'Twin Hook' enchantment splits your line at the last moment, allowing you to catch two fish at once!",
            "I've discovered the 'Tranquil Waters' enchantment - it calms the fish during the minigame, making them move much slower and easier to catch.",
            "Fascinating! The 'Giant's Pull' rune breaks normal weight limits, letting you reel in massive fish that would normally snap your line.",
            "The 'Moonlit Fortune' enchantment is remarkable - it doubles your luck when fishing under the night sky. Perfect for nocturnal anglers!",
            "My studies reveal 'Deep Caller' - the rarest enchantment that beckons legendary fish from the deepest waters to your hook."
        ];
        
        // Return a random example each time for variety
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        return `${randomExample} I've catalogued 10 different enchantments total, each with unique fishing benefits.`;
    }

    // --- Enchantment Logic ---
    private performEnchantment(player: Player, rod: any): void {
        console.log(`[WizardDialogNpc] Performing enchantment for player ${player.id} on rod ${rod.id}`);

        // Remove the rune (either standard or rare)
        const runeItemId = this.getRuneItemId(player);
        if (runeItemId) {
            this.stateManager.getInventoryManager().removeItem(player, runeItemId, 1);
        } else {
            console.error(`[WizardDialogNpc] No rune found to remove for player ${player.id}`);
            return;
        }

        // Select random enchantment from appropriate pool based on rune type
        const selectedEnchantment = this.selectRandomEnchantment(runeItemId);
        
        // Apply enchantment to rod - clear existing enchantments first
        if (!rod.metadata) rod.metadata = {};
        rod.metadata.enchantments = []; // Clear existing enchantments before adding new one
        
        rod.metadata.enchantments.push({
            id: selectedEnchantment.id,
            name: selectedEnchantment.name,
            description: selectedEnchantment.description,
            rarity: selectedEnchantment.rarity
        });

        // Update inventory UI
        this.stateManager.getInventoryManager().updateInventoryUI(player);

        // Send enchantment success message
        this.stateManager.sendGameMessage(player, `🔮 Your ${rod.name} has been enchanted with ${selectedEnchantment.name}! (${selectedEnchantment.description})`);

        console.log(`[WizardDialogNpc] Successfully enchanted ${rod.id} with ${selectedEnchantment.name} for player ${player.id}`);
    }

    // --- Rune Shop Methods ---
    private openRuneShop(player: Player): void {
        console.log(`[WizardDialogNpc] Opening rune shop for player ${player.id}`);
        
        // Get current player data for client-side validation
        const playerLevel = this.stateManager.getCurrentLevel(player);
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        
        // Send data to open the rune shop panel
        player.ui.sendData({
            type: 'openRuneShop',
            shopName: 'Wizard\'s Rune Shop',
            shopTitle: 'Runes - 2500 coins each'
        });
        
        // Send current player data for client-side validation
        player.ui.sendData({
            type: 'playerDataUpdate',
            level: playerLevel,
            coins: currentCoins
        });
    }
    
    public handleRunePurchase(player: Player, runeQuantity: number, totalPrice: number): boolean {
        console.log(`[WizardDialogNpc] Processing rune purchase: ${runeQuantity}x rune for $${totalPrice} from player ${player.id}`);
        
        // Validate level requirement
        const playerLevel = this.stateManager.getCurrentLevel(player);
        if (playerLevel < this.RUNE_SHOP_LEVEL) {
            console.warn(`[WizardDialogNpc] Player ${player.id} attempted to purchase rune but is only level ${playerLevel} (requires ${this.RUNE_SHOP_LEVEL})`);
            this.stateManager.sendGameMessage(player, `You need to reach level ${this.RUNE_SHOP_LEVEL} before I can sell you runes.`);
            return false;
        }
        
        // Validate price (should be 2500 coins per rune)
        const expectedPrice = this.RUNE_PRICE * runeQuantity;
        if (totalPrice !== expectedPrice) {
            console.warn(`[WizardDialogNpc] Invalid pricing: ${runeQuantity} runes for $${totalPrice}, expected $${expectedPrice}`);
            return false;
        }
        
        // Validate quantity (should be 1 for now, but allow multiple)
        if (runeQuantity < 1 || runeQuantity > 10) {
            console.warn(`[WizardDialogNpc] Invalid quantity: ${runeQuantity} (must be 1-10)`);
            return false;
        }
        
        // Check if player has enough coins
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        if (currentCoins < totalPrice) {
            console.log(`[WizardDialogNpc] Player has insufficient coins: ${currentCoins}/${totalPrice}`);
            this.stateManager.sendGameMessage(player, `You need $${totalPrice} but only have $${currentCoins}!`);
            return false;
        }
        
        // Process the purchase
        const success = this.stateManager.getCurrencyManager().removeCoins(player, totalPrice);
        if (!success) {
            console.error(`[WizardDialogNpc] Failed to remove coins from player ${player.id}`);
            this.stateManager.sendGameMessage(player, "Payment processing failed. Try again!");
            return false;
        }
        
        // Create and add rune to inventory
        const runeItem = ItemFactory.createInventoryItemFromLootId(this.RUNE_ITEM_ID, runeQuantity);
        if (!runeItem) {
            console.error(`[WizardDialogNpc] Failed to create rune item`);
            // Refund the coins
            this.stateManager.getCurrencyManager().addCoins(player, totalPrice);
            this.stateManager.sendGameMessage(player, "Failed to create rune. Coins refunded.");
            return false;
        }
        
        this.stateManager.getInventoryManager().addItem(player, runeItem);
        
        // Update UI
        this.stateManager.updateCurrencyUI(player);
        this.stateManager.getInventoryManager().updateInventoryUI(player);
        
        // Success message
        this.stateManager.sendGameMessage(player, `Purchased ${runeQuantity} rune${runeQuantity > 1 ? 's' : ''} for $${totalPrice}!`);
        
        console.log(`[WizardDialogNpc] Successfully sold ${runeQuantity} rune(s) to player ${player.id} for $${totalPrice}`);
        return true;
    }
    
    private selectRandomEnchantment(runeItemId: string | null): RodEnchantment {
        // Select from appropriate pool based on rune type
        const isArkRune = runeItemId === this.RARE_RUNE_ITEM_ID;
        const enchantmentPool = isArkRune ? ARK_RUNE_ENCHANTMENTS : STANDARD_RUNE_ENCHANTMENTS;
        
        // Calculate total weight
        const totalWeight = enchantmentPool.reduce((sum, enchant) => sum + enchant.weight, 0);
        
        // Generate random number
        let random = Math.random() * totalWeight;
        
        // Select enchantment based on weight
        for (const enchantment of enchantmentPool) {
            random -= enchantment.weight;
            if (random <= 0) {
                return enchantment;
            }
        }
        
        // Fallback (should never reach here)
        return enchantmentPool[0];
    }

    // --- Tile Memory Game Methods ---
    private startTileMemoryGame(player: Player): void {
        console.log(`[WizardDialogNpc] Starting tile memory game for player ${player.id}`);
        
        // Mark attempt timestamp (24-hour wait)
        const state = this.stateManager.getState(player);
        if (state) {
            if (!state.flags) state.flags = {};
            state.flags.lastTileMemoryAttemptTimestamp = Date.now();
        }
        
        // Send game start event to client
        player.ui.sendData({
            type: 'startTileMemory',
            questId: 'fitz_quest_4_map_delivery',
            rounds: [
                { round: 1, category: 'insect', tileCount: 3, timeLimit: 15 },
                { round: 2, category: 'small_fish', tileCount: 4, timeLimit: 15 },
                { round: 3, category: 'predator', tileCount: 5, timeLimit: 15 }
            ]
        });
    }

    public handleTileMemoryResult(player: Player, success: boolean, roundsCompleted: number): void {
        console.log(`[WizardDialogNpc] Tile memory result for player ${player.id}: success=${success}, rounds=${roundsCompleted}`);
        
        if (success && roundsCompleted === 3) {
            // Success! Consume shards and complete quest
            this.completeKeystoneAssembly(player);
        } else {
            // Failure - attempt already marked, just notify
            const messageManager = GameManager.instance?.messageManager;
            if (messageManager) {
                messageManager.sendRichGameMessage(
                    'The ritual failed',
                    player,
                    {
                        bonus: 'Return tomorrow night to try again.',
                        rarity: 'common',
                        duration: 5000
                    }
                );
            }
        }
    }

    private completeKeystoneAssembly(player: Player): void {
        console.log(`[WizardDialogNpc] Completing keystone assembly for player ${player.id}`);
        
        const inventoryManager = this.stateManager.getInventoryManager();
        
        // Remove all 3 relic shards
        let shardsRemoved = 0;
        const inventory = this.stateManager.getInventory(player);
        if (inventory) {
            // Remove all relic shard items
            inventory.items = inventory.items.filter(item => {
                if (item.id === 'relic_shard' || item.id.startsWith('relic_shard')) {
                    shardsRemoved += (item.quantity || 1);
                    return false; // Remove from inventory
                }
                return true;
            });
            
            // Update inventory UI
            inventoryManager.updateInventoryUI(player);
        }
        
        console.log(`[WizardDialogNpc] Removed ${shardsRemoved} relic shard(s) from player ${player.id}`);
        
        // Complete the meta quest
        const questManager = GameManager.instance?.questManager;
        if (questManager) {
            // Complete objective 3 (assemble_shards_with_wizard) first
            questManager.completeQuestObjective(player, 'fitz_quest_4_map_delivery', 'assemble_shards_with_wizard');
            // Then complete the entire quest
            questManager.completeQuest(player, 'fitz_quest_4_map_delivery', false);
            
            // Send success message
            const messageManager = GameManager.instance?.messageManager;
            if (messageManager) {
                messageManager.sendRichGameMessage(
                    '✨ The keystone has been assembled!',
                    player,
                    {
                        bonus: 'The ancient power flows through you...',
                        rarity: 'legendary',
                        duration: 5000
                    }
                );
            }
        }
        
        // Show keystone rod reward panel
        player.ui.sendData({
            type: 'showZephyrRodReward',
            rodData: {
                id: 'keystone_rod',
                name: 'Keystone Rod',
                rarity: 'legendary'
            }
        });
    }
    
    public handleKeystoneRodClaim(player: Player): void {
        console.log(`[WizardDialogNpc] Handling keystone rod claim for player ${player.id}`);
        
        const inventoryManager = this.stateManager.getInventoryManager();
        
        // Create and grant the keystone rod
        const keystoneRodItem = ItemFactory.createRodItem('keystone_rod');
        if (keystoneRodItem) {
            const granted = inventoryManager.addItem(player, keystoneRodItem);
            if (granted) {
                console.log(`[WizardDialogNpc] Successfully granted keystone rod to player ${player.id}`);
                
                // Update inventory UI
                inventoryManager.updateInventoryUI(player);
                
                // Send success message
                const messageManager = GameManager.instance?.messageManager;
                if (messageManager) {
                    messageManager.sendRichGameMessage(
                        '🎣 Keystone Rod Added!',
                        player,
                        {
                            bonus: 'The legendary rod has been added to your inventory.',
                            rarity: 'legendary',
                            duration: 5000
                        }
                    );
                }
            } else {
                console.error(`[WizardDialogNpc] Failed to add keystone rod to inventory for player ${player.id}`);
                this.stateManager.sendGameMessage(player, 'Your inventory is full! Make space and try again.');
            }
        } else {
            console.error(`[WizardDialogNpc] Failed to create keystone rod item`);
            this.stateManager.sendGameMessage(player, 'An error occurred while granting the rod. Please contact support.');
        }
    }

    // --- Altar Notification System ---
    private notifyAltarsOfLocationChange(newLocation: TimeBasedLocation): void {
        try {
            // Import dynamically to avoid circular dependency
            const { AltarBlockEntity } = require('../WorldPopulation/AltarBlockEntity');
            
            if (newLocation.behaviorMode === 'enchant') {
                // Wizard arrived at Shadow Isle altar - activate all altars
                AltarBlockEntity.activateAllAltars();
                console.log(`[WizardDialogNpc] Notified altars: ACTIVATED (wizard at ${newLocation.name})`);
            } else {
                // Wizard left for town study - deactivate all altars  
                AltarBlockEntity.deactivateAllAltars();
                console.log(`[WizardDialogNpc] Notified altars: DEACTIVATED (wizard at ${newLocation.name})`);
            }
        } catch (error) {
            console.error(`[WizardDialogNpc] Error notifying altars:`, error);
        }
    }

    // --- Debug method to manually test relocation ---
    public forceLocationUpdate(): void {
        console.log(`[WizardDialogNpc] Manual location update triggered`);
        console.log(`[WizardDialogNpc] Current hour: ${GameClock.instance.hour}`);
        console.log(`[WizardDialogNpc] Current location: ${this.currentLocation?.id || 'none'}`);
        console.log(`[WizardDialogNpc] Is relocating: ${this.isRelocating}`);
        
        // Reset the relocating flag if it's stuck
        if (this.isRelocating) {
            console.log(`[WizardDialogNpc] Resetting stuck isRelocating flag`);
            this.isRelocating = false;
        }
        
        // Force update
        this.lastTimeCheck = -1; // Reset time check
        this.updateLocationBasedOnTime(GameClock.instance.hour);
    }
} 