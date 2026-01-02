import { Player, type PlayerInput, DefaultPlayerEntityController } from "hytopia";
import { World } from "hytopia";
import { Vector3 } from "hytopia";
import { InventoryManager } from "../Inventory/InventoryManager";
//import mapData from '../assets/maps/map_test.json';
import mapData from '../assets/terrain.json'
import { Entity } from "hytopia";
import type { LevelingSystem } from '../LevelingSystem';
import { FISH_CATALOG } from './PhshTwoFIshCatalog';
import { EnchantmentHelper } from './EnchantmentHelper';
import type { ItemRarity } from '../Inventory/Inventory';
import type { PlayerStateManager } from "../PlayerStateManager";
import { MessageManager } from "../MessageManager";
import { FishSpawnManager, } from "./FishSpawnManager";
import  { GamePlayerEntity } from "../GamePlayerEntity";
import { ReelingMovementController, MovementPattern } from './ReelingMovementController';
import { LeaderboardManager } from "../LeaderboardManager";
import { ItemFactory, type CaughtFish } from "../Inventory/ItemFactory";
import { FishingLine } from "./Fishingline";
import GameManager from "../GameManager";

// Define the map data type
interface MapData {
    blocks: Record<string, number>;
    [key: string]: any;
}

export interface FishingState {
    isCasting: boolean;
    isReeling: boolean;
    isJigging: boolean;
    lastInputState: PlayerInput;
    castPower: number;
    isPlayerFishing: boolean;
    currentCatch: CaughtFish | null;
    reelingGame: ReelingState;
    fishVelocityY: number;
    fishDepth: number;
    fishingInterval: NodeJS.Timeout | null;
    castPosition?: Vector3;
    jigTimeRemaining?: number;
    startFishingTimeout?: ReturnType<typeof setTimeout>; // Fix timeout type
}

interface ReelingState {
    isReeling: boolean;
    fishPosition: number;
    barPosition: number;
    fishVelocity: number;
    baseFishVelocity: number; // Base velocity before fatigue (for fatigue calculations)
    progress: number;
    currentCatch: CaughtFish | null;

     // Add new properties
     time: number;
     amplitude: number;
     frequency: number;
     basePosition: number;
     barVelocity: number; // Current velocity of the catch zone bar (for momentum)
}

export class FishingMiniGame {
    public reelingGame: ReelingGame;
    public isPlayerFishing = false;
    private currentCatch: CaughtFish | null = null;
    private playerFishingLines: Map<string, FishingLine> = new Map();

    private readonly MAX_POWER = 100;
    private readonly POWER_LOOP_SPEED = 2; // How fast the power increases
    private readonly PLAYER_EYE_HEIGHT = 1.6; // Assuming a default eye height

    private readonly GAME_DURATION = 5000; // 5 seconds instead of 3
    private readonly DEPTH_LEVELS = 3;     // Just 3 depths: shallow, middle, deep
    private readonly GRAVITY = 0.01;          // Reduced for gentler falling
    private readonly BOUNCE_FACTOR = 0.8;    // Keep bounce at 80%
    private readonly JIG_FORCE = -0.1;       // Smaller upward force for gentler nudges  
    private uiHeight: number = 300;
    private readonly BASE_JIG_DURATION = 10000; // 10 seconds base jig duration

    
    constructor(
        private world: World,
        private inventoryManager: InventoryManager,
        private levelingSystem: LevelingSystem,
        private stateManager: PlayerStateManager,
        private messageManager: MessageManager,
        private fishSpawnManager: FishSpawnManager
    ) {
        // Initialize the reeling game with a reference to this
        this.reelingGame = new ReelingGame(
            this.levelingSystem, 
            this.world, 
            this.inventoryManager, 
            this.stateManager, 
            this.messageManager,
            this,
            this.fishSpawnManager
        );
    }

    private updateCastingUI(player: Player, power: number | null) {
        player.ui.sendData({
            type: 'castingPowerUpdate',
            power: power
        });
    }

    onCastStart(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state) return; 
        
