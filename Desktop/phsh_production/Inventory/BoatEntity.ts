import { Entity, PlayerEntity, World, Vector3, Quaternion, EntityEvent, RigidBodyType, BaseEntityControllerEvent, type PlayerCameraOrientation, type PlayerInput } from "hytopia";
import { GamePlayerEntity } from "../GamePlayerEntity";
import BoatEntityController from "./BoatEntityController";

class BoatEntity extends Entity {
    public driver: PlayerEntity | null = null;
    private readonly MOUNT_DISTANCE = 3; // Distance within which a player can mount
    private waterLevel: number = 0;
    private boatController: BoatEntityController;
    private isRowing = false;
    public ownerBoatKey?: string; // Set this when spawning
    private autoDespawnTimer?: ReturnType<typeof setTimeout>; // Auto-despawn timer
    private hasBeenUsed: boolean = false; // Track if boat has ever been used
    private readonly AUTO_DESPAWN_TIME = 30000; // 30 seconds (much more aggressive cleanup)
    
    constructor() {
        super({
            name: 'Boat',
            tag: 'boat', // Add tag for EntityManager filtering
            modelUri: 'models/items/boat.gltf',
            modelScale: 1.10,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC, // Use dynamic for physics collisions, but lock rotations to prevent capsizing
                // Initialize with zero velocities
                linearVelocity: { x: 0, y: 0, z: 0 },
                angularVelocity: { x: 0, y: 0, z: 0 },
                // Lock X and Z rotations to prevent capsizing (only allow Y rotation for turning)
                enabledRotations: { x: false, y: true, z: false },
                // Physics properties
                gravityScale: 0.3, // Reduced gravity
                linearDamping: 1.5, // Add damping to prevent excessive drifting
                angularDamping: 5.0 // High angular damping to prevent unwanted rotations
            }
        });

        this.boatController = new BoatEntityController();
        this.setController(this.boatController);

        // Remove collision handler, only keep spawn and tick
        this.on(EntityEvent.SPAWN, this.handleSpawn.bind(this));
        this.on(EntityEvent.TICK, this.handleTick.bind(this));
        
