// Deployment Manager - Handles unit placement during deployment phase

class DeploymentManager {
    constructor(canvas, game, renderer) {
        this.canvas = canvas;
        this.game = game;
        this.renderer = renderer;

        // Deployment state - Only store type, not team (auto-assigned based on position)
        this.selectedUnitType = null;
        this.deployedUnits = {
            RED: { INFANTRY: 0, CAVALRY: 0, CANNON: 0 },
            BLUE: { INFANTRY: 0, CAVALRY: 0, CANNON: 0 }
        };

        // Canvas handlers
        this.canvasClickHandler = (e) => this.handleCanvasClick(e);
        this.canvasMouseMoveHandler = (e) => this.handleCanvasMouseMove(e);

        // Preview state
        this.previewX = null;
        this.previewY = null;
        this.previewTeam = null;

        // UI elements
        this.unitButtons = document.querySelectorAll('.unit-spawn-btn');
        this.countElements = {
            RED: {
                INFANTRY: document.getElementById('redInfantryCount'),
                CAVALRY: document.getElementById('redCavalryCount'),
                CANNON: document.getElementById('redCannonCount')
            },
            BLUE: {
                INFANTRY: document.getElementById('blueInfantryCount'),
                CAVALRY: document.getElementById('blueCavalryCount'),
                CANNON: document.getElementById('blueCannonCount')
            }
        };

        this.initializeButtons();
    }