        if (this.stateManager.getInventory(player)?.equippedFish) {
            this.inventoryManager.unequipItem(player, 'fish');
        }
        
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0];    
        let gamePlayerEntity = playerEntity as GamePlayerEntity;
        
        // Allow fishing from boats, but not when swimming/standing in water
        if (gamePlayerEntity.isInOrOnWater(playerEntity) && !gamePlayerEntity.isBoating) { 
            return;
        }
        
        if (!state.fishing.isCasting) {  // Start the power loop
            this.transitionFishingState(player, 'idle', 'casting');
            state.fishing.isCasting = true;
            state.fishing.castPower = 0;
            
            playerEntity.startModelOneshotAnimations([ 'cast_back_lower' ]);
            playerEntity.startModelOneshotAnimations([ 'cast_back_upper' ]);

            player.ui.sendData({
                type: 'castingPowerUpdate',
                power: 0
            });
            
            // Start server-side power tracking (as a fallback)
            this.trackCastPower(player);
        } else {  // Handle end of cast immediately
            // Process the cast right away - no waiting
            state.fishing.isCasting = false;
            this.onCastEnd(player);
        }
    }

    // Add this method to track power on server side with pauses
    private trackCastPower(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state) return;
        
        const animationSpeed = 15; // Match client timing
        const powerIncrement = 1.5; // Match client increment
        const pauseAtLoop = 300; // Match client pause at top
        const pauseAtBottom = 100; // Match client pause at bottom
        
        const update = () => {
            if (!state.fishing.isCasting) return;
            
            // Check if we've reached 100%
            if (state.fishing.castPower >= 100) {
             //   state.fishing.castPower = 100;
                
                // Pause at top
                setTimeout(() => {
                    if (!state.fishing.isCasting) return;
                    
                    // Reset to 0
                 //   state.fishing.castPower = 0;
                    
                    // Pause at bottom before continuing
                    setTimeout(() => {
                        if (state.fishing.isCasting) {
                            update(); // Continue normal updates
                        }
                    }, pauseAtBottom);
                    
                }, pauseAtLoop);
                
                return;
            }
            
            // Schedule next update
            setTimeout(update, animationSpeed);
        };
        
        // Start tracking
        update();
    }

    onCastEnd(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state) return;

        // Clear UI
        this.updateCastingUI(player, null);

        // Log the cast power from the state

        // Get PlayerEntity for this player
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        if (!playerEntity) return;
        const rod = playerEntity.getEquippedRod(player);
        if (!rod) return;

        state.fishing.isPlayerFishing = true;

        playerEntity.stopModelAnimations(['cast_back_lower']);
        playerEntity.stopModelAnimations(['cast_back_upper']);
        playerEntity.startModelOneshotAnimations([ 'cast_forward_lower' ]);
        playerEntity.startModelOneshotAnimations([ 'cast_forward_upper' ]);

        // Get position and rotation - use world coordinates if in boat, otherwise use player coordinates
        let castPosition: { x: number, y: number, z: number };
        let castRotation: { x: number, y: number, z: number, w: number };
        
        if (playerEntity.isBoating && playerEntity.currentBoat) {
            // Use boat's world position and rotation for casting
            castPosition = {
                x: playerEntity.currentBoat.position.x,
                y: playerEntity.currentBoat.position.y + this.PLAYER_EYE_HEIGHT,
                z: playerEntity.currentBoat.position.z
            };
            castRotation = playerEntity.currentBoat.rotation;
            console.log("Casting from boat position:", castPosition);
        } else {
            // Use player's position and rotation
            castPosition = {
            x: playerEntity.position.x,
            y: playerEntity.position.y + this.PLAYER_EYE_HEIGHT,
            z: playerEntity.position.z
        };
            castRotation = playerEntity.rotation;
        }

        // Get forward direction and negate it to reverse direction
        const forwardX = -(2.0 * (castRotation.w * castRotation.y + castRotation.x * castRotation.z));
        const forwardZ = -(1.0 - 2.0 * (castRotation.x * castRotation.x + castRotation.y * castRotation.y));

        console.log("Start pos:", castPosition);
        // First check for perfect/good casts before any adjustments
        const isPerfectCast = state.fishing.castPower >= 90 && state.fishing.castPower <= 101;
        const isGoodCast = state.fishing.castPower >= 75 && state.fishing.castPower < 90;

        // Then handle low power casts (don't overwrite perfect casts)
        if (state.fishing.castPower < 20 && !isPerfectCast && !isGoodCast) {
            //state.fishing.castPower = 100;
        }

        // Cap cast power at 100% before any bonuses
        state.fishing.castPower = Math.min(100, state.fishing.castPower);
        
        // Now handle the achievement popups
        if (isPerfectCast) {
            this.stateManager.sendRichGameMessage('Perfect Cast!', player, {
                bonus: '+2% Luck Bonus',
                rarity: 'epic',
                duration: 5000
            });
            
            // Apply distance bonus (20%) - already capped at 100
            const bonusPower = Math.min(100, state.fishing.castPower * 1.2);
            state.fishing.castPower = bonusPower;
        }

        const maxDistance = rod.metadata?.rodStats?.maxDistance ?? 10;
        const distance = (state.fishing.castPower / 100) * maxDistance;

        // Check if landing position is in water
        const result = this.findFishingSpot(castPosition, { x: forwardX, z: forwardZ }, distance);
        if (result.found && result.position) {
            // Check if cast landed in a hotspot and show notification with delay
            const hotspotCheck = this.fishSpawnManager.checkHotspotAtPosition(new Vector3(
                result.position.x + 0.5,
                result.position.y + 0.5,
                result.position.z + 0.5
            ));
            
            if (hotspotCheck.isInHotspot && hotspotCheck.hotspot) {
                // Send hotspot notification with a slight delay after cast notifications
                setTimeout(() => {
                    this.stateManager.sendRichGameMessage('Hotspot Bonus', player, {
                        bonus: '+Better Fish Rates',
                        rarity: 'legendary',
                        duration: 5000
                    });
                }, 500); // 500ms delay after cast notifications
            }
            
            // CastMarker removed - bobber already provides visual indication
            // Get the rod tip position
            const rodTipPosition = this.getRodTipPosition(playerEntity);
            
            
            // Store the cast position for later updates
            state.fishing.castPosition = new Vector3(
                result.position.x + 0.5,
                result.position.y + 0.5,
                result.position.z + 0.5
            );

    

            // Store timeout reference for potential cleanup
            state.fishing.startFishingTimeout = setTimeout(() => {
                // Clear the timeout reference since it's executing
                state.fishing.startFishingTimeout = undefined;
                
                // Check if fishing is still active before starting jigging
                if (state.fishing.isPlayerFishing) {
                    this.startFishing(player, result.position!);
                }
            }, 2000);
        } else {
            // FIX: use correct spelling "forward" not "foward"
            playerEntity.stopModelAnimations(['cast_forward_lower']);
            playerEntity.stopModelAnimations(['cast_forward_upper']);
            state.fishing.isPlayerFishing = false;
        }

        // When the result position exists, cast the player's fishing line
        if (result.position) {
            const fishingLine = this.getPlayerFishingLine(player);
            fishingLine.castLine(player, new Vector3(
                result.position.x + 0.5, 
                result.position.y + 0.5, 
                result.position.z + 0.5
            ));
        }
    }

    private findFishingSpot(startPos: { x: number, y: number, z: number }, 
        forwardDir: { x: number, z: number }, 
        distance: number): { found: boolean, position?: { x: number, y: number, z: number } } {
        const landingPos = {
            x: startPos.x + forwardDir.x * distance,
            y: startPos.y,
            z: startPos.z + forwardDir.z * distance
        };

        console.log("Checking cast at landing spot:", landingPos);

        // Use world.chunkLattice instead of static mapData to support new map areas
        for (let y = landingPos.y; y > 0; y--) {
            const checkPos = {
                x: Math.floor(landingPos.x),
                y: Math.floor(y),
                z: Math.floor(landingPos.z)
            };

            // Use world.chunkLattice.getBlockId() instead of mapData
            const blockTypeId = this.world.chunkLattice.getBlockId({ 
                x: checkPos.x, 
                y: checkPos.y, 
                z: checkPos.z 
            });

            // Skip if air block (undefined or 0)
            if (!blockTypeId || blockTypeId === 0) continue;

            // Found water - use correct water block IDs: 73 (water-flow) and 74 (water-still)
            if (blockTypeId === 73 || blockTypeId === 74) {
                console.log("Found fishable water at:", checkPos);
                return { found: true, position: checkPos };
            }

            // Hit any other solid block - invalid fishing spot
            return { found: false };
        }

        return { found: false };
    }


    private startFishing(player: Player, landingPos: { x: number, y: number, z: number }) {
        const state = this.stateManager.getState(player);
        if (!state) return;
        
        // Safety check: ensure player is still fishing and hasn't moved/aborted
        if (!state.fishing.isPlayerFishing) {
            return;
        }
        
        // Additional safety check: ensure we're not already in another fishing phase
        if (state.fishing.isJigging || state.fishing.isReeling) {
            return;
        }
        
        console.log("Starting fishing mini-game");
        state.fishing.isJigging = true;
        state.fishing.fishDepth = 1;  // Start in middle
        state.fishing.fishVelocityY = 0;  // Start with no velocity

        // Get rod catchSpeed with enchantment bonuses
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const rod = playerEntity.getEquippedRod(player);
        const modifiedStats = EnchantmentHelper.getEnchantmentModifiedStats(rod);
        let rodCatchSpeed = modifiedStats.catchSpeed;
        
        // Log if Swift Current is active
        if (EnchantmentHelper.hasEnchantment(rod, 'swift_current')) {
            console.log(`[FishingMiniGame] Swift Current enchantment detected - catchSpeed boosted to ${rodCatchSpeed.toFixed(2)}`);
        }
        
        // Get bait catchSpeed and apply additively to rod enchantment-modified stats
        const equippedBait = playerEntity.getEquippedBait(player)?.item;
        const baitCatchSpeed = equippedBait?.metadata?.baitStats?.catchSpeed ?? 1; // Default to 1 if not defined
        const baitCatchSpeedBonus = baitCatchSpeed - 1; // Extract bonus (e.g., 1.05 -> 0.05)
        const combinedCatchSpeed = rodCatchSpeed + baitCatchSpeedBonus; // Additive effect
        
        // Store jig timer in state
        state.fishing.jigTimeRemaining = this.BASE_JIG_DURATION / combinedCatchSpeed;

        // Show the game UI with new instructions
        this.transitionFishingState(player, 'casting', 'jigging');
    }

    // Handle Q/E key presses
    private CASTING_UPDATE_INTERVAL = 100; // Send updates every 100ms instead of 50ms (reduces CPU load)
    private lastCastingUpdate = 0;

    public onTick(player: Player | null) {
        if (!player) return;
        const state = this.stateManager.getState(player);
        if (!state) return;

        // Handle casting power
        if (state.fishing.isCasting) {
          //  state.fishing.castPower += this.POWER_LOOP_SPEED;
                // Throttle UI updates
                const now = Date.now();
                if (now - this.lastCastingUpdate >= this.CASTING_UPDATE_INTERVAL) {
                    player.ui.sendData({
                        type: 'castingPowerUpdate',
                        power: state.fishing.castPower
                    });
                    this.lastCastingUpdate = now;
                }
            
            // Reset to 0 after reaching or exceeding MAX_POWER
            if (state.fishing.castPower >= this.MAX_POWER) {
               // state.fishing.castPower = 0;
            }
        
        }

        // Handle fish physics if player is fishing
        if (state.fishing.isJigging && player?.input) {
            this.updateFishPhysics(player);

            // --- Variable catch speed logic ---
            if (typeof state.fishing.jigTimeRemaining === 'number') {
                // Check if fish is in the middle zone (e.g., 0.8 < fishDepth < 1.2)
                const inMiddle = state.fishing.fishDepth > 0.8 && state.fishing.fishDepth < 1.2;
                // Decrease timer faster if in middle, slower otherwise
                const delta = inMiddle ? 60 : 20; // ms per tick (tune as needed)
                state.fishing.jigTimeRemaining -= delta;
                if (state.fishing.jigTimeRemaining <= 0) {
                    state.fishing.isJigging = false;
                    this.tryToFish(player, state.fishing.castPosition!);
                }
            }
        }
        // Add reeling game tick
        if (this.reelingGame && state && state.fishing && state.fishing.reelingGame) {
            this.reelingGame.onTick(player);
        }

        // Update fishing line if player is fishing
        if (state.fishing.isPlayerFishing) {
            const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
            if (playerEntity && state.fishing.castPosition) {
                const rodTipPosition = this.getRodTipPosition(playerEntity);
                
                // Update the line position
            }
        }
    }

    private updateFishPhysics(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state || !player.input) return;
    
        // Apply gravity
        state.fishing.fishVelocityY += this.GRAVITY;
        state.fishing.fishDepth += state.fishing.fishVelocityY;
    
        // Handle Q key jig
        if (player.input['q']) {
            state.fishing.fishVelocityY = this.JIG_FORCE;
            player.input['q'] = false;
        }
    
        // Bounce off boundaries
        if (state.fishing.fishDepth <= 0) {
            state.fishing.fishDepth = 0;
            state.fishing.fishVelocityY = Math.abs(state.fishing.fishVelocityY) * this.BOUNCE_FACTOR;
        } else if (state.fishing.fishDepth >= 2) {
            state.fishing.fishDepth = 2;
            state.fishing.fishVelocityY = -Math.abs(state.fishing.fishVelocityY) * this.BOUNCE_FACTOR;
        }
    
        // Get equipped rod for Swift Current enchantment check
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        const hasSwiftCurrent = EnchantmentHelper.hasEnchantment(equippedRod, 'swift_current');
        
        // Update UI
        player.ui.sendData({
            type: 'startFishing',
            fishDepth: state.fishing.fishDepth * 1.25,
            hasSwiftCurrent: hasSwiftCurrent // For Swift Current visual feedback in jig phase
        });
    }

    public updateUIHeight(height: number) {
        this.uiHeight = height;
    }

    // Add method to check if reeling is active
    isReeling(): boolean {
        return this.reelingGame.isReeling;
    }

    //Landing position is the block the cast algo found 
    private tryToFish(player: Player, landingPos: { x: number, y: number, z: number }) {
        const state = this.stateManager.getState(player);
        if (!state) return;
        
        // Safety check: ensure player is still fishing and hasn't moved/aborted
        if (!state.fishing.isPlayerFishing) {
            return;
        }

        // Always send fishingComplete to dismiss the jig UI
        this.transitionFishingState(player, 'jigging', 'reeling');

       /*
        player?.ui.sendData({
            type: 'fishingComplete'
        });
        */

        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0];
        // FIX: use correct spelling "forward" not "foward"
        playerEntity.stopModelAnimations(['cast_forward_lower']);
        playerEntity.stopModelAnimations(['cast_forward_upper']);

        //RUNNING SIMULATION
        this.fishSpawnManager.runFishSimulation(new Vector3(landingPos.x, landingPos.y, landingPos.z), player);
        state.fishing.currentCatch = this.fishSpawnManager.getFishAtLocation(new Vector3(landingPos.x, landingPos.y, landingPos.z), Date.now(), player);

        
        if (state.fishing.currentCatch) {
            // Start reeling animations immediately to avoid gap between cast_forward ending and reeling starting
            // The controller animations will be properly set up in startReeling to ensure they persist
            const reelingAnimations = ['reeling_lower', 'carry-upper'];
            playerEntity.startModelLoopedAnimations(reelingAnimations);
            // Trigger the bobber bite animation
            const fishingLine = this.getPlayerFishingLine(player);
            fishingLine.startBite();
            
            // Wait a moment to show the bite animation before starting reeling
            setTimeout(() => {
                try {
                    // Re-fetch state in case it was cleared/changed during async operation
                    const currentState = this.stateManager.getState(player);
                    if (!currentState) return;
                    
                    // Start reeling game after a short delay to see the bobber sink
                    if (currentState.fishing.currentCatch) {
                        this.reelingGame.startReeling(player, currentState.fishing.currentCatch);
                    }
                    currentState.fishing.isPlayerFishing = false;
                } catch (error) {
                    console.error('[FishingMiniGame] Error in tryToFish setTimeout callback:', error);
                }
            }, 1000); // 1 second delay to see the bite
        } else {
            // No fish caught (fallback loot) - grey out jig button immediately
            player.ui.sendData({
                type: 'fallbackLootDetected'
            });
            
            // Clean up fishing line immediately
            this.clearPlayerFishingLine(player);
            state.fishing.isPlayerFishing = false;
        }
    }

    private async transitionFishingState(player: Player, from: string, to: string) {
        const state = this.stateManager.getState(player);
        if (!state) return;
        // Clear UI and chain the new state
        this.clearAllFishingUI(player).then(() => {
            try {
                // Re-fetch state in case it was cleared/changed during async operation
                const currentState = this.stateManager.getState(player);
                if (!currentState) return;
                
                switch(to) {
                    case 'casting':
                        player.ui.sendData({
                            type: 'castingPowerUpdate',
                            power: currentState.fishing.castPower
                        });
                        break;
                    case 'jigging':
                        // Get equipped rod for Swift Current enchantment check
                        const playerEntityForJig = this.world.entityManager.getPlayerEntitiesByPlayer(player)?.[0] as GamePlayerEntity;
                        if (!playerEntityForJig) {
                            console.error('[FishingMiniGame] playerEntityForJig is null in transitionFishingState callback');
                            return;
                        }
                        const rodForJig = playerEntityForJig.getEquippedRod(player);
                        const hasSwiftCurrentForJig = EnchantmentHelper.hasEnchantment(rodForJig, 'swift_current');
                        
                        player.ui.sendData({
                            type: 'startFishing',
                            fishDepth: 0.5,
                            message: 'Press SPACE to keep the fish from falling! Keep it in the middle zone!',
                            hasSwiftCurrent: hasSwiftCurrentForJig // For Swift Current visual feedback in jig phase
                        });
                        break;
                    case 'reeling':
                        player.ui.sendData({
                            type: 'fishingComplete'
                        });
                        break;
                }
            } catch (error) {
                console.error('[FishingMiniGame] Error in transitionFishingState callback:', error);
            }
        }).catch((error) => {
            console.error('[FishingMiniGame] Error in transitionFishingState promise chain:', error);
        });
    }

    private clearAllFishingUI(player: Player): Promise<void> {
        return new Promise(resolve => {
            player.ui.sendData({
                type: 'fishingComplete'     // Clear jigging UI
            });
            player.ui.sendData({
                type: 'hideReeling'         // Clear reeling UI
            });
            player.ui.sendData({
                type: 'castingPowerUpdate', // Clear casting UI
                power: null
            });
            
            // Give a tiny window for UI to clear
            setTimeout(resolve, 16);  // One frame at 60fps
        });
    }

    public abortFishing(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state) return;
    
        
        // Clear the startFishing timeout if it exists
        if (state.fishing.startFishingTimeout) {
            clearTimeout(state.fishing.startFishingTimeout);
            state.fishing.startFishingTimeout = undefined;
        }
    
        // Reset all fishing state flags
        state.fishing.isCasting = false;
        state.fishing.isReeling = false;
        state.fishing.isJigging = false;
        state.fishing.isPlayerFishing = false;
        state.fishing.currentCatch = null;
        state.fishing.jigTimeRemaining = undefined; // Clear jig timer
        
        // Reset reeling game state if it exists
        if (state.fishing.reelingGame) {
            state.fishing.reelingGame.isReeling = false;
            state.fishing.reelingGame.currentCatch = null;
        }
        
        // Reset the reeling game instance
        if (this.reelingGame) {
            this.reelingGame.isReeling = false;
        }
    
        // Clear any fishing intervals
        if (state.fishing.fishingInterval) {
            clearInterval(state.fishing.fishingInterval);
            state.fishing.fishingInterval = null;
        }
    
        // Restore controller animations if reeling was active
        if (this.reelingGame) {
            this.reelingGame.restoreControllerAnimations(player);
        }
        
        // Reset animations
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        if (playerEntity) {
            // FIX: use correct spelling "forward" not "foward"
            const animationsToStop = ['cast_back_lower', 'cast_back_upper', 'cast_forward_lower', 'cast_forward_upper', 'reeling_lower', 'carry-upper'];
            playerEntity.stopModelAnimations(animationsToStop);
            
            // If boating, restore sit animation; otherwise use idle
            if (playerEntity.isBoating) {
                playerEntity.startModelLoopedAnimations(['sit']);
            } else {
                playerEntity.startModelLoopedAnimations(['idle']);
            }
        }
    
        // Clear all fishing-related UI
        player.ui.sendData({
            type: 'fishingComplete'  // Clears jigging UI
        });
        player.ui.sendData({
            type: 'hideReeling'      // Clears reeling UI
        });
        player.ui.sendData({
            type: 'castingPowerUpdate',
            power: null              // Clears casting UI
        });

        // Cast markers removed - no cleanup needed

        // Clean up when done
        this.onFishingAborted(player);
    }

    private getRodTipPosition(playerEntity: GamePlayerEntity): Vector3 {
        // Get the player's position and rotation
        const position = playerEntity.position;
        const rotation = playerEntity.rotation;
        
        // Calculate forward direction
        const forwardX = 2.0 * (rotation.w * rotation.y + rotation.x * rotation.z);
        const forwardZ = 1.0 - 2.0 * (rotation.x * rotation.x + rotation.y * rotation.y);
        
        // Rod tip is offset from player position
        // Adjust these values based on your rod model and animations
        return new Vector3(
            position.x + forwardX * 0.5,
            position.y + 1.7, // Slightly above eye level
            position.z + forwardZ * 0.5
        );
    }

    private onFishingAborted(player: Player): void {
        this.clearPlayerFishingLine(player);
    }

    // Helper method to get a player's fishing line (creates one if it doesn't exist)
    private getPlayerFishingLine(player: Player): FishingLine {
        const playerId = player.id.toString();
        
        if (!this.playerFishingLines.has(playerId)) {
            // Create a new fishing line for this player
            this.playerFishingLines.set(playerId, new FishingLine(this.world));
        }
        
        return this.playerFishingLines.get(playerId)!;
    }
    
    // Helper method to clear a player's fishing line
    private clearPlayerFishingLine(player: Player): void {
        const playerId = player.id.toString();
        
        if (this.playerFishingLines.has(playerId)) {
            const fishingLine = this.playerFishingLines.get(playerId)!;
            fishingLine.clear();
            
            // Optionally remove from the map to free memory
            // this.playerFishingLines.delete(playerId);
        }
    }

    static getBaitEffects(baitIdOrItem: string | null): { 
        resilience: number;
        strength: number;
        displayText: string;
        name: string;
        rarity: string;
    } {
        
        // Default values if no bait
        const defaultEffects = {
            resilience: 1.0,
            strength: 1.0,
            displayText: "No effect",
            name: "No bait",
            rarity: "common"
        };
        
        if (!baitIdOrItem) {
            return defaultEffects;
        }
        
        // Simple logic to extract basic info from ID
        const baitName = baitIdOrItem.replace('bait_', '').replace(/_/g, ' ');
        
        // Return basic information based on ID
        return {
            resilience: 1.0,  // Default values
            strength: 1.0,
            displayText: "Basic bait effect",
            name: baitName,
            rarity: "common"
        };
    }
}

