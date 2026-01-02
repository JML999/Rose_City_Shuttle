// FishingLine.ts - Create a simple fishing bobber that floats on water
import { Entity, World, Vector3, Player, RigidBodyType, Quaternion, EntityEvent } from "hytopia";

export class FishingLine {
    private bobber: Entity | null = null;
    private world: World;
    private player: Player | null = null;
    private targetPosition: Vector3 | null = null;
    private waterLevel: number = 0;
    private isBiting: boolean = false; // Track if fish is biting
    private bobberSinkStartTime: number = 0; // Track when bobber started sinking
    private fishLure: Entity | null = null; // For the decorative lure
    
    // Animation configuration - easy to adjust
    private readonly CONFIG = {
        // Bobber size
        BOBBER_SIZE: 0.15,
        BOBBER_HEIGHT_OFFSET: 0.3, // How high above water (increased to keep bobber visible)
        
        // Normal bobbing animation
        BOB_AMPLITUDE: 0.05,       // How high the bobber bobs
        BOB_FREQUENCY: 0.8,        // Speed of primary bobbing
        SECONDARY_BOB_AMPLITUDE: 0.01, // Secondary wave height
        SECONDARY_BOB_FREQUENCY: 2.1,  // Secondary wave speed
        DRIFT_RADIUS: 0.02,        // How far the bobber drifts in X/Z
        DRIFT_SPEED: 0.7,          // Speed of circular drift
        
        // Bite animation - Jump phase
        JUMP_DURATION: 0.3,        // Seconds for upward jump
        JUMP_HEIGHT: 0.8,          // Units to jump up
        JUMP_TILT: -0.8,           // Forward tilt during jump
        
        // Bite animation - Splash phase
        SPLASH_DURATION: 0.8,      // Seconds for splash down
        SPLASH_JITTER: 0.09,       // Random movement in splash
        
        // Bite animation - Sink phase
        SINK_SPEED: 0.8,           // Speed of sinking
        SINK_MAX_DEPTH: 0.8,       // Maximum sink depth
        STRUGGLE_AMPLITUDE: 0.09,  // Size of struggle movements
        STRUGGLE_FREQUENCY: 8,     // Speed of struggle movements
        SPIN_SPEED: 0.9,           // How fast it spins while sinking
        WOBBLE_AMPLITUDE: 0.3,     // Amount of wobble while sinking
        WOBBLE_FREQUENCY: 6        // Speed of wobble
    };
    
    constructor(world: World) {
        this.world = world;
    }
    
    /**
     * Create a bobber at the target position
     */
    castLine(player: Player, targetPosition: Vector3): void {
        // Clear any existing line
        this.clear();
        
        // Store player and target for updates
        this.player = player;
        this.targetPosition = targetPosition;
        
        console.log("Creating bobber at water point");
        
        // Find the exact water level
        this.waterLevel = this.findWaterLevel(targetPosition);
        
        // Create bobber at the target position
        this.createBobberEntity(targetPosition);
    }
    
    /**
     * Find the actual water level at a position
     */
    private findWaterLevel(position: Vector3): number {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        // Check the exact block position first
        const blockType = this.world.chunkLattice.getBlockId({ x, y, z });
        if (blockType === 77 || blockType === 78 || blockType === 100) { // Water block IDs
            return y + 0.85; // Float slightly above water surface
        }
        
        // If not found, search down a few blocks
        for (let searchY = y; searchY >= Math.max(0, y - 3); searchY--) {
            const blockType = this.world.chunkLattice.getBlockId({ x, y: searchY, z });
            if (blockType === 77 || blockType === 78 ) { // Water block IDs
                return searchY + 0.85; // Float slightly above water surface
            }
        }
        
        // Default to the original position if no water found
        return position.y;
    }
    
    /**
     * Create a bobber entity at the target position
     */
    private createBobberEntity(position: Vector3): void {
        this.bobber = new Entity({
            name: 'FishingBobber',
            blockTextureUri: 'blocks/bobber', // Bobber texture
            blockHalfExtents: { 
                x: this.CONFIG.BOBBER_SIZE,
                y: this.CONFIG.BOBBER_SIZE,
                z: this.CONFIG.BOBBER_SIZE
            },
            // Add physics to interact with water but not sink
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_POSITION,
            }
        });
        
        // Position at the exact water level
        this.bobber.spawn(this.world, { 
            x: position.x, 
            y: this.waterLevel + this.CONFIG.BOBBER_HEIGHT_OFFSET,
            z: position.z 
        });
        
        // Add tick handler for animation
        this.bobber.on(EntityEvent.TICK, this.animateBobber.bind(this));
        