        // Start auto-despawn timer for unused boats only
        this.startAutoDespawnTimer();
    }

    private handleSpawn() {
        console.log(`[BoatEntity] handleSpawn called at position ${this.position.x}, ${this.position.y}, ${this.position.z}`);
        
        // Find water below and position boat at water level
        const waterY = this.findWaterBelow(this.position);
        console.log(`[BoatEntity] findWaterBelow returned: ${waterY}`);
        
        if (waterY !== null) {
            // Boat sits at water surface + 1.1 blocks (matches old production)
            this.waterLevel = waterY + 1.1;
            console.log(`[BoatEntity] Setting boat position to ${this.position.x}, ${this.waterLevel}, ${this.position.z} (water found at Y=${waterY})`);
            this.setPosition({
                x: this.position.x,
                y: this.waterLevel,
                z: this.position.z
            });
        } else {
            // Fallback: Position boat at spawn Y level and set water level to spawn Y
            // This allows the boat to spawn even if water detection fails
            console.warn(`[BoatEntity] No water found below spawn position, using fallback Y=${this.position.y}`);
            this.waterLevel = this.position.y;
        }
    }

    private findWaterBelow(position: { x: number, y: number, z: number }): number | null {
        if (!this.world) {
            console.warn(`[BoatEntity] findWaterBelow: No world available`);
            return null;
        }
        
        // Check both floor and round for X and Z to handle edge cases
        const xFloor = Math.floor(position.x);
        const xRound = Math.round(position.x);
        const zFloor = Math.floor(position.z);
        const zRound = Math.round(position.z);
        const startY = Math.floor(position.y);
        
        console.log(`[BoatEntity] findWaterBelow: Searching for water at position (${position.x}, ${position.y}, ${position.z}), checking coords (${xFloor}/${xRound}, ${zFloor}/${zRound}), starting from Y=${startY}`);
        
        // Support multiple water block IDs from different worlds:
        // Main world: 74, 77, 78, 150, 50, 73
        // Cave world: 10
        const WATER_BLOCK_IDS = [10, 50, 73, 74, 77, 78, 150];
        
        // Check multiple coordinate combinations (floor and round for both X and Z)
        const checkCoords = [
            { x: xFloor, z: zFloor },
            { x: xRound, z: zRound },
            { x: xFloor, z: zRound },
            { x: xRound, z: zFloor }
        ];
        
        // Search from well above spawn down to well below
        for (const coord of checkCoords) {
            for (let y = startY + 5; y >= Math.max(0, startY - 20); y--) {
                const blockType = this.world.chunkLattice.getBlockId({ x: coord.x, y, z: coord.z });
                console.log(`[BoatEntity] Checking block at ${coord.x}, ${y}, ${coord.z}: blockType=${blockType}`);
                if (WATER_BLOCK_IDS.includes(blockType ?? 0)) {
                    console.log(`[BoatEntity] Found water at Y=${y} (position ${coord.x}, ${coord.z})`);
                    return y;
                }
            }
        }
        
        // Also check nearby positions in case the exact coordinate is off
        const nearbyOffsets = [
            { x: 0, z: 0 }, { x: 1, z: 0 }, { x: -1, z: 0 },
            { x: 0, z: 1 }, { x: 0, z: -1 }, { x: 1, z: 1 },
            { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }
        ];
        
        console.log(`[BoatEntity] Water not found at exact position, checking nearby blocks`);
        for (const offset of nearbyOffsets) {
            const checkX = xFloor + offset.x;
            const checkZ = zFloor + offset.z;
            for (let y = startY + 5; y >= Math.max(0, startY - 20); y--) {
                const blockType = this.world.chunkLattice.getBlockId({ x: checkX, y, z: checkZ });
                if (WATER_BLOCK_IDS.includes(blockType ?? 0)) {
                    console.log(`[BoatEntity] Found water at Y=${y} (nearby position ${checkX}, ${checkZ})`);
                    return y;
                }
            }
        }
        
        console.warn(`[BoatEntity] No water found below position (${position.x}, ${position.y}, ${position.z}) or nearby`);
        return null;
    }

    private handleTick() {
        // Apply buoyancy forces to keep boat floating at water level
        this.applyBuoyancyForces();
        
        if (this.driver?.isSpawned && this.driver.player) {
            const playerEntity = this.driver;
            // Get camera orientation from the tick event
            this.boatController.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, (payload) => {
                this.processMovementInput(
                    playerEntity.player.input,
                    payload.cameraOrientation,
                    0
                );
            });
        }
    }
    
    private applyBuoyancyForces(): void {
        const currentY = this.position.y;
        const targetY = this.waterLevel;
        const yDifference = targetY - currentY;
        
        // Apply buoyancy forces similar to player's underwater system
        if (yDifference > 0.05) { // Boat is below target water level
            // Calculate upward force based on how far below water level the boat is
            const buoyancyForce = Math.min(yDifference * 3.0, 8.0); // Cap the force to prevent excessive jumping
            
            // Apply upward force using setLinvel
            this.rawRigidBody?.setLinvel({
                x: this.linearVelocity.x,
                y: buoyancyForce,
                z: this.linearVelocity.z
            });
        } else if (yDifference < -0.1) { // Boat is too high above water level
            // Apply gentle downward force if boat is floating too high
            const sinkForce = Math.max(yDifference * 1.5, -3.0); // Cap downward force
            
            this.rawRigidBody?.setLinvel({
                x: this.linearVelocity.x,
                y: sinkForce,
                z: this.linearVelocity.z
            });
        }
        
        // Constantly reset X and Z rotations to 0 to prevent any tilting
        // (enabledRotations should handle this, but this is extra insurance)
        const currentRotation = this.rotation;
        if (Math.abs(currentRotation.x) > 0.01 || Math.abs(currentRotation.z) > 0.01) {
            this.setRotation({
                x: 0,
                y: currentRotation.y,
                z: 0,
                w: currentRotation.w
            });
        }
    }

    public mountPlayer(player: PlayerEntity) {
        if (this.driver) return;
        
        
        // On first use, permanently disable auto-despawn timer
        if (!this.hasBeenUsed) {
            this.hasBeenUsed = true;
            if (this.autoDespawnTimer) {
                clearTimeout(this.autoDespawnTimer);
                this.autoDespawnTimer = undefined;
            }
        }
        
        // Store reference to driver
        this.driver = player;
        
        // Set the isBoating flag to true
        (player as GamePlayerEntity).isBoating = true;
        // Set reference to current boat
        (player as GamePlayerEntity).currentBoat = this;
        
    
        
        // Stop any existing animations
        player.modelLoopedAnimations.forEach(animation => {
            player.stopModelAnimations([animation]);
        });

        try {
            // Try both methods to ensure one works
            player.startModelLoopedAnimations(['sit']);
        } catch (e) {
            console.error("[Boat] Animation error:", e);
        }
        
        // Make player a child of the boat
        player.setParent(
            this,
            undefined,
            { x: 0, y: -0.5, z: 0 }, // Position slightly above boat
            Quaternion.fromEuler(0, 0, 0)
        );
      
        // Notify UI to show boat controls
        if (player.player) {
            player.player.ui.sendData({ type: 'boatMounted' });
        }
    }

    public dismountPlayer() {
        if (!this.driver) return;
      
        // Stop all boat movement immediately
        this.setLinearVelocity({ x: 0, y: 0, z: 0 });
        this.setAngularVelocity({ x: 0, y: 0, z: 0 });
        
        // Get reference to player before clearing
        const player = this.driver;
       
        this.stopModelAnimations(['row_forward', 'idle']); 
        player.stopModelAnimations(['sit', 'idle_mounted']);
        
        // Set the isBoating flag back to false
        (player as GamePlayerEntity).isBoating = false;
        // Clear reference to current boat
        (player as GamePlayerEntity).currentBoat = null;
        
        // Detach from boat
        player.setParent(undefined);
        
        // Position player safely beside the boat
        player.setPosition({
            x: this.position.x,
            y: this.position.y + 1 ,
            z: this.position.z
        });
      
        // Clear driver reference
        this.driver = null;
        
        // Notify UI to hide boat controls
        if (player.player) {
            player.player.ui.sendData({ type: 'boatDismounted' });
        }
    }

    public processMovementInput(
        input: PlayerInput,
        cameraOrientation: PlayerCameraOrientation,
        deltaTimeMs: number
    ): void {
        if (!this.driver) return;
        
        // Process movement through the controller
        this.boatController.processBoatMovement(this, input, cameraOrientation, deltaTimeMs);

        const isMovingForward = input.w && !input.s;

        if (isMovingForward && !this.isRowing) {
            this.isRowing = true;
            this.startModelLoopedAnimations(['row_forward']);
        } else if (!isMovingForward && this.isRowing) {
            this.isRowing = false;
            this.stopModelAnimations(['row_forward']);
        }
    }

    private startAutoDespawnTimer() {
        // Only start timer if boat hasn't been used yet
        if (this.hasBeenUsed) {
        
            return;
        }
        
        this.autoDespawnTimer = setTimeout(() => {
           
            this.despawn();
        }, this.AUTO_DESPAWN_TIME);
        
       
    }

    public override despawn(): void {
        if (this.autoDespawnTimer) {
            clearTimeout(this.autoDespawnTimer);
        }
        super.despawn();
    }
}

export default BoatEntity;