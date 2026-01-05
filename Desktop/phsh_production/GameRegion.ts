import {
  Audio,
  Collider,
  ColliderShape,
  CollisionGroup,
  BlockType,
  Entity,
  Player,
  PlayerEvent,
  World,
  WorldManager,
  WorldOptions,
  Vector3Like,
  Quaternion,
  RgbColor,
} from 'hytopia';

import { GamePlayerEntity } from './GamePlayerEntity';
import { PlayerStateManager } from './PlayerStateManager';
import { LevelingSystem } from './LevelingSystem';
import { InventoryManager } from './Inventory/InventoryManager';
import { FishingMiniGame } from './Fishing/FishingMiniGame';
import { NpcManager } from './npcs/NpcManager';
import { BaitBlockManager } from './Bait/BaitBlockManager';
import { CurrencyManager } from './CurrencyManager';
import { CraftingManager } from './Crafting/CraftingManager';
import { MyPlayerController } from './MyPlayerController';
import { MessageManager } from './MessageManager';
import { FishSpawnManager } from './Fishing/FishSpawnManager';
import { HotspotManager } from './Fishing/FishingHotspots';
import GameClock from './GameClock';

export type GameRegionOptions = {
  id: string;
  name: string;
  ambientAudioUri?: string;
  ambientAudioVolume?: number;
  spawnPoint?: Vector3Like;
  spawnFacingAngle?: number;
  skyboxUri?: string;
  fogColor?: RgbColor;
  existingWorld?: World; // Optional: use existing world instead of creating new one
  map?: any; // Optional: map JSON data to load (passed to WorldOptions, like Frontiers)
} & Omit<WorldOptions, 'id' | 'name'>;

export default class GameRegion {
  private _id: string;
  private _name: string;
  private _ambientAudio: Audio | undefined;
  private _baseFogColor: RgbColor | undefined;
  private _isSetup: boolean = false;
  private _playerCount: number = 0;
  private _spawnFacingAngle: number;
  private _spawnPoint: Vector3Like;
  private _world: World;
  private _isExistingWorld: boolean; // Track if this is an existing world

  // Dependencies needed for creating GamePlayerEntity
  private _stateManager: PlayerStateManager | null = null;
  private _levelingSystem: LevelingSystem | null = null;
  private _inventoryManager: InventoryManager | null = null;
  private _fishingMiniGame: FishingMiniGame | null = null;
  private _npcManager: NpcManager | null = null;
  private _baitBlockManager: BaitBlockManager | null = null;
  private _currencyManager: CurrencyManager | null = null;
  private _craftingManager: CraftingManager | null = null;
  private _worldForManagers: World | null = null; // Reference to world for managers

  public constructor(options: GameRegionOptions) {
    const { id, name, ...regionOptions } = options;

    this._id = id;
    this._name = name;
    this._spawnPoint = regionOptions.spawnPoint ?? { x: 0, y: 10, z: 0 };
    this._spawnFacingAngle = regionOptions.spawnFacingAngle ?? 0;

    // Setup ambient audio
    if (regionOptions.ambientAudioUri) {
      this._ambientAudio = new Audio({
        uri: regionOptions.ambientAudioUri,
        volume: regionOptions.ambientAudioVolume ?? 0.05,
        loop: true,
      });
    }

    this._baseFogColor = regionOptions.fogColor;

    // Use existing world if provided, otherwise create new one
    if (regionOptions.existingWorld) {
      this._world = regionOptions.existingWorld;
      this._isExistingWorld = true;
      // Don't stop existing world - it may already be running
    } else {
      this._isExistingWorld = false;
      // Create new world
      this._world = WorldManager.instance.createWorld({
        name: name,
        skyboxUri: regionOptions.skyboxUri,
        fogColor: regionOptions.fogColor,
        ...regionOptions,
      });
      // Keep new world stopped until players join
      this._world.stop();
    }

    // Setup event handlers
    this._world.on(PlayerEvent.JOINED_WORLD, ({ player }) => this.onPlayerJoin(player));
    this._world.on(PlayerEvent.LEFT_WORLD, ({ player }) => this.onPlayerLeave(player));
    this._world.on(PlayerEvent.RECONNECTED_WORLD, ({ player }) => this.onPlayerReconnected(player));

    this.setup();
  }

  public get id(): string { return this._id; }
  public get name(): string { return this._name; }
  public get world(): World { return this._world; }
  public get spawnPoint(): Vector3Like { return this._spawnPoint; }
  public get spawnFacingAngle(): number { return this._spawnFacingAngle; }
  public get baseFogColor(): RgbColor | undefined { return this._baseFogColor; }