        console.log("Added bobber at the water surface, level:", this.waterLevel);
    }
    
    /**
     * Start a bite animation (bobber sinks when fish bites)
     */
    startBite(): void {
        if (!this.bobber || !this.targetPosition) return;
        
        // Bite animation logging removed to reduce console spam
        this.isBiting = true;
        this.bobberSinkStartTime = Date.now() / 1000;
    }
    
    /**
     * Animate the bobber on tick events
     */
    private animateBobber(): void {
        if (!this.bobber || !this.targetPosition) return;
        
        // Get current time for wave calculation
        const time = Date.now() / 1000; // Convert to seconds
        
        // Check if fish is biting
        if (this.isBiting) {
            // Calculate how long the bite has been happening
            const biteTime = time - this.bobberSinkStartTime;
            
            // First phase: Quick upward jump
            if (biteTime < this.CONFIG.JUMP_DURATION) {
                const jumpHeight = Math.sin(biteTime * Math.PI / this.CONFIG.JUMP_DURATION) * this.CONFIG.JUMP_HEIGHT;
                
                this.bobber.setPosition({
                    x: this.targetPosition.x,
                    y: this.waterLevel + this.CONFIG.BOBBER_HEIGHT_OFFSET + jumpHeight,
                    z: this.targetPosition.z
                });
                
                // Slight tilt as it jumps
                this.bobber.setRotation(Quaternion.fromEuler(
                    this.CONFIG.JUMP_TILT,
                    0,
                    0
                ));
                
                return;
            }
            
            // Second phase: Fall and splash
            const splashEndTime = this.CONFIG.JUMP_DURATION + this.CONFIG.SPLASH_DURATION;
            if (biteTime < splashEndTime) {
                const fallTime = biteTime - this.CONFIG.JUMP_DURATION;
                const fallProgress = fallTime / this.CONFIG.SPLASH_DURATION;
                const fallPosition = this.CONFIG.JUMP_HEIGHT * (1 - fallProgress);
                
                this.bobber.setPosition({
                    x: this.targetPosition.x + (Math.random() - 0.5) * this.CONFIG.SPLASH_JITTER,
                    y: this.waterLevel + this.CONFIG.BOBBER_HEIGHT_OFFSET + fallPosition,
                    z: this.targetPosition.z + (Math.random() - 0.5) * this.CONFIG.SPLASH_JITTER
                });
                
                // Rotate as it falls
                this.bobber.setRotation(Quaternion.fromEuler(
                    this.CONFIG.JUMP_TILT + (fallProgress * 0.6),
                    0,
                    0
                ));
                
                return;
            }
            
            // Third phase: Sink beneath water
            const sinkTime = biteTime - splashEndTime;
            const sinkDepth = Math.min(this.CONFIG.SINK_MAX_DEPTH, sinkTime * this.CONFIG.SINK_SPEED);
            
            // Position the bobber - sinking below the water with slight jitter
            this.bobber.setPosition({
                x: this.targetPosition.x + Math.sin(sinkTime * this.CONFIG.STRUGGLE_FREQUENCY) * this.CONFIG.STRUGGLE_AMPLITUDE,
                y: this.waterLevel - sinkDepth,
                z: this.targetPosition.z + Math.cos(sinkTime * this.CONFIG.STRUGGLE_FREQUENCY) * this.CONFIG.STRUGGLE_AMPLITUDE
            });
            
            // Add dramatic rotating as it's pulled under
            this.bobber.setRotation(Quaternion.fromEuler(
                0.3 + sinkTime * Math.PI,
                sinkTime * Math.PI * this.CONFIG.SPIN_SPEED,
                Math.sin(sinkTime * this.CONFIG.WOBBLE_FREQUENCY) * this.CONFIG.WOBBLE_AMPLITUDE
            ));
            
            return; // Skip normal bobbing when sinking
        }
        
        // Normal bobbing animation when not biting
        
        // More pronounced vertical bobbing motion
        const bobHeight = Math.sin(time * this.CONFIG.BOB_FREQUENCY) * this.CONFIG.BOB_AMPLITUDE;
        
        // Add a secondary faster wave for more natural water behavior
        const secondaryBob = Math.sin(time * this.CONFIG.SECONDARY_BOB_FREQUENCY) * this.CONFIG.SECONDARY_BOB_AMPLITUDE;
        
        // Combine primary and secondary bobbing motions
        const totalBobHeight = bobHeight + secondaryBob;
        
        // Small circular movement for natural water drift
        const jitterX = Math.sin(time * this.CONFIG.DRIFT_SPEED) * this.CONFIG.DRIFT_RADIUS;
        const jitterZ = Math.cos(time * this.CONFIG.DRIFT_SPEED) * this.CONFIG.DRIFT_RADIUS;
        
        // Gradual rotation based on time rather than random jumps
        this.bobber.setRotation(Quaternion.fromEuler(
            Math.sin(time * 0.4) * 0.03,
            time * 0.05 % (Math.PI * 2),
            Math.cos(time * 0.4) * 0.03
        ));
        
        // Keep bobber at water level with bobbing + subtle movement
        this.bobber.setPosition({
            x: this.targetPosition.x + jitterX,
            y: this.waterLevel + this.CONFIG.BOBBER_HEIGHT_OFFSET + totalBobHeight,
            z: this.targetPosition.z + jitterZ
        });
    }
    
    /**
     * Clear the bobber and any animations
     */
    clear(): void {
        // Stop bite animation
        this.isBiting = false;
        
        // Despawn bobber
        if (this.bobber) {
            try {
                this.bobber.despawn();
            } catch (e) {
                console.error("Error despawning bobber:", e);
            }
            this.bobber = null;
        }
        
        this.player = null;
        this.targetPosition = null;
    }
    
    /**
     * Update animation parameters - allows fine-tuning without restarting
     * @param paramName Name of the config parameter to update
     * @param value New value to set
     * @returns True if parameter was updated, false if not found
     */
    updateAnimationParam(paramName: string, value: number): boolean {
        // Check if the parameter exists in our config
        if (paramName in this.CONFIG) {
            // Type assertion to make TypeScript happy - we know this is a valid key
            (this.CONFIG as any)[paramName] = value;
            console.log(`Updated animation parameter ${paramName} to ${value}`);
            return true;
        }
        
        console.error(`Unknown animation parameter: ${paramName}`);
        return false;
    }
    
    /**
     * Get the current value of an animation parameter
     * @param paramName Name of the parameter to retrieve
     * @returns The parameter value or undefined if not found
     */
    getAnimationParam(paramName: string): number | undefined {
        if (paramName in this.CONFIG) {
            return (this.CONFIG as any)[paramName];
        }
        return undefined;
    }
    
    /**
     * List all available animation parameters and their current values
     * @returns Object with all parameters and values
     */
    listAnimationParams(): Record<string, number> {
        return { ...this.CONFIG };
    }
}