import { Vector3, World } from "hytopia";

// Core fish data structure
export interface ItemData {
    id: string;
    name: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    minWeight: number;
    maxWeight: number;
    isBait: boolean;
    description: string;
    baseValue: number;
    modelData: {
        modelUri: string;
        sprite: string;
        baseScale: number;
        maxScale: number;
    };
    type?: string;
    hookStats?: {
        health: number;
        characteristic: string;
        boostValue: number;
        specialAbility: string;
        damage: number; // Durability loss per cast
    };
}

export const ITEM_CATALOG: ItemData[] = [
    {
        id: 'trash',
        name: 'Trash',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.5, 
        isBait: false,
        description: 'Some worthless junk.',
        baseValue: 0,
        modelData: {
            modelUri: 'models/items/trash.gltf',
            sprite: 'trash_sprite.png',
            baseScale: 1,
            maxScale: 1
        }
    },
    {
        id: 'old_can',
        name: 'Old Can',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'An old, rusted can.',
        baseValue: 1,
        modelData: {
            modelUri: 'models/items/old_can.gltf',
            sprite: 'old_can_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'feather',
        name: 'Feather',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A feather from a bird.',
        baseValue: 1,
        modelData: {
            modelUri: 'models/items/feather.gltf',
            sprite: 'feather_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'iron_nugget',
        name: 'Iron Nugget',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A small nugget of iron, smelted from scrap.',
        baseValue: 5,
        modelData: {
            modelUri: 'models/items/iron-nugget.gltf',
            sprite: 'iron_nugget_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'gold_nugget',
        name: 'Gold Nugget',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A small nugget of gold, smelted from scrap.',
        baseValue: 5,
        modelData: {
            modelUri: 'models/items/gold-nugget.gltf',
            sprite: 'gold_nugget_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'mithril_nugget',
        name: 'Mithril Nugget',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A small nugget of rare mithril, shimmering with magical energy.',
        baseValue: 10,
        modelData: {
            modelUri: 'models/items/mithril-nugget.gltf',
            sprite: 'mithril_nugget_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    // === ANCIENT MATERIALS ===
    {
        id: 'iron_ingot',
        name: 'Iron Ingot',
        rarity: 'uncommon',
        minWeight: 0.2,
        maxWeight: 0.2,
        isBait: false,
        description: 'Tarnished silver with mysterious runes. Used in crafting.',
        baseValue: 25,
        modelData: {
            modelUri: 'models/items/iron-ingot.gltf',
            sprite: 'iron_ingot_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'gold_ingot',
        name: 'Gold Ingot',
        rarity: 'rare',
        minWeight: 0.3,
        maxWeight: 0.3,
        isBait: false,
        description: 'Pure gold etched with ancient symbols. Highly valuable for crafting.',
        baseValue: 50,
        modelData: {
            modelUri: 'models/items/gold-ingot.gltf',
            sprite: 'gold_ingot_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'rune',
        name: 'Rune',
        rarity: 'epic',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'An ancient rune of power. Used for rod enchanting.',
        baseValue: 100,
        modelData: {
            modelUri: 'models/items/relic_fragment.gltf',
            sprite: 'rune_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    {
        id: 'mithril_ingot',
        name: 'Mithril Ingot',
        rarity: 'rare',
        minWeight: 0.4,
        maxWeight: 0.4,
        isBait: false,
        description: 'A rare ingot of legendary mithril, forged from ancient ores. Essential for advanced rod crafting.',
        baseValue: 150,
        modelData: {
            modelUri: 'models/items/mithril-ingot.gltf',
            sprite: 'mithril_ingot_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        }
    },
    // === CHEST ITEMS ===
    {
        id: 'common_chest',
        name: 'Treasure Chest',
        rarity: 'uncommon',
        minWeight: 150,
        maxWeight: 200,
        isBait: false,
        description: 'An old chest from a sunken vessel. Contains basic ancient materials.',
        baseValue: 100,
        modelData: {
            modelUri: 'models/items/common_chest.gltf',
            sprite: 'common_chest_sprite.png',
            baseScale: 1.2,
            maxScale: 1.2
        },
        type: 'item'
    },
    {
        id: 'rare_chest',
        name: 'Rare Chest',
        rarity: 'rare',
        minWeight: 250,
        maxWeight: 300,
        isBait: false,
        description: 'An ornate chest with intricate carvings. Contains valuable ancient materials.',
        baseValue: 300,
        modelData: {
            modelUri: 'models/items/rare_chest.gltf',
            sprite: 'rare_chest_sprite.png',
            baseScale: 1.4,
            maxScale: 1.4
        },
        type: 'item'
    },
    {
        id: 'legendary_chest',
        name: 'Legendary Chest',
        rarity: 'legendary',
        minWeight: 400,
        maxWeight: 500,
        isBait: false,
        description: 'A magnificent chest radiating ancient power. Contains the rarest treasures.',
        baseValue: 1000,
        modelData: {
            modelUri: 'models/items/legendary_chest.gltf',
            sprite: 'legendary_chest_sprite.png',
            baseScale: 1.6,
            maxScale: 1.6
        },
        type: 'item'
    },
    {
        id: 'bronze_hook',
        name: 'Bronze Hook',
        rarity: 'common',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A reliable fishing hook.',
        baseValue: 1,
        modelData: {
            modelUri: 'models/items/bronze_hook.gltf',
            sprite: 'bronze_hook_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        },
        type: 'hook',
        hookStats: {
            health: 100,
            characteristic: 'drag',
            boostValue: 1.1,
            specialAbility: '',
            damage: 3
        }
    },
    {
        id: 'iron_hook',
        name: 'Iron Hook',
        rarity: 'uncommon',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A basic iron fishing hook, crafted from iron nuggets.',
        baseValue: 15,
        modelData: {
            modelUri: 'models/items/iron_hook.gltf',
            sprite: 'iron_hook_sprite.png',
            baseScale: 0.8,
            maxScale: 0.8
        },
        type: 'hook',
        hookStats: {
            health: 100,
            characteristic: 'drag',
            boostValue: 1.25,
            specialAbility: '',
            damage: 2
        }
    },
    {
        id: 'gold_hook',
        name: 'Gold Hook',
        rarity: 'rare',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A shiny gold fishing hook, crafted from gold nuggets and an iron hook.',
        baseValue: 40,
        modelData: {
            modelUri: 'models/items/gold_hook.gltf',
            sprite: 'gold_hook.png',
            baseScale: 0.8,
            maxScale: 0.8
        },
        type: 'hook',
        hookStats: {
            health: 150,
            characteristic: 'drag',
            boostValue: 1.09,
            specialAbility: '',
            damage: 1
        }
    },
    {
        id: 'fly_hook',
        name: 'Fly Hook',
        rarity: 'rare',
        minWeight: 0.1,
        maxWeight: 0.1,
        isBait: false,
        description: 'A lightweight hook with feathers, perfect for fly fishing.',
        baseValue: 35,
        modelData: {
            modelUri: 'models/items/fly_hook.gltf',
            sprite: 'fly_hook.png',
            baseScale: 0.8,
            maxScale: 0.8
        },
        type: 'hook',
        hookStats: {
            health: 80,
            characteristic: 'catchSize',
            boostValue: 0.2,
            specialAbility: '',
            damage: 4
        }
    },
    // === RARE RODS ===
    {
        id: 'relic_rod',
        name: 'Relic Rod',
        rarity: 'epic',
        minWeight: 2.0,
        maxWeight: 2.0,
        isBait: false,
        description: 'An ancient fishing rod that resonates with runes. Fragile but excellent for treasure hunting.',
        baseValue: 5000,
        modelData: {
            modelUri: 'models/rods/relic-rod.gltf',
            sprite: 'relic_rod_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'rod'
    },
    {
        id: 'nimbus_rod',
        name: 'Nimbus Rod',
        rarity: 'uncommon',
        minWeight: 1.2,
        maxWeight: 1.2,
        isBait: false,
        description: 'Light as a cloud, swift as the wind. Fast fishing with reduced accuracy.',
        baseValue: 800,
        modelData: {
            modelUri: 'models/rods/nimbus-rod.gltf',
            sprite: 'nimbus_rod_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'rod'
    },
    {
        id: 'zhu_rod',
        name: 'Zhu Rod',
        rarity: 'uncommon',
        minWeight: 1.5,
        maxWeight: 1.5,
        isBait: false,
        description: 'Traditional bamboo rod that never breaks. Brings good fortune in fresh waters.',
        baseValue: 1200,
        modelData: {
            modelUri: 'models/rods/zhu-rod.gltf',
            sprite: 'zhu_rod_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'rod'
    },
    {
        id: 'leviathan_rod',
        name: 'Leviathan Rod',
        rarity: 'epic',
        minWeight: 3.0,
        maxWeight: 3.0,
        isBait: false,
        description: 'Forged to battle the greatest sea monsters. Designed for apex predators and massive catches.',
        baseValue: 8000,
        modelData: {
            modelUri: 'models/rods/leviathan-rod.gltf',
            sprite: 'leviathan_rod_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'rod'
    },
    {
        id: 'keystone_rod',
        name: 'Keystone Rod',
        rarity: 'legendary',
        minWeight: 2.5,
        maxWeight: 2.5,
        isBait: false,
        description: 'The first relic rod, assembled from three ancient shards. When you catch a Legendary fish, has a 30% chance to reroll for a Mythical fish instead.',
        baseValue: 15000,
        modelData: {
            modelUri: 'models/items/keystone_rod.gltf',
            sprite: 'keystone_rod_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'rod'
    },
    // === ORE ITEMS ===
    {
        id: 'runic_ore',
        name: 'Runic Ore',
        rarity: 'epic',
        minWeight: 250,
        maxWeight: 300,
        isBait: false,
        description: 'A mystical ore infused with ancient runic energy. Contains valuable materials when opened.',
        baseValue: 200,
        modelData: {
            modelUri: 'models/decor/runic_ore.gltf',
            sprite: 'runic_ore_sprite.png',
            baseScale: 1.0,
            maxScale: 1.0
        },
        type: 'item'
    }
];

