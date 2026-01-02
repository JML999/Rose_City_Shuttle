// src/entities/ForgeBlockEntity.ts
import { SmartBlockEntity } from './SmartBlockEntity';
import { Player, SimpleEntityController } from 'hytopia';

export class ForgeBlockEntity extends SmartBlockEntity {
    constructor(options: any) {
        super({
            ...options,
            controller: new SimpleEntityController()
        });
    }

    onPlayerInteract(player: Player) {
        // Interaction disabled - forging handled by Toolmaster NPC
        // Block remains as visual decor only
    }
}