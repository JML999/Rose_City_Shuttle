import { Entity, Player, World, Vector3Like } from 'hytopia';
import { InventoryManager } from './Inventory/InventoryManager';
import { LevelingSystem } from './LevelingSystem';
import type { FishingState } from './Fishing/FishingMiniGame';
import type { InventoryItem, ItemType, PlayerInventory } from './Inventory/Inventory';
import { CurrencyManager } from './CurrencyManager';
import { FISHING_RODS } from './Inventory/RodCatalog';
import { MessageManager } from './MessageManager';
import { CONFIG, isDevMode, canSaveData, canLoadFromPastPlayers } from './state/Config';
import BoatEntity from './Inventory/BoatEntity';

export interface MerchantInteractionState {
    isInteracting: boolean;
    selectedOption: number | null;
    currentMerchant: string | null;
    merchantResponse: string;
    catchOfTheDay: string | null;
    currentQuestFish: string | null;
}

// State related to interaction with generic NPCs
export interface NpcInteractionState {
    currentNpcId: string | null;
    // Add other NPC interaction-specific state here if needed later
}

// Structure for tracking individual quest progress
export interface PlayerQuestState {
    questId: string;
    status: 'active' | 'completed' | 'failed'; // Add other relevant statuses
    objectivesProgress: { [key: number]: number };
    assignedTimestamp?: number;
    completedTimestamp?: number;
    requiresTurnIn?: boolean; // <-- ADD THIS LINE (make it optional)
    requiresSellAtFishmonger?: boolean; // For sea story quests - show "Sell at Fish Market" in tracker
    trophyFishCount?: number; // For trophy quests - track number of trophy fish in inventory
    // Add any other relevant quest state properties
}

export type PlayerState = {
    fishing: FishingState;
    merchant: MerchantInteractionState;
    npcInteraction?: NpcInteractionState; // Added optional NPC interaction state
    lastNpcInteractionEndTime?: { [npcId: string]: number };
    lastQuestCompletionTime?: { [questType: string]: number }; // Track quest cooldowns by type (e.g., 'angler')
    isMobile: boolean ;

    quests: { // New property to track quests
        active: { [questId: string]: PlayerQuestState };
        completed: { [questId: string]: PlayerQuestState };
    };
    swimming: {
        isSwimming: boolean;
        breath: number;
    };
    
    // Add Phshdex data structure for persistent fish records
    phshdex?: {
        speciesRecords: { [speciesName: string]: PhshdexSpeciesRecord };
        overallStats: PhshdexOverallStats;
    };
    
    // Flags for temporary game state tracking (not persisted)
    flags?: {
        fragmentPoolsVisited?: string[];
        sardineQuestCasts?: number;
        lastCatchWasSardine?: boolean;
        lastCatchWasFallback?: boolean;
        [key: string]: any; // Allow additional flags
    };
    
    // Daily statistics for daily quest tracking
    dailyStats?: DailyStatistics;
    
    // Daily quest pool (2 quests per day)
    dailyQuestPool?: string[]; // Array of quest IDs available today
    dailyQuestPoolDate?: string; // YYYY-MM-DD format for reset detection
    dailyQuestNotificationSentDate?: string; // YYYY-MM-DD format - tracks when we last sent the daily quest notification
    lastLoginDate?: string; // YYYY-MM-DD format - tracks when player last logged in (for daily login bonus)
    
    // Inventory - moved from InventoryManager to PlayerState for single source of truth
    inventory: PlayerInventory;
    
    // Region tracking for world switching
    currentRegionId?: string;
    currentRegionSpawnPoint?: Vector3Like;
    currentRegionSpawnFacingAngle?: number;
};

// Daily statistics interface for tracking daily quest progress
export interface DailyStatistics {
    date: string; // YYYY-MM-DD format for reset detection
    fishCaught: number;
    fishByRarity: {
        common: number;
        uncommon: number;
        rare: number;
        epic: number;
        legendary: number;
    };
    baitUsed: number;
    baitUsedByType: { [baitType: string]: number }; // Track bait usage by type
    chestsOpened: number;
    locationsVisited: string[]; // Array of zone IDs (convert Set to array for JSON)
    fishWeighed: number; // Total fish weighed
    uniqueFishWeighed: string[]; // Array of unique fish species weighed
    fishWeighedByWeight: { [weightThreshold: string]: number }; // Track fish weighed by weight thresholds (e.g., "50", "100", "200", "250")
    leaderboardFishWeighed: number; // Count of fish that made leaderboard
}

// Phshdex data interfaces
export interface PhshdexSpeciesRecord {
    name: string;
    bestWeight: number;
    bestValue: number;
    bestRarity: string;
    totalCaught: number;
    firstCaughtTimestamp: number;
    bestCatchData?: {
        weight: number;
        value: number;
        rarity: string;
        timestamp: number;
        rodUsed?: string;
        hookUsed?: string;
        baitUsed?: string;
        location?: string;
    };
}

export interface PhshdexOverallStats {
    biggestValueCatch: {
        value: number;
        speciesName: string;
        weight: number;
        timestamp: number;
    };
    largestWeightCatch: {
        weight: number;
        speciesName: string;
        value: number;
        timestamp: number;
    };
    totalValueEarned: number;
    totalFishCaught: number;
    totalXP: number; // Total XP earned (cumulative)
}

// First, define our state manager
export class PlayerStateManager {
    private readonly PLAYER_EYE_HEIGHT = 0.1; // Assuming a default eye height

    // Singleton pattern - one instance per server
    private static _instance: PlayerStateManager | null = null;

    private states: Map<Player, PlayerState> = new Map();
    private _saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

    private constructor(
        private inventoryManager: InventoryManager | null,
        private levelingSystem: LevelingSystem,
        private currencyManager: CurrencyManager,
        private messageManager: MessageManager
    ) {
    }
    
    /**
     * Get or create the singleton PlayerStateManager instance.
     * Matches Frontiers' GamePlayer.getOrCreate() pattern.
     */
    public static getOrCreate(
        inventoryManager: InventoryManager | null,
        levelingSystem: LevelingSystem,
        currencyManager: CurrencyManager,
        messageManager: MessageManager
    ): PlayerStateManager {
        if (!PlayerStateManager._instance) {
            PlayerStateManager._instance = new PlayerStateManager(
                inventoryManager,
                levelingSystem,
                currencyManager,
                messageManager
            );
        }
        return PlayerStateManager._instance;
    }
    
    /**
     * Get the singleton instance (if already created).
     * Throws error if not initialized.
     */
    public static getInstance(): PlayerStateManager {
        if (!PlayerStateManager._instance) {
            throw new Error('PlayerStateManager not initialized. Call getOrCreate() first.');
        }
        return PlayerStateManager._instance;
    }
    
    // Method to set inventoryManager after construction (to resolve circular dependency)
    public setInventoryManager(inventoryManager: InventoryManager): void {
        (this as any).inventoryManager = inventoryManager;
    }

    // --- Add Public Getters --- 
    public getInventoryManager(): InventoryManager {
        if (!this.inventoryManager) {
            throw new Error('InventoryManager not initialized. Call setInventoryManager() first.');
        }
        return this.inventoryManager;
    }

    public getLevelingSystem(): LevelingSystem {
        return this.levelingSystem;
    }

    public getCurrencyManager(): CurrencyManager {
        return this.currencyManager;
    }

    public getMessageManager(): MessageManager {
        return this.messageManager;
    }
    // --- End Getters ---

    // --- Region Tracking Getters ---
    public getCurrentRegionId(player: Player): string | undefined {
        return this.getState(player)?.currentRegionId;
    }

    public getCurrentRegionSpawnPoint(player: Player): Vector3Like | undefined {
        return this.getState(player)?.currentRegionSpawnPoint;
    }

    public getCurrentRegionSpawnFacingAngle(player: Player): number | undefined {
        return this.getState(player)?.currentRegionSpawnFacingAngle;
    }

    // --- Region Tracking Setters ---
    public setCurrentRegionId(player: Player, regionId: string): void {
        const state = this.getState(player);
        if (state) {
            state.currentRegionId = regionId;
        }
    }

