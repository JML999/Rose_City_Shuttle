// Centralized Loot Catalog for all lootable items, including bait

export type LootCategory = 'junk' | 'bait' | 'common' | 'uncommon' | 'rare' | 'epic' | 'chest';

export interface LootDefinition {
    id: string;
    name: string;
    type: string;
    category: LootCategory;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value: number;
    modelUri: string;
    sprite: string;
    baseChance: number;
    weight: number; // Weight for rod catch limit checking
    description?: string;
    baseScale?: number; // Optional custom scale for display (defaults to 0.8 if not specified)
    baitStats?: {
        baseLuck?: number;
        lootScore?: number;
        targetSpecies?: string[];
        speciesLuck?: number;
        resilliance?: number;
        strength?: number;
        preferredLoot?: Array<{ lootTableId: string; boostMultiplier: number }>;
        description?: string;
        drag?: number;
        catchWeight?: number;
        catchSpeed?: number;
        catchZone?: number;
    };
    sources?: string[];
}

export const LOOT_CATALOG: LootDefinition[] = [
    {
        id: 'trash',
        name: 'Trash',
        type: 'item',
        category: 'junk',
        rarity: 'common',
        value: 0,
        modelUri: 'models/items/trash.gltf',
        sprite: 'trash_sprite.png',
        baseChance: 35,
        weight: 1, // Minimal weight
        description: 'Some worthless junk.',
        sources: ['fishing']
    },
    {
        id: 'old_can',
        name: 'Old Can',
        type: 'item',
        category: 'junk',
        rarity: 'common',
        value: 1,
        modelUri: 'models/items/old_can.gltf',
        sprite: 'old_can_sprite.png',
        baseChance: 25,
        weight: 1, // Minimal weight
        description: 'An old, rusted can.',
        sources: ['fishing']
    },
    {
        id: 'seaweed',
        name: 'Seaweed',
        type: 'item',
        category: 'common',
        rarity: 'common',
        value: 2,
        modelUri: 'models/environment/waving-grass.gltf',
        sprite: 'seaweed_sprite.png',
        baseChance: 20,
        weight: 1, // Minimal weight
        description: 'Natural seaweed that washed ashore. Can be sold for coins.',
        sources: ['fishing']
    },
    {
        id: 'driftwood',
        name: 'Driftwood',
        type: 'item',
        category: 'common',
        rarity: 'common',
        value: 3,
        modelUri: 'models/items/driftwood.gltf',
        sprite: 'dritwood_sprite.png',
        baseChance: 20,
        weight: 1,
        baseScale: 0.2, // 1/4 of default 0.8 scale
        description: 'Weathered wood washed ashore. A valuable building material for crafting.',
        sources: ['fishing']
    },
    {
        id: 'ancient_driftwood',
        name: 'Ancient Driftwood',
        type: 'item',
        category: 'loot',
        rarity: 'uncommon',
        value: 15,
        modelUri: 'models/items/ancient-driftwood.gltf',
        sprite: 'ancient_driftwood_sprite.png',
        baseChance: 0, // Only in fallback loot
        weight: 1,
        description: 'Driftwood that can only be caught with specific rods. Contains traces of ancient materials.',
        sources: ['fishing']
    },
    {
        id: 'bamboo-slats',
        name: 'Bamboo Slats',
        type: 'item',
        category: 'common',
        rarity: 'common',
        value: 4,
        modelUri: 'models/items/bamboo-slats.gltf',
        sprite: 'bamboo-slats.png',
        baseChance: 20,
        weight: 1,
        description: 'Flexible bamboo strips. Useful for crafting and building.',
        sources: ['fishing']
    },
    {
        id: 'bait_worm',
        name: 'Worm',
        type: 'bait',
        category: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/worm.gltf',
        sprite: 'worm_sprite.png',
        baseChance: 10,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'A common earthworm. Fish love these.'
    },
    {
        id: 'bait_clam',
        name: 'Clam',
        type: 'bait',
        category: 'bait',
        rarity: 'common',
        value: 10,
        modelUri: 'models/npcs/clam.gltf',
        sprite: 'clam_sprite.png',
        baseChance: 5,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'A fresh clam. Attracts various fish species.'
    },
    {
        id: 'bait_insect',
        name: 'Insect',
        type: 'bait',
        category: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/insect.glb',
        sprite: 'insect_sprite.png',
        baseChance: 8,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'Flying insects that fish find irresistible.'
    },
    {
        id: 'bait_shrimp',
        name: 'Shrimp',
        type: 'bait',
        category: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/shrimp.gltf',
        sprite: 'shrimp_sprite.png',
        baseChance: 15,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'Small crustaceans that attract various fish species.',
        baitStats: {
            baseLuck: 1.2,
            targetSpecies: [],
            speciesLuck: 1,
            description: 'Good general-purpose bait with moderate luck boost.',
            drag: 1,
            catchWeight: 1,
            catchZone: 1,
            lootScore: 1,
            preferredLoot: []
        }
    },
    {
        id: 'bait_fish_head',
        name: 'Fish Head',
        type: 'bait',
        category: 'bait',
        rarity: 'common',
        value: 8,
        modelUri: 'models/items/fish_head.gltf',
        sprite: 'fish_head_sprite.png',
        baseChance: 10,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'Pieces of fish that attract predators.',
        baitStats: {
            baseLuck: 1.15,
            targetSpecies: [],
            speciesLuck: 1,
            description: 'Attracts larger predatory fish.',
            drag: 1,
            catchWeight: 1,
            catchZone: 1,
            lootScore: 1,
            preferredLoot: []
        }
    },
    {
        id: 'bait_squid_tentacle',
        name: 'Squid Tentacle',
        type: 'bait',
        category: 'bait',
        rarity: 'rare',
        value: 15,
        modelUri: 'models/items/squid_tentacle.gltf',
        sprite: 'squid_tentacle.png',
        baseChance: 2,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'Pieces of squid, often found near reefs or deeper waters. Attracts predators.'
    },
    {
        id: 'bait_ray_tail',
        name: 'Ray Tail',
        type: 'bait',
        category: 'bait',
        rarity: 'rare',
        value: 15,
        modelUri: 'models/items/ray_tail.gltf',
        sprite: 'ray_tail.png',
        baseChance: 0.2,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'Pieces of manta ray, often found on the ocean floor. Attracts predators.'
    },
    {
        id: 'bait_glow_worm',
        name: 'Glow Worm',
        type: 'bait',
        category: 'bait',
        rarity: 'rare',
        value: 100,
        modelUri: 'models/npcs/glow_worm.gltf',
        sprite: 'glow_worm_sprite.png',
        baseChance: 0.1,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'A bioluminescent worm that glows in the dark. Attracts rare deep-sea fish.'
    },
    {
        id: 'bait_rare_algae',
        name: 'Rare Algae',
        type: 'bait',
        category: 'bait',
        rarity: 'rare',
        value: 20,
        modelUri: 'models/environment/waving-grass.gltf',
        sprite: 'seaweed_sprite.png',
        baseChance: 0.1,
        weight: 1, // Minimal weight
        sources: ['fishing'], // CRITICAL: This allows it to appear in fallback loot
        description: 'A rare freshwater algae with exceptional nutrients. Superior to insects for freshwater fishing.'
    },
    {
        id: 'bait_glass_shrimp',
        name: 'Glass Shrimp',
        type: 'bait',
        category: 'bait',
        rarity: 'legendary',
        value: 50,
        modelUri: 'models/items/glass_shrimp.gltf',
        sprite: 'glass_shrimp.png',
        baseChance: 0.05,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'An ethereal, translucent shrimp. Attracts legendary fish.'
    },
    {
        id: 'bait_glass_tentacle',
        name: 'Glass Tentacle',
        type: 'bait',
        category: 'bait',
        rarity: 'legendary',
        value: 50,
        modelUri: 'models/items/glass_tentacle.gltf',
        sprite: 'glass_tentacle.png',
        baseChance: 0.05,
        weight: 1, // Minimal weight
        sources: ['fishing'],
        description: 'A mystical tentacle that shimmers like glass. Highly sought after by collectors.'
    },
    {
        id: 'bait_magnet',
        name: 'Magnet', 
        type: 'bait',
        category: 'bait',
        rarity: 'rare',
        value: 150,
        modelUri: 'models/items/magnet.gltf',
        sprite: 'magnet_sprite.png',
        baseChance: 0, // Cannot be fished, only crafted
        weight: 10, // Heavier than normal bait
        sources: ['crafting'],
        description: 'A powerful electromagnet crafted with ancient materials. Terrible for catching fish, but attracts sunken treasure chests!',
        baitStats: {
            baseLuck: -5, // Negative fish luck - mathematically impossible to catch fish
            lootScore: 2.5, // 250% loot score - reduces trash, improves chest odds
            targetSpecies: [], // Doesn't target fish
            speciesLuck: 1.0,
            description: 'Treasure Hunter: Attracts chests but repels fish',
            drag: 1.0,
            catchWeight: 1.0,
            catchZone: 1.0,
            preferredLoot: [
                { lootTableId: 'common_chest', boostMultiplier: 8.0 },
                { lootTableId: 'rare_chest', boostMultiplier: 2.0 },
                { lootTableId: 'legendary_chest', boostMultiplier: 0.4 }
            ]
        }
    },
    {
        id: 'iron_nugget',
        name: 'Iron Nugget',
        type: 'item',
        category: 'rare',
        rarity: 'common',
        value: 5,
        modelUri: 'models/items/iron-nugget.gltf',
        sprite: 'iron_nugget_sprite.png',
        baseChance: 5,
        weight: 1, // Minimal weight
        description: 'A small piece of iron ore.',
        sources: ['fishing']
    },
    {
        id: 'gold_nugget',
        name: 'Gold Nugget',
        type: 'item',
        category: 'rare',
        rarity: 'common',
        value: 5,
        modelUri: 'models/items/gold-nugget.gltf',
        sprite: 'gold_nugget_sprite.png',
        baseChance: 2,
        weight: 1, // Minimal weight
        description: 'A small piece of gold ore.',
        sources: ['fishing']
    },
    {
        id: 'mithril_nugget',
        name: 'Mithril Nugget',
        type: 'item',
        category: 'rare',
        rarity: 'common',
        value: 10,
        modelUri: 'models/items/mithril-nugget.gltf',
        sprite: 'mithril_nugget_sprite.png',
        baseChance: 0.5,
        weight: 1, // Minimal weight
        description: 'A small piece of mithril ore.',
        sources: ['fishing']
    },
    {
        id: 'rock_salt',
        name: 'Rock Salt',
        type: 'item',
        category: 'common',
        rarity: 'common',
        value: 15,
        modelUri: 'models/items/rock_salt.gltf',
        sprite: 'rock_salt_sprite.png',
        baseChance: 0, // Not obtainable through fishing, only terrain damage
        weight: 1, // Minimal weight
        description: 'Crystalline salt deposits found in ghost dirt. Used for enhancing bait.',
        sources: ['terrain'] // New source type for terrain-obtained items
    },
    {
        id: 'iron_ingot',
        name: 'Iron Ingot',
        type: 'item',
        category: 'rare',
        rarity: 'uncommon',
        value: 25,
        modelUri: 'models/items/iron-ingot.gltf',
        sprite: 'iron_ingot_sprite.png',
        baseChance: 3,
        weight: 1, // Minimal weight
        description: 'A refined iron ingot ready for crafting.',
        sources: ['fishing']
    },
    {
        id: 'gold_ingot',
        name: 'Gold Ingot',
        type: 'item',
        category: 'rare',
        rarity: 'rare',
        value: 50,
        modelUri: 'models/items/gold-ingot.gltf',
        sprite: 'gold_ingot_sprite.png',
        baseChance: 1,
        weight: 1, // Minimal weight
        description: 'A refined gold ingot, valuable for crafting.',
        sources: ['fishing']
    },
    {
        id: 'mithril_ingot',
        name: 'Mithril Ingot',
        type: 'item',
        category: 'rare',
        rarity: 'rare',
        value: 150,
        modelUri: 'models/items/mithril-ingot.gltf',
        sprite: 'mithril_ingot_sprite.png',
        baseChance: 0.3,
        weight: 1, // Minimal weight
        description: 'A refined mithril ingot, extremely valuable.',
        sources: ['fishing']
    },
    {
        id: 'rune',
        name: 'Rune',
        type: 'item',
        category: 'epic',
        rarity: 'epic',
        value: 100,
        modelUri: 'models/items/rune.gltf',
        sprite: 'rune_sprite.png',
        baseChance: 0.1,
        weight: 1, // Minimal weight
        description: 'A rune of power. Used for rod enchanting. Can be purchased from the Wizard or found in chests.',
        sources: ['fishing', 'chest', 'merchant']
    },
    {
        id: 'rare_rune',
        name: 'Ark Rune',
        type: 'item',
        category: 'epic',
        rarity: 'legendary',
        value: 500,
        modelUri: 'models/items/rune.gltf', // Uses same model as standard rune
        sprite: 'rune_sprite.png',
        baseChance: 0.01,
        weight: 1, // Minimal weight
        description: 'An ark rune of immense power from a lost civilization. Used for rod enchanting. Only found in rare and legendary chests.',
        sources: ['chest']
    },

    // === CHEST LOOT ===
    {
        id: 'common_chest',
        name: 'Treasure Chest',
        type: 'chest',
        category: 'chest',
        rarity: 'uncommon',
        value: 100,
        modelUri: 'models/items/common_chest.gltf',
        sprite: 'common_chest_sprite.png',
        baseChance: 3,
        weight: 250, // Weight-gated to metal rods (gold rod has lowest capacity at 250lb)
        description: 'An old chest from a sunken vessel. Contains basic ancient materials.',
        sources: ['fishing']
        // Note: Regional drop rates are handled in FallbackLootTables.ts
    },
    {
        id: 'rare_chest',
        name: 'Rare Chest',
        type: 'chest',
        category: 'chest',
        rarity: 'rare',
        value: 300,
        modelUri: 'models/items/rare_chest.gltf',
        sprite: 'rare_chest_sprite.png',
        baseChance: 1.2,
        weight: 400, // Heavy - requires strong rods
        description: 'A sturdy chest reinforced with metal bands. Contains valuable ancient artifacts.',
        sources: ['fishing']
    },
    {
        id: 'legendary_chest',
        name: 'Ancient Vault',
        type: 'chest',
        category: 'chest',
        rarity: 'legendary',
        value: 1000,
        modelUri: 'models/items/legendary_chest.gltf',
        sprite: 'legendary_chest_sprite.png',
        baseChance: 0.2,
        weight: 600, // Very heavy - requires elite rods
        description: 'An ornate chest from a lost civilization. Contains legendary treasures.',
        sources: ['fishing']
    },

    // === JELLYFISH STING MATERIALS ===
    // NOTE: sting_jelly and mega_sting are NOT CURRENTLY IN PRODUCTION
    // These items were intended for crafting enhanced baits but are not currently obtainable.
    // May be implemented in future iterations.
    // {
    //     id: 'sting_jelly',
    //     name: 'Sting Jelly',
    //     type: 'item',
    //     category: 'common',
    //     rarity: 'uncommon',
    //     value: 15,
    //     modelUri: 'models/items/sting_jelly.gltf',
    //     sprite: 'sting_jelly.png',
    //     baseChance: 0, // Not obtainable through fishing, only crafting
    //     weight: 1, // Minimal weight
    //     description: 'Extracted jelly from green jellyfish stingers. Used for enhancing bait with stunning properties.',
    //     sources: ['crafting'] // Obtained by crafting from jellyfish
    // },
    // {
    //     id: 'mega_sting',
    //     name: 'Mega Sting',
    //     type: 'item',
    //     category: 'uncommon',
    //     rarity: 'rare',
    //     value: 25,
    //     modelUri: 'models/items/mega_sting.gltf',
    //     sprite: 'mega_sting_jelly.png',
    //     baseChance: 0, // Not obtainable through fishing, only crafting
    //     weight: 1, // Minimal weight
    //     description: 'Potent extract from black jellyfish stingers. Creates powerful stunning bait when combined with fish bait.',
    //     sources: ['crafting'] // Obtained by crafting from jellyfish
    // },

    // === ANCIENT EXPLORER QUEST ITEMS ===
    {
        id: 'ancient_magnet',
        name: 'Ancient Magnet',
        type: 'bait',
        category: 'bait',
        rarity: 'legendary',
        value: 0, // Quest item, no value
        modelUri: 'models/items/ancient_magnet.gltf',
        sprite: 'ancient_magnet_sprite.png',
        baseChance: 0, // Quest item only
        weight: 5, // Light enough for any rod
        sources: ['quest'],
        description: 'A mystical compass that resonates with the cartographer\'s hidden treasures. Glows brighter when near riddle locations. One-time use.',
        baitStats: {
            baseLuck: 0, // No effect on normal fishing
            lootScore: 0,
            targetSpecies: [],
            speciesLuck: 1,
            description: 'Quest Item: Resonates with ancient treasure locations',
            drag: 1,
            catchWeight: 1,
            catchZone: 1,
            preferredLoot: []
        }
    },

    // === FITZ ANCIENT SCROLL QUEST ITEM ===
    {
        id: 'ancient_scroll',
        name: 'Ancient Scroll',
        type: 'item',
        category: 'rare',
        rarity: 'epic',
        value: 0, // Quest item, no value
        modelUri: 'models/items/map.gltf',
        sprite: 'map_sprite.png',
        baseChance: 0, // Quest item, not found in fishing
        weight: 1,
        description: 'An ancient scroll uncovered by Fitz. Contains markings of the ancient pyramid and other mysterious symbols he cannot decipher.',
        sources: ['quest']
    },

    // === ANCIENT MAGNET FRAGMENTS ===
    {
        id: 'ancient_fragment',
        name: 'Ancient Magnet Fragment',
        type: 'item',
        category: 'rare',
        rarity: 'legendary',
        value: 0, // Quest item, no value
        modelUri: 'models/items/runebit.gltf',
        sprite: 'runebit_sprite.png',
        baseChance: 0, // Quest item only
        weight: 5, // Light enough for any rod
        sources: ['quest'],
        description: 'A fragment of an ancient, powerful relic. This piece resonates with mystical energy, calling to its other parts scattered across the islands. Collect 4 fragments to reassemble the Ancient Magnet.'
    },
    {
        id: 'fitz_note_last_fragment',
        name: 'Fitz\'s Note',
        type: 'item',
        category: 'rare',
        rarity: 'common',
        value: 0, // Quest item, no value
        modelUri: 'models/items/runebit.gltf', // TODO: Use note model if available
        sprite: 'runebit_sprite.png',
        baseChance: 0, // Quest item only
        weight: 1, // Very light
        sources: ['quest'],
        description: 'A torn note from Ol\' Man Fitz: "Got to this one first, ole sport."'
    },
    {
        id: 'ancient_fragment_chest',
        name: 'Ancient Fragment Chest',
        type: 'chest',
        category: 'chest',
        rarity: 'rare',
        value: 0, // Quest item, no sell value
        modelUri: 'models/items/rare_chest.gltf', // Uses rare_chest model
        sprite: 'rare_chest_sprite.png',
        baseChance: 0, // Quest item only
        weight: 10, // Light - accessible with any rod
        sources: ['quest'],
        description: 'An ancient chest containing a fragment of the Ancient Magnet. Found only in the ancient pools scattered across the islands.'
    },

    // === RELIC SHARDS (Three-Piece Meta Quest) ===
    {
        id: 'relic_shard',
        name: 'Relic Shard',
        type: 'item',
        category: 'rare',
        rarity: 'legendary',
        value: 0, // Quest item, no value
        modelUri: 'models/items/relic_shard.gltf',
        sprite: 'relic_shard_sprite.png',
        baseChance: 0, // Quest item only
        weight: 5, // Light enough for any rod
        sources: ['quest'],
        description: 'A shard of an ancient relic. One of three pieces that, when assembled, will unlock the key to an ancient treasure. Collect all three shards to complete the quest.'
    },
    {
        id: 'pharaoh_hilt',
        name: 'Pharaoh Hilt',
        type: 'item',
        category: 'rare',
        rarity: 'epic',
        value: 0, // Quest item, no value
        modelUri: 'models/items/pharaoh_hilt.gltf',
        sprite: 'pharaoh_hilt_sprite.png',
        baseChance: 0, // Quest item only
        weight: 5,
        sources: ['quest'],
        description: 'A piece of a larger puzzle to be solved. Part of an ancient rod design.'
    },
    {
        id: 'ancient_cartographer_vault',
        name: 'Ancient Cartographer\'s Vault',
        type: 'chest',
        category: 'chest',
        rarity: 'legendary',
        value: 2000, // High value reward
        modelUri: 'models/items/rare_chest.gltf',
        sprite: 'rare_chest_sprite.png',
        baseChance: 0, // Quest item only
        weight: 350, // Requires strong rod
        sources: ['quest'],
        description: 'The cartographer\'s ultimate treasure. A legendary vault containing the ancient loot rod and other priceless artifacts.'
    },

    // === ORE LOOT ===
    {
        id: 'runic_ore',
        name: 'Runic Ore',
        type: 'item',
        category: 'rare',
        rarity: 'epic',
        value: 200,
        modelUri: 'models/decor/runic_ore.gltf',
        sprite: 'runic_ore_sprite.png',
        baseChance: 0.5, // Low probability, handled in fallback tables
        weight: 300, // Heavy - requires good rod with high weight max and loot score
        description: 'A mystical ore infused with ancient runic energy. Contains valuable materials when opened.',
        sources: ['fishing']
    },

    // Add more loot and bait definitions here as needed
]; 