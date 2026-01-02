import { Entity, Player, World } from 'hytopia';
import type { CaughtFish } from '../Inventory/ItemFactory';
import type { PlayerStateManager } from '../PlayerStateManager';

// Prize system configuration
interface PrizeConfig {
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    color: 'red' | 'green' | 'orange' | 'lilac' | 'blue' | 'yellow' | 'pink' | 'teal';
    weight: number; // Probability weight
    rewards: PrizeReward[];
}

interface PrizeReward {
    type: 'currency' | 'item' | 'bait' | 'rod';
    id?: string;
    amount?: number;
    rarity?: string;
}

export class SpinWheelEntity extends Entity {
    private stateManager: PlayerStateManager;
    private isSpinning: boolean = false;
    private spinQueue: Array<{ player: Player; fish: CaughtFish }> = [];

    // Prize configuration - map colors to prize types
    private readonly PRIZE_CONFIG: PrizeConfig[] = [
        {
            rarity: 'common',
            color: 'red',
            weight: 40,
            rewards: [
                { type: 'currency', amount: 50 },
                { type: 'bait', id: 'worm', amount: 5 }
            ]
        },
        {
            rarity: 'uncommon', 
            color: 'green',
            weight: 25,
            rewards: [
                { type: 'currency', amount: 75 },
                { type: 'bait', id: 'minnow', amount: 3 }
            ]
        },
        {
            rarity: 'rare',
            color: 'orange',
            weight: 15,
            rewards: [
                { type: 'currency', amount: 100 },
                { type: 'item', id: 'tackle_box', amount: 1 }
            ]
        },
        {
            rarity: 'epic',
            color: 'lilac',
            weight: 12,
            rewards: [
                { type: 'currency', amount: 100 },
                { type: 'bait', id: 'premium_lure', amount: 2 }
            ]
        },
        {
            rarity: 'legendary',
            color: 'blue',
            weight: 5,
            rewards: [
                { type: 'currency', amount: 100 },
                { type: 'rod', id: 'legendary_rod', amount: 1 }
            ]
        },
        {
            rarity: 'common',
            color: 'yellow',
            weight: 35,
            rewards: [
                { type: 'currency', amount: 75 },
                { type: 'bait', id: 'bread', amount: 10 }
            ]
        },
        {
            rarity: 'rare',
            color: 'pink',
            weight: 10,
            rewards: [
                { type: 'currency', amount: 100 },
                { type: 'item', id: 'fishing_net', amount: 1 }
            ]
        },
        {
            rarity: 'epic',
            color: 'teal',
            weight: 8,
            rewards: [
                { type: 'currency', amount: 100 },
                { type: 'bait', id: 'golden_worm', amount: 1 }
            ]
        }
    ];

    constructor(world: World, stateManager: PlayerStateManager) {
        super({
            name: 'spin_wheel',
            modelUri: 'models/decor/prize_wheel.gltf', // Your wheel model
            modelScale: 1.0
            // Removed modelLoopedAnimations - let the model handle its own embedded animations
        });

        this.stateManager = stateManager;
    }

    // --- Main Trigger Method (called by CollectorDialogNpc) ---
    public async triggerSpin(player: Player, recordFish: CaughtFish): Promise<void> {
        console.log(`[SpinWheelEntity] Triggered for player ${player.id} with record ${recordFish.name}`);

        // Add to queue if already spinning
        if (this.isSpinning) {
            this.spinQueue.push({ player, fish: recordFish });
            this.stateManager.sendGameMessage(player, "🎰 Added to wheel queue! Your spin will start shortly.");
            return;
        }

        await this.performSpin(player, recordFish);
    }

    // --- Core Spin Logic ---
    private async performSpin(player: Player, recordFish: CaughtFish): Promise<void> {
        this.isSpinning = true;

        try {
            // Step 1: Determine prize based on fish rarity/weight
            const selectedPrize = this.selectPrize(recordFish);
            
            // Step 2: Play spin animation
            await this.playSpinAnimation(selectedPrize.color);
            
            // Step 3: Award prizes
            await this.awardPrizes(player, selectedPrize);
            
            // Step 4: Announce result
            this.announceResult(player, selectedPrize, recordFish);

        } catch (error) {
            console.error(`[SpinWheelEntity] Error during spin for player ${player.id}:`, error);
            this.stateManager.sendGameMessage(player, "🎰 The wheel seems to be stuck! Please try again.");
        } finally {
            this.isSpinning = false;
            
            // Process queue
            if (this.spinQueue.length > 0) {
                const next = this.spinQueue.shift()!;
                setTimeout(() => this.performSpin(next.player, next.fish), 1000);
            }
        }
    }

    // --- Prize Selection Logic ---
    private selectPrize(recordFish: CaughtFish): PrizeConfig {
        // Boost odds for higher rarity fish
        const rarityMultipliers = {
            'common': 1.0,
            'uncommon': 1.2,
            'rare': 1.5,
            'epic': 2.0,
            'legendary': 3.0
        };

        const multiplier = rarityMultipliers[recordFish.rarity as keyof typeof rarityMultipliers] || 1.0;
        
        // Create weighted pool
        const weightedPrizes: Array<{ config: PrizeConfig; weight: number }> = this.PRIZE_CONFIG.map(config => ({
            config,
            weight: config.rarity === 'legendary' || config.rarity === 'epic' 
                ? config.weight * multiplier 
                : config.weight
        }));

        // Random selection based on weights
        const totalWeight = weightedPrizes.reduce((sum, prize) => sum + prize.weight, 0);
        let random = Math.random() * totalWeight;

        for (const weightedPrize of weightedPrizes) {
            random -= weightedPrize.weight;
            if (random <= 0) {
                return weightedPrize.config;
            }
        }

        // Fallback to first prize
        return this.PRIZE_CONFIG[0];
    }

