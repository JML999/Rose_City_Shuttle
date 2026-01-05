import { Player, World, Entity, SimpleEntityController, RigidBodyType, Vector3, SceneUI } from 'hytopia';
import type { InventoryItem } from './Inventory';
import { PlayerStateManager } from '../PlayerStateManager';
import { ItemFactory } from './ItemFactory';
import type { InventoryManager } from './InventoryManager';
import { GamePlayerEntity } from '../GamePlayerEntity';
import GameManager from '../GameManager';

interface ChestContents {
    items: InventoryItem[];
    coinReward?: number;
    message: string;
}

interface ChestLootTier {
    itemId: string;
    chance: number;
    minQuantity: number;
    maxQuantity: number;
}

interface ChestLootTable {
    tiers: ChestLootTier[][];  // Array of tiers, checked in order
    fallbackCoins: { min: number; max: number };
}

export class ChestManager {
    private chestLootTables: Map<string, ChestLootTable> = new Map();

    constructor(
        private stateManager: PlayerStateManager,
        private world?: World,
        private inventoryManager?: InventoryManager
    ) {
        this.initializeLootTables();
    }

    private initializeLootTables(): void {
        // Treasure Chest: Simplified - only gold nuggets or ingots
        // Ordered from rarest to most common
        this.chestLootTables.set('common_chest', {
            tiers: [
                // Only gold items - checked in order, first success wins
                [
                    { itemId: 'gold_ingot', chance: 0.3, minQuantity: 1, maxQuantity: 1 }, // 1 gold ingot - 30% chance
                    { itemId: 'gold_nugget', chance: 0.6, minQuantity: 2, maxQuantity: 2 }, // 2 gold nuggets - 60% chance (if ingot didn't drop)
                    { itemId: 'gold_nugget', chance: 0.9, minQuantity: 1, maxQuantity: 1 } // 1 gold nugget - 90% chance (fallback)
                ]
            ],
            fallbackCoins: { min: 50, max: 100 } // Rare fallback
        });

        // Rare Chest: Roll for rare items → uncommon items → coins
        this.chestLootTables.set('rare_chest', {
            tiers: [
                // Tier 1: Rare items (medium chance)
                [
                    { itemId: 'gold_ingot', chance: 0.5, minQuantity: 1, maxQuantity: 3 },
                    { itemId: 'rune', chance: 0.4, minQuantity: 1, maxQuantity: 2 }, // Standard rune
                    { itemId: 'rare_rune', chance: 0.15, minQuantity: 1, maxQuantity: 1 }, // Rare rune - harder to get
                    { itemId: 'nimbus_rod', chance: 0.15, minQuantity: 1, maxQuantity: 1 },
                    { itemId: 'zhu_rod', chance: 0.12, minQuantity: 1, maxQuantity: 1 }
                ],
                // Tier 2: Uncommon items (high chance)
                [
                    { itemId: 'iron_ingot', chance: 0.8, minQuantity: 2, maxQuantity: 4 },
                    { itemId: 'iron_nugget', chance: 0.6, minQuantity: 3, maxQuantity: 6 },
                    { itemId: 'gold_nugget', chance: 0.5, minQuantity: 2, maxQuantity: 4 }
                ]
            ],
            fallbackCoins: { min: 250, max: 500 }
        });

        // Legendary Chest: Roll for legendary items → rare items → coins
        this.chestLootTables.set('legendary_chest', {
            tiers: [
                // Tier 1: Legendary items (medium chance)
                [
                    { itemId: 'rune', chance: 0.7, minQuantity: 2, maxQuantity: 4 }, // Standard rune
                    { itemId: 'rare_rune', chance: 0.4, minQuantity: 1, maxQuantity: 2 }, // Rare rune - better chance than rare chests
                    { itemId: 'relic_rod', chance: 0.2, minQuantity: 1, maxQuantity: 1 },
                    { itemId: 'leviathan_rod', chance: 0.15, minQuantity: 1, maxQuantity: 1 },
                    { itemId: 'keystone_rod', chance: 0.08, minQuantity: 1, maxQuantity: 1 }
                ],
                // Tier 2: Rare items (high chance)
                [
                    { itemId: 'gold_ingot', chance: 0.9, minQuantity: 3, maxQuantity: 6 },
                    { itemId: 'rune', chance: 0.5, minQuantity: 1, maxQuantity: 2 }, // Standard rune
                    { itemId: 'rare_rune', chance: 0.2, minQuantity: 1, maxQuantity: 1 } // Rare rune fallback
                ]
            ],
            fallbackCoins: { min: 1500, max: 3000 }
        });
    }

