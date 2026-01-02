import { Entity, World, Vector3, RigidBodyType, Player } from "hytopia";
import { BEGINNER_CRATE_SPAWN_LOCATIONS } from './CrateCoordinates';
import { PlayerStateManager } from "../PlayerStateManager";
import { InventoryManager } from "../Inventory/InventoryManager";
import { CRATE_CATALOG } from './CrateCatalog';
import type { CrateDefinition } from './CrateCatalog';
import { type BaitDefinition, BAIT_CATALOG } from './BaitCatalog';
import type { InventoryItem } from "../Inventory/Inventory";
//import mapData from '../assets/maps/map_test.json';
import mapData from '../assets/terrain.json';
import { ItemFactory } from "../Inventory/ItemFactory";

interface ZoneSpawnState {
    activeBlocks: number;
    coordinates: Vector3[];
    usedCoordinates: Set<string>;
    crateType: string;
}

class BaitBlock {
    public readonly spawnTime: number;
    constructor(
        public health: number,
        public readonly entity: Entity,
        public readonly crateType: string,
        public readonly definition: CrateDefinition
    ) {
        this.spawnTime = Date.now();
    }
}

export class BaitBlockManager {
    private baitBlocks: Map<string, BaitBlock> = new Map();
    private zoneStates: Map<string, ZoneSpawnState> = new Map();
    private maxBlocksPerZone = 1;
    private world: World;
    private stateManager: PlayerStateManager;
    
    constructor(world: World, stateManager: PlayerStateManager) {
        this.world = world;
        this.stateManager = stateManager;
       // this.initializeZoneStates();
       // this.spawnInitialBlocks();
       // this.logBlockDistribution();
       // console.log('bait blocks');
       // console.log(this.baitBlocks.size);
    }

    private initializeZoneStates() {
        // For each crate type in the catalog
        Object.values(CRATE_CATALOG).forEach(crateType => {
            // Get all spawn locations for this crate
            crateType.spawnLocations.forEach(spawnZone => {
                // Initialize each spawn zone
                spawnZone.coordinates.forEach(coord => {
                    const zoneKey = `${spawnZone.id}_${coord.x}_${coord.y}_${coord.z}`;
                    this.zoneStates.set(zoneKey, {
                        activeBlocks: 0,
                        coordinates: [coord],
                        usedCoordinates: new Set(),
                        crateType: crateType.id
                    });
                });
            });
        });
    }

    private spawnInitialBlocks() {
        
        // 1. Get all dirt block spawn points
        const dirtSpawnPoints = Array.from(this.zoneStates.entries())
            .filter(([_, state]) => state.crateType === 'dirt_block');
        
        // 2. Get all crate spawn points
        const crateSpawnPoints = Array.from(this.zoneStates.entries())
            .filter(([_, state]) => state.crateType === 'beginner_crate');
        
        
        // 3. Spawn 5 dirt blocks at random locations
        if (dirtSpawnPoints.length > 0) {
            // Shuffle the array
            const shuffledDirtPoints = [...dirtSpawnPoints].sort(() => Math.random() - 0.5);
            
            // Take the first 5 (or fewer if not enough points)
            const dirtBlocksToSpawn = Math.min(5, shuffledDirtPoints.length);
            
            for (let i = 0; i < dirtBlocksToSpawn; i++) {
                const [zoneKey, _] = shuffledDirtPoints[i];
                this.spawnBlockInZone(zoneKey);
            }
        }
        
        // 4. Spawn 2 crate blocks at random locations
        if (crateSpawnPoints.length > 0) {
            // Shuffle the array
            const shuffledCratePoints = [...crateSpawnPoints].sort(() => Math.random() - 0.5);
            
            // Take the first 2 (or fewer if not enough points)
            const crateBlocksToSpawn = Math.min(2, shuffledCratePoints.length);
            
            for (let i = 0; i < crateBlocksToSpawn; i++) {
                const [zoneKey, _] = shuffledCratePoints[i];
                this.spawnBlockInZone(zoneKey);
            }
        }
        
        this.logBlockDistribution();
    }

