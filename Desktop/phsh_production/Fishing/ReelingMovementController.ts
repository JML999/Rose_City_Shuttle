import type { CaughtFish } from '../Inventory/ItemFactory';
import type { GamePlayerEntity } from '../GamePlayerEntity';
import { FISH_CATALOG, type FishData } from './PhshTwoFIshCatalog';
import type { PlayerStateManager } from '../PlayerStateManager';
import type { Player } from 'hytopia';
import { EnchantmentHelper } from './EnchantmentHelper';
interface PatternTransition {
    startPattern: MovementPattern;
    endPattern: MovementPattern;
    triggerCount: number;  // Number of bounces before transition
}

export enum MovementPattern {
    DEFAULT = 'default',
    SINE_WAVE = 'sine_wave',
    ERRATIC = 'erratic',
    SINE_ERRATIC = 'sine_erratic',
    DEFAULT_TO_ERRATIC = 'default_to_erratic',
    SINE_TO_ERRATIC = 'sine_to_erratic',
    PULSE = 'pulse',
    ACCELERATING = 'accelerating',
    ZIGZAG = 'zigzag',
    BURST = 'burst',
    WAYPOINT_HOVER = 'waypoint_hover',
    WAYPOINT_HOVER_DASH = 'waypoint_hover_dash',
    SINKER = 'sinker',
    FLOATER = 'floater'
}

export class ReelingMovementController {
    private readonly BASE_FISH_SPEED = 0.005;
    private readonly VALUE_SPEED_MULTIPLIER = 0.00002;
    private readonly SINE_FREQUENCY = 0.05;
    private readonly SINE_AMPLITUDE = 0.4;
    private readonly JITTER_AMOUNT = 0.05;
    private readonly PULSE_SLOW_FREQUENCY = 0.02;
    private readonly PULSE_FAST_FREQUENCY = 0.025;
    private readonly PULSE_DURATION = 60;  // Ticks before switching speeds
    private readonly ACCELERATION_RATE = 0.00002;  // How fast it speeds up
    private readonly MAX_ACCELERATION = 2.0;       // Maximum speed multiplier
    private readonly ZIGZAG_INTERVAL = 30;        // Ticks between direction changes
    private readonly BURST_SPEED = 1.8;           // Speed multiplier during burst
    private readonly BURST_DURATION = 20;         // Ticks of burst
    private readonly BURST_COOLDOWN = 60;         // Ticks between bursts

    private readonly PATTERN_TRANSITIONS: Partial<Record<MovementPattern, PatternTransition>> = {
        [MovementPattern.SINE_TO_ERRATIC]: {
            startPattern: MovementPattern.SINE_WAVE,
            endPattern: MovementPattern.ERRATIC,
            triggerCount: 2
        },
        [MovementPattern.DEFAULT_TO_ERRATIC]: {
            startPattern: MovementPattern.DEFAULT,
            endPattern: MovementPattern.ERRATIC,
            triggerCount: 3
        }
    };

    private bounceCount: number = 0;
    private currentDynamicPattern: MovementPattern;
    private activeTransition: PatternTransition | null = null;
    private hasTransitioned: boolean = false;
    private leftBounces: number = 0;
    private rightBounces: number = 0;
    private playerStateManager: PlayerStateManager;
    
    // Waypoint hover state
    private waypointState: {
        state: 'moving' | 'hovering';
        currentWaypoint: number;
        waypoints: number[];
        waypointIndex: number;
        hoverStartTime: number;
        hoverDuration: number;
        hoverOscillation: number;
    } | null = null;
    
    // Waypoint hover dash state (for rare fish)
    private waypointDashState: {
        phase: 'normal' | 'dashing' | 'dashHover' | 'returning' | 'pulsing';
        normalState: 'moving' | 'hovering' | 'feinting';
        currentWaypoint: number;
        waypoints: number[];
        waypointIndex: number;
        hoverStartTime: number;
        hoverDuration: number;
        hoverOscillation: number;
        dashTarget: number;
        dashStartTime: number;
        dashHoverStartTime: number;
        dashHoverDuration: number;
        firstWaypoint: number; // Starting waypoint to return to
        pulseStartTime: number;
        pulseDuration: number;
        feintStartTime: number;
        feintDuration: number;
        feintStartPosition: number;
        feintTargetPosition: number;
        speciesRarity: string; // Store fish rarity for difficulty scaling
    } | null = null;
    
    // Sinker/Floater state (for uncommon/rare fish)
    private sinkerFloaterState: {
        state: 'moving' | 'hovering';
        currentWaypoint: number;
        waypoints: number[];
        waypointIndex: number;
        hoverStartTime: number;
        hoverDuration: number;
        hoverOscillation: number;
    } | null = null;
    constructor(playerStateManager: PlayerStateManager) {
        this.currentDynamicPattern = MovementPattern.DEFAULT;
        this.playerStateManager = playerStateManager;
    }

