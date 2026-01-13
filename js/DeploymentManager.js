// Deployment Manager - Handles unit placement during deployment phase

class DeploymentManager {
    constructor(canvas, game, renderer) {
        this.canvas = canvas;
        this.game = game;
        this.renderer = renderer;

        // Player team restriction for multiplayer
        this.playerTeam = null; // null = allow both sides, 'RED'/'BLUE' = restrict

        // Deployment state - Only store type, not team (auto-assigned based on position)
        this.selectedUnitType = null;
        this.deployedUnits = {
            RED: { INFANTRY: 0, CAVALRY: 0, CANNON: 0 },
            BLUE: { INFANTRY: 0, CAVALRY: 0, CANNON: 0 }
        };

        // Canvas handlers
        this.canvasClickHandler = (e) => this.handleCanvasClick(e);
        this.canvasMouseMoveHandler = (e) => this.handleCanvasMouseMove(e);
        this.canvasMouseDownHandler = (e) => this.handleCanvasMouseDown(e);
        this.canvasMouseUpHandler = (e) => this.handleCanvasMouseUp(e);

        // Preview state
        this.previewX = null;
        this.previewY = null;
        this.previewTeam = null;

        // Drag-to-deploy state (desktop only)
        this.isDragging = false;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragCurrentX = null;
        this.dragCurrentY = null;
        this.suppressNextClick = false;
        this.UNIT_SPACING = 40; // pixels between units
        this.MIN_DRAG_DISTANCE = 50; // minimum drag to trigger multi-unit

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
        // Suppress click if it's part of a drag operation
        if (this.suppressNextClick) {
            this.suppressNextClick = false;
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.placeUnitAt(x, y);
    }

    /**
     * Place a single unit at the given position
     * @param {number} x - Canvas x coordinate
     * @param {number} y - Canvas y coordinate
     * @returns {boolean} - True if unit was placed successfully
     */
    placeUnitAt(x, y) {
        if (!this.selectedUnitType) return false;

        // Auto-determine team from position
        const team = this.determineTeamFromPosition(x);
        if (!team) return false; // Outside deployment zones

        // Validate player team restriction (multiplayer)
        if (this.playerTeam && team !== this.playerTeam) {
            console.warn(`[Deployment] Cannot place units on ${team} side. You are ${this.playerTeam}.`);
            return false;
        }

        // Create unit at position
        const unit = this.game.createUnit(this.selectedUnitType, team, x, y);

        // Set initial facing direction
        unit.angle = team === 'RED' ? 0 : Math.PI;

        // Update deployed count
        this.deployedUnits[team][this.selectedUnitType]++;
        this.updateUnitCount(team, this.selectedUnitType);

        return true;
    }

    /**
     * Handle mouse down for drag-to-deploy (desktop only)
     * @param {MouseEvent} e - Mouse event
     */
    handleCanvasMouseDown(e) {
        console.log('[Deployment] Mouse down event fired');

        if (!this.selectedUnitType) {
            console.log('[Deployment] No unit type selected, ignoring mousedown');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        console.log('[Deployment] Mouse down at canvas position:', x, y);

        // Check if in valid deployment zone
        if (!this.isInDeploymentZone(x)) {
            console.log('[Deployment] Position outside deployment zone, ignoring');
            return;
        }

        // Start drag
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.dragCurrentX = x;
        this.dragCurrentY = y;

        console.log('[Deployment] Drag started at', x, y);
    }

    /**
     * Handle mouse up for drag-to-deploy (desktop only)
     * @param {MouseEvent} e - Mouse event
     */
    handleCanvasMouseUp(e) {
        console.log('[Deployment] Mouse up event fired, isDragging:', this.isDragging);

        if (!this.isDragging) return;

        // Get canvas position (works even if event fired on document)
        const rect = this.canvas.getBoundingClientRect();
        const endX = (e.clientX || 0) - rect.left;
        const endY = (e.clientY || 0) - rect.top;

        // Calculate drag distance
        const dx = endX - this.dragStartX;
        const dy = endY - this.dragStartY;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);

        console.log('[Deployment] Drag ended at', endX, endY, 'distance:', dragDistance, 'threshold:', this.MIN_DRAG_DISTANCE);

        if (dragDistance < this.MIN_DRAG_DISTANCE) {
            // SHORT DRAG: Place single unit (like a click)
            console.log('[Deployment] Short drag, placing single unit');
            this.placeUnitAt(this.dragStartX, this.dragStartY);
        } else {
            // LONG DRAG: Place multiple units along line
            const numUnits = Math.max(2, Math.floor(dragDistance / this.UNIT_SPACING));
            console.log('[Deployment] Long drag, placing', numUnits, 'units');
            this.placeUnitsAlongLine(this.dragStartX, this.dragStartY, endX, endY, numUnits);

            // Suppress the click event that will follow
            this.suppressNextClick = true;
        }

        // Reset drag state
        this.isDragging = false;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragCurrentX = null;
        this.dragCurrentY = null;
    }

    /**
     * Place multiple units evenly spaced along a line
     * @param {number} startX - Start x coordinate
     * @param {number} startY - Start y coordinate
     * @param {number} endX - End x coordinate
     * @param {number} endY - End y coordinate
     * @param {number} numUnits - Number of units to place
     */
    placeUnitsAlongLine(startX, startY, endX, endY, numUnits) {
        console.log(`[Deployment] Placing ${numUnits} units in a line`);

        let placedCount = 0;

        for (let i = 0; i < numUnits; i++) {
            // Interpolate position along line
            const t = numUnits === 1 ? 0 : i / (numUnits - 1); // Handle single unit edge case
            const x = startX + t * (endX - startX);
            const y = startY + t * (endY - startY);

            // Place unit (validates team, zone, multiplayer restrictions)
            const placed = this.placeUnitAt(x, y);
            if (placed) placedCount++;
        }

        console.log(`[Deployment] Successfully placed ${placedCount}/${numUnits} units`);
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

        // Update button badge (Unified UI)
        // Note: This updates the shared buttons at the bottom.
        // In a hotseat game, we might want to visualize whose turn it is,
        // but currently buttons are shared. We show total or relevant?
        // Let's show the count for the CURRENTLY deploying team if we can,
        // or just the generic count.
        // Actually, best to just show the count for the team that owns the button context.
        // But since buttons are unified, we should probably update them based on the LAST interaction
        // or just update them to match the team we just added to?
        // Let's just update the badge on the button matching the type.
        const btn = document.querySelector(`.unit-spawn-btn[data-type="${type}"] .unit-count-badge`);
        if (btn) {
            // We might want to show "Red: X | Blue: Y" or just the current count.
            // For simplicity on mobile, let's just show the Total or the count of the last modified team?
            // The user experience requested is simple. Let's show "R:X B:Y"
            const redCount = this.deployedUnits['RED'][type];
            const blueCount = this.deployedUnits['BLUE'][type];
            btn.textContent = `R:${redCount} B:${blueCount}`;
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
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // DRAG-TO-DEPLOY: Update drag end position if dragging
        if (this.isDragging) {
            this.dragCurrentX = x;
            this.dragCurrentY = y;
            // Preview will be rendered in renderPreview()
            return; // Skip normal preview when dragging
        }

        if (!this.selectedUnitType) {
            this.previewX = null;
            this.previewY = null;
            this.previewTeam = null;
            return;
        }

        const team = this.determineTeamFromPosition(x);

        // Only show preview if in valid zone for player's team
        if (team && (!this.playerTeam || team === this.playerTeam)) {
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
        // DRAG PREVIEW: Show line and unit positions during drag
        if (this.isDragging && this.dragStartX !== null && this.dragCurrentX !== null) {
            const dx = this.dragCurrentX - this.dragStartX;
            const dy = this.dragCurrentY - this.dragStartY;
            const dragDistance = Math.sqrt(dx * dx + dy * dy);

            if (dragDistance >= this.MIN_DRAG_DISTANCE) {
                // Calculate how many units will be placed
                const numUnits = Math.max(2, Math.floor(dragDistance / this.UNIT_SPACING));

                ctx.save();

                // Draw line from start to current
                ctx.strokeStyle = '#FFD700'; // Gold color
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(this.dragStartX, this.dragStartY);
                ctx.lineTo(this.dragCurrentX, this.dragCurrentY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw circles at unit placement positions
                const team = this.determineTeamFromPosition(this.dragStartX);
                const color = team === 'RED' ? CONFIG.COLORS.RED_TEAM : CONFIG.COLORS.BLUE_TEAM;

                ctx.fillStyle = color;
                ctx.globalAlpha = 0.5;

                for (let i = 0; i < numUnits; i++) {
                    const t = numUnits === 1 ? 0 : i / (numUnits - 1);
                    const x = this.dragStartX + t * (this.dragCurrentX - this.dragStartX);
                    const y = this.dragStartY + t * (this.dragCurrentY - this.dragStartY);

                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw unit count text
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 16px Arial';
                ctx.fillText(`${numUnits} units`, this.dragCurrentX + 15, this.dragCurrentY - 15);

                ctx.restore();
                return; // Skip normal preview when dragging
            }
        }

        // EXISTING HOVER PREVIEW
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
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            ctx.stroke();
        } else if (this.selectedUnitType === 'CAVALRY') {
            // Rectangle + X
            ctx.fillStyle = color;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-size / 2 + 2, -size / 2 + 2);
            ctx.lineTo(size / 2 - 2, size / 2 - 2);
            ctx.moveTo(size / 2 - 2, -size / 2 + 2);
            ctx.lineTo(-size / 2 + 2, size / 2 - 2);
            ctx.stroke();
        } else if (this.selectedUnitType === 'CANNON') {
            // Barrel + wheels
            const barrelLength = size * 1.2;
            const barrelWidth = size * 0.4;
            const wheelRadius = size * 0.3;

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
            ctx.fillStyle = color;
            ctx.fillRect(-size / 3, -size / 2, size / 1.5, size);
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.arc(-size / 4, -size / 2 - 2, wheelRadius, 0, Math.PI * 2);
            ctx.arc(-size / 4, size / 2 + 2, wheelRadius, 0, Math.PI * 2);
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

        // DESKTOP ONLY: Drag-to-deploy
        console.log('[Deployment] window.isMobile =', window.isMobile);
        if (!window.isMobile) {
            console.log('[Deployment] Registering drag-to-deploy handlers (desktop mode)');
            this.canvas.addEventListener('mousedown', this.canvasMouseDownHandler);
            this.canvas.addEventListener('mouseup', this.canvasMouseUpHandler);
            document.addEventListener('mouseup', this.canvasMouseUpHandler); // Global fallback
        } else {
            console.log('[Deployment] Skipping drag handlers (mobile mode)');
        }

        // Added Touch Support (mobile only)
        this.canvasTouchHandler = (e) => this.handleCanvasTouch(e);
        this.canvas.addEventListener('touchstart', this.canvasTouchHandler, { passive: false });

        this.canvas.style.cursor = 'pointer';
        console.log('[Deployment] Deployment mode enabled');
    }

    /**
     * Disable deployment mode
     */
    disable() {
        this.canvas.removeEventListener('click', this.canvasClickHandler);
        this.canvas.removeEventListener('mousemove', this.canvasMouseMoveHandler);

        // Remove drag handlers
        if (!window.isMobile) {
            this.canvas.removeEventListener('mousedown', this.canvasMouseDownHandler);
            this.canvas.removeEventListener('mouseup', this.canvasMouseUpHandler);
            document.removeEventListener('mouseup', this.canvasMouseUpHandler); // Remove global fallback
        }

        // Remove Touch Support
        if (this.canvasTouchHandler) {
            this.canvas.removeEventListener('touchstart', this.canvasTouchHandler);
            this.canvasTouchHandler = null;
        }

        // Reset drag state
        this.isDragging = false;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragCurrentX = null;
        this.dragCurrentY = null;

        this.canvas.style.cursor = 'crosshair';
        console.log('[Deployment] Deployment mode disabled');
    }

    /**
     * Handle touch event (adapter for click handler)
     */
    handleCanvasTouch(e) {
        if (e.cancelable) e.preventDefault();

        // Convert touch to click-like object
        const touch = e.changedTouches[0];
        const mockClickEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY
        };

        this.handleCanvasClick(mockClickEvent);
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
