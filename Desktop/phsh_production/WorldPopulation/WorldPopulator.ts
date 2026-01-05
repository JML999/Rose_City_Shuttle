import { Entity, Vector3, Quaternion, World, RigidBodyType, SimpleEntityController, Player } from 'hytopia';
import PortalEntity from '../entities/PortalEntity'; 
// Adjust path as needed - assuming it's at the root of src/data/
import innLayout from '../data/layouts/inn.json'; 
import centralSquareLayout from '../data/layouts/central_square.json';
import mainStreetLayout from '../data/layouts/main_street.json';
import boatDockLayout from '../data/layouts/boat_dock.json';
// import toolmasterIslandLayout from '../data/layouts/toolmaster_island.json'; // REMOVED - Tool master island layout disabled
import ancientIsleLayout from '../data/layouts/ancient_isle.json';
import shadowIsleLayout from '../data/layouts/shadow_isle.json';
import stargazerIslandLayout from '../data/layouts/stargazer_island.json';
import brockPressurePlatesLayout from '../data/layouts/brock_pressure_plates.json';
import shipwreckLayout from '../data/layouts/shipwreck.json';
import shadyBeachLayout from '../data/layouts/shady_beach.json';
import ancientDigLayout from '../data/layouts/ancient_dig.json';
// import saltBaitCrafterLocationLayout from '../data/layouts/salt_bait_crafter_location.json'; // TEMPORARILY DISABLED - To be added later
// Import other layouts as you create them
// import house1Layout from '../data/layouts/house_1.json'; 
   
import npcDefinitions from '../data/npc_definitions'; // Assume pre-loading mechanism

// Import the new NPC class and its config
import { DialogNpc } from '../npcs/DialogNpc'; 
import type { NpcConfig } from '../npcs/DialogNpc'; // Use type-only import for the interface
import { AnglerDialogNpc } from '../npcs/AnglerDialogNpc'; // <-- Import Angler specific class
import { PlayerStateManager } from '../PlayerStateManager';
import { NpcManager } from '../npcs/NpcManager'; // Import NpcManager
import { SeaStoryManager, type SeaStory } from '../SeaStoryManager'; // Import SeaStoryManager
import GameManager from '../GameManager'; // Import GameManager to access QuestManager
import { FitzwilliamDialogNpc } from '../npcs/FitzwilliamDialogNpc'; // <-- ADD THIS
import { FishmongerDialogNpc } from '../npcs/FishmongerDialogNpc';
import { RoddyDialogNpc } from '../npcs/RoddyDialogNpc'; // <-- Import Roddy's class
import { CollectorDialogNpc } from '../npcs/CollectorDialogNpc'; // <-- ADD THIS IMPORT
import { MarinerDialogNpc } from '../npcs/MarinerDialogNpc';
import { ToolmasterDialogNpc } from '../npcs/ToolmasterDialogNpc';
// import { WizardDialogNpc } from '../npcs/WizardDialogNpc'; // DISABLED - Wizard removed from game 
import { BaitMasterDialogNpc } from '../npcs/BaitMasterDialogNpc';
import { ExplorerDialogNpc } from '../npcs/ExplorerDialogNpc';
// import { SaltBaitCrafterDialogNpc } from '../npcs/SaltBaitCrafterDialogNpc'; // TEMPORARILY DISABLED - To be added later
import { WelcomeDialogNpc } from '../npcs/WelcomeDialogNpc'; // <-- Import WelcomeDialogNpc
import { SeaStoryGossipNpc } from '../npcs/SeaStoryGossipNpc';
import { FarmerDialogNpc } from '../npcs/FarmerDialogNpc'; // <-- Import FarmerDialogNpc
import { OldAnglerDialogNpc } from '../npcs/OldAnglerDialogNpc'; // <-- Import OldAnglerDialogNpc
import { ForrestDialogNpc } from '../npcs/ForrestDialogNpc';
import { BrockDialogNpc } from '../npcs/BrockDialogNpc';
import { ResearcherDialogNpc } from '../npcs/ResearcherDialogNpc';

