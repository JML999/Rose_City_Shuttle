# Fishing Balance Changes - Realistic Probability Distribution

## Overview
This document describes the fishing probability rebalancing to create a realistic distribution where small schooling fish are most common, funneling down to larger predators. Big fish should still be catchable frequently, but not dominate the catch rates.

## Problem Statement
Previously, trophy fish (rare/epic) were dominating catch rates in deep zones, with weights of 10-12 making them more common than small common fish. This created an unrealistic experience where players caught rare fish more often than common fish.

## Solution: Realistic Fish Pyramid

### Fish Hierarchy (Most Common → Least Common)

**Tier 1: Small Schooling Fish (50-60% of catches)**
- Mackerel (1-5lbs, common)
- Blue Fish (3-8lbs, common)
- Clownfish (1-5lbs, common)
- Flounder (6-25lbs, common)
- Green Jellyfish (6-8lbs, uncommon)
- Rainbowfish (4-15lbs, rare)

**Tier 2: Medium-Large Predators (20-25% of catches)**
- Grouper (25-850lbs, rare, trophy)
- Red Snapper (75-250lbs, rare, trophy)
- Yellowtail Snapper (75-300lbs, rare, trophy)
- Sea Bass (80-180lbs, rare, trophy)
- Shipjack Tuna (126-850lbs, rare, trophy)
- Squid (10-1000lbs, rare, trophy)
- Marlin (85-1000lbs, rare, trophy)
- Puffer Fish (6-50lbs, rare, trophy)

**Tier 3: Epic Predators (10-15% of catches)**
- Great White Shark (500-1750lbs, epic, trophy)
- Dune Shark (40-850lbs, epic, trophy)
- Hammerhead Shark (85-1500lbs, epic, trophy)
- Koi Shark (100-1000lbs, epic)
- Sawfish (250-1250lbs, epic, trophy)
- Glass Anglerfish (2-8lbs, epic, trophy)

**Tier 4: Legendary Apex Predators (3-5% of catches)**
- Glass Squid (10-1000lbs, legendary, trophy)
- Ghost Shark (500-1350lbs, legendary, trophy)
- Vampire Squid (10-1000lbs, legendary, trophy)
- Ghost Pufferfish (3-100lbs, legendary, trophy)

## Changes Made

### Deep Zones Affected
- X Deep
- Pier Deep
- Cliffs Deep
- Shadow Deep
- Rock Deep
- Toolmaster Dock Deep

### 1. Small Schooling Fish - ADDED to Deep Zones

**Mackerel:**
- Added `x_deep: 25` (was 0)
- Added `pier_deep: 25` (was 6, increased)
- Added `cliffs_deep: 25` (was 0)
- Added `shadow_deep: 25` (was 1, increased)
- Added `rock_deep: 25` (was 8, increased)
- Added `toolmaster_dock_deep: 25` (was 8, increased)

**Blue Fish:**
- Added `x_deep: 20` (was 0)
- Added `pier_deep: 20` (was 0)
- Added `cliffs_deep: 20` (was 0)
- Added `shadow_deep: 20` (was 0)
- Added `rock_deep: 20` (was 10, increased)
- Added `toolmaster_dock_deep: 20` (was 0)

**Clownfish:**
- Added `x_deep: 20` (was 0)
- Added `pier_deep: 20` (was 0)
- Added `cliffs_deep: 20` (was 0)
- Added `shadow_deep: 20` (was 0)
- Added `rock_deep: 20` (was 0)
- Added `toolmaster_dock_deep: 20` (was 0)

**Flounder:**
- Added `x_deep: 15` (was 0)
- Added `pier_deep: 15` (was 0)
- Added `cliffs_deep: 15` (was 0)
- Added `shadow_deep: 15` (was 0)
- Added `rock_deep: 15` (was 0)
- Added `toolmaster_dock_deep: 15` (was 0)

**Green Jellyfish:**
- Added `x_deep: 12` (was 0)
- Added `pier_deep: 12` (was 0)
- Added `cliffs_deep: 12` (was 0)
- Added `shadow_deep: 12` (was 0)
- Added `rock_deep: 12` (was 0)
- Added `toolmaster_dock_deep: 12` (was 0)

