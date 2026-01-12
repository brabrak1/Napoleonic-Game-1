// Renderer - Handles all canvas drawing operations

class Renderer {
    constructor(canvas, game, visualEffects) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.visualEffects = visualEffects;

        // Movement arrow (shows where selected units will move)
        this.movementTarget = null;
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.fillStyle = '#2e7d32'; // Green battlefield
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render all game elements
     */
    render() {
        // Apply screen shake
        const shake = this.visualEffects.getShakeOffset();
        this.ctx.save();
        this.ctx.translate(shake.x, shake.y);

        // Clear
        this.clear();

        // Render units
        for (const unit of this.game.units) {
            this.renderUnit(unit);
        }

        // Render visual effects
        this.visualEffects.render(this.ctx);

        // Render Projectiles
        this.renderProjectiles();

        // Render movement arrow
        if (this.movementTarget && this.game.selectedUnits.length > 0) {
            this.renderMovementArrows();
        }

        // Render game over message
        if (this.game.gameOver) {
            this.renderGameOver();
        }

        this.ctx.restore();
    }

    /**
     * Render a single unit
     * @param {Unit} unit - The unit to render
     */
    renderUnit(unit) {
        this.ctx.save();
        this.ctx.translate(unit.x, unit.y);
        this.ctx.rotate(unit.angle);

        // Unit color
        const color = unit.team === 'RED' ? CONFIG.COLORS.RED_TEAM : CONFIG.COLORS.BLUE_TEAM;

        if (unit.type === 'INFANTRY') {
            // Solid rectangle for infantry
            this.ctx.fillStyle = color;
            this.ctx.fillRect(-unit.size / 2, -unit.size / 2, unit.size, unit.size);

            // Draw Rifle
            this.ctx.strokeStyle = '#5D4037'; // Wood color
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(unit.size, 0); // Extend out
            this.ctx.stroke();

            // Draw Bayonet
            this.ctx.strokeStyle = '#B0BEC5'; // Silver
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(unit.size, 0);
            this.ctx.lineTo(unit.size + 6, 0);
            this.ctx.stroke();

            // Formation indicator
            this.renderFormationIndicator(unit);

            // Reload progress (small arc around unit)
            if (unit.isReloading) {
                this.ctx.strokeStyle = CONFIG.COLORS.RELOAD_ACTIVE;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, unit.size / 2 + 3, 0, Math.PI * 2 * unit.reloadProgress);
                this.ctx.stroke();
            }

        } else if (unit.type === 'CAVALRY') {
            // Rectangle with inscribed X for cavalry
            this.ctx.fillStyle = color;
            this.ctx.fillRect(-unit.size / 2, -unit.size / 2, unit.size, unit.size);

            // Draw X
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(-unit.size / 2 + 2, -unit.size / 2 + 2);
            this.ctx.lineTo(unit.size / 2 - 2, unit.size / 2 - 2);
            this.ctx.moveTo(unit.size / 2 - 2, -unit.size / 2 + 2);
            this.ctx.lineTo(-unit.size / 2 + 2, unit.size / 2 - 2);
            this.ctx.stroke();
        } else if (unit.type === 'CANNON') {
            // Cannon: Black barrel with brown wheels
            const barrelLength = unit.size * 1.2;
            const barrelWidth = unit.size * 0.4;
            const wheelRadius = unit.size * 0.3;

            // Draw barrel (black)
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

            // Draw base (team color)
            this.ctx.fillStyle = color;
            this.ctx.fillRect(-unit.size / 3, -unit.size / 2, unit.size / 1.5, unit.size);

            // Draw wheels (brown circles)
            this.ctx.fillStyle = '#5D4037';
            this.ctx.beginPath();
            this.ctx.arc(-unit.size / 4, -unit.size / 2 - 2, wheelRadius, 0, Math.PI * 2);
            this.ctx.arc(-unit.size / 4, unit.size / 2 + 2, wheelRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw wheel spokes
            this.ctx.strokeStyle = '#3E2723';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i;
                // Top wheel
                this.ctx.beginPath();
                this.ctx.moveTo(-unit.size / 4, -unit.size / 2 - 2);
                this.ctx.lineTo(
                    -unit.size / 4 + Math.cos(angle) * wheelRadius,
                    -unit.size / 2 - 2 + Math.sin(angle) * wheelRadius
                );
                this.ctx.stroke();
                // Bottom wheel
                this.ctx.beginPath();
                this.ctx.moveTo(-unit.size / 4, unit.size / 2 + 2);
                this.ctx.lineTo(
                    -unit.size / 4 + Math.cos(angle) * wheelRadius,
                    unit.size / 2 + 2 + Math.sin(angle) * wheelRadius
                );
                this.ctx.stroke();
            }

            // Reload progress arc
            if (unit.isReloading) {
                this.ctx.strokeStyle = CONFIG.COLORS.RELOAD_ACTIVE;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, unit.size / 2 + 3, 0, Math.PI * 2 * unit.reloadProgress);
                this.ctx.stroke();
            }
        }

        // Selection highlight
        if (unit.isSelected) {
            this.ctx.strokeStyle = CONFIG.COLORS.SELECTION_BORDER;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-unit.size / 2 - 2, -unit.size / 2 - 2, unit.size + 4, unit.size + 4);
        }

        // Health bar above unit
        this.renderHealthBar(unit);

        // Debug: Fire arc
        if (CONFIG.DEBUG.SHOW_FIRE_ARCS && unit.type === 'INFANTRY' && unit.isSelected) {
            this.renderFireArc(unit);
        }

        this.ctx.restore();

        // Debug: Collision circle
        if (CONFIG.DEBUG.SHOW_COLLISION_CIRCLES) {
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(unit.x, unit.y, unit.collisionRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Debug: LOS ray to target
        if (CONFIG.DEBUG.SHOW_LOS_RAYS && unit.currentTarget) {
            const losResult = LOSSystem.checkLOS(unit, unit.currentTarget, this.game.units);
            this.ctx.strokeStyle = losResult.hasLOS ? CONFIG.COLORS.LOS_CLEAR : CONFIG.COLORS.LOS_BLOCKED;
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(unit.x, unit.y);
            this.ctx.lineTo(unit.currentTarget.x, unit.currentTarget.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    /**
     * Render formation indicator on unit
     * @param {Unit} unit - The unit
     */
    renderFormationIndicator(unit) {
        if (!unit.formation) return;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        if (unit.formation === 'LINE') {
            // Horizontal line through center - REMOVED for cleaner look
            // this.ctx.beginPath();
            // this.ctx.moveTo(-unit.size / 2 + 4, 0);
            // this.ctx.lineTo(unit.size / 2 - 4, 0);
            // this.ctx.stroke();
        } else if (unit.formation === 'COLUMN') {
            // Vertical line through center
            this.ctx.beginPath();
            this.ctx.moveTo(0, -unit.size / 2 + 4);
            this.ctx.lineTo(0, unit.size / 2 - 4);
            this.ctx.stroke();
        } else if (unit.formation === 'SQUARE') {
            // Double border
            this.ctx.strokeRect(-unit.size / 2 - 4, -unit.size / 2 - 4, unit.size + 8, unit.size + 8);
        }
    }

    /**
     * Render health bar above unit
     * @param {Unit} unit - The unit
     */
    renderHealthBar(unit) {
        const barWidth = unit.size;
        const barHeight = 3;
        const barY = -unit.size / 2 - 8;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        // Health fill
        const healthPercent = unit.getHealthPercentage();
        let healthColor = CONFIG.COLORS.HEALTH_HIGH;
        if (healthPercent < 0.3) healthColor = CONFIG.COLORS.HEALTH_LOW;
        else if (healthPercent < 0.6) healthColor = CONFIG.COLORS.HEALTH_MEDIUM;

        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }

    /**
     * Render fire arc for infantry units
     * @param {Unit} unit - The infantry unit
     */
    renderFireArc(unit) {
        const fireArc = unit.getFireArc();
        const arcRadius = unit.fireRange;

        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.arc(0, 0, arcRadius, -fireArc / 2, fireArc / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    /**
     * Render movement arrows from selected units to target
     */
    renderMovementArrows() {
        if (!this.movementTarget) return;

        for (const unit of this.game.selectedUnits) {
            // Only draw if unit has a target
            if (unit.targetX === null || unit.targetY === null) continue;

            // Draw arrow from unit to target
            this.ctx.strokeStyle = CONFIG.COLORS.MOVEMENT_ARROW;
            this.ctx.lineWidth = 1; // Thinner lines for individual paths
            this.ctx.setLineDash([5, 5]);

            this.ctx.beginPath();
            this.ctx.moveTo(unit.x, unit.y);
            this.ctx.lineTo(unit.targetX, unit.targetY);
            this.ctx.stroke();

            // Draw arrowhead at target
            const angle = Math.atan2(
                unit.targetY - unit.y,
                unit.targetX - unit.x
            );

            this.ctx.setLineDash([]);
            this.ctx.fillStyle = CONFIG.COLORS.MOVEMENT_ARROW;
            this.ctx.save();
            this.ctx.translate(unit.targetX, unit.targetY);
            this.ctx.rotate(angle);

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-8, -4);
            this.ctx.lineTo(-8, 4);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();
        }

        this.ctx.setLineDash([]);
    }

    /**
     * Render selection box
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     */
    renderSelectionBox(x1, y1, x2, y2) {
        this.ctx.strokeStyle = CONFIG.COLORS.SELECTION_BORDER;
        this.ctx.fillStyle = CONFIG.COLORS.SELECTION_BOX;
        this.ctx.lineWidth = 2;

        const width = x2 - x1;
        const height = y2 - y1;

        this.ctx.fillRect(x1, y1, width, height);
        this.ctx.strokeRect(x1, y1, width, height);
    }

    /**
     * Render game over screen
     */
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const message = `${this.game.winner} TEAM WINS!`;
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);

        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    /**
     * Set movement target for arrow visualization
     * @param {number} x - Target X
     * @param {number} y - Target Y
     */
    setMovementTarget(x, y) {
        this.movementTarget = { x, y };
    }

    /**
     * Clear movement target
     */
    clearMovementTarget() {
        this.movementTarget = null;
    }

    /**
     * Render active projectiles
     */
    renderProjectiles() {
        if (!this.game.projectiles) return;

        this.ctx.fillStyle = '#000000'; // Black cannonballs

        for (const p of this.game.projectiles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight for visibility
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(p.x - 1, p.y - 1, p.radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#000000'; // Reset
        }
    }
}
