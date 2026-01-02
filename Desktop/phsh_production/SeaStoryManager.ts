// OpenAI imports commented out - optional feature
// import OpenAI from 'openai';
// import type { ChatCompletionMessageParam } from 'openai/src/resources/index.js';
// Import LeaderboardManager and necessary types - Attempt path correction
import { LeaderboardManager, type LeaderboardEntry, type SpeciesLeaderboard } from './LeaderboardManager';

// Define the structure of a Sea Story (kept as it's specific to this manager)
export interface SeaStory {
    fishType: string;       // e.g., "Cod", "Perch"
    playerName: string;
    weight: number;
    location?: string;      // Optional location string
    timestamp: number;      // When the story was generated
    narrative: string;      // The AI-generated story text
    mumblePrompt?: string;  // Optional: Specific mumble prompt for this story
}

// Interface for the data passed to the story generator, referencing imported type
interface NoteworthyCatch extends LeaderboardEntry {
    fishType: string;
}

// Represents the raw data about the top catch event
export interface SeaStoryEventData {
    fishType: string;
    playerName: string;
    playerId: string;
    weight: number;
    location?: string;
    timestamp: number;
}

// Represents the generated story components for a specific NPC
export interface NpcSeaStory {
    mumble: string;
    story: string;
}

// Removed duplicate LeaderboardEntry, LeaderboardData interfaces

export class SeaStoryManager {
    // private openai: OpenAI; // Commented out - OpenAI optional
    private stories: Map<string, string> = new Map(); // Stores generic ambiance stories { fishType: storyText }
    private currentSeaStory: SeaStory | null = null; // The main story of the day
    // Removed LEADERBOARD_PATH
    private readonly LOOKBACK_DAYS = 3; // How many days back to look for catches
    private readonly STORY_GENERATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    // private readonly STORY_GENERATION_INTERVAL = 60 * 1000; // For testing: 1 minute
    private leaderboardManager: LeaderboardManager; // Hold instance
    // Stores NPC-specific stories { npcId: { mumble, story } }
    private seaStoriesByNpcId: Map<string, NpcSeaStory> = new Map();
    // Stores the raw data of the top catch event for the day
    private currentSeaStoryEventData: SeaStoryEventData | null = null;
    // List of NPC IDs configured to tell the main Sea Story
    // TODO: Load this from config
    private readonly seaStoryNpcIds = ["fitzwilliam"];
    private readonly MAX_AMBIANCE_STORIES = 2;

    constructor() {
        console.log("[SeaStoryManager] Initializing...");
        // Reuse the OpenAI client setup from BaseAgent
        // OpenAI initialization commented out - optional feature
        // this.openai = new OpenAI({
        //     apiKey: process.env.OPENAI_API_KEY,
        // });

        // Get LeaderboardManager instance
        this.leaderboardManager = LeaderboardManager.instance;
        // Ensure LeaderboardManager is initialized before first generation if needed.
        // Assuming LeaderboardManager's initialize() is called elsewhere early in server setup.

        // REMOVE Initial generation - will be triggered by GameManager after Leaderboard init
        // this.generateDailyStories().catch(err => console.error("[SeaStoryManager] Initial story generation failed:", err));
        
        // Keep the interval for periodic updates
        setInterval(() => {
            this.generateDailyStories().catch(err => console.error("[SeaStoryManager] Periodic story generation failed:", err));
        }, this.STORY_GENERATION_INTERVAL);
    }

    // --- Public Methods for NPCs ---

    public getCurrentSeaStory(): SeaStory | null {
        return this.currentSeaStory;
    }

    // NEW: Getter for the current sea story fish type
    public getCurrentSeaStoryFishType(): string | null {
        return this.currentSeaStory?.fishType || null;
    }

    public getLatestStoryForFish(fishType: string): string | undefined {
        return this.stories.get(fishType);
    }

    public getRandomStory(): string | undefined {
        const allStories = Array.from(this.stories.values());
        if (allStories.length === 0) {
            return undefined;
        }
        const randomIndex = Math.floor(Math.random() * allStories.length);
        return allStories[randomIndex];
    }

    // --- Story Generation Logic ---

