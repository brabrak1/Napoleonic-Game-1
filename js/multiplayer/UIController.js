/**
 * UIController.js
 * Manages multiplayer UI panel and notifications
 */

class UIController {
    constructor() {
        // Panel elements
        this.panel = document.getElementById('multiplayerPanel');
        this.content = document.getElementById('mpContent');
        this.toggleBtn = document.getElementById('mpToggle');

        // Status
        this.statusEl = document.getElementById('mpStatus');
        this.statusText = document.getElementById('mpStatusText');

        // Host section
        this.hostSection = document.getElementById('mpHostSection');
        this.hostCodeInput = document.getElementById('mpHostCode');
        this.copyCodeBtn = document.getElementById('mpCopyCode');

        // Join section
        this.joinSection = document.getElementById('mpJoinSection');
        this.joinCodeInput = document.getElementById('mpJoinCode');
        this.joinBtn = document.getElementById('mpJoinBtn');

        // Peer info
        this.peerInfo = document.getElementById('mpPeerInfo');
        this.yourTeamEl = document.getElementById('mpYourTeam');
        this.opponentIdEl = document.getElementById('mpOpponentId');
        this.pingEl = document.getElementById('mpPing');
        this.disconnectBtn = document.getElementById('mpDisconnect');

        // Debug
        this.debugSection = document.getElementById('mpDebug');
        this.sentCountEl = document.getElementById('mpSentCount');
        this.recvCountEl = document.getElementById('mpRecvCount');
        this.syncRateEl = document.getElementById('mpSyncRate');

        // Toast
        this.toast = document.getElementById('mpToast');
        this.toastText = document.getElementById('mpToastText');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle minimize
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                this.panel.classList.toggle('minimized');
                this.toggleBtn.textContent = this.panel.classList.contains('minimized') ? '+' : '−';
            });
        }

        // Copy code button
        if (this.copyCodeBtn) {
            this.copyCodeBtn.addEventListener('click', () => {
                this.hostCodeInput.select();
                document.execCommand('copy');
                this.showToast('Code copied to clipboard!');
            });
        }
    }

    /**
     * Show panel
     */
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    }

    /**
     * Hide panel
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    /**
     * Update connection status
     */
    setStatus(status, text) {
        if (this.statusEl && this.statusText) {
            this.statusEl.className = `mp-status ${status}`; // disconnected, connecting, connected
            this.statusText.textContent = text;
        }
    }

    /**
     * Display host mode UI
     */
    showHostMode(peerId) {
        if (this.hostCodeInput) {
            this.hostCodeInput.value = peerId;
        }
        if (this.hostSection) {
            this.hostSection.style.display = 'block';
        }
        if (this.joinSection) {
            this.joinSection.style.display = 'none';
        }
        if (this.peerInfo) {
            this.peerInfo.style.display = 'none';
        }
        this.setStatus('connecting', 'Waiting for opponent...');
    }

    /**
     * Display join mode UI
     */
    showJoinMode() {
        if (this.hostSection) {
            this.hostSection.style.display = 'none';
        }
        if (this.joinSection) {
            this.joinSection.style.display = 'block';
        }
        if (this.peerInfo) {
            this.peerInfo.style.display = 'none';
        }
        this.setStatus('disconnected', 'Enter room code to join');
    }

    /**
     * Display connected state
     */
    showConnected(yourTeam, opponentId) {
        if (this.hostSection) {
            this.hostSection.style.display = 'none';
        }
        if (this.joinSection) {
            this.joinSection.style.display = 'none';
        }
        if (this.peerInfo) {
            this.peerInfo.style.display = 'block';
        }

        if (this.yourTeamEl) {
            this.yourTeamEl.textContent = yourTeam;
            this.yourTeamEl.style.color = yourTeam === 'RED' ? '#f44336' : '#2196f3';
        }
        if (this.opponentIdEl) {
            this.opponentIdEl.textContent = opponentId.substring(0, 8) + '...';
        }

        this.setStatus('connected', '✅ Connected');
    }

    /**
     * Update network stats
     */
    updateStats(stats) {
        if (this.pingEl) {
            this.pingEl.textContent = stats.latency || '-';
        }
        if (this.sentCountEl) {
            this.sentCountEl.textContent = stats.sentCount || 0;
        }
        if (this.recvCountEl) {
            this.recvCountEl.textContent = stats.recvCount || 0;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, isError = false) {
        if (this.toast && this.toastText) {
            this.toastText.textContent = message;
            this.toast.className = isError ? 'mp-toast error' : 'mp-toast';
            this.toast.style.display = 'block';

            setTimeout(() => {
                this.toast.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        if (this.debugSection) {
            this.debugSection.style.display = 'block';
        }
    }
}
