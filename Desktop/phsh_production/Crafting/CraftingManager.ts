import { Player } from 'hytopia';
import { InventoryManager } from '../Inventory/InventoryManager';
import type { CraftingRecipe } from './CraftingRecipes';
import { CRAFTING_RECIPES } from './CraftingRecipes';
import type { InventoryItem } from '../Inventory/Inventory';
import { ItemFactory } from '../Inventory/ItemFactory';
import { CurrencyManager } from '../CurrencyManager';

interface Inventory {
  items: InventoryItem[];
}

export class CraftingManager {
  private inventoryManager: InventoryManager;
  private currencyManager?: CurrencyManager;

  constructor(inventoryManager: InventoryManager, currencyManager?: CurrencyManager) {
    this.inventoryManager = inventoryManager;
    this.currencyManager = currencyManager;
  }

  public handleCraftItem(player: Player, inputIds: string[], skipCoinDeduction: boolean = false): InventoryItem | null {
    console.log('[Server] Processing craft with items:', inputIds);
    
    // Filter out null inputs
    const validInputIds = inputIds.filter(id => id !== null);
    
    // Find matching recipe using the full item IDs
    const matchingRecipe = this.findMatchingRecipeByIds(validInputIds);
    
    if (matchingRecipe) {
      console.log('[Server] Found matching recipe:', matchingRecipe);
      
      // Check crafting cost (use output item's value)
      const craftingCost = matchingRecipe.output.value || 0;
      
      if (craftingCost > 0 && !skipCoinDeduction) {
        // Get player's current coins (you'll need to import CurrencyManager or pass it to constructor)
        const playerCoins = this.currencyManager?.getCoins(player) || 0;
        
        if (playerCoins < craftingCost) {
          console.log(`[Server] Player has insufficient coins: ${playerCoins}/${craftingCost}`);
          
          player.ui.sendData({
            type: "craftingMessage",
            messageType: "error",
            message: `Insufficient coins! Need ${craftingCost} coins to craft.`
          });
          
          return null;
        }
        
        // Deduct crafting cost
        if (this.currencyManager) {
          const success = this.currencyManager.removeCoins(player, craftingCost);
          if (!success) {
            player.ui.sendData({
              type: "craftingMessage", 
              messageType: "error",
              message: "Failed to deduct crafting cost."
            });
            return null;
          }
          console.log(`[Server] Deducted ${craftingCost} coins for crafting`);
        }
      }
      
      // Check if this is a bait item and if the player is already at the cap
      const BAIT_ITEM_CAP = 20;
      if (matchingRecipe.output.type === 'bait') {
        // Check if player already has this bait type and is at the cap
        const inventory = this.inventoryManager.getInventory(player);
        if (inventory) {
          const existingBait = inventory.items.find(item => 
            item.id === matchingRecipe.output.id && item.type === 'bait'
          );
          
          if (existingBait && existingBait.quantity >= BAIT_ITEM_CAP) {
            console.log(`[Server] Player already ha ${existingBait.quantity}/${BAIT_ITEM_CAP} of this bait type. Not consuming resources.`);
            
            // Send bait limit message to player
            player.ui.sendData({
              type: "craftingMessage",
              messageType: "error",
              message: "Bait limit reached (max 20)!"
            });
            
            return null;
          }
        }
      }
      
      // If we get here, we're below the bait cap or it's not a bait item
      // Remove input items
      validInputIds.forEach(id => {
        const removed = this.inventoryManager.removeItem(player, id, 1);
        console.log(`[Server] Removed item ${id}: ${removed}`);
      });
      
      // Add output item
      const craftedItem = ItemFactory.createCraftedItem(matchingRecipe);
      console.log('[Server] Adding output item:', craftedItem);
      const added = this.inventoryManager.addItem(player, craftedItem);
      console.log(`[Server] Added output item: ${added}`);
      
      // Send success message with cost info
      const costMessage = craftingCost > 0 ? ` (Cost: ${craftingCost} coins)` : '';
      player.ui.sendData({
        type: "craftingMessage",
        messageType: "success",
        message: `Successfully crafted ${matchingRecipe.output.name}!${costMessage}`
      });
      
      // Do not send craftingResult here; let GamePlayerEntity handle it
      return craftedItem;
    }
    
    console.log('[Server] No matching recipe found');
    return null;
  }