    public async generateDailyStories(): Promise<void> {
        console.log("[SeaStoryManager] Attempting to generate daily sea stories...");

        // Clear previous state
        this.seaStoriesByNpcId.clear();
        this.stories.clear();
        this.currentSeaStoryEventData = null;

        let allLeaderboards: Map<string, SpeciesLeaderboard>;
        try {
            allLeaderboards = this.leaderboardManager.getAllLeaderboards();
        } catch (error) {
            console.error("[SeaStoryManager] Failed to get leaderboard data:", error);
            return;
        }

        if (allLeaderboards.size === 0) {
            console.log("[SeaStoryManager] No leaderboard data found.");
            return;
        }

        // --- Flatten, Filter, and Sort Catches ---
        const allRecentCatches: NoteworthyCatch[] = this.getRecentNoteworthyCatches(allLeaderboards);

        if (allRecentCatches.length === 0) {
            console.log("[SeaStoryManager] No catches found within the last " + this.LOOKBACK_DAYS + " days.");
            return;
        }

        // Sort by value descending
        allRecentCatches.sort((a, b) => b.value - a.value);

        // --- Process Top Catch for Main NPC Stories --- 
        const topCatch = allRecentCatches[0];
        const seaStoryEventData: SeaStoryEventData = {
            fishType: topCatch.fishType,
            playerName: topCatch.playerName,
            playerId: topCatch.playerId,
            weight: topCatch.weight,
            location: topCatch.location,
            timestamp: topCatch.timestamp
        };
        this.currentSeaStoryEventData = seaStoryEventData;

        console.log("[SeaStoryManager] Top catch: " + topCatch.fishType + " by " + topCatch.playerName);

        let mainNarrative = "A noteworthy catch occurred, but the details are hazy."; // Default narrative

        for (const npcId of this.seaStoryNpcIds) {
            console.log("[SeaStoryManager] Generating story for NPC: " + npcId);
            try {
                const npcStory = await this.generateNpcSpecificSeaStory(seaStoryEventData, npcId);
                if (npcStory) {
                    this.seaStoriesByNpcId.set(npcId, npcStory);
                    console.log("[SeaStoryManager] Stored story for NPC " + npcId);
                    // Capture the narrative from the first/primary NPC (assumed Fitzwilliam for now)
                    if (npcId === this.seaStoryNpcIds[0]) { // Assuming first ID is primary
                        mainNarrative = npcStory.story;
                    }
                } else {
                    console.warn("[SeaStoryManager] Story generation failed for NPC " + npcId);
                }
            } catch (error) {
                console.error("[SeaStoryManager] Error generating story for NPC:", error);
            }
        }

        // --- Construct and store the main SeaStory object --- 
        this.currentSeaStory = {
            fishType: seaStoryEventData.fishType,
            playerName: seaStoryEventData.playerName,
            weight: seaStoryEventData.weight,
            location: seaStoryEventData.location,
            timestamp: Date.now(), // Use current time for story generation time
            narrative: mainNarrative // Use the captured narrative
        };
        console.log("[SeaStoryManager] Set currentSeaStory object:", this.currentSeaStory);

        // --- Generate Ambiance Stories --- 
        await this.generateAmbianceStories(allRecentCatches, topCatch.fishType);

        console.log("[SeaStoryManager] Finished daily sea story generation cycle.");
    }

    // Helper to flatten and filter leaderboard data
    private getRecentNoteworthyCatches(allLeaderboards: Map<string, SpeciesLeaderboard>): NoteworthyCatch[] {
        const recentCatches: NoteworthyCatch[] = [];
        const cutoffTimestamp = Date.now() - this.LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

        for (const [fishType, speciesData] of allLeaderboards.entries()) {
            const uniqueEntries = new Map<string, LeaderboardEntry>();
            
            const allEntries = [
                ...(speciesData.byWeight || []), 
                ...(speciesData.byValue || [])
            ];
            
            for (const entry of allEntries) {
                const key = entry.timestamp + "-" + entry.playerId + "-" + entry.weight;
                if (entry.timestamp && entry.timestamp >= cutoffTimestamp && !uniqueEntries.has(key)) {
                    uniqueEntries.set(key, entry);
                }
            }

            for (const entry of uniqueEntries.values()) {
                recentCatches.push({ ...entry, fishType });
            }
        }
        return recentCatches;
    }

    // Helper to generate ambiance stories (separated logic)
    private async generateAmbianceStories(allRecentCatches: NoteworthyCatch[], mainStoryFishType: string): Promise<void> {
        console.log("[SeaStoryManager] Generating ambiance stories...");
        const uniqueFishTypes = new Set(allRecentCatches.map(c => c.fishType));
        let generatedCount = 0;

        for (const fishType of uniqueFishTypes) {
            if (fishType === mainStoryFishType) continue;
            if (generatedCount >= this.MAX_AMBIANCE_STORIES) break;

            // Find the best catch for this ambiance fish type
            const ambianceCatches = allRecentCatches.filter(c => c.fishType === fishType);
            if (ambianceCatches.length === 0) continue;
            
            // Sort by value descending
            const ambianceCatch = ambianceCatches.sort((a, b) => b.value - a.value)[0];

            try {
                const storyText = await this.generateAmbianceStoryText(ambianceCatch);
                if (storyText) {
                    this.stories.set(fishType, storyText);
                    generatedCount++;
                    console.log("[SeaStoryManager] Generated ambiance story for " + fishType);
                }
            } catch (error) {
                console.error("[SeaStoryManager] Failed to generate ambiance story:", error);
            }
        }
    }

    // Generates the specific story (mumble + narrative) for one NPC
    private async generateNpcSpecificSeaStory(eventData: SeaStoryEventData, npcId: string): Promise<NpcSeaStory | null> {
        // TEMPORARY FIX: Disable OpenAI to prevent memory leak
        console.log("[SeaStoryManager] TEMP: Skipping OpenAI call for " + npcId + " to prevent memory leak");
        
        if (npcId === 'fitzwilliam') {
            return {
                mumble: "*hic*... heard 'bout that " + eventData.fishType + "... massive thing...",
                story: "Word around the docks is that " + eventData.playerName + " caught themselves a " + 
                       eventData.fishType + " weighing " + eventData.weight.toFixed(2) + "kg! " +
                       "That's the kind of catch that gets the whole port talking!"
            };
        }
        
        return null;
    }

    // Generates just the text for an ambiance story (Fitzwilliam's inspired tale)
    private async generateAmbianceStoryText(catchData: NoteworthyCatch): Promise<string | null> {
        // TEMPORARY FIX: Disable OpenAI to prevent memory leak
        console.log("[SeaStoryManager] TEMP: Skipping OpenAI ambiance call to prevent memory leak");
        
        return "I remember catching a " + catchData.fishType + " once, wasn't quite as impressive as that " +
               catchData.weight.toFixed(2) + "kg beast, but it was a good fight nonetheless!";
    }
} 