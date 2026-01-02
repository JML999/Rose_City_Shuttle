import { Player, World, SceneUI } from 'hytopia'; // Core Hytopia classes
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc'; // Base class and types
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager'; // Your state manager
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager'; // Needed for base class constructor signature
import GameManager from '../GameManager'; // Potentially needed if stateManager isn't enough

// Extend base interface if needed (not strictly necessary for this logic)
interface MarinerPlayerInteractionUI extends PlayerInteractionUI {}

export class MarinerDialogNpc extends DialogNpc {

    // Constants matching PlayerStateManager.buyBoat()
    private readonly BOAT_COST = 250;
    private readonly REQUIRED_LEVEL = 3;

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager, // Base class requires it
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 4; // Set desired radius
    }

    // --- Implement Abstract Methods (Dummy implementations) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
    protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "Ahoy!"; }
    protected getSeaStoryResponse(story: SeaStory): string { return "Fair winds."; }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return this.config.interaction?.options?.map(opt => opt.text) || [];
    }

    // --- Override handlePlayerInteraction to provide simplified dialog ---
    protected override handlePlayerInteraction(player: Player): void {
        
        // Get player state for conditional messaging
        const state = this.stateManager.getState(player);
        if (!state) return;
        
        const level = this.stateManager.getCurrentLevel(player);
        
        // Simplified prompt - just "See boats" option
        let prompt: string;
        let displayOptions: string[] = [];
        
        if (level < this.REQUIRED_LEVEL) {
            // Not level 3 yet - simple message, no options
            prompt = "Come back at level 3 to buy a boat!";
            displayOptions = ["Nevermind"];
        } else {
            // Level 3+ - show "See boats" option
            prompt = "What can I interest you in?";
            displayOptions = ["See boats"];
        }
        
        // Temporarily override the config for this interaction
        const originalPrompt = this.config.interaction?.prompt;
        const originalOptions = this.config.interaction?.options;
        
        if (this.config.interaction) {
            this.config.interaction.prompt = prompt;
            this.config.interaction.options = displayOptions.map(text => ({ text, response: "" }));
        }
        
        // Call the base class implementation
        super.handlePlayerInteraction(player);
        
        // Restore the original config
        if (this.config.interaction) {
            if (originalPrompt !== undefined) {
                this.config.interaction.prompt = originalPrompt;
            }
            if (originalOptions !== undefined) {
                this.config.interaction.options = originalOptions;
            }
        }
    }

    // --- Override handleOption ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id) as MarinerPlayerInteractionUI | undefined;
        const state = this.stateManager.getState(player);

        if (!playerUI || !state) { return; }

        console.log(`[MarinerDialogNpc ${this.config.id}] handleOption for player ${player.id}, option: ${option}`);

        let npcResponseText = playerUI.currentFallbackResponse || "Not sure about that.";
        let endInteraction = true;
        
        const level = this.stateManager.getCurrentLevel(player);
        
        // Get the option text from config to handle all options properly
        const optionText = this.config.interaction?.options?.[option]?.text;
        
        // Handle options based on level
        if (level < this.REQUIRED_LEVEL) {
            // Level < 3 - only "Nevermind" option
            if (option === 0) {
                npcResponseText = "Fair winds! Come back when you reach level 3!";
            } else {
                npcResponseText = "Come back at level 3 to buy a boat!";
            }
        } else {
            // Level 3+ - handle all options
            if (optionText === "I'd like to buy a boat!" || option === 0) {
                // Buy boat - show shop
                this.showBoatShop(player);
                npcResponseText = "Take a look at what I have!";
            } else if (optionText === "Spawn my boat." || option === 1) {
                // Spawn boat
                const inventory = this.stateManager.getInventory(player);
                const hasBoat = inventory?.items.some(item => item.type === 'boat');
                
                if (!hasBoat) {
                    npcResponseText = "You don't own a boat yet! Buy one first.";
                } else {
                    const dockArea = 'spawn_dock'; // Default to spawn_dock
                    const success = this.stateManager.equipBoatAtDock(player, dockArea);
                    if (success) {
                        npcResponseText = "Your boat has been spawned at the dock!";
                    } else {
                        npcResponseText = "Failed to spawn boat. Please try again.";
                    }
                }
            } else if (optionText === "Tell me about boating." || option === 2) {
                // Info about boating
                const infoResponse = this.config.interaction?.options?.find(o => o.text === "Tell me about boating.")?.response;
                npcResponseText = infoResponse || "Boats are essential for reaching distant fishing spots!";
            } else {
                // Fallback for simplified "See boats" option
                switch (option) {
                    case 0: // See boats
                        this.showBoatShop(player);
                        npcResponseText = "Take a look at what I have!";
                        break;
                    default:
                        npcResponseText = "Changed your mind, eh? Come back anytime!";
                        break;
                }
            }
        }

        console.log(`[MarinerDialogNpc ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update UI
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
            } catch (e) { 
                console.error(`[MarinerDialogNpc ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
             this.stateManager.sendGameMessage(player, npcResponseText);
        }

        if (endInteraction && playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined;
        }

        // Cleanup scheduling
        if (endInteraction) {
             if (playerUI.cleanupTimer) {
                 clearTimeout(playerUI.cleanupTimer);
             }
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        } else {
             if (playerUI.cleanupTimer) {
                 clearTimeout(playerUI.cleanupTimer);
                 playerUI.cleanupTimer = undefined;
             }
        }
    }

    // --- Mariner Specific Methods ---

    private showBoatShop(player: Player) {
        console.log(`[MarinerDialogNpc] showBoatShop called for player ${player.id}`);
        const level = this.stateManager.getCurrentLevel(player);
        const playerCoins = this.stateManager.getCoinBalance(player);
        const inventory = this.stateManager.getInventory(player);

        // Build boat data
        const availableBoats = [{
            id: 'basic_boat',
            name: 'Fishing Boat',
            description: 'A reliable fishing boat for exploring the waters and reaching distant fishing spots.',
            value: this.BOAT_COST,
            requiredLevel: this.REQUIRED_LEVEL,
            playerLevel: level,
            playerCoins: playerCoins,
            alreadyOwned: inventory?.items.some(item => item.type === 'boat') || false,
            canAfford: playerCoins >= this.BOAT_COST,
            levelRequirementMet: level >= this.REQUIRED_LEVEL,
            canPurchase: (level >= this.REQUIRED_LEVEL) && (playerCoins >= this.BOAT_COST) && !(inventory?.items.some(item => item.type === 'boat'))
        }];

        player.ui.lockPointer(true);
        const shopData = {
            type: 'showBoatShop',
            boats: availableBoats,
            playerCoins: playerCoins,
            playerLevel: level,
            playerInventory: inventory?.items || []
        };
        console.log(`[MarinerDialogNpc] Sending boat shop data:`, shopData);
        player.ui.sendData(shopData);
    }

} // End class
