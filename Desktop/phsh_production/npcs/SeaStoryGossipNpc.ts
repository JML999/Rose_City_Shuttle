// npcs/SeaStoryGossipNpc.ts
import { Player, World, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import { FISH_CATALOG } from '../Fishing/PhshTwoFIshCatalog';

// Extend the base interface for trophy fish hint state
interface TrophyHintPlayerInteractionUI extends PlayerInteractionUI {
    currentTrophyHint?: { fishName: string; location: string; hint: string };
}

export class SeaStoryGossipNpc extends DialogNpc {
    private shouldUseOpenAI: boolean;

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.shouldUseOpenAI = config.useOpenAI ?? false;
        console.log(`[SeaStoryGossipNpc ${this.config.id}] Initialized. Providing trophy fish location hints.`);
    }

    // --- Implement Abstract Methods (required by base class but not used) ---
    protected override shouldReactToSeaStory(story: SeaStory): boolean {
        return false; // This NPC no longer uses sea stories
    }

    protected getSeaStoryPrompt(story: SeaStory): string {
        return "";
    }

    protected getSeaStoryResponse(story: SeaStory): string {
        return "";
    }

    protected getSeaStoryOptions(story: SeaStory): string[] {
        return [];
    }

    // --- Trophy Fish Hint Generation ---
    
    /**
     * Maps subzone tags to player-friendly location names
     */
    private mapSubzoneToLocation(subzoneTag: string): string | null {
        // Old Dock
        if (subzoneTag === 'old_dock') {
            return "Old Dock";
        }
        // Pier
        if (subzoneTag === 'pier') {
            return "the Pier";
        }
        // Kelp Beds
        if (subzoneTag === 'kelp_bed' || subzoneTag === 'shadow_kelp_inlet' || subzoneTag === 'shadow_kelp_coast') {
            return "the Kelp Beds";
        }
        // Beach
        if (subzoneTag === 'sunny_beach' || subzoneTag === 'shady_beach') {
            return "the Beach";
        }
        // Cliffs (deep_coast can indicate cliffs in some areas)
        if (subzoneTag === 'deep_coast') {
            return "the Cliffs";
        }
        return null;
    }

    /**
     * Maps region tags to player-friendly location names
     */
    private mapRegionToLocation(regionTag: string): string | null {
        // Toolmaster's Island
        if (regionTag === 'toolmaster_island' || regionTag === 'toolmaster_dock_deep' || regionTag === 'toolmaster_isle') {
            return "Toolmaster's Island";
        }
        // Shadow Isle
        if (regionTag === 'shadow_isle' || regionTag === 'shadow_deep') {
            return "Shadow Isle";
        }
        // Pier (deep waters near pier)
        if (regionTag === 'pier_deep') {
            return "the deep waters near the Pier";
        }
        // Cliffs
        if (regionTag === 'cliffs_deep' || regionTag === 'rock_deep') {
            return "the Cliffs";
        }
        // Old Dock (big_island with old_dock context would be caught by subzone, but fallback here)
        if (regionTag === 'big_island') {
            return "the Beach"; // Default for big_island without specific subzone
        }
        return null;
    }

    /**
     * Gets a random trophy fish and generates a location hint
     */
    private getRandomTrophyFishHint(): { fishName: string; location: string; hint: string } {
        // Get all trophy fish
        const trophyFish = FISH_CATALOG.filter(fish => fish.isTrophy && !fish.isLoot);
        
        if (trophyFish.length === 0) {
            return {
                fishName: "rare fish",
                location: "the deep waters",
                hint: "*whispers*... Heard tales of something big lurking in the depths... but the details are hazy..."
            };
        }

        // Select a random trophy fish
        const randomFish = trophyFish[Math.floor(Math.random() * trophyFish.length)];
        const fishName = randomFish.name;

        // Find the best location hint from spawn data
        // Prioritize subzone tags (more specific) over region tags
        let location: string | null = null;
        const spawnData = randomFish.spawnData;
        
        // First, check subzone tags for specific locations
        if (spawnData.subzoneTags) {
            // Find the subzone with the highest spawn multiplier
            let maxMultiplier = 0;
            let bestSubzone: string | null = null;
            
            for (const [subzoneTag, multiplier] of Object.entries(spawnData.subzoneTags)) {
                if (multiplier > maxMultiplier) {
                    maxMultiplier = multiplier;
                    bestSubzone = subzoneTag;
                }
            }
            
            if (bestSubzone) {
                location = this.mapSubzoneToLocation(bestSubzone);
            }
        }

        // If no subzone location found, check region tags
        if (!location && spawnData.regionTags) {
            // Find the region with the highest spawn multiplier
            let maxMultiplier = 0;
            let bestRegion: string | null = null;
            
            for (const [regionTag, multiplier] of Object.entries(spawnData.regionTags)) {
                if (multiplier > maxMultiplier) {
                    maxMultiplier = multiplier;
                    bestRegion = regionTag;
                }
            }
            
            if (bestRegion) {
                location = this.mapRegionToLocation(bestRegion);
            }
        }

        // Fallback if no location found
        if (!location) {
            location = "the deep waters";
        }

        // Generate hint text
        const hintTemplates = [
            `*whispers*... Heard whispers about a ${fishName} lurking near ${location}...`,
            `*murmurs*... Someone mentioned seeing a ${fishName} around ${location}...`,
            `*quietly*... The currents speak of a ${fishName} near ${location}...`,
            `*hushed*... Tales of a ${fishName} have been circulating... said to be near ${location}...`
        ];
        
        const hint = hintTemplates[Math.floor(Math.random() * hintTemplates.length)];

        return { fishName, location, hint };
    }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[SeaStoryGossipNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0) {
            console.error(`[SeaStoryGossipNpc ${this.config.id}] Missing prerequisites for interaction for player ${player.id}.`);
            return;
        }

        console.log(`[SeaStoryGossipNpc ${this.config.id}] Player ${player.id} starting interaction.`);

        // Generate a trophy fish hint
        const trophyHint = this.getRandomTrophyFishHint();
        const initialPrompt = trophyHint.hint;

        const playerUI: TrophyHintPlayerInteractionUI = {
            currentFallbackResponse: initialPrompt,
            currentTrophyHint: trophyHint
        };

        // Create NPC Dialog Bubble
        if (this.entity) {
            playerUI.dialog = new SceneUI({
                templateId: 'npc-dialogue',
                attachedToEntity: this.entity,
                offset: { x: 0, y: this.config.modelScale * 1.2, z: 0 },
                state: { 
                    text: initialPrompt, 
                    npcName: this.config.name || this.config.id,
                    owningPlayerId: player.id 
                }
            });
            if (playerUI.dialog) {
                try {
                    playerUI.dialog.load(this.world);
                } catch (error) {
                    console.error(`[SeaStoryGossipNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
                    playerUI.dialog = undefined;
                }
            }
        }

        // Create options UI
        const options = this.config.interaction?.options?.map(opt => opt.text) || ["Thanks for the tip!"];
        if (options.length > 0) {
            try {
                playerUI.options = new SceneUI({
                    templateId: 'npc-dialogue-options',
                    attachedToEntity: this.entity,
                    offset: { x: 0, y: this.config.modelScale * 1.5, z: 0 },
                    state: {
                        options: options,
                        owningPlayerId: player.id
                    }
                });
                if (playerUI.options) {
                    playerUI.options.load(this.world);
                }
            } catch (error) {
                console.error(`[SeaStoryGossipNpc ${this.config.id}] Error loading options UI for ${player.id}:`, error);
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
        console.log(`[SeaStoryGossipNpc ${this.config.id}] Interaction setup complete for player ${player.id}.`);
    }

    // --- Override option handler ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as TrophyHintPlayerInteractionUI | undefined;
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) {
            console.warn(`[SeaStoryGossipNpc ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            const stuckUI = this.interactingPlayers.get(player.id);
            if (stuckUI?.options) { try { stuckUI.options.unload(); } catch(e){} }
            return;
        }

        console.log(`[SeaStoryGossipNpc ${this.config.id}] handleOption for player ${player.id}, option: ${option}`);

        let npcResponseText = "*nods*... Good luck out there, angler...";
        let endInteraction = true;

        console.log(`[SeaStoryGossipNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch(e) { 
                console.error(`[SeaStoryGossipNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        if (endInteraction && playerUI.options) {
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

