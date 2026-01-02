import { Player, Vector3, World, Entity } from "hytopia";
import { BAIT_CATALOG, BaitService } from "../Bait/BaitCatalog";
import { PlayerStateManager } from '../PlayerStateManager';
import type { InventoryItem, LootItem } from "../Inventory/Inventory";
import type { GamePlayerEntity } from "../GamePlayerEntity";
import { ITEM_CATALOG } from '../Crafting/ItemCatalog';
import { ItemFactory } from '../Inventory/ItemFactory';
import type { LocationTags } from "./FishSpawnManager";
import { LOOT_CATALOG } from './LootCatalog';
import type { LootDefinition } from './LootCatalog';
import { FALLBACK_LOOT_TABLES } from './FallbackLootTables';
import type { FallbackLootTable } from './FallbackLootTables';
import { ALL_FISHING_ZONES } from './PhshTwoFishingZones';
import type { RegionTag } from "./PhshTwoFishingZones";
import { EnchantmentHelper } from './EnchantmentHelper';
import GameClock from '../GameClock';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'rod' | 'bait' | 'fish' | 'boat' | 'accessory' |'item';

// Define categories for fallback loot
type FallbackLootCategory = 'discardable_junk' | 'low_value_kept' | 'common_material' | 'common_bait' | 'basic_chest';

// Define the structure of the loot table entries
type FallbackLootTableEntry = {
    id: string;
    chance: number;
    quantityRange: [number, number]; // [min, max]
    category: FallbackLootCategory;
};

// Helper: Find the current fishing zone for a player position
function getCurrentFishingZone(position: { x: number, y: number, z: number }): any | undefined {
    // Simple radius check; you may want to optimize this
    for (const zone of ALL_FISHING_ZONES) {
        const dx = position.x - zone.position.x;
        const dy = position.y - zone.position.y;
        const dz = position.z - zone.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radiusSquared = zone.radius * zone.radius;
        if (distSq <= radiusSquared) {
            return zone;
        }
    }
    return undefined;
}

export class FishLootManager {
    private world: World;
    private playerStateManager: PlayerStateManager;
    
    constructor(world: World, playerStateManager: PlayerStateManager) {
        this.world = world;
        this.playerStateManager = playerStateManager;
    }
    
