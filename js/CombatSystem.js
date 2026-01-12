// Combat System - Handles musket volleys, melee combat, and damage calculation

class CombatSystem {
    /**
     * Resolve a musket volley from shooter to target
     * @param {Unit} shooter - The firing unit
     * @param {Unit} target - The target unit
     * @param {Array<Unit>} allUnits - All units (for visual effects)
     * @param {Object} visualEffects - Visual effects manager
     * @param {Object} audioManager - Audio manager
     * @returns {Object} - Combat result { hit: boolean, damage: number, multiplier: number }
     */
    static resolveMusketFire(shooter, target, allUnits, visualEffects = null, audioManager = null) {
        if (shooter.type !== 'INFANTRY' && shooter.type !== 'CANNON') {
            return { hit: false, damage: 0, multiplier: 1.0 };
        }

        // Calculate distance
        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate accuracy based on distance and unit type
        const baseAccuracy = shooter.type === 'CANNON'
            ? this.calculateCannonAccuracy(distance, shooter.fireRange)
            : this.calculateAccuracy(distance, shooter.fireRange);

        // Apply formation bonus
        const formationBonus = shooter.accuracyBonus || 1.0;

        // Apply exhaustion penalty
        const exhaustionPenalty = shooter.accuracyMultiplier || 1.0;

        // Final accuracy
        let finalAccuracy = baseAccuracy * formationBonus * exhaustionPenalty;

        // Point Blank Accuracy Bonus (Devastating at close range)
        if (distance / shooter.fireRange < 0.2) {
            finalAccuracy = 0.95; // Almost guaranteed hit at point blank
        } else if (distance / shooter.fireRange > 0.8) {
            finalAccuracy *= 0.1; // Severe penalty at really long range
        }

        // Roll for hit
        const hitRoll = Math.random();
        const hit = hitRoll < finalAccuracy;

        // Visual effects (Always play on fire, regardless of hit)
        if (visualEffects) {
            visualEffects.createMuzzleFlash(shooter.x, shooter.y, shooter.angle);
            visualEffects.createSmokeCloud(shooter.x, shooter.y);
            visualEffects.applyScreenShake(CONFIG.EFFECTS.SCREEN_SHAKE_INTENSITY);
        }

        // Audio effects (Always play on fire)
        if (audioManager) {
            if (shooter.type === 'CANNON') {
                audioManager.playCannonFire(shooter.x, shooter.y);

                // Spawn Projectile (Cannonball)
                // Calculate angle to target
                const angleToTarget = Math.atan2(dy, dx);
                // Inaccuracy based on finalAccuracy (lower accuracy = more jitter)
                const jitterMax = 0.15; // Max 0.15 radians (~8 degrees)
                const jitter = (Math.random() - 0.5) * 2 * jitterMax * (1 - finalAccuracy);
                const fireAngle = angleToTarget + jitter;

                // Create projectile
                const cannonball = new Projectile(
                    shooter.x,
                    shooter.y,
                    fireAngle,
                    300, // Speed (pixels/sec)
                    shooter.baseDamage,
                    shooter.team,
                    shooter.fireRange * 1.5 // Max travel range
                );

                return {
                    hit: false, // No instant hit
                    damage: 0,
                    multiplier: 1.0,
                    projectile: cannonball // Return projectile to be added
                };
            }
            audioManager.playMusketFire(shooter.x, shooter.y);
        }

        if (!hit) {
            return { hit: false, damage: 0, multiplier: 1.0 };
        }

        // Calculate damage
        const directionalMultiplier = this.calculateDirectionalMultiplier(shooter, target);
        let damage = shooter.baseDamage * (shooter.damageBonus || 1.0);

        // Apply multipliers
        damage *= directionalMultiplier;

        // Apply damage to target
        target.takeDamage(damage);

        // Add combat exhaustion
        ExhaustionSystem.addCombatExhaustion(shooter);
        ExhaustionSystem.addCombatExhaustion(target);

        return {
            hit: true,
            damage: damage,
            multiplier: directionalMultiplier,
            accuracy: finalAccuracy
        };
    }

    /**
     * Calculate accuracy based on distance to target
     * @param {number} distance - Distance to target in pixels
     * @param {number} maxRange - Maximum fire range
     * @returns {number} - Accuracy value between 0 and 1
     */
    static calculateAccuracy(distance, maxRange) {
        const ratio = distance / maxRange;

        // Short range (0-33%): 80-90% accuracy
        if (ratio < 0.33) {
            return CONFIG.ACCURACY.SHORT_MIN +
                Math.random() * (CONFIG.ACCURACY.SHORT_MAX - CONFIG.ACCURACY.SHORT_MIN);
        }

        // Medium range (33-67%): 50-70% accuracy
        if (ratio < 0.67) {
            return CONFIG.ACCURACY.MEDIUM_MIN +
                Math.random() * (CONFIG.ACCURACY.MEDIUM_MAX - CONFIG.ACCURACY.MEDIUM_MIN);
        }

        // Long range (67-100%): 20-40% accuracy
        return CONFIG.ACCURACY.LONG_MIN +
            Math.random() * (CONFIG.ACCURACY.LONG_MAX - CONFIG.ACCURACY.LONG_MIN);
    }