    calculateInitialVelocity(fish: CaughtFish, rod: any, player: Player, fishDataFromCatalog: FishData, drag: number = 1): number {
        // Helper function to capitalize the first letter
        const capitalizeFirstLetter = (str: string) => {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        };
        
        // Use passed fishDataFromCatalog
        const speciesRarity = fishDataFromCatalog.rarity;

        // Base difficulty by species rarity
        // Epic, legendary, and mythic are significantly harder to encourage enchanted rods
        // Without enchanted rods (drag/catchSpeed bonuses), these will be quite difficult
        const SPECIES_BASE: Record<string, number> = {
            'common': 0.007,
            'uncommon': 0.008,
            'rare': 0.01,
            'epic': 0.0144, // Increased by 20% (0.012 * 1.20) - quite difficult without enchanted rod
            'legendary': 0.01464, // Increased by 20% (0.0122 * 1.20) - quite difficult without enchanted rod
            'mythic': 0.01476 // Increased by 20% (0.0123 * 1.20) - quite difficult without enchanted rod
        };

        // Base multipliers for common/uncommon species
        const CATCH_RARITY_MULTIPLIER: Record<string, number> = {
            'Common': 1.0,
            'Uncommon': 1.4,
            'Rare': 1.7,
            'Epic': 1.9,
            'Legendary': 2.1,
            'Mythic': 2.3 // Mythic catch rarity for common/uncommon species
        };

        // Custom multipliers for rare species (like grouper)
        const RARE_SPECIES_RARITY_MULTIPLIER: Record<string, number> = {
            'Common': 1.7,
            'Uncommon': 1.725,
            'Rare': 1.75,
            'Epic': 1.775,
            'Legendary': 1.8,
            'Mythic': 1.825 // Rare species with mythic catch rarity
        };

        // Custom multipliers for epic species
        const EPIC_SPECIES_RARITY_MULTIPLIER: Record<string, number> = {
            'Common': 1.75,
            'Uncommon': 1.775,
            'Rare': 1.8,
            'Epic': 1.825,
            'Legendary': 1.85,
            'Mythic': 1.875 // Epic species with mythic catch rarity
        };

        // Custom multipliers for legendary species (adjusted to match epic difficulty)
        const LEGENDARY_SPECIES_RARITY_MULTIPLIER: Record<string, number> = {
            'Common': 1.8,
            'Uncommon': 1.82,
            'Rare': 1.84,
            'Epic': 1.795, // Adjusted to match epic difficulty: 0.0122 * 1.795 ≈ 0.0219 (same as epic)
            'Legendary': 1.81,
            'Mythic': 1.85 // Legendary species with mythic catch rarity - slightly harder than legendary catch
        };

        // Custom multipliers for mythic species (slightly higher than epic for slight progression)
        const MYTHIC_SPECIES_RARITY_MULTIPLIER: Record<string, number> = {
            'Common': 1.78,
            'Uncommon': 1.8,
            'Rare': 1.83,
            'Epic': 1.85, // Slightly higher than epic's 1.825 for ~2-3% harder
            'Legendary': 1.88,
            'Mythic': 1.9 // Mythic species with mythic catch rarity - highest difficulty
        };

        // Combine both rarity factors
        let baseVelocity = SPECIES_BASE[speciesRarity] || 0.005; // speciesRarity is already lowercase
        let rarityMultiplier: number;
        const capitalizedCatchRarity = capitalizeFirstLetter(fish.rarity); // fish.rarity is lowercase catch rarity

        // Select the appropriate multiplier scale based on species rarity
        switch (speciesRarity) { // Switch on lowercase speciesRarity
            case 'rare':
                rarityMultiplier = RARE_SPECIES_RARITY_MULTIPLIER[capitalizedCatchRarity];
                break;
            case 'epic':
                rarityMultiplier = EPIC_SPECIES_RARITY_MULTIPLIER[capitalizedCatchRarity];
                break;
            case 'legendary':
                rarityMultiplier = LEGENDARY_SPECIES_RARITY_MULTIPLIER[capitalizedCatchRarity];
                break;
            case 'mythic':
                rarityMultiplier = MYTHIC_SPECIES_RARITY_MULTIPLIER[capitalizedCatchRarity];
                break;
            default: // Covers 'common' and 'uncommon' speciesRarity
                rarityMultiplier = CATCH_RARITY_MULTIPLIER[capitalizedCatchRarity];
                break;
        }
        console.log('Rarity multiplier:', rarityMultiplier, 'for catchRarity:', fish.rarity, '(speciesRarity:', speciesRarity, ') fishName:', fish.name);

        // Safety check: if rarityMultiplier is undefined, use a fallback
        if (rarityMultiplier === undefined) {
            console.warn(`[ReelingMovementController] Undefined rarity multiplier for catchRarity: ${fish.rarity}, speciesRarity: ${speciesRarity}. Using fallback multiplier.`);
            // Use the highest multiplier from the appropriate table as fallback
            switch (speciesRarity) {
                case 'rare':
                    rarityMultiplier = RARE_SPECIES_RARITY_MULTIPLIER['Legendary'] || 1.8;
                    break;
                case 'epic':
                    rarityMultiplier = EPIC_SPECIES_RARITY_MULTIPLIER['Legendary'] || 1.85;
                    break;
                case 'legendary':
                    rarityMultiplier = LEGENDARY_SPECIES_RARITY_MULTIPLIER['Legendary'] || 1.81;
                    break;
                case 'mythic':
                    rarityMultiplier = MYTHIC_SPECIES_RARITY_MULTIPLIER['Legendary'] || 1.88;
                    break;
                default:
                    rarityMultiplier = CATCH_RARITY_MULTIPLIER['Legendary'] || 2.1;
            }
        }

        // Apply the multiplier to the base velocity
        let velocity = baseVelocity * rarityMultiplier;

        // Make rare and legendary chests 20% easier to catch (reduce velocity by 20%)
        const isChest = fishDataFromCatalog.isLoot && (
            fishDataFromCatalog.id === 'rare_chest' || 
            fishDataFromCatalog.id === 'legendary_chest' ||
            fishDataFromCatalog.id === 'common_chest'
        );
        if (isChest && (speciesRarity === 'rare' || speciesRarity === 'legendary')) {
            velocity *= 0.8; // 20% easier (reduce velocity by 20%)
            console.log(`[ReelingMovementController] Chest difficulty reduction applied: ${fishDataFromCatalog.id} velocity reduced by 20%`);
        }

        // Add small value modifier with cap
        const VALUE_MULTIPLIER = 0.000002;
        const MAX_VALUE_CONTRIBUTION = 0.008;
        let valueContribution = Math.min(fish.value * VALUE_MULTIPLIER, MAX_VALUE_CONTRIBUTION);
        
        const finalVelocity = velocity + valueContribution;

        // Hard cap on final velocity
        const ABSOLUTE_MAX_VELOCITY = 0.0325;
        const playerLevel = this.playerStateManager.getCurrentLevel(player);
        var levelDiscount = 1;
        if (playerLevel > 10) {
            levelDiscount =levelDiscount * 0.98;
        }
        if (playerLevel > 25) {
            levelDiscount =levelDiscount * 0.96;
        }
        if (playerLevel > 30) {
            levelDiscount =levelDiscount * 0.94;
        }
        const equippedBait = this.playerStateManager.getInventory(player)
            ?.items.find(item => 
                item.type === 'bait' && 
                item.equipped === true
            );

        // Bait drag is now applied additively in FishingMiniGame.ts, so drag already includes bait bonus
        // We just use the drag value passed in (which includes both rod enchantment and bait bonuses)
        console.log('[FISHING] Found equipped bait:', equippedBait);
        const fishVelocity = Math.min(finalVelocity, ABSOLUTE_MAX_VELOCITY);
        // Apply drag multiplier (higher drag = slower fish)
        // Note: drag already includes bait bonus from FishingMiniGame.ts
        const dragMultiplier = 1 / (drag || 1);
        const v = fishVelocity * dragMultiplier * levelDiscount; 
        console.log('Fish:', {
            name: fish.name,
            speciesRarity,
            catchRarity: fish.rarity,
            value: fish.value,
            baseVelocity,
            rarityMultiplier,
            valueContribution,
            finalVelocity: fishVelocity,
            drag: drag,
            levelDiscount: levelDiscount,
            v
        });

        // Apply level discount to make higher level players have slightly easier time
        // But epic/legendary/mythic are still quite difficult without enchanted rods
        return fishVelocity * dragMultiplier * levelDiscount;
    }

