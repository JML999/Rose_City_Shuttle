import { Player, PlayerEntity, Vector3, PlayerUIEvent, EntityEvent, type PlayerInput, DefaultPlayerEntity, RigidBodyType, Quaternion, type Vector3Like } from 'hytopia';
import { InventoryManager } from './Inventory/InventoryManager';
import { PlayerStateManager } from './PlayerStateManager';
import { TutorialArrowManager } from './TutorialArrowManager';
import { FishingMiniGame } from './Fishing/FishingMiniGame';
import { BaitBlockManager } from './Bait/BaitBlockManager';
import type { DefaultPlayerEntityController, PlayerUI, World } from 'hytopia';
import type { LevelingSystem } from './LevelingSystem';
import { CurrencyManager } from './CurrencyManager';
// Removed: import mapData from './assets/terrain.json' - now using world.chunkLattice instead
import type { InventoryItem } from './Inventory/Inventory';
import { CRAFTING_RECIPES } from './Crafting/CraftingRecipes';
import type { CraftingManager } from './Crafting/CraftingManager';
import { LeaderboardManager } from './LeaderboardManager';
import BoatEntity from './Inventory/BoatEntity';
import type { NpcManager } from './npcs/NpcManager';
import { ITEM_CATALOG } from './Crafting/ItemCatalog';
import GameManager from './GameManager';
import { ItemFactory } from './Inventory/ItemFactory';
import { Entity } from 'hytopia';
import { SimpleEntityController } from 'hytopia';
import { ChestManager } from './Inventory/ChestManager';
import { OreManager } from './Inventory/OreManager';
import { BAIT_CATALOG } from './Bait/BaitCatalog';
import { LOOT_CATALOG } from './Fishing/LootCatalog';
import { MyPlayerController } from './MyPlayerController';
import GameRegion from './GameRegion';


// Define the map data type
interface MapData {
    blocks: Record<string, number>;
    [key: string]: any;
}

interface InputState {
    ml?: boolean;
    mr?: boolean;
    sp?: boolean;
}

export class GamePlayerEntity extends DefaultPlayerEntity {
    private readonly PLAYER_EYE_HEIGHT = 0.1;
    public inventoryManager: InventoryManager;
    public stateManager: PlayerStateManager;
    private fishingMiniGame: FishingMiniGame;
    private baitBlockManager: BaitBlockManager;
    private currencyManager: CurrencyManager;
    private craftingManager: CraftingManager;
    private npcManager: NpcManager;
    private chestManager: ChestManager;
    private oreManager: OreManager;
    public arrowManager: TutorialArrowManager;
    
    // State properties
    public isFishing: boolean = false;
    public isBoating: boolean = false;
    public isWeighing: boolean = false; // Track if player is in weighing ceremony
    public currentBoat: BoatEntity | null = null;
    private lastInputState: InputState = {};
    public jumping: boolean = false;
    private maxBreath: number = 100; // Max breath points (100 = 100%)
    private currentBreath: number = 100; // Start at full breath
    private breathDrainRate: number = 6.25; // Points per second (100/16 = 6.25 for 16 second survival - 33% longer than 12 seconds)
    private breathRechargeRate: number = 25; // Points per second (recharge faster than drain)
    private isDrowning: boolean = false;
    private drowningDamageRate: number = 20; // Damage per second when drowning
    public isDead: boolean = false; // Track if player is dead to prevent multiple death handlers

    // Added mobile detection property
    private isMobile: boolean = false;

    // --- TESTING: Allow manual override of breath for tuning swim time ---
    public testBreath: number | null = null; // Set this to override breath for testing

    constructor(player: Player, world: World, levelingSystem: LevelingSystem, stateManager: PlayerStateManager, inventoryManager: InventoryManager, fishingMiniGame: FishingMiniGame, npcManager: NpcManager, baitBlockManager: BaitBlockManager, currencyManager: CurrencyManager, craftingManager: CraftingManager, myController: MyPlayerController) {
        super({
            player,
            name: "Player",
            modelUri: "models/players/player.gltf",
            modelScale: 1,
            modelLoopedAnimations: ["idle"],
            controller: myController
        });

        // Initialize managers
        this.inventoryManager = inventoryManager;
        this.stateManager = stateManager;
        this.fishingMiniGame = fishingMiniGame;
        this.baitBlockManager = baitBlockManager;
        this.currencyManager = currencyManager;
        this.craftingManager = craftingManager;
        this.npcManager = npcManager;
        
        // Initialize ChestManager with dependencies
        this.chestManager = new ChestManager(stateManager, world, inventoryManager);
        // Initialize OreManager with dependencies
        this.oreManager = new OreManager(stateManager, world, inventoryManager);
        // Initialize TutorialArrowManager
        this.arrowManager = new TutorialArrowManager(world, stateManager, currencyManager, inventoryManager);
        // Setup initial state synchronously (like Frontiers)
        try {
            this.setupInitialState();
        } catch (error) {
            console.error(`[GamePlayerEntity] Error in setupInitialState for player ${player.id}:`, error);
        }
        this.setupUIHandlers();
        this.on(EntityEvent.TICK, this.handleTickInput);
        
        // CRITICAL: Always reload UI when creating a new GamePlayerEntity (e.g., when switching regions)
        // This ensures the UI is properly initialized in the new region
        // The UI will send a 'uiReady' event when it's loaded, which will trigger updateAllUI
        player.ui.load("ui/index.html");
    }
    
    private setupInitialState(): void {
        // CRITICAL: Initialize currency FIRST (before loading persisted data)
        // This ensures currency exists, but persisted data will overwrite it if present
        this.currencyManager.initializePlayer(this.player);
        
        // CRITICAL: Initialize player state SECOND (this loads persisted data)
        // This will restore inventory, coins, level, quests, etc. from persisted data
        // Made synchronous like Frontiers - load() is synchronous
        this.stateManager.initializePlayer(this.player);
        
        // CRITICAL FIX: Only initialize inventory if it doesn't exist at all
        // If inventory exists (even if empty), it means persisted data was loaded
        // Don't check if items.length === 0, as that would overwrite legitimately empty inventories
        // Check state.inventory instead of inventoryManager.getInventory() since inventory now lives in state
        const state = this.stateManager.getState(this.player);
        if (!state || !state.inventory) {
            // No inventory at all - this means loadInventory was never called (new player)
            console.log(`[SETUP] No inventory found for player ${this.player.id} - initializing empty inventory for new player`);
            this.inventoryManager.initializePlayerInventory(this.player);
        } else {
            // Inventory exists (even if empty) - this means persisted data was loaded
            // Don't re-initialize, as it would overwrite the loaded data
            console.log(`[SETUP] Inventory exists for player ${this.player.id} (${state.inventory.items?.length || 0} items) - data was loaded, skipping initialization`);
        }

        this.sendInventoryUIUpdate(this.player);
        
        // Initialize breath meter
        this.currentBreath = this.maxBreath;
        this.isDrowning = false;
        this.player.ui.sendData({
            type: 'breathUpdate',
            percentage: 100
        });
        
        // Don't update arrows here - wait for uiReady event
        // The client needs to be fully initialized before arrows can be shown
        // Arrows will be updated in the uiReady handler
    }

