/**
 * GameStateSync.js
 * Handles serialization and synchronization of game state
 */

class GameStateSync {
    constructor(game) {
        this.game = game;
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
            formation: unit.formation,
            isSelected: unit.isSelected,
            isReloading: unit.isReloading,
            reloadProgress: unit.reloadProgress,
            exhaustion: unit.exhaustion,
            isMeleeLocked: unit.isMeleeLocked,
            currentTargetId: unit.currentTarget ? unit.currentTarget.id : null
        };
    }

    /**
     * Serialize projectile
     */
    serializeProjectile(proj) {
        return {
            id: proj.id || Math.random(), // Ensure ID exists
            x: proj.x,
            y: proj.y,
            vx: proj.vx,
            vy: proj.vy,
            damage: proj.damage,
            team: proj.team,
            shooter: proj.shooter ? proj.shooter.id : null
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
        localUnit.isReloading = remoteUnit.isReloading;
        localUnit.reloadProgress = remoteUnit.reloadProgress;
        localUnit.exhaustion = remoteUnit.exhaustion;
        localUnit.isMeleeLocked = remoteUnit.isMeleeLocked;

        // Formation
        if (localUnit.formation !== remoteUnit.formation) {
            localUnit.setFormation(remoteUnit.formation);
        }

        // Selection (UI only, not critical)
        localUnit.isSelected = remoteUnit.isSelected;

        // Current target (resolve by ID)
        if (remoteUnit.currentTargetId !== null) {
            localUnit.currentTarget = this.game.units.find(u => u.id === remoteUnit.currentTargetId) || null;
        } else {
            localUnit.currentTarget = null;
        }
    }

    /**
     * Merge projectiles
     */
    mergeProjectiles(remoteProjectiles) {
        // For simplicity: Replace all projectiles with remote state
        // (Projectiles are transient and recreated frequently)
        this.game.projectiles = remoteProjectiles.map(p => {
            return {
                id: p.id,
                x: p.x,
                y: p.y,
                vx: p.vx,
                vy: p.vy,
                damage: p.damage,
                team: p.team,
                shooter: this.game.units.find(u => u.id === p.shooter) || null
            };
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
