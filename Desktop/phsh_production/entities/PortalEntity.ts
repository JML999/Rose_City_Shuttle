import {
  BlockColliderOptions,
  Collider,
  ColliderShape,
  CollisionGroup,
  Entity,
  ModelEntityOptions,
  RigidBodyType,
  Vector3Like,
  PlayerEntity, // Add PlayerEntity import
} from 'hytopia';

import GameManager from '../GameManager';
import { GamePlayerEntity } from '../GamePlayerEntity';
import GameRegion from '../GameRegion';

export type PortalEntityOptions = {
  delayS?: number;
  destinationRegionId: string;
  destinationRegionFacingAngle?: number;
  destinationRegionPosition: Vector3Like;
  type?: 'normal' | 'boss';
} & ModelEntityOptions;

export default class PortalEntity extends Entity {
  public readonly delayS: number;
  public readonly destinationRegionId: string;
  public readonly destinationRegionFacingAngle: number;
  public readonly destinationRegionPosition: Vector3Like;
  private readonly _playerTimeouts = new Map<GamePlayerEntity, NodeJS.Timeout>();

  public constructor(options: PortalEntityOptions) {
    // Use ruin-portal.gltf as default (found in your map.json)
    const defaultModelUri = 'models/environment/Portal/ruin-portal.gltf';
    const modelUri = options.modelUri ?? defaultModelUri;

    // Remove collider from constructor - we'll add it after spawn (like NPCs do)
    super({
      modelScale: options.modelScale ?? 2,
      modelUri: modelUri,
      modelLoopedAnimations: options.modelLoopedAnimations ?? ['idle'],
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        // No colliders here - add after spawn
      },
      tintColor: options.type === 'boss' ? { r: 255, g: 255, b: 0 } : undefined,
      ...options,
    });

    this.delayS = options.delayS ?? 0;
    this.destinationRegionId = options.destinationRegionId;
    this.destinationRegionFacingAngle = options.destinationRegionFacingAngle ?? 0;
    this.destinationRegionPosition = options.destinationRegionPosition;
    
    console.log(`[PortalEntity] Created portal: destination=${this.destinationRegionId}, position=${JSON.stringify(this.destinationRegionPosition)}`);
  }
  
  public override spawn(world: any, position: any, rotation?: any): void {
    console.log(`[PortalEntity] Spawning portal at (${position.x}, ${position.y}, ${position.z})`);
    super.spawn(world, position, rotation);
    console.log(`[PortalEntity] Portal spawned: isSpawned=${this.isSpawned}, world=${world?.id || 'unknown'}`);
    
    // Add collider AFTER spawning (like NPCs do)
    if (this.isSpawned) {
      console.log(`[PortalEntity] Adding collider - isSpawned=${this.isSpawned}, world=${this.world?.id || 'none'}`);
      const collider = this.createAndAddChildCollider({
        shape: ColliderShape.CYLINDER, // Use CYLINDER like NPCs do
        radius: 2.0, // Large radius to detect players
        halfHeight: 2.5, // Tall enough to detect players
        isSensor: true,
        // Note: NPCs don't set collisionGroups - using defaults
        onCollision: (other: Entity | BlockType, started: boolean) => {
          console.log(`[PortalEntity] Collision detected: started=${started}, other type=${other?.constructor?.name}, isPlayerEntity=${other instanceof PlayerEntity}, isGamePlayerEntity=${other instanceof GamePlayerEntity}`);
          
          // Check for PlayerEntity first (like NPCs do), then verify it's GamePlayerEntity
          if (!(other instanceof PlayerEntity)) {
            console.log(`[PortalEntity] Ignoring collision - not a PlayerEntity`);
            return;
          }
          
          // Cast to GamePlayerEntity for the joinRegion call
          if (!(other instanceof GamePlayerEntity)) {
            console.log(`[PortalEntity] Warning: PlayerEntity is not GamePlayerEntity, cannot teleport`);
            return;
          }

          console.log(`[PortalEntity] GamePlayerEntity collision confirmed, started=${started}`);
          
          if (started) {
            if (this.delayS > 0) {
              other.player.ui.sendData({
                type: 'showNotification',
                message: `Portal activating... You'll be teleported in ${this.delayS} seconds. Stay in the portal area.`,
                notificationType: 'warning',
              });
              const timeout = setTimeout(() => this._teleportPlayer(other), this.delayS * 1000);
              this._playerTimeouts.set(other, timeout);
            } else {
              this._teleportPlayer(other);
            }
          } else {
            const timeout = this._playerTimeouts.get(other);

            if (timeout) {
              clearTimeout(timeout);
              this._playerTimeouts.delete(other);
              other.player.ui.sendData({
                type: 'showNotification',
                message: 'You exited the portal. Re-enter to activate.',
                notificationType: 'warning',
              });
            }
          }
        },
      });
      console.log(`[PortalEntity] Collider added after spawn, collider=${collider ? 'created' : 'null'}`);
    } else {
      console.error(`[PortalEntity] Cannot add collider - entity not spawned! isSpawned=${this.isSpawned}`);
    }
  }

  private _teleportPlayer(player: GamePlayerEntity): void {
    console.log(`[PortalEntity] _teleportPlayer called for player ${player.player.id}`);
    const destinationRegion = GameManager.instance.getRegion(this.destinationRegionId);

    if (!destinationRegion) {
      console.error(`[PortalEntity] Destination region ${this.destinationRegionId} not found`);
      player.player.ui.sendData({
        type: 'showNotification',
        message: `Portal error: Destination not found.`,
        notificationType: 'error',
      });
      return;
    }

    if (player.isDead) {
      console.log(`[PortalEntity] Player is dead, skipping teleport`);
      return;
    }

    console.log(`[PortalEntity] Teleporting player to region ${this.destinationRegionId} at ${JSON.stringify(this.destinationRegionPosition)}`);
    
    // Use joinRegion method on GamePlayerEntity
    player.joinRegion(destinationRegion, this.destinationRegionFacingAngle, this.destinationRegionPosition);

    this._playerTimeouts.delete(player);
  }
}

