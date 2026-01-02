// npcs/DialogNpc.ts
import { World, Entity, Player, ColliderShape, Vector3, SimpleEntityController, RigidBodyType, SceneUI, BlockType, PlayerEntity } from 'hytopia'; // Ensure PlayerEntity is imported
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type NpcSeaStory, type SeaStory } from '../SeaStoryManager'; // Ensure type import if needed

// Define a cooldown period in milliseconds
export const NPC_INTERACTION_COOLDOWN_MS = 500; // 0.5 seconds

// Configuration structure (ensure it matches your actual config)
export interface NpcConfig {
    id: string;
    definitionId: string;
    name?: string;
    position: { x: number; y: number; z: number };
    facing: { x: number; y: number; z: number };
    modelUri: string;
    modelScale: number;
    interaction?: {
        type: 'dialog';
        prompt?: string;
        options?: { text: string; response: string; }[];
        playerOptionText?: string;
        fallbackStories?: { prompt: string; response: string; }[];
    };
    idleAnimation?: string;          // Optional: Name of the idle animation loop (defaults to 'idle')
    interactAnimation?: string;      // Optional: Name of the animation to play on interaction start
    interactAnimationLooped?: boolean; // Optional: Set to true if interactAnimation should loop (defaults to false/one-shot)
    useOpenAI?: boolean; // Added for OpenAI toggle
}

// Interface to hold per-player UI and state
export interface PlayerInteractionUI {
    dialog?: SceneUI;
    options?: SceneUI;
    cleanupTimer?: any | null;
    currentFallbackResponse?: string;
}

export abstract class DialogNpc {
    protected entity?: Entity;
    // Store UI and state per interacting player
    protected interactingPlayers: Map<string, PlayerInteractionUI> = new Map();
    protected interactionRadius: number = 2; // Default radius

    constructor(
        protected world: World,
        protected stateManager: PlayerStateManager,
        protected seaStoryManager: SeaStoryManager,
        protected config: NpcConfig
    ) {}

    public spawn(): void {
        // Explicitly define the options for the Entity constructor
        const entityOptions: any = { // Use 'any' temporarily or define a specific type
            name: `NPC - ${this.config.id} (${this.config.definitionId})`,
            controller: new SimpleEntityController(),
            // Only include modelUri OR blockTextureUri, prioritizing modelUri
            modelScale: this.config.modelScale,
            modelLoopedAnimations: ['idle'],
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_POSITION
            }
        };

        // Prioritize modelUri if available
        if (this.config.modelUri) {
            entityOptions.modelUri = this.config.modelUri;
            entityOptions.modelLoopedAnimations = ['idle']; // Animations usually go with models
        }
        // ELSE IF: you had a blockTextureUri in NpcConfig and wanted to use it as fallback
        // else if (this.config.blockTextureUri) {
        //     entityOptions.blockTextureUri = this.config.blockTextureUri;
        // }
        else {
            console.error(`[DialogNpc ${this.config.id}] Cannot spawn NPC, config lacks a 'modelUri'! Config:`, JSON.stringify(this.config));
            return; // Prevent spawning without a visual representation
        }



        try {
            this.entity = new Entity(entityOptions); // Pass the carefully constructed options
        } catch (error) {
             console.error(`[DialogNpc ${this.config.id}] FATAL ERROR during Entity construction:`, error);
             console.error(`[DialogNpc ${this.config.id}] Entity Options used:`, JSON.stringify(entityOptions));
             // Re-throw or handle appropriately - game might be unrecoverable
             throw error;
        }


        // --- Face direction, Spawn, Add Collider ---
        const npcEntityController = this.entity.controller as SimpleEntityController;
        // Ensure facing exists before trying to use it
        if (this.config.facing) {
        npcEntityController.face(this.config.facing, 1);
        } else {
            console.warn(`[DialogNpc ${this.config.id}] NPC has no 'facing' data in config.`);
            // Optionally set a default facing if desired: npcEntityController.face({x:0, y:0, z:1}, 1);
        }

        this.entity.spawn(this.world, this.config.position);

