import { Vector3, World, Entity, RigidBodyType, Quaternion } from "hytopia";
import type { ActiveHotspot } from "./FishingHotspots";

// --- Visual Effect Configuration ---
export interface HotspotVisualConfig {
    fishCount: number; // Number of jumping fish per hotspot
    jumpInterval: number; // Seconds between jumps
    jumpHeight: number; // How high fish jump
    jumpDuration: number; // How long each jump takes
    fishModel: string; // Fish model to use
    waterBlockType: string; // Block type for water ripples
}

// Fish model pool for variety
const JUMPING_FISH_MODELS = [
    'models/npcs/blue_fish.gltf',
    'models/npcs/sardine.gltf',
];

export const DEFAULT_VISUAL_CONFIG: HotspotVisualConfig = {
    fishCount: 3,
    jumpInterval: 2, // Jump every 2 seconds (faster for testing)
    jumpHeight: 3, // Jump 3 blocks high (more dramatic)
    jumpDuration: 1.5, // 1.5 second jump animation (slightly longer)
    fishModel: 'assets/models/npcs/sardine.gltf', // Default fish model (can be overridden)
    waterBlockType: 'water-still' // For splash effects
};

// --- Fish Entity Data ---
interface JumpingFish {
    entity: Entity;
    basePosition: Vector3;
    isJumping: boolean;
    nextJumpTime: number;
    jumpStartTime: number;
    hotspotId: string;
}

// --- Water Splash Data ---
interface WaterSplash {
    entities: Entity[];
    spawnTime: number;
    hotspotId: string;
    position: Vector3;
}

// --- Hotspot State for Continuous Effects ---
interface HotspotState {
    hotspotId: string;
    centerPosition: Vector3;
    radius: number;
    lastSplashTime: number;
    splashInterval: number; // How often to create new splashes
    lastFishJumpTime: number; // When fish last jumped
    fishJumpInterval: number; // How often fish jump
}

// --- Hotspot Visual Effects Manager ---
export class HotspotVisualManager {
    private world: World;
    private config: HotspotVisualConfig;
    private activeFish: Map<string, JumpingFish[]> = new Map();
    private activeSplashes: Map<string, WaterSplash[]> = new Map();
    private hotspotStates: Map<string, HotspotState> = new Map();

    constructor(world: World, config: HotspotVisualConfig = DEFAULT_VISUAL_CONFIG) {
        this.world = world;
        this.config = config;
    }

    // --- Main Effect Management ---
    spawnHotspotEffects(hotspot: ActiveHotspot): void {
        
        // Create hotspot state for continuous effects
        const hotspotState: HotspotState = {
            hotspotId: hotspot.location.id,
            centerPosition: hotspot.location.position,
            radius: hotspot.location.radius,
            lastSplashTime: Date.now(),
            splashInterval: 3000 + Math.random() * 2000, // ⚡ TESTING: 3-5 seconds for background splashes (was 15-25)
            lastFishJumpTime: Date.now(),
            fishJumpInterval: 1000 + Math.random() * 2000 // ⚡ TESTING: 1-3 seconds between fish jumps (was 6-12)
        };
        
        this.hotspotStates.set(hotspot.location.id, hotspotState);
        this.spawnJumpingFish(hotspot);
        this.spawnInitialSplashes(hotspot);
    }

    removeHotspotEffects(hotspot: ActiveHotspot): void {
        
        this.removeJumpingFish(hotspot.location.id);
        this.removeWaterSplashes(hotspot.location.id);
        this.hotspotStates.delete(hotspot.location.id);
    }

    // --- Fish Animation System ---
    private spawnJumpingFish(hotspot: ActiveHotspot): void {
        // Don't spawn persistent fish - instead we'll spawn jumping fish on demand in the update loop
        // This creates the initial state but no persistent entities
    }

    private removeJumpingFish(hotspotId: string): void {
        const fishList = this.activeFish.get(hotspotId);
        if (!fishList) return;

        // Remove all fish entities
        fishList.forEach(fish => {
            if (fish.entity) {
                fish.entity.despawn();
            }
        });

        this.activeFish.delete(hotspotId);
    }