    public setCurrentRegionSpawnPoint(player: Player, point: Vector3Like | undefined): void {
        const state = this.getState(player);
        if (state) {
            state.currentRegionSpawnPoint = point;
        }
    }

    public setCurrentRegionSpawnFacingAngle(player: Player, angle: number | undefined): void {
        const state = this.getState(player);
        if (state) {
            state.currentRegionSpawnFacingAngle = angle;
        }
    }

    /**
     * Immediately persists player state, bypassing the debounce used by save().
     * 
     * This is critical before operations that might recreate the player state
     * (e.g. switching worlds/regions) to prevent stale region spawn data.
     */
    public flushSave(player: Player): void {
        // Clear any pending save timeout
        const existingTimeout = this._saveTimeouts.get(player.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this._saveTimeouts.delete(player.id);
        }
        // Immediately save
        this.save(player);
    }

    // Made synchronous like Frontiers - load() method is synchronous
    initializePlayer(player: Player): void {
        // CRITICAL: Set default state first (will be overwritten by persisted data if it exists)
        this.states.set(player, this.createDefaultState());
        
        try {
            // Step 1: Try to load persisted data from various sources (synchronous like Frontiers)
            const persistedData = this.loadPersistedData(player);
            
            // Step 2: Apply the data if found
            if (persistedData) {
                console.log(`[INIT] Applying persisted data for player ${player.id}`);
                this.applyPersistedData(player, persistedData);
            } else {
                console.log(`[INIT] No persisted data found for player ${player.id} - using default state`);
            }
            
            // Step 3: Add temporary chest to player inventory
           // this.addTemporaryChest(player);
            
            // Step 4: Always update UI regardless of data source
            this.updateAllUI(player);
            
            // Step 5: Update XP leaderboard on login (fire and forget - non-blocking)
            const { LeaderboardManager } = require('./LeaderboardManager');
            const totalXP = this.levelingSystem.getTotalXP(player);
            if (totalXP > 0) {
                LeaderboardManager.instance.updateXPLeaderboard(player, totalXP).catch((err: any) => {
                    console.error(`[Leaderboard] Error updating leaderboard for player ${player.id}:`, err);
                });
            }
        } catch (e) {
            console.error(`[INIT] Error in initializePlayer for player ${player.id}:`, e);
            // CRITICAL: On error, preserve default state - don't wipe anything
            // Still update UI even if there was an error
            this.updateAllUI(player);
        }
        
        // Print debug info
        if (CONFIG.DEVELOPMENT_MODE) { this.printAllPersistedData();}
    }

    // Temporary method to add a chest to player inventory for testing
    private addTemporaryChest(player: Player): void {
        try {
            const ItemFactory = require('./Inventory/ItemFactory').ItemFactory;
            const chestItem = ItemFactory.createInventoryItemFromLootId('common_chest', 1);
            
            if (chestItem) {
                this.getInventoryManager().addItem(player, chestItem);
                this.sendGameMessage(player, "🎁 A rare chest has been added to your inventory for testing!");
            } else {
                console.warn(`[TEMP] Failed to create rare_chest item for player ${player.id}`);
            }
        } catch (error) {
            console.error(`[TEMP] Error adding temporary chest to player ${player.id}:`, error);
        }
    }

    // Helper method to load persisted data from various sources
    // Made synchronous like Frontiers - getPersistedData() is synchronous in SDK
    private loadPersistedData(player: Player): any {
        
        if (CONFIG.DEVELOPMENT_MODE) {
            console.log(`[LOAD] Development mode - skipping persisted data load for player ${player.id}`);
            return null;
        }
        
        // Get persisted data synchronously (Frontiers pattern)
        // If data isn't ready yet, getPersistedData() returns null/undefined
        try {
            const ownData = player.getPersistedData();
            if (ownData && Object.keys(ownData).length > 0) {
                console.log(`[LOAD] Loaded persisted data for player ${player.id} (${Object.keys(ownData).length} keys)`);
                return ownData;
            } else {
                console.log(`[LOAD] No persisted data found for player ${player.id}`);
            }
        } catch (e) {
            console.warn(`[LOAD] Failed to load player's own data for ${player.id}:`, e);
        }
        
        // If we don't want to load from past players, return null here
        if (!CONFIG.LOAD_FROM_PAST_PLAYERS) {
            console.log(`[LOAD] LOAD_FROM_PAST_PLAYERS disabled - skipping for player ${player.id}`);
            return null;
        }
        
        // No data found from any source
        return null;
    }