    public openChest(player: Player, chestItem: InventoryItem): ChestContents | null {
        // Check if this chest has predefined contents in metadata (quest chests)
        const chestContents = (chestItem.metadata as any)?.contents;
        if (chestContents && Array.isArray(chestContents)) {
            const contents: InventoryItem[] = [];
            const messages: string[] = [];
            
            for (const contentEntry of chestContents) {
                try {
                    const item = ItemFactory.createInventoryItemFromLootId(contentEntry.itemId, contentEntry.count || 1);
                    if (item) {
                        contents.push(item);
                        messages.push(`${contentEntry.count || 1}x ${item.name}`);
                    }
                } catch (error) {
                    console.error(`[ChestManager] Failed to create item ${contentEntry.itemId} from chest metadata:`, error);
                }
            }
            
            if (contents.length > 0) {
                const chestTypeName = this.getChestTypeName(chestItem.id);
                const message = `🎁 Opened ${chestTypeName}! Found: ${messages.join(', ')}`;
                return {
                    items: contents,
                    message: message
                };
            } else {
                console.error(`[ChestManager] Failed to create any items from chest metadata contents`);
                return null;
            }
        }
        
        // Fall back to loot table system for regular chests
        const lootTable = this.chestLootTables.get(chestItem.id);
        if (!lootTable) {
            console.error(`[ChestManager] No loot table found for chest: ${chestItem.id}`);
            return null;
        }

        // Try each tier in order
        for (let tierIndex = 0; tierIndex < lootTable.tiers.length; tierIndex++) {
            const tier = lootTable.tiers[tierIndex];
            
            // Roll for each item in this tier
            for (const lootEntry of tier) {
                if (Math.random() <= lootEntry.chance) {
                    // Success! Give this item
                    const quantity = this.randomBetween(lootEntry.minQuantity, lootEntry.maxQuantity);
                    
                    try {
                        const item = ItemFactory.createInventoryItemFromLootId(lootEntry.itemId, quantity);
                        const chestTypeName = this.getChestTypeName(chestItem.id);
                        const tierName = tierIndex === 0 ? 'rare' : 'common';
                        const message = `🎁 Opened ${chestTypeName}! Found ${tierName} loot: ${quantity}x ${item.name}`;
                        
                        return {
                            items: [item],
                            message: message
                        };
                    } catch (error) {
                        console.error(`[ChestManager] Failed to create item ${lootEntry.itemId}:`, error);
                        continue; // Try next item in tier
                    }
                }
            }
        }

        // All tiers failed, give coins
        const coinReward = this.randomBetween(lootTable.fallbackCoins.min, lootTable.fallbackCoins.max);
        this.stateManager.addCoins(player, coinReward);
        
        const chestTypeName = this.getChestTypeName(chestItem.id);
        const message = `🎁 Opened ${chestTypeName}! Found ${coinReward} coins`;

        return {
            items: [],
            coinReward: coinReward,
            message: message
        };
    }

    private randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private getChestTypeName(chestId: string): string {
        switch (chestId) {
            case 'common_chest': return 'Treasure Chest';
            case 'rare_chest': return 'Rare Chest';
            case 'legendary_chest': return 'Legendary Chest';
            case 'ancient_fragment_chest': return 'Ancient Fragment Chest';
            case 'ancient_cartographer_vault': return 'Ancient Cartographer\'s Vault';
            default: return 'Mysterious Chest';
        }
    }

    public isChest(item: InventoryItem): boolean {
        // Check if it's a known chest type (has loot table) or is a quest chest
        return this.chestLootTables.has(item.id) || 
               item.id === 'ancient_fragment_chest' || 
               item.id === 'ancient_cartographer_vault' ||
               item.id.includes('chest') ||
               (item.id.includes('vault') && (item.metadata as any)?.contents);
    }

