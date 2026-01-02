// npcs/FishmongerDialogNpc.ts
import { Player, World } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import type { InventoryItem } from '../Inventory/Inventory'; // Import InventoryItem type
import GameManager from '../GameManager'; // Added import
// Note: Sea Story quests provide coin bonuses only, not XP bonuses

// Define bonus multiplier (can be shared or defined here)
const SEA_STORY_BONUS_MULTIPLIER = 1.25; // 25% Bonus

export class FishmongerDialogNpc extends DialogNpc {

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 4; // Example: Set a specific radius if needed
    }

    // Override handleOption to implement selling logic
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[FishmongerDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }


        let npcResponseText = playerUI.currentFallbackResponse || "Something went wrong."; // Use stored fallback
        let endInteraction = true; // Assume interaction ends unless logic changes it

        switch(option) {
            case 0: // Sell Selected fish
                npcResponseText = this.sellSelectedFish(player); // Get response text
                break;
            case 1: // Sell Fish Inventory
                npcResponseText = this.sellAllFish(player); // Get response text
                break;
            case 2: // Nevermind
                 npcResponseText = "Alright then.";
                 // endInteraction remains true
                break;
            default:
                console.warn(`[FishmongerDialogNpc ${this.config.id}] Received unknown option ${option}.`);
                npcResponseText = "Not sure what you mean, friend.";
                // endInteraction remains true
                break;
        }


        // Update the specific player's dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch(e) { 
                console.error(`[FishmongerDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
             this.stateManager.sendGameMessage(player, npcResponseText); // Fallback message if dialog UI failed/missing
        }

        // Hide/unload the specific player's options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined; // Clear reference
        }

        // --- Cleanup ---
        if (endInteraction) {
             // Clear any existing timer for this player
             if (playerUI.cleanupTimer) {
                 clearTimeout(playerUI.cleanupTimer);
             }
             // Schedule bubble hide and map cleanup for THIS player
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    // --- Logic adapted from FishMerchant ---

    // Helper method to calculate sell price (including potential bonus)
    private calculateSellPrice(fishItem: InventoryItem, player: Player): { price: number, isBonus: boolean } {
        const basePrice = fishItem.value || 0; // Default to 0 if value is missing
        const currentSeaStory = this.seaStoryManager.getCurrentSeaStory();
        const questManager = GameManager.instance?.questManager;

        let isBonus = false;
        let finalPrice = basePrice;

        if (questManager && currentSeaStory && currentSeaStory.fishType) {
            const isQuestActiveForPlayer = questManager.isQuestActive(player, 'sea_story_catch'); 
            if (isQuestActiveForPlayer && fishItem.name === currentSeaStory.fishType) { 
                finalPrice = Math.round(basePrice * SEA_STORY_BONUS_MULTIPLIER);
                isBonus = true;
            } else {
            }
        } else {
        }

        return { price: finalPrice, isBonus };
    }

    // Note: Sea Story quests provide coin bonuses only, not XP bonuses
    // XP rewards are handled by Angler daily quests

    private sellSelectedFish(player: Player): string {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) {
            console.error("[FishmongerDialogNpc] Failed to get inventory for player.");
            return "Error accessing inventory.";
        }

        const selectedFish = this.stateManager.getEquippedFish(player);
        if (!selectedFish) {
            this.stateManager.sendGameMessage(player, `Equip a fish in inventory`);
            return `Which fish were you wanting to sell? Select one first!`;
        }

        const fishItem = inventory.items.find(item => item.id === selectedFish.id);
        if (!fishItem) {
             return "Couldn't find that fish in your bag.";
        }

        const { price: sellPrice, isBonus } = this.calculateSellPrice(fishItem, player);

        // Clear the equipped fish BEFORE removing it from inventory
        this.stateManager.getInventoryManager().unequipItem(player, 'fish');

        if (this.stateManager.removeInventoryItem(player, fishItem.id)) {
            this.stateManager.addCoins(player, sellPrice);
            
            // Update Earners leaderboard with current totalValueEarned from phshdex
            const state = this.stateManager.getState(player);
            if (state?.phshdex) {
                const { LeaderboardManager } = require('../LeaderboardManager');
                const totalEarned = state.phshdex.overallStats.totalValueEarned;
                LeaderboardManager.instance.updateEarnersLeaderboard(player, totalEarned).catch((err: unknown) => {
                    console.error('[FishmongerDialogNpc] Error updating Earners leaderboard:', err);
                });
            }
            
            // Note: Sea Story quests provide coin bonuses only, not XP bonuses
            // XP rewards are handled by Angler daily quests
            
            // Trigger quest event for fish selling
            const questManager = GameManager.instance?.questManager;
            if (questManager) {
                questManager.updateQuestProgress(player, 'sellFish', { fishType: fishItem.name });
                
                // Ensure quest tracker updates immediately based on current inventory
                questManager.recalculateInventoryBasedProgress(player);
            }
            
            const bonusText = isBonus ? ' (Sea Story Bonus!)' : '';
            const message = `Sold ${fishItem.name} for ${sellPrice} coins!${bonusText}`;
            this.stateManager.sendGameMessage(player, message);
            return message;
        } else {
             const message = `Couldn't sell the ${fishItem.name}. Something went wrong.`;
            this.stateManager.sendGameMessage(player, `Failed to sell ${fishItem.name}.`);
             return message;
        }
    }

    private sellAllFish(player: Player): string {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) {
            console.error("[FishmongerDialogNpc] Failed to get inventory for player.");
             return `Couldn't access your inventory.`;
        }

        const fishItemsToSell = inventory.items.filter(item => item.type === 'fish');

        if (fishItemsToSell.length === 0) {
             const message = `You have no fish to sell!`;
            this.stateManager.sendGameMessage(player, message);
             return message;
        }

        // Check if the equipped fish is among the fish being sold
        const equippedFish = this.stateManager.getEquippedFish(player);
        const isEquippedFishBeingSold = equippedFish && fishItemsToSell.some(fish => fish.id === equippedFish.id);

        // Clear equipped fish BEFORE removing items if it's being sold
        if (isEquippedFishBeingSold) {
            this.stateManager.getInventoryManager().unequipItem(player, 'fish');
        }

        let totalEarnings = 0;
        let fishSoldCount = 0;
        let bonusAppliedCount = 0;
        const idsToRemove: string[] = [];
        const fishSold: { name: string; item: InventoryItem; isBonus: boolean }[] = []; // Track fish sold for quest events
        
        for (const fish of fishItemsToSell) {
            const { price: sellPrice, isBonus } = this.calculateSellPrice(fish, player);
             totalEarnings += sellPrice;
             fishSoldCount++;
             if (isBonus) bonusAppliedCount++;
             idsToRemove.push(fish.id);
             fishSold.push({ name: fish.name, item: fish, isBonus });
        }

        let allRemoved = true;
        for (const id of idsToRemove) {
            if (!this.stateManager.removeInventoryItem(player, id)) {
                 console.warn(`[FishmongerDialogNpc] Failed to remove fish item ${id} during sellAllFish for player ${player.id}.`);
                 allRemoved = false;
            }
        }

        let summaryMessage = "";
        if (allRemoved) {
           this.stateManager.addCoins(player, totalEarnings);
           
           // Update Earners leaderboard with current totalValueEarned from phshdex
           const state = this.stateManager.getState(player);
           if (state?.phshdex) {
               const { LeaderboardManager } = require('../LeaderboardManager');
               const totalEarned = state.phshdex.overallStats.totalValueEarned;
               LeaderboardManager.instance.updateEarnersLeaderboard(player, totalEarned).catch((err: unknown) => {
                   console.error('[FishmongerDialogNpc] Error updating Earners leaderboard:', err);
               });
           }
           
           // Trigger quest events for fish selling
           // Note: Sea Story quests provide coin bonuses only, not XP bonuses
           const questManager = GameManager.instance?.questManager;
           if (questManager) {
               for (const fish of fishSold) {
                   questManager.updateQuestProgress(player, 'sellFish', { fishType: fish.name });
               }
               
               // Ensure quest tracker updates immediately based on current inventory
               questManager.recalculateInventoryBasedProgress(player);
           }
           
           summaryMessage = `Great Haul! Sold ${fishSoldCount} fish for ${totalEarnings} coins!`;
            if (bonusAppliedCount > 0) {
                summaryMessage += ` (${bonusAppliedCount} received Sea Story Bonus!)`;
            }
        } else {
             console.warn(`[FishmongerDialogNpc] Some fish were not removed. Coins not added.`);
             // Construct appropriate message based on whether *any* were sold or *none*
             summaryMessage = `There was an issue selling all the fish. Please try again.`;
        }

        this.stateManager.sendGameMessage(player, summaryMessage);
        return summaryMessage;
    }

    // --- Implement Abstract Methods ---

    // Fishmonger *does* react to sea stories for bonus pricing, but doesn't change its core dialogue based on it.
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        // The check happens during price calculation, not initial dialogue.
        // So for dialogue purposes, it doesn't change its prompt/options based on the story.
        return false; // Keep initial dialogue standard
    }

    // These are required but won't be called if shouldReactToSeaStory returns false.
    // Provide default implementations.
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "What can I get for ya?"; // Default prompt
    }

    protected getSeaStoryResponse(story: SeaStory): string {
        // Not directly applicable for Fishmonger initial interaction
        return "Heard about that catch? Good stuff.";
    }

    protected getSeaStoryOptions(story: SeaStory): string[] {
        // Fishmonger options don't change based on sea story
        return this.config.interaction?.options?.map(opt => opt.text) || ["Sell Selected Fish", "Sell All Fish", "Nevermind"];
    }
}