    // Helper method to apply persisted data to player
    // Made synchronous like Frontiers - no async operations needed
    private applyPersistedData(player: Player, data: any): void {
        
        if (CONFIG.DEVELOPMENT_MODE) {
            return;
        }
        
        // Apply inventory - load directly into state.inventory
        const state = this.getState(player);
        if (!state) {
            console.error(`[APPLY] No state found for player ${player.id}`);
            return;
        }
        
        if (data.inventory) {
            try {
                console.log(`[APPLY] Loading inventory for player ${player.id}`, {
                    itemCount: data.inventory.items?.length || 0,
                    hasEquippedRod: !!data.inventory.equippedRod,
                    hasEquippedBait: !!data.inventory.equippedBait
                });
                
                // Load inventory directly into state.inventory
                // Support both legacy format (full objects) and future ID-based format
                // Check save version to determine format
                const saveVersion = data.saveVersion || 1; // Default to 1 (legacy) if not specified
                
                // SAFETY: Ensure items is an array (Frontiers pattern - validate before iterating)
                // This prevents crashes if corrupted data has items as non-array (string, object, null, etc.)
                if (!Array.isArray(data.inventory.items)) {
                    console.error(`[APPLY] Invalid inventory.items structure for player ${player.id}:`, 
                        typeof data.inventory.items, data.inventory.items);
                    // Treat as empty array - skip loading items but preserve other inventory data
                    data.inventory.items = [];
                }
                
                let reconstructedItems: InventoryItem[] = [];
                
                if (saveVersion >= 2) {
                    // Version 2+: ID-based serialization - reconstruct items from IDs
                    console.log(`[APPLY] Loading inventory with ID-based format (version ${saveVersion})`);
                    for (const serializedItem of data.inventory.items) {
                        const reconstructed = this.reconstructItemFromSerialized(serializedItem);
                        if (reconstructed) {
                            reconstructedItems.push(reconstructed);
                        } else {
                            console.warn(`[APPLY] Failed to reconstruct item: ${serializedItem.itemId || serializedItem.id}`);
                        }
                    }
                } else {
                    // Version 1 (legacy): Full object format - use as-is
                    console.log(`[APPLY] Loading inventory with legacy format (version ${saveVersion})`);
                    reconstructedItems = data.inventory.items.map((itemData: any) => {
                        // If itemData is already a full InventoryItem object (legacy format), use it
                        if (itemData.id && itemData.name && itemData.type) {
                            return itemData;
                        }
                        // Try to reconstruct if it has itemId (transitional format)
                        if (itemData.itemId) {
                            const reconstructed = this.reconstructItemFromSerialized(itemData);
                            return reconstructed || itemData;
                        }
                        return itemData;
                    }).filter((item: InventoryItem | null) => item !== null);
                }
                
                state.inventory = {
                    items: reconstructedItems,
                    maxSlots: data.inventory.maxSlots || 20,
                    quickSlots: data.inventory.quickSlots || {},
                    equippedRod: data.inventory.equippedRod,
                    equippedBait: data.inventory.equippedBait,
                    equippedFish: data.inventory.equippedFish,
                };
                
                // Restore equipped status for items that were equipped
                if (state.inventory.equippedRod) {
                    const rodItem = state.inventory.items.find(item => item.id === state.inventory.equippedRod);
                    if (rodItem) {
                        rodItem.equipped = true;
                    } else {
                        console.warn(`[APPLY] Equipped rod ${state.inventory.equippedRod} not found in items, clearing equipped reference`);
                        state.inventory.equippedRod = undefined;
                    }
                }
                if (state.inventory.equippedBait) {
                    const baitItem = state.inventory.items.find(item => item.id === state.inventory.equippedBait);
                    if (baitItem) {
                        baitItem.equipped = true;
                    } else {
                        console.warn(`[APPLY] Equipped bait ${state.inventory.equippedBait} not found in items, clearing equipped reference`);
                        state.inventory.equippedBait = undefined;
                    }
                }
                if (state.inventory.equippedFish) {
                    const fishItem = state.inventory.items.find(item => item.id === state.inventory.equippedFish);
                    if (fishItem) {
                        fishItem.equipped = true;
                    } else {
                        console.warn(`[APPLY] Equipped fish ${state.inventory.equippedFish} not found in items, clearing equipped reference`);
                        state.inventory.equippedFish = undefined;
                    }
                }
                
                // Update UI after loading
                this.getInventoryManager().updateInventoryUI(player);
                
                console.log(`[APPLY] Successfully loaded inventory for player ${player.id}`);
            } catch (e) {
                console.error(`[APPLY] Failed to restore inventory for player ${player.id}:`, e);
                // CRITICAL: Preserve existing inventory if it exists (Frontiers pattern)
                // Don't wipe inventory on error - this prevents data loss from transient errors
                if (!state.inventory) {
                    // Only create empty inventory if none exists
                    state.inventory = {
                        items: [],
                        maxSlots: 20,
                        quickSlots: {},
                        equippedRod: undefined,
                        equippedBait: undefined,
                        equippedFish: undefined,
                    };
                    console.warn(`[APPLY] Created empty inventory after error (no existing inventory found)`);
                } else {
                    console.warn(`[APPLY] Preserving existing inventory after error (${state.inventory.items.length} items) - inventory restoration failed but data preserved`);
                }
            }
        } else {
            console.log(`[APPLY] No inventory data in persisted data for player ${player.id}`);
            // Initialize empty inventory for new players
            state.inventory = {
                items: [],
                maxSlots: 20,
                quickSlots: {},
                equippedRod: undefined,
                equippedBait: undefined,
                equippedFish: undefined,
            };
        }
        
        // Apply level and XP
        if (data.level !== undefined && data.xp !== undefined) {
            try {
                const level = typeof data.level === 'number' ? data.level : 
                            (typeof data.level === 'string' ? parseInt(data.level) : 1);
                const xp = typeof data.xp === 'number' ? data.xp : 
                          (typeof data.xp === 'string' ? parseInt(data.xp) : 0);
                this.levelingSystem.setPlayerLevel(player, level, xp);
            } catch (e) {
                console.error("[APPLY] Failed to restore level and XP:", e);
            }
        }
        
        // Apply currency
        if (data.coins !== undefined) {
            try {
                const coins = typeof data.coins === 'number' ? data.coins : 
                            (typeof data.coins === 'string' ? parseInt(data.coins) : 0);
                this.currencyManager.setCoins(player, coins);
            } catch (e) {
                console.error("[APPLY] Failed to restore currency:", e);
            }
        }
        
        // Apply region data for world switching
        if (data.currentRegionId !== undefined) {
            state.currentRegionId = data.currentRegionId;
        }
        if (data.currentRegionSpawnPoint !== undefined) {
            state.currentRegionSpawnPoint = data.currentRegionSpawnPoint;
        }
        if (data.currentRegionSpawnFacingAngle !== undefined) {
            state.currentRegionSpawnFacingAngle = data.currentRegionSpawnFacingAngle;
        }
        
        // Apply quest data
        if (data.quests) {
            try {
                // Reuse state variable declared at function start
                if (state) {
                    // Restore both active and completed quests
                    state.quests = {
                        active: data.quests.active || {},
                        completed: data.quests.completed || {}
                    };
                    
                    // Notify QuestManager that quest data was restored
                    const GameManager = require('./GameManager').default;
                    if (GameManager.instance.questManager) {
                        GameManager.instance.questManager.onQuestDataRestored(player);
                    }
                } else {
                    console.warn("[APPLY] No player state found when trying to restore quest data");
                }
            } catch (e) {
                console.error("[APPLY] Failed to restore quest data:", e);
            }
        }

        // Old quest chain migration logic removed - simplified approach:
        // - WelcomeDialogNpc now uses simple level/intro quest check (level <= 2 OR intro not completed)
        // - Old quest data is kept in saves but ignored for gameplay logic
        // - No complex rod count checks or quest wiping needed

        // Apply Phshdex data
        if (data.phshdex) {
            try {
                // Reuse state variable declared at function start
                if (state) {
                    state.phshdex = {
                        speciesRecords: data.phshdex.speciesRecords || {},
                        overallStats: data.phshdex.overallStats || {
                            biggestValueCatch: { value: 0, speciesName: '', weight: 0, timestamp: 0 },
                            largestWeightCatch: { weight: 0, speciesName: '', value: 0, timestamp: 0 },
                            totalValueEarned: 0,
                            totalFishCaught: 0,
                            totalXP: 0
                        }
                    };
                    // Sync totalXP from phshdex to LevelingSystem
                    if (state.phshdex.overallStats.totalXP) {
                        this.levelingSystem.setTotalXP(player, state.phshdex.overallStats.totalXP);
                    }
                } else {
                    console.warn("[APPLY] No player state found when trying to restore Phshdex data");
                }
            } catch (e) {
                console.error("[APPLY] Failed to restore Phshdex data:", e);
            }
        }
        
        // Apply daily statistics and quest pool
        // Reuse state variable declared at function start
        if (state) {
            // Restore daily stats (will be reset if date changed)
            if (data.dailyStats) {
                state.dailyStats = data.dailyStats;
            }
            if (data.dailyQuestPool) {
                state.dailyQuestPool = data.dailyQuestPool;
            }
            if (data.dailyQuestPoolDate) {
                state.dailyQuestPoolDate = data.dailyQuestPoolDate;
            }
            if (data.dailyQuestNotificationSentDate) {
                state.dailyQuestNotificationSentDate = data.dailyQuestNotificationSentDate;
            }
            if (data.lastLoginDate) {
                state.lastLoginDate = data.lastLoginDate;
            }
            
            // Check and reset if needed (new day)
            this.checkAndResetDailyStats(player);
        }
    }

    // Helper method to update all UI elements
    public updateAllUI(player: Player): void {
        try {
            
            // Force direct UI updates with explicit console logs
            const inventory = this.getInventoryManager().getInventory(player);
            this.getInventoryManager().updateInventoryUI(player);
            
            const currency = this.currencyManager.getCoins(player);
            this.currencyManager.updateCurrencyUI(player);
            
            const level = this.levelingSystem.getCurrentLevel(player);
            const xp = this.levelingSystem.getCurrentXP(player);
            this.levelingSystem.sendLevelUIUpdate(player);
            
            // Send Phshdex update with restored data
            const state = this.getState(player);
            if (state && state.phshdex) {
                this.sendPhshdexUpdate(player);
            }
            
            try {
                player.ui.sendData({
                    type: 'playerIdentity',
                    playerId: player.id
                });
            } catch (error) {
                 console.error(`[PlayerStateManager] Error sending playerIdentity data to ${player.id}:`, error);
            }
        } catch (e) {
            console.error("[UI] Failed to update UI:", e);
        }
    }

    getState(player: Player) {
        return this.states.get(player);
    }

    isMobile(player: Player) {
        return this.states.get(player)?.isMobile || false;
    }
    setIsMobile(player: Player, isMobile: boolean) {
        const state = this.getState(player);
        if (state) {
            state.isMobile = isMobile;
        }
    }

