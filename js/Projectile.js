// Projectile Class - Handles visible projectiles like cannonballs

class Projectile {
    /**
     * Create a new projectile
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} angle - Travel angle in radians
     * @param {number} speed - Speed in pixels per second
     * @param {number} damage - Damage on hit
     * @param {string} team - Team that fired it ('RED' or 'BLUE')
     * @param {number} range - Max travel distance
     */
    constructor(x, y, angle, speed, damage, team, range) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.speed = speed;
        this.damage = damage;
        this.team = team;
        this.range = range;
        this.radius = 4; // Visual radius of the ball
        this.isDead = false;

        // Spawn offset: Move projectile to end of barrel so it doesn't clip
        this.x += Math.cos(angle) * 20;
        this.y += Math.sin(angle) * 20;
    }

    /**
     * Update projectile position
     * @param {number} deltaTime - Time step
     */
    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Visual arc effect (simulated shadow for height?) 
        // For top-down, simple linear movement is fine for now.

        // Check range
        const dist = Math.sqrt((this.x - this.startX) ** 2 + (this.y - this.startY) ** 2);
        if (dist > this.range) {
            this.isDead = true;
        }

        // Check bounds
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH || this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            this.isDead = true;
        }
    }
}