interface OriginalReelingAnimations {
    idleLoopedAnimations: string[];
    walkLoopedAnimations: string[];
    runLoopedAnimations: string[];
    jumpLoopedAnimations?: string[];
}

class ReelingGame {
    public isReeling = false;
    private player: Player | null = null;
    private fishPosition = 0.5;
    private barPosition = 0.5;
    private fishVelocity = 0.005;  // Original fish movement speed
    private baseFishVelocity = 0.005;  // Base velocity before fatigue (for fatigue calculations)
    private  BAR_SPEED = 0.01;  // Max bar speed (slowed down from 0.015)
    private BAR_GRAVITY = 0.0005;  // Constant downward force
    private BAR_LIFT_FORCE = 0.0012;  // Upward force when Q is pressed
    private BAR_DAMPING = 0.96;  // Velocity damping for smoother movement (higher = smoother)
    private BAR_WIDTH = 0.25; // Will be set per rod
    private progress = 25;
    private levelingSystem: LevelingSystem;
    private world: World;
    private inventoryManager: InventoryManager;
    private stateManager: PlayerStateManager;
    // Progress tracking
    private readonly PROGRESS_GAIN = 0.5;
    private readonly PROGRESS_LOSS = 0.61; // Drains 22% faster than it fills (0.5 * 1.22)
    private readonly MAX_PROGRESS = 100;
    private readonly MIN_PROGRESS = 0;
    private currentCatch: CaughtFish | null = null;
    private readonly BASE_FISH_SPEED = 0.005;
    private readonly VALUE_SPEED_MULTIPLIER = 0.00002; // Adjust this value to tune difficulty
    private messageManager: MessageManager;
    private movementController: ReelingMovementController;
    private pattern: MovementPattern = MovementPattern.DEFAULT;
    private time: number = 0;
    private currentFishRarity: string = 'common'; // Store current fish rarity for difficulty scaling
    private fishingMiniGame: FishingMiniGame;
    private rodDrag: number = 1;
    private rodCatchZone: number = 1;
    private fishSpawnManager: FishSpawnManager;
    // Store original controller animations for each player during reeling
    private originalReelingAnimations: Map<string, OriginalReelingAnimations> = new Map();
    
