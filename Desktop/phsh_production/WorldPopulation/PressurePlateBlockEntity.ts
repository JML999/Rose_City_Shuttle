import { SmartBlockEntity } from './SmartBlockEntity';
import { Player, SimpleEntityController, World, Vector3, SceneUI, PlayerEntity, ColliderShape, Entity } from 'hytopia';
import GameManager from '../GameManager';
import { PlayerStateManager } from '../PlayerStateManager';
import { GamePlayerEntity } from '../GamePlayerEntity';

interface PlayerPlateUI {
    dialog?: SceneUI;
    cleanupTimer?: NodeJS.Timeout | null;
}

// Static registry to track pressure plate sequence across all plates
interface PlateSequenceState {
    playerId: string;
    sequence: string[]; // Array of plate types pressed in order
    lastPressTime: number;
}

export class PressurePlateBlockEntity extends SmartBlockEntity {
    private nearbyPlayers: Map<string, PlayerPlateUI> = new Map();
    private interactionRadius: number = 2;
    private readonly QUEST_ID = 'brock_strength_test';
    private readonly MIN_FISH_WEIGHT = 200; // pounds
    private readonly INTERACTION_COOLDOWN_MS = 1500; // 1.5 seconds cooldown between interactions
    
    // Static registry to track sequence per player
    private static playerSequences: Map<string, PlateSequenceState> = new Map();
    
    // Track last interaction time per player per plate
    private static lastInteractionTimes: Map<string, number> = new Map();
    
    // Plate type: 'insect', 'fish', or 'predator'
    private plateType: 'insect' | 'fish' | 'predator';
    
    // Expected sequence
    private static readonly EXPECTED_SEQUENCE = ['insect', 'fish', 'predator'];
    
    constructor(options: any & { plateType: 'insect' | 'fish' | 'predator' }) {
        super({
            ...options,
            controller: new SimpleEntityController()
        });
        
        this.plateType = options.plateType;
        if (!this.plateType) {
            console.error(`[PressurePlateBlockEntity] No plateType specified! Defaulting to 'insect'`);
            this.plateType = 'insect';
        }
        
    }