    private spawnBlockInZone(zoneKey: string): boolean {
        const zoneState = this.zoneStates.get(zoneKey);
        if (!zoneState || zoneState.activeBlocks >= this.maxBlocksPerZone) {
            return false;
        }

        const position = zoneState.coordinates[0];
        
        const block = this.createBaitBlock(position, zoneState.crateType);
        
        // Update to use the new event system
        block.entity.on('tick', () => {
            if (block.entity.position.y < 0) {  // Simple y check is very cheap
                const id = block.entity.id?.toString();
                if (id) {
                    this.onBaitBlockBroken(id);
                }
            }
        });
        
        if (block.entity.id) {
            this.baitBlocks.set(block.entity.id.toString(), block);
            zoneState.activeBlocks++;
            return true;
        }
        return false;
    }

    private balanceZones() {
        let lowestFillPercentage = 1;
        let zoneToSpawnIn = null;

        this.zoneStates.forEach((state, zoneId) => {
            const fillPercentage = state.activeBlocks / this.maxBlocksPerZone;
            if (fillPercentage < lowestFillPercentage) {
                lowestFillPercentage = fillPercentage;
                zoneToSpawnIn = zoneId;
            }
        });

        if (zoneToSpawnIn) {
            this.spawnBlockInZone(zoneToSpawnIn);
        }
    }

    private spawnInFarthestZone(playerPosition: Vector3) {
        // Sort zones by distance from player
        const zonesWithDistance = Array.from(this.zoneStates.entries()).map(([zoneId, state]) => {
            const zonePosition = this.getZonePosition(zoneId);
            const distance = zonePosition.subtract(playerPosition).length;
            return { zoneId, distance, state };
        });

        // Sort by distance descending (farthest first)
        zonesWithDistance.sort((a, b) => b.distance - a.distance);

        // Try to spawn in zones, starting with farthest
        for (const { zoneId, state } of zonesWithDistance) {
            const fillPercentage = state.activeBlocks / this.maxBlocksPerZone;
            if (fillPercentage < 1) {  // Zone isn't full
                this.spawnBlockInZone(zoneId);
                return;
            }
        }
    }

    private spawnInRandomZone(): boolean {
        // 70% chance to spawn dirt block, 30% chance for crate
        const spawnDirt = Math.random() < 0.9;
        
        // Filter zones based on type
        const availableZones = Array.from(this.zoneStates.entries())
            .filter(([key, state]) => {
                const isDirtZone = key.includes('dirt');
                const notFull = state.activeBlocks < this.maxBlocksPerZone;
                return notFull && (spawnDirt ? isDirtZone : !isDirtZone);
            })
            .sort(() => Math.random() - 0.5);

        if (availableZones.length > 0) {
            const [zoneId, _] = availableZones[0];
            return this.spawnBlockInZone(zoneId);
        }
        return false;
    }

    private getZonePosition(zoneId: string): Vector3 {
        // Assuming zoneId is in format "x,y,z"
        const [x, y, z] = zoneId.split(',').map(Number);
        return new Vector3(x, y, z);
    }

    private createBaitBlock(position: Vector3, crateType: string): BaitBlock {
        const definition = CRATE_CATALOG[crateType];
        const entity = new Entity({
            blockTextureUri: definition.blockTextureUri,
            blockHalfExtents: { x: 0.4, y: 0.4, z: 0.4 },
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
            }
        });

        entity.spawn(this.world, position);

