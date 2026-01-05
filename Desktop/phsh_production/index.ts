/**
 * HYTOPIA SDK Boilerplate
 * 
 * This is a simple boilerplate to get started on your project.
 * It implements the bare minimum to be able to run and connect
 * to your game server and run around as the basic player entity.
 * 
 * From here you can begin to implement your own game logic
 * or do whatever you want!
 * 
 * You can find documentation here: https://github.com/hytopiagg/sdk/blob/main/docs/server.md
 * 
 * For more in-depth examples, check out the examples folder in the SDK, or you
 * can find it directly on GitHub: https://github.com/hytopiagg/sdk/tree/main/examples/payload-game
 * 
 * You can officially report bugs or request features here: https://github.com/hytopiagg/sdk/issues
 * 
 * To get help, have found a bug, or want to chat with
 * other HYTOPIA devs, join our Discord server:
 * https://discord.gg/DXCXJbHSJX
 * 
 * Official SDK Github repo: https://github.com/hytopiagg/sdk
 * Official SDK NPM Package: https://www.npmjs.com/package/hytopia
 */


import {
  startServer,
  Audio,
  GameServer,
  PlayerEntity,
  type PlayerInput,
  type PlayerCameraOrientation,
  Entity,
  Collider,
  RigidBodyType,
  SimpleEntityController,
  Vector3,
  World,
  Player,
  SceneUI,
  PlayerUI,
  PlayerEvent,
  ChatEvent,
  Quaternion,
  PlayerManager,
} from 'hytopia';

import { PlayerStateManager } from './PlayerStateManager';

import worldMap from './assets/map.json';
import { InventoryManager } from './Inventory/InventoryManager';
import { LevelingSystem } from './LevelingSystem';
import { FishingMiniGame } from './Fishing/FishingMiniGame';
import { CurrencyManager } from './CurrencyManager';
import { MessageManager } from './MessageManager';
import { MyPlayerController } from './MyPlayerController';
import { FishSpawnManager } from './Fishing/FishSpawnManager';
import { BaitBlockManager } from './Bait/BaitBlockManager';
import { GamePlayerEntity } from './GamePlayerEntity';
import GameManager from './GameManager';
import { CraftingManager } from './Crafting/CraftingManager';
import BoatEntity from './Inventory/BoatEntity';
import { TerrainDamageManager } from './Bait/TerrainDamageManager';
import { NpcManager } from './npcs/NpcManager';
import { SeaStoryManager } from './SeaStoryManager';
import { HotspotManager } from './Fishing/FishingHotspots';
import GameClock from './GameClock';
import { DefaultPlayerEntity } from 'hytopia';

// BreakTest: track per-player intervals so we can clean them up on leave
// const __breakTestIntervals = new Map<string, ReturnType<typeof setInterval>>();



/**
 * startServer is always the entry point for our game.
 * It accepts a single function where we should do any
 * setup necessary for our game. The init function is
 * passed a World instance which is the default
 * world created by the game server on startup.
 * 
 * Documentation: https://github.com/hytopiagg/sdk/blob/main/docs/server.startserver.md
 */

