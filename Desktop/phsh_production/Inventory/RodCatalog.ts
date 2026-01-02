import type { InventoryItem } from './Inventory';

export type RodType = 'basic_rod' | 'fly_rod' | 'deep_sea_rod';

export const FISHING_RODS: InventoryItem[] = [
    {
        id: 'beginner-rod',
        modelId: 'beginner-rod',
        sprite: 'beginner_rod_sprite.png',
        name: 'Beginner Rod',
        type: 'rod',
        rarity: 'common',
        value: 0,
        quantity: 1,
        description: 'A reliable fishing rod perfect for beginners.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0,
                sizeBonus: 0,
                maxDistance: 3,
                luck: 0.3,
                maxCatchWeight: 5,
                scale: 2.5,
                health: 100,
                damage: 0,
                catchSpeed: 0.75,
                drag: 0.95,
                catchZone: 1.25,
                lootScore: 0.75,
                origin: 'starter'
            }
        }
    },
    {
        id: 'oak_rod',
        modelId: 'oak-rod',
        sprite: 'oak_rod_sprite.png',
        name: 'Oak Rod',
        type: 'rod',
        rarity: 'common',
        value: 150,
        quantity: 1,
        description: 'A sturdy oak fishing rod that allows for bigger catches.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0.1,
                sizeBonus: 0.1,
                maxDistance: 8,
                luck: 1.1,
                maxCatchWeight: 150,
                scale: 2.5,
                health: 100,
                damage: 1,
                catchSpeed: 0.55,
                drag: 1,
                catchZone: 1,
                lootScore: 1,
                origin: 'merchant',
                preferredLoot: []
            }
        }
    },
    {
        id: 'light_rod',
        modelId: 'fishing-rod',
        sprite: 'oak_rod_sprite.png',
        name: 'Light Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 300,
        quantity: 1,
        description: 'A lightweight rod designed for optimal catch speed.',
        specialAbility: 'Swift Cast',
        metadata: {
            rodStats: {
                rarityBonus: 0,
                sizeBonus: 0,
                maxDistance: 10,
                luck: 1,
                maxCatchWeight: 75,
                scale: 0.66,
                health: 100,
                damage: 1,
                catchSpeed: 2,
                drag: 0.90,
                catchZone: 0.75,
                lootScore: 0.85,
            }
        }
    },
    {
        id: 'fly_rod',
        modelId: 'fishing-rod',
        sprite: 'oak_rod_sprite.png',
        name: 'Fly Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 300,
        quantity: 1,
        description: 'Common rod for freshwater fishing.',
        specialAbility: 'Freshwater Specialist',
        metadata: {
            rodStats: {
                rarityBonus: 0,
                sizeBonus: 0,
                maxDistance: 3,
                luck: 0.3,
                maxCatchWeight: 10,
                scale: 2.5,
                health: 100,
                damage: 0,
                catchSpeed: 0.75,
                drag: 0.95,
                catchZone: 1.25,
                lootScore: 0.75,
                origin: 'starter'
            }
        }
    },
    {
        id: 'deepcaster_rod',
        modelId: 'deepcaster-rod',
        sprite: 'deepcaster_rod_sprite.png',
        name: 'Deepcaster Rod',
        type: 'rod',
        rarity: 'rare',
        value: 650,
        quantity: 1,
        description: 'Long casting for reaching far away fish. Useful for reaching hotspots.',
        specialAbility: 'Deep Cast',
        metadata: {
            rodStats: {
                rarityBonus: 0,
                sizeBonus: 0,
                maxDistance: 15,
                luck: 1.15,
                maxCatchWeight: 225,
                scale: 0.9,
                health: 100,
                damage: 1,
                catchSpeed: 0.5,
                drag: 1.0,
                catchZone: 0.90,
                lootScore: 0.85,
            }
        }
    },
    {
        id: 'explorer_rod',
        modelId: 'explorer-rod',
        sprite: 'explorer_rod_sprite.png',
        name: 'Loot Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 2000,
        quantity: 1,
        description: 'Specialized archaeological equipment. Not ideal for fishing, but excellent for detecting underwater treasures and artifacts.',
        specialAbility: 'Treasure Hunter',
        metadata: {
            rodStats: {
                rarityBonus: 0.05,
                sizeBonus: 0.05,
                maxDistance: 12,
                luck: 0.2,
                maxCatchWeight: 250,
                scale: 2.5,
                health: 120,
                damage: 2,
                catchSpeed: 0.5,
                drag: 0.7,
                catchZone: 0.6,
                lootScore: 1.2,
                origin: 'treasure',
                preferredLoot: [
                    { lootTableId: 'old_can', boostMultiplier: 2.0 },
                ]
            }
        }
    },
    {
        id: 'loot_rod',
        modelId: 'loot-rod',
        sprite: 'loot_rod_sprite.png',
        name: 'Loot Rod',
        type: 'rod',
        rarity: 'rare',
        value: 2000,
        quantity: 1,
        description: 'An advanced treasure hunting rod with enhanced detection capabilities. Finds valuable items with remarkable efficiency.',
        specialAbility: 'Loot Detector',
        metadata: {
            rodStats: {
                rarityBonus: 0.05,
                sizeBonus: 0.05,
                maxDistance: 12,
                luck: 0.2,
                maxCatchWeight: 2500,
                scale: 2.0,
                health: 100,
                damage: 10,
                catchSpeed: 0.5,
                drag: 0.7,
                catchZone: 0.6,
                lootScore: 1.5,
                origin: 'treasure',
                preferredLoot: [
                    { lootTableId: 'old_can', boostMultiplier: 2.0 },
                    { lootTableId: 'trash', boostMultiplier: 2 },
                ]
            }
        }
    },
    {
        id: 'carbon_fiber_rod',
        modelId: 'carbon-rod',
        sprite: 'carbon_fiber_rod_sprite.png',
        name: 'Carbon Fiber Rod',
        type: 'rod',
        rarity: 'rare',
        value: 750,
        quantity: 1,
        description: 'High-tech carbon fiber construction provides exceptional strength and sensitivity. A premium choice for serious anglers.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0.2,
                sizeBonus: 0.2,
                maxDistance: 10,
                luck: 1.5,
                maxCatchWeight: 300,
                scale: 2.5,
                health: 100,
                damage: 5,
                catchSpeed: 1,
                drag: 1,
                catchZone: 1,
                lootScore: 0.90,
            }
        }
    },
    // === CRAFTED RODS ===
    {
        id: 'iron_rod',
        modelId: 'iron-rod',
        sprite: 'iron_rod_sprite.png',
        name: 'Iron Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 1500,
        quantity: 1,
        description: 'A reliable workhorse rod with exceptional weight capacity.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0.1,
                sizeBonus: 0.1,
                maxDistance: 10,
                luck: 1.20, // Moderate luck - buffed from 1.25
                maxCatchWeight: 1250, // High catch weight - iron's strength
                scale: 1.00,
                health: 150, // High durability - reliable workhorse
                damage: 1,
                catchSpeed: 1.0,
                drag: 1.0, // Moderate drag - buffed from 0.85
                catchZone: 1.0, // Moderate catch zone with slight boost
                lootScore: 1.0,
                origin: 'crafted', // Player-crafted at Toolmaster
                preferredLoot: []
            }
        }
    },
    {
        id: 'gold_rod',
        modelId: 'gold_rod',
        sprite: 'gold_rod_sprite.png',
        name: 'Gold Rod',
        type: 'rod',
        rarity: 'rare',
        value: 3000,
        quantity: 1,
        description: 'Brings extraordinary fortune, but lacks the strength for the heaviest catches.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0.2,
                sizeBonus: 0.2,
                maxDistance: 11,
                luck: 1.30, // Better luck - gold's strength
                maxCatchWeight: 750, // Lower weight than iron (1250) - maintains same relationship
                scale: 1.00,
                health: 100, // Lower health - fragile
                damage: 2, // Takes more damage
                catchSpeed: 1.0,
                drag: 1.0, // Average drag
                catchZone: 1.05, // Slightly improved catch zone
                lootScore: 1.4, // Good loot score
                preferredLoot: []
            }
        }
    },
    {
        id: 'ivory_rod',
        modelId: 'ivory_rod',
        sprite: 'ivory_rod_sprite.png',
        name: 'Ivory Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 500,
        quantity: 1,
        description: 'A rod crafted from ivory.',
        specialAbility: null,
        metadata: {
            rodStats: {
                rarityBonus: 0.1,
                sizeBonus: 0.1,
                maxDistance: 9,
                luck: 1.2,
                maxCatchWeight: 200,
                scale: 0.9, // Match deepcaster rod scale
                health: 100,
                damage: 1,
                catchSpeed: 0.8,
                drag: 1.0,
                catchZone: 1.1,
                lootScore: 1.2
            }
        }
    },
    // === REMOVED FROM PROGRESSION ===
    // Mithril Rod removed - players get Zephyr before this, making it obsolete
    // {
    //     id: 'mithril_rod',
    //     modelId: 'mithril-rod',
    //     sprite: 'mithril_rod_sprite.png',
    //     name: 'Mithril Rod',
    //     type: 'rod',
    //     rarity: 'epic',
    //     value: 5000,
    //     quantity: 1,
    //     description: 'Exceptional control and precision, but not as strong as iron or as lucky as gold.',
    //     specialAbility: 'Precision Control',
    //     metadata: {
    //         rodStats: {
    //             rarityBonus: 0.25,
    //             sizeBonus: 0.25,
    //             maxDistance: 13,
    //             luck: 1.3, // Moderate luck
    //             maxCatchWeight: 300, // Moderate catch weight
    //             scale: 1.0,
    //             health: 130, // Good health - balanced
    //             damage: 1, // Normal damage
    //             catchSpeed: 1.2,
    //             drag: 1.35, // Better drag - mithril's strength
    //             catchZone: 1.35, // Better catch zone - mithril's strength
    //             lootScore: 1.3,
    //             preferredLoot: []
    //         }
    //     }
    // },
    // === RARE CHEST RODS ===
    {
        id: 'relic_rod',
        modelId: 'relic-rod',
        sprite: 'relic_rod_sprite.png',
        name: 'Relic Rod',
        type: 'rod',
        rarity: 'epic',
        value: 5000,
        quantity: 1,
        description: 'An ancient fishing rod that resonates with runes. Fragile but excellent for treasure hunting.',
        specialAbility: 'Relic Resonance',
        metadata: {
            rodStats: {
                rarityBonus: 0.15,
                sizeBonus: 0.15,
                maxDistance: 10,
                luck: 1.4,
                maxCatchWeight: 300,
                scale: 2.5,
                health: 80, // Fragile
                damage: 3,
                catchSpeed: 1.0,
                drag: 1.0,
                catchZone: 1.0,
                lootScore: 1.8, // High loot score for chests
                preferredLoot: [
                ]
            }
        }
    },
    {
        id: 'nimbus_rod',
        modelId: 'nimbus-rod',
        sprite: 'nimbus_rod_sprite.png',
        name: 'Nimbus Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 800,
        quantity: 1,
        description: 'Light as a cloud with incredible casting speed. Perfect for quick strikes but requires precise timing.',
        specialAbility: 'Wind Walker',
        metadata: {
            rodStats: {
                rarityBonus: 0.05,
                sizeBonus: 0.05,
                maxDistance: 12,
                luck: 1.0,
                maxCatchWeight: 120,
                scale: 2.5,
                health: 90,
                damage: 1,
                catchSpeed: 2.0, // Very fast
                drag: 0.8, // Light drag
                catchZone: 0.8, // Smaller catch zone (trade-off for speed)
                lootScore: 0.9,
                preferredLoot: []
            }
        }
    },
    {
        id: 'zhu_rod',
        modelId: 'zhu-rod',
        sprite: 'zhu_rod_sprite.png',
        name: 'Zhu Rod',
        type: 'rod',
        rarity: 'uncommon',
        value: 1200,
        quantity: 1,
        description: 'Traditional bamboo rod blessed by ancient spirits. Incredibly durable and brings exceptional luck in freshwater.',
        specialAbility: 'Spirit Blessing',
        metadata: {
            rodStats: {
                rarityBonus: 0.1,
                sizeBonus: 0.1,
                maxDistance: 8,
                luck: 1.8, // High luck in freshwater zones
                maxCatchWeight: 200,
                scale: 2.5,
                health: 150, // Very durable like bamboo
                damage: 0, // Never takes damage
                catchSpeed: 1.1,
                drag: 1.0,
                catchZone: 1.1,
                lootScore: 1.1,
                preferredLoot: [], // Special freshwater bonuses handled by zone logic
            }
        }
    },
    {
        id: 'leviathan_rod',
        modelId: 'leviathan-rod',
        sprite: 'leviathan_rod_sprite.png',
        name: 'Leviathan Rod',
        type: 'rod',
        rarity: 'epic',
        value: 8000,
        quantity: 1,
        description: 'Forged to battle the largest sea creatures. Built for power and endurance when facing massive predators.',
        specialAbility: 'Titan Slayer',
        metadata: {
            rodStats: {
                rarityBonus: 0.25,
                sizeBonus: 0.3, // Bigger fish
                maxDistance: 15,
                luck: 1.6,
                maxCatchWeight: 750, // Can catch massive predators
                scale: 2.5,
                health: 120,
                damage: 4,
                catchSpeed: 0.8, // Slower for big fish
                drag: 1.4, // Strong drag for big fights
                catchZone: 1.2,
                lootScore: 1.3,
                preferredLoot: [] // Predator species bonuses handled by fishing logic
            }
        }
    },
    {
        id: 'keystone_rod',
        modelId: 'keystone_rod',
        sprite: 'keystone_rod_sprite.png',
        name: 'Keystone Rod',
        type: 'rod',
        rarity: 'legendary',
        value: 15000,
        quantity: 1,
        description: 'The first relic rod, assembled from three ancient shards. When you catch a Legendary fish, has a 30% chance to reroll for a Mythical fish instead.',
        specialAbility: 'Relic Resonance',
        metadata: {
            rodStats: {
                rarityBonus: 0.3, // 30% chance to reroll for next tier fish
                sizeBonus: 0.25,
                maxDistance: 15,
                luck: 1.5, // High luck - adjusted from 2.0
                maxCatchWeight: 2000, // Can catch everything
                scale: 0.65,
                health: 150,
                damage: 2, // Low damage for durability
                catchSpeed: 1.1, // Good speed - adjusted from 1.3
                drag: 1.25, // Strong drag - adjusted from 1.2
                catchZone: 1.25, // Generous catch zone - adjusted from 1.3
                lootScore: 1.5, // Excellent loot score
                preferredLoot: []
            }
        }
    },
];

