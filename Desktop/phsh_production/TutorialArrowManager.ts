// TutorialArrowManager.ts
// Manages tutorial arrows for player onboarding
import { Player, World } from 'hytopia';
import { PlayerStateManager } from './PlayerStateManager';
import { CurrencyManager } from './CurrencyManager';
import { InventoryManager } from './Inventory/InventoryManager';
import GameManager from './GameManager';
import { NpcManager } from './npcs/NpcManager';

export type ArrowTarget = 'greeter' | 'fitz' | 'fishmonger' | 'dock' | null;

export class TutorialArrowManager {
    private arrowStates: Map<string, ArrowTarget> = new Map(); // playerId -> current arrow target
    private world: World;
    private stateManager: PlayerStateManager;
    private currencyManager: CurrencyManager;
    private inventoryManager: InventoryManager;

    constructor(
        world: World,
        stateManager: PlayerStateManager,
        currencyManager: CurrencyManager,
        inventoryManager: InventoryManager
    ) {
        this.world = world;
        this.stateManager = stateManager;
        this.currencyManager = currencyManager;
        this.inventoryManager = inventoryManager;
    }

    /**
     * Gets entity ID for an NPC by its layout ID
     */
    private getNpcEntityId(npcId: string): number | null {
        const npcManager = GameManager.instance?.npcManager;
        if (!npcManager) {
            return null;
        }

        const npc = npcManager.getNpcById(npcId);
        if (!npc || !npc.entity) {
            // NPC doesn't exist - shouldn't happen if spawned before players join
            return null;
        }
        
        // Try to get entity ID - don't check isSpawned since entities exist before players join
        // If entity ID isn't available yet, we'll fall back to name lookup on client
        let entityId = (npc.entity as any).id;
        if (!entityId) {
            // Try alternative property names
            entityId = (npc.entity as any)._id;
            if (!entityId) {
                entityId = (npc.entity as any).entityId;
            }
        }
        
        if (entityId) {
            console.log(`[TutorialArrowManager] Found entity ID ${entityId} for NPC ${npcId}`);
        }
        
        return entityId || null; // Return null if ID not available - client will use name lookup
    }

