import { Vector3, World } from "hytopia";
import { HotspotVisualManager } from "./HotspotVisualEffects";

// --- Hotspot Types ---
export interface HotspotLocation {
    id: string;
    name: string;
    position: Vector3;
    radius: number;
    zoneId: string; // Parent fishing zone
    minRodRange?: number; // Minimum cast distance to reach (optional)
}

export interface ActiveHotspot {
    location: HotspotLocation;
    spawnTime: number;
    expirationTime: number;
    isActive: boolean;
}

// --- Hotspot Manager Configuration ---
export interface HotspotConfig {
    spawnChance: number; // Probability per check (tweakable for playtesting)
    hotspotDuration: number; // Duration in seconds
    checkInterval: number; // How often to check for spawns (seconds)
    maxActiveHotspots: number; // Max concurrent hotspots
}

// --- Default Configuration ---
export const DEFAULT_HOTSPOT_CONFIG: HotspotConfig = {
    spawnChance: 0.95, // ⚡ TESTING: 95% chance per check (was 0.25)
    hotspotDuration: 120, // ⚡ TESTING: 2 minutes duration (was 45 seconds) 
    checkInterval: 5, // ⚡ TESTING: Check every 5 seconds (was 45 seconds)
    maxActiveHotspots: 6 // ⚡ TESTING: Allow 6 active at once (was 3)
};

// --- Predefined Hotspot Locations ---
// Using coordinates from all "deep" zones in the fishing catalog
export const HOTSPOT_LOCATIONS: HotspotLocation[] = [
    // X Deep
    {
        id: 'x_deep_hotspot_1',
        name: 'X Deep Hotspot',
        position: new Vector3(-16.365, 12, 174.07),
        radius: 12,
        zoneId: 'region_x_deep'
    },
    
    // Shadow Deep
    {
        id: 'shadow_deep_hotspot_1',
        name: 'Shadow Deep Hotspot',
        position: new Vector3(194.5, 12, -0.5),
        radius: 15,
        zoneId: 'region_shadow_deep'
    },
    
    // Rock Deep
    {
        id: 'rock_deep_hotspot_1',
        name: 'Rock Deep Hotspot',
        position: new Vector3(238, 12, -73),
        radius: 10,
        zoneId: 'region_rock_deep'
    },
    
    // Cliffs Deep
    {
        id: 'cliffs_deep_hotspot_1',
        name: 'Cliffs Deep Hotspot',
        position: new Vector3(28, 12, -193.5),
        radius: 18,
        zoneId: 'region_cliffs_deep'
    },
    
    // Pier Deep
    {
        id: 'pier_deep_hotspot_1',
        name: 'Pier Deep Hotspot',
        position: new Vector3(-211.5, 12, 9),
        radius: 14,
        zoneId: 'region_pier_deep'
    },
    
    // Toolmaster Dock Deep
    {
        id: 'toolmaster_dock_deep_hotspot_1',
        name: 'Toolmaster\'s Dock Deep Hotspot',
        position: new Vector3(-70.5, 12, -208),
        radius: 8,
        zoneId: 'region_toolmaster_dock_deep'
    },

    // === NEW HOTSPOTS ===
    
    // Tree Isle area
    {
        id: 'tree_isle_hotspot_1',
        name: 'Tree Isle Hotspot',
        position: new Vector3(36, 12, -136),
        radius: 12,
        zoneId: 'region_tree_isle'
    },
    
    // Big Island Forest Beach area
    {
        id: 'forest_beach_hotspot_1',
        name: 'Forest Beach Hotspot',
        position: new Vector3(-31, 12, -120),
        radius: 10,
        zoneId: 'big_island_forest_beach'
    },
    
    // Big Island Old Dock area
    {
        id: 'old_dock_hotspot_1',
        name: 'Old Dock Hotspot',
        position: new Vector3(-118, 12, -80),
        radius: 11,
        zoneId: 'big_island_old_dock'
    },
    
    // Big Island Boardwalk area
    {
        id: 'boardwalk_hotspot_1',
        name: 'Boardwalk Hotspot',
        position: new Vector3(-129, 12, -20),
        radius: 9,
        zoneId: 'big_island_boardwalk'
    },
    
    // Big Island Spawn Pier area
    {
        id: 'spawn_pier_hotspot_1',
        name: 'Spawn Pier Hotspot',
        position: new Vector3(-136, 12, 30),
        radius: 10,
        zoneId: 'big_island_spawn_pier'
    },
    
    // Big Island Shady Spawn area
    {
        id: 'shady_spawn_hotspot_1',
        name: 'Shady Spawn Hotspot',
        position: new Vector3(-137, 12, 56),
        radius: 11,
        zoneId: 'big_island_shady_spawn'
    },
    
    // Big Island Shady Spawn area (second spot)
    {
        id: 'shady_spawn_hotspot_2',
        name: 'Shady Spawn Peninsula Hotspot',
        position: new Vector3(-92, 12, 99),
        radius: 12,
        zoneId: 'big_island_shady_spawn'
    },
    
    // Big Island Cliffs area
    {
        id: 'cliffs_hotspot_1',
        name: 'Cliffs Hotspot',
        position: new Vector3(-32, 12, 92),
        radius: 8,
        zoneId: 'big_island_cliffs'
    },
    
    // Big Island Breeze Beach area
    {
        id: 'breeze_beach_hotspot_1',
        name: 'Breeze Beach Hotspot',
        position: new Vector3(93, 12, 83),
        radius: 13,
        zoneId: 'big_island_breeze_beach'
    },
    
    // Big Island Kelp Inlet area
    {
        id: 'kelp_inlet_hotspot_1',
        name: 'Kelp Inlet Hotspot',
        position: new Vector3(104, 12, 13),
        radius: 10,
        zoneId: 'big_island_kelp_inlet'
    },
    
    // Big Island Breeze Beach area (second spot)
    {
        id: 'breeze_beach_hotspot_2',
        name: 'Breeze Beach East Hotspot',
        position: new Vector3(100, 12, -36),
        radius: 11,
        zoneId: 'big_island_breeze_beach'
    },
    
    // Rock Deep area (second spot)
    {
        id: 'rock_deep_hotspot_2',
        name: 'Rock Deep South Hotspot',
        position: new Vector3(225, 12, -100),
        radius: 9,
        zoneId: 'region_rock_deep'
    },
    
    // Tree Isle area (second spot)
    {
        id: 'tree_isle_hotspot_2',
        name: 'Tree Isle East Hotspot',
        position: new Vector3(157, 12, -93),
        radius: 10,
        zoneId: 'region_tree_isle'
    },
    
    // Toolmaster Island area
    {
        id: 'toolmaster_island_hotspot_1',
        name: 'Toolmaster Island Hotspot',
        position: new Vector3(-91, 12, -239),
        radius: 12,
        zoneId: 'region_toolmaster_island'
    },
    
    // Toolmaster Island area (second spot)
    {
        id: 'toolmaster_island_hotspot_2',
        name: 'Toolmaster Island Deep Hotspot',
        position: new Vector3(-228, 12, -262),
        radius: 14,
        zoneId: 'region_toolmaster_island'
    }
];

