import { Player, Vector3, World } from "hytopia";
import { FISH_CATALOG, convertSpawnTimesToWindows, getCurrentTimePeriod } from "./PhshTwoFIshCatalog";
import type { FishData } from "./PhshTwoFIshCatalog";
import { ALL_FISHING_ZONES } from "./PhshTwoFishingZones";
import type { FishingZone, RegionTag, SubzoneTag, HotspotTag } from "./PhshTwoFishingZones";
import { PlayerStateManager } from '../PlayerStateManager';
import type { InventoryItem, LootItem } from "../Inventory/Inventory";
import type { GamePlayerEntity } from "../GamePlayerEntity";
import { FishLootManager } from "./FishLootManager";
import type { CaughtFish } from "../Inventory/ItemFactory";
import { ItemFactory } from "../Inventory/ItemFactory";
import type { BaitType } from './PhshTwoFIshCatalog';
import type { RodType } from '../Inventory/RodCatalog';
import type { HotspotManager } from "./FishingHotspots";
import GameClock from '../GameClock';
import { EnchantmentHelper } from './EnchantmentHelper';
import GameManager from '../GameManager';

// Define a type for the returned tags from getTagsAtPosition
export interface LocationTags {
    regionTags: RegionTag[];
    subzoneTags: SubzoneTag[];
    hotspotTags: HotspotTag[];
    isInHotspot?: boolean; // NEW: Track if position is in an active hotspot
}

// --- Hotspot Rarity Bonus Configuration ---
export interface HotspotRarityConfig {
    // Multipliers for each rarity tier (applied to spawn weight)
    commonMultiplier: number;    // Usually < 1.0 (reduce common fish)
    uncommonMultiplier: number;  // Usually < 1.0 (reduce uncommon fish)
    rareMultiplier: number;      // Usually > 1.0 (boost rare fish)
    epicMultiplier: number;      // Usually > 1.0 (boost epic fish)
    legendaryMultiplier: number; // Usually > 1.0 (boost legendary fish)
    mythicMultiplier: number;    // Usually > 1.0 (boost mythic fish)
}

export const DEFAULT_HOTSPOT_RARITY_CONFIG: HotspotRarityConfig = {
    commonMultiplier: 0.4,     // 60% reduction in common fish
    uncommonMultiplier: 0.6,   // 40% reduction in uncommon fish
    rareMultiplier: 2.5,       // 150% boost to rare fish
    epicMultiplier: 3.0,       // 200% boost to epic fish  
    legendaryMultiplier: 4.0,  // 300% boost to legendary fish
    mythicMultiplier: 5.0      // 400% boost to mythic fish
};

export class FishSpawnManager {
    private lootManager: FishLootManager;
    private playerStateManager: PlayerStateManager;
    private world: World;
    private hotspotManager: HotspotManager | null = null;
    private hotspotRarityConfig: HotspotRarityConfig;
    
    // Grouper quest boost position - only active during fitz_quest_3_big_grouper
    private static readonly GROUPER_BOOST_POS = new Vector3(-101, 14.77, -62.49);
    private static readonly GROUPER_BOOST_RADIUS = 10.0; // Within 10 blocks (increased from 1.0 for better coverage)

    constructor(playerStateManager: PlayerStateManager, world: World) {
        this.playerStateManager = playerStateManager;
        this.world = world;
        // Ensure FishLootManager instance is created and available
        this.lootManager = new FishLootManager(world, playerStateManager);
        this.hotspotRarityConfig = DEFAULT_HOTSPOT_RARITY_CONFIG;
        
        // Periodic zone logging for testing (every 5 seconds)
        setInterval(() => {
            // Log zone for all players currently in the world
            if (this.world && this.world.players && Array.isArray(this.world.players)) {
                this.world.players.forEach(player => {
                    const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
                    if (playerEntity && playerEntity.position) {
                        const zoneName = this.getCurrentZoneName(playerEntity.position);
                        console.log(`[Zone Debug] Player ${player.username || player.id} is in zone: ${zoneName}`);
                    }
                });
            }
        }, 5000); // Every 5 seconds
    }

    // --- Hotspot Integration ---
    setHotspotManager(hotspotManager: HotspotManager): void {
        this.hotspotManager = hotspotManager;
    }

    // --- Tweakable Configuration ---
    updateHotspotRarityConfig(config: Partial<HotspotRarityConfig>): void {
        this.hotspotRarityConfig = { ...this.hotspotRarityConfig, ...config };
    }

    getHotspotRarityConfig(): HotspotRarityConfig {
        return { ...this.hotspotRarityConfig };
    }
    public runFishSimulation(position: Vector3, player: Player): void {
        // Debug logging removed to reduce console spam
        // Can be re-added when needed for debugging
    }

    public getFishAtLocation(position: Vector3, time: number, player: Player): CaughtFish | null {
        const currentPlayerLevel = this.playerStateManager.getCurrentLevel(player);
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedBaitBeforeRoll = playerEntity.getEquippedBait(player)?.item;
        const locationTags = this.getTagsAtPosition(position);

        // **NEW: Check for Ancient Magnet Quest Logic First (for ancient_magnet)**
        if (equippedBaitBeforeRoll && this.isAncientMagnet(equippedBaitBeforeRoll.id)) {
            return this._handleAncientMagnetFishing(player, playerEntity, position, locationTags, equippedBaitBeforeRoll, time);
        }

        // **NEW: Check for Fragment Quest Magnet Logic (for bait_magnet in ancient pools)**
        if (equippedBaitBeforeRoll && equippedBaitBeforeRoll.id === 'bait_magnet') {
            const fragmentResult = this._handleFragmentQuestMagnetFishing(player, playerEntity, position, locationTags, equippedBaitBeforeRoll, time);
            if (fragmentResult !== null) {
                return fragmentResult; // Return fragment/note if found, otherwise continue with normal fishing
            }
        }

        // 1. Try for Beginner Mackerel (if getting started quest is active) or Sardine (otherwise)
        const state = this.playerStateManager.getState(player);
        
        // Check for mackerel quests first (works for all levels)
        const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
        const sardineQuestActive = state?.quests.active['fitz_quest_1_sardines'];
        
        if (gettingStartedQuestActive && equippedBaitBeforeRoll) {
            const questProgress = gettingStartedQuestActive.objectivesProgress || {};
            const wormsComplete = (questProgress[0] || 0) >= 3; // Objective 0: worms (changed to 3)
            const mackerelComplete = (questProgress[1] || 0) >= 1; // Objective 1: mackerel (changed to 1)
            // Only guarantee mackerel if worms are complete (player has rod) but mackerel aren't complete yet
            if (wormsComplete && !mackerelComplete) {
                const beginnerMackerel = this._tryCatchBeginnerMackerel(player, playerEntity, equippedBaitBeforeRoll);
                if (beginnerMackerel) {
                    return beginnerMackerel; // Return early if beginner mackerel catch successful
                }
            }
        }
        
        // Check deprecated sardine quest (works for all levels)
        if (sardineQuestActive && equippedBaitBeforeRoll) {
            const questProgress = sardineQuestActive.objectivesProgress || {};
            const mackerelCaught = (questProgress[0] || 0); // Objective 0: catch 3 mackerel
            const mackerelComplete = mackerelCaught >= 3;
            console.log(`[FishSpawnManager] Deprecated sardine quest active. Mackerel caught: ${mackerelCaught}/3, Complete: ${mackerelComplete}`);
            // Only guarantee mackerel if mackerel aren't complete yet
            if (!mackerelComplete) {
                console.log(`[FishSpawnManager] Attempting guaranteed mackerel catch for deprecated quest...`);
                const beginnerMackerel = this._tryCatchBeginnerMackerel(player, playerEntity, equippedBaitBeforeRoll);
                if (beginnerMackerel) {
                    console.log(`[FishSpawnManager] Successfully caught guaranteed mackerel!`);
                    return beginnerMackerel; // Return early if beginner mackerel catch successful
                } else {
                    console.warn(`[FishSpawnManager] Guaranteed mackerel catch failed, falling through to normal roll.`);
                }
            } else {
                console.log(`[FishSpawnManager] Mackerel objective already complete (${mackerelCaught}/3), skipping guaranteed catch.`);
            }
        }
        
        // Fall back to beginner sardine catch for level < 2 players (if no mackerel quest active)
        if (currentPlayerLevel < 2 && !gettingStartedQuestActive && !sardineQuestActive) {
            const beginnerFish = this._tryCatchBeginnerSardine(player, playerEntity, equippedBaitBeforeRoll);
            if (beginnerFish) {
                return beginnerFish; // Return early if beginner catch successful
            }
            // If beginner catch fails (75% miss or error), proceed to normal roll
        }

        // 1.5. Check for Low-Luck Rod Loot Override
        const equippedRod = playerEntity.getEquippedRod(player);
        // Apply enchantment bonuses to luck
        const modifiedStats = EnchantmentHelper.getEnchantmentModifiedStats(equippedRod);
        const rodLuck = modifiedStats.luck;
        
        // **SKIP low-luck override for magnet baits - they have their own special logic**
        const isMagnetBait = equippedBaitBeforeRoll?.id === 'bait_magnet';
        
        if (rodLuck < 0.3 && !isMagnetBait) {
            const lootRollChance = Math.random();
            
            if (lootRollChance < 0.95) { // 95% chance to skip fish rolls
                return this._handleFallbackLoot(player, playerEntity, position, locationTags, equippedBaitBeforeRoll, `Low-luck rod override (luck: ${rodLuck})`);
            }
        } else if (isMagnetBait) {
        }

        // Note: Getting started quest mackerel guarantee is now handled in the beginner catch section above
        // This ensures mackerel is always caught when quest is active, worms are complete, and bait is equipped

        // 2. Normal Fishing Roll
        // **NEW: Check for double fallback prevention - if last catch was fallback, force primary catch**
        let selectedPrimaryItemData: FishData | null = null;
        if (state && state.flags && state.flags.lastCatchWasFallback) {
            // Force a primary catch by picking from eligible fish
            const eligibleItems = this.getEligibleFishAndLoot(locationTags, player, position);
            if (eligibleItems.length > 0) {
                // Pick the most common fish (highest base weight) that's not quest-gated
                // For getting started quest OR deprecated sardine quest, prefer mackerel if available
                const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
                const sardineQuestActive = state?.quests.active['fitz_quest_1_sardines'];
                let preferredFish = null;
                if (gettingStartedQuestActive) {
                    const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                    const wormsComplete = (questProgress[0] || 0) >= 3; // Changed to 3 worms
                    const mackerelComplete = (questProgress[1] || 0) >= 1; // Changed to 1 mackerel
                    if (wormsComplete && !mackerelComplete) {
                        preferredFish = eligibleItems.find(f => f.id === 'mackerel');
                    }
                } else if (sardineQuestActive) {
                    const questProgress = sardineQuestActive.objectivesProgress || {};
                    const mackerelComplete = (questProgress[0] || 0) >= 3; // Objective 0: catch 3 mackerel
                    if (!mackerelComplete) {
                        preferredFish = eligibleItems.find(f => f.id === 'mackerel');
                    }
                }
                
                const commonFish = preferredFish ||
                    eligibleItems
                        .filter(f => !f.spawnData.questGated && (f.spawnData.baseChance || 0) > 0)
                        .sort((a, b) => (b.spawnData.baseChance || 0) - (a.spawnData.baseChance || 0))[0] || 
                    eligibleItems[0]; // Fallback to first eligible
                if (commonFish) {
                    selectedPrimaryItemData = commonFish;
                }
            }
        }
        
        // If we didn't force a catch, do normal roll
        if (!selectedPrimaryItemData) {
            selectedPrimaryItemData = this.rollForFish(locationTags, time, player, position, state);
        }

        // 3. Handle Result of Normal Roll
        if (selectedPrimaryItemData) {
            // Initialize flags if needed
            if (state && !state.flags) {
                state.flags = {};
            }
            
            // Track mackerel quest casts (for getting started quest OR deprecated sardine quest)
            if (state && state.flags) {
                const gettingStartedQuestActive = state.quests.active['fitz_quest_getting_started'];
                const sardineQuestActive = state.quests.active['fitz_quest_1_sardines'];
                
                if (gettingStartedQuestActive) {
                    const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                    const wormsComplete = (questProgress[0] || 0) >= 3; // Changed to 3 worms
                    const mackerelComplete = (questProgress[1] || 0) >= 1; // Changed to 1 mackerel
                    if (wormsComplete && !mackerelComplete) {
                        const isMackerel = selectedPrimaryItemData.id === 'mackerel';
                        if (isMackerel) {
                            state.flags.mackerelQuestCasts = 0;
                            state.flags.lastCatchWasMackerel = true;
                        } else {
                            state.flags.mackerelQuestCasts = (state.flags.mackerelQuestCasts || 0) + 1;
                            state.flags.lastCatchWasMackerel = false;
                        }
                    }
                } else if (sardineQuestActive) {
                    const questProgress = sardineQuestActive.objectivesProgress || {};
                    const mackerelComplete = (questProgress[0] || 0) >= 3; // Objective 0: catch 3 mackerel
                    if (!mackerelComplete) {
                        const isMackerel = selectedPrimaryItemData.id === 'mackerel';
                        if (isMackerel) {
                            state.flags.mackerelQuestCasts = 0;
                            state.flags.lastCatchWasMackerel = true;
                        } else {
                            state.flags.mackerelQuestCasts = (state.flags.mackerelQuestCasts || 0) + 1;
                            state.flags.lastCatchWasMackerel = false;
                        }
                    }
                }
            }
            // Mark last catch was NOT fallback
            if (state && state.flags) {
                state.flags.lastCatchWasFallback = false;
            }
            
            // NEW: Track catches without chest/ore for magnet pity system
            const isChestOrOre = selectedPrimaryItemData.id === 'common_chest' || selectedPrimaryItemData.id === 'runic_ore';
            if (state && state.flags) {
                if (isChestOrOre) {
                    // Reset counter when chest/ore is caught
                    state.flags.catchesWithoutChestOre = 0;
                } else {
                    // Increment counter for non-chest/ore catches
                    if (state.flags.catchesWithoutChestOre === undefined) {
                        state.flags.catchesWithoutChestOre = 0;
                    }
                    state.flags.catchesWithoutChestOre = (state.flags.catchesWithoutChestOre || 0) + 1;
                }
            }
            
            return this._handlePrimaryCatch(selectedPrimaryItemData, player, playerEntity, position, equippedBaitBeforeRoll, locationTags);
        } else {
            // Roll resulted in nothing, trigger fallback loot
            // Initialize flags if needed
            if (state && !state.flags) {
                state.flags = {};
            }
            
            // Check if we should prevent double fallback (already checked above, but double-check here)
            if (state && state.flags && state.flags.lastCatchWasFallback) {
                // Force a primary catch by picking from eligible fish
                const eligibleItems = this.getEligibleFishAndLoot(locationTags, player, position);
                if (eligibleItems.length > 0) {
                    // Pick the most common fish (highest base weight) that's not quest-gated
                    // For getting started quest OR deprecated sardine quest, prefer mackerel if available
                    const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
                    const sardineQuestActive = state?.quests.active['fitz_quest_1_sardines'];
                    let preferredFish = null;
                    if (gettingStartedQuestActive) {
                        const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                        const wormsComplete = (questProgress[0] || 0) >= 3; // Changed to 3 worms
                        const mackerelComplete = (questProgress[1] || 0) >= 1; // Changed to 1 mackerel
                        if (wormsComplete && !mackerelComplete) {
                            preferredFish = eligibleItems.find(f => f.id === 'mackerel');
                        }
                    } else if (sardineQuestActive) {
                        const questProgress = sardineQuestActive.objectivesProgress || {};
                        const mackerelComplete = (questProgress[0] || 0) >= 3; // Objective 0: catch 3 mackerel
                        if (!mackerelComplete) {
                            preferredFish = eligibleItems.find(f => f.id === 'mackerel');
                        }
                    }
                    
                    const commonFish = preferredFish ||
                        eligibleItems
                            .filter(f => !f.spawnData.questGated && (f.spawnData.baseChance || 0) > 0)
                            .sort((a, b) => (b.spawnData.baseChance || 0) - (a.spawnData.baseChance || 0))[0] || 
                        eligibleItems[0]; // Fallback to first eligible
                    if (commonFish) {
                        state.flags.lastCatchWasFallback = false;
                        // Also track mackerel quest if needed (for getting started quest OR deprecated sardine quest)
                        const gettingStartedQuestActive = state.quests.active['fitz_quest_getting_started'];
                        const sardineQuestActive = state.quests.active['fitz_quest_1_sardines'];
                        if (gettingStartedQuestActive) {
                            const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                            const wormsComplete = (questProgress[0] || 0) >= 3; // Changed to 3 worms
                            const mackerelComplete = (questProgress[1] || 0) >= 1; // Changed to 1 mackerel
                            if (wormsComplete && !mackerelComplete) {
                                const isMackerel = commonFish.id === 'mackerel';
                                if (isMackerel) {
                                    state.flags.mackerelQuestCasts = 0;
                                    state.flags.lastCatchWasMackerel = true;
                                } else {
                                    state.flags.mackerelQuestCasts = (state.flags.mackerelQuestCasts || 0) + 1;
                                    state.flags.lastCatchWasMackerel = false;
                                }
                            }
                        } else if (sardineQuestActive) {
                            const questProgress = sardineQuestActive.objectivesProgress || {};
                            const mackerelComplete = (questProgress[0] || 0) >= 3; // Objective 0: catch 3 mackerel
                            if (!mackerelComplete) {
                                const isMackerel = commonFish.id === 'mackerel';
                                if (isMackerel) {
                                    state.flags.mackerelQuestCasts = 0;
                                    state.flags.lastCatchWasMackerel = true;
                                } else {
                                    state.flags.mackerelQuestCasts = (state.flags.mackerelQuestCasts || 0) + 1;
                                    state.flags.lastCatchWasMackerel = false;
                                }
                            }
                        }
                        return this._handlePrimaryCatch(commonFish, player, playerEntity, position, equippedBaitBeforeRoll, locationTags);
                    }
                }
            }
            // Mark last catch WAS fallback
            if (state && state.flags) {
                state.flags.lastCatchWasFallback = true;
            }
            return this._handleFallbackLoot(player, playerEntity, position, locationTags, equippedBaitBeforeRoll, "Primary roll was nothing");
        }
    }

