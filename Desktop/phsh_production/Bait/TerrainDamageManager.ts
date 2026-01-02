import { World, Block, Entity, Vector3, RigidBodyType } from "hytopia";
import type { Player, Vector3Like } from "hytopia";
import { BAIT_CATALOG } from './BaitCatalog';
import { PlayerStateManager } from "../PlayerStateManager";
import { ItemFactory } from "../Inventory/ItemFactory";
import { SimpleEntityController } from "hytopia";
import { EntityEvent } from "hytopia";
import { Light } from "hytopia";
import { TERRAIN_LOOT_CATALOG } from './TerrainLootCatalog';
import type { ItemType } from '../Inventory/Inventory';
import { TerrainRegenerationManager } from './TerrainRegenerationManager';
import { BaitUtils } from '../Utils/BaitUtils';
import GameManager from '../GameManager';
import GameClock from '../GameClock';

export class TerrainDamageManager {
    private static instance: TerrainDamageManager;
    private blockDamages: Map<string, { blockId: number, totalDamage: number }> = new Map();
    private stateManager?: PlayerStateManager;
    private world?: World;
    private activeDisplays: Map<string, Entity[]> = new Map(); // Track active loot displays by player ID
    private regenerationManager: TerrainRegenerationManager;

    // Singleton pattern with state manager parameter
    public static getInstance(): TerrainDamageManager {
        if (!TerrainDamageManager.instance) {
            TerrainDamageManager.instance = new TerrainDamageManager();
        }
        return TerrainDamageManager.instance;
    }

    // Initialize state manager separately
    public initializeStateManager(stateManager: PlayerStateManager): void {
        this.stateManager = stateManager;
    }

    public initializeWorld(world: World): void {
        this.world = world;
        this.regenerationManager.initializeWorld(world);
    }

    private constructor() {
        // Constructor no longer tries to get PlayerStateManager
        this.regenerationManager = TerrainRegenerationManager.getInstance();
    }

    // Convert coordinates to a map key
    private getBlockKey(x: number, y: number, z: number): string {
        return `${x},${y},${z}`;
    }

    // Loot tables for different block types
    // Block IDs must match map.json blockTypes
    private readonly BLOCK_LOOT_TABLES: Record<number, Array<{
        type: string;
        chance: number;
        minAmount: number;
        maxAmount: number;
    }>> = {
        2: [ // azalea-flowering-leaves (ID 2)
            { type: 'scarab', chance: 0.1, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.9, minAmount: 0, maxAmount: 0 }
        ],
        3: [ // azalea-leaves (ID 3)
            { type: 'scarab', chance: 0.1, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.9, minAmount: 0, maxAmount: 0 }
        ],
        23: [ // oak-leaves (ID 23)
            { type: 'scarab', chance: 0.1, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.9, minAmount: 0, maxAmount: 0 }
        ],
        11: [ // dirt (ID 11)
            { type: 'worm', chance: 0.6, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.4, minAmount: 0, maxAmount: 0 }
        ],
        28: [ // sand (ID 28)
            { type: 'none', chance: 1.0, minAmount: 0, maxAmount: 0 }
        ],
        15: [ // grass-block (ID 15)
            { type: 'worm', chance: 0.5, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.5, minAmount: 0, maxAmount: 0 }
        ],
        17: [ // grass-flower-block (ID 17)
            { type: 'worm', chance: 0.4, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.6, minAmount: 0, maxAmount: 0 }
        ],
        16: [ // grass-flower (ID 16)
            { type: 'worm', chance: 0.35, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.65, minAmount: 0, maxAmount: 0 }
        ],
        14: [ // grass (ID 14)
            { type: 'worm', chance: 0.35, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.65, minAmount: 0, maxAmount: 0 }
        ],
        72: [ // voidsoil (ID 72)
            { type: 'glow_worm', chance: 0.3, minAmount: 1, maxAmount: 1 },
            { type: 'none', chance: 0.7, minAmount: 0, maxAmount: 0 }
        ],
        // TODO: Next iteration - re-enable loot for rare blocks
        // 46: [ // ghost-dirt (ID 46)
        //     { type: 'none', chance: 1.0, minAmount: 0, maxAmount: 0 }
        // ],
        // 67: [ // rune_dirt (ID 67)
        //     { type: 'rock_salt', chance: 0.25, minAmount: 1, maxAmount: 2 },
        //     { type: 'none', chance: 0.75, minAmount: 0, maxAmount: 0 }
        // ]
    };