    // --- Animation System ---
    private async playSpinAnimation(targetColor: string): Promise<void> {
        console.log(`[SpinWheelEntity] Using embedded wheel animation, target: ${targetColor}`);

        // The model has embedded animations - just let it spin naturally
        // No need for complex animation orchestration
        return new Promise((resolve) => {
            // Simple delay to simulate spin time, let model handle the animation
            setTimeout(() => {
                console.log(`[SpinWheelEntity] Spin animation complete`);
                resolve();
            }, 4000); // Single timeout instead of nested chains
        });
    }

    // --- Prize Award System ---
    private async awardPrizes(player: Player, prizeConfig: PrizeConfig): Promise<void> {
        console.log(`[SpinWheelEntity] Awarding ${prizeConfig.rarity} prizes to player ${player.id}`);

        for (const reward of prizeConfig.rewards) {
            try {
                await this.awardSingleReward(player, reward);
            } catch (error) {
                console.error(`[SpinWheelEntity] Error awarding reward:`, error);
            }
        }
    }

    private async awardSingleReward(player: Player, reward: PrizeReward): Promise<void> {
        switch (reward.type) {
            case 'currency':
                if (reward.amount) {
                    // Assuming you have currency system
                    // this.stateManager.addCurrency(player, reward.amount);
                    console.log(`[SpinWheelEntity] Awarded ${reward.amount} currency to ${player.id}`);
                }
                break;

            case 'item':
            case 'bait':
            case 'rod':
                if (reward.id && reward.amount) {
                    // Add items to inventory
                    // this.stateManager.addInventoryItem(player, reward.id, reward.amount);
                    console.log(`[SpinWheelEntity] Awarded ${reward.amount}x ${reward.id} to ${player.id}`);
                }
                break;
        }
    }

    // --- Result Announcement ---
    private announceResult(player: Player, prizeConfig: PrizeConfig, recordFish: CaughtFish): void {
        const rarityEmojis = {
            'common': '🟢',
            'uncommon': '🔵', 
            'rare': '🟡',
            'epic': '🟣',
            'legendary': '⭐'
        };

        const emoji = rarityEmojis[prizeConfig.rarity];
        const rewardText = this.formatRewardText(prizeConfig.rewards);

        const message = `${emoji} Wheel Result: ${prizeConfig.rarity.toUpperCase()} prize!\n${rewardText}\n\nCongratulations on your record ${recordFish.name}!`;

        this.stateManager.sendGameMessage(player, message);

        // Optional: Send to all players for big wins
        if (prizeConfig.rarity === 'legendary' || prizeConfig.rarity === 'epic') {
            this.broadcastBigWin(player, prizeConfig, recordFish);
        }
    }

    private formatRewardText(rewards: PrizeReward[]): string {
        return rewards.map(reward => {
            switch (reward.type) {
                case 'currency':
                    return `💰 ${reward.amount} coins`;
                case 'item':
                case 'bait':
                case 'rod':
                    return `🎁 ${reward.amount}x ${reward.id?.replace(/_/g, ' ')}`;
                default:
                    return '🎁 Mystery prize';
            }
        }).join('\n');
    }

    private broadcastBigWin(player: Player, prizeConfig: PrizeConfig, recordFish: CaughtFish): void {
        const announcement = `🎉 ${player.username} just won a ${prizeConfig.rarity.toUpperCase()} prize from the wheel with their record ${recordFish.name}!`;
        
        // Send to all players
        if (this.world) {
            const allPlayers = this.world.entityManager.getAllPlayerEntities();
            allPlayers.forEach(playerEntity => {
                if (playerEntity.player.id !== player.id) {
                    this.stateManager.sendGameMessage(playerEntity.player, announcement);
                }
            });
        }
    }

    // --- Utility Methods ---
    public isCurrentlySpinning(): boolean {
        return this.isSpinning;
    }

    public getQueueLength(): number {
        return this.spinQueue.length;
    }

    // --- Testing/Admin Methods ---
    public async testSpin(player: Player, targetColor?: string): Promise<void> {
        if (targetColor) {
            const prizeConfig = this.PRIZE_CONFIG.find(p => p.color === targetColor);
            if (prizeConfig) {
                await this.playSpinAnimation(targetColor);
                await this.awardPrizes(player, prizeConfig);
                this.announceResult(player, prizeConfig, { 
                    id: 'test', 
                    name: 'Test Fish', 
                    weight: 10, 
                    rarity: 'common',
                    value: 100,
                    isBaitFish: false
                });
                return;
            }
        }
        
        // Random test spin
        const randomPrize = this.PRIZE_CONFIG[Math.floor(Math.random() * this.PRIZE_CONFIG.length)];
        await this.playSpinAnimation(randomPrize.color);
        await this.awardPrizes(player, randomPrize);
        this.announceResult(player, randomPrize, { 
            id: 'test', 
            name: 'Test Fish', 
            weight: 10, 
            rarity: 'common',
            value: 100,
            isBaitFish: false
        });
    }
} 