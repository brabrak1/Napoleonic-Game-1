// Input Handler - Manages mouse and keyboard input

class InputHandler {
    constructor(canvas, game, renderer, sceneManager) {
        this.canvas = canvas;
        this.game = game;
        this.renderer = renderer;
        this.sceneManager = sceneManager;

        // Mouse state
        this.mouseDown = false;
        this.dragStart = null;
        this.currentMouse = null;

        // Player team (null = control all teams)
        this.playerTeam = null;

        // Bind event listeners
        this.bindEvents();
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Touch events for mobile/tablet support
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    /**
     * Get mouse position relative to canvas
     * @param {MouseEvent} e - Mouse event
     * @returns {Object} - {x, y} coordinates
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Get touch position relative to canvas
     * @param {TouchEvent} e - Touch event
     * @returns {Object} - {x, y} coordinates
     */
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    /**
     * Mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseDown(e) {
        // Only handle input in battle mode (if scene manager exists)
        if (this.sceneManager && !this.sceneManager.isBattleMode()) return;

        const pos = this.getMousePos(e);
        this.mouseDown = true;
        this.dragStart = pos;
        this.currentMouse = pos;

        // Try to select a unit at click position
        const selectedUnit = this.game.selectUnitAtPosition(pos.x, pos.y, this.playerTeam);

        if (!selectedUnit && this.game.selectedUnits.length === 0) {
            // No unit clicked and none selected: prepare for selection box drag
            this.game.clearSelection();
        }
        // If selectedUnit found, it's already selected by selectUnitAtPosition
        // If no unit clicked but units ARE selected, we'll handle movement on drag/mouseup
    }

    /**
     * Mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.currentMouse = pos;

        if (this.mouseDown) {
            if (this.game.selectedUnits.length > 0) {
                // Units selected: show movement preview arrow
                this.renderer.setMovementTarget(pos.x, pos.y);
            }
            // If no units selected, selection box is rendered by renderSelectionBox
        }
    }

    /**
     * Mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    onMouseUp(e) {
        const pos = this.getMousePos(e);

        if (this.dragStart) {
            const dx = Math.abs(pos.x - this.dragStart.x);
            const dy = Math.abs(pos.y - this.dragStart.y);

            if (this.game.selectedUnits.length > 0) {
                // Units were selected: move them to click/drag endpoint
                this.game.moveSelectedUnits(pos.x, pos.y);
                this.renderer.clearMovementTarget();
            } else if (dx > 5 || dy > 5) {
                // No units selected and dragged: complete selection box
                this.game.selectUnitsInBox(
                    this.dragStart.x,
                    this.dragStart.y,
                    pos.x,
                    pos.y,
                    this.playerTeam
                );
            }
        }

        this.mouseDown = false;
        this.dragStart = null;
    }

    /**
     * Touch start event
     * @param {TouchEvent} e - Touch event
     */
    onTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        const pos = this.getTouchPos(e);
        this.mouseDown = true;
        this.dragStart = pos;
        this.currentMouse = pos;

        // Same logic as mouse: select unit or prepare for selection box
        const selectedUnit = this.game.selectUnitAtPosition(pos.x, pos.y, this.playerTeam);

        if (!selectedUnit && this.game.selectedUnits.length === 0) {
            // No unit tapped and none selected: prepare for selection box drag
            this.game.clearSelection();
        }
    }

    /**
     * Touch move event
     * @param {TouchEvent} e - Touch event
     */
    onTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        if (!e.touches[0]) return;

        const pos = this.getTouchPos(e);
        this.currentMouse = pos;

        if (this.mouseDown && this.game.selectedUnits.length > 0) {
            // Units selected: show movement preview arrow
            this.renderer.setMovementTarget(pos.x, pos.y);
        }
    }

    /**
     * Touch end event
     * @param {TouchEvent} e - Touch event
     */
    onTouchEnd(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);

        // Same logic as mouseup
        if (this.dragStart) {
            const dx = Math.abs(pos.x - this.dragStart.x);
            const dy = Math.abs(pos.y - this.dragStart.y);

            if (this.game.selectedUnits.length > 0) {
                // Units were selected: move them to tap/drag endpoint
                this.game.moveSelectedUnits(pos.x, pos.y);
                this.renderer.clearMovementTarget();
            } else if (dx > 5 || dy > 5) {
                // No units selected and dragged: complete selection box
                this.game.selectUnitsInBox(
                    this.dragStart.x,
                    this.dragStart.y,
                    pos.x,
                    pos.y,
                    this.playerTeam
                );
            }
        }

        this.mouseDown = false;
        this.dragStart = null;
    }

    /**
     * Keyboard event
     * @param {KeyboardEvent} e - Keyboard event
     */
    onKeyDown(e) {
        // Ignore input if user is typing in a text field (e.g. settings)
        if (document.activeElement &&
            (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.tagName === 'SELECT')) {
            return;
        }
        // Only handle input in battle mode (if scene manager exists)
        // Fix: Prevent double-execution since we have two InputHandlers (one for each canvas)
        const isBattle = this.sceneManager && this.sceneManager.isBattleMode();

        // If this handler is for the Battle Canvas, it should ONLY run in Battle Mode
        if (this.canvas.id === 'battleCanvas' && !isBattle) return;

        // If this handler is for the Deployment Canvas, it should ONLY run in Deployment Mode
        // (i.e. stop it from running if we ARE in battle mode)
        if (this.canvas.id === 'gameCanvas' && isBattle) return;

        // Deselect units
        if (e.key === 'Escape') {
            this.game.clearSelection();
            this.renderer.clearMovementTarget();
        }
        // Formation hotkeys
        else if (e.key === 'l' || e.key === 'L' || e.code === 'KeyL') {
            // Line formation
            this.game.setFormationForSelected('LINE');
        } else if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
            // Column formation
            this.game.setFormationForSelected('COLUMN');
        } else if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
            // Square formation (Toggle)
            // Check if any selected unit is NOT in square
            const anyNotInSquare = this.game.selectedUnits.some(u => u.formation !== 'SQUARE');

            if (anyNotInSquare) {
                // Set all to Square
                this.game.setFormationForSelected('SQUARE');
            } else {
                // All are in Square, so Toggle OFF (None)
                this.game.setFormationForSelected(null);
            }
        } else if (e.key === 'n' || e.key === 'N' || e.code === 'KeyN') {
            // No formation
            this.game.setFormationForSelected(null);
        } else if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
            // Restart game
            if (this.game.gameOver) {
                try {
                    // Transition to deployment scene (which calls game.restart())
                    if (this.sceneManager) {
                        this.sceneManager.transitionTo('deployment');
                    } else {
                        // Fallback if no scene manager (shouldn't happen)
                        this.game.restart();
                    }
                } catch (err) {
                    console.error("Restart Error:", err);
                }
            }
        }
    }

    /**
     * Render selection box (called by main render loop)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderSelectionBox(ctx) {
        // Only show selection box if dragging WITHOUT selected units
        if (this.mouseDown && this.game.selectedUnits.length === 0 && this.dragStart && this.currentMouse) {
            this.renderer.renderSelectionBox(
                this.dragStart.x,
                this.dragStart.y,
                this.currentMouse.x,
                this.currentMouse.y
            );
        }
    }
}
