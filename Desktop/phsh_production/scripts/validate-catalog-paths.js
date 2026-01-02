#!/usr/bin/env node
/**
 * Catalog Path Validator
 * 
 * Validates that all file paths referenced in catalogs (models, sprites) actually exist.
 * This script parses the TypeScript catalog files directly to extract paths.
 */

const fs = require('fs');
const path = require('path');

// Base paths
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const MODELS_DIR = path.join(ASSETS_DIR, 'models');
const UI_ICONS_DIR = path.join(ASSETS_DIR, 'ui', 'icons');

const results = [];

/**
 * Resolve a model path to an actual file path
 */
function resolveModelPath(modelPath, catalogType) {
    // If it's already a full path starting with "models/"
    if (modelPath.startsWith('models/')) {
        return path.join(ASSETS_DIR, modelPath);
    }
    
    // For rods, convert ID to models/items/${id}.gltf
    if (catalogType === 'rod') {
        return path.join(MODELS_DIR, 'items', `${modelPath}.gltf`);
    }
    
    // For bait, check if it's a full path or needs conversion
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
function resolveSpritePath(spritePath) {
    return path.join(UI_ICONS_DIR, spritePath);
}

/**
 * Check if a file exists (including .gltf and .glb variants)
 */
function checkFileExists(filePath) {
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
 * Extract paths from a TypeScript catalog file using regex
 */
function extractPathsFromCatalog(filePath, catalogName) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let currentItem = null;
    let inItem = false;
    let braceDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for item start (id: '...')
        const idMatch = line.match(/id:\s*['"]([^'"]+)['"]/);
        if (idMatch && !inItem) {
            currentItem = { id: idMatch[1], name: null, modelUri: null, modelId: null, sprite: null };
            inItem = true;
            braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        }
        
        if (inItem) {
            // Track brace depth
            braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            
            // Extract name
            if (!currentItem.name) {
                const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
                if (nameMatch) currentItem.name = nameMatch[1];
            }
            
            // Extract modelUri
            if (!currentItem.modelUri) {
                const modelUriMatch = line.match(/modelUri:\s*['"]([^'"]+)['"]/);
                if (modelUriMatch) currentItem.modelUri = modelUriMatch[1];
            }
            
            // Extract modelId
            if (!currentItem.modelId) {
                const modelIdMatch = line.match(/modelId:\s*['"]([^'"]+)['"]/);
                if (modelIdMatch) currentItem.modelId = modelIdMatch[1];
            }
            
            // Extract sprite (could be in modelData.sprite or just sprite)
            if (!currentItem.sprite) {
                const spriteMatch = line.match(/(?:modelData\.)?sprite:\s*['"]([^'"]+)['"]/);
                if (spriteMatch) currentItem.sprite = spriteMatch[1];
            }
            
            // Check if item ends
            if (braceDepth <= 0 && currentItem && (currentItem.modelUri || currentItem.modelId || currentItem.sprite)) {
                // Validate this item
                if (currentItem.modelUri) {
                    const modelPath = path.join(ASSETS_DIR, currentItem.modelUri);
                    const modelCheck = checkFileExists(modelPath);
                    results.push({
                        catalog: catalogName,
                        itemId: currentItem.id,
                        itemName: currentItem.name || currentItem.id,
                        pathType: 'model',
                        path: currentItem.modelUri,
                        exists: modelCheck.exists,
                        resolvedPath: modelCheck.actualPath
                    });
                }
                
                if (currentItem.modelId) {
                    const catalogType = catalogName.includes('Rod') ? 'rod' : (catalogName.includes('Bait') ? 'bait' : null);
                    const modelPath = resolveModelPath(currentItem.modelId, catalogType);
                    if (modelPath) {
                        const modelCheck = checkFileExists(modelPath);
                        results.push({
                            catalog: catalogName,
                            itemId: currentItem.id,
                            itemName: currentItem.name || currentItem.id,
                            pathType: 'model',
                            path: currentItem.modelId,
                            exists: modelCheck.exists,
                            resolvedPath: modelCheck.actualPath
                        });
                    }
                }
                
                if (currentItem.sprite) {
                    const spritePath = resolveSpritePath(currentItem.sprite);
                    const spriteExists = fs.existsSync(spritePath);
                    results.push({
                        catalog: catalogName,
                        itemId: currentItem.id,
                        itemName: currentItem.name || currentItem.id,
                        pathType: 'sprite',
                        path: currentItem.sprite,
                        exists: spriteExists,
                        resolvedPath: spritePath
                    });
                }
                
                currentItem = null;
                inItem = false;
                braceDepth = 0;
            }
        }
    }
}

/**
 * Main validation function
 */
function main() {
    console.log('🔍 Validating catalog file paths...\n');
    
    const catalogs = [
        { file: path.join(__dirname, '..', 'Fishing', 'LootCatalog.ts'), name: 'LootCatalog' },
        { file: path.join(__dirname, '..', 'Fishing', 'PhshTwoFIshCatalog.ts'), name: 'FishCatalog' },
        { file: path.join(__dirname, '..', 'Bait', 'BaitCatalog.ts'), name: 'BaitCatalog' },
        { file: path.join(__dirname, '..', 'Inventory', 'RodCatalog.ts'), name: 'RodCatalog' },
        { file: path.join(__dirname, '..', 'Bait', 'TerrainLootCatalog.ts'), name: 'TerrainLootCatalog' },
        { file: path.join(__dirname, '..', 'Crafting', 'ItemCatalog.ts'), name: 'ItemCatalog' },
    ];
    
    for (const catalog of catalogs) {
        if (fs.existsSync(catalog.file)) {
            console.log(`Checking ${catalog.name}...`);
            extractPathsFromCatalog(catalog.file, catalog.name);
        } else {
            console.log(`⚠️  ${catalog.name} not found at ${catalog.file}`);
        }
    }
    
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
if (require.main === module) {
    main();
}

module.exports = { main };


