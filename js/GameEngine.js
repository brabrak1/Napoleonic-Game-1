// Game Engine - Core game logic and state management

class GameEngine {
    constructor(visualEffects, audioManager) {
        this.units = [];
        this.selectedUnits = [];
        this.projectiles = []; // New Projectile System
        this.gameTime = 0;
        this.gameOver = false;
        this.winner = null;

        // Systems
        this.visualEffects = visualEffects;
        this.audioManager = audioManager;

        // Unit ID counter
        this.nextUnitId = 0;

        // Don't auto-initialize armies - let deployment manager handle it
        // this.initializeArmies();
    }

    /**
     * Initialize armies based on configuration
     */
    initializeArmies() {
        // Red team (left side)
        for (let i = 0; i < CONFIG.RED_INFANTRY; i++) {
            const x = 100 + (i % 3) * 40;
            const y = 200 + Math.floor(i / 3) * 50;
            this.createUnit('INFANTRY', 'RED', x, y);
        }

        for (let i = 0; i < CONFIG.RED_CAVALRY; i++) {
            const x = 100 + (i % 2) * 40;
            const y = 500 + Math.floor(i / 2) * 50;
            this.createUnit('CAVALRY', 'RED', x, y);
        }

        // Blue team (right side)
        for (let i = 0; i < CONFIG.BLUE_INFANTRY; i++) {
            const x = CONFIG.CANVAS_WIDTH - 100 - (i % 3) * 40;
            const y = 200 + Math.floor(i / 3) * 50;
            const unit = this.createUnit('INFANTRY', 'BLUE', x, y);
            unit.angle = Math.PI; // Face left
        }

        for (let i = 0; i < CONFIG.BLUE_CAVALRY; i++) {
            const x = CONFIG.CANVAS_WIDTH - 100 - (i % 2) * 40;
            const y = 500 + Math.floor(i / 2) * 50;
            const unit = this.createUnit('CAVALRY', 'BLUE', x, y);
            unit.angle = Math.PI; // Face left
        }
    }

    /**
     * Create a new unit
     * @param {string} type - 'INFANTRY' or 'CAVALRY'
     * @param {string} team - 'RED' or 'BLUE'
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Unit} - The created unit
     */
    createUnit(type, team, x, y) {
        const unit = new Unit(this.nextUnitId++, type, team, x, y);
        this.units.push(unit);
        return unit;
    }

