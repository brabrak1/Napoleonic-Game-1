// AI Perception Module - Analyzes game state and builds snapshots

class AIPerception {
    constructor(game) {
        this.game = game;
    }

    buildSnapshot(difficulty) {
        const blueUnits = this.game.units.filter(u => u.team === 'BLUE' && !u.isDead());
        const redUnits = this.game.units.filter(u => u.team === 'RED' && !u.isDead());

        const snapshot = {
            timestamp: this.game.gameTime,
            difficulty: difficulty,

            // Unit lists
            blueUnits: blueUnits,
            redUnits: redUnits,

            // Type counts
            blueByType: this.countByType(blueUnits),
            redByType: this.countByType(redUnits),

            // Derived features
            blueAlive: blueUnits.length,
            redAlive: redUnits.length,

            // Spatial analysis
            blueCannons: blueUnits.filter(u => u.type === 'CANNON'),
            redCannons: redUnits.filter(u => u.type === 'CANNON'),

            // Threat assessment
            cannonThreats: this.findCannonThreats(blueUnits, redUnits),
            cavalryThreats: this.findCavalryThreats(blueUnits, redUnits),

            // Line of engagement
            engagementLine: this.calculateEngagementLine(blueUnits, redUnits),
        };

        return snapshot;
    }

    countByType(units) {
        return {
            INFANTRY: units.filter(u => u.type === 'INFANTRY').length,
            CAVALRY: units.filter(u => u.type === 'CAVALRY').length,
            CANNON: units.filter(u => u.type === 'CANNON').length
        };
    }

    findCannonThreats(blueUnits, redUnits) {
        const threats = [];

        for (const blueCannon of blueUnits.filter(u => u.type === 'CANNON')) {
            const nearbyEnemies = redUnits.filter(red => {
                const dx = red.x - blueCannon.x;
                const dy = red.y - blueCannon.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist < 200; // Danger radius
            });

            if (nearbyEnemies.length > 0) {
                threats.push({
                    cannon: blueCannon,
                    enemies: nearbyEnemies,
                    severity: nearbyEnemies.length
                });
            }
        }

        return threats;
    }

    findCavalryThreats(blueUnits, redUnits) {
        const threats = [];

        for (const blueInf of blueUnits.filter(u => u.type === 'INFANTRY')) {
            const nearbyCavalry = redUnits.filter(red => {
                if (red.type !== 'CAVALRY') return false;
                const dx = red.x - blueInf.x;
                const dy = red.y - blueInf.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Time to impact estimation
                const approachSpeed = red.speed || 0;
                const timeToImpact = approachSpeed > 0 ? dist / approachSpeed : 999;

                return timeToImpact < 3.0; // 3 second window
            });

            if (nearbyCavalry.length > 0 && blueInf.formation !== 'SQUARE') {
                threats.push({
                    infantry: blueInf,
                    cavalry: nearbyCavalry,
                    urgency: Math.min(...nearbyCavalry.map(c => {
                        const dx = c.x - blueInf.x;
                        const dy = c.y - blueInf.y;
                        return Math.sqrt(dx * dx + dy * dy);
                    }))
                });
            }
        }

        // Sort by urgency (closest first)
        threats.sort((a, b) => a.urgency - b.urgency);
        return threats;
    }

    calculateEngagementLine(blueUnits, redUnits) {
        if (blueUnits.length === 0 || redUnits.length === 0) {
            return CONFIG.CANVAS_WIDTH / 2;
        }

        const blueAvgX = blueUnits.reduce((sum, u) => sum + u.x, 0) / blueUnits.length;
        const redAvgX = redUnits.reduce((sum, u) => sum + u.x, 0) / redUnits.length;

        return (blueAvgX + redAvgX) / 2;
    }
}
