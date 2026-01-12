# Napoleonic Wargame - 1v1 Real-Time Tactical Battle

A browser-based real-time tactical wargame featuring Napoleonic-era combat with musket volleys, cavalry charges, and formation-based tactics.

## Features

### Core Gameplay
- **Two Unit Types:**
  - **Infantry** (⬛): Solid rectangles with musket volley fire capabilities
  - **Cavalry** (⚔): Rectangles with inscribed X, high-speed melee units with devastating charges

- **Real-Time Combat:**
  - Automatic musket fire targeting nearest enemy with line of sight
  - 15-second reload cycles with visible progress bars
  - Distance-based accuracy (80-90% at short range, 20-40% at long range)
  - Directional damage multipliers (3x rear, 2x flank, 1x front)
  - Melee combat on collision with push-back mechanics

### Advanced Mechanics

#### Formation System
- **Line Formation (L key):**
  - Maximum fire width and LOS coverage
  - +10% accuracy, 10% faster reload
  - 90° frontal fire arc
  - Slightly slower movement

- **Column Formation (C key):**
  - +30% movement speed
  - Narrower fire arc, reduced effectiveness
  - 50% more vulnerable to enemy fire
  - Best for rapid repositioning

- **Square Formation (F key):**
  - Cannot move but provides 360° defense
  - Nullifies ALL flank and rear damage multipliers
  - 3x resistance to cavalry charges
  - Essential for countering cavalry

#### Line of Sight (LOS) System
- **CRITICAL FEATURE:** Infantry cannot fire through friendly units
- Raycasting algorithm checks both terrain AND friendly unit blocking
- Real-time target acquisition of nearest viable enemy
- Visual debug option to see LOS rays (green = clear, red = blocked)

#### Cavalry Charge Mechanics
- Massive damage bonus (3x) when charging at top speed (120+ speed)
- Bonus only applies vs non-square Infantry formations
- Wide turning radius makes cavalry less maneuverable
- Charge bonus nullified by Infantry in Square formation

#### Exhaustion System
- Accumulates from prolonged movement and frequent combat
- Degrades performance:
  - Up to 50% speed reduction
  - Up to 30% accuracy penalty
  - Up to 50% slower reload
- Recovers when stationary
- Column formation reduces movement exhaustion

### UI Features

#### Bottom Panel
- Real-time status for ALL units on the battlefield
- Individual health bars (green → yellow → red)
- Reload progress bars for Infantry (orange = reloading, green = ready)
- Entity counts (e.g., "75/100")
- Formation indicators (LINE, COLUMN, SQUARE)
- Selected units highlighted in yellow
- Exhausted units highlighted in orange

#### Settings Panel
- Adjustable reload duration (5-30 seconds)
- Configurable infantry damage and fire range
- Cavalry charge multiplier settings
- Custom army composition (0-20 units per type, per team)
- Apply & Restart button to implement changes

### Visual & Audio Effects
- **Muzzle Flash:** Yellow particle burst on volley fire
- **Smoke Clouds:** Grey expanding particles after shots
- **Explosions:** Radial particle burst for cavalry charges
- **Screen Shake:** Impact feedback on hits
- **Sound Effects:** Distance-based volume for musket fire, charges, and explosions (using Web Audio API)

## Controls

### Mouse Controls
- **Left Click:** Select individual unit
- **Left Click + Drag:** Draw selection box for multiple units
- **Right Click:** Move selected units to target position
- **Right Drag:** Show movement arrow before committing

### Keyboard Controls
- **L:** Set Line Formation
- **C:** Set Column Formation
- **F:** Set Square Formation
- **N:** Clear Formation
- **R:** Restart Game (when game over)

## How to Play

1. **Open the Game:**
   - Open `index.html` in a modern web browser (Chrome, Firefox, Edge)
   - The game starts immediately with default armies (6 Infantry + 4 Cavalry per team)

2. **Select Units:**
   - Player controls the RED team (left side)
   - Click and drag to select multiple units
   - Click individual units for single selection

3. **Move Units:**
   - Right-click to move selected units
   - A white arrow shows movement path and final facing

