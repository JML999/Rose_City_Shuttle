// TerrainLootCatalog.ts
// Centralized catalog for terrain-specific loot (worms, clams, etc.)

export interface TerrainLootDefinition {
    id: string;
    name: string;
    type: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
    value: number;
    modelUri: string;
    sprite: string;
    description?: string;
}

export const TERRAIN_LOOT_CATALOG: TerrainLootDefinition[] = [
    {
        id: 'worm',
        name: 'Worm',
        type: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/worm.gltf',
        sprite: 'worm_sprite.png',
        description: 'A common earthworm found in dirt and grass.'
    },
    {
        id: 'clam',
        name: 'Clam',
        type: 'bait',
        rarity: 'common',
        value: 10,
        modelUri: 'models/npcs/clam.gltf',
        sprite: 'clam_sprite.png',
        description: 'A fresh clam found in sandy areas.'
    },
    {
        id: 'insect',
        name: 'Insect',
        type: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/insect.glb',
        sprite: 'insect_sprite.png',
        description: 'A small insect found in leaves and grass.'
    },
    {
        id: 'scarab',
        name: 'Scarab',
        type: 'bait',
        rarity: 'common',
        value: 5,
        modelUri: 'models/npcs/beetle.gltf',
        sprite: 'scarab_sprite.png',
        description: 'A scarab found in leaves around the dig site.'
    },
    {
        id: 'glow_worm',
        name: 'Glow Worm',
        type: 'bait',
        rarity: 'rare',
        value: 100,
        modelUri: 'models/npcs/glow_worm.gltf',
        sprite: 'glow_worm_sprite.png',
        description: 'A bioluminescent worm found in void soil.'
    },
    {
        id: 'rock_salt',
        name: 'Rock Salt',
        type: 'item',
        rarity: 'common',
        value: 15,
        modelUri: 'models/items/rock_salt.gltf',
        sprite: 'rock_salt_sprite.png',
        description: 'Crystalline salt deposits found in ghost dirt. Used for enhancing bait.'
    }
];

