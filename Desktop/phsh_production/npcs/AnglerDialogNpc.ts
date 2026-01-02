// npcs/AnglerDialogNpc.ts
import { Player, World, PlayerEntity, SceneUI } from 'hytopia'; // Add SeaStory, PlayerEntity imports
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc'; // Import PlayerInteractionUI base
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager'; // QuestManager is needed

// Quest cooldown constant (10 minutes like Fisch)
const ANGLER_QUEST_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Extend the base interface for Angler-specific state
interface AnglerPlayerInteractionUI extends PlayerInteractionUI {
    currentInteractionQuestId?: string | null;
    isFirstQuestOfferStep?: 'initial' | null; // Simplified: only tracks if it's the initial offer phase
    currentInteractionType?: 'no_fitz_quests' | 'fitz_in_progress' | 'fitz_completed_no_rune' | 'fitz_completed_has_rune' | 'has_rune_special' | 'daily_quests' | null;
}

export class AnglerDialogNpc extends DialogNpc {

    // No class-level quest ID needed anymore

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        console.log(`[AnglerDialogNpc ${this.config.id}] Initialized.`);
    }

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
    protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "Need some help 'round here?"; }
    protected getSeaStoryResponse(story: SeaStory): string { return "Keep up the good work."; }
    protected getSeaStoryOptions(story: SeaStory): string[] { return ["Just looking around"]; }

    // --- Helper Methods ---
    private hasCompletedFitzQuests(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        const fitzQuestChain = ['fitz_quest_1_sardines', 'fitz_quest_2_kelp_eel', 'fitz_quest_3_big_grouper'];
        return fitzQuestChain.every(qId => state.quests.completed[qId]);
    }

    private hasEnteredFitzQuestTree(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        const fitzQuestChain = ['fitz_quest_1_sardines', 'fitz_quest_2_kelp_eel', 'fitz_quest_3_big_grouper'];
        return fitzQuestChain.some(qId => state.quests.active[qId] || state.quests.completed[qId]);
    }

    private hasCompletedExplorerQuests(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        // Check for explorer fragments quest completion
        const explorerQuestId = 'explorer_fragments_of_magnet';
        return !!state.quests.completed[explorerQuestId];
    }

    private hasRuneInInventory(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        return inventory.items.some(item => 
            (item.id === 'rune' || item.id === 'rare_rune') && (item.quantity || 0) > 0
        );
    }

    // --- Override interaction handling logic --- 
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { console.error(`[AnglerDialogNpc ${this.config.id}] No state found for player ${player.id}.`); return; }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; } // Cooldown active

        if (this.interactingPlayers.has(player.id)) { return; } // Already interacting

        const questManager = GameManager.instance?.questManager; // Use optional chaining
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0 || !questManager) {
            console.error(`[AnglerDialogNpc ${this.config.id}] Missing prerequisites for interaction (PlayerEntity or QuestManager) for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        console.log(`[AnglerDialogNpc ${this.config.id}] Player ${player.id} starting interaction.`);

        // --- Simplified State Determination ---
        const fitzQuestsCompleted = this.hasCompletedFitzQuests(player);
        const fitzQuestTreeEntered = this.hasEnteredFitzQuestTree(player);
        const explorerQuestsCompleted = this.hasCompletedExplorerQuests(player);
        const hasRune = this.hasRuneInInventory(player);
        const mapQuestActive = !!state.quests.active['fitz_quest_4_map_delivery'];
        const mapQuestCompleted = !!state.quests.completed['fitz_quest_4_map_delivery'];
        
        let interactionPrompt = "";
        let displayOptions: string[] = [];
        let interactionType: 'no_fitz_quests' | 'fitz_in_progress' | 'fitz_completed_no_rune' | 'fitz_completed_has_rune' | 'has_rune_special' | 'daily_quests' | null = null;

        if (!fitzQuestsCompleted && fitzQuestTreeEntered && !mapQuestActive && !mapQuestCompleted) {
            // State: In Fitz quest line but before scroll quest
            interactionPrompt = "You've got the right idea—different coves and inlets spawn different fish. Work the island: kelp beds, docks, cliffs, even shadowed shallows. Swap spots when the bites slow.";
            displayOptions = ["Any other tips?"];
            interactionType = 'fitz_in_progress';
        } else if (!fitzQuestsCompleted) {
            // State 1: Fitz quests NOT completed
            interactionPrompt = "Want to catch trophy fish and compete on the leaderboards? You'll need to learn the skills first. Look for jobs around the island.";
            displayOptions = ["Where do I look for work?"];
            interactionType = 'no_fitz_quests';
        } else if (explorerQuestsCompleted) {
            // State 3: Fitz quests completed, explorer quests completed
            // Player is a seasoned fisherman, but needs enchanted rod for biggest fish
            // Check this BEFORE hasRune so players see enchanted rod dialogue regardless of rune status
            interactionPrompt = "You've become a seasoned fisherman, I can see that. But if you want the biggest fish, you'll need an enchanted rod.";
            displayOptions = ["Enchanted rod?"];
            interactionType = 'fitz_completed_has_rune'; // Reusing this type for the enchanted rod state
        } else if (hasRune) {
            // Special case: If player has a rune but hasn't completed explorer quests, tell them to come back later
            // (This might be for a future quest/feature)
            interactionPrompt = "Come back later, I may have something for you.";
            displayOptions = ["I'll check back later"];
            interactionType = 'has_rune_special';
        } else {
            // State 2: Fitz quests completed, explorer quests NOT completed, NO rune
            interactionPrompt = "Having trouble with the bigger fish? All the best anglers use runes to enchant their rods with catch boosts.";
            displayOptions = ["How do I enchant?", "Not interested"];
            interactionType = 'fitz_completed_no_rune';
        }

        // --- Create Per-Player UI ---
        const playerUI: AnglerPlayerInteractionUI = {
            currentFallbackResponse: "Good luck out there!",
            currentInteractionType: interactionType
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
             // Check if dialog was created before loading
             if (playerUI.dialog) {
                 try {
                     playerUI.dialog.load(this.world);
                 } catch (error) {
                    console.error(`[AnglerDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined; // Ensure it's undefined on error
                 }
             }
        }

        console.log(`[AnglerDialogNpc ${this.config.id}] Checking if player ${player.id} is mobile`);
        if (this.stateManager.isMobile(player)) {
            console.log(`[AnglerDialogNpc ${this.config.id}] Sending options to mobile client UI for player ${player.id}`);
            if (displayOptions.length > 0) {
                // --- CORRECT THE DATA STRUCTURE ---
                player.ui.sendData({
                    type: 'showMobileNpcOptions', // Match client listener  
                    options: displayOptions       // Match client listener
                    // npcId: this.config.id // Optional: Still useful context
                });
                // ------------------------------------
                console.log(`[AnglerDialogNpc ${this.config.id}] Sent 'showMobileNpcOptions' event to player ${player.id}`);
            }   
        } else {
            // Create Player Options UI
            if (displayOptions.length > 0) {
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

        // Update player state (already checked state exists)
        if (!state.npcInteraction) {
            state.npcInteraction = { currentNpcId: this.config.id };
        } else {
            state.npcInteraction.currentNpcId = this.config.id;
        }
        console.log(`[AnglerDialogNpc ${this.config.id}] Interaction setup complete for player ${player.id}. Map size: ${this.interactingPlayers.size}`);
    }

    // --- Override option handler ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as AnglerPlayerInteractionUI | undefined; // Cast needed
        const state = this.stateManager.getState(player);
        const questManager = GameManager.instance?.questManager; // Use optional chaining

        if (!playerUI || !state || !questManager) {
             console.warn(`[AnglerDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id} or missing state/questManager.`);
              const stuckUI = this.interactingPlayers.get(player.id);
              if (stuckUI?.options) { try { stuckUI.options.unload(); } catch(e){} }
             return;
        }

        console.log(`[AnglerDialogNpc ${this.config.id}] handleOption for player ${player.id}, option: ${option}, interactionType: ${playerUI.currentInteractionType}`);

        let npcResponseText = playerUI.currentFallbackResponse || "Good luck fishing!";
        let displayOptions: string[] = [];
        let endInteraction = true; // Assume interaction ends by default

        // Handle based on interaction type
        if (playerUI.currentInteractionType === 'no_fitz_quests') {
            // State 1: Fitz quests NOT completed
            if (option === 0) {
                // "Where do I get work?"
                npcResponseText = "Head to the inn and find Ol' Man Fitzwilliam at the bar. He's always looking for help nowadays - it's a good place to get started. He'll have some simple jobs for you.";
            }
        } else if (playerUI.currentInteractionType === 'fitz_in_progress') {
            // State: In Fitz quest tree before scroll
            if (option === 0) {
                npcResponseText = "Keep rotating spots. Hotspots drift, and fish types change with depth and cover. If you want an edge, grab a rune and visit the wizard in the windmill to enchant your rod.";
            }
        } else if (playerUI.currentInteractionType === 'fitz_completed_no_rune') {
            // State 2: Fitz quests completed, NO rune
            if (option === 0) {
                // "How do I enchant?" - Tell about wizard
                npcResponseText = "There's a wizard in the windmill who can help you with that. He knows all about runes and enchantments. You'll need to find some runes first though.";
            } else if (option === 1) {
                // "Not interested"
                npcResponseText = "Suit yourself. But if you want to compete with the best, you'll need an enchanted rod.";
            }
        } else if (playerUI.currentInteractionType === 'fitz_completed_has_rune') {
            // State 3: Fitz quests completed, explorer quests completed, NO rune (enchanted rod dialogue)
            if (option === 0) {
                // "Enchanted rod?"
                npcResponseText = "For the biggest fish, you'll need an enchanted rod. There's a wizard in the windmill who can help you with that. He knows all about runes and enchantments.";
            }
        } else if (playerUI.currentInteractionType === 'has_rune_special') {
            // Special case: Player has rune
            if (option === 0) {
                // "I'll check back later"
                npcResponseText = "Good. I'll be here when you're ready.";
            }
        } else if (playerUI.currentInteractionType === 'daily_quests') {
            // Daily quests sub-menu
            if (option === 0) {
                // "Got it, thanks!" or "Thanks!"
                npcResponseText = "Good luck out there!";
            }
        } else {
            // Fallback
            npcResponseText = "Good fishing out there!";
        }

        // Update options if needed (for daily quests sub-menu)
        if (displayOptions.length > 0 && !endInteraction) {
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: displayOptions
                });
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
                        console.error(`[AnglerDialogNpc ${this.config.id}] Error loading new options UI:`, error);
                        playerUI.options = undefined;
                    }
                }
            }
            if (displayOptions.length > 0) {
                playerUI.currentInteractionType = 'daily_quests';
            }
        }

        console.log(`[AnglerDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the specific player's dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[AnglerDialogNpc ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[AnglerDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
            console.warn(`[AnglerDialogNpc ${this.config.id}] No dialog UI found for player ${player.id}`);
        }

        // Hide/unload the specific player's options UI ONLY if interaction ends
        if (endInteraction && playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined;
        }
       
        // --- Cleanup ---
        if (endInteraction) {
             if (playerUI.cleanupTimer) {
                 clearTimeout(playerUI.cleanupTimer);
             }
            const hideDelay = 30000;
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state); // Use helper from base class
            }, hideDelay);
        }
    } // End handleOption
} // End class