    /**
     * Generates dynamic fallback loot if primary fishing roll results in nothing.
     * @param player The player fishing
     * @param fishingPosition The actual position where the fishing is taking place
     * @param locationTags The tags of the current fishing location
     * @param equippedBait The bait item equipped by the player, if any
     * @returns A loot item if successful, null otherwise
     */
    public generateDynamicFallbackLoot(player: Player, fishingPosition: Vector3, locationTags: LocationTags, equippedBait: InventoryItem | null | undefined): LootItem | null {
        // Use the provided fishing position directly instead of trying to get it from player entity
        
        // Find the zone that actually contains this position (smallest radius wins if multiple zones overlap)
        let fallbackKey = 'default_fallback';
        let selectedZone: any = null;
        
        const zonesAtPosition = ALL_FISHING_ZONES
            .filter(zone => zone.fallbackTableKey) // Only zones with fallback tables
            .filter(zone => {
                // Check if position is actually within this zone's radius
                const dx = fishingPosition.x - zone.position.x;
                const dy = fishingPosition.y - zone.position.y;
                const dz = fishingPosition.z - zone.position.z;
                const distanceSquared = dx * dx + dy * dy + dz * dz;
                const radiusSquared = zone.radius * zone.radius;
                return distanceSquared <= radiusSquared;
            })
            .sort((a, b) => a.radius - b.radius); // Smaller radius = more specific = higher priority
        
        if (zonesAtPosition.length > 0) {
            selectedZone = zonesAtPosition[0]; // Use the smallest zone that contains the position
            fallbackKey = selectedZone.fallbackTableKey!;
            console.log(`[LootRoll] Using fallback table '${fallbackKey}' for position [${fishingPosition.x.toFixed(1)}, ${fishingPosition.y.toFixed(1)}, ${fishingPosition.z.toFixed(1)}] (zone: ${selectedZone.name}, radius: ${selectedZone.radius})`);
        } else {
            console.log(`[LootRoll] No zones found at position [${fishingPosition.x.toFixed(1)}, ${fishingPosition.y.toFixed(1)}, ${fishingPosition.z.toFixed(1)}], using default fallback`);
        }
        
        const lootTable = FALLBACK_LOOT_TABLES[fallbackKey] || FALLBACK_LOOT_TABLES['default_fallback'];
        if (!lootTable || lootTable.length === 0) {
            return null;
        }
        
        // Apply time-of-day filtering for special items
        const currentHour = GameClock.instance.hour;
        const isNightTime = currentHour >= 19 || currentHour < 6; // 7 PM - 6 AM
        const isShadowIsle = selectedZone && (selectedZone.name.toLowerCase().includes('shadow') || fallbackKey.includes('shadow'));
        
        // Filter out ghost shrimp if not night time at eligible locations
        const isGhostShrimpLocation = selectedZone && (
            selectedZone.name.toLowerCase().includes('shadow') || 
            fallbackKey.includes('shadow') ||
            fallbackKey.includes('shady_beach')
        );
        
        const timeFilteredLootTable = lootTable.filter(entry => {
            if (entry.id === 'bait_ghost_shrimp') {
                if (!isNightTime || !isGhostShrimpLocation) {
                    console.log(`[LootRoll] Filtering out ghost shrimp - Night: ${isNightTime}, Ghost location: ${isGhostShrimpLocation}, Hour: ${currentHour}`);
                    return false; // Remove ghost shrimp from loot table
                } else {
                    console.log(`[LootRoll] Ghost shrimp eligible - Night time at ghost location (Hour: ${currentHour})`);
                }
            }
            return true;
        });
        
        // Log the full fallback loot table before filtering
        console.log('[LootRoll] Raw fallback loot table:', JSON.stringify(timeFilteredLootTable, null, 2));
        // Filter LOOT_CATALOG for fishing-sourced loot
        const currentRegionTags = locationTags.regionTags;
        const fishingLoot = LOOT_CATALOG.filter(l => l.sources && l.sources.includes('fishing'));
        
        // Check rod weight limits - filter out items that are too heavy for the equipped rod
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        const equippedRod = playerEntity.getEquippedRod(player);
        const rodMaxWeight = equippedRod?.metadata?.rodStats?.maxCatchWeight || 250; // Default if no rod
        
        // Filter by weight - exclude items that exceed rod's maxCatchWeight
        const weightEligibleLoot = fishingLoot.filter(lootDef => {
            if (lootDef.weight > rodMaxWeight) {
                console.log(`[LootRoll] Excluding ${lootDef.name} (weight: ${lootDef.weight}) - exceeds rod capacity (${rodMaxWeight})`);
                return false;
            }
            return true;
        });
        
        // Log the filtered loot
        console.log('[LootRoll] Weight-eligible fishing loot:', weightEligibleLoot.map(l => l.id));
        // Only use loot from the catalog that matches the fallback table ids
        const adjustedLootTable: FallbackLootTable = [];
        let totalChance = 0;
        // Get Player Level and Bait Loot Score
        const fishingSkillLevel = this.playerStateManager.getCurrentLevel(player);
        const baitLootScore = (equippedBait?.metadata?.baitStats?.lootScore) ?? 0; 
        const equippedBaitId = equippedBait?.id;
        // Get rod lootScore with enchantment bonuses applied
        const modifiedRodStats = EnchantmentHelper.getEnchantmentModifiedStats(equippedRod);
        const rodLootScore = modifiedRodStats.lootScore;
        for (const entry of timeFilteredLootTable) {
            const lootDef = weightEligibleLoot.find(l => l.id === entry.id);
            if (!lootDef) {
                console.log(`[LootRoll] Skipping ${entry.id} (not in fishingLoot)`);
                continue; // Skip if not available for fishing or region
            }
            let adjustedChance = entry.chance;
            let logDetails = [`Base chance for ${entry.id}: ${adjustedChance}`];
            
            // All regional drop rates are handled in FallbackLootTables.ts
            // No need for additional regional multipliers here
            // Calculate dynamic modifiers based on skill, bait, and rod lootScore
            let skillTrashMultiplier = 1.0;
            if (fishingSkillLevel >= 100) skillTrashMultiplier = 0.75; // 25% reduction
            else if (fishingSkillLevel >= 50) skillTrashMultiplier = 0.80; // 20% reduction
            else if (fishingSkillLevel >= 25) skillTrashMultiplier = 0.85; // 15% reduction
            else if (fishingSkillLevel >= 10) skillTrashMultiplier = 0.90; // 10% reduction
            else if (fishingSkillLevel >= 5) skillTrashMultiplier = 0.95;  // 5% reduction
            // New loot system: lootScore primarily affects trash vs useful loot ratio
            // Instead of a complex formula, use simpler tiers
            let baitTrashMultiplier = 1.0;
            if (baitLootScore >= 2.0) {
                baitTrashMultiplier = 0.2; // 80% trash reduction for high loot score (like magnet)
            } else if (baitLootScore >= 1.5) {
                baitTrashMultiplier = 0.5; // 50% trash reduction
            } else if (baitLootScore >= 1.2) {
                baitTrashMultiplier = 0.7; // 30% trash reduction
            } else if (baitLootScore >= 1.1) {
                baitTrashMultiplier = 0.85; // 15% trash reduction
            } // Max 70% reduction from bait
            // --- Dynamic Adjustments based on Category, Tags, and Rod lootScore ---
            // 1. Adjust based on Category & Global Modifiers (Skill, Bait)
            switch (entry.category) {
                case 'discardable_junk':
                    // Only affect actual trash, NOT old cans or other valuable items
                    logDetails.push(`Skill trash multiplier: ${skillTrashMultiplier}`);
                    logDetails.push(`Bait trash multiplier: ${baitTrashMultiplier}`);
                    adjustedChance *= skillTrashMultiplier;
                    adjustedChance *= baitTrashMultiplier;
                    // Rod lootScore: boost-style, higher lootScore = less junk
                    const rodJunkMult = Math.max(0.1, 2 - rodLootScore);
                    logDetails.push(`Rod junk multiplier: ${rodJunkMult}`);
                    adjustedChance *= rodJunkMult;
                    break;
                case 'low_value_kept':
                    // Old cans are valuable! Only apply skill reduction, not bait lootScore
                    logDetails.push(`Skill trash multiplier: ${skillTrashMultiplier}`);
                    adjustedChance *= skillTrashMultiplier;
                    break;
                case 'common_material':
                case 'common_bait':
                    const rodCommonMult = Math.max(0.2, 2 - rodLootScore);
                    logDetails.push(`Rod common multiplier: ${rodCommonMult}`);
                    adjustedChance *= rodCommonMult;
                    break;
                case 'basic_chest':
                    // Optional: Apply separate luck/boost multipliers
                    break;
            }
            // NEW: Rarity boost system based on combined loot scores
            // Every 0.25 points above 1.0 gives marginally better rarity odds
            const combinedLootScore = Math.max(baitLootScore, rodLootScore);
            if (combinedLootScore > 1.0 && ['rare', 'epic', 'legendary'].includes(lootDef.rarity)) {
                const rarityBoostTiers = Math.floor((combinedLootScore - 1.0) / 0.25);
                const rarityMultiplier = 1.0 + (rarityBoostTiers * 0.1); // 10% boost per tier
                
                if (rarityMultiplier > 1.0) {
                    logDetails.push(`Rarity boost (${lootDef.rarity}, ${rarityBoostTiers} tiers): x${rarityMultiplier.toFixed(2)}`);
                    adjustedChance *= rarityMultiplier;
                }
            }
            // 2. Apply Preferred Loot Boost from Bait (NEW)
            if (equippedBait && equippedBait.metadata?.baitStats?.preferredLoot) {
                const preferredLootBoosts = equippedBait.metadata.baitStats.preferredLoot;
                for (const boost of preferredLootBoosts) {
                    if (boost.lootTableId === entry.id) {
                        logDetails.push(`Bait preferred loot boost: x${boost.boostMultiplier}`);
                        adjustedChance *= boost.boostMultiplier;
                        break; 
                    }
                }
            }
            
            // Note: Chests are now fish that can be reeled in directly!
            // Magnet bait still provides the preferredLoot boosts defined in BaitCatalog
            // 2b. Apply Preferred Loot Boost from Rod (NEW)
            if (equippedRod && equippedRod.metadata?.rodStats?.preferredLoot) {
                const preferredLootBoosts = equippedRod.metadata.rodStats.preferredLoot;
                for (const boost of preferredLootBoosts) {
                    if (boost.lootTableId === entry.id) {
                        logDetails.push(`Rod preferred loot boost: x${boost.boostMultiplier}`);
                        adjustedChance *= boost.boostMultiplier;
                        break;
                    }
                }
            }
            
            // NEW: Pity system - boost magnet bait chance based on catches without chest/ore
            // Only activates for players above level 10
            if (entry.id === 'bait_magnet' && fishingSkillLevel > 10) {
                const state = this.playerStateManager.getState(player);
                const catchesWithoutChestOre = state?.flags?.catchesWithoutChestOre || 0;
                
                if (catchesWithoutChestOre >= 50) {
                    adjustedChance *= 7.0; // 7x boost at 50+ catches (marginal increase from 40)
                    logDetails.push(`Pity system magnet boost: x7.0 (50+ catches without chest/ore, Lvl ${fishingSkillLevel})`);
                } else if (catchesWithoutChestOre >= 40) {
                    adjustedChance *= 6.5; // 6.5x boost at 40+ catches
                    logDetails.push(`Pity system magnet boost: x6.5 (40+ catches without chest/ore, Lvl ${fishingSkillLevel})`);
                } else if (catchesWithoutChestOre >= 30) {
                    adjustedChance *= 5.0; // 5x boost at 30+ catches (what 50 was)
                    logDetails.push(`Pity system magnet boost: x5.0 (30+ catches without chest/ore, Lvl ${fishingSkillLevel})`);
                } else if (catchesWithoutChestOre >= 20) {
                    adjustedChance *= 3.5; // 3.5x boost at 20+ catches (what 40 was)
                    logDetails.push(`Pity system magnet boost: x3.5 (20+ catches without chest/ore, Lvl ${fishingSkillLevel})`);
                } else if (catchesWithoutChestOre >= 10) {
                    adjustedChance *= 2.0; // 2x boost at 10+ catches (what 20 was)
                    logDetails.push(`Pity system magnet boost: x2.0 (10+ catches without chest/ore, Lvl ${fishingSkillLevel})`);
                }
            }
            
            adjustedLootTable.push({ ...entry, chance: adjustedChance });
            totalChance += adjustedChance;
            }
        
        // Log the adjusted loot table
        console.log('[LootRoll] Adjusted fallback loot table:', JSON.stringify(adjustedLootTable, null, 2));
        
        // Roll for a random item from the adjusted loot table
        const roll = Math.random() * totalChance;
        let cumulativeChance = 0;
        for (const entry of adjustedLootTable) {
            cumulativeChance += entry.chance;
            if (roll < cumulativeChance) {
                // Find the loot definition for this entry
                const lootDef = weightEligibleLoot.find(l => l.id === entry.id);
                if (!lootDef) {
                    console.error(`[LootRoll] Critical error: lootDef not found for ${entry.id}`);
                    continue;
                }
                
                // NEW: Reset pity counter to 10 when magnet bait is obtained (partial reset)
                if (entry.id === 'bait_magnet') {
                    const state = this.playerStateManager.getState(player);
                    if (state && state.flags) {
                        state.flags.catchesWithoutChestOre = 10;
                        console.log(`[Pity System] Magnet bait obtained - resetting chest/ore pity counter to 10`);
                    }
                }
                
                // Check if rod has enchantments - only enchanted rods can catch multiple fallback loot
                const hasEnchantments = equippedRod?.metadata?.enchantments && equippedRod.metadata.enchantments.length > 0;
                let quantity = Math.floor(Math.random() * (entry.quantityRange[1] - entry.quantityRange[0] + 1)) + entry.quantityRange[0];
                
                // Cap quantity at 1 if rod is not enchanted
                if (!hasEnchantments && quantity > 1) {
                    quantity = 1;
                    console.log(`[LootRoll] Rod not enchanted - capping quantity at 1 (was ${entry.quantityRange[0]}-${entry.quantityRange[1]})`);
                }
                
                // Apply Twin Hook enchantment (double fallback loot quantity)
                if (EnchantmentHelper.shouldDoubleFallbackLoot(equippedRod)) {
                    quantity *= 2;
                    console.log(`[LootRoll] Twin Hook enchantment - doubling fallback loot quantity to ${quantity}`);
                }
                
                // Check if ancient_driftwood requires specific rods
                if (entry.id === 'ancient_driftwood') {
                    const allowedRodsForDriftwood = ['ivory_rod']; // Can be expanded with more rods later
                    const equippedRodId = equippedRod?.id;
                    if (!equippedRodId || !allowedRodsForDriftwood.includes(equippedRodId)) {
                        console.log(`[LootRoll] Skipping ancient_driftwood - equipped rod (${equippedRodId}) not in allowed list: [${allowedRodsForDriftwood.join(', ')}]`);
                        // Skip this entry and continue to next roll (will return null if nothing else matches)
                        continue;
                    }
                }
                
                const lootItem: LootItem = {
                    id: entry.id,
                    name: lootDef.name,
                    quantity: quantity,
                    value: lootDef.value || 0
                };
                return lootItem;
            }
        }
        
        return null;
    }
    