    // Apply damage to a block
    public damageBlock(world: World, block: Block, damage: number, player: any): boolean {
        // Store world reference if not already set
        if (!this.world) this.world = world;
        
        // Debug logging to see what block we're hitting
        console.log(`[TerrainDamageManager] Attempting to damage block ID: ${block.blockType.id}`);
        
        // First check if this block type can be damaged
        if (!this.canBlockBeDamaged(block.blockType.id)) {
            console.log(`[TerrainDamageManager] Block ID ${block.blockType.id} cannot be damaged`);
            return false;
        }

        // Log the actual coordinates to verify they're integers
        console.log(`[TerrainDamageManager] Block globalCoordinate: ${block.globalCoordinate.x}, ${block.globalCoordinate.y}, ${block.globalCoordinate.z}`);

        const key = this.getBlockKey(
            block.globalCoordinate.x,
            block.globalCoordinate.y,
            block.globalCoordinate.z
        );
        console.log(`[TerrainDamageManager] Block key: ${key}`);
        
        // Get or create damage tracker for this block
        let blockDamage = this.blockDamages.get(key);
        if (!blockDamage) {
            blockDamage = { blockId: block.blockType.id, totalDamage: 0 };
            this.blockDamages.set(key, blockDamage);
        }

        // Add damage
        blockDamage.totalDamage += damage;

        // Check if block should break
        const breakThreshold = this.getBreakThreshold(block.blockType.id);
        if (blockDamage.totalDamage >= breakThreshold) {
            // Profile timing for setBlock, recordBrokenBlock, and rollForLoot
            const t0 = Date.now();
            world.chunkLattice.setBlock(block.globalCoordinate, 0);
            const t1 = Date.now();
            console.log(`[TerrainDamageManager] setBlock took ${t1 - t0} ms`);

            this.blockDamages.delete(key);
            
            // Record the broken block for regeneration - use the same coordinates that setBlock uses
            const blockPosition = new Vector3(block.globalCoordinate.x, block.globalCoordinate.y, block.globalCoordinate.z);
            const t2 = Date.now();
            this.regenerationManager.recordBrokenBlock(blockPosition, block.blockType.id);
            const t3 = Date.now();
            console.log(`[TerrainDamageManager] recordBrokenBlock took ${t3 - t2} ms`);
            
            // Roll for loot when block breaks
            const t4 = Date.now();
            this.rollForLoot(block.blockType.id, player, block.globalCoordinate);
            const t5 = Date.now();
            console.log(`[TerrainDamageManager] rollForLoot took ${t5 - t4} ms`);
            
            const total = t5 - t0;
            console.log(`[TerrainDamageManager] Total block break handling took ${total} ms`);
            return true;
        }

        return false;
    }

    /**
     * Check if a position is within the ancient dig zone
     * Ancient dig zone: center (-120.5, 16.29, 440.98), radius 100
     */
    private isInAncientDigZone(position: Vector3Like): boolean {
        const digZoneCenter = { x: -120.5, y: 16.29, z: 440.98 };
        const digZoneRadius = 100;
        
        const dx = position.x - digZoneCenter.x;
        const dy = position.y - digZoneCenter.y;
        const dz = position.z - digZoneCenter.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        return distance <= digZoneRadius;
    }

