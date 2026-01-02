import { SmartBlockEntity } from './SmartBlockEntity';
import { Player, SimpleEntityController, World, Vector3, SceneUI, PlayerEntity, ColliderShape } from 'hytopia';
import GameClock from '../GameClock';
import GameManager from '../GameManager';
import type { PlayerStateManager } from '../PlayerStateManager';

interface PlayerAltarUI {
    dialog?: SceneUI;
    cleanupTimer?: NodeJS.Timeout | null;
}

export class StarAltarBlockEntity extends SmartBlockEntity {
    private currentTimeOfDay: 'day' | 'night' = 'day';
    private isUpdatingAnimation = false; // Add flag to prevent simultaneous animation changes
    private lastAnimationUpdate = 0; // Track last update time
    private lastHourChecked: number = -1; // Track last hour we checked
    private updateInterval: NodeJS.Timeout | null = null; // Periodic update interval
    private nearbyPlayers: Map<string, PlayerAltarUI> = new Map(); // Track nearby players and their UI
    private interactionRadius: number = 3; // Radius for showing UI
    private readonly QUEST_ID = 'forrest_anglerfish_light';
    private static readonly FORREST_PATTERN = [0, 2, 4, 5]; // Fixed pattern for 6-tile grid (2 rows x 3 columns): top-left, top-right, bottom-left, bottom-center

    constructor(options: any) {
        // Determine initial animation based on current time
        const gameTime = GameClock.instance;
        // Stargazer moves at 17 (5 PM) to altar, so altar should be active from 17 (5 PM) to 6 AM
        const isNightTime = gameTime.hour >= 17 || gameTime.hour < 6;
        const initialAnimation = isNightTime ? 'idle_example' : 'inactive';
        
        console.log(`[StarAltarBlockEntity] Constructor called with modelUri: ${options.modelUri}, hour: ${gameTime.hour}, isNightTime: ${isNightTime}, animation: ${initialAnimation}`);
        
        super({
            ...options,
            controller: new SimpleEntityController(),
            modelLoopedAnimations: [initialAnimation]
        });
        
        // Set initial time of day state
        this.currentTimeOfDay = isNightTime ? 'night' : 'day';
        console.log(`[StarAltarBlockEntity] Initialized with ${initialAnimation} animation for ${this.currentTimeOfDay} time (hour: ${gameTime.hour})`);
    }

    override spawn(world: World, position: Vector3): void {
        console.log(`[StarAltarBlockEntity] Spawning at position: ${JSON.stringify(position)}`);
        super.spawn(world, position);
        console.log(`[StarAltarBlockEntity] Spawned successfully, isSpawned: ${this.isSpawned}`);
        
        // Add sensor collider for proximity detection (larger than the base collider)
        if (this.isSpawned) {
            this.createAndAddChildCollider({
                shape: ColliderShape.CYLINDER,
                radius: this.interactionRadius,
                halfHeight: 2,
                isSensor: true,
                onCollision: (other: any, started: boolean) => {
                    if (other instanceof PlayerEntity) {
                        const player = other.player;
                        if (started) {
                            this.onPlayerEnter(player);
                        } else {
                            this.onPlayerExit(player);
                        }
                    }
                },
            });
        }
        
        // Set initial animation state based on current time with a delay to avoid conflicts
        setTimeout(() => {
            this.updateAnimationForTimeOfDay();
        }, 500); // Wait 500ms after spawn before setting animation
        
        // Set up periodic check for hour changes (every 5 seconds)
        this.updateInterval = setInterval(() => {
            this.checkForHourChange();
        }, 5000);
        
        // Initialize last hour checked
        this.lastHourChecked = GameClock.instance.hour;
    }

    override despawn(): void {
        // Clear periodic update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clean up all player UIs
        this.nearbyPlayers.forEach((playerUI, playerId) => {
            this.cleanupPlayerUI(playerId);
        });
        this.nearbyPlayers.clear();
        
        // Reset animation update flag to prevent conflicts
        this.isUpdatingAnimation = false;
        
        super.despawn();
    }

    private checkForHourChange(): void {
        const currentHour = GameClock.instance.hour;
        if (currentHour !== this.lastHourChecked) {
            this.lastHourChecked = currentHour;
            // Hour changed, trigger animation update
            this.updateAnimationForTimeOfDay();
        }
    }