    private setupUIHandlers() {
        // Remove existing listener to prevent duplicates (Frontiers pattern)
        this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
        // Add new listener
        this.player.ui.on(PlayerUIEvent.DATA, this._onPlayerUIData);
    }
    
    // Store handler as method reference for off()/on() pattern (Frontiers pattern)
    private _onPlayerUIData = ({ playerUI, data }: { playerUI: any, data: Record<string, any> }): void => {
        this.handleUIEvent(this.player, data);
    }

    private handleTickInput = () => {
        if (!this.world || !this.player?.input) return; 

        const input = this.player.input as PlayerInput;
        const state = this.stateManager.getState(this.player);

        // --- BREATH SYSTEM: Note - breath is now handled in MyPlayerController.tick() ---
        // This ensures proper water detection and jump penalty handling

        if (state?.npcInteraction?.currentNpcId) {
            const npcId = state.npcInteraction.currentNpcId;
            let optionIndex = -1;

            if (input['1']) {
                optionIndex = 0;
                input['1'] = false;
            } else if (input['2']) {
                optionIndex = 1;
                input['2'] = false;
            } else if (input['3']) {
                optionIndex = 2;
                input['3'] = false;
            }

            if (optionIndex !== -1) {
                this.npcManager.handleNpcOption(this.player, npcId, optionIndex);
            }
        }
    }

    // State Management Methods
    public handleFishing() {
        this.isFishing = true;
        this.fishingMiniGame.onCastStart(this.player);
    }

    public stopFishing() {
        this.isFishing = false;
    }

    public setFishingTick(){
        this.fishingMiniGame.onTick(this.player);
    }

    public handleBlockHit(blockId: string, hitPoint: Vector3, player: Player) {
        this.baitBlockManager.handleBlockHit(blockId, hitPoint, player);
    }

    /**
     * Join a different region (world switching).
     * Saves current region spawn data and switches the player to the new world.
     */
    public joinRegion(region: GameRegion, facingAngle: number, spawnPoint: Vector3Like): void {
        // Save current region spawn data to state
        this.stateManager.setCurrentRegionId(this.player, region.id);
        this.stateManager.setCurrentRegionSpawnPoint(this.player, spawnPoint);
        this.stateManager.setCurrentRegionSpawnFacingAngle(this.player, facingAngle);
        
        // CRITICAL: Flush save before switching worlds to prevent stale region data
        this.stateManager.flushSave(this.player);
        
        // Switch to new world
        this.player.joinWorld(region.world);
    }

    // UI Event Handling
    private handleUIEvent(player: Player, data: Record<string, any>): void {
        // Only log non-routine UI events to reduce console spam
        const routineEvents = ['castUpdate', 'disablePlayerInput', 'enablePlayerInput'];

        switch (data.type) {
            case 'disablePlayerInput':
                player.ui.lockPointer(false);
                break;
            case 'enablePlayerInput':
                player.ui.lockPointer(true);
                break;
            case 'updateGameHeight':
                this.fishingMiniGame.updateUIHeight(data.height);
                break;
            case 'equipItem':
                if (data.itemId) {
                    this.handleEquipItem(player, data.itemId);
                }
                break;
            case 'equipBait':
                if (data.itemId) {
                    this.handleEquipItem(player, data.itemId);
                    this.inventoryManager.hookBait(player, data.itemId);
                }
                break;          
            case 'unequipItem':
                if (data.itemType) {
                    this.handleUnequipItem(player, data.itemType);
                }
                break;
            case 'purchaseRod':
                this.stateManager.buyRod(player, data.rodId);
                break;
            case 'purchaseBoat':
                this.stateManager.buyBoat(player);
                break;
            case 'spawnBoat':
                // Determine dock area based on which mariner the player interacted with
                // For now, default to spawn_dock (newer mariner location)
                // Could be enhanced to track which mariner was used
                const dockArea = 'spawn_dock';
                this.stateManager.equipBoatAtDock(player, dockArea);
                break;

            case 'useBait':
                this.inventoryManager.hookBait(player, data.itemId);
                break;
            case 'tutorialCompleted':
                player.ui.lockPointer(true);
                break;
            case 'requestHelp':
                this.showTutorial();
                break;
            case 'welcomeReady':
                this.setUpInventory();
                this.checkAndShowTutorial();
                break;
            case 'welcomeMobile':
                this.stateManager.setIsMobile(player, true);
                break;
            case 'respawnPlayer':
                this.respawn();
                break;
            case 'openCrafting':
                player.ui.lockPointer(false);
                break;
            
            case 'closeCrafting':
                player.ui.lockPointer(true);
                break;
            
            case 'requestCraftingRecipes':
                this.sendCraftingRecipesToClient(player);
                break;
                
            case 'requestBaitRecipes':
                this.sendBaitRecipesToClient(player);
                break;
                
            case 'craftItem':
                this.handleCraftItem(player, data.inputs);
                break;
                
            case 'craftBaitRecipe':
                this.handleCraftBaitRecipe(player, data);
                break;
                
            case 'craftToolmasterRod':
                this.handleCraftToolmasterRod(player, data);
                break;
            case 'craftToolmasterItem':
                this.handleCraftToolmasterItem(player, data);
                break;
                
            case 'uiReady':
                console.log(`[GamePlayerEntity] UI ready for player ${player.id} in region ${this.stateManager.getCurrentRegionId(player) || 'unknown'}`);
                
                // CRITICAL: Update all UI elements when UI is ready
                // This is especially important when switching regions, as the UI is reloaded
                const playerStateManager = this.stateManager;
                if (playerStateManager) {
                    console.log(`[GamePlayerEntity] Updating all UI for player ${player.id} on uiReady`);
                    playerStateManager.updateAllUI(player);
                }
                
                // Update quest tracker UI when client is ready
                if (GameManager.instance.questManager) {
                    GameManager.instance.questManager.onQuestDataRestored(player);
                }
                
                // Send initial time update now that UI is ready
                GameManager.instance.sendInitialTimeUpdate(player);
                
                // Update arrows when client confirms UI is ready
                // NPCs are spawned before players join, so we can update arrows immediately
                console.log(`[ARROWS] Updating arrows on uiReady for player ${player.id}`);
                this.arrowManager.updateArrowsForPlayer(player);
                break;

            case 'requestLeaderboard':
                const species = data.species; // Optional, specific species
                LeaderboardManager.instance.sendLeaderboardToPlayer(player, species);
                break;

            case 'dropItem':
                this.handleDropItem(player, data);
                break;

            case 'stellarAlignmentResult':
                this.handleStellarAlignmentResult(player, data);
                break;

            case 'tileMemoryResult':
                this.handleTileMemoryResult(player, data);
                break;

            case 'castConfirm':
                const fishingState = this.stateManager.getState(player);
                if (fishingState && fishingState.fishing) {
                    fishingState.fishing.castPower = Math.min(100, data.power); // Cap at 100%
                    fishingState.fishing.isCasting = false;
                    this.fishingMiniGame.onCastEnd(player);
                }
                break;
            case 'castUpdate':
                const fishState = this.stateManager.getState(player);
                if (fishState && fishState.fishing) {
                    fishState.fishing.castPower = Math.min(100, data.power); // Cap at 100%
                }
                break;
            case 'openChest':
                if (data.chestId) {
                    this.handleOpenChest(player, data.chestId);
                }
                break;
            case 'openOre':
                if (data.oreId) {
                    this.handleOpenOre(player, data.oreId);
                }
                break;
            case 'triggerWheelSpin':
                // Handle wheel spin request from fish weighing panel
                if (data.fishValue && data.playerId === player.id) {
                    this.npcManager.triggerWheelSpin(player, data);
                }
                break;
            case 'purchaseShrimp':
                // Handle shrimp purchase from ShrimpShopPanel
                if (data.shrimpQuantity && data.totalPrice && data.sets) {
                    const baitMaster = this.npcManager.getNpcById('bait_master');
                    if (baitMaster && typeof (baitMaster as any).handleShrimpPurchase === 'function') {
                        const success = (baitMaster as any).handleShrimpPurchase(player, data.shrimpQuantity, data.totalPrice, data.sets);
                    } else {
                        console.error(`[GamePlayerEntity] BaitMaster NPC not found or doesn't support shrimp purchases`);
                    }
                }
                break;
            case 'craftSaltBait':
                // Handle salt bait crafting from SaltBaitCraftingPanel
                if (data.quantity) {
                    const saltBaitCrafter = this.npcManager.getNpcById('salt_bait_crafter');
                    if (saltBaitCrafter && typeof (saltBaitCrafter as any).handleSaltBaitCraft === 'function') {
                        const success = (saltBaitCrafter as any).handleSaltBaitCraft(player, data.quantity);
                    } else {
                        console.error(`[GamePlayerEntity] SaltBaitCrafter NPC not found or doesn't support salt bait crafting`);
                    }
                }
                break;
            case 'purchaseRune':
                // Handle rune purchase from RuneShopPanel
                if (data.runeQuantity && data.totalPrice) {
                    const wizard = this.npcManager.getNpcById('wizard');
                    if (wizard && typeof (wizard as any).handleRunePurchase === 'function') {
                        const success = (wizard as any).handleRunePurchase(player, data.runeQuantity, data.totalPrice);
                    } else {
                        console.error(`[GamePlayerEntity] Wizard NPC not found or doesn't support rune purchases`);
                    }
                }
                break;
            case 'sellSelectedFish':
                // Handle selling selected fish from FishSellingPanel
                if (data.fishIds && Array.isArray(data.fishIds)) {
                    const fishmonger = this.npcManager.getNpcById('fishmonger');
                    if (fishmonger && typeof (fishmonger as any).handleSellSelectedFish === 'function') {
                        (fishmonger as any).handleSellSelectedFish(player, data.fishIds);
                    } else {
                        console.error(`[GamePlayerEntity] Fishmonger NPC not found or doesn't support selling selected fish`);
                    }
                }
                break;
            case 'zephyrRodClaimed':
                // Handle keystone rod claim from ZephyrRodRewardPanel
                const wizardNpc = this.npcManager.getNpcById('wizard');
                if (wizardNpc && typeof (wizardNpc as any).handleKeystoneRodClaim === 'function') {
                    (wizardNpc as any).handleKeystoneRodClaim(player);
                } else {
                    console.error(`[GamePlayerEntity] Wizard NPC not found or doesn't support keystone rod claims`);
                }
                break;
            case 'abortFishing':
                // Handle fishing abort request from mobile UI when movement is detected
                this.abortFishing(player);
                break;
        }
    }

