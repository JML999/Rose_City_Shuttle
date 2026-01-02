# Phase 2 Missing Files Report
## Items Added/Changed This Session

### ✅ Files That Exist:
- **Beetle**: `models/npcs/beetle.gltf` ✓, `ui/icons/beetle_sprite.png` ✓
- **Ancient Driftwood**: `ui/icons/ancient_driftwood_sprite.png` ✓
- **Ivory Rod**: `models/items/ivory_rod.gltf` ✓, `ui/icons/ivory_rod_sprite.png` ✓
- **Blue Gill**: `models/npcs/blue_gill.gltf` ✓
- **Gillie Fish**: `models/npcs/gillie_fish.gltf` ✓
- **Yellowfin Tuna**: `models/npcs/yellowfin-tuna.gltf` ✓ (note: hyphen in filename)
- **Mahi-Mahi**: `models/npcs/mahi-mahi.gltf` ✓ (note: hyphen in filename)

### ❌ Missing Model Files:
1. ~~**Sailfish**: `models/npcs/sailfish.gltf`~~ ✅ **FOUND**
2. ~~**Lionfish**: `models/npcs/lionfish.gltf`~~ ✅ **FOUND**
3. ~~**Liongill**: `models/npcs/liongill.gltf`~~ ✅ **REMOVED** (doesn't exist, was a mistake)

### ❌ Missing Sprite Files:
1. **Blue Gill**: `ui/icons/blue_gill_sprite.png` - MISSING
2. **Sailfish**: `ui/icons/sailfish_sprite.png` - MISSING
3. **Mahi-Mahi**: `ui/icons/mahi_mahi_sprite.png` - MISSING
4. **Lionfish**: `ui/icons/lionfish_sprite.png` - MISSING
5. **Yellowfin Tuna**: `ui/icons/yellowfin_tuna_sprite.png` - MISSING
6. **Gillie Fish**: `ui/icons/gillie_fish_sprite.png` - MISSING

### ⚠️ Path Mismatches (FIXED):
1. ~~**Ivory Rod**: Catalog uses `modelId: 'ivory-rod'` but file is `ivory_rod.gltf`~~ ✅ **FIXED**: Updated catalog to use `modelId: 'ivory_rod'`

2. **Yellowfin Tuna**: Catalog uses `modelUri: 'models/npcs/yellowfin-tuna.gltf'` ✓ (matches file)
   - But catalog ID is `yellowfin_tuna` (underscore) while filename uses hyphen
   - This is OK as long as modelUri matches

3. **Mahi-Mahi**: Catalog uses `modelUri: 'models/npcs/mahi-mahi.gltf'` ✓ (matches file)
   - But catalog ID is `mahi_mahi` (underscore) while filename uses hyphen
   - This is OK as long as modelUri matches

## Summary
- **Total Missing**: 6 sprite files (all models now exist!)
- **Path Issues**: 0 (all fixed)
- **Removed**: Liongill entry (doesn't exist, was a mistake - only Lionfish exists)

