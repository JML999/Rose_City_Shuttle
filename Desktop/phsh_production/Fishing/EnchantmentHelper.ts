import type { InventoryItem } from '../Inventory/Inventory';

/**
 * Helper class for applying rod enchantment effects to fishing mechanics
 */
export class EnchantmentHelper {
    /**
     * Check if a rod has a specific enchantment
     */
    static hasEnchantment(rod: InventoryItem | null | undefined, enchantmentId: string): boolean {
        if (!rod?.metadata?.enchantments) return false;
        return rod.metadata.enchantments.some((ench: any) => ench.id === enchantmentId);
    }

    /**
     * Get all enchantment IDs on a rod
     */
    static getEnchantmentIds(rod: InventoryItem | null | undefined): string[] {
        if (!rod?.metadata?.enchantments) return [];
        return rod.metadata.enchantments.map((ench: any) => ench.id);
    }

    /**
     * Get modified rod stats with enchantment bonuses applied
     */
    static getEnchantmentModifiedStats(rod: InventoryItem | null | undefined): {
        luck: number;
        maxCatchWeight: number;
        catchZone: number;
        catchSpeed: number;
        lootScore: number;
        drag: number;
    } {
        if (!rod?.metadata?.rodStats) {
            return {
                luck: 1,
                maxCatchWeight: 1,
                catchZone: 1,
                catchSpeed: 1,
                lootScore: 1,
                drag: 1
            };
        }

        const baseStats = rod.metadata.rodStats;
        const enchantments = rod.metadata.enchantments || [];

        let luck = baseStats.luck ?? 1;
        let maxCatchWeight = baseStats.maxCatchWeight ?? 1;
        let catchZone = baseStats.catchZone ?? 1;
        let catchSpeed = baseStats.catchSpeed ?? 1;
        let lootScore = baseStats.lootScore ?? 1;
        let drag = baseStats.drag ?? 1;

        // Apply enchantment bonuses
        for (const ench of enchantments) {
            switch (ench.id) {
                case 'giants_pull':
                    // +50% max catch weight
                    maxCatchWeight = Math.floor(maxCatchWeight * 1.5);
                    break;
                
                case 'modest_luck':
                    // +0.2 luck
                    luck += 0.2;
                    break;
                
                case 'greater_luck':
                    // +0.5 luck
                    luck += 0.5;
                    break;
                
                case 'swift_current':
                    // 1.3x catch speed (already applied in FishingMiniGame, but include here for completeness)
                    catchSpeed *= 1.3;
                    break;
                
                case 'steady_hands':
                    // +0.15 catch zone
                    catchZone += 0.15;
                    break;
                
                case 'weighted_zone':
                    // +0.1 catch zone, +50 max catch weight
                    catchZone += 0.1;
                    maxCatchWeight += 50;
                    break;
                
                case 'zone_fortune':
                    // +0.1 catch zone, +0.2 luck
                    catchZone += 0.1;
                    luck += 0.2;
                    break;
                
                case 'weighted_fortune':
                    // +50 max catch weight, +0.2 luck
                    maxCatchWeight += 50;
                    luck += 0.2;
                    break;
                
                case 'treasure_seeker':
                    // +0.4 lootScore - increases chance of chests and ores
                    lootScore += 0.4;
                    break;
            }
        }

        return {
            luck,
            maxCatchWeight,
            catchZone,
            catchSpeed,
            lootScore,
            drag
        };
    }

    /**
     * Get XP bonus multiplier from enchantments (e.g., 1.25 for +25% XP)
     */
    static getXPBonusMultiplier(rod: InventoryItem | null | undefined): number {
        if (!rod) return 1.0;
        const hasXpBoost = this.hasEnchantment(rod, 'xp_boost');
        return hasXpBoost ? 1.25 : 1.0; // +25% XP
    }

    /**
     * Check if Twin Hook should trigger (15% chance)
     */
    static shouldDoubleCatch(rod: InventoryItem | null | undefined): boolean {
        if (!this.hasEnchantment(rod, 'twin_hook')) return false;
        return Math.random() < 0.15; // 15% chance
    }

    /**
     * Get fatigue multiplier for fish velocity reduction over time
     * Returns a multiplier (e.g., 0.95 = 5% slower, 0.90 = 10% slower)
     * Tiered system: activates after 3.5s, then at 7s, 10.5s, and 14s
     * @param rod The equipped rod
     * @param timeElapsed Time elapsed in the reeling game (in ticks or seconds)
     * @param timeUnit 'ticks' or 'seconds' - defaults to 'seconds'
     */
    static getFatigueMultiplier(rod: InventoryItem | null | undefined, timeElapsed: number, timeUnit: 'ticks' | 'seconds' = 'seconds'): number {
        if (!rod) return 1.0;

        const hasFatigue = this.hasEnchantment(rod, 'fatigue');
        const hasTemptranquil = this.hasEnchantment(rod, 'tranquil');

        if (!hasFatigue && !hasTemptranquil) return 1.0;

        // Convert time to seconds if needed (assuming ~60 ticks per second)
        const timeInSeconds = timeUnit === 'ticks' ? timeElapsed / 60 : timeElapsed;

        // Fatigue only activates after 3.5 seconds
        if (timeInSeconds < 3.5) return 1.0;

        // Tiered slowdown system - CUMULATIVE decreases (as per user request)
        // User wants: 3.5s: 100->95 (-5%), 7s: 100->92 (-8%), 10.5s: 100->88 (-12%), 14s: 100->85 (-15%)
        // Fatigue tiers: 3.5s (-5%), 7s (-8%), 10.5s (-12%), 14s (-15%)
        // Temptranquil tiers: 3.5s (-7%), 7s (-10%), 10.5s (-14%), 14s (-18%) (slightly stronger)
        let reduction = 0;

        if (hasTemptranquil) {
            // Temptranquil - slightly stronger than Fatigue (cumulative)
            if (timeInSeconds >= 14.0) {
                reduction = 0.18; // -18% at 14s (100 -> 82)
            } else if (timeInSeconds >= 10.5) {
                reduction = 0.14; // -14% at 10.5s (100 -> 86)
            } else if (timeInSeconds >= 7.0) {
                reduction = 0.10; // -10% at 7s (100 -> 90)
            } else if (timeInSeconds >= 3.5) {
                reduction = 0.07; // -7% at 3.5s (100 -> 93)
            }
        } else if (hasFatigue) {
            // Fatigue - cumulative tiered slowdown (as per user example)
            if (timeInSeconds >= 14.0) {
                reduction = 0.15; // -15% at 14s (100 -> 85)
            } else if (timeInSeconds >= 10.5) {
                reduction = 0.12; // -12% at 10.5s (100 -> 88)
            } else if (timeInSeconds >= 7.0) {
                reduction = 0.08; // -8% at 7s (100 -> 92)
            } else if (timeInSeconds >= 3.5) {
                reduction = 0.05; // -5% at 3.5s (100 -> 95)
            }
        }

        return 1.0 - reduction; // Return multiplier (e.g., 0.95 = 5% slower)
    }

    /**
     * Check if Twin Hook should double fallback loot quantity
     */
    static shouldDoubleFallbackLoot(rod: InventoryItem | null | undefined): boolean {
        return this.hasEnchantment(rod, 'twin_hook');
    }
}

