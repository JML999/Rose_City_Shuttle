import { Entity, Vector3, World, RigidBodyType } from 'hytopia';
import { PathfindingEntityController } from 'hytopia';
import { ChickenEntity } from './npcs/ChickenEntity';
import { LeaderboardManager } from './LeaderboardManager';
import type { BaitBlockManager } from './Bait/BaitBlockManager';
import { WorldPopulator } from './WorldPopulation/WorldPopulator';
import { PlayerStateManager } from './PlayerStateManager';
import { NpcManager } from './npcs/NpcManager';
import { SeaStoryManager } from './SeaStoryManager';
import { QuestManager } from './QuestManager';
import { MessageManager } from './MessageManager';
import GameClock from './GameClock';
import { Player } from 'hytopia';


interface CloudConfig {
    position: Vector3;
    speed: number;
    direction: Vector3;
    size: number;
}

interface NPCConfig {
    type: 'chicken' | 'fish' | 'other';
    position: Vector3;
    wanderRadius: number;
    modelUri: string;
}

export default class GameManager {
    public static readonly instance = new GameManager();
    
    private world: World | undefined;
    private worldPopulator?: WorldPopulator;
    private playerStateManager?: PlayerStateManager;
    private seaStoryManager?: SeaStoryManager;
    private npcManager?: NpcManager;
    public questManager?: QuestManager;
    public messageManager?: MessageManager;
    private clouds: Entity[] = [];
    private npcs: Entity[] = [];
    
    // Performance tracking
    private lastPerfLog = Date.now();

    private readonly CLOUD_COUNT = 25; // More clouds
    private readonly CLOUD_Y_HEIGHT = 100;
    private readonly CLOUD_SPEED = 0.1;
    private readonly CLOUD_RESPAWN_X = -100;
    private readonly CLOUD_MAX_X = 100;
    private readonly CHICKEN_COUNT = 1;
    private readonly POND_CENTER = new Vector3(-45, 27, 10);
    private readonly POND_RADIUS = 4;
    private chickens: Entity[] = [];
    private readonly PATHFIND_INTERVAL = 10000; // 1 second


    private readonly CHICKEN_ONE_PATH = [
        { x: -35.73, y: 26, z: -7.43 },
        { x: -38.09, y: 26, z: -31.47 },
    ];
    private readonly CHICKEN_TWO_PATH = [
        { x: -55, y: 26, z: -22 },
        { x: -31.55, y: 26, z: -16 },
    ];
    private readonly CHICKEN_THREE_PATH = [
        { x: -47, y: 26, z: 0.48 },
        { x: -62, y: 26, z: -13.5 },
    ];

    private constructor() {} // Private constructor for singleton

    public getWorld(): World | undefined {
        return this.world;
    }

    public async setupGame(world: World, playerStateManager: PlayerStateManager, npcManager: NpcManager, seaStoryManager: SeaStoryManager) {
        this.world = world;
        this.playerStateManager = playerStateManager;
        this.npcManager = npcManager;
        this.seaStoryManager = seaStoryManager;

        // --- Initialize Day/Night Cycle ---
        GameClock.instance.addWorld(world);

        // --- DEBUG: Log default lighting values ---
        // this.logDefaultLightingValues(world);

        // --- Initialize World Populator ---
        this.worldPopulator = new WorldPopulator(this.world, this.playerStateManager, this.npcManager, this.seaStoryManager, this);
        // --- Initialize Interaction Manager ---

        // --- Populate the World ---
        this.worldPopulator.populateAll(); // Spawn entities (including NPCs with components)


        // --- Initialize other game systems AFTER population & interaction setup ---
        await this.initializeGameSystems();
        // ... rest of setup ...
    }

