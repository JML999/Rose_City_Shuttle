import { World } from 'hytopia';
import type { HotspotManager } from './Fishing/FishingHotspots';

const CYCLE_CLOCK_INTERVAL_MS = 2000; // Update every 2 seconds - much less frequent
const CYCLE_CLOCK_OFFSET_HOURS = 10; // Start at 10 AM
const CYCLE_DURATION_MS = 37.5 * 60 * 1000; // 37.5 minute cycles (25% longer than original 30min)

// Simple lighting constants
const DAY_INTENSITY = 3.0;
const NIGHT_INTENSITY = 0.3;
const DAY_AMBIENT = 1.0;
const NIGHT_AMBIENT = 0.4;
const DAY_SKYBOX = 1.4;
const NIGHT_SKYBOX = 0.05;
const SUNSET_SKYBOX = 1.8; // Special sunset intensity

// Skybox URI constants (folders, not files)
const SKYBOX_PARTLY_CLOUDY = 'skyboxes/partly-cloudy';
const SKYBOX_SUNSET = 'skyboxes/sunset';
const SKYBOX_NIGHT = 'skyboxes/night';

export default class GameClock {
  public static readonly instance = new GameClock();

  private _timeMs: number = 0;
  private _worlds: Set<World> = new Set();
  private _hotspotManager: HotspotManager | null = null;
  private _lastHour: number = -1; // Track hour changes for NPC updates
  private _lastSkyboxUri: string | null = null; // Track last skybox URI to avoid redundant changes

  private constructor() {
    setInterval(() => this._tickClock(), CYCLE_CLOCK_INTERVAL_MS);
  }

  public get hour(): number { 
    const cycleProgress = (this._timeMs % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
    return Math.floor((cycleProgress * 24) + CYCLE_CLOCK_OFFSET_HOURS) % 24;
  }
  
  public get minute(): number { 
    const cycleProgress = (this._timeMs % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
    const totalMinutes = (cycleProgress * 24 * 60) + (CYCLE_CLOCK_OFFSET_HOURS * 60);
    return Math.floor(totalMinutes) % 60;
  }

  public addWorld(world: World): void {
    this._worlds.add(world);
  }

  public removeWorld(world: World): void {
    this._worlds.delete(world);
  }

  public setHotspotManager(hotspotManager: HotspotManager): void {
    this._hotspotManager = hotspotManager;
  }

  // --- Test Methods ---
  public spawnTestHotspot(durationMinutes: number = 5): boolean {
    if (!this._hotspotManager) {
      console.error('[GameClock] Hotspot manager not initialized - cannot spawn test hotspot');
      return false;
    }
    return this._hotspotManager.spawnTestHotspot(durationMinutes);
  }

  private _tickClock(): void {
    this._timeMs += CYCLE_CLOCK_INTERVAL_MS; 

    if (this._timeMs >= CYCLE_DURATION_MS) {
      this._timeMs = 0;
    }

    this._worlds.forEach((world) => this._updateWorldDayCycle(world));
    
    // Update hotspot system
    if (this._hotspotManager) {
      this._hotspotManager.update();
    }

    // Check for hour changes and update time-based NPCs
    const currentHour = this.hour;
    if (this._lastHour !== currentHour) {
      this._lastHour = currentHour;
      this._updateTimeBasedNPCs();
    }
  }

  private _updateTimeBasedNPCs(): void {
    try {
      // Import dynamically to avoid circular dependency
      const { WizardDialogNpc } = require('./npcs/WizardDialogNpc');
      WizardDialogNpc.updateAllWizardLocations();
    } catch (error) {
      // Silently fail if wizard system isn't available yet
      // This can happen during initialization
    }
  }

  private _updateWorldDayCycle(world: World): void {
    const currentHour = this.hour;
    const currentMinute = this.minute;
    
    // Simple sun position calculation
    const timeProgress = this._timeMs / CYCLE_DURATION_MS;
    const sunAngle = timeProgress * 2 * Math.PI;
    const sunRadius = 300;
    const sunY = 100 + Math.sin(sunAngle) * 150;
    const sunX = Math.cos(sunAngle) * sunRadius;
    const sunZ = Math.sin(sunAngle) * sunRadius;
    
    world.setDirectionalLightPosition({ x: sunX, y: sunY, z: sunZ });
    
    // Simple day/night logic with short transitions
    let lightIntensity: number;
    let ambientIntensity: number;
    let skyboxIntensity: number;
    let r: number, g: number, b: number;
    let skyboxUri: string;
    
    // Determine time period and set lighting/skybox
    // Night: 7 PM - 5 AM (hour 19-4) - wizard leaves for Shadow Isle at 7 PM
    if (currentHour >= 19 || currentHour < 5) {
      lightIntensity = NIGHT_INTENSITY;
      ambientIntensity = NIGHT_AMBIENT;
      skyboxIntensity = NIGHT_SKYBOX;
      skyboxUri = SKYBOX_NIGHT;
      r = 180; g = 200; b = 255; // Cool moonlight
      
    // Sunrise: 5 AM - 6 AM (hour 5) - uses same skybox as sunset
    } else if (currentHour >= 5 && currentHour < 6) {
      lightIntensity = DAY_INTENSITY * 0.8; // Slightly dimmer
      ambientIntensity = DAY_AMBIENT * 0.9;
      skyboxIntensity = SUNSET_SKYBOX; // Special bright sunset
      skyboxUri = SKYBOX_SUNSET;
      r = 255; g = 200; b = 150; // Warm sunset colors
      
    // Day/Partly Cloudy: 6 AM - 5 PM (hour 6-16)
    } else if (currentHour >= 6 && currentHour < 17) {
      lightIntensity = DAY_INTENSITY;
      ambientIntensity = DAY_AMBIENT;
      skyboxIntensity = DAY_SKYBOX;
      skyboxUri = SKYBOX_PARTLY_CLOUDY;
      r = 255; g = 255; b = 255; // Bright white
      
    // Sunset/Dusk: 5 PM - 7 PM (hour 17-18) - aligns with fishing catalog and wizard schedule
    } else {
      lightIntensity = DAY_INTENSITY * 0.8; // Slightly dimmer
      ambientIntensity = DAY_AMBIENT * 0.9;
      skyboxIntensity = SUNSET_SKYBOX; // Special bright sunset
      skyboxUri = SKYBOX_SUNSET;
      r = 255; g = 200; b = 150; // Warm sunset colors
    }
    
    // Apply lighting
    world.setDirectionalLightColor({ r, g, b });
    world.setDirectionalLightIntensity(lightIntensity);
    world.setAmbientLightColor({ r, g, b });
    world.setAmbientLightIntensity(ambientIntensity);
    world.setSkyboxIntensity(skyboxIntensity);
    
    // Apply skybox URI change (only if different from last)
    if (skyboxUri !== this._lastSkyboxUri) {
      try {
        world.setSkyboxUri(skyboxUri);
        this._lastSkyboxUri = skyboxUri;
      } catch (error) {
        console.error(`[GameClock] Error setting skybox URI ${skyboxUri}:`, error);
      }
    }
  }
} 