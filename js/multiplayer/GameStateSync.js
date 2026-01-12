/**
 * GameStateSync.js
 * Handles serialization and synchronization of game state
 */

class GameStateSync {
    constructor(game) {
        this.game = game;
        this.playerTeam = null; // Set by MultiplayerManager
        this.lastSyncTime = 0;
        this.syncInterval = 1 / 15; // 15 Hz (66ms)
    }

    /**
     * Check if it's time to sync
     */
    shouldSync(deltaTime) {
        this.lastSyncTime += deltaTime;
        if (this.lastSyncTime >= this.syncInterval) {
            this.lastSyncTime = 0;
            return true;
        }
        return false;
    }

    /**
     * Serialize full game state for transmission
     */
    serializeGameState() {
        return {
            type: 'GAME_STATE_SYNC',
            timestamp: Date.now(),
            gameTime: this.game.gameTime,
            gameOver: this.game.gameOver,
            winner: this.game.winner,
            units: this.game.units.map(u => this.serializeUnit(u)),
            projectiles: this.game.projectiles.map(p => this.serializeProjectile(p))
        };
    }

    /**
     * Serialize single unit
     */
    serializeUnit(unit) {
        return {
            id: unit.id,
            type: unit.type,
            team: unit.team,
            x: unit.x,
            y: unit.y,
            vx: unit.vx,
            vy: unit.vy,
            angle: unit.angle,
            targetX: unit.targetX,
            targetY: unit.targetY,
            entityCount: unit.entityCount,
            maxEntityCount: unit.maxEntityCount,
            formation: unit.formation,
            isReloading: unit.isReloading,
            reloadProgress: unit.reloadProgress,
            exhaustion: unit.exhaustion,
            isMeleeLocked: unit.isMeleeLocked,
            currentTargetId: unit.currentTarget ? unit.currentTarget.id : null,
            // Movement properties required by Unit.update()
            maxSpeed: unit.maxSpeed,
            baseMaxSpeed: unit.baseMaxSpeed,
            speed: unit.speed,
            turnRate: unit.turnRate,
            collisionRadius: unit.collisionRadius,
            movementBonus: unit.movementBonus,
            movementPenalty: unit.movementPenalty,
            speedMultiplier: unit.speedMultiplier,
            // Combat modifiers required by formation system
            fireRateBonus: unit.fireRateBonus,
            accuracyBonus: unit.accuracyBonus,
            vulnerabilityMultiplier: unit.vulnerabilityMultiplier,
            damageBonus: unit.damageBonus,
            directionalDefense: unit.directionalDefense,
            cavalryDefense: unit.cavalryDefense
        };
    }

    /**
     * Serialize projectile
     */
    serializeProjectile(proj) {
        return {
            id: proj.id || Math.random(),
            x: proj.x,
            y: proj.y,
            vx: proj.vx,
            vy: proj.vy,
            damage: proj.damage,
            team: proj.team,
            // Additional properties required by Projectile.update()
            startX: proj.startX,
            startY: proj.startY,
            range: proj.range,
            speed: proj.speed,
            radius: proj.radius,
            isDead: proj.isDead,
            angle: proj.angle
        };
    }

    /**
     * Merge remote game state into local game
     */
    mergeRemoteState(remoteState) {
        // Update game-level properties
        this.game.gameTime = remoteState.gameTime;
        this.game.gameOver = remoteState.gameOver;
        this.game.winner = remoteState.winner;

        // Merge units
        this.mergeUnits(remoteState.units);

        // Merge projectiles
        this.mergeProjectiles(remoteState.projectiles);
    }

    /**
     * Merge remote units with local units
     */
    mergeUnits(remoteUnits) {
        // Create unit lookup map
        const localUnitsMap = new Map();
        this.game.units.forEach(u => localUnitsMap.set(u.id, u));

        // Track seen IDs
        const seenIds = new Set();

        // Update or create units from remote state
        for (const remoteUnit of remoteUnits) {
            seenIds.add(remoteUnit.id);

            if (localUnitsMap.has(remoteUnit.id)) {
                // Update existing unit
                this.updateUnit(localUnitsMap.get(remoteUnit.id), remoteUnit);
            } else {
                // Create new unit (should rarely happen - deployment sync)
                const newUnit = this.game.createUnit(
                    remoteUnit.type,
                    remoteUnit.team,
                    remoteUnit.x,
                    remoteUnit.y
                );
                newUnit.id = remoteUnit.id;
                this.updateUnit(newUnit, remoteUnit);
            }
        }

        // Remove units not in remote state (dead units)
        this.game.units = this.game.units.filter(u => seenIds.has(u.id));

        // Clear selection for opponent's units (prevent sync issues)
        if (this.playerTeam) {
            this.game.units.forEach(unit => {
                if (unit.team !== this.playerTeam) {
                    unit.isSelected = false;
                }
            });

            // Clean up selectedUnits array
            this.game.selectedUnits = this.game.selectedUnits.filter(
                unit => unit.team === this.playerTeam
            );
        }
    }

