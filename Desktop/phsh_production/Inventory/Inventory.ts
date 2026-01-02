export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'rod' | 'bait' | 'fish' | 'boat' | 'accessory' |'item';

// Interface for generic loot items returned by loot managers
export interface LootItem {
    id: string;
    name: string;
    quantity: number;
    value: number;
}

export interface FishingStats {
    rarityBonus: number;
    sizeBonus: number;
    maxDistance: number;
    luck: number;
    health?: number;
    damage?: number;
}

export interface BoatStats {
    key: string;
    health: number;
    speed: number;
    turnSpeed: number;
}

export interface InventoryItem {
    id: string;             // Unique identifier for game logic
    modelId: string;  
    sprite: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    value: number;
    quantity: number;
    description?: string;   // Item description text
    specialAbility?: string | null; // Special ability name
    equipped?: boolean;
    metadata: {
        rodStats?: FishingStats & {
            style?: string;
            
            catchSpeed?: number;
            drag?: number;
            catchZone?: number;

            maxCatchWeight: number;
            
            lootScore?: number;
            specialAbility?: string;
            scale?: number;
            origin?: 'starter' | 'merchant' | 'crafted' | 'relic' | 'treasure';
            preferredLoot?: Array<{
                lootTableId: string;
                boostMultiplier: number;
            }>;
        };
        fishStats?: {
            size: number;
            weight: number;
            preliminaryWeight?: number; // Hidden weight used for rarity/value calculation
            displayWeight?: string | number; // What players see ("Not Weighed" or actual weight)
            species: string;
            location?: string;
            timestamp?: number;
            isBaitFish?: boolean;
            trophyStatus?: 'first' | 'second' | 'third' | 'trophy' | null; // Track leaderboard position
            trophyType?: 'species' | 'overall' | null; // Track if trophy is for species or overall leaderboard
            originalWeight?: number; // Weight before collector's weight correction
            hasBeenWeighed?: boolean; // Track if fish has been weighed by Collector
        };
        baitStats?: {
            baseLuck: number;
            class: string;
            targetSpecies?: string[];
            speciesLuck?: number;
            specialEffect?: string;
            description?: string;
            drag?: number;
            catchWeight?: number;
            lootScore?: number;
            catchSpeed?: number;
            catchZone?: number;
            preferredLoot?: Array<{
                lootTableId: string;
                boostMultiplier: number;
            }>;
        };
        lootStats?: {
            description?: string;
            isLoot?: boolean;
        };
        boatStats?: BoatStats;
        enchantments?: Array<{
            id: string;
            name: string;
            description: string;
            rarity: 'common' | 'uncommon' | 'rare' | 'epic';
        }>;
        contents?: Array<{
            itemId: string;
            count: number;
        }>; // For quest chests with predefined contents
    }
}

export interface PlayerInventory {
    items: InventoryItem[];
    maxSlots: number;
    equippedRod?: string;  // ID of equipped rod
    equippedBait?: string; // ID of equipped bait
    equippedFish?: string; // ID of equipped fish
    quickSlots: {[slotIndex: number]: string}; // Maps slot index (0-4) to item ID
}

