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
            this.updateMultiplayerState(); // Refresh UI based on current role
        } else {
            this.panel.style.display = 'none';
        }
    }

    /**
     * Apply settings and restart game
     */
    applySettings() {
        // Check if guest in multiplayer
        if (window.multiplayerManager &&
            window.multiplayerManager.isActive() &&
            !window.multiplayerManager.isHost) {
            // Show toast notification
            if (window.multiplayerManager.ui) {
                window.multiplayerManager.ui.showToast('Only the host can change settings', true);
            }
            return; // Prevent guest from applying
        }

        const settings = this.gatherSettings();

        // Host-only broadcast in multiplayer
        if (window.multiplayerManager && window.multiplayerManager.isActive()) {
            window.multiplayerManager.syncSettings(settings);
            this.applyLocalSettings(settings);
        } else {
            this.applyLocalSettings(settings);
        }

        // Close the panel
        this.toggle();
    }

    /**
     * Gather settings from UI
     */
    gatherSettings() {
        return {
            reloadDuration: parseFloat(document.getElementById('reloadDuration').value),
            infantryDamage: parseInt(document.getElementById('infantryDamage').value),
            fireRange: parseInt(document.getElementById('fireRange').value),
            cannonReload: parseFloat(document.getElementById('cannonReload').value),
            cannonDamage: parseInt(document.getElementById('cannonDamage').value),
            cannonRange: parseInt(document.getElementById('cannonRange').value),
            chargeMultiplier: parseFloat(document.getElementById('chargeMultiplier').value),
            redInfantry: Math.min(100, Math.max(0, parseInt(document.getElementById('redInfantry').value) || 0)),
            redCavalry: Math.min(50, Math.max(0, parseInt(document.getElementById('redCavalry').value) || 0)),
            blueInfantry: Math.min(100, Math.max(0, parseInt(document.getElementById('blueInfantry').value) || 0)),
            blueCavalry: Math.min(50, Math.max(0, parseInt(document.getElementById('blueCavalry').value) || 0)),
            mapSize: document.getElementById('mapSize').value // New Map Size
        };
    }

    /**
     * Apply settings locally
     */
    applyLocalSettings(settings) {
        // Update config
        CONFIG.INFANTRY.RELOAD_DURATION = settings.reloadDuration;
        CONFIG.INFANTRY.BASE_DAMAGE = settings.infantryDamage;
        CONFIG.INFANTRY.FIRE_RANGE = settings.fireRange;
        CONFIG.CANNON.RELOAD_DURATION = settings.cannonReload;
        CONFIG.CANNON.BASE_DAMAGE = settings.cannonDamage;
        CONFIG.CANNON.FIRE_RANGE = settings.cannonRange;
        CONFIG.CAVALRY.CHARGE_MULTIPLIER = settings.chargeMultiplier;

        CONFIG.RED_INFANTRY = settings.redInfantry;
        CONFIG.RED_CAVALRY = settings.redCavalry;
        CONFIG.BLUE_INFANTRY = settings.blueInfantry;
        CONFIG.BLUE_CAVALRY = settings.blueCavalry;

        // Apply Map Size
        this.applyMapSize(settings.mapSize);

        // Update UI inputs (clamp/sync check)
        document.getElementById('reloadDuration').value = settings.reloadDuration;
        // ... (Others if needed, but they come from UI so should match)

        console.log("Applying Settings & Restarting...", settings);

        // Restart game to apply new settings
        if (this.sceneManager) {
            this.sceneManager.transitionTo('deployment');
        } else if (this.game) {
            this.game.restart();
        }
    }

    /**
     * Apply remote settings (from Host)
     */
    applyRemoteSettings(settings) {
        // Update UI to match Host
        document.getElementById('reloadDuration').value = settings.reloadDuration;
        document.getElementById('infantryDamage').value = settings.infantryDamage;
        document.getElementById('fireRange').value = settings.fireRange;
        document.getElementById('cannonReload').value = settings.cannonReload;
        document.getElementById('cannonDamage').value = settings.cannonDamage;
        document.getElementById('cannonRange').value = settings.cannonRange;
        document.getElementById('chargeMultiplier').value = settings.chargeMultiplier;
        document.getElementById('redInfantry').value = settings.redInfantry;
        document.getElementById('redCavalry').value = settings.redCavalry;
        document.getElementById('blueInfantry').value = settings.blueInfantry;
        document.getElementById('blueCavalry').value = settings.blueCavalry;
        document.getElementById('mapSize').value = settings.mapSize;

        this.applyLocalSettings(settings);
    }

    /**
     * Apply Map Size logic
     */
    applyMapSize(size) {
        let width = 1200;
        let height = 800;

        switch (size) {
            case 'SMALL': width = 800; height = 600; break;
            case 'MEDIUM': width = 1200; height = 800; break;
            case 'LARGE': width = 1600; height = 1200; break;
            case 'XLARGE': width = 2000; height = 1600; break;
        }

        CONFIG.CANVAS_WIDTH = width;
        CONFIG.CANVAS_HEIGHT = height;

        // Resize Canvases
        const gameCanvas = document.getElementById('gameCanvas');
        const battleCanvas = document.getElementById('battleCanvas');

        if (gameCanvas) {
            gameCanvas.width = width;
            gameCanvas.height = height;
        }
        if (battleCanvas) {
            battleCanvas.width = width;
            battleCanvas.height = height;
        }
    }

    /**
     * Update UI based on multiplayer role
     */
    updateMultiplayerState() {
        const isGuest = window.multiplayerManager &&
                        window.multiplayerManager.isActive() &&
                        !window.multiplayerManager.isHost;

        if (isGuest) {
            this.applyButton.disabled = true;
            this.applyButton.textContent = '🔒 Host Controls Settings';
            this.applyButton.style.backgroundColor = '#666';
            this.applyButton.style.cursor = 'not-allowed';

            // Disable all inputs
            this.disableInputs(true);
        } else {
            this.applyButton.disabled = false;
            this.applyButton.textContent = 'Apply & Restart';
            this.applyButton.style.backgroundColor = '#4caf50';
            this.applyButton.style.cursor = 'pointer';

            this.disableInputs(false);
        }
    }

    /**
     * Disable/enable all setting inputs
     */
    disableInputs(disabled) {
        const inputs = this.panel.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.disabled = disabled;
            if (disabled) {
                input.style.opacity = '0.5';
                input.style.cursor = 'not-allowed';
            } else {
                input.style.opacity = '1';
                input.style.cursor = 'pointer';
            }
        });
    }
}