  private findMatchingRecipeByIds(inputIds: string[]): CraftingRecipe | null {
    console.log('[Server] Finding recipe for inputs:', inputIds);
    
    for (const recipe of CRAFTING_RECIPES) {
      console.log('[Server] Checking recipe with inputs:', recipe.inputs);
      
      // Check if the inputs match the recipe
      if (this.areInputsEquivalent(inputIds, recipe.inputs)) {
        return recipe;
      }
    }
    
    return null;
  }

  private areInputsEquivalent(actualInputs: string[], recipeInputs: string[]): boolean {
    if (actualInputs.length !== recipeInputs.length) return false;
    
    // Normalize the inputs for comparison
    const normalizedActual = actualInputs.map(id => this.normalizeItemId(id));
    const normalizedRecipe = recipeInputs.map(id => this.normalizeItemId(id));
    
    
    // Count occurrences of each normalized item
    const countActual: Record<string, number> = {};
    const countRecipe: Record<string, number> = {};
    
    normalizedActual.forEach(item => {
      countActual[item] = (countActual[item] || 0) + 1;
    });
    
    normalizedRecipe.forEach(item => {
      countRecipe[item] = (countRecipe[item] || 0) + 1;
    });
    // Check if counts match for all items
    for (const item in countActual) {
      if (countActual[item] !== countRecipe[item]) {
        return false;
      }
    }
    for (const item in countRecipe) {
      if (countRecipe[item] !== (countActual[item] || 0)) {
        return false;
      }
    }
    console.log('[Server] Recipe match found!');
    return true;
  }

  private normalizeItemId(id: string): string {
    // Convert to lowercase
    let normalized = id.toLowerCase();
    
    // Handle bait items with specific types
    if (normalized.startsWith('bait_')) {
        // Extract the actual bait type instead of just removing the prefix
        normalized = normalized.substring(5); // e.g., 'bait_raw_shrimp' -> 'raw_shrimp'
    }
    
    // Handle fish IDs with timestamps (e.g., sardine_1741482689998_633)
    const fishMatch = normalized.match(/^([a-z_]+)_\d+_\d+$/);
    if (fishMatch) {
        normalized = fishMatch[1]; // Extract just the fish type (e.g., "sardine")
    }
    
    console.log(`[Server] Normalized ${id} to ${normalized}`);
    return normalized;
  }

  public canCraftRecipe(recipe: CraftingRecipe, inventory: Inventory): boolean {
    for (const ingredient of recipe.inputs) {
      const requiredAmount = 1;
      
      // Check for any item type that matches the ingredient ID
      const inventoryItem = inventory.items.find((item: InventoryItem) => 
        item.id === ingredient && (item.type === 'bait' || item.type === 'fish' || item.type === 'item')
      );
      
      // If not found and this is a bait item, check for bait fish
      if (!inventoryItem) {
        // Look for bait fish that could be used instead
        const baitFish = inventory.items.find((item: InventoryItem) => 
          item.type === 'fish' && 
          item.metadata.fishStats?.isBaitFish === true
        );
        
        if (baitFish && baitFish.quantity >= requiredAmount) {
          continue; // We found a suitable bait fish
        }
      }
      
      // If we get here, either we need a regular item or we didn't find a suitable bait fish
      if (!inventoryItem || inventoryItem.quantity < requiredAmount) {
        return false;
      }
    }
    
    return true;
  }

