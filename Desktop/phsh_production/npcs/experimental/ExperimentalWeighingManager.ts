// EXPERIMENTAL WEIGHING SYSTEM - Can be easily reverted
// This implements a hybrid Scene UI + Overlay UI weighing experience
// To use: Set USE_EXPERIMENTAL_WEIGHING = true in CollectorDialogNpc.ts

import { Player, World, SceneUI, Entity, PlayerEntity, DefaultPlayerEntityController } from 'hytopia';
import { LeaderboardManager } from '../../LeaderboardManager';
import type { CaughtFish } from '../../Inventory/ItemFactory';
import { GamePlayerEntity } from '../../GamePlayerEntity';
import { FISH_CATALOG } from '../../Fishing/PhshTwoFIshCatalog';
import { MessageManager } from '../../MessageManager';
import type { PlayerStateManager } from '../../PlayerStateManager';

interface WeightCorrection {
    adjustedWeight: number;
    adjustmentPercentage: number;
    wasAdjusted: boolean;
}

interface LeaderboardEntry {
    rank?: number; // Optional, will be assigned if missing
    playerName: string;
    weight: number;
    value: number;
}

interface Leaderboards {
    species: LeaderboardEntry[];
    overall: LeaderboardEntry[];
}

export class ExperimentalWeighingManager {
    private world: World;
    private messageManager: MessageManager;
    private stateManager: PlayerStateManager;
    private scaleSceneUI: Map<string, SceneUI> = new Map(); // Player ID -> Scale Scene UI
    private milestoneSceneUI: Map<string, SceneUI> = new Map(); // Player ID -> Milestone Emoji Scene UI
    private weighingInProgress: Map<string, boolean> = new Map(); // Track active weighings
    private lastMilestoneTime: Map<string, number> = new Map(); // Track last milestone time for cooldown
    private playerEntities: Map<string, PlayerEntity> = new Map(); // Cache player entities
    private finalValues: Map<string, number> = new Map(); // Cache final values for each player
    private originalControllerAnimations: Map<string, { idle: string[], walk: string[], run: string[] }> = new Map(); // Store original controller animations
    private shownMilestones: Map<string, Set<string>> = new Map(); // Track which milestones have been shown (string keys)
    private fishNames: Map<string, string> = new Map(); // Cache fish names for milestone messages
    private playerIds: Map<string, string> = new Map(); // Cache player IDs for highlighting

    constructor(world: World, messageManager: MessageManager, stateManager: PlayerStateManager) {
        this.world = world;
        this.messageManager = messageManager;
        this.stateManager = stateManager;
    }

    /**
     * Start the experimental weighing ceremony
     */
    public async startWeighing(
        player: Player,
        collectorEntity: Entity,
        fish: CaughtFish,
        correction: WeightCorrection,
        leaderboards: Leaderboards,
        finalValue?: number
    ): Promise<void> {
        const playerId = player.id;
        
        // Mark weighing as in progress
        this.weighingInProgress.set(playerId, true);
        this.lastMilestoneTime.set(playerId, 0);
        this.finalValues.set(playerId, finalValue || fish.value);
        this.shownMilestones.set(playerId, new Set()); // Reset shown milestones
        this.fishNames.set(playerId, fish.name); // Cache fish name for milestone messages
        this.playerIds.set(playerId, player.id); // Cache player ID for highlighting

        // Get player entity for animations
        const playerEntities = this.world.entityManager.getPlayerEntitiesByPlayer(player);
        if (playerEntities && playerEntities.length > 0) {
            const playerEntity = playerEntities[0] as GamePlayerEntity;
            this.playerEntities.set(playerId, playerEntity);
            
            // Set weighing flag to prevent controller from overriding animations (like isBoating)
            playerEntity.isWeighing = true;
            
            // Start "emote-griddy" animation during ceremony - use direct entity method like boat sit animation
            // Check if entity is spawned first
            if (playerEntity.isSpawned) {
                try {
                    // Use startModelLoopedAnimations directly on entity (like boat sit animation)
                    // Since isWeighing=true, controller won't override this
                    playerEntity.startModelLoopedAnimations(['emote-griddy']);
                    console.log(`[ExperimentalWeighing] Started emote-griddy (looped) for player ${playerId} (isWeighing flag set)`);
                } catch (error) {
                    console.warn(`[ExperimentalWeighing] Could not start emote-griddy:`, error);
                }
            } else {
                console.warn(`[ExperimentalWeighing] Player entity not spawned for ${playerId}`);
            }
        }

        // Don't show side panels yet - they'll appear after weighing completes
        // Just initialize the weighing system
        player.ui.sendData({
            type: 'startExperimentalWeighing',
            fishData: {
                name: fish.name,
                finalWeight: correction.adjustedWeight,
                value: fish.value
            },
            leaderboards: leaderboards,
            showPanels: false // Don't show panels initially
        });

        // Get current record weight for this species (top entry, or 0 if no records)
        const currentRecordWeight = leaderboards.species.length > 0 
            ? leaderboards.species[0].weight 
            : 0;

        // Create central scale Scene UI above collector (lowered from head)
        const scaleUI = new SceneUI({
            templateId: 'experimental-weighing-scale',
            attachedToEntity: collectorEntity,
            offset: { x: 0, y: 1.5, z: 0 }, // Lowered from 2.5 to 1.5
            state: {
                fishName: fish.name,
                currentWeight: 0,
                finalWeight: correction.adjustedWeight,
                isAnimating: true,
                currentRecordWeight: currentRecordWeight
            }
        });

        scaleUI.load(this.world);
        this.scaleSceneUI.set(playerId, scaleUI);

        // Start weight counting animation
        this.animateWeightCounting(player, scaleUI, correction.adjustedWeight, leaderboards, finalValue || fish.value);
    }

