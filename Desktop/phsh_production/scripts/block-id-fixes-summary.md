# Block ID Consistency Fixes - Complete

## Fixed Block ID Mappings

### TerrainDamageManager.ts Changes:
1. **Dirt**: Changed from ID 10 → ID 11 (ID 10 is actually "deepslate-iron-ore")
2. **Grass-block**: Changed from ID 13 → ID 15 (ID 13 is actually "glass")
3. **Grass-flower-block**: Changed from ID 14 → ID 17 (ID 14 is actually "grass")
4. **Grass-flower**: Changed from ID 15 → ID 16 (ID 15 is actually "grass-block")
5. **Grass**: Changed from ID 16 → ID 14 (ID 16 is actually "grass-flower")
6. **Oak-leaves**: Removed ID 22 (ID 22 is actually "mushroom-stem"), kept ID 23
7. **Sand**: Changed from ID 26 → ID 28 (ID 26 is actually "pink-concrete")
8. **Voidsoil**: Changed from ID 58 → ID 72 (ID 58 is actually "mossy-coblestone")
9. **Ghost-dirt**: Removed ID 52 (ID 52 is actually "jungle-block-face"), kept ID 46
10. **Rune_dirt**: Changed from ID 46 → ID 67 (ID 46 is actually "ghost-dirt")

### TerrainRegenerationManager.ts Changes:
- Updated all block IDs in `BLOCK_CONFIGS` to match map.json
- Updated all block IDs in special rules functions:
  - `dirtSpecialRules()`: 52→46, 46→67
  - `grassSpecialRules()`: 58→72, 16→14
  - `voidSoilSpecialRules()`: 58→72, 16→14, 10→11, 13→15, 14→17, 15→16
  - `runeDirtSpecialRules()`: 46→67, 10→11
- Updated void-sand from ID 57 → ID 71

### Correct Block IDs (from map.json):
- **2**: azalea-flowering-leaves ✓
- **3**: azalea-leaves ✓
- **11**: dirt ✓
- **14**: grass ✓
- **15**: grass-block ✓
- **16**: grass-flower ✓
- **17**: grass-flower-block ✓
- **23**: oak-leaves ✓
- **28**: sand ✓
- **46**: ghost-dirt ✓
- **67**: rune_dirt ✓
- **71**: void-sand ✓
- **72**: voidsoil ✓

### Updated Functions:
- `TerrainDamageManager.BLOCK_LOOT_TABLES`: Updated all block IDs
- `TerrainDamageManager.canBlockBeDamaged()`: Updated all block IDs
- `TerrainDamageManager.getBreakThreshold()`: Updated all block IDs
- `TerrainRegenerationManager.BLOCK_CONFIGS`: Updated all block IDs
- `TerrainRegenerationManager.dirtSpecialRules()`: Updated all block IDs
- `TerrainRegenerationManager.grassSpecialRules()`: Updated all block IDs
- `TerrainRegenerationManager.voidSoilSpecialRules()`: Updated all block IDs
- `TerrainRegenerationManager.runeDirtSpecialRules()`: Updated all block IDs

All block IDs are now consistent with map.json blockTypes across both files.
