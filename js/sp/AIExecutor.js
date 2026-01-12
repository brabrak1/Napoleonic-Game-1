// AI Executor Module - Executes commands with cooldowns

class AIExecutor {
    constructor(game) {
        this.game = game;

        // Command queue
        this.queue = [];

        // Cooldowns (prevent spam)
        this.unitCooldowns = new Map(); // unitId -> timestamp
        this.globalCooldown = 0;
    }

    reset() {
        this.queue = [];
        this.unitCooldowns.clear();
        this.globalCooldown = 0;
    }

    queueCommand(command) {
        this.queue.push(command);
    }

    executeQueue() {
        const now = performance.now();

        // Process queue
        while (this.queue.length > 0) {
            const cmd = this.queue.shift();

            // Check cooldown
            if (this.unitCooldowns.has(cmd.unitId)) {
                const lastAction = this.unitCooldowns.get(cmd.unitId);
                if (now - lastAction < 500) {
                    continue; // Skip, too soon
                }
            }

            // Execute command
            this.execute(cmd);

            // Set cooldown
            this.unitCooldowns.set(cmd.unitId, now);
        }
    }

    execute(cmd) {
        switch (cmd.type) {
            case 'move':
                this.executeMove(cmd);
                break;
            case 'formation':
                this.executeFormation(cmd);
                break;
            case 'select':
                this.executeSelect(cmd);
                break;
        }
    }

    executeMove(cmd) {
        // Select units
        this.game.clearSelection();
        cmd.units.forEach(u => u.isSelected = true);
        this.game.selectedUnits = cmd.units;

        // Move
        this.game.moveSelectedUnits(cmd.targetX, cmd.targetY);

        // Deselect
        this.game.clearSelection();
    }

    executeFormation(cmd) {
        // Select units
        this.game.clearSelection();
        cmd.units.forEach(u => u.isSelected = true);
        this.game.selectedUnits = cmd.units;

        // Change formation
        this.game.setFormationForSelected(cmd.formation);

        // Deselect
        this.game.clearSelection();
    }

    executeSelect(cmd) {
        this.game.clearSelection();
        cmd.units.forEach(u => u.isSelected = true);
        this.game.selectedUnits = cmd.units;
    }
}
