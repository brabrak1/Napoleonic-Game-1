/**
 * MultiplayerManager.js
 * Main orchestrator for P2P multiplayer
 */

class MultiplayerManager {
    constructor(game, sceneManager, inputHandler, deploymentManager) {
        this.game = game;
        this.sceneManager = sceneManager;
        this.inputHandler = inputHandler;
        this.deploymentManager = deploymentManager;

        // Core components
        this.peerConnection = new PeerConnection();
        this.stateSync = new GameStateSync(game);
        this.ui = new UIController();

        // Multiplayer state
        this.isMultiplayer = false;
        this.isHost = false;
        this.myTeam = null;
        this.opponentTeam = null;

        // Sync state
        this.lastSyncTime = 0;

        this.setupPeerCallbacks();
        this.setupUICallbacks();
    }

    /**
     * Setup PeerConnection callbacks
     */
    setupPeerCallbacks() {
        this.peerConnection.onOpen = (peerId) => {
            console.log(`[MP] Peer opened: ${peerId}`);
            if (this.isHost) {
                this.ui.showHostMode(peerId);
            }
        };

        this.peerConnection.onConnection = (remotePeerId) => {
            console.log(`[MP] Connected to: ${remotePeerId}`);
            this.onPeerConnected(remotePeerId);
        };

        this.peerConnection.onData = (data) => {
            this.handleRemoteData(data);
        };

        this.peerConnection.onDisconnect = () => {
            console.log('[MP] Peer disconnected');
            this.ui.showToast('Opponent disconnected', true);
            this.disableMultiplayer();
        };

        this.peerConnection.onError = (err) => {
            console.error('[MP] Peer error:', err);
            this.ui.showToast(`Connection error: ${err.type}`, true);
        };
    }

    /**
     * Setup UI callbacks
     */
    setupUICallbacks() {
        // Join button
        if (this.ui.joinBtn) {
            this.ui.joinBtn.addEventListener('click', () => {
                const roomCode = this.ui.joinCodeInput.value.trim();
                if (!roomCode) {
                    this.ui.showToast('Please enter a room code', true);
                    return;
                }
                this.joinGame(roomCode);
            });
        }

        // Disconnect button
        if (this.ui.disconnectBtn) {
            this.ui.disconnectBtn.addEventListener('click', () => {
                this.disconnect();
            });
        }
    }

    /**
     * Host a game (RED player)
     */
    hostGame() {
        console.log('[MP] Hosting game as RED');
        this.isMultiplayer = true;
        this.isHost = true;
        this.myTeam = 'RED';
        this.opponentTeam = 'BLUE';

        // Initialize peer as host
        this.peerConnection.initializeAsHost();

        // Restrict input to RED
        this.inputHandler.playerTeam = 'RED';

        // Show UI
        this.ui.show();
    }

    /**
     * Join a game (BLUE player)
     */
    joinGame(roomCode) {
        console.log(`[MP] Joining game as BLUE: ${roomCode}`);
        this.isMultiplayer = true;
        this.isHost = false;
        this.myTeam = 'BLUE';
        this.opponentTeam = 'RED';

        // Initialize peer as guest
        this.peerConnection.initializeAsGuest();

        // Once peer opens, connect
        this.peerConnection.onOpen = (peerId) => {
            console.log(`[MP] Guest peer ID: ${peerId}`);
            this.peerConnection.connectToPeer(roomCode);
            this.ui.setStatus('connecting', 'Connecting...');
        };

        // Restrict input to BLUE
        this.inputHandler.playerTeam = 'BLUE';

        // Show UI
        this.ui.show();
    }

    /**
     * Called when peer connection established
     */
    onPeerConnected(remotePeerId) {
        this.ui.showConnected(this.myTeam, remotePeerId);
        this.ui.showToast(`Connected! You are ${this.myTeam}`);

        // Restrict input to team
        this.inputHandler.playerTeam = this.myTeam;

        // GUEST: Transition to deployment scene after connection
        if (!this.isHost && this.sceneManager) {
            this.sceneManager.transitionTo('deployment');
        }

        // Hook deployment
        this.hookDeployment();
    }

    /**
     * Handle data received from remote peer
     */
    handleRemoteData(data) {
        switch (data.type) {
            case 'GAME_STATE_SYNC':
                // Host sends full state, guest receives
                if (!this.isHost) {
                    this.stateSync.mergeRemoteState(data);
                }
                break;

            case 'DEPLOY_UNIT':
                // Opponent deployed a unit
                this.stateSync.applyDeploymentEvent(data);
                if (this.deploymentManager && this.deploymentManager.updateAllCounts) {
                    this.deploymentManager.updateAllCounts();
                }
                break;

            case 'SCENE_TRANSITION':
                // Opponent changed scene
                if (data.scene === 'battle' && this.sceneManager.currentScene === 'deployment') {
                    this.sceneManager.transitionTo('battle');
                }
                break;

            default:
                console.warn(`[MP] Unknown data type: ${data.type}`);
        }
    }

    /**
     * Hook into deployment to sync unit placement
     */
    hookDeployment() {
        const originalHandleClick = this.deploymentManager.handleCanvasClick.bind(this.deploymentManager);

        this.deploymentManager.handleCanvasClick = (e) => {
            // Call original
            const unitsBefore = this.game.units.length;
            originalHandleClick(e);
            const unitsAfter = this.game.units.length;

            // If a unit was added, sync it
            if (unitsAfter > unitsBefore) {
                const newUnit = this.game.units[this.game.units.length - 1];
                const deployEvent = this.stateSync.serializeDeploymentEvent(newUnit);
                this.peerConnection.send(deployEvent);
            }
        };
    }

    /**
     * Update multiplayer (called every frame)
     */
    update(deltaTime) {
        if (!this.isMultiplayer || !this.peerConnection.isConnected) return;

        // Host broadcasts state
        if (this.isHost && this.sceneManager.isBattleMode()) {
            if (this.stateSync.shouldSync(deltaTime)) {
                const state = this.stateSync.serializeGameState();
                this.peerConnection.send(state);
            }
        }

        // Update UI stats
        const stats = this.peerConnection.getStats();
        this.ui.updateStats(stats);
    }

    /**
     * Send scene transition
     */
    sendSceneTransition(sceneName) {
        if (this.isMultiplayer && this.peerConnection.isConnected) {
            this.peerConnection.send({
                type: 'SCENE_TRANSITION',
                scene: sceneName,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Disconnect and disable multiplayer
     */
    disconnect() {
        this.peerConnection.disconnect();
        this.disableMultiplayer();
        this.ui.showToast('Disconnected from game');
        this.ui.hide();
    }

    /**
     * Disable multiplayer mode
     */
    disableMultiplayer() {
        this.isMultiplayer = false;
        this.myTeam = null;
        this.opponentTeam = null;
        this.inputHandler.playerTeam = null; // Allow all teams again
    }

    /**
     * Check if multiplayer is active
     */
    isActive() {
        return this.isMultiplayer && this.peerConnection.isConnected;
    }
}
