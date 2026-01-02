import { World, Vector3, PlayerManager } from 'hytopia';
import GameClock from '../GameClock';
import { ALL_FISHING_ZONES, type FishingZone } from '../Fishing/PhshTwoFishingZones';

// Interface for tracking broken blocks
interface BrokenBlock {
    position: Vector3;
    originalBlockId: number;
    timeDestroyed: number; // Timestamp when block was broken
    biome?: string; // Optional biome data for special regeneration rules
}

// Configuration for different block types
interface BlockRegenerationConfig {
    baseRegenerationTimeMs: number; // Base time to regenerate (in milliseconds)
    variancePercent: number; // Random variance as percentage (0.0 to 1.0)
    chanceToUpgrade?: number; // Chance to upgrade to rare variant (0.0 to 1.0)
    upgradeBlockId?: number; // Block ID to upgrade to
    specialRules?: (block: BrokenBlock) => { blockId: number; shouldRegenerate: boolean };
}

export class TerrainRegenerationManager {
    private static instance: TerrainRegenerationManager;
    private world?: World;
    private brokenBlocks: Map<string, BrokenBlock> = new Map();
    private gameClock: GameClock;
    private lastUpdateTime: number = 0;
    private updateInterval = 30000; // Check every 30 seconds

    // Block regeneration configurations
    // Block IDs must match map.json blockTypes
    private readonly BLOCK_CONFIGS: Record<number, BlockRegenerationConfig> = {
        // --- Dirt family ---
        11: { // dirt (ID 11)
            baseRegenerationTimeMs: 5 * 60 * 1000, // 5 minutes (real time)
            variancePercent: 0.3,
            specialRules: (block) => this.dirtSpecialRules(block)
        },
        // --- Ghost dirt ---
        46: { // ghost-dirt (ID 46)
            baseRegenerationTimeMs: 12.5 * 60 * 1000, // 12.5 minutes (real time, longer for rare block)
            variancePercent: 0.4, // Higher variance for rare blocks
        },
        // --- Grass family ---
        15: { // grass-block (ID 15)
            baseRegenerationTimeMs: 4 * 60 * 1000, // 4 minutes (real time)
            variancePercent: 0.25,
            specialRules: (block) => this.grassSpecialRules(block)
        },
        17: { // grass-flower-block (ID 17)
            baseRegenerationTimeMs: 4 * 60 * 1000, // 4 minutes (real time)
            variancePercent: 0.25,
            specialRules: (block) => this.grassSpecialRules(block)
        },
        16: { // grass-flower (ID 16)
            baseRegenerationTimeMs: 4 * 60 * 1000, // 4 minutes (real time)
            variancePercent: 0.25,
            specialRules: (block) => this.grassSpecialRules(block)
        },
        14: { // grass (ID 14)
            baseRegenerationTimeMs: 4 * 60 * 1000, // 4 minutes (real time)
            variancePercent: 0.25,
            specialRules: (block) => this.grassSpecialRules(block)
        },
        // --- Sand family ---
        28: { // sand (ID 28)
            baseRegenerationTimeMs: 6 * 60 * 1000, // 6 minutes (real time)
            variancePercent: 0.3,
        },
        // --- Void sand ---
        71: { // void-sand (ID 71)
            baseRegenerationTimeMs: 7.5 * 60 * 1000, // 7.5 minutes (real time, longer than regular sand)
            variancePercent: 0.35,
        },
        // --- Leaves ---
        2: { // azalea-flowering-leaves (ID 2)
            baseRegenerationTimeMs: 7.5 * 60 * 1000, // 7.5 minutes (real time)
            variancePercent: 0.35,
        },
        3: { // azalea-leaves (ID 3)
            baseRegenerationTimeMs: 7.5 * 60 * 1000, // 7.5 minutes (real time)
            variancePercent: 0.35,
        },
        23: { // oak-leaves (ID 23)
            baseRegenerationTimeMs: 7.5 * 60 * 1000, // 7.5 minutes (real time)
            variancePercent: 0.35,
        },
        // --- Void soil ---
        72: { // voidsoil (ID 72)
            baseRegenerationTimeMs: 10 * 60 * 1000, // 10 minutes (real time)
            variancePercent: 0.4,
            specialRules: (block) => this.voidSoilSpecialRules(block)
        },
        // --- Rune dirt ---
        67: { // rune_dirt (ID 67)
            baseRegenerationTimeMs: 22.5 * 60 * 1000, // 22.5 minutes (real time, very long for rarest block)
            variancePercent: 0.5, // High variance
            specialRules: (block) => this.runeDirtSpecialRules(block)
        }
    };

