/**
 * fix-entity-coordinates.js
 * 
 * PURPOSE:
 * This script fixes two issues in assets/map.json:
 * 
 * 1. ENTITY COORDINATE OFFSET FIX:
 *    - The game engine applies a -0.5 offset to entity X and Z coordinates when spawning
 *    - This script compensates by adding +0.5 to all entity X and Z coordinates in map.json
 *    - Y coordinates remain unchanged
 *    - Example: Entity at "-71,23.5,19" becomes "-70.5,23.5,19.5"
 * 
 * 2. STAIRS MODEL PREFERRED SHAPE FIX:
 *    - Stairs entities need modelPreferredShape set to "wedge" instead of "trimesh"
 *    - This script automatically detects entities with "stairs" in their modelUri
 *    - Updates their modelPreferredShape from "trimesh" to "wedge"
 * 
 * WHEN TO RUN:
 * - After uploading a new map.json file
 * - If entities are spawning with a -0.5x and -0.5z offset
 * - If stairs models are not rendering correctly
 * 
 * HOW TO RUN:
 *   node fix-entity-coordinates.js
 * 
 * WHAT IT DOES:
 * - Reads assets/map.json
 * - Adjusts all entity coordinate keys (adds 0.5 to X and Z)
 * - Updates stairs entities to use "wedge" modelPreferredShape
 * - Writes the updated map.json back to disk
 * 
 * NOTE: This script modifies map.json in place. Make sure to backup before running
 * if you need to preserve the original coordinates.
 */

const fs = require('fs');
const path = require('path');

console.log('Reading map.json...');
const mapPath = path.join(__dirname, 'assets', 'map.json');

// Read the file as a string first to preserve formatting
let mapContent = fs.readFileSync(mapPath, 'utf8');

console.log('Parsing JSON...');
const mapData = JSON.parse(mapContent);

console.log(`Found ${Object.keys(mapData.entities || {}).length} entities to adjust`);

// Create a new entities object with adjusted coordinates
const adjustedEntities = {};
let adjustedCount = 0;
let stairsUpdatedCount = 0;

for (const [key, value] of Object.entries(mapData.entities || {})) {
    // Parse the coordinate string (format: "x,y,z")
    const coords = key.split(',').map(Number);
    
    if (coords.length !== 3) {
        console.warn(`Skipping invalid coordinate key: ${key}`);
        adjustedEntities[key] = value; // Keep original if invalid
        continue;
    }
    
    // Add 0.5 to x and z coordinates
    const adjustedX = coords[0] + 0.5;
    const adjustedY = coords[1]; // Y stays the same
    const adjustedZ = coords[2] + 0.5;
    
    // Create new key with adjusted coordinates
    const newKey = `${adjustedX},${adjustedY},${adjustedZ}`;
    
    // Deep copy the entity data
    const entityData = JSON.parse(JSON.stringify(value));
    
    // Check if this is a stairs entity and update modelPreferredShape
    if (entityData.modelUri && entityData.modelUri.toLowerCase().includes('stairs')) {
        entityData.modelPreferredShape = 'wedge';
        stairsUpdatedCount++;
        if (stairsUpdatedCount === 1 || stairsUpdatedCount % 10 === 0) {
            console.log(`Updated stairs entity ${stairsUpdatedCount}: ${entityData.modelUri}`);
        }
    }
    
    // Copy the entity data to the new key
    adjustedEntities[newKey] = entityData;
    adjustedCount++;
    
    if (adjustedCount % 100 === 0) {
        console.log(`Adjusted ${adjustedCount} entities...`);
    }
}

// Replace the entities in the map data
mapData.entities = adjustedEntities;

console.log(`\nAdjusted ${adjustedCount} entity coordinates`);
console.log(`Updated ${stairsUpdatedCount} stairs entities to use 'wedge' modelPreferredShape`);
console.log('Writing updated map.json...');

// Write the adjusted map back to file with proper formatting
fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2), 'utf8');

console.log('Entity coordinates adjusted successfully!');
console.log(`All X and Z coordinates have been increased by 0.5 to compensate for the engine's offset.`);
console.log(`All stairs entities now use 'wedge' as modelPreferredShape.`);

