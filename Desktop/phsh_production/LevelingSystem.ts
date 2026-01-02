import { Player } from 'hytopia';
import type { PlayerStateManager } from './PlayerStateManager';

export class LevelingSystem {
    private playerXP: Map<string, number> = new Map(); // Current XP progress toward NEXT level
    private playerLevels: Map<string, number> = new Map();
    private playerTotalXP: Map<string, number> = new Map(); // Total XP earned (cumulative)
    private stateManager: PlayerStateManager | null = null;

    constructor() {}

    public initialize(stateManager: PlayerStateManager): void {
        this.stateManager = stateManager;
    }

    /**
     * Calculate XP required for a specific level using a reasonable progression system
     * Early game (1-10): Gentle learning curve
     * Mid game (10-50): Moderate progression 
     * End game (50+): Sustainable linear growth
     */
    public static getXPRequiredForLevel(level: number): number {
        if (level <= 1) return 0;
        
        // Early game: Gentle progression for new players
        if (level === 2) return 5;        // Tutorial level
        if (level === 3) return 100;       
        if (level === 4) return 150;       
        if (level === 5) return 225;       
        if (level === 6) return 300;      
        if (level === 7) return 375;      
        if (level === 8) return 450;      
        if (level === 9) return 525;      
        if (level === 10) return 600;     
        
        // Mid game (10-50): User's preferred pace (current 4→5 becomes 10→11)
        if (level <= 50) {
            // Start at 500 XP for level 11 (what user currently needs for 4→5)
            // Increase by 25 XP every 2 levels to keep it reasonable
            const levelsAbove10 = level - 10;
            const baseXP = 1000;
            const increment = Math.floor(levelsAbove10 / 2) * 25;
            return baseXP + increment;
        }
        
        // End game (50+): Sustainable linear growth
        if (level <= 100) {
            // Levels 50-100: Start at ~1000, increase by 10 per level
            const levelsAbove50 = level - 50;
            return 1000 + (levelsAbove50 * 10);
        }
        
        // Very high levels (100+): Minimal increases every 10 levels
        const tier = Math.floor((level - 100) / 10);
        const baseEndGameXP = 1500; // Level 100→101 requirement
        const tierBonus = tier * 50; // +50 XP every 10 levels
        return baseEndGameXP + tierBonus;
    }

    public addXP(player: Player, amount: number): void {
        const playerId = player.id;
        const currentLevel = this.playerLevels.get(playerId) || 1;
        const currentXP = this.playerXP.get(playerId) || 0; // Progress toward NEXT level
        const currentTotalXP = this.playerTotalXP.get(playerId) || 0; // Total XP earned (cumulative)
        
        let remainingXP = amount;
        let newLevel = currentLevel;
        let newXP = currentXP;

        console.log(`[LevelingSystem.addXP] Player: ${playerId}, Starting Level: ${currentLevel}, Current XP toward next: ${currentXP}, Gaining: ${amount}`);

        // Update total XP (cumulative tracking)
        const newTotalXP = currentTotalXP + amount;
        this.playerTotalXP.set(playerId, newTotalXP);

        // Process XP gain level by level (prevent skipping)
        while (remainingXP > 0 && newLevel < 500) { // Cap at 500 levels
            const xpNeededForNextLevel = LevelingSystem.getXPRequiredForLevel(newLevel + 1);
            const xpNeeded = xpNeededForNextLevel - newXP;

            if (remainingXP >= xpNeeded) {
                // Level up!
                remainingXP -= xpNeeded;
                newLevel++;
                newXP = 0; // Reset XP for new level
                
                
                // Update player data
                this.playerLevels.set(playerId, newLevel);
                this.playerXP.set(playerId, newXP);
                
                // Handle level up (will send UI update)
                this.handleLevelUp(player, newLevel - 1, newLevel);
                
                // Only allow ONE level up per addXP call
                // Excess XP is discarded (no spillover) - player starts at 0 XP for new level
                if (remainingXP > 0) {
                    newXP = 0; // Start at 0 XP for new level (no spillover)
                    remainingXP = 0; // Discard excess XP
                }
            } else {
                // Add XP toward current level
                newXP += remainingXP;
                remainingXP = 0;
            }
        }

        // Update final values
        this.playerLevels.set(playerId, newLevel);
        this.playerXP.set(playerId, newXP);
        
        // Send UI update if no level up occurred
        if (newLevel === currentLevel) {
            this.sendLevelUIUpdate(player);
        }

        // Update total XP in player state (for Phshdex display)
        if (this.stateManager) {
            this.stateManager.updateTotalXP(player, newTotalXP);
        }

    }

