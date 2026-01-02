import { Player, World, Entity, SimpleEntityController, RigidBodyType, Vector3 } from 'hytopia';
import type { InventoryItem } from './Inventory';
import { PlayerStateManager } from '../PlayerStateManager';
import { ItemFactory } from './ItemFactory';
import type { InventoryManager } from './InventoryManager';
import { GamePlayerEntity } from '../GamePlayerEntity';
import GameManager from '../GameManager';

interface OreContents {
    items: InventoryItem[];
    coinReward?: number;
    message: string;
}

interface OreLootTier {
    itemId: string;
    chance: number;
    minQuantity: number;
    maxQuantity: number;
}

interface OreLootTable {
    tiers: OreLootTier[][];  // Array of tiers, checked in order
    fallbackCoins: { min: number; max: number };
}

export class OreManager {
    private oreLootTables: Map<string, OreLootTable> = new Map();

    constructor(
        private stateManager: PlayerStateManager,
        private world?: World,
        private inventoryManager?: InventoryManager
    ) {
        this.initializeLootTables();
    }

    private initializeLootTables(): void {
        // Runic Ore: Only drops mithril nugget or rune
        // Items are checked in random order each time, so probabilities are exact
        // Probabilities: 15% rune, 85% nuggets
        this.oreLootTables.set('runic_ore', {
            tiers: [
                // Tier 1: All runic ore drops (checked in random order)
                [
                    { itemId: 'rune', chance: 0.15, minQuantity: 1, maxQuantity: 2 }, // Rune - 15% chance
                    { itemId: 'mithril_nugget', chance: 0.85, minQuantity: 1, maxQuantity: 1 } // Mithril Nugget - 85% chance (always 1)
                ]
            ],
            fallbackCoins: { min: 500, max: 1000 } // Should rarely hit this now
        });
    }

    public openOre(player: Player, oreItem: InventoryItem): OreContents | null {
        // Check if this ore has predefined contents in metadata (quest ores)
        const oreContents = (oreItem.metadata as any)?.contents;
        if (oreContents && Array.isArray(oreContents)) {
            console.log(`[OreManager] Ore ${oreItem.id} has predefined contents in metadata`);
            const contents: InventoryItem[] = [];
            const messages: string[] = [];
            
            for (const contentEntry of oreContents) {
                try {
                    const item = ItemFactory.createInventoryItemFromLootId(contentEntry.itemId, contentEntry.count || 1);
                    if (item) {
                        contents.push(item);
                        messages.push(`${contentEntry.count || 1}x ${item.name}`);
                    }
                } catch (error) {
                    console.error(`[OreManager] Failed to create item ${contentEntry.itemId} from ore metadata:`, error);
                }
            }
            
            if (contents.length > 0) {
                const oreTypeName = this.getOreTypeName(oreItem.id);
                const message = `✨ Opened ${oreTypeName}! Found: ${messages.join(', ')}`;
                return {
                    items: contents,
                    message: message
                };
            } else {
                console.error(`[OreManager] Failed to create any items from ore metadata contents`);
                return null;
            }
        }
        
        // Fall back to loot table system for regular ores
        const lootTable = this.oreLootTables.get(oreItem.id);
        if (!lootTable) {
            console.error(`[OreManager] No loot table found for ore: ${oreItem.id}`);
            return null;
        }

        // Try each tier in order
        for (let tierIndex = 0; tierIndex < lootTable.tiers.length; tierIndex++) {
            const tier = lootTable.tiers[tierIndex];
            
            // Shuffle the tier array to check items in random order each time
            const shuffledTier = [...tier].sort(() => Math.random() - 0.5);
            
            // Roll for each item in this tier (in random order)
            for (const lootEntry of shuffledTier) {
                if (Math.random() <= lootEntry.chance) {
                    // Success! Give this item
                    const quantity = this.randomBetween(lootEntry.minQuantity, lootEntry.maxQuantity);
                    
                    try {
                        const item = ItemFactory.createInventoryItemFromLootId(lootEntry.itemId, quantity);
                        const oreTypeName = this.getOreTypeName(oreItem.id);
                        const tierName = tierIndex === 0 ? 'rare' : 'common';
                        const message = `✨ Opened ${oreTypeName}! Found ${tierName} loot: ${quantity}x ${item.name}`;
                        
                        return {
                            items: [item],
                            message: message
                        };
                    } catch (error) {
                        console.error(`[OreManager] Failed to create item ${lootEntry.itemId}:`, error);
                        continue; // Try next item in tier
                    }
                }
            }
        }

        // All tiers failed, give coins
        const coinReward = this.randomBetween(lootTable.fallbackCoins.min, lootTable.fallbackCoins.max);
        this.stateManager.addCoins(player, coinReward);
        
        const oreTypeName = this.getOreTypeName(oreItem.id);
        const message = `✨ Opened ${oreTypeName}! Found ${coinReward} coins`;

        return {
            items: [],
            coinReward: coinReward,
            message: message
        };
    }