    /**
     * Checks if player should see arrows and updates them accordingly
     * Called on player spawn and quest progress updates
     */
    public updateArrowsForPlayer(player: Player): void {
        const state = this.stateManager.getState(player);
        if (!state) {
            // State not initialized yet - this can happen if called before setupInitialState completes
            // This is fine, arrows will be updated when state is ready
            return;
        }

        // CRITICAL: Use quest completion state as PRIMARY indicator (quest data loads correctly)
        // Rod count is unreliable because inventory might not be loaded yet
        const fitzQuestIds = ['fitz_quest_getting_started', 'fitz_quest_1_sardines', 'fitz_quest_2_kelp_eel', 'fitz_quest_3_big_grouper'];
        const hasCompletedFitzQuests = fitzQuestIds.some(questId => state.quests.completed[questId]);
        
        // Secondary checks (use quest state as primary)
        const hasRod = this.inventoryManager.getInventory(player)?.items.some(item => item.type === 'rod') || false;
        const hasEarnedMoney = this.currencyManager.getCoins(player) > 0;
        const gettingStartedQuestActive = state.quests.active['fitz_quest_getting_started'];
        const gettingStartedQuestCompleted = state.quests.completed['fitz_quest_getting_started'];

        // If player has completed fitz quests, hide arrows (they're past the tutorial phase)
        // Use quest completion as primary check, money as secondary
        if (hasCompletedFitzQuests || (hasEarnedMoney && !gettingStartedQuestActive)) {
            this.hideArrows(player);
            return;
        }

        // If getting started quest is active, check progress
        if (gettingStartedQuestActive && !gettingStartedQuestCompleted) {
            const questManager = GameManager.instance?.questManager;
            if (questManager) {
                const questDef = questManager.getQuestDefinition('fitz_quest_getting_started');
                const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                
                // Objective 0: Gather 3 worms
                const wormsProgress = questProgress[0] || 0;
                const wormsRequired = questDef?.objectives[0]?.count || 3;
                const wormsComplete = wormsProgress >= wormsRequired;
                
                // Objective 1: Catch 1 Mackerel
                // CRITICAL: Check inventory directly, not quest progress state
                // Quest progress updates immediately when fish is hooked, but we need to wait until it's in inventory
                const catchRequired = questDef?.objectives[1]?.count || 1;
                const inventory = this.inventoryManager.getInventory(player);
                const mackerelInInventory = inventory?.items.some(item => 
                    item.type === 'fish' && item.name === 'Mackerel'
                ) || false;
                const catchComplete = mackerelInInventory; // Only true if fish is actually in inventory
                
                // Objective 2: Sell 1 Mackerel
                const sellProgress = questProgress[2] || 0;
                const sellRequired = questDef?.objectives[2]?.count || 1;
                const sellComplete = sellProgress >= sellRequired;

                // Cadence logic:
                // 1. 3 worms, no mackerel caught → Arrow to Greeter (need to show worms, Greeter will tell them to go to dock)
                // 2. After talking to Greeter about worms → Arrow to dock (handled in dialog after player confirms)
                // 3. 1 mackerel caught → Arrow to Greeter (need to talk to Greeter)
                // 4. After talking to Greeter about mackerel → Arrow to fishmonger (handled in dialog)
                // 5. After selling → Arrow to Greeter (for reward)

                if (sellComplete) {
                    // Mackerel sold - point to Greeter for final reward/acknowledgment
                    this.showArrowToGreeter(player);
                } else if (catchComplete && !sellComplete) {
                    // Mackerel caught but not sold - point to Greeter (they'll direct to fishmonger after player talks to them)
                    this.showArrowToGreeter(player);
                } else if (wormsComplete && !catchComplete) {
                    // Worms complete but no mackerel caught yet - point to Greeter first (they'll tell them to go to dock)
                    // Note: After player talks to Greeter, the dialog will update arrows to point to dock
                    this.showArrowToGreeter(player);
                } else if (wormsProgress >= 3) {
                    // Exactly 3 worms - show arrow to Greeter
                    this.showArrowToGreeter(player);
                } else {
                    // Less than 3 worms - hide arrows (player knows to dig)
                    this.hideArrows(player);
                }
            }
            return;
        }

        // CRITICAL: Use quest completion state as primary check, not rod count
        // If player hasn't completed getting started quest and hasn't completed any fitz quests, show arrow to Greeter
        if (!gettingStartedQuestCompleted && !hasCompletedFitzQuests) {
            // Additional check: if they have no rod, definitely show arrow
            // If they have rod but no money and quest not active, also show arrow (they need onboarding)
            if (!hasRod || (!hasEarnedMoney && !gettingStartedQuestActive)) {
                this.showArrowToGreeter(player);
                return;
            }
        }

        // Default: hide arrows
        this.hideArrows(player);
    }

    /**
     * Shows arrow pointing from player to Greeter
     */
    public showArrowToGreeter(player: Player): void {
        const currentTarget = this.arrowStates.get(player.id);
        if (currentTarget === 'greeter') {
            return; // Already showing
        }

        this.arrowStates.set(player.id, 'greeter');
        
        // Try to get entity ID - entities exist before players join, so this should work
        // If entity ID isn't available yet, client will use name lookup as fallback
        const greeterEntityId = this.getNpcEntityId('greeter');
        
        // Always send arrow with name (required for fallback) and entity ID (if available)
        // Entity name format: "NPC - {id} ({definitionId})"
        const arrowData: any = {
            type: 'showTutorialArrow',
            target: 'greeter',
            targetEntityName: 'NPC - greeter (welcome_npc)'
        };
        
        if (greeterEntityId !== null && greeterEntityId !== undefined) {
            arrowData.targetEntityId = greeterEntityId;
            console.log(`[TutorialArrowManager] Showing arrow to Greeter (entity ID: ${greeterEntityId}) for player ${player.id}`);
        } else {
            console.log(`[TutorialArrowManager] Showing arrow to Greeter (using name lookup) for player ${player.id}`);
        }
        
        player.ui.sendData(arrowData);
    }