    /**
     * Initialize unit spawn buttons
     */
    initializeButtons() {
        this.unitButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.selectUnitType(type);
            });
        });
    }

    /**
     * Select a unit type for placement
     */
    selectUnitType(type) {
        this.selectedUnitType = type;

        // Update button states
        this.unitButtons.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    /**
     * Determine team from X position on map
     */
    determineTeamFromPosition(x) {
        const deploymentWidth = CONFIG.CANVAS_WIDTH * 0.25; // 300px

        if (x >= 0 && x <= deploymentWidth) {
            return 'RED';
        } else if (x >= (CONFIG.CANVAS_WIDTH - deploymentWidth) && x <= CONFIG.CANVAS_WIDTH) {
            return 'BLUE';
        }
        return null; // Outside deployment zones
    }

    /**
     * Handle canvas click to place unit
     */
    handleCanvasClick(e) {
        if (!this.selectedUnitType) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Auto-determine team from position
        const team = this.determineTeamFromPosition(x);
        if (!team) return; // Outside deployment zones

        // Create unit at clicked position
        const unit = this.game.createUnit(this.selectedUnitType, team, x, y);

        // Set initial facing direction
        unit.angle = team === 'RED' ? 0 : Math.PI;

        // Update deployed count
        this.deployedUnits[team][this.selectedUnitType]++;
        this.updateUnitCount(team, this.selectedUnitType);
    }

    /**
     * Check if position is in valid deployment zone
     */
    isInDeploymentZone(x) {
        const deploymentWidth = CONFIG.CANVAS_WIDTH * 0.25;
        return (x >= 0 && x <= deploymentWidth) ||
               (x >= (CONFIG.CANVAS_WIDTH - deploymentWidth) && x <= CONFIG.CANVAS_WIDTH);
    }

    /**
     * Update unit count display
     */
    updateUnitCount(team, type) {
        const current = this.deployedUnits[team][type];
        const element = this.countElements[team][type];

        if (element) {
            element.textContent = `${type}: ${current}`;
        }
    }

    /**
     * Update all unit counts
     */
    updateAllCounts() {
        this.updateUnitCount('RED', 'INFANTRY');
        this.updateUnitCount('RED', 'CAVALRY');
        this.updateUnitCount('RED', 'CANNON');
        this.updateUnitCount('BLUE', 'INFANTRY');
        this.updateUnitCount('BLUE', 'CAVALRY');
        this.updateUnitCount('BLUE', 'CANNON');
    }

    /**
     * Deselect current unit type
     */
    deselectUnitType() {
        this.selectedUnitType = null;

        this.unitButtons.forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    /**
     * Handle canvas mouse move for preview
     */
    handleCanvasMouseMove(e) {
        if (!this.selectedUnitType) {
            this.previewX = null;
            this.previewY = null;
            this.previewTeam = null;
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const team = this.determineTeamFromPosition(x);

        if (team) {
            this.previewX = x;
            this.previewY = y;
            this.previewTeam = team;
        } else {
            this.previewX = null;
            this.previewY = null;
            this.previewTeam = null;
        }
    }

    /**
     * Render unit placement preview
     */
    renderPreview(ctx) {
        if (!this.previewX || !this.previewY || !this.previewTeam || !this.selectedUnitType) {
            return;
        }

        const size = CONFIG[this.selectedUnitType].SIZE;
        const angle = this.previewTeam === 'RED' ? 0 : Math.PI;
        const color = this.previewTeam === 'RED' ? CONFIG.COLORS.RED_TEAM : CONFIG.COLORS.BLUE_TEAM;

        ctx.save();
        ctx.globalAlpha = 0.5; // Semi-transparent
        ctx.translate(this.previewX, this.previewY);
        ctx.rotate(angle);

        // Render based on type
        if (this.selectedUnitType === 'INFANTRY') {
            // Rectangle + rifle
            ctx.fillStyle = color;
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            ctx.stroke();
        } else if (this.selectedUnitType === 'CAVALRY') {
            // Rectangle + X
            ctx.fillStyle = color;
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-size/2+2, -size/2+2);
            ctx.lineTo(size/2-2, size/2-2);
            ctx.moveTo(size/2-2, -size/2+2);
            ctx.lineTo(-size/2+2, size/2-2);
            ctx.stroke();
        } else if (this.selectedUnitType === 'CANNON') {
            // Barrel + wheels
            const barrelLength = size * 1.2;
            const barrelWidth = size * 0.4;
            const wheelRadius = size * 0.3;

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, -barrelWidth/2, barrelLength, barrelWidth);
            ctx.fillStyle = color;
            ctx.fillRect(-size/3, -size/2, size/1.5, size);
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.arc(-size/4, -size/2-2, wheelRadius, 0, Math.PI*2);
            ctx.arc(-size/4, size/2+2, wheelRadius, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Enable deployment mode
     */
    enable() {
        this.canvas.addEventListener('click', this.canvasClickHandler);
        this.canvas.addEventListener('mousemove', this.canvasMouseMoveHandler);
        this.canvas.style.cursor = 'pointer';
    }

    /**
     * Disable deployment mode
     */
    disable() {
        this.canvas.removeEventListener('click', this.canvasClickHandler);
        this.canvas.removeEventListener('mousemove', this.canvasMouseMoveHandler);
        this.canvas.style.cursor = 'crosshair';
    }

    /**
     * Render deployment zones
     */
    renderDeploymentZones(ctx) {
        const deploymentWidth = CONFIG.CANVAS_WIDTH * 0.25;

        // Red deployment zone (left)
        ctx.fillStyle = 'rgba(211, 47, 47, 0.15)';
        ctx.fillRect(0, 0, deploymentWidth, CONFIG.CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(211, 47, 47, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(0, 0, deploymentWidth, CONFIG.CANVAS_HEIGHT);

        // Blue deployment zone (right)
        ctx.fillStyle = 'rgba(25, 118, 210, 0.15)';
        ctx.fillRect(CONFIG.CANVAS_WIDTH - deploymentWidth, 0, deploymentWidth, CONFIG.CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(25, 118, 210, 0.5)';
        ctx.strokeRect(CONFIG.CANVAS_WIDTH - deploymentWidth, 0, deploymentWidth, CONFIG.CANVAS_HEIGHT);

        ctx.setLineDash([]);
    }
}
