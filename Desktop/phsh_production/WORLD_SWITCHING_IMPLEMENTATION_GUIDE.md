# World Switching Implementation Guide

## Overview

This document provides a comprehensive analysis of how world switching works in the Frontiers RPG example game and how to implement it in your game for "ancient cave" exploration, starting with the Shadow Isle portal.

---

## Part 1: Frontiers RPG Game - World Switching Architecture

### Core Components

#### 1. **GameRegion Class** (`GameRegion.ts`)
The `GameRegion` class is the foundation of the world switching system. Each region is a wrapper around a `World` instance.

**Key Features:**
- **World Management**: Each region creates its own `World` via `WorldManager.instance.createWorld()`
- **State Management**: Worlds start in a stopped state and only run when players are present
- **Player Tracking**: Tracks player count and starts/stops world simulation accordingly
- **Spawn Points**: Each region has default spawn points and facing angles
- **Ambient Audio**: Regions can have unique ambient audio
- **Lighting**: Customizable lighting per region (ambient, directional, fog)

**Key Methods:**
```typescript
- onPlayerJoin(player): Creates GamePlayerEntity, spawns at region spawn point
- onPlayerLeave(player): Cleans up GamePlayer instance, stops world if empty
- onPlayerReconnected(player): Handles reconnection state restoration
```

#### 2. **GameManager** (`GameManager.ts`)
Manages all regions and handles world selection for players.

**Key Features:**
- **Region Registry**: Map of region IDs to GameRegion instances
- **World Selection**: `_selectWorldForPlayer` handler for PlayerManager
- **Region Loading**: `loadRegions()` creates and registers all regions

**Example:**
```typescript
const stalkhavenPortRegion = new StalkhavenPortRegion();
this._regions.set(stalkhavenPortRegion.id, stalkhavenPortRegion);
this._startRegion = stalkhavenPortRegion;
```

#### 3. **PortalEntity** (`PortalEntity.ts`)
Entity that triggers world switching when players collide with it.

**Key Features:**
- **Collision Detection**: Sensor collider that detects player entry
- **Delayed Teleportation**: Optional delay before teleporting
- **Destination Configuration**: Specifies target region, spawn point, and facing angle
- **Visual Feedback**: Shows notifications to players

**Usage:**
```typescript
const portal = new PortalEntity({
  destinationRegionId: 'ancient-cave-1',
  destinationRegionPosition: { x: 0, y: 10, z: 0 },
  destinationRegionFacingAngle: 0,
  delayS: 0 // Optional delay
});
portal.spawn(world, position);
```

#### 4. **GamePlayer** (`GamePlayer.ts`)
Manages player state across regions.

**Key Features:**
- **Region Tracking**: Tracks current region and spawn point
- **State Persistence**: Serializes/deserializes player state including current region
- **World Switching**: `joinRegion()` method handles the transition
- **State Flushing**: `flushSave()` ensures state is saved before world switch

**Critical Method:**
```typescript
public joinRegion(region: GameRegion, facingAngle: number, spawnPoint: Vector3Like): void {
  this.setCurrentRegion(region);
  this.setCurrentRegionSpawnFacingAngle(facingAngle);
  this.setCurrentRegionSpawnPoint(spawnPoint);
  this.flushSave(); // CRITICAL: Save before switching
  this.player.joinWorld(region.world);
}
```

#### 5. **GamePlayerEntity** (`GamePlayerEntity.ts`)
The player's entity in a specific world.

**Key Features:**
- **Region Association**: Knows which region it belongs to
- **Portal Interaction**: `joinRegion()` method delegates to GamePlayer
- **Spawn Handling**: Spawns at region-specific spawn points

---

## Part 2: Your Current Game Architecture

### Current Structure

Your game currently uses a **single-world architecture**:

1. **Single World**: One `World` instance created by `startServer()`
2. **Direct Player Management**: Players spawn directly into the main world
3. **State Management**: `PlayerStateManager` handles all player state
4. **Entity Management**: All entities exist in the same world

