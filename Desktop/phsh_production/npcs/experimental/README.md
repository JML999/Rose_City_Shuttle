# Experimental Weighing System

This directory contains an experimental hybrid weighing system that uses **Scene UIs** (for the central scale display) + **Overlay UIs** (for side leaderboard panels).

## Overview

The experimental system provides:
- **Central Scale Display**: Scene UI attached to the collector NPC showing weight counting up with oscillation
- **Side Leaderboard Panels**: Overlay UI panels on left/right screen edges showing top 3 species and top 3 overall
- **Milestone Celebrations**: Emoji reactions when passing rank thresholds (🥇🥈🥉💎)

## Files

- `ExperimentalWeighingManager.ts` - Server-side manager for the experimental weighing ceremony
- `../assets/ui/panels/ExperimentalWeighingPanel.js` - Client-side overlay UI for side panels
- Scene UI template registered in `../assets/ui/index.html`

## How to Enable

1. Open `CollectorDialogNpc.ts`
2. Find the flag at the top:
   ```typescript
   const USE_EXPERIMENTAL_WEIGHING = false;
   ```
3. Change it to:
   ```typescript
   const USE_EXPERIMENTAL_WEIGHING = true;
   ```

## How to Revert

1. Set `USE_EXPERIMENTAL_WEIGHING = false` in `CollectorDialogNpc.ts`
2. The system will automatically fall back to the original full-screen overlay

## Architecture

### Server-Side (`ExperimentalWeighingManager.ts`)
- Manages Scene UI lifecycle (scale display above collector)
- Handles weight counting animation with oscillation
- Tracks milestone crossings and triggers emoji celebrations
- Coordinates with overlay UI via `player.ui.sendData()`

### Client-Side (`ExperimentalWeighingPanel.js`)
- Creates and manages side leaderboard panels (Overlay UI)
- Updates in real-time as weight counts up
- Highlights current rank as milestones are passed
- Displays milestone emoji celebrations

### Scene UI Template (`index.html`)
- Registered as `experimental-weighing-scale`
- Displays fish name and animated weight value
- Oscillates during counting animation

## Integration Point

The experimental system is integrated in `CollectorDialogNpc.startWeighingProcess()`:
- If `USE_EXPERIMENTAL_WEIGHING === true`, routes to `startExperimentalWeighingProcess()`
- Otherwise, uses the original `startWeighingProcess()` flow

## Notes

- The experimental system is **completely separate** from the original system
- No changes were made to the original weighing code
- Easy to revert by simply changing the flag
- All experimental code is clearly marked with `// EXPERIMENTAL:` comments