    // --- Refactored Helper Methods --- 

    private _tryCatchBeginnerMackerel(player: Player, playerEntity: GamePlayerEntity, equippedBait: InventoryItem | null | undefined): CaughtFish | null {
        // Guarantee mackerel catch when getting started quest OR deprecated sardine quest is active and bait is equipped
        const state = this.playerStateManager.getState(player);
        const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
        const sardineQuestActive = state?.quests.active['fitz_quest_1_sardines'];
        
        if (gettingStartedQuestActive) {
            console.log("[FishSpawnManager] Getting started quest active, attempting guaranteed Mackerel catch.");
        } else if (sardineQuestActive) {
            console.log("[FishSpawnManager] Deprecated sardine quest active, attempting guaranteed Mackerel catch.");
        } else {
            console.log("[FishSpawnManager] No mackerel quest active, skipping guaranteed catch.");
            return null;
        }
        const mackerelData = FISH_CATALOG.find(fish => fish.id === 'mackerel');
        if (mackerelData) {
            const catchAttempt = this.generateCatch(mackerelData, player);
            if (catchAttempt.status === 'success' && catchAttempt.fish) {
                console.log("[FishSpawnManager] Beginner Mackerel caught!");
                if (catchAttempt.message) {
                    this.playerStateManager.sendGameMessage(player, catchAttempt.message);
                }
                this._consumeBait(player, playerEntity, equippedBait, "Beginner Mackerel");
                return catchAttempt.fish;
            } else {
                console.warn(`[FishSpawnManager] Beginner Mackerel generateCatch failed (Status: ${catchAttempt.status}). Falling through.`);
            }
        } else {
            console.error("[FishSpawnManager] Could not find Mackerel data in catalog for beginner catch. Falling through.");
        }
        return null; // Indicate beginner catch failed or wasn't attempted successfully
    }

    private _tryCatchBeginnerSardine(player: Player, playerEntity: GamePlayerEntity, equippedBait: InventoryItem | null | undefined): CaughtFish | null {
        if (Math.random() < 0.99) { // 75% chance
            console.log("[FishSpawnManager] Player level < 1, attempting 75% Sardine catch.");
            const sardineData = FISH_CATALOG.find(fish => fish.id === 'sardine');
            if (sardineData) {
                const catchAttempt = this.generateCatch(sardineData, player);
                if (catchAttempt.status === 'success' && catchAttempt.fish) {
                    console.log("[FishSpawnManager] Beginner Sardine caught!");
                    if (catchAttempt.message) {
                        this.playerStateManager.sendGameMessage(player, catchAttempt.message);
                    }
                    this._consumeBait(player, playerEntity, equippedBait, "Beginner Sardine");
                    return catchAttempt.fish;
                } else {
                    console.warn(`[FishSpawnManager] Beginner Sardine generateCatch failed (Status: ${catchAttempt.status}). Falling through.`);
                }
            } else {
                console.error("[FishSpawnManager] Could not find Sardine data in catalog for beginner catch. Falling through.");
            }
        } else {
            console.log("[FishSpawnManager] Player level < 1, but 75% Sardine chance failed. Proceeding to normal roll.");
        }
        return null; // Indicate beginner catch failed or wasn't attempted successfully
    }