    /**
     * Shows arrow pointing from player to Fitz
     */
    public showArrowToFitz(player: Player): void {
        const currentTarget = this.arrowStates.get(player.id);
        if (currentTarget === 'fitz') {
            return; // Already showing
        }

        this.arrowStates.set(player.id, 'fitz');
        
        // Try to get entity ID directly from server
        const fitzEntityId = this.getNpcEntityId('fitzwilliam');
        
        // Always send both entity ID (if available) and name (as fallback)
        // Entity name format: "NPC - {id} ({definitionId})"
        // For fitzwilliam with id "fitzwilliam", it's "NPC - fitzwilliam (fitzwilliam)"
        const arrowData: any = {
            type: 'showTutorialArrow',
            target: 'fitz',
            targetEntityName: 'NPC - fitzwilliam (fitzwilliam)'
        };
        
        if (fitzEntityId !== null && fitzEntityId !== undefined) {
            arrowData.targetEntityId = fitzEntityId;
            console.log(`[TutorialArrowManager] Showing arrow to Fitz (entity ID: ${fitzEntityId}) for player ${player.id}`);
        } else {
            console.log(`[TutorialArrowManager] Showing arrow to Fitz (using name lookup) for player ${player.id}`);
        }
        
        player.ui.sendData(arrowData);
    }

    /**
     * Shows arrow pointing from player to Fishmonger
     */
    public showArrowToFishmonger(player: Player): void {
        const currentTarget = this.arrowStates.get(player.id);
        if (currentTarget === 'fishmonger') {
            return; // Already showing
        }

        this.arrowStates.set(player.id, 'fishmonger');
        
        // Try to get entity ID directly from server
        const fishmongerEntityId = this.getNpcEntityId('fishmonger');
        
        // Always send both entity ID (if available) and name (as fallback)
        // Entity name format: "NPC - {id} ({definitionId})"
        // For fishmonger with id "fishmonger", it's "NPC - fishmonger (fishmonger)"
        const arrowData: any = {
            type: 'showTutorialArrow',
            target: 'fishmonger',
            targetEntityName: 'NPC - fishmonger (fishmonger)'
        };
        
        if (fishmongerEntityId !== null && fishmongerEntityId !== undefined) {
            arrowData.targetEntityId = fishmongerEntityId;
            console.log(`[TutorialArrowManager] Showing arrow to Fishmonger (entity ID: ${fishmongerEntityId}) for player ${player.id}`);
        } else {
            console.log(`[TutorialArrowManager] Showing arrow to Fishmonger (using name lookup) for player ${player.id}`);
        }
        
        player.ui.sendData(arrowData);
    }

    /**
     * Shows arrow pointing from player to Dock barrel marker
     */
    public showArrowToDock(player: Player): void {
        const currentTarget = this.arrowStates.get(player.id);
        if (currentTarget === 'dock') {
            return; // Already showing
        }

        this.arrowStates.set(player.id, 'dock');
        
        // Dock barrel marker entity name: "dock_fishing_marker" (static models use data.id as name)
        const arrowData: any = {
            type: 'showTutorialArrow',
            target: 'dock',
            targetEntityName: 'dock_fishing_marker'
        };
        
        console.log(`[TutorialArrowManager] Showing arrow to Dock barrel for player ${player.id}`);
        
        player.ui.sendData(arrowData);
    }

    /**
     * Hides all arrows for player
     */
    public hideArrows(player: Player): void {
        const currentTarget = this.arrowStates.get(player.id);
        if (currentTarget === null) {
            return; // Already hidden
        }

        this.arrowStates.set(player.id, null);
        player.ui.sendData({
            type: 'hideTutorialArrow'
        });
        console.log(`[TutorialArrowManager] Hiding arrows for player ${player.id}`);
    }

    /**
     * Cleanup when player leaves
     */
    public cleanup(player: Player): void {
        this.hideArrows(player);
        this.arrowStates.delete(player.id);
    }
}

