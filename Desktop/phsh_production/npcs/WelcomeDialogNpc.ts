// npcs/WelcomeDialogNpc.ts
import { Player, World, PlayerEntity, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager';

export class WelcomeDialogNpc extends DialogNpc {
    // Point NPC should face
    private readonly FACING_POINT = { x: -87, y: 18, z: 38.58 };
    // NPC position (X and Z specified, Y will be kept from config) - moved AWAY from facing point
    private readonly NPC_POSITION = { x: -90, z: 37.0 };

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
    }

    // --- Override spawn to set position, face target point, scale down 33%, and set animations ---
    public override spawn(): void {
        // Scale down by 33% (multiply by 0.67)
        if (this.config.modelScale) {
            this.config.modelScale = this.config.modelScale * 0.67;
        }

        // Set position (keep current Y, set X and Z)
        const currentY = this.config.position.y;
        this.config.position = { 
            x: this.NPC_POSITION.x, 
            y: currentY, 
            z: this.NPC_POSITION.z 
        };

        // Calculate a target point to face AWAY from the facing point
        // face() method expects a world coordinate, not a direction vector
        // To face away, we extend the vector from facing point through NPC position
        const dx = this.config.position.x - this.FACING_POINT.x; // Vector from facing point to NPC
        const dz = this.config.position.z - this.FACING_POINT.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 0) {
            // Extend the vector further away from facing point to get a target coordinate
            // This creates a point on the opposite side that the NPC will face towards
            const extendDistance = 5.0; // Extend 5 units away from NPC
            const targetX = this.config.position.x + (dx / distance) * extendDistance;
            const targetZ = this.config.position.z + (dz / distance) * extendDistance;
            
            // Use the same Y as the facing point for consistency
            this.config.facing = { x: targetX, y: this.FACING_POINT.y, z: targetZ };
        } else {
            // Default facing if NPC is at target position - face away (extend in negative Z direction)
            this.config.facing = { x: this.config.position.x, y: this.FACING_POINT.y, z: this.config.position.z - 5 };
        }

        // Call parent spawn first
        super.spawn();

        // After spawning, set idle_upper and idle_lower animations
        if (this.entity) {
            this.entity.startModelLoopedAnimations(['idle_upper', 'idle_lower']);
        }
    }

    // --- Override handlePlayerLeave to restore correct idle animations ---
    protected override handlePlayerLeave(player: Player): void {
        // Restore idle_upper and idle_lower animations when player leaves
        if (this.entity) {
            this.entity.startModelLoopedAnimations(['idle_upper', 'idle_lower']);
        }
        // Call parent method for any other cleanup
        super.handlePlayerLeave(player);
    }

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
    protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "Welcome to PHSH!"; }
    protected getSeaStoryResponse(story: SeaStory): string { return "Enjoy your time here!"; }
    protected getSeaStoryOptions(story: SeaStory): string[] { return ["Thanks!"]; }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[WelcomeDialogNpc ${this.config.id}] No state found for player ${player.id}.`);
            return;
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[WelcomeDialogNpc ${this.config.id}] Missing prerequisites for interaction for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.error(`[WelcomeDialogNpc ${this.config.id}] QuestManager not available for player ${player.id}.`);
            return;
        }

        // Check getting started quest status
        const gettingStartedQuestId = 'fitz_quest_getting_started';
        const questActive = state.quests.active[gettingStartedQuestId];
        const questCompleted = state.quests.completed[gettingStartedQuestId];
        const playerLevel = this.stateManager.getCurrentLevel(player);
        // Simple check: Offer intro quest if player hasn't completed it AND is level 2 or below
        const shouldOfferIntroQuest = !questCompleted && playerLevel <= 2;

        let interactionPrompt = "Welcome to PHSH! Ready to get casting?";
        let displayOptions: string[] = [];

        if (questCompleted) {
            // Quest already completed - just friendly greeting
            interactionPrompt = "Welcome back! Enjoy your fishing adventures!";
            displayOptions = ["How do I fish?", "Where do I get bait?", "Thanks!"];
        } else if (questActive) {
            // Quest is active - check progress
            const questDef = questManager.getQuestDefinition(gettingStartedQuestId);
            const questProgress = questActive.objectivesProgress || {};
            
            // Check if ready for turn-in
            const allObjectivesMet = questDef?.objectives.every((obj, index) =>
                (questProgress[index] || 0) >= obj.count
            ) || false;
            const requiresTurnIn = questActive.requiresTurnIn || false;
            
            if (allObjectivesMet && requiresTurnIn) {
                // Ready for turn-in
                interactionPrompt = "Excellent work! You've completed everything. Come back to turn in your quest.";
                displayOptions = ["Turn In Quest", "Not Yet"];
            } else {
                // Quest active but not complete
                const wormsProgress = questProgress[0] || 0;
                const wormsRequired = questDef?.objectives[0]?.count || 3;
                const catchProgress = questProgress[1] || 0;
                const sellProgress = questProgress[2] || 0;
                
                if (wormsProgress < wormsRequired) {
                    interactionPrompt = `Keep digging, mate. You've got ${wormsProgress} of ${wormsRequired} worms. Try the dirt blocks around the dock.`;
                    displayOptions = ["I'll keep at it."];
                } else if (catchProgress < 1) {
                    interactionPrompt = "Nice work! Now use that bait to catch a mackerel at the dock.";
                    displayOptions = ["I'll get started!"];
                } else if (sellProgress < 1) {
                    interactionPrompt = "Great! You've caught the Mackerel. Now sell it at the fishmonger in town.";
                    displayOptions = ["I'll sell it!"];
                } else {
                    interactionPrompt = "You're doing great! Keep at it.";
                    displayOptions = ["Thanks!"];
                }
            }
        } else if (shouldOfferIntroQuest) {
            // Quest available - offer it
            interactionPrompt = "Hey matey, looking to get started fishing? Bring me three worm bait and I'll help you get started.";
            displayOptions = ["I'll help!", "Maybe later."];
        } else {
            // Default greeting (player is level > 2 and hasn't completed intro quest - they're an old player)
            interactionPrompt = "Welcome to PHSH! Ready to get casting?";
            displayOptions = ["How do I fish?", "Where do I get bait?", "Thanks!"];
        }

        // --- Create Per-Player UI ---
        const playerUI: PlayerInteractionUI = {
            currentFallbackResponse: "Enjoy your time here!"
        };

        // Create NPC Dialog Bubble
        if (this.entity) {
            playerUI.dialog = new SceneUI({
                templateId: 'npc-dialogue',
                attachedToEntity: this.entity,
                offset: { x: 0, y: this.config.modelScale * 1.95, z: 0 },
                state: { 
                    text: interactionPrompt, 
                    npcName: this.config.name || this.config.id,
                    owningPlayerId: player.id 
                }
            });
            if (playerUI.dialog) {
                try {
                    playerUI.dialog.load(this.world);
                } catch (error) {
                    console.error(`[WelcomeDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        if (this.stateManager.isMobile(player)) {
            if (displayOptions.length > 0) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: displayOptions
                });
            }
        } else {
            if (displayOptions.length > 0) {
                playerUI.options = new SceneUI({
                    templateId: 'player-options',
                    attachedToEntity: playerEntity,
                    offset: { x: 0, y: -0.5, z: 0 },
                    state: { options: displayOptions, owningPlayerId: player.id }
                });
                try {
                    playerUI.options.load(this.world);
                } catch (error) {
                    console.error(`[WelcomeDialogNpc ${this.config.id}] Error loading options UI:`, error);
                    playerUI.options = undefined;
                }
            }
        }

        // Store player UI state
        this.interactingPlayers.set(player.id, playerUI);

        // Update player state
        if (!state.npcInteraction) {
            state.npcInteraction = { currentNpcId: this.config.id };
        } else {
            state.npcInteraction.currentNpcId = this.config.id;
        }
    }

    // --- Override option handler ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[WelcomeDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            const stuckUI = this.interactingPlayers.get(player.id);
            if (stuckUI?.options) { try { stuckUI.options.unload(); } catch(e){} }
            return;
        }


        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.warn(`[WelcomeDialogNpc ${this.config.id}] QuestManager not available for player ${player.id}.`);
            return;
        }

        const gettingStartedQuestId = 'fitz_quest_getting_started';
        const questActive = state.quests.active[gettingStartedQuestId];
        const questCompleted = state.quests.completed[gettingStartedQuestId];
        const playerLevel = this.stateManager.getCurrentLevel(player);
        // Simple check: Offer intro quest if player hasn't completed it AND is level 2 or below
        const shouldOfferIntroQuest = !questCompleted && playerLevel <= 2;
        const questDef = questManager.getQuestDefinition(gettingStartedQuestId);
        const questProgress = questActive?.objectivesProgress || {};

        let npcResponseText = playerUI.currentFallbackResponse || "Enjoy your time here!";
        let endInteraction = true;
        let displayOptions: string[] = [];

        // Check if this is a quest-related interaction
        if (questActive && questActive.requiresTurnIn && option === 0) {
            // Turn in quest
            const completed = questManager.completeQuest(player, gettingStartedQuestId, false);
            if (completed) {
                npcResponseText = "Excellent work! You've completed everything. Come back anytime for more help!";
                displayOptions = ["Thanks!"];
                // Hide arrows after quest completion
                const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                if (playerEntities && playerEntities.length > 0) {
                    const playerEntity = playerEntities[0];
                    if (playerEntity && (playerEntity as any).arrowManager) {
                        (playerEntity as any).arrowManager.hideArrows(player);
                    }
                }
            } else {
                npcResponseText = "Something went wrong. Try again.";
            }
        } else if (!questActive && shouldOfferIntroQuest) {
            // Offer quest
            if (option === 0) { // "I'll help!"
                const assigned = questManager.assignQuest(player, gettingStartedQuestId);
                if (assigned) {
                    npcResponseText = "Great! Try digging the dirt blocks around the dock to find worms.";
                    // Hide arrows when quest is initiated (player knows to dig)
                    const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                    if (playerEntities && playerEntities.length > 0) {
                        const playerEntity = playerEntities[0];
                        if (playerEntity && (playerEntity as any).arrowManager) {
                            (playerEntity as any).arrowManager.hideArrows(player);
                        }
                    }
                } else {
                    npcResponseText = "Something went wrong. Try again.";
                }
            } else {
                npcResponseText = "Alright, suit yourself. Come back when you're ready to get started.";
            }
        } else if (questActive) {
            // Quest active - provide guidance and update arrows
            const wormsProgress = questProgress[0] || 0;
            const wormsRequired = questDef?.objectives[0]?.count || 3;
            const catchProgress = questProgress[1] || 0;
            const sellProgress = questProgress[2] || 0;
            const wormsComplete = wormsProgress >= wormsRequired;
            const catchComplete = catchProgress >= 1;
            const sellComplete = sellProgress >= 1;
            
            const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
            const playerEntity = playerEntities && playerEntities.length > 0 ? playerEntities[0] : null;
            const arrowManager = playerEntity && (playerEntity as any).arrowManager;
            
            if (option === 0 || option === 1) {
                if (wormsProgress < wormsRequired) {
                    npcResponseText = "Keep digging in the dirt blocks around the dock. You'll find worms there!";
                    // Hide arrows - player knows to dig
                    if (arrowManager) {
                        arrowManager.hideArrows(player);
                    }
                } else if (wormsComplete && !catchComplete) {
                    // Worms complete - direct to dock
                    npcResponseText = "Nice work! Now use that bait to catch a mackerel at the dock. Cast your line into the water!";
                    displayOptions = ["Got it!"];
                    endInteraction = false;
                    // Update arrows to point to dock
                    if (arrowManager) {
                        arrowManager.showArrowToDock(player);
                    }
                } else if (catchComplete && !sellComplete) {
                    // Mackerel caught - direct to fishmonger
                    npcResponseText = "Great! You've caught the Mackerel. Now head to the fishmonger in town to sell it. They're right here in the central square!";
                    displayOptions = ["I'll sell it!"];
                    endInteraction = false;
                    // Update arrows to point to fishmonger
                    if (arrowManager) {
                        arrowManager.showArrowToFishmonger(player);
                    }
                } else if (sellComplete) {
                    // All done - ready for turn-in
                    npcResponseText = "Excellent work! You've completed everything. Ready to turn in your quest?";
                    displayOptions = ["Turn In Quest", "Not Yet"];
                    endInteraction = false;
                    // Update arrows to point back to Greeter
                    if (arrowManager) {
                        arrowManager.showArrowToGreeter(player);
                    }
                } else {
                    npcResponseText = "You're doing great! Keep at it.";
                }
            }
        } else {
            // Default responses (tutorial, bait info, etc.)
            if (option === 0) {
                // "How do I fish?" - Trigger tutorial
                this.triggerTutorial(player);
                npcResponseText = "I'll show you the basics! Check out the tutorial that just opened - it'll walk you through casting, jigging, and reeling in your catch!";
            } else if (option === 1) {
                // "Where do I get bait?" - Use existing bait response
                npcResponseText = "All around you! You can dig worms from the dirt, buy shrimp from the shrimp shack, or craft specialty bait around the islands. But you'll need some sort of bait, or you'll hook mostly trash!";
            } else if (option === 2) {
                // "Thanks!" - Friendly response
                npcResponseText = "You're welcome! Good luck out there, and may your lines stay tight!";
            }
        }


        if (playerUI.dialog) {
            try {
                playerUI.dialog.setState({ text: npcResponseText });
            } catch(e) {
                console.error(`[WelcomeDialogNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        // Update options if displayOptions was set
        if (displayOptions.length > 0 && !endInteraction) {
            if (this.stateManager.isMobile(player)) {
                setTimeout(() => {
                    player.ui.sendData({
                        type: 'showMobileNpcOptions',
                        options: displayOptions
                    });
                }, 150);
            } else {
                if (playerUI.options) {
                    try { playerUI.options.unload(); } catch (e) {}
                }
                const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                if (playerEntities && playerEntities.length > 0) {
                    const playerEntity = playerEntities[0];
                    playerUI.options = new SceneUI({
                        templateId: 'player-options',
                        attachedToEntity: playerEntity,
                        offset: { x: 0, y: -0.5, z: 0 },
                        state: { options: displayOptions, owningPlayerId: player.id }
                    });
                    try { 
                        playerUI.options.load(this.world); 
                    } catch (error) { 
                        console.error(`[WelcomeDialogNpc ${this.config.id}] Error loading options UI:`, error);
                        playerUI.options = undefined; 
                    }
                }
            }
        } else if (endInteraction && playerUI.options) {
            try { playerUI.options.unload(); } catch (e) {}
            playerUI.options = undefined;
        }

        if (endInteraction) {
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000;
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    // --- Trigger tutorial for player ---
    private triggerTutorial(player: Player): void {
        const isMobile = this.stateManager.isMobile(player);
        
        // Create device-specific tutorial content (same as GamePlayerEntity.showTutorial)
        const castingText = isMobile
            ? "Begin your cast by tapping the fishing icon (🎣). Time the meter at the top to get the farthest distance."
            : "Begin your cast by clicking the right mouse button. Time the meter at the top to get the farthest distance.";
        
        const jiggingText = isMobile
            ? "Once your line is in the water, TAP the fishing icon (🎣) to jig your line. Keep your jig around the center - this speeds up catch times!"
            : "Once your line is in the water, TAP 'Q' to jig your line. Keep your jig around the center - this speeds up catch times!";
        
        const reelingText = isMobile
            ? "When you get a bite, HOLD the fishing icon (🎣) to move your white catch meter to the right. Let go, and it will move left. Trapping the yellow fish line in the bar fills your progress meter. Once it's full, you caught your fish!"
            : "When you get a bite, HOLD Q to move your white catch meter to the right. Let go, and it will move left. Trapping the yellow fish line in the bar fills your progress meter. Once it's full, you caught your fish!";
        
        // Send tutorial content to UI (same format as GamePlayerEntity.showTutorial)
        player.ui.lockPointer(false);
        player.ui.sendData({
            type: 'showTutorial',
            steps: [
                {
                    title: `Welcome ${player.username || 'Player'}!`,
                    text: "Let's learn the basics of phshing! Hit next to begin.",
                    image: "assets/ui/icons/welcome.png"
                },
                {
                    title: "Step 1: Casting",
                    text: castingText,
                    image: "assets/ui/icons/casting.png",
                    type: "casting"
                },
                {
                    title: "Step 2: Jigging",
                    text: jiggingText,
                    image: "assets/ui/icons/jigging.png",
                    type: "jigging"
                },
                {
                    title: "Step 3: Reeling",
                    text: reelingText,
                    image: "assets/ui/icons/reeling.png",
                    type: "reeling"
                }
            ]
        });
    }
}