    // Add mobile tutorial method
    private showMobileTutorial() {
        this.player.ui.sendData({
            type: 'showMobileTutorial'
        });
    }

    /**
     * Checks if player is brand new (has never earned money, completed quests, or owned a rod)
     * Brand new players should NOT get a rod automatically - they need to complete the worms quest first
     */
    private isBrandNewPlayer(): boolean {
        const state = this.stateManager.getState(this.player);
        if (!state) return true; // If no state, treat as new player
        
        // Check if player has completed any quests
        const hasCompletedQuests = Object.keys(state.quests.completed || {}).length > 0;
        if (hasCompletedQuests) return false;
        
        // Check if player has earned any coins
        const coins = this.currencyManager.getCoins(this.player);
        if (coins > 0) return false;
        
        // Check if player has any rod in inventory
        const inventory = this.inventoryManager.getInventory(this.player);
        if (inventory) {
            const hasRod = inventory.items.some(item => item.type === 'rod');
            if (hasRod) return false;
        }
        
        // Player is brand new if all checks pass
        return true;
    }

    private setUpInventory(){
        // All players (new and returning): Ensure beginner rod exists and is equipped
        // 1. Ensure beginner rod exists
        if (!this.inventoryManager.hasItem(this.player, 'beginner-rod')) {
            this.inventoryManager.addRodById(this.player, 'beginner-rod');
        }
        
        // Force equip beginner rod (unequip any other rods first)
        // Use helper method instead of direct state manipulation
        this.inventoryManager.unequipAllRods(this.player);
        this.inventoryManager.equipItem(this.player, 'beginner-rod');

        // Ensure NO bait is equipped (for both new and returning players)
        // Use helper method instead of direct state manipulation
        this.inventoryManager.unequipAllBait(this.player);

        this.sendInventoryUIUpdate(this.player);
    }

    private handleEquipItem(player: Player, itemId: string): void {
        if (this.isFishing) {
            this.fishingMiniGame.abortFishing(player);
            this.isFishing = false;  // Update local state after abort
        }
        this.inventoryManager.equipItem(player, itemId);
        this.sendInventoryUIUpdate(player);
    }

    private handleUnequipItem(player: Player, itemType: string): void {
        if (this.isFishing) {
            this.fishingMiniGame.abortFishing(player);
            this.isFishing = false;  // Update local state after abort
        }
        this.inventoryManager.unequipItem(player, itemType);
        this.sendInventoryUIUpdate(player);
    }

    private handleStellarAlignmentResult(player: Player, data: Record<string, any>): void {
        if (data.success) {
            // Complete quest objective
            const questManager = GameManager.instance?.questManager;
            if (questManager && data.questId) {
                questManager.completeQuestObjective(player, data.questId, 'complete_stellar_alignment');
            }
            
            // Note: Quest completion and relic shard display will be handled by QuestManager
            // when the quest auto-completes after all objectives are done
        } else {
            // Show failure message
            const messageManager = GameManager.instance?.messageManager;
            if (messageManager) {
                messageManager.sendRichGameMessage('Pattern Faded', player, {
                    bonus: 'Return tomorrow night to try again.',
                    rarity: 'common',
                    duration: 3000
                });
            }
        }
    }

    private handleTileMemoryResult(player: Player, data: Record<string, any>): void {
        
        const wizardNpc = this.npcManager.getNpcById('wizard');
        if (wizardNpc) {
            // Import WizardDialogNpc dynamically to avoid circular dependency
            const { WizardDialogNpc } = require('./npcs/WizardDialogNpc');
            if (wizardNpc instanceof WizardDialogNpc) {
                // Type assertion needed because TypeScript doesn't narrow types properly with dynamic require
                (wizardNpc as InstanceType<typeof WizardDialogNpc>).handleTileMemoryResult(
                    player,
                    data.success || false,
                    data.roundsCompleted || 0
                );
            } else {
                console.error(`[GamePlayerEntity] Wizard NPC is not a WizardDialogNpc instance`);
            }
        } else {
            console.error(`[GamePlayerEntity] Could not find wizard NPC to handle tile memory result`);
        }
    }

