// Exhaustion System - Manages exhaustion accumulation and recovery

class ExhaustionSystem {
    /**
     * Update exhaustion for a unit
     * @param {Unit} unit - The unit to update
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    static update(unit, deltaTime) {
        // Movement exhaustion
        if (unit.speed > 10) {
            // Moving units gain exhaustion
            const rate = unit.formation === 'COLUMN' ?
                CONFIG.EXHAUSTION.COLUMN_MOVEMENT_RATE :
                CONFIG.EXHAUSTION.MOVEMENT_RATE;

            unit.exhaustion = Math.min(CONFIG.EXHAUSTION.MAX,
                unit.exhaustion + rate * deltaTime);
        } else {
            // Stationary units recover
            unit.exhaustion = Math.max(0,
                unit.exhaustion - CONFIG.EXHAUSTION.RECOVERY_RATE * deltaTime);
        }

        // Apply exhaustion penalties to performance
        this.applyExhaustionPenalties(unit);
    }

    /**
     * Apply exhaustion penalties to unit performance
     * @param {Unit} unit - The unit to apply penalties to
     */
    static applyExhaustionPenalties(unit) {
        const exhaustionRatio = unit.exhaustion / CONFIG.EXHAUSTION.MAX;

        // Speed penalty (up to 50% slower)
        unit.speedMultiplier = 1.0 - (exhaustionRatio * CONFIG.EXHAUSTION.SPEED_PENALTY);

        // Accuracy penalty (up to 30% less accurate)
        unit.accuracyMultiplier = 1.0 - (exhaustionRatio * CONFIG.EXHAUSTION.ACCURACY_PENALTY);

        // Reload penalty (up to 50% slower reload)
        unit.reloadMultiplier = 1.0 + (exhaustionRatio * CONFIG.EXHAUSTION.RELOAD_PENALTY);
    }

    /**
     * Add combat exhaustion to a unit
     * @param {Unit} unit - The unit to add exhaustion to
     * @param {number} amount - Amount of exhaustion to add (optional, uses default)
     */
    static addCombatExhaustion(unit, amount = null) {
        const exhaustionAmount = amount !== null ? amount : CONFIG.EXHAUSTION.COMBAT_RATE;
        unit.exhaustion = Math.min(CONFIG.EXHAUSTION.MAX, unit.exhaustion + exhaustionAmount);

        // Update penalties immediately
        this.applyExhaustionPenalties(unit);
    }

    /**
     * Get exhaustion percentage
     * @param {Unit} unit - The unit to check
     * @returns {number} - Exhaustion as a percentage (0-100)
     */
    static getExhaustionPercentage(unit) {
        return (unit.exhaustion / CONFIG.EXHAUSTION.MAX) * 100;
    }

    /**
     * Check if unit is exhausted (above 70%)
     * @param {Unit} unit - The unit to check
     * @returns {boolean} - True if unit is heavily exhausted
     */
    static isExhausted(unit) {
        return unit.exhaustion > (CONFIG.EXHAUSTION.MAX * 0.7);
    }
}
