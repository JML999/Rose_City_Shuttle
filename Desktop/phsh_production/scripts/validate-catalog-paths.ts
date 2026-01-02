#!/usr/bin/env ts-node
/**
 * Catalog Path Validator
 * 
 * Validates that all file paths referenced in catalogs (models, sprites) actually exist.
 * Checks:
 * - LootCatalog: modelUri, sprite
 * - FishCatalog: modelData.modelUri, modelData.sprite
 * - BaitCatalog: modelId, sprite
 * - RodCatalog: modelId, sprite
 * - TerrainLootCatalog: modelUri, sprite
 * - ItemCatalog: modelData.modelUri, modelData.sprite
 */

import * as fs from 'fs';
import * as path from 'path';

// Base paths
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const MODELS_DIR = path.join(ASSETS_DIR, 'models');
const UI_ICONS_DIR = path.join(ASSETS_DIR, 'ui', 'icons');

interface ValidationResult {
    catalog: string;
    itemId: string;
    itemName: string;
    pathType: 'model' | 'sprite';
    path: string;
    exists: boolean;
    resolvedPath: string;
}

const results: ValidationResult[] = [];

/**
 * Resolve a model path to an actual file path
 */
function resolveModelPath(modelPath: string, catalogType: string): string | null {
    // If it's already a full path starting with "models/"
    if (modelPath.startsWith('models/')) {
        return path.join(ASSETS_DIR, modelPath);
    }
    
    // For rods, convert ID to models/items/${id}.gltf
    if (catalogType === 'rod') {
        return path.join(MODELS_DIR, 'items', `${modelPath}.gltf`);
    }
    
    // For bait, check if it's a full path or needs conversion
    // Most bait entries have full paths, but handle both
    if (catalogType === 'bait') {
        // If it looks like just an ID, try models/items first, then models/npcs
        if (!modelPath.includes('/')) {
            const itemsPath = path.join(MODELS_DIR, 'items', `${modelPath}.gltf`);
            if (fs.existsSync(itemsPath)) return itemsPath;
            const npcsPath = path.join(MODELS_DIR, 'npcs', `${modelPath}.gltf`);
            if (fs.existsSync(npcsPath)) return npcsPath;
            return itemsPath; // Return first guess for error reporting
        }
    }
    
    return null;
}

/**
 * Resolve a sprite path to an actual file path
 */
function resolveSpritePath(spritePath: string): string {
    return path.join(UI_ICONS_DIR, spritePath);
}

/**
 * Check if a file exists (including .gltf and .glb variants)
 */
function checkFileExists(filePath: string): { exists: boolean; actualPath: string } {
    if (fs.existsSync(filePath)) {
        return { exists: true, actualPath: filePath };
    }
    
    // Check for .glb variant if .gltf
    if (filePath.endsWith('.gltf')) {
        const glbPath = filePath.replace(/\.gltf$/, '.glb');
        if (fs.existsSync(glbPath)) {
            return { exists: true, actualPath: glbPath };
        }
    }
    
    // Check for .gltf variant if .glb
    if (filePath.endsWith('.glb')) {
        const gltfPath = filePath.replace(/\.glb$/, '.gltf');
        if (fs.existsSync(gltfPath)) {
            return { exists: true, actualPath: gltfPath };
        }
    }
    
    return { exists: false, actualPath: filePath };
}

/**
 * Validate LootCatalog
 */
function validateLootCatalog() {
    try {
        // Import the catalog
    const lootCatalog = require('../Fishing/LootCatalog').LOOT_CATALOG;
        
        for (const item of lootCatalog) {
            // Check modelUri
            const modelPath = path.join(ASSETS_DIR, item.modelUri);
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
            const spriteExists = fs.existsSync(spritePath);
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
        console.error('Error validating LootCatalog:', error);
    }
}

/**
 * Validate FishCatalog
 */
function validateFishCatalog() {
    try {
        const fishCatalog = require('../Fishing/PhshTwoFIshCatalog').FISH_CATALOG;
        
        for (const fish of fishCatalog) {
            // Check modelUri
            const modelPath = path.join(ASSETS_DIR, fish.modelData.modelUri);
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
            const spriteExists = fs.existsSync(spritePath);
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
        console.error('Error validating FishCatalog:', error);
    }
}

/**
 * Validate BaitCatalog
 */
function validateBaitCatalog() {
    try {
        const baitCatalog = require('../Bait/BaitCatalog').BAIT_CATALOG;
        
        for (const [id, bait] of Object.entries(baitCatalog)) {
            const baitDef = bait as any;
            
            // Check modelId
            let modelPath: string | null = null;
            if (baitDef.modelId.startsWith('models/')) {
                modelPath = path.join(ASSETS_DIR, baitDef.modelId);
            } else {
                modelPath = resolveModelPath(baitDef.modelId, 'bait');
            }
            
            if (modelPath) {
                const modelCheck = checkFileExists(modelPath);
                results.push({
                    catalog: 'BaitCatalog',
                    itemId: id,
                    itemName: baitDef.name,
                    pathType: 'model',
                    path: baitDef.modelId,
                    exists: modelCheck.exists,
                    resolvedPath: modelCheck.actualPath
                });
            }
            
            // Check sprite
            const spritePath = resolveSpritePath(baitDef.sprite);
            const spriteExists = fs.existsSync(spritePath);
            results.push({
                catalog: 'BaitCatalog',
                itemId: id,
                itemName: baitDef.name,
                pathType: 'sprite',
                path: baitDef.sprite,
                exists: spriteExists,
                resolvedPath: spritePath
            });
        }
    } catch (error) {
        console.error('Error validating BaitCatalog:', error);
    }
}

/**
 * Validate RodCatalog
 */
function validateRodCatalog() {
    try {
        const rodCatalog = require('../Inventory/RodCatalog').FISHING_RODS;
        
        for (const rod of rodCatalog) {
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
            const spriteExists = fs.existsSync(spritePath);
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
        console.error('Error validating RodCatalog:', error);
    }
}

/**
 * Validate TerrainLootCatalog
 */
function validateTerrainLootCatalog() {
    try {
        const terrainCatalog = require('../Bait/TerrainLootCatalog').TERRAIN_LOOT_CATALOG;
        
        for (const item of terrainCatalog) {
            // Check modelUri
            const modelPath = path.join(ASSETS_DIR, item.modelUri);
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
            const spriteExists = fs.existsSync(spritePath);
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
        console.error('Error validating TerrainLootCatalog:', error);
    }
}

/**
 * Validate ItemCatalog
 */
function validateItemCatalog() {
    try {
        const itemCatalog = require('../Crafting/ItemCatalog').ITEM_CATALOG;
        
        for (const item of itemCatalog) {
            // Check modelUri
            const modelPath = path.join(ASSETS_DIR, item.modelData.modelUri);
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
            const spriteExists = fs.existsSync(spritePath);
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
        console.error('Error validating ItemCatalog:', error);
    }
}

/**
 * Main validation function
 */
function main() {
    console.log('🔍 Validating catalog file paths...\n');
    
    validateLootCatalog();
    validateFishCatalog();
    validateBaitCatalog();
    validateRodCatalog();
    validateTerrainLootCatalog();
    validateItemCatalog();
    
    // Separate results by status
    const missing = results.filter(r => !r.exists);
    const found = results.filter(r => r.exists);
    
    // Group missing by catalog
    const missingByCatalog: Record<string, ValidationResult[]> = {};
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
if (require.main === module) {
    main();
}

export { main, ValidationResult };