import { SmartBlockEntity } from './SmartBlockEntity';
import { ForgeBlockEntity } from './ForgeBlockEntity';
import { AltarBlockEntity } from './AltarBlockEntity';
import { StarAltarBlockEntity } from './StarAltarBlockEntity';
import { PressurePlateBlockEntity } from './PressurePlateBlockEntity';




// Optional: Define interfaces for type safety (good practice)
interface Coordinate { x: number; y: number; z: number; }
interface LayoutEntityData {
    type: 'furniture' | 'decor' | 'npc' | 'merchant_spot' | 'entity' | 'smart_block' | 'portal'; // Add portal type
    id: string;
    modelUri?: string; // Make optional as it might come from definition
    relativePosition: Coordinate;
    definitionId?: string;
    rotationY?: number; // Make optional, default to 0
    scale?: number; // Optional
    modelScale?: number; // Optional, for entities with modelScale directly specified
    facing?: Coordinate;
    // Portal-specific fields
    destinationRegionId?: string;
    destinationRegionPosition?: Coordinate;
    destinationRegionFacingAngle?: number;
    delayS?: number;
}
interface NpcDefinitionData {
    id: string;
    name: string;
    modelUri: string;
    modelScale: number;
    interaction?: { // Make interaction optional or define specific interaction types
        type: 'dialog';
        prompt?: string; // Make optional: Standard prompt
        options?: { // Make optional: Standard options with responses
             text: string;
             response: string;
             // action?: string; // Future placeholder
        }[];
        playerOptionText?: string; // Optional: Text for the single player choice (e.g., Fitzwilliam)
        fallbackStories?: { // Optional: Pool of random stories (e.g., Fitzwilliam)
             prompt: string; // The mumbled/initial prompt for this story
             response: string; // The full response for this story
        }[];
    };
    // --- ADD THESE OPTIONAL PROPERTIES ---
    idleAnimation?: string;
    interactAnimation?: string;
    interactAnimationLooped?: boolean;
    // ------------------------------------
    // Add other definition-specific fields like animations later
}

interface LayoutFileData {
    anchorCoordinate: Coordinate;
    description: string;
    entities: LayoutEntityData[];
}


export class WorldPopulator {
    
    // NpcManager now handles storing references

    constructor(
        private world: World,
        private playerStateManager: PlayerStateManager, // Inject PlayerStateManager
        private npcManager: NpcManager, // Inject NpcManager
        private seaStoryManager: SeaStoryManager, // Inject SeaStoryManager
        private gameManager: GameManager // Inject GameManager
    ) {}

    public populateAll(): void {

        // Process the imported layout data using type assertion
        this.processLayout(innLayout as LayoutFileData); 
        this.processLayout(centralSquareLayout as LayoutFileData); // <-- Process the new layout
        this.processLayout(mainStreetLayout as LayoutFileData); // <-- Process the new layout
        this.processLayout(boatDockLayout as LayoutFileData); // <-- Process the new layout
        // this.processLayout(toolmasterIslandLayout as LayoutFileData); // REMOVED - Tool master island layout disabled
        this.processLayout(ancientIsleLayout as LayoutFileData);
        this.processLayout(shadowIsleLayout as LayoutFileData);
        this.processLayout(stargazerIslandLayout as LayoutFileData);
        this.processLayout(brockPressurePlatesLayout as LayoutFileData);
        this.processLayout(shipwreckLayout as LayoutFileData);
        this.processLayout(shadyBeachLayout as LayoutFileData);
        this.processLayout(ancientDigLayout as LayoutFileData);
        // this.processLayout(saltBaitCrafterLocationLayout as LayoutFileData); // TEMPORARILY DISABLED - To be added later
        // this.processLayout(house1Layout as LayoutFileData); // Apply assertion here too when uncommented

    }

