// data/npc_definitions/index.ts
import innkeeper from './innkeeper.json';
import fitzwilliam from './fitzwilliam.json';
import farmer from './farmer.json';
import artist from './artist.json';
import angler from './angler.json';
import donkey from './donkey.json';
import drunk_farmer_1 from './drunk_farmer_1.json';
import drunk_farmer_2 from './drunk_farmer_2.json';
import fishmonger from './fishmonger.json';
import roddy from './roddy.json';
import collector from './collector.json';
import wizard from './wizard.json';
import mariner from './mariner.json';
import old_angler from './old_angler.json';
import toolmaster from './toolmaster.json';
import bait_master from './bait_master.json';
import explorer from './explorer.json';
import welcome_npc from './welcome_npc.json';
import salt_bait_crafter from './salt_bait_crafter.json';
import digger from './digger.json';
import sea_story_gossip from './sea_story_gossip.json';
import forrest from './forrest.json';
import brock from './brock.json';
import researcher from './researcher.json';
import placeholder_npc from './placeholder_npc.json';
// Import other NPC definition JSON files here...
// import someOtherNpc from './some_other_npc.json';

// Combine them into an object where the key is the ID
const npcDefinitions = {
  [innkeeper.id]: innkeeper,
  [fitzwilliam.id]: fitzwilliam,
  [farmer.id]: farmer,
  [artist.id]: artist,
  [angler.id]: angler,
  [donkey.id]: donkey,
  [drunk_farmer_1.id]: drunk_farmer_1,
  [drunk_farmer_2.id]: drunk_farmer_2,
  [fishmonger.id]: fishmonger,
  [roddy.id]: roddy,
  [collector.id]: collector,
  [wizard.id]: wizard,
  [mariner.id]: mariner,
  [old_angler.id]: old_angler,
  [toolmaster.id]: toolmaster,
  [bait_master.id]: bait_master,
  [explorer.id]: explorer,
  [welcome_npc.id]: welcome_npc,
  [salt_bait_crafter.id]: salt_bait_crafter,
  [digger.id]: digger,
  [sea_story_gossip.id]: sea_story_gossip,
  [forrest.id]: forrest,
  [brock.id]: brock,
  [researcher.id]: researcher,
  [placeholder_npc.id]: placeholder_npc
  // [someOtherNpc.id]: someOtherNpc,
  // Add other NPCs here...
};

export default npcDefinitions;