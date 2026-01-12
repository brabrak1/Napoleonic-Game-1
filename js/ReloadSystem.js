// Reload System - Manages reload timers and progress for infantry units

class ReloadSystem {
    /**
     * Start reload sequence for a unit
     * @param {Unit} unit - The unit to reload
     * @param {number} reloadDuration - Reload duration in seconds (optional, uses unit default)
     */
    static startReload(unit, reloadDuration = null) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return;

        unit.isReloading = true;
        unit.canFire = false;
        unit.reloadProgress = 0;
        unit.lastFireTime = Date.now();

        // Apply formation bonus and exhaustion penalty
        const formationModifier = unit.fireRateBonus || 1.0;
        const exhaustionPenalty = unit.reloadMultiplier || 1.0;

        // Calculate effective reload duration
        const baseDuration = reloadDuration !== null ? reloadDuration : unit.reloadDuration;
        unit.reloadDuration = baseDuration * formationModifier * exhaustionPenalty;
    }

    /**
     * Update reload progress for a unit
     * @param {Unit} unit - The unit to update
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     * @param {Object} audioManager - Audio manager instance
     */
    static updateReload(unit, deltaTime, audioManager = null) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return;
        if (!unit.isReloading) return;

        // Increment progress
        unit.reloadProgress += deltaTime / unit.reloadDuration;

        // Check if reload is complete
        if (unit.reloadProgress >= 1.0) {
            this.completeReload(unit, audioManager);
        }
    }

    /**
     * Complete reload for a unit
     * @param {Unit} unit - The unit that finished reloading
     * @param {Object} audioManager - Audio manager instance
     */
    static completeReload(unit, audioManager = null) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return;

        unit.isReloading = false;
        unit.canFire = true;
        unit.reloadProgress = 0;

        // Play reload completion sound (same as musket fire as requested)
        if (audioManager) {
            audioManager.playMusketFire(unit.x, unit.y);
        }
    }

    /**
     * Get remaining reload time for a unit
     * @param {Unit} unit - The unit to check
     * @returns {number} - Remaining time in seconds, or 0 if not reloading
     */
    static getRemainingTime(unit) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return 0;
        if (!unit.isReloading) return 0;

        return unit.reloadDuration * (1 - unit.reloadProgress);
    }

    /**
     * Check if unit can fire
     * @param {Unit} unit - The unit to check
     * @returns {boolean} - True if unit can fire
     */
    static canFire(unit) {
        if (unit.type !== 'INFANTRY' && unit.type !== 'CANNON') return false;
        return unit.canFire && !unit.isReloading;
    }
}
