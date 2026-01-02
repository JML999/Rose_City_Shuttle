import type { InventoryItem, ItemType, ItemRarity } from '../Inventory/Inventory';

export interface BaitDefinition {
    id: string;
    name: string;
    modelId: string;
    sprite: string;
    rarity: ItemRarity;
    class: string;
    description: string;
    harvestChance: number;
    minHarvestAmount: number;
    maxHarvestAmount: number;
    value: number;
    baseLuck: number;
    targetSpecies?: string[];
    speciesLuck?: number;
    drag?: number;
    catchWeight?: number;
    lootScore?: number;
    catchSpeed?: number;
    catchZone?: number;
    preferredLoot?: Array<{
        lootTableId: string;
        boostMultiplier: number;
    }>;
}

// BaitService.ts
export class BaitService {
    public static createBaitItem(baitId: string, quantity: number = 1): InventoryItem | null {
        // Strip 'bait_' prefix if present
        const catalogId = baitId.replace(/^bait_/, '');
        const baitDef = BAIT_CATALOG[catalogId];
        
        if (!baitDef) {
            console.error(`Bait definition not found for ID: ${baitId} (Catalog ID: ${catalogId})`);
            return null;
        }
        
        return {
            id: baitDef.id,
            modelId: baitDef.modelId,
            sprite: baitDef.sprite,
            name: baitDef.name,
            type: 'bait',
            rarity: baitDef.rarity,
            value: baitDef.value,
            quantity: quantity,
            metadata: {
                baitStats: {
                    baseLuck: baitDef.baseLuck,
                    class: baitDef.class,
                    targetSpecies: baitDef.targetSpecies || [],
                    speciesLuck: baitDef.speciesLuck,
                    description: baitDef.description,
                    drag: baitDef.drag,
                    catchWeight: baitDef.catchWeight,
                    lootScore: baitDef.lootScore,
                    catchSpeed: baitDef.catchSpeed,
                    catchZone: baitDef.catchZone,
                    preferredLoot: baitDef.preferredLoot || []
                }
            }
        };
    }
}

