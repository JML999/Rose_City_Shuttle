/**
 * Utility functions for bait-related calculations
 */
export class BaitUtils {
    /**
     * Get the bait cap based on player level
     * @param level - The player's current level
     * @returns The maximum bait items the player can hold
     */
    public static getBaitCapForLevel(level: number): number {
        if (level < 5) return 10;
        if (level < 10) return 20;
        if (level < 15) return 25;
        return 30; // Max cap at level 15+
    }
}