**Rainbowfish:**
- Added `x_deep: 10` (was 0, currently only in pier_deep, shadow_deep, rock_deep)
- Added `cliffs_deep: 10` (was 0)
- Added `toolmaster_dock_deep: 10` (was 0)
- Keep existing: `pier_deep: 10`, `shadow_deep: 10`, `rock_deep: 10`

### 2. Medium-Large Predators - REDUCED in Deep Zones

**Yellowtail Snapper:**
- `x_deep: 12 → 5` (58% reduction)
- `pier_deep: 2 → 2` (keep same)
- Other zones: Keep existing or reduce proportionally

**Red Snapper:**
- `x_deep: 12 → 5` (58% reduction)
- `cliffs_deep: 12 → 5` (58% reduction)
- `pier_deep: 12 → 5` (58% reduction)
- `mud_isle: 12 → 5` (58% reduction)
- `toolmaster_dock_deep: 4 → 3` (25% reduction)
- `toolmaster_isle: 4 → 3` (25% reduction)
- `rock_deep: 2 → 1` (50% reduction)

**Grouper:**
- `x_deep: 10 → 6` (40% reduction)
- `mud_isle: 10 → 6` (40% reduction)
- `pier_deep: 10 → 6` (40% reduction)
- `toolmaster_dock_deep: 10 → 6` (40% reduction)
- `toolmaster_isle: 10 → 6` (40% reduction)
- `toolmaster_island: 10 → 6` (40% reduction)
- `tree_isle: 10 → 6` (40% reduction)
- `shadow_isle: 10 → 6` (40% reduction)
- `shadow_deep: 10 → 6` (40% reduction)
- `cliffs_deep: 10 → 6` (40% reduction)
- `big_island: 1 → 1` (keep same)

**Sea Bass:**
- `x_deep: 12 → 5` (58% reduction)
- `pier_deep: 12 → 5` (58% reduction)
- `mud_isle: 12 → 5` (58% reduction)
- `toolmaster_dock_deep: 4 → 3` (25% reduction)
- `toolmaster_isle: 4 → 3` (25% reduction)
- `tree_isle: 7 → 4` (43% reduction)
- `rock_deep: 2 → 1` (50% reduction)
- `toolmaster_island: 2 → 1` (50% reduction)

**Squid:**
- `x_deep: 12 → 5` (58% reduction)
- `cliffs_deep: 12 → 5` (58% reduction)
- `pier_deep: 12 → 5` (58% reduction)
- `mud_isle: 12 → 5` (58% reduction)
- `toolmaster_dock_deep: 4 → 3` (25% reduction)
- `toolmaster_isle: 4 → 3` (25% reduction)
- `toolmaster_island: 4 → 3` (25% reduction)
- `rock_deep: 2 → 1` (50% reduction)

**Shipjack Tuna:**
- `x_deep: 5 → 4` (20% reduction)
- `mud_isle: 5 → 4` (20% reduction)
- `pier_deep: 10 → 6` (40% reduction)
- `toolmaster_dock_deep: 8 → 5` (38% reduction)
- Other zones: Keep similar or reduce slightly

**Marlin:**
- `x_deep: 3 → 2` (33% reduction)
- `toolmaster_dock_deep: 10 → 4` (60% reduction)
- `pier_deep: 3 → 2` (33% reduction)
- `shadow_deep: 3 → 2` (33% reduction)
- `rock_deep: 7 → 3` (57% reduction)
- `mud_isle: 2 → 1` (50% reduction)

**Puffer Fish:**
- `x_deep: 10 → 4` (60% reduction)
- `mud_isle: 10 → 4` (60% reduction)
- `tree_isle: 10 → 4` (60% reduction)
- `toolmaster_island: 10 → 4` (60% reduction)
- `toolmaster_dock_deep: 10 → 4` (60% reduction)
- `rock_deep: 10 → 4` (60% reduction)
- `cliffs_deep: 10 → 4` (60% reduction)
- `pier_deep: 10 → 4` (60% reduction)

### 3. Epic Predators - KEPT RARE BUT CATCHABLE

