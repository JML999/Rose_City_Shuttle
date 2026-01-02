import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import { ItemFactory } from '../Inventory/ItemFactory';
import GameManager from '../GameManager';

// Extended interface for this NPC
interface FarmerPlayerUI extends PlayerInteractionUI {
    currentInteractionType?: 'initial' | 'quest_available' | 'quest_active' | 'quest_turnin' | null;
    currentQuestForInteraction?: string | null;
}

export class FarmerDialogNpc extends DialogNpc {
    private static readonly RARE_ALGAE_QUEST_ID = 'farmer_rare_algae_quest';

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
    }

    // --- Implement Abstract Methods (no sea story reaction) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return "MY PIGS!";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "They're... they're wasting away!";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return ["What's wrong?", "Sorry, can't help"];
    }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[FarmerDialogNpc ${this.config.id}] No state found for player ${player.id}.`);
            return;
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.error(`[FarmerDialogNpc ${this.config.id}] QuestManager not available.`);
            return;
        }

        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[FarmerDialogNpc ${this.config.id}] No player entity found for ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        const algaeQuestCompleted = !!state.quests.completed[FarmerDialogNpc.RARE_ALGAE_QUEST_ID];
        const algaeQuestActive = state.quests.active[FarmerDialogNpc.RARE_ALGAE_QUEST_ID];
        const questDefinition = questManager.getQuestDefinition(FarmerDialogNpc.RARE_ALGAE_QUEST_ID);

        let interactionType: 'initial' | 'quest_available' | 'quest_active' | 'quest_turnin' = 'initial';
        let interactionPrompt = "";
        let displayOptions: string[] = [];

        if (algaeQuestCompleted) {
            // Quest completed - thank player
            interactionType = 'quest_turnin';
            interactionPrompt = "Thank you so much for saving my pigs! They're healthy again thanks to that rare algae. That Fly Rod I gave you is the best freshwater rod on the island - perfect for catching rare fish in ponds!";
            displayOptions = ["You're welcome!", "Goodbye"];
        } else if (algaeQuestActive && algaeQuestActive.requiresTurnIn) {
            // Quest ready to turn in
            const objective = questDefinition?.objectives[0];
            const progress = algaeQuestActive.objectivesProgress[0] || 0;
            const required = objective?.count || 5;

            if (progress >= required) {
                interactionType = 'quest_turnin';
                interactionPrompt = `Perfect! You've brought me ${progress} rare algae. My pigs will be saved! Here's that special reward I promised you.`;
                displayOptions = ["Thank you!", "You're welcome"];
            } else {
                interactionType = 'quest_active';
                interactionPrompt = `I still need ${required - progress} more rare algae. You can find it while fishing - it's quite rare though, so keep casting!`;
                displayOptions = ["I'll keep looking", "Got it"];
            }
        } else if (algaeQuestActive) {
            // Quest active but not ready
            const objective = questDefinition?.objectives[0];
            const progress = algaeQuestActive.objectivesProgress[0] || 0;
            const required = objective?.count || 5;
            interactionType = 'quest_active';
            interactionPrompt = `I still need ${required - progress} more rare algae. You can find it while fishing - it's quite rare though, so keep casting!`;
            displayOptions = ["I'll keep looking", "Got it"];
        } else {
            // Quest not started - show initial prompt
            interactionType = 'initial';
            interactionPrompt = "MY PIGS! They're... they're...";
            displayOptions = ["What's wrong?", "Sorry, can't help"];
        }

        // Create NPC Dialog Bubble
        const playerUI: FarmerPlayerUI = {
            currentInteractionType: interactionType,
            currentQuestForInteraction: FarmerDialogNpc.RARE_ALGAE_QUEST_ID
        };

        if (this.entity && interactionPrompt) {
            playerUI.dialog = new SceneUI({
                templateId: 'npc-dialogue',
                attachedToEntity: this.entity,
                offset: { x: 0, y: this.config.modelScale * 1.2, z: 0 },
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
                    console.error(`[FarmerDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        // Handle UI based on device type and available options
        if (displayOptions.length > 0) {
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: displayOptions
                });
            } else {
                playerUI.options = new SceneUI({
                    templateId: 'player-options',
                    attachedToEntity: playerEntity,
                    offset: { x: 0, y: -0.5, z: 0 },
                    state: { options: displayOptions, owningPlayerId: player.id }
                });
                try {
                    playerUI.options.load(this.world);
                } catch (error) {
                    console.error(`[FarmerDialogNpc ${this.config.id}] Error loading options UI:`, error);
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

    // --- Handle dialog options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as FarmerPlayerUI | undefined;
        if (!playerUI) {
            console.warn(`[FarmerDialogNpc ${this.config.id}] No UI state found for player ${player.id} in handleOption.`);
            return;
        }

        const state = this.stateManager.getState(player);
        if (!state) return;

        const questManager = GameManager.instance?.questManager;
        if (!questManager) return;

        let npcResponseText = "Thank you for your help!";
        let endInteraction = true;

        if (playerUI.currentInteractionType === 'initial') {
            if (option === 0) {
                // Player chose "What's wrong?" - explain problem and offer quest
                npcResponseText = "My prize pigs have developed a rare condition that only rare algae can cure! Without it, they'll waste away! I need 5 rare algae to save them. I have a special reward for whoever helps me!";
                endInteraction = false;
                playerUI.currentInteractionType = 'quest_available';
            } else {
                // Player chose "Sorry, can't help"
                npcResponseText = "I understand. If you change your mind, I'll be here. My poor pigs...";
            }
        } else if (playerUI.currentInteractionType === 'quest_available') {
            if (option === 0) {
                // Player accepts quest
                const assigned = questManager.assignQuest(player, FarmerDialogNpc.RARE_ALGAE_QUEST_ID);
                if (assigned) {
                    npcResponseText = "Thank you so much! You can find rare algae while fishing - it's quite rare though, so keep casting! Come back when you have 5!";
                } else {
                    npcResponseText = "Hmm, it seems I can't give you that task right now. Try again in a moment.";
                }
            } else {
                // Player declines
                npcResponseText = "I understand. If you change your mind, I'll be here. My poor pigs...";
            }
        } else if (playerUI.currentInteractionType === 'quest_active') {
            if (option === 0) {
                npcResponseText = "Thank you! I'll be waiting here when you're ready.";
            } else {
                npcResponseText = "Take your time!";
            }
        } else if (playerUI.currentInteractionType === 'quest_turnin') {
            if (option === 0) {
                // Turn in quest
                const completed = questManager.completeQuest(player, FarmerDialogNpc.RARE_ALGAE_QUEST_ID);
                if (completed) {
                    npcResponseText = "Thank you so much for saving my pigs! Here's that special reward I promised - a Fly Rod! It's the best freshwater rod on the island, perfect for catching rare fish in ponds!";
                } else {
                    npcResponseText = "Hmm, something went wrong. Try again in a moment.";
                }
            } else {
                npcResponseText = "Take your time!";
            }
        }


        // Update dialogue bubble
        if (playerUI.dialog) {
            try {
                playerUI.dialog.setState({ text: npcResponseText });
            } catch (e) {
                console.error(`[FarmerDialogNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        // If we need to show new options (transitioning from initial to quest_available)
        if (!endInteraction && playerUI.currentInteractionType === 'quest_available') {
            const newOptions = ["I'll help!", "I can't help"];
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: newOptions
                });
            } else {
                // Hide old options and show new ones
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
                        state: { options: newOptions, owningPlayerId: player.id }
                    });
                    try {
                        playerUI.options.load(this.world);
                    } catch (error) {
                        console.error(`[FarmerDialogNpc ${this.config.id}] Error loading new options UI:`, error);
                        playerUI.options = undefined;
                    }
                }
            }
        } else if (endInteraction && playerUI.options) {
            // Hide options UI if interaction is ending
            try { playerUI.options.unload(); } catch (e) {}
            playerUI.options = undefined;
        }

        if (endInteraction) {
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000; // 30 seconds
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }
}