    getMovementPattern(fish: CaughtFish, fishDataFromCatalog: FishData): MovementPattern {
        const speciesRarity = fishDataFromCatalog.rarity;
        
        // Epic+ fish use WAYPOINT_HOVER_DASH (normal hover + dash + pulse behavior)
        if (['epic', 'legendary', 'mythic'].includes(speciesRarity)) {
            return MovementPattern.WAYPOINT_HOVER_DASH;
        }
        
        // Common fish use normal WAYPOINT_HOVER pattern
        if (speciesRarity === 'common') {
            return MovementPattern.WAYPOINT_HOVER;
        }
        
        // Uncommon and Rare fish use SINKER or FLOATER (random)
        if (speciesRarity === 'uncommon' || speciesRarity === 'rare') {
            return Math.random() < 0.5 ? MovementPattern.SINKER : MovementPattern.FLOATER;
        }
        
        // Fallback
        return MovementPattern.WAYPOINT_HOVER;
    }

    updateFishPosition(currentPosition: number, velocity: number, pattern: MovementPattern, time: number, rod?: any, speciesRarity?: string): {position: number, velocity: number} {
        // Check if this is a transition pattern
        if (this.PATTERN_TRANSITIONS[pattern]) {
            if (!this.activeTransition) {
                const transition = this.PATTERN_TRANSITIONS[pattern];
                if (transition) {
                    this.activeTransition = transition;
                    this.currentDynamicPattern = this.activeTransition.startPattern;
                }
            }

            // Check for transition trigger
            if (!this.hasTransitioned) {
                if (currentPosition <= 0.2) {
                    this.leftBounces++;
                } else if (currentPosition >= 0.8) {
                    this.rightBounces++;
                }
                
                const totalBounces = Math.min(this.leftBounces, this.rightBounces);
                if (this.activeTransition && totalBounces >= this.activeTransition.triggerCount) {
                    this.currentDynamicPattern = this.activeTransition.endPattern;
                    this.hasTransitioned = true;
                }
            }
            pattern = this.currentDynamicPattern;
        }

        // NOTE: Fatigue is now applied in FishingMiniGame.ts to the base velocity
        // This prevents compounding when velocity is modified by movement patterns
        // No fatigue application here - velocity passed in is already fatigue-adjusted
        
        // Debug logging for movement pattern velocity modifications
        const velocityBeforePattern = velocity;
        const positionBeforePattern = currentPosition;
        
        // Warn if incoming velocity is suspiciously low
        if (Math.abs(velocity) < 0.0001 && time % 60 === 0) {
            console.warn(`[ReelingMovementController] WARNING: Incoming velocity is very low: ${velocity.toFixed(6)} at time ${(time/60).toFixed(2)}s`);
        }

        switch (pattern) {
            case MovementPattern.SINE_WAVE:
                const newPosition = 0.5 + Math.sin(time * this.SINE_FREQUENCY) * this.SINE_AMPLITUDE;
                // Reduced threshold to make bounce detection more reliable
                if (Math.abs(Math.sin(time * this.SINE_FREQUENCY)) > 0.9) {
                    if (newPosition > 0.8) {
                        this.rightBounces++;                    }
                    if (newPosition < 0.2) {
                        this.leftBounces++;
                    }
                }
                return {
                    position: newPosition,
                    velocity: velocity
                };
                
            case MovementPattern.ERRATIC:
                if (Math.random() < 0.05) velocity *= -1;
                const erraticPosition = Math.max(0.1, Math.min(0.9, currentPosition + velocity));
                // Debug: Check if velocity is being reduced to near-zero
                if (Math.abs(velocity) < 0.0001 && time % 60 === 0) {
                    console.warn(`[ReelingMovementController] ERRATIC pattern - velocity very low: ${velocity.toFixed(6)}`);
                }
                return {
                    position: erraticPosition,
                    velocity: velocity
                };
                
            case MovementPattern.SINE_ERRATIC:
                const basePos = 0.5 + Math.sin(time * this.SINE_FREQUENCY) * this.SINE_AMPLITUDE;
                
                if (Math.random() < 0.15) {
                    const velocityModifier = (Math.random() < 0.5) ? -1 : (0.5 + Math.random());
                    velocity *= velocityModifier;
                    // Debug: Warn if velocity is being reduced significantly
                    if (velocityModifier < 0.6 && time % 60 === 0) {
                        console.warn(`[ReelingMovementController] SINE_ERRATIC - velocity reduced by ${(velocityModifier*100).toFixed(1)}% to ${velocity.toFixed(6)}`);
                    }
                }
                
                const jitter = 0;
                const combinedPos = basePos + (velocity * 0.5) + jitter;
                
                return {
                    position: Math.max(0.1, Math.min(0.9, combinedPos)),
                    velocity: velocity
                };
                
            case MovementPattern.PULSE:
                // Switch frequency based on time
                const isPulseFast = Math.floor(time / this.PULSE_DURATION) % 2 === 0;
                const currentFrequency = isPulseFast ? this.PULSE_FAST_FREQUENCY : this.PULSE_SLOW_FREQUENCY;
                
                const pulsePosition = 0.5 + Math.sin(time * currentFrequency) * this.SINE_AMPLITUDE;
                
                // Add bounce detection for transitions
                if (Math.abs(Math.sin(time * currentFrequency)) > 0.9) {
                    if (pulsePosition > 0.8) {
                        this.rightBounces++;
                    }
                    if (pulsePosition < 0.2) {
                        this.leftBounces++;                    }
                }
                
                return {
                    position: pulsePosition,
                    velocity: velocity
                };
                
            case MovementPattern.ACCELERATING:
                const accelerationMultiplier = Math.min(1 + (time * this.ACCELERATION_RATE), this.MAX_ACCELERATION);
                if (currentPosition <= 0.05 || currentPosition >= 0.95) {
                    velocity *= -1;
                }
                return {
                    position: Math.max(0.05, Math.min(0.95, currentPosition + (velocity * accelerationMultiplier))),
                    velocity: velocity
                };

            case MovementPattern.ZIGZAG:
                if (time % this.ZIGZAG_INTERVAL === 0) {
                    velocity *= -1;
                }
                return {
                    position: Math.max(0.05, Math.min(0.95, currentPosition + velocity)),
                    velocity: velocity
                };

            case MovementPattern.BURST:
                const isBursting = Math.floor(time / this.BURST_DURATION) % 3 === 0;
                const burstMultiplier = isBursting ? this.BURST_SPEED : 1.0;
                if (currentPosition <= 0.05 || currentPosition >= 0.95) {
                    velocity *= -1;
                }
                return {
                    position: Math.max(0.05, Math.min(0.95, currentPosition + (velocity * burstMultiplier))),
                    velocity: velocity
                };
                
            case MovementPattern.WAYPOINT_HOVER:
                // Initialize waypoint state if needed
                if (!this.waypointState) {
                    // Generate random waypoints between 0.3 and 0.8
                    // Ensure first waypoint is different from starting position (0.5)
                    const waypoints: number[] = [];
                    let firstWaypoint = 0.5;
                    // Make sure first waypoint is at least 0.15 away from start
                    while (Math.abs(firstWaypoint - 0.5) < 0.15) {
                        firstWaypoint = 0.3 + Math.random() * 0.5; // Random between 0.3-0.8
                    }
                    waypoints.push(firstWaypoint);
                    
                    // Add 3 more waypoints
                    for (let i = 0; i < 3; i++) {
                        waypoints.push(0.3 + Math.random() * 0.5); // Random between 0.3-0.8
                    }
                    
                    // Shorter hover durations for harder fish (common stays at 120)
                    const fishRarity = speciesRarity?.toLowerCase() || 'common';
                    const hoverDuration = fishRarity === 'common' ? 120 : 
                                        fishRarity === 'uncommon' ? 115 : 
                                        fishRarity === 'rare' ? 110 : 120; // ticks (60fps)
                    
                    this.waypointState = {
                        state: 'moving',
                        currentWaypoint: waypoints[0],
                        waypoints: waypoints,
                        waypointIndex: 0,
                        hoverStartTime: 0,
                        hoverDuration: hoverDuration,
                        hoverOscillation: 0
                    };
                }
                
                const ws = this.waypointState;
                
                if (ws.state === 'moving') {
                    // Move slowly toward waypoint
                    const targetPos = ws.waypoints[ws.waypointIndex];
                    const distance = targetPos - currentPosition;
                    // Use a minimum movement speed to ensure visible movement
                    // If velocity is too low or zero, use a fixed slow speed
                    const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                    const moveSpeed = baseMoveSpeed * 0.6; // 60% of velocity for more visible movement
                    
                    if (Math.abs(distance) < 0.01) {
                        // Reached waypoint - start hovering
                        ws.state = 'hovering';
                        ws.hoverStartTime = time;
                        ws.currentWaypoint = targetPos;
                        return {
                            position: targetPos,
                            velocity: 0 // Stop moving
                        };
                    } else {
                        // Move toward waypoint slowly
                        const direction = distance > 0 ? 1 : -1;
                        const newPos = currentPosition + (moveSpeed * direction);
                        return {
                            position: Math.max(0.1, Math.min(0.9, newPos)),
                            velocity: baseMoveSpeed * direction * 0.6 // Return velocity for next frame
                        };
                    }
                } else {
                    // Hovering state - gentle sine oscillation (reverb)
                    const hoverTime = time - ws.hoverStartTime;
                    
                    if (hoverTime >= ws.hoverDuration) {
                        // Hover complete - transition to moving state
                        // Store current position (old waypoint + oscillation) before updating waypoint
                        const currentPositionAtHover = ws.currentWaypoint + ws.hoverOscillation;
                        
                        // Update to next waypoint
                        ws.state = 'moving';
                        ws.waypointIndex = (ws.waypointIndex + 1) % ws.waypoints.length;
                        ws.currentWaypoint = ws.waypoints[ws.waypointIndex];
                        
                        // Return current position (where we were hovering) - don't teleport!
                        // The moving state will gradually move from here to the new waypoint
                        return {
                            position: currentPositionAtHover,
                            velocity: Math.max(Math.abs(velocity), 0.001) // Ensure we have velocity to move
                        };
                    } else {
                        // Gentle sine oscillation around waypoint
                        const hoverAmplitude = 0.015; // Very small oscillation (1.5% of meter)
                        const hoverFrequency = 0.08; // Slow oscillation
                        ws.hoverOscillation = Math.sin(hoverTime * hoverFrequency) * hoverAmplitude;
                        
                        return {
                            position: Math.max(0.1, Math.min(0.9, ws.currentWaypoint + ws.hoverOscillation)),
                            velocity: 0 // No velocity during hover
                        };
                    }
                }
                
            case MovementPattern.WAYPOINT_HOVER_DASH:
                // Initialize dash state if needed
                if (!this.waypointDashState) {
                    // Generate random waypoints between 0.3 and 0.8
                    const waypoints: number[] = [];
                    let firstWaypoint = 0.5;
                    // Make sure first waypoint is at least 0.15 away from start
                    while (Math.abs(firstWaypoint - 0.5) < 0.15) {
                        firstWaypoint = 0.3 + Math.random() * 0.5;
                    }
                    waypoints.push(firstWaypoint);
                    
                    // Add 2-3 more waypoints
                    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                        waypoints.push(0.3 + Math.random() * 0.5);
                    }
                    
                    // Dash target is a random position (can be anywhere)
                    const dashTarget = 0.2 + Math.random() * 0.6; // Random between 0.2-0.8
                    
                    // Shorter hover durations for harder fish (less time to catch up)
                    const fishRarity = speciesRarity?.toLowerCase() || 'epic';
                    const hoverDuration = fishRarity === 'epic' ? 110 : 
                                        fishRarity === 'legendary' ? 100 : 
                                        fishRarity === 'mythic' ? 90 : 120; // ticks (60fps)
                    
                    this.waypointDashState = {
                        phase: 'normal',
                        normalState: 'feinting', // Start with feint
                        currentWaypoint: waypoints[0],
                        waypoints: waypoints,
                        waypointIndex: 0,
                        hoverStartTime: 0,
                        hoverDuration: hoverDuration,
                        hoverOscillation: 0,
                        dashTarget: dashTarget,
                        dashStartTime: 0,
                        dashHoverStartTime: 0,
                        dashHoverDuration: 90, // 1.5 seconds
                        firstWaypoint: waypoints[0],
                        pulseStartTime: 0,
                        pulseDuration: 180, // 3 seconds of pulsing
                        feintStartTime: 0,
                        feintDuration: 30, // 0.5 seconds feint
                        feintStartPosition: 0.5,
                        feintTargetPosition: 0.5,
                        speciesRarity: fishRarity // Store for reference
                    };
                }
                
                const wds = this.waypointDashState;
                
                if (wds.phase === 'normal') {
                    // Run normal waypoint hover pattern
                    if (wds.normalState === 'feinting') {
                        // Feint phase - quick pulse in opposite direction before moving to waypoint
                        const feintTime = time - wds.feintStartTime;
                        const targetPos = wds.waypoints[wds.waypointIndex];
                        
                        if (feintTime >= wds.feintDuration) {
                            // Feint complete - start moving to waypoint
                            wds.normalState = 'moving';
                            return {
                                position: currentPosition, // Stay at current position
                                velocity: Math.max(Math.abs(velocity), 0.001)
                            };
                        } else {
                            // Move quickly in opposite direction of waypoint
                            const waypointDirection = targetPos > wds.feintStartPosition ? 1 : -1;
                            const feintDirection = -waypointDirection; // Opposite direction
                            const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                            const feintSpeed = baseMoveSpeed * 2.0; // 2x speed for feint
                            
                            const newPos = currentPosition + (feintSpeed * feintDirection);
                            return {
                                position: Math.max(0.1, Math.min(0.9, newPos)),
                                velocity: feintSpeed * feintDirection
                            };
                        }
                    } else if (wds.normalState === 'moving') {
                        const targetPos = wds.waypoints[wds.waypointIndex];
                        const distance = targetPos - currentPosition;
                        const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                        const moveSpeed = baseMoveSpeed * 0.6;
                        
                        if (Math.abs(distance) < 0.01) {
                            // Reached waypoint - start hovering
                            wds.normalState = 'hovering';
                            wds.hoverStartTime = time;
                            wds.currentWaypoint = targetPos;
                            return {
                                position: targetPos,
                                velocity: 0
                            };
                        } else {
                            const direction = distance > 0 ? 1 : -1;
                            const newPos = currentPosition + (moveSpeed * direction);
                            return {
                                position: Math.max(0.1, Math.min(0.9, newPos)),
                                velocity: baseMoveSpeed * direction * 0.6
                            };
                        }
                    } else {
                        // Hovering
                        const hoverTime = time - wds.hoverStartTime;
                        
                        if (hoverTime >= wds.hoverDuration) {
                            // Check if we've completed all waypoints
                            const nextIndex = (wds.waypointIndex + 1) % wds.waypoints.length;
                            
                            if (nextIndex === 0) {
                                // Completed full cycle - switch to dash phase
                                wds.phase = 'dashing';
                                wds.dashStartTime = time;
                                const currentPosAtHover = wds.currentWaypoint + wds.hoverOscillation;
                                return {
                                    position: currentPosAtHover,
                                    velocity: Math.max(Math.abs(velocity), 0.001)
                                };
                            } else {
                                // Move to next waypoint - start with feint
                                const currentPosAtHover = wds.currentWaypoint + wds.hoverOscillation;
                                const nextWaypoint = wds.waypoints[nextIndex];
                                wds.normalState = 'feinting';
                                wds.feintStartTime = time;
                                wds.feintStartPosition = currentPosAtHover;
                                wds.waypointIndex = nextIndex;
                                wds.currentWaypoint = nextWaypoint;
                                return {
                                    position: currentPosAtHover,
                                    velocity: Math.max(Math.abs(velocity), 0.001)
                                };
                            }
                        } else {
                            // Gentle oscillation
                            const hoverAmplitude = 0.015;
                            const hoverFrequency = 0.08;
                            wds.hoverOscillation = Math.sin(hoverTime * hoverFrequency) * hoverAmplitude;
                            return {
                                position: Math.max(0.1, Math.min(0.9, wds.currentWaypoint + wds.hoverOscillation)),
                                velocity: 0
                            };
                        }
                    }
                } else if (wds.phase === 'dashing') {
                    // Quick dash to dash target
                    const distance = wds.dashTarget - currentPosition;
                    const dashSpeed = Math.max(Math.abs(velocity), 0.003) * 3.0; // 3x speed for dash
                    
                    if (Math.abs(distance) < 0.01) {
                        // Reached dash target - start dash hover
                        wds.phase = 'dashHover';
                        wds.dashHoverStartTime = time;
                        wds.hoverOscillation = 0;
                        return {
                            position: wds.dashTarget,
                            velocity: 0
                        };
                    } else {
                        const direction = distance > 0 ? 1 : -1;
                        const newPos = currentPosition + (dashSpeed * direction);
                        return {
                            position: Math.max(0.1, Math.min(0.9, newPos)),
                            velocity: dashSpeed * direction
                        };
                    }
                } else if (wds.phase === 'dashHover') {
                    // Hover at dash target
                    const hoverTime = time - wds.dashHoverStartTime;
                    
                    if (hoverTime >= wds.dashHoverDuration) {
                        // Dash hover complete - return to first waypoint
                        wds.phase = 'returning';
                        const currentPosAtHover = wds.dashTarget + wds.hoverOscillation;
                        return {
                            position: currentPosAtHover,
                            velocity: Math.max(Math.abs(velocity), 0.001)
                        };
                    } else {
                        // Gentle oscillation at dash target
                        const hoverAmplitude = 0.015;
                        const hoverFrequency = 0.08;
                        wds.hoverOscillation = Math.sin(hoverTime * hoverFrequency) * hoverAmplitude;
                        return {
                            position: Math.max(0.1, Math.min(0.9, wds.dashTarget + wds.hoverOscillation)),
                            velocity: 0
                        };
                    }
                } else if (wds.phase === 'returning') {
                    // Returning phase - move slowly back to first waypoint
                    const distance = wds.firstWaypoint - currentPosition;
                    const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                    const moveSpeed = baseMoveSpeed * 0.6; // Normal speed
                    
                    if (Math.abs(distance) < 0.01) {
                        // Reached first waypoint - switch to pulse phase
                        wds.phase = 'pulsing';
                        wds.pulseStartTime = time;
                        return {
                            position: wds.firstWaypoint,
                            velocity: 0
                        };
                    } else {
                        const direction = distance > 0 ? 1 : -1;
                        const newPos = currentPosition + (moveSpeed * direction);
                        return {
                            position: Math.max(0.1, Math.min(0.9, newPos)),
                            velocity: baseMoveSpeed * direction * 0.6
                        };
                    }
                } else if (wds.phase === 'pulsing') {
                    // Pulse phase - alternating fast/slow sine wave movement
                    const pulseTime = time - wds.pulseStartTime;
                    
                    if (pulseTime >= wds.pulseDuration) {
                        // Pulse phase complete - return to normal waypoint hover with feint
                        wds.phase = 'normal';
                        wds.normalState = 'feinting'; // Start with feint
                        wds.waypointIndex = 0;
                        wds.currentWaypoint = wds.firstWaypoint;
                        wds.hoverStartTime = 0;
                        wds.hoverOscillation = 0;
                        wds.feintStartTime = time;
                        wds.feintStartPosition = 0.5; // Center position
                        // Return to center position to start waypoint cycle again
                        return {
                            position: 0.5, // Center position
                            velocity: 0
                        };
                    } else {
                        // Apply pulse pattern (alternating fast/slow sine wave)
                        const isPulseFast = Math.floor(pulseTime / this.PULSE_DURATION) % 2 === 0;
                        const currentFrequency = isPulseFast ? this.PULSE_FAST_FREQUENCY : this.PULSE_SLOW_FREQUENCY;
                        const pulsePosition = 0.5 + Math.sin(pulseTime * currentFrequency) * this.SINE_AMPLITUDE;
                        
                        return {
                            position: Math.max(0.1, Math.min(0.9, pulsePosition)),
                            velocity: velocity // Keep velocity for smooth transitions
                        };
                    }
                }
                
            case MovementPattern.SINKER:
                // SINKER: Same as waypoint hover, but moves DOWN faster, UP slower
                // Initialize state if needed
                if (!this.sinkerFloaterState) {
                    // Generate random waypoints (same as normal waypoint hover)
                    const waypoints: number[] = [];
                    let firstWaypoint = 0.5;
                    while (Math.abs(firstWaypoint - 0.5) < 0.15) {
                        firstWaypoint = 0.3 + Math.random() * 0.5; // Random between 0.3-0.8
                    }
                    waypoints.push(firstWaypoint);
                    
                    for (let i = 0; i < 3; i++) {
                        waypoints.push(0.3 + Math.random() * 0.5);
                    }
                    
                    // Shorter hover durations for harder fish (uncommon/rare get progressively shorter)
                    const fishRarity = speciesRarity?.toLowerCase() || 'uncommon';
                    const hoverDuration = fishRarity === 'uncommon' ? 115 : 
                                        fishRarity === 'rare' ? 110 : 120;
                    
                    this.sinkerFloaterState = {
                        state: 'moving',
                        currentWaypoint: waypoints[0],
                        waypoints: waypoints,
                        waypointIndex: 0,
                        hoverStartTime: 0,
                        hoverDuration: hoverDuration,
                        hoverOscillation: 0
                    };
                }
                
                const sf = this.sinkerFloaterState;
                
                if (sf.state === 'moving') {
                    // Move slowly toward waypoint
                    const targetPos = sf.waypoints[sf.waypointIndex];
                    const distance = targetPos - currentPosition;
                    const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                    
                    // SINKER: Downward movement is faster (1.3x), upward is slower (0.7x)
                    const direction = distance > 0 ? 1 : -1;
                    const speedMultiplier = direction < 0 ? 1.3 : 0.7; // Down faster, up slower
                    const moveSpeed = baseMoveSpeed * 0.6 * speedMultiplier;
                    
                    if (Math.abs(distance) < 0.01) {
                        // Reached waypoint - start hovering
                        sf.state = 'hovering';
                        sf.hoverStartTime = time;
                        sf.currentWaypoint = targetPos;
                        return {
                            position: targetPos,
                            velocity: 0
                        };
                    } else {
                        // Move toward waypoint
                        const newPos = currentPosition + (moveSpeed * direction);
                        return {
                            position: Math.max(0.1, Math.min(0.9, newPos)),
                            velocity: baseMoveSpeed * direction * 0.6 * speedMultiplier
                        };
                    }
                } else {
                    // Hovering state - gentle sine oscillation
                    const hoverTime = time - sf.hoverStartTime;
                    
                    if (hoverTime >= sf.hoverDuration) {
                        // Hover complete - move to next waypoint
                        const currentPosAtHover = sf.currentWaypoint + sf.hoverOscillation;
                        sf.state = 'moving';
                        sf.waypointIndex = (sf.waypointIndex + 1) % sf.waypoints.length;
                        sf.currentWaypoint = sf.waypoints[sf.waypointIndex];
                        return {
                            position: currentPosAtHover,
                            velocity: Math.max(Math.abs(velocity), 0.001)
                        };
                    } else {
                        // Gentle oscillation
                        const hoverAmplitude = 0.015;
                        const hoverFrequency = 0.08;
                        sf.hoverOscillation = Math.sin(hoverTime * hoverFrequency) * hoverAmplitude;
                        return {
                            position: Math.max(0.1, Math.min(0.9, sf.currentWaypoint + sf.hoverOscillation)),
                            velocity: 0
                        };
                    }
                }
                
            case MovementPattern.FLOATER:
                // FLOATER: Same as waypoint hover, but moves UP faster, DOWN slower
                // Initialize state if needed
                if (!this.sinkerFloaterState) {
                    // Generate random waypoints (same as normal waypoint hover)
                    const waypoints: number[] = [];
                    let firstWaypoint = 0.5;
                    while (Math.abs(firstWaypoint - 0.5) < 0.15) {
                        firstWaypoint = 0.3 + Math.random() * 0.5; // Random between 0.3-0.8
                    }
                    waypoints.push(firstWaypoint);
                    
                    for (let i = 0; i < 3; i++) {
                        waypoints.push(0.3 + Math.random() * 0.5);
                    }
                    
                    // Shorter hover durations for harder fish (uncommon/rare get progressively shorter)
                    const fishRarity = speciesRarity?.toLowerCase() || 'uncommon';
                    const hoverDuration = fishRarity === 'uncommon' ? 115 : 
                                        fishRarity === 'rare' ? 110 : 120;
                    
                    this.sinkerFloaterState = {
                        state: 'moving',
                        currentWaypoint: waypoints[0],
                        waypoints: waypoints,
                        waypointIndex: 0,
                        hoverStartTime: 0,
                        hoverDuration: hoverDuration,
                        hoverOscillation: 0
                    };
                }
                
                const sf2 = this.sinkerFloaterState;
                
                if (sf2.state === 'moving') {
                    // Move slowly toward waypoint
                    const targetPos = sf2.waypoints[sf2.waypointIndex];
                    const distance = targetPos - currentPosition;
                    const baseMoveSpeed = Math.abs(velocity) > 0.0001 ? Math.abs(velocity) : 0.003;
                    
                    // FLOATER: Upward movement is faster (1.3x), downward is slower (0.7x)
                    const direction = distance > 0 ? 1 : -1;
                    const speedMultiplier = direction > 0 ? 1.3 : 0.7; // Up faster, down slower
                    const moveSpeed = baseMoveSpeed * 0.6 * speedMultiplier;
                    
                    if (Math.abs(distance) < 0.01) {
                        // Reached waypoint - start hovering
                        sf2.state = 'hovering';
                        sf2.hoverStartTime = time;
                        sf2.currentWaypoint = targetPos;
                        return {
                            position: targetPos,
                            velocity: 0
                        };
                    } else {
                        // Move toward waypoint
                        const newPos = currentPosition + (moveSpeed * direction);
                        return {
                            position: Math.max(0.1, Math.min(0.9, newPos)),
                            velocity: baseMoveSpeed * direction * 0.6 * speedMultiplier
                        };
                    }
                } else {
                    // Hovering state - gentle sine oscillation
                    const hoverTime = time - sf2.hoverStartTime;
                    
                    if (hoverTime >= sf2.hoverDuration) {
                        // Hover complete - move to next waypoint
                        const currentPosAtHover = sf2.currentWaypoint + sf2.hoverOscillation;
                        sf2.state = 'moving';
                        sf2.waypointIndex = (sf2.waypointIndex + 1) % sf2.waypoints.length;
                        sf2.currentWaypoint = sf2.waypoints[sf2.waypointIndex];
                        return {
                            position: currentPosAtHover,
                            velocity: Math.max(Math.abs(velocity), 0.001)
                        };
                    } else {
                        // Gentle oscillation
                        const hoverAmplitude = 0.015;
                        const hoverFrequency = 0.08;
                        sf2.hoverOscillation = Math.sin(hoverTime * hoverFrequency) * hoverAmplitude;
                        return {
                            position: Math.max(0.1, Math.min(0.9, sf2.currentWaypoint + sf2.hoverOscillation)),
                            velocity: 0
                        };
                    }
                }
                
            default:
                if (currentPosition <= 0.05 || currentPosition >= 0.95) {
                    velocity *= -1;
                }
                const defaultPosition = Math.max(0.05, Math.min(0.95, currentPosition + velocity));
                // Debug: Log if velocity changed significantly
                if (time % 60 === 0 && Math.abs(velocity - velocityBeforePattern) > 0.001) {
                    console.log(`[ReelingMovementController] DEFAULT pattern - velocity changed from ${velocityBeforePattern.toFixed(6)} to ${velocity.toFixed(6)}`);
                }
                return {
                    position: defaultPosition,
                    velocity: velocity
                };
        }
        
        // Final debug check - warn if velocity is near zero after pattern processing
        // Note: This won't execute for patterns that return early, but will catch issues in the default case
        if (Math.abs(velocity) < 0.0001 && time % 60 === 0) {
            console.error(`[ReelingMovementController] CRITICAL: Velocity is near zero (${velocity.toFixed(6)}) after ${pattern} pattern processing!`);
            console.error(`  Position: ${currentPosition.toFixed(3)}, Time: ${(time/60).toFixed(2)}s`);
        }
    }

    resetState() {
        this.bounceCount = 0;
        this.activeTransition = null;
        this.currentDynamicPattern = MovementPattern.DEFAULT;
        this.hasTransitioned = false;
        this.leftBounces = 0;
        this.rightBounces = 0;
        this.waypointState = null; // Reset waypoint state
        this.waypointDashState = null; // Reset dash state
        this.sinkerFloaterState = null; // Reset sinker/floater state
    }
}