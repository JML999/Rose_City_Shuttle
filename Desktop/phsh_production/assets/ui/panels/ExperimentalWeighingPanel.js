// EXPERIMENTAL WEIGHING PANEL - Can be easily reverted
// Hybrid Scene UI + Overlay UI weighing experience
// Side leaderboard panels (Overlay UI) + Central scale (Scene UI)

class ExperimentalWeighingPanel {
    constructor() {
        this.isActive = false;
        this.leftPanel = null;
        this.rightPanel = null;
        this.currentWeight = 0;
        this.finalWeight = 0;
        this.speciesLeaderboard = [];
        this.overallLeaderboard = [];
        this.currentRank = -1;
    }

    initialize() {
        this.createPanels();
        this.setupDataHandlers();
    }

    createPanels() {
        // Left Panel - Top 3 Species
        this.leftPanel = document.createElement('div');
        this.leftPanel.id = 'experimental-weighing-left-panel';
        this.leftPanel.className = 'experimental-weighing-side-panel';
        this.leftPanel.style.cssText = `
            position: fixed;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            width: 250px;
            background: linear-gradient(to bottom, rgba(20, 20, 30, 0.92), rgba(10, 10, 20, 0.92));
            border: 2px solid rgba(255, 215, 0, 0.5);
            border-radius: 12px;
            padding: 15px;
            z-index: 1500;
            display: none;
            backdrop-filter: blur(8px);
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        `;
        document.body.appendChild(this.leftPanel);

        // Right Panel - Top 3 Overall
        this.rightPanel = document.createElement('div');
        this.rightPanel.id = 'experimental-weighing-right-panel';
        this.rightPanel.className = 'experimental-weighing-side-panel';
        this.rightPanel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            width: 250px;
            background: linear-gradient(to bottom, rgba(20, 20, 30, 0.92), rgba(10, 10, 20, 0.92));
            border: 2px solid rgba(255, 215, 0, 0.5);
            border-radius: 12px;
            padding: 15px;
            z-index: 1500;
            display: none;
            backdrop-filter: blur(8px);
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        `;
        document.body.appendChild(this.rightPanel);
    }

    setupDataHandlers() {
        hytopia.onData(data => {
            if (data.type === 'startExperimentalWeighing') {
                this.startWeighing(data.fishData, data.leaderboards, data.showPanels);
            } else if (data.type === 'updateWeighingWeight') {
                this.updateWeight(data.currentWeight, data.currentRank, data.playerId);
            } else if (data.type === 'completeWeighing') {
                this.completeWeighing(data.finalWeight, data.finalSpeciesRank, data.finalOverallRank, data.leaderboards, data.playerId, data.playerName, data.finalValue);
            } else if (data.type === 'endExperimentalWeighing') {
                this.hide();
            } else if (data.type === 'showMilestoneEmoji') {
                this.showMilestoneEmoji(data.emoji, data.rank);
            } else if (data.type === 'showMilestoneText') {
                this.showMilestoneText(data.text, data.milestoneType);
            } else if (data.type === 'weighMessage') {
                // Handle weigh messages from MessageManager (trophy notifications, etc.)
                this.showMilestoneText(data.text, 'weigh', data.xpBonus);
                if (data.emoji) {
                    // Show emoji after a brief delay if provided
                    setTimeout(() => {
                        this.showMilestoneEmoji(data.emoji, 0);
                    }, 300);
                }
            } else if (data.type === 'updateOverallRank') {
                // Update overall panel when accurate rank is determined after trophy calculation
                this.updateOverallPanelWithPlayerEntry(data.overallRank, data.playerId, data.playerName, data.finalValue);
            }
        });
    }

    startWeighing(fishData, leaderboards, showPanels = false) {
        this.isActive = true;
        this.finalWeight = fishData.finalWeight;
        this.currentWeight = 0;
        this.speciesLeaderboard = leaderboards?.species || [];
        this.overallLeaderboard = leaderboards?.overall || [];
        this.currentRank = -1;
        this.currentPlayerId = null; // Track player ID for highlighting
        this.fishData = fishData; // Store for later use

        // Don't show panels initially - they'll appear after weighing completes
        if (showPanels) {
            this.populateLeftPanel(fishData.name);
            this.populateRightPanel();
            this.leftPanel.style.display = 'block';
            this.rightPanel.style.display = 'block';
        } else {
            // Hide panels initially
            this.leftPanel.style.display = 'none';
            this.rightPanel.style.display = 'none';
        }
    }

    populateLeftPanel(speciesName) {
        this.leftPanel.innerHTML = `
            <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;">
                TOP 3 ${speciesName.toUpperCase()}
            </div>
            <div class="leaderboard-entries" id="left-leaderboard-entries">
                ${this.renderLeaderboardEntries(this.speciesLeaderboard, 'left')}
            </div>
        `;
    }

    populateRightPanel() {
        this.rightPanel.innerHTML = `
            <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;">
                TOP 3 OVERALL
            </div>
            <div class="leaderboard-entries" id="right-leaderboard-entries">
                ${this.renderLeaderboardEntries(this.overallLeaderboard, 'right')}
            </div>
        `;
    }

    renderLeaderboardEntries(entries, side) {
        // Ensure at least 3 entries (fill with "Open" if needed)
        const top3 = entries.slice(0, 3);
        while (top3.length < 3) {
            top3.push({
                playerName: 'Open',
                value: 0,
                weight: 0,
                rank: top3.length + 1,
                isOpen: true
            });
        }
        
        const ranks = ['🥇', '🥈', '🥉'];
        
        return top3.map((entry, index) => {
            // Highlight based on position (index + 1) matching currentRank, not entry.rank
            // This is because the leaderboard doesn't include the current player's entry yet
            // So we highlight the position where the player would be (their rank)
            const position = index + 1; // Position in top 3 (1, 2, or 3)
            const isHighlighted = this.currentRank === position && this.currentRank <= 3;
            const isOpen = entry.isOpen || entry.playerName === 'Open';
            
            // Left panel (species) shows weight in pounds, right panel (overall) shows value
            const displayValue = side === 'left' 
                ? (isOpen ? '---' : `${entry.weight?.toFixed(2) || '0.00'} LBS`)
                : (isOpen ? '---' : `$${entry.value?.toLocaleString() || '0'}`);
            
            return `
                <div class="leaderboard-entry ${isHighlighted ? 'highlighted' : ''}" 
                     data-rank="${entry.rank}" 
                     data-position="${position}"
                     style="
                         display: flex;
                         justify-content: space-between;
                         align-items: center;
                         padding: 8px 10px;
                         margin: 5px 0;
                         background: ${isHighlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                         border: ${isHighlighted ? '2px solid rgba(255, 215, 0, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)'};
                         border-radius: 6px;
                         transition: all 0.3s ease;
                         opacity: ${isOpen ? '0.5' : '1'};
                     ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${ranks[index] || '•'}</span>
                        <span style="color: ${isOpen ? '#888' : '#e0e0e0'}; font-size: 14px; font-style: ${isOpen ? 'italic' : 'normal'};">${entry.playerName || '---'}</span>
                    </div>
                    <span style="color: ${isOpen ? '#888' : '#FFD700'}; font-weight: bold; font-size: 14px;">${displayValue}</span>
                </div>
            `;
        }).join('');
    }

    updateWeight(currentWeight, currentRank, playerId) {
        this.currentWeight = currentWeight;
        if (playerId) {
            this.currentPlayerId = playerId;
        }
        
        // Update rank highlighting if changed
        if (currentRank !== this.currentRank) {
            this.currentRank = currentRank;
            this.updateRankHighlighting();
        }
    }

    updateRankHighlighting() {
        // Update left panel (species leaderboard)
        const leftEntries = this.leftPanel.querySelectorAll('.leaderboard-entry');
        leftEntries.forEach((entry, index) => {
            // Highlight based on position (index + 1) matching currentRank
            // This accounts for the fact that the leaderboard doesn't include the current player's entry
            const position = index + 1;
            const isHighlighted = this.currentRank === position && this.currentRank <= 3;
            entry.style.background = isHighlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            entry.style.border = isHighlighted ? '2px solid rgba(255, 215, 0, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)';
        });

        // Update right panel (overall leaderboard) - only highlight if player is in top 3 overall
        // Note: Overall rank is calculated separately and may not match species rank
        const rightEntries = this.rightPanel.querySelectorAll('.leaderboard-entry');
        rightEntries.forEach((entry, index) => {
            // For overall, we'd need to track overallRank separately
            // For now, don't highlight overall entries (they're shown for reference)
            entry.style.background = 'rgba(255, 255, 255, 0.05)';
            entry.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        });
    }

    showMilestoneText(text, milestoneType, xpBonus) {
        // Create main text display (original implementation)
        const textEl = document.createElement('div');
        textEl.textContent = text;
        textEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4);
            z-index: 2000;
            pointer-events: none;
            animation: textCelebrate 2.5s ease-out forwards;
            font-family: 'Arial', sans-serif;
            letter-spacing: 1.5px;
            text-align: center;
            white-space: nowrap;
        `;
        document.body.appendChild(textEl);
        
        // Add XP bonus subtext below if provided
        if (xpBonus && xpBonus > 0) {
            const subtextEl = document.createElement('div');
            subtextEl.textContent = `[${xpBonus}] XP BONUS`;
            subtextEl.style.cssText = `
                position: fixed;
                top: calc(50% + 30px);
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.3);
                z-index: 2000;
                pointer-events: none;
                animation: textCelebrate 2.5s ease-out forwards;
                font-family: 'Arial', sans-serif;
                letter-spacing: 1px;
                text-align: center;
                white-space: nowrap;
            `;
            document.body.appendChild(subtextEl);
            
            // Remove subtext after animation
            setTimeout(() => {
                if (subtextEl.parentNode) {
                    subtextEl.parentNode.removeChild(subtextEl);
                }
            }, 2500);
        }

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes textCelebrate {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translateY(-15px) scale(0.8);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) translateY(0) scale(1.05);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) translateY(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) translateY(15px) scale(0.9);
                }
            }
        `;
        if (!document.getElementById('textCelebrateStyle')) {
            style.id = 'textCelebrateStyle';
            document.head.appendChild(style);
        }

        // Remove after animation
        setTimeout(() => {
            if (textEl.parentNode) {
                textEl.parentNode.removeChild(textEl);
            }
        }, 2500);
    }

    showMilestoneEmoji(emoji, rank) {
        // Create temporary emoji display (could be enhanced with Scene UI)
        const emojiEl = document.createElement('div');
        emojiEl.textContent = emoji;
        emojiEl.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 80px;
            z-index: 2000;
            pointer-events: none;
            animation: emojiCelebrate 2s ease-out forwards;
        `;
        document.body.appendChild(emojiEl);

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes emojiCelebrate {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0) translateY(0);
                }
                20% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.5) translateY(-20px);
                }
                80% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.2) translateY(-30px);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.8) translateY(-50px);
                }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            emojiEl.remove();
            style.remove();
        }, 2000);
    }

    completeWeighing(finalWeight, finalSpeciesRank, finalOverallRank, leaderboards, playerId, playerName, finalValue) {
        // Update leaderboards with final data
        if (leaderboards) {
            this.speciesLeaderboard = leaderboards.species || [];
            this.overallLeaderboard = leaderboards.overall || [];
        }
        this.currentPlayerId = playerId;
        
        // Show side panels with reveal animation
        this.revealLeaderboards(finalSpeciesRank, finalOverallRank, playerId, playerName, finalValue);
    }

    revealLeaderboards(speciesRank, overallRank, playerId, playerName, finalValue) {
        const speciesName = this.fishData?.name || 'Fish';
        
        // Populate panels with player's entry if in top 3
        this.populateLeftPanelWithAnimation(speciesName, speciesRank, playerId, playerName);
        this.populateRightPanelWithAnimation(overallRank, playerId, playerName, finalValue);
        
        // Show panels with slide-in animation
        this.leftPanel.style.display = 'block';
        this.rightPanel.style.display = 'block';
        
        // Animate panels sliding in from sides
        this.leftPanel.style.transform = 'translateX(-100%)';
        this.rightPanel.style.transform = 'translateX(100%)';
        this.leftPanel.style.opacity = '0';
        this.rightPanel.style.opacity = '0';
        
        // Animate in
        setTimeout(() => {
            this.leftPanel.style.transition = 'all 0.6s ease-out';
            this.rightPanel.style.transition = 'all 0.6s ease-out';
            this.leftPanel.style.transform = 'translateY(-50%)';
            this.rightPanel.style.transform = 'translateY(-50%)';
            this.leftPanel.style.opacity = '1';
            this.rightPanel.style.opacity = '1';
        }, 100);
    }

    populateLeftPanelWithAnimation(speciesName, playerRank, playerId, playerName) {
        // Get top 3 species entries
        const top3 = this.speciesLeaderboard.slice(0, 3);
        
        // If player is in top 3, insert their entry at the correct position
        let entriesToShow = [...top3];
        if (playerRank > 0 && playerRank <= 3) {
            // Player is in top 3 - insert their entry
            const playerEntry = {
                playerName: playerName,
                weight: this.finalWeight,
                value: this.fishData?.value || 0,
                rank: playerRank,
                playerId: playerId,
                isPlayer: true
            };
            
            // Remove player's entry if it's already in the list (shouldn't be, but just in case)
            entriesToShow = entriesToShow.filter(e => e.playerId !== playerId);
            
            // Insert at correct position (rank is 1-based, array is 0-based)
            entriesToShow.splice(playerRank - 1, 0, playerEntry);
            
            // Keep only top 3
            entriesToShow = entriesToShow.slice(0, 3);
        }
        
        // Ensure at least 3 entries (fill with "Open" if needed)
        while (entriesToShow.length < 3) {
            entriesToShow.push({
                playerName: 'Open',
                value: 0,
                weight: 0,
                rank: entriesToShow.length + 1,
                isOpen: true
            });
        }
        
        this.leftPanel.innerHTML = `
            <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;">
                TOP 3 ${speciesName.toUpperCase()}
            </div>
            <div class="leaderboard-entries" id="left-leaderboard-entries">
                ${this.renderLeaderboardEntriesWithAnimation(entriesToShow, 'left', playerRank, playerId)}
            </div>
        `;
        
        // Trigger climbing animation if player is in top 3
        if (playerRank > 0 && playerRank <= 3) {
            setTimeout(() => {
                this.animatePlayerEntryClimbing('left', playerRank);
            }, 700); // Wait for panel slide-in to complete
        }
    }

    populateRightPanelWithAnimation(overallRank, playerId, playerName, finalValue) {
        // Get top 3 overall entries
        const top3 = this.overallLeaderboard.slice(0, 3);
        
        // If player is in top 3 overall (and we have a valid rank), insert their entry
        // overallRank will be -1 if we can't determine it accurately during ceremony
        let entriesToShow = [...top3];
        if (overallRank > 0 && overallRank <= 3) {
            const playerEntry = {
                playerName: playerName,
                value: finalValue,
                weight: this.finalWeight,
                rank: overallRank,
                playerId: playerId,
                species: this.fishData?.name || 'Fish',
                isPlayer: true
            };
            
            // Remove player's entry if it's already in the list (shouldn't be, but just in case)
            entriesToShow = entriesToShow.filter(e => 
                !(e.playerId === playerId && e.species === this.fishData?.name)
            );
            
            // Insert at correct position (rank is 1-based, array is 0-based)
            entriesToShow.splice(overallRank - 1, 0, playerEntry);
            
            // Keep only top 3
            entriesToShow = entriesToShow.slice(0, 3);
        }
        
        // Ensure at least 3 entries (fill with "Open" if needed)
        while (entriesToShow.length < 3) {
            entriesToShow.push({
                playerName: 'Open',
                value: 0,
                weight: 0,
                rank: entriesToShow.length + 1,
                isOpen: true
            });
        }
        
        this.rightPanel.innerHTML = `
            <div style="color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;">
                TOP 3 OVERALL
            </div>
            <div class="leaderboard-entries" id="right-leaderboard-entries">
                ${this.renderLeaderboardEntriesWithAnimation(entriesToShow, 'right', overallRank, playerId)}
            </div>
        `;
        
        // Trigger climbing animation if player is in top 3
        if (overallRank > 0 && overallRank <= 3) {
            setTimeout(() => {
                this.animatePlayerEntryClimbing('right', overallRank);
            }, 700);
        }
    }

    renderLeaderboardEntriesWithAnimation(entries, side, playerRank, playerId) {
        const ranks = ['🥇', '🥈', '🥉'];
        
        return entries.map((entry, index) => {
            const position = index + 1;
            const isPlayer = entry.isPlayer || (entry.playerId === playerId);
            const isOpen = entry.isOpen || entry.playerName === 'Open';
            const isHighlighted = isPlayer;
            
            // Left panel shows weight, right panel shows value
            const displayValue = side === 'left' 
                ? (isOpen ? '---' : `${entry.weight?.toFixed(2) || '0.00'} LBS`)
                : (isOpen ? '---' : `$${entry.value?.toLocaleString() || '0'}`);
            
            // Add animation class if this is the player's entry
            const animationClass = isPlayer ? 'climbing-entry' : '';
            
            return `
                <div class="leaderboard-entry ${animationClass} ${isHighlighted ? 'highlighted' : ''}" 
                     data-rank="${entry.rank}" 
                     data-position="${position}"
                     data-is-player="${isPlayer}"
                     style="
                         display: flex;
                         justify-content: space-between;
                         align-items: center;
                         padding: 8px 10px;
                         margin: 5px 0;
                         background: ${isHighlighted ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                         border: ${isHighlighted ? '2px solid rgba(255, 215, 0, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)'};
                         border-radius: 6px;
                         transition: all 0.3s ease;
                         opacity: ${isOpen ? '0.5' : '1'};
                         ${isPlayer ? 'transform: translateY(-100px); opacity: 0;' : ''}
                     ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${ranks[index] || '•'}</span>
                        <span style="color: ${isOpen ? '#888' : isPlayer ? '#FFD700' : '#e0e0e0'}; font-size: 14px; font-style: ${isOpen ? 'italic' : 'normal'}; font-weight: ${isPlayer ? 'bold' : 'normal'};">${entry.playerName || '---'}</span>
                    </div>
                    <span style="color: ${isOpen ? '#888' : isPlayer ? '#FFD700' : '#FFD700'}; font-weight: bold; font-size: 14px;">${displayValue}</span>
                </div>
            `;
        }).join('');
    }

    updateOverallPanelWithPlayerEntry(overallRank, playerId, playerName, finalValue) {
        // Re-populate right panel with player's entry now that we know the accurate rank
        // Use finalValue (after trophy bonus) if provided, otherwise use fishData value
        const valueToUse = finalValue || this.fishData?.value || 0;
        this.populateRightPanelWithAnimation(overallRank, playerId, playerName, valueToUse);
        
        // Trigger climbing animation
        if (overallRank > 0 && overallRank <= 3) {
            setTimeout(() => {
                this.animatePlayerEntryClimbing('right', overallRank);
            }, 100);
        }
    }

    animatePlayerEntryClimbing(side, targetRank) {
        const panel = side === 'left' ? this.leftPanel : this.rightPanel;
        const entries = panel.querySelectorAll('.leaderboard-entry');
        
        entries.forEach((entry, index) => {
            const isPlayer = entry.dataset.isPlayer === 'true';
            const position = index + 1;
            
            if (isPlayer) {
                // Animate player's entry climbing to position
                setTimeout(() => {
                    entry.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    entry.style.transform = 'translateY(0)';
                    entry.style.opacity = '1';
                    
                    // Add a bounce effect
                    setTimeout(() => {
                        entry.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            entry.style.transform = 'scale(1)';
                        }, 150);
                    }, 400);
                }, 100);
            } else if (position >= targetRank) {
                // Animate other entries moving down
                setTimeout(() => {
                    entry.style.transition = 'all 0.6s ease-out';
                    // Entry will naturally move down as player's entry is inserted
                }, 200);
            }
        });
    }

    hide() {
        this.isActive = false;
        if (this.leftPanel) this.leftPanel.style.display = 'none';
        if (this.rightPanel) this.rightPanel.style.display = 'none';
    }
}

// Initialize on load
window.ExperimentalWeighingPanel = new ExperimentalWeighingPanel();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExperimentalWeighingPanel.initialize();
    });
} else {
    window.ExperimentalWeighingPanel.initialize();
}

