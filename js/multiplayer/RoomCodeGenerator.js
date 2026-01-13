/**
 * RoomCodeGenerator.js
 * Generates Napoleonic-themed word combinations for room codes
 */

class RoomCodeGenerator {
    constructor() {
        this.adjectives = [
            'brave', 'grand', 'old', 'iron', 'imperial',
            'royal', 'gold', 'red', 'blue', 'bold',
            'noble', 'proud', 'swift', 'loyal', 'grim',
            'stout', 'wild', 'calm', 'keen', 'just',
            'elite', 'prime', 'main', 'high', 'vast'
        ];

        this.nouns = [
            'guard', 'eagle', 'cannon', 'saber', 'musket',
            'shako', 'lancer', 'hussar', 'horse', 'steed',
            'drum', 'flag', 'fort', 'camp', 'field',
            'ridge', 'hill', 'line', 'rank', 'march',
            'corps', 'chief', 'duke', 'star', 'lion'
        ];
    }

    /**
     * Generate a random room code
     * Format: adjective-noun-number (e.g., brave-eagle-42)
     */
    generate() {
        const adj = this.getRandomElement(this.adjectives);
        const noun = this.getRandomElement(this.nouns);
        const num = Math.floor(Math.random() * 100); // 0-99

        return `${adj}-${noun}-${num}`;
    }

    /**
     * Get random element from array
     */
    getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
