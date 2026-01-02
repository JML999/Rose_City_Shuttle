import { BEGINNER_CRATE_SPAWN_LOCATIONS, DIRT_CRATE_SPAWN_LOCATIONS } from './CrateCoordinates';
import { BAIT_CATALOG } from './BaitCatalog';

export interface CrateDefinition {
    id: string;
    name: string;
    modelUri: string;
    blockTextureUri: string;
    health: number; // Damage taken before crate breaks
    spawnLocations: typeof BEGINNER_CRATE_SPAWN_LOCATIONS;  // Reference entire spawn set
    lootTable: {
        type: string;
        chance: number;
        minAmount: number;
        maxAmount: number;
    }[];
}

export const CRATE_CATALOG: { [key: string]: CrateDefinition } = {
    'beginner_crate': {
        id: 'beginner_crate',
        name: 'Beginner Bait Crate',
        modelUri: 'models/items/crate.gltf',
        blockTextureUri: 'blocks/barrel.png',
        health: 3,
        spawnLocations: BEGINNER_CRATE_SPAWN_LOCATIONS,
        lootTable: [
            {
                type: 'shrimp',
                chance: 0.7,
                minAmount: 1,
                maxAmount: 2
            }
        ]
    },
    'dirt_block': {
        id: 'dirt_block',
        name: 'Dirt Block',
        blockTextureUri: 'blocks/dirt_barrel.png',
        modelUri: 'models/items/dirt_crate.gltf',
        health: 3,
        spawnLocations: DIRT_CRATE_SPAWN_LOCATIONS,
        lootTable: [
            {
                type: 'worm',
                chance: 0.7,
                minAmount: 1,
                maxAmount: 3
            },
        ]
    },

    'sunken_crate': {
        id: 'sunken_crate',
        name: 'Sunken Crate',
        modelUri: 'models/items/sunken_crate.gltf',
        blockTextureUri: 'blocks/barrel.png',
        health: 3,
        spawnLocations: [],
        lootTable: [
            {
                type: 'worm',
                chance: 0.7,
                minAmount: 1,
                maxAmount: 3
            },
        ]
    },
    
};