    async cleanup(player: Player) {
        // Update XP leaderboard before saving (on logout) - fire and forget (non-blocking)
        const { LeaderboardManager } = require('./LeaderboardManager');
        const totalXP = this.levelingSystem.getTotalXP(player);
        if (totalXP > 0) {
            LeaderboardManager.instance.updateXPLeaderboard(player, totalXP).catch((err: any) => {
                console.error(`[Leaderboard] Error updating leaderboard for player ${player.id}:`, err);
            });
        }
        
        // Save player data before cleanup - use flushSave for immediate save on disconnect
        await this.flushSave(player);
        
        const state = this.states.get(player);
        if (state?.fishing.fishingInterval) {
            clearInterval(state.fishing.fishingInterval);
        }
        if (this.getInventoryManager().getEquippedRod(player)) {
            let rod = this.getInventoryManager().getEquippedRod(player);
            if (rod) {
                this.getInventoryManager().cleanup(player);
                this.getInventoryManager().unequipItem(player, rod.id);
            }
        }
        this.states.delete(player);
    }

    getInventory(player: Player): PlayerInventory | undefined {
        const state = this.getState(player);
        return state?.inventory;
    }

    addInventoryItem(player: Player, item: InventoryItem) {
        return this.getInventoryManager().addItem(player, item);
    }
    
    addXP(player: Player, amount: number) {
        return this.levelingSystem.addXP(player, amount);
    }

    updateTotalXP(player: Player, totalXP: number): void {
        const state = this.getState(player);
        if (!state) return;
        
        if (!state.phshdex) {
            state.phshdex = {
                speciesRecords: {},
                overallStats: {
                    biggestValueCatch: { value: 0, speciesName: '', weight: 0, timestamp: 0 },
                    largestWeightCatch: { weight: 0, speciesName: '', value: 0, timestamp: 0 },
                    totalValueEarned: 0,
                    totalFishCaught: 0,
                    totalXP: 0
                }
            };
        }
        
        if (state.phshdex) {
            state.phshdex.overallStats.totalXP = totalXP;
            // Use debounced save - XP updates are frequent, batching is fine
            this.save(player);
        }
    }

    getCurrentLevel(player: Player) {
        return this.levelingSystem.getCurrentLevel(player);
    }

    getCoinBalance(player: Player) {
        return this.currencyManager.getCoins(player);
    }

    addCoins(player: Player, amount: number) {
        return this.currencyManager.addCoins(player, amount);
    }

    updateCurrencyUI(player: Player) {
        this.currencyManager.updateCurrencyUI(player);
    }

    sellFish(player: Player, fishItem: InventoryItem): boolean {
        const state = this.getState(player);
        if (!state || !state.merchant.isInteracting) return false;

        // Check if item exists and is a fish
        if (fishItem.type !== 'fish') return false;

        if (this.isFishEquipped(player, fishItem)) {
            this.getInventoryManager().unequipItem(player, fishItem.type);
        }
        // Attempt to remove fish and add coins
        if (this.getInventoryManager().removeItem(player, fishItem.id)) {
            this.currencyManager.addCoins(player, fishItem.value);
            
            // Update quest progress for inventory-based quests
            const GameManager = require('./GameManager').default;
            if (GameManager.instance.questManager) {
                GameManager.instance.questManager.recalculateInventoryBasedProgress(player);
            }
            
            return true;
        }

        return false;
    }

    removeInventoryItem(player: Player, itemId: string) {
        const result = this.getInventoryManager().removeItem(player, itemId);
        
        // Update quest progress when items are removed
        if (result) {
            const GameManager = require('./GameManager').default;
            if (GameManager.instance.questManager) {
                GameManager.instance.questManager.recalculateInventoryBasedProgress(player);
            }
        }
        
        return result;
    }

    sendGameMessage(player: Player, message: string) {
        this.messageManager.sendGameMessage(message, player);
    }

    sendWeighMessage(text: string, player: Player, options?: { emoji?: string; duration?: number }) {
        this.messageManager.sendWeighMessage(text, player, options);
    }

    sendRichGameMessage(message: string, player: Player, options: { bonus?: string; rarity?: string; duration?: number } = {}) {
        this.messageManager.sendRichGameMessage(message, player, options);
    }

    isFishEquipped(player: Player, fishItem: InventoryItem): boolean {
        return this.getInventoryManager().isFishEquipped(player, fishItem);
    }

    getEquippedFish(player: Player): InventoryItem | null {
        return this.getInventoryManager().getEquippedFish(player);
    }

    buyBoat(player: Player) {
        const BOAT_COST = 250;
        const REQUIRED_LEVEL = 3;
    
        const state = this.getState(player);
        if (!state) return false;
    
        // Check level requirement
        const level = this.getCurrentLevel(player);
        if (level < REQUIRED_LEVEL) {
            player.ui.sendData({
                type: 'merchantSpeak',
                message: `You need to be level ${REQUIRED_LEVEL} to purchase a boat!`
            });
            return false;
        }
    
        // Check if player has enough coins
        const playerCoins = this.getCoinBalance(player);
        if (playerCoins < BOAT_COST) {
            player.ui.sendData({
                type: 'merchantSpeak',
                message: 'Not enough coins!'
            });
            return false;
        }
        
        // Check if player already owns a boat
        const inventory = this.getInventory(player);
        if (inventory?.items.some(item => item.type === 'boat')) {
            player.ui.sendData({
                type: 'merchantSpeak',
                message: 'You already own a boat!'
            });
            return false;
        }
        
        // Purchase the boat
        this.currencyManager.removeCoins(player, BOAT_COST);
       
        
        // Add boat to inventory
        this.getInventoryManager().addItem(player, {
            id: 'basic_boat',
            modelId: 'boat',
            sprite: 'boat_sprite.png',
            name: 'Fishing Boat',
            type: 'boat',
            rarity: 'common',
            value: BOAT_COST,
            quantity: 1,
            metadata: {
                boatStats: {
                    key: Math.random().toString(36).substring(2, 10),
                    health: 100,
                    speed: 8,
                    turnSpeed: 2.5
                }
            }
        });

        // After adding the boat item to inventory
        this.getInventoryManager().equipItem(player, 'basic_boat'); 
        this.sendGameMessage(player, `Successfully purchased a boat!`);
        
        // Auto-spawn the boat after purchase
        console.log(`[PlayerStateManager] Auto-spawning boat for player ${player.id} after purchase`);
        const dockArea = 'spawn_dock'; // Default to spawn_dock, could be made configurable
        const spawnSuccess = this.equipBoatAtDock(player, dockArea);
        
        // Note: equipBoatAtDock will send the "boat has been spawned" notification
        
        // Close the boat shop UI
        player.ui.sendData({
            type: 'hideBoatStore'
        });
        
        // Save immediately after purchase - coins deducted, must save to prevent loss on disconnect
        // Note: flushSave is async but we don't await here to avoid blocking the purchase flow
        // The save will complete in the background
        this.flushSave(player).catch((error) => {
            console.error(`[PlayerStateManager] Failed to save after boat purchase for ${player.id}:`, error);
        });
        
        return true;
    }

    equipBoat(player: Player): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;

        const boatItem = inventory.items.find(item => item.type === 'boat');
        if (!boatItem) return false;

