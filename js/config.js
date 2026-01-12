// Game Configuration Constants

const CONFIG = {
    // Canvas Settings
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,

    // Unit Counts (Default Army Composition) - REMOVED FOR UNLIMITED DEPLOYMENT
    // RED_INFANTRY: 6,
    // RED_CAVALRY: 4,
    // BLUE_INFANTRY: 6,
    // BLUE_CAVALRY: 4,

    // Infantry Stats
    INFANTRY: {
        ENTITY_COUNT: 100,
        MAX_SPEED: 80,          // pixels per second
        TURN_RATE: 0.8,         // radians per frame (faster for responsive movement)
        COLLISION_RADIUS: 12,   // pixels
        BASE_DAMAGE: 35,        // per volley (musket)
        MELEE_DAMAGE: 0.15,     // per melee frame (approx 9-10 dmg/sec)
        FIRE_RANGE: 250,        // pixels (Expanded from 150)
        RELOAD_DURATION: 15,    // seconds
        SIZE: 20,               // rectangle size
    },

    // Cavalry Stats
    CAVALRY: {
        ENTITY_COUNT: 50,
        MAX_SPEED: 150,         // pixels per second
        TURN_RATE: 0.5,         // radians per frame (faster for responsive movement)
        COLLISION_RADIUS: 15,   // pixels
        BASE_DAMAGE: 20,        // Unused?
        MELEE_DAMAGE: 0.25,     // per melee frame (approx 15 dmg/sec)
        CHARGE_SPEED: 120,      // speed threshold for charge bonus
        CHARGE_MULTIPLIER: 3.0, // damage bonus when charging
        SIZE: 20,               // rectangle size
    },

    // Cannon Stats
    CANNON: {
        ENTITY_COUNT: 15,           // Reduced from 20 (More vulnerable)
        MAX_SPEED: 30,              // Very slow
        TURN_RATE: 0.3,             // Slow turning
        COLLISION_RADIUS: 15,
        BASE_DAMAGE: 60,            // Reduced from 150 (No longer one-shots fresh infantry)
        MELEE_DAMAGE: 0.05,         // Terrible in melee
        FIRE_RANGE: 700,            // Long range (Increased from 500)
        RELOAD_DURATION: 30,        // 30 seconds fixed
        SIZE: 18,
    },

    // Formation Modifiers
    FORMATION: {
        LINE: {
            ACCURACY_BONUS: 1.1,        // 10% more accurate
            RELOAD_BONUS: 0.9,          // 10% faster reload (multiply duration)
            MOVEMENT_PENALTY: 0.9,      // 10% slower
            FIRE_ARC: Math.PI / 2,      // 90 degrees
        },
        COLUMN: {
            MOVEMENT_BONUS: 1.3,        // 30% faster
            VULNERABILITY: 1.5,         // 50% more damage taken
            FIRE_ARC: Math.PI / 2,      // 90 degrees
        },
        SQUARE: {
            MOVEMENT_PENALTY: 0,        // Cannot move
            CAVALRY_DEFENSE: 3.0,       // 3x resistance to cavalry
            FIRE_ARC: Math.PI * 2,      // 360 degrees
        },
    },

    // Directional Damage Multipliers
    DAMAGE: {
        CAVALRY_VS_INFANTRY_BONUS: 5.0, // Devastating impact if not in square
        SQUARE_VS_CAVALRY_BONUS: 4.0,   // Massive retaliation damage against cavalry charging square
        REAR_MULTIPLIER: 3.0,      // 0-60 degrees
        FLANK_MULTIPLIER: 2.0,     // 60-120 degrees
        FRONT_MULTIPLIER: 1.0,     // 120-180 degrees
        REAR_ANGLE: Math.PI / 3,   // 60 degrees
        FLANK_ANGLE: 2 * Math.PI / 3, // 120 degrees
    },

    // Accuracy by Distance (Infantry Fire)
    ACCURACY: {
        SHORT_RANGE: 50,           // pixels
        MEDIUM_RANGE: 100,         // pixels
        SHORT_MIN: 0.80,           // 80% base
        SHORT_MAX: 0.90,           // 90% max
        MEDIUM_MIN: 0.50,          // 50% base
        MEDIUM_MAX: 0.70,          // 70% max
        LONG_MIN: 0.20,            // 20% base
        LONG_MAX: 0.40,            // 40% max
    },

    // Cannon Accuracy (Significantly nerfed)
    CANNON_ACCURACY: {
        CLOSE_RANGE: 100,          // 0-100px
        MEDIUM_RANGE: 300,         // 100-300px
        CLOSE_MIN: 0.60,           // 60% (was 70%)
        CLOSE_MAX: 0.75,           // 75% (was 80%)
        MEDIUM_MIN: 0.30,          // 30% (was 40%)
        MEDIUM_MAX: 0.45,          // 45% (was 50%)
        LONG_MIN: 0.10,            // 10% (was 20%)
        LONG_MAX: 0.25,            // 25% (was 30%)
    },

    // Exhaustion System
    EXHAUSTION: {
        MOVEMENT_RATE: 0.1,        // per frame while moving
        COLUMN_MOVEMENT_RATE: 0.05, // reduced for column formation
        COMBAT_RATE: 5.0,          // per volley or melee hit
        RECOVERY_RATE: 0.08,       // per frame while stationary
        MAX: 100,
        SPEED_PENALTY: 0.5,        // up to 50% slower at max
        ACCURACY_PENALTY: 0.3,     // up to 30% less accurate at max
        RELOAD_PENALTY: 0.5,       // up to 50% slower reload at max
    },

    // Line of Sight
    LOS: {
        SAMPLE_RATE: 5,            // pixels between samples
        TERRAIN_BLOCKS: true,      // terrain can block LOS
        FRIENDLY_BLOCKS: true,     // friendly units block LOS
    },

    // Visual Effects
    EFFECTS: {
        MUZZLE_FLASH_DURATION: 0.1,    // seconds
        MUZZLE_FLASH_SIZE: 10,          // pixels
        SMOKE_DURATION: 1.0,            // seconds
        SMOKE_PARTICLES: 5,             // particle count
        SCREEN_SHAKE_INTENSITY: 3,      // pixels
        SCREEN_SHAKE_DURATION: 0.1,     // seconds
    },

    // Audio
    AUDIO: {
        MASTER_VOLUME: 0.7,
        MUSKET_VOLUME: 0.8,
        CAVALRY_VOLUME: 0.9,
        EXPLOSION_VOLUME: 1.0,
        MAX_DISTANCE: 500,         // max distance for volume falloff
    },

    // Colors
    COLORS: {
        RED_TEAM: '#d32f2f',
        BLUE_TEAM: '#1976d2',
        SELECTION_BOX: 'rgba(255, 255, 0, 0.3)',
        SELECTION_BORDER: '#ffff00',
        HEALTH_HIGH: '#4caf50',
        HEALTH_MEDIUM: '#ff9800',
        HEALTH_LOW: '#f44336',
        RELOAD_ACTIVE: '#ff9800',
        RELOAD_READY: '#4caf50',
        LOS_CLEAR: '#00ff00',
        LOS_BLOCKED: '#ff0000',
        MOVEMENT_ARROW: 'rgba(255, 255, 255, 0.7)',
    },

    // UI
    UI: {
        PANEL_HEIGHT: 150,         // pixels
        UNIT_BAR_HEIGHT: 30,       // pixels
        HEALTH_BAR_HEIGHT: 12,     // pixels
        RELOAD_BAR_HEIGHT: 8,      // pixels
    },

    // Debug
    DEBUG: {
        SHOW_LOS_RAYS: false,      // show LOS debug lines
        SHOW_FIRE_ARCS: false,     // show fire arc visualization
        SHOW_COLLISION_CIRCLES: false, // show collision radius
        SHOW_FORMATIONS: false,    // show formation grid positions
    }
};