**Great White Shark:**
- `pier_deep: 12 → 2` (83% reduction)
- `rock_deep: 2 → 1` (50% reduction)
- Add to other deep zones with weight 1-2 if missing

**Dune Shark:**
- `x_deep: 3 → 2` (33% reduction)
- `x_isle: 2 → 2` (keep same)
- Keep appropriately rare

**Hammerhead Shark:**
- Keep existing weights (zone-specific)
- `tree_isle: 4 → 3` (25% reduction)
- `toolmaster_island: 2 → 1` (50% reduction)

**Koi Shark:**
- Keep existing (zone-specific to Toolmaster areas)
- `toolmaster_island: 8 → 5` (38% reduction)
- `toolmaster_dock_deep: 12 → 6` (50% reduction)

**Sawfish:**
- `x_isle: 4 → 3` (25% reduction)
- `tree_isle: 4 → 3` (25% reduction)
- `mud_isle: 4 → 3` (25% reduction)
- `shadow_isle: 4 → 3` (25% reduction)
- `rock_deep: 2 → 1` (50% reduction)

**Glass Anglerfish:**
- Keep existing (zone-specific, night only)
- `tree_isle: 8 → 5` (38% reduction)
- `shadow_deep: 3 → 2` (33% reduction)
- `toolmaster_island: 2 → 1` (50% reduction)

### 4. Legendary Apex Predators - KEPT VERY RARE

**Glass Squid:**
- `cliffs_deep: 10 → 3` (70% reduction)
- `shadow_deep: 8 → 2` (75% reduction)
- `rock_deep: 8 → 2` (75% reduction)
- `pier_deep: 6 → 2` (67% reduction)

**Ghost Shark:**
- `shadow_deep: 8 → 2` (75% reduction)
- Keep very rare (legendary rarity)

**Vampire Squid:**
- `shadow_isle: 3 → 1` (67% reduction)
- `shadow_deep: 2 → 1` (50% reduction)
- `rock_deep: 1 → 0.5` (50% reduction)
- Keep very rare (legendary rarity, night only)

**Ghost Pufferfish:**
- Keep existing (no region tags, very rare, night only)

## Expected Results

### X Deep Zone Example (with Worm bait 1.15x):

**Before Changes:**
- Trophy fish: 13-14 weight each (7-8% probability each)
- Common fish: 5 weight (2.9% probability)
- Result: Trophy fish 2.6x more common than common fish

**After Changes:**
- Small fish: 25-28 weight each (12-14% probability each)
- Medium predators: 4-6 weight (2-3% probability each)
- Epic predators: 1-2 weight (0.5-1% probability each) - **NOW AVAILABLE IN ALL DEEP ZONES**
- Result: Small fish dominate, but big fish still catchable

**Probability Distribution:**
- Small fish: ~50% of catches
- Medium predators: ~18% of catches (every ~5-6 casts)
- Epic predators: ~1.5% of catches (every ~67 casts) - **NOW AVAILABLE IN ALL DEEP ZONES**
- Legendary: ~0.2% of catches (every ~500 casts) - **NOW AVAILABLE IN MORE DEEP ZONES**

### Additional Changes (Post-Initial Implementation):

**Epic Predators - Added to All Deep Zones:**
- Great White Shark: Added to `x_deep`, `cliffs_deep`, `shadow_deep`, `toolmaster_dock_deep`
- Dune Shark: Added to `pier_deep`, `cliffs_deep`, `shadow_deep`, `rock_deep`, `toolmaster_dock_deep`
- Sawfish: Added to `x_deep`, `pier_deep`, `cliffs_deep`, `shadow_deep`, `toolmaster_dock_deep`
- Hammerhead Shark: Added to all deep zones
- Koi Shark: Added to all deep zones (except toolmaster zones where it already exists)

**Legendary Predators - Added to More Deep Zones:**
- Glass Squid: Added to `x_deep`, `toolmaster_dock_deep`
- Ghost Shark: Added to `cliffs_deep`, `rock_deep`, `pier_deep`, `x_deep`

## Iteration Notes

