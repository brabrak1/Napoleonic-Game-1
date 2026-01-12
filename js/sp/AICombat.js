// AI Combat Module - Tactical decision-making

class AICombat {
    constructor(game, perception, scoring, executor) {
        this.game = game;
        this.perception = perception;
        this.scoring = scoring;
        this.executor = executor;

        // State
        this.currentState = 'OPENING_SETUP';
        this.stateTimer = 0;
    }

    reset() {
        this.currentState = 'OPENING_SETUP';
        this.stateTimer = 0;
    }

    makeDecisions(snapshot, difficulty) {
        this.stateTimer += snapshot.timestamp;

        // Transition states
        if (this.stateTimer > 5) {
            this.currentState = 'MAIN_ENGAGEMENT';
        }

        // Emergency overrides
        if (snapshot.cannonThreats.length > 0) {
            this.handleCannonDefense(snapshot, difficulty);
        }

        if (snapshot.cavalryThreats.length > 0) {
            this.handleCavalryThreats(snapshot, difficulty);
        }

        // Main tactics
        switch (this.currentState) {
            case 'OPENING_SETUP':
                this.handleOpeningSetup(snapshot, difficulty);
                break;
            case 'MAIN_ENGAGEMENT':
                this.handleMainEngagement(snapshot, difficulty);
                break;
        }
    }

    handleCavalryThreats(snapshot, difficulty) {
        // Square up infantry under cavalry threat
        for (const threat of snapshot.cavalryThreats) {
            const inf = threat.infantry;

            // Toggle to square
            if (inf.formation !== 'SQUARE') {
                this.executor.queueCommand({
                    type: 'formation',
                    unitId: inf.id,
                    units: [inf],
                    formation: 'SQUARE'
                });
            }
        }
    }

    handleCannonDefense(snapshot, difficulty) {
        // Send nearest cavalry to intercept
        for (const threat of snapshot.cannonThreats) {
            const cannon = threat.cannon;
            const enemies = threat.enemies;

            // Find nearest Blue cavalry
            const nearbyCav = snapshot.blueUnits
                .filter(u => u.type === 'CAVALRY' && !u.isMeleeLocked)
                .sort((a, b) => {
                    const distA = Math.sqrt((a.x - cannon.x) ** 2 + (a.y - cannon.y) ** 2);
                    const distB = Math.sqrt((b.x - cannon.x) ** 2 + (b.y - cannon.y) ** 2);
                    return distA - distB;
                })[0];

            if (nearbyCav) {
                // Move to intercept
                const closestEnemy = enemies[0];
                this.executor.queueCommand({
                    type: 'move',
                    unitId: nearbyCav.id,
                    units: [nearbyCav],
                    targetX: closestEnemy.x,
                    targetY: closestEnemy.y
                });
            }
        }
    }

    handleOpeningSetup(snapshot, difficulty) {
        // Advance infantry line moderately
        const blueInfantry = snapshot.blueUnits.filter(u => u.type === 'INFANTRY');

        for (const inf of blueInfantry) {
            if (inf.formation === 'SQUARE') continue; // Don't move if squared

            // Target: move toward engagement line
            const targetX = snapshot.engagementLine - 100;
            const targetY = inf.y; // Keep current Y

            // Only move if far from target
            const dx = targetX - inf.x;
            const dy = targetY - inf.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                this.executor.queueCommand({
                    type: 'move',
                    unitId: inf.id,
                    units: [inf],
                    targetX: targetX,
                    targetY: targetY
                });
            }
        }
    }

    handleMainEngagement(snapshot, difficulty) {
        // Target priority: find best targets for each Blue unit
        for (const blueUnit of snapshot.blueUnits) {
            if (blueUnit.isMeleeLocked) continue; // Can't command
            if (blueUnit.formation === 'SQUARE') continue; // Immobile

            // Score all enemy targets
            const targets = snapshot.redUnits.map(red => ({
                unit: red,
                score: this.scoring.scoreTarget(blueUnit, red, snapshot)
            })).sort((a, b) => b.score - a.score);

            if (targets.length === 0) continue;

            const bestTarget = targets[0].unit;

            // Infantry/Cannon: rely on auto-targeting (they fire automatically)
            // Cavalry: issue move commands to flank/charge
            if (blueUnit.type === 'CAVALRY') {
                this.handleCavalryAction(blueUnit, bestTarget, snapshot, difficulty);
            }
        }
    }

    handleCavalryAction(cavalry, target, snapshot, difficulty) {
        // Do not charge infantry in SQUARE
        if (target.type === 'INFANTRY' && target.formation === 'SQUARE') {
            // Pull back or reroute
            const safeX = CONFIG.CANVAS_WIDTH - 200;
            const safeY = cavalry.y;

            this.executor.queueCommand({
                type: 'move',
                unitId: cavalry.id,
                units: [cavalry],
                targetX: safeX,
                targetY: safeY
            });
            return;
        }

        // Charge target
        this.executor.queueCommand({
            type: 'move',
            unitId: cavalry.id,
            units: [cavalry],
            targetX: target.x,
            targetY: target.y
        });
    }
}
