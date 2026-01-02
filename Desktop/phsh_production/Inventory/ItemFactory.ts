import { BAIT_CATALOG, BaitService } from "../Bait/BaitCatalog";
import { FISH_CATALOG, type FishData } from "../Fishing/PhshTwoFIshCatalog";
import { FISHING_RODS } from "./RodCatalog";
import type { FishingStats } from './Inventory';
import type { CraftingRecipe } from "../Crafting/CraftingRecipes";
import { ITEM_CATALOG } from "../Crafting/ItemCatalog";
import { LOOT_CATALOG } from '../Fishing/LootCatalog';
import type { ItemType, InventoryItem } from './Inventory';

// --- Base Types ---
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface BaseItem {
    id: string;
    name: string;
    rarity: ItemRarity;
    sprite: string;
    modelId: string;
    description: string;
    value: number;
}

// --- Catalog Definitions ---
interface FishDefinition extends BaseItem {
    minWeight: number;
    maxWeight: number;
    isBait: boolean;
    isLoot: boolean;
    spawnData: {
        baseChance: number;
        zoneChances: {
            [zoneId: string]: {
                chance: number;
                timeWindows?: { start: number; end: number; }[];
            }
        };
        rodRestrictions?: string[];
    };
}

// --- Caught Fish Interface From Spawn Manager ---
export interface CaughtFish {
    id: string;        // Unique catch ID (e.g., "mackerel_1234567890")
    name: string;      // Fish name (e.g., "Mackerel")
    rarity: string;    // Calculated rarity based on weight
    weight: number;    // Specific weight of this catch
    value: number; 
    isBaitFish: boolean;
    isLoot?: boolean;  // Flag for loot items
    questBait?: { id: string; name: string };  // Quest bait to consume only on successful reel
    metadata?: {       // Optional metadata for special cases (e.g., chest contents)
        contents?: Array<{ itemId: string; count: number }>;
        [key: string]: any;  // Allow other metadata properties
    };
    // Calculated value based on weight/rarity
}

interface BaitDefinition extends BaseItem {
    class: string;
    harvestChance: number;
    minHarvestAmount: number;
    maxHarvestAmount: number;
    baseLuck: number;
    targetSpecies?: string[];
    speciesLuck?: number;
    drag?: number;
    catchWeight?: number;
    lootScore?: number;
    preferredLoot?: Array<{ lootTableId: string; boostMultiplier: number; }>;
}

interface RodDefinition extends BaseItem {
    rarityBonus: number;
    sizeBonus: number;
    maxDistance: number;
    luck: number;
    maxCatchWeight: number;
    health: number;
    damage: number;
    style?: string;
    specialAbility?: string;
}

// Add hookStats interface
type HookCharacteristic = 'drag' | 'catchRate' | 'catchSize' | 'specialAbility';
interface HookStats {
  health: number;
  characteristic: HookCharacteristic;
  boostValue: number;
  specialAbility?: string;
}

// Update ItemData to allow type and hookStats
interface ItemData {
    id: string;
    name: string;
    rarity: ItemRarity;
    minWeight: number;
    maxWeight: number;
    isBait: boolean;
    description: string;
    baseValue: number;
    modelData: {
        modelUri: string;
        sprite: string;
        baseScale: number;
        maxScale: number;
    };
    type?: ItemType;
    hookStats?: HookStats;
}

// --- Item Factory ---
export class ItemFactory {
    private static fishCatalog: FishData[] = FISH_CATALOG;
    private static baitCatalog: { [key: string]: BaitDefinition } = BAIT_CATALOG;
    private static rodCatalog: InventoryItem[] = FISHING_RODS;
    private static itemCatalog: { [key: string]: ItemData } = Object.fromEntries(ITEM_CATALOG.map(item => [item.id, item as ItemData]));

    static initialize() {}

    public static getFishItemDetails(caughtFish: CaughtFish) {
        // Extract static ID from the dynamic CaughtFish ID
        const idParts = caughtFish.id.split('_');
        if (idParts.length < 3) {
            console.error(`[ItemFactory] Unexpected fish ID format: ${caughtFish.id}`);
            return null;
        }
        const staticFishId = idParts.slice(0, -2).join('_');

        // Look up the base fish data from catalog using the static ID
        const fishData = FISH_CATALOG.find(f => f.id === staticFishId);
        if (!fishData) {
            // Updated error message for clarity
            console.error(`[ItemFactory] Could not find base fish data in catalog for static ID: "${staticFishId}" (derived from caughtFish.id: ${caughtFish.id})`);
            return null;
        }
    
        return {
            ...caughtFish,
            modelUri: fishData.modelData.modelUri,
            sprite: fishData.modelData.sprite,
            modelScale: fishData.modelData.baseScale,
            minWeight: fishData.minWeight
            // Add any other static properties we need from the catalog
        };
    }

