import { Vector3 } from "hytopia";
export const BEGINNER_CRATE_SPAWN_LOCATIONS = [
    /*
    {
        id: 'beginner_pond_spawns',
        name: 'Beginner Pond Bait',
        coordinates: [
            new Vector3(-7, 15.5, -2),
            new Vector3(-6, 15.5, 1),
            new Vector3(-6, 15.5, -6),
            new Vector3(-4, 15.5, 10),
            new Vector3(-4, 15.5, 10),
            new Vector3(1, 15.5, -3),
            new Vector3(2, 15.5, -2),
            new Vector3(2, 15.5, 0),
            new Vector3(3, 15.5, 2),
            new Vector3(3, 15.5, 1),
        ],
        baitTypes: ['worm', 'grub'],
        difficulty: 'beginner'
    },
    {
        id: 'moon_beach_spawns',
        name: 'Moon Beach Bait',
        coordinates: [
            new Vector3(-11, 15.5, -13),
            new Vector3(-12, 15.5, -12),
            new Vector3(-15, 15.5, -11),
            new Vector3(-16, 15.5, -12),
            new Vector3(-17, 15.5, -14),
            new Vector3(-18, 15.5, -13),
            new Vector3(-18, 15.5, -12),
            new Vector3(-19, 15.5, -11),
            new Vector3(-20, 15.5, -14),
            new Vector3(-20, 15.5, -12),
        ],
        baitTypes: ['sand_flea', 'crab'],
        difficulty: 'medium'
    },
    */
    {
        id: 'boat_house_spawns',
        name: 'Boat House Bait',
        coordinates: [
            new Vector3(3, 15.5, -20),
            new Vector3(0, 15.5, -25),
            new Vector3(4, 5.5, -26),

        ],
        baitTypes: ['worm', 'cricket'],
        difficulty: 'beginner'
    },
    {
        id: 'old_dock_spawns',
        name: 'Old Dock Bait',
        coordinates: [
            new Vector3(9, 15.5, 0),
            new Vector3(11, 15.5, 0),
            new Vector3(12, 15.5, -1),
            new Vector3(14, 15.5, -3),
            new Vector3(13, 15.5, -4),
            new Vector3(12, 15.5, -5),
            new Vector3(10, 15.5, -6),
            new Vector3(11, 15.5, -7),
            new Vector3(12, 15.5, -7),
            new Vector3(12, 15.5, -8),
        ],
        baitTypes: ['worm', 'cricket'],
        difficulty: 'beginner'
    },
    {
        id: 'pier_spawns',
        name: 'Pier Bait',
        coordinates: [
            new Vector3(5, 15.5, 21),
            new Vector3(4, 15.5, 22),
            new Vector3(3, 15.5, 21),
            new Vector3(-2, 15.5, 15),
            new Vector3(-2, 15.5, 18),
            /*
            new Vector3(-4, 15.5, 16),
            new Vector3(-1, 15.5, 24),
            new Vector3(-1, 15.5, 25),
            new Vector3(-2, 15.5, 28),
            */
        ],
        baitTypes: ['shrimp', 'crab'],
        difficulty: 'medium'
    },
    {
        id: 'reef_spawns',
        name: 'Reef Bait',
        coordinates: [
            new Vector3(-24, 15.5, 19),
            new Vector3(-27, 15.5, 16),
            new Vector3(-28, 15.5, 15),
            new Vector3(-13, 15.5, 24),
            new Vector3(-11, 15.5, 25),
            new Vector3(-20, 15.5, 15),
            new Vector3(-18, 5.5, 17),
            new Vector3(-19, 5.5, 18),
            new Vector3(-18, 15.5, 19),
            new Vector3(-17, 15.5, 20),
        ],
        baitTypes: ['shrimp', 'clam'],
        difficulty: 'medium'
    },
    /*
    {
        id: 'wooded_spawns',
        name: 'Wooded Bait',
        coordinates: [
            new Vector3(-24, 15.5, 5),
            new Vector3(-25, 15.5, 8),
            new Vector3(-22, 15.5, 9),
            new Vector3(-23, 15.5, 3),
            new Vector3(-22, 15.5, -4),
            new Vector3(-25, 15.5, -7),
            new Vector3(-24, 5.5, -6),
            new Vector3(-23, 5.5, -5),
            new Vector3(-20, 15.5, -2),
            new Vector3(-22, 15.5, 0),
        ],
        baitTypes: ['shrimp', 'clam'],
        difficulty: 'medium'
    }
    */
];

