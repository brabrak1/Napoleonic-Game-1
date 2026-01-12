// AI Deployment Module - Handles AI unit placement

class AIDeployment {
    constructor(game) {
        this.game = game;
    }

    selectUnitType(redUnits, blueUnits, difficulty) {
        const redTotal = redUnits.INFANTRY + redUnits.CAVALRY + redUnits.CANNON;
        const blueTotal = blueUnits.INFANTRY + blueUnits.CAVALRY + blueUnits.CANNON;

        // Should never happen (AI mirrors count), but safety check
        if (blueTotal >= redTotal) {
            return 'INFANTRY'; // Default
        }

        switch (difficulty) {
            case 'easy':
                // Random weighted (favor infantry)
                return this.selectWeightedRandom({ INFANTRY: 0.6, CAVALRY: 0.3, CANNON: 0.1 });

            case 'medium':
                // Match Red distribution loosely
                return this.selectMatchingType(redUnits, blueUnits, 0.3);

            case 'hard':
            case 'impossible':
            case 'napoleon':
                // Mirror Red distribution exactly
                return this.selectMatchingType(redUnits, blueUnits, 0.1);
        }
    }

    selectWeightedRandom(weights) {
        const rand = Math.random();
        let cumulative = 0;

        for (const [type, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (rand < cumulative) return type;
        }

        return 'INFANTRY'; // Fallback
    }

    selectMatchingType(redUnits, blueUnits, tolerance) {
        const redTotal = redUnits.INFANTRY + redUnits.CAVALRY + redUnits.CANNON || 1;

        // Calculate Red distribution
        const redDist = {
            INFANTRY: redUnits.INFANTRY / redTotal,
            CAVALRY: redUnits.CAVALRY / redTotal,
            CANNON: redUnits.CANNON / redTotal
        };

        // Calculate Blue distribution
        const blueTotal = blueUnits.INFANTRY + blueUnits.CAVALRY + blueUnits.CANNON || 1;
        const blueDist = {
            INFANTRY: blueUnits.INFANTRY / blueTotal,
            CAVALRY: blueUnits.CAVALRY / blueTotal,
            CANNON: blueUnits.CANNON / blueTotal
        };

        // Find type most under-represented
        let maxDeficit = -1;
        let chosenType = 'INFANTRY';

        for (const type of ['INFANTRY', 'CAVALRY', 'CANNON']) {
            const deficit = redDist[type] - blueDist[type];
            if (deficit > maxDeficit) {
                maxDeficit = deficit;
                chosenType = type;
            }
        }

        return chosenType;
    }

    selectPosition(unitType, blueUnits, existingBlueUnits, difficulty) {
        // Blue deployment zone: x = 900 to 1200
        const zoneLeft = 900;
        const zoneRight = 1200;
        const zoneWidth = zoneRight - zoneLeft;

        // Formation template
        const frontLineY = CONFIG.CANVAS_HEIGHT * 0.5;
        const supportLineY = CONFIG.CANVAS_HEIGHT * 0.5;
        const backLineY = CONFIG.CANVAS_HEIGHT * 0.5;

        let x, y;

        switch (unitType) {
            case 'INFANTRY':
                // Spread across front line
                const infCount = blueUnits.INFANTRY;
                const spacing = Math.min(100, CONFIG.CANVAS_HEIGHT / (infCount + 1));
                y = frontLineY + (Math.random() - 0.5) * (CONFIG.CANVAS_HEIGHT * 0.6);
                x = zoneLeft + 100 + Math.random() * (zoneWidth - 200);
                break;

            case 'CANNON':
                // Place behind infantry, center bias
                y = backLineY + (Math.random() - 0.5) * (CONFIG.CANVAS_HEIGHT * 0.4);
                x = zoneLeft + 50 + Math.random() * 100; // Near back edge
                break;

            case 'CAVALRY':
                // Place on flanks
                const isTopFlank = blueUnits.CAVALRY % 2 === 0;
                y = isTopFlank ? CONFIG.CANVAS_HEIGHT * 0.25 : CONFIG.CANVAS_HEIGHT * 0.75;
                x = zoneLeft + 100 + Math.random() * (zoneWidth - 200);
                break;
        }

        // Ensure within bounds
        x = Math.max(zoneLeft + 20, Math.min(zoneRight - 20, x));
        y = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, y));

        return { x, y };
    }
}