    // --- Physics-Based Fish Jumping ---
    private createJumpingFish(hotspotState: HotspotState): void {
        
        // Keep fish count reasonable for performance (1-2 fish)
        const fishCount = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < fishCount; i++) {
            // Random position within hotspot radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * hotspotState.radius * 0.7;
            
            // Fish start AT water level (like they're swimming)
            const fishStartPosition = new Vector3(
                hotspotState.centerPosition.x + Math.cos(angle) * distance,
                hotspotState.centerPosition.y, // Start at water level
                hotspotState.centerPosition.z + Math.sin(angle) * distance
            );

            // Calculate jump trajectory - arc to a point and back
            const jumpDistance = 1.0 + Math.random() * 1.5; // Jump 1-2.5 blocks forward
            const jumpHeight = 1.5 + Math.random() * 1.0; // Jump 1.5-2.5 blocks high
            const jumpAngle = Math.random() * Math.PI * 2; // Random direction
            
            const fishLandingPosition = new Vector3(
                fishStartPosition.x + Math.cos(jumpAngle) * jumpDistance,
                hotspotState.centerPosition.y, // Land back at water level
                fishStartPosition.z + Math.sin(jumpAngle) * jumpDistance
            );

            // Select random fish model
            const fishModels = [
                'models/npcs/sardine.gltf',
            ];
            const randomFishModel = fishModels[Math.floor(Math.random() * fishModels.length)];

            // Create the jumping fish with initial upward velocity
            const fishEntity = new Entity({
                name: `HotspotJumpingFish_${hotspotState.hotspotId}_${i}`,
                modelUri: randomFishModel,
                modelScale: 0.8 + Math.random() * 0.4, // Vary size slightly
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY, // ✅ Much more performant than DYNAMIC
                    linearVelocity: {
                        x: (fishLandingPosition.x - fishStartPosition.x) * 1.2, // Horizontal velocity to reach landing
                        y: jumpHeight * 2.5, // Strong upward velocity for arc (will be modified mid-flight)
                        z: (fishLandingPosition.z - fishStartPosition.z) * 1.2
                    }
                }
            });
            
            // Initial rotation - fish pointing upward for takeoff
            const jumpDirectionX = fishLandingPosition.x - fishStartPosition.x;
            const jumpDirectionZ = fishLandingPosition.z - fishStartPosition.z;
            const jumpYaw = Math.atan2(jumpDirectionZ, jumpDirectionX); // Swap parameters to fix orientation
            
            const initialRotation = Quaternion.fromEuler(
                -Math.PI / 6, // 30° upward angle for takeoff
                jumpYaw, // Face the direction of the jump
                0
            );
            
            fishEntity.spawn(this.world, fishStartPosition, initialRotation);
            
            // Phase 1: Upward arc (400ms) - fish jumps up and out
            setTimeout(() => {
                if (fishEntity.isSpawned) {
                    // Mid-flight: rotate to diving position and add downward velocity
                    const divingRotation = Quaternion.fromEuler(
                        Math.PI / 4, // 45° downward for diving
                        jumpYaw, // Keep facing the same direction as the jump
                        0
                    );
                    fishEntity.setRotation(divingRotation);
                    
                    // Change velocity to fall toward landing point
                    fishEntity.setLinearVelocity({
                        x: (fishLandingPosition.x - fishStartPosition.x) * 1.5,
                        y: -jumpHeight * 2.0, // Downward velocity for realistic fall
                        z: (fishLandingPosition.z - fishStartPosition.z) * 1.5
                    });
                }
            }, 400); // Peak of jump
            
            // Phase 2: Remove fish when it hits water (800ms total jump time)
            setTimeout(() => {
                if (fishEntity.isSpawned) {
                    fishEntity.despawn();
                }
            }, 800);

