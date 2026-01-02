import { Vector3, World } from "hytopia";
import type { RegionTag, SubzoneTag, HotspotTag } from "./PhshTwoFishingZones"; // Import tag types

// Define Bait Types (adjust as needed)
export type BaitType = 'worm' | 'insect' | 'shrimp' | 'clam' | 'fish_head' | 'glow_worm' | 'ghost_shrimp' | 'glass_shrimp';

// Define Rod Types (adjust as needed)
export type RodType = 'basic_rod' | 'fly_rod' | 'deep_sea_rod' | 'loot_rod';

// Define Time Periods for fish spawning
export type TimePeriod = 'any' | 'sunrise' | 'day' | 'sunset' | 'night';

// Default display position and rotation for equipped fish
export const DEFAULT_FISH_DISPLAY_POSITION = { x: -0.20, y: -0.1, z: -0.2};
export const DEFAULT_FISH_DISPLAY_ROTATION = { x: 0, y: -0.7071068, z: 0, w: 0.7071068 };

// Core fish data structure with updated SpawnData
export interface FishData {
    id: string;
    name: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    minWeight: number;
    maxWeight: number;
    isBait: boolean;
    isLoot: boolean;
    isTrophy: boolean; // New: Determines if fish qualifies for trophy mechanics
    baseValue: number;
    modelData: {
        modelUri: string;
        sprite: string;
        baseScale: number;
        maxScale: number;
        animation?: string; // Optional: animation name (defaults to 'swim' if not specified)
    };
    spawnData: SpawnData;
    // Optional: Custom display position/rotation when equipped. If not provided, uses defaults.
    // You can use expressions like: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, y: DEFAULT_FISH_DISPLAY_POSITION.y, z: DEFAULT_FISH_DISPLAY_POSITION.z }
    displayPosition?: { x: number; y: number; z: number };
    displayRotation?: { x: number; y: number; z: number; w: number };
}

export interface SpawnData {
    baseChance: number;
    regionTags?: Partial<Record<RegionTag, number>>;
    subzoneTags?: Partial<Record<SubzoneTag, number>>;
    hotspotTags?: Partial<Record<HotspotTag, number>>;
    rodRestrictions?: RodType[];
    timeWindows?: { start: number; end: number; }[]; // EXISTING: Internal time windows (hours)
    spawnTimes?: TimePeriod[]; // NEW: User-friendly time periods
    isStarterFish?: boolean; // ADDED: Flag for fish available without bait
    // Quest-related properties for special quest items
    questGated?: boolean; // ADDED: Whether this item only spawns during specific quests
    requiredQuest?: string; // ADDED: Quest ID required for spawning
    requiredBait?: string; // ADDED: Specific bait required for spawning
    questStage?: number; // ADDED: Which stage of the quest this item belongs to
    questCoordinates?: { x: number; y: number; z: number; radius?: number }; // ADDED: Specific coordinates for quest items
}

