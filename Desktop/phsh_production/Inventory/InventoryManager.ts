import { Player, World, Entity, DefaultPlayerEntityController, Quaternion } from 'hytopia';
import type { InventoryItem, PlayerInventory, ItemType } from './Inventory';
import { FISHING_RODS } from './RodCatalog';
import { PlayerStateManager } from '../PlayerStateManager';
import { FISH_CATALOG, DEFAULT_FISH_DISPLAY_POSITION, DEFAULT_FISH_DISPLAY_ROTATION } from '../Fishing/PhshTwoFIshCatalog';
import { ItemFactory } from './ItemFactory';
import BoatEntity from './BoatEntity';
import { GamePlayerEntity } from '../GamePlayerEntity';

interface OriginalAnimations {
    idleLoopedAnimations: string[];
    walkLoopedAnimations: string[];
    runLoopedAnimations: string[];
    jumpLoopedAnimations?: string[]; // Optional - may not exist on all controllers
}

export class InventoryManager {
    private world: World;
    // REMOVED: private inventories Map - inventory now lives in PlayerState.inventory
    private equippedRodEntities: Map<string, Entity> = new Map();
    private equippedFishEntities: Map<string, Entity> = new Map();
    private currentRodEntity: Map<string, Entity> = new Map();
    private rodOperationInProgress: Map<string, boolean> = new Map(); // Track ongoing operations
    private rodOperationTimeout: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private boatEntities: Map<string, BoatEntity> = new Map();
    private originalAnimations: Map<string, OriginalAnimations> = new Map(); // Store original animations when fish is equipped
    private storedEquippedRod: Map<string, string> = new Map(); // Store equipped rod ID when fish is equipped (to re-equip later)

    // Dock slip coordinates organized by dock area
    private readonly DOCK_SLIPS: Record<string, Array<{ x: number, y: number, z: number }>> = {
        'boat_dock': [
            { x: 35.46, y: 12, z: 51.13 },   // Slip 6
            { x: 35.7, y: 12, z: 59.02 },   // Slip 1 (default)
            { x: 31.64, y: 12, z: 59 },     // Slip 2
            { x: 27.61, y: 12, z: 59 },     // Slip 3
            { x: 27.65, y: 12, z: 50.54 },  // Slip 4
            { x: 31.53, y: 12, z: 51.1 },   // Slip 5
        ],
        'spawn_dock': [
            { x: -97.5, y: 12, z: -48 },    // Dock spawn point 1
            { x: -98.5, y: 12, z: -52.7 },  // Dock spawn point 2
            { x: -91, y: 12, z: -47.75 },   // Dock spawn point 3
            { x: -91, y: 12, z: -54 },      // Dock spawn point 4
            { x: -95, y: 12, z: -52.2 },    // Dock 2 - Fallback position
        ]
    };
    
    private readonly SLIP_RADIUS = 2.5; // Radius to check for boat collision

    constructor(
        world: World,
        private stateManager: PlayerStateManager
    ) {
        this.world = world;
    }