            // Phase 3: Splash particles appear when fish hits water on the way down
            setTimeout(() => {
                this.createSplashParticlesAtPosition(fishLandingPosition);
            }, 850); // Slightly after fish "hits" water
        }
    }

    // --- Water Splash System ---
    private spawnInitialSplashes(hotspot: ActiveHotspot): void {
        this.spawnWaterSplashes(hotspot);
    }

    private spawnWaterSplashes(hotspot: ActiveHotspot): void {
        const center = hotspot.location.position;
        const radius = Math.min(hotspot.location.radius, 8); // Cap splash area

        // Create 3-5 splash points around the hotspot
        const splashCount = 3 + Math.floor(Math.random() * 3);
        const initialSplashPositions: Vector3[] = [];
        
        for (let i = 0; i < splashCount; i++) {
            const angle = (Math.PI * 2 * i) / splashCount + Math.random() * 0.5;
            const distance = radius * (0.2 + Math.random() * 0.5); // 20-70% of radius
            
            const splashPos = new Vector3(
                center.x + Math.cos(angle) * distance,
                center.y, // At water level
                center.z + Math.sin(angle) * distance
            );

            initialSplashPositions.push(splashPos);
        }

        // Create splash at each position
        initialSplashPositions.forEach(position => {
            this.createSplashParticlesAtPosition(position);
        });
    }

    private createSplashParticles(position: Vector3): Entity[] {
        const particles: Entity[] = [];
        const particleCount = 1 + Math.floor(Math.random() * 1); // 1-2 particles per splash for performance

        for (let i = 0; i < particleCount; i++) {
            const particle = new Entity({
                blockTextureUri: "blocks/water-still.png", // Use water texture
                blockHalfExtents: { x: 0.08, y: 0.08, z: 0.08 }, // Slightly larger than bait particles
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY, // ✅ Much more performant than DYNAMIC
                }
            });

            // Random spread around splash center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.6; // 0.6 block spread
            const height = Math.random() * 0.3 + 0.1; // 0.1-0.4 blocks above water
            
            const particlePos = new Vector3(
                position.x + Math.cos(angle) * distance,
                position.y + height,
                position.z + Math.sin(angle) * distance
            );
            
            particle.spawn(this.world, particlePos);

            // Apply kinematic velocity for splash effect
            setTimeout(() => {
                if (particle.isSpawned) {
                    // Apply upward velocity to simulate splash
                    particle.setLinearVelocity(new Vector3(
                        (Math.random() - 0.5) * 2, // Random horizontal velocity
                        Math.random() * 3 + 1, // Upward velocity 1-4
                        (Math.random() - 0.5) * 2
                    ));
                }
            }, 50 + i * 25); // Stagger particle launches

            particles.push(particle);
        }

        return particles;
    }

    private removeWaterSplashes(hotspotId: string): void {
        const splashes = this.activeSplashes.get(hotspotId);
        if (!splashes) return;

        // Remove all splash particles
        splashes.forEach(splash => {
            splash.entities.forEach(particle => {
                if (particle.isSpawned) {
                    particle.despawn();
                }
            });
        });

        this.activeSplashes.delete(hotspotId);
    }

    private cleanupExpiredSplashes(hotspotId: string): void {
        const splashes = this.activeSplashes.get(hotspotId);
        if (!splashes) return;

        const currentTime = Date.now();
        const filteredSplashes = splashes.filter(splash => {
            const age = currentTime - splash.spawnTime;
            if (age > 2000) { // 2 seconds
                // Remove expired splash particles
                splash.entities.forEach(particle => {
                    if (particle.isSpawned) {
                        particle.despawn();
                    }
                });
                return false;
            }
            return true;
        });

        if (filteredSplashes.length === 0) {
            this.activeSplashes.delete(hotspotId);
        } else {
            this.activeSplashes.set(hotspotId, filteredSplashes);
        }
    }

    // --- Animation Update Loop ---
    update(): void {
        const currentTime = Date.now();
        
        // No longer need to update individual fish animations since they're physics-based
        // Update continuous splash effects
        this.updateContinuousSplashes(currentTime);
        
        // Update fish jumping events
        this.updateFishJumping(currentTime);
    }

    private updateFishJumping(currentTime: number): void {
        for (const [hotspotId, state] of this.hotspotStates) {
            // Check if it's time for fish to jump
            if (currentTime - state.lastFishJumpTime >= state.fishJumpInterval) {
                this.createJumpingFish(state);
                state.lastFishJumpTime = currentTime;
                // Randomize next fish jump interval for variety
                state.fishJumpInterval = 1000 + Math.random() * 2000; // ⚡ TESTING: 1-3 seconds between fish jumps (was 6-12)
            }
        }
    }

    private updateContinuousSplashes(currentTime: number): void {
        for (const [hotspotId, state] of this.hotspotStates) {
            // Check if it's time for a background splash wave (separate from fish splashes)
            if (currentTime - state.lastSplashTime >= state.splashInterval) {
                this.createBackgroundSplashWave(state);
                state.lastSplashTime = currentTime;
                // Randomize next splash interval for variety
                state.splashInterval = 3000 + Math.random() * 2000; // ⚡ TESTING: 3-5 seconds for background splashes (was 15-25)
            }
        }
    }

    private createBackgroundSplashWave(state: HotspotState): void {
        
        // Create 1-2 background splash points (smaller than fish splashes)
        const splashCount = 1 + Math.floor(Math.random() * 2);
        const backgroundSplashPositions: Vector3[] = [];
        
        for (let i = 0; i < splashCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = state.radius * (0.3 + Math.random() * 0.4); // Different positioning
            
            const splashPos = new Vector3(
                state.centerPosition.x + Math.cos(angle) * distance,
                state.centerPosition.y, // At water level like fish splashes
                state.centerPosition.z + Math.sin(angle) * distance
            );

            backgroundSplashPositions.push(splashPos);
        }
        
        // Create splash at each position
        backgroundSplashPositions.forEach(position => {
            this.createSplashParticlesAtPosition(position);
        });
    }

    // --- Utility Methods ---
    setFishModel(modelPath: string): void {
        this.config.fishModel = modelPath;
    }

    setFishCount(count: number): void {
        this.config.fishCount = Math.max(1, Math.min(count, 6)); // 1-6 fish
    }

    setJumpFrequency(intervalSeconds: number): void {
        this.config.jumpInterval = Math.max(1, intervalSeconds);
    }

    // --- Debug Methods ---
    getActiveFishCount(): number {
        // With physics-based approach, we don't track persistent fish
        // Fish are temporary entities that spawn and despawn
        return 0; // Could implement counting if needed, but not essential
    }

    getActiveSplashCount(): number {
        let total = 0;
        for (const splashes of this.activeSplashes.values()) {
            total += splashes.length;
        }
        return total;
    }

    clearAllEffects(): void {
        // Remove any remaining fish (though they should auto-despawn)
        for (const hotspotId of this.activeFish.keys()) {
            this.removeJumpingFish(hotspotId);
        }
        
        // Remove all splashes
        for (const hotspotId of this.activeSplashes.keys()) {
            this.removeWaterSplashes(hotspotId);
        }
        
        // Clear all hotspot states
        this.hotspotStates.clear();
        
    }

    private createSplashParticlesAtPosition(position: Vector3): void {
        const particles: Entity[] = [];
        const particleCount = 2 + Math.floor(Math.random() * 2); // 2-3 particles per splash

        for (let i = 0; i < particleCount; i++) {
            const particle = new Entity({
                blockTextureUri: "blocks/water-still.png", // Use water texture
                blockHalfExtents: { x: 0.08, y: 0.08, z: 0.08 }, // Slightly larger than bait particles
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY, // ✅ Much more performant than DYNAMIC
                    linearVelocity: {
                        x: (Math.random() - 0.5) * 1.0, // Small horizontal spread
                        y: -2.0 - Math.random() * 1.0, // Fall down into water (2-3 blocks/sec downward)
                        z: (Math.random() - 0.5) * 1.0
                    }
                }
            });

            // Start splash particles just slightly above water surface
            const splashStartPos = new Vector3(
                position.x + (Math.random() - 0.5) * 0.3, // Small spread around impact point
                position.y + 0.6, // Start 0.6 blocks above water surface (was 0.2)
                position.z + (Math.random() - 0.5) * 0.3
            );

            particle.spawn(this.world, splashStartPos);
            particles.push(particle);

            // Despawn splash particles after they "sink" into water
            setTimeout(() => {
                if (particle.isSpawned) {
                    particle.despawn();
                }
            }, 400 + Math.random() * 200); // 400-600ms lifetime
        }

    }
} 