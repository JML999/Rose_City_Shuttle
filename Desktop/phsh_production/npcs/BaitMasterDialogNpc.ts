import { Player, World } from 'hytopia';
import { DialogNpc, type NpcConfig } from './DialogNpc';
import { PlayerStateManager, type PlayerState } from '../PlayerStateManager';
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager';
import { ItemFactory } from '../Inventory/ItemFactory';
import { BaitUtils } from '../Utils/BaitUtils';

export class BaitMasterDialogNpc extends DialogNpc {
    constructor(
        world: World,
        stateManager: PlayerStateManager,
        seaStoryManager: SeaStoryManager,
        config: NpcConfig // Pass the config explicitly
    ) {
        super(world, stateManager, seaStoryManager, config);
        this.interactionRadius = 3; // Set a reasonable radius
        console.log(`[BaitMaster ${this.config.id}] Initialized.`);
    }

    // --- Implement Abstract Methods (no sea story reaction) ---
    protected shouldReactToSeaStory(story: SeaStory): boolean {
        return false;
    }
    protected getSeaStoryPrompt(story: SeaStory): string {
        return this.config.interaction?.prompt || "Welcome to the Shrimp Shack! Fresh shrimp for sale!";
    }
    protected getSeaStoryResponse(story: SeaStory): string {
        return "I've got the finest shrimp on the island - perfect for catching bigger fish!";
    }
    protected getSeaStoryOptions(story: SeaStory): string[] {
        return this.config.interaction?.options?.map(opt => opt.text) || ["Buy Shrimp", "What's shrimp good for?", "Nevermind"];
    }

    // --- Handle dialog options ---
    public override handleOption(player: Player, option: number): void {
        const playerUI = this.interactingPlayers.get(player.id);
        const state = this.stateManager.getState(player);
        if (!playerUI || !state) {
            console.warn(`[BaitMaster ${this.config.id}] Received option ${option} from non-interacting player ${player.id}.`);
            return;
        }
        console.log(`[BaitMaster ${this.config.id}] handleOption called for player ${player.id} with option: ${option}`);
        let npcResponseText = playerUI.currentFallbackResponse || "Welcome to the Shrimp Shack!";
        let endInteraction = true;
        
        if (option === 0) {
            // Open shrimp shop panel
            this.openShrimpShop(player);
            npcResponseText = "Take a look at my shrimp selection! Fresh caught this morning!";
            endInteraction = true;
        } else if (option === 1) {
            // Info about shrimp (was option 2)
            npcResponseText = "Shrimp is the universal bait! Works great for all fish and gives you a much better chance than worms.";
            endInteraction = true;
        } else {
            // Nevermind or other options (was option 3)
            npcResponseText = "Come back anytime for the freshest shrimp on the island!";
            endInteraction = true;
        }

        console.log(`[BaitMaster ${this.config.id}] Responding to player ${player.id} with: "${npcResponseText}". Ending Interaction: ${endInteraction}`);

        // Update the specific player's dialogue bubble
        if (playerUI.dialog) {
            try { 
                playerUI.dialog.setState({ text: npcResponseText }); 
                console.log(`[BaitMaster ${this.config.id}] Successfully updated dialog for player ${player.id}`);
            } catch(e) { 
                console.error(`[BaitMaster ${this.config.id}] Error updating dialog for player ${player.id}:`, e);
            }
        } else {
            console.warn(`[BaitMaster ${this.config.id}] No dialog UI found for player ${player.id}`);
        }

        // Hide/unload the specific player's options UI
        if (playerUI.options) {
             try { playerUI.options.unload(); } catch (e) {}
             playerUI.options = undefined; // Clear reference
        }

        if (endInteraction) {
            // Clear any existing timer for this player
            if (playerUI.cleanupTimer) {
                clearTimeout(playerUI.cleanupTimer);
            }
            // Schedule bubble hide and map cleanup for THIS player
            const hideDelay = 30000; // Standardized to 30 seconds like Fitz
            playerUI.cleanupTimer = setTimeout(() => {
                this.cleanupPlayerInteraction(player, state);
            }, hideDelay);
        }
    }