4. **Use Formations:**
   - Press **L** for Line Formation before engaging (max firepower)
   - Press **C** for Column when repositioning (fast movement)
   - Press **F** for Square when cavalry threatens (anti-cavalry defense)

5. **Tactical Tips:**
   - **Infantry vs Infantry:** Use Line formation for maximum firepower, flank for damage bonuses
   - **Cavalry vs Infantry:** Charge at full speed, avoid Square formations
   - **Infantry vs Cavalry:** Form Square immediately, focus fire
   - **Positioning:** Avoid firing through your own units (LOS blocking)
   - **Exhaustion Management:** Let units rest between engagements

## Victory Condition

**Annihilation:** Eliminate all enemy units to win.

## Technical Architecture

### File Structure
```
napoleonic-wargame/
├── index.html              # Main game page
├── styles.css              # UI styling
├── README.md               # This file
└── js/
    ├── config.js           # Game constants
    ├── Unit.js             # Unit class (Infantry/Cavalry)
    ├── LOSSystem.js        # Line of Sight raycasting
    ├── CombatSystem.js     # Combat resolution & damage
    ├── ReloadSystem.js     # Reload timers
    ├── ExhaustionSystem.js # Exhaustion mechanics
    ├── FormationSystem.js  # Formation management
    ├── VisualEffects.js    # Particle effects
    ├── AudioManager.js     # Sound effects
    ├── GameEngine.js       # Core game logic
    ├── Renderer.js         # Canvas rendering
    ├── InputHandler.js     # Mouse/keyboard input
    ├── UIManager.js        # UI panel management
    ├── SettingsPanel.js    # Configuration UI
    └── main.js             # Application entry point
```

### Key Systems

#### Entity-Based Health
- Units composed of multiple entities (Infantry: 100, Cavalry: 50)
- Damage reduces entity count
- Health bars show percentage remaining

#### Delta-Time Game Loop
- Frame-rate independent updates
- requestAnimationFrame for smooth rendering
- Capped at 0.1s to prevent large time jumps

#### Collision Detection
- Circle-based collision with radius per unit type
- Push-back force prevents unit overlap
- Triggers melee combat for enemies

#### Formation Positioning
- Algorithmic positioning based on formation type
- Line: Perpendicular to movement (horizontal)
- Column: Parallel to movement (vertical file)
- Square: 4-sided defensive perimeter

## Customization

### Modifying Game Parameters

Edit `js/config.js` to change:
- Canvas size (default: 1200x800)
- Unit stats (speed, damage, range)
- Formation bonuses
- Exhaustion rates
- Accuracy curves
- Visual effect parameters

### Debug Options

In `config.js`, set `DEBUG` flags:
```javascript
DEBUG: {
    SHOW_LOS_RAYS: true,           // Show LOS debug lines
    SHOW_FIRE_ARCS: true,          // Show fire arc visualization
    SHOW_COLLISION_CIRCLES: true,  // Show collision radius
}
```

## Browser Compatibility

- **Recommended:** Chrome 90+, Firefox 88+, Edge 90+
- **Requires:** HTML5 Canvas, Web Audio API, ES6+ JavaScript
- **Note:** Web Audio API may require user interaction to initialize (click to enable sound)

## Known Limitations

- No AI opponent (player vs player locally, controlling RED team)
- No pathfinding around obstacles (units move in straight lines)
- No terrain obstacles in default version (LOS system supports it)
- Sound effects use synthesized beeps (no audio files included)

## Future Enhancements

- AI opponent
- Network multiplayer
- Terrain obstacles (buildings, forests, rivers)
- Artillery units
- Morale/panic system
- Campaign mode
- Save/load battles
- Replay system

## Credits

Built from scratch using:
- HTML5 Canvas for rendering
- Vanilla JavaScript (no frameworks)
- Web Audio API for sound

Developed as a demonstration of real-time tactical game mechanics with emphasis on:
- Line of Sight raycasting
- Formation-based combat
- Entity health systems
- Directional damage calculations

## License

Free to use and modify for educational purposes.

---

**Enjoy the battle!**