### Key Files:
- `index.ts`: Entry point, creates single world
- `GameManager.ts`: Manages game systems but not regions
- `GamePlayerEntity.ts`: Player entity (similar to Frontiers but no region support)
- `PlayerStateManager.ts`: State management (similar to GamePlayer but no region support)

### Portal Models Found

Your map.json contains portal models:
- `models/environment/Portal/ruin-portal.gltf` (appears in map)
- `models/environment/Portal/dragon-portal.gltf` (appears in map)

These are likely the portals on Shadow Isle that are currently blocked off.

---

## Part 3: Implementation Plan for Your Game

### Step 1: Create GameRegion System

Create a new file: `GameRegion.ts`

```typescript
import {
  World,
  WorldManager,
  WorldOptions,
  Player,
  PlayerEvent,
  Vector3Like,
  RgbColor,
  Audio,
  Collider,
  ColliderShape,
  CollisionGroup,
} from 'hytopia';
import { GamePlayerEntity } from './GamePlayerEntity';
import { PlayerStateManager } from './PlayerStateManager';
// ... other imports

export type GameRegionOptions = {
  id: string;
  name: string;
  mapUri?: string; // Path to map JSON file
  ambientAudioUri?: string;
  ambientAudioVolume?: number;
  spawnPoint?: Vector3Like;
  spawnFacingAngle?: number;
  skyboxUri?: string;
  fogColor?: RgbColor;
} & Omit<WorldOptions, 'id'>;

export default class GameRegion {
  private _id: string;
  private _name: string;
  private _world: World;
  private _playerCount: number = 0;
  private _spawnPoint: Vector3Like;
  private _spawnFacingAngle: number;
  private _ambientAudio: Audio | undefined;

  public constructor(options: GameRegionOptions) {
    this._id = options.id;
    this._name = options.name;
    this._spawnPoint = options.spawnPoint ?? { x: 0, y: 10, z: 0 };
    this._spawnFacingAngle = options.spawnFacingAngle ?? 0;

    // Create world
    this._world = WorldManager.instance.createWorld({
      name: options.name,
      skyboxUri: options.skyboxUri,
      fogColor: options.fogColor,
      ...options,
    });
    
    this._world.stop(); // Start stopped, start when players join

    // Setup ambient audio
    if (options.ambientAudioUri) {
      this._ambientAudio = new Audio({
        uri: options.ambientAudioUri,
        volume: options.ambientAudioVolume ?? 0.05,
        loop: true,
      });
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

  protected setup(): void {
    // Load map if provided
    // if (this._mapUri) {
    //   const mapData = require(this._mapUri);
    //   this._world.loadMap(mapData);
    // }

    // Play ambient audio
    if (this._ambientAudio) {
      this._ambientAudio.play(this._world);
    }

    // Out of bounds collider (optional, like Frontiers)
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
          // Teleport back to spawn or kill player
          other.setPosition(this._spawnPoint);
        }
      },
      simulation: this._world.simulation,
    });
  }

  protected onPlayerJoin(player: Player): void {
    // Get state manager and other dependencies
    const stateManager = PlayerStateManager.getOrCreate(/* ... */);
    
    // Create player entity
    const playerEntity = new GamePlayerEntity(/* ... */);
    
    // Spawn at region spawn point
    const spawnPoint = stateManager.getCurrentRegionSpawnPoint(player) ?? this._spawnPoint;
    const spawnFacingAngle = stateManager.getCurrentRegionSpawnFacingAngle(player) ?? this._spawnFacingAngle;
    
    playerEntity.spawn(this._world, spawnPoint);
    
    // Set facing direction
    const quaternion = Quaternion.fromEuler(0, spawnFacingAngle, 0);
    playerEntity.setRotation(quaternion);

    this._playerCount++;
    
    // Start world when first player joins
    if (this._playerCount === 1) {
      this._world.start();
    }
  }

  protected onPlayerLeave(player: Player): void {
    this._playerCount--;
    
    // Stop world when no players
    if (this._playerCount <= 0) {
      this._world.stop();
    }
  }

  protected onPlayerReconnected(player: Player): void {
    // Handle reconnection
    const stateManager = PlayerStateManager.getOrCreate(/* ... */);
    // Restore UI, etc.
  }
}
```