    private handleDropItem(player: Player, data: Record<string, any>): void {
        if (!data.itemId) {
            return;
        }
        
        const inventory = this.inventoryManager.getInventory(player);
        const item = inventory?.items.find(i => i.id === data.itemId);
        if (!item) {
            return;
        }
        const success = this.inventoryManager.removeItem(player, data.itemId, 1);
        if (success) {
            this.stateManager.sendGameMessage(player, `You dropped ${item.name}.`);
            this.inventoryManager.updateInventoryUI(player);
        }
    }

    private handleOpenChest(player: Player, chestId: string): void {
        
        // Get the player entity for positioning
        const playerEntity = this.world?.entityManager.getPlayerEntitiesByPlayer(player)[0];
        if (!playerEntity) {
            console.error(`[GamePlayerEntity] Could not find player entity for ${player.id}`);
            return;
        }

        // Calculate position above player's head (similar to fish equipping)
        const position = new Vector3(
            playerEntity.position.x,
            playerEntity.position.y + 1.5,// Above the player's head
            playerEntity.position.z
        );


        // Delegate to ChestManager for all chest opening logic
        this.chestManager.openChestVisually(player, chestId, position);
    }

    private handleOpenOre(player: Player, oreId: string): void {
        
        // Get the player entity for positioning
        const playerEntity = this.world?.entityManager.getPlayerEntitiesByPlayer(player)[0];
        if (!playerEntity) {
            console.error(`[GamePlayerEntity] Could not find player entity for ${player.id}`);
            return;
        }

        // Calculate position above player's head (similar to fish equipping)
        const position = new Vector3(
            playerEntity.position.x,
            playerEntity.position.y + 1.5,// Above the player's head
            playerEntity.position.z
        );

        console.log(`[GamePlayerEntity] Delegating ore opening to OreManager at position:`, position);

        // Delegate to OreManager for all ore opening logic
        this.oreManager.openOreVisually(player, oreId, position);
    }



    // Optional: Spawn the dropped item in the world
    private spawnDroppedItem(player: Player, item: any): void {
        const playerEntity = this.world?.entityManager.getPlayerEntitiesByPlayer(player)[0];
        if (!playerEntity) return;
        
        const position = playerEntity.position;
    }

    private sendInventoryUIUpdate(player: Player): void {
        const inventory = this.inventoryManager.getInventory(player);
        player.ui.sendData({
            type: 'inventoryUpdate',
            inventory: inventory
        });
    }