    // --- Handle shrimp purchases ---
    public handleShrimpPurchase(player: Player, shrimpQuantity: number, totalPrice: number, sets: number): boolean {
        console.log(`[BaitMaster] Processing shrimp purchase: ${shrimpQuantity}x shrimp for $${totalPrice} from player ${player.id}`);
        
        // Simple validation: check price per shrimp (should be $25 for every 3 shrimp = $8.33 per shrimp)
        const pricePerShrimp = totalPrice / shrimpQuantity;
        const expectedPricePerShrimp = 25 / 3; // $8.33...
        
        // Allow small floating point tolerance
        if (Math.abs(pricePerShrimp - expectedPricePerShrimp) > 0.01) {
            console.warn(`[BaitMaster] Invalid pricing: ${shrimpQuantity} shrimp for $${totalPrice} (${pricePerShrimp.toFixed(2)} per shrimp), expected ${expectedPricePerShrimp.toFixed(2)} per shrimp`);
            return false;
        }

        // Validate quantity is multiple of 3 (since we sell in sets of 3)
        if (shrimpQuantity % 3 !== 0) {
            console.warn(`[BaitMaster] Invalid quantity: ${shrimpQuantity} shrimp, must be multiple of 3`);
            return false;
        }

        // Check bait cap
        const playerLevel = this.stateManager.getCurrentLevel(player);
        const baitCap = BaitUtils.getBaitCapForLevel(playerLevel);
        const currentBaitCount = this.getCurrentBaitCount(player);
        
        if (currentBaitCount + shrimpQuantity > baitCap) {
            console.log(`[BaitMaster] Purchase would exceed bait cap: ${currentBaitCount} + ${shrimpQuantity} > ${baitCap}`);
            this.stateManager.sendGameMessage(player, `Cannot purchase ${shrimpQuantity} shrimp - would exceed your bait cap of ${baitCap}! (Current: ${currentBaitCount})`);
            return false;
        }

        // Check if player has enough coins
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        if (currentCoins < totalPrice) {
            console.log(`[BaitMaster] Player has insufficient coins: ${currentCoins}/${totalPrice}`);
            this.stateManager.sendGameMessage(player, `You need $${totalPrice} but only have $${currentCoins}!`);
            return false;
        }

        // Process the purchase
        const success = this.stateManager.getCurrencyManager().removeCoins(player, totalPrice);
        if (!success) {
            console.error(`[BaitMaster] Failed to remove coins from player ${player.id}`);
            this.stateManager.sendGameMessage(player, "Payment processing failed. Try again!");
            return false;
        }

        // Create and add shrimp to inventory
        const shrimpItem = ItemFactory.createBaitItem('bait_shrimp', shrimpQuantity);
        if (!shrimpItem) {
            console.error(`[BaitMaster] Failed to create shrimp item`);
            // Refund the coins
            this.stateManager.getCurrencyManager().addCoins(player, totalPrice);
            this.stateManager.sendGameMessage(player, "Failed to create shrimp. Coins refunded.");
            return false;
        }

        this.stateManager.addInventoryItem(player, shrimpItem);
        
        // Update UI
        this.stateManager.updateCurrencyUI(player);
        this.stateManager.getInventoryManager().updateInventoryUI(player);
        
        // Success message
        const actualSets = shrimpQuantity / 3;
        this.stateManager.sendGameMessage(player, `Purchased ${shrimpQuantity} shrimp (${actualSets} sets) for $${totalPrice}!`);
        
        console.log(`[BaitMaster] Successfully sold ${shrimpQuantity} shrimp to player ${player.id} for $${totalPrice}`);
        return true;
    }

    // Count the total bait items in player's inventory
    private getCurrentBaitCount(player: Player): number {
        const inventory = this.stateManager.getInventoryManager().getInventory(player);
        if (!inventory) return 0;
        
        return inventory.items
            .filter(item => item.type === 'bait')
            .reduce((total, item) => total + (item.quantity || 1), 0);
    }

    private openShrimpShop(player: Player): void {
        console.log(`[BaitMaster] Opening shrimp shop for player ${player.id}`);
        
        // Get current player data for client-side validation
        const playerLevel = this.stateManager.getCurrentLevel(player);
        const currentCoins = this.stateManager.getCurrencyManager().getCoins(player);
        const inventory = this.stateManager.getInventoryManager().getInventory(player);
        
        // Send data to open the new shrimp shop panel with player data
        player.ui.sendData({
            type: 'openShrimpShop',
            shopName: 'Shrimp Shack',
            shopTitle: 'Fresh Shrimp - 3 for $25'
        });
        
        // Send current player data for client-side validation
        player.ui.sendData({
            type: 'playerDataUpdate',
            level: playerLevel,
            coins: currentCoins
        });
        
        // Send inventory data for bait counting
        player.ui.sendData({
            type: 'inventoryUpdate',
            inventory: inventory
        });
    }

    private openBaitCrafting(player: Player): void {
        console.log(`[BaitMaster] Opening bait crafting for player ${player.id}`);
        
        // Trigger the existing bait crafting panel
        player.ui.sendData({
            type: 'openBaitMasterCrafting'
        });
    }
} 