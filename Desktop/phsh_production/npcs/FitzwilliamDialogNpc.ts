// npcs/FitzwilliamDialogNpc.ts
import { Player, World, PlayerEntity, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager';
import { ItemFactory } from '../Inventory/ItemFactory';

// Quest cooldown constant (3 minutes)
const FITZ_QUEST_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

// Extend the base interface for Fitzwilliam-specific state
interface FitzwilliamPlayerInteractionUI extends PlayerInteractionUI {
    currentInteractionQuestId?: string | null;
    isFirstQuestOfferStep?: 'initial' | null;
    interactionType?: 'job' | 'sea_story' | null;
}

export class FitzwilliamDialogNpc extends DialogNpc {
    private shouldUseOpenAI: boolean;
    private _shouldReactToSeaStoryForCurrentPlayer: boolean = false;

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.shouldUseOpenAI = config.useOpenAI ?? false;
    }

    // --- Implement Abstract Methods ---
    protected override shouldReactToSeaStory(story: SeaStory): boolean {
        if (!story) return false;
        return this._shouldReactToSeaStoryForCurrentPlayer;
    }

    protected getSeaStoryPrompt(story: SeaStory): string {
        return `*hic*... hear about that massive ${story.fishType} ${story.playerName} caught...?`;
    }

    protected getSeaStoryResponse(story: SeaStory): string {
        if (this.shouldUseOpenAI) {
            return `(AI Generated) By the seven seas! ${story.playerName}'s catch of that ${story.fishType} is legendary! The whispers in the currents speak of it!`;
        } else {
            const playerName = story?.playerName || 'a lucky fisher';
            const fishType = story?.fishType || 'remarkable fish';
            return `*Hic*... Aye, ${playerName} made quite the splash with that ${fishType}! The whole port's chattering about it. Sounds like the makings of a fine sea yarn, that does!`;
        }
    }

    protected getSeaStoryOptions(story: SeaStory): string[] {
        return this.config.interaction?.playerOptionText ? [this.config.interaction.playerOptionText] : ["Tell me more..."];
    }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[FitzwilliamDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        // Quest-specific cooldown check
        const lastQuestTime = state.lastQuestCompletionTime?.['fitzwilliam'] || 0;
        const questCooldownRemaining = FITZ_QUEST_COOLDOWN_MS - (now - lastQuestTime);
        const isQuestOnCooldown = questCooldownRemaining > 0;

        if (this.interactingPlayers.has(player.id)) { return; }

        const questManager = GameManager.instance?.questManager;
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0 || !questManager) {
            console.error(`[FitzwilliamDialogNpc ${this.config.id}] Missing prerequisites for interaction for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        // Get inventory manager and inventory early (needed for multiple checks)
        const inventoryManager = this.stateManager.getInventoryManager();
        const inventory = inventoryManager.getInventory(player);

        // --- Simplified Quest Determination Logic ---
        const baitFishingQuestId = 'fitz_quest_bait_fishing';

        let questToTurnIn: string | null = null;
        let interactionPrompt = "";
        let displayOptions: string[] = [];
        let currentQuestForInteraction: string | null = null;
        let firstQuestOfferStepFlag: 'initial' | null = null;
        let interactionType: 'job' | 'sea_story' | null = null;

        // Check bait fishing quest status (bypass availability checks - just check if it exists)
        const baitFishingQuestActive = state.quests.active[baitFishingQuestId];
        const baitFishingQuestCompleted = state.quests.completed[baitFishingQuestId];

        // Simplified logic: Check if fitz quest is done or active
        if (baitFishingQuestCompleted) {
            // Quest already completed - talk about the relic
            interactionPrompt = "*hic*... Found that relic piece on my last voyage. Curious piece. Keep it safe, matey.";
            displayOptions = ["I will."];
            interactionType = 'job';
        } else if (baitFishingQuestActive) {
            // Quest is active - check if ready for turn-in
            const questDef = questManager.getQuestDefinition(baitFishingQuestId);
            const questProgress = baitFishingQuestActive.objectivesProgress || {};
            const allObjectivesMet = questDef?.objectives.every((obj, index) =>
                (questProgress[index] || 0) >= obj.count
            ) || false;
            
            if (allObjectivesMet && baitFishingQuestActive.requiresTurnIn) {
                // Quest ready for turn-in
                questToTurnIn = baitFishingQuestId;
                interactionType = 'job';
                currentQuestForInteraction = baitFishingQuestId;
                interactionPrompt = "*hic*... Excellent work! You've caught 5 fish with bait. Sorry lad, no coin on me today. All I have is this strange trinket - it's yours now.";
                displayOptions = ["Thanks!"];
            } else {
                // Quest active but not complete yet
                const progress = questProgress[0] || 0;
                const required = questDef?.objectives[0]?.count || 5;
                interactionPrompt = `*hic*... Keep fishing with bait, mate. You've caught ${progress} of ${required} fish.`;
                displayOptions = ["I'll keep at it."];
                interactionType = 'job';
            }
        } else {
            // Fitz quest not done and not active - offer it directly (no prerequisite needed)
            interactionType = 'job';
            currentQuestForInteraction = baitFishingQuestId;
            interactionPrompt = "*hic*... Will you do me a favor, lad?  This ole peg doesn't allow me to cast like I used to. Catch 5 fish using bait - any bait will do. Interested?";
            displayOptions = ["Sure", "Maybe later."];
        }

        // --- Create Per-Player UI ---
        const playerUI: FitzwilliamPlayerInteractionUI = {
            currentFallbackResponse: "*hic*... Lost my train of thought...",
            currentInteractionQuestId: currentQuestForInteraction,
            isFirstQuestOfferStep: firstQuestOfferStepFlag,
            interactionType: interactionType
        };

        // Create NPC Dialog Bubble
        if (this.entity) {
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
                    console.error(`[FitzwilliamDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
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
                    console.error(`[FitzwilliamDialogNpc ${this.config.id}] Error loading options UI:`, error);
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
        const playerUI = this.interactingPlayers.get(player.id) as FitzwilliamPlayerInteractionUI | undefined;
        const state = this.stateManager.getState(player);
        const questManager = GameManager.instance?.questManager;

        if (!playerUI || !state || !questManager) {
            console.warn(`[FitzwilliamDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
             const stuckUI = this.interactingPlayers.get(player.id);
             if (stuckUI?.options) { try { stuckUI.options.unload(); } catch(e){} }
            return;
        }

        const questId = playerUI.currentInteractionQuestId;
        const baitFishingQuestId = 'fitz_quest_bait_fishing';

        let npcResponseText = playerUI.currentFallbackResponse || "*hic*... Lost my train of thought...";
        let endInteraction = true;
        let displayOptions: string[] = [];

        // Handle bait fishing quest
        if (questId === baitFishingQuestId) {
            const questDefinition = questManager.getQuestDefinition(baitFishingQuestId);
            const questActive = state.quests.active[baitFishingQuestId];
            const questCompleted = state.quests.completed[baitFishingQuestId];
            
            if (questCompleted) {
                // Quest already completed - just friendly response
                npcResponseText = "*hic*... Keep fishing, friend. More adventures await you out there.";
            } else if (questActive) {
                // Quest is active - check if ready for turn-in (though it auto-completes)
                const questProgress = questActive.objectivesProgress || {};
                const allObjectivesMet = questDefinition?.objectives.every((obj, index) =>
                    (questProgress[index] || 0) >= obj.count
                ) || false;
                
                if (allObjectivesMet && questActive.requiresTurnIn) {
                    // Turn-in quest
                    if (option === 0) { // "Thanks!"
                        const completed = questManager.completeQuest(player, baitFishingQuestId, false);
                        if (completed) {
                            // Set cooldown
                            const now = Date.now();
                            if (!state.lastQuestCompletionTime) state.lastQuestCompletionTime = {};
                            state.lastQuestCompletionTime['fitzwilliam'] = now;
                            
                            // Save player data - debounced is fine for quest completion
                            this.stateManager.save(player);
                            
                            // The relic shard UI will be triggered by QuestManager.grantRewards
                            npcResponseText = "*hic*... Take good care of that trinket, matey. It's special.";
                            displayOptions = ["I will."];
                            endInteraction = false;
                        } else {
                            npcResponseText = "*hic*... Something went wrong. Try again.";
                        }
                    }
                } else {
                    // Quest active but not complete
                    npcResponseText = "*hic*... Keep fishing with bait, mate.";
                }
            } else {
                // Offer quest
                if (option === 0) { // "Sure, what do you need?"
                    console.log(`[FitzwilliamDialogNpc] Attempting to assign quest ${baitFishingQuestId} to player ${player.id}`);
                    const assigned = questManager.assignQuest(player, baitFishingQuestId);
                    console.log(`[FitzwilliamDialogNpc] Quest assignment result: ${assigned}`);
                    if (assigned) {
                        npcResponseText = "*hic*... Good. Catch 5 fish using any bait - worms, shrimp, whatever you've got. Find me when you're done.";
                        // Hide arrows when quest is initiated
                        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
                        if (playerEntities && playerEntities.length > 0) {
                            const playerEntity = playerEntities[0];
                            if (playerEntity && (playerEntity as any).arrowManager) {
                                (playerEntity as any).arrowManager.hideArrows(player);
                            }
                        }
                    } else {
                        console.error(`[FitzwilliamDialogNpc] Failed to assign quest ${baitFishingQuestId} to player ${player.id}. Quest definition exists: ${questManager.getQuestDefinition(baitFishingQuestId) !== undefined}`);
                        npcResponseText = "*hic*... Something went wrong. Try again.";
                    }
                } else {
                    npcResponseText = "*hic*... Alright, suit yourself. Holler if you change your mind.";
                }
            }
        } else {
            // Fallback for any other interactions
            npcResponseText = "*hic*... Keep fishing, friend.";
        }

        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch(e) { 
                console.error(`[FitzwilliamDialogNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        // Update options if displayOptions was set
        if (displayOptions.length > 0 && !endInteraction) {
            if (this.stateManager.isMobile(player)) {
                // Send updated options to mobile with a small delay to ensure previous options are cleared
                setTimeout(() => {
                    player.ui.sendData({
                        type: 'showMobileNpcOptions',
                        options: displayOptions
                    });
                }, 150);
            } else {
                // Unload old options if they exist
                if (playerUI.options) {
                    try { playerUI.options.unload(); } catch (e) {}
                }
                // Create new options
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
                        console.error(`[FitzwilliamDialogNpc ${this.config.id}] Error loading options UI:`, error);
                        playerUI.options = undefined; 
                    }
                }
            }
        } else if (endInteraction) {
            // End interaction - hide options
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'npcInteractionEnded'
                });
            } else if (playerUI.options) {
                try { playerUI.options.unload(); } catch (e) {}
                playerUI.options = undefined;
            }
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
} 