    private _handlePrimaryCatch(
        selectedItemData: FishData, 
        player: Player, 
        playerEntity: GamePlayerEntity, 
        fishingPosition: Vector3,
        equippedBait: InventoryItem | null | undefined, 
        locationTags: LocationTags
    ): CaughtFish | null {
        // Check for rarityBonus special ability (Keystone Rod ONLY)
        // Upgrades caught fish by ONE rarity tier (e.g., Rare → Epic, Legendary → Mythic)
        // NOTE: This ability is exclusive to Keystone Rod, even though other rods have rarityBonus values
        const equippedRod = playerEntity.getEquippedRod(player);
        const isKeystoneRod = equippedRod?.id === 'keystone_rod';
        const rarityBonus = equippedRod?.metadata?.rodStats?.rarityBonus ?? 0;
        
        if (isKeystoneRod && rarityBonus > 0 && !selectedItemData.isLoot) {
            // Define rarity progression (one tier up)
            const rarityProgression: Record<string, string> = {
                'common': 'uncommon',
                'uncommon': 'rare',
                'rare': 'epic',
                'epic': 'legendary',
                'legendary': 'mythic'
            };
            
            const nextTier = rarityProgression[selectedItemData.rarity];
            
            // Only proceed if there's a next tier and it's not already at max
            if (nextTier) {
                const rarityUpgradeRoll = Math.random();
                if (rarityUpgradeRoll < rarityBonus) {
                    console.log(`[FishSpawnManager] Rarity Bonus triggered! (${(rarityBonus * 100).toFixed(0)}% chance) - Attempting to upgrade ${selectedItemData.name} from ${selectedItemData.rarity} to ${nextTier}...`);
                    
                    // Get eligible fish filtered to only the next tier
                    const eligibleFish = this.getEligibleFishAndLoot(locationTags, player, fishingPosition);
                    const nextTierFish = eligibleFish.filter(fish => fish.rarity === nextTier && !fish.isLoot);
                    
                    if (nextTierFish.length > 0) {
                        // Reroll from next tier pool only using weighted selection
                        const upgradedRoll = this.rollForFishFromPool(nextTierFish, locationTags, player, fishingPosition);
                        
                        if (upgradedRoll) {
                            console.log(`[FishSpawnManager] Rarity Bonus successful! Upgraded from ${selectedItemData.name} (${selectedItemData.rarity}) to ${upgradedRoll.name} (${nextTier})`);
                            selectedItemData = upgradedRoll; // Replace with upgraded fish
                        } else {
                            console.log(`[FishSpawnManager] Rarity Bonus triggered but no ${nextTier} fish rolled. Keeping original ${selectedItemData.name}`);
                        }
                    } else {
                        console.log(`[FishSpawnManager] Rarity Bonus triggered but no ${nextTier} fish available at this location. Keeping original ${selectedItemData.name}`);
                    }
                }
            }
        }
        
        // Special cases: Items that need reeling but convert to loot afterward
        const isChestFish = selectedItemData.isLoot && selectedItemData.id.includes('chest');
        const isMapFragment = selectedItemData.isLoot && selectedItemData.id.includes('map_fragment');
        const isVault = selectedItemData.isLoot && selectedItemData.id.includes('vault');
        const isRunicOre = selectedItemData.isLoot && selectedItemData.id.includes('runic_ore');
        const isRelicShard = selectedItemData.isLoot && selectedItemData.id === 'relic_shard';
        const needsReeling = isChestFish || isMapFragment || isVault || isRunicOre || isRelicShard;
        
        if (selectedItemData.isLoot && !needsReeling) {
            // Handle regular loot items (non-chest/map/vault) - skip reeling
            return this._handleCatalogLoot(selectedItemData, player, playerEntity, equippedBait);
        } else {
            // It's a fish OR a loot item that needs reeling - attempt to generate the catch for reeling
            const catchAttempt = this.generateCatch(selectedItemData, player);
            if (catchAttempt.status === 'success' && catchAttempt.fish) {
                if (catchAttempt.message) {
                    this.playerStateManager.sendGameMessage(player, catchAttempt.message);
                }
                
                // Check if this is quest bait that should only be consumed on successful reel
                const isQuestBait = equippedBait && (equippedBait.id === 'ancient_magnet' || equippedBait.id === 'bait_magnet');
                
                // For relic_shard, consume magnet when hooked (not on successful reel)
                const isRelicShard = selectedItemData.id === 'relic_shard';
                
                if (isQuestBait && needsReeling && !isRelicShard) {
                    // Store quest bait info with the fish for later consumption on successful reel (for other quest items)
                    catchAttempt.fish.questBait = {
                        id: equippedBait.id,
                        name: equippedBait.name
                    };
                    console.log(`[FishSpawnManager] Quest bait ${equippedBait.name} will be consumed only on successful reel`);
                } else {
                    // Normal bait consumption - for relic_shard, consume magnet immediately when hooked
                    this._consumeBait(player, playerEntity, equippedBait, `${needsReeling ? 'Treasure' : 'Fish'}: ${selectedItemData.name}`);
                    if (isRelicShard && isQuestBait) {
                        console.log(`[FishSpawnManager] Magnet consumed when relic shard hooked - player must get another if they fail`);
                    }
                }
                
                // Mark loot items for special handling after reeling
                if (needsReeling) {
                    catchAttempt.fish.isLoot = true; // Use existing property
                    // Store original loot value in the fish's value field temporarily
                    // The reeling system will handle it as a "fish" and then convert to loot
                }
                
                return catchAttempt.fish;
            } else if (catchAttempt.status === 'too_heavy') {
                // Fish/chest was too heavy, trigger fallback loot
                return this._handleFallbackLoot(player, playerEntity, fishingPosition, locationTags, equippedBait, `${isChestFish ? 'Chest' : 'Fish'} too heavy: ${selectedItemData.name}`);
            } else {
                // Other generateCatch issue, trigger fallback loot
                console.warn(`[FishSpawnManager] generateCatch for ${selectedItemData.name} resulted in unhandled status: ${catchAttempt.status} or null fish. Triggering fallback.`);
                return this._handleFallbackLoot(player, playerEntity, fishingPosition, locationTags, equippedBait, `generateCatch issue for ${selectedItemData.name}`);
            }
        }
    }
    
    private _handleCatalogLoot(
        lootData: FishData, 
        player: Player, 
        playerEntity: GamePlayerEntity, 
        equippedBait: InventoryItem | null | undefined
    ): null {
        console.log(`[FishSpawnManager] Primary roll selected a defined LOOT item: ${lootData.name}`);
        const lootItemFromCatalog: LootItem = {
            id: lootData.id,
            name: lootData.name,
            quantity: 1, // Assuming loot from catalog is always quantity 1
            value: lootData.baseValue
        };
        this.lootManager.addLootToInventory(player, lootItemFromCatalog);
        this.lootManager.displayLoot(player, lootItemFromCatalog);
        this._consumeBait(player, playerEntity, equippedBait, `Catalog loot: ${lootData.name}`);
        return null; // Catching catalog loot doesn't yield a fish for the main function
    }
    
    private _handleFallbackLoot(
        player: Player, 
        playerEntity: GamePlayerEntity, 
        fishingPosition: Vector3,
        locationTags: LocationTags, 
        equippedBait: InventoryItem | null | undefined,
        reason: string // Added reason for logging clarity
    ): null {
        console.log(`[FishSpawnManage] Triggering fallback loot. Reason: ${reason}`);
        const fallbackLoot = this.lootManager.generateDynamicFallbackLoot(player, fishingPosition, locationTags, equippedBait);
        if (fallbackLoot) {
            this.lootManager.addLootToInventory(player, fallbackLoot);
            this.lootManager.displayLoot(player, fallbackLoot);
            this._consumeBait(player, playerEntity, equippedBait, `Fallback loot: ${fallbackLoot.name}`);
        }
        return null; // Fallback loot never returns a fish to the main function
    }

    private _consumeBait(
        player: Player, 
        playerEntity: GamePlayerEntity, 
        baitItem: InventoryItem | null | undefined,
        catchContext: string // For logging: what was caught that consumed the bait
    ): void {
        if (baitItem) {
            console.log(`[FishSpawnManager] Consuming bait: ${baitItem.name} (ID: ${baitItem.id}) after catching ${catchContext}.`);
            playerEntity.stateManager.removeInventoryItem(player, baitItem.id);
            
            // Track daily stats and quest progress for bait usage
            // Extract bait type: "bait_shrimp" -> "shrimp", "bait_fish_head" -> "fish_head", etc.
            let baitType = baitItem.id.replace(/^bait_/, ''); // Remove "bait_" prefix
            // Normalize to match quest definitions (e.g., "raw_shrimp" -> "shrimp", "squid_bits" -> "squid_tentacle")
            if (baitType === 'raw_shrimp') baitType = 'shrimp';
            else if (baitType === 'squid_bits' || baitType === 'squid_tentacle') baitType = 'squid_tentacle';
            else if (baitType === 'fish_head') baitType = 'fish_head';
            else if (baitType === 'glow_worm') baitType = 'glow_worm';
            else if (baitType === 'ghost_shrimp') baitType = 'ghost_shrimp';
            
            playerEntity.stateManager.incrementBaitUsedByType(player, baitType);
            
            // Update quest progress
            const questManager = GameManager.instance?.questManager;
            if (questManager) {
                questManager.updateQuestProgress(player, 'useBait', { baitType: baitType });
            }
        }
    }

    private getEligibleFishAndLoot(locationTags: LocationTags, player: Player, fishingPosition: Vector3): FishData[] {
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        const rodId = equippedRod?.id || '' as RodType;
        const currentGameHour = GameClock.instance.hour;
        
        // Check if we're in a freshwater zone
        const isInFreshwater = this.isInFreshwaterZone(locationTags, player, fishingPosition);
        
        // Check if we're in an ancient_path zone (new deep zones)
        const isInAncientPath = locationTags.regionTags.includes('ancient_path');
        
        // Filter fish by eligibility criteria
        return FISH_CATALOG.filter(fish => {
            // **NEW: Exclude certain fish from ancient_path zones**
            if (isInAncientPath) {
                const excludedFromAncientPath = [
                    'salmon', 'pufferfish', 'catfish', 'dragonfruit_fish', 
                    'rainbowfish', 'shipjack_tuna', 'barracuda'
                ];
                if (excludedFromAncientPath.includes(fish.id)) {
                    return false;
                }
            }
            
            // **NEW: Quest-gated Fish Check**
            if (fish.spawnData.questGated) {
                if (!this.isQuestGatedFishEligible(fish, player, fishingPosition)) {
                    return false;
                }
            }

            // Freshwater Restriction Check
            if (isInFreshwater) {
                // Only allow freshwater fish in freshwater zones
                const freshwaterFishIds = ['goldfish', 'trout', 'largemouth_bass', 'koi_fish', 'marbled_koi', 'green_frog', 'poison_dart_frog'];
                if (!freshwaterFishIds.includes(fish.id)) {
                    return false;
                }
            } else {
                // Exclude freshwater fish from saltwater zones
                const freshwaterFishIds = ['goldfish', 'trout', 'largemouth_bass', 'koi_fish', 'marbled_koi', 'green_frog', 'poison_dart_frog'];
                if (freshwaterFishIds.includes(fish.id)) {
                    return false;
                }
            }

            // Rod Restriction Check
            if (fish.spawnData.rodRestrictions && fish.spawnData.rodRestrictions.length > 0) {
                if (!rodId || !fish.spawnData.rodRestrictions.includes(rodId as RodType)) {
                return false;
                }
            }

            // Time-based Spawning Check
            // First check the new spawnTimes system, then fallback to legacy timeWindows
            if (fish.spawnData.spawnTimes && fish.spawnData.spawnTimes.length > 0) {
                const timeWindows = convertSpawnTimesToWindows(fish.spawnData.spawnTimes);
                if (timeWindows.length > 0 && !this.isInTimeWindow(timeWindows, currentGameHour)) {
                    console.log(`[FishSpawnManager] ${fish.name} not available at current time. Current: ${currentGameHour}:00 (${getCurrentTimePeriod(currentGameHour)}), Required: ${fish.spawnData.spawnTimes.join(', ')}`);
                    return false;
                }
            } else if (fish.spawnData.timeWindows && fish.spawnData.timeWindows.length > 0) {
                // Legacy timeWindows check
                if (!this.isInTimeWindow(fish.spawnData.timeWindows, currentGameHour)) {
                    console.log(`[FishSpawnManager] ${fish.name} not available at current time (legacy timeWindows). Current: ${currentGameHour}:00`);
                    return false;
                }
            }
            
            return true;
        });
    }