    static createFishItem(fish: CaughtFish, fishModel: string, fishSprite: string): InventoryItem {
        const def = this.fishCatalog.find(fish => 
            fish.name.toLowerCase() === fish.name.toLowerCase()
        );
        if (!def) throw new Error(`Fish definition not found: ${fish.name}`);

        return {
            id: fish.id,
            modelId: fishModel,
            sprite: fishSprite,
            name: fish.name,
            type: 'fish',
            rarity: fish.rarity as ItemRarity,
            value: fish.value || def.baseValue,
            quantity: 1,
            metadata: {
                fishStats: {
                    preliminaryWeight: fish.weight || this.randomBetween(def.minWeight, def.maxWeight), // Hidden weight used for rarity/value calculation
                    weight: 0, // Will be set after official weighing
                    displayWeight: "Not Weighed", // What players see until weighed
                    size: 1,
                    species: fish.name,
                    timestamp: Date.now(),
                    isBaitFish: fish.isBaitFish,
                    hasBeenWeighed: false // Track if fish has been officially weighed
                }
            }
        };
    }

    static createBaitItem(baitId: string, quantity: number = 1): InventoryItem {
        const cleanId = baitId.replace(/^bait_/, '');
        const def = this.baitCatalog[cleanId];
        if (!def) throw new Error(`Bait definition nott found: ${cleanId}`);
        
        return {
            id: def.id,
            modelId: def.modelId,
            sprite: def.sprite,
            name: def.name,
            type: 'bait',
            rarity: def.rarity,
            value: def.value,
            quantity,
            metadata: {
                baitStats: {
                    baseLuck: def.baseLuck,
                    class: def.class,
                    targetSpecies: def.targetSpecies || [],
                    speciesLuck: def.speciesLuck,
                    description: def.description,
                    drag: def.drag,
                    catchWeight: def.catchWeight,
                    catchSpeed: def.catchSpeed,
                    catchZone: def.catchZone,
                    lootScore: def.lootScore,
                    preferredLoot: def.preferredLoot || []
                }
            }
        };
    }

    static createRodItem(rodId: string): InventoryItem {
        const def = this.rodCatalog.find(rod => rod.id === rodId);
        if (!def) throw new Error(`Rod definition not found: ${rodId}`);

        return {
            id: def.id,
            modelId: def.modelId,
            sprite: def.sprite,
            name: def.name,
            type: 'rod',
            rarity: def.rarity,
            value: def.value,
            description: def.description,
            quantity: 1,
            metadata: {
                rodStats: {
                    rarityBonus: def.metadata.rodStats?.rarityBonus || 1,
                    sizeBonus: def.metadata.rodStats?.sizeBonus || 1,
                    maxDistance: def.metadata.rodStats?.maxDistance || 1,
                    luck: def.metadata.rodStats?.luck || 1,
                    maxCatchWeight: def.metadata.rodStats?.maxCatchWeight || 1,
                    scale: def.metadata.rodStats?.scale ?? 1, // Include scale from catalog
                    health: def.metadata.rodStats?.health ?? 100,
                    damage: def.metadata.rodStats?.damage ?? 0,
                    style: def.metadata.rodStats?.style || '',
                    specialAbility: def.metadata.rodStats?.specialAbility || '',
                    lootScore: def.metadata.rodStats?.lootScore ?? 1,
                    catchSpeed: def.metadata.rodStats?.catchSpeed ?? 1,
                    drag: def.metadata.rodStats?.drag ?? 1,
                    catchZone: def.metadata.rodStats?.catchZone ?? 1,
                },
                enchantments: [] // Initialize empty enchantments array
            }
        };
    }