startServer(world => {
    // Pass stateManager to all systems
    // Note: Circular dependency resolution - InventoryManager needs PlayerStateManager,
    // but PlayerStateManager needs InventoryManager. We create PlayerStateManager with null,
    // then create InventoryManager, then set it on PlayerStateManager.
    const levelingSystem = new LevelingSystem();
    const currencyManager = new CurrencyManager();
    const messageManager = new MessageManager();
    
    // Create stateManager using singleton pattern (matches Frontiers' GamePlayer.getOrCreate)
    const stateManager = PlayerStateManager.getOrCreate(null, levelingSystem, currencyManager, messageManager);
    
    // Create inventoryManager with stateManager reference
    const inventoryManager = new InventoryManager(world, stateManager);
    
    // Set inventoryManager on stateManager to resolve circular dependency
    stateManager.setInventoryManager(inventoryManager);
    const seaStoryManager = new SeaStoryManager();
    const npcManager = new NpcManager();
    const fishSpawnManager = new FishSpawnManager(stateManager, world);
    const fishingMiniGame = new FishingMiniGame(world, inventoryManager, levelingSystem, stateManager, messageManager, fishSpawnManager);
    const baitBlockManager = new BaitBlockManager(world, stateManager);
    const craftingManager = new CraftingManager(inventoryManager, currencyManager);
    
    // Initialize Hotspot System
    const hotspotManager = new HotspotManager();
    hotspotManager.initializeVisuals(world);
    fishSpawnManager.setHotspotManager(hotspotManager);
    
    // Connect hotspot manager to GameClock for updates
    GameClock.instance.setHotspotManager(hotspotManager);
    
    // Auto-spawn test hotspot removed - testing complete
    
    // Initialize TerrainDamageManager and pass stateManager
    const terrainDamager = TerrainDamageManager.getInstance();
    terrainDamager.initializeStateManager(stateManager);
    terrainDamager.initializeWorld(world);

    GameManager.instance.startRecurringTimers(baitBlockManager);

    // Load regions (creates main-world and ancient-cave-1)
    GameManager.instance.loadRegions(
        world,
        stateManager,
        levelingSystem,
        inventoryManager,
        fishingMiniGame,
        npcManager,
        baitBlockManager,
        currencyManager,
        craftingManager
    );

    // Set up world selection handler (determines which world player joins on connect)
    PlayerManager.instance.worldSelectionHandler = async (player: Player): Promise<World | undefined> => {
        // Initialize player state (loads persisted data including currentRegionId)
        stateManager.initializePlayer(player);
        
        // Get saved region ID
        const savedRegionId = stateManager.getCurrentRegionId(player);
        
        if (savedRegionId) {
            const region = GameManager.instance.getRegion(savedRegionId);
            if (region) {
                console.log(`[WorldSelection] Player ${player.id} joining saved region: ${savedRegionId}`);
                return region.world;
            } else {
                console.warn(`[WorldSelection] Saved region ${savedRegionId} not found for player ${player.id}, using start region`);
            }
        }
        
        // Fallback to start region (big-island)
        const startRegion = GameManager.instance.startRegion;
        if (startRegion) {
            console.log(`[WorldSelection] Player ${player.id} joining start region: ${startRegion.id}`);
            return startRegion.world;
        }
        
        // Final fallback to default world
        console.log(`[WorldSelection] Player ${player.id} joining default world`);
        return world;
    };

    /**
     * Load our map into the main world.
     * You can build your own map using https://build.hytopia.com
     * After building, hit export and drop the .json file in
     * the assets folder as map.json.
     */
    world.loadMap(worldMap);

    

    /**
     * NOTE: Player join/leave is now handled by GameRegion handlers.
     * The handlers below are kept for reference but are disabled since
     * regions handle player spawning and cleanup.
     * 
     * Handle player joining the game. The onPlayerJoin
     * function is called when a new player connects to
     * the game. From here, we create a basic player
     * entity instance which automatically handles mapping
     * their inputs to control their in-game entity and
     * internally uses our player entity controller.
     * 
     */
    
    // DISABLED: Regions now handle player join/leave
    // Player spawning is handled by GameRegion.onPlayerJoin()
    /*
    world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
      baitBlockManager.cleanupOldBlocks();

      // Back to using GamePlayerEntity with MyPlayerController
      const myController = new MyPlayerController(world, stateManager);
      const playerEntity = new GamePlayerEntity(
        player,
        world,
        levelingSystem,
        stateManager,
        inventoryManager,
        fishingMiniGame,
        npcManager,
        baitBlockManager,
        currencyManager,
        craftingManager,
        myController
      );
      
      // Find valid spawn point at dock area
      const spawnPosition = playerEntity.findValidSpawnPoint(world);
      if (spawnPosition) {
          playerEntity.spawn(world, spawnPosition);
          
          // Set player facing direction towards Greeter (central square)
          // Greeter is at (-89.5, 16.76, 36.47) based on central_square layout (anchor -46,26,-15.4 + relative -43.5,-9.24,51.87)
          const greeterPos = { x: -89.5, y: 16.76, z: 36.47 };
          const dx = greeterPos.x - spawnPosition.x;
          const dz = greeterPos.z - spawnPosition.z;
          const facingAngle = Math.atan2(dx, dz) * (180 / Math.PI);
          const quaternion = Quaternion.fromEuler(0, facingAngle, 0);
          playerEntity.setRotation(quaternion);
          
          // Set camera to look at Greeter
          player.camera.lookAtPosition(greeterPos);
      } else {
          // Fallback spawn
          console.warn("[SPAWN] No valid spawn point found, using fallback");
          playerEntity.spawn(world, { x: -109, y: 14, z: 35 });
      }

      // Note: Arrows are updated in uiReady handler when client confirms UI is ready
      // NPCs are spawned before players join, so arrows can be shown immediately when UI is ready

      console.log("[PRODUCTION:] Using GamePlayerEntity with MyPlayerController");

      // BreakTest: Periodically remove a block near the player's feet to isolate client behavior
      // - Runs every 10 seconds
      // - Tries the block at foot level directly under the player; if air, tries one block forward
      // const interval = setInterval(() => {
      //   try {
      //     const px = Math.floor(playerEntity.position.x);
      //     const py = Math.floor(playerEntity.position.y);
      //     const pz = Math.floor(playerEntity.position.z);

      //     // Foot-level block directly under player
      //     const target = { x: px, y: py - 1, z: pz };
      //     const id = world.chunkLattice.getBlockId(target);
      //     if (id !== 0) {
      //       world.chunkLattice.setBlock(target, 0);
      //       console.log(`[BreakTest] Cleared block ${id} at ${target.x},${target.y},${target.z}`);
      //     } else {
      //       // Try one block forward if foot block is air
      //       const alt = { x: px, y: py - 1, z: pz - 1 };
      //       const altId = world.chunkLattice.getBlockId(alt);
      //       if (altId !== 0) {
      //         world.chunkLattice.setBlock(alt, 0);
      //         console.log(`[BreakTest] Cleared block ${altId} at ${alt.x},${alt.y},${alt.z}`);
      //       }
      //     }
      //   } catch (e) {
      //     console.warn('[BreakTest] Failed to clear block', e);
      //   }
      // }, 10_000);
      // __breakTestIntervals.set(player.id, interval);
    });
    */

    /**
     * DISABLED: Regions now handle player join/leave
     * Player cleanup is handled by GameRegion.onPlayerLeave()
     * Handle player leaving the game. The onPlayerLeave
     * function is called when a player leaves the game.
     * Because HYTOPIA is not opinionated on join and
     * leave game logic, we are responsible for cleaning
     * up the player and any entities associated with them
     * after they leave. We can easily do this by 
     * getting all the known PlayerEntity instances for
     * the player who left by using our world's EntityManager
     * instance.
     */
    /*
    world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
        console.log("player left", player.id);
        // BreakTest: cleanup interval for this player
        // const handle = __breakTestIntervals.get(player.id);
        // if (handle) {
        //   clearInterval(handle);
        //   __breakTestIntervals.delete(player.id);
        // }
        
        // Cleanup arrow manager
        const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
        playerEntities.forEach(entity => {
            if (entity && (entity as any).arrowManager) {
                (entity as any).arrowManager.cleanup(player);
            }
        });
        
        stateManager.cleanup(player);
        world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    });
    */


    world.chatManager.on(ChatEvent.BROADCAST_MESSAGE, ({ player, message }) => {
        if (!player) return;  
        console.log("broadcastMessage", player.id, message);
    });

    // Call setupGame and pass the required managers
    GameManager.instance.setupGame(world, stateManager, npcManager, seaStoryManager);

    /**
     * Play some peaceful ambient music to
     * set the mood!
     */
    new Audio({
      uri: "audio/music/hytopia-main-theme.mp3",
      loop: true,
      volume: 0.1,
    }).play(world);

});