### Step 2: Create PortalEntity

Create a new file: `entities/PortalEntity.ts`

```typescript
import {
  Entity,
  Collider,
  ColliderShape,
  CollisionGroup,
  RigidBodyType,
  Vector3Like,
  ModelEntityOptions,
  BlockColliderOptions,
} from 'hytopia';
import { GamePlayerEntity } from '../GamePlayerEntity';
import GameManager from '../GameManager';

export type PortalEntityOptions = {
  destinationRegionId: string;
  destinationRegionPosition: Vector3Like;
  destinationRegionFacingAngle?: number;
  delayS?: number;
} & ModelEntityOptions;

export default class PortalEntity extends Entity {
  public readonly destinationRegionId: string;
  public readonly destinationRegionPosition: Vector3Like;
  public readonly destinationRegionFacingAngle: number;
  public readonly delayS: number;
  private readonly _playerTimeouts = new Map<GamePlayerEntity, NodeJS.Timeout>();

  public constructor(options: PortalEntityOptions) {
    const colliderOptions = Collider.optionsFromModelUri(
      options.modelUri ?? 'models/environment/Portal/ruin-portal.gltf',
      options.modelScale ?? 1,
      ColliderShape.BLOCK
    ) as BlockColliderOptions;

    super({
      modelUri: options.modelUri ?? 'models/environment/Portal/ruin-portal.gltf',
      modelScale: options.modelScale ?? 1,
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          {
            ...colliderOptions,
            collisionGroups: {
              belongsTo: [CollisionGroup.ALL],
              collidesWith: [CollisionGroup.PLAYER],
            },
            isSensor: true,
            onCollision: (other, started) => {
              if (!(other instanceof GamePlayerEntity)) return;

              if (started) {
                if (this.delayS > 0) {
                  other.player.ui.sendData({
                    type: 'showNotification',
                    message: `Portal activating... You'll be teleported in ${this.delayS} seconds.`,
                    notificationType: 'warning',
                  });
                  const timeout = setTimeout(() => this._teleportPlayer(other), this.delayS * 1000);
                  this._playerTimeouts.set(other, timeout);
                } else {
                  this._teleportPlayer(other);
                }
              } else {
                const timeout = this._playerTimeouts.get(other);
                if (timeout) {
                  clearTimeout(timeout);
                  this._playerTimeouts.delete(other);
                  other.player.ui.sendData({
                    type: 'showNotification',
                    message: 'You exited the portal. Re-enter to activate.',
                    notificationType: 'warning',
                  });
                }
              }
            },
          },
        ],
      },
      ...options,
    });

    this.destinationRegionId = options.destinationRegionId;
    this.destinationRegionPosition = options.destinationRegionPosition;
    this.destinationRegionFacingAngle = options.destinationRegionFacingAngle ?? 0;
    this.delayS = options.delayS ?? 0;
  }

  private _teleportPlayer(player: GamePlayerEntity): void {
    const destinationRegion = GameManager.instance.getRegion(this.destinationRegionId);

    if (!destinationRegion) {
      console.error(`[PortalEntity] Destination region ${this.destinationRegionId} not found`);
      return;
    }

    if (player.isDead) {
      return;
    }

    // Use joinRegion method on player entity
    player.joinRegion(
      destinationRegion,
      this.destinationRegionFacingAngle,
      this.destinationRegionPosition
    );

    this._playerTimeouts.delete(player);
  }
}
```

### Step 3: Extend GameManager

Add region management to `GameManager.ts`:

```typescript
import GameRegion from './GameRegion';
import type { World } from 'hytopia';

export default class GameManager {
  // ... existing code ...

  private _regions: Map<string, GameRegion> = new Map();
  private _startRegion: GameRegion | undefined;

  public getRegion(id: string): GameRegion | undefined {
    return this._regions.get(id);
  }

  public get startRegion(): GameRegion | undefined {
    return this._startRegion;
  }