export const BAIT_CATALOG: { [key: string]: BaitDefinition } = {
    'worm': {
        id: 'bait_worm',
        name: 'Worm',
        modelId: 'models/npcs/worm.gltf',
        sprite: 'worm_sprite.png',
        rarity: 'common',
        class: 'Universal',
        description: 'Basic bait dug from the ground. Works on all fish but basic effectiveness.',
        harvestChance: 0.7,
        minHarvestAmount: 1,
        maxHarvestAmount: 3,
        value: 2,
        baseLuck: 1.20, // 15% fishing luck boost
        lootScore: 1,
        targetSpecies: [], // Universal - targets everything
        speciesLuck: 1.0,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            { lootTableId: 'bait_shrimp', boostMultiplier: 1.2 } // 8% chance to get shrimp
        ]
    },
    'insect': {
        id: 'bait_insect',
        name: 'Insect',
        modelId: 'models/npcs/insect.glb',
        sprite: 'insect_sprite.png',
        rarity: 'common',
        class: 'Freshwater',
        description: 'An insect found on trees. Specializes in freshwater and small fish.',
        harvestChance: 0.7,
        minHarvestAmount: 1,
        maxHarvestAmount: 3,
        value: 3,
        baseLuck: 0.9, // Slightly worse than worm for universal use
        lootScore: 1,
        targetSpecies: ['goldfish', 'trout', 'largemouth_bass', 'koi_fish', 'marbled_koi', 'green_frog'], // Freshwater specialists
        speciesLuck: 1.8, // Strong bonus for targeted species
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.00,
        catchZone: 1.0,
    },
    'rare_algae': {
        id: 'bait_rare_algae',
        name: 'Rare Algae',
        modelId: 'models/environment/waving-grass.gltf', // Using seaweed model for now
        sprite: 'seaweed_sprite.png', // Using seaweed sprite for now
        rarity: 'rare',
        class: 'Freshwater',
        description: 'A rare algae with exceptional nutrients. Superior to insects for freshwater fishing.',
        harvestChance: 0, // Cannot be harvested, only found as loot
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 20,
        baseLuck: 1.1, // Better base luck than insect (0.9)
        lootScore: 1,
        targetSpecies: ['goldfish', 'trout', 'largemouth_bass', 'koi_fish', 'marbled_koi', 'green_frog'], // Same freshwater targets as insect
        speciesLuck: 2.2, // Better than insect (1.8) - 22% better effectiveness on freshwater fish
        drag: 1.0,
        catchWeight: 1.1, // Slightly better catch weight than insect
        catchSpeed: 1.05, // Slightly faster catch speed
        catchZone: 1.1, // Slightly larger catch zone
    },
    'clam': {
        id: 'bait_clam',
        name: 'Clam',
        modelId: 'models/npcs/clam.gltf',
        sprite: 'clam_sprite.png',
        rarity: 'common',
        class: 'Bottom Feeder',
        description: 'A clam shell. Attracts bottom-dwelling fish and shellfish eaters.',
        harvestChance: 0.6,
        minHarvestAmount: 1,
        maxHarvestAmount: 2,
        value: 8,
        baseLuck: 0.95,
        lootScore: 1,
        targetSpecies: ['flounder', 'grouper', 'catfish', 'stingray', 'sea_bass'], // Bottom feeders
        speciesLuck: 2.0, // Strong bonus for bottom feeders
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'shrimp': {
        id: 'bait_shrimp',
        name: 'Shrimp',
        modelId: 'models/npcs/shrimp.gltf',
        sprite: 'shrimp_sprite.png',
        rarity: 'common',
        class: 'Universal Premium',
        description: 'Premium universal bait. Works great on all fish and gives bonus loot chances!',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 2,
        value: 15,
        baseLuck: 1.35, // 25% fishing luck boost (reduced from 1.5 for better balance)
        lootScore: 1,
        targetSpecies: [], // Universal - works on everything
        speciesLuck: 1.0,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            { lootTableId: 'bait_fish_head', boostMultiplier: 3.0 }, // High chance for fish head in predator zones
            { lootTableId: 'bait_ghost_shrimp', boostMultiplier: 4.0 } // Good chance for ghost shrimp at Shadow Isle (night only) - increased from 1.5
        ]
    },
    'fish_head': {
        id: 'bait_fish_head',
        name: 'Fish Head',
        modelId: 'models/items/fish_head.gltf',
        sprite: 'fish_head_sprite.png',
        rarity: 'uncommon',
        class: 'Predator Specialist',
        description: 'Prime predator bait. Attracts sharks, marlins, and other large predators!',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 25,
        baseLuck: 0.5, // Good base effectiveness
        lootScore: 1,
        targetSpecies: ['hammerhead_shark', 'great_white_shark', 'koi_shark', 'dune_shark', 'ghost_shark', 'marlin', 'swordfish', 'anglerfish', 'glass_anglerfish', 'piranha', 'ghost_piranha', 'shipjack_tuna', 'salmon'], // All predators (except great_gold_shark - uses magnet)
        speciesLuck: 4.0, // 4x effectiveness on predators!
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'ray_tail': {
        id: 'bait_ray_tail',
        name: 'Ray Tail',
        modelId: 'models/items/ray_tail.gltf',
        sprite: 'fish_head_sprite.png',
        rarity: 'uncommon',
        class: 'Quality',
        description: 'Pieces of manta ray, often found on the ocean floor. Attracts predators.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 15,
        baseLuck: 1.20,
        lootScore: 1,
        targetSpecies: ['hammerhead_shark', 'moray_eel', 'kelp_eel', 'squid'],
        speciesLuck: 1.65,
        drag: 1.0,
        catchWeight: 1.00,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'squid_tentacle': {
        id: 'bait_squid_tentacle',
        name: 'Squid Tentacle',
        modelId: 'models/items/squid_tentacle.gltf',
        sprite: 'squid_tentacle.png',
        rarity: 'uncommon',
        class: 'Quality',
        description: 'Pieces of squid, often found near reefs or deeper waters. Attracts predators.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 15,
        baseLuck: 1.20,
        lootScore: 1,
        targetSpecies: ['anglerfish','pike', 'marlin', 'swordfish', 'kelp_eel', 'moray_eel'],
        speciesLuck: 1.65,
        drag: 1.1,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'glow_worm': {
        id: 'bait_glow_worm',
        name: 'Glow Worm',
        modelId: 'models/npcs/glow_worm.gltf',
        sprite: 'glow_worm_sprite.png',
        rarity: 'epic',
        class: 'Night Specialist',
        description: 'A rare, glowing worm found in Shadow Isle void soil. Only works at night but attracts rare creatures!',
        harvestChance: 0.1,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 50,
        baseLuck: 1.15, // 15% base fishing luck, but 4x at night via speciesLuck
        lootScore: 1,
        targetSpecies: [
            'anglerfish', 'glass_anglerfish', 'ghost_piranha', 'vampire_squid', 'deepfin_lurker',
            'grasping_horror', 'amethyst_gleam', 'midnight_scale', 'twilight_glider', 'catfish'
        ],
        speciesLuck: 4.0, // 4x luck at night (1.15 * 4.0 = 4.6x total)
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            { lootTableId: 'bait_ghost_shrimp', boostMultiplier: 4.0 } // High chance to get ghost shrimp (better than normal shrimp)
        ]
    },
    'ghost_shrimp': {
        id: 'bait_ghost_shrimp',
        name: 'Ghost Shrimp',
        modelId: 'models/items/glass_shrimp.gltf',
        sprite: 'glass_shrimp.png',
        rarity: 'epic',
        class: 'Ghost Specialist',
        description: 'A translucent, ghostly shrimp. Irresistible to ghost fish and shadow creatures!',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 75,
        baseLuck: 1.8, // Good base effectiveness
        lootScore: 1,
        targetSpecies: [
            'ghost_pufferfish', 'ghost_piranha', 'ghost_shark', 'twilight_glider', 'midnight_scale'
        ],
        speciesLuck: 5.0, // 5x effectiveness on ghost fish!
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'glass_shrimp': {
        id: 'bait_glass_shrimp',
        name: 'Glass Shrimp',
        modelId: 'models/items/glass_shrimp.gltf',
        sprite: 'glass_shrimp.png',
        rarity: 'epic',
        class: 'Rare',
        description: 'A shimmering, translucent piece of shrimp. Highly attractive to large, rare predators.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 50,
        baseLuck: 2.0, // 100% fishing luck boost (always catches something)
        lootScore: 1,
        targetSpecies: [
            'anglerfish', 'glass_anglerfish', 'ghost_piranha', 'ghost_pufferfish', 'ghost_shark'
        ],
        speciesLuck: 2.5,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            { lootTableId: 'bait_glass_tentacle', boostMultiplier: 2.0 }
        ]
    },
    'glass_tentacle': {
        id: 'bait_glass_tentacle',
        name: 'Glass Tentacle',
        modelId: 'models/items/glass_tentacle.gltf',
        sprite: 'glass_tentacle_sprite.png',
        rarity: 'legendary',
        class: 'Rare',
        description: 'A shimmering, translucent piece of squid. Highly attractive to large, rare fish.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 50,
        baseLuck: 1.05,
        lootScore: 1,
        targetSpecies: [
            'ghost_shark', 'deepfin_lurker', 'glass_anglerfish', 'sea_bass', 'swordfish', 'koi_shark', 'dune_shark'
        ],
        speciesLuck: 2.8,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: []
    },

    // ========================================
    // FUTURE BAIT POSSIBILITIES - NOT CURRENTLY IN PRODUCTION
    // ========================================
    // These baits are defined but not currently obtainable in-game.
    // They may be implemented in future iterations.
    
    'fish_bait': {
        id: 'bait_fish_bait',
        name: 'Fish Bait',
        modelId: 'models/items/fish_bait.gltf',
        sprite: 'fish_bait_sprite.png',
        rarity: 'common',
        class: 'Basic',
        description: 'Basic fish bait cut from fresh sardines. A reliable choice for general fishing.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 10,
        baseLuck: 1.1,
        lootScore: 1,
        targetSpecies: ['sardine', 'mackerel', 'sea_bass', 'blue_fish'],
        speciesLuck: 1.3,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'salty_bait': {
        id: 'bait_salty_bait',
        name: 'Salty Bait',
        modelId: 'models/items/salty_bait.gltf',
        sprite: 'salty_bait_sprite.png', // Will use same sprite as fish bait for now
        rarity: 'uncommon',
        class: 'Enhanced',
        description: 'Fish bait enhanced with rock salt. Attracts scavengers and bottom-feeders with its strong scent.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 25,
        baseLuck: 1.25, // + modifier
        lootScore: 1,
        targetSpecies: ['catfish', 'flounder', 'grouper', 'stingray', 'red_snapper', 'yellowtail_snapper'], // Scavengers, bottom-feeders
        speciesLuck: 1.6,
        drag: 1.0, // = (no change)
        catchWeight: 1.4, // ++ catch rate
        catchSpeed: 1.0,
        catchZone: 0.8, // – (reduced zone)
    },
    // NOTE: shiny_bait, wrapped_bait, sting_bait, mega_sting_bait are NOT CURRENTLY IN PRODUCTION
    // These baits are defined but not obtainable in-game. May be implemented in future iterations.
    
    'shiny_bait': {
        id: 'bait_shiny_bait',
        name: 'Shiny Bait',
        modelId: 'models/items/shiny_bait.gltf',
        sprite: 'shiny_bait_sprite.png', // Will use same sprite as fish bait for now
        rarity: 'rare',
        class: 'Enhanced',
        description: 'Fish bait enhanced with ancient magical materials. The shimmering surface attracts visual hunters from great distances.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 50,
        baseLuck: 1.4, // ++ modifier
        lootScore: 1,
        targetSpecies: ['shipjack_tuna', 'marlin', 'swordfish', 'pike', 'salmon'], // Visual hunters
        speciesLuck: 1.8,
        drag: 0.9, // – (reduced drag)
        catchWeight: 1.2, // + catch rate
        catchSpeed: 1.0,
        catchZone: 1.3, // ++ (increased zone)
    },
    'wrapped_bait': {
        id: 'bait_wrapped_bait',
        name: 'Wrapped Bait',
        modelId: 'models/items/wrapped_bait.gltf',
        sprite: 'sardine_roll.png', // Will use same sprite as fish bait for now
        rarity: 'uncommon',
        class: 'Enhanced',
        description: 'Fish bait wrapped in fresh seaweed. Appeals to herbivores and reef fish with its natural presentation.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 20,
        baseLuck: 1.2, // + modifier
        lootScore: 1,
        targetSpecies: ['garibaldi', 'orange_betta', 'red_betta', 'blue_betta', 'violet_betta', 'pufferfish'], // Herbivores, reef fish
        speciesLuck: 1.5,
        drag: 1.2, // + (increased drag)
        catchWeight: 1.15, // – catch rate
        catchSpeed: 1.0,
        catchZone: 1.0, // = (no change)
    },
    'sting_bait': {
        id: 'bait_sting_bait',
        name: 'Sting Bait',
        modelId: 'models/items/sting_bait.gltf',
        sprite: 'sting_bait_sprite.png',
        rarity: 'uncommon',
        class: 'Stunning',
        description: 'Fish bait enhanced with jellyfish sting. Has a chance to temporarily stun fish, making them easier to catch.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 30,
        baseLuck: 1.15, // + modifier
        lootScore: 1,
        targetSpecies: ['sardine', 'mackerel', 'sea_bass', 'blue_fish'], // Same as fish bait
        speciesLuck: 1.4, // Slightly better than fish bait due to stunning
        drag: 1.0,
        catchWeight: 1.2, // + catch rate due to stunning effect
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'mega_sting_bait': {
        id: 'bait_mega_sting_bait',
        name: 'Mega-Sting Bait',
        modelId: 'models/items/mega_sting_bait.gltf',
        sprite: 'mega_sting_bait_sprite.png',
        rarity: 'rare',
        class: 'Stunning',
        description: 'Fish bait enhanced with potent mega sting. Provides a powerful stunning effect that significantly improves catch rates.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 50,
        baseLuck: 1.25, // ++ modifier
        lootScore: 1,
        targetSpecies: ['sardine', 'mackerel', 'sea_bass', 'blue_fish'], // Same as fish bait
        speciesLuck: 1.6, // Much better than basic fish bait
        drag: 1.0,
        catchWeight: 1.4, // ++ catch rate due to powerful stunning
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'magnet': {
        id: 'bait_magnet',
        name: 'Magnet',
        modelId: 'models/items/magnet.gltf',
        sprite: 'magnet_sprite.png',
        rarity: 'rare',
        class: 'Treasure Hunter',
        description: 'A powerful electromagnet crafted with ancient materials. Terrible for catching fish, but attracts sunken treasure chests!',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 150,
        baseLuck: -5, // Negative fish luck - mathematically impossible to catch fish
        lootScore: 2.5, // 250% loot score - good for chest hunting
        targetSpecies: ['great_gold_shark'], // Special exception: attracts the Great Gold Shark
        speciesLuck: 4.0, // 4x effectiveness on Great Gold Shark (overcomes negative baseLuck)
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            // Note: These now target chest fish IDs since chests are fish
            { lootTableId: 'common_chest', boostMultiplier: 12.0 }, // Targets ~15-18% chance individually
            { lootTableId: 'runic_ore', boostMultiplier: 12.0 } // Targets ~15-18% chance individually
            // Rare chest and ancient vault removed - deprecated
        ]
    },
    'ancient_magnet': {
        id: 'ancient_magnet',
        name: 'Ancient Magnet',
        modelId: 'models/items/ancient_magnet.gltf',
        sprite: 'ancient_magnet_sprite.png',
        rarity: 'legendary',
        class: 'Quest Item',
        description: 'A mystical compass that resonates with the cartographer\'s hidden treasures. Glows brighter when near riddle locations. One-time use.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 0, // Quest item, no sell value
        baseLuck: 0,
        lootScore: 0,
        targetSpecies: [], // Quest specific
        speciesLuck: 1,
        drag: 1,
        catchWeight: 1,
        catchSpeed: 1.0,
        catchZone: 1,
        preferredLoot: [] // Quest specific
    },
    'iron_spinner': {
        id: 'bait_iron_spinner',
        name: 'Iron Spinner',
        modelId: 'models/items/magnet.gltf', // Using magnet model as placeholder - can be updated later
        sprite: 'iron_spinner_sprite.png',
        rarity: 'uncommon',
        class: 'Universal Premium',
        description: 'A precision-crafted spinner made from iron. Like premium shrimp bait, but with enhanced drag control and weight capacity.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 15,
        baseLuck: 1.5, // Same as shrimp
        lootScore: 1,
        targetSpecies: [], // Universal - works on everything
        speciesLuck: 1.0,
        drag: 1.05, // Half boost to drag (5% instead of 10%)
        catchWeight: 1.05, // Half boost to weight (5% instead of 10%)
        catchSpeed: 1.0,
        catchZone: 1.0,
        preferredLoot: [
            { lootTableId: 'bait_fish_head', boostMultiplier: 3.0 },
            { lootTableId: 'bait_ghost_shrimp', boostMultiplier: 4.0 }
        ]
    },
    'gold_spinner': {
        id: 'bait_gold_spinner',
        name: 'Gold Spinner',
        modelId: 'models/items/magnet.gltf', // Using magnet model as placeholder - can be updated later
        sprite: 'gold_spinner_sprite.png',
        rarity: 'rare',
        class: 'Universal Premium',
        description: 'A luxurious spinner forged from gold. Like premium shrimp bait, but with exceptional luck and improved catch zone.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 20,
        baseLuck: 1.6, // Half boost to luck (10% instead of 20% above shrimp)
        lootScore: 1,
        targetSpecies: [], // Universal - works on everything
        speciesLuck: 1.0,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.1, // Half boost to catch zone (10% instead of 20%)
        preferredLoot: [
            { lootTableId: 'bait_fish_head', boostMultiplier: 3.0 },
            { lootTableId: 'bait_ghost_shrimp', boostMultiplier: 4.0 }
        ]
    },
    'mithril_spinner': {
        id: 'bait_mithril_spinner',
        name: 'Mithril Spinner',
        modelId: 'models/items/magnet.gltf', // Using magnet model as placeholder - can be updated later
        sprite: 'mithril_spinner_sprite.png',
        rarity: 'epic',
        class: 'Universal Premium',
        description: 'An exquisite spinner crafted from legendary mithril. Like premium shrimp bait, but with enhanced catch zone and drag control.',
        harvestChance: 0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 25,
        baseLuck: 1.5, // Same as shrimp
        lootScore: 1,
        targetSpecies: [], // Universal - works on everything
        speciesLuck: 1.0,
        drag: 1.05, // Half boost to drag (5% instead of 10%)
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.05, // Half boost to catch zone (5% instead of 10%)
        preferredLoot: [
            { lootTableId: 'bait_fish_head', boostMultiplier: 3.0 },
            { lootTableId: 'bait_ghost_shrimp', boostMultiplier: 4.0 }
        ]
    },
    'scarab': {
        id: 'bait_scarab',
        name: 'Scarab',
        modelId: 'models/npcs/beetle.gltf',
        sprite: 'scarab_sprite.png',
        rarity: 'common',
        class: 'Dig Site Specialist',
        description: 'Common ancient bait for ancient fish.',
        harvestChance: 0.0, // Cannot be harvested normally - only from leaves
        minHarvestAmount: 1,
        maxHarvestAmount: 2,
        value: 5,
        baseLuck: 1.1,
        lootScore: 1,
        targetSpecies: ['lionfish', 'mahi_mahi'], // Add other dig site fish here
        speciesLuck: 1.5, // Strong boost for dig site fish
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.0,
    },
    'carved_lure': {
        id: 'bait_carved_lure',
        name: 'Carved Lure',
        modelId: 'models/bait/carved-lure.gltf',
        sprite: 'carved_lure_sprite.png',
        rarity: 'common',
        class: 'spinner',
        description: 'A driftwood lure carved with precision. Modest catch boost.',
        harvestChance: 0.0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 30,
        baseLuck: 1.1,
        lootScore: 1.05,
        targetSpecies: [],
        speciesLuck: 1,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.10, // +10% catch bar boost
        catchZone: 1.08,  // +8% catch zone
        preferredLoot: []
    },
    'ancient_lure': {
        id: 'bait_ancient_lure',
        name: 'Ancient Lure',
        modelId: 'models/bait/ancient-lure.gltf',
        sprite: 'ancient_lure_sprite.png',
        rarity: 'uncommon',
        class: 'spinner',
        description: 'An ancient driftwood lure imbued with old power. Better catch boost.',
        harvestChance: 0.0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 75,
        baseLuck: 1.2,
        lootScore: 1.1,
        targetSpecies: [],
        speciesLuck: 1,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.15, // +15% catch bar boost (better than carved)
        catchZone: 1.12,  // +12% catch zone (better than carved)
        preferredLoot: []
    },
    'gold_scarab': {
        id: 'bait_gold_scarab',
        name: 'Gold Scarab',
        modelId: 'models/npcs/beetle.gltf',
        sprite: 'gold_scarab_sprite.png',
        rarity: 'rare',
        class: 'bait',
        description: 'A scarab enhanced with gold essence. Attracts rarer fish around the island.',
        harvestChance: 0.0,
        minHarvestAmount: 1,
        maxHarvestAmount: 1,
        value: 100,
        baseLuck: 1.4,
        lootScore: 1.3,
        targetSpecies: [],
        speciesLuck: 2.2,
        drag: 1.0,
        catchWeight: 1.0,
        catchSpeed: 1.0,
        catchZone: 1.15,
        preferredLoot: []
    },
};

export type BaitType = 'worm' | 'insect' | 'shrimp' | 'clam' | 'fish_head' | 'glow_worm' | 'ghost_shrimp';