    /**
     * Calculate cannon accuracy based on distance
     * Cannons are more accurate at close range, less at long range
     * @param {number} distance - Distance to target in pixels
     * @param {number} maxRange - Maximum fire range (500px)
     * @returns {number} - Accuracy value between 0 and 1
     */
    static calculateCannonAccuracy(distance, maxRange) {
        // Close range (0-100px): 70-80% accuracy
        if (distance <= CONFIG.CANNON_ACCURACY.CLOSE_RANGE) {
            return CONFIG.CANNON_ACCURACY.CLOSE_MIN +
                Math.random() * (CONFIG.CANNON_ACCURACY.CLOSE_MAX - CONFIG.CANNON_ACCURACY.CLOSE_MIN);
        }

        // Medium range (100-300px): 40-50% accuracy
        if (distance <= CONFIG.CANNON_ACCURACY.MEDIUM_RANGE) {
            return CONFIG.CANNON_ACCURACY.MEDIUM_MIN +
                Math.random() * (CONFIG.CANNON_ACCURACY.MEDIUM_MAX - CONFIG.CANNON_ACCURACY.MEDIUM_MIN);
        }

        // Long range (300-500px): 20-30% accuracy
        return CONFIG.CANNON_ACCURACY.LONG_MIN +
            Math.random() * (CONFIG.CANNON_ACCURACY.LONG_MAX - CONFIG.CANNON_ACCURACY.LONG_MIN);
    }

    /**
     * Calculate directional damage multiplier based on attack angle
     * CRITICAL: Square formation nullifies all directional bonuses
     * @param {Unit} attacker - The attacking unit
     * @param {Unit} defender - The defending unit
     * @returns {number} - Damage multiplier (1.0x, 2.0x, or 3.0x)
     */
    static calculateDirectionalMultiplier(attacker, defender) {
        // Square formation nullifies all directional bonuses
        if (defender.directionalDefense) {
            return CONFIG.DAMAGE.FRONT_MULTIPLIER; // 1.0x
        }

        // Calculate attack angle relative to defender facing
        const attackAngle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
        let relativeAngle = attackAngle - defender.angle;

        // Normalize to [-PI, PI]
        relativeAngle = (relativeAngle + Math.PI) % (Math.PI * 2);
        if (relativeAngle < 0) relativeAngle += Math.PI * 2;
        relativeAngle -= Math.PI;

        const absAngle = Math.abs(relativeAngle);

        // Rear attack (0-60 degrees from directly behind)
        if (absAngle < CONFIG.DAMAGE.REAR_ANGLE) {
            return CONFIG.DAMAGE.REAR_MULTIPLIER; // 3.0x
        }

        // Flank attack (60-120 degrees)
        if (absAngle < CONFIG.DAMAGE.FLANK_ANGLE) {
            return CONFIG.DAMAGE.FLANK_MULTIPLIER; // 2.0x
        }

        // Front attack (120-180 degrees)
        return CONFIG.DAMAGE.FRONT_MULTIPLIER; // 1.0x
    }