    constructor(levelingSystem: LevelingSystem, world: World, inventoryManager: InventoryManager, stateManager: PlayerStateManager, messageManager: MessageManager, fishingMiniGame: FishingMiniGame, fishSpawnManager: FishSpawnManager) {
        this.levelingSystem = levelingSystem;
        this.world = world;
        this.inventoryManager = inventoryManager;
        this.stateManager = stateManager;
        this.messageManager = messageManager;
        this.movementController = new ReelingMovementController(stateManager);
        this.fishingMiniGame = fishingMiniGame;
        this.fishSpawnManager = fishSpawnManager;
    }

    startReeling(player: Player, fish: CaughtFish) {
        const state = this.stateManager.getState(player);
        if (!state) return;
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        let rodCheck = playerEntity.getEquippedRod(player);
        if (!rodCheck) {
            console.warn("[ReelingGame] No rod equipped, cannot start reeling.");
            return;
        }
        // Extract drag and catchZone from rod with enchantment bonuses
        const modifiedStats = EnchantmentHelper.getEnchantmentModifiedStats(rodCheck);
        this.rodDrag = modifiedStats.drag;
        this.rodCatchZone = modifiedStats.catchZone;

        // Get bait item once for multiple uses
        const inventory = this.stateManager.getInventory(player);
        const equippedBaitId = inventory?.equippedBait;
        const baitItem = equippedBaitId ? inventory?.items.find(item => item.id === equippedBaitId) : null;

        // Set BAR_WIDTH based on combined rod and bait catchZone (additive)
        const baitCatchZone = baitItem?.metadata?.baitStats?.catchZone ?? 1; // Default to 1 if not defined
        const baitCatchZoneBonus = baitCatchZone - 1; // Extract bonus (e.g., 1.1 -> 0.1)
        const combinedCatchZone = this.rodCatchZone + baitCatchZoneBonus; // Additive effect
        this.BAR_WIDTH = 0.25 * combinedCatchZone * 0.75; // 25% smaller catch zone
        
        // Apply bait drag additively to rod drag
        const baitDrag = baitItem?.metadata?.baitStats?.drag ?? 1; // Default to 1 if not defined
        const baitDragBonus = baitDrag - 1; // Extract bonus (e.g., 1.05 -> 0.05)
        this.rodDrag = this.rodDrag + baitDragBonus; // Additive effect

        let baitEffectData = null; 
        if (baitItem) {
            baitEffectData = {
                name: baitItem.name || equippedBaitId!.replace('bait_', '').replace(/_/g, ' '),
                resilience: baitItem.metadata?.baitStats?.drag || 1.0, // Using .drag here now
                catchWeight: baitItem.metadata?.baitStats?.catchWeight || 1.0,
                rarity: baitItem.rarity || "common"
            };
        } else {
            baitEffectData = { name: "No Bait", resilience: 1.0, strength: 1.0, rarity: "common" };
        }
        
        // Fish catalog lookup
        const idParts = fish.id.split('_');
        if (idParts.length < 3) { // Need at least 3 parts: ID_Timestamp_Rand
            console.error(`[ReelingGame] Unexpected fish ID format: ${fish.id}`);
            this.messageManager.sendGameMessage("The fish got away! (Error: Invalid fish ID)", player);
            if (state.fishing.reelingGame) { state.fishing.reelingGame.isReeling = false; }
            this.isReeling = false; 
            player.ui.sendData({ type: 'hideReeling' });
            return;
        }
        const staticFishId = idParts.slice(0, -2).join('_'); // Correctly join parts except last two

        // Debug logging removed to reduce console spam
        
        const fishDataFromCatalog = FISH_CATALOG.find(f => f.id === staticFishId);

        if (!fishDataFromCatalog) {
            console.error(`[ReelingGame] Fish type not found in catalog: ${staticFishId} (original ID: ${fish.id})`);
            this.messageManager.sendGameMessage("The fish got away! (Error: Fish data missing)", player);
            
            if (state.fishing.reelingGame) {
                state.fishing.reelingGame.isReeling = false;
            }
            this.isReeling = false; 

            player.ui.sendData({ type: 'hideReeling' }); // Use a more generic hide command
            // Consider explicitly calling handleFailure or ensuring onTick will immediately fail.
            // For now, returning should cause onTick to not misbehave if it checks state.fishing.reelingGame.isReeling
            return; 
        }

        // If we reach here, fishDataFromCatalog is valid.
        
        let calculatedFishVelocity = this.movementController.calculateInitialVelocity(fish, rodCheck, player, fishDataFromCatalog, this.rodDrag);
        
        // Apply mobile handicap for trophy fish: 7.5% velocity reduction
        const isTrophyFish = fishDataFromCatalog.isTrophy;
        const isMobile = this.stateManager.isMobile(player);
        if (isTrophyFish && isMobile) {
            const mobileTrophyHandicap = 0.925; // 7.5% reduction (1 - 0.075 = 0.925)
            const originalVelocity = calculatedFishVelocity;
            calculatedFishVelocity *= mobileTrophyHandicap;
            console.log(`[ReelingGame] Applied mobile trophy fish handicap: ${(calculatedFishVelocity / originalVelocity * 100).toFixed(1)}% of original velocity (${originalVelocity.toFixed(6)} -> ${calculatedFishVelocity.toFixed(6)})`);
        }
        
        this.pattern = this.movementController.getMovementPattern(fish, fishDataFromCatalog);
        this.currentFishRarity = fishDataFromCatalog.rarity; // Store rarity for difficulty scaling
        this.time = 0;
        
        // Debug: Log initial velocity calculation
        // Initialize the reeling game state
        state.fishing.reelingGame = {
            isReeling: true,
            fishPosition: 0.5,
            barPosition: 0.5, // Start bar aligned with fish (Stardew Valley style)
            fishVelocity: calculatedFishVelocity,
            baseFishVelocity: calculatedFishVelocity, // Store base velocity for fatigue calculations
            progress: 38, // Starting progress
            currentCatch: fish,
            time: 0,
            amplitude: 0.2 + (Math.random() * 0.2),
            frequency: 0.05 + (Math.random() * 0.05),
            basePosition: 0.5,
            barVelocity: 0 // Initialize bar velocity to 0 (no momentum at start)
        };
        
        // Verify baseFishVelocity was stored correctly
        if (!state.fishing.reelingGame.baseFishVelocity || state.fishing.reelingGame.baseFishVelocity !== calculatedFishVelocity) {
            console.error(`[FishingMiniGame] ERROR: baseFishVelocity not stored correctly! Expected: ${calculatedFishVelocity}, Got: ${state.fishing.reelingGame.baseFishVelocity}`);
        }
        
        this.isReeling = true; // Sync ReelingGame instance property
        this.movementController.resetState();

        // Get enchantment-modified stats for visual feedback (use rodCheck from above)
        const enchantmentStats = EnchantmentHelper.getEnchantmentModifiedStats(rodCheck);
        
        // Send data to UI to start the reeling mini-game
        player.ui.sendData({
            type: 'startReeling', // Changed from 'updateReeling'
            baitEffect: baitEffectData, // Send the prepared bait effect data
            fishPosition: state.fishing.reelingGame.fishPosition,
            barPosition: state.fishing.reelingGame.barPosition,
            progress: state.fishing.reelingGame.progress,
            fishSprite: fishDataFromCatalog.modelData.sprite,
            fishName: fish.name, // from CaughtFish
            fishWeight: fish.weight, // from CaughtFish
            fishRarity: fish.rarity, // from CaughtFish (calculated rarity)
            catchZoneWidth: enchantmentStats.catchZone, // For widened zone visual feedback
            rodDrag: enchantmentStats.drag // For drag visual feedback
        });
        
        // Player model animations - use carry-upper like when holding a fish
        // Modify controller animations so DefaultPlayerEntityController includes carry-upper
        // This is similar to how InventoryManager handles fish equipping
        const controller = playerEntity.controller as DefaultPlayerEntityController;
        
        // Store original animations if not already stored (in case reeling starts multiple times)
        if (!this.originalReelingAnimations.has(player.id)) {
            this.originalReelingAnimations.set(player.id, {
                idleLoopedAnimations: [...(controller.idleLoopedAnimations || [])],
                walkLoopedAnimations: [...(controller.walkLoopedAnimations || [])],
                runLoopedAnimations: [...(controller.runLoopedAnimations || [])],
                jumpLoopedAnimations: (controller as any).jumpLoopedAnimations ? [...((controller as any).jumpLoopedAnimations || [])] : undefined
            });
        }
        
        // Log current animations before modifying
        
        // Stop all looped animations that might be playing (idle, walk, run, etc.)
        if (playerEntity.modelLoopedAnimations && Array.from(playerEntity.modelLoopedAnimations).length > 0) {
            playerEntity.modelLoopedAnimations.forEach(animation => {
                playerEntity.stopModelAnimations([animation]);
            });
        }
        
        // Stop all casting animations (oneshot animations) - FIX: use correct spelling "forward" not "foward"
        const castingAnimationsToStop = ['cast_back_lower', 'cast_back_upper', 'cast_forward_lower', 'cast_forward_upper'];
        playerEntity.stopModelAnimations(castingAnimationsToStop);
        
        // Modify controller animations to include carry-upper and reeling_lower
        // Filter out upper body animations (anything with 'upper' in the name) except carry-upper
        const original = this.originalReelingAnimations.get(player.id)!;
        const filterUpperBody = (animations: string[]) => 
            animations.filter(anim => !anim.includes('upper') && anim !== 'carry-upper' && anim !== 'reeling_lower');
        
        const lowerBodyIdle = filterUpperBody(original.idleLoopedAnimations);
        const lowerBodyWalk = filterUpperBody(original.walkLoopedAnimations);
        const lowerBodyRun = filterUpperBody(original.runLoopedAnimations);
        const lowerBodyJump = original.jumpLoopedAnimations ? filterUpperBody(original.jumpLoopedAnimations) : undefined;
        
        // Set animations: carry-upper + reeling_lower + lower body animations
        // The controller will now automatically include these when it updates animations based on movement state
        controller.idleLoopedAnimations = ['carry-upper', 'reeling_lower', ...lowerBodyIdle];
        controller.walkLoopedAnimations = ['carry-upper', 'reeling_lower', ...lowerBodyWalk];
        controller.runLoopedAnimations = ['carry-upper', 'reeling_lower', ...lowerBodyRun];
        
        // Handle jump animations if they exist
        if (lowerBodyJump !== undefined && (controller as any).jumpLoopedAnimations !== undefined) {
            (controller as any).jumpLoopedAnimations = ['carry-upper', 'reeling_lower', ...lowerBodyJump];
        }
        
        // Now start the reeling animations (controller will maintain these automatically)
        const reelingAnimations = ['reeling_lower', 'carry-upper'];
        playerEntity.startModelLoopedAnimations(reelingAnimations);
    }