    /**
     * Main game update loop
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        if (this.gameOver) return;

        this.gameTime += deltaTime;

        // 1. Update all units (movement, rotation)
        for (const unit of this.units) {
            unit.update(deltaTime);

            // Track previous lock state to detect new engagements
            unit.wasMeleeLocked = unit.isMeleeLocked;

            // Reset melee lock after update (collision check will re-apply it for NEXT frame if needed)
            unit.isMeleeLocked = false;

            // Audio Refinement: "Grace Period" for melee timer.
            // Only reset the melee loop (which causes the "Slash" sound) if the unit has been
            // out of combat for more than 2 seconds. This prevents "Slash" spam when units
            // jitter in and out of contact range.
            if (!unit.wasMeleeLocked && (Date.now() - unit.lastMeleeTime > 2000)) {
                unit.meleeTimer = 0;
            }
        }

        // 2. Update reload timers
        for (const unit of this.units) {
            if ((unit.type === 'INFANTRY' || unit.type === 'CANNON') && unit.isReloading) {
                ReloadSystem.updateReload(unit, deltaTime, this.audioManager);
            }
        }

        // 3. Update exhaustion
        for (const unit of this.units) {
            ExhaustionSystem.update(unit, deltaTime);
        }

        // 4. Target acquisition (infantry only)
        // Optimization: Throttled updates. Only check for new targets every 15 frames (~0.25s)
        // based on unit ID to stagger the load.
        const frame = Math.floor(this.gameTime * 60); // approximate frame count
        const throttleRate = 15;

        for (const unit of this.units) {
            if ((unit.type === 'INFANTRY' || unit.type === 'CANNON') && !unit.isDead()) {
                let shouldScan = false;

                // 1. Check if we have a current target
                if (unit.currentTarget) {
                    // Verify current target is still valid (alive, in range, active)
                    if (unit.currentTarget.isDead() ||
                        !this.isTargetValid(unit, unit.currentTarget)) {
                        unit.currentTarget = null;
                        shouldScan = true; // Lost target, scan immediately
                    } else {
                        // Target is still valid, stick with it unless it's our turn to re-scan
                        if ((unit.id + frame) % throttleRate === 0) {
                            shouldScan = true;
                        }
                    }
                } else {
                    // No target, scan if it's our turn
                    if ((unit.id + frame) % throttleRate === 0) {
                        shouldScan = true;
                    }
                }

                if (shouldScan) {
                    unit.currentTarget = this.acquireTarget(unit);
                }
            }
        }

        // 4b. Update Projectiles & Check Hits
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(deltaTime);

            if (p.isDead) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Simple collision check against hostile units
            for (const unit of this.units) {
                if (unit.team !== p.team && !unit.isDead()) {
                    const dx = unit.x - p.x;
                    const dy = unit.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < unit.collisionRadius + p.radius) {
                        // HIT!
                        CombatSystem.resolveProjectileHit(p, unit, this.visualEffects, this.audioManager);
                        p.isDead = true;
                        this.projectiles.splice(i, 1);
                        break; // One hit per ball
                    }
                }
            }
        }

        // 5. Auto-fire volleys
        for (const unit of this.units) {
            if ((unit.type === 'INFANTRY' || unit.type === 'CANNON') &&
                unit.canFire &&
                unit.currentTarget &&
                !unit.isReloading) {
                // Fire!
                const combatResult = CombatSystem.resolveMusketFire(
                    unit,
                    unit.currentTarget,
                    this.units,
                    this.visualEffects,
                    this.audioManager
                );

                // Handle projectile spawn
                if (combatResult.projectile) {
                    this.projectiles.push(combatResult.projectile);
                } else if (unit.type === 'CANNON') {
                    // CANNON FIRED BUT NO PROJECTILE RETURNED
                }

                // Start reload (Set flag immediately to prevent multi-fire)
                unit.isReloading = true;
                ReloadSystem.startReload(unit, unit.reloadDuration || CONFIG.INFANTRY.RELOAD_DURATION);
            }
        }

        // 6. Check collisions and resolve melee combat
        this.checkCollisions(deltaTime);

        // 7. Remove dead units
        this.units = this.units.filter(u => !u.isDead());
        this.selectedUnits = this.selectedUnits.filter(u => !u.isDead());

        // 8. Check win condition
        this.checkWinCondition();

        // 9. Update visual effects
        this.visualEffects.update(deltaTime);

        // 10. Update audio (horse movement)
        if (this.audioManager) {
            let anyCavalryMoving = false;
            for (const unit of this.units) {
                if (unit.type === 'CAVALRY' && unit.speed > 10 && !unit.isDead()) {
                    anyCavalryMoving = true;
                    break;
                }
            }
            this.audioManager.updateHorseMovement(anyCavalryMoving);
        }
    }

    /**
     * Acquire target for infantry unit
     * @param {Unit} unit - The unit looking for a target
     * @returns {Unit|null} - The target unit, or null if none found
     */
    acquireTarget(unit) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return null;

        // Find all enemies
        const enemies = this.units.filter(u =>
            u.team !== unit.team &&
            !u.isDead()
        );

        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (const enemy of enemies) {
            const dx = enemy.x - unit.x;
            const dy = enemy.y - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check range
            if (distance > unit.fireRange) continue;

            // Check fire arc
            if (!CombatSystem.isInFireArc(unit, enemy)) continue;

            // Check line of sight (critical: checks terrain AND friendly units)
            const losResult = LOSSystem.checkLOS(unit, enemy, this.units);
            if (!losResult.hasLOS) continue;

            // Found a valid target
            // Heuristic: Distance is king.
            // Also prefer current target if distance difference is negligible to prevent jitter
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        return nearestEnemy;
    }

    /**
     * Check if a specific target is valid for a unit (range, angle, LOS)
     * Used for retaining targets without full re-scan
     * @param {Unit} unit - The shooter
     * @param {Unit} target - The target
     * @returns {boolean} - True if valid
     */
    isTargetValid(unit, target) {
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const distSq = dx * dx + dy * dy;

        // Range check (squared to avoid sqrt)
        if (distSq > unit.fireRange * unit.fireRange) return false;

        // Angle check
        if (!CombatSystem.isInFireArc(unit, target)) return false;

        // LOS Check
        const losResult = LOSSystem.checkLOS(unit, target, this.units);
        return losResult.hasLOS;
    }