    /**
     * Resolve melee combat between two units
     * Occurs when units collide
     * @param {Unit} unit1 - First unit
     * @param {Unit} unit2 - Second unit
     * @param {number} deltaTime - Time delta for push-back calculation
     * @param {Object} visualEffects - Visual effects manager
     * @param {Object} audioManager - Audio manager
     * @returns {Object} - { unit1Damage: number, unit2Damage: number }
     */
    static resolveMeleeCombat(unit1, unit2, deltaTime, visualEffects = null, audioManager = null) {
        // Calculate base damage for each unit using MELEE stats
        let damage1 = unit1.meleeDamage * (unit1.damageBonus || 1.0);
        let damage2 = unit2.meleeDamage * (unit2.damageBonus || 1.0);

        // Apply random RNG (0x to 2.0x) for dynamic combat
        // This creates "whiffs" and "crits"
        damage1 *= Math.random() * 2.0;
        damage2 *= Math.random() * 2.0;

        // Check for cavalry charge bonus
        if (unit1.type === 'CAVALRY') {
            const chargeBonus = this.calculateCavalryChargeBonus(unit1, unit2);
            damage1 *= chargeBonus;

            // Visual effect for cavalry charge
            if (chargeBonus > 1.5 && visualEffects) {
                visualEffects.createExplosion(unit2.x, unit2.y);
                visualEffects.applyScreenShake(CONFIG.EFFECTS.SCREEN_SHAKE_INTENSITY * 2);

                // 25% chance to play wounded sound
                if (audioManager && Math.random() < 0.25) {
                    audioManager.playWounded(unit2.x, unit2.y);
                }
            }

            // Decisive Combat: Massive damage bonus against infantry if not in square
            if (unit2.type === 'INFANTRY') {
                if (unit2.formation === 'SQUARE') {
                    damage1 = 0; // Invincible against charge
                    // Retaliation: Cavalry takes massive damage from bayonet wall
                    damage2 *= CONFIG.DAMAGE.SQUARE_VS_CAVALRY_BONUS;
                } else {
                    damage1 *= CONFIG.DAMAGE.CAVALRY_VS_INFANTRY_BONUS; // Slaughter (5.0x)
                }
            }
        }

        if (unit2.type === 'CAVALRY') {
            const chargeBonus = this.calculateCavalryChargeBonus(unit2, unit1);
            damage2 *= chargeBonus;

            if (chargeBonus > 1.5 && visualEffects) {
                visualEffects.createExplosion(unit1.x, unit1.y);
                visualEffects.applyScreenShake(CONFIG.EFFECTS.SCREEN_SHAKE_INTENSITY * 2);

                // 25% chance to play wounded sound
                if (audioManager && Math.random() < 0.25) {
                    audioManager.playWounded(unit1.x, unit1.y);
                }
            }

            // Decisive Combat: Massive damage bonus against infantry if not in square
            if (unit1.type === 'INFANTRY') {
                if (unit1.formation === 'SQUARE') {
                    damage2 = 0; // Invincible against charge
                    // Retaliation: Cavalry takes massive damage from bayonet wall
                    damage1 *= CONFIG.DAMAGE.SQUARE_VS_CAVALRY_BONUS;
                } else {
                    damage2 *= CONFIG.DAMAGE.CAVALRY_VS_INFANTRY_BONUS; // Slaughter (5.0x)
                }
            }
        }

        // Apply directional multipliers
        const multiplier1 = this.calculateDirectionalMultiplier(unit1, unit2);
        const multiplier2 = this.calculateDirectionalMultiplier(unit2, unit1);

        damage1 *= multiplier1;
        damage2 *= multiplier2;

        // Calculate counter-charge advantage / impact alignment
        // If Unit1 is moving towards Unit2, but Unit2 is NOT moving towards Unit1 (or is slower), Unit1 gets advantage
        const unit1Momentum = unit1.speed;
        const unit2Momentum = unit2.speed;

        // Simple momentum diff bonus (whoever is faster/charging harder deals more damage)
        if (unit1Momentum > unit2Momentum * 1.5) {
            damage1 *= 1.5; // Momentum bonus
        } else if (unit2Momentum > unit1Momentum * 1.5) {
            damage2 *= 1.5;
        }

        // Apply exhaustion penalty
        damage1 *= unit1.accuracyMultiplier || 1.0;
        damage2 *= unit2.accuracyMultiplier || 1.0;

        // Apply damage AND Check for Morale/Fleeing
        unit1.takeDamage(damage2);
        if (unit1.type === 'CAVALRY' && unit1.getHealthPercentage() < 0.3 && !unit1.isFleeing) {
            unit1.isFleeing = true;
            // Run to center of friendly edge? Simplified: Run random direction away
            unit1.setTarget(unit1.team === 'RED' ? 0 : 1200, unit1.y + (Math.random() - 0.5) * 200);
        }

        unit2.takeDamage(damage1);
        if (unit2.type === 'CAVALRY' && unit2.getHealthPercentage() < 0.3 && !unit2.isFleeing) {
            unit2.isFleeing = true;
            unit2.setTarget(unit2.team === 'RED' ? 0 : 1200, unit2.y + (Math.random() - 0.5) * 200);
        }

        // Add combat exhaustion
        if (unit1.exhaustion !== undefined) {
            unit1.exhaustion = Math.min(CONFIG.EXHAUSTION.MAX,
                unit1.exhaustion + CONFIG.EXHAUSTION.COMBAT_RATE);
        }
        if (unit2.exhaustion !== undefined) {
            unit2.exhaustion = Math.min(CONFIG.EXHAUSTION.MAX,
                unit2.exhaustion + CONFIG.EXHAUSTION.COMBAT_RATE);
        }

        // Apply push-back force to prevent overlap
        this.applyPushBack(unit1, unit2);

        // Audio Effects: Slash on impact, Clash cycle on sustain
        if (audioManager) {
            // Check Unit 1's timer (assume if one is fighting, both are)
            if (unit1.meleeTimer === 0) {
                // Initial Impact
                audioManager.playMeleeImpact(unit1.x, unit1.y);
            }

            // Increment timers
            unit1.meleeTimer += deltaTime;
            unit2.meleeTimer += deltaTime;

            // Cycle Clashes (approx every 0.6s)
            if (unit1.meleeTimer > 0.6) {
                audioManager.playMeleeClash(unit1.x, unit1.y);
                unit1.meleeTimer = 0.1; // Small offset to prevent double-slash on next frame logic if we reset to 0
                unit2.meleeTimer = 0.1;
            }
        }

        // Removed return object to reduce garbage collection pressure
    }