// --- Hotspot Manager Class ---
export class HotspotManager {
    private config: HotspotConfig;
    private activeHotspots: Map<string, ActiveHotspot> = new Map();
    private lastCheckTime: number = 0;
    private visualManager: HotspotVisualManager | null = null;

    constructor(config: HotspotConfig = DEFAULT_HOTSPOT_CONFIG) {
        this.config = config;
    }

    // --- Initialize with world for visual effects ---
    initializeVisuals(world: World): void {
        this.visualManager = new HotspotVisualManager(world);
    }

    // --- Configuration Methods ---
    setSpawnRate(newRate: number): void {
        this.config.spawnChance = newRate;
    }

    setHotspotDuration(duration: number): void {
        this.config.hotspotDuration = duration;
    }

    getConfig(): HotspotConfig {
        return { ...this.config };
    }

    // --- Core Hotspot Logic ---
    update(): void {
        const currentTime = Date.now();
        
        // Update visual effects
        // TEMP: Disabled for performance testing
        // if (this.visualManager) {
        //     this.visualManager.update();
        // }
        
        // Check for expired hotspots
        this.cleanupExpiredHotspots(currentTime);
        
        // Check if it's time to potentially spawn new hotspots
        if (currentTime - this.lastCheckTime >= (this.config.checkInterval * 1000)) {
            this.checkForHotspotSpawn(currentTime);
            this.lastCheckTime = currentTime;
        }
    }

    private checkForHotspotSpawn(currentTime: number): void {
        // Don't spawn if we're at max capacity
        if (this.activeHotspots.size >= this.config.maxActiveHotspots) {
            return;
        }

        // Roll for spawn chance
        if (Math.random() < this.config.spawnChance) {
            this.spawnRandomHotspot(currentTime);
        }
    }

    private spawnRandomHotspot(currentTime: number): void {
        // Get available hotspot locations (not currently active)
        const availableLocations = HOTSPOT_LOCATIONS.filter(location => 
            !this.activeHotspots.has(location.id)
        );

        if (availableLocations.length === 0) {
            return;
        }

        // Pick random location
        const randomLocation = availableLocations[Math.floor(Math.random() * availableLocations.length)];
        
        // Create active hotspot
        const activeHotspot: ActiveHotspot = {
            location: randomLocation,
            spawnTime: currentTime,
            expirationTime: currentTime + (this.config.hotspotDuration * 1000),
            isActive: true
        };

        this.activeHotspots.set(randomLocation.id, activeHotspot);
        
        
        // TODO: Trigger visual effects and notify players
        this.onHotspotSpawned(activeHotspot);
    }