    /**
     * Check collisions between units and resolve combat
     * @param {number} deltaTime - Time delta
     */
    checkCollisions(deltaTime) {
        for (let i = 0; i < this.units.length; i++) {
            for (let j = i + 1; j < this.units.length; j++) {
                const unit1 = this.units[i];
                const unit2 = this.units[j];

                // Optimization: Bounding box check (cheap)
                const dx = unit2.x - unit1.x;
                const maxDist = unit1.collisionRadius + unit2.collisionRadius + 10; // +10 safety margin

                if (Math.abs(dx) > maxDist) continue;

                const dy = unit2.y - unit1.y;
                if (Math.abs(dy) > maxDist) continue;

                // Expensive check
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = unit1.collisionRadius + unit2.collisionRadius;

                if (distance < minDistance) {
                    if (unit1.team !== unit2.team) {
                        // Enemy collision - melee combat

                        // Pin units
                        unit1.isMeleeLocked = true;
                        unit2.isMeleeLocked = true;

                        CombatSystem.resolveMeleeCombat(
                            unit1,
                            unit2,
                            deltaTime,
                            this.visualEffects,
                            this.audioManager
                        );
                    } else {
                        // Friendly collision - push back only
                        CombatSystem.applyPushBack(unit1, unit2);
                    }
                }
            }
        }
    }

    /**
     * Check win condition
     */
    checkWinCondition() {
        const redAlive = this.units.filter(u => u.team === 'RED').length;
        const blueAlive = this.units.filter(u => u.team === 'BLUE').length;

        if (redAlive === 0 && blueAlive > 0) {
            this.gameOver = true;
            this.winner = 'BLUE';
        } else if (blueAlive === 0 && redAlive > 0) {
            this.gameOver = true;
            this.winner = 'RED';
        }
    }

    /**
     * Select units within a box
     * @param {number} x1 - Box start X
     * @param {number} y1 - Box start Y
     * @param {number} x2 - Box end X
     * @param {number} y2 - Box end Y
     * @param {string} team - Team to select ('RED' or 'BLUE')
     */
    selectUnitsInBox(x1, y1, x2, y2, team) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        // Clear previous selection
        this.selectedUnits.forEach(u => u.isSelected = false);
        this.selectedUnits = [];

        // Select units in box
        for (const unit of this.units) {
            if ((team === null || unit.team === team) &&
                unit.x >= minX && unit.x <= maxX &&
                unit.y >= minY && unit.y <= maxY) {
                unit.isSelected = true;
                this.selectedUnits.push(unit);
            }
        }
    }

    /**
     * Select unit at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} team - Team to select
     * @returns {Unit|null} - Selected unit or null
     */
    selectUnitAtPosition(x, y, team) {
        for (const unit of this.units) {
            if (team === null || unit.team === team) {
                const dx = x - unit.x;
                const dy = y - unit.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= unit.collisionRadius) {
                    // Clear previous selection
                    this.selectedUnits.forEach(u => u.isSelected = false);
                    this.selectedUnits = [unit];
                    unit.isSelected = true;
                    return unit;
                }
            }
        }
        return null;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedUnits.forEach(u => u.isSelected = false);
        this.selectedUnits = [];
    }

    /**
     * Move selected units to target position
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     */
    moveSelectedUnits(targetX, targetY) {
        if (this.selectedUnits.length === 0) return;

        // Get formation type from first selected unit (assume all have same formation)
        const formation = this.selectedUnits[0].formation;

        // Calculate formation positions
        const positions = FormationSystem.calculateFormationPositions(
            this.selectedUnits,
            targetX,
            targetY,
            formation
        );

        // Set individual targets for each unit
        for (const position of positions) {
            // Skip if unit cannot move (SQUARE formation)
            if (position.unit.formation === 'SQUARE') continue;

            position.unit.setTarget(position.x, position.y);
        }
    }

    /**
     * Set formation for selected units
     * @param {string} formationType - 'LINE', 'COLUMN', 'SQUARE', or null
     */
    setFormationForSelected(formationType) {
        FormationSystem.applyFormation(this.selectedUnits, formationType);
    }

    /**
     * Get units by team
     * @param {string} team - 'RED' or 'BLUE'
     * @returns {Array<Unit>} - Units of the specified team
     */
    getUnitsByTeam(team) {
        return this.units.filter(u => u.team === team);
    }

    /**
     * Restart game
     */
    restart() {
        this.units = [];
        this.selectedUnits = [];
        this.projectiles = [];
        this.gameTime = 0;
        this.gameOver = false;
        this.winner = null;
        this.nextUnitId = 0;
        this.visualEffects.clear();
        if (this.audioManager && this.audioManager.stopAll) {
            this.audioManager.stopAll();
        }
        // Do NOT auto-initialize armies. Let deployment manager handle it.
        // this.initializeArmies();
    }
}
