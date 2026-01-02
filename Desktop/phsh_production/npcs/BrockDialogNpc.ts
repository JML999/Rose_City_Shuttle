import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager';

export class BrockDialogNpc extends DialogNpc {
    private static readonly STRENGTH_QUEST_ID = 'brock_strength_test';
    
    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
        
        console.log(`[BrockDialogNpc ${this.config.id}] Initialized.`);
    }

    // --- Quest and Item Checking Methods ---
    private hasFitzQuestCompleted(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        return !!state.quests.completed['fitz_quest_bait_fishing'];
    }

    private hasStrengthQuestActive(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        return !!state.quests.active[BrockDialogNpc.STRENGTH_QUEST_ID];
    }

    // Add helper method to check if quest is completed
    private hasStrengthQuestCompleted(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        return !!state.quests.completed[BrockDialogNpc.STRENGTH_QUEST_ID];
    }


    // --- Context-Aware Dialog System ---
    private getContextualPrompt(player: Player): string {
        const hasQuestCompleted = this.hasStrengthQuestCompleted(player);
        const hasQuest = this.hasStrengthQuestActive(player);
        const hasFitzQuestDone = this.hasFitzQuestCompleted(player);

        // Quest completed: Show completion message
        if (hasQuestCompleted) {
            return "You've done it! A Relic Shard!";
        }

        // Quest active: Simple instruction
        if (hasQuest) {
            return "The pressure plates await. You'll need a fish over 200 pounds to activate them.";
        }

        // Prerequisite check: Need to complete Fitzwilliam's quest first
        if (!hasFitzQuestDone) {
            return "I've been studying these pressure plates, but I need someone experienced. Come back after you've helped Fitzwilliam.";
        }

        // Base greeting - ready to offer quest
        return "There are three of these plates scattered around the islands. They need something heavy - over 200 pounds - to activate them. Can you help?";
    }

    private getContextualOptions(player: Player): string[] {
        const hasQuestCompleted = this.hasStrengthQuestCompleted(player);
        const hasQuest = this.hasStrengthQuestActive(player);
        const hasFitzQuestDone = this.hasFitzQuestCompleted(player);

        // Quest completed: No options
        if (hasQuestCompleted) {
            return [];
        }

        // Quest active: No options
        if (hasQuest) {
            return [];
        }

        // Prerequisite not met: No options (just informational)
        if (!hasFitzQuestDone) {
            return [];
        }

        // Ready to offer quest: Simple option
        return ["I'll help"];
    }

    // --- Override handlePlayerInteraction to use new contextual system ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[BrockDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Check cooldown
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < 3000)) { return; } // 3 second cooldown

        if (this.interactingPlayers.has(player.id)) { return; }

        // Get player entities for UI attachment
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[BrockDialogNpc ${this.config.id}] No player entity found for ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        console.log(`[BrockDialogNpc ${this.config.id}] Player ${player.id} starting interaction.`);

        // Create contextual interaction
        const playerUI: any = {
            currentFallbackResponse: "The pressure plates await..."
        };

        // Get contextual prompt and options
        const interactionPrompt = this.getContextualPrompt(player);
        const displayOptions = this.getContextualOptions(player);

        // Create NPC Dialog Bubble
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
                    console.error(`[BrockDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
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
                console.log(`[BrockDialogNpc ${this.config.id}] Sent mobile options to player ${player.id}`);
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
                    console.error(`[BrockDialogNpc ${this.config.id}] Error loading options UI:`, error);
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

        console.log(`[BrockDialogNpc ${this.config.id}] Interaction setup complete for player ${player.id}.`);
    }

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "The pressure plates hold ancient secrets...";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "The patterns reveal themselves to those with strength...";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return ["Tell me about the plates", "I'll return later"];
    }

    // --- Handle Dialog Options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[BrockDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        console.log(`[BrockDialogNpc ${this.config.id}] handleOption called for player ${player.id} with option: ${option}`);
        let npcResponseText = playerUI.currentFallbackResponse || "The pressure plates await...";
        let endInteraction = true;

        const hasQuestCompleted = this.hasStrengthQuestCompleted(player);
        const hasQuest = this.hasStrengthQuestActive(player);
        const hasFitzQuestDone = this.hasFitzQuestCompleted(player);

        // Quest completed: Shouldn't have options, but handle gracefully
        if (hasQuestCompleted) {
            npcResponseText = "You've done it! A Relic Shard!";
        }
        // Quest active: No options, so this shouldn't be called, but handle gracefully
        else if (hasQuest) {
            npcResponseText = "The pressure plates await. You'll need a fish over 200 pounds to activate them.";
        }
        // Prerequisite not met
        else if (!hasFitzQuestDone) {
            npcResponseText = "Come back after you've helped Fitzwilliam. I need someone experienced.";
        }
        // Ready to offer quest
        else {
            npcResponseText = this.handleQuestOffer(player, option);
        }

        console.log(`[BrockDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[BrockDialogNpc ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[BrockDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        }

        // Hide options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined;
        }

        if (endInteraction) {
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000; // Standardized to 30 seconds
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    private handleQuestOffer(player: Player, option: number): string {
        switch (option) {
            case 0: // "I'll help"
                // Assign quest directly
                const questManager = GameManager.instance?.questManager;
                if (questManager) {
                    const assigned = questManager.assignQuest(player, BrockDialogNpc.STRENGTH_QUEST_ID);
                    if (assigned) {
                        console.log(`[BrockDialogNpc] Assigned quest ${BrockDialogNpc.STRENGTH_QUEST_ID} to player ${player.id}`);
                        
                        // Send quest notification to player
                        setTimeout(() => {
                            const messageManager = GameManager.instance?.messageManager;
                            if (messageManager) {
                                const questDef = questManager.getQuestDefinition(BrockDialogNpc.STRENGTH_QUEST_ID);
                                messageManager.sendRichGameMessage('Quest Added: ' + questDef?.title, player, {
                                    bonus: 'Strength Test!',
                                    rarity: 'epic',
                                    duration: 5000
                                });
                            }
                        }, 500);
                        
                        return "Great! Each plate has a marking - an insect, a small fish and a predator. Some sort of code perhaps. Good luck!";
                    } else {
                        console.error(`[BrockDialogNpc] Failed to assign quest ${BrockDialogNpc.STRENGTH_QUEST_ID} to player ${player.id}`);
                        return "Something went wrong. Please try again.";
                    }
                } else {
                    console.error(`[BrockDialogNpc] QuestManager not available for player ${player.id}`);
                    return "I'm having trouble with that right now. Please try again later.";
                }
            default:
                return "The pressure plates await those with strength...";
        }
    }

}