    onTick(player: Player | null) {
        if (!player) return;

        const state = this.stateManager.getState(player);
        if (!state || !state.fishing || !state.fishing.reelingGame || !state.fishing.reelingGame.isReeling || !player.input) { return; }

        const game = state.fishing.reelingGame;
        
        this.time += 1;
        // Get equipped rod for fatigue enchantment
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        
        // Apply fatigue to current velocity (preserving direction), but use base magnitude to prevent compounding
        const timeInSeconds = this.time / 60;
        const fatigueMultiplier = EnchantmentHelper.getFatigueMultiplier(equippedRod, timeInSeconds, 'seconds');
        
        // Get the base magnitude (always positive) and current direction
        const baseMagnitude = Math.abs(game.baseFishVelocity || game.fishVelocity);
        const currentDirection = game.fishVelocity >= 0 ? 1 : -1; // Preserve direction from current velocity
        
        // Apply fatigue to the base magnitude, then restore direction
        const fatigueAdjustedMagnitude = baseMagnitude * fatigueMultiplier;
        const fatigueAdjustedVelocity = fatigueAdjustedMagnitude * currentDirection;
        
        // Debug logging for velocity tracking
        if (this.time % 60 === 0 || this.time < 10) { // Log every second or first 10 frames
            if (!game.baseFishVelocity) {
                console.error(`  ⚠️ ERROR: baseFishVelocity is missing! Using fallback: ${game.fishVelocity}`);
            }
        }
        
        const movement = this.movementController.updateFishPosition(
            game.fishPosition,
            fatigueAdjustedVelocity, // Use fatigue-adjusted velocity with preserved direction
            this.pattern,
            this.time,
            equippedRod,
            this.currentFishRarity // Pass fish rarity for difficulty scaling
        );
        
        // Log after movement update
        if (this.time % 60 === 0 || this.time < 10) {
            if (Math.abs(movement.velocity) < 0.0001) {
                console.warn(`  ⚠️ WARNING: Velocity is very low (${movement.velocity.toFixed(6)}) - fish may appear stuck!`);
            }
        }
        
        game.fishPosition = movement.position;
        game.fishVelocity = movement.velocity;

        // Update bar position with gravity-based momentum (Stardew Valley style)
        game.barVelocity *= this.BAR_DAMPING; // Apply damping first
        game.barVelocity -= this.BAR_GRAVITY; // Always apply gravity (downward force)
        
        // Apply upward force when Q is pressed (overcomes gravity)
        if (player.input['q']) {
            game.barVelocity += this.BAR_LIFT_FORCE;
        }
        
        // Clamp velocity to max speed
        game.barVelocity = Math.max(-this.BAR_SPEED, Math.min(this.BAR_SPEED, game.barVelocity));
        
        // Apply velocity to position
        const newBarPosition = game.barPosition + game.barVelocity;
        
        // Handle boundary collisions with damping (like Stardew's Lead Bobber effect)
        if (newBarPosition <= 0) {
            game.barPosition = 0;
            game.barVelocity = Math.max(0, game.barVelocity * 0.3); // Strong damping at bottom (reduces bounce)
        } else if (newBarPosition >= 0.8) {
            game.barPosition = 0.8;
            game.barVelocity = Math.min(0, game.barVelocity * 0.3); // Strong damping at top
        } else {
            game.barPosition = newBarPosition;
        }

        // Check if fish is in target zone
        const fishInZone = game.fishPosition >= game.barPosition && 
                          game.fishPosition <= (game.barPosition + this.BAR_WIDTH);

        // Update progress
        const INITIAL_DRAIN_DELAY_TICKS = 60; // 1 second delay at start of game (60fps)
        const hasInitialDelayPassed = this.time >= INITIAL_DRAIN_DELAY_TICKS;
        
        if (fishInZone) {
            game.progress = Math.min(this.MAX_PROGRESS, game.progress + this.PROGRESS_GAIN);
        } else {
            // Only drain if initial delay has passed (prevents immediate drain at game start)
            if (hasInitialDelayPassed) {
                game.progress = Math.max(this.MIN_PROGRESS, game.progress - this.PROGRESS_LOSS);
            }
            // If still in initial delay period, don't drain yet
        }
        
        // Check win/lose conditions
         if (game.progress >= this.MAX_PROGRESS && game.currentCatch) {
            this.handleSuccess(player, game.currentCatch);
        } else if (game.progress <= this.MIN_PROGRESS) {
            this.handleFailure(player);
        }

        

        // Get enchantment-modified stats and fatigue data for visual feedback
        // Reuse playerEntity and equippedRod from earlier in the function
        const currentPlayerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const currentEquippedRod = currentPlayerEntity.getEquippedRod(player);
        const currentModifiedStats = EnchantmentHelper.getEnchantmentModifiedStats(currentEquippedRod);
        
        // Get bait stats for additive bonuses
        const inventory = this.stateManager.getInventory(player);
        const equippedBaitId = inventory?.equippedBait;
        const baitItem = equippedBaitId ? inventory?.items.find(item => item.id === equippedBaitId) : null;
        const baitCatchZone = baitItem?.metadata?.baitStats?.catchZone ?? 1;
        const baitCatchZoneBonus = baitCatchZone - 1;
        const baitDrag = baitItem?.metadata?.baitStats?.drag ?? 1;
        const baitDragBonus = baitDrag - 1;
        
        // Calculate combined stats (rod enchantment + bait bonuses)
        const combinedCatchZone = currentModifiedStats.catchZone + baitCatchZoneBonus;
        const combinedDrag = currentModifiedStats.drag + baitDragBonus;
        
        // Calculate fatigue multiplier for UI feedback (already applied to velocity above)
        const fatigueMultiplierForUI = EnchantmentHelper.getFatigueMultiplier(currentEquippedRod, this.time / 60, 'seconds');
        const hasFatigue = EnchantmentHelper.hasEnchantment(currentEquippedRod, 'fatigue');
        const hasTemptranquil = EnchantmentHelper.hasEnchantment(currentEquippedRod, 'tranquil');
        
        // Send updates to UI
        player.ui.sendData({
            type: 'updateReeling',
            fishPosition: game.fishPosition,
            barPosition: game.barPosition,
            progress: game.progress,
            catchZoneWidth: combinedCatchZone, // For widened zone visual feedback (rod + bait)
            rodDrag: combinedDrag, // For drag visual feedback (rod + bait)
            fatigueMultiplier: fatigueMultiplierForUI, // For fatigue visual feedback (0.85-1.0)
            hasFatigue: hasFatigue, // For fatigue visual feedback
            hasTemptranquil: hasTemptranquil // For temptranquil visual feedback
        });
    }

