// Visual Effects System - Manages muzzle flash, smoke, explosions, screen shake

class VisualEffects {
    constructor() {
        this.particles = [];
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeTimer = 0;
    }

    /**
     * Create muzzle flash effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} angle - Firing angle
     */
    createMuzzleFlash(x, y, angle) {
        // Yellow flash at gun position (extended forward from unit)
        const flashX = x + Math.cos(angle) * 15;
        const flashY = y + Math.sin(angle) * 15;

        // Throttling: Limit max particles
        if (this.particles.length > 500) {
            this.particles.shift(); // Remove oldest
        }

        this.particles.push({
            type: 'flash',
            x: flashX,
            y: flashY,
            size: CONFIG.EFFECTS.MUZZLE_FLASH_SIZE,
            lifetime: CONFIG.EFFECTS.MUZZLE_FLASH_DURATION,
            maxLifetime: CONFIG.EFFECTS.MUZZLE_FLASH_DURATION,
            color: '#ffff00',
            alpha: 1.0
        });
    }

    /**
     * Create smoke cloud effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createSmokeCloud(x, y) {
        // Create multiple smoke particles
        for (let i = 0; i < CONFIG.EFFECTS.SMOKE_PARTICLES; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 20;

            // Throttling: Stop adding smoke if limit reached to save performance
            if (this.particles.length > 500) break;

            this.particles.push({
                type: 'smoke',
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 10, // Slight upward drift
                size: 5 + Math.random() * 5,
                lifetime: CONFIG.EFFECTS.SMOKE_DURATION,
                maxLifetime: CONFIG.EFFECTS.SMOKE_DURATION,
                color: '#808080',
                alpha: 0.7
            });
        }
    }

    /**
     * Create explosion effect (for cavalry charges, high-impact hits)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createExplosion(x, y) {
        const particleCount = 15;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 40 + Math.random() * 30;

            this.particles.push({
                type: 'explosion',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                lifetime: 0.5,
                maxLifetime: 0.5,
                color: '#ff6600',
                alpha: 1.0
            });
        }
    }

    /**
     * Apply screen shake effect
     * @param {number} intensity - Shake intensity in pixels
     */
    applyScreenShake(intensity = CONFIG.EFFECTS.SCREEN_SHAKE_INTENSITY) {
        this.shakeOffset = {
            x: (Math.random() - 0.5) * intensity * 2,
            y: (Math.random() - 0.5) * intensity * 2
        };
        this.shakeTimer = CONFIG.EFFECTS.SCREEN_SHAKE_DURATION;
    }

    /**
     * Update all visual effects
     * @param {number} deltaTime - Time delta in seconds
     */
    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(p => {
            p.lifetime -= deltaTime;

            // Update position for moving particles
            if (p.vx !== undefined) {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;

                // Apply gravity to smoke
                if (p.type === 'smoke') {
                    p.vy += 5 * deltaTime; // Slight upward acceleration
                }
            }

            // Update alpha based on lifetime
            p.alpha = p.lifetime / p.maxLifetime;

            // Remove if lifetime expired
            return p.lifetime > 0;
        });

        // Update screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            if (this.shakeTimer <= 0) {
                this.shakeOffset = { x: 0, y: 0 };
            }
        }
    }

    /**
     * Render all visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        ctx.save();

        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            if (p.type === 'flash') {
                // Draw bright flash
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, '#ffff00');
                gradient.addColorStop(0.5, '#ff8800');
                gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else {
                // Draw particle circle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Clear all effects
     */
    clear() {
        this.particles = [];
        this.shakeOffset = { x: 0, y: 0 };
        this.shakeTimer = 0;
    }

    /**
     * Get current screen shake offset
     * @returns {Object} - {x, y} offset in pixels
     */
    getShakeOffset() {
        return this.shakeOffset;
    }
}
