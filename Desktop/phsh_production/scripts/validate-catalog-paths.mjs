#!/usr/bin/env bun
/**
 * Catalog Path Validator
 * 
 * Validates that all file paths referenced in catalogs (models, sprites) actually exist.
 * Uses Bun to import TypeScript catalogs directly.
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base paths
const ASSETS_DIR = join(__dirname, '..', 'assets');
const MODELS_DIR = join(ASSETS_DIR, 'models');
const UI_ICONS_DIR = join(ASSETS_DIR, 'ui', 'icons');

const results = [];

/**
 * Resolve a model path to an actual file path
 */
function resolveModelPath(modelPath, catalogType) {
    // If it's already a full path starting with "models/"
    if (modelPath.startsWith('models/')) {
        return join(ASSETS_DIR, modelPath);
    }
    
    // For rods, convert ID to models/items/${id}.gltf
    if (catalogType === 'rod') {
        return join(MODELS_DIR, 'items', `${modelPath}.gltf`);
    }
    
    // For bait, check if it's a full path or needs conversion
    if (catalogType === 'bait') {
        // If it looks like just an ID, try models/items first, then models/npcs
        if (!modelPath.includes('/')) {
            const itemsPath = join(MODELS_DIR, 'items', `${modelPath}.gltf`);
            if (existsSync(itemsPath)) return itemsPath;
            const npcsPath = join(MODELS_DIR, 'npcs', `${modelPath}.gltf`);
            if (existsSync(npcsPath)) return npcsPath;
            return itemsPath; // Return first guess for error reporting
        }
        // If it's a full path, use it
        if (modelPath.startsWith('models/')) {
            return join(ASSETS_DIR, modelPath);
        }
    }
    
    return null;
}

/**
 * Resolve a sprite path to an actual file path
 */
function resolveSpritePath(spritePath) {
    return join(UI_ICONS_DIR, spritePath);
}

/**
 * Check if a file exists (including .gltf and .glb variants)
 */
function checkFileExists(filePath) {
    if (existsSync(filePath)) {
        return { exists: true, actualPath: filePath };
    }
    
    // Check for .glb variant if .gltf
    if (filePath.endsWith('.gltf')) {
        const glbPath = filePath.replace(/\.gltf$/, '.glb');
        if (existsSync(glbPath)) {
            return { exists: true, actualPath: glbPath };
        }
    }
    
    // Check for .gltf variant if .glb
    if (filePath.endsWith('.glb')) {
        const gltfPath = filePath.replace(/\.glb$/, '.gltf');
        if (existsSync(gltfPath)) {
            return { exists: true, actualPath: gltfPath };
        }
    }
    
    return { exists: false, actualPath: filePath };
}

/**
 * Validate LootCatalog
 */