export const FISH_CATALOG: FishData[] = [

    // ------------------------------ //
    // ------------------------------ //
    // --- Big Island Saltwater Fish --- 
    // ------------------------------ //
    // ------------------------------ //

    // --- Sardine --- 
    {
        id: 'sardine',
        name: 'Sardine',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 5,
        baseValue: 5,
        isBait: true,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/sardine.gltf',
            sprite: 'sardine_sprite.png',
            baseScale: 0.5, 
          maxScale: 0.8
        },
        spawnData: {
            baseChance: 2, // Reduced from 5 to 2
            isStarterFish: true, // <<< THIS FISH CAN BE CAUGHT WITHOUT BAIT
          regionTags: {
            big_island: 5, // Reduced from 10 to 5
            mud_isle: 4, // Reduced from 8 to 4
            shadow_isle: 2, // Reduced from 5 to 2
            shadow_deep: 2, // Reduced from 5 to 2
            toolmaster_island: 4, // Reduced from 8 to 4
            toolmaster_dock_deep: 4, // Reduced from 8 to 4
            tree_isle: 2, // Reduced from 5 to 2
            rock_deep: 4, // Reduced from 8 to 4
            pier_deep: 3, // Reduced from 6 to 3
          },
          subzoneTags: {
                pier: 12, // Reduced from 25 to 12
                boardwalk: 5, // Reduced from 10 to 5
                old_dock: 5, // Reduced from 10 to 5
                shallow_coast: 1, // Reduced from 2 to 1
                kelp_bed: 0, // Reduced from 1 to 0
                deep_coast: 1, // Reduced from 2 to 1
                sunny_beach: 2, // Reduced from 5 to 2
                shady_beach: 2, // Reduced from 5 to 2
            },
            hotspotTags: {
          },
          rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Mackerel ---
    {
        id: 'mackerel',
        name: 'Mackerel',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 5,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/mackerel.gltf',
            sprite: 'mackerel_sprite.png',
            baseScale: 0.5, // Adjusted scale from old catalog example
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 5, 
            isStarterFish: true, 
          regionTags: {
            mud_isle: 1,
            shadow_isle: 1,
            shadow_deep: 25, // Increased from 1 for realistic distribution
            toolmaster_island: 8,
            toolmaster_dock_deep: 25, // Increased from 8 for realistic distribution
            tree_isle: 5,
            rock_deep: 25, // Increased from 8 for realistic distribution
            pier_deep: 25, // Increased from 6 for realistic distribution
            x_deep: 25, // NEW - added for realistic distribution
            cliffs_deep: 25, // NEW - added for realistic distribution
          },
          subzoneTags: {
                pier: 5,
                boardwalk: 5,
                old_dock: 5,
                shallow_coast: 15,
                kelp_bed: 10,
                deep_coast: 12,
                sunny_beach: 15, 
                shady_beach: 15,   
            },
            hotspotTags: {
          },
          rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Blue Tang ---
    {
        id: 'blue_tang',
        name: 'Blue Tang',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 4,
        baseValue: 8,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/blue-tang.gltf',
            sprite: 'blue_tang_sprite.png', // Will need sprite created
            baseScale: 0.5,
            maxScale: 0.8,
            animation: 'idle' // Uses idle animation instead of swim
        },
        spawnData: {
            baseChance: 3,
            isStarterFish: true,
            regionTags: {
                big_island: 6,
                mud_isle: 4,
                shadow_isle: 3,
                shadow_deep: 3,
                toolmaster_island: 4,
                toolmaster_dock_deep: 4,
                tree_isle: 3,
                rock_deep: 4,
                pier_deep: 3,
                ancient_path: 6, // Add to new deep zones
                ancient_dig: 5, // Add to dig site
            },
            subzoneTags: {
                pier: 8,
                boardwalk: 4,
                old_dock: 4,
                shallow_coast: 3,
                kelp_bed: 2,
                deep_coast: 3,
                sunny_beach: 4,
                shady_beach: 4,
            },
            hotspotTags: {
            },
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Crappie ---
    {
        id: 'crappie',
        name: 'Crappie',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 4,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/crappie.gltf',
            sprite: 'crappie_sprite.png', // Will need sprite created
            baseScale: 0.5,
            maxScale: 0.8,
            animation: 'idle' // Uses idle animation instead of swim
        },
        spawnData: {
            baseChance: 3,
            isStarterFish: true,
            regionTags: {
                big_island: 6,
                mud_isle: 4,
                shadow_isle: 3,
                shadow_deep: 3,
                toolmaster_island: 4,
                toolmaster_dock_deep: 4,
                tree_isle: 3,
                rock_deep: 4,
                pier_deep: 3,
            },
            subzoneTags: {
                pier: 8,
                boardwalk: 4,
                old_dock: 4,
                shallow_coast: 3,
                kelp_bed: 2,
                deep_coast: 3,
                sunny_beach: 4,
                shady_beach: 4,
            },
            hotspotTags: {
            },
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Clownfish ---
    {
        id: 'clownfish',
        name: 'Clownfish',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 5,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/clownfish.gltf',
            sprite: 'clown_fish_sprite.png',
            baseScale: 0.8, // Adjusted scale from old catalog example
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                big_island: 10,
                shadow_isle: 0,
                shadow_deep: 20, // Increased from 0 for realistic distribution
                toolmaster_island: 8,
                toolmaster_dock_deep: 20, // Increased from 8 for realistic distribution
                tree_isle: 5,
                rock_deep: 20, // Increased from 8 for realistic distribution
                pier_deep: 20, // Increased from 6 for realistic distribution
                x_deep: 20, // NEW - added for realistic distribution
                cliffs_deep: 20, // NEW - added for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 10, // Strong affinity (covers Moon/Breeze/Merch)
                shady_beach: 8,   // Strong affinity (covers Pier/Dock/Boat House)
                pier: 10,
                shallow_coast: 5, // Medium affinity (covers Wooded Shore/Inlet)
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
                reef: 5 // Medium affinity for Reef hotspots
            },
            spawnTimes: ['day'], // Clownfish are active during bright daylight
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
        // --- Twilight Glider ---
        {
            id: 'twilight_glider',
            name: 'Twilight Glider',
            rarity: 'uncommon',
            minWeight: 2,
            maxWeight: 8,
            baseValue: 15,
            isBait: false,
            isLoot: false,
            isTrophy: false,
            modelData: {
                modelUri: 'models/npcs/twilight_glider.gltf',
                sprite: 'twilight_glider_sprite.png',
                baseScale: 0.4,
                maxScale: 0.8
            },
            spawnData: {
                baseChance: 0, // Decent chance anywhere
                regionTags: {
                    big_island: 10,
                    shadow_isle: 0,
                    shadow_deep: 0,
                    toolmaster_island: 8,
                    toolmaster_dock_deep: 8,
                    tree_isle: 5,
                    rock_deep: 8,
                    pier_deep: 6,
                },
                subzoneTags: {
                    sunny_beach: 10, // Strong affinity (covers Moon/Breeze/Merch)
                    shady_beach: 8,   // Strong affinity (covers Pier/Dock/Boat House)
                    pier: 10,
                    shallow_coast: 5, // Medium affinity (covers Wooded Shore/Inlet)
                    pond: 0    // Cannot be caught in ponds
                },
                hotspotTags: {
                    reef: 5 // Medium affinity for Reef hotspots
                },
                spawnTimes: ['night'], // Clownfish are active during bright daylight
                rodRestrictions: []
        },
                // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
        },
    // --- Blue Fish ---
    {
        id: 'blue_fish',
        name: 'Blue Fish',
        rarity: 'common',
        minWeight: 3,
        maxWeight: 8,
        baseValue: 8,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/blue_fish.gltf',
            sprite: 'blue_fish_sprite.png',
            baseScale: 0.5, // Reduced to half
            maxScale: 1
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                x_isle: 10,
                tree_isle: 10,
                toolmaster_island: 10,
                shadow_deep: 20, // Increased from 1 for realistic distribution
                shadow_isle: 1,
                rock_deep: 20, // Increased from 10 for realistic distribution
                x_deep: 20, // NEW - added for realistic distribution
                pier_deep: 20, // NEW - added for realistic distribution
                cliffs_deep: 20, // NEW - added for realistic distribution
                toolmaster_dock_deep: 20, // NEW - added for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 15, 
                old_dock: 10,
                boardwalk: 10,
                shady_beach: 10,   
                shallow_coast: 10, 
            },
            hotspotTags: {
            },
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Rainbowfish ---
    {
        id: 'rainbowfish',
        name: 'Rainbow Fish',
        rarity: 'rare',
        minWeight: 4,
        maxWeight: 15,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/rainbow_fish.gltf',
            sprite: 'rainbow_fish_sprite.png',
            baseScale: 0.4,
            maxScale: 0.55
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                pier_deep: 10,
                shadow_deep: 10,
                rock_deep: 10,
                x_deep: 10, // NEW - added for realistic distribution
                cliffs_deep: 10, // NEW - added for realistic distribution
                toolmaster_dock_deep: 10, // NEW - added for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 8, // Strong affinity (covers Moon/Breeze/Merch)
                shady_beach: 5,   // Strong affinity (covers Pier/Dock/Boat House)
                shallow_coast: 3, // Medium affinity (covers Wooded Shore/Inlet)
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            spawnTimes: ['sunrise', 'sunset'], // Rainbow fish love the colorful times of day
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Green Jellyfish ---
    {
        id: 'green_jellyfish',
        name: 'Green Jellyfish',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 8,
        baseValue: 10,
        isBait: true,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/green_jellyfish.gltf',
            sprite: 'green_jellyfish_sprite.png',
            baseScale: 0.1,
            maxScale: 0.175
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                big_island: 10,
                x_deep: 12, // NEW - added for realistic distribution
                pier_deep: 12, // NEW - added for realistic distribution
                cliffs_deep: 12, // NEW - added for realistic distribution
                shadow_deep: 12, // NEW - added for realistic distribution
                rock_deep: 12, // NEW - added for realistic distribution
                toolmaster_dock_deep: 12, // NEW - added for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 8, 
                shady_beach: 5,  
                shallow_coast: 3
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },



    // --- Weigt Gated --- 
    // --- Banana Fish ---
    {
        id: 'banana_fish',
        name: 'Banana Fish',
        rarity: 'common',
        minWeight: 3,
        maxWeight: 8,
        baseValue: 15,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/banana_fish.gltf',
            sprite: 'banana_fish_sprite.png',
            baseScale: 0.25, // Reduced to half
            maxScale: 0.4
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                big_island: 10,
                mud_isle: 1,
                shadow_isle: 0,
                shadow_deep: 0,
                toolmaster_island: 0, 
                toolmaster_dock_deep: 0,
                tree_isle: 6,
                rock_deep: 8,
                pier_deep: 6,
            },
            subzoneTags: {
                pier: 15,
                shallow_coast: 10,
                deep_coast: 2,
                sunny_beach: 10, 
                shady_beach: 10,   
            },
            hotspotTags: {
            },
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Dragonfruit Fish ---
    {
        id: 'dragonfruit_fish',
        name: 'Dragonfruit Fish',
        rarity: 'common',
        minWeight: 4,
        maxWeight: 9,
        baseValue: 15,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/dragonfruit_fish.gltf',
            sprite: 'dragonfruit_fish_sprite.png',
            baseScale: 0.4, // Reduced to half
            maxScale: 0.575
        },
        spawnData: {
           baseChance: 0, 
          isStarterFish: true, // <<< THIS FISH CAN BE CAUGHT WITHOUT BAIT
          regionTags: {},
          subzoneTags: {
                pier: 15,
                shady_spawn: 15,
                shallow_coast: 2,
                deep_coast: 2,
                sunny_beach: 5, 
                shady_beach: 5,   
            },
            hotspotTags: {
          },
          rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Catfish ---
    {
        id: 'catfish',
        name: 'Catfish',
        rarity: 'rare',
        minWeight: 12, // Increased from 6 to reduce weight ratio from 16.7x to 8.3x
        maxWeight: 100,
        baseValue: 25, // Reduced from 12 to bring max value from $400 to $166
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - rare rarity with good size range
        modelData: {
            modelUri: 'models/npcs/catfish.gltf',
            sprite: 'catfish_sprite.png',
            baseScale: 0.55,
            maxScale: 1.55
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
            },
            subzoneTags: {
                shady_beach: 5,   // Strong affinity (covers Pier/Dock/Boat House)
                shallow_coast: 3, // Medium affinity (covers Wooded Shore/Inlet)
                kelp_bed: 8,
                shadow_kelp_inlet: 6, // Higher chance in shadow kelp areas
                shadow_kelp_coast: 5,
                old_dock: 8,
                boardwalk: 3,
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },




    // --- Proximity Gated --- 
    // --- Orange Betta ---
    {
        id: 'orange_betta',
        name: 'Orange Betta',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 15,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/orange_betta.gltf',
            sprite: 'orange_betta_sprite.png',
            baseScale: 0.4, // Reduced to half
            maxScale: 0.5
        },
        spawnData: {
            baseChance: 1,
            regionTags: {
                big_island: 1, 
            },
            subzoneTags: {
                sunny_beach: 15, 
                shady_beach: 0,   
                shallow_coast: 0, 
                deep_coast: 0,
                pond: 0    
            },
            hotspotTags: {
            },
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Red Betta ---
    {
        id: 'red_betta',
        name: 'Red Betta',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 15,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/red_betta.gltf',
            sprite: 'red_betta_sprite.png',
            baseScale: 0.25, // Reduced to half
            maxScale: 0.4
        },
        spawnData: {
            baseChance: 1, 
            regionTags: {
                big_island: 1,  
            },
            subzoneTags: {
                sunny_beach: 0, 
                shady_beach: 15,   
                shallow_coast: 0, 
                deep_coast: 0,
                pond: 0    
            },
            hotspotTags: {
                reef: 5 
            },
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Blue Betta ---
    {
        id: 'blue_betta',
        name: 'Blue Betta',
        rarity: 'rare',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 18,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/blue_betta.gltf',
            sprite: 'blue_betta_sprite.png',
            baseScale: 0.25, // Reduced to half
            maxScale: 0.4
        },
        spawnData: {
            baseChance: 1, 
            regionTags: {
                big_island: 1, 
            },
            subzoneTags: {
                sunny_beach: 0, 
                shady_beach: 0,   
                pier: 15, 
                deep_coast: 0,
                pond: 0    
            },
            hotspotTags: {
                reef: 1 
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Violet Betta ---
    {
        id: 'violet_betta',
        name: 'Violet Betta',
        rarity: 'epic',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 20,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/betta_violet.gltf',
            sprite: 'betta_violet_sprite.png',
            baseScale: 0.4,
            maxScale: 0.55
        },
        spawnData: {
            baseChance: 1, 
            regionTags: {
                big_island: 0, 
            },
            subzoneTags: {
                sunny_beach: 0, 
                shady_beach: 0,   
                shallow_coast: 0, 
                deep_coast: 15,
                pond: 0
            },
            hotspotTags: {
                reef: 5 
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },



    // --- Weight and Proximity Gated --- 

    // --- Kelp Eel ---
    {
        id: 'kelp_eel',
        name: 'Kelp Eel',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 12,
        baseValue: 50,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/kelp_eel.gltf',
            sprite: 'kelp_eel_sprite.png',
            baseScale: 0.4,
            maxScale: 0.75
        },
        spawnData: {
            baseChance: 0, // Lower base chance, relies on subzone
            regionTags: {
                big_island: 0 // No general boost on Big Island, must be in kelp_bed
            },
            subzoneTags: {
                shady_beach: 5,   
                kelp_bed: 15, // Strong affinity for Kelp Bed
                shadow_kelp_inlet: 18, // Even stronger in shadow kelp areas
                shadow_kelp_coast: 15,
            },
            hotspotTags: {
              // Can add specific hotspot affinities later if needed
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Pufferfish ---
    {
        id: 'pufferfish',
        name: 'Puffer Fish',
        rarity: 'rare',
        minWeight: 6,
        maxWeight: 50,
        baseValue: 20,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
            modelUri: 'models/npcs/pufferfish.gltf',
            sprite: 'puffer_fish_sprite.png',
            baseScale: 0.8,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Minimal chance anywhere
            regionTags: {
                mud_isle: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                tree_isle: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                toolmaster_island: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                toolmaster_dock_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                rock_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                x_isle: 10,
                x_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                cliffs_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                pier_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
            },
            subzoneTags: {
                old_dock: 8,
                pier: 8,
                shallow_coast: 8,
                deep_coast: 8,
                sunny_beach: 8,
                shady_beach: 8,
            },
            hotspotTags: {
                reef: 5 // Medium affinity for Reef hotspots
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Pike ---
    {
        id: 'pike',
        name: 'Pike',
        rarity: 'rare',
        minWeight: 81, // Reduced from 51 to make accessible to iron rods
        maxWeight: 100,
        baseValue: 50,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - good size range (45-100lbs)
        modelData: {
            modelUri: 'models/npcs/pike.gltf',
            sprite: 'pike_sprite.png',
            baseScale: 0.4,
            maxScale: 0.7
        },
        spawnData: {
            baseChance: 1, // Small base chance to appear anywhere
            regionTags: {
                big_island: 0,
                shadow_isle: 2 // Added adjacent zone with lower frequency
            },
            subzoneTags: {
                shady_beach: 6, // Increased from 4
                shady_spawn: 6, // Increased from 4
                shadow_kelp_coast: 6, // Increased from 4
                shadow_kelp_inlet: 6, // Increased from 4
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.4 },
        displayRotation: { x:  -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },
    // --- Sawfish ---
    {
        id: 'sawfish',
        name: 'Sawfish',
        rarity: 'epic',
        minWeight: 250,
        maxWeight: 1250,
        baseValue: 80, // Adjusted to hit ~1200 max value (in 1000s)
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - epic rarity with excellent size (250-850lbs)
        modelData: {
            modelUri: 'models/npcs/sawfish.gltf',
            sprite: 'sawfish_sprite.png',
            baseScale: 0.5,
            maxScale: 2.5
        },
        spawnData: {
            baseChance: 1, // Small base chance to appear anywhere
            regionTags: {
                x_isle: 3, // Reduced from 4 for realistic distribution
                tree_isle: 3, // Reduced from 4 for realistic distribution
                mud_isle: 3, // Reduced from 4 for realistic distribution
                shadow_isle: 3, // Reduced from 4 for realistic distribution
                rock_deep: 1, // Reduced from 2 for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
                pier_deep: 1, // NEW - added for realistic distribution
                cliffs_deep: 1, // NEW - added for realistic distribution
                shadow_deep: 1, // NEW - added for realistic distribution
                toolmaster_dock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
                shady_beach: 7, // Increased from 5
                shady_spawn: 7, // Increased from 5
                shadow_kelp_coast: 6, // Increased from 4
                shadow_kelp_inlet: 6, // Increased from 4
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.15, z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.1 },
        displayRotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },




    // ------------------------------ //
    // ------------------------------ //
    // --- Freshwater Fish --- 
    // ------------------------------ //
    // ------------------------------ //

    
    // --- Goldfish --- 
    {
        id: 'goldfish',
        name: 'Goldfish',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
          modelUri: 'models/npcs/goldfish.gltf',
          sprite: 'goldfish_sprite.png',
          baseScale: 0.3,
          maxScale: 0.4
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          isStarterFish: true, // Can be caught without bait
          regionTags: {
            big_island: 0, // No weight just for being on the island
            ancient_path: 8, // Add to new deep zones
            ancient_dig: 6, // Add to dig site
          },
          subzoneTags: {
            pond: 50 // Very high affinity for ponds - primary catch
          },
          hotspotTags: {},
          rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
     // --- Green Frog --- 
    {
        id: 'green_frog',
        name: 'Green Frog',
        rarity: 'common',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
          modelUri: 'models/npcs/green_frog.gltf',
          sprite: 'green_frog_sprite.png',
          baseScale: 0.5,
          maxScale: 1
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          isStarterFish: false, // Can be caught without bait
          regionTags: {
            big_island: 0 // No weight just for being on the island
          },
          subzoneTags: {
            pond: 50 // Very high affinity for ponds - primary catch
          },
          hotspotTags: {},
          rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Trout --- 
    {
        id: 'trout',
        name: 'Trout',
        rarity: 'uncommon',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
          modelUri: 'models/npcs/trout.gltf',
          sprite: 'trout_sprite.png',
          baseScale: 0.3,
          maxScale: 0.4
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          regionTags: {
            big_island: 0 // No weight just for being on the island
          },
          subzoneTags: {
            pond: 3 // Much lower affinity - rare catch
          },
          hotspotTags: {},
          rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Largemouth Bass --- 
    {
        id: 'largemouth_bass',
        name: 'Largemouth Bass',
        rarity: 'uncommon',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
          modelUri: 'models/npcs/largemouth_bass.gltf',
          sprite: 'largemouth_bass_sprite.png',
          baseScale: 0.3,
          maxScale: 0.4
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          regionTags: {
            big_island: 0 // No weight just for being on the island
          },
          subzoneTags: {
            pond: 2 // Very rare catch
          },
          hotspotTags: {},
          rodRestrictions: [ 'fly_rod'] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.25, z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.05  },
        displayRotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },

    // --- Koi Fish --- 
    {
        id: 'koi_fish',
        name: 'Koi Fish',
        rarity: 'rare',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
          modelUri: 'models/npcs/koi_fish.gltf',
          sprite: 'koi_fish_sprite.png',
          baseScale: 0.3,
          maxScale: 0.4
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          regionTags: {
            big_island: 0 // No weight just for being on the island
          },
          subzoneTags: {
            pond: 1 // Very rare catch
          },
          hotspotTags: {},
          rodRestrictions: [ 'fly_rod'] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Marbled Koi --- 
    {
        id: 'marbled_koi',
        name: 'Marbled Koi',
        rarity: 'epic',
        minWeight: 1,
        maxWeight: 3,
        baseValue: 1,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
          modelUri: 'models/npcs/marbled_koi.gltf',
          sprite: 'marbled_koi_sprite.png',
          baseScale: 0.4,
          maxScale: 0.6
        },
        spawnData: {
          baseChance: 0,
          regionTags: {
            big_island: 0 
          },
          subzoneTags: {
            pond: 0.5 // Extremely rare catch
          },
          hotspotTags: {},
          rodRestrictions: [ 'fly_rod'] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },





    // --- --- --- 
    // --- Koi Season --- 
    // --- --- --- 


     // --- Black King Koi --- 
    {
        id: 'black_king_koi',
        name: 'Black King Koi',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/black_king_koi.gltf',
            sprite: 'black_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          regionTags: {},
          subzoneTags: {},
          hotspotTags: {},
          rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- White King Koi --- 
    {
        id: 'white_king_koi',
        name: 'White King Koi',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/white_king_koi.gltf',
            sprite: 'white_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Red King Koi --- 
    {
        id: 'red_king_koi',
        name: 'Red King Koi',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 37, // Reduced from 50 to bring max value from $400 to $296
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/red_king_koi.gltf',
            sprite: 'red_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Orange King Koi --- 
    {
        id: 'orange_king_koi',
        name: 'Orange King Koi',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 37, // Reduced from 50 to bring max value from $400 to $296
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/orange_king_koi.gltf',
            sprite: 'orange_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Black and White King Koi --- 
    {
        id: 'black_and_white_king_koi',
        name: 'Black and White King Koi',
        rarity: 'epic',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 40, // Reduced from 100 to bring max value from $1,200 to $480
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/black_and_white_king_koi.gltf',
            sprite: 'black_and_white_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Red and White King Koi --- 
    {
        id: 'red_and_white_king_koi',
        name: 'Red and White King Koi',
        rarity: 'epic',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 40, // Reduced from 100 to bring max value from $1,200 to $480
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/red_and_white_king_koi.gltf',
            sprite: 'red_and_white_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Black and Yellow King Koi --- 
    {
        id: 'black_and_yellow_king_koi',
        name: 'Black and Yellow King Koi',
        rarity: 'epic',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 40, // Reduced from 100 to bring max value from $1,200 to $480
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/black_and_yellow_king_koi.gltf',
            sprite: 'black_and_yellow_king_koi_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Black Marbled Koi --- 
    {
        id: 'black_marbled_koi',
        name: 'Black Marbled Koi',
        rarity: 'legendary',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 60, // Reduced from 200 to bring max value from $4,000 to $1,200
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity
        modelData: {
            modelUri: 'models/npcs/black_marbled_koi.gltf',
            sprite: 'black_marbled_koi_fish_sprite.png',
            baseScale: 1,
            maxScale: 2.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Blue Marbled Koi --- 
    {
        id: 'blue_marbled_koi',
        name: 'Blue Marbled Koi',
        rarity: 'legendary',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 60, // Reduced from 200 to bring max value from $4,000 to $1,200
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity
        modelData: {
            modelUri: 'models/npcs/blue_marbled_koi.gltf',
            sprite: 'blue_marbled_koi_fish_sprite.png',
            baseScale: 1,
            maxScale: 2.0
        },
        spawnData: {
            baseChance: 0, // Only found in specific zones
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.33 , y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z },
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },




    // ------------------------------ //
    // ------------------------------ //
    // --- DeepWater Fish --- 
    // ------------------------------ //
    // ------------------------------ //

    // --- Deepfin Lurker ---
    {
        id: 'deepfin_lurker',
        name: 'Deepfin Lurker',
        rarity: 'uncommon',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/deepfin_lurker.gltf',
            sprite: 'deepfin_lurker_sprite.png',
            baseScale: 0.4,
            maxScale: 0.55
        },
        spawnData: {
            baseChance: 0,
            regionTags: {
                big_island: 0 
            },
            subzoneTags: {
                sunny_beach: 0, // Strong affinity (covers Moon/Breeze/Merch)
                shady_beach: 0,   // Strong affinity (covers Pier/Dock/Boat House)
                shallow_coast: 0, // Medium affinity (covers Wooded Shore/Inlet)
                deep_coast: 5,
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            rodRestrictions: [],
        }
    },
    // --- Anglerfish ---
    {
        id: 'anglerfish',
        name: 'Anglerfish',
        rarity: 'rare',
        minWeight: 6,
        maxWeight: 25,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
            modelUri: 'models/npcs/anglerfish.gltf',
            sprite: 'anglerfish_sprite.png',
            baseScale: 0.4,
            maxScale: 2
        },
        spawnData: {
            baseChance: 0, // Extremely low base chance - needs glow_worm or glass_shrimp for good odds
            regionTags: {
                tree_isle: 3, // Primary location at Tree Isle
                toolmaster_island: 3, // Secondary location
                cliffs_deep: 3, // Minimal chance elsewhere
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [],
            spawnTimes: ['night']
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Squid ---
    {
        id: 'squid',
        name: 'Squid',
        rarity: 'rare',
        minWeight: 10,
        maxWeight: 1000,
        baseValue: 1.5, // Reduced from 15 to maintain difficulty (10x weight increase)
        isBait: true,
        isLoot: false,
        isTrophy: true, // Trophy fish - good size range (10-1000lbs)
        modelData: {
            modelUri: 'models/npcs/squid.gltf',
            sprite: 'squid_sprite.png',
            baseScale: 0.7,
            maxScale: 1.2
        },
        spawnData: {
            baseChance: 0, // Added base chance
            regionTags: {
                cliffs_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                pier_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                toolmaster_island: 4, // Increased from 3
                toolmaster_dock_deep: 2, // Further reduced from 3 for realistic distribution
                mud_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                x_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                toolmaster_isle: 2, // Further reduced from 3 for realistic distribution
                rock_deep: 1, // Reduced from 2 for realistic distribution
            },
            subzoneTags: {
                deep_coast: 5, // Increased from 10
               
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.6 , y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.03 },
        displayRotation: { x: 0, y: 0, z: 0.7071068, w: 0.7071068 }
    },
    // --- Flounder ---
    {
        id: 'flounder',
        name: 'Flounder',
        rarity: 'common',
        minWeight: 6,
        maxWeight: 25,
        baseValue: 15,
        isBait: false,
        isLoot: false,
        isTrophy: false, // Removed from trophy fish
        modelData: {
            modelUri: 'models/npcs/flounder.gltf',
            sprite: 'flounder_sprite.png',
            baseScale: 0.5, // Reduced to half
            maxScale: 1.25
        },
        spawnData: {
            baseChance: 1, // Added base chance
            regionTags: {
                tree_isle: 7, // Increased from 5
                toolmaster_island: 2, // Added adjacent zone with lower frequency
                x_deep: 15, // NEW - added for realistic distribution
                pier_deep: 15, // NEW - added for realistic distribution
                cliffs_deep: 15, // NEW - added for realistic distribution
                shadow_deep: 15, // NEW - added for realistic distribution
                rock_deep: 15, // NEW - added for realistic distribution
                toolmaster_dock_deep: 15, // NEW - added for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 7, // Increased from 5
                shady_beach: 7, // Increased from 5
                shallow_coast: 7, // Increased from 5
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Red Snapper ---
    {
        id: 'red_snapper',
        name: 'Red Snapper',
        rarity: 'rare',
        minWeight: 75, // Reduced from 90 to make accessible to iron rods
        maxWeight: 250,
        baseValue: 40,
        isBait: false,
        isLoot: false,
        isTrophy: true, 
        modelData: {
            modelUri: 'models/npcs/red_snapper.gltf',
            sprite: 'red_snapper_sprite.png',
            baseScale: 0.5,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 1, // Added base chance
            regionTags: {
                cliffs_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                toolmaster_island: 4, // Increased from 3
                toolmaster_dock_deep: 2, // Further reduced from 3 for realistic distribution
                pier_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                mud_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                x_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                toolmaster_isle: 2, // Further reduced from 3 for realistic distribution
                rock_deep: 1, // Reduced from 2 for realistic distribution
            },
            subzoneTags: {
                sunny_beach: 7, // Increased from 5
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.25, z: DEFAULT_FISH_DISPLAY_POSITION.z - 0.10 },
        displayRotation: { x:0, y: 0, z: 0, w: 0.7071068 }
    },
    // --- Sea Bass ---
    {
        id: 'sea_bass',
        name: 'Sea Bass',
        rarity: 'rare',
        minWeight: 80, // Reduced from 50 to make accessible to iron rods
        maxWeight: 180,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
            modelUri: 'models/npcs/sea_bass.gltf',
            sprite: 'sea_bass_sprite.png',
            baseScale: 0.5,
            maxScale: 1.4
        },
        spawnData: {
            baseChance: 0, // Added base chance
            regionTags: {
                tree_isle: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                toolmaster_island: 1, // Reduced from 2 for realistic distribution
                pier_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                mud_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                x_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                toolmaster_dock_deep: 2, // Further reduced from 3 for realistic distribution
                toolmaster_isle: 2, // Further reduced from 3 for realistic distribution
                rock_deep: 1, // Reduced from 2 for realistic distribution
            },
            subzoneTags: {
                pier: 2, // Increased from 10
                shady_spawn: 2, // Increased from 10
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.5 },
        displayRotation: { x:  -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },

    // --- Barracuda ---
    {
        id: 'barracuda',
        name: 'Barracuda',
        rarity: 'rare',
        minWeight: 65, // Reduced from 75 to make accessible to iron rods
        maxWeight: 200,
        baseValue: 30,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - good size range (65-200lbs)
        modelData: {
            modelUri: 'models/npcs/barracuda.gltf',
            sprite: 'barracuda_sprite.png',
            baseScale: 0.2,
            maxScale: 1.4
        },
        spawnData: {
            baseChance: 1, // Small base chance to appear anywhere
            regionTags: {
                toolmaster_island: 7, // Increased from 5
                tree_isle: 3, // Increased from 2
                pier_deep: 3, // Increased from 2
                rock_deep: 3, // Increased from 2
                mud_isle: 15, // Increased from 12
                toolmaster_dock_deep: 2, // Added adjacent zone with lower frequency
            },
            subzoneTags: {
                kelp_bed: 4, // Increased from 3
                shady_spawn: 4, // Increased from 3
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.75 },
        displayRotation: { x:  -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },

    // --- Shipjack Tuna ---
    {
        id: 'shipjack_tuna',
        name: 'Shipjack Tuna',
        rarity: 'rare',
        minWeight: 126,
        maxWeight: 850,
        baseValue: 45, // Adjusted to hit 750 max value ceiling
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - good size range (126-850lbs)
        modelData: {
            modelUri: 'models/npcs/shipjack_tuna.gltf',
            sprite: 'shipjack_tuna_sprite.png',
            baseScale: 0.33,
            maxScale: 1.75
        },
        spawnData: {
            baseChance: 1, // Decent chance anywhere
            regionTags: {
                    mud_isle: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                    x_deep: 3, // Adjusted to 30-40% reduction (was 2, original ~4)
                    pier_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                    big_island: 1,
                    toolmaster_dock_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                    toolmaster_isle: 2, // Further reduced from 3 for realistic distribution
                    tree_isle: 2, // Further reduced from 3 for realistic distribution
                    shadow_isle: 2, // Further reduced from 3 for realistic distribution
                    shadow_deep: 1, // Further reduced from 2 for realistic distribution
            },
            subzoneTags: {
                pier: 5,
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.25 , z: DEFAULT_FISH_DISPLAY_POSITION.z   },
        displayRotation: { x:0, y: 0, z: 0, w: 0.7071068 }
    },
    // --- Grouper ---
    {
        id: 'grouper',
        name: 'Grouper',
        rarity: 'rare',
        minWeight: 25,
        maxWeight: 850,
        baseValue: 9, // Adjusted to hit 750 max value ceiling
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - rare rarity with excellent size range (25-850lbs)
        modelData: {
            modelUri: 'models/npcs/grouper.gltf',
            sprite: 'grouper_sprite.png',
            baseScale: 0.9,
            maxScale: 2
        },
        spawnData: {
            baseChance: 1, // Reduced from 3 for realistic distribution
            regionTags: {
                big_island: 1,
                mud_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                x_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                pier_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                toolmaster_dock_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                toolmaster_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                toolmaster_island: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                tree_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                shadow_isle: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                shadow_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
                cliffs_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~6)
            },
            subzoneTags: {
                old_dock: 15,
                pier: 5,
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.5, z: DEFAULT_FISH_DISPLAY_POSITION.z },
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Salmon ---
    {
        id: 'salmon',
        name: 'Salmon',
        rarity: 'rare',
        minWeight: 40,
        maxWeight: 150,
        baseValue: 30,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - good size range (40-150lbs)
        modelData: {
            modelUri: 'models/npcs/salmon.gltf',
            sprite: 'salmon_sprite.png',
            baseScale: 0.5,
            maxScale: 1.25
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                toolmaster_isle: 10,
            },
            subzoneTags: {
                shady_beach: 5,
                deep_coast: 5,
    
            },
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.15, z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.5  },
        displayRotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },

    // --- Marlin ---
    {
        id: 'marlin',
        name: 'Marlin',
        rarity: 'rare',
        minWeight: 85, // Reduced from 100 to make accessible to iron rods
        maxWeight: 1000,
        baseValue: 25, // Reduced from 50 to bring max value from $1,000 to $300
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - large size range (85-1000lbs)
        modelData: {
            modelUri: 'models/npcs/marlin.gltf',
            sprite: 'marlin_sprite.png',
            baseScale: 0.75,
            maxScale: 2
        },
        spawnData: {
            baseChance: 1, // Small base chance to appear anywhere
            regionTags: {
               rock_deep: 2, // Adjusted to 30-40% reduction (was 3, original ~7)
               pier_deep: 2, // Reduced from 3 for realistic distribution
               x_deep: 2, // Reduced from 3 for realistic distribution
               toolmaster_dock_deep: 3, // Adjusted to 30-40% reduction (was 4, original ~10)
               shadow_deep: 2, // Reduced from 3 for realistic distribution
               mud_isle: 1, // Reduced from 2 for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.1, z: DEFAULT_FISH_DISPLAY_POSITION.z  },
        displayRotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },

    // --- Swordfish ---
    // REMOVED FOR NEXT ITERATION - Commented out for future implementation
    // {
    //     id: 'swordfish',
    //     name: 'Swordfish',
    //     rarity: 'rare',
    //     minWeight: 20,
    //     maxWeight: 100,
    //     baseValue: 10,
    //     isBait: false,
    //     isLoot: false,
    //     isTrophy: true, // Trophy fish - good size range (20-100lbs)
    //     modelData: {
    //         modelUri: 'models/npcs/swordfish.gltf',
    //         sprite: 'swordfish_sprite.png',
    //         baseScale: 0.5,
    //         maxScale: 1.25
    //     },
    //     spawnData: {
    //         baseChance: 0, // Decent chance anywhere
    //         regionTags: {
    //             shadow_deep: 8,
    //             rock_deep: 3,
    //         },
    //         subzoneTags: {
    //             pier: 0,
    //         },
    //         hotspotTags: {
    //         },
    //         rodRestrictions: [] 
    //     },
    //         // Display position/rotation when equipped. Uses defaults if not specified.
    //     // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
    //     displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.1 , z: DEFAULT_FISH_DISPLAY_POSITION.z -0.1 },
    //     displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    // },


    // --- Glass Anglerfish ---
    {
        id: 'glass_anglerfish',
        name: 'Glass Anglerfish',
        rarity: 'epic',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 80,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - epic rarity (though small, still rare)
        modelData: {
            modelUri: 'models/npcs/glass_anglerfish.gltf',
            sprite: 'glass_anglerfish_sprite.png',
            baseScale: 0.8,
            maxScale: 1.1
        },
        spawnData: {
            baseChance: 0.05, // Extremely low base chance - needs glow_worm or glass_shrimp for good odds
            regionTags: {
                tree_isle: 5, // Reduced from 8 for realistic distribution
                shadow_deep: 2, // Reduced from 3 for realistic distribution
                toolmaster_island: 1, // Reduced from 2 for realistic distribution
            },
            subzoneTags: {
                deep_coast: 5,
                pond: 0    // Cannot be caught in ponds
            },
            hotspotTags: {
            },
            spawnTimes: ['night'], // Only spawns at night (19:00-5:00)
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

   
    // ---  Vampire Squid ---
    {
        id: 'vampire_squid',
        name: 'Vampire Squid',
        rarity: 'legendary',
        minWeight: 10,
        maxWeight: 1000,
        baseValue: 2.4, // Adjusted to hit ~1200 max value
        isBait: true,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity
        modelData: {
            modelUri: 'models/npcs/vampire_squid.gltf',
            sprite: 'vampire_squid_sprite.png',
            baseScale: 0.25,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                shadow_isle: 1, // Reduced from 3 for realistic distribution
                shadow_deep: 1, // Reduced from 2 for realistic distribution
                rock_deep: 1 // Keep at 1 (very rare legendary)
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            spawnTimes: ['night'], // Vampires only come out at night
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 1.25 , y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.03 },
        displayRotation: { x: 0, y: 0, z: 0.7071068, w: 0.7071068 }
    },

    // ---  Great White Shark ---
    {
        id: 'great_white_shark',
        name: 'Great White Shark',
        rarity: 'epic',
        minWeight: 500,
        maxWeight: 1750,
        baseValue: 114, // Adjusted to hit ~1200 max value (in 1000s)
        isBait: false,
        isLoot: false,
        isTrophy: true, 
        modelData: {
            modelUri: 'models/npcs/great_white_shark.gltf',
            sprite: 'great_white_shark_sprite.png',
            baseScale: 1.0,
            maxScale: 3
        },
        spawnData: {
            baseChance: 1, // Small base chance to appear anywhere
            regionTags: {
                pier_deep: 2, // Reduced from 12 for realistic distribution
                rock_deep: 1, // Reduced from 2 for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
                cliffs_deep: 1, // NEW - added for realistic distribution
                shadow_deep: 1, // NEW - added for realistic distribution
                toolmaster_dock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y - 0.5, z: DEFAULT_FISH_DISPLAY_POSITION.z },
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },





    // ------------------------------ //
    // ------------------------------ //
    // --- Shadowrock Fish --- 
    // ------------------------------ //
    // ------------------------------ //

    // --- Grasping Horror ---
    {
        id: 'grasping_horror',
        name: 'Grasping Horror', 
        rarity: 'uncommon',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/grasping_horror.gltf',
            sprite: 'grasping_horror_sprite.png',
            baseScale: 0.6,
            maxScale: 0.9
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                shadow_isle: 10,
                shadow_deep: 8,
                rock_deep: 8
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Amethyst Gleam ---
    {
        id: 'amethyst_gleam',
        name: 'Amethyst Gleam',
        rarity: 'uncommon',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/amethyst_gleam.gltf',
            sprite: 'amethyst_gleam_sprite.png',
            baseScale: 0.4,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 1, 
            regionTags: {
                shadow_isle: 10,
                shadow_deep: 8,
                rock_deep: 8
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
   

     // --- Black Jellyfish ---
    {
        id: 'black_jellyfish',
        name: 'Black Jellyfish',
        rarity: 'rare',
        minWeight: 8, // Increased from 3 to reduce weight ratio from 33x to 12.5x
        maxWeight: 100,
        baseValue: 8, // Reduced from 10 to bring max value from $666 to $200
        isBait: true,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/black_jellyfish.gltf',
            sprite: 'black_jellyfish_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                shadow_isle: 10,
                shadow_deep: 8,
                rock_deep: 8
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Piranha ---
    {
        id: 'piranha',
        name: 'Piranha',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 10,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/piranha.gltf',
            sprite: 'piranha_sprite.png',
            baseScale: 0.5,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                shadow_isle: 10,
                rock_deep: 8
            },
            subzoneTags: {
                shadow_kelp_inlet: 8,
                shadow_kelp_coast: 6
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // ---  Glass Squid ---
    {
        id: 'glass_squid',
        name: 'Glass Squid',
        rarity: 'legendary',
        minWeight: 10,
        maxWeight: 800,
        baseValue: 24, // Adjusted to hit ~1200 max value
        isBait: true,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity
        modelData: {
            modelUri: 'models/npcs/glass_squid.gltf',
            sprite: 'glass_squid_sprite.png',
            baseScale: 0.5,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                cliffs_deep: 3, // Reduced from 10 for realistic distribution
                shadow_deep: 2, // Reduced from 8 for realistic distribution
                rock_deep: 2, // Reduced from 8 for realistic distribution
                pier_deep: 2, // Reduced from 6 for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
                toolmaster_dock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 1.25 , y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.03 },
        displayRotation: { x: 0, y: 0, z: 0.7071068, w: 0.7071068 }

    },
    // --- Ghost Piranha ---
    {
        id: 'ghost_piranha',
        name: 'Ghost Piranha',
        rarity: 'rare',
        minWeight: 2,
        maxWeight: 20,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: true,
        modelData: {
            modelUri: 'models/npcs/ghost_piranha.gltf',
            sprite: 'ghost_piranha_sprite.png',
            baseScale: 0.5,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0.00, // Extremely low base chance - needs glow_worm or glass_shrimp for good odds
            regionTags: {
                shadow_deep: 3, // Secondary location
                shadow_isle: 2, // Minimal chance elsewhere
            },
            subzoneTags: {
                deep_coast: 3, // Prefers deeper waters
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // ---  Ghost Pufferfish ---
    {
        id: 'ghost_pufferfish',
        name: 'Ghost Pufferfish',
        rarity: 'legendary',
        minWeight: 3,
        maxWeight: 100,
        baseValue: 10,
        isBait: true,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity
        modelData: {
            modelUri: 'models/npcs/ghost_pufferfish.gltf',
            sprite: 'ghost_pufferfish_sprite.png',
            baseScale: 0.33,
            maxScale: 0.9
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                shadow_isle: 10, // Keep existing (very rare legendary, night only)
                shadow_deep: 8, // Keep existing (very rare legendary, night only)
                rock_deep: 8 // Keep existing (very rare legendary, night only)
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [],
            spawnTimes: ['night'] // Only spawns at night (19:00-5:00)
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // ---  Ghost Shark ---
    {
        id: 'ghost_shark',
        name: 'Ghost Shark',
        rarity: 'legendary',
        minWeight: 500,
        maxWeight: 1350,
        baseValue: 89, // Adjusted to hit ~1200 max value
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - legendary rarity with massive size
        modelData: {
            modelUri: 'models/npcs/ghost_shark.gltf',
            sprite: 'ghost_shark_sprite.png',
            baseScale: 1.0,
            maxScale: 10
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                shadow_deep: 2, // Reduced from 8 for realistic distribution (very rare legendary)
                cliffs_deep: 1, // NEW - added for realistic distribution
                rock_deep: 1, // NEW - added for realistic distribution
                pier_deep: 1, // NEW - added for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },



    // ------------------------------ //
    // ------------------------------ //
    // --- x isle Fish --- 
    // ------------------------------ //
    // ------------------------------ //


    // --- Coin Fish ---
    {
        id: 'coin_fish',
        name: 'Coin Fish',
        rarity: 'uncommon',
        minWeight: 4,
        maxWeight: 10,
        baseValue: 12,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/coin_fish.gltf',
            sprite: 'coin_fish_sprite.png',
            baseScale: 0.4,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                big_island: 0, // General boost on Big Island
                x_isle: 15,
                ancient_path: 6, // Add to new deep zones
                ancient_dig: 5, // Add to dig site
            },
            subzoneTags: {
                shady_spawn: 5,
            },
            hotspotTags: {
              
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Yellow Jellyfish ---
    {
        id: 'yellow_jellyfish',
        name: 'Yellow Jellyfish',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 15,
        baseValue: 10,
        isBait: true,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/yellow_jellyfish.gltf',
            sprite: 'yellow_jellyfish_sprite.png',
            baseScale: 0.2,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                big_island: 0, // General boost on Big Island
                x_isle: 15
            },
            subzoneTags: {
                shady_spawn: 5,
            },
            hotspotTags: {
              
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Yellowtail Snapper ---
    {
        id: 'yellowtail_snapper',
        name: 'Yellowtail Snapper',
        rarity: 'rare',
        minWeight: 75, // Reduced from 90 to make accessible to iron rods
        maxWeight: 300,
        baseValue: 50,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - excellent size range (75-300lbs)
        modelData: {
            modelUri: 'models/npcs/yellowtail_snapper.glb',
            sprite: 'yellowtail_snapper_sprite.png',
            baseScale: 0.6,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 1, // Added base chance
            regionTags: {
                x_deep: 4, // Adjusted to 30-40% reduction (was 3, original ~5)
                x_isle: 18, // Increased from 15
                pier_deep: 1, // Further reduced from 2 for realistic distribution
            },
            subzoneTags: {
                shady_spawn: 3, // Increased from 2
            },
            hotspotTags: {},
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: { x: DEFAULT_FISH_DISPLAY_POSITION.x, y: DEFAULT_FISH_DISPLAY_POSITION.y + 0.2 , z: DEFAULT_FISH_DISPLAY_POSITION.z + 0.5 },
        displayRotation: { x:  -0.7071068, y: 0, z: 0, w: 0.7071068 }
    },
    // --- Dune Shark ---
    {
        id: 'dune_shark',
        name: 'Dune Shark',
        rarity: 'epic',
        minWeight: 40, // Reduced from 50 to make accessible to iron rods
        maxWeight: 850,
        baseValue: 19, // Reduced from 33 to maintain difficulty (1.7x weight increase)
        isBait: false,
        isLoot: false,
        isTrophy: true, // Trophy fish - epic rarity with great size (40-850lbs)
        modelData: {
            modelUri: 'models/npcs/dune_shark.gltf',
            sprite: 'dune_shark_sprite.png',
            baseScale: 0.8,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 1, // Added base chance
            regionTags: {
                x_deep: 2, // Reduced from 3 for realistic distribution
                x_isle: 2, // Added adjacent zone with lower frequency
                pier_deep: 1, // NEW - added for realistic distribution
                cliffs_deep: 1, // NEW - added for realistic distribution
                shadow_deep: 1, // NEW - added for realistic distribution
                rock_deep: 1, // NEW - added for realistic distribution
                toolmaster_dock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },


    // ------------------------------ //
    // ------------------------------ //
    // --- Tree Isle Fish --- 
    // ------------------------------ //
    // ------------------------------ //

        

    // --- Tetras ---
    {
        id: 'tetra',
        name: 'Tetra',
        rarity: 'uncommon',
        minWeight: 0.5,
        maxWeight: 1,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/tetra.gltf',
            sprite: 'tetra_sprite.png',
            baseScale: 0.5, 
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0,
            regionTags: {
                tree_isle: 10,
                ancient_path: 8, // Add to new deep zones
                ancient_dig: 6, // Add to dig site
            },
            subzoneTags: { // These might need future adjustment for Koi Island's specific subzones
            },
            hotspotTags: {
                reef: 1 
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // ---  Stingray ---
    {
        id: 'stingray',
        name: 'Stingray',
        rarity: 'rare',
        minWeight: 30,
        maxWeight: 100,
        baseValue: 30,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/stingray.gltf',
            sprite: 'stingray_sprite.png',
            baseScale: 0.5,
            maxScale: 1
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                tree_isle: 20,
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Moray Eel ---
    {
        id: 'moray_eel',
        name: 'Moray Eel',
        rarity: 'rare',
        minWeight: 6,
        maxWeight: 150,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: true, // Added trophy flag
        modelData: {
            modelUri: 'models/npcs/moray_eel.gltf',
            sprite: 'moray_eel_sprite.png',
            baseScale: 0.8,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Added base chance
            regionTags: {
                tree_isle: 12, // Increased from 10
                toolmaster_island: 4, // Added adjacent zone with lower frequency
            },
            subzoneTags: {
               
            },
            hotspotTags: {
              // Can add specific hotspot affinities later if needed
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Shadow Scale ---
    {
        id: 'shadow_scale',
        name: 'Shadow Scale',
        rarity: 'rare',
        minWeight: 8,
        maxWeight: 25,
        baseValue: 25,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/shadow_scale.gltf',
            sprite: 'shadow_scale_sprite.png',
            baseScale: 0.9,
            maxScale: 1.3
        },
        spawnData: {
            baseChance: 0, // Very rare living fossil
            regionTags: {
                mud_isle: 50,
                shadow_deep: 15, // Primary location in deep shadow waters
                shadow_isle: 10,
                rock_deep: 8,   // Also found in other deep areas
                pier_deep: 5
            },
            subzoneTags: {
                deep_coast: 12, // Strong affinity for deep waters
                kelp_bed: 8,    // Hidden among kelp
                shadow_kelp_inlet: 20, // Perfect habitat in shadow kelp
                shadow_kelp_coast: 16,
            },
            hotspotTags: {
                // Ancient fish, no specific hotspot preferences
            },
            rodRestrictions: [] // Can be caught with any rod, but very rare
        }
    },
    // ---  Hammerhead Shark ---
    {
        id: 'hammerhead_shark',
        name: 'Hammerhead Shark',
        rarity: 'epic',
        minWeight: 85, // Reduced from 100 to make accessible to iron rods
        maxWeight: 1500,
        baseValue: 22, // Reduced from 33 to maintain difficulty (1.5x weight increase from 1000 to 1500)
        isBait: false,
        isLoot: false,
        isTrophy: true, // Added trophy flag
        modelData: {
            modelUri: 'models/npcs/hammerhead_shark.gltf',
            sprite: 'hammerhead_shark_sprite.png',
            baseScale: 0.5,
            maxScale: 2.5
        },
        spawnData: {
            baseChance: 0, // Added base chance
            regionTags: {
                tree_isle: 3, // Reduced from 4 for realistic distribution
                toolmaster_island: 1, // Reduced from 2 for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
                pier_deep: 1, // NEW - added for realistic distribution
                cliffs_deep: 1, // NEW - added for realistic distribution
                shadow_deep: 1, // NEW - added for realistic distribution
                rock_deep: 1, // NEW - added for realistic distribution
                toolmaster_dock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },


    // ------------------------------ //
    // ------------------------------ //
    // --- Koi Island Saltwater Fish --- 
    // ------------------------------ //
    // ------------------------------ //

    // --- Acorn Fish ---
    {
        id: 'acorn_fish',
        name: 'Acorn Fish',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 10,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/acorn_fish.gltf',
            sprite: 'acorn_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                toolmaster_island: 10,
                toolmaster_dock_deep: 8,
                tree_isle: 10,
                ancient_dig: 8, // Add to dig site
            },
            subzoneTags: {
            },
            hotspotTags: {
                reef: 1 
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Fester Fish ---
    {
        id: 'festerfish',
        name: 'Fester Fish',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 10,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/festerfish.gltf',
            sprite: 'fester_fish_sprite.png',
            baseScale: 0.5,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                toolmaster_island: 10,
                toolmaster_dock_deep: 8
            },
            subzoneTags: { // These might need future adjustment for Koi Island's specific subzones
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Blushfish ---
    {
        id: 'blushfin',
        name: 'Blushfin',
        rarity: 'uncommon',
        minWeight: 2,
        maxWeight: 10,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/blushfin.gltf',
            sprite: 'blushfin_sprite.png',
            baseScale: 0.5,
            maxScale: 0.8
        },
        spawnData: {
            baseChance: 0,
            regionTags: {
                toolmaster_island: 15,
                toolmaster_dock_deep: 8,
                ancient_path: 10, // Add to new deep zones
                ancient_dig: 8, // Add to dig site
            },
            subzoneTags: { 

            },
            hotspotTags: {
               
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    
    // --- Gillie Fish (Uncommon) ---
    {
        id: 'gillie_fish',
        name: 'Gillie Fish',
        rarity: 'uncommon',
        minWeight: 3,
        maxWeight: 8,
        baseValue: 12,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/gillie_fish.gltf',
            sprite: 'gillie_fish_sprite.png',
            baseScale: 0.6,
            maxScale: 0.9,
            animation: 'swim' // Uses idle animation
        },
        spawnData: {
            baseChance: 4,
            regionTags: {
                pier_deep: 0, // Not in old deep zones
                rock_deep: 0,
                cliffs_deep: 0,
                x_deep: 0,
                shadow_deep: 0,
                toolmaster_dock_deep: 0,
                ancient_path: 15, // Only in new deep zones
                ancient_dig: 10,
            },
            subzoneTags: {
                deep_water: 20,
            },
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Yellowfin Tuna (Rare) ---
    {
        id: 'yellowfin_tuna',
        name: 'Yellowfin Tuna',
        rarity: 'rare',
        minWeight: 15,
        maxWeight: 35,
        baseValue: 80,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/yellowfin-tuna.gltf',
            sprite: 'yellowfin_tuna_sprite.png',
            baseScale: 1.2,
            maxScale: 1.5,
            animation: 'idle' // Uses idle animation
        },
        spawnData: {
            baseChance: 2,
            regionTags: {
                pier_deep: 0, // Not in old deep zones
                rock_deep: 0,
                cliffs_deep: 0,
                x_deep: 0,
                shadow_deep: 0,
                toolmaster_dock_deep: 0,
                ancient_path: 8, // Only in new deep zones
                ancient_dig: 5,
            },
            subzoneTags: {
                deep_water: 12,
            },
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Sailfish (Epic) ---
    {
        id: 'sailfish',
        name: 'Sailfish',
        rarity: 'epic',
        minWeight: 40,
        maxWeight: 80,
        baseValue: 200,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/sailfish.gltf',
            sprite: 'sailfish_sprite.png',
            baseScale: 1.5,
            maxScale: 2.0,
            animation: 'idle' // Uses idle animation
        },
        spawnData: {
            baseChance: 1,
            regionTags: {
                pier_deep: 0, // Not in old deep zones
                rock_deep: 0,
                cliffs_deep: 0,
                x_deep: 0,
                shadow_deep: 0,
                toolmaster_dock_deep: 0,
                ancient_path: 5, // Only in new deep zones (NOT in ancient_dig)
            },
            subzoneTags: {
                deep_water: 8,
            },
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Blue Gill (Rare) ---
    {
        id: 'blue_gill',
        name: 'Blue Gill',
        rarity: 'rare',
        minWeight: 8,
        maxWeight: 15,
        baseValue: 60,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/blue_gill.gltf',
            sprite: 'blue_gill_sprite.png',
            baseScale: 0.8,
            maxScale: 1.1,
            animation: 'idle' // Uses idle animation
        },
        spawnData: {
            baseChance: 3,
            regionTags: {
                ancient_dig: 12, // Only in dig site
            },
            subzoneTags: {},
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Mahi-Mahi (Rare) ---
    {
        id: 'mahi_mahi',
        name: 'Mahi-Mahi',
        rarity: 'rare',
        minWeight: 12,
        maxWeight: 25,
        baseValue: 75,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/mahi-mahi.gltf',
            sprite: 'mahi_mahi_sprite.png',
            baseScale: 1.0,
            maxScale: 1.3,
            animation: 'idle' // Uses idle animation
        },
        spawnData: {
            baseChance: 3,
            regionTags: {
                ancient_dig: 15, // Strong presence in dig site
            },
            subzoneTags: {},
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Lionfish (Rare) ---
    {
        id: 'lionfish',
        name: 'Lionfish',
        rarity: 'rare',
        minWeight: 5,
        maxWeight: 12,
        baseValue: 65,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/lionfish.gltf',
            sprite: 'lionfish_sprite.png',
            baseScale: 0.7,
            maxScale: 1.0,
            animation: 'idle' // Regular swim animation
        },
        spawnData: {
            baseChance: 2.5,
            regionTags: {
                ancient_dig: 18, // Primary location
            },
            subzoneTags: {},
            rodRestrictions: []
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    
    // --- Tropfin ---
    {
        id: 'tropfin',
        name: 'Tropfin',
        rarity: 'uncommon',
        minWeight: 2,
        maxWeight: 10,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/tropfin.gltf',
            sprite: 'tropfin_sprite.png',
            baseScale: 0.8,
            maxScale: 1.1
        },
        spawnData: {
            baseChance: 0,
            regionTags: {
                toolmaster_island: 15,
                toolmaster_dock_deep: 8,
            },
            subzoneTags: { 
                sunny_beach: 2,
            },
            hotspotTags: {
               
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
     // --- Frostfin ---
    {
        id: 'frostfin',
        name: 'Frostfin',
        rarity: 'uncommon',
        minWeight: 6,
        maxWeight: 10,
        baseValue: 7,
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/frostfin.gltf',
            sprite: 'frostfin_sprite.png',
            baseScale: 0.8,
            maxScale: 1.25
        },
        spawnData: {
            baseChance: 0, 
            regionTags: {
                toolmaster_island: 10,
                toolmaster_dock_deep: 8
            },
            subzoneTags: { // These might need future adjustment for Koi Island's specific subzones
                sunny_beach: 0, 
                shady_beach: 0,   
                shallow_coast: 0, 
                pond: 0    
            },
            hotspotTags: {
        
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // ---  Koi Shark ---
    {
        id: 'koi_shark',
        name: 'Koi Shark',
        rarity: 'epic',
        minWeight: 100,
        maxWeight: 1000,
        baseValue: 33, // Reduced from 60 to bring max value from $1,800 to $990
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/koi_shark.gltf',
            sprite: 'koi_shark_sprite.png',
            baseScale: 0.6,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                toolmaster_island: 5, // Reduced from 8 for realistic distribution
                toolmaster_dock_deep: 6, // Reduced from 12 for realistic distribution
                x_deep: 1, // NEW - added for realistic distribution
                pier_deep: 1, // NEW - added for realistic distribution
                cliffs_deep: 1, // NEW - added for realistic distribution
                shadow_deep: 1, // NEW - added for realistic distribution
                rock_deep: 1, // NEW - added for realistic distribution
            },
            subzoneTags: {
            },
            hotspotTags: {
            },
            rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // ------------------------------ //
    // ------------------------------ //
    // --- MYTHIC Fish --- 
    // ------------------------------ //
    // ------------------------------ //


    // ---  Great Gold Shark ---
    {
        id: 'great_gold_shark',
        name: 'Great Gold Shark',
        rarity: 'mythic',
        minWeight: 1250,
        maxWeight: 1800,
        baseValue: 231, // Adjusted to hit 2000 max value
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/great_gold_shark.gltf',
            sprite: 'great_gold_shark_sprite.png',
            baseScale: 0.8,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Decent chance anywhere
            regionTags: {
                x_deep: 10
            },
            subzoneTags: {
                
            },
            hotspotTags: {
            },
            spawnTimes: ['sunset'], // Only spawns at sunset (17:00-19:00)
            rodRestrictions: ['loot_rod'] // Only catchable with the Loot Rod
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },
    // --- Gold King Koi --- 
    {
        id: 'gold_king_koi',
        name: 'Gold King Koi',
        rarity: 'mythic',
        minWeight: 2,
        maxWeight: 8,
        baseValue: 75, // Reduced from 500 to bring max value from $12,000 to ~$900
        isBait: false,
        isLoot: false,
        isTrophy: false,
        modelData: {
            modelUri: 'models/npcs/gold_king_koi.gltf',
            sprite: 'gold_king_koi_fish_sprite.png',
            baseScale: 1,
            maxScale: 2.0
        },
        spawnData: {
          baseChance: 0, // Only found in specific zones
          regionTags: {
          },
          subzoneTags: {
          },
          hotspotTags: {},
          rodRestrictions: [] 
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },






    // =============================================
    // CHESTS AS FISH - Reelable treasure items
    // =============================================
    
    // --- Treasure Chest ---
    {
        id: 'common_chest',
        name: 'Treasure Chest',
        rarity: 'uncommon',
        minWeight: 80, // Reduced from 150 - accessible to Iron Rod (250g capacity)
        maxWeight: 120, // Reduced from 200
        baseValue: 100,
        isBait: false,
        isLoot: true, // Still treated as loot after reeling
        isTrophy: false,
        modelData: {
            modelUri: 'models/items/common_chest.gltf',
            sprite: 'common_chest_sprite.png',
            baseScale: 1.2,
            maxScale: 1.2
        },
        spawnData: {
            baseChance: 1.2, // Increased from 0.4 to make chests more catchable (must be reeled in)
            regionTags: {
                // Focus on X Isle and Tree Isle, with some deep water crossover
                big_island: 0.9, // Increased from 0.3 (3x)
                toolmaster_island: 1.2, // Increased from 0.4 (3x)
                tree_isle: 3.6, // Increased from 1.2 (3x)
                x_isle: 4.5, // Increased from 1.5 (3x)
                mud_isle: 1.5, // Increased from 0.5 (3x)
                shadow_isle: 1.2, // Increased from 0.4 (3x)
                pier_deep: 2.4, // Increased from 0.8 (3x)
                rock_deep: 1.8, // Increased from 0.6 (3x)
                cliffs_deep: 2.1, // Increased from 0.7 (3x)
                x_deep: 3.0, // Increased from 1.5 to 3.0 (target: 1.2 + 3.0 = 4.2, vs Red Snapper 5)
                shadow_deep: 1.2, // Increased from 0.4 (3x)
            },
            subzoneTags: {
                deep_water: 1.0, // Some presence but less than runic ores (2.5x)
                deep_coast: 0.8 // Less than runic ores (2.0x)
            },
            hotspotTags: {},
            rodRestrictions: [],
            spawnTimes: [] // Can be caught any time
        }
    },

    // --- Rare Chest --- DEPRECATED - Removed from game
    // --- Legendary Chest (Ancient Vault) --- DEPRECATED - Removed from game

    // --- Runic Ore ---
    {
        id: 'runic_ore',
        name: 'Runic Ore',
        rarity: 'epic',
        minWeight: 250, // Matches the weight requirement from LootCatalog
        maxWeight: 300,
        baseValue: 200,
        isBait: false,
        isLoot: true, // Mark as loot so it converts after reeling
        isTrophy: false,
        modelData: {
            modelUri: 'models/decor/runic_ore.gltf',
            sprite: 'runic_ore_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0.8, // Increased from 0.20 to make runic ore more catchable (must be reeled in)
            regionTags: {
                big_island: 0.3, // Increased from 0.1 (3x)
                toolmaster_island: 0.45, // Increased from 0.15 (3x)
                tree_isle: 0.3, // Increased from 0.1 (3x)
                pier_deep: 1.8, // Increased from 0.6 (3x)
                rock_deep: 3.0, // Increased from 1.0 (3x)
                mud_isle: 0.6, // Increased from 0.2 (3x)
                shadow_isle: 3.6, // Increased from 1.2 (3x)
                cliffs_deep: 3.6, // Increased from 1.2 (3x)
                x_isle: 0.3, // Increased from 0.1 (3x)
                x_deep: 3.2, // Increased from 1.5 to 3.2 (target: 0.8 + 3.2 = 4.0, vs Red Snapper 5)
                shadow_deep: 2.4 // Increased from 0.8 (3x)
            },
            subzoneTags: {
                deep_water: 2.5, // Major boost for deep water (where they're most common)
                deep_coast: 2.0, // Strong boost for deep coast
                kelp_bed: 0.4
            },
            hotspotTags: {},
            rodRestrictions: [], // Rod weight limits will handle accessibility
            spawnTimes: [] // Can be caught any time
        },
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // =============================================

    // ===================================================
    // ANCIENT EXPLORER QUEST ITEMS - Map Fragments & Vault
    // ===================================================
    
    // --- Map Fragment 1: The Heart ---
    {
        id: 'map_fragment_heart',
        name: 'Ancient Map Fragment - The Heart',
        rarity: 'rare',
        minWeight: 5,
        maxWeight: 8,
        baseValue: 0, // Quest item, no sell value
        isBait: false,
        isLoot: true,
        isTrophy: false,
        modelData: {
            modelUri: 'models/items/runebit.gltf',
            sprite: 'runebit_sprite.png',
            baseScale: 0.8,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only spawns during quest with ancient magnet
            questGated: true,
            requiredQuest: 'ancient_cartographer_fountain',
            requiredBait: 'ancient_magnet',
            questStage: 1, // First fragment
            questCoordinates: { x: -13, y: 32, z: 3, radius: 25 }, // Central fountain location
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Map Fragment 2: The Knowledge ---
    {
        id: 'map_fragment_knowledge',
        name: 'Ancient Map Fragment - The Knowledge',
        rarity: 'rare',
        minWeight: 5,
        maxWeight: 8,
        baseValue: 0, // Quest item, no sell value
        isBait: false,
        isLoot: true,
        isTrophy: false,
        modelData: {
            modelUri: 'models/items/runebit.gltf',
            sprite: 'runebit_sprite.png',
            baseScale: 0.8,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only spawns during quest with ancient magnet
            questGated: true,
            requiredQuest: 'ancient_cartographer_toolmaster',
            requiredBait: 'ancient_magnet',
            questStage: 2, // Second fragment
            questCoordinates: { x: -129, y: 13, z: -214, radius: 25 }, // Ancient blocks on Toolmaster Island
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Map Fragment 3: The Depths ---
    {
        id: 'map_fragment_depths',
        name: 'Ancient Map Fragment - The Depths',
        rarity: 'rare',
        minWeight: 5,
        maxWeight: 8,
        baseValue: 0, // Quest item, no sell value
        isBait: false,
        isLoot: true,
        isTrophy: false,
        modelData: {
            modelUri: 'models/items/runebit.gltf',
            sprite: 'runebit_sprite.png',
            baseScale: 0.8,
            maxScale: 1.0
        },
        spawnData: {
            baseChance: 0, // Only spawns during quest with ancient magnet
            questGated: true,
            requiredQuest: 'ancient_cartographer_shadow',
            requiredBait: 'ancient_magnet',
            questStage: 3, // Third fragment
            questCoordinates: { x: 216, y: 11, z: 103, radius: 25 }, // Waterfall on Shadow Isle
            regionTags: {},
            subzoneTags: {},
            hotspotTags: {},
            rodRestrictions: []
        },
            // Display position/rotation when equipped. Uses defaults if not specified.
        // You can adjust relative to defaults: { x: DEFAULT_FISH_DISPLAY_POSITION.x + 0.1, ... }
        displayPosition: DEFAULT_FISH_DISPLAY_POSITION,
        displayRotation: DEFAULT_FISH_DISPLAY_ROTATION
    },

    // --- Explorer Forge Quest: Relic Shard ---
    {
        id: 'relic_shard',
        name: 'Relic Shard',
        rarity: 'rare', // Set to rare for average rare fish difficulty
        minWeight: 125, // Requires iron rod minimum
        maxWeight: 125,
        baseValue: 0, // Quest item, no value
        isBait: false,
        isLoot: true,
        isTrophy: false,
        modelData: {
            modelUri: 'models/items/relic_shard.gltf',
            sprite: 'relic_shard_sprite.png',
            baseScale: 1.5,
            maxScale: 1.5
        },
        spawnData: {
            baseChance: 0, // Only spawns when fishing with magnet
            questGated: true,
            requiredQuest: 'explorer_solve_riddle', // Check if Forge quest is active
            requiredBait: 'bait_magnet', // Regular magnet from Toolmaster
            questStage: 1, // Just need quest completed
            questCoordinates: { x: 63, y: 11, z: 186, radius: 3 }, // Pyramid location on Big Island
            regionTags: {
                big_island: 100 // Must be at pyramid coordinates
            },
            subzoneTags: {},
            hotspotTags: {},
            // No time restrictions - can fish anytime with magnet
            rodRestrictions: [] // Weight restriction handles this naturally
        }
    },

    // =============================================
];

// --- Utility Functions for Time-based Spawning ---

/**
 * Convert user-friendly time periods to hour-based time windows
 * Based on GameClock time periods:
 * - Sunrise: 5:00-7:00 (2 hours)
 * - Day: 7:00-17:00 (10 hours) 
 * - Sunset: 17:00-19:00 (2 hours)
 * - Night: 19:00-5:00 (10 hours, overnight)
 */
export function convertSpawnTimesToWindows(spawnTimes: TimePeriod[]): { start: number; end: number; }[] {
    if (!spawnTimes || spawnTimes.includes('any')) {
        return []; // Empty array means no time restrictions (available anytime)
    }

    const windows: { start: number; end: number; }[] = [];

    for (const period of spawnTimes) {
        switch (period) {
            case 'sunrise':
                windows.push({ start: 5, end: 7 });
                break;
            case 'day':
                windows.push({ start: 7, end: 17 });
                break;
            case 'sunset':
                windows.push({ start: 17, end: 19 });
                break;
            case 'night':
                windows.push({ start: 19, end: 5 }); // Overnight window
                break;
            // 'any' is handled above
        }
    }

    return windows;
}

/**
 * Get the current time period based on game hour
 */
export function getCurrentTimePeriod(hour: number): TimePeriod {
    if (hour >= 5 && hour < 7) return 'sunrise';
    if (hour >= 7 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'sunset';
    return 'night'; // 19-5 (overnight)
}