    public restoreControllerAnimations(player: Player) {
        const original = this.originalReelingAnimations.get(player.id);
        if (!original) {
            return;
        }
        
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        if (!playerEntity) {
            return;
        }
        
        // Stop reeling animations explicitly (especially important when boating)
        const reelingAnimationsToStop = ['reeling_lower', 'carry-upper'];
        playerEntity.stopModelAnimations(reelingAnimationsToStop);
        
        const controller = playerEntity.controller as DefaultPlayerEntityController;
        
        // Restore original controller animations
        controller.idleLoopedAnimations = original.idleLoopedAnimations;
        controller.walkLoopedAnimations = original.walkLoopedAnimations;
        controller.runLoopedAnimations = original.runLoopedAnimations;
        
        if (original.jumpLoopedAnimations !== undefined && (controller as any).jumpLoopedAnimations !== undefined) {
            (controller as any).jumpLoopedAnimations = original.jumpLoopedAnimations;
        }
        
        // If boating, ensure sit animation is playing (boat should have set this, but ensure it's active)
        if (playerEntity.isBoating) {
            const currentAnimations: string[] = Array.isArray(playerEntity.modelLoopedAnimations) 
                ? playerEntity.modelLoopedAnimations 
                : [];
            if (!currentAnimations.includes('sit')) {
                console.log("[FishingMiniGame] restoreControllerAnimations - Player is boating, ensuring sit animation is active");
                playerEntity.startModelLoopedAnimations(['sit']);
            }
        }
        
        console.log("[FishingMiniGame] restoreControllerAnimations - Restored controller animations for player:", player.id);
        
        // Remove from map
        this.originalReelingAnimations.delete(player.id);
    }

