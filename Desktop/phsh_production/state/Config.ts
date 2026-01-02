// Create a new file: Config.ts
export const CONFIG = {
    // Environment mode
    DEVELOPMENT_MODE: false, // Set to false for production
    
    // Player data persistence
    LOAD_FROM_PAST_PLAYERS: false, //Dev hack to load from past players
    SAVE_PLAYER_DATA: true,
    
    // Backup settings
    BACKUP_ENABLED: true,
    BACKUP_INTERVAL: 1000 * 60 * 61, // 1 hour
    
    // Logging
    VERBOSE_LOGGING: false,
    
    // Version tracking
    STATE_VERSION: 1,
};

// Apply development mode settings
if (CONFIG.DEVELOPMENT_MODE) {
    CONFIG.LOAD_FROM_PAST_PLAYERS = false;
    CONFIG.SAVE_PLAYER_DATA = false;
} else {
    CONFIG.LOAD_FROM_PAST_PLAYERS = true;
    CONFIG.SAVE_PLAYER_DATA = true;
}

// Helper functions
export const isDevMode = () => CONFIG.DEVELOPMENT_MODE;
export const canSaveData = () => CONFIG.SAVE_PLAYER_DATA;
export const canLoadFromPastPlayers = () => CONFIG.LOAD_FROM_PAST_PLAYERS;