    private handleCraftItem(player: Player, inputIds: string[]): void {
        const validInputIds = inputIds.filter(id => id !== null);
        if (!this.craftingManager) {
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                result: null
            });
            return;
        }
        const craftedItem = this.craftingManager.handleCraftItem(player, validInputIds);
        player.ui.sendData({
            type: 'craftingResult',
            success: !!craftedItem,
            result: craftedItem || null
        });
    }

    private handleCraftToolmasterRod(player: Player, data: Record<string, any>): void {
        const { rodId, materials, coinCost } = data;
        
        if (!rodId || !materials || coinCost === undefined) {
            console.error(`[GamePlayerEntity] Invalid craftToolmasterRod data:`, data);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Invalid crafting request'
            });
            return;
        }

        // Check if player has enough coins
        const playerCoins = this.stateManager.getCoinBalance(player);
        if (playerCoins < coinCost) {
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Insufficient coins!'
            });
            return;
        }

        // Check if player has required materials
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) {
            console.error(`[GamePlayerEntity] No inventory found for player ${player.id}`);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Inventory error'
            });
            return;
        }

        // Verify all materials are available
        for (const material of materials) {
            const playerHas = inventory.items.filter(item => item.id === material.id)
                .reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            if (playerHas < material.required) {
                player.ui.sendData({
                    type: 'craftingResult',
                    success: false,
                    message: `Insufficient ${material.name}! Need ${material.required}, have ${playerHas}`
                });
                return;
            }
        }

        // All checks passed - proceed with crafting
        try {
            // Remove materials from inventory
            for (const material of materials) {
                let remainingToRemove = material.required;
                const materialItems = inventory.items.filter(item => item.id === material.id);
                
                for (const item of materialItems) {
                    if (remainingToRemove <= 0) break;
                    
                    const removeFromThis = Math.min(item.quantity || 0, remainingToRemove);
                    this.inventoryManager.removeItem(player, material.id, removeFromThis);
                    remainingToRemove -= removeFromThis;
                }
            }

            // Deduct coins
            this.currencyManager.removeCoins(player, coinCost);

            // Create the rod using ItemFactory
            const craftedRod = ItemFactory.createRodItem(rodId);
            
            // Add the rod to inventory
            const added = this.inventoryManager.addItem(player, craftedRod);
            
            if (added) {
                player.ui.sendData({
                    type: 'craftingResult',
                    success: true,
                    message: `Successfully crafted ${craftedRod.name}!`,
                    itemName: craftedRod.name,
                    result: craftedRod
                });
            } else {
                console.error(`[GamePlayerEntity] Failed to add crafted rod to inventory for player ${player.id}`);
                // Refund materials and coins since crafting failed
                for (const material of materials) {
                    // Simple refund - create basic items
                    for (let i = 0; i < material.required; i++) {
                        const refundItem = ItemFactory.createInventoryItemFromLootId(material.id, 1);
                        this.inventoryManager.addItem(player, refundItem);
                    }
                }
                this.currencyManager.addCoins(player, coinCost);
                
                player.ui.sendData({
                    type: 'craftingResult',
                    success: false,
                    message: 'Inventory full! Materials and coins refunded.'
                });
            }
        } catch (error) {
            console.error(`[GamePlayerEntity] Error crafting rod for player ${player.id}:`, error);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Crafting failed due to an error'
            });
        }
    }

    private handleCraftToolmasterItem(player: Player, data: Record<string, any>): void {
        const { itemId, materials, coinCost } = data;
        
        if (!itemId || !materials || coinCost === undefined) {
            console.error(`[GamePlayerEntity] Invalid craftToolmasterItem data:`, data);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Invalid crafting request'
            });
            return;
        }

        // Check if player has enough coins
        const playerCoins = this.stateManager.getCoinBalance(player);
        if (playerCoins < coinCost) {
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Insufficient coins!'
            });
            return;
        }

        // Check if player has required materials
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) {
            console.error(`[GamePlayerEntity] No inventory found for player ${player.id}`);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Inventory error'
            });
            return;
        }

        // Verify all materials are available
        for (const material of materials) {
            const playerHas = inventory.items.filter(item => item.id === material.id)
                .reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            if (playerHas < material.required) {
                player.ui.sendData({
                    type: 'craftingResult',
                    success: false,
                    message: `Insufficient ${material.name}! Need ${material.required}, have ${playerHas}`
                });
                return;
            }
        }

        // All checks passed - proceed with crafting
        try {
            // Deduct coins first
            this.currencyManager.removeCoins(player, coinCost);

            // Create the item using CraftingManager - let it handle material removal
            const inputIds = [];
            for (const material of materials) {
                for (let i = 0; i < material.required; i++) {
                    inputIds.push(material.id);
                }
            }
            const craftedItem = this.craftingManager.handleCraftItem(player, inputIds, true);
            
            
            if (craftedItem) {
                
                // Update UI with new inventory and currency
                this.stateManager.updateCurrencyUI(player);
                this.inventoryManager.updateInventoryUI(player);
                
                // Refresh the toolmaster forge UI to show updated material counts
                player.ui.sendData({
                    type: 'refreshToolmasterForge'
                });
                
                
                player.ui.sendData({
                    type: 'craftingResult',
                    success: true,
                    message: `Successfully crafted ${craftedItem.name}!`,
                    itemName: craftedItem.name,
                    result: craftedItem
                });
                
                // Also send toolmaster-specific result (for UI compatibility)
                player.ui.sendData({
                    type: 'toolmasterCraftingResult',
                    success: true,
                    message: `Successfully crafted ${craftedItem.name}!`,
                    itemName: craftedItem.name,
                    result: craftedItem
                });
                
            } else {
                console.error(`[GamePlayerEntity] Failed to craft item ${itemId} for player ${player.id}`);
                // Refund coins since crafting failed (materials weren't removed yet)
                this.currencyManager.addCoins(player, coinCost);
                
                player.ui.sendData({
                    type: 'craftingResult',
                    success: false,
                    message: 'Crafting failed! Coins refunded.'
                });
                
                // Also send toolmaster-specific result (for UI compatibility)
                player.ui.sendData({
                    type: 'toolmasterCraftingResult',
                    success: false,
                    message: 'Crafting failed! Coins refunded.'
                });
            }
        } catch (error) {
            console.error(`[GamePlayerEntity] Error crafting item for player ${player.id}:`, error);
            player.ui.sendData({
                type: 'craftingResult',
                success: false,
                message: 'Crafting failed due to an error'
            });
            
            // Also send toolmaster-specific result (for UI compatibility)
            player.ui.sendData({
                type: 'toolmasterCraftingResult',
                success: false,
                message: 'Crafting failed due to an error'
            });
        }
    }

    // Utility Methods
    public handleDeath() {
        // Prevent multiple death handlers from firing
        if (this.isDead) {
            return;
        }
        
        this.isDead = true;
        
        // Calculate coin loss (33% of current coins)
        const currentCoins = this.currencyManager.getCoins(this.player);
        const coinLoss = Math.floor(currentCoins * 0.33);
        
        // Remove coins
        if (coinLoss > 0) {
            this.currencyManager.removeCoins(this.player, coinLoss);
        }
        
        // Send death event to UI with coin loss info
        this.player.ui.sendData({
            type: 'playerDeath',
            coinLoss: coinLoss,
            coinsRemaining: this.currencyManager.getCoins(this.player)
        });
        
        // Reset breath and notify UI immediately that all bubbles are gone
        this.currentBreath = 0;
        this.isDrowning = false;
        this.player.ui.sendData({
            type: 'breathUpdate',
            percentage: 0
        });
        
        // Disable movement (like Frontiers does)
        try {
            if (this.isSpawned) {
                // Stop animations
                this.stopModelAnimations(['crawling']);
                this.startModelLoopedAnimations(['idle']);
            }
        } catch (error) {
            console.warn("[DEATH] Could not stop animations:", error);
        }
        
    }
    
    /**
     * Find a valid spawn point, randomly selecting from valid candidates to prevent players spawning on top of each other
     */
    public findValidSpawnPoint(world: World): { x: number, y: number, z: number } | null {
        if (!world) return null;
        
        // Define spawn point candidates - dock area from x = -115.73 to x = -101, three wide
        const spawnCandidates: { x: number, y: number, z: number }[] = [];
        
        // Base z positions (three wide) - exact coordinates provided
        const zPositions = [34.30, 35.30, 36.5];
        const baseY = 15;
        const startX = -115.73;
        const endX = -101;
        
        // Generate spawn points from x = -115.73 to x = -101, stepping by 1 block
        for (let x = startX; x <= endX; x += 1) {
            for (const z of zPositions) {
                spawnCandidates.push({ x, y: baseY, z });
            }
        }
        
        // Add a few fallback positions near central square (land area)
        // Fitz is at (-89.5, 16.76, 36.47), so spawn points need at least 6-8 block buffer
        spawnCandidates.push(
            { x: -85, y: 18, z: 32 },   // Land area (west of Fitz, ~7 blocks away)
            { x: -100, y: 18, z: 42 }, // Land area (west/north of Fitz, ~8 blocks away)
            { x: -97, y: 18, z: 40 },  // Land area (west/north of Fitz, ~7 blocks away)
            { x: -83, y: 18, z: 31 },  // Land area (west/south of Fitz, ~7 blocks away)
            { x: -96, y: 18, z: 30 },  // Land area (west/south of Fitz, ~8 blocks away)
            { x: -102, y: 18, z: 38 }  // Land area (west of Fitz, ~8 blocks away)
        );
        
        // Find all valid spawn candidates
        const validCandidates: { x: number, y: number, z: number }[] = [];
        for (const candidate of spawnCandidates) {
            if (this.isValidSpawnPosition(candidate, world)) {
                validCandidates.push(candidate);
            }
        }
        
        // If we have valid candidates, randomly select one
        if (validCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * validCandidates.length);
            const selectedSpawn = validCandidates[randomIndex]!;
            return selectedSpawn;
        }
        
        // Fallback to default if all candidates fail
        console.warn(`[SPAWN] No valid spawn point found, using default`);
        return { x: -109, y: 14, z: 35 };
    }
    
    /**
     * Check if a position is valid for spawning
     */
    private isValidSpawnPosition(position: { x: number, y: number, z: number }, world: World): boolean {
        if (!world) return false;
        
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        // Check if position is in water (avoid water spawns)
        if (this.isWaterBlock(position)) {
            return false;
        }
        
        // Check if there's a solid block at player position (would be stuck)
        const blockAtPosition = world.chunkLattice.getBlockId({ x, y, z });
        if (blockAtPosition !== undefined && blockAtPosition !== 0) {
            // Check if it's a solid block (not air, not water)
            // Support multiple water block IDs from different worlds
            const waterBlockIds = [10, 50, 73, 74, 77, 78, 150];
            if (!waterBlockIds.includes(blockAtPosition)) {
                return false; // Solid block, can't spawn here
            }
        }
        
        // Check if there's ground below (within 3 blocks)
        let hasGround = false;
        for (let checkY = y - 1; checkY >= y - 3; checkY--) {
            const blockBelow = world.chunkLattice.getBlockId({ x, y: checkY, z });
            if (blockBelow !== undefined && blockBelow !== 0) {
                // Check if it's a solid block (not air, not water)
                const waterBlockIds = [10, 50, 73, 74, 77, 78, 150];
                if (!waterBlockIds.includes(blockBelow)) {
                    hasGround = true;
                    break;
                }
            }
        }
        
        if (!hasGround) {
            return false; // No ground below, unsafe spawn
        }
        
        // Check if there's air/space above (at least 2 blocks clearance)
        const blockAbove1 = world.chunkLattice.getBlockId({ x, y: y + 1, z });
        const blockAbove2 = world.chunkLattice.getBlockId({ x, y: y + 2, z });
        const waterBlockIds = [10, 50, 73, 74, 77, 78, 150];
        if ((blockAbove1 !== undefined && blockAbove1 !== 0 && !waterBlockIds.includes(blockAbove1)) ||
            (blockAbove2 !== undefined && blockAbove2 !== 0 && !waterBlockIds.includes(blockAbove2))) {
            return false; // Not enough headroom
        }
        
        return true;
    }
    
    public respawn(): void {
        if (!this.isSpawned) {
            console.warn("[RESPAWN] Entity not spawned, cannot respawn");
            return;
        }
        
        // Reset death flag
        this.isDead = false;
        
        // Get current region spawn point from state (like initial spawn does)
        const currentRegionId = this.stateManager.getCurrentRegionId(this.player);
        const savedSpawnPoint = this.stateManager.getCurrentRegionSpawnPoint(this.player);
        const savedFacingAngle = this.stateManager.getCurrentRegionSpawnFacingAngle(this.player);
        
        // Get region to get default spawn point if no saved one
        let spawnPosition: Vector3Like | undefined;
        let facingAngle: number | undefined;
        
        if (savedSpawnPoint) {
            // Validate saved spawn point - ignore old default (0, 10, 0) for cave region
            const isOldDefault = currentRegionId === 'ancient-cave-1' && 
                                 savedSpawnPoint.x === 0 && 
                                 savedSpawnPoint.y === 10 && 
                                 savedSpawnPoint.z === 0;
            
            if (isOldDefault) {
                console.log(`[RESPAWN] Ignoring old default spawn point (0, 10, 0), using region default`);
                // Clear the old saved spawn point
                this.stateManager.setCurrentRegionSpawnPoint(this.player, undefined);
                this.stateManager.setCurrentRegionSpawnFacingAngle(this.player, undefined);
                // Will fall through to use region default
            } else {
                // Use saved spawn point if it's valid
                spawnPosition = savedSpawnPoint;
                facingAngle = savedFacingAngle ?? 0;
                console.log(`[RESPAWN] Using saved spawn point: (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
            }
        }
        
        // If we don't have a valid saved spawn point, use region default
        if (!spawnPosition) {
            if (currentRegionId) {
                // Get region's default spawn point
                const region = GameManager.instance.getRegion(currentRegionId);
                if (region) {
                    spawnPosition = region.spawnPoint;
                    facingAngle = region.spawnFacingAngle;
                    console.log(`[RESPAWN] Using region default spawn point: (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z}) for region ${currentRegionId}`);
                } else {
                    // Region not found - try findValidSpawnPoint for main world, otherwise use hardcoded
                    console.warn(`[RESPAWN] Region ${currentRegionId} not found, falling back to main world spawn logic`);
                    const validSpawn = this.findValidSpawnPoint(this.world as World);
                    spawnPosition = validSpawn ?? { x: -109, y: 14, z: 35 };
                    facingAngle = 0;
                }
            } else {
                // No region info - use main world logic
                console.warn(`[RESPAWN] No region ID found, using main world spawn logic`);
                const validSpawn = this.findValidSpawnPoint(this.world as World);
                spawnPosition = validSpawn ?? { x: -109, y: 14, z: 35 };
                facingAngle = 0;
            }
        }
        
        // Ensure we have valid values (TypeScript safety)
        if (!spawnPosition) {
            console.error(`[RESPAWN] Failed to determine spawn position, using emergency fallback`);
            spawnPosition = { x: -109, y: 14, z: 35 };
            facingAngle = 0;
        }
        if (facingAngle === undefined) {
            facingAngle = 0;
        }
        
        // For main world, calculate facing towards Fitz
        let lookAtPos: Vector3Like | undefined;
        if (currentRegionId === 'big-island') {
            lookAtPos = { x: -89.5, y: 16.76, z: 36.47 }; // Fitz/Greeter position
            const dx = lookAtPos.x - spawnPosition.x;
            const dz = lookAtPos.z - spawnPosition.z;
            facingAngle = Math.atan2(dx, dz) * (180 / Math.PI);
        }
        
        // Move entity to spawn position
        this.setPosition(spawnPosition);
        
        // Set facing direction
        const quaternion = Quaternion.fromEuler(0, facingAngle, 0);
        this.setRotation(quaternion);
        
        // Reset velocity
        try {
            if (this.rawRigidBody && typeof this.rawRigidBody.setLinearVelocity === 'function') {
                this.rawRigidBody.setLinearVelocity({ x: 0, y: 0, z: 0 });
            }
        } catch (error) {
            console.warn("[RESPAWN] Could not set linear velocity:", error);
        }
        
        // Reset breath
        this.currentBreath = this.maxBreath;
        this.isDrowning = false;
        
        // Update UI
        this.player.ui.sendData({
            type: 'breathUpdate',
            percentage: 100
        });
        
        // Set camera look position
        if (lookAtPos) {
            this.player.camera.lookAtPosition(lookAtPos);
        } else {
            // For other regions, look in facing direction
            const facingAngleRad = facingAngle * Math.PI / 180;
            this.player.camera.lookAtPosition({
                x: spawnPosition.x - Math.sin(facingAngleRad),
                y: spawnPosition.y,
                z: spawnPosition.z - Math.cos(facingAngleRad),
            });
        }
        
        // Reset animations
        try {
            this.stopModelAnimations(['crawling']);
            this.startModelLoopedAnimations(['idle']);
        } catch (error) {
            console.warn("[RESPAWN] Could not reset animations:", error);
        }
        
        // Send respawn confirmation to UI to hide death overlay
        this.player.ui.sendData({
            type: 'playerRespawned'
        });
        
        // Re-enable player input (unlock pointer)
        this.player.ui.sendData({
            type: 'enablePlayerInput'
        });
        
        console.log(`[RESPAWN] Player respawned at (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z}) in region ${currentRegionId || 'unknown'}`);
    }

    public updateLastInputState(input: InputState) {
        this.lastInputState = input;
    }

    public getLastInputState() {
        return this.lastInputState;
    }

    getEquippedRod(player: Player) {
        return this.inventoryManager.getEquippedRod(player);
    }

    getEquippedBait(player: Player) {
        return this.inventoryManager.checkBait(player);
    }

    useBait(player: Player, bait: InventoryItem | null) {
        if (!bait) { return; }
        this.inventoryManager.useBait(player, bait.id);
    }

    abortFishing(player: Player) {
        this.fishingMiniGame.abortFishing(player);
        this.isFishing = false;
    }

    // Restore isInOrOnWater to check if the player's eye position is in water
    public isInOrOnWater(entity: any): boolean {
        // Check the block at the player's eye height
        const position = {
            x: entity.position.x,
            y: entity.position.y + this.PLAYER_EYE_HEIGHT,
            z: entity.position.z
        };
        return this.isWaterBlock(position);
    }

    public isWaterBlock(position: { x: number, y: number, z: number }): boolean {
        // CRITICAL: Use player's current world, not static mapData
        // This allows water detection to work in different regions with different water block IDs
        if (!this.world) return false;
        
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        // Get block ID from the current world's chunkLattice
        const blockTypeId = this.world.chunkLattice.getBlockId({ x, y, z });
        
        // Support multiple water block IDs from different worlds:
        // Main world: 77, 78, 150, 50
        // Cave world: 10
        // Other worlds may have different IDs (73, 74 for water-flow/water-still)
        const waterBlockIds = [10, 50, 73, 74, 77, 78, 150];
        return waterBlockIds.includes(blockTypeId ?? 0);
    }
    
    public checkWaterZone(): boolean {
        // Check multiple points around the player's head for more reliable water detection
        const checkPoints = [
            { x: 0, y: 0.3, z: 0 },    // Center
            { x: 0.2, y: 0.3, z: 0 },  // Right
            { x: -0.2, y: 0.3, z: 0 }, // Left
            { x: 0, y: 0.3, z: 0.2 },  // Front
            { x: 0, y: 0.3, z: -0.2 }  // Back
        ];

        // Count how many points are in water
        let waterPoints = 0;
        for (const offset of checkPoints) {
            const pos = {
                x: this.position.x + offset.x,
                y: this.position.y + offset.y,
                z: this.position.z + offset.z
            };
            if (this.isWaterBlock(pos)) {
                waterPoints++;
            }
        }

        // Consider in water if majority of points are in water
        return waterPoints >= 3;
    }

    private checkAndShowTutorial() {
        const playerState = this.stateManager.getState(this.player);
        if (playerState && this.stateManager.getCurrentLevel(this.player) === 1) {
            this.showTutorial();
        }
    }
    
    // Update tutorial method to include mobile content
    private showTutorial() {
        this.player.ui.lockPointer(false);
        let username = this.player.username;
        username = username?.trim() || "Player";
        
        // Create device-specific tutorial content
        const castingText = this.isMobile
            ? "Begin your cast by tapping the fishing icon (🎣). Time the meter at the top to get the farthest distance."
            : "Begin your cast by clicking the right mouse button. Time the meter at the top to get the farthest distance.";
        
        const jiggingText = this.isMobile
            ? "Once your line is in the water, TAP the fishing icon (🎣) to jig your line. Keep your jig around the center - this speeds up catch times!"
            : "Once your line is in the water, TAP 'Q' to jig your line. Keep your jig around the center - this speeds up catch times!";
        
        const reelingText = this.isMobile
            ? "When you get a bite, HOLD the fishing icon (🎣) to move your white catch meter to the right. Let go, and it will move left. Trapping the yellow fish line in the bar fills your progress meter. Once it's full, you caught your fish!"
            : "When you get a bite, HOLD Q to move your white catch meter to the right. Let go, and it will move left. Trapping the yellow fish line in the bar fills your progress meter. Once it's full, you caught your fish!";
        
        // Send tutorial content to UI
        this.player.ui.sendData({
            type: 'showTutorial',
            steps: [
                {
                    title: `Welcome ${this.player.username}!`,
                    text: "Let's learn the basics of phshing! Hit next to begin.",
                    image: "assets/ui/icons/welcome.png"
                },
                {
                    title: "Step 1: Casting",
                    text: castingText,
                    image: "assets/ui/icons/casting.png",
                    type: "casting"
                },
                {
                    title: "Step 2: Jigging",
                    text: jiggingText,
                    image: "assets/ui/icons/jigging.png",
                    type: "jigging"
                },
                {
                    title: "Step 3: Reeling",
                    text: reelingText,
                    image: "assets/ui/icons/reeling.png",
                    type: "reeling"
                }
            ]
        });
    }

    // --- BREATH SYSTEM ---
    public updateBreath(deltaTimeMs: number, inWater: boolean): void {
        const deltaTimeSeconds = deltaTimeMs / 1000;
        
        // If testBreath is set, use it for calculations and UI
        if (this.testBreath !== null) {
            this.currentBreath = this.testBreath;
        } else if (inWater) {
            // Drain breath while in water
            const newBreath = Math.max(0, this.currentBreath - (this.breathDrainRate * deltaTimeSeconds));
            this.currentBreath = newBreath;
            if (this.currentBreath <= 0 && !this.isDrowning) {
                this.isDrowning = true;
                this.handleDrowning(deltaTimeSeconds);
            }
        } else {
            // Recharge breath when out of water
            const newBreath = Math.min(this.maxBreath, this.currentBreath + (this.breathRechargeRate * deltaTimeSeconds));
            this.currentBreath = newBreath;
            this.isDrowning = false;
        }
    }
    
    public getCurrentBreathPercentage(): number {
        if (this.currentBreath <= 0) {
            return 0;
        }
        return (this.currentBreath / this.maxBreath) * 100;
    }
    
    public sendBreathUpdate(percentage: number): void {
        this.player.ui.sendData({
            type: 'breathUpdate',
            percentage: percentage
        });
    }
    
    public reduceBreath(amount: number): void {
        this.currentBreath = Math.max(0, this.currentBreath - amount);
    }
    private handleDrowning(deltaTimeSeconds: number): void {
        if (this.isDrowning) {
            this.handleDeath();
        }
    }

    private sendCraftingRecipesToClient(player: Player): void {
        // Import the recipes and type from your CraftingRecipes file
        // Send all recipes to the client
        const recipesToSend = CRAFTING_RECIPES.map((recipe: any) => ({
            inputs: recipe.inputs,
            output: {
                id: recipe.output.id,
                name: recipe.output.name,
                type: recipe.output.type,
                rarity: recipe.output.rarity,
                quantity: recipe.output.quantity || 1,
                value: recipe.output.value,
                sprite: recipe.output.sprite,
                modelId: recipe.output.modelId,
                metadata: recipe.output.metadata
            }
        }));
        player.ui.sendData({
            type: 'craftingRecipes',
            recipes: recipesToSend
        });
    }

    private sendBaitRecipesToClient(player: Player): void {
        // Load bait recipes from the JSON file
        const fs = require('fs');
        const path = require('path');
        
        
        try {
            // Try multiple possible paths
            const possiblePaths = [
                path.join(__dirname, '../data/bait_recipes.json'),
                path.join(__dirname, '../../data/bait_recipes.json'),
                path.join(process.cwd(), 'data/bait_recipes.json'),
                './data/bait_recipes.json'
            ];
            
            let recipesPath = '';
            let recipesData = null;
            
            for (const testPath of possiblePaths) {
                try {
                    if (fs.existsSync(testPath)) {
                        recipesPath = testPath;
                        recipesData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
                        break;
                    } else {
                        console.log('[Server] Path does not exist:', testPath);
                    }
                } catch (pathError) {
                    console.log('[Server] Error testing path:', testPath, pathError);
                }
            }
            
            if (!recipesData) {
                throw new Error('Could not find bait_recipes.json in any expected location');
            }
            
            // Enhance recipes with sprite information from BaitCatalog and LootCatalog
            const enhancedRecipes = (recipesData.recipes || []).map((recipe: any) => {

                
                // For each output item, try to find its sprite in the BaitCatalog first
                if (recipe.outputs && recipe.outputs.length > 0) {
                    const outputItemId = recipe.outputs[0].itemId; // Use first output item
                    let catalogKey = outputItemId.replace(/^bait_/, ''); // Remove 'bait_' prefix
                    let baitDef = BAIT_CATALOG[catalogKey];
                    
                    // If not found, try some common variations in BaitCatalog
                    if (!baitDef) {
                        // Try with underscores converted to no underscores and vice versa
                        const altKey = catalogKey.includes('_') ? catalogKey.replace(/_/g, '') : catalogKey.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                        baitDef = BAIT_CATALOG[altKey];
                        if (baitDef) {
                            catalogKey = altKey;
                        }
                    }
                    
                    if (baitDef && baitDef.sprite) {
                        return {
                            ...recipe,
                            icon: baitDef.sprite // Override icon with catalog sprite
                        };
                    }
                    
                    // If not found in BaitCatalog, try LootCatalog
                    const lootDef = LOOT_CATALOG.find(loot => loot.id === outputItemId);
                    if (lootDef) {
                        if (lootDef.sprite) {
                            return {
                                ...recipe,
                                icon: lootDef.sprite // Override icon with loot catalog sprite
                            };
                        } 
                    } 
                }
                
                // If no catalog entry found, keep the original recipe icon if it exists
                if (recipe.icon) {
                    console.log(`[Server] Using original recipe icon for ${recipe.id}: ${recipe.icon}`);
                    return recipe;
                }
                
                // Only fall back to fish head if no icon is specified in recipe
                return {
                    ...recipe,
                    icon: 'fish_head_sprite.png' // Fallback icon
                };
            });
            
        
            
            player.ui.sendData({
                type: 'baitRecipesData',
                recipes: enhancedRecipes,
                categories: recipesData.categories || []
            });
        } catch (error) {
            console.error('[Server] Error loading bait recipes:', error);
            if (error instanceof Error) {
                console.error('[Server] Error details:', error.message);
                console.error('[Server] Stack trace:', error.stack);
            }
            // Send empty data as fallback
            player.ui.sendData({
                type: 'baitRecipesData',
                recipes: [],
                categories: []
            });
        }
    }

    private handleCraftBaitRecipe(player: Player, data: any): void {
        
        const { recipeId, quantity, inputs, outputs, cost } = data;
        
        // Validate player has required materials
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) {
            console.error('[Server] No inventory found for player');
            return;
        }
        
        // Check coins
        const playerCoins = this.stateManager.getCoinBalance(player);
        if (playerCoins < cost) {
            player.ui.sendData({
                type: 'baitCraftingResult',
                success: false,
                error: `Insufficient coins! Need ${cost} coins.`
            });
            return;
        }
        
        // Check materials
        for (const input of inputs) {
            const playerHas = this.getPlayerItemCount(player, input.itemId);
            const required = input.quantity * quantity;
            if (playerHas < required) {
                player.ui.sendData({
                    type: 'baitCraftingResult',
                    success: false,
                    error: `Insufficient ${input.displayName}! Need ${required}, have ${playerHas}.`
                });
                return;
            }
        }
        
        // All checks passed, proceed with crafting
        
        // Remove coins
        this.stateManager.getCurrencyManager().removeCoins(player, cost);
        
        // Remove input materials
        for (const input of inputs) {
            const required = input.quantity * quantity;
            const actualItemId = this.findActualItemId(player, input.itemId);
            if (actualItemId) {
                this.inventoryManager.removeItem(player, actualItemId, required);
            } else {
                console.error(`[Server] Could not find actual item ID for ${input.itemId}`);
            }
        }
        
        // Add output items
        for (const output of outputs) {
            const totalQuantity = output.quantity * quantity;
            // Create the bait item using the existing system
            const baitItem = this.createBaitItemFromId(output.itemId, totalQuantity);
            if (baitItem) {
                this.inventoryManager.addItem(player, baitItem);
            }
        }
        
        // Send success message
        const outputNames = outputs.map((o: any) => `${o.quantity * quantity}x ${o.displayName}`).join(', ');
        player.ui.sendData({
            type: 'baitCraftingResult',
            success: true,
            itemName: outputNames
        });
        
        // Update UI
        this.stateManager.updateCurrencyUI(player);
        this.inventoryManager.updateInventoryUI(player);
        
    }

    private getPlayerItemCount(player: Player, itemId: string): number {
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) return 0;
        
        // First try exact match
        let item = inventory.items.find(item => item.id === itemId);
        if (item) {
            return item.quantity || 0;
        }
        
        // Try with bait_ prefix for bait items (e.g., seaweed -> bait_seaweed)
        if (!itemId.startsWith('bait_')) {
            const baitId = `bait_${itemId}`;
            item = inventory.items.find(item => item.id === baitId);
            if (item) {
                return item.quantity || 0;
            }
        }
        
        // If no exact match, try to find fish with timestamp format (e.g., sardine_1234567890_123)
        const fishPattern = new RegExp(`^${itemId}_\\d+_\\d+$`);
        item = inventory.items.find(item => fishPattern.test(item.id));
        if (item) {
            return item.quantity || 0;
        }
        
        // If still no match, try partial match (fish type at start)
        item = inventory.items.find(item => item.id.startsWith(itemId));
        if (item) {
            return item.quantity || 0;
        }
        
        console.log(`[Server] No match found for ${itemId}`);
        return 0;
    }

    private findActualItemId(player: Player, itemId: string): string | null {
        const inventory = this.inventoryManager.getInventory(player);
        if (!inventory) return null;
        
        // First try exact match
        let item = inventory.items.find(item => item.id === itemId);
        if (item) {
            return item.id;
        }
        
        // Try with bait_ prefix for bait items (e.g., seaweed -> bait_seaweed)
        if (!itemId.startsWith('bait_')) {
            const baitId = `bait_${itemId}`;
            item = inventory.items.find(item => item.id === baitId);
            if (item) {
                return item.id;
            }
        }
        
        // If no exact match, try to find fish with timestamp format (e.g., sardine_1234567890_123)
        const fishPattern = new RegExp(`^${itemId}_\\d+_\\d+$`);
        item = inventory.items.find(item => fishPattern.test(item.id));
        if (item) {
            return item.id;
        }
        
        // If still no match, try partial match (fish type at start)
        item = inventory.items.find(item => item.id.startsWith(itemId));
        if (item) {
            return item.id;
        }
        
        return null;
    }

    private createBaitItemFromId(itemId: string, quantity: number): any {
        // Import catalogs to create proper items
        const { BAIT_CATALOG } = require('./Bait/BaitCatalog');
        const { ItemFactory } = require('./Inventory/ItemFactory');
        
        console.log(`[Server] Creating item from ID: ${itemId}, quantity: ${quantity}`);
        
        // First try to create as a bait item (for items with bait_ prefix)
        if (itemId.startsWith('bait_')) {
            const catalogKey = itemId.replace(/^bait_/, '');
            if (BAIT_CATALOG[catalogKey]) {
                return ItemFactory.createBaitItem(catalogKey, quantity);
            }
        }
        
        // If not a bait item, try to create from LootCatalog (for sting_jelly, mega_sting, etc.)
        try {
            const lootItem = ItemFactory.createInventoryItemFromLootId(itemId, quantity);
            if (lootItem) {
                return lootItem;
            }
        } catch (error) {
            console.log(`[Server] Failed to create loot item ${itemId}:`, error);
        }
        
        console.error(`[Server] Item not found in any catalog: ${itemId}`);
        return null;
    }
}