    private handleSuccess(player: Player, fish: CaughtFish) {
        const state = this.stateManager.getState(player);
        if (!state) return;

        state.fishing.reelingGame.isReeling = false;
        
        // Restore controller animations
        this.restoreControllerAnimations(player);
        
        // Hide reeling UI
        player.ui.sendData({
            type: 'hideReeling'
        });

        console.log("Fish caught!");
        if (!state.fishing.reelingGame.currentCatch) return;

        // Check if this is a loot fish (has isLoot flag and is chest, map fragment, vault, runic ore, or relic shard)
        const isLootFish = fish.isLoot && (
            fish.name.toLowerCase().includes('chest') || 
            fish.name.toLowerCase().includes('map fragment') ||
            fish.name.toLowerCase().includes('vault') ||
            fish.name.toLowerCase().includes('runic ore') ||
            fish.id.startsWith('relic_shard') // Use startsWith to match timestamp IDs like relic_shard_1764951260763_655
        );
        
        if (isLootFish) {
            // Handle loot fish (chests, map fragments, vaults) - convert to loot item and add to inventory directly
            console.log(`[ReelingGame] Loot fish caught: ${fish.name}`);
            
            // Extract static ID (remove timestamp and random suffix)
            const staticId = fish.id.replace(/_\d+_\d+$/, '');
            
            // Create inventory item directly to preserve metadata (for quest chests with predefined contents)
            const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
            let inventoryItem = ItemFactory.createInventoryItemFromLootId(staticId, 1);
            
            // Preserve metadata from the caught fish (important for quest chests with predefined contents)
            if (fish.metadata && inventoryItem) {
                if (!inventoryItem.metadata) {
                    inventoryItem.metadata = {};
                }
                // Merge metadata, prioritizing the fish's metadata (which contains quest chest contents)
                inventoryItem.metadata = { ...inventoryItem.metadata, ...fish.metadata };
                // Specifically preserve contents if present
                if ((fish.metadata as any)?.contents) {
                    (inventoryItem.metadata as any).contents = (fish.metadata as any).contents;
                }
            }
            
            // Handle quest bait consumption on successful loot catch
            if (fish.questBait) {
                console.log(`[ReelingGame] Consuming quest bait ${fish.questBait.name} (ID: ${fish.questBait.id}) on successful loot catch`);
                const removed = this.stateManager.removeInventoryItem(player, fish.questBait.id);
                console.log(`[ReelingGame] Quest bait removal result: ${removed}`);
                if (!removed) {
                    console.error(`[ReelingGame] Failed to remove quest bait ${fish.questBait.id} from player ${player.id} inventory`);
                }
            }
            
            // Add directly to inventory to preserve metadata
            if (inventoryItem) {
                playerEntity.stateManager.addInventoryItem(player, inventoryItem);
                
                // Send UI message to disable cast button temporarily (prevent spam)
                player.ui.sendData({
                    type: 'fishingSuccessCooldown'
                });
                
                // Special handling for relic shard
                if (staticId === 'relic_shard') {
                    // Display relic shard with simple message (like Brock's quest)
                    this.displayRelicShard(player);
                    this.messageManager.sendRichGameMessage('A relic shard appeared!', player, {
                        bonus: 'Added to inventory',
                        rarity: 'epic',
                        duration: 5000
                    });
                } else {
                    // Send notification message (like regular fish catches)
                    this.messageManager.sendGameMessage(`You reeled in a ${fish.name}! Added to inventory.`, player);
                    
                    // Display the loot visually
                    const worldFishLootManager = (this.fishSpawnManager as any).lootManager;
                    if (worldFishLootManager) {
                        worldFishLootManager.displayLoot(player, {
                            id: staticId,
                            name: fish.name,
                            quantity: 1,
                            value: fish.value
                        });
                    }
                }
            } else {
                console.error(`[ReelingGame] Failed to create inventory item for loot fish: ${fish.name}`);
                this.messageManager.sendGameMessage(`You reeled in a ${fish.name}! Added to inventory.`, player);
            }
            
            // IMPORTANT: Update quest progress for loot catches (map fragments, chests, etc.)
            // Check if bait was used for this catch
            const inventory = this.inventoryManager.getInventory(player);
            const equippedBaitId = inventory?.equippedBait;
            const hasBait = !!equippedBaitId;
            
            GameManager.instance.questManager?.updateQuestProgress(player, 'catchFish', { 
                fishType: fish.name, 
                weight: fish.weight,
                usedBait: hasBait
            });
            
            // Update tutorial arrows AFTER loot is confirmed in inventory
            // Use 5 second delay to ensure item is fully processed and in inventory
            setTimeout(() => {
                const inventory = this.inventoryManager.getInventory(player);
                const itemInInventory = inventory?.items.some(item => 
                    item.id === staticId || item.name === fish.name
                );
                
                if (itemInInventory) {
                    // Item is confirmed in inventory - safe to update arrows
                    const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                    if (playerEntities && playerEntities.length > 0) {
                        const playerEntity = playerEntities[0];
                        if (playerEntity && (playerEntity as any).arrowManager) {
                            (playerEntity as any).arrowManager.updateArrowsForPlayer(player);
                        }
                    }
                }
            }, 5000); // 5 second delay to ensure item is fully caught and processed
            
            // Update inventory UI
            player.ui.sendData({
                type: 'inventoryUpdate',
                inventory: this.inventoryManager.getInventory(player)
            });
            
        } else {
            // Handle regular fish (existing logic)
            const fishDetails = ItemFactory.getFishItemDetails(state.fishing.reelingGame.currentCatch);
            if (fishDetails) {
                let fishItem = ItemFactory.createFishItem(fish, fishDetails.modelUri, fishDetails.sprite);
                
                // Check catch limit before adding fish to inventory
                const currentFishCount = this.inventoryManager.getFishCount(player);
                const CATCH_LIMIT = 18;
                
                if (currentFishCount >= CATCH_LIMIT) {
                    // Catch bag is full - release the fish
                    this.messageManager.sendGameMessage(`🎣 Your catch bag is full (${CATCH_LIMIT} fish)! The ${fish.rarity} ${fish.name} was released back into the water.`, player);
                    
                    // Update inventory UI
                    player.ui.sendData({
                        type: 'inventoryUpdate',
                        inventory: this.inventoryManager.getInventory(player)
                    });
                    
                    // Display the caught fish briefly before release
                    this.displayFish(player, fish);
                    
                    // IMPORTANT: Clean up fishing state properly when fish is released
                    state.fishing.isPlayerFishing = false;
                    (this.fishingMiniGame as any).clearPlayerFishingLine(player);
                    
                    return; // Exit early - fish not added to inventory
                }
                
                // Check if player is approaching the limit (at 18 fish exactly)
                if (currentFishCount === CATCH_LIMIT - 1) {
                    // This will be their 18th fish - notify them
                    this.messageManager.sendGameMessage(`⚠️ Your catch bag is now full. Sell some fish before continuing to fish.`, player);
                }
                
                // Handle quest bait consumption on successful regular fish catch
                if (fish.questBait) {
                    const removed = this.stateManager.removeInventoryItem(player, fish.questBait.id);
                    if (!removed) {
                        console.error(`[ReelingGame] Failed to remove quest bait ${fish.questBait.id} from player ${player.id} inventory`);
                    }
                }
                
                // Add fish to inventory (normal flow)
                this.stateManager.addInventoryItem(player, fishItem);
                
                // Send UI message to disable cast button temporarily (prevent spam)
                player.ui.sendData({
                    type: 'fishingSuccessCooldown'
                });
                
                // Update Phshdex with the new catch
                const equippedRod = this.inventoryManager.getEquippedRod(player);
                const equippedBaitResult = this.inventoryManager.checkBait(player);
                const equippedBait = equippedBaitResult.hasBait ? equippedBaitResult.item : undefined;
                this.stateManager.updatePhshdexRecord(player, fishItem, equippedRod || undefined, undefined, equippedBait || undefined);
                
                // Calculate and grant XP (with Scholar's Blessing bonus if applicable)
                this.messageManager.sendGameMessage(`Caught a ${fish.rarity} ${fish.name} worth $${fishItem.value.toLocaleString()}!`, player);
                if (this.levelingSystem?.calculateFishXP) {
                    let xpGained = this.levelingSystem.calculateFishXP({
                        ...fish,
                        rarity: fish.rarity.toLowerCase() as "common" | "uncommon" | "rare" | "epic" | "legendary",
                        minWeight: fishDetails.minWeight
                    });
                    
                    // Apply Scholar's Blessing enchantment bonus (+25% XP)
                    const xpMultiplier = EnchantmentHelper.getXPBonusMultiplier(equippedRod);
                    if (xpMultiplier > 1.0) {
                        const bonusXP = Math.floor(xpGained * (xpMultiplier - 1.0));
                        xpGained = Math.floor(xpGained * xpMultiplier);
                        console.log(`[FishingMiniGame] Scholar's Blessing: +${bonusXP} bonus XP (${xpMultiplier}x multiplier)`);
                    }
                    
                    console.log("XP gained: ", xpGained);
                    this.levelingSystem.addXP(player, xpGained);
                }

                // Record the catch in the leaderboard and handle trophy detection
                this.recordCatchInLeaderboard(player, fish);

                // Check for Twin Hook enchantment (15% chance to catch second fish)
                if (EnchantmentHelper.shouldDoubleCatch(equippedRod)) {
                    console.log(`[FishingMiniGame] Twin Hook triggered! Attempting to catch second fish...`);
                    // Try to catch a second fish at the same location (use current time)
                    const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
                    const fishingPosition = new Vector3(playerEntity.position.x, playerEntity.position.y, playerEntity.position.z);
                    const currentTime = Date.now();
                    const secondFish = this.fishSpawnManager.getFishAtLocation(fishingPosition, currentTime, player);
                    if (secondFish) {
                        // Get fish details from catalog for model/sprite
                        const secondFishDetails = FISH_CATALOG.find(f => f.name === secondFish.name);
                        if (secondFishDetails && secondFishDetails.modelData) {
                            const secondFishItem = ItemFactory.createFishItem(secondFish, secondFishDetails.modelData.modelUri, secondFishDetails.modelData.sprite);
                            this.stateManager.addInventoryItem(player, secondFishItem);
                            this.messageManager.sendGameMessage(`🎣 Twin Hook! Caught a second ${secondFish.name}!`, player);
                            console.log(`[FishingMiniGame] Twin Hook successfully caught second fish: ${secondFish.name}`);
                        } else {
                            console.log(`[FishingMiniGame] Twin Hook: Could not find fish details for ${secondFish.name}`);
                        }
                    } else {
                        console.log(`[FishingMiniGame] Twin Hook triggered but no second fish available`);
                    }
                }

                // Update inventory UI
                player.ui.sendData({
                    type: 'inventoryUpdate',
                    inventory: this.inventoryManager.getInventory(player)
                });

                // Track daily stats for fish caught
                const dailyStats = this.stateManager.getDailyStats(player);
                dailyStats.fishCaught += 1;
                const rarityKey = fish.rarity.toLowerCase() as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
                if (dailyStats.fishByRarity[rarityKey] !== undefined) {
                    dailyStats.fishByRarity[rarityKey] += 1;
                }
                
                // Track fishing location for daily quests
                const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
                if (playerEntity) {
                    const fishingPosition = new Vector3(playerEntity.position.x, playerEntity.position.y, playerEntity.position.z);
                    // Use getCurrentFishingZone helper function from FishLootManager
                    const { ALL_FISHING_ZONES } = require('./PhshTwoFishingZones');
                    let currentZone: any = undefined;
                    for (const zone of ALL_FISHING_ZONES) {
                        const dx = fishingPosition.x - zone.position.x;
                        const dy = fishingPosition.y - zone.position.y;
                        const dz = fishingPosition.z - zone.position.z;
                        const distSq = dx * dx + dy * dy + dz * dz;
                        const radiusSquared = zone.radius * zone.radius;
                        if (distSq <= radiusSquared) {
                            currentZone = zone;
                            break;
                        }
                    }
                    if (currentZone) {
                        this.stateManager.addLocationVisited(player, currentZone.id);
                        // Update quest progress for fishAtLocations
                        GameManager.instance.questManager?.updateQuestProgress(player, 'fishAtLocation', { zoneId: currentZone.id });
                    }
                }
                
                // Update quest progress with rarity
                // Check if bait was used for this catch
                const inventory = this.inventoryManager.getInventory(player);
                const equippedBaitId = inventory?.equippedBait;
                const hasBait = !!equippedBaitId;
                
                GameManager.instance.questManager?.updateQuestProgress(player, 'catchFish', { 
                    fishType: fish.name, 
                    weight: fish.weight,
                    rarity: fish.rarity,
                    usedBait: hasBait
                });

                // Update tutorial arrows AFTER fish is confirmed in inventory
                // This ensures arrows only update when fish is actually caught, not when hooked
                // Use 5 second delay to ensure fish is fully processed and in inventory
                setTimeout(() => {
                    const inventory = this.inventoryManager.getInventory(player);
                    const fishInInventory = inventory?.items.some(item => 
                        item.type === 'fish' && item.name === fish.name
                    );
                    
                    if (fishInInventory) {
                        // Fish is confirmed in inventory - safe to update arrows
                        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                        if (playerEntities && playerEntities.length > 0) {
                            const playerEntity = playerEntities[0];
                            if (playerEntity && (playerEntity as any).arrowManager) {
                                (playerEntity as any).arrowManager.updateArrowsForPlayer(player);
                            }
                        }
                    }
                }, 5000); // 5 second delay to ensure fish is fully caught and processed

                // Display the caught fish
                this.displayFish(player, fish);
            }
        }

        // Clean up the fishing line
        (this.fishingMiniGame as any).clearPlayerFishingLine(player);
    }

