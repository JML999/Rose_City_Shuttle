import { Vector3 } from "hytopia";

// --- Define Your Tags Here ---
// Add or remove tags based on your map's actual features
export type RegionTag = 'big_island' | 'starter_island' | 'shadow_island' | 'toolmaster_island' | 'x_isle' | 'x_deep' | 'mud_isle' | 'shadow_isle' | 'shadow_deep' | 'rock_deep' | 'tree_isle' | 'cliffs_deep' | 'toolmaster_dock_deep' | 'toolmaster_isle' | 'pier_deep' | 'ancient_dig' | 'ancient_path';
export type SubzoneTag = 'pond' | 'sunny_beach' |'shady_beach'| 'deep_water' | 'shallow_coast' | 'deep_coast' | 'pier' | 'kelp_bed' | 'shady_spawn'| 'old_dock' | 'boardwalk' | 'shadow_kelp_inlet' | 'shadow_kelp_coast';
export type HotspotTag = 'reef' | 'kelp_forest' | 'shipwreck' | 'underwater_cave' | 'fishing_village_nearby' | 'spawning_ground' | 'wooded';

// --- Fishing Zone Definition ---
export interface FishingZone {
    id: string;          // Unique identifier (e.g., 'big_island_whispering_pond')
    name: string;        // Player-facing name (e.g., "Whispering Pond")
    position: Vector3;   // Center coordinates
    radius: number;      // Radius of the zone

    // Optional descriptive properties
    depth?: number;      // Max fishing depth if relevant

    // Tags defining the zone's characteristics for fish spawning logic
    regionTags?: RegionTag[];
    subzoneTags?: SubzoneTag[];
    hotspotTags?: HotspotTag[];
    fallbackTableKey?: string; // Optional: fallback loot table key for this zone
}

