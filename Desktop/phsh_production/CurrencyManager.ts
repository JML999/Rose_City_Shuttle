import { Player } from 'hytopia';

export interface PlayerCurrency {
    coins: number;
    // Can easily add more currency types later
    // gems?: number;
    // points?: number;
}

export class CurrencyManager {
    private currencies: Map<string, PlayerCurrency> = new Map();

    initializePlayer(player: Player) {
        // CRITICAL: Only initialize if currency doesn't already exist
        // This prevents overwriting persisted currency data that was just restored
        if (this.currencies.has(player.id)) {
            console.log(`[CURRENCY] Currency already exists for player ${player.id} - skipping initialization`);
            this.updateCurrencyUI(player);
            return;
        }
        
        this.currencies.set(player.id, {
            coins: 0
        });
        this.updateCurrencyUI(player);
    }

    addCoins(player: Player, amount: number) {
        const currency = this.currencies.get(player.id);
        if (!currency) return false;

        currency.coins += amount;
        this.updateCurrencyUI(player);
        return true;
    }

    removeCoins(player: Player, amount: number): boolean {
        const currency = this.currencies.get(player.id);
        if (!currency) return false;

        if (currency.coins < amount) return false;

        currency.coins -= amount;
        this.updateCurrencyUI(player);
        return true;
    }

    getCoins(player: Player): number {
        return this.currencies.get(player.id)?.coins || 0;
    }

    public updateCurrencyUI(player: Player) {
        const currency = this.currencies.get(player.id);
        if (!currency) {
            console.warn(`[CURRENCY] No currency data found for player ${player.id}`);
            return;
        }
        
        player.ui.sendData({
            type: "currencyUpdate",
            currency: {
                coins: currency.coins
            }
        });
    }

    cleanup(player: Player) {
        this.currencies.delete(player.id);
    }

    setCoins(player: Player, amount: number) {
        
        // Get or create currency object
        let currency = this.currencies.get(player.id);
        if (!currency) {
            currency = { coins: 0 };
            this.currencies.set(player.id, currency);
        }
        
        // Update coins
        currency.coins = amount;
        
        // Update UI
        this.updateCurrencyUI(player);
    }
}