    /**
     * Opens a chest visually with animations and spawns the actual loot
     */
    public openChestVisually(player: Player, chestId: string, position: Vector3): void {
        if (!this.world || !this.inventoryManager) {
            console.error(`[ChestManager] World or InventoryManager not available for visual chest opening`);
            return;
        }

        console.log(`[ChestManager] Player ${player.id} opening chest: ${chestId} at position:`, position);
        
        // Verify the player has this chest in their inventory
        const inventory = this.inventoryManager.getInventory(player);
        console.log(`[ChestManager] Current inventory items:`, inventory?.items.map(i => `${i.id} (qty: ${i.quantity})`));
        
        const chest = inventory?.items.find(item => item.id === chestId && item.id.includes('chest'));
        
        if (!chest) {
            console.error(`[ChestManager] Player ${player.id} does not have chest ${chestId}`);
            return;
        }

        console.log(`[ChestManager] Found chest in inventory:`, chest);

        // Generate the actual loot first
        const chestContents = this.openChest(player, chest);
        if (!chestContents) {
            console.error(`[ChestManager] Failed to generate loot for chest ${chestId}`);
            return;
        }

        // Remove the chest from inventory since it's been opened
        console.log(`[ChestManager] Attempting to remove chest ${chestId} from inventory`);
        const removed = this.inventoryManager.removeItem(player, chestId, 1);
        console.log(`[ChestManager] Chest removal result:`, removed);
        
        if (removed) {
            console.log(`[ChestManager] Removed opened chest ${chestId} from player ${player.id} inventory`);
            this.inventoryManager.updateInventoryUI(player);
            console.log(`[ChestManager] Updated inventory after removal:`, this.inventoryManager.getInventory(player)?.items.map(i => `${i.id} (qty: ${i.quantity})`));
            
            // Track daily stats for chest opened
            const dailyStats = this.stateManager.getDailyStats(player);
            dailyStats.chestsOpened += 1;
            
            // Update quest progress for openChests objectives
            const questManager = GameManager.instance?.questManager;
            if (questManager) {
                questManager.updateQuestProgress(player, 'openChest', {});
            }
        } else {
            console.error(`[ChestManager] Failed to remove chest ${chestId} from inventory`);
        }

        // Add the loot to inventory
        if (chestContents.items && chestContents.items.length > 0) {
            chestContents.items.forEach(item => {
                this.inventoryManager!.addItem(player, item);
                // Trigger quest progress update for collectItems objectives
                const questManager = GameManager.instance?.questManager;
                if (questManager) {
                    questManager.updateQuestProgress(player, 'addItem', { itemId: item.id, quantity: item.quantity || 1 });
                }
            });
        }

        // Send the loot message
        this.stateManager.sendGameMessage(player, chestContents.message);

        // Start visual effects
        const firstItem = chestContents.items && chestContents.items.length > 0 ? chestContents.items[0] : null;
        this.spawnChestVisualEffects(position, firstItem, chestId, player, chestContents.coinReward);
    }

