import { BaseEntityController, Entity, type PlayerInput, type PlayerCameraOrientation } from "hytopia";
import BoatEntity from "./BoatEntity";
import { Vector3 } from "hytopia";

export default class BoatEntityController extends BaseEntityController {
    /** Current rotation of the boat in radians */
    private currentRotation: number = 0;
    /** The velocity when moving forward */
    private moveSpeed: number = 8;
    /** The rotation speed when turning */
    private turnSpeed: number = 2.5;
    /** Current momentum of the boat */
    private currentMomentum: number = 0;
    /** Acceleration rate */
    private accelerationRate: number = 8.0;
    /** Deceleration rate */
    private decelerationRate: number = 6.0;

    public override attach(entity: Entity) {
        super.attach(entity);
        // Initialize rotation from entity's current rotation
        if (entity instanceof BoatEntity) {
            this.currentRotation = entity.rotation.y * 2;
        }
    }

    public processBoatMovement(
        entity: BoatEntity,
        input: PlayerInput,
        cameraOrientation: PlayerCameraOrientation,
        deltaTimeMs: number
    ): void {
        if (!entity.isSpawned) {
            console.log(`[BoatEntityController] processBoatMovement: Entity not spawned, skipping`);
            return;
        }

        const deltaTime = deltaTimeMs / 1000 || 0.016; // Default to 16ms if deltaTime is 0
        const targetVelocities = { x: 0, y: 0, z: 0 };
        
        // Log input for debugging
        if (input.w || input.s || input.a || input.d) {
            console.log(`[BoatEntityController] Input received: w=${input.w}, s=${input.s}, a=${input.a}, d=${input.d}, momentum=${this.currentMomentum.toFixed(2)}`);
        }

        // Get camera yaw from camera facing direction (for camera-relative movement)
        let cameraYaw = this.currentRotation; // Fallback to boat rotation
        if (entity.driver?.player?.camera?.facingDirection) {
            const cameraForward = Vector3.fromVector3Like(entity.driver.player.camera.facingDirection);
            // Calculate yaw from camera forward direction (horizontal plane only)
            // Add π to reverse the direction (180 degree flip)
            cameraYaw = Math.atan2(cameraForward.x, cameraForward.z) + Math.PI;
        }

       

        // Update momentum based on input
        if (input.w && !input.s) {
            // Accelerate forward
            this.currentMomentum = Math.min(
                this.currentMomentum + this.accelerationRate * deltaTime,
                this.moveSpeed
            );
        } else if (input.s && this.currentMomentum <= 0) {
            // Reverse (only when stopped or in reverse)
            this.currentMomentum = Math.max(
                -this.moveSpeed / 2, // Reverse is slower
                this.currentMomentum - this.accelerationRate * deltaTime
            );
        } else {
            // No input, gradually decelerate
            if (Math.abs(this.currentMomentum) < 0.2) {
                this.currentMomentum = 0; // Snap to zero if very small
            } else if (this.currentMomentum > 0) {
                this.currentMomentum = Math.max(
                    0,
                    this.currentMomentum - this.decelerationRate * deltaTime
                );
            } else {
                this.currentMomentum = Math.min(
                    0,
                    this.currentMomentum + this.decelerationRate * deltaTime
                );
            }
        }

        // Update rotation: Use camera yaw for boat direction (camera controls steering)
        // A/D keys no longer rotate the boat on desktop - camera controls direction
        // Sync boat rotation to camera yaw (camera controls direction)
        // Smoothly interpolate to camera yaw for smooth turning
        const rotationDiff = cameraYaw - this.currentRotation;
        // Normalize rotation difference to -π to π range
        let normalizedDiff = rotationDiff;
        while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
        while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
        
        // Smoothly rotate towards camera yaw
        const rotationSpeed = this.turnSpeed * 2.0; // Faster when syncing to camera
        const maxRotation = rotationSpeed * deltaTime;
        if (Math.abs(normalizedDiff) > maxRotation) {
            this.currentRotation += Math.sign(normalizedDiff) * maxRotation;
        } else {
            this.currentRotation = cameraYaw;
        }

        // Normalize rotation to keep it in the 0-2π range
        this.currentRotation = this.currentRotation % (Math.PI * 2);
        if (this.currentRotation < 0) {
            this.currentRotation += Math.PI * 2;
        }

        // Calculate movement direction: Use camera yaw for forward/back (camera-relative movement)
        // This makes forward/back buttons move relative to where camera is looking
        const movementYaw = cameraYaw; // Use camera direction for movement
        
        if (this.currentMomentum !== 0) {
            const proposedVelocity = {
                x: -this.currentMomentum * Math.sin(movementYaw),
                y: 0,
                z: -this.currentMomentum * Math.cos(movementYaw)
            };

            // Check if the boat would move onto land with this velocity
            const isValidWater = this.isValidWaterPosition(entity, proposedVelocity, deltaTime);
            console.log(`[BoatEntityController] isValidWaterPosition: ${isValidWater}, proposedVelocity: x=${proposedVelocity.x.toFixed(2)}, z=${proposedVelocity.z.toFixed(2)}`);
            
            if (isValidWater) {
                targetVelocities.x = proposedVelocity.x;
                targetVelocities.z = proposedVelocity.z;
                console.log(`[BoatEntityController] Setting boat velocity to x=${targetVelocities.x.toFixed(2)}, z=${targetVelocities.z.toFixed(2)}`);
            } else {
                // If we would hit land, stop the boat
                console.log(`[BoatEntityController] Movement blocked - would hit land, stopping boat`);
                this.currentMomentum = 0;
            }
        }

        // Apply velocities
        entity.setLinearVelocity(targetVelocities);
        if (targetVelocities.x !== 0 || targetVelocities.z !== 0) {
            console.log(`[BoatEntityController] Applied velocity: x=${targetVelocities.x.toFixed(2)}, z=${targetVelocities.z.toFixed(2)}, boat position: ${entity.position.x.toFixed(2)}, ${entity.position.y.toFixed(2)}, ${entity.position.z.toFixed(2)}`);
        }

        // Apply rotation
        const halfCurrentRotation = this.currentRotation / 2;
        entity.setRotation({
            x: 0,
            y: Math.fround(Math.sin(halfCurrentRotation)),
            z: 0,
            w: Math.fround(Math.cos(halfCurrentRotation))
        });
    
    }