    // Removed jungle block caching - no longer needed with simplified rune dirt system

    private constructor() {
        this.gameClock = GameClock.instance;
        this.setupUpdateLoop();
    }

    public static getInstance(): TerrainRegenerationManager {
        if (!TerrainRegenerationManager.instance) {
            TerrainRegenerationManager.instance = new TerrainRegenerationManager();
        }
        return TerrainRegenerationManager.instance;
    }

    public initializeWorld(world: World): void {
        this.world = world;
        console.log('[TerrainRegenerationManager] World initialized');
    }

    /**
     * Called by TerrainDamageManager when a block is broken
     * Position comes from block.globalCoordinate which should be exact block grid position
     */
    public recordBrokenBlock(position: Vector3, blockId: number): void {
        const key = this.getPositionKey(position);
        const brokenBlock: BrokenBlock = {
            position: new Vector3(position.x, position.y, position.z),
            originalBlockId: blockId,
            timeDestroyed: Date.now(),
            biome: this.determineBiome(position)
        };

        this.brokenBlocks.set(key, brokenBlock);
        console.log(`[TerrainRegenerationManager] Recorded broken block: ${blockId} at ${key} (${position.x},${position.y},${position.z}), will regenerate in ${this.getRegenerationTime(blockId) / 1000}s`);
    }

    private setupUpdateLoop(): void {
        setInterval(() => {
            this.processRegenerations();
        }, this.updateInterval);
    }

    private processRegenerations(): void {
        if (!this.world) return;

        const currentTime = Date.now();
        const blocksToRegenerate: string[] = [];

        // Check each broken block to see if it's ready to regenerate
        for (const [key, brokenBlock] of this.brokenBlocks.entries()) {
            const config = this.BLOCK_CONFIGS[brokenBlock.originalBlockId];
            if (!config) continue;

            const regenerationTime = this.getRegenerationTime(brokenBlock.originalBlockId);
            const timeSinceDestroyed = currentTime - brokenBlock.timeDestroyed;

            if (timeSinceDestroyed >= regenerationTime) {
                // Determine what block to regenerate
                let blockToPlace = brokenBlock.originalBlockId;
                let shouldRegenerate = true;

                // Apply special rules if they exist
                if (config.specialRules) {
                    const specialResult = config.specialRules(brokenBlock);
                    blockToPlace = specialResult.blockId;
                    shouldRegenerate = specialResult.shouldRegenerate;
                }
                // Apply upgrade chance if no special rules override
                else if (config.chanceToUpgrade && config.upgradeBlockId && Math.random() < config.chanceToUpgrade) {
                    blockToPlace = config.upgradeBlockId;
                }

                if (shouldRegenerate) {
                    this.regenerateBlock(brokenBlock.position, blockToPlace);
                    blocksToRegenerate.push(key);
                } else {
                    // Don't regenerate this block, but remove it from tracking
                    blocksToRegenerate.push(key);
                }
            }
        }

        // Remove regenerated blocks from tracking
        for (const key of blocksToRegenerate) {
            this.brokenBlocks.delete(key);
        }

        if (blocksToRegenerate.length > 0) {
            console.log(`[TerrainRegenerationManager] Regenerated ${blocksToRegenerate.length} blocks`);
        }
    }