    /**
     * Add loot to player's inventory
     * @param player The player to receive the loot
     * @param loot The loot item to add
     */
    public addLootToInventory(player: Player, loot: LootItem): void {
        if (loot.id === 'trash') {
            this.playerStateManager.sendGameMessage(player, `You hooked some trash. You threw it away.`);
            
            // Send UI message to disable cast button temporarily (prevent spam) - same as other fallback loot
            player.ui.sendData({
                type: 'fishingSuccessCooldown'
            });
            return;
        }
    
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        
        let inventoryItem = ItemFactory.createInventoryItemFromLootId(loot.id, loot.quantity);
        
        if (!inventoryItem) {
            console.error(`ItemFactory failed to create item for loot: ${JSON.stringify(loot)}`);
            return;
        }

        playerEntity.stateManager.addInventoryItem(player, inventoryItem);
        
        // Send UI message to disable cast button temporarily (prevent spam)
        player.ui.sendData({
            type: 'fishingSuccessCooldown'
        });

        this.playerStateManager.sendGameMessage(
            player, 
            `You hooked ${loot.quantity > 1 ? `${loot.quantity}x ` : ''}${loot.name}! Added to inventory.`
        );
    }

    /**
     * Display the loot item above the player
     * @param player The player who found the loot
     * @param loot The loot item to display
     */
    public displayLoot(player: Player, loot: LootItem): void {
        const playerEntity = this.world.entityManager.getPlayerEntitiesByPlayer(player)[0] as GamePlayerEntity;
        
        // Remove existing display items
        const existingDisplays = this.world.entityManager.getAllEntities().filter(
            entity => entity.name === 'displayLoot'
        );
        existingDisplays.forEach(entity => entity.despawn());

        // Get model URI based on loot type
        let modelUri = 'models/environment/waving-grass.gltf'; // Default to seaweed model
        let modelScale = 1.0;
        let modelAnimation = null;
        
        // Check loot catalog first
        const lootDef = LOOT_CATALOG.find(item => item.id === loot.id);
        const itemDef = ITEM_CATALOG.find(item => item.id === loot.id);
        const baitDef = BAIT_CATALOG[loot.id.replace(/^bait_/, '')];

        if (lootDef?.modelUri) {
            modelUri = lootDef.modelUri;
            modelScale = lootDef.baseScale ?? 0.8; // Use custom scale if specified, otherwise default to 0.8
        } else if (itemDef?.modelData?.modelUri) {
            modelUri = itemDef.modelData.modelUri;
            modelScale = itemDef.modelData.baseScale || 1.0;
        } else if (baitDef?.modelId) {
            modelUri = baitDef.modelId;
            modelScale = 0.8; // Example scale for bait
        }
        
        console.log(`Display loot with model: ${modelUri}`);
        
        // Create the display entity
        const displayEntity = new Entity({
            name: 'displayLoot',
            modelUri: modelUri,
            modelScale: modelScale,
            modelLoopedAnimations: modelAnimation ? [modelAnimation] : undefined,
            parent: playerEntity,
        });
        
        // Adjust Y position based on whether player is boating
        const baseY = playerEntity.isBoating ? 1.6 : 1.2; // Higher position when boating
        displayEntity.spawn(this.world, { x: 0, y: baseY, z: 0 });
        displayEntity.setAngularVelocity({ x: 0, y: Math.PI / 2, z: 0 });

        // Rotate and float animation
        let startTime = Date.now();
        const duration = 3000;
        const floatY = playerEntity.isBoating ? 3 : 1.5; // Adjust float height for boating
        const floatHeight = 0.3;
        
        const animateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(animateInterval);
                displayEntity.despawn();
                return;
            }
            
            // Rotate and float up and down
            displayEntity.rotation.y = progress * Math.PI * 2;
            displayEntity.position.y = floatY + Math.sin(progress * Math.PI * 2) * floatHeight;
        }, 16);
    }
}