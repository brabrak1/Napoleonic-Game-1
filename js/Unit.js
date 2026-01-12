// Unit Class - Represents Infantry or Cavalry units

class Unit {
    constructor(id, type, team, x, y) {
        this.id = id;
        this.type = type; // 'INFANTRY' or 'CAVALRY'
        this.team = team; // 'RED' or 'BLUE'

        // Position and Movement
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0; // facing direction in radians
        this.targetX = null;
        this.targetY = null;

        // Stats based on unit type
        if (type === 'INFANTRY') {
            this.entityCount = CONFIG.INFANTRY.ENTITY_COUNT;
            this.maxEntityCount = CONFIG.INFANTRY.ENTITY_COUNT;
            this.baseMaxSpeed = CONFIG.INFANTRY.MAX_SPEED;
            this.maxSpeed = this.baseMaxSpeed;
            this.turnRate = CONFIG.INFANTRY.TURN_RATE;
            this.collisionRadius = CONFIG.INFANTRY.COLLISION_RADIUS;
            this.baseDamage = CONFIG.INFANTRY.BASE_DAMAGE;
            this.meleeDamage = CONFIG.INFANTRY.MELEE_DAMAGE;
            this.size = CONFIG.INFANTRY.SIZE;

            // Infantry-specific properties
            this.fireRange = CONFIG.INFANTRY.FIRE_RANGE;
            this.isReloading = false;
            this.reloadProgress = 0;
            this.reloadDuration = CONFIG.INFANTRY.RELOAD_DURATION;
            this.canFire = true;
            this.currentTarget = null;
            this.lastFireTime = 0;
        } else if (type === 'CAVALRY') {
            this.entityCount = CONFIG.CAVALRY.ENTITY_COUNT;
            this.maxEntityCount = CONFIG.CAVALRY.ENTITY_COUNT;
            this.baseMaxSpeed = CONFIG.CAVALRY.MAX_SPEED;
            this.maxSpeed = this.baseMaxSpeed;
            this.turnRate = CONFIG.CAVALRY.TURN_RATE;
            this.collisionRadius = CONFIG.CAVALRY.COLLISION_RADIUS;
            this.baseDamage = CONFIG.CAVALRY.BASE_DAMAGE;
            this.meleeDamage = CONFIG.CAVALRY.MELEE_DAMAGE;
            this.size = CONFIG.CAVALRY.SIZE;

            // Cavalry-specific properties
            this.chargeSpeed = CONFIG.CAVALRY.CHARGE_SPEED;
            this.chargeDamageMultiplier = CONFIG.CAVALRY.CHARGE_MULTIPLIER;
        } else if (type === 'CANNON') {
            this.entityCount = CONFIG.CANNON.ENTITY_COUNT;
            this.maxEntityCount = CONFIG.CANNON.ENTITY_COUNT;
            this.baseMaxSpeed = CONFIG.CANNON.MAX_SPEED;
            this.maxSpeed = this.baseMaxSpeed;
            this.turnRate = CONFIG.CANNON.TURN_RATE;
            this.collisionRadius = CONFIG.CANNON.COLLISION_RADIUS;
            this.baseDamage = CONFIG.CANNON.BASE_DAMAGE;
            this.meleeDamage = CONFIG.CANNON.MELEE_DAMAGE;
            this.size = CONFIG.CANNON.SIZE;

            // Cannon-specific (like infantry)
            this.fireRange = CONFIG.CANNON.FIRE_RANGE;
            this.isReloading = false;
            this.reloadProgress = 0;
            this.reloadDuration = CONFIG.CANNON.RELOAD_DURATION;
            this.canFire = true;
            this.currentTarget = null;
            this.lastFireTime = 0;
        }

        // Formation
        this.formation = null; // 'LINE', 'COLUMN', 'SQUARE', or null
        this.formationAngle = 0;

        // Formation modifiers
        this.fireRateBonus = 1.0;
        this.accuracyBonus = 1.0;
        this.movementBonus = 1.0;
        this.movementPenalty = 1.0;
        this.vulnerabilityMultiplier = 1.0;
        this.directionalDefense = false;
        this.vulnerabilityMultiplier = 1.0;
        this.damageBonus = 1.0; // New: Damage modifier
        this.directionalDefense = false;
        this.cavalryDefense = 1.0;

        // Exhaustion
        this.exhaustion = 0;

        // Performance multipliers (affected by exhaustion)
        this.speedMultiplier = 1.0;
        this.accuracyMultiplier = 1.0;
        this.reloadMultiplier = 1.0;

        // Selection state
        this.isSelected = false;

        // Current speed (for movement)
        this.speed = 0;

        // Combat state
        this.isMeleeLocked = false;
        this.wasMeleeLocked = false;
        this.meleeTimer = 0;
    }

