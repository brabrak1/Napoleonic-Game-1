// Main Application Entry Point

class NapoleonicWargame {
    constructor() {
        // Get canvases
        this.canvas = document.getElementById('gameCanvas');
        this.battleCanvas = document.getElementById('battleCanvas');

        if (!this.canvas || !this.battleCanvas) {
            console.error('Canvas elements not found!');
            return;
        }

        // Initialize scene manager first
        this.sceneManager = new SceneManager();

        // Initialize systems
        this.visualEffects = new VisualEffects();
        this.audioManager = new AudioManager();
        this.game = new GameEngine(this.visualEffects, this.audioManager);

        // Don't auto-initialize armies in deployment mode
        this.game.units = [];

        // Create renderers for both canvases
        this.renderer = new Renderer(this.canvas, this.game, this.visualEffects);
        this.battleRenderer = new Renderer(this.battleCanvas, this.game, this.visualEffects);

        this.deploymentManager = new DeploymentManager(this.canvas, this.game, this.renderer);
        this.inputHandler = new InputHandler(this.canvas, this.game, this.renderer, this.sceneManager);
        this.battleInputHandler = new InputHandler(this.battleCanvas, this.game, this.battleRenderer, this.sceneManager);
        this.uiManager = new UIManager(this.game);
        this.settingsPanel = new SettingsPanel(this.game, this.sceneManager);

        // Initialize Multiplayer Manager
        this.multiplayerManager = new MultiplayerManager(
            this.game,
            this.sceneManager,
            this.battleInputHandler, // Use battle input handler for multiplayer
            this.deploymentManager
        );

        // Expose globally for quick access
        window.multiplayerManager = this.multiplayerManager;

        // Set game references in scene manager
        this.sceneManager.setGameReferences(this.game, this.deploymentManager, this.renderer, this.battleRenderer);

        // Game loop variables
        this.lastTime = performance.now();
        this.running = false;

        // Start the game
        this.start();
    }

    /**
     * Start the game loop
     */
    start() {
        this.running = true;
        this.gameLoop(performance.now());
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime) {
        if (!this.running) return;

        try {
            // Calculate delta time
            const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
            this.lastTime = currentTime;

            // Reset per-frame limits
            if (this.audioManager) this.audioManager.resetFrameStats();

            // Only update game logic if in battle mode
            if (this.sceneManager.isBattleMode()) {
                // Update game state
                this.game.update(deltaTime);

                // Update UI
                this.uiManager.update();

                // Update multiplayer sync
                if (this.multiplayerManager) {
                    this.multiplayerManager.update(deltaTime);
                }
            }

            // Render based on current scene
            if (this.sceneManager.isDeploymentMode()) {
                // Render deployment canvas
                this.renderer.render();
                this.deploymentManager.renderDeploymentZones(this.renderer.ctx);
                this.deploymentManager.renderPreview(this.renderer.ctx);
            } else if (this.sceneManager.isBattleMode()) {
                // Render battle canvas
                this.battleRenderer.render();
                this.battleInputHandler.renderSelectionBox(this.battleRenderer.ctx);
            }

            // Continue loop
            requestAnimationFrame((time) => this.gameLoop(time));
        } catch (error) {
            console.error("FATAL GAME ERROR:", error);
            this.stop();
            alert("Game Crashed! Check console for details.");
        }
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
    }

    /**
     * Restart the game
     */
    restart() {
        this.game.restart();
        this.uiManager.clear();
        this.renderer.clearMovementTarget();
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new NapoleonicWargame();

    // Resume AudioContext on first interaction
    document.addEventListener('click', () => {
        if (game.audioManager && game.audioManager.audioContext && game.audioManager.audioContext.state === 'suspended') {
            game.audioManager.audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
    }, { once: true });

    console.log('Napoleonic Wargame initialized!');
    console.log('Controls:');
    console.log('  - Left Click + Drag: Select multiple units');
    console.log('  - Right Click: Move selected units');
    console.log('  - L: Line Formation');
    console.log('  - C: Column Formation');
    console.log('  - F: Square Formation');
    console.log('  - N: Clear Formation');
    console.log('  - R: Restart Game');
});