    private rollForFish(locationTags: LocationTags, time: number, player: Player, fishingPosition: Vector3, state?: any): FishData | null {
        console.log('\n=== FISHING PROBABILITY CALCULATION ===');
        
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedBaitItem = playerEntity.getEquippedBait(player)?.item;
        const currentPlayerLevel = this.playerStateManager.getCurrentLevel(player);
        const baitName = equippedBaitItem?.name || 'None';
        
        // Get state if not passed
        if (!state) {
            state = this.playerStateManager.getState(player);
        }
        
        console.log(`Player Level: ${currentPlayerLevel}, Bait: ${baitName}`);
        console.log(`Location: [${fishingPosition.x}, ${fishingPosition.y}, ${fishingPosition.z}]`);

        // **SPECIAL MAGNET MODE** - Bypass all normal calculations
        if (equippedBaitItem?.id === 'bait_magnet') {
            console.log('\n🧲 MAGNET MODE ACTIVATED - Special treasure hunting logic');
            return this.rollForMagnetTreasure(locationTags, time, player, fishingPosition);
        }

        // Normal fishing logic continues below...
        const eligibleItems = this.getEligibleFishAndLoot(locationTags, player, fishingPosition);
        console.log(`Eligible items: ${eligibleItems.length}`);

        // If no bait is equipped, restrict to starter fish
        if (!equippedBaitItem) {
            console.log("[FishSpawnManager] No bait equipped. Filtering for starter fish only.");
            const starterItems = eligibleItems.filter(item => item.spawnData.isStarterFish === true);
            if (starterItems.length === 0) {
                console.log("[FishSpawnManager] No starter fish found/eligible. Will proceed to fallback loot via nothingWeight.");
            }
        }

        if (eligibleItems.length === 0 && equippedBaitItem) { // Only log if bait was equipped but no fish eligible
            console.log("No eligible fish/loot found for this location/rod/time (with bait).");
        }

        const weightedList: { item: FishData, weight: number }[] = [];
        let totalSystemWeight = 0;

        for (const item of eligibleItems) {
            // Get base weight from location tags
            let currentWeight = this.calculateItemWeight(item, locationTags);
            console.log(`Base weight for ${item.name}: ${currentWeight}`);

            if (currentWeight <= 0) {
                console.log(`❌ ${item.name} (${item.rarity}): Base weight 0 - EXCLUDED`);
                continue;
            }

            const weightModifications: string[] = [`Base: ${currentWeight}`];

            // Apply bait modifiers early
            if (equippedBaitItem?.metadata?.baitStats) {
                const baitStats = equippedBaitItem.metadata.baitStats;
                let baitModifier = 1.0;

                // Apply preferredLoot boosts FIRST (before baseLuck penalty)
                let hasPreferredLootBoost = false;
                if (baitStats.preferredLoot) {
                    for (const boost of baitStats.preferredLoot) {
                        if (boost.lootTableId === item.id) {
                            currentWeight *= boost.boostMultiplier;
                            weightModifications.push(`Preferred Loot: x${boost.boostMultiplier}`);
                            console.log(`Applied preferredLoot boost for ${item.id}: x${boost.boostMultiplier}`);
                            hasPreferredLootBoost = true;
                            break; // Only apply one boost per item
                        }
                    }
                }

                // Apply baseLuck modifier (but skip for items with preferredLoot boosts)
                if (typeof baitStats.baseLuck === 'number' && !hasPreferredLootBoost) {
                    baitModifier *= baitStats.baseLuck;
                    weightModifications.push(`Bait Base: x${baitStats.baseLuck}`);
                } else if (hasPreferredLootBoost) {
                    weightModifications.push(`Preferred item - baseLuck skipped`);
                }

                // Apply species targeting
                if (baitStats.targetSpecies && Array.isArray(baitStats.targetSpecies) && baitStats.targetSpecies.length > 0) {
                    if (baitStats.targetSpecies.includes(item.id)) {
                        // Perfect target match - full bonus
                        const speciesMultiplier = baitStats.speciesLuck || 1.0;
                        baitModifier *= speciesMultiplier;
                        console.log(`Applying bait speciesLuck for ${item.id}: ${speciesMultiplier} to ${item.name}`);
                        weightModifications.push(`Bait Species: x${speciesMultiplier}`);
                    } else {
                        // Not a target species - apply mild reduction instead of major penalty
                        const reductionFactor = 0.85; // Only 15% reduction instead of major penalty
                        baitModifier *= reductionFactor;
                        weightModifications.push(`Non-target: x${reductionFactor}`);
                    }
                } else {
                    // No target species list = universal bait, no penalty
                    weightModifications.push(`Universal bait`);
                }
                
                currentWeight *= baitModifier;
                
                // **SPECIAL: Additional penalty for sardines when using any bait**
                // This reduces sardine catch rates when using bait, encouraging other fish
                if (item.id === 'sardine') {
                    const sardineBaitPenalty = 0.5; // 50% reduction when using bait
                    currentWeight *= sardineBaitPenalty;
                    weightModifications.push(`Sardine Bait Penalty: x${sardineBaitPenalty}`);
                    console.log(`[FishSpawnManager] Applied sardine bait penalty: x${sardineBaitPenalty} (new weight: ${currentWeight})`);
                }
            }
            
            // **Quest-specific probability boosts**
            if (state) {
                // Mackerel quest boost: Check both new getting started quest AND deprecated sardine quest
                const gettingStartedQuestActive = state.quests.active['fitz_quest_getting_started'];
                const gettingStartedQuestProgress = gettingStartedQuestActive?.objectivesProgress || {};
                const wormsComplete = (gettingStartedQuestProgress[0] || 0) >= 3; // Objective 0: worms (changed to 3)
                const mackerelComplete = (gettingStartedQuestProgress[1] || 0) >= 1; // Objective 1: mackerel (changed to 1)
                // Only boost mackerel if worms are complete (player has rod) but mackerel aren't complete yet
                const newMackerelQuestActive = gettingStartedQuestActive && wormsComplete && !mackerelComplete;
                
                // Check deprecated sardine quest (fitz_quest_1_sardines) - requires 3 mackerel
                const sardineQuestActive = state.quests.active['fitz_quest_1_sardines'];
                const sardineQuestProgress = sardineQuestActive?.objectivesProgress || {};
                const sardineMackerelCaught = (sardineQuestProgress[0] || 0);
                const sardineMackerelComplete = sardineMackerelCaught >= 3; // Objective 0: catch 3 mackerel
                const deprecatedMackerelQuestActive = sardineQuestActive && !sardineMackerelComplete;
                
                if (sardineQuestActive) {
                    console.log(`[FishSpawnManager] Deprecated sardine quest found in rollForFish. Active: ${!!sardineQuestActive}, Progress: ${sardineMackerelCaught}/3, Complete: ${sardineMackerelComplete}, Will boost: ${deprecatedMackerelQuestActive}`);
                }
                
                // Either quest can trigger mackerel boost
                const mackerelQuestActive = newMackerelQuestActive || deprecatedMackerelQuestActive;
                
                if (mackerelQuestActive && equippedBaitItem) {
                    console.log(`[FishSpawnManager] Mackerel quest boost ACTIVE for ${item.name}. New quest: ${newMackerelQuestActive}, Deprecated: ${deprecatedMackerelQuestActive}`);
                    if (item.id === 'mackerel') {
                        // Boost mackerel to guarantee catch (very high weight)
                        const questMackerelBoost = 1000.0; // Very high boost to guarantee mackerel
                        currentWeight *= questMackerelBoost;
                        weightModifications.push(`Quest Mackerel Guarantee (with bait): x${questMackerelBoost}`);
                        console.log(`[FishSpawnManager] Applied quest mackerel guarantee: x${questMackerelBoost} for ${item.name} (quest active + bait equipped). New weight: ${currentWeight}`);
                    } else {
                        // Reduce all other fish weights dramatically to make mackerel guaranteed
                        // Reduce to 0.01% of normal weight (0.0001 multiplier)
                        const oldWeight = currentWeight;
                        currentWeight *= 0.0001;
                        weightModifications.push(`Quest Active - Other Fish Reduced: x0.0001`);
                        console.log(`[FishSpawnManager] Reduced ${item.name} weight from ${oldWeight} to ${currentWeight} (quest active)`);
                    }
                } else if (sardineQuestActive && !equippedBaitItem) {
                    console.log(`[FishSpawnManager] Deprecated sardine quest active but NO BAIT EQUIPPED - boost not applied for ${item.name}`);
                }
                
                // Kelp Eel quest boost: If kelp eel quest is active, shrimp bait is equipped, and in kelp_bed zone
                const kelpEelQuestActive = state.quests.active['fitz_quest_2_kelp_eel'];
                const isInKelpBed = locationTags.subzoneTags.includes('kelp_bed');
                const isShrimpBait = equippedBaitItem?.id === 'bait_shrimp';
                
                if (kelpEelQuestActive && isShrimpBait && isInKelpBed && item.id === 'kelp_eel') {
                    // Large boost to kelp eel when using shrimp bait in kelp bed during quest (as per quest tip)
                    const questKelpEelBoost = 8.0; // 8x multiplier for kelp eel during quest with correct setup
                    currentWeight *= questKelpEelBoost;
                    weightModifications.push(`Quest Kelp Eel Boost (shrimp + kelp_bed): x${questKelpEelBoost}`);
                    console.log(`Applied quest kelp eel boost: x${questKelpEelBoost} for ${item.name} (quest active + shrimp bait + kelp_bed zone)`);
                }
                
                // Pufferfish quest boosts: Multiple boost scenarios that can stack
                const grouperQuestActive = state.quests.active['fitz_quest_3_big_grouper'];
                if (grouperQuestActive && item.id === 'pufferfish') {
                    let totalBoost = 1.0; // Start with no boost
                    const boostParts: string[] = [];
                    
                    // Check for old dock subzone boost (3x)
                    const isOldDock = locationTags.subzoneTags.includes('old_dock');
                    if (isOldDock) {
                        const oldDockBoost = 3.0;
                        totalBoost += oldDockBoost - 1.0; // Add 2.0 to total (making it 3x)
                        boostParts.push(`Old Dock: +${oldDockBoost - 1.0}x`);
                        console.log(`[Pufferfish Quest] Old dock subzone detected - applying ${oldDockBoost}x boost`);
                    }
                    
                    // Check for deep caster rod boost (5x)
                    const equippedRod = playerEntity.getEquippedRod(player);
                    const isDeepCaster = equippedRod?.id === 'deepcaster_rod';
                    if (isDeepCaster) {
                        const deepCasterBoost = 5.0;
                        totalBoost += deepCasterBoost - 1.0; // Add 4.0 to total (making it 5x if alone, or stacking if combined)
                        boostParts.push(`Deep Caster Rod: +${deepCasterBoost - 1.0}x`);
                        console.log(`[Pufferfish Quest] Deep caster rod detected - applying ${deepCasterBoost}x boost`);
                    }
                    
                    // Check for farthest pole position boost (10x, stacks with rod)
                    const playerPos = playerEntity.position;
                    const distanceToBoostPos = Math.sqrt(
                        Math.pow(playerPos.x - FishSpawnManager.GROUPER_BOOST_POS.x, 2) +
                        Math.pow(playerPos.y - FishSpawnManager.GROUPER_BOOST_POS.y, 2) +
                        Math.pow(playerPos.z - FishSpawnManager.GROUPER_BOOST_POS.z, 2)
                    );
                    
                    if (distanceToBoostPos <= FishSpawnManager.GROUPER_BOOST_RADIUS) {
                        const farthestPoleBoost = 10.0;
                        totalBoost += farthestPoleBoost - 1.0; // Add 9.0 to total (making it 10x if alone, or stacking if combined)
                        boostParts.push(`Farthest Pole: +${farthestPoleBoost - 1.0}x`);
                        console.log(`[Pufferfish Quest] Farthest pole position detected - applying ${farthestPoleBoost}x boost`);
                    }
                    
                    // Apply total boost (all boosts are additive)
                    if (totalBoost > 1.0) {
                        currentWeight *= totalBoost;
                        weightModifications.push(`Quest Pufferfish Boost (${boostParts.join(', ')}): x${totalBoost.toFixed(1)}`);
                        console.log(`Applied quest pufferfish boost: x${totalBoost.toFixed(1)} for ${item.name} (${boostParts.join(', ')})`);
                    }
                }
            }
            
            // Apply Player Level/Rarity Penalty
            let isBaitEffectiveForPenaltyCheck = false;
            if (equippedBaitItem?.metadata?.baitStats) {
                const baitStats = equippedBaitItem.metadata.baitStats;
                
                // More generous effectiveness check - ANY of these conditions count as "effective":
                // 1. Specific species targeting with positive luck
                if (baitStats.targetSpecies && baitStats.targetSpecies.includes(item.id) && typeof baitStats.speciesLuck === 'number' && baitStats.speciesLuck > 1.0) {
                    isBaitEffectiveForPenaltyCheck = true;
                }
                // 2. High base luck (premium baits should help with rare fish)
                else if (typeof baitStats.baseLuck === 'number' && baitStats.baseLuck >= 1.1) {
                    isBaitEffectiveForPenaltyCheck = true;
                }
                // 3. Bait has decent lootScore (targeting rare catches in general)
                else if (typeof baitStats.lootScore === 'number' && baitStats.lootScore >= 1.2) {
                    isBaitEffectiveForPenaltyCheck = true;
                }
            }

            let rarityPenalty = 1.0;
            if (
                currentPlayerLevel >= 3 &&
                !isBaitEffectiveForPenaltyCheck && // Apply penalty if bait is not specifically effective for this rare+ fish
                ['rare', 'epic', 'legendary'].includes(item.rarity)
            ) {
                rarityPenalty = 0.8; // Reduced from 0.6x to 0.8x - much more reasonable penalty
                currentWeight *= rarityPenalty;
                weightModifications.push(`Rarity Penalty: x${rarityPenalty}`);
                // Reduced logging: only log significant penalties
                console.log(`Rarity penalty applied to ${item.name}: ${rarityPenalty}x (Lvl ${currentPlayerLevel}, ${item.rarity})`);
            }

            if (currentWeight > 0) {
                weightedList.push({ item, weight: currentWeight });
                totalSystemWeight += currentWeight;
                
                // NEW: Show final calculation for each fish
                const rarityIcon = item.rarity === 'common' ? '⚪' : 
                                 item.rarity === 'uncommon' ? '🟢' : 
                                 item.rarity === 'rare' ? '🔵' : 
                                 item.rarity === 'epic' ? '🟣' : 
                                 item.rarity === 'legendary' ? '🟡' : '🔴';
                
                console.log(`${rarityIcon} ${item.name} (${item.rarity}): ${weightModifications.join(' → ')} = ${currentWeight.toFixed(2)}`);
            } else {
                console.log(`❌ ${item.name} (${item.rarity}): Weighted to 0 - EXCLUDED`);
            }
        }

        // Dynamically adjust nothingWeight based on player level, bait, and location
        let currentNothingWeight = 65; // Base nothing weight (increased from 45 to absorb reduced medium predator probability and increase fallback loot)
        
        // Adjust based on player level - higher level players find more loot
        if (currentPlayerLevel >= 50) {
            currentNothingWeight += 12; // Reduced from 25
        } else if (currentPlayerLevel >= 25) {
            currentNothingWeight += 8; // Reduced from 15
        } else if (currentPlayerLevel >= 10) {
            currentNothingWeight += 5; // Reduced from 10
        }
        
        // Adjust based on location - deep water has more treasure
        if (locationTags.subzoneTags.some(tag => tag.includes('deep'))) {
            currentNothingWeight += 10; // Reduced from 20
            console.log(`Deep water location detected. Increased loot chance.`);
        }
        
        // Adjust based on rod lootScore - better rods find more treasure
        const equippedRod = playerEntity.getEquippedRod(player);
        const modifiedRodStats = EnchantmentHelper.getEnchantmentModifiedStats(equippedRod);
        const rodLootScore = modifiedRodStats.lootScore;
        if (rodLootScore > 1.0) {
            const lootBonus = Math.floor((rodLootScore - 1.0) * 15); // Reduced from 30
            currentNothingWeight += lootBonus;
            console.log(`Rod loot bonus: +${lootBonus} (lootScore: ${rodLootScore})`);
        }
        
        // High-luck rod bonus: Increases fallback loot chance for mid-to-late game rods
        const rodLuck = modifiedRodStats.luck;
        if (rodLuck > 1.2) {
            currentNothingWeight += 38;
            console.log(`High-luck rod bonus: +38 (rodLuck: ${rodLuck})`);
        }
        
        // Time-based loot multipliers - night fishing finds more treasure
        if (time >= 22 || time <= 5) { // Night time (10pm - 5am)
            currentNothingWeight += 8; // Reduced from 15
            console.log(`Night fishing bonus: +8 loot chance`);
        } else if (time >= 6 && time <= 8) { // Early morning (6am - 8am)
            currentNothingWeight += 5; // Reduced from 10
            console.log(`Dawn fishing bonus: +5 loot chance`);
        }
        
        // **NEW: Bait-based trash reduction system**
        // This creates the progression: No Bait (lots of trash) → Worm (much less trash) → Shrimp (even less trash)
        if (!equippedBaitItem) {
            // No bait: Double the nothing weight (lots of trash)
            // BUT: If getting started quest is active with beginner rod, keep nothing high but don't double (teaching moment)
            state = this.playerStateManager.getState(player);
            const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
            const equippedRod = playerEntity.getEquippedRod(player);
            const isBeginnerRod = equippedRod?.id === 'beginner-rod';
            
            // Check if getting started quest is active and in mackerel-catching phase
            let questActiveForTeaching = false;
            if (gettingStartedQuestActive && isBeginnerRod) {
                const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                const wormsComplete = (questProgress[0] || 0) >= 3;
                const mackerelComplete = (questProgress[1] || 0) >= 3;
                questActiveForTeaching = wormsComplete && !mackerelComplete;
            }
            
            if (questActiveForTeaching) {
                // Quest active, no bait: Keep nothing high but don't double (already high enough to teach bait usage)
                console.log(`Quest active, no bait: Keeping nothing weight high (${currentNothingWeight}) to teach bait usage`);
            } else {
                // Normal case: Triple the nothing weight (lots of trash) - increased from 2.0x to 3.0x
                currentNothingWeight *= 3.0;
                console.log(`No bait equipped. Tripled trash chance to: ${currentNothingWeight}`);
                
                // **NEW: Extra garbage for beginner rod under level 5 without quest**
                // Creates more bifurcation between using bait and not using bait
                if (isBeginnerRod && currentPlayerLevel < 5 && !questActiveForTeaching) {
                    // Add extra nothing weight for more trash/garbage - increased to +110 to reach ~60% nothing probability
                    currentNothingWeight += 110; // Additional 110 weight for garbage
                    console.log(`Beginner rod, no quest, no bait, level < 5: Added extra garbage weight (+110). Total: ${currentNothingWeight}`);
                }
            }
        } else {
            // Calculate bait quality reduction
            const baitStats = equippedBaitItem.metadata?.baitStats;
            const baseLuck = baitStats?.baseLuck ?? 1.0;
            
            // Convert baseLuck to trash reduction factor
            // baseLuck 1.0 = no reduction, baseLuck 1.15 = 25% reduction, baseLuck 1.5 = 50% reduction
            let trashReductionFactor = 1.0;
            
            if (baseLuck >= 1.0) {
                // Progressive trash reduction based on bait quality
                if (baseLuck >= 1.5) {
                    // Premium bait (shrimp: 1.5) = 50% trash reduction
                    trashReductionFactor = 0.5;
                    console.log(`Premium bait (${equippedBaitItem.name}): 50% trash reduction`);
                } else if (baseLuck >= 1.15) {
                    // Basic bait (worm: 1.15) = 25% trash reduction  
                    trashReductionFactor = 0.75;
                    console.log(`Basic bait (${equippedBaitItem.name}): 25% trash reduction`);
                } else if (baseLuck >= 1.1) {
                    // Low-tier bait = 15% trash reduction
                    trashReductionFactor = 0.85;
                    console.log(`Low-tier bait (${equippedBaitItem.name}): 15% trash reduction`);
                } else {
                    // Very basic bait = 10% trash reduction
                    trashReductionFactor = 0.9;
                    console.log(`Very basic bait (${equippedBaitItem.name}): 10% trash reduction`);
                }
            }
            
            currentNothingWeight *= trashReductionFactor;
            console.log(`Bait trash reduction applied. Final nothing weight: ${currentNothingWeight}`);
            
            // **NEW: Quest-specific nothing reduction (getting started quest + beginner rod + bait)**
            // If getting started quest is active (mackerel phase) and player is using beginner rod with bait:
            // Reduce nothing significantly (reward for using bait during quest)
            state = this.playerStateManager.getState(player);
            const gettingStartedQuestActive = state?.quests.active['fitz_quest_getting_started'];
            const equippedRod = playerEntity.getEquippedRod(player);
            const isBeginnerRod = equippedRod?.id === 'beginner-rod';
            
            // Check if getting started quest is active and in mackerel-catching phase
            let questActiveForBaitBonus = false;
            if (gettingStartedQuestActive && isBeginnerRod) {
                const questProgress = gettingStartedQuestActive.objectivesProgress || {};
                const wormsComplete = (questProgress[0] || 0) >= 3;
                const mackerelComplete = (questProgress[1] || 0) >= 3;
                questActiveForBaitBonus = wormsComplete && !mackerelComplete;
            }
            
            if (questActiveForBaitBonus) {
                // With bait during quest: reduce nothing weight significantly
                currentNothingWeight *= 0.5; // 50% reduction when using bait during quest
                console.log(`Quest bait bonus: 50% nothing reduction applied. Final nothing weight: ${currentNothingWeight}`);
            }
        }
        
        console.log(`Player Level: ${currentPlayerLevel}, Final nothing weight: ${currentNothingWeight}`);
        totalSystemWeight += currentNothingWeight;

        // NEW: Show probability summary
        console.log(`\n📊 FINAL PROBABILITIES (Total Weight: ${totalSystemWeight.toFixed(2)}):`);
        console.log(`🚫 Nothing: ${currentNothingWeight} (${(currentNothingWeight/totalSystemWeight*100).toFixed(1)}%)`);
        
        weightedList
            .sort((a, b) => b.weight - a.weight) // Sort by weight descending
            .slice(0, 10) // Show top 10
            .forEach(item => {
                const percentage = (item.weight / totalSystemWeight * 100).toFixed(1);
                const rarityIcon = item.item.rarity === 'common' ? '⚪' : 
                                 item.item.rarity === 'uncommon' ? '🟢' : 
                                 item.item.rarity === 'rare' ? '🔵' : 
                                 item.item.rarity === 'epic' ? '🟣' : 
                                 item.item.rarity === 'legendary' ? '🟡' : '🔴';
                console.log(`${rarityIcon} ${item.item.name}: ${item.weight.toFixed(2)} (${percentage}%)`);
            });
        
        if (weightedList.length > 10) {
            console.log(`... and ${weightedList.length - 10} more fish`);
        }
        console.log(`=====================================\n`);

        if (weightedList.length === 0 && currentNothingWeight <= 0) { 
            console.log("All eligible items had zero weight and nothingWeight is zero. Truly nothing caught.");
            return null; 
        } else if (weightedList.length === 0 && currentNothingWeight > 0) {
            console.log("No primary items eligible/weighted, falling to nothingWeight (will trigger fallback loot).");
        }

        let randomRoll = Math.random() * totalSystemWeight;

        for (const weightedItem of weightedList) {
            if (randomRoll < weightedItem.weight) {
                console.log(`🎣 SELECTED: ${weightedItem.item.name} (Weight: ${weightedItem.weight.toFixed(2)}, Roll: ${randomRoll.toFixed(2)} of ${totalSystemWeight.toFixed(2)})`);
                return weightedItem.item; 
            }
            randomRoll -= weightedItem.weight;
        }
        // If the loop completes, it means the roll fell into the nothingWeight category
        console.log(`🚫 NOTHING SELECTED: (roll ${randomRoll.toFixed(2)} fell into nothingWeight range of ${currentNothingWeight.toFixed(2)} in rollForFish)`);
        return null; 
    }

