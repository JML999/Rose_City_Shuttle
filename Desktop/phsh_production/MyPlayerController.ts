import { Vector3, Audio, ColliderShape, CoefficientCombineRule, CollisionGroup, DefaultPlayerEntityController, DefaultPlayerEntity, EntityEvent } from "hytopia";
import type { PlayerEntity, PlayerInput, PlayerCameraOrientation, Entity, World, BlockType, Player } from "hytopia";
import { GamePlayerEntity } from "./GamePlayerEntity";
import * as math from './Utils/math';
import type { PlayerState, PlayerStateManager } from "./PlayerStateManager";
import { TerrainDamageManager } from "./Bait/TerrainDamageManager";
import BoatEntity from "./Inventory/BoatEntity";

// Support multiple water block IDs from different worlds:
// Main world: 77, 78, 150, 50, 73, 74
// Cave world: 10
const WATER_BLOCK_IDS = [10, 50, 73, 74, 77, 78, 150];

export class MyPlayerController extends DefaultPlayerEntityController {
    // REMOVED: private world: World; - Use entity.world instead to support world switching
    private lastBreathUpdate = 0;
    private lastBreathPercentage = 100;
    private BREATH_UPDATE_INTERVAL = 100; // Update UI every 100ms for smoother updates
    private stateManager: PlayerStateManager;
    private readonly SINKING_SWIM_GRAVITY = 1.0; // Default gravity when sinking is allowed
    private readonly MIN_SWIM_Y_LEVEL = 12;
    private lastNormalDebugLog = 0; // Throttle normal debug logging
    private readonly NORMAL_DEBUG_LOG_INTERVAL = 500; // Log every 500ms
    private lastSwimmingDebugLog = 0; // Throttle swimming debug logging
    private readonly SWIMMING_DEBUG_LOG_INTERVAL = 1000; // Log every 1 second
    
    /**
     * Get the swim Y level thresholds based on the current region.
     * Main world water level is around Y=11, cave world is 6 blocks lower (Y=5).
     */
    private getSwimYLevel(player: Player): { minMoveSwimY: number, minSwimY: number } {
        const regionId = this.stateManager.getCurrentRegionId(player);
        
        // Main world water level is around Y=11
        // Cave world (portal_1) water level is 6 blocks lower = Y=5
        const BASE_SWIM_Y = 11;
        const CAVE_Y_OFFSET = -6; // 6 blocks lower
        
        if (regionId === 'ancient-cave-1') {
            return {
                minMoveSwimY: BASE_SWIM_Y + CAVE_Y_OFFSET + 0.25, // 5.25
                minSwimY: BASE_SWIM_Y + CAVE_Y_OFFSET // 5
            };
        }
        
        // Default to main world values
        return {
            minMoveSwimY: BASE_SWIM_Y + 0.25, // 11.25
            minSwimY: BASE_SWIM_Y // 11
        };
    }

    constructor(world: World, stateManager: PlayerStateManager) {
        super();
        // NOTE: We don't store world here - use entity.world in methods to support world switching
        this.stateManager = stateManager;
        this.swimGravity = this.SINKING_SWIM_GRAVITY; // Allow player to sink initially
        this.swimFastVelocity = this.swimSlowVelocity;
    }