  public loadRegions(): void {
    // Main world region (your current world)
    const mainRegion = new GameRegion({
      id: 'main-world',
      name: 'Main World',
      spawnPoint: { x: -109, y: 14, z: 35 },
      spawnFacingAngle: 0,
      skyboxUri: 'skyboxes/partly-cloudy',
    });
    this._regions.set(mainRegion.id, mainRegion);
    this._startRegion = mainRegion;

    // Ancient Cave 1 (Shadow Isle portal destination)
    const ancientCave1 = new GameRegion({
      id: 'ancient-cave-1',
      name: 'Ancient Cave',
      spawnPoint: { x: 0, y: 10, z: 0 }, // Adjust based on cave layout
      spawnFacingAngle: 0,
      skyboxUri: 'skyboxes/night', // Dark cave atmosphere
      fogColor: { r: 20, g: 20, b: 30 }, // Dark blue fog
    });
    this._regions.set(ancientCave1.id, ancientCave1);

    // Add more cave regions as needed
  }
}
```

### Step 4: Extend PlayerStateManager

Add region tracking to `PlayerStateManager.ts`:

```typescript
export class PlayerStateManager {
  // ... existing code ...

  // Add to PlayerState interface
  currentRegionId?: string;
  currentRegionSpawnPoint?: Vector3Like;
  currentRegionSpawnFacingAngle?: number;

  // Add methods
  public setCurrentRegion(player: Player, regionId: string): void {
    const state = this.getState(player);
    if (state) {
      state.currentRegionId = regionId;
    }
  }

  public getCurrentRegionSpawnPoint(player: Player): Vector3Like | undefined {
    const state = this.getState(player);
    return state?.currentRegionSpawnPoint;
  }

  public setCurrentRegionSpawnPoint(player: Player, point: Vector3Like): void {
    const state = this.getState(player);
    if (state) {
      state.currentRegionSpawnPoint = point;
    }
  }

  public getCurrentRegionSpawnFacingAngle(player: Player): number | undefined {
    const state = this.getState(player);
    return state?.currentRegionSpawnFacingAngle;
  }

  public setCurrentRegionSpawnFacingAngle(player: Player, angle: number): void {
    const state = this.getState(player);
    if (state) {
      state.currentRegionSpawnFacingAngle = angle;
    }
  }

  // Update serialize/deserialize to include region data
}
```

### Step 5: Extend GamePlayerEntity

Add `joinRegion` method to `GamePlayerEntity.ts`:

```typescript
import GameRegion from './GameRegion';
import { Vector3Like } from 'hytopia';

export class GamePlayerEntity extends DefaultPlayerEntity {
  // ... existing code ...

  public joinRegion(region: GameRegion, facingAngle: number, spawnPoint: Vector3Like): void {
    // Save current region spawn data
    if (this.stateManager) {
      this.stateManager.setCurrentRegion(this.player, region.id);
      this.stateManager.setCurrentRegionSpawnPoint(this.player, spawnPoint);
      this.stateManager.setCurrentRegionSpawnFacingAngle(this.player, facingAngle);
      
      // CRITICAL: Flush save before switching worlds
      this.stateManager.flushSave(this.player);
    }

    // Switch to new world
    this.player.joinWorld(region.world);
  }
}
```

### Step 6: Update index.ts

Modify `index.ts` to use regions:

```typescript
import { startServer, WorldManager, PlayerManager } from 'hytopia';
import GameManager from './GameManager';

startServer(defaultWorld => {
  // ... existing setup code ...

  // Load regions (this will create the main region from defaultWorld)
  GameManager.instance.loadRegions();

  // Set world selection handler
  PlayerManager.instance.worldSelectionHandler = async (player) => {
    const stateManager = PlayerStateManager.getOrCreate(/* ... */);
    const currentRegionId = stateManager.getState(player)?.currentRegionId;
    
    if (currentRegionId) {
      const region = GameManager.instance.getRegion(currentRegionId);
      if (region) {
        return region.world;
      }
    }
    
    // Default to start region
    return GameManager.instance.startRegion?.world ?? defaultWorld;
  };

  // Load main world map into default world
  const mainRegion = GameManager.instance.getRegion('main-world');
  if (mainRegion) {
    mainRegion.world.loadMap(worldMap);
  } else {
    defaultWorld.loadMap(worldMap);
  }

  // ... rest of setup ...
});
```

### Step 7: Create Ancient Cave Portal

In your world population or setup code, create the portal on Shadow Isle:

```typescript
import PortalEntity from './entities/PortalEntity';

