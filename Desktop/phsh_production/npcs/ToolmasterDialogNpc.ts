// NOTE: When instantiating ToolmasterDialogNpc, pass the config loaded from '../data/npc_definitions/toolmaster.json'.
import { Player, World } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import type { InventoryItem } from '../Inventory/Inventory';
import { CRAFTING_RECIPES } from '../Crafting/CraftingRecipes';
import { BAIT_CATALOG } from '../Bait/BaitCatalog';

// Define all craftable items at the Toolmaster Forge
interface CraftableItemEntry {
    itemId: string;
    materials: Array<{ id: string; name: string; required: number }>;
    coinCost: number;
    category: 'materials';
}

export class ToolmasterDialogNpc extends DialogNpc {
    private static TOOLMASTER_CRAFTABLES: CraftableItemEntry[] = [
        // Raw Materials -> Nuggets
        {
            itemId: 'iron_nugget',
            materials: [
                { id: 'old_can', name: 'Old Can', required: 2 }
            ],
            coinCost: 10,
            category: 'materials'
        },
        // Nuggets -> Ingots  
        {
            itemId: 'iron_ingot',
            materials: [
                { id: 'iron_nugget', name: 'Iron Nugget', required: 4 }
            ],
            coinCost: 25,
            category: 'materials'
        },
        {
            itemId: 'gold_ingot',
            materials: [
                { id: 'gold_nugget', name: 'Gold Nugget', required: 4 }
            ],
            coinCost: 50,
            category: 'materials'
        },
        {
            itemId: 'mithril_ingot',
            materials: [
                { id: 'mithril_nugget', name: 'Mithril Nugget', required: 4 }
            ],
            coinCost: 100,
            category: 'materials'
        },
        // Special Bait
        {
            itemId: 'bait_magnet',
            materials: [
                { id: 'iron_ingot', name: 'Iron Ingot', required: 1 },
                { id: 'mithril_nugget', name: 'Mithril Nugget', required: 1 }
            ],
            coinCost: 200,
            category: 'materials'
        },
        // Metal Spinners
        {
            itemId: 'bait_iron_spinner',
            materials: [
                { id: 'iron_ingot', name: 'Iron Ingot', required: 1 }
            ],
            coinCost: 300,
            category: 'materials'
        },
        {
            itemId: 'bait_gold_spinner',
            materials: [
                { id: 'gold_ingot', name: 'Gold Ingot', required: 1 }
            ],
            coinCost: 350,
            category: 'materials'
        },
        {
            itemId: 'bait_mithril_spinner',
            materials: [
                { id: 'mithril_ingot', name: 'Mithril Ingot', required: 1 }
            ],
            coinCost: 400,
            category: 'materials'
        }
    ];

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig // Pass the config explicitly
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3; // Set a reasonable radius
    }

    // --- Implement Abstract Methods (no sea story reaction) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "What can I do for you?";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "I'm just here to help with your tools.";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return this.config.interaction?.options?.map(opt => opt.text) || ["Craft a tool", "Who are you?"];
    }

    // --- Handle dialog options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[ToolmasterDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }
        let npcResponseText = playerUI.currentFallbackResponse || "What can I do for you?";
        let endInteraction = true;
        
        if (option === 0) {
            // Open the forge crafting panel
            npcResponseText = "Let me open the forge for you!";
            
            // Send craftable rod data to client
            this.showToolmasterForge(player);
            
            endInteraction = false;
        } else {
            // Use the config.interaction.options[option].response if available
            const optionsConfig = this.config.interaction?.options;
            if (optionsConfig && optionsConfig[option]) {
                const configResponse = optionsConfig[option].response;
                // Handle empty response strings by using fallback
                npcResponseText = configResponse && configResponse.trim() !== "" ? configResponse : (playerUI.currentFallbackResponse || "What can I do for you?");
            }
        }


        // Update the specific player's dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch(e) { 
                console.error(`[ToolmasterDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
            console.warn(`[ToolmasterDialogNpc ${this.config.id}] No dialog UI found for player ${player.id}`);
        }

        // Hide/unload the specific player's options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined; // Clear reference
        }

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

    // --- Toolmaster Specific Methods ---
    private showToolmasterForge(player: Player) {
        const playerCoins = this.stateManager.getCoinBalance(player);
        const inventory = this.stateManager.getInventory(player);

        // Build complete item data from catalogs using craftable item definitions
        let craftableItems = [];
        for (const craftableEntry of ToolmasterDialogNpc.TOOLMASTER_CRAFTABLES) {
            let itemData = null;
            
            // Find item data from appropriate catalog
            if (craftableEntry.category === 'materials') {
                // First try to find in crafting recipes (materials are defined there)
                const recipe = CRAFTING_RECIPES.find(r => r.output.id === craftableEntry.itemId);
                if (recipe) {
                    itemData = recipe.output;
                } else {
                    // If not in crafting recipes, check bait catalog for special bait items
                    const baitKey = craftableEntry.itemId.replace('bait_', '');
                    const baitDef = BAIT_CATALOG[baitKey];
                    if (baitDef) {
                        // Convert bait definition to inventory item format
                        itemData = {
                            id: baitDef.id,
                            name: baitDef.name,
                            quantity: 1,
                            value: baitDef.value,
                            sprite: baitDef.sprite,
                            modelId: baitDef.modelId,
                            type: 'bait' as const,
                            rarity: baitDef.rarity,
                            metadata: {
                                baitStats: {
                                    baseLuck: baitDef.baseLuck,
                                    targetSpecies: baitDef.targetSpecies,
                                    speciesLuck: baitDef.speciesLuck,
                                    class: baitDef.class,
                                    description: baitDef.description,
                                    drag: baitDef.drag,
                                    catchWeight: baitDef.catchWeight,
                                    catchSpeed: baitDef.catchSpeed,
                                    catchZone: baitDef.catchZone,
                                    lootScore: baitDef.lootScore,
                                    preferredLoot: baitDef.preferredLoot
                                }
                            }
                        };
                    }
                }
            } else {
                // First try to find in crafting recipes
                const recipe = CRAFTING_RECIPES.find(r => r.output.id === craftableEntry.itemId);
                if (recipe) {
                    itemData = recipe.output;
                } else {
                    // If not in crafting recipes, check bait catalog for special bait items
                    const baitKey = craftableEntry.itemId.replace('bait_', '');
                    const baitDef = BAIT_CATALOG[baitKey];
                    if (baitDef) {
                        // Convert bait definition to inventory item format
                        itemData = {
                            id: baitDef.id,
                            name: baitDef.name,
                            quantity: 1,
                            value: baitDef.value,
                            sprite: baitDef.sprite,
                            modelId: baitDef.modelId,
                            type: 'bait' as const,
                            rarity: baitDef.rarity,
                            metadata: {
                                baitStats: {
                                    baseLuck: baitDef.baseLuck,
                                    targetSpecies: baitDef.targetSpecies,
                                    speciesLuck: baitDef.speciesLuck,
                                    class: baitDef.class,
                                    description: baitDef.description,
                                    drag: baitDef.drag,
                                    catchWeight: baitDef.catchWeight,
                                    catchSpeed: baitDef.catchSpeed,
                                    catchZone: baitDef.catchZone,
                                    lootScore: baitDef.lootScore,
                                    preferredLoot: baitDef.preferredLoot
                                }
                            }
                        };
                    }
                }
            }
            
            if (itemData) {
                // Check material availability
                let canCraft = true;
                let materialStatus = [];
                
                for (const material of craftableEntry.materials) {
                    const playerHas = this.getPlayerMaterialCount(inventory, material.id);
                    const sufficient = playerHas >= material.required;
                    if (!sufficient) canCraft = false;
                    
                    materialStatus.push({
                        id: material.id,
                        name: material.name,
                        required: material.required,
                        playerHas: playerHas,
                        sufficient: sufficient
                    });
                }

                // Check coin requirement
                const canAfford = playerCoins >= craftableEntry.coinCost;
                if (!canAfford) canCraft = false;

                // Create complete item object with all catalog data plus crafting info
                const completeItem = {
                    ...itemData, // This includes sprite, name, value, metadata, stats, etc.
                    materials: materialStatus,
                    coinCost: craftableEntry.coinCost,
                    playerCoins: playerCoins,
                    canAfford: canAfford,
                    canCraft: canCraft && canAfford,
                    category: craftableEntry.category
                };
                craftableItems.push(completeItem);
            }
        }

        player.ui.lockPointer(true);
        player.ui.sendData({
            type: 'showToolmasterForge',
            items: craftableItems,
            playerCoins: playerCoins
        });
    }

    private getPlayerMaterialCount(inventory: any, materialId: string): number {
        if (!inventory || !inventory.items) {
            return 0;
        }

        const item = inventory.items.find((item: any) => item.id === materialId);
        return item ? item.quantity || 0 : 0;
    }
} 