  public craftRecipe(recipe: CraftingRecipe, inventory: Inventory): boolean {
    if (!this.canCraftRecipe(recipe, inventory)) {
      return false;
    }

    // Remove input items
    for (const ingredient of recipe.inputs) {
      const requiredAmount = 1;
      
      // Try to find the regular item first
      let inventoryItem = inventory.items.find((item: InventoryItem) => 
        this.normalizeItemId(item.id) === ingredient
      );
      
      // If not found, check for bait fish
      if (!inventoryItem) {
        const baitFish = inventory.items.find((item: InventoryItem) => 
          item.type === 'fish' && 
          item.metadata.fishStats?.isBaitFish === true &&
          this.normalizeItemId(item.id) === ingredient
        );
        
        if (baitFish) {
          inventoryItem = baitFish;
        }
      }
      
      // Remove the required amount
      if (inventoryItem) {
        // Use inventoryManager method to remove items instead of direct manipulation
        if (inventoryItem.quantity <= requiredAmount) {
          // Remove entire item
          this.inventoryManager.removeItem(player, inventoryItem.id, inventoryItem.quantity);
        } else {
          // Remove partial quantity
          this.inventoryManager.removeItem(player, inventoryItem.id, requiredAmount);
        }
      }
    }

    // Create the crafted item with all necessary properties
    const craftedItem = ItemFactory.createCraftedItem(recipe);
    /*
    const craftedItem: InventoryItem = {
      id: recipe.output.id,
      name: recipe.output.name,
      type: recipe.output.type,
      rarity: recipe.output.rarity,
      quantity: recipe.output.quantity || 1,
      value: recipe.output.value || 0,
      
      // Include sprite if available
      sprite: recipe.output.sprite || `${recipe.output.id.replace('bait_', '')}.png`,
      
      // Add modelId (required property)
      modelId: recipe.output.modelId || `models/items/${recipe.output.id}.gltf`,
      
      // Ensure metadata is properly copied without adding invalid properties
      metadata: {
        ...recipe.output.metadata
      }
    };
    */

    // For bait items, ensure baitStats are properly set
    if (craftedItem.type === 'bait' && recipe.output.metadata?.baitStats) {
      console.log(`[CRAFTING] Recipe output baitStats: ${JSON.stringify(recipe.output.metadata.baitStats, null, 2)}`);
      console.log(`[CRAFTING] Recipe output description: ${recipe.output.metadata.baitStats.description || 'NO DESCRIPTION IN RECIPE'}`);
      craftedItem.metadata.baitStats = {
        ...recipe.output.metadata.baitStats,
        // Add description to baitStats if it doesn't exist
        description: recipe.output.metadata.baitStats.description || `A crafted ${recipe.output.name} bait`
      };
    }

    // Check if player already has this item
    const existingItem = inventory.items.find(item => 
      item.id === craftedItem.id && item.type === craftedItem.type
    );

    const BAIT_ITEM_CAP = 20; // Hard cap for bait items

    if (existingItem) {
      // Use inventoryManager.addItem() which handles stacking automatically
      // This ensures proper state management and auto-save
      const craftedQuantity = craftedItem.quantity || 1;
      
      // Apply bait quantity cap if this is a bait item
      if (craftedItem.type === 'bait') {
        const currentQuantity = existingItem.quantity || 0;
        const newQuantity = Math.min(currentQuantity + craftedQuantity, BAIT_ITEM_CAP);
        const quantityToAdd = newQuantity - currentQuantity;
        
        if (quantityToAdd > 0) {
          // If at cap, log that we're capping the quantity
          if (newQuantity === BAIT_ITEM_CAP && currentQuantity + craftedQuantity > BAIT_ITEM_CAP) {
            console.log(`[CRAFTING] Capping bait quantity at ${BAIT_ITEM_CAP}`);
          }
          
          // Create item with the quantity to add (addItem will stack it)
          const itemToAdd = { ...craftedItem, quantity: quantityToAdd };
          this.inventoryManager.addItem(player, itemToAdd);
        }
      } else {
        // For non-bait items, just add the crafted quantity (addItem handles stacking)
        this.inventoryManager.addItem(player, craftedItem);
      }
      
      console.log(`[CRAFTING] Added ${craftedQuantity} to existing item via inventoryManager`);
    } else {
      // Ensure quantity is at least 1
      craftedItem.quantity = craftedItem.quantity || 1;
      
      // Apply bait quantity cap for new items
      if (craftedItem.type === 'bait' && craftedItem.quantity > BAIT_ITEM_CAP) {
        console.log(`[CRAFTING] Capping new bait quantity at ${BAIT_ITEM_CAP}`);
        craftedItem.quantity = BAIT_ITEM_CAP;
      }
      
      // Use inventoryManager method to add items instead of direct manipulation
      this.inventoryManager.addItem(player, craftedItem);
      console.log(`[CRAFTING] Added new item with quantity: ${craftedItem.quantity}`);
    }

    return true;
  }
}