    private async updateAnimationForTimeOfDay(): Promise<void> {
        // Prevent simultaneous animation updates
        if (this.isUpdatingAnimation) {
            console.log(`[StarAltarBlockEntity] Animation update already in progress, skipping`);
            return;
        }

        const now = Date.now();
        // Reduce throttle to allow more frequent updates (10 seconds instead of 60)
        if (now - this.lastAnimationUpdate < 10000) {
            return;
        }

        this.isUpdatingAnimation = true;
        this.lastAnimationUpdate = now;

        try {
            const gameTime = GameClock.instance;
            // Stargazer moves at 17 (5 PM) to altar, so altar should be active from 17 (5 PM) to 6 AM
            const isNightTime = gameTime.hour >= 17 || gameTime.hour < 6; // 5 PM - 6 AM is night
            const newTimeOfDay = isNightTime ? 'night' : 'day';

            console.log(`[StarAltarBlockEntity] Current game time: ${gameTime.hour}:00, Time of day: ${newTimeOfDay}`);

            // Only update if time has actually changed
            if (newTimeOfDay !== this.currentTimeOfDay) {
                console.log(`[StarAltarBlockEntity] Time changed from ${this.currentTimeOfDay} to ${newTimeOfDay}`);
                this.currentTimeOfDay = newTimeOfDay;

                // Add longer delay before changing animations to avoid physics conflicts
                await new Promise(resolve => setTimeout(resolve, 500));

                // Update animation based on time of day with extra safety checks
                if (!this.isSpawned) {
                    console.log(`[StarAltarBlockEntity] Entity not spawned, skipping animation update`);
                    return;
                }

                if (this.currentTimeOfDay === 'night') {
                    // Night: Star altar should be active (idle_example animation)
                    this.stopModelAnimations(['inactive']);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (this.isSpawned) {
                        this.startModelLoopedAnimations(['idle_example']);
                        console.log(`[StarAltarBlockEntity] Set to 'idle_example' animation for night time`);
                    }
                } else {
                    // Day: Star altar should be dormant (inactive animation)
                    this.stopModelAnimations(['idle_example']);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (this.isSpawned) {
                        this.startModelLoopedAnimations(['inactive']);
                        console.log(`[StarAltarBlockEntity] Set to 'inactive' animation for day time`);
                    }
                }
            }
        } catch (error) {
            console.error(`[StarAltarBlockEntity] Error updating animation:`, error);
        } finally {
            // Reset flag after a longer delay
            setTimeout(() => {
                this.isUpdatingAnimation = false;
            }, 1000);
        }
    }

    private onPlayerEnter(player: Player): void {
        if (this.nearbyPlayers.has(player.id)) return;
        
        console.log(`[StarAltarBlockEntity] Player ${player.id} entered proximity`);
        
        // Show UI when player is close
        this.showAltarUI(player);
    }

    private onPlayerExit(player: Player): void {
        console.log(`[StarAltarBlockEntity] Player ${player.id} left proximity`);
        this.cleanupPlayerUI(player.id);
    }