    /**
     * Animate the weight counting up with oscillation
     */
    private animateWeightCounting(
        player: Player,
        scaleUI: SceneUI,
        finalWeight: number,
        leaderboards: Leaderboards,
        finalValue: number
    ): void {
        const playerId = player.id;
        let currentWeight = 0;
        const duration = 6000; // 6 seconds (slower ceremony)
        const startTime = Date.now();
        const oscillationAmount = 0.1; // Small oscillation
        let lastSpeciesRank = -1;
        const updateInterval = 16; // ~60fps
        const milestoneCooldown = 800; // 800ms cooldown between medals

        const animate = () => {
            if (!this.weighingInProgress.get(playerId)) {
                return; // Weighing was cancelled
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out function for smooth deceleration
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            // Calculate current weight with oscillation
            const baseWeight = finalWeight * easedProgress;
            const oscillation = Math.sin(elapsed / 50) * oscillationAmount;
            currentWeight = Math.max(0, baseWeight + oscillation);

            // Get current record weight (top entry in species leaderboard)
            const currentRecordWeight = leaderboards.species.length > 0 
                ? leaderboards.species[0].weight 
                : 0;
            
            scaleUI.setState({
                currentWeight: currentWeight,
                isAnimating: progress < 1,
                currentRecordWeight: currentRecordWeight
            });

            // Track current rank for UI updates, but don't show milestones during animation
            // Milestones will only be shown at the end for final rank
            const currentSpeciesRank = this.getSpeciesRank(currentWeight, leaderboards);
            
            // Track rank changes for UI highlighting
            if (currentSpeciesRank !== lastSpeciesRank) {
                lastSpeciesRank = currentSpeciesRank;
            }

            // Update overlay side panels with player ID for proper highlighting
            player.ui.sendData({
                type: 'updateWeighingWeight',
                currentWeight: currentWeight,
                currentRank: currentSpeciesRank,
                playerId: player.id // Include player ID for highlighting
            });

            if (progress < 1) {
                setTimeout(animate, updateInterval);
            } else {
                // Animation complete
                this.completeWeighing(player, finalWeight, leaderboards);
            }
        };

        animate();
    }

    /**
     * Get the 10th place threshold weight (or 0 if less than 10 entries exist)
     */
    private get10thPlaceThreshold(leaderboards: Leaderboards): number {
        // If we have 10 or more entries, return the 10th entry's weight
        // Otherwise return 0 (meaning any weight will pass top 10)
        if (leaderboards.species.length >= 10) {
            return leaderboards.species[9].weight; // 10th entry (0-indexed)
        }
        // If leaderboard is empty (new species), any weight passes top 10
        // If leaderboard has < 10 entries, any weight passes top 10
        return 0;
    }

    /**
     * Get current species rank based on weight (only for species leaderboard)
     * Accounts for the fact that the current fish isn't in the leaderboard yet
     * Leaderboard is sorted by weight descending (highest first)
     */
    private getSpeciesRank(weight: number, leaderboards: Leaderboards): number {
        // If leaderboard is empty, any weight is 1st place
        if (leaderboards.species.length === 0) {
            return 1;
        }
        
        // Leaderboard is sorted descending by weight
        // Find the first entry we beat (or tie with)
        for (let i = 0; i < leaderboards.species.length; i++) {
            const entry = leaderboards.species[i];
            if (weight >= entry.weight) {
                // We beat or tied this entry, so we're at their rank
                return (entry.rank !== undefined) ? entry.rank : (i + 1);
            }
        }
        
        // If we didn't beat any entry, we're one rank below the last entry
        const lastEntry = leaderboards.species[leaderboards.species.length - 1];
        const lastRank = (lastEntry.rank !== undefined) ? lastEntry.rank : leaderboards.species.length;
        const ourRank = lastRank + 1;
        
        // Cap at 10 (since we only track top 10 for milestones)
        return Math.min(ourRank, 10);
    }

    /**
     * Get overall rank based on VALUE (overall leaderboard is sorted by value, not weight)
     * NOTE: The overall leaderboard only contains top 3 entries, so we can only accurately
     * determine if the fish is in top 3. For ranks beyond top 3, we return -1.
     * 
     * IMPORTANT: Since the leaderboard only has top 3, we can't know if there are entries
     * between ranks. We must be VERY conservative - only return a rank if we're absolutely
     * certain the fish is in that position, accounting for potential entries we can't see.
     * 
     * The safest approach: Only return rank 1/2/3 if we beat that rank AND there's no
     * ambiguity about entries between ranks. Since we can't know, we'll be very strict.
     */
    private getOverallRank(value: number, leaderboards: Leaderboards): number {
        // If overall leaderboard is empty, any value is 1st place
        if (leaderboards.overall.length === 0) {
            return 1;
        }
        
        // Overall leaderboard is sorted descending by value
        // We need to be VERY conservative since we only see top 3
        
        // For rank 1: Only return 1 if we clearly beat rank 1 AND there's no gap
        // Since we can't know if there are entries between, be conservative
        if (leaderboards.overall.length >= 1) {
            // If we beat rank 1, we COULD be rank 1, but there might be entries between
            // The actual position calculation happens after recording, so we can't trust this
            // Return -1 to be safe - we'll only show overall if we can verify it's truly top 3
            // Actually, let's check: if value > rank 1, we're at least rank 1
            // But if actual position is 10, that means there are 9 entries between
            // So we can't trust this comparison. Return -1 to be safe.
            if (value > leaderboards.overall[0].value) {
                // We beat rank 1, but we can't know if there are entries between
                // Since actual position might be much lower, return -1 to be conservative
                return -1;
            }
        }
        
        // For rank 2: Only if we beat rank 2 but not rank 1, and we're sure there's no gap
        if (leaderboards.overall.length >= 2 && value > leaderboards.overall[1].value) {
            if (leaderboards.overall.length >= 1 && value <= leaderboards.overall[0].value) {
                // Value is between rank 1 and rank 2 - there might be other entries
                return -1;
            }
        }
        
        // For rank 3: Only if we beat rank 3 but not rank 2, and we're sure there's no gap
        if (leaderboards.overall.length >= 3 && value > leaderboards.overall[2].value) {
            if (leaderboards.overall.length >= 2 && value < leaderboards.overall[1].value) {
                // Value is between rank 2 and rank 3 - there might be other entries
                return -1;
            }
            // If we're here, value >= rank 2, which is handled above
            return -1; // Be conservative
        }
        
        // If we didn't beat any entry in the top 3, we're not in top 3
        return -1;
    }

    /**
     * Trigger species milestone text messages and medals
     * Flow: TOP 10 [FISH] -> [2ND/3RD/etc] [FISH] -> Medal (for top 3)
     * Improved: Shows milestones in sequence, ensures all are displayed
     */
    private triggerSpeciesMilestone(player: Player, weight: number, leaderboards: Leaderboards): void {
        const playerId = player.id;
        const shownSet = this.shownMilestones.get(playerId) || new Set();
        const fishName = this.fishNames.get(playerId) || 'Fish';
        const currentRank = this.getSpeciesRank(weight, leaderboards);
        const threshold10 = this.get10thPlaceThreshold(leaderboards);
        const crossedTop10 = threshold10 === 0 || weight > threshold10;
        
        // Show milestones in sequence: TOP 10 -> Rank Text -> Medal
        // Each milestone is shown once, in order
        
        // Step 1: Show TOP 10 threshold first (if not already shown and we crossed it)
        if (crossedTop10 && !shownSet.has('10')) {
            shownSet.add('10');
            this.shownMilestones.set(playerId, shownSet);
            // Use MessageManager for proper cooldown/queuing
            this.messageManager.sendWeighMessage(`TOP 10 ${fishName.toUpperCase()}`, player);
            return; // Wait for cooldown before next milestone
        }
        
        // Step 2: Show rank text (2ND, 3RD, etc.) if we have a rank and haven't shown it yet
        if (currentRank > 0 && currentRank <= 10 && !shownSet.has(`rank-${currentRank}`)) {
            shownSet.add(`rank-${currentRank}`);
            this.shownMilestones.set(playerId, shownSet);
            
            // Format rank text
            let rankText = '';
            if (currentRank === 1) rankText = '1ST';
            else if (currentRank === 2) rankText = '2ND';
            else if (currentRank === 3) rankText = '3RD';
            else rankText = `${currentRank}TH`;
            
            // Use MessageManager for proper cooldown/queuing
            this.messageManager.sendWeighMessage(`${rankText} ${fishName.toUpperCase()}`, player);
            return; // Wait for cooldown before medal
        }
        
        // Step 3: Show medal for top 3 ranks (after rank text has been shown)
        if (currentRank > 0 && currentRank <= 3 && !shownSet.has(`medal-${currentRank}`)) {
            // Only show medal if we've already shown the rank text (or if rank text was skipped)
            // This ensures proper sequence
            if (shownSet.has(`rank-${currentRank}`) || shownSet.has('10')) {
                shownSet.add(`medal-${currentRank}`);
                this.shownMilestones.set(playerId, shownSet);
                
                let emoji = '🥇';
                if (currentRank === 1) emoji = '🥇';
                else if (currentRank === 2) emoji = '🥈';
                else if (currentRank === 3) emoji = '🥉';
                
                // Use MessageManager for proper cooldown/queuing
                this.messageManager.sendWeighMessage('', player, { emoji: emoji });
            }
        }
    }

    /**
     * Complete the weighing ceremony
     */
    private completeWeighing(
        player: Player,
        finalWeight: number,
        leaderboards: Leaderboards
    ): void {
        const playerId = player.id;
        
        // Get final value from cache
        const finalValue = this.finalValues.get(playerId) || 0;

        // Get current record weight for final display
        const currentRecordWeight = leaderboards.species.length > 0 
            ? leaderboards.species[0].weight 
            : 0;
        
        // Finalize scale display
        const scaleUI = this.scaleSceneUI.get(playerId);
        if (scaleUI) {
            scaleUI.setState({
                currentWeight: finalWeight,
                isAnimating: false,
                currentRecordWeight: currentRecordWeight
            });
        }

        // Determine final ranks
        const finalSpeciesRank = this.getSpeciesRank(finalWeight, leaderboards);
        // Overall leaderboard is sorted by VALUE, not weight
        const finalOverallRank = this.getOverallRank(finalValue, leaderboards);
        
        // Show milestones in sequence: TOP 10 -> Final Rank -> Overall (max 3 total)
        const fishName = this.fishNames.get(playerId) || 'Fish';
        const threshold10 = this.get10thPlaceThreshold(leaderboards);
        const isTop10Species = threshold10 === 0 || finalWeight > threshold10;
        const isTop10Overall = finalOverallRank > 0 && finalOverallRank <= 10;
        
        // Calculate XP bonuses
        let totalXPBonus = 0;
        
        // Milestone 1: TOP 10 (if applicable)
        if (isTop10Species && finalSpeciesRank > 0 && finalSpeciesRank <= 10) {
            const top10Bonus = 100;
            totalXPBonus += top10Bonus;
            this.messageManager.sendWeighMessage(`TOP 10 ${fishName.toUpperCase()}`, player, { xpBonus: top10Bonus });
        }
        
        // Milestone 2: Final Rank (1ST, 2ND, 3RD, etc.) with medal if top 3
        if (finalSpeciesRank > 0 && finalSpeciesRank <= 10) {
            let rankText = '';
            let rankBonus = 0;
            if (finalSpeciesRank === 1) {
                rankText = '1ST';
                rankBonus = 300; // Additional bonus on top of Top 10
            } else if (finalSpeciesRank === 2) {
                rankText = '2ND';
                rankBonus = 200; // Additional bonus on top of Top 10
            } else if (finalSpeciesRank === 3) {
                rankText = '3RD';
                rankBonus = 100; // Additional bonus on top of Top 10
            } else {
                rankText = `${finalSpeciesRank}TH`;
                rankBonus = 0; // No additional bonus for 4th-10th
            }
            
            // Show rank text with XP bonus subtext
            if (rankBonus > 0) {
                totalXPBonus += rankBonus;
                this.messageManager.sendWeighMessage(`${rankText} ${fishName.toUpperCase()}`, player, { xpBonus: rankBonus });
            } else {
                this.messageManager.sendWeighMessage(`${rankText} ${fishName.toUpperCase()}`, player);
            }
            
            // Show medal if top 3 (MessageManager will queue automatically)
            if (finalSpeciesRank <= 3) {
                let emoji = '🥇';
                if (finalSpeciesRank === 1) emoji = '🥇';
                else if (finalSpeciesRank === 2) emoji = '🥈';
                else if (finalSpeciesRank === 3) emoji = '🥉';
                this.messageManager.sendWeighMessage('', player, { emoji: emoji });
            }
        }
        
        // Overall rank bonus (if in top 10 overall) - grant silently since overall milestones are disabled during ceremony
        if (finalOverallRank > 0 && finalOverallRank <= 10) {
            let overallBonus = 0;
            if (finalOverallRank === 1) overallBonus = 1000;
            else if (finalOverallRank === 2) overallBonus = 500;
            else if (finalOverallRank === 3) overallBonus = 400;
            else overallBonus = 300; // Ranks 4-10
            
            if (overallBonus > 0) {
                totalXPBonus += overallBonus;
                console.log(`[ExperimentalWeighing] Overall rank ${finalOverallRank} bonus: ${overallBonus} XP (granted silently)`);
            }
        }
        
        // Grant total XP bonus
        if (totalXPBonus > 0) {
            this.stateManager.addXP(player, totalXPBonus);
            
            // Update XP leaderboard after XP is granted
            const { LeaderboardManager } = require('../../LeaderboardManager');
            const totalXP = this.stateManager.getLevelingSystem().getTotalXP(player);
            if (totalXP > 0) {
                LeaderboardManager.instance.updateXPLeaderboard(player, totalXP).catch((err: unknown) => {
                    console.error('[ExperimentalWeighingManager] Error updating XP leaderboard:', err);
                });
            }
        }
        
        // Milestone 3: Overall rank - DISABLED during ceremony
        // NOTE: We can't accurately determine overall rank from a top-3 leaderboard
        // because there may be many entries between ranks that we can't see.
        // Overall milestones should be shown after trophy status is calculated (if needed).
        // For now, we skip overall milestones during the weighing ceremony to avoid
        // showing incorrect information (e.g., showing "1ST OVERALL" when actual position is 10).
        // 
        // If overall milestones are needed, they should be calculated after the fish
        // is recorded to the leaderboard and trophy status is determined.
        
        // Send completion to overlay with leaderboard data for reveal animation
        // This will trigger the side panels to appear with climbing animation if player is in top 3
        player.ui.sendData({
            type: 'completeWeighing',
            finalWeight: finalWeight,
            finalSpeciesRank: finalSpeciesRank,
            finalOverallRank: finalOverallRank,
            leaderboards: leaderboards, // Send leaderboards for reveal animation
            playerId: player.id,
            playerName: player.username || player.id,
            finalValue: finalValue
        });

        // Play end animation based on result
        // Celebration if they got top 10 species OR any overall rank, defeat if not
        // Reuse threshold10 and isTop10Species already declared above
        const gotAnyOverallRank = finalOverallRank > 0;
        const shouldCelebrate = isTop10Species || gotAnyOverallRank;
        this.playEndAnimation(player, finalSpeciesRank, finalOverallRank, shouldCelebrate);

        // Clean up after delay
        setTimeout(() => {
            this.cleanup(player);
        }, 5000); // Show final result for 5 seconds
    }

    /**
     * Play end animation based on whether player got a rank/award
     */
    private playEndAnimation(player: Player, speciesRank: number, overallRank: number, gotAnyRank: boolean): void {
        const playerId = player.id;
        const playerEntity = this.playerEntities.get(playerId);
        
        if (!playerEntity) {
            console.warn(`[ExperimentalWeighing] No player entity found for ${playerId}`);
            return;
        }

        // Use the passed gotAnyRank parameter (celebration if any rank, defeat if not)
        const gotAward = gotAnyRank;
        
        let animationName: string;
        if (gotAward) {
            // Randomly choose between emote-rundance and bow-drawl
            animationName = Math.random() < 0.5 ? 'emote-rundance' : 'bow-drawl';
        } else {
            // Randomly choose between emote-annoyed and death-kneel
            animationName = Math.random() < 0.5 ? 'emote-annoyed' : 'death-kneel';
        }

        // Check if entity is spawned
        if (!playerEntity.isSpawned) {
            console.warn(`[ExperimentalWeighing] Player entity not spawned for ${playerId}, cannot play end animation`);
            return;
        }

        try {
            // Stop griddy animation first
            playerEntity.stopModelAnimations(['emote-griddy']);
            
            // Start the end animation as ONESHOT (plays once)
            // Keep isWeighing true for entire results period so controller doesn't override it
            playerEntity.startModelOneshotAnimations([animationName]);
            
            // isWeighing stays true during entire results period - will be cleared in cleanup()
            // This prevents controller from overriding the celebratory animation
        } catch (error) {
            console.warn(`[ExperimentalWeighing] Could not play end animation "${animationName}":`, error);
        }
    }

    /**
     * Clean up all Scene UIs for a player
     */
    public cleanup(player: Player): void {
        const playerId = player.id;
        
        // Clean up scale UI
        const scaleUI = this.scaleSceneUI.get(playerId);
        if (scaleUI) {
            scaleUI.unload();
            this.scaleSceneUI.delete(playerId);
        }

        // Clean up milestone UI
        const milestoneUI = this.milestoneSceneUI.get(playerId);
        if (milestoneUI) {
            milestoneUI.unload();
            this.milestoneSceneUI.delete(playerId);
        }

        // Clear weighing flag to restore normal controller behavior
        const playerEntity = this.playerEntities.get(playerId);
        if (playerEntity) {
            // Check if it's a GamePlayerEntity by checking for the isWeighing property
            if ('isWeighing' in playerEntity) {
                (playerEntity as GamePlayerEntity).isWeighing = false;
            }
        }
        
        // Clear weighing flag and cached data
        this.weighingInProgress.delete(playerId);
        this.lastMilestoneTime.delete(playerId);
        this.playerEntities.delete(playerId);
        this.finalValues.delete(playerId);

        // Hide overlay panels
        player.ui.sendData({
            type: 'endExperimentalWeighing'
        });
    }

    /**
     * Check if weighing is in progress for a player
     */
    public isWeighingInProgress(player: Player): boolean {
        return this.weighingInProgress.get(player.id) === true;
    }

    /**
     * Show overall rank milestone after trophy status is calculated
     * This is called after the fish is recorded to the leaderboard and we have the accurate position
     */
    public showOverallMilestone(player: Player, overallPosition: number, fishName: string, finalValue: number): void {
        // Only show if in top 3 overall (0-indexed, so 0, 1, or 2)
        if (overallPosition >= 0 && overallPosition < 3) {
            const rank = overallPosition + 1; // Convert to 1-based rank
            
            // Update the right panel to show player's entry climbing to position
            player.ui.sendData({
                type: 'updateOverallRank',
                overallRank: rank,
                playerId: player.id,
                playerName: player.username || player.id,
                finalValue: finalValue
            });
            
            // Show trophy emoji
            this.messageManager.sendWeighMessage('', player, { emoji: '🏆' });
            
            // Show overall message (no "TOP" prefix for 1ST, just the rank)
            const rankText = rank === 1 ? '1ST' : rank === 2 ? '2ND' : '3RD';
            const overallMessage = rank === 1 ? `${rankText} OVERALL` : `TOP ${rankText} OVERALL`;
            this.messageManager.sendWeighMessage(overallMessage, player);
            
        }
    }
}

