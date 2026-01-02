# Test Player Data Files

This directory contains test player data files to verify the rod count and quest migration logic.

## Test Players

### player-1.json
- **Rods**: 0 rods
- **Quests**: No fitz quests
- **Expected Behavior**: All rods and fitz quests wiped, player starts fresh with new onboarding

### player-2.json
- **Rods**: 1 rod (beginner-rod)
- **Quests**: No fitz quests
- **Expected Behavior**: All rods and fitz quests wiped, player starts fresh with new onboarding

### player-3.json
- **Rods**: 2 rods (beginner-rod + oak_rod)
- **Quests**: No fitz quests completed
- **Expected Behavior**: Rods preserved, player goes through new onboarding (getting started quest), arrows point to Fitz

### player-4.json
- **Rods**: 2 rods (oak_rod + light_rod)
- **Quests**: Completed old `fitz_quest_1_sardines`
- **Expected Behavior**: 
  - Rods preserved
  - `fitz_quest_getting_started` auto-completed (because old sardine quest was completed)
  - Player can access `fitz_quest_2_kelp_eel` quest

### player-5.json
- **Rods**: 2 rods (oak_rod + deepcaster_rod)
- **Quests**: Completed `fitz_quest_getting_started`
- **Expected Behavior**: 
  - Rods preserved
  - Player can access `fitz_quest_2_kelp_eel` quest (prerequisite met)

## Implementation Details

### Rod Count Logic
- **0-1 rods**: Wipe all rods and all fitz quests → fresh start
- **2+ rods**: Preserve rods, migrate quest data if needed

### Quest Migration
- If player has `fitz_quest_1_sardines` completed but not `fitz_quest_getting_started`, auto-complete the new quest
- Kelp eel quest (`fitz_quest_2_kelp_eel`) accepts either:
  - `fitz_quest_1_sardines` (old quest) OR
  - `fitz_quest_getting_started` (new quest)

### Files Modified
1. `PlayerStateManager.ts` - Added rod count check and data wipe/migration logic in `applyPersistedData()`
2. `QuestManager.ts` - Updated `isQuestAvailable()` to accept either old or new quest for kelp eel prerequisite





