import { PersistenceManager } from 'hytopia';
import { Player } from 'hytopia';
import { FISH_CATALOG, type FishData } from './Fishing/PhshTwoFIshCatalog';

export interface LeaderboardEntry {
    playerName: string;
    playerId: string;
    weight: number;
    value: number;
    timestamp: number;
    rarity?: string;
    location?: string;
}

export interface SpeciesLeaderboard {
    byWeight: LeaderboardEntry[];
    byValue: LeaderboardEntry[];
}

export interface XPLeaderboardEntry {
    playerName: string;
    playerId: string;
    totalXP: number;
    timestamp: number;
}

export interface EarnersLeaderboardEntry {
    playerName: string;
    playerId: string;
    totalEarned: number;
    timestamp: number;
}

export class LeaderboardManager {
    private static _instance: LeaderboardManager;
    private leaderboards: Map<string, SpeciesLeaderboard> = new Map();
    private topXP: XPLeaderboardEntry[] = [];
    private topEarners: EarnersLeaderboardEntry[] = [];
    private readonly MAX_ENTRIES = 3; // Top 3 entries per category
    private readonly MAX_LEADERBOARD_ENTRIES = 20; // Top 20 for XP and Earners
    private playerStateManager?: any; // Will be set when initialized
    
    private constructor() {
    }
    
    public static get instance(): LeaderboardManager {
        if (!LeaderboardManager._instance) {
            LeaderboardManager._instance = new LeaderboardManager();
        }
        return LeaderboardManager._instance;
    }
    
    public async initialize(playerStateManager?: any): Promise<void> {
        try {
            if (playerStateManager) {
                this.playerStateManager = playerStateManager;
            }
            
            // Load species leaderboards (legacy format)
            const leaderboardData = await PersistenceManager.instance.getGlobalData('fishLeaderboards') as any;
            
            if (leaderboardData) {
                // Convert from object to Map and ensure arrays are sorted
                for (const [species, leaderboard] of Object.entries(leaderboardData)) {
                    const lb = leaderboard as SpeciesLeaderboard;
                    // Ensure arrays are sorted on load
                    if (lb.byWeight) {
                        lb.byWeight.sort((a, b) => b.weight - a.weight);
                    }
                    if (lb.byValue) {
                        lb.byValue.sort((a, b) => b.value - a.value);
                    }
                    this.leaderboards.set(species, lb);
                }
            } 
            
            // Load XP and Earners leaderboards from global data
            const globalLeaderboardData = await PersistenceManager.instance.getGlobalData('globalLeaderboards') as any;
            
            if (globalLeaderboardData) {
                if (globalLeaderboardData.topXP && Array.isArray(globalLeaderboardData.topXP)) {
                    this.topXP = globalLeaderboardData.topXP;
                    this.topXP.sort((a, b) => b.totalXP - a.totalXP);
                    console.log(`[LEADERBOARD] Loaded ${this.topXP.length} XP entries from persisted data`);
                } else {
                    // CRITICAL: Don't overwrite if we have existing data
                    if (this.topXP.length === 0) {
                        this.topXP = [];
                        console.log(`[LEADERBOARD] No valid topXP data found, initialized empty array`);
                    } else {
                        console.warn(`[LEADERBOARD] Invalid topXP data in persisted storage, preserving existing ${this.topXP.length} entries`);
                    }
                }
                
                if (globalLeaderboardData.topEarners && Array.isArray(globalLeaderboardData.topEarners)) {
                    this.topEarners = globalLeaderboardData.topEarners;
                    this.topEarners.sort((a, b) => b.totalEarned - a.totalEarned);
                    console.log(`[LEADERBOARD] Loaded ${this.topEarners.length} Earners entries from persisted data`);
                } else {
                    // CRITICAL: Don't overwrite if we have existing data
                    if (this.topEarners.length === 0) {
                        this.topEarners = [];
                        console.log(`[LEADERBOARD] No valid topEarners data found, initialized empty array`);
                    } else {
                        console.warn(`[LEADERBOARD] Invalid topEarners data in persisted storage, preserving existing ${this.topEarners.length} entries`);
                    }
                }
            } else {
                // CRITICAL: Only set to empty if we truly have no data
                // Don't overwrite existing in-memory data
                if (this.topXP.length === 0) {
                    this.topXP = [];
                    console.log(`[LEADERBOARD] No persisted globalLeaderboards data found, initialized empty topXP`);
                } else {
                    console.warn(`[LEADERBOARD] No persisted data found but have ${this.topXP.length} existing XP entries, preserving them`);
                }
                if (this.topEarners.length === 0) {
                    this.topEarners = [];
                    console.log(`[LEADERBOARD] No persisted globalLeaderboards data found, initialized empty topEarners`);
                } else {
                    console.warn(`[LEADERBOARD] No persisted data found but have ${this.topEarners.length} existing Earners entries, preserving them`);
                }
            }
            
            // Populate historical catches if leaderboards are empty or missing entries
            await this.populateHistoricalCatches();
        } catch (e) {
            console.error('[LEADERBOARD] Error loading leaderboards:', e);
        }
    }
    