    private handleLevelUp(player: Player, oldLevel: number, newLevel: number): void {

        // Notify player of level up via UI
        player.ui.sendData({
            type: 'levelUp',
            oldLevel: oldLevel,
            newLevel: newLevel
        });

        // Send congratulations message
        const levelDifference = newLevel - oldLevel;
        let message: string;
        
        if (levelDifference === 1) {
            message = `Congratulations! You reached Level ${newLevel}!`;
        } else {
            message = `Amazing! You jumped from Level ${oldLevel} to Level ${newLevel}!`;
        }
        
        // Send chat message via PlayerStateManager
        if (this.stateManager) { 
            this.stateManager.sendGameMessage(player, message);
        } else {
            console.warn("[LevelingSystem.handleLevelUp] PlayerStateManager not available to send level up message.");
        }
        
        // Send UI update after level up
        this.sendLevelUIUpdate(player);
    }

    public getCurrentLevel(player: Player): number {
        return this.playerLevels.get(player.id) || 1;
    }

    public getCurrentXP(player: Player): number {
        return this.playerXP.get(player.id) || 0; // Progress toward NEXT level
    }

    public getXPForNextLevel(player: Player): number {
        const currentLevel = this.getCurrentLevel(player);
        
        // If we're at max level (500), return current XP requirement
        if (currentLevel >= 500) return LevelingSystem.getXPRequiredForLevel(500);
        
        return LevelingSystem.getXPRequiredForLevel(currentLevel + 1);
    }

    public getXPProgressForCurrentLevel(player: Player): { current: number, required: number, percentage: number } {
        const currentLevel = this.getCurrentLevel(player);
        const currentXP = this.getCurrentXP(player); // Progress toward next level
        const requiredXP = this.getXPForNextLevel(player);
        
        // For max level, show as complete
        if (currentLevel >= 500) {
            return {
                current: requiredXP,
                required: requiredXP,
                percentage: 100
            };
        }
        
        const percentage = requiredXP > 0 ? (currentXP / requiredXP) * 100 : 100;
        
        return {
            current: currentXP,
            required: requiredXP,
            percentage: Math.min(percentage, 100)
        };
    }

    public getTotalXP(player: Player): number {
        return this.playerTotalXP.get(player.id) || 0;
    }

    public setTotalXP(player: Player, totalXP: number): void {
        this.playerTotalXP.set(player.id, totalXP);
    }

    public sendLevelUIUpdate(player: Player): void {
        const currentLevel = this.getCurrentLevel(player);
        const progress = this.getXPProgressForCurrentLevel(player);
        
        player.ui.sendData({
            type: 'levelUpdate',
            level: currentLevel,
            xp: progress.current, // Current progress toward next level
            nextLevelXP: progress.required, // XP needed for next level
            progressXP: progress.current,
            progressRequired: progress.required,
            progressPercentage: progress.percentage
        });
    }

    // Enhanced XP calculation with more variety for different fish rarities
    public calculateFishXP(fish: { rarity: string; minWeight: number; weight: number }): number {
        let baseXp = 0;
        
        // Base XP by rarity (increased values)
        switch (fish.rarity.toLowerCase()) {
            case 'common': baseXp = 8; break;
            case 'uncommon': baseXp = 15; break;
            case 'rare': baseXp = 28; break;
            case 'epic': baseXp = 55; break;
            case 'legendary': baseXp = 110; break;
            case 'mythic': baseXp = 220; break;
            default: baseXp = 8;
        }
        
        // Weight bonus calculation (more significant impact)
        const weightRatio = fish.weight / fish.minWeight;
        const weightBonus = Math.floor(Math.max(0, (weightRatio - 1) * baseXp * 0.75));
        
        // Random variance (±10%) to add some excitement
        const variance = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
        
        const finalXP = Math.floor((baseXp + weightBonus) * variance);
        
        
        return Math.max(finalXP, 1); // Minimum 1 XP
    }

    public onPlayerJoin(player: Player) {
        // Send initial UI update when player joins
        this.sendLevelUIUpdate(player);
    }

    public onPlayerDataLoad(player: Player) {
        // Send UI update when player data is loaded from save
        this.sendLevelUIUpdate(player);
    }

    public setPlayerLevel(player: Player, level: number, xp: number) {
        
        // Update the player's level and XP (XP is progress toward NEXT level)
        this.playerLevels.set(player.id, level);
        this.playerXP.set(player.id, xp);
        
        // Update UI
        this.sendLevelUIUpdate(player);
    }

    // Utility method to get level requirements for display
    public static getLevelInfo(level: number): { xpRequired: number, totalXP: number } {
        return {
            xpRequired: LevelingSystem.getXPRequiredForLevel(level),
            totalXP: LevelingSystem.getXPRequiredForLevel(level)
        };
    }

    // Debug method to preview level progression
    public static previewLevels(maxLevel: number = 50): void {
        for (let i = 1; i <= maxLevel; i++) {
            const info = LevelingSystem.getLevelInfo(i);
        }
    }
}