    initializePlayerInventory(player: Player) {
        // CRITICAL: Only initialize if inventory doesn't already exist
        // This prevents overwriting persisted inventory data
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[INVENTORY] No state found for player ${player.id}`);
            return;
        }
        
        if (state.inventory) {
            console.log(`[INVENTORY] Inventory already exists for player ${player.id} - skipping initialization`);
            return;
        }
        
        // Initialize inventory in state
        state.inventory = {
            items: [],
            maxSlots: 20,
            quickSlots: {},
            equippedRod: undefined,
            equippedBait: undefined,
            equippedFish: undefined,
        };
        
        // Send initial inventory state to UI
        this.updateInventoryUI(player);
    }

    isFishEquipped(player: Player, fishItem: InventoryItem): boolean {
        const hasEquippedEntity = this.equippedFishEntities.has(player.id);
        const inventory = this.getInventory(player);
        const isMarkedEquipped = inventory?.items.some(item => 
            item.id === fishItem.id && item.equipped
        ) ?? false;  // Add null coalescing operator
        return hasEquippedEntity && isMarkedEquipped;
    }

    addItem(player: Player, item: InventoryItem): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) {
            console.error(`[Server] No inventory found for player ${player.id}`);
            return false;
        }

     

        // Special handling for starter items - limit to quantity 1
        if (item.id === 'beginner-rod' ) {
            const existingItem = inventory.items.find(i => i.id === item.id);
            if (existingItem) {
                return true; // Don't add duplicate, but return success
            }
            // Force quantity to 1 for starter items
            item.quantity = 1;
        }

        // Check for existing item stack (for non-starter items)
        const existingItem = inventory.items.find(i => i.id === item.id);
        if (existingItem && item.id !== 'beginner-rod') {
            existingItem.quantity += item.quantity;
        } else if (!existingItem) {
            inventory.items.push(item);
        }

        this.updateInventoryUI(player);
        // Auto-save after inventory change
        this.stateManager.save(player);
        return true;
    }

    removeItem(player: Player, itemId: string, quantity: number = 1): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;

        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return false;

        const item = inventory.items[itemIndex];
        const isBait = item.type === 'bait';
        if (item.quantity <= quantity) {
                           // Special bait UI reset if we removed bait
                           if (isBait) {
                            player.ui.sendData({
                                type: "resetBaitHighlights",
                                equipped: item.id
                            });
                        }
            inventory.items.splice(itemIndex, 1);
        } else {
            item.quantity -= quantity;
        }

        this.updateInventoryUI(player);
        // Auto-save after inventory change
        this.stateManager.save(player);
        return true;
    }

    public cleanup(player: Player) {
        // Clear any pending timeouts
        const existingTimeout = this.rodOperationTimeout.get(player.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        this.safeCleanupRodEntity(player);
        this.rodOperationInProgress.delete(player.id);
        this.rodOperationTimeout.delete(player.id);

        // Clean up boat if player has one
        this.unequipBoat(player);
        
        // Restore animations if fish was equipped
        const original = this.originalAnimations.get(player.id);
        if (original) {
            // CRITICAL: Use player's current world, not InventoryManager's world
            const playerEntities = player.world?.entityManager?.getPlayerEntitiesByPlayer(player);
            if (playerEntities && playerEntities.length > 0) {
                const playerEntity = playerEntities[0] as GamePlayerEntity;
                if (playerEntity) {
                    const controller = playerEntity.controller as DefaultPlayerEntityController;
                    controller.idleLoopedAnimations = original.idleLoopedAnimations;
                    controller.walkLoopedAnimations = original.walkLoopedAnimations;
                    controller.runLoopedAnimations = original.runLoopedAnimations;
                    
                    // Restore jump animations if they exist
                    if (original.jumpLoopedAnimations !== undefined && (controller as any).jumpLoopedAnimations !== undefined) {
                        (controller as any).jumpLoopedAnimations = original.jumpLoopedAnimations;
                    }
                }
            }
            this.originalAnimations.delete(player.id);
        }
        
        // Clean up stored rod reference if player disconnects
        this.storedEquippedRod.delete(player.id);

        const inventory = this.getInventory(player);
        if (inventory) {
            // Create a copy of items array since we'll be modifying it during iteration
            const items = [...inventory.items];
            
            // Remove each item individually to trigger UI updates
            items.forEach(item => {
                item.equipped = false;
                this.removeItem(player, item.id, item.quantity);
                
            });
            
            // Force final UI update
            this.updateInventoryUI(player);
        }
    }

    equipItem(player: Player, itemId: string): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) {
            console.error(`[EQUIP_ITEM] No inventory found for player ${player.username}`);
            return false;
        }

        const item = inventory.items.find(i => i.id === itemId);
        if (!item) {
            console.error(`[EQUIP_ITEM] Item ${itemId} not found in inventory for player ${player.username}`);
            return false;
        }
        
        console.log(`[EQUIP_ITEM] Equipping ${item.type} ${itemId} for player ${player.username} in world ${player.world?.id || 'unknown'}`);


        // If clicking an already equipped fish, unequip it
        if (item.type === 'fish' && item.equipped) {
            // unequipItem() will handle all state updates including inventory.equippedFish and item.equipped
            this.unequipItem(player, item.type);
            this.updateInventoryUI(player);
            return true;
        }

        if (item.type === 'fish' ) {
            const fishEntity = this.equippedFishEntities.get(player.id);
            if (fishEntity) {
                fishEntity.despawn();
                this.equippedFishEntities.delete(player.id);
            }
        }

        // Unequip any currently equipped items of the same type
        // Use unequipItem() which handles state updates internally
        const equippedItemsOfType = inventory.items.filter(i => i.type === item.type && i.equipped);
        equippedItemsOfType.forEach(() => {
            this.unequipItem(player, item.type);
        });

        // Handle rod equipment - DON'T await, let it happen in background
        if (item.type === 'rod') {
            
            // If a fish is currently equipped, unequip it first (fish and rod both use hand-right-anchor)
            if (inventory.equippedFish) {
                // Clear stored rod reference since we're equipping a new rod (don't want to re-equip old rod)
                this.storedEquippedRod.delete(player.id);
                // Unequip the fish (this will clean up fish entity and animations, but won't re-equip old rod since we cleared storedEquippedRod)
                this.unequipItem(player, 'fish');
            }
            
            // Equip rod (async, but we don't await it)
            this.equipRod(player, item).catch(error => {
                console.error(`[EQUIP_ITEM] Error equipping rod ${itemId} for player ${player.username}:`, error);
            });
        } else if (item.type === 'fish') {
            // Hide rod entity when equipping fish (rod and fish both use hand-right-anchor)
            // But keep rod equipped in inventory so it shows in hotbar
            if (inventory.equippedRod) {
                const rodIdToStore = inventory.equippedRod; // Store rod ID
                // Store the rod ID so we can re-show it later
                this.storedEquippedRod.set(player.id, rodIdToStore);
                // Hide the rod entity without unequipping it (so it still shows in hotbar)
                this.safeCleanupRodEntity(player);
                // Ensure rod item stays marked as equipped and inventory reference is set
                const rodItem = inventory.items.find(i => i.id === rodIdToStore && i.type === 'rod');
                if (rodItem) {
                    rodItem.equipped = true;
                    inventory.equippedRod = rodIdToStore;
                }
            }
            
            let e = this.displayFish(player, item);
            this.equippedFishEntities.set(player.id, e);
        } else if (item.type === 'bait') {
            this.equipBait(player, item);
        } else if (item.type === 'boat') {
            this.equipBoat(player, item);
            // Boats are spawned entities, not equipped items - don't mark as equipped
            // The boat spawning functionality is handled by equipBoat(), but boats shouldn't show as "equipped" in inventory
            this.updateInventoryUI(player);
            return true;
        }

        // Equip the new item - update both item state and inventory references
        item.equipped = true;

        // Update equipped item references in inventory
        if (item.type === 'rod') {
            inventory.equippedRod = itemId;
        } else if (item.type === 'bait') {
            inventory.equippedBait = itemId;
            this.hookBait(player, itemId);
        } else if (item.type === 'fish') {
            inventory.equippedFish = itemId;
        }   
        this.updateInventoryUI(player);
        // Auto-save after inventory change
        this.stateManager.save(player);
        return true;
    }

    equipBait(player: Player, item: InventoryItem){
        this.hookBait(player, item.id);
    }

    private async equipRod(player: Player, item: InventoryItem): Promise<boolean> {
        
        // Prevent concurrent rod operations
        if (this.rodOperationInProgress.get(player.id)) {
            return false;
        }

        try {
            this.rodOperationInProgress.set(player.id, true);

            // Clear any pending timeouts
            const existingTimeout = this.rodOperationTimeout.get(player.id);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Clean up existing rod with verification
            await this.safeCleanupRodEntity(player);

            
            // CRITICAL: Get player entity from the player's current world, not InventoryManager's world
            // When switching regions, the player is in a different world than InventoryManager.world
            const playerEntities = player.world?.entityManager?.getPlayerEntitiesByPlayer(player);
            if (!playerEntities || playerEntities.length === 0) {
                console.error(`[ROD_EQUIP] No player entity found for ${player.username} in world ${player.world?.id || 'unknown'}`);
                throw new Error('Player entity not found');
            }
            
            const rodEntity = new Entity({
                name: 'fishingRod',
                tag: 'fishingRod',
                modelUri: `models/items/${item.modelId}.gltf`,
                parent: playerEntities[0],
                parentNodeName: 'hand-right-anchor',
                modelScale: item.metadata.rodStats?.scale ?? 1,
            });

            // Verify entity creation was successful
            if (!rodEntity) {
                console.error(`[ROD_EQUIP] Failed to create rod entity for ${player.username}`);
                throw new Error('Failed to create rod entity');
            }

            var rotation = { x: -0.326834, y: -0.05, z: 0, w: 0.9238795 };

            // Position offset for iron, gold, and mithril rods to fix grip position
            let position = { x: 0, y: 0, z: 0 };
            if (item.id === 'iron_rod' || item.id === 'gold_rod' || item.id === 'mithril_rod' ) {
                position = { x: 0, y: -0.15, z: 0.35 }; // Move up to fist position (was -0.1, now -0.15 to move further up)
            } else if (item.id === 'deepcaster_rod' || item.id === 'ivory_rod') {
                position = { x: 0, y: -0.05, z: 0.20 }; // Match deepcaster rod position
            } else if (item.id === 'light_rod') {
                position = { x: 0, y: -0.1, z: 0.00 }; // Move up slightly to fix grip
            } else if (item.id === 'oak_rod') {
                position = { x: 0, y: 0.0, z: 0.10 };
            } else if (item.id === 'zephyr_rod' || item.id === 'keystone_rod') {
                position = { x: 0, y: -0.0, z: 0.15 }; // Moved up from -0.2 to -0.1
            }

            // CRITICAL: Spawn rod in the player's current world, not InventoryManager's world
            const playerWorld = player.world;
            if (!playerWorld) {
                console.error(`[ROD_EQUIP] Player ${player.username} has no world`);
                throw new Error('Player has no world');
            }
            
            await rodEntity.spawn(playerWorld, position, rotation);
            
            // Set a timeout to clear the operation lock
            const timeout = setTimeout(() => {
                this.rodOperationInProgress.set(player.id, false);
                this.rodOperationTimeout.delete(player.id);
            }, 300); // Reduced timeout for more responsive switching

            this.rodOperationTimeout.set(player.id, timeout);
            this.currentRodEntity.set(player.id, rodEntity);

            return true;
        } catch (error) {
            console.error(`[ROD_EQUIP] Error during rod equipment for ${player.username}:`, error);
            this.rodOperationInProgress.set(player.id, false);
            return false;
        }
    }

    private async safeCleanupRodEntity(player: Player): Promise<void> {
        try {
            const existingRod = this.currentRodEntity.get(player.id);
            if (existingRod) {
                // CRITICAL: Check if rod exists in player's current world, not InventoryManager's world
                const playerWorld = player.world;
                if (existingRod.id && playerWorld?.entityManager?.getEntity(existingRod.id)) {
                    await existingRod.despawn();
                } else {
                    // Rod entity doesn't exist in player's world, just clear the reference
                }
            } 
            this.currentRodEntity.delete(player.id);
        } catch (error) {
            console.error(`[ROD_CLEANUP] Error during rod cleanup for ${player.username}:`, error);
            // Force cleanup of references even if despawn fails
            this.currentRodEntity.delete(player.id);
        }
    }

    getEquippedFish(player: Player): InventoryItem | null {
        const hasEquippedEntity = this.equippedFishEntities.has(player.id);
        if (!hasEquippedEntity) return null;

        const inventory = this.getInventory(player);
        return inventory?.items.find(item => item.equipped && item.type === 'fish') || null;
    }

    hookBait(player: Player, itemId: string): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;
        const item = inventory.items.find(i => i.id === itemId);
        if (!item || !item.metadata.fishStats) return false;
        this.updateInventoryUI(player);
        return true;
    }

    checkBait(player: Player): {hasBait: boolean, item: InventoryItem | null} {
        const inventory = this.getInventory(player);
        if (!inventory) return {hasBait: false, item: null};
        for (const item of inventory.items) {
            if (item.type === 'bait' && item.equipped) {
                return {hasBait: true, item: item};
            }
        }
        return {hasBait: false, item: null};
    }

    displayFish(player: Player, item: InventoryItem): Entity {
        // CRITICAL: Use player's current world, not InventoryManager's world
        const playerEntities = player.world?.entityManager?.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            throw new Error(`[InventoryManager] No player entity found for ${player.id} in world ${player.world?.id || 'unknown'}`);
        }
        const playerEntity = playerEntities[0] as GamePlayerEntity;
        const controller = playerEntity.controller as DefaultPlayerEntityController;
        
        // Store original animations if not already stored (in case of re-equipping)
        if (!this.originalAnimations.has(player.id)) {
            this.originalAnimations.set(player.id, {
                idleLoopedAnimations: [...(controller.idleLoopedAnimations || [])],
                walkLoopedAnimations: [...(controller.walkLoopedAnimations || [])],
                runLoopedAnimations: [...(controller.runLoopedAnimations || [])],
                jumpLoopedAnimations: (controller as any).jumpLoopedAnimations ? [...((controller as any).jumpLoopedAnimations || [])] : undefined
            });
        }
        
        // Update controller animations to include carry-upper with lower body animations
        // This allows carry-upper to play alongside walk_lower, run_lower, idle_lower
        const original = this.originalAnimations.get(player.id)!;
        
        // Filter out upper body animations (anything with 'upper' in the name)
        // Keep all other animations (lower body, or animations without upper/lower designation)
        const filterUpperBody = (animations: string[]) => 
            animations.filter(anim => !anim.includes('upper') && anim !== 'carry-upper');
        
        const lowerBodyIdle = filterUpperBody(original.idleLoopedAnimations);
        const lowerBodyWalk = filterUpperBody(original.walkLoopedAnimations);
        const lowerBodyRun = filterUpperBody(original.runLoopedAnimations);
        const lowerBodyJump = original.jumpLoopedAnimations ? filterUpperBody(original.jumpLoopedAnimations) : undefined;
        
        // Set animations: carry-upper + lower body animations
        // carry-upper will blend with lower body animations since they affect different model nodes
        controller.idleLoopedAnimations = ['carry-upper', ...lowerBodyIdle];
        controller.walkLoopedAnimations = ['carry-upper', ...lowerBodyWalk];
        controller.runLoopedAnimations = ['carry-upper', ...lowerBodyRun];
        
        // Handle jump animations if they exist
        if (lowerBodyJump !== undefined && (controller as any).jumpLoopedAnimations !== undefined) {
            (controller as any).jumpLoopedAnimations = ['carry-upper', ...lowerBodyJump];
        }
        
        // Find fish data from catalog first
        const fishData = FISH_CATALOG.find(f => f.name === item.name);
        if (!fishData) {
            console.error(`[InventoryManager] Fish data not found for: ${item.name}`);
            return new Entity({
                name: 'displayFish',
                modelUri: 'models/npcs/goldfish.gltf', // Fallback
                modelScale: 1,
                modelLoopedAnimations: ['swim'], // Default animation for fallback
                parent: playerEntity,
                parentNodeName: 'hand-right-anchor',
            });
        }
        
        if (!item.metadata?.fishStats) {
            console.error(`[InventoryManager] No fish stats for: ${item.name}`);
            const fallbackAnimation = fishData.modelData.animation || 'swim';
            return new Entity({
                name: 'displayFish',
                modelUri: fishData.modelData.modelUri,
                modelScale: fishData.modelData.baseScale,
                modelLoopedAnimations: [fallbackAnimation],
                parent: playerEntity,
                parentNodeName: 'hand-right-anchor',
            });
        }
        
        // Calculate display scale using weight
        const fishStats = item.metadata.fishStats;
        const displayWeight = fishStats.weight || 0;
        const weightRatio = (displayWeight - fishData.minWeight) / (fishData.maxWeight - fishData.minWeight);
        const scaleMultiplier = fishData.modelData.baseScale + 
            (weightRatio * (fishData.modelData.maxScale - fishData.modelData.baseScale));
        
        // Use modelUri from catalog, not item.modelId
        // Use animation from catalog if specified, otherwise default to 'swim'
        const fishAnimation = fishData.modelData.animation || 'swim';
        const displayEntity = new Entity({
            name: 'displayFish',
            modelUri: fishData.modelData.modelUri, // Use full path from catalog
            modelScale: scaleMultiplier,
            modelLoopedAnimations: [fishAnimation],
            parent: playerEntity,
            parentNodeName: 'hand-right-anchor', // Anchor to right hand like the fishing rod
        });
        
        // Get display position and rotation from fish catalog, or use defaults
        const position = fishData.displayPosition || DEFAULT_FISH_DISPLAY_POSITION;
        const rotation = fishData.displayRotation || DEFAULT_FISH_DISPLAY_ROTATION;
        displayEntity.spawn(this.world, position, rotation);
        
        // Remove spinning animation - fish should be held still
        // displayEntity.setAngularVelocity({ x: 0, y: Math.PI / 1.5, z: 0 }); // REMOVED
        
        this.equippedFishEntities.set(player.id, displayEntity);
        return displayEntity;
    }

    useBait(player: Player, itemId: string): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;

        const item = inventory.items.find(i => i.id === itemId);
        if (!item) return false;

        this.removeItem(player, itemId, 1); 
        this.updateInventoryUI(player);
        return true;
    }

    unequipItem(player: Player, type: string): boolean {
        
        // Prevent unequip if operation in progress
        if (type === 'rod' && this.rodOperationInProgress.get(player.id)) {
            return false;
        }

        const inventory = this.getInventory(player);
        if (!inventory) {
            console.error(`[UNEQUIP_ITEM] No inventory found for player ${player.username}`);
            return false;
        }

        const equippedItem = inventory.items.find(item => item.type === type && item.equipped);
        if (equippedItem) {
            // Update item state
            equippedItem.equipped = false;
            
            // Clear equipped references in inventory
            if (type === 'rod') {
                inventory.equippedRod = undefined;
                this.safeCleanupRodEntity(player);
                
                // If rod was unequipped while fish is equipped, clear the stored rod reference
                // (player manually unequipped the rod, so we shouldn't re-equip it)
                if (this.storedEquippedRod.has(player.id)) {
                    this.storedEquippedRod.delete(player.id);
                }
            } else if (type === 'bait') {
                inventory.equippedBait = undefined;
            } else if (type === 'fish') {
                inventory.equippedFish = undefined;
                const fishEntity = this.equippedFishEntities.get(player.id);
                if (fishEntity) {
                    fishEntity.despawn();
                    this.equippedFishEntities.delete(player.id);
                }
                
                // Restore original animations when fish is unequipped
                const original = this.originalAnimations.get(player.id);
                if (original) {
                    // CRITICAL: Use player's current world, not InventoryManager's world
                    const playerEntities = player.world?.entityManager?.getPlayerEntitiesByPlayer(player);
                    if (playerEntities && playerEntities.length > 0) {
                        const playerEntity = playerEntities[0] as GamePlayerEntity;
                        if (playerEntity) {
                            const controller = playerEntity.controller as DefaultPlayerEntityController;
                            
                            controller.idleLoopedAnimations = original.idleLoopedAnimations;
                            controller.walkLoopedAnimations = original.walkLoopedAnimations;
                            controller.runLoopedAnimations = original.runLoopedAnimations;
                            
                            // Restore jump animations if they exist
                            if (original.jumpLoopedAnimations !== undefined && (controller as any).jumpLoopedAnimations !== undefined) {
                                (controller as any).jumpLoopedAnimations = original.jumpLoopedAnimations;
                            }
                        }
                    }
                    
                    // Clean up stored animations
                    this.originalAnimations.delete(player.id);
                }
                
                // Re-equip the stored rod if one was equipped before fish
                const storedRodId = this.storedEquippedRod.get(player.id);
                if (storedRodId) {
                    // Check if the rod still exists in inventory before re-equipping
                    const rodItem = inventory.items.find(i => i.id === storedRodId && i.type === 'rod');
                    if (rodItem) {
                        this.equipItem(player, storedRodId);
                    } 
                    // Clean up stored rod reference
                    this.storedEquippedRod.delete(player.id);
                }
            }

            this.updateInventoryUI(player);
            // Auto-save after inventory change
            this.stateManager.save(player);
            return true;
        }
        return false;
    }

    getInventory(player: Player): PlayerInventory | undefined {
        // Get inventory from PlayerState instead of internal Map
        return this.stateManager.getInventory(player);
    }

    updateInventoryUI(player: Player) {
        const inventory = this.getInventory(player);
        if (!inventory) return;

        // Ensure all items have valid quantities
        inventory.items = inventory.items.filter(item => item.quantity > 0);

        // Send the updated inventory to the UI
        player.ui.sendData({
            type: "inventoryUpdate",
            inventory: {
                ...inventory,
                items: inventory.items.map(item => ({
                    ...item,
                    quantity: item.quantity || 1 // Ensure quantity is at least 1
                }))
            }
        });
    }

    setEquippedRodEntity(player: Player, entity: Entity) {
        this.equippedRodEntities.set(player.id, entity);
    }

    getEquippedRod(player: Player) {
        const inventory = this.getInventory(player);
        return inventory?.items.find(item => 
            item.type === 'rod' && item.equipped
        );
    }

    public addRodById(player: Player, rodId: string) {
        const rod = FISHING_RODS.find(r => r.id === rodId);
        if (rod) {
            this.addItem(player, rod);
        } else {
            console.warn(`Rod with id ${rodId} not found`);
        }
    }

    // Helper method to check rod entity state
    isRodEntityValid(player: Player): boolean {
        const rodEntity = this.currentRodEntity.get(player.id);
        return !!(rodEntity?.id && this.world.entityManager.getEntity(rodEntity.id));
    }

    public hasItem(player: Player, itemId: string): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;
        return inventory.items.some(item => item.id === itemId && item.quantity > 0);
    }

    /**
     * Unequip all rods for a player
     * Helper method to avoid direct state manipulation
     */
    public unequipAllRods(player: Player): void {
        const inventory = this.getInventory(player);
        if (!inventory) return;
        
        // Find all equipped rods
        const equippedRods = inventory.items.filter(item => item.type === 'rod' && item.equipped);
        equippedRods.forEach(() => {
            this.unequipItem(player, 'rod');
        });
    }

    /**
     * Unequip all bait for a player
     * Helper method to avoid direct state manipulation
     */
    public unequipAllBait(player: Player): void {
        const inventory = this.getInventory(player);
        if (!inventory) return;
        
        // Find all equipped bait
        const equippedBait = inventory.items.filter(item => item.type === 'bait' && item.equipped);
        equippedBait.forEach(() => {
            this.unequipItem(player, 'bait');
        });
    }

    /**
     * Count the number of fish in a player's inventory
     * @param player The player to count fish for
     * @returns The total number of fish in inventory
     */
    public getFishCount(player: Player): number {
        const inventory = this.getInventory(player);
        if (!inventory) return 0;
        
        return inventory.items.filter(item => item.type === 'fish').length;
    }

    /**
     * Check if player has reached the catch limit
     * @param player The player to check
     * @returns true if at or over the catch limit
     */
    public isCatchLimitReached(player: Player): boolean {
        const CATCH_LIMIT = 18;
        return this.getFishCount(player) >= CATCH_LIMIT;
    }

    /**
     * Apply damage to a fishing rod
     * @param player The player who owns the rod
     * @param rodId The ID of the rod to damage
     * @param damageAmount Amount of damage to apply (defaults to rod's damage stat)
     * @returns true if successful, false otherwise
     */
    applyRodDamage(player: Player, rodId: string, damageAmount?: number, playerStateManager?: PlayerStateManager): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;

        const rod = inventory.items.find(item => item.id === rodId && item.type === 'rod');
        if (!rod) return false;

        // Get rod stats
        const rodStats = rod.metadata?.rodStats;
        if (!rodStats) return false;

        // Initialize health if not present
        if (rodStats.health === undefined) {
            rodStats.health = 100; // Default health
        }

        // Use rod's own damage stat if no amount specified
        const damage = damageAmount ?? rodStats.damage ?? 1;
        
        // Apply damage
        rodStats.health = Math.max(0, rodStats.health - damage);
        
        // Check if rod is broken
        if (rodStats.health <= 0) {
            // Rod is broken - remove it from inventory
            this.unequipItem(player, 'rod');
            this.removeItem(player, rodId);
            
            // Notify player
            player.ui.sendData({
                type: 'gameMessage',
                message: `Your ${rod.name} has broken!`
            });
            
            return true;
        }
        
        // Update UI if health is low
        if (rodStats.health <= 20) {
            playerStateManager?.sendGameMessage(player, `Your ${rod.name} is badly damaged (${rodStats.health}% health remaining)!`);
        } else if (rodStats.health <= 50) {
            playerStateManager?.sendGameMessage(player, `Your ${rod.name} is showing signs of wear (${rodStats.health}% health remaining).`);
        }
        
        // Update inventory UI
        this.updateInventoryUI(player);
        
        return true;
    }


    loadInventory(player: Player, inventory: any) {
        console.log(`[INVENTORY] Loading inventory for player ${player.id}`, {
            hasInventory: !!inventory,
            hasItems: !!inventory?.items,
            itemCount: inventory?.items?.length || 0
        });
        
        // Get state - inventory now lives in state
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[INVENTORY] No state found for player ${player.id}`);
            return;
        }
        
        // Check if inventory has the expected structure
        if (!inventory || !inventory.items) {
            console.warn(`[INVENTORY] Missing or invalid inventory data for player ${player.id} - creating empty inventory structure`);
            // Still create inventory structure, but log the issue
            inventory = inventory || {};
            inventory.items = inventory.items || [];
        }
        
        // Load inventory directly into state.inventory
        state.inventory = {
            items: JSON.parse(JSON.stringify(inventory.items)),
            maxSlots: inventory.maxSlots || 20,  // Restore saved maxSlots or default to 20
            quickSlots: inventory.quickSlots || {},  // Restore saved quickSlots or default to empty object
            // Restore equipped item references from saved data
            equippedBait: inventory.equippedBait,
            equippedFish: inventory.equippedFish,
            equippedRod: inventory.equippedRod,
        };
        
        // Restore equipped status for items that were equipped
        // Find and mark items as equipped based on saved equipped references
        if (state.inventory.equippedRod) {
            const rodItem = state.inventory.items.find(item => item.id === state.inventory.equippedRod);
            if (rodItem) {
                rodItem.equipped = true;
            } else {
                console.warn(`[INVENTORY] Equipped rod ${state.inventory.equippedRod} not found in items, clearing equipped reference`);
                state.inventory.equippedRod = undefined;
            }
        }
        if (state.inventory.equippedBait) {
            const baitItem = state.inventory.items.find(item => item.id === state.inventory.equippedBait);
            if (baitItem) {
                baitItem.equipped = true;
            } else {
                console.warn(`[INVENTORY] Equipped bait ${state.inventory.equippedBait} not found in items, clearing equipped reference`);
                state.inventory.equippedBait = undefined;
            }
        }
        if (state.inventory.equippedFish) {
            const fishItem = state.inventory.items.find(item => item.id === state.inventory.equippedFish);
            if (fishItem) {
                fishItem.equipped = true;
            } else {
                console.warn(`[INVENTORY] Equipped fish ${state.inventory.equippedFish} not found in items, clearing equipped reference`);
                state.inventory.equippedFish = undefined;
            }
        }
        
        console.log(`[INVENTORY] Successfully loaded inventory for player ${player.id} (${state.inventory.items.length} items)`);
        
        // Update UI
        this.updateInventoryUI(player);
    }

    private equipBoat(player: Player, item: InventoryItem, dockArea: 'boat_dock' | 'spawn_dock' = 'boat_dock'): void {
        console.log(`[InventoryManager] equipBoat called for player ${player.id} at dock ${dockArea}`);
        
        // Cleanup any existing boat
        this.unequipBoat(player);
        
        // Create new boat
        const inventory = this.getInventory(player);
        if (!inventory) {
            console.error(`[InventoryManager] No inventory found for player ${player.id}`);
            return;
        }
        const playerBoatItem = inventory.items.find(item => item.type === 'boat');
        if (!playerBoatItem) {
            console.error(`[InventoryManager] No boat item found in inventory for player ${player.id}`);
            return;
        }
        
        console.log(`[InventoryManager] Found boat item for player ${player.id}, searching for available slip at ${dockArea}`);
        
        // Find an available slip (prefer specified dock, fallback to other dock)
        const availableSlip = this.findAvailableSlip(dockArea);
        if (!availableSlip) {
            console.warn(`[InventoryManager] No available slip found for player ${player.id} at dock ${dockArea}`);
            // Send message to player about dock being full
            player.ui.sendData({
                type: 'gameMessage',
                message: 'The dock is full! Please try again later.'
            });
            return;
        }
        
        console.log(`[InventoryManager] Found available slip at ${availableSlip.x}, ${availableSlip.y}, ${availableSlip.z} for player ${player.id}`);
        
        const boat = new BoatEntity();
        boat.ownerBoatKey = playerBoatItem.metadata.boatStats?.key;
        console.log(`[InventoryManager] Spawning boat at ${availableSlip.x}, ${availableSlip.y}, ${availableSlip.z} for player ${player.id}`);
        boat.spawn(this.world, availableSlip);
        this.boatEntities.set(player.id, boat);
        
        // Wait a tick to verify boat is visible
        setTimeout(() => {
            if (boat.isSpawned) {
                console.log(`[InventoryManager] Boat successfully spawned for player ${player.id} at position ${boat.position.x}, ${boat.position.y}, ${boat.position.z}`);
            } else {
                console.error(`[InventoryManager] Boat failed to spawn properly for player ${player.id}`);
            }
        }, 100);
    }

    /**
     * Public method to equip boat at specific dock area
     */
    public equipBoatAtDock(player: Player, item: InventoryItem, dockArea: 'boat_dock' | 'spawn_dock' = 'boat_dock'): boolean {
        try {
            this.equipBoat(player, item, dockArea);
            return true;
        } catch (error) {
            console.error(`[InventoryManager] Error equipping boat at dock ${dockArea} for player ${player.id}:`, error);
            return false;
        }
    }

    /**
     * Find the first available dock slip by checking for nearby boats
     * Checks preferred dock first, then falls back to other dock if full
     */
    private findAvailableSlip(preferredDock: 'boat_dock' | 'spawn_dock' = 'boat_dock'): { x: number, y: number, z: number } | null {
        console.log(`[InventoryManager] findAvailableSlip: Checking dock ${preferredDock}`);
        
        // Get all boat entities currently spawned
        const allBoats = this.world.entityManager.getEntitiesByTag('boat');
        console.log(`[InventoryManager] Found ${allBoats.length} existing boats`);
        
        // Check preferred dock first
        const preferredSlips = this.DOCK_SLIPS[preferredDock];
        console.log(`[InventoryManager] Checking ${preferredSlips.length} slips at ${preferredDock}`);
        
        for (const slip of preferredSlips) {
            const isOccupied = allBoats.some(boat => {
                if (!boat.isSpawned) return false;
                
                const distance = this.calculateDistance(boat.position, slip);
                const occupied = distance <= this.SLIP_RADIUS;
                
                if (occupied) {
                    console.log(`[InventoryManager] Slip at ${slip.x}, ${slip.y}, ${slip.z} is occupied (boat at ${boat.position.x}, ${boat.position.y}, ${boat.position.z}, distance=${distance.toFixed(2)})`);
                }
                
                return occupied;
            });
            
            if (!isOccupied) {
                console.log(`[InventoryManager] Found available slip at ${slip.x}, ${slip.y}, ${slip.z} in ${preferredDock}`);
                return slip;
            }
        }
        
        // If preferred dock is full, check the other dock as fallback
        const fallbackDock = preferredDock === 'boat_dock' ? 'spawn_dock' : 'boat_dock';
        const fallbackSlips = this.DOCK_SLIPS[fallbackDock];
        console.log(`[InventoryManager] Preferred dock full, checking fallback dock ${fallbackDock} with ${fallbackSlips.length} slips`);
        
        for (const slip of fallbackSlips) {
            const isOccupied = allBoats.some(boat => {
                if (!boat.isSpawned) return false;
                
                const distance = this.calculateDistance(boat.position, slip);
                const occupied = distance <= this.SLIP_RADIUS;
                
                return occupied;
            });
            
            if (!isOccupied) {
                console.log(`[InventoryManager] Found available slip at ${slip.x}, ${slip.y}, ${slip.z} in fallback dock ${fallbackDock}`);
                return slip;
            }
        }
        
        console.warn(`[InventoryManager] All slips are occupied at both docks`);
        return null; // All slips are occupied
    }

    /**
     * Calculate 3D distance between two positions
     */
    private calculateDistance(pos1: { x: number, y: number, z: number }, pos2: { x: number, y: number, z: number }): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private unequipBoat(player: Player): void {
        const existingBoat = this.boatEntities.get(player.id);
        if (existingBoat) {
            
            // If player is mounted in the boat, dismount them first
            if (existingBoat.driver) {
                existingBoat.dismountPlayer();
            }
            
            // Only despawn if the boat is actually spawned
            if (existingBoat.isSpawned) {
                existingBoat.despawn();
            } else {
            }
            this.boatEntities.delete(player.id);
        }
    }



}