    override spawn(world: World, position: Vector3): void {
        super.spawn(world, position);
        
        // Add sensor collider for proximity detection
        if (this.isSpawned) {
            this.createAndAddChildCollider({
                shape: ColliderShape.CYLINDER,
                radius: this.interactionRadius,
                halfHeight: 1,
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
    }

    override despawn(): void {
        // Clean up all player UIs
        this.nearbyPlayers.forEach((playerUI, playerId) => {
            this.cleanupPlayerUI(playerId);
        });
        this.nearbyPlayers.clear();
        
        super.despawn();
    }

    private onPlayerEnter(player: Player): void {
        if (this.nearbyPlayers.has(player.id)) return;
        
        // Only show UI if quest is active
        const playerStateManager = (GameManager.instance as any)?.playerStateManager as PlayerStateManager | undefined;
        if (playerStateManager) {
            const state = playerStateManager.getState(player);
            const hasQuest = !!state?.quests.active[this.QUEST_ID];
            if (!hasQuest) {
                // No quest active - don't show any UI
                return;
            }
        }
        
        this.showPlateUI(player);
    }

    private onPlayerExit(player: Player): void {
        this.cleanupPlayerUI(player.id);
    }

    private showPlateUI(player: Player): void {
        const playerStateManager = (GameManager.instance as any)?.playerStateManager as PlayerStateManager | undefined;
        if (!playerStateManager) {
            console.error(`[PressurePlateBlockEntity] No PlayerStateManager available`);
            return;
        }

        const state = playerStateManager.getState(player);
        if (!state) {
            console.error(`[PressurePlateBlockEntity] No state found for player ${player.id}`);
            return;
        }

        // Only show UI if quest is active
        const hasQuest = !!state.quests.active[this.QUEST_ID];
        if (!hasQuest) {
            // No quest active - don't show any UI
            return;
        }
        
        const equippedFish = playerStateManager.getEquippedFish(player);
        const fishWeight = equippedFish?.metadata?.fishStats?.weight || 
                          equippedFish?.metadata?.fishStats?.preliminaryWeight || 0;
        const hasHeavyFish = fishWeight >= this.MIN_FISH_WEIGHT;
        
        // Get current sequence state
        const sequenceState = PressurePlateBlockEntity.playerSequences.get(player.id);
        const currentSequence = sequenceState?.sequence || [];
        const nextExpected = PressurePlateBlockEntity.EXPECTED_SEQUENCE[currentSequence.length];
        const isCorrectNext = nextExpected === this.plateType;
        const alreadyPressed = currentSequence.includes(this.plateType);

        // Determine message based on conditions - simplified messages
        let message = "The platform didn't move";
        
        if (!hasHeavyFish || fishWeight === 0) {
            // Quest active but no fish or 0 weight
            message = "The platform didn't move";
        } else if (hasHeavyFish) {
            if (alreadyPressed) {
                message = "...already activated";
            } else if (isCorrectNext) {
                message = "The plate activated";
            } else {
                message = "The platform didn't move";
            }
        }

        // Create UI for player
        const playerUI: PlayerPlateUI = {};
        
        if (this.isSpawned && this.world) {
            const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
            if (playerEntities && playerEntities.length > 0) {
                const playerEntity = playerEntities[0];
                
                playerUI.dialog = new SceneUI({
                    templateId: 'npc-dialogue',
                    attachedToEntity: this, // Use 'this' since we extend Entity
                    offset: { x: 0, y: 0.5, z: 0 }, // Higher offset for 3x scaled plates
                    state: { 
                        text: message, 
                        npcName: `${this.plateType.charAt(0).toUpperCase() + this.plateType.slice(1)} Plate`,
                        owningPlayerId: player.id 
                    }
                });
                
                try {
                    playerUI.dialog.load(this.world);
                } catch (error) {
                    console.error(`[PressurePlateBlockEntity] Error loading dialog UI:`, error);
                    playerUI.dialog = undefined;
                }
            } else {
                console.warn(`[PressurePlateBlockEntity] No player entity found for player ${player.id}`);
            }
        } else {
            console.warn(`[PressurePlateBlockEntity] Cannot show UI - entity not spawned or world not available`);
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
                console.error(`[PressurePlateBlockEntity] Error unloading dialog:`, e);
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
            console.error(`[PressurePlateBlockEntity] No PlayerStateManager available`);
            return;
        }

        const state = playerStateManager.getState(player);
        if (!state) {
            console.error(`[PressurePlateBlockEntity] No state found for player ${player.id}`);
            return;
        }

        // Only process interaction if quest is active
        const hasQuest = !!state.quests.active[this.QUEST_ID];
        if (!hasQuest) {
            // No quest active - don't show any UI or process interaction
            return;
        }

        // Check cooldown - prevent rapid successive interactions
        const interactionKey = `${player.id}_${this.plateType}`;
        const lastInteractionTime = PressurePlateBlockEntity.lastInteractionTimes.get(interactionKey) || 0;
        const now = Date.now();
        const timeSinceLastInteraction = now - lastInteractionTime;
        
        if (timeSinceLastInteraction < this.INTERACTION_COOLDOWN_MS) {
            return;
        }
        
        // Update last interaction time
        PressurePlateBlockEntity.lastInteractionTimes.set(interactionKey, now);

        // Ensure UI is shown (in case player interacted without entering proximity first)
        if (!this.nearbyPlayers.has(player.id)) {
            this.showPlateUI(player);
        }

        // Check conditions (hasQuest already checked above)
        const equippedFish = playerStateManager.getEquippedFish(player);
        const fishWeight = equippedFish?.metadata?.fishStats?.weight || 
                          equippedFish?.metadata?.fishStats?.preliminaryWeight || 0;
        const hasHeavyFish = fishWeight >= this.MIN_FISH_WEIGHT;


        // Check if all conditions are met
        if (hasQuest && hasHeavyFish) {
            // Get or create sequence state
            let sequenceState = PressurePlateBlockEntity.playerSequences.get(player.id);
            if (!sequenceState) {
                sequenceState = {
                    playerId: player.id,
                    sequence: [],
                    lastPressTime: 0
                };
                PressurePlateBlockEntity.playerSequences.set(player.id, sequenceState);
            }
            
            const currentSequence = sequenceState.sequence;
            const nextExpected = PressurePlateBlockEntity.EXPECTED_SEQUENCE[currentSequence.length];
            
            // Check if this is the correct next plate
            if (nextExpected === this.plateType && !currentSequence.includes(this.plateType)) {
                // Add to sequence
                currentSequence.push(this.plateType);
                sequenceState.lastPressTime = Date.now();
                
                
                // Play pressed animation
                try {
                    if (this.isSpawned) {
                        // Stop any existing animations first (like other entities do)
                        this.stopModelAnimations([]);
                        // Small delay to ensure animation system is ready
                        setTimeout(() => {
                            if (this.isSpawned) {
                                this.startModelOneshotAnimations(['pressed']);
                            }
                        }, 100);
                    } else {
                        console.warn(`[PressurePlateBlockEntity] Cannot play animation - entity not spawned`);
                    }
                } catch (error) {
                    console.error(`[PressurePlateBlockEntity] Error playing pressed animation:`, error);
                    if (error instanceof Error) {
                        console.error(`[PressurePlateBlockEntity] Animation error details:`, error.message, error.stack);
                    }
                }
                
                // Update UI - ensure it exists and is visible
                let playerUI = this.nearbyPlayers.get(player.id);
                if (!playerUI || !playerUI.dialog) {
                    // Create UI if it doesn't exist
                    this.showPlateUI(player);
                    playerUI = this.nearbyPlayers.get(player.id);
                }
                if (playerUI?.dialog) {
                    try {
                        playerUI.dialog.setState({ 
                            text: "The plate activated" 
                        });
                    } catch (e) {
                        console.error(`[PressurePlateBlockEntity] Error updating dialog:`, e);
                    }
                }
                
                // Complete quest objectives
                const questManager = GameManager.instance?.questManager;
                if (questManager) {
                    // Check if all plates have been pressed
                    if (currentSequence.length === PressurePlateBlockEntity.EXPECTED_SEQUENCE.length) {
                        
                        // Check if quest is already completed - don't grant rewards multiple times
                        const playerStateManager = (GameManager.instance as any)?.playerStateManager as PlayerStateManager | undefined;
                        const state = playerStateManager?.getState(player);
                        const isQuestAlreadyCompleted = !!state?.quests.completed[this.QUEST_ID];
                        
                        if (isQuestAlreadyCompleted) {
                            // Still show the display animation for visual feedback, but don't grant rewards
                            this.displayRelicShard(player);
                            const messageManager = GameManager.instance?.messageManager;
                            if (messageManager) {
                                messageManager.sendRichGameMessage('Sequence Complete!', player, {
                                    bonus: 'You\'ve already completed this quest.',
                                    rarity: 'common',
                                    duration: 3000
                                });
                            }
                            // Clear sequence state
                            PressurePlateBlockEntity.playerSequences.delete(player.id);
                            return; // Exit early - don't process quest completion
                        }
                        
                        // Complete the quest objective (single objective for all plates)
                        // Note: This may return false if already completed, but we'll still check quest completion
                        questManager.completeQuestObjective(player, this.QUEST_ID, 'activate_plates_sequence');
                        
                        // Auto-complete the quest immediately (skip turn-in) to grant rewards
                        // Since the sequence is complete, we should always try to complete the quest
                        const activeQuest = state?.quests.active[this.QUEST_ID];
                        
                        // If quest is still active, try to complete it
                        if (activeQuest && activeQuest.status === 'active') {
                            const definition = questManager.getQuestDefinition(this.QUEST_ID);
                            if (definition) {
                                // Force check: if sequence is complete, the objective should be complete
                                // Set objective progress to complete if it's not already
                                const objectiveIndex = definition.objectives.findIndex(
                                    (obj: any) => obj.type === 'custom' && obj.id === 'activate_plates_sequence'
                                );
                                
                                if (objectiveIndex !== -1) {
                                    const objective = definition.objectives[objectiveIndex];
                                    const currentProgress = activeQuest.objectivesProgress[objectiveIndex] || 0;
                                    
                                    // Default count to 1 if missing (defensive coding)
                                    const targetCount = objective.count ?? 1;
                                    
                                    // Ensure objective is marked as complete
                                    if (currentProgress < targetCount) {
                                        activeQuest.objectivesProgress[objectiveIndex] = targetCount;
                                    }
                                    
                                    // Check if all objectives are now complete
                                    const allObjectivesMet = definition.objectives.every((obj, idx) =>
                                        (activeQuest.objectivesProgress[idx] || 0) >= (obj.count ?? 1)
                                    );
                                    
                                    
                                    if (allObjectivesMet || activeQuest.requiresTurnIn) {
                                        const questCompleted = questManager.completeQuest(player, this.QUEST_ID, true);
                                        if (questCompleted) {
                                        } else {
                                            console.error(`[PressurePlateBlockEntity] ✗ Failed to auto-complete quest ${this.QUEST_ID} for player ${player.id}`);
                                        }
                                    } else {
                                        console.warn(`[PressurePlateBlockEntity] Quest ${this.QUEST_ID} objectives not all met. Progress:`, activeQuest.objectivesProgress);
                                    }
                                } else {
                                    console.error(`[PressurePlateBlockEntity] Could not find objective activate_plates_sequence in quest definition`);
                                }
                            } else {
                                console.error(`[PressurePlateBlockEntity] Could not get quest definition for ${this.QUEST_ID}`);
                            }
                        } else {
                            console.warn(`[PressurePlateBlockEntity] Quest ${this.QUEST_ID} is not active for player ${player.id}. State:`, activeQuest ? activeQuest.status : 'quest not found');
                        }
                        
                        // Display relic shard above player head
                        this.displayRelicShard(player);
                        
                        // Note: Message is sent by completeQuest() - no need to send here
                        
                        // Clear sequence state
                        PressurePlateBlockEntity.playerSequences.delete(player.id);
                    }
                }
            } else if (currentSequence.includes(this.plateType)) {
                // Already pressed this plate
                let playerUI = this.nearbyPlayers.get(player.id);
                if (!playerUI || !playerUI.dialog) {
                    this.showPlateUI(player);
                    playerUI = this.nearbyPlayers.get(player.id);
                }
                if (playerUI?.dialog) {
                    try {
                        playerUI.dialog.setState({ 
                            text: "...already activated" 
                        });
                    } catch (e) {
                        console.error(`[PressurePlateBlockEntity] Error updating dialog:`, e);
                    }
                }
            } else {
                // Wrong plate - reset sequence
                PressurePlateBlockEntity.playerSequences.delete(player.id);
                
                // After reset, the first plate should be insect
                let playerUI = this.nearbyPlayers.get(player.id);
                if (!playerUI || !playerUI.dialog) {
                    // Ensure dialog exists
                    this.showPlateUI(player);
                    playerUI = this.nearbyPlayers.get(player.id);
                }
                if (playerUI?.dialog) {
                    try {
                        playerUI.dialog.setState({ 
                            text: "Incorrect sequence, the plates reset" 
                        });
                    } catch (e) {
                        console.error(`[PressurePlateBlockEntity] Error updating dialog:`, e);
                    }
                }
            }
        } else {
            // Conditions not met - show simplified message
            let playerUI = this.nearbyPlayers.get(player.id);
            if (!playerUI || !playerUI.dialog) {
                this.showPlateUI(player);
                playerUI = this.nearbyPlayers.get(player.id);
            }
            if (playerUI?.dialog) {
                try {
                    playerUI.dialog.setState({ text: "The platform didn't move" });
                } catch (e) {
                    console.error(`[PressurePlateBlockEntity] Error updating dialog:`, e);
                }
            }
        }
    }
    
    // Static method to clear sequence for a player (useful for cleanup)
    static clearPlayerSequence(playerId: string): void {
        PressurePlateBlockEntity.playerSequences.delete(playerId);
    }
    
    private displayRelicShard(player: Player): void {
        if (!this.world) return;
        
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
                console.warn(`[PressurePlateBlockEntity] Error despawning display entity:`, error);
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
}

