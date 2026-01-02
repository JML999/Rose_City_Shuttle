import { SmartBlockEntity } from './SmartBlockEntity';
import { Player, SimpleEntityController, World, Vector3 } from 'hytopia';
import GameClock from '../GameClock';

export class AltarBlockEntity extends SmartBlockEntity {
    private currentTimeOfDay: 'day' | 'night' = 'day';
    private isUpdatingAnimation = false; // Add flag to prevent simultaneous animation changes
    private lastAnimationUpdate = 0; // Track last update time
    private lastHourChecked: number = -1; // Track last hour we checked
    private updateInterval: NodeJS.Timeout | null = null; // Periodic update interval
    
    // Static registry for wizard-controlled activation
    private static allAltars: Set<AltarBlockEntity> = new Set();

    constructor(options: any) {
        // Determine initial animation based on current time
        const gameTime = GameClock.instance;
        const isNightTime = gameTime.hour >= 19 || gameTime.hour < 6;
        const initialAnimation = isNightTime ? 'idle_example' : 'inactive';
        
        super({
            ...options,
            controller: new SimpleEntityController(),
            modelLoopedAnimations: [initialAnimation]
        });
        
        // Set initial time of day state
        this.currentTimeOfDay = isNightTime ? 'night' : 'day';
    }

    override spawn(world: World, position: Vector3): void {
        super.spawn(world, position);
        
        // Register this altar for wizard notifications
        AltarBlockEntity.allAltars.add(this);
        
        // Set initial animation state based on current time with a delay to avoid conflicts
        setTimeout(() => {
            this.updateAnimationForTimeOfDay();
        }, 500); // Wait 500ms after spawn before setting animation
        
        // Set up periodic check for hour changes (every 5 seconds)
        this.updateInterval = setInterval(() => {
            this.checkForHourChange();
        }, 5000);
        
        // Initialize last hour checked
        this.lastHourChecked = GameClock.instance.hour;
    }

    override despawn(): void {
        // Unregister from wizard notifications
        AltarBlockEntity.allAltars.delete(this);
        
        // Clear periodic update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Reset animation update flag to prevent conflicts
        this.isUpdatingAnimation = false;
        
        super.despawn();
    }

    // Static methods for wizard-controlled activation
    public static activateAllAltars(): void {
        AltarBlockEntity.allAltars.forEach(altar => {
            altar.setActiveState('night');
        });
    }

    public static deactivateAllAltars(): void {
        AltarBlockEntity.allAltars.forEach(altar => {
            altar.setActiveState('day');
        });
    }

    private setActiveState(timeOfDay: 'day' | 'night'): void {
        if (this.currentTimeOfDay === timeOfDay) return; // Already in correct state
        
        this.currentTimeOfDay = timeOfDay;
            this.updateAnimationForTimeOfDay();
    }

    private checkForHourChange(): void {
        const currentHour = GameClock.instance.hour;
        if (currentHour !== this.lastHourChecked) {
            this.lastHourChecked = currentHour;
            // Hour changed, trigger animation update
            this.updateAnimationForTimeOfDay();
        }
    }

    private async updateAnimationForTimeOfDay(): Promise<void> {
        // Prevent simultaneous animation updates
        if (this.isUpdatingAnimation) {
            return;
        }

        const now = Date.now();
        // Reduce throttle to allow more frequent updates (10 seconds instead of 60)
        if (now - this.lastAnimationUpdate < 10000) {
            return;
        }

        this.isUpdatingAnimation = true;
        this.lastAnimationUpdate = now;

        try {
        const gameTime = GameClock.instance;
        // Use same schedule as wizard: 19-6 is night (active), 6-19 is day (inactive)
        const isNightTime = gameTime.hour >= 19 || gameTime.hour < 6; // 7 PM - 6 AM is night
        const newTimeOfDay = isNightTime ? 'night' : 'day';


            // Only update if time has actually changed
            if (newTimeOfDay !== this.currentTimeOfDay) {
            this.currentTimeOfDay = newTimeOfDay;

                // Add longer delay before changing animations to avoid physics conflicts
                await new Promise(resolve => setTimeout(resolve, 500)); // Increase from 250ms to 500ms

                // Update animation based on time of day with extra safety checks
                if (!this.isSpawned) {
                    return;
                }

        if (this.currentTimeOfDay === 'night') {
            // Night: Wizard is at Shadow Isle, altar should be active (idle_example animation)
            this.stopModelAnimations(['inactive']);
                    await new Promise(resolve => setTimeout(resolve, 200)); // Increase pause
                    if (this.isSpawned) { // Check again after delay
            this.startModelLoopedAnimations(['idle_example']);
                    }
        } else {
            // Day: Wizard is in town, altar should be dormant (inactive animation)
            this.stopModelAnimations(['idle_example']);
                    await new Promise(resolve => setTimeout(resolve, 200)); // Increase pause
                    if (this.isSpawned) { // Check again after delay
            this.startModelLoopedAnimations(['inactive']);
                    }
                }
            }
        } catch (error) {
            console.error(`[AltarBlockEntity] Error updating animation:`, error);
        } finally {
            // Reset flag after a longer delay
            setTimeout(() => {
                this.isUpdatingAnimation = false;
            }, 1000); // Increase from 500ms to 1000ms
        }
    }

    onPlayerInteract(player: Player) {
        // For now, just send a message about the altar's state
        const timeMessage = this.currentTimeOfDay === 'day' 
            ? "The altar lies dormant in the daylight..." 
            : "The altar pulses with mystical energy in the darkness...";
        
        // You could send UI data or trigger other interactions here
        // player.ui.sendData({ type: 'altarInteraction', timeOfDay: this.currentTimeOfDay });
    }
} 