    static createCraftedItem(recipe: CraftingRecipe): InventoryItem {
        switch ((recipe.output.type as any)) {
            case 'bait':
                // Create bait item with quantity from recipe, then merge recipe output metadata
                const baitItem = this.createBaitItem(recipe.output.id, recipe.output.quantity || 1);
                // Preserve metadata from recipe output (important for crafted baits with custom stats)
                if (recipe.output.metadata) {
                    baitItem.metadata = { ...baitItem.metadata, ...recipe.output.metadata };
                }
                return baitItem;
            case 'rod':
                return this.createRodItem(recipe.output.id);
            case 'hook':
                // Use output metadata if present, else defaults
                const meta = (recipe.output.metadata as any)?.hookStats || { health: 100, characteristic: 'catchRate', boostValue: 0.1, specialAbility: '' };
                return this.createHookItem(recipe.output.id, meta.health, meta.characteristic, meta.boostValue, meta.specialAbility);
            case 'item':
            default:
                return this.createInventoryItemFromLootId(recipe.output.id, recipe.output.quantity || 1);
        }
    }

    public static createInventoryItemFromLootId(id: string, quantity: number = 1): InventoryItem {
        const lootDef = LOOT_CATALOG.find(l => l.id === id);
        if (!lootDef) throw new Error(`Loot definition not found: ${id}`);
        switch ((lootDef as any).type) {
            case 'bait':
                // Create the base bait item from BAIT_CATALOG using BaitService
                const baitItemFromCatalog = BaitService.createBaitItem(lootDef.id, quantity);

                if (!baitItemFromCatalog) {
                    console.error(`[ItemFactory] BaitService failed to create item for loot ID: ${lootDef.id}. LootDef: ${JSON.stringify(lootDef)}`);
                    // Fallback to a generic item if BaitService fails, though this indicates a mismatch
                    // between LOOT_CATALOG bait IDs and BAIT_CATALOG bait IDs.
                    return {
                        id: lootDef.id,
                        modelId: lootDef.modelUri, // modelUri from lootDef
                        sprite: lootDef.sprite,    // sprite from lootDef
                        name: lootDef.name,        // name from lootDef
                        type: 'bait',
                        rarity: lootDef.rarity as ItemRarity, // rarity from lootDef
                        value: lootDef.value,                // value from lootDef
                        quantity,
                        metadata: { 
                            baitStats: { 
                                baseLuck: 1, 
                                class: 'Basic', 
                                targetSpecies: [], 
                                speciesLuck: 1, 
                                description: lootDef.description || 'Unknown bait',
                                drag: 1,
                                catchWeight: 1,
                                lootScore: 1,
                                preferredLoot: []
                            }
                        }
                    };
                }

                // Override properties from LOOT_CATALOG for the looted version
                baitItemFromCatalog.value = lootDef.value; 
                baitItemFromCatalog.rarity = lootDef.rarity as ItemRarity; 
                baitItemFromCatalog.name = lootDef.name; 
                baitItemFromCatalog.modelId = lootDef.modelUri; 
                baitItemFromCatalog.sprite = lootDef.sprite;
                // The core metadata.baitStats (baseLuck, speciesLuck, etc.) remain from BAIT_CATALOG
                
                // If lootDef has a specific description for the looted context, 
                // we could add it to a different metadata field or decide if it should override the canonical one.
                // For now, baitItemFromCatalog.metadata.baitStats.description will hold the canonical description.
                // The lootDef.description can be used by FishLootManager for messages like "You hooked [lootDef.description]"

            return baitItemFromCatalog;
            case 'item':
            case 'junk':
            case 'chest':
                return {
                    id: lootDef.id,
                    modelId: lootDef.modelUri,
                    sprite: lootDef.sprite,
                    name: lootDef.name,
                    type: (lootDef as any).type as ItemType,
                    rarity: lootDef.rarity as ItemRarity,
                    value: lootDef.value,
                    quantity,
                    metadata: {
                        lootStats: {
                            description: lootDef.description || '',
                            isLoot: true
                        }
                    }
                };
            case 'hook':
                // For now, use default values; can be extended to use catalog
                return this.createHookItem(lootDef.id, 100, 'catchRate', 0.1);
            default:
                throw new Error(`Unknown loot type: ${lootDef.type}`);
        }
    }