    private spawnChestVisualEffects(position: Vector3, lootItem: InventoryItem | null, chestId: string, player: Player, coinReward?: number): void {
        if (!this.world) return;

        // Get the player entity to make chest a child entity (like fish equipping)
        // CRITICAL: Use player's current world, not ChestManager's world
        const playerEntities = player.world?.entityManager?.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[ChestManager] No player entity found for player ${player.id} in world ${player.world?.id || 'unknown'}`);
            return;
        }
        const playerEntity = playerEntities[0] as GamePlayerEntity;

        // Determine chest model URI
        let modelUri = 'models/items/common_chest.gltf'; // Default fallback
        if (chestId === 'rare_chest' || chestId === 'ancient_fragment_chest') {
            modelUri = 'models/items/rare_chest.gltf';
        } else if (chestId === 'legendary_chest') {
            modelUri = 'models/items/legendary_chest.gltf';
        } else if (chestId === 'ancient_cartographer_vault') {
            modelUri = 'models/items/rare_chest.gltf'; // Uses rare_chest model
        }

        // Create the chest entity as child of player (like fish)
        const chestEntity = new Entity({
            name: `chest_${chestId}_${Date.now()}`,
            modelUri: modelUri,
            modelScale: 0.75,
            controller: new SimpleEntityController(),
            modelLoopedAnimations: [],
            parent: playerEntity, // Make it a child entity like fish
            rigidBodyOptions: {
                type: RigidBodyType.FIXED // Make chest completely static
            }
        });

        // Adjust Y position based on whether player is boating
        const chestY = playerEntity.isBoating ? 1 : 0.90; // Higher position when boating
        try {
            chestEntity.spawn(this.world, { x: 0, y: chestY, z: 0 }); // Relative to player
            console.log(`[ChestManager] Successfully spawned chest entity for ${chestId} as child entity`);
        } catch (error) {
            console.error(`[ChestManager] Failed to spawn chest entity for ${chestId}:`, error);
            return;
        }

        // Start chest opening animation
        setTimeout(() => {
            try {
                chestEntity.startModelOneshotAnimations(['open']);
                console.log(`[ChestManager] Started open animation for chest ${chestId}`);
            } catch (error) {
                console.error(`[ChestManager] Failed to start open animation for chest ${chestId}:`, error);
            }
        }, 100);

        // Spawn the loot item at 6 seconds when chest opens
        if (lootItem) {
            setTimeout(() => {
                this.spawnLootFromChest(position, lootItem, playerEntity);
                // If this loot is Fitz's note, show a brief SceneUI hint and open the note panel
                if (lootItem.id === 'fitz_note_last_fragment') {
                    try {
                        const hint = new SceneUI({
                            templateId: 'npc-dialogue',
                            attachedToEntity: playerEntity,
                            offset: { x: 0, y: 1.6, z: 0 },
                            state: { text: 'A torn note lies inside…', owningPlayerId: player.id }
                        });
                        hint.load(this.world!);
                        setTimeout(() => { try { hint.unload(); } catch(e){} }, 2000);
                    } catch (e) {
                        console.error('[ChestManager] Failed to show Fitz note hint bubble:', e);
                    }
                    // Tell client to show the FitzNotePanel
                    player.ui.sendData({ type: 'openFitzNote' });
                }
            }, 6000);
        } else if (coinReward) {
            // Spawn coin shower effect for coin rewards
            setTimeout(() => {
                this.spawnCoinShower(position, coinReward, playerEntity);
            }, 6000);
        }

        // Remove the chest entity after animation completes
        setTimeout(() => {
            try {
                if (chestEntity && this.world) {
                    chestEntity.despawn();
                    console.log(`[ChestManager] Removed chest entity for ${chestId}`);
                }
            } catch (error) {
                console.error(`[ChestManager] Error removing chest entity:`, error);
            }
        }, 10000);
    }

    private spawnLootFromChest(chestPosition: Vector3, lootItem: InventoryItem, playerEntity: GamePlayerEntity): void {
        if (!this.world) return;

        try {
            console.log(`[ChestManager] Spawning loot from chest: ${lootItem.name} (${lootItem.id})`);
            
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
            const baseStartY = playerEntity.isBoating ? 2.05 : 0.85; // Higher when boating
            const baseTargetY = playerEntity.isBoating ? 2.9 : 1.7; // Higher when boating
            
            // Start position relative to player (same as chest level)
            const startPosition = {
                x: 0, // Relative to player (same as chest)
                y: baseStartY, // Adjusted for boating
                z: -0.6  // Relative to player (same as chest)
            };

            // Target position - preserve original movement: up 0.75, forward 0.75 from start
            const targetPosition = {
                x: startPosition.x + 0, // Stay centered (no x movement in original)
                y: baseTargetY, // Adjusted for boating
                z: startPosition.z + 1.75  // Move forward 0.75 units (preserves original)
            };

            // Spawn the loot entity with relative position
            lootEntity.spawn(this.world, startPosition);
            console.log(`[ChestManager] Successfully spawned loot entity as child: ${lootItem.name}`);

            // Use controller movement like chickens for smooth movement
            const controller = lootEntity.controller as SimpleEntityController;
            controller.move(targetPosition, 1.5, {
                moveCompleteCallback: () => {
                    console.log(`[ChestManager] Loot ${lootItem.name} reached target position`);
                    // Start spinning when movement is complete
                    lootEntity.setAngularVelocity({ x: 0, y: 1, z: 0 });
                }
            });

            // Remove the loot entity after 4 seconds
            setTimeout(() => {
                try {
                    if (lootEntity && this.world) {
                        lootEntity.despawn();
                        console.log(`[ChestManager] Removed loot entity: ${lootItem.name}`);
                    }
                } catch (error) {
                    console.error(`[ChestManager] Error removing loot entity:`, error);
                }
            }, 4000);

        } catch (error) {
            console.error(`[ChestManager] Error spawning loot from chest:`, error);
        }
    }

    private spawnCoinShower(chestPosition: Vector3, coinValue: number, playerEntity: GamePlayerEntity): void {
        if (!this.world) return;

        try {
            console.log(`[ChestManager] Spawning coin shower for ${coinValue} coins`);
            
            // Calculate number of coins to spawn (1 coin per 25 coin value, min 3, max 12)
            const numCoins = Math.min(Math.max(Math.floor(coinValue / 25), 3), 12);
            
            // Spawn coins with delays to create a shower effect
            for (let i = 0; i < numCoins; i++) {
                setTimeout(() => {
                    this.spawnSingleCoin(chestPosition, playerEntity, i);
                }, i * 150); // 150ms delay between each coin
            }

        } catch (error) {
            console.error(`[ChestManager] Error spawning coin shower:`, error);
        }
    }

    private spawnSingleCoin(chestPosition: Vector3, playerEntity: GamePlayerEntity, coinIndex: number): void {
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

            // Random starting position around chest (slight spread)
            const baseCoinY = playerEntity.isBoating ? 2.05 : 0.85; // Higher when boating
            const startPosition = {
                x: (Math.random() - 0.5) * 0.4, // Random spread ±0.2 units
                y: baseCoinY, // Adjusted for boating
                z: (Math.random() - 0.5) * 0.4  // Random spread ±0.2 units
            };

            // Random arc trajectory - coins go up and outward, then fall toward player
            const peakHeight = 1.5 + Math.random() * 0.8; // Random peak height 1.5-2.3
            const horizontalDistance = (Math.random() - 0.5) * 1.2; // Random horizontal distance ±0.6
            const forwardDistance = 0.3 + Math.random() * 0.4; // Random forward distance 0.3-0.7

            // Spawn the coin
            coinEntity.spawn(this.world, startPosition);
            console.log(`[ChestManager] Spawned coin ${coinIndex + 1} at:`, startPosition);

            // Start spinning immediately
            coinEntity.setAngularVelocity({ x: 0, y: 2 + Math.random() * 2, z: 0 }); // Random spin 2-4

            // Phase 1: Arc up and out (1 second)
            const controller = coinEntity.controller as SimpleEntityController;
            const midPosition = {
                x: startPosition.x + horizontalDistance * 0.7,
                y: startPosition.y + peakHeight,
                z: startPosition.z + forwardDistance * 0.7
            };

            controller.move(midPosition, 2.0, {
                moveCompleteCallback: () => {
                    // Phase 2: Fall toward player (1.5 seconds)
                    const finalPosition = {
                        x: horizontalDistance * 0.3, // Closer to player center
                        y: 0.2, // Fall down to near player feet
                        z: forwardDistance * 0.3 // Closer to player
                    };

                    controller.move(finalPosition, 1.2, {
                        moveCompleteCallback: () => {
                            console.log(`[ChestManager] Coin ${coinIndex + 1} reached player`);
                        }
                    });
                }
            });

            // Remove coin after total animation time (3.5 seconds)
            setTimeout(() => {
                try {
                    if (coinEntity && this.world) {
                        coinEntity.despawn();
                        console.log(`[ChestManager] Removed coin ${coinIndex + 1}`);
                    }
                } catch (error) {
                    console.error(`[ChestManager] Error removing coin entity:`, error);
                }
            }, 3500);

        } catch (error) {
            console.error(`[ChestManager] Error spawning single coin:`, error);
        }
    }
} 