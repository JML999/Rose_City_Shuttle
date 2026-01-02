import { Player } from 'hytopia';
import type { DialogNpc } from './DialogNpc'; // Assuming DialogNpc is in the same directory

// Manages active DialogNpc instances spawned by WorldPopulator
export class NpcManager {
    private activeNpcs: Map<string, DialogNpc> = new Map();

    constructor() {
    }

    // Called by WorldPopulator when a DialogNpc is created
    public registerNpc(npcId: string, npcInstance: DialogNpc): void {
        if (this.activeNpcs.has(npcId)) {
            console.warn(`[NpcManager] NPC with ID ${npcId} already registered. Overwriting.`);
        }
        this.activeNpcs.set(npcId, npcInstance);
    }

    // Called when an NPC needs to be removed (e.g., despawned)
    public unregisterNpc(npcId: string): void {
        if (this.activeNpcs.delete(npcId)) {
        }
    }

    // Retrieves an active NPC instance by its ID
    public getNpcById(npcId: string): DialogNpc | undefined {
        return this.activeNpcs.get(npcId);
    }

    // Handles the 'merchantOption' message routed for NPCs
    public handleNpcOption(player: Player, npcId: string, option: number): void {
        const npc = this.getNpcById(npcId);
        if (npc) {
            npc.handleOption(player, option); // Call the NPC's specific handler
        } else {
            console.warn(`[NpcManager] Received option for unknown or inactive NPC ID: ${npcId}`);
        }
    }

    // Handles merchant purchases routed from GamePlayerEntity
    public handleNpcPurchase(player: Player, npcId: string, itemId: string, quantity: number, price: number): boolean {
        const npc = this.getNpcById(npcId);
        if (npc) {
            console.log(`[NpcManager] Routing purchase to NPC ${npcId} for player ${player.id}: ${quantity}x ${itemId} for $${price}`);
            
            // Check if NPC has a handlePurchase method
            if (typeof (npc as any).handlePurchase === 'function') {
                return (npc as any).handlePurchase(player, itemId, quantity, price);
            } else {
                console.warn(`[NpcManager] NPC ${npcId} does not support purchases`);
                return false;
            }
        } else {
            console.warn(`[NpcManager] Received purchase for unknown or inactive NPC ID: ${npcId}`);
            return false;
        }
    }

    // Handle wheel spin trigger from fish weighing
    public triggerWheelSpin(player: Player, fishData: any): void {
        
        // Find the collector NPC (assuming it has 'collector' in its ID)
        let collectorNpc = null;
        for (const [npcId, npc] of this.activeNpcs) {
            if (npcId.toLowerCase().includes('collector')) {
                collectorNpc = npc;
                break;
            }
        }
        
        if (collectorNpc) {
            if (typeof (collectorNpc as any).triggerSpinWheel === 'function') {
                
                // Create a CaughtFish object from the provided data
                const caughtFish = {
                    id: `${fishData.fishName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    name: fishData.fishName,
                    rarity: fishData.fishRarity,
                    weight: fishData.weight,
                    value: fishData.fishValue,
                    isBaitFish: false
                };
                
                (collectorNpc as any).triggerSpinWheel(player, caughtFish);
            } else {
                console.warn(`[NpcManager] Collector NPC found but no triggerSpinWheel method available`);
            }
        } else {
            console.warn(`[NpcManager] Could not find collector NPC for wheel spin`);
        }
    }

    // Method to clean up all NPCs (e.g., on server shutdown or area unload)
    public cleanupAll(): void {
        this.activeNpcs.forEach((npc, id) => {
            npc.despawn(); // Assuming DialogNpc has a despawn method
        });
        this.activeNpcs.clear();
    }
} 