    private baitMultiplier(fish: FishData, bait: InventoryItem | null): number {
        if (!bait || !bait.metadata?.baitStats) { return 1; }

        const baitStats = bait.metadata.baitStats;

        if (baitStats.targetSpecies && baitStats.targetSpecies.includes(fish.id) && typeof baitStats.speciesLuck === 'number') {
            return baitStats.speciesLuck;
        }
        // Fallback to baseLuck if defined, otherwise 1 (no modification)
        return typeof baitStats.baseLuck === 'number' ? baitStats.baseLuck : 1;
    }

    private generateCatch(fishData: FishData, player: Player): 
    { status: 'success' | 'too_heavy', fish: CaughtFish | null, message?: string } {
        // If generateCatch is ever called with an item where isLoot is true,
        // it should probably just return { fish: null } without further processing.
        // However, the current flow in getFishAtLocation prevents this by handling isLoot first.
        
        const weight = this.generateWeight(fishData.minWeight, fishData.maxWeight);
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        // Apply enchantment bonuses to maxCatchWeight (Giant's Pull, Weighted Fortune, Anchored Zone)
        const modifiedStats = EnchantmentHelper.getEnchantmentModifiedStats(equippedRod);
        const rodWeighted = modifiedStats.maxCatchWeight;
        const equippedBaitItem = playerEntity.getEquippedBait(player)?.item;

        // Apply bait catchWeight additively to rod enchantment-modified stats
        const baitCatchWeightMultiplier = equippedBaitItem?.metadata?.baitStats?.catchWeight ?? 1;
        const baitCatchWeightBonus = baitCatchWeightMultiplier - 1; // Extract bonus (e.g., 1.05 -> 0.05)
        // For weight capacity, we apply as a percentage bonus to the rod's capacity
        const finalRodWeightCapacity = rodWeighted * (1 + baitCatchWeightBonus); // Additive as percentage
        
        console.log('generateCatch', fishData.name, fishData.rarity, `Weight: ${weight.toFixed(2)}`, `Rod Capacity: ${finalRodWeightCapacity.toFixed(2)}`, `Bait Catch Weight Multiplier: ${baitCatchWeightMultiplier.toFixed(2)}`);
        
        // **SPECIAL CASE: Quest-gated items always succeed regardless of rod capacity**
        const isQuestItem = fishData.spawnData.questGated === true;
        
        if (!isQuestItem && finalRodWeightCapacity < weight) { // Check if fish weight exceeds rod capacity
            console.log(`[FishSpawnManager] Fish weight ${weight.toFixed(2)} exceeds rod capacity ${finalRodWeightCapacity.toFixed(2)}. Marked as too heavy.`);
            return { 
                status: 'too_heavy', 
                fish: null 
                // No message for 'too_heavy' here
            };
        }
        
        if (isQuestItem) {
            console.log(`[FishSpawnManager] Quest item ${fishData.name} bypasses rod capacity restrictions (Weight: ${weight.toFixed(2)}, Rod: ${finalRodWeightCapacity.toFixed(2)})`);
        }

        console.log(`Catch details: ${fishData.name}, Weight: ${weight.toFixed(2)}lbs - Good to catch.`);
        const calculatedRarity = this.calculateFishRarity(fishData, weight);
        const finalValue = Math.floor(fishData.baseValue * (weight / fishData.minWeight) * this.getRarityMultiplier(calculatedRarity));

        const caughtFish: CaughtFish = {
            id: `${fishData.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: fishData.name,
            rarity: calculatedRarity,
            weight: weight,
            value: finalValue,
            isBaitFish: fishData.isBait,
            isLoot: fishData.isLoot // ADD: Copy isLoot property for proper loot detection
        };

        return { status: 'success', fish: caughtFish };
    }

    private generateWeight(min: number, max: number): number {
        const weight = min + Math.random() * (max - min);
        return Number(weight.toFixed(2));
    }

    /**
     * Helper method to roll for a fish from a pre-filtered pool (used for rarityBonus rerolls)
     * Applies the same weighting logic as rollForFish but only considers the provided pool
     */
    private rollForFishFromPool(
        fishPool: FishData[],
        locationTags: LocationTags,
        player: Player,
        fishingPosition: Vector3
    ): FishData | null {
        if (fishPool.length === 0) {
            return null;
        }

        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedBaitItem = playerEntity.getEquippedBait(player)?.item;
        const state = this.playerStateManager.getState(player);

        const weightedList: { item: FishData, weight: number }[] = [];
        let totalWeight = 0;

        for (const item of fishPool) {
            // Get base weight from location tags
            let currentWeight = this.calculateItemWeight(item, locationTags);

            if (currentWeight <= 0) {
                continue;
            }

            // Apply bait modifiers (same logic as rollForFish)
            if (equippedBaitItem?.metadata?.baitStats) {
                const baitStats = equippedBaitItem.metadata.baitStats;
                let baitModifier = 1.0;

                // Apply preferredLoot boosts
                if (baitStats.preferredLoot) {
                    for (const boost of baitStats.preferredLoot) {
                        if (boost.lootTableId === item.id) {
                            currentWeight *= boost.boostMultiplier;
                            break;
                        }
                    }
                }

                // Apply baseLuck modifier
                if (typeof baitStats.baseLuck === 'number') {
                    baitModifier *= baitStats.baseLuck;
                }

                // Apply species targeting
                if (baitStats.targetSpecies && Array.isArray(baitStats.targetSpecies) && baitStats.targetSpecies.length > 0) {
                    if (baitStats.targetSpecies.includes(item.id)) {
                        const speciesMultiplier = baitStats.speciesLuck || 1.0;
                        baitModifier *= speciesMultiplier;
                    } else {
                        baitModifier *= 0.85; // Non-target reduction
                    }
                }

                currentWeight *= baitModifier;
            }

            if (currentWeight > 0) {
                weightedList.push({ item, weight: currentWeight });
                totalWeight += currentWeight;
            }
        }

        if (weightedList.length === 0 || totalWeight <= 0) {
            return null;
        }

        // Weighted random selection
        const randomRoll = Math.random() * totalWeight;
        let cumulativeWeight = 0;

        for (const entry of weightedList) {
            cumulativeWeight += entry.weight;
            if (randomRoll <= cumulativeWeight) {
                return entry.item;
            }
        }

        // Fallback (shouldn't happen)
        return weightedList[weightedList.length - 1].item;
    }

    private calculateFishRarity(fish: FishData, weight: number): string {
        // Allow mythic rarity
        const rarityLevels = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        const baseRarityIndex = rarityLevels.indexOf(fish.rarity);
        
        // Determine percentile within weight range
        const weightRange = fish.maxWeight - fish.minWeight;
        const weightPercentile = weightRange > 0 ? (weight - fish.minWeight) / weightRange : 1;

        // Simple rarity boost based on weight percentile (can be refined)
        let finalRarityIndex = baseRarityIndex;
        if (weightPercentile > 0.95 && baseRarityIndex < rarityLevels.length -1) finalRarityIndex++; // Top 5% weight might upgrade rarity once
        if (weightPercentile > 0.99 && baseRarityIndex < rarityLevels.length -2) finalRarityIndex++; // Top 1% might upgrade twice

        return rarityLevels[finalRarityIndex];
    }

    private getRarityMultiplier(rarity: string): number {
        switch (rarity) {
            case 'mythic': return 6.0;
            case 'legendary': return 5.0;
            case 'epic': return 3.0;
            case 'rare': return 2.0;
            case 'uncommon': return 1.5;
            default: return 1.0; // common
        }
    }

    private isInTimeWindow(windows: { start: number; end: number; }[], time: number): boolean {
        return windows.some(window => {
            if (window.start < window.end) {
                return time >= window.start && time < window.end;
            } else {
                // Handles overnight windows (e.g., 22-4)
                return time >= window.start || time < window.end;
            }
        });
    }

    private isInRadius(pos1: Vector3, pos2: Vector3, radius: number): boolean {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distanceSquared = dx * dx + dz * dz;
        const radiusSquared = radius * radius;
        return distanceSquared <= radiusSquared;
    }

    /**
     * Check if player is near quest-specific coordinates
     */
    private isPlayerNearQuestCoordinates(
        playerPosition: Vector3, 
        questCoords: { x: number; y: number; z: number; radius?: number }
    ): boolean {
        const radius = questCoords.radius || 20; // Default 20 block radius
        const questPosition = new Vector3(questCoords.x, questCoords.y, questCoords.z);
        
        const isWithinRange = this.isInRadius(playerPosition, questPosition, radius);
        
        console.log(`[FishSpawnManager] Coordinate check: Player at (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}), Quest at (${questCoords.x}, ${questCoords.y}, ${questCoords.z}), Radius: ${radius}, Within range: ${isWithinRange}`);
        
        return isWithinRange;
    }

    // --- Helper method to get current zone name for logging ---
    private getCurrentZoneName(position: Vector3): string {
        for (const zone of ALL_FISHING_ZONES) {
            if (this.isInRadius(position, zone.position, zone.radius)) {
                return zone.name;
            }
        }
        return 'Unknown Zone';
    }

    // --- getTagsAtPosition (NEW FUNCTION) ---
    private getTagsAtPosition(position: Vector3): LocationTags {
        const activeTags: LocationTags = {
            regionTags: [],
            subzoneTags: [],
            hotspotTags: [],
            isInHotspot: false
        };

        // Check if position is in an active hotspot
        if (this.hotspotManager) {
            const hotspot = this.hotspotManager.isPlayerInHotspot(position);
            if (hotspot) {
                activeTags.isInHotspot = true;
                console.log(`[FishSpawnManager] Position is in active hotspot: ${hotspot.location.name}`);
            }
        }
        let primaryZone: FishingZone | null = null;
        let primaryZonePriority = -1; // For selecting the most specific zone (e.g. hotspot > subzone > region)

        for (const zone of ALL_FISHING_ZONES) {
            if (this.isInRadius(position, zone.position, zone.radius)) {
                // Determine priority: hotspot (2) > subzone (1) > region (0)
                let currentPriority = 0;
                if (zone.hotspotTags && zone.hotspotTags.length > 0) currentPriority = 2;
                else if (zone.subzoneTags && zone.subzoneTags.length > 0) currentPriority = 1;

                if (currentPriority > primaryZonePriority) {
                    primaryZone = zone;
                    primaryZonePriority = currentPriority;
                }

                // Collect all tags from all overlapping zones initially
                // We might refine this later to only use tags from the *most specific* zone
                if (zone.regionTags) activeTags.regionTags.push(...zone.regionTags);
                if (zone.subzoneTags) activeTags.subzoneTags.push(...zone.subzoneTags);
                if (zone.hotspotTags) activeTags.hotspotTags.push(...zone.hotspotTags);
            }
        }
        // Deduplicate tags
        activeTags.regionTags = [...new Set(activeTags.regionTags)];
        activeTags.subzoneTags = [...new Set(activeTags.subzoneTags)];
        activeTags.hotspotTags = [...new Set(activeTags.hotspotTags)];

        // If we want to only use tags from the *single most specific* zone:
        /*
        if (primaryZone) {
            return {
                regionTags: primaryZone.regionTags || [],
                subzoneTags: primaryZone.subzoneTags || [],
                hotspotTags: primaryZone.hotspotTags || []
            };
        }
        return { regionTags: [], subzoneTags: [], hotspotTags: [] };
        */
       
        return activeTags; // Returns combined tags from all overlapping zones
    }

    // --- calculateItemWeight (MOVED INSIDE CLASS and TYPES ADDED) ---
    private calculateItemWeight(item: FishData, locationTags: LocationTags): number {
        let totalWeight = item.spawnData.baseChance;

        // **NEW: Handle quest coordinate-based spawning**
        // For quest items with coordinates, they only spawn at the exact location
        if (item.spawnData.questCoordinates) {
            // Quest coordinate items ignore region/subzone tags and use only coordinate proximity
            // The eligibility check already verified coordinates, so if we reach here, give it maximum weight
            return 100; // High weight to ensure quest items spawn when conditions are met
        }

        // Add weight for matching region tags
        if (item.spawnData.regionTags && locationTags.regionTags) {
            for (const tag of locationTags.regionTags) { // Removed explicit type: RegionTag
                if (item.spawnData.regionTags[tag] !== undefined) {
                    totalWeight += item.spawnData.regionTags[tag]!;
                }
            }
        }

        // Add weight for matching subzone tags
        if (item.spawnData.subzoneTags && locationTags.subzoneTags) {
            for (const tag of locationTags.subzoneTags) { // Removed explicit type: SubzoneTag
                if (item.spawnData.subzoneTags[tag] !== undefined) {
                    totalWeight += item.spawnData.subzoneTags[tag]!;
                }
            }
        }

        // Add weight for matching hotspot tags
        if (item.spawnData.hotspotTags && locationTags.hotspotTags) {
            for (const tag of locationTags.hotspotTags) { // Removed explicit type: HotspotTag
                if (item.spawnData.hotspotTags[tag] !== undefined) {
                    totalWeight += item.spawnData.hotspotTags[tag]!;
                }
            }
        }

        // --- HOTSPOT RARITY BONUS ---
        // Apply rarity-based multipliers if fishing in an active hotspot
        if (locationTags.isInHotspot && totalWeight > 0) {
            const rarityMultiplier = this.getHotspotRarityMultiplier(item.rarity);
            totalWeight *= rarityMultiplier;
            
            if (rarityMultiplier !== 1.0) {
                console.log(`[FishSpawnManager] Hotspot bonus applied to ${item.name} (${item.rarity}): ${rarityMultiplier}x (${totalWeight.toFixed(2)} total weight)`);
            }
        }

        return Math.max(0, totalWeight);
    }

    // --- Get hotspot rarity multiplier for a specific rarity ---
    private getHotspotRarityMultiplier(rarity: string): number {
        switch (rarity.toLowerCase()) {
            case 'common': return this.hotspotRarityConfig.commonMultiplier;
            case 'uncommon': return this.hotspotRarityConfig.uncommonMultiplier;
            case 'rare': return this.hotspotRarityConfig.rareMultiplier;
            case 'epic': return this.hotspotRarityConfig.epicMultiplier;
            case 'legendary': return this.hotspotRarityConfig.legendaryMultiplier;
            case 'mythic': return this.hotspotRarityConfig.mythicMultiplier;
            default: return 1.0; // No bonus for unknown rarities
        }
    }

    // --- Check if a position is in an active hotspot ---
    public checkHotspotAtPosition(position: Vector3): { isInHotspot: boolean; hotspot?: any } {
        if (!this.hotspotManager) {
            return { isInHotspot: false };
        }
        
        const hotspot = this.hotspotManager.isPlayerInHotspot(position);
        return {
            isInHotspot: !!hotspot,
            hotspot: hotspot
        };
    }

    // --- Check if player is in a freshwater zone ---
    private isInFreshwaterZone(locationTags: LocationTags, player: Player, fishingPosition: Vector3): boolean {
        // Primary check: pond subzone tag
        if (locationTags.subzoneTags.includes('pond')) {
            console.log("[FishSpawnManager] Detected freshwater zone via 'pond' subzone tag");
            return true;
        }

        // Fallback check: Y-level detection for unmapped freshwater areas
        // Use actual fishing/water position Y-level (not player position)
        if (fishingPosition.y > 12) {
            console.log(`[FishSpawnManager] Detected freshwater zone via Y-level (water at ${fishingPosition.y} > 12)`);
            return true;
        }

        console.log(`[FishSpawnManager] Saltwater zone detected - Water Y-level: ${fishingPosition.y}, Subzone tags: [${locationTags.subzoneTags.join(', ')}]`);
        return false;
    }

    // **NEW: Special magnet treasure hunting mode with conservative chest rates**
    private rollForMagnetTreasure(locationTags: LocationTags, time: number, player: Player, fishingPosition: Vector3): FishData | null {
        console.log('🧲 MAGNET TREASURE HUNTER MODE - CONSERVATIVE CHEST SYSTEM');
        console.log('📊 CALCULATING MAGNET CHEST PROBABILITIES:');
        
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        const modifiedRodStats = EnchantmentHelper.getEnchantmentModifiedStats(equippedRod);
        const rodLootScore = modifiedRodStats.lootScore;
        
        console.log(`🎣 Rod Loot Score: ${rodLootScore}`);
        
        // **STAGE 1: Calculate chest probability based on loot score (CONSERVATIVE APPROACH)**
        const chestChance = this.calculateMagnetChestChance(rodLootScore);
        console.log(`📦 Base Chest Chance: ${(chestChance * 100).toFixed(1)}%`);
        
        // Roll for chest vs no-chest
        const stage1Roll = Math.random();
        
        if (stage1Roll >= chestChance) {
            // No chest - 50/50 trash vs old_can
            const stage1bRoll = Math.random();
            const fallbackItem = stage1bRoll < 0.5 ? 'trash' : 'old_can';
            console.log(`🚫 NO CHEST: Rolling fallback (${(stage1Roll * 100).toFixed(1)}% >= ${(chestChance * 100).toFixed(1)}% threshold)`);
            console.log(`🗑️ Fallback result: ${fallbackItem} (${(stage1bRoll * 100).toFixed(1)}% roll)`);
            
            // Return null to trigger fallback loot system which will give trash/old_can
            return null;
        }
        
        // **STAGE 2: Determine chest type based on loot score (CONSERVATIVE RATES)**
        const chestDistribution = this.calculateMagnetChestDistribution(rodLootScore);
        console.log(`🎁 CHEST WON! (${(stage1Roll * 100).toFixed(1)}% < ${(chestChance * 100).toFixed(1)}% threshold)`);
        console.log(`📊 Chest Distribution: Common ${chestDistribution.common}%, Rare ${chestDistribution.rare}%, Legendary ${chestDistribution.legendary}%`);
        
        const stage2Roll = Math.random() * 100;
        let selectedChestType: string;
        
        if (stage2Roll < chestDistribution.legendary) {
            selectedChestType = 'legendary_chest';
        } else if (stage2Roll < chestDistribution.legendary + chestDistribution.rare) {
            selectedChestType = 'rare_chest';
        } else {
            selectedChestType = 'common_chest';
        }
        
        console.log(`🏆 Selected Chest Type: ${selectedChestType} (roll: ${stage2Roll.toFixed(1)}%)`);
        
        // Find the chest in FISH_CATALOG or create a synthetic one
        const chestFishData = FISH_CATALOG.find(fish => fish.id === selectedChestType);
        
        if (chestFishData) {
            console.log(`📦 Found ${selectedChestType} in fish catalog`);
            return chestFishData;
        } else {
            // Create synthetic chest data if not in catalog
            console.log(`⚠️ ${selectedChestType} not found in catalog, creating synthetic chest data`);
            return this.createSyntheticChestData(selectedChestType);
        }
    }
    
    /**
     * Calculate base chest chance for magnet fishing (rod-type based)
     */
    private calculateMagnetChestChance(lootScore: number): number {
        // Unified system: Both loot rod and regular rod have same chest chance with magnet
        const chestChance = 0.33; // 33% chest chance with magnet (regardless of rod type)
        console.log(`🧮 Magnet + Rod (lootScore ${lootScore}): ${chestChance * 100}% chest chance`);
        return chestChance;
    }
    
    /**
     * Calculate chest type distribution for magnet fishing (rod-type based)
     */
    private calculateMagnetChestDistribution(lootScore: number): { common: number; rare: number; legendary: number } {
        // Unified distribution: Same for all rods with magnet
        const distribution = { common: 90, rare: 8, legendary: 2 };
        console.log(`📊 Magnet Chest Distribution (lootScore ${lootScore}): ${JSON.stringify(distribution)}`);
        return distribution;
    }
    
    /**
     * Create synthetic chest data for chest types not in fish catalog
     */
    private createSyntheticChestData(chestType: string): FishData {
        const chestConfigs = {
            'common_chest': {
                name: 'Treasure Chest',
                baseValue: 100,
                minWeight: 50,
                maxWeight: 100,
                rarity: 'uncommon' as const
            },
            'rare_chest': {
                name: 'Rare Chest',
                baseValue: 500,
                minWeight: 150,
                maxWeight: 250,
                rarity: 'rare' as const
            },
            'legendary_chest': {
                name: 'Legendary Chest',
                baseValue: 2000,
                minWeight: 300,
                maxWeight: 500,
                rarity: 'legendary' as const
            }
        };
        
        const config = chestConfigs[chestType as keyof typeof chestConfigs] || chestConfigs['common_chest'];
        
        const syntheticChest: FishData = {
            id: chestType,
            name: config.name,
            rarity: config.rarity,
            baseValue: config.baseValue,
            minWeight: config.minWeight,
            maxWeight: config.maxWeight,
            isBait: false,
            isLoot: true, // Mark as loot for proper handling
            spawnData: {
                baseChance: 100, // High base chance since magnet already determined this chest should spawn
                regionTags: {}, // Empty region tags - will spawn anywhere with magnet
                timeWindows: [], // Available all times
                isStarterFish: false,
                questGated: false
            },
            isTrophy: false, // Chests are not trophy fish
            modelData: {
                modelUri: `models/items/${chestType}.gltf`,
                sprite: `${chestType}_sprite.png`,
                baseScale: 0.5,
                maxScale: 0.7
            }
        };
        
        console.log(`🔧 Created synthetic chest: ${config.name} (${config.rarity})`);
        return syntheticChest;
    }

    /**
     * Check if a quest-gated fish is eligible to spawn for the current player/conditions
     */
    private isQuestGatedFishEligible(fish: FishData, player: Player, fishingPosition: Vector3): boolean {
        // Get quest manager
        const questManager = GameManager.instance?.questManager;
        if (!questManager) {
            console.log(`[FishSpawnManager] No quest manager available for quest-gated fish: ${fish.name}`);
            return false;
        }

            // Check if player has the required quest active or completed
            if (fish.spawnData.requiredQuest) {
                const playerState = this.playerStateManager.getState(player);
                if (!playerState) {
                    console.log(`[FishSpawnManager] No player state found for player ${player.id}`);
                    return false;
                }

                // For relic_shard (Explorer riddle quest), check if riddle quest is active
                if (fish.id === 'relic_shard' && fish.spawnData.requiredQuest === 'explorer_solve_riddle') {
                    const riddleQuestActive = playerState.quests.active[fish.spawnData.requiredQuest];
                    if (!riddleQuestActive) {
                        console.log(`[FishSpawnManager] Player ${player.id} doesn't have riddle quest active`);
                        return false;
                    }
                    console.log(`[FishSpawnManager] Player ${player.id} has riddle quest active - relic shard eligible`);
                } else {
                    // For other quest-gated fish, check if quest is active
                    const activeQuestIds = Object.keys(playerState.quests.active || {});
                    console.log(`[FishSpawnManager] Player ${player.id} active quests:`, activeQuestIds);
                    console.log(`[FishSpawnManager] Looking for quest: ${fish.spawnData.requiredQuest}`);

                    const hasActiveQuest = playerState.quests.active[fish.spawnData.requiredQuest];
                    if (!hasActiveQuest) {
                        console.log(`[FishSpawnManager] Player ${player.id} doesn't have required quest active: ${fish.spawnData.requiredQuest}`);
                        console.log(`[FishSpawnManager] Available active quests:`, Object.keys(playerState.quests.active || {}));
                        return false;
                    }

                    // Skip quest stage checking for ancient cartographer quests - just need the quest to be active
                    console.log(`[FishSpawnManager] Player ${player.id} has required quest active: ${fish.spawnData.requiredQuest} for ${fish.name}`);
                }
            }

        // Check if player has the required bait equipped
        if (fish.spawnData.requiredBait) {
            const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
            const equippedBait = playerEntity.getEquippedBait(player)?.item;
            
            if (!equippedBait || equippedBait.id !== fish.spawnData.requiredBait) {
                console.log(`[FishSpawnManager] Player ${player.id} doesn't have required bait equipped: ${fish.spawnData.requiredBait}. Current: ${equippedBait?.id || 'none'}`);
                return false;
            }
        }

        // Check coordinate-based location requirements for quest items
        if (fish.spawnData.questCoordinates) {
            const isAtQuestLocation = this.isPlayerNearQuestCoordinates(
                fishingPosition, 
                fish.spawnData.questCoordinates
            );
            
            if (!isAtQuestLocation) {
                console.log(`[FishSpawnManager] Player ${player.id} not at required quest coordinates for ${fish.name}. Required: (${fish.spawnData.questCoordinates.x}, ${fish.spawnData.questCoordinates.y}, ${fish.spawnData.questCoordinates.z}) with radius ${fish.spawnData.questCoordinates.radius}`);
                return false;
            }
        }

        // Check time window requirements for quest items
        const currentGameHour = GameClock.instance.hour;
        if (fish.spawnData.spawnTimes && fish.spawnData.spawnTimes.length > 0) {
            const timeWindows = convertSpawnTimesToWindows(fish.spawnData.spawnTimes);
            if (timeWindows.length > 0 && !this.isInTimeWindow(timeWindows, currentGameHour)) {
                console.log(`[FishSpawnManager] ${fish.name} not available at current time for quest. Current: ${currentGameHour}:00 (${getCurrentTimePeriod(currentGameHour)}), Required: ${fish.spawnData.spawnTimes.join(', ')}`);
                return false;
            }
        } else if (fish.spawnData.timeWindows && fish.spawnData.timeWindows.length > 0) {
            // Legacy timeWindows check
            if (!this.isInTimeWindow(fish.spawnData.timeWindows, currentGameHour)) {
                console.log(`[FishSpawnManager] ${fish.name} not available at current time for quest (legacy timeWindows). Current: ${currentGameHour}:00`);
                return false;
            }
        }

        console.log(`[FishSpawnManager] Quest-gated fish ${fish.name} is eligible for player ${player.id}`);
        return true;
    }

    /**
     * Check if a bait item is an ancient magnet
     */
    private isAncientMagnet(baitId: string): boolean {
        return baitId === 'ancient_magnet';
    }

    /**
     * Handle fishing with ancient magnets - special quest logic
     */
    private _handleAncientMagnetFishing(
        player: Player, 
        playerEntity: GamePlayerEntity, 
        position: Vector3,
        locationTags: LocationTags, 
        ancientMagnet: InventoryItem,
        time: number
    ): CaughtFish | null {
        console.log(`[FishSpawnManager] Ancient magnet fishing detected: ${ancientMagnet.id}`);

        // Try to find a quest-gated map fragment for this magnet
        const eligibleMapFragments = FISH_CATALOG.filter(fish => 
            fish.spawnData.questGated && 
            fish.spawnData.requiredBait === ancientMagnet.id
        );

        if (eligibleMapFragments.length === 0) {
            console.log(`[FishSpawnManager] No map fragments configured for magnet: ${ancientMagnet.id}`);
            this._returnAncientMagnet(player, playerEntity, ancientMagnet, "No quest fragments found for this ancient magnet.");
            return null;
        }

        // Check if any fragments are eligible (quest active, correct stage, etc.)
        const validFragments = eligibleMapFragments.filter(fragment => 
            this.isQuestGatedFishEligible(fragment, player, position)
        );

        if (validFragments.length === 0) {
            console.log(`[FishSpawnManager] Ancient magnet used but no valid quest fragments at this location/time`);
            this._returnAncientMagnet(player, playerEntity, ancientMagnet, "The ancient magnet doesn't respond here. Perhaps try a different location or check your quest progress.");
            return null;
        }

        // Roll for the quest fragment (should be guaranteed success if conditions are met)
        const selectedFragment = validFragments[0]; // Take the first valid fragment
        
        // Calculate weight for fragment at this location
        const fragmentWeight = this.calculateItemWeight(selectedFragment, locationTags);
        
        if (fragmentWeight <= 0) {
            console.log(`[FishSpawnManager] Map fragment has no spawn weight at this location`);
            this._returnAncientMagnet(player, playerEntity, ancientMagnet, "The ancient magnet pulses weakly. This doesn't seem like the right place.");
            return null;
        }

        // Generate the fragment as a catch
        const catchAttempt = this.generateCatch(selectedFragment, player);
        if (catchAttempt.status === 'success' && catchAttempt.fish) {
            console.log(`[FishSpawnManager] Successfully found map fragment: ${selectedFragment.name}`);
            
            // Store ancient magnet info for deferred consumption (only consume on successful reel)
            catchAttempt.fish.questBait = {
                id: ancientMagnet.id,
                name: ancientMagnet.name
            };
            console.log(`[FishSpawnManager] Ancient magnet ${ancientMagnet.name} will be consumed only on successful reel`);
            
            // Send success message
            if (catchAttempt.message) {
                this.playerStateManager.sendGameMessage(player, catchAttempt.message);
            }
            
            return catchAttempt.fish;
        } else {
            console.log(`[FishSpawnManager] Failed to generate map fragment catch`);
            this._returnAncientMagnet(player, playerEntity, ancientMagnet, "The ancient magnet detected something but it slipped away. Try again.");
            return null;
        }
    }

    /**
     * Return ancient magnet to player inventory with message
     */
    private _returnAncientMagnet(
        player: Player, 
        playerEntity: GamePlayerEntity, 
        ancientMagnet: InventoryItem, 
        message: string
    ): void {
        // Don't remove the magnet since we're returning it
        console.log(`[FishSpawnManager] Returning ancient magnet to player: ${message}`);
        
        // Send message to player
        this.playerStateManager.sendGameMessage(player, `🧭 ${message}`);
        
        // Note: The magnet stays equipped since it wasn't consumed
        // The fishing minigame will handle ending the fishing session
    }

    /**
     * Handle magnet fishing for fragment quest (bait_magnet in ancient pools)
     * Also handles riddle quest (relic shard at pyramid pool)
     */
    private _handleFragmentQuestMagnetFishing(
        player: Player,
        playerEntity: GamePlayerEntity,
        position: Vector3,
        locationTags: LocationTags,
        magnet: InventoryItem,
        time: number
    ): CaughtFish | null {
        console.log(`[FishSpawnManager] Fragment quest magnet fishing detected: ${magnet.id}`);

        const state = this.playerStateManager.getState(player);
        if (!state) {
            console.log(`[FishSpawnManager] No state found for player ${player.id}`);
            return null;
        }

        // First check for Forge quest at pyramid pool
        const forgeQuestId = 'explorer_solve_riddle';
        const forgeQuestActive = state.quests.active[forgeQuestId];
        const isAtPyramidPool = this._isAtPyramidPool(position);
        
        if (forgeQuestActive && isAtPyramidPool) {
            console.log(`[FishSpawnManager] Forge quest active and at pyramid pool - spawning relic shard`);
            
            // Find relic shard in fish catalog
            const relicShardData = FISH_CATALOG.find(f => f.id === 'relic_shard');
            if (!relicShardData) {
                console.error(`[FishSpawnManager] relic_shard not found in FISH_CATALOG`);
                return null;
            }
            
            // Generate catch for relic shard
            const catchResult = this.generateCatch(relicShardData, player);
            if (catchResult.status !== 'success' || !catchResult.fish) {
                console.error(`[FishSpawnManager] Failed to generate catch for relic shard`);
                return null;
            }
            
            // Store magnet as questBait to be consumed on successful reel
            catchResult.fish.questBait = {
                id: magnet.id,
                name: magnet.name
            };
            console.log(`[FishSpawnManager] Magnet will be consumed on successful relic shard reel`);
            
            console.log(`[FishSpawnManager] ✓ Successfully created relic shard. Returning CaughtFish.`);
            return catchResult.fish;
        }

        // Check if fragments quest is active
        const fragmentsQuestId = 'explorer_fragments_of_magnet';
        const fragmentsQuestActive = state.quests.active[fragmentsQuestId];
        console.log(`[FishSpawnManager] Fragments quest active: ${!!fragmentsQuestActive}, quest ID: ${fragmentsQuestId}`);
        
        if (!fragmentsQuestActive) {
            // Quest not active - let normal fishing continue
            console.log(`[FishSpawnManager] Fragments quest not active, allowing normal fishing`);
            return null;
        }

        // Check if position is in an ancient pool zone
        // For now, we'll check if it's near known ancient pool locations
        // These should be tagged in the fishing zones system, but for now we'll use coordinates
        const isInAncientPool = this._isInAncientPoolZone(position);
        const poolId = this._getAncientPoolId(position);
        console.log(`[FishSpawnManager] Position check - isInAncientPool: ${isInAncientPool}, poolId: ${poolId}, position: (${position.x}, ${position.y}, ${position.z})`);
        
        if (!isInAncientPool || !poolId) {
            // Not in an ancient pool - let normal fishing continue
            console.log(`[FishSpawnManager] Not in ancient pool zone, allowing normal fishing`);
            return null;
        }

        // Count fragments player already has
        const inventoryManager = this.playerStateManager.getInventoryManager();
        if (!inventoryManager) {
            console.log(`[FishSpawnManager] InventoryManager not available`);
            return null;
        }

        // Count fragments player already has (using quantity for stackable item)
        const inventory = this.playerStateManager.getInventory(player);
        const fragmentItem = inventory?.items.find(item => item.id === 'ancient_fragment');
        const fragmentCount = fragmentItem ? fragmentItem.quantity : 0;

        console.log(`[FishSpawnManager] Player has ${fragmentCount} of 3 fragments`);

        // If player already has 3 fragments, don't spawn anything (shouldn't happen, but safety check)
        if (fragmentCount >= 3) {
            console.log(`[FishSpawnManager] Player already has all 3 fragments, skipping fragment spawn`);
            return null;
        }

        // Check if this pool has already been "drained" (per-player tracking to prevent farming)
        if (!state.flags) state.flags = {} as any;
        if (!(state.flags as any).fragmentPoolsVisited) (state.flags as any).fragmentPoolsVisited = [];
        const visited: string[] = (state.flags as any).fragmentPoolsVisited;
        console.log(`[FishSpawnManager] Visited pools: ${visited.join(', ')}, checking pool: ${poolId}`);
        if (visited.includes(poolId)) {
            console.log(`[FishSpawnManager] Pool ${poolId} already visited by player ${player.id}, skipping fragment spawn`);
            return null;
        }

        // Spawn a fragment (all 3 pools give fragments)
        // Note: Currently always 'ancient_fragment', but type allows 'fitz_note_last_fragment' for future use
        let itemToSpawn: 'ancient_fragment' | 'fitz_note_last_fragment' = 'ancient_fragment';

        console.log(`[FishSpawnManager] Spawning ${itemToSpawn} in ancient fragment chest`);

        // Find the chest in the fish catalog (it needs to be there for reeling game)
        const chestFishData = FISH_CATALOG.find(f => f.id === 'ancient_fragment_chest');
        if (!chestFishData) {
            console.error(`[FishSpawnManager] ancient_fragment_chest not found in FISH_CATALOG`);
            return null;
        }

        // Use generateCatch to create a proper CaughtFish with correct ID format
        const catchResult = this.generateCatch(chestFishData, player);
        if (catchResult.status !== 'success' || !catchResult.fish) {
            console.error(`[FishSpawnManager] Failed to generate catch for ancient fragment chest`);
            return null;
        }

        const caughtFish = catchResult.fish;
        
        // Store the fragment/note in the chest's metadata
        // The metadata will be preserved through the reeling game
        if (!caughtFish.metadata) {
            caughtFish.metadata = {};
        }
        caughtFish.metadata.contents = [{ itemId: itemToSpawn, count: 1 }];

        // Mark this pool as visited (prevent duplicate spawns here for this player)
        visited.push(poolId);
        console.log(`[FishSpawnManager] Marked pool ${poolId} as visited. Updated visited list: ${visited.join(', ')}`);

        // If this is Fitz's note, auto-start the finale bet quest and open the note panel
        // Note: Currently itemToSpawn is always 'ancient_fragment', but this check is kept for future use
        if (itemToSpawn === ('fitz_note_last_fragment' as typeof itemToSpawn)) {
            const questManager = GameManager.instance?.questManager;
            if (questManager && questManager.isQuestAvailable(player, 'fitz_finale_bet_100lb_trophy')) {
                questManager.assignQuest(player, 'fitz_finale_bet_100lb_trophy');
                console.log(`[FishSpawnManager] Auto-started Fitz finale bet quest for player ${player.id}`);
            }
            // Trigger client to show the Fitz Note panel immediately after catch
            player.ui.sendData({ type: 'openFitzNote' });
        }

        console.log(`[FishSpawnManager] ✓ Successfully created ancient fragment chest with ${itemToSpawn}. Returning CaughtFish.`);
        return caughtFish;
    }

    /**
     * Check if position is at the pyramid pool (for riddle quest)
     */
    private _isAtPyramidPool(position: Vector3): boolean {
        const pyramidPool = { x: 63, y: 11, z: 186, radius: 3 };
        const distance = Math.sqrt(
            Math.pow(position.x - pyramidPool.x, 2) +
            Math.pow(position.z - pyramidPool.z, 2)
        );
        
        if (distance <= pyramidPool.radius) {
            console.log(`[FishSpawnManager] Position is at pyramid pool (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
            return true;
        }
        
        return false;
    }

    /**
     * Check if position is in an ancient pool zone
     * Ancient pools are marked by special stone structures near water
     * Known locations: Mainland fountain, Toolmaster island pool, Waterfall pool
     */
    private _isInAncientPoolZone(position: Vector3): boolean {
        // Known ancient pool coordinates (approximate, can be refined)
        const ancientPoolLocations = [
            { x: -13, y: 32, z: 3, radius: 25 },      // Central fountain
            { x: -129, y: 13, z: -214, radius: 25 },   // Toolmaster island pool
            { x: 216, y: 11, z: 103, radius: 25 }      // Waterfall pool
        ];

        for (const pool of ancientPoolLocations) {
            const distance = Math.sqrt(
                Math.pow(position.x - pool.x, 2) +
                Math.pow(position.y - pool.y, 2) +
                Math.pow(position.z - pool.z, 2)
            );
            
            if (distance <= pool.radius) {
                console.log(`[FishSpawnManager] Position is in ancient pool zone at (${pool.x}, ${pool.y}, ${pool.z})`);
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the ID of the ancient pool the position is in (or null if none)
     */
    private _getAncientPoolId(position: Vector3): string | null {
        const pools = [
            { id: 'central_fountain', x: -13, y: 32, z: 3, radius: 25 },
            { id: 'toolmaster_pool', x: -129, y: 13, z: -214, radius: 25 },
            { id: 'shadow_waterfall', x: 216, y: 11, z: 103, radius: 25 }
        ];

        for (const pool of pools) {
            const distance = Math.sqrt(
                Math.pow(position.x - pool.x, 2) +
                Math.pow(position.y - pool.y, 2) +
                Math.pow(position.z - pool.z, 2)
            );
            if (distance <= pool.radius) return pool.id;
        }
        return null;
    }

}