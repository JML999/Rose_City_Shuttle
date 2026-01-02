# Map Entity Coordinate Fix Script

## Overview

The `fix-entity-coordinates.js` script is used to fix entity positioning and model shape issues in `assets/map.json`.

## Purpose

This script addresses two issues:

### 1. Entity Coordinate Offset Fix

**Problem:** The game engine applies a -0.5 offset to entity X and Z coordinates when spawning entities from `map.json`. This causes entities to appear 0.5 blocks off from their intended position.

**Solution:** The script compensates by adding +0.5 to all entity X and Z coordinates in `map.json` before the engine applies its offset, resulting in correct positioning.

**Example:**
- Original coordinate: `"-71,23.5,19"`
- After script: `"-70.5,23.5,19.5"`
- After engine offset: `"-71,23.5,19"` ✓ (correct position)

**Note:** Y coordinates are NOT adjusted as the engine doesn't apply an offset to the Y axis.

### 2. Stairs Model Preferred Shape Fix

**Problem:** Stairs entities need `modelPreferredShape` set to `"wedge"` instead of `"trimesh"` to render correctly.

**Solution:** The script automatically detects entities with "stairs" in their `modelUri` and updates their `modelPreferredShape` to `"wedge"`.

## When to Run

Run this script:
- After uploading a new `map.json` file
- If you notice entities spawning with a -0.5x and -0.5z offset
- If stairs models are not rendering correctly (appearing as trimesh instead of wedge)

## How to Run

```bash
node fix-entity-coordinates.js
```

The script will:
1. Read `assets/map.json`
2. Process all entities
3. Adjust coordinates (X and Z +0.5)
4. Update stairs entities to use "wedge"
5. Write the updated file back to disk

## Output

The script provides console output showing:
- Total number of entities processed
- Number of stairs entities updated
- Progress updates every 100 entities

Example output:
```
Reading map.json...
Parsing JSON...
Found 175 entities to adjust
Updated stairs entity 1: models/environment/mossy stone brick stairs.gltf
...
Adjusted 175 entity coordinates
Updated 104 stairs entities to use 'wedge' modelPreferredShape
Writing updated map.json...
Entity coordinates adjusted successfully!
```

## Important Notes

1. **Backup First:** This script modifies `map.json` in place. Consider backing up the file before running if you need to preserve original coordinates.

2. **Coordinate Format:** Entities in `map.json` use string keys in the format `"x,y,z"` (e.g., `"-71,23.5,19"`).

3. **Stairs Detection:** The script detects stairs by checking if the `modelUri` contains the word "stairs" (case-insensitive).

4. **Reversible:** If needed, you can reverse the coordinate adjustment by subtracting 0.5 from X and Z coordinates, but this is not automated.

## Related Files

- `assets/map.json` - The map file containing entity definitions
- `fix-entity-coordinates.js` - The script that performs the fixes

## History

This script was created to fix entity positioning issues discovered during development. The engine's coordinate offset was causing entities to spawn in incorrect positions, and stairs models needed their preferred shape updated for proper rendering.