    private rollForLoot(blockId: number, player: any, blockPosition: Vector3Like) {
        console.log(`[TerrainDamageManager] Rolling for loot from block ID: ${blockId}`);
        if (!this.stateManager) {
            console.log('[TerrainDamageManager] No state manager available');
            return;
        }
        const lootTable = this.BLOCK_LOOT_TABLES[blockId];
        if (!lootTable) {
            console.log(`[TerrainDamageManager] No loot table found for block ID: ${blockId}`);
            return;
        }
        console.log(`[TerrainDamageManager] Loot table:`, lootTable);
        const totalChance = lootTable.reduce((sum: number, entry) => sum + entry.chance, 0);
        const roll = Math.random() * totalChance;
        console.log(`[TerrainDamageManager] Roll: ${roll} (total chance: ${totalChance})`);
        let currentSum = 0;
        for (const entry of lootTable) {
            currentSum += entry.chance;
            console.log(`[TerrainDamageManager] Checking entry: ${entry.type} (chance: ${entry.chance}, current sum: ${currentSum})`);
            if (roll <= currentSum) {
                if (entry.type === 'none') {
                    console.log('[TerrainDamageManager] Rolled none');
                    return;
                }
                
                // Check time restriction for insects (sunrise only: 5:00-7:00)
                if (entry.type === 'insect') {
                    const gameClock = GameClock.instance;
                    const currentHour = gameClock.hour;
                    if (currentHour < 5 || currentHour >= 7) {
                        return;
                    }
                }
                
                // Check location restriction for scarabs (only in ancient dig zone)
                if (entry.type === 'scarab') {
                    const isInAncientDigZone = this.isInAncientDigZone(blockPosition);
                    if (!isInAncientDigZone) {
                        console.log(`[TerrainDamageManager] Scarab can only be found in ancient dig zone, but player is at (${blockPosition.x}, ${blockPosition.y}, ${blockPosition.z})`);
                        return;
                    }
                }
                
                const amount = Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1)) + entry.minAmount;
                
                // Look up in terrain loot catalog first to check if it's bait
                const lootDef = TERRAIN_LOOT_CATALOG.find(l => l.id === entry.type);
                if (!lootDef) {
                    console.log(`[TerrainDamageManager] No loot definition found for type: ${entry.type}`);
                    return;
                }
                
                // Only check bait cap for bait items
                if (lootDef.type === 'bait') {
                    const playerLevel = this.stateManager.getCurrentLevel(player);
                    const baitCap = BaitUtils.getBaitCapForLevel(playerLevel);
                    const currentBaitCount = this.getCurrentBaitCount(player);
                    if (currentBaitCount >= baitCap) {
                        this.stateManager.sendGameMessage(player, `You found some bait, but your bait pouch is full! (Max: ${baitCap})`);
                        return;
                    }
                }
                
                console.log(`[TerrainDamageManager] Found loot definition:`, lootDef);
                
                let inventoryItem;
                if (lootDef.type === 'bait') {
                    // Create bait item using ItemFactory.createBaitItem
                    inventoryItem = ItemFactory.createBaitItem('bait_' + lootDef.id, amount);
                } else {
                    // Create regular item using ItemFactory.createInventoryItemFromLootId
                    inventoryItem = ItemFactory.createInventoryItemFromLootId(lootDef.id, amount);
                }
                
                if (!inventoryItem) {
                    console.error(`[TerrainDamageManager] Failed to create inventory item for ${lootDef.id}`);
                    return;
                }
                
                this.stateManager.addInventoryItem(player, inventoryItem);
                this.stateManager.sendGameMessage(player, `Found ${amount} ${lootDef.name}!`);
                
                // Trigger quest progress update for collectItems objectives
                const questManager = GameManager.instance?.questManager;
                if (questManager) {
                    questManager.updateQuestProgress(player, 'addItem', { 
                        itemId: inventoryItem.id, 
                        quantity: amount 
                    });
                }
                
                this.displayLootPopup(player, entry.type, blockPosition); // TEST: Only popup enabled
                break;
            }
        }
    }

    // Count the total bait items in player's inventory
    private getCurrentBaitCount(player: any): number {
        if (!this.stateManager) return 0;
        
        const inventory = this.stateManager.getInventory(player);
        if (!inventory || !inventory.items) return 0;
        
        let baitCount = 0;
        for (const item of inventory.items) {
            if (item.type === 'bait') {
                baitCount += item.quantity || 1;
            }
        }
        
        return baitCount;
    }

    private canBlockBeDamaged(blockId: number): boolean {
        // Block IDs must match map.json blockTypes
        const breakableBlocks = [
            // Dirt family
            11,  // dirt (ID 11)
            46,  // ghost-dirt (ID 46)
            67,  // rune_dirt (ID 67)
            // Grass family
            15,  // grass-block (ID 15)
            17,  // grass-flower-block (ID 17)
            16,  // grass-flower (ID 16)
            14,  // grass (ID 14)
            // Leaves family
            2,   // azalea-flowering-leaves (ID 2)
            3,   // azalea-leaves (ID 3)
            23,  // oak-leaves (ID 23)
            // Sand family
            28,  // sand (ID 28)
            // Void soil
            72,  // voidsoil (ID 72)
            // Stone family
            7,   // coal-ore (ID 7)
            19,  // iron-ore (ID 19)
            27,  // red-mushroom-block (ID 27)
            29,  // sandstone (ID 29)
            30,  // snow-rocky (ID 30)
        ];
        return breakableBlocks.includes(blockId);
    }

    private getBreakThreshold(blockId: number): number {
        // Block IDs must match map.json blockTypes
        const thresholds: Record<number, number> = {
            // Dirt family
            11: 20,  // dirt (ID 11)
            46: 20,  // ghost-dirt (ID 46)
            67: 30,  // rune_dirt (ID 67)
            // Grass family
            15: 20,  // grass-block (ID 15)
            17: 20,  // grass-flower-block (ID 17)
            16: 20,  // grass-flower (ID 16)
            14: 20,  // grass (ID 14)
            // Sand family
            28: 20,  // sand (ID 28)
            // Leaves family
            2: 20,   // azalea-flowering-leaves (ID 2)
            3: 20,   // azalea-leaves (ID 3)
            23: 20,  // oak-leaves (ID 23)
            // Void soil
            72: 20,  // voidsoil (ID 72)
            // Stone family
            7: 100,  // coal-ore (ID 7)
            19: 500, // iron-ore (ID 19)
            27: 500, // red-mushroom-block (ID 27)
            29: 500, // sandstone (ID 29)
            30: 500, // snow-rocky (ID 30)
        };
        return thresholds[blockId] || 20;
    }

    private displayLootPopup(player: any, lootType: string, blockPosition: Vector3Like): void {
        if (!this.world) return;
        
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0];
        if (!playerEntity) return;
        
        let modelUri = 'models/items/generic_item.gltf';
        let modelScale = 1;
        const pointLightInstances: Light[] = []; // Store multiple Light instances
        
        // First, try to find the loot in TERRAIN_LOOT_CATALOG
        const terrainLootDef = TERRAIN_LOOT_CATALOG.find(l => l.id === lootType);
        if (terrainLootDef) {
            modelUri = terrainLootDef.modelUri;
            // Use default scales based on loot type (can be customized per item if needed)
            if (lootType === 'worm' || lootType === 'glow_worm') {
                modelScale = 1.10;
            } else if (lootType === 'clam') {
                modelScale = 0.25;
            } else if (lootType === 'insect' || lootType === 'scarab') {
                modelScale = 0.33;
            } else {
                modelScale = 1.0;
            }
        } else {
            // Fallback to hardcoded checks for items not in TERRAIN_LOOT_CATALOG (like shrimp)
            if (lootType === 'shrimp') {
                modelUri = 'models/npcs/shrimp.gltf';
                modelScale = 1;
            }
        }
        
        // If no specific model found, skip the popup to avoid crash
        if (modelUri === 'models/items/generic_item.gltf') {
            console.warn(`[TerrainDamageManager] No model defined for loot type: ${lootType}, skipping popup`);
            return;
        }
        
        const playerId = player.id.toString();
        if (!this.activeDisplays.has(playerId)) {
            this.activeDisplays.set(playerId, []);
        }
        const playerDisplays = this.activeDisplays.get(playerId)!;
        
        const lootEntity = new Entity({
            name: `terrainLoot_${lootType}_${Date.now()}`,
            modelUri: modelUri,
            modelScale: modelScale,
            parent: playerEntity,
            modelLoopedAnimations: ['swim'],
            controller: new SimpleEntityController(),
            opacity: 0.99
        });
        
        if (lootType === 'gold_clam') {
            const lightConfigs = [
                { offset: { x: 0, y: 0.5, z: 0.4 }, intensity: 20 },
                { offset: { x: 0.35, y: 0.45, z: -0.2 }, intensity: 20 },
                { offset: { x: -0.35, y: 0.45, z: -0.2 }, intensity: 20 }
            ];

            for (const config of lightConfigs) {
                try {
                    const light = new Light({
                        attachedToEntity: lootEntity,
                        offset: config.offset,
                        color: { r: 255, g: 204, b: 102 }, 
                        intensity: config.intensity,
                        distance: 3, // Slightly reduced range
                    });
                    pointLightInstances.push(light);
                } catch (e) {
                    console.error("[TerrainDamageManager] Error creating Light instance:", e);
                }
            }
        }

        const startPos = { x: 0, y: 1.0, z: 0 };
        const endPos = { x: 0, y: -0.5, z: 0 };
        
        playerDisplays.push(lootEntity);
        lootEntity.spawn(this.world, startPos);

        pointLightInstances.forEach(light => {
            if (this.world) {
                light.spawn(this.world); // Spawn each light
            }
        });
        
        const controller = lootEntity.controller as SimpleEntityController;
        lootEntity.setAngularVelocity({ x: 0, y: Math.PI, z: 0 });
        
        setTimeout(() => {
            const index = playerDisplays.indexOf(lootEntity);
            if (index !== -1) {
                playerDisplays.splice(index, 1);
            }
            lootEntity.despawn();
            pointLightInstances.forEach(light => {
                light.despawn(); // Despawn each light instance
            });
        }, 1000);

        controller.move({ x: 0, y: 5.2, z: 0 }, 0.33);
        setTimeout(() => {
            const downwardMoveDuration = 1.0;
            controller.move(endPos, downwardMoveDuration);
        }, 300);
    }
}