// --- List of All Defined Fishing Zones ---
// Add all your specific zones, regions, and hotspots here using center + radius
export const ALL_FISHING_ZONES: FishingZone[] = [
    // --- Zone for the entire Big Island Region ---
    {
        id: 'region_big_island',
        name: 'Big Island Waters',
        position: new Vector3(-19.17, 12, 3.5),
        radius: 150,
        regionTags: ['big_island'],
        fallbackTableKey: 'big_island_fallback',
    },

       // --- Spawn Pier ---
    {
        id: 'big_island_spawn_pier',
        name: 'Spawn Pier',
        position: new Vector3(-120, 12, 34.075),
        radius: 22,
        regionTags: ['big_island'],
        subzoneTags: ['pier'],
        fallbackTableKey: 'big_island_spawn_pier_fallback',
    },

     // --- Bait Pier ---
    {
        id: 'big_island_boardwalk',
        name: 'Boardwalk',
        position: new Vector3(-117, 12, -29.45),
        radius: 16.5,
        regionTags: ['big_island'],
        subzoneTags: ['boardwalk'],
        fallbackTableKey: 'boardwalk_fallback',
    },

    // --- Old Dock ---
    {
        id: 'big_island_old_dock',
        name: 'Old Dock',
        position: new Vector3(-95.31, 12, -60),
        radius: 21.5,
        regionTags: ['big_island'],
        subzoneTags: ['old_dock'],
        fallbackTableKey: 'old_dock_fallback',
    },


    // --- Forest Beach ---
    {
        id: 'big_island_forest_beach',
        name: 'Forest Beach',
        position: new Vector3(-39.4, 12, -90.75),
        radius: 26,
        regionTags: ['big_island'],
        subzoneTags: ['shady_beach', 'deep_coast'],
        fallbackTableKey: 'shady_beach_fallback',
    },


    // --- Zone for Breeze Beach ---
    {
        id: 'big_island_breeze_beach', // Unique ID
        name: 'Breeze Beach',          // Player-facing name
        position: new Vector3(85.62, 12, -26.17), // Your center coordinate
        radius: 35.5,                  // Calculated radius to encompass boundaries
        regionTags: ['big_island'],    // Tagging it as part of the Big Island region
        subzoneTags: ['sunny_beach'],        // Tagging it as a beach type zone
        fallbackTableKey: 'sunny_beach_fallback',
    },


    // --- Old-Angler's Kelp Inlet ---
    {
        id: 'big_island_kelp_inlet',
        name: 'Old-Angler\'s Kelp Inlet',
        position: new Vector3(57.46, 12, 60),
        radius: 24.5,
        regionTags: ['big_island'],
        subzoneTags: ['kelp_bed'],
        fallbackTableKey: 'kelp_bed_fallback',
    },

    // --- Cliffs ---
    {
        id: 'big_island_cliffs',
        name: 'Cliffs',
        position: new Vector3(-34.37, 12, 78),
        radius: 10,
        regionTags: ['big_island'],
        subzoneTags: ['deep_coast'],
        hotspotTags: ['spawning_ground'],
        fallbackTableKey: 'deep_coast_fallback',
    },

    // --- Shady Spawn (Peninsula) ---
    {
        id: 'big_island_shady_spawn',
        name: 'Shady Spawn Peninsula',
        position: new Vector3(-88.37, 12, 64),
        radius: 20,
        regionTags: ['big_island'],
        subzoneTags: ['shady_spawn'],
        hotspotTags: ['spawning_ground'],
        fallbackTableKey: 'shady_spawn_fallback',
    },


    // --- Central Square Fountain ---
    {
        id: 'big_island_central_fountain',
        name: 'Central Square Fountain',
        position: new Vector3(-45, 27, -10),
        radius: 3,
        regionTags: ['big_island'],
        subzoneTags: ['pond'], // Functionally a pond
        fallbackTableKey: 'pond_fallback',
    },

    // --- Spawn Pond ---
    {
        id: 'big_island_spawn_pond',
        name: 'Spawn Pond',
        position: new Vector3(-75.21, 18.7, 36.52),
        radius: 6,
        regionTags: ['big_island'],
        subzoneTags: ['pond'],
        fallbackTableKey: 'pond_fallback',
    },

    // --- X Isle ---
    {
        id: 'region_x_isle',
        name: 'X Isle',
        position: new Vector3(-100, 12, 151.71), // Center of min/max x/z
        radius: 50, // Covers the area from -150 to -61 (width ~89), so 50 is safe
        regionTags: ['x_isle'],
        fallbackTableKey: 'x_isle_fallback',
    },
    // --- X Deep ---
    {
        id: 'region_x_deep',
        name: 'X Deep',
        position: new Vector3(-16.365, 12, 174.07), // Center of min/max x/z
        radius: 55, // Covers the area from -36.47 to 1.27 (width ~38), so 55 is safe
        regionTags: ['x_deep'],
        fallbackTableKey: 'x_deep_fallback',
    },
    // --- Mud Isle ---
    {
        id: 'region_mud_isle',
        name: 'Mud Isle',
        position: new Vector3(62.36, 12, 173.29), // Center of min/max x/z
        radius: 45, // Covers the area from 29.02 to 95.72 (width ~66), so 45 is safe
        regionTags: ['mud_isle'],
        fallbackTableKey: 'mud_isle_fallback',
    },
    // --- Shadow Isle ---
    {
        id: 'region_shadow_isle',
        name: 'Shadow Isle',
        position: new Vector3(298, 15, 190), // NEW: Around digger
        radius: 70, // Adjust as needed
        regionTags: ['shadow_isle'],
        fallbackTableKey: 'shadow_isle_fallback',
    },

    // --- Shadow Kelp Inlet ---
    {
        id: 'shadow_isle_kelp_inlet',
        name: 'Shadow Kelp Inlet',
        position: new Vector3(231.97, 11.50, 197.86),
        radius: 15,
        regionTags: ['shadow_isle'],
        subzoneTags: ['shadow_kelp_inlet'],
        hotspotTags: ['kelp_forest'],
        fallbackTableKey: 'shadow_kelp_inlet_fallback',
    },

    // --- Shadow Kelp Coast ---
    {
        id: 'shadow_isle_kelp_coast',
        name: 'Shadow Kelp Coast',
        position: new Vector3(260.10, 11.50, 208.09),
        radius: 18,
        regionTags: ['shadow_isle'],
        subzoneTags: ['shadow_kelp_coast'],
        hotspotTags: ['kelp_forest'],
        fallbackTableKey: 'shadow_kelp_coast_fallback',
    },
    // --- Shadow Deep ---
    {
        id: 'region_shadow_deep',
        name: 'Shadow Deep',
        position: new Vector3(194.5, 12, -0.5), // Center of min/max x/z
        radius: 55, // Covers the area from 142 to 247 (width ~105), so 55 is safe
        regionTags: ['shadow_deep'],
        fallbackTableKey: 'shadow_deep_fallback',
    },
    // --- Rock Deep ---
    {
        id: 'region_rock_deep',
        name: 'Rock Deep',
        position: new Vector3(238, 12, -73), // Center of min/max x/z
        radius: 25, // Covers the area from 226 to 250 (width ~24), so 25 is safe
        regionTags: ['rock_deep'],
        fallbackTableKey: 'rock_deep_fallback',
    },


    // --- Tree Isle ---
    {
        id: 'region_tree_isle',
        name: 'Tree Isle',
        position: new Vector3(213, 12, -132), // Center of min/max x/z
        radius: 31, // Covers the area from 182 to 244 (width ~62), so 31 is safe
        regionTags: ['tree_isle'],
        fallbackTableKey: 'tree_isle_fallback',
    },



    // --- Cliffs Deep ---
    {
        id: 'region_cliffs_deep',
        name: 'Cliffs Deep',
        position: new Vector3(28, 12, -193.5), // Center of min/max x/z
        radius: 109, // Covers the area from -29 to 85 (width ~114), so 109 is safe
        regionTags: ['cliffs_deep'],
        fallbackTableKey: 'cliffs_deep_fallback',
    },


    // --- Pier Deep ---
    {
        id: 'region_pier_deep',
        name: 'Pier Deep',
        position: new Vector3(-211.5, 12, 9), // Center of min/max x/z
        radius: 70, // Covers the area from -246 to -177 (width ~69), so 70 is safe
        regionTags: ['pier_deep'],
        fallbackTableKey: 'pier_deep_fallback',
    },

    // ------------------------------ //
    // ------------------------------ //
    // --- Toolmaster's Island  --- 
    // ------------------------------ //
    // ------------------------------ //

    // --- Toolmaster's Island ---
    {
        id: 'region_toolmaster_island',
        name: 'Toolmaster\'s Island',
        position: new Vector3(-305, 13, -270), // NEW: Around pressure plate
        radius: 70, // Adjust as needed
        regionTags: ['toolmaster_island'],
        fallbackTableKey: 'toolmaster_island_fallback',
    },

    // --- Koi Dock Deep ---
    {
        id: 'region_toolmaster_dock_deep',
        name: 'Toolmaster\'s Dock Deep',
        position: new Vector3(-70.5, 12, -208), // Center of min/max x/z
        radius: 18, // Covers the area from -88 to -53 (width ~35), so 18 is safe
        regionTags: ['toolmaster_dock_deep'],
        fallbackTableKey: 'toolmaster_dock_deep_fallback',
    },

    // --- Koi Pond Lower 1 ---
    {
        id: 'toolmaster_pond_lower_1',
        name: 'Toolmaster\'s Pond Lower 1',
        position: new Vector3(-133, 14, -212),
        radius: 6,
        regionTags: ['toolmaster_island'],
        subzoneTags: ['pond'],
        fallbackTableKey: 'pond_fallback',
    },
    // --- Koi Lower Pond 2 ---
    {
        id: 'toolmaster_pond_lower_2',
        name: 'Toolmaster\'s Pond Lower 2',
        position: new Vector3(-144, 15, -170),
        radius: 7,
        regionTags: ['toolmaster_island'],
        subzoneTags: ['pond'],
        fallbackTableKey: 'pond_fallback',
    },
    // --- Koi Upper Pond ---
    {
        id: 'toolmaster_upper_pond',
        name: 'Toolmaster\'s Upper Pond',
        position: new Vector3(-197, 13, -210),
        radius: 4,
        regionTags: ['toolmaster_island'],
        subzoneTags: ['pond'],
        fallbackTableKey: 'pond_fallback',
    },

    // --- Ancient Dig Island Zone ---
    {
        id: 'ancient_dig_zone',
        name: 'Ancient Dig Site',
        position: new Vector3(-120.5, 16.29, 440.98), // Researcher position (anchor -116 + relative -4.5, y 15.79+0.5, z 449.78-8.8)
        radius: 100, // Covers island and extends to z=480 (distance ~40 blocks from center, using 100 for full coverage)
        regionTags: ['ancient_dig'],
        fallbackTableKey: 'ancient_dig_fallback',
    },

    // --- Path Zones (Brock's Island to Ancient Dig) ---
    // Path: Brock (-106.72, 15.79, 143.59) to Ancient Dig (-116, 15.79, 449.78)
    // Distance: ~306 blocks, creating 2 intermediate zones
    {
        id: 'ancient_path_zone_1',
        name: 'Deep Waters - Path Zone 1',
        position: new Vector3(-109.8, 15.79, 245.7), // ~1/3 of the way from Brock to Ancient Dig
        radius: 80,
        regionTags: ['ancient_path'],
        subzoneTags: ['deep_water'],
        fallbackTableKey: 'ancient_path_1_fallback',
    },
    {
        id: 'ancient_path_zone_2',
        name: 'Deep Waters - Path Zone 2',
        position: new Vector3(-112.9, 15.79, 347.8), // ~2/3 of the way from Brock to Ancient Dig
        radius: 80,
        regionTags: ['ancient_path'],
        subzoneTags: ['deep_water'],
        fallbackTableKey: 'ancient_path_2_fallback',
    },


];

// --- Optional Constants (Example) ---
// export const BIG_ISLAND_APPROX_CENTER = new Vector3(-19.17, 12, 3.5);

// --- Base/Ocean Handling ---
// Remember: The logic determining the current fishing zone will need to handle cases
// where the player is NOT inside any zone listed in ALL_FISHING_ZONES. 