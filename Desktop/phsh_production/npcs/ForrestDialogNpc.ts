import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager';

export class ForrestDialogNpc extends DialogNpc {
    private static readonly ANGLERFISH_QUEST_ID = 'forrest_anglerfish_light';
    
    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
        
    }

    // --- Quest and Item Checking Methods ---
    private hasRelicShard(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        return inventory.items.some(item => item.id === 'relic_shard' || item.id.startsWith('relic_shard'));
    }

    private hasAnglerfish(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        // Check for anglerfish in inventory (by species or item id)
        return inventory.items.some(item => 
            (item.type === 'fish' && item.metadata?.fishStats?.species === 'anglerfish') ||
            item.id === 'anglerfish' ||
            item.id.startsWith('anglerfish_')
        );
    }

    private hasAnglerfishEquipped(player: Player): boolean {
        const equippedFish = this.stateManager.getEquippedFish(player);
        if (!equippedFish) return false;
        // Check if equipped fish is anglerfish
        return equippedFish.metadata?.fishStats?.species === 'anglerfish' ||
               equippedFish.id === 'anglerfish' ||
               equippedFish.id.startsWith('anglerfish_');
    }

    private hasAnglerfishQuestActive(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        // Check if quest object exists (not checking for boolean true, but object existence)
        return !!state.quests.active[ForrestDialogNpc.ANGLERFISH_QUEST_ID];
    }

    // Add helper method to check if quest is completed
    private hasAnglerfishQuestCompleted(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        return !!state.quests.completed[ForrestDialogNpc.ANGLERFISH_QUEST_ID];
    }


    // --- Context-Aware Dialog System ---
    private getContextualPrompt(player: Player): string {
        const hasQuestCompleted = this.hasAnglerfishQuestCompleted(player);
        const hasQuest = this.hasAnglerfishQuestActive(player);
        const hasRelicShard = this.hasRelicShard(player);

        // Quest completed: Show completion message
        if (hasQuestCompleted) {
            return "You've done it! A Relic Shard!";
        }

        // Quest active: Simple instruction to approach altar with anglerfish
        if (hasQuest) {
            return "I need an anglerfish at night to read the star altar. Catch one and bring it to the altar when it's dark.";
        }

        // Prerequisite check: Need relic shard in inventory
        if (!hasRelicShard) {
            return "Welcome to stargaze island! I need an experienced angler for what I'm working on - come back later.";
        }

        // Base greeting - ready to offer quest
        return "Ive been studying the cosmos to try and crack this alter but i need some light at night. Will you bring me an anglerfish?";
    }

    private getContextualOptions(player: Player): string[] {
        const hasQuestCompleted = this.hasAnglerfishQuestCompleted(player);
        const hasQuest = this.hasAnglerfishQuestActive(player);
        const hasRelicShard = this.hasRelicShard(player);

        // Quest completed: No options
        if (hasQuestCompleted) {
            return [];
        }

        // Quest active: No options
        if (hasQuest) {
            return [];
        }

        // Prerequisite not met: No options (just informational)
        if (!hasRelicShard) {
            return [];
        }

        // Ready to offer quest: Simple option
        return ["I'll help"];
    }

    // --- Override handlePlayerInteraction to use new contextual system ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[ForrestDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Clear any active achievement popups when a new NPC interaction starts
        player.ui.sendData({ type: 'clearAchievementPopups' });

        // Check cooldown
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < 3000)) { return; } // 3 second cooldown

        if (this.interactingPlayers.has(player.id)) { return; }

        // Get player entities for UI attachment
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[ForrestDialogNpc ${this.config.id}] No player entity found for ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        // Create contextual interaction
        const playerUI: any = {
            currentFallbackResponse: "The stars whisper secrets..."
        };

        // Get contextual prompt and options
        const interactionPrompt = this.getContextualPrompt(player);
        const displayOptions = this.getContextualOptions(player);
        
        console.log(`[ForrestDialogNpc ${this.config.id}] Player ${player.id} interaction - prompt: "${interactionPrompt}", options: [${displayOptions.join(', ')}]`);

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
                    console.error(`[ForrestDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
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
                    console.error(`[ForrestDialogNpc ${this.config.id}] Error loading options UI:`, error);
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

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "The stars tell stories of the sea...";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "The celestial patterns reflect in the waters...";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return ["Tell me about the stars", "I'll return later"];
    }

    // --- Handle Dialog Options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[ForrestDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        let npcResponseText = playerUI.currentFallbackResponse || "The stars whisper secrets...";
        let endInteraction = true;

        const hasQuestCompleted = this.hasAnglerfishQuestCompleted(player);
        const hasQuest = this.hasAnglerfishQuestActive(player);
        const hasRelicShard = this.hasRelicShard(player);

        // Quest completed: Shouldn't have options, but handle gracefully
        if (hasQuestCompleted) {
            npcResponseText = "You've done it! A Relic Shard!";
        }
        // Quest active: No options, so this shouldn't be called, but handle gracefully
        else if (hasQuest) {
            npcResponseText = "I need an anglerfish at night to read the star altar. Catch one and bring it to the altar when it's dark.";
        }
        // Prerequisite not met
        else if (!hasRelicShard) {
            npcResponseText = "You're not experienced enough yet. Come back when you have a relic shard.";
        }
        // Ready to offer quest
        else {
            npcResponseText = this.handleQuestOffer(player, option);
        }

        console.log(`[ForrestDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[ForrestDialogNpc ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[ForrestDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
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
                    const assigned = questManager.assignQuest(player, ForrestDialogNpc.ANGLERFISH_QUEST_ID);
                    if (assigned) {
                        console.log(`[ForrestDialogNpc] Assigned quest ${ForrestDialogNpc.ANGLERFISH_QUEST_ID} to player ${player.id}`);
                        
                        // Send quest notification to player
                        setTimeout(() => {
                            const messageManager = GameManager.instance?.messageManager;
                            if (messageManager) {
                                const questDef = questManager.getQuestDefinition(ForrestDialogNpc.ANGLERFISH_QUEST_ID);
                                messageManager.sendRichGameMessage('Quest Added: ' + questDef?.title, player, {
                                    bonus: 'Light for the Stars!',
                                    rarity: 'epic',
                                    duration: 5000
                                });
                            }
                        }, 500);
                        
                        return "Great! Catch an anglerfish and bring it to the altar at night. Equip it when you're there - its light will help us see the pattern.";
                    } else {
                        console.error(`[ForrestDialogNpc] Failed to assign quest ${ForrestDialogNpc.ANGLERFISH_QUEST_ID} to player ${player.id}`);
                        return "Something went wrong. Please try again.";
                    }
                } else {
                    console.error(`[ForrestDialogNpc] QuestManager not available for player ${player.id}`);
                    return "I'm having trouble with that right now. Please try again later.";
                }
            default:
                return "The stars hold many secrets...";
        }
    }

}