    // We'll fill this in next
    private processLayout(layoutData: LayoutFileData): void {
        const anchorPos = new Vector3(
            layoutData.anchorCoordinate.x,
            layoutData.anchorCoordinate.y,
            layoutData.anchorCoordinate.z
        );

        layoutData.entities.forEach((entityData: LayoutEntityData) => {
             const relativePos = new Vector3(
                 entityData.relativePosition.x,
                 entityData.relativePosition.y,
                 entityData.relativePosition.z
             );
             // Create a fresh copy of the anchor position before adding relative offset
             const finalPos = new Vector3(anchorPos.x, anchorPos.y, anchorPos.z).add(relativePos); 
             const rotationYRad = (entityData.rotationY || 0) * (Math.PI / 180);
             const finalRot = Quaternion.fromEuler(0, rotationYRad, 0);
             const facing = entityData.facing; // Get facing if provided


             // Call spawning methods based on type (we'll implement these next)
            try {
                switch(entityData.type) {
                    case 'furniture':
                    case 'decor':
                        this.spawnStaticModel(entityData, finalPos, finalRot, facing);
                        break;
                    case 'npc':
                         if (!facing) {
                             console.warn(`    NPC ${entityData.id} in layout is missing 'facing' data. NPC might not face the intended direction.`);
                             // Provide a default facing or skip facing? For now, we'll let spawnNpc handle potential undefined.
                         }
                         this.spawnNpc(entityData, finalPos, facing); // Pass facing (or undefined if missing)
                        break;
                    case 'entity':
                    case 'smart_block':
                        this.spawnSmartBlock(entityData, finalPos, finalRot, facing);
                        break;
                    case 'portal':
                        this.spawnPortal(entityData, finalPos, finalRot);
                        break;
                    default:
                        console.warn(`    Unknown entity type in layout: ${entityData.type} for entity ${entityData.id}`);
                }
            } catch (error) {
                console.error(`    ERROR: Failed to process entity ${entityData.id} (type: ${entityData.type}):`, error);
            }
        });
    }

    // We'll fill these in next
    private spawnStaticModel(data: LayoutEntityData, position: Vector3, rotation: Quaternion, facing?: Coordinate): void {
        
        if (!data.modelUri) {
            console.error(`    ERROR: ${data.type} ${data.id} is missing modelUri. Skipping spawn.`);
            return;
        }
        
        try {
            const entityOptions: any = {
                name: data.id,
                modelUri: data.modelUri,
                modelScale: data.scale || 1.0,
                controller: new SimpleEntityController(), 
                rigidBodyOptions: { type: RigidBodyType.KINEMATIC_POSITION } // Changed to KINEMATIC for facing
            };
            // Only add animations if the model might have them (some static furniture doesn't)
            // Try to add idle animation, but it's optional
            entityOptions.modelLoopedAnimations = ['idle'];
            
            const entity = new Entity(entityOptions);
            entity.spawn(this.world, position); 
            entity.setRotation(rotation); // Set rotation if needed for model orientation
            // Apply facing if explicitly provided in the layout
            if (facing) {
                const controller = entity.controller as SimpleEntityController;
                controller?.face(facing, 1); // Use face method
            }
        } catch (error) {
            console.error(`    ERROR: Failed to spawn ${data.type} ${data.id}:`, error);
        }
    }