    private regenerateBlock(position: Vector3, blockId: number): void {
        if (!this.world) return;

        try {
            // Verify we're placing at integer coordinates
            const intX = Math.floor(position.x);
            const intY = Math.floor(position.y);
            const intZ = Math.floor(position.z);
            
            // Double-check that the position is currently air/empty before regenerating
            const currentBlockId = this.world.chunkLattice.getBlockId({ x: intX, y: intY, z: intZ });
            if (currentBlockId !== 0) {
                console.warn(`[TerrainRegenerationManager] Block at ${intX},${intY},${intZ} is not empty (current: ${currentBlockId}), skipping regeneration`);
                return;
            }
            
            // Check if any players are at this position before regenerating
            const playersAtPosition = this.getPlayersAtPosition(intX, intY, intZ);
            if (playersAtPosition.length > 0) {
                console.warn(`[TerrainRegenerationManager] Player(s) at regeneration position ${intX},${intY},${intZ}, skipping regeneration`);
                return;
            }
            
            this.world.chunkLattice.setBlock({ x: intX, y: intY, z: intZ }, blockId);
            console.log(`[TerrainRegenerationManager] Regenerated block ${blockId} at ${intX},${intY},${intZ}`);
            
        } catch (error) {
            console.error(`[TerrainRegenerationManager] Failed to regenerate block at ${position.x},${position.y},${position.z}:`, error);
        }
    }

    private getRegenerationTime(blockId: number): number {
        const config = this.BLOCK_CONFIGS[blockId];
        if (!config) return 5 * 60 * 1000; // Default 5 minutes (real time)

        const variance = config.baseRegenerationTimeMs * config.variancePercent;
        const randomVariance = (Math.random() - 0.5) * 2 * variance; // ±variance
        return Math.max(1000, config.baseRegenerationTimeMs + randomVariance); // Minimum 1 second
    }

    private getPositionKey(position: Vector3): string {
        return `${position.x},${position.y},${position.z}`;
    }

    private determineBiome(position: Vector3): string {
        // Check if position is in Shadow Isle
        const shadowIsleZone = ALL_FISHING_ZONES.find(zone => zone.id === 'region_shadow_isle');
        if (shadowIsleZone) {
            const distance = Math.sqrt(
                Math.pow(position.x - shadowIsleZone.position.x, 2) +
                Math.pow(position.z - shadowIsleZone.position.z, 2)
            );
            if (distance <= shadowIsleZone.radius) {
                return 'shadow_isle';
            }
        }

        // Add other biome checks as needed
        return 'default';
    }

    // Special rule implementations
    private dirtSpecialRules(block: BrokenBlock): { blockId: number; shouldRegenerate: boolean } {
        // Roll for special dirt variants based on location and chance
        const roll = Math.random();
        
        // 5% chance to become ghost dirt if above y=30
        if (block.position.y > 30 && roll < 0.05) {
            console.log(`[TerrainRegenerationManager] Dirt at ${block.position.x},${block.position.y},${block.position.z} (y>30) upgraded to ghost dirt!`);
            return { blockId: 46, shouldRegenerate: true }; // ghost-dirt (ID 46 from map.json)
        }
        
        // Very small chance (0.1% = 1 in 1000) to become rune dirt
        if (roll >= 0.05 && roll < 0.051) {
            console.log(`[TerrainRegenerationManager] Dirt at ${block.position.x},${block.position.y},${block.position.z} upgraded to rare rune dirt!`);
            return { blockId: 67, shouldRegenerate: true }; // rune_dirt (ID 67 from map.json)
        }
        
        return { blockId: block.originalBlockId, shouldRegenerate: true };
    }

    private grassSpecialRules(block: BrokenBlock): { blockId: number; shouldRegenerate: boolean } {
        // In Shadow Isle, 15% chance to become void soil instead of grass
        if (block.biome === 'shadow_isle' && Math.random() < 0.15) {
            console.log(`[TerrainRegenerationManager] Grass in Shadow Isle at ${block.position.x},${block.position.y},${block.position.z} upgraded to void soil!`);
            return { blockId: 72, shouldRegenerate: true }; // voidsoil (ID 72 from map.json)
        }
        return { blockId: 14, shouldRegenerate: true }; // grass (ID 14 from map.json)
    }

