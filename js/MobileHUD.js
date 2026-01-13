/**
 * MobileHUD.js
 * Mobile/tablet touch controls for formations and game actions
 */
class MobileHUD {
    constructor(game, sceneManager) {
        this.game = game;
        this.sceneManager = sceneManager;
        this.formationMenuOpen = false;

        // Only initialize if mobile mode is active
        if (!window.isMobile) return;

        this.createHUDElements();
        this.attachEventListeners();
    }

    /**
     * Create HUD DOM elements
     */
    createHUDElements() {
        // Create main HUD container
        this.hudContainer = document.createElement('div');
        this.hudContainer.className = 'mobile-hud';
        document.body.appendChild(this.hudContainer);

        // Mobile version label
        this.versionLabel = document.createElement('div');
        this.versionLabel.className = 'mobile-version-label';
        // Explicitly check for iPad
        const isIPad = window.mobileDetection?.platform === 'iPad' ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        this.versionLabel.textContent = isIPad ? 'IPAD VERSION' : 'MOBILE VERSION';
        document.body.appendChild(this.versionLabel);

        // Formation button (bottom-right)
        // Formation button (bottom-right)
        this.formationBtn = document.createElement('button');
        this.formationBtn.className = 'mobile-formation-btn';
        this.formationBtn.innerHTML = '<span class="icon">⚔️</span><span class="label">Formations</span>';
        this.formationBtn.title = 'Formations';
        document.body.appendChild(this.formationBtn);

        // Restart button (top-right)
        this.restartBtn = document.createElement('button');
        this.restartBtn.className = 'mobile-restart-btn';
        this.restartBtn.innerHTML = '<span class="icon">🔄</span><span class="label">Restart</span>';
        this.restartBtn.title = 'Restart Battle';
        document.body.appendChild(this.restartBtn);

        // Formation popup menu
        this.formationMenu = document.createElement('div');
        this.formationMenu.className = 'formation-menu';
        this.formationMenu.innerHTML = `
            <div class="formation-option" data-formation="LINE">
                <span class="icon">━</span>
                <span class="label">Line Formation</span>
                <span class="key">(L)</span>
            </div>
            <div class="formation-option" data-formation="COLUMN">
                <span class="icon">▥</span>
                <span class="label">Column Formation</span>
                <span class="key">(C)</span>
            </div>
            <div class="formation-option" data-formation="SQUARE">
                <span class="icon">◻</span>
                <span class="label">Square Formation</span>
                <span class="key">(F)</span>
            </div>
            <div class="formation-option" data-formation="NONE">
                <span class="icon">✕</span>
                <span class="label">No Formation</span>
                <span class="key">(N)</span>
            </div>
        `;
        document.body.appendChild(this.formationMenu);
    }

    /**
     * Attach event listeners to HUD buttons
     */
    attachEventListeners() {
        // Formation button - toggle menu
        this.formationBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFormationMenu();
        });

        // Restart button
        this.restartBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRestart();
        });

        // Formation options
        const formationOptions = this.formationMenu.querySelectorAll('.formation-option');
        formationOptions.forEach(option => {
            option.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const formation = option.dataset.formation;
                this.applyFormation(formation);
                this.toggleFormationMenu(); // Close menu after selection
            });
        });

        // Close menu when tapping outside
        document.addEventListener('touchend', (e) => {
            if (this.formationMenuOpen &&
                !this.formationMenu.contains(e.target) &&
                !this.formationBtn.contains(e.target)) {
                this.toggleFormationMenu();
            }
        });
    }

    /**
     * Toggle formation menu visibility
     */
    toggleFormationMenu() {
        // Only allow in battle mode with selected units
        if (!this.sceneManager.isBattleMode()) return;
        if (this.game.selectedUnits.length === 0) {
            // No units selected - show brief feedback
            this.formationBtn.classList.add('disabled');
            setTimeout(() => this.formationBtn.classList.remove('disabled'), 300);
            return;
        }

        this.formationMenuOpen = !this.formationMenuOpen;
        this.formationMenu.classList.toggle('active', this.formationMenuOpen);

        // Update selected formation indicator
        if (this.formationMenuOpen) {
            this.updateFormationSelection();
        }
    }

    /**
     * Update which formation option appears selected
     */
    updateFormationSelection() {
        if (this.game.selectedUnits.length === 0) return;

        const currentFormation = this.game.selectedUnits[0].formation;
        const options = this.formationMenu.querySelectorAll('.formation-option');

        options.forEach(option => {
            option.classList.toggle('selected',
                option.dataset.formation === currentFormation);
        });
    }

    /**
     * Apply formation to selected units
     */
    applyFormation(formationType) {
        if (!this.sceneManager.isBattleMode()) return;
        if (this.game.selectedUnits.length === 0) return;

        // Call game engine's formation method
        this.game.setFormationForSelected(formationType);

        console.log(`[Mobile HUD] Applied formation: ${formationType}`);
    }

    /**
     * Handle restart button press
     */
    handleRestart() {
        // Confirm restart
        if (confirm('Restart the battle and return to deployment?')) {
            if (this.sceneManager) {
                this.sceneManager.transitionTo('deployment');
            } else {
                this.game.restart();
            }
            console.log('[Mobile HUD] Battle restarted');
        }
    }

    /**
     * Show/hide HUD based on scene
     */
    updateVisibility() {
        if (!window.isMobile) return;

        const isBattle = this.sceneManager.isBattleMode();

        // Only show formation button in battle mode
        this.formationBtn.style.display = isBattle ? 'flex' : 'none';

        // Restart button always visible in deployment and battle
        const isDeployment = this.sceneManager.isDeploymentMode();
        this.restartBtn.style.display = (isBattle || isDeployment) ? 'flex' : 'none';

        // Close menu when leaving battle
        if (!isBattle && this.formationMenuOpen) {
            this.toggleFormationMenu();
        }
    }

    /**
     * Cleanup HUD elements
     */
    destroy() {
        if (this.hudContainer) this.hudContainer.remove();
        if (this.versionLabel) this.versionLabel.remove();
        if (this.formationBtn) this.formationBtn.remove();
        if (this.restartBtn) this.restartBtn.remove();
        if (this.formationMenu) this.formationMenu.remove();
    }
}
