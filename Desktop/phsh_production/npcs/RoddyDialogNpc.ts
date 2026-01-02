// npcs/RoddyDialogNpc.ts
import { Player, World } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI } from './DialogNpc'; // Import base types
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
// Import inventory/item types if needed for adding rods
import type { InventoryItem } from '../Inventory/Inventory';
// Assuming item definitions are available, e.g., through GameManager or a dedicated service
import GameManager from '../GameManager'; // Or wherever item definitions reside
import { FISHING_RODS } from '../Inventory/RodCatalog';

// Define Rod prices/details (replace with actual item IDs/data)
interface RodEntry {
    [key: string]: number;
}

export class RoddyDialogNpc extends DialogNpc {
    private static AVAILABLE_RODS: RodEntry[] = [
        {"oak_rod" : 1}, 
        {"deepcaster_rod" : 1},
        {"iron_rod" : 1},
        {"gold_rod" : 1},
        // Mithril rod removed from progression - players get Keystone before this
        // {"mithril_rod" : 1},
    ];

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 4; // Example radius
        console.log(`[RoddyDialogNpc ${this.config.id}] Initialized.`);
    }

    // --- Implement Abstract Methods ---
    // Roddy doesn't react to Sea Stories for dialogue changes
    protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
    protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "Need a new rod?"; }
    protected getSeaStoryResponse(story: SeaStory): string { return "Good luck out there."; }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        // Return options defined in roddy.json
        return this.config.interaction?.options?.map(opt => opt.text) || ["Buy Fishing Rod.", "Tell me about rods.", "Nevermind"];
    }

    // --- Override handleOption ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[RoddyDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        console.log(`[RoddyDialogNpc ${this.config.id}] handleOption called for player ${player.id} with option: ${option}`);

        let npcResponseText = playerUI.currentFallbackResponse || "Something went wrong.";
        let endInteraction = true; // Assume interaction ends

        // Get options text from config to handle logic cleanly
        const optionText = this.config.interaction?.options?.[option]?.text;

        switch(optionText) {
            case "Buy Fishing Rod.":
                // TODO: Implement actual buying logic - present rod options? For now, just try buying 'basic_rod'.
                this.showRodShop(player);
                break;
            case "Tell me about rods.":
                // Find the specific response from the config
                const infoResponse = this.config.interaction?.options?.find(o => o.text === "Tell me about rods.")?.response;
                npcResponseText = infoResponse || "Rods help you catch fish!";
                break;
            case "Nevermind":
                const nevermindResponse = this.config.interaction?.options?.find(o => o.text === "Nevermind")?.response;
                npcResponseText = nevermindResponse || "Alright then.";
                break;
            default:
                console.warn(`[RoddyDialogNpc ${this.config.id}] Received unknown option index ${option} or text mismatch.`);
                npcResponseText = "Changed your mind?";
                break;
        }

        console.log(`[RoddyDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the specific player's dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[RoddyDialogNpc ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[RoddyDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
            this.stateManager.sendGameMessage(player, npcResponseText); // Fallback message if dialog UI failed/missing
        }

        // Hide/unload the specific player's options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined;
        }

        // --- Cleanup ---
        if (endInteraction) {
             if (playerUI.cleanupTimer) { clearTimeout(playerUI.cleanupTimer); }
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    // --- Roddy Specific Methods ---

    private showRodShop(player: Player) {
        const level = this.stateManager.getCurrentLevel(player);
        const playerCoins = this.stateManager.getCoinBalance(player);
        const inventory = this.stateManager.getInventory(player);

        // Material requirements for crafted rods
        const craftedRodMaterials = {
            'deepcaster_rod': [
                { id: 'driftwood', name: 'Driftwood', required: 2 }
            ],
            'iron_rod': [
                { id: 'iron_ingot', name: 'Iron Ingot', required: 2 }
            ],
            'gold_rod': [
                { id: 'gold_ingot', name: 'Gold Ingot', required: 2 }
            ],
            // Mithril rod removed from progression
            // 'mithril_rod': [
            //     { id: 'mithril_ingot', name: 'Mithril Ingot', required: 2 }
            // ]
        };

        // Build complete rod data from catalog using rod IDs
        let availableRods = [];
        for (const rodEntry of RoddyDialogNpc.AVAILABLE_RODS) {
            const rodId = Object.keys(rodEntry)[0];
            const requiredLevel = rodEntry[rodId];
            
            // Find the complete rod data from catalog
            const catalogRod = FISHING_RODS.find(r => r.id === rodId);
            
            if (catalogRod) {
                // Check if player has required materials for crafted rods
                let hasMaterials = true;
                let materialsList = null;
                
                if (rodId in craftedRodMaterials) {
                    materialsList = craftedRodMaterials[rodId as keyof typeof craftedRodMaterials];
                    hasMaterials = materialsList.every(mat => {
                        const playerMaterial = inventory?.items.find(item => item.id === mat.id);
                        return playerMaterial && playerMaterial.quantity >= mat.required;
                    });
                }

                // Create complete rod object with all catalog data plus restriction info
                const completeRod = {
                    ...catalogRod, // This includes sprite, name, value, metadata, etc.
                    requiredLevel: requiredLevel,
                    playerLevel: level,
                    playerCoins: playerCoins,
                    alreadyOwned: inventory?.items.some(item => item.id === rodId) || false,
                    canAfford: playerCoins >= catalogRod.value,
                    levelRequirementMet: level >= requiredLevel,
                    materials: materialsList, // Add material requirements
                    hasMaterials: hasMaterials, // Whether player has materials
                    canPurchase: (level >= requiredLevel) && (playerCoins >= catalogRod.value) && !(inventory?.items.some(item => item.id === rodId)) && (materialsList ? hasMaterials : true)
                };
                availableRods.push(completeRod);
            }
        }

        player.ui.lockPointer(true);
        player.ui.sendData({
            type: 'showRodShop',
            rods: availableRods,
            playerCoins: playerCoins,
            playerLevel: level,
            playerInventory: inventory?.items || []
        });
    }
}