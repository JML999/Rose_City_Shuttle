import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';

export class OldAnglerDialogNpc extends DialogNpc {
    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3;
    }

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return "*hums softly* ...";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "*continues humming*";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return ["Nevermind"];
    }

    // --- Override interaction handling ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) {
            console.error(`[OldAnglerDialogNpc ${this.config.id}] No state found for player ${player.id}.`);
            return;
        }

        // Check cooldown
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < 3000)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[OldAnglerDialogNpc ${this.config.id}] No player entity found for ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];


        // The humming song
        const interactionPrompt = "*hums* ... the sun through X-crossed trees... The golden scales, the brightest gleam...brought the cartographer's dream...";
        const displayOptions = ["What are you singing?"];

        // Create NPC Dialog Bubble
        const playerUI: any = {
            currentFallbackResponse: "*hums quietly* ..."
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
                    console.error(`[OldAnglerDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        // Handle UI based on device type
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
                    console.error(`[OldAnglerDialogNpc ${this.config.id}] Error loading options UI:`, error);
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

    // --- Handle Dialog Options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[OldAnglerDialogNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }

        let npcResponseText = "*hums* ...";
        let endInteraction = true;

        switch (option) {
            case 0: // "What are you singing?"
                npcResponseText = "*stops humming* Ah, just an old tune... about some ancient mythical fish they say. *chuckles* Just fishermen's tales, I reckon.";
                break;
            default:
                npcResponseText = "*hums quietly* ...";
        }

        // Update the dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch(e) { 
                console.error(`[OldAnglerDialogNpc ${this.config.id}] Error updating dialog:`, e);
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
            const hideDelay = 30000;
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }
}