    update(deltaTime) {
        // If locked in melee OR in Square formation, cannot move
        if (this.isMeleeLocked || this.formation === 'SQUARE') {
            this.speed = 0;
            this.vx = 0;
            this.vy = 0;
            return;
        }

        // Update movement toward target
        if (this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);

            if (distToTarget > 5) {
                // Calculate target angle
                const targetAngle = Math.atan2(dy, dx);

                // Smoothly rotate toward target
                let angleDiff = targetAngle - this.angle;

                // Normalize to [-PI, PI]
                angleDiff = (angleDiff + Math.PI) % (Math.PI * 2);
                if (angleDiff < 0) angleDiff += Math.PI * 2;
                angleDiff -= Math.PI;

                this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);

                // Move forward (considering formation modifiers)
                let formationSpeedMod = 1.0;

                // Catch-Up Mechanic: If far from target position in formation, sprint!
                if (distToTarget > 50) {
                    formationSpeedMod = 1.5; // 50% faster to get into line
                }

                const effectiveMaxSpeed = this.maxSpeed * this.movementBonus * this.movementPenalty * this.speedMultiplier * formationSpeedMod;
                this.speed = Math.min(effectiveMaxSpeed, this.speed + 200 * deltaTime);

                this.vx = Math.cos(this.angle) * this.speed * deltaTime;
                this.vy = Math.sin(this.angle) * this.speed * deltaTime;

                this.x += this.vx;
                this.y += this.vy;
            } else {
                // Reached target
                this.targetX = null;
                this.targetY = null;
                this.speed = Math.max(0, this.speed - 100 * deltaTime);
            }
        } else {
            // Decelerate
            this.speed = Math.max(0, this.speed - 100 * deltaTime);
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        // Keep within canvas bounds
        this.x = Math.max(this.collisionRadius, Math.min(CONFIG.CANVAS_WIDTH - this.collisionRadius, this.x));
        this.y = Math.max(this.collisionRadius, Math.min(CONFIG.CANVAS_HEIGHT - this.collisionRadius, this.y));
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    setFormation(formationType) {
        this.formation = formationType;

        // Reset modifiers
        this.fireRateBonus = 1.0;
        this.accuracyBonus = 1.0;
        this.movementBonus = 1.0;
        this.movementPenalty = 1.0;
        this.vulnerabilityMultiplier = 1.0;
        this.damageBonus = 1.0;
        this.directionalDefense = false;
        this.cavalryDefense = 1.0;
        this.maxSpeed = this.baseMaxSpeed;

        if (formationType === 'LINE') {
            this.accuracyBonus = CONFIG.FORMATION.LINE.ACCURACY_BONUS;
            this.fireRateBonus = CONFIG.FORMATION.LINE.RELOAD_BONUS;
            this.movementPenalty = CONFIG.FORMATION.LINE.MOVEMENT_PENALTY;
            // Perk: Line formation focuses fire better
            this.damageBonus = 1.2;
        } else if (formationType === 'COLUMN') {
            this.movementBonus = CONFIG.FORMATION.COLUMN.MOVEMENT_BONUS;
            this.vulnerabilityMultiplier = CONFIG.FORMATION.COLUMN.VULNERABILITY;
            // Perk: Momentum adds to melee impact
            this.damageBonus = 1.3;
        } else if (formationType === 'SQUARE') {
            this.maxSpeed = 0; // Cannot move in square
            this.directionalDefense = true; // Nullifies flank/rear damage
            this.cavalryDefense = CONFIG.FORMATION.SQUARE.CAVALRY_DEFENSE;
            // Perk: Discipline improves reload speed slightly
            this.fireRateBonus = 0.85; // 15% faster reload
        }
    }

    takeDamage(amount) {
        this.entityCount -= amount;
        if (this.entityCount < 0) this.entityCount = 0;
    }

    isDead() {
        return this.entityCount <= 0;
    }

    getHealthPercentage() {
        return this.entityCount / this.maxEntityCount;
    }

    getFireArc() {
        if (this.type === 'CANNON') {
            return Math.PI / 6; // 30° narrow arc
        }

        if (this.type !== 'INFANTRY') return 0;

        if (this.formation === 'LINE') {
            return CONFIG.FORMATION.LINE.FIRE_ARC;
        } else if (this.formation === 'COLUMN') {
            return CONFIG.FORMATION.COLUMN.FIRE_ARC;
        } else if (this.formation === 'SQUARE') {
            return CONFIG.FORMATION.SQUARE.FIRE_ARC;
        }

        return Math.PI; // Default 180 degrees
    }
}
