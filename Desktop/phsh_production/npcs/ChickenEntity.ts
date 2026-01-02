import { GamePlayerEntity } from '../GamePlayerEntity';
import { Entity, SimpleEntityController, Vector3, World, EntityEvent, RigidBodyType } from 'hytopia';
import type { EventPayloads } from 'hytopia';

export class ChickenEntity extends Entity {
    // Properties will be set by constructor
    private moveSpeed: number;
    private pauseDurationMs: number;
    private waypoints: Vector3[] = [];
    
    private currentTargetIndex = 0;
    private pauseTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly BOUNCE_FORCE = 0.5; // Adjust this value for desired bounce height

    constructor(
        waypoints: Vector3[],
        moveSpeed: number,
        pauseDurationSeconds: number
    ) {
        if (waypoints.length === 0) {
            throw new Error("ChickenEntity requires at least one waypoint.");
        }

        super({
            controller: new SimpleEntityController(),
            name: 'Chicken',
            modelUri: 'models/npcs/chicken.gltf',
            modelScale: 0.5,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                enabledRotations: { x: false, y: false, z: false }, // Allow turning
                ccdEnabled: true,
            }
        });
        
        this.waypoints = waypoints;
        this.moveSpeed = moveSpeed;
        this.pauseDurationMs = pauseDurationSeconds * 1000; // Convert seconds to ms

        // Add listeners
        // this.on(EntityEvent.TICK, this._onTick); // Renamed internal handler
        this.on(EntityEvent.ENTITY_COLLISION, this._onEntityCollision); // Add collision listener
    }

    // Renamed internal handler
    private _onTick = (payload: EventPayloads[EntityEvent.TICK]): void => {
        // Only face target if we have waypoints and are currently supposed to be moving (not paused)
        if (this.waypoints.length < 1 || this.pauseTimer !== null) {
            return;
        }
        
        const controller = this.controller as SimpleEntityController;
        // Ensure target index is valid (should always be unless waypoints is empty)
        if (this.currentTargetIndex >= this.waypoints.length) {
             this.currentTargetIndex = 0; // Reset if somehow out of bounds
        }
        const targetWaypoint = this.waypoints[this.currentTargetIndex];
        
        // Continuously face the target waypoint while moving
        controller.face(targetWaypoint, this.moveSpeed * 2); // Face faster than move speed
    }
    
    // Collision handler
    private _onEntityCollision = (payload: EventPayloads[EntityEvent.ENTITY_COLLISION]) => {
        const { otherEntity, started } = payload;

        // Only react when collision starts and the other entity is a player
        if (!started || !(otherEntity instanceof GamePlayerEntity)) {
            return;
        }

        
        // Apply an upward impulse
        // Optional: Add slight random horizontal impulse too
        // const horizontalImpulseX = (Math.random() - 0.5) * 2; // Random between -1 and 1
        // const horizontalImpulseZ = (Math.random() - 0.5) * 2; // Random between -1 and 1
        this.applyImpulse(
            new Vector3(
                0, // horizontalImpulseX, 
                this.BOUNCE_FORCE, 
                0 // horizontalImpulseZ
            ) 
        );

         // Optionally, stop the current movement briefly to allow the bounce?
         // const controller = this.controller as SimpleEntityController;
         // controller.stop(); // Might interfere too much, test without first
    }

    private moveToNextWaypoint(): void {
        if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = null;
        }
        
        if (this.waypoints.length === 0) {
             console.warn(`[${this.name}] Cannot move, no waypoints defined.`);
             return;
        }
        // Ensure target index is valid after potential modifications
         if (this.currentTargetIndex >= this.waypoints.length) {
             this.currentTargetIndex = 0; 
         }

        const controller = this.controller as SimpleEntityController;
        const targetWaypoint = this.waypoints[this.currentTargetIndex];

        controller.face(targetWaypoint, this.moveSpeed * 4); // Face quickly at the start
        this.startModelLoopedAnimations(['walk']); 

        controller.move(targetWaypoint, this.moveSpeed, {
            moveCompleteCallback: () => {
                this.stopModelAnimations(['walk']);
                this.startModelLoopedAnimations(['idle']);

                // Pause at the waypoint
                this.pauseTimer = setTimeout(() => {
                    this.pauseTimer = null; 
                    // Move to the next waypoint index, looping back to 0 if needed
                    this.currentTargetIndex = (this.currentTargetIndex + 1) % this.waypoints.length; 
                    // Don't start walk animation here, let moveToNextWaypoint handle it
                    this.moveToNextWaypoint(); 
                }, this.pauseDurationMs); // Use the duration property
            },
             moveIgnoreAxes: { y: true } 
        });
    }

    // Spawn now uses the first waypoint as the initial position
    public spawnInWorld(world: World): void {
         if (this.waypoints.length === 0) {
            console.error(`[${this.name}] Cannot spawn, no waypoints defined.`);
            return;
        }
        const spawnPosition = this.waypoints[0];
        super.spawn(world, spawnPosition); // Use super.spawn
        this.startModelLoopedAnimations(['idle']);

        // Start the movement cycle after a short delay 
        // Only start if there's more than one point, otherwise just stay put
        if (this.waypoints.length > 1) {
             setTimeout(() => {
                 // Start moving towards the *second* point initially (index 1)
                 this.currentTargetIndex = 1; 
                 this.moveToNextWaypoint();
             }, 1000); 
        } 
    }
    
    public destroy(): void {
        // Remove listeners
        // this.off(EntityEvent.TICK, this._onTick); 
        this.off(EntityEvent.ENTITY_COLLISION, this._onEntityCollision); 

        if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = null;
        }
    }
} 