    private async initializeGameSystems(/* Pass managers if needed */) {
        
        // Initialize Chickens (if you re-enable them)
        this.initializeChickens(); 
        
        // Initialize Leaderboards FIRST
        await LeaderboardManager.instance.initialize(this.playerStateManager);

        // Trigger initial Sea Story generation AFTER leaderboard is ready
        if (this.seaStoryManager) {
            // Use await here as well, since generateDailyStories is async
            await this.seaStoryManager.generateDailyStories().catch(err => {
                console.error("[GameManager] Initial Sea Story generation failed:", err);
            });
        } else {
            console.warn("[GameManager] SeaStoryManager not available, cannot generate initial stories.");
        }

        // Ensure managers needed for QuestManager are available
        if (!this.playerStateManager || !this.seaStoryManager) {
            console.error("[GameManager] Cannot initialize QuestManager: Missing dependencies (PlayerStateManager or SeaStoryManager).");
            return;
        }

        // Get managers required by QuestManager from PlayerStateManager
        const inventoryManager = this.playerStateManager.getInventoryManager();
        const currencyManager = this.playerStateManager.getCurrencyManager();
        const levelingSystem = this.playerStateManager.getLevelingSystem();
        const messageManager = this.playerStateManager.getMessageManager();

        // Store MessageManager instance on GameManager
        this.messageManager = messageManager;
        levelingSystem.initialize(this.playerStateManager);


        // Instantiate QuestManager
        this.questManager = new QuestManager(
            this.playerStateManager,
            this.seaStoryManager,
            inventoryManager,
            currencyManager,
            levelingSystem,
            messageManager
        );
        
    }

    // --- Hotspot Admin Methods moved to GameClock integration ---

    public startRecurringTimers(baitBlockManager: BaitBlockManager) {
        var time = 5 * 60 * 1000;
      //  setInterval(() => baitBlockManager.cleanupOldBlocks(), time);
        
        // Start time update timer (every 30 seconds to avoid spam)
        setInterval(() => this.sendTimeUpdateToAllPlayers(), 30 * 1000);
        
        // Main game loop is now handled by GameClock (every 2 seconds)
        // setInterval(() => this.update(), 2000);
        
        // TODO: Add future recurring timers here
        // Example: setInterval(() => this.weatherSystem.update(), WEATHER_UPDATE_INTERVAL);
        // Example: setInterval(() => this.questManager.refreshDailyQuests(), DAILY_QUEST_REFRESH_INTERVAL);
    }

    private initializeChickens() {
        if (!this.world) {
            console.error("[GameManager] World not initialized, cannot create chickens.");
            return;
        }

        // Define common speed and pause, or customize per chicken
        const chickenMoveSpeed = 1.5; 
        const chickenPauseSeconds = 5; 

        // --- Chicken 1 ---
        if (this.CHICKEN_ONE_PATH.length > 0) {
            const waypoints1 = this.CHICKEN_ONE_PATH.map(p => new Vector3(p.x, p.y, p.z));
            const chicken1 = new ChickenEntity(
                waypoints1,
                chickenMoveSpeed,
                chickenPauseSeconds
            );
            chicken1.spawnInWorld(this.world);
            this.chickens.push(chicken1);
        } else {
            console.warn("[GameManager] CHICKEN_ONE_PATH is empty, cannot create Chicken 1.");
        }

        // --- Chicken 2 ---
        if (this.CHICKEN_TWO_PATH.length > 0) {
            const waypoints2 = this.CHICKEN_TWO_PATH.map(p => new Vector3(p.x, p.y, p.z));
            const chicken2 = new ChickenEntity(
                waypoints2,
                chickenMoveSpeed,
                chickenPauseSeconds
            );
            chicken2.spawnInWorld(this.world);
            this.chickens.push(chicken2);
        } else {
            console.warn("[GameManager] CHICKEN_TWO_PATH is empty, cannot create Chicken 2.");
        }

        // --- Chicken 3 ---
         if (this.CHICKEN_THREE_PATH.length > 0) {
            const waypoints3 = this.CHICKEN_THREE_PATH.map(p => new Vector3(p.x, p.y, p.z));
            const chicken3 = new ChickenEntity(
                waypoints3,
                chickenMoveSpeed,
                chickenPauseSeconds
            );
            chicken3.spawnInWorld(this.world);
            this.chickens.push(chicken3);
        } else {
            console.warn("[GameManager] CHICKEN_THREE_PATH is empty, cannot create Chicken 3.");
        }
    }

    private isInPond(position: { x: number, y: number, z: number }): boolean {
        const dx = position.x - this.POND_CENTER.x;
        const dz = position.z - this.POND_CENTER.z;
        const distanceSquared = dx * dx + dz * dz;
        return distanceSquared <= (this.POND_RADIUS * this.POND_RADIUS);
    }