  /**
   * Set dependencies needed for creating GamePlayerEntity instances.
   * Must be called before players can join this region.
   */
  public setDependencies(
    stateManager: PlayerStateManager,
    levelingSystem: LevelingSystem,
    inventoryManager: InventoryManager,
    fishingMiniGame: FishingMiniGame,
    npcManager: NpcManager,
    baitBlockManager: BaitBlockManager,
    currencyManager: CurrencyManager,
    craftingManager: CraftingManager,
    worldForManagers: World
  ): void {
    this._stateManager = stateManager;
    this._levelingSystem = levelingSystem;
    this._inventoryManager = inventoryManager;
    this._fishingMiniGame = fishingMiniGame;
    this._npcManager = npcManager;
    this._baitBlockManager = baitBlockManager;
    this._currencyManager = currencyManager;
    this._craftingManager = craftingManager;
    this._worldForManagers = worldForManagers;
  }

  protected setup(): void {
    if (this._isSetup) {
      console.warn(`[GameRegion] ${this._name} already setup.`);
      return;
    }

    // Map is loaded automatically by WorldManager.instance.createWorld() when passed in options
    // (like Frontiers does - no manual loadMap call needed)

    // Play ambient audio if configured
    if (this._ambientAudio) {
      this._ambientAudio.play(this._world);
    }

    // Out of world collider - kills players who fall out of bounds
    new Collider({
      shape: ColliderShape.BLOCK,
      collisionGroups: {
        belongsTo: [CollisionGroup.ALL],
        collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER],
      },
      halfExtents: { x: 500, y: 32, z: 500 },
      isSensor: true,
      relativePosition: { x: 0, y: -64, z: 0 },
      onCollision: (other, started) => {
        if (started && other instanceof GamePlayerEntity) {
          // Teleport back to spawn and kill player
          other.setPosition(this._spawnPoint);
          // Note: You may want to implement takeDamage on GamePlayerEntity
          // For now, just teleport them back
        } else if (started && other instanceof Entity) {
          other.despawn();
        }
      },
      simulation: this._world.simulation,
    });