    private cleanupExpiredHotspots(currentTime: number): void {
        for (const [id, hotspot] of this.activeHotspots) {
            if (currentTime >= hotspot.expirationTime) {
                this.activeHotspots.delete(id);
                
                // TODO: Remove visual effects
                this.onHotspotExpired(hotspot);
            }
        }
    }

    // --- Player Interaction Methods ---
    getActiveHotspots(): ActiveHotspot[] {
        return Array.from(this.activeHotspots.values());
    }

    isPlayerInHotspot(playerPosition: Vector3): ActiveHotspot | null {
        for (const hotspot of this.activeHotspots.values()) {
            const distance = playerPosition.distance(hotspot.location.position);
            if (distance <= hotspot.location.radius) {
                return hotspot;
            }
        }
        return null;
    }

    canPlayerReachHotspot(playerPosition: Vector3, rodRange: number, hotspot: ActiveHotspot): boolean {
        const distance = playerPosition.distance(hotspot.location.position);
        const requiredRange = hotspot.location.minRodRange || 0;
        
        return rodRange >= requiredRange && distance <= rodRange;
    }

    // --- Event Handlers ---
    private onHotspotSpawned(hotspot: ActiveHotspot): void {
        // Trigger visual effects
        if (this.visualManager) {
            this.visualManager.spawnHotspotEffects(hotspot);
        }
        
    }

    private onHotspotExpired(hotspot: ActiveHotspot): void {
        // Remove visual effects
        if (this.visualManager) {
            this.visualManager.removeHotspotEffects(hotspot);
        }
        
    }

    // --- Debug/Admin Methods ---
    forceSpawnHotspot(locationId: string): boolean {
        const location = HOTSPOT_LOCATIONS.find(loc => loc.id === locationId);
        if (!location) {
            console.error(`[HotspotManager] Location not found: ${locationId}`);
            return false;
        }

        if (this.activeHotspots.has(locationId)) {
            console.error(`[HotspotManager] Hotspot already active: ${locationId}`);
            return false;
        }

        const currentTime = Date.now();
        const activeHotspot: ActiveHotspot = {
            location: location,
            spawnTime: currentTime,
            expirationTime: currentTime + (this.config.hotspotDuration * 1000),
            isActive: true
        };

        this.activeHotspots.set(locationId, activeHotspot);
        this.onHotspotSpawned(activeHotspot);
        
        return true;
    }

    clearAllHotspots(): void {
        for (const hotspot of this.activeHotspots.values()) {
            this.onHotspotExpired(hotspot);
        }
        this.activeHotspots.clear();
        
        // Also clear all visual effects as a safety measure
        // TEMP: Disabled for performance testing
        // if (this.visualManager) {
        //     this.visualManager.clearAllEffects();
        // }
        
    }

    // --- Test Method for Visual Effects ---
    spawnTestHotspot(durationMinutes: number = 5): boolean {
        
        // Use a close, accessible location for testing - let's use the Big Island area instead
        // Find the closest hotspot to spawn area
        const testLocation = HOTSPOT_LOCATIONS.find(loc => 
            loc.name.includes('Toolmaster') // This is closest to spawn
        ) || HOTSPOT_LOCATIONS[0]; // Fallback to first if not found
        
        if (!testLocation) {
            console.error('[HotspotManager] No hotspot locations available for testing');
            return false;
        }

        // Clear any existing hotspot at this location first
        if (this.activeHotspots.has(testLocation.id)) {
            const existingHotspot = this.activeHotspots.get(testLocation.id)!;
            this.onHotspotExpired(existingHotspot);
            this.activeHotspots.delete(testLocation.id);
        }

        // Force spawn regardless of normal conditions
        const currentTime = Date.now();
        const hotspot: ActiveHotspot = {
            location: testLocation,
            spawnTime: currentTime,
            expirationTime: currentTime + (durationMinutes * 60 * 1000), // Duration in minutes
            isActive: true
        };

        this.activeHotspots.set(testLocation.id, hotspot);
        
        // Trigger visual effects
        this.onHotspotSpawned(hotspot);

        
        return true;
    }

    // --- Auto-Start Method for Server Startup ---
    autoSpawnStartupHotspot(): void {
        
        // Wait a few seconds for everything to initialize, then spawn test hotspot
        setTimeout(() => {
            this.spawnTestHotspot(5); // 5 minute duration
        }, 3000); // 3 second delay to ensure world is ready
    }
} 