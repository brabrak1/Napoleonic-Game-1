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
        this.deploymentManager.playerTeam = 'RED';
        this.stateSync.playerTeam = 'RED';

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
        this.deploymentManager.playerTeam = 'BLUE';
        this.stateSync.playerTeam = 'BLUE';

        // Show UI
        this.ui.show();
    }

    /**
     * Called when peer connection established
     */
    onPeerConnected(remotePeerId) {
        this.ui.showConnected(this.myTeam, remotePeerId);
        this.ui.showToast(`Connected! You are ${this.myTeam}`);

        // ID Separation: Host 0+, Guest 10000+
        if (!this.isHost) {
            this.game.setUnitIdBase(10000);
            console.log('[MP] Guest ID Base set to 10000');
        } else {
            this.game.setUnitIdBase(0);
        }

        // Restrict input to team
        this.inputHandler.playerTeam = this.myTeam;
        this.deploymentManager.playerTeam = this.myTeam;
        this.stateSync.playerTeam = this.myTeam;

        // Update settings panel to reflect multiplayer role
        if (window.game && window.game.settingsPanel) {
            window.game.settingsPanel.updateMultiplayerState();
        }

        // GUEST: Transition to deployment scene after connection
        if (!this.isHost && this.sceneManager) {
            this.sceneManager.transitionTo('deployment');
        }

        // Hook deployment
        this.hookDeployment();

        // Hook battle combat/movement
        this.hookBattle();
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

            case 'MOVE_UNITS':
                // Opponent moved units
                if (data.unitIds && data.targetX !== undefined && data.targetY !== undefined) {
                    const unitsToMove = this.game.units.filter(u => data.unitIds.includes(u.id));
                    if (unitsToMove.length > 0) {
                        console.log(`[MP] Moving ${unitsToMove.length} units for opponent`);
                        this.game.moveUnits(unitsToMove, data.targetX, data.targetY);
                    }
                }
                break;

            case 'FORMATION_CHANGE':
                // Opponent changed formation
                if (data.unitIds && data.formation !== undefined) {
                    const unitsToUpdate = this.game.units.filter(u => data.unitIds.includes(u.id));
                    if (unitsToUpdate.length > 0) {
                        console.log(`[MP] Updating formation to ${data.formation} for ${unitsToUpdate.length} units`);
                        FormationSystem.applyFormation(unitsToUpdate, data.formation);
                    }
                }
                break;

            case 'RESTART':
                // Opponent requested restart
                console.log('[MP] Restart requested by peer');
                this.ui.showToast('Game Restarted by Peer');
                if (this.sceneManager) {
                    this.sceneManager.transitionTo('deployment');
                } else {
                    this.game.restart();
                }
                break;

            case 'SYNC_SETTINGS':
                // Host sent new settings
                console.log('[MP] Settings received from Host');
                if (this.game.settingsPanel) {
                    this.game.settingsPanel.applyRemoteSettings(data.settings);
                } else if (window.game && window.game.settingsPanel) {
                    // Fallback access
                    window.game.settingsPanel.applyRemoteSettings(data.settings);
                }
                this.ui.showToast('Host updated game settings');
                break;

            default:
                console.warn(`[MP] Unknown data type: ${data.type}`);
        }
    }

    /**
     * Broadcast restart command
     */
    restartGame() {
        if (!this.isActive()) return;
        this.peerConnection.send({
            type: 'RESTART',
            timestamp: Date.now()
        });
    }

    /**
     * Broadcast settings sync
     */
    syncSettings(settings) {
        if (!this.isActive()) return;
        this.peerConnection.send({
            type: 'SYNC_SETTINGS',
            settings: settings,
            timestamp: Date.now()
        });
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
     * Hook into battle to sync movement and formations
     */
    hookBattle() {
        // Intercept game.moveSelectedUnits
        const originalMoveSelectedUnits = this.game.moveSelectedUnits.bind(this.game);

        this.game.moveSelectedUnits = (targetX, targetY) => {
            // 1. Execute locally first
            originalMoveSelectedUnits(targetX, targetY);

            // 2. Broadcast to peer
            if (this.game.selectedUnits.length > 0 && this.peerConnection.isConnected) {
                const unitIds = this.game.selectedUnits.map(u => u.id);
                this.peerConnection.send({
                    type: 'MOVE_UNITS',
                    unitIds: unitIds,
                    targetX: targetX,
                    targetY: targetY,
                    timestamp: Date.now()
                });
            }
        };

        // Intercept game.setFormationForSelected
        const originalSetFormation = this.game.setFormationForSelected.bind(this.game);

        this.game.setFormationForSelected = (formationType) => {
            // 1. Execute locally first
            originalSetFormation(formationType);

            // 2. Broadcast to peer
            if (this.game.selectedUnits.length > 0 && this.peerConnection.isConnected) {
                const unitIds = this.game.selectedUnits.map(u => u.id);
                this.peerConnection.send({
                    type: 'FORMATION_CHANGE',
                    unitIds: unitIds,
                    formation: formationType,
                    timestamp: Date.now()
                });
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
        this.deploymentManager.playerTeam = null;
        this.stateSync.playerTeam = null;

        // Reset ID base
        this.game.setUnitIdBase(0);

        // Re-enable settings for single player
        if (window.game && window.game.settingsPanel) {
            window.game.settingsPanel.updateMultiplayerState();
        }
    }

    /**
     * Check if multiplayer is active
     */
    isActive() {
        return this.isMultiplayer && this.peerConnection.isConnected;
    }
}