        this.getInventoryManager().equipItem(player, boatItem.id);
        return true;
    }

    equipBoatAtDock(player: Player, dockArea: 'boat_dock' | 'spawn_dock' = 'boat_dock'): boolean {
        const inventory = this.getInventory(player);
        if (!inventory) return false;

        const boatItem = inventory.items.find(item => item.type === 'boat');
        if (!boatItem) {
            this.sendGameMessage(player, "You don't own a boat yet!");
            return false;
        }

        const success = this.getInventoryManager().equipBoatAtDock(player, boatItem, dockArea);
        
        if (success) {
            // Notify player that boat has spawned at dock
            this.sendGameMessage(player, "Your boat has been spawned at the dock!");
            
            // Close the boat shop UI
            player.ui.sendData({
                type: 'hideBoatStore'
            });
        } else {
            this.sendGameMessage(player, "Failed to spawn boat. Please try again.");
        }
        
        return success;
    }

    buyRod(player: Player, rodId: string) {
        const state = this.getState(player);
        if (!state) return false;

        // Get player's inventory and currency
        const inventory = this.getInventory(player);
        const currency = this.currencyManager.getCoins(player);
        if (!inventory || !currency) return false;

        // Find the rod in the catalog
        const rod = FISHING_RODS.find(r => r.id === rodId);
        if (!rod) {
            return false;
        }

        // Check if player already owns this rod
        if (inventory.items.some(item => item.id === rodId)) {
            player.ui.sendData({
                type: 'gameMessage',
                message: 'You already own this rod!'
            });
            return false;
        }

        // Check if player has enough coins
        const playerCoins = this.getCoinBalance(player);
        if (playerCoins < rod.value) {
            player.ui.sendData({
                type: 'gameMessage',
                message: 'Not enough coins!'
            });
            return false;
        }

        // Material requirements for rods (must match RoddyDialogNpc.ts)
        const craftedRodMaterials: Record<string, Array<{ id: string; name: string; required: number }>> = {
            'deepcaster_rod': [
                { id: 'driftwood', name: 'Driftwood', required: 2 }
            ],
            'iron_rod': [
                { id: 'iron_ingot', name: 'Iron Ingot', required: 2 }
            ],
            'gold_rod': [
                { id: 'gold_ingot', name: 'Gold Ingot', required: 2 }
            ]
        };

        // Check if player has required materials
        const materialsList = craftedRodMaterials[rodId];
        if (materialsList) {
            for (const material of materialsList) {
                const playerHas = inventory.items
                    .filter(item => item.id === material.id)
                    .reduce((sum, item) => sum + (item.quantity || 0), 0);
                
                if (playerHas < material.required) {
                    player.ui.sendData({
                        type: 'gameMessage',
                        message: `Not enough ${material.name}! Need ${material.required}, have ${playerHas}`
                    });
                    return false;
                }
            }
        }
        
        // Purchase the rod
        // Subtract coins
        this.currencyManager.removeCoins(player, rod.value);

        // Remove materials from inventory
        if (materialsList) {
            for (const material of materialsList) {
                let remainingToRemove = material.required;
                const materialItems = inventory.items.filter(item => item.id === material.id);
                
                for (const item of materialItems) {
                    if (remainingToRemove <= 0) break;
                    
                    const removeFromThis = Math.min(item.quantity || 0, remainingToRemove);
                    this.getInventoryManager().removeItem(player, material.id, removeFromThis);
                    remainingToRemove -= removeFromThis;
                }
            }
        }
        
        // Create a deep copy of the rod metadata to avoid modifying the catalog
        const rodMetadata = JSON.parse(JSON.stringify(rod.metadata || {}));
        
        // Add rod to inventory with initialized metadata
        this.getInventoryManager().addItem(player, {
            id: rod.id,
            modelId: rod.modelId,
            sprite: rod.sprite,
            name: rod.name,
            type: 'rod',
            rarity: rod.rarity,
            value: rod.value,
            quantity: 1,
            description: rod.description, // Add missing description field
            specialAbility: rod.specialAbility, // Add special ability field too
            metadata: rodMetadata
        });
        
        this.getInventoryManager().equipItem(player, rod.id);
        this.sendGameMessage(player, `Successfully purchased ${rod.name}!`);

        player.ui.sendData({
            type: 'hideRodStore',
        });
        
        // Save immediately after purchase - coins deducted, must save to prevent loss on disconnect
        // Note: flushSave is async but we don't await here to avoid blocking the purchase flow
        // The save will complete in the background
        this.flushSave(player).catch((error) => {
            console.error(`[PlayerStateManager] Failed to save after rod purchase for ${player.id}:`, error);
        });
        
        return true;
    }

    private initializeDevState(player: Player) {
        // Set to max level with 0 XP
       // this.levelingSystem.setPlayerLevel(player, 20, 0);

        // Add all rods from catalog
        FISHING_RODS.forEach(rod => {
            this.addInventoryItem(player, { ...rod, quantity: 1 });
        });

        // Set best rod (Hytopian Rod) as equipped
        this.getInventoryManager().equipItem(player, 'hytopian_rod');
    }

    public initDevMode(player: Player) {
        this.initializeDevState(player);
    }

    /**
     * Apply damage to a player's fishing rod
     * @param player The player
     * @param rodId The rod ID to damage
     * @param damageAmount Optional custom damage amount
     * @returns true if successful
     */
    applyRodDamage(player: Player, rodId: string, damageAmount?: number): boolean {
        return this.getInventoryManager().applyRodDamage(player, rodId, damageAmount, this);
    }

    /**
     * Debounced save - batches multiple save requests into a single save after 500ms of inactivity.
     * Use this for frequent operations like quest progress, XP updates, inventory changes.
     */
    public save(player: Player): void {
        const existingTimeout = this._saveTimeouts.get(player.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        
        const timeout = setTimeout(() => {
            this._doSave(player);
            this._saveTimeouts.delete(player.id);
        }, 500);
        
        this._saveTimeouts.set(player.id, timeout);
    }

    /**
     * Immediate save - bypasses debouncing and saves immediately.
     * Use this for critical operations like:
     * - Player disconnecting (cleanup)
     * - Coins/currency being deducted (purchases)
     * - World/region switching
     * - Any operation where data loss would be critical
     */
    public async flushSave(player: Player): Promise<void> {
        const existingTimeout = this._saveTimeouts.get(player.id);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        await this._doSave(player);
        this._saveTimeouts.delete(player.id);
    }

    /**
     * Internal save method - performs the actual save operation.
     * Renamed from savePlayerData() to _doSave() to match Frontiers pattern.
     */
    private async _doSave(player: Player): Promise<void> {
        
        if (CONFIG.DEVELOPMENT_MODE) {
            console.log(`[SAVE] Development mode - skipping save for player ${player.id}`);
            return;
        }
        
        // Check if saving is disabled
        if (!CONFIG.SAVE_PLAYER_DATA) {
            console.log(`[SAVE] Saving disabled - skipping save for player ${player.id}`);
            return;
        }
        try {
            // Get state - inventory is now part of state
            const state = this.getState(player);
            
            // VALIDATION: Check that required data exists
            if (!state) {
                console.error(`[SAVE] Cannot save - player state is missing for ${player.id}`);
                return;
            }
            
            if (!state.inventory) {
                console.error(`[SAVE] Cannot save - inventory is missing for ${player.id}`);
                return;
            }
            
            // VALIDATION: Check that critical values are valid
            const level = this.levelingSystem.getCurrentLevel(player);
            if (typeof level !== 'number' || level < 0 || isNaN(level)) {
                console.error(`[SAVE] Cannot save - invalid level value (${level}) for ${player.id}`);
                return;
            }
            
            if (!Array.isArray(state.inventory.items)) {
                console.error(`[SAVE] Cannot save - invalid inventory structure for ${player.id}`);
                return;
            }
            
            // Get inventory items from state
            const itemsToSave = state.inventory.items || [];
            
            // SAFETY CHECK: Validate that we're not saving empty data for an existing player
            // Check if player has existing persisted data
            const existingData = player.getPersistedData();
            const hasExistingData = existingData && Object.keys(existingData).length > 0;
            
            // If player has existing data but we're about to save empty/invalid data, log warning
            if (hasExistingData && itemsToSave.length === 0 && level === 1) {
                console.warn(`[SAVE] WARNING: Attempting to save empty data for player ${player.id} who has existing persisted data. This may indicate a data loss issue.`);
            }
            
            // BAIT CAPPING: Cap bait items at 20 before saving
            const BAIT_ITEM_CAP = 20;
            let fixedAnyItems = false;
            if (itemsToSave && Array.isArray(itemsToSave)) {
                itemsToSave.forEach((item: any) => {
                    if (item.type === 'bait' && item.quantity > BAIT_ITEM_CAP) {
                        item.quantity = BAIT_ITEM_CAP;
                        fixedAnyItems = true;
                    }
                });
            }
            
            
            // Serialize inventory items using ID-based format (much smaller and faster)
            // Only save essential metadata that can't be reconstructed (fish stats, rod damage, etc.)
            const serializedItems = itemsToSave.map((item: InventoryItem) => {
                // For fish, preserve the full ID (includes timestamp for uniqueness)
                // For other items, use the base ID
                let itemId: string;
                if (item.type === 'fish') {
                    // Fish IDs are unique per catch (species_timestamp), preserve full ID
                    itemId = item.id;
                } else {
                    // Extract base ID for other items (rods, bait, etc.)
                    itemId = this.extractBaseItemId(item.id, item.type);
                }
                
                // Determine what metadata needs to be preserved
                const essentialMetadata: any = {};
                
                // Fish: preserve all fishStats (weight, size, species, trophy status, etc.)
                // Also preserve the calculated value (can't be reconstructed from catalog alone)
                if (item.type === 'fish' && item.metadata?.fishStats) {
                    essentialMetadata.fishStats = {
                        ...item.metadata.fishStats,
                        value: item.value // Preserve calculated value (based on weight/rarity)
                    };
                }
                
                // Rods: preserve health/damage if not at 100%
                if (item.type === 'rod' && item.metadata?.rodStats) {
                    const rodStats = item.metadata.rodStats;
                    if (rodStats.health !== undefined && rodStats.health < 100) {
                        essentialMetadata.rodStats = {
                            health: rodStats.health
                        };
                    }
                }
                
                // Boats: preserve boatStats (health, key, etc.)
                if (item.type === 'boat' && item.metadata?.boatStats) {
                    essentialMetadata.boatStats = item.metadata.boatStats;
                }
                
                // Items with custom metadata (chests with contents, ores with contents, etc.)
                if (item.metadata?.contents) {
                    essentialMetadata.contents = item.metadata.contents;
                }
                
                // Build serialized item
                const serialized: any = {
                    itemId: itemId,
                    quantity: item.quantity
                };
                
                // Only include metadata if there's something to preserve
                if (Object.keys(essentialMetadata).length > 0) {
                    serialized.metadata = essentialMetadata;
                }
                
                return serialized;
            });
            
            const cleanInventory = {
                items: serializedItems,
                maxSlots: state.inventory.maxSlots || 20,
                equippedRod: state.inventory.equippedRod,
                equippedBait: state.inventory.equippedBait,
                equippedFish: state.inventory.equippedFish,
                quickSlots: state.inventory.quickSlots ? JSON.parse(JSON.stringify(state.inventory.quickSlots)) : {}
            };
            
            // Create clean copies of quests and phshdex to avoid any circular references
            const cleanQuests = JSON.parse(JSON.stringify(state.quests || { active: {}, completed: {} }));
            const cleanPhshdex = JSON.parse(JSON.stringify(state.phshdex || {}));
            
            const dataToSave = {
                saveVersion: 2, // Version 2: ID-based serialization
                inventory: cleanInventory,
                level: this.levelingSystem.getCurrentLevel(player),
                xp: this.levelingSystem.getCurrentXP(player),
                coins: this.currencyManager.getCoins(player),
                quests: cleanQuests, // Clean quest data
                phshdex: cleanPhshdex, // Clean Phshdex data
                dailyStats: state.dailyStats ? JSON.parse(JSON.stringify(state.dailyStats)) : undefined,
                dailyQuestPool: state.dailyQuestPool ? [...state.dailyQuestPool] : undefined,
                dailyQuestPoolDate: state.dailyQuestPoolDate,
                dailyQuestNotificationSentDate: state.dailyQuestNotificationSentDate,
                lastLoginDate: state.lastLoginDate,
                // Region data for world switching
                currentRegionId: state.currentRegionId,
                currentRegionSpawnPoint: state.currentRegionSpawnPoint,
                currentRegionSpawnFacingAngle: state.currentRegionSpawnFacingAngle
            };
            
            // SAFETY CHECK: Validate quest data before saving
            const questKeys = Object.keys(cleanQuests.active || {}).length + Object.keys(cleanQuests.completed || {}).length;
            if (hasExistingData && questKeys === 0) {
                // Check if existing data had quests
                const existingQuests = existingData.quests;
                const existingActiveCount = (existingQuests && typeof existingQuests === 'object' && existingQuests !== null && 'active' in existingQuests) 
                    ? Object.keys((existingQuests as any).active || {}).length 
                    : 0;
                const existingCompletedCount = (existingQuests && typeof existingQuests === 'object' && existingQuests !== null && 'completed' in existingQuests) 
                    ? Object.keys((existingQuests as any).completed || {}).length 
                    : 0;
                const existingQuestKeys = existingActiveCount + existingCompletedCount;
                if (existingQuestKeys > 0) {
                    // Check if state.quests is actually initialized (not just defaulted)
                    if (!state.quests) {
                        console.error(`[SAVE] CRITICAL: Player state.quests is undefined for player ${player.id}. State may not be initialized properly.`);
                        console.error(`[SAVE] This indicates a state initialization bug - quests should always be initialized.`);
                        console.error(`[SAVE] Aborting save to prevent data loss`);
                        return; // Don't save - prevent data loss
                    }
                    
                    // Additional validation: Check if state.quests has the expected structure
                    if (!state.quests.active || !state.quests.completed) {
                        console.error(`[SAVE] CRITICAL: Player state.quests has invalid structure for player ${player.id}.`);
                        console.error(`[SAVE] Expected: { active: {}, completed: {} }, Got:`, state.quests);
                        console.error(`[SAVE] Aborting save to prevent data loss`);
                        return; // Don't save - prevent data loss
                    }
                    
                    console.error(`[SAVE] CRITICAL: Attempting to save empty quest data for player ${player.id} who had ${existingQuestKeys} quest(s). This would cause data loss!`);
                    console.error(`[SAVE] Existing quests:`, existingQuests);
                    console.error(`[SAVE] Current state.quests:`, {
                        active: Object.keys(state.quests.active || {}).length,
                        completed: Object.keys(state.quests.completed || {}).length,
                        activeQuests: Object.keys(state.quests.active || {}),
                        completedQuests: Object.keys(state.quests.completed || {}).slice(0, 5) // First 5 for brevity
                    });
                    console.error(`[SAVE] Aborting save to prevent data loss`);
                    return; // Don't save - prevent data loss
                }
            }
            
            // Save to player's persisted data (Hytopia SDK method)
            try {
                player.setPersistedData(dataToSave);
                console.log(`[SAVE] Successfully saved data for player ${player.id} (level: ${dataToSave.level}, items: ${cleanInventory.items.length}, quests: ${questKeys})`);
            } catch (saveError) {
                console.error(`[SAVE] Error calling setPersistedData for player ${player.id}:`, saveError);
                throw saveError; // Re-throw to be caught by outer catch
            }
            
        } catch (e) {
            console.error(`[SAVE] Error saving player data for player ${player.id}:`, e);
            // Don't throw - we don't want to crash the game if save fails
            // But log it so we can investigate
        }
    }

    private createDefaultState(): PlayerState {
        return {
            fishing: {
                isCasting: false,
                castPower: 0,
                isReeling: false,
                lastInputState: { ml: false },
                isPlayerFishing: false,
                fishDepth: 0,
                currentCatch: null,
                isJigging: false,
                fishVelocityY: 0,
                fishingInterval: null,
                reelingGame: {
                    isReeling: false,
                    fishPosition: 0.5,
                    barPosition: 0.5,
                    fishVelocity: 0.005,
                    baseFishVelocity: 0.005,
                    progress: 25,
                    currentCatch: null,
                    time: 0,
                    amplitude: 0.5,
                    frequency: 0.05,
                    basePosition: 0.5,
                    barVelocity: 0 // Initialize bar velocity to 0 (no momentum at start)
                },
            },
            merchant: {
                isInteracting: false,
                currentMerchant: null,
                selectedOption: null,
                merchantResponse: "",
                catchOfTheDay: null,
                currentQuestFish: null
            },
            swimming: {
                isSwimming: false,
                breath: 100.00
            },
            isMobile: false,
            // Initialize quests object in default state
            quests: { 
                active: {},
                completed: {}
            },
            // Initialize Phshdex with empty records
            phshdex: {
                speciesRecords: {},
                overallStats: {
                    biggestValueCatch: {
                        value: 0,
                        speciesName: '',
                        weight: 0,
                        timestamp: 0
                    },
                    largestWeightCatch: {
                        weight: 0,
                        speciesName: '',
                        value: 0,
                        timestamp: 0
                    },
                    totalValueEarned: 0,
                    totalFishCaught: 0,
                    totalXP: 0
                }
            },
            // Initialize daily statistics
            dailyStats: this.createDefaultDailyStats(),
            // Initialize daily quest pool
            dailyQuestPool: [],
            dailyQuestPoolDate: this.getTodayDateString(),
            dailyQuestNotificationSentDate: undefined, // Will be set when notification is sent
            lastLoginDate: undefined, // Will be set when player logs in
            // Initialize inventory - single source of truth in PlayerState
            inventory: {
                items: [],
                maxSlots: 20,
                quickSlots: {},
                equippedRod: undefined,
                equippedBait: undefined,
                equippedFish: undefined,
            }
        };
    }
    
    /**
     * Creates default daily statistics structure
     */
    private createDefaultDailyStats(): DailyStatistics {
        const today = this.getTodayDateString();
        return {
            date: today,
            fishCaught: 0,
            fishByRarity: {
                common: 0,
                uncommon: 0,
                rare: 0,
                epic: 0,
                legendary: 0
            },
            baitUsed: 0,
            baitUsedByType: {},
            chestsOpened: 0,
            locationsVisited: [],
            fishWeighed: 0,
            uniqueFishWeighed: [],
            fishWeighedByWeight: {},
            leaderboardFishWeighed: 0
        };
    }
    
    /**
     * Gets today's date as YYYY-MM-DD string
     */
    private getTodayDateString(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Checks if daily stats need to be reset (new day)
     */
    public checkAndResetDailyStats(player: Player): boolean {
        const state = this.getState(player);
        if (!state) return false;
        
        const today = this.getTodayDateString();
        const lastDate = state.dailyStats?.date || state.dailyQuestPoolDate || today;
        
        if (lastDate !== today) {
            // New day - reset daily stats and quest pool
            state.dailyStats = this.createDefaultDailyStats();
            state.dailyQuestPool = [];
            state.dailyQuestPoolDate = today;
            state.dailyQuestNotificationSentDate = undefined; // Reset notification flag for new day
            return true; // Indicates reset happened
        }
        
        return false; // No reset needed
    }
    
    /**
     * Gets or creates daily statistics for a player
     */
    public getDailyStats(player: Player): DailyStatistics {
        const state = this.getState(player);
        if (!state) {
            throw new Error(`[PlayerStateManager] No state found for player ${player.id}`);
        }
        
        // Check if reset is needed
        this.checkAndResetDailyStats(player);
        
        // Ensure daily stats exist
        if (!state.dailyStats) {
            state.dailyStats = this.createDefaultDailyStats();
        }
        
        return state.dailyStats;
    }
    
    /**
     * Increments a daily statistic counter
     */
    public incrementDailyStat(player: Player, stat: keyof DailyStatistics, amount: number = 1): void {
        const dailyStats = this.getDailyStats(player);
        if (typeof dailyStats[stat] === 'number') {
            (dailyStats[stat] as number) += amount;
        }
    }
    
    /**
     * Increments bait usage by type
     */
    public incrementBaitUsedByType(player: Player, baitType: string): void {
        const dailyStats = this.getDailyStats(player);
        dailyStats.baitUsed += 1;
        dailyStats.baitUsedByType[baitType] = (dailyStats.baitUsedByType[baitType] || 0) + 1;
    }
    
    /**
     * Adds a location to visited locations (if not already present)
     */
    public addLocationVisited(player: Player, locationId: string): void {
        const dailyStats = this.getDailyStats(player);
        if (!dailyStats.locationsVisited.includes(locationId)) {
            dailyStats.locationsVisited.push(locationId);
        }
    }
    
    /**
     * Records a fish being weighed
     */
    public recordFishWeighed(player: Player, fishSpecies: string, weight: number, madeLeaderboard: boolean = false): void {
        const dailyStats = this.getDailyStats(player);
        dailyStats.fishWeighed += 1;
        
        // Track unique fish species
        if (!dailyStats.uniqueFishWeighed.includes(fishSpecies)) {
            dailyStats.uniqueFishWeighed.push(fishSpecies);
        }
        
        // Track by weight thresholds
        const thresholds = [50, 100, 200, 250];
        for (const threshold of thresholds) {
            if (weight >= threshold) {
                const key = threshold.toString();
                dailyStats.fishWeighedByWeight[key] = (dailyStats.fishWeighedByWeight[key] || 0) + 1;
            }
        }
        
        // Track leaderboard fish
        if (madeLeaderboard) {
            dailyStats.leaderboardFishWeighed += 1;
        }
    }

    async printAllPersistedData() {
        try {
            const fs = require('fs');
            const path = require('path');
            const persistenceDir = path.join(process.cwd(), 'dev', 'persistence');
            
            
            if (fs.existsSync(persistenceDir)) {
                const files = fs.readdirSync(persistenceDir)
                    .filter((file: string) => file.endsWith('.json'));
                
                if (files.length === 0) {
                    return;
                }
                
                
                // Sort files by modification time (newest first)
                const sortedFiles = files.map((file: string) => ({
                    file,
                    mtime: fs.statSync(path.join(persistenceDir, file)).mtime
                }))
                .sort((a: { mtime: Date }, b: { mtime: Date }) => b.mtime.getTime() - a.mtime.getTime());
                
                for (const {file, mtime} of sortedFiles) {
                    const filePath = path.join(persistenceDir, file);
                    const fileData = fs.readFileSync(filePath, 'utf8');
                    let data;
                    
                    try {
                        data = JSON.parse(fileData);
                    } catch (e) {
                        continue;
                    }
                    
                    const lastModified = new Date(mtime).toLocaleString();
                    
                    
                    // Print summary of data
                    if (file.startsWith('player-')) {
                        // For player data files
                        const inventory = data.inventory?.items?.length || 0;
                        const level = data.level || 'N/A';
                        const xp = data.xp || 'N/A';
                        const coins = data.coins || 'N/A';
                        
                    } 
                }
            } 
            
        } catch (e) {
            console.error("Error printing persisted data:", e);
        }
    }

    // Add method to update Phshdex when a fish is caught
    public updatePhshdexRecord(player: Player, fishItem: InventoryItem, equippedRod?: InventoryItem, equippedHook?: InventoryItem, equippedBait?: InventoryItem): void {
        const state = this.getState(player);
        if (!state || !state.phshdex || !fishItem.metadata?.fishStats) {
            console.warn('[PHSHDEX] Cannot update record - missing state or fish data');
            return;
        }

        const speciesName = fishItem.name;
        const weight = fishItem.metadata.fishStats.weight;
        const value = fishItem.value;
        const rarity = fishItem.rarity;
        const timestamp = fishItem.metadata.fishStats.timestamp || Date.now();

        // Get player position for location tracking
        const playerEntity = this.getInventoryManager().getEquippedRod(player); // Just using this to get player context
        const location = ""; // TODO: Add location tracking if needed

        // Initialize species record if it doesn't exist
        if (!state.phshdex.speciesRecords[speciesName]) {
            state.phshdex.speciesRecords[speciesName] = {
                name: speciesName,
                bestWeight: weight,
                bestValue: value,
                bestRarity: rarity,
                totalCaught: 1,
                firstCaughtTimestamp: timestamp,
                bestCatchData: {
                    weight,
                    value,
                    rarity,
                    timestamp,
                    rodUsed: equippedRod?.name,
                    hookUsed: equippedHook?.name,
                    baitUsed: equippedBait?.name,
                    location
                }
            };
            
            // Grant XP bonus for new species
            const newSpeciesXPBonus = 5;
            this.addXP(player, newSpeciesXPBonus);
            
            // Show achievement popup notification
            this.messageManager.sendRichGameMessage('New Species!', player, {
                bonus: `+${newSpeciesXPBonus} XP`,
                rarity: 'epic',
                duration: 5000
            });
            
        } else {
            // Update existing record
            const record = state.phshdex.speciesRecords[speciesName];
            record.totalCaught++;

            // Check if this is a new best weight
            if (weight > record.bestWeight) {
                record.bestWeight = weight;
            }

            // Check if this is a new best value
            if (value > record.bestValue) {
                record.bestValue = value;
                record.bestRarity = rarity;
                record.bestCatchData = {
                    weight,
                    value,
                    rarity,
                    timestamp,
                    rodUsed: equippedRod?.name,
                    hookUsed: equippedHook?.name,
                    baitUsed: equippedBait?.name,
                    location
                };
            }
        }

        // Update overall stats
        const stats = state.phshdex.overallStats;
        stats.totalFishCaught++;
        stats.totalValueEarned += value;

        // Check for overall records
        if (value > stats.biggestValueCatch.value) {
            stats.biggestValueCatch = {
                value,
                speciesName,
                weight,
                timestamp
            };
        }

        if (weight > stats.largestWeightCatch.weight) {
            stats.largestWeightCatch = {
                weight,
                speciesName,
                value,
                timestamp
            };
        }

        // Send updated phshdex data to UI
        this.sendPhshdexUpdate(player);

        // Save the updated state - debounced since fish catches are frequent
        this.save(player);
        
    }

    // Method to send Phshdex data to UI
    public sendPhshdexUpdate(player: Player): void {
        const state = this.getState(player);
        if (!state || !state.phshdex) return;
        
        player.ui.sendData({
            type: 'phshdexUpdate',
            phshdexData: state.phshdex
        });
    }

    // Method to get Phshdex data for a player
    public getPhshdexData(player: Player): { speciesRecords: { [speciesName: string]: PhshdexSpeciesRecord }; overallStats: PhshdexOverallStats } | null {
        const state = this.getState(player);
        if (!state?.phshdex) return null;
        
        return {
            speciesRecords: state.phshdex.speciesRecords,
            overallStats: state.phshdex.overallStats
        };
    }

    /**
     * Extract base item ID from a potentially dynamic ID
     * Fish IDs are like "mackerel_1234567890", rods/baits are static
     */
    private extractBaseItemId(itemId: string, itemType: ItemType): string {
        // Fish IDs have timestamp suffixes: "species_timestamp"
        if (itemType === 'fish') {
            // Extract species name (everything before the last underscore)
            const parts = itemId.split('_');
            if (parts.length > 1) {
                // Remove the last part (timestamp) and rejoin
                return parts.slice(0, -1).join('_');
            }
        }
        // All other items use their ID as-is
        return itemId;
    }

    /**
     * Reconstruct an InventoryItem from serialized data (ID-based format)
     */
    private reconstructItemFromSerialized(serializedItem: any): InventoryItem | null {
        try {
            const { ItemFactory } = require('./Inventory/ItemFactory');
            const { FISHING_RODS } = require('./Inventory/RodCatalog');
            const { FISH_CATALOG } = require('./Fishing/PhshTwoFIshCatalog');
            const { BAIT_CATALOG, BaitService } = require('./Bait/BaitCatalog');
            const { ITEM_CATALOG } = require('./Crafting/ItemCatalog');
            
            const itemId = serializedItem.itemId;
            const quantity = serializedItem.quantity || 1;
            const metadata = serializedItem.metadata || {};
            
            // Try to determine item type and reconstruct
            // Check if it's a rod
            const rod = FISHING_RODS.find((r: InventoryItem) => r.id === itemId);
            if (rod) {
                const reconstructed: InventoryItem = {
                    ...rod,
                    quantity,
                    metadata: {
                        ...rod.metadata,
                        ...metadata // Override with saved metadata (e.g., rod health)
                    }
                };
                return reconstructed;
            }
            
            // Check if it's a fish (by checking FISH_CATALOG)
            // Fish IDs are in format "species_timestamp_random", extract base species name
            // Match the pattern used in FishingMiniGame.ts for consistency
            if (itemId.includes('_') && metadata.fishStats) {
                const idParts = itemId.split('_');
                // Fish IDs have format: species_timestamp_random (3+ parts)
                // Extract just the species name (first part) to match FISH_CATALOG IDs
                const baseSpeciesId = idParts.length >= 3 
                    ? idParts.slice(0, -2).join('_')  // Remove last 2 parts (timestamp_random)
                    : idParts[0];                      // Fallback: just use first part
                const fishData = FISH_CATALOG.find((f: any) => {
                    // Try matching by catalog ID or by converting name to ID format
                    const catalogId = f.id || f.name.toLowerCase().replace(/\s+/g, '_');
                    return catalogId === baseSpeciesId || f.id === baseSpeciesId;
                });
                
                if (fishData) {
                    // Reconstruct fish with preserved stats and full ID
                    return {
                        id: itemId, // Preserve full ID with timestamp
                        modelId: fishData.modelData?.modelUri || `models/items/${baseSpeciesId}.gltf`,
                        sprite: fishData.sprite || fishData.modelData?.sprite || `${baseSpeciesId}.png`,
                        name: fishData.name,
                        type: 'fish',
                        rarity: metadata.fishStats.rarity || fishData.rarity || 'common',
                        value: metadata.fishStats.value || fishData.value || 0,
                        quantity,
                        metadata: {
                            fishStats: metadata.fishStats
                        }
                    };
                }
            }
            
            // Check if it's bait
            const baitDef = BAIT_CATALOG[itemId];
            if (baitDef) {
                const baitItem = BaitService.createBaitItem(itemId, quantity);
                if (baitItem) {
                    return baitItem;
                }
            }
            
            // Check if it's a boat (boats are not in catalogs, they're created manually)
            // Boats are identified by either the itemId 'basic_boat' or by having boatStats metadata
            if (itemId === 'basic_boat' || metadata.boatStats) {
                // Reconstruct boat from saved data
                return {
                    id: itemId,
                    modelId: 'boat',
                    sprite: 'boat_sprite.png',
                    name: 'Fishing Boat',
                    type: 'boat',
                    rarity: 'common',
                    value: 250, // Default boat cost
                    quantity,
                    metadata: {
                        boatStats: metadata.boatStats || {
                            key: Math.random().toString(36).substring(2, 10),
                            health: 100,
                            speed: 8,
                            turnSpeed: 2.5
                        }
                    }
                };
            }
            
            // Check if it's in ITEM_CATALOG (crafted items, etc.)
            const itemDef = ITEM_CATALOG.find((item: any) => item.id === itemId);
            if (itemDef) {
                return {
                    id: itemId,
                    modelId: itemDef.modelData?.modelUri || `models/items/${itemId}.gltf`,
                    sprite: itemDef.modelData?.sprite || `${itemId}.png`,
                    name: itemDef.name,
                    type: itemDef.type || 'item', // ITEM_CATALOG doesn't always have type, default to 'item'
                    rarity: itemDef.rarity || 'common',
                    value: itemDef.baseValue || itemDef.value || 0, // ITEM_CATALOG uses baseValue
                    quantity,
                    description: itemDef.description,
                    metadata: itemDef.metadata || {}
                };
            }
            
            // Try LOOT_CATALOG (chests, ores, etc.)
            try {
                const lootItem = ItemFactory.createInventoryItemFromLootId(itemId, quantity);
                if (lootItem && metadata.contents) {
                    // Preserve custom contents (quest chests, etc.)
                    lootItem.metadata = {
                        ...lootItem.metadata,
                        contents: metadata.contents
                    };
                }
                if (lootItem && metadata.boatStats) {
                    // Preserve boat stats
                    lootItem.metadata = {
                        ...lootItem.metadata,
                        boatStats: metadata.boatStats
                    };
                }
                return lootItem;
            } catch (e) {
                // Item not found in LOOT_CATALOG, continue
            }
            
            console.warn(`[RECONSTRUCT] Could not reconstruct item with ID: ${itemId}`);
            return null;
        } catch (error) {
            console.error(`[RECONSTRUCT] Error reconstructing item:`, error);
            return null;
        }
    }

}