        // Add sensor collider for interaction
        this.entity.createAndAddChildCollider({
            shape: ColliderShape.CYLINDER,
            radius: this.interactionRadius,
            halfHeight: 2, // Consider making this configurable too
            isSensor: true,
            onCollision: (other: Entity | BlockType, started: boolean) => {
                if (other instanceof PlayerEntity) {
                    const player = other.player;
                    const idleAnim = this.config.idleAnimation || 'idle'; // Get configured or default idle

                    if (started) {
                        if (!this.interactingPlayers.has(player.id)) {
                             console.log(`[DialogNpc ${this.config.id}] Collision start detected with player ${player.id}. Initiating interaction.`);
                             console.log(`[DialogNpc ${this.config.id}] Config:`, JSON.stringify(this.config));

                             // --- Interaction Animation Logic ---
                             const interactAnim = this.config.interactAnimation;
                             const loopInteractAnim = !!this.config.interactAnimationLooped; // Convert undefined/false to false

                             if (interactAnim) {
                                 this.entity?.stopModelAnimations([idleAnim]); // Stop current idle first
                                 if (loopInteractAnim) {
                                     this.entity?.startModelLoopedAnimations([interactAnim]);
                                 } else {
                                     this.entity?.startModelOneshotAnimations([interactAnim]);
                                     // For one-shots, automatically return to idle after a delay?
                                     // This is tricky as animation lengths vary. Let's rely on leaving radius for now.
                                 }
                             }
                             // ----------------------------------

                             this.handlePlayerInteraction(player);
                        }
                    } else { // Player left
                         // --- Ensure return to Idle Animation ---
                         const interactAnim = this.config.interactAnimation;
                         if (interactAnim) {
                              // Stop the interact animation if it was playing
                              this.entity?.stopModelAnimations([interactAnim]);
                         }
                         // Start the defined idle animation
                         this.entity?.startModelLoopedAnimations([idleAnim]);
                         // ---------------------------------------
                         this.handlePlayerLeave(player);
                    }
                }
            },
        });
        // --- End Spawn Additions ---
    }

    public despawn(): void {
        if (this.entity) {
            this.entity.despawn();
        }
        // Clean up UI for all interacting players
        this.interactingPlayers.forEach((ui, playerId) => {
            // Find player object if needed for state (might be tricky here)
            this.cleanupPlayerInteractionById(playerId); // New helper needed
        });
        this.interactingPlayers.clear();
    }

     // Helper to clean up just by ID, used in despawn
     protected cleanupPlayerInteractionById(playerId: string): void {
         const playerUI = this.interactingPlayers.get(playerId);
         if (!playerUI) return;


         if (playerUI.cleanupTimer) {
             // Use global clearTimeout
             clearTimeout(playerUI.cleanupTimer);
         }
         if (playerUI.dialog) { try { playerUI.dialog.unload(); } catch(e) {} }
         if (playerUI.options) { try { playerUI.options.unload(); } catch(e) {} }

         this.interactingPlayers.delete(playerId);
    }

    // Called when a player enters the NPC's interaction radius
    protected handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) return;

        // Clear any achievement popup notifications when dialog interaction starts
        player.ui.sendData({
            type: 'clearAchievementPopups'
        });

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) {
            return;
        }

        // Already checked if interacting in onCollision, but double-check state just in case
        if (state.npcInteraction?.currentNpcId === this.config.id && this.interactingPlayers.has(player.id)) {
            return;
        }

        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) { /* ... error handling ... */ return; }
        const playerEntity = playerEntities[0];


        // --- Determine initial prompt and response ---
        let initialPrompt = "";
        let currentFallbackResponse = ""; // Store per-interaction
        let interactionUsesSeaStory = false;
        const currentSeaStory = this.seaStoryManager.getCurrentSeaStory();

        if (currentSeaStory && this.shouldReactToSeaStory(currentSeaStory)) {
             initialPrompt = this.getSeaStoryPrompt(currentSeaStory);
             currentFallbackResponse = this.getSeaStoryResponse(currentSeaStory);
             interactionUsesSeaStory = true;
        } else {
             if (this.config.interaction?.fallbackStories && this.config.interaction.fallbackStories.length > 0) {
                 const randomIndex = Math.floor(Math.random() * this.config.interaction.fallbackStories.length);
                 const selectedStory = this.config.interaction.fallbackStories[randomIndex];
                 initialPrompt = selectedStory.prompt;
                 currentFallbackResponse = selectedStory.response;
             } else {
                 initialPrompt = this.config.interaction?.prompt || "Greetings!";
                 currentFallbackResponse = "Nice weather we're having.";
             }
        }

        // --- Determine options ---
         let displayOptions: string[] = [];
         if (interactionUsesSeaStory && currentSeaStory) {
             displayOptions = this.getSeaStoryOptions(currentSeaStory);
         } else {
             displayOptions = this.config.interaction?.options?.map(opt => opt.text) || [];
         }
         // Ensure there's always a way to exit if needed, e.g., add "Nevermind" if empty
         // if (displayOptions.length === 0) displayOptions.push("Nevermind");


        // --- Create Per-Player UI ---
        const playerUI: PlayerInteractionUI = { currentFallbackResponse: currentFallbackResponse }; // Store fallback response

        // Create NPC Dialog Bubble
        if (this.entity) {
             playerUI.dialog = new SceneUI({
                 templateId: 'npc-dialogue',
                 attachedToEntity: this.entity,
                 offset: { x: 0, y: this.config.modelScale * 1.2, z: 0 },
                 state: { 
                     text: initialPrompt, 
                     npcName: this.config.name || this.config.id, // Add NPC name
                     owningPlayerId: player.id 
                 }
             });
             try { playerUI.dialog.load(this.world); } catch (error) { console.error(/* ... */); playerUI.dialog = undefined; }
        }

        if (this.stateManager.isMobile(player)) {
            if (displayOptions.length > 0) {
                // Clear achievement popups before showing NPC options
                player.ui.sendData({ type: 'clearAchievementPopups' });
                
                // --- CORRECT THE DATA STRUCTURE ---
                player.ui.sendData({
                    type: 'showMobileNpcOptions', // Match client listener  
                    options: displayOptions       // Match client listener
                    // npcId: this.config.id // Optional: Still useful context
                });
                // ------------------------------------
            }   
        } else {
            // Create Player Options UI
            if (displayOptions.length > 0) {
                // Clear achievement popups before showing NPC options
                player.ui.sendData({ type: 'clearAchievementPopups' });
                
                playerUI.options = new SceneUI({
                    templateId: 'player-options',
                    attachedToEntity: playerEntity,
                    offset: { x: 0, y: -0.5, z: 0 },
                    state: { options: displayOptions, owningPlayerId: player.id }
                });
                try { playerUI.options.load(this.world); } catch (error) { console.error(/* ... */); playerUI.options = undefined; }
            }
        }
        
        // --- Store player UI state ---
        this.interactingPlayers.set(player.id, playerUI);

        // Update player state
        if (!state.npcInteraction) {
            // Initialize with the required property directly
            state.npcInteraction = { currentNpcId: this.config.id };
        } else {
            // If it already exists, just update the current NPC ID
            state.npcInteraction.currentNpcId = this.config.id;
        }

    }

    // Abstract methods for subclasses to define sea story behavior
    protected abstract shouldReactToSeaStory(story: SeaStory): boolean;
    protected abstract getSeaStoryPrompt(story: SeaStory): string;
    protected abstract getSeaStoryResponse(story: SeaStory): string;
    protected abstract getSeaStoryOptions(story: SeaStory): string[];


    // Handles player selection of a dialog option (BASE IMPLEMENTATION)
    // Subclasses MUST override this for custom logic beyond simple config options.
    public handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[DialogNpc Base ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }


        let npcResponseText = playerUI.currentFallbackResponse || "I see."; // Default to stored fallback
        let endInteraction = true; // Base options always end interaction

        // Check if option corresponds to configured options
        const optionsConfig = this.config.interaction?.options;
        if (optionsConfig && optionsConfig[option]) {
            const configResponse = optionsConfig[option].response;
            // Handle empty response strings by using fallback
            npcResponseText = configResponse && configResponse.trim() !== "" ? configResponse : (playerUI.currentFallbackResponse || "I understand.");
        } else if (option === (optionsConfig?.length ?? 0)) { // Assume last option is 'Nevermind' or similar
             npcResponseText = "Alright then.";
        } else {
            // npcResponseText is already set to fallback above
        }


        // Update the specific player's dialogue bubble - always update if dialog exists
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ 
                    text: npcResponseText,
                    npcName: this.config.name || this.config.id // Preserve NPC name
                }); 
            } catch(e) { 
                console.error(`[DialogNpc Base ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
            console.warn(`[DialogNpc Base ${this.config.id}] No dialog UI found for player ${player.id}`);
        }

        // Hide/unload the specific player's options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined; // Clear reference
        }

        // --- Cleanup ---
        if (endInteraction) {
             // Clear any existing timer for this player
             if (playerUI.cleanupTimer) {
                 clearTimeout(playerUI.cleanupTimer); // Use global clearTimeout
             }
             // Schedule bubble hide and map cleanup for THIS player
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz - dialogue UIs should persist longer
            // Assign the return value of setTimeout (which is NodeJS.Timeout)
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state); // Use helper
            }, hideDelay);
        }
    }


    // Method to clean up a specific player's interaction fully
    protected cleanupPlayerInteraction(player: Player, state?: PlayerState | null): void {
         const playerUI = this.interactingPlayers.get(player.id);
         if (!playerUI) return; // Not interacting or already cleaned up

         if (this.stateManager.isMobile(player)) {
            player.ui.sendData({
                type: 'npcInteractionEnded', // Match client listener
            });
         } 


         // Ensure state is fetched if not provided
         const finalState = state ?? this.stateManager.getState(player);

         // Clear timer if it exists
         if (playerUI.cleanupTimer) {
             clearTimeout(playerUI.cleanupTimer); // Use global clearTimeout
             playerUI.cleanupTimer = null;
         }

         // Unload UI
         if (playerUI.dialog) { try { playerUI.dialog.unload(); } catch(e) {} }
         if (playerUI.options) { try { playerUI.options.unload(); } catch(e) {} }
         

         // Remove from map BEFORE releasing lock
         this.interactingPlayers.delete(player.id);

         // Release lock (sets cooldown timestamp and clears state.npcInteraction)
         // Convert potential 'undefined' from finalState to 'null'
         this.releaseInteractionLock(player, finalState ?? null);

    }

    // Handles player leaving the interaction radius
    protected handlePlayerLeave(player: Player): void {
         if (this.interactingPlayers.has(player.id)) {
             const state = this.stateManager.getState(player); // Get state for lock release
             this.cleanupPlayerInteraction(player, state); // Use the helper
         }
    }

    // Releases interaction lock (sets cooldown timestamp, clears player state)
    protected releaseInteractionLock(player: Player | null, state: PlayerState | null): void {
        const playerId = player?.id;
        if (state) {
            const now = Date.now();
            if (!state.lastNpcInteractionEndTime) {
                state.lastNpcInteractionEndTime = {};
            }
            state.lastNpcInteractionEndTime[this.config.id] = now;

            // Clear interaction state IF it was this NPC
            if (state.npcInteraction?.currentNpcId === this.config.id) {
                state.npcInteraction.currentNpcId = null;
            }
        } else {
            console.warn(`[DialogNpc ${this.config.id}] Could not get player state to set cooldown timestamp for player ${playerId}.`);
        }
    }

    // Default fallback response if no specific logic applies
    protected getFallbackResponse(): string {
        // This might be less used now if handlePlayerInteraction always determines one
        if (this.config.interaction?.fallbackStories && this.config.interaction.fallbackStories.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.config.interaction.fallbackStories.length);
            return this.config.interaction.fallbackStories[randomIndex].response;
        }
        return "Nice weather we're having.";
    }
} 