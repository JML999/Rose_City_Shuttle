import { Player, World, PlayerEntity, SceneUI } from 'hytopia';
import { DialogNpc, type NpcConfig, type PlayerInteractionUI, NPC_INTERACTION_COOLDOWN_MS } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import GameManager from '../GameManager';
import { ItemFactory } from '../Inventory/ItemFactory';
import { MessageManager } from '../MessageManager';

// Extend the base interface for Explorer-specific state
interface ExplorerPlayerInteractionUI extends PlayerInteractionUI {
    currentInteractionType?: 'lionfish_available' | 'lionfish_active' | 'lionfish_turnin' | 'gated' | 'initial_greeting' | 'scroll_first_show' | 'fragments_available' | 'fragments_active' | 'fragments_turnin' | 'ultimate_available' | 'ultimate_active' | 'ultimate_complete' | null;
    currentInteractionQuestId?: string | null;
    hasShownRelic?: boolean; // Track if player has shown the relic
}

export class ExplorerDialogNpc extends DialogNpc {

    private static readonly LIONFISH_QUEST_ID = 'explorer_lionfish_request';
    private static readonly FRAGMENTS_QUEST_ID = 'explorer_fragments_of_magnet';
    private static readonly RIDDLE_QUEST_ID = 'explorer_solve_riddle';
    private static readonly ULTIMATE_TREASURE_QUEST_ID = 'explorer_ultimate_treasure';
    private static readonly SCROLL_DELIVERY_QUEST_ID = 'fitz_quest_4_map_delivery';

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig
    ) {
        super(world, stateManager, seaStoryManager, config);
        console.log(`[ExplorerDialogNpc ${this.config.id}] Initialized.`);
    }

    // --- Implement Abstract Methods ---
    protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
    protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "These ancient waters hold many secrets..."; }
    protected getSeaStoryResponse(story: SeaStory): string { return "The mysteries of the deep continue..."; }
    protected getSeaStoryOptions(story: SeaStory): string[] { return ["Just exploring"]; }

    // Helper method to check if player has completed Fitz quests
    private hasCompletedFitzQuests(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;

        // Check if all Fitz quests are completed
        const fitzQuestChain = ['fitz_quest_1_sardines', 'fitz_quest_2_kelp_eel', 'fitz_quest_3_big_grouper'];
        return fitzQuestChain.every(qId => state.quests.completed[qId]);
    }

    // Helper method to check if player has discovered at least 20 species
    private hasEnoughSpecies(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state || !state.phshdex) return false;
        
        const speciesCount = Object.keys(state.phshdex.speciesRecords || {}).length;
        return speciesCount >= 20;
    }

    // Helper method to check if player has the ancient scroll
    private hasAncientScroll(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        
        return inventory.items.some(item => item.id === 'ancient_scroll');
    }

    // Helper method to check if player has a magnet
    private hasMagnet(player: Player): boolean {
        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return false;
        
        return inventory.items.some(item => item.id === 'bait_magnet');
    }

    // Helper method to check if player has shown scroll to Explorer before
    private hasShownScrollToExplorer(player: Player): boolean {
        const state = this.stateManager.getState(player);
        if (!state) return false;
        return state.flags?.hasShownScrollToExplorer === true;
    }

    // Helper method to mark that player has shown scroll to Explorer
    private markScrollShownToExplorer(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) return;
        if (!state.flags) {
            state.flags = {};
        }
        state.flags.hasShownScrollToExplorer = true;
    }

    // Helper method to count fragments in player inventory (now stackable)
    private getFragmentCount(player: Player): number {
        const inventoryManager = this.stateManager.getInventoryManager();
        if (!inventoryManager) return 0;

        const inventory = this.stateManager.getInventory(player);
        if (!inventory) return 0;

        const fragmentItem = inventory.items.find(item => item.id === 'ancient_fragment');
        return fragmentItem ? fragmentItem.quantity : 0;
    }

    // --- Override interaction handling logic ---
    protected override handlePlayerInteraction(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) { 
            console.error(`[ExplorerDialogNpc ${this.config.id}] No state found for player ${player.id}.`); 
            return; 
        }

        // Cooldown Check
        const lastEndTime = state.lastNpcInteractionEndTime?.[this.config.id];
        const now = Date.now();
        if (lastEndTime && (now - lastEndTime < NPC_INTERACTION_COOLDOWN_MS)) { return; }

        if (this.interactingPlayers.has(player.id)) { return; }

        const questManager = GameManager.instance?.questManager;
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (!playerEntities || playerEntities.length === 0 || !questManager) {
            console.error(`[ExplorerDialogNpc ${this.config.id}] Missing prerequisites for interaction for player ${player.id}.`);
            return;
        }
        const playerEntity = playerEntities[0];

        console.log(`[ExplorerDialogNpc ${this.config.id}] Player ${player.id} starting interaction.`);

        // Check lionfish quest status first (simpler quest, offered before complex ones)
        const lionfishQuestActive = state.quests.active[ExplorerDialogNpc.LIONFISH_QUEST_ID];
        const lionfishQuestCompleted = state.quests.completed[ExplorerDialogNpc.LIONFISH_QUEST_ID];
        const lionfishQuestReady = lionfishQuestActive?.requiresTurnIn;

        let interactionType: 'lionfish_available' | 'lionfish_active' | 'lionfish_turnin' | 'gated' | 'initial_greeting' | 'scroll_first_show' | 'fragments_available' | 'fragments_active' | 'fragments_turnin' | 'ultimate_available' | 'ultimate_active' | 'ultimate_complete' = 'gated';
        let interactionPrompt = "";
        let displayOptions: string[] = [];
        let currentQuestForInteraction: string | null = null;
        let hasScroll = false; // Initialize outside scope

        // Handle lionfish quest first (if not completed)
        if (!lionfishQuestCompleted) {
            if (lionfishQuestReady) {
                // Quest ready to turn in
                interactionType = 'lionfish_turnin';
                currentQuestForInteraction = ExplorerDialogNpc.LIONFISH_QUEST_ID;
                interactionPrompt = "Excellent! You've caught a lionfish! Ready to turn it in?";
                displayOptions = ["Turn in quest", "Not yet"];
            } else if (lionfishQuestActive) {
                // Quest active but not ready
                interactionType = 'lionfish_active';
                interactionPrompt = "Try using scarab bait - they work great around here. Break leaves on the island to find them";
                displayOptions = ["I'll keep trying"];
            } else {
                // Quest available - offer it
                interactionType = 'lionfish_available';
                interactionPrompt = "I need a lionfish for my research.  Can you help?";
                displayOptions = ["I'll help", "What's a lionfish?"];
            }
        } else {
            // Lionfish quest completed - proceed with complex quest logic
            // Check prerequisites
            const hasFitzQuests = this.hasCompletedFitzQuests(player);
            const hasEnoughSpecies = this.hasEnoughSpecies(player);
            hasScroll = this.hasAncientScroll(player); // Update the outer scope variable
            const inventoryManager = this.stateManager.getInventoryManager();
            const inventory = this.stateManager.getInventory(player);
            
            const fragmentCount = this.getFragmentCount(player);

            if (!hasFitzQuests) {
            // Gate 1: Player hasn't completed Fitz quests
            interactionType = 'gated';
            interactionPrompt = "Hello explorer! Hmm you seem a bit inexperienced, come back after you've completed some jobs around town.";
            displayOptions = ["What are these ruins?", "I'll come back later"];
        } else if (!hasEnoughSpecies) {
            // Gate 2: Player has completed Fitz but not enough species
            interactionType = 'gated';
            interactionPrompt = "You've proven yourself with Fitz, but you need more experience with these waters. Come back once you've discovered at least 20 different fish species.";
            displayOptions = ["I'll keep exploring"];
        } else {
            // Both prerequisites met - check quest status
            const fragmentsQuestActive = state.quests.active[ExplorerDialogNpc.FRAGMENTS_QUEST_ID];
            const fragmentsQuestCompleted = state.quests.completed[ExplorerDialogNpc.FRAGMENTS_QUEST_ID];
            const ultimateQuestActive = state.quests.active[ExplorerDialogNpc.ULTIMATE_TREASURE_QUEST_ID];
            const ultimateQuestCompleted = state.quests.completed[ExplorerDialogNpc.ULTIMATE_TREASURE_QUEST_ID];

            if (ultimateQuestCompleted) {
                // All quests complete
                interactionType = 'ultimate_complete';
                interactionPrompt = "*Marveling* Incredible! You've retrieved the ultimate treasure! True explorer proven.";
                displayOptions = ["What other mysteries remain?", "Tell me about the loot rod", "Thank you for everything"];
            } else if (ultimateQuestActive) {
                // Ultimate treasure quest active
                interactionType = 'ultimate_active';
                const questDef = questManager.getQuestDefinition(ExplorerDialogNpc.ULTIMATE_TREASURE_QUEST_ID);
                const isReadyToTurnIn = state.quests.active[ExplorerDialogNpc.ULTIMATE_TREASURE_QUEST_ID]?.requiresTurnIn;
                
                if (isReadyToTurnIn) {
                    currentQuestForInteraction = ExplorerDialogNpc.ULTIMATE_TREASURE_QUEST_ID;
                    interactionPrompt = "Excellent! You've retrieved the vault! Ready to turn it in?";
                    displayOptions = ["Turn in quest", "Not yet"];
                } else {
                    interactionPrompt = questDef?.fishingTip || "Fish at the pyramid during sunset with your Ancient Magnet and a rod with 300+ capacity!";
                    displayOptions = ["Remind me of the requirements", "I'm still searching"];
                }
            } else if (state.quests.completed[ExplorerDialogNpc.RIDDLE_QUEST_ID]) {
                // Forge quest completed - acknowledge completion (ultimate treasure quest is deprecated)
                interactionType = 'ultimate_complete'; // Reuse this type for "all done" state
                interactionPrompt = "Incredible! You've retrieved the relic shard from the pyramid pool! One of three pieces needed to unlock the ancient treasure. Keep exploring - there are other shards hidden across the islands.";
                displayOptions = ["Tell me about the other shards", "I'll keep exploring"];
            } else if (fragmentsQuestActive) {
                // Fragments quest active - check if player has all 3 fragments
                if (fragmentCount >= 3) {
                    // Ready to turn in
                    interactionType = 'fragments_turnin';
                    currentQuestForInteraction = ExplorerDialogNpc.FRAGMENTS_QUEST_ID;
                    interactionPrompt = "Excellent! You have all three fragments! Ready to assemble the Ancient Magnet?";
                    displayOptions = ["Assemble the magnet", "Not yet"];
                } else {
                    // Still searching
                    interactionType = 'fragments_active';
                    interactionPrompt = `Keep exploring! Come back when you have all three pieces. You currently have ${fragmentCount} of 3. The scroll shows three ancient pools where the fragments are hidden - use a magnet (forge one with the Toolmaster if needed) to search for them.`;
                    displayOptions = ["I'll keep searching"];
                }
            } else {
                // Check if riddle quest is active
                const riddleQuestActive = state.quests.active[ExplorerDialogNpc.RIDDLE_QUEST_ID];
                const riddleQuestReady = riddleQuestActive?.requiresTurnIn;
                
                if (riddleQuestReady) {
                    // Riddle quest ready to turn in
                    interactionType = 'fragments_turnin';
                    currentQuestForInteraction = ExplorerDialogNpc.RIDDLE_QUEST_ID;
                    interactionPrompt = "Incredible! You've solved the riddle and retrieved the chest! Ready to turn it in?";
                    displayOptions = ["Turn in quest", "Not yet"];
                } else if (riddleQuestActive) {
                    // Riddle quest active but not ready
                    const questDef = questManager.getQuestDefinition(ExplorerDialogNpc.RIDDLE_QUEST_ID);
                    interactionType = 'fragments_active';
                    interactionPrompt = questDef?.fishingTip || "Fish at the pyramid's ancient pool during sunset (17:00-19:59) with a rod of exceptional strength (Iron Rod or stronger) and a magnet bait. The chest awaits those who solve the riddle!";
                    displayOptions = ["I'll keep trying", "Remind me of the clues"];
                } else {
                    // Initial greeting - prerequisites met but no quest active yet
                    interactionType = 'initial_greeting';
                    const hasShownScroll = this.hasShownScrollToExplorer(player);
                    
                    if (hasScroll && !hasShownScroll) {
                        // Player has the scroll but hasn't shown it yet - first time showing
                        interactionType = 'scroll_first_show';
                        interactionPrompt = "Hello Explorer! I'm excavating a tomb at the bottom of this pyramid and found something valuable! However, it's impossible to retrieve - it's held down by an ancient magnetic force. If only I had another clue...";
                        displayOptions = ["Is this old scroll related?"];
                    } else if (hasScroll && hasShownScroll) {
                        // Player has shown scroll before - just give hint
                        interactionType = 'fragments_active';
                        interactionPrompt = "We need to try fishing the pool with an item that will break the magnetic field! The scroll's forge clue suggests you'll need a forged instrument to retrieve what's hidden there.";
                        displayOptions = ["I'll try that"];
                    } else {
                        // No scroll yet - show greeting and context
                        interactionPrompt = "Hello Explorer! I'm excavating a tomb at the bottom of this pyramid and found a treasure chest! However, it's impossible to excavate - it's held down by an ancient magnetic force. *pauses* Have you found anything interesting in your travels?";
                        displayOptions = ["I have this scroll", "Tell me more about these ruins", "What are you looking for?"];
                    }
                }
            }
            }
        }

        // --- Create Per-Player UI ---
        const playerUI: ExplorerPlayerInteractionUI = {
            currentFallbackResponse: "The ancient secrets remain hidden for now...",
            currentInteractionType: interactionType,
            currentInteractionQuestId: currentQuestForInteraction,
            hasShownRelic: hasScroll // Track if player has shown the scroll
        };

        // Debug logging
        console.log(`[ExplorerDialogNpc ${this.config.id}] Interaction setup - Prompt: "${interactionPrompt}", Options: [${displayOptions.join(', ')}], Entity exists: ${!!this.entity}, Prompt length: ${interactionPrompt.length}`);

        // Create NPC Dialog Bubble (only if there's something to show)
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
                    console.error(`[ExplorerDialogNpc ${this.config.id}] Error loading dialog UI for ${player.id}:`, error);
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
                    console.error(`[ExplorerDialogNpc ${this.config.id}] Error loading options UI:`, error);
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
        const playerUI = this.interactingPlayers.get(player.id) as ExplorerPlayerInteractionUI | undefined;
        const state = this.stateManager.getState(player);
        const questManager = GameManager.instance?.questManager;
        const inventoryManager = this.stateManager.getInventoryManager();

        if (!playerUI) {
            console.warn(`[ExplorerDialogNpc ${this.config.id}] No playerUI found for player ${player.id}.`);
            return;
        }
        if (!state) {
            console.warn(`[ExplorerDialogNpc ${this.config.id}] No state found for player ${player.id}.`);
            return;
        }
        if (!questManager) {
            console.warn(`[ExplorerDialogNpc ${this.config.id}] No questManager found.`);
            return;
        }
        // inventoryManager is only needed for certain options, so we'll check it when needed


        let npcResponseText = playerUI.currentFallbackResponse || "The ancient mysteries endure...";
        let endInteraction = true;
        let newOptions: string[] | null = null;

        if (playerUI.currentInteractionType === 'lionfish_available') {
            // Handle lionfish quest offer
            switch (option) {
                case 0: // "I'll help"
                    const assigned = questManager.assignQuest(player, ExplorerDialogNpc.LIONFISH_QUEST_ID);
                    if (assigned) {
                        npcResponseText = "Excellent! Try using scarab bait - they work great in the dig site waters.";
                    } else {
                        npcResponseText = "Something went wrong. Please try again.";
                    }
                    endInteraction = false;
                    break;
                case 1: // "What's a lionfish?"
                    npcResponseText = "A venomous fish found in these waters. The scarabs from the leaves make excellent bait for them.";
                    newOptions = ["I'll help", "Maybe later"];
                    endInteraction = false;
                    break;
                default:
                    npcResponseText = "Come back when you're ready to help.";
                    break;
            }
        } else if (playerUI.currentInteractionType === 'lionfish_active') {
            // Quest active - just acknowledge
            npcResponseText = "Keep trying! Break leaves to find scarabs, then use them as bait.";
            endInteraction = false;
        } else if (playerUI.currentInteractionType === 'lionfish_turnin') {
            // Quest ready to turn in
            if (option === 0) { // "Turn in quest"
                const completed = questManager.completeQuest(player, ExplorerDialogNpc.LIONFISH_QUEST_ID, false);
                if (completed) {
                    npcResponseText = "Perfect! Here's your reward - an ivory rod. It should help you catch special driftwood in these waters.";
                } else {
                    npcResponseText = "Something went wrong. Please try again.";
                }
                endInteraction = false;
            } else {
                npcResponseText = "Come back when you're ready to turn in the quest.";
                endInteraction = false;
            }
        } else if (playerUI.currentInteractionType === 'gated') {
            // Handle gated state options
            switch (option) {
                case 0: // "What are these ruins?"
                    npcResponseText = "These are ancient structures built by a lost civilization. Not much is known about them, which is why im out here excavating them.  I feel like im getting closer to the truth, but i need to find more clues.";
                    endInteraction = false;
                    break;
                case 1: // "I'll come back later"
                    npcResponseText = "Good fishing out there!";
                    break;
                default:
                    npcResponseText = "Good fishing out there!";
                    break;
            }
        } else if (playerUI.currentInteractionType === 'scroll_first_show') {
            // First time showing the scroll
            if (option === 0) { // "Is this old scroll related?"
                npcResponseText = "An ancient scroll! Interesting, the markings on the scroll match those on the pyramid... This appears to be one of three clues mentioned in the scroll - the one about the magnetic field and forge! You'll need to retrieve the shard using a forged instrument that will break the magnetic field. Try fishing the pool with such an item!";
                this.markScrollShownToExplorer(player);
                
                // Complete the first objective of the scroll delivery quest if it's active
                // (showing scroll to Explorer) - but keep the quest active
                const scrollDeliveryQuest = state.quests.active[ExplorerDialogNpc.SCROLL_DELIVERY_QUEST_ID];
                if (scrollDeliveryQuest && questManager) {
                    // Complete objective 0 (show scroll to Explorer) instead of completing entire quest
                    if (questManager.completeQuestObjective(player, ExplorerDialogNpc.SCROLL_DELIVERY_QUEST_ID, 'show_scroll_to_explorer')) {
                    }
                }
                
                // Assign the riddle quest
                if (questManager && questManager.isQuestAvailable(player, ExplorerDialogNpc.RIDDLE_QUEST_ID)) {
                    const assigned = questManager.assignQuest(player, ExplorerDialogNpc.RIDDLE_QUEST_ID);
                    if (assigned) {
                    }
                }
            }
        } else if (playerUI.currentInteractionType === 'initial_greeting') {
            const hasScroll = this.hasAncientScroll(player);
            
            if (hasScroll) {
                // This shouldn't happen if scroll_first_show logic is working, but keep as fallback
                // Player has the scroll - handle scroll decoding dialogue
                switch (option) {
                    case 0: // "I'll help you find the fragments"
                        playerUI.currentInteractionType = 'fragments_available';
                        playerUI.currentInteractionQuestId = ExplorerDialogNpc.FRAGMENTS_QUEST_ID;
                        npcResponseText = "Excellent! The scroll shows three ancient pools where the fragments are hidden. Use a magnet (forge one with the Toolmaster if needed) to fish up the treasure chests containing the fragments. Once we have all three, I can assemble the Ancient Magnet!";
                        newOptions = ["I'll start searching", "Tell me more about the pools", "What happens when we find them all?"];
                        endInteraction = false;
                        break;
                    case 1: // "Tell me more about the pools"
                        npcResponseText = "The ancient pools are scattered across the islands, marked by special stone structures. According to the scroll, each pool contains a treasure chest with a magnetic fragment. Use a magnet while fishing in these pools to discover them. Forge a magnet at the Toolmaster if you don't have one.";
                        newOptions = ["I'll start searching", "What happens when we find them all?", "I'll come back later"];
                        endInteraction = false;
                        break;
                    case 2: // "What happens when we find them all?"
                        npcResponseText = "Once all three fragments are assembled, the Ancient Magnet will be complete! It will break the magnetic lock on the chest I found in the pyramid. But the scroll shows the chest can only be opened at sunset, at the pyramid itself. And you'll need a rod with at least 300lb capacity to pull it from the magnetic field. Will you help me find the fragments?";
                        newOptions = ["I'll help you find the fragments", "Tell me more about the pools", "Not right now"];
                        endInteraction = false;
                        playerUI.currentInteractionType = 'fragments_available';
                        playerUI.currentInteractionQuestId = ExplorerDialogNpc.FRAGMENTS_QUEST_ID;
                        break;
                    default:
                        break;
                }
            } else {
                // Player doesn't have scroll yet
                switch (option) {
                    case 0: // "I have this scroll"
                        if (this.hasAncientScroll(player)) {
                            // Player just got it or has it - show first time scroll dialogue
                            const hasShownScroll = this.hasShownScrollToExplorer(player);
                            if (!hasShownScroll) {
                                // First time showing
                                npcResponseText = "An ancient scroll! Interesting, the markings on the scroll match those on the pyramid... This appears to be one of three clues mentioned in the scroll - the one about the magnetic field and forge! You'll need to retrieve the shard using a forged instrument that will break the magnetic field. Try fishing the pool with such an item!";
                                this.markScrollShownToExplorer(player);
                                
                                // Complete the scroll delivery quest if it's active
                                const scrollDeliveryQuest = state.quests.active[ExplorerDialogNpc.SCROLL_DELIVERY_QUEST_ID];
                                if (scrollDeliveryQuest && questManager) {
                                    // Complete the delivery quest (skip turn-in since we're handling it here)
                                    if (questManager.completeQuest(player, ExplorerDialogNpc.SCROLL_DELIVERY_QUEST_ID, true)) {
                                    }
                                }
                                
                                // Assign the riddle quest
                                if (questManager && questManager.isQuestAvailable(player, ExplorerDialogNpc.RIDDLE_QUEST_ID)) {
                                    const assigned = questManager.assignQuest(player, ExplorerDialogNpc.RIDDLE_QUEST_ID);
                                    if (assigned) {
                                    }
                                }
                            } else {
                                // Already shown before - just give hint
                                npcResponseText = "We need to try fishing the pool with an item that will break the magnetic field! The scroll's forge clue suggests you'll need a forged instrument to retrieve what's hidden there.";
                            }
                        } else {
                            npcResponseText = "I don't see a scroll in your inventory. Fitz should have given you one after completing his jobs. Come back when you have it!";
                            endInteraction = false;
                        }
                        break;
                    case 1: // "Tell me more about these ruins"
                        npcResponseText = "These ruins were built by a legendary cartographer centuries ago. He left behind clues to incredible treasures hidden in the waters. The pyramid here holds a chest locked by an ancient magnetic force. *looks at you* Have you found anything interesting?";
                        newOptions = ["I have this scroll", "What are you looking for?", "I'll come back later"];
                        endInteraction = false;
                        break;
                    case 2: // "What are you looking for?"
                        npcResponseText = "I'm trying to unlock a treasure chest I found in the pyramid - but it's held down by an ancient magnetic force. I need to figure out how to break that lock. Have you found anything that might help?";
                        newOptions = ["I have this scroll", "Tell me more about these ruins", "I'll come back later"];
                        endInteraction = false;
                        break;
                    default:
                        break;
                }
            }
        } else if (playerUI.currentInteractionType === 'fragments_active') {
            // Player is still working on quest - provide hints based on which quest
            const riddleQuestActive = state.quests.active[ExplorerDialogNpc.RIDDLE_QUEST_ID];
            const fragmentsQuestActive = state.quests.active[ExplorerDialogNpc.FRAGMENTS_QUEST_ID];
            
            if (riddleQuestActive) {
                // Legacy quest active - just give hint
                if (option === 0) {
                    // "I'll keep trying" or "I'll try that"
                    npcResponseText = "We need to try fishing the pool with an item that will break the magnetic field! The scroll's forge clue suggests you'll need a forged instrument to retrieve what's hidden there.";
                }
            } else if (fragmentsQuestActive) {
                // Fragments quest active (old system)
                npcResponseText = `Keep exploring! Come back when you have all three pieces. You currently have ${this.getFragmentCount(player)} of 3. The scroll shows three ancient pools where the fragments are hidden - use a magnet (forge one with the Toolmaster if needed) to search for them.`;
            } else {
                // Just acknowledge - no quest assignment
                if (option === 0) { // "I'll try that"
                    npcResponseText = "Good luck! The pool awaits those with the right instrument.";
                }
            }
        } else if (playerUI.currentInteractionType === 'fragments_turnin') {
            // Check which quest is being turned in
            const riddleQuestActive = state.quests.active[ExplorerDialogNpc.RIDDLE_QUEST_ID];
            const fragmentsQuestActive = state.quests.active[ExplorerDialogNpc.FRAGMENTS_QUEST_ID];
            
            if (riddleQuestActive && riddleQuestActive.requiresTurnIn) {
                // Riddle quest turn-in
                if (option === 0) { // "Turn in quest"
                    if (questManager.completeQuest(player, ExplorerDialogNpc.RIDDLE_QUEST_ID)) {
                        // Send achievement popup
                        setTimeout(() => {
                            const messageManager = GameManager.instance?.messageManager;
                            if (messageManager) {
                                messageManager.sendRichGameMessage('Quest Complete!', player, {
                                    bonus: 'Riddle solved!',
                                    rarity: 'epic',
                                    duration: 5000
                                });
                            }
                        }, 500);
                        
                        npcResponseText = "Magnificent! You've solved the riddle and retrieved the chest! The ancient cartographer's secrets are yours. As per our partnership, here's your rightful share of the legendary treasures - including the cartographer's own loot rod!";
                    } else {
                        npcResponseText = "Something went wrong completing the quest. Please try again.";
                    }
                } else { // "Not yet"
                    npcResponseText = "Take your time. Come back when you're ready to turn it in.";
                }
            } else if (fragmentsQuestActive && fragmentsQuestActive.requiresTurnIn) {
                // Fragments quest turn-in (old system)
                if (option === 0) { // "Assemble the magnet"
                    if (!inventoryManager) {
                        console.error(`[ExplorerDialogNpc ${this.config.id}] inventoryManager not available for fragments_turnin.`);
                        npcResponseText = "Something went wrong. Please try again.";
                        endInteraction = false;
                    } else {
                        // Verify player still has all 3 fragments
                        const fragmentCount = this.getFragmentCount(player);
                        if (fragmentCount < 3) {
                            npcResponseText = `You need all three fragments! You currently have ${fragmentCount} of 3.`;
                            endInteraction = false;
                        } else {
                            // Double-check quest is still active and ready for turn-in
                            const activeQuest = state.quests.active[ExplorerDialogNpc.FRAGMENTS_QUEST_ID];
                            if (!activeQuest || activeQuest.status !== 'active' || !activeQuest.requiresTurnIn) {
                                console.warn(`[ExplorerDialogNpc ${this.config.id}] Quest ${ExplorerDialogNpc.FRAGMENTS_QUEST_ID} is not ready for turn-in. State:`, activeQuest);
                                npcResponseText = "The quest is not ready for turn-in. Please try again.";
                                endInteraction = false;
                            } else {
                                // Remove all 3 fragments (now stackable as ancient_fragment)
                                const fragmentsRemoved = inventoryManager.removeItem(player, 'ancient_fragment', 3);
                                if (!fragmentsRemoved) {
                                    console.error(`[ExplorerDialogNpc ${this.config.id}] Failed to remove fragments from player ${player.id}`);
                                    npcResponseText = "Something went wrong removing the fragments. Please try again.";
                                    endInteraction = false;
                                } else {
                                    
                                    // Complete the quest (this will grant the ancient_magnet reward via grantRewards)
                                    // Note: We manually removed fragments above because removeQuestItemsFromInventory 
                                    // only handles catchFish objectives, not collectItems
                                    if (questManager.completeQuest(player, ExplorerDialogNpc.FRAGMENTS_QUEST_ID)) {
                                        npcResponseText = "*Assembling the fragments* Remarkable! The Ancient Magnet is complete! Now the ultimate treasure location is revealed - the great pyramid at sunset. You'll need a rod with at least 300lb capacity to retrieve it.";
                                    } else {
                                        console.error(`[ExplorerDialogNpc ${this.config.id}] Failed to complete quest for player ${player.id}`);
                                        // If quest completion failed, try to restore fragments
                                        const fragmentItem = ItemFactory.createInventoryItemFromLootId('ancient_fragment', 3);
                                        if (fragmentItem) {
                                            inventoryManager.addItem(player, fragmentItem);
                                        }
                                        npcResponseText = "Something went wrong completing the quest. Your fragments have been restored. Please try again.";
                                        endInteraction = false;
                                    }
                                }
                            }
                        }
                    }
                } else { // "Not yet"
                    npcResponseText = "Take your time. Come back when you're ready to assemble the magnet.";
                }
            }
        } else if (playerUI.currentInteractionType === 'ultimate_complete') {
            switch (option) {
                case 0: // "Tell me about the other shards"
                    npcResponseText = "The scroll mentions three tests: Forge, Mind, and Strength. You've completed the Forge test. Seek out others who might know about the Mind and Strength tests - they each guard a relic shard.";
                    endInteraction = false;
                    break;
                case 1: // "I'll keep exploring"
                    npcResponseText = "Good luck! The islands hold many secrets waiting to be discovered.";
                    break;
                default:
                    break;
            }
        }

        // Update dialogue bubble
        if (playerUI.dialog) {
            try {
                playerUI.dialog.setState({ text: npcResponseText });
            } catch (e) {
                console.error(`[ExplorerDialogNpc ${this.config.id}] Error updating dialog:`, e);
            }
        }

        // Update options if new ones are provided
        if (newOptions && newOptions.length > 0) {
            if (this.stateManager.isMobile(player)) {
                player.ui.sendData({
                    type: 'showMobileNpcOptions',
                    options: newOptions
                });
            } else if (playerUI.options) {
                try {
                    playerUI.options.setState({ options: newOptions });
                } catch (e) {
                    console.error(`[ExplorerDialogNpc ${this.config.id}] Error updating options:`, e);
                }
            }
        }

        // Hide options if interaction ends
        if (endInteraction && playerUI.options) {
            try { playerUI.options.unload(); } catch (e) {}
            playerUI.options = undefined;
        }

        // Cleanup handling
        if (endInteraction) {
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }
}

