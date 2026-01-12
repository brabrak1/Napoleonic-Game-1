// Formation System - Manages unit formations (Line, Column, Square)

class FormationSystem {
    /**
     * Calculate formation positions for multiple selected units
     * @param {Array<Unit>} selectedUnits - The units to position
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {string} formationType - 'LINE', 'COLUMN', or 'SQUARE'
     * @returns {Array} - Array of {unit, x, y, angle} positioning data
     */
    static calculateFormationPositions(selectedUnits, targetX, targetY, formationType) {
        if (selectedUnits.length === 0) return [];

        const positions = [];
        const spacing = 30; // pixels between units

        // Calculate centroid of selected units
        const centerX = selectedUnits.reduce((sum, u) => sum + u.x, 0) / selectedUnits.length;
        const centerY = selectedUnits.reduce((sum, u) => sum + u.y, 0) / selectedUnits.length;

        // Calculate direction to target
        const angle = Math.atan2(targetY - centerY, targetX - centerX);

        switch (formationType) {
            case 'LINE':
                // Perpendicular to movement direction (horizontal line)
                const lineAngle = angle + Math.PI / 2;
                selectedUnits.forEach((unit, i) => {
                    const offset = (i - (selectedUnits.length - 1) / 2) * spacing;
                    positions.push({
                        unit: unit,
                        x: targetX + Math.cos(lineAngle) * offset,
                        y: targetY + Math.sin(lineAngle) * offset,
                        angle: angle
                    });
                });
                break;

            case 'COLUMN':
                // Parallel to movement direction (vertical column)
                selectedUnits.forEach((unit, i) => {
                    const offset = i * spacing;
                    positions.push({
                        unit: unit,
                        x: targetX - Math.cos(angle) * offset,
                        y: targetY - Math.sin(angle) * offset,
                        angle: angle
                    });
                });
                break;

            case 'SQUARE':
                // 4-sided square formation
                const sideLength = Math.ceil(Math.sqrt(selectedUnits.length));
                selectedUnits.forEach((unit, i) => {
                    const row = Math.floor(i / sideLength);
                    const col = i % sideLength;

                    // Center the square around target
                    const offsetX = (col - sideLength / 2) * spacing;
                    const offsetY = (row - sideLength / 2) * spacing;

                    positions.push({
                        unit: unit,
                        x: targetX + offsetX,
                        y: targetY + offsetY,
                        angle: angle
                    });
                });
                break;

            default:
                // No formation, maintain relative positions
                selectedUnits.forEach((unit) => {
                    const relX = unit.x - centerX;
                    const relY = unit.y - centerY;
                    positions.push({
                        unit: unit,
                        x: targetX + relX,
                        y: targetY + relY,
                        angle: angle
                    });
                });
        }

        return positions;
    }

    /**
     * Apply formation to a single unit or group
     * @param {Unit|Array<Unit>} units - Unit or array of units
     * @param {string} formationType - 'LINE', 'COLUMN', 'SQUARE', or null
     */
    static applyFormation(units, formationType) {
        const unitArray = Array.isArray(units) ? units : [units];

        unitArray.forEach(unit => {
            unit.setFormation(formationType);
        });
    }

    /**
     * Toggle formation for selected units
     * @param {Array<Unit>} selectedUnits - The units to toggle formation
     * @param {string} formationType - 'LINE', 'COLUMN', 'SQUARE'
     */
    static toggleFormation(selectedUnits, formationType) {
        selectedUnits.forEach(unit => {
            // If already in this formation, clear it
            if (unit.formation === formationType) {
                unit.setFormation(null);
            } else {
                unit.setFormation(formationType);
            }
        });
    }

    /**
     * Get formation display name
     * @param {Unit} unit - The unit to check
     * @returns {string} - Formation name or 'None'
     */
    static getFormationName(unit) {
        return unit.formation || 'None';
    }

    /**
     * Check if unit can move in current formation
     * @param {Unit} unit - The unit to check
     * @returns {boolean} - True if unit can move
     */
    static canMove(unit) {
        return unit.formation !== 'SQUARE'; // Square formation cannot move
    }
}