    /**
     * Calculate cavalry charge bonus
     * @param {Unit} cavalry - The cavalry unit
     * @param {Unit} target - The target unit
     * @returns {number} - Charge damage multiplier
     */
    static calculateCavalryChargeBonus(cavalry, target) {
        if (cavalry.type !== 'CAVALRY') return 1.0;

        // If pinned (in melee lock), no charge bonus after initial impact
        // (Assuming isMeleeLocked is set on collision, we might need a flag 'hasCharged' if we want single impact)
        // For now, if speed is low (which happens when pinned/locked), no bonus.
        if (cavalry.speed < cavalry.chargeSpeed) return 1.0;

        if (target.type !== 'INFANTRY') return 1.0;

        // Square formation has strong cavalry defense
        if (target.formation === 'SQUARE') {
            return 1.0 / target.cavalryDefense; // 0.33x damage (cavalry takes 3x damage instead)
        }

        // Full charge bonus
        return cavalry.chargeDamageMultiplier; // 3.0x
    }

    /**
     * Apply push-back force to prevent unit overlap
     * @param {Unit} unit1 - First unit
     * @param {Unit} unit2 - Second unit
     */
    static applyPushBack(unit1, unit2) {
        const dx = unit2.x - unit1.x;
        const dy = unit2.y - unit1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const minDistance = unit1.collisionRadius + unit2.collisionRadius;
        const overlap = minDistance - distance;

        if (overlap > 0) {
            const pushForce = overlap * 0.5;
            const nx = dx / distance;
            const ny = dy / distance;

            unit1.x -= nx * pushForce;
            unit1.y -= ny * pushForce;
            unit2.x += nx * pushForce;
            unit2.y += ny * pushForce;
        }
    }

    /**
     * Check if target is in fire arc
     * @param {Unit} shooter - The shooting unit
     * @param {Unit} target - The target unit
     * @returns {boolean} - True if target is in fire arc
     */
    static isInFireArc(shooter, target) {
        const angleToTarget = Math.atan2(target.y - shooter.y, target.x - shooter.x);
        let relativeAngle = angleToTarget - shooter.angle;

        // Normalize to [-PI, PI]
        relativeAngle = (relativeAngle + Math.PI) % (Math.PI * 2);
        if (relativeAngle < 0) relativeAngle += Math.PI * 2;
        relativeAngle -= Math.PI;

        const fireArc = shooter.getFireArc();
        return Math.abs(relativeAngle) <= fireArc / 2;
    }

    /**
     * Resolve projectile hit
     * @param {Projectile} projectile - The projectile
     * @param {Unit} target - The target unit
     * @param {Object} visualEffects - Visual effects manager
     * @param {Object} audioManager - Audio manager
     */
    static resolveProjectileHit(projectile, target, visualEffects, audioManager) {
        // Calculate damage with distance falloff / randomness
        let damage = projectile.damage;

        // Distance traveled factor (0 to 1)
        const distanceTraveled = Math.sqrt(
            (projectile.x - projectile.startX) ** 2 +
            (projectile.y - projectile.startY) ** 2
        );
        const rangeRatio = Math.min(1.0, distanceTraveled / projectile.range);

        // At long range (>60%), damage becomes highly variable
        // This represents kinetic energy loss / glancing hits
        if (rangeRatio > 0.6) {
            // Random multiplier between 0.2 and 1.0
            const randomFactor = 0.2 + (Math.random() * 0.8);
            damage *= randomFactor;
        }

        // Bonus vs specific targets
        if (target.formation === 'LINE' || target.formation === 'COLUMN') {
            damage *= 1.5; // Bowling ball effect
        }

        // Cannon Vulnerability: Cannons take massive damage from other projectiles (counter-battery or rifle fire)
        // Wait, rifles don't fire projectiles yet (they use instant hit). 
        // But if we ever add rifle projectiles, this works.
        // For now, this affects Counter-Battery fire.
        if (target.type === 'CANNON') {
            damage *= 3.0; // Cannons are fragile equipment
        }

        // Apply damage
        target.takeDamage(damage);

        // Effects
        if (visualEffects) {
            visualEffects.createExplosion(target.x, target.y); // Use explosion for impact
            visualEffects.applyScreenShake(2);
        }

        // Audio (Impact sound)
        if (audioManager) {
            audioManager.playMeleeImpact(target.x, target.y); // Reuse generic impact
        }
    }
}
