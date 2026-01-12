// Settings Panel - Manages game configuration UI

class SettingsPanel {
    constructor(game, sceneManager) {
        this.panel = document.getElementById('settingsPanel');
        this.toggleButton = document.getElementById('settingsToggle');
        this.applyButton = document.getElementById('applySettings');
        this.game = game;
        this.sceneManager = sceneManager;

        // Bind events
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.applyButton.addEventListener('click', () => this.applySettings());

        // Initialize sliders
        this.initializeControls();
    }

    /**
     * Initialize all control elements
     */
    initializeControls() {
        // Reload duration
        const reloadDuration = document.getElementById('reloadDuration');
        const reloadDurationValue = document.getElementById('reloadDurationValue');
        reloadDuration.value = CONFIG.INFANTRY.RELOAD_DURATION;
        reloadDurationValue.textContent = CONFIG.INFANTRY.RELOAD_DURATION;
        reloadDuration.addEventListener('input', (e) => {
            reloadDurationValue.textContent = e.target.value;
        });

        // Infantry damage
        const infantryDamage = document.getElementById('infantryDamage');
        const infantryDamageValue = document.getElementById('infantryDamageValue');
        infantryDamage.value = CONFIG.INFANTRY.BASE_DAMAGE;
        infantryDamageValue.textContent = CONFIG.INFANTRY.BASE_DAMAGE;
        infantryDamage.addEventListener('input', (e) => {
            infantryDamageValue.textContent = e.target.value;
        });

        // Fire range
        const fireRange = document.getElementById('fireRange');
        const fireRangeValue = document.getElementById('fireRangeValue');
        fireRange.value = CONFIG.INFANTRY.FIRE_RANGE;
        fireRangeValue.textContent = CONFIG.INFANTRY.FIRE_RANGE;
        fireRange.addEventListener('input', (e) => {
            fireRangeValue.textContent = e.target.value;
        });

        // Cavalry charge multiplier
        const chargeMultiplier = document.getElementById('chargeMultiplier');
        const chargeMultiplierValue = document.getElementById('chargeMultiplierValue');
        chargeMultiplier.value = CONFIG.CAVALRY.CHARGE_MULTIPLIER;
        chargeMultiplierValue.textContent = CONFIG.CAVALRY.CHARGE_MULTIPLIER.toFixed(1);
        chargeMultiplier.addEventListener('input', (e) => {
            chargeMultiplierValue.textContent = parseFloat(e.target.value).toFixed(1);
        });

        // Army composition
        document.getElementById('redInfantry').value = CONFIG.RED_INFANTRY;
        document.getElementById('redCavalry').value = CONFIG.RED_CAVALRY;
        document.getElementById('blueInfantry').value = CONFIG.BLUE_INFANTRY;
        document.getElementById('blueCavalry').value = CONFIG.BLUE_CAVALRY;

        // Cannon Settings
        const cannonReload = document.getElementById('cannonReload');
        const cannonReloadValue = document.getElementById('cannonReloadValue');
        cannonReload.value = CONFIG.CANNON.RELOAD_DURATION;
        cannonReloadValue.textContent = CONFIG.CANNON.RELOAD_DURATION;
        cannonReload.addEventListener('input', (e) => {
            cannonReloadValue.textContent = e.target.value;
        });

        const cannonDamage = document.getElementById('cannonDamage');
        const cannonDamageValue = document.getElementById('cannonDamageValue');
        cannonDamage.value = CONFIG.CANNON.BASE_DAMAGE;
        cannonDamageValue.textContent = CONFIG.CANNON.BASE_DAMAGE;
        cannonDamage.addEventListener('input', (e) => {
            cannonDamageValue.textContent = e.target.value;
        });

        const cannonRange = document.getElementById('cannonRange');
        const cannonRangeValue = document.getElementById('cannonRangeValue');
        cannonRange.value = CONFIG.CANNON.FIRE_RANGE;
        cannonRangeValue.textContent = CONFIG.CANNON.FIRE_RANGE;
        cannonRange.addEventListener('input', (e) => {
            cannonRangeValue.textContent = e.target.value;
        });
    }

    /**
     * Toggle settings panel visibility
     */
    toggle() {
        if (this.panel.style.display === 'none' || !this.panel.style.display) {
            this.panel.style.display = 'block';
        } else {
            this.panel.style.display = 'none';
        }
    }

    /**
     * Apply settings and restart game
     */
    applySettings() {
        // Update config
        CONFIG.INFANTRY.RELOAD_DURATION = parseFloat(document.getElementById('reloadDuration').value);
        CONFIG.INFANTRY.BASE_DAMAGE = parseInt(document.getElementById('infantryDamage').value);
        CONFIG.INFANTRY.FIRE_RANGE = parseInt(document.getElementById('fireRange').value);
        CONFIG.CANNON.RELOAD_DURATION = parseFloat(document.getElementById('cannonReload').value);
        CONFIG.CANNON.RELOAD_DURATION = parseFloat(document.getElementById('cannonReload').value);
        CONFIG.CANNON.BASE_DAMAGE = parseInt(document.getElementById('cannonDamage').value);
        CONFIG.CANNON.FIRE_RANGE = parseInt(document.getElementById('cannonRange').value);
        CONFIG.CAVALRY.CHARGE_MULTIPLIER = parseFloat(document.getElementById('chargeMultiplier').value);

        // Safety: Clamp unit counts to prevent freeze/crash
        // Max 100 infantry per side, 50 cavalry
        CONFIG.RED_INFANTRY = Math.min(100, Math.max(0, parseInt(document.getElementById('redInfantry').value) || 0));
        CONFIG.RED_CAVALRY = Math.min(50, Math.max(0, parseInt(document.getElementById('redCavalry').value) || 0));
        CONFIG.BLUE_INFANTRY = Math.min(100, Math.max(0, parseInt(document.getElementById('blueInfantry').value) || 0));
        CONFIG.BLUE_CAVALRY = Math.min(50, Math.max(0, parseInt(document.getElementById('blueCavalry').value) || 0));

        // Update input fields to show clamped values
        document.getElementById('redInfantry').value = CONFIG.RED_INFANTRY;
        document.getElementById('redCavalry').value = CONFIG.RED_CAVALRY;
        document.getElementById('blueInfantry').value = CONFIG.BLUE_INFANTRY;
        document.getElementById('blueCavalry').value = CONFIG.BLUE_CAVALRY;

        console.log("Applying Settings & Restarting...");

        // Restart game to apply new settings
        // Restart game to apply new settings
        if (this.sceneManager) {
            this.sceneManager.transitionTo('deployment');
        } else if (this.game) {
            // Fallback if no scene manager (shouldn't happen)
            this.game.restart();
        }

        // Close the panel
        this.toggle();
    }
}
