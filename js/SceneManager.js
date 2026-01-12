// Scene Manager - Controls transitions between start, deployment, and battle scenes

class SceneManager {
    constructor() {
        this.currentScene = 'start';

        // Scene elements
        this.startScene = document.getElementById('startScene');
        this.deploymentScene = document.getElementById('deploymentScene');
        this.battleScene = document.getElementById('battleScene');

        // Buttons
        this.startButton = document.getElementById('startButton');
        this.startBattleButton = document.getElementById('startBattleButton');
        this.mpHostButton = document.getElementById('mpHostButton');
        this.mpJoinButton = document.getElementById('mpJoinButton');

        // Game references (set later)
        this.game = null;
        this.deploymentManager = null;
        this.renderer = null;

        this.initializeButtons();
    }

    /**
     * Initialize button event listeners
     */
    initializeButtons() {
        this.startButton.addEventListener('click', () => {
            this.transitionTo('deployment');
        });

        this.startBattleButton.addEventListener('click', () => {
            this.transitionTo('battle');
        });

        // Multiplayer buttons
        if (this.mpHostButton) {
            this.mpHostButton.addEventListener('click', () => {
                if (window.multiplayerManager) {
                    window.multiplayerManager.hostGame();
                    this.transitionTo('deployment');
                }
            });
        }

        if (this.mpJoinButton) {
            this.mpJoinButton.addEventListener('click', () => {
                if (window.multiplayerManager) {
                    // Show join UI first, then transition after connection
                    window.multiplayerManager.ui.show();
                    window.multiplayerManager.ui.showJoinMode();
                }
            });
        }
    }

    /**
     * Set game references
     */
    setGameReferences(game, deploymentManager, renderer, battleRenderer) {
        this.game = game;
        this.deploymentManager = deploymentManager;
        this.renderer = renderer;
        this.battleRenderer = battleRenderer;
    }

    /**
     * Transition to a different scene
     */
    transitionTo(sceneName) {
        // Hide all scenes
        this.startScene.style.display = 'none';
        this.deploymentScene.style.display = 'none';
        this.battleScene.style.display = 'none';

        // Show target scene
        switch (sceneName) {
            case 'start':
                this.currentScene = 'start';
                this.startScene.style.display = 'flex';
                break;

            case 'deployment':
                this.currentScene = 'deployment';
                this.deploymentScene.style.display = 'block';

                // Clear any existing units from previous games
                if (this.game) {
                    this.game.restart();
                }

                // Reset deployment manager counts
                if (this.deploymentManager) {
                    this.deploymentManager.deployedUnits = {
                        RED: { INFANTRY: 0, CAVALRY: 0 },
                        BLUE: { INFANTRY: 0, CAVALRY: 0 }
                    };
                    this.deploymentManager.updateAllCounts();
                    this.deploymentManager.enable();
                }
                break;

            case 'battle':
                this.currentScene = 'battle';
                this.battleScene.style.display = 'block';

                // Disable deployment mode
                if (this.deploymentManager) {
                    this.deploymentManager.disable();
                }

                // Start the battle
                if (this.game) {
                    this.game.gameOver = false;
                    this.game.winner = null;
                    this.game.gameTime = 0;
                }

                // Notify multiplayer of scene change
                if (window.multiplayerManager && window.multiplayerManager.isActive()) {
                    window.multiplayerManager.sendSceneTransition('battle');
                }
                break;
        }
    }

    /**
     * Get current scene
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * Check if we're in deployment mode
     */
    isDeploymentMode() {
        return this.currentScene === 'deployment';
    }

    /**
     * Check if we're in battle mode
     */
    isBattleMode() {
        return this.currentScene === 'battle';
    }
}