export const DIRT_CRATE_SPAWN_LOCATIONS = [
    {
        id: 'beginner_pond_spawns',
        name: 'Beginner Pond Bait',
        coordinates: [
            new Vector3(-8.27, 4.75, -5.56),
            new Vector3(-10.24, 6.75, -6.31),
            new Vector3(-13.21, 5.75, -6.08),
            new Vector3(-14.29, 5.75, -2.60),
            new Vector3(-12.23, 4.75, -1.31),
            new Vector3(-12.58, 5.75, 2.53),
            new Vector3(-8.64, 4.75, 15.60),
            new Vector3(4.32, 4.75, 13.21),
            new Vector3(6.16, 4.75, 11.33),
            new Vector3(8.38, 4.75, 9.60),
            new Vector3(7.40, 4.75, -0.28),
            new Vector3(6.29, 5.75, -2.48),
            new Vector3(4.36, 4.75, -5.44),
            new Vector3(2.44, 5.75, -6.19),
            new Vector3(-0.19, 4.75, -6.28),
            new Vector3(7.80, 7.75, -6.49)
        ],
        baitTypes: ['worm', 'grub'],
        difficulty: 'beginner'
    },
    {
        id: 'moon_beach_spawns',
        name: 'Moon Beach Bait',
        coordinates: [
            new Vector3(-11, 15.5, -13),
            new Vector3(-12, 15.5, -12),
            new Vector3(-15, 15.5, -11),
            new Vector3(-16, 15.5, -12),
            new Vector3(-17, 15.5, -14),
            new Vector3(-18, 15.5, -13),
            new Vector3(-18, 15.5, -12),
            new Vector3(-20, 15.5, -14),
            new Vector3(-20, 15.5, -12),
        ],
        baitTypes: ['sand_flea', 'crab'],
        difficulty: 'medium'
    },
    {
        id: 'old_dock_spawns',
        name: 'Old Dock Bait',
        coordinates: [
            new Vector3(8.40, 7.75, -8.50),
            new Vector3(10.40, 6.75, -5.40),
            new Vector3(11.27, 7.75, -2.40),
            new Vector3(11.24, 7.75, -0.60),
            new Vector3(7.62, 8.75, -8.34),
            new Vector3(15.61, 4.75, 7.47), 
            new Vector3(12.79, 5.75, 9.56),
            new Vector3(11.51, 5.75, 12.51),
            new Vector3(10.87, 6.75, 11.36)
        ],
        baitTypes: ['worm', 'cricket'],
        difficulty: 'beginner'
    },
    {
        id: 'pier_spawns',
        name: 'Pier Bait',
        coordinates: [
            new Vector3(9.40, 5.75, 15.55),
            new Vector3(8.70, 6.75, 16.52),
            new Vector3(6.56, 5.75, 17.40),
            new Vector3(7.28, 6.75, 14.64),
            new Vector3(-5.31, 5.75, 17.60),
            new Vector3(-7.20, 7.75, 19.35)
        ],
        baitTypes: ['shrimp', 'crab'],
        difficulty: 'medium'
    },
    {
        id: 'reef_spawns',
        name: 'Reef Bait',
        coordinates: [
            new Vector3(-10.50, 7.75, 20.60),
            new Vector3(-13.58, 6.75, 20.43),
            new Vector3(-18.53, 7.75, 21.02),
            new Vector3(-18.70, 6.75, 18.64),
            new Vector3(-22.31, 7.75, 16.25),
            new Vector3(-25.20, 5.75, 10.36),
            
        ],
        baitTypes: ['shrimp', 'clam'],
        difficulty: 'medium'
    },
    {
        id: 'wooded_spawns',
        name: 'Wooded Bait',
        coordinates: [
            new Vector3(-24, 15.5, 5),
            new Vector3(-25, 15.5, 8),
            new Vector3(-22, 15.5, 9),
            new Vector3(-23, 15.5, 3),
            new Vector3(-22, 15.5, -4),
            new Vector3(-25, 15.5, -7),
            new Vector3(-24, 5.5, -6),
            new Vector3(-23, 5.5, -5),
            new Vector3(-20, 15.5, -2),
            new Vector3(-22, 15.5, 0),
            new Vector3(-17.62, 6.75, -3.48),
            new Vector3(-19.92, 6.75, -3.40),
            new Vector3(-18.39, 5.75, -5.55),
            new Vector3(-24.67, 4.75, -5.56),
            new Vector3(-25.29, 6.75, -1.41),
            new Vector3(-26.00, 5.75, 1.48)
        ],
        baitTypes: ['shrimp', 'clam'],
        difficulty: 'medium'
    }
];

export const CRATE_SPAWN_LOCATIONS = {
    beginner: BEGINNER_CRATE_SPAWN_LOCATIONS,
    // ... future spawn location sets
}; 