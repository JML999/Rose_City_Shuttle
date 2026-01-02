# Block ID Audit Report

## Valid Block IDs from map.json (1-69)

| ID | Name | ID | Name | ID | Name |
|----|------|----|------|----|------|
| 1 | andesite | 24 | pink-concrete | 47 | jungle-block-mossy |
| 2 | azalea-flowering-leaves | 25 | red-mushroom-block | 48 | jungle-block |
| 3 | azalea-leaves | 26 | sand | 49 | jungle-slab |
| 4 | birch-planks | 27 | sandstone | 50 | log |
| 5 | birch-planks-vine | 28 | snow-rocky | 51 | mossy-coblestone |
| 6 | coal-ore | 29 | stone | 52 | oak-planks-dark-knotty |
| 7 | cobblestone | 30 | stone-bricks | 53 | oak-planks-dark |
| 8 | deepslate | 31 | +x | 54 | orange_glazed_terracotta |
| 9 | deepslate-iron-ore | 32 | +z | 55 | prismarine |
| 10 | dirt | 33 | acacia-planks | 56 | red-sandstone |
| 11 | farmland | 34 | blue_coral | 57 | red-terracotta |
| 12 | glass | 35 | blue_glazed_terracotta | 58 | red-wool |
| 13 | grass | 36 | blue-wool | 59 | relic_block |
| 14 | grass-block | 37 | dark-oak-planks | 60 | rune_dirt |
| 15 | grass-flower | 38 | dark-oak-slab | 61 | shadowrock |
| 16 | grass-flower-block | 39 | face_block | 62 | tnt_side |
| 17 | gray-concrete | 40 | ghost-dirt | 63 | void-sand |
| 18 | iron-ore | 41 | green_glazed_terracotta | 64 | voidsoil |
| 19 | mossy-cobblestone | 42 | green-terracotta | 65 | water-flow |
| 20 | mossy-stone-bricks | 43 | green-wool | 66 | water-still |
| 21 | mushroom-stem | 44 | hay | 67 | white-wool |
| 22 | oak-leaves | 45 | jungle-block-damaged | 68 | yellow-wool |
| 23 | oak-planks | 46 | jungle-block-face | 69 | bookshelf |

## ❌ CRITICAL ISSUES FOUND

### 1. Ghost Dirt - WRONG ID
**Location:** `Bait/TerrainDamageManager.ts` and `Bait/TerrainRegenerationManager.ts`
- **Code uses:** ID 52
- **Should be:** ID 40
- **Current map.json:** ID 52 = "oak-planks-dark-knotty", ID 40 = "ghost-dirt"

**Files affected:**
- `Bait/TerrainDamageManager.ts` line 284, 317
- `Bait/TerrainRegenerationManager.ts` line 40, 263

### 2. Rune Dirt - WRONG ID
**Location:** `Bait/TerrainDamageManager.ts` and `Bait/TerrainRegenerationManager.ts`
- **Code uses:** ID 46
- **Should be:** ID 60
- **Current map.json:** ID 46 = "jungle-block-face", ID 60 = "rune_dirt"

**Files affected:**
- `Bait/TerrainDamageManager.ts` line 99 (commented), 299, 332
- `Bait/TerrainRegenerationManager.ts` line 95, 269, 316

### 3. Voidsoil - WRONG ID
**Location:** `Bait/TerrainDamageManager.ts` and `Bait/TerrainRegenerationManager.ts`
- **Code uses:** ID 58
- **Should be:** ID 64
- **Current map.json:** ID 58 = "red-wool", ID 64 = "voidsoil"

**Files affected:**
- `Bait/TerrainDamageManager.ts` line 94, 297, 330
- `Bait/TerrainRegenerationManager.ts` line 89, 279, 288

### 4. Invalid Comment Reference
**Location:** `Bait/TerrainDamageManager.ts` line 94
- **Comment says:** "void soil (ID 76)"
- **Issue:** ID 76 doesn't exist in map.json
- **Should say:** "voidsoil (ID 64)"

### 5. Water Block IDs - WRONG IDs
**Location:** `GamePlayerEntity.ts`
- **Code uses:** IDs 50, 77, 78, 150
- **Should be:** IDs 65, 66
- **Current map.json:**
  - ID 50 = "log" (NOT water!)
  - ID 65 = "water-flow"
  - ID 66 = "water-still"
  - IDs 77, 78, 150 = **DO NOT EXIST**

**Files affected:**
- `GamePlayerEntity.ts` lines 956, 968, 983, 1111

## ✅ CORRECT REFERENCES

These block IDs are correctly referenced:
- ID 10: dirt ✓
- ID 13: grass-block ✓
- ID 14: grass-flower-block ✓
- ID 15: grass-flower ✓
- ID 16: grass-flower-block ✓
- ID 26: sand ✓
- ID 2, 3, 22: leaves (azalea/oak) ✓
- ID 7, 19, 27, 29, 30: stone family ✓

## 📋 SUMMARY

**Total Issues:** 5 critical mismatches
1. Ghost dirt: ID 52 → should be ID 40
2. Rune dirt: ID 46 → should be ID 60
3. Voidsoil: ID 58 → should be ID 64
4. Invalid comment: ID 76 → should be ID 64
5. Water blocks: IDs 50, 77, 78, 150 → should be IDs 65, 66

**Impact:** These mismatches mean:
- Ghost dirt blocks won't work correctly (trying to use oak-planks-dark-knotty instead)
- Rune dirt blocks won't work correctly (trying to use jungle-block-face instead)
- Voidsoil blocks won't work correctly (trying to use red-wool instead)
- Water detection is broken (checking for non-existent block IDs)