// In WorldPopulator or GameManager setup
function setupShadowIslePortal(world: World) {
  const portal = new PortalEntity({
    modelUri: 'models/environment/Portal/ruin-portal.gltf',
    destinationRegionId: 'ancient-cave-1',
    destinationRegionPosition: { x: 0, y: 10, z: 0 }, // Cave entrance position
    destinationRegionFacingAngle: 180, // Face away from portal
    delayS: 0, // Instant teleport
  });

  // Position on Shadow Isle (adjust coordinates based on your map)
  portal.spawn(world, { x: 298, y: 15, z: 190 }); // Shadow Isle center
}
```

### Step 8: Create Return Portal

In the ancient cave region setup, create a return portal:

```typescript
// In GameRegion setup or separate setup function
function setupAncientCaveReturnPortal(caveWorld: World) {
  const returnPortal = new PortalEntity({
    modelUri: 'models/environment/Portal/ruin-portal.gltf',
    destinationRegionId: 'main-world',
    destinationRegionPosition: { x: 298, y: 15, z: 190 }, // Back to Shadow Isle
    destinationRegionFacingAngle: 0,
    delayS: 0,
  });

  returnPortal.spawn(caveWorld, { x: 0, y: 10, z: 0 }); // Cave exit position
}
```

---

## Part 4: Key Differences & Considerations

### Differences from Frontiers

1. **State Management**: Your game uses `PlayerStateManager` instead of `GamePlayer` class
2. **Entity Creation**: Your `GamePlayerEntity` is created differently
3. **World Setup**: Your main world is created by `startServer()`, not via `GameRegion`

### Important Considerations

1. **State Persistence**: Ensure region data is saved/loaded correctly
2. **World Lifecycle**: Worlds should start/stop based on player presence
3. **Entity Cleanup**: Entities in old world should be cleaned up
4. **UI State**: UI may need to be reloaded when switching worlds
5. **Map Loading**: Each region needs its own map (or share the same map)
6. **NPCs & Entities**: NPCs and other entities need to be region-aware

### Performance Notes

- Each world consumes memory for its map colliders
- Worlds with no players use minimal CPU (< 0.1ms)
- Only active (non-sleeping) entities consume CPU
- Can typically handle multiple worlds with thousands of entities total

---

## Part 5: Testing Checklist

- [ ] Create GameRegion class
- [ ] Create PortalEntity class
- [ ] Extend GameManager with region management
- [ ] Extend PlayerStateManager with region tracking
- [ ] Add joinRegion to GamePlayerEntity
- [ ] Update index.ts to use regions
- [ ] Create main world region
- [ ] Create ancient cave region
- [ ] Setup Shadow Isle portal
- [ ] Setup return portal in cave
- [ ] Test world switching
- [ ] Test state persistence
- [ ] Test reconnection
- [ ] Test multiple players
- [ ] Test world start/stop behavior

---

## Part 6: Next Steps

1. **Create Cave Maps**: Design and export cave maps for ancient cave regions
2. **Portal Positioning**: Determine exact portal positions on Shadow Isle
3. **Cave Layout**: Design the cave layout and spawn points
4. **Additional Caves**: Plan for more ancient caves in the future
5. **Cave-Specific Features**: Add unique mechanics for cave exploration

---

## References

- Frontiers RPG Game: `/ref/frontiers-rpg-game/frontiers-rpg-game/`
- World Switching Example: `/ref/frontiers-rpg-game/world-switching/`
- Hytopia SDK Docs: https://github.com/hytopiagg/sdk/blob/main/docs/server.md