    private voidSoilSpecialRules(block: BrokenBlock): { blockId: number; shouldRegenerate: boolean } {
        // In Shadow Isle, void soil has a 30% chance to regenerate as void soil, otherwise (70%) as common breakable blocks
        if (block.biome === 'shadow_isle' && Math.random() < 0.30) {
            console.log(`[TerrainRegenerationManager] Void soil in Shadow Isle at ${block.position.x},${block.position.y},${block.position.z} staying as void soil!`);
            return { blockId: 72, shouldRegenerate: true }; // voidsoil (ID 72 from map.json)
        }
        
        // 70% chance to become a common breakable block (grass, dirt, grass-block, etc.)
        const roll = Math.random();
        let commonBlockId: number;
        
        if (roll < 0.30) {
            commonBlockId = 14; // grass (ID 14) - 30% of the 70% = 21% total
        } else if (roll < 0.50) {
            commonBlockId = 11; // dirt (ID 11) - 20% of the 70% = 14% total
        } else if (roll < 0.70) {
            commonBlockId = 15; // grass-block (ID 15) - 20% of the 70% = 14% total
        } else if (roll < 0.85) {
            commonBlockId = 17; // grass-flower-block (ID 17) - 15% of the 70% = 10.5% total
        } else {
            commonBlockId = 16; // grass-flower (ID 16) - 15% of the 70% = 10.5% total
        }
        
        console.log(`[TerrainRegenerationManager] Void soil in Shadow Isle at ${block.position.x},${block.position.y},${block.position.z} downgrading to common block ${commonBlockId}`);
        return { blockId: commonBlockId, shouldRegenerate: true };
    }

    private runeDirtSpecialRules(block: BrokenBlock): { blockId: number; shouldRegenerate: boolean } {
        // When rune dirt is broken, it has a low chance to regenerate as rune dirt again
        // Otherwise it becomes regular dirt (making it naturally rare)
        if (Math.random() < 0.2) { // 20% chance to stay rune dirt
            console.log(`[TerrainRegenerationManager] Rune dirt at ${block.position.x},${block.position.y},${block.position.z} staying as rune dirt!`);
            return { blockId: 67, shouldRegenerate: true }; // rune_dirt (ID 67 from map.json)
        }
        
        // 80% chance to downgrade to regular dirt
        console.log(`[TerrainRegenerationManager] Rune dirt at ${block.position.x},${block.position.y},${block.position.z} downgrading to regular dirt`);
        return { blockId: 11, shouldRegenerate: true }; // dirt (ID 11 from map.json)
    }

    // Removed expensive jungle block checking methods - using simple probability instead

    private getPlayersAtPosition(x: number, y: number, z: number): any[] {
        if (!this.world) return [];
        
        const playersAtPosition = [];
        for (const player of PlayerManager.instance.getConnectedPlayers()) {
            // Get the player entity to access position
            const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
            if (playerEntities.length === 0) continue;
            
            const playerEntity = playerEntities[0];
            const playerPos = {
                x: Math.floor(playerEntity.position.x),
                y: Math.floor(playerEntity.position.y),
                z: Math.floor(playerEntity.position.z)
            };
            
            // Check if player is standing on this block (including the block above for head space)
            if (playerPos.x === x && playerPos.z === z && (playerPos.y === y || playerPos.y === y + 1)) {
                playersAtPosition.push(player);
            }
        }
        
        return playersAtPosition;
    }

    // Public methods for debugging/testing
    public getBrokenBlockCount(): number {
        return this.brokenBlocks.size;
    }

    public getPendingRegenerations(): Array<{ position: Vector3; blockId: number; timeUntilRegen: number }> {
        const currentTime = Date.now();
        const pending = [];

        for (const [key, brokenBlock] of this.brokenBlocks.entries()) {
            const regenerationTime = this.getRegenerationTime(brokenBlock.originalBlockId);
            const timeUntilRegen = regenerationTime - (currentTime - brokenBlock.timeDestroyed);
            
            if (timeUntilRegen > 0) {
                pending.push({
                    position: brokenBlock.position,
                    blockId: brokenBlock.originalBlockId,
                    timeUntilRegen: Math.ceil(timeUntilRegen / 1000) // Convert to seconds
                });
            }
        }

        return pending;
    }

    /**
     * Force regenerate all pending blocks (for testing)
     */
    public forceRegenerateAll(): void {
        console.log('[TerrainRegenerationManager] Force regenerating all pending blocks...');
        this.processRegenerations();
    }
} 