    /**
     * Get the current rotation in radians
     */
    public getCurrentRotation(): number {
        return this.currentRotation;
    }

    /**
     * Set the current rotation in radians
     */
    public setCurrentRotation(rotation: number): void {
        this.currentRotation = rotation;
    }

    /**
     * Check if a proposed position is over water
     */
    private isValidWaterPosition(entity: BoatEntity, velocity: { x: number, y: number, z: number }, deltaTime: number): boolean {
        if (!entity.world) return false;
        
        // Calculate where the boat would be after this movement
        const nextPosition = {
            x: entity.position.x + velocity.x * deltaTime,
            y: entity.position.y,
            z: entity.position.z + velocity.z * deltaTime
        };
        
        // Check multiple points around the boat to ensure it's fully over water
        const checkPoints = [
            { x: 0, y: 0, z: 0 },     // Center
            { x: 1.5, y: 0, z: 0 },   // Front
            { x: -1.5, y: 0, z: 0 },  // Back
            { x: 0, y: 0, z: 1.5 },   // Left
            { x: 0, y: 0, z: -1.5 },  // Right
        ];
        
        // First rotate the check points based on boat rotation
        const rotatedPoints = checkPoints.map(point => {
            if (point.x === 0 && point.z === 0) return point; // Center point doesn't need rotation
            
            // Apply rotation to the offset
            const distance = Math.sqrt(point.x * point.x + point.z * point.z);
            const angle = Math.atan2(point.z, point.x) + this.currentRotation;
            
            return {
                x: distance * Math.cos(angle),
                y: 0,
                z: distance * Math.sin(angle)
            };
        });
        
        // Check if all points have water at the actual water surface level
        // We need to find the water surface at each check point, not just check near boat Y
        for (const offset of rotatedPoints) {
            const checkPos = {
                x: nextPosition.x + offset.x,
                y: nextPosition.y, // Use boat's Y as reference
                z: nextPosition.z + offset.z
            };
            
            // Find the actual water surface level at this position
            const waterSurfaceY = this.findWaterSurfaceAtPosition(entity, checkPos);
            if (waterSurfaceY === null) {
                console.log(`[BoatEntityController] isValidWaterPosition: No water surface found at checkPos ${checkPos.x.toFixed(2)}, ${checkPos.y.toFixed(2)}, ${checkPos.z.toFixed(2)}`);
                return false;
            }
            
            // Ensure the boat would be over water (boat should be near water surface)
            // Boat sits at waterSurfaceY + 0.7, so check if water exists at waterSurfaceY
            const blockAtSurface = entity.world?.chunkLattice.getBlockId({ 
                x: Math.floor(checkPos.x), 
                y: waterSurfaceY, 
                z: Math.floor(checkPos.z) 
            });
            // Water block ID from map.json: 74 = water
            const isWater = blockAtSurface === 74;
            
            if (!isWater) {
                console.log(`[BoatEntityController] isValidWaterPosition: Block at surface (${Math.floor(checkPos.x)}, ${waterSurfaceY}, ${Math.floor(checkPos.z)}) is not water (blockType=${blockAtSurface})`);
                return false;
            }
            
            // Check for solid blocks at boat's Y level (prevent moving through wood blocks, etc.)
            // Check a small range around boat Y to catch blocks that might intersect with boat
            const boatY = Math.floor(nextPosition.y);
            for (let checkY = boatY; checkY <= boatY + 1; checkY++) {
                const blockAtBoatLevel = entity.world?.chunkLattice.getBlockId({ 
                    x: Math.floor(checkPos.x), 
                    y: checkY, 
                    z: Math.floor(checkPos.z) 
                });
                
                // Block ID 0 is air, water block is 74
                // Any other block ID is a solid block that would block the boat
                if (blockAtBoatLevel !== undefined && blockAtBoatLevel !== 0 && 
                    blockAtBoatLevel !== 74) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Find the water surface level at a given position
     * Returns the Y coordinate of the topmost water block, or null if no water found
     */
    private findWaterSurfaceAtPosition(entity: BoatEntity, position: { x: number, y: number, z: number }): number | null {
        if (!entity.world) {
            console.warn(`[BoatEntityController] findWaterSurfaceAtPosition: No world available`);
            return null;
        }
        
        // Check both floor and round for X and Z to handle edge cases
        const xFloor = Math.floor(position.x);
        const xRound = Math.round(position.x);
        const zFloor = Math.floor(position.z);
        const zRound = Math.round(position.z);
        const startY = Math.floor(position.y);
        
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
        
        // Search from boat level upward first (water might be at or above boat level)
        for (const coord of checkCoords) {
            for (let y = startY + 3; y >= startY - 1; y--) {
                const blockType = entity.world.chunkLattice.getBlockId({ x: coord.x, y, z: coord.z });
                if (WATER_BLOCK_IDS.includes(blockType ?? 0)) {
                    // Found water, return this Y level as the surface
                    console.log(`[BoatEntityController] Found water surface at Y=${y} (position ${coord.x}, ${coord.z}, near boat level)`);
                    return y;
                }
            }
        }
        
        // If not found near boat level, search down more extensively
        for (const coord of checkCoords) {
            for (let y = startY - 2; y >= Math.max(0, startY - 20); y--) {
                const blockType = entity.world.chunkLattice.getBlockId({ x: coord.x, y, z: coord.z });
                if (WATER_BLOCK_IDS.includes(blockType ?? 0)) {
                    console.log(`[BoatEntityController] Found water surface at Y=${y} (position ${coord.x}, ${coord.z}, extended search)`);
                    return y;
                }
            }
        }
        
        console.warn(`[BoatEntityController] No water found at position (${position.x}, ${position.y}, ${position.z})`);
        return null; // No water found
    }
}