    /**
     * Ticks the player movement for the entity controller,
     * overriding the default implementation.
     */
    public tickWithPlayerInput(entity: DefaultPlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation, deltaTimeMs: number) {
        // Save the original input state before the parent method modifies it
        const originalInput = { ...input };
        const playerEntity = entity as GamePlayerEntity;
        
        // DEBUG: Log input BEFORE calling super.tickWithPlayerInput() (the parent controller)
        // This shows what the ENGINE provides to us initially
        if (playerEntity.isBoating) {

        } else {
            // DEBUG: Log for NORMAL gameplay (not mounted) - check velocity to detect joystick movement
            // Log when there's movement (velocity) OR when flags are set, throttled to avoid spam
            const hasVelocity = Math.abs(entity.linearVelocity.x) > 0.1 || Math.abs(entity.linearVelocity.z) > 0.1;
            const hasInputFlags = input.w || input.a || input.s || input.d;
            const now = Date.now();
            const shouldLog = (hasVelocity || hasInputFlags) && (now - this.lastNormalDebugLog > this.NORMAL_DEBUG_LOG_INTERVAL);
            
            if (shouldLog) {
                this.lastNormalDebugLog = now;
            }
        }
        
        // ALWAYS call parent first to let it process joystick input and set input.w/a/s/d flags
        // The parent controller reads input.w/a/s/d and applies velocity, but the ENGINE
        // needs to set those flags from joystick first. Calling parent allows this to happen.
        const savedPosition = playerEntity.isBoating ? { 
            x: entity.position.x, 
            y: entity.position.y, 
            z: entity.position.z 
        } : null;
        const savedVelocity = playerEntity.isBoating ? { 
            x: entity.linearVelocity.x, 
            y: entity.linearVelocity.y, 
            z: entity.linearVelocity.z 
        } : null;
        
        // Call super.tickWithPlayerInput() - this calls DefaultPlayerEntityController.tickWithPlayerInput()
        // The parent controller processes input and applies movement velocity to the entity
        // For normal movement, parent applies velocity (which we want)
        // For boating, parent will try to apply velocity (which we'll restore)
        super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);
        
        // DEBUG: Log input AFTER calling super.tickWithPlayerInput() for normal gameplay
        // This shows if the parent controller changed anything
        if (!playerEntity.isBoating) {
            const hasVelocity = Math.abs(entity.linearVelocity.x) > 0.1 || Math.abs(entity.linearVelocity.z) > 0.1;
            const hasInputFlags = input.w || input.a || input.s || input.d;
            const now = Date.now();
            const shouldLog = (hasVelocity || hasInputFlags) && (now - this.lastNormalDebugLog > this.NORMAL_DEBUG_LOG_INTERVAL);
            
          
        }
        
        // Now handle boating - input.w/a/s/d should be set by engine/parent
        if (playerEntity.isBoating && savedPosition && savedVelocity) {
            // Capture the velocity that parent controller set (before we restore it)
            const newVelocity = {
                x: entity.linearVelocity.x,
                y: entity.linearVelocity.y,
                z: entity.linearVelocity.z
            };
            
           
            // Check if parent controller processed joystick (velocity changed significantly)
            const velocityChanged = Math.abs(newVelocity.x - savedVelocity.x) > 0.1 || 
                                    Math.abs(newVelocity.z - savedVelocity.z) > 0.1;
            
            // Restore entity position/velocity so parent doesn't move the player
            entity.setPosition(savedPosition);
            entity.setLinearVelocity(savedVelocity);
            
            // If input.w/a/s/d are still not set, check if parent controller processed joystick via velocity
            if (!input.w && !input.a && !input.s && !input.d) {
                // First try player.input (engine might set flags there)
                const playerInput = playerEntity.player.input as PlayerInput;
                if (playerInput.w || playerInput.a || playerInput.s || playerInput.d) {
                    input.w = playerInput.w || false;
                    input.a = playerInput.a || false;
                    input.s = playerInput.s || false;
                    input.d = playerInput.d || false;
                } else if (velocityChanged) {
                   
                    // Get camera forward and right vectors for direction calculation
                    const cameraForward = Vector3.fromVector3Like(entity.player.camera.facingDirection);
                    const cameraRight = new Vector3(-cameraForward.z, 0, cameraForward.x);
                    
                    // Project velocity onto camera-relative directions (horizontal plane only)
                    const forward = new Vector3(cameraForward.x, 0, cameraForward.z).normalize();
                    const right = new Vector3(cameraRight.x, 0, cameraRight.z).normalize();
                    
                    const velocity2D = new Vector3(newVelocity.x, 0, newVelocity.z);
                    const forwardDot = velocity2D.dot(forward);
                    const rightDot = velocity2D.dot(right);
                    
                    // Convert to WASD flags (threshold to avoid noise)
                    const threshold = 0.5;
                    input.w = forwardDot > threshold;
                    input.s = forwardDot < -threshold;
                    input.d = rightDot > threshold;
                    input.a = rightDot < -threshold;   
                }
            }
            
            // Now input.w/a/s/d should be set (either by parent, from player.input, or converted from velocity)
            // Pass to boat controller - works the same as WASD!
            if (playerEntity.currentBoat) {
            
                
                // Pass input to boat controller (now has w/a/s/d set, same as WASD)
                playerEntity.currentBoat.processMovementInput(input, cameraOrientation, deltaTimeMs);
                
                // Handle dismount with space key
                if (input.sp) {
                    playerEntity.currentBoat.dismountPlayer();
                }
            }
        }
        