async function validateLootCatalog() {
    try {
        const { LOOT_CATALOG } = await import('../Fishing/LootCatalog.ts');
        
        for (const item of LOOT_CATALOG) {
            // Check modelUri
            const modelPath = join(ASSETS_DIR, item.modelUri);
            const modelCheck = checkFileExists(modelPath);
            results.push({
                catalog: 'LootCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'model',
                path: item.modelUri,
                exists: modelCheck.exists,
                resolvedPath: modelCheck.actualPath
            });
            
            // Check sprite
            const spritePath = resolveSpritePath(item.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'LootCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'sprite',
                path: item.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating LootCatalog:', error.message);
    }
}

/**
 * Validate FishCatalog
 */
async function validateFishCatalog() {
    try {
        const { FISH_CATALOG } = await import('../Fishing/PhshTwoFIshCatalog.ts');
        
        for (const fish of FISH_CATALOG) {
            // Check modelUri
            const modelPath = join(ASSETS_DIR, fish.modelData.modelUri);
            const modelCheck = checkFileExists(modelPath);
            results.push({
                catalog: 'FishCatalog',
                itemId: fish.id,
                itemName: fish.name,
                pathType: 'model',
                path: fish.modelData.modelUri,
                exists: modelCheck.exists,
                resolvedPath: modelCheck.actualPath
            });
            
            // Check sprite
            const spritePath = resolveSpritePath(fish.modelData.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'FishCatalog',
                itemId: fish.id,
                itemName: fish.name,
                pathType: 'sprite',
                path: fish.modelData.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating FishCatalog:', error.message);
    }
}

/**
 * Validate BaitCatalog
 */
async function validateBaitCatalog() {
    try {
        const { BAIT_CATALOG } = await import('../Bait/BaitCatalog.ts');
        
        for (const [id, bait] of Object.entries(BAIT_CATALOG)) {
            // Check modelId
            let modelPath = null;
            if (bait.modelId.startsWith('models/')) {
                modelPath = join(ASSETS_DIR, bait.modelId);
            } else {
                modelPath = resolveModelPath(bait.modelId, 'bait');
            }
            
            if (modelPath) {
                const modelCheck = checkFileExists(modelPath);
                results.push({
                    catalog: 'BaitCatalog',
                    itemId: id,
                    itemName: bait.name,
                    pathType: 'model',
                    path: bait.modelId,
                    exists: modelCheck.exists,
                    resolvedPath: modelCheck.actualPath
                });
            }
            
            // Check sprite
            const spritePath = resolveSpritePath(bait.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'BaitCatalog',
                itemId: id,
                itemName: bait.name,
                pathType: 'sprite',
                path: bait.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating BaitCatalog:', error.message);
    }
}

/**
 * Validate RodCatalog
 */
async function validateRodCatalog() {
    try {
        const { FISHING_RODS } = await import('../Inventory/RodCatalog.ts');
        
        for (const rod of FISHING_RODS) {
            // Check modelId - rods use IDs that get converted to models/items/${id}.gltf
            const modelPath = resolveModelPath(rod.modelId, 'rod');
            if (modelPath) {
                const modelCheck = checkFileExists(modelPath);
                results.push({
                    catalog: 'RodCatalog',
                    itemId: rod.id,
                    itemName: rod.name,
                    pathType: 'model',
                    path: rod.modelId,
                    exists: modelCheck.exists,
                    resolvedPath: modelCheck.actualPath
                });
            }
            
            // Check sprite
            const spritePath = resolveSpritePath(rod.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'RodCatalog',
                itemId: rod.id,
                itemName: rod.name,
                pathType: 'sprite',
                path: rod.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating RodCatalog:', error.message);
    }
}

/**
 * Validate TerrainLootCatalog
 */
async function validateTerrainLootCatalog() {
    try {
        const { TERRAIN_LOOT_CATALOG } = await import('../Bait/TerrainLootCatalog.ts');
        
        for (const item of TERRAIN_LOOT_CATALOG) {
            // Check modelUri
            const modelPath = join(ASSETS_DIR, item.modelUri);
            const modelCheck = checkFileExists(modelPath);
            results.push({
                catalog: 'TerrainLootCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'model',
                path: item.modelUri,
                exists: modelCheck.exists,
                resolvedPath: modelCheck.actualPath
            });
            
            // Check sprite
            const spritePath = resolveSpritePath(item.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'TerrainLootCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'sprite',
                path: item.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating TerrainLootCatalog:', error.message);
    }
}

/**
 * Validate ItemCatalog
 */
async function validateItemCatalog() {
    try {
        const { ITEM_CATALOG } = await import('../Crafting/ItemCatalog.ts');
        
        for (const item of ITEM_CATALOG) {
            // Check modelUri
            const modelPath = join(ASSETS_DIR, item.modelData.modelUri);
            const modelCheck = checkFileExists(modelPath);
            results.push({
                catalog: 'ItemCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'model',
                path: item.modelData.modelUri,
                exists: modelCheck.exists,
                resolvedPath: modelCheck.actualPath
            });
            
            // Check sprite
            const spritePath = resolveSpritePath(item.modelData.sprite);
            const spriteExists = existsSync(spritePath);
            results.push({
                catalog: 'ItemCatalog',
                itemId: item.id,
                itemName: item.name,
                pathType: 'sprite',
                path: item.modelData.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating ItemCatalog:', error.message);
    }
}

/**
 * Main validation function
 */
async function main() {
    console.log('🔍 Validating catalog file paths...\n');
    
    await validateLootCatalog();
    await validateFishCatalog();
    await validateBaitCatalog();
    await validateRodCatalog();
    await validateTerrainLootCatalog();
    await validateItemCatalog();
    
    // Separate results by status
    const missing = results.filter(r => !r.exists);
    const found = results.filter(r => r.exists);
    
    // Group missing by catalog
    const missingByCatalog = {};
    for (const result of missing) {
        if (!missingByCatalog[result.catalog]) {
            missingByCatalog[result.catalog] = [];
        }
        missingByCatalog[result.catalog].push(result);
    }
    
    // Print summary
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Found: ${found.length} files`);
    console.log(`   ❌ Missing: ${missing.length} files\n`);
    
    if (missing.length > 0) {
        console.log('❌ Missing Files:\n');
        for (const [catalog, items] of Object.entries(missingByCatalog)) {
            console.log(`   ${catalog}:`);
            for (const item of items) {
                console.log(`      - ${item.itemName} (${item.itemId})`);
                console.log(`        ${item.pathType}: ${item.path}`);
                console.log(`        Expected: ${item.resolvedPath}`);
            }
            console.log('');
        }
    } else {
        console.log('✅ All catalog file paths are valid!\n');
    }
    
    // Exit with error code if any files are missing
    process.exit(missing.length > 0 ? 1 : 0);
}

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}

export { main };


