// data/quests/index.ts
import ancientCartographerFountain from './ancient_cartographer_fountain.json';
import ancientCartographerShadow from './ancient_cartographer_shadow.json';
import ancientCartographerToolmaster from './ancient_cartographer_toolmaster.json';
import ancientCartographerVault from './ancient_cartographer_vault.json';
import ancientWatersResearch1 from './ancient_waters_research_1.json';
import anglerBetQuest50lbFish from './angler_bet_quest_50lb_fish.json';
import anglerQuest1Sardines from './angler_quest_1_sardines.json';
import anglerQuest3KelpEel from './angler_quest_3_kelp_eel.json';
import anglerQuest3Pufferfish from './angler_quest_3_pufferfish.json';
import dailyCatch10Uncommon from './daily_catch_10_uncommon.json';
import dailyCatch25Fish from './daily_catch_25_fish.json';
import dailyCatch3Legendary from './daily_catch_3_legendary.json';
import dailyCatch5Rare from './daily_catch_5_rare.json';
import dailyCatch50Fish from './daily_catch_50_fish.json';
import dailyFish3Zones from './daily_fish_3_zones.json';
import dailyOpen1Chest from './daily_open_1_chest.json';
import dailyOpen2Chests from './daily_open_2_chests.json';
import dailyOpen3Chests from './daily_open_3_chests.json';
import dailyUse10GlowWorm from './daily_use_10_glow_worm.json';
import dailyUse10SquidTentacle from './daily_use_10_squid_tentacle.json';
import dailyUse25Bait from './daily_use_25_bait.json';
import dailyUse3FishHead from './daily_use_3_fish_head.json';
import dailyUse30Shrimp from './daily_use_30_shrimp.json';
import dailyUse5GhostShrimp from './daily_use_5_ghost_shrimp.json';
import dailyWeigh10Fish from './daily_weigh_10_fish.json';
import dailyWeigh100lbFish from './daily_weigh_100lb_fish.json';
import dailyWeigh2_100lbFish from './daily_weigh_2_100lb_fish.json';
import dailyWeigh2_200lbFish from './daily_weigh_2_200lb_fish.json';
import dailyWeigh250lbFish from './daily_weigh_250lb_fish.json';
import dailyWeigh5Fish from './daily_weigh_5_fish.json';
import dailyWeigh50lbFish from './daily_weigh_50lb_fish.json';
import dailyWeighLeaderboardFish from './daily_weigh_leaderboard_fish.json';
import explorerFragmentsOfMagnet from './explorer_fragments_of_magnet.json';
import explorerLionfishRequest from './explorer_lionfish_request.json';
import explorerSolveRiddle from './explorer_solve_riddle.json';
import explorerUltimateTreasure from './explorer_ultimate_treasure.json';
import farmerRareAlgaeQuest from './farmer_rare_algae_quest.json';
import fitzFinaleBet100lbTrophy from './fitz_finale_bet_100lb_trophy.json';
import fitzQuest0Worms from './fitz_quest_0_worms.json';
import fitzQuest1Sardines from './fitz_quest_1_sardines.json';
import fitzQuestGettingStarted from './fitz_quest_getting_started.json';
import fitzQuestBaitFishing from './fitz_quest_bait_fishing.json';
import fitzQuest2KelpEel from './fitz_quest_2_kelp_eel.json';
import fitzQuest3BigGrouper from './fitz_quest_3_big_grouper.json';
import fitzQuest4MapDelivery from './fitz_quest_4_map_delivery.json';
import brockStrengthTest from './brock_strength_test.json';
import forrestAnglerfishLight from './forrest_anglerfish_light.json';
import researcherPharaohHilt from './researcher_pharaoh_hilt.json';
import saltCollectorQuest from './salt_collector_quest.json';
import seaStoryCatch from './sea_story_catch.json';
import stargazerAnglerfishLight from './stargazer_anglerfish_light.json';

// Combine all quests into an array
// Note: Type assertion is done at export to avoid circular dependency with QuestManager
const QUEST_DEFINITIONS = [
    ancientCartographerFountain,
    ancientCartographerShadow,
    ancientCartographerToolmaster,
    ancientCartographerVault,
    ancientWatersResearch1,
    anglerBetQuest50lbFish,
    anglerQuest1Sardines,
    anglerQuest3KelpEel,
    anglerQuest3Pufferfish,
    dailyCatch10Uncommon,
    dailyCatch25Fish,
    dailyCatch3Legendary,
    dailyCatch5Rare,
    dailyCatch50Fish,
    dailyFish3Zones,
    dailyOpen1Chest,
    dailyOpen2Chests,
    dailyOpen3Chests,
    dailyUse10GlowWorm,
    dailyUse10SquidTentacle,
    dailyUse25Bait,
    dailyUse3FishHead,
    dailyUse30Shrimp,
    dailyUse5GhostShrimp,
    dailyWeigh10Fish,
    dailyWeigh100lbFish,
    dailyWeigh2_100lbFish,
    dailyWeigh2_200lbFish,
    dailyWeigh250lbFish,
    dailyWeigh5Fish,
    dailyWeigh50lbFish,
    dailyWeighLeaderboardFish,
    explorerFragmentsOfMagnet,
    explorerLionfishRequest,
    explorerSolveRiddle,
    explorerUltimateTreasure,
    farmerRareAlgaeQuest,
    fitzFinaleBet100lbTrophy,
    fitzQuest0Worms,
    fitzQuest1Sardines,
    fitzQuestGettingStarted,
    fitzQuestBaitFishing,
    fitzQuest2KelpEel,
    fitzQuest3BigGrouper,
    fitzQuest4MapDelivery,
    brockStrengthTest,
    forrestAnglerfishLight,
    researcherPharaohHilt,
    saltCollectorQuest,
    seaStoryCatch,
    stargazerAnglerfishLight
];

// Export as default (same pattern as NPC definitions)
// Type assertion happens here to avoid circular dependency
export default QUEST_DEFINITIONS as any[];

