// Line of Sight System - Handles raycasting for musket fire

class LOSSystem {
    /**
     * Check if there is a clear line of sight from one unit to another
     * CRITICAL: Must check both terrain AND friendly unit blocking
     * @param {Unit} fromUnit - The shooting unit
     * @param {Unit} toUnit - The target unit
     * @param {Array<Unit>} allUnits - All units in the game
     * @param {Object} terrain - Terrain data (optional, for future expansion)
     * @returns {Object} - { hasLOS: boolean, blockedBy: 'terrain'|'friendly'|null, blockingUnit: Unit|null }
     */
    static checkLOS(fromUnit, toUnit, allUnits, terrain = null) {
        // Get ray points
        const rayPoints = this.raycast(fromUnit.x, fromUnit.y, toUnit.x, toUnit.y, CONFIG.LOS.SAMPLE_RATE);

        // Check terrain blocking (if terrain data is provided)
        if (terrain && CONFIG.LOS.TERRAIN_BLOCKS) {
            for (const point of rayPoints) {
                if (this.checkTerrainBlock(point.x, point.y, terrain)) {
                    return {
                        hasLOS: false,
                        blockedBy: 'terrain',
                        blockingUnit: null
                    };
                }
            }
        }

        // Check friendly unit blocking
        if (CONFIG.LOS.FRIENDLY_BLOCKS) {
            const friendlyBlock = this.checkFriendlyBlock(
                fromUnit.x, fromUnit.y,
                toUnit.x, toUnit.y,
                fromUnit, toUnit, allUnits
            );

            if (friendlyBlock.blocked) {
                return {
                    hasLOS: false,
                    blockedBy: 'friendly',
                    blockingUnit: friendlyBlock.unit
                };
            }
        }

        // Clear LOS
        return {
            hasLOS: true,
            blockedBy: null,
            blockingUnit: null
        };
    }

    /**
     * Generate points along a ray from start to end
     * Uses Digital Differential Analyzer (DDA) algorithm
     * @param {number} startX - Starting x coordinate
     * @param {number} startY - Starting y coordinate
     * @param {number} endX - Ending x coordinate
     * @param {number} endY - Ending y coordinate
     * @param {number} sampleRate - Distance between samples in pixels
     * @returns {Array} - Array of {x, y} points along the ray
     */
    static raycast(startX, startY, endX, endY, sampleRate) {
        const points = [];
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return points;

        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Sample points along the ray
        for (let d = 0; d < distance; d += sampleRate) {
            points.push({
                x: startX + dirX * d,
                y: startY + dirY * d
            });
        }

        return points;
    }

    /**
     * Check if terrain blocks LOS at a given point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} terrain - Terrain data
     * @returns {boolean} - True if terrain blocks
     */
    static checkTerrainBlock(x, y, terrain) {
        // Placeholder for terrain blocking
        // In this simple version, we don't have terrain obstacles
        // This can be expanded later with terrain grid data
        return false;
    }

    /**
     * Check if any friendly unit blocks the line of fire
     * Uses circle-line intersection test
     * @param {number} x1 - Shooter x
     * @param {number} y1 - Shooter y
     * @param {number} x2 - Target x
     * @param {number} y2 - Target y
     * @param {Unit} fromUnit - Shooting unit (to exclude from check)
     * @param {Unit} toUnit - Target unit (to exclude from check)
     * @param {Array<Unit>} allUnits - All units in the game
     * @returns {Object} - { blocked: boolean, unit: Unit|null }
     */
    static checkFriendlyBlock(x1, y1, x2, y2, fromUnit, toUnit, allUnits) {
        // Get all friendly units (same team as shooter, excluding shooter and target)
        // Get all friendly units (same team as shooter, excluding shooter and target)
        // Optimization: Pre-filter by bounding box of the ray
        const minX = Math.min(x1, x2) - CONFIG.INFANTRY.COLLISION_RADIUS;
        const maxX = Math.max(x1, x2) + CONFIG.INFANTRY.COLLISION_RADIUS;
        const minY = Math.min(y1, y2) - CONFIG.INFANTRY.COLLISION_RADIUS;
        const maxY = Math.max(y1, y2) + CONFIG.INFANTRY.COLLISION_RADIUS;

        const friendlyUnits = allUnits.filter(unit =>
            unit.team === fromUnit.team &&
            unit.id !== fromUnit.id &&
            unit.id !== toUnit.id &&
            !unit.isDead() &&
            unit.x >= minX && unit.x <= maxX && // Bounding box check
            unit.y >= minY && unit.y <= maxY
        );

        // Check each friendly unit for intersection with the ray
        for (const friendly of friendlyUnits) {
            if (this.circleLineIntersection(
                friendly.x, friendly.y, friendly.collisionRadius,
                x1, y1, x2, y2
            )) {
                return { blocked: true, unit: friendly };
            }
        }

        return { blocked: false, unit: null };
    }

    /**
     * Check if a circle intersects with a line segment
     * @param {number} cx - Circle center x
     * @param {number} cy - Circle center y
     * @param {number} radius - Circle radius
     * @param {number} x1 - Line start x
     * @param {number} y1 - Line start y
     * @param {number} x2 - Line end x
     * @param {number} y2 - Line end y
     * @returns {boolean} - True if circle intersects line
     */
    static circleLineIntersection(cx, cy, radius, x1, y1, x2, y2) {
        // Vector from line start to circle center
        const dx = cx - x1;
        const dy = cy - y1;

        // Line direction vector
        const lx = x2 - x1;
        const ly = y2 - y1;
        const lineLength = Math.sqrt(lx * lx + ly * ly);

        if (lineLength === 0) return false;

        // Normalize line direction
        const nx = lx / lineLength;
        const ny = ly / lineLength;

        // Project circle center onto line (clamped to segment)
        const t = Math.max(0, Math.min(lineLength, dx * nx + dy * ny));

        // Closest point on line segment to circle center
        const closestX = x1 + nx * t;
        const closestY = y1 + ny * t;

        // Distance from circle center to closest point
        const distX = cx - closestX;
        const distY = cy - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Check if distance is within circle radius
        return distance <= radius;
    }
}