    private randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private getOreTypeName(oreId: string): string {
        switch (oreId) {
            case 'runic_ore': return 'Runic Ore';
            default: return 'Mysterious Ore';
        }
    }

    public isOre(item: InventoryItem): boolean {
        // Check if it's a known ore type (has loot table) or is a quest ore
        return this.oreLootTables.has(item.id) || 
               item.id.includes('ore') ||
               (item.id.includes('ore') && (item.metadata as any)?.contents);
    }

    /**
     * Opens an ore visually - spawns the loot above player's head and makes it spin
     * No opening animation for the ore itself, just the loot spins
     */
    public openOreVisually(player: Player, oreId: string, position: Vector3): void {
        if (!this.world || !this.inventoryManager) {
            console.error(`[OreManager] World or InventoryManager not available for visual ore opening`);
            return;
        }

        console.log(`[OreManager] Player ${player.id} opening ore: ${oreId} at position:`, position);
        
        // Verify the player has this ore in their inventory
        const inventory = this.inventoryManager.getInventory(player);
        console.log(`[OreManager] Current inventory items:`, inventory?.items.map(i => `${i.id} (qty: ${i.quantity})`));
        
        const ore = inventory?.items.find(item => item.id === oreId && item.id.includes('ore'));
        
        if (!ore) {
            console.error(`[OreManager] Player ${player.id} does not have ore ${oreId}`);
            return;
        }

        console.log(`[OreManager] Found ore in inventory:`, ore);

        // Generate the actual loot first
        const oreContents = this.openOre(player, ore);
        if (!oreContents) {
            console.error(`[OreManager] Failed to generate loot for ore ${oreId}`);
            return;
        }

        // Remove the ore from inventory since it's been opened
        console.log(`[OreManager] Attempting to remove ore ${oreId} from inventory`);
        const removed = this.inventoryManager.removeItem(player, oreId, 1);
        console.log(`[OreManager] Ore removal result:`, removed);
        
        if (removed) {
            console.log(`[OreManager] Removed opened ore ${oreId} from player ${player.id} inventory`);
            this.inventoryManager.updateInventoryUI(player);
            console.log(`[OreManager] Updated inventory after removal:`, this.inventoryManager.getInventory(player)?.items.map(i => `${i.id} (qty: ${i.quantity})`));
        } else {
            console.error(`[OreManager] Failed to remove ore ${oreId} from inventory`);
        }

        // Add the loot to inventory
        if (oreContents.items && oreContents.items.length > 0) {
            oreContents.items.forEach(item => {
                this.inventoryManager!.addItem(player, item);
                // Trigger quest progress update for collectItems objectives
                const questManager = GameManager.instance?.questManager;
                if (questManager) {
                    questManager.updateQuestProgress(player, 'addItem', { itemId: item.id, quantity: item.quantity || 1 });
                }
            });
        }

        // Send the loot message
        this.stateManager.sendGameMessage(player, oreContents.message);

        // Start visual effects - spawn loot immediately and make it spin
        const firstItem = oreContents.items && oreContents.items.length > 0 ? oreContents.items[0] : null;
        this.spawnOreVisualEffects(position, firstItem, oreId, player, oreContents.coinReward);
    }

    private spawnOreVisualEffects(position: Vector3, lootItem: InventoryItem | null, oreId: string, player: Player, coinReward?: number): void {
        if (!this.world) return;

        // Get the player entity to make loot a child entity (like fish equipping)
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        if (!playerEntity) {
            console.error(`[OreManager] No player entity found for player ${player.id} for ore spawning`);
            return;
        }

        // Spawn the loot item immediately (no ore opening animation)
        if (lootItem) {
            this.spawnLootFromOre(position, lootItem, playerEntity);
        } else if (coinReward) {
            // Spawn coin shower effect for coin rewards
            this.spawnCoinShower(position, coinReward, playerEntity);
        }
    }

