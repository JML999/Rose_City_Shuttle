// TEMPORARILY DISABLED - To be added later
// This NPC is fully implemented but not currently spawned in the world.
// All related files are kept for future activation:
// - npcs/SaltBaitCrafterDialogNpc.ts
// - data/npc_definitions/salt_bait_crafter.json
// - data/layouts/salt_bait_crafter_location.json

import { Player, World, PlayerEntity, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import { ItemFactory } from '../Inventory/ItemFactory';
import { BaitUtils } from '../Utils/BaitUtils';
import GameManager from '../GameManager';

// Extended interface for this NPC
interface SaltBaitCrafterPlayerUI extends PlayerInteractionUI {
    currentInteractionType?: 'quest_available' | 'quest_active' | 'quest_turnin' | 'crafting_available' | null;
    currentQuestForInteraction?: string | null;
}

export class SaltBaitCrafterDialogNpc extends DialogNpc {
    private static readonly SALT_QUEST_ID = 'salt_collector_quest';

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
        console.log(`[SaltBaitCrafter ${this.config.id}] Initialized.`);
    }

    // --- Implement Abstract Methods (no sea story reaction) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "Hello! I need help collecting rock salt.";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "I can't climb the rocky terrain, but I need rock salt to make my famous salty bait!";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return this.config.interaction?.options?.map(opt => opt.text) || ["I'll help", "Maybe later"];
    }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[SaltBaitCrafter ${this.config.id}] No state found for player ${player.id}.`);
            return;
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.error(`[SaltBaitCrafter ${this.config.id}] QuestManager not available.`);
            return;
        }

        console.log(`[SaltBaitCrafter ${this.config.id}] Player ${player.id} starting interaction.`);

        const saltQuestCompleted = !!state.quests.completed[SaltBaitCrafterDialogNpc.SALT_QUEST_ID];
        const saltQuestActive = state.quests.active[SaltBaitCrafterDialogNpc.SALT_QUEST_ID];
        const questDefinition = questManager.getQuestDefinition(SaltBaitCrafterDialogNpc.SALT_QUEST_ID);

        let interactionType: 'quest_available' | 'quest_active' | 'quest_turnin' | 'crafting_available' = 'quest_available';
        let interactionPrompt = "";
        let displayOptions: string[] = [];

        if (saltQuestCompleted) {
            // Quest completed - show crafting option
            interactionType = 'crafting_available';
            interactionPrompt = "Thanks for your help! Come back anytime with some Mackerel and salt and I'll cook you some of my famous salty bait!";
            displayOptions = ["Craft Salty Bait", "Nevermind"];
        } else if (saltQuestActive && saltQuestActive.requiresTurnIn) {
            // Quest ready to turn in
            const objective = questDefinition?.objectives[0];
            const progress = saltQuestActive.objectivesProgress[0] || 0;
            const required = objective?.count || 10;

            if (progress >= required) {
                interactionType = 'quest_turnin';
                interactionPrompt = `Wonderful! You've collected ${progress} rock salts. That's exactly what I need!`;
                displayOptions = ["Turn In Quest", "Not Yet"];
            } else {
                interactionType = 'quest_active';
                interactionPrompt = `I still need ${required - progress} more rock salts. You can find them by breaking rocks in rocky terrain areas.`;
                displayOptions = ["I'll keep collecting", "Nevermind"];
            }
        } else if (saltQuestActive) {
            // Quest active but not ready
            const objective = questDefinition?.objectives[0];
            const progress = saltQuestActive.objectivesProgress[0] || 0;
            const required = objective?.count || 10;
            interactionType = 'quest_active';
            interactionPrompt = `I still need ${required - progress} more rock salts. You can find them by breaking rocks in rocky terrain areas.`;
            displayOptions = ["I'll keep collecting", "Nevermind"];
        } else {
            // Quest not started - offer it
            interactionType = 'quest_available';
            interactionPrompt = "Hello! I need help collecting rock salt. I can't climb the rocky terrain, but I need 10 rock salts to create salty mackerel bait for my job.";
            displayOptions = ["I'll help you", "Maybe later"];
        }

        // Get player entity
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[SaltBaitCrafter ${this.config.id}] No player entity found for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        // Create per-player UI
        const playerUI: SaltBaitCrafterPlayerUI = {
            currentFallbackResponse: interactionPrompt,
            currentInteractionType: interactionType,
            currentQuestForInteraction: SaltBaitCrafterDialogNpc.SALT_QUEST_ID
        };

        // Create NPC Dialog Bubble
        if (this.entity) {
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
            try {
                playerUI.dialog.load(this.world);
            } catch (error) {
                console.error(`[SaltBaitCrafter ${this.config.id}] Error loading dialog:`, error);
                playerUI.dialog = undefined;
            }
        }

        // Create Player Options UI
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
                    console.error(`[SaltBaitCrafter ${this.config.id}] Error loading options:`, error);
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

    // --- Handle dialog options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as SaltBaitCrafterPlayerUI | undefined;
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[SaltBaitCrafter ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        console.log(`[SaltBaitCrafter ${this.config.id}] handleOption called for player ${player.id} with option: ${option}`);
        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.error(`[SaltBaitCrafter ${this.config.id}] QuestManager not available.`);
            return;
        }

        let npcResponseText = playerUI.currentFallbackResponse || "Hello!";
        let endInteraction = true;

        if (playerUI.currentInteractionType === 'quest_available') {
            if (option === 0) {
                // Player accepts quest
                const assigned = questManager.assignQuest(player, SaltBaitCrafterDialogNpc.SALT_QUEST_ID);
                if (assigned) {
                    npcResponseText = "Thank you so much! You can find rock salt by breaking rocks in rocky terrain areas. Come back when you have 10!";
                } else {
                    npcResponseText = "Hmm, it seems I can't give you that task right now. Try again in a moment.";
                }
            } else {
                // Player declines
                npcResponseText = "Alright, let me know if you change your mind!";
            }
        } else if (playerUI.currentInteractionType === 'quest_active') {
            if (option === 0) {
                npcResponseText = "Thank you! I'll be waiting here when you're ready.";
            } else {
                npcResponseText = "Take your time!";
            }
        } else if (playerUI.currentInteractionType === 'quest_turnin') {
            if (option === 0) {
                // Turn in quest
                const completed = questManager.completeQuest(player, SaltBaitCrafterDialogNpc.SALT_QUEST_ID);
                if (completed) {
                    npcResponseText = "Thanks for your help! Come back anytime with some Mackerel and salt and I'll cook you some of my famous salty bait!";
                    // Update interaction type for next time
                    playerUI.currentInteractionType = 'crafting_available';
                } else {
                    npcResponseText = "Hmm, something went wrong. Try again in a moment.";
                }
            } else {
                npcResponseText = "Take your time!";
            }
        } else if (playerUI.currentInteractionType === 'crafting_available') {
            if (option === 0) {
                // Open crafting panel
                this.openSaltBaitCrafting(player);
                npcResponseText = "Here's my crafting station! Bring me mackerel and rock salt, plus 50 coins per bait.";
                endInteraction = true;
            } else {
                npcResponseText = "Come back anytime!";
            }
        }

        console.log(`[SaltBaitCrafter ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update dialogue bubble
        if (playerUI.dialog) {
            try {
                playerUI.dialog.setState({ text: npcResponseText });
            } catch (e) {
                console.error(`[SaltBaitCrafter ${this.config.id}] Error updating dialog:`, e);
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

    // --- Handle salt bait crafting ---
    public handleSaltBaitCraft(player: Player, quantity: number): boolean {

        const CRAFT_COST_PER_BAIT = 50;
        const totalCost = quantity * CRAFT_COST_PER_BAIT;

        // Check if quest is completed
        const state = this.stateManager.getState(player);
        if (!state || !state.quests.completed[SaltBaitCrafterDialogNpc.SALT_QUEST_ID]) {
            this.stateManager.sendGameMessage(player, "You need to complete my quest first!");
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: "You need to complete my quest first!"
            });
            return false;
        }

        // Check coins
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        if (currentCoins < totalCost) {
            this.stateManager.sendGameMessage(player, `You need $${totalCost} but only have $${currentCoins}!`);
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: `You need $${totalCost} but only have $${currentCoins}!`
            });
            return false;
        }

        // Check materials
        const inventory = this.stateManager.getInventoryManager().getInventory(player);
        if (!inventory) {
            this.stateManager.sendGameMessage(player, "Inventory error. Try again.");
            return false;
        }

        // Find mackerel (can be fish or bait fish)
        const mackerelItem = inventory.items.find(item => {
            if (item.type === 'fish' && item.metadata?.fishStats?.species === 'Mackerel') {
                return true;
            }
            // Also check for bait fish mackerel if it exists
            return false;
        });

        // Also check for rock_salt
        const rockSaltItem = inventory.items.find(item => item.id === 'rock_salt');

        const mackerelCount = mackerelItem ? (mackerelItem.quantity || 1) : 0;
        const rockSaltCount = rockSaltItem ? (rockSaltItem.quantity || 1) : 0;

        if (mackerelCount < quantity) {
            this.stateManager.sendGameMessage(player, `You need ${quantity} mackerel but only have ${mackerelCount}!`);
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: `You need ${quantity} mackerel but only have ${mackerelCount}!`
            });
            return false;
        }

        if (rockSaltCount < quantity) {
            this.stateManager.sendGameMessage(player, `You need ${quantity} rock salt but only have ${rockSaltCount}!`);
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: `You need ${quantity} rock salt but only have ${rockSaltCount}!`
            });
            return false;
        }

        // Check bait cap
        const playerLevel = this.stateManager.getCurrentLevel(player);
        const baitCap = BaitUtils.getBaitCapForLevel(playerLevel);
        const currentBaitCount = this.getCurrentBaitCount(player);

        if (currentBaitCount + quantity > baitCap) {
            this.stateManager.sendGameMessage(player, `Cannot craft ${quantity} bait - would exceed your bait cap of ${baitCap}! (Current: ${currentBaitCount})`);
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: `Cannot craft ${quantity} bait - would exceed your bait cap of ${baitCap}!`
            });
            return false;
        }

        // Remove coins
        const coinSuccess = this.stateManager.getCurrencyManager().removeCoins(player, totalCost);
        if (!coinSuccess) {
            console.error(`[SaltBaitCrafter] Failed to remove coins from player ${player.id}`);
            this.stateManager.sendGameMessage(player, "Payment processing failed. Try again!");
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: "Payment processing failed. Try again!"
            });
            return false;
        }

        // Remove materials
        // Remove mackerel - fish items have unique IDs, so we need to remove by quantity
        let mackerelRemoved = 0;
        for (let i = inventory.items.length - 1; i >= 0 && mackerelRemoved < quantity; i--) {
            const item = inventory.items[i];
            if (item.type === 'fish' && item.metadata?.fishStats?.species === 'Mackerel') {
                const toRemove = Math.min(quantity - mackerelRemoved, item.quantity || 1);
                if (item.quantity && item.quantity > 1) {
                    item.quantity -= toRemove;
                } else {
                    inventory.items.splice(i, 1);
                }
                mackerelRemoved += toRemove;
            }
        }

        // Remove rock salt
        if (rockSaltItem) {
            rockSaltItem.quantity -= quantity;
            if (rockSaltItem.quantity <= 0) {
                const index = inventory.items.indexOf(rockSaltItem);
                if (index !== -1) {
                    inventory.items.splice(index, 1);
                }
            }
        }

        // Create salty bait
        const saltyBaitItem = ItemFactory.createBaitItem('bait_salty_bait', quantity);
        if (!saltyBaitItem) {
            console.error(`[SaltBaitCrafter] Failed to create salty bait item`);
            // Refund coins and restore materials
            this.stateManager.getCurrencyManager().addCoins(player, totalCost);
            if (mackerelItem) mackerelItem.quantity += quantity;
            if (rockSaltItem) rockSaltItem.quantity += quantity;
            this.stateManager.sendGameMessage(player, "Failed to create bait. Coins and materials refunded.");
            player.ui.sendData({
                type: 'saltBaitCraftResult',
                success: false,
                error: "Failed to create bait. Coins and materials refunded."
            });
            return false;
        }

        this.stateManager.getInventoryManager().addItem(player, saltyBaitItem);

        // Update UI
        this.stateManager.updateCurrencyUI(player);
        this.stateManager.getInventoryManager().updateInventoryUI(player);

        // Success message
        this.stateManager.sendGameMessage(player, `Crafted ${quantity} salty bait for $${totalCost}!`);

        // Send result to client
        player.ui.sendData({
            type: 'saltBaitCraftResult',
            success: true,
            quantity: quantity
        });

        return true;
    }

    // Count the total bait items in player's inventory
    private getCurrentBaitCount(player: Player): number {
        const inventory = this.stateManager.getInventoryManager().getInventory(player);
        if (!inventory) return 0;

        return inventory.items
            .filter(item => item.type === 'bait')
            .reduce((total, item) => total + (item.quantity || 1), 0);
    }

    private openSaltBaitCrafting(player: Player): void {

        const playerLevel = this.stateManager.getCurrentLevel(player);
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        const inventory = this.stateManager.getInventoryManager().getInventory(player);

        // Send data to open the crafting panel
        player.ui.sendData({
            type: 'openSaltBaitCrafting',
            shopName: "Ms. Dee's Bait Crafting",
            shopTitle: 'Salty Bait - 1 Mackerel + 1 Rock Salt + 50 coins'
        });

        // Send current player data
        player.ui.sendData({
            type: 'playerDataUpdate',
            level: playerLevel,
            coins: currentCoins
        });

        // Send inventory data
        player.ui.sendData({
            type: 'inventoryUpdate',
            inventory: inventory
        });
    }
}

