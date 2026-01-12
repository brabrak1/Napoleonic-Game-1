// UI Manager - Manages the bottom unit status panel

class UIManager {
    constructor(game) {
        this.game = game;

        // Get panel elements
        this.redPanel = document.getElementById('redUnitBars');
        this.bluePanel = document.getElementById('blueUnitBars');

        // Unit bar elements (cached for performance)
        this.unitBars = new Map(); // unitId -> DOM element

        // Controls toggle logic
        this.controlsInfo = document.getElementById('controlsInfo');
        this.minimizeButton = document.getElementById('minimizeControls');

        if (this.minimizeButton && this.controlsInfo) {
            this.minimizeButton.addEventListener('click', () => {
                this.controlsInfo.classList.toggle('minimized');
                const isMinimized = this.controlsInfo.classList.contains('minimized');
                this.minimizeButton.textContent = isMinimized ? '+' : '−';
            });
        }
    }

    /**
     * Update all unit bars
     */
    update() {
        this.updateTeamPanel('RED', this.redPanel);
        this.updateTeamPanel('BLUE', this.bluePanel);
    }

    /**
     * Update unit bars for a specific team
     * @param {string} team - 'RED' or 'BLUE'
     * @param {HTMLElement} panel - Panel element
     */
    updateTeamPanel(team, panel) {
        const units = this.game.getUnitsByTeam(team);

        // Remove bars for dead units FROM THIS TEAM ONLY
        const currentIds = new Set(units.map(u => u.id));
        for (const [id, bar] of this.unitBars) {
            // Only check bars that belong to this team
            if (bar.dataset.team === team && !currentIds.has(id)) {
                bar.remove();
                this.unitBars.delete(id);
            }
        }

        // Update or create bars for each unit
        for (const unit of units) {
            let bar = this.unitBars.get(unit.id);

            if (!bar) {
                // Create new bar
                bar = this.createUnitBar(unit);
                panel.appendChild(bar);
                this.unitBars.set(unit.id, bar);
            }

            // Update bar
            this.updateUnitBar(unit, bar);
        }
    }

    /**
     * Create a unit bar element
     * @param {Unit} unit - The unit
     * @returns {HTMLElement} - The bar element
     */
    createUnitBar(unit) {
        const container = document.createElement('div');
        container.className = 'unit-bar';
        container.dataset.unitId = unit.id;
        container.dataset.team = unit.team;

        // Unit icon
        const icon = document.createElement('span');
        icon.className = 'unit-icon';
        icon.textContent = unit.type === 'INFANTRY' ? '⬛' : '⚔';
        container.appendChild(icon);

        // Health bar
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        const healthFill = document.createElement('div');
        healthFill.className = 'health-fill';
        healthBar.appendChild(healthFill);
        container.appendChild(healthBar);

        // Reload bar (infantry only)
        if (unit.type === 'INFANTRY') {
            const reloadBar = document.createElement('div');
            reloadBar.className = 'reload-bar';
            const reloadFill = document.createElement('div');
            reloadFill.className = 'reload-fill';
            reloadBar.appendChild(reloadFill);
            container.appendChild(reloadBar);
        }

        // Entity count label
        const countLabel = document.createElement('span');
        countLabel.className = 'entity-count';
        container.appendChild(countLabel);

        // Formation label
        const formationLabel = document.createElement('span');
        formationLabel.className = 'formation-label';
        container.appendChild(formationLabel);

        return container;
    }

    /**
     * Update a unit bar
     * @param {Unit} unit - The unit
     * @param {HTMLElement} bar - The bar element
     */
    updateUnitBar(unit, bar) {
        // Update health
        const healthFill = bar.querySelector('.health-fill');
        const healthPercent = unit.getHealthPercentage();
        healthFill.style.width = (healthPercent * 100) + '%';

        // Color based on health
        if (healthPercent > 0.6) {
            healthFill.style.background = CONFIG.COLORS.HEALTH_HIGH;
        } else if (healthPercent > 0.3) {
            healthFill.style.background = CONFIG.COLORS.HEALTH_MEDIUM;
        } else {
            healthFill.style.background = CONFIG.COLORS.HEALTH_LOW;
        }

        // Update reload (infantry only)
        if (unit.type === 'INFANTRY') {
            const reloadFill = bar.querySelector('.reload-fill');
            if (unit.isReloading) {
                reloadFill.style.width = (unit.reloadProgress * 100) + '%';
                reloadFill.style.background = CONFIG.COLORS.RELOAD_ACTIVE;
            } else {
                reloadFill.style.width = '100%';
                reloadFill.style.background = CONFIG.COLORS.RELOAD_READY;
            }
        }

        // Update entity count
        const countLabel = bar.querySelector('.entity-count');
        countLabel.textContent = `${Math.floor(unit.entityCount)}/${unit.maxEntityCount}`;

        // Update formation
        const formationLabel = bar.querySelector('.formation-label');
        if (unit.formation) {
            formationLabel.textContent = unit.formation;
            formationLabel.style.display = 'inline';
        } else {
            formationLabel.style.display = 'none';
        }

        // Highlight if selected
        if (unit.isSelected) {
            bar.classList.add('selected');
        } else {
            bar.classList.remove('selected');
        }

        // Highlight if exhausted
        if (ExhaustionSystem.isExhausted(unit)) {
            bar.classList.add('exhausted');
        } else {
            bar.classList.remove('exhausted');
        }
    }

    /**
     * Clear all unit bars
     */
    clear() {
        this.redPanel.innerHTML = '';
        this.bluePanel.innerHTML = '';
        this.unitBars.clear();
    }
}
