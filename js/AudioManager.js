// Audio Manager - Handles sound effects with distance-based volume

class AudioManager {
    constructor() {
        this.masterVolume = CONFIG.AUDIO.MASTER_VOLUME;
        this.enabled = true;

        // Audio context (for future Web Audio API integration)
        this.sounds = {};

        // Placeholder for sound files
        // We'll try to load actual files, fallback to synths
        this.lastSoundTime = {}; // debounce map
        this.soundsPlayedThisFrame = 0; // Hard cap counter
        this.initializeSounds();
    }

    /**
     * Initialize sound effects
     */
    initializeSounds() {
        this.sounds = {};

        // Try to load custom sounds
        this.loadSound('musket', 'assets/sounds/shot.mp3');
        this.loadSound('cannon', 'assets/sounds/cannonfiring.wav');
        this.loadSound('charge', 'assets/sounds/charge.mp3'); // Proactive support
        this.loadSound('wounded', 'assets/sounds/wounded.mp3');
        this.loadSound('horse', 'assets/sounds/horse.mp3');

        // Melee sounds
        this.loadSound('slash', 'assets/sounds/Slash.wav');
        this.loadSound('clash1', 'assets/sounds/Weapon Sword Hit Solid Metal.wav');
        this.loadSound('clash2', 'assets/sounds/Weapon Sword Hits Sword.wav');
        this.loadSound('clash3', 'assets/sounds/WeaponSword Hitsshield.wav');
        this.loadSound('clash4', 'assets/sounds/Weapon Sword Hit hield.wav');

        // We'll use the Web Audio API to create simple sounds (fallback)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            // If Web Audio fails, we might still have HTML5 Audio from loadSound, so keep enabled true?
            // But if strict, maybe false. Let's assume false for synth, true for files.
        }
    }

    /**
     * Load a sound file
     * @param {string} key - Key to access the sound
     * @param {string} path - Path to file
     */
    loadSound(key, path) {
        const audio = new Audio(path);
        // Preload
        audio.preload = 'auto';

        // Check if file exists/loads successfully
        audio.addEventListener('canplaythrough', () => {
            console.log(`Audio loaded: ${key}`);
            this.sounds[key] = audio;
        });

        audio.addEventListener('error', (e) => {
            // calculated silence is golden
            // console.log(`Audio file not found: ${path}, using fallback.`);
        });
    }

    /**
     * Reset frame-based statistics/counters
     * Called at the start of every game frame
     */
    resetFrameStats() {
        this.soundsPlayedThisFrame = 0;
    }

    /**
     * Play a loaded sound file if available
     * @param {string} key - Sound key
     * @param {number} volume - Volume (0-1)
     * @param {number} durationLimit - Optional duration limit in seconds
     * @returns {boolean} - True if played, false if not found
     */
    playSoundFile(key, volume, durationLimit = null) {
        // Safety: Hard cap on concurrent sounds per frame
        if (this.soundsPlayedThisFrame > 10) return false;

        if (this.sounds[key]) {
            // Throttling: Prevent same sound from playing too frequently (e.g. 50ms)
            const now = Date.now();
            if (this.lastSoundTime[key] && now - this.lastSoundTime[key] < 50) {
                return true; // Pretend we played it to satisfy callers
            }
            this.lastSoundTime[key] = now;

            // Clone node to allow overlapping sounds
            const sound = this.sounds[key].cloneNode();
            sound.volume = Math.min(1, Math.max(0, volume * this.masterVolume));

            const playPromise = sound.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn('Audio play failed:', e);
                });
            }

            this.soundsPlayedThisFrame++; // Increment counter

            // Apply duration limit if specified
            if (durationLimit !== null) {
                setTimeout(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }, durationLimit * 1000);
            }

            return true;
        }
        return false;
    }

    /**
     * Play musket fire sound
     * @param {number} x - X position of the sound
     * @param {number} y - Y position of the sound
     */
    playMusketFire(x, y) {
        if (!this.enabled) return;

        // Calculate volume based on distance from center of screen
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, CONFIG.AUDIO.MUSKET_VOLUME);

        // Try playing file first
        if (this.playSoundFile('musket', volume, 3.0)) {
            return;
        }

        // Fallback to synth
        this.playBeep(200, 0.05, volume, 'square'); // Sharp crack sound
    }

    /**
     * Play cannon fire sound
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playCannonFire(x, y) {
        if (!this.enabled) return;

        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        // Louder than musket
        const volume = this.calculateVolume(distance, CONFIG.AUDIO.MUSKET_VOLUME * 1.5);

        if (this.playSoundFile('cannon', volume)) {
            return;
        }

        // Fallback
        this.playBeep(100, 0.4, volume, 'sawtooth');
    }

    /**
     * Play wounded sound
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playWounded(x, y) {
        if (!this.enabled) return;

        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, 0.8); // High volume for drama

        this.playSoundFile('wounded', volume, 3.0);
    }

    /**
     * Update horse movement sound
     * @param {boolean} isMoving - Whether any cavalry is moving
     */
    updateHorseMovement(isMoving) {
        if (!this.enabled) return;

        if (isMoving) {
            if (!this.horseSoundPlaying) {
                if (this.sounds['horse']) {
                    this.horseSoundPlaying = true;
                    // Create a dedicated loop instance
                    if (!this.horseLoop) {
                        this.horseLoop = this.sounds['horse'].cloneNode();
                        this.horseLoop.loop = true;
                        this.horseLoop.volume = 0.1 * this.masterVolume; // Quietly

                        // Limit loop to first 3 seconds
                        this.horseLoop.addEventListener('timeupdate', () => {
                            if (this.horseLoop.currentTime > 3.0) {
                                this.horseLoop.currentTime = 0;
                            }
                        });
                    }
                    this.horseLoop.play().catch(e => { });
                }
            }
        } else {
            if (this.horseSoundPlaying) {
                this.horseSoundPlaying = false;
                if (this.horseLoop) {
                    this.horseLoop.pause();
                }
            }
        }
    }

    /**
     * Play melee impact sound (Slash)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playMeleeImpact(x, y) {
        if (!this.enabled) return;
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, 0.7);
        this.playSoundFile('slash', volume);
    }

    /**
     * Play random melee clash sound
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playMeleeClash(x, y) {
        if (!this.enabled) return;
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, 0.6);

        const randomClash = Math.floor(Math.random() * 4) + 1;
        this.playSoundFile(`clash${randomClash}`, volume);
    }

    /**
     * Play cavalry charge sound
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playCavalryCharge(x, y) {
        if (!this.enabled) return;

        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, CONFIG.AUDIO.CAVALRY_VOLUME);

        this.playBeep(100, 0.3, volume, 'sawtooth'); // Lower rumble
    }

    /**
     * Play explosion sound
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    playExplosion(x, y) {
        if (!this.enabled) return;

        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const volume = this.calculateVolume(distance, CONFIG.AUDIO.EXPLOSION_VOLUME);

        this.playBeep(80, 0.4, volume, 'sawtooth'); // Deep boom
    }

    /**
     * Calculate volume based on distance
     * @param {number} distance - Distance from listener
     * @param {number} baseVolume - Base volume multiplier
     * @returns {number} - Final volume (0-1)
     */
    calculateVolume(distance, baseVolume) {
        const falloff = Math.max(0, 1 - distance / CONFIG.AUDIO.MAX_DISTANCE);
        return falloff * baseVolume * this.masterVolume;
    }

    /**
     * Play a simple beep sound (placeholder for real audio)
     * @param {number} frequency - Sound frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {number} volume - Volume (0-1)
     * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
     */
    playBeep(frequency, duration, volume, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable or disable audio
     * @param {boolean} enabled - Enable state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Stop all active sounds and loops
     */
    stopAll() {
        // Stop horse loop
        if (this.horseLoop) {
            this.horseLoop.pause();
            this.horseLoop.currentTime = 0;
            this.horseSoundPlaying = false;
        }

        // Stop all other scheduled sounds if possible (Web Audio API)
        // Note: We avoid suspending the context here as it can cause resume issues or crashes
        // depending on browser policy. Fire-and-forget sounds will finish naturally.
        this.resetFrameStats();
    }
}