### What to Monitor:
1. **Small fish catch rate** - Should be 50-60% of all catches in deep zones
2. **Medium predator frequency** - Should feel frequent but not dominant (every 5-10 casts)
3. **Epic predator rarity** - Should feel special when caught (every 50-100 casts)
4. **Legendary rarity** - Should feel extremely special (every 300-500 casts)
5. **Fallback loot rate** - Should remain around 30-35% to ensure chests/ores/algae still appear

### Potential Adjustments:
- If small fish too common: Reduce weights by 20-30%
- If medium predators too rare: Increase weights by 1-2 points
- If epic predators too common: Reduce weights by 50%
- If legendary too common: Reduce weights by 50-75%

### Testing Recommendations:
1. Test in X Deep zone (most problematic zone)
2. Test in Cliffs Deep zone (large deep zone)
3. Test in Pier Deep zone (another deep zone)
4. Verify small fish dominate but big fish still catchable
5. Verify fallback loot rate remains healthy

## Files Modified
- `Fishing/PhshTwoFIshCatalog.ts` - Updated region tag weights for all affected fish

## Additional Reductions (Post-Testing)

After initial testing showed trophy fish were still too common (catching 4 in a row), we applied a second round of reductions:

### Medium Predators - Further Reduced by 40-50%:

**Red Snapper:**
- Deep zones: `5 → 3` (40% reduction)
- Other zones: `3 → 2` (33% reduction)

**Grouper:**
- `baseChance: 3 → 1` (67% reduction)
- All deep zones: `6 → 3` (50% reduction)

**Yellowtail Snapper:**
- `x_deep: 5 → 3` (40% reduction)
- `pier_deep: 2 → 1` (50% reduction)

**Squid:**
- Deep zones: `5 → 3` (40% reduction)
- Other zones: `3 → 2` (33% reduction)

**Sea Bass:**
- Deep zones: `5 → 3` (40% reduction)
- Other zones: `4 → 2` (50% reduction), `3 → 2` (33% reduction)

**Shipjack Tuna:**
- `x_deep: 4 → 2` (50% reduction)
- `pier_deep: 6 → 3` (50% reduction)
- Other zones: `3 → 2` (33% reduction), `2 → 1` (50% reduction)

**Marlin:**
- `rock_deep: 3 → 2` (33% reduction)
- `toolmaster_dock_deep: 4 → 2` (50% reduction)
- Other zones: `2 → 1` (50% reduction)

**Puffer Fish:**
- All zones: `4 → 2` (50% reduction)

### Expected New Distribution:

**Before Second Reduction:**
- Small fish: ~54.7%
- Medium predators: ~23.5% (too high, catching consecutively)
- Epic predators: ~2.6%
- Legendary: 0%

**After Second Reduction:**
- Small fish: ~60-65% (increased dominance)
- Medium predators: ~12-15% (reduced from 23.5%)
- Epic predators: ~2-3%
- Legendary: ~0.5-1%

This should prevent consecutive trophy fish catches while still allowing them to be caught frequently enough to feel rewarding.

## Additional Balance Adjustments (Post-Testing)

### Shrimp Bait Boost Reduction
- **Changed**: `baseLuck: 1.5 → 1.25` (50% → 25% boost)
- **Reason**: The 50% boost was making all fish (including trophy fish) too common. Reducing to 25% creates better balance while still providing a meaningful premium bait advantage.
- **File**: `Bait/BaitCatalog.ts`

### Base NothingWeight Increase
- **Changed**: `currentNothingWeight: 45 → 65` (44% increase)
- **Reason**: To absorb the probability removed from medium predators and increase fallback loot (chests, ores, algae) rates. This ensures players still get valuable loot even when not catching fish.
- **File**: `Fishing/FishSpawnManager.ts`

### Expected Impact:
- **Fish catch rate**: Slightly reduced (due to lower bait boost and higher nothingWeight)
- **Fallback loot rate**: Increased from ~20% to ~25-30%
- **Trophy fish frequency**: Further reduced (due to lower bait multiplier)
- **Epic/Legendary rarity**: Maintained (still appropriately rare)

## Date
2025-01-17 (Initial changes)
2025-01-17 (Additional reductions for trophy fish)
2025-01-17 (Shrimp bait and nothingWeight adjustments)

