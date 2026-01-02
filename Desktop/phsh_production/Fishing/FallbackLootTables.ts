// FallbackLootTables.ts
// Centralized fallback loot tables for fishing zones and subzones

export interface FallbackLootEntry {
    id: string;
    chance: number;
    quantityRange: [number, number];
    category: string;
}

export type FallbackLootTable = FallbackLootEntry[];

export const FALLBACK_LOOT_TABLES: Record<string, FallbackLootTable> = {
    // Default fallback
    'default_fallback': [
        { id: 'trash',           chance: 25, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 40, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 8,  quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 8, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 10, quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 1, quantityRange: [1, 1], category: 'rare_bait' },
        // Rare algae removed from default - only found on outer islands
        { id: 'bait_magnet',     chance: 1.5, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // ========================================
    // REGION-SPECIFIC FALLBACK TABLES
    // ========================================

    // Big Island - Main region with moderate loot
    'big_island_fallback': [
        { id: 'trash',           chance: 20, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 42, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 10, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 10, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 18, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 8,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 1.2, quantityRange: [1, 1], category: 'rare_bait' },
        // Rare algae removed from big_island - only found on outer islands
        { id: 'bait_magnet',     chance: 2, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // Mud Isle - Rich in bait and treasure
    'mud_isle_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 28, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 12, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 12, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 28, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 15, quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_glass_shrimp', chance: 2, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 3, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // Shadow Isle - Ghost/night specialist focus + NIGHT GHOST SHRIMP
    'shadow_isle_fallback': [
        { id: 'trash',           chance: 25, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 30, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 8,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glow_worm',  chance: 12, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_ghost_shrimp', chance: 8, quantityRange: [1, 1], category: 'rare_bait' }, // NIGHT ONLY (increased from 2)
    ],

    // Shadow Deep - Higher ghost shrimp chance for deeper areas
    'shadow_deep_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 25, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 10, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 10, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_glow_worm',  chance: 20, quantityRange: [1, 2], category: 'rare_bait' },
        { id: 'bait_fish_head',  chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_ghost_shrimp', chance: 12, quantityRange: [1, 1], category: 'rare_bait' }, // NIGHT ONLY (increased from 5)
        { id: 'bait_rare_algae', chance: 15, quantityRange: [1, 1], category: 'rare_bait' }, // Added rare algae
        { id: 'bait_magnet',     chance: 3, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // X Isle - Moderate treasure focus
    'x_isle_fallback': [
        { id: 'trash',           chance: 20, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 25, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 20, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 20, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_glass_shrimp', chance: 1.5, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 2, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // X Deep - Higher tier deep water loot
    'x_deep_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 20, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 20, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 16, quantityRange: [1, 1], category: 'rare_bait' }, // Added rare algae
        { id: 'bait_glass_shrimp', chance: 2, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 2.5, quantityRange: [1, 1], category: 'rare_treasure' },
    ],

    // Tree Isle - Natural/organic focus
    'tree_isle_fallback': [
        { id: 'trash',           chance: 18, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 32, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',         chance: 15, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 20, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_worm',       chance: 12, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_glass_shrimp', chance: 2.5, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Rock Deep - Mineral/rare focus
    'rock_deep_fallback': [
        { id: 'trash',           chance: 20, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 25, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 15, quantityRange: [1, 1], category: 'common_bait' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_squid',      chance: 12, quantityRange: [1, 2], category: 'rare_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_glass_shrimp', chance: 1.5, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Cliffs Deep - Extreme deep water
    'cliffs_deep_fallback': [
        { id: 'trash',           chance: 12, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 18, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 20, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_squid',      chance: 20, quantityRange: [1, 2], category: 'rare_bait' },
        { id: 'bait_rare_algae', chance: 24, quantityRange: [1, 1], category: 'rare_bait' }, // Increased from 12 to 24
        { id: 'bait_glass_shrimp', chance: 1.5, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 4, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // Pier Deep - Deep pier areas
    'pier_deep_fallback': [
        { id: 'trash',           chance: 25, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 30, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 20, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 20, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 5,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 15, quantityRange: [1, 1], category: 'rare_bait' }, // Added rare algae
        { id: 'bait_glass_shrimp', chance: 1.5, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Toolmaster Island - Crafting focus
    'toolmaster_island_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 25, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 20, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 20, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 10, quantityRange: [1, 1], category: 'rare_bait' }, // Rare algae - outer island
        { id: 'bait_glass_shrimp', chance: 1.8, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Toolmaster Dock Deep - Deep crafting area
    'toolmaster_dock_deep_fallback': [
        { id: 'trash',           chance: 12, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 20, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 18, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 18, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 18, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_rare_algae', chance: 15, quantityRange: [1, 1], category: 'rare_bait' }, // Added rare algae
        { id: 'bait_glass_shrimp', chance: 1.8, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 3.5, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // ========================================
    // SUBZONE-SPECIFIC FALLBACK TABLES
    // ========================================

    // Pier areas - High trash/civilized debris
    'pier_fallback': [
        { id: 'trash',           chance: 35, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 40, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 6,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 2,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.8, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Boardwalk - Similar to pier but slightly cleaner
    'boardwalk_fallback': [
        { id: 'trash',           chance: 30, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 35, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 20, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 20, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 8,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 3,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.6, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // Old Dock - Weathered, more interesting finds
    'old_dock_fallback': [
        { id: 'trash',           chance: 30, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 40, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 5,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 5,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.5, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 1.5, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // Sunny Beach - Clean, bright areas
    'sunny_beach_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 25, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 30, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 30, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 1.5, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // Shady Beach - Darker, more mysterious
    'shady_beach_fallback': [
        { id: 'trash',           chance: 20, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 30, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 25, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 25, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 12, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_squid',      chance: 6,  quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_ghost_shrimp', chance: 3, quantityRange: [1, 1], category: 'rare_bait' }, // NEW: Night only
        { id: 'bait_glass_shrimp', chance: 0.6, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // Shallow Coast - Moderate depth
    'shallow_coast_fallback': [
        { id: 'trash',           chance: 18, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 28, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 28, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 28, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.8, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // Deep Coast - Deeper waters, better loot
    'deep_coast_fallback': [
        { id: 'trash',           chance: 12, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 20, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 25, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 25, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 20, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_squid',      chance: 10, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_rare_algae', chance: 16, quantityRange: [1, 1], category: 'rare_bait' }, // Added rare algae
        { id: 'bait_glass_shrimp', chance: 0.8, quantityRange: [1, 1], category: 'rare_bait' },
        { id: 'bait_magnet',     chance: 2.5, quantityRange: [1, 1], category: 'rare_treasure' },
        // Chests removed - must be caught through reeling game
    ],

    // Kelp Bed - Rich organic environment
    'kelp_bed_fallback': [
        { id: 'trash',           chance: 10, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 20, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 40, quantityRange: [1, 3], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 40, quantityRange: [1, 3], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.8, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // Pond - Freshwater areas
    'pond_fallback': [
        { id: 'trash',           chance: 5,  quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 10, quantityRange: [1, 1], category: 'low_value_kept' },
        { id: 'bait_worm',       chance: 50, quantityRange: [1, 1], category: 'common_bait' },
    ],

    // Shady Spawn - Special spawning area
    'shady_spawn_fallback': [
        { id: 'trash',           chance: 15, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 20, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 25, quantityRange: [1, 2], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 25, quantityRange: [1, 2], category: 'loot' },
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 10, quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.6, quantityRange: [1, 1], category: 'rare_bait' },
        // Chests removed - must be caught through reeling game
    ],

    // ========================================
    // SPECIAL EXISTING TABLES (preserved)
    // ========================================

    // Spawn Pier - High traffic area
    'big_island_spawn_pier_fallback': [
        { id: 'trash',           chance: 30, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 45, quantityRange: [1, 1], category: 'low_value_kept' },
        // { id: 'seaweed',    chance: 15, quantityRange: [1, 1], category: 'loot' }, // Replaced with driftwood
        { id: 'driftwood',       chance: 15, quantityRange: [1, 1], category: 'loot' },
        { id: 'bait_shrimp',     chance: 4,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 1,  quantityRange: [1, 1], category: 'common_bait' },
        { id: 'bait_glass_shrimp', chance: 0.08, quantityRange: [1, 1], category: 'rare_bait' },
    ],

    // Ancient Dig Site - Normal driftwood + rare ancient driftwood
    'ancient_dig_fallback': [
        { id: 'trash',           chance: 20, quantityRange: [1, 1], category: 'discardable_junk' },
        { id: 'old_can',         chance: 35, quantityRange: [1, 1], category: 'low_value_kept' },
        { id: 'driftwood',       chance: 15, quantityRange: [1, 2], category: 'loot' }, // Normal driftwood still drops
        { id: 'ancient_driftwood', chance: 3, quantityRange: [1, 1], category: 'rare_loot' }, // Rare drop
        { id: 'bait_shrimp',     chance: 15, quantityRange: [1, 2], category: 'common_bait' },
        { id: 'bait_fish_head',  chance: 10, quantityRange: [1, 1], category: 'common_bait' },
        { id: 'scarab',          chance: 8,  quantityRange: [1, 1], category: 'common_bait' }, // Scarabs from leaves
        { id: 'bait_magnet',     chance: 2,  quantityRange: [1, 1], category: 'rare_treasure' },
    ],
}; 