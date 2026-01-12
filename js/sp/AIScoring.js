// AI Scoring Module - Evaluates action priorities

class AIScoring {
    constructor(game) {
        this.game = game;
    }

    scoreTarget(unit, target, snapshot) {
        let score = 0;

        // Base value by type
        if (target.type === 'CANNON') score += 100;
        else if (target.type === 'CAVALRY') score += 50;
        else if (target.type === 'INFANTRY') score += 30;

        // Threat bonus (near Blue cannons)
        const nearBlueCannon = snapshot.blueCannons.some(cannon => {
            const dx = target.x - cannon.x;
            const dy = target.y - cannon.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 300;
        });
        if (nearBlueCannon) score += 50;

        // Health bonus (finish wounded)
        const healthPercent = target.getHealthPercentage();
        if (healthPercent < 0.3) score += 40;
        else if (healthPercent < 0.6) score += 20;

        // Distance penalty
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        score -= dist * 0.05;

        // Can fire bonus (for infantry/cannon)
        if ((unit.type === 'INFANTRY' || unit.type === 'CANNON') && unit.canFire) {
            score += 20;
        }

        return Math.max(0, score);
    }

    scorePosition(unit, x, y, snapshot) {
        let score = 0;

        // Prefer staying in formation
        const nearbyAllies = snapshot.blueUnits.filter(ally => {
            const dx = ally.x - x;
            const dy = ally.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 100 && ally.id !== unit.id;
        });
        score += nearbyAllies.length * 10;

        // Cannons prefer rear positions
        if (unit.type === 'CANNON') {
            const distFromBlueEdge = Math.abs(x - (CONFIG.CANVAS_WIDTH - 150));
            score -= distFromBlueEdge * 0.1;
        }

        // Infantry prefer center line
        if (unit.type === 'INFANTRY') {
            const distFromCenter = Math.abs(y - (CONFIG.CANVAS_HEIGHT / 2));
            score -= distFromCenter * 0.05;
        }

        return score;
    }
}