    private showAltarUI(player: Player): void {
        const playerStateManager = (GameManager.instance as any)?.playerStateManager as PlayerStateManager | undefined;
        if (!playerStateManager) {
            console.error(`[StarAltarBlockEntity] No PlayerStateManager available`);
            return;
        }

        const state = playerStateManager.getState(player);
        if (!state) {
            console.error(`[StarAltarBlockEntity] No state found for player ${player.id}`);
            return;
        }

        // Check conditions
        const hasQuest = !!state.quests.active[this.QUEST_ID];
        
        // Only show dialogue if quest is active
        if (!hasQuest) {
            return; // Don't show any dialogue if quest isn't active
        }
        
        const equippedFish = playerStateManager.getEquippedFish(player);
        const hasAnglerfishEquipped = equippedFish && (
            equippedFish.metadata?.fishStats?.species === 'Anglerfish' ||
            equippedFish.metadata?.fishStats?.species === 'anglerfish' ||
            equippedFish.name === 'Anglerfish' ||
            equippedFish.id === 'anglerfish' ||
            equippedFish.id.startsWith('anglerfish_') ||
            equippedFish.id.includes('anglerfish')
        );
        const isNightTime = this.currentTimeOfDay === 'night';

        // Determine message based on conditions
        let message = "The star altar stands before you...";
        
        if (!isNightTime) {
            message = "The star altar lies dormant in the daylight. Return at night when the constellation appears.";
        } else if (!hasAnglerfishEquipped) {
            message = "The altar pulses with energy, but you need the light of an anglerfish to see the pattern clearly. Equip an anglerfish and return.";
        } else {
            message = "The altar glows brightly! The anglerfish's light reveals the pattern. Interact with the altar to begin.";
        }

        // Create UI for player
        const playerUI: PlayerAltarUI = {};
        
        if (this.isSpawned) {
            const playerEntities = this.world?.entityManager.getPlayerEntitiesByPlayer(player);
            if (playerEntities && playerEntities.length > 0) {
                const playerEntity = playerEntities[0];
                
                playerUI.dialog = new SceneUI({
                    templateId: 'npc-dialogue',
                    attachedToEntity: this,
                    offset: { x: 0, y: 2, z: 0 },
                    state: { 
                        text: message, 
                        npcName: "Star Altar",
                        owningPlayerId: player.id 
                    }
                });
                
                try {
                    playerUI.dialog.load(this.world as World);
                } catch (error) {
                    console.error(`[StarAltarBlockEntity] Error loading dialog UI:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        this.nearbyPlayers.set(player.id, playerUI);
    }

    private cleanupPlayerUI(playerId: string): void {
        const playerUI = this.nearbyPlayers.get(playerId);
        if (!playerUI) return;

        if (playerUI.dialog) {
            try {
                playerUI.dialog.unload();
            } catch (e) {
                console.error(`[StarAltarBlockEntity] Error unloading dialog:`, e);
            }
        }

        if (playerUI.cleanupTimer) {
            clearTimeout(playerUI.cleanupTimer);
        }

        this.nearbyPlayers.delete(playerId);
    }

    onPlayerInteract(player: Player) {
        const playerStateManager = (GameManager.instance as any)?.playerStateManager as PlayerStateManager | undefined;
        if (!playerStateManager) {
            console.error(`[StarAltarBlockEntity] No PlayerStateManager available`);
            return;
        }

        const state = playerStateManager.getState(player);
        if (!state) {
            console.error(`[StarAltarBlockEntity] No state found for player ${player.id}`);
            return;
        }

        // Check conditions
        const hasQuest = !!state.quests.active[this.QUEST_ID];
        const equippedFish = playerStateManager.getEquippedFish(player);
        const hasAnglerfishEquipped = equippedFish && (
            equippedFish.metadata?.fishStats?.species === 'Anglerfish' ||
            equippedFish.metadata?.fishStats?.species === 'anglerfish' ||
            equippedFish.name === 'Anglerfish' ||
            equippedFish.id === 'anglerfish' ||
            equippedFish.id.startsWith('anglerfish_') ||
            equippedFish.id.includes('anglerfish')
        );
        const isNightTime = this.currentTimeOfDay === 'night';

        // Check if all conditions are met
        if (hasQuest && isNightTime && hasAnglerfishEquipped) {
            // Check if player already attempted within 24 hours (once per night)
            const lastAttempt = state.flags?.lastStellarAlignmentAttempt;
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            
            if (lastAttempt && (now - lastAttempt < oneDayMs)) {
                // Already attempted within 24 hours
                const playerUI = this.nearbyPlayers.get(player.id);
                if (playerUI?.dialog) {
                    try {
                        playerUI.dialog.setState({ text: "The pattern has faded. Return tomorrow night to try again." });
                    } catch (e) {
                        console.error(`[StarAltarBlockEntity] Error updating dialog:`, e);
                    }
                }
                return;
            }
            
            // Mark attempt timestamp
            if (!state.flags) state.flags = {};
            state.flags.lastStellarAlignmentAttempt = now;
            
            // All conditions met - trigger mini-game
            
            // Send game start event
            player.ui.sendData({
                type: 'startStellarAlignment',
                pattern: StarAltarBlockEntity.FORREST_PATTERN,
                questId: this.QUEST_ID
            });
            
            // Update UI message
            const playerUI = this.nearbyPlayers.get(player.id);
            if (playerUI?.dialog) {
                try {
                    playerUI.dialog.setState({ text: "The pattern reveals itself! Follow the sequence..." });
                } catch (e) {
                    console.error(`[StarAltarBlockEntity] Error updating dialog:`, e);
                }
            }
        } else {
            // Conditions not met - show appropriate message
            let message = "The altar doesn't respond...";
            
            if (!hasQuest) {
                message = "You should speak with Forrest first. She might know something about this altar.";
            // } else if (!isNightTime) {
            //     message = "The altar is dormant. Return at night when the constellation appears.";
            } else if (!hasAnglerfishEquipped) {
                message = "You need to equip an anglerfish to provide light for the pattern.";
            }

            const playerUI = this.nearbyPlayers.get(player.id);
            if (playerUI?.dialog) {
                try {
                    playerUI.dialog.setState({ text: message });
                } catch (e) {
                    console.error(`[StarAltarBlockEntity] Error updating dialog:`, e);
                }
            }
        }
    }
}