    public update() {
        if (!this.world) return;

        // Check cloud positions and reset them if they've gone too far
        this.clouds.forEach(cloud => {
            const pos = cloud.position;
            
            if (pos.x > this.CLOUD_MAX_X) {
                // Reset cloud to starting area with new random Z position
                cloud.setPosition({
                    x: this.CLOUD_RESPAWN_X,
                    y: this.CLOUD_Y_HEIGHT + (Math.random() * 10 - 5),
                    z: Math.random() * 200 - 100
                });
            }
        });

        // Update NPC behaviors (like chicken wandering)
        this.updateNPCs();
        
        // Hotspot system is now updated by GameClock
        
        // Performance logging every 30 seconds (much less frequent - was 5 seconds)
        const now = Date.now();
        if (now - this.lastPerfLog >= 30000) { // Changed from 5000ms to 30000ms
            const allEntities = this.world.entityManager.getAllEntities();
            const playerEntities = this.world.entityManager.getAllPlayerEntities();
            
            // Only track entity types for logging, don't cleanup automatically
            const entityCount = allEntities.length;
                        
            // Only run cleanup if entity count is extremely high (was running on any suspicious entities)
            if (entityCount > 200) { // Much higher threshold
                this.cleanupOldDisplayEntities();
            }
            
            this.lastPerfLog = now;
        }
    }

    private updateNPCs() {
        this.npcs.forEach(npc => {
            // Add wandering behavior, animations, etc.
            // This could be expanded into a more complex AI system
        });
    }

    // In your message handler

    // --- Day/Night Cycle Convenience Methods ---
    
    /**
     * Get current game time
     */
    public getGameTime(): { hour: number; minute: number } {
        return {
            hour: GameClock.instance.hour,
            minute: GameClock.instance.minute
        };
    }

    /**
     * Get formatted game time string (e.g., "14:30")
     */
    public getFormattedGameTime(): string {
        const { hour, minute } = this.getGameTime();
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    /**
     * Check if it's currently day time (6 AM to 8 PM)
     */
    public isDayTime(): boolean {
        const hour = GameClock.instance.hour;
        return hour >= 6 && hour < 20;
    }

    /**
     * Check if it's currently night time (8 PM to 6 AM)
     */
    public isNightTime(): boolean {
        return !this.isDayTime();
    }

    /**
     * Cleanup method for when the game ends
     */
    public cleanup(): void {
        if (this.world) {
            GameClock.instance.removeWorld(this.world);
        }
    }

    /**
     * Send time updates to all connected players
     */
    private sendTimeUpdateToAllPlayers(): void {
        if (!this.world || !this.playerStateManager) return;

        const timeData = {
            type: 'timeUpdate',
            formattedTime: this.getFormattedGameTime(),
            hour: GameClock.instance.hour,
            minute: GameClock.instance.minute
        };

        // Send to all connected players
        const allPlayerEntities = this.world.entityManager.getAllPlayerEntities();
        allPlayerEntities.forEach(playerEntity => {
            try {
                playerEntity.player.ui.sendData(timeData);
            } catch (error) {
                console.error(`[GameManager] Failed to send time update to player ${playerEntity.player.id}:`, error);
            }
        });
    }

    /**
     * Send initial time update to a newly joined player
     */
    public sendInitialTimeUpdate(player: Player): void {
        if (!this.world) return;

        const timeData = {
            type: 'timeUpdate',
            formattedTime: this.getFormattedGameTime(),
            hour: GameClock.instance.hour,
            minute: GameClock.instance.minute
        };

        try {
            player.ui.sendData(timeData);
        } catch (error) {
            console.error(`[GameManager] Failed to send initial time update to player ${player.id}:`, error);
        }
    }



    private cleanupOldDisplayEntities(): void {
        if (!this.world) return;
        
        
        // Much more conservative cleanup - only target very specific problematic entities
        const allEntities = this.world.entityManager.getAllEntities();
        let cleanupCount = 0;
        const maxCleanupPerCycle = 20; // Limit cleanup to prevent frame drops
        
        // Target only specific problematic entity types that are known to leak
        const targetNames = [
            'displayFish',
            'displayLoot', 
            'CastMarker',
            'terrainLoot',
            'BitingFish',
            'display' // Generic display entities
        ];
        
        for (let i = 0; i < allEntities.length && cleanupCount < maxCleanupPerCycle; i++) {
            const entity = allEntities[i];
            
            if (!entity.name) continue;
            
            // Only cleanup entities that match our target names exactly
            const shouldCleanup = targetNames.some(targetName => 
                entity.name === targetName || entity.name.startsWith(targetName)
            );
        
            if (shouldCleanup) {
                try {
                    entity.despawn();
                    cleanupCount++;
                } catch (error) {
                    console.error(`Error cleaning up entity ${entity.name}:`, error);
                }
            }
        }
        
    }
}