    private handleFailure(player: Player) {
        const state = this.stateManager.getState(player);
        if (!state) return;

        state.fishing.reelingGame.isReeling = false;
        
        // Restore controller animations
        this.restoreControllerAnimations(player);
        
        player.ui.sendData({
            type: 'hideReeling'
        });
        
        // NOTE: Quest bait (like ancient magnets) is NOT consumed on failure
        // since it was never consumed in the first place - it remains in player inventory
        const currentCatch = state.fishing.reelingGame.currentCatch;
        if (currentCatch?.questBait) {
            console.log(`[ReelingGame] Quest bait ${currentCatch.questBait.name} retained on reeling failure`);
        }
        
        this.messageManager.sendGameMessage("The fish got away!", player);
        // Update inventory UI
        player.ui.sendData({
            type: 'inventoryUpdate',
            inventory: this.inventoryManager.getInventory(player)
        });

        // Clean up the fishing line
        (this.fishingMiniGame as any).clearPlayerFishingLine(player);
    }

    // Pre-ItemFactory version
    /*
    private getFishDetails(caughtFish: CaughtFish) {
        // Look up the base fish data from catalog
        const fishData = FISH_CATALOG.find(f => f.name === caughtFish.name);
        if (!fishData) {
            console.error(`Could not find fish data for id: ${caughtFish.id}`);
            return null;
        }
    
        return {
            ...caughtFish,
            modelUri: fishData.modelData.modelUri,
            sprite: fishData.modelData.sprite,
            modelScale: fishData.modelData.baseScale,
            minWeight: fishData.minWeight
            // Add any other static properties we need from the catalog
        };
    }
    */
    
    private displayFish(player: Player, fish: CaughtFish) {
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0];
        
        // Remove existing display fish
        const existingDisplays = this.world.entityManager.getAllEntities().filter(
            entity => entity.name === 'displayFish'
        );
        existingDisplays.forEach(entity => entity.despawn());

        // Get fish data from catalog
        const fishData = FISH_CATALOG.find(f => f.name === fish.name);
        if (!fishData) return;

        // Calculate display scale
        const weightRatio = (fish.weight - fishData.minWeight) / (fishData.maxWeight - fishData.minWeight);
        const scaleMultiplier = fishData.modelData.baseScale + 
            (weightRatio * (fishData.modelData.maxScale - fishData.modelData.baseScale));

        // Create display entity
        // Use animation from catalog if specified, otherwise default to 'swim'
        const fishAnimation = fishData.modelData.animation || 'swim';
        const displayEntity = new Entity({
            name: 'displayFish',
            modelUri: fishData.modelData.modelUri,
            modelScale: scaleMultiplier,
            modelLoopedAnimations: [fishAnimation],
            opacity: 0.99,
            parent: playerEntity,
        });
        
        let displayY = 1;
        if (playerEntity instanceof GamePlayerEntity && playerEntity.isBoating) {
            displayY = 1.65;
        }
        displayEntity.spawn(this.world, { x: 0, y: displayY, z: 0 });
        displayEntity.setAngularVelocity({ x: 0, y: Math.PI / 1.5, z: 0 });
        // Rotate animation
        let startTime = Date.now();
        const duration = 3000;
        
        const rotateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(rotateInterval);
                displayEntity.despawn();
                return;
            }
            displayEntity.rotation.y = progress * Math.PI * 2;
        }, 16);
    }
    
    private displayRelicShard(player: Player): void {
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) return;
        
        const playerEntity = playerEntities[0] as GamePlayerEntity;
        
        // Remove existing display items (only despawn if they're actually spawned)
        const existingDisplays = this.world.entityManager.getAllEntities().filter(
            entity => entity.name === 'displayRelicShard' && entity.isSpawned
        );
        existingDisplays.forEach(entity => {
            try {
                if (entity.isSpawned) {
                    entity.despawn();
                }
            } catch (error) {
                // Entity may have already been despawned, ignore error
                console.warn(`[FishingMiniGame] Error despawning display entity:`, error);
            }
        });
        
        // Create display entity
        const displayEntity = new Entity({
            name: 'displayRelicShard',
            modelUri: 'models/items/relic_shard.gltf',
            modelScale: 1.5,
            parent: playerEntity,
        });
        
        const baseY = playerEntity.isBoating ? 1.6 : 1.2;
        displayEntity.spawn(this.world, { x: 0, y: baseY, z: 0 });
        displayEntity.setAngularVelocity({ x: 0, y: Math.PI / 2, z: 0 });
        
        // Rotate and float animation
        let startTime = Date.now();
        const duration = 3000;
        const floatY = playerEntity.isBoating ? 3 : 1.5;
        const floatHeight = 0.3;
        
        const animateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(animateInterval);
                displayEntity.despawn();
                return;
            }
            
            displayEntity.rotation.y = progress * Math.PI * 2;
            displayEntity.position.y = floatY + Math.sin(progress * Math.PI * 2) * floatHeight;
        }, 16);
    }

    // Add this new method to record catches in the leaderboard
    private async recordCatchInLeaderboard(player: Player, fish: CaughtFish) {
        try {
            // Get the LeaderboardManager instance
            const leaderboardManager = LeaderboardManager.instance;
            
            if (!leaderboardManager) {
                console.error('[LEADERBOARD] LeaderboardManager instance not available');
                return;
            }

            // Check if this fish is a trophy fish from the catalog
            const isTrophy = await this.checkIfTrophyFish(player, fish);
            
            // Only proceed with trophy mechanics if fish is marked as trophy in catalog
            if (isTrophy) {
                // Find the fish in the player's inventory and mark it as trophy
                const inventory = this.stateManager.getInventory(player);
                if (inventory) {
                    const fishItem = inventory.items.find(item => 
                        item.type === 'fish' && 
                        item.metadata?.fishStats?.preliminaryWeight === fish.weight &&
                        item.name === fish.name
                    );
                    
                    if (fishItem && fishItem.metadata?.fishStats) {
                        fishItem.metadata.fishStats.trophyStatus = 'trophy';
                        console.log(`[TROPHY] Marked ${fish.name} as trophy fish for potential leaderboard placement`);
                        
                        // Update inventory UI to show trophy status
                        this.inventoryManager.updateInventoryUI(player);
                    } else {
                        console.warn(`[TROPHY] Could not find fish item to mark as trophy: ${fish.name} with preliminary weight ${fish.weight}`);
                    }
                }
                
                // Send trophy message to player
                this.messageManager.sendGameMessage(`🏅 TROPHY FISH! Your ${fish.name} ranks in the top catches! Take it to the Weighmaster for official weighing!`, player);
                

            }
            
            // NOTE: We no longer add the fish to leaderboard here!
            // That will happen when the player takes it to the Collector for weighing
            
        } catch (e) {
            console.error('[LEADERBOARD] Error checking trophy status:', e);
        }
    }

    // New method to check if a fish is marked as trophy in the catalog
    private async checkIfTrophyFish(player: Player, fish: CaughtFish): Promise<boolean> {
        try {
            // Look up the fish in the catalog to check its isTrophy flag
            const fishData = FISH_CATALOG.find(f => f.name === fish.name);
            
            if (!fishData) {
                console.warn(`[TROPHY] Fish not found in catalog: ${fish.name}`);
                return false;
            }
            
            // Return true only if the fish is marked as a trophy fish in the catalog
            const isTrophy = fishData.isTrophy;
            
        
            
            return isTrophy;
        } catch (error) {
            console.error('[TROPHY] Error checking trophy status:', error);
            return false;
        }
    }
}