    private static randomBetween(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    /**
     * Gets bait effect information based on a bait ID or item
     * @param baitIdOrItem The bait inventory item or just the bait ID string
     * @returns An object containing the bait's effects for display and gameplay
     */
    static getBaitEffects(baitIdOrItem: InventoryItem | string | null): { 
        drag: number;
        catchWeight: number;
        displayText: string;
        name: string;
        rarity: string;
    } {
        // Default values if no bait
        const defaultEffects = {
            drag: 1.0,
            catchWeight: 1.0,
            displayText: "No effect",
            name: "No bait",
            rarity: "common"
        };
        
        // Extract the bait ID
        let baitId = null;
        if (typeof baitIdOrItem === 'string') {
            baitId = baitIdOrItem;
        } else if (baitIdOrItem && typeof baitIdOrItem === 'object') {
            baitId = baitIdOrItem.id;
        }
        
        if (!baitId) {
            return defaultEffects;
        }
        
        // Import the BaitCatalog module properly
        const BaitCatalog = require('../Bait/BaitCatalog');
        
        // Check if we have a catalog and if it's an object with the bait ID as a key
        // or if it's an array that we can search through
        let baitData = null;
        
        if (BaitCatalog.BAIT_CATALOG) {
            if (Array.isArray(BaitCatalog.BAIT_CATALOG)) {
                // If it's an array, we can use find
                baitData = BaitCatalog.BAIT_CATALOG.find((b: any) => b.id === baitId);
            } else if (typeof BaitCatalog.BAIT_CATALOG === 'object') {
                // If it's an object with keys, look for the bait ID directly
                baitData = BaitCatalog.BAIT_CATALOG[baitId];
            }
        } else if (BaitCatalog.default && BaitCatalog.default.BAIT_CATALOG) {
            // Handle case where it's using ES modules with default export
            const catalog = BaitCatalog.default.BAIT_CATALOG;
            if (Array.isArray(catalog)) {
                baitData = catalog.find((b: any) => b.id === baitId);
            } else if (typeof catalog === 'object') {
                baitData = catalog[baitId];
            }
        } else {
            // Last attempt - maybe the catalog is exported directly
            if (Array.isArray(BaitCatalog)) {
                baitData = BaitCatalog.find((b: any) => b.id === baitId);
            } else if (typeof BaitCatalog === 'object') {
                baitData = BaitCatalog[baitId];
            }
        }
        
        if (!baitData) {
            // Hardcoded common baits for fallback
            const baitMap: {[key: string]: any} = {
                'bait_worm': { 
                    name: 'Worm', 
                    resilience: 1.0, 
                    strength: 1.0, 
                    rarity: 'common' 
                },
                'bait_cricket': { 
                    name: 'Cricket', 
                    resilience: 1.1, 
                    strength: 1.0, 
                    rarity: 'common' 
                }
                // Add more common baits if needed
            };
            
            baitData = baitMap[baitId] || null;
            
            if (!baitData) {
                // If still not found, create basic info from the ID
                const cleanName = baitId.replace('bait_', '').replace(/_/g, ' ');
                return {
                    ...defaultEffects,
                    name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
                };
            }
        }
        
        // Format the resilience as a percentage change
        const dragModifier = baitData.resilience || 1.0;
        const catchWeightModifier = baitData.strength || 1.0;
        
        // Format for display - show as percentage bonus or reduction
        const resiliencePercent = Math.round((dragModifier - 1) * 100);
        let displayText = "";
        
        if (resiliencePercent > 0) {
            displayText = `+${resiliencePercent}% Fish Resistance`;
        } else if (resiliencePercent < 0) {
            displayText = `${resiliencePercent}% Fish Resistance`;
        } else {
            displayText = "No effect on Fish Resistance";
        }
        
        return {
            drag: dragModifier,
            catchWeight: catchWeightModifier,
            displayText: displayText,
            name: baitData.name || baitId.replace('bait_', '').replace(/_/g, ' '),
            rarity: baitData.rarity || "common"
        };
    }

    static createHookItem(hookId: string, health?: number, characteristic?: HookCharacteristic, boostValue?: number, specialAbility: string = ''): InventoryItem {
        const def = this.itemCatalog[hookId];
        if (!def) throw new Error(`Hook def not found: ${hookId}`);
        const stats = (def as any).hookStats || { health: health ?? 100, characteristic: characteristic ?? 'catchRate', boostValue: boostValue ?? 0.1, specialAbility };
        return {
            id: def.id,
            modelId: def.modelData.modelUri,
            sprite: def.modelData.sprite,
            name: def.name,
            type: 'hook' as ItemType,
            rarity: def.rarity,
            value: def.baseValue,
            quantity: 1,
            metadata: {
                hookStats: stats as any
            } as any
        };
    }
}