        return new BaitBlock(definition.health, entity, crateType, definition);
    }

    private removeBaitBlock(id: string) {
        const block = this.baitBlocks.get(id);
        if (block) {
            block.entity.despawn();
            this.baitBlocks.delete(id);
        }
    }

    public handleBlockHit(entityId: string, hitPosition: Vector3, player: Player): void {
        const block = this.baitBlocks.get(entityId);
        if (!block) return;

        block.health--;
        this.spawnBreakParticles(block.entity);
        if (block.health <= 0) {
            const zoneId = this.findZoneForBlock(entityId);
            if (zoneId) {
                const zoneState = this.zoneStates.get(zoneId);
                if (zoneState) {
                    zoneState.activeBlocks--;
                }
            }
                    // Add validation check here
            this.checkInvalidBlocks();
        
            // Check for any invalid blocks while we're here
            this.checkInvalidBlocks();
            this.handleBreak(block, player);
            this.removeBaitBlock(entityId);
          //  this.balanceZones();
         //   this.spawnInFarthestZone(hitPosition);
        // Add blocks until we reach 7 total
            const MAX_SPAWN_ATTEMPTS = 20; // Prevent infinite loops
            let attempts = 0;
            
            while (this.baitBlocks.size < 4 && attempts < MAX_SPAWN_ATTEMPTS) {
                const success = this.spawnInRandomZone();
                if (!success) {
                    attempts++;
                } else {
                    attempts = 0;
                }
            }
             this.logBlockDistribution();

            if (attempts >= MAX_SPAWN_ATTEMPTS) {
                console.warn('Failed to spawn all bait blocks after maximum attempts');
            }
        }
    }

    private checkInvalidBlocks() {
        // Remove invalid blocks
        for (const [id, block] of this.baitBlocks.entries()) {
            if (block.entity.position.y < 0 || this.isInWater(block.entity)) {
                const zoneId = this.findZoneForBlock(id);
                if (zoneId) {
                    const zoneState = this.zoneStates.get(zoneId);
                    if (zoneState) {
                        zoneState.activeBlocks--;
                    }
                }
                this.removeBaitBlock(id);
            }
        }
        this.logBlockDistribution();
    }

    private isInWater(entity: any): boolean {
        const position = {
            x: Math.floor(entity.position.x),
            y: Math.floor(entity.position.y),
            z: Math.floor(entity.position.z)
        };
        const blockKey = `${position.x},${position.y},${position.z}`;
        const blocks = (mapData as any).blocks as Record<string, number>;
        const blockTypeId = blocks[blockKey];
        return blockTypeId === 43 || blockTypeId === 42 || blockTypeId === 100;
    }

    private validateBlockCount() {
        // Check each zone has minimum blocks
        for (const [zoneId, state] of this.zoneStates.entries()) {
            if (state.activeBlocks < this.maxBlocksPerZone) {
                this.spawnBlockInZone(zoneId);
            }
        }
    }

    private findZoneForBlock(entityId: string): string | null {
        const block = this.baitBlocks.get(entityId);
        if (!block) return null;

        return BEGINNER_CRATE_SPAWN_LOCATIONS.find(zone => 
            zone.coordinates.some(coord => 
                coord.x === block.entity.position.x && 
                coord.y === block.entity.position.y && 
                coord.z === block.entity.position.z
            ))?.id || null;
    }

    private spawnBreakParticles(box: Entity) {
        const particleCount = 3;

        for (let i = 0; i < particleCount; i++) {
           
            const particle = new Entity({
                blockTextureUri: "blocks/dirt.png",
                blockHalfExtents: { x: 0.05, y: 0.05, z: 0.05 },
                rigidBodyOptions: {
                    type: RigidBodyType.DYNAMIC,
                }
            });
    
            // Random edge position
            const edge = Math.floor(Math.random() * 4); // 0-3 for four edges
            const offset = Math.random() * 0.8 - 0.4;   // -0.4 to 0.4
            
            const particlePos = new Vector3(
                box.position.x + (edge % 2 === 0 ? offset : (edge === 1 ? 0.4 : -0.4)),
                box.position.y + 0.4,  // Top of box
                box.position.z + (edge % 2 === 1 ? offset : (edge === 0 ? 0.4 : -0.4))
            );
            
            particle.spawn(this.world, particlePos);
    
            setTimeout(() => {
                if (particle.isSpawned) {
                    particle.despawn();
                }
            }, 500);
        }
    }

    private handleBreak(crateBlock: BaitBlock, player: Player) {
        const loot = this.rollLoot(crateBlock.definition.lootTable);
        if (loot) {
            this.giveBaitToPlayer(player, loot.type, loot.amount);
        }
    }

    private rollLoot(lootTable: { type: string, chance: number, minAmount: number, maxAmount: number }[]): { type: string, amount: number } | null {
        // Shuffle the loot table
        const shuffledTable = [...lootTable].sort(() => Math.random() - 0.5);
        // Sum up all chances
        const totalChance = shuffledTable.reduce((sum, entry) => sum + entry.chance, 0);
        // Roll a random number between 0 and total chance
        const roll = Math.random() * totalChance;
        // Find which item was rolled from shuffled table
        let currentSum = 0;
        for (const entry of shuffledTable) {
            currentSum += entry.chance;
            if (roll <= currentSum) {
                return {
                    type: entry.type,
                    amount: Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1)) + entry.minAmount
                };
            }
        }
        return null;
    }

    // Pre-ItemFactory version
    /*
    private createBaitInventoryItem(baitDef: BaitDefinition, amount: number): InventoryItem {
        return {
            id: baitDef.id,
            modelId: baitDef.modelId,
            sprite: baitDef.sprite,
            name: baitDef.name,
            type: 'bait',
            rarity: baitDef.rarity,
            value: baitDef.value,
            quantity: amount,
            metadata: {
                baitStats: {
                    baseLuck: baitDef.baseLuck,
                    class: baitDef.class,
                    targetSpecies: baitDef.targetSpecies,
                    speciesLuck: baitDef.speciesLuck,
                    description: baitDef.description,
                    resilliance: baitDef.resilliance,
                    strength: baitDef.strength
                }
            }
        };
    }
        */

    private giveBaitToPlayer(player: Player, baitType: string, amount: number) {
        const baitDef = BAIT_CATALOG[baitType];
        if (baitDef) {
            const baitItem = ItemFactory.createBaitItem(baitType, amount);
            this.stateManager.addInventoryItem(player, baitItem);
            this.stateManager.sendGameMessage(player, `${amount} ${baitDef.name} added to inventory`);
        }
    }

    public onBaitBlockBroken(blockId: string) {
        const zoneId = this.findZoneForBlock(blockId);
        if (zoneId) {
            const zoneState = this.zoneStates.get(zoneId);
            if (zoneState) {
                zoneState.activeBlocks--;
            }
        }
        this.removeBaitBlock(blockId);
        this.checkInvalidBlocks();
    }

    private logBlockDistribution() {
        let dirtCount = 0;
        let crateCount = 0;
        
        this.baitBlocks.forEach(block => {
            if (block.crateType.includes('dirt')) {
                dirtCount++;
            } else {
                crateCount++;
            }
        });

        const totalBlocks = this.baitBlocks.size;
        const dirtPercentage = (dirtCount / totalBlocks * 100).toFixed(1);
        const cratePercentage = (crateCount / totalBlocks * 100).toFixed(1);

    }

    public cleanupOldBlocks() {
        const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
        const currentTime = Date.now();
        let replacementsNeeded = 0;
    
        // Iterate over all bait blocks
        for (const [id, block] of this.baitBlocks) {
            if (currentTime - block.spawnTime > TWELVE_HOURS) {
                
                // Find the zone this block was in
                const zoneId = this.findZoneForBlock(id);
                if (zoneId) {
                    const zoneState = this.zoneStates.get(zoneId);
                    if (zoneState) {
                        zoneState.activeBlocks--;
                    }
                }
    
                // Remove the old block
                this.removeBaitBlock(id);
                replacementsNeeded++;
            }
        }
    
        // Spawn new blocks to replace the old ones
        if (replacementsNeeded > 0) {
            for (let i = 0; i < replacementsNeeded; i++) {
                this.spawnInRandomZone();
            }
            this.logBlockDistribution();
        }
    }
}