        if (!entity.isSpawned || !entity.world) return;
        
       
        const state = playerEntity.stateManager?.getState(playerEntity.player);
        if (!state) return;

        // Check for movement input and abort fishing if needed
        if ((input.w || input.a || input.s || input.d) && 
            (state.fishing.isPlayerFishing || 
             state.fishing.isCasting || 
             state.fishing.isJigging || 
             state.fishing.reelingGame?.isReeling)) {
            playerEntity.abortFishing(playerEntity.player);
        }

        const hasRodEquipped = !!playerEntity.getEquippedRod(playerEntity.player);
        
        // Use the original input state for digging
        this.handleDigging(playerEntity, originalInput);
        this.handleFishing(playerEntity, input, state, hasRodEquipped);
        this.handleMerchantInteractions(playerEntity, input, state);

        // Store last input state
        playerEntity.updateLastInputState({ ml: originalInput.ml });
    }

    /**
     * Called when the controller is attached to an entity.
     */
    public attach(entity: DefaultPlayerEntity) {
        // Call the parent implementation first
        super.attach(entity);
    }

    /**
     * Called when the controlled entity is spawned.
     */
    public spawn(entity: DefaultPlayerEntity) {
        // Call the parent implementation first
        super.spawn(entity);
    }

    /**
     * Called every frame for the entity.
     */
    public tick(entity: DefaultPlayerEntity, deltaTimeMs: number) {
        const tickStart = Date.now();
        super.tick(entity, deltaTimeMs);
        
        if (!entity.isSpawned || !entity.world) return;
        
        const playerEntity = entity as GamePlayerEntity;

        if (!playerEntity.world) return;

        // Death check - only trigger if player is not already dead
        if (playerEntity.position.y < -10 && !playerEntity.isDead) {
            playerEntity.handleDeath();
            return;
        }
        
        const lastInputState = playerEntity.getLastInputState() || {};
        playerEntity.updateLastInputState({ 
            ml: playerEntity.player.input.ml,
            mr: playerEntity.player.input.mr,  // Add mr tracking
            sp: playerEntity.player.input.sp 
        });
        
        // --- BREATH SYSTEM ---
        // Skip breath updates if player is boating (boats handle their own buoyancy)
        if (!playerEntity.isBoating) {
            // Check if player is in water using SDK's isSwimming (detects liquid blocks)
            // Use fallback check with checkWaterZone for more reliable detection
            const sdkIsSwimming = this.isSwimming;
            const fallbackIsInWater = playerEntity.checkWaterZone();
            const isInWater = sdkIsSwimming || fallbackIsInWater;
            
            // Debug logging for swimming detection (throttled)
            const now = Date.now();
            if (now - this.lastSwimmingDebugLog > this.SWIMMING_DEBUG_LOG_INTERVAL) {
                if (isInWater || sdkIsSwimming || fallbackIsInWater) {
                    console.log(`[MyPlayerController] Swimming state - SDK: ${sdkIsSwimming}, Fallback: ${fallbackIsInWater}, Combined: ${isInWater}, World: ${entity.world?.id || 'unknown'}`);
                }
                this.lastSwimmingDebugLog = now;
            }
            
            // Check if player just jumped while in water (penalty for jumping in water)
            const wasJumping = lastInputState?.sp;
            const isJumping = playerEntity.player.input.sp;
            const justJumped = !wasJumping && isJumping;
            
            if (justJumped && isInWater) {
                // Minimal penalty for jumping in water - just enough to offset the brief benefit
                // of jumping out of water (prevents exploit)
                const jumpBreathPenalty = 1; // Very small penalty - minimal tick down
                playerEntity.reduceBreath(jumpBreathPenalty);
                // Immediately update UI after jump penalty
                const currentBreath = playerEntity.getCurrentBreathPercentage();
                playerEntity.sendBreathUpdate(currentBreath);
                this.lastBreathUpdate = Date.now();
                this.lastBreathPercentage = currentBreath;
            }
            
            // Update breath based on water state
            playerEntity.updateBreath(deltaTimeMs, isInWater);
            
            // Throttled UI updates for breath - send updates more frequently for smoother UI
            const currentBreath = playerEntity.getCurrentBreathPercentage();
            const timeSinceLastUpdate = Date.now() - this.lastBreathUpdate;
            
            // Send initial update or update if enough time has passed (even small changes)
            // Reduced threshold to 0.5% for smoother updates
            if (this.lastBreathUpdate === 0 || 
                (timeSinceLastUpdate >= this.BREATH_UPDATE_INTERVAL && 
                 Math.abs(currentBreath - this.lastBreathPercentage) >= 0.5)) {
                playerEntity.sendBreathUpdate(currentBreath);
                this.lastBreathUpdate = Date.now();
                this.lastBreathPercentage = currentBreath;
            }
        }
        
        // Skip underwater physics if player is boating or transitioning to boat
        if (!playerEntity.isBoating) {
            // Get region-specific swim Y levels (main world: 11/11.25, cave: 5/5.25)
            const swimYLevels = this.getSwimYLevel(playerEntity.player);
            
            if (this.isSwimming && entity.position.y < swimYLevels.minMoveSwimY) {
                const input = playerEntity.player.input;
                const isMoving = input.w || input.a || input.s || input.d;
                const isSwimmingUp = entity.linearVelocity.y > 0.5; // SDK swim up
                if (!isSwimmingUp) {
                    let upwardY = 0;
                    if (isMoving) {
                        upwardY = 1;
                    }
                    try {
                        entity.rawRigidBody?.setLinvel({
                            x: entity.linearVelocity.x,
                            y: upwardY,
                            z: entity.linearVelocity.z
                        });
                    } catch (error) {
                        console.warn("[MyPlayerController] Could not set linear velocity during swimming (1):", error);
                    }
                }
            }

            if (this.isSwimming && entity.position.y < swimYLevels.minSwimY) {
                const input = playerEntity.player.input;
                const isMoving = input.w || input.a || input.s || input.d;
                const isSwimmingUp = entity.linearVelocity.y > 0.5; // SDK swim up
                if (!isSwimmingUp) {
                    let upwardY = 5;
                    try {
                        entity.rawRigidBody?.setLinvel({
                            x: entity.linearVelocity.x,
                            y: upwardY,
                            z: entity.linearVelocity.z
                        });
                    } catch (error) {
                        console.warn("[MyPlayerController] Could not set linear velocity during swimming (2):", error);
                    }
                }
            }
        }
        const tickEnd = Date.now();
    }

    private terrainDamager = TerrainDamageManager.getInstance();
    private handleDigging(playerEntity: GamePlayerEntity, input: PlayerInput): void {
        if (!input.ml) return;
        const p0 = Date.now();
        const aimResult = this.calculateAimDirection(playerEntity, 3.0);
        const p1 = Date.now();
        if (!aimResult || typeof aimResult === 'object' && !('origin' in aimResult)) {
            return;
        }

        // CRITICAL: Use entity's current world, not stored world (supports world switching)
        const entityWorld = playerEntity.world;
        if (!entityWorld) {
            console.warn("[MyPlayerController] Cannot interact - entity has no world");
            return;
        }
        
        const p2 = Date.now();
        const raycastResult = entityWorld.simulation.raycast(
            aimResult.origin,
            aimResult.direction,
            3.0,
            { filterExcludeRigidBody: playerEntity.rawRigidBody }
        );
        const p3 = Date.now();

        // First check if we hit a boat entity
        if (raycastResult?.hitEntity instanceof BoatEntity) {
            this.enterBoat(playerEntity, raycastResult.hitEntity as BoatEntity);
            return;
        }

        // Continue with normal block interaction if we didn't hit a boat
        if (raycastResult?.hitBlock) {
            const p4 = Date.now();
            const broken = this.terrainDamager.damageBlock(
                entityWorld,
                raycastResult.hitBlock,
                10,
                playerEntity.player
            );
            const p5 = Date.now(); 
        } 

        if (raycastResult?.hitEntity) {
            const hitPoint = new Vector3(raycastResult.hitPoint.x, raycastResult.hitPoint.y, raycastResult.hitPoint.z);
            const h0 = Date.now();
            playerEntity.handleBlockHit(raycastResult.hitEntity.id?.toString() || '', hitPoint, playerEntity.player);
            const h1 = Date.now();
        }
    }

    private enterBoat(playerEntity: GamePlayerEntity, boat: BoatEntity): void {
        // If player is already in a boat, ignore the interaction
        if (playerEntity.isBoating) {
            return;
        }

        // Ownership check
        const playerInventory = playerEntity.stateManager.getInventory(playerEntity.player);
        const ownsBoat = playerInventory?.items.some(
            item => item.type === 'boat' && item.metadata.boatStats?.key === boat.ownerBoatKey
        );

        if (!ownsBoat) {
            this.stateManager.sendGameMessage(playerEntity.player, 'You do not own this boat!');
            return;
        }

        // If boat has no driver, mount the player
        if (!boat.driver) {
            boat.mountPlayer(playerEntity);
            return; // Skip block interaction
        }
    }

    private handleFishing(
        playerEntity: GamePlayerEntity, 
        input: PlayerInput, 
        state: PlayerState,
        hasRodEquipped: boolean
    ): void {
        if (!hasRodEquipped) return;
        // Handle casting start
        if (this.shouldStartCasting(input, state, playerEntity)) {
            input.mr = false;
            playerEntity.handleFishing();
        }
        // Restrict movement while fishing
        if (this.isInFishingState(state)) {
            this.restrictMovement(input);
        }
        playerEntity.setFishingTick();
    }
    
    private shouldStartCasting(input: PlayerInput, state: PlayerState, playerEntity: GamePlayerEntity): boolean {
        // Check if player is in water (prevent fishing while swimming/standing in water)
        const sdkIsSwimming = this.isSwimming;
        const fallbackIsInWater = playerEntity.checkWaterZone();
        const isInWater = sdkIsSwimming || fallbackIsInWater;
        
        if (isInWater && !playerEntity.isBoating) {
            return false; // Cannot fish while in water (unless on a boat)
        }
        
        // Standard casting checks
        if (!input.mr) return false;
        if (state.fishing.lastInputState?.mr) return false;
        if (state.fishing.isPlayerFishing) return false;
        if (state.fishing.reelingGame?.isReeling) return false;
        if (state.fishing.lastInputState?.ml) return false; 
        return true;
    }

    private isInFishingState(state: PlayerState): boolean {
        return state.fishing.isCasting || 
               state.fishing.isReeling || 
               state.fishing.isPlayerFishing;
    }

    private restrictMovement(input: PlayerInput): void {
        input.w = false;
        input.a = false;
        input.s = false;
        input.d = false;
    }

    //OLD MERCHANT INTERACTIONS
    private handleMerchantInteractions(
        playerEntity: GamePlayerEntity, 
        input: PlayerInput, 
        state: PlayerState
    ): void {
        // Merchant system removed - this method is now empty
    }

    protected calculateAimDirection(entity: DefaultPlayerEntity, maxDistance: number) { 
        // Get camera orientation
        const camera = entity.player.camera;
        const cameraPos = camera.attachedToEntity?.position;
        const cameraForward = Vector3.fromVector3Like(camera.facingDirection).normalize();

        // Get the vertical angle (pitch) of the camera
        const pitch = camera.orientation.pitch;


        // Project camera forward onto horizontal plane for consistent rotation
        const horizontalForward = new Vector3(
            cameraForward.x,
            0,  // Zero out Y component
            cameraForward.z
        );

        // Calculate right vector for camera offset
        const rightVector = new Vector3(
            -cameraForward.z,
            0,
            cameraForward.x
        ).normalize();

        // Use world up vector to rotate left
        const angleInRadians = -0.23 - pitch*pitch*0.15; 
        const rotatedHorizontal = math.rotateForwardVector(horizontalForward, angleInRadians);
        // Apply the same pitch to our rotated direction

        const finalDirection = new Vector3(
            rotatedHorizontal.x * Math.cos(pitch),
            Math.sin(pitch),
            rotatedHorizontal.z * Math.cos(pitch)
        ).normalize();

        if (!cameraPos) return;

        // Apply right offset only to camera/raycast position
        const rightOffset = camera.filmOffset * 0.038;
        const heightOffset = camera.offset.y ;
        let raycastPos = new Vector3(
            cameraPos.x + rightVector.x * rightOffset,
            cameraPos.y + heightOffset,
            cameraPos.z + rightVector.z * rightOffset
        );

        // Add forward offset based on zoom
        const forwardOffset = -camera.zoom/2;  // Adjust multiplier as needed
        raycastPos.add(Vector3.fromVector3Like(cameraForward).scale(forwardOffset));

        
        // Original projectile origin without right offset
        const originForwardOffset = 0.15;
        const origin = new Vector3(
            entity.position.x + finalDirection.x * originForwardOffset,
            entity.position.y + 0.35 + finalDirection.y * originForwardOffset,
            entity.position.z + finalDirection.z * originForwardOffset
        );
       
        const originOffset = 0.35;
        origin.x += rightVector.x * originOffset;
        origin.z += rightVector.z * originOffset;

        // CRITICAL: Use entity's current world, not stored world (supports world switching)
        const entityWorld = entity.world;
        if (!entityWorld) {
            console.warn("[MyPlayerController] Cannot raycast - entity has no world");
            return new Vector3(raycastPos.x, raycastPos.y, raycastPos.z)
                .add(new Vector3(finalDirection.x, finalDirection.y, finalDirection.z).scale(maxDistance));
        }
        
        // Raycast from offset camera position
        const raycastResult = entityWorld.simulation.raycast(
            raycastPos,
            finalDirection,
            maxDistance,
            { filterExcludeRigidBody: entity.rawRigidBody }
        );

        // If we hit nothing return the max distance point
        const targetPoint = raycastResult?.hitPoint ||
            new Vector3(raycastPos.x, raycastPos.y, raycastPos.z)
                .add(new Vector3(finalDirection.x, finalDirection.y, finalDirection.z).scale(maxDistance));

        // Projectiles Direction from player towards the target point
        const direction = new Vector3(
            targetPoint.x - origin.x,
            targetPoint.y - origin.y,
            targetPoint.z - origin.z
        );

        return { origin, direction };
    }
}