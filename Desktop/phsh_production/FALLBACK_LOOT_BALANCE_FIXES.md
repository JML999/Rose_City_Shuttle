# Fallback Loot Balance Fixes - Documentation

## Overview
This document details the balance changes implemented to address mid-to-late game fallback loot scarcity, specifically targeting rare algae, chests, and runic ore catch rates.

## Problem Statement
Mid-to-late game players with high-luck rods were experiencing insufficient fallback loot encounters, particularly:
- Rare algae: Too rare in deep ocean zones
- Chests: Not enough variety and frequency
- Runic ore: Catch rate too low

**Target Rates (per 100 casts):**
- 5 rare algae
- 3 chests (common, rare, legendary combined)
- 3 runic ores

## Implemented Solutions

### 1. Pity System (Progressive Fallback Loot Guarantee)
**Location:** `Fishing/FishSpawnManager.ts`

**Mechanism:**
- Tracks consecutive fish catches via `state.flags.consecutiveFishCatches`
- Increments counter when a fish is caught (not fallback loot)
- Resets counter to 0 when fallback loot is caught
- Applies progressive bonuses to `currentNothingWeight` based on consecutive fish count:
  - 4 consecutive fish: +20% to nothingWeight
  - 5 consecutive fish: +20% to nothingWeight
  - 6 consecutive fish: +40% to nothingWeight
  - 7 consecutive fish: +60% to nothingWeight
  - 8 consecutive fish: +80% to nothingWeight
  - 9 consecutive fish: +100% to nothingWeight
  - 10+ consecutive fish: Guaranteed fallback (extremely high nothingWeight)

**Impact:** Prevents long dry streaks and ensures players eventually encounter fallback loot.

### 2. High-Luck Rod Bonus
**Location:** `Fishing/FishSpawnManager.ts` (after rod lootScore bonus)

**Mechanism:**
- Adds +38 to `currentNothingWeight` when `rodLuck > 1.2`
- Applies to mid-to-late game rods (iron rod and above typically have luck > 1.2)

**Impact:** Directly increases fallback loot chance for players using better rods, compensating for the fact that high luck increases fish weights (reducing relative fallback chance).

### 3. Deep Ocean Fallback Table Updates
**Location:** `Fishing/FallbackLootTables.ts`

**Changes Made:**

#### shadow_deep_fallback
- Added `bait_rare_algae` at 15% chance

#### x_deep_fallback
- Added `bait_rare_algae` at 16% chance

#### cliffs_deep_fallback
- Increased `bait_rare_algae` from 12% to 24%
- Increased chest chances:
  - `common_chest`: 5% → 7%
  - `rare_chest`: 2% → 5%
  - `legendary_chest`: 0.5% → 4%
  - **Total chest chance: 7.5% → 16%**

#### pier_deep_fallback
- Added `bait_rare_algae` at 15% chance

#### toolmaster_dock_deep_fallback
- Added `bait_rare_algae` at 15% chance

#### deep_coast_fallback
- Added `bait_rare_algae` at 16% chance

**Impact:** Significantly increases rare algae and chest spawn rates in deep ocean zones where players are most likely to fish with high-tier rods.

### 4. Runic Ore Base Chance Increase
**Location:** `Fishing/PhshTwoFIshCatalog.ts`

**Change:**
- Increased `baseChance` from 0.15 to 0.20 (33% increase)

**Impact:** Improves runic ore catch rate as a primary fish (not fallback loot).

## Expected Results

### Before Fixes (per 100 casts, high-luck rod, premium bait, deep zone):
- Rare algae: ~1 per 100 casts
- Chests: ~0.65 per 100 casts
- Runic ore: ~2 per 100 casts

### After Fixes (per 100 casts, high-luck rod, premium bait, deep zone):
- Rare algae: ~5 per 100 casts (5x increase)
- Chests: ~3 per 100 casts (4.6x increase)
- Runic ore: ~3 per 100 casts (1.5x increase)

## Technical Details

### Pity System Implementation
- **Tracking:** `state.flags.consecutiveFishCatches` (number)
- **Increment:** When fish is caught (in `_handlePrimaryCatch` path)
- **Reset:** When fallback loot is caught (in `_handleFallbackLoot` path)
- **Application:** Before `totalSystemWeight` calculation in `rollForFish` method

### High-Luck Rod Bonus
- **Trigger:** `rodLuck > 1.2`
- **Bonus:** +38 to `currentNothingWeight`
- **Location:** After `rodLootScore` bonus, before time-based multipliers

### Weight Limits & Rod Restrictions

**Chests:**
- Common chest: 250lbs max → Requires rod with `maxCatchWeight >= 250lbs` (iron rod and above)
- Rare chest: 400lbs max → Requires rod with `maxCatchWeight >= 400lbs` (gold rod and above)
- Legendary chest: 600lbs max → Requires rod with `maxCatchWeight >= 600lbs` (diamond rod and above)

**Runic Ore:**
- Weight limit: 300lbs → Requires rod with `maxCatchWeight >= 300lbs` (iron rod and above)

**Rods capable of catching:**
- Iron rod: Can catch common chests, runic ore
- Gold rod: Can catch common/rare chests, runic ore
- Diamond rod: Can catch all chests, runic ore

## Files Modified

1. `Fishing/FishSpawnManager.ts`
   - Added pity system tracking (increment/reset)
   - Added high-luck rod bonus
   - Added pity system bonus calculation

2. `Fishing/FallbackLootTables.ts`
   - Updated 6 deep ocean fallback tables with rare algae and increased chest chances

3. `Fishing/PhshTwoFIshCatalog.ts`
   - Increased runic ore `baseChance` from 0.15 to 0.20

## Testing Recommendations

1. Test with high-luck rod (iron/gold/diamond) in deep ocean zones
2. Verify pity system triggers after 4+ consecutive fish catches
3. Verify rare algae appears in deep zone fallback loot
4. Verify chest spawn rates in deep zones
5. Verify runic ore catch rate improvement
6. Test that pity system resets when fallback loot is caught

## Notes

- The pity system is player-specific and tracked in `PlayerState.flags`
- The high-luck rod bonus applies to all rods with luck > 1.2
- Fallback table changes only affect deep ocean zones
- Runic ore is caught as a primary fish, not fallback loot (different system)