    /**
     * Populates leaderboards with historical catches for trophy fish species.
     * Creates medium-sized catches (60-70% of max weight) so new players don't always see empty leaderboards.
     */
    private async populateHistoricalCatches(): Promise<void> {
        try {
            
            // Get all trophy fish from catalog
            const trophyFish = FISH_CATALOG.filter(fish => fish.isTrophy === true);
            
            let addedCount = 0;
            const historicalPlayerId = 'historical_angler';
            const historicalPlayerName = 'Historical Angler';
            
            // Rarity multipliers (same as game logic)
            const rarityMultipliers: { [key: string]: number } = {
                'common': 1.0,
                'uncommon': 1.5,
                'rare': 2.0,
                'epic': 3.0,
                'legendary': 5.0,
                'mythic': 6.0
            };
            
            for (const fish of trophyFish) {
                // Check if this species already has leaderboard entries
                const existingLeaderboard = this.leaderboards.get(fish.name);
                const hasEntries = existingLeaderboard && 
                    (existingLeaderboard.byWeight.length > 0 || existingLeaderboard.byValue.length > 0);
                
                // Only populate if no entries exist
                if (!hasEntries) {
                    // Calculate medium weight (60-70% of max weight range)
                    const weightRange = fish.maxWeight - fish.minWeight;
                    const mediumWeight = fish.minWeight + (weightRange * 0.65); // 65% through the range
                    
                    // Calculate value using same formula as game: baseValue * (weight / minWeight) * rarityMultiplier
                    const multiplier = rarityMultipliers[fish.rarity] || 1.0;
                    const value = Math.floor(fish.baseValue * (mediumWeight / fish.minWeight) * multiplier);
                    
                    // Create historical entry
                    const historicalEntry: LeaderboardEntry = {
                        playerName: historicalPlayerName,
                        playerId: historicalPlayerId,
                        weight: Math.round(mediumWeight * 100) / 100, // Round to 2 decimals
                        value: value,
                        timestamp: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000), // Random timestamp within last 30 days
                        rarity: fish.rarity,
                        location: 'Historical Catch'
                    };
                    
                    // Get or create leaderboard for this species
                    let speciesLeaderboard = this.leaderboards.get(fish.name);
                    if (!speciesLeaderboard) {
                        speciesLeaderboard = {
                            byWeight: [],
                            byValue: []
                        };
                        this.leaderboards.set(fish.name, speciesLeaderboard);
                    }
                    
                    // Add to both weight and value leaderboards
                    speciesLeaderboard.byWeight.push(historicalEntry);
                    speciesLeaderboard.byValue.push(historicalEntry);
                    
                    // Sort and trim to max entries
                    speciesLeaderboard.byWeight.sort((a, b) => b.weight - a.weight);
                    speciesLeaderboard.byValue.sort((a, b) => b.value - a.value);
                    
                    if (speciesLeaderboard.byWeight.length > this.MAX_ENTRIES) {
                        speciesLeaderboard.byWeight = speciesLeaderboard.byWeight.slice(0, this.MAX_ENTRIES);
                    }
                    if (speciesLeaderboard.byValue.length > this.MAX_ENTRIES) {
                        speciesLeaderboard.byValue = speciesLeaderboard.byValue.slice(0, this.MAX_ENTRIES);
                    }
                    
                    addedCount++;
                }
            }
            
            // Save if we added any historical catches
            if (addedCount > 0) {
                await this.saveLeaderboards();
            } 
        } catch (e) {
            console.error('[LEADERBOARD] Error populating historical catches:', e);
        }
    }
    
    private async saveLeaderboards(): Promise<void> {
        try {
            // Convert Map to object for storage (species leaderboards)
            const leaderboardData: Record<string, SpeciesLeaderboard> = {};
            for (const [species, leaderboard] of this.leaderboards.entries()) {
                leaderboardData[species] = leaderboard;
            }
            
            await PersistenceManager.instance.setGlobalData('fishLeaderboards', leaderboardData);
        } catch (e) {
            console.error('[LEADERBOARD] Error saving species leaderboards:', e);
        }
    }
    
    private async saveGlobalLeaderboards(): Promise<void> {
        try {
            // CRITICAL: Load existing data first to prevent overwriting
            const existingData = await PersistenceManager.instance.getGlobalData('globalLeaderboards') as any;
            const existingEarnersCount = existingData?.topEarners?.length || 0;
            const existingXPCount = existingData?.topXP?.length || 0;
            const currentEarnersCount = this.topEarners.length;
            const currentXPCount = this.topXP.length;
            
            // Safety check: If we're about to save fewer entries than existed, merge to preserve data
            if (existingEarnersCount > 0 && currentEarnersCount < existingEarnersCount) {
                console.warn(`[LEADERBOARD] WARNING: About to save ${currentEarnersCount} earners entries, but ${existingEarnersCount} existed. Merging to prevent data loss.`);
                // Merge existing data with current data to preserve entries
                if (existingData?.topEarners && Array.isArray(existingData.topEarners)) {
                    // Merge: keep existing entries that aren't in current list
                    const existingPlayerIds = new Set(this.topEarners.map(e => e.playerId));
                    const preservedEntries = existingData.topEarners.filter((e: EarnersLeaderboardEntry) => 
                        !existingPlayerIds.has(e.playerId)
                    );
                    // Combine preserved entries with current entries
                    const merged = [...this.topEarners, ...preservedEntries];
                    merged.sort((a, b) => b.totalEarned - a.totalEarned);
                    this.topEarners = merged.slice(0, this.MAX_LEADERBOARD_ENTRIES);
                    console.log(`[LEADERBOARD] Merged ${preservedEntries.length} preserved entries with ${currentEarnersCount} current entries, result: ${this.topEarners.length} total`);
                }
            }
            
            // Similar check for XP leaderboard
            if (existingXPCount > 0 && currentXPCount < existingXPCount) {
                console.warn(`[LEADERBOARD] WARNING: About to save ${currentXPCount} XP entries, but ${existingXPCount} existed. Merging to prevent data loss.`);
                if (existingData?.topXP && Array.isArray(existingData.topXP)) {
                    const existingPlayerIds = new Set(this.topXP.map(e => e.playerId));
                    const preservedEntries = existingData.topXP.filter((e: XPLeaderboardEntry) => 
                        !existingPlayerIds.has(e.playerId)
                    );
                    const merged = [...this.topXP, ...preservedEntries];
                    merged.sort((a, b) => b.totalXP - a.totalXP);
                    this.topXP = merged.slice(0, this.MAX_LEADERBOARD_ENTRIES);
                    console.log(`[LEADERBOARD] Merged ${preservedEntries.length} preserved XP entries with ${currentXPCount} current entries, result: ${this.topXP.length} total`);
                }
            }
            
            const globalLeaderboardData = {
                topXP: this.topXP,
                topEarners: this.topEarners
            };
            
            await PersistenceManager.instance.setGlobalData('globalLeaderboards', globalLeaderboardData);
            
            // Verify the save by reading it back
            const verification = await PersistenceManager.instance.getGlobalData('globalLeaderboards') as any;
            if (verification) {
                const xpCount = verification.topXP && Array.isArray(verification.topXP) ? verification.topXP.length : 0;
                const earnersCount = verification.topEarners && Array.isArray(verification.topEarners) ? verification.topEarners.length : 0;
                if (xpCount !== this.topXP.length || earnersCount !== this.topEarners.length) {
                    console.error(`[LEADERBOARD] WARNING: Save verification mismatch! Expected ${this.topXP.length} XP / ${this.topEarners.length} Earners, got ${xpCount} XP / ${earnersCount} Earners`);
                } else {
                    console.log(`[LEADERBOARD] Successfully saved and verified ${xpCount} XP entries and ${earnersCount} Earners entries`);
                }
            } else {
                console.error('[LEADERBOARD] WARNING: Save verification failed - could not read back saved data');
            }
        } catch (e) {
            console.error('[LEADERBOARD] Error saving global leaderboards:', e);
            if (e instanceof Error) {
                console.error('[LEADERBOARD] Error stack:', e.stack);
            }
        }
    }
    
    /**
     * Update XP leaderboard with player's current total XP
     */
    public async updateXPLeaderboard(player: Player, totalXP: number): Promise<void> {
        try {
            const playerName = player.username || player.id;
            const playerId = player.id;
            
            // Find existing entry or create new one
            let existingIndex = this.topXP.findIndex(entry => entry.playerId === playerId);
            
            const entry: XPLeaderboardEntry = {
                playerName,
                playerId,
                totalXP,
                timestamp: Date.now()
            };
            
            if (existingIndex >= 0) {
                // Update existing entry
                this.topXP[existingIndex] = entry;
            } else {
                // Add new entry
                this.topXP.push(entry);
            }
            
            // Sort by total XP (descending) and trim to max entries
            this.topXP.sort((a, b) => b.totalXP - a.totalXP);
            if (this.topXP.length > this.MAX_LEADERBOARD_ENTRIES) {
                this.topXP = this.topXP.slice(0, this.MAX_LEADERBOARD_ENTRIES);
            }
            
            // Save to global data
            await this.saveGlobalLeaderboards();
            
        } catch (e) {
            console.error('[LEADERBOARD] Error updating XP leaderboard:', e);
        }
    }
    
    /**
     * Update Earners leaderboard with player's total value earned
     */
    public async updateEarnersLeaderboard(player: Player, totalEarned: number): Promise<void> {
        try {
            // CRITICAL: Validate input
            if (typeof totalEarned !== 'number' || totalEarned < 0 || isNaN(totalEarned)) {
                console.error(`[LEADERBOARD] Invalid totalEarned value for player ${player.id}: ${totalEarned}`);
                return; // Don't update with invalid data
            }
            
            // CRITICAL: Ensure topEarners is initialized
            if (!Array.isArray(this.topEarners)) {
                console.warn(`[LEADERBOARD] topEarners is not an array, reinitializing from persisted data...`);
                // Try to load existing data first
                try {
                    const existingData = await PersistenceManager.instance.getGlobalData('globalLeaderboards') as any;
                    this.topEarners = existingData?.topEarners && Array.isArray(existingData.topEarners) 
                        ? existingData.topEarners 
                        : [];
                    console.log(`[LEADERBOARD] Reinitialized topEarners with ${this.topEarners.length} entries from persisted data`);
                } catch (loadError) {
                    console.error(`[LEADERBOARD] Failed to reload topEarners from persisted data:`, loadError);
                    this.topEarners = [];
                }
            }
            
            const playerName = player.username || player.id;
            const playerId = player.id;
            
            // Find existing entry or create new one
            let existingIndex = this.topEarners.findIndex(entry => entry.playerId === playerId);
            
            const entry: EarnersLeaderboardEntry = {
                playerName,
                playerId,
                totalEarned,
                timestamp: Date.now()
            };
            
            if (existingIndex >= 0) {
                // Update existing entry
                const oldEarned = this.topEarners[existingIndex].totalEarned;
                this.topEarners[existingIndex] = entry;
                console.log(`[LEADERBOARD] Updated Earners entry for ${playerName}: ${oldEarned} -> ${totalEarned}`);
            } else {
                // Add new entry
                this.topEarners.push(entry);
                console.log(`[LEADERBOARD] Added new Earners entry for ${playerName}: ${totalEarned}`);
            }
            
            // Sort by total earned (descending) and trim to max entries
            this.topEarners.sort((a, b) => b.totalEarned - a.totalEarned);
            if (this.topEarners.length > this.MAX_LEADERBOARD_ENTRIES) {
                const trimmedCount = this.topEarners.length - this.MAX_LEADERBOARD_ENTRIES;
                this.topEarners = this.topEarners.slice(0, this.MAX_LEADERBOARD_ENTRIES);
                console.log(`[LEADERBOARD] Trimmed ${trimmedCount} entries from Earners leaderboard`);
            }
            
            // Save to global data
            await this.saveGlobalLeaderboards();
            
        } catch (e) {
            console.error('[LEADERBOARD] Error updating Earners leaderboard:', e);
            if (e instanceof Error) {
                console.error('[LEADERBOARD] Error stack:', e.stack);
            }
        }
    }
    
    /**
     * Get Top XP leaderboard
     */
    public getTopXP(): XPLeaderboardEntry[] {
        return [...this.topXP].sort((a, b) => b.totalXP - a.totalXP);
    }
    
    /**
     * Get Top Earners leaderboard
     */
    public getTopEarners(): EarnersLeaderboardEntry[] {
        return [...this.topEarners].sort((a, b) => b.totalEarned - a.totalEarned);
    }
    
    /**
     * Get overall leaderboard (top catches by value across all species)
     */
    public getOverallLeaderboard(): LeaderboardEntry[] {
        const allEntries: LeaderboardEntry[] = [];
        
        // Collect all value entries from all species
        for (const [species, leaderboard] of this.leaderboards.entries()) {
            for (const entry of leaderboard.byValue) {
                allEntries.push(entry);
            }
        }
        
        // Sort by value (descending) and return top entries
        allEntries.sort((a, b) => b.value - a.value);
        return allEntries.slice(0, this.MAX_LEADERBOARD_ENTRIES);
    }
    
    public async recordCatch(
        player: Player, 
        species: string, 
        weight: number, 
        value: number, 
        rarity?: string,
        location?: string
    ): Promise<boolean> {
        try {            
            // Get or create leaderboard for this species
            let speciesLeaderboard = this.leaderboards.get(species);
            if (!speciesLeaderboard) {
                speciesLeaderboard = {
                    byWeight: [],
                    byValue: []
                };
                this.leaderboards.set(species, speciesLeaderboard);
            }
            
            const newEntry: LeaderboardEntry = {
                playerName: player.username || player.id,
                playerId: player.id,
                weight,
                value,
                timestamp: Date.now(),
                rarity,
                location
            };
            
            let recordBroken = false;
            let leaderboardChanged = false;
            
            // Check if this catch makes it into the weight leaderboard
            const weightArray = speciesLeaderboard.byWeight;
            const shouldAddToWeight = weightArray.length < this.MAX_ENTRIES || 
                (weightArray.length > 0 && weight > weightArray[weightArray.length - 1].weight);
            
            if (shouldAddToWeight) {
                // Add the new entry
                weightArray.push(newEntry);
                
                // Sort by weight (descending)
                weightArray.sort((a, b) => b.weight - a.weight);
                
                // Trim to max entries
                if (weightArray.length > this.MAX_ENTRIES) {
                    speciesLeaderboard.byWeight = weightArray.slice(0, this.MAX_ENTRIES);
                }
                
                recordBroken = true;
                leaderboardChanged = true;
            }
            
            // Check if this catch makes it into the value leaderboard
            const valueArray = speciesLeaderboard.byValue;
            const shouldAddToValue = valueArray.length < this.MAX_ENTRIES || 
                (valueArray.length > 0 && value > valueArray[valueArray.length - 1].value);
            
            if (shouldAddToValue) {
                // Add the new entry
                valueArray.push(newEntry);
                
                // Sort by value (descending)
                valueArray.sort((a, b) => b.value - a.value);
                
                // Trim to max entries
                if (valueArray.length > this.MAX_ENTRIES) {
                    speciesLeaderboard.byValue = valueArray.slice(0, this.MAX_ENTRIES);
                }
                
                recordBroken = true;
                leaderboardChanged = true;
            }
            
            // Always save if leaderboard changed (not just when record broken)
            // This ensures persistence across sessions
            if (leaderboardChanged) {
                await this.saveLeaderboards();
                
                // NOTE: We no longer automatically update trophy status here
                // Trophy status is now handled by the Collector when fish are officially weighed
            }
            
            return recordBroken;
        } catch (e) {
            console.error('[LEADERBOARD] Error recording catch:', e);
            return false;
        }
    }
    
    public getLeaderboardForSpecies(species: string): SpeciesLeaderboard | null {
        const leaderboard = this.leaderboards.get(species);
        if (leaderboard) {
            // Ensure arrays are sorted before returning
            if (leaderboard.byWeight) {
                leaderboard.byWeight.sort((a, b) => b.weight - a.weight);
            }
            if (leaderboard.byValue) {
                leaderboard.byValue.sort((a, b) => b.value - a.value);
            }
        }
        return leaderboard || null;
    }
    
    public getAllLeaderboards(): Map<string, SpeciesLeaderboard> {
        // Ensure all leaderboards are sorted before returning
        for (const [species, leaderboard] of this.leaderboards.entries()) {
            if (leaderboard.byWeight) {
                leaderboard.byWeight.sort((a, b) => b.weight - a.weight);
            }
            if (leaderboard.byValue) {
                leaderboard.byValue.sort((a, b) => b.value - a.value);
            }
        }
        return new Map(this.leaderboards);
    }
    
    public sendLeaderboardToPlayer(player: Player, species?: string): void {
        try {
            if (species) {
                // Send leaderboard for specific species
                const leaderboard = this.getLeaderboardForSpecies(species);
                if (leaderboard) {
                    player.ui.sendData({
                        type: 'leaderboardUpdate',
                        species,
                        leaderboard
                    });
                } 
            } else {
                // Send all leaderboards including new categories
                const allLeaderboards: Record<string, SpeciesLeaderboard> = {};
                let totalEntries = 0;
                for (const [species, leaderboard] of this.leaderboards.entries()) {
                    allLeaderboards[species] = leaderboard;
                    totalEntries += leaderboard.byWeight.length + leaderboard.byValue.length;
                }
                player.ui.sendData({
                    type: 'leaderboardUpdate',
                    allLeaderboards,
                    topXP: this.getTopXP(),
                    topEarners: this.getTopEarners(),
                    overall: this.getOverallLeaderboard()
                });
            }
        } catch (e) {
            console.error('[LEADERBOARD] Error sending leaderboard to player:', e);
        }
    }
    
    // Debug method to print all leaderboard data
    public printAllLeaderboards(): void {
        if (this.leaderboards.size === 0) {
        } else {
            for (const [species, leaderboard] of this.leaderboards.entries()) {
            }
        }
    }
}