    this._isSetup = true;
  }

  protected onPlayerJoin(player: Player): void {
    if (!this._stateManager || !this._levelingSystem || !this._inventoryManager || 
        !this._fishingMiniGame || !this._npcManager || !this._baitBlockManager ||
        !this._currencyManager || !this._craftingManager) {
      console.error(`[GameRegion] Dependencies not set for region ${this._id}. Cannot spawn player.`);
      return;
    }

    // Initialize player state if needed
    this._stateManager.initializePlayer(player);

    // Set current region in state
    this._stateManager.setCurrentRegionId(player, this._id);

    // Get saved spawn point (from portal) or use region default
    const savedSpawnPoint = this._stateManager.getCurrentRegionSpawnPoint(player);
    const savedFacingAngle = this._stateManager.getCurrentRegionSpawnFacingAngle(player);

    // Validate saved spawn point - if it's the old default (0, 10, 0) for cave, ignore it
    let spawnPoint = this._spawnPoint;
    let spawnFacingAngle = this._spawnFacingAngle;
    
    if (savedSpawnPoint) {
      // Check if saved spawn point is the old default for cave region
      const isOldDefault = this._id === 'ancient-cave-1' && 
                           savedSpawnPoint.x === 0 && 
                           savedSpawnPoint.y === 10 && 
                           savedSpawnPoint.z === 0;
      
      if (!isOldDefault) {
        // Use saved spawn point if it's not the old default
        spawnPoint = savedSpawnPoint;
        if (savedFacingAngle !== undefined) {
          spawnFacingAngle = savedFacingAngle;
        }
        console.log(`[GameRegion] Using saved spawn point: (${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z})`);
      } else {
        console.log(`[GameRegion] Ignoring old default spawn point (0, 10, 0), using region default: (${this._spawnPoint.x}, ${this._spawnPoint.y}, ${this._spawnPoint.z})`);
        // Clear the old saved spawn point
        this._stateManager.setCurrentRegionSpawnPoint(player, undefined);
        this._stateManager.setCurrentRegionSpawnFacingAngle(player, undefined);
      }
    }

    // Create player controller - use the region's world, not the main world
    // The controller needs to be in the same world as the player entity
    const myController = new MyPlayerController(this._world, this._stateManager);

    // Create player entity
    const playerEntity = new GamePlayerEntity(
      player,
      this._world,
      this._levelingSystem,
      this._stateManager,
      this._inventoryManager,
      this._fishingMiniGame,
      this._npcManager,
      this._baitBlockManager,
      this._currencyManager,
      this._craftingManager,
      myController
    );

    // For main world (big-island), use findValidSpawnPoint for better spawn distribution
    let finalSpawnPoint = spawnPoint;
    if (this._id === 'big-island') {
      const validSpawnPoint = playerEntity.findValidSpawnPoint(this._world);
      if (validSpawnPoint) {
        finalSpawnPoint = validSpawnPoint;
        
        // Calculate facing angle towards Greeter NPC (central square)
        const greeterPos = { x: -89.5, y: 16.76, z: 36.47 };
        const dx = greeterPos.x - finalSpawnPoint.x;
        const dz = greeterPos.z - finalSpawnPoint.z;
        const calculatedFacingAngle = Math.atan2(dx, dz) * (180 / Math.PI);
        spawnFacingAngle = calculatedFacingAngle;
        
        // Set camera to look at Greeter
        player.camera.lookAtPosition(greeterPos);
      }
    }

    // Log spawn information for debugging
    console.log(`[GameRegion] Spawning player in region ${this._id} at (${finalSpawnPoint.x}, ${finalSpawnPoint.y}, ${finalSpawnPoint.z}), facing ${spawnFacingAngle}°`);
    
    // Spawn player
    playerEntity.spawn(this._world, finalSpawnPoint);
    
    // Set facing direction
    const quaternion = Quaternion.fromEuler(0, spawnFacingAngle, 0);
    playerEntity.setRotation(quaternion);

    // Set camera to look in facing direction (if not already set for main world)
    if (this._id !== 'big-island') {
      const facingAngleRad = spawnFacingAngle * Math.PI / 180;
      player.camera.lookAtPosition({
        x: finalSpawnPoint.x - Math.sin(facingAngleRad),
        y: finalSpawnPoint.y,
        z: finalSpawnPoint.z - Math.cos(facingAngleRad),
      });
    }

    // CRITICAL: Re-equip items after player is spawned (especially when switching regions)
    // The state marks items as equipped, but we need to actually create the rod entity
    // This must happen AFTER spawn() because the rod entity needs the player entity as parent
    // Use a small delay to ensure player entity is fully ready
    setTimeout(() => {
      const inventory = this._inventoryManager.getInventory(player);
      if (inventory) {
        // Re-equip rod if one was equipped
        if (inventory.equippedRod) {
          const rodItem = inventory.items.find(item => item.id === inventory.equippedRod);
          if (rodItem && rodItem.equipped) {
            console.log(`[GameRegion] Re-equipping rod ${inventory.equippedRod} for player ${player.id} after spawn (delayed)`);
            // Use equipItem to create the rod entity and attach it to player
            // equipItem will handle creating the rod entity with the player as parent
            const result = this._inventoryManager.equipItem(player, inventory.equippedRod);
            if (!result) {
              console.error(`[GameRegion] Failed to equip rod ${inventory.equippedRod} for player ${player.id}`);
            }
          }
        }
        
        // Re-equip bait if one was equipped
        if (inventory.equippedBait) {
          const baitItem = inventory.items.find(item => item.id === inventory.equippedBait);
          if (baitItem && baitItem.equipped) {
            console.log(`[GameRegion] Re-equipping bait ${inventory.equippedBait} for player ${player.id} after spawn (delayed)`);
            const result = this._inventoryManager.equipItem(player, inventory.equippedBait);
            if (!result) {
              console.error(`[GameRegion] Failed to equip bait ${inventory.equippedBait} for player ${player.id}`);
            }
          }
        }
      }
    }, 100); // Small delay to ensure player entity is fully ready

    this._playerCount++;

    // CRITICAL: Log state preservation for debugging
    if (this._stateManager) {
      const state = this._stateManager.getState(player);
      console.log(`[GameRegion] Player ${player.id} joined region ${this._id} - State preserved:`, {
        inventoryItems: state?.inventory?.items?.length || 0,
        equippedRod: state?.inventory?.equippedRod || 'none',
        equippedBait: state?.inventory?.equippedBait || 'none',
        coins: this._currencyManager?.getCoins(player) || 0,
        level: this._levelingSystem?.getCurrentLevel(player) || 0,
        xp: this._levelingSystem?.getCurrentXP(player) || 0
      });
      
      // CRITICAL: Update UI immediately after spawning
      // The UI is reloaded in GamePlayerEntity constructor, so we need to update it
      // We call updateAllUI in two places:
      // 1. Here immediately after spawning (in case UI loads quickly)
      // 2. In GamePlayerEntity's uiReady handler (when UI finishes loading/reloading)
      // This ensures UI is updated regardless of timing
      console.log(`[GameRegion] Updating all UI immediately for player ${player.id}`);
      this._stateManager.updateAllUI(player);
      
      // Also send a delayed update after a short delay to catch any timing issues
      setTimeout(() => {
        console.log(`[GameRegion] Sending delayed UI update for player ${player.id}`);
        this._stateManager?.updateAllUI(player);
      }, 500);
    }

    // Start world when first player joins
    if (this._playerCount === 1) {
      this._world.start();
    }
  }

  protected onPlayerLeave(player: Player): void {
    // Clear the player's current region data in PlayerStateManager
    if (this._stateManager) {
      this._stateManager.setCurrentRegionId(player, undefined);
      this._stateManager.setCurrentRegionSpawnPoint(player, undefined);
      this._stateManager.setCurrentRegionSpawnFacingAngle(player, undefined);
      this._stateManager.flushSave(player); // Immediately save the cleared region data
    }

    this._world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    this._playerCount--;
    if (this._playerCount <= 0) {
      this._world.stop();
    }
  }

  protected onPlayerReconnected(player: Player): void {
    // Re-initialize player state and UI as needed
    if (this._stateManager) {
      this._stateManager.initializePlayer(player);
    }
  }
}

