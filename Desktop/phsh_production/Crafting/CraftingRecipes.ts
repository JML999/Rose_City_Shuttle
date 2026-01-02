import type { ItemType, ItemRarity, InventoryItem } from '../Inventory/Inventory';
import { BAIT_CATALOG, type BaitDefinition } from '../Bait/BaitCatalog';

export interface CraftingRecipe {
    inputs: string[];
    output: InventoryItem;
}
  
// Helper function to convert BaitDefinition to InventoryItem
function baitDefToInventoryItem(baitDef: BaitDefinition, quantity: number = 1): InventoryItem {
  if (!baitDef) {
    console.error('Attempted to convert undefined bait definition to inventory item');
    throw new Error('Invalid bait definition');
  }
  
  return {
    id: baitDef.id,
    name: baitDef.name,
    quantity: quantity,
    value: baitDef.value,
    sprite: baitDef.sprite,
    modelId: baitDef.modelId,
    type: 'bait' as ItemType,
    rarity: baitDef.rarity,
    metadata: {
      baitStats: {
        baseLuck: baitDef.baseLuck,
        targetSpecies: baitDef.targetSpecies,
        speciesLuck: baitDef.speciesLuck,
        class: baitDef.class,
        description: baitDef.description,
        drag: baitDef.drag,
        catchWeight: baitDef.catchWeight,
        catchSpeed: baitDef.catchSpeed,
        catchZone: baitDef.catchZone,
        lootScore: baitDef.lootScore,
        preferredLoot: baitDef.preferredLoot
      }
    }
  };
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // 4 Rusted Cans -> 1 Iron Nugget
  {
    inputs: ['old_can', 'old_can'],
    output: {
      id: 'iron_nugget',
      name: 'Iron Nugget',
      quantity: 1,
      value: 50,
      sprite: 'iron_nugget_sprite.png',
      modelId: 'models/items/iron-nugget.gltf',
      type: 'item',
      rarity: 'common',
      metadata: {}
    }
  },
  // === NUGGET TO INGOT CONVERSION ===
  // 4 Iron Nuggets -> 1 Iron Ingot
  {
    inputs: ['iron_nugget', 'iron_nugget', 'iron_nugget', 'iron_nugget'],
    output: {
      id: 'iron_ingot',
      name: 'Iron Ingot',
      quantity: 1,
      value: 75,
      sprite: 'iron_ingot_sprite.png',
      modelId: 'models/items/iron-ingot.gltf',
      type: 'item',
      rarity: 'uncommon',
      metadata: {}
    }
  },
  // 4 Gold Nuggets -> 1 Gold Ingot
  {
    inputs: ['gold_nugget', 'gold_nugget', 'gold_nugget', 'gold_nugget'],
    output: {
      id: 'gold_ingot',
      name: 'Gold Ingot',
      quantity: 1,
      value: 100,
      sprite: 'gold_ingot_sprite.png',
      modelId: 'models/items/gold-ingot.gltf',
      type: 'item',
      rarity: 'rare',
      metadata: {}
    }
  },
  // 4 Mithril Nuggets -> 1 Mithril Ingot
  {
    inputs: ['mithril_nugget', 'mithril_nugget', 'mithril_nugget', 'mithril_nugget'],
    output: {
      id: 'mithril_ingot',
      name: 'Mithril Ingot',
      quantity: 1,
      value: 250,
      sprite: 'mithril_ingot_sprite.png',
      modelId: 'models/items/mithril-ingot.gltf',
      type: 'item',
      rarity: 'rare',
      metadata: {}
    }
  },
  // 1 Iron Ingot + 1 Mithril Nugget -> 1 Magnet
  {
    inputs: ['iron_ingot', 'mithril_nugget'],
    output: baitDefToInventoryItem(BAIT_CATALOG['magnet'], 1)
  },
  // 1 Iron Ingot -> 3 Iron Spinners
  {
    inputs: ['iron_ingot'],
    output: baitDefToInventoryItem(BAIT_CATALOG['iron_spinner'], 3)
  },
  // 1 Gold Ingot -> 3 Gold Spinners
  {
    inputs: ['gold_ingot'],
    output: baitDefToInventoryItem(BAIT_CATALOG['gold_spinner'], 3)
  },
  // 1 Mithril Ingot -> 3 Mithril Spinners
  {
    inputs: ['mithril_ingot'],
    output: baitDefToInventoryItem(BAIT_CATALOG['mithril_spinner'], 3)
  },
  // 1 Driftwood + 1 Iron Nugget -> 3x Carved Lure
  {
    inputs: ['driftwood', 'iron_nugget'],
    output: baitDefToInventoryItem(BAIT_CATALOG['carved_lure'], 3)
  },
  // 1 Ancient Driftwood + 1 Iron Nugget -> 3x Ancient Lure
  {
    inputs: ['ancient_driftwood', 'iron_nugget'],
    output: baitDefToInventoryItem(BAIT_CATALOG['ancient_lure'], 3)
  },
  // 1 Gold Nugget + 1 Scarab -> 1x Gold Scarab
  {
    inputs: ['gold_nugget', 'scarab'],
    output: baitDefToInventoryItem(BAIT_CATALOG['gold_scarab'], 1)
  }
];

// Remove console logs that would error due to removed bait definitions
// console.log("Bug Roll bait definition:", BAIT_CATALOG['bug_roll']);
// console.log("Bug Roll sprite:", BAIT_CATALOG['bug_roll'].sprite);

