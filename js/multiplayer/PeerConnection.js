/**
 * PeerConnection.js
 * Wraps PeerJS for WebRTC P2P connection management
 */

class PeerConnection {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.peerId = null;
        this.remotePeerId = null;
        this.isHost = false;
        this.isConnected = false;

        // Callbacks
        this.onOpen = null;
        this.onConnection = null;
        this.onData = null;
        this.onDisconnect = null;
        this.onError = null;

        // Stats
        this.sentCount = 0;
        this.recvCount = 0;
        this.lastPingTime = 0;
        this.latency = 0;
    }

    /**
     * Initialize PeerJS connection (Host mode)
     */
    initializeAsHost() {
        console.log('[P2P] Initializing as HOST...');
        this.isHost = true;

        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.peerId = id;
            console.log(`[P2P] Host Peer ID: ${id}`);
            if (this.onOpen) this.onOpen(id);
        });

        this.peer.on('connection', (conn) => {
            console.log(`[P2P] Incoming connection from: ${conn.peer}`);
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('[P2P] PeerJS Error:', err);
            if (this.onError) this.onError(err);
        });
    }

    /**
     * Initialize PeerJS connection (Guest mode)
     */
    initializeAsGuest() {
        console.log('[P2P] Initializing as GUEST...');
        this.isHost = false;

        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.peerId = id;
            console.log(`[P2P] Guest Peer ID: ${id}`);
            if (this.onOpen) this.onOpen(id);
        });

        this.peer.on('error', (err) => {
            console.error('[P2P] PeerJS Error:', err);
            if (this.onError) this.onError(err);
        });
    }

    /**
     * Connect to remote peer (Guest only)
     */
    connectToPeer(remotePeerId) {
        if (!this.peer) {
            console.error('[P2P] Peer not initialized');
            return;
        }

        console.log(`[P2P] Connecting to peer: ${remotePeerId}`);
        this.remotePeerId = remotePeerId;

        this.connection = this.peer.connect(remotePeerId, {
            reliable: true,
            serialization: 'json'
        });

        this.handleConnection(this.connection);
    }

    /**
     * Handle incoming or outgoing connection
     */
    handleConnection(conn) {
        this.connection = conn;
        this.remotePeerId = conn.peer;

        conn.on('open', () => {
            console.log(`[P2P] Connection opened with: ${conn.peer}`);
            this.isConnected = true;
            if (this.onConnection) this.onConnection(conn.peer);

            // Start ping loop
            this.startPingLoop();
        });

        conn.on('data', (data) => {
            this.recvCount++;

            // Handle ping/pong
            if (data.type === 'ping') {
                this.send({ type: 'pong', timestamp: data.timestamp });
                return;
            }
            if (data.type === 'pong') {
                this.latency = Date.now() - data.timestamp;
                return;
            }

            // Forward to multiplayer manager
            if (this.onData) this.onData(data);
        });

        conn.on('close', () => {
            console.log('[P2P] Connection closed');
            this.isConnected = false;
            if (this.onDisconnect) this.onDisconnect();
        });

        conn.on('error', (err) => {
            console.error('[P2P] Connection Error:', err);
            if (this.onError) this.onError(err);
        });
    }

    /**
     * Send data to connected peer
     */
    send(data) {
        if (!this.isConnected || !this.connection) {
            console.warn('[P2P] Cannot send: Not connected');
            return false;
        }

        try {
            this.connection.send(data);
            this.sentCount++;
            return true;
        } catch (err) {
            console.error('[P2P] Send error:', err);
            return false;
        }
    }

    /**
     * Start ping loop for latency measurement
     */
    startPingLoop() {
        setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping', timestamp: Date.now() });
            }
        }, 2000); // Ping every 2 seconds
    }

    /**
     * Disconnect from peer
     */
    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isConnected = false;
        this.remotePeerId = null;
        console.log('[P2P] Disconnected');
    }

    /**
     * Get connection stats
     */
    getStats() {
        return {
            isConnected: this.isConnected,
            isHost: this.isHost,
            peerId: this.peerId,
            remotePeerId: this.remotePeerId,
            sentCount: this.sentCount,
            recvCount: this.recvCount,
            latency: this.latency
        };
    }
}