    /**
     * Update single unit from remote data
     */
    updateUnit(localUnit, remoteUnit) {
        // Position & velocity
        localUnit.x = remoteUnit.x;
        localUnit.y = remoteUnit.y;
        localUnit.vx = remoteUnit.vx;
        localUnit.vy = remoteUnit.vy;
        localUnit.angle = remoteUnit.angle;
        localUnit.targetX = remoteUnit.targetX;
        localUnit.targetY = remoteUnit.targetY;

        // Combat state
        localUnit.entityCount = remoteUnit.entityCount;
        localUnit.maxEntityCount = remoteUnit.maxEntityCount;
        localUnit.isReloading = remoteUnit.isReloading;
        localUnit.reloadProgress = remoteUnit.reloadProgress;
        localUnit.exhaustion = remoteUnit.exhaustion;
        localUnit.isMeleeLocked = remoteUnit.isMeleeLocked;

        // Movement properties
        localUnit.maxSpeed = remoteUnit.maxSpeed;
        localUnit.baseMaxSpeed = remoteUnit.baseMaxSpeed;
        localUnit.speed = remoteUnit.speed;
        localUnit.turnRate = remoteUnit.turnRate;
        localUnit.collisionRadius = remoteUnit.collisionRadius;
        localUnit.movementBonus = remoteUnit.movementBonus;
        localUnit.movementPenalty = remoteUnit.movementPenalty;
        localUnit.speedMultiplier = remoteUnit.speedMultiplier;

        // Combat modifiers
        localUnit.fireRateBonus = remoteUnit.fireRateBonus;
        localUnit.accuracyBonus = remoteUnit.accuracyBonus;
        localUnit.vulnerabilityMultiplier = remoteUnit.vulnerabilityMultiplier;
        localUnit.damageBonus = remoteUnit.damageBonus;
        localUnit.directionalDefense = remoteUnit.directionalDefense;
        localUnit.cavalryDefense = remoteUnit.cavalryDefense;

        // Formation
        if (localUnit.formation !== remoteUnit.formation) {
            localUnit.setFormation(remoteUnit.formation);
        }

        // Current target (resolve by ID) - ensure null safety
        if (remoteUnit.currentTargetId !== null && remoteUnit.currentTargetId !== undefined) {
            const target = this.game.units.find(u => u.id === remoteUnit.currentTargetId);
            localUnit.currentTarget = target || null;
        } else {
            localUnit.currentTarget = null;
        }
    }

    /**
     * Merge projectiles
     */
    mergeProjectiles(remoteProjectiles) {
        // Create proper Projectile instances from remote state
        this.game.projectiles = remoteProjectiles.map(p => {
            // Create a projectile instance
            const proj = new Projectile(
                p.x,
                p.y,
                p.angle,
                p.speed,
                p.damage,
                p.team,
                p.range
            );

            // Update with serialized state
            proj.id = p.id;
            proj.x = p.x;
            proj.y = p.y;
            proj.vx = p.vx;
            proj.vy = p.vy;
            proj.startX = p.startX;
            proj.startY = p.startY;
            proj.isDead = p.isDead;
            proj.radius = p.radius;

            return proj;
        });
    }

    /**
     * Serialize deployment event
     */
    serializeDeploymentEvent(unit) {
        return {
            type: 'DEPLOY_UNIT',
            timestamp: Date.now(),
            unit: {
                id: unit.id,
                type: unit.type,
                team: unit.team,
                x: unit.x,
                y: unit.y,
                angle: unit.angle
            }
        };
    }

    /**
     * Apply remote deployment event
     */
    applyDeploymentEvent(event) {
        const existingUnit = this.game.units.find(u => u.id === event.unit.id);
        if (existingUnit) {
            console.warn(`[Sync] Unit ${event.unit.id} already exists`);
            return;
        }

        const newUnit = this.game.createUnit(
            event.unit.type,
            event.unit.team,
            event.unit.x,
            event.unit.y
        );
        newUnit.id = event.unit.id;
        newUnit.angle = event.unit.angle;

        console.log(`[Sync] Deployed ${event.unit.team} ${event.unit.type} at (${event.unit.x}, ${event.unit.y})`);
    }
}