    private spawnNpc(data: LayoutEntityData, position: Vector3, facing?: Coordinate): void {
        if (!data.definitionId) {
            console.warn(`    NPC ${data.id} in layout has no definitionId. Skipping interaction setup.`);
            // Optionally spawn a non-interactive model here if needed
            return;
        }

        // Type assertion for the definition
        const definition = npcDefinitions[data.definitionId] as NpcDefinitionData;
        if (!definition) {
            console.error(`    NPC definition not found for ID: ${data.definitionId}`);
            return;
        }
 
        // --- Handle potentially missing facing data ---
        let finalFacing: Coordinate;
        if (facing) {
            finalFacing = facing;
        } else {
            console.warn(`    NPC ${data.id} (Def: ${data.definitionId}) at ${JSON.stringify(position)} is missing 'facing' data in layout. Defaulting to facing positive Z.`);
            finalFacing = { x: 0, y: 0, z: 1 }; // Default facing
        }
        // -------------------------------------------


        // 1. Construct the NpcConfig
        const npcConfig: NpcConfig = {
            id: data.id, // Unique instance ID from the layout
            definitionId: data.definitionId,
            name: definition.name, // Add the name from the definition
            position: { x: position.x, y: position.y, z: position.z },
            facing: finalFacing, // Use the resolved facing coordinate
            modelUri: definition.modelUri,
            modelScale: definition.modelScale,
            interaction: definition.interaction,
            idleAnimation: definition.idleAnimation,
            interactAnimation: definition.interactAnimation,
            interactAnimationLooped: definition.interactAnimationLooped
        };

        // 2. Instantiate the correct NPC class based on definitionId
        let npcInstance: DialogNpc | null = null;
        switch (data.definitionId) {
            case 'angler':
                npcInstance = new AnglerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'fishmonger':
                npcInstance = new FishmongerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'fitzwilliam':
                npcInstance = new FitzwilliamDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'roddy':
                npcInstance = new RoddyDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'collector':
                npcInstance = new CollectorDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'mariner':
                npcInstance = new MarinerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'toolmaster':
                npcInstance = new ToolmasterDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'bait_master':
                npcInstance = new BaitMasterDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'explorer':
                npcInstance = new ExplorerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            // case 'wizard':
            //     npcInstance = new WizardDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
            //     break; // DISABLED - Wizard removed from game
            case 'welcome_npc':
                npcInstance = new WelcomeDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            // case 'salt_bait_crafter':
            //     npcInstance = new SaltBaitCrafterDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
            //     break; // TEMPORARILY DISABLED - To be added later
            case 'sea_story_gossip':
                npcInstance = new SeaStoryGossipNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'farmer':
                npcInstance = new FarmerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'old_angler':
                npcInstance = new OldAnglerDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'forrest':
                npcInstance = new ForrestDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'brock':
                npcInstance = new BrockDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            case 'researcher':
                npcInstance = new ResearcherDialogNpc(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
            default:
                // Fallback: generic dialog NPC with minimal logic
            npcInstance = new (class extends DialogNpc {
                 protected shouldReactToSeaStory(story: SeaStory): boolean { return false; }
                 protected getSeaStoryPrompt(story: SeaStory): string { return this.config.interaction?.prompt || "Greetings."; }
                 protected getSeaStoryResponse(story: SeaStory): string { return "Interesting."; }
                 protected getSeaStoryOptions(story: SeaStory): string[] { return ["Nevermind"]; }
                 public override handleOption(player: Player, option: number): void {
                        const playerUI = this.interactingPlayers.get(player.id);
                        if (!playerUI) return;
                        
                        let npcResponseText = playerUI.currentFallbackResponse || "Alright then.";
                        
                        // Check if option corresponds to configured options
                        const optionsConfig = this.config.interaction?.options;
                        if (optionsConfig && optionsConfig[option]) {
                            const configResponse = optionsConfig[option].response;
                            // Handle empty response strings by using fallback
                            npcResponseText = configResponse && configResponse.trim() !== "" ? configResponse : (playerUI.currentFallbackResponse || "I understand.");
                        }
                        
                        if (playerUI.dialog) {
                            try { playerUI.dialog.setState({ text: npcResponseText }); } catch(e) { /* ... */ }
                      }
                     if (playerUI.options) {
                          try { playerUI.options.unload(); } catch (e) {}
                          playerUI.options = undefined;
                     }
                 }
                })(this.world, this.playerStateManager, this.seaStoryManager, npcConfig);
                break;
        }

        if (npcInstance) {
            try {
                npcInstance.spawn();
                this.npcManager.registerNpc(data.id, npcInstance);
            } catch (error) {
                console.error(`    ERROR: Failed to spawn NPC ${data.id} (${data.definitionId}):`, error);
            }
        } else {
            console.error(`    ERROR: Failed to create NPC instance for ${data.id} (${data.definitionId})`);
        }
    }

    private spawnMerchantPlaceholder(data: LayoutEntityData, position: Vector3, facing?: Coordinate): void {
        
        const placeholderEntity = new Entity({
            name: data.id, // Use the layout ID (e.g., "fish_merchant_spot") as the entity name
            modelScale: data.scale || 1.0,
            blockTextureUri: "textures/blocks/stone.png",
            controller: new SimpleEntityController(), // Add controller for facing
            rigidBodyOptions: { type: RigidBodyType.FIXED } // Static placeholders don't move
        });
        
        placeholderEntity.spawn(this.world, position);

        // Apply facing if provided in the layout
        if (facing) {
            const controller = placeholderEntity.controller as SimpleEntityController;
            controller?.face(facing, 1);
        } else {
            console.warn(`       [${data.id}] No facing data provided for merchant placeholder.`);
            // Optionally calculate facing from rotationY if that was used and passed
        }
    }

    private spawnSmartBlock(data: LayoutEntityData, position: Vector3, rotation: Quaternion, facing?: Coordinate): void {
        
        let blockEntity = null;
        switch (data.definitionId) {
            case 'forge_block':
                blockEntity = new ForgeBlockEntity({
                    name: data.id,
                    modelUri: data.modelUri,
                    modelScale: data.modelScale || data.scale || 1.0,
                    rigidBodyOptions: { type: RigidBodyType.FIXED }
                });
                break;
            case 'altar_block':
                blockEntity = new AltarBlockEntity({
                    name: data.id,
                    modelUri: data.modelUri,
                    modelScale: data.modelScale || data.scale || 1.0,
                    rigidBodyOptions: { type: RigidBodyType.FIXED }
                });
                break;
            case 'star_altar_block':
                blockEntity = new StarAltarBlockEntity({
                    name: data.id,
                    modelUri: data.modelUri,
                    modelScale: data.modelScale || data.scale || 1.0,
                    rigidBodyOptions: { type: RigidBodyType.FIXED }
                });
                break;
            case 'pressure_plate_insect':
            case 'pressure_plate_fish':
            case 'pressure_plate_predator':
                // Extract plate type from definitionId
                const plateType = data.definitionId.replace('pressure_plate_', '') as 'insect' | 'fish' | 'predator';
                blockEntity = new PressurePlateBlockEntity({
                    name: data.id,
                    modelUri: data.modelUri,
                    modelScale: data.modelScale || data.scale || 1.0,
                    rigidBodyOptions: { type: RigidBodyType.FIXED },
                    plateType: plateType
                });
                break;
            // Add more cases for other smart blocks
            default:
                // fallback to a generic SmartBlockEntity
                blockEntity = new SmartBlockEntity({
                    name: data.id,
                    modelUri: data.modelUri,
                    modelScale: data.modelScale || data.scale || 1.0,
                    rigidBodyOptions: { type: RigidBodyType.FIXED }
                });
        }
        blockEntity.spawnWithCollider(this.world, position);
        blockEntity.setRotation(rotation);
        
        // Apply facing if provided
        if (facing) {
            const facingVector = new Vector3(facing.x, facing.y, facing.z);
            blockEntity.faceTowards(facingVector);
        }
    }

    private spawnPortal(data: LayoutEntityData, position: Vector3, rotation: Quaternion): void {
        if (!data.destinationRegionId || !data.destinationRegionPosition) {
            console.error(`[WorldPopulator] Portal ${data.id} missing required fields (destinationRegionId or destinationRegionPosition)`);
            return;
        }

        const portal = new PortalEntity({
            modelUri: data.modelUri ?? 'models/environment/Portal/dragon-portal.gltf',
            modelScale: data.modelScale ?? 0.7,
            destinationRegionId: data.destinationRegionId,
            destinationRegionPosition: data.destinationRegionPosition,
            destinationRegionFacingAngle: data.destinationRegionFacingAngle ?? 0,
            delayS: data.delayS ?? 0,
        });

        portal.spawn(this.world, position, rotation);
        console.log(`[WorldPopulator] Spawned portal ${data.id} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    }
}