    private spawnLootFromOre(orePosition: Vector3, lootItem: InventoryItem, playerEntity: GamePlayerEntity): void {
        if (!this.world) return;

        try {
            console.log(`[OreManager] Spawning loot from ore: ${lootItem.name} (${lootItem.id})`);
            
            // Determine model URI for the loot item
            let modelUri = lootItem.modelId || 'models/items/generic_item.gltf';
            
            // Create the loot entity as child of player with kinematic physics
            const lootEntity = new Entity({
                name: `loot_${lootItem.id}_${Date.now()}`,
                modelUri: modelUri,
                modelScale: 0.75,
                controller: new SimpleEntityController(),
                parent: playerEntity, // Make it a child entity like fish
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY
                }
            });

            // Adjust positions based on whether player is boating
            const baseY = playerEntity.isBoating ? 2.2 : 1.0; // Above player's head
            
            // Start position relative to player (above head)
            const startPosition = {
                x: 0, // Centered on player
                y: baseY, // Adjusted for boating
                z: 0  // Centered on player
            };

            // Spawn the loot entity with relative position
            lootEntity.spawn(this.world, startPosition);
            console.log(`[OreManager] Successfully spawned loot entity as child: ${lootItem.name}`);

            // Start spinning immediately (no movement, just spin)
            lootEntity.setAngularVelocity({ x: 0, y: 2, z: 0 }); // Spin on Y axis

            // Remove the loot entity after 4 seconds
            setTimeout(() => {
                try {
                    if (lootEntity && this.world) {
                        lootEntity.despawn();
                        console.log(`[OreManager] Removed loot entity: ${lootItem.name}`);
                    }
                } catch (error) {
                    console.error(`[OreManager] Error removing loot entity:`, error);
                }
            }, 4000);

        } catch (error) {
            console.error(`[OreManager] Error spawning loot from ore:`, error);
        }
    }

    private spawnCoinShower(orePosition: Vector3, coinValue: number, playerEntity: GamePlayerEntity): void {
        if (!this.world) return;

        try {
            console.log(`[OreManager] Spawning coin shower for ${coinValue} coins`);
            
            // Calculate number of coins to spawn (1 coin per 25 coin value, min 3, max 12)
            const numCoins = Math.min(Math.max(Math.floor(coinValue / 25), 3), 12);
            
            // Spawn coins with delays to create a shower effect
            for (let i = 0; i < numCoins; i++) {
                setTimeout(() => {
                    this.spawnSingleCoin(orePosition, playerEntity, i);
                }, i * 150); // 150ms delay between each coin
            }

        } catch (error) {
            console.error(`[OreManager] Error spawning coin shower:`, error);
        }
    }

    private spawnSingleCoin(orePosition: Vector3, playerEntity: GamePlayerEntity, coinIndex: number): void {
        if (!this.world) return;

        try {
            // Create individual coin entity as child of player
            const coinEntity = new Entity({
                name: `coin_${Date.now()}_${coinIndex}`,
                modelUri: 'models/items/gold-coins-1.gltf',
                modelScale: 0.5,
                controller: new SimpleEntityController(),
                parent: playerEntity,
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY
                }
            });

            // Random starting position around player (slight spread)
            const baseCoinY = playerEntity.isBoating ? 2.2 : 1.0; // Above player's head
            const startPosition = {
                x: (Math.random() - 0.5) * 0.4, // Random spread ±0.2 units
                y: baseCoinY, // Adjusted for boating
                z: (Math.random() - 0.5) * 0.4  // Random spread ±0.2 units
            };

            // Spawn the coin
            coinEntity.spawn(this.world, startPosition);
            console.log(`[OreManager] Spawned coin ${coinIndex + 1} at:`, startPosition);

            // Start spinning immediately
            coinEntity.setAngularVelocity({ x: 0, y: 2 + Math.random() * 2, z: 0 }); // Random spin 2-4

            // Remove coin after 3 seconds
            setTimeout(() => {
                try {
                    if (coinEntity && this.world) {
                        coinEntity.despawn();
                        console.log(`[OreManager] Removed coin ${coinIndex + 1}`);
                    }
                } catch (error) {
                    console.error(`[OreManager] Error removing coin entity:`, error);
                }
            }, 3000);

        } catch (error) {
            console.error(`[OreManager] Error spawning single coin:`, error);
        }
    }
}



