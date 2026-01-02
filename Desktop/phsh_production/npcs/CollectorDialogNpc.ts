// npcs/CollectorDialogNpc.ts
import { Player, World, PlayerEntity, SceneUI, Entity, SimpleEntityController, RigidBodyType } from 'hytopia'; // Core Hytopia classes
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc'; // Base class and types from your structure
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager'; // Your state manager
import GameManager from '../GameManager'; // To access LeaderboardManager later
import { LeaderboardManager } from '../LeaderboardManager';
import type { CaughtFish } from '../Inventory/ItemFactory';
import { SeaStoryManager } from '../SeaStoryManager';
import type { GamePlayerEntity } from '../GamePlayerEntity';
import { FISH_CATALOG } from '../Fishing/PhshTwoFIshCatalog'; // Import fish catalog for trophy checking

// Weighing System - Uses hybrid Scene UI + Overlay UI for weighing ceremonies

// Interface for weigh-in specific UI state
interface CollectorPlayerInteractionUI extends PlayerInteractionUI {
    selectedFish?: CaughtFish; // Fish selected for weigh-in
    weightCorrectionApplied?: boolean;
    originalWeight?: number;
}

// Weight correction system
interface WeightCorrection {
    adjustedWeight: number;
    adjustmentPercentage: number;
    wasAdjusted: boolean;
}

export class CollectorDialogNpc extends DialogNpc {
    private static readonly WEIGHING_COST = 0;
    private isBusy = false;
    private currentPlayerBeingServed: string | null = null;
    private wheelSpinInProgress = false;
    // Weighing manager for hybrid Scene UI + Overlay UI weighing ceremonies
    private weighingManager: any = null;

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        
        // Initialize weighing manager for hybrid Scene UI + Overlay UI ceremonies
        const { ExperimentalWeighingManager } = require('./experimental/ExperimentalWeighingManager');
        this.weighingManager = new ExperimentalWeighingManager(world, this.stateManager.getMessageManager(), this.stateManager);
        
        // Set up message handlers for weighing panel
        this.setupWeighingMessageHandlers();
    }

    private setupWeighingMessageHandlers() {
        // This would typically be handled in the main world setup
        // For now, we'll rely on the completion handlers set up per player
        console.log(`[CollectorDialogNpc ${this.config.id}] Weighing message handlers ready`);
    }

    // --- Implement Abstract Methods from DialogNpc ---
    protected shouldReactToSeaStory(story: any): boolean { // Replace 'any' with the actual SeaStory type if known
        return false; // Collector doesn't react to sea stories
    }
    protected getSeaStoryPrompt(story: any): string { // Replace 'any' with the actual SeaStory type if known
        return ""; // No specific prompt needed
    }
    protected getSeaStoryResponse(story: any): string { // Replace 'any' with the actual SeaStory type if known
        return ""; // No specific response needed
    }
    protected getSeaStoryOptions(story: any): string[] { // Replace 'any' with the actual SeaStory type if known
        return []; // No specific options needed
    }
    // --- End Abstract Method Implementations ---


    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[CollectorDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const questManager = GameManager.instance?.questManager;
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0 || !questManager) {
            console.error(`[CollectorDialogNpc ${this.config.id}] Missing prerequisites for interaction for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        console.log(`[CollectorDialogNpc ${this.config.id}] Player ${player.id} starting interaction.`);

        // --- Get Player's Fish ---
        const inventory = this.stateManager.getInventory(player);
        const fishInInventory = inventory?.items.filter(item => item.type === 'fish') || [];
        const weighableFish = fishInInventory.filter(fish => 
            !fish.metadata?.fishStats?.hasBeenWeighed && 
            (fish.metadata?.fishStats?.preliminaryWeight || fish.metadata?.fishStats?.weight || 0) > 0 &&
            this.isTrophyFish(fish.name) // Only trophy fish can be weighed
        );

        // --- Create Per-Player UI ---
        const playerUI: CollectorPlayerInteractionUI = {
            currentFallbackResponse: "Happy fishing!",
            selectedFish: undefined,
            originalWeight: 0
        };

        // --- Determine Interaction Type and Dialog ---
        let interactionPrompt = "";
        let displayOptions: string[] = [];

        if (weighableFish.length === 0) {
            // No weighable trophy fish
            if (fishInInventory.length === 0) {
                interactionPrompt = "🎣 Hmph. No fish to weigh? Come back when you've caught something worth my time.";
            } else {
                // Check if player has any trophy fish at all (weighed or unweighed)
                const trophyFish = fishInInventory.filter(fish => this.isTrophyFish(fish.name));
                if (trophyFish.length === 0) {
                    interactionPrompt = "🏆 I only deal with TROPHY FISH - rare catches worthy of the leaderboards. Your current fish are... unremarkable. Catch some proper trophy fish and return!";
                } else {
                    interactionPrompt = "🔍 All your trophy fish have already been through my scales. Catch some fresh trophy fish if you want my services.";
                }
            }
            displayOptions = ["Understood", "View Leaderboard"];
        } else {
            // Has weighable trophy fish - personality-driven greeting
            if (CollectorDialogNpc.WEIGHING_COST > 0) {
                interactionPrompt = `⚖️ Well, well... I see you have TROPHY FISH worthy of my attention! \n\nFirst, EQUIP the trophy fish you want weighed from your inventory, then I'll weigh it to see if your catch is leaderboard worthy. \n\n💰 My services cost ${CollectorDialogNpc.WEIGHING_COST} coins per fish.`;
            } else {
                interactionPrompt = `⚖️ Well, well... I see you have TROPHY FISH worthy of my attention! \n\nFirst, EQUIP the trophy fish you want weighed from your inventory, then I'll weigh it to see if your catch is leaderboard worthy. `;
            }
            displayOptions = ["Weigh my equipped fish", "Not today", "View Leaderboard"];
        }

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
                    console.error(`[CollectorDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
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
                    console.error(`[CollectorDialogNpc ${this.config.id}] Error loading options UI:`, error);
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

    }


    // --- Override option handler ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as CollectorPlayerInteractionUI | undefined;
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[CollectorDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }


        let npcResponseText = playerUI.currentFallbackResponse || "Happy fishing!";
        let endInteraction = true;

        // Get player's weighable fish (only trophy fish)
        const inventory = this.stateManager.getInventory(player);
        const weighableFish = inventory?.items.filter(item => 
            item.type === 'fish' && 
            !item.metadata?.fishStats?.hasBeenWeighed &&
            (item.metadata?.fishStats?.preliminaryWeight || item.metadata?.fishStats?.weight || 0) > 0 &&
            this.isTrophyFish(item.name) // Only trophy fish can be weighed
        ) || [];

        if (weighableFish.length > 0) {
            // Has weighable fish
            switch (option) {
                case 0: // "Weigh my equipped fish"
                    this.startWeighingProcess(player, playerUI, weighableFish);
                    return; // Don't end interaction, weighing process will handle it
                case 1: // "Not today"
                    npcResponseText = "📏 Bah! Don't waste my time then. Come back when you're serious about your catches.";
                    break;
                case 2: // "View Leaderboard"
                    this.openLeaderboard(player);
                    npcResponseText = "📊 Here are the current leaderboards!";
                    endInteraction = false; // Keep interaction open so player can see the leaderboard
                    break;
                default:
                    break;
            }
        } else {
            // No weighable fish
            switch (option) {
                case 0: // "Understood"
                    npcResponseText = "📏 Good! Come back when you have a trophy fish to weigh.";
                    break;
                case 1: // "View Leaderboard"
                    this.openLeaderboard(player);
                    npcResponseText = "📊 Here are the current leaderboards!";
                    endInteraction = false; // Keep interaction open so player can see the leaderboard
                    break;
                default:
                    break;
            }
        }


        // Update dialogue bubble
        if (playerUI.dialog) {
            try {
                playerUI.dialog.setState({ text: npcResponseText });
            } catch (e) {
                console.error(`[CollectorDialogNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        // Hide options if interaction ends
        if (endInteraction) {
            // Dismiss mobile options if on mobile
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'npcInteractionEnded'
                });
            } else if (playerUI.options) {
                try { playerUI.options.unload(); } catch (e) {}
                playerUI.options = undefined;
            }
            
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    // Weighing process using hybrid Scene UI + Overlay UI
    private async startWeighingProcess(player: Player, playerUI: CollectorPlayerInteractionUI, weighableFish: any[]): Promise<void> {

        // Step 1: Payment (same as original)
        const questMgr = GameManager.instance?.questManager;
        if (questMgr?.completeQuest) {
            questMgr.completeQuest(player, 'trophy_quest');
        }

        if (CollectorDialogNpc.WEIGHING_COST > 0) {
            if (!this.stateManager.getCurrencyManager().removeCoins(player, CollectorDialogNpc.WEIGHING_COST)) {
                if (playerUI.dialog) {
                    playerUI.dialog.setState({ text: `💰 You need ${CollectorDialogNpc.WEIGHING_COST} coins for weighing services!` });
                }
                setTimeout(() => {
                    this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
                }, 3000);
                return;
            }
            this.stateManager.sendGameMessage(player, `💰 Paid ${CollectorDialogNpc.WEIGHING_COST} coins for professional weighing service`);
        } 

        // Step 2: Get the equipped fish
        const equippedFish = this.stateManager.getInventoryManager().getEquippedFish(player);
        if (!equippedFish) {
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "🎣 You need to equip a fish first! Open your inventory, go to the Fish tab, and equip the fish you want to weigh." });
            }
            setTimeout(() => {
                this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
            }, 3000);
            return;
        }

        // Check if equipped fish is a trophy fish
        if (!this.isTrophyFish(equippedFish.name)) {
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "🏆 I only weigh TROPHY FISH! That fish is not worthy of the leaderboards. Equip a proper trophy fish - something rare and impressive!" });
            }
            setTimeout(() => {
                this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
            }, 3000);
            return;
        }

        // Check if equipped fish has already been weighed
        if (equippedFish.metadata?.fishStats?.hasBeenWeighed) {
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "🔍 That fish has already been officially weighed! Equip a different fish to weigh." });
            }
            setTimeout(() => {
                this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
            }, 3000);
            return;
        }

        // Check if equipped fish is weighable
        const equippedFishWeight = equippedFish.metadata?.fishStats?.preliminaryWeight || equippedFish.metadata?.fishStats?.weight || 0;
        if (equippedFishWeight <= 0) {
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "🐟 That fish cannot be weighed! Equip a different fish." });
            }
            setTimeout(() => {
                this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
            }, 3000);
            return;
        }

        const fishToWeigh = equippedFish;

        // Step 3: Prepare fish data
        const fishStats = fishToWeigh.metadata?.fishStats;
        const preliminaryWeight = fishStats?.preliminaryWeight || fishStats?.weight || 0;

        const fish: CaughtFish = {
            id: fishToWeigh.id,
            name: fishToWeigh.name,
            weight: preliminaryWeight,
            rarity: fishToWeigh.rarity as any,
            isBaitFish: fishStats?.isBaitFish || false,
            value: fishToWeigh.value || 0
        };

        // Step 4: Apply weight correction
        const correction = this.applyWeightCorrection(fish);
        const fishStatsForWeight = fishToWeigh.metadata?.fishStats;
        playerUI.originalWeight = fishStatsForWeight?.hasBeenWeighed ? fishStatsForWeight.weight : (fishStatsForWeight?.preliminaryWeight || fishStatsForWeight?.weight || 0);
        
        // Step 5: Get leaderboard data (before recording this fish)
        const leaderboards = await this.getLeaderboardsForWeighing(fish.name);
        
        // Step 6: Close current dialog
        this.cleanupPlayerInteraction(player, this.stateManager.getState(player)!);
        
        // Step 7: Calculate final value for display
        const displayValue = this.calculateFishValueFromWeight(correction.adjustedWeight, fish.rarity, fish.name);
        
        // Start weighing ceremony
        if (this.weighingManager && this.entity) {
            await this.weighingManager.startWeighing(
                player,
                this.entity,
                fish,
                correction,
                leaderboards,
                displayValue
            );
        }

        // Step 8: Update fish metadata immediately after weighing
        await this.updateFishMetadataAfterWeighing(player, fishToWeigh, correction);

        // Step 9: Unequip the fish
        this.stateManager.getInventoryManager().unequipItem(player, 'fish');

        // Step 10: Record fish to leaderboard AFTER weighing ceremony
        const correctedWeight = correction.adjustedWeight;
        const correctedValue = this.calculateFishValueFromWeight(correctedWeight, fish.rarity, fish.name);
        const correctedFish = { ...fish, weight: correctedWeight, value: correctedValue };
        const madeLeaderboard = await this.recordFishToLeaderboard(player, correctedFish);

        // Step 11: Update trophy status after fish is on leaderboard
        await this.updateFishTrophyStatusAfterWeighing(player, correctedFish);
        
        // Track daily stats and quest progress for fish weighing
        this.stateManager.recordFishWeighed(player, fish.name, correctedWeight, madeLeaderboard || false);
        
        // Update quest progress for weighFish objectives
        const questManager = GameManager.instance?.questManager;
        if (questManager) {
            questManager.updateQuestProgress(player, 'weighFish', {
                fishSpecies: fish.name,
                weight: correctedWeight,
                madeLeaderboard: madeLeaderboard || false
            });
        }

        // Step 12: Set up completion handler for wheel spin
        this.setupWeighingCompletionHandler(player, fishToWeigh, fish, correction);
    }

    private async getLeaderboardsForWeighing(fishSpecies: string) {
        const leaderboardManager = LeaderboardManager.instance;
        if (!leaderboardManager) {
            return { species: [], overall: [] };
        }

        const allLeaderboards = leaderboardManager.getAllLeaderboards();
        
        // Get species leaderboard (calculate value from weight and rarity)
        const speciesLeaderboard = allLeaderboards.get(fishSpecies);
        
        // Get top 10 for species, ensuring at least 3 positions (fill with "Open" if needed)
        let speciesTop10: any[] = [];
        if (speciesLeaderboard?.byWeight && speciesLeaderboard.byWeight.length > 0) {
            speciesTop10 = speciesLeaderboard.byWeight
                .map((entry: any) => ({
                    playerName: entry.playerName || entry.username || 'Unknown',
                    value: this.calculateFishValueFromWeight(entry.weight, entry.rarity || 'common', fishSpecies),
                    weight: entry.weight || 0,
                    playerId: entry.playerId
                }))
                .sort((a: any, b: any) => b.weight - a.weight) // Sort by weight for species leaderboard
                .slice(0, 10) // Get top 10 (or all if less than 10)
                .map((entry: any, index: number) => ({
                    ...entry,
                    rank: index + 1 // Add rank (1-based)
                }));
        } 
        
        // Ensure at least 3 positions, fill with "Open" slots if needed
        while (speciesTop10.length < 3) {
            speciesTop10.push({
                playerName: 'Open',
                value: 0,
                weight: 0,
                playerId: null,
                rank: speciesTop10.length + 1,
                isOpen: true // Flag to indicate this is an open slot
            });
        }

        // Get overall leaderboard (top 3 across all species by calculated value)
        const allEntries: any[] = [];
        let totalProcessed = 0;
        allLeaderboards.forEach((leaderboard, species) => {
            if (leaderboard.byWeight) {
                leaderboard.byWeight.forEach((entry: any) => {
                    allEntries.push({
                        playerName: entry.playerName || entry.username || 'Unknown',
                        value: this.calculateFishValueFromWeight(entry.weight, entry.rarity || 'common', species),
                        weight: entry.weight || 0,
                        species: species,
                        playerId: entry.playerId
                    });
                    totalProcessed++;
                });
            }
        });
        
        
        let overallTop3 = allEntries
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map((entry: any, index: number) => ({
                ...entry,
                rank: index + 1 // Add rank (1-based)
            }));

      

        return {
            species: speciesTop10, // Return top 10 for species (supports TOP 10 milestone)
            overall: overallTop3
        };
    }

    private calculateEntryValue(weight: number, fishSpecies: string): number {
        // Get rarity for this fish species from fish catalog
        const fishInfo = FISH_CATALOG.find(f => f.id === fishSpecies || f.name === fishSpecies);
        const rarity = fishInfo?.rarity || 'common';
        
        const rarityMultipliers = {
            'common': 1,
            'uncommon': 2,
            'rare': 4,
            'epic': 8,
            'legendary': 16,
            'mythic': 32
        };
        
        const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1;
        const baseValue = this.calculateBaseValue({ rarity } as any);
        
        return Math.round(weight * multiplier * baseValue);
    }

    private setupWeighingCompletionHandler(player: Player, fishToWeigh: any, fish: CaughtFish, correction: WeightCorrection) {
        // Store completion data for when overlay finishes
        const completionData = {
            player,
            fishToWeigh,
            fish,
            correction,
            timestamp: Date.now()
        };

        // Set up listeners for completion and wheel spin
        const handleCompletion = (data: any) => {
            if (data.type === 'fishWeighingComplete' && data.playerId === player.id) {
                this.handleWeighingCompletion(completionData, data.result);
            } else if (data.type === 'triggerWheelSpin' && data.playerId === player.id) {
                this.handleWheelSpinRequest(completionData, data);
            }
        };

        // Store the handler so we can clean it up
        (player as any).weighingCompletionHandler = handleCompletion;
    }

    private async handleWeighingCompletion(completionData: any, result: any) {
        const { player, fishToWeigh, fish, correction } = completionData;
        
        // Update the fish in inventory with corrected weight and mark as weighed
        const inventory = this.stateManager.getInventory(player);
        if (inventory) {
            const fishItem = inventory.items.find(item => 
                item.type === 'fish' && 
                item.id === fishToWeigh.id
            );
            
            if (fishItem && fishItem.metadata?.fishStats) {
                // Store the original preliminary weight
                fishItem.metadata.fishStats.originalWeight = completionData.originalWeight;
                
                // Update all weight-related fields
                fishItem.metadata.fishStats.weight = correction.adjustedWeight;
                fishItem.metadata.fishStats.displayWeight = correction.adjustedWeight;
                fishItem.metadata.fishStats.hasBeenWeighed = true;
                
                // Update the fish value based on the new official weight
                fishItem.value = this.calculateFishValueFromWeight(correction.adjustedWeight, fishItem.rarity, fishItem.name);
                
            }
        }


        // Update inventory UI to show the new weight and status
        this.stateManager.getInventoryManager().updateInventoryUI(player);

        // Species luck bonus calculation and messaging
        this.calculateAndDisplaySpeciesBonus(player, fish);

        // Trophy status is now handled in updateFishMetadataAfterWeighing() - don't call the old method here
        
        // Store data for potential wheel spin
        (player as any).weighingData = {
            fish: { ...fish, weight: correction.adjustedWeight },
            completionData
        };
    }

    private async handleWheelSpinRequest(completionData: any, data: any) {
        const { player, fish } = completionData;
        
        
        // Check if it's actually a record before spinning
        const isRecord = await this.checkIfRecord(player, { ...fish, weight: data.weight });
        
        if (isRecord) {
            // Trigger the wheel spin
            this.triggerSpinWheel(player, { ...fish, weight: data.weight });
        } else {
            console.warn(`[CollectorDialogNpc] Player ${player.id} requested wheel spin but fish is not a record`);
        }
        
        // Clean up completion handler
        delete (player as any).weighingCompletionHandler;
        delete (player as any).weighingData;
            }

    private async updateFishMetadataAfterWeighing(player: Player, fishToWeigh: any, correction: WeightCorrection): Promise<void> {
        
        // Update the fish in inventory with corrected weight and mark as weighed
        const inventory = this.stateManager.getInventory(player);
        if (inventory) {
            
            const fishItem = inventory.items.find(item => 
            item.type === 'fish' && 
                item.id === fishToWeigh.id
            );
            
            if (fishItem && fishItem.metadata?.fishStats) {
                
                
                // Store the original preliminary weight
                const originalWeight = fishItem.metadata.fishStats.preliminaryWeight || fishItem.metadata.fishStats.weight || 0;
                fishItem.metadata.fishStats.originalWeight = originalWeight;
                
                // Update all weight-related fields
                fishItem.metadata.fishStats.weight = correction.adjustedWeight;
                fishItem.metadata.fishStats.displayWeight = correction.adjustedWeight;
                fishItem.metadata.fishStats.hasBeenWeighed = true;
                
                // Update the fish value based on the new official weight
                fishItem.value = this.calculateFishValueFromWeight(correction.adjustedWeight, fishItem.rarity, fishItem.name);
                
                console.log(`[CollectorDialogNpc] ✅ SUCCESSFULLY UPDATED fish item:`, {
                    name: fishItem.name,
                    id: fishItem.id,
                    newWeight: correction.adjustedWeight,
                    newDisplayWeight: fishItem.metadata.fishStats.displayWeight,
                    newValue: fishItem.value,
                    hasBeenWeighed: fishItem.metadata.fishStats.hasBeenWeighed
                });
                
                // UPDATE PHSHDEX with the new official weight and value
                console.log(`[CollectorDialogNpc] 📊 Updating phshdex record with official weight for ${fishItem.name}`);
                this.stateManager.updatePhshdexRecord(player, fishItem);
                
                // Trophy status will be updated after fish is recorded to leaderboard
                
                // Update inventory UI to show the new weight and status
                this.stateManager.getInventoryManager().updateInventoryUI(player);
                console.log(`[CollectorDialogNpc] 🔄 Updated inventory UI for player ${player.id}`);
                
                // Species luck bonus calculation and messaging
                this.calculateAndDisplaySpeciesBonus(player, { 
                    id: fishItem.id, 
                    name: fishItem.name, 
                    weight: correction.adjustedWeight, 
                    rarity: fishItem.rarity, 
                    value: fishItem.value, 
                    isBaitFish: fishItem.metadata.fishStats.isBaitFish || false 
                });
                    } else {
                console.error(`[CollectorDialogNpc] ❌ Could not find fish item ${fishToWeigh.id} in inventory for player ${player.id}`);
            }
        } else {
            console.error(`[CollectorDialogNpc] ❌ No inventory found for player ${player.id}`);
        }
    }

    // OLD updateFishTrophyStatus method removed - was causing trophy status to be set to null
    // Trophy status is now properly handled by updateFishTrophyStatusAfterWeighing()

    private calculateBaseValue(fish: CaughtFish): number {
        // Base value calculation for the weighing display
        const rarityValues = {
            'common': 10,
            'uncommon': 25,
            'rare': 50,
            'epic': 100,
            'legendary': 200,
            'mythic': 500
        };
        
        return rarityValues[fish.rarity as keyof typeof rarityValues] || 10;
    }

    private calculateFishValueFromWeight(weight: number, rarity: string, fishName?: string, trophyStatus?: string, trophyType?: string): number {
        // Use the same calculation as FishSpawnManager for consistency
        let baseValue = 10; // Default fallback
        let minWeight = 1; // Default fallback
        
        // Look up the fish data from catalog to get proper baseValue and minWeight
        if (fishName) {
            try {
                const { FISH_CATALOG } = require('../Fishing/PhshTwoFIshCatalog');
                const fishData = FISH_CATALOG.find((f: any) => f.name === fishName);
                if (fishData) {
                    baseValue = fishData.baseValue;
                    minWeight = fishData.minWeight;
                }
            } catch (error) {
                console.warn(`[CollectorDialogNpc] Could not load fish catalog for ${fishName}, using defaults`);
            }
        }
        
        // Use the same rarity multipliers as FishSpawnManager
        const rarityMultipliers = {
            'common': 1.0,
            'uncommon': 1.5,
            'rare': 2.0,
            'epic': 3.0,
            'legendary': 5.0,
            'mythic': 6.0
        };
        
        const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;
        
        // Calculate base value using the same formula as FishSpawnManager
        let finalValue = Math.floor(baseValue * (weight / minWeight) * multiplier);
        
        // Add trophy bonuses
        if (trophyStatus && ['first', 'second', 'third'].includes(trophyStatus)) {
            let bonusPercent = 0;
            
            if (trophyType === 'overall') {
                // Overall leaderboard bonuses (higher)
                bonusPercent = trophyStatus === 'first' ? 20 : 
                              trophyStatus === 'second' ? 15 : 12; // 3rd place
            } else if (trophyType === 'species') {
                // Species leaderboard bonuses (lower)
                bonusPercent = trophyStatus === 'first' ? 10 : 
                              trophyStatus === 'second' ? 7 : 5; // 3rd place
            }
            
            if (bonusPercent > 0) {
                const bonus = Math.floor(finalValue * (bonusPercent / 100));
                finalValue += bonus;
                    }
                }
        
        return finalValue;
    }

    private async recordFishToLeaderboard(player: Player, fish: CaughtFish): Promise<boolean> {
        try {
            const leaderboardManager = LeaderboardManager.instance;
            if (!leaderboardManager) {
                return false;
            }

            const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0];
            const location = playerEntity?.position ? 
                `${playerEntity.position.x.toFixed(1)}, ${playerEntity.position.y.toFixed(1)}, ${playerEntity.position.z.toFixed(1)}` : 
                undefined;


            // Record the fish to leaderboards
            await leaderboardManager.recordCatch(
                player,
                fish.name,
                fish.weight,
                fish.value,
                fish.rarity,
                location
            );

            
            // Check if fish made it to top positions (species or overall leaderboard)
            const allLeaderboards = leaderboardManager.getAllLeaderboards();
            const speciesLeaderboard = allLeaderboards.get(fish.name);
            let madeLeaderboard = false;
            
            // Check species leaderboard (top 10)
            if (speciesLeaderboard?.byWeight) {
                const position = speciesLeaderboard.byWeight.findIndex((entry: any) => 
                    entry.playerId === player.id && entry.weight === fish.weight
                );
                if (position >= 0 && position < 10) {
                    madeLeaderboard = true;
                }
            }
            
            // Check overall leaderboard (top 3)
            if (!madeLeaderboard) {
                let overallPosition = -1;
                allLeaderboards.forEach((leaderboard, species) => {
                    if (leaderboard.byWeight) {
                        const entries = leaderboard.byWeight
                            .map((entry: any) => ({
                                ...entry,
                                value: this.calculateFishValueFromWeight(entry.weight, entry.rarity || 'common', species)
                            }))
                            .sort((a: any, b: any) => b.value - a.value);
                        
                        const position = entries.findIndex((entry: any) => 
                            entry.playerId === player.id && entry.weight === fish.weight && species === fish.name
                        );
                        if (position >= 0 && position < 3) {
                            overallPosition = position;
                        }
                    }
                });
                if (overallPosition >= 0) {
                    madeLeaderboard = true;
                }
            }
            
            return madeLeaderboard;
        } catch (error) {
            console.error(`[CollectorDialogNpc] Error recording fish to leaderboard:`, error);
            return false;
        }
    }

    private getFishIcon(fishName: string): string {
        // Map fish names to their icon files
        const iconMap: { [key: string]: string } = {
            'sardine': 'sardine_sprite.png',
            'anchovy': 'anchovy_sprite.png',
            'bluefish': 'bluefish_sprite.png',
            'bass': 'bass_sprite.png',
            'tuna': 'tuna_sprite.png',
            // Add more mappings as needed
        };
        
        return iconMap[fishName.toLowerCase()] || 'fish_sprite.png';
    }

    // --- Species Luck Bonus System ---
    private calculateAndDisplaySpeciesBonus(player: Player, fish: CaughtFish): void {
        const rarityBonuses: { [key: string]: number } = {
            'common': 0,
            'uncommon': 5,
            'rare': 10,
            'epic': 15,
            'legendary': 20,
            'mythic': 25
        };

        const bonus = rarityBonuses[fish.rarity] || 0;
        
        if (bonus > 0) {
            const bonusMessage = `✨ ${fish.rarity.toUpperCase()} SPECIES BONUS: +${bonus}% Rare Catch Luck!`;
           // this.stateManager.sendGameMessage(player, bonusMessage);
            
            // TODO: Actually apply the luck bonus to the player's fishing stats
            // This would integrate with your fishing luck system
        }
    }

    // --- Weight Correction System (like Roblox Fisch) ---
    private applyWeightCorrection(fish: CaughtFish): WeightCorrection {
        // Apply random correction between -8% to +12% (slightly favor positive)
        const minCorrection = -0.08; // -8%
        const maxCorrection = 0.12;  // +12%
        
        const correctionPercentage = minCorrection + (Math.random() * (maxCorrection - minCorrection));
        const adjustedWeight = fish.weight * (1 + correctionPercentage);
        
        // Only consider it "adjusted" if change is significant (>1%)
        const wasAdjusted = Math.abs(correctionPercentage) > 0.01;
        
        return {
            adjustedWeight: Math.round(adjustedWeight * 100) / 100, // Round to 2 decimal places
            adjustmentPercentage: correctionPercentage * 100,
            wasAdjusted
        };
    }

    // --- Record Checking ---
    private async checkIfRecord(player: Player, fish: CaughtFish): Promise<boolean> {
        try {
            const leaderboardManager = LeaderboardManager.instance;
            if (!leaderboardManager) return false;

            // Fish is already recorded to leaderboard, now check if it's in top positions
            const allLeaderboards = leaderboardManager.getAllLeaderboards();
            const speciesLeaderboard = allLeaderboards.get(fish.name);
            
            if (speciesLeaderboard?.byWeight) {
                // Check if this fish is in the top 3 by weight for its species
                const weightEntries = speciesLeaderboard.byWeight
                    .sort((a: any, b: any) => b.weight - a.weight);
                
                const position = weightEntries.findIndex((entry: any) => 
                    entry.playerId === player.id && Math.abs(entry.weight - fish.weight) < 0.1
                );
                
                return position >= 0 && position < 3; // Top 3 is considered a record
            }

            return false;
        } catch (error) {
            console.error(`[CollectorDialogNpc] Error checking record:`, error);
            return false;
        }
    }

    // --- Update Fish Trophy Status After Official Weighing ---
    private async updateFishTrophyStatusAfterWeighing(player: Player, fish: CaughtFish): Promise<void> {
        try {
            
            const leaderboardManager = LeaderboardManager.instance;
            if (!leaderboardManager) {
                console.warn('[COLLECTOR] No leaderboard manager found for trophy status update');
                return;
            }

            const allLeaderboards = leaderboardManager.getAllLeaderboards();
            
            // Update the fish in player's inventory
            const inventory = this.stateManager.getInventory(player);
            if (!inventory) {
                console.error('[COLLECTOR] No inventory found for trophy status update');
                return;
            }
            
            const fishItem = inventory.items.find(item => 
                item.type === 'fish' && 
                item.id === fish.id
            );
            
            if (!fishItem || !fishItem.metadata?.fishStats) {
                console.error(`[COLLECTOR] Could not find fish item ${fish.id} for trophy status update`);
                return;
            }

                         let trophyStatus: 'first' | 'second' | 'third' | 'trophy' | null = null;
             let trophyType: 'species' | 'overall' | null = null;
             let speciesPosition = -1;
             let overallPosition = -1;

             // Check species leaderboard position
             const speciesLeaderboard = allLeaderboards.get(fish.name);
            if (speciesLeaderboard?.byWeight) {
                const weightEntries = speciesLeaderboard.byWeight
                     .sort((a: any, b: any) => b.weight - a.weight);
                
                 speciesPosition = weightEntries.findIndex((entry: any) => 
                    entry.playerId === player.id && Math.abs(entry.weight - fish.weight) < 0.1
                );
                
                 
                 if (speciesPosition >= 0 && speciesPosition < 3) {
                     trophyStatus = speciesPosition === 0 ? 'first' : 
                                  speciesPosition === 1 ? 'second' : 'third';
                     trophyType = 'species';
                 }
             }

             // Check overall leaderboard position (by value across all species)
             const allEntries: any[] = [];
             allLeaderboards.forEach((leaderboard, species) => {
                 if (leaderboard.byWeight) {
                     leaderboard.byWeight.forEach((entry: any) => {
                         allEntries.push({
                             playerName: entry.playerName || entry.username || 'Unknown',
                             value: this.calculateFishValueFromWeight(entry.weight, entry.rarity || 'common'),
                             weight: entry.weight || 0,
                             species: species,
                             playerId: entry.playerId,
                             fishId: entry.fishId || `${species}_${entry.playerId}_${entry.weight}`
                         });
                     });
                 }
             });

             const overallSorted = allEntries.sort((a, b) => b.value - a.value);
             overallPosition = overallSorted.findIndex((entry: any) => 
                 entry.playerId === player.id && 
                 entry.species === fish.name && 
                 Math.abs(entry.weight - fish.weight) < 0.1
             );


            // Overall trophy takes precedence over species trophy
            if (overallPosition >= 0 && overallPosition < 3) {
                trophyStatus = overallPosition === 0 ? 'first' : 
                              overallPosition === 1 ? 'second' : 'third';
                trophyType = 'overall';
                
                // Show overall milestone in weighing system
                if (this.weighingManager) {
                    // Get final value (after trophy bonus) from fish item
                    const finalValue = fishItem.value;
                    this.weighingManager.showOverallMilestone(player, overallPosition, fish.name, finalValue);
                }
            }

             // Update fish metadata with trophy information
             fishItem.metadata.fishStats.trophyStatus = trophyStatus;
             fishItem.metadata.fishStats.trophyType = trophyType;

             // Recalculate fish value with trophy bonuses
             const originalValue = fishItem.value;
             fishItem.value = this.calculateFishValueFromWeight(
                 fish.weight, 
                 fish.rarity, 
                 fish.name, 
                 trophyStatus || undefined, 
                 trophyType || undefined
             );

            if (trophyStatus) {
                const position = trophyType === 'overall' ? overallPosition : speciesPosition;
                const valueBonus = fishItem.value - originalValue;
                
                // Weighing system already shows milestones, so skip duplicate trophy messages
                // (Trophy messages are handled by the weighing ceremony)
            } 

             // UPDATE PHSHDEX again with final value including trophy bonuses
             if (originalValue !== fishItem.value) {
                 console.log(`[COLLECTOR] 📊 Updating phshdex record with final trophy-adjusted value for ${fishItem.name}: $${originalValue} → $${fishItem.value}`);
                 this.stateManager.updatePhshdexRecord(player, fishItem);
                    }

        } catch (error) {
            console.error('[COLLECTOR] Error updating fish trophy status after weighing:', error);
        }
    }

    // --- Spin Wheel Integration ---
    private triggerSpinWheel(player: Player, fish: CaughtFish): void {
        
        // Check if wheel is already spinning
        if (this.wheelSpinInProgress) {
            console.warn(`[CollectorDialogNpc] Wheel spin already in progress, awarding direct prize to player ${player.id}`);
            this.handleDirectPrize(player, fish);
            return;
        }
        
        // Find the spin wheel entity near the collector
        const spinWheel = this.findNearbySpinWheel();
        
        if (spinWheel) {
            // Run the wheel spin animation and award prize
            this.runWheelSpin(player, fish, spinWheel);
        } else {
            console.warn(`[CollectorDialogNpc] Spin wheel entity not found near collector`);
            // Fallback: Direct prize logic here
            this.handleDirectPrize(player, fish);
        }
    }

    private findNearbySpinWheel(): any {
        // Look for spin wheel furniture entity near collector
        const entities = this.world.entityManager.getAllEntities();
        
        // Find by model URI since it's furniture, not a named entity
        const wheelEntity = entities.find(entity => 
            (entity as any).modelUri === 'models/decor/prize_wheel.gltf' &&
            this.entity && 
            entity.position && 
            Math.abs(entity.position.x - this.entity.position.x) < 10 &&
            Math.abs(entity.position.z - this.entity.position.z) < 10
        );
     
        
        return wheelEntity;
    }

    private async runWheelSpin(player: Player, fish: CaughtFish, wheelEntity: any): Promise<void> {
        // Set wheel spin lock
        this.wheelSpinInProgress = true;
        
        try {
            // Get fish trophy status from inventory to determine wheel odds
            const fishTrophyInfo = this.getFishTrophyInfo(player, fish);
            
            // Select prize based on weighted probabilities (now factors in fish rarity, value, and ranking)
            const selectedColor = this.selectWeightedPrize(fishTrophyInfo.trophyType, fishTrophyInfo.trophyStatus, fish);
        const animationName = `prize_${selectedColor}`;
        
            // Show SceneUI dialog bubble for wheel spin start
            this.showWheelSpinDialog(player, `🎰 *grumbles* Fine... here's your wheel spin...`);
        
            // Stop any existing animations before starting new one
        try {
                wheelEntity.stopAllModelAnimations();
            } catch (e) {
                console.warn(`[CollectorDialogNpc] Could not stop existing animations:`, e);
            }
            
            // Start the wheel animation
            wheelEntity.startModelOneshotAnimations([animationName]);
            
            // Wait for animation to complete and show prize at 6 second mark
            await new Promise(resolve => setTimeout(resolve, 6000));
            
            // Award and display prize based on the selected color
            this.awardWheelPrize(player, fish, selectedColor);
            
        } catch (error) {
            console.error(`[CollectorDialogNpc] Error during wheel spin:`, error);
            // Fallback to direct prize
            this.handleDirectPrize(player, fish);
        } finally {
            // Always release the wheel spin lock
            this.wheelSpinInProgress = false;
        }
    }

    /**
     * Get trophy information for the fish to determine wheel odds
     */
    private getFishTrophyInfo(player: Player, fish: CaughtFish): { trophyType: string | null, trophyStatus: string | null } {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) {
            console.warn(`[CollectorDialogNpc] getFishTrophyInfo: No inventory found for player ${player.id}`);
            return { trophyType: null, trophyStatus: null };
        }
        
        // Try exact ID match first
        let fishItem = inventory.items.find(item => 
            item.type === 'fish' && 
            item.id === fish.id
        );
        
        // If not found by exact ID, try matching by name and weight (for cases where ID might differ)
        if (!fishItem) {
            fishItem = inventory.items.find(item => 
                item.type === 'fish' && 
                item.name === fish.name &&
                Math.abs((item.metadata?.fishStats?.weight || 0) - fish.weight) < 0.1
            );
        }
        
        // If still not found, try just by name (last resort)
        if (!fishItem) {
            const fishItemsByName = inventory.items.filter(item => 
                item.type === 'fish' && 
                item.name === fish.name
            );
            if (fishItemsByName.length > 0) {
                // Use the most recently weighed one (hasBeenWeighed = true) or first one
                fishItem = fishItemsByName.find(item => item.metadata?.fishStats?.hasBeenWeighed) || fishItemsByName[0];
            }
        }
        
        if (fishItem) {
            if (fishItem.metadata?.fishStats) {
                return {
                    trophyType: fishItem.metadata.fishStats.trophyType || null,
                    trophyStatus: fishItem.metadata.fishStats.trophyStatus || null
                };
            } else {
                console.warn(`[CollectorDialogNpc] getFishTrophyInfo: Fish item found but no fishStats metadata`);
            }
        } else {
            console.error(`[CollectorDialogNpc] getFishTrophyInfo: Could not find fish in inventory!`);
            console.error(`[CollectorDialogNpc] getFishTrophyInfo: Looking for - ID: ${fish.id}, name: ${fish.name}, weight: ${fish.weight}`);
            console.error(`[CollectorDialogNpc] getFishTrophyInfo: Available fish in inventory:`, 
                inventory.items.filter(item => item.type === 'fish').map(item => ({
                    id: item.id,
                    name: item.name,
                    weight: item.metadata?.fishStats?.weight,
                    hasBeenWeighed: item.metadata?.fishStats?.hasBeenWeighed
                }))
            );
        }
        
        return { trophyType: null, trophyStatus: null };
    }

    /**
     * Select prize color based on weighted probabilities depending on trophy type, status, fish rarity, value, and overall ranking
     */
    private selectWeightedPrize(trophyType: string | null, trophyStatus: string | null, fish: CaughtFish): string {
        // Define probability weights for each prize type based on trophy status (IMPROVED CHEST RATES)
        const probabilityTables = {
            // Species trophies - improved chest rewards
            species: {
                first: {  // Gold species trophy - improved species odds
                    teal: 8,     // Legendary: 8% (was 3%)
                    blue: 15,    // Rare: 15% (was 8%) 
                    green: 22,   // Common: 22% (was 15%)
                    lilac: 18,   // 500 coins: 18% (was 12%)
                    orange: 25,  // 300 coins: 25% (same)
                    red: 12      // Nothing: 12% (was 37%)
                },
                second: { // Silver species trophy
                    teal: 4,     // Legendary: 4% (was 1%)
                    blue: 12,    // Rare: 12% (was 5%)
                    green: 20,   // Common: 20% (was 12%)
                    lilac: 15,   // 500 coins: 15% (was 10%)
                    orange: 30,  // 300 coins: 30% (same)
                    red: 19      // Nothing: 19% (was 42%)
                },
                third: {  // Bronze species trophy
                    teal: 2,     // Legendary: 2% (was 0.5%)
                    blue: 8,     // Rare: 8% (was 3%)
                    green: 18,   // Common: 18% (was 8%)
                    lilac: 12,   // 500 coins: 12% (was 8%)
                    orange: 35,  // 300 coins: 35% (same)
                    red: 25      // Nothing: 25% (was 45.5%)
                }
            },
            // Overall trophies - even better rewards since they're harder to get
            overall: {
                first: {  // Gold overall trophy - amazing odds
                    teal: 20,    // Legendary: 20% (was 15%)
                    blue: 30,    // Rare: 30% (was 25%)
                    green: 30,   // Common: 30% (was 25%)
                    lilac: 15,   // 500 coins: 15% (was 20%)
                    orange: 5,   // 300 coins: 5% (was 10%)
                    red: 0       // Nothing: 0% (was 5%) - guaranteed reward!
                },
                second: { // Silver overall trophy
                    teal: 15,    // Legendary: 15% (was 8%)
                    blue: 25,    // Rare: 25% (was 20%)
                    green: 30,   // Common: 30% (was 25%)
                    lilac: 20,   // 500 coins: 20% (was 22%)
                    orange: 8,   // 300 coins: 8% (was 15%)
                    red: 2       // Nothing: 2% (was 10%)
                },
                third: {  // Bronze overall trophy
                    teal: 10,    // Legendary: 10% (was 5%)
                    blue: 20,    // Rare: 20% (was 15%)
                    green: 30,   // Common: 30% (was 25%)
                    lilac: 25,   // 500 coins: 25% (same)
                    orange: 12,  // 300 coins: 12% (was 20%)
                    red: 3       // Nothing: 3% (was 10%)
                }
            }
        };

        // Default fallback for non-trophy fish (shouldn't happen in wheel context, but safety) - IMPROVED
        const defaultWeights = {
            teal: 3,     // Legendary: 3% (was 1%)
            blue: 8,     // Rare: 8% (was 5%)
            green: 20,   // Common: 20% (was 15%)
            lilac: 20,   // 500 coins: 20% (was 15%)
            orange: 30,  // 300 coins: 30% (was 25%)
            red: 19      // Nothing: 19% (was 39%)
        };

        // Get the appropriate probability table
        let weights = defaultWeights;
        if (trophyType === 'species' && trophyStatus && probabilityTables.species[trophyStatus as keyof typeof probabilityTables.species]) {
            weights = { ...probabilityTables.species[trophyStatus as keyof typeof probabilityTables.species] };
        } else if (trophyType === 'overall' && trophyStatus && probabilityTables.overall[trophyStatus as keyof typeof probabilityTables.overall]) {
            weights = { ...probabilityTables.overall[trophyStatus as keyof typeof probabilityTables.overall] };
        }

        // Apply bonuses based on fish rarity, value, and overall ranking
        const rarityMultipliers: { [key: string]: { chest: number; nothing: number } } = {
            'common': { chest: 1.0, nothing: 1.0 },
            'uncommon': { chest: 1.2, nothing: 0.9 },
            'rare': { chest: 1.5, nothing: 0.7 },      // Rare fish get 50% more chest chance, 30% less nothing
            'epic': { chest: 2.0, nothing: 0.5 },      // Epic fish get 2x chest chance, 50% less nothing
            'legendary': { chest: 2.5, nothing: 0.3 }  // Legendary fish get 2.5x chest chance, 70% less nothing
        };

        const rarity = (fish.rarity || 'common').toLowerCase();
        const rarityBonus = rarityMultipliers[rarity] || rarityMultipliers['common'];
        
        // Apply rarity bonuses to chest colors (teal, blue, green, lilac)
        weights.teal = Math.round(weights.teal * rarityBonus.chest);
        weights.blue = Math.round(weights.blue * rarityBonus.chest);
        weights.green = Math.round(weights.green * rarityBonus.chest);
        weights.lilac = Math.round(weights.lilac * rarityBonus.chest);
        
        // Reduce nothing chance based on rarity
        weights.red = Math.max(0, Math.round(weights.red * rarityBonus.nothing));

        // Value-based bonus: High-value fish (>= 1500 coins) get additional chest boost
        if (fish.value >= 1500) {
            const valueMultiplier = 1.3; // 30% boost for high-value fish
            weights.teal = Math.round(weights.teal * valueMultiplier);
            weights.blue = Math.round(weights.blue * valueMultiplier);
            weights.green = Math.round(weights.green * valueMultiplier);
            weights.red = Math.max(0, Math.round(weights.red * 0.8)); // 20% less nothing chance
        }

        // Overall ranking bonus: If fish is in top 20 overall, reduce nothing chance further
        // This is especially important for rare/epic/legendary fish that rank well overall
        if (trophyType === 'species' && trophyStatus === 'first') {
            // Species #1 with rare+ rarity should have minimal nothing chance
            if (['rare', 'epic', 'legendary'].includes(rarity)) {
                weights.red = Math.max(0, Math.round(weights.red * 0.5)); // Cut nothing chance in half
                // Boost chest chances to compensate
                const chestBoost = 1.2;
                weights.teal = Math.round(weights.teal * chestBoost);
                weights.blue = Math.round(weights.blue * chestBoost);
                weights.green = Math.round(weights.green * chestBoost);
            }
        }

        // Convert weights to cumulative probabilities
        const colors = Object.keys(weights);
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        const cumulativeWeights: number[] = [];
        let cumulative = 0;
        
        for (const color of colors) {
            cumulative += weights[color as keyof typeof weights];
            cumulativeWeights.push(cumulative / totalWeight);
        }

        // Select random color based on weighted probabilities
        const random = Math.random();
        for (let i = 0; i < cumulativeWeights.length; i++) {
            if (random <= cumulativeWeights[i]) {
                const selectedColor = colors[i];
                console.log(`[CollectorDialogNpc] Selected ${selectedColor} (random: ${random.toFixed(3)}, threshold: ${cumulativeWeights[i].toFixed(3)})`);
                return selectedColor;
            }
        }

        // Fallback (shouldn't happen)
        return 'red';
    }

    private awardWheelPrize(player: Player, fish: CaughtFish, color: string): void {
        
        // Get trophy info to determine coin amounts
        const fishTrophyInfo = this.getFishTrophyInfo(player, fish);
        const isOverall = fishTrophyInfo.trophyType === 'overall';
        
        // Prize mapping based on color - Best to worst: Legendary chest, Rare chest, Common chests, Coins, Nothing
        const prizeMap: { [color: string]: { type: 'chest' | 'coins' | 'nothing'; rarity?: string; coins?: number; message: string; announcement: string; description: string } } = {
            'teal': { 
                type: 'chest', 
                rarity: 'legendary', 
                message: '🏆 LEGENDARY CHEST! 🏆', 
                announcement: '🎉 *eyes widen* By the depths... a LEGENDARY CHEST! You\'ve struck gold, angler!',
                description: 'An incredibly rare chest containing the most valuable treasures of the deep!'
            },
            'blue': { 
                type: 'chest', 
                rarity: 'rare', 
                message: '💎 Rare Chest! 💎', 
                announcement: '💎 *nods approvingly* A rare chest! Not bad... not bad at all.',
                description: 'A valuable chest filled with rare treasures and precious items.'
            },
            'green': { 
                type: 'chest', 
                rarity: 'common', 
                message: '📦 Treasure Chest! 📦', 
                announcement: '📦 *shrugs* A treasure chest. Better than nothing, I suppose.',
                description: 'A sturdy chest containing useful items and modest treasures.'
            },
            'lilac': { 
                type: 'chest', 
                rarity: 'common', 
                message: '📦 Treasure Chest! 📦', 
                announcement: '📦 *nods* Another common chest. Solid prize.',
                description: 'A reliable chest with practical items for any angler.'
            },
            'orange': { 
                type: 'coins', 
                coins: isOverall ? 500 : 100, 
                message: `💰 Great Coins: ${isOverall ? 500 : 100}! 💰`, 
                announcement: `💰 *jingles coins* ${isOverall ? 500 : 100} coins. ${isOverall ? 'Excellent haul for an overall record!' : 'Decent enough.'}`,
                description: `A generous sum of ${isOverall ? 500 : 100} gold coins for your efforts!`
            },
            'yellow': { 
                type: 'coins', 
                coins: isOverall ? 200 : 50, 
                message: `💰 Good Coins: ${isOverall ? 200 : 50}! 💰`, 
                announcement: `💰 *tosses coins* ${isOverall ? 200 : 50} coins. ${isOverall ? 'A respectable overall record reward.' : 'Could be worse.'}`,
                description: `A fair reward of ${isOverall ? 200 : 50} gold coins for your fishing prowess.`
            },
            'pink': { 
                type: 'coins', 
                coins: isOverall ? 200 : 50, 
                message: `💰 Coins: ${isOverall ? 200 : 50}! 💰`, 
                announcement: `💰 *sighs* ${isOverall ? 200 : 50} coins. ${isOverall ? 'At least it\'s an overall record.' : 'Small change, but it\'s something.'}`,
                description: `${isOverall ? 200 : 50} gold coins to add to your collection.`
            },
            'red': { 
                type: 'nothing', 
                message: '💸 Better luck next time! 💸', 
                announcement: '💸 *shakes head* Nothing this time. The wheel giveth and taketh away.',
                description: 'Sometimes the wheel doesn\'t favor you. Try again next time!'
            }
        };
        
        const prize = prizeMap[color] || { 
            type: 'coins', 
            coins: 50, 
            message: '💰 Mystery Prize: 50 coins! 💰', 
            announcement: '💰 *confused* Hmm... 50 coins? Strange, but I\'ll take it.',
            description: 'A mysterious reward of 50 gold coins!'
        };
        
        // Show prize announcement dialog
        this.showWheelSpinDialog(player, prize.announcement);
        
        // Award the prize
        if (prize.type === 'chest') {
            // Award chest to inventory
            this.awardChest(player, prize.rarity!);
            
            // Send prize data to client for 3D display
            player.ui.sendData({
                type: 'showPrizeDisplay',
                prizeData: {
                    type: 'chest',
                    name: prize.rarity === 'legendary' ? 'Legendary Chest' : 
                          prize.rarity === 'rare' ? 'Rare Chest' : 'Treasure Chest',
                    rarity: prize.rarity,
                    description: prize.description,
                    value: prize.rarity === 'legendary' ? 1000 : 
                           prize.rarity === 'rare' ? 500 : 200
                }
            });
            
            // Server-wide announcement for legendary chests
            if (prize.rarity === 'legendary') {
                const allPlayerEntities = this.world.entityManager.getAllPlayerEntities();
                for (const playerEntity of allPlayerEntities) {
                    if (playerEntity.player.id !== player.id) {
                        this.stateManager.sendGameMessage(
                            playerEntity.player, 
                            `🏆 ${player.username} just won a LEGENDARY CHEST from the Collector's prize wheel! 🏆`
                        );
                    }
                }
            }
        } else if (prize.type === 'coins') {
            this.stateManager.addCoins(player, prize.coins!);
            
            // Send prize data to client for 3D display
            player.ui.sendData({
                type: 'showPrizeDisplay',
                prizeData: {
                    type: 'coins',
                    name: `${prize.coins} Gold Coins`,
                    rarity: prize.coins! >= 400 ? 'rare' : prize.coins! >= 200 ? 'uncommon' : 'common',
                    description: prize.description,
                    amount: prize.coins,
                    value: prize.coins
                }
            });
            
            // Server-wide announcement for big coin prizes
            if (prize.coins! >= 400) {
                const allPlayerEntities = this.world.entityManager.getAllPlayerEntities();
                for (const playerEntity of allPlayerEntities) {
                    if (playerEntity.player.id !== player.id) {
                        this.stateManager.sendGameMessage(
                            playerEntity.player, 
                            `🏆 ${player.username} just won ${prize.coins} coins from the Collector's prize wheel!`
                        );
                    }
                }
            }
        } else {
            // Nothing prize - still show the display for consistency
            player.ui.sendData({
                type: 'showPrizeDisplay',
                prizeData: {
                    type: 'nothing',
                    name: 'Better Luck Next Time',
                    rarity: 'common',
                    description: prize.description,
                    value: 0
                }
            });
        }
        
        console.log(`[CollectorDialogNpc] Awarded ${prize.type} prize (${prize.rarity || prize.coins || 'nothing'}) to player ${player.id} for ${color} wheel result`);
    }

    private awardChest(player: Player, rarity: string): void {
        const chestItemId = `${rarity}_chest`;
        
        try {
            // Create chest item using ItemFactory
            const { ItemFactory } = require('../Inventory/ItemFactory');
            const chestItem = ItemFactory.createInventoryItemFromLootId(chestItemId, 1);
            
            // Add chest to player's inventory
            const inventoryManager = this.stateManager.getInventoryManager();
            const success = inventoryManager.addItem(player, chestItem);
            
            if (success) {
                console.log(`[CollectorDialogNpc] Successfully awarded ${rarity} chest to player ${player.id}`);
                inventoryManager.updateInventoryUI(player);
            } else {
                console.warn(`[CollectorDialogNpc] Failed to award ${rarity} chest to player ${player.id}, giving coins instead`);
                // Fallback to coins if chest can't be added
                const fallbackCoins = rarity === 'legendary' ? 1000 : rarity === 'rare' ? 500 : 200;
                this.stateManager.addCoins(player, fallbackCoins);
                this.stateManager.sendGameMessage(player, `💰 Inventory full! Received ${fallbackCoins} coins instead.`);
            }
        } catch (error) {
            console.error(`[CollectorDialogNpc] Error awarding ${rarity} chest to player ${player.id}:`, error);
            // Fallback to coins on error
            const fallbackCoins = rarity === 'legendary' ? 1000 : rarity === 'rare' ? 500 : 200;
            this.stateManager.addCoins(player, fallbackCoins);
            this.stateManager.sendGameMessage(player, `💰 Error with chest! Received ${fallbackCoins} coins instead.`);
        }
    }

    private handleDirectPrize(player: Player, fish: CaughtFish): void {
        // Fallback prize system if no wheel entity - use same weighted system
        const fishTrophyInfo = this.getFishTrophyInfo(player, fish);
        const selectedColor = this.selectWeightedPrize(fishTrophyInfo.trophyType, fishTrophyInfo.trophyStatus, fish);
        
        // Award prize without animation
        this.awardWheelPrize(player, fish, selectedColor);
    }

    /**
     * Show wheel spin dialog bubble like the initial NPC interactions
     */
    private showWheelSpinDialog(player: Player, message: string): void {
        if (!this.entity) {
            console.error(`[CollectorDialogNpc] No entity found for wheel spin dialog`);
            return;
        }

        // Create SceneUI dialog bubble attached to the NPC
        const wheelDialog = new SceneUI({
            templateId: 'npc-dialogue',
            attachedToEntity: this.entity,
            offset: { x: 0, y: this.config.modelScale * 1.2, z: 0 },
            state: { 
                text: message, 
                npcName: this.config.name || this.config.id,
                owningPlayerId: player.id 
            }
        });
        
        try {
            wheelDialog.load(this.world);
            
            // Auto-hide the dialog after 4 seconds
            setTimeout(() => {
                try {
                    if (wheelDialog) {
                        wheelDialog.unload();
                    }
                } catch (error) {
                    console.error(`[CollectorDialogNpc] Error hiding wheel spin dialog:`, error);
                }
            }, 4000);
            
        } catch (error) {
            console.error(`[CollectorDialogNpc] Error showing wheel spin dialog to player ${player.id}:`, error);
        }
    }



    // --- Helper Methods ---
    private isTrophyFish(fishName: string): boolean {
        const fishData = FISH_CATALOG.find(f => f.name === fishName);
        return fishData ? fishData.isTrophy : false;
    }

    private getWeighableFish(items: any[]): CaughtFish[] {
        return items.filter(item => 
            item.type === 'fish' && 
            item.metadata?.fishStats?.weight && 
            item.metadata.fishStats.weight > 0
        ).map(item => ({
            id: item.id,
            name: item.name,
            weight: item.metadata.fishStats.weight,
            rarity: item.rarity,
            value: item.value || 0,
            isBaitFish: false
        })) as CaughtFish[];
    }

    private openLeaderboard(player: Player): void {
        if (!LeaderboardManager.instance) {
            console.error(`[CollectorDialogNpc] LeaderboardManager.instance is null!`);
            return;
        }
        LeaderboardManager.instance.sendLeaderboardToPlayer(player);
    }
    
    private showLeaderboardToPlayer(player: Player): void {
        LeaderboardManager.instance?.sendLeaderboardToPlayer(player);
    }

    // --- Cleanup Methods (Should be inherited or copied from AnglerDialogNpc/DialogNpc) ---
    // Ensure you have `scheduleCleanup` and `cleanupPlayerInteraction` methods,
    // similar to AnglerDialogNpc, to handle unloading SceneUI and clearing state.

    // Example: (Make sure this matches your DialogNpc base or Angler)
    protected scheduleCleanup(player: Player, playerUI: CollectorPlayerInteractionUI): void {
         // Unload options immediately (desktop SceneUI)
         if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined; // Clear reference
         }
         // Mobile options hide automatically based on client logic after selection typically

         // Clear previous timer if exists
         if (playerUI.cleanupTimer) {
             clearTimeout(playerUI.cleanupTimer);
         }

         const hideDelay = 3500; // Delay before hiding dialog bubble
         playerUI.cleanupTimer = setTimeout(() => {
             this.cleanupPlayerInteraction(player, this.stateManager.getState(player)); // Call the main cleanup
         }, hideDelay);
    }


    // Override cleanup (Make sure signature matches base class)
    // This version assumes state might be needed, like in Angler's example
    public override cleanupPlayerInteraction(player: Player, state: PlayerState | undefined): void {
        const playerUI = this.interactingPlayers.get(player.id);
        if (playerUI) {
            // Send mobile dismissal event BEFORE cleanup (matches base class behavior)
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'npcInteractionEnded'
                });
            }
            
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            if (playerUI.dialog) { try { playerUI.dialog.unload(); } catch(e) {} }
            if (playerUI.options) { try { playerUI.options.unload(); } catch(e) {} } // Ensure options are cleaned up too

            this.interactingPlayers.delete(player.id);

            // Clear busy state if this was the player being served
            if (this.currentPlayerBeingServed === player.id) {
                this.isBusy = false;
                this.currentPlayerBeingServed = null;
            }

            // Update PlayerState to indicate no longer interacting with this NPC
            if (state?.npcInteraction?.currentNpcId === this.config.id) {
                 state.npcInteraction.currentNpcId = null;
                 state.lastNpcInteractionEndTime = state.lastNpcInteractionEndTime || {};
                 state.lastNpcInteractionEndTime[this.config.id] = Date.now(); // Record end time for cooldown
            }
        }
    }

    // --- Convert InventoryItem fish to CaughtFish format ---
    private convertToCaughtFish(fishItem: any): CaughtFish {
        return {
            id: fishItem.id,
            name: fishItem.name,
            weight: fishItem.metadata?.fishStats?.weight || 0,
            rarity: fishItem.rarity,
            value: fishItem.value || 0,
            isBaitFish: false
        };
    }

    // --- DEBUG: Create a random trophy fish for testing ---
    private async createDebugTestFish(player: Player, playerUI: CollectorPlayerInteractionUI): Promise<void> {
        console.log(`[CollectorDialogNpc] DEBUG: Creating test fish for player ${player.id}`);
        
        // Get all trophy fish from catalog
        const trophyFish = FISH_CATALOG.filter(f => f.isTrophy);
        if (trophyFish.length === 0) {
            console.error(`[CollectorDialogNpc] No trophy fish found in catalog!`);
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "❌ Error: No trophy fish found in catalog for testing." });
            }
            return;
        }
        
        // Pick a random trophy fish
        const randomFishData = trophyFish[Math.floor(Math.random() * trophyFish.length)];
        console.log(`[CollectorDialogNpc] DEBUG: Selected random trophy fish: ${randomFishData.name}`);
        
        // Generate a random weight within the fish's range
        const randomWeight = randomFishData.minWeight + 
            Math.random() * (randomFishData.maxWeight - randomFishData.minWeight);
        
        // Create a CaughtFish object
        const { ItemFactory } = require('../Inventory/ItemFactory');
        
        const caughtFish: CaughtFish = {
            id: `debug_${randomFishData.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: randomFishData.name,
            weight: randomWeight,
            rarity: randomFishData.rarity as any,
            value: randomFishData.baseValue,
            isBaitFish: false
        };
        
        // Create inventory item
        const fishItem = ItemFactory.createFishItem(
            caughtFish,
            randomFishData.modelData.modelUri,
            randomFishData.modelData.sprite
        );
        
        // Add to inventory
        const inventoryManager = this.stateManager.getInventoryManager();
        const success = inventoryManager.addItem(player, fishItem);
        
        if (!success) {
            console.error(`[CollectorDialogNpc] Failed to add test fish to inventory`);
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "❌ Error: Could not add test fish to inventory." });
            }
            return;
        }
        
        console.log(`[CollectorDialogNpc] DEBUG: Added test fish ${randomFishData.name} (${randomWeight.toFixed(2)}lbs) to inventory`);
        
        // Equip the fish
        const equipSuccess = inventoryManager.equipItem(player, fishItem.id);
        if (!equipSuccess) {
            console.error(`[CollectorDialogNpc] Failed to equip test fish`);
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "❌ Error: Could not equip test fish." });
            }
            return;
        }
        
        console.log(`[CollectorDialogNpc] DEBUG: Equipped test fish ${randomFishData.name}`);
        
        // Update inventory UI
        inventoryManager.updateInventoryUI(player);
        
        // Now trigger the weighing process
        const inventory = this.stateManager.getInventory(player);
        const weighableFish = inventory?.items.filter(item => 
            item.type === 'fish' && 
            !item.metadata?.fishStats?.hasBeenWeighed &&
            (item.metadata?.fishStats?.preliminaryWeight || item.metadata?.fishStats?.weight || 0) > 0 &&
            this.isTrophyFish(item.name)
        ) || [];
        
        if (weighableFish.length > 0) {
            await this.startWeighingProcess(player, playerUI, weighableFish);
        } else {
            console.error(`[CollectorDialogNpc] DEBUG: Created fish but it's not weighable`);
            if (playerUI.dialog) {
                playerUI.dialog.setState({ text: "❌ Error: Created fish but it's